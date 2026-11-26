# NEXORA WhatsApp corrections review

## Baseline and scope

Compared latest `origin/main` (`7591975`) and PR #122 head (`7fcb5ca`). Main already includes the salon-owned implementation, executable foundation/tenancy verification, payment-link security helpers, pending sender readiness UI and gateway configuration. PR #122 is older in several areas and renames a migration version; those changes were not imported. Newer routing, profile completion, deposit protection and gateway configuration remain intact.

No production database operations were performed. No applied migration was edited or renamed. The historical nullable salon uniqueness constraints remain.

## Files changed

- `supabase/migrations/20261116100000_nexora_whatsapp_optional_profiles.sql`: additive replacement of customer lookup and guest booking functions; optional profile attributes are JSON keys rather than column references. Retains existing service-role private Vault grants. Other booking validation and locking are unchanged.
- `supabase/functions/studioflow-payments/index.ts`: require fetched-link membership on generic settlement paths too, retaining actual provider order checks through the existing verifier. Remove the duplicate expired/cancelled webhook branch.
- `supabase/functions/nexora-whatsapp-webhook/index.ts`: strict integer inbound timestamp validation; exact INR captured-ledger amount required for receipts; compare-and-set conversation flow when marking a paid booking, preserving intervening booking/opt-out state.
- `scripts/fixtures/whatsapp-runtime-catalog.mjs`: execute customer lookup and booking with optional phone columns absent.
- `scripts/verify-nexora-salon-whatsapp-schema.mjs`: execute browser-role table denials and service-role reads, not just privilege inspection; remove documentation-wording assertions.
- `scripts/verify-nexora-whatsapp-runtime.mjs`: expand actual-handler tests for third branch selection, malformed timestamps, receipt amount mismatch, accepted receipt suppression and atomic state-update predicates.
- This review/deployment report.

## Actual local results

All passed:

- `npm ci --ignore-scripts`: 251 packages installed; zero audit vulnerabilities. Lockfile accepted unchanged; no locked versions upgraded.
- `npm run lint`: frontend TypeScript.
- `npm run lint:edge`: Edge TypeScript.
- `npm run build`: Vite production build, public prerender, server bundle. Existing large-chunk warning remains non-fatal.
- `node scripts/verify-sql-migrations.mjs`: 58 baseline backend migrations and assembled booking/RLS behavioral suites pass, including two owners, customer and unrelated-user isolation. This suite is complemented by the dedicated WhatsApp catalog below; it is not a full historical production database reconstruction.
- `node scripts/verify-nexora-salon-whatsapp-schema.mjs`: isolated PGlite execution of foundation and tenancy migrations; final canonical account/booking/payment foreign keys; RLS/grants; actual browser table denial and service-role reads; two owners with NULL legacy salon IDs. Executes all 11 WhatsApp runtime migrations on the recorded StudioFlow fixture, service-role Vault/customer calls, browser RPC denial, active-link retry preservation, cross-owner rejection, booking creation and idempotent replay with optional profile columns removed.
- `node scripts/verify-nexora-whatsapp-runtime.mjs`: actual TypeScript handlers in isolated VM with fake DB/Meta: service/branch/slot choice 3, exact HH:MM, malformed numeric choices and timestamps, menu/HELP handoff, STOP/START opt-out, owner unauthenticated rejection, CORS preflight, tampered signature rejection, unknown sender isolation, readiness after signed inbound and accepted Meta reply, processed event replay, link membership/capture/order/INR amount rejection, unverified receipt denial, sent/delivered/read suppression, receipt state compare-and-set predicate.
- `node scripts/verify-nexora-whatsapp-platform.mjs`: integration contract checks including auth, signatures, Vault, cancellation, registration and owner UI.
- `git diff --check`.

The duplicate-link SQL test executes repeat registrations; it is not a multi-connection load test. VM tests do not send customer messages or create real provider links. The compare-and-set test checks the generated database predicate, not a distributed timing/load test.

## Gateway/security configuration retained

`supabase/config.toml` requires JWT verification for the owner connection endpoint, whose handler also calls Auth `getUser()` and validates owner identity. Meta and Razorpay provider endpoints disable gateway JWT verification because they validate provider signatures over the raw request body. Internal WhatsApp actions require the service credential; payment worker actions retain their dedicated server authentication. Meta tokens and provider credentials stay on the server/Vault; no frontend secret was added.

## Deployment requirements and limitations

1. Apply the new additive migration through the normal migration process after verifying actual remote migration history. Do not reset production or repair history to match PR #122's alternate filename. The pre-existing `20261116085953` version remains unchanged.
2. Deploy the updated payment and WhatsApp webhook functions and retain the checked-in gateway authentication configuration. Deploy existing connect/UI readiness changes if the target environment has not received main yet.
3. Ensure Vault contains the allow-listed Meta app secret, webhook verification token and token encryption key; configure the server-side Meta app ID, embedded-signup configuration ID, supported Graph API version and Razorpay credentials/webhook secret.
4. Complete/verify Meta business/Tech Provider permissions, App Review and Embedded Signup configuration. Subscribe the salon WABA and messages field; configure the signed Meta callback and Razorpay Payment Link callbacks.
5. Perform a controlled real-salon acceptance test: owner signup initially says Verification pending; only a signed inbound message followed by an accepted reply with a Meta message ID marks Connected. Test STOP/START, booking hold, real captured INR advance, receipt delivery and competing-link cancellation.
6. Free-form replies require the customer-service window; approved templates are needed outside it. Existing receipt suppression checks previously accepted/delivered/read logs; it is not a guarantee of exactly-once external delivery across a provider-send/database-write crash.

No live Meta signup, production message delivery, real Razorpay capture or production migration application was verified by this work.
