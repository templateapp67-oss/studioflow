# StudioFlow Bug Fix Report

**Date:** 2026-11-06  
**Repair branch:** `fix/studioflow-production-autopsy-2026-11-06`

## Fixes included in this branch

| ID | Fix | Files | Verification status |
|---|---|---|---|
| SF-001 | Remove anonymous execute from owner-only `af_create_site`, `af_seed_demo`, `af_reset_demo_offers`; retain authenticated execution. | `supabase/migrations/202611060001_studioflow_public_access_hardening.sql` | Migration authored; not yet applied to production. |
| SF-002 | Replace permissive legacy staff public-read policies with `is_active AND is_public AND live salon`. | Same migration | SQL review complete; awaiting preview/CI. |
| SF-003 | Exclude soft-deleted salons from public salon reads. | Same migration | SQL review complete; awaiting preview/CI. |
| SF-004 | Consolidate public service reads so active/bookable service must belong to an active, non-deleted salon. | Same migration | SQL review complete; awaiting preview/CI. |
| SF-005 | Remove anonymous access from admin status RPC and direct invocation of trigger-only catalogue sync. | Same migration | SQL review complete; awaiting preview/CI. |

## Existing CI failures requiring reproduction on current main

A completed PR #80 verification job reported 113 passed and 5 failed offline suites:

1. App-install section contrast assertion (Aurelia banner reported 4.10:1 against 4.5:1 threshold).
2. Customer reference/catalogue assertion expected 15 templates while production catalogue contains 16.
3. Public homepage heading assertion expected outdated copy.
4. Service-photo rendering assertion did not find expected owner-uploaded service image markup.
5. Website wiring assertion did not find saved owner video through the expected normalization/render path.

These failures are not marked fixed by this branch. They must be reproduced on current main; test expectation changes are acceptable only when the product behavior is correct and independently verified.

## Not changed

- No customer, salon, staff, service, booking or template records.
- No production Edge Function deployments.
- No payment configuration.
- No production domain, canonical URL or Vercel environment variables.
- No working template design or business logic was intentionally removed.
