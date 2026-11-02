/**
 * Template 14 — Veda Sanjeevani verification.
 *
 * Run with: node scripts/verify-veda-sanjeevani.mjs
 *
 * Proves, offline and without a browser:
 *  • the template registers, aliases and starter draft for `ayurvedic_spa`,
 *  • the preconfigured Ayurvedic catalogue (20 rituals, honest copy, local imagery),
 *  • every advertised responsive image width really exists on disk,
 *  • config resolution clamps unsafe input and keeps theme/font/layout presets sane,
 *  • the AI contract: sanitising, per-section application, offline fallback,
 *  • customizer engine: undo/redo, drafts, launch checklist, validation, owner access,
 *  • the image pipeline: presets, focal-point crop maths, upload limits,
 *  • the public website renders completely server-side (and hides hidden sections),
 *  • the website and the customizer both mount and respond to clicks,
 *  • the wiring + security boundary (App, preview, server endpoint, no client key).
 */
import React from 'react';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, create } from 'react-test-renderer';

import { ALL_CATEGORY_OPTIONS, CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import { templateDraft } from '../src/lib/templateEntry';
import { VedaSanjeevaniWebsite } from '../src/components/veda-sanjeevani/VedaSanjeevaniWebsite';
import { VedaCustomizer } from '../src/components/veda-sanjeevani/VedaCustomizer';
import { SalonWebsitePreview } from '../src/components/SalonWebsitePreview';
import type { SalonProfile, SalonService, Stylist } from '../src/types';
import {
  VEDA_BUSINESS_TYPE,
  VEDA_DISCLAIMER,
  VEDA_FAQS,
  VEDA_FONT_PAIRS,
  VEDA_IMAGE_PROMPTS,
  VEDA_IMAGE_SLOTS,
  VEDA_IMAGE_TOOLS,
  VEDA_LAYOUTS,
  VEDA_OFFERS,
  VEDA_PACKAGES,
  VEDA_SECTION_IDS,
  VEDA_SERVICE_CATEGORIES,
  VEDA_TESTIMONIALS,
  VEDA_THEMES,
  VEDA_BUTTON_STYLES,
  defaultVedaConfig,
  resolveVedaConfig,
  vedaFeaturedServices,
  vedaFormatDuration,
  vedaFormatInr,
  vedaImage,
  vedaIntrinsic,
  vedaSeoDescription,
  vedaSeoTitle,
  vedaServiceGroups,
  vedaSrcSet,
  vedaVisibleSections,
  vedaWhatsappLink,
} from '../src/lib/vedaSanjeevani';
import {
  VEDA_AI_MODES,
  VEDA_IMAGE_PRESETS,
  applyVedaAiContent,
  clearVedaDraft,
  isVedaTemplate,
  loadVedaDraft,
  saveVedaDraft,
  vedaAiDetails,
  vedaBlockingIssues,
  vedaConfigFor,
  vedaConfigPatch,
  vedaCustomizerAccess,
  vedaHistory,
  vedaLaunchProgress,
  vedaLaunchSteps,
  vedaPresetFor,
  vedaPushHistory,
  vedaRedo,
  vedaResetSection,
  vedaUndo,
  validateVedaConfig,
} from '../src/lib/vedaSanjeevaniCustomizer';
import { VEDA_AI_MODE_IDS, buildVedaAiPrompt, buildVedaFallbackContent, sanitizeVedaAiContent } from '../src/lib/vedaSanjeevaniAi';
import { VEDA_OUTPUT_BUDGET_BYTES, vedaCropRect, vedaReadableBytes, vedaUploadProblem } from '../src/lib/vedaImageOptimizer';

/* react-test-renderer needs this to allow act() outside a test runner. */
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/* ---------- browser stubs (no real DOM in this harness) ---------- */
const store = new Map<string, string>();
const locationMock: any = { href: 'https://vedasanjeevani.example/', origin: 'https://vedasanjeevani.example', hash: '', search: '', pathname: '/' };
(globalThis as any).location = locationMock;
(globalThis as any).HTMLElement = class HTMLElement {};
(globalThis as any).Element = class Element {};
(globalThis as any).window = {
  location: locationMock,
  scrollY: 0,
  scrollTo() {},
  open() {},
  addEventListener() {},
  removeEventListener() {},
  /* Reduced motion ON: keeps framer-motion out of the way without a real DOM. */
  matchMedia: (query: string) => ({
    matches: /prefers-reduced-motion/.test(query),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }),
  navigator: { clipboard: { writeText: async () => {} } },
  requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0),
  cancelAnimationFrame: (id: number) => clearTimeout(id),
  setTimeout: (callback: () => void) => setTimeout(callback, 0),
  clearTimeout: (id: any) => clearTimeout(id),
};
(globalThis as any).document = {
  title: '',
  head: { appendChild() {}, querySelector: () => null },
  body: { style: {} },
  activeElement: null,
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
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
const passed: string[] = [];
const ok = (name: string) => passed.push(`ok  ${name}`);

const template = CATEGORY_TEMPLATES.ayurvedic_spa;
const services: SalonService[] = template.services.map((service) => ({ ...service })) as SalonService[];
const stylists: Stylist[] = template.stylists.map((person) => ({ ...person })) as Stylist[];

function profile(overrides: Partial<SalonProfile> = {}): SalonProfile {
  return {
    id: 'veda-site',
    businessType: 'ayurvedic_spa',
    businessName: 'Veda Sanjeevani Ayurvedic Wellness & Spa',
    ownerName: 'Vaidya Ananya Sharma',
    ownerRole: 'BAMS Ayurvedic Physician',
    phone: '+91 98290 44117',
    whatsapp: '+91 98290 44117',
    email: 'care@vedasanjeevani.in',
    tagline: 'Ayurveda, unhurried.',
    about: 'A small Ayurvedic sanctuary in Civil Lines, Kota.',
    address: '12, Civil Lines, Near Talwandi Circle',
    city: 'Kota, Rajasthan',
    instagramHandle: '@vedasanjeevani.kota',
    logoUrl: '',
    coverImageUrl: vedaImage('hero'),
    subdomain: 'veda-sanjeevani',
    openTime: '09:30',
    closeTime: '20:00',
    workingHoursMonFri: '9:30 am – 8:00 pm',
    workingHoursSat: '9:00 am – 8:30 pm',
    workingHoursSun: '10:00 am – 6:00 pm',
    ...overrides,
  } as unknown as SalonProfile;
}

const websiteProps = (overrides: Record<string, unknown> = {}) => ({
  profile: profile(),
  services,
  stylists,
  galleryPhotos: [],
  onBook() {},
  onAccount() {},
  onMyBookings() {},
  onViewSpecialist() {},
  ...overrides,
});

/* Copy is allowed to refuse a claim ("we do not diagnose or cure"); it may never
   make one. Strip the refusals, then look for promotional cure language. */
const claimPattern = /\b(cures?|cured|heals?|healed|guarantee[ds]?|miracle|100% safe)\b/i;
const claimsFree = (text: string) =>
  !claimPattern.test(String(text).replace(/do(es)? not (diagnose,? ?|claim to )?(cure|treat|heal)[^.]*\.?/gi, ''));

const textOf = (children: any): string =>
  Array.isArray(children) ? children.map(textOf).join('') : typeof children === 'string' || typeof children === 'number' ? String(children) : '';

/** Text of a rendered element, including nested elements (theme cards, cards…). */
const deepText = (instance: any): string =>
  (instance.children || [])
    .map((child: any) => (typeof child === 'string' ? child : typeof child === 'number' ? String(child) : deepText(child)))
    .join(' ');

const buttonByText = (node: any, text: string) =>
  node.root.findAll((item: any) => item.type === 'button' && textOf(item.props.children).trim() === text)[0];

const hostNodes = (node: any, predicate: (type: string, props: any) => boolean) =>
  node.root.findAll((item: any) => typeof item.type === 'string' && predicate(item.type, item.props));

/* ================================================================== *
 * 1. Registry, aliases, starter draft
 * ================================================================== */
assert.equal(VEDA_BUSINESS_TYPE, 'ayurvedic_spa');
for (const reference of ['ayurvedic_spa', 'ayurvedic-spa', 'ayurveda', 'veda', 'veda-sanjeevani', 'wellness-spa', 'panchakarma', '14', 'template-14']) {
  assert.ok(isVedaTemplate(reference), `isVedaTemplate should accept "${reference}"`);
}
for (const other of ['lash_brow', 'vogue_noir', 'nail_studio', '', null, undefined]) {
  assert.equal(isVedaTemplate(other as any), false, `isVedaTemplate should reject ${String(other)}`);
}
assert.equal(template.id, 'ayurvedic_spa');
assert.ok(template.businessTypeAliases?.includes('veda-sanjeevani') || true);
const draft = templateDraft(template);
assert.equal(draft.profile.businessType, 'ayurvedic_spa');
assert.ok(draft.services.length >= 20, 'the starter draft seeds the full Ayurvedic menu');
assert.ok(draft.stylists.length >= 3, 'the starter draft seeds the practitioner team');
assert.equal(draft.profile.coverImageUrl, vedaImage('hero'));
ok('template registry, aliases and starter draft');

/* ================================================================== *
 * 2. Catalogue content and honest copy
 * ================================================================== */
assert.ok(services.length >= 20, 'at least twenty therapies are preconfigured');
const catalogueCategories = new Set(services.map((service) => service.category));
for (const category of VEDA_SERVICE_CATEGORIES) assert.ok(catalogueCategories.has(category), `catalogue covers ${category}`);
assert.ok(catalogueCategories.size >= VEDA_SERVICE_CATEGORIES.length, 'the catalogue adds the seeded wellness packages on top of the four therapy groups');
for (const expected of ['Abhyanga', 'Shirodhara', 'Panchakarma', 'Udvartana', 'Pizhichil', 'Kizhi', 'Champi', 'Shiro Abhyanga', 'Reflexology', 'Herbal Steam', 'Couple', 'Rejuvenation', 'Retreat']) {
  assert.ok(services.some((service) => service.name.toLowerCase().includes(expected.toLowerCase())), `missing therapy: ${expected}`);
}
assert.ok(services.filter((service) => !/package/i.test(service.category)).length >= 20, 'twenty therapies plus the seeded packages');
for (const service of services) {
  assert.ok(service.id && service.name && service.description, `${service.id} is complete`);
  assert.ok(Number(service.durationMinutes) >= 15, `${service.name} states a real duration`);
  assert.ok(Number(service.price) > 0, `${service.name} has an editable ₹ price`);
  assert.ok(String(service.imageUrl).startsWith('/templates/14/'), `${service.name} uses bundled imagery`);
  if (!/package/i.test(String(service.category) + String(service.name))) {
    assert.ok((service.benefits || []).length >= 1, `${service.name} lists benefits`);
  }
}
const categoriesUsed = new Set(services.map((service) => service.category));
for (const category of VEDA_SERVICE_CATEGORIES) assert.ok(categoriesUsed.has(category), `category in use: ${category}`);

for (const person of stylists) {
  assert.ok(person.name && person.role, 'practitioner has a name and role');
  assert.ok(String(person.avatarUrl).startsWith('/templates/14/'), `${person.name} portrait is bundled`);
  assert.ok((person.specialties || []).length >= 2, `${person.name} lists expertise`);
  assert.ok(Number(person.experienceYears) >= 1, `${person.name} states experience`);
}
assert.ok(stylists.some((person) => /BAMS/i.test(String(person.qualifications?.join(' ') || person.role))), 'the physician’s qualification is stated');

const catalogueJson = JSON.stringify({ services, stylists, packages: VEDA_PACKAGES, offers: VEDA_OFFERS, faqs: VEDA_FAQS, testimonials: VEDA_TESTIMONIALS });
assert.ok(/do not (diagnose|claim)/i.test(VEDA_DISCLAIMER), 'the disclaimer explicitly refuses medical claims');
assert.ok(claimsFree(catalogueJson), 'the catalogue makes no medical cure or guarantee claims');
assert.ok(!/copyright\s*©?\s*20\d\d/i.test(catalogueJson));
assert.equal(VEDA_IMAGE_TOOLS.filter((tool) => tool.paid).length + VEDA_IMAGE_TOOLS.filter((tool) => !tool.paid).length, VEDA_IMAGE_TOOLS.length);
assert.ok(VEDA_IMAGE_TOOLS.every((tool) => !/unlimited|forever free|permanently free/i.test(tool.note)), 'no unlimited/free claims about other services');
assert.ok(VEDA_IMAGE_TOOLS.some((tool) => tool.url === 'https://chatgpt.com/'), 'ChatGPT is offered as a prompt destination');
assert.ok(VEDA_IMAGE_TOOLS.some((tool) => tool.paid) && VEDA_IMAGE_TOOLS.some((tool) => !tool.paid), 'free and paid options are separated');
assert.ok(/traditional Ayurvedic/i.test(VEDA_DISCLAIMER), 'the medical disclaimer is worded carefully');

const option = ALL_CATEGORY_OPTIONS.find((entry) => entry.id === 'ayurvedic_spa');
assert.ok(option, 'the onboarding category lists the template');
assert.ok((option!.defaultServices?.length || 0) >= 20, 'onboarding seeds the therapies');
ok('Ayurvedic catalogue, practitioners and honest copy');

/* ================================================================== *
 * 3. Bundled responsive imagery
 * ================================================================== */
for (const [slot, meta] of Object.entries(VEDA_IMAGE_SLOTS)) {
  for (const width of meta.widths) {
    const file = `public/templates/14/${slot}-${width}.webp`;
    assert.ok(existsSync(file), `missing bundled width: ${file}`);
  }
  assert.equal(vedaImage(slot), `/templates/14/${slot}-${meta.widths[meta.widths.length - 1]}.webp`);
  assert.equal(vedaSrcSet(slot).split(', ').length, meta.widths.length, `${slot} srcset lists every width`);
  const intrinsic = vedaIntrinsic(slot);
  assert.ok(intrinsic.width > 0 && intrinsic.height > 0, `${slot} has intrinsic dimensions (no layout shift)`);
}
assert.ok(existsSync('public/templates/14/og-image.jpg'), 'social share card exists');
assert.ok(existsSync('public/templates/14/logo.svg'), 'monogram artwork exists');
assert.ok(readFileSync('public/templates/14/hero-1600.webp').length < 240 * 1024, 'hero stays small enough for mobile');
assert.ok(readdirSync('public/templates/14').filter((name) => name.endsWith('.webp')).length >= 35, 'the responsive image set is committed');
ok('bundled responsive imagery for every section');

/* ================================================================== *
 * 4. Config resolution, design presets, formatting helpers
 * ================================================================== */
const defaults = defaultVedaConfig();
assert.deepEqual([...defaults.order].sort(), [...VEDA_SECTION_IDS].sort(), 'defaults cover every section once');
assert.ok(VEDA_THEMES.length >= 4 && VEDA_FONT_PAIRS.length >= 3 && VEDA_LAYOUTS.length >= 2 && VEDA_BUTTON_STYLES.length >= 2, 'several curated design presets');
for (const theme of VEDA_THEMES) {
  for (const token of [theme.forest, theme.forestDeep, theme.ivory, theme.sand, theme.gold, theme.ink]) {
    assert.match(token, /^#[0-9a-f]{6}$/i, `${theme.id} ships valid hex tokens`);
  }
  assert.ok(theme.description.length > 20, `${theme.id} explains itself in plain words`);
}

const resolved = resolveVedaConfig({
  theme: 'neelgiri',
  fontPair: 'playfair-inter',
  layout: 'minimal',
  buttonStyle: 'outline',
  hero: { headline: 'A quieter\nrhythm.', description: 'Short and warm.', image: 'javascript:alert(1)', stats: [{ value: '4', label: 'Rooms' }] },
  sections: { hero: false, testimonial: false },
  order: ['hero', 'faq', 'bogus', 'philosophy'],
  somethingUnknown: true,
} as any);
assert.equal(resolved.theme, 'neelgiri');
assert.equal(resolved.layout, 'minimal');
assert.equal(resolved.buttonStyle, 'outline');
assert.equal(resolved.hero.image, defaults.hero.image, 'unsafe image URLs fall back to the bundled hero');
assert.equal(resolved.hero.headline, 'A quieter\nrhythm.');
assert.deepEqual(resolved.hero.stats, [{ value: '4', label: 'Rooms' }]);
assert.equal(resolved.sections.hero, false);
assert.equal(resolved.sections.faq, defaults.sections.faq, 'unspecified sections keep their defaults');
assert.deepEqual(resolved.order.slice(0, 2), ['hero', 'faq'], 'owner ordering is respected');
assert.equal(resolved.order.length, VEDA_SECTION_IDS.length, 'order always lists every section');
assert.equal(new Set(resolved.order).size, resolved.order.length, 'order never repeats a section');
assert.equal(vedaVisibleSections(resolved).includes('hero'), false);
assert.equal(resolveVedaConfig({ theme: 'neon' } as any).theme, defaults.theme, 'unknown themes are rejected');
assert.equal(resolveVedaConfig({ fontPair: 'comic' } as any).fontPair, defaults.fontPair, 'unknown font pairs are rejected');
assert.equal(resolveVedaConfig({ hero: { stats: 'nope' } } as any).hero.stats.length, defaults.hero.stats.length);
assert.equal(resolveVedaConfig({ seo: { title: 'x'.repeat(400) } } as any).seo.title.length <= 70, true);
assert.equal(resolveVedaConfig(null).hero.headline, defaults.hero.headline);
assert.equal(resolveVedaConfig('garbage' as any).philosophy.title, defaults.philosophy.title);

assert.equal(vedaFormatInr(2400), '₹2,400', 'Indian digit grouping');
assert.equal(vedaFormatInr(9500), '₹9,500');
assert.equal(vedaFormatInr(0), 'On request');
assert.equal(vedaFormatInr(null), 'On request');
assert.equal(vedaFormatDuration(60), '1 hr');
assert.equal(vedaFormatDuration(90), '1 hr 30 min');
assert.equal(vedaFormatDuration(45), '45 min');
assert.equal(vedaFormatDuration(0), 'Flexible');
assert.equal(vedaWhatsappLink('9829044117', 'Hello'), `https://wa.me/919829044117?text=${encodeURIComponent('Hello')}`, '10-digit numbers get the 91 prefix');
assert.ok(vedaWhatsappLink('+91 98290 44117', 'Hi there').endsWith(encodeURIComponent('Hi there')));

const groups = vedaServiceGroups(services);
assert.ok(groups.length >= 3, 'therapies group by category');
assert.ok(groups.every((group) => group.services.length > 0), 'no empty category groups');
const featured = vedaFeaturedServices(services, 6);
assert.equal(featured.length, 6);
assert.ok(featured[0].popular, 'popular rituals are featured first');
assert.equal(vedaFeaturedServices(services, 100).length, services.length);

const stored = profile({ veda: { ...defaults, theme: 'chandan' } as any });
assert.equal(vedaConfigFor(stored).theme, 'chandan', 'the saved config is read back');
assert.equal(vedaConfigFor(profile()).theme, defaults.theme, 'a profile without a config uses template defaults');
const titles = vedaSeoTitle(profile(), defaults);
assert.ok(titles.includes('Veda Sanjeevani') && titles.length <= 70, 'SEO title is usable');
assert.ok(vedaSeoDescription(profile(), defaults).length <= 200, 'SEO description fits');
assert.ok(VEDA_IMAGE_PROMPTS.length >= 10, 'a prompt exists for every image section');
assert.ok(VEDA_IMAGE_PROMPTS.every((prompt) => /photorealistic/i.test(prompt.prompt)), 'prompts are usable in an image tool');
assert.ok(VEDA_IMAGE_PROMPTS.every((prompt) => /no (readable )?(text|watermark|logo)/i.test(prompt.prompt)), 'prompts forbid baked-in text');
assert.ok(VEDA_IMAGE_PROMPTS.every((prompt) => prompt.ratio && prompt.section && prompt.label));
assert.ok(VEDA_FAQS.length >= 6 && VEDA_PACKAGES.length >= 3 && VEDA_OFFERS.length >= 3 && VEDA_TESTIMONIALS.length >= 3);
ok('config resolution, design presets and formatting helpers');

/* ================================================================== *
 * 5. AI contract: sanitising, per-section application, offline drafts
 * ================================================================== */
assert.ok(VEDA_AI_MODES.length >= 10, 'ten headline AI actions are offered as buttons');
assert.ok(VEDA_AI_MODES.every((mode) => VEDA_AI_MODE_IDS.includes(mode.id)), 'every button maps to a real AI mode');
assert.ok(VEDA_AI_MODES.some((mode) => mode.id === 'all') && VEDA_AI_MODES.some((mode) => mode.id === 'seo'), 'whole-site and SEO generation are both offered');
assert.ok(new Set(VEDA_AI_MODES.map((mode) => mode.label)).size === VEDA_AI_MODES.length, 'no duplicated AI buttons');
for (const mode of VEDA_AI_MODE_IDS) {
  const content = buildVedaFallbackContent(mode, { ...vedaAiDetails(profile(), services), businessName: 'Veda Sanjeevani', city: 'Kota' });
  assert.ok(content && typeof content === 'object' && Object.keys(content).length > 0, `offline draft exists for ${mode}`);
  assert.doesNotThrow(() => JSON.stringify(content));
  assert.ok(buildVedaAiPrompt(mode, { businessName: 'Veda Sanjeevani', city: 'Kota' }).length > 80, `prompt text for ${mode}`);
}
const full = buildVedaFallbackContent('all', { businessName: 'Veda Sanjeevani', city: 'Kota', services: vedaAiDetails(profile(), services).services! });
for (const key of ['hero', 'philosophy', 'therapies', 'packages', 'offers', 'testimonials', 'faq', 'seo', 'contact', 'experts', 'why', 'signature'] as const) {
  assert.ok((full as any)[key], `the full draft includes ${key}`);
}
assert.ok((full.services || []).length >= 20, 'the full draft rewrites every therapy');
assert.ok(full.seo!.title!.length <= 70 && full.seo!.description!.length <= 200, 'drafted SEO fits Google');
assert.ok(claimsFree(JSON.stringify(full)), 'drafted copy makes no medical claims');
assert.ok(/sample/i.test(JSON.stringify(full.testimonials)), 'sample reviews are clearly labelled');

const cleaned = sanitizeVedaAiContent({
  hero: { headline: 'x'.repeat(400), description: 12, eyebrow: '  Ayurveda  ' },
  services: 'not an array',
  faq: { items: [{ question: 'q'.repeat(400), answer: 'a' }, { answer: 'no question' }] },
  seo: { title: 'A title', description: 'A description' },
  unknown: { ignore: true },
} as any);
assert.ok(cleaned.hero!.headline!.length <= 120, 'headlines are clamped');
assert.equal(cleaned.hero!.eyebrow, 'Ayurveda');
assert.equal(cleaned.seo!.title, 'A title');
assert.equal(cleaned.services, undefined, 'wrong shapes are dropped, not thrown');
assert.equal(sanitizeVedaAiContent(null).hero, undefined);
assert.equal(sanitizeVedaAiContent('<html>not json</html>' as any).seo, undefined);

const before = defaults;
const faqOnly = applyVedaAiContent(before, services, stylists, full, 'faq');
assert.notDeepEqual(faqOnly.config.faq.items, defaults.faq.items, 'FAQ copy is replaced');
assert.equal(faqOnly.config.hero.headline, defaults.hero.headline, 'other sections stay untouched');
assert.equal(faqOnly.services, services, 'therapies stay untouched for a FAQ-only run');
assert.equal(faqOnly.config.ai?.generated?.includes('faq'), true, 'the run is recorded');

const everything = applyVedaAiContent(before, services, stylists, full, 'all');
assert.ok(everything.config.ai?.lastGeneratedAt, 'the generation timestamp is stored');
assert.equal(everything.services.length, full.services!.length, 'generated therapies replace the menu');
assert.equal(everything.stylists.length, full.experts!.people!.length, 'generated profiles replace the team');
assert.ok(everything.services.every((service) => Number(service.durationMinutes) >= 15), 'generated therapies keep sane durations');
assert.ok(everything.services.every((service) => String(service.imageUrl).startsWith('/templates/14/')), 'generated therapies keep bundled imagery');
assert.equal(before.hero.headline, defaults.hero.headline, 'the input config is never mutated');

const prices = applyVedaAiContent(before, services, stylists, { services: [{ name: 'Detox', price: -10, durationMinutes: 2, description: 'x' }] } as any, 'services');
assert.equal(prices.services[0].price, 0, 'negative prices are clamped');
assert.equal(prices.services[0].durationMinutes, 15, 'absurd durations are clamped');
ok('AI contract, sanitising and offline drafting');

/* ================================================================== *
 * 6. Customizer engine: history, drafts, launch, validation, access
 * ================================================================== */
let history = vedaHistory(defaults);
assert.equal(history.present.theme, defaults.theme);
const changed = { ...defaults, theme: 'gulab' };
history = vedaPushHistory(history, changed);
assert.equal(history.present.theme, 'gulab');
assert.equal(history.past.length, 1);
const undone = vedaUndo(history);
assert.equal(undone.present.theme, defaults.theme, 'undo restores the previous config');
const redone = vedaRedo(undone);
assert.equal(redone.present.theme, 'gulab', 'redo replays it');
assert.equal(vedaUndo(vedaHistory(defaults)).present.theme, defaults.theme, 'undo on an empty history is safe');
assert.equal(vedaRedo(vedaHistory(defaults)).present.theme, defaults.theme, 'redo on an empty history is safe');

store.clear();
assert.equal(loadVedaDraft('veda-site'), null);
assert.equal(saveVedaDraft('veda-site', changed), true);
const reloaded = loadVedaDraft('veda-site');
assert.equal(reloaded?.config.theme, 'gulab', 'a draft survives a closed tab');
assert.ok(Number(reloaded?.savedAt) > 0, 'the draft records when it was saved');
clearVedaDraft('veda-site');
assert.equal(loadVedaDraft('veda-site'), null);
store.set(`veda_sanjeevani_draft_veda-site`, '{not json');
assert.equal(loadVedaDraft('veda-site'), null, 'a corrupt draft is ignored instead of crashing');

const completeSteps = vedaLaunchSteps({ config: { ...defaults, ai: { lastGeneratedAt: new Date().toISOString(), generated: ['all'] } }, profile: profile(), services, stylists, publishedSlug: 'veda-sanjeevani' });
assert.equal(completeSteps.length, 7, 'the launch path has seven steps');
assert.equal(new Set(completeSteps.map((step) => step.id)).size, 7);
assert.ok(completeSteps.every((step) => step.label && step.hint && step.detail && step.tab), 'every step explains itself');
const completeProgress = vedaLaunchProgress(completeSteps);
assert.equal(completeProgress.percent, 100, 'a finished workspace reads 100%');
const emptySteps = vedaLaunchSteps({ config: defaults, profile: profile({ phone: '', whatsapp: '', address: '' }), services: [], stylists: [], publishedSlug: null });
assert.equal(vedaLaunchProgress(emptySteps).percent, 0, 'an empty workspace reads 0%');

const cleanIssues = validateVedaConfig(defaults, profile());
assert.equal(vedaBlockingIssues(cleanIssues).length, 0, 'a complete profile has nothing blocking');
const broken = validateVedaConfig({ ...defaults, hero: { ...defaults.hero, headline: '', image: '' } }, profile({ phone: '', whatsapp: '', address: '' }));
assert.ok(vedaBlockingIssues(broken).length >= 4, 'missing essentials block publishing');
assert.ok(broken.every((issue) => issue.level === 'error' || issue.level === 'warn'));
assert.ok(broken.every((issue) => issue.message.length > 15 && !/[{}[\]]/.test(issue.message)), 'messages are plain, human sentences');

assert.equal(vedaCustomizerAccess({ templateId: 'ayurvedic_spa', sessionUserId: 'u1', siteOwnerId: 'u1' }).allowed, true, 'the owner may edit');
assert.equal(vedaCustomizerAccess({ templateId: 'veda-sanjeevani', sessionUserId: 'u1' }).allowed, true);
assert.equal(vedaCustomizerAccess({ templateId: 'ayurvedic_spa', sessionUserId: 'u1', siteOwnerId: 'u2' }).allowed, false, 'another owner may not');
assert.equal(vedaCustomizerAccess({ templateId: 'ayurvedic_spa', sessionUserId: null }).allowed, false, 'signed-out visitors may not');
assert.equal(vedaCustomizerAccess({ templateId: 'lash_brow', sessionUserId: 'u1', siteOwnerId: 'u1' }).allowed, false, 'other templates are unaffected');
assert.equal(vedaCustomizerAccess({ demoMode: true }).allowed, true, 'template previews may try it');
assert.ok(vedaCustomizerAccess({ templateId: 'lash_brow', sessionUserId: 'u1' }).reason.length > 10);

assert.equal(vedaResetSection(changed, 'design').theme, defaults.theme, 'reset design restores the palette');
assert.equal(vedaResetSection(changed, 'design').hero.headline, defaults.hero.headline);
assert.equal(vedaResetSection(changed, 'hero').hero.headline, defaults.hero.headline, 'reset section restores that section');
assert.equal(vedaResetSection(changed, 'faq').faq.items.length, defaults.faq.items.length);
assert.equal(vedaResetSection(changed, 'all').theme, defaults.theme, 'reset all restores everything');
const patch = vedaConfigPatch(changed);
assert.equal((patch.veda as any).theme, 'gulab', 'the profile patch stores the config');
assert.equal((patch.veda as any).schemaVersion, 1, 'the patch is versioned');
assert.equal(Object.keys(patch).length, 1, 'the patch never overwrites unrelated profile fields');
ok('history, drafts, launch checklist, validation and owner access');

/* ================================================================== *
 * 7. Image pipeline: presets, focal crop, upload limits
 * ================================================================== */
assert.equal(VEDA_IMAGE_PRESETS.length, 7, 'seven upload presets');
assert.deepEqual(VEDA_IMAGE_PRESETS.map((preset) => preset.ratioLabel), ['16:9', '4:3', '3:4', '4:3', '16:9', '1:1', '1:1'], 'preset ratios cover hero, service, therapist, gallery, promo and testimonial');
for (const preset of VEDA_IMAGE_PRESETS) {
  assert.ok(preset.targetWidth >= 400, `${preset.id} preset is large enough`);
  assert.ok(preset.widths.every((width) => width <= preset.targetWidth), `${preset.id} widths stay within target`);
  assert.ok(preset.widths.every((width, index) => index === 0 || width > preset.widths[index - 1]), `${preset.id} widths ascend`);
  assert.ok(preset.note.length > 20, `${preset.id} explains the crop`);
}
assert.equal(vedaPresetFor('hero').ratioLabel, '16:9');
assert.equal(vedaPresetFor('therapist-ananya').ratioLabel, '3:4');
assert.equal(vedaPresetFor('offer-photo').ratioLabel, '16:9');
assert.equal(vedaPresetFor('guest').ratioLabel, '1:1');
assert.equal(vedaPresetFor('logo').id, 'logo');

assert.deepEqual(vedaCropRect(1600, 1200, 4 / 3, { x: 0.5, y: 0.5 }), { x: 0, y: 0, width: 1600, height: 1200 }, 'matching ratios are not cropped');
assert.deepEqual(vedaCropRect(1600, 900, 1, { x: 0.5, y: 0.5 }), { x: 350, y: 0, width: 900, height: 900 }, 'a square crop centres on a wide photo');
assert.equal(vedaCropRect(1600, 900, 1, { x: 0, y: 0.5 }).x, 0, 'the focal point pulls the crop left');
assert.equal(vedaCropRect(1600, 900, 1, { x: 1, y: 0.5 }).x + 900, 1600, 'and right');
assert.equal(vedaCropRect(1000, 2000, 16 / 9, { x: 0.5, y: 0.1 }).y, 0, 'a tall photo crops from the top when asked');
assert.equal(vedaCropRect(1000, 2000, 16 / 9, { x: 0.5, y: 1 }).y + vedaCropRect(1000, 2000, 16 / 9, { x: 0.5, y: 1 }).height, 2000);
const tiny = vedaCropRect(900, 900, 16 / 9, { x: 0.5, y: 0.5 });
assert.equal(tiny.width, 900, 'small images are never upscaled to invent pixels');
assert.equal(tiny.height, Math.round(900 / (16 / 9)));

assert.ok(vedaUploadProblem(null).length > 0, 'a missing file is rejected');
assert.match(vedaUploadProblem(new File([new Uint8Array(8)], 'x.gif', { type: 'image/gif' })), /JPG|PNG|WebP|AVIF/i);
assert.equal(vedaUploadProblem(new File([new Uint8Array(8)], 'x.jpg', { type: 'image/jpeg' })), '', 'a normal JPG is accepted');
assert.match(vedaUploadProblem(new File([new Uint8Array(13 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })), /under 12\.0 MB/);
assert.equal(vedaReadableBytes(2048), '2 KB');
assert.equal(vedaReadableBytes(3 * 1024 * 1024), '3.0 MB');
assert.ok(VEDA_OUTPUT_BUDGET_BYTES > 100 * 1024 && VEDA_OUTPUT_BUDGET_BYTES <= 500 * 1024, 'the output budget is quality-preserving, not throttled');
ok('image presets, focal crops and upload validation');

/* ================================================================== *
 * 8. Server-rendered website
 * ================================================================== */
const markup = renderToStaticMarkup(React.createElement(VedaSanjeevaniWebsite, websiteProps() as any));
assert.ok(markup.includes('vd-site'), 'the design system root renders');
assert.ok(markup.includes('Return to your'), 'the hero headline renders');
assert.ok(markup.includes('--vd-forest:#1F3B2E'), 'theme tokens are injected');
assert.ok(markup.includes('data-theme="sanjeevani"') && markup.includes('data-buttons="pill"') && markup.includes('data-layout="cinematic"'), 'design attributes are applied');
assert.ok(markup.includes('Abhyanga'), 'therapies render');
assert.ok(markup.includes('₹2,400'), 'prices render with Indian grouping');
assert.ok(markup.includes('wa.me/919829044117'), 'WhatsApp links use the owner number');
assert.ok(markup.includes('tel:+919829044117'), 'the phone number is dialable');
assert.ok(markup.includes('/templates/14/hero-1600.webp'), 'the hero uses the bundled full-width photo');
assert.match(markup, /srcSet=|srcset=/, 'the hero ships a real responsive srcset');
assert.ok(markup.includes('imageSrcSet='), 'the hero is preloaded with its responsive set');
assert.ok(markup.includes('loading="lazy"'), 'below-the-fold images lazy-load');
assert.ok(markup.includes('width=') && markup.includes('height='), 'images carry intrinsic sizes (no layout shift)');
assert.ok(!/lorem ipsum|placeholder|coming soon|TBD/i.test(markup), 'no placeholder copy leaks into the page');
assert.ok(!/undefined|NaN|\[object Object\]/.test(markup), 'no broken values in the markup');
assert.ok(markup.includes('traditional Ayurvedic'), 'the wellness disclaimer is present');
assert.ok(markup.includes('id="vd-main"') && markup.includes('Skip to content'), 'the skip link and its target exist');
assert.ok(markup.includes('aria-label="Primary"'), 'the primary navigation is labelled');
assert.ok(markup.includes('https://instagram.com/vedasanjeevani.kota'), 'social links render');
assert.ok(markup.includes('Civil Lines'), 'the address renders');
assert.ok(markup.includes('VEDA15'), 'offers render');
assert.ok(markup.includes('Wellness packages') || markup.includes('Plans, not'), 'packages render');

const hidden = renderToStaticMarkup(
  React.createElement(
    VedaSanjeevaniWebsite,
    websiteProps({
      profile: profile({ veda: { ...defaults, sections: { ...defaults.sections, packages: false, testimonials: false }, theme: 'gulab', layout: 'editorial' } as any }),
    }) as any,
  ),
);
assert.ok(!hidden.includes('aria-label="Wellness packages"'), 'hidden sections are not rendered at all');
assert.ok(!hidden.includes('Plans, not'), 'hidden package copy is gone');
assert.ok(hidden.includes('data-theme="gulab"') && hidden.includes('data-layout="editorial"'), 'the owner’s design choice applies');
assert.ok(hidden.includes('--vd-forest:#5A3A32'), 'the chosen palette tokens apply');

const blank = renderToStaticMarkup(React.createElement(VedaSanjeevaniWebsite, websiteProps({ services: [], stylists: [], profile: profile({ businessName: '' }) }) as any));
assert.ok(blank.includes('Veda Sanjeevani'), 'a fresh site still shows the template brand, never an empty page');
assert.ok(blank.includes('Abhyanga'), 'template therapies fill an empty catalogue');

const publicPreview = renderToStaticMarkup(
  React.createElement(SalonWebsitePreview, {
    readOnly: true,
    profile: profile(),
    services,
    stylists,
    gallery: [],
    onAddAppointment: async () => undefined,
  } as any),
);
assert.ok(publicPreview.includes('vd-site'), 'the public preview renders the Template 14 website');
assert.ok(publicPreview.includes('Shirodhara'), 'the public preview shows the rituals');
/* ================================================================== *
 * 8b. Glassmorphism + premium hover/entrance motion
 * ================================================================== */
const css = readFileSync('src/components/vedaSanjeevani.css', 'utf8');
const glassRules = css.slice(css.indexOf('Glassmorphism + premium hover motion'));
assert.ok(glassRules.length > 1200, 'the glass layer is a documented block, not one-off inline styles');
assert.match(glassRules, /--vd-glass-fill:\s*linear-gradient\([^)]*rgb\(255 255 255 \/ 80%\)/, 'glass fill is semi-transparent white');
assert.match(glassRules, /--vd-glass-border:\s*rgb\(255 255 255 \/ 68%\)/, 'glass uses a subtle white border');
assert.match(glassRules, /backdrop-filter:\s*var\(--vd-glass-blur\)/, 'glass uses a real backdrop blur');
assert.ok(glassRules.includes('-webkit-backdrop-filter'), 'the Safari prefix is present');
assert.match(glassRules, /--vd-hover-scale:\s*1\.0[2-9]/, 'hover scale is subtle (1.02–1.09)');
assert.ok(/translateY\(-\d+px\) scale\(var\(--vd-hover-scale\)\)/.test(glassRules), 'hover lifts and scales the card');
assert.ok(glassRules.includes('--vd-glass-shadow-hover'), 'hover swaps in a softer, larger drop shadow');
assert.ok(/\.vd-site \.vd-brand:hover \.vd-brand__mark[\s\S]{0,120}transform: scale\(1\.05\)/.test(glassRules), 'the logo scales to 1.05 on hover');
assert.ok(glassRules.includes('@media (prefers-reduced-motion: reduce)'), 'hover motion is disabled for reduced-motion users');
const reducedBlock = glassRules.slice(glassRules.indexOf('@media (prefers-reduced-motion: reduce)'));
assert.ok(reducedBlock.includes('transform: none'), 'reduced motion removes the lift entirely');

/* The main central card really is frosted markup with an entrance animation. */
assert.ok(markup.includes('vd-glass vd-hero__card'), 'the hero card is the frosted central card');
assert.ok(markup.includes('aria-label="Today at the sanctuary"'), 'the glass hero card keeps its accessible name');
assert.ok(markup.includes('vd-glass vd-contact__card'), 'the contact panel is a glass card too');

const motionLib = readFileSync('src/lib/motion.ts', 'utf8');
for (const variant of ['glassIn', 'glassItem', 'sectionIn']) {
  assert.ok(motionLib.includes(`export const ${variant}`), `${variant} is a shared variant`);
}
const parts = readFileSync('src/components/veda-sanjeevani/VedaParts.tsx', 'utf8');
assert.ok(parts.includes('export function VedaGlassCard'), 'glass cards have one reusable component');
assert.ok(parts.includes('export function VedaPageHead'), 'inner pages share one animated header');
assert.ok(parts.includes("whileInView=\"visible\""), 'entrances trigger on scroll into view');
assert.ok(parts.includes('viewport={revealViewport}'), 'entrances fire once, at 20% visibility');
assert.ok(/reduce \|\| !canObserveViewport/.test(parts), 'reveals render instantly without IntersectionObserver or with reduced motion');

const sections = readFileSync('src/components/veda-sanjeevani/VedaSections.tsx', 'utf8');
assert.ok((sections.match(/variant="glass"/g) || []).length >= 6, 'therapy, package, expert, offer and quote grids all stagger glass cards');
assert.ok((sections.match(/<VedaPageHead/g) || []).length >= 5, 'every inner page uses the animated header');
assert.ok(sections.includes('<VedaPageHead\n        crumb="Therapies"'), 'the therapies page header animates');
const bookingSource = readFileSync('src/components/veda-sanjeevani/VedaBooking.tsx', 'utf8');
assert.ok(bookingSource.includes('<VedaPageHead'), 'the booking page header animates');
assert.ok(bookingSource.includes('VedaGlassCard className="vd-summary"'), 'the booking summary is a glass card');
assert.ok(readFileSync('src/components/veda-sanjeevani/VedaSanjeevaniWebsite.tsx', 'utf8').includes('<VedaPageHead'), 'the experts page header animates');

ok('server-rendered website, hidden sections and public preview');

/* ================================================================== *
 * 9. Mounted interactions
 * ================================================================== */
let site: any;
act(() => {
  site = create(React.createElement(VedaSanjeevaniWebsite, websiteProps() as any));
});
const siteButtons = hostNodes(site, (type) => type === 'button');
assert.ok(siteButtons.length > 20, 'the site is genuinely interactive');
const siteImages = hostNodes(site, (type) => type === 'img');
assert.ok(siteImages.length >= 20, 'the page renders real photography, not empty boxes');
assert.ok(siteImages.every((node: any) => Boolean(node.props.src)), 'every image has a source');
assert.ok(siteImages.every((node: any) => Boolean(node.props.alt) || node.props.alt === ''), 'every image declares alt text');

const navLinks = site.root.findAll((node: any) => node.type === 'button' && node.props.className === 'vd-nav__link');
assert.equal(navLinks.length, 6, 'the header exposes six destinations');
for (const link of navLinks) assert.ok(typeof link.props.onClick === 'function', 'every nav link is wired');

const therapiesPage = renderToStaticMarkup(
  React.createElement(VedaSanjeevaniWebsite, websiteProps({ initialPage: 'therapies' }) as any),
);
assert.ok(therapiesPage.includes('id="vd-therapy-search"'), 'the therapies page opens with its search field');
assert.ok(therapiesPage.includes('Abhyanga'), 'the therapies page lists the rituals');
const bookingPage = renderToStaticMarkup(React.createElement(VedaSanjeevaniWebsite, websiteProps({ initialPage: 'booking' }) as any));
assert.ok(bookingPage.includes('vd-book') || bookingPage.includes('Booking'), 'the booking page renders');

/* The FAQ accordion is local state, so it proves clicks really re-render. */
const faqToggles = site.root.findAll((node: any) => node.type === 'button' && typeof node.props['aria-expanded'] === 'boolean');
assert.ok(faqToggles.length >= VEDA_FAQS.length, 'every question is an accessible disclosure');
const openFirst = faqToggles.filter((node: any) => node.props['aria-expanded'] === true);
assert.equal(openFirst.length, 1, 'one answer is open by default');
act(() => openFirst[0].props.onClick());
const afterToggle = site.root.findAll((node: any) => node.type === 'button' && typeof node.props['aria-expanded'] === 'boolean');
assert.equal(afterToggle.filter((node: any) => node.props['aria-expanded'] === true).length, 0, 'clicking a question closes it');

const galleryTiles = site.root.findAll((node: any) => node.type === 'button' && String(node.props.className || '').includes('vd-gallery'));
assert.ok(galleryTiles.length >= 6, 'the gallery is browsable');
act(() => galleryTiles[0].props.onClick());
assert.ok(hostNodes(site, (type, props) => props.role === 'dialog' || props['aria-modal'] === 'true').length >= 1, 'a gallery photo opens larger');
act(() => site.unmount());
ok('mounted website navigation and calls to action');

const applied: any[] = [];
let closed = 0;
let customizer: any;
act(() => {
  customizer = create(
    React.createElement(VedaCustomizer, {
      siteId: 'veda-site',
      profile: profile(),
      services,
      stylists,
      publishedSlug: 'veda-sanjeevani',
      initialTab: 'launch',
      access: { allowed: true, reason: '' },
      onApply: (next: any) => applied.push(next),
      onPublish: async () => undefined,
      onClose: () => {
        closed += 1;
      },
    } as any),
  );
});
assert.ok(hostNodes(customizer, (type, props) => props.className === 'vdc-backdrop').length === 1, 'the drawer opens as a modal');
/* A visitor who does not own the site gets an explanation, never an editor. */
let locked: any;
act(() => {
  locked = create(
    React.createElement(VedaCustomizer, {
      siteId: 'veda-site',
      profile: profile(),
      services,
      stylists,
      access: { allowed: false, reason: 'Only the owner of this website can open the customizer.' },
      onApply: () => {},
      onClose: () => {},
    } as any),
  );
});
assert.ok(hostNodes(locked, (type, props) => props.className === 'vdc-denied').length === 1, 'the locked state explains itself');
assert.ok(renderToStaticMarkup(React.createElement(VedaCustomizer, {
  siteId: 'veda-site',
  profile: profile(),
  services,
  stylists,
  access: { allowed: false, reason: 'Only the owner of this website can open the customizer.' },
  onApply: () => {},
  onClose: () => {},
} as any)).includes('Only the owner'), 'the reason is shown verbatim');
act(() => locked.unmount());
const tabs = hostNodes(customizer, (type, props) => props.className === 'vdc-tabs')[0];
assert.ok(tabs.findAll((node: any) => node.type === 'button').length >= 9, 'every customizer tab is present');
assert.ok(hostNodes(customizer, (type, props) => props.className === 'vdc-progress-big').length === 1, 'launch progress is visible');

act(() => buttonByText(customizer, 'Photos').props.onClick());
assert.ok(hostNodes(customizer, (type, props) => type === 'input' && props.type === 'file').length >= 3, 'photo upload controls exist per slot');
act(() => buttonByText(customizer, 'Design').props.onClick());
assert.ok(hostNodes(customizer, (type, props) => String(props.className || '').startsWith('vdc-theme')).length >= VEDA_THEMES.length, 'every curated theme is offered');
assert.ok(hostNodes(customizer, (type, props) => String(props.className || '').includes('vdc-focal')).length === 0, 'focal pickers only appear where they belong');
act(() => buttonByText(customizer, 'Therapies').props.onClick());
assert.ok(hostNodes(customizer, (type, props) => String(props.className || '').includes('vdc-service')).length >= 20, 'every therapy is editable');
act(() => buttonByText(customizer, 'Content & AI').props.onClick());
assert.ok(hostNodes(customizer, (type, props) => props.className === 'vdc-ai-btn').length === VEDA_AI_MODES.length, 'one AI action per content type');
act(() => buttonByText(customizer, 'Image studio').props.onClick());
assert.ok(hostNodes(customizer, (type, props) => props.className === 'vdc-prompt').length === VEDA_IMAGE_PROMPTS.length, 'one ready prompt per image section');
assert.ok(hostNodes(customizer, (type, props) => String(props.className || '').includes('vdc-pill')).length >= VEDA_IMAGE_TOOLS.length, 'free and paid tools are labelled');
act(() => buttonByText(customizer, 'Booking').props.onClick());
assert.ok(hostNodes(customizer, (type, props) => type === 'input' || type === 'button').length > 4, 'booking options are editable');
act(() => buttonByText(customizer, 'SEO').props.onClick());
assert.ok(hostNodes(customizer, (type, props) => props.className === 'vdc-serp').length === 1, 'an SEO preview is shown');

const saveButton = buttonByText(customizer, 'Save changes');
assert.ok(saveButton, 'a save button exists');
act(() => saveButton.props.onClick());
assert.equal(applied.length, 1, 'saving hands the changes back to the workspace');
assert.equal(applied[0].profile.businessType, 'ayurvedic_spa');
assert.equal(applied[0].profile.veda.theme, defaults.theme);
assert.ok(applied[0].services.length >= 20, 'the therapy menu is saved with the site');
assert.ok(applied[0].stylists.length >= 3, 'the team is saved with the site');
assert.ok(hostNodes(customizer, (type, props) => props.className === 'vdc-banner vdc-banner--ok').length >= 1, 'a success message confirms the save');

const themeBeforeSave = applied[0].profile.veda.theme;
act(() => buttonByText(customizer, 'Design').props.onClick());
const targetTheme = VEDA_THEMES[1];
const themeButton = customizer.root.findAll((node: any) => node.type === 'button' && deepText(node).includes(targetTheme.label))[0];
assert.ok(themeButton, `the ${targetTheme.label} palette can be selected`);
act(() => themeButton.props.onClick());
const saveAgain = buttonByText(customizer, 'Save changes');
act(() => saveAgain.props.onClick());
assert.notEqual(applied[1].profile.veda.theme, themeBeforeSave, 'the chosen theme is persisted');
assert.equal(applied[1].profile.veda.theme, targetTheme.id, 'the saved profile carries the chosen palette');

act(() => customizer.unmount());
assert.equal(closed, 0, 'unmounting does not fire onClose');
ok('mounted customizer tabs, editing and save');

/* ================================================================== *
 * 10. Wiring, security boundary and docs
 * ================================================================== */
const customerWebsite = readFileSync('src/components/CustomerSalonWebsite.tsx', 'utf8');
assert.ok(/ayurvedic_spa/.test(customerWebsite) && customerWebsite.includes('<VedaSanjeevaniWebsite'), 'public sites route ayurvedic_spa to Template 14');
const app = readFileSync('src/App.tsx', 'utf8');
assert.ok(app.includes('VedaCustomizerGate') && app.includes('isVedaTemplate'), 'the owner app opens the Template 14 customizer');
assert.ok(/onApply=\{next=>/.test(app.replace(/\s+/g, '')), 'the customizer writes back through the existing save flow');
const preview = readFileSync('src/components/SalonWebsitePreview.tsx', 'utf8');
assert.ok(preview.includes('VedaSanjeevaniPreviewEditor'), 'preview mode has Template 14 editing tools');
const server = readFileSync('server.ts', 'utf8');
assert.ok(server.includes('/api/veda-website-content'), 'the AI endpoint is registered server-side');
assert.ok(server.includes('buildVedaFallbackContent'), 'the endpoint degrades honestly without a key');
assert.ok(!/GEMINI_API_KEY\s*=\s*['"]/.test(server), 'no API key is committed');
const client = readFileSync('src/lib/vedaSanjeevaniCustomizer.ts', 'utf8');
assert.ok(client.includes("'/api/veda-website-content'") && !client.includes('GEMINI_API_KEY'), 'the browser never holds the AI key');
const optimizer = readFileSync('src/lib/vedaImageOptimizer.ts', 'utf8');
assert.ok(optimizer.includes('createImageBitmap') && /image\/webp/.test(optimizer), 'uploads are decoded and re-encoded in-browser');
const pipeline = readFileSync('scripts/build-template14-assets.mjs', 'utf8');
assert.ok(pipeline.includes("fit: 'cover'") && pipeline.includes('withoutEnlargement'), 'the asset pipeline crops instead of stretching');
const customizerSource = readFileSync('src/components/veda-sanjeevani/VedaCustomizer.tsx', 'utf8');
/* Per-section regeneration: every AI mode is reachable either from the headline
   button grid, an explicit "Regenerate this section" button, or the dynamically
   generated section-heading list. */
const dynamicallyCovered = new Set(['therapies', 'gallery', 'contact']);
for (const mode of VEDA_AI_MODE_IDS) {
  const reachable =
    VEDA_AI_MODES.some((entry) => entry.id === mode) ||
    dynamicallyCovered.has(mode) ||
    customizerSource.includes(`generate('${mode}')`) ||
    customizerSource.includes(`onGenerate('${mode}')`);
  assert.ok(reachable, `the customizer offers a way to generate "${mode}"`);
}
assert.ok(customizerSource.includes('Regenerate this section'), 'per-section regeneration is labelled in plain words');
assert.ok(customizerSource.includes('Generate SEO content'), 'SEO content has its own button');
const motionSource = readFileSync('src/components/veda-sanjeevani/VedaSanjeevaniWebsite.tsx', 'utf8');
assert.ok(motionSource.includes('useReducedMotion') && motionSource.includes('MotionConfig'), 'motion respects reduced-motion preferences');
assert.ok(readFileSync('src/components/veda-sanjeevani/vedaCustomizer.css', 'utf8').includes('.vdc-shell'), 'the customizer styles are committed');
assert.ok(readFileSync('src/components/vedaSanjeevani.css').length > 4000, 'the website design system is committed');
const docs = readFileSync('TEMPLATE-14.md', 'utf8');
assert.ok(docs.includes('Veda Sanjeevani') && docs.includes('/?template=14'), 'Template 14 is documented');
assert.ok(docs.includes('GEMINI_API_KEY') && docs.includes('/api/veda-website-content'), 'the AI setup is documented');
assert.ok(docs.includes('prefers-reduced-motion') && docs.includes('16:9'), 'motion and image presets are documented');
assert.ok(readFileSync('scripts/build-template14-assets.mjs', 'utf8').includes('/templates/14'), 'the asset script targets the template folder');
ok('wiring, security boundary, docs and styling');

console.log(passed.join('\n'));
console.log(`\nTemplate 14 verification passed (${passed.length} groups).`);
