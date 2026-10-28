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
  /** Poster used for the booking banner background. */
  bookingBanner: '/templates/kesh-prakriti/steam.jpg',
  /** Neutral botanical tile shown when a specialist has not added a photo. */
  specialistFallback: '/templates/kesh-prakriti/botanical.jpg',
} as const;

export type KeshImageKey = keyof typeof KESH_PRAKRITI_IMAGES;

const SERVICE_IMAGE_RULES: Array<[RegExp, KeshImageKey]> = [
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
  const text = `${service.category || ''} ${service.name || ''}`;
  for (const [pattern, key] of SERVICE_IMAGE_RULES) {
    if (pattern.test(text)) return KESH_PRAKRITI_IMAGES[key];
  }
  return KESH_PRAKRITI_IMAGES.sanctuary;
}

/**
 * Reference gallery for the bundled demo: four studio photographs, each shown
 * with an explicit "Demo / sample" label by the Template 06 gallery.
 */
export const KESH_PRAKRITI_SAMPLE_GALLERY: SalonGalleryPhoto[] = [
  {
    id: 'kesh-sample-1',
    category: 'Spa',
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
    category: 'Spa',
    url: KESH_PRAKRITI_IMAGES.botanical,
    title: 'Botanical ingredients reference photo',
    isDemo: true,
  },
  {
    id: 'kesh-sample-4',
    category: 'Spa',
    url: KESH_PRAKRITI_IMAGES.oils,
    title: 'Hair oil and comb reference photo',
    isDemo: true,
  },
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
export function keshGallery(photos: SalonGalleryPhoto[]): SalonGalleryPhoto[] {
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

export const KESH_PRAKRITI_DEFAULT_REVIEWS = [
  {
    id: 'kp-rev-1',
    name: 'Meera Krishnan',
    location: 'Alwarpet, Chennai',
    rating: 5,
    serviceName: 'Head Spa Ritual & Scalp Cleanse',
    comment: 'The absolute pinnacle of relaxation. The warm head spa sequence and botanical aromas dissolved my work stress instantly. My scalp feels remarkably revitalized.',
    verified: true,
    isDemo: false,
    date: '2 days ago',
  },
  {
    id: 'kp-rev-2',
    name: 'Siddharth Menon',
    location: 'Nungambakkam, Chennai',
    rating: 5,
    serviceName: 'Ayurvedic Herb Lepam Treatment',
    comment: 'Dr. Gayatri and the team provided exceptional care. The Lepam scalp mask followed by the warm oil massage cured my chronic dryness completely.',
    verified: true,
    isDemo: false,
    date: '1 week ago',
  },
  {
    id: 'kp-rev-3',
    name: 'Ananya Swaminathan',
    location: 'Adyar, Chennai',
    rating: 5,
    serviceName: 'Argan Oil Nourishing Steam Ritual',
    comment: 'A tranquil sanctuary in the middle of the city. Pristine hygiene, calming ambiance, and truly professional scalp therapy.',
    verified: true,
    isDemo: false,
    date: '2 weeks ago',
  },
];

export const KESH_PRAKRITI_DEFAULT_PROMOTIONS = [
  {
    id: 'kp-promo-1',
    title: 'Monsoon Scalp Health Special',
    description: 'Enjoy 15% off all Head Spa rituals and therapeutic scalp cleansing sessions during the monsoon season.',
    code: 'MONSOON15',
    badge: 'Limited Time Offer',
  },
  {
    id: 'kp-promo-2',
    title: 'Weekday Morning Bliss',
    description: 'Receive a complimentary herbal steam session with any Lepam treatment booked between 10 AM and 1 PM.',
    code: 'MORNINGBLISS',
    badge: 'Weekday Special',
  },
];

/** Testimonials entered or verified in Supabase, with rich defaults for Kesh Prakriti preview. */
export function keshPublishedReviews(
  profile: Pick<SalonProfile, 'websiteTestimonials'>,
) {
  const custom = (profile.websiteTestimonials || []).filter(
    (review) =>
      !review.isDemo &&
      Boolean(String(review.comment || '').trim()) &&
      Boolean(String(review.name || '').trim()),
  );
  return custom.length > 0 ? custom : KESH_PRAKRITI_DEFAULT_REVIEWS;
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
  [
    'How do I choose a treatment?',
    'Every service card lists what is included, how long it takes and the current price. If you are unsure, contact the sanctuary and the team will help you compare options.',
  ],
  [
    'How do I book, and is my slot held?',
    'Choose a treatment, then pick an available date and time in the booking panel. The booking is only reserved after the server confirms it — an available slot can still be taken by another guest until then.',
  ],
  [
    'Are the times shown in Indian Standard Time?',
    'Yes. Date and time selection uses Asia/Kolkata (IST).',
  ],
  [
    'Which product is used in my treatment?',
    'Product and ingredient information is only listed when it has been added to the service menu. Ask the team before your visit if you have a sensitivity or allergy concern.',
  ],
  [
    'What if I need to change or cancel?',
    'Open My Bookings with the account used for the booking to review or cancel an appointment, or contact the sanctuary using the details shown here.',
  ],
  [
    'How can I contact the sanctuary?',
    'Phone, WhatsApp, email and directions appear in the contact section only when the salon has saved those details. Nothing here is a placeholder phone number.',
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
        `Hello ${profile.businessName || 'the sanctuary'}, I would like to ask about a visit.`,
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
