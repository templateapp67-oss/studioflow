/**
 * Template 03 — Aura Unisex Salon & Wellness Lounge · Supabase content layer.
 *
 * One generic section table stores every editable Template 03 section. The
 * existing `studioflow_accounts.draft` workspace, services, stylists, bookings,
 * customer reviews and loyalty ledgers are never written by this module. All
 * values here are display-only website content, except the owner's own media
 * assets in the existing `studioflow-media` Storage bucket.
 *
 * This module is deliberately scoped to `businessType: 'unisex_salon'`.
 */
import {
  AURA_CATEGORY_PILLARS,
  AURA_DEMO_OFFERS,
  AURA_DEMO_REELS,
  AURA_DEMO_REWARDS,
  AURA_LOYALTY_TIERS,
  AURA_SERVICE_TABS,
  AURA_UNISEX_COPY,
  AURA_UNISEX_IMAGES,
  AURA_VIDEO_FILTERS,
  AURA_WHY_CHOOSE_US,
  auraAddress,
  auraPhoneDigits,
  auraWhatsApp,
  type AuraImage,
} from './auraUnisex';
import { demoTestimonials } from './demoWebsiteContent';
import { parseSocialVideo } from './socialVideoEmbeds';
import { secureMediaUrl } from './socialVideoSource';
import { socialUrl } from './websiteContent';
import { supabase } from './supabase';
import type { SalonProfile } from '../types';

export const AURA_TEMPLATE_ID = 'unisex_salon' as const;
export const AURA_SECTIONS_TABLE = 'studioflow_template_sections' as const;
export const AURA_MEDIA_BUCKET = 'studioflow-media' as const;
export const AURA_PUBLIC_SECTIONS_RPC = 'get_aura_template_sections' as const;
export const AURA_SECTIONS_EVENT = 'aura-template-sections-saved' as const;

export const AURA_SECTION_KEYS = [
  'header',
  'branding',
  'hero',
  'hero_media',
  'buttons',
  'categories',
  'about',
  'why_choose_us',
  'services',
  'staff',
  'gallery',
  'videos',
  'reviews',
  'promotions',
  'loyalty',
  'booking',
  'contact',
  'social',
  'footer',
] as const;
export type AuraSectionKey = (typeof AURA_SECTION_KEYS)[number];

export const AURA_SECTION_LABELS: Record<AuraSectionKey, string> = {
  header: 'Header & navigation',
  branding: 'Logo & salon name',
  hero: 'Hero heading & description',
  hero_media: 'Hero images',
  buttons: 'Buttons & links',
  categories: 'Salon categories',
  about: 'About the Salon',
  why_choose_us: 'Why Choose Us',
  services: 'Services display content',
  staff: 'Staff & hair expert profiles',
  gallery: 'Image gallery',
  videos: 'Video gallery',
  reviews: 'Customer reviews',
  promotions: 'Promotions & Offers',
  loyalty: 'Loyalty & Rewards',
  booking: 'Booking section display',
  contact: 'Contact details',
  social: 'Social media links',
  footer: 'Footer content',
};

const AURA_SECTION_ORDER: Record<AuraSectionKey, number> = {
  header: 0,
  branding: 1,
  hero: 10,
  hero_media: 11,
  buttons: 12,
  categories: 20,
  services: 30,
  about: 40,
  why_choose_us: 50,
  staff: 60,
  gallery: 70,
  videos: 80,
  reviews: 90,
  promotions: 100,
  loyalty: 110,
  booking: 120,
  contact: 130,
  social: 140,
  footer: 1000,
};

export type AuraJson = Record<string, any>;
export type AuraMediaAsset = {
  url?: string;
  path?: string;
  srcSet?: string;
  alt?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  name?: string;
  size?: number;
};
export type AuraVideoAsset = AuraMediaAsset & { kind?: 'upload' | 'link' | '' };
export type AuraButtonItem = {
  id: string;
  label: string;
  href: string;
  action: 'book' | 'scroll' | 'link';
  visible: boolean;
};
export type AuraSectionState = {
  templateId: typeof AURA_TEMPLATE_ID;
  salonId?: string;
  sectionKey: AuraSectionKey;
  sectionContent: AuraJson;
  sectionSettings: AuraJson;
  isVisible: boolean;
  displayOrder: number;
  updatedAt?: string;
  updatedBy?: string;
  source: 'default' | 'saved';
};
export type AuraSectionDraft = Omit<AuraSectionState, 'salonId' | 'updatedAt' | 'updatedBy' | 'source'> & {
  id?: string;
};
export type AuraSectionInput = unknown;

export const FORBIDDEN_AURA_CONTENT_KEYS = [
  'amountPaid',
  'bookingId',
  'customerId',
  'paymentStatus',
  'paymentIntent',
  'bookingRecords',
  'customerRecords',
  'financialRecords',
  'serviceRoleKey',
  'secret',
] as const;

/* ------------------------------------------------------------------------- *
 * Small, dependency-free helpers
 * ------------------------------------------------------------------------- */

const isObject = (value: unknown): value is AuraJson =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function cleanAuraText(value: unknown, maxLength = 2000): string {
  const raw = value === null || value === undefined ? '' : String(value);
  return raw
    .replace(/<\s*\/?\s*(script|style|iframe|object|embed|link|meta)[^>]*>/gi, ' ')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function cleanAuraMultiline(value: unknown, maxLength = 4000): string {
  return cleanAuraText(value, maxLength);
}

export function auraSafeMediaUrl(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\/templates\/aura-unisex\/[\w.-]+\.(webp|jpg|jpeg|png)$/i.test(raw)) return raw;
  if (/^\/templates\/[\w./-]+\.(webp|jpg|jpeg|png|svg)$/i.test(raw)) return raw;
  const secure = secureMediaUrl(raw);
  if (secure) return secure;
  const https = safeHttpUrl(raw);
  return https;
}

export function safeHttpUrl(value: unknown): string {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    return url.href;
  } catch {
    return '';
  }
}

/** Only harmless absolute links, in-page anchors, phone and mail links. */
export function auraSafeHref(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^#[A-Za-z0-9_.:-]{1,80}$/.test(raw)) return raw;
  if (/^\/(?!\/)[\w./?=&%-]{0,200}$/.test(raw)) return raw;
  if (/^tel:\+?[0-9 ()-]{6,30}$/i.test(raw)) return raw;
  if (/^mailto:[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i.test(raw)) return raw;
  return safeHttpUrl(raw);
}

export function auraSafeWhatsApp(value: unknown, fallback = ''): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return auraSafeHref(fallback);
  const international = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${international}`;
}

function uniqueId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T;
}

function imageAsset(image: AuraImage | { src?: string; [key: string]: any }, alt?: string): AuraMediaAsset {
  const candidate = image as any;
  return {
    url: candidate?.src || candidate?.url || '',
    srcSet: candidate?.srcSet || '',
    width: Number(candidate?.width) || 0,
    height: Number(candidate?.height) || 0,
    alt: alt || candidate?.alt || '',
    path: '',
    mimeType: '',
    name: '',
    size: 0,
  };
}

function textList(values: readonly string[]): Array<{ value: string }> {
  return values.map((value) => ({ value }));
}

function normalizedStringList(value: unknown, fallback: readonly string[] = []): string[] {
  if (!Array.isArray(value)) return [...fallback];
  return value
    .map((item) => (typeof item === 'string' ? cleanAuraText(item, 300) : cleanAuraText(item?.value ?? item?.label ?? '', 300)))
    .filter(Boolean);
}

function safeMedia(value: unknown, fallback: AuraMediaAsset = {}): AuraMediaAsset {
  const raw = isObject(value) ? value : {};
  const url = auraSafeMediaUrl(raw.url || raw.src || fallback.url || '');
  const path = cleanAuraText(raw.path || fallback.path || '', 500);
  return {
    url,
    path,
    srcSet: cleanAuraText(raw.srcSet || fallback.srcSet || '', 1000),
    alt: cleanAuraText(raw.alt ?? fallback.alt ?? '', 300),
    width: Number(raw.width || fallback.width || 0) || 0,
    height: Number(raw.height || fallback.height || 0) || 0,
    mimeType: cleanAuraText(raw.mimeType || fallback.mimeType || '', 120),
    name: cleanAuraText(raw.name || fallback.name || '', 200),
    size: Number(raw.size || fallback.size || 0) || 0,
  };
}

function safeVideo(value: unknown, fallback: AuraVideoAsset = {}): AuraVideoAsset {
  const raw = isObject(value) ? value : {};
  const url = auraSafeMediaUrl(raw.url || fallback.url || '');
  return {
    ...safeMedia({ ...raw, url }, fallback),
    kind: raw.kind === 'upload' || raw.kind === 'link' ? raw.kind : fallback.kind || 'link',
  };
}

function safeBoolean(value: unknown, fallback = true): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

function clampOrder(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(-1000, Math.min(10000, Math.round(number))) : fallback;
}

export function sanitizeAuraContent(value: unknown): any {
  if (Array.isArray(value)) return value.map(sanitizeAuraContent);
  if (isObject(value)) {
    const out: AuraJson = {};
    for (const [key, entry] of Object.entries(value)) {
      if ((FORBIDDEN_AURA_CONTENT_KEYS as readonly string[]).includes(key)) continue;
      if (/^(data|javascript|vbscript):/i.test(key)) continue;
      out[cleanAuraText(key, 120)] = sanitizeAuraContent(entry);
    }
    return out;
  }
  if (typeof value === 'string') return cleanAuraText(value, 4000);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean' || value === null) return value;
  return '';
}

/* ------------------------------------------------------------------------- *
 * Serializable defaults. Bundled assets remain available when no row is saved.
 * ------------------------------------------------------------------------- */

const defaultButtons: AuraButtonItem[] = [
  { id: 'heroPrimary', label: AURA_UNISEX_COPY.heroPrimary, href: '#aura-booking', action: 'book', visible: true },
  { id: 'headerCta', label: AURA_UNISEX_COPY.heroPrimary, href: '#aura-booking', action: 'book', visible: true },
  { id: 'heroSecondary', label: AURA_UNISEX_COPY.heroSecondary, href: '#aura-services', action: 'scroll', visible: true },
  { id: 'bookNow', label: AURA_UNISEX_COPY.bookNow, href: '#aura-booking', action: 'book', visible: true },
  { id: 'packagesButton', label: AURA_UNISEX_COPY.packagesButton, href: '#aura-booking', action: 'book', visible: true },
  { id: 'aboutButton', label: AURA_UNISEX_COPY.aboutButton, href: '#aura-team', action: 'scroll', visible: true },
  { id: 'menButton', label: AURA_UNISEX_COPY.menButton, href: '#aura-services', action: 'scroll', visible: true },
  { id: 'womenButton', label: AURA_UNISEX_COPY.womenButton, href: '#aura-services', action: 'scroll', visible: true },
  { id: 'wellnessButton', label: AURA_UNISEX_COPY.wellnessButton, href: '#aura-services', action: 'scroll', visible: true },
  { id: 'teamButton', label: AURA_UNISEX_COPY.teamButton, href: '#aura-booking', action: 'book', visible: true },
  { id: 'bookingButton', label: AURA_UNISEX_COPY.bookingButton, href: '#aura-booking', action: 'book', visible: true },
  { id: 'directions', label: AURA_UNISEX_COPY.directions, href: '', action: 'link', visible: true },
  { id: 'callNow', label: AURA_UNISEX_COPY.callNow, href: '', action: 'link', visible: true },
  { id: 'whatsappNow', label: AURA_UNISEX_COPY.whatsappNow, href: '', action: 'link', visible: true },
];

const defaultGallery = AURA_UNISEX_IMAGES.gallery.map((image, index) => ({
  id: `aura-gallery-${index + 1}`,
  title: image.alt,
  tag: ["Men’s Haircut", "Women’s Styling", 'Botanical Colour', 'Salon Lounge', 'Beard Grooming'][index % 5],
  image: imageAsset(image),
  visible: true,
}));

const defaultVideos = AURA_DEMO_REELS.map((reel) => ({
  id: reel.id,
  title: reel.title,
  subtitle: reel.subtitle,
  category: reel.category,
  audience: reel.audience,
  duration: reel.duration,
  poster: imageAsset({ src: reel.posterSrc, srcSet: reel.posterSrcSet || '', alt: reel.title }),
  video: { kind: 'link' as const, url: reel.externalUrl, path: '', mimeType: '', name: '', size: 0 },
  channelLabel: reel.channelLabel,
  visible: true,
}));

const defaultReviews = demoTestimonials('unisex_salon').map((review) => ({
  id: review.id,
  name: review.name,
  rating: review.rating || 5,
  comment: review.comment,
  serviceName: review.serviceName || '',
  location: review.location || '',
  date: review.date || 'Demo',
  visible: true,
  isDemo: true,
}));

const defaultOffers = AURA_DEMO_OFFERS.map((offer) => ({
  id: offer.id,
  badge: offer.badge,
  audience: offer.audience,
  title: offer.title,
  description: offer.description,
  code: offer.code,
  validity: offer.validity,
  serviceId: '',
  visible: true,
  isDemo: true,
}));

export const AURA_DEFAULT_SECTION_CONTENT: Record<AuraSectionKey, AuraJson> = {
  header: {
    navHome: AURA_UNISEX_COPY.navHome,
    navCategories: AURA_UNISEX_COPY.navCategories,
    navServices: AURA_UNISEX_COPY.navServices,
    navAbout: AURA_UNISEX_COPY.navAbout,
    navTeam: AURA_UNISEX_COPY.navTeam,
    navGallery: AURA_UNISEX_COPY.navGallery,
    navVideos: AURA_UNISEX_COPY.navVideos,
    navContact: AURA_UNISEX_COPY.navContact,
    ctaLabel: AURA_UNISEX_COPY.heroPrimary,
  },
  branding: {
    name: '',
    sublabel: AURA_UNISEX_COPY.brandSublabel,
    monogram: 'A',
    logo: { url: '', path: '', alt: '', srcSet: '', width: 0, height: 0 },
    useProfileName: true,
  },
  hero: {
    eyebrow: AURA_UNISEX_COPY.heroEyebrow,
    title: AURA_UNISEX_COPY.heroTitle,
    description: AURA_UNISEX_COPY.heroText,
    points: textList(AURA_UNISEX_COPY.heroPoints),
    ratingScore: '4.95',
    ratingLabel: 'Rated by Men & Women',
    himHerLabel: 'Him & Her',
    himHerText: 'Dedicated Styling Zones',
    cleanlinessLabel: '100% Clean',
    cleanlinessText: 'Ammonia-Free & Organic',
    cardMen: AURA_UNISEX_COPY.heroCardMen,
    cardWomen: AURA_UNISEX_COPY.heroCardWomen,
    careBoxTitle: AURA_UNISEX_COPY.heroCareBoxTitle,
    careBoxText: AURA_UNISEX_COPY.heroCareBoxText,
    badgeText: 'Male & Female Salon Specialists',
  },
  hero_media: {
    main: imageAsset(AURA_UNISEX_IMAGES.heroMain),
    men: imageAsset(AURA_UNISEX_IMAGES.heroMen),
    women: imageAsset(AURA_UNISEX_IMAGES.heroWomen),
    mainAlt: AURA_UNISEX_IMAGES.heroMain.alt,
    menAlt: AURA_UNISEX_IMAGES.heroMen.alt,
    womenAlt: AURA_UNISEX_IMAGES.heroWomen.alt,
  },
  buttons: { items: defaultButtons },
  categories: {
    eyebrow: AURA_UNISEX_COPY.categoriesEyebrow,
    title: AURA_UNISEX_COPY.categoriesTitle,
    description: AURA_UNISEX_COPY.categoriesText,
    items: AURA_CATEGORY_PILLARS.map((pillar) => ({
      id: pillar.id,
      tab: pillar.tab,
      audience: pillar.audience,
      title: pillar.title,
      subtitle: pillar.subtitle,
      image: imageAsset(pillar.image),
      visible: true,
    })),
  },
  about: {
    eyebrow: AURA_UNISEX_COPY.aboutEyebrow,
    title: AURA_UNISEX_COPY.aboutTitle,
    description: AURA_UNISEX_COPY.aboutDefault,
    highlights: AURA_UNISEX_COPY.aboutHighlights.map((item) => ({ title: item.title, text: item.text, visible: true })),
    ownerName: '',
    ownerRole: '',
    plaqueYear: 'EST. 2020',
    plaqueTitle: 'Inclusive Unisex Lounge',
    plaqueText: 'Separate styling, grooming and quiet skin-wellness zones under one calm roof.',
    images: {
      primary: imageAsset(AURA_UNISEX_IMAGES.aboutInterior),
      secondary: imageAsset(AURA_UNISEX_IMAGES.aboutWork),
    },
  },
  why_choose_us: {
    eyebrow: AURA_UNISEX_COPY.whyEyebrow,
    title: AURA_UNISEX_COPY.whyTitle,
    description: AURA_UNISEX_COPY.whyText,
    items: AURA_WHY_CHOOSE_US.map((item) => ({ ...item, visible: true })),
    men: { title: AURA_UNISEX_COPY.menTitle, description: AURA_UNISEX_COPY.menText, pill: 'FOR HIM' },
    women: { title: AURA_UNISEX_COPY.womenTitle, description: AURA_UNISEX_COPY.womenText, pill: 'FOR HER' },
    wellness: {
      eyebrow: AURA_UNISEX_COPY.wellnessEyebrow,
      title: AURA_UNISEX_COPY.wellnessTitle,
      description: AURA_UNISEX_COPY.wellnessText,
      emptyText: AURA_UNISEX_COPY.wellnessEmpty,
    },
    images: {
      men: imageAsset(AURA_UNISEX_IMAGES.featureMen),
      women: imageAsset(AURA_UNISEX_IMAGES.featureWomen),
      wellness: imageAsset(AURA_UNISEX_IMAGES.wellness),
    },
  },
  services: {
    eyebrow: AURA_UNISEX_COPY.servicesEyebrow,
    title: AURA_UNISEX_COPY.servicesTitle,
    description: AURA_UNISEX_COPY.servicesText,
    packagesEyebrow: AURA_UNISEX_COPY.packagesEyebrow,
    packagesTitle: AURA_UNISEX_COPY.packagesTitle,
    packagesText: AURA_UNISEX_COPY.packagesText,
    overrides: [],
  },
  staff: {
    eyebrow: AURA_UNISEX_COPY.teamEyebrow,
    title: AURA_UNISEX_COPY.teamTitle,
    description: AURA_UNISEX_COPY.teamText,
    profiles: [],
  },
  gallery: {
    eyebrow: AURA_UNISEX_COPY.galleryEyebrow,
    title: AURA_UNISEX_COPY.galleryTitle,
    description: AURA_UNISEX_COPY.galleryText,
    items: defaultGallery,
  },
  videos: {
    eyebrow: AURA_UNISEX_COPY.videosEyebrow,
    title: AURA_UNISEX_COPY.videosTitle,
    description: AURA_UNISEX_COPY.videosText,
    items: defaultVideos,
  },
  reviews: {
    eyebrow: AURA_UNISEX_COPY.reviewsEyebrow,
    title: AURA_UNISEX_COPY.reviewsTitle,
    description: AURA_UNISEX_COPY.reviewsText,
    ratingScore: '4.95',
    ratingLabel: 'Unisex Hair, Grooming & Skin',
    items: defaultReviews,
  },
  promotions: {
    eyebrow: AURA_UNISEX_COPY.promoEyebrow,
    title: AURA_UNISEX_COPY.promoTitle,
    description: AURA_UNISEX_COPY.promoText,
    items: defaultOffers,
  },
  loyalty: {
    eyebrow: AURA_UNISEX_COPY.loyaltyEyebrow,
    title: AURA_UNISEX_COPY.loyaltyTitle,
    description: AURA_UNISEX_COPY.loyaltyText,
    tiers: AURA_LOYALTY_TIERS.map((tier) => ({ ...tier, visible: true })),
    rewards: AURA_DEMO_REWARDS.map((reward) => ({ ...reward, visible: true })),
  },
  booking: {
    eyebrow: AURA_UNISEX_COPY.bookingEyebrow,
    title: AURA_UNISEX_COPY.bookingTitle,
    description: AURA_UNISEX_COPY.bookingText,
    buttonLabel: AURA_UNISEX_COPY.bookingButton,
    whatsappPrompt: 'Prefer booking by chat?',
    whatsappLabel: AURA_UNISEX_COPY.whatsappNow,
    plannerTitle: 'Choose Your Service & Preferred Time',
    plannerKicker: 'Instant Slot Request',
    image: imageAsset(AURA_UNISEX_IMAGES.booking),
    imageCaption: 'Unisex Hair, Beard, Colour & Wellness',
  },
  contact: {
    eyebrow: AURA_UNISEX_COPY.contactEyebrow,
    title: AURA_UNISEX_COPY.contactTitle,
    description: AURA_UNISEX_COPY.contactText,
    address: '',
    landmark: '',
    phone: '',
    whatsapp: '',
    email: '',
    mapUrl: '',
    directionsLabel: AURA_UNISEX_COPY.directions,
    callLabel: AURA_UNISEX_COPY.callNow,
    whatsappLabel: AURA_UNISEX_COPY.whatsappNow,
    locationTitle: 'Salon Location',
    receptionTitle: 'Direct Reception Desk',
    hoursTitle: 'Opening Hours',
    walkInNote: 'Walk-ins welcome · Advance booking recommended on weekends.',
    viewMapLabel: 'View on Google Maps',
  },
  social: {
    title: AURA_UNISEX_COPY.footerFollow,
    description: '',
    items: [],
  },
  footer: {
    aboutText: '',
    quickLinksTitle: AURA_UNISEX_COPY.footerQuickLinks,
    servicesTitle: AURA_UNISEX_COPY.footerServices,
    contactTitle: AURA_UNISEX_COPY.footerContact,
    rights: AURA_UNISEX_COPY.footerRights,
    legal: textList(AURA_UNISEX_COPY.footerLegal),
    installLabel: 'Install Customer App →',
  },
};

export const AURA_DEFAULT_SECTION_SETTINGS: Record<AuraSectionKey, AuraJson> = {
  header: { showLogin: true, showBookings: true, showCta: true },
  branding: { showBrand: true, showFooterCrest: true },
  hero: { showMetrics: true, showPoints: true },
  hero_media: { showSideStack: true },
  buttons: { showSecondaryButtons: true },
  categories: { showPrices: true },
  about: { showHighlights: true, showOwnerNote: true, showPlaque: true },
  why_choose_us: { showDualPanels: true, showWellness: true },
  services: { showTabs: true, showPackages: true },
  staff: { showRatings: true, showProfileLinks: true },
  gallery: { showLightbox: true },
  videos: { showFilters: true },
  reviews: { showRatingBadge: true, showCustomerReviewPanel: true },
  promotions: { showCampaign: true },
  loyalty: { showTiers: true },
  booking: { showPlanner: true, showWhatsApp: true },
  contact: { showHours: true, showEmail: true },
  social: { showIcons: true },
  footer: { showAppInstall: true, showLegal: true, showBrand: true },
};

export function defaultAuraSectionDrafts(): AuraSectionDraft[] {
  return AURA_SECTION_KEYS.map((sectionKey) => ({
    templateId: AURA_TEMPLATE_ID,
    sectionKey,
    sectionContent: clone(AURA_DEFAULT_SECTION_CONTENT[sectionKey]),
    sectionSettings: clone(AURA_DEFAULT_SECTION_SETTINGS[sectionKey]),
    isVisible: true,
    displayOrder: AURA_SECTION_ORDER[sectionKey],
  }));
}

/* ------------------------------------------------------------------------- *
 * Dashboard field schemas and validation
 * ------------------------------------------------------------------------- */

export type AuraFieldKind = 'text' | 'textarea' | 'url' | 'number' | 'toggle' | 'select' | 'image' | 'video' | 'list';
export interface AuraFieldSchema {
  path: string;
  label: string;
  kind: AuraFieldKind;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: string[];
  help?: string;
  itemFields?: AuraFieldSchema[];
  itemLabel?: string;
  addLabel?: string;
  maxItems?: number;
  placeholder?: string;
}
export interface AuraSectionSchema {
  label: string;
  summary: string;
  fields: AuraFieldSchema[];
}

const text = (path: string, label: string, extra: Partial<AuraFieldSchema> = {}): AuraFieldSchema => ({ path, label, kind: 'text', maxLength: 160, ...extra });
const area = (path: string, label: string, extra: Partial<AuraFieldSchema> = {}): AuraFieldSchema => ({ path, label, kind: 'textarea', maxLength: 1000, ...extra });
const image = (path: string, label: string, extra: Partial<AuraFieldSchema> = {}): AuraFieldSchema => ({ path, label, kind: 'image', ...extra });
const toggle = (path: string, label: string, extra: Partial<AuraFieldSchema> = {}): AuraFieldSchema => ({ path, label, kind: 'toggle', ...extra });

const mediaList = (path: string, label: string, itemFields: AuraFieldSchema[], addLabel: string, maxItems = 24): AuraFieldSchema => ({
  path, label, kind: 'list', itemFields, itemLabel: label, addLabel, maxItems,
});

export const AURA_SECTION_SCHEMAS: Record<AuraSectionKey, AuraSectionSchema> = {
  header: {
    label: AURA_SECTION_LABELS.header,
    summary: 'Navigation labels and customer account buttons.',
    fields: [
      text('navHome', 'Home link'), text('navCategories', 'Categories link'), text('navServices', 'Services link'),
      text('navAbout', 'About link'), text('navTeam', 'Team link'), text('navGallery', 'Gallery link'),
      text('navVideos', 'Videos link'), text('navContact', 'Contact link'), text('ctaLabel', 'Header button label'),
    ],
  },
  branding: {
    label: AURA_SECTION_LABELS.branding,
    summary: 'Display-only salon name, sub-label, logo and monogram. Booking records are unchanged.',
    fields: [
      text('name', 'Salon name override', { help: 'Leave blank to use the saved business name.' }),
      text('sublabel', 'Sub-label'), text('monogram', 'Monogram', { maxLength: 3 }),
      image('logo', 'Logo image'), toggle('useProfileName', 'Use saved business name when override is blank'),
    ],
  },
  hero: {
    label: AURA_SECTION_LABELS.hero,
    summary: 'Hero eyebrow, heading, description and promises.',
    fields: [
      text('eyebrow', 'Eyebrow'), text('title', 'Heading', { required: true, maxLength: 220 }),
      area('description', 'Description', { required: true }),
      mediaList('points', 'Highlights', [text('value', 'Highlight', { required: true, maxLength: 120 })], 'Add highlight', 8),
      text('cardMen', "Men's card label"), text('cardWomen', "Women's card label"),
      text('careBoxTitle', 'Care box title'), text('careBoxText', 'Care box text'),
      text('ratingScore', 'Rating score'), text('ratingLabel', 'Rating caption'), text('badgeText', 'Image badge'),
    ],
  },
  hero_media: {
    label: AURA_SECTION_LABELS.hero_media,
    summary: 'Upload or replace the three hero photographs.',
    fields: [
      image('main', 'Main hero image'), text('mainAlt', 'Main image alt text'),
      image('men', "Men's card image"), text('menAlt', "Men's image alt text"),
      image('women', "Women's card image"), text('womenAlt', "Women's image alt text"),
    ],
  },
  buttons: {
    label: AURA_SECTION_LABELS.buttons,
    summary: 'Edit button labels, destinations and actions. Leave action as Book to keep checkout wiring.',
    fields: [mediaList('items', 'Buttons', [
      text('id', 'Button ID', { required: true, help: 'Stable ID used by the website.' }),
      text('label', 'Label', { required: true }),
      { path: 'href', label: 'Link', kind: 'url', help: 'Use #section, a relative path or an https link.' },
      { path: 'action', label: 'Action', kind: 'select', options: ['book', 'scroll', 'link'] },
      toggle('visible', 'Show button'),
    ], 'Add button', 30)],
  },
  categories: {
    label: AURA_SECTION_LABELS.categories,
    summary: 'Add, remove, reorder and replace salon category cards.',
    fields: [
      text('eyebrow', 'Eyebrow'), text('title', 'Heading', { required: true }), area('description', 'Description'),
      mediaList('items', 'Category cards', [
        text('id', 'ID', { required: true }),
        { path: 'tab', label: 'Service tab', kind: 'select', options: [...AURA_SERVICE_TABS] },
        text('audience', 'Audience'), text('title', 'Card title', { required: true }),
        area('subtitle', 'Card description'), image('image', 'Card image'), toggle('visible', 'Show card'),
      ], 'Add category', 12),
    ],
  },
  about: {
    label: AURA_SECTION_LABELS.about,
    summary: 'About copy, highlights, owner note, plaque and two images.',
    fields: [
      text('eyebrow', 'Eyebrow'), text('title', 'Heading', { required: true }), area('description', 'Description', { required: true, maxLength: 2000 }),
      mediaList('highlights', 'Highlights', [text('title', 'Title', { required: true }), area('text', 'Text'), toggle('visible', 'Show')], 'Add highlight', 8),
      image('images.primary', 'Interior image'), image('images.secondary', 'Stylist-at-work image'),
      text('plaqueYear', 'Plaque year'), text('plaqueTitle', 'Plaque title'), area('plaqueText', 'Plaque text'),
      text('ownerName', 'Owner name override'), text('ownerRole', 'Owner role override'),
    ],
  },
  why_choose_us: {
    label: AURA_SECTION_LABELS.why_choose_us,
    summary: 'Commitments, men/women panels, wellness lounge and their images.',
    fields: [
      text('eyebrow', 'Eyebrow'), text('title', 'Heading', { required: true }), area('description', 'Description'),
      mediaList('items', 'Commitment cards', [
        text('number', 'Number', { maxLength: 4 }), text('title', 'Title', { required: true }),
        area('description', 'Description'), text('tag', 'Tag'), toggle('visible', 'Show'),
      ], 'Add commitment', 10),
      text('men.title', "Men's panel title"), area('men.description', "Men's panel description"),
      text('women.title', "Women's panel title"), area('women.description', "Women's panel description"),
      text('wellness.title', 'Wellness title'), area('wellness.description', 'Wellness description'),
      text('wellness.emptyText', 'Empty wellness text'),
      image('images.men', "Men's image"), image('images.women', "Women's image"), image('images.wellness', 'Wellness image'),
    ],
  },
  services: {
    label: AURA_SECTION_LABELS.services,
    summary: 'Menu headings and display-only card overrides. Prices, durations, IDs and bookings stay in the service catalogue.',
    fields: [
      text('eyebrow', 'Eyebrow'), text('title', 'Heading', { required: true }), area('description', 'Description'),
      text('packagesTitle', 'Packages heading'), area('packagesText', 'Packages description'),
      mediaList('overrides', 'Service display overrides', [
        text('serviceId', 'Service ID', { required: true, help: 'Copy from Services & packages. Does not change the bookable service.' }),
        text('displayName', 'Display name'), area('displayDescription', 'Display description'),
        image('image', 'Display image'), toggle('visible', 'Show card'),
      ], 'Add service override', 100),
    ],
  },
  staff: {
    label: AURA_SECTION_LABELS.staff,
    summary: 'Display-only expert profiles. Use Team & specialists to change bookable staff records.',
    fields: [
      text('eyebrow', 'Eyebrow'), text('title', 'Heading', { required: true }), area('description', 'Description'),
      mediaList('profiles', 'Expert profiles', [
        text('staffId', 'Staff ID', { required: true, help: 'Use an existing staff ID for booking, or a display-only ID.' }),
        text('displayName', 'Display name', { required: true }), text('displayRole', 'Display role'),
        text('specialties', 'Specialties', { help: 'Separate with commas.' }), area('bio', 'Short bio'),
        image('image', 'Portrait'), toggle('visible', 'Show profile'),
      ], 'Add expert profile', 24),
    ],
  },
  gallery: {
    label: AURA_SECTION_LABELS.gallery,
    summary: 'Add, replace, remove and reorder individual gallery photographs.',
    fields: [
      text('eyebrow', 'Eyebrow'), text('title', 'Heading', { required: true }), area('description', 'Description'),
      mediaList('items', 'Gallery photos', [
        text('id', 'ID', { required: true }), text('title', 'Caption', { required: true }),
        text('tag', 'Tag'), image('image', 'Photo'), toggle('visible', 'Show photo'),
      ], 'Add gallery image', 24),
    ],
  },
  videos: {
    label: AURA_SECTION_LABELS.videos,
    summary: 'Upload videos or add allow-listed YouTube, Instagram, Facebook, Vimeo or direct MP4/WebM links.',
    fields: [
      text('eyebrow', 'Eyebrow'), text('title', 'Heading', { required: true }), area('description', 'Description'),
      mediaList('items', 'Video cards', [
        text('id', 'ID', { required: true }), text('title', 'Title', { required: true }),
        area('subtitle', 'Subtitle'),
        { path: 'category', label: 'Category', kind: 'select', options: [...AURA_VIDEO_FILTERS] },
        text('audience', 'Audience'), text('duration', 'Duration'), text('channelLabel', 'Channel label'),
        image('poster', 'Poster image'), { path: 'video', label: 'Video file or link', kind: 'video' },
        toggle('visible', 'Show video'),
      ], 'Add video', 24),
    ],
  },
  reviews: {
    label: AURA_SECTION_LABELS.reviews,
    summary: 'Owner-curated display reviews. Verified customer reviews remain protected.',
    fields: [
      text('eyebrow', 'Eyebrow'), text('title', 'Heading', { required: true }), area('description', 'Description'),
      text('ratingScore', 'Display rating'), text('ratingLabel', 'Rating caption'),
      mediaList('items', 'Review cards', [
        text('id', 'ID', { required: true }), text('name', 'Name', { required: true }),
        { path: 'rating', label: 'Stars', kind: 'number', min: 1, max: 5 },
        area('comment', 'Comment', { required: true }), text('serviceName', 'Service'),
        toggle('visible', 'Show review'),
      ], 'Add review', 12),
    ],
  },
  promotions: {
    label: AURA_SECTION_LABELS.promotions,
    summary: 'Display-only offer cards. Real coupons, prices and redemption records are managed separately.',
    fields: [
      text('eyebrow', 'Eyebrow'), text('title', 'Heading', { required: true }), area('description', 'Description'),
      mediaList('items', 'Offer cards', [
        text('id', 'ID', { required: true }), text('badge', 'Badge'), text('audience', 'Audience'),
        text('title', 'Title', { required: true }), area('description', 'Description'),
        text('code', 'Display code', { help: 'Shown as text only; not a live coupon.' }), text('validity', 'Validity'),
        text('serviceId', 'Related service ID'), toggle('visible', 'Show offer'),
      ], 'Add offer', 12),
    ],
  },
  loyalty: {
    label: AURA_SECTION_LABELS.loyalty,
    summary: 'Display-only tiers and reward descriptions. Points ledgers are never edited here.',
    fields: [
      text('eyebrow', 'Eyebrow'), text('title', 'Heading', { required: true }), area('description', 'Description'),
      mediaList('tiers', 'Membership tiers', [
        text('name', 'Name', { required: true }), text('threshold', 'Threshold'), text('perk', 'Perk'), toggle('visible', 'Show'),
      ], 'Add tier', 8),
      mediaList('rewards', 'Reward cards', [
        text('id', 'ID', { required: true }), text('title', 'Title', { required: true }),
        area('description', 'Description'), { path: 'requiredPoints', label: 'Display points', kind: 'number', min: 0, max: 100000 },
        text('category', 'Category'), toggle('visible', 'Show'),
      ], 'Add reward', 12),
    ],
  },
  booking: {
    label: AURA_SECTION_LABELS.booking,
    summary: 'Booking section copy, photo and planner labels. Appointment records are unchanged.',
    fields: [
      text('eyebrow', 'Eyebrow'), text('title', 'Heading', { required: true }), area('description', 'Description'),
      text('buttonLabel', 'Button label'), text('whatsappPrompt', 'WhatsApp prompt'), text('whatsappLabel', 'WhatsApp button'),
      text('plannerTitle', 'Planner heading'), text('plannerKicker', 'Planner kicker'),
      image('image', 'Booking image'), text('imageCaption', 'Image caption'),
    ],
  },
  contact: {
    label: AURA_SECTION_LABELS.contact,
    summary: 'Public contact display details and card labels. Account details are not overwritten.',
    fields: [
      text('eyebrow', 'Eyebrow'), text('title', 'Heading', { required: true }), area('description', 'Description'),
      text('address', 'Address override'), text('landmark', 'Landmark'), text('phone', 'Phone override'),
      text('whatsapp', 'WhatsApp override'), text('email', 'Public email override'),
      { path: 'mapUrl', label: 'Map link', kind: 'url' }, text('locationTitle', 'Location card title'),
      text('receptionTitle', 'Reception card title'), text('hoursTitle', 'Hours card title'),
      area('walkInNote', 'Walk-in note'), text('directionsLabel', 'Directions label'),
      text('callLabel', 'Call label'), text('whatsappLabel', 'WhatsApp label'), text('viewMapLabel', 'Map text link'),
    ],
  },
  social: {
    label: AURA_SECTION_LABELS.social,
    summary: 'Add, replace, hide or reorder public social links.',
    fields: [
      text('title', 'Heading'), area('description', 'Description'),
      mediaList('items', 'Social links', [
        text('id', 'ID', { required: true }),
        { path: 'platform', label: 'Platform', kind: 'select', options: ['instagram', 'facebook', 'youtube', 'website'] },
        text('label', 'Label'), { path: 'url', label: 'URL or handle', kind: 'text', required: true, help: 'Use a full https link or an @handle for Instagram, Facebook or YouTube.' },
        toggle('visible', 'Show link'),
      ], 'Add social link', 12),
    ],
  },
  footer: {
    label: AURA_SECTION_LABELS.footer,
    summary: 'Footer headings, about text, legal labels and app-install link.',
    fields: [
      area('aboutText', 'Footer about text', { help: 'Leave blank to use the About description.' }),
      text('quickLinksTitle', 'Quick links heading'), text('servicesTitle', 'Services heading'),
      text('contactTitle', 'Contact heading'), text('rights', 'Rights text'),
      mediaList('legal', 'Legal links', [text('value', 'Label', { required: true })], 'Add legal link', 8),
      text('installLabel', 'App install link label'),
    ],
  },
};

export function getAuraValue(target: any, path: string): any {
  return path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), target);
}

export function setAuraValue<T>(target: T, path: string, value: any): T {
  const keys = path.split('.');
  const root: any = Array.isArray(target) ? [...target] : { ...(target as any) };
  let cursor = root;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) cursor[key] = value;
    else {
      const next = cursor[key];
      cursor[key] = Array.isArray(next) ? [...next] : isObject(next) ? { ...next } : {};
      cursor = cursor[key];
    }
  });
  return root as T;
}

function validateAuraField(field: AuraFieldSchema, value: any, errors: string[], prefix = ''): void {
  const label = `${prefix}${field.label}`;
  const stringValue = typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
  if (field.required && !stringValue.trim()) {
    errors.push(`${label} is required.`);
    return;
  }
  if (stringValue && field.maxLength && stringValue.length > field.maxLength) {
    errors.push(`${label} must be ${field.maxLength} characters or fewer.`);
  }
  if (field.kind === 'url' && stringValue.trim() && !auraSafeHref(stringValue)) {
    errors.push(`${label} must be a safe #section, relative, tel:, mailto: or https link.`);
  }
  if (field.kind === 'image' || field.kind === 'video') {
    const raw = isObject(value) ? value : {};
    const url = auraSafeMediaUrl(raw.url || '');
    if (raw.url && !url) errors.push(`${label} has an unsupported media URL.`);
    if (raw.path && !/^[0-9a-f-]{36}\/template-03\/(images|videos)\/[\w.-]+$/i.test(String(raw.path))) {
      errors.push(`${label} has an invalid Template 03 storage path.`);
    }
  }
  if (field.kind === 'number' && stringValue.trim()) {
    const number = Number(stringValue);
    if (!Number.isFinite(number)) errors.push(`${label} must be a number.`);
    if (Number.isFinite(number) && field.min !== undefined && number < field.min) errors.push(`${label} must be at least ${field.min}.`);
    if (Number.isFinite(number) && field.max !== undefined && number > field.max) errors.push(`${label} must be at most ${field.max}.`);
  }
  if (field.kind === 'select' && stringValue.trim() && field.options && !field.options.includes(stringValue)) {
    errors.push(`${label} must use one of the available choices.`);
  }
  if (field.kind === 'list') {
    const items = Array.isArray(value) ? value : [];
    if (field.maxItems && items.length > field.maxItems) errors.push(`${label} can contain at most ${field.maxItems} items.`);
    items.forEach((item, index) => {
      (field.itemFields || []).forEach((itemField) =>
        validateAuraField(itemField, getAuraValue(item, itemField.path), errors, `${label} ${index + 1} · `),
      );
    });
  }
  if (/<script|javascript:|data:text\/html/i.test(stringValue)) {
    errors.push(`${label} contains unsupported markup.`);
  }
}

export function validateAuraSectionDraft(draft: AuraSectionDraft): string[] {
  const errors: string[] = [];
  if (!AURA_SECTION_KEYS.includes(draft.sectionKey)) errors.push('Unknown Template 03 section.');
  if (draft.templateId !== AURA_TEMPLATE_ID) errors.push('Only Template 03 content can be saved here.');
  if (!isObject(draft.sectionContent)) errors.push('Section content must be an object.');
  if (!isObject(draft.sectionSettings)) errors.push('Section settings must be an object.');
  const order = Number(draft.displayOrder);
  if (!Number.isInteger(order) || order < -1000 || order > 10000) errors.push('Display order must be a whole number from -1000 to 10000.');
  const serialized = JSON.stringify(draft.sectionContent || {});
  if (serialized.length > 2_000_000) errors.push('Section content is too large. Use smaller media or fewer items.');
  const forbidden = (FORBIDDEN_AURA_CONTENT_KEYS as readonly string[]).find((key) =>
    new RegExp(`"${key}"`, 'i').test(serialized),
  );
  if (forbidden) errors.push(`Protected field "${forbidden}" cannot be edited as website content.`);
  const schema = AURA_SECTION_SCHEMAS[draft.sectionKey];
  if (schema) schema.fields.forEach((field) => validateAuraField(field, getAuraValue(draft.sectionContent, field.path), errors));
  return errors;
}

export function validateAuraDrafts(drafts: AuraSectionDraft[]): string[] {
  const ids = new Set<string>();
  const errors: string[] = [];
  drafts.forEach((draft) => {
    if (ids.has(draft.sectionKey)) errors.push(`Duplicate section: ${draft.sectionKey}.`);
    ids.add(draft.sectionKey);
    errors.push(...validateAuraSectionDraft(draft).map((message) => `${AURA_SECTION_LABELS[draft.sectionKey]}: ${message}`));
  });
  return errors;
}

/* ------------------------------------------------------------------------- *
 * Supabase reads/writes and Storage. No service-role key is used anywhere.
 * ------------------------------------------------------------------------- */

function errorForAura(error: any, fallback: string): Error {
  const message = String(error?.message || '');
  const code = String(error?.code || '');
  if (code === '42P01' || /relation .*does not exist|Could not find the table/i.test(message)) {
    return new Error('Template 03 content migration is not applied yet. Apply supabase/migrations/202611030001_aura_template03_content.sql.');
  }
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return new Error('Only an authorised admin of this salon can change Template 03 content.');
  }
  if (code === '23514' || /check constraint/i.test(message)) {
    return new Error('This content was rejected by the Template 03 safety rules.');
  }
  return new Error(message || fallback);
}

export function normalizeAuraSectionRows(raw: AuraSectionInput): Record<AuraSectionKey, AuraSectionState> {
  const result = {} as Record<AuraSectionKey, AuraSectionState>;
  for (const key of AURA_SECTION_KEYS) {
    result[key] = {
      templateId: AURA_TEMPLATE_ID,
      sectionKey: key,
      sectionContent: clone(AURA_DEFAULT_SECTION_CONTENT[key]),
      sectionSettings: clone(AURA_DEFAULT_SECTION_SETTINGS[key]),
      isVisible: true,
      displayOrder: AURA_SECTION_ORDER[key],
      source: 'default',
    };
  }
  let entries: Array<[string, any]> = [];
  if (Array.isArray(raw)) {
    entries = raw.map((row) => [String(row?.section_key || row?.sectionKey || ''), row]);
  } else if (isObject(raw)) {
    const nested = raw.sections || raw.rows || raw.data;
    if (Array.isArray(nested)) entries = nested.map((row) => [String(row?.section_key || row?.sectionKey || ''), row]);
    else entries = Object.entries(raw);
  }
  for (const [rawKey, rawRow] of entries) {
    if (!AURA_SECTION_KEYS.includes(rawKey as AuraSectionKey)) continue;
    const key = rawKey as AuraSectionKey;
    const row: any = isObject(rawRow) ? rawRow : {};
    const payload = isObject(row.payload) ? row.payload : row;
    const content = sanitizeAuraContent(
      isObject(row.section_content) ? row.section_content
        : isObject(row.sectionContent) ? row.sectionContent
          : isObject(row.content) ? row.content
            : isObject(payload.content) ? payload.content : {},
    );
    const settings = sanitizeAuraContent(
      isObject(row.section_settings) ? row.section_settings
        : isObject(row.sectionSettings) ? row.sectionSettings
          : isObject(row.settings) ? row.settings
            : isObject(payload.settings) ? payload.settings : {},
    );
    result[key] = {
      templateId: AURA_TEMPLATE_ID,
      salonId: typeof row.salon_id === 'string' ? row.salon_id : typeof row.salonId === 'string' ? row.salonId : undefined,
      sectionKey: key,
      sectionContent: { ...clone(AURA_DEFAULT_SECTION_CONTENT[key]), ...content },
      sectionSettings: { ...clone(AURA_DEFAULT_SECTION_SETTINGS[key]), ...settings },
      isVisible: row.is_visible === undefined
        ? safeBoolean(row.isVisible ?? payload.isVisible ?? payload.is_visible, true)
        : row.is_visible !== false,
      displayOrder: clampOrder(row.display_order ?? row.displayOrder ?? payload.displayOrder ?? payload.display_order, AURA_SECTION_ORDER[key]),
      updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
      updatedBy: typeof row.updated_by === 'string' ? row.updated_by : undefined,
      source: 'saved',
    };
  }
  return result;
}

export function auraDraftsFromRows(raw: AuraSectionInput): AuraSectionDraft[] {
  const normalized = normalizeAuraSectionRows(raw);
  return AURA_SECTION_KEYS.map((key) => {
    const row = normalized[key];
    return {
      sectionKey: key,
      templateId: AURA_TEMPLATE_ID,
      sectionContent: clone(row.sectionContent),
      sectionSettings: clone(row.sectionSettings),
      isVisible: row.isVisible,
      displayOrder: row.displayOrder,
    };
  });
}

export async function getAuraEditableSalonId(client: any = supabase): Promise<string> {
  const { data, error } = await client.rpc('get_aura_editable_salon_id');
  if (!error && data) return String(data);
  // Older deployments may not have this convenience RPC yet. The owner account
  // ID remains the correct tenant key and RLS still enforces ownership.
  const user = await client.auth.getUser();
  if (user.error || !user.data?.user?.id) {
    throw new Error('Sign in with an authorised salon admin account to edit Template 03.');
  }
  return user.data.user.id;
}

async function currentSalonId(client: any = supabase): Promise<string> {
  return getAuraEditableSalonId(client);
}

export async function fetchOwnerAuraSections(client: any = supabase): Promise<AuraSectionDraft[]> {
  const salonId = await currentSalonId(client);
  const { data, error } = await client
    .from(AURA_SECTIONS_TABLE)
    .select('id,template_id,salon_id,section_key,section_content,section_settings,is_visible,display_order,updated_at,updated_by')
    .eq('template_id', AURA_TEMPLATE_ID)
    .eq('salon_id', salonId);
  if (error) throw errorForAura(error, 'Could not load Template 03 content.');
  return auraDraftsFromRows(data || []);
}

export async function upsertAuraSections(drafts: AuraSectionDraft[], client: any = supabase): Promise<AuraSectionDraft[]> {
  const validation = validateAuraDrafts(drafts);
  if (validation.length) throw new Error(validation[0]);
  const salonId = await currentSalonId(client);
  const payload = drafts.map((draft) => ({
    template_id: AURA_TEMPLATE_ID,
    salon_id: salonId,
    section_key: draft.sectionKey,
    section_content: sanitizeAuraContent(draft.sectionContent),
    section_settings: sanitizeAuraContent(draft.sectionSettings),
    is_visible: draft.isVisible !== false,
    display_order: clampOrder(draft.displayOrder, AURA_SECTION_ORDER[draft.sectionKey]),
  }));
  const { data, error } = await client
    .from(AURA_SECTIONS_TABLE)
    .upsert(payload, { onConflict: 'template_id,salon_id,section_key' })
    .select('id,template_id,salon_id,section_key,section_content,section_settings,is_visible,display_order,updated_at,updated_by');
  if (error) throw errorForAura(error, 'Could not save Template 03 content.');
  return auraDraftsFromRows(data?.length ? data : payload.map((row) => ({ ...row, section_content: row.section_content, section_settings: row.section_settings })));
}

/** Public storefront RPC. Only visible Template 03 rows of the published slug are returned. */
export async function loadPublicAuraSections(slug: string, businessType?: string, client: any = supabase): Promise<Record<string, any>> {
  if (businessType && businessType !== AURA_TEMPLATE_ID) return {};
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(String(slug || ''))) return {};
  const { data, error } = await client.rpc(AURA_PUBLIC_SECTIONS_RPC, { p_slug: slug });
  if (error) throw errorForAura(error, 'Could not load Template 03 website sections.');
  return isObject(data) ? data : {};
}

export const AURA_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AURA_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;
export const AURA_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const AURA_MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export async function uploadAuraMedia(
  file: File,
  kind: 'image' | 'video',
  salonId: string,
  client: any = supabase,
): Promise<AuraMediaAsset> {
  if (!file) throw new Error('Choose a file to upload.');
  const mimeType = String(file.type || '').toLowerCase();
  const allowed: readonly string[] = kind === 'image' ? AURA_IMAGE_MIME_TYPES : AURA_VIDEO_MIME_TYPES;
  const maxBytes = kind === 'image' ? AURA_MAX_IMAGE_BYTES : AURA_MAX_VIDEO_BYTES;
  if (!allowed.includes(mimeType)) throw new Error(kind === 'image' ? 'Use JPG, PNG or WebP images.' : 'Use MP4, WebM or MOV videos.');
  if (Number(file.size) > maxBytes) throw new Error(kind === 'image' ? 'Images must be 5 MB or smaller.' : 'Videos must be 50 MB or smaller.');
  if (!/^[0-9a-f-]{36}$/i.test(salonId)) throw new Error('Could not verify the salon media folder.');
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : mimeType === 'video/webm' ? 'webm' : mimeType === 'video/quicktime' ? 'mov' : mimeType === 'video/mp4' ? 'mp4' : 'jpg';
  const path = `${salonId}/template-03/${kind === 'image' ? 'images' : 'videos'}/${uniqueId('asset')}.${extension}`;
  const { data, error } = await client.storage.from(AURA_MEDIA_BUCKET).upload(path, file, { contentType: mimeType, upsert: false });
  if (error) throw errorForAura(error, 'Upload failed. Check the studioflow-media Storage policies.');
  const publicUrl = client.storage.from(AURA_MEDIA_BUCKET).getPublicUrl(path).data?.publicUrl || '';
  if (!publicUrl) throw new Error('The uploaded file did not return a public URL.');
  return {
    url: publicUrl,
    path: String(data?.path || path),
    mimeType,
    name: cleanAuraText(file.name, 200),
    size: Number(file.size) || 0,
    alt: cleanAuraText(file.name, 200),
    srcSet: '',
    width: 0,
    height: 0,
  };
}

export function countAuraMediaUsage(drafts: AuraSectionDraft[], path: string): number {
  if (!path) return 0;
  const serialized = JSON.stringify(drafts.map((draft) => draft.sectionContent));
  return serialized.split(path).length - 1;
}

export async function removeUnusedAuraMedia(
  asset: AuraMediaAsset | undefined,
  salonId: string,
  drafts: AuraSectionDraft[],
  client: any = supabase,
): Promise<boolean> {
  const path = String(asset?.path || '');
  if (!path.startsWith(`${salonId}/template-03/`)) return false;
  if (countAuraMediaUsage(drafts, path) > 0) return false;
  const { error } = await client.storage.from(AURA_MEDIA_BUCKET).remove([path]);
  if (error) throw errorForAura(error, 'Could not remove the unused media file.');
  return true;
}

/* ------------------------------------------------------------------------- *
 * Website resolver
 * ------------------------------------------------------------------------- */

function normalizeButtonMap(value: unknown): Record<string, AuraButtonItem> {
  const items = Array.isArray(value) ? value : defaultButtons;
  const map: Record<string, AuraButtonItem> = {};
  for (const raw of items) {
    if (!isObject(raw)) continue;
    const id = cleanAuraText(raw.id, 80);
    if (!id) continue;
    const action = ['book', 'scroll', 'link'].includes(String(raw.action)) ? String(raw.action) as AuraButtonItem['action'] : 'link';
    map[id] = {
      id,
      label: cleanAuraText(raw.label, 120) || defaultButtons.find((button) => button.id === id)?.label || 'Book Appointment',
      href: auraSafeHref(raw.href),
      action,
      visible: safeBoolean(raw.visible, true),
    };
  }
  for (const button of defaultButtons) if (!map[button.id]) map[button.id] = { ...button, href: auraSafeHref(button.href) };
  return map;
}

function normalizedMediaMap(value: unknown, defaults: Record<string, AuraMediaAsset>): Record<string, AuraMediaAsset> {
  const raw = isObject(value) ? value : {};
  const output: Record<string, AuraMediaAsset> = {};
  for (const [key, fallback] of Object.entries(defaults)) output[key] = safeMedia(raw[key], fallback);
  return output;
}

function mediaToImage(asset: AuraMediaAsset | undefined, fallback: AuraImage | any) {
  const merged = safeMedia(asset, imageAsset(fallback));
  return {
    src: merged.url || '',
    srcSet: merged.srcSet || '',
    width: merged.width || fallback?.width || 0,
    height: merged.height || fallback?.height || 0,
    alt: merged.alt || fallback?.alt || '',
  };
}

export interface AuraResolvedVideo {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  audience: string;
  duration: string;
  posterSrc: string;
  posterSrcSet?: string;
  channelLabel: string;
  embedUrl: string;
  externalUrl: string;
  videoSrc: string;
  embedKind: 'iframe' | 'file' | 'external';
  externalLabel: string;
  isDemo: boolean;
}

function resolveVideoSource(video: unknown): { embedUrl: string; externalUrl: string; videoSrc: string; embedKind: AuraResolvedVideo['embedKind']; externalLabel: string } {
  const raw = isObject(video) ? video : {};
  const url = auraSafeMediaUrl(raw.url || '');
  const mime = String(raw.mimeType || '').toLowerCase();
  const path = String(raw.path || '');
  if (path && (mime.startsWith('video/') || /\.(mp4|webm|mov)(\?|$)/i.test(url))) {
    return { embedUrl: '', externalUrl: url, videoSrc: url, embedKind: 'file', externalLabel: 'Open video' };
  }
  if (url) {
    const social = parseSocialVideo(url);
    if (social) {
      return {
        embedUrl: social.embedUrl,
        externalUrl: social.canonicalUrl,
        videoSrc: '',
        embedKind: social.platform === 'youtube' ? 'iframe' : 'external',
        externalLabel: social.platform === 'instagram' ? 'Open Reel on Instagram' : social.platform === 'facebook' ? 'Open video on Facebook' : 'Watch on YouTube',
      };
    }
    try {
      const parsed = new URL(url);
      if (parsed.hostname.toLowerCase() === 'vimeo.com' || parsed.hostname.toLowerCase() === 'www.vimeo.com') {
        const id = parsed.pathname.split('/').filter(Boolean)[0] || '';
        if (/^\d{5,15}$/.test(id)) {
          return {
            embedUrl: `https://player.vimeo.com/video/${id}`,
            externalUrl: `https://vimeo.com/${id}`,
            videoSrc: '',
            embedKind: 'iframe',
            externalLabel: 'Watch on Vimeo',
          };
        }
      }
      if (/\.(mp4|webm|mov)$/i.test(parsed.pathname)) {
        return { embedUrl: '', externalUrl: url, videoSrc: url, embedKind: 'file', externalLabel: 'Open video' };
      }
    } catch { /* handled below */ }
    return { embedUrl: '', externalUrl: url, videoSrc: '', embedKind: 'external', externalLabel: 'Open video link' };
  }
  return { embedUrl: '', externalUrl: '', videoSrc: '', embedKind: 'external', externalLabel: 'Open video' };
}

function resolveVideos(value: unknown, defaults: typeof defaultVideos): AuraResolvedVideo[] {
  const items = Array.isArray(value) ? value : defaults;
  return items.filter((item: any) => isObject(item) && safeBoolean(item.visible, true)).map((item: any, index: number) => {
    const video = resolveVideoSource(item.video);
    const poster = safeMedia(item.poster, imageAsset({ src: AURA_UNISEX_IMAGES.aboutInterior.src, alt: cleanAuraText(item.title, 160) }));
    const category = AURA_VIDEO_FILTERS.includes(item.category) ? item.category : 'All Videos';
    return {
      id: cleanAuraText(item.id, 120) || `aura-video-${index + 1}`,
      title: cleanAuraText(item.title, 220) || `Salon reel ${index + 1}`,
      subtitle: cleanAuraText(item.subtitle, 400),
      category: category === 'All Videos' ? defaults[index % defaults.length]?.category || "Men's Grooming" : category,
      audience: cleanAuraText(item.audience, 120) || 'Salon Reel',
      duration: cleanAuraText(item.duration, 40) || 'Short',
      posterSrc: poster.url || AURA_UNISEX_IMAGES.aboutInterior.src,
      posterSrcSet: poster.srcSet || '',
      channelLabel: cleanAuraText(item.channelLabel, 160) || 'Salon video',
      ...video,
      isDemo: false,
    };
  });
}

function normalizedList(value: unknown, fallback: any[]): any[] {
  if (!Array.isArray(value)) return clone(fallback);
  return value.map((item) => sanitizeAuraContent(item)).filter((item) => isObject(item));
}

export interface AuraSiteContent {
  sections: Record<AuraSectionKey, AuraSectionState>;
  copy: Record<string, any>;
  buttons: Record<string, AuraButtonItem>;
  media: Record<string, any>;
  categories: any[];
  whyPillars: any[];
  aboutHighlights: any[];
  gallery: any[];
  videos: AuraResolvedVideo[];
  reviews: any[];
  offers: any[];
  loyaltyTiers: any[];
  loyaltyRewards: any[];
  staffProfiles: any[];
  serviceOverrides: Record<string, any>;
  socials: Array<{ id: string; platform: string; url: string; label: string; visible: boolean }>;
  contact: Record<string, string>;
  footer: Record<string, any>;
  visible: (key: AuraSectionKey, legacySection?: string) => boolean;
  hasSaved: (key: AuraSectionKey) => boolean;
  settings: (key: AuraSectionKey) => AuraJson;
  orderOf: (key: AuraSectionKey, offset?: number) => number;
}

const LEGACY_SECTION_MAP: Partial<Record<AuraSectionKey, string>> = {
  hero: 'hero',
  hero_media: 'hero',
  categories: 'services',
  services: 'services',
  about: 'about',
  staff: 'stylists',
  gallery: 'gallery',
  videos: 'videos',
  reviews: 'testimonials',
  promotions: 'promo',
  loyalty: 'loyalty',
  contact: 'location',
  social: 'social',
};

export function createAuraSiteContent(raw: AuraSectionInput, options: { profile: SalonProfile; enabledSections?: string[] }): AuraSiteContent {
  const sections = normalizeAuraSectionRows(raw);
  const profile = options.profile || ({} as SalonProfile);
  const enabled = options.enabledSections || [];
  const saved = (key: AuraSectionKey) => sections[key].source === 'saved';
  const content = (key: AuraSectionKey) => sections[key].sectionContent;
  const setting = (key: AuraSectionKey) => sections[key].sectionSettings;
  const stringValue = (key: AuraSectionKey, path: string, fallback: string, max = 2000) => {
    const value = getAuraValue(content(key), path);
    return typeof value === 'string' || typeof value === 'number' ? cleanAuraText(value, max) || fallback : fallback;
  };

  const buttons = normalizeButtonMap(content('buttons').items);
  const buttonLabel = (id: string, fallback: string) => buttons[id]?.visible === false ? '' : buttons[id]?.label || fallback;
  const copy: Record<string, any> = { ...AURA_UNISEX_COPY };
  const header = content('header');
  for (const [key, field] of Object.entries({
    navHome: 'navHome', navCategories: 'navCategories', navServices: 'navServices', navAbout: 'navAbout',
    navTeam: 'navTeam', navGallery: 'navGallery', navVideos: 'navVideos', navContact: 'navContact',
  })) copy[key] = stringValue('header', field, String((AURA_UNISEX_COPY as any)[key] || ''), 120);
  copy.heroPrimary = buttonLabel('heroPrimary', AURA_UNISEX_COPY.heroPrimary);
  copy.heroSecondary = buttonLabel('heroSecondary', AURA_UNISEX_COPY.heroSecondary);
  copy.bookNow = buttonLabel('bookNow', AURA_UNISEX_COPY.bookNow);
  copy.packagesButton = buttonLabel('packagesButton', AURA_UNISEX_COPY.packagesButton);
  copy.aboutButton = buttonLabel('aboutButton', AURA_UNISEX_COPY.aboutButton);
  copy.menButton = buttonLabel('menButton', AURA_UNISEX_COPY.menButton);
  copy.womenButton = buttonLabel('womenButton', AURA_UNISEX_COPY.womenButton);
  copy.wellnessButton = buttonLabel('wellnessButton', AURA_UNISEX_COPY.wellnessButton);
  copy.teamButton = buttonLabel('teamButton', AURA_UNISEX_COPY.teamButton);
  copy.bookingButton = buttonLabel('bookingButton', AURA_UNISEX_COPY.bookingButton);
  copy.directions = buttonLabel('directions', AURA_UNISEX_COPY.directions);
  copy.callNow = buttonLabel('callNow', AURA_UNISEX_COPY.callNow);
  copy.whatsappNow = buttonLabel('whatsappNow', AURA_UNISEX_COPY.whatsappNow);
  copy.heroEyebrow = stringValue('hero', 'eyebrow', AURA_UNISEX_COPY.heroEyebrow, 160);
  copy.heroTitle = stringValue('hero', 'title', AURA_UNISEX_COPY.heroTitle, 300);
  copy.heroText = stringValue('hero', 'description', AURA_UNISEX_COPY.heroText, 2000);
  copy.heroPoints = normalizedStringList(content('hero').points, AURA_UNISEX_COPY.heroPoints);
  copy.heroCardMen = stringValue('hero', 'cardMen', AURA_UNISEX_COPY.heroCardMen, 160);
  copy.heroCardWomen = stringValue('hero', 'cardWomen', AURA_UNISEX_COPY.heroCardWomen, 160);
  copy.heroCareBoxTitle = stringValue('hero', 'careBoxTitle', AURA_UNISEX_COPY.heroCareBoxTitle, 160);
  copy.heroCareBoxText = stringValue('hero', 'careBoxText', AURA_UNISEX_COPY.heroCareBoxText, 300);
  copy.categoriesEyebrow = stringValue('categories', 'eyebrow', AURA_UNISEX_COPY.categoriesEyebrow, 160);
  copy.categoriesTitle = stringValue('categories', 'title', AURA_UNISEX_COPY.categoriesTitle, 220);
  copy.categoriesText = stringValue('categories', 'description', AURA_UNISEX_COPY.categoriesText, 1000);
  copy.servicesEyebrow = stringValue('services', 'eyebrow', AURA_UNISEX_COPY.servicesEyebrow, 160);
  copy.servicesTitle = stringValue('services', 'title', AURA_UNISEX_COPY.servicesTitle, 220);
  copy.servicesText = stringValue('services', 'description', AURA_UNISEX_COPY.servicesText, 1000);
  copy.packagesTitle = stringValue('services', 'packagesTitle', AURA_UNISEX_COPY.packagesTitle, 220);
  copy.packagesText = stringValue('services', 'packagesText', AURA_UNISEX_COPY.packagesText, 1000);
  copy.aboutEyebrow = stringValue('about', 'eyebrow', AURA_UNISEX_COPY.aboutEyebrow, 160);
  copy.aboutTitle = stringValue('about', 'title', AURA_UNISEX_COPY.aboutTitle, 220);
  copy.aboutDefault = stringValue('about', 'description', AURA_UNISEX_COPY.aboutDefault, 3000);
  copy.whyEyebrow = stringValue('why_choose_us', 'eyebrow', AURA_UNISEX_COPY.whyEyebrow, 160);
  copy.whyTitle = stringValue('why_choose_us', 'title', AURA_UNISEX_COPY.whyTitle, 220);
  copy.whyText = stringValue('why_choose_us', 'description', AURA_UNISEX_COPY.whyText, 1000);
  const why = content('why_choose_us');
  copy.menTitle = cleanAuraText(why.men?.title, 220) || AURA_UNISEX_COPY.menTitle;
  copy.menText = cleanAuraText(why.men?.description, 1000) || AURA_UNISEX_COPY.menText;
  copy.womenTitle = cleanAuraText(why.women?.title, 220) || AURA_UNISEX_COPY.womenTitle;
  copy.womenText = cleanAuraText(why.women?.description, 1000) || AURA_UNISEX_COPY.womenText;
  copy.wellnessEyebrow = cleanAuraText(why.wellness?.eyebrow, 160) || AURA_UNISEX_COPY.wellnessEyebrow;
  copy.wellnessTitle = cleanAuraText(why.wellness?.title, 220) || AURA_UNISEX_COPY.wellnessTitle;
  copy.wellnessText = cleanAuraText(why.wellness?.description, 1000) || AURA_UNISEX_COPY.wellnessText;
  copy.wellnessEmpty = cleanAuraText(why.wellness?.emptyText, 300) || AURA_UNISEX_COPY.wellnessEmpty;
  copy.teamEyebrow = stringValue('staff', 'eyebrow', AURA_UNISEX_COPY.teamEyebrow, 160);
  copy.teamTitle = stringValue('staff', 'title', AURA_UNISEX_COPY.teamTitle, 220);
  copy.teamText = stringValue('staff', 'description', AURA_UNISEX_COPY.teamText, 1000);
  copy.galleryEyebrow = stringValue('gallery', 'eyebrow', AURA_UNISEX_COPY.galleryEyebrow, 160);
  copy.galleryTitle = stringValue('gallery', 'title', AURA_UNISEX_COPY.galleryTitle, 220);
  copy.galleryText = stringValue('gallery', 'description', AURA_UNISEX_COPY.galleryText, 1000);
  copy.videosEyebrow = stringValue('videos', 'eyebrow', AURA_UNISEX_COPY.videosEyebrow, 160);
  copy.videosTitle = saved('videos')
    ? stringValue('videos', 'title', AURA_UNISEX_COPY.videosTitle, 220)
    : cleanAuraText(profile.sectionHeadings?.videosTitle, 220) || AURA_UNISEX_COPY.videosTitle;
  copy.videosText = saved('videos')
    ? stringValue('videos', 'description', AURA_UNISEX_COPY.videosText, 1000)
    : cleanAuraText(profile.sectionHeadings?.videosSubtitle, 1000) || AURA_UNISEX_COPY.videosText;
  copy.reviewsEyebrow = stringValue('reviews', 'eyebrow', AURA_UNISEX_COPY.reviewsEyebrow, 160);
  copy.reviewsTitle = stringValue('reviews', 'title', AURA_UNISEX_COPY.reviewsTitle, 220);
  copy.reviewsText = stringValue('reviews', 'description', AURA_UNISEX_COPY.reviewsText, 1000);
  copy.promoEyebrow = stringValue('promotions', 'eyebrow', AURA_UNISEX_COPY.promoEyebrow, 160);
  copy.promoTitle = stringValue('promotions', 'title', AURA_UNISEX_COPY.promoTitle, 220);
  copy.promoText = stringValue('promotions', 'description', AURA_UNISEX_COPY.promoText, 1000);
  copy.loyaltyEyebrow = stringValue('loyalty', 'eyebrow', AURA_UNISEX_COPY.loyaltyEyebrow, 160);
  copy.loyaltyTitle = saved('loyalty')
    ? stringValue('loyalty', 'title', AURA_UNISEX_COPY.loyaltyTitle, 220)
    : cleanAuraText(profile.sectionHeadings?.loyaltyTitle, 220) || AURA_UNISEX_COPY.loyaltyTitle;
  copy.loyaltyText = stringValue('loyalty', 'description', AURA_UNISEX_COPY.loyaltyText, 1000);
  copy.bookingEyebrow = stringValue('booking', 'eyebrow', AURA_UNISEX_COPY.bookingEyebrow, 160);
  copy.bookingTitle = stringValue('booking', 'title', AURA_UNISEX_COPY.bookingTitle, 220);
  copy.bookingText = stringValue('booking', 'description', AURA_UNISEX_COPY.bookingText, 1000);
  copy.contactEyebrow = stringValue('contact', 'eyebrow', AURA_UNISEX_COPY.contactEyebrow, 160);
  copy.contactTitle = stringValue('contact', 'title', AURA_UNISEX_COPY.contactTitle, 220);
  copy.contactText = stringValue('contact', 'description', AURA_UNISEX_COPY.contactText, 1000);
  copy.brandSublabel = stringValue('branding', 'sublabel', AURA_UNISEX_COPY.brandSublabel, 160);
  copy.footerQuickLinks = stringValue('footer', 'quickLinksTitle', AURA_UNISEX_COPY.footerQuickLinks, 160);
  copy.footerServices = stringValue('footer', 'servicesTitle', AURA_UNISEX_COPY.footerServices, 160);
  copy.footerContact = stringValue('footer', 'contactTitle', AURA_UNISEX_COPY.footerContact, 160);
  copy.footerRights = stringValue('footer', 'rights', AURA_UNISEX_COPY.footerRights, 160);
  copy.footerFollow = saved('social')
    ? stringValue('social', 'title', AURA_UNISEX_COPY.footerFollow, 160)
    : cleanAuraText(profile.sectionHeadings?.socialTitle, 160) || AURA_UNISEX_COPY.footerFollow;
  copy.footerLegal = normalizedStringList(content('footer').legal, AURA_UNISEX_COPY.footerLegal);

  const mediaDefaults: Record<string, AuraMediaAsset> = {
    heroMain: imageAsset(AURA_UNISEX_IMAGES.heroMain), heroMen: imageAsset(AURA_UNISEX_IMAGES.heroMen), heroWomen: imageAsset(AURA_UNISEX_IMAGES.heroWomen),
    aboutInterior: imageAsset(AURA_UNISEX_IMAGES.aboutInterior), aboutWork: imageAsset(AURA_UNISEX_IMAGES.aboutWork),
    featureMen: imageAsset(AURA_UNISEX_IMAGES.featureMen), featureWomen: imageAsset(AURA_UNISEX_IMAGES.featureWomen), wellness: imageAsset(AURA_UNISEX_IMAGES.wellness), booking: imageAsset(AURA_UNISEX_IMAGES.booking),
  };
  const heroMedia = normalizedMediaMap(
    { heroMain: content('hero_media').main, heroMen: content('hero_media').men, heroWomen: content('hero_media').women },
    mediaDefaults,
  );
  const whyMedia = normalizedMediaMap(
    { featureMen: why.images?.men, featureWomen: why.images?.women, wellness: why.images?.wellness },
    mediaDefaults,
  );
  const media: Record<string, any> = {
    ...AURA_UNISEX_IMAGES,
    heroMain: mediaToImage(heroMedia.heroMain, AURA_UNISEX_IMAGES.heroMain),
    heroMen: mediaToImage(heroMedia.heroMen, AURA_UNISEX_IMAGES.heroMen),
    heroWomen: mediaToImage(heroMedia.heroWomen, AURA_UNISEX_IMAGES.heroWomen),
    aboutInterior: mediaToImage(safeMedia(content('about').images?.primary, mediaDefaults.aboutInterior), AURA_UNISEX_IMAGES.aboutInterior),
    aboutWork: mediaToImage(safeMedia(content('about').images?.secondary, mediaDefaults.aboutWork), AURA_UNISEX_IMAGES.aboutWork),
    featureMen: mediaToImage(whyMedia.featureMen, AURA_UNISEX_IMAGES.featureMen),
    featureWomen: mediaToImage(whyMedia.featureWomen, AURA_UNISEX_IMAGES.featureWomen),
    wellness: mediaToImage(whyMedia.wellness, AURA_UNISEX_IMAGES.wellness),
    booking: mediaToImage(safeMedia(content('booking').image, mediaDefaults.booking), AURA_UNISEX_IMAGES.booking),
  };
  media.heroMain.alt = stringValue('hero_media', 'mainAlt', AURA_UNISEX_IMAGES.heroMain.alt, 300);
  media.heroMen.alt = stringValue('hero_media', 'menAlt', AURA_UNISEX_IMAGES.heroMen.alt, 300);
  media.heroWomen.alt = stringValue('hero_media', 'womenAlt', AURA_UNISEX_IMAGES.heroWomen.alt, 300);

  const categories = normalizedList(content('categories').items, AURA_DEFAULT_SECTION_CONTENT.categories.items)
    .filter((item) => safeBoolean(item.visible, true))
    .map((item, index) => ({
      id: cleanAuraText(item.id, 120) || `aura-category-${index + 1}`,
      tab: AURA_SERVICE_TABS.includes(item.tab) ? item.tab : 'Hair',
      audience: cleanAuraText(item.audience, 120),
      title: cleanAuraText(item.title, 220),
      subtitle: cleanAuraText(item.subtitle, 600),
      image: mediaToImage(item.image, AURA_UNISEX_IMAGES.services.haircut),
    }));
  const whyPillars = normalizedList(why.items, AURA_DEFAULT_SECTION_CONTENT.why_choose_us.items)
    .filter((item) => safeBoolean(item.visible, true))
    .map((item, index) => ({
      number: cleanAuraText(item.number, 8) || String(index + 1).padStart(2, '0'),
      title: cleanAuraText(item.title, 220),
      description: cleanAuraText(item.description, 1000),
      tag: cleanAuraText(item.tag, 120),
    }));
  const aboutHighlights = normalizedList(content('about').highlights, AURA_DEFAULT_SECTION_CONTENT.about.highlights)
    .filter((item) => safeBoolean(item.visible, true))
    .map((item) => ({ title: cleanAuraText(item.title, 220), text: cleanAuraText(item.text, 600) }));
  const gallery = normalizedList(content('gallery').items, defaultGallery)
    .filter((item) => safeBoolean(item.visible, true))
    .map((item, index) => {
      const photo = safeMedia(item.image, imageAsset(AURA_UNISEX_IMAGES.gallery[index % AURA_UNISEX_IMAGES.gallery.length]));
      return {
        id: cleanAuraText(item.id, 120) || `aura-gallery-${index + 1}`,
        src: photo.url || AURA_UNISEX_IMAGES.gallery[index % AURA_UNISEX_IMAGES.gallery.length].src,
        srcSet: photo.srcSet || '',
        title: cleanAuraText(item.title, 300) || 'Salon photo',
        tag: cleanAuraText(item.tag, 120) || 'Salon Work',
        isDemo: Boolean(item.isDemo),
      };
    });
  const videos = resolveVideos(content('videos').items, defaultVideos);
  const reviews = normalizedList(content('reviews').items, defaultReviews)
    .filter((item) => safeBoolean(item.visible, true))
    .map((item, index) => ({
      id: cleanAuraText(item.id, 120) || `aura-review-${index + 1}`,
      name: cleanAuraText(item.name, 160) || 'Salon guest',
      rating: Math.max(1, Math.min(5, Number(item.rating) || 5)),
      comment: cleanAuraText(item.comment, 2000),
      serviceName: cleanAuraText(item.serviceName, 200),
      location: cleanAuraText(item.location, 160),
      date: cleanAuraText(item.date, 80),
      isDemo: Boolean(item.isDemo),
    }));
  const offers = normalizedList(content('promotions').items, defaultOffers)
    .filter((item) => safeBoolean(item.visible, true))
    .map((item, index) => ({
      id: cleanAuraText(item.id, 120) || `aura-offer-${index + 1}`,
      badge: cleanAuraText(item.badge, 120),
      audience: cleanAuraText(item.audience, 120),
      title: cleanAuraText(item.title, 220),
      description: cleanAuraText(item.description, 1000),
      code: cleanAuraText(item.code, 80),
      validity: cleanAuraText(item.validity, 160),
      serviceId: cleanAuraText(item.serviceId, 120),
      isDemo: Boolean(item.isDemo),
      fromContent: true,
    }));
  const loyaltyTiers = normalizedList(content('loyalty').tiers, AURA_DEFAULT_SECTION_CONTENT.loyalty.tiers)
    .filter((item) => safeBoolean(item.visible, true))
    .map((item) => ({ name: cleanAuraText(item.name, 120), threshold: cleanAuraText(item.threshold, 80), perk: cleanAuraText(item.perk, 300) }));
  const loyaltyRewards = normalizedList(content('loyalty').rewards, AURA_DEFAULT_SECTION_CONTENT.loyalty.rewards)
    .filter((item) => safeBoolean(item.visible, true))
    .map((item, index) => ({
      id: cleanAuraText(item.id, 120) || `aura-reward-${index + 1}`,
      title: cleanAuraText(item.title, 220),
      description: cleanAuraText(item.description, 1000),
      requiredPoints: Number(item.requiredPoints) || 0,
      category: cleanAuraText(item.category, 120),
      isActive: true,
    }));
  const staffProfiles = normalizedList(content('staff').profiles, [])
    .filter((item) => safeBoolean(item.visible, true))
    .map((item, index) => ({
      id: cleanAuraText(item.staffId, 120) || `aura-display-expert-${index + 1}`,
      name: cleanAuraText(item.displayName, 160),
      role: cleanAuraText(item.displayRole, 160),
      specialties: String(item.specialties || '').split(',').map((entry) => cleanAuraText(entry, 120)).filter(Boolean),
      bio: cleanAuraText(item.bio, 1000),
      image: safeMedia(item.image, {}),
    }));
  const serviceOverrides: Record<string, any> = {};
  for (const item of normalizedList(content('services').overrides, [])) {
    const id = cleanAuraText(item.serviceId, 120);
    if (!id) continue;
    serviceOverrides[id] = {
      displayName: cleanAuraText(item.displayName, 220),
      displayDescription: cleanAuraText(item.displayDescription, 1000),
      image: safeMedia(item.image, {}),
      visible: safeBoolean(item.visible, true),
    };
  }

  const socialItems = normalizedList(content('social').items, []);
  const socials = (saved('social') ? socialItems : [
    { id: 'instagram', platform: 'instagram', label: 'Instagram', url: profile.instagramHandle || '', visible: true },
    { id: 'facebook', platform: 'facebook', label: 'Facebook', url: profile.facebookPage || '', visible: true },
    { id: 'youtube', platform: 'youtube', label: 'YouTube', url: profile.youtubeChannel || '', visible: true },
  ]).map((item, index) => {
    const platform = ['instagram', 'facebook', 'youtube', 'website'].includes(String(item.platform)) ? String(item.platform) : 'website';
    const raw = String(item.url || '');
    const url = platform === 'website' ? auraSafeHref(raw) : socialUrl(raw, platform);
    return {
      id: cleanAuraText(item.id, 120) || `aura-social-${index + 1}`,
      platform,
      label: cleanAuraText(item.label, 120) || platform,
      url: safeBoolean(item.visible, true) ? url : '',
      visible: safeBoolean(item.visible, true),
    };
  }).filter((item) => item.url);

  const contactContent = content('contact');
  const address = cleanAuraText(contactContent.address, 500) || auraAddress(profile);
  const city = cleanAuraText(profile.city, 160);
  const phone = cleanAuraText(contactContent.phone, 60) || profile.phone || '';
  const whatsapp = cleanAuraText(contactContent.whatsapp, 60) || profile.whatsapp || profile.phone || '';
  const email = cleanAuraText(contactContent.email, 200) || profile.email || '';
  const mapUrl = auraSafeHref(contactContent.mapUrl) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cleanAuraText(profile.businessName, 160)}, ${address}`)}`;
  const contact = {
    address, city, phone, whatsapp, email, mapUrl,
    landmark: cleanAuraText(contactContent.landmark, 200) || cleanAuraText(profile.landmark, 200),
    phoneHref: `tel:${auraPhoneDigits({ phone } as SalonProfile) || phone.replace(/[^+0-9]/g, '')}`,
    whatsappHref: auraSafeWhatsApp(whatsapp, auraWhatsApp({ whatsapp, phone } as SalonProfile)),
    emailHref: email ? `mailto:${email}` : '',
    locationTitle: cleanAuraText(contactContent.locationTitle, 160) || 'Salon Location',
    receptionTitle: cleanAuraText(contactContent.receptionTitle, 160) || 'Direct Reception Desk',
    hoursTitle: cleanAuraText(contactContent.hoursTitle, 160) || 'Opening Hours',
    walkInNote: cleanAuraText(contactContent.walkInNote, 300) || 'Walk-ins welcome · Advance booking recommended on weekends.',
    directionsLabel: cleanAuraText(contactContent.directionsLabel, 120) || AURA_UNISEX_COPY.directions,
    callLabel: cleanAuraText(contactContent.callLabel, 120) || AURA_UNISEX_COPY.callNow,
    whatsappLabel: cleanAuraText(contactContent.whatsappLabel, 120) || AURA_UNISEX_COPY.whatsappNow,
    viewMapLabel: cleanAuraText(contactContent.viewMapLabel, 120) || 'View on Google Maps',
  };
  const footerContent = content('footer');
  const footer = {
    aboutText: cleanAuraText(footerContent.aboutText, 1000) || copy.aboutDefault,
    installLabel: cleanAuraText(footerContent.installLabel, 160) || 'Install Customer App →',
  };
  const branding = content('branding');
  const buttonForDynamic = (id: string) => buttons[id];

  const visible = (key: AuraSectionKey, legacySection?: string): boolean => {
    // A saved Supabase row is authoritative: the new editor's show/hide switch
    // must work even when an older workspace section toggle is off. Untouched
    // sections continue to respect the legacy workspace switches.
    if (sections[key].source === 'saved') return sections[key].isVisible;
    const legacy = legacySection || LEGACY_SECTION_MAP[key];
    return legacy ? enabled.includes(legacy) : true;
  };
  const orderOf = (key: AuraSectionKey, offset = 0): number => clampOrder(sections[key].displayOrder + offset, AURA_SECTION_ORDER[key] + offset);
  return {
    sections, copy, buttons, media, categories, whyPillars, aboutHighlights, gallery, videos, reviews, offers,
    loyaltyTiers, loyaltyRewards, staffProfiles, serviceOverrides, socials, contact, footer,
    visible,
    hasSaved: saved,
    settings: (key) => setting(key),
    orderOf,
    extra: {
      brandNameOverride: cleanAuraText(branding.name, 160),
      sublabel: copy.brandSublabel,
      monogram: cleanAuraText(branding.monogram, 3) || 'A',
      logo: safeMedia(branding.logo, {}),
      useProfileName: safeBoolean(branding.useProfileName, true),
      heroRatingScore: stringValue('hero', 'ratingScore', '4.95', 20),
      heroRatingLabel: stringValue('hero', 'ratingLabel', 'Rated by Men & Women', 160),
      heroHimHerLabel: stringValue('hero', 'himHerLabel', 'Him & Her', 80),
      heroHimHerText: stringValue('hero', 'himHerText', 'Dedicated Styling Zones', 160),
      heroCleanLabel: stringValue('hero', 'cleanlinessLabel', '100% Clean', 80),
      heroCleanText: stringValue('hero', 'cleanlinessText', 'Ammonia-Free & Organic', 160),
      heroBadge: stringValue('hero', 'badgeText', 'Male & Female Salon Specialists', 200),
      aboutOwnerName: stringValue('about', 'ownerName', '', 160),
      aboutOwnerRole: stringValue('about', 'ownerRole', '', 160),
      aboutPlaqueYear: stringValue('about', 'plaqueYear', 'EST. 2020', 60),
      aboutPlaqueTitle: stringValue('about', 'plaqueTitle', 'Inclusive Unisex Lounge', 160),
      aboutPlaqueText: stringValue('about', 'plaqueText', '', 600),
      menPill: cleanAuraText(why.men?.pill, 60) || 'FOR HIM',
      womenPill: cleanAuraText(why.women?.pill, 60) || 'FOR HER',
      reviewsRatingScore: stringValue('reviews', 'ratingScore', '4.95', 20),
      reviewsRatingLabel: stringValue('reviews', 'ratingLabel', 'Unisex Hair, Grooming & Skin', 160),
      bookingWhatsappPrompt: stringValue('booking', 'whatsappPrompt', 'Prefer booking by chat?', 160),
      bookingPlannerTitle: stringValue('booking', 'plannerTitle', 'Choose Your Service & Preferred Time', 220),
      bookingPlannerKicker: stringValue('booking', 'plannerKicker', 'Instant Slot Request', 120),
      bookingImageCaption: stringValue('booking', 'imageCaption', 'Unisex Hair, Beard, Colour & Wellness', 200),
      buttonForDynamic,
    },
  } as AuraSiteContent & { extra: Record<string, any> };
}

export function auraButtonHref(site: AuraSiteContent, id: string, fallback = ''): string {
  const button = site.buttons[id];
  if (!button || button.visible === false) return '';
  if (id === 'directions') return button.href || site.contact.mapUrl;
  if (id === 'callNow') return button.href || site.contact.phoneHref;
  if (id === 'whatsappNow') return button.href || site.contact.whatsappHref;
  return button.href || fallback;
}
