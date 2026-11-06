# StudioFlow Gap Analysis

**Date:** 2026-11-06  
**Baseline:** main @ `dfd03cb`

This analysis separates implemented modules from evidence gaps. A module existing in source/database does not prove every workflow is production-complete.

## Essential for existing functionality

| Area | Evidence | Gap / required verification |
|---|---|---|
| Template catalogue | Supabase contains 16 active template records. | Verify all 16 IDs/categories, frontend rendering, onboarding selection and published website persistence agree. |
| Customer accounts | Customer profile/settings/referral/address/preference tables and code exist. | Test registration, login, recovery, session persistence, account isolation and deletion/export expectations. |
| Salon onboarding | Salon, owner, website, branding and booking-settings tables/RPCs exist. | Test a fresh salon signup through provisioning without duplicate salons or orphaned rows. |
| Services | 126 StudioFlow service rows and separate salon service tables exist. | Confirm owner edits, category/template defaults, image persistence, active/bookable flags and public filtering. |
| Staff | Staff/schedule/service tables and booking code exist. | Confirm staff visibility, profile editing, specialist-service matching and schedule-based availability. |
| Booking | Booking, item, slot-hold, payment-order and availability routines exist. | End-to-end test multi-service pricing, hold expiry, conflict handling, cancellation, rescheduling and time zones. |
| Payments | Razorpay Edge Function is deployed; live/test status is secret-derived. | Verify live credentials, webhook signature, idempotency, amount validation, refunds and reconciliation in provider sandbox/approved live test. |
| Reviews | Review table and UI components exist. | Verify only completed appointments can submit; one unified review section; text and rating persistence/filtering. |
| Notifications | Reminder, push and WhatsApp functions/tables exist. | Verify scheduled worker configuration, opt-in/consent, retries, duplicate prevention and delivery receipts. |

## Required for production readiness

- Strict public-read policy predicates for salons, services and staff (migration supplied).
- Anonymous execution removed from owner-only onboarding/demo functions (migration supplied).
- Leaked-password protection enabled in Supabase Auth.
- Security-definer RPC allowlist with explicit role checks and fixed search paths.
- Rate limiting and abuse controls on public AI, bio, promo, booking and email endpoints.
- Verified canonical domain, sitemap origin and social image URL.
- Verified CSP against all actual integrations, including Supabase, Razorpay, media providers and maps.
- Automated smoke tests against a preview deployment.
- Database backup/PITR and recovery procedure documented and tested.
- Observability for API failures, payment reconciliation, booking conflicts and notification retries.

## Useful improvements

- Lazy-load template-specific editors and preview bundles.
- Add API contract tests for edge functions and Express routes.
- Add accessibility checks to PR gates and fix contrast/focus/labels.
- Add explicit 404 handling for unknown paths while preserving legitimate SPA deep links.
- Add idempotency keys and request correlation to all write flows.
- Add documented data retention and customer privacy/export process.

## Optional future enhancements

- Advanced payroll/commission analytics if product scope requires them.
- Multi-location consolidated reporting.
- Advanced marketing automation beyond consented campaign drafts.
- More external payment providers.
- AI-driven business forecasting.

These should not be built until existing core flows are stable and measured.

## Not treated as missing

The database already contains substantial booking, service, staff, loyalty, review, payment, notification and template structures. Do not create duplicate tables or replace existing integrations merely to satisfy a generic Salon OS checklist.
