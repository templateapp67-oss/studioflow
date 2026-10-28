import type { SalonProfile, SalonService } from '../types';
import type { SalonGalleryPhoto } from './photoGallery';

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
 * Reference gallery for the bundled demo: studio photographs, each shown
 * with an explicit "Demo / sample" label by the Template 06 gallery.
 */
export type KeshGalleryPhoto = Omit<SalonGalleryPhoto, 'category'> & { category: string };

export const KESH_PRAKRITI_SAMPLE_GALLERY: KeshGalleryPhoto[] = [
  {
    id: 'kesh-sample-1',
    category: 'Sanctuary',
    url: KESH_PRAKRITI_IMAGES.sanctuary,
    title: 'Treatment room reference photo',
    isDemo: true,
  },
  {
    id: 'kesh-sample-2',
    category: 'Spa',
    url: KESH_PRAKRITI_IMAGES.headSpa,
    title: 'Head spa ritual reference photo',
    isDemo: true,
  },
  {
    id: 'kesh-sample-3',
    category: 'Botanicals',
    url: KESH_PRAKRITI_IMAGES.botanical,
    title: 'Botanical ingredients reference photo',
    isDemo: true,
  },
  {
    id: 'kesh-sample-4',
    category: 'Botanicals',
    url: KESH_PRAKRITI_IMAGES.oils,
    title: 'Hair oil and comb reference photo',
    isDemo: true,
  },
  {
    id: 'kesh-sample-5',
    category: 'Spa',
    url: KESH_PRAKRITI_IMAGES.steam,
    title: 'Hair spa steam treatment',
    isDemo: true,
  },
  {id: 'kesh-sample-6', category: 'Spa', url: KESH_PRAKRITI_IMAGES.headMassage, title: 'Traditional head massage', isDemo: true},
  {id: 'kesh-sample-7', category: 'Spa', url: KESH_PRAKRITI_IMAGES.facial, title: 'Face cleanup at the salon', isDemo: true},
];

/** Every local Template 06 URL — used so saved demo photos survive reloads. */
export const KESH_PRAKRITI_IMAGE_URLS: string[] = Array.from(
  new Set(Object.values(KESH_PRAKRITI_IMAGES)),
);

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

// Sample offers are shown in the template preview only, never as live offers.
export const KESH_PRAKRITI_DEFAULT_PROMOTIONS = [
  {id: 'kp-promo-1', title: 'Hair Spa Offer', description: 'Sample offer: 10% off a hair spa. Ask the salon about current offers and terms.', code: 'HAIR10', badge: 'Sample offer'},
  {id: 'kp-promo-2', title: 'Weekday Care', description: 'Sample offer: ₹100 off a face cleanup on weekdays. Ask the salon about current offers and terms.', code: 'CARE100', badge: 'Sample offer'},
];

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

export const KESH_PRAKRITI_FAQ: ReadonlyArray<readonly [string, string]> = [
  ['How do I choose a service?', 'See the service menu for prices and timings. If you are not sure, call or WhatsApp the salon and we will help you choose.'],
  ['How do I book an appointment?', 'Choose a service and an available date and time. Your appointment is booked only after you receive confirmation.'],
  ['What time zone are the appointments in?', 'All appointment times are shown in Indian Standard Time (IST).'],
  ['What if I have sensitive skin or allergies?', 'Please tell the team before your appointment and ask about the products used for your service.'],
  ['How can I change or cancel my booking?', 'Open My Bookings or contact the salon as early as possible. Please check the salon’s booking and cancellation policy for notice periods and any advance payment terms.'],
  ['How do I ask about offers?', 'Check the offers shown on this website or call the salon. Confirm the offer dates, eligible services and terms before booking.'],
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
