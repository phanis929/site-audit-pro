# SiteAudit Pro

AI-powered website audit tool. User submits a root URL, the app discovers a
handful of that site's key pages, screenshots + analyzes each with Gemini
vision, and produces a report (on-screen + PDF export) covering UI/UX,
content, accessibility, and performance — plus a "site-wide patterns" pass
that flags issues repeating across multiple pages.

Originally scaffolded in Google AI Studio Build Mode; now developed further
here. AI Studio-specific conventions (below) still apply since it's deployed
via AI Studio's Cloud Run pipeline.

## Commands

- `npm run dev` — start dev server (Vite middleware mode + Express, hot reload)
- `npm run build` — build frontend (Vite) and bundle server (esbuild) to `dist/`
- `npm start` — run the production build (`dist/server.cjs`)
- `npm run lint` — typecheck only (`tsc --noEmit`) — **there is no test suite**, this is the only automated check that exists right now
- `npm run clean` — remove build artifacts

## Architecture

- `server.ts` — Express entry point. Routes: `POST /api/audit` (kicks off a run), `GET /api/audit/stream/:id` (SSE progress), `GET /api/audit/:id` (poll/cache fallback), `GET /api/proxy-image` (CORS workaround for Microlink screenshots, locked to that domain only), `GET /api/health`.
- `server/scanner.ts` — page discovery (sitemap → homepage link scrape, robots.txt-aware), technical signal extraction (headings, alt-text coverage, viewport tag, response time), and screenshot capture via Microlink.
- `server/security.ts` — SSRF protections. `assertPublicHost()` blocks private/loopback/link-local IP ranges; `safeFetch()` wraps `fetch` with host validation on every redirect hop. **Every server-side fetch of a user-supplied or user-influenced URL must go through `safeFetch`, never raw `fetch`.**
- `server/geminiAuditor.ts` — the two AI calls: `auditSinglePage()` (per-page, screenshot + signals → structured findings) and `identifySiteWidePatterns()` (cross-page pattern detection). Both use `responseSchema` for structured JSON output. Falls back to rule-based scoring (`generateRuleBasedCategories`) if the Gemini call fails — don't remove this fallback, it's what keeps a single bad page from failing the whole report.
- `src/` — React frontend. `App.tsx` orchestrates the three states (input form → in-progress SSE tracking → report view). `src/components/` holds the UI pieces; `ReportView.tsx` includes the mandatory disclaimer footer — don't remove it, it's load-bearing for not overstating what this tool actually audits.
- `src/types.ts` — shared types between client and server (imported with `.js` extensions per the ESM/NodeNext setup — this is intentional, not a typo, even though the source files are `.ts`).

## AI Studio-specific conventions

- `GEMINI_API_KEY` is injected automatically by AI Studio's Cloud Run deploy from the Secrets panel — never hardcode it, never move Gemini calls to the client.
- `APP_URL` is auto-injected with the Cloud Run service URL at deploy time.
- `vite.config.ts`'s `DISABLE_HMR` env var toggle is managed by AI Studio's build agent to prevent flicker during automated edits — don't "fix" or remove this, it's intentional.

## Security invariants (do not regress these)

- `/api/proxy-image` must stay locked to `https://api.microlink.io` only. It exists purely to work around CORS for our own screenshot images. Widening it back to an arbitrary-URL proxy re-opens an SSRF hole.
- `/api/audit` must keep its rate limiter (currently 5 req / 15 min / IP). Each call triggers real Gemini + Microlink usage costs.
- Any new server-side fetch of a URL derived from user input (root URL, discovered pages, redirects, etc.) must go through `safeFetch` from `server/security.ts`, not raw `fetch`.
- The audit system prompt in `geminiAuditor.ts` explicitly instructs the model to treat page content as data, not instructions — preserve this line if the prompt is edited; it's a prompt-injection mitigation since page titles/meta descriptions are attacker-influenceable (the page owner controls them).

## Known limitations (not yet fixed — flag before "fixing" naively)

- `auditCache` and `activeAuditStreams` in `server.ts` are in-memory `Map`s. This works on a single instance but **will break under Cloud Run's default multi-instance scaling** — an SSE stream or cached report can land on a different instance than the one that created it. If this needs to scale, this goes to Redis/Cloud Memorystore, not a quick patch.
- No automated test suite exists — `npm run lint` is typecheck-only. Treat any refactor as unverified until manually tested against a real audit run.
- SSRF protection in `server/security.ts` validates the resolved IP at check-time but doesn't pin the TCP connection — a theoretical DNS-rebinding gap remains (documented in that file's comments).
