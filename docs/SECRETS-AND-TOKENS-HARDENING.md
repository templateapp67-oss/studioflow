# Secrets and tokens hardening

Scope: JWT/session secrets, API secrets, browser token storage and shipped
defaults. Status as of 2026-11-26 (branch `arena/2a6dddbe-studioflow`).

Automated proof: `node scripts/verify-auth-storage.mjs` runs on every
`npm test` and in CI via `scripts/run-all-verifications.mjs`. It scans every
browser-served file for token-like `localStorage` access and privileged secret
values, checks the `.env.example`/`.gitignore` contract, and behaviour-tests
the browser auth storage adapter (migration, purge on write/sign-out, legacy
sweep, memory fallback).

## JWT and session secrets

- No JWT signing secret exists anywhere in this repository, and none may be
  added. Supabase signs tokens; the web app, the Node API and the Edge
  Functions only *verify* them.
- Server-side verification (`server/supabaseAuth.ts`) calls Supabase Auth
  `GET /auth/v1/user` with the **publishable** key. A secret/service-role key
  in a browser-style variable is detected and refused, and is never sent to
  Auth. A missing/invalid token is rejected; an Auth outage fails closed
  (503) for AI routes instead of letting unauthenticated callers through.
- Token verification is cached keyed by a SHA-256 digest of the token, capped
  at 60 s and only for AAL2 tokens; raw tokens are never stored or logged.
- Browser sessions no longer persist in `localStorage`. The Supabase browser
  clients (root app `src/lib/supabase.ts` and `veda-sanjeevani/src/lib/api.ts`)
  use a sessionStorage-backed storage adapter (`src/lib/authStorage.ts`,
  `veda-sanjeevani/src/lib/authStorage.ts`):
  - tokens are per-tab and cleared when the tab closes;
  - a legacy `localStorage` copy (`studioflow_supabase_session` or the
    `sb-<ref>-auth-token` default key) is migrated to sessionStorage exactly
    once on first read, then deleted from `localStorage`;
  - `setItem` purges any `localStorage` copy of the key; `removeItem`
    (sign-out) purges both stores;
  - on module load a bounded sweep migrates and deletes every legacy
    token-like key in `localStorage`; workspace drafts, referral codes,
    guest-booking details and preferences are untouched;
  - privacy-restricted environments fall back to in-memory storage.
- There is no remaining browser code path that reads a token from
  `localStorage` (`src/AppRouter.tsx` uses the shared
  `hasPersistedAuthSession()` helper). The Android WebView QA overrides assert
  both stores are empty after logout.

What stays the operator's job (cannot be done from source): rotate the
project's JWT secret and service-role key in the Supabase dashboard if they
were ever exposed, keep the published publishable key as-is (public by
design), and keep Auth rate limits/TOTP enabled as documented in
`docs/auth-access-hardening.md`.

## API secrets

- `GEMINI_API_KEY`, `RESEND_API_KEY`, `RAZORPAY_KEY_SECRET`,
  `RAZORPAY_WEBHOOK_SECRET`, `NEXORA_CRM_LEAD_TOKEN`, the WhatsApp tokens,
  `TURNSTILE_SECRET_KEY` and `LANDING_LEAD_RATE_LIMIT_SALT` are read only by
  the Node server (`server/`, `server.ts`) and the Edge Functions
  (`supabase/functions/`). No browser-served file references them.
- The browser bundle only receives `VITE_*` build variables, and
  `src/lib/nexoraEnv.ts` refuses to build/run with a secret-shaped key or a
  privileged JWT in a `VITE_*` variable (fail-fast with redacted diagnostics).
- AI routes require a verified Supabase session (`server/supabaseAuth.ts`);
  the provider key never reaches the browser, and AI calls from the browser
  carry only the user's own access token as a bearer.
- `node scripts/verify-auth-storage.mjs` enforces all of this offline. If a
  future change leaks a privileged value into `src/`, `public/` or the HTML
  shells, that suite fails.

## Defaults that shipped in the repo

Findings and dispositions:

- **No default username/password pairs exist in this repository** — no seeded
  admin account, no demo login, no committed `.env`, no default JWT.
- `RESEND_FROM_EMAIL` previously shipped `StudioFlow <onboarding@resend.dev>`,
  Resend's shared sandbox sender (delivers only to the account owner).
  `.env.example` now uses a verified-domain placeholder. The code paths
  (`server/bookingEmail.ts`, `server/staffInviteEmail.ts`,
  `supabase/functions/studioflow-booking-emails/index.ts`) still fall back to
  the sandbox sender when the variable is unset — deliberately unchanged so an
  unconfigured deployment degrades rather than breaks. **Set
  `RESEND_FROM_EMAIL` to a sender on your verified domain in production.**
- `LANDING_LEAD_RATE_LIMIT_SALT` is **required, with no fallback**. Both
  `server/nexoraDemoLead.ts` and `supabase/functions/submit-landing-lead/index.ts`
  throw when it is unset (the Edge Function throws at module load, so a
  misconfigured deployment stores nothing; the Node route throws and answers
  500). There is no public default for anyone to fall back to. Set the SAME
  high-entropy value in the server and Edge environments (differing values per
  environment) before relying on the lead rate limiter.
- `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_ANON_KEY` fallbacks in server files
  are the same publishable key already shipped publicly in
  `src/lib/supabase.ts`; they are not credentials and are safe to keep.
- `supabase/migrations/20261011080053_nexora_food_shared_backend.sql` granted
  `super_admin` to a hardcoded personal Gmail address as a one-time bootstrap
  for the nexora_food shared backend. Applied migrations are never edited, so
  the grant stays in that file as history. A scoped, idempotent successor
  migration —
  `20261126130000_revoke_nexora_food_super_admin_bootstrap.sql` — deletes
  exactly that `super_admin` role row (the account keeps its customer role) and
  writes a compensating `revoke-super-admin-bootstrap` audit entry only when a
  row is actually removed. It ships as release-pending in
  `docs/integrations/restored-supabase-history.json` and is applied only via
  the protected manual production migration workflow. That workflow must run
  before this branch is relied on in production.
- `TURNSTILE_SECRET_KEY` verification is **fail-closed**. A missing secret, a
  missing token, a network error, a non-200 response or Cloudflare answering
  `success !== true` all reject the request with 403 and nothing is stored —
  there is no fail-open path. The public demo form and same-origin fallback do
  not yet emit a Turnstile token, so enforcement goes live together with the
  widget/token rollout; until then, public submissions are rejected, which is
  the intended fail-closed posture. The server forwards a caller-supplied
  token verbatim to the Edge Function for verification.
- The `veda-sanjeevani/.env.example` placeholder keys are documentation-only
  values (`replace-with-…`), not working credentials.
- Local Auth configuration (`supabase/config.toml`) already enforces
  `minimum_password_length = 12`, TOTP enroll/verify and rate limits; keep
  hosted Auth settings in sync.

## Before deploying this branch

1. Deploy the web app and API together (the storage adapter and the router
   change land in the same build).
2. Open the app signed in from a profile that still has a legacy session:
   confirm sign-in continuity and that `localStorage` no longer contains
   `studioflow_supabase_session` or `sb-*-auth-token*` keys.
3. Re-run `npm test` and `npm run test:unified`.
4. Work through the env checklist in `.env.example`: set
   `LANDING_LEAD_RATE_LIMIT_SALT` (required — no lead is processed without
   it), `RESEND_API_KEY` + verified `RESEND_FROM_EMAIL`, and keep every
   privileged key out of `VITE_*`.
5. Apply `supabase/migrations/20261126130000_revoke_nexora_food_super_admin_bootstrap.sql`
   (and `20261126120000_accounts_backup_table_rls.sql`) through the protected
   manual production migration workflow, then confirm the bootstrap account
   holds only its `customer` role.
6. Deploy the Turnstile widget/token flow together with the fail-closed
   secret; public submissions are rejected with 403 until the form emits a
   token.
