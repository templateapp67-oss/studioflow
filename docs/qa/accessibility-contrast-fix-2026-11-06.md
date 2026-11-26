# Accessibility fix report — BrowserStack colour-contrast export

**Date:** 2026-11-06
**Branch:** `arena/478e03fa-studioflow` (baseline `dfd03cb`, merged PR #79)
**Input:** `exported_reports_automated-tests_Build#1-bulk_06 November '26_Exported_06-11-2026_45273.csv`
**Scanned page:** `https://studioflow-ashen-pi.vercel.app/#how-it-works` (the scan walks the whole public homepage, not only the `#how-it-works` section)
**Deployment:** none. Nothing was pushed, merged or deployed.

---

## 1. What the report actually contained

86 rows, every one of them the same axe-core rule:

| Field | Value |
| --- | --- |
| Issue name | `color-contrast` |
| Severity | `serious` |
| Guideline | WCAG `SC 1.4.3` (Contrast — Minimum, Level AA) |
| Confirmed violations `Needs review: No` | **17** |
| Indeterminate results `Needs review: Yes` | **69** |

The 69 indeterminate rows break down as:

| axe-core reason | Rows | What it means |
| --- | --- | --- |
| `bgGradient` | 48 | The background behind the text is a gradient (or a translucent chip over one), so no single background colour exists to measure. |
| `shortTextContent` | 19 | One-character text **and** an unresolvable background — the NEXORA `N` monogram. |
| `bgOverlap` | 2 | Another element is treated as painting over the text — the floating hero badge. |

"Needs review" is not a pass. Each of those 69 elements is unverified, so all 86 rows were treated as work.

### 1.1 The scanned build is older than the current source

16 of the 17 confirmed violations are this element:

```html
<p class="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A7F98]">Main services</p>
```

`#8A7F98` on `#FFFFFF` = **3.77:1**, below the required 4.5:1.

That token **does not exist anywhere in the repository at this baseline** — the card label and the library stat labels already use `#6B5E7A` (5.99:1). The exported HTML also shows a `Services` stat label where the current source renders `Example services`. The live site is therefore serving a build that predates the current source, which is consistent with the Vercel `api-deployments-free-per-day` quota block recorded in the [production audit](production-audit-2026-11-06.md).

Those 16 rows need no code change; they need a successful deploy. A regression assertion now locks the token out so it cannot come back.

The 17th confirmed violation — the Makeup Studio badge — **was** still present in the source and is fixed below.

---

## 2. Root causes, verified against axe-core

The fix was driven by axe-core's own algorithm rather than guesswork. From `axe-core@4.11.0`, `lib/commons/color/get-background-color`:

```js
for (…each element in the paint stack, top → bottom…) {
  if (elementHasImage(bgElm, bgElmStyle)) { return null;   // gradient / <img> ⇒ "needs review"
  }
  const bgColor = getOwnBackgroundColor(bgElmStyle);
  if (bgColor.alpha === 0) continue;
  …
  if (bgColor.alpha === 1) break;                          // first opaque background wins
}
```

and from `color-contrast-evaluate`:

```js
const isValid = contrast > expected;                       // strictly greater than 4.5
const shortTextContent = visibleText.length === 1;
…
if (fgColor === null || bgColor === null || equalRatio ||
    (shortTextContent && !ignoreLength && !isValid)) return undefined; // incomplete
```

Three consequences shaped the fix:

1. **An opaque background on the text's own container ends the walk** before any gradient or photo below it is reached. Making the chips opaque is a real fix, not a workaround.
2. **A gradient can never be measured**, no matter what solid colour is layered underneath it — `background-image` is checked before `background-color`. The gradient itself has to go.
3. **`shortTextContent` only produces "needs review" when the contrast is also unresolvable or failing.** Give the one-letter monogram a solid, passing background and it resolves to a normal pass. No markup or branding change is needed.

---

## 3. Changes

### 3.1 Confirmed contrast failures

| Element | Before | After |
| --- | --- | --- |
| Makeup Studio category badge | `#A16207` on `#FEF3C7` = **4.42** ✗ | `#96590A` on `#FEF3C7` = **5.06** ✓ |
| Main services / stat labels | `#8A7F98` on `#FFFFFF` = **3.77** ✗ (stale build only) | `#6B5E7A` on `#FFFFFF` = **5.99** ✓ (already in source, now locked by a test) |

### 3.2 Indeterminate backgrounds made measurable

| Surface | Before | After | Result |
| --- | --- | --- | --- |
| NEXORA monogram (×19) | gradient `#2A1E4A → #3E2A63 → #7A4E8F`, worst stop 5.28:1 | solid `bg-[#3E2A63]` | `#F5E9D6` = **10.20:1**, determinate |
| Card NEXORA wordmark (×16) | `bg-white/92` over artwork + gradient | `bg-white` | `#2A1E4A` = **15.18:1** |
| Card category pill (×16) | `${color}E6` (90 % alpha) over artwork | opaque `color` | white ≥ **5.56:1** on every category colour |
| Library stat tiles (×6) | `bg-white/80` over a gradient header | `bg-white` | label **5.99:1**, value **17.44:1** |
| Library header title, intro, logo wordmark, tagline (×4) | `bg-gradient-to-br from-[#FBF8F2] via-white to-[#F6F1E6]` | `bg-[#FBF8F2]` | **5.65 – 16.45:1** |
| Features CTA title + body (×2) | `bg-gradient-to-r from-[#F6F1E6] to-[#FBF8F2]` | `bg-[#F6F1E6]` | **6.33:1** / **15.48:1** |
| Hero "Featured design" badge | `bg-white/95` over the photo | `bg-white`, solid border | `#39263A` = **13.89:1** |
| Hero caption eyebrow, title, body (×3) | white text on a photo + `#241820/75 → transparent` scrim | opaque caption panel `bg-[#241820]` | **13.33 – 17.12:1** |
| Hero floating badge (×2) | absolutely positioned over an `isolation: isolate` photo, so axe sorted the photo above it → `bgOverlap` | added `z-10`, giving the badge its own layer | `#251A24` **16.77:1**, `#62515B` **7.38:1** |

The hero caption is the one deliberate visual change: text no longer floats on the photo scrim, it sits on a solid rounded caption panel. A scrim over an arbitrary photograph cannot *guarantee* 4.5:1 — the panel can, and it is the only construct a scanner can verify.

### 3.3 Latent defects found while fixing the reported ones

These were not in the export because the scanned state never reached them:

| Element | Problem | Fix |
| --- | --- | --- |
| Selected category filter count chip | `bg-white/25` with inherited white text; over Makeup Studio it flattens to `#B08247` → **3.43:1** | opaque `bg-white` + `text-[#1B1630]` → **17.44:1** |
| Dashboard gallery "In use" badge | white on `bg-emerald-500` = **2.54:1** | `bg-emerald-700` → **5.02:1** |
| Dashboard gallery number badge | `bg-black/60` over artwork, indeterminate | opaque `bg-[#14101F]` → **18.69:1** |
| Dashboard gallery NEXORA chip | `bg-white/92` over artwork, indeterminate | `bg-white` |
| Massage & Wellness badge | `#4D7C0F` on `#ECF7DF` = **4.5028:1** — passing with 0.003 of headroom | `#48740E` → **5.01:1** |

Every category identity colour now clears **5.01:1** on its own tint and **5.56:1** reversed under white.

### 3.4 Files touched

- `src/lib/nexoraTemplateCatalogue.ts` — two category colour tokens, with the measured reason recorded inline.
- `src/components/nexora/NexoraBrand.tsx` — solid brand mark (both `NexoraBrandMark` and `NexoraLogo`).
- `src/components/nexora/NexoraTemplateLibrary.tsx` — header, stat tiles, artwork chips, category pill, selected-filter chip.
- `src/components/PublicHomepage.tsx` — hero caption panel, featured badge, floating badge layer, features CTA.
- `src/components/nexora/NexoraTemplateGallery.tsx` — the same chip patterns in the owner dashboard.
- `src/lib/wcagContrast.ts` — **new**, dependency-free WCAG contrast primitives (parse, alpha-composite, luminance, ratio, strict AA test).
- `scripts/verify-public-contrast.tsx` / `.mjs` — **new** regression suite.

---

## 4. Regression coverage

`scripts/verify-public-contrast.mjs` is auto-discovered by `scripts/run-all-verifications.mjs`, so it runs on every `npm test`.

It does not check a hand-written list of colour pairs. It:

1. asserts every `NEXORA_CATEGORIES` and `nexoraCategoryFilters` token pair clears **4.6:1** in both directions (0.1 of headroom above the cliff);
2. renders the real components with `react-dom/server` — signed-out homepage, authenticated homepage, library with a template in use, the dashboard gallery, and the library with **each of the 16 category filters selected**;
3. parses the markup, walks **every text-bearing element**, and resolves its background the way axe-core does: walk up, bail out on a gradient or an image painted inside the container, stop at the first opaque background, then alpha-composite the translucent layers;
4. fails if any element is **unmeasurable** (the "Needs review" class) or below **4.5:1**;
5. asserts the structural guards: no `bg-gradient` in the brand mark, `z-10` on the floating badge, opaque artwork chips, and no `#8A7F98`.

Current result:

```
public contrast: 15 category tokens + 2966 rendered text elements across 20 states
pass WCAG AA (>4.5:1) with measurable backgrounds
```

**Mutation-tested** — each fix was reverted in turn and the suite was confirmed to fail:

| Reverted change | Suite result |
| --- | --- |
| Card chip back to `bg-white/92` | ✗ `text with an unmeasurable background … "NEXORA" — photo/gradient painted inside the container` |
| Makeup token back to `#A16207` | ✗ `makeup-studio badge: #A16207 on #FEF3C7 = 4.421 (needs > 4.6)` |
| Brand mark back to a gradient | ✗ `the NEXORA mark must stay on a solid, measurable background` |
| Hero caption back onto the scrim | ✗ three hero elements reported unmeasurable |

All four were restored and the suite passes again.

---

## 5. Validation

| Check | Result |
| --- | --- |
| `npm run lint` (`tsc --noEmit`) | PASS |
| `npm run lint:edge` | PASS |
| `npm run build` | PASS |
| `node scripts/run-all-verifications.mjs` | **120/120 PASS** (was 119; +1 new suite) — log: `.tmp-audit/a11y-final-test.log` |
| `node scripts/verify-public-contrast.mjs` | PASS |
| `npm audit --audit-level=low` | 0 vulnerabilities |
| `git diff --check` | clean |
| Local production server, `GET /` | 200, 195 KB prerendered homepage; 38 solid brand marks, 1 caption panel, `z-10` badge present; **0** occurrences of `#8A7F98`, `bg-white/92` or the brand gradient |

Non-fatal build warnings are unchanged from the baseline: Rollup chunk-size hint, Zod `@__PURE__` annotation, deprecated `react-test-renderer`, and React's concurrent-renderer notice.

---

## 6. Limits and the confirmation step

- The offline suite reproduces axe-core's **background-resolution and contrast arithmetic**, not a real browser's layout and paint order. It cannot prove what a fresh BrowserStack run will say; it proves the specific defects in this export are gone and cannot silently return.
- **The 86 rows will only clear on the live site after a successful deploy.** The Vercel free-plan daily deployment quota is still the blocker recorded in the production audit. No deploy was attempted here.
- Recommended confirmation: re-run the same BrowserStack accessibility build against the deployed homepage once a deploy succeeds. Expected outcome: 0 confirmed `color-contrast` violations and 0 indeterminate rows for the surfaces listed above.
- The NEXORA monogram is additionally exempt from SC 1.4.3 as a logotype, but it now passes on its own merits at 10.20:1 rather than relying on that exemption.

No authentication, integration, route or legacy API behaviour was changed by this work.
