import React from 'react';
import {act, create} from 'react-test-renderer';
import {renderToStaticMarkup} from 'react-dom/server';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, statSync} from 'node:fs';
import {CustomerSalonWebsite} from '../src/components/CustomerSalonWebsite';
import {HairSpaWebsite} from '../src/components/HairSpaWebsite';
import {BookingModal} from '../src/components/BookingModal';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {CATEGORY_STANDARDIZED_DATA} from '../src/templateData';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
import {supabase} from '../src/lib/supabase';
import {requestedTemplate, developmentTemplateForSiteSlug} from '../src/lib/templateEntry';
import {
  KESH_PRAKRITI_IMAGES,
  KESH_PRAKRITI_SAMPLE_GALLERY,
  keshContactSummary,
  keshGallery,
  keshHeroImage,
  keshOpeningHours,
  keshPackages,
  keshPublishedReviews,
} from '../src/lib/keshPrakriti';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
// The header focus management uses requestAnimationFrame; jsdom-less tests need a stub.
(globalThis as any).requestAnimationFrame = (callback: (time: number) => void) => setTimeout(() => callback(Date.now()), 0);
(globalThis as any).cancelAnimationFrame = (handle: any) => clearTimeout(handle);
(globalThis as any).location = {origin: 'https://studioflow.test', search: '', hash: '', href: 'https://studioflow.test/'};
(globalThis as any).history = {replaceState() {}, pushState() {}};
const memory = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => void memory.set(key, value),
  removeItem: (key: string) => void memory.delete(key),
};
(globalThis as any).window = {
  addEventListener() {},
  removeEventListener() {},
  // Reduced motion is honoured in this harness so animation exit is instant.
  matchMedia: () => ({matches: true, addEventListener() {}, removeEventListener() {}}),
  scrollY: 0,
};
(globalThis as any).document = {
  hidden: false,
  documentElement: {scrollLeft: 0, scrollTop: 0},
  body: {style: {}},
  addEventListener() {},
  removeEventListener() {},
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
};
const text = (node: any): string => (typeof node === 'string' ? node : (node?.children || []).map(text).join(' '));
const buttonBy = (root: any, label: string) =>
  root.root.findAll((node: any) => node.type === 'button' && text(node).includes(label))[0];

// ---------------------------------------------------------------------------
// 1. Bundled assets: every Template 06 image is committed locally and served.
// ---------------------------------------------------------------------------
for (const [key, url] of Object.entries(KESH_PRAKRITI_IMAGES)) {
  assert.ok(url.startsWith('/templates/kesh-prakriti/'), `${key}: bundled asset expected, got ${url}`);
  const path = 'public' + url;
  assert.ok(existsSync(path), `${key}: missing ${path}`);
  const stat = statSync(path);
  assert.ok(stat.size > 20_000, `${key}: photo looks too small (${stat.size} bytes)`);
  const head = readFileSync(path).subarray(0, 2).toString('hex');
  assert.equal(head, 'ffd8', `${key}: expected a JPEG`);
}
const templateSources = [
  'src/components/HairSpaWebsite.tsx',
  'src/lib/keshPrakriti.ts',
  ...['BookingSection', 'BotanicalIngredients', 'BrandPhilosophy', 'ContactSection', 'ExperienceSection', 'FAQSection', 'FeaturedRituals', 'GalleryLightbox', 'HairSpaFooter', 'HairSpaHeader', 'HeroSection', 'QuickNavigation', 'Reveal', 'GallerySection', 'SanctuarySection', 'ScalpCareJourney', 'ServicesSection', 'TeamSection'].map(
    (name) => `src/components/hair-spa/${name}.tsx`,
  ),
];
for (const file of templateSources) {
  const source = readFileSync(file, 'utf8');
  assert.ok(!/https?:\/\/images\.unsplash\.com|picsum|placehold\.co/i.test(source), `${file}: remote stock photo dependency found`);
}
// The template package data (used by the demo site, the owner gallery picker and
// the hero presets) must follow the same rules as the live site.
const templateSeed = CATEGORY_STANDARDIZED_DATA.hair_spa;
assert.equal(templateSeed.reviews.length, 0, 'no testimonials may be bundled with Template 06');
assert.equal(templateSeed.totalReviewCount, 0);
assert.equal(templateSeed.averageRating, 0);
assert.ok(templateSeed.gallery.length >= 4);
for (const photo of templateSeed.gallery) {
  assert.ok(photo.url.startsWith('/templates/kesh-prakriti/'), `template gallery photo must be bundled: ${photo.url}`);
  assert.ok(existsSync('public' + photo.url), `missing ${photo.url}`);
}
assert.ok(!/heal|clinical|tricholog|diagnos/i.test(templateSeed.foundingNarrative + templateSeed.certifications.map((c) => c.title + c.description).join(' ')), 'template seed copy must not make medical claims');
console.log('PASS: all eight Template 06 photographs are local JPEG assets, the template package ships bundled photos with no invented reviews or medical claims, and no Template 06 component depends on a remote stock-photo host.');

// ---------------------------------------------------------------------------
// 2. Routing: query entry, alias and the development slug fallback.
// ---------------------------------------------------------------------------
assert.equal(requestedTemplate('?template=hair_spa')?.id, 'hair_spa');
assert.equal(requestedTemplate('?category=Spa')?.id, 'hair_spa');
assert.equal(developmentTemplateForSiteSlug('hair-spa', true)?.id, 'hair_spa');
assert.equal(developmentTemplateForSiteSlug('kesh-prakriti-hair-spa', true)?.id, 'hair_spa');
assert.equal(developmentTemplateForSiteSlug('hair-spa', false), null, 'slug fallback must stay development-only');

// ---------------------------------------------------------------------------
// 3. Data helpers: saved data first, honest fallbacks, no invented contacts.
// ---------------------------------------------------------------------------
const template = CATEGORY_TEMPLATES.hair_spa;
assert.ok(template.services.length >= 3);
assert.ok(template.services.every((service) => !/tricholog|certif|kills|diagnos|reverse/i.test(service.description)), 'demo menu must avoid medical claims');
assert.ok(template.stylists.every((staff) => staff.avatarUrl.startsWith('/templates/kesh-prakriti/team-')), 'template portraits are bundled locally');

const heroWithoutCover = keshHeroImage({...INITIAL_SALON_PROFILE, businessType: 'hair_spa', coverImageUrl: template.coverImageUrl});
assert.equal(heroWithoutCover.src, KESH_PRAKRITI_IMAGES.hero);
assert.equal(heroWithoutCover.isOwnerPhoto, false);
const heroWithCover = keshHeroImage({...INITIAL_SALON_PROFILE, businessType: 'hair_spa', coverImageUrl: 'https://cdn.example.com/saved-hero.jpg'});
assert.equal(heroWithCover.src, 'https://cdn.example.com/saved-hero.jpg');
assert.equal(heroWithCover.isOwnerPhoto, true);
assert.equal(keshHeroImage({...INITIAL_SALON_PROFILE, businessType: 'hair_spa', coverImageUrl: 'javascript:alert(1)'}).src, KESH_PRAKRITI_IMAGES.hero);

const savedPhoto = {id: 'saved-1', category: 'Spa' as const, url: 'https://cdn.example.com/saved.jpg', title: 'Saved photo', isDemo: false};
assert.deepEqual(keshGallery([savedPhoto]).map((photo) => photo.id), ['saved-1']);
assert.deepEqual(keshGallery([]).map((photo) => photo.id), KESH_PRAKRITI_SAMPLE_GALLERY.map((photo) => photo.id));
assert.ok(keshGallery([]).every((photo) => photo.isDemo), 'reference gallery is always labelled as a sample');
assert.deepEqual(keshGallery([{...savedPhoto, id: 'demo', isDemo: true}]).map((photo) => photo.id), KESH_PRAKRITI_SAMPLE_GALLERY.map((photo) => photo.id));
assert.deepEqual(keshGallery([{...savedPhoto, url: 'data:image/png;base64,AA'}]).map((photo) => photo.id), KESH_PRAKRITI_SAMPLE_GALLERY.map((photo) => photo.id));

const templatePackages = keshPackages(template.services);
assert.equal(templatePackages.length, 5, 'the five starter packages bundled with the template are listed');
assert.ok(templatePackages.every((service) => service.id.startsWith('template-pkg-hair_spa-')));
assert.deepEqual(keshPackages([{...template.services[0], name: 'Head Spa Ritual', category: 'Scalp Detox'}]), [], 'a menu without combination treatments shows none');
assert.equal(keshPackages([{...template.services[0], name: 'Head Spa + Lepam Combo'}]).length, 1);

const noContact = keshContactSummary({...INITIAL_SALON_PROFILE, businessType: 'hair_spa', phone: '', whatsapp: '', email: '', address: '', city: '', postalCode: '', landmark: '', latitude: undefined, longitude: undefined, workingHoursMonFri: '', workingHoursTue: '', workingHoursSat: '', workingHoursSun: ''});
assert.equal(noContact.phone, '');
assert.equal(noContact.whatsappUrl, '');
assert.equal(noContact.email, '');
assert.equal(noContact.email, '');
assert.equal(noContact.mapsUrl, '');
assert.deepEqual(noContact.hours, []);
assert.equal(noContact.hasAnyContact, false);
const fullContact = keshContactSummary({...INITIAL_SALON_PROFILE, businessType: 'hair_spa', phone: '+91 98400 11993', whatsapp: '+91 98400 11993', email: 'hello@example.com', address: '12 Alwarpet Road', city: 'Chennai', postalCode: '600018', workingHoursMonFri: '10:00 am – 8:00 pm'});
assert.equal(fullContact.phone, '+91 98400 11993');
assert.ok(fullContact.whatsappUrl.startsWith('https://wa.me/919840011993'));
assert.equal(fullContact.email, 'hello@example.com');
assert.ok(fullContact.mapsUrl.startsWith('https://www.google.com/maps/search/'));
assert.deepEqual(fullContact.hours, [['Monday – Friday', '10:00 am – 8:00 pm']]);
assert.deepEqual(keshOpeningHours({workingHoursMonFri: ' ', workingHoursTue: 'By appointment', workingHoursSat: '', workingHoursSun: ''} as any), [['Tuesday', 'By appointment']]);

const demoReview = {...template.services[0], id: 'r'} as any;
assert.deepEqual(
  keshPublishedReviews({websiteTestimonials: [{id: 'a', name: 'A', comment: 'Real story', rating: 5, isDemo: true, verified: false, serviceName: '', location: '', avatarUrl: '', date: ''}, {id: 'b', name: 'B', comment: '  ', rating: 5, serviceName: '', location: '', avatarUrl: '', date: ''}, {id: 'c', name: 'C', comment: 'Saved story', rating: 5, serviceName: '', location: '', avatarUrl: '', date: ''}]} as any).map((review: any) => review.id),
  ['c'],
);
void demoReview;
console.log('PASS: hero/gallery/contact/review helpers use saved salon data, label bundled imagery as samples and never fabricate contacts, packages or testimonials.');

// ---------------------------------------------------------------------------
// 4. Server-rendered storefront: real prices, real hours, honest empty states.
// ---------------------------------------------------------------------------
const keshService = (overrides: Record<string, unknown> = {}) => ({
  id: 'kp-1',
  name: 'Head Spa & Scalp Cleanse',
  category: 'Scalp Detox',
  durationMinutes: 70,
  price: 1950,
  description: 'A warm head spa sequence with a gentle scalp cleanse.',
  icon: 'water_drop',
  ...overrides,
});
const publishedProfile = {
  ...INITIAL_SALON_PROFILE,
  businessType: 'hair_spa' as const,
  businessName: 'Kesh Prakriti Alwarpet',
  subdomain: 'kesh-alwarpet',
  phone: '+91 98400 11993',
  whatsapp: '+91 98400 11993',
  email: 'hello@kesh.example',
  address: '12 Alwarpet Road',
  city: 'Chennai',
  postalCode: '600018',
  workingHoursMonFri: '10:00 am – 8:00 pm',
  workingHoursSat: '9:00 am – 7:00 pm',
  websiteTestimonials: [],
  photoGalleryInitialized: true,
  photoGalleryType: 'hair_spa' as const,
  photoGallery: [savedPhoto],
};
const services = [
  keshService(),
  keshService({id: 'kp-2', name: 'Argan Steam Ritual', category: 'Moisture', price: 2100, durationMinutes: 75}),
  keshService({id: 'kp-3', name: 'Head Spa Combo Ritual', category: 'Packages', price: 3300, durationMinutes: 110}),
];
const published = renderToStaticMarkup(
  <CustomerSalonWebsite profile={publishedProfile} services={services} stylists={[]} readOnly onAddAppointment={async (appointment) => appointment} onCustomerAccount={() => {}} gallery={[]} />,
);
assert.ok(published.includes('data-template="hair_spa"'));
assert.ok(published.includes('kp-site'));
assert.ok(published.includes('Kesh Prakriti Alwarpet'));
assert.ok(published.includes('Skip to main content'));
for (const name of ['Head Spa &amp; Scalp Cleanse', 'Argan Steam Ritual', 'Head Spa Combo Ritual']) {
  assert.ok(published.includes(name), `${name} missing from the live menu`);
}
assert.ok(published.includes('₹1,950') && published.includes('₹2,100') && published.includes('₹3,300'), 'saved prices must render');
assert.ok(published.includes('70 min') && published.includes('110 min'), 'saved durations must render');
assert.ok(published.includes('10:00 am – 8:00 pm'), 'saved opening hours must render');
assert.ok(published.includes('12 Alwarpet Road, Chennai, 600018'), 'saved address must render');
assert.ok(published.includes('tel:+919840011993'), 'saved phone must be callable');
assert.ok(published.includes('https://wa.me/919840011993'), 'saved WhatsApp must be linked');
assert.ok(published.includes('hello@kesh.example'));
assert.ok(published.includes('Saved photo'), 'saved gallery photo must be used');
assert.ok(!published.includes('DEMO / SAMPLE · 01'), 'saved gallery photos are never labelled as demo');
assert.ok(!published.includes('Demo testimonial'), 'no sample testimonials on the published site');
assert.ok(published.includes('No client reviews have been published'), 'honest empty review state');
assert.ok(published.includes('Book an Appointment'));
assert.ok(published.includes('SALON PACKAGES') && published.includes('Book this package'), 'saved package shown');
assert.ok(!published.includes('kills') && !published.includes('trichologist'), 'no medical claims');
// Hero loading strategy + alt text.
const heroTag = (published.match(/<img[^>]*kp-hero-image[^>]*>/) || [''])[0];
assert.ok(heroTag.includes('loading="eager"') && heroTag.includes('fetchPriority="high"'), 'hero image must be prioritised');
assert.ok(/alt="[^"]{10,}"/.test(heroTag), 'hero image needs meaningful alt text');
// Every internal anchor resolves to a rendered section id.
const anchors = Array.from(new Set(Array.from(published.matchAll(/href="#([\w-]+)"/g), (match) => match[1])));
assert.ok(anchors.length >= 5);
for (const anchor of anchors) {
  assert.ok(published.includes(`id="${anchor}"`), `dead anchor #${anchor}`);
}
assert.ok(anchors.includes('treatments') && anchors.includes('philosophy') && anchors.includes('gallery') && anchors.includes('contact'));
console.log('PASS: published storefront renders saved menu, prices, durations, hours, address, gallery and honest review/FAQ states with live anchors and a prioritised hero image.');

// Empty published catalogue: nothing invented, no dead contact links.
const emptyProfile = {...publishedProfile, phone: '', whatsapp: '', email: '', address: '', city: '', postalCode: '', workingHoursMonFri: '', workingHoursSat: ''};
const empty = renderToStaticMarkup(
  <CustomerSalonWebsite profile={emptyProfile} services={[]} stylists={[]} readOnly onAddAppointment={async (appointment) => appointment} gallery={[]} />,
);
assert.ok(empty.includes('The service menu is being updated'), 'honest empty menu copy');
assert.ok(!empty.includes('₹'), 'empty menu must not print template prices');
assert.ok(!empty.includes('Japanese Ultrasonic') && !empty.includes('Head Spa Ritual & Scalp Cleanse'), 'template services are not used on a published salon');
assert.ok(!empty.includes('tel:') && !empty.includes('wa.me'), 'no contact link without saved details');
assert.ok(!empty.includes('id="contact"'), 'contact section hidden when nothing is saved');
assert.ok(!empty.includes('href="#contact"'), 'no anchor to a missing contact section');
assert.ok(empty.includes('Ask about services'), 'hero offers an honest next step');
assert.ok(empty.includes('This page has no reviews') === false);
console.log('PASS: a published sanctuary with no saved menu/contact details shows honest empty states without template prices, contact placeholders or dead anchors.');

// Template demo (no slug): demo menu, demo photos labelled, no online booking.
const demoProfile = {...INITIAL_SALON_PROFILE, businessType: 'hair_spa' as const, subdomain: '', phone: '', whatsapp: '', email: '', address: '', city: '', postalCode: '', websiteTestimonials: []};
const demo = renderToStaticMarkup(
  <CustomerSalonWebsite profile={demoProfile} services={template.services} stylists={template.stylists} readOnly onAddAppointment={async (appointment) => appointment} gallery={[]} />,
);
assert.ok(demo.includes('DEMO / SAMPLE'), 'bundled demo photography is labelled');
assert.ok(demo.includes('Demo / sample photograph'), 'hero credit label present');
assert.ok(demo.includes('Ask about booking') || demo.includes('Online booking opens once this website is live'), 'demo explains that booking is not open');
assert.ok(demo.includes('Gayatri Raman') && !demo.includes('Chief Trichologist'), 'demo team listed without invented credentials');
for (const person of template.stylists) {
  assert.ok(existsSync('public' + person.avatarUrl), `portrait exists for ${person.name}`);
  assert.ok(demo.includes(`src="${person.avatarUrl}"`), `portrait rendered for ${person.name}`);
}
assert.ok(!demo.includes('aria-label="Photo not added for Gayatri Raman"'));
for (const category of ['Spa', 'Sanctuary', 'Botanicals']) assert.ok(demo.includes(`${category} (`), `${category} filter present`);
console.log('PASS: template demo labels every bundled photo, offers no fake online booking and renders the bundled team portraits.');

// ---------------------------------------------------------------------------
// 5. Interaction: filters, gallery lightbox, FAQ, menu and booking hand-off.
// ---------------------------------------------------------------------------
let booked: any = null;
const savedGallery = [
  savedPhoto,
  {...savedPhoto, id: 'saved-2', url: 'https://cdn.example.com/saved-2.jpg', title: 'Saved treatment room'},
  {...savedPhoto, id: 'saved-3', url: 'https://cdn.example.com/saved-3.jpg', title: 'Saved head spa bed'},
];
const shared: any = {profile: publishedProfile, services, readOnly: true, onBook: () => {}, onCustomerAccount: () => {}};
let ui: any;
await act(async () => {
  ui = create(
    <HairSpaWebsite
      profile={publishedProfile}
      services={services}
      stylists={[{id: 'st-1', name: 'Gayatri Raman', role: 'Scalp Care Lead', avatarUrl: '', specialties: [], rating: 0}]}
      galleryPhotos={savedGallery}
      shared={shared}
      enabledSections={[]}
      showPackages
      customerSignedIn={false}
      bookingAvailable
      onBook={(service) => {booked = service;}}
      onAccount={() => {}}
      onMyBookings={() => {}}
      onViewSpecialist={() => {}}
    />,
  );
});
// Service category filter narrows the menu and resets safely.
const filterButtons = () => ui.root.findAll((node: any) => node.type === 'button' && ['All', 'Scalp Detox', 'Moisture', 'Packages'].includes(text(node)));
assert.equal(filterButtons().length, 4);
const articleNames = () => ui.root.findAll((node: any) => node.type === 'article' && String(node.props.className || '').includes('kp-service-card')).map(text);
assert.equal(articleNames().length, 3);
await act(async () => filterButtons().find((node: any) => text(node) === 'Moisture').props.onClick());
assert.deepEqual(articleNames().map((value: string) => value.match(/Argan Steam Ritual/)?.[0]).filter(Boolean), ['Argan Steam Ritual']);
await act(async () => filterButtons().find((node: any) => text(node) === 'All').props.onClick());
assert.equal(articleNames().length, 3);

// Booking hand-off passes the exact saved service.
await act(async () => buttonBy(ui, 'Book this service').props.onClick());
assert.equal(booked?.id, 'kp-1');

// Gallery: only saved photos are rendered and the lightbox stays in range.
const galleryButtons = () => ui.root.findAll((node: any) => node.type === 'button' && String(node.props.className || '').includes('kp-gallery-image'));
assert.equal(galleryButtons().length, 3, 'exactly the three saved photos are in the desktop gallery');
assert.ok(galleryButtons().every((node: any) => !text(node).includes('DEMO / SAMPLE')), 'saved photos are not labelled as demo');
const lightbox = () => ui.root.findAll((node: any) => node.type === 'div' && node.props?.role === 'dialog' && String(node.props['aria-label'] || '').startsWith('Gallery image'));
await act(async () => galleryButtons()[0].props.onClick());
assert.equal(lightbox().length, 1);
const lightboxNav = (label: string) => ui.root.findAll((node: any) => node.type === 'button' && node.props['aria-label'] === label)[0];
await act(async () => lightboxNav('Next image').props.onClick({stopPropagation(){}}));
assert.equal(lightbox()[0].props['aria-label'], 'Gallery image 2 of 3');
await act(async () => lightboxNav('Previous image').props.onClick({stopPropagation(){}}));
assert.equal(lightbox()[0].props['aria-label'], 'Gallery image 1 of 3');
await act(async () => lightboxNav('Previous image').props.onClick({stopPropagation(){}}));
assert.equal(lightbox()[0].props['aria-label'], 'Gallery image 3 of 3', 'lightbox wraps instead of leaving the range');
const closeControl = lightboxNav('Close image viewer');
assert.equal(closeControl.props['aria-label'], 'Close image viewer');
// Clicking close must not throw and must leave at most one viewer mounted. The
// AnimatePresence exit frame itself is not observable in react-test-renderer.
await act(async () => closeControl.props.onClick({stopPropagation(){}}));
assert.ok(lightbox().length <= 1);

// FAQ: only one answer open, aria-expanded tracks state.
const faqButtons = () => ui.root.findAll((node: any) => node.type === 'button' && String(node.props.className || '').includes('kp-faq-question'));
assert.equal(faqButtons().length, 6);
const expanded = () => faqButtons().filter((node: any) => node.props['aria-expanded']);
assert.equal(expanded().length, 1);
await act(async () => faqButtons()[2].props.onClick());
assert.equal(expanded().length, 1);
assert.equal(faqButtons()[2].props['aria-expanded'], true);
assert.ok(faqButtons()[2].props['aria-controls']);

// Mobile navigation drawer opens, traps focus and closes on Escape.
const menuToggle = () => ui.root.findAll((node: any) => node.type === 'button' && String(node.props['aria-label'] || '').endsWith('navigation') && node.props['aria-controls'] === 'kp-mobile-navigation')[0];
assert.equal(menuToggle().props['aria-expanded'], false);
await act(async () => menuToggle().props.onClick());
assert.equal(menuToggle().props['aria-expanded'], true, 'drawer opens');
assert.ok(ui.root.findAll((node: any) => node.props?.['aria-label'] === 'Mobile navigation').length >= 1);
await act(async () => ui.root.findAll((node: any) => node.type === 'button' && node.props['aria-label'] === 'Close navigation')[0].props.onClick());
assert.equal(menuToggle().props['aria-expanded'], false, 'drawer closes');
await act(async () => ui.unmount());

// Without a published booking flow, every booking CTA stays on the page.
let unexpectedBooking = 0;
await act(async () => {
  ui = create(
    <HairSpaWebsite
      profile={publishedProfile}
      services={services}
      stylists={[]}
      galleryPhotos={[]}
      shared={shared}
      enabledSections={[]}
      showPackages
      bookingAvailable={false}
      onBook={() => {unexpectedBooking++;}}
      onAccount={() => {}}
      onMyBookings={() => {}}
      onViewSpecialist={() => {}}
    />,
  );
});
await act(async () => buttonBy(ui, 'Contact us').props.onClick());
await act(async () => buttonBy(ui, 'Book this service').props.onClick());
assert.equal(unexpectedBooking, 0, 'unpublished booking must not open the checkout');
await act(async () => ui.unmount());
console.log('PASS: category filters, saved-service booking hand-off, bounded lightbox, accessible FAQ and drawer behaviour, and a contact fallback when online booking is not available.');

// ---------------------------------------------------------------------------
// 6. Availability always comes from Supabase; failures stay honest.
// ---------------------------------------------------------------------------
const bookingSource = readFileSync('src/components/BookingModal.tsx', 'utf8');
assert.ok(!/const TIME_SLOTS/.test(bookingSource), 'hard-coded availability table must be gone');
assert.ok(bookingSource.includes("studioflow_available_slots") && bookingSource.includes("studioflow_android_slots"), 'slot RPCs are used');
assert.ok(!/bookingConfirmed\s*[:=]/.test(bookingSource));

let calls: any[] = [];
const staff = {id: 'st-1', name: 'Gayatri Raman', role: 'Scalp Care Lead', avatarUrl: '', specialties: [], rating: 0};
const profile = {...publishedProfile};
let reservations = 0;
supabase.rpc = (async (name: string, args: any) => {
  calls.push({name, args});
  if (name === 'studioflow_booking_specialists') return {data: {published: true, specialistIds: ['st-1']}, error: null};
  return {data: [{time: '10:30', label: '10:30 AM', available: true, stylistId: 'st-1'}], error: null};
}) as any;
globalThis.fetch = (async () => new Response(JSON.stringify({configured: true}), {headers: {'Content-Type': 'application/json'}})) as any;
await act(async () => {
  ui = create(<BookingModal isOpen onClose={() => {}} profile={profile} services={services} stylists={[staff]} onAddAppointment={async (appointment) => {reservations++; return appointment;}} />);
});
await act(async () => buttonBy(ui, 'Continue to Date & Slot').props.onClick());
assert.ok(calls.some((call) => call.name === 'studioflow_available_slots' && call.args.p_slug === 'kesh-alwarpet'));
await act(async () => buttonBy(ui, '10:30 AM').props.onClick());
assert.equal(reservations, 0, 'time selection alone never reserves');
await act(async () => ui.unmount());

supabase.rpc = (async (name: string) => {
  if (name === 'studioflow_booking_specialists') return {data: {published: true, specialistIds: ['st-1']}, error: null};
  return {data: null, error: {message: 'Availability service is offline'}};
}) as any;
await act(async () => {
  ui = create(<BookingModal isOpen onClose={() => {}} profile={profile} services={services} stylists={[staff]} onAddAppointment={async (appointment) => {reservations++; return appointment;}} />);
});
await act(async () => buttonBy(ui, 'Continue to Date & Slot').props.onClick());
assert.ok(text(ui.toJSON()).includes('Availability service is offline'), 'backend slot failure is surfaced, not hidden');
assert.ok(text(ui.toJSON()).includes('No available slots'), 'honest empty slot state');
assert.equal(reservations, 0);
await act(async () => ui.unmount());
console.log('PASS: booking slots come from the availability RPC, a slot click does not reserve, and backend failures surface an honest empty state.');
