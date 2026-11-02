import type { SalonProfile, SalonService, Stylist } from '../types';
import { SALON_IMAGES } from '../assets/images';
import { CATEGORY_STANDARDIZED_DATA } from '../templateData';
import type { AccentPaletteKey } from '../themeAccents';

/**
 * Template 03 — Aura Unisex Salon & Wellness Lounge (`businessType: 'unisex_salon'`).
 *
 * Scoped design tokens, simple Indian-English copy, responsive WebP photography
 * helpers and service/team matchers used only by the Aura template. Nothing in
 * this module is imported by any other template.
 */

export const AURA_UNISEX_COLOURS = {
  warmWhite: '#FAF8F5',
  white: '#FFFFFF',
  charcoal: '#252525',
  charcoalSoft: '#3A3A38',
  green: '#738B78',
  greenDeep: '#5C7362',
  greenDark: '#4A5C4F',
  softGreen: '#E7EEE7',
  beige: '#F0E6DA',
  gold: '#C5A46D',
  muted: '#6B6A66',
  border: '#E6E2DB',
} as const;

export interface AuraImage {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
}

function img(slot: string, widths: number[], ratio: number, alt: string): AuraImage {
  const largest = widths[widths.length - 1];
  return {
    src: `/templates/aura-unisex/${slot}-${largest}.webp`,
    srcSet: widths.map((width) => `/templates/aura-unisex/${slot}-${width}.webp ${width}w`).join(', '),
    width: largest,
    height: Math.round(largest / ratio),
    alt,
  };
}

/** Every asset is a single standalone photograph — no collages, no text, no watermarks. */
export const AURA_UNISEX_IMAGES = {
  heroMain: img(
    'hero-main',
    [480, 720, 1024],
    3 / 4,
    'Modern Indian unisex salon with a male and a female salon professional attending clients',
  ),
  heroMen: img('hero-men', [480, 760], 16 / 10, 'Indian man getting a professional haircut at Aura salon'),
  heroWomen: img('hero-women', [480, 760], 16 / 10, 'Indian woman having her hair blow-dried and styled at Aura salon'),
  aboutInterior: img('about-interior', [480, 760, 1080], 4 / 3, 'Bright modern unisex salon interior with styling chairs and mirrors'),
  aboutWork: img('about-work', [360, 620], 1, 'Salon professional caring for a customer during a hair service'),
  featureMen: img('feature-men', [640, 960], 16 / 10, 'Indian male customer getting a beard styling and hair grooming service'),
  featureWomen: img('feature-women', [640, 960], 16 / 10, 'Indian female customer getting a professional hair and beauty service'),
  wellness: img('wellness', [640, 960, 1280], 4 / 3, 'Calm and clean wellness treatment room inside an Indian unisex salon'),
  booking: img('booking', [800, 1280], 16 / 9, 'Professional salon service for men and women at Aura Unisex Salon'),
  gallery: [
    img('gallery-1', [480, 760], 4 / 5, "Men's haircut and hairline shaping at Aura salon"),
    img('gallery-2', [480, 760], 4 / 5, "Women's hair styling and blow dry at Aura salon"),
    img('gallery-3', [480, 760], 4 / 5, 'Professional hair colour work at Aura salon'),
    img('gallery-4', [480, 760], 4 / 5, 'Aura unisex salon interior with styling stations'),
    img('gallery-5', [480, 760], 4 / 5, 'Beard grooming and men’s styling work at Aura salon'),
  ],
  services: {
    haircut: img('service-haircut', [480, 760], 4 / 5, 'Unisex haircut with wash and styling at Aura salon'),
    colour: img('service-colour', [480, 760], 4 / 5, 'Hair colour service being applied at Aura salon'),
    beard: img('service-beard', [480, 760], 4 / 5, "Men's beard styling and grooming at Aura salon"),
    facial: img('service-facial', [480, 760], 4 / 5, 'Face cleanup and skin care service at Aura salon'),
    styling: img('service-styling', [480, 760], 4 / 5, "Women's hair styling service at Aura salon"),
    pedicure: img('service-pedicure', [480, 760], 4 / 5, 'Manicure and pedicure hand and foot care at Aura salon'),
    hairspa: img('service-hairspa', [480, 760], 4 / 5, 'Hair spa and head massage service at Aura salon'),
  },
} as const;

export type AuraServiceSlot = keyof typeof AURA_UNISEX_IMAGES.services;

/** Owner-uploaded photography is never replaced by template artwork. */
const TEMPLATE_SEED_IMAGES = new Set<string>(Object.values(SALON_IMAGES).map((value) => String(value)));

export function isAuraTemplateSeedImage(url?: string | null): boolean {
  const clean = String(url || '').trim();
  if (!clean) return true;
  return TEMPLATE_SEED_IMAGES.has(clean);
}

const SERVICE_SLOT_RULES: Array<{ slot: AuraServiceSlot; pattern: RegExp }> = [
  { slot: 'beard', pattern: /\b(beard|shav|mustach|men'?s|groom(ing)?)\b/i },
  { slot: 'hairspa', pattern: /\b(hair\s*spa|scalp|massage|spa\s*ritual|head\s*massage)\b/i },
  { slot: 'facial', pattern: /\b(facial|skin|clean[-\s]?up|de[-\s]?tan|detan|bleach|acne|polish|peel|pack)\b/i },
  { slot: 'pedicure', pattern: /\b(pedicure|manicure|nail|hands|feet|foot)\b/i },
  { slot: 'styling', pattern: /\b(styl(ing|ed)|blow[-\s]?dry|blowdry|setting|iron|curl|straighten|updo|makeup|mehnd?i|wax|thread)\b/i },
  { slot: 'colour', pattern: /\b(colou?r|colou?red|highlight|balayage|global|root\s*touch|tint|gloss)\b/i },
  { slot: 'haircut', pattern: /\b(hair\s*cut|haircut|cut|trim|keratin|smooth|bond|repair|olaplex|treatment|wash|condition)\b/i },
];

export function auraServiceSlot(service: Pick<SalonService, 'name' | 'category'>): AuraServiceSlot {
  const text = `${service.name || ''} ${service.category || ''}`;
  for (const rule of SERVICE_SLOT_RULES) {
    if (rule.pattern.test(text)) return rule.slot;
  }
  return 'haircut';
}

export function auraServiceImage(service: SalonService): { src: string; srcSet: string; alt: string } {
  const uploaded = String(service.imageUrl || '').trim();
  if (uploaded && !isAuraTemplateSeedImage(uploaded)) {
    return { src: uploaded, srcSet: '', alt: `${service.name} at Aura Unisex Salon` };
  }
  const slot = AURA_UNISEX_IMAGES.services[auraServiceSlot(service)];
  return { src: slot.src, srcSet: slot.srcSet, alt: slot.alt };
}

export function auraTeamImage(stylist: Stylist, index: number): { src: string; alt: string } {
  const uploaded = String(stylist.avatarUrl || '').trim();
  if (uploaded && !TEMPLATE_SEED_IMAGES.has(uploaded)) return { src: uploaded, alt: stylist.name };
  if (uploaded) return { src: uploaded, alt: stylist.name };
  return {
    src: AURA_UNISEX_IMAGES.aboutWork.src,
    alt: `${stylist.name || `Team member ${index + 1}`} at Aura Unisex Salon`,
  };
}

/* ---------------------------------------------------------------------------
   Service category tabs — only the tabs the salon's real menu supports.
   --------------------------------------------------------------------------- */

export type AuraServiceTab = 'All Services' | 'Hair' | 'Beauty' | "Men's Grooming" | 'Skin Care' | 'Wellness';

export const AURA_SERVICE_TABS: AuraServiceTab[] = [
  'All Services',
  'Hair',
  'Beauty',
  "Men's Grooming",
  'Skin Care',
  'Wellness',
];

const TAB_PATTERNS: Array<{ tab: Exclude<AuraServiceTab, 'All Services'>; pattern: RegExp }> = [
  { tab: "Men's Grooming", pattern: /\b(beard|shav|mustach|men'?s|groom(ing)?)\b/i },
  {
    tab: 'Wellness',
    pattern: /\b(massage|wellness|therapy|relax|aroma|reflexology|shirodhara|body\s*(polish|scrub|wrap)|spa\s*ritual)\b/i,
  },
  { tab: 'Skin Care', pattern: /\b(facial|skin|clean[-\s]?up|de[-\s]?tan|detan|bleach|acne|peel|polish|pack)\b/i },
  { tab: 'Beauty', pattern: /\b(beauty|wax|thread|manicure|pedicure|nail|makeup|make\s*over|mehnd?i|hands|feet)\b/i },
  { tab: 'Hair', pattern: /\b(hair|cut|trim|colou?r|highlight|balayage|keratin|smooth|style|styling|wash|condition|spa|treatment|bond|repair)\b/i },
];

export function auraServiceTab(service: Pick<SalonService, 'name' | 'category'>): Exclude<AuraServiceTab, 'All Services'> {
  const text = `${service.name || ''} ${service.category || ''}`;
  for (const entry of TAB_PATTERNS) {
    if (entry.pattern.test(text)) return entry.tab;
  }
  return 'Hair';
}

/** Tabs that actually have services behind them, always led by "All Services". */
export function auraServiceTabs(services: SalonService[]): AuraServiceTab[] {
  const present = new Set<Exclude<AuraServiceTab, 'All Services'>>();
  for (const service of services) present.add(auraServiceTab(service));
  return AURA_SERVICE_TABS.filter((tab) => tab === 'All Services' || present.has(tab as Exclude<AuraServiceTab, 'All Services'>));
}

export function auraServicesForTab(services: SalonService[], tab: AuraServiceTab): SalonService[] {
  if (tab === 'All Services') return services;
  return services.filter((service) => auraServiceTab(service) === tab);
}

/** Women's menu = Beauty + Hair; Men's menu = Men's Grooming when the salon offers it. */
export function auraGenderTab(services: SalonService[], gender: 'men' | 'women'): AuraServiceTab {
  const tabs = auraServiceTabs(services);
  if (gender === 'men') {
    if (tabs.includes("Men's Grooming")) return "Men's Grooming";
    return 'All Services';
  }
  if (tabs.includes('Beauty')) return 'Beauty';
  if (tabs.includes('Hair')) return 'Hair';
  return 'All Services';
}

/* ---------------------------------------------------------------------------
   Salon details — always read from the owner's saved profile first.
   --------------------------------------------------------------------------- */

export const AURA_UNISEX_BRAND = 'Aura Unisex Salon & Wellness Lounge';

export function auraBrand(profile: Pick<SalonProfile, 'businessName'>): string {
  const raw = String(profile.businessName || '').trim();
  if (!raw || /^luxury editorial salon/i.test(raw)) return AURA_UNISEX_BRAND;
  return raw;
}

export function auraCity(profile: Pick<SalonProfile, 'city'>): string {
  return String(profile.city || '').trim() || 'Bengaluru, Karnataka';
}

export function auraAddress(profile: Pick<SalonProfile, 'address' | 'city' | 'postalCode'>): string {
  const street = String(profile.address || '').trim() || 'Outer Ring Road, 4th Block, Koramangala';
  const city = auraCity(profile);
  const pin = String(profile.postalCode || '').trim() || '560095';
  return [street, city, pin].filter(Boolean).join(', ');
}

export function auraMapsUrl(profile: SalonProfile): string {
  if (
    typeof profile.latitude === 'number' &&
    Number.isFinite(profile.latitude) &&
    typeof profile.longitude === 'number' &&
    Number.isFinite(profile.longitude)
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${profile.latitude},${profile.longitude}`;
  }
  const query = encodeURIComponent(`${auraBrand(profile)}, ${auraAddress(profile)}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function auraWhatsApp(profile: Pick<SalonProfile, 'whatsapp' | 'phone'>): string {
  const raw = String(profile.whatsapp || profile.phone || '+91 98455 33210').replace(/\D/g, '');
  const digits = raw.length === 10 ? `91${raw}` : raw || '919845533210';
  const message = encodeURIComponent('Hi Aura, I would like to book a salon appointment.');
  return `https://wa.me/${digits}?text=${message}`;
}

export function auraPhoneDigits(profile: Pick<SalonProfile, 'phone'>): string {
  return String(profile.phone || '').replace(/[^+0-9]/g, '');
}

export interface AuraHourRow {
  days: string;
  hours: string;
}

export function auraHours(profile: SalonProfile): AuraHourRow[] {
  const standard = CATEGORY_STANDARDIZED_DATA.unisex_salon;
  const fallback = `${standard.openHourText} – ${standard.closeHourText}`;
  const rows: AuraHourRow[] = [
    { days: 'Monday – Saturday', hours: String(profile.workingHoursMonFri || '').trim() || fallback },
  ];
  if (String(profile.workingHoursTue || '').trim()) rows.push({ days: 'Tuesday', hours: String(profile.workingHoursTue).trim() });
  if (String(profile.workingHoursSat || '').trim()) rows.push({ days: 'Saturday', hours: String(profile.workingHoursSat).trim() });
  if (String(profile.workingHoursSun || '').trim()) rows.push({ days: 'Sunday', hours: String(profile.workingHoursSun).trim() });
  else rows.push({ days: 'Sunday', hours: fallback });
  return rows;
}

/* ---------------------------------------------------------------------------
   Branding colours — the owner's website editor choice always wins.
   --------------------------------------------------------------------------- */

export interface AuraAccent {
  primary: string;
  deep: string;
  soft: string;
  onPrimary: string;
}

/**
 * Template 03 ships a Sage Green brand. The owner can still repaint the whole
 * template from the existing website editor: a custom accent colour is used
 * verbatim, and the eight curated palette keys map to Aura-appropriate tones.
 */
const AURA_ACCENT_PRESETS: Record<AccentPaletteKey, AuraAccent> = {
  slate: { primary: AURA_UNISEX_COLOURS.green, deep: AURA_UNISEX_COLOURS.greenDeep, soft: AURA_UNISEX_COLOURS.softGreen, onPrimary: '#FFFFFF' },
  emerald: { primary: '#5C7362', deep: '#4A5C4F', soft: '#E7EEE7', onPrimary: '#FFFFFF' },
  ocean: { primary: '#5E7F80', deep: '#48666A', soft: '#E6EEEE', onPrimary: '#FFFFFF' },
  rose: { primary: '#8A6A72', deep: '#6F525A', soft: '#F2E9EA', onPrimary: '#FFFFFF' },
  crimson: { primary: '#8F5A5A', deep: '#744646', soft: '#F3E7E5', onPrimary: '#FFFFFF' },
  mahogany: { primary: '#7C6A54', deep: '#63533F', soft: '#F1EADD', onPrimary: '#FFFFFF' },
  purple: { primary: '#6C6A86', deep: '#55536C', soft: '#EAE9F0', onPrimary: '#FFFFFF' },
  obsidian: { primary: '#3C3C39', deep: '#252525', soft: '#E8E6E1', onPrimary: '#FFFFFF' },
};

export function auraAccent(profile: Pick<SalonProfile, 'customAccentColor' | 'themeAccentKey'>): AuraAccent {
  const custom = String(profile.customAccentColor || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(custom)) {
    return { primary: custom, deep: custom, soft: AURA_UNISEX_COLOURS.softGreen, onPrimary: '#FFFFFF' };
  }
  const key = (profile.themeAccentKey || 'slate') as AccentPaletteKey;
  return AURA_ACCENT_PRESETS[key] || AURA_ACCENT_PRESETS.slate;
}

export function auraCssVariables(profile: Pick<SalonProfile, 'customAccentColor' | 'themeAccentKey'>): Record<string, string> {
  const accent = auraAccent(profile);
  return {
    '--au-accent': accent.primary,
    '--au-accent-deep': accent.deep,
    '--au-accent-soft': accent.soft,
  };
}

/* ---------------------------------------------------------------------------
   Copy — simple Indian English, no difficult marketing words.
   --------------------------------------------------------------------------- */

export const AURA_UNISEX_COPY = {
  brandSublabel: 'Salon & Wellness',
  navHome: 'Home',
  navServices: 'Services',
  navAbout: 'About',
  navTeam: 'Our Team',
  navGallery: 'Gallery',
  navContact: 'Contact',
  heroEyebrow: 'WELCOME TO AURA',
  heroTitle: 'Look Good. Feel Fresh. Be You.',
  heroText:
    'Hair, skin, grooming and wellness services for men and women. Enjoy expert care and a relaxing salon experience.',
  heroPrimary: 'Book Appointment',
  heroSecondary: 'View Services',
  heroPoints: ['Hair & Beauty', "Men's Grooming", 'Relax & Wellness'],
  heroCardMen: "Men's Haircut & Grooming",
  heroCardWomen: "Women's Hair & Beauty",
  heroCareBoxTitle: 'Care for Everyone',
  heroCareBoxText: 'One friendly salon for men, women and families.',
  servicesEyebrow: 'Our Services',
  servicesTitle: 'Services for Men and Women',
  servicesText: 'Choose a service and book your time. Prices and timings are shared as the salon has entered them.',
  bookNow: 'Book Now',
  aboutEyebrow: 'About Aura',
  aboutTitle: 'Your Style. Your Comfort. Our Care.',
  aboutDefault:
    'At Aura, we believe everyone deserves to look good and feel confident. From a fresh haircut to relaxing salon care, our team is here to make every visit special. Friendly experts, quality products and a clean, relaxing space in the heart of Koramangala.',
  aboutHighlights: [
    { title: 'Friendly Team', text: 'Our team listens first and then suggests what suits you.' },
    { title: 'Quality Products', text: 'We use trusted, good quality products for every service.' },
    { title: 'Clean & Relaxing Space', text: 'A neat, calm salon where you can sit back and relax.' },
  ],
  aboutButton: 'Know More',
  menTitle: "Men's Grooming",
  menText: 'Fresh haircuts, beard styling, hair colour and more.',
  menButton: "Explore Men's Services",
  womenTitle: "Women's Beauty & Hair",
  womenText: 'Hair styling, hair care, skin care and beauty services.',
  womenButton: "Explore Women's Services",
  wellnessEyebrow: 'Wellness',
  wellnessTitle: 'Take Time for Yourself',
  wellnessText: 'Relax your mind and refresh your look with our wellness and self-care services.',
  wellnessButton: 'View Wellness Services',
  wellnessEmpty: 'Wellness services will be listed here as soon as the salon adds them.',
  teamEyebrow: 'Our Team',
  teamTitle: 'Meet Our Salon Team',
  teamText: 'Our trained team takes care of your hair, skin and grooming needs.',
  teamButton: 'Book with Staff',
  galleryEyebrow: 'Gallery',
  galleryTitle: 'Our Salon Work',
  galleryText: 'A look at our salon, our work and our happy customers.',
  reviewsEyebrow: 'Customer Reviews',
  reviewsTitle: 'Happy Clients, Happy Smiles',
  reviewsText: 'Real words from our customers after their salon visit.',
  bookingEyebrow: 'READY FOR A FRESH LOOK?',
  bookingTitle: 'Your Next Salon Visit Starts Here',
  bookingText: 'Book your favourite service at a time that works for you.',
  bookingButton: 'Book Appointment',
  contactEyebrow: 'Contact Us',
  contactTitle: 'Visit Aura Salon',
  contactText: 'Call us, message us on WhatsApp or simply walk in. We are happy to help you plan your visit.',
  directions: 'Get Directions',
  callNow: 'Call the Salon',
  whatsappNow: 'WhatsApp Us',
  footerQuickLinks: 'Quick Links',
  footerServices: 'Popular Services',
  footerContact: 'Contact Us',
  footerFollow: 'Follow Us',
  footerRights: 'All rights reserved.',
  footerLegal: ['Privacy Policy', 'Terms & Conditions', 'Cancellation & Refund Policy'],
} as const;

export function auraAboutText(profile: Pick<SalonProfile, 'about'>): string {
  const raw = String(profile.about || '').trim();
  if (!raw) return AURA_UNISEX_COPY.aboutDefault;
  return raw;
}

export function money(value: number | null | undefined): string {
  const safe = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  return `₹${safe.toLocaleString('en-IN')}`;
}

export function durationLabel(minutes: number | null | undefined): string {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return '';
  return `${Math.round(value)} min`;
}
