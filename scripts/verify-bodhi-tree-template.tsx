import React, { useState } from 'react';
import { act, create } from 'react-test-renderer';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { ALL_CATEGORY_OPTIONS, CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import { INITIAL_SALON_PROFILE } from '../src/mockData';
import { CustomerSalonWebsite } from '../src/components/CustomerSalonWebsite';
import { BodhiTreeEditor } from '../src/components/bodhi-tree/BodhiTreeEditor';
import { BookingModal } from '../src/components/BookingModal';
import { requestedTemplate } from '../src/lib/templateEntry';
import { normalizeWorkspace } from '../src/lib/normalizeWorkspace';
import { isPackage } from '../src/lib/packageCatalogue';
import { serviceValidation } from '../src/lib/serviceCatalogue';
import {
  BODHI_TREE_BRAND_NAME,
  BODHI_TREE_DEFAULT_BRANCHES,
  BODHI_TREE_DEFAULT_COLORS,
  BODHI_TREE_DEFAULT_PALACE_COLLECTION,
  BODHI_TREE_DEFAULT_REVIEWS,
  BODHI_TREE_IMAGES,
  BODHI_TREE_TEMPLATE_SERVICES,
  bodhiFormatInr,
  buildBodhiTreeSeo,
  resolveBodhiTreeConfig,
} from '../src/lib/bodhiTree';
import type { SalonProfile } from '../src/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const locationMock: any = { href: 'https://bodhitree.example/', origin: 'https://bodhitree.example', hash: '', search: '' };
(globalThis as any).location = locationMock;
(globalThis as any).window = {
  location: locationMock,
  scrollTo() {},
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};
(globalThis as any).document = {
  title: '',
  head: { appendChild() {}, querySelector: () => null },
  body: { style: {} },
  querySelector: () => null,
  createElement: () => ({ setAttribute() {}, textContent: '' }),
  addEventListener() {},
  removeEventListener() {},
};

const nodeText = (node: any): string =>
  typeof node === 'string'
    ? node
    : Array.isArray(node)
      ? node.map(nodeText).join(' ')
      : (node?.children || []).map(nodeText).join(' ');

const template = CATEGORY_TEMPLATES.massage_wellness;
const demoProfile: SalonProfile = {
  ...INITIAL_SALON_PROFILE,
  businessType: 'massage_wellness',
  businessName: BODHI_TREE_BRAND_NAME,
  tagline: template.tagline,
  about: template.about,
  phone: template.phone,
  whatsapp: template.whatsapp,
  address: template.defaultAddress,
  city: template.defaultCity,
  postalCode: template.defaultPostalCode,
  coverImageUrl: template.coverImageUrl,
  subdomain: 'bodhi-tree',
};

function renderPage(hash = '', profile: SalonProfile = demoProfile, services = template.services, stylists = template.stylists) {
  locationMock.hash = hash;
  return renderToStaticMarkup(
    <CustomerSalonWebsite profile={profile} services={services} stylists={stylists} onAddAppointment={async (a: any) => a} />,
  );
}

/* ---------------- 1. Registry & entry ---------------- */
assert.equal(template.title, 'Bodhi Tree Massage & Wellness Sanctuary');
assert.equal(template.layoutStyle, 'palace_heritage');
assert.equal(template.themePreset, 'sage_cream_gold');
const picker = ALL_CATEGORY_OPTIONS.find((o) => o.id === 'massage_wellness')!;
assert.equal(picker.badge, 'Template 09', 'onboarding picker shows the Template 09 badge');
assert.ok(picker.title.includes('Bodhi Tree'));
for (const slug of ['bodhi-tree', '09', 'template-09', 'bodhitree', 'massage_wellness']) {
  assert.equal(requestedTemplate(`?template=${slug}`)?.id, 'massage_wellness', `?template=${slug} resolves to Template 09`);
}
console.log('PASS: Template 09 registry, picker badge and ?template=bodhi-tree entry aliases.');

/* ---------------- 2. Catalogue: services, prices, palace links ---------------- */
const services = BODHI_TREE_TEMPLATE_SERVICES;
assert.equal(services.length, 21, '9 core + 7 palace + 5 package services');
const byName = new Map(services.map((s) => [s.name, s]));
const expectPrice = (namePart: string, price: number) => {
  const found = services.find((s) => s.name.includes(namePart));
  assert.ok(found, `service ${namePart} exists`);
  assert.equal(found!.price, price, `${namePart} is ₹${price}`);
};
expectPrice('Abhyanga', 2500);
expectPrice('Swedish', 2200);
expectPrice('Deep Tissue', 2800);
expectPrice('Shirodhara', 3200);
expectPrice('Thai', 3000);
expectPrice('Foot Reflexology', 1200);
expectPrice("Couple's", 6500);
expectPrice('Aroma', 2600);
expectPrice('Champi', 900);
assert.equal(services.filter(isPackage).length, 5, 'exactly five starter packages (shared invariant)');
for (const s of services) assert.equal(serviceValidation(s), '', `${s.name} passes service validation`);

assert.equal(BODHI_TREE_DEFAULT_PALACE_COLLECTION.length, 7, 'seven Jaipur Palace Collection rituals');
const palaceExpect: Array<[string, number]> = [
  ['Hawa Mahal Calm Ritual', 2499],
  ['City Palace Royal Abhyanga', 3999],
  ['Amer Fort Warrior Recovery', 3499],
  ['Jal Mahal Lakeside Shirodhara', 3299],
  ['Nahargarh Sunset Relax', 2999],
  ['Rambagh Maharani Package', 9999],
  ['Albert Hall Heritage Reset', 4499],
];
for (const [title, price] of palaceExpect) {
  const item = BODHI_TREE_DEFAULT_PALACE_COLLECTION.find((p) => p.title === title);
  assert.ok(item, `palace item ${title} exists`);
  assert.equal(item!.price, price);
  const linked = services.find((s) => s.id === item!.linkedServiceId);
  assert.ok(linked, `${title} links to a bookable service`);
  assert.equal(linked!.price, price, `${title} card price matches its bookable service`);
}
assert.deepEqual(
  BODHI_TREE_DEFAULT_BRANCHES.map((b) => b.area),
  ['C-Scheme', 'Malviya Nagar', 'Vaishali Nagar', 'Bani Park'],
  'four default Jaipur branches',
);
assert.deepEqual(
  BODHI_TREE_DEFAULT_REVIEWS.map((r) => r.name),
  ['Neha S.', 'Rohit M.', 'Priya K.', 'Aman J.', 'Sunita D.'],
);
assert.equal(bodhiFormatInr(2500), '₹2,500');
assert.equal(bodhiFormatInr(9999), '₹9,999');
assert.equal(bodhiFormatInr(1250.5), '₹1,250.5', 'owner-entered paise are kept, Indian grouping');
console.log('PASS: Bodhi Tree catalogue — INR prices, five packages, seven linked Palace rituals, Jaipur branches.');

/* ---------------- 3. Bundled assets exist and stay lean ---------------- */
const collect = (v: any, out: string[] = []): string[] => {
  if (typeof v === 'string') out.push(v);
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => collect(x, out));
  return out;
};
const imagePaths = [...collect(BODHI_TREE_IMAGES), '/templates/bodhi-tree/logo.svg', '/templates/bodhi-tree/favicon.svg', '/templates/bodhi-tree/og-image.jpg', '/templates/bodhi-tree/preview.webp'];
assert.ok(imagePaths.length >= 40, `expected 40+ bundled assets, found ${imagePaths.length}`);
for (const p of imagePaths) {
  const file = join(process.cwd(), 'public', p);
  assert.ok(existsSync(file), `asset exists: ${p}`);
  const kb = statSync(file).size / 1024;
  assert.ok(kb <= 300, `asset stays lean (${kb.toFixed(0)} KB): ${p}`);
}
console.log(`PASS: ${imagePaths.length} bundled Bodhi Tree assets exist under public/templates/bodhi-tree (each ≤300 KB).`);

/* ---------------- 4. Home page static render ---------------- */
const home = renderPage();
assert.ok(home.includes('bt-site'), 'Bodhi Tree theme scope renders');
assert.ok(home.includes('--bt-sage:#4E6E58'), 'default sage brand colour is inlined');
assert.ok(home.includes('Rest Well. Feel Light.'), 'hero heading');
assert.ok(home.includes('Padharo, Jaipur'), 'tagline on the page');
assert.ok(home.includes('bt-phone'), 'hero DeviceMockup phone');
assert.ok(home.includes('booking screen preview'), 'mockup is a live booking screen');
assert.ok(home.includes('25,000+'), 'central glass stats card');
for (const t of ['Hawa Mahal Calm Ritual', 'City Palace Royal Abhyanga', 'Amer Fort Warrior Recovery', 'Jal Mahal Lakeside Shirodhara']) {
  assert.ok(home.includes(t), `home palace preview shows ${t}`);
}
assert.ok(home.includes('₹2,499') && home.includes('₹2,500'), 'INR Indian-format prices on home');
assert.ok(!home.includes('$'), 'no dollar prices anywhere');
assert.ok(!home.includes('Candolim'), 'legacy Goa copy is gone');
assert.ok(home.includes('9:00 AM - 9:00 PM'), 'working hours in 12-hour Indian format');
assert.ok(home.includes('wa.me/'), 'real WhatsApp contact path');
let prev = -1;
for (const marker of ['hero', 'services', 'experiences', 'gallery', 'location', 'footer']) {
  const at = home.indexOf(`data-layout="${marker}"`);
  assert.ok(at > prev, `layout order: ${marker}`);
  prev = at;
}
console.log('PASS: Bodhi Tree home — royal Jaipur hero, DeviceMockup, glass stats, palace preview, layout order.');

/* ---------------- 4b. Hero entrance animation is armed + E2E content guards ---------------- */
// Regression: AnimatePresence initial={false} used to block every first-mount
// entrance (blockInitialAnimation). The headline must start at y:40/opacity:0
// and the DeviceMockup at scale(0.92)/opacity:0 so Framer Motion animates them.
const h1Tag = home.match(/<h1[^>]*id="bt-hero-heading"[^>]*>/)?.[0] || '';
assert.ok(h1Tag.includes('translateY(40px)') && h1Tag.includes('opacity:0'), 'hero headline starts hidden at y:40 and slides up (heroHeadline)');
const mockupTag = home.match(/<div[^>]*class="hidden justify-self-end md:block"[^>]*>/)?.[0] || '';
assert.ok(mockupTag.includes('scale(0.92)') && mockupTag.includes('opacity:0'), 'DeviceMockup starts at scale 0.92 and fades/scales in (deviceMockupIn)');
// Real guest reviews submitted through the platform flow appear first.
const withRealReview = renderPage('#reviews', {
  ...demoProfile,
  websiteTestimonials: [{
    id: 'real-guest-1', name: 'Real Guest', location: 'Jaipur', rating: 5,
    serviceName: 'Abhyanga (Ayurvedic Oil Massage)', comment: 'My actual visit was wonderful and calm.',
    avatarUrl: '', date: '2026-01-01', isDemo: false,
  }],
});
assert.ok(withRealReview.includes('Real Guest') && withRealReview.includes('My actual visit was wonderful and calm.'), 'real submitted review renders');
assert.ok(withRealReview.indexOf('Real Guest') < withRealReview.indexOf('Neha S.'), 'real reviews lead, editor samples follow');
// A published salon with no staff must never show demo therapists.
const publishedEmptyTeam = renderPage('#team', demoProfile, template.services, []);
assert.ok(!publishedEmptyTeam.includes('Kavita Sharma') && publishedEmptyTeam.includes('Our team page is coming soon.'), 'published site with no staff shows an honest empty state');
const demoEmptyTeam = renderPage('#team', { ...demoProfile, subdomain: '' }, template.services, []);
assert.ok(demoEmptyTeam.includes('Kavita Sharma'), 'template demo still previews the starter therapists');
console.log('PASS: hero entrance animation armed (y:40 headline, scale .92 mockup); real reviews merge first; published empty team stays honest.');

/* ---------------- 5. Every page renders its content (deep-link hashes) ---------------- */
const palace = renderPage('#palace');
for (const [title, price] of palaceExpect) {
  assert.ok(palace.includes(title), `palace page shows ${title}`);
  assert.ok(palace.includes(bodhiFormatInr(price)), `palace page shows ${bodhiFormatInr(price)}`);
}
assert.ok(palace.includes('bt-arch'), 'jharokha arch frames');
const servicesPage = renderPage('#services');
for (const name of ['Abhyanga', 'Swedish', 'Deep Tissue', 'Shirodhara', 'Thai', 'Foot Reflexology', 'Couple&#x27;s', 'Aroma', 'Champi']) {
  assert.ok(servicesPage.includes(name), `massage menu shows ${name}`);
}
assert.ok(!servicesPage.includes('Hawa Mahal Calm Ritual'), 'palace rituals stay on the Palace page');
assert.ok(servicesPage.includes('Service categories') || servicesPage.includes('Ayurvedic Massage'), 'category filter present');
const packagesPage = renderPage('#packages');
for (const name of ['Full Day Relax Package', 'Bridal Glow Package', 'Weekend Relax Package', 'Couple Special Package', 'Monthly Care Package']) {
  assert.ok(packagesPage.includes(name), `packages page shows ${name}`);
}
const teamPage = renderPage('#team');
for (const name of ['Kavita Sharma', 'Deepak Yadav', 'Rekha Jain', 'Sunita Kumari']) assert.ok(teamPage.includes(name), `team shows ${name}`);
const reviewsPage = renderPage('#reviews');
for (const name of ['Neha S.', 'Rohit M.', 'Priya K.', 'Aman J.', 'Sunita D.']) assert.ok(reviewsPage.includes(name), `reviews show ${name}`);
const galleryPage = renderPage('#gallery');
assert.ok((galleryPage.match(/\/templates\/bodhi-tree\/gallery\//g) || []).length >= 10, 'gallery shows the ten bundled photographs');
const aboutPage = renderPage('#about');
assert.ok(aboutPage.includes('calm place in the heart of Jaipur'), 'simple-English about copy');
const contactPage = renderPage('#contact');
assert.ok(contactPage.includes('google.com/maps') || contactPage.includes('maps.google'), 'Jaipur map embed');
for (const area of ['C-Scheme', 'Malviya Nagar', 'Vaishali Nagar', 'Bani Park']) assert.ok(contactPage.includes(area), `contact lists ${area}`);
assert.ok(contactPage.includes('+91 98290 10009'), 'Indian phone format');
locationMock.hash = '';
console.log('PASS: all nine Bodhi Tree pages render their real content (deep-linkable via #page hashes).');

/* ---------------- 6. Owner customization wins over demo ---------------- */
const customProfile: SalonProfile = {
  ...demoProfile,
  businessName: 'My Own Spa',
  tagline: 'My custom tagline',
  phone: '+91 99887 76655',
  whatsapp: '+91 99887 76655',
  bodhiTree: {
    colors: { ...BODHI_TREE_DEFAULT_COLORS, sage: '#123456' },
    heroHeading: 'My Custom Heading',
    palaceCollection: BODHI_TREE_DEFAULT_PALACE_COLLECTION.map((p, i) => (i === 0 ? { ...p, title: 'My Palace Special', price: 1111 } : p)),
    branches: [{ id: 'b1', name: 'Only Branch', area: 'Ajmer Road', address: '1 Ajmer Road, Jaipur 302001', phone: '+91 99887 76655', hours: '10:00 AM - 8:00 PM' }],
  },
};
const customHome = renderPage('', customProfile);
assert.ok(customHome.includes('My Own Spa'), 'custom business name');
assert.ok(customHome.includes('My Custom Heading'), 'custom hero heading');
assert.ok(customHome.includes('--bt-sage:#123456'), 'custom brand colour inlined');
assert.ok(customHome.includes('My Palace Special'), 'custom palace card');
assert.ok(customHome.includes('Ajmer Road'), 'custom branch');
assert.ok(!customHome.includes('Rest Well. Feel Light.'), 'demo heading replaced');
const resolved = resolveBodhiTreeConfig(demoProfile);
const seo = buildBodhiTreeSeo(demoProfile, resolved);
const seoText = JSON.stringify(seo);
assert.ok(seoText.includes('DaySpa') && seoText.includes('INR') && seoText.includes('09:00'), 'LocalBusiness JSON-LD with INR and 9 AM opening');
console.log('PASS: owner edits (name, colours, hero, palace, branches) fully replace demo content; SEO is Jaipur/INR.');

/* ---------------- 7. Legacy massage_wellness workspaces upgrade ---------------- */
const legacy = normalizeWorkspace({
  profile: {
    ...demoProfile,
    coverImageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1600',
    ownerPhotoUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400',
  },
  stylists: template.stylists.map((s) => ({ ...s, avatarUrl: 'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=400' })),
} as any);
assert.equal(legacy.profile.coverImageUrl, template.coverImageUrl, 'legacy stock cover upgraded to the Bodhi hero');
assert.ok(legacy.stylists.every((s: any) => String(s.avatarUrl).startsWith('/templates/bodhi-tree/')), 'legacy stock portraits upgraded');
console.log('PASS: pre-Template-09 massage workspaces upgrade covers and portraits automatically.');

/* ---------------- 8. Interactive: booking + filters + editor ---------------- */
let site: any;
locationMock.hash = '#services';
await act(async () => {
  site = create(
    <CustomerSalonWebsite profile={demoProfile} services={template.services} stylists={template.stylists} onAddAppointment={async (a: any) => a} />,
  );
});
const bookBtn = site.root.findByProps({ 'aria-label': 'Book Abhyanga (Ayurvedic Oil Massage) for ₹2,500' });
await act(async () => bookBtn.props.onClick());
const modal = site.root.findByType(BookingModal);
assert.equal(modal.props.isOpen, true, 'Book Now opens the existing booking system');
assert.equal(modal.props.initialService?.name, 'Abhyanga (Ayurvedic Oil Massage)');
await act(async () => site.unmount());
locationMock.hash = '';

let editorProfile: any;
function EditorHarness() {
  const [profile, setProfile] = useState<SalonProfile>({ ...demoProfile });
  editorProfile = profile;
  return <BodhiTreeEditor profile={profile} setProfile={setProfile} showBrandIdentityFields />;
}
let editor: any;
await act(async () => {
  editor = create(<EditorHarness />);
});
const tabBtn = (label: string) => editor.root.findAll((n: any) => n.type === 'button' && nodeText(n).includes(label))[0];
for (const tab of ['Brand & Hero', 'Palace Collection', 'Branches', 'Reviews & FAQs', 'Colours']) {
  assert.ok(tabBtn(tab), `editor tab: ${tab}`);
}
await act(async () => tabBtn('Palace Collection').props.onClick());
const priceInputs = editor.root.findAll((n: any) => n.type === 'input' && n.props.type === 'number');
assert.ok(priceInputs.length >= 7, 'seven palace price fields');
await act(async () => priceInputs[0].props.onChange({ target: { value: '3000' } }));
assert.equal(editorProfile.bodhiTree.palaceCollection[0].price, 3000, 'palace price edit saves into profile.bodhiTree');
await act(async () => tabBtn('Colours').props.onClick());
const colorInputs = editor.root.findAll((n: any) => n.type === 'input' && n.props.type === 'color');
assert.equal(colorInputs.length, 7, 'seven brand colour fields');
await act(async () => colorInputs[3].props.onChange({ target: { value: '#224433' } }));
assert.equal(editorProfile.bodhiTree.colors.sage, '#224433');
assert.equal(editorProfile.customAccentColor, '#224433', 'sage colour also drives the shared brand accent');
await act(async () => editor.unmount());
console.log('PASS: live booking opens with the chosen treatment; Bodhi Tree editor saves palace prices and brand colours.');

console.log('PASS: Template 09 “Bodhi Tree” — registry, catalogue, assets, nine pages, customization, legacy upgrade, booking and editor.');
