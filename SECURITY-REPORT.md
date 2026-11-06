# StudioFlow Security Audit Report

**Date:** 2026-11-06  
**Baseline:** main `67db419b3cf2f926bf0ac259add0126d779240ae`

## Summary

No confirmed P0 vulnerability was identified from the inspected source snapshot. Several security controls are present in Supabase migration/documentation and Vercel headers, but production enforcement has not been verified. The following findings require remediation or deployment-level confirmation.

## Findings

| ID | Risk | Finding | Recommendation / status |
|---|---|---|---|
| SEC-001 | High P1 | Express and Supabase Edge booking-email endpoints previously accepted caller-supplied recipients; Edge CORS was wildcard and missing provider configuration could return simulated success. | This branch requires a Supabase JWT, binds delivery to the signed-in account email, restricts Edge CORS to configured origins, adds per-process per-user throttles, escapes server-rendered HTML, caps inputs and returns 503 when Resend is unconfigured. Global/distributed rate limiting and a verified salon-owner-to-customer reminder workflow remain future work. |
| SEC-002 | Medium P2 | CSP is still absent; Permissions-Policy and HSTS were missing from the inspected Vercel headers. | This branch adds Permissions-Policy and HSTS to Vercel and adds the baseline headers to Express. CSP remains deferred until external origins are inventoried and report-only reporting is configured. |
| SEC-003 | Medium P2 | `express.json()` previously relied on its implicit default body limit. | This branch makes the 100 KB JSON limit explicit and adds a regression assertion. Oversized-request runtime testing remains pending. |
| SEC-004 | Medium P2 | Supabase RLS and RPC security are extensively documented, but this audit did not inspect the live database policies or execute cross-tenant requests. | Verify actual deployed RLS, function execute grants, security-definer search paths, owner checks, storage object ownership and customer-only reads in a dedicated QA project. |
| SEC-005 | Medium P2 | `SUPABASE_SERVICE_ROLE_KEY` and other provider secrets are listed as blank placeholders in `.env.example`; this is expected documentation, not evidence of a leaked secret. | Keep service-role and payment/email/WhatsApp secrets in server/Edge Function secret stores only. The browser Supabase publishable key in `src/lib/supabase.ts` is explicitly a publishable key; it is not a service-role credential. Continue a full history/secret scan in CI. |
| SEC-006 | Medium P2 | No checked-in general security/dependency audit workflow was found in main's workflow tree. | Add dependency audit, secret scan, static analysis and a reviewable exception policy. Do not suppress known vulnerabilities without risk acceptance. |

## Existing positive controls observed

- This branch sets X-Content-Type-Options: nosniff, X-Frame-Options: SAMEORIGIN, Referrer-Policy, Permissions-Policy and HSTS on Vercel; Express receives the baseline headers and disables X-Powered-By.
- `src/lib/supabase.ts` explicitly uses a publishable browser key and warns against placing service-role keys in frontend code.
- Backend documentation describes public-safe published projections, restricted RPC wrappers, tenant RLS and owner-scoped storage paths.
- Payment security helper and multiple rollback-oriented SQL verification files exist.

These are source-level observations, not proof that the live Supabase project or deployed Vercel response enforces them.

## Security test status

- No live penetration test was performed.
- No production Supabase query or policy change was performed.
- No production request/response headers could be fetched in this execution environment.
- `scripts/verify-security-headers.mjs` checks repository headers; `scripts/verify-booking-email-security.mjs` checks JWT validation, recipient binding, CORS and delivery failure semantics. CI has not yet completed these checks.
- Supabase Edge Function secrets and live Resend delivery still require deployment-side verification.
- CSP enforcement is intentionally not added blindly: the application loads Google Fonts, Supabase, payment/AI integrations and other external resources; a strict untested CSP could break login, media and booking.
