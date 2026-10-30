import type { SalonOffer, SalonOfferType, SalonProfile, SalonService } from '../types';
import { ARCH_FLUTTER_ART, ARCH_FLUTTER_IMAGES } from './archFlutter';

/**
 * "Promotions & offers" for a salon website.
 *
 * Offers are ordinary editable records on the salon profile (`promoOffers`) —
 * the same JSON shape for the bundled demo offers and for anything the owner
 * writes later. Nothing here is hardcoded in the UI: the storefront, the owner
 * editor and the customer app all read the same list through these helpers.
 *
 * Rules enforced here so every surface behaves the same way:
 * - demo offers are marked `isDemo: true` and lose the flag the moment the owner
 *   edits or replaces them (`upsertSalonOffer`);
 * - expired or hidden offers are filtered out of the public site
 *   (`publicSalonOffers`) but always returned to the owner (`ownerSalonOffers`);
 * - deleting every offer leaves an empty list, never a re-seeded demo list, so
 *   the friendly empty state is reachable;
 * - money is Indian Rupees only, formatted with Indian digit grouping, and dates
 *   are shown as `DD MMM YYYY`.
 */

export const SALON_OFFER_TYPES: readonly SalonOfferType[] = ['percent', 'flat', 'combo', 'free_addon'] as const;

export const OFFER_TYPE_LABELS: Record<SalonOfferType, string> = {
  percent: 'Percentage off',
  flat: 'Flat rupees off',
  combo: 'Combo / bundle price',
  free_addon: 'Free add-on',
};

export const OFFER_BADGES: readonly string[] = [
  'New Client',
  'Most Popular',
  'Bridal Special',
  'Limited Slots',
  'Referral',
  'Festive',
  'Bestseller',
  'Members Only',
] as const;

/** Main Diwali (Lakshmi Puja) day per year, used for the festive offer window. */
export const DEEPAVALI_DATES = ['2026-11-08', '2027-10-29', '2028-10-17', '2029-11-05', '2030-10-26'];

const DAY = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

/** `YYYY-MM-DD` for a timestamp in the visitor's own calendar day. */
export function offerDateStamp(value: number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseOfferDate(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || '').trim());
  if (!match) return NaN;
  const time = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
  return Number.isNaN(time) ? NaN : time;
}

const plusDays = (value: number, days: number) => offerDateStamp(new Date(value + days * DAY));

/** Last day of the next Diwali week (main day + six days), never in the past. */
export function nextFestiveWeekEnd(now = Date.now()): string {
  for (const stamp of DEEPAVALI_DATES) {
    const day = parseOfferDate(stamp);
    if (Number.isFinite(day) && day + 6 * DAY >= startOfDay(new Date(now))) return plusDays(day, 6);
  }
  return plusDays(now, 45);
}

const number = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'string' ? Number(value.replace(/[^0-9.-]/g, '')) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const text = (value: unknown, fallback = ''): string => (typeof value === 'string' && value.trim() ? value.trim() : fallback);

const stamp = (value: unknown): string => {
  const raw = text(value);
  if (!raw) return '';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : offerDateStamp(date);
};

/**
 * One blank offer row for the owner's "Add offer" button. It starts hidden
 * (`isActive: false`) with a working title so a half-filled card can never
 * appear on the public site by accident.
 */
export function emptySalonOffer(now = Date.now(), index = 0): SalonOffer {
  return {
    id: `offer-${now.toString(36)}-${index + 1}`,
    title: 'New offer',
    description: '',
    image: '',
    badge: 'Bestseller',
    offerType: 'percent',
    discountValue: 10,
    originalPriceINR: 0,
    offerPriceINR: 0,
    applicableServices: [],
    couponCode: '',
    validFrom: offerDateStamp(now),
    validTo: plusDays(now, 30),
    terms: 'One offer per client per visit. Cannot be combined with another code or membership.',
    isActive: false,
    isDemo: false,
  };
}

/** Coerce anything stored on a profile into clean offer records. */
export function normalizeSalonOffers(value: unknown): SalonOffer[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const offers: SalonOffer[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const raw = entry as Record<string, unknown>;
    const title = text(raw.title as string);
    if (!title) continue;
    const id = text(raw.id as string) || `offer-${offers.length + 1}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const offerType = SALON_OFFER_TYPES.includes(raw.offerType as SalonOfferType) ? (raw.offerType as SalonOfferType) : 'percent';
    offers.push({
      id,
      title: title.slice(0, 120),
      description: text(raw.description as string).slice(0, 600),
      image: text(raw.image as string).slice(0, 600),
      badge: text(raw.badge as string, 'Offer').slice(0, 40),
      offerType,
      discountValue: Math.max(0, number(raw.discountValue)),
      originalPriceINR: Math.max(0, number(raw.originalPriceINR)),
      offerPriceINR: Math.max(0, number(raw.offerPriceINR)),
      applicableServices: Array.isArray(raw.applicableServices)
        ? Array.from(new Set(raw.applicableServices.map((item) => text(item as string)).filter(Boolean))).slice(0, 60)
        : [],
      couponCode: text(raw.couponCode as string).toUpperCase().slice(0, 40),
      validFrom: stamp(raw.validFrom),
      validTo: stamp(raw.validTo),
      terms: text(raw.terms as string).slice(0, 600),
      isActive: raw.isActive !== false,
      isDemo: raw.isDemo === true,
    });
  }
  return offers;
}

/**
 * The six bundled Arch & Flutter sample offers. Only Template 13 (`lash_brow`)
 * ships demo offers, so no other template's website changes.
 */
export function demoSalonOffers(businessType: string, now = Date.now()): SalonOffer[] {
  if (businessType !== 'lash_brow') return [];
  const images = ARCH_FLUTTER_IMAGES;
  return normalizeSalonOffers([
    {
      id: 'af-offer-welcome',
      title: 'Glow Up Welcome Offer',
      description: '20% off your first lash set with a free patch test and aftercare brush. New clients only — Classic, Hybrid or Volume full set.',
      image: images.services.lash.src,
      badge: 'New Client',
      offerType: 'percent',
      discountValue: 20,
      originalPriceINR: 2499,
      offerPriceINR: 1999,
      applicableServices: ['af-1', 'af-5', 'af-9'],
      couponCode: 'FLUTTER20',
      validFrom: offerDateStamp(now),
      validTo: plusDays(now, 60),
      terms: 'First visit only. Quote FLUTTER20 when you book or WhatsApp it to us. Not valid with refills, memberships or another code.',
      isActive: true,
      isDemo: true,
    },
    {
      id: 'af-offer-combo',
      title: 'Lash + Brow Combo',
      description: 'Volume lashes and brow lamination in one appointment, with a lash shampoo and spoolie to take home.',
      image: images.categories.lamination.src,
      badge: 'Most Popular',
      offerType: 'combo',
      discountValue: 799,
      originalPriceINR: 5298,
      offerPriceINR: 4499,
      applicableServices: ['af-5', 'af-33'],
      couponCode: '',
      validFrom: offerDateStamp(now),
      validTo: plusDays(now, 90),
      terms: 'Both services on the same day. Save ₹799 against booking them separately. Advance holds the slot; balance at the salon.',
      isActive: true,
      isDemo: true,
    },
    {
      id: 'af-offer-bridal',
      title: 'Bridal Eye Package',
      description: 'Hybrid lashes, brow shaping and a trial session for the bride — plus a free aftercare kit and a touch-up slot in the wedding week.',
      image: images.services.bridal.src,
      badge: 'Bridal Special',
      offerType: 'combo',
      discountValue: 1500,
      originalPriceINR: 9499,
      offerPriceINR: 7999,
      applicableServices: ['af-55', 'af-9', 'af-26', 'af-56'],
      couponCode: '',
      validFrom: offerDateStamp(now),
      validTo: plusDays(now, 120),
      terms: 'Book at least 21 days before the wedding date. Trial within 30 days of the function. Free aftercare kit collected at the studio.',
      isActive: true,
      isDemo: true,
    },
    {
      id: 'af-offer-happy-hours',
      title: 'Weekday Happy Hours',
      description: 'Flat 15% off Monday to Thursday, 11 AM to 3 PM — the quiet hours, with the same artists and the same care.',
      image: images.about.src,
      badge: 'Limited Slots',
      offerType: 'percent',
      discountValue: 15,
      originalPriceINR: 2499,
      offerPriceINR: 2124,
      applicableServices: ['af-1', 'af-17', 'af-25', 'af-33'],
      couponCode: 'HAPPY15',
      validFrom: offerDateStamp(now),
      validTo: plusDays(now, 90),
      terms: 'Appointment must start between 11:00 AM and 3:00 PM, Monday to Thursday. Four slots a day. Prices shown are for a Classic 1:1 full set.',
      isActive: true,
      isDemo: true,
    },
    {
      id: 'af-offer-refer',
      title: 'Refer a Friend',
      description: 'Both you and your friend get ₹500 off the next appointment when she books with your code.',
      image: images.team.ritika.src,
      badge: 'Referral',
      offerType: 'flat',
      discountValue: 500,
      originalPriceINR: 0,
      offerPriceINR: 0,
      applicableServices: [],
      couponCode: 'BESTIE500',
      validFrom: offerDateStamp(now),
      validTo: plusDays(now, 180),
      terms: 'Your friend quotes BESTIE500 at her first booking; your ₹500 credit is added once her visit is complete. Valid on any service above ₹1,500.',
      isActive: true,
      isDemo: true,
    },
    {
      id: 'af-offer-festive',
      title: 'Festive Season Offer',
      description: 'Free lash lift worth ₹1,999 with any Volume or Hybrid full set booked for the festive weeks.',
      image: images.services.lift.src,
      badge: 'Festive',
      offerType: 'free_addon',
      discountValue: 1999,
      originalPriceINR: 0,
      offerPriceINR: 0,
      applicableServices: ['af-5', 'af-6', 'af-9', 'af-10'],
      couponCode: '',
      validFrom: offerDateStamp(now),
      validTo: nextFestiveWeekEnd(now),
      terms: 'Lift and tint added in the same appointment, subject to lash condition. Valid till Diwali week; no code needed, we add it on your card.',
      isActive: true,
      isDemo: true,
    },
  ]);
}

/** Offers the owner sees in the workspace: everything, including expired and hidden. */
export function ownerSalonOffers(profile: SalonProfile): SalonOffer[] {
  const saved = normalizeSalonOffers(profile.promoOffers);
  return saved.length || Array.isArray(profile.promoOffers) ? saved : demoSalonOffers(profile.businessType);
}

const windowStart = (offer: SalonOffer) => (offer.validFrom ? parseOfferDate(offer.validFrom) : NaN);
const windowEnd = (offer: SalonOffer) => (offer.validTo ? parseOfferDate(offer.validTo) + DAY - 1 : NaN);

/** True while the offer is switched on and inside its validity window. */
export function offerIsLive(offer: SalonOffer, now = Date.now()): boolean {
  if (!offer || offer.isActive === false) return false;
  const from = windowStart(offer);
  const to = windowEnd(offer);
  if (Number.isFinite(from) && now < from) return false;
  if (Number.isFinite(to) && now > to) return false;
  return true;
}

/** Offers for the public website and the customer app: live ones only. */
export function publicSalonOffers(profile: SalonProfile, now = Date.now()): SalonOffer[] {
  return ownerSalonOffers(profile).filter((offer) => offerIsLive(offer, now));
}

/** `08 Nov 2026` — Indian English, day first, no time. */
export function formatOfferDateIN(value: string): string {
  const day = parseOfferDate(value);
  if (!Number.isFinite(day)) return '';
  const date = new Date(day);
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** `08 Nov 2026 – 14 Nov 2026`, or an open-ended range. */
export function formatOfferWindow(offer: SalonOffer): string {
  const from = formatOfferDateIN(offer.validFrom);
  const to = formatOfferDateIN(offer.validTo);
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Till ${to}`;
  return 'No end date';
}

/** Rupees saved, when the offer states both prices or a flat/percent amount. */
export function offerSavingINR(offer: SalonOffer, service?: SalonService): number {
  if (offer.originalPriceINR > 0 && offer.offerPriceINR > 0) return Math.max(0, Math.round((offer.originalPriceINR - offer.offerPriceINR) * 100) / 100);
  if (offer.offerType === 'flat') return Math.max(0, offer.discountValue);
  if (offer.offerType === 'free_addon') return Math.max(0, offer.discountValue);
  if (offer.offerType === 'percent' && service && service.price > 0) return Math.round(service.price * (offer.discountValue / 100) * 100) / 100;
  return 0;
}

/** Short discount line for the card: `20% off`, `Flat ₹500 off`, `Free add-on worth ₹1,999`. */
export function offerDiscountLabel(offer: SalonOffer): string {
  const value = offer.discountValue;
  if (offer.offerType === 'percent' && value > 0) return `${value}% off`;
  if (offer.offerType === 'flat' && value > 0) return `Flat ₹${value.toLocaleString('en-IN')} off`;
  if (offer.offerType === 'free_addon' && value > 0) return `Free add-on worth ₹${value.toLocaleString('en-IN')}`;
  if (offer.originalPriceINR > 0 && offer.offerPriceINR > 0) {
    const saving = offer.originalPriceINR - offer.offerPriceINR;
    return saving > 0 ? `Combo price · save ₹${saving.toLocaleString('en-IN')}` : 'Combo price';
  }
  return 'Special offer';
}

/** `Ends in 12 days` / `Ends today` / `Starts in 3 days` / `Expired on 08 Nov 2026`. */
export function offerCountdownLabel(offer: SalonOffer, now = Date.now()): string {
  const from = windowStart(offer);
  const to = windowEnd(offer);
  if (Number.isFinite(from) && now < from) {
    const days = Math.ceil((from - now) / DAY);
    return days <= 1 ? 'Starts tomorrow' : `Starts in ${days} days`;
  }
  if (!Number.isFinite(to)) return 'No end date';
  const days = Math.ceil((to - now) / DAY);
  if (days <= 0) return `Expired on ${formatOfferDateIN(offer.validTo)}`;
  if (days === 1) return 'Ends today';
  if (days === 2) return 'Ends tomorrow';
  return `Ends in ${days} days`;
}

/** Live services this offer applies to; an empty list means the whole menu. */
export function offerApplicableServices(offer: SalonOffer, services: SalonService[]): SalonService[] {
  if (!Array.isArray(services) || services.length === 0) return [];
  const ids = new Set(offer.applicableServices || []);
  if (ids.size === 0) return services;
  return services.filter((service) => ids.has(service.id));
}

/**
 * Price the booking flow should prefill for one service under this offer:
 * percent and flat offers are computed from the service price, combo and
 * free-add-on offers use their stated ₹ price when they have one.
 */
export function offerPriceForService(offer: SalonOffer, service: SalonService): number {
  const price = Number(service?.price) || 0;
  if (offer.offerType === 'percent' && offer.discountValue > 0) return Math.max(0, Math.round(price * (1 - offer.discountValue / 100) * 100) / 100);
  if (offer.offerType === 'flat' && offer.discountValue > 0) return Math.max(0, Math.round((price - offer.discountValue) * 100) / 100);
  if (offer.offerPriceINR > 0) return offer.offerPriceINR;
  return price;
}

/**
 * Booking prefill for "Book this offer": the first applicable live service with
 * the offer price applied, plus a private note the studio sees on the booking.
 */
export function offerBookingPrefill(
  offer: SalonOffer,
  services: SalonService[],
): { service?: SalonService; note: string } {
  const applicable = offerApplicableServices(offer, services);
  const base = applicable[0];
  const saving = offerSavingINR(offer, base);
  const note = [
    `Offer: ${offer.title}`,
    offer.couponCode ? `Code ${offer.couponCode}` : '',
    saving > 0 ? `Client expects ₹${saving.toLocaleString('en-IN')} off (${offerDiscountLabel(offer)})` : offerDiscountLabel(offer),
    offer.validTo ? `Valid till ${formatOfferDateIN(offer.validTo)}` : '',
    offer.terms,
  ]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 1000);
  if (!base) return { service: undefined, note };
  const price = offerPriceForService(offer, base);
  return { service: price === base.price ? base : { ...base, price }, note };
}

/** Bundled art plate behind an offer photograph, so a card is never empty. */
export function offerImage(offer: SalonOffer, index = 0): { src: string; fallback: string } {
  const plates = [ARCH_FLUTTER_ART.offer, ARCH_FLUTTER_ART.package, ARCH_FLUTTER_ART.bridal, ARCH_FLUTTER_ART.lashVolume];
  return { src: (offer.image || '').trim(), fallback: plates[index % plates.length] };
}

/* ------------------------------------------------------------------ */
/* Owner workspace mutations — every one of them keeps the profile JSON */
/* shape intact and clears the demo flag on the offer being edited.     */
/* ------------------------------------------------------------------ */

/** Replace the whole list (used by the editor's save/reset actions). */
export function withSalonOffers(profile: SalonProfile, offers: SalonOffer[]): SalonProfile {
  return { ...profile, promoOffers: normalizeSalonOffers(offers) };
}

/** Add or update one offer. An owner-edited offer is never a demo offer again. */
export function upsertSalonOffer(profile: SalonProfile, offer: SalonOffer): SalonProfile {
  const offers = ownerSalonOffers(profile);
  const [clean] = normalizeSalonOffers([offer]);
  // An offer without a title is not a record yet, so nothing is written.
  if (!clean) return profile;
  const next: SalonOffer = { ...clean, isDemo: false };
  const index = offers.findIndex((item) => item.id === next.id);
  const merged = index >= 0 ? offers.map((item, i) => (i === index ? next : item)) : [...offers, next];
  return withSalonOffers(profile, merged);
}

/** Delete one offer; deleting all of them leaves the honest empty state. */
export function removeSalonOffer(profile: SalonProfile, id: string): SalonProfile {
  return withSalonOffers(profile, ownerSalonOffers(profile).filter((offer) => offer.id !== id));
}

/** Hide / show one offer without deleting it. */
export function toggleSalonOffer(profile: SalonProfile, id: string): SalonProfile {
  return withSalonOffers(
    profile,
    ownerSalonOffers(profile).map((offer) => (offer.id === id ? { ...offer, isActive: !offer.isActive } : offer)),
  );
}

/** "Reset to sample offers" — the six bundled demo offers, flagged as samples again. */
export function resetSampleSalonOffers(profile: SalonProfile, now = Date.now()): SalonProfile {
  return withSalonOffers(profile, demoSalonOffers(profile.businessType, now));
}

/** Seed demo offers on a workspace that has never had an offer list. */
export function seedSalonOffers(profile: SalonProfile, now = Date.now()): SalonOffer[] | undefined {
  if (Array.isArray(profile.promoOffers)) return normalizeSalonOffers(profile.promoOffers);
  const demo = demoSalonOffers(profile.businessType, now);
  return demo.length ? demo : undefined;
}
