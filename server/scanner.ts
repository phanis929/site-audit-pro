import { PageSignals } from '../src/types.js';

export interface DiscoveredPage {
  url: string;
  path: string;
  isPrioritized?: boolean;
}

const COMMON_PRIORITY_PATHS = [
  '/',
  '/about',
  '/about-us',
  '/pricing',
  '/plans',
  '/features',
  '/contact',
  '/contact-us',
  '/products',
  '/services',
  '/blog',
  '/faq',
  '/docs',
  '/solutions'
];

/**
 * Normalizes URL and ensures protocol
 */
export function normalizeUrl(inputUrl: string): URL {
  let trimmed = inputUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  const parsed = new URL(trimmed);
  // Remove trailing slashes (except root) and hashes/search params for standard page matching
  return parsed;
}

/**
 * Checks robots.txt for courtesy crawling
 */
export async function checkRobotsTxt(rootUrl: URL): Promise<{ allowed: boolean; disallowedPaths: string[] }> {
  try {
    const robotsUrl = new URL('/robots.txt', rootUrl.origin).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SiteAuditPro-Scanner/1.0 (+https://siteaudit.pro)' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { allowed: true, disallowedPaths: [] };
    }

    const text = await res.text();
    const disallowedPaths: string[] = [];
    const lines = text.split('\n');
    let isTargetAgent = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.toLowerCase().startsWith('user-agent:')) {
        const agent = line.slice(11).trim();
        isTargetAgent = agent === '*' || agent.toLowerCase().includes('siteaudit');
      } else if (isTargetAgent && line.toLowerCase().startsWith('disallow:')) {
        const path = line.slice(9).trim();
        if (path) disallowedPaths.push(path);
      }
    }

    // If root disallow "/"
    const rootDisallowed = disallowedPaths.some(p => p === '/' || p === '/*');
    return {
      allowed: !rootDisallowed,
      disallowedPaths,
    };
  } catch {
    return { allowed: true, disallowedPaths: [] };
  }
}

/**
 * Attempts to extract URLs from sitemap.xml
 */
export async function extractFromSitemap(rootUrl: URL): Promise<string[]> {
  const sitemapCandidates = [
    new URL('/sitemap.xml', rootUrl.origin).toString(),
    new URL('/sitemap_index.xml', rootUrl.origin).toString(),
  ];

  for (const sitemapUrl of sitemapCandidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(sitemapUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SiteAuditPro-Scanner/1.0 (+https://siteaudit.pro)' },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const xmlText = await res.text();
      const locMatches = xmlText.match(/<loc>(.*?)<\/loc>/gi);
      if (locMatches && locMatches.length > 0) {
        const urls: string[] = [];
        for (const locTag of locMatches) {
          const rawUrl = locTag.replace(/<\/?loc>/gi, '').trim();
          try {
            const parsed = new URL(rawUrl);
            if (parsed.hostname === rootUrl.hostname) {
              urls.push(parsed.origin + parsed.pathname);
            }
          } catch {
            // ignore malformed
          }
        }
        if (urls.length > 0) return urls;
      }
    } catch {
      // ignore and try next
    }
  }
  return [];
}

/**
 * Extracts internal links from HTML source
 */
export function extractInternalLinksFromHtml(html: string, baseUrl: URL): string[] {
  const foundUrls = new Set<string>();
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["']/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) {
      continue;
    }

    try {
      const resolved = new URL(rawHref, baseUrl);
      // Verify same origin / hostname
      if (resolved.hostname === baseUrl.hostname) {
        // Exclude common non-HTML files
        if (!/\.(pdf|zip|tar|gz|exe|dmg|iso|mp3|mp4|wav|avi|jpg|jpeg|png|gif|svg|webp|css|js|json|xml)$/i.test(resolved.pathname)) {
          const cleanPath = resolved.pathname.replace(/\/+$/, '') || '/';
          foundUrls.add(baseUrl.origin + cleanPath);
        }
      }
    } catch {
      // ignore
    }
  }

  return Array.from(foundUrls);
}

/**
 * Discovers and prioritizes key pages of the site
 */
export async function discoverSitePages(
  inputUrl: string,
  maxPages: number = 5,
  specificPages: string[] = []
): Promise<DiscoveredPage[]> {
  const rootUrl = normalizeUrl(inputUrl);
  const normalizedRoot = rootUrl.origin + (rootUrl.pathname.replace(/\/+$/, '') || '/');

  const discoveredSet = new Set<string>();
  // Always include the homepage/root
  discoveredSet.add(normalizedRoot);

  // 1. Add specific user-provided pages first
  if (specificPages && specificPages.length > 0) {
    for (const spec of specificPages) {
      if (!spec.trim()) continue;
      try {
        let fullUrl: string;
        if (spec.startsWith('http://') || spec.startsWith('https://')) {
          fullUrl = spec.trim();
        } else {
          const cleanPath = spec.startsWith('/') ? spec : `/${spec}`;
          fullUrl = new URL(cleanPath, rootUrl.origin).toString();
        }
        const parsed = new URL(fullUrl);
        if (parsed.hostname === rootUrl.hostname) {
          discoveredSet.add(parsed.origin + (parsed.pathname.replace(/\/+$/, '') || '/'));
        }
      } catch {
        // ignore
      }
    }
  }

  // 2. Check robots.txt (courtesy check)
  const { disallowedPaths } = await checkRobotsTxt(rootUrl);

  // 3. Try Sitemap extraction
  let candidateUrls: string[] = [];
  try {
    candidateUrls = await extractFromSitemap(rootUrl);
  } catch {
    candidateUrls = [];
  }

  // 4. If few URLs found via sitemap, fetch homepage and scrape links
  if (candidateUrls.length < maxPages) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(rootUrl.toString(), {
        signal: controller.signal,
        headers: { 'User-Agent': 'SiteAuditPro-Scanner/1.0 (+https://siteaudit.pro)' },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        const scraped = extractInternalLinksFromHtml(html, rootUrl);
        candidateUrls = [...candidateUrls, ...scraped];
      }
    } catch {
      // continue with whatever we have
    }
  }

  // Filter out disallowed paths
  for (const urlStr of candidateUrls) {
    try {
      const parsed = new URL(urlStr);
      const isDisallowed = disallowedPaths.some(p => parsed.pathname.startsWith(p));
      if (!isDisallowed) {
        discoveredSet.add(parsed.origin + (parsed.pathname.replace(/\/+$/, '') || '/'));
      }
    } catch {
      // ignore
    }
  }

  const allDiscovered = Array.from(discoveredSet);

  // Score & prioritize URLs:
  // Root = 100, common priority paths = 80-90, shorter paths = higher score
  const prioritized = allDiscovered.map(urlStr => {
    const parsed = new URL(urlStr);
    const path = parsed.pathname;
    let score = 10;

    if (path === '/' || urlStr === normalizedRoot) {
      score = 100;
    } else {
      const lowerPath = path.toLowerCase();
      for (const prio of COMMON_PRIORITY_PATHS) {
        if (lowerPath === prio || lowerPath.startsWith(prio + '/')) {
          score = 80;
          break;
        }
      }
      // Shorter path depth preferred over deep nested paths
      const depth = path.split('/').filter(Boolean).length;
      score -= depth * 5;
    }

    return {
      url: urlStr,
      path: path || '/',
      score,
      isPrioritized: score >= 80,
    };
  });

  // Sort descending by score
  prioritized.sort((a, b) => b.score - a.score);

  // Take top maxPages (capped at 8)
  const effectiveMax = Math.min(Math.max(1, maxPages), 8);
  const selected = prioritized.slice(0, effectiveMax);

  return selected.map(item => ({
    url: item.url,
    path: item.path,
    isPrioritized: item.isPrioritized,
  }));
}

/**
 * Extracts technical signals and accessibility/performance cues from page HTML
 */
export async function gatherPageSignals(pageUrl: string): Promise<{ signals: PageSignals; htmlContent: string; statusCode: number }> {
  const startTime = Date.now();
  let statusCode = 200;
  let html = '';
  let pageSizeKb = 0;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(pageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SiteAuditPro/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timeout);

    statusCode = res.status;
    html = await res.text();
    pageSizeKb = Math.round((new Blob([html]).size / 1024) * 10) / 10;
  } catch (err: any) {
    statusCode = 500;
    html = `<html><head><title>Error Loading Page</title></head><body><p>Failed to fetch: ${err?.message || 'Network error'}</p></body></html>`;
  }

  const responseTimeMs = Date.now() - startTime;

  // Extract <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'No Title Found';

  // Extract meta description
  const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) ||
                        html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

  // Viewport tag
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);

  // Canonical tag
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
  const canonicalUrl = canonicalMatch ? canonicalMatch[1] : undefined;

  // Language attribute
  const langMatch = html.match(/<html[^>]+lang=["']([^"']*)["']/i);
  const lang = langMatch ? langMatch[1] : undefined;

  // Headings
  const h1Matches = Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi));
  const h1Count = h1Matches.length;
  const h1Samples = h1Matches.slice(0, 3).map(m => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);

  const h2Matches = Array.from(html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi));
  const h2Count = h2Matches.length;

  const h3Matches = Array.from(html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi));
  const h3Count = h3Matches.length;

  // Heading hierarchy logic: valid if at least one H1, and not skipping H1->H3 without H2 if H3 exists
  const headingHierarchyValid = h1Count === 1 && (h3Count === 0 || h2Count > 0);

  // Images & Alt text coverage
  const imgMatches = Array.from(html.matchAll(/<img\s+([^>]*?)>/gi));
  const totalImages = imgMatches.length;
  let imagesWithAlt = 0;

  for (const match of imgMatches) {
    const imgTag = match[1];
    const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
    if (altMatch && altMatch[1].trim().length > 0) {
      imagesWithAlt++;
    }
  }

  const altCoveragePercentage = totalImages > 0 ? Math.round((imagesWithAlt / totalImages) * 100) : 100;

  // Favicon check
  const hasFavicon = /<link[^>]+rel=["'](?:shortcut )?icon["']/i.test(html);

  const signals: PageSignals = {
    url: pageUrl,
    title,
    meta_description: metaDescription,
    has_viewport: hasViewport,
    h1_count: h1Count,
    h1_samples: h1Samples,
    h2_count: h2Count,
    h3_count: h3Count,
    heading_hierarchy_valid: headingHierarchyValid,
    total_images: totalImages,
    images_with_alt: imagesWithAlt,
    alt_coverage_percentage: altCoveragePercentage,
    response_time_ms: responseTimeMs,
    page_size_kb: pageSizeKb,
    status_code: statusCode,
    is_https: pageUrl.startsWith('https://'),
    canonical_url: canonicalUrl,
    has_favicon: hasFavicon,
    lang,
  };

  return { signals, htmlContent: html, statusCode };
}

/**
 * Gets a screenshot URL & attempts to fetch image buffer for Gemini vision analysis
 */
export async function captureScreenshot(pageUrl: string): Promise<{ screenshotUrl: string; base64Image?: string }> {
  // Microlink screenshot URL
  const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(pageUrl)}&screenshot=true&meta=false&embed=screenshot.url`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(microlinkUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SiteAuditPro/1.0' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return {
        screenshotUrl: microlinkUrl,
        base64Image: base64,
      };
    }
  } catch {
    // Fallback: Return the microlink url directly for frontend viewing
  }

  return {
    screenshotUrl: microlinkUrl,
  };
}
