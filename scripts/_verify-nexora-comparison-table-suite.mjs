import React from 'react';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { NEXORA_COMPARISON_MATRIX, NEXORA_COMPARISON_PLANS, NEXORA_COMPARISON_ROW_COUNT } from '../src/lib/nexoraComparisonMatrix.ts';
import { PRICING_PLANS } from '../src/lib/nexoraPricing.ts';
import { FeatureComparisonTable } from '../src/components/nexora-pricing/table/FeatureComparisonTable.tsx';

const expected = [
  ['Add-ons', 3], ['Essentials', 23], ['Customer Acquisition', 6], ['Retention and Growth', 7],
  ['Marketing', 13], ['Business Management', 8], ['Advanced Features', 11],
  ['Analytics and Reports', 12], ['Support', 4],
];
assert.deepEqual(NEXORA_COMPARISON_MATRIX.map(({ name, features }) => [name, features.length]), expected);
assert.equal(NEXORA_COMPARISON_MATRIX.length, 9);
assert.equal(NEXORA_COMPARISON_ROW_COUNT, 87);
assert.deepEqual(NEXORA_COMPARISON_PLANS, ['lite', 'grow', 'standard', 'premium']);
const allRows = NEXORA_COMPARISON_MATRIX.flatMap((category) => category.features);
assert.equal(new Set(allRows.map((feature) => feature.id)).size, 87, 'Feature IDs are unique');
assert.equal(allRows.filter((feature) => feature.label === 'Resource Management').length, 1);
assert.deepEqual(NEXORA_COMPARISON_MATRIX[0].features.map((feature) => feature.label), [
  'Official WhatsApp API Included', 'Manual Attendance Register Included', 'Biometric Attendance Register Included',
]);
const byLabel = new Map(allRows.map((feature) => [feature.label, feature]));
for (const [label, limits] of [
  ['Appointments', ['300/month', 'Unlimited', 'Unlimited', 'Unlimited']],
  ['Products', ['25 SKUs', '50 SKUs', 'Unlimited', 'Unlimited']],
  ['Staff Included', ['4', '10', '15', '50']],
  ['Customer', ['Unlimited', 'Unlimited', 'Unlimited', 'Unlimited']],
]) {
  assert.deepEqual(NEXORA_COMPARISON_PLANS.map((plan) => byLabel.get(label)?.values[plan]), limits, `${label} limits`);
}
assert.equal(byLabel.get('Advanced Inventory Management')?.type, 'boolean');
assert.deepEqual(NEXORA_COMPARISON_PLANS.map((plan) => byLabel.get('Advanced Inventory Management')?.values[plan]), [true, true, true, true]);
assert.ok(!byLabel.has('Advanced Marketing Automation'));
assert.ok(!byLabel.has('Additional Staff Seats'));
assert.ok(!byLabel.has('Additional Branches'));
assert.ok(!byLabel.has('Advanced Analytics'));
assert.ok(!byLabel.has('Premium Website Customization'));
assert.equal(NEXORA_COMPARISON_MATRIX.find((category) => category.name === 'Support')?.features.find((feature) => feature.label === 'Priority Support')?.values.premium, true);

const html = renderToStaticMarkup(React.createElement(FeatureComparisonTable, { idPrefix: 'verification' }));
assert.ok(html.includes('<table class="nx-compare"'), 'Renders semantic comparison table');
assert.ok(html.includes('data-feature-count="87"'));
assert.ok(html.includes('scope="row"'));
const headerOrder = [...html.matchAll(/aria-label="(Lite|Grow|Standard|Premium) plan"/g)].map((match) => match[1]);
assert.deepEqual(headerOrder, ['Lite', 'Grow', 'Standard', 'Premium']);
const renderedCategories = [...html.matchAll(/class="nx-cat__name">([^<]+)</g)].map((match) => match[1]);
assert.deepEqual(renderedCategories, expected.map(([name]) => name));
const tbody = html.slice(html.indexOf('<tbody>'), html.indexOf('</tbody>'));
const boolRows = allRows.filter((feature) => feature.type === 'boolean');
const expectedIncluded = boolRows.reduce((sum, feature) => sum + NEXORA_COMPARISON_PLANS.filter((plan) => feature.values[plan] === true).length, 0);
const expectedExcluded = boolRows.length * 4 - expectedIncluded;
assert.equal((tbody.match(/data-status="included"/g) || []).length, expectedIncluded);
assert.equal((tbody.match(/data-status="excluded"/g) || []).length, expectedExcluded);
assert.equal((tbody.match(/data-feature-type="numeric"/g) || []).length, 4);
assert.ok(tbody.includes('300/month') && tbody.includes('25 SKUs') && tbody.includes('50 SKUs'));
for (const feature of allRows) {
  const rowMatch = tbody.match(new RegExp(`<tr[^>]*data-feature-id="${feature.id}"[^>]*>([\\s\\S]*?)<\\/tr>`));
  assert.ok(rowMatch, `Rendered row exists for ${feature.id}`);
  for (const [index, plan] of NEXORA_COMPARISON_PLANS.entries()) {
    const cell = rowMatch[1].match(new RegExp(`<td[^>]*data-plan="${plan}"[^>]*>([\\s\\S]*?)<\\/td>`));
    assert.ok(cell, `${feature.id} has ${plan} cell`);
    const expectedValue = feature.values[plan];
    if (typeof expectedValue === 'boolean') {
      assert.ok(cell[1].includes(`data-status="${expectedValue ? 'included' : 'excluded'}"`), `${feature.id}/${plan} boolean matches reference`);
    } else {
      assert.ok(cell[1].includes(expectedValue), `${feature.id}/${plan} numeric limit matches reference`);
    }
    assert.equal(plan, ['lite', 'grow', 'standard', 'premium'][index]);
  }
}
assert.equal((tbody.match(/class="nx-compare__cell is-recommended"/g) || []).length, 87, 'Standard is highlighted across every feature row');
assert.ok(html.includes('class="nx-planhead is-recommended"'), 'Standard heading remains highlighted');
const css = readFileSync('src/components/nexora-pricing/table/comparisonTable.css', 'utf8');
assert.ok(css.includes('--nx-table-standard-bg: #ffe9ea'), 'Pale-pink Standard highlight remains');
assert.ok(css.includes('overflow-x: auto'), 'Mobile table scroll remains contained');
assert.deepEqual(PRICING_PLANS.map((plan) => [plan.id, plan.annualMonthlyEquivalent, plan.annualTotal, plan.monthlyPrice]), [
  ['lite', 7990 / 12, 7990, 799], ['grow', 14990 / 12, 14990, 1499], ['standard', 24990 / 12, 24990, 2499], ['premium', 49990 / 12, 49990, 4999],
], 'Subscription values reflect the approved INR monthly and annual tiers');

console.log(`PASS: nine categories and ${NEXORA_COMPARISON_ROW_COUNT} feature rows render from the single matrix; four plan order, numeric limits, boolean mappings, Standard highlight and price values verified.`);
