# QA, security and release report

**Scope:** Static/source audit and local frontend checks for Step 5. This report distinguishes checked source/configuration from tests that actually executed. The Supabase project is not connected in this environment; no deployment or provider delivery is represented as verified.

## Audit findings and disposition

| Check | Status | Evidence / notes |
| --- | --- | --- |
| `.gitignore` ignores `.env*` and allows only the backend and frontend examples | FIXED | Added the explicit `.env.frontend.example` exception; `.env.local` remains ignored. |
| Frontend dependencies contain no production audit findings | FIXED | Upgraded Zod to 4.6.7 and React Router DOM to 7.18.5 after audit findings; adapted Zod record schemas and router props. `npm audit --omit=dev` returned `found 0 vulnerabilities`. |
| No backend secret variable names or credential-shaped secrets in client source/build | PASS (static grep) | `grep` scan ran on `src/` and `dist/`. Source-only validation includes the harmless string `service_role` to reject privileged keys; this marker is not a secret. CI repeats a credential-shaped bundle scan. |
| All application tables enable RLS; private-table protections and role/booking SQL checks | NOT VERIFIED by execution | Migration 004 enables RLS on 22 app tables. `supabase/tests/db_tests.sql` contains checks for private anon reads, staff status-only updates, owner/profile restrictions, overlap exclusion and storage. Supabase CLI/Docker are unavailable here, so these SQL assertions were not run. |
| First user owner bootstrap; profile-role escalation protection | NOT VERIFIED by execution | Trigger/function/policy definitions and tests are present in migration/test sources. A fresh local DB reset and auth signup exercise were not run. |
| `create_booking` and `create_review_token` grants; exclusion and cancellation behavior | NOT VERIFIED by execution | Existing SQL tests assert restricted grants and booking overlap/cancellation behavior. Not run against Postgres in this environment. |
| Edge Function CORS, Zod request validation, envelopes, limits, no stack disclosure, cron auth | PASS (source inspection); NOT VERIFIED at runtime | Shared CORS/validation/response/auth modules and tests are present. Deno was not installed in the sandbox; function tests were not executed here. |
| Safe rendering and HTML escaping | PASS (source inspection) | Blog body is sanitized through DOMPurify with an allowlist; no other `dangerouslySetInnerHTML` usage was found. Function email utilities escape content. |
| Admin route noindex and staff navigation restriction | PARTIAL | Admin router adds noindex metadata; workspace filters staff navigation to Bookings and database policies govern writes. Full Step 4 setup/editor coverage remains unfinished (see gaps). |
| Wellness copy scan | PASS (source inspection) | Search matches include explicit negations/disclaimers and backend sanitizer tests. No affirmative cure/guarantee promise was identified in the reviewed seed/UI copy. |
| Service page medical disclaimer | PASS (source inspection) | Shared disclaimer is included in service/booking content. Not browser-verified. |
| Broken images, console errors, rejected promises, keyboard behavior | NOT VERIFIED | No Chromium/browser execution available in this environment. Existing optional browser checker also requires a separately installed browser. |
| Production dependency audit | PASS | `npm audit --omit=dev`: zero vulnerabilities after dependency updates. Full `npm audit` reports 12 moderate findings in development dependencies and zero high/critical findings; production dependencies are clean. Moderate dev-tool advisories remain for review. |
| CSP and security headers | FIXED / NOT VERIFIED at host | Added Vercel headers for CSP, frame policy, content type, referrer and permissions, plus cache directives. Header delivery must be confirmed on a deployed Vercel domain; CSP may need an exact host addition if the Supabase project is self-hosted or the map provider changes. |

## Implemented QA/deploy artifacts

- `.github/workflows/ci.yml`: install, typecheck, lint, Vitest, production audit, build, secret scan, Deno tests, Supabase DB reset/tests, Playwright Chromium, and Lighthouse CI. It is nested under this isolated project; GitHub only discovers workflows under the repository-root `.github/workflows`, so it must be integrated there by the repository owner before it can block merges.
- `playwright.config.ts`, `e2e/site.spec.ts`: API-contract-mocked booking confirmation, mocked concurrent `SLOT_TAKEN` race, mobile overflow, and home axe smoke check. These tests do **not** prove actual Postgres concurrency or email delivery.
- `lighthouserc.json`: mobile Lighthouse thresholds of 0.90 for performance, accessibility, best practices and SEO; script/font/LCP/CLS advisory budgets.
- `vercel.json`: SPA rewrite, baseline CSP/security headers, immutable hashed-asset caching and no-cache index.
- `assets/source/ayurvedic-spa-hero.webp`, `warm-herbal-oil-ritual.webp`, and `ayurvedic-herbs-still-life.webp`: new AI-generated illustrative images integrated into the public config and converted into 400/800/1600 WebP variants. Additional prompt-library images and all video files remain ungenerated; see `MEDIA_ASSETS.md`.
- `DEPLOY.md`: Supabase, Auth, functions, Resend, Vercel, custom domain, backups, uptime and rollback steps.
- `README.md`: setup, environment-variable list, architecture diagram in text, commands and ten troubleshooting entries.

## Local verification

Last fully completed frontend verification after the dependency upgrades and Step 5 changes:

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run test` — passed; 15 tests across 2 files.
- `npm run build` — passed; sitemap generated with 18 public URLs.
- `npm audit --omit=dev` — passed; zero vulnerabilities.
- Playwright config/spec TypeScript check — passed.

The production build emitted a Rollup annotation warning from Zod v4 source comments; it did not fail the build. Largest reported JS chunks: app entry 254.83 kB (78.81 kB gzip), React vendor 181.92 kB (59.91 kB gzip), data 162.01 kB (45.48 kB gzip), and motion 131.10 kB (43.18 kB gzip). These are emitted chunk sizes, not a measured initial-transfer total. Source uses route splitting, self-hosted fonts/preloads, a hero preload and responsive WebP; actual mobile performance/CLS is not measured. Full `npm audit` reported 12 moderate development-only advisories (notably minimatch in the lint/type tooling), with zero high/critical findings; these remain for review.

## Go-live checklist

`[x]` means locally/source verified only; `[ ] NOT VERIFIED` means this needs a real Supabase project, a browser/deployment or an owner action.

- [ ] NOT VERIFIED — Fresh Supabase database reset succeeds and seed loads (CLI/Docker unavailable here).
- [ ] NOT VERIFIED — Owner account created on the target project and public sign-up disabled afterwards.
- [ ] NOT VERIFIED — Setup wizard completes with AI content; all 12 services have reviewed description, price and image. The static preview has 12 of each, but the guided setup and AI review flow are unfinished.
- [ ] NOT VERIFIED — Test booking confirmation and owner/customer email received.
- [ ] NOT VERIFIED — WhatsApp link opens correctly with the target studio number.
- [ ] NOT VERIFIED — Double-booking request is rejected by the live database exclusion constraint. Mocked browser race is not DB proof.
- [ ] NOT VERIFIED — Review-request email and `/review/:token` flow work in production.
- [ ] NOT VERIFIED — Deployed 404, offline banner and error boundary behave correctly in a real browser.
- [x] PASS (source presence only) — Privacy, Terms and cookie-consent components are present; analytics are consent-gated/no third-party script is bundled. Cookie interaction was not browser-tested.
- [x] PASS (copy/source inspection) — Medical disclaimer present; no affirmative cure promise identified.
- [x] PASS (build output) — Sitemap generation succeeded; [ ] NOT VERIFIED — deployed sitemap, robots, canonical, OG tags and JSON-LD validated at the live domain.
- [x] PASS (source/config) — `/admin` adds noindex and has auth guard/staff tab filtering; [ ] NOT VERIFIED — live auth and database roles.
- [x] PASS (static grep) — No privileged secret variable names or credential-like tokens found in the built client output.
- [ ] NOT VERIFIED — Mobile Lighthouse scores reach 90+ for all categories; Lighthouse CI is configured but could not run without a browser here.
- [ ] NOT VERIFIED — 375px viewport and >=44px targets in a real browser/device. Playwright coverage is added but not executed here.
- [ ] NOT VERIFIED — Supabase backups/PITR enabled, external uptime monitor configured, and keep-alive cron active.
- [ ] NOT VERIFIED — GitHub Actions has run and is green on GitHub.

## GAP REPORT

1. **Fully verified with proof:** frontend typecheck, lint, 15 Vitest tests, production build/sitemap, Playwright-spec TypeScript compile, and `npm audit --omit=dev` (0 vulnerabilities). Build and test console output was observed in the coding environment; this is not proof of live-service behavior.
2. **Fixed:** production Zod high-severity audit issue (Zod 4.6.7); React Router advisory (React Router DOM 7.18.5); browser environment example ignore rule; deployment CSP/security header and cache config; added explicit IST time-format unit assertion, CI and smoke/E2E scaffolding, Lighthouse budgets and deployment documentation.
3. **Not verified / still risky:** Deno function tests, `supabase db reset`, SQL/RLS tests, Playwright browser execution, the configured axe scans on home/service/booking/admin login, Lighthouse scores/CLS, Vercel header behavior, live Auth/signup/reset, actual booking race in Postgres, AI generation/regeneration, image upload, Realtime, transactional emails, Resend, sitemap submission and custom domain. Chromium, Deno, Supabase CLI/Docker, project credentials and external provider setup were unavailable. Dev-tool npm audit findings need separate review. The admin panel remains partial: the seven-step resumable wizard, comprehensive editable content/services/team/gallery/reviews/settings, image resize/upload flow, publish checklist, and booking calendar/reschedule are not implemented. The Playwright race is explicitly a mocked API test, not a database guarantee.
4. **Manual owner actions:** provision Supabase and apply/check migrations (including 007), create owner then disable public signup, configure Edge Function and cron secrets, verify Resend sending domain and API credentials, enter production Vercel public env values, configure custom domain DNS/SSL, confirm Google Search Console, enable backups and external uptime monitoring, integrate the nested workflow at the repository-root `.github/workflows/ci.yml`, mark its required checks in branch protection/rulesets, and run real booking/review/email/AI acceptance tests.

**Release decision:** not yet ready to declare live or go-live. CI/deploy guardrails are added, but the outstanding manual and Step 4 implementation gaps above must be closed first.
