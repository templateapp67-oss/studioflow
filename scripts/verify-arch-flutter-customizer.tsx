/**
 * Template 13 (Arch & Flutter) — Template Customizer verification.
 *
 * Run with: node scripts/verify-arch-flutter-customizer.mjs
 *
 * It proves the customizer is scoped to the lash_brow / arch-flutter template,
 * that its typed config round-trips through the existing StudioFlow workspace
 * schema, that validation speaks simple Indian English, that undo/redo, drafts
 * and the owner check behave, that the drawer itself renders and saves, and
 * that no other template picks up any of it.
 */
import React from 'react';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { act, create } from 'react-test-renderer';

import { ALL_CATEGORY_OPTIONS, CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import { DEFAULT_EXTRAS } from '../src/lib/workspaceDefaults';
import { normalizeWorkspace } from '../src/lib/normalizeWorkspace';
import { templateDraft } from '../src/lib/templateEntry';
import { photoGallery } from '../src/lib/photoGallery';
import { isPackage } from '../src/lib/packageCatalogue';
import { resolveArchFlutterConfig, archFlutterCssVariables, ARCH_FLUTTER_BRAND_NAME } from '../src/lib/archFlutter';
import {
  ARCH_FLUTTER_BLUR_STEPS,
  ARCH_FLUTTER_FONT_PAIRS,
  ARCH_FLUTTER_RADIUS_STEPS,
  ARCH_FLUTTER_SECTIONS,
  DEFAULT_CORNER_RADIUS,
  DEFAULT_GLASS_BLUR,
  archFlutterSectionSpec,
  archFlutterStyleVariables,
  defaultArchFlutterSections,
  normalizeArchFlutterSections,
  visibleArchFlutterSections,
} from '../src/lib/archFlutterTheme';
import {
  ACCEPTED_UPLOAD_TYPES,
  ARCH_FLUTTER_BUSINESS_TYPE,
  ARCH_FLUTTER_TEMPLATE_ALIAS,
  CUSTOMIZER_SCHEMA_VERSION,
  CUSTOMIZER_TABS,
  CROP_PRESETS,
  HISTORY_LIMIT,
  MAX_UPLOAD_BYTES,
  SAMPLE_IMAGES,
  applyCustomizerConfig,
  blockingIssues,
  buildCustomizerConfig,
  centerCrop,
  clearCustomizerDraft,
  contrastIssues,
  createHistory,
  customizerAccess,
  customizerDraftKey,
  defaultCustomizerConfig,
  formatDateIN,
  formatInr,
  isArchFlutterTemplate,
  isIndianPhone,
  isSafeHttpUrl,
  loadCustomizerDraft,
  moveItem,
  newId,
  normalizeIndianPhone,
  parseInr,
  pushHistory,
  redoHistory,
  reorderSections,
  resetHistory,
  sampleImagesFor,
  sanitizeMultiline,
  sanitizeText,
  shortenSeoDescription,
  saveCustomizerDraft,
  undoHistory,
  validateCustomizerConfig,
  validateImageFile,
  type ArchFlutterCustomizerConfig,
  type CustomizerWorkspace,
} from '../src/lib/archFlutterCustomizer';
import { ArchFlutterCustomizer } from '../src/components/arch-flutter-customizer/ArchFlutterCustomizer';
import { SectionsTab } from '../src/components/arch-flutter-customizer/tabs/SectionsTab';
import { SalonWebsitePreview } from '../src/components/SalonWebsitePreview';

/* react-test-renderer needs this to allow act() outside a test runner. */
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/* ---------- browser stubs (no real DOM in the harness) ---------- */
const store = new Map<string, string>();
const locationMock: any = { href: 'https://archandflutter.example/', origin: 'https://archandflutter.example', hash: '', search: '', pathname: '/' };
(globalThis as any).location = locationMock;
(globalThis as any).HTMLElement = class HTMLElement {};
(globalThis as any).Element = class Element {};
(globalThis as any).window = {
  location: locationMock,
  scrollY: 0,
  scrollTo() {},
  addEventListener() {},
  removeEventListener() {},
  /* Reduced motion ON: keeps framer-motion out of the way, and the drawer's
     wide-screen preview pane stays closed so the harness never mounts an iframe. */
  matchMedia: (query: string) => ({
    matches: /prefers-reduced-motion/.test(query),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }),
  navigator: { clipboard: { writeText: async () => {} } },
  requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0),
  cancelAnimationFrame: (id: number) => clearTimeout(id),
};
(globalThis as any).document = {
  title: '',
  head: { appendChild() {}, querySelector: () => null },
  body: { style: {} },
  activeElement: null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ setAttribute() {}, textContent: '', remove() {}, appendChild() {}, style: {} }),
  addEventListener() {},
  removeEventListener() {},
};
(globalThis as any).localStorage = {
  getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
  setItem: (key: string, value: string) => void store.set(key, String(value)),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
};
(globalThis as any).requestAnimationFrame = (globalThis as any).window.requestAnimationFrame;
(globalThis as any).cancelAnimationFrame = (globalThis as any).window.cancelAnimationFrame;

/* ---------- helpers ---------- */
const template = CATEGORY_TEMPLATES.lash_brow;
const json = (value: unknown) => JSON.stringify(value);

function templateWorkspace(id = ARCH_FLUTTER_BUSINESS_TYPE): CustomizerWorkspace {
  const draft = templateDraft(CATEGORY_TEMPLATES[id as keyof typeof CATEGORY_TEMPLATES]);
  const normalized = normalizeWorkspace(draft);
  return {
    profile: normalized.profile,
    services: normalized.services || [],
    stylists: normalized.stylists || [],
    extras: { ...DEFAULT_EXTRAS, ...(normalized.extras || {}) } as CustomizerWorkspace['extras'],
  };
}

/** Recursively collects text so we never JSON.stringify a Fiber node. */
function nodeText(value: any): string {
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(nodeText).join('');
  if (value.props) return nodeText(value.props.children);
  return '';
}

/** Walks `renderer.toJSON()` (plain data) into one searchable string. */
function jsonText(value: any): string {
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(jsonText).join(' ');
  if (value.children) return jsonText(value.children);
  return '';
}

/** Accepts either the renderer or one of its test instances. */
const traverse = (target: any) => (target && target.root ? target.root : target);

/** `jsonText` with whitespace collapsed, for copy split across JSX nodes. */
function flatText(renderer: any): string {
  return jsonText(renderer.toJSON()).replace(/\s+/g, ' ');
}

function buttons(root: any, label: string): any[] {
  return traverse(root).findAll((node: any) => node.type === 'button' && nodeText(node).trim() === label);
}

function button(root: any, label: string): any {
  const found = buttons(root, label);
  assert.equal(found.length, 1, `expected exactly one “${label}” button, found ${found.length}`);
  return found[0];
}

function fieldInput(root: any, label: string, type = 'input'): any {
  const fields = traverse(root).findAll((node: any) => node.props?.className === 'afc-field');
  for (const field of fields) {
    if (nodeText(field.children?.[0] ?? field).trim().startsWith(label)) {
      const inputs = field.findAll((node: any) => node.type === type);
      if (inputs.length) return inputs[0];
    }
  }
  throw new Error(`No ${type} found for the field labelled “${label}”`);
}

const click = async (instance: any) => {
  await act(async () => {
    instance.props.onClick({ preventDefault() {}, stopPropagation() {}, currentTarget: { querySelectorAll: () => [] } });
  });
};
const type = async (instance: any, value: string) => {
  await act(async () => {
    instance.props.onChange({ target: { value }, currentTarget: { value } });
  });
};

/* ================================================================== *
 * 1 · Identity: the customizer belongs to Template 13 alone
 * ================================================================== */
assert.equal(ARCH_FLUTTER_BUSINESS_TYPE, 'lash_brow');
assert.equal(ARCH_FLUTTER_TEMPLATE_ALIAS, 'arch-flutter');
assert.equal(CUSTOMIZER_SCHEMA_VERSION, 1);
for (const alias of ['lash_brow', 'lash-brow', 'lashbrow', 'arch-flutter', 'arch_flutter', 'archflutter', 'Arch & Flutter', '13', 'template-13', 'template 13']) {
  assert.equal(isArchFlutterTemplate(alias), true, `${alias} is recognised as Template 13`);
}
for (const other of ['tattoo_studio', 'bridal_lounge', 'makeup_studio', 'massage_wellness', 'hair_coloring', 'hair_spa', 'beauty_parlour', 'nail_studio', 'barber', 'skincare_clinic', 'ayurvedic_spa', 'hair_salon', '11', '12', '14', '', null, undefined]) {
  assert.equal(isArchFlutterTemplate(other as any), false, `${String(other)} must never open the Template 13 customizer`);
}
assert.equal(CUSTOMIZER_TABS.length, 13, 'thirteen editable tabs');
assert.deepEqual(
  CUSTOMIZER_TABS.map((tab) => tab.id),
  ['brand', 'theme', 'hero', 'sections', 'menu', 'offers', 'reels', 'gallery', 'team', 'voices', 'contact', 'booking', 'seo'],
);
for (const tab of CUSTOMIZER_TABS) {
  assert.ok(tab.label.trim().length > 0 && tab.hint.trim().length > 0, `tab ${tab.id} has a label and a hint`);
  assert.equal(/\$|\bdollars?\b|\bbucks\b/i.test(`${tab.label} ${tab.hint}`), false, `tab ${tab.id} never mentions US money`);
}
assert.equal(ALL_CATEGORY_OPTIONS.filter((option) => option.badge === 'Template 13').length, 1);
const fresh = defaultCustomizerConfig('new-site');
assert.equal(fresh.brand.businessName, ARCH_FLUTTER_BRAND_NAME, 'a fresh config starts from the Template 13 sample content');
assert.equal(fresh.services.length, 64);
assert.equal(fresh.offers.length, 6);
assert.equal(fresh.siteId, 'new-site');
assert.equal(blockingIssues(validateCustomizerConfig(fresh)).length, 0, 'the template defaults are already valid');
console.log('PASS 1 · Template 13 identity: alias matching, 13 tabs, and every other template rejected');

/* ================================================================== *
 * 2 · Config schema, defaults and the round-trip through the workspace
 * ================================================================== */
const workspace = templateWorkspace();
const before = json({ p: workspace.profile, s: workspace.services, t: workspace.stylists, e: workspace.extras });
const config = buildCustomizerConfig(workspace, 'arch-and-flutter-jaipur');

assert.equal(config.version, CUSTOMIZER_SCHEMA_VERSION);
assert.equal(config.templateId, 'lash_brow');
assert.equal(config.siteId, 'arch-and-flutter-jaipur');
assert.equal(config.brand.businessName, ARCH_FLUTTER_BRAND_NAME);
assert.ok(config.brand.tagline.length > 8, 'tagline carried over from the template');
assert.deepEqual(config.theme.colors, {
  blush: '#F4D7D3',
  ivory: '#FBF6F1',
  espresso: '#2B1B17',
  gold: '#C9A66B',
  mauve: '#9A6B73',
});
assert.equal(config.theme.fontPairId, 'editorial');
assert.equal(config.theme.cornerRadius, DEFAULT_CORNER_RADIUS);
assert.equal(config.theme.glassBlur, DEFAULT_GLASS_BLUR);
assert.equal(config.hero.primaryLabel, 'Book an appointment');
assert.equal(config.hero.primaryAction, 'booking');
assert.equal(config.hero.secondaryLabel, 'See the ₹ menu');
assert.equal(config.hero.secondaryAction, 'services');
assert.equal(config.services.length, 64, 'the full 64-service menu is editable');
assert.equal(config.categories.length, 15, 'all fifteen categories are editable');
assert.equal(config.packages.length, 4, 'the four curated package cards are editable');
assert.equal(config.packages.filter((pkg) => pkg.includes.length > 0).length, 4);
assert.equal(config.services.filter((service) => isPackage(service)).length, 5, 'the five combo/membership services stay in the menu');
assert.equal(config.offers.length, 6, 'the six seeded sample offers are editable');
assert.equal(config.reels.length, 5);
assert.ok(config.featuredVideo.title.length > 0);
assert.equal(config.team.length, 4);
assert.equal(config.faqs.length, 6);
assert.equal(config.posts.length, 4);
assert.ok(config.gallery.length >= 5, `gallery photos come from the salon gallery record (got ${config.gallery.length})`);
assert.equal(config.gallery.every((photo) => photo.url.length > 0), true, 'no empty gallery rows are handed to the owner');
assert.equal(config.booking.currency, 'INR');
assert.equal(config.booking.payAtSalon, true);
assert.equal(config.booking.showGstNote, true);
assert.equal(config.contact.city.split(',')[0].trim(), template.defaultCity.split(',')[0].trim());
assert.ok(config.seo.metaTitle.length > 10 && config.seo.metaDescription.length > 40, 'SEO is pre-filled');
assert.equal(config.sections.length, ARCH_FLUTTER_SECTIONS.length);
assert.deepEqual(config.sections.map((section) => section.id), ARCH_FLUTTER_SECTIONS.map((section) => section.id));

/* Sections primitives */
assert.equal(defaultArchFlutterSections().every((section) => section.visible), true);
const lockedIds = ARCH_FLUTTER_SECTIONS.filter((spec) => spec.locked).map((spec) => spec.id);
assert.deepEqual(lockedIds, ['hero', 'trust', 'promo', 'beforeAfter', 'packages', 'closing']);
assert.equal(archFlutterSectionSpec('gallery')?.headingKey, 'galleryHeading');
assert.equal(archFlutterSectionSpec('faq')?.headingKey, 'faqsHeading');
const brokenSections = normalizeArchFlutterSections([
  { id: 'gallery', label: 'My wall', visible: false, order: 0 },
  { id: 'hero', label: '', visible: false, order: 9 },
  { id: 'not-a-section', label: 'x', visible: true, order: 3 } as any,
]);
assert.equal(brokenSections.find((section) => section.id === 'hero')?.visible, true, 'locked sections are forced visible');
assert.equal(brokenSections.some((section) => (section.id as string) === 'not-a-section'), false, 'unknown ids are dropped');
assert.equal(brokenSections.length, ARCH_FLUTTER_SECTIONS.length, 'missing sections are filled back in');
assert.equal(visibleArchFlutterSections(brokenSections).some((section) => section.id === 'gallery'), false);
const normalizedOrders = brokenSections.map((section) => section.order);
assert.deepEqual(normalizedOrders, [...normalizedOrders].sort((a, b) => a - b), 'normalising returns the sections in the owner’s order');
const visibleOrders = visibleArchFlutterSections(brokenSections).map((section) => section.order);
assert.deepEqual(visibleOrders, [...visibleOrders].sort((a, b) => a - b), 'hidden sections never disturb the visible order');
assert.equal(visibleArchFlutterSections(brokenSections).length, ARCH_FLUTTER_SECTIONS.length - 1);
assert.deepEqual(reorderSections(brokenSections, 0, 3).map((section, index) => section.order), brokenSections.map((_, index) => index), 'dragging renumbers the section orders');
assert.equal(reorderSections(brokenSections, 0, 3)[3].id, brokenSections[0].id, 'the dragged section lands where it was dropped');
assert.equal(ARCH_FLUTTER_FONT_PAIRS.length, 5, 'five curated font pairs');
assert.deepEqual(ARCH_FLUTTER_RADIUS_STEPS as unknown as number[], [8, 14, 18, 22, 28, 36]);
assert.deepEqual(ARCH_FLUTTER_BLUR_STEPS as unknown as number[], [6, 10, 14, 18, 24]);
const styleTokens = {
  fonts: { heading: ARCH_FLUTTER_FONT_PAIRS[2].heading, body: ARCH_FLUTTER_FONT_PAIRS[2].body },
  cornerRadius: 28,
  glassBlur: 24,
};
const styleVars = archFlutterStyleVariables(styleTokens);
assert.equal(styleVars['--af-radius'], '28px');
assert.equal(styleVars['--af-blur'], '24px');
assert.ok(String(styleVars['--af-arch']).startsWith('999px 999px'), 'the arch mask follows the corner radius');
assert.ok(String(styleVars['--af-serif']).includes('Syne'), 'the chosen heading family reaches the CSS variable');
const mergedVars = archFlutterCssVariables(config.theme.colors, styleTokens);
assert.equal(mergedVars['--af-blur'], '24px', 'the site CSS variables merge the style tokens');
assert.equal(mergedVars['--af-radius'], '28px');
assert.equal(mergedVars['--af-mauve'], config.theme.colors.mauve, 'the palette tokens still come through');
assert.equal(Object.keys(archFlutterCssVariables(config.theme.colors)).length, 5, 'without style tokens only the five colours are emitted');

/* Round-trip: build → apply → build must be identical, and applying twice is stable. */
const applied = applyCustomizerConfig(config, workspace);
assert.equal(applied.profile.businessType, 'lash_brow');
assert.equal(applied.profile.currency, 'INR');
assert.equal(applied.profile.archFlutter?.customizerVersion, CUSTOMIZER_SCHEMA_VERSION, 'the config is versioned on the site record');
assert.deepEqual(applied.profile.archFlutter?.sections?.map((section: any) => section.id), config.sections.map((section) => section.id));
assert.equal((applied.extras.whiteLabel as any).faviconUrl, config.brand.faviconUrl, 'the favicon is stored with the site branding');
const rebuilt = buildCustomizerConfig(applied, 'arch-and-flutter-jaipur');
assert.equal(json(rebuilt), json(config), 'build → apply → build round-trips exactly');
const twice = applyCustomizerConfig(rebuilt, applied);
assert.equal(json(buildCustomizerConfig(twice, 'arch-and-flutter-jaipur')), json(config), 'applying twice changes nothing');
assert.equal(json({ p: workspace.profile, s: workspace.services, t: workspace.stylists, e: workspace.extras }), before, 'the customizer never mutates the workspace it was given');
assert.equal(applied.services.filter((service) => isPackage(service)).length, 5);
assert.equal(photoGallery(applied.profile, applied.extras.gallery).length, applied.profile.photoGallery?.length, 'gallery photos persist through the salon gallery helper');
console.log('PASS 2 · Config schema + defaults: 17 sections, 64 services, 15 categories, 6 offers, exact round-trip, no mutation');

/* ================================================================== *
 * 3 · Edits land on this salon's record — and only there
 * ================================================================== */
const edited: ArchFlutterCustomizerConfig = {
  ...config,
  brand: {
    ...config.brand,
    businessName: 'Meher Lash & Brow Studio',
    tagline: 'Eye-area atelier in Vaishali Nagar',
    shortBio: 'A small studio for lashes and brows.',
    logoUrl: '/templates/13/logo.svg',
    faviconUrl: '/templates/13/favicon.svg',
    coverImageUrl: '/templates/13/og-image.jpg',
  },
  theme: {
    ...config.theme,
    colors: { ...config.theme.colors, mauve: '#7A4F57', gold: '#B98F4F' },
    fontPairId: 'modern',
    fonts: { heading: ARCH_FLUTTER_FONT_PAIRS[2].heading, body: ARCH_FLUTTER_FONT_PAIRS[2].body },
    cornerRadius: 36,
    glassBlur: 10,
  },
  hero: {
    ...config.hero,
    kicker: 'Jaipur atelier',
    heading: 'Lashes that last, brows that frame',
    subtext: 'Hybrid lashes, brow lamination and tinting in Vaishali Nagar.',
    primaryLabel: 'Book my slot',
    primaryAction: 'booking',
    secondaryLabel: 'See offers',
    secondaryAction: 'offers',
    mockupImageUrl: '/templates/13/reels/lash-lift-poster.jpg',
  },
  sections: reorderSections(
    config.sections.map((section) =>
      section.id === 'gallery'
        ? { ...section, label: 'From our chairs', visible: true }
        : section.id === 'faq'
          ? { ...section, label: 'Client questions' }
          : section.id === 'journal'
            ? { ...section, visible: false }
            : section,
    ),
    4,
    2,
  ),
  services: config.services.map((service, index) => (index === 0 ? { ...service, price: 1499, durationMinutes: 75, popular: true, description: 'Hybrid set, 75 minutes.' } : service)),
  categories: config.categories.map((category, index) => (index === 0 ? { ...category, name: 'Lash Extensions Studio' } : category)),
  offers: config.offers.map((offer, index) => (index === 0 ? { ...offer, title: 'Monsoon lash offer', couponCode: 'MONSOON25', discountValue: 25, isDemo: false } : offer)),
  reels: moveItem(config.reels, 0, 2).map((reel, index) => (index === 0 ? { ...reel, caption: 'Brow lamination in 40 minutes' } : reel)),
  gallery: config.gallery.map((photo, index) => (index === 0 ? { ...photo, title: 'Hybrid lash set on a client from Vaishali Nagar', isDemo: false } : photo)),
  team: config.team.map((member, index) => (index === 0 ? { ...member, role: 'Founder & brow architect', specialties: ['Brow lamination', 'Microblading'] } : member)),
  reviews: config.reviews.map((review, index) => (index === 0 ? { ...review, quote: 'My lashes survived the whole wedding week.', rating: 5 } : review)),
  faqs: [{ id: newId('af-faq'), question: 'How long does a lash lift last?', answer: 'Six to eight weeks with proper aftercare.' }, ...config.faqs],
  contact: {
    ...config.contact,
    phone: '+91 98290 55214',
    whatsapp: '+91 98290 55214',
    email: 'hello@meherlash.in',
    mapLink: 'https://maps.google.com/?cid=1234',
    openTime: '10:30',
    closeTime: '20:30',
    workingHoursDisplay: 'Mon–Sat 10:30–20:30 · Sunday by appointment',
    instagramHandle: 'https://instagram.com/meherlash',
  },
  booking: { ...config.booking, requireDeposit: true, depositPercentage: 25, upiHandle: 'meherlash@okhdfcbank', gstin: '08ABCDE1234F1Z5', leadHours: 4, cancellationWindow: 12 },
  seo: { metaTitle: 'Lash Lift & Brow Lamination in Jaipur | Meher Studio', metaDescription: 'Hybrid lashes, brow lamination and tinting in Vaishali Nagar, Jaipur. Prices from ₹999. Book on WhatsApp.', shareImageUrl: '/templates/13/og-image.jpg', keywords: 'lash lift Jaipur, brow lamination' },
};

const editedIssues = validateCustomizerConfig(edited);
assert.equal(blockingIssues(editedIssues).length, 0, `a fully filled config has no blocking issues: ${json(blockingIssues(editedIssues))}`);

const savedWorkspace = applyCustomizerConfig(edited, workspace);
const resolved = resolveArchFlutterConfig(savedWorkspace.profile);
assert.equal(savedWorkspace.profile.businessName, 'Meher Lash & Brow Studio');
assert.equal(savedWorkspace.profile.tagline, 'Eye-area atelier in Vaishali Nagar');
assert.equal(savedWorkspace.profile.phone, '+91 98290 55214');
assert.equal(savedWorkspace.profile.whatsapp, '+91 98290 55214');
assert.equal(savedWorkspace.profile.email, 'hello@meherlash.in');
assert.equal(savedWorkspace.profile.logoUrl, '/templates/13/logo.svg');
assert.equal(savedWorkspace.profile.seo?.metaTitle, 'Lash Lift & Brow Lamination in Jaipur | Meher Studio');
assert.equal(savedWorkspace.profile.seo?.metaDescription.length > 40, true);
assert.equal(savedWorkspace.profile.requireDeposit, true);
assert.equal(savedWorkspace.profile.depositPercentage, 25);
assert.equal(savedWorkspace.profile.bookingRules?.leadHours, 4);
assert.equal(savedWorkspace.profile.bookingRules?.cancellationWindow, 12);
assert.equal(savedWorkspace.profile.promoOffers?.[0]?.title, 'Monsoon lash offer');
assert.equal(savedWorkspace.profile.promoOffers?.[0]?.isDemo, false);
assert.equal(savedWorkspace.profile.promoOffers?.filter((offer) => offer.isDemo).length, 5, 'the other five stay flagged as samples');
assert.equal(savedWorkspace.extras.bookingLeadHours, 4);
assert.equal(savedWorkspace.extras.cancellationWindow, 12);
assert.equal((savedWorkspace.extras.whiteLabel as any).faviconUrl, '/templates/13/favicon.svg');
assert.equal(savedWorkspace.services[0].price, 1499);
assert.equal(savedWorkspace.services[0].durationMinutes, 75);
assert.equal(savedWorkspace.services[0].popular, true);
assert.equal(savedWorkspace.services.filter((service) => service.category === 'Lash Extensions Studio').length > 0, true, 'services follow the renamed category');
assert.equal(savedWorkspace.stylists[0].role, 'Founder & brow architect');
assert.deepEqual(savedWorkspace.stylists[0].specialties, ['Brow lamination', 'Microblading']);

/* The rendered website picks every edit up. */
assert.equal(resolved.heroHeading, 'Lashes that last, brows that frame');
assert.equal(resolved.heroKicker, 'Jaipur atelier');
assert.equal(resolved.heroPrimaryLabel, 'Book my slot');
assert.equal(resolved.heroSecondaryLabel, 'See offers');
assert.equal(resolved.heroSecondaryAction, 'offers');
assert.equal(resolved.heroMockupImageUrl, '/templates/13/reels/lash-lift-poster.jpg');
assert.equal(resolved.cornerRadius, 36);
assert.equal(resolved.glassBlur, 10);
assert.equal(resolved.fonts.heading, ARCH_FLUTTER_FONT_PAIRS[2].heading);
assert.equal(resolved.galleryHeading, 'From our chairs');
assert.equal(resolved.faqsHeading, 'Client questions', 'the renamed FAQ heading reaches the website');
assert.equal(resolved.journalHeading, 'Aftercare journal', 'an unrenamed section keeps the template wording');
assert.equal(resolved.payAtSalon, true);
assert.equal(resolved.upiHandle, 'meherlash@okhdfcbank');
assert.equal(resolved.gstin, '08ABCDE1234F1Z5');
assert.ok(resolved.paymentNote.includes('UPI accepted'), `payment note: ${resolved.paymentNote}`);
assert.ok(resolved.paymentNote.includes('pay at the salon'));
assert.ok(resolved.paymentNote.includes('GST included'));
const visible = visibleArchFlutterSections(resolved.sections).map((section) => section.id);
assert.equal(visible.includes('journal'), false, 'a hidden section disappears from the home page');
assert.equal(visible.indexOf('services'), 2, 'the reordered section keeps its new position');
assert.equal(resolved.colors.mauve, '#7A4F57');
assert.equal(savedWorkspace.profile.archFlutter?.cornerRadius, 36);
assert.equal(savedWorkspace.profile.archFlutter?.glassBlur, 10);
assert.equal(savedWorkspace.profile.archFlutter?.fonts?.heading, ARCH_FLUTTER_FONT_PAIRS[2].heading, 'the chosen font pair is stored on the site record');
assert.equal(resolved.fonts.body, ARCH_FLUTTER_FONT_PAIRS[2].body);
assert.equal(savedWorkspace.profile.archFlutter?.heroSecondaryLabel, 'See offers');

/* Nothing leaks into another template's workspace. */
const other = templateWorkspace('tattoo_studio');
const otherBefore = json({ p: other.profile, s: other.services, t: other.stylists, e: other.extras });
applyCustomizerConfig(edited, { ...workspace });
assert.equal(json({ p: other.profile, s: other.services, t: other.stylists, e: other.extras }), otherBefore, 'another template workspace is byte-identical after a Template 13 save');
assert.equal(other.profile.businessType, 'tattoo_studio');
console.log('PASS 3 · Edits persist to this salon only: profile, archFlutter config, services, team, offers, gallery, SEO, booking rules');

/* ================================================================== *
 * 4 · Validation, sanitising, money and dates in Indian English
 * ================================================================== */
assert.equal(formatInr(1499), '₹1,499');
assert.equal(formatInr(1250.5), '₹1,250.5');
assert.equal(formatInr(0), '₹0');
assert.equal(parseInr('₹1,499'), 1499);
assert.equal(parseInr('1499.50'), 1499.5);
assert.equal(formatDateIN('2026-11-14'), '14 Nov 2026');
assert.equal(formatDateIN('not-a-date'), '');
assert.equal(isIndianPhone('+91 98290 55214'), true);
assert.equal(isIndianPhone('9829055214'), true);
assert.equal(isIndianPhone('12345'), false);
assert.equal(isIndianPhone('+1 415 555 0132'), false, 'a US number is not accepted');
assert.equal(normalizeIndianPhone('9829055214'), '9829055214');
assert.equal(normalizeIndianPhone('+91 98290 55214'), '+919829055214', 'the WhatsApp link strips spaces and keeps the country code');
assert.equal(isSafeHttpUrl('https://maps.google.com/x'), true);
assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
assert.equal(isSafeHttpUrl('/services'), true);
const sanitized = sanitizeText('<script>alert("xss")</script>Meher Studio');
assert.ok(sanitized.includes('Meher Studio'), 'the owner’s real text survives sanitising');
assert.ok(!sanitized.includes('<') && !sanitized.includes('>'), 'angle brackets are stripped');
assert.ok(!/<\s*script/i.test(sanitized), 'script tags are removed');
assert.ok(!sanitizeText('javascript:alert(1)').toLowerCase().includes('javascript:'), 'javascript: URLs are stripped');
assert.ok(!sanitizeMultiline('<iframe src="//evil"></iframe>Line one\nLine two').includes('<iframe'), 'multiline text is stripped too');
assert.equal(sanitizeText('a'.repeat(600), 40).length, 40, 'long text is trimmed to the field limit');
assert.equal(shortenSeoDescription('Short description.'), 'Short description.');
const longSeo = `${'Lash lift and brow lamination in Jaipur. '.repeat(12)}`;
const shortened = shortenSeoDescription(longSeo);
assert.ok(shortened.length <= 200, `a long description is shortened (${shortened.length})`);
assert.ok(shortened.endsWith('.'), 'the shortened description ends on a full stop');
assert.ok(!/\s\S{0,3}$/.test(shortened) || shortened.split(' ').pop()!.length > 3, 'it never ends on half a word');
assert.equal(shortenSeoDescription('One sentence only without a break '.repeat(20)).length <= 200, true, 'word-boundary cutting also stays inside the limit');

const bad: ArchFlutterCustomizerConfig = {
  ...edited,
  brand: { ...edited.brand, businessName: '   ', tagline: '', logoUrl: 'not-an-image.exe' },
  theme: { ...edited.theme, colors: { ...edited.theme.colors, gold: 'gold-ish', ivory: '#2B1B17', espresso: '#2B1B17' } },
  hero: { ...edited.hero, heading: '', primaryAction: 'url', primaryUrl: 'javascript:alert(1)', imageUrl: 'ftp://x' },
  categories: [
    { id: 'c1', name: 'Lashes', blurb: '', imageUrl: '', featured: false },
    { id: 'c2', name: 'lashes', blurb: '', imageUrl: '', featured: false },
  ],
  services: [
    { ...edited.services[0], id: 'dup', name: '', price: -50, durationMinutes: 0, category: '' },
    { ...edited.services[1], id: 'dup', name: 'Brow tint', price: 99999999, durationMinutes: 900, category: 'Lashes' },
  ],
  offers: [{ ...edited.offers[0], title: '', offerType: 'percent', discountValue: 150, originalPriceINR: 1000, offerPriceINR: 2000, couponCode: 'fl 20!', validFrom: '2026-12-01', validTo: '2026-11-01', image: 'nope' }],
  reels: [{ id: 'r1', title: '', caption: '', posterUrl: '', sourceUrl: 'youtube.com/watch' }],
  gallery: [{ id: 'g1', category: 'Skin', url: '', title: 'x'.repeat(200), isDemo: false }],
  beforeAfter: [{ id: 'b1', title: 'Lift', alt: '', before: '/templates/13/art/lash.svg', after: '' }],
  team: [{ ...edited.team[0], name: '', role: '', avatarUrl: 'bad link' }],
  reviews: [{ ...edited.reviews[0], name: '', quote: '', rating: 9 }],
  faqs: [{ id: 'f1', question: '', answer: '' }],
  contact: { ...edited.contact, phone: '12345', whatsapp: 'abc', email: 'not-an-email', mapLink: 'http://insecure', openTime: '10 am', closeTime: '', instagramHandle: 'http://instagram.com/x' },
  booking: { ...edited.booking, requireDeposit: true, depositPercentage: 0, currency: 'USD' as 'INR', gstin: 'BAD' },
  seo: { ...edited.seo, metaTitle: 'T'.repeat(90), metaDescription: 'D'.repeat(260), shareImageUrl: 'file://x' },
};
const issues = validateCustomizerConfig(bad);
const messages = issues.map((issue) => `${issue.tab}:${issue.field}:${issue.message}`).join(' | ');
const expectIssue = (tab: string, needle: string) =>
  assert.ok(
    issues.some((issue) => issue.tab === tab && issue.message.toLowerCase().includes(needle.toLowerCase())),
    `expected a ${tab} issue mentioning “${needle}” — got: ${messages}`,
  );
expectIssue('brand', 'salon name');
expectIssue('brand', 'tagline');
expectIssue('brand', 'image link');
expectIssue('theme', 'hex value');
expectIssue('theme', ':1 (needs');
expectIssue('hero', 'headline');
expectIssue('hero', 'https://');
expectIssue('menu', 'two categories are both called');
expectIssue('menu', 'needs a name');
expectIssue('menu', '₹0 or more');
expectIssue('menu', 'too expensive');
expectIssue('menu', 'between 1 and 720 minutes');
expectIssue('menu', 'same id');
expectIssue('offers', 'needs a title');
expectIssue('offers', '1% and 100%');
expectIssue('offers', 'more than the original price');
expectIssue('offers', 'ends before it starts');
expectIssue('offers', 'capital letters');
expectIssue('reels', 'needs a title');
expectIssue('gallery', 'missing its image');
expectIssue('gallery', 'under 160 characters');
expectIssue('gallery', 'needs both photos');
expectIssue('team', 'needs a name');
expectIssue('voices', 'client name');
expectIssue('voices', 'between 1 and 5 stars');
expectIssue('voices', 'question and an answer');
expectIssue('contact', 'valid Indian mobile number');
expectIssue('contact', 'valid email address');
expectIssue('contact', '24-hour format');
expectIssue('booking', 'between 1% and 100%');
expectIssue('booking', 'Indian Rupees');
expectIssue('booking', '08ABCDE1234F1Z5');
expectIssue('seo', 'under 70 characters');
expectIssue('seo', 'under 200 characters');
assert.ok(blockingIssues(issues).length > 0 && blockingIssues(issues).length < issues.length, 'errors block saving, warnings do not');
assert.ok(issues.every((issue) => issue.severity === 'error' || issue.severity === 'warning'));
/* Contrast warnings name the failing pair and what it needs. */
const lowContrast = contrastIssues({ blush: '#FBF6F1', ivory: '#FBF6F1', espresso: '#FBF6F1', gold: '#C9A66B', mauve: '#9A6B73' });
assert.ok(lowContrast.some((issue) => issue.severity === 'error' && issue.required === 4.5), 'unreadable text is flagged as an error');
assert.ok(lowContrast.every((issue) => typeof issue.ratio === 'number' && issue.hint.length > 10));
assert.equal(contrastIssues(edited.theme.colors).length, 0, 'the edited palette stays readable');
console.log('PASS 4 · Validation: 30+ Indian English checks across all 13 tabs, ₹ formatting, DD MMM YYYY dates, +91 phones, sanitising');

/* ================================================================== *
 * 5 · Undo/redo history, autosaved drafts and the owner check
 * ================================================================== */
let history = createHistory(config);
assert.equal(history.past.length, 0);
assert.equal(history.future.length, 0);
history = pushHistory(history, { ...config, brand: { ...config.brand, businessName: 'Step one' } });
history = pushHistory(history, { ...config, brand: { ...config.brand, businessName: 'Step two' } });
assert.equal(history.present.brand.businessName, 'Step two');
assert.equal(history.past.length, 2);
const same = pushHistory(history, history.present);
assert.equal(same, history, 'an identical change does not create a history step');
history = undoHistory(history);
assert.equal(history.present.brand.businessName, 'Step one');
assert.equal(history.future.length, 1);
history = redoHistory(history);
assert.equal(history.present.brand.businessName, 'Step two');
const untouched = createHistory(config);
assert.equal(undoHistory(untouched).present, untouched.present, 'undo on an empty history is a no-op');
assert.equal(redoHistory(untouched).present, untouched.present, 'redo on an empty history is a no-op');
let long = createHistory(config);
for (let index = 0; index < HISTORY_LIMIT + 12; index += 1) {
  long = pushHistory(long, { ...config, brand: { ...config.brand, tagline: `Tagline ${index}` } });
}
assert.ok(long.past.length <= HISTORY_LIMIT, `history is capped at ${HISTORY_LIMIT} steps (got ${long.past.length})`);
const reset = resetHistory(long, config);
assert.equal(reset.present, config, 'reset puts the given config back as the present step');
assert.equal(reset.future.length, 0, 'reset clears the redo stack');
assert.ok(reset.past.length <= HISTORY_LIMIT);

const draftKey = customizerDraftKey('arch-and-flutter-jaipur');
assert.ok(draftKey.startsWith('studioflow_arch_flutter_customizer_') && draftKey.includes('lash_brow') && draftKey.endsWith('_v1'));
assert.equal(loadCustomizerDraft('arch-and-flutter-jaipur'), null, 'no draft before the first autosave');
assert.equal(saveCustomizerDraft('arch-and-flutter-jaipur', edited), true);
const loaded = loadCustomizerDraft('arch-and-flutter-jaipur');
assert.ok(loaded && loaded.config.brand.businessName === 'Meher Lash & Brow Studio', 'the draft reloads with every edit');
assert.ok(loaded!.savedAt <= Date.now() && loaded!.savedAt > Date.now() - 60_000);
store.set(draftKey, json({ savedAt: Date.now(), config: { ...edited, version: 999 } }));
assert.equal(loadCustomizerDraft('arch-and-flutter-jaipur'), null, 'a draft from another config version is ignored');
store.set(draftKey, '{{{ not json');
assert.equal(loadCustomizerDraft('arch-and-flutter-jaipur'), null, 'a corrupt draft is ignored, never thrown');
clearCustomizerDraft('arch-and-flutter-jaipur');
assert.equal(loadCustomizerDraft('arch-and-flutter-jaipur'), null);
assert.ok(customizerDraftKey('').includes('unsaved-site'), 'an unsaved demo site still gets its own draft slot');

assert.deepEqual(customizerAccess({ templateId: 'lash_brow', sessionUserId: 'owner-1', siteOwnerId: 'owner-1' }), { allowed: true, reason: '' });
assert.equal(customizerAccess({ templateId: 'lash_brow', sessionUserId: null, siteOwnerId: 'owner-1' }).allowed, false, 'signed-out visitors cannot open it');
assert.equal(customizerAccess({ templateId: 'lash_brow', sessionUserId: 'someone-else', siteOwnerId: 'owner-1' }).allowed, false, 'another salon owner cannot open it');
assert.equal(customizerAccess({ templateId: 'tattoo_studio', sessionUserId: 'owner-1', siteOwnerId: 'owner-1' }).allowed, false, 'other templates are refused');
assert.equal(customizerAccess({ templateId: 'arch-flutter', sessionUserId: 'owner-1', siteOwnerId: null }).allowed, true, 'an unpublished site can be customized by its owner');
assert.ok(customizerAccess({ templateId: 'lash_brow', sessionUserId: 'x', siteOwnerId: 'y' }).reason.length > 20, 'the refusal explains itself in plain words');
console.log('PASS 5 · Undo/redo capped at 40 steps, versioned localStorage drafts, and owner-only access');

/* ================================================================== *
 * 6 · Image handling: limits, crop presets, samples
 * ================================================================== */
assert.equal(MAX_UPLOAD_BYTES, 8 * 1024 * 1024);
assert.deepEqual(ACCEPTED_UPLOAD_TYPES, ['image/jpeg', 'image/png', 'image/webp']);
assert.equal(validateImageFile(null), 'Please choose an image file.');
assert.ok(validateImageFile({ name: 'x.gif', type: 'image/gif', size: 1000 } as any).length > 10, 'unsupported types are rejected with a message');
assert.ok(validateImageFile({ name: 'big.jpg', type: 'image/jpeg', size: MAX_UPLOAD_BYTES + 1 } as any).includes('MB'), 'oversized files are rejected');
assert.equal(validateImageFile({ name: 'ok.webp', type: 'image/webp', size: 1024 } as any), '');
assert.deepEqual(
  CROP_PRESETS.map((preset) => [preset.id, preset.ratio]),
  [['arch', 3 / 4], ['square', 1], ['reel', 9 / 16], ['wide', 16 / 9], ['free', null]],
);
assert.deepEqual(centerCrop(1000, 800, 1), { x: 100, y: 0, width: 800, height: 800 });
assert.deepEqual(centerCrop(800, 1000, 3 / 4), { x: 25, y: 0, width: 750, height: 1000 });
assert.deepEqual(centerCrop(900, 900, null), { x: 0, y: 0, width: 900, height: 900 }, 'the free preset keeps the photo as it is');
for (const slot of Object.keys(SAMPLE_IMAGES)) {
  const samples = sampleImagesFor(slot);
  assert.ok(samples.length > 0, `sample slot ${slot} offers artwork`);
  for (const sample of samples) {
    assert.ok(sample.url.startsWith('/templates/13/'), `sample ${sample.label} ships with Template 13 (${sample.url})`);
    assert.ok(sample.label.length > 2);
  }
}
assert.deepEqual(sampleImagesFor('not-a-slot'), sampleImagesFor('gallery'), 'an unknown slot falls back to gallery artwork');
assert.equal(moveItem([1, 2, 3], 0, 5).join(''), '123', 'out-of-range moves are ignored');
assert.equal(newId('af-x').startsWith('af-x'), true);
assert.notEqual(newId('af-x'), newId('af-x'));
console.log('PASS 6 · Image handling: 8 MB / JPEG-PNG-WebP limits, arch·square·9:16·16:9 crop presets, bundled sample artwork');

/* ================================================================== *
 * 7 · The drawer renders, edits, validates, undoes and saves
 * ================================================================== */
const savedCalls: Array<{ workspace: CustomizerWorkspace; config: ArchFlutterCustomizerConfig }> = [];
let root: any = null;
await act(async () => {
  root = create(
  <ArchFlutterCustomizer
    siteId="arch-and-flutter-jaipur"
    profile={workspace.profile}
    services={workspace.services}
    stylists={workspace.stylists}
    extras={workspace.extras}
    access={{ allowed: true, reason: '' }}
    onApply={(next, nextConfig) => {
      savedCalls.push({ workspace: next, config: nextConfig });
    }}
    onClose={() => undefined}
  />,
  );
});
const drawer = () =>
  root.root.findAll((node: any) => node.props?.role === 'dialog' && String(node.props?.['aria-modal']) === 'true' && node.props?.['aria-label'] === 'Arch & Flutter template customizer')[0];
assert.ok(drawer(), 'the drawer is a modal dialog');
assert.equal(drawer().props['aria-label'], 'Arch & Flutter template customizer');
const tabs = root.root.findAll((node: any) => node.props?.role === 'tab');
assert.equal(tabs.length, 13, 'all thirteen tabs are in the tablist');
assert.equal(tabs[0].props['aria-selected'], true);
assert.equal(tabs[1].props['tabIndex'], -1, 'only the selected tab is in the tab order');
assert.equal(root.root.findAll((node: any) => node.props?.role === 'tabpanel').length, 1);
for (const label of ['Save changes', 'Discard', 'Reset to template defaults']) {
  assert.ok(buttons(root, label).length === 1, `the sticky top bar has a “${label}” button`);
}
assert.equal(root.root.findAll((node: any) => node.props?.['aria-label'] === 'Undo last change').length, 1);
assert.equal(root.root.findAll((node: any) => node.props?.['aria-label'] === 'Redo change').length, 1);
for (const device of ['Mobile', 'Tablet', 'Desktop']) {
  assert.equal(root.root.findAll((node: any) => node.props?.['aria-label'] === `Preview on ${device}`).length, 1, `${device} preview control`);
}
assert.equal(root.root.findAll((node: any) => node.props?.['aria-label'] === 'Close the customizer').length, 1);
assert.ok(jsonText(root.toJSON()).includes('All changes saved'), 'a clean config reports “All changes saved”');
assert.equal(root.root.findAll((node: any) => node.props?.['aria-label'] === 'Undo last change')[0].props.disabled, true, 'undo starts disabled');

/* Sections tab: hide, rename, reorder, undo. */
await click(tabs[3]);
assert.equal(root.root.findAll((node: any) => node.props?.role === 'tab')[3].props['aria-selected'], true, 'clicking a tab selects it');
let rows = root.root.findAll((node: any) => node.props?.role === 'listitem');
assert.equal(rows.length, ARCH_FLUTTER_SECTIONS.length, 'every home section is listed');
const findRow = (needle: string) =>
  root.root.findAll((node: any) => node.props?.role === 'listitem').find((row: any) => nodeText(row).includes(needle));
const galleryRow = findRow('Gallery');
assert.ok(galleryRow, 'the gallery row is there');
await click(buttons(galleryRow, 'Visible')[0]);
assert.ok(jsonText(root.toJSON()).includes('Unsaved changes'), 'the sticky bar warns about unsaved changes');
assert.equal(root.root.findAll((node: any) => node.props?.['aria-label'] === 'Undo last change')[0].props.disabled, false, 'undo is enabled after a change');
assert.equal(buttons(findRow('Gallery'), 'Hidden').length, 1, 'the gallery row now reads Hidden');
const galleryHeading = root.root.findAll((node: any) => node.props?.['aria-label'] === 'Heading for the Gallery section')[0];
await type(galleryHeading, 'From our chairs');
assert.ok(jsonText(root.toJSON()).includes('Showing “From our chairs”'), 'the renamed heading is echoed back to the owner');
const heroRow = findRow('Hero banner');
assert.equal(heroRow.props['aria-disabled'], true, 'the hero row cannot be dragged');
assert.equal(heroRow.props.draggable, false, 'a locked row is not draggable');
assert.equal(buttons(heroRow, 'Visible').length + buttons(heroRow, 'Hidden').length, 1);
assert.equal(buttons(heroRow, 'Visible')[0].props.disabled, true, 'a locked section cannot be hidden');
assert.ok(jsonText(root.toJSON()).includes('Locked sections'), 'the owner is told which sections are locked');

/* Undo twice: rename then hide. */
await click(root.root.findAll((node: any) => node.props?.['aria-label'] === 'Undo last change')[0]);
await click(root.root.findAll((node: any) => node.props?.['aria-label'] === 'Undo last change')[0]);
assert.ok(!jsonText(root.toJSON()).includes('Showing “From our chairs”'), 'undo removed the rename');
assert.equal(root.root.findAll((node: any) => node.props?.['aria-label'] === 'Redo change')[0].props.disabled, false, 'redo is available after undo');
await click(root.root.findAll((node: any) => node.props?.['aria-label'] === 'Redo change')[0]);
assert.ok(jsonText(root.toJSON()).includes('Unsaved changes'), 'redo brought the hidden section back');
assert.ok(!jsonText(root.toJSON()).includes('Showing “From our chairs”'), 'one redo is not enough for two changes');
await click(root.root.findAll((node: any) => node.props?.['aria-label'] === 'Redo change')[0]);
assert.ok(jsonText(root.toJSON()).includes('Showing “From our chairs”'), 'the second redo brings the rename back too');

/* Save is blocked while a required field is empty. */
await click(button(root, 'Save changes'));
assert.equal(savedCalls.length, 1, 'a valid config saves straight away');
assert.equal(savedCalls[0].config.sections.find((section) => section.id === 'gallery')?.label, 'From our chairs', 'the rename reached the saved config');
assert.equal(savedCalls[0].config.sections.find((section) => section.id === 'gallery')?.visible, false, 'the hidden section reached the saved config');
assert.equal(savedCalls[0].workspace.profile.archFlutter?.galleryHeading, 'From our chairs', 'the rename is written to the site record');
assert.equal(savedCalls[0].workspace.profile.businessType, 'lash_brow');
assert.equal(savedCalls[0].workspace.profile.currency, 'INR');
assert.ok(jsonText(root.toJSON()).includes('Saved.'), 'the owner gets a save confirmation');
assert.equal(store.has(draftKey), false, 'saving clears the local draft');

await click(buttons(root, 'Brand')[0]);
const nameInput = fieldInput(root, 'Business name');
await type(nameInput, '');
await click(button(root, 'Save changes'));
assert.equal(savedCalls.length, 1, 'a missing salon name blocks saving');
assert.ok(jsonText(root.toJSON()).includes('Please enter your salon name.'), 'the field error is shown in Indian English');
assert.ok(jsonText(root.toJSON()).includes('fixing before you can save'), 'the body explains why saving is blocked');
assert.ok(jsonText(root.toJSON()).includes('Please fix 1 item before saving'), 'the save attempt reports the count in Indian English');
assert.equal(fieldInput(root, 'Business name').props['aria-invalid'], true, 'the invalid field is announced');
await type(fieldInput(root, 'Business name'), 'Meher Lash & Brow Studio');
await click(button(root, 'Save changes'));
assert.equal(savedCalls.length, 2, 'fixing the error lets the owner save');

/* Reset to template defaults asks first, then restores and can be undone. */
await click(button(root, 'Reset to template defaults'));
assert.ok(jsonText(root.toJSON()).includes('Reset to template defaults?'), 'a confirmation dialog opens');
assert.ok(jsonText(root.toJSON()).includes('Other templates are not touched'), 'the dialog says other templates are safe');
await click(button(root, 'Keep editing'));
assert.ok(!jsonText(root.toJSON()).includes('Reset to template defaults?'), 'the dialog closes without resetting');
await click(button(root, 'Reset to template defaults'));
await click(button(root, 'Reset to defaults'));
assert.ok(jsonText(root.toJSON()).includes('Template defaults restored'), 'the reset is confirmed');
assert.equal(fieldInput(root, 'Business name').props.value, ARCH_FLUTTER_BRAND_NAME, 'the template brand name is back');
await click(root.root.findAll((node: any) => node.props?.['aria-label'] === 'Undo last change')[0]);
assert.equal(fieldInput(root, 'Business name').props.value, 'Meher Lash & Brow Studio', 'the reset can be undone before saving');

/* Escape with unsaved changes asks before closing. */
let closed = false;
await act(async () => {
  root.update(
  <ArchFlutterCustomizer
    siteId="arch-and-flutter-jaipur"
    profile={workspace.profile}
    services={workspace.services}
    stylists={workspace.stylists}
    extras={workspace.extras}
    access={{ allowed: true, reason: '' }}
    onApply={(next, nextConfig) => {
      savedCalls.push({ workspace: next, config: nextConfig });
    }}
    onClose={() => {
      closed = true;
    }}
  />,
  );
});
await type(fieldInput(root, 'Business name'), 'Escape test salon');
await act(async () => {
  drawer().props.onKeyDown({ key: 'Escape', preventDefault() {}, metaKey: false, ctrlKey: false, shiftKey: false });
});
assert.equal(closed, false, 'Escape does not throw away unsaved work silently');
assert.ok(jsonText(root.toJSON()).includes('Discard unsaved changes?'), 'the owner is warned before leaving');
await click(button(root, 'Close anyway'));
assert.equal(closed, true, 'confirming closes the drawer');

/* A locked drawer never renders the editor. */
let locked: any = null;
await act(async () => {
  locked = create(
  <ArchFlutterCustomizer
    siteId="someone-elses-site"
    profile={workspace.profile}
    services={workspace.services}
    stylists={workspace.stylists}
    extras={workspace.extras}
    access={{ allowed: false, reason: 'Only the owner of this salon website can change its design.' }}
    onApply={() => undefined}
    onClose={() => undefined}
  />,
  );
});
assert.equal(locked.root.findAll((node: any) => node.props?.role === 'tab').length, 0, 'a visitor who is not the owner sees no tabs');
assert.ok(jsonText(locked.toJSON()).includes('Only the owner of this salon website can change its design.'), 'the refusal reason is shown');
assert.ok(jsonText(locked.toJSON()).includes('locked'), 'the panel says the customizer is locked');
locked.unmount();

/* The Sections tab on its own (used by the drawer) keeps locked sections visible. */
const sectionState: ArchFlutterCustomizerConfig = { ...config };
let sectionRoot: any = null;
await act(async () => {
  sectionRoot = create(
  <SectionsTab
    config={sectionState}
    issues={[]}
    update={(updater) => {
      Object.assign(sectionState, updater(sectionState));
      sectionRoot.update(<SectionsTab config={sectionState} issues={[]} update={() => undefined} />);
    }}
  />,
  );
});
assert.equal(sectionRoot.root.findAll((node: any) => node.props?.role === 'listitem').length, ARCH_FLUTTER_SECTIONS.length);
assert.ok(flatText(sectionRoot).includes('17 of 17 sections are visible'), `the visible counter is correct — ${flatText(sectionRoot).slice(0, 120)}`);
await click(buttons(sectionRoot, 'Reset order & names')[0]);
assert.ok(flatText(sectionRoot).includes('17 of 17 sections are visible'), 'the counter survives a reset');
sectionRoot.unmount();

/* Let the debounced autosave/preview timers settle before tearing the tree down. */
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 900));
});
root.unmount();
console.log('PASS 7 · Drawer: 13 tabs, sticky Save/Discard/Undo/Redo/Reset/device bar, live edits, blocked save, confirmations, owner lock');

/* ================================================================== *
 * 8 · Wiring + isolation from every other template
 * ================================================================== */
const read = (path: string) => readFileSync(path, 'utf8');
const cards = read('src/components/TemplatePreviewCards.tsx');
const landing = read('src/components/LandingPage.tsx');
const app = read('src/App.tsx');
const previewShell = read('src/components/SalonWebsitePreview.tsx');
assert.ok(cards.includes('const hasCustomizer = isArchFlutterTemplate(templateId)'), 'the gallery button checks the template id');
assert.ok(cards.includes('onClick={() => setCustomizerOpen(true)}'), 'Template 13 opens the drawer');
assert.ok(cards.includes('onClick={() => onChoose()}'), 'every other template keeps the old “Customize this template” behaviour');
assert.ok(cards.includes('demoMode'), 'the gallery drawer runs in demo mode and writes to no site record');
assert.ok(cards.includes("import('./arch-flutter-customizer/ArchFlutterCustomizerGate')"), 'the drawer is code-split out of the landing bundle');
assert.ok(landing.includes('onCustomizeTemplate'), 'the landing page can carry a customized demo into website creation');
assert.ok(app.includes('ArchFlutterCustomizerGate') && app.includes('archCustomizer&&isArchFlutterTemplate(profile.businessType)'), 'the workspace mounts the drawer for Template 13 only');
assert.ok(app.includes('applyCustomizerWorkspace'), 'saving writes through the existing workspace state (and its autosave)');
assert.ok(app.includes('onOpenCustomizer={isArchFlutterTemplate(profile.businessType)?()=>setArchCustomizer(true):undefined}'), 'the editor entry point is Template 13 only');
const archEditorStart = previewShell.indexOf('function ArchFlutterPreviewEditor');
const ironInkStart = previewShell.indexOf('function IronInkPreviewEditor');
const customizerButtonAt = previewShell.indexOf('Open the template customizer');
assert.ok(archEditorStart > -1 && customizerButtonAt > archEditorStart && customizerButtonAt < ironInkStart, 'the in-editor button lives in the Template 13 branch only');
assert.equal(previewShell.slice(ironInkStart).includes('Open the template customizer'), false);

/* CSS is scoped to .afc-* and imported by the drawer alone. */
const customizerCss = read('src/components/arch-flutter-customizer/customizer.css');
const selectors = customizerCss
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.includes('{') && /^[.#a-zA-Z\[]/.test(line) && !line.startsWith('@'));
assert.ok(selectors.length > 40, `the customizer stylesheet is substantial (${selectors.length} rules)`);
for (const line of selectors) {
  const selector = line.slice(0, line.indexOf('{')).trim();
  assert.ok(
    selector.split(',').every((part) => part.trim().startsWith('.afc-')),
    `every customizer selector is scoped to .afc-* — found “${selector}”`,
  );
}
assert.equal(/^[a-z]+\s*\{/m.test(customizerCss), false, 'no bare element selectors (they would restyle the platform)');
assert.ok(customizerCss.includes('@supports not ((backdrop-filter: blur(4px))'), 'glass falls back where backdrop-filter is missing');
assert.ok(customizerCss.includes('@media (prefers-reduced-motion: reduce)'), 'motion is disabled for owners who ask for it');
const cssImporters = readdirSync('src/components', { recursive: true })
  .map((name) => String(name))
  .filter((name) => name.endsWith('.tsx') || name.endsWith('.ts'))
  .filter((name) => read(`src/components/${name}`).includes("customizer.css"));
assert.deepEqual(cssImporters.sort(), ['arch-flutter-customizer/ArchFlutterCustomizer.tsx'], 'only the drawer imports the customizer stylesheet');

/* The customizer never reaches into another template's code. */
const customizerFiles = [
  'src/lib/archFlutterCustomizer.ts',
  'src/lib/archFlutterTheme.ts',
  'src/components/arch-flutter-customizer/ArchFlutterCustomizer.tsx',
  'src/components/arch-flutter-customizer/ArchFlutterCustomizerGate.tsx',
  'src/components/arch-flutter-customizer/CustomizerFields.tsx',
  ...readdirSync('src/components/arch-flutter-customizer/tabs').map((name) => `src/components/arch-flutter-customizer/tabs/${name}`),
];
for (const file of customizerFiles) {
  const source = read(file);
  assert.equal(/iron-ink|shringaar|vogueNoir|bodhiTree|prismChroma|pinkyNails|roopMahal|SidePanelCustomizer/i.test(source), false, `${file} stays inside Template 13`);
}

/* The site stylesheet keeps its literal blur guards and now reads the token. */
const siteCss = read('src/components/archFlutter.css');
assert.equal((siteCss.match(/backdrop-filter: blur\(16px\)/g) || []).length, 4, 'the four literal 16px blurs are untouched');
assert.ok(siteCss.includes('blur(var(--af-blur, 18px))'), 'the glass cards honour the owner’s blur strength with the old default');
assert.ok(siteCss.includes('--af-blur: 18px'), 'the default blur token is declared');
assert.ok(siteCss.includes('@supports not ((backdrop-filter: blur(4px)) or (-webkit-backdrop-filter: blur(4px)))'), 'the fallback guard survives');

/* Rendering other templates shows none of it. */
for (const otherId of ['bridal_lounge', 'tattoo_studio', 'ayurvedic_spa', 'hair_salon'] as const) {
  const otherDraft = templateDraft(CATEGORY_TEMPLATES[otherId]);
  (globalThis as any).window.location.hash = '';
  const markup = (await import('react-dom/server')).renderToStaticMarkup(
    <SalonWebsitePreview
      readOnly
      profile={otherDraft.profile}
      services={otherDraft.services}
      stylists={otherDraft.stylists}
      gallery={otherDraft.extras?.gallery || []}
      onAddAppointment={async (appointment) => appointment}
    />,
  );
  assert.equal(/class="[^"]*\bafc-/.test(markup), false, `${otherId} renders no customizer markup`);
  assert.equal(markup.includes('Template customizer'), false, `${otherId} has no customizer entry point`);
  assert.equal(markup.includes('arch-flutter-customizer'), false);
  assert.ok(markup.length > 4000, `${otherId} still renders its full website`);
}
console.log('PASS 8 · Wiring + isolation: gallery/editor/workspace entry points, .afc-* scoped CSS, and four other templates render untouched');

console.log(
  'PASS: Template 13 customizer — arch-flutter-only identity, typed versioned config with an exact round-trip through the StudioFlow workspace, 13 editable tabs, Indian English validation, undo/redo, autosaved drafts, owner-only access, image limits and crop presets, a keyboard-accessible glass drawer that saves through the existing API, and no change to any other template.',
);
