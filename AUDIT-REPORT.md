# StudioFlow Complete Repository Autopsy

**Audit date:** 2026-11-06  
**Repository:** `templateapp67-oss/studioflow`  
**Inspected baseline:** `main` at `67db419b3cf2f926bf0ac259add0126d779240ae`  
**Repair branch:** `audit/studioflow-end-to-end-autopsy-2026-11-06`

## Executive summary

The repository is a sizeable salon SaaS application, not a simple static website. The inspected tree contains 1,938 entries, including React/TypeScript frontend code, an Express Node server, Supabase migrations and Edge Functions, Vercel routing, 100+ offline verification scripts, Android QA material, and a large template media library.

The application architecture is broadly established: React 19 + Vite 6 + TypeScript, Supabase Auth/Postgres/Storage/RPCs/Edge Functions, an optional Express API server, and Vercel static/SPA routing. The repository documents substantial booking, owner workspace, service, staff, review, loyalty, and payment functionality. This audit does not assume that documented functionality is live or fully verified.

**No P0 issue was confirmed from the repository snapshot.** Several P1/P2 issues are confirmed below. Three SEO/configuration fixes have been implemented on this branch; they are not yet merged or deployed.

## Repository inventory

| Area | Evidence from inspected tree |
|---|---|
| Total entries | 1,938 (recursive Git tree; not truncated) |
| TypeScript / TSX | 217 .ts and 394 .tsx files |
| SQL | 111 files across backend, Supabase and other folders |
| Backend SQL | 85 files under `backend/` |
| Supabase migrations | 12 files under `supabase/migrations/` |
| Offline verification scripts | 109 `scripts/verify-*.mjs` scripts were enumerated by PR #69 CI |
| Public media | 605 files under `public/` |
| CI workflows on inspected main | Android QA workflow only; no general web CI workflow was present in main's tree |

## Architecture observations

- Frontend: React 19, TypeScript, Vite 6, Tailwind CSS, lazy-loaded feature modules and PWA support.
- Server: `server.ts` uses Express and provides AI/content and email-related endpoints in Node deployments.
- Database: Supabase Postgres, Auth, Storage, RPC wrappers and Edge Functions. Database work is split between `backend/*.sql` and `supabase/migrations/*.sql`.
- Hosting: `vercel.json` rewrites application routes to the SPA and routes `/sitemap.xml` to `/api/sitemap`.
- Tests: offline verification scripts, SQL/PGlite checks and optional live Supabase integration are documented. The backend README explicitly says browser QA is unavailable in the managed environment.

## Issue register

| ID | Severity | Finding | Evidence / status |
|---|---|---|---|
| AUD-001 | P1 | Homepage, login and runtime SEO metadata declared an obsolete ChatGPT-hosted canonical origin. | Confirmed in `index.html`, `login.html`, `src/lib/publicSeo.ts`; corrected on this branch to the confirmed NEXORA public domain. |
| AUD-002 | P1 | Sitemap generation threw when `SITE_URL` was unset and returned 503 on catalogue errors. | Confirmed in `server/sitemap.ts`; default canonical origin and outage-safe base sitemap added on this branch. |
| AUD-003 | P2 | No root `public/robots.txt` existed in main. | Confirmed by recursive tree; added on this branch. |
| AUD-004 | P1 | PR #69 web verification is failing; its run reports 90/109 offline suites passing. | Confirmed from Actions run 41978878476 on PR #69, not a test run of current main. See TEST-REPORT.md. |
| AUD-005 | P1 | Main has no general web build/test workflow in its checked-in workflow directory. | Confirmed in main's recursive tree; only Android QA workflow was present. A green Vercel deployment status is not a substitute for the test suite. |
| AUD-006 | P1 (conditional) | The Node `/api/send-booking-email` route accepts a caller-supplied recipient and interpolates caller-supplied values into HTML without visible route-level authentication, rate limiting or HTML escaping. | Confirmed by source inspection in `server.ts`; production exposure of this Express route is not established. Treat as high risk if the Node API is publicly reachable. |
| AUD-007 | P2 | CSP and Permissions-Policy headers are absent from the inspected `vercel.json`; some baseline headers are present. | Confirmed in `vercel.json`. CSP requires origin inventory and report-only validation before enforcement. |
| AUD-008 | P2 | Template/migration documentation was stale. | `backend/README.md`, `backend/GAP-AUDIT.md` and the booking add-ons verification script were reconciled on this branch to the 16-template catalogue. |
| AUD-009 | P2 | Database migration sources are split between 85 backend SQL files and 12 Supabase migration files. | Confirmed by tree inventory; deployment ordering and source-of-truth need one documented, automated process. |
| AUD-010 | P2 | Real browser end-to-end verification is not established. | Backend README states browser QA is unavailable; current evidence is primarily offline component/source checks and database assertions. |
| AUD-011 | P2 | Large image assets and a large CSS bundle need optimization review. | Tree contains multiple 700–850 KB JPGs and duplicates under source/public paths. PR #69 CI build snapshot reported main CSS 765.76 KB (127.48 KB gzip); this is not a fresh production measurement. |
| AUD-012 | P3 | Test output contains React test-renderer deprecation/context-renderer warnings and an empty image src warning. | Observed in PR #69 CI logs; investigate after functional failures. |
| AUD-013 | P1/P2 | Template 16's dedicated renderer bypassed shared customer-site contracts (profile actions, staff detail, packages, gallery persistence, app-install, social/loyalty/policies and saved section headings). | Confirmed by source and verification assertions; shared integrations and Template 16-specific rendering were added on this branch. CI verification remains pending. |

## PR and CI state observed

- PR #69 is open, has 2 commits and 18 changed files, and is not mergeable according to the inspected PR metadata. Its CI run #2 failed. Its base SHA predates the inspected current main SHA; several template-count assertions were already updated on current main, so PR #69's 19 failures are not a valid current-main test result.
- PR #62 is open, has 74 commits and 37 changed files. The inspected latest run for it failed.
- Multiple other PRs are open. This audit branch does not alter or close them.
- Main's latest commit at audit time was a merge of PR #77. Its combined status showed a Vercel check success; no general web test check was present in that status response.

## P0 / P1 risk assessment

- P0: none confirmed from available evidence.
- P1: SEO origin mismatch (fixed on branch); sitemap availability/configuration (fixed on branch); failing PR #69 verification; missing main-branch web CI; conditional email endpoint abuse/injection risk.

## Scope and limitations

This was a repository-wide structural inventory plus targeted source, migration, CI-log and configuration inspection. It was not possible to interactively test every control or run the repository locally in this session. The live URLs could not be fetched from the available network path (DNS resolution failed), so no current HTTP response, production header, live sitemap, real Core Web Vitals or live database state is claimed. The historical BugViso metrics supplied in the task were not re-measured. No production database was queried or modified.

The issue register is evidence-based and intentionally distinguishes confirmed source findings from unverified production exposure. Further browser, Vercel environment, Supabase RLS and deployment verification remains necessary before declaring production readiness.
