import type { SalonProfile, SalonService, Stylist } from '../types';

/**
 * Template 01 — Luxury Editorial Salon.
 *
 * A dedicated identity for the first salon template (`hair_salon`). Everything
 * here is scoped to this template: images, copy defaults, service photography
 * and colour variables. No other template imports this module, so Templates
 * 02–14 keep their own visual systems untouched.
 */

export const LUXURY_EDITORIAL_SELECTOR_LABEL = 'Luxury Editorial Salon';
export const LUXURY_EDITORIAL_DEFAULT_BRAND = 'Luxury Editorial Salon';
export const LUXURY_EDITORIAL_DEFAULT_CITY = 'Bengaluru';
export const LUXURY_EDITORIAL_DEFAULT_PHONE = '+91 90000 00000';
export const LUXURY_EDITORIAL_DEFAULT_ADDRESS = '100 Feet Road, Indiranagar, Bengaluru';

export const LUXURY_EDITORIAL_TAGLINE =
  'Considered cuts, quiet colour and hair rituals designed around you.';
export const LUXURY_EDITORIAL_ABOUT =
  'A calm atelier for beautiful hair. We begin every visit with a conversation, then shape a service around your hair, your routine and the way you want to feel. Expect unhurried appointments, considered products and a finish that still looks like you a week later.';

export const LUXURY_EDITORIAL_HERO = {
  eyebrow: 'The Art of Beauty',
  headline: ['Where Beauty', 'Becomes an', 'Experience'],
  description:
    'Discover exceptional artistry, personalised treatments and a new expression of everyday luxury.',
  primaryCta: 'Book Your Experience',
  secondaryCta: 'Explore Our Services',
  verticalNote: 'Hair Atelier · Est. 2019',
  imageCaption: 'The signature finish',
};

export const LUXURY_EDITORIAL_ABOUT_COPY = {
  eyebrow: 'Our Story',
  heading: ['A studio built', 'around the way', 'you want to feel.'],
  signatureNote: 'Creative direction',
  cta: 'Discover the atelier',
};

export const LUXURY_EDITORIAL_BOOKING_COPY = {
  eyebrow: 'Reserve Your Visit',
  headline: 'Your Next Beautiful Moment Awaits',
  description:
    'Choose your treatment, your specialist and a time that suits you. Every appointment begins with a consultation and ends with a finish made for you.',
  cta: 'Book Appointment',
};

export const LUXURY_EDITORIAL_COLOURS = {
  ivory: '#F7F3EC',
  champagne: '#D8C5A3',
  espresso: '#31251F',
  charcoal: '#24211F',
  beige: '#E9E0D4',
};

export type EditorialImage = {
  /** Largest rendered source — used for `src` and as the no-srcset fallback. */
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
};

function editorialImage(
  slot: string,
  ratio: number,
  widths: number[],
  alt: string,
): EditorialImage {
  const usable = widths.length ? widths : [800];
  const largest = usable[usable.length - 1];
  return {
    src: `/templates/luxury-editorial/${slot}-${largest}.webp`,
    srcSet: usable
      .map((width) => `/templates/luxury-editorial/${slot}-${width}.webp ${width}w`)
      .join(', '),
    width: largest,
    height: Math.round(largest / ratio),
    alt,
  };
}

export const LUXURY_EDITORIAL_IMAGES = {
  hero: editorialImage('hero', 4 / 5, [480, 680, 900], 'Editorial portrait of a woman with glossy sculpted hair in a warm ivory hair atelier'),
  heroDetail: editorialImage('hero-detail', 1, [360, 560], 'Silver shears, a tortoiseshell comb and champagne silk on a travertine tray'),
  about: editorialImage('about', 3 / 4, [480, 660, 800], 'Warm ivory salon atelier with arched brass mirrors and travertine styling counters'),
  aboutDetail: editorialImage('about-detail', 1, [360, 620], 'A stylist sectioning glossy hair with a comb and shears'),
  booking: editorialImage('booking', 16 / 9, [800, 1200, 1400], 'Sunlit luxury salon with sculptural cream chairs and arched brass mirrors'),
  services: {
    cut: editorialImage('service-cut', 4 / 3, [480, 760], 'Precision haircut being shaped with silver shears'),
    colour: editorialImage('service-colour', 4 / 3, [480, 760], 'A colourist painting warm caramel balayage onto dark hair'),
    keratin: editorialImage('service-keratin', 4 / 3, [480, 760], 'Glossy, mirror-shine hair after a smoothing treatment'),
    keratinAlt: editorialImage('service-keratin-alt', 1, [480, 760], 'Close-up of bond-building treatment brushed through glossy hair'),
    styling: editorialImage('service-styling', 4 / 3, [480, 760], 'Soft blowout waves being shaped with a curling tong'),
    scalp: editorialImage('service-scalp', 4 / 3, [480, 760], 'A relaxing scalp ritual at the shampoo basin'),
    bridal: editorialImage('service-bridal', 4 / 3, [480, 760], 'An elegant low chignon finished with pearl pins'),
  },
  team: [
    editorialImage('team-1', 3 / 4, [420, 680], 'Creative director in a black linen apron holding silver shears'),
    editorialImage('team-2', 3 / 4, [420, 680], 'Senior stylist in a charcoal apron in the ivory atelier'),
    editorialImage('team-3', 3 / 4, [420, 680], 'Hair colour specialist holding a tint brush in the atelier'),
  ],
  gallery: [
    editorialImage('gallery-1', 3 / 4, [480, 700], 'Glossy blunt bob with a soft, face-framing finish'),
    editorialImage('gallery-2', 4 / 3, [520, 900], 'Shears and a comb resting on a travertine salon counter'),
    editorialImage('gallery-3', 1, [480, 700], 'A quiet consultation at the arched mirror'),
    editorialImage('gallery-4', 4 / 5, [480, 700], 'Editorial braided updo with a fine gold thread'),
    editorialImage('gallery-5', 3 / 2, [520, 900], 'Warm caramel balayage through long, softly waved hair'),
    editorialImage('gallery-6', 1, [480, 700], 'A polished blowdry and brush-out in warm window light'),
  ],
} as const;

/** Responsive widths generated by `scripts/build-template01-assets.mjs`. */
export const LUXURY_EDITORIAL_WIDTHS: Record<string, number[]> = {
  hero: [480, 680, 900],
  'hero-detail': [360, 560],
  about: [480, 660, 800],
  'about-detail': [360, 620],
  booking: [800, 1200, 1400],
  'service-cut': [480, 760],
  'service-colour': [480, 760],
  'service-keratin': [480, 760],
  'service-keratin-alt': [480, 760],
  'service-styling': [480, 760],
  'service-scalp': [480, 760],
  'service-bridal': [480, 760],
  'team-1': [420, 680],
  'team-2': [420, 680],
  'team-3': [420, 680],
  'gallery-1': [480, 700],
  'gallery-2': [520, 900],
  'gallery-3': [480, 700],
  'gallery-4': [480, 700],
  'gallery-5': [520, 900],
  'gallery-6': [480, 700],
};

/** Builds a real `srcset` for this template's own images; owner URLs return undefined. */
export function editorialSrcSet(url?: string): string | undefined {
  const match = /^\/templates\/luxury-editorial\/([a-z0-9-]+?)-\d+\.webp$/i.exec(String(url || '').trim());
  if (!match) return undefined;
  const widths = LUXURY_EDITORIAL_WIDTHS[match[1]];
  if (!widths?.length) return undefined;
  return widths.map((width) => `/templates/luxury-editorial/${match[1]}-${width}.webp ${width}w`).join(', ');
}

/** The old Template 01 stock photography and copy, upgraded in place. */
const LEGACY_HAIR_STOCK_IMAGES = [
  'photo-1560066984-138dadb4c035',
  'photo-1562322140-8baeececf3df',
  'photo-1522337360788-8b13dee7a37e',
  'photo-1605497788044-5a32c7078486',
  'photo-1521590832167-7bcbfaa6381f',
  'photo-1580618672591-eb180b1a973f',
  'photo-1517832606589',
  'photo-1521590832167',
];

export function isLegacyHairSalonStockUrl(value?: string): boolean {
  const url = String(value || '').trim();
  if (!url) return false;
  return LEGACY_HAIR_STOCK_IMAGES.some((fragment) => url.includes(fragment));
}

export function isLegacyHairSalonTagline(value?: string): boolean {
  return /^Precision Cuts, Modern Geometry & High-Fashion Hair Artistry$/i.test(String(value || '').trim());
}

export function isLegacyHairSalonAbout(value?: string): boolean {
  return /^Located in the vibrant heart of Indiranagar, Miraki is/i.test(String(value || '').trim());
}

/** True when an image belongs to this template's own bundled photography. */
export function isLuxuryEditorialAsset(url?: string): boolean {
  return /^\/templates\/luxury-editorial\//.test(String(url || '').trim());
}

const SERVICE_TEXT_PATTERNS: Array<[RegExp, keyof typeof LUXURY_EDITORIAL_IMAGES.services]> = [
  [/bridal|wedding|chignon|updo|makeover|occasion|reception|engagement/i, 'bridal'],
  [/colou?r|balayage|highlight|gloss|tint|ombre|blonde|babylights|lowlight|caramel|global/i, 'colour'],
  [/keratin|smooth|botox|rebond|straight|frizz|protein|bond/i, 'keratin'],
  [/scalp|spa|wash|massage|detox|ritual|treatment|therapy|hydra/i, 'scalp'],
  // A cut always wins over "stylist"/"blowdry" wording in a combined service name.
  [/cut|trim|layer|fringe|bob|haircut|precision|scissor|shag|bang/i, 'cut'],
  [/styl|blow|curl|wave|iron|tong|dry|finish|set/i, 'styling'],
];

/** A coordinated close-up for an individual service, matched by its real name/category. */
export function luxuryEditorialServiceImage(service: Pick<SalonService, 'name' | 'category'>): string {
  const text = `${service.category || ''} ${service.name || ''}`;
  // Two smoothing rituals share a category; give the bond-building one its own
  // square crop so the grid never shows the same photograph twice.
  if (/botox|bond|reconstruction|fiber/i.test(text)) return LUXURY_EDITORIAL_IMAGES.services.keratinAlt.src;
  // A combined "cut & wash" service reads best as the basin ritual in the grid,
  // leaving the cut photograph for the featured precision-cut card.
  if (/wash|basin|shampoo/i.test(text)) return LUXURY_EDITORIAL_IMAGES.services.scalp.src;
  const match = SERVICE_TEXT_PATTERNS.find(([pattern]) => pattern.test(text));
  const image = match ? LUXURY_EDITORIAL_IMAGES.services[match[1]] : LUXURY_EDITORIAL_IMAGES.services.cut;
  return image.src;
}

/** Gallery fallbacks for this template, used only when the salon has no own photos. */
export const LUXURY_EDITORIAL_GALLERY_URLS = LUXURY_EDITORIAL_IMAGES.gallery.map((image) => image.src);

/** Portrait fallbacks, matched to a specialist's real role where possible. */
export function luxuryEditorialTeamImage(staff: Pick<Stylist, 'name' | 'role'>, index: number): EditorialImage {
  const text = `${staff.role || ''} ${staff.name || ''}`.toLowerCase();
  if (/colou?r|tint|balayage|technical/.test(text)) return LUXURY_EDITORIAL_IMAGES.team[2];
  if (/director|founder|creative|master|lead|senior/.test(text)) return LUXURY_EDITORIAL_IMAGES.team[0];
  return LUXURY_EDITORIAL_IMAGES.team[index % LUXURY_EDITORIAL_IMAGES.team.length];
}

export function luxuryEditorialCssVariables(profile: SalonProfile): Record<string, string> {
  const accent = String(profile.customAccentColor || '').trim() || LUXURY_EDITORIAL_COLOURS.champagne;
  return {
    '--le-accent': accent,
    '--le-accent-soft': `color-mix(in srgb, ${accent} 16%, ${LUXURY_EDITORIAL_COLOURS.ivory})`,
    '--le-accent-line': `color-mix(in srgb, ${accent} 55%, ${LUXURY_EDITORIAL_COLOURS.beige})`,
  };
}

export function luxuryEditorialBrand(profile: SalonProfile): string {
  return String(profile.businessName || '').trim() || LUXURY_EDITORIAL_DEFAULT_BRAND;
}

export function luxuryEditorialCity(profile: SalonProfile): string {
  return String(profile.city || '').split(',')[0].trim() || LUXURY_EDITORIAL_DEFAULT_CITY;
}

export function luxuryEditorialAddress(profile: SalonProfile): string {
  const address = String(profile.address || '').trim();
  const city = String(profile.city || '').trim();
  const postal = String(profile.postalCode || '').trim();
  if (address && city && !address.toLowerCase().includes(city.split(',')[0].toLowerCase())) {
    return `${address}, ${city}`;
  }
  if (address) return address;
  if (city) return city;
  return LUXURY_EDITORIAL_DEFAULT_ADDRESS;
}

export function luxuryEditorialMapsUrl(profile: SalonProfile): string {
  if (Number.isFinite(profile.latitude) && Number.isFinite(profile.longitude)) {
    return `https://www.google.com/maps/search/?api=1&query=${profile.latitude},${profile.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [profile.address, profile.city, profile.postalCode].filter(Boolean).join(', ') ||
      LUXURY_EDITORIAL_DEFAULT_ADDRESS,
  )}`;
}

export function luxuryEditorialWhatsApp(profile: SalonProfile): string {
  const digits = String(profile.whatsapp || profile.phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  const normalised = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalised}?text=${encodeURIComponent(
    `Hello ${luxuryEditorialBrand(profile)}, I would like to enquire about an appointment.`,
  )}`;
}

export function luxuryEditorialHours(profile: SalonProfile): Array<{ label: string; value: string }> {
  return [
    { label: 'Monday – Friday', value: profile.workingHoursMonFri || 'By appointment' },
    { label: 'Saturday', value: profile.workingHoursSat || 'By appointment' },
    { label: 'Sunday', value: profile.workingHoursSun || 'By appointment' },
  ];
}

export function formatEditorialPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || !Number.isFinite(Number(price))) return 'On request';
  return `₹${Number(price).toLocaleString('en-IN')}`;
}

export function editorialReviewSummary(
  reviews: Array<{ rating?: number; isDemo?: boolean; comment?: string }> | undefined,
): { average: number; count: number } {
  const real = (reviews || []).filter(
    (review) => !review.isDemo && Number(review.rating) > 0 && String(review.comment || '').trim(),
  );
  if (!real.length) return { average: 0, count: 0 };
  const total = real.reduce((sum, review) => sum + Math.max(1, Math.min(5, Number(review.rating))), 0);
  return { average: Math.round((total / real.length) * 10) / 10, count: real.length };
}
