import express, { Request, Response } from 'express';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { discoverSitePages, gatherPageSignals, captureScreenshot, normalizeUrl } from './server/scanner.js';
import { auditSinglePage, identifySiteWidePatterns } from './server/geminiAuditor.js';
import { assertPublicHost } from './server/security.js';
import { AuditReport, AuditRequestPayload, PageAudit, ProgressUpdate } from './src/types.js';

// Cache for recent audits (1 hour TTL)
interface CachedReport {
  report: AuditReport;
  timestamp: number;
}
const auditCache = new Map<string, CachedReport>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// In-flight audits map for streaming updates
const activeAuditStreams = new Map<string, (update: ProgressUpdate) => void>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Rate limiting: /api/audit triggers real money (Gemini + Microlink calls
  // for up to 8 pages), so it gets a tight per-IP cap. The image proxy is
  // called once per screenshot per report, so it needs more headroom but
  // still shouldn't be unbounded.
  const auditLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many audit requests from this IP. Please wait a few minutes and try again.' },
  });

  const proxyLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many image proxy requests. Please slow down.',
  });

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Image proxy endpoint for secure screenshot rendering / jspdf / html2canvas CORS.
  // Locked to api.microlink.io only - this exists to work around CORS for our
  // own screenshot images, not as a general-purpose proxy. Without this
  // restriction, this endpoint would let anyone fetch arbitrary URLs
  // (including internal/private addresses) through our server.
  app.get('/api/proxy-image', proxyLimiter, async (req: Request, res: Response) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      res.status(400).send('Missing url parameter');
      return;
    }

    let parsedTarget: URL;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      res.status(400).send('Invalid url parameter');
      return;
    }
    if (parsedTarget.protocol !== 'https:' || parsedTarget.hostname !== 'api.microlink.io') {
      res.status(403).send('Forbidden: this proxy only serves api.microlink.io screenshot requests.');
      return;
    }

    try {
      const response = await fetch(targetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 SiteAuditPro/1.0' },
      });
      if (!response.ok) {
        res.status(response.status).send('Failed to fetch image');
        return;
      }
      const contentType = response.headers.get('content-type') || 'image/png';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      res.status(500).send(`Proxy error: ${err?.message || 'Unknown'}`);
    }
  });

  // Get cached or existing audit report
  app.get('/api/audit/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const cached = auditCache.get(id);
    if (cached) {
      res.json({ report: cached.report, cached: true });
      return;
    }
    res.status(404).json({ error: 'Audit report not found or expired' });
  });

  // Server-Sent Events (SSE) stream for live progress tracking
  app.get('/api/audit/stream/:id', (req: Request, res: Response) => {
    const { id } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const listener = (update: ProgressUpdate) => {
      res.write(`data: ${JSON.stringify(update)}\n\n`);
      if (update.stage === 'completed' || update.stage === 'error') {
        setTimeout(() => {
          try {
            res.end();
          } catch {
            // ignore
          }
        }, 1000);
      }
    };

    activeAuditStreams.set(id, listener);

    req.on('close', () => {
      activeAuditStreams.delete(id);
    });
  });

  // Initiate Audit API
  app.post('/api/audit', auditLimiter, async (req: Request, res: Response) => {
    const body: AuditRequestPayload = req.body;
    if (!body || !body.url) {
      res.status(400).json({ error: 'A valid website URL is required.' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = normalizeUrl(body.url);
    } catch {
      res.status(400).json({ error: 'Invalid URL format. Please provide a full valid URL (e.g. example.com).' });
      return;
    }

    // Reject internal/private targets up front, before starting the pipeline.
    try {
      await assertPublicHost(parsedUrl.toString());
    } catch {
      res.status(400).json({ error: 'This URL cannot be audited. Please provide a public website address.' });
      return;
    }

    const maxPages = Math.min(Math.max(1, body.maxPages || 5), 8);
    const specificPages = (body.specificPages || []).map(p => p.trim()).filter(Boolean);

    // Cache key based on domain + path + page config
    const cacheKey = `${parsedUrl.origin}-${maxPages}-${specificPages.sort().join(',')}`;
    const cachedEntry = auditCache.get(cacheKey);

    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      res.json({
        id: cacheKey,
        status: 'completed',
        cached: true,
        report: cachedEntry.report,
      });
      return;
    }

    const auditId = cacheKey;

    // Send immediate response with audit ID for SSE connection
    res.json({
      id: auditId,
      status: 'started',
      domain: parsedUrl.hostname,
    });

    // Run audit workflow asynchronously
    runFullAudit(auditId, parsedUrl, maxPages, specificPages).catch(err => {
      console.error('Audit execution error:', err);
      const listener = activeAuditStreams.get(auditId);
      if (listener) {
        listener({
          stage: 'error',
          message: `Audit failed: ${err?.message || 'Unexpected server error'}`,
          progressPercent: 100,
          error: err?.message || 'Audit encountered a critical error.',
        });
      }
    });
  });

  // Vite middleware in dev / static in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SiteAudit Pro server running on http://0.0.0.0:${PORT}`);
  });
}

/**
 * Orchestrates the full multi-page audit pipeline
 */
async function runFullAudit(
  auditId: string,
  rootUrl: URL,
  maxPages: number,
  specificPages: string[]
) {
  const startTime = Date.now();
  const sendProgress = (update: ProgressUpdate) => {
    const listener = activeAuditStreams.get(auditId);
    if (listener) {
      listener(update);
    }
  };

  // STEP 1: Page Discovery
  sendProgress({
    stage: 'discovering',
    message: `Discovering pages on ${rootUrl.hostname} via sitemap and internal navigation...`,
    progressPercent: 10,
  });

  const discovered = await discoverSitePages(rootUrl.toString(), maxPages, specificPages);
  const discoveredUrls = discovered.map(d => d.url);

  sendProgress({
    stage: 'discovering',
    message: `Found ${discovered.length} key pages to audit across ${rootUrl.hostname}.`,
    progressPercent: 20,
    totalPages: discovered.length,
    pagesDiscovered: discoveredUrls,
  });

  const pageAudits: PageAudit[] = [];
  const total = discovered.length;

  // STEP 2 & 3: For each page, capture screenshot, read signals, and run AI audit
  for (let i = 0; i < total; i++) {
    const page = discovered[i];
    const pageNum = i + 1;
    const baseProgress = 20 + Math.round((i / total) * 55);

    // Screenshot & Signals
    sendProgress({
      stage: 'screenshots',
      message: `[${pageNum}/${total}] Capturing screenshot and technical signals for ${page.path}...`,
      progressPercent: baseProgress + 4,
      currentPage: page.path,
      totalPages: total,
    });

    const [screenshotData, signalsData] = await Promise.all([
      captureScreenshot(page.url),
      gatherPageSignals(page.url),
    ]);

    // AI Visual & Content Audit
    sendProgress({
      stage: 'auditing_pages',
      message: `[${pageNum}/${total}] Running AI visual, content, and accessibility audit for ${page.path}...`,
      progressPercent: baseProgress + 10,
      currentPage: page.path,
      totalPages: total,
    });

    const pageAudit = await auditSinglePage(
      page.url,
      page.path,
      signalsData.signals,
      screenshotData.screenshotUrl,
      screenshotData.base64Image
    );

    pageAudits.push(pageAudit);
  }

  // STEP 4: Site-Wide Patterns Pass
  sendProgress({
    stage: 'site_wide_patterns',
    message: 'Analyzing cross-page findings to identify recurring site-wide patterns...',
    progressPercent: 85,
  });

  const sitePatternsResult = await identifySiteWidePatterns(rootUrl.hostname, pageAudits);

  // STEP 5: Compiling Complete Report
  sendProgress({
    stage: 'compiling',
    message: 'Synthesizing scores, formatting executive summary, and compiling report...',
    progressPercent: 95,
  });

  // Calculate category averages
  const validAudits = pageAudits.filter(p => !p.error || p.categories);
  const count = validAudits.length || 1;

  const categoryAverages = {
    ui_ux: Math.round(validAudits.reduce((s, p) => s + (p.categories?.ui_ux?.score || 0), 0) / count),
    content: Math.round(validAudits.reduce((s, p) => s + (p.categories?.content?.score || 0), 0) / count),
    accessibility: Math.round(validAudits.reduce((s, p) => s + (p.categories?.accessibility?.score || 0), 0) / count),
    performance: Math.round(validAudits.reduce((s, p) => s + (p.categories?.performance?.score || 0), 0) / count),
  };

  const finalReport: AuditReport = {
    id: auditId,
    root_url: rootUrl.toString(),
    domain: rootUrl.hostname,
    created_at: new Date().toISOString(),
    site_score: sitePatternsResult.site_score,
    category_averages: categoryAverages,
    summary: sitePatternsResult.summary,
    total_pages_analyzed: pageAudits.length,
    site_wide_patterns: sitePatternsResult.patterns,
    pages: pageAudits,
    execution_time_seconds: Math.round((Date.now() - startTime) / 1000),
  };

  // Store in cache
  auditCache.set(auditId, {
    report: finalReport,
    timestamp: Date.now(),
  });

  sendProgress({
    stage: 'completed',
    message: 'Website audit complete!',
    progressPercent: 100,
    partialReport: finalReport,
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
