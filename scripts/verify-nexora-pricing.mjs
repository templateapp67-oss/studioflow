import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const bundled = await build({
  entryPoints: ['src/lib/nexoraPricing.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const dataUrl = `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`;
const pricing = await import(dataUrl);

assert.deepEqual(
  pricing.PRICING_PLANS.map(({ id, annualMonthlyEquivalent, annualTotal }) => [id, annualMonthlyEquivalent, annualTotal]),
  [['lite', 625, 7500], ['grow', 1249, 14988], ['standard', 1999, 23988], ['premium', 4999, 59988]],
  'Approved annual rate and total pairs remain exact',
);
assert.ok(pricing.PRICING_PLANS.every(plan => plan.monthlyPrice === null), 'Do not invent monthly prices');
assert.equal(pricing.PRICING_PLANS.find(plan => plan.popular)?.id, 'grow');
assert.ok(pricing.PRICING_PLANS.every(plan => plan.annualMonthlyEquivalent * 12 === plan.annualTotal));
assert.deepEqual(
  pricing.FEATURE_CATEGORIES.map(category => category.id),
  ['presence', 'customers', 'billing', 'staff', 'automation', 'inventory', 'analytics', 'business'],
);
assert.ok(pricing.FEATURE_CATEGORIES.reduce((count, category) => count + category.items.length, 0) >= 64);
for (const featureId of ['whatsapp-api', 'attendance', 'advanced-salon-management']) {
  assert.equal(pricing.FEATURE_PLAN_ENTITLEMENTS[featureId].standard, 'included');
}
assert.ok(Object.entries(pricing.FEATURE_PLAN_ENTITLEMENTS).every(([featureId, plans]) =>
  ['lite', 'grow', 'standard', 'premium'].every(planId =>
    ['included', 'excluded', 'review'].includes(plans[planId]) &&
    (['whatsapp-api', 'attendance', 'advanced-salon-management'].includes(featureId) || plans[planId] === 'review'),
  ),
), 'Only explicitly approved entitlements are marked included');
const whatsAppAddOn = pricing.PRICING_ADD_ONS.find(addOn => addOn.id === 'wa-api');
assert.deepEqual(whatsAppAddOn.includedPlanIds, ['standard'], 'Do not charge twice for Standard WhatsApp API');
assert.ok(pricing.PRICING_ADD_ONS.every(addOn => addOn.price === null && addOn.availability === 'unconfigured'));
assert.equal(pricing.PRICING_FAQS.length, 15);

const storage = new Map();
globalThis.sessionStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
};
const selection = { planId: 'grow', billingInterval: 'annual', savedAt: Date.now() };
pricing.savePendingPricingSelection(selection);
assert.deepEqual(pricing.readPendingPricingSelection(), selection);
assert.equal(pricing.pricingAuthPath(selection), '/login?auth=signup&pricing_plan=grow&billing_interval=annual');
assert.equal(pricing.pricingResumePath(selection), '/pricing?resume_plan=grow&billing_interval=annual');
storage.set(pricing.PENDING_PRICING_SELECTION_KEY, JSON.stringify({ ...selection, savedAt: Date.now() - 31 * 60 * 1000 }));
assert.equal(pricing.readPendingPricingSelection(), null, 'Expired pending selections are discarded');
pricing.clearPendingPricingSelection();
assert.equal(storage.has(pricing.PENDING_PRICING_SELECTION_KEY), false);

const page = readFileSync('src/components/PricingPage.tsx', 'utf8');
const authPage = readFileSync('src/components/AuthPage.tsx', 'utf8');
const styles = readFileSync('src/components/pricingPage.css', 'utf8');
assert.ok(page.includes("supabase.auth.getSession()"), 'Plan selection checks the current authentication session');
assert.ok(page.includes('aria-pressed={activeView===view}') && page.includes('onClick={()=>setActiveView(view)}'), 'Dashboard preview section controls are keyboard-operable interactive buttons');
assert.ok(page.includes('no live salon data') && page.includes('No live business data'), 'Illustrative preview does not imply real customer or sales metrics');
assert.ok(page.includes('Subscription checkout is not configured'), 'No false subscription payment success is shown');
assert.ok(!page.includes("invoke('studioflow-payments'"), 'Subscription selection must not reuse salon booking-deposit checkout');
assert.ok(authPage.includes('pricingReturnPath') && authPage.includes('location.assign(pricingReturnPath)'), 'Authentication returns to the selected pricing summary');
assert.ok(styles.includes('@media(max-width:350px)') && styles.includes('@media(max-width:480px)') && styles.includes('@media(max-width:760px)') && styles.includes('@media(max-width:820px)') && styles.includes('@media(max-width:1050px)'), 'Mobile/tablet/desktop responsive breakpoints are present');

console.log('PASS Nexora pricing config, approved annual totals, fail-closed feature map, non-duplicated WhatsApp add-on, FAQ count, safe auth return, no booking-checkout reuse, and responsive breakpoint definitions.');
