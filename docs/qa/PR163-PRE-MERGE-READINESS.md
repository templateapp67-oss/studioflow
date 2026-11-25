# PR #163 — Pre-Merge Readiness Report

**Branch:** `arena/355b1737-studioflow` (base `main` at branch time = `cc6342ab3d64077bc9ef22a8a79e32428a7e2ce4`)
**PR head:** `69d3454b75186fc92c2297f5859151ce81fd7d4d` (was `e493d6d` → `3ace5d7` → `69d3454`)
**PR state:** OPEN · `mergeCommit: null` · `mergedAt: null` — **not merged**, nothing pushed to `main`.
**`main` has since advanced** to `7685a3a` (PRs #162, #164, #165); see §5.1 — the PR is now in a **merge conflict** and needs a rebase/resolve before any authorized merge.
**Report date:** 2026-11-25

> This report distinguishes **automated** (in-repo tests/lint/build), **Preview** (Vercel
> preview CI), **live production**, **external** and **manual** results. Environment limits
> and skipped/pending checks are disclosed explicitly.

---

## 1. Verdict

PR #163 is **pre-merge ready on the code/test/script/workflow/doc side**, with all automated
in-repo checks green and Preview runs `601`/`602` green. **Three** things now block an
authorized merge: (1) **`main` advanced** to `7685a3a` while this branch was worked, producing a
real **merge conflict** (§5.1) that requires a rebase/resolve first; (2) the latest Preview run
`604` **failed on an external Vercel preview-deployment quota/rate-limit error**, not a code
defect — a fresh Preview run is needed to confirm green (§2); and (3) **external/manual steps
that require explicit owner approval** (Supabase migration apply, Edge-function redeploy, Vercel
Production env verification, staging QA, live reachability). **No merge has been performed or
requested, and no conflict has been resolved.**

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

> **Note:** the head was advanced to `806d488` (this report + a production-workflow Edge Function
> deploy fix, §4.2) after run `45635927663`. Runs `601` (`e493d6d`) and `602` (`3ace5d7`) returned
> **success**. Run `603` (`69d3454`) was **cancelled** (superseded by the next push). Run `604`
> (`806d488`) **failed**, but the failure is **external, not a code defect**: the `Deploy preview`
> step was classified `quota-or-rate-limit` by `scripts/classify-preview-deploy-error.mjs`
> ("Vercel preview deployment failed; Preview verification is blocked … category:
> quota-or-rate-limit"). The only changes since the green `602` are a doc and the `main`-gated
> `production.yml` + a test, none of which affect the Preview deploy. **A fresh Preview run is
> required to confirm green before merge** — manual `gh workflow run preview.yml` is **403**
> (the Actions integration lacks dispatch permission), so a re-run must come from a new push to
> the branch. The `production.yml` change is covered by `scripts/verify-workflow-release-safety.mjs`.

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

### 4.2 Production Edge Function deploy step now covers `submit-landing-lead` (this session)

**Gap found:** `.github/workflows/production.yml` had a manual `apply_and_deploy` step that
redeployed the reviewed WhatsApp/payment Edge Functions but **omitted `submit-landing-lead`**, the
function this PR updates with the lead rate-limit/salt hardening. Without redeploying it, the
PR's updated Edge function would never reach production after merge — the production DB would get
the new RPC while the function kept running the stale bundle.

**Fix:** Added `submit-landing-lead` to the `supabase functions deploy` list in the "Deploy
reviewed Edge Functions" step (rename from "Deploy reviewed WhatsApp Edge Functions" to reflect
the wider scope). `scripts/verify-workflow-release-safety.mjs` now asserts that step exists, runs
only in manual `apply_and_deploy` mode, includes `submit-landing-lead` / `nexora-whatsapp-connect` /
`nexora-whatsapp-webhook` / `studioflow-payments`, and has no `continue-on-error: true`. The step
is still manual-only and never mutates production on a plain `main` push.

**Required config (same fix):** Because `submit-landing-lead` is now deployed via
`supabase functions deploy`, `supabase/config.toml` needed a `[functions.submit-landing-lead]`
section. It was absent, so the CLI would have deployed it with the gateway default
`verify_jwt = true` and rejected every genuine browser form submit. Added the section with
`verify_jwt = false` (the endpoint is public, validates via honeypot + Turnstile + salted
rate-limit, and carries no Supabase JWT — matching its current runtime). `verify-production-release-modes.mjs`
now asserts the section exists. The two release-plan tests that referenced the old step name were
updated to the renamed step.

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

### 5.1 `main` advanced — PR is now in a merge conflict (status change this session)

While this branch was worked, `origin/main` advanced from `cc6342a` to **`7685a3a`** via three
merged PRs: **#162** (NEXORA Technical SEO / AI crawler / performance audit), **#164** (production
Vercel upload quota + redundant env write), and **#165** (native Windows PowerShell production
deploy). The merge-base is still `cc6342a`, so `git merge-tree origin/main HEAD` reports
**content conflicts in 7 files**:

`.github/workflows/production.yml`, `scripts/prerender-public.tsx`,
`scripts/verify-live-seo-http.mjs`, `scripts/verify-nexora-ecosystem-routes.mjs`,
`scripts/verify-security-policy.mjs`, `scripts/verify-vercel-production-env.mjs`, `vercel.json`.

This is why GitHub reports PR #163 `mergeable: CONFLICTING`. **This is expected** — `main` moved
while the branch was active — and it is **not** a defect in this branch's code. Per the
instructions, **no conflict was resolved and no rebase was performed**: resolving the conflict and
rebasing onto `7685a3a` is pre-merge work that must be approved and is not done here. The
`production.yml` conflict is directly caused by #165 also touching that file (the PowerShell deploy
rework); the §4.2 Edge Function deploy fix will need to be re-applied/re-integrated during that
rebase.

---

## 6. Remaining manual / live / external steps (require explicit owner approval)

These are the **only** items blocking an authorized merge. None have been performed.

1. **Resolve the merge conflict / rebase onto `main` `7685a3a`** (see §5.1). `main` advanced
   while this branch was active, so PR #163 is `mergeable: CONFLICTING` in 7 files. Rebase
   `arena/355b1737-studioflow` onto `7685a3a`, resolve the conflicts, re-run full verification
   and the Preview workflow, and re-integrate the §4.2 `submit-landing-lead` deploy change into
   the reworked `production.yml` from #165. **Not done here** — requires approval.
2. **Apply the Supabase migration** `20261125090000_nexora_lead_rate_limit_rpc.sql` to project
   `zilwgiuiygqqardzutxi`. Confirmed **not applied** — last applied migration is
   `20261124095142` (`public_storefront_security_invoker`). The migration adds the
   `public.landing_lead_rate_limits` table (RLS, service_role-only) and the atomic
   `claim_landing_lead_rate_limit` SECURITY DEFINER RPC.
3. **Redeploy the `submit-landing-lead` Edge function** on `zilwgiuiygqqardzutxi` to pick up the
   PR's updated `index.ts` / `landingLeadRateLimit.ts` (currently ACTIVE v11; verify it matches
   the PR head). Confirm `verify_jwt` and allowed-origins config are correct.
4. **Verify Vercel Production env** `VITE_SUPABASE_URL = https://zilwgiuiygqqardzutxi.supabase.co`
   (and `VITE_SUPABASE_ANON_KEY`, GEMINI, Turnstile keys) before any production deploy.
5. **Staging QA of the lead flow** (post-migration + Edge redeploy): honeypot, `+91` validation,
   429 with actual `Retry-After` seconds, malformed-RPC 503 fail-closed, forwarded-IP/salt
   bucket isolation, pruning of expired rows, Turnstile behavior.
6. **Live production reachability / quality** (external, from a non-restricted network): TLS on
   `nexorasalon.online` / `www.nexorasalon.online`, Core Web Vitals, vanity/query routing,
   `noindex` on marketing routes, directory submissions, Google Search Console + GA, G2/Capterra.
7. **Template 15 inventory** (external asset work): 30 requested images and 6 process videos
   still missing (26 generated images present). Not a code blocker.
8. **Post-merge monitor** the `main` Production workflow and live SEO after merge.

---

## 7. Integrity confirmations

- ✅ No new PR created; updates kept on the existing `arena/355b1737-studioflow` / PR #163.
- ✅ PR #163 **not merged**; `mergeCommit: null`, `mergedAt: null`.
- ✅ Nothing merged or pushed into `main` by this work. `main`/`origin/main` advanced to
  `7685a3a` **independently** via merged PRs #162/#164/#165 (see §5.1) — not by this session,
  which only committed/pushed to `arena/355b1737-studioflow`.
- ✅ No merge commands run and no conflict resolved.
- ✅ No invented authors, listings, reviews, media, or unverified editorial/business claims.
- ✅ Manually edited tagline protected; stale generations aborted/ignored; errors handled safely.
