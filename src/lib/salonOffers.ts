export interface SalonOffer {
  id: string;
  title: string;
  discount: string;
  discountPercent?: number;
  code?: string;
  validTill?: string;
  image?: string;
  applicableServices?: string[];
  savingINR?: number;
  active?: boolean;
  type?: string;
}

export const SALON_OFFER_TYPES = ['percentage', 'flat_amount', 'bundle', 'freebie'];

export const OFFER_TYPE_LABELS: Record<string, string> = {
  percentage: 'Percentage Discount',
  flat_amount: 'Flat Rupee Off',
  bundle: 'Package Bundle',
  freebie: 'Complimentary Add-on'
};

export const OFFER_BADGES: Record<string, string> = {
  percentage: 'Save %',
  flat_amount: 'Flat INR Off',
  bundle: 'Combo Special',
  freebie: 'Free Bonus'
};

export const demoSalonOffers: SalonOffer[] = [
  {
    id: 'offer-1',
    title: 'Welcome First Visit Special',
    discount: '20% OFF',
    discountPercent: 20,
    code: 'FIRST20',
    validTill: 'Limited Time',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80',
    applicableServices: ['All Hair Services', 'Skin Facials'],
    savingINR: 500,
    active: true,
    type: 'percentage'
  },
  {
    id: 'offer-2',
    title: 'Festive Beauty Glow Package',
    discount: 'FLAT ₹800 OFF',
    code: 'GLOW800',
    validTill: 'Ends Sunday',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
    applicableServices: ['Bridal Makeover', 'Hair Spa & Keratin'],
    savingINR: 800,
    active: true,
    type: 'flat_amount'
  }
];

export function emptySalonOffer(): SalonOffer {
  return {
    id: `offer-${Date.now()}`,
    title: 'New Salon Offer',
    discount: '10% OFF',
    code: 'NEW10',
    validTill: 'Limited Period',
    applicableServices: ['All Services'],
    active: true,
    type: 'percentage'
  };
}

export function normalizeSalonOffers(offers?: any[]): SalonOffer[] {
  if (!Array.isArray(offers) || offers.length === 0) return demoSalonOffers;
  return offers;
}

export function ownerSalonOffers(offers?: any[]): SalonOffer[] {
  return normalizeSalonOffers(offers);
}

export function publicSalonOffers(salonProfile?: any): SalonOffer[] {
  return normalizeSalonOffers(salonProfile?.offers);
}

export function formatOfferWindow(offer: SalonOffer): string {
  return offer.validTill ? `Valid till ${offer.validTill}` : 'Limited period offer';
}

export function offerApplicableServices(offer: SalonOffer): string {
  return offer.applicableServices ? offer.applicableServices.join(', ') : 'All Services';
}

export function offerCountdownLabel(offer: SalonOffer): string {
  return offer.validTill || 'Special Deal';
}

export function offerDiscountLabel(offer: SalonOffer): string {
  return offer.discount || 'Special Discount';
}

export function offerImage(offer: SalonOffer): string {
  return offer.image || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80';
}

export function offerSavingINR(offer: SalonOffer): number {
  return offer.savingINR || 300;
}

export function offerIsLive(offer: SalonOffer): boolean {
  return offer.active !== false;
}

export function promotionActive(offer?: SalonOffer): boolean {
  return offer?.active !== false;
}

export function offerBookingPrefill(offer: SalonOffer) {
  return {
    offerCode: offer.code || '',
    offerTitle: offer.title || '',
    discount: offer.discount || ''
  };
}

export function removeSalonOffer(offers: SalonOffer[], id: string): SalonOffer[] {
  return offers.filter(o => o.id !== id);
}

export function resetSampleSalonOffers(): SalonOffer[] {
  return demoSalonOffers;
}

export function toggleSalonOffer(offers: SalonOffer[], id: string): SalonOffer[] {
  return offers.map(o => o.id === id ? { ...o, active: !o.active } : o);
}

export function upsertSalonOffer(offers: SalonOffer[], offer: SalonOffer): SalonOffer[] {
  const exists = offers.some(o => o.id === offer.id);
  if (exists) return offers.map(o => o.id === offer.id ? offer : o);
  return [...offers, offer];
}
