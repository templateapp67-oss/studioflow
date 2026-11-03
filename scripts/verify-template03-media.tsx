import React from 'react';
import { strict as assert } from 'node:assert';
import { act, create } from 'react-test-renderer';
import { AuraImage } from '../src/components/aura/AuraImage';
import { createAuraSiteContent, loadPublicAuraSections, uploadAuraMedia } from '../src/lib/auraTemplateSections';
import { AURA_UNISEX_IMAGES } from '../src/lib/auraUnisex';
import { CATEGORY_TEMPLATES } from '../src/categoryTemplates';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;
await act(async () => { renderer = create(<AuraImage src="https://example.com/broken.jpg" srcSet="https://example.com/broken-2.jpg 2x" alt="Owner photo" fallbackSrc={AURA_UNISEX_IMAGES.heroMain.src} />); });
let image = () => renderer.root.findByType('img');
assert.equal(image().props['data-aura-image-state'], 'loading');
await act(async () => image().props.onError({}));
assert.equal(image().props.src, AURA_UNISEX_IMAGES.heroMain.src);
assert.equal(image().props.srcSet, undefined);
assert.equal(image().props.alt, 'Sample salon photograph');
await act(async () => image().props.onError({}));
assert.equal(image().props['data-aura-image-state'], 'unavailable');
await act(async () => renderer.update(<AuraImage src="https://example.com/new.jpg" alt="New" fallbackSrc={AURA_UNISEX_IMAGES.heroMain.src} />));
assert.equal(image().props.src, 'https://example.com/new.jpg');
await act(async () => image().props.onLoad({}));
assert.equal(image().props['data-aura-image-state'], 'loaded');
await act(async () => renderer.unmount());

const salonId = '12345678-1234-1234-1234-123456789abc';
let storedPath = '';
const client = {
  storage: { from: (bucket: string) => {
    assert.equal(bucket, 'studioflow-media');
    return {
      upload: async (path: string, _file: any, options: any) => { storedPath = path; assert.equal(options.upsert, false); return { data: { path }, error: null }; },
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://example.com/storage/v1/object/public/studioflow-media/${path}` } }),
    };
  } },
  rpc: async (_name: string, { p_slug }: any) => ({ data: rows[p_slug], error: null }),
};
const file = { type: 'image/png', size: 123, name: 'hero.png' } as File;
await assert.rejects(() => uploadAuraMedia({ ...file, size: 0 } as File, 'image', salonId, client), /non-empty/);
await assert.rejects(() => uploadAuraMedia(file, 'image', '------------------------------------', client), /salon media folder/);
const uploaded = await uploadAuraMedia(file, 'image', salonId, client);
assert.match(storedPath, new RegExp(`^${salonId}/template-03/images/.*\\.png$`));
const rows: any = { aura: {
  hero_media: { content: { main: { ...uploaded, srcSet: AURA_UNISEX_IMAGES.heroMain.srcSet } } },
  gallery: { content: { items: [{ id: 'photo', title: 'Owner photo', image: uploaded, visible: true }] } },
  about: { content: { images: { primary: uploaded } } },
} };
const profile = { ...CATEGORY_TEMPLATES.unisex_salon.profile, subdomain: 'aura' } as any;
for (let i = 0; i < 2; i++) {
  const data = await loadPublicAuraSections('aura', 'unisex_salon', client);
  const site = createAuraSiteContent(data, { profile, enabledSections: ['hero', 'gallery', 'about'] });
  assert.equal(site.media.heroMain.src, uploaded.url);
  assert.equal(site.media.heroMain.srcSet, '', 'uploaded image must not inherit bundled srcset');
  assert.equal(site.media.aboutInterior.src, uploaded.url);
  assert.equal(site.media.aboutInterior.srcSet, '');
  assert.equal(site.gallery[0].src, uploaded.url);
  assert.equal(site.gallery[0].srcSet, '');
}
console.log('PASS: Template 03 image loading, fallback/reset, upload path and saved media reload');

// Real manager interaction against a fake durable section store; no real uploads or publication.
const { AuraContentManager } = await import('../src/components/aura/AuraContentManager');
const { AuraVideo } = await import('../src/components/aura/AuraVideo');
const { auraContentEqual, AURA_DEFAULT_SECTION_CONTENT } = await import('../src/lib/auraTemplateSections');
assert(auraContentEqual({ a: { x: 1, y: 2 }, b: [1, 2] }, { b: [1, 2], a: { y: 2, x: 1 } }));
assert(!auraContentEqual({ b: [1, 2] }, { b: [2, 1] }));
const storedRows: any[] = [];
let lastPayload: any[] = [];
const ownerClient: any = {
  rpc: async (name: string) => { assert.equal(name, 'get_aura_editable_salon_id'); return { data: salonId, error: null }; },
  from: () => ({
    select: () => ({ eq: () => ({ eq: async () => ({ data: structuredClone(storedRows), error: null }) }) }),
    upsert: (payload: any[]) => ({ select: async () => {
      lastPayload = structuredClone(payload);
      for (const row of payload) {
        const idx = storedRows.findIndex((item) => item.section_key === row.section_key);
        if (idx < 0) storedRows.push(structuredClone(row)); else storedRows[idx] = structuredClone(row);
      }
      return { data: structuredClone(payload), error: null };
    } }),
  }),
};
(globalThis as any).window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, confirm: () => true };
let manager: any;
await act(async () => { manager = create(<AuraContentManager profile={profile} client={ownerClient} />); });
await act(async () => { manager.root.findByProps({ 'aria-label': 'Edit Hero images' }).props.onClick(); });
await act(async () => { manager.root.findAllByType('button').find((button: any) => button.props.children === 'Edit').props.onClick(); });
const heroUrl = manager.root.findByProps({ 'aria-label': 'Main hero image URL' });
assert.equal(heroUrl.props.type, 'text');
await act(async () => { heroUrl.props.onChange({ target: { value: 'https://example.com/custom.jpg' } }); });
assert.equal(manager.root.findByProps({ 'aria-label': 'Edit Image gallery' }).props.disabled, true, 'navigation cannot discard or strand an unsaved edit');
assert.equal(manager.root.findAllByType('button').find((button: any) => button.props.children === 'Reload from Supabase').props.disabled, true);
await act(async () => { await manager.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
assert.deepEqual(lastPayload.map((row) => row.section_key), ['hero_media']);
assert.equal(lastPayload[0].section_content.main.url, 'https://example.com/custom.jpg');
assert.equal(lastPayload[0].section_content.main.srcSet, '', 'manual URL edits clear old responsive sources');
assert.equal(storedRows.length, 1, 'saving one image does not write untouched default gallery or videos');
await act(async () => { manager.unmount(); });
await act(async () => { manager = create(<AuraContentManager profile={profile} client={ownerClient} />); });
await act(async () => { manager.root.findByProps({ 'aria-label': 'Edit Hero images' }).props.onClick(); });
assert.equal(manager.root.findByProps({ 'aria-label': 'Main hero image URL' }).props.value, 'https://example.com/custom.jpg', 'saved image survives editor remount');
await act(async () => manager.unmount());

// Videos that fail to load get an accessible message and an explicit open link.
let video: any;
await act(async () => { video = create(<AuraVideo src="https://example.com/video.mp4" poster={AURA_UNISEX_IMAGES.heroMain.src} title="Salon video" />); });
await act(async () => { video.root.findByType('video').props.onError(); });
assert.equal(video.root.findByProps({ role: 'status' }).findByType('p').children[0], 'Video unavailable. Please try again later.');
await act(async () => video.unmount());
// A reordered JSONB object is still the default content and must not replace an owner's existing media.
const defaultGalleryReordered = JSON.parse(JSON.stringify(AURA_DEFAULT_SECTION_CONTENT.gallery.items), (_key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).reverse()) : value);
assert(auraContentEqual(defaultGalleryReordered, AURA_DEFAULT_SECTION_CONTENT.gallery.items));
console.log('PASS: Template 03 editor save isolation, manual URL srcset reset, draft protections, reload and failed video state');

const { AuraUnisexWebsite } = await import('../src/components/AuraUnisexWebsite');
const { supabase } = await import('../src/lib/supabase');
const { templateDraft } = await import('../src/lib/templateEntry');
const draft = templateDraft(CATEGORY_TEMPLATES.unisex_salon);
const storefrontRows: any = {
  hero_media: { content: { main: { url: 'https://example.com/main.jpg', srcSet: '' } } },
  gallery: { content: { items: [{ id: 'saved', title: 'Saved gallery', image: { url: 'https://example.com/gallery.jpg' }, visible: true }] } },
  videos: { content: { items: [{ id: 'video', title: 'Uploaded clip', video: { url: 'https://example.com/clip.mp4', mimeType: 'video/mp4', path: `${salonId}/template-03/videos/clip.mp4` }, poster: { url: 'https://example.com/poster.jpg' }, visible: true }] } },
  services: { content: { overrides: [{ serviceId: draft.services[0].id, image: { url: 'https://example.com/service.jpg' }, visible: true }] } },
  staff: { content: { profiles: [{ staffId: draft.stylists[0].id, image: { url: 'https://example.com/staff.jpg' }, visible: true }] } },
};
const originalRpc = supabase.rpc;
(supabase as any).rpc = async (name: string) => ({ data: name === 'get_aura_template_sections' ? structuredClone(storefrontRows) : [], error: null });
let storefront: any;
const props: any = {
  profile: { ...draft.profile, subdomain: 'aura' }, services: draft.services, stylists: draft.stylists,
  galleryPhotos: [], shared: {}, enabledSections: ['hero', 'gallery', 'videos', 'services', 'stylists', 'about'],
  showPackages: false, onBook() {}, onAccount() {}, onMyBookings() {}, onViewSpecialist() {},
};
await act(async () => { storefront = create(<AuraUnisexWebsite {...props} />); });
const srcs = () => storefront.root.findAllByType('img').map((item: any) => item.props.src);
for (const url of ['main', 'gallery', 'poster', 'service', 'staff']) assert(srcs().includes(`https://example.com/${url}.jpg`), `saved ${url} reaches storefront`);
assert(storefront.root.findAllByProps({ 'aria-label': 'Play video: Uploaded clip' }).length === 1);
await act(async () => storefront.unmount());
storefrontRows.gallery = { content: { items: defaultGalleryReordered } };
const ownerGalleryProps = { ...props, galleryPhotos: [{ id: 'owner-photo', url: 'https://example.com/owner-gallery.jpg', title: 'Owner photo', category: 'Salon' }] };
await act(async () => { storefront = create(<AuraUnisexWebsite {...ownerGalleryProps} />); });
assert(srcs().includes('https://example.com/owner-gallery.jpg'), 'JSONB key order must not replace an existing owner gallery with default images');
await act(async () => storefront.unmount());
storefrontRows.gallery.isVisible = false;
await act(async () => { storefront = create(<AuraUnisexWebsite {...props} />); });
assert.equal(storefront.root.findAllByProps({ id: 'aura-gallery' }).length, 0, 'hidden gallery must not expose default or saved media');
await act(async () => storefront.unmount());
(supabase as any).rpc = originalRpc;
console.log('PASS: Template 03 saved hero, gallery, video, service and staff media reach the storefront; hidden gallery stays hidden');

// Content settings drive the actual storefront while booking still carries original IDs.
(supabase as any).rpc = async (name: string) => ({ data: name === 'get_aura_template_sections' ? structuredClone(storefrontRows) : [], error: null });
storefrontRows.gallery = { content: { items: [{ id: 'saved', title: 'Saved gallery', image: { url: 'https://example.com/gallery.jpg' }, visible: true }] }, displayOrder: 5, isVisible: true };
storefrontRows.hero = { content: { title: 'A new welcome', description: 'A saved greeting' }, displayOrder: 90, isVisible: true };
storefrontRows.buttons = { content: { items: [
  { id: 'heroPrimary', label: 'Reserve now', action: 'book', href: '', visible: true },
  { id: 'headerCta', label: 'Hide header button', action: 'book', href: '', visible: false },
] } };
storefrontRows.services.content.overrides[0].displayName = 'Custom service title';
storefrontRows.staff.content.profiles[0].displayName = 'Custom expert name';
let bookingCall: any[] = [];
const bookingProps = { ...props, onBook: (...args: any[]) => { bookingCall = args; } };
await act(async () => { storefront = create(<AuraUnisexWebsite {...bookingProps} />); });
const sections = storefront.root.findAllByType('section').map((node: any) => node.props.id).filter(Boolean);
assert(sections.indexOf('aura-gallery') < sections.indexOf('aura-home'), 'saved order changes real DOM order');
assert.equal(storefront.root.findByType('h1').children[0], 'A new welcome');
assert.equal(storefront.root.findAllByProps({ className: 'au-header-cta' }).length, 0, 'hidden header CTA is removed');
assert(storefront.root.findAllByType('h3').some((node: any) => node.children.includes('Custom service title')));
assert(storefront.root.findAllByType('h3').some((node: any) => node.children.includes('Custom expert name')));
const primary = storefront.root.findAllByType('button').find((node: any) => Array.isArray(node.children) && node.children.includes('Reserve now'));
await act(async () => primary.props.onClick());
assert.equal(bookingCall[0]?.id, draft.services.find((item: any) => item.popular)?.id || draft.services[0].id);
const serviceSelect = storefront.root.findByProps({ id: 'aura-planner-service' });
await act(async () => serviceSelect.props.onChange({ target: { value: draft.services[1].id } }));
const stylistSelect = storefront.root.findByProps({ id: 'aura-planner-stylist' });
await act(async () => stylistSelect.props.onChange({ target: { value: draft.stylists[1].id } }));
const plannerButton = storefront.root.findAllByType('button').find((node: any) => node.props.className === 'au-btn au-btn-primary au-btn-lg au-btn-block' && node.children.includes('Request Appointment'));
// Find the planner button independently of the theme's editable caption.
const submitPlanner = plannerButton || storefront.root.findAllByType('button').find((node: any) => node.props.className === 'au-btn au-btn-primary au-btn-lg au-btn-block' && node.parent?.props?.className === 'au-booking-planner');
assert(submitPlanner);
await act(async () => submitPlanner.props.onClick());
assert.equal(bookingCall[0].id, draft.services[1].id);
assert.equal(bookingCall[1].id, draft.stylists[1].id);
assert(bookingCall[2].date && bookingCall[2].time, 'planner forwards date and requested time');
await act(async () => storefront.unmount());
(supabase as any).rpc = originalRpc;
console.log('PASS: Template 03 edited copy, actual section order, hidden action, service/staff display and planner ID/date/time forwarding');
