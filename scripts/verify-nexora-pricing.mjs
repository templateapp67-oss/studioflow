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
const hero = readFileSync('src/components/nexora-pricing/sections/Hero.tsx', 'utf8');
const pricingGrid = readFileSync('src/components/nexora-pricing/sections/PricingGrid.tsx', 'utf8');
const selectionDialog = readFileSync('src/components/nexora-pricing/sections/SelectionDialog.tsx', 'utf8');
const authPage = readFileSync('src/components/AuthPage.tsx', 'utf8');
const landingPage = readFileSync('src/components/nexora-landing/NexoraSalonLandingPage.tsx', 'utf8');
const appRouter = readFileSync('src/AppRouter.tsx', 'utf8');
const landingContent = readFileSync('src/lib/nexoraLandingContent.ts', 'utf8');
const templateSection = readFileSync('src/components/nexora-landing/sections/TemplateShowcase.tsx', 'utf8');
const resultsDisclosure = readFileSync('src/components/nexora-landing/sections/ResultsDisclosure.tsx', 'utf8');
const sitemap = readFileSync('server/sitemap.ts', 'utf8');
const styles = readFileSync('src/components/pricingPage.css', 'utf8');
const demoProvider = readFileSync('src/components/nexora-pricing/DemoProvider.tsx', 'utf8');
const demoCta = readFileSync('src/components/nexora-pricing/CtaButton.tsx', 'utf8');
const server = readFileSync('server.ts', 'utf8');
const content = readFileSync('src/lib/nexoraPricing.ts', 'utf8');
assert.ok(page.includes("supabase.auth.getSession()"), 'Plan selection checks the current authentication session');
assert.ok(hero.includes('aria-pressed={activeView===view}') && hero.includes('onClick={()=>setActiveView(view)}'), 'Dashboard preview section controls are keyboard-operable interactive buttons');
assert.ok(hero.includes('no live salon data') && hero.includes('No live business data'), 'Illustrative preview does not imply real customer or sales metrics');
assert.ok(selectionDialog.includes('Subscription checkout is not configured'), 'No false subscription payment success is shown');
assert.ok(pricingGrid.includes('Approved annual prices are GST-inclusive') && pricing.PRICING_FAQS.some(([question, answer]) => question === 'How does annual billing work?' && answer.includes('include GST')), 'Approved annual totals communicate GST inclusion');
assert.ok(!page.includes("invoke('studioflow-payments'"), 'Subscription selection must not reuse salon booking-deposit checkout');
assert.ok(authPage.includes('pricingReturnPath') && authPage.includes('location.assign(pricingReturnPath)'), 'Authentication returns to the selected pricing summary');
assert.ok(page.includes('<DemoProvider>') && page.includes('<DemoSection/>') && page.includes('<FAQ/>') && page.includes('<PricingFooter/>'), 'Pricing page composes separate sections through the current Vite/React app');
const sectionSequence = ['<PriceHeader/>', '<Hero ', '<PricingGrid ', '<FeatureMatrix/>', '<AddOns/>', '<Benefits/>', '<DemoSection/>', '<FAQ/>', '<FinalCTA ', '<PricingFooter/>'];
const sectionPositions = sectionSequence.map(section => page.indexOf(section));
assert.ok(sectionPositions.every(position => position >= 0) && sectionPositions.every((position, index) => index === 0 || position > sectionPositions[index - 1]), 'The ten pricing landing-page sections render in the documented order');
assert.ok(appRouter.includes("publicPath === '/salon-os'") && landingPage.includes('<LandingHero/>') && landingPage.includes('<FeatureMatrix/>'), 'The full adapted SalonOS landing page is an additive public route');
const landingSequence = ['<LandingHero/>', '<TemplateShowcase/>', '<AudienceSection/>', '<VerifiedOverview/>', '<FeatureMatrix/>', '<WorkflowSection/>', '<ModuleGrid/>', '<ResultsDisclosure/>', '<TrustAndDemo/>', '<FAQ/>'];
const landingPositions = landingSequence.map(section => landingPage.indexOf(section));
assert.ok(landingPositions.every(position => position >= 0) && landingPositions.every((position, index) => index === 0 || position > landingPositions[index - 1]), 'The complete landing page composes ten sections in order');
assert.ok(landingContent.includes('NEXORA_TEMPLATE_META.length') && templateSection.includes('These are product templates—not partner salons'), 'Sample partner names are replaced with verifiable template catalogue content');
assert.ok(resultsDisclosure.includes('No independently verified revenue-uplift') && landingContent.includes('No refund guarantee'), 'Sample ROI and guarantee claims are replaced with honest disclosures');
assert.ok(sitemap.includes('origin + "/salon-os"') && sitemap.includes('origin + "/pricing"'), 'Both public marketing routes are included in the sitemap');
assert.ok(demoProvider.includes("fetch('/api/nexora-demo-lead'") && demoProvider.includes('id={consentId} type="checkbox" required') && demoProvider.includes('checked={lead.consent}'), 'Demo dialog validates consent and posts to the server-side lead route');
assert.ok(demoCta.includes('openDemo()'), 'Shared marketing CTAs open the demo dialog');
assert.ok(server.includes("app.post(\"/api/nexora-demo-lead\"") && server.includes('NEXORA_CRM_LEAD_ENDPOINT') && server.includes("target.protocol !== 'https:'") && server.includes('NEXORA_CRM_LEAD_TOKEN'), 'Demo lead forwarding requires server-side HTTPS CRM configuration');
assert.ok(content.includes('SAMPLE_CONTENT = false') && !content.includes('Sample testimonial') && !content.includes('ROI metric'), 'No unverified testimonial, rating, partner or ROI claims are published');
assert.ok(styles.includes('@media(max-width:350px)') && styles.includes('@media(max-width:480px)') && styles.includes('@media(max-width:760px)') && styles.includes('@media(max-width:820px)') && styles.includes('@media(max-width:1050px)'), 'Mobile/tablet/desktop responsive breakpoints are present');

console.log('PASS modular Nexora pricing sections, approved GST-inclusive annual totals, fail-closed feature map, quote-only add-ons, demo lead security posture, auth-resumed selection, FAQ count, no booking-checkout reuse, and responsive breakpoint definitions.');
