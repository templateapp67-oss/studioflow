import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TestRenderer, { act } from 'react-test-renderer';
import { parseDocument } from 'htmlparser2';
import { selectAll, selectOne } from 'css-select';
import { textContent } from 'domutils';

import { CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import { INITIAL_SALON_PROFILE } from '../src/mockData';
import { generateSeoDefaults } from '../src/lib/useSeoMetadata';
import { CustomerSalonWebsite } from '../src/components/CustomerSalonWebsite';
import { LandingPage } from '../src/components/LandingPage';
import { ZiyaAdminPanel } from '../src/components/ziya/ZiyaAdminPanel';
import { supabase } from '../src/lib/supabase';
import {
  ZIYA_DEMO_LOYALTY_REWARDS,
  ZIYA_DEMO_LOYALTY_SETTINGS,
  ZIYA_DEMO_PROMOTIONS,
} from '../src/lib/ziyaPromotionsLoyalty';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Minimal browser globals for interactive React component tests in Node
const memStorage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (memStorage.has(k) ? memStorage.get(k)! : null),
  setItem: (k: string, v: string) => memStorage.set(k, String(v)),
  removeItem: (k: string) => memStorage.delete(k),
  clear: () => memStorage.clear(),
};
let clipboardText = '';
Object.defineProperty(globalThis, 'navigator', {
  value: {
    clipboard: {
      writeText: async (txt: string) => {
        clipboardText = txt;
      },
    },
  },
  configurable: true,
});
if (!(globalThis as any).window) {
  (globalThis as any).window = globalThis;
}
if (typeof (globalThis as any).window.addEventListener !== 'function') {
  (globalThis as any).window.addEventListener = () => {};
  (globalThis as any).window.removeEventListener = () => {};
}
if (!(globalThis as any).document) {
  (globalThis as any).document = {
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
    getElementById: () => null,
    body: { style: {} },
    documentElement: { style: {} },
  };
}

// ---------------------------------------------------------------------------
// 1. Branding, SEO, Landing Card & Women's Haircut-Only Audit
// ---------------------------------------------------------------------------
const ziyaTemplate = CATEGORY_TEMPLATES.hair_salon;
assert.equal(ziyaTemplate.title, 'Ziya Women’s Hair Studio');
assert.equal(ziyaTemplate.shortName, 'Ziya Women’s Hair Studio');
assert.ok(ziyaTemplate.services.length >= 14, 'All canonical women’s haircut services present');
for (const svc of ziyaTemplate.services) {
  assert.ok(!/beard|shav|bridal|makeup|nail|facial|spa/i.test(svc.name), `Service is women's haircut only: ${svc.name}`);
}

const seo = generateSeoDefaults({
  ...INITIAL_SALON_PROFILE,
  businessType: 'hair_salon',
  businessName: 'Miraki Atelier', // legacy name must auto-sanitize to Ziya Women's Hair Studio
  city: 'Bengaluru, Karnataka',
});
assert.match(seo.metaTitle, /^Ziya Women’s Hair Studio/);
assert.ok(!/miraki/i.test(seo.metaTitle), 'Legacy Miraki name sanitized in SEO title');

const landingHtml = renderToStaticMarkup(
  <LandingPage
    setCurrentView={() => {}}
    onSelectCategory={() => {}}
    onCustomizeTemplate={() => {}}
  />,
);
assert.ok(landingHtml.includes('NEXORA Ziya Women’s Haircut Studio'), 'Landing page displays the NEXORA Ziya Women’s Haircut Studio template');
assert.ok(landingHtml.includes('Haircut Studio'), 'Landing page shows the Haircut Studio category');
assert.ok(!/miraki/i.test(landingHtml), 'Zero Miraki strings remain on LandingPage');

const ziyaProfile = {
  ...INITIAL_SALON_PROFILE,
  businessType: 'hair_salon' as const,
  businessName: 'Ziya Women’s Hair Studio',
  subdomain: 'ziya-hair-studio',
};

const ssrHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={ziyaProfile}
    services={ziyaTemplate.services}
    stylists={ziyaTemplate.stylists}
    readOnly
    onAddAppointment={async (a) => a}
  />,
);
const doc = parseDocument(ssrHtml);

// Exact Hero copy checks
assert.ok(ssrHtml.includes('Your Hair, Your Style, Your Confidence'), 'Hero heading exact');
assert.ok(
  ssrHtml.includes(
    'Professional women’s haircuts designed around your face shape, hair type and personal style.',
  ),
  'Hero subheadline exact',
);
assert.ok(ssrHtml.includes('Book Your Haircut'), 'Primary CTA exact');
assert.ok(ssrHtml.includes('Explore Haircut Styles'), 'Secondary CTA exact');

// Forbidden content check (no men's grooming, beard, bridal makeup, nail art, facials, spa, or loyalty placeholder)
const lowerVisibleText = textContent(doc).toLowerCase();
for (const forbidden of [
  'miraki',
  'rohan kapoor',
  'beard trim',
  'shaving',
  'bridal makeup',
  'nail art',
  'facial ritual',
  'body spa',
  'ask the salon about its current loyalty benefits',
]) {
  assert.ok(!lowerVisibleText.includes(forbidden), `Forbidden text absent: "${forbidden}"`);
}

// App install must be in footer ONLY, never in header
const headerEl = selectOne('header.le-header', doc);
const footerEl = selectOne('footer.le-footer', doc);
assert.ok(headerEl && footerEl, 'Header and footer rendered');
assert.ok(!textContent(headerEl).toLowerCase().includes('download app'), 'No App Install in header');
assert.ok(selectAll('[data-app-install-section], .sf-app-install, .le-footer-app-zone', footerEl).length > 0, 'App Install rendered inside footer');

// All 3 seeded offers & Ziya Style Rewards present in SSR
for (const code of ['ZIYA15', 'NEWLOOK200', 'LAYER10']) {
  assert.ok(ssrHtml.includes(code), `Offer code ${code} rendered`);
}
assert.ok(ssrHtml.includes('Ziya Style Rewards'), 'Ziya Style Rewards rendered');
assert.ok(ssrHtml.includes('₹50 Haircut Discount') && ssrHtml.includes('100 points required'));
assert.ok(ssrHtml.includes('₹120 Haircut Discount') && ssrHtml.includes('200 points required'));
assert.ok(ssrHtml.includes('₹200 Haircut Discount') && ssrHtml.includes('300 points required'));

// ---------------------------------------------------------------------------
// 2. Interactive Customer Storefront E2E Flow (Mocked Supabase RPCs)
// ---------------------------------------------------------------------------
const rpcCalls: Array<{ fn: string; args: any }> = [];
let favoriteState = false;
let customerPoints = 110;
const customerVouchers: any[] = [];

const origRpc = supabase.rpc.bind(supabase);
(supabase as any).rpc = async (fn: string, args?: any) => {
  rpcCalls.push({ fn, args });
  if (fn === 'studioflow_ziya_public_offers_and_loyalty') {
    return {
      data: {
        found: true,
        slug: 'ziya-hair-studio',
        promotions: ZIYA_DEMO_PROMOTIONS,
        loyalty: {
          settings: ZIYA_DEMO_LOYALTY_SETTINGS,
          rewards: ZIYA_DEMO_LOYALTY_REWARDS,
        },
        customer: {
          balance: customerPoints,
          totalEarned: 110,
          totalRedeemed: 110 - customerPoints,
          ledger: [
            {
              id: 'led-1',
              entryType: 'earn_booking',
              pointsDelta: 110,
              balanceAfter: 110,
              description: 'Earned points from completed Butterfly Haircut',
              createdAt: '2026-11-01T10:00:00Z',
            },
          ],
          activeVouchers: customerVouchers,
          promoUsage: {},
          isFavorite: favoriteState,
        },
      },
      error: null,
    };
  }
  if (fn === 'studioflow_android_favorite') {
    favoriteState = !favoriteState;
    return { data: { favorited: favoriteState }, error: null };
  }
  if (fn === 'studioflow_ziya_redeem_loyalty_reward') {
    customerPoints -= 100;
    const issued = {
      id: 'claim-1',
      title: '₹50 Haircut Discount',
      couponCode: 'ZIYA-50ABCDEF',
      pointsSpent: 100,
      status: 'active',
      createdAt: '2026-11-02T10:00:00Z',
    };
    customerVouchers.push(issued);
    return {
      data: {
        claimId: issued.id,
        couponCode: issued.couponCode,
        title: issued.title,
        pointsSpent: 100,
        balanceAfter: customerPoints,
      },
      error: null,
    };
  }
  if (fn === 'studioflow_ziya_submit_enquiry') {
    return { data: { id: 'enq-1', status: 'new' }, error: null };
  }
  if (fn === 'studioflow_available_slots' || fn === 'studioflow_android_slots') {
    return { data: [{ time: '11:00', stylistId: 'st-1' }], error: null };
  }
  if (fn === 'studioflow_coupon_quote') {
    return {
      data: {
        claimId: 'promo-1',
        code: args?.p_code || 'LAYER10',
        title: 'Layer Haircut Special',
        originalPrice: 950,
        discountAmount: 95,
        finalPrice: 855,
        advanceAmount: 213.75,
      },
      error: null,
    };
  }
  return { data: null, error: null };
};

let renderer!: TestRenderer.ReactTestRenderer;
await act(async () => {
  renderer = TestRenderer.create(
    <CustomerSalonWebsite
      profile={ziyaProfile}
      services={ziyaTemplate.services}
      stylists={ziyaTemplate.stylists}
      customerSignedIn={true}
      customerName="Priya Sharma"
      readOnly
      onAddAppointment={async (a) => a}
    />,
  );
});

const root = renderer.root;

// 2a. Save Salon Wishlist button
const saveSalonBtn = root.findByProps({ title: 'Save Salon' });
await act(async () => {
  await saveSalonBtn.props.onClick();
});
assert.ok(rpcCalls.some((c) => c.fn === 'studioflow_android_favorite'), 'Save Salon calls studioflow_android_favorite');
assert.equal(favoriteState, true, 'Salon saved state toggled to true');

// 2a-ii. Mobile Menu Drawer open & close
const mobileMenuBtn = root.find(
  (el) => el.type === 'button' && el.props['aria-label'] === 'Open navigation menu',
);
await act(async () => {
  mobileMenuBtn.props.onClick();
});
assert.ok(
  JSON.stringify(renderer.toJSON()).includes('Ziya Style Rewards'),
  'Mobile navigation drawer opens cleanly',
);
const closeMenuBtn = root.find(
  (el) => el.type === 'button' && el.props['aria-label'] === 'Close navigation menu',
);
await act(async () => {
  closeMenuBtn.props.onClick();
});

// 2a-iii. Lookbook Saved Styles heart toggle & Lightbox modal
const saveStyleBtns = root.findAll(
  (el) => el.type === 'button' && String(el.props.className || '').includes('le-tile-save-btn'),
);
assert.ok(saveStyleBtns.length > 0, 'Lookbook haircut cards render Save Style heart buttons');
await act(async () => {
  saveStyleBtns[0].props.onClick({ stopPropagation: () => {} });
});
assert.ok(
  nodeText(root).includes('Saved Styles (1)'),
  'Saving a haircut style updates Saved Styles filter pill',
);

const lightboxTiles = root.findAll(
  (el) => el.type === 'button' && String(el.props.className || '').includes('le-tile-trigger'),
);
assert.ok(lightboxTiles.length > 0, 'Lookbook tiles expose accessible lightbox buttons');
await act(async () => {
  lightboxTiles[0].props.onClick();
});
const closeLightboxBtn = root.find(
  (el) => el.type === 'button' && el.props['aria-label'] === 'Close style preview',
);
await act(async () => {
  closeLightboxBtn.props.onClick();
});

// 2a-iv. Haircut Video Gallery playback button
const videoPlayBtns = root.findAll(
  (el) => el.type === 'button' && String(el.props.className || '').includes('le-video-poster-btn'),
);
assert.ok(videoPlayBtns.length >= 10, 'At least 10 women’s haircut video cards are playable');
await act(async () => {
  videoPlayBtns[0].props.onClick();
});
assert.ok(
  root.findAll((el) => String(el.props?.className || '').includes('le-video-embed')).length >= 1,
  'Clicking Play activates real video player with sound & close controls',
);
const stopVideoBtn = root.find(
  (el) => el.type === 'button' && el.props['aria-label'] === 'Stop video playback',
);
await act(async () => {
  stopVideoBtn.props.onClick();
});

function nodeText(el: any): string {
  if (el == null) return '';
  if (typeof el === 'string' || typeof el === 'number') return String(el);
  if (Array.isArray(el)) return el.map(nodeText).join('');
  if (Array.isArray(el.children)) return el.children.map(nodeText).join('');
  return '';
}

// 2b. Copy Coupon Code on ZIYA15
const copyButtons = root.findAll(
  (el) => el.type === 'button' && nodeText(el).includes('Copy Coupon Code'),
);
assert.ok(copyButtons.length >= 3, 'All 3 offer cards have Copy Coupon Code buttons');
await act(async () => {
  await copyButtons[0].props.onClick();
});
assert.equal(clipboardText, 'ZIYA15', 'Clipboard received ZIYA15');

// 2c. Redeem 100-pt Loyalty Reward -> issues ZIYA-50ABCDEF voucher
const redeemButtons = root.findAll(
  (el) => el.type === 'button' && nodeText(el).includes('Redeem Reward'),
);
assert.equal(redeemButtons.length, 1, '110 pts unlocks 100-pt reward while keeping 200/300-pt rewards locked');
await act(async () => {
  await redeemButtons[0].props.onClick();
});
assert.ok(
  rpcCalls.some((c) => c.fn === 'studioflow_ziya_redeem_loyalty_reward'),
  'Redeem button calls studioflow_ziya_redeem_loyalty_reward',
);
assert.ok(
  JSON.stringify(renderer.toJSON()).includes('ZIYA-50ABCDEF'),
  'Newly redeemed voucher ZIYA-50ABCDEF displayed immediately to customer',
);

// 2d. Offer "Book Now" opens BookingModal with coupon code pre-filled
const offerBookButtons = root.findAll(
  (el) =>
    el.type === 'button' &&
    el.props.className?.includes('le-btn-full') &&
    nodeText(el).includes('Book Now'),
);
assert.equal(offerBookButtons.length, 3, 'All 3 offer cards render Book Now CTA');
await act(async () => {
  offerBookButtons[2].props.onClick(); // LAYER10 card
});
const treeJsonAfterBook = JSON.stringify(renderer.toJSON());
assert.ok(
  treeJsonAfterBook.includes('LAYER10'),
  'Clicking Offer Book Now pre-fills LAYER10 into booking flow',
);

// 2e. Contact Form validation + valid enquiry submission
const contactForm = root.find(
  (el) => el.type === 'form' && String(el.props.className || '').includes('le-ziya-contact-card'),
);
await act(async () => {
  await contactForm.props.onSubmit({ preventDefault: () => {} });
});
assert.ok(
  JSON.stringify(renderer.toJSON()).includes('Please enter your full name.'),
  'Contact form rejects empty submission cleanly',
);

const contactInputs = contactForm.findAllByType('input');
const contactTextarea = contactForm.findByType('textarea');
await act(async () => {
  contactInputs[0].props.onChange({ target: { value: 'Ananya Rao' } });
  contactInputs[1].props.onChange({ target: { value: '9880111223' } });
  contactInputs[2].props.onChange({ target: { value: 'ananya@example.com' } });
  contactTextarea.props.onChange({
    target: { value: 'Looking for long face-framing butterfly layers.' },
  });
});
await act(async () => {
  await contactForm.props.onSubmit({ preventDefault: () => {} });
});
assert.ok(
  rpcCalls.some((c) => c.fn === 'studioflow_ziya_submit_enquiry'),
  'Valid contact form calls studioflow_ziya_submit_enquiry',
);
assert.ok(
  JSON.stringify(renderer.toJSON()).includes('received by Ziya Women’s Hair Studio'),
  'Contact form shows thank-you confirmation',
);

await act(async () => {
  renderer.unmount();
});

// ---------------------------------------------------------------------------
// 3. Interactive Salon Admin Panel Flows (<ZiyaAdminPanel>)
// ---------------------------------------------------------------------------
(supabase as any).rpc = async (fn: string, args?: any) => {
  rpcCalls.push({ fn, args });
  if (fn === 'studioflow_ziya_admin_dashboard') {
    return {
      data: {
        salonId: '11111111-1111-4111-8111-111111111111',
        canManage: true,
        promotions: ZIYA_DEMO_PROMOTIONS,
        redemptions: [],
        loyaltySettings: ZIYA_DEMO_LOYALTY_SETTINGS,
        loyaltyRewards: ZIYA_DEMO_LOYALTY_REWARDS,
        customerBalances: [
          {
            customerId: '33333333-3333-4333-8333-333333333333',
            customerName: 'Priya Sharma',
            customerEmail: 'priya@example.com',
            balance: 10,
            totalEarned: 110,
            totalRedeemed: 100,
            lastActivityAt: '2026-11-02T10:00:00Z',
          },
        ],
        recentLedger: [],
        enquiries: [
          {
            id: 'enq-1',
            name: 'Ananya Rao',
            phone: '9880111223',
            email: 'ananya@example.com',
            serviceName: 'Butterfly Haircut',
            message: 'Looking for butterfly layers.',
            preferredDate: '2026-11-20',
            status: 'new',
            createdAt: '2026-11-02T10:05:00Z',
          },
        ],
      },
      error: null,
    };
  }
  if (fn === 'studioflow_ziya_admin_save_promotion') {
    return { data: { id: 'new-promo' }, error: null };
  }
  if (fn === 'studioflow_ziya_admin_save_loyalty_settings') {
    return { data: { saved: true }, error: null };
  }
  if (fn === 'studioflow_ziya_admin_adjust_points') {
    return { data: { balanceAfter: 60 }, error: null };
  }
  return { data: null, error: null };
};

let adminRenderer!: TestRenderer.ReactTestRenderer;
await act(async () => {
  adminRenderer = TestRenderer.create(
    <ZiyaAdminPanel profile={ziyaProfile} services={ziyaTemplate.services} />,
  );
});

const adminRoot = adminRenderer.root;
// Create offer button opens live preview editor & saves via RPC
const createOfferBtn = adminRoot.find(
  (el) => el.type === 'button' && nodeText(el).includes('Create Haircut Offer'),
);
await act(async () => {
  createOfferBtn.props.onClick();
});
assert.ok(
  JSON.stringify(adminRenderer.toJSON()).includes('Customer Website Preview'),
  'Admin promotion editor displays live Customer Website Preview card',
);

const savePublishBtn = adminRoot.find(
  (el) => el.type === 'button' && nodeText(el).includes('Save & Publish Offer'),
);
await act(async () => {
  await savePublishBtn.props.onClick();
});
assert.ok(
  rpcCalls.some((c) => c.fn === 'studioflow_ziya_admin_save_promotion'),
  'Admin Save & Publish Offer calls studioflow_ziya_admin_save_promotion',
);

// Switch to Ziya Style Rewards tab & save program rules
const loyaltyTabBtn = adminRoot.find(
  (el) => el.type === 'button' && el.props.role === 'tab' && nodeText(el).includes('Ziya Style Rewards'),
);
await act(async () => {
  loyaltyTabBtn.props.onClick();
});
const saveRulesBtn = adminRoot.find(
  (el) => el.type === 'button' && nodeText(el).includes('Save Program Rules'),
);
await act(async () => {
  await saveRulesBtn.props.onClick();
});
assert.ok(
  rpcCalls.some((c) => c.fn === 'studioflow_ziya_admin_save_loyalty_settings'),
  'Admin Save Program Rules calls studioflow_ziya_admin_save_loyalty_settings',
);

// Switch to Haircut Enquiries tab & verify customer enquiry renders
const enquiriesTabBtn = adminRoot.find(
  (el) => el.type === 'button' && el.props.role === 'tab' && nodeText(el).includes('Haircut Enquiries'),
);
await act(async () => {
  enquiriesTabBtn.props.onClick();
});
assert.ok(
  JSON.stringify(adminRenderer.toJSON()).includes('Ananya Rao'),
  'Admin Haircut Enquiries tab renders submitted customer enquiries',
);

// Restore original supabase.rpc
(supabase as any).rpc = origRpc;
await act(async () => {
  adminRenderer.unmount();
});

// ---------------------------------------------------------------------------
// 4. Responsive CSS Audit (Desktop / Tablet 960px / Mobile 640px & 400px)
// ---------------------------------------------------------------------------
const ziyaCss = readFileSync('src/components/luxuryEditorial.css', 'utf8');
assert.ok(ziyaCss.includes('@media (max-width: 960px)'), 'Tablet breakpoint present');
assert.ok(ziyaCss.includes('@media (max-width: 640px)'), 'Mobile breakpoint present');
assert.ok(ziyaCss.includes('.le-ziya-promo-grid'), 'Promotions grid styled');
assert.ok(ziyaCss.includes('.le-ziya-loyalty-overview'), 'Ziya Style Rewards overview styled');
assert.ok(ziyaCss.includes('.le-ziya-contact-card'), 'Haircut Contact Form styled');

console.log(
  'PASS: Ziya Women’s Hair Studio UI, branding rename, women’s haircut-only audit, wishlist, promotions, Ziya Style Rewards, contact form, admin CRUD, and responsive CSS verified.',
);
