# StudioFlow Test Report

**Date:** 2026-11-06  
**Current main:** `67db419b3cf2f926bf0ac259add0126d779240ae`

## Main branch checks

- Main commit combined status returned a successful Vercel status check.
- No general web CI workflow was present in main's checked-in `.github/workflows/` directory at the inspected commit.
- The repository was not cloned or executed locally in this session; local `npm test`, `npm audit`, Playwright and device checks are therefore not claimed.

## PR #69 web CI evidence (not current main)

**Run:** 41978878476  
**Commit:** `0f63fe74695f7d1acfdeb458f6cd28f03bea19b9`  
**Workflow:** NEXORA web build and verification  
**Result:** Failed

| Check | Result |
|---|---|
| npm ci | Passed |
| TypeScript app check | Passed |
| TypeScript Edge check | Passed |
| Vite production build + server bundle | Passed |
| Offline verification suites | 90/109 passed; 19 failed |

Observed failure groups include template-count/category assumptions, customer account/discovery, gallery/loyalty, service/staff/profile, starter packages, Template 15 legacy/media and website wiring. A concrete assertion was `aurelia_beauty_parlour: Saved video heading missing`. Another asserted that the Aurelia template's services/packages all need photos. The PR #69 base predates the inspected current main; current main already updates several 14/15-template assertions to 16. Therefore the 19 failures are branch-specific evidence, not a verified current-main baseline. The actual Aurelia integration gaps identified in the current tree have been addressed on this audit branch, but the suite has not yet been rerun.

## Browser and live integration

- Backend documentation says browser QA was unavailable in the managed environment.
- No real customer booking, payment, email, WhatsApp or production database write was executed here.
- `npm run test:live` is documented as requiring a configured test Supabase project with email autoconfirm and disposable test accounts; it was not run.
- No production database was reset or modified.

## New targeted verification added on this branch

- `scripts/verify-public-seo-domain.mjs` checks homepage/login/runtime canonical origin, robots.txt sitemap discovery, sitemap origin default, rejection of HTTP origins and a simulated Supabase catalogue outage fallback.
- This new script has not yet been run in CI; it must be reported as pending until a successful Actions run is observed.
