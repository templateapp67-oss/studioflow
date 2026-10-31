import type { SalonOffer, SalonProfile, SalonService } from '../types';
import { ARCH_FLUTTER_ART } from './archFlutter';

export type { SalonOffer };

export const SALON_OFFER_TYPES = ['percent', 'flat', 'combo', 'free_addon'];

export const OFFER_TYPE_LABELS: Record<string, string> = {
  percent: 'Percentage off',
  flat: 'Flat ₹ off',
  combo: 'Combo price',
  free_addon: 'Free add-on'
};

export const OFFER_BADGES: string[] = [
  'New Client',
  'Most Popular',
  'Bridal Special',
  'Limited Slots',
  'Referral',
  'Festive',
  'Weekend',
  'Online Only'
];

export const ARCH_FLUTTER_BUSINESS_TYPE = 'lash_brow';

/** Real Diwali (amavasya) dates used to derive the festive offer window. */
export const DEEPAVALI_DATES = [
  '2022-10-24',
  '2023-11-12',
  '2024-10-31',
  '2025-10-20',
  '2026-11-08',
  '2027-10-29',
  '2028-10-17',
];

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseISODate = (value?: string): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const toTime = (now: number | Date) => (now instanceof Date ? now.getTime() : now);
const inr = (n: number) => n.toLocaleString('en-IN');

/** "2026-11-14" → "14 Nov 2026"; unparsable input renders as an empty string. */
export function formatOfferDateIN(value?: string): string {
  const d = parseISODate(value);
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Sunday that closes the week of the next upcoming Diwali. */
export function nextFestiveWeekEnd(now: number | Date = Date.now()): string {
  const t = toTime(now);
  const today = startOfDay(new Date(t));
  const diwalis = DEEPAVALI_DATES.map(parseISODate).filter((d): d is Date => !!d);
  let next = diwalis.find((d) => d.getTime() >= today.getTime());
  if (!next) {
    const last = diwalis[diwalis.length - 1];
    next = new Date(last.getFullYear() + 1, last.getMonth(), last.getDate());
  }
  let weekEnd = new Date(next.getTime() + ((7 - next.getDay()) % 7) * DAY_MS);
  if (weekEnd.getTime() <= t) weekEnd = new Date(weekEnd.getTime() + 7 * DAY_MS);
  return isoDate(weekEnd);
}

/**
 * The six bundled sample offers for Template 13 (Arch & Flutter). Other
 * templates never receive demo offers.
 */
export function demoSalonOffers(businessType?: string, now: number | Date = Date.now()): SalonOffer[] {
  if (businessType !== ARCH_FLUTTER_BUSINESS_TYPE) return [];
  const t = toTime(now);
  const start = startOfDay(new Date(t));
  const from = isoDate(start);
  const welcomeEnd = isoDate(new Date(start.getTime() + 60 * DAY_MS));
  const festiveEnd = nextFestiveWeekEnd(t);
  const base = { isDemo: true, isActive: true, validFrom: from };
  return [
    {
      ...base,
      id: 'af-offer-welcome',
      title: 'Glow Up Welcome Offer',
      badge: 'New Client',
      offerType: 'percent',
      couponCode: 'FLUTTER20',
      originalPriceINR: 2499,
      offerPriceINR: 1999,
      discountPercent: 20,
      discountValue: 20,
      description: 'First visit? Enjoy 20% off your first full lash set — classic, volume or hybrid — including a lash health check and a written aftercare plan.',
      terms: 'Valid on first bookings only. Cannot be combined with other coupons. One redemption per client.',
      validTo: welcomeEnd,
      applicableServices: ['af-1', 'af-5'],
    },
    {
      ...base,
      id: 'af-offer-combo',
      title: 'Lash + Brow Combo',
      badge: 'Most Popular',
      offerType: 'combo',
      couponCode: '',
      originalPriceINR: 5298,
      offerPriceINR: 4499,
      discountValue: 799,
      description: 'Russian Volume full set paired with a signature brow shape and lamination in one sitting — our most booked combination for a complete eye refresh.',
      terms: 'Combo price applies when both services are booked in the same visit. Refills excluded.',
      validTo: welcomeEnd,
      applicableServices: ['af-5', 'af-33'],
    },
    {
      ...base,
      id: 'af-offer-bridal',
      title: 'Bridal Eye Package',
      badge: 'Bridal Special',
      offerType: 'combo',
      couponCode: '',
      originalPriceINR: 9499,
      offerPriceINR: 7999,
      discountValue: 1500,
      description: 'Signature bridal eye ritual with mega-volume set, custom mapping, under-eye care and a touch-up kit timed to your wedding events for a flawless finish.',
      terms: 'Includes one trial mapping session and a touch-up within 30 days. Advance booking required.',
      validTo: welcomeEnd,
      applicableServices: ['af-8', 'af-33'],
    },
    {
      ...base,
      id: 'af-offer-happy-hours',
      title: 'Weekday Happy Hours',
      badge: 'Limited Slots',
      offerType: 'percent',
      couponCode: 'HAPPY15',
      originalPriceINR: 2499,
      offerPriceINR: 2124,
      discountPercent: 15,
      discountValue: 15,
      description: 'Weekday afternoon slots (Mon–Thu, before 4 PM) carry 15% off any full set — a quiet studio, extra mapping time and flexible rescheduling.',
      terms: 'Applies to weekday bookings before 4 PM only. Slot availability varies by artist.',
      validTo: welcomeEnd,
      applicableServices: ['af-1', 'af-5', 'af-6'],
    },
    {
      ...base,
      id: 'af-offer-refer',
      title: 'Refer a Friend',
      badge: 'Referral',
      offerType: 'flat',
      couponCode: 'BESTIE500',
      originalPriceINR: 0,
      offerPriceINR: 0,
      discountValue: 500,
      description: 'Bring a friend to their first appointment and you both receive ₹500 off — credited to your next visit as a loyalty thank-you from the studio.',
      terms: 'Credit applies to your next booking after your friend completes a paid first visit.',
      validTo: welcomeEnd,
      applicableServices: [],
    },
    {
      ...base,
      id: 'af-offer-festive',
      title: 'Festive Season Offer',
      badge: 'Festive',
      offerType: 'free_addon',
      couponCode: '',
      originalPriceINR: 0,
      offerPriceINR: 0,
      discountValue: 1999,
      description: 'Through Diwali week every full set includes a complimentary under-eye brightening ritual worth ₹1,999 — our festive gift for glowing holiday looks.',
      terms: 'Free add-on with any full lash set during the festive week. While slots last.',
      validTo: festiveEnd,
      applicableServices: ['af-1', 'af-5', 'af-6', 'af-8'],
    },
  ];
}

export function emptySalonOffer(now: number = Date.now(), index = 0): SalonOffer {
  return {
    id: `offer-${now}-${index}`,
    title: 'New offer',
    description: '',
    terms: '',
    badge: 'New',
    offerType: 'percent',
    discountPercent: 10,
    discountValue: 10,
    couponCode: '',
    originalPriceINR: 0,
    offerPriceINR: 0,
    applicableServices: [],
    validFrom: '',
    validTo: '',
    isActive: false,
    isDemo: false
  };
}

const offersOf = (target: any): SalonOffer[] =>
  Array.isArray(target) ? target : (Array.isArray(target?.promoOffers) ? target.promoOffers : []);

const withOffers = (target: any, offers: SalonOffer[]) =>
  Array.isArray(target) ? offers : { ...(target || {}), promoOffers: offers };

export function normalizeSalonOffers(offers?: any, businessType: string = ARCH_FLUTTER_BUSINESS_TYPE): SalonOffer[] {
  const list = offersOf(offers);
  return list.length ? list : demoSalonOffers(businessType);
}

/** Every stored offer, including hidden and expired ones (dashboard view). */
export function ownerSalonOffers(target?: any): SalonOffer[] {
  return offersOf(target);
}

/** Only live offers (public storefront view). */
export function publicSalonOffers(target?: any, now: number | Date = Date.now()): SalonOffer[] {
  const t = toTime(now);
  return offersOf(target).filter((offer) => offerIsLive(offer, t));
}

/** Live = active, started and not expired (the validTo day itself still counts). */
export function offerIsLive(offer: SalonOffer, now: number | Date = Date.now()): boolean {
  const t = toTime(now);
  if (offer.isActive === false || offer.active === false) return false;
  const from = parseISODate(offer.validFrom);
  const to = parseISODate(offer.validTo);
  if (from && from.getTime() > t) return false;
  if (to && to.getTime() + DAY_MS <= t) return false;
  return true;
}

export function offerCountdownLabel(offer: SalonOffer, now: number | Date = Date.now()): string {
  const t = toTime(now);
  if (!offer.validTo) return 'No end date';
  const to = parseISODate(offer.validTo);
  if (!to) return 'No end date';
  if (to.getTime() + DAY_MS <= t) return `Expired on ${formatOfferDateIN(offer.validTo)}`;
  const days = Math.max(1, Math.ceil((to.getTime() + DAY_MS - t) / DAY_MS));
  return `Ends in ${days} days`;
}

export function formatOfferWindow(offer: SalonOffer): string {
  const from = formatOfferDateIN(offer.validFrom);
  const to = formatOfferDateIN(offer.validTo);
  if (!to) return from ? `From ${from}` : 'No end date';
  return from ? `${from} – ${to}` : `Till ${to}`;
}

export function offerDiscountLabel(offer: SalonOffer): string {
  switch (offer.offerType) {
    case 'percent':
      return `${offer.discountPercent ?? Math.round(((offer.originalPriceINR ?? 0) - (offer.offerPriceINR ?? 0)) / Math.max(1, offer.originalPriceINR ?? 1) * 100)}% off`;
    case 'combo':
      return `Combo price · save ₹${inr(Math.max(0, (offer.originalPriceINR ?? 0) - (offer.offerPriceINR ?? 0)))}`;
    case 'flat':
      return `Flat ₹${inr(offer.discountValue ?? 0)} off`;
    case 'free_addon':
      return `Free add-on worth ₹${inr(offer.discountValue ?? 0)}`;
    default:
      return offer.discount || 'Special Discount';
  }
}

export function offerSavingINR(offer: SalonOffer, _service?: SalonService): number {
  // percent offers save the price difference; flat/free/combo offers carry
  // their rupee saving in discountValue.
  if (offer.offerType === 'percent') return Math.max(0, (offer.originalPriceINR ?? 0) - (offer.offerPriceINR ?? 0));
  if (typeof offer.discountValue === 'number') return offer.discountValue;
  return Math.max(0, (offer.originalPriceINR ?? 0) - (offer.offerPriceINR ?? 0));
}

/** Services an offer applies to; an empty list means every service. */
export function offerApplicableServices(offer: SalonOffer, services: SalonService[] = []): SalonService[] {
  const ids = offer.applicableServices || [];
  if (!ids.length) return services;
  return ids.map((id) => services.find((service) => service.id === id)).filter((s): s is SalonService => !!s);
}

export function offerBookingPrefill(offer: SalonOffer, services: SalonService[] = []) {
  const applies = offerApplicableServices(offer, services);
  const base = applies[0];
  const service = base ? { ...base, price: offer.offerPriceINR ?? base.price } : undefined;
  const saving = offerSavingINR(offer, base);
  const note = `${offer.title}: book ${service?.name || 'any service'} at the offer price${saving > 0 ? ` and save ₹${inr(saving)}` : ''}.${offer.couponCode ? ` Use code ${offer.couponCode}.` : ''}`;
  return {
    offerCode: offer.couponCode || '',
    offerTitle: offer.title || '',
    discount: offerDiscountLabel(offer),
    service,
    note: note.slice(0, 1000)
  };
}

/** Offer photo with a bundled Template 13 artwork fallback. */
export function offerImage(offer: SalonOffer, index = 0): { src: string; fallback: string } {
  const fallbacks = [ARCH_FLUTTER_ART.offer, ARCH_FLUTTER_ART.bridal, ARCH_FLUTTER_ART.lash, ARCH_FLUTTER_ART.brow, ARCH_FLUTTER_ART.gallery, ARCH_FLUTTER_ART.package];
  const fallback = fallbacks[Math.abs(index) % fallbacks.length];
  return { src: offer.image || offer.imageUrl || fallback, fallback };
}

export function promotionActive(offer?: SalonOffer): boolean {
  return offer?.active !== false && offer?.isActive !== false;
}

/**
 * Seeds the sample offers exactly once: a fresh Template 13 workspace gets the
 * six demo offers, an existing list (even an empty one) is returned untouched,
 * and other templates get no offer key at all.
 */
export function seedSalonOffers(profile: SalonProfile): SalonOffer[] | undefined {
  const existing = (profile as any)?.promoOffers;
  if (Array.isArray(existing)) return existing;
  if (profile?.businessType === ARCH_FLUTTER_BUSINESS_TYPE) return demoSalonOffers(ARCH_FLUTTER_BUSINESS_TYPE);
  return undefined;
}

/** Insert or update an offer; editing always clears the demo flag. */
export function upsertSalonOffer(target: any, offer: SalonOffer): any {
  const offers = offersOf(target);
  const clean = { ...offer, isDemo: false };
  const next = offers.some((o) => o.id === offer.id)
    ? offers.map((o) => (o.id === offer.id ? clean : o))
    : [...offers, clean];
  return withOffers(target, next);
}

export function toggleSalonOffer(target: any, id: string): any {
  return withOffers(target, offersOf(target).map((o) => (o.id === id ? { ...o, isActive: o.isActive === false } : o)));
}

export function removeSalonOffer(target: any, id: string): any {
  return withOffers(target, offersOf(target).filter((o) => o.id !== id));
}

export function resetSampleSalonOffers(target: any): any {
  const businessType = Array.isArray(target) ? ARCH_FLUTTER_BUSINESS_TYPE : target?.businessType;
  return withOffers(target, demoSalonOffers(businessType || ARCH_FLUTTER_BUSINESS_TYPE));
}
