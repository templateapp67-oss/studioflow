# Edge Functions gap register (G-series)

This register was created during the G-01 work because the repository had no
`G-nn` numbering anywhere: the existing registers use `NX-nn`
(`docs/qa/NEXORA-LANDING-GAP-REGISTER.md`) and prose tables
(`docs/GAP-COMPLETION-REPORT.md`). IDs here continue that convention for the
Supabase Edge Function layer only.

Scope: everything under `supabase/functions/` (10 deployed functions), how the
app reaches them, and the database RPCs they depend on.

Severity: **P0** release blocker / security / data integrity · **P1** broken or
unreliable behaviour · **P2** hardening, consistency and documentation.

Every row states the evidence, what was changed, the test that now guards it,
and the residual risk. "Verified" here means verified offline against the real
toolchain (`deno check` 2.9.6, `tsc -p tsconfig.edge.json`, PGlite applying the
full 57-file migration chain, and `npm test`). It never means "deployed and
observed in the hosted project".

| ID | Severity | Area | Finding | Change | Guard | Status / residual risk |
|---|---|---|---|---|---|---|
| G-01 | P1 | Deployment source | Five functions were split across two trees. Four lived only in the retired backend functions tree — outside the only folder the Supabase CLI deploys from, so `supabase functions deploy` for them did nothing. `studioflow-booking-emails` existed in both, the backend copy being a 2-line re-export shim. | Moved the four single-copy functions into `supabase/functions/`, deleted the shim, and repointed every importer. A mechanical `git mv` would have overwritten the real 204-line booking-email implementation with the shim, so checksums were compared file by file after the move. | `scripts/verify-edge-functions.mjs` (folder/entrypoint/duplicate-tree/reference checks) | **Fixed and verified.** Actual deployment still requires `supabase functions deploy` with project access. |
| G-02 | **P0** | CORS / production outage | `studioflow-service-ai-images` pinned **one** hardcoded origin, `https://nexora-one-white-label.templateapp67.chatgpt.site`, while the canonical deployment is `https://nexorasalon.online` (`<link rel="canonical">` in `index.html`). On the live domain every image-generation request — and its preflight — was rejected by the browser, so "generate 3 AI images" could not work in production. No test covered this function's CORS at all. | Replaced the single pinned origin with the same exact-origin allowlist model the campaign sender already used (canonical + Vercel + legacy branded origin), echo only approved origins, add `Vary: Origin`, deny unapproved origins with 403, and keep server-to-server callers (no `Origin`) working. | `scripts/verify-edge-cors.ts` (allowlist parity across both origin-gated functions, canonical origin present, no wildcard, denial path) | **Fixed and verified** — the test fails on the pre-fix file and passes after. Not observed in a browser: no browser binary in this environment. |
| G-03 | P2 | Public API posture | `iron-ink-public` is unauthenticated by design and has **no rate limiting of its own**; `action: 'enquiry'` reaches `submit_ink_enquiry`, a `security definer` function granted to `anon` with no volume limit. The database does enforce format/ownership via CHECK constraints and RLS, so this is spam exposure, not data exposure — but the documentation described the function only as a "public integration surface", which read as safer than it is. | Documented the actual contract in `docs/TEMPLATE-12-IRON-INK.md`: what is enforced where, what is deliberately public, and the requirement to put a limiter in front before exposing it to untrusted third parties. | Documentation; the underlying limits live in the SQL rate-limit triggers validated by `scripts/verify-sql-migrations.mjs` | **Documented, not changed** — changing anonymous enquiry acceptance would change product behaviour and needs a product decision. |
| G-04 | P2 | Secret comparison consistency | `studioflow-payments` compared the service-role bearer with `!==`, leaking length and matching-prefix position through timing. `submit-landing-lead` already used a constant-time compare for the same check. | Added `sameSecret()` to `payment-security.ts` and used it for the worker/refund authorization path. | Existing `scripts/verify-pos-refunds.mjs`; the compare is covered indirectly by the refund authorization cases | **Fixed and verified.** Timing-only issue; no functional change. |
| G-05 | P1 | Dual-runtime duplication | Booking-email logic exists twice: `server/bookingEmail.ts` (228 lines, Node/Vercel) and `supabase/functions/studioflow-booking-emails/index.ts` (204 lines, Deno). They are separate implementations, not shared code, so a security fix applied to one does not reach the other. | Not changed in this pass. | `scripts/verify-booking-email-security.ts` executes the Node path and statically asserts the Deno path keeps the same invariants (`/auth/v1/user` + `/rest/v1/studioflow_bookings` lookup, stored-recipient binding, no simulated success) | **Open — deliberately.** Structural parity is asserted, behavioural parity is not. A shared module is blocked by the Deno/Node import boundary; the honest options are (a) delete the Edge fallback, or (b) extract the recipient/authorization rules into a runtime-neutral module. Needs a product call on whether the Edge fallback stays. |
| G-06 | P2 | In-memory rate limiting | `studioflow-booking-emails` keeps its send quota in a module-level `Map`. On Supabase Edge each isolate has its own memory and isolates are recycled/parallel, so the real ceiling is `MAX_PER_WINDOW × live isolates` and it resets on cold start. | Not changed. | None — this is the gap. | **Open.** Needs a shared counter (the landing-lead path already uses a table-backed counter, which is the pattern to copy) before the quota can be described as a limit. |

## How this was audited

Each finding came from executing a check, not reading code and guessing:

- **RPC/table contract:** every `.rpc()` and `.from()` name in the 10 functions
  resolved to real DDL in the migration chain (22 RPCs, 6 tables — none missing).
- **Privileges:** rather than trusting a line-based grep (which wrongly suggested
  four worker functions were unguarded), `has_function_privilege()` was run in
  PGlite against the fully applied 57-file chain. `anon` and `authenticated` have
  `EXECUTE = false` on the refund, hold-expiry and worker-verification functions.
  The earlier false positive came from a `revoke`/`grant` pair written across
  multiple lines in `backend/studioflow-pos-refunds.sql`.
- **Secrets:** no service-role/secret/Razorpay/WhatsApp token is hardcoded. The
  `sb_publishable_…` key appears in five places including `src/lib/supabase.ts`,
  i.e. it is already shipped to the browser by design; it is not a leak.
- **Runtime:** all 10 functions typecheck under Deno 2.9.6. `snapshot-accounts`
  failed before the G-01 follow-up (legacy `deno.land/std` import) and passes now.

## What this audit could not verify

- An actual `supabase functions deploy`, and therefore whether each function is
  ACTIVE in the hosted project — no project credentials and no Docker here.
- Real browser behaviour of the G-02 fix (no browser binary; asserted from the
  source contract and the preflight logic instead).
- Turnstile, Razorpay, WhatsApp, Resend and OpenAI responses — no outbound
  access to those hosts. Every provider path is exercised against mocks only.
