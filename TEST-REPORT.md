# StudioFlow Test Report

**Date:** 2026-11-06  
**Current main:** `67db419b3cf2f926bf0ac259add0126d779240ae`
**Repair branch:** `fix/studioflow-autopsy-final-2026-11-06` (proposed PR #81)

## Main branch checks

- Main commit combined status returned a successful Vercel status check.
- No general web CI workflow was present in main's checked-in `.github/workflows/` directory at the inspected commit.
- The repository was not cloned or executed locally in this session; local `npm test`, Playwright and device checks are therefore not claimed. A GitHub Actions workflow was added to the repair branch to run TypeScript checks, the Edge Function check, Vite/server build, offline verification and `npm audit`.

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

Observed failure groups include template-count/category assumptions, customer account/discovery, gallery/loyalty, service/staff/profile, starter packages, Template 15 legacy/media and website wiring. A concrete assertion was `aurelia_beauty_parlour: Saved video heading missing`. Another asserted that the Aurelia template's services/packages all need photos. The PR #69 base predates the inspected current main; current main already updates several 14/15-template assertions to 16. Therefore the 19 failures are branch-specific evidence, not a verified current-main baseline. The actual Aurelia integration gaps identified in the current tree have been addressed on the repair branch. The new repair-branch workflow has not yet produced a completed full-suite result.

## Repair branch CI status

- Run `42197967717` on the first repair commit failed at the Express sitemap handler type boundary; the handler was refactored to use a factory so Express/Vercel receive a two-argument request handler.
- Run `42200112070` was superseded while full verification was running; its verification job was cancelled and its dependency-audit job had not completed at the time of this report.
- Run `42200212615` was pending at the time of this report. Do not treat pending or cancelled runs as passing evidence.

## Browser and live integration

- Backend documentation says browser QA was unavailable in the managed environment.
- No real customer booking, payment, email, WhatsApp or production database write was executed here.
- `npm run test:live` is documented as requiring a configured test Supabase project with email autoconfirm and disposable test accounts; it was not run.
- No production database was reset or modified.

## New targeted verification added on this branch

- `scripts/verify-public-seo-domain.mjs` checks homepage/login/runtime canonical origin, robots.txt sitemap discovery, sitemap origin default, rejection of HTTP origins and a simulated Supabase catalogue outage fallback.
- `scripts/verify-security-headers.mjs` checks Vercel/Express baseline headers, HSTS, powered-by removal and the explicit JSON body limit.
- `scripts/verify-booking-email-security.mjs` checks JWT validation, recipient binding, CORS allow-list, per-user throttling, HTML escaping, account-email UI binding and explicit provider failure.
- This new script has not yet been run in CI; it must be reported as pending until a successful Actions run is observed.
