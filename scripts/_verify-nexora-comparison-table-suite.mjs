import React from 'react';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * NEXORA SALONOS — pricing comparison table verification.
 *
 * This suite renders the ACTUAL components (server-side) and inspects the real
 * DOM they produce, then cross-checks the published matrix against the approved
 * entitlement source of truth. It is the release gate for the redesigned table:
 * icons, colours, highlight, category headings, tooltips and — most importantly —
 * "no fabricated entitlement" are all asserted here.
 */

const pricing = await import('../src/lib/nexoraPricing.ts');
const entitlementsModule = await import('../src/lib/nexoraPlanEntitlements.ts');
const { FeatureComparisonTable } = await import('../src/components/nexora-pricing/table/FeatureComparisonTable.tsx');
const { FeatureStatus } = await import('../src/components/nexora-pricing/table/FeatureStatus.tsx');
const { FeatureInfoTooltip } = await import('../src/components/nexora-pricing/table/FeatureInfoTooltip.tsx');
const { ComparisonSection } = await import('../src/components/nexora-landing/sections/ComparisonSection.tsx');

const {
  FEATURE_CATEGORIES,
  FEATURE_PLAN_ENTITLEMENTS,
  PRICING_ADD_ONS,
  PRICING_FAQS,
  PRICING_PLANS,
  PUBLISHED_COMPARISON_FEATURE_IDS,
} = pricing;
const { FEATURE_ENTITLEMENT_MATRIX, APPROVED_ENTITLEMENT_POLICY, PENDING_COMMERCIAL_DECISIONS, addOnIncludedPlanIds } =
  entitlementsModule;

/* ==========================================================================
 * 1. Entitlement matrix integrity (the "never fabricate" gate)
 * ======================================================================== */

const catalogue = FEATURE_CATEGORIES.flatMap((category) => category.items);
const catalogueIds = catalogue.map((item) => item.id);

assert.equal(new Set(catalogueIds).size, catalogueIds.length, 'Catalogue feature ids are unique');

assert.deepEqual(
  Object.keys(FEATURE_ENTITLEMENT_MATRIX).filter((id) => !catalogueIds.includes(id)),
  [],
  'The approved matrix contains no feature that is not in the published catalogue',
);
assert.deepEqual(
  catalogueIds.filter((id) => !FEATURE_ENTITLEMENT_MATRIX[id]),
  [],
  'Every catalogued feature has an explicit approved line in the matrix (no implicit default)',
);

// Every cell must be a real boolean choice, never a default, never `review`.
for (const [featureId, tuple] of Object.entries(FEATURE_ENTITLEMENT_MATRIX)) {
  assert.equal(tuple.length, 4, `${featureId} answers all four plans`);
  tuple.forEach((value, index) => {
    assert.equal(
      typeof value,
      'boolean',
      `${featureId}/${['lite', 'grow', 'standard', 'premium'][index]} is an explicit boolean`,
    );
  });
}

// The resolution layer may only ever produce binary states.
const resolvedStates = new Set(
  Object.values(FEATURE_PLAN_ENTITLEMENTS).flatMap((plans) => PRICING_PLANS.map((plan) => plans[plan.id])),
);
assert.deepEqual([...resolvedStates].sort(), ['excluded', 'included'], 'The published map contains no `review` cell');

// The three pre-existing approved Standard inclusions survive verbatim.
for (const featureId of ['whatsapp-api', 'attendance', 'advanced-salon-management']) {
  assert.equal(FEATURE_PLAN_ENTITLEMENTS[featureId].standard, 'included', `${featureId} stays a Standard inclusion`);
  assert.equal(FEATURE_ENTITLEMENT_MATRIX[featureId][2], true, `${featureId} is included in the matrix column 3`);
  assert.equal(FEATURE_PLAN_ENTITLEMENTS[featureId].premium, 'included', `${featureId} is also approved for Premium`);
}

// Approved policy provenance is recorded, not implied.
assert.equal(APPROVED_ENTITLEMENT_POLICY.status, 'approved');
assert.equal(APPROVED_ENTITLEMENT_POLICY.approvalId, 'NEXORA-PLAN-ENTITLEMENTS-2026-11-07');
assert.equal(APPROVED_ENTITLEMENT_POLICY.preExistingApprovals.length, 3, 'The three brief-approved assignments are recorded');
assert.ok(
  APPROVED_ENTITLEMENT_POLICY.notes.some((note) => note.includes('application code')),
  'The policy states that access was not inferred from code presence',
);

// A strictly increasing tier ladder: no plan loses a feature a cheaper plan has.
const planOrder = ['lite', 'grow', 'standard', 'premium'];
for (const featureId of catalogueIds) {
  const row = planOrder.map((planId) => FEATURE_PLAN_ENTITLEMENTS[featureId][planId] === 'included');
  for (let index = 1; index < row.length; index += 1) {
    assert.ok(!(row[index - 1] && !row[index]), `${featureId} is not withdrawn from a more expensive plan`);
  }
}

// Support levels are the only "granted by nobody" rows and are flagged, not hidden.
const grantedByNobody = catalogueIds.filter((id) => planOrder.every((planId) => FEATURE_PLAN_ENTITLEMENTS[id][planId] === 'excluded'));
assert.deepEqual(grantedByNobody.sort(), ['premium-support', 'priority-support'], 'Only the unconfigured support levels are excluded everywhere');
for (const decision of PENDING_COMMERCIAL_DECISIONS) {
  assert.ok(catalogueIds.includes(decision.featureId), `Pending decision references a real feature: ${decision.featureId}`);
  assert.equal(
    FEATURE_PLAN_ENTITLEMENTS[decision.featureId][planOrder.find((planId) => FEATURE_PLAN_ENTITLEMENTS[decision.featureId][planId] === decision.publishedState)],
    decision.publishedState,
    `Pending decision for ${decision.featureId} matches the published state`,
  );
}
assert.ok(PENDING_COMMERCIAL_DECISIONS.length >= 4, 'Open commercial questions are recorded for approval');

// Only approved binary rows may be published.
assert.deepEqual(
  PUBLISHED_COMPARISON_FEATURE_IDS.slice().sort(),
  catalogueIds.slice().sort(),
  'Every catalogued row is publishable because every row is approved',
);

/* ==========================================================================
 * 2. Rendered table: every visible cell
 * ======================================================================== */

const groups = pricing.PRICING_PLANS.length
  ? FEATURE_CATEGORIES.map((category) => ({
      id: category.id,
      label: category.label,
      featureIds: category.items.map((item) => item.id),
    }))
  : [];
const featureItems = Object.fromEntries(catalogue.map((item) => [item.id, item]));

const html = renderToStaticMarkup(
  React.createElement(FeatureComparisonTable, {
    plans: PRICING_PLANS,
    groups,
    featureItems,
    entitlements: FEATURE_PLAN_ENTITLEMENTS,
    publishedFeatureIds: PUBLISHED_COMPARISON_FEATURE_IDS,
    caption: 'Feature comparison for the Lite, Grow, Standard and Premium Nexora SalonOS plans.',
    idPrefix: 't',
  }),
);

// Real table semantics.
assert.ok(html.includes('<table class="nx-compare">'), 'The comparison uses a real table');
assert.ok(html.includes('<caption'), 'The table has a caption');
assert.ok(html.includes('scope="colgroup"'), 'Category separators are column-group headers');
assert.ok(html.includes('scope="row"'), 'Feature names are row headers');
assert.equal((html.match(/scope="col"/g) || []).length, 5, 'One feature column header plus four plan columns');

// Plan columns in the required order.
const headerOrder = [...html.matchAll(/class="nx-planhead[^"]*"[^>]*aria-label="([^"]+) plan"/g)].map((match) => match[1]);
assert.deepEqual(headerOrder, ['Lite', 'Grow', 'Standard', 'Premium'], 'Plan columns render Lite, Grow, Standard, Premium');

// Category headings: the eight documented groups, in order, red.
const renderedCategories = [...html.matchAll(/class="nx-cat__name">([^<]+)</g)].map((match) => match[1]);
assert.deepEqual(
  renderedCategories,
  ['Online Presence', 'Customer Management', 'Billing and POS', 'Staff Management', 'WhatsApp and Automation', 'Inventory Management', 'Analytics and Reports', 'Business Management'],
  'Every documented category renders once, as its own separator, in order',
);
assert.ok(html.includes('class="nx-cat__cell"'), 'Category rows are full-width separator cells');

// Every visible status cell is a green check or a red cross — nothing else.
// Counts are taken from the table body only, so the two legend samples cannot
// mask a broken cell.
const tableBody = html.slice(html.indexOf('<tbody>'), html.indexOf('</tbody>'));
const cellCount = catalogueIds.length * 4;
const includedCells = (tableBody.match(/data-status="included"/g) || []).length;
const excludedCells = (tableBody.match(/data-status="excluded"/g) || []).length;
assert.equal(includedCells + excludedCells, cellCount, 'Every visible feature x plan cell has an approved binary status');
assert.equal(includedCells, catalogueIds.reduce((sum, id) => sum + PRICING_PLANS.filter((plan) => FEATURE_PLAN_ENTITLEMENTS[id][plan.id] === 'included').length, 0),
  'Visible included cells match the approved matrix exactly');
assert.equal(excludedCells, cellCount - includedCells, 'Visible excluded cells are the complement of the approved matrix');

// No ambiguous icon system may survive.
for (const [pattern, label] of [
  [/data-status="review"/, 'a pending/review status cell'],
  [/matrix-review/, 'the legacy review chip'],
  [/matrix-yes|matrix-no/, 'the legacy table status classes'],
  [/CircleHelp/, 'a question-mark icon'],
  [/class="nx-status[^"]*"[^>]*>\s*<svg[^>]*lucide-minus/, 'a grey minus status icon'],
  [/Pending plan confirmation/, 'a "pending plan confirmation" label'],
  [/nx-status__pending/, 'a placeholder status glyph'],
]) {
  assert.ok(!pattern.test(html), `The rendered table never contains ${label}`);
}
assert.ok(!tableBody.includes('?'), 'No question mark is rendered anywhere in the table body');

// Included = green CircleCheck, excluded = red CircleX. Both are outlined circles.
const includedIcons = [...tableBody.matchAll(/<span class="nx-status nx-status--included"[\s\S]*?<\/span>/g)].map((match) => match[0]);
const excludedIcons = [...tableBody.matchAll(/<span class="nx-status nx-status--excluded"[\s\S]*?<\/span>/g)].map((match) => match[0]);
assert.equal(includedIcons.length, includedCells, 'Every included cell renders the included status component');
assert.equal(excludedIcons.length, excludedCells, 'Every excluded cell renders the excluded status component');
for (const icon of includedIcons) {
  assert.ok(icon.includes('lucide-circle-check'), 'Included status uses the Lucide CircleCheck icon (outlined circular check)');
  assert.ok(icon.includes('data-status="included"'));
}
for (const icon of excludedIcons) {
  assert.ok(icon.includes('lucide-circle-x'), 'Excluded status uses the Lucide CircleX icon (outlined circular cross)');
  assert.ok(icon.includes('data-status="excluded"'));
}

// Accessible labels: "Included in <Plan>" / "Not included in <Plan>" per cell.
for (const plan of PRICING_PLANS) {
  for (const [featureId, state] of [
    ['mini-website', 'included'],
    ['branches', plan.id === 'premium' ? 'included' : 'excluded'],
  ]) {
    const label = `${featureItems[featureId].label}: ${state === 'included' ? 'Included in' : 'Not included in'} ${plan.name}`;
    if (Object.values(FEATURE_PLAN_ENTITLEMENTS[featureId]).includes(state)) {
      assert.ok(html.includes(`aria-label="${label}"`), `Cell announces "${label}"`);
    }
  }
}
assert.ok(html.includes('role="img"'), 'Status icons expose an image role with an accessible name');

// Standard highlight: pale-red column, continuous from header through rows.
const standardHeader = html.match(/<th scope="col" class="nx-planhead is-recommended"[^>]*/)?.[0] ?? '';
assert.ok(standardHeader, 'The Standard header carries the recommended class');
const recommendedCells = (html.match(/class="nx-compare__cell is-recommended"/g) || []).length;
assert.equal(recommendedCells, catalogueIds.length, 'The Standard highlight runs continuously down every row');
assert.ok(!/nx-planhead[^"]*"[^>]*style="[^"]*#(0|1)[0-9a-f]{5}/i.test(html), 'No dark header block is inline-styled');

// Tooltip: real buttons with descriptions from the data, keyboard/touch operable.
const triggerCount = (html.match(/class="nx-info__trigger"/g) || []).length;
assert.equal(triggerCount, catalogueIds.length, 'Every feature has an information control');
assert.equal((html.match(/role="tooltip"/g) || []).length, catalogueIds.length, 'Every feature has a real tooltip panel');
assert.equal((html.match(/aria-expanded="false"/g) || []).length, catalogueIds.length, 'Tooltips expose their collapsed state');
assert.equal((html.match(/hidden=""/g) || []).length, catalogueIds.length, 'Tooltip panels are hidden until opened');
for (const item of catalogue.slice(0, 12)) {
  assert.ok(html.includes(item.description), `Tooltip text is the approved description for ${item.id}`);
}
assert.ok(html.includes('data-nx-tip-trigger'), 'Tooltip triggers are focusable buttons, not title-only hints');

// Legend: exactly two entries.
const legend = html.match(/<ul class="nx-legend">[\s\S]*?<\/ul>/)?.[0] ?? '';
assert.ok(legend, 'The table has a legend');
assert.equal((legend.match(/<li>/g) || []).length, 2, 'The legend has exactly two entries');
assert.ok(/nx-status--included/.test(legend) && />Included</.test(legend), 'Legend entry 1 is the green circled check → Included');
assert.ok(/nx-status--excluded/.test(legend) && />Not included</.test(legend), 'Legend entry 2 is the red circled cross → Not included');

// Mobile instruction.
assert.ok(html.includes('Swipe to compare plans.'), 'The mobile instruction "Swipe to compare plans." is present');
assert.ok(html.includes('role="region"'), 'The scroll port is a labelled region');
assert.ok(html.includes('tabIndex="0"') || html.includes('tabindex="0"'), 'The scroll port is keyboard reachable');

/* ==========================================================================
 * 3. Component-level contracts
 * ======================================================================== */

const includedStatus = renderToStaticMarkup(
  React.createElement(FeatureStatus, { state: 'included', planName: 'Lite', featureLabel: 'Mini Website' }),
);
assert.ok(includedStatus.includes('aria-label="Mini Website: Included in Lite"'), 'Status label format: "Included in <Plan>"');
const excludedStatus = renderToStaticMarkup(
  React.createElement(FeatureStatus, { state: 'excluded', planName: 'Premium', featureLabel: 'Mini Website' }),
);
assert.ok(excludedStatus.includes('aria-label="Mini Website: Not included in Premium"'), 'Status label format: "Not included in <Plan>"');
const reviewStatus = renderToStaticMarkup(
  React.createElement(FeatureStatus, { state: 'review', planName: 'Grow', featureLabel: 'Mini Website' }),
);
assert.ok(reviewStatus.includes('aria-label="Mini Website: plan confirmation pending in Grow"'), 'An unapproved cell fails closed with no icon');
assert.ok(!reviewStatus.includes('lucide-circle'), 'An unapproved cell never draws an approved-looking icon');
assert.ok(!reviewStatus.includes('?'), 'An unapproved cell never draws a question mark');

const tooltipSource = readFileSync('src/components/nexora-pricing/table/FeatureInfoTooltip.tsx', 'utf8');
for (const [needle, label] of [
  ['onMouseEnter', 'hover opens the tooltip'],
  ['onFocus', 'keyboard focus opens the tooltip'],
  ['onClick', 'click/tap toggles the tooltip'],
  ["event.key === 'Escape'", 'Escape closes the tooltip'],
  ['role="tooltip"', 'the panel exposes a tooltip role'],
  ['aria-describedby', 'the panel is described by the trigger'],
  ['touchstart', 'an outside tap closes the tooltip on touch devices'],
]) {
  assert.ok(tooltipSource.includes(needle), `Tooltip behaviour: ${label}`);
}

/* ==========================================================================
 * 4. Stylesheet contract (approved colour tokens, no monochrome fallback)
 * ======================================================================== */

const css = readFileSync('src/components/nexora-pricing/table/comparisonTable.css', 'utf8');
const tokenBlock = css.slice(0, css.indexOf('/* ---- scroll port'));
for (const [token, value] of [
  ['--nx-table-bg', '#ffffff'],
  ['--nx-table-text', '#000000'],
  ['--nx-table-category', '#ff2323'],
  ['--nx-table-primary', '#ff2323'],
  ['--nx-table-included', '#00c853'],
  ['--nx-table-excluded', '#ff2323'],
  ['--nx-table-standard-bg', '#ffe9ea'],
  ['--nx-table-divider', '#eeeeee'],
  ['--nx-table-description', '#4b4f58'],
  ['--nx-table-info', '#4b4f58'],
]) {
  assert.ok(tokenBlock.includes(`${token}: ${value}`), `Colour token ${token} is ${value}`);
}
for (const [needle, label] of [
  ['background: var(--nx-table-standard-bg)', 'the Standard column uses the pale-red token'],
  ['color: var(--nx-table-primary)', 'the Standard heading uses Nexora red'],
  ['color: var(--nx-table-category)', 'category headings use Nexora red'],
  ['color: var(--nx-table-included)', 'included icons use the success token'],
  ['color: var(--nx-table-excluded)', 'excluded icons use the Nexora red token'],
  ['stroke: currentColor', 'icon strokes inherit the approved token colour'],
  ['background: transparent', 'status icons have a transparent background'],
  ['overflow-x: auto', 'the table scrolls horizontally when needed'],
  ['contain: paint', 'the table cannot cause page-level horizontal overflow'],
  ['position: sticky', 'the feature column stays readable while scrolling'],
  ['prefers-reduced-motion', 'reduced motion is respected'],
  ['.nx-compare__hint', 'the mobile swipe hint is styled'],
  ['min-width: 720px', 'the desktop table keeps four readable plan columns'],
]) {
  assert.ok(css.includes(needle), `Stylesheet: ${label}`);
}
for (const width of ['1024px', '760px', '480px']) {
  assert.ok(css.includes(`max-width: ${width}`), `Responsive breakpoint ${width} is defined for the table`);
}
// No hard-coded colours outside the token block (keeps the palette centralised).
const outsideTokens = css.slice(css.indexOf('/* ---- scroll port')).match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
assert.deepEqual(
  [...new Set(outsideTokens.map((value) => value.toLowerCase()))].filter((value) => !['#fff', '#ffffff'].includes(value)),
  [],
  'No ad-hoc colour is hard-coded outside the centralised token block',
);

// The retired grey-status rules are gone from the landing stylesheet.
const landingCss = readFileSync('src/components/nexora-landing/nexoraLanding.css', 'utf8');
for (const dead of ['.sl-table__state--review', '.sl-table__state--no', '.sl-table__group th', '.sl-table-wrap']) {
  assert.ok(!landingCss.includes(dead), `The retired comparison rule ${dead} is removed`);
}
assert.ok(landingCss.includes('.sl-table__approval-note'), 'The approval provenance note is styled');

/* ==========================================================================
 * 5. Add-ons: same visual language, no duplicate billing
 * ======================================================================== */

const whatsAppAddOn = PRICING_ADD_ONS.find((addOn) => addOn.id === 'wa-api');
assert.deepEqual(whatsAppAddOn.includedPlanIds, ['standard', 'premium'], 'WhatsApp API is bundled with Standard and Premium only');
for (const addOn of PRICING_ADD_ONS) {
  for (const planId of addOn.includedPlanIds) {
    const featureId = entitlementsModule.ADD_ON_FEATURE_MAP[addOn.id];
    if (!featureId) continue;
    assert.equal(FEATURE_PLAN_ENTITLEMENTS[featureId][planId], 'included', `Add-on ${addOn.id} is bundled only where the plan already includes it`);
  }
  assert.ok(addOn.price === null, `Add-on ${addOn.id} publishes no invented price`);
}
assert.deepEqual(addOnIncludedPlanIds('marketing'), [], 'Add-ons without an approved mapping are bundled with no plan');
assert.ok(
  PRICING_ADD_ONS.filter((addOn) => addOn.includedPlanIds.length).every((addOn) => addOn.id === 'wa-api'),
  'Only the approved WhatsApp API bundling is published',
);
const addOnSection = readFileSync('src/components/nexora-landing/sections/AddOnsSection.tsx', 'utf8');
assert.ok(addOnSection.includes('CircleCheck') && addOnSection.includes('CircleX'), 'Add-ons use the same check/cross icon language');
assert.ok(!addOnSection.includes('CircleHelp'), 'Add-ons no longer use question-mark indicators');

/* ==========================================================================
 * 6. Preserved pricing behaviour (regression gate)
 * ======================================================================== */

assert.deepEqual(
  PRICING_PLANS.map(({ id, annualMonthlyEquivalent, annualTotal }) => [id, annualMonthlyEquivalent, annualTotal]),
  [['lite', 625, 7500], ['grow', 1249, 14988], ['standard', 1999, 23988], ['premium', 4999, 59988]],
  'Approved annual prices are unchanged',
);
assert.ok(PRICING_PLANS.every((plan) => plan.monthlyPrice === null), 'No monthly rate was invented');
assert.equal(PRICING_PLANS.find((plan) => plan.popular)?.id, 'standard', 'Standard stays the highlighted plan');
assert.equal(PRICING_FAQS.length, 15, 'The FAQ count is unchanged');

const pricingPage = readFileSync('src/components/nexora-landing/NexoraPricingLandingPage.tsx', 'utf8');
assert.ok(pricingPage.includes('supabase.auth.getSession()'), 'Plan selection still checks the auth session');
assert.ok(pricingPage.includes('pricingAuthPath'), 'Registration/authentication handoff is intact');
assert.ok(pricingPage.includes('<PlanSummaryDialog'), 'The plan summary dialog is still composed');
assert.ok(pricingPage.includes('savePendingPricingSelection'), 'Pending plan selection is still saved');
assert.ok(pricingPage.includes('nexoraPricingSchema'), 'SEO structured data is still emitted');

const comparisonSection = readFileSync('src/components/nexora-landing/sections/ComparisonSection.tsx', 'utf8');
assert.ok(comparisonSection.includes('FeatureComparisonTable'), 'The live /pricing table uses the shared component');
assert.ok(comparisonSection.includes('PUBLISHED_COMPARISON_FEATURE_IDS'), 'The live table renders only approved rows');
assert.ok(!comparisonSection.includes('CircleHelp'), 'The live table has no question-mark indicator');

const legacyMatrix = readFileSync('src/components/nexora-pricing/sections/FeatureMatrix.tsx', 'utf8');
assert.ok(legacyMatrix.includes('FeatureComparisonTable'), 'The legacy FeatureMatrix uses the same shared component');
assert.ok(!legacyMatrix.includes('CircleHelp') && !legacyMatrix.includes('Minus'), 'The legacy matrix keeps no ambiguous status icons');

const pricingGrid = readFileSync('src/components/nexora-pricing/sections/PricingGrid.tsx', 'utf8');
assert.ok(!pricingGrid.includes('CircleHelp'), 'The plan cards no longer show a pending question mark');
assert.ok(pricingGrid.includes("FEATURE_PLAN_ENTITLEMENTS[feature.id][plan.id]==='included'"), 'Plan-card highlights read the approved matrix');

// The seed generator must refuse to publish an unapproved cell.
const seedGenerator = readFileSync('scripts/generate-nexora-landing-db-seed.mjs', 'utf8');
assert.ok(seedGenerator.includes('Unapproved plan entitlements must not be seeded'), 'The DB seed aborts on an unapproved entitlement');
const seedSql = readFileSync('supabase/migrations/202611070002_nexora_salon_landing_seed.sql', 'utf8');
assert.ok(seedSql.includes("'included'") && seedSql.includes("'not_included'"), 'The seed records both approved states');
assert.ok(!seedSql.includes("'custom'"), 'The seed publishes no unapproved custom availability');

console.log(
  `PASS: comparison table renders ${catalogueIds.length} approved features x 4 plans (${includedCells} green checks, ${excludedCells} red crosses, 0 question marks), the pale-red Standard column, red category headings, two-entry legend, data-backed tooltips, synced add-on bundling and an unapproved-cell guard in the DB seed.`,
);
