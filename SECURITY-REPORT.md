# StudioFlow Security Report

**Date:** 2026-11-06  
**Scope:** Repository main, connected Supabase project and deployed Edge Function metadata/code inspection.

## Findings

| Severity | Finding | Evidence | Remediation |
|---|---|---|---|
| High | Anonymous demo seeding | `af_seed_demo(uuid)` has anon EXECUTE and does not reject anon caller in its current owner guard. | Revoke anon/public EXECUTE; retain authenticated path. Included in migration. |
| High | Public staff privacy predicate too broad | Legacy `staff_public_read` policy permits active rows without `is_public`. | Replace with active + public + live salon predicate. Included in migration. |
| High | Soft-deleted salon visibility | Legacy `salons_public_read` checks active only. | Require `deleted_at IS NULL`. Included in migration. |
| High | Public service visibility inconsistency | Legacy permissive `services_public_read` checks active only; permissive policies OR together. | Consolidate strict predicate. Included in migration. |
| Medium | Leaked-password protection disabled | Supabase Auth security advisor. | Enable in Auth configuration after review. |
| Medium | Mutable function search_path | Advisor flags 7 routines globally; StudioFlow-adjacent trigger helpers include `af_offer_clear_demo` and `check_max_salon_social_videos`. | Set fixed trusted search_path after reviewing function dependencies. |
| Medium | Many SECURITY DEFINER routines exposed to API roles | Advisor flags 14 anon and 58 authenticated routines across shared project. | Build explicit function-by-function authorization matrix; do not blanket revoke public booking/availability. |
| Medium | Multiple permissive policies | 113 advisor findings across shared database. | Consolidate policies in a product-scoped migration after validating owner/public semantics. |

## Positive controls observed

- RLS is enabled on all 220 public tables returned by the schema inventory.
- Supabase Edge Functions use server-side secrets for Razorpay, Gemini, WhatsApp and service-role operations; secrets are not embedded in inspected frontend files.
- Razorpay payment function authenticates non-webhook calls against Supabase Auth, verifies order ownership, checks captured amount/currency/status and validates webhook signatures.
- AI recommendations function authenticates user sessions before generating personalized recommendations.
- Welcome WhatsApp function checks confirmed customer identity or a worker token.
- Several sensitive private schemas/tables intentionally have RLS enabled without client policies.

## Important distinction

Supabase advisor warnings are not all exploitable vulnerabilities. Security-definer functions may be intentionally callable when their bodies enforce authorization or return public data. Private RLS-enabled tables without policies are often correctly inaccessible. Every function and policy must be reviewed by behavior and role before changing grants.

## Remaining security tests

- Cross-account read/write attempts for salon, staff, customer, booking, review and payment IDs.
- Anonymous RPC allowlist test.
- Password reset/session expiry and token revocation tests.
- Webhook replay and duplicate payment reconciliation tests.
- Public endpoint rate-limit and payload-size tests.
- File upload MIME/size/path ownership tests.
- CSP report-only telemetry then enforcement verification.
- Verify HSTS, Permissions-Policy, X-Content-Type-Options, Referrer-Policy and clickjacking controls on the actual production host.

## Migration status

The branch contains a reversible-in-effect policy/grant tightening migration. It does not delete records. It has not yet been applied to production; apply only after CI and preview validation.
