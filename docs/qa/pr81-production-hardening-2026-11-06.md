# PR #81 production hardening + quality gate — landed on a fresh branch

**Date:** 2026-11-06
**Branch:** `arena/98b76ebe-studioflow` (branched from `main` @ `cdde842`, the PR #82 merge)
**PR:** see the pull request opened from this branch — it **supersedes #81**

## What landed

| Area | Change | Files |
|---|---|---|
| SEO origin pin | Canonical, `og:url`, `og:image`, `twitter:image`, JSON-LD `url` and `publicSeo.ts` now use `https://nexorasalon.online` (never the Vercel preview host). | `src/lib/publicSeo.ts`, `index.html`, `login.html`, `public/robots.txt` |
| Owner-only editors | 18 owner-only editor modules in `SalonWebsitePreview.tsx` converted to `React.lazy` with a `React.Suspense` boundary. | `src/components/SalonWebsitePreview.tsx` |
| Public-access hardening migration | Non-destructive migration: revokes anon/public EXECUTE on owner-only provisioning/demo routines, replaces permissive legacy public-read policies for salons/services/staff. **Not applied to any database** — file only, owner approval required. | `supabase/migrations/202611060001_studioflow_public_access_hardening.sql` |
| Sitemap origin fix | `server/sitemap.ts` gains `isEphemeralOrigin()` / `sitemapOrigin()`: a real custom `SITE_URL`/`VITE_SITE_URL` is honoured, preview/local hosts (`*.vercel.app`, `*.netlify.app`, `*.pages.dev`, `localhost`, …) fall back to the production canonical, malformed values still throw. See [`pr81-sitemap-origin.patch`](pr81-sitemap-origin.patch) and [`pr81-quality-gate-fix.md`](pr81-quality-gate-fix.md). | `server/sitemap.ts` |
| Verification contract | `verify-public-homepage.tsx` additive merge: main's auth-callback regression matrix **and** PR #81's SEO/JSON-LD/sitemap assertions plus the patch's both-halves sitemap-origin assertions (preview rejected, custom domain honoured, preview `SITE_URL` → custom `VITE_SITE_URL` fall-through, malformed throws). | `scripts/verify-public-homepage.tsx` |
| Quality gate | New GitHub Actions workflow on `push`/`pull_request` to `main` + `workflow_dispatch`: `npm ci` + `npm test`, plus a high/critical `npm audit` job. Actions pinned to v5 on Node 22. | `.github/workflows/studioflow-production-quality.yml` |

Root-level audit/report documents from PR #81 (`AUDIT-REPORT.md`, etc.) were deliberately not carried over — the repository root stays uncluttered.

## Root cause of the #81 gate failure

`generateSitemap` hardcoded `canonicalOrigin(NEXORA_PUBLIC_ORIGIN)`, discarding `SITE_URL` for **every** value — not just preview hosts — which broke the pre-existing `verify-gap-completion.tsx` contract (`https://clinic.example/?site=real-clinic`). `tsc` and the build were never failing. The fix filters by host type instead of discarding configuration. The two halves of the contract are now both asserted in `scripts/verify-public-homepage.tsx`.

## Verification (this branch, 2026-11-06, Node v22.22.3)

| Check | Result |
|---|---|
| `npm ci` | clean install, 0 vulnerabilities |
| `npm run lint` (root `tsc --noEmit`) | PASS, exit 0 |
| `npm run lint:edge` | PASS, exit 0 |
| `npm run build` | PASS (Vite + prerender + esbuild server; SalonWebsitePreview split into a 1.07 MB shell + per-editor chunks) |
| `node scripts/verify-gap-completion.mjs` | PASS (previously failing suite) |
| `node scripts/verify-public-homepage.mjs` | PASS |
| `node scripts/verify-public-contrast.mjs` | PASS (WCAG AA, 2966 rendered text elements) |
| `npm test` (full gate) | **120/120 verification suites passed, exit 0** (~6m40s) |
| `npm audit --audit-level=low` | 0 vulnerabilities |
| `git diff --check` | clean |

Expected per baseline: 121 `verify-*.mjs` suites on `main`, runner skips `verify-supabase.mjs` → 120. Pre-existing noise ignored: Rollup chunk-size warning, Zod `@__PURE__` annotations, `react-test-renderer is deprecated`, concurrent-renderer warnings.

## Not done / explicitly out of scope

- **No deployment.** Vercel check failure is the Hobby-plan `api-deployments-free-per-day` quota (>100/day); it resets on a rolling 24h window and is not a code issue. No code was changed to work around it.
- **SQL migration not applied to Supabase.** It drops/creates RLS policies and changes function EXECUTE grants; it ships as a file only and must wait for owner approval.
- Live Supabase configuration untouched. Auth, integrations, valid routes and legacy API paths preserved.
- PR #81 left open for confirmation; this PR supersedes it. No issue was closed automatically.

## Merge gate

Do not merge until the workflow on this PR is green (or a failure has a documented, approved reason). The migration requires separate explicit approval before it is run against any database.
