import type { SalonProfile } from "../types";
import { promotionActive } from "./promotionStatus";

/**
 * Template 12 · Iron & Ink — promotions mock data.
 *
 * `promotionsMock` is the ONLY place demo offers live. A salon that has not
 * published its own offers yet still sees a useful section; as soon as real
 * offers exist (the existing `profile.promoCampaign`, or rows returned by the
 * offers table/RPC passed in through the `offers` prop) the mock data is never
 * rendered.
 *
 * To swap the mock for database data later:
 *   1. Load the salon's active offers (Supabase) into `PromotionOffer[]`.
 *   2. Pass them to `<IronInkPromotions offers={rows} />` (see IronInkWebsite),
 *      or pass them as the third argument of `resolvePromotionOffers()`.
 *   3. Nothing else changes — the section keeps its empty state for salons
 *      with zero live offers, and this file can stay as a preview fallback.
 */
export type PromotionOffer = {
  id: string;
  title: string;
  description: string;
  /** Short accent badge such as "15% OFF" or "₹1,999 FLAT". */
  badge: string;
  /** ISO date (YYYY-MM-DD) or full ISO timestamp. */
  validTill: string;
  couponCode?: string;
  /** Iron & Ink category slug used to pre-select the booking flow. */
  category?: string;
  /** Demo content is labelled in the UI. */
  isMock?: boolean;
};

/** Demo dates stay in the future so the preview never opens empty. */
const inDays = (days: number): string => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const endOfMonth = (): string => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1, 0);
  date.setHours(12, 0, 0, 0);
  return date.toISOString().slice(0, 10);
};

export const promotionsMock: PromotionOffer[] = [
  {
    id: "ii-offer-first-tattoo",
    title: "First Tattoo Special – 15% OFF",
    description:
      "Your first piece, with the time it deserves. Includes a 20-minute design consultation, stencil placement and a printed aftercare card.",
    badge: "15% OFF",
    validTill: inDays(30),
    couponCode: "IRON15",
    category: "minimal-fine-line",
    isMock: true,
  },
  {
    id: "ii-offer-flash-friday",
    title: "Flash Tattoo Friday – flat ₹1,999",
    description:
      "Small designs from the flash wall every Friday, 12–6 pm. Artist's choice of line weight and shading; first come, first inked.",
    badge: "₹1,999 FLAT",
    validTill: inDays(75),
    couponCode: "FLASHFRIDAY",
    category: "small-flash",
    isMock: true,
  },
  {
    id: "ii-offer-couple-ink",
    title: "Couple Ink Combo – 2 matching tattoos at ₹6,500",
    description:
      "Two complementary pieces, designed together and booked back-to-back in one private studio slot. Matching stencils, separate artists on request.",
    badge: "₹6,500 COMBO",
    validTill: inDays(45),
    couponCode: "COUPLE2",
    category: "couple-matching",
    isMock: true,
  },
  {
    id: "ii-offer-piercing-aftercare",
    title: "Piercing + Aftercare Kit Free",
    description:
      "A single piercing with sterile, implant-grade jewellery, plus a sealed aftercare kit and a follow-up check on WhatsApp — this month only.",
    badge: "FREE KIT",
    validTill: endOfMonth(),
    couponCode: "AFTERCARE",
    category: "body-piercing",
    isMock: true,
  },
  {
    id: "ii-offer-coverup",
    title: "Cover-up Consultation – FREE",
    description:
      "Bring reference photos of the old piece. We map what is coverable, what needs a session of lightening and what the redesign will cost.",
    badge: "FREE CONSULT",
    validTill: inDays(120),
    couponCode: "COVERUP",
    category: "cover-up",
    isMock: true,
  },
];

const DAY_MS = 86_400_000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** True while an offer has not passed its "valid till" end-of-day. */
export function promotionOfferIsLive(
  offer: Pick<PromotionOffer, "validTill"> | undefined | null,
  now = Date.now(),
): boolean {
  if (!offer?.validTill) return true;
  const parsed = Date.parse(
    DATE_ONLY.test(offer.validTill)
      ? `${offer.validTill}T23:59:59`
      : offer.validTill,
  );
  // An unparseable date is treated as open-ended rather than silently dropped.
  return !Number.isFinite(parsed) || parsed + DAY_MS >= now;
}

export function livePromotionOffers(
  offers: PromotionOffer[] | null | undefined,
  now = Date.now(),
): PromotionOffer[] {
  return (offers || []).filter(
    (offer) => offer && offer.title && promotionOfferIsLive(offer, now),
  );
}

/** "Valid till 29 Nov 2026" — used by the offer card. */
export function promotionValidTillLabel(offer: PromotionOffer): string {
  const parsed = Date.parse(
    DATE_ONLY.test(offer.validTill) ? `${offer.validTill}T12:00:00` : offer.validTill,
  );
  if (!Number.isFinite(parsed)) return "Ongoing offer";
  return `Valid till ${new Date(parsed).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

/**
 * The salon's existing campaign (Marketing → promo banner) mapped onto the
 * offer card shape. Returns [] when the campaign is absent, disabled or
 * expired, which is exactly when the mock data takes over.
 */
export function promotionOffersFromProfile(
  profile: Pick<SalonProfile, "promoCampaign">,
  now = Date.now(),
): PromotionOffer[] {
  const campaign = profile?.promoCampaign;
  if (!campaign || !promotionActive(campaign, now)) return [];
  const title =
    campaign.headline?.trim() ||
    campaign.customOfferText?.trim() ||
    "Studio offer";
  const description =
    campaign.customOfferText?.trim() ||
    campaign.subtext?.trim() ||
    "A limited studio offer — mention the code when you book your session.";
  return [
    {
      id: "ii-offer-campaign",
      title,
      description,
      badge: campaign.discountPercent
        ? `${campaign.discountPercent}% OFF`
        : campaign.lastMinute
          ? "LAST-MINUTE"
          : "STUDIO OFFER",
      validTill: campaign.endsAt || "",
      couponCode: campaign.promoCode?.trim() || undefined,
    },
  ];
}

/**
 * The single source of truth used by the storefront section.
 * `remoteOffers` lets a future database integration replace the mock data
 * without touching the component.
 */
export function resolvePromotionOffers(
  profile: Pick<SalonProfile, "promoCampaign">,
  remoteOffers?: PromotionOffer[] | null,
  now = Date.now(),
): { offers: PromotionOffer[]; usingMock: boolean } {
  const real = livePromotionOffers(
    remoteOffers && remoteOffers.length
      ? remoteOffers
      : promotionOffersFromProfile(profile, now),
    now,
  );
  if (real.length) return { offers: real, usingMock: false };
  return { offers: livePromotionOffers(promotionsMock, now), usingMock: true };
}
