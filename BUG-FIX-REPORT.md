# StudioFlow Bug Fix Report

**Date:** 2026-11-06  
**Repair branch:** `fix/studioflow-autopsy-final-2026-11-06`  
**Base:** `67db419b3cf2f926bf0ac259add0126d779240ae`

## Fixes implemented on this branch

### FIX-001 — Replace obsolete canonical and social metadata origin

- **Severity:** P1
- **Root cause:** Static homepage, login HTML and runtime public SEO metadata retained `https://nexora-one-white-label.templateapp67.chatgpt.site` after the public domain changed.
- **Files:** `index.html`, `login.html`, `src/lib/publicSeo.ts`.
- **Fix:** Updated canonical URL, Open Graph URL/image and Twitter image references to `https://nexorasalon.online`.
- **Validation added:** `scripts/verify-public-seo-domain.mjs` asserts all three sources use the same origin and reject the obsolete origin.
- **Status:** Implemented on branch; not yet CI-verified or deployed.

### FIX-002 — Make sitemap origin and temporary catalogue failure resilient

- **Severity:** P1
- **Root cause:** `canonicalOrigin(undefined)` threw when `SITE_URL` was unset; a Supabase catalogue error propagated and caused the handler to return HTTP 503.
- **File:** `server/sitemap.ts`.
- **Fix:** Added `DEFAULT_SITEMAP_ORIGIN` for NEXORA, preserved strict HTTPS-origin validation for configured values, and return a valid base sitemap containing the homepage and customer app when the public catalogue fetch fails.
- **Configuration:** `.env.example` now documents the NEXORA production origin for `SITE_URL`.
- **Validation added:** The SEO verification script builds the sitemap module and tests default origin, invalid HTTP origin rejection, and fallback XML under a simulated catalogue outage.
- **Status:** Implemented on branch; not yet CI-verified or deployed.

### FIX-003 — Add crawler discovery file

- **Severity:** P2
- **Root cause:** No root `robots.txt` existed in the inspected main tree.
- **File:** `public/robots.txt`.
- **Fix:** Allow public crawling and declare `https://nexorasalon.online/sitemap.xml`.
- **Validation added:** SEO verification checks the wildcard rule and sitemap reference.
- **Status:** Implemented on branch; not yet CI-verified or deployed.

### FIX-004 — Restore Template 16 shared customer website contracts

- **Severity:** P1/P2
- **Root cause:** The dedicated Aurelia renderer bypassed shared `CustomerSalonWebsite` and `WebsiteSections` behaviour, leaving the public customer page inconsistent with the other templates.
- **Files:** `src/components/aurelia/AureliaBeautyWebsite.tsx`, `src/components/aurelia/aureliaBeauty.css`, `src/components/appInstallSection.css`, `src/components/customer/categoryGroups.ts`, `scripts/verify-photo-gallery.tsx`.
- **Fix:** Added signed-in customer identity/profile controls and mobile account actions; full specialist-profile entry and modal; five package cards with shared service image resolution; shared saved-gallery persistence and category counts; app-install banner with Aurelia theme; saved section headings; and shared promo, social, loyalty and policy sections. Added Aurelia to Beauty Parlour customer discovery and updated gallery assertions to verify real category counts.
- **Status:** Implemented on branch; not yet CI-verified or deployed.

### FIX-005 — Reconcile backend documentation and template-count verification

- **Severity:** P2
- **Root cause:** Backend README and October gap-audit notes did not explain the later Template 15/16 catalogue migration; booking add-ons SQL verification still expected 14 active templates.
- **Files:** `backend/README.md`, `backend/GAP-AUDIT.md`, `backend/booking-add-ons-verification.sql`.
- **Fix:** Clarified that the initial migration seeded 14 templates and later migrations add Templates 15 and 16; updated the current verification expectation to 16.
- **Status:** Implemented on branch; SQL verification not executed against a database.

### FIX-006 — Align sitemap tests with resilient fallback behaviour

- **Severity:** P1
- **Root cause:** The previous regression suite expected an unset `SITE_URL` and temporary catalogue failure to produce HTTP 503, which contradicted the safer public sitemap fallback.
- **Files:** `server/sitemap.ts`, `scripts/verify-gap-completion.tsx`, `scripts/verify-public-seo-domain.mjs`.
- **Fix:** Added injectable environment/fetch dependencies to the handler and updated tests to assert a valid default-origin XML sitemap during a catalogue outage while retaining rejection of invalid configured origins.
- **Status:** Implemented on branch; tests not yet executed.

### FIX-007 — Add baseline deployment/server security headers and explicit request size limit

- **Severity:** P2
- **Root cause:** Vercel had only a subset of baseline security headers; Express did not set equivalent headers and relied on the implicit JSON parser size default.
- **Files:** `vercel.json`, `server.ts`, `scripts/verify-security-headers.mjs`.
- **Fix:** Added HSTS and least-privilege Permissions-Policy to Vercel; added X-Content-Type-Options, X-Frame-Options, Referrer-Policy and Permissions-Policy to Express; disabled X-Powered-By; set the JSON body limit explicitly to 100 KB; added a static regression check.
- **Status:** Implemented on branch; CI verification pending. CSP is intentionally not enforced without external-origin inventory.

### FIX-008 — Close the booking-email relay and remove simulated delivery success

- **Severity:** P1
- **Root cause:** Express and Supabase Edge email endpoints accepted caller-supplied recipients without verifying the signed-in user; the Edge Function allowed wildcard CORS; the development path could report a simulated send as successful when Resend was not configured.
- **Files:** `server.ts`, `supabase/functions/studioflow-booking-emails/index.ts`, `src/lib/emailService.ts`, `src/components/BookingModal.tsx`, `.env.example`, `scripts/verify-booking-email-security.mjs`.
- **Fix:** Validate Supabase access tokens through Auth; require the recipient to match the authenticated account email persisted by the booking RPC; forward session tokens from the client; make the booking email field read-only for signed-in accounts; restrict Edge Function CORS to configured origins; add a five-send/10-minute per-user in-memory throttle; escape HTML and sanitize email subjects; cap recipient and body fields; return HTTP 503 rather than simulated success when Resend is not configured.
- **Status:** Implemented on branch; CI and live Supabase/Resend verification pending. The in-memory throttle is per process/isolate, not a distributed global quota.

### FIX-009 — Put the primary salon website builder keyword in the homepage H1

- **Severity:** P2
- **Root cause:** The homepage H1 described a salon website but did not include the primary `salon website builder` keyword from the prior SEO review.
- **Files:** `src/components/PublicHomepage.tsx`, `scripts/verify-public-seo-domain.mjs`.
- **Fix:** Updated the H1 to `NEXORA Salon Website Builder & Management Software` and added a regression assertion.
- **Status:** Implemented on branch; CI verification pending.

### FIX-010 — Add crawlable SoftwareApplication structured data

- **Severity:** P2
- **Root cause:** The public homepage had no crawlable JSON-LD for the StudioFlow salon SaaS product.
- **Files:** `index.html`, `scripts/verify-public-seo-domain.mjs`.
- **Fix:** Added a `SoftwareApplication` schema with NEXORA publisher, canonical URL, verified social image and product description; added a parser-based regression assertion.
- **Status:** Implemented on branch; CI verification pending.

## Outstanding confirmed or high-risk issues

- PR #69 CI reports 19 failing offline suites; the latest inspected run reports 90/109 passing. These have not been represented as fixed by the SEO changes above.
- Main has no general web CI workflow in its checked-in workflow directory.
- The Node booking-email route needs authentication/authorization, recipient binding to a verified booking/customer flow, rate limiting and safe HTML escaping before it is considered production-safe.
- CSP/Permissions-Policy and deployed security headers remain to be implemented/verified after external-origin and feature requirements are inventoried.
- Live browser E2E, production Vitals, live sitemap and live Supabase/RLS verification remain unavailable in this execution.

## No destructive actions

No production deployment, merge, database mutation, data reset, history rewrite or deletion was performed. Existing open PRs were left untouched.
