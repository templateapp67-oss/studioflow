import React, { useState } from 'react';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import TestRenderer, { act } from 'react-test-renderer';
import { NexoraPricingLandingPage } from '../src/components/nexora-landing/NexoraPricingLandingPage';
import { LandingContentProvider } from '../src/components/nexora-landing/LandingContentProvider';
import { PricingPlansSection } from '../src/components/nexora-landing/sections/PricingPlansSection';
import { FEATURE_PLAN_ENTITLEMENTS, PRICING_PLANS, type BillingInterval } from '../src/lib/nexoraPricing';
import { NEXORA_COMPARISON_MATRIX } from '../src/lib/nexoraComparisonMatrix';

const html = renderToStaticMarkup(<NexoraPricingLandingPage />);
for (const banned of ['Start with the essentials and upgrade as your business grows.', 'Confirmed plan highlights', 'Billing period', 'Annual plans are billed once for the full year', 'Compare every feature', 'sl-plan__includes', 'sl-plan__positioning', 'sl-billing__text']) {
  assert.ok(!html.toLowerCase().includes(banned.toLowerCase()), `Unwanted pricing element: ${banned}`);
}
const pricing = html.slice(html.indexOf('<section class="sl-section sl-compact-pricing"'), html.indexOf('<section class="sl-section sl-section--soft" id="comparison"'));
assert.ok(pricing.includes('A tailored software solution for every salon, spa, tattoo studio, nail studio, pet grooming center, and skin clinic, regardless of business size.'));
assert.ok(!/<ul\b|<li\b|sl-eyebrow|sl-billing/.test(pricing));
const cards = [...pricing.matchAll(/<article class="sl-compact-card[^>]*>[\s\S]*?<\/article>/g)].map(x => x[0]);
assert.equal(cards.length, 4);
for (const [i, card] of cards.entries()) {
  assert.ok(card.includes(`>${PRICING_PLANS[i].name}</h2>`));
  assert.ok(card.includes('Get Started'));
  assert.ok(!/<ul\b|<li\b|nx-compare|highlights/i.test(card));
  assert.equal((card.match(/<button\b/g) || []).length, 1);
  assert.equal((card.match(/<p\b/g) || []).length, 4);
}
assert.ok(cards[2].includes('Recommended') && cards[2].includes('is-recommended'));
const tableStart = html.indexOf('<table class="nx-compare"');
const table = html.slice(tableStart, html.indexOf('</table>', tableStart) + 8);
const categories = [...table.matchAll(/data-category="([^"]+)"/g)].map(x => x[1]);
assert.deepEqual(categories, NEXORA_COMPARISON_MATRIX.map(category => category.id));
assert.equal((table.match(/data-feature-id=/g) || []).length, 87);
assert.equal((table.match(/class="nx-compare__cell is-recommended"/g) || []).length, 87);
for (const [featureId, entitlement] of Object.entries(FEATURE_PLAN_ENTITLEMENTS)) {
  // Approved catalogue labels and exact matrix are checked in the shared table suite.
  assert.ok(PRICING_PLANS.every(plan => entitlement[plan.id] === 'included' || entitlement[plan.id] === 'excluded'), featureId);
}
assert.ok(table.includes('lucide-circle-check') && table.includes('lucide-circle-x'));
const css = readFileSync('src/components/nexora-pricing/table/comparisonTable.css', 'utf8');
for (const token of ['#00c853', '#ff3030', '#ffe9ea', '#eaeaea']) assert.ok(css.includes(token));
assert.ok(css.includes('.nx-compare tbody .nx-cat__cell') && css.includes('linear-gradient'));

let selected = '';
function Harness() {
  const [interval, setInterval] = useState<BillingInterval>('annual');
  return <LandingContentProvider><PricingPlansSection interval={interval} onIntervalChange={setInterval} onSelect={plan => { selected = `${plan.id}:${interval}`; }} /></LandingContentProvider>;
}
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: TestRenderer.ReactTestRenderer;
await act(async () => { renderer = TestRenderer.create(<Harness />); });
const buttons = () => renderer!.root.findAllByType('button');
assert.equal(buttons()[1].props['aria-pressed'], true);
await act(async () => { buttons()[0].props.onClick(); });
assert.equal(buttons()[0].props['aria-pressed'], true);
assert.equal(renderer!.root.findAllByProps({className: 'sl-compact-card__price'}).filter(node => node.children.includes('Not configured')).length, 4);
await act(async () => { buttons()[2].props.onClick(); });
assert.equal(selected, 'lite:monthly');
await act(async () => { buttons()[1].props.onClick(); buttons()[3].props.onClick(); });
// A click after the state update uses the selected billing interval.
await act(async () => { buttons()[3].props.onClick(); });
assert.equal(selected, 'grow:annual');
await act(async () => { renderer!.unmount(); });
const source = readFileSync('src/components/nexora-landing/NexoraPricingLandingPage.tsx', 'utf8');
for (const term of ['supabase.auth.getSession()', 'savePendingPricingSelection(selection)', 'pricingAuthPath(selection)', '<PlanSummaryDialog']) assert.ok(source.includes(term));
console.log('PASS: compact pricing-only content, nine categories, 87 rows, plan ordering, Standard highlight, responsive table, billing switching and registration hand-off.');
