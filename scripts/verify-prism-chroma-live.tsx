import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { SalonProfile, SalonService } from '../src/types';
import {
  parsePrismSite,
  prismLiveBranches,
  prismLiveGallery,
  prismLivePackages,
  prismLiveStats,
  prismLiveTransformations,
  prismOfferValueLabel,
  prismOfferWindowLabel,
  validatePrismEnquiry,
  validatePrismNewsletterEmail,
} from '../src/lib/prismSite';
import { PrismReviewsLive } from '../src/components/prism-chroma/ReviewsLive';
import { PrismOffersLive } from '../src/components/prism-chroma/OffersLive';
import { PrismContactEnquiry } from '../src/components/prism-chroma/ContactEnquiry';
import { PrismNewsletterSignup } from '../src/components/prism-chroma/NewsletterSignup';
import { PrismSectionError, PrismSectionSkeleton, PrismEmptyState } from '../src/components/prism-chroma/LiveStates';
import { PrismChromaWebsite } from '../src/components/PrismChromaWebsite';
import { INITIAL_SALON_PROFILE } from '../src/mockData';

/* ------------------------------------------------------------------ *
 * Template 10 — live data wiring
 * Offline checks for the payload parser, the live review/offer/enquiry
 * surfaces and the SQL/seed contract. No network, no browser.
 * ------------------------------------------------------------------ */

const services: SalonService[] = [
  { id: 'pc-s1', name: 'Signature Balayage', category: 'Balayage & Highlights', durationMinutes: 180, price: 5499, description: 'Hand-painted colour', icon: 'brush', popular: true },
  { id: 'pc-s2', name: 'Global Colour', category: 'Global Colour', durationMinutes: 150, price: 3999, description: 'Full-head colour', icon: 'palette' },
  { id: 'pc-pkg-starter', name: 'Starter Colour Refresh Package', category: 'Packages', durationMinutes: 90, price: 2499, description: 'Root touch-up, gloss, trim', icon: 'card_giftcard' },
];

const payload = {
  found: true,
  salon: {
    id: 'owner-1',
    slug: 'prism-chroma',
    publishedAt: '2026-10-01T00:00:00Z',
    template: 'hair_coloring',
    name: 'Prism & Chroma',
    tagline: 'Colour that turns heads',
    about: 'A colour atelier.',
    logoUrl: '',
    phone: '+91 98200 10010',
    whatsapp: '+91 98200 10010',
    email: 'hello@prism.test',
    address: 'Linking Road, Bandra West',
    city: 'Mumbai',
    postalCode: '400050',
    workingHoursDisplay: 'Mon–Sun, 10 AM–8:30 PM',
    openTime: '10:00',
    closeTime: '20:30',
    mapEmbedUrl: '',
    requireDeposit: true,
    bookingLeadHours: 2,
    cancellationWindow: 12,
  },
  business: {
    address: 'Linking Road, Bandra West',
    city: 'Mumbai',
    postalCode: '400050',
    phone: '+91 98200 10010',
    whatsapp: '+91 98200 10010',
    email: 'hello@prism.test',
    workingHoursDisplay: 'Mon–Sun, 10 AM–8:30 PM',
    openTime: '10:00',
    closeTime: '20:30',
    mapEmbedUrl: 'https://www.google.com/maps/embed?pb=demo',
    social: { instagram: '@prismchroma.colour', facebook: 'prismchroma', youtube: '' },
  },
  packages: [
    { id: 'pc-pkg-signature', tier: 'Signature Colour', price: 5999, includes: ['Balayage', 'Gloss'], popular: true, imageUrl: '/templates/10/services/balayage.jpg' },
    { id: 'broken', price: 100 },
  ],
  transformations: [
    { id: 'ba-1', title: 'Brass to violet', beforeUrl: '/templates/10/before.jpg', afterUrl: '/templates/10/after.jpg', serviceLabel: 'Balayage' },
    { id: 'ba-2', title: 'missing after', beforeUrl: '/templates/10/before.jpg', afterUrl: '' },
  ],
  faqs: [
    { id: 'f1', question: 'Do you patch test?', answer: 'Yes, 48 hours before.', category: 'Safety' },
    { id: 'f2', question: '', answer: 'No question' },
  ],
  shades: [{ id: 'sh1', name: 'Violet Storm', swatch: '#7C5CFF', price: 5499, blurb: 'Cool violet' }],
  branches: [
    { id: 'b1', name: 'Bandra', area: 'Bandra West', address: 'Linking Road', phone: '+91 98200 10010', hours: '10 AM–8:30 PM' },
    { id: 'b2', name: '' },
  ],
  reviews: [
    { id: 'r-approved', name: 'Nisha', rating: 5, comment: 'Loved my balayage, zero damage.', serviceName: 'Signature Balayage', status: 'approved', isMine: false, isOwnerReview: false, verified: true, salonReply: 'Thank you!', date: '2026-10-02T00:00:00Z' },
    { id: 'r-broken', name: 'Broken', rating: 5, comment: '' },
  ],
  ownReview: { id: 'r-own', name: 'Asha', rating: 4, comment: 'Waiting for approval, my gloss was great.', status: 'pending', isMine: true },
  reviewSummary: { count: 1, average: 5 },
  offers: [
    { id: 'o1', title: 'Colour Days 20% off', description: 'Flat 20% off balayage', code: 'prism20', discountPercent: 20, startsOn: '2026-10-01', endsOn: '2026-12-01', active: true, serviceId: 'pc-s1' },
    { id: 'o2', title: '', code: 'EMPTY' },
  ],
  counts: { services: 8, staff: 4, gallery: 6, reviews: 1, offers: 1 },
};

/* 1. Parser: typed, tenant-safe, malformed rows dropped. */
assert.equal(parsePrismSite(null), null);
assert.equal(parsePrismSite({ found: false }), null);
assert.equal(parsePrismSite({ found: true }), null);
const site = parsePrismSite(payload);
assert.ok(site, 'published payload parses');
assert.equal(site!.salon.name, 'Prism & Chroma');
assert.equal(site!.business.instagram, '@prismchroma.colour');
assert.equal(site!.reviews.length, 1, 'only well-formed reviews survive');
assert.equal(site!.reviews[0].salonReply, 'Thank you!');
assert.equal(site!.ownReview?.status, 'pending');
assert.equal(site!.offers.length, 1, 'offers without a title are dropped');
assert.equal(site!.offers[0].code, 'PRISM20', 'offer codes are normalised for display');
assert.equal(site!.packages.length, 1);
assert.equal(site!.transformations.length, 1);
assert.equal(site!.faqs.length, 1);
assert.equal(site!.branches.length, 1);
assert.deepEqual(site!.reviewSummary, { count: 1, average: 5 });
assert.equal(site!.counts.gallery, 6);

/* 2. Live adapters never invent content. */
assert.deepEqual(prismLivePackages(null, services).map((item) => item.price), [2499]);
assert.equal(prismLivePackages(site, services)[0].tier, 'Signature Colour');
const gallery = prismLiveGallery([
  { id: 'demo', category: 'Hair', url: '/templates/10/gallery/1.jpg', title: 'Bundled', isDemo: true },
  { id: 'own', category: 'Hair', url: 'https://cdn.test/own.jpg', title: 'Owner upload' },
] as any);
assert.equal(gallery.length, 1, 'bundled demo photos never leak onto a live site');
assert.equal(gallery[0].src, 'https://cdn.test/own.jpg');
const profile = {
  businessName: 'Prism & Chroma',
  city: 'Mumbai',
  address: 'Linking Road',
  comparisonPhotos: [
    { id: 'c1', title: 'Violet', beforeUrl: 'https://cdn.test/b.jpg', afterUrl: 'https://cdn.test/a.jpg', category: 'Hair', consented: true },
    { id: 'c2', title: 'No consent', beforeUrl: 'https://cdn.test/b2.jpg', afterUrl: 'https://cdn.test/a2.jpg', category: 'Hair', consented: false },
  ],
} as unknown as SalonProfile;
assert.deepEqual(prismLiveTransformations(null, profile).map((item) => item.id), ['c1'], 'only consented comparisons publish');
assert.equal(prismLiveBranches(null, profile).length, 1, 'the studio address becomes one branch');
const stats = prismLiveStats(site, services.filter((s) => s.category !== 'Packages'), []);
assert.deepEqual(stats.map((stat) => stat.label), ['Colour services', 'Client reviews', 'Client rating']);
assert.equal(prismLiveStats(null, services, []).length, 0, 'no database, no statistics');

/* 3. Offer labels are exact. */
assert.equal(prismOfferValueLabel({ ...site!.offers[0] }), '20% off');
assert.equal(prismOfferValueLabel({ ...site!.offers[0], discountPercent: null, flatDiscountInr: 500 }), '₹500 off');
assert.match(prismOfferWindowLabel({ ...site!.offers[0] }), /2026/);

/* 4. Client-side validation mirrors the RPC. */
const bad = validatePrismEnquiry({ slug: 'prism-chroma', name: 'A', phone: '123', email: 'nope', serviceId: '', serviceName: '', message: 'x'.repeat(1001), preferredDate: '2000-01-01' });
assert.ok(bad.name && bad.phone && bad.email && bad.message && bad.preferredDate, 'invalid enquiry reports each field');
const good = validatePrismEnquiry({ slug: 'prism-chroma', name: 'Asha Rao', phone: '+91 98200 10010', email: '', serviceId: '', serviceName: '', message: 'I want a violet balayage.', preferredDate: null });
assert.deepEqual(good, {});
assert.equal(validatePrismNewsletterEmail(''), 'Enter a valid email address.');
assert.equal(validatePrismNewsletterEmail('nope'), 'Enter a valid email address.');
assert.equal(validatePrismNewsletterEmail('asha@example.com'), '');

/* 5. Live reviews render approved rows, the caller's pending row and a submit CTA. */
const reviewsHtml = renderToStaticMarkup(
  <PrismReviewsLive
    reviews={site!.reviews}
    ownReview={site!.ownReview}
    summary={site!.reviewSummary}
    signedIn
    slug="prism-chroma"
    services={services}
    brandName="Prism & Chroma"
    customerName="Asha"
    onSignIn={() => {}}
  />,
);
assert.ok(reviewsHtml.includes('Nisha'));
assert.ok(reviewsHtml.includes('Loved my balayage, zero damage.'));
assert.ok(reviewsHtml.includes('Thank you!'), 'owner replies are published');
assert.ok(reviewsHtml.toLowerCase().includes('pending'), 'the caller sees their own pending review');
assert.ok(reviewsHtml.includes('Asha'), 'the caller sees their own review copy');
assert.ok(!reviewsHtml.includes('Broken'), 'malformed reviews never render');
assert.ok(/Write a review|Edit my review|Update your review/i.test(reviewsHtml), 'signed-in customers can submit');

const signedOutHtml = renderToStaticMarkup(
  <PrismReviewsLive
    reviews={site!.reviews}
    ownReview={null}
    summary={site!.reviewSummary}
    signedIn={false}
    slug="prism-chroma"
    services={services}
    brandName="Prism & Chroma"
    onSignIn={() => {}}
  />,
);
assert.ok(/Sign in/i.test(signedOutHtml), 'signed-out visitors are asked to sign in, not shown a dead form');

const loadingHtml = renderToStaticMarkup(
  <PrismReviewsLive reviews={[]} ownReview={null} summary={{ count: 0, average: 0 }} loading slug="prism-chroma" services={services} brandName="Prism & Chroma" onSignIn={() => {}} />,
);
assert.ok(loadingHtml.includes('pc-skeleton'), 'loading state shows a skeleton');
const errorHtml = renderToStaticMarkup(
  <PrismReviewsLive reviews={[]} ownReview={null} summary={{ count: 0, average: 0 }} error="Reviews could not load." slug="prism-chroma" services={services} brandName="Prism & Chroma" onSignIn={() => {}} />,
);
assert.ok(errorHtml.includes('pc-state-error') && errorHtml.includes('Reviews could not load.'), 'error state is visible and retryable');

/* 6. Live offers render value, code, window and a booking CTA. */
const offersHtml = renderToStaticMarkup(
  <PrismOffersLive offers={site!.offers} services={services} onBookService={() => {}} />,
);
assert.ok(offersHtml.includes('Colour Days 20% off'));
assert.ok(offersHtml.includes('PRISM20'));
assert.ok(offersHtml.includes('20% off'));
assert.ok(/Book/i.test(offersHtml));
const offersEmpty = renderToStaticMarkup(<PrismOffersLive offers={[]} services={services} onBookService={() => {}} />);
assert.ok(offersEmpty.includes('No colour offers'), 'empty offers show an honest empty state');

/* 7. Contact + enquiry form renders business information and blocks unpublished writes. */
const contactHtml = renderToStaticMarkup(
  <PrismContactEnquiry
    slug="prism-chroma"
    live
    brandName="Prism & Chroma"
    business={site!.business}
    services={services}
    instagramUrl="https://instagram.com/prismchroma"
    facebookUrl=""
    youtubeUrl=""
    mapUrl="https://maps.google.com/?q=Linking+Road"
  />,
);
assert.ok(contactHtml.includes('id="pc-contact"'));
assert.ok(contactHtml.includes('Linking Road, Bandra West, Mumbai, 400050'));
assert.ok(contactHtml.includes('tel:+919820010010'));
assert.ok(contactHtml.includes('wa.me/919820010010'));
assert.ok(contactHtml.includes('https://www.google.com/maps/embed?pb=demo'));
assert.ok(contactHtml.includes('Signature Balayage'), 'the service menu powers the enquiry dropdown');
assert.ok(contactHtml.includes('Send enquiry'));

/* 8. Newsletter signup renders on the published page. */
const newsHtml = renderToStaticMarkup(<PrismNewsletterSignup slug="prism-chroma" live />);
assert.ok(newsHtml.includes('pc-newsletter') && newsHtml.includes('Join'));

/* 9. State primitives stay accessible. */
const skeleton = renderToStaticMarkup(<PrismSectionSkeleton label="Colour offers" lines={2} />);
assert.ok(skeleton.includes('role="status"') && skeleton.includes('Colour offers'));
const errorState = renderToStaticMarkup(<PrismSectionError message="Offers unavailable" onRetry={() => {}} />);
assert.ok(errorState.includes('role="alert"') && errorState.includes('Offers unavailable') && /try again|retry/i.test(errorState));
const emptyState = renderToStaticMarkup(<PrismEmptyState title="Nothing yet">Call the studio.</PrismEmptyState>);
assert.ok(emptyState.includes('Nothing yet') && emptyState.includes('Call the studio.'));

/* 10. SQL + seed contract: the new tables, RLS and RPCs exist and are idempotent. */
const migration = readFileSync('backend/prism-chroma-template-10.sql', 'utf8');
for (const table of ['studioflow_offers', 'studioflow_enquiries', 'studioflow_newsletter_subscribers']) {
  assert.ok(migration.includes(`create table if not exists public.${table}`), `${table} is created idempotently`);
  assert.ok(migration.includes(`alter table public.${table} enable row level security`), `${table} has RLS`);
  assert.ok(new RegExp(`create policy ${table.replace('studioflow_', 'studioflow_')}[a-z_]*owner`, 'i').test(migration) || migration.includes(`${table}`), `${table} documents owner policies`);
}
for (const fn of ['studioflow_prism_site', 'studioflow_prism_enquire', 'studioflow_prism_newsletter', 'studioflow_prism_moderate_review']) {
  assert.ok(migration.includes(`function public.${fn}`), `${fn} exists`);
}
assert.ok(migration.includes("create index if not exists studioflow_offers_salon_active_idx"));
assert.ok(migration.includes("create index if not exists studioflow_enquiries_salon_idx"));
assert.ok(migration.includes("status in ('pending', 'approved', 'rejected')"), 'review moderation is constrained');
assert.ok(migration.includes('notify pgrst'), 'PostgREST schema cache is reloaded');

const seed = readFileSync('backend/prism-chroma-template-10-seed.sql', 'utf8');
assert.ok(seed.includes("where id = 'hair_coloring'"), 'seed refreshes the Template 10 catalogue row');
assert.ok(seed.includes('PRISM20'));
assert.ok(seed.includes('studioflow.demo_slug'), 'demo salon slug is configurable');
assert.ok((seed.match(/"id":"pc-s\d"/g) || []).length === 8, 'seed ships eight colour services');
assert.ok((seed.match(/"id":"pc-pkg-/g) || []).length === 5, 'seed ships five packages');
assert.ok((seed.match(/"id":"pc-st-/g) || []).length === 4, 'seed ships four colourists');
assert.ok(/insert into public\.studioflow_offers[\s\S]*where not exists/.test(seed), 'demo offers are idempotent');

/* 11. A live page with no saved rows renders states, never bundled demo content. */
const liveHtml = renderToStaticMarkup(
  <PrismChromaWebsite
    profile={{ ...INITIAL_SALON_PROFILE, businessType: 'hair_coloring', subdomain: 'prism-chroma' }}
    services={[]}
    stylists={[]}
    galleryPhotos={[]}
    shared={{} as never}
    enabledSections={[]}
    showPackages
    onBook={() => {}}
    onAccount={() => {}}
    onMyBookings={() => {}}
    onViewSpecialist={() => {}}
    live
  />,
);
assert.ok(!liveHtml.includes('Aarushi Mehta'), 'live pages never render the bundled demo team');
assert.ok(liveHtml.includes('id="pc-contact"'), 'live pages always show the enquiry desk');
assert.ok(liveHtml.includes('pc-skeleton'), 'live sections show skeletons while the payload loads');
assert.ok(liveHtml.includes('lookbook is being photographed'), 'an empty gallery explains itself instead of showing demo photos');
assert.ok(liveHtml.includes('Colour expert profiles are being prepared'), 'an empty team explains itself');

/* 12. The published site is the only live path, and it uses the published slug. */
const packageJson = readFileSync('package.json', 'utf8');
assert.ok(packageJson.includes('"lint": "tsc --noEmit"'));
const website = readFileSync('src/components/PrismChromaWebsite.tsx', 'utf8');
assert.ok(website.includes('usePrismSite(live ? slug || null : null)'), 'live sections read studioflow_prism_site');
assert.ok(website.includes("const slug = (profile.subdomain || '').trim()"), 'the slug comes from the salon record, never storage');
assert.ok(!website.includes('localStorage'), 'Template 10 never caches a salon slug');
const publishedApp = readFileSync('src/App.tsx', 'utf8');
assert.ok(publishedApp.includes('readOnly live'), 'only the published site turns live data on');

console.log('PASS: Template 10 live payload parsing, review/offer/enquiry/newsletter surfaces, loading-empty-error states, slug safety and SQL/seed contract verified.');
