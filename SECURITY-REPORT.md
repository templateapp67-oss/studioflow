# StudioFlow Security Audit Report

**Date:** 2026-11-06  
**Baseline:** main `67db419b3cf2f926bf0ac259add0126d779240ae`

## Summary

No confirmed P0 vulnerability was identified from the inspected source snapshot. Several security controls are present in Supabase migration/documentation and Vercel headers, but production enforcement has not been verified. The following findings require remediation or deployment-level confirmation.

## Findings

| ID | Risk | Finding | Recommendation / status |
|---|---|---|---|
| SEC-001 | High (conditional P1) | `server.ts` booking-email POST accepts a caller-supplied recipient; caller-supplied salon/client/service/address fields are interpolated into HTML; no route-level auth or rate limiter is visible in the inspected handler. | Do not expose this route as an unrestricted public relay. Require authenticated booking ownership or a short-lived signed server token, derive recipient and booking details from trusted persisted data, escape all HTML, validate field lengths, rate-limit and audit sends. Confirm whether the Express server is deployed publicly before assigning production exploitability. |
| SEC-002 | Medium P2 | `vercel.json` includes X-Content-Type-Options, X-Frame-Options and Referrer-Policy but no CSP or Permissions-Policy. | Inventory script/style/font/image/frame/connect origins; add CSP-Report-Only with a report endpoint or verified reporting process; review violations before enforcement. Add a least-privilege Permissions-Policy after confirming camera/geolocation/payment use. |
| SEC-003 | Medium P2 | `express.json()` is mounted without an explicit body-size limit in the inspected server entry. | Set a route-appropriate JSON size limit and test oversized requests; avoid breaking existing media/API payload contracts. |
| SEC-004 | Medium P2 | Supabase RLS and RPC security are extensively documented, but this audit did not inspect the live database policies or execute cross-tenant requests. | Verify actual deployed RLS, function execute grants, security-definer search paths, owner checks, storage object ownership and customer-only reads in a dedicated QA project. |
| SEC-005 | Medium P2 | `SUPABASE_SERVICE_ROLE_KEY` and other provider secrets are listed as blank placeholders in `.env.example`; this is expected documentation, not evidence of a leaked secret. | Keep service-role and payment/email/WhatsApp secrets in server/Edge Function secret stores only. The browser Supabase publishable key in `src/lib/supabase.ts` is explicitly a publishable key; it is not a service-role credential. Continue a full history/secret scan in CI. |
| SEC-006 | Medium P2 | No checked-in general security/dependency audit workflow was found in main's workflow tree. | Add dependency audit, secret scan, static analysis and a reviewable exception policy. Do not suppress known vulnerabilities without risk acceptance. |

## Existing positive controls observed

- `vercel.json` already sets X-Content-Type-Options: nosniff, X-Frame-Options: SAMEORIGIN and Referrer-Policy: strict-origin-when-cross-origin.
- `src/lib/supabase.ts` explicitly uses a publishable browser key and warns against placing service-role keys in frontend code.
- Backend documentation describes public-safe published projections, restricted RPC wrappers, tenant RLS and owner-scoped storage paths.
- Payment security helper and multiple rollback-oriented SQL verification files exist.

These are source-level observations, not proof that the live Supabase project or deployed Vercel response enforces them.

## Security test status

- No live penetration test was performed.
- No production Supabase query or policy change was performed.
- No production request/response headers could be fetched in this execution environment.
- CSP enforcement is intentionally not added blindly: the application loads Google Fonts, Supabase, payment/AI integrations and other external resources; a strict untested CSP could break login, media and booking.
