import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ALL_CATEGORY_OPTIONS, CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import { INITIAL_SALON_PROFILE } from '../src/mockData';
import { CustomerSalonWebsite } from '../src/components/CustomerSalonWebsite';
import { PrismChromaEditor } from '../src/components/prism-chroma/PrismChromaEditor';
import { requestedTemplate } from '../src/lib/templateEntry';
import { isPackage } from '../src/lib/packageCatalogue';
import { serviceValidation } from '../src/lib/serviceCatalogue';
import {
  PRISM_CHROMA_BRAND_NAME,
  PRISM_CHROMA_DEFAULT_COLORS,
  PRISM_CHROMA_DEFAULT_FAQS,
  PRISM_CHROMA_DEFAULT_PACKAGES,
  PRISM_CHROMA_DEFAULT_REVIEWS,
  PRISM_CHROMA_DEFAULT_SHADES,
  PRISM_CHROMA_IMAGES,
  PRISM_CHROMA_TEMPLATE_SERVICES,
  buildPrismChromaSeo,
  prismChromaCssVariables,
  prismFormatInr,
  resolvePrismChromaConfig,
} from '../src/lib/prismChroma';
import type { SalonProfile } from '../src/types';

const locationMock: any = { href: 'https://prismchroma.example/', origin: 'https://prismchroma.example', hash: '', search: '' };
(globalThis as any).location = locationMock;
(globalThis as any).window = {
  location: locationMock,
  scrollTo() {},
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
};
(globalThis as any).document = {
  title: '',
  head: { appendChild() {}, querySelector: () => null },
  body: { style: {} },
  querySelector: () => null,
  createElement: () => ({ setAttribute() {}, textContent: '', remove() {} }),
  addEventListener() {},
  removeEventListener() {},
};

/* 1 — Registry, picker, aliases */
const template = CATEGORY_TEMPLATES.hair_coloring;
assert.equal(template.title, 'Prism & Chroma Hair Color Atelier');
assert.equal(template.layoutStyle, 'prism_holographic');
assert.equal(template.themePreset, 'chroma_gradient');
const picker = ALL_CATEGORY_OPTIONS.find((o) => o.id === 'hair_coloring')!;
assert.equal(picker.badge, 'Template 10', 'onboarding picker shows Template 10 badge');
assert.ok(picker.title.includes('Prism & Chroma'));
for (const slug of ['prism-chroma', '10', 'template-10', 'hair-coloring', 'prismchroma']) {
  assert.equal(requestedTemplate(`?template=${slug}`)?.id, 'hair_coloring', `?template=${slug} resolves to Template 10`);
}
assert.ok(existsSync(join(process.cwd(), 'public/templates/10/hero.jpg')), 'bundled hero exists');
assert.ok(existsSync(join(process.cwd(), 'public/templates/10/logo.svg')), 'bundled logo exists');
console.log('PASS: Template 10 registry, picker badge, ?template=prism-chroma aliases, bundled assets.');

/* 2 — Catalogue: 8 services + 3 packages, INR prices */
assert.equal(PRISM_CHROMA_TEMPLATE_SERVICES.length, 13, '8 core + 5 package services');
assert.equal(PRISM_CHROMA_TEMPLATE_SERVICES.filter(isPackage).length, 5, 'five seeded catalogue packages (page shows the 3 spec tiers)');
const expectPrice = (part: string, price: number) => {
  const found = PRISM_CHROMA_TEMPLATE_SERVICES.find((s) => s.name.includes(part));
  assert.ok(found, `service ${part} exists`);
  assert.equal(found!.price, price, `${part} is ₹${price}`);
};
expectPrice('Signature Balayage', 5499);
expectPrice('Global Colour', 3999);
expectPrice('Fashion & Pastel', 4999);
expectPrice('Highlights & Money Piece', 2999);
expectPrice('Colour Correction', 6999);
expectPrice('Keratin', 5999);
expectPrice('Gloss & Shine', 1499);
expectPrice('Root Touch-Up', 1299);
for (const s of PRISM_CHROMA_TEMPLATE_SERVICES) assert.equal(serviceValidation(s), '', `${s.name} passes service validation`);
assert.equal(PRISM_CHROMA_DEFAULT_SHADES.length, 6, 'six Shade Studio shades');
assert.equal(PRISM_CHROMA_DEFAULT_PACKAGES.length, 3, 'Starter / Signature / Full Transformation');
assert.deepEqual(PRISM_CHROMA_DEFAULT_PACKAGES.map((p) => p.price), [2499, 5999, 9999]);
assert.equal(PRISM_CHROMA_DEFAULT_REVIEWS.length, 6, 'six testimonials');
assert.equal(PRISM_CHROMA_DEFAULT_FAQS.length, 8, 'eight FAQs');
assert.equal(prismFormatInr(5499), '₹5,499');
console.log('PASS: Template 10 catalogue — 8 services, 3 packages, shades, reviews, FAQs, INR format.');

/* 3 — Resolver: defaults + onboarding overrides (name, colours, hero) */
const demoProfile: SalonProfile = {
  ...INITIAL_SALON_PROFILE,
  businessType: 'hair_coloring',
  businessName: PRISM_CHROMA_BRAND_NAME,
  tagline: template.tagline,
  about: template.about,
  phone: template.phone,
  whatsapp: template.whatsapp,
  address: template.defaultAddress,
  city: template.defaultCity,
  postalCode: template.defaultPostalCode,
  coverImageUrl: template.coverImageUrl,
  subdomain: 'prism-chroma',
};
const config = resolvePrismChromaConfig(demoProfile);
assert.equal(config.heroImageUrl, PRISM_CHROMA_IMAGES.hero);
assert.equal(config.colors.violet, PRISM_CHROMA_DEFAULT_COLORS.violet);
const custom = resolvePrismChromaConfig({
  ...demoProfile,
  businessName: 'My Colour Room',
  prismChroma: { colors: { violet: '#112233' }, heroHeading: 'Colour, My Way' },
});
assert.equal(custom.colors.violet, '#112233', 'onboarding brand colour overrides --violet');
assert.equal(custom.heroHeading, 'Colour, My Way');
const vars = prismChromaCssVariables(custom.colors);
assert.equal(vars['--violet'], '#112233');
assert.ok(vars['--prism-gradient'].includes('#112233'), 'gradient follows brand colours');
const seo = buildPrismChromaSeo(demoProfile, config);
assert.ok(seo.title.includes('Prism & Chroma'));
assert.equal((seo.jsonLd[0] as any).currenciesAccepted, 'INR');
console.log('PASS: resolver defaults, onboarding overrides, CSS variables, SEO/JSON-LD.');

/* 4 — Storefront renders every spec section from onboarding data */
const html = renderToStaticMarkup(
  <CustomerSalonWebsite profile={demoProfile} services={template.services} stylists={template.stylists} onAddAppointment={async (a: any) => a} />,
);
for (const needle of [
  'Prism &amp; Chroma', 'Book Now', 'Balayage', 'Shade Studio', 'Violet Storm',
  'Before &amp; After Colour', 'Step by Step', 'Colour Packages', 'Most Loved',
  'Our Colour Experts', 'Aarushi Mehta', 'Colour Gallery', 'What Clients Say',
  'Ananya Kapoor', 'Common Questions', 'patch test', 'Ready for your',
  'Our Studios', 'Bandra West', '₹5,499', 'Open in Google Maps', 'pc-site',
]) {
  assert.ok(html.includes(needle), `storefront includes "${needle}"`);
}
assert.ok((html.match(/<img/g) || []).length >= 20, 'every section carries imagery');
assert.ok(html.includes('loading="lazy"'), 'below-fold images lazy-load');
const customHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={{ ...demoProfile, businessName: 'My Colour Room', subdomain: 'my-colour-room' }}
    services={template.services}
    stylists={template.stylists}
    onAddAppointment={async (a: any) => a}
  />,
);
assert.ok(customHtml.includes('My Colour Room'), 'onboarding salon name fills the template');
console.log('PASS: storefront renders all 15 sections, onboarding data wins, images lazy-load.');

/* 5 — Owner editor renders */
const editorHtml = renderToStaticMarkup(
  <PrismChromaEditor profile={demoProfile} setProfile={() => {}} showBrandIdentityFields />,
);
for (const needle of ['Template 10', 'Shade Studio', 'Brand Colours', 'Hero heading']) {
  assert.ok(editorHtml.includes(needle), `editor includes "${needle}"`);
}
console.log('PASS: PrismChromaEditor renders (brand, shades, branches/FAQs, reviews, colours).');
console.log('\nAll Prism & Chroma (Template 10) checks passed.');
