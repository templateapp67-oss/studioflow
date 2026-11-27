# MFA recovery-code contract

`POST /api/account/recovery-codes/consume` and `GET /api/account/recovery-codes/active`
(Express `server.ts`; Vercel re-exports under `api/account/recovery-codes/`) are the
one path that must work at AAL1 for an account whose authenticator is lost.

## Why a Node endpoint instead of browser RPCs

Every authenticated Data API request passes the PostgREST pre-request hook
(`studioflow_check_rest_session`), which rejects AAL1 sessions that have an
enrolled factor. A lost-authenticator user could never reach the RPCs that free
them. These endpoints therefore run on the Node/Vercel side with the service
role, after the caller's bearer token has been verified.

## Security properties

- **Base authentication is mandatory** (401 otherwise). AAL2 is deliberately
  NOT required — that is the whole point of a recovery code.
- **The user id always comes from the verified token**, never from the body.
  `POST /api/account/recovery-codes/consume` takes exactly one field,
  `code`, via `RECOVERY_CONSUME_SCHEMA` (strict body, 4 KB cap).
- **Single-use consumption, atomic.** Codes are spent at most once: an
  `UPDATE … consumed_at IS NULL` compare-and-flip inside
  `studioflow_mfa_recovery_codes_consume(uuid, text)` (service-role only),
  so two concurrent requests cannot both spend one code.
- **Throttled twice.** Per account: 10 attempts / 10 minutes inside the
  database function. Per caller IP: 30 attempts / 10 minutes, enforced in the
  Node handler before any database work — a spray across many accounts from one
  address cannot farm the per-account budgets. Both share the distributed
  counter (`server/distributedRateLimit.ts`).
- **Hashed at rest.** Codes are stored only as
  `SHA-256(salt || ':' || normalized code)` with a per-code 32-hex salt. The
  browser hashes with WebCrypto; the database and network never see a plaintext
  code. Normalization (strip non-alphanumerics, upper-case) happens in the
  database function.
- **Auditable without leaking.** Attempts that pass the per-account throttle
  are recorded in `public.studioflow_mfa_recovery_audit` (user id + outcome +
  timestamp only; never code material). No client role may read the audit
  table.
- **No information leak.** An endpoint never reveals whether a code exists
  beyond the consume result itself.
- **Bounded recovery window.** A consumed code opens a 10-minute AAL1 window
  (inside `studioflow_private.mfa_session_allowed()`). Within it the user can
  reach Account security, enrol a fresh authenticator and remove the lost
  factor; afterwards the pre-request hook closes the window again.

## Per-IP budget identity

The caller's network identity for the per-IP budget honours `trust proxy` on
Express (`req.ip`) and the platform-owned forwarding header on Vercel
(`x-vercel-forwarded-for`). Arbitrary `x-forwarded-for` headers are never
trusted outside those runtimes. Anything unparseable shares one conservative
`unknown` bucket, so a forged chain of headers cannot move the budget.

## Verify it yourself

- `node scripts/verify-rate-limit-mfa.mjs` — throttles, MFA window, consume
  semantics (run against the disposable PGlite harness).
- `node scripts/verify-route-parity.mjs` — both runtimes mount the same
  handler, `RECOVERY_CONSUME_SCHEMA` on the consume route, Vercel entry is a
  thin action map.
- `docs/auth-access-hardening.md` — the full MFA recovery section in context.
