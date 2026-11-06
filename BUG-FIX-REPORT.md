# StudioFlow Bug Fix Report

**Date:** 2026-11-06  
**Repair branch:** `audit/studioflow-end-to-end-autopsy-2026-11-06`  
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

## Outstanding confirmed or high-risk issues

- PR #69 CI reports 19 failing offline suites; the latest inspected run reports 90/109 passing. These have not been represented as fixed by the SEO changes above.
- Main has no general web CI workflow in its checked-in workflow directory.
- The Node booking-email route needs authentication/authorization, recipient binding to a verified booking/customer flow, rate limiting and safe HTML escaping before it is considered production-safe.
- CSP/Permissions-Policy and deployed security headers remain to be implemented/verified after external-origin and feature requirements are inventoried.
- Live browser E2E, production Vitals, live sitemap and live Supabase/RLS verification remain unavailable in this execution.

## No destructive actions

No production deployment, merge, database mutation, data reset, history rewrite or deletion was performed. Existing open PRs were left untouched.
