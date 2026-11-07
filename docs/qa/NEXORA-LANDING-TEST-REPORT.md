# NEXORA SALONOS landing page — test report

**Branch:** `arena/a4fea2d2-studioflow` · **Base:** `ec061660e61704f190ddb554fe8b524af304f85c`
**Date of this run:** 7 November 2026

Every command below was executed in the review environment. Results are copied from the actual output; nothing is
reported as passing that was not run.

---

## 1. Commands executed

| Command | Result |
|---|---|
| `npm ci` | exit 0 (dependencies restored from the lockfile) |
| `npm run lint` (`tsc --noEmit`) | **pass**, no diagnostics |
| `npm run lint:edge` (`tsc -p tsconfig.edge.json --noEmit`) | **pass**, no diagnostics |
| `npm run build` | **pass** — Vite build, prerender of the public homepage, `/salon-os`, `/pricing`, `/privacy` and the 16 template pages, then the `dist/server.cjs` bundle |
| `npm run test:wiring` | **pass** — "all 14 storefronts open themed customer bookings without redirect …" |
| `npm test` | **130 of 130** verification suites pass, exit code 0 (see §3) |
| `node scripts/run-all-verifications.mjs` | same set as `npm test` |
| `npm audit` | **0 vulnerabilities** (with and without `--omit=dev`) |
| `npm run test:debug` | `node scripts/verify-debug-boundary.mjs` — part of the suite above |
| GitHub Actions on the pull request | "High and critical dependency audit" **pass**; "TypeScript, build and complete offline verification" runs `npm test` and is **green** after the Aurelia suite fix below (before the fix it failed on `main` for the base commit `ec06166` too, run `42344849000`) |
| Vercel preview deployment | **built** — `https://studioflow-git-arena-a4fea2d2-c3ab7a-templateapp67-oss-projects.vercel.app` (status *Ready*). It cannot be requested from this environment (`*.vercel.app` is outside the sandbox's outbound allowlist), so the preview smoke test is still outstanding. |
| `npm run test:live` | **not run** — needs a configured test project with email autoconfirm and network access to `*.supabase.co`, which the review environment does not have. The live behaviour that *was* executed is listed in §4. |

## 2. Suites added or changed for this work

| Suite | What it proves | Result |
|---|---|---|
| `scripts/verify-nexora-pricing-landing.mjs` | `/pricing` renders the complete page: section order and unique ids, the approved annual prices (625/7,500 · 1,249/14,988 · 1,999/23,988 · 4,999/59,988), the complete comparison matrix (65 catalogue features, 8 groups), honest add-ons, 15 FAQ entries, the CTA contract, the JSON-LD blocks, the prerendered document and the demo endpoint wiring | **PASS** |
| `scripts/verify-nexora-demo-lead.mjs` | The shared handler stores a valid lead, rejects invalid input and missing consent, honours the honeypot, refuses other methods, maps 429/5xx/unconfigured storage, keeps a failing CRM sink from losing the lead, forwards the idempotency key, records the CRM delivery state and never logs personal data or credentials | **PASS** |
| `scripts/verify-nexora-lead-submission-client.mjs` | The browser accepts only a confirmed JSON `{ ok: true }`; SPA HTML, an empty body, malformed JSON, `ok:false`, 429, 5xx, a failed transport, a timeout and a network error are all failures | **PASS** |
| `scripts/verify-nexora-link-integrity.mjs` | 74 internal links and 79 in-page anchors across the four prerendered documents resolve to real routes and rendered ids; no placeholder, empty or `javascript:` link exists | **PASS** |
| `scripts/verify-nexora-env.mjs` | A malformed project URL and a privileged key in a browser variable are rejected, a project override is reported by host only, no browser source reads `SUPABASE_SERVICE_ROLE_KEY`, and every environment variable name is documented | **PASS** |
| `scripts/verify-nexora-admin-leads.mjs` | The lead register is private: anonymous and non-manager callers are refused, a self-declared `user_metadata` role grants nothing, export and erasure require a manager, the audit trigger and the retention purge live in a private schema | **PASS** |
| `scripts/verify-nexora-salon-landing.mjs` (updated) | The companion route keeps its structure, its pricing summary and its anchors, and no longer repeats the comparison matrix | **PASS** |
| `scripts/verify-nexora-pricing.mjs` (updated) | The pricing modules, the approved totals, the fail-closed entitlement map, the quote-only add-ons, the demo-lead security posture, the auth-resumed selection and the responsive breakpoints | **PASS** |
| `scripts/verify-security-policy.mjs` (updated) | The CSP still matches the runtime integrations and the login/sitemap/static/SPA rewrites plus the prerendered marketing routes are preserved | **PASS** |
| `scripts/verify-sql-migrations.mjs` (updated) | The 57 backend migrations and the six NEXORA landing migrations apply in order; every client table has RLS (42 tables now) | **PASS** |

## 3. Suite result of the full run

```
130/130 verification suites passed.
```

### The one suite that was failing — and how it was fixed

`verify-template16-aurelia.mjs` was the only red suite. It asserted that the Aurelia review card contains
`Booked: ${serviceName}` — the **template-literal** spelling. PR #88 moved the Aurelia cards out of
`AureliaBeautyWebsite.tsx` into the shared `CustomerReviewPanel.tsx`, where the same tag is rendered as **JSX
text**: `<span>Booked: {serviceName}</span>`. The rendered output is identical; only the source spelling changed, and
the source-contract assertion was never updated. The failure was reproduced in a clean `git worktree` at the base
commit `ec06166`, which confirmed that no product code was broken.

The fix (commit `fix(tests): align the Aurelia booked-service assertion with the shared review panel`):

1. The assertion now requires the tag **inside the Aurelia card markup** and accepts either spelling —
   `Booked: ${serviceName}` (template literal) or `Booked: {serviceName}` (JSX text) — so neither spelling can
   silently disappear again.
2. A **render-level** check was added: `scripts/verify-template16-aurelia-review-cards.tsx` renders the shared panel
   for `businessType="aurelia_beauty_parlour"` with `renderToStaticMarkup` and asserts what a visitor actually
   sees — `Booked: Radiance Facial`, `Booked: Signature Cut & Finish`, `Location not shared` for a missing
   location, the announced five-star rating, the template tag and the avatar fallback — and that no placeholder or
   demo card is rendered. The suite bundles and runs it (the same esbuild pattern the other React suites use), so the
   number of verification suites is unchanged.
3. The fix was proven to be meaningful: removing the booked-service tag from the component makes the suite fail
   again (verified by temporarily mutating the component and restoring it afterwards).

No suite was disabled, skipped or weakened, and no product behaviour was changed to obtain the green build.

Every NEXORA suite passes: `verify-nexora-pricing-landing`, `verify-nexora-pricing`, `verify-nexora-salon-landing`,
`verify-nexora-demo-lead`, `verify-nexora-lead-submission-client`, `verify-nexora-env`,
`verify-nexora-admin-leads`, `verify-nexora-link-integrity`, `verify-sql-migrations`, `verify-security-policy`.

## 4. Live checks executed against the Supabase project

| Check | How | Result |
|---|---|---|
| Seed parity | management API, `count(*)` per landing table | site_settings 1 · landing_sections 13 · navigation_items 28 · business_categories 7 · feature_categories 8 · features 65 · pricing_plans 4 · plan_features 3 · promotional_creatives 8 · testimonials 0 · faqs 15 · landing_leads 0 |
| Approved pricing | `select … from pricing_plans` | Lite 7,500 · Grow 14,988 · Standard 23,988 (recommended) · Premium 59,988; `price_monthly` is `null` for every plan |
| Lead storage | `pg_net` → `submit-landing-lead` (request 20547) | `200 {"ok":true,…}` and exactly one row with consent, the notice version and the idempotency key |
| Idempotent retry | identical request (20548) | `200 {"ok":true,…}` and **still one row** |
| Honeypot | request 20549 | `200 {"ok":true,…}` and **no row** |
| Method guard | request 20550 | `405` JSON |
| Retention | new row | `retention_expires_at` = created + 180 days |
| Register privacy | `has_table_privilege('anon', …)` | `select`/`insert` on `landing_leads`: false · `select` on `landing_lead_audit`: false |
| Cleanup | `delete … where id = '58daf77f-7b8c-4d84-b615-86f5431ad5f1'` | `landing_leads` = 0 · `landing_lead_audit` = 0 |

One defect was found and fixed by these probes: the first upload of the Edge Function (v6) was missing the
`ALLOWED_PAGE_PREFIXES` constant and answered `500 Internal Server Error`. The source was corrected (v7) and the
probes were repeated successfully — the failing request id is recorded above.

## 5. Browser QA (executed)

A headless browser **was** obtained and run in this environment: **Chromium 153.0.8010.0** from
`@sparticuz/chromium` (extracted locally), driven by **puppeteer-core 25.16.0**, with **axe-core 4.14.0** for the
accessibility rule set. The preview server under test was the **production build**
(`npm run build` → `NODE_ENV=production node dist/server.cjs`, port 3210), i.e. the prerendered documents the
deployment serves. The same suite was also run against the development shell; the numbers in the table are the
production-build ones.

| Check | How | Result |
|---|---|---|
| axe-core (WCAG 2.0/2.1/2.2 A + AA) on `/pricing`, `/salon-os`, `/privacy` at 1440×900 and 390×844 | `axe.run(document)` on a fully rendered page | **0 violations in all 6 runs** — raw output in `docs/qa/screenshots/axe-and-metrics.json` |
| Horizontal overflow | `documentElement.scrollWidth` vs `clientWidth`, plus `window.scrollTo(500, 0)` | **no page-level horizontal scroll** at 320, 360, 375, 390, 411, 425, 480, 600, 767, 820, 921, 1024, 1280 and 1440 px; the comparison matrix stays inside its own scroll region and remains swipeable |
| Layout stability | `PerformanceObserver` for `layout-shift` | CLS ≤ **0.006** on every route and viewport |
| Largest contentful paint | `PerformanceObserver` for `largest-contentful-paint` | **100–448 ms** against the production build (target ≤ 2.5 s) |
| Screenshots | `page.screenshot()` at 1440×900 and 390×844 | `docs/qa/screenshots/*.png` (after) and `docs/qa/screenshots/before-*.png` (base commit `ec06166`) |
| Before/after comparison | the base commit was built in a temporary `git worktree`, served on port 3211 and captured with the same script | `/salon-os` before: 10 sections + duplicated matrix; after: 14 sections, matrix moved to `/pricing` (pointer only). `/pricing` before: the old 8-section `PricingPage`; after: the 15-section landing page with the canonical plan comparison |

The browser pass found **seven real defects** (four contrast failures, one accessible-name mismatch, one landmark
violation and one horizontal-overflow leak). All seven were fixed and the scan was repeated until it was clean —
the defect list and the fix for each one are in
[`NEXORA-LANDING-ACCESSIBILITY-REPORT.md`](NEXORA-LANDING-ACCESSIBILITY-REPORT.md#3-defects-the-browser-pass-found--and-the-fixes).

### Reproducing the browser pass

```bash
npm run build
PORT=3210 node dist/server.cjs            # preview server for the built output
node /tmp/shotkit/shoot.mjs                # axe + LCP/CLS + screenshots -> docs/qa/screenshots/
```

## 6. Not executed (with the reason)

| Check | Reason | Next action |
|---|---|---|
| Lighthouse (performance / accessibility / SEO category scores) | the local run measures the raw metrics (LCP/CLS/FCP) with axe-core, not the Lighthouse scoring model, and there is no throttled profile | run Lighthouse (mobile profile) against the Vercel preview deployment of `/pricing` and attach the report |
| Keyboard walk-through and screen-reader pass (NVDA/VoiceOver) | needs a person and an assistive technology; the static ARIA assertions and the axe scan do run | manual pass before release |
| `npm run test:live` | needs a configured test project with email autoconfirm and network access to `*.supabase.co` | run in the connected staging project |
| Razorpay subscription checkout test | subscription checkout is deliberately not configured; booking deposits stay untouched | out of scope until a subscription backend is approved |
