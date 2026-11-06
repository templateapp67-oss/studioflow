# Changelog

## 2026-11-06 — End-to-end autopsy and first repair batch

### Added
- `AUDIT-REPORT.md` — repository inventory, severity register and evidence limitations.
- `GAP-ANALYSIS.md` — essential, production-readiness, useful and optional gaps.
- `BUG-FIX-REPORT.md` — root causes and fixes made on the audit branch.
- `SECURITY-REPORT.md` — source-level security findings and remaining risks.
- `PERFORMANCE-REPORT.md` — build/asset evidence and measurement limitations.
- `TEST-REPORT.md` — verified CI evidence and pending checks.
- `scripts/verify-public-seo-domain.mjs` — targeted canonical/robots/sitemap verification.
- `public/robots.txt` — crawler access and canonical sitemap reference.

### Fixed on this branch
- Secured booking email delivery with Supabase JWT checks, signed-in account recipient binding, a configured Edge Function CORS allow-list, per-user send throttling, HTML escaping, bounded inputs and explicit failure when Resend is unconfigured.
- Updated booking UI and email client to use the authenticated account email instead of accepting arbitrary recipients.
- Added Vercel HSTS and Permissions-Policy plus matching baseline Express headers, removed the Express powered-by header and made the 100 KB JSON request limit explicit.
- Added a security-header configuration regression script.
- Restored Template 16 shared customer website integrations: customer profile controls (desktop/mobile), staff full-profile view, service/package photo rendering, dedicated package cards, saved gallery categories, app-install banner theme, shared promotion/social/loyalty/policy sections and saved section headings.
- Added Aurelia to the customer Beauty Parlour discovery category.
- Reconciled backend catalogue documentation and booking add-ons verification from 14 to 16 templates.
- Updated homepage, login and runtime SEO canonical/Open Graph/Twitter URLs to `https://nexorasalon.online`.
- Made sitemap generation use the NEXORA production origin when `SITE_URL` is unset.
- Added a valid base sitemap fallback when the published salon catalogue cannot be fetched.
- Updated `.env.example` with the canonical `SITE_URL` value.

### Not done
- No merge or production deployment.
- No Supabase migration or database change.
- No production data change.
- No live payment/email/WhatsApp request.
- No claim that all 109 verification suites pass or that Core Web Vitals targets are met.

### Next work
- Run CI on this branch and fix the new test or source regressions if any.
- Triage each failing PR #69 suite and establish a passing baseline on current main.
- Fix/secure the booking email API and add a web CI workflow.
- Verify Vercel environment variables, custom domain attachment, live headers, robots, sitemap and social image.
- Run controlled browser E2E and live Supabase RLS tests in a dedicated test tenant.
