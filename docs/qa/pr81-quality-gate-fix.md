# PR #81 — quality-gate failure: diagnosis and fix

**PR:** [#81 — fix: StudioFlow production autopsy and public access hardening](https://github.com/templateapp67-oss/studioflow/pull/81)
**Branch:** `fix/studioflow-production-autopsy-2026-11-06` @ `d308ccfc2e8442fa380f587ad1c13198ec85841a`
**Failing run:** [42215419861](https://github.com/templateapp67-oss/studioflow/actions/runs/42215419861/job/127884571355) — `TypeScript, build and complete offline verification`, 5m48s
**Patch:** [`pr81-sitemap-origin.patch`](pr81-sitemap-origin.patch) — applies cleanly to `d308ccf` with `git apply -p1`

> This document and the patch live on `arena/478e03fa-studioflow` (PR #82) as deliverables. They are **not** applied to this branch — PR #81 is a different branch, so the fix has to be applied there.

---

## 1. Diagnosis — reproduced, not guessed

The failing job dies in step 5, `Run full project test suite` (`npm test`). Because the raw CI log host is not reachable from this sandbox, PR #81's exact head commit was extracted with `git archive` into a scratch directory, `node_modules` linked in, and the whole gate run locally. Every step was checked separately:

| Step | Result on PR #81 as-is |
| --- | --- |
| `npm run lint` (root `tsc --noEmit`) | **PASS** |
| `npm run lint:edge` | **PASS** |
| `npm run build` (Vite + prerender + esbuild server) | **PASS** |
| `node scripts/run-all-verifications.mjs` | **FAIL — 114/115** |

Exactly one suite fails:

```
FAIL verify-gap-completion.mjs (0.3s)

AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:
  assert.ok(xml2.includes("https://clinic.example/?site=real-clinic"))
```

Source: `scripts/verify-gap-completion.tsx:118`.

### Your three suspects are all clean

| Suspect | Verdict |
| --- | --- |
| `React.lazy` for 18 editor modules in `SalonWebsitePreview` (`b1d46fa`) | **Not the cause.** Root and edge `tsc` pass, the production build passes, and the split works — `SalonWebsitePreview` went from one eager bundle to a 1.07 MB shell plus separate chunks per editor. No missing-`Suspense` or default-export type error. |
| New SEO assertions rejecting the Vercel preview host | **Not the cause.** `verify-public-homepage.mjs` **passes** (1.3s) on PR #81 as-is. |
| JSON-LD `<script>` matcher | **Not the cause.** The `/<script type="application\/ld\+json">([\s\S]*?)<\/script>/` match and `JSON.parse` both succeed; `homepageSchema.url` equals the production origin. |

The 5m48s duration is itself the clue: a `tsc` error would fail in ~30s. Lasting nearly six minutes means the run got all the way through lint, edge lint and build, and failed near the end of the offline suites.

---

## 2. Root cause — two contracts in the same PR that contradict each other

PR #81 changed `server/sitemap.ts`:

```diff
-  const origin = canonicalOrigin(env.SITE_URL || env.VITE_SITE_URL || NEXORA_PUBLIC_ORIGIN);
+  // Sitemap URLs are production canonicals; preview deployment variables must never override them.
+  const origin = canonicalOrigin(NEXORA_PUBLIC_ORIGIN);
```

That satisfies the assertion the PR **added** to `verify-public-homepage.tsx`:

```ts
const generatedSitemap = await generateSitemap({ SITE_URL: 'https://studioflow-ashen-pi.vercel.app', … });
assert.ok(!generatedSitemap.includes('vercel.app'), 'generated sitemap ignores preview-host environment overrides');
```

…but it breaks the **pre-existing** assertion in `verify-gap-completion.tsx`, which the PR did not touch:

```ts
const xml = await generateSitemap({ SITE_URL: "https://clinic.example" }, fetcher);
assert.ok(xml.includes("https://clinic.example/?site=real-clinic"));
```

Hardcoding the origin means `SITE_URL` is ignored for *every* value, not just preview hosts. So the sitemap can no longer describe a published salon on its own custom domain — which is a real product requirement, not just a test artifact.

**The old test is right and the new test is right.** The implementation is what's wrong: it throws away a legitimate capability in order to block an illegitimate one.

---

## 3. The fix

Filter by *host type* instead of discarding configuration:

- a real custom domain in `SITE_URL` / `VITE_SITE_URL` → **honoured**;
- a preview or local host (`*.vercel.app`, `*.netlify.app`, `*.pages.dev`, `*.github.io`, `localhost`, …) → **rejected**, falls back to `NEXORA_PUBLIC_ORIGIN`;
- a malformed origin → **still throws**, exactly as before, surfacing as the handler's 503 rather than a silently wrong sitemap.

New exported helpers in `server/sitemap.ts`:

```ts
const EPHEMERAL_HOST_SUFFIXES = [
  "vercel.app", "netlify.app", "pages.dev", "github.io",
  "localhost", "127.0.0.1", "nip.io", "sslip.io",
];

export function isEphemeralOrigin(origin: string): boolean {
  const host = new URL(origin).hostname.toLowerCase();
  return EPHEMERAL_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith("." + suffix),
  );
}

export function sitemapOrigin(env: NodeJS.ProcessEnv = process.env): string {
  for (const candidate of [env.SITE_URL, env.VITE_SITE_URL]) {
    if (!candidate) continue;
    const origin = canonicalOrigin(candidate);
    if (!isEphemeralOrigin(origin)) return origin;
  }
  return canonicalOrigin(NEXORA_PUBLIC_ORIGIN);
}
```

and in `generateSitemap`:

```ts
const origin = sitemapOrigin(env);
```

Both entry points get it for free — `api/sitemap.ts` is just `export { sitemapHandler as default } from "../server/sitemap"`, and Express uses the same handler.

The patch also adds assertions to `scripts/verify-public-homepage.tsx` that lock **both halves** of the contract, so this cannot regress in either direction again: preview hosts fall back, custom domains stay configurable, `SITE_URL` preview → `VITE_SITE_URL` custom fall-through works, no-config uses the canonical, malformed still throws, and a custom-domain sitemap contains `https://clinic.example/?site=real-clinic` without mixing in the platform canonical.

### Apply it

```bash
git checkout fix/studioflow-production-autopsy-2026-11-06
git pull --ff-only
git apply --check -p1 docs/qa/pr81-sitemap-origin.patch   # dry run
git apply -p1 docs/qa/pr81-sitemap-origin.patch
```

If you don't have the patch file locally, copy it from this directory first, or use `curl`/download from the PR #82 files tab. `git apply --check` was verified against `d308ccf` and the result is byte-identical to the tree that was tested below.

---

## 4. Exact local commands (no Vercel deploy needed)

`npm test` is the whole gate — the workflow runs nothing else:

```yaml
- name: Run full project test suite
  run: npm test
```

```bash
# 0. clean, locked install — matches CI exactly
npm ci

# 1. the fast checks, in the same order as `npm test`
npm run lint          # root tsc --noEmit          (~27s)
npm run lint:edge     # tsc -p tsconfig.edge.json  (~2s)
npm run build         # vite build + prerender + esbuild server (~15s)

# 2. the offline suites on their own — this is where PR #81 actually fails
node scripts/run-all-verifications.mjs

# 3. go straight to the failing suite (0.3s, no build needed)
node scripts/verify-gap-completion.mjs

# 4. the SEO/JSON-LD/sitemap suite the PR touched
node scripts/verify-public-homepage.mjs

# 5. the whole gate, exactly as CI runs it (~5m30s)
npm test
```

Useful debugging extras:

```bash
# keep the full log and see only the failures
npm test > /tmp/gate.log 2>&1; echo "exit=$?"
grep -n '^FAIL' /tmp/gate.log
tail -5 /tmp/gate.log

# the .mjs wrappers bundle a .tsx with esbuild, so stack traces point at
# `[eval1]:<line>`. Read the real assertion in the .tsx source instead:
grep -n 'clinic.example' scripts/verify-gap-completion.tsx

# confirm what the build actually emitted for the SEO origin
grep -o 'https://nexorasalon.online/' dist/index.html | head
grep -c 'vercel.app' dist/index.html dist/login.html   # expect 0

# check the lazy split really happened
ls -la dist/assets/ | grep -E 'Editor|Admin|Management'
```

Two things that are **not** worth chasing:

- `Some chunks are larger than 500 kB` — a Rollup warning, present on `main` too. It does not fail the gate.
- `react-test-renderer is deprecated` / `Detected multiple renderers concurrently` — pre-existing noise from the suites, not failures.

One CI-only warning you can clean up separately: the run annotates *"Node.js 20 is deprecated… actions/checkout@v4, actions/setup-node@v4"*. Bump to `actions/checkout@v5` and `actions/setup-node@v5` when convenient. It is a warning, not the failure.

---

## 5. Verification of the fix

Run on PR #81's exact head tree with the patch applied:

| Check | Before | After |
| --- | --- | --- |
| `npm run lint` | PASS | PASS |
| `npm run lint:edge` | PASS | PASS |
| `npm run build` | PASS | PASS |
| `verify-gap-completion.mjs` | **FAIL** | **PASS** |
| `verify-public-homepage.mjs` | PASS | **PASS** (with the new assertions) |
| `node scripts/run-all-verifications.mjs` | **114/115** | **115/115** |
| `npm test` (full gate) | exit 1 | **exit 0** |

```
115/115 verification suites passed.
FULL_GATE_EXIT=0
```

The patch was then re-applied to a fresh `git archive` of `d308ccf` and the two files confirmed byte-identical to the tested tree.

---

## 6. The Vercel check — not fixable in code

```
Resource is limited - try again in 24 hours
(more than 100, code: "api-deployments-free-per-day")
```

This is the **Hobby plan's 100-deployments-per-day account quota**. It is not a build error, not a TypeScript error, and not caused by anything in the diff. Vercel rejected the deployment before running your build, which is why the check reports `0s`. The same block is recorded for `main` and PR #80 in the [production audit](production-audit-2026-11-06.md).

Options, in order of preference:

1. **Wait for the rolling 24-hour reset.** Nothing to change; re-run the check afterwards.
2. **Stop burning quota on branches you don't need previews for.** Add an `ignoreCommand` to `vercel.json` so only the production branch builds:

   ```json
   {
     "ignoreCommand": "node -e \"process.exit(process.env.VERCEL_GIT_COMMIT_REF === 'main' ? 1 : 0)\""
   }
   ```

   `ignoreCommand` exit `0` = **skip** the build, exit `1` = **build**. The trade-off is that PRs stop getting preview URLs — your GitHub Actions quality gate still runs on every PR, so you keep the test coverage. If you want previews for some branches, invert the condition to test a prefix instead.
3. **Turn off automatic deployments for non-production branches** in Vercel → Project → Settings → Git, and cancel stale queued builds. This is a dashboard change, not a repo change.
4. **Upgrade to Pro** if you genuinely need >100 deployments/day.

Note that this PR saw ~10 pushes inside ten minutes (`5a4887b`, `b1d46fa`, `b5384a0`, `2ef5c04`, `dcd1d36`, `d308ccf`), each triggering both a `push` and a `pull_request` workflow plus a Vercel deployment. Batching pushes, or relying on the workflow's existing `concurrency.cancel-in-progress`, cuts the burn substantially.

**Important:** merging PR #81 will not make the live site correct on its own. The deploy has to succeed after the quota resets.

---

## 7. What was not done

- PR #81's branch was not checked out, committed to, or pushed — the fix is delivered as a verified patch.
- No deployment was attempted.
- No Supabase migration in the PR (`202611060001_studioflow_public_access_hardening.sql`) was applied.
- The lazy-loading change, SEO assertions and JSON-LD matcher were left alone; they are correct.
