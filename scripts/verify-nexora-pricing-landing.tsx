import React from 'react';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { NexoraPricingLandingPage } from '../src/components/nexora-landing/NexoraPricingLandingPage';
import { PRICING_PLANS, PRICING_FAQS } from '../src/lib/nexoraPricing';

const html = renderToStaticMarkup(<NexoraPricingLandingPage />);
const text = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'Pricing has one page heading');
assert.ok(html.includes('id="pricing"'), 'Subscription plan cards are rendered');
assert.ok(html.includes('id="comparison"'), 'Feature comparison remains rendered');
assert.ok(html.includes('id="faq"'), 'Pricing FAQs remain rendered');
assert.ok(/monthly/i.test(text), 'Billing controls remain available');
for (const plan of PRICING_PLANS) assert.ok(text.includes(plan.name), `${plan.name} remains on pricing`);
for (const faq of PRICING_FAQS) assert.ok(text.includes(faq[0]), `Pricing FAQ remains: ${faq[0]}`);
for (const excluded of ['BusinessTypesSection', 'PlatformOverviewSection', 'CustomerAppExperienceSection', 'BirthdaySpecialGiftsSection', 'salon-categories', 'customer-app-experience', 'birthday-special-gifts', 'Growth Partner Rewards']) {
  assert.ok(!html.includes(excluded), `Non-pricing content is removed: ${excluded}`);
}
assert.ok(html.includes('href="#pricing"'), 'Pricing navigation targets plans');
assert.ok(html.includes('href="#comparison"'), 'Pricing navigation targets the comparison');
assert.ok(html.includes('href="#faq"'), 'Pricing navigation targets FAQs');
console.log('PASS: pricing route contains plan cards, billing, comparison, pricing FAQs and no displaced marketing sections.');
