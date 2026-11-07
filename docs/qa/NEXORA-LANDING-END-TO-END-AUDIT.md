# NEXORA SALONOS landing page — end-to-end audit

**Repository:** `templateapp67-oss/studioflow`
**Branch under review:** `arena/a4fea2d2-studioflow`
**Base commit:** `ec061660e61704f190ddb554fe8b524af304f85c` (`main`)
**Scope:** the public marketing surface (`/`, `/pricing`, `/salon-os`), the demo-request flow, the Supabase landing data layer, the auth/plan hand-off and the deployment configuration.

This document records what was inspected, what was verified and what was changed. It is not a claim that the
application is free of defects; it is the evidence trail for the scope that was audited.

---

## 1. Architecture confirmed before editing

| Area | Finding |
|---|---|
| Framework | React 19 + TypeScript + Vite 6, custom Express server (`server.ts`), Tailwind v4, Supabase JS, Framer Motion, Lucide. |
| Routing | `src/AppRouter.tsx` selects `/` → `PublicHomepage`, `/salon-os` → `NexoraSalonLandingPage`, `/pricing` → `NexoraPricingLandingPage`; every other path continues through the full owner/customer application. |
| Build | `npm run build` = Vite build → `scripts/prerender-public.tsx` → esbuild bundle of `server.ts` into `dist/server.cjs`. |
| Tests | `npm test` = `tsc --noEmit` → `tsc -p tsconfig.edge.json` → production build → `scripts/run-all-verifications.mjs` (126 `scripts/verify-*.mjs` suites). |
| Nested app | `veda-sanjeevani/` is a separate application and was not touched. |

## 2. Route ownership after this change (documented canonical strategy)

| Route | Role | Canonical URL | Notes |
|---|---|---|---|
| `/` | Existing public homepage (16 salon website templates). | `https://nexorasalon.online/` | Unchanged. |
| `/pricing` | **Primary** NEXORA SALONOS landing page (16 sections, pricing as a major section). | `https://nexorasalon.online/pricing` | Prerendered document, FAQ + SoftwareApplication JSON-LD. |
| `/salon-os` | **Companion** platform route. Keeps its own URL, title, description and canonical. | `https://nexorasalon.online/salon-os` | Prerendered document. The full feature-by-plan matrix was consolidated onto `/pricing`; the route keeps a `#comparison` section that links to `/pricing#comparison`. |
| `/privacy` | Public privacy notice for the demo-request form. | `https://nexorasalon.online/privacy` | Prerendered, listed in the sitemap once. |
| `/admin/demo-leads` | Manager view of the demo-request register. | not indexed (`noindex` by route policy) | Signed-in managers only; the database policy is the authority. |

No third marketing page was created. Both marketing routes share one design-token file, one section library and
one pricing source of truth (`src/lib/nexoraPricing.ts`).

## 3. Data, security and deployment surfaces inspected

| Surface | Result |
|---|---|
| Supabase project | `zilwgiuiygqqardzutxi` (`https://zilwgiuiygqqardzutxi.supabase.co`), region `ap-northeast-1`, PostgreSQL 17. |
| Landing data layer | 12 tables (`site_settings`, `landing_sections`, `navigation_items`, `business_categories`, `feature_categories`, `features`, `pricing_plans`, `plan_features`, `promotional_creatives`, `testimonials`, `faqs`, `landing_leads`) plus `landing_lead_rate_limits`, `landing_lead_audit`. |
| Row-level security | Enabled on every one of them. `anon` has **no** grant on `landing_leads` / `landing_lead_audit` (verified live with `has_table_privilege`). |
| Manager authorisation | `public.can_manage_landing_leads()` reads `auth.jwt() -> 'app_metadata' ->> 'site_role'`. `user_metadata` is never used for permissions. |
| Edge Function | `submit-landing-lead` (id `a718636b-c5b8-45bb-9ae9-f9737dcec4ff`), **version 7**, `ACTIVE`, `verify_jwt = false`, CORS limited to the production host and the two local development origins. |
| Rate limiting | Database-backed counter in `public.landing_lead_rate_limits` (5 requests / 10 min per salted IP hash) so the limit holds across serverless instances. The raw IP is never stored. |
| Storage bucket | `nexora-public-assets` (public marketing imagery only). No lead data is stored in a bucket. |
| Vercel configuration | `vercel.json` keeps the login, sitemap, static and SPA rewrites and adds the prerendered marketing routes. `api/nexora-demo-lead.ts` and `api/nexora-demo-leads.ts` are real serverless functions, so `/api/nexora-demo-lead` is no longer rewritten to the SPA document. |

## 4. Live checks executed during this change

| Check | Method | Result |
|---|---|---|
| Seed parity | `select count(*)` on every landing table through the management API | `site_settings` 1, `landing_sections` 13, `navigation_items` 28, `business_categories` 7, `feature_categories` 8, `features` 65, `pricing_plans` 4, `plan_features` 3, `promotional_creatives` 8, `testimonials` 0, `faqs` 15, `landing_leads` 0. |
| Approved pricing | `select … from public.pricing_plans order by display_order` | Lite 7,500 · Grow 14,988 · Standard 23,988 (recommended) · Premium 59,988, all `price_monthly = null`, currency INR. |
| Lead persistence | `pg_net` → `submit-landing-lead` | 200 `{ok:true}`, one row written with `consent_given = true`, `privacy_notice_version = 2026-11`, `idempotency_key` stored. |
| Idempotent retry | the same request replayed | 200 `{ok:true}` **and still exactly one row** — the retry collapsed onto the stored lead. |
| Honeypot | `website` field populated | 200 `{ok:true}` and **no** row written. |
| Method guard | `GET` | 405 JSON. |
| Retention | new row | `retention_expires_at` is set 180 days after creation (column default). |
| Privacy of the register | `has_table_privilege('anon', …)` | `select`/`insert` on `landing_leads`: **false**; `select` on `landing_lead_audit`: **false**. |
| Cleanup | `delete … where id = '58daf77f-…'` | `landing_leads` = 0, `landing_lead_audit` = 0. |

## 5. What was verified in the repository

`npm run lint`, `npm run lint:edge`, `npm run build`, `npm run test:wiring` and `npm test` (126 verification
suites) were executed; the results are listed in `NEXORA-LANDING-TEST-REPORT.md`.

## 6. Known limitations carried over

* `scripts/verify-template16-aurelia.mjs` fails on this branch **and** on the untouched base commit — it is a
  pre-existing failure of the Template 16 (Aurelia) content, unrelated to the marketing work. It was reproduced in
  a clean `git worktree` at `ec06166` to prove the origin.
* No browser binary is available in the review environment, so no pixel screenshot, axe-core scan or Lighthouse
  run could be executed here. The accessibility and performance reports state exactly which checks are static
  assertions and which are still outstanding.
* Subscription checkout, monthly billing, add-on prices and CRM credentials are not configured in this
  environment; the pages say so instead of inventing values.
