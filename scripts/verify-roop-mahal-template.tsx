import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, create } from 'react-test-renderer';
import { CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import { CATEGORY_STANDARDIZED_DATA } from '../src/templateData';
import { CustomerSalonWebsite } from '../src/components/CustomerSalonWebsite';
import { SalonWebsitePreview } from '../src/components/SalonWebsitePreview';
import { DiscoverySections } from '../src/components/customer/DiscoverySections';
import { TemplateDemoSalon } from '../src/components/customer/TemplateDemoSalon';
import { withTemplateDemos } from '../src/components/customer/templateDemos';
import { normalizeWorkspace } from '../src/lib/normalizeWorkspace';
import { photoGallery, withPhotoGallery } from '../src/lib/photoGallery';
import {
  ROOP_MAHAL_IMAGES,
  ROOP_MAHAL_PALETTE,
  upgradeBeautyParlourTemplate,
} from '../src/lib/roopMahalReference';
import { applyTemplateDesign } from '../src/lib/templateSelection';
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

function assertAllHashLinksHaveTargets(html: string, label: string) {
  const hrefMatches = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  for (const id of hrefMatches) {
    assert.ok(
      html.includes(`id="${id}"`),
      `[${label}] Broken hash link #${id} — no matching id="${id}" found on rendered page`,
    );
  }
}

// ============================================================================
// 1. Verify palette constants, responsive media queries & strict CSS scoping
// ============================================================================
assert.deepEqual(ROOP_MAHAL_PALETTE, {
  warmCream: '#FFF8F1',
  softRose: '#D9A6A1',
  deepMaroon: '#6D2638',
  champagneGold: '#C5A16B',
  darkBrown: '#352622',
  white: '#FFFFFF',
});
assert.equal(CATEGORY_TEMPLATES.beauty_parlour.paletteLabel, 'Warm Cream, Soft Rose, Deep Maroon & Champagne Gold');
assert.match(CATEGORY_STANDARDIZED_DATA.beauty_parlour.foundingNarrative, /Roop Mahal/);
assert.doesNotMatch(CATEGORY_STANDARDIZED_DATA.beauty_parlour.foundingNarrative, /Gulabini/);
assert.ok(CATEGORY_STANDARDIZED_DATA.beauty_parlour.gallery.every(photo => photo.url.startsWith('/templates/roop-mahal/')));
assert.ok(CATEGORY_STANDARDIZED_DATA.beauty_parlour.reviews.every(review => !review.avatarUrl), 'Template 04 sample reviews must not surface unrelated Western stock avatars');

const roopCss = readFileSync('src/roopMahal.css', 'utf8');
for (const hex of Object.values(ROOP_MAHAL_PALETTE)) {
  assert.ok(roopCss.toUpperCase().includes(hex), `Missing palette color ${hex} in roopMahal.css`);
}
for (const bp of ['1024px', '900px', '640px', '560px', '380px']) {
  assert.ok(roopCss.includes(`max-width: ${bp}`), `Missing responsive breakpoint ${bp} in roopMahal.css`);
}
const selectorLines = roopCss
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.endsWith('{') && !l.startsWith('@media'));
for (const line of selectorLines) {
  for (const part of line.slice(0, -1).split(',')) {
    assert.ok(
      part.trim().startsWith('.sf-page[data-template="beauty_parlour"]'),
      `Unscoped CSS selector found: ${part.trim()}`,
    );
  }
}

// ============================================================================
// 2. Verify all 20 distinct non-repeating AI image files exist on disk
// ============================================================================
const imageEntries = Object.entries(ROOP_MAHAL_IMAGES);
assert.equal(imageEntries.length, 20);
assert.equal(new Set(imageEntries.map(([, p]) => p)).size, 20, 'Every Roop Mahal image path must be unique');
for (const [key, relPath] of imageEntries) {
  const diskPath = `public${relPath}`;
  assert.ok(existsSync(diskPath), `Missing image asset for ${key}: ${diskPath}`);
  assert.ok(statSync(diskPath).size > 20_000, `Asset ${diskPath} appears unexpectedly small`);
}

// ============================================================================
// 3. Verify existing services & stylists in Template 04 are 100% untouched
// ============================================================================
const tmpl = CATEGORY_TEMPLATES.beauty_parlour;
assert.equal(tmpl.id, 'beauty_parlour');
assert.equal(tmpl.title, 'Roop Mahal Beauty Parlour & Makeover Space');
assert.deepEqual(
  tmpl.services.slice(0, 5).map((s) => [s.id, s.name, s.price, s.durationMinutes]),
  [
    ['bp-1', 'Full Face Organic Threading & Brow Shaping', 250, 25],
    ['bp-2', 'Shahnaz Husain 24K Gold Glow Facial', 1450, 60],
    ['bp-3', 'Rica White Chocolate Full Body Waxing', 1550, 75],
    ['bp-4', 'O3+ Ayurvedic D-Tan Brightening Pack', 600, 30],
    ['bp-5', 'Karva Chauth & Diwali Shringaar Combo', 2100, 90],
  ],
);
assert.equal(tmpl.services.length, 9);
assert.deepEqual(
  tmpl.stylists.map((s) => s.id),
  ['bp-st-1', 'bp-st-2', 'bp-st-3'],
);

// ============================================================================
// 4. Case 11: Templates 01–03 and 05–14 remain completely unchanged
// ============================================================================
const nonRoopTemplates = Object.values(CATEGORY_TEMPLATES).filter((t) => t.id !== 'beauty_parlour');
assert.equal(nonRoopTemplates.length, 13, 'Must verify all 13 other templates');

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
  const isBeautyParlour = template.id === 'beauty_parlour';
  for (const marker of [
    'sf-roop-mahal',
    'sf-rm-hero',
    'sf-rm-about-section',
    'sf-rm-bridal-section',
    'sf-rm-team-card',
    'sf-rm-reviews-grid',
    'sf-rm-booking-banner',
    'sf-rm-footer',
  ]) {
    assert.equal(
      html.includes(marker),
      isBeautyParlour,
      `Marker ${marker} leaked or missing for template ${template.id}`,
    );
  }
}

// ============================================================================
// 5. Case 1 & Case 10: All valid data available + Preview vs Published parity
// ============================================================================
const roopProfile = {
  ...applyTemplateDesign({ ...INITIAL_SALON_PROFILE }, tmpl),
  workingHoursMonFri: '10:00 AM – 08:00 PM',
  workingHoursTue: 'Closed',
  workingHoursSun: '11:00 AM – 07:00 PM',
};
const frozenSectionsBeforePreview = JSON.stringify(roopProfile.websiteSections ?? null);
const roopHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={roopProfile}
    services={tmpl.services}
    stylists={tmpl.stylists}
    branding={{ platformName: 'Nexora Salon', poweredBy: true, supportEmail: 'support@nexorasalon.online' }}
    onAddAppointment={async (apt) => apt}
  />,
);
const previewHtml = renderToStaticMarkup(
  <SalonWebsitePreview
    readOnly
    profile={roopProfile}
    services={tmpl.services}
    stylists={tmpl.stylists}
    branding={{ platformName: 'Nexora Salon', poweredBy: true, supportEmail: 'support@nexorasalon.online' }}
    onAddAppointment={async (apt) => apt}
  />,
);
assert.equal(roopHtml, previewHtml, 'Preview mode and live storefront must render identical markup');
assert.equal(
  JSON.stringify(roopProfile.websiteSections ?? null),
  frozenSectionsBeforePreview,
  'Opening Preview must never modify saved visibility settings',
);
assertAllHashLinksHaveTargets(roopHtml, 'all-valid-data');

// Verify exact 11-section approved order
const approvedOrderMarkers = [
  'sf-rm-header',
  'sf-rm-hero',
  'sf-rm-services-section',
  'sf-rm-about-section',
  'sf-rm-bridal-section',
  'sf-rm-team-section',
  'sf-rm-gallery-section',
  'sf-rm-reviews-section',
  'sf-rm-booking-banner',
  'sf-rm-location-section',
  'sf-rm-footer',
];
for (let i = 1; i < approvedOrderMarkers.length; i++) {
  const prevIdx = roopHtml.indexOf(approvedOrderMarkers[i - 1]);
  const curIdx = roopHtml.indexOf(approvedOrderMarkers[i]);
  assert.ok(
    prevIdx !== -1 && curIdx > prevIdx,
    `Section order mismatch between ${approvedOrderMarkers[i - 1]} (${prevIdx}) and ${approvedOrderMarkers[i]} (${curIdx})`,
  );
}

// Default brand without logoUrl shows salon name as text (no fake SVG logo icon)
assert.ok(roopHtml.includes('is-text-brand'), 'Without logoUrl, Header/Footer must show salon name as text');
assert.ok(!roopHtml.includes('sf-rm-logo-svg'), 'Must not render fake logo graphic when salon logo is absent');

// Exact required copy checks across all sections
for (const text of [
  'WELCOME TO ROOP MAHAL',
  'Your Beauty, Your Special Moment',
  'Make every occasion special with beautiful makeup, hair styling and personal beauty care.',
  'Book Appointment',
  'Explore Services',
  'Bridal Makeup',
  'Party Makeup',
  'Beauty &amp; Hair Care',
  'Book Now',
  'Beauty Care Made Special for You',
  'Friendly Team',
  'Personal Care',
  'Clean &amp; Comfortable Space',
  'Know More',
  'View Services',
  'Meet Our Beauty Experts',
  'Our team is here to help you look your best for every special moment.',
  'Book with Staff',
  'Our Beauty Work',
  'Take a look at our makeup, hair styling and beauty work.',
  'Happy Clients, Happy Smiles',
  'See what our customers have shared about their experience.',
  'sf-rm-quote-badge',
  'YOUR SPECIAL MOMENT STARTS HERE',
  'Ready for Your Next Makeover?',
  'Choose your favourite service and book a time that works for you.',
  'Visit Roop Mahal',
  'We would love to welcome you to our beauty parlour.',
  'Call Now',
  'WhatsApp Us',
  'Get Directions',
  'Opening Hours',
  '10:00 AM – 08:00 PM',
  'Quick Links',
  'Services',
  'Contact',
  'All rights reserved.',
]) {
  assert.ok(roopHtml.includes(text), `Missing required Roop Mahal text: ${text}`);
}

// Mobile hero natural DOM order: 1. Welcome -> 2. Heading -> 3. Description -> 4. Buttons -> 5. Main image -> 6. Sub image -> 7. Highlights
const heroIndices = [
  roopHtml.indexOf('WELCOME TO ROOP MAHAL'),
  roopHtml.indexOf('Your Beauty, Your Special Moment'),
  roopHtml.indexOf('Make every occasion special with beautiful makeup'),
  roopHtml.indexOf('Explore Services'),
  roopHtml.indexOf(`src="${ROOP_MAHAL_IMAGES.heroBridal}"`),
  roopHtml.indexOf(`src="${ROOP_MAHAL_IMAGES.heroMakeupArtist}"`),
  roopHtml.indexOf('Beauty &amp; Hair Care'),
];
for (let i = 1; i < heroIndices.length; i++) {
  assert.ok(
    heroIndices[i] > heroIndices[i - 1] && heroIndices[i - 1] !== -1,
    `Mobile hero order violated at step ${i + 1}: ${JSON.stringify(heroIndices)}`,
  );
}

// Mobile booking banner DOM order: text first, image below it
assert.ok(
  roopHtml.indexOf('Ready for Your Next Makeover?') < roopHtml.indexOf(`src="${ROOP_MAHAL_IMAGES.bookingMakeover}"`),
  'Booking banner must place text before makeover image for mobile layout',
);

// Verify every rendered section image is non-repeating
for (const [key, imgUrl] of imageEntries) {
  const occurrences = roopHtml.split(`src="${imgUrl}"`).length - 1;
  if (key === 'staffFallback') {
    assert.equal(occurrences, 0, 'staffFallback must NOT replace real existing staff photos');
  } else if (key.startsWith('service')) {
    assert.ok(occurrences >= 1, `Service image ${key} (${imgUrl}) should appear at least once`);
  } else {
    assert.equal(occurrences, 1, `Section image ${key} (${imgUrl}) must appear once without repeating`);
  }
}

// ============================================================================
// 6. Case 2: Missing optional images & broken image onError container hiding
// ============================================================================
const missingOptionalImagesProfile: any = {
  ...roopProfile,
  heroSecondaryImageUrl: '',
  aboutImageUrl: '',
  aboutSecondaryImageUrl: '',
  bridalHighlightImageUrl: '',
  bookingBannerImageUrl: '',
  sectionHeadings: { heroSubtitle: '' },
};
const missingOptHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={missingOptionalImagesProfile}
    services={tmpl.services}
    stylists={tmpl.stylists}
    onAddAppointment={async (apt) => apt}
  />,
);
assert.ok(missingOptHtml.includes('sf-rm-hero-stage is-single-image'), 'Hero must collapse secondary image reserve padding');
assert.ok(!missingOptHtml.includes('sf-rm-hero-sub-frame'), 'Hero secondary image container must be hidden when unavailable');
assert.ok(!missingOptHtml.includes('sf-rm-hero-desc'), 'Empty hero description must be hidden');
assert.ok(missingOptHtml.includes('sf-rm-about-grid is-no-media'), 'About grid must collapse media column when no images exist');
assert.ok(!missingOptHtml.includes('sf-rm-about-media'), 'About media container must be hidden when both images are missing');
assert.ok(missingOptHtml.includes('sf-rm-bridal-card is-no-image'), 'Bridal highlight must collapse image column cleanly');
assert.ok(!missingOptHtml.includes('sf-rm-bridal-image'), 'Bridal image container must be hidden when unavailable');
assert.ok(missingOptHtml.includes('sf-rm-booking-inner is-no-media'), 'Booking banner must collapse media column cleanly');
assert.ok(!missingOptHtml.includes('sf-rm-booking-media'), 'Booking banner media container must be hidden when unavailable');

// Live broken-image onError simulation: broken logo + broken gallery item remove broken containers cleanly
let brokenMediaTree: any;
await act(async () => {
  brokenMediaTree = create(
    <CustomerSalonWebsite
      profile={{
        ...withPhotoGallery(roopProfile, [
          { id: 'good-1', category: 'Skin', url: 'https://cdn.example.com/valid-1.jpg', title: 'Valid Look', isDemo: false },
          { id: 'bad-2', category: 'Skin', url: 'https://cdn.example.com/broken-2.jpg', title: 'Broken Look', isDemo: false },
        ]),
        logoUrl: 'https://cdn.example.com/broken-logo.png',
      }}
      services={tmpl.services}
      stylists={tmpl.stylists}
      onAddAppointment={async (apt) => apt}
    />,
  );
});
const brokenLogoImgs = brokenMediaTree.root.findAll(
  (n: any) => n.type === 'img' && n.props.src === 'https://cdn.example.com/broken-logo.png',
);
assert.equal(brokenLogoImgs.length, 2, 'Header and Footer initially try owner logoUrl');
for (const imgNode of brokenLogoImgs) {
  await act(async () => imgNode.props.onError());
}
assert.equal(
  brokenMediaTree.root.findAll((n: any) => n.type === 'img' && n.props.src === 'https://cdn.example.com/broken-logo.png').length,
  0,
  'Broken logo <img> must be completely hidden so salon name text stands cleanly',
);

const brokenGalleryImg = brokenMediaTree.root.find(
  (n: any) => n.type === 'img' && n.props.src === 'https://cdn.example.com/broken-2.jpg',
);
await act(async () => brokenGalleryImg.props.onError());
const lookButtonsAfterError = brokenMediaTree.root.findAll(
  (n: any) => n.type === 'button' && String(n.props['aria-label'] || '').startsWith('View salon look '),
);
assert.equal(lookButtonsAfterError.length, 1, 'Broken gallery image and its button container must be hidden');
await act(async () => brokenMediaTree.unmount());

// ============================================================================
// 7. Case 3: No staff records & partial staff data (no invented roles/skills)
// ============================================================================
const noStaffHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={roopProfile}
    services={tmpl.services}
    stylists={[]}
    onAddAppointment={async (apt) => apt}
  />,
);
assert.ok(noStaffHtml.includes('Meet our specialists at your next studio visit.'));
assert.ok(!noStaffHtml.includes('sf-rm-team-grid'), 'Empty team grid container must not render');
assert.ok(!noStaffHtml.includes('sf-rm-team-card'), 'Must not render fake staff profile cards');
const noStaffHeader = noStaffHtml.match(/<header[\s\S]*?<\/header>/)![0];
const noStaffFooter = noStaffHtml.match(/<footer[\s\S]*?<\/footer>/)![0];
assert.ok(!noStaffHeader.includes('Our Team'), 'Header must omit Our Team link when no staff exist');
assert.ok(!noStaffFooter.includes('Our Team'), 'Footer must omit Our Team link when no staff exist');
assertAllHashLinksHaveTargets(noStaffHtml, 'no-staff');

const minimalStaffHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={roopProfile}
    services={tmpl.services}
    stylists={[
      { id: 'st-min', name: 'Kavita Devi', role: '', avatarUrl: '', rating: 0, specialties: [] },
      { id: 'st-inactive', name: 'Hidden Inactive Staff', role: 'Stylist', avatarUrl: '', rating: 5, specialties: [], status: 'Inactive' },
    ]}
    onAddAppointment={async (apt) => apt}
  />,
);
assert.ok(minimalStaffHtml.includes('Kavita Devi'));
assert.ok(!minimalStaffHtml.includes('Hidden Inactive Staff'), 'Inactive staff must be hidden');
assert.ok(!minimalStaffHtml.includes('sf-rm-team-role'), 'Must not invent fallback role when staff.role is empty');
assert.ok(!minimalStaffHtml.includes('sf-rm-team-skills'), 'Must not render empty skills list');
assert.ok(!minimalStaffHtml.includes('sf-rm-team-rating'), 'Must not render rating badge when rating is 0/invalid');
assert.ok(minimalStaffHtml.includes(`src="${ROOP_MAHAL_IMAGES.staffFallback}"`), 'Supported AI staffFallback used when avatarUrl is empty');

// ============================================================================
// 8. Case 4: No customer reviews & partial review validation
// ============================================================================
const noReviewsHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={{
      ...roopProfile,
      subdomain: 'roop-mahal-live',
      demoTestimonialsInitialized: true,
      websiteTestimonials: [],
    }}
    services={tmpl.services}
    stylists={tmpl.stylists}
    onAddAppointment={async (apt) => apt}
  />,
);
assert.ok(noReviewsHtml.includes('Happy Clients, Happy Smiles'));
assert.ok(!noReviewsHtml.includes('sf-rm-reviews-grid'), 'Must not render fake/sample review cards when reviews are empty');
assert.ok(!noReviewsHtml.includes('Demo testimonial'), 'Must not invent sample testimonials when reviews are empty');
assert.ok(noReviewsHtml.includes('Be the first customer to share an experience with this studio.'));

const partialReviewsHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={{
      ...roopProfile,
      subdomain: 'roop-mahal-partial-reviews',
      demoTestimonialsInitialized: true,
      websiteTestimonials: [
        { id: 'rev-empty', name: 'Empty Reviewer', rating: 5, comment: '   ', serviceName: '', location: '', avatarUrl: '', date: '' },
        { id: 'rev-no-rating-no-name', name: '', rating: 0, comment: 'Loved the calm parlour atmosphere and clean setup.', serviceName: '', location: '', avatarUrl: '', date: '' },
      ],
    }}
    services={tmpl.services}
    stylists={tmpl.stylists}
    onAddAppointment={async (apt) => apt}
  />,
);
assert.ok(!partialReviewsHtml.includes('Empty Reviewer'), 'Reviews with empty review text must be hidden');
assert.ok(partialReviewsHtml.includes('Loved the calm parlour atmosphere and clean setup.'));
assert.ok(!partialReviewsHtml.includes('sf-review-stars'), 'Invalid 0 rating must not render star icons');

// ============================================================================
// 9. Case 5: No gallery images
// ============================================================================
const noGalleryHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={withPhotoGallery(roopProfile, [])}
    services={tmpl.services}
    stylists={tmpl.stylists}
    onAddAppointment={async (apt) => apt}
  />,
);
assert.ok(noGalleryHtml.includes('No gallery photos have been added yet.'));
assert.ok(!noGalleryHtml.includes('sf-rm-lookbook-grid'), 'Empty gallery grid must not render');
assert.ok(!noGalleryHtml.includes('sf-gallery-categories'), 'Gallery category filters must hide when no valid photos exist');
assert.ok(!noGalleryHtml.includes('sf-demo-label'), 'Demo label must hide when gallery is empty');

// ============================================================================
// 10. Case 6: No contact details & partial contact details
// ============================================================================
const noContactProfile = {
  ...roopProfile,
  address: '',
  city: '',
  postalCode: '',
  landmark: '',
  phone: '',
  email: '',
  whatsapp: '',
  latitude: undefined,
  longitude: undefined,
  instagramHandle: '',
  facebookPage: '',
  youtubeChannel: '',
  tiktokProfile: '',
  workingHoursMonFri: '',
  workingHoursTue: '',
  workingHoursSun: '',
};
const noContactHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={noContactProfile}
    services={tmpl.services}
    stylists={tmpl.stylists}
    onAddAppointment={async (apt) => apt}
  />,
);
assert.ok(!noContactHtml.includes('id="salon-location"'), 'Contact section must hide when zero contact details exist');
assert.ok(!noContactHtml.includes('href="#salon-location"'), 'Zero links may point to hidden #salon-location');
assert.ok(!noContactHtml.includes('Call Now'));
assert.ok(!noContactHtml.includes('WhatsApp Us'));
assert.ok(!noContactHtml.includes('Get Directions'));
assert.ok(!noContactHtml.includes('Opening Hours'));
assert.ok(noContactHtml.includes('data-col-count="3"'), 'Footer must hide empty Contact column and adjust to 3 columns');
assertAllHashLinksHaveTargets(noContactHtml, 'no-contact');

// Partial contact: phone only -> shows Call Now, hides WhatsApp, Directions, Opening Hours card & Socials
const phoneOnlyHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={{ ...noContactProfile, phone: '+91 98110 99882' }}
    services={tmpl.services}
    stylists={tmpl.stylists}
    onAddAppointment={async (apt) => apt}
  />,
);
assert.ok(phoneOnlyHtml.includes('id="salon-location"'));
assert.ok(phoneOnlyHtml.includes('Call Now'));
assert.ok(!phoneOnlyHtml.includes('WhatsApp Us'));
assert.ok(!phoneOnlyHtml.includes('Get Directions'));
assert.ok(!phoneOnlyHtml.includes('Opening Hours'), 'Opening Hours card must hide when no business hours exist');
assert.ok(phoneOnlyHtml.includes('sf-rm-contact-grid is-single-card'));

// ============================================================================
// 11. Case 7: Booking unavailable + Service record/price/duration/bridal rules
// ============================================================================
const bookingDisabledHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={{ ...roopProfile, bookingEnabled: false } as any}
    services={tmpl.services}
    stylists={tmpl.stylists}
    onAddAppointment={async (apt) => apt}
  />,
);
assert.ok(!bookingDisabledHtml.includes('sf-rm-header-cta'), 'Header Book Appointment CTA must hide when booking unavailable');
assert.ok(!bookingDisabledHtml.includes('>Book Appointment<'), 'Hero & Banner Book Appointment buttons must hide when booking unavailable');
assert.ok(!bookingDisabledHtml.includes('>Book Now<'), 'Service Book Now buttons must hide when booking unavailable');
assert.ok(!bookingDisabledHtml.includes('Book with Staff'), 'Team Book with Staff buttons must hide when booking unavailable');
assert.ok(!bookingDisabledHtml.includes('Choose for online booking'), 'Team booking toggle must hide when booking unavailable');
assert.ok(!bookingDisabledHtml.includes('sf-rm-booking-banner'), 'Booking banner section must hide when booking system unavailable');

// Services filtering: inactive/deleted services hidden, invalid price/duration/empty description hidden, bridal highlight uses bridal/makeup services ONLY
const mixedServices: any[] = [
  { id: 's-active', name: 'Classic Eyebrow Threading', category: 'Threading', price: 0, durationMinutes: 0, description: '   ', icon: 'brush' },
  { id: 's-inactive', name: 'Inactive Facial Service', category: 'EmptyInactiveCategory', price: 999, durationMinutes: 45, description: 'Should not show', active: false },
  { id: 's-deleted', name: 'Deleted Waxing Service', category: 'DeletedCat', price: 899, durationMinutes: 30, description: 'Should not show', deleted: true },
];
const mixedServicesHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={{ ...roopProfile, bridalHighlightImageUrl: '' } as any}
    services={mixedServices}
    stylists={tmpl.stylists}
    onAddAppointment={async (apt) => apt}
  />,
);
assert.ok(mixedServicesHtml.includes('Classic Eyebrow Threading'));
assert.ok(!mixedServicesHtml.includes('Inactive Facial Service'), 'Inactive service must be hidden');
assert.ok(!mixedServicesHtml.includes('Deleted Waxing Service'), 'Deleted service must be hidden');
assert.ok(!mixedServicesHtml.includes('EmptyInactiveCategory'), 'Empty category tab must be hidden');
assert.ok(!mixedServicesHtml.includes('₹0'), 'Invalid 0 price must not be displayed');
assert.ok(!mixedServicesHtml.includes('0 min'), 'Invalid 0 duration must not be displayed');
assert.ok(!mixedServicesHtml.includes('Description of Classic Eyebrow Threading'), 'Empty service description must be hidden');
assert.ok(!mixedServicesHtml.includes('sf-rm-bridal-section'), 'Bridal highlight must hide when neither bridal/makeup services nor bridal image exist');

// About empty content check: never invent history, awards, or qualifications
const emptyAboutHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={{ ...roopProfile, businessName: 'Roop Mahal Beauty Parlour & Makeover Space', about: '' }}
    services={tmpl.services}
    stylists={tmpl.stylists}
    onAddAppointment={async (apt) => apt}
  />,
);
assert.ok(emptyAboutHtml.includes('Beauty Care Made Special for You'));
assert.ok(!emptyAboutHtml.includes('18 years'), 'Must not invent business history when About text is empty');
assert.ok(emptyAboutHtml.includes('Welcome to Roop Mahal Beauty Parlour &amp; Makeover Space.'));

// ============================================================================
// 12. Case 8 & Case 9: Owner hides sections -> stays hidden; re-enabling restores data cleanly
// ============================================================================
const hiddenWorkspaceInput = {
  profile: {
    ...roopProfile,
    about: 'Custom owner story about personalised bridal artistry.',
    websiteTestimonials: [
      {
        id: 'owner-rev-1',
        name: 'Priya Khanna',
        rating: 5,
        comment: 'Wonderful bridal draping and makeup for my sister wedding.',
        serviceName: 'Karva Chauth & Diwali Shringaar Combo',
        location: 'New Delhi',
        avatarUrl: '',
        date: '2026-10-10',
        isDemo: false,
        verified: true,
      },
    ],
    websiteSections: {
      hero: false,
      services: false,
      packages: false,
      about: false,
      stylists: false,
      gallery: false,
      testimonials: false,
      bookings: false,
      location: false,
      policies: false,
    },
  },
  services: tmpl.services,
  stylists: tmpl.stylists,
  extras: { gallery: ['https://cdn.example.com/saved-bridal-look.jpg'] },
};

const normalizedHidden = normalizeWorkspace(JSON.parse(JSON.stringify(hiddenWorkspaceInput)));
// Verify hiding did NOT delete any saved records
assert.equal(normalizedHidden.services.length, tmpl.services.length, 'Hiding services must not delete saved service records');
assert.equal(normalizedHidden.profile.websiteTestimonials?.length, 1, 'Hiding reviews must not delete saved testimonials');
assert.equal(normalizedHidden.profile.about, 'Custom owner story about personalised bridal artistry.');

const ownerHiddenHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={normalizedHidden.profile}
    services={normalizedHidden.services}
    stylists={tmpl.stylists}
    gallery={normalizedHidden.extras.gallery}
    onAddAppointment={async (apt) => apt}
  />,
);
assert.ok(ownerHiddenHtml.includes('sf-rm-header'), 'Header stays visible when Template 04 is active');
assert.ok(ownerHiddenHtml.includes('sf-rm-footer'), 'Footer stays visible unless explicitly disabled');
for (const hiddenMarker of [
  'sf-rm-hero',
  'sf-rm-services-section',
  'sf-rm-about-section',
  'sf-rm-bridal-section',
  'sf-rm-team-section',
  'sf-rm-gallery-section',
  'sf-rm-reviews-section',
  'sf-rm-booking-banner',
  'sf-rm-location-section',
]) {
  assert.ok(!ownerHiddenHtml.includes(hiddenMarker), `Owner-disabled section ${hiddenMarker} must stay hidden`);
}
assertAllHashLinksHaveTargets(ownerHiddenHtml, 'owner-hidden-sections');

// Preview mode must obey the exact same owner-hidden visibility rules
const ownerHiddenPreviewHtml = renderToStaticMarkup(
  <SalonWebsitePreview
    readOnly
    profile={normalizedHidden.profile}
    services={normalizedHidden.services}
    stylists={tmpl.stylists}
    gallery={normalizedHidden.extras.gallery}
    onAddAppointment={async (apt) => apt}
  />,
);
assert.equal(ownerHiddenHtml, ownerHiddenPreviewHtml, 'Preview and Published must match when sections are hidden');

// Re-enable all hidden sections -> all saved content restores cleanly
const reEnabledProfile = {
  ...normalizedHidden.profile,
  websiteSections: {
    hero: true,
    services: true,
    packages: true,
    about: true,
    stylists: true,
    gallery: true,
    testimonials: true,
    bookings: true,
    location: true,
    policies: true,
  },
};
const reEnabledHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={reEnabledProfile}
    services={normalizedHidden.services}
    stylists={tmpl.stylists}
    gallery={normalizedHidden.extras.gallery}
    policies={{ cancellationPolicy: '24h notice', lateArrivalPolicy: '15m grace', depositPolicy: '25% advance', refundPolicy: 'Studio credit' } as any}
    onAddAppointment={async (apt) => apt}
  />,
);
for (const restoredContent of [
  'Custom owner story about personalised bridal artistry.',
  'Priya Khanna',
  'Wonderful bridal draping and makeup for my sister wedding.',
  'https://cdn.example.com/saved-bridal-look.jpg',
  'Full Face Organic Threading &amp; Brow Shaping',
  'Sunita Agarwal',
  'href="#salon-policies"',
]) {
  assert.ok(reEnabledHtml.includes(restoredContent), `Re-enabling sections must restore saved content: ${restoredContent}`);
}
assertAllHashLinksHaveTargets(reEnabledHtml, 'owner-re-enabled-sections');

// ============================================================================
// 13. Interactive checks: Gallery Lightbox, Mobile Menu, Service Filter, Team Booking & Booking Modal
// ============================================================================
let tree: any;
await act(async () => {
  tree = create(
    <CustomerSalonWebsite
      profile={roopProfile}
      services={tmpl.services}
      stylists={tmpl.stylists}
      onAddAppointment={async (apt) => apt}
    />,
  );
});

const firstLookBtn = tree.root.findByProps({ 'aria-label': 'View salon look 1' });
assert.equal(firstLookBtn.props.className, 'sf-rm-gallery-featured');
await act(async () => firstLookBtn.props.onClick());
assert.ok(tree.root.findByProps({ 'aria-label': 'Studio lookbook' }));
await act(async () => tree.root.findByProps({ 'aria-label': 'Close lookbook' }).props.onClick());
assert.equal(tree.root.findAllByProps({ 'aria-label': 'Studio lookbook' }).length, 0);

await act(async () => tree.root.findByProps({ 'aria-label': 'Open website menu' }).props.onClick());
assert.ok(tree.root.findByProps({ id: 'salon-mobile-menu' }));
await act(async () => tree.root.findByProps({ 'aria-label': 'Close website menu' }).props.onClick());
assert.equal(tree.root.findAllByProps({ id: 'salon-mobile-menu' }).length, 0);

const categoryGroup = tree.root.findByProps({ 'aria-label': 'Service categories' });
const skinTab = categoryGroup.findAllByType('button').find((b: any) => b.children.join('') === tmpl.services[1].category);
assert.ok(skinTab, `Expected existing ${tmpl.services[1].category} category tab`);
await act(async () => skinTab.props.onClick());
const filteredServiceCards = tree.root
  .findByProps({ id: 'services-section' })
  .findAll((n: any) => n.type === 'article' && n.props.className === 'sf-service-card');
assert.ok(filteredServiceCards.length >= 1 && filteredServiceCards.length < tmpl.services.length);
await act(async () => categoryGroup.findAllByType('button')[0].props.onClick());

const toggleSunita = tree.root.findByProps({ 'aria-label': `Choose for online booking: ${tmpl.stylists[0].name}` });
assert.equal(toggleSunita.props['aria-pressed'], false);
await act(async () => toggleSunita.props.onClick());
assert.equal(
  tree.root.findByProps({ 'aria-label': `Choose for online booking: ${tmpl.stylists[0].name}` }).props['aria-pressed'],
  true,
);

const closeBookingIfOpen = async () => {
  const closeBtns = tree.root.findAll(
    (n: any) => n.type === 'button' && /close/i.test(String(n.props['aria-label'] || '')),
  );
  for (const btn of closeBtns) {
    await act(async () => btn.props.onClick());
  }
};

const headerBookBtn = tree.root.find((n: any) => n.type === 'button' && String(n.props.className || '').includes('sf-rm-header-cta'));
await act(async () => headerBookBtn.props.onClick());
assert.ok(JSON.stringify(tree.toJSON()).includes('Full Face Organic Threading'));
await closeBookingIfOpen();

const teamBookBtns = tree.root.findAll((n: any) => n.type === 'button' && String(n.props.className || '').includes('sf-rm-book-staff'));
assert.equal(teamBookBtns.length, 3);
await act(async () => teamBookBtns[1].props.onClick());
assert.ok(JSON.stringify(tree.toJSON()).includes(tmpl.stylists[1].name));
await closeBookingIfOpen();

const bannerBookBtn = tree.root.find((n: any) => n.type === 'button' && String(n.props.className || '').includes('sf-rm-btn-gold'));
await act(async () => bannerBookBtn.props.onClick());
assert.ok(JSON.stringify(tree.toJSON()).includes('Select Service') || JSON.stringify(tree.toJSON()).includes(tmpl.services[0].name));

await act(async () => tree.unmount());

// ============================================================================
// 14. Stale Supabase template catalog & legacy beauty_parlour draft upgrade
// ============================================================================
const staleSupabaseBeautyRow = {
  id: 'beauty_parlour',
  title: 'Roop Mahal Beauty Parlour & Makeover Space',
  shortName: 'Beauty Parlour',
  tagline: 'Timeless Indian Beauty, Herbal Facials, Threading & Radiance Care',
  paletteLabel: 'Rose Gold & Ivory Theme',
  themePreset: 'rose_gold_ivory',
  ownerPhotoUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=500&q=80',
  coverImageUrl: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1200&q=80',
  themeStyle: { heroBackground: 'bg-[#fffaf6]', heroTextColor: 'text-gray-900' },
  services: tmpl.services,
  stylists: [
    {
      id: 'bp-st-1',
      name: 'Sunita Agarwal',
      role: 'Master Aesthetician',
      avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80',
      specialties: ['Gold Facials', 'Threading', 'Herbal Recipes'],
      rating: 4.96,
    },
    {
      id: 'bp-st-2',
      name: 'Meenakshi Joshi',
      role: 'Senior Skin Therapist',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      specialties: ['Rica Waxing', 'Anti-Tan Peels'],
      rating: 4.92,
    },
    {
      id: 'bp-st-3',
      name: 'Pooja Sundaram',
      role: 'Threading & Henna Expert',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      specialties: ['Eyebrow Arching', 'Festive Combos'],
      rating: 4.87,
    },
  ],
  demoOffer: {
    enabled: true,
    selectedServiceId: 'bp-1',
    headline: 'Sample 20% OFF',
    discountPercent: 20,
    lastMinute: true,
  },
};

const upgradedCatalogRow = upgradeBeautyParlourTemplate(staleSupabaseBeautyRow);
assert.equal(upgradedCatalogRow.coverImageUrl, ROOP_MAHAL_IMAGES.heroBridal);
assert.equal(upgradedCatalogRow.ownerPhotoUrl, ROOP_MAHAL_IMAGES.staffSunita);
assert.equal(upgradedCatalogRow.paletteLabel, CATEGORY_TEMPLATES.beauty_parlour.paletteLabel);
assert.equal(upgradedCatalogRow.tagline, CATEGORY_TEMPLATES.beauty_parlour.tagline);
assert.deepEqual(
  upgradedCatalogRow.stylists.map((s) => s.avatarUrl),
  [ROOP_MAHAL_IMAGES.staffSunita, ROOP_MAHAL_IMAGES.staffMeenakshi, ROOP_MAHAL_IMAGES.staffPooja],
);
assert.deepEqual(upgradedCatalogRow.services, tmpl.services, 'Service records must remain 100% unchanged');

// Non-beauty_parlour templates pass through untouched by exact reference
for (const other of Object.values(CATEGORY_TEMPLATES).filter((t) => t.id !== 'beauty_parlour')) {
  assert.equal(upgradeBeautyParlourTemplate(other), other, `Template ${other.id} must remain untouched`);
}

// Customer App withTemplateDemos + TemplateDemoSalon + DiscoverySections with stale Supabase meta
const demoSalons = withTemplateDemos([], [staleSupabaseBeautyRow as any]);
assert.equal(demoSalons.length, 1);
assert.equal(demoSalons[0].content.profile.coverImageUrl, ROOP_MAHAL_IMAGES.heroBridal);
const demoSalonHtml = renderToStaticMarkup(<TemplateDemoSalon salon={demoSalons[0]} back={() => {}} />);
assert.ok(demoSalonHtml.includes(ROOP_MAHAL_IMAGES.heroBridal));
assert.ok(demoSalonHtml.includes(ROOP_MAHAL_IMAGES.staffSunita));
assert.ok(!demoSalonHtml.includes('1516975080664'), 'Stale Unsplash cover must never leak into TemplateDemoSalon');
const discoveryHtml = renderToStaticMarkup(<DiscoverySections salons={demoSalons} open={() => {}} book={() => {}} />);
assert.ok(discoveryHtml.includes(ROOP_MAHAL_IMAGES.serviceThreading), 'Quick Services must use Roop Mahal AI service photo');
assert.ok(discoveryHtml.includes(ROOP_MAHAL_IMAGES.heroBridal), 'Special Discounts must use Roop Mahal AI hero photo');
assert.ok(!discoveryHtml.includes('1516975080664'), 'Stale Unsplash cover must never leak into DiscoverySections');

// Legacy saved beauty_parlour draft upgrades stock defaults while preserving real owner uploads & services
const legacySavedDraft = normalizeWorkspace({
  profile: {
    ...INITIAL_SALON_PROFILE,
    businessType: 'beauty_parlour',
    businessName: 'Roop Mahal Studio',
    coverImageUrl: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1200&q=80',
    ownerPhotoUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=500&q=80',
    tagline: 'Timeless Indian Beauty, Herbal Facials, Threading & Radiance Care',
    photoGalleryInitialized: true,
    photoGalleryType: 'beauty_parlour',
    photoGallery: [
      { id: 'template-gallery-beauty_parlour-1', category: 'Skin', url: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=800&q=80', title: 'Old Demo 1', isDemo: true },
      { id: 'owner-real-gallery-1', category: 'Bridal', url: 'https://cdn.example.com/real-salon-bride.jpg', title: 'Real Bride', isDemo: false },
    ],
  },
  services: tmpl.services,
  stylists: [
    ...staleSupabaseBeautyRow.stylists,
    {
      id: 'custom-staff-1',
      name: 'Kavya Sharma',
      role: 'Bridal Stylist',
      avatarUrl: 'https://cdn.example.com/real-staff-kavya.jpg',
      specialties: ['Bridal Draping'],
      rating: 4.9,
    },
  ],
});
assert.equal(legacySavedDraft.profile.coverImageUrl, ROOP_MAHAL_IMAGES.heroBridal);
assert.equal(legacySavedDraft.profile.ownerPhotoUrl, ROOP_MAHAL_IMAGES.staffSunita);
assert.equal(legacySavedDraft.stylists[0].avatarUrl, ROOP_MAHAL_IMAGES.staffSunita);
assert.equal(legacySavedDraft.stylists[3].avatarUrl, 'https://cdn.example.com/real-staff-kavya.jpg', 'Real staff photo must never be overwritten');
const upgradedGallery = photoGallery(legacySavedDraft.profile);
assert.equal(upgradedGallery.length, 2, 'Intentional deletions of demo items must be respected');
assert.equal(upgradedGallery[0].url, ROOP_MAHAL_IMAGES.galleryBridalDetail, 'Remaining legacy demo item upgrades to Roop Mahal AI photo');
assert.equal(upgradedGallery[1].url, 'https://cdn.example.com/real-salon-bride.jpg', 'Salon-uploaded gallery photo must never be overwritten');

// Real owner cover photo & custom tagline must NEVER be overwritten
const customOwnerDraft = normalizeWorkspace({
  profile: {
    ...INITIAL_SALON_PROFILE,
    businessType: 'beauty_parlour',
    coverImageUrl: 'https://cdn.example.com/real-salon-cover.jpg',
    ownerPhotoUrl: 'https://cdn.example.com/real-owner-portrait.jpg',
    tagline: 'Bespoke Bridal & Herbal Parlour in Connaught Place',
  },
  services: tmpl.services,
  stylists: [],
});
assert.equal(customOwnerDraft.profile.coverImageUrl, 'https://cdn.example.com/real-salon-cover.jpg');
assert.equal(customOwnerDraft.profile.ownerPhotoUrl, 'https://cdn.example.com/real-owner-portrait.jpg');
assert.equal(customOwnerDraft.profile.tagline, 'Bespoke Bridal & Herbal Parlour in Connaught Place');

console.log(
  'PASS: Template 04 (Roop Mahal) design + Explicit Section Visibility Rules + stale Supabase catalog & legacy draft upgrades verified with Templates 01–03 & 05–14 unchanged.',
);
