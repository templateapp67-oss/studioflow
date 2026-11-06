# StudioFlow Production Gap Analysis

**Date:** 2026-11-06  
**Baseline:** main `67db419b3cf2f926bf0ac259add0126d779240ae`

## Classification

### 1. Essential for existing functionality

| Gap | Why it matters | Priority |
|---|---|---|
| Resolve the canonical-domain mismatch across static and runtime metadata. | Search engines and social crawlers must see one consistent production origin. | P1 — corrected on audit branch |
| Make `/sitemap.xml` valid when `SITE_URL` is unset or the public salon catalogue is temporarily unavailable. | A temporary Supabase/catalogue outage must not remove the entire sitemap. | P1 — corrected on audit branch |
| Reconcile the 19 failing offline verification suites reported by PR #69. | Failures include catalogue assumptions and Template 16 wiring assertions; these need root-cause triage, not test suppression. | P1 — outstanding |
| Protect the booking-email sending endpoint. | A public caller must not be able to use the service as an unrestricted email relay or inject untrusted HTML. | P1 — JWT validation, recipient binding, CORS allow-list and per-instance throttling added; distributed rate limit and verified salon-owner sending remain future work |
| Confirm that all current template IDs, category filters and service catalogues agree across frontend and Supabase. | Prevent missing templates, incorrect cards and invalid saved workspace data. | P1/P2 — needs automated cross-layer check |
| Keep Template 16 on the same shared customer-site contracts as the other templates. | Customers need profile controls, stylist details, packages, gallery persistence, promotions, loyalty, policies and app install on the dedicated Aurelia renderer. | P1/P2 — integration fixes added on audit branch; CI pending |

### 2. Required for production readiness

| Gap | Required evidence | Priority |
|---|---|---|
| Web CI on main | Required checks for typecheck, build, offline tests, dependency audit and security checks on PRs. | P1 |
| Browser E2E | Real browser journeys for signup/login, salon publish, service/staff edits, customer booking, cancellation and account isolation using a safe test tenant. | P1 |
| Security headers | CSP report-only with observed external origins, then staged enforcement; Permissions-Policy and baseline headers verified on deployed responses. | P1/P2 |
| Supabase security validation | Inspect actual deployed RLS, RPC grants, storage policies, role checks and cross-tenant isolation. | P1 |
| Environment/deployment verification | Confirm `SITE_URL`, Supabase public config, email/payment/WhatsApp provider configuration and redirect allowlists by environment, without exposing secret values. | P1 |
| Migration release process | One canonical migration order, preflight checks, backup/rollback plan and production migration evidence. | P1 |
| Live monitoring and recovery | Error reporting, uptime, database backup/restore rehearsal and deployment rollback procedure. | P2 |

### 3. Useful improvements

- Split the large global stylesheet by route/feature and verify CSS delivery after build.
- Optimize duplicate JPG assets and convert large hero media to responsive AVIF/WebP variants where visual quality permits.
- Add accessibility automation and manual WCAG 2.2 AA keyboard/screen-reader review.
- Add a full sitemap/canonical/OG/schema/link crawler to CI.
- Add a repeatable mobile viewport matrix (390, 430, 768, 1024, 1440, 1920px) with screenshots and overflow assertions.
- Reconcile test expectations that still encode 14/15 templates with the actual 16-template catalogue, only where the assertions are obsolete.

### 4. Optional future enhancements

The backend gap audit documents external dependencies that are not automatically required to make existing core flows reliable:

- Payment provider live-mode and webhook verification (requires valid Razorpay configuration and a safe test account).
- WhatsApp broadcast provider setup and template approval.
- AI provider credentials and model availability.
- Custom-domain DNS onboarding.
- Supabase Auth email delivery and redirect allowlist validation.
- Commission settlement/payment ledger.

Do not add new paid providers or broad product modules merely to fill this list. First verify whether each is an explicit product requirement and whether the provider is configured.

## Product areas to verify, not presume complete

| Area | Repository evidence | Remaining verification |
|---|---|---|
| Authentication/profile | Supabase Auth, profile and password reset code/tests documented. | Real browser flows, email delivery, session expiry, cross-account isolation. |
| Salon onboarding/publishing | Workspace save/publish and public projection code/migrations documented. | Real owner save, revision conflict, publish and public URL update. |
| Services/pricing | Catalogue, stable IDs, service image and pricing migrations documented. | Validate add/edit/delete, template switching and server-side price authority. |
| Staff | Staff profile, skills, portfolio and scheduling code/migrations documented. | Verify edits propagate to public staff cards and booking eligibility. |
| Booking | Availability/book/reschedule/coupon/add-on RPCs documented. | Real browser E2E with two simultaneous customers and a controlled test salon. |
| Reviews/loyalty | Customer review and reward migrations documented. | Verify only completed bookings receive verified-visit status and points are awarded once. |
| Payments | Razorpay Edge Function and refund flows documented. | Live provider configuration, webhook signatures, idempotency and refund reconciliation. |
| Notifications/email | Resend and WhatsApp integration paths documented. | Provider delivery, authorization, throttling and safe HTML/text rendering. |
| Admin/analytics | Dashboard and owner modules present. | Role/tenant authorization and report accuracy from persisted records. |

## Data safety

No database reset, destructive migration, or production data modification is part of this gap analysis. Production SQL must be applied only after identifying the exact Supabase project, reviewing the migration diff, taking a backup and obtaining the appropriate owner/admin approval.
