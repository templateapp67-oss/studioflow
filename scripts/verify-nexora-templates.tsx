/**
 * NEXORA template library verification.
 *
 * Covers the platform branding contract end to end:
 *  • all 16 templates, each with a NEXORA display name and a clear category
 *  • the exact priority order from the brief (1–16), stable across refresh
 *  • category metadata system (templateId, categoryId, displayName, rank, …)
 *  • category filters + search + both together, on the real components
 *  • every card opens its own preview and its own editor
 *  • the salon owner's own business name and brand stay fully editable
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {act,create} from 'react-test-renderer';
import {CATEGORY_TEMPLATES, ALL_CATEGORY_OPTIONS} from '../src/categoryTemplates';
import {NEXORA_CATEGORIES, NEXORA_TEMPLATE_META, nexoraTemplateMeta, nexoraCategory, compareTemplatesByPriority, sortTemplatesByPriority, nexoraSearchIndex, nexoraMatchesSearch, nexoraCategoryFilters} from '../src/lib/nexoraTemplateCatalogue';
import {NexoraTemplateLibrary} from '../src/components/nexora/NexoraTemplateLibrary';
import {NexoraTemplateGallery} from '../src/components/nexora/NexoraTemplateGallery';
import {LandingPage} from '../src/components/LandingPage';
import {OnboardingWizard} from '../src/components/OnboardingWizard';
import {OwnerWorkspace} from '../src/components/OwnerWorkspace';
import {SaaSDashboard} from '../src/components/SaaSDashboard';
import {TemplatePreviewModal} from '../src/components/TemplatePreviewCards';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
import {DEFAULT_EXTRAS} from '../src/lib/workspaceDefaults';
import {DEFAULT_LOYALTY_CONFIG} from '../src/loyaltyData';
import {applyTemplateDesign} from '../src/lib/templateSelection';
import {templateDraft} from '../src/lib/templateEntry';

/* ------------------------------------------------------------------ *
 * 1 · The exact brief: 16 names, 15 categories, 1–16 priority
 * ------------------------------------------------------------------ */
const EXPECTED = [
  ['hair_salon', 'NEXORA Ziya Women’s Haircut Studio', 'Haircut Studio', "Specialist women's haircut services and modern hairstyles."],
  ['barber', 'NEXORA Royal Blade Men’s Barber Shop', 'Barber Shop', "Men's haircuts, beard grooming and classic barber services."],
  ['beauty_parlour', 'NEXORA Roop Mahal Beauty Parlour', 'Beauty Parlour', 'Beauty services, facials and makeover services.'],
  ['nail_studio', 'NEXORA Pinky Nails Studio', 'Nail Studio', 'Nail art, nail care and nail design services.'],
  ['unisex_salon', 'NEXORA Aura Unisex Salon', 'Unisex Salon', 'Hair, skin, grooming and salon services for men and women.'],
  ['mens_hair_studio', 'NEXORA KeshKraft Men’s Hair Studio', "Men's Hair Studio", "Men's haircuts and men's hair colour only."],
  ['hair_spa', 'NEXORA Kesh Prakriti Hair Spa', 'Hair Spa & Hair Care', 'Hair spa, hair care and related services.'],
  ['skincare_clinic', 'NEXORA Dermacure Aesthetic Clinic', 'Skin & Aesthetic Clinic', 'Skincare, aesthetic and clinic services.'],
  ['makeup_studio', 'NEXORA Vogue Noir Makeup Studio', 'Makeup Studio', 'Professional makeup, occasion looks and makeup academy.'],
  ['bridal_lounge', 'NEXORA Shringaar Royal Bridal Lounge', 'Bridal Makeup', 'Bridal makeup, wedding looks and bridal styling.'],
  ['hair_coloring', 'NEXORA Prism & Chroma Hair Colour Studio', 'Hair Colour Studio', 'Hair colouring, highlights, balayage and colour services.'],
  ['massage_wellness', 'NEXORA Bodhi Tree Massage & Wellness', 'Massage & Wellness', 'Massage, wellness and relaxation services.'],
  ['tattoo_studio', 'NEXORA Iron & Ink Tattoo Studio', 'Tattoo & Body Art', 'Tattoo designs, custom tattoos and body art.'],
  ['lash_brow', 'NEXORA Arch & Flutter Lash & Brow Bar', 'Lash & Brow', 'Eyelash, eyebrow and beauty services.'],
  ['ayurvedic_spa', 'NEXORA Veda Sanjeevani Ayurvedic Spa', 'Ayurvedic Wellness', 'Ayurvedic wellness and spa services.'],
  ['aurelia_beauty_parlour', 'NEXORA Aurelia Beauty Parlour', 'Beauty Parlour', 'A complete beauty studio with hair, colour, skin, bridal, nails and spa services.'],
] as const;

assert.equal(NEXORA_TEMPLATE_META.length, 16, 'exactly sixteen NEXORA templates');
assert.equal(Object.keys(CATEGORY_TEMPLATES).length, 16, 'the template registry holds sixteen templates');
for (const [index, [id, displayName, categoryName, description]] of EXPECTED.entries()) {
  const meta = nexoraTemplateMeta(id)!;
  assert.ok(meta, `${id} has NEXORA metadata`);
  assert.equal(meta.templateId, id, `${id}: template id unchanged`);
  assert.equal(meta.displayName, displayName, `${id}: exact NEXORA display name`);
  assert.ok(meta.displayName.startsWith('NEXORA '), `${id}: every name starts with NEXORA`);
  assert.equal(meta.categoryName, categoryName, `${id}: exact category`);
  const normalised = (value: string) => value.replace(/[’']/g, "'");
  assert.equal(normalised(meta.shortDescription), normalised(description), `${id}: exact short description`);
  assert.equal(meta.priorityRank, index + 1, `${id}: stable priority rank ${index + 1}`);
  assert.equal(meta.displayOrder, index + 1, `${id}: stable display order ${index + 1}`);
  assert.equal(meta.templateNumber, String(index + 1).padStart(2, '0'), `${id}: menu number ${index + 1}`);
  assert.ok(meta.bestFor.length > 10, `${id}: says who the template is best for`);
  assert.ok(meta.services.length >= 5, `${id}: lists its main services`);
  assert.ok(meta.searchTags.length >= 3, `${id}: carries search keywords`);
  assert.ok(meta.icon && meta.badge, `${id}: has an icon and a badge`);
  assert.ok(nexoraCategory(meta.categoryId), `${id}: category ${meta.categoryId} exists`);
}
assert.deepEqual(NEXORA_TEMPLATE_META.map((meta) => meta.templateId), EXPECTED.map(([id]) => id), 'master priority order');
assert.equal(NEXORA_TEMPLATE_META[0].templateId, 'hair_salon', 'Haircut Studio first');
assert.equal(NEXORA_TEMPLATE_META[1].templateId, 'barber', 'Barber Shop second');
assert.equal(NEXORA_TEMPLATE_META[2].templateId, 'beauty_parlour', 'Beauty Parlour third');
assert.equal(NEXORA_TEMPLATE_META[3].templateId, 'nail_studio', 'Nail Studio fourth');

/* Categories: 15 clear business categories. Beauty Parlour intentionally has two templates. */
assert.equal(NEXORA_CATEGORIES.length, 15, 'fifteen categories, no duplicates');
assert.equal(new Set(NEXORA_CATEGORIES.map((c) => c.categoryId)).size, 15, 'category ids are unique');
assert.equal(new Set(NEXORA_CATEGORIES.map((c) => c.categoryName)).size, 15, 'category names are unique');
for (const category of NEXORA_CATEGORIES) {
  assert.match(category.color, /^#[0-9A-F]{6}$/i, `${category.categoryName}: category colour`);
  assert.ok(category.icon, `${category.categoryName}: category icon`);
  assert.ok(category.categoryDescription.length > 10, `${category.categoryName}: category description`);
  assert.ok(category.searchKeywords.length >= 3, `${category.categoryName}: category search keywords`);
  const expectedCount = category.categoryId === 'beauty-parlour' ? 2 : 1;
  assert.equal(NEXORA_TEMPLATE_META.filter((meta) => meta.categoryId === category.categoryId).length, expectedCount, `${category.categoryName}: expected template count ${expectedCount}`);
}
assert.equal(new Set(NEXORA_CATEGORIES.map((c) => c.icon)).size >= 12, true, 'categories use distinct icons');
assert.equal(new Set(NEXORA_CATEGORIES.map((c) => c.color)).size, 15, 'every category has its own colour');
for (const wrong of ['Nexorra', 'NEXORAA', 'Nexora Salon', 'Nexora ']) {
  for (const meta of NEXORA_TEMPLATE_META) assert.ok(!meta.displayName.includes(wrong), `no misspelling ${wrong} in ${meta.displayName}`);
}

/* No duplicate template records, no second KeshKraft. */
assert.equal(NEXORA_TEMPLATE_META.filter((meta) => /keshkraft/i.test(meta.displayName)).length, 1, 'exactly one KeshKraft template');
assert.equal(Object.values(CATEGORY_TEMPLATES).filter((template) => template.id === 'mens_hair_studio').length, 1);
assert.equal(new Set(Object.values(CATEGORY_TEMPLATES).map((template) => template.coverImageUrl)).size, 16, 'every template keeps unique preview artwork');

/* ------------------------------------------------------------------ *
 * 2 · One shared sorting function, stable everywhere
 * ------------------------------------------------------------------ */
const shuffled = [...NEXORA_TEMPLATE_META].sort(() => 0.5 - Math.random()).map((meta) => ({id: meta.templateId}));
assert.deepEqual(sortTemplatesByPriority(shuffled).map((t) => t.id), EXPECTED.map(([id]) => id), 'random input still sorts into priority order');
assert.deepEqual(sortTemplatesByPriority([...EXPECTED].reverse().map(([id]) => ({id}))).map((t) => t.id), EXPECTED.map(([id]) => id), 'reversed input still sorts into priority order');
const alphabetical = [...EXPECTED].map(([id, name]) => ({id, name})).sort((a, b) => a.name.localeCompare(b.name)).map((t) => t.id);
assert.notDeepEqual(alphabetical, EXPECTED.map(([id]) => id), 'the priority order is deliberately not alphabetical');
assert.deepEqual([...EXPECTED].map(([id]) => id).sort(compareTemplatesByPriority ? (a, b) => compareTemplatesByPriority({id: a}, {id: b}) : undefined), EXPECTED.map(([id]) => id), 'the comparator is the single source of ordering');
assert.deepEqual(sortTemplatesByPriority(sortTemplatesByPriority(Object.values(CATEGORY_TEMPLATES))).map((t) => t.id), EXPECTED.map(([id]) => id), 'idempotent: a refresh can never reshuffle');

/* The picker mirrors the same order and names. */
assert.equal(ALL_CATEGORY_OPTIONS.length, 16, 'ALL_CATEGORY_OPTIONS lists every template once');
assert.deepEqual(ALL_CATEGORY_OPTIONS.map((option) => option.id), EXPECTED.map(([id]) => id), 'ALL_CATEGORY_OPTIONS is in priority order');
assert.deepEqual(ALL_CATEGORY_OPTIONS.map((option) => option.title), EXPECTED.map(([, name]) => name), 'ALL_CATEGORY_OPTIONS carries the NEXORA names');
assert.deepEqual(ALL_CATEGORY_OPTIONS.map((option) => option.categoryTag), EXPECTED.map(([, , category]) => category), 'ALL_CATEGORY_OPTIONS carries the categories');
assert.deepEqual(ALL_CATEGORY_OPTIONS.map((option) => option.priorityRank), Array.from({length: 16}, (_, i) => i + 1), 'ALL_CATEGORY_OPTIONS carries ranks 1–16');

/* Category filter options. */
const filters = nexoraCategoryFilters(Object.values(CATEGORY_TEMPLATES));
assert.equal(filters.length, 16, 'All Templates + 15 categories');
assert.equal(filters[0].label, 'All Templates');
assert.equal(filters[0].count, 16, 'All Templates counts all sixteen');
assert.deepEqual(filters.slice(1).map((filter) => filter.label), NEXORA_CATEGORIES.map((category) => category.categoryName), 'filters follow the priority order');
assert.ok(filters.slice(1).every((filter) => filter.count === (filter.id === 'beauty-parlour' ? 2 : 1)), 'category filters count matching templates, including both Beauty Parlour designs');

/* ------------------------------------------------------------------ *
 * 3 · Search behaviour on the real search index
 * ------------------------------------------------------------------ */
const index = new Map(Object.values(CATEGORY_TEMPLATES).map((template) => [template.id, nexoraSearchIndex(nexoraTemplateMeta(template.id)!, template)]));
const searchIds = (query: string) => EXPECTED.map(([id]) => id).filter((id) => nexoraMatchesSearch(index.get(id)!, query));
for (const [query, expected] of [
  ['haircut', ['hair_salon', 'mens_hair_studio']],
  ['barber', ['barber']],
  ['nails', ['nail_studio', 'aurelia_beauty_parlour']],
  ['men', ['barber', 'mens_hair_studio', 'unisex_salon']],
  ['tattoo', ['tattoo_studio']],
  ['ayurveda', ['ayurvedic_spa']],
  ['lash', ['lash_brow']],
  ['colour', ['hair_coloring', 'mens_hair_studio', 'aurelia_beauty_parlour']],
  ['beauty', ['beauty_parlour', 'aurelia_beauty_parlour']],
] as const) {
  const hits = searchIds(query);
  for (const id of expected) assert.ok(hits.includes(id), `search "${query}" finds ${id}`);
  assert.ok(hits.every((id) => index.get(id)!.includes(query.replace(/[^a-z0-9]/g, ' ').trim().split(' ')[0])), `search "${query}" never returns an unrelated template`);
}
assert.ok(searchIds("women's haircut").includes('hair_salon'), 'apostrophes and accents are normalised');
assert.deepEqual(searchIds('nonsense-xyz'), [], 'unmatched queries return nothing');
assert.equal(searchIds('').length, 16, 'an empty query returns all sixteen');

/* ------------------------------------------------------------------ *
 * 4 · Landing page: branding, filters, search, cards
 * ------------------------------------------------------------------ */
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).document = {body: {style: {overflow: ''}}};
(globalThis as any).window = {addEventListener() {}, removeEventListener() {}, setTimeout: () => 0};
(globalThis as any).location = {search: '', href: 'https://owner.test/', origin: 'https://owner.test'};
(globalThis as any).history = {pushState() {}, replaceState() {}};
(globalThis as any).requestAnimationFrame = (callback: any) => 0;
(globalThis as any).cancelAnimationFrame = () => {};

const esc = (value: string) => value.replaceAll('&', '&amp;').replaceAll("'", '&#x27;').replaceAll('"', '&quot;');
const landingHtml = renderToStaticMarkup(<LandingPage setCurrentView={() => {}} />);
assert.ok(landingHtml.includes('NEXORA'), 'landing page shows the NEXORA brand');
assert.ok(landingHtml.includes('data-nexora-logo'), 'landing page shows the NEXORA logo lockup');
assert.ok(landingHtml.includes('data-nexora-brand-mark'), 'template preview cards carry the NEXORA brand mark');
assert.equal((landingHtml.match(/<article/g) || []).length, 16, 'all sixteen cards render');
for (const [, name] of EXPECTED) assert.ok(landingHtml.includes(esc(name)), `${name} is on the landing page`);
for (const [, , category] of EXPECTED) assert.ok(landingHtml.includes(esc(category)), `category ${category} is reachable`);

let page: any;
const chosen: string[] = [];
await act(async () => {
  page = create(<LandingPage setCurrentView={() => {}} onSelectCategory={(id) => chosen.push(id)} />);
});
const cardIds = () => page.root.findAll((node: any) => node.type === 'article' && node.props['data-template-id']).map((node: any) => node.props['data-template-id']);
const filterButton = (id: string) => page.root.findByProps({'data-category-filter': id});
const searchBox = () => page.root.findByProps({'aria-label': 'Search templates by name, category, salon type, service or keyword'});

await act(async () => filterButton('all').props.onClick());
assert.deepEqual(cardIds(), EXPECTED.map(([id]) => id), 'All Templates shows all sixteen in order');
for (const category of NEXORA_CATEGORIES) {
  const expectedIds = EXPECTED
    .filter(([id]) => nexoraTemplateMeta(id)!.categoryId === category.categoryId)
    .map(([id]) => id);
  await act(async () => filterButton(category.categoryId).props.onClick());
  assert.deepEqual(cardIds(), expectedIds, `filter ${category.categoryName} shows its matching templates`);
  assert.equal(filterButton(category.categoryId).props['aria-pressed'], true, `${category.categoryName}: selected filter is marked`);
  const summary = `showing ${expectedIds.length} of 16`;
  assert.ok(page.root.findAll((node: any) => (Array.isArray(node.props?.children) ? node.props.children.join('') : String(node.props?.children ?? '')).includes(summary)).length > 0, `${category.categoryName}: the selection is visible in text`);
}
await act(async () => filterButton('all').props.onClick());
await act(async () => searchBox().props.onChange({target: {value: 'men'}}));
assert.ok(cardIds().includes('barber') && cardIds().includes('mens_hair_studio'), 'search finds both men’s templates');
await act(async () => filterButton('barber-shop').props.onClick());
assert.deepEqual(cardIds(), ['barber'], 'search and filter work together');
await act(async () => searchBox().props.onChange({target: {value: 'nails'}}));
assert.deepEqual(cardIds(), [], 'a template from another category never leaks through the filter');
await act(async () => filterButton('all').props.onClick());
assert.deepEqual(cardIds(), ['nail_studio', 'aurelia_beauty_parlour'], 'the search survives a filter change and finds every matching nail service');
await act(async () => searchBox().props.onChange({target: {value: 'zzz'}}));
assert.deepEqual(cardIds(), [], 'no matches shows the empty state');
assert.ok(page.root.findAll((node: any) => String(node.props?.children).includes('No template matches')).length > 0, 'the empty state is explicit');
await act(async () => page.unmount());

/* ------------------------------------------------------------------ *
 * 5 · Every template opens its own preview and its own editor
 * ------------------------------------------------------------------ */
const previewed: string[] = [];
const customized: string[] = [];
await act(async () => {
  page = create(
    <NexoraTemplateLibrary
      templates={Object.values(CATEGORY_TEMPLATES)}
      onPreview={(id) => previewed.push(id)}
      onCustomize={(id) => customized.push(id)}
    />,
  );
});
for (const [id, name] of EXPECTED) {
  await act(async () => page.root.findByProps({'aria-label': `Open full preview of ${name}`}).props.onClick());
  assert.deepEqual(previewed, [id], `${id}: check preview button opens this template only`);
  previewed.length = 0;
  await act(async () => page.root.findByProps({'aria-label': `Customize ${name}`}).props.onClick());
  assert.deepEqual(customized, [id], `${id}: customize button opens this editor only`);
  customized.length = 0;
}
await act(async () => page.unmount());

/* The landing preview modal opens the matching template and uses its NEXORA name. */
await act(async () => {
  page = create(<LandingPage setCurrentView={() => {}} onSelectCategory={(id) => chosen.push(id)} />);
});
for (const [id, name] of EXPECTED) {
  await act(async () => page.root.findByProps({'aria-label': `Open full preview of ${name}`}).props.onClick());
  const modal = page.root.findByType(TemplatePreviewModal);
  assert.equal(modal.props.templateId, id, `${id}: full preview opens the right template`);
  assert.ok(page.root.findAll((node: any) => node.props?.children === name).length > 0, `${id}: preview title is the NEXORA name`);
  await act(async () => page.root.findByProps({'aria-label': 'Close template preview'}).props.onClick());
  assert.equal(page.root.findAllByType(TemplatePreviewModal).length, 0, `${id}: the preview closes cleanly`);
}
await act(async () => page.unmount());

/* ------------------------------------------------------------------ *
 * 6 · Wizard, owner workspace and dashboard show the same names/order
 * ------------------------------------------------------------------ */
const noop = () => {};
let wizard: any;
await act(async () => {
  wizard = create(
    <OnboardingWizard
      profile={INITIAL_SALON_PROFILE}
      setProfile={noop}
      services={[]}
      setServices={noop}
      stylists={[]}
      setStylists={noop}
      templates={Object.values(CATEGORY_TEMPLATES).reverse()}
      onComplete={noop}
    />,
  );
});
const wizardText = JSON.stringify(wizard.toJSON());
for (const [, name] of EXPECTED) assert.ok(wizardText.includes(name), `wizard lists ${name}`);
const wizardOrder = EXPECTED.map(([, name]) => wizardText.indexOf(name));
assert.deepEqual([...wizardOrder].sort((a, b) => a - b), wizardOrder, 'the wizard lists templates in priority order even when handed a reversed list');
await act(async () => wizard.unmount());

let owner: any;
await act(async () => {
  owner = create(
    <OwnerWorkspace
      profile={{...INITIAL_SALON_PROFILE, businessType: 'hair_salon'}}
      setProfile={noop}
      services={[]}
      setServices={noop}
      stylists={[]}
      setStylists={noop}
      appointments={[]}
      clients={[]}
      setClients={noop}
      loyaltyConfig={DEFAULT_LOYALTY_CONFIG}
      setLoyaltyConfig={noop}
      extras={DEFAULT_EXTRAS}
      setExtras={noop}
      published={null}
      onPublish={async () => {}}
      sessionEmail="owner@example.com"
      templates={Object.values(CATEGORY_TEMPLATES)}
      onOpenPreview={noop}
      onOpenDashboard={noop}
      onOpenWizard={noop}
    />,
    {createNodeMock: () => ({focus() {}, scrollIntoView() {}})},
  );
});
await act(async () => owner.root.findAll((node: any) => node.type === 'button' && typeof node.props?.title === 'string' && node.props.title.includes('Choose template'))[0].props.onClick());
const ownerTemplates = owner.root.findAll((node: any) => node.props?.className === 'template-grid')[0];
assert.ok(ownerTemplates, 'the owner workspace renders the template chooser');
const render = (node: any): string => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(render).join('') : node?.props ? render(node.props.children) : '';
const ownerNames = ownerTemplates.findAllByType('strong').map((node: any) => render(node.props.children));
for (const [, name] of EXPECTED) assert.ok(ownerNames.some((entry: string) => entry.includes(name)), `owner chooser lists ${name}`);
assert.ok(ownerNames[0].includes(EXPECTED[0][1]), 'the owner chooser starts with Haircut Studio');
await act(async () => owner.unmount());

const dashboardHtml = renderToStaticMarkup(
  <SaaSDashboard
    profile={{...INITIAL_SALON_PROFILE, businessType: 'barber'}}
    setProfile={noop}
    services={[]}
    setServices={noop}
    stylists={[]}
    setStylists={noop}
    appointments={[]}
    setAppointments={noop}
    clients={[]}
    initialTab="templates"
    templates={Object.values(CATEGORY_TEMPLATES)}
  />,
);
assert.ok(dashboardHtml.includes('NEXORA Template Library'), 'the dashboard has a NEXORA template library tab');
for (const [, name] of EXPECTED) assert.ok(dashboardHtml.includes(esc(name)), `dashboard lists ${name}`);
assert.ok(dashboardHtml.includes('In use'), 'the dashboard marks the salon’s current template');
assert.equal((dashboardHtml.match(/data-dashboard-template-id="/g) || []).length, 16, 'the dashboard lists every template once');

/* ------------------------------------------------------------------ *
 * 7 · The owner's own brand is never overwritten
 * ------------------------------------------------------------------ */
for (const [id, , ,] of EXPECTED) {
  const template = CATEGORY_TEMPLATES[id];
  assert.ok(!/^NEXORA/.test(template.title), `${id}: template config keeps the salon demo brand, not the platform name`);
  assert.equal(templateDraft(template).profile.businessName, template.title, `${id}: a new salon starts with its demo brand, not the NEXORA name`);
  const renamed = {...INITIAL_SALON_PROFILE, businessType: id as any, businessName: 'My Own Salon Name', logoUrl: '/my-logo.png'};
  const applied = applyTemplateDesign(renamed, template);
  assert.equal(applied.businessName, 'My Own Salon Name', `${id}: applying the template preserves the owner's business name`);
  assert.equal(applied.logoUrl, '/my-logo.png', `${id}: applying the template preserves the owner's logo`);
}
const landingSource = readFileSync('src/components/LandingPage.tsx', 'utf8');
assert.ok(!/StudioFlow/.test(landingSource), 'the customer-facing template library is NEXORA branded only');
assert.ok(!/Nexorra/.test(landingSource) && !/Nexora Salon/.test(landingSource), 'no misspelt brand on the landing page');
for (const file of ['src/components/nexora/NexoraTemplateLibrary.tsx', 'src/components/nexora/NexoraBrand.tsx', 'src/components/nexora/NexoraTemplateGallery.tsx', 'src/components/OnboardingWizard.tsx', 'src/components/OwnerWorkspace.tsx', 'src/components/TemplatePreviewCards.tsx', 'src/components/SaaSDashboard.tsx']) {
  const source = readFileSync(file, 'utf8');
  for (const wrong of ['Nexorra', 'NEXORAA', 'Nexora Salon']) assert.ok(!source.includes(wrong), `${file}: no misspelt brand ${wrong}`);
}
assert.ok(readFileSync('src/components/TemplatePreviewCards.tsx', 'utf8').includes('nexoraDisplayName'), 'the preview modal titles use the NEXORA names');
assert.ok(readFileSync('src/components/SalonWebsitePreview.tsx', 'utf8').includes('nexoraName'), 'the in-editor template switcher uses the NEXORA names');
assert.ok(readFileSync('src/components/SidePanelCustomizer.tsx', 'utf8').includes('nexoraName'), 'the side-panel category switcher uses the NEXORA names');
assert.ok(readFileSync('index.html', 'utf8').includes('NEXORA'), 'the document title is NEXORA');

/* Gallery action isolation. */
const galleryPreview: string[] = [];
const galleryCustomize: string[] = [];
let gallery: any;
await act(async () => {
  gallery = create(
    <NexoraTemplateGallery
      templates={Object.values(CATEGORY_TEMPLATES)}
      activeTemplateId="tattoo_studio"
      onPreview={(id) => galleryPreview.push(id)}
      onCustomize={(id) => galleryCustomize.push(id)}
    />,
  );
});
await act(async () => gallery.root.findByProps({'aria-label': `Customize ${EXPECTED[0][1]}`}).props.onClick());
await act(async () => gallery.root.findByProps({'aria-label': `View full preview of ${EXPECTED[14][1]}`}).props.onClick());
assert.deepEqual(galleryCustomize, ['hair_salon'], 'the dashboard customize button targets exactly one template');
assert.deepEqual(galleryPreview, ['ayurvedic_spa'], 'the dashboard preview button targets exactly one template');
await act(async () => gallery.unmount());

console.log('PASS: NEXORA branding, 16 display names across 15 categories, fixed 1–16 priority order, category filters including both Beauty Parlour templates, search, per-template preview/customize wiring, wizard/owner/dashboard parity, and untouched salon branding.');
