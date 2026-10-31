import type { SalonProfile } from '../types';

export interface PromotionOffer {
  id: string;
  title: string;
  description: string;
  badge: string;
  couponCode?: string;
  category?: string;
  validTill?: string;
  isMock?: boolean;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function promotionValidTillLabel(offer: PromotionOffer): string {
  if (!offer.validTill) return 'Valid till 31 Dec 2027';
  const d = new Date(offer.validTill);
  if (isNaN(d.getTime())) return 'Valid till 31 Dec 2027';
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `Valid till ${day} ${month} ${year}`;
}

export function promotionOfferIsLive(offer: PromotionOffer): boolean {
  if (!offer) return false;
  if (!offer.validTill) return true;
  const d = new Date(offer.validTill);
  return isNaN(d.getTime()) || d.getTime() >= Date.now();
}

export function livePromotionOffers(offers?: PromotionOffer[]): PromotionOffer[] {
  if (!Array.isArray(offers)) return [];
  return offers.filter(promotionOfferIsLive);
}

export const promotionsMock: PromotionOffer[] = [
  {
    id: 'promo-1',
    title: 'First Tattoo Special — 15% Off Your Session',
    description: 'Enjoy 15% off your very first custom blackwork, realism portrait, or piercing session above ₹3,000.',
    badge: '15% OFF',
    couponCode: 'IRON15',
    category: 'Custom Blackwork',
    validTill: '2028-12-31T23:59:59.000Z',
    isMock: true
  },
  {
    id: 'promo-2',
    title: 'Flash Friday — Curated Pieces at ₹1,999',
    description: 'Every Friday choose from our hand-painted dark flash wall at an exclusive flat studio rate.',
    badge: '₹1,999 FLAT',
    couponCode: 'FLASHFRIDAY',
    category: 'Flash Art',
    validTill: '2028-12-31T23:59:59.000Z',
    isMock: true
  },
  {
    id: 'promo-3',
    title: 'Matching Tattoos Duo Offer for Couples & Friends',
    description: 'Get matched fine-line or minimalist linework pieces together and receive a special studio reduction.',
    badge: 'DUO SAVE',
    couponCode: 'COUPLE2',
    category: 'Fine-Line Realism',
    validTill: '2028-12-31T23:59:59.000Z',
    isMock: true
  },
  {
    id: 'promo-4',
    title: 'Free Studio Aftercare Kit with Every Large Tattoo',
    description: 'Full sterile medical balm, cleansing wash, and protective second-skin bandage supplied at checkout.',
    badge: 'FREE AFTERCARE',
    couponCode: 'AFTERCARE',
    category: 'Custom Blackwork',
    validTill: '2028-12-31T23:59:59.000Z',
    isMock: true
  },
  {
    id: 'promo-5',
    title: 'Tattoo Cover-Up & Blast-Over Assessment',
    description: 'Comprehensive 45-minute skin tone mapping, laser compatibility review, and free custom cover-up design stencil.',
    badge: 'FREE CONSULT',
    couponCode: 'COVERUP',
    category: 'Tattoo Cover-ups',
    validTill: '2028-12-31T23:59:59.000Z',
    isMock: true
  }
];

export function resolvePromotionOffers(
  profile?: SalonProfile | null,
  explicitOffers?: PromotionOffer[]
): { offers: PromotionOffer[]; usingMock: boolean } {
  if (Array.isArray(explicitOffers) && explicitOffers.length > 0) {
    const live = livePromotionOffers(explicitOffers);
    return { offers: live, usingMock: false };
  }

  const campaign = profile?.promoCampaign;
  if (campaign && campaign.enabled) {
    const ends = campaign.endsAt ? new Date(campaign.endsAt).getTime() : Infinity;
    if (ends >= Date.now()) {
      const liveOffer: PromotionOffer = {
        id: 'campaign-offer',
        title: campaign.headline || 'Studio Flash & Session Special',
        description:
          campaign.customOfferText ||
          campaign.subtext ||
          'Special limited period discount available on booking requests submitted today.',
        badge: campaign.discountPercent ? `${campaign.discountPercent}% OFF` : 'SPECIAL OFFER',
        couponCode: campaign.promoCode || 'PROMO',
        validTill: campaign.endsAt,
        isMock: false
      };
      return { offers: [liveOffer], usingMock: false };
    }
  }

  return {
    offers: livePromotionOffers(promotionsMock),
    usingMock: true
  };
}
