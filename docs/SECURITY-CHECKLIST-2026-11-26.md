# Security checklist — 2026-11-26 review

Scope: the 16 requested areas — Injection/input (SQL injection, XSS, CSRF,
file uploads, SSRF), Auth/access (object-level authorization, rate limiting,
password hashing, MFA, server-side permissions, Row Level Security) and
Config/hygiene (CORS, webhook signatures, exposed source maps, sensitive data
in logs, vulnerable dependencies). Branch `arena/2a6dddbe-studioflow`,
based on commit `a3edad5`.

Every item lists either **Fixed in this pass** (with the change and how it is
verified) or **Already satisfies the requirement** (with evidence), or
**Operator action** (hosted-only steps that cannot be done from source).
Unrelated code was not refactored; the one new migration is additive and
idempotent, and applied migrations were not edited.

Verification after this pass: `npm run lint`, `npm run lint:edge`,
`npm run build` (0 `.map` files emitted) and the full offline verification
runner — **185/185 suites pass** (4 optional browser suites skipped by
configuration, as usual). A third pass on the same date (distributed rate
limiting + MFA recovery codes, below) re-verified the runner at
**190/190 suites pass**. `veda-sanjeevani` typecheck and vitest pass.
`npm audit` reports **0 vulnerabilities** in the root app and in
`veda-sanjeevani` (both `--omit=dev` and the full tree). `npm run test:live`
was **not** run (it creates disposable accounts on the live project).

---

## Injection / input

### 1. SQL injection — already satisfies the requirement

There is no string-built SQL anywhere in `server/`, `api/`, `server.ts` or any
Edge Function (root or `veda-sanjeevani/`). All data access is either:

- **supabase-js / PostgREST** with JSON-encoded parameters (every
  `.from(...).select(...)/.eq(...)` call passes values as parameters or as
  `encodeURIComponent`-escaped URL segments), or
- **RPC calls** with typed JSON arguments, or
- **raw REST URLs** built from values that are regex-validated first
  (e.g. booking references must match `^[0-9a-f]{8}-...{12}$/i`, UUID and 64-hex
  tokens in `server/staffInviteEmail.ts`, `supabase/functions/studioflow-booking-emails/index.ts`).

The one remaining interpolated filter, `status=eq.${encodeURIComponent(body.status)}`
in `server/nexoraDemoLeads.ts` (demo-lead register), is both URL-encoded and
constrained by a database enum (`landing_lead_status`), and the endpoint is
manager-gated. No second-order SQL is accepted from request bodies.

CSV injection was the one real injection finding: the demo-lead CSV export
escaped quotes and commas but did not neutralise spreadsheet formulas.
**Fixed:** `server/nexoraDemoLeads.ts` `csvCell()` now prefixes a cell whose
text starts with `=`, `+`, `-`, `@`, TAB or CR with an apostrophe.
(`scripts/verify-nexora-admin-leads.mjs` still passes; the column set is
manager-only and contains attacker-controlled free text from the public form.)

### 2. XSS — already satisfies the requirement

- **Public article bodies** (`src/lib/journalRichText.ts`) are untrusted,
  owner-editable content. They are rendered as **React text segments**; no
  HTML is produced, so `<script>` in an article is displayed as characters.
  This parser is covered by `scripts/verify-journal-richtext.mjs`.
- **veda-sanjeevani** renders the same journal content through a DOMPurify
  allowlist (`html-react-parser` + `dompurify` ^3.2.7, see
  `veda-sanjeevani/src/pages/BlogPage.tsx`).
- **JSON-LD** blocks escape `<` → `\u003c` (`src/components/VogueNoirWebsite.tsx`,
  BodhiTree pattern) so an article body cannot break out of the `<script>` block.
- **HTML emails** escape every interpolated value (`server/bookingEmail.ts`,
  `server/staffInviteEmail.ts`, Edge `studioflow-booking-emails`) via a shared
  `escapeHtml`.
- No `dangerouslySetInnerHTML` fed by unsanitised input was found in browser-served code.

### 3. CSRF — already satisfies the requirement (by architecture); no code change

- The app authenticates with a **Supabase bearer access token in
  `Authorization`**, never with cookies. A repository-wide search found **no
  `Set-Cookie` / `res.cookie` / cookie storage** anywhere in `server/`, `api/`,
  Edge Functions or browser code, and **no
  `Access-Control-Allow-Credentials`** response header anywhere.
- A cross-site request forgery therefore has no ambient credential to ride:
  the browser does not attach anything automatically.
- Defence in depth that already exists: exact-origin CORS (this pass, item 12),
  `Referrer-Policy: strict-origin-when-cross-origin` and a CSP in
  `vercel.json`, `Cache-Control: no-store` on authenticated JSON responses, and
  server-side JWT verification on every privileged route.
- If a cookie-based session is ever introduced, CSRF protection (tokens or
  `SameSite=Strict` + origin checks) must be revisited — noted for the operator.

### 4. File uploads — already satisfy the requirement

Two upload architectures, both server-enforced:

- **Direct-to-Storage with bucket/policy limits (root app):**
  - `studioflow-media` bucket: public **read** bucket for site assets
    (5 MB fixture limit, `image/jpeg|png|webp` only) with Storage RLS write
    policies requiring `foldername(name)[1] = auth.uid()::text` (own-prefix
    writes only) —
    `supabase/migrations/20261010012933_studioflow_storage_and_booking_status.sql`.
  - `ink-references` bucket (tattoo references, anon uploads): requires the
    first path segment to be a UUID that exists in `studioflow_accounts`, ≤5 MB,
    jpeg/png/webp, insert-only for anon; owner read/delete policies
    (`20261113120946_template12_iron_ink.sql`).
  - Server-side render/RPC re-validations of uploaded objects (mimetype from
    Storage `metadata->>'mimetype'`, existence + own-prefix checks) in
    `20261014123207_studioflow_customer_reviews.sql`,
    `20261014145706_studioflow_service_images_owner_scoped.sql`,
    `20261017115000_customer_campaign_media_delivery.sql`.
  - Browser-side pre-validation before upload
    (`src/lib/servicePhoto.ts`, `src/lib/auraTemplateSections.ts`,
    `src/lib/supabase.ts`, `src/components/customer/useCustomerProfile.ts`,
    `src/templates/iron-ink/api.ts`) — always as defence in depth on top of the
    bucket limits, never instead of them. Avatar upload is JPEG-only ≤5 MB.
- **Register-then-upload with server metadata check (veda-sanjeevani):**
  `supabase/functions/register-media/index.ts` — uploaded object URL must be
  the project's own `/storage/v1/object/public/site-images/` origin, path must
  not contain `%`, `..`, backslashes or control characters, decoded path ≤512
  chars, server-side HEAD with 8 s timeout, Content-Length ≤5 MB, Content-Type
  in {jpeg, png, webp, avif} (variants webp), staff/owner required, byte count
  must match.
- Client-declared MIME types are never trusted for privileged flows.

### 5. SSRF — already satisfies the requirement

All outbound `fetch()` calls are either hardcoded hosts (`api.razorpay.com`,
`www.googleapis.com`, Resend, Supabase project URL from env,
`nominatim.openstreetmap.org` default geocoder overridable only via the
**server-side** `STUDIOFLOW_GEOCODER_URL` env var) or the Cloudflare Turnstile
siteverify endpoint. No request path lets a client supply a URL to fetch.
Details:

- `server/nexoraDemoLead(s).ts` — POST/PATCH to env-configured Supabase URL only.
- Edge `studioflow-map-locations` — geocoder endpoint from env with a fixed
  public default; the query string comes from the database `studioflow_map_claim`
  RPC (not directly from the client), is URL-encoded, 10 s timeout; stale
  `Referer`/`User-Agent` host string updated to `https://nexorasalon.online` in
  this pass.
- `register-media` — HEAD request pinned to the project's own Storage origin.
- `servicePhotoFromUrl` (browser fetch of a user-supplied image URL) is a
  browser-side fetch with `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`,
  HTTPS-only, no username/password, 20 s timeout, content-type and size checks —
  it never reaches server infrastructure.
- No open redirect/proxy endpoints were found.

---

## Auth / access

### 6. Broken object-level authorization — already satisfies the requirement

Object-level scoping is enforced server-side everywhere we checked:

- **Staff invite delivery** (`server/staffInviteEmail.ts`, Edge/RPC): the
  `studioflow_staff_invite_delivery` RPC (SECURITY DEFINER, `search_path=''`,
  executed by `authenticated` only) is owner-scoped by `auth.uid()`, requires
  the account to be the invite's owner, and additionally requires the session
  to pass `mfa_session_allowed()` (AAL2 for MFA-enrolled accounts)
  (`supabase/migrations/20261125100000_studioflow_auth_access_hardening.sql`).
  Token presented is validated (UUID + 64-hex) before any DB access.
- **Booking email send** (`server/bookingEmail.ts` and Edge sibling): booking is
  loaded with the **caller's** token; `owner_id === user.id || customer_id === user.id`
  required (403 otherwise); recipient must equal the stored booking's client
  email; `bookingRef` UUID-validated before the query.
- **Payments** (`supabase/functions/studioflow-payments/index.ts`): settlement,
  capture and refund paths all re-validate the payment server-side against
  Razorpay (amount, currency, link membership, captured status) — see item 13.
- **Demo-lead register** (`server/nexoraDemoLeads.ts`): manager-only, role taken
  from server-controlled `app_metadata.site_role` (`MANAGER_ROLES =
  site_admin|sales`), never `user_metadata`. Erase requires a UUID; export and
  list are manager-gated too.
- **Storage**: own-prefix policies (item 4) — a user cannot read/update/delete
  another user's objects.
- **veda**: `requireStaffOrOwner` / `requireOwner` guards in
  `_shared/auth.ts` scope every staff-side function (bookings, reviews, media
  registration) to the caller's own site/clinic.
- **api/\*.ts** on Vercel are thin re-exports of the same handlers; no separate
  unauthenticated object access was introduced there.

### 7. Rate limiting — already satisfies the requirement (with documented limits)

- **Fixed in the third pass (2026-11-26):** `server/distributedRateLimit.ts`
  claims budget from the shared Postgres counter
  (`studioflow_edge_rate_limit_claim`, service-role only) with
  `sha256(purpose | scope | key)` bucket keys — no raw IP, user id or booking
  reference is stored — and throws when a configured store is unreachable.
  `server/rateLimit.ts` is an async middleware on top of it: verified callers
  are bucketed per user with an `authenticatedMax` ceiling; anonymous callers
  are bucketed by the trust-proxy-aware client IP (spoofed
  `X-Forwarded-For` does not move the budget); limited requests get HTTP 429
  with `Retry-After`, `RateLimit-*` headers and `code: 'rate_limited'`; a
  configured-but-unreachable store fails closed with HTTP 503
  `rate_limit_unavailable` (`Retry-After: 30`); the per-process fixed-window
  map now only remains as the unconfigured development fallback (bounded,
  10k keys, oldest-drop). The escape hatch is
  `STUDIOFLOW_DISABLE_DISTRIBUTED_RATE_LIMIT=1`.
- `server/onboardingCopy.ts` — claims from the same shared counter
  (30/10 min per user); 429 carries `Retry-After` + `retryAfterSeconds`; 503 on
  store error. The injectable legacy signature is preserved for the offline
  unit test.
- `server/bookingEmail.ts` — claims from the shared counter
  (5 sends per booking per 10 min, bucket keyed by SHA-256 of the booking
  reference); 429 carries `Retry-After` + `retryAfterSeconds`; 503 on store
  error; unknown callers refused at the hard 10k-key cap if the store is
  unconfigured.
- Public/worker endpoints use **Postgres-backed** counters so they hold across
  isolates and cold starts:
  `submit-landing-lead` / `server/nexoraDemoLead.ts`
  (`claim_landing_lead_rate_limit`, 5 per 10 min per IP-hash, salt stays an
  env secret), `studioflow-booking-emails` (`studioflow_edge_rate_limit_claim`,
  5 per 10 min per user+booking+type, fail-closed 503), veda-sanjeevani
  (`_shared/rateLimit.ts`, e.g. `create_booking_public` 5/hour per IP and
  3/hour per phone). Both limiters are `service_role`-only RPCs.
- Auth endpoints are additionally throttled by Supabase Auth itself
  (config: `sign_in_sign_ups = 25`, `token_verifications = 20`, see
  `docs/auth-access-hardening.md`).
- Remaining documented limitation (operator): limits are 10-minute fixed
  windows; there is no burst/token-bucket smoothing, and
  `STUDIOFLOW_DISABLE_DISTRIBUTED_RATE_LIMIT=1` reverts to per-process memory
  if ever set — unset it in production.

### 8. Passwords — already satisfy the requirement (Supabase Auth)

- Password handling exists only inside hosted Supabase Auth. The repo contains
  no password storage, no password hashing code, no default credentials and no
  seed-admin script (re-verified by scan; see `docs/SECRETS-AND-TOKENS-HARDENING.md`).
- `supabase/config.toml` pins `minimum_password_length = 12`; hosted Auth
  settings (12+ char policy, bcrypt costing, breach checks) are an operator
  checklist item documented in `docs/auth-access-hardening.md`.

### 9. MFA — already satisfies the requirement

- TOTP enrollment is live in the product: `src/components/AuthMfa.tsx`,
  `src/components/AccountSecurityPage.tsx`, staff equivalents; recovery uses
  the same challenge flow.
- **Fixed in the third pass (2026-11-26):** first-class backup recovery codes.
  `supabase/migrations/20261126143000_studioflow_mfa_recovery_codes.sql` adds a
  client-inaccessible table of SHA-256 + per-code-salt hashes (never plaintext),
  single-use consumption (atomic spend — two concurrent requests cannot both
  use one code), per-account throttle (10 attempts / 10 min via the shared
  claim RPC), AAL2-enforced issue (`studioflow_mfa_recovery_codes_issue`,
  replaces the prior batch atomically, 1–8 codes), own-count read for the UI,
  and a 10-minute recovery window honoured by both enforcement layers
  (`studioflow_private.mfa_session_allowed()` for the Data API pre-request
  hook + AAL2 RLS policies, and the Node verifier which reports
  `mfaRequired: false` during the window). The browser generates 80-bit codes
  (`src/lib/recoveryCodes.ts`, show-once, WebCrypto hashing), the challenge
  screen offers "Lost authenticator? Use a recovery code"
  (`src/components/AuthMfa.tsx`), and Account security shows remaining codes
  and issues batches (`src/components/AccountSecurityPage.tsx`).
  Consumption runs behind `POST /api/account/recovery-codes/consume` with the
  caller's bearer verified first — required because an AAL1 session is refused
  by the Data API pre-request hook.
- **Server-side AAL2 enforcement is applied** at privileged Node handlers:
  `server/staffInviteEmail.ts` and the admin demo-lead register
  (`server/nexoraDemoLeads.ts`) both verify the bearer's assurance level —
  enrolled factor + non-AAL2 + no recovery window → HTTP 403 `mfa_required`
  before any privileged query or RPC runs. The onboarding AI gate likewise
  refuses AAL1 sessions with 403 (`server/onboardingCopy.ts`), as do the
  session-protected AI routes via `requireAuthenticatedUser`
  (`server/supabaseAuth.ts`). Edge functions enforce the same rule via
  `_shared/sessionProtection.ts` (`protectSession`, payment/campaign/welcome
  flows).
- Server-enforced AAL2: `studioflow_private.mfa_session_allowed()` reads
  `auth.jwt()->>'aal'` (must be `aal2`) and gates the staff-invite delivery
  RPC, MFA-only storage write policies and the Data API assurance check
  (`supabase/migrations/20261125100000_studioflow_auth_access_hardening.sql`),
  now with the 10-minute consumed-recovery-code window as the only additional
  pass (`20261126143000_studioflow_mfa_recovery_codes.sql`).
  Privileged operations cannot complete with an AAL1 session.
- `supabase/config.toml`: `[auth.mfa.totp] enroll_enabled = true,
  verify_enabled = true`. Hosted TOTP availability is an operator step in
  `docs/auth-access-hardening.md` (hosted Auth config is separate from source).

### 10. Server-side permissions — already satisfy the requirement

- Node API: AI routes require a verified Supabase session (fail closed 503 on
  Auth outage); manager routes require `app_metadata.site_role` in
  `MANAGER_ROLES`; deposit enforcement is server-authoritative
  (`server/bookingDeposit.ts` — rejects under-paid deposits with 422).
- Edge: veda `_shared/auth.ts` (`requireOwner`, `requireStaffOrOwner`) guards
  every staff-side function; root Edge functions authenticate via bearer +
  service client and check ownership/role server-side (payments: signed
  webhook or session-protected owner actions; welcome queue: confirmed user +
  `protectSession`; campaign sender: owner-scoped account check +
  `protectSession`, 70/h).
- Postgres: RLS policies and `can_manage_landing_leads()` / `mfa_session_allowed()`
  are the final boundary; direct table writes to staff invites are revoked
  (RPC-only lifecycle).

### 11. Row Level Security — fixed in this pass (one gap); otherwise already satisfies

- **Fixed:** `public.studioflow_accounts_backup` — the disaster-recovery copy
  of `studioflow_accounts` proposed by `supabase/migrations/daily_snapshot.sql`
  (an operations runbook with placeholder values, not a verified migration).
  It had no RLS and would have been readable through the Data API if the
  runbook was ever run. **New migration**
  `supabase/migrations/20261126120000_accounts_backup_table_rls.sql` enables
  RLS, revokes `all` from `public/anon/authenticated`, grants to `service_role`,
  and is idempotent/no-op when the table does not exist. It is recorded in
  `docs/integrations/restored-supabase-history.json` under
  `release_pending_migrations` and must ship via the protected manual
  production migration workflow (it is deliberately **not** applied from here;
  the RLS verification suite does not need live DB access).
- Evidence that the rest of the schema is covered: every table created in
  checked-in migrations enables RLS — explicitly or via guarded `DO` blocks
  (`nexora_food_%` in `20261011080053_nexora_food_shared_backend.sql`,
  `ink_*` in `20261113120946_template12_iron_ink.sql`, `nexora_job_*` in
  `20261010100539_nexora_recruitment_complete.sql`, `studioflow_android_*` in
  `20261015150903_studioflow_native_customer_app.sql`, the veda table loop in
  `veda-sanjeevani/supabase/migrations/002_tables.sql`).
- All private schemas (`studioflow_private`, `nexora_food_private`,
  `nexora_jobs_private`, `*_private*` variants) are revoked from
  `public`/`anon` (and `authenticated` where applicable) and are not exposed
  via PostgREST; their tables also carry RLS where defined.
- Behavioral proof: `scripts/verify-domain-rls.mjs` — PGlite fixture applying
  the real staff/domain migrations and asserting per-role
  (owner/manager/receptionist/provider/anon/unrelated) visibility and write
  behavior, including the `services_public_read` superset.
- `scripts/verify-supabase-migration-history.mjs` passes with the new pending
  entry (205 local sources, ledger aligned).
- **Operator action:** confirm in the live project whether
  `studioflow_accounts_backup` exists (runbook may never have been executed);
  apply the pending migration through the manual workflow; also confirm the
  `daily-accounts-snapshot` pg_cron job is either absent or points at the real
  project URL with a service-role bearer, and that the backup table's contents
  are as-expected.

---

## Config / hygiene

### 12. CORS — tightened in this pass

**Before:** 8 Edge Functions answered `Access-Control-Allow-Origin: *`
(booking-emails, payments, map-locations, mobile-qr, whatsapp-booking,
whatsapp-webhook, snapshot-accounts, iron-ink-public).

**After:** new shared module `supabase/functions/_shared/browserCors.ts`
(exact-origin allowlist: `https://nexorasalon.online`,
`https://www.nexorasalon.online`, `https://studioflow-ashen-pi.vercel.app`,
the retained legacy branded host `https://nexora-one-white-label.templateapp67.chatgpt.site`,
and `localhost:5173/3000` for dev; `Vary: Origin`; missing `Origin` —
pg_cron, Meta/Razorpay webhooks, Android, curl — always allowed; disallowed
browser origins get `403 Origin not allowed` or no ACAO header).

Tightened to it (each also rejects an unapproved browser origin with 403):
`studioflow-payments`, `studioflow-booking-emails`, `studioflow-map-locations`,
`nexora-mobile-qr`, `studioflow-whatsapp-booking`, `snapshot-accounts`,
`nexora-whatsapp-webhook` (OPTIONS now emits 204 with the echoed origin or
nothing at all; its POST already required Meta's raw-body HMAC).

Kept, deliberately: **`iron-ink-public`** — the public Template 12 API used by
*external* sites (e.g. GlowSlot) with the anon key only; RLS is its access
boundary and there are no credentials to protect. Documented as
wildcard-by-design in `scripts/verify-edge-cors.ts`.
`studioflow-tawk-connect` keeps its `*.vercel.app` branch on purpose (owner
previews deploy to arbitrary Vercel preview subdomains; the endpoint is
bearer-authenticated with MFA-protected session checks, so origin is not the
security boundary). The Veda app already used exact-origin CORS
(`_shared/cors.ts`, throws 403 otherwise) — unchanged.

The browsers-in-scope list is enumerated from actual `.invoke()` call sites;
`scripts/verify-edge-cors.mjs` now runs against the shared allowlist and
passes with **10 origin-gated browser-invoked functions, 0 wildcard-by-design**
(previously the 4 bearer-gated functions were exempted).

**Compatibility note:** every legitimate caller (the app on canonical/preview/
legacy hosts, mobile apps, cron, Meta, Razorpay, Tawk) is unaffected; a random
website can no longer read these functions' responses cross-origin.

### 13. Webhook signature verification — already satisfies the requirement

- **Razorpay** (`supabase/functions/studioflow-payments/index.ts` +
  `payment-security.ts`): `x-razorpay-signature` must match
  `^[a-f0-9]{64}$`, HMAC-SHA256 over the **exact raw body**, compared with a
  constant-time XOR loop; invalid → **401**; webhook secret unconfigured →
  **503** (never "accept on error"). The order-verify path compares receipts
  constant-time as well (`sameSecret`). Settlement only proceeds after an
  independent server-side re-fetch of the order **and** payment from Razorpay
  (status `captured`, amount = order amount, currency `INR`, payment-link
  membership verified via `verifiedLinkPaymentId`/`verifyLinkPayment`).
- **Meta / WhatsApp** (`supabase/functions/nexora-whatsapp-webhook/index.ts`):
  `x-hub-signature-256` must equal `sha256=<hex HMAC-SHA256(rawBody,
  vault_secret)>` compared with a constant-time equalizer; raw body capped at
  1 MB (413); the `GET` verify token is compared constant-time against the
  Vault secret; signature is checked **before** JSON parsing. The service-role
  bearer shortcut is also constant-time.
- **Stripe-style webhooks:** none in use.
- **Operational check (operator):** confirm `RAZORPAY_WEBHOOK_SECRET` and the
  Meta `nexora_whatsapp_webhook_verify_token` Vault secret are set and distinct
  per environment; dashboard webhook URLs point at the functions above.

### 14. Exposed source maps — fixed in this pass

**Before:** `dist/server.cjs.map` and `dist/storefront-renderer.cjs.map` were
emitted on every `npm run build` (esbuild `--sourcemap` in the `build` script
and `sourcemap: true` in `scripts/build-storefront-ssr.mjs`). `dist/` is what
`express.static` serves on the self-hosted production path (`README.md` —
`npm start` serves `dist/` plus `/api/*`), so both files were publicly
reachable there; the Vercel project is expected to publish the same Vite
output (its output settings cannot be confirmed from source).

**After:**
- `package.json` build script: `--sourcemap` removed (verified: a fresh
  `npm run build` emits **0** `.map` files — `find dist -name '*.map'` is empty).
- `scripts/build-storefront-ssr.mjs`: source maps no longer emitted for the SSR bundle.
- `server.ts`: requests ending in `.map` get a static 404 before
  `express.static`, covering any stale `dist/` that still contains maps.
- The Vite browser build already emitted no source maps.
- No code depends on the removed maps (no `sourceMappingURL` consumers left).
**Note:** any `.map` files in a previous deployment remain reachable until the
next deploy ships the new build; the build no longer recreates them.

### 15. Sensitive data in logs — already satisfies the requirement; small fixes applied

Reviewed every `console.*` in `server/`, `server.ts`, `api/`,
`supabase/functions/`, `veda-sanjeevani/supabase/functions/`:

- No log line prints passwords, tokens, API keys, webhook secrets, cookies or
  authorization headers. Logging of request bodies does not occur anywhere.
- Demo-lead and Edge audit logs deliberately log only an opaque id, status
  codes and error classes (`[nexora-demo-lead] id=<uuid> rate limited`);
  lead PII (names, emails, phones, messages) is never logged
  (`server/nexoraDemoLead.ts`, `submit-landing-lead`).
- Veda logs error *names* only (`logWarning(name, 'INTERNAL')`); the shared
  error envelope never reflects raw database/Gemini/Resend errors to clients
  (`veda-sanjeevani/supabase/functions/_shared/response.ts`).
- `server/httpSafety.ts` terminal error middleware logs the route and a short
  message, never the body; 4xx parser errors are returned with fixed messages
  (the parser's own text can quote the request body, so it is not reflected).
- **This pass:** the four AI-route `catch` sites in `server.ts` now log
  `err.message` only instead of the whole error object (Gemini SDK errors can
  echo request metadata). Claim-quota `id=` logs are opaque UUIDs, unchanged.
- Error responses to clients are generic (`internal_error`, `503`) and never
  carry stack traces or upstream payload text.

### 16. Vulnerable dependencies — fixed in this pass

- **Root:** `npm audit` (full tree and `--omit=dev`) — **0 vulnerabilities**.
- **veda-sanjeevani:** `npm audit` full tree reported **7 moderate** advisories
  (minimatch ReDoS via `typescript-eslint` → `eslint` chain; dev-only, not in
  the production bundle) → ran `npm audit fix` → **0 vulnerabilities** remain;
  `package-lock.json` updated. Re-verified: veda `tsc -b` and `vitest run`
  pass (15/15 tests).
- Locked installs (`npm ci`) are the supported path in CI (root + veda);
  `package-lock.json` for both apps is committed with these resolutions.
- Items with no available fix would have been documented here; none exist
  today.

---

## Operator checklist (hosted-only actions)

1. **Apply the pending migration** `20261126120000_accounts_backup_table_rls.sql`
   through the protected manual production workflow; then confirm in the live
   project that `public.studioflow_accounts_backup` (if it exists) has RLS
   enabled and no `anon`/`authenticated` grants. Confirm the
   `daily-accounts-snapshot` pg_cron job matches the intended project URL, or
   is removed.
2. Keep the previously documented hosted settings from
   `docs/SECRETS-AND-TOKENS-HARDENING.md` / `docs/auth-access-hardening.md`
   (JWT/service-role rotation review, hosted minimum password length 12, Auth
   rate limits 25/20, TOTP enabled, `LANDING_LEAD_RATE_LIMIT_SALT`,
   `RESEND_FROM_EMAIL` verified domain, Turnstile keys).
2b. Apply `20261126130000_revoke_nexora_food_super_admin_bootstrap.sql` via
   the protected migration workflow and confirm the bootstrap account holds
   only `customer`; apply `20261126120000_accounts_backup_table_rls.sql` at
   the same time if it has not landed yet.
2c. Apply `20261126143000_studioflow_mfa_recovery_codes.sql` (after
   `20261125100000_studioflow_auth_access_hardening.sql`) via the same
   workflow. Then confirm: `public.studioflow_mfa_recovery_codes` has RLS on
   and no client-role grants; `authenticated` cannot call the consume/active
   RPCs; an AAL2 session can issue a batch from Account security; consuming
   one code at AAL1 opens a 10-minute window (authenticated surfaces respond)
   and the same code cannot be consumed twice; after 10 minutes AAL1 is
   locked out again.
3. Confirm the Razorpay dashboard webhook URL matches this deployment and the
   webhook secret is set (function returns 503 without it); confirm Meta webhook
   subscription and the Vault verify token.
4. After the next production deploy, request `https://<host>/server.cjs.map`
   and `https://<host>/storefront-renderer.cjs.map` and expect 404.

## Addendum 2026-11-26 (second pass): lead-capture fail-closed fixes

Code-level follow-ups to findings in the sections above (and in
`docs/SECRETS-AND-TOKENS-HARDENING.md`), fixing rather than documenting only:

1. **`20261011080053` super_admin bootstrap revoked.** New release-pending
   migration `20261126130000_revoke_nexora_food_super_admin_bootstrap.sql`
   deletes exactly the `super_admin` row that migration granted to the
   hardcoded personal account (the account keeps `customer`). It is
   idempotent — re-runs delete nothing and write nothing — and writes a
   compensating `revoke-super-admin-bootstrap` audit entry only when a row is
   actually removed. Listed in `docs/integrations/restored-supabase-history.json`
   as release-pending; applied only via the protected manual migration
   workflow. The applied bootstrap migration is unchanged.
2. **`LANDING_LEAD_RATE_LIMIT_SALT` has no default.** The public fallback
   (`nexora-landing-rate-limit-v1`) is removed from
   `server/nexoraDemoLead.ts` and `supabase/functions/submit-landing-lead/index.ts`.
   Missing salt now throws (the Edge module at load, the Node route before any
   budget claim); no lead is processed with a predictable bucket key.
3. **Turnstile is fail-closed.** A missing secret, a missing token, a network
   error, a non-200 response, or Cloudflare `success !== true` all reject the
   request with **403**; nothing is stored and no path bypasses the check. The
   server forwards a caller-supplied token verbatim to the Edge Function for
   verification and relays the 403. Enforcement therefore goes live together
   with the widget/token rollout — until then public submissions are rejected,
   which is the intended fail-closed posture.
4. **Tests enforce all of the above offline**
   (`scripts/verify-nexora-lead-fail-closed.mjs`,
   `scripts/verify-nexora-demo-lead.ts`,
   `scripts/verify-landing-lead-edge-runtime.mjs`,
   `scripts/verify-landing-lead-shared-flow.mjs`); see the final report for
   the verification ledger.

## Addendum 2026-11-26 (third pass): distributed rate limiting + MFA recovery codes

Code-level follow-ups that close the remaining gaps called out in items 7 and 9:

1. **Shared Postgres rate limiting.** New `server/distributedRateLimit.ts`
   claims budget from `studioflow_edge_rate_limit_claim` (service-role) with
   digested bucket keys; `server/rateLimit.ts`, `server/bookingEmail.ts` and
   `server/onboardingCopy.ts` are on it. 429 carries `Retry-After`; an
   unreachable configured store fails closed (503, `Retry-After: 30`); the
   in-process map is now only the unconfigured development fallback.
2. **Server-side AAL2 enforcement.** Privileged Node handlers verify the
   bearer's assurance level server-side and refuse AAL1-with-enrolled-factor
   callers with 403 before any privileged work: staff-invite email and the
   admin demo-lead register (`code: 'mfa_required'`), the onboarding AI gate
   and the session-protected AI routes (Edge functions already enforce
   `protectSession`).
3. **Recovery codes.** New migration `20261126143000_studioflow_mfa_recovery_codes.sql`
   (release-pending; **not applied from here**): SHA-256 + per-code-salt
   storage, single-use atomic consumption, 10 attempts / 10 min per-account
   throttle via the shared claim RPC, AAL2-enforced issuance (atomic batch
   replace, ≤8 codes), 30-day prune, and `mfa_session_allowed()` extended so a
   consumed code opens exactly a 10-minute window. Node routes
   `POST /api/account/recovery-codes/consume` and
   `GET /api/account/recovery-codes/active` (with Vercel wrappers under
   `api/account/recovery-codes/`) verify the bearer before calling the
   service-role RPCs; the browser shows codes once, hashes via WebCrypto, and
   the MFA challenge offers the recovery-code path.
4. **Tests.** `scripts/verify-rate-limit-mfa.mjs` covers: claim-shape and
   digest privacy, spoofed `X-Forwarded-For` immunity, per-user ceilings, the
   429 + `Retry-After` contract, fail-closed outage behaviour, the bounded dev
   fallback, AAL1 rejection (403 `mfa_required`) on staff-invite/admin/AI
   gates, the recovery-window escape hatch, the hash/normalization contract
   between browser and SQL, and the migration's grants/RLS/atomic-spend
   invariants. The full offline runner passes **190/190 suites**
   (4 optional browser suites skipped by configuration, as usual).
5. **Flag for the reviewer:** recovery-code consumption executes with the
   service role through the Node route rather than directly from the browser.
   This is forced by the pre-request hook (an AAL1 session is refused every
   authenticated Data API call — including the RPCs that would free the
   account), and it is consistent with the lost-authenticator design of the
   flow; it is recorded here because it is the one path that bypasses the
   normal AAL2 gate, time-boxed to 10 minutes and single-use per code.

## Not run / out of scope

- `npm run test:live` (live Supabase; creates disposable accounts) — not run,
  per standing instruction.
- No edits to applied migrations; the three new migrations are idempotent and
  are staged as release-pending.
- No unrelated refactors; `iron-ink-public` intentionally remains a public
  wildcard endpoint (see item 12), and `studioflow-tawk-connect` keeps its
  `*.vercel.app` branch (owner preview deploys; bearer + session protection is
  the boundary).
