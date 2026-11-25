# PR #163 — Pre-Merge Readiness Report

**Branch:** `arena/355b1737-studioflow` (base `main` = `cc6342ab3d64077bc9ef22a8a79e32428a7e2ce4`)
**PR head:** `e493d6df964830e1884b9ff1e2a4b8b62146d2a0`
**PR state:** OPEN · `mergeCommit: null` · `mergedAt: null` — **not merged**, nothing pushed to `main`.
**Report date:** 2026-11-25

> This report distinguishes **automated** (in-repo tests/lint/build), **Preview** (Vercel
> preview CI), **live production**, **external** and **manual** results. Environment limits
> and skipped/pending checks are disclosed explicitly.

---

## 1. Verdict

PR #163 is **pre-merge ready on the code/test/script/workflow/doc side**, with **all automated
and Preview CI checks green**. The **only** blockers before merging into `main` are
**external/manual steps that require explicit owner approval** (Supabase migration apply,
Edge-function redeploy, Vercel Production env verification, staging QA, live reachability).
No merge has been performed or requested.

---

## 2. Latest PR #163 checks (run `45635927663`, head `e493d6d`) — ALL GREEN

| Check | Result |
|---|---|
| Deploy preview | ✅ pass (1m2s) |
| Preview Browser E2E (Playwright) | ✅ pass (1m57s) |
| Preview Browser E2E Report | ✅ pass |
| Preview Live SEO Verification | ✅ pass |
| Responsive Marketing Audit Report | ✅ pass |
| Supabase Preview | ⏭ skipping (Supabase branch preview not enabled) |

Workflow run conclusion: **success**. The two checks that previously failed
(`Preview Browser E2E (Playwright)`, `Responsive Marketing Audit Report`) now **pass** after the
root-cause fix in §4.

---

## 3. Automated in-repo verification — PASS

- `npm run lint` (tsc) — clean.
- `npm run lint:edge` (tsconfig.edge) — clean.
- `npm run build` (vite + prerender + esbuild + storefront SSR) — succeeds.
- Full `npm test` — **182/182 verification suites passed** (≈290s, concurrency 2).
  - 3 optional suites skipped (require live/browser access, run in CI only):
    `verify-live-seo-http.mjs`, `verify-nexora-responsive-browser.mjs`, `verify-preview-browser-e2e.mjs`.
- Targeted lead/rate-limit/onboarding/routing/SEO/workflow scripts — all PASS, including the
  new rate-limit **salt-consistency** test and the new responsive **overflow diagnostics** test.

### Audit areas reviewed (all 11 + security report)
`.env.example`, `.github/workflows/preview.yml`, `.github/workflows/production.yml`,
`api/onboarding-copy.ts`, `api/storefront.ts`, `scripts/classify-preview-deploy-error.mjs`,
`scripts/fixtures/storefront-offline-fetch.mjs`, `scripts/parse-sitemap-xml.mjs`,
`scripts/prepare-vercel-production-env.mjs`, `docs/qa/PUBLIC-CONTENT-SEO-AUDIT.md`,
lead-form / Edge function / rate-limit RPC migration & tests, plus
`docs/qa/NEXORA-LANDING-SECURITY-REPORT.md` (SEC-01–SEC-12). All sound; no unverified
editorial/business claims invented.

---

## 4. Root-cause fix applied this session (responsive overflow)

**Symptom:** `Responsive Marketing Audit Report` failed at script line 654 — a no-script
(JS-disabled) SSR document horizontal overflow on a marketing route. The `Preview Browser E2E
(Playwright)` job failed because the responsive-audit step inside it failed (the E2E report
check itself was already green).

**Root cause (exact, reproduced + verified):** The NEXORA Top Salon Jaipur Awards image in
`src/components/PublicHomepage.tsx` renders at its **1600px intrinsic width**. Its parent grid
only defined columns at `lg` (`lg:grid-cols-[1.15fr_0.85fr]`); below `lg` the single **auto**
track expanded to the image's intrinsic width, so the `w-full` image resolved to 1600px and
overflowed the 390px viewport in the no-script SSR document (`documentWidth=1608 > viewportWidth=390`).

**Fix:** Added `grid-cols-1` to the parent grid so the mobile track is
`repeat(1, minmax(0, 1fr))` — container-sized and unable to grow to the image's intrinsic width.
Verified locally with the production SSR build + headless Chromium: grid track = 316px,
image constrained to 316px, `documentWidth = 390` (no overflow) in both script-on and script-off
modes. Commit `e493d6d`.

**Diagnostic-clarity improvement (commit `5a69873`):** The failing check-run previously exposed
only `phase/kind/line`. `scripts/responsive-audit-diagnostics.mjs` now parses the bounded
structural geometry from the no-script overflow assertion and the `preview.yml` publish step
surfaces `documentWidth`, `viewportWidth`, element count and the top overflowing nodes
(tag/class/right/width/overflow-x) in the check-run summary — so the next failure is
self-diagnosing without relying on blocked job logs. Covered by
`scripts/verify-responsive-audit-diagnostics.mjs`.

**Rate-limit salt test (commit `5a69873`):** `scripts/verify-nexora-demo-lead.ts` now asserts the
rate-limit salt is actually honored — a custom salt changes `p_bucket_key` to
`sha256('custom-salt-alpha:192.0.2.7')`, a mismatched salt isolates the bucket, and restoring
the default returns `p_window_seconds === 600`.

---

## 5. Environment limits / skipped checks (disclosed)

- **Sandbox outbound** is restricted to `github.com`, `codeload.github.com`, `api.github.com`,
  `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`. Live HTTPS probes to
  `nexorasalon.online`, `www.nexorasalon.online` and the Vercel preview host all failed
  `SSL_ERROR_SYSCALL` during TLS — **live production reachability not validated from sandbox**.
- **CI log/artifact retrieval blocked:** `gh run view --log-failed` and the Actions job-logs /
  artifact-zip endpoints redirect to Azure blob hosts outside the allowed set and return **EOF**.
  The overflow root cause was therefore obtained by **local reproduction** (production SSR build
  + `@sparticuz/chromium`), not from CI logs.
- **Vercel Production workflow** is gated to `main`; not dispatched or mutated (no authorization).
- **Supabase connector** is read-only for this audit; the migration apply and Edge redeploy are
  manual steps pending owner approval.

---

## 6. Remaining manual / live / external steps (require explicit owner approval)

These are the **only** items blocking an authorized merge. None have been performed.

1. **Apply the Supabase migration** `20261125090000_nexora_lead_rate_limit_rpc.sql` to project
   `zilwgiuiygqqardzutxi`. Confirmed **not applied** — last applied migration is
   `20261124095142` (`public_storefront_security_invoker`). The migration adds the
   `public.landing_lead_rate_limits` table (RLS, service_role-only) and the atomic
   `claim_landing_lead_rate_limit` SECURITY DEFINER RPC.
2. **Redeploy the `submit-landing-lead` Edge function** on `zilwgiuiygqqardzutxi` to pick up the
   PR's updated `index.ts` / `landingLeadRateLimit.ts` (currently ACTIVE v11; verify it matches
   the PR head). Confirm `verify_jwt` and allowed-origins config are correct.
3. **Verify Vercel Production env** `VITE_SUPABASE_URL = https://zilwgiuiygqqardzutxi.supabase.co`
   (and `VITE_SUPABASE_ANON_KEY`, GEMINI, Turnstile keys) before any production deploy.
4. **Staging QA of the lead flow** (post-migration + Edge redeploy): honeypot, `+91` validation,
   429 with actual `Retry-After` seconds, malformed-RPC 503 fail-closed, forwarded-IP/salt
   bucket isolation, pruning of expired rows, Turnstile behavior.
5. **Live production reachability / quality** (external, from a non-restricted network): TLS on
   `nexorasalon.online` / `www.nexorasalon.online`, Core Web Vitals, vanity/query routing,
   `noindex` on marketing routes, directory submissions, Google Search Console + GA, G2/Capterra.
6. **Template 15 inventory** (external asset work): 30 requested images and 6 process videos
   still missing (26 generated images present). Not a code blocker.
7. **Post-merge monitor** the `main` Production workflow and live SEO after merge.

---

## 7. Integrity confirmations

- ✅ No new PR created; updates kept on the existing `arena/355b1737-studioflow` / PR #163.
- ✅ PR #163 **not merged**; `mergeCommit: null`, `mergedAt: null`.
- ✅ Nothing merged or pushed into `main` (`main`/`origin/main` unchanged at `cc6342a`).
- ✅ No merge commands run.
- ✅ No invented authors, listings, reviews, media, or unverified editorial/business claims.
- ✅ Manually edited tagline protected; stale generations aborted/ignored; errors handled safely.
