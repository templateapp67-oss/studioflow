import type { SalonProfile, SalonService } from '../types';
import type { SalonGalleryPhoto } from './photoGallery';
import { socialUrl } from './websiteContent';

/**
 * Template 06 — Kesh Prakriti Hair Spa & Scalp Sanctuary (hair_spa).
 *
 * All Template 06 imagery, reference gallery entries and editorial copy live
 * here so nothing leaks into Templates 01–05 or 07–14. Every image is served
 * from this repository (public/templates/kesh-prakriti) instead of a remote
 * CDN, so the page never depends on a third-party host staying reachable.
 *
 * These photographs are studio reference imagery for the bundled template. The
 * customer-facing sections label them "Demo / sample" until the salon owner
 * saves photos of their own from the workspace.
 */
export const KESH_PRAKRITI_IMAGES = {
  hero: '/templates/kesh-prakriti/hero-sanctuary.jpg',
  heroSanctuary: '/templates/kesh-prakriti/hero-sanctuary.jpg',
  philosophy: '/templates/kesh-prakriti/philosophy.jpg',
  botanical: '/templates/kesh-prakriti/botanical.jpg',
  sanctuary: '/templates/kesh-prakriti/sanctuary.jpg',
  headSpa: '/templates/kesh-prakriti/head-spa.jpg',
  lepam: '/templates/kesh-prakriti/lepam.jpg',
  steam: '/templates/kesh-prakriti/steam.jpg',
  oils: '/templates/kesh-prakriti/oils.jpg',
  headMassage: '/templates/kesh-prakriti/indian-head-massage.jpg',
  facial: '/templates/kesh-prakriti/indian-facial.jpg',
  grooming: '/templates/kesh-prakriti/indian-grooming.jpg',
  bridal: '/templates/kesh-prakriti/indian-bridal.jpg',
  threading: '/templates/kesh-prakriti/indian-threading.jpg',
  waxing: '/templates/kesh-prakriti/indian-waxing.jpg',
  groomMakeup: '/templates/kesh-prakriti/indian-groom-makeup.jpg',
  /** Poster used for the booking banner background. */
  bookingBanner: '/templates/kesh-prakriti/steam.jpg',
  /** Neutral botanical tile shown when a specialist has not added a photo. */
  specialistFallback: '/templates/kesh-prakriti/botanical.jpg',
} as const;

export type KeshImageKey = keyof typeof KESH_PRAKRITI_IMAGES;

const SERVICE_IMAGE_RULES: Array<[RegExp, KeshImageKey]> = [
  [/groom makeup/i, 'groomMakeup'],
  [/bridal|makeup/i, 'bridal'],
  [/beard|grooming/i, 'grooming'],
  [/thread|brow/i, 'threading'],
  [/wax/i, 'waxing'],
  [/facial|cleanup|d-tan|skin/i, 'facial'],
  [/head massage|oil massage/i, 'headMassage'],
  [/head\s*spa|ultrasonic|micro-?mist|ozone|steam|steam/i, 'headSpa'],
  [/lepam|ayurved|herbal|mask|bhringraj|brahmi/i, 'lepam'],
  [/argan|oil|nourish|moisture|hydrat/i, 'oils'],
  [/detox|scrub|clarif|dandruff|neem|tea tree/i, 'steam'],
  [/root|density|fall|peptide|biotin/i, 'botanical'],
  [/package|combo|bundle|ritual/i, 'sanctuary'],
];

/** Deterministic, local service imagery for Template 06 (no remote URLs). */
export function keshPrakritiServiceImage(
  service: Pick<SalonService, 'id' | 'name' | 'category'> & { imageUrl?: string },
): string {
  if (service.imageUrl?.trim()) return service.imageUrl.trim();
  // Prefer the service name so a mixed category (such as bridal & groom
  // makeup) does not assign the same photo to unrelated services.
  for (const text of [service.name || '', service.category || '']) {
    for (const [pattern, key] of SERVICE_IMAGE_RULES) {
      if (pattern.test(text)) return KESH_PRAKRITI_IMAGES[key];
    }
  }
  return KESH_PRAKRITI_IMAGES.sanctuary;
}

/**
 * Reference gallery for the bundled demo: studio photographs of the spa
 * interior, treatments, rituals and botanicals, each shown with an explicit
 * "Demo / sample" label by the Template 06 gallery.
 *
 * The gallery is data-driven: whatever is in this list (or whatever the owner
 * saves) becomes the grid, the filters and the lightbox — nothing about the
 * layout is hard-coded per photo.
 */
export type KeshGalleryPhoto = Omit<SalonGalleryPhoto, 'category'> & { category: string };

/** How many photographs the Template 06 gallery will show at most. */
export const KESH_PRAKRITI_GALLERY_LIMIT = 8;

export const KESH_PRAKRITI_SAMPLE_GALLERY: KeshGalleryPhoto[] = [
  {
    id: 'kesh-sample-1',
    category: 'Interior',
    url: KESH_PRAKRITI_IMAGES.sanctuary,
    title: 'The treatment room, set for a quiet hour',
    isDemo: true,
  },
  {
    id: 'kesh-sample-2',
    category: 'Treatments',
    url: KESH_PRAKRITI_IMAGES.headSpa,
    title: 'A head spa ritual at the basin',
    isDemo: true,
  },
  {
    id: 'kesh-sample-3',
    category: 'Botanicals',
    url: KESH_PRAKRITI_IMAGES.botanical,
    title: 'Fresh botanicals and ritual herbs',
    isDemo: true,
  },
  {
    id: 'kesh-sample-4',
    category: 'Interior',
    url: KESH_PRAKRITI_IMAGES.heroSanctuary,
    title: 'The sanctuary, in late afternoon light',
    isDemo: true,
  },
  {
    id: 'kesh-sample-5',
    category: 'Treatments',
    url: KESH_PRAKRITI_IMAGES.steam,
    title: 'Warm steam and herbal infusion',
    isDemo: true,
  },
  {
    id: 'kesh-sample-6',
    category: 'Rituals',
    url: KESH_PRAKRITI_IMAGES.lepam,
    title: 'A herbal lepam being prepared',
    isDemo: true,
  },
  {
    id: 'kesh-sample-7',
    category: 'Rituals',
    url: KESH_PRAKRITI_IMAGES.headMassage,
    title: 'Traditional head massage with warm oil',
    isDemo: true,
  },
  {
    id: 'kesh-sample-8',
    category: 'Botanicals',
    url: KESH_PRAKRITI_IMAGES.oils,
    title: 'Cold-pressed oils and wooden combs',
    isDemo: true,
  },
];

/**
 * Bundled portraits for the demo team. They are only used when a specialist
 * has no saved photo of their own, so the team section never shows an empty
 * grey card for the three people the template ships with.
 */
export const KESH_PRAKRITI_TEAM_PORTRAITS: Record<string, string> = {
  'gayatri raman': '/templates/kesh-prakriti/team-gayatri.jpg',
  'karthik sundaram': '/templates/kesh-prakriti/team-karthik.jpg',
  'deepa pillai': '/templates/kesh-prakriti/team-deepa.jpg',
};

/**
 * Resolve one portrait: the salon's saved photo when it is a real image URL,
 * then the bundled demo portrait when the name matches one of the template's
 * specialists, then nothing (the section draws a labelled placeholder).
 */
export function keshTeamPortrait(person: {
  name?: string;
  avatarUrl?: string;
}): { src: string; isDemo: boolean } {
  const saved = safePhotoUrl(person?.avatarUrl);
  if (saved) return { src: saved, isDemo: false };
  const key = String(person?.name || '')
    .toLowerCase()
    .replace(/^dr\.?\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  const bundled = KESH_PRAKRITI_TEAM_PORTRAITS[key];
  return bundled ? { src: bundled, isDemo: true } : { src: '', isDemo: false };
}

/** A saved cover photo is used for the hero when the owner uploaded one. */
export function keshHeroImage(
  profile: Pick<SalonProfile, 'coverImageUrl' | 'businessType'>,
): { src: string; isOwnerPhoto: boolean } {
  const saved = safePhotoUrl(profile.coverImageUrl);
  // Templates 01–05 SEO covers are not the salon owner's own photograph.
  if (saved && !isTemplateCataloguePhoto(saved)) {
    return { src: saved, isOwnerPhoto: true };
  }
  return { src: KESH_PRAKRITI_IMAGES.hero, isOwnerPhoto: false };
}

/**
 * Saved salon photos only. When the owner has not saved a gallery yet, the
 * bundled template's own labelled reference photos are shown instead of
 * inherited stock imagery or a broken/blank gallery.
 */
export function keshGallery(photos: SalonGalleryPhoto[]): KeshGalleryPhoto[] {
  const seen = new Set<string>();
  const saved = photos.filter((photo) => {
    if (photo?.isDemo) return false;
    const url = safePhotoUrl(photo?.url);
    if (!url || !photo?.id || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
  return saved.length ? saved : KESH_PRAKRITI_SAMPLE_GALLERY;
}

/**
 * Only absolute https URLs (salon storage/CDN) or repository asset paths are
 * rendered. Anything else becomes a labelled placeholder instead of a broken
 * image icon.
 */
export function safePhotoUrl(raw?: string): string {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^\/templates\/kesh-prakriti\/[\w-]+\.(jpg|jpeg|png|webp)$/i.test(value)) {
    return value;
  }
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return url.href;
  } catch {
    /* not an absolute URL */
  }
  return '';
}

const TEMPLATE_CATALOGUE_PHOTO = /images\.unsplash\.com|template-assets|SALON_IMAGES/i;
export function isTemplateCataloguePhoto(url: string): boolean {
  return TEMPLATE_CATALOGUE_PHOTO.test(url);
}

/** Show only customer reviews saved for this salon. */
export function keshPublishedReviews(profile: Pick<SalonProfile, 'websiteTestimonials'>) {
  return (profile.websiteTestimonials || []).filter(
    (review) => !review.isDemo && Boolean(String(review.comment || '').trim()) && Boolean(String(review.name || '').trim()),
  );
}

/**
 * Package/combination treatments are shown only when the saved service
 * catalogue actually contains one — the page never invents bundles.
 */
export function keshPackages(services: SalonService[]): SalonService[] {
  return services.filter((service) =>
    /package|combo|bundle/i.test(`${service.category || ''} ${service.name || ''}`),
  );
}

/**
 * A short, curated index for the service menu. It always reads from the same
 * saved catalogue the cards use — nothing is written twice — and prefers
 * popular treatments from different categories so the selection feels edited
 * rather than repeated.
 */
export function keshSignatureServices(
  services: SalonService[],
  limit = 3,
): SalonService[] {
  const ordered = [...services].sort(
    (a, b) => Number(Boolean(b.popular)) - Number(Boolean(a.popular)),
  );
  const picks: SalonService[] = [];
  const add = (service: SalonService) => {
    if (picks.length >= limit) return;
    if (picks.some((pick) => pick.id === service.id)) return;
    picks.push(service);
  };
  // The salon's own "popular" flag reads as its signature list: take up to two,
  // then widen the selection by category so the index is not one long tribe.
  ordered.filter((service) => service.popular).slice(0, 2).forEach(add);
  const categories = new Set(
    picks
      .map((service) => String(service.category || '').trim().toLowerCase())
      .filter(Boolean),
  );
  for (const service of ordered) {
    if (picks.length >= limit) break;
    const category = String(service.category || '').trim().toLowerCase();
    if (category && categories.has(category)) continue;
    if (category) categories.add(category);
    add(service);
  }
  for (const service of ordered) add(service);
  return picks;
}

/** Verified social profiles only; empty fields are never rendered. */
export function keshSocialLinks(
  profile: Pick<
    SalonProfile,
    'instagramHandle' | 'facebookPage' | 'youtubeChannel' | 'tiktokProfile'
  >,
): Array<[string, string]> {
  return (
    [
      ['Instagram', socialUrl(profile.instagramHandle, 'instagram')],
      ['Facebook', socialUrl(profile.facebookPage, 'facebook')],
      ['YouTube', socialUrl(profile.youtubeChannel, 'youtube')],
      ['TikTok', socialUrl(profile.tiktokProfile, 'tiktok')],
    ] as Array<[string, string]>
  ).filter(([, url]) => Boolean(url));
}

export function keshServiceCategories(services: SalonService[]): string[] {
  return Array.from(
    new Set(
      services
        .map((service) => String(service.category || '').trim())
        .filter((category) => category.length > 0),
    ),
  );
}

/** Opening hours, printed exactly as the owner saved them. */
export function keshOpeningHours(
  profile: Pick<
    SalonProfile,
    'workingHoursMonFri' | 'workingHoursTue' | 'workingHoursSat' | 'workingHoursSun'
  >,
): Array<[string, string]> {
  return (
    [
      ['Monday – Friday', profile.workingHoursMonFri],
      ['Tuesday', profile.workingHoursTue],
      ['Saturday', profile.workingHoursSat],
      ['Sunday', profile.workingHoursSun],
    ] as Array<[string, string | undefined]>
  )
    .map(([day, hours]) => [day, String(hours || '').trim()] as [string, string])
    .filter(([, hours]) => hours.length > 0);
}

/**
 * Only questions that are not already answered by the menu, the booking
 * explanation or the contact details. Nothing here repeats a service card,
 * an offer banner or a whole section of the page.
 */
export const KESH_PRAKRITI_FAQ: ReadonlyArray<readonly [string, string]> = [
  [
    'How far in advance should I book?',
    'Online booking shows the appointment times the salon has opened. For a same-day visit, call or message the salon and the team will tell you what is possible.',
  ],
  [
    'What should I tell the team before my service?',
    'Please mention allergies, sensitive skin, recent colour or chemical treatments, and anything a doctor has advised you about. The team can then explain which services and products suit you.',
  ],
  [
    'How do I change or cancel an appointment?',
    'Open My Bookings to see your appointment, or contact the salon as early as you can. Ask about the salon’s cancellation and advance payment terms when you book.',
  ],
  [
    'Can I book for more than one person?',
    'The online booking flow reserves one appointment at a time. For a group or family visit, call or message the salon so the team can plan the times together.',
  ],
  [
    'What time zone are appointment times shown in?',
    'Every time on this website and in your confirmation is shown in Indian Standard Time (IST).',
  ],
];

/** Details the contact section is allowed to show. */
export function keshContactSummary(profile: SalonProfile) {
  const phone = String(profile.phone || '').trim();
  const whatsappDigits = String(profile.whatsapp || '').replace(/\D/g, '');
  const email = String(profile.email || '').trim();
  const address = [profile.address, profile.city, profile.postalCode]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
  const hasCoordinates =
    Number.isFinite(profile.latitude) && Number.isFinite(profile.longitude);
  const mapsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${profile.latitude},${profile.longitude}`
    : address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
      : '';
  const whatsappUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
        `Hello ${profile.businessName || 'the salon'}, I would like to ask about an appointment.`,
      )}`
    : '';
  return {
    phone,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '',
    address,
    landmark: String(profile.landmark || '').trim(),
    mapsUrl,
    whatsappUrl,
    hours: keshOpeningHours(profile),
    hasAnyContact: Boolean(phone || whatsappUrl || email || address),
  };
}
