# End-to-end missing items, gaps, errors & bugs — fix report

Date: 2026-11-06  
Branch: `arena/478e03fa-studioflow`  
Baseline: PR #79 merge `dfd03cb92dee14a2f2fccae5938cdd4fb7d02630`

**No Vercel deploy/redeploy, Edge Function deploy, database migration, or push was performed.** One additive Supabase Auth redirect allow-list change was applied through the connected integration; existing allow-list entries were preserved.

## Fixed in code

### 1. Auth / legacy route regressions
- Added `src/lib/authEntry.ts` and aligned `src/AppRouter.tsx` + `src/App.tsx` so auth callbacks/errors, `passwordUpdated`, and legacy `?category=` entries are not swallowed by the prerendered public homepage.
- Added regression matrix in `scripts/verify-public-homepage.tsx`.
- Applied additive hosted Auth redirect allow-list entries for the canonical public origin:
  - `https://studioflow-ashen-pi.vercel.app/`
  - `https://studioflow-ashen-pi.vercel.app/**`
- Preserved existing `site_url`, signup toggles, `mailer_autoconfirm`, SMTP settings and prior redirect entries. Owner still needs to decide the production `site_url`/SMTP/autoconfirm posture before release.

### 2. Booking email security + static-host parity
- Added shared `server/bookingEmail.ts` used by both legacy Express routes and new Vercel adapters:
  - `api/send-booking-email.ts`
  - `api/email-service-status.ts`
- Preserved legacy paths `/api/send-booking-email` and `/api/email-service-status`.
- POST now requires a Supabase JWT, reads the booking through RLS, allows only the booking owner/customer, binds the recipient to the stored booking email, rejects arbitrary recipient overrides, escapes HTML, caps inputs, throttles per user/booking/type, and returns honest 503 when Resend is unconfigured instead of simulated success.
- Rewrote `supabase/functions/studioflow-booking-emails/index.ts` with the same JWT + RLS + stored-recipient model for the Edge fallback. It is **not deployed** in this turn.
- Updated `src/lib/emailService.ts` to send the JWT, avoid double delivery, fall back only from missing/static/unconfigured proxies, and preserve authoritative 4xx errors.
- Added `src/lib/emailFeedback.ts` and updated BookingModal / CustomerBookings / SaaSDashboard so unconfirmed delivery is never shown as “sent/dispatched”.
- Replaced truncated/non-UUID booking reference fallbacks with real booking IDs so the secure endpoint can validate them.

### 3. CSP / deployment contract guard
- Added the previously missing `scripts/verify-security-policy.mjs`.
- Corrected `docs/security/csp.md` Razorpay/Leaflet SRI wording.
- Guarded login/sitemap/static/SPA rewrite order and legacy Node API registrations.

### 4. Permanent local production route smoke
- Added `scripts/verify-production-routes.mjs`: builds must pass first, then it boots `dist/server.cjs` on an ephemeral loopback port and checks prerendered root, login/template handoff, legacy query roots, health/email APIs, JSON API 404 and hashed assets. No provider calls or deployment.

## Validation

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run lint:edge` | PASS |
| `npm test` | PASS — **119/119** offline verification suites |
| `node scripts/verify-booking-email-security.mjs` | PASS — JWT/RLS/recipient binding/escaping/throttle/honest failure; no live email |
| `node scripts/verify-email-client-fallback.mjs` | PASS — JWT header, no double-send, safe fallback, authoritative 4xx |
| `node scripts/verify-production-routes.mjs` | PASS — local production routes/APIs |
| `npm audit --audit-level=low` | PASS — 0 vulnerabilities |
| `git diff --check` | PASS |

## Remaining release gaps (require deployment/credentials/owner decision)

1. **Deploy the reviewed email path**: Vercel adapters and/or `studioflow-booking-emails` Edge Function after quota reset and explicit approval. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` in the target runtime/Edge secrets.
2. **Auth email posture**: `mailer_autoconfirm=true` and no custom SMTP remain. Decide verified-email/SMTP policy before production release; do not change blindly while preserving existing signups.
3. **Distributed email rate limiting**: current throttle is per runtime instance. Add a shared store/RPC if email volume or abuse risk requires it.
4. **Browser/live-provider smoke**: Supabase auth/recovery/invite, Razorpay checkout/webhook/refund, WhatsApp, Resend, maps/embeds, storage uploads and deployed CSP headers still need an approved staging/production browser pass.
5. **Performance/test hygiene**: large template chunks, Zod Rollup annotation warnings, and React test-renderer deprecation/concurrent-provider warnings remain non-fatal follow-ups.
6. **Deployed payment parity**: `studioflow-payments` is active; local source has JWT/webhook/worker checks, but exact deployed ESZIP parity was not fully verified.

## Preservation checklist

- [x] Legacy API paths retained; no route removal.
- [x] Auth callback/recovery/invite/customer/owner entries covered.
- [x] Supabase publishable key only in browser; no service-role bypass added to booking email.
- [x] Existing integration origins retained in CSP guard.
- [x] No production data writes, migrations, Edge deploy, Vercel deploy or push.
- [x] Additive Auth redirect allow-list entries applied; prior entries preserved.
