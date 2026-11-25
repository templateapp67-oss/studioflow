# PR #163 — Pre-Merge Readiness Report

**Branch:** `arena/355b1737-studioflow`
**Base `main`:** rebased onto `7685a3a3b6d987269f5dd2bddb297c087db17e95` (origin/main, = PRs #162/#164/#165)
**PR head:** `996fc98` (rebased stack tip; pre-rebase tip was `c052920`)
**PR state:** OPEN · `mergedAt: null` · **not yet merged** (merge authorized; pending final push + `gh pr merge`)
**Report date:** 2026-11-25

> This report distinguishes **automated** (in-repo tests/lint/build), **Preview** (Vercel
> preview CI), **live production**, **external** and **manual** results. Environment limits
> and skipped/pending checks are disclosed explicitly.

---

## 1. Verdict

PR #163 is **pre-merge ready on the code/test/script/workflow/doc side**. The rebase onto
`origin/main` (`7685a3a`) is **complete**, all conflicts resolved, and the full in-repo suite is
green: **`npm test` → 183/183 verification suites passed** (4 optional live/browser suites
skipped). The merge conflict caused by `main` advancing (§5.1) has been **resolved**.

Remaining before/around the merge:
1. **Push the rebased branch** to `arena/355b1737-studioflow` and run **`gh pr merge`** (normal
   GitHub merge — no new PR, no direct `main` push) — the user authorized merging PR #163.
2. The latest Preview runs (`604`–`606`) **failed on a persistent external Vercel
   preview-deployment quota/rate-limit error**, not a code defect (§2); a confirming Preview run
   is expected after the merge push once Vercel quota is restored.
3. **External/manual steps that require explicit owner approval** after merge (Supabase
   migration apply, Edge-function redeploy, Vercel Production env verification, staging QA,
   live reachability) — §6.

**No merge has been performed yet.** Nothing has been pushed to `main` outside the normal PR
merge flow.

---

## 2. Latest PR #163 checks — Preview CI

| Check | Result |
|---|---|
| Deploy preview | ✅ pass (runs `601` `e493d6d`, `602` `3ace5d7`) |
| Preview Browser E2E (Playwright) | ✅ pass |
| Preview Browser E2E Report | ✅ pass |
| Preview Live SEO Verification | ✅ pass |
| Responsive Marketing Audit Report | ✅ pass |
| Supabase Preview | ⏭ skipping (Supabase branch preview not enabled) |

> **Note (final-head runs):** the head advanced through `69d3454` → `806d488` → `7f7f7ba` →
> `2d4e660` (this report + the production-workflow Edge Function deploy fix and its config/test
> follow-ups, §4.2). Runs `601` (`e493d6d`) and `602` (`3ace5d7`) returned **success**. Run `603`
> (`69d3454`) was **cancelled** (superseded by the next push). Runs `604` (`806d488`), `605`
> (`7f7f7ba`) and **`606` (`2d4e660`, final pre-rebase head)** all **failed**, but every failure is
> **external, not a code defect**: each `Deploy preview` step was classified
> `quota-or-rate-limit` by `scripts/classify-preview-deploy-error.mjs` ("Vercel preview
> deployment failed; Preview verification is blocked … category: quota-or-rate-limit"). The
> changes since the green `602` are a doc, the `main`-gated `production.yml`, `supabase/config.toml`
> and tests — none of which affect the Preview deploy. **This is a persistent Vercel
> preview-deployment quota/rate-limit exhaustion, not a regression.** Manual
> `gh workflow run preview.yml` is **403** (the Actions integration lacks dispatch permission), so
> a confirming run must come from a push. The in-repo code side is independently green: full
> `npm test` **183/183** (§3). The `production.yml` change is covered by
> `scripts/verify-workflow-release-safety.mjs`.

---

## 3. Automated in-repo verification — PASS

- `npm run lint` (tsc) — clean.
- `npm run lint:edge` (tsconfig.edge) — clean.
- `npm run build` (vite + prerender + esbuild + storefront SSR) — succeeds.
- Full `npm test` — **183/183 verification suites passed** (≈336s, concurrency 2).
  - 4 optional suites skipped (require live/browser access, run in CI only):
    `verify-live-seo-http.mjs`, `verify-nexora-interaction-responsiveness.mjs`,
    `verify-nexora-responsive-browser.mjs`, `verify-preview-browser-e2e.mjs`.
- Targeted lead/rate-limit/onboarding/routing/SEO/workflow scripts — all PASS, including the
  rate-limit **salt-consistency** test and the responsive **overflow diagnostics** test.

### Rebase conflict reconciliation (this session)
The rebase onto `7685a3a` produced conflicts in 7 files. All were resolved by keeping `main`'s
refined #162/#164/#165 side (the PR's older/superseded versions were superseded), then a
**fix-forward** commit (`996fc98`) reconciled the PR's tests with `main`'s checkers and re-applied
two refinements that the conflict resolution had dropped:

- **`.github/workflows/preview.yml`** — kept `main`'s `--archive=tgz` deploy **and** re-applied
  the PR's `9b0c472` refinement that drops raw `cat "$deploy_log"` output (failed Preview deploys
  publish only the static classify category). Also kept `main`'s reworked "Capture Vercel runtime
  logs" steps.
- **`scripts/verify-live-seo-http.mjs`** (kept `main`'s checker) — added **sitemap URL
  credential/fragment validation** and **credential redaction** of error messages, the report, and
  stderr (a real safety gap the PR's contract test caught).
- **`scripts/verify-live-seo-contract.mjs`** — aligned the mock with `main`'s checker: multi-agent
  `robots.txt` groups, the 2b vanity-path 404 probe, the `customer_ref` private param, and updated
  robots regression expectations.
- **`scripts/verify-live-seo-report-safety.mjs`** — added the 2b vanity-path 404 probe so the
  checker reaches the private-header step.
- **`scripts/verify-workflow-release-safety.mjs`** — asserts production SEO verification via
  `deploy-production.ps1` (PowerShell) instead of a separate named step.
- Verified: no conflict markers remain in any commit; `submit-landing-lead` deploy
  (`production.yml`) and `[functions.submit-landing-lead]` (`supabase/config.toml`) both survived
  the rebase intact.

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
(Playwright)` job failed because the responsive-audit step inside it failed.

**Root cause (exact, reproduced + verified):** The NEXORA Top Salon Jaipur Awards image in
`src/components/PublicHomepage.tsx` rendered at its **1600px intrinsic width**. Its parent grid
only defined columns at `lg`; below `lg` the single **auto** track expanded to the image's
intrinsic width, so the `w-full` image resolved to 1600px and overflowed the 390px viewport in
the no-script SSR document.

**Fix:** Added `grid-cols-1` to the parent grid so the mobile track is
`repeat(1, minmax(0, 1fr))`. Verified locally with the production SSR build + headless Chromium.
Commit `e493d6d`.

**Diagnostic-clarity improvement (commit `5a69873`):** `scripts/responsive-audit-diagnostics.mjs`
now parses bounded structural geometry from the no-script overflow assertion and the
`preview.yml` publish step surfaces `documentWidth`, `viewportWidth`, element count and top
overflowing nodes. Covered by `scripts/verify-responsive-audit-diagnostics.mjs`.

**Rate-limit salt test (commit `5a69873`):** `scripts/verify-nexora-demo-lead.ts` asserts the
rate-limit salt is honored — a custom salt changes `p_bucket_key`, a mismatched salt isolates the
bucket, and restoring the default returns `p_window_seconds === 600`.

### 4.2 Production Edge Function deploy step covers `submit-landing-lead`

**Gap found:** `.github/workflows/production.yml` had a manual `apply_and_deploy` step that
redeployed the reviewed WhatsApp/payment Edge Functions but **omitted `submit-landing-lead`**, the
function this PR updates with the lead rate-limit/salt hardening.

**Fix:** Added `submit-landing-lead` to the `supabase functions deploy` list in the "Deploy
reviewed Edge Functions" step. `scripts/verify-workflow-release-safety.mjs` asserts the step
exists, runs only in manual `apply_and_deploy` mode, includes
`submit-landing-lead` / `nexora-whatsapp-connect` / `nexora-whatsapp-webhook` /
`studioflow-payments`, and has no `continue-on-error: true`. The step is still manual-only.

**Required config (same fix):** `supabase/config.toml` needed a `[functions.submit-landing-lead]`
section with `verify_jwt = false` (the endpoint is public, validates via honeypot + Turnstile +
salted rate-limit, and carries no Supabase JWT). `verify-production-release-modes.mjs` asserts the
section exists. Both survived the rebase.

---

## 5. Environment limits / skipped checks (disclosed)

- **Sandbox outbound** is restricted to `github.com`, `codeload.github.com`, `api.github.com`,
  `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`. Live HTTPS probes to
  `nexorasalon.online`, `www.nexorasalon.online` and the Vercel preview host all failed
  `SSL_ERROR_SYSCALL` during TLS — **live production reachability not validated from sandbox**.
- **CI log/artifact retrieval blocked:** `gh run view --log-failed` and the Actions job-logs /
  artifact-zip endpoints redirect to Azure blob hosts outside the allowed set and return **EOF**.
- **Vercel Production workflow** is gated to `main`; not dispatched or mutated.
- **Supabase connector** is read-only for this audit; the migration apply and Edge redeploy are
  manual steps pending owner approval.

### 5.1 Rebase onto `main` `7685a3a` — COMPLETE

`origin/main` advanced from `cc6342a` to **`7685a3a`** via merged PRs **#162** (NEXORA Technical
SEO / AI crawler / performance audit), **#164** (production Vercel upload quota + redundant env
write), and **#165** (native Windows PowerShell production deploy). The rebase of
`arena/355b1737-studioflow` onto `7685a3a` is **complete** (29 commits rebased). Conflicts in 7
files were resolved (keeping `main`'s refined side; see §3), and a fix-forward commit
(`996fc98`) reconciled the PR's tests with `main`'s checkers. Full `npm test` → **183/183**.

---

## 6. Remaining manual / live / external steps (require explicit owner approval)

1. ✅ **Rebase/conflict resolution onto `7685a3a`** — **DONE** (§5.1). Branch is ready to push
   and merge.
2. **Push the rebased branch** to `arena/355b1737-studioflow` and **merge PR #163** via the normal
   GitHub merge (`gh pr merge 163 --merge`). No new PR; no direct `main` push.
3. **Apply the Supabase migration** `20261125090000_nexora_lead_rate_limit_rpc.sql` to project
   `zilwgiuiygqqardzutxi`. Confirmed **not applied** — last applied migration is
   `20261124095142`. Adds the `public.landing_lead_rate_limits` table (RLS, service_role-only) and
   the atomic `claim_landing_lead_rate_limit` SECURITY DEFINER RPC.
4. **Redeploy the `submit-landing-lead` Edge function** on `zilwgiuiygqqardzutxi` to pick up the
   PR's updated `index.ts` / `landingLeadRateLimit.ts` (currently ACTIVE v11). Confirm
   `verify_jwt` and allowed-origins config are correct.
5. **Verify Vercel Production env** `VITE_SUPABASE_URL = https://zilwgiuiygqqardzutxi.supabase.co`
   (and `VITE_SUPABASE_ANON_KEY`, GEMINI, Turnstile keys) before any production deploy.
6. **Staging QA of the lead flow** (post-migration + Edge redeploy): honeypot, `+91` validation,
   429 with actual `Retry-After` seconds, malformed-RPC 503 fail-closed, forwarded-IP/salt
   bucket isolation, pruning of expired rows, Turnstile behavior.
7. **Live production reachability / quality** (external, from a non-restricted network): TLS on
   `nexorasalon.online` / `www.nexorasalon.online`, Core Web Vitals, vanity/query routing,
   `noindex` on marketing routes, directory submissions, Google Search Console + GA, G2/Capterra.
8. **Template 15 inventory** (external asset work): 30 requested images and 6 process videos
   still missing (26 generated images present). Not a code blocker.
9. **Post-merge monitor** the `main` Production workflow and live SEO after merge.

---

## 7. Integrity confirmations

- ✅ No new PR created; updates kept on the existing `arena/355b1737-studioflow` / PR #163.
- ✅ PR #163 **not yet merged**; `mergedAt: null`. Merge authorized, pending push + `gh pr merge`.
- ✅ Nothing merged or pushed into `main` by this work. The rebase and all commits stayed on
  `arena/355b1737-studioflow`. `main`/`origin/main` advanced to `7685a3a` **independently** via
  merged PRs #162/#164/#165 — not by this session.
- ✅ No conflict markers remain in any commit on the branch.
- ✅ No invented authors, listings, reviews, media, or unverified editorial/business claims.
- ✅ Manually edited tagline protected; stale generations aborted/ignored; errors handled safely.
