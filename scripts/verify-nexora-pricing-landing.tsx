import React from 'react';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { NexoraPricingLandingPage } from '../src/components/nexora-landing/NexoraPricingLandingPage';
import { FEATURE_CATEGORIES, PRICING_FAQS, PRICING_PLANS, PUBLISHED_COMPARISON_FEATURE_IDS } from '../src/lib/nexoraPricing';
import { PRICING_ADD_ONS } from '../src/lib/nexoraPricing';

const html = renderToStaticMarkup(<NexoraPricingLandingPage />);
const strip = (value: string) =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
// The disclosure list states what the page does NOT promise; it is checked
// separately so a negated statement is never read as a promise.
const disclosuresBlock = html.match(/<ul class="sl-final__disclosures">[\s\S]*?<\/ul>/)?.[0] ?? '';
const disclosureText = strip(disclosuresBlock);
const pageText = strip(html.replace(disclosuresBlock, ' '));

/* --- Structure ------------------------------------------------------------ */
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'The pricing landing page has exactly one H1');
assert.ok(html.includes('id="sl-hero-title"'), 'The H1 is the hero headline');
assert.ok(html.includes('<main id="sl-main">'), 'A main landmark exists');
assert.ok(html.includes('href="#sl-main"'), 'A skip link targets the main landmark');
assert.ok(html.includes('<header class="sl-header'), 'A banner landmark exists');
assert.ok(html.includes('<footer class="sl-footer"'), 'A contentinfo landmark exists');

const requiredSections = [
  'id="salon-categories"',
  'id="platform"',
  'id="features"',
  'id="how-it-works"',
  'id="pricing"',
  'id="comparison"',
  'id="benefits"',
  'id="product-preview"',
  'id="testimonials"',
  'id="faq"',
  'id="get-started"',
];
const positions = requiredSections.map((marker) => html.indexOf(marker));
assert.ok(positions.every((position) => position >= 0), 'Every documented section is rendered');
assert.ok(
  positions.every((position, index) => index === 0 || position > positions[index - 1]),
  'The sections render in the documented order',
);

/* --- Navigation ----------------------------------------------------------- */
const sectionIds = new Set(Array.from(html.matchAll(/id="([^"]+)"/g)).map((match) => match[1]));
const anchors = Array.from(html.matchAll(/href="(#[^"]*)"/g)).map((match) => match[1]);
assert.ok(anchors.length > 10, 'The page uses section anchors for in-page navigation');
for (const anchor of anchors) {
  assert.notEqual(anchor, '#', 'No placeholder "#" links are used');
  assert.ok(sectionIds.has(anchor.slice(1)), `Anchor ${anchor} resolves to a rendered section`);
}
for (const label of ['Platform', 'Features', 'Salon categories', 'Pricing', 'FAQs']) {
  assert.ok(pageText.includes(label), `The header navigation exposes "${label}"`);
}
const absoluteLinks = Array.from(html.matchAll(/href="(\/[^"#]*)"/g)).map((match) => match[1].replace(/&amp;/g, '&'));
const allowedRoutes = new Set([
  '/',
  '/login',
  '/login?auth=signup',
  '/login?auth=signup&pricing_plan=lite&billing_interval=annual',
  '/login?auth=signup&pricing_plan=grow&billing_interval=annual',
  '/login?auth=signup&pricing_plan=standard&billing_interval=annual',
  '/login?auth=signup&pricing_plan=premium&billing_interval=annual',
  '/?app=1&module=22',
  '/pricing',
  '/salon-os',
  '/privacy',
]);
for (const route of absoluteLinks) {
  assert.ok(allowedRoutes.has(route), `Route ${route} is a configured destination`);
}

/* --- Hero ----------------------------------------------------------------- */
assert.ok(
  pageText.includes('Run Your Salon. Grow Your Business. All From One Place.'),
  'The hero uses the approved headline',
);
assert.ok(pageText.includes('Explore Plans'), 'The primary hero action leads to the plans');
assert.ok(html.includes('href="#pricing"'), 'The primary hero action targets the plans section');
assert.ok(pageText.includes('Request a Demo'), 'The secondary hero action requests a demo');
assert.ok(html.includes('sl-btn--secondary'), 'The demo action is rendered as an interactive control');
assert.ok(pageText.includes('Illustrative'), 'The preview is labelled as illustrative');

/* --- Approved pricing ----------------------------------------------------- */
for (const plan of PRICING_PLANS) {
  const monthly = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(plan.annualMonthlyEquivalent);
  const total = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(plan.annualTotal);
  assert.ok(pageText.includes(plan.name), `Plan ${plan.name} is shown`);
  assert.ok(pageText.includes(monthly), `Plan ${plan.name} shows its monthly equivalent (${monthly})`);
  assert.ok(pageText.includes(total), `Plan ${plan.name} shows its annual total (${total})`);
}
assert.ok(pageText.includes('GST inclusive'), 'GST inclusion is explained');
assert.ok(pageText.includes('billed annually'), 'The annual billing basis is unmistakable');
assert.ok(pageText.includes('subscription checkout'), 'The missing subscription checkout is disclosed');
assert.ok(!pageText.includes('Free trial'), 'No free-trial promise is published');
assert.ok(!pageText.includes('money back'), 'No money-back promise is published');
assert.ok(!/\d+% off/i.test(pageText), 'No invented discount percentage is published');
assert.ok(!/\bper month\b(?![^.]{0,40}equivalent)/i.test(pageText) || pageText.includes('Monthly equivalent'), 'No monthly instalment is implied');

/* --- Comparison matrix ---------------------------------------------------- */
const catalogueIds = FEATURE_CATEGORIES.flatMap((category) => category.items).map((item) => item.id);
assert.ok(html.includes('<table class="nx-compare">'), 'The comparison uses real table semantics');
assert.ok(html.includes('scope="row"'), 'Feature rows use row headers');
assert.ok(html.includes('scope="colgroup"'), 'Feature groups use column group headers');
assert.ok(
  html.includes('role="region"') && html.includes('aria-label="Feature comparison by plan.'),
  'The scrollable table region is labelled',
);
// The customer-facing table publishes exactly two binary states; no cell is
// allowed to sit in an unresolved "pending" state.
for (const label of ['Included', 'Not included']) {
  assert.ok(html.includes(label), `Every published entitlement state has a text alternative: ${label}`);
}
assert.ok(!html.includes('Pending plan confirmation'), 'No plan cell is published as pending');
assert.ok(!html.includes('lucide-circle-help'), 'No question-mark icon appears in the comparison table');
const renderedFeatureRows = (html.match(/class="nx-compare__feature-label"/g) || []).length;
assert.equal(renderedFeatureRows, PUBLISHED_COMPARISON_FEATURE_IDS.length, 'Every approved catalogue feature is listed exactly once');
const renderedGroups = (html.match(/class="nx-cat__cell"/g) || []).length;
assert.equal(renderedGroups, 9, 'Every documented comparison group renders a heading row');

/* --- Add-ons -------------------------------------------------------------- */
assert.equal(PRICING_ADD_ONS.length, 8, 'Eight add-ons are documented');
for (const addon of PRICING_ADD_ONS) {
  assert.ok(pageText.includes(addon.name), `Add-on "${addon.name}" is listed`);
}
assert.ok(
  pageText.includes('Add-ons cannot be purchased on this page'),
  'The page states that add-ons cannot be purchased here',
);
assert.ok(!/₹\s?\d[\d,]*\s*(?:\/|per )\s*(month|user|seat)/i.test(pageText), 'No add-on price is invented');

/* --- Salon Promotion Studio is removed ------------------------------------ */
assert.ok(!html.includes('salon-marketing'), 'The retired Salon Promotion Studio anchor is not rendered');
assert.ok(!html.includes('sl-promo'), 'No Salon Promotion Studio styling hook is rendered');
assert.ok(!pageText.includes('SALON PROMOTION STUDIO'), 'The Salon Promotion Studio heading is removed');
assert.ok(!pageText.includes('Original sample creatives built for this page'), 'The creative gallery is removed');
assert.ok(!pageText.includes('Where you can share'), 'The promotion sharing list is removed');

/* --- Honest social proof -------------------------------------------------- */
assert.ok(
  pageText.includes('Approved customer quotes are published here as they are collected.'),
  'The empty testimonial state is disclosed',
);
assert.ok(!html.includes('★'), 'No fake rating is rendered');
assert.ok(!/\b\d+\+?\s*(happy|customers|clients|salons|reviews)\b/i.test(pageText), 'No invented customer counts are published');
assert.ok(!/guarantee/i.test(pageText), 'No guarantee claim is published');
assert.ok(
  disclosureText.includes('refund guarantee') || disclosureText.includes('money-back'),
  'The page explicitly discloses that no refund or money-back term is offered',
);

/* --- FAQ ------------------------------------------------------------------ */
assert.equal(PRICING_FAQS.length, 15, 'The published FAQ answers the fifteen documented questions');
assert.equal(
  (html.match(/aria-expanded="[^"]*" aria-controls="sl-faq-panel-/g) || []).length,
  15,
  'Every FAQ trigger exposes its state',
);
assert.equal(
  (html.match(/role="region" aria-labelledby="sl-faq-button-/g) || []).length,
  15,
  'Every FAQ answer panel is a labelled region',
);
for (const [question] of PRICING_FAQS) {
  assert.ok(pageText.includes(question), `FAQ question "${question}" is visible`);
}

/* --- Route and deployment wiring ------------------------------------------ */
const appRouter = readFileSync('src/AppRouter.tsx', 'utf8');
assert.ok(
  appRouter.includes("publicPath === '/pricing'") && appRouter.includes('<NexoraPricingLandingPage />'),
  '/pricing renders the complete NEXORA SALONOS landing page',
);
assert.ok(
  appRouter.includes("publicPath === '/salon-os'") && appRouter.includes('<NexoraSalonLandingPage />'),
  '/salon-os keeps its own public landing page',
);
assert.ok(
  appRouter.includes("new Set(['/salon-os', '/pricing', '/privacy'])"),
  'The public marketing routes stay outside the owner workspace bundle',
);
const vercel = readFileSync('vercel.json', 'utf8');
assert.ok(
  vercel.includes('"source": "/pricing"') && vercel.includes('"destination": "/pricing/index.html"'),
  'Vercel serves the prerendered /pricing document',
);
assert.ok(vercel.includes('"source": "/salon-os"'), 'The existing /salon-os rewrite is preserved');
const server = readFileSync('server.ts', 'utf8');
assert.ok(
  server.includes('nexoraDemoLeadHandler') && server.includes('"/api/nexora-demo-lead"'),
  'The Express server delegates the demo endpoint to the shared handler',
);
assert.ok(server.includes('path.join(distPath, "pricing", "index.html")'), 'The Node server serves dist/pricing');
const apiAdapter = readFileSync('api/nexora-demo-lead.ts', 'utf8');
assert.ok(
  apiAdapter.includes('nexoraDemoLeadHandler'),
  'A Vercel-compatible API adapter exposes the same handler',
);

/* --- Secrets never reach the browser -------------------------------------- */
const envExample = readFileSync('.env.example', 'utf8');
assert.ok(envExample.includes('VITE_SUPABASE_URL'), 'The browser project URL is configurable');
assert.ok(envExample.includes('VITE_SUPABASE_PUBLISHABLE_KEY'), 'The publishable browser key is configurable');
assert.ok(
  !/VITE_[A-Z_]*SERVICE_ROLE/.test(envExample) && !/VITE_[A-Z_]*SECRET/.test(envExample),
  'No service-role or secret key is exposed through a VITE_ variable',
);
const supabaseClient = readFileSync('src/lib/supabase.ts', 'utf8');
assert.ok(
  supabaseClient.includes('VITE_SUPABASE_PUBLISHABLE_KEY') && supabaseClient.includes('VITE_SUPABASE_ANON_KEY'),
  'The single browser client accepts the publishable key and keeps the legacy alias',
);
const browserSources = [
  'src/lib/nexoraLandingData.ts',
  'src/lib/supabase.ts',
  'src/components/nexora-landing/LandingContentProvider.tsx',
  'src/components/nexora-landing/NexoraPricingLandingPage.tsx',
  'src/components/nexora-pricing/DemoProvider.tsx',
]
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');
assert.ok(!/service_role|SUPABASE_SERVICE_ROLE_KEY/.test(browserSources), 'No privileged credential is referenced in browser code');
assert.ok(
  !/\.from\(\s*['"\`]landing_leads['"\`]\s*\)/.test(browserSources),
  'The browser never queries the private lead table',
);
assert.ok(browserSources.includes("supabase.functions.invoke('submit-landing-lead'"), 'Leaves are submitted through the Edge Function');

/* --- Prerendered document -------------------------------------------------- */
const prerendered = 'dist/pricing/index.html';
if (existsSync(prerendered)) {
  const document = readFileSync(prerendered, 'utf8');
  assert.ok(
    document.includes('<link rel="canonical" href="https://nexorasalon.online/pricing"'),
    'The prerendered page owns its canonical URL',
  );
  assert.ok(
    document.includes('<title>NEXORA SalonOS | Salon Management Software, Pricing &amp; Features</title>'),
    'The prerendered page ships the published title',
  );
  assert.ok(document.includes('application/ld+json'), 'The prerendered page ships structured data');
  assert.ok(document.includes('"FAQPage"'), 'The structured data describes the visible FAQ');
  assert.ok(document.includes('"AggregateOffer"'), 'The structured data describes the approved price range');
  assert.ok(!document.includes('AggregateRating'), 'No aggregate rating is published');
  assert.ok(document.includes('poppins-latin-400-normal.woff2'), 'The prerendered page preloads its local font');
  assert.ok(!document.includes('fonts.googleapis.com'), 'The prerendered page has no third-party font request');
}

console.log(
  'PASS: /pricing renders the complete NEXORA SALONOS landing page with approved annual pricing, a complete comparison matrix, honest add-on and FAQ content, a working route, a Vercel-compatible demo endpoint and a prerendered SEO document.',
);
