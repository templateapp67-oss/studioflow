import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, create } from 'react-test-renderer';
import { CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import { CATEGORY_STANDARDIZED_DATA } from '../src/templateData';
import { CustomerSalonWebsite } from '../src/components/CustomerSalonWebsite';
import { SalonWebsitePreview } from '../src/components/SalonWebsitePreview';
import { normalizeWorkspace } from '../src/lib/normalizeWorkspace';
import { photoGallery, withPhotoGallery } from '../src/lib/photoGallery';
import {
  PINKY_NAILS_GALLERY_IMAGES,
  PINKY_NAILS_IMAGES,
  PINKY_NAILS_PALETTE,
  hasOwnerCustomNailTagline,
  isLegacyNailStudioStockImage,
  isValidNailService,
  pinkyNailsContactSummary,
  pinkyNailsServiceImage,
  upgradeNailStudioTemplate,
} from '../src/lib/pinkyNails';
import { applyTemplateDesign } from '../src/lib/templateSelection';
import { defaultServiceImage } from '../src/lib/serviceImages';
import { INITIAL_SALON_PROFILE } from '../src/mockData';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
if (!(globalThis as any).document) {
  (globalThis as any).document = { addEventListener() {}, removeEventListener() {}, body: { style: {} } };
}
if (!(globalThis as any).window) {
  (globalThis as any).window = {
    addEventListener() {},
    removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    location: { search: '', href: 'http://localhost/' },
  };
}

const PINKY_MARKERS = [
  'sf-pinky-nails',
  'sf-pn-header',
  'sf-pn-hero',
  'sf-pn-services-section',
  'sf-pn-about-section',
  'sf-pn-art-section',
  'sf-pn-gallery-section',
  'sf-pn-team-section',
  'sf-pn-reviews-section',
  'sf-pn-booking-banner',
  'sf-pn-location-section',
  'sf-pn-footer',
];

function assertAllHashLinksHaveTargets(html: string, label: string) {
  for (const id of [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1])) {
    assert.ok(html.includes(`id="${id}"`), `[${label}] Broken hash link #${id}`);
  }
}

const tmpl = CATEGORY_TEMPLATES.nail_studio;

// ============================================================================
// 1. Palette, scoping and template identity
// ============================================================================
assert.deepEqual(PINKY_NAILS_PALETTE, {
  softPink: '#F4C8D5',
  blushBackground: '#FFF5F7',
  deepBerry: '#702D4B',
  warmWhite: '#FFFCFA',
  roseGold: '#C49A86',
  darkText: '#30242A',
  white: '#FFFFFF',
});
assert.equal(tmpl.id, 'nail_studio', 'Template 05 must keep its existing id');
assert.equal(tmpl.title, 'Pinky Nails Studio');
assert.equal(tmpl.themeStyle.heroBackground, 'bg-[#FFF5F7]');
assert.equal(tmpl.themeStyle.buttonBg, 'bg-[#702D4B] hover:bg-[#5c233d]');

const pinkyCss = readFileSync('src/pinkyNails.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
for (const hex of Object.values(PINKY_NAILS_PALETTE).filter((hex) => hex !== '#FFFFFF')) {
  assert.ok(pinkyCss.toUpperCase().includes(hex), `Missing palette colour ${hex} in pinkyNails.css`);
}
for (const bp of ['1024px', '640px', '380px']) {
  assert.ok(pinkyCss.includes(`max-width: ${bp}`), `Missing responsive breakpoint ${bp}`);
}
for (const line of pinkyCss.split('\n').map((l) => l.trim()).filter((l) => l.endsWith('{'))) {
  if (line.startsWith('@')) continue;
  for (const part of line.slice(0, -1).split(',')) {
    assert.ok(
      part.trim().startsWith('.sf-page[data-template="nail_studio"]'),
      `Unscoped Template 05 CSS selector: ${part.trim()}`,
    );
  }
}

// ============================================================================
// 2. Every required image is a separate asset on disk
// ============================================================================
const imageEntries = Object.entries(PINKY_NAILS_IMAGES);
assert.equal(new Set(imageEntries.map(([, p]) => p)).size, imageEntries.length, 'Every image path must be unique');
for (const [key, relPath] of imageEntries) {
  const diskPath = `public${relPath}`;
  assert.ok(relPath.startsWith('/templates/pinky-nails/'), `${key} must live in the template folder`);
  assert.ok(existsSync(diskPath), `Missing image asset for ${key}: ${diskPath}`);
  assert.ok(statSync(diskPath).size > 20_000, `Asset ${diskPath} looks unexpectedly small`);
}
for (const required of [
  'heroArtist',
  'nailArtCloseup',
  'manicureTreatment',
  'studioInterior',
  'nailArtPortfolio',
  'nailExtension',
  'nailCareTreatment',
  'teamNailArtist',
  'bookingBanner',
]) {
  assert.ok(required in PINKY_NAILS_IMAGES, `Template 05 requires the ${required} image`);
}
assert.equal(PINKY_NAILS_GALLERY_IMAGES.length, 5);
assert.ok(
  CATEGORY_STANDARDIZED_DATA.nail_studio.gallery.every((photo) => photo.url.startsWith('/templates/pinky-nails/')),
  'Template 05 gallery samples must use the new nail-studio imagery',
);

// ============================================================================
// 3. Services, prices, durations and staff must be untouched
// ============================================================================
assert.deepEqual(
  tmpl.services.slice(0, 5).map((s) => [s.id, s.name, s.price, s.durationMinutes, s.category]),
  [
    ['ns-1', 'Full Set Gel-X Sculpted Extensions', 2400, 90, 'Gel Extensions'],
    ['ns-2', 'Russian Dry Cuticle Precision Manicure', 1100, 60, 'Russian Manicure'],
    ['ns-3', '10-Finger 3D Handpainted & Chrome Art', 1500, 60, 'Handpainted Art'],
    ['ns-4', 'Hailey Glazed Donut Pearlescent Finish', 1600, 45, 'Chrome & Glaze'],
    ['ns-5', 'Luxury Rose Petal & Champagne Spa Pedicure', 1350, 50, 'Russian Manicure'],
  ],
);
assert.deepEqual(tmpl.stylists.map((s) => [s.id, s.name]), [
  ['ns-st-1', 'Aanya Sen'],
  ['ns-st-2', "Rhea D'Souza"],
  ['ns-st-3', 'Kritika Bose'],
]);
assert.equal(new Set(tmpl.services.map((s) => pinkyNailsServiceImage(s))).size, 5, 'Each core service needs its own image');

// ============================================================================
// 4. Templates 01–04 and 06–14 remain untouched by the new markup
// ============================================================================
for (const template of Object.values(CATEGORY_TEMPLATES)) {
  const profile = applyTemplateDesign({ ...INITIAL_SALON_PROFILE, subdomain: `iso-${template.id}` }, template);
  const html = renderToStaticMarkup(
    <CustomerSalonWebsite
      profile={profile}
      services={template.services}
      stylists={template.stylists}
      onAddAppointment={async (apt) => apt}
    />,
  );
  const isNail = template.id === 'nail_studio';
  for (const marker of PINKY_MARKERS) {
    assert.equal(html.includes(marker), isNail, `Marker ${marker} leaked or missing for ${template.id}`);
  }
  assert.equal(html.includes('sf-roop-mahal'), template.id === 'beauty_parlour', `Roop Mahal leaked into ${template.id}`);
}

// ============================================================================
// 5. Hero layout, copy, mobile DOM order, Preview/Published parity
// ============================================================================
const pinkyProfile = {
  ...applyTemplateDesign({ ...INITIAL_SALON_PROFILE }, tmpl),
  workingHoursMonFri: '10:30 AM – 08:30 PM',
  workingHoursTue: 'Closed',
  workingHoursSun: '11:00 AM – 07:00 PM',
};
const sectionsBefore = JSON.stringify(pinkyProfile.websiteSections ?? null);
const html = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={pinkyProfile}
    services={tmpl.services}
    stylists={tmpl.stylists}
    branding={{ platformName: 'Nexora Salon', poweredBy: true, supportEmail: 'support@nexorasalon.online' }}
    onAddAppointment={async (apt) => apt}
  />,
);
const previewHtml = renderToStaticMarkup(
  <SalonWebsitePreview
    readOnly
    profile={pinkyProfile}
    services={tmpl.services}
    stylists={tmpl.stylists}
    branding={{ platformName: 'Nexora Salon', poweredBy: true, supportEmail: 'support@nexorasalon.online' }}
    onAddAppointment={async (apt) => apt}
  />,
);
assert.equal(html, previewHtml, 'Preview and published designs must render the same markup');
assert.equal(JSON.stringify(pinkyProfile.websiteSections ?? null), sectionsBefore, 'Preview must not rewrite settings');
assertAllHashLinksHaveTargets(html, 'all-valid-data');

for (const text of [
  'WELCOME TO PINKY NAILS STUDIO',
  'Beautiful Nails. Beautiful You.',
  'Give your nails a fresh look with stylish nail art, nail care and beautiful finishes.',
  'Book Appointment',
  'Explore Services',
  'Nail Art',
  'Nail Care',
  'Beautiful Finishes',
  'Your Nails, Your Style',
  'Our Nail Services',
  'Find the right nail service for your style and care.',
  'Book Now',
  'Your Nails Deserve Special Care',
  'Clean Nail Care',
  'Stylish Nail Art',
  'Comfortable Studio',
  'Know More',
  'A Little Colour, A Lot of Style',
  'Explore nail looks that match your mood, occasion and personal style.',
  'View Services',
  'Nail Art Gallery',
  'Take a look at nail designs, colours and finishes.',
  'Meet Our Nail Artists',
  'Meet the team that helps you get the nail look you love.',
  'Book with Staff',
  'Love from Our Clients',
  'READY FOR YOUR NEXT NAIL LOOK?',
  "Let&#x27;s Make Your Nails Beautiful",
  'Book your favourite nail service and give yourself a little care.',
  'Visit Pinky Nails Studio',
  'We look forward to welcoming you to our studio.',
  'Call Now',
  'WhatsApp Inquiry',
  'Get Directions',
  'Opening Hours',
  'Quick Links',
  'Nail Services',
  'Contact',
  'All rights reserved.',
  'Rich warm mood',
  'Verified checkout',
]) {
  assert.ok(html.includes(text), `Missing required Template 05 text: ${text}`);
}

const heroOrder = [
  html.indexOf('WELCOME TO PINKY NAILS STUDIO'),
  html.indexOf('Beautiful Nails. Beautiful You.'),
  html.indexOf('Give your nails a fresh look'),
  html.indexOf('Explore Services'),
  html.indexOf(`src="${PINKY_NAILS_IMAGES.heroArtist}"`),
  html.indexOf(`src="${PINKY_NAILS_IMAGES.nailArtCloseup}"`),
  html.indexOf(`src="${PINKY_NAILS_IMAGES.manicureTreatment}"`),
  html.indexOf('Beautiful Finishes'),
];
for (let i = 1; i < heroOrder.length; i++) {
  assert.ok(heroOrder[i] > heroOrder[i - 1] && heroOrder[i - 1] !== -1, `Mobile hero order broken at step ${i + 1}`);
}
assert.ok(
  html.indexOf('Your Nails, Your Style') > html.indexOf(`src="${PINKY_NAILS_IMAGES.manicureTreatment}"`),
  'Hero badge belongs below the two image cards',
);

const sectionOrder = PINKY_MARKERS.filter((marker) => marker !== 'sf-pinky-nails');
for (let i = 1; i < sectionOrder.length; i++) {
  const previous = html.indexOf(sectionOrder[i - 1]);
  const current = html.indexOf(sectionOrder[i]);
  assert.ok(previous !== -1 && current > previous, `Section order broken: ${sectionOrder[i - 1]} → ${sectionOrder[i]}`);
}

// Booking banner copy sits above its image for the stacked mobile layout.
assert.ok(
  html.indexOf("Let&#x27;s Make Your Nails Beautiful") < html.indexOf(`src="${PINKY_NAILS_IMAGES.bookingBanner}"`),
  'Booking banner must place text before its image',
);

// No image is reused across sections (service photos are per-service by design).
const sectionImages = ['heroArtist', 'nailArtCloseup', 'manicureTreatment', 'studioInterior', 'nailArtPortfolio',
  'nailExtension', 'nailCareTreatment', 'teamNailArtist', 'bookingBanner', 'aboutNailArtist'] as const;
for (const key of sectionImages) {
  const url = PINKY_NAILS_IMAGES[key];
  assert.equal(html.split(`src="${url}"`).length - 1, 1, `Section image ${key} must appear exactly once`);
}

// Every existing service renders a card with its exact name, price and duration.
for (const service of tmpl.services) {
  assert.ok(html.includes(service.name.replaceAll('&', '&amp;').replaceAll("'", '&#x27;')), `Missing service ${service.name}`);
}
assert.ok(html.includes(defaultServiceImage(tmpl.services[0], 'nail_studio')));
assert.equal((html.match(/class="sf-service-image"/g) || []).length >= tmpl.services.length, true);

// ============================================================================
// 6. Missing images, missing data and empty states
// ============================================================================
const bareProfile: any = {
  ...pinkyProfile,
  heroSecondaryImageUrl: '',
  aboutImageUrl: '',
  aboutSecondaryImageUrl: '',
  bookingBannerImageUrl: '',
  teamPortraitImageUrl: '',
  nailArtFeatureImageUrl: '',
  disableImageFallbacks: true,
  sectionHeadings: { heroSubtitle: '' },
};
const bareHtml = renderToStaticMarkup(
  <CustomerSalonWebsite profile={bareProfile} services={tmpl.services} stylists={tmpl.stylists} onAddAppointment={async (a) => a} />,
);
assert.ok(!bareHtml.includes('sf-pn-hero-side'), 'Hero image cards must collapse when unavailable');
assert.ok(!bareHtml.includes('sf-pn-hero-desc'), 'Empty hero description must be hidden');
assert.ok(!bareHtml.includes('sf-pn-about-media'), 'About media column must collapse when unavailable');
assert.ok(!bareHtml.includes('sf-pn-booking-media'), 'Booking banner media must collapse when unavailable');
assert.ok(!bareHtml.includes('sf-pn-team-portrait-frame'), 'Team portrait must hide when unavailable');
assertAllHashLinksHaveTargets(bareHtml, 'no-images');

const noServicesHtml = renderToStaticMarkup(
  <CustomerSalonWebsite profile={pinkyProfile} services={[]} stylists={tmpl.stylists} onAddAppointment={async (a) => a} />,
);
assert.ok(!noServicesHtml.includes('sf-pn-service-card'), 'No fake service cards without services');
assert.ok(!noServicesHtml.includes('sf-pn-art-section'), 'Art feature button needs a valid services target');
assert.ok(!noServicesHtml.includes('href="#services-section"'), 'Services links must hide when there are no services');
assertAllHashLinksHaveTargets(noServicesHtml, 'no-services');

const noStaffHtml = renderToStaticMarkup(
  <CustomerSalonWebsite profile={pinkyProfile} services={tmpl.services} stylists={[]} onAddAppointment={async (a) => a} />,
);
assert.ok(!noStaffHtml.includes('sf-pn-team-card'), 'No invented staff cards');
assert.ok(noStaffHtml.includes('Our nail artists will be listed here soon.'));
assert.ok(!noStaffHtml.includes('Book with Staff'));
assertAllHashLinksHaveTargets(noStaffHtml, 'no-staff');

const partialStaffHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={pinkyProfile}
    services={tmpl.services}
    stylists={[
      { id: 'pn-min', name: 'Meera Nair', role: '', avatarUrl: '', rating: 0, specialties: [] },
      { id: 'pn-inactive', name: 'Hidden Artist', role: 'Nail Artist', avatarUrl: '', rating: 5, specialties: [], status: 'Inactive' },
    ]}
    onAddAppointment={async (a) => a}
  />,
);
assert.ok(partialStaffHtml.includes('Meera Nair'));
assert.ok(!partialStaffHtml.includes('Hidden Artist'), 'Inactive staff must stay hidden');
assert.ok(!partialStaffHtml.includes('sf-pn-team-role'), 'No invented staff role');
assert.ok(!partialStaffHtml.includes('sf-pn-team-rating'), 'No invented staff rating');
assert.ok(partialStaffHtml.includes('sf-pn-team-initials'), 'Initials placeholder instead of an invented photo');

const noReviewsHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={{ ...pinkyProfile, subdomain: 'pinky-none', demoTestimonialsInitialized: true, websiteTestimonials: [] } as any}
    services={tmpl.services}
    stylists={tmpl.stylists}
    onAddAppointment={async (a) => a}
  />,
);
assert.ok(!noReviewsHtml.includes('sf-pn-review-card'), 'No fake review cards');
assert.ok(!noReviewsHtml.includes('id="salon-testimonials"'), 'Empty reviews section hides on the published site');

const noGalleryHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={withPhotoGallery(pinkyProfile, [])}
    services={tmpl.services}
    stylists={tmpl.stylists}
    onAddAppointment={async (a) => a}
  />,
);
assert.ok(!noGalleryHtml.includes('sf-pn-masonry'), 'Empty gallery grid must not render');
assert.ok(!noGalleryHtml.includes('Nail Art Gallery'), 'Empty gallery section must hide');

// ============================================================================
// 7. Contact details are never invented
// ============================================================================
const noContactProfile = {
  ...pinkyProfile,
  address: '', city: '', postalCode: '', landmark: '', phone: '', email: '', whatsapp: '',
  latitude: undefined, longitude: undefined,
  instagramHandle: '', facebookPage: '', youtubeChannel: '', tiktokProfile: '',
  workingHoursMonFri: '', workingHoursTue: '', workingHoursSun: '',
};
const noContactHtml = renderToStaticMarkup(
  <CustomerSalonWebsite profile={noContactProfile} services={tmpl.services} stylists={tmpl.stylists} onAddAppointment={async (a) => a} />,
);
assert.ok(!noContactHtml.includes('id="salon-location"'), 'Contact section hides without contact details');
assert.ok(!noContactHtml.includes('Call Now'));
assert.ok(!noContactHtml.includes('WhatsApp Inquiry'));
assert.ok(!noContactHtml.includes('Get Directions'));
assert.ok(!noContactHtml.includes('Opening Hours'));
assert.ok(noContactHtml.includes('data-col-count="3"'), 'Footer hides the empty contact column');
assertAllHashLinksHaveTargets(noContactHtml, 'no-contact');

const phoneOnly = pinkyNailsContactSummary({ ...noContactProfile, phone: '+91 98490 77654' } as any, 'https://maps.example', '');
assert.ok(phoneOnly.phone && !phoneOnly.whatsappUrl && !phoneOnly.hasDirections && phoneOnly.validHours.length === 0);
const phoneOnlyHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={{ ...noContactProfile, phone: '+91 98490 77654' } as any}
    services={tmpl.services}
    stylists={tmpl.stylists}
    onAddAppointment={async (a) => a}
  />,
);
assert.ok(phoneOnlyHtml.includes('Call Now'));
assert.ok(!phoneOnlyHtml.includes('WhatsApp Inquiry'));
assert.ok(!phoneOnlyHtml.includes('sf-pn-hours-list'));

// ============================================================================
// 8. Booking availability
// ============================================================================
const bookingOffHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={{ ...pinkyProfile, bookingEnabled: false } as any}
    services={tmpl.services}
    stylists={tmpl.stylists}
    onAddAppointment={async (a) => a}
  />,
);
for (const label of ['Book Appointment', 'Book Now', 'Book with Staff']) {
  assert.ok(!bookingOffHtml.includes(`>${label}`), `${label} must hide when booking is unavailable`);
}
assert.ok(!bookingOffHtml.includes('sf-pn-booking-banner'), 'Booking banner hides without a booking system');

// ============================================================================
// 9. Interaction: category filters, booking buttons, gallery lightbox
// ============================================================================
let tree: any;
await act(async () => {
  tree = create(
    <CustomerSalonWebsite
      profile={pinkyProfile}
      services={tmpl.services}
      stylists={tmpl.stylists}
      onAddAppointment={async (a) => a}
    />,
  );
});
const categories = tree.root.findByProps({ 'aria-label': 'Service categories' });
const gelTab = categories.findAllByType('button').find((b: any) => b.children.join('') === 'Gel Extensions');
assert.ok(gelTab, 'Existing service categories power the filter tabs');
await act(async () => gelTab.props.onClick());
assert.equal(
  tree.root.findByProps({ id: 'services-section' }).findAll((n: any) => n.type === 'article' && n.props.className === 'sf-pn-service-card').length,
  1,
  'Category filter narrows the nail service grid',
);
await act(async () => categories.findAllByType('button')[0].props.onClick());

const bookButtons = tree.root.findAll((n: any) => n.type === 'button' && String(n.props.className).includes('sf-pn-service-book'));
assert.ok(bookButtons.length >= tmpl.services.length);
await act(async () => bookButtons[0].props.onClick());
assert.ok(JSON.stringify(tree.toJSON()).includes(tmpl.services[0].name), 'Book Now opens the existing checkout');

const galleryButtons = tree.root.findAll((n: any) => n.type === 'button' && String(n.props['aria-label'] || '').startsWith('View salon look '));
assert.equal(galleryButtons.length, 5, 'Five gallery samples render');
await act(async () => galleryButtons[1].props.onClick());
assert.ok(tree.root.findByProps({ 'aria-label': 'Studio lookbook' }), 'Gallery opens the existing lightbox');
await act(async () => tree.root.findByProps({ 'aria-label': 'Close lookbook' }).props.onClick());
assert.equal(tree.root.findAllByProps({ 'aria-label': 'Studio lookbook' }).length, 0, 'Lightbox close works');

await act(async () => tree.root.findByProps({ 'aria-label': 'Open website menu' }).props.onClick());
assert.ok(tree.root.findByProps({ id: 'salon-mobile-menu' }));
const mobileMenu = tree.root.findByProps({ id: 'salon-mobile-menu' });
assert.ok(mobileMenu.findAll((n: any) => n.type === 'button' && String(n.props.className).includes('sf-pn-btn-primary')).length >= 1);
await act(async () => tree.root.findByProps({ 'aria-label': 'Close website menu' }).props.onClick());
assert.equal(tree.root.findAllByProps({ id: 'salon-mobile-menu' }).length, 0);

// Header navigation follows the approved order and hides invalid targets.
const header = html.match(/<header[\s\S]*?<\/header>/)![0];
const labels = ['Home', 'Services', 'About', 'Nail Gallery', 'Our Team', 'Contact'];
const positions = labels.map((label) => header.indexOf(`>${label}<`));
positions.forEach((position, i) => assert.ok(position !== -1, `Header navigation is missing ${labels[i]}`));
for (let i = 1; i < positions.length; i++) assert.ok(positions[i] > positions[i - 1], 'Header navigation order changed');
assert.ok(header.includes('Book Appointment'));
await act(async () => tree.unmount());

// ============================================================================
// 10. Stale catalog row upgrade keeps services intact
// ============================================================================
const staleRow = {
  id: 'nail_studio',
  title: 'Pinky Nails Studio',
  shortName: 'Nail & Lash Studio',
  tagline: 'Glossy Chrome Gel Nails, Sculpted Extensions, Lash Lifts & Laminated Brows',
  paletteLabel: 'Chic Pink & Dark Rose Luxury Theme',
  themePreset: 'neon_gloss_bento',
  layoutStyle: 'bento_grid',
  coverImageUrl: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1200&q=80',
  ownerPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
  themeStyle: { heroBackground: 'bg-[#faf5ff]' },
  services: tmpl.services,
  stylists: tmpl.stylists,
};
const upgraded: any = upgradeNailStudioTemplate(staleRow);
assert.equal(upgraded.coverImageUrl, PINKY_NAILS_IMAGES.heroArtist);
assert.equal(upgraded.ownerPhotoUrl, PINKY_NAILS_IMAGES.teamNailArtist);
assert.equal(upgraded.themePreset, tmpl.themePreset);
assert.equal(upgraded.tagline, tmpl.tagline);
assert.deepEqual(upgraded.services, tmpl.services, 'Service records must stay unchanged');
assert.deepEqual(upgraded.stylists, tmpl.stylists, 'Staff records must stay unchanged');
for (const other of Object.values(CATEGORY_TEMPLATES).filter((t) => t.id !== 'nail_studio')) {
  assert.equal(upgradeNailStudioTemplate(other), other, `${other.id} must be untouched by the Template 05 upgrade`);
}

// Legacy saved drafts upgrade stock defaults but keep real owner uploads.
const legacyDraft = normalizeWorkspace({
  profile: {
    ...INITIAL_SALON_PROFILE,
    businessType: 'nail_studio',
    coverImageUrl: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1200&q=80',
    ownerPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
    tagline: 'Glossy Chrome Gel Nails, Sculpted Extensions, Lash Lifts & Laminated Brows',
    photoGalleryInitialized: true,
    photoGalleryType: 'nail_studio',
    photoGallery: [
      {
        id: 'template-gallery-nail_studio-1',
        category: 'Nails',
        url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
        title: 'Old sample',
        isDemo: true,
      },
      { id: 'owner-real-nail-1', category: 'Nails', url: 'https://cdn.example.com/real-nails.jpg', title: 'Real client nails', isDemo: false },
    ],
  },
  services: tmpl.services,
  stylists: tmpl.stylists,
});
assert.equal(legacyDraft.profile.coverImageUrl, PINKY_NAILS_IMAGES.heroArtist);
assert.equal(legacyDraft.profile.ownerPhotoUrl, PINKY_NAILS_IMAGES.teamNailArtist);
assert.equal(legacyDraft.profile.tagline, tmpl.tagline);
const upgradedGallery = photoGallery(legacyDraft.profile);
assert.equal(upgradedGallery[0].url, PINKY_NAILS_GALLERY_IMAGES[0], 'Old sample upgrades to the new nail art photo');
assert.equal(upgradedGallery[1].url, 'https://cdn.example.com/real-nails.jpg', 'Owner photo is never replaced');
assert.equal(isLegacyNailStudioStockImage('/templates/pinky-nails/hero-nail-artist.jpg'), false);

const customDraft = normalizeWorkspace({
  profile: {
    ...INITIAL_SALON_PROFILE,
    businessType: 'nail_studio',
    coverImageUrl: 'https://cdn.example.com/owner-nail-studio.jpg',
    ownerPhotoUrl: 'https://cdn.example.com/owner-artist.jpg',
    tagline: 'Bespoke Nail Art in Jubilee Hills',
  },
  services: tmpl.services,
  stylists: [],
});
assert.equal(customDraft.profile.coverImageUrl, 'https://cdn.example.com/owner-nail-studio.jpg');
assert.equal(customDraft.profile.ownerPhotoUrl, 'https://cdn.example.com/owner-artist.jpg');
assert.equal(customDraft.profile.tagline, 'Bespoke Nail Art in Jubilee Hills');
assert.equal(hasOwnerCustomNailTagline(customDraft.profile), true);

const customHeroHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={customDraft.profile}
    services={tmpl.services}
    stylists={tmpl.stylists}
    onAddAppointment={async (a) => a}
  />,
);
assert.ok(customHeroHtml.includes('Bespoke Nail Art in Jubilee Hills'), 'Owner tagline becomes the hero heading');
assert.ok(customHeroHtml.includes('https://cdn.example.com/owner-nail-studio.jpg'), 'Owner cover photo is used');

// ============================================================================
// 11. Service validation helpers
// ============================================================================
assert.equal(isValidNailService({ ...tmpl.services[0], active: false } as any), false);
assert.equal(isValidNailService({ ...tmpl.services[0], deleted: true } as any), false);
assert.equal(isValidNailService(tmpl.services[0]), true);
assert.equal(pinkyNailsServiceImage({ id: 'ns-4', name: 'x', category: 'y' }), PINKY_NAILS_IMAGES.serviceGlazeChrome);

console.log(
  'PASS: Template 05 (Pinky Nails Studio) nail-art editorial redesign, palette, AI image set, services/staff intact, empty states, booking, gallery lightbox and Templates 01–04 & 06–14 unchanged.',
);
