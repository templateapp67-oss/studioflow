import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { isPackage } from './packageCatalogue';
import type { SalonGalleryPhoto, PhotoCategory } from './photoGallery';
import type {
  PrismChromaBeforeAfter,
  PrismChromaBranch,
  PrismChromaFaqItem,
  PrismChromaPackage,
  PrismChromaShade,
  PrismChromaStatItem,
  SalonProfile,
  SalonService,
  Stylist,
} from '../types';

/**
 * Template 10 — Prism & Chroma live Supabase data layer.
 *
 * The salon is resolved from the published `?site=<slug>` record (never from
 * localStorage or a demo default). Services, packages, team, gallery,
 * before/after pairs and business information come from the published
 * `studioflow_websites.content` projection; reviews, offers and the salon
 * notification settings come from the dedicated tables added in
 * `supabase/migrations/202610300002_prism_chroma_template_10.sql` through the
 * `studioflow_prism_site` RPC.
 *
 * The hook is safe to render on the server: it only fetches inside an effect.
 */

export type PrismOffer = {
  id: string;
  title: string;
  description: string;
  code: string;
  discountPercent: number | null;
  flatDiscountInr: number | null;
  priceNote: string;
  serviceId: string;
  imageUrl: string;
  startsOn: string | null;
  endsOn: string | null;
};

export type PrismReviewStatus = 'pending' | 'approved' | 'rejected';

export type PrismLiveReview = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  serviceName: string;
  staffId: string;
  imageUrl: string;
  date: string;
  status: PrismReviewStatus;
  salonReply: string;
  verified: boolean;
  isMine: boolean;
  isOwnerReview: boolean;
};

export type PrismSalonBusiness = {
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  whatsapp: string;
  email: string;
  workingHoursDisplay: string;
  openTime: string;
  closeTime: string;
  mapEmbedUrl: string;
  instagram: string;
  facebook: string;
  youtube: string;
};

export type PrismSiteData = {
  salon: {
    id: string;
    slug: string;
    publishedAt: string | null;
    template: string;
    name: string;
    tagline: string;
    about: string;
    logoUrl: string;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    city: string;
    postalCode: string;
    latitude: number | null;
    longitude: number | null;
    workingHoursDisplay: string;
    openTime: string;
    closeTime: string;
    mapEmbedUrl: string;
    requireDeposit: boolean;
    bookingLeadHours: number;
    cancellationWindow: number;
  };
  business: PrismSalonBusiness;
  packages: PrismChromaPackage[];
  transformations: PrismChromaBeforeAfter[];
  faqs: PrismChromaFaqItem[];
  shades: PrismChromaShade[];
  branches: PrismChromaBranch[];
  reviews: PrismLiveReview[];
  ownReview: PrismLiveReview | null;
  reviewSummary: { count: number; average: number };
  offers: PrismOffer[];
  counts: { services: number; staff: number; gallery: number; reviews: number; offers: number };
};

export type PrismSiteStatus = 'idle' | 'loading' | 'ready' | 'not_found' | 'error';

export type PrismSiteState = {
  status: PrismSiteStatus;
  data: PrismSiteData | null;
  error: string;
  refreshing: boolean;
};

export const PRISM_SITE_EMPTY_STATE: PrismSiteState = { status: 'idle', data: null, error: '', refreshing: false };

const text = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback;

const numberOrNull = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
};

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const normalizeOffer = (raw: any): PrismOffer | null => {
  if (!raw || typeof raw !== 'object') return null;
  const id = text(raw.id);
  const title = text(raw.title).trim();
  if (!id || !title) return null;
  return {
    id,
    title,
    description: text(raw.description),
    code: text(raw.code).trim().toUpperCase(),
    discountPercent: numberOrNull(raw.discountPercent),
    flatDiscountInr: numberOrNull(raw.flatDiscountInr),
    priceNote: text(raw.priceNote),
    serviceId: text(raw.serviceId),
    imageUrl: text(raw.imageUrl),
    startsOn: text(raw.startsOn) || null,
    endsOn: text(raw.endsOn) || null,
  };
};

const normalizeReview = (raw: any): PrismLiveReview | null => {
  if (!raw || typeof raw !== 'object') return null;
  const id = text(raw.id);
  const comment = text(raw.comment).trim();
  if (!id || comment.length < 2) return null;
  const status = text(raw.status, 'approved');
  return {
    id,
    name: text(raw.name).trim() || 'Client',
    rating: Math.min(5, Math.max(1, numberOrNull(raw.rating) ?? 5)),
    comment,
    serviceName: text(raw.serviceName),
    staffId: text(raw.staffId),
    imageUrl: text(raw.imageUrl),
    date: text(raw.date),
    status: status === 'pending' || status === 'rejected' ? status : 'approved',
    salonReply: text(raw.salonReply),
    verified: raw.verified === true,
    isMine: raw.isMine === true,
    isOwnerReview: raw.isOwnerReview === true,
  };
};

const normalizePackage = (raw: any): PrismChromaPackage | null => {
  if (!raw || typeof raw !== 'object') return null;
  const id = text(raw.id);
  const tier = text(raw.tier || raw.name).trim();
  const price = numberOrNull(raw.price);
  if (!id || !tier || price === null) return null;
  const includes = list(raw.includes).map((line) => text(line)).filter(Boolean);
  return {
    id,
    tier,
    price,
    popular: raw.popular === true,
    badgeLabel: text(raw.badgeLabel) || undefined,
    imageUrl: text(raw.imageUrl),
    imageAlt: text(raw.imageAlt) || undefined,
    includes: includes.length ? includes : [text(raw.note) || 'Fixed-price package'],
    linkedServiceId: text(raw.linkedServiceId) || undefined,
    sessionsCount: numberOrNull(raw.sessionsCount) ?? undefined,
    validityDays: numberOrNull(raw.validityDays) ?? undefined,
    savingsNote: text(raw.savingsNote) || undefined,
    carePlanAddon: numberOrNull(raw.carePlanAddon) ?? undefined,
  };
};

const normalizeTransformation = (raw: any): PrismChromaBeforeAfter | null => {
  if (!raw || typeof raw !== 'object') return null;
  const beforeUrl = text(raw.beforeUrl);
  const afterUrl = text(raw.afterUrl);
  if (!beforeUrl || !afterUrl) return null;
  return {
    id: text(raw.id) || `${beforeUrl}-${afterUrl}`,
    title: text(raw.title) || 'Colour transformation',
    beforeUrl,
    afterUrl,
    beforeAlt: text(raw.beforeAlt) || 'Hair before colour',
    afterAlt: text(raw.afterAlt) || 'Hair after colour',
    serviceLabel: text(raw.serviceLabel) || undefined,
    sessionsNote: text(raw.sessionsNote) || undefined,
    stylistName: text(raw.stylistName) || undefined,
  };
};

const normalizeBranch = (raw: any): PrismChromaBranch | null => {
  if (!raw || typeof raw !== 'object') return null;
  const name = text(raw.name).trim();
  if (!name) return null;
  return {
    id: text(raw.id) || name,
    name,
    area: text(raw.area),
    address: text(raw.address),
    phone: text(raw.phone),
    hours: text(raw.hours),
    landmark: text(raw.landmark) || undefined,
    metroNote: text(raw.metroNote) || undefined,
    parkingNote: text(raw.parkingNote) || undefined,
  };
};

const normalizeFaq = (raw: any): PrismChromaFaqItem | null => {
  if (!raw || typeof raw !== 'object') return null;
  const question = text(raw.question).trim();
  const answer = text(raw.answer).trim();
  if (!question || !answer) return null;
  return { id: text(raw.id) || question, question, answer, category: text(raw.category) || undefined };
};

const normalizeShade = (raw: any): PrismChromaShade | null => {
  if (!raw || typeof raw !== 'object') return null;
  const name = text(raw.name).trim();
  if (!name) return null;
  return {
    ...(raw as PrismChromaShade),
    id: text(raw.id) || name,
    name,
    swatch: text(raw.swatch) || '#7C5CFF',
    price: numberOrNull(raw.price) ?? undefined,
    blurb: text(raw.blurb),
    imageUrl: text(raw.imageUrl),
    linkedServiceId: text(raw.linkedServiceId) || undefined,
  } as PrismChromaShade;
};

/** Turns the raw RPC jsonb into the typed payload, dropping malformed rows. */
export function parsePrismSite(raw: any): PrismSiteData | null {
  if (!raw || raw.found !== true || !raw.salon || typeof raw.salon !== 'object') return null;
  const salon = raw.salon;
  const business = raw.business && typeof raw.business === 'object' ? raw.business : {};
  const social = business.social && typeof business.social === 'object' ? business.social : {};
  const summary = raw.reviewSummary && typeof raw.reviewSummary === 'object' ? raw.reviewSummary : {};
  const counts = raw.counts && typeof raw.counts === 'object' ? raw.counts : {};
  return {
    salon: {
      id: text(salon.id),
      slug: text(salon.slug),
      publishedAt: text(salon.publishedAt) || null,
      template: text(salon.template),
      name: text(salon.name),
      tagline: text(salon.tagline),
      about: text(salon.about),
      logoUrl: text(salon.logoUrl),
      phone: text(salon.phone),
      whatsapp: text(salon.whatsapp),
      email: text(salon.email),
      address: text(salon.address),
      city: text(salon.city),
      postalCode: text(salon.postalCode),
      latitude: numberOrNull(salon.latitude),
      longitude: numberOrNull(salon.longitude),
      workingHoursDisplay: text(salon.workingHoursDisplay),
      openTime: text(salon.openTime, '10:00'),
      closeTime: text(salon.closeTime, '20:30'),
      mapEmbedUrl: text(salon.mapEmbedUrl),
      requireDeposit: salon.requireDeposit !== false,
      bookingLeadHours: numberOrNull(salon.bookingLeadHours) ?? 0,
      cancellationWindow: numberOrNull(salon.cancellationWindow) ?? 0,
    },
    business: {
      address: text(business.address, text(salon.address)),
      city: text(business.city, text(salon.city)),
      postalCode: text(business.postalCode, text(salon.postalCode)),
      phone: text(business.phone, text(salon.phone)),
      whatsapp: text(business.whatsapp, text(salon.whatsapp)),
      email: text(business.email, text(salon.email)),
      workingHoursDisplay: text(business.workingHoursDisplay, text(salon.workingHoursDisplay)),
      openTime: text(business.openTime, text(salon.openTime, '10:00')),
      closeTime: text(business.closeTime, text(salon.closeTime, '20:30')),
      mapEmbedUrl: text(business.mapEmbedUrl, text(salon.mapEmbedUrl)),
      instagram: text(social.instagram),
      facebook: text(social.facebook),
      youtube: text(social.youtube),
    },
    packages: list(raw.packages).map(normalizePackage).filter((item): item is PrismChromaPackage => Boolean(item)),
    transformations: list(raw.transformations)
      .map(normalizeTransformation)
      .filter((item): item is PrismChromaBeforeAfter => Boolean(item)),
    faqs: list(raw.faqs).map(normalizeFaq).filter((item): item is PrismChromaFaqItem => Boolean(item)),
    shades: list(raw.shades).map(normalizeShade).filter((item): item is PrismChromaShade => Boolean(item)),
    branches: list(raw.branches).map(normalizeBranch).filter((item): item is PrismChromaBranch => Boolean(item)),
    reviews: list(raw.reviews).map(normalizeReview).filter((item): item is PrismLiveReview => Boolean(item)),
    ownReview: normalizeReview(raw.ownReview),
    reviewSummary: {
      count: Math.max(0, numberOrNull(summary.count) ?? 0),
      average: Math.min(5, Math.max(0, numberOrNull(summary.average) ?? 0)),
    },
    offers: list(raw.offers).map(normalizeOffer).filter((item): item is PrismOffer => Boolean(item)),
    counts: {
      services: Math.max(0, numberOrNull(counts.services) ?? 0),
      staff: Math.max(0, numberOrNull(counts.staff) ?? 0),
      gallery: Math.max(0, numberOrNull(counts.gallery) ?? 0),
      reviews: Math.max(0, numberOrNull(counts.reviews) ?? 0),
      offers: Math.max(0, numberOrNull(counts.offers) ?? 0),
    },
  };
}

export function prismErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const message = (error as any)?.message ?? (error as any)?.error_description ?? (typeof error === 'string' ? error : '');
  const clean = String(message || '').trim();
  if (!clean) return fallback;
  // Postgres / PostgREST plumbing errors are not useful to salon visitors.
  if (/^duplicate key|^violates|^new row|pg_|PGRST|JWT|fetch failed/i.test(clean)) return fallback;
  return clean.slice(0, 240);
}

export type UsePrismSiteResult = PrismSiteState & { reload: () => void };

/**
 * Loads the published Prism & Chroma payload for `slug`.
 * - polls every 15s while visible (same cadence as the published website
 *   shell), refreshes on focus;
 * - subscribes to realtime offers/reviews for signed-in viewers;
 * - never throws into React: failures become an `error` state.
 */
export function usePrismSite(slug: string | null | undefined, pollMs = 15000): UsePrismSiteResult {
  const [state, setState] = useState<PrismSiteState>(() => ({
    ...PRISM_SITE_EMPTY_STATE,
    status: slug ? 'loading' : 'idle',
  }));
  const ticket = useRef(0);
  const loadedOnce = useRef(false);
  const activeSlug = (slug || '').trim().toLowerCase();

  const load = useCallback(async () => {
    if (!activeSlug) return;
    const request = ++ticket.current;
    setState((previous) =>
      previous.status === 'ready'
        ? { ...previous, refreshing: true }
        : { ...previous, status: previous.status === 'idle' ? 'loading' : previous.status, refreshing: true, error: '' },
    );
    try {
      const result = await supabase.rpc('studioflow_prism_site', { p_slug: activeSlug });
      if (request !== ticket.current) return;
      if (result.error) throw result.error;
      const parsed = parsePrismSite(result.data);
      if (!parsed) {
        setState({ status: 'not_found', data: null, error: '', refreshing: false });
        return;
      }
      loadedOnce.current = true;
      setState({ status: 'ready', data: parsed, error: '', refreshing: false });
    } catch (error) {
      if (request !== ticket.current) return;
      setState((previous) => ({
        status: previous.data ? 'ready' : 'error',
        data: previous.data,
        error: prismErrorMessage(error, 'Could not load live salon details. Retrying shortly.'),
        refreshing: false,
      }));
    }
  }, [activeSlug]);

  useEffect(() => {
    if (!activeSlug) {
      setState({ ...PRISM_SITE_EMPTY_STATE });
      return;
    }
    loadedOnce.current = false;
    setState({ status: 'loading', data: null, error: '', refreshing: false });
    let active = true;
    void load();
    const focus = () => {
      if (active && !document.hidden) void load();
    };
    const visibility = () => {
      if (active && !document.hidden) void load();
    };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', visibility);
    const timer = pollMs > 0 ? setInterval(focus, pollMs) : 0;
    return () => {
      active = false;
      ticket.current++;
      if (timer) clearInterval(timer);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [activeSlug, load, pollMs]);

  /* Realtime is a bonus for signed-in viewers (anon has no table grants);
     polling above is the guaranteed refresh path. */
  const offersChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reviewsChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const salonId = state.data?.salon.id || '';
  useEffect(() => {
    if (!salonId) return;
    const offers = supabase
      .channel(`prism-offers-${salonId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'studioflow_offers', filter: `salon_id=eq.${salonId}` }, () => void load())
      .subscribe();
    const reviews = supabase
      .channel(`prism-reviews-${salonId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'studioflow_reviews', filter: `owner_id=eq.${salonId}` }, () => void load())
      .subscribe();
    offersChannel.current = offers;
    reviewsChannel.current = reviews;
    return () => {
      void supabase.removeChannel(offers);
      void supabase.removeChannel(reviews);
      offersChannel.current = null;
      reviewsChannel.current = null;
    };
  }, [salonId, load]);

  return { ...state, reload: () => void load() };
}

/* ------------------------------------------------------------------ */
/* Live view adapters: use DB data on a published site, never demo copy */
/* ------------------------------------------------------------------ */

/** Owner-saved packages win; otherwise derive real package tiers from the published package services. */
export function prismLivePackages(site: PrismSiteData | null, services: SalonService[]): PrismChromaPackage[] {
  if (site?.packages.length) return site.packages;
  return services.filter(isPackage).map((service, index) => ({
    id: service.id,
    tier: service.name.replace(/\s*package\s*$/i, ''),
    price: Number(service.price) || 0,
    popular: Boolean(service.popular),
    badgeLabel: service.popular ? 'Popular' : undefined,
    imageUrl: service.imageUrl || '',
    imageAlt: `${service.name} at the studio`,
    includes: [service.description, `${service.durationMinutes} minutes`, service.category].filter(Boolean),
    linkedServiceId: service.id,
    sessionsCount: 1,
  })) as PrismChromaPackage[];
}

/** Before/after pairs: owner Prism & Chroma editor first, then the consented comparisons. */
export function prismLiveTransformations(site: PrismSiteData | null, profile: SalonProfile): PrismChromaBeforeAfter[] {
  if (site?.transformations.length) return site.transformations;
  return (profile.comparisonPhotos || [])
    .filter((item) => item && item.consented !== false && item.beforeUrl && item.afterUrl)
    .map((item) => ({
      id: item.id,
      title: item.title || 'Colour transformation',
      beforeUrl: item.beforeUrl,
      afterUrl: item.afterUrl,
      beforeAlt: 'Hair before colour',
      afterAlt: 'Hair after colour',
      serviceLabel: item.category,
    }));
}

/** Branches: owner list, else the single published studio address. */
export function prismLiveBranches(site: PrismSiteData | null, profile: SalonProfile): PrismChromaBranch[] {
  if (site?.branches.length) return site.branches;
  const business = site?.business;
  const name = (business?.city || profile.city || '').split(',')[0] || 'Studio';
  const address = [business?.address || profile.address, business?.city || profile.city, business?.postalCode || profile.postalCode]
    .filter(Boolean)
    .join(', ');
  if (!address) return [];
  return [
    {
      id: 'studio',
      name,
      area: (business?.city || profile.city || '').split(',')[0] || '',
      address,
      phone: business?.phone || profile.phone || '',
      hours: business?.workingHoursDisplay || '',
    },
  ];
}

/** Stats must be true: counts and review rating come from the database. */
export function prismLiveStats(
  site: PrismSiteData | null,
  services: SalonService[],
  team: Stylist[],
): PrismChromaStatItem[] {
  if (!site) return [];
  const stats: PrismChromaStatItem[] = [];
  if (services.length) stats.push({ id: 'pc-live-services', value: String(services.length), label: 'Colour services' });
  if (team.length) stats.push({ id: 'pc-live-team', value: String(team.length), label: 'Colour experts' });
  if (site.reviewSummary.count > 0) {
    stats.push({ id: 'pc-live-reviews', value: String(site.reviewSummary.count), label: 'Client reviews' });
    stats.push({ id: 'pc-live-rating', value: `${site.reviewSummary.average.toFixed(1)}★`, label: 'Client rating' });
  } else if (site.counts.gallery > 0) {
    stats.push({ id: 'pc-live-gallery', value: String(site.counts.gallery), label: 'Looks in the gallery' });
  }
  return stats.slice(0, 4);
}

/** Published gallery photos only — demo template images never leak onto a live site. */
export function prismLiveGallery(photos: SalonGalleryPhoto[]): { src: string; title: string; tag: string }[] {
  return photos
    .filter((photo) => Boolean(photo?.url) && !photo.isDemo)
    .slice(0, 18)
    .map((photo) => ({
      src: photo.url,
      title: photo.title || `${photo.category} colour work`,
      tag: (photo.category as PhotoCategory | string) || 'Gallery',
    }));
}

export function prismOfferValueLabel(offer: PrismOffer): string {
  if (offer.flatDiscountInr && offer.flatDiscountInr > 0) return `₹${offer.flatDiscountInr.toLocaleString('en-IN')} off`;
  if (offer.discountPercent && offer.discountPercent > 0) return `${offer.discountPercent}% off`;
  if (offer.priceNote) return offer.priceNote;
  return 'Limited-period offer';
}

const dateLabel = (value: string | null): string => {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function prismOfferWindowLabel(offer: PrismOffer): string {
  const from = dateLabel(offer.startsOn);
  const to = dateLabel(offer.endsOn);
  if (from && to) return `${from} – ${to}`;
  if (to) return `Till ${to}`;
  if (from) return `From ${from}`;
  return offer.priceNote || 'While slots last';
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export type PrismEnquiryInput = {
  slug: string;
  name: string;
  phone: string;
  email?: string;
  serviceId?: string;
  serviceName?: string;
  message?: string;
  preferredDate?: string | null;
};

export type PrismEnquiryErrors = Partial<Record<'name' | 'phone' | 'email' | 'message' | 'preferredDate', string>>;

/** Shared client-side validation (the database repeats every rule). */
export function validatePrismEnquiry(input: PrismEnquiryInput): PrismEnquiryErrors {
  const errors: PrismEnquiryErrors = {};
  const name = (input.name || '').trim();
  const digits = (input.phone || '').replace(/[^0-9]/g, '');
  const email = (input.email || '').trim();
  if (name.length < 2) errors.name = 'Enter your name (at least 2 characters).';
  else if (name.length > 120) errors.name = 'Keep your name under 120 characters.';
  if (digits.length < 10 || digits.length > 15) errors.phone = 'Enter a phone number with 10–15 digits.';
  if (email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) errors.email = 'Enter a valid email address or leave it empty.';
  if ((input.message || '').length > 1000) errors.message = 'Keep your message under 1000 characters.';
  if (input.preferredDate) {
    const chosen = new Date(`${input.preferredDate}T00:00:00`);
    if (Number.isNaN(chosen.getTime())) {
      errors.preferredDate = 'Choose a valid preferred date.';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const latest = new Date(today);
      latest.setDate(latest.getDate() + 120);
      if (chosen < today) errors.preferredDate = 'Choose today or a future date.';
      else if (chosen > latest) errors.preferredDate = 'Choose a date within the next 120 days.';
    }
  }
  return errors;
}

export function validatePrismNewsletterEmail(email: string): string {
  const value = (email || '').trim();
  if (value.length < 5 || value.length > 254 || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(value)) {
    return 'Enter a valid email address.';
  }
  return '';
}

export async function submitPrismEnquiry(input: PrismEnquiryInput): Promise<{ id: string }> {
  const errors = validatePrismEnquiry(input);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0] || 'Check the form and try again.');
  if (!(input.slug || '').trim()) throw new Error('This salon website is not available.');
  const { data, error } = await supabase.rpc('studioflow_prism_enquire', {
    p_slug: input.slug.trim().toLowerCase(),
    p_name: (input.name || '').trim(),
    p_phone: (input.phone || '').trim(),
    p_email: (input.email || '').trim(),
    p_service_id: (input.serviceId || '').trim(),
    p_service_name: (input.serviceName || '').trim(),
    p_message: (input.message || '').trim(),
    p_preferred_date: input.preferredDate || null,
  });
  if (error) throw new Error(prismErrorMessage(error, 'Your enquiry could not be sent. Please call the salon.'));
  if (!data?.id) throw new Error('The salon did not confirm your enquiry. Please try again.');
  return { id: String(data.id) };
}

export async function subscribePrismNewsletter(input: { slug: string; email: string; name?: string }): Promise<{ id: string }> {
  const problem = validatePrismNewsletterEmail(input.email);
  if (problem) throw new Error(problem);
  if (!(input.slug || '').trim()) throw new Error('This salon website is not available.');
  const { data, error } = await supabase.rpc('studioflow_prism_newsletter', {
    p_slug: input.slug.trim().toLowerCase(),
    p_email: input.email.trim().toLowerCase(),
    p_name: (input.name || '').trim(),
  });
  if (error) throw new Error(prismErrorMessage(error, 'Could not add you to the list. Please try again.'));
  if (!data?.subscribed) throw new Error('The salon did not confirm your subscription. Please try again.');
  return { id: String(data.id || '') };
}

export async function submitPrismReview(input: {
  slug: string;
  name: string;
  rating: number;
  comment: string;
  serviceName?: string;
}): Promise<{ pending: true }> {
  if (!(input.slug || '').trim()) throw new Error('This salon website is not available.');
  if ((input.name || '').trim().length < 2) throw new Error('Enter your name.');
  if (!Number.isFinite(input.rating) || input.rating < 1 || input.rating > 5) throw new Error('Choose a rating from 1 to 5 stars.');
  if ((input.comment || '').trim().length < 10) throw new Error('Write at least 10 characters about your visit.');
  const { error } = await supabase.rpc('studioflow_submit_review', {
    p_slug: input.slug.trim().toLowerCase(),
    p_name: input.name.trim(),
    p_rating: Math.round(input.rating),
    p_comment: input.comment.trim(),
    p_service_name: (input.serviceName || '').trim(),
    p_image_url: null,
  });
  if (error) throw new Error(prismErrorMessage(error, 'Your review could not be saved. Please try again.'));
  return { pending: true };
}

/** Owner inbox readers (RLS limits every query to the signed-in salon). */
export async function loadPrismOwnerInbox(ownerId: string) {
  const [enquiries, subscribers, offers, reviews] = await Promise.all([
    supabase
      .from('studioflow_enquiries')
      .select('id,service_name,name,phone,email,message,preferred_date,status,created_at')
      .eq('salon_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('studioflow_newsletter_subscribers')
      .select('id,email,name,source,consent,created_at')
      .eq('salon_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('studioflow_offers')
      .select('id,title,description,code,discount_percent,flat_discount_inr,price_note,service_id,image_url,starts_on,ends_on,active,sort_order')
      .eq('salon_id', ownerId)
      .order('sort_order', { ascending: true })
      .limit(100),
    supabase
      .from('studioflow_reviews')
      .select('id,name,rating,comment,service_name,status,salon_reply,created_at,updated_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  const failure = [enquiries, subscribers, offers, reviews].find((result) => result.error);
  if (failure?.error) throw failure.error;
  return {
    enquiries: enquiries.data || [],
    subscribers: subscribers.data || [],
    offers: offers.data || [],
    reviews: reviews.data || [],
  };
}
