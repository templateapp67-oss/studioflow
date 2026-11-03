/**
 * TEMPLATE 03 — interactive UI verification for Promotions & Offers.
 *
 * Renders the real admin panel and the real customer cards with an in-memory
 * Supabase client to exercise: add, edit, save, cancel, delete (+ confirmation),
 * activate, deactivate, preview, copy coupon, customer-side display, latest-data
 * refresh after an edit and persistence across a refresh/remount.
 */
import React, { useEffect } from 'react';
import assert from 'node:assert/strict';
import { act, create } from 'react-test-renderer';
import { renderToStaticMarkup } from 'react-dom/server';

import { AuraPromotionsAdmin } from '../src/components/aura/AuraPromotionsAdmin';
import { AuraPromotionCards } from '../src/components/aura/AuraPromotionCards';
import { AuraUnisexWebsite } from '../src/components/AuraUnisexWebsite';
import { CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import { INITIAL_SALON_PROFILE } from '../src/mockData';
import { supabase } from '../src/lib/supabase';
import {
  AURA_PROMOTIONS_EVENT,
  auraPreviewDemoOffers,
  normalizeAuraPromotion,
  useAuraPublicOffers,
  validateAuraCoupon,
  type AuraPromotion,
} from '../src/lib/auraPromotions';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(() => cb(Date.now()), 0);
(globalThis as any).cancelAnimationFrame = (handle: any) => clearTimeout(handle);
(globalThis as any).matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
const listeners = new Map<string, Array<(event: any) => void>>();
(globalThis as any).window = {
  CustomEvent: (globalThis as any).CustomEvent,
  addEventListener(type: string, fn: any) { listeners.set(type, [...(listeners.get(type) || []), fn]); },
  removeEventListener(type: string, fn: any) { listeners.set(type, (listeners.get(type) || []).filter((f) => f !== fn)); },
  dispatchEvent(event: any) { (listeners.get(event.type) || []).forEach((fn) => fn(event)); return true; },
  setTimeout: (fn: any, ms: number) => setTimeout(fn, ms),
};
let clipboardText = '';
Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: { writeText: async (text: string) => { clipboardText = text; } } },
  configurable: true,
});
(globalThis as any).location = { search: '', href: 'https://studioflow.test/', origin: 'https://studioflow.test', assign() {} };
(globalThis as any).history = { pushState() {}, replaceState() {} };
(globalThis as any).localStorage = { getItem: () => null, setItem() {}, removeItem() {}, clear() {} };
if (!(globalThis as any).document) {
  (globalThis as any).document = { addEventListener() {}, removeEventListener() {}, getElementById: () => null, body: { style: {} } };
}

const text = (node: any): string =>
  typeof node === 'string' ? node : (node?.children || []).map(text).join('');
const findButtons = (root: any, action: string) =>
  root.findAll((node: any) => node.type === 'button' && node.props['data-action'] === action);
const oneButton = (root: any, action: string) => {
  const found = findButtons(root, action);
  assert.ok(found.length, `Button ${action} exists`);
  return found[0];
};
const setInput = async (root: any, label: string, value: string) => {
  const input = root.findByProps({ 'aria-label': label });
  await act(async () => { input.props.onChange({ target: { value } }); });
};

/* ------------------------------------------------------------------ */
/* In-memory Supabase: the same rows the real RPCs would return.        */
/* ------------------------------------------------------------------ */
const now = Date.now();
const stamp = (days: number) => new Date(now + days * 86_400_000).toISOString().slice(0, 10);
const serviceOptions = CATEGORY_TEMPLATES.unisex_salon.services.slice(0, 4).map((s) => ({
  id: s.id, name: s.name, price: Number(s.price || 0), category: s.category,
}));
const demoRows: AuraPromotion[] = auraPreviewDemoOffers(now).map((offer, index) => ({
  ...offer,
  id: ['aura-p1', 'aura-p2', 'aura-p3'][index],
  startsAt: stamp(-7),
  endsAt: stamp(180),
  applicableServiceIds: index === 0 ? [serviceOptions[0].id] : index === 1 ? [serviceOptions[1].id, serviceOptions[2].id] : [serviceOptions[3].id],
}));
let offers: AuraPromotion[] = demoRows.map((offer) => ({ ...offer }));
let nextId = 4;
const calls: Array<{ name: string; args: any }> = [];

const publicProjection = (row: AuraPromotion) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  discountType: row.discountType,
  discountValue: row.discountValue,
  couponCode: row.couponCode,
  minBookingAmount: row.minBookingAmount,
  applicableServiceIds: row.applicableServiceIds,
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  maxTotalUses: row.maxTotalUses,
  maxUsesPerCustomer: row.maxUsesPerCustomer,
  termsConditions: row.termsConditions,
  bannerImageUrl: row.bannerImageUrl,
  displayOrder: row.displayOrder,
  isDemo: row.isDemo && !row.demoApproved,
  isActive: row.isActive,
  usedCount: 0,
});

const client = {
  rpc: async (name: string, args: any) => {
    calls.push({ name, args });
    if (name === 'studioflow_aura_admin_offers') {
      return { data: { found: true, templateId: 'unisex_salon', canManage: true, salonId: 'owner-aura', offers: offers.map(publicProjection), services: serviceOptions, redemptions: [] }, error: null };
    }
    if (name === 'studioflow_aura_admin_save_offer') {
      const payload = args.p_payload;
      if (payload.id) {
        offers = offers.map((row) => row.id === payload.id ? { ...row, ...payload, id: row.id, applicableServiceIds: payload.applicableServiceIds || [] } : row);
        return { data: { id: payload.id, couponCode: payload.couponCode, isActive: payload.isActive }, error: null };
      }
      const id = `aura-p${nextId++}`;
      offers = [...offers, { ...normalizeAuraPromotion(publicProjection({ ...payload, id } as any))!, id, applicableServiceIds: payload.applicableServiceIds || [] } as AuraPromotion];
      return { data: { id, couponCode: payload.couponCode, isActive: payload.isActive }, error: null };
    }
    if (name === 'studioflow_aura_admin_delete_offer') {
      offers = offers.filter((row) => row.id !== args.p_offer_id);
      return { data: { deletedId: args.p_offer_id }, error: null };
    }
    if (name === 'studioflow_aura_admin_toggle_offer') {
      offers = offers.map((row) => row.id === args.p_offer_id ? { ...row, isActive: args.p_is_active } : row);
      return { data: { id: args.p_offer_id, isActive: args.p_is_active }, error: null };
    }
    if (name === 'studioflow_aura_admin_approve_demo') {
      offers = offers.map((row) => row.id === args.p_offer_id ? { ...row, demoApproved: true, isDemo: false } : row);
      return { data: { id: args.p_offer_id, demoApproved: true }, error: null };
    }
    if (name === 'studioflow_aura_admin_restore_demos') return { data: { restored: 3 }, error: null };
    if (name === 'studioflow_aura_coupon_quote') {
      return { data: { claimId: 'aura-p1', code: 'AURA10', title: 'Welcome to Aura', originalPrice: 650, discountAmount: 65, finalPrice: 585, advanceAmount: 146.25 }, error: null };
    }
    return { data: null, error: { message: `Unexpected RPC ${name}` } };
  },
};

const profile = {
  ...INITIAL_SALON_PROFILE,
  businessType: 'unisex_salon' as const,
  businessName: 'Aura Unisex Salon & Wellness Lounge',
  subdomain: '',
};

/* ------------------------------------------------------------------ */
/* 1. Customer-side cards: all required fields + actions               */
/* ------------------------------------------------------------------ */
const customerOffers = offers.map(publicProjection).map(normalizeAuraPromotion).filter(Boolean) as AuraPromotion[];
let copied = '';
let booked: { offer?: AuraPromotion; service?: any } = {};
let cardsUI: any;
await act(async () => {
  cardsUI = create(
    <AuraPromotionCards
      offers={customerOffers}
      services={CATEGORY_TEMPLATES.unisex_salon.services as any}
      onCopy={(code) => { copied = code; }}
      onBook={(offer, service) => { booked = { offer, service }; }}
    />,
  );
});
const cardsJSON = JSON.stringify(cardsUI.toJSON());
assert.equal((cardsJSON.match(/au-offer-voucher/g) || []).length, 3, 'TEST 6: three customer offer cards');
for (const value of ['Welcome to Aura', 'Hair Style Special', 'Midweek Salon Offer', 'AURA10', 'STYLE200', 'AURAMID15', '10% OFF', '₹200 OFF', '15% OFF', 'Demo Offer', 'Terms and conditions', 'Starts', 'Expires', 'Copy Coupon', 'Book Now']) {
  assert.ok(cardsJSON.includes(value), `Customer card shows “${value}”`);
}
assert.ok(cardsJSON.includes('service-haircut-760.webp'), 'Offer image rendered');
assert.equal(findButtons(cardsUI.root, 'copy-coupon').length, 3, 'TEST 7: every card has a Copy Coupon button');
assert.equal(findButtons(cardsUI.root, 'book-now').length, 3, 'Every card has a Book Now button');
await act(async () => { findButtons(cardsUI.root, 'copy-coupon')[0].props.onClick(); });
assert.equal(copied, 'AURA10', 'Copy Coupon writes the coupon code');
await act(async () => { findButtons(cardsUI.root, 'book-now')[0].props.onClick(); });
assert.equal(booked.offer?.couponCode, 'AURA10', 'Book Now forwards the coupon code into the booking flow');
assert.ok(booked.service, 'Book Now forwards an existing service');
await act(async () => cardsUI.unmount());

/* ------------------------------------------------------------------ */
/* 2. Admin panel: full CRUD, activation and preview                    */
/* ------------------------------------------------------------------ */
let admin: any;
await act(async () => { admin = create(<AuraPromotionsAdmin profile={profile as any} services={CATEGORY_TEMPLATES.unisex_salon.services as any} client={client} />); });
const adminJSON = () => JSON.stringify(admin.toJSON());
assert.ok(adminJSON().includes('Promotions & Offers'), 'Admin panel renders');
assert.equal(findButtons(admin.root, 'add-new-offer').length, 1, 'TEST 1: Add New Offer available in the dashboard');
assert.ok(adminJSON().includes('Demo Offer'), 'Seeded offers show a clear Demo Offer label');
assert.equal(findButtons(admin.root, 'edit-offer').length, 3, 'Edit available for every offer');
assert.equal(findButtons(admin.root, 'save-offer').length, 3, 'Save available for every offer');
assert.equal(findButtons(admin.root, 'cancel-edit').length, 3, 'Cancel available for every offer');
assert.equal(findButtons(admin.root, 'delete-offer').length, 3, 'Delete available for every offer');
assert.equal(findButtons(admin.root, 'activate-offer').length, 3, 'Activate available for every offer');
assert.equal(findButtons(admin.root, 'deactivate-offer').length, 3, 'Deactivate available for every offer');
assert.equal(findButtons(admin.root, 'preview-offer').length, 3, 'Preview available for every offer');

// TEST 1 — Add new offer with every required field.
await act(async () => { oneButton(admin.root, 'add-new-offer').props.onClick(); });
assert.ok(admin.root.findByProps({ 'aria-label': 'Offer title' }), 'Add New Offer form opens');
for (const label of ['Offer title', 'Coupon code', 'Offer description', 'Discount type', 'Discount value', 'Minimum booking amount', 'Start date', 'Expiry date', 'Usage limit', 'Per-customer usage limit', 'Offer image URL', 'Terms and conditions', 'Display order', 'Active status', 'Applicable existing services']) {
  assert.ok(admin.root.findAll((node: any) => node.props && node.props['aria-label'] === label).length > 0 || adminJSON().includes(label), `Admin form has ${label}`);
}
await setInput(admin.root, 'Offer title', 'Weekend Wellness Deal');
await setInput(admin.root, 'Coupon code', 'WEEKEND20');
await setInput(admin.root, 'Offer description', 'Save on existing wellness services this weekend.');
await setInput(admin.root, 'Discount value', '20');
await setInput(admin.root, 'Minimum booking amount', '600');
await setInput(admin.root, 'Terms and conditions', 'One use per customer on existing services.');
await act(async () => { admin.root.findByProps({ 'aria-label': 'Active status' }).props.onChange({ target: { checked: true } }); });
await act(async () => { admin.root.findByProps({ 'aria-label': `Apply to ${serviceOptions[0].name}` }).props.onChange({ target: { checked: true } }); });
await act(async () => { oneButton(admin.root, 'save-offer').props.onClick(); });
await act(async () => { await Promise.resolve(); });
const saveCall = calls.find((c) => c.name === 'studioflow_aura_admin_save_offer');
assert.ok(saveCall, 'TEST 1: Save Offer calls the Supabase save RPC');
assert.equal(saveCall!.args.p_payload.title, 'Weekend Wellness Deal');
assert.equal(saveCall!.args.p_payload.couponCode, 'WEEKEND20');
assert.equal(saveCall!.args.p_payload.discountType, 'percentage');
assert.equal(Number(saveCall!.args.p_payload.discountValue), 20);
assert.equal(saveCall!.args.p_payload.applicableServiceIds[0], serviceOptions[0].id, 'Applicable existing service IDs saved');
assert.ok(saveCall!.args.p_payload.startsAt && saveCall!.args.p_payload.endsAt, 'Validity dates saved');
assert.equal(offers.length, 4, 'New offer persisted');
assert.ok(adminJSON().includes('Weekend Wellness Deal'), 'New offer visible in dashboard');

// TEST 2 — Edit an offer, then check the customer website uses the latest data.
await act(async () => { findButtons(admin.root, 'edit-offer')[0].props.onClick(); });
await setInput(admin.root, 'Offer title', 'Welcome to Aura — Updated');
await act(async () => { oneButton(admin.root, 'save-offer').props.onClick(); });
await act(async () => { await Promise.resolve(); });
const editCall = calls.filter((c) => c.name === 'studioflow_aura_admin_save_offer').at(-1)!;
assert.ok(editCall.args.p_payload.id, 'Edit sends an existing promotion id');
assert.equal(editCall.args.p_payload.title, 'Welcome to Aura — Updated');
assert.ok(adminJSON().includes('Welcome to Aura — Updated'), 'Edited offer shown in dashboard');

// Cancel does not save.
const savesBeforeCancel = calls.filter((c) => c.name === 'studioflow_aura_admin_save_offer').length;
await act(async () => { findButtons(admin.root, 'edit-offer')[0].props.onClick(); });
await act(async () => { findButtons(admin.root, 'cancel-edit').find((b: any) => !b.props.disabled)!.props.onClick(); });
assert.equal(calls.filter((c) => c.name === 'studioflow_aura_admin_save_offer').length, savesBeforeCancel, 'Cancel leaves the offer unchanged');
assert.equal(admin.root.findAllByProps({ 'data-aura-form': 'edit' }).length, 0, 'Cancel closes the edit form');

// TEST 5 / 4 — Deactivate and activate.
await act(async () => { findButtons(admin.root, 'deactivate-offer')[0].props.onClick(); });
await act(async () => { await Promise.resolve(); });
assert.equal(calls.filter((c) => c.name === 'studioflow_aura_admin_toggle_offer').at(-1)?.args.p_is_active, false, 'Deactivate calls toggle RPC');
assert.ok(adminJSON().includes('inactive'), 'Deactivated offer flagged in dashboard');
await act(async () => { findButtons(admin.root, 'activate-offer').find((b: any) => !b.props.disabled)!.props.onClick(); });
await act(async () => { await Promise.resolve(); });
assert.equal(calls.filter((c) => c.name === 'studioflow_aura_admin_toggle_offer').at(-1)?.args.p_is_active, true, 'Activate calls toggle RPC');

// Preview shows the customer card.
await act(async () => { findButtons(admin.root, 'preview-offer')[0].props.onClick(); });
assert.ok(admin.root.findByProps({ 'data-preview-offer': 'true' }), 'Preview dialog opens');
assert.ok(JSON.stringify(admin.toJSON()).includes('Copy Coupon'), 'Preview shows the customer Copy Coupon button');
assert.ok(JSON.stringify(admin.toJSON()).includes('Book Now'), 'Preview shows the customer Book Now button');
await act(async () => { oneButton(admin.root, 'close-preview').props.onClick(); });

// Admin copy coupon.
await act(async () => { findButtons(admin.root, 'copy-code')[0].props.onClick(); });
assert.ok(clipboardText.length > 0, 'TEST 7: copy coupon works in the dashboard too');

// TEST 3 — Delete with a confirmation step.
await act(async () => { findButtons(admin.root, 'delete-offer').at(-1)!.props.onClick(); });
assert.ok(admin.root.findByProps({ 'data-confirm-delete': 'true' }), 'Delete shows a confirmation before removing the offer');
assert.ok(JSON.stringify(admin.toJSON()).includes('Delete this offer?'), 'Confirmation text is clear');
await act(async () => { oneButton(admin.root, 'keep-offer').props.onClick(); });
assert.equal(admin.root.findAllByProps({ 'data-confirm-delete': 'true' }).length, 0, 'Confirmation can be cancelled');
const beforeDelete = offers.length;
await act(async () => { findButtons(admin.root, 'delete-offer').at(-1)!.props.onClick(); });
await act(async () => { oneButton(admin.root, 'confirm-delete').props.onClick(); });
await act(async () => { await Promise.resolve(); });
assert.ok(calls.some((c) => c.name === 'studioflow_aura_admin_delete_offer'), 'Confirmed delete calls the delete RPC');
assert.equal(offers.length, beforeDelete - 1, 'Offer deleted');

// Approve demo removes the label.
const approveButton = findButtons(admin.root, 'approve-demo');
if (approveButton.length) {
  await act(async () => { approveButton[0].props.onClick(); });
  await act(async () => { await Promise.resolve(); });
  assert.ok(calls.some((c) => c.name === 'studioflow_aura_admin_approve_demo'), 'Demo approval calls the approve RPC');
}

// TEST 13 — Data remains saved after a refresh / remount.
await act(async () => admin.unmount());
await act(async () => { admin = create(<AuraPromotionsAdmin profile={profile as any} services={CATEGORY_TEMPLATES.unisex_salon.services as any} client={client} />); });
assert.ok(adminJSON().includes('Welcome to Aura — Updated'), 'Edited offer still saved after refresh');
assert.equal(findButtons(admin.root, 'edit-offer').length, offers.length, 'All saved offers reload from Supabase');
await act(async () => admin.unmount());

/* ------------------------------------------------------------------ */
/* 3. Customer website refetches after an admin edit                    */
/* ------------------------------------------------------------------ */
let publicOffers = offers.map(publicProjection);
(supabase as any).rpc = async (name: string, args: any) => {
  calls.push({ name, args });
  if (name === 'studioflow_aura_public_offers') return { data: { found: true, templateId: 'unisex_salon', offers: publicOffers.filter((o) => o.isActive) }, error: null };
  if (name === 'studioflow_aura_coupon_quote') return { data: { claimId: 'aura-p1', code: 'AURA10', title: 'Welcome to Aura', originalPrice: 650, discountAmount: 65, finalPrice: 585, advanceAmount: 146.25 }, error: null };
  return { data: null, error: null };
};
let hook: any;
function HookHarness() {
  hook = useAuraPublicOffers('aura-unisex-salon');
  return <div>{hook.offers.map((offer: AuraPromotion) => offer.title).join(' | ')}</div>;
}
let hookUI: any;
await act(async () => { hookUI = create(<HookHarness />); });
await act(async () => { await Promise.resolve(); });
assert.equal(hook.offers.length, publicOffers.filter((o) => o.isActive).length, 'Customer website loads active Supabase offers');
assert.equal(hook.source, 'supabase', 'Customer website uses Supabase data (not a hard-coded list)');
publicOffers = publicOffers.map((row) => row.couponCode === 'STYLE200' ? { ...row, title: 'Hair Style Special — Live Edit' } : row);
await act(async () => { (globalThis as any).window.dispatchEvent(new (globalThis as any).CustomEvent(AURA_PROMOTIONS_EVENT)); });
await act(async () => { await Promise.resolve(); });
assert.ok(hook.offers.some((offer: AuraPromotion) => offer.title === 'Hair Style Special — Live Edit'), 'TEST 6: customer website updates from the latest Supabase data after an edit');
await act(async () => hookUI.unmount());

/* ------------------------------------------------------------------ */
/* 4. Coupon validation + secure final payable amount                   */
/* ------------------------------------------------------------------ */
const quote = await validateAuraCoupon('aura-unisex-salon', [serviceOptions[0].id], 'aura10', client);
assert.equal(quote.originalPrice, 650);
assert.equal(quote.discountAmount, 65, 'TEST 11: server-side discount calculation');
assert.equal(quote.finalPrice, 585, 'Final payable amount returned by the backend');
assert.equal(quote.advanceAmount, 146.25);

/* ------------------------------------------------------------------ */
/* 5. Full Template 03 website still renders its offers section        */
/* ------------------------------------------------------------------ */
(supabase as any).rpc = async (name: string) => {
  if (name === 'studioflow_aura_public_offers') return { data: { found: false, offers: [] }, error: null };
  return { data: null, error: null };
};
const websiteHtml = renderToStaticMarkup(
  React.createElement(AuraUnisexWebsite as any, {
    profile: { ...profile, subdomain: '' },
    services: CATEGORY_TEMPLATES.unisex_salon.services,
    stylists: CATEGORY_TEMPLATES.unisex_salon.stylists,
    galleryPhotos: [],
    shared: { readOnly: true },
    enabledSections: ['promo'],
    showPackages: false,
    onBook: () => {},
    onAccount: () => {},
    onMyBookings: () => {},
    onViewSpecialist: () => {},
  } as any),
);
assert.ok(websiteHtml.includes('id="salon-promo"'), 'Template 03 promotions section present');
assert.equal((websiteHtml.match(/class="au-offer-voucher"/g) || []).length, 3, 'Template 03 renders 3 demo offer cards in preview');
assert.ok(websiteHtml.includes('Demo Offer'), 'Demo Offer label on the customer website');
assert.ok(websiteHtml.includes('Copy Coupon') && websiteHtml.includes('Book Now'), 'Copy Coupon and Book Now on the customer website');
assert.ok(websiteHtml.includes('Terms and conditions'), 'Terms and conditions on the customer website');

console.log('PASS: Template 03 Promotions & Offers UI — add/edit/save/cancel/delete(+confirm)/activate/deactivate/preview, copy coupon, customer cards, server discount quote, latest-data refresh and persistence after remount verified.');
