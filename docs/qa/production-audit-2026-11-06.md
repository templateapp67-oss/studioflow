# StudioFlow production audit continuation — 2026-11-06

Baseline: `main` / merge commit `dfd03cb92dee14a2f2fccae5938cdd4fb7d02630` (PR #79, merged 2026-11-06 10:10:06 UTC).
Working branch: `arena/478e03fa-studioflow`.

**Deployment status: not deployed.** No Vercel deploy/redeploy, Supabase migration, Edge Function deploy, auth-config mutation, or production data write was performed. Draft PR #80 was inspected for context and left untouched.

## 1. Vercel check investigation

The failed GitHub status is a **Vercel deployment quota rejection**, not evidence of a TypeScript/Vite compile failure.

| Evidence | Result |
|---|---|
| PR #79 feature commit `7621deea661c4450959a8d9a9590710cbc111674` | Vercel status `success` at 09:49:23 UTC; preview deployment completed. |
| PR #79 head commit `54a1c4ecb40cbbd30d1418289a93c4a46b203630` | Vercel status `failure` at 10:09:42 UTC: “Deployment rate limited — retry in 24 hours.” |
| Merge commit `dfd03cb92dee14a2f2fccae5938cdd4fb7d02630` | Vercel status `failure` at 10:10:09 UTC; same rate-limit description. |
| Vercel bot comment on PR #79 | `Resource is limited - try again in 24 hours (more than 100, code: "api-deployments-free-per-day").` |
| Draft PR #80 head check | Also rate-limited at 10:10:17 UTC. |

Source links:

- <https://github.com/templateapp67-oss/studioflow/pull/79>
- <https://github.com/templateapp67-oss/studioflow/commit/dfd03cb92dee14a2f2fccae5938cdd4fb7d02630/checks>
- Vercel quota target reported by the check: `https://vercel.com/templateapp67-oss-projects?upgradeToPro=build-rate-limit`

### Interpretation

- The authoritative error code is `api-deployments-free-per-day`; Vercel reports the free-plan daily deployment threshold was exceeded.
- The same PR had a successful preview build minutes earlier, and the local production build passes on the merged tree. The red merge check therefore does not establish a source/build regression.
- GitHub shows 19 commits on `main` since 00:00 UTC plus multiple PR/branch deployment attempts around the merge window. That is consistent with quota pressure, but GitHub metadata alone is **not** an exact Vercel deployment counter; the Vercel dashboard/billing usage view is the authoritative place to confirm the reset window and account/team scope.
- Retrying the same merge commit immediately, pushing empty commits, or redeploying repeatedly will not fix the quota and may consume more attempts after reset.

### Recommended operator actions (not performed)

1. Check the Vercel team/project usage and quota reset time before any retry.
2. Batch audit fixes into one reviewed change set instead of one deployment per small edit.
3. If audit branches must keep receiving pushes, consider pausing automatic Git deployments or adding a carefully scoped ignored-build step **only after owner approval**; do not silently disable production deployments.
4. Use non-deploying CI/local verification for audit iterations. A plan upgrade is an owner/billing decision, not an automatic remediation.
5. After quota reset and explicit release approval, deploy once and run the browser/live-provider smoke checklist below.

## 2. Local validation on the merged baseline and audit patch

Environment: Node `v22.22.3`, npm `10.9.8`, clean `npm ci` from the committed lockfile.

| Check | Result |
|---|---|
| Baseline `npm test` on PR #79 merge tree | PASS — lint, edge lint, production build, prerender, **115/115** offline suites. |
| Final `npm test` after this audit patch | PASS — lint, edge lint, production build, prerender, **116/116** offline suites. |
| `npm audit --audit-level=low` | PASS — 0 vulnerabilities. |
| `git diff --check` | PASS. |
| Local production Express smoke (`node dist/server.cjs`, ephemeral port) | PASS — prerendered `/`, `/login?auth=signup&template=hair_salon&create=1`, `/template-pages/hair-salon.html`, legacy query roots (`?site=`, `?app=`, `?category=`, `?passwordUpdated=`, `?error_code=`), `/api/health`, unknown `/api/*` JSON 404, and hashed `/assets/main-*.js`. |

Build non-fatal warnings remain: Rollup chunk-size warnings (notably `SalonWebsitePreview`, `previewStyleSync`, `PrismChromaEditor`), two Zod `@__PURE__` annotation comments Rollup strips, and React test-renderer deprecation/concurrent-provider warnings in offline suites. These are follow-up performance/test-hygiene items, not build failures.

## 3. Compatibility fixes made locally

Goal: preserve auth, integrations, valid routes and legacy APIs while keeping the lightweight public homepage.

- Added `src/lib/authEntry.ts` as the shared source of truth for auth callback query/fragment keys.
- `src/AppRouter.tsx` and `src/App.tsx` now agree on auth callback/error entries, including `error_code` and the legacy `passwordUpdated=1` post-recovery redirect. This prevents callback/error URLs from being swallowed by the prerendered marketing homepage.
- Restored legacy `?category=…` template entry to the full-application route list.
- Extended `scripts/verify-public-homepage.tsx` with a route/auth regression matrix and post-recovery success-state coverage.
- Added the previously referenced but missing `scripts/verify-security-policy.mjs`. It checks the enforcing CSP against actual Supabase/Razorpay/Leaflet/font/media integrations, rejects unsafe script directives, and guards login/sitemap/static/SPA rewrites plus legacy Node API registrations.
- Corrected `docs/security/csp.md`: Leaflet is pinned with SRI; Razorpay Checkout is a dynamic vendor script allowed by host without SRI. The previous “both with SRI” claim was inaccurate.

No API path, request/response contract, Supabase client key, payment flow, or integration origin was removed.

## 4. Read-only hosted Supabase observations

Project inspected through the connected Supabase integration: `zilwgiuiygqqardzutxi` (“NEW FINAL TEMLETE APP”). Only list/get/health/config/catalog-metadata reads were used.

### Healthy / positive observations

- Project status `ACTIVE_HEALTHY`; reported service health checks returned healthy for auth, db, pooler, realtime, rest, storage and pg_bouncer.
- Auth email sign-in/sign-up is enabled; refresh-token rotation is enabled with a 10-second reuse interval.
- Catalog metadata query: **24/24** public `studioflow%` tables have RLS enabled. Five have zero policies but also no `anon`/`authenticated` direct SELECT/INSERT/UPDATE/DELETE grants, consistent with RPC-only/private access rather than an open table. This is not a substitute for cross-tenant RPC tests.
- `studioflow-payments` is deployed and active. Its platform `verify_jwt=false` is compatible with webhook/worker entry only if internal authentication remains enforced; local source checks JWT/webhook signature/worker token. The deployed function body was returned as a truncated ESZIP, so exact deployed-source parity was **not** fully verified.

### Release blockers / configuration gaps

1. **Auth redirect origin mismatch (P1).**
   - Public canonical origin in code: `https://studioflow-ashen-pi.vercel.app`.
   - Hosted Auth `site_url`: `https://studioflow-templateapp67-oss-projects.vercel.app/`.
   - The returned redirect allow-list does not include the canonical `studioflow-ashen-pi.vercel.app` origin. `AuthPage` builds `redirectTo`/`emailRedirectTo` from `location.origin`, so confirmation/recovery links opened on the canonical domain can fall back to the wrong site URL or be rejected.
   - Required owner-approved fix: confirm domain ownership, add the canonical origin/path patterns to the Auth redirect allow-list, and align `site_url` with the intended public origin. **Not changed in this audit.**

2. **Email verification / delivery posture (P1).**
   - Hosted `mailer_autoconfirm=true`, no custom SMTP host configured, and the built-in email send rate is reported as 2. This is not a production-ready verified-email posture.
   - `studioflow-booking-emails` is present in repository source but absent from the deployed Edge Function list. On static Vercel hosting the Node `/api/send-booking-email` route is not served by `server.ts`; the client fallback therefore depends on a function that is not currently deployed.
   - The Node and Edge booking-email source paths still need a reviewed authentication/authorization model, verified recipient/booking binding, distributed rate limiting, safe HTML escaping, and honest unconfigured/simulated delivery semantics. Do not deploy the current email path blindly, and do not “fix” it by breaking guest booking or owner reminder flows.
   - Some UI strings still say “dispatched/sent” when a provider result is not confirmed delivered; make delivery feedback explicit before release.

3. **Browser/live-provider enforcement unverified (P1 release gate).**
   - CSP is present in `vercel.json`, but no deployed-response or browser console verification was possible under the no-deploy constraint.
   - Supabase auth/recovery/invite, Razorpay checkout/webhook/refund, WhatsApp, Resend, maps/embeds and storage uploads need staging/browser smoke tests after an approved deployment.

## 5. Preservation checklist

- [x] PR #79 merge state respected; no merge/revert/deploy performed.
- [x] Auth callback, recovery, invite/customer/owner entry and legacy query routes covered by regression checks.
- [x] Legacy Node API registrations retained: health, generate-bio, generate-promo-image, generate-promo-copy, veda-website-content, ai-recommendations, email-service-status, send-booking-email.
- [x] `/login`, `/sitemap.xml`, static-file and SPA rewrite order guarded.
- [x] Supabase, Razorpay, Leaflet/unpkg, Google Fonts, OpenStreetMap and known media/embed origins retained in CSP checks.
- [x] No production secrets, service-role keys, or customer data added to the repository.
- [ ] Owner-approved Auth redirect/SMTP/autoconfirm remediation.
- [ ] Reviewed booking-email security + delivery deployment plan.
- [ ] Quota-aware, explicitly approved deployment and live smoke tests.
