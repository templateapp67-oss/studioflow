import type { SalonService } from '../types';
import { LUXURY_EDITORIAL_IMAGES } from './luxuryEditorial';

export interface ZiyaPromotion {
  id: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  couponCode: string;
  minBookingAmount: number;
  applicableServiceIds: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  maxTotalUses?: number | null;
  maxUsesPerCustomer: number;
  termsConditions: string;
  bannerImageUrl: string;
  displayOrder: number;
  isActive?: boolean;
  isDemo?: boolean;
  demoApproved?: boolean;
  usedCount?: number;
}

export interface ZiyaLoyaltySettings {
  programName: string;
  isEnabled: boolean;
  pointsPer100Inr: number;
  pointsPerVisit: number;
  minEligibleSpendInr: number;
  welcomeBonusPoints: number;
  rulesSummary: string;
  termsConditions: string;
  isDemo?: boolean;
  demoApproved?: boolean;
}

export interface ZiyaLoyaltyReward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  rewardType: 'flat_discount' | 'percentage_discount';
  discountValue: number;
  minBookingAmount: number;
  applicableServiceIds: string[];
  validityDays: number;
  displayOrder: number;
  isActive?: boolean;
  isDemo?: boolean;
}

export interface ZiyaLedgerEntry {
  id: string;
  entryType: 'earn_booking' | 'redeem_reward' | 'reverse_booking' | 'release_reward' | 'admin_adjustment';
  pointsDelta: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  customerId?: string;
  customerEmail?: string;
  bookingId?: string | null;
}

export interface ZiyaRewardVoucher {
  id: string;
  title: string;
  couponCode: string;
  pointsSpent: number;
  status: string;
  expiresAt?: string | null;
  createdAt: string;
}

export interface ZiyaCustomerLoyaltyState {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  ledger: ZiyaLedgerEntry[];
  activeVouchers: ZiyaRewardVoucher[];
  promoUsage: Record<string, number>;
  isFavorite: boolean;
}

export interface ZiyaPublicPayload {
  found: boolean;
  slug?: string;
  promotions: ZiyaPromotion[];
  loyalty: {
    settings: ZiyaLoyaltySettings | null;
    rewards: ZiyaLoyaltyReward[];
  };
  customer: ZiyaCustomerLoyaltyState | null;
}

export interface ZiyaRedemptionRecord {
  id: string;
  promotionId: string | null;
  customerId: string;
  bookingId: string | null;
  couponCode: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: 'reserved' | 'applied' | 'released';
  redeemedAt: string;
}

export interface ZiyaAdminCustomerBalance {
  customerId: string;
  customerName: string;
  customerEmail: string;
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  lastActivityAt: string | null;
}

export interface ZiyaEnquiryRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  serviceName: string;
  message: string;
  preferredDate: string | null;
  status: 'new' | 'read' | 'replied' | 'closed';
  createdAt: string;
}

export interface ZiyaAdminDashboardData {
  salonId: string;
  canManage: boolean;
  promotions: ZiyaPromotion[];
  redemptions: ZiyaRedemptionRecord[];
  loyaltySettings: ZiyaLoyaltySettings | null;
  loyaltyRewards: ZiyaLoyaltyReward[];
  customerBalances: ZiyaAdminCustomerBalance[];
  recentLedger: ZiyaLedgerEntry[];
  enquiries: ZiyaEnquiryRecord[];
}

export const ZIYA_OFFER_BANNER_PRESETS = [
  {
    label: 'Butterfly Haircut Volume',
    url: LUXURY_EDITORIAL_IMAGES.services.butterfly.src,
  },
  {
    label: 'Cascading Layer Haircut',
    url: LUXURY_EDITORIAL_IMAGES.services.layer.src,
  },
  {
    label: 'Haircut & Signature Blowout',
    url: LUXURY_EDITORIAL_IMAGES.services.styling.src,
  },
  {
    label: 'Sculpted Bob Haircut',
    url: LUXURY_EDITORIAL_IMAGES.services.bob.src,
  },
  {
    label: 'Cheekbone Curtain Bangs',
    url: LUXURY_EDITORIAL_IMAGES.services.bangs.src,
  },
  {
    label: 'Curl-by-Curl Dry Cut',
    url: LUXURY_EDITORIAL_IMAGES.services.curly.src,
  },
] as const;

export const ZIYA_DEMO_PROMOTIONS: ZiyaPromotion[] = [
  {
    id: 'ziya-demo-promo-1',
    title: 'First Haircut Welcome Offer',
    description:
      'Enjoy 15% off on women’s haircut services including face-shape consultation, precision sectioning and finish.',
    discountType: 'percentage',
    discountValue: 15,
    couponCode: 'ZIYA15',
    minBookingAmount: 500,
    applicableServiceIds: [],
    startsAt: null,
    endsAt: null,
    maxTotalUses: 500,
    maxUsesPerCustomer: 1,
    termsConditions:
      'Demo studio offer — valid once per customer on women’s haircut bookings of ₹500 or above. Cannot be combined with other coupons.',
    bannerImageUrl: LUXURY_EDITORIAL_IMAGES.services.butterfly.src,
    displayOrder: 1,
    isActive: true,
    isDemo: true,
  },
  {
    id: 'ziya-demo-promo-2',
    title: 'New Look Haircut Special',
    description:
      'Flat ₹200 off on selected women’s haircut packages and full transformation cuts with blowout styling.',
    discountType: 'flat',
    discountValue: 200,
    couponCode: 'NEWLOOK200',
    minBookingAmount: 950,
    applicableServiceIds: ['hs-2', 'hs-3', 'hs-6', 'hs-12', 'hs-14', '__packages__'],
    startsAt: null,
    endsAt: null,
    maxTotalUses: 300,
    maxUsesPerCustomer: 2,
    termsConditions:
      'Demo studio offer — valid on women’s haircut packages, Butterfly Cut, Bob Cut, Pixie Cut, Curly Cut, and Hair Wash & Styling with Haircut (min ₹950).',
    bannerImageUrl: LUXURY_EDITORIAL_IMAGES.services.styling.src,
    displayOrder: 2,
    isActive: true,
    isDemo: true,
  },
  {
    id: 'ziya-demo-promo-3',
    title: 'Layer Haircut Special',
    description:
      'Save 10% on signature Layer Haircut, Step Haircut and cascading multi-layer appointments.',
    discountType: 'percentage',
    discountValue: 10,
    couponCode: 'LAYER10',
    minBookingAmount: 800,
    applicableServiceIds: ['hs-1', 'hs-5'],
    startsAt: null,
    endsAt: null,
    maxTotalUses: 400,
    maxUsesPerCustomer: 2,
    termsConditions:
      'Demo studio offer — valid on Layer Haircut and Step Haircut bookings of ₹800 or above.',
    bannerImageUrl: LUXURY_EDITORIAL_IMAGES.services.layer.src,
    displayOrder: 3,
    isActive: true,
    isDemo: true,
  },
];

export const ZIYA_DEMO_LOYALTY_SETTINGS: ZiyaLoyaltySettings = {
  programName: 'Ziya Style Rewards',
  isEnabled: true,
  pointsPer100Inr: 1,
  pointsPerVisit: 0,
  minEligibleSpendInr: 100,
  welcomeBonusPoints: 0,
  rulesSummary:
    'Earn 1 Ziya Style Point for every ₹100 spent on eligible completed women’s haircut appointments. Redeem points anytime for haircut savings.',
  termsConditions:
    'Sample reward structure for Ziya Women’s Hair Studio — salon admin can customize or approve rules anytime. Points credit automatically when a women’s haircut booking is marked Completed and reverse on cancellations or refunds.',
  isDemo: true,
  demoApproved: false,
};

export const ZIYA_DEMO_LOYALTY_REWARDS: ZiyaLoyaltyReward[] = [
  {
    id: 'ziya-demo-rew-100',
    title: '₹50 Haircut Discount',
    description: 'Redeem 100 Ziya Style Points for ₹50 off any women’s haircut or fringe service.',
    pointsCost: 100,
    rewardType: 'flat_discount',
    discountValue: 50,
    minBookingAmount: 350,
    applicableServiceIds: [],
    validityDays: 90,
    displayOrder: 1,
    isActive: true,
    isDemo: true,
  },
  {
    id: 'ziya-demo-rew-200',
    title: '₹120 Haircut Discount',
    description: 'Redeem 200 Ziya Style Points for ₹120 off precision layer, bob, pixie or face-framing haircuts.',
    pointsCost: 200,
    rewardType: 'flat_discount',
    discountValue: 120,
    minBookingAmount: 550,
    applicableServiceIds: [],
    validityDays: 90,
    displayOrder: 2,
    isActive: true,
    isDemo: true,
  },
  {
    id: 'ziya-demo-rew-300',
    title: '₹200 Haircut Discount',
    description: 'Redeem 300 Ziya Style Points for ₹200 off signature butterfly cuts, curly cuts or wash & styling packages.',
    pointsCost: 300,
    rewardType: 'flat_discount',
    discountValue: 200,
    minBookingAmount: 850,
    applicableServiceIds: [],
    validityDays: 90,
    displayOrder: 3,
    isActive: true,
    isDemo: true,
  },
];

export function formatOfferDiscountBadge(offer: Pick<ZiyaPromotion, 'discountType' | 'discountValue'>): string {
  if (offer.discountType === 'percentage') {
    return `${Number(offer.discountValue)}% OFF`;
  }
  return `FLAT ₹${Number(offer.discountValue).toLocaleString('en-IN')} OFF`;
}

export function formatValidityRange(startsAt?: string | null, endsAt?: string | null): string {
  const fmt = (iso: string) => {
    const parsed = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  if (startsAt && endsAt) return `Valid ${fmt(startsAt)} – ${fmt(endsAt)}`;
  if (endsAt) return `Valid until ${fmt(endsAt)}`;
  if (startsAt) return `Valid from ${fmt(startsAt)}`;
  return 'Ongoing Studio Offer';
}

export function findEligibleServiceForOffer(
  offer: Pick<ZiyaPromotion, 'applicableServiceIds' | 'minBookingAmount' | 'couponCode'>,
  services: SalonService[],
): SalonService | undefined {
  if (!services.length) return undefined;
  const ids = Array.isArray(offer.applicableServiceIds) ? offer.applicableServiceIds : [];
  const meetsMin = (s: SalonService) => Number(s.price || 0) >= Number(offer.minBookingAmount || 0);

  if (ids.length > 0) {
    const exact = services.find(
      (s) =>
        (ids.includes(s.id) ||
          (ids.includes('__packages__') && /package|combo|bundle/i.test(`${s.category || ''} ${s.name || ''}`))) &&
        meetsMin(s),
    );
    if (exact) return exact;

    if (offer.couponCode === 'LAYER10') {
      const layer = services.find((s) => /layer|step/i.test(s.name || '') && meetsMin(s));
      if (layer) return layer;
    }

    const fallbackId = services.find(
      (s) =>
        ids.includes(s.id) ||
        (ids.includes('__packages__') && /package|combo|bundle/i.test(`${s.category || ''} ${s.name || ''}`)),
    );
    if (fallbackId) return fallbackId;
  }

  return services.find(meetsMin) || services[0];
}
