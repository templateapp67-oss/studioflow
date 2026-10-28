import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import type { SalonProfile, SalonService, Stylist } from '../types';
import { socialUrl } from './websiteContent';

/**
 * Template 05 — Pinky Nails Studio (nail_studio).
 * All palette, image and copy constants for this template live here so nothing
 * leaks into Templates 01–04 or 06–14.
 */
export const PINKY_NAILS_PALETTE = {
  softPink: '#F4C8D5',
  blushBackground: '#FFF5F7',
  deepBerry: '#702D4B',
  warmWhite: '#FFFCFA',
  roseGold: '#C49A86',
  darkText: '#30242A',
  lightBorder: '#EADDE2',
  white: '#FFFFFF',
} as const;

export const PINKY_NAILS_IMAGES = {
  heroArtist: '/templates/pinky-nails/hero-nail-artist.jpg',
  nailArtCloseup: '/templates/pinky-nails/nail-art-closeup.jpg',
  manicureTreatment: '/templates/pinky-nails/manicure-treatment.jpg',
  studioInterior: '/templates/pinky-nails/studio-interior.jpg',
  nailArtPortfolio: '/templates/pinky-nails/nail-art-portfolio.jpg',
  nailExtension: '/templates/pinky-nails/nail-extension.jpg',
  nailCareTreatment: '/templates/pinky-nails/nail-care-treatment.jpg',
  teamNailArtist: '/templates/pinky-nails/team-nail-artist.jpg',
  bookingBanner: '/templates/pinky-nails/booking-banner.jpg',
  aboutNailArtist: '/templates/pinky-nails/about-nail-artist.jpg',
  galleryChrome: '/templates/pinky-nails/gallery-chrome-art.jpg',
  galleryFrench: '/templates/pinky-nails/gallery-french-tips.jpg',
  galleryFloral: '/templates/pinky-nails/gallery-floral-art.jpg',
  galleryGlitter: '/templates/pinky-nails/gallery-glitter-gold.jpg',
  galleryPedicure: '/templates/pinky-nails/gallery-pedicure-care.jpg',
  serviceGelExtensions: '/templates/pinky-nails/service-gel-extensions.jpg',
  serviceRussianManicure: '/templates/pinky-nails/service-russian-manicure.jpg',
  serviceHandpaintedArt: '/templates/pinky-nails/service-handpainted-art.jpg',
  serviceGlazeChrome: '/templates/pinky-nails/service-glaze-chrome.jpg',
  serviceSpaPedicure: '/templates/pinky-nails/service-spa-pedicure.jpg',
} as const;

/** Approved gallery/sample imagery order used when the owner has no photos of their own. */
export const PINKY_NAILS_GALLERY_IMAGES = [
  PINKY_NAILS_IMAGES.galleryChrome,
  PINKY_NAILS_IMAGES.galleryFrench,
  PINKY_NAILS_IMAGES.galleryFloral,
  PINKY_NAILS_IMAGES.galleryPedicure,
  PINKY_NAILS_IMAGES.galleryGlitter,
] as const;

export const PINKY_NAILS_COPY = {
  welcome: 'WELCOME TO PINKY NAILS STUDIO',
  heroTitle: 'Beautiful Nails. Beautiful You.',
  heroDescription:
    'Give your nails a fresh look with stylish nail art, nail care and beautiful finishes.',
  heroHighlights: ['Nail Art', 'Nail Care', 'Beautiful Finishes'] as const,
  heroBadge: 'Your Nails, Your Style',
  servicesTitle: 'Our Nail Services',
  servicesSubtitle: 'Find the right service for your nails and personal style.',
  aboutTitle: 'Your Nails Deserve Special Care',
  aboutDescription:
    'At Pinky Nails Studio, we believe beautiful nails start with good care and attention to detail. Enjoy a clean, comfortable space and a nail look that suits your style.',
  aboutHighlights: [
    ['Clean Nail Care', 'Fresh tools and a tidy setup for every appointment.'],
    ['Stylish Nail Art', 'Colours, finishes and designs chosen around your style.'],
    ['Comfortable Studio', 'A calm, welcoming space with time for your nails.'],
  ] as const,
  trustTitle: 'Why clients choose the studio',
  trustHighlights: [
    ['Nail Care', 'Give your nails the care they need.'],
    ['Nail Art', 'Find colours and designs to suit your style.'],
    ['Easy Booking', 'Choose from the services available at the studio.'],
  ] as const,
  whyTitle: 'Why Choose Pinky Nails Studio?',
  whySubtitle: 'A simple, comfortable nail studio experience.',
  whyItems: [
    ['Attention to Detail', 'Every nail is shaped, cleaned and finished with care.'],
    ['Stylish Nail Looks', 'Colours and designs chosen around your personal style.'],
    ['A Clean and Comfortable Space', 'A tidy desk, fresh tools and a calm studio to sit back in.'],
    ['Easy Appointment Booking', 'Pick your service and a time that suits you in a few steps.'],
  ] as const,
  stepsTitle: 'Booking Your Visit Is Easy',
  stepsSubtitle: 'Three simple steps from your phone to the studio chair.',
  steps: [
    ['Choose a Service', 'Explore the available services and choose the one you need.'],
    ['Select Your Time', 'Choose an available date and time using the existing booking system.'],
    ['Confirm Your Appointment', 'Follow the booking steps and confirm your appointment.'],
  ] as const,
  faqTitle: 'Frequently Asked Questions',
  faqSubtitle: 'Simple answers about booking and visiting the studio.',
  artTitle: 'A Little Colour, A Lot of Style',
  artDescription: 'Explore nail looks that match your mood, occasion and personal style.',
  galleryTitle: 'Nail Art Gallery',
  gallerySubtitle: 'Take a look at nail designs, colours and finishes.',
  teamTitle: 'Meet Our Nail Artists',
  teamSubtitle: 'Meet the team that helps you get the nail look you love.',
  reviewsTitle: 'Love from Our Clients',
  reviewsSubtitle: 'Real reviews shared by clients of the studio.',
  bookingEyebrow: 'READY FOR YOUR NEXT NAIL LOOK?',
  bookingTitle: "Let's Make Your Nails Beautiful",
  bookingDescription: 'Book your favourite nail service and give yourself a little care.',
  contactTitle: 'Visit Pinky Nails Studio',
  contactSubtitle: 'We look forward to welcoming you to our studio.',
  footerDescription:
    'Nail art, nail care and beautiful finishes in a clean, comfortable studio.',
} as const;

const CATALOG_COVERS = () =>
  new Set(Object.values(CATEGORY_TEMPLATES).map((t) => (t.coverImageUrl || '').trim()));

const LEGACY_NAIL_STOCK_PHOTO_IDS = [
  'photo-1516975080664-ed2fc6a32937',
  'photo-1570172619644-dfd03ed5d881',
  'photo-1534528741775-53994a69daeb',
  'photo-1517841905240-472988babdf9',
  'photo-1494790108377-be9c29b29330',
];

/** Old bundled/unsplash sample imagery that this redesign replaces with new AI assets. */
export function isLegacyNailStudioStockImage(url?: string | null): boolean {
  const value = url?.trim() || '';
  if (!value) return false;
  if (value.startsWith('/templates/pinky-nails/')) return false;
  if (value.includes('/template-assets/')) return true;
  if (!value.includes('images.unsplash.com')) return false;
  return LEGACY_NAIL_STOCK_PHOTO_IDS.some((id) => value.includes(id));
}

export const LEGACY_NAIL_STUDIO_TAGLINES = new Set([
  'Glossy Chrome Gel Nails, Sculpted Extensions, Lash Lifts & Laminated Brows',
]);

export function isLegacyNailStudioStockTagline(tagline?: string | null): boolean {
  const value = tagline?.trim() || '';
  return Boolean(value) && LEGACY_NAIL_STUDIO_TAGLINES.has(value);
}

export function hasOwnerCustomNailCover(profile: SalonProfile): boolean {
  const url = profile.coverImageUrl?.trim();
  if (!url || isLegacyNailStudioStockImage(url)) return false;
  return !CATALOG_COVERS().has(url);
}

export function hasOwnerCustomNailPhoto(profile: SalonProfile): boolean {
  const url = profile.ownerPhotoUrl?.trim();
  if (!url || isLegacyNailStudioStockImage(url)) return false;
  return !Object.values(CATEGORY_TEMPLATES).some((t) => (t.ownerPhotoUrl || '').trim() === url);
}

export function hasOwnerCustomNailTagline(profile: SalonProfile): boolean {
  const tagline = profile.tagline?.trim();
  if (!tagline || isLegacyNailStudioStockTagline(tagline)) return false;
  return !Object.values(CATEGORY_TEMPLATES).some((t) => (t.tagline || '').trim() === tagline);
}

export function hasOwnerCustomNailAbout(profile: SalonProfile): boolean {
  const about = profile.about?.trim();
  if (!about) return false;
  return !Object.values(CATEGORY_TEMPLATES).some(
    (t) => t.id !== 'nail_studio' && (t.about || '').trim() === about,
  );
}

export function isValidNailService(service: SalonService | null | undefined): service is SalonService {
  if (!service || typeof service.name !== 'string' || !service.name.trim()) return false;
  const record = service as SalonService & {
    active?: boolean;
    isActive?: boolean;
    deleted?: boolean;
    isDeleted?: boolean;
    available?: boolean;
    status?: string;
  };
  if (record.active === false || record.isActive === false) return false;
  if (record.deleted === true || record.isDeleted === true) return false;
  if (record.available === false) return false;
  if (
    record.status &&
    ['inactive', 'deleted', 'unavailable', 'archived'].includes(record.status.toLowerCase())
  ) {
    return false;
  }
  return true;
}

export function hasValidNailPrice(price: unknown): price is number {
  return typeof price === 'number' && Number.isFinite(price) && price > 0;
}

export function hasValidNailDuration(
  service: Pick<SalonService, 'durationMinutes' | 'showDuration'>,
): boolean {
  return (
    service.showDuration !== false &&
    typeof service.durationMinutes === 'number' &&
    Number.isFinite(service.durationMinutes) &&
    service.durationMinutes > 0
  );
}

export function isValidNailStaff(staff: Stylist | null | undefined): staff is Stylist {
  if (!staff || typeof staff.name !== 'string' || !staff.name.trim()) return false;
  const record = staff as Stylist & {
    active?: boolean;
    isActive?: boolean;
    deleted?: boolean;
    isDeleted?: boolean;
  };
  if (record.status === 'Inactive') return false;
  if (record.active === false || record.isActive === false) return false;
  if (record.deleted === true || record.isDeleted === true) return false;
  return true;
}

/** Existing-service image mapping — matched by id first, then by service wording. */
export function pinkyNailsServiceImage(service: { id?: string; name?: string; category?: string }): string {
  const id = service.id || '';
  if (id === 'ns-1') return PINKY_NAILS_IMAGES.serviceGelExtensions;
  if (id === 'ns-2') return PINKY_NAILS_IMAGES.serviceRussianManicure;
  if (id === 'ns-3') return PINKY_NAILS_IMAGES.serviceHandpaintedArt;
  if (id === 'ns-4') return PINKY_NAILS_IMAGES.serviceGlazeChrome;
  if (id === 'ns-5') return PINKY_NAILS_IMAGES.serviceSpaPedicure;
  if (id.startsWith('template-pkg-nail_studio-')) {
    const index = Number(id.split('-').pop() || 1);
    const pack = [
      PINKY_NAILS_IMAGES.serviceGelExtensions,
      PINKY_NAILS_IMAGES.serviceRussianManicure,
      PINKY_NAILS_IMAGES.serviceHandpaintedArt,
      PINKY_NAILS_IMAGES.serviceGlazeChrome,
    ];
    return pack[(Number.isFinite(index) ? index - 1 : 0) % pack.length];
  }

  const text = `${service.category || ''} ${service.name || ''}`.toLowerCase();
  if (/gel-x|extension|extensions|sculpt|tip/.test(text)) return PINKY_NAILS_IMAGES.serviceGelExtensions;
  if (/pedicure|foot|spa|rose petal|champagne/.test(text)) return PINKY_NAILS_IMAGES.serviceSpaPedicure;
  if (/russian|cuticle|e-file|efile|manicure/.test(text)) return PINKY_NAILS_IMAGES.serviceRussianManicure;
  if (/chrome|glaze|glazed|pearl|donut|cat-eye|cat eye/.test(text)) return PINKY_NAILS_IMAGES.serviceGlazeChrome;
  if (/art|handpaint|3d|paint|design|jelly/.test(text)) return PINKY_NAILS_IMAGES.serviceHandpaintedArt;
  return PINKY_NAILS_IMAGES.serviceRussianManicure;
}

export interface PinkyFaqItem {
  id: string;
  question: string;
  answer: string;
}

export function pinkyFaqItems(
  profile: SalonProfile,
  contact: { phone: string; whatsappUrl: string; fullAddress: string; hasDirections: boolean },
  hasServices: boolean,
  bookingAvailable: boolean,
): PinkyFaqItem[] {
  const items: PinkyFaqItem[] = [];
  if (bookingAvailable) {
    items.push({
      id: 'faq-booking',
      question: 'How can I book an appointment?',
      answer:
        'Tap the Book Appointment button on this page, choose your service, your nail artist and an available time, then confirm your booking.',
    });
  }
  if (hasServices) {
    items.push({
      id: 'faq-services',
      question: 'Where can I see the available services?',
      answer: `Every service the studio offers is listed in the "Our Nail Services" section on this page.`,
    });
    items.push({
      id: 'faq-prices',
      question: 'How can I check service prices?',
      answer:
        'Each service card shows the price and the time the service takes. The price you see is the studio price for that service.',
    });
  }
  if (bookingAvailable) {
    items.push({
      id: 'faq-time',
      question: 'Can I choose an available appointment time?',
      answer:
        'Yes. While booking, the system shows the dates and time slots that are free, and you can pick the one that suits you.',
    });
  }
  const contactBits = [
    contact.phone ? `Call the studio on ${contact.phone}.` : '',
    contact.whatsappUrl ? 'Send a message on WhatsApp using the WhatsApp button on this page.' : '',
    contact.fullAddress ? `Visit us at ${contact.fullAddress}.` : '',
    contact.hasDirections ? 'Use Get Directions to open the studio location on the map.' : '',
  ].filter(Boolean);
  if (contactBits.length) {
    items.push({
      id: 'faq-contact',
      question: 'How can I contact the studio?',
      answer: contactBits.join(' '),
    });
  }
  const custom = (profile as SalonProfile & { faqItems?: PinkyFaqItem[] }).faqItems;
  if (Array.isArray(custom) && custom.length) {
    const cleaned = custom
      .filter((item) => item && item.question?.trim() && item.answer?.trim())
      .map((item, index) => ({
        id: item.id || `faq-owner-${index + 1}`,
        question: item.question.trim(),
        answer: item.answer.trim(),
      }));
    return cleaned;
  }
  return items;
}

export interface PinkyContactSummary {
  fullAddress: string;
  landmark: string;
  phone: string;
  email: string;
  whatsappUrl: string;
  mapUrl: string;
  hasDirections: boolean;
  validHours: Array<[string, string]>;
  socials: Array<['Instagram' | 'Facebook' | 'YouTube' | 'TikTok', string]>;
  hasAnyContactDetail: boolean;
}

/** Contact details exactly as saved by the owner — never invented. */
export function pinkyNailsContactSummary(
  profile: SalonProfile,
  mapUrl: string,
  whatsappUrl: string,
): PinkyContactSummary {
  const fullAddress = [profile.address?.trim(), profile.city?.trim(), profile.postalCode?.trim()]
    .filter(Boolean)
    .join(', ');
  const landmark = profile.landmark?.trim() || '';
  const phone = profile.phone?.trim() || '';
  const rawEmail = profile.email?.trim() || '';
  const email =
    rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : '';
  const validCoords =
    typeof profile.latitude === 'number' &&
    Number.isFinite(profile.latitude) &&
    typeof profile.longitude === 'number' &&
    Number.isFinite(profile.longitude);
  const hasDirections = Boolean(mapUrl && (fullAddress || validCoords));
  const validHours = (
    [
      ['Monday – Friday (except Tuesday)', profile.workingHoursMonFri?.trim() || ''],
      ['Tuesday', profile.workingHoursTue?.trim() || ''],
      ['Sunday', profile.workingHoursSun?.trim() || ''],
    ] as Array<[string, string]>
  ).filter(([, hours]) => Boolean(hours));
  const socials = (
    [
      ['Instagram', socialUrl(profile.instagramHandle, 'instagram')],
      ['Facebook', socialUrl(profile.facebookPage, 'facebook')],
      ['YouTube', socialUrl(profile.youtubeChannel, 'youtube')],
      ['TikTok', socialUrl(profile.tiktokProfile, 'tiktok')],
    ] as Array<['Instagram' | 'Facebook' | 'YouTube' | 'TikTok', string]>
  ).filter(([, url]) => Boolean(url));

  const hasAnyContactDetail = Boolean(
    fullAddress ||
      landmark ||
      phone ||
      email ||
      whatsappUrl ||
      hasDirections ||
      validHours.length > 0 ||
      socials.length > 0,
  );

  return {
    fullAddress,
    landmark,
    phone,
    email,
    whatsappUrl,
    mapUrl: hasDirections ? mapUrl : '',
    hasDirections,
    validHours,
    socials,
    hasAnyContactDetail,
  };
}

/**
 * Upgrade a stale Supabase template row for Template 05 only.
 * Service records and staff records are always passed through untouched.
 */
export function upgradeNailStudioTemplate<T extends { id: string }>(remote: T): T {
  if (!remote || remote.id !== 'nail_studio') return remote;
  const local = CATEGORY_TEMPLATES.nail_studio;
  const raw = remote as Record<string, any>;
  const next: Record<string, any> = {
    ...raw,
    title: local.title,
    shortName: local.shortName,
    tagline: local.tagline,
    about: local.about,
    coverImageUrl: local.coverImageUrl,
    themePreset: local.themePreset,
    paletteLabel: local.paletteLabel,
  };
  if (
    'themeStyle' in raw ||
    'ownerPhotoUrl' in raw ||
    'layoutStyle' in raw ||
    !Array.isArray(raw.services) ||
    !raw.services.length
  ) {
    next.themeStyle = local.themeStyle;
    next.layoutStyle = local.layoutStyle;
    next.ownerPhotoUrl = local.ownerPhotoUrl;
  }
  return next as T;
}
