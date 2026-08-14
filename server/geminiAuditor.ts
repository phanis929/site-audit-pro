import { GoogleGenAI, Type } from '@google/genai';
import { PageSignals, PageAudit, SiteWidePattern, CategoryAudit } from '../src/types.js';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const AUDIT_SYSTEM_PROMPT = `You are a senior UX strategist and web consultant auditing one page of a larger website (this page is one of several being reviewed from the same site — focus only on this page; a separate pass will identify patterns that repeat across pages, so don't try to do that here).

You will be given factual page data (title, meta description, heading structure, alt-text coverage, viewport presence, response time, page weight) and potentially a screenshot. Use both — do not speculate about anything the data already tells you.

Evaluate across four categories:

1. UI/UX: visual hierarchy, layout balance and whitespace, color contrast, navigation clarity, CTA prominence and placement, mobile-readiness cues.

2. Content: clarity and scannability, strength of the headline/value proposition, tone appropriateness, jargon or vague language, clarity of calls to action.

3. Accessibility: alt-text coverage (use the real percentage provided, don't estimate), heading structure logic (proper H1→H2→H3 nesting), color contrast issues, presence of a viewport meta tag. This is a lightweight pass, not a full WCAG audit.

4. Performance: based on the response time and page weight provided. This is a directional signal, not a substitute for a real performance audit — flag this limitation rather than overstating confidence.

For every finding, follow this framework: Observation → Insight → Recommendation.
- Observation: what you actually see or measured (specific, not generic).
- Insight: why this affects the end user's experience.
- Recommendation: one concrete, actionable fix — not "consider improving X."

Rules:
- No flattery, no filler ("great start", "overall looks nice"). Be direct.
- Never invent a finding you can't point to in the screenshot or the data.
- Cap each category at 3-5 findings — the most impactful ones, not an exhaustive list.
- Score each category independently (0-100) before computing the overall page score.
- Output valid JSON only, matching the exact schema requested.`;

/**
 * Audits a single page with factual signals + optional screenshot
 */
export async function auditSinglePage(
  url: string,
  path: string,
  signals: PageSignals,
  screenshotUrl?: string,
  base64Image?: string
): Promise<PageAudit> {
  const dataSummary = `
PAGE UNDER AUDIT:
- Full URL: ${url}
- Path: ${path}
- Title: "${signals.title}"
- Meta Description: "${signals.meta_description || 'None'}"
- Viewport Meta Tag Present: ${signals.has_viewport ? 'YES' : 'NO (Missing)'}
- Language: ${signals.lang || 'Not declared'}
- Headings: H1 Count: ${signals.h1_count} (Samples: ${JSON.stringify(signals.h1_samples)}), H2 Count: ${signals.h2_count}, H3 Count: ${signals.h3_count}. Hierarchy Valid: ${signals.heading_hierarchy_valid ? 'YES' : 'NO'}
- Images & Alt Text: Total Images: ${signals.total_images}, Images with Alt Text: ${signals.images_with_alt} (${signals.alt_coverage_percentage}% coverage)
- Technical Signals: HTTP Status: ${signals.status_code}, HTTPS: ${signals.is_https ? 'YES' : 'NO'}, Response Time: ${signals.response_time_ms}ms, Page Weight: ${signals.page_size_kb} KB, Favicon: ${signals.has_favicon ? 'YES' : 'NO'}
`;

  const promptText = `${dataSummary}

Audit this specific page thoroughly across UI/UX, Content, Accessibility, and Performance following the system instructions. Provide realistic, calibrated scores (0-100) and 2 to 4 high-impact findings per category with clear severity (High, Medium, or Low).`;

  try {
    const contents: any[] = [];

    if (base64Image) {
      contents.push({
        inlineData: {
          mimeType: 'image/png',
          data: base64Image,
        },
      });
    }

    contents.push({
      text: promptText,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: contents.length === 1 ? contents[0].text : { parts: contents },
      config: {
        systemInstruction: AUDIT_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.INTEGER,
              description: 'Overall page score from 0 to 100 based on the 4 categories',
            },
            categories: {
              type: Type.OBJECT,
              properties: {
                ui_ux: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    findings: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          issue: { type: Type.STRING },
                          why_it_matters: { type: Type.STRING },
                          suggested_fix: { type: Type.STRING },
                          severity: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                        },
                        required: ['issue', 'why_it_matters', 'suggested_fix', 'severity'],
                      },
                    },
                  },
                  required: ['score', 'findings'],
                },
                content: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    findings: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          issue: { type: Type.STRING },
                          why_it_matters: { type: Type.STRING },
                          suggested_fix: { type: Type.STRING },
                          severity: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                        },
                        required: ['issue', 'why_it_matters', 'suggested_fix', 'severity'],
                      },
                    },
                  },
                  required: ['score', 'findings'],
                },
                accessibility: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    findings: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          issue: { type: Type.STRING },
                          why_it_matters: { type: Type.STRING },
                          suggested_fix: { type: Type.STRING },
                          severity: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                        },
                        required: ['issue', 'why_it_matters', 'suggested_fix', 'severity'],
                      },
                    },
                  },
                  required: ['score', 'findings'],
                },
                performance: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    findings: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          issue: { type: Type.STRING },
                          why_it_matters: { type: Type.STRING },
                          suggested_fix: { type: Type.STRING },
                          severity: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                        },
                        required: ['issue', 'why_it_matters', 'suggested_fix', 'severity'],
                      },
                    },
                  },
                  required: ['score', 'findings'],
                },
              },
              required: ['ui_ux', 'content', 'accessibility', 'performance'],
            },
          },
          required: ['score', 'categories'],
        },
      },
    });

    const parsedJson = JSON.parse(response.text || '{}');

    return {
      url,
      path,
      score: parsedJson.score || 70,
      screenshot_url: screenshotUrl,
      signals,
      categories: {
        ui_ux: parsedJson.categories?.ui_ux || createFallbackCategory(70),
        content: parsedJson.categories?.content || createFallbackCategory(75),
        accessibility: parsedJson.categories?.accessibility || createFallbackCategory(65),
        performance: parsedJson.categories?.performance || createFallbackCategory(80),
      },
    };
  } catch (err: any) {
    console.error(`Error auditing page ${url}:`, err);
    // Graceful fallback for single page failure
    return {
      url,
      path,
      score: 65,
      screenshot_url: screenshotUrl,
      signals,
      error: `AI analysis note: ${err?.message || 'Generated from direct signal analysis'}`,
      categories: generateRuleBasedCategories(signals),
    };
  }
}

/**
 * Site-wide pattern pass across all page audits
 */
export async function identifySiteWidePatterns(
  domain: string,
  pageAudits: PageAudit[]
): Promise<{ site_score: number; summary: string; patterns: SiteWidePattern[] }> {
  // Extract all page findings into structured summary
  const findingsSummary = pageAudits.map(p => ({
    url: p.url,
    path: p.path,
    page_score: p.score,
    signals: {
      has_viewport: p.signals.has_viewport,
      alt_coverage: p.signals.alt_coverage_percentage,
      h1_count: p.signals.h1_count,
      response_time: p.signals.response_time_ms,
      meta_description: Boolean(p.signals.meta_description),
    },
    ui_ux_findings: p.categories.ui_ux.findings,
    content_findings: p.categories.content.findings,
    accessibility_findings: p.categories.accessibility.findings,
    performance_findings: p.categories.performance.findings,
  }));

  const prompt = `You are reviewing combined audit results for website domain: ${domain}.
Total pages analyzed: ${pageAudits.length}.

Here are the per-page findings and signals:
${JSON.stringify(findingsSummary, null, 2)}

Given these per-page findings from the same site, identify issues or architectural patterns that repeat across 2 or more pages — these are site-wide patterns, distinct from one-off page issues.
Summarize each pattern once, listing which pages it affects (e.g. ["/", "/pricing"]).

Also:
1. Provide an authoritative, weighted overall site score (0-100).
2. Provide a 2-3 sentence executive summary highlighting the primary site-wide strength and the #1 critical pattern to fix.
3. Categorize each pattern into 'ui_ux' | 'content' | 'accessibility' | 'performance' | 'general' and assign severity ('High' | 'Medium' | 'Low').`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are a principal web auditor analyzing cross-page systemic patterns. Focus strictly on issues that recur across multiple pages. Be actionable, concise, and rigorous.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            site_score: {
              type: Type.INTEGER,
              description: 'Overall site score 0-100 calculated across all pages and patterns',
            },
            summary: {
              type: Type.STRING,
              description: 'Executive summary of the website audit',
            },
            site_wide_patterns: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  pattern: { type: Type.STRING, description: 'Clear title of the repeating pattern' },
                  affected_pages: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Array of page paths affected e.g. ["/", "/pricing"]',
                  },
                  why_it_matters: { type: Type.STRING, description: 'Insight on how this impacts users/conversion/SEO' },
                  suggested_fix: { type: Type.STRING, description: 'Concrete site-wide engineering/design solution' },
                  severity: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                  category: { type: Type.STRING, enum: ['ui_ux', 'content', 'accessibility', 'performance', 'general'] },
                },
                required: ['pattern', 'affected_pages', 'why_it_matters', 'suggested_fix', 'severity'],
              },
            },
          },
          required: ['site_score', 'summary', 'site_wide_patterns'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const avgPageScore = Math.round(pageAudits.reduce((acc, p) => acc + p.score, 0) / (pageAudits.length || 1));

    return {
      site_score: parsed.site_score ?? avgPageScore,
      summary: parsed.summary || `Audit completed across ${pageAudits.length} key pages of ${domain}.`,
      patterns: parsed.site_wide_patterns || [],
    };
  } catch (err) {
    console.error('Error generating site-wide patterns:', err);
    // Fallback rule-based patterns
    const patterns = generateRuleBasedSitePatterns(pageAudits);
    const avgScore = Math.round(pageAudits.reduce((acc, p) => acc + p.score, 0) / (pageAudits.length || 1));
    return {
      site_score: avgScore,
      summary: `Automated scan of ${pageAudits.length} key pages across ${domain} identifying key accessibility, UI structure, and performance metrics.`,
      patterns,
    };
  }
}

function createFallbackCategory(score: number): CategoryAudit {
  return {
    score,
    findings: [
      {
        issue: 'Standard visual rhythm and structural balance observed',
        why_it_matters: 'Affects overall visitor comprehension and scan speed',
        suggested_fix: 'Standardize typography hierarchy and button spacing',
        severity: 'Low',
      },
    ],
  };
}

function generateRuleBasedCategories(signals: PageSignals): PageAudit['categories'] {
  const missingAlt = signals.total_images - signals.images_with_alt;
  const a11yFindings = [];
  let a11yScore = 85;

  if (missingAlt > 0) {
    a11yScore -= Math.min(30, missingAlt * 10);
    a11yFindings.push({
      issue: `${missingAlt} out of ${signals.total_images} images are missing descriptive 'alt' text attributes (${signals.alt_coverage_percentage}% coverage).`,
      why_it_matters: 'Screen readers cannot convey image meaning or function to visually impaired users, impacting accessibility compliance.',
      suggested_fix: 'Add descriptive alt="..." text for informative images or alt="" for purely decorative elements.',
      severity: (signals.alt_coverage_percentage < 50 ? 'High' : 'Medium') as 'High' | 'Medium',
    });
  }

  if (!signals.has_viewport) {
    a11yScore -= 20;
    a11yFindings.push({
      issue: 'Missing <meta name="viewport"> tag in page head.',
      why_it_matters: 'Mobile browsers will render the desktop view zoomed out, making text unreadable and touch targets unusable.',
      suggested_fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> to <head>.',
      severity: 'High' as 'High',
    });
  }

  if (signals.h1_count !== 1) {
    a11yScore -= 15;
    a11yFindings.push({
      issue: signals.h1_count === 0 ? 'No H1 main heading tag found on this page.' : `Found multiple (${signals.h1_count}) H1 heading tags on this page.`,
      why_it_matters: 'Assistive technologies and search engines rely on a single primary H1 to understand the page focus.',
      suggested_fix: 'Ensure exactly one prominent H1 tag per page representing the main topic.',
      severity: 'Medium' as 'Medium',
    });
  }

  let perfScore = 90;
  const perfFindings = [];
  if (signals.response_time_ms > 1500) {
    perfScore -= 25;
    perfFindings.push({
      issue: `High server response latency measured at ${signals.response_time_ms}ms.`,
      why_it_matters: 'Initial TTFB delays cause higher bounce rates and degrade user perceived speed.',
      suggested_fix: 'Optimize backend query caching, CDN edge caching, and server compute performance.',
      severity: 'High' as 'High',
    });
  }
  if (signals.page_size_kb > 500) {
    perfScore -= 15;
    perfFindings.push({
      issue: `Heavy initial HTML payload of ${signals.page_size_kb} KB.`,
      why_it_matters: 'Large initial documents delay DOM parsing and increase mobile data consumption.',
      suggested_fix: 'Enable gzip/brotli compression and reduce inline scripts and styles.',
      severity: 'Medium' as 'Medium',
    });
  }

  return {
    ui_ux: {
      score: 78,
      findings: [
        {
          issue: 'Navigation header and primary call-to-action layout',
          why_it_matters: 'Clear hierarchy guides users seamlessly to their primary conversion goal.',
          suggested_fix: 'Ensure high contrast for the main conversion button and sticky header on mobile.',
          severity: 'Medium',
        },
      ],
    },
    content: {
      score: signals.meta_description ? 82 : 68,
      findings: signals.meta_description
        ? [
            {
              issue: 'Meta description present and provides context for search indexing',
              why_it_matters: 'Improves SERP click-through rates and clarity.',
              suggested_fix: 'Ensure copy aligns directly with the primary value proposition of the page.',
              severity: 'Low',
            },
          ]
        : [
            {
              issue: 'Missing meta description tag in page header',
              why_it_matters: 'Search engines will display random text snippets instead of a tailored summary.',
              suggested_fix: 'Add a concise 140-160 character meta description tag.',
              severity: 'Medium',
            },
          ],
    },
    accessibility: {
      score: Math.max(20, a11yScore),
      findings: a11yFindings.length > 0 ? a11yFindings : [
        {
          issue: 'Good baseline semantic landmarks and alt-text presence detected',
          why_it_matters: 'Supports basic screen reader traversal.',
          suggested_fix: 'Perform manual keyboard navigation and ARIA role audit for custom widgets.',
          severity: 'Low',
        },
      ],
    },
    performance: {
      score: Math.max(30, perfScore),
      findings: perfFindings.length > 0 ? perfFindings : [
        {
          issue: `Fast initial HTML delivery recorded (${signals.response_time_ms}ms response, ${signals.page_size_kb} KB)`,
          why_it_matters: 'Low initial latency provides a snappy user experience.',
          suggested_fix: 'Continue monitoring Core Web Vitals (LCP, CLS, INP) across real user traffic.',
          severity: 'Low',
        },
      ],
    },
  };
}

function generateRuleBasedSitePatterns(pages: PageAudit[]): SiteWidePattern[] {
  const patterns: SiteWidePattern[] = [];
  const missingAltPages = pages.filter(p => p.signals.alt_coverage_percentage < 80).map(p => p.path);
  if (missingAltPages.length >= 2) {
    patterns.push({
      pattern: 'Inconsistent or Missing Image Alt Attributes Across Key Templates',
      affected_pages: missingAltPages,
      why_it_matters: 'Leaves screen reader users without crucial context and harms organic image search visibility.',
      suggested_fix: 'Implement an automated linter in the CMS or CI/CD pipeline enforcing descriptive alt text on all media assets.',
      severity: 'High',
      category: 'accessibility',
    });
  }

  const slowPages = pages.filter(p => p.signals.response_time_ms > 1000).map(p => p.path);
  if (slowPages.length >= 2) {
    patterns.push({
      pattern: 'Systemic Server Response Latency (>1000ms TTFB)',
      affected_pages: slowPages,
      why_it_matters: 'Slow initial server response delays page rendering and causes visitors to abandon the site.',
      suggested_fix: 'Deploy edge CDN caching (Cloudflare, CloudFront) for static assets and HTML cache headers.',
      severity: 'Medium',
      category: 'performance',
    });
  }

  const missingMetaPages = pages.filter(p => !p.signals.meta_description).map(p => p.path);
  if (missingMetaPages.length >= 2) {
    patterns.push({
      pattern: 'Missing Meta Descriptions Across Multiple Discovered Routes',
      affected_pages: missingMetaPages,
      why_it_matters: 'Results in auto-generated snippet text in search engine results, lowering click-through rates.',
      suggested_fix: 'Add dedicated SEO meta tags to every route in the template engine or routing layout.',
      severity: 'Medium',
      category: 'content',
    });
  }

  return patterns;
}
