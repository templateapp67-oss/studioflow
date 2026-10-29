import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ALL_CATEGORY_OPTIONS, CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import { INITIAL_SALON_PROFILE } from '../src/mockData';
import { SalonWebsitePreview } from '../src/components/SalonWebsitePreview';
import { requestedTemplate, templateDraft, developmentTemplateForSiteSlug } from '../src/lib/templateEntry';
import { photoGallery } from '../src/lib/photoGallery';
import { normalizeWorkspace } from '../src/lib/normalizeWorkspace';
import { applyTemplateDesign } from '../src/lib/templateSelection';
import { serviceImageTemplates } from '../src/lib/serviceImages';
import { serviceValidation } from '../src/lib/serviceCatalogue';
import {
  SHRINGAAR_BRAND_NAME,
  SHRINGAAR_DEFAULT_COLLECTIONS,
  SHRINGAAR_DEFAULT_COLORS,
  SHRINGAAR_IMAGES,
  SHRINGAAR_SERVICES,
  SHRINGAAR_TEMPLATE_SERVICES,
  buildShringaarSeo,
  isLegacyBridalStockUrl,
  resolveShringaarPackages,
  resolveShringaarRoyalConfig,
  shringaarCssVariables,
  shringaarFormatInr,
  shringaarOpenStatus,
  shringaarServiceImage,
  upgradeShringaarTemplate,
} from '../src/lib/shringaarRoyal';
import type { SalonProfile } from '../src/types';

/* ---------- browser stubs for SSR (no real DOM) ---------- */
const locationMock: any = { href: 'https://shringaarroyal.example/', origin: 'https://shringaarroyal.example', hash: '', search: '', pathname: '/' };
(globalThis as any).location = locationMock;
(globalThis as any).window = {
  location: locationMock,
  scrollY: 0,
  scrollTo() {},
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
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

const template = CATEGORY_TEMPLATES.bridal_lounge;

/* ---------- 1. Registry / picker / routing ---------- */
assert.equal(template.title, SHRINGAAR_BRAND_NAME);
assert.ok(template.services.length >= 11, 'Template 11 ships the full bridal menu (8 rituals + 3 heirloom packages)');
for (const service of SHRINGAAR_SERVICES) assert.ok(template.services.some((entry) => entry.id === service.id), `${service.name} is part of the template menu`);
assert.ok(template.services.some((service) => service.id.startsWith('template-pkg-bridal_lounge')), 'the shared package starters top the menu up like every other template');
assert.equal(template.services.filter((service) => service.category === 'Heirloom Packages').length, 3);
for (const service of template.services) {
  assert.equal(serviceValidation(service), '', `${service.id} must be a valid, bookable service`);
  assert.ok(Number.isFinite(service.price) && Number(service.price) > 0, `${service.id} needs an INR price`);
}
assert.equal(template.coverImageUrl, SHRINGAAR_IMAGES.hero);
assert.ok(template.coverImageUrl.startsWith('/templates/11/'), 'the picker card uses bundled photography');
assert.equal(template.themePreset, 'royal_crimson_gold');
assert.equal(template.layoutStyle, 'palace_heritage');
for (const option of ALL_CATEGORY_OPTIONS) {
  if (option.id !== 'bridal_lounge') continue;
  assert.equal(option.badge, 'Template 11');
  assert.equal(option.title, 'Shringaar Royal (11)');
  assert.ok(option.aestheticDescription.includes('Rajputana'));
}

for (const alias of ['11', 'template-11', 'shringaar', 'shringaar-royal', 'bridal', 'bridal_lounge']) {
  assert.equal(requestedTemplate(`?template=${alias}`)?.id, 'bridal_lounge', `?template=${alias} opens Template 11`);
}
assert.equal(requestedTemplate('?category=bridal_lounge')?.id, 'bridal_lounge');
assert.equal(requestedTemplate('?template=bridal-lounge')?.id, 'bridal_lounge');
assert.equal(requestedTemplate('?template=99'), null, 'unknown template ids stay unmatched');
assert.equal(developmentTemplateForSiteSlug('shringaar-royal', true)?.id, 'bridal_lounge');
assert.equal(developmentTemplateForSiteSlug('shringaarroyal', true)?.id, 'bridal_lounge');

const draft = templateDraft(template);
assert.equal(draft.profile.businessType, 'bridal_lounge');
assert.equal(draft.profile.businessName, SHRINGAAR_BRAND_NAME);
assert.deepEqual(draft.services.map((service) => service.id), template.services.map((service) => service.id));
assert.ok(draft.profile.coverImageUrl.startsWith('/templates/11/'));

/* ---------- 2. Every bundled photograph is a real local file ---------- */
const flatten = (value: unknown, out: string[] = []): string[] => {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => flatten(entry, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((entry) => flatten(entry, out));
  return out;
};
const imagePaths = [...new Set(flatten(SHRINGAAR_IMAGES))];
assert.ok(imagePaths.length >= 45, 'the template ships a photograph for every section');
for (const path of imagePaths) {
  assert.ok(path.startsWith('/templates/11/'), `${path} must be bundled, not hotlinked`);
  assert.ok(existsSync(join('public', path)), `${path} is missing from public/`);
}
for (const path of ['logo.svg', 'favicon.svg', 'og-image.jpg']) {
  assert.ok(existsSync(join('public/templates/11', path)), `${path} must ship with the template`);
}

/* ---------- 3. Resolver: demo defaults + onboarding overrides ---------- */
const demoProfile = { ...INITIAL_SALON_PROFILE, businessType: 'bridal_lounge' as const };
const defaults = resolveShringaarRoyalConfig(demoProfile);
assert.equal(defaults.heroHeading, 'Where Every Bride Becomes Royalty');
assert.equal(defaults.heroImageUrl, SHRINGAAR_IMAGES.hero);
assert.deepEqual(defaults.collections, SHRINGAAR_DEFAULT_COLLECTIONS);
assert.deepEqual(defaults.colors, SHRINGAAR_DEFAULT_COLORS);
assert.equal(defaults.packages.length, 3);
assert.equal(defaults.processSteps.length, 4);
assert.equal(defaults.reviews.length, 3);
assert.ok(defaults.faqs.length >= 4);
assert.equal(defaults.galleryUrls.length, 8);
assert.ok(defaults.mapEmbedUrl === '', 'no third-party map iframe is embedded until the owner adds one');
assert.equal(shringaarCssVariables(defaults.colors)['--sr-maroon'], '#5A0F1E');

const ownerProfile: SalonProfile = {
  ...demoProfile,
  businessName: 'Rani Mahal Bridal House',
  tagline: 'Our own tagline',
  about: '',
  customAccentColor: '#7a1024',
  shringaarRoyal: {
    heroHeading: 'A Bride, Remembered Forever',
    heroSubtext: 'Owner-written hero copy.',
    collectionsHeading: 'Our Own Collections',
    colors: { maroon: '#7a1024' },
    packages: [{ ...resolveShringaarRoyalConfig(demoProfile).packages[0], tier: 'Signature', price: 52000, serviceId: 'sr-pkg-classic' }],
  },
};
const ownerConfig = resolveShringaarRoyalConfig(ownerProfile);
assert.equal(ownerConfig.heroHeading, 'A Bride, Remembered Forever');
assert.equal(ownerConfig.collectionsHeading, 'Our Own Collections');
assert.equal(ownerConfig.colors.maroon, '#7a1024');
assert.equal(ownerConfig.colors.gold, SHRINGAAR_DEFAULT_COLORS.gold, 'unset colours keep the royal palette');
assert.equal(ownerConfig.heroSubtext, 'Owner-written hero copy.');
assert.equal(ownerConfig.packages.length, 1);

/* Packages follow the live onboarding service price (₹ edits reach the website). */
const editedServices = SHRINGAAR_TEMPLATE_SERVICES.map((service) => (service.id === 'sr-pkg-royal' ? { ...service, price: 84000 } : service));
const resolvedPackages = resolveShringaarPackages(resolveShringaarRoyalConfig(demoProfile).packages, editedServices);
const royal = resolvedPackages.find((pkg) => pkg.id === 'pkg-royal');
assert.equal(royal?.livePrice, 84000, 'the Royal package shows the owner’s edited ₹ price');
assert.equal(royal?.liveServiceId, 'sr-pkg-royal');
assert.equal(royal?.bookable, true, 'the package books the linked onboarding service');
const missingLink = resolveShringaarPackages(resolveShringaarRoyalConfig(demoProfile).packages, []);
assert.equal(missingLink[0].bookable, false, 'a package without a live service never claims to be bookable');
assert.equal(missingLink[0].livePrice, 45000, 'the demo price still renders for the template preview');

/* ---------- 4. Helpers ---------- */
assert.equal(shringaarFormatInr(78000), '₹78,000');
assert.equal(shringaarFormatInr(null), 'On consult');
assert.equal(shringaarOpenStatus('10:00', '20:30', new Date('2026-02-10T12:00:00')).open, true);
assert.equal(shringaarOpenStatus('10:00', '20:30', new Date('2026-02-10T22:30:00')).open, false);
assert.equal(shringaarServiceImage({ id: 'x', name: 'Bridal Mehendi', category: 'Mehendi', imageUrl: '' }), SHRINGAAR_IMAGES.services.mehendi);
assert.equal(shringaarServiceImage({ id: 'x', name: 'Poshak Draping', category: 'Draping & Styling', imageUrl: '' }), SHRINGAAR_IMAGES.services.draping);
assert.equal(shringaarServiceImage({ id: 'x', name: 'Custom', category: 'Custom', imageUrl: '/templates/11/looks/look-1.jpg' }), '/templates/11/looks/look-1.jpg');

/* Service image templates use local bridal photography (no stock fallback). */
for (const service of template.services) {
  for (const image of serviceImageTemplates(service, 'bridal_lounge')) {
    assert.ok(image.url.startsWith('/templates/11/'), `${service.id} image template must be bundled`);
  }
}

/* SEO title, description and JSON-LD are built from onboarding data. */
const seoProfile = { ...demoProfile, businessName: 'Shringaar Royal Indian Bridal Lounge', phone: '+91 90000 11111' };
const seo = buildShringaarSeo(seoProfile, defaults, 'https://shringaarroyal.example');
assert.ok(seo.title.includes(SHRINGAAR_BRAND_NAME), 'the owner business name leads the SEO title');
assert.ok(seo.title.includes(seoProfile.city), 'the SEO title carries the owner city');
assert.ok(seo.description.includes('Shringaar Royal Indian Bridal Lounge'), 'the SEO description is built from owner data');
assert.ok(seo.jsonLd.name === 'Shringaar Royal Indian Bridal Lounge');
assert.ok(seo.description.includes('Rajputana'));
assert.equal(seo.ogImage, SHRINGAAR_IMAGES.ogImage);
assert.equal(seo.jsonLd.telephone, '+91 90000 11111');
assert.equal(seo.jsonLd['@type'], 'BeautySalon');
assert.ok(seo.jsonLd.makesOffer.length >= SHRINGAAR_SERVICES.length);

/* ---------- 5. Legacy demo upgrade + gallery + template switch ---------- */
const remoteLegacy: any = {
  id: 'bridal_lounge',
  title: 'Bridal Makeup & Makeover Lounge',
  services: [{ id: 'bl-1', name: 'Old stock service' }],
  stylists: [{ id: 'bl-st-1', name: 'Old stock artist', avatarUrl: 'https://images.unsplash.com/photo-1' }],
};
const upgraded = upgradeShringaarTemplate(remoteLegacy, template as any);
assert.ok(!upgraded.services.some((service: any) => service.name === 'Old stock service'), 'the remote legacy demo is replaced by the redesigned menu');
for (const service of SHRINGAAR_SERVICES) assert.ok(upgraded.services.some((entry: any) => entry.id === service.id));
assert.equal(upgraded.stylists.length, 3);
assert.equal(upgraded.title, SHRINGAAR_BRAND_NAME);
assert.equal(upgradeShringaarTemplate({ id: 'hair_salon' } as any, template as any).title, undefined, 'other templates are untouched');

assert.equal(isLegacyBridalStockUrl('https://images.unsplash.com/photo-1'), true);
assert.equal(isLegacyBridalStockUrl('/templates/11/hero-bride.jpg'), false);

/* A salon that still holds the old bridal stock samples is upgraded to Template 11's photos. */
const legacyGallery = photoGallery({
  ...demoProfile,
  photoGalleryInitialized: true,
  photoGalleryType: 'hair_salon',
  photoGallery: [
    { id: 'template-gallery-bridal_lounge-1', category: 'Bridal' as const, url: 'https://images.unsplash.com/photo-1595959183082-7b570b7e08e2', title: 'Old sample', isDemo: true },
    { id: 'template-gallery-bridal_lounge-2', category: 'Bridal' as const, url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f', title: 'Old sample 2', isDemo: true },
    { id: 'owner-photo-1', category: 'Bridal' as const, url: 'https://cdn.example.com/our-bride.jpg', title: 'Our own bride', isDemo: false },
  ],
}, []);
for (const photo of legacyGallery.filter((entry) => entry.id.startsWith('template-gallery-bridal_lounge-'))) {
  assert.ok(photo.url.startsWith('/templates/11/'), 'old bridal demo samples are replaced with Template 11 photography');
  assert.equal(photo.category, 'Bridal');
}
assert.ok(legacyGallery.some((photo) => photo.id === 'owner-photo-1' && photo.url === 'https://cdn.example.com/our-bride.jpg'), 'owner photos survive the upgrade');

const freshGallery = photoGallery({ ...demoProfile, photoGalleryInitialized: false }, []);
assert.ok(freshGallery.length >= 5);
for (const photo of freshGallery) {
  assert.ok(photo.url.startsWith('/templates/11/'), 'every seeded gallery photo is bundled with Template 11');
  assert.equal(photo.isDemo, true);
}

const switched = applyTemplateDesign({ ...INITIAL_SALON_PROFILE, businessType: 'hair_salon', coverImageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035' }, template);
assert.equal(switched.businessType, 'bridal_lounge');
assert.equal(switched.coverImageUrl, SHRINGAAR_IMAGES.hero);
assert.equal(switched.tagline, template.tagline);

/* ---------- 6. Rendered storefront (published salon) ---------- */
const publishedProfile: SalonProfile = {
  ...INITIAL_SALON_PROFILE,
  ...template,
  businessType: 'bridal_lounge',
  businessName: 'Shringaar Royal Indian Bridal Lounge',
  subdomain: 'shringaar-royal',
  phone: '+91 98290 33411',
  whatsapp: '+91 98290 33411',
  city: 'Jaipur, Rajasthan',
  address: 'MI Road, Near Panch Batti',
  postalCode: '302001',
  instagramHandle: '@shringaarroyal.jaipur',
  facebookPage: 'shringaarroyal',
  ownerName: 'Anuradha Rathore',
  serviceCatalogueInitialized: true,
  socialVideos: [],
};
const html = renderToStaticMarkup(
  <SalonWebsitePreview
    profile={publishedProfile}
    services={SHRINGAAR_TEMPLATE_SERVICES}
    stylists={template.stylists}
    gallery={[]}
    readOnly
    customerSignedIn
    customerName="Meera"
    onAddAppointment={async (appointment) => appointment}
    onCustomerAccount={() => {}}
  />,
);

/* Section contract shared by every template (see verify-website-wiring). */
let previous = -1;
for (const order of ['hero', 'services', 'team', 'experiences', 'location', 'footer']) {
  const at = html.indexOf(`data-layout="${order}"`);
  assert.ok(at > previous, `Template 11: ${order} must appear in the storefront order`);
  previous = at;
}
const text = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
for (const copy of [
  'Where Every Bride Becomes Royalty',
  'Royal Rajputana Trousseaus',
  'The Sabyasachi Aesthetic',
  'Heirloom Makeover Packages',
  'The Bridal Menu',
  'Your Bridal Journey',
  'Brides Who Became Royalty',
  'From Our Bridal Diaries',
  'Wedding Season 2026',
  'Book Your Bridal Consultation',
]) {
  assert.ok(text.includes(copy), `Template 11 copy renders: ${copy}`);
}
assert.ok(html.includes('sr-arch'), 'the hero portrait sits inside a jharokha arch');
assert.ok(html.includes('sr-phone'), 'the hero carries the floating device mockup');
assert.ok(html.includes('before-after') || html.includes('sr-ba'), 'the before / after comparison slider renders');
assert.ok(html.includes('wa.me/919829033411'), 'WhatsApp booking path uses the onboarding number');
assert.ok(html.includes('tel:+919829033411'), 'phone CTA uses the onboarding number');
assert.ok(text.includes('complimentary trial look book'), 'the wedding-season offer shows its promo hook');
assert.ok(text.includes('Reserve my date'), 'the offer banner carries its own CTA');
assert.equal((html.match(/<iframe/g) || []).length, 0, 'no third-party iframe before the owner adds a map embed');
assert.equal((html.match(/class="sf-reel-media"/g) || []).length, 5, 'platform reels remain part of the page');

/* Every service name, ₹ price and duration is on the page. */
for (const service of SHRINGAAR_SERVICES) {
  assert.ok(html.includes(service.name.replaceAll('&', '&amp;').replaceAll("'", '&#x27;')), `${service.name} must be listed`);
  if (service.category !== 'Heirloom Packages') assert.ok(html.includes(`${service.durationMinutes} min`), `${service.name} duration must be shown`);
}
assert.ok(html.includes(shringaarFormatInr(78000)), 'the Royal package price renders in ₹');
assert.ok(html.includes('₹35,000'), 'service prices render in Indian format');

/* Imagery: local, described and lazy (the hero is the only eager image). */
const imgTags = html.match(/<img[^>]*>/g) || [];
assert.ok(imgTags.length >= 25, 'every section contains photography');
for (const tag of imgTags) {
  const src = tag.match(/src="([^"]+)"/)?.[1] || '';
  // Shared platform blocks (app promo, reel thumbnails) are not template photography.
  const platformAsset = src.startsWith('https://img.youtube.com/') || src.startsWith('/promo/');
  assert.ok(src.startsWith('/templates/11/') || src.startsWith('data:') || platformAsset, `unexpected image source ${src}`);
  if (platformAsset) continue;
  assert.ok(/alt="[^"]*"/.test(tag), `image without alt text: ${tag.slice(0, 80)}`);
  if (!src.includes('hero-bride.jpg')) assert.ok(tag.includes('loading="lazy"'), `image must lazy-load: ${src}`);
}
assert.ok(html.includes('/templates/11/hero-bride.jpg'), 'hero uses the bundled bridal portrait');

/* Customer account affordances stay inside the storefront header. */
const header = (html.match(/<header[\s\S]*?<\/header>/g) || []).find((block) => block.includes('Customer account'));
assert.ok(header, 'the salon header carries the customer account area');
assert.ok(header!.includes('Manage your customer account'));
assert.ok(header!.includes('My Bookings'));
assert.ok(!header!.includes('Customer Login') && !header!.includes('Sign up'), 'signed-in brides do not see guest buttons');
assert.ok(html.includes('Manage your customer account'));
assert.ok(text.includes('Bridal Questions') || text.includes('Questions'), 'the FAQ block renders');

/* Owner data wins over demo copy, and no placeholder text leaks. */
const ownerHtml = renderToStaticMarkup(
  <SalonWebsitePreview
    profile={{ ...publishedProfile, businessName: 'Rani Mahal Bridal House', shringaarRoyal: { heroHeading: 'A Bride, Remembered Forever', collectionsHeading: 'Our Own Collections' } }}
    services={[{ ...SHRINGAAR_TEMPLATE_SERVICES[0], price: 41000, name: 'Rani Mahal Signature Bridal' }]}
    stylists={[]}
    gallery={['/templates/11/gallery/gallery-3.jpg']}
    readOnly
    onAddAppointment={async (appointment) => appointment}
  />,
);
const ownerText = ownerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
assert.ok(ownerText.includes('A Bride, Remembered Forever'), 'owner hero copy is published');
assert.ok(ownerText.includes('Our Own Collections'), 'owner collections heading is published');
assert.ok(ownerText.includes('Rani Mahal Signature Bridal'), 'owner service name is published');
assert.ok(ownerHtml.includes('₹41,000'), 'the owner’s edited price is published');
assert.ok(ownerText.includes('Rani Mahal Bridal House'));
for (const junk of ['undefined', 'NaN', 'Infinity', 'null,', '[object Object]']) {
  assert.ok(!ownerHtml.includes(junk), `owner render must not contain ${junk}`);
  assert.ok(!html.includes(junk), `published render must not contain ${junk}`);
}

/* Workspace round-trip keeps the template content and the customer wiring. */
const roundTrip = normalizeWorkspace(JSON.parse(JSON.stringify({
  profile: { ...publishedProfile, shringaarRoyal: { heroHeading: 'A Bride, Remembered Forever' } },
  services: SHRINGAAR_TEMPLATE_SERVICES,
  stylists: template.stylists,
})));
assert.equal(roundTrip.profile.shringaarRoyal?.heroHeading, 'A Bride, Remembered Forever');
assert.equal(roundTrip.profile.businessType, 'bridal_lounge');
assert.equal(roundTrip.services.length, 11);
assert.equal(roundTrip.profile.socialVideos.length, 5, 'demo reels are seeded without replacing owner videos');

/* ---------- 7. Source guards: styling scope, motion, reduced motion ---------- */
const css = readFileSync('src/components/shringaarRoyal.css', 'utf8');
assert.ok(css.includes('.sr-site {'), 'template styles are scoped to .sr-site');
assert.ok(css.includes('backdrop-filter: blur(16px) saturate(140%)'), 'glass cards use the spec blur');
assert.ok(css.includes('-webkit-backdrop-filter'), 'glass cards carry the Safari prefix');
assert.ok(css.includes('@supports ((backdrop-filter'), 'glass cards provide a solid fallback');
assert.ok(css.includes('prefers-reduced-motion: reduce'), 'motion is disabled for reduced-motion visitors');
assert.ok(css.includes('transform: scale(1.05)'), 'card hover scale is applied');
assert.ok(css.includes('box-shadow: 0 18px 40px rgba(90, 15, 30, 0.28)'), 'card hover shadow is applied');
assert.ok(!/^\s*body\s*\{/m.test(css), 'no global body styles leak into other templates');

const websiteSource = readFileSync('src/components/ShringaarRoyalWebsite.tsx', 'utf8');
assert.ok(websiteSource.includes('MotionConfig reducedMotion="user"'), 'storefront respects the user motion preference');
assert.ok(websiteSource.includes('useReducedMotion'), 'intro loader + scroll behaviour honour reduced motion');
assert.ok(websiteSource.includes('AnimatePresence'), 'page transitions use AnimatePresence');
assert.ok(!websiteSource.includes('images.unsplash.com'), 'no external stock photography');
for (const variant of ['fadeUp', 'fadeIn', 'scaleIn', 'stagger', 'deviceMockupIn', 'heroHeadline']) {
  assert.ok(websiteSource.includes(variant), `shared motion variant ${variant} is reused`);
}
const motionLib = readFileSync('src/lib/motion.ts', 'utf8');
for (const name of ['fadeUp', 'fadeIn', 'scaleIn', 'stagger', 'staggerItem', 'revealViewport']) {
  assert.ok(motionLib.includes(`export const ${name}`), `src/lib/motion.ts exports ${name}`);
}

/* Every .sr-* class used in the components is actually styled. */
const componentFiles = [
  'src/components/ShringaarRoyalWebsite.tsx',
  'src/components/shringaar-royal/DeviceMockup.tsx',
  'src/components/shringaar-royal/BeforeAfterSlider.tsx',
  'src/components/shringaar-royal/TestimonialCarousel.tsx',
  'src/components/shringaar-royal/Ornaments.tsx',
  'src/components/shringaar-royal/Motion.tsx',
];
const missingClasses = new Set<string>();
for (const file of componentFiles) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(?:className|class)="([^"]*)"/g)) {
    for (const token of match[1].split(/\s+/)) {
      if (!token.startsWith('sr-')) continue;
      if (token.includes('${')) continue;
      if (!css.includes(`.${token}`)) missingClasses.add(`${file}: ${token}`);
    }
  }
}
assert.deepEqual([...missingClasses], [], 'every sr-* utility used by the components has a CSS rule');

console.log('PASS: Template 11 (Shringaar Royal) — registered in the picker/onboarding/routing, 59 bundled photos all present, resolver + live ₹ package pricing, legacy catalogue upgrade, published storefront sections/assets/alt text/WhatsApp wiring, customer header contract, scoped glass styles and reduced-motion guards.');
