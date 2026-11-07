import React from 'react';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { NexoraSalonLandingPage } from '../src/components/nexora-landing/NexoraSalonLandingPage';
import { LANDING_ICON_REGISTRY } from '../src/components/nexora-landing/icons';
import {
  NEXORA_BUSINESS_BENEFITS,
  NEXORA_BUSINESS_TYPES,
  NEXORA_HOW_IT_WORKS,
  NEXORA_LANDING_COMPARISON_GROUPS,
  NEXORA_LANDING_FAQS,
  NEXORA_LANDING_FEATURE_CATEGORIES,
  NEXORA_LANDING_NAV,
  NEXORA_LANDING_TESTIMONIALS,
  NEXORA_PROMOTION_CHANNELS,
  NEXORA_PROMOTION_CREATIVES,
  landingFeatureItems,
} from '../src/lib/nexoraLandingContent';
import { FEATURE_CATEGORIES, FEATURE_PLAN_ENTITLEMENTS, PRICING_PLANS } from '../src/lib/nexoraPricing';

const html = renderToStaticMarkup(<NexoraSalonLandingPage />);
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
// The disclosure list states what the page does NOT promise. It is checked
// separately so a negated statement is never mistaken for a promise.
const disclosuresBlock = html.match(/<ul class="sl-final__disclosures">[\s\S]*?<\/ul>/)?.[0] ?? '';
const disclosureText = strip(disclosuresBlock);
const priceText = strip(html.replace(disclosuresBlock, ' '));

// --- Structure -------------------------------------------------------------
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'The landing page has exactly one H1');
assert.ok(html.includes('id="sl-hero-title"'), 'The H1 is the hero headline');
assert.ok(priceText.includes('Run Your Salon. Grow Your Business. All From One Place.'), 'Hero headline copy renders');
assert.ok(html.includes('<main id="sl-main">'), 'A main landmark exists');
assert.ok(html.includes('href="#sl-main"'), 'A skip link targets the main landmark');
assert.ok(html.includes('<header class="sl-header'), 'A banner landmark exists');
assert.ok(html.includes('<footer class="sl-footer"'), 'A contentinfo landmark exists');

const sectionOrder = [
  'id="solutions"',
  'id="features"',
  'id="how-it-works"',
  'id="pricing"',
  'id="comparison"',
  'id="benefits"',
  'id="testimonials"',
  'id="faq"',
  'id="get-started"',
];
const positions = sectionOrder.map(marker => html.indexOf(marker));
assert.ok(positions.every(position => position >= 0), 'Every documented landing section is rendered');
assert.ok(positions.every((position, index) => index === 0 || position > positions[index - 1]), 'Landing sections render in the documented order');

// --- Navigation and destinations ------------------------------------------
const sectionIds = new Set(Array.from(html.matchAll(/id="([^"]+)"/g)).map(match => match[1]));
const anchors = Array.from(html.matchAll(/href="(#[^"]*)"/g)).map(match => match[1]);
assert.ok(anchors.length > 10, 'The page uses section anchors for in-page navigation');
for (const anchor of anchors) {
  assert.notEqual(anchor, '#', 'No placeholder "#" links are used');
  assert.ok(sectionIds.has(anchor.slice(1)), `Anchor ${anchor} resolves to a rendered section`);
}
for (const link of NEXORA_LANDING_NAV) {
  if (link.href.startsWith('#')) assert.ok(sectionIds.has(link.href.slice(1)), `Navigation link ${link.href} resolves`);
}
const absoluteLinks = Array.from(html.matchAll(/href="(\/[^"#]*)"/g)).map(match => match[1].replace(/&amp;/g, '&'));
const allowedRoutes = new Set(['/', '/login', '/login?auth=signup', '/login?auth=signup&pricing_plan=lite&billing_interval=annual', '/login?auth=signup&pricing_plan=grow&billing_interval=annual', '/login?auth=signup&pricing_plan=standard&billing_interval=annual', '/?app=1&module=22', '/pricing', '/salon-os', '/privacy']);
for (const route of absoluteLinks) {
  assert.ok(allowedRoutes.has(route), `Route ${route} is a configured destination`);
}

// --- Pricing integrity -----------------------------------------------------
for (const plan of PRICING_PLANS) {
  assert.ok(priceText.includes(plan.name), `Plan ${plan.name} is shown`);
  const monthly = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(plan.annualMonthlyEquivalent);
  const total = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(plan.annualTotal);
  assert.ok(priceText.includes(monthly), `Plan ${plan.name} shows its approved monthly equivalent (${monthly})`);
  assert.ok(priceText.includes(total), `Plan ${plan.name} shows its approved annual total (${total})`);
}
assert.equal(PRICING_PLANS.find(plan => plan.popular)?.id, 'standard', 'Standard is the recommended plan');
assert.ok(priceText.includes('Recommended'), 'The recommended plan is labelled');
assert.ok(priceText.includes('GST inclusive'), 'GST inclusion is explained');
assert.ok(priceText.includes('Not configured'), 'Unconfigured monthly billing is disclosed, not invented');
assert.ok(!priceText.includes('Free trial'), 'No free-trial promise is published');
assert.ok(!priceText.includes('money back') && !priceText.includes('refund guarantee'), 'No refund promise is published');
assert.ok(
  disclosureText.includes('refund guarantee') || disclosureText.includes('money-back'),
  'The page explicitly discloses that no refund or money-back term is offered',
);
assert.ok(!/\d+% off/i.test(priceText), 'No invented discount percentage is published');

// --- Comparison table ------------------------------------------------------
const catalogueIds = FEATURE_CATEGORIES.flatMap(category => category.items).map(item => item.id);
const groupedIds = NEXORA_LANDING_COMPARISON_GROUPS.flatMap(group => group.featureIds);
assert.deepEqual(groupedIds.slice().sort(), catalogueIds.slice().sort(), 'The comparison table lists every approved catalogue feature exactly once');
assert.ok(
  !html.includes('<table class="sl-table">'),
  'The companion route does not repeat the full comparison matrix',
);
assert.ok(
  html.includes('/pricing#comparison'),
  'The companion route points at the canonical pricing page for the full comparison',
);
assert.ok(
  !html.includes('scope="row"') && !html.includes('scope="colgroup"'),
  'The companion route carries no comparison table (it lives on /pricing)',
);
assert.ok(
  !html.includes('aria-label="Feature comparison by plan.'),
  'The companion route does not announce a comparison table it does not render',
);
assert.ok(
  !html.includes('aria-label="Standard plan, recommended plan"'),
  'The companion route announces no comparison column (it lives on /pricing)',
);

// --- Feature groups --------------------------------------------------------
for (const category of NEXORA_LANDING_FEATURE_CATEGORIES) {
  const items = landingFeatureItems(category);
  assert.ok(items.length > 0, `Feature group ${category.id} resolves approved catalogue entries`);
  assert.equal(items.length, category.featureIds.length, `Feature group ${category.id} has no unresolved ids`);
  for (const item of items) assert.ok(priceText.includes(item.label), `Approved feature "${item.label}" is listed`);
}

// --- FAQ -------------------------------------------------------------------
assert.equal(NEXORA_LANDING_FAQS.length, 15, 'The landing FAQ answers the fifteen documented questions');
assert.equal((html.match(/aria-expanded="[^"]*" aria-controls="sl-faq-panel-/g) || []).length, 15, 'Every FAQ trigger exposes its state');
assert.equal((html.match(/role="region" aria-labelledby="sl-faq-button-/g) || []).length, 15, 'Every FAQ answer panel is a labelled region');
assert.ok((html.match(/aria-controls="sl-faq-panel-/g) || []).length === 15, 'Every FAQ trigger controls its panel');

// --- Honest social proof ---------------------------------------------------
assert.equal(NEXORA_LANDING_TESTIMONIALS.length, 0, 'No testimonial is published without approval');
assert.ok(priceText.includes('Approved customer quotes are published here as they are collected.'), 'The empty testimonial state is disclosed');
assert.ok(!html.includes('★') && !html.includes('aria-label="5 out of 5'), 'No fake rating is rendered');
assert.ok(!/\b\d+\+?\s*(happy|customers|clients|salons|reviews)\b/i.test(strip(html)), 'No invented customer or review counts are published');
assert.ok(!/guarantee/i.test(priceText), 'No guarantee claim is published');

// --- Product experience section is removed ---------------------------------
assert.ok(!html.includes('product-preview'), 'The retired product preview anchor is not rendered');
assert.ok(!html.includes('sl-preview'), 'No product preview styling hook is rendered');
assert.ok(!priceText.includes('A Clear View of Your Salon Business'), 'The product preview heading is removed');
assert.ok(
  !priceText.includes('Daily slots, booking status and availability in one owner-side view.'),
  'The appointment preview card is removed',
);
assert.ok(
  !priceText.includes('Profile, visit history and notes available when the counter needs them.'),
  'The customer record preview card is removed',
);
assert.ok(
  !priceText.includes('Appointment, revenue, staff and stock reporting from real records.'),
  'The business reports preview card is removed',
);
assert.ok(!priceText.includes('Open your workspace'), 'The product preview CTA is removed');
for (const link of NEXORA_LANDING_NAV) {
  assert.notEqual(link.href, '#product-preview', 'Navigation no longer points at the removed section');
}
assert.ok(!priceText.includes('Product preview'), 'Footer navigation no longer lists the removed section');

// --- Salon Promotion Studio is removed -------------------------------------
assert.ok(!html.includes('salon-marketing'), 'The retired Salon Promotion Studio anchor is not rendered');
assert.ok(!html.includes('sl-promo'), 'No Salon Promotion Studio styling hook is rendered');
assert.ok(!priceText.includes('SALON PROMOTION STUDIO'), 'The Salon Promotion Studio heading is removed');
assert.ok(!priceText.includes('How the promotion flow works'), 'The promotion workflow list is removed');
assert.ok(!priceText.includes('Where you can share'), 'The promotion sharing list is removed');
for (const creative of NEXORA_PROMOTION_CREATIVES) {
  assert.ok(!priceText.includes(creative.headline), `Retired creative "${creative.headline}" no longer renders`);
}
for (const channel of NEXORA_PROMOTION_CHANNELS) {
  assert.ok(!priceText.includes(channel.label), `Retired sharing channel "${channel.label}" no longer renders`);
}
for (const link of NEXORA_LANDING_NAV) {
  assert.notEqual(link.href, '#salon-marketing', 'Navigation no longer points at the removed section');
}

// --- Content integrity -----------------------------------------------------
for (const type of NEXORA_BUSINESS_TYPES) assert.ok(priceText.includes(type.title), `Business type "${type.title}" renders`);
assert.equal(NEXORA_BUSINESS_TYPES.length, 7, 'All seven business categories are covered');
assert.equal(NEXORA_HOW_IT_WORKS.length, 3, 'Three onboarding steps are documented');
assert.equal(NEXORA_BUSINESS_BENEFITS.length, 6, 'Six business benefit cards are documented');
for (const step of NEXORA_HOW_IT_WORKS) assert.ok(priceText.includes(step.title), `Step "${step.title}" renders`);
for (const benefit of NEXORA_BUSINESS_BENEFITS) assert.ok(priceText.includes(benefit.title), `Benefit "${benefit.title}" renders`);

const iconKeys = [
  ...NEXORA_BUSINESS_TYPES.map(entry => entry.icon),
  ...NEXORA_LANDING_FEATURE_CATEGORIES.map(entry => entry.icon),
  ...NEXORA_HOW_IT_WORKS.map(entry => entry.icon),
  ...NEXORA_BUSINESS_BENEFITS.map(entry => entry.icon),
];
for (const key of iconKeys) assert.ok(LANDING_ICON_REGISTRY[key], `Icon "${key}" resolves in the shared icon family`);

// --- Brand and tokens ------------------------------------------------------
const tokenFile = readFileSync('src/components/nexora-landing/nexoraTokens.css', 'utf8');
for (const [token, value] of Object.entries({
  '--nx-color-primary': '#ff2323',
  '--nx-color-primary-dark': '#cc1c1c',
  '--nx-color-text': '#000000',
  '--nx-color-text-secondary': '#4b4f58',
  '--nx-color-surface': '#ffffff',
  '--nx-color-surface-secondary': '#f5f5f5',
  '--nx-color-surface-elevated': '#e7e7e7',
  '--nx-color-border': '#e7e7e7',
  '--nx-color-dark': '#101010',
  '--nx-color-on-dark': '#ffffff',
  '--nx-space-7': '64px',
  '--nx-container-max': '1287px',
  '--nx-page-gutter': '20px',
  '--nx-radius-pill': '50px',
  '--nx-radius-input': '6px',
  '--nx-radius-card': '10px',
  '--nx-radius-panel': '30px',
  '--nx-type-h1': '36px',
  '--nx-type-h2': '48px',
  '--nx-type-h3': '24px',
  '--nx-type-body': '15px',
  '--nx-type-small': '13px',
})) {
  assert.ok(tokenFile.includes(`${token}: ${value}`), `Token ${token} keeps its documented value`);
}

const styles = readFileSync('src/components/nexora-landing/nexoraLanding.css', 'utf8');
assert.ok(styles.includes('outline: 3px solid var(--nx-color-primary-dark)'), 'Keyboard focus is clearly visible');
assert.ok(!/outline:\s*(0|none)/.test(styles.replace(/outline-offset[^;]*;/g, '')), 'No invisible focus ring is used');
assert.ok(styles.includes('prefers-reduced-motion'), 'Reduced motion is respected');
for (const width of ['1280px', '1024px', '921px', '767px', '480px', '375px', '320px']) {
  assert.ok(styles.includes(`max-width:${width}`) || styles.includes(`max-width: ${width}`), `Responsive breakpoint ${width} is defined`);
}
// The /pricing comparison table lives in the shared stylesheet so both pricing
// surfaces render identically; the companion route must not re-implement it.
const comparisonStyles = readFileSync('src/components/nexora-pricing/table/comparisonTable.css', 'utf8');
assert.ok(comparisonStyles.includes('.nx-compare__wrap') && comparisonStyles.includes('overflow-x: auto'), 'The comparison table scrolls horizontally on small screens');
assert.ok(/position:\s*sticky/.test(comparisonStyles), 'The comparison feature column is sticky on wide screens');
assert.ok(!styles.includes('.sl-table-wrap'), 'The retired comparison table rules are removed from the landing stylesheet');

const landingSources = [
  'src/components/nexora-landing/NexoraSalonLandingPage.tsx',
  'src/lib/nexoraLandingContent.ts',
  'src/components/nexora-landing/nexoraLanding.css',
  'src/components/nexora-landing/nexoraTokens.css',
].map(path => readFileSync(path, 'utf8')).join('\n');
assert.ok(!/zylu/i.test(landingSources), 'No reference-brand name appears in the landing implementation');
assert.ok(priceText.includes('NEXORA') && priceText.includes('SALONOS'), 'The NEXORA SALONOS brand is used');

// --- Prerendered document --------------------------------------------------
const prerendered = 'dist/salon-os/index.html';
if (existsSync(prerendered)) {
  const document = readFileSync(prerendered, 'utf8');
  assert.ok(document.includes('<link rel="canonical" href="https://nexorasalon.online/salon-os"'), 'The prerendered page owns its canonical URL');
  assert.ok(document.includes('Run Your Salon. Grow Your Business. All From One Place.'), 'The prerendered page contains the hero copy for crawlers');
  assert.ok(document.includes('application/ld+json'), 'The prerendered page ships structured data');
  assert.ok(document.includes('poppins-latin-400-normal.woff2'), 'The prerendered page preloads its local font');
  assert.ok(!document.includes('fonts.googleapis.com'), 'The prerendered page has no third-party font request');
}

console.log('PASS: Nexora SalonOS companion landing page structure, approved pricing summary, pointer to the canonical pricing comparison, accessible FAQ, honest social proof, retired promotion studio and product experience blocks, design tokens, responsive breakpoints, visible focus, brand integrity and prerendered SEO document.');
