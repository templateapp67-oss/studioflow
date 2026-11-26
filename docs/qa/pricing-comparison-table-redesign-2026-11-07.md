# Pricing comparison table redesign — 2026-11-07

**Branch:** `arena/0425c667-studioflow`
**Scope:** the pricing feature-comparison table on `/pricing` (and the legacy
`nexora-pricing` matrix, which now shares the same component). No other part of the
pricing page was redesigned.

---

## 1. What changed

| Area | Before | After |
|---|---|---|
| Plan status cells | Grey circled question mark + "Review" chip for 257 of 260 cells | Green circled check (`#00C853`) or red circled cross (`#FF2323`) in **every one of 260** cells |
| Legend | 3 entries incl. "Pending plan configuration" | Exactly 2: green circled check → Included, red circled cross → Not included |
| Plan header | Black band, white text | White, black text; **Standard** heading in Nexora red, pale-red `#FFE9EA` column highlight continuous from header through every row |
| Category headings | Uppercase grey micro-caps on grey band | Full-width separators in Nexora red `#FF2323`, white background, hairline `#EEEEEE` dividers |
| Feature info | `title` tooltip on an "i" glyph | Real accessible popover: hover, keyboard focus, tap, Escape; text from `FEATURE_DESCRIPTIONS` data |
| Mobile | Horizontal scroll only | Horizontal scroll plus "Swipe to compare plans." and touch-friendly tooltips |
| Table code | Two divergent implementations | One shared `FeatureComparisonTable` (+4 sub-components) and one tokenised stylesheet |

New files:

```
src/lib/nexoraPlanEntitlements.ts                       approved matrix + policy + open decisions
src/components/nexora-pricing/table/FeatureComparisonTable.tsx
src/components/nexora-pricing/table/FeatureStatus.tsx
src/components/nexora-pricing/table/FeatureInfoTooltip.tsx
src/components/nexora-pricing/table/FeatureCategoryRow.tsx
src/components/nexora-pricing/table/PlanColumnHeader.tsx
src/components/nexora-pricing/table/comparisonTable.css
scripts/verify-nexora-comparison-table.mjs              release gate (bundler wrapper)
scripts/_verify-nexora-comparison-table-suite.mjs       assertions against rendered DOM
docs/nexora-plan-entitlements.md                        approval record + open decisions
docs/previews/pricing-comparison-{desktop,full,devices}.html
```

## 2. Entitlement data — the part that mattered

`FEATURE_PLAN_ENTITLEMENTS` previously defaulted every cell to `review` with three
Standard exceptions. That is why customers saw question marks: the table had no
matrix to draw.

A complete binary matrix now exists in `src/lib/nexoraPlanEntitlements.ts` (65
features × 4 plans = 260 cells, all `included`/`excluded`). Provenance:

* the three pre-existing approved Standard inclusions are preserved verbatim;
* the remaining cells follow an explicit tiering policy **approved by the product
  owner in this session** (approval id `NEXORA-PLAN-ENTITLEMENTS-2026-11-07`);
* the published comparison cannot be inferred from code presence, from another
  vendor's page, or from the reference screenshot (whose rows do not exist in the
  Nexora catalogue);
* four open commercial questions are recorded and flagged rather than hidden
  (Priority Support, Premium Support, branch scope, WhatsApp API on Premium).

Full detail: [`docs/nexora-plan-entitlements.md`](../nexora-plan-entitlements.md).

`review` remains a valid value in the `EntitlementState` type so a future
unapproved row fails closed, but it can no longer reach a customer:

* `PUBLISHED_COMPARISON_FEATURE_IDS` filters rows through `isEntitlementApproved`;
* `FeatureStatus` has no third rendering path (an unapproved cell draws no icon);
* the DB seed generator aborts on any non-binary cell.

The database seed (`supabase/migrations/202611070002_…seed.sql`) was regenerated
from the same matrix: 198 `included` and 62 `not_included` `plan_features` rows,
verified to apply by `verify-sql-migrations.mjs`.

## 3. Verification

```
npm run lint                          PASS (tsc --noEmit, no errors)
npm run lint:edge                     PASS
npm run build                         PASS (pricing page prerendered)
node scripts/verify-nexora-pricing.mjs                     PASS
node scripts/verify-nexora-comparison-table.mjs            PASS
node scripts/verify-nexora-pricing-landing.mjs             PASS
node scripts/verify-nexora-salon-landing.mjs               PASS
node scripts/verify-sql-migrations.mjs                     PASS
node scripts/run-all-verifications.mjs                     131/131 suites passed
```

`verify-nexora-comparison-table.mjs` renders the real components server-side and
asserts, among ~90 checks:

* 65 features × 4 plans = 260 status cells, each `data-status="included"` or
  `"excluded"`; counts match the approved matrix exactly;
* every included cell uses Lucide `CircleCheck`, every excluded cell `CircleX`;
* zero occurrences of `CircleHelp`, `matrix-review`, "Pending plan confirmation",
  a review status cell, or a literal `?` inside the table body;
* accessible labels `Included in <Plan>` / `Not included in <Plan>` per cell;
* the Standard highlight covers the header and all 65 rows;
* the eight category headings render in order;
* every tooltip panel contains the approved description from the data;
* the legend has exactly two entries;
* the "Swipe to compare plans." instruction and labelled scroll region exist;
* the tier ladder is monotonic (no plan withdraws a cheaper plan's feature);
* all ten approved colour tokens and no ad-hoc colour outside the token block;
* add-on bundling only where the plan already includes the capability;
* approved annual prices, auth handoff, plan selection, dialogs and SEO are intact.

## 4. Rendering evidence

A headless browser could not be installed in this environment (the Chromium
download is blocked and no system browser exists), so the previews in
`docs/previews/` are the **real components rendered server-side with the real
stylesheets inlined**:

* `pricing-comparison-desktop.html` — reference crop (first two categories);
* `pricing-comparison-full.html` — all 65 features;
* `pricing-comparison-devices.html` — the same markup inside 1440/1024/767/411/375/320 px
  frames, so the responsive rules and the swipe hint resolve per device.

The shipped prerendered document was also inspected directly:
`dist/pricing/index.html` contains 198 included and 62 excluded cells, no
question marks, no `data-status="review"`, and the compiled stylesheet contains
`#00c853`, `#ffe9ea`, `#ff2323` and `#eeeeee`.

## 5. Still open for business approval

1. Priority Support and Premium Support are excluded from all four plans because no
   support channel, SLA or escalation path is configured. Decide the plan mapping
   and the commitment.
2. Confirm Multi-Branch Management is Premium-only.
3. Confirm WhatsApp API is included in Premium at no extra charge.
4. Monthly rates, add-on prices and subscription checkout remain unconfigured and
   were not invented.
