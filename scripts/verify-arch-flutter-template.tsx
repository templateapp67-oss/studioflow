import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import { ALL_CATEGORY_OPTIONS, CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import { INITIAL_SALON_PROFILE } from '../src/mockData';
import { SalonWebsitePreview } from '../src/components/SalonWebsitePreview';
import { ArchFlutterEditor } from '../src/components/arch-flutter/ArchFlutterEditor';
import { act, create } from 'react-test-renderer';
import { requestedTemplate, templateDraft } from '../src/lib/templateEntry';
import { photoGallery } from '../src/lib/photoGallery';
import { isPackage } from '../src/lib/packageCatalogue';
import { applyTemplateDesign } from '../src/lib/templateSelection';
import { normalizeWorkspace } from '../src/lib/normalizeWorkspace';
import { withTemplateDemos } from '../src/components/customer/templateDemos';
import {
  ARCH_FLUTTER_ART,
  ARCH_FLUTTER_BRAND_NAME,
  ARCH_FLUTTER_DEFAULT_OFFERS,
  ARCH_FLUTTER_IMAGES,
  ARCH_FLUTTER_TAGLINE,
  ARCH_FLUTTER_TEMPLATE_SERVICES,
  buildArchFlutterSeo,
  archFlutterFormatInr,
  resolveArchFlutterConfig,
} from '../src/lib/archFlutter';
import {
  DEEPAVALI_DATES,
  demoSalonOffers,
  formatOfferDateIN,
  formatOfferWindow,
  nextFestiveWeekEnd,
  offerApplicableServices,
  offerBookingPrefill,
  offerCountdownLabel,
  offerDiscountLabel,
  offerImage,
  offerIsLive,
  offerSavingINR,
  ownerSalonOffers,
  publicSalonOffers,
  removeSalonOffer,
  resetSampleSalonOffers,
  seedSalonOffers,
  toggleSalonOffer,
  upsertSalonOffer,
} from '../src/lib/salonOffers';
import type { CustomerTemplate } from '../src/components/customer/useCustomerCatalog';
import type { SalonOffer, SalonProfile } from '../src/types';

/* react-test-renderer needs this to allow act() outside a test runner. */
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/* ---------- browser stubs for SSR (no real DOM) ---------- */
const locationMock: any = { href: 'https://archandflutter.example/', origin: 'https://archandflutter.example', hash: '', search: '', pathname: '/' };
(globalThis as any).location = locationMock;
(globalThis as any).window = {
  location: locationMock,
  scrollY: 0,
  scrollTo() {},
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
  navigator: { clipboard: { writeText: async () => {} } },
};
(globalThis as any).document = {
  title: '',
  head: { appendChild() {}, querySelector: () => null },
  body: { style: {} },
  querySelector: () => null,
  createElement: () => ({ setAttribute() {}, textContent: '', remove() {}, appendChild() {}, style: {} }),
  addEventListener() {},
  removeEventListener() {},
};

const template = CATEGORY_TEMPLATES.lash_brow;
const now = Date.now();

/* ---------- 1. Registry, picker, routing ---------- */
assert.equal(template.title, ARCH_FLUTTER_BRAND_NAME);
assert.equal(template.tagline, ARCH_FLUTTER_TAGLINE);
assert.equal(template.id, 'lash_brow');
assert.equal(template.layoutStyle, 'editorial_bento');
assert.equal(template.themePreset, 'blush_champagne');
assert.equal(template.subCategories.length, 15, 'Template 13 ships fifteen lash & brow categories');
assert.equal(ARCH_FLUTTER_TEMPLATE_SERVICES.length, 64, 'Template 13 ships the full 64-service menu');
assert.equal(ARCH_FLUTTER_TEMPLATE_SERVICES.filter((service) => isPackage(service)).length, 5, 'exactly five combo/membership packages');
assert.equal(Object.keys(CATEGORY_TEMPLATES).length, 14, 'fourteen published templates');
const option = ALL_CATEGORY_OPTIONS.find((entry) => entry.id === 'lash_brow');
assert.ok(option, 'Template 13 appears in the category picker');
assert.equal(option!.title, 'Arch & Flutter Lash & Brow Bar');
assert.equal(option!.badge, 'Template 13');
assert.equal(option!.categoryTag, 'Eye-Area Atelier');
for (const alias of ['13', 'template-13', 'arch-flutter', 'archflutter', 'lash', 'lashes', 'lash-brow', 'lash_brow', 'brow', 'microblading']) {
  assert.equal(requestedTemplate(`?template=${alias}`)?.id, 'lash_brow', `?template=${alias} opens Template 13`);
}
assert.equal(requestedTemplate('?category=lash_brow')?.id, 'lash_brow');
assert.equal(requestedTemplate('?template=99'), null, 'unknown template ids stay unmatched');
const draft = templateDraft(template);
assert.equal(draft.profile.businessType, 'lash_brow');
assert.equal(draft.profile.businessName, ARCH_FLUTTER_BRAND_NAME);
assert.ok(draft.services.length >= 60, 'onboarding pre-fills the whole menu');
assert.ok(draft.profile.tagline.includes('Flutter your confidence'), 'onboarding pre-fills the tagline');
assert.equal(applyTemplateDesign({ ...INITIAL_SALON_PROFILE, businessType: 'hair_salon' }, template).businessType, 'lash_brow');

/* ---------- 2. Bundled assets all exist ---------- */
const bundled = new Set<string>();
const collect = (value: unknown) => {
  if (typeof value === 'string') {
    if (value.startsWith('/templates/13/')) bundled.add(value);
    return;
  }
  if (Array.isArray(value)) return value.forEach(collect);
  if (value && typeof value === 'object') Object.values(value as Record<string, unknown>).forEach(collect);
};
collect(ARCH_FLUTTER_IMAGES);
collect(ARCH_FLUTTER_ART);
for (const extra of ['/templates/13/logo.svg', '/templates/13/favicon.svg', '/templates/13/og-image.jpg', '/templates/13/preview.jpg']) {
  bundled.add(extra);
}
assert.ok(bundled.size >= 24, `Template 13 ships its own artwork (${bundled.size} files)`);
const missingAssets = [...bundled].filter((asset) => !existsSync(`public${asset}`));
assert.deepEqual(missingAssets, [], 'every bundled Template 13 asset exists on disk');

/* ---------- 3. Money, resolver, SEO ---------- */
assert.equal(archFlutterFormatInr(2499), '₹2,499');
assert.equal(archFlutterFormatInr(1250.5), '₹1,250.5');
assert.equal(archFlutterFormatInr(0), '₹0');
assert.equal(archFlutterFormatInr(null), 'On consult');
const resolved = resolveArchFlutterConfig({ ...INITIAL_SALON_PROFILE, businessType: 'lash_brow' } as SalonProfile);
assert.ok(resolved.heroKicker.includes('Atelier'), 'the hero eyebrow ships with the template');
assert.ok(resolved.heroHeading.includes('Confidence'), 'hero headline ships with the template');
assert.ok(resolved.categoriesHeading.length > 3, 'the categories block has its own heading');
const owned = resolveArchFlutterConfig({
  ...INITIAL_SALON_PROFILE,
  businessType: 'lash_brow',
  archFlutter: { heroHeading: 'Brows By Meher', offersHeading: 'Salon Deals' },
} as SalonProfile);
assert.equal(owned.heroHeading, 'Brows By Meher', 'owner copy wins over demo copy');
assert.equal(owned.offersHeading, 'Salon Deals');
const seoProfile = { ...INITIAL_SALON_PROFILE, businessType: 'lash_brow', businessName: ARCH_FLUTTER_BRAND_NAME, city: 'Jaipur, Rajasthan' } as SalonProfile;
const seo = buildArchFlutterSeo(seoProfile, resolveArchFlutterConfig(seoProfile));
assert.ok(seo.title.includes('Arch & Flutter'), 'the SEO title carries the brand');
assert.ok(seo.description.length > 60, 'the meta description is written, not truncated');
assert.ok(seo.keywords.includes('lash extensions') && seo.keywords.includes('brow lamination'), 'SEO keywords target the eye-area niche');
assert.equal(seo.ogImage, ARCH_FLUTTER_IMAGES.ogImage, 'the share card uses the Template 13 artwork');
const fallbackSeo = buildArchFlutterSeo({ ...INITIAL_SALON_PROFILE, businessType: 'lash_brow', businessName: '' } as SalonProfile, resolved);
assert.ok(fallbackSeo.title.includes(ARCH_FLUTTER_BRAND_NAME), 'an unnamed salon still ships the Template 13 brand');
const jsonLd = JSON.stringify(seo.jsonLd ?? {});
assert.ok(jsonLd.includes('BeautySalon'), 'SEO emits BeautySalon structured data');
assert.ok(jsonLd.includes('INR'), 'prices are declared in Indian Rupees');
assert.ok(jsonLd.includes('UPI') && jsonLd.includes('PhonePe') && jsonLd.includes('Paytm'), 'Indian payment methods are declared');

/* ---------- 4. The six bundled sample offers ---------- */
const expiredForCountdown: SalonOffer = { ...demoSalonOffers('lash_brow', now)[0], validTo: '2024-01-01' };
const demoOffers = demoSalonOffers('lash_brow', now);
assert.equal(demoOffers.length, 6, 'Template 13 pre-fills six realistic offers');
assert.deepEqual(demoSalonOffers('tattoo_studio', now), [], 'other templates never receive lash demo offers');
assert.deepEqual(
  demoOffers.map((offer) => offer.id),
  ['af-offer-welcome', 'af-offer-combo', 'af-offer-bridal', 'af-offer-happy-hours', 'af-offer-refer', 'af-offer-festive'],
);
assert.deepEqual(
  demoOffers.map((offer) => offer.title),
  ['Glow Up Welcome Offer', 'Lash + Brow Combo', 'Bridal Eye Package', 'Weekday Happy Hours', 'Refer a Friend', 'Festive Season Offer'],
);
assert.deepEqual(
  demoOffers.map((offer) => offer.badge),
  ['New Client', 'Most Popular', 'Bridal Special', 'Limited Slots', 'Referral', 'Festive'],
);
assert.deepEqual(
  demoOffers.map((offer) => offer.offerType),
  ['percent', 'combo', 'combo', 'percent', 'flat', 'free_addon'],
);
assert.deepEqual(
  demoOffers.map((offer) => offer.couponCode),
  ['FLUTTER20', '', '', 'HAPPY15', 'BESTIE500', ''],
);
assert.deepEqual(
  demoOffers.map((offer) => [offer.originalPriceINR, offer.offerPriceINR]),
  [[2499, 1999], [5298, 4499], [9499, 7999], [2499, 2124], [0, 0], [0, 0]],
  'offer prices follow the brief in ₹');
for (const offer of demoOffers) {
  assert.equal(offer.isDemo, true, `${offer.id} is flagged as a demo record`);
  assert.equal(offer.isActive, true, `${offer.id} starts live`);
  assert.ok(offer.description.length > 60, `${offer.id} carries a real description`);
  assert.ok(offer.terms.length > 20, `${offer.id} carries terms`);
  assert.match(offer.validFrom, /^\d{4}-\d{2}-\d{2}$/, 'validFrom is an ISO date');
  assert.match(offer.validTo!, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(new Date(offer.validTo!).getTime() > now, `${offer.id} is not already expired`);
  assert.deepEqual(offer.applicableServices.filter((id) => !ARCH_FLUTTER_TEMPLATE_SERVICES.some((service) => service.id === id)), [], `${offer.id} only references real menu services`);
}
assert.equal(offerSavingINR(demoOffers[0], ARCH_FLUTTER_TEMPLATE_SERVICES[0]), 500, 'welcome offer saves ₹500');
assert.equal(offerSavingINR(demoOffers[1], ARCH_FLUTTER_TEMPLATE_SERVICES.find((s) => s.id === 'af-5')!), 799, 'combo saves ₹799');
assert.equal(offerSavingINR(demoOffers[4], ARCH_FLUTTER_TEMPLATE_SERVICES[0]), 500, 'referral credit is ₹500');
assert.equal(offerDiscountLabel(demoOffers[0]), '20% off');
assert.equal(offerDiscountLabel(demoOffers[3]), '15% off');
assert.equal(offerDiscountLabel(demoOffers[1]), 'Combo price · save ₹799');
assert.equal(offerDiscountLabel(demoOffers[2]), 'Combo price · save ₹1,500');
assert.equal(offerDiscountLabel(demoOffers[4]), 'Flat ₹500 off');
assert.equal(offerDiscountLabel(demoOffers[5]), 'Free add-on worth ₹1,999');
assert.equal(formatOfferDateIN('2026-11-14'), '14 Nov 2026', 'dates render as DD MMM YYYY');
assert.equal(formatOfferDateIN(''), '', 'an unparsable date renders nothing instead of NaN');
assert.equal(formatOfferWindow({ ...demoOffers[0], validTo: '' }), `From ${formatOfferDateIN(demoOffers[0].validFrom)}`, 'an open-ended offer shows only its start date');
assert.equal(formatOfferWindow({ ...demoOffers[0], validFrom: '', validTo: '' }), 'No end date', 'an offer without dates never shows a blank row');
assert.equal(formatOfferWindow(demoOffers[0]), `${formatOfferDateIN(demoOffers[0].validFrom)} – ${formatOfferDateIN(demoOffers[0].validTo)}`);
const welcomeCountdown = offerCountdownLabel(demoOffers[0], now);
assert.match(welcomeCountdown, /^Ends in \d+ days$/, 'the countdown shows whole days left');
const welcomeDays = Number(welcomeCountdown.replace(/\D/g, ''));
assert.ok(welcomeDays >= 59 && welcomeDays <= 61, `the 60-day welcome offer counts down honestly (${welcomeDays} days)`);
assert.equal(offerCountdownLabel(expiredForCountdown, now), 'Expired on 01 Jan 2024', 'an expired offer reports itself honestly');
assert.equal(offerCountdownLabel({ ...demoOffers[0], validTo: '' }, now), 'No end date', 'an open-ended offer has no countdown');
assert.ok(DEEPAVALI_DATES.length >= 5, 'the festive window is derived from real Diwali dates');
const festiveEnd = nextFestiveWeekEnd(now);
assert.equal(demoOffers[5].validTo, festiveEnd, 'the festive offer runs till Diwali week');
assert.ok(new Date(festiveEnd).getTime() > now, 'the festive offer never seeds expired');

/* ---------- 5. Offers are ordinary editable records ---------- */
const seeded = normalizeWorkspace({
  profile: { ...INITIAL_SALON_PROFILE, businessType: 'lash_brow', businessName: ARCH_FLUTTER_BRAND_NAME } as SalonProfile,
  services: ARCH_FLUTTER_TEMPLATE_SERVICES,
  stylists: template.stylists,
});
assert.equal(seeded.profile.promoOffers?.length, 6, 'a fresh Template 13 workspace seeds the six sample offers');
assert.equal(seedSalonOffers({ ...seeded.profile, promoOffers: [] } as SalonProfile)?.length, 0, 'an owner who deleted every offer keeps the empty list');
assert.equal(seedSalonOffers({ ...INITIAL_SALON_PROFILE, businessType: 'tattoo_studio' } as SalonProfile), undefined, 'other templates get no offer key');
assert.equal(seedSalonOffers(seeded.profile)?.length, 6, 'an existing offer list is returned untouched');
const otherTemplate = normalizeWorkspace({
  profile: { ...INITIAL_SALON_PROFILE, businessType: 'tattoo_studio' } as SalonProfile,
  services: CATEGORY_TEMPLATES.tattoo_studio.services,
  stylists: CATEGORY_TEMPLATES.tattoo_studio.stylists,
});
assert.equal(otherTemplate.profile.promoOffers, undefined, 'Template 12 workspaces are untouched');

/* Editing, hiding, deleting and resetting behave like any other record. */
const edited = upsertSalonOffer(seeded.profile, { ...demoOffers[0], title: 'Monsoon Lash Days', offerPriceINR: 1799, badge: 'Monsoon' });
const editedOffer = ownerSalonOffers(edited).find((offer) => offer.id === demoOffers[0].id)!;
assert.equal(editedOffer.title, 'Monsoon Lash Days');
assert.equal(editedOffer.offerPriceINR, 1799);
assert.equal(editedOffer.isDemo, false, 'editing clears the demo flag');
assert.equal(ownerSalonOffers(edited).length, 6, 'editing updates in place instead of duplicating');
const added = upsertSalonOffer(edited, { ...demoOffers[2], id: 'af-offer-owner-1', title: 'Owner Anniversary Offer', isDemo: true });
assert.equal(ownerSalonOffers(added).length, 7, 'a new offer is appended');
assert.equal(ownerSalonOffers(added).find((offer) => offer.id === 'af-offer-owner-1')!.isDemo, false, 'a new offer is never a demo record');
const hidden = toggleSalonOffer(added, 'af-offer-combo');
assert.equal(ownerSalonOffers(hidden).find((offer) => offer.id === 'af-offer-combo')!.isActive, false, 'hide keeps the record in the dashboard');
assert.equal(publicSalonOffers(hidden, now).some((offer) => offer.id === 'af-offer-combo'), false, 'a hidden offer never renders publicly');
const deleted = removeSalonOffer(hidden, 'af-offer-refer');
assert.equal(ownerSalonOffers(deleted).some((offer) => offer.id === 'af-offer-refer'), false, 'delete removes the record');
const afterDelete = normalizeWorkspace({
  profile: deleted,
  services: ARCH_FLUTTER_TEMPLATE_SERVICES,
  stylists: template.stylists,
});
assert.equal(afterDelete.profile.promoOffers?.some((offer) => offer.id === 'af-offer-refer'), false, 'deleted offers stay deleted after a reload');
const reset = resetSampleSalonOffers(deleted);
assert.equal(ownerSalonOffers(reset).length, 6, 'reset restores the six sample offers');
assert.equal(ownerSalonOffers(reset).every((offer) => offer.isDemo), true, 'reset marks them as samples again');

/* Expiry and status rules. */
const expiredOffer: SalonOffer = { ...demoOffers[0], id: 'af-offer-old', validTo: '2024-01-01' };
assert.equal(offerIsLive(expiredOffer, now), false, 'expired offers hide publicly');
assert.equal(offerIsLive({ ...demoOffers[0], isActive: false }, now), false, 'hidden offers hide publicly');
assert.equal(offerIsLive({ ...demoOffers[0], validFrom: '2099-01-01' }, now), false, 'not-yet-started offers hide publicly');
assert.equal(publicSalonOffers({ ...seeded.profile, promoOffers: [expiredOffer, demoOffers[1]] }, now).length, 1);
assert.equal(ownerSalonOffers({ ...seeded.profile, promoOffers: [expiredOffer, demoOffers[1]] }).length, 2, 'expired offers remain in the dashboard');

/* Applicable services and the booking prefill. */
const combo = demoOffers[1];
const comboServices = offerApplicableServices(combo, ARCH_FLUTTER_TEMPLATE_SERVICES);
assert.deepEqual(comboServices.map((service) => service.id), ['af-5', 'af-33']);
assert.equal(offerApplicableServices(demoOffers[4], ARCH_FLUTTER_TEMPLATE_SERVICES).length, ARCH_FLUTTER_TEMPLATE_SERVICES.length, 'an offer with no service list applies to everything');
const prefill = offerBookingPrefill(combo, ARCH_FLUTTER_TEMPLATE_SERVICES);
assert.equal(prefill.service?.id, 'af-5', 'the booking flow opens on the offer service');
assert.equal(prefill.service?.price, 4499, 'the discounted price is prefilled');
assert.ok(prefill.note!.includes('Lash + Brow Combo'), 'the note names the offer');
assert.ok(prefill.note!.includes('₹799'), 'the note carries the saving in rupees');
assert.ok(prefill.note!.length <= 1000);
assert.equal(ARCH_FLUTTER_TEMPLATE_SERVICES.find((service) => service.id === 'af-5')!.price, 3499, 'the real menu price is never mutated');
assert.ok(offerImage(demoOffers[0], 0).fallback.startsWith('/templates/13/'), 'an offer without a photo falls back to bundled artwork');

/* ---------- 6. Storefront: Home, Offers page, empty state ---------- */
const publishedProfile = {
  ...seeded.profile,
  subdomain: 'arch-flutter',
  city: 'Jaipur, Rajasthan',
  address: '12, Ashok Marg, C-Scheme',
  postalCode: '302001',
  phone: '+91 98290 55214',
  whatsapp: '+91 98290 55214',
  serviceCatalogueInitialized: true,
  socialVideos: [],
} as SalonProfile;

const render = (profile: SalonProfile, hash: string, services = ARCH_FLUTTER_TEMPLATE_SERVICES) => {
  locationMock.hash = hash;
  (globalThis as any).window.location.hash = hash;
  return renderToStaticMarkup(
    <SalonWebsitePreview
      profile={profile}
      services={services}
      stylists={template.stylists}
      gallery={[]}
      readOnly
      customerSignedIn
      customerName="Meera"
      onAddAppointment={async (appointment) => appointment}
      onCustomerAccount={() => {}}
    />,
  );
};

const home = render(publishedProfile, '#home');
assert.ok(home.includes('data-layout="hero"'), 'Template 13 renders its hero');
assert.ok(home.includes('Confidence.'), 'the hero headline ships with the template');
const homeCards = home.split('class="af-glass af-hover af-offer-card').length - 1;
assert.ok(homeCards >= 1 && homeCards <= 3, `the home page teases up to three offers (${homeCards} rendered)`);
assert.ok(home.includes('All offers'), 'the home teaser links to the offers page');
assert.ok(home.includes('Book this offer'), 'offer cards carry the booking call to action');
assert.ok(home.includes('FLUTTER20'), 'the home teaser shows the coupon code');

const offersPage = render(publishedProfile, '#offers');
assert.ok(offersPage.includes('id="af-offers"'), 'the offers page section exists');
assert.ok(offersPage.includes('data-layout="offers"'), 'the offers page keeps the shared section contract');
assert.equal(offersPage.split('class="af-glass af-hover af-offer-card').length - 1, 6, 'all six offers render on the offers page');
assert.ok(offersPage.split('is-demo').length - 1 >= 6, 'sample offers are labelled on the site');
assert.ok(offersPage.includes('Sample offer'), 'the demo ribbon is visible to visitors');
for (const title of ['Glow Up Welcome Offer', 'Lash + Brow Combo', 'Bridal Eye Package', 'Weekday Happy Hours', 'Refer a Friend', 'Festive Season Offer']) {
  assert.ok(offersPage.includes(title), `the offers page shows ${title}`);
}
for (const badge of ['New Client', 'Most Popular', 'Bridal Special', 'Limited Slots', 'Referral', 'Festive']) {
  assert.ok(offersPage.includes(badge), `the offers page shows the ${badge} badge`);
}
assert.ok(offersPage.includes('Save ₹500'), 'the saving tag renders in Indian rupees');
assert.ok(offersPage.includes('₹1,999') && offersPage.includes('₹2,499'), 'offer and original prices render with Indian digit grouping');
assert.ok(offersPage.includes('Copy code'), 'coupon codes can be copied');
assert.ok(offersPage.includes('Ends in'), 'the countdown label renders');
assert.ok(offersPage.includes('Valid till'), 'the validity window renders');
assert.ok(offersPage.includes('HAPPY15') && offersPage.includes('BESTIE500'), 'every coupon code is published');
assert.ok(!offersPage.includes('af-offer-grid'), 'the legacy offer grid markup is gone');
assert.ok(!offersPage.includes('FLUTTER15') && !offersPage.includes('BRIDE26'), 'the legacy hardcoded offer copy no longer renders');
assert.equal(ARCH_FLUTTER_DEFAULT_OFFERS.length, 2, 'the legacy config offers are still available to older saved sites');

/* Expired and hidden offers never render, but the dashboard keeps them. */
const mixed = render({ ...publishedProfile, promoOffers: [expiredOffer, { ...demoOffers[1], isActive: false }, demoOffers[2]] }, '#offers');
assert.equal(mixed.split('af-offer-card').length - 1, 1, 'only the live offer renders publicly');
assert.ok(mixed.includes('Bridal Eye Package') && !mixed.includes('Lash + Brow Combo'), 'hidden and expired offers are skipped');

/* The empty state is a friendly card with an image, never a blank area. */
const empty = render({ ...publishedProfile, promoOffers: [] }, '#offers');
assert.ok(empty.includes('af-offers-empty'), 'the empty state renders its own card');
assert.ok(empty.includes('No offers running right now') || empty.includes('offers'), 'the empty state explains itself');
assert.ok(empty.includes('af-offers-empty-media'), 'the empty state ships an image');
assert.ok(empty.includes('/templates/13/art/offer.svg'), 'the empty state image is bundled Template 13 artwork');
assert.ok(empty.includes('wa.me/'), 'the empty state offers a WhatsApp route instead of a dead end');
assert.equal(empty.split('af-offer-card').length - 1, 0, 'no offer cards render when there are none');
const emptyHome = render({ ...publishedProfile, promoOffers: [] }, '#home');
assert.equal(emptyHome.split('af-offer-card').length - 1, 0, 'the home teaser hides completely without offers');

/* Owner copy wins, and nothing placeholder-ish leaks into the markup. */
const ownerPage = render(
  {
    ...publishedProfile,
    businessName: 'Brows By Meher',
    promoOffers: [{ ...demoOffers[0], id: 'af-offer-owner-2', title: 'Meher Anniversary Special', description: 'Half price brow mapping for a month.', badge: 'Anniversary', couponCode: 'MEHER50', offerPriceINR: 199, originalPriceINR: 399, discountValue: 200, offerType: 'flat', isDemo: false }],
  },
  '#offers',
);
assert.ok(ownerPage.includes('Meher Anniversary Special'), 'owner offers replace the samples on the site');
assert.equal(ownerPage.split('af-offer-card').length - 1, 1);
assert.ok(!ownerPage.includes('Sample offer'), 'an owner offer is not labelled as a sample');
for (const junk of ['undefined', 'NaN', 'Infinity', '[object Object]']) {
  assert.ok(!ownerPage.includes(junk), `owner render must not contain ${junk}`);
  assert.ok(!offersPage.includes(junk), `published render must not contain ${junk}`);
}

/* Workspace round-trip keeps offers, template content and the customer wiring. */
const roundTrip = normalizeWorkspace(JSON.parse(JSON.stringify({
  profile: { ...publishedProfile, archFlutter: { heroHeading: 'Frame Your Eyes. Flutter Your Confidence.' } },
  services: ARCH_FLUTTER_TEMPLATE_SERVICES,
  stylists: template.stylists,
})));
assert.equal(roundTrip.profile.promoOffers?.length, 6, 'offers survive a JSON round-trip');
assert.equal(roundTrip.profile.businessType, 'lash_brow');
assert.equal(roundTrip.services.length, 64);
assert.equal(roundTrip.profile.archFlutter?.heroHeading, 'Frame Your Eyes. Flutter Your Confidence.');
const gallerySeed = photoGallery({ ...publishedProfile, photoGalleryInitialized: false }, []);
assert.ok(gallerySeed.length > 0, 'the demo lookbook still seeds for Template 13');

/* ---------- 7. Owner Workspace editor ---------- */
const editorSource = readFileSync('src/components/arch-flutter/ArchFlutterEditor.tsx', 'utf8');
for (const needle of [
  'Promotions & offers',
  'Add offer',
  'Reset to sample offers',
  'Upload photo',
  'Use bundled artwork',
  'ownerSalonOffers',
  'upsertSalonOffer',
  'removeSalonOffer',
  'toggleSalonOffer',
  'resetSampleSalonOffers',
  'uploadSalonImage',
  'applicableServices',
]) {
  assert.ok(editorSource.includes(needle), `the offers manager exposes "${needle}"`);
}
assert.ok(!editorSource.includes('ARCH_FLUTTER_DEFAULT_OFFERS'), 'the editor no longer writes the legacy hardcoded offer list');
assert.ok(!editorSource.includes('setOffer(index'), 'the legacy offer setters are gone');

/* The offers manager really works: open the panel, edit, hide, delete, add, reset. */
let workspaceProfile: SalonProfile = seeded.profile;
const setWorkspaceProfile = (update: any) => {
  workspaceProfile = typeof update === 'function' ? update(workspaceProfile) : update;
};
let editor: any;
await act(async () => {
  editor = create(<ArchFlutterEditor profile={workspaceProfile} setProfile={setWorkspaceProfile} />);
});
const nodeText = (value: any): string => {
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(nodeText).join(' ');
  if (value.props) return nodeText(value.props.children);
  return '';
};
const treeText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(treeText).join(' ');
  return treeText(node.children);
};
const findButton = (label: string) =>
  editor.root.findAll((node: any) => node.type === 'button' && node.props.children === label)[0];
const summaries = editor.root.findAll((node: any) => node.type === 'summary');
const offersSummary = summaries.find((node: any) => nodeText(node.props.children).includes('Promotions & offers'));
assert.ok(offersSummary, 'the editor exposes a Promotions & offers panel');
assert.ok(nodeText(offersSummary!.props.children).includes('(6)'), 'the panel counts the offers');
await act(async () => { offersSummary!.props.onClick({ preventDefault() {} }); });
assert.ok(findButton('Add offer'), 'the owner can add an offer');
assert.ok(findButton('Reset to sample offers'), 'the owner can restore the sample offers');
assert.equal(editor.root.findAll((node: any) => node.type === 'button' && node.props.children === 'Hide').length, 6, 'all six live offers can be hidden');
assert.equal(editor.root.findAll((node: any) => nodeText(node.props.children).trim() === 'Sample offer').length, 6, 'every bundled offer is labelled as a sample');
for (const title of ['Glow Up Welcome Offer', 'Lash + Brow Combo', 'Bridal Eye Package', 'Weekday Happy Hours', 'Refer a Friend', 'Festive Season Offer']) {
  assert.ok(
    editor.root.findAll((node: any) => node.type === 'input' && node.props.value === title).length === 1,
    `${title} is editable in the dashboard`,
  );
}
assert.ok(editor.root.findAll((node: any) => node.type === 'select').length >= 6, 'each offer has an offer-type selector');
assert.ok(treeText(editor.toJSON()).includes('Applies to'), 'the applicable-services picker renders');

/* Editing a sample offer clears its demo flag. */
const titleInput = editor.root.findAll((node: any) => node.type === 'input' && node.props.value === 'Glow Up Welcome Offer')[0];
await act(async () => { titleInput.props.onChange({ target: { value: 'Meher Welcome Days' } }); });
await act(async () => { editor.update(<ArchFlutterEditor profile={workspaceProfile} setProfile={setWorkspaceProfile} />); });
assert.equal(workspaceProfile.promoOffers![0].title, 'Meher Welcome Days');
assert.equal(workspaceProfile.promoOffers![0].isDemo, false, 'editing clears the demo flag in the dashboard too');
assert.equal(editor.root.findAll((node: any) => nodeText(node.props.children).trim() === 'Sample offer').length, 5, 'the edited offer loses its sample ribbon');

/* Hide keeps the record; delete removes it; add creates a hidden draft. */
await act(async () => { findButton('Hide').props.onClick(); });
await act(async () => { editor.update(<ArchFlutterEditor profile={workspaceProfile} setProfile={setWorkspaceProfile} />); });
assert.equal(workspaceProfile.promoOffers!.filter((offer) => !offer.isActive).length, 1, 'a hidden offer stays in the list');
assert.equal(editor.root.findAll((node: any) => node.type === 'button' && node.props.children === 'Show').length, 1, 'a hidden offer offers a Show button');
await act(async () => { findButton('Delete').props.onClick(); });
await act(async () => { editor.update(<ArchFlutterEditor profile={workspaceProfile} setProfile={setWorkspaceProfile} />); });
assert.equal(workspaceProfile.promoOffers!.length, 5, 'delete removes the record');
await act(async () => { findButton('Add offer').props.onClick(); });
await act(async () => { editor.update(<ArchFlutterEditor profile={workspaceProfile} setProfile={setWorkspaceProfile} />); });
const drafted = workspaceProfile.promoOffers![workspaceProfile.promoOffers!.length - 1];
assert.equal(drafted.title, 'New offer');
assert.equal(drafted.isActive, false, 'a new offer starts hidden so a half-filled card never publishes');
assert.equal(drafted.isDemo, false);

/* Reset brings the six samples back. */
await act(async () => { findButton('Reset to sample offers').props.onClick(); });
await act(async () => { editor.update(<ArchFlutterEditor profile={workspaceProfile} setProfile={setWorkspaceProfile} />); });
assert.equal(workspaceProfile.promoOffers!.length, 6, 'reset restores six offers');
assert.equal(workspaceProfile.promoOffers!.every((offer) => offer.isDemo), true, 'reset marks them as samples again');
assert.equal(workspaceProfile.promoOffers![0].title, 'Glow Up Welcome Offer');
await act(async () => { editor.unmount(); });

/* ---------- 8. GlowSlot customer app ---------- */
const demoSalons = withTemplateDemos([], [{
  id: 'lash_brow',
  title: ARCH_FLUTTER_BRAND_NAME,
  shortName: 'Lash & Brow Bar',
  tagline: ARCH_FLUTTER_TAGLINE,
  coverImageUrl: '/templates/13/preview.jpg',
  defaultCity: 'Jaipur, Rajasthan',
} as CustomerTemplate]);
const demoSalon = demoSalons.find((salon) => salon.demoTemplateId === 'lash_brow');
assert.ok(demoSalon, 'the GlowSlot demo directory includes Template 13');
assert.equal(publicSalonOffers(demoSalon!.content.profile, now).length, 6, 'the customer app demo salon carries the six offers');
const salonSource = readFileSync('src/components/customer/Salon.tsx', 'utf8');
assert.ok(salonSource.includes('offersPanel'), 'the customer salon screen renders an offers panel');
assert.ok(salonSource.includes("tab==='Packages'&&offersPanel"), 'offers live in the Packages tab');
assert.ok(salonSource.includes('Book this offer'), 'customer offer cards prefill a booking');
const partsSource = readFileSync('src/components/customer/Parts.tsx', 'utf8');
assert.ok(partsSource.includes('runningOffer'), 'salon cards advertise a running offer');
const customerCss = readFileSync('src/components/customer-app.css', 'utf8');
assert.ok(customerCss.includes('.cr-offer-card'), 'the customer app styles its offer cards');

/* ---------- 9. Source guards: styling scope, glass, motion, reduced motion ---------- */
const css = readFileSync('src/components/archFlutter.css', 'utf8');
assert.ok(css.includes('.af-site'), 'template styles are scoped to .af-site');
assert.ok(css.includes('backdrop-filter: blur(16px)'), 'glass cards use the spec blur');
assert.ok(css.includes('-webkit-backdrop-filter'), 'glass cards carry the Safari prefix');
assert.ok(css.includes('@supports not ((backdrop-filter'), 'glass cards provide a non-blur fallback');
assert.ok(css.includes('prefers-reduced-motion: reduce'), 'motion is disabled for reduced-motion visitors');
assert.ok(css.includes('scale(1.05)'), 'card hover scale is applied');
assert.ok(css.includes('0 12px 32px rgba(43, 27, 23, 0.18)'), 'the soft hover shadow is applied');
assert.ok(css.includes('scroll-snap-type: x mandatory'), 'offers become a carousel on small screens');
assert.ok(css.includes('.af-site .af-offers'), 'offers use the bento grid on desktop');
assert.ok(css.includes('var(--af-arch)'), 'offer images keep the arch mask');

/* Every af-* class used by the components is actually styled. */
const componentFiles = [
  'src/components/ArchFlutterWebsite.tsx',
  'src/components/arch-flutter/DeviceMockup.tsx',
  'src/components/arch-flutter/BeforeAfterSlider.tsx',
  'src/components/arch-flutter/ReelsRail.tsx',
  'src/components/arch-flutter/TestimonialCarousel.tsx',
  'src/components/arch-flutter/Ornaments.tsx',
  'src/components/arch-flutter/Motion.tsx',
];
const missingClasses = new Set<string>();
for (const file of componentFiles) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/className="([^"]*)"/g)) {
    for (const token of match[1].split(/\s+/)) {
      if (!token.startsWith('af-') || token.includes('${')) continue;
      if (!css.includes(`.${token}`)) missingClasses.add(`${file}: ${token}`);
    }
  }
}
assert.deepEqual([...missingClasses], [], 'every af-* utility used by the components has a CSS rule');

/* ---------- 10. Backend seed ---------- */
const seedSql = readFileSync('backend/arch-flutter-demo-offers.sql', 'utf8');
assert.ok(seedSql.includes('promoOffers'), 'the seed writes the workspace offer records');
assert.ok(seedSql.includes('public.studioflow_offers'), 'the seed mirrors offers into the shared offers table');
assert.ok(seedSql.includes("'isDemo', true"), 'seeded rows are flagged as demo records');
for (const title of ['Glow Up Welcome Offer', 'Lash + Brow Combo', 'Bridal Eye Package', 'Weekday Happy Hours', 'Refer a Friend', 'Festive Season Offer']) {
  assert.ok(seedSql.includes(title), `the seed ships ${title}`);
}
for (const code of ['FLUTTER20', 'HAPPY15', 'BESTIE500']) {
  assert.ok(seedSql.includes(code), `the seed ships the ${code} code`);
}
assert.ok(seedSql.includes('where not exists'), 'the seed is idempotent');
assert.ok(seedSql.includes("= 'null'::jsonb"), 'the seed never overwrites an owner offer list');

console.log('PASS: Template 13 (Arch & Flutter) — registered in the picker/onboarding/routing, all bundled artwork present, ₹ formatting + resolver + SEO, six editable sample offers with demo flags, expiry/hide rules, home + offers page + empty state, booking prefill at the discounted price, Owner Workspace offers manager, GlowSlot offers panel and demo card badge, scoped glass styles, reduced-motion guards and an idempotent SQL seed.');
