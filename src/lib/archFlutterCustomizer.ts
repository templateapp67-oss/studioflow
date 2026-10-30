/**
 * Template 13 — "Arch & Flutter Lash & Brow Bar" customizer.
 *
 * This module is the single source of truth for the dedicated Template
 * Customizer drawer. It owns:
 *
 *  • one typed config object (`ArchFlutterCustomizerConfig`) with a schema
 *    version, built from — and written back to — the existing StudioFlow
 *    workspace schema (`SalonProfile`, `SalonService[]`, `Stylist[]`,
 *    `extras`), so nothing is stored in a private place and the customer app
 *    (GlowSlot) sees the same records;
 *  • the template defaults, so "Reset to template defaults" restores exactly
 *    what a brand-new Arch & Flutter site ships with;
 *  • validation and sanitising with simple Indian English messages;
 *  • colour-contrast checks (WCAG AA) for the palette tab;
 *  • a versioned history so Undo/Redo works;
 *  • an autosaved draft keyed by site id (`?site=` slug) + template id.
 *
 * It is deliberately Template-13-only: every export is scoped to `lash_brow`
 * and no shared component, stylesheet or platform theme is touched.
 */
import {
  ARCH_FLUTTER_ART,
  ARCH_FLUTTER_BRAND_NAME,
  ARCH_FLUTTER_CATEGORIES,
  ARCH_FLUTTER_DEFAULT_BEFORE_AFTER,
  ARCH_FLUTTER_DEFAULT_COLORS,
  ARCH_FLUTTER_DEFAULT_FAQS,
  ARCH_FLUTTER_DEFAULT_FEATURED_VIDEO,
  ARCH_FLUTTER_DEFAULT_PACKAGES,
  ARCH_FLUTTER_DEFAULT_POSTS,
  ARCH_FLUTTER_DEFAULT_REELS,
  ARCH_FLUTTER_DEFAULT_REVIEWS,
  ARCH_FLUTTER_DEFAULT_STATS,
  ARCH_FLUTTER_DEFAULT_STYLISTS,
  ARCH_FLUTTER_IMAGES,
  ARCH_FLUTTER_TAGLINE,
  ARCH_FLUTTER_TEMPLATE_SERVICES,
  buildArchFlutterSeo,
  resolveArchFlutterConfig,
} from './archFlutter';
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import { demoSalonOffers, normalizeSalonOffers } from './salonOffers';
import { photoGallery, withPhotoGallery, type SalonGalleryPhoto } from './photoGallery';
import { supabase } from './supabase';
import type {
  ArchFlutterBeforeAfter,
  ArchFlutterCategory,
  ArchFlutterColors,
  ArchFlutterFaq,
  ArchFlutterFonts,
  ArchFlutterHeroAction,
  ArchFlutterPackage,
  ArchFlutterReel,
  ArchFlutterReview,
  ArchFlutterSectionId,
  ArchFlutterPost,
  ArchFlutterSectionState,
  ArchFlutterStat,
  SalonOffer,
  SalonProfile,
  SalonService,
  Stylist,
} from '../types';

/* ------------------------------------------------------------------ *
 * Template identity
 * ------------------------------------------------------------------ */

/** Bumped whenever the config shape changes, so old drafts can be migrated. */
export const CUSTOMIZER_SCHEMA_VERSION = 1;

export const ARCH_FLUTTER_BUSINESS_TYPE = 'lash_brow';
export const ARCH_FLUTTER_TEMPLATE_ALIAS = 'arch-flutter';

const ARCH_FLUTTER_REFS = new Set([
  'lash_brow',
  'lash-brow',
  'lashbrow',
  'arch-flutter',
  'arch_flutter',
  'archflutter',
  'arch & flutter',
  '13',
  'template-13',
  'template 13',
]);

/** True only for the Arch & Flutter template — every other template is ignored. */
export function isArchFlutterTemplate(reference?: string | null): boolean {
  return ARCH_FLUTTER_REFS.has(String(reference || '').trim().toLowerCase());
}

/* Section, font, radius and blur primitives live in a leaf module so the
 * storefront resolver can share them without an import cycle. */
import {
  ARCH_FLUTTER_FONT_PAIRS,
  ARCH_FLUTTER_SECTIONS,
  DEFAULT_ARCH_FLUTTER_FONTS,
  DEFAULT_CORNER_RADIUS,
  DEFAULT_GLASS_BLUR,
  archFlutterSectionSpec,
  clampBlur,
  clampRadius,
  normalizeArchFlutterSections,
} from './archFlutterTheme';
export * from './archFlutterTheme';

/* ------------------------------------------------------------------ *
 * The config object
 * ------------------------------------------------------------------ */

export interface ArchFlutterBrandConfig {
  businessName: string;
  tagline: string;
  shortBio: string;
  logoUrl: string;
  faviconUrl: string;
  coverImageUrl: string;
}

export interface ArchFlutterThemeConfig {
  colors: ArchFlutterColors;
  fontPairId: string;
  fonts: ArchFlutterFonts;
  cornerRadius: number;
  glassBlur: number;
}

export interface ArchFlutterHeroConfig {
  kicker: string;
  heading: string;
  subtext: string;
  imageUrl: string;
  primaryLabel: string;
  primaryAction: ArchFlutterHeroAction;
  primaryUrl: string;
  secondaryLabel: string;
  secondaryAction: ArchFlutterHeroAction;
  secondaryUrl: string;
  mockupImageUrl: string;
}

export interface ArchFlutterContactConfig {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  landmark: string;
  mapLink: string;
  openTime: string;
  closeTime: string;
  workingHoursDisplay: string;
  instagramHandle: string;
  facebookPage: string;
  youtubeChannel: string;
  googleBusinessUrl: string;
}

export interface ArchFlutterBookingConfig {
  currency: 'INR';
  requireDeposit: boolean;
  depositPercentage: number;
  payAtSalon: boolean;
  upiHandle: string;
  leadHours: number;
  cancellationWindow: number;
  showGstNote: boolean;
  gstin: string;
}

export interface ArchFlutterSeoConfig {
  metaTitle: string;
  metaDescription: string;
  shareImageUrl: string;
  keywords: string;
}

export interface ArchFlutterCustomizerConfig {
  version: number;
  templateId: typeof ARCH_FLUTTER_BUSINESS_TYPE;
  siteId: string;
  brand: ArchFlutterBrandConfig;
  theme: ArchFlutterThemeConfig;
  hero: ArchFlutterHeroConfig;
  sections: ArchFlutterSectionState[];
  categories: ArchFlutterCategory[];
  services: SalonService[];
  packages: ArchFlutterPackage[];
  stats: ArchFlutterStat[];
  offers: SalonOffer[];
  reels: ArchFlutterReel[];
  featuredVideo: ArchFlutterReel;
  gallery: SalonGalleryPhoto[];
  beforeAfter: ArchFlutterBeforeAfter[];
  team: Stylist[];
  reviews: ArchFlutterReview[];
  faqs: ArchFlutterFaq[];
  posts: ArchFlutterPost[];
  contact: ArchFlutterContactConfig;
  booking: ArchFlutterBookingConfig;
  seo: ArchFlutterSeoConfig;
}

export interface CustomizerWorkspace {
  profile: SalonProfile;
  services: SalonService[];
  stylists: Stylist[];
  extras: { gallery: string[]; bookingLeadHours: number; cancellationWindow: number; [key: string]: unknown };
}

/* ------------------------------------------------------------------ *
 * Text sanitising, money and dates
 * ------------------------------------------------------------------ */

/**
 * Strips markup and control characters from owner text. React escapes output
 * anyway; this keeps saved records clean for the customer app, exports and
 * any place the value is rendered as HTML later.
 */
export function sanitizeText(value: unknown, maxLength = 400): string {
  const raw = typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
  const cleaned = raw
    .replace(/<\s*\/?\s*(script|style|iframe|object|embed|link|meta)[^>]*>/gi, ' ')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, maxLength);
}

export function sanitizeMultiline(value: unknown, maxLength = 2000): string {
  const raw = typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
  return raw
    .replace(/<\s*\/?\s*(script|style|iframe|object|embed|link|meta)[^>]*>/gi, ' ')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

/** Accepts "1,499", "₹1499", "1499.50" and returns a safe positive number. */
export function parseInr(value: unknown): number {
  const raw = String(value ?? '').replace(/[₹,\s]/g, '');
  const next = Number(raw);
  if (!Number.isFinite(next)) return NaN;
  return Math.round(next * 100) / 100;
}

export function formatInr(value: number): string {
  if (!Number.isFinite(value)) return '₹0';
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-11-14` → `14 Nov 2026` (the format every offer date is shown in). */
export function formatDateIN(iso: string): string {
  const stamp = String(iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(stamp)) return '';
  const [year, month, day] = stamp.split('-').map(Number);
  if (!year || !month || !day) return '';
  return `${String(day).padStart(2, '0')} ${MONTHS[month - 1]} ${year}`;
}

export function isValidIsoDate(iso: string): boolean {
  return Boolean(formatDateIN(iso)) && !Number.isNaN(new Date(`${iso.slice(0, 10)}T00:00:00`).getTime());
}

/** Indian mobile numbers: 10 digits, optionally prefixed by +91. */
export function normalizeIndianPhone(value: unknown): string {
  const digits = String(value || '').replace(/[^\d+]/g, '');
  return digits;
}

export function isIndianPhone(value: unknown): boolean {
  const raw = normalizeIndianPhone(value);
  if (!raw) return false;
  const local = raw.replace(/^\+?91/, '');
  return /^[6-9]\d{9}$/.test(local) || /^\+91[6-9]\d{9}$/.test(raw);
}

export function isSafeHttpUrl(value: unknown): boolean {
  const raw = String(value || '').trim();
  if (!raw) return true; // empty is allowed: fields fall back to template art
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' || raw.startsWith('/');
  } catch {
    return raw.startsWith('/') && !raw.includes('//');
  }
}

export function isImageLikeUrl(value: unknown): boolean {
  const raw = String(value || '').trim();
  if (!raw) return true;
  if (raw.startsWith('/')) return /\.(jpe?g|png|webp|svg|gif|avif)$/i.test(raw);
  return isSafeHttpUrl(raw);
}

/* ------------------------------------------------------------------ *
 * Colour contrast (WCAG AA)
 * ------------------------------------------------------------------ */

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const clean = String(hex || '').replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return 0;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
}

export interface ContrastIssue {
  label: string;
  ratio: number;
  required: number;
  severity: 'warning' | 'error';
  hint: string;
}

/** Warns when an owner's palette makes text unreadable. */
export function contrastIssues(colors: ArchFlutterColors): ContrastIssue[] {
  const checks: Array<{ label: string; fg: string; bg: string; required: number }> = [
    { label: 'Body text on the ivory background', fg: colors.espresso, bg: colors.ivory, required: 4.5 },
    { label: 'Mauve accents on the ivory background', fg: colors.mauve, bg: colors.ivory, required: 3 },
    { label: 'Gold details on the espresso background', fg: colors.gold, bg: colors.espresso, required: 3 },
    { label: 'Ivory text on the mauve buttons', fg: colors.ivory, bg: colors.mauve, required: 4.5 },
    { label: 'Espresso text on the blush background', fg: colors.espresso, bg: colors.blush, required: 4.5 },
  ];
  const issues: ContrastIssue[] = [];
  for (const check of checks) {
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(check.fg || '')) || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(check.bg || ''))) continue;
    const ratio = contrastRatio(check.fg, check.bg);
    if (ratio >= check.required) continue;
    issues.push({
      label: check.label,
      ratio,
      required: check.required,
      severity: ratio < 3 ? 'error' : 'warning',
      hint:
        ratio < 3
          ? 'This pairing is hard to read. Darken the text colour or lighten the background.'
          : 'Readable for large headings only. Small text may be hard to read for some clients.',
    });
  }
  return issues;
}

/**
 * Trims a long generated meta description to something Google can show, cutting
 * at a sentence (then a word) so the owner never sees half a word in the SEO tab.
 */
export function shortenSeoDescription(value: unknown, maxLength = 200): string {
  const text = sanitizeText(value, 4000).trim();
  if (text.length <= maxLength) return text;
  const window = text.slice(0, maxLength + 1);
  const sentence = Math.max(window.lastIndexOf('. '), window.lastIndexOf('? '), window.lastIndexOf('! '));
  const cut = sentence >= Math.round(maxLength * 0.5) ? window.slice(0, sentence + 1) : window.slice(0, window.lastIndexOf(' '));
  const trimmed = cut.replace(/[\s,;:·—-]+$/, '');
  return /[.?!]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function isHexColor(value: unknown): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || '').trim());
}

/* ------------------------------------------------------------------ *
 * Config build / apply / defaults
 * ------------------------------------------------------------------ */

function configOf(profile: SalonProfile) {
  return profile.archFlutter || {};
}

function whiteLabel(workspace: CustomizerWorkspace): Record<string, unknown> {
  return ((workspace.extras as Record<string, unknown>)?.whiteLabel as Record<string, unknown>) || {};
}

/** Reads the existing workspace into the single typed config object. */
export function buildCustomizerConfig(workspace: CustomizerWorkspace, siteId = ''): ArchFlutterCustomizerConfig {
  const { profile } = workspace;
  const resolved = resolveArchFlutterConfig(profile);
  const raw = configOf(profile);
  const fontPair =
    ARCH_FLUTTER_FONT_PAIRS.find((pair) => pair.heading === raw.fonts?.heading && pair.body === raw.fonts?.body) ||
    ARCH_FLUTTER_FONT_PAIRS[0];
  return {
    version: Number(raw.customizerVersion || CUSTOMIZER_SCHEMA_VERSION),
    templateId: ARCH_FLUTTER_BUSINESS_TYPE,
    siteId,
    brand: {
      businessName: profile.businessName || ARCH_FLUTTER_BRAND_NAME,
      tagline: profile.tagline || ARCH_FLUTTER_TAGLINE,
      shortBio: profile.about || '',
      logoUrl: profile.logoUrl || '',
      faviconUrl: String(whiteLabel(workspace).faviconUrl || ''),
      coverImageUrl: profile.coverImageUrl || '',
    },
    theme: {
      colors: { ...resolved.colors },
      fontPairId: fontPair.id,
      fonts: { heading: raw.fonts?.heading || fontPair.heading, body: raw.fonts?.body || fontPair.body },
      cornerRadius: clampRadius(raw.cornerRadius ?? DEFAULT_CORNER_RADIUS),
      glassBlur: clampBlur(raw.glassBlur ?? DEFAULT_GLASS_BLUR),
    },
    hero: {
      kicker: resolved.heroKicker,
      heading: resolved.heroHeading,
      subtext: resolved.heroSubtext,
      imageUrl: raw.heroImageUrl || '',
      primaryLabel: raw.heroPrimaryLabel || 'Book an appointment',
      primaryAction: raw.heroPrimaryAction || 'booking',
      primaryUrl: raw.heroPrimaryUrl || '',
      secondaryLabel: raw.heroSecondaryLabel || 'See the ₹ menu',
      secondaryAction: raw.heroSecondaryAction || 'services',
      secondaryUrl: raw.heroSecondaryUrl || '',
      mockupImageUrl: raw.heroMockupImageUrl || '',
    },
    sections: normalizeArchFlutterSections(raw.sections),
    categories: (raw.categories?.length ? raw.categories : ARCH_FLUTTER_CATEGORIES).map((category) => ({ ...category })),
    services: (workspace.services?.length ? workspace.services : ARCH_FLUTTER_TEMPLATE_SERVICES).map((service) => ({ ...service })),
    packages: (raw.packages?.length ? raw.packages : ARCH_FLUTTER_DEFAULT_PACKAGES).map((item) => ({ ...item })),
    stats: (raw.stats?.length ? raw.stats : ARCH_FLUTTER_DEFAULT_STATS).map((item) => ({ ...item })),
    offers: normalizeSalonOffers(profile.promoOffers?.length ? profile.promoOffers : demoSalonOffers(profile.businessType)),
    reels: (raw.reels?.length ? raw.reels : ARCH_FLUTTER_DEFAULT_REELS).map((item) => ({ ...item })),
    featuredVideo: { ...(raw.featuredVideo || ARCH_FLUTTER_DEFAULT_FEATURED_VIDEO) },
    // The gallery always goes through the shared helper so a salon that has not
    // touched its photos yet still sees (and keeps) the five Template 13 samples.
    gallery: photoGallery(profile, (workspace.extras?.gallery as string[]) || []).map((photo) => ({ ...photo })),
    beforeAfter: (raw.beforeAfter?.length ? raw.beforeAfter : ARCH_FLUTTER_DEFAULT_BEFORE_AFTER).map((item) => ({ ...item })),
    team: (workspace.stylists?.length ? workspace.stylists : ARCH_FLUTTER_DEFAULT_STYLISTS).map((member) => ({ ...member })),
    reviews: (raw.reviews?.length ? raw.reviews : ARCH_FLUTTER_DEFAULT_REVIEWS).map((item) => ({ ...item })),
    faqs: (raw.faqs?.length ? raw.faqs : ARCH_FLUTTER_DEFAULT_FAQS).map((item) => ({ ...item })),
    posts: (raw.posts?.length ? raw.posts : ARCH_FLUTTER_DEFAULT_POSTS).map((item) => ({ ...item })),
    contact: {
      phone: profile.phone || '',
      whatsapp: profile.whatsapp || profile.phone || '',
      email: raw.publicEmail || profile.email || '',
      address: profile.address || '',
      city: profile.city || '',
      postalCode: profile.postalCode || '',
      landmark: profile.landmark || '',
      mapLink: raw.mapEmbedUrl || profile.googleBusinessUrl || '',
      openTime: raw.openTime || '10:00',
      closeTime: raw.closeTime || '20:00',
      workingHoursDisplay: raw.workingHoursDisplay || '',
      instagramHandle: profile.instagramHandle || '',
      facebookPage: profile.facebookPage || '',
      youtubeChannel: profile.youtubeChannel || '',
      googleBusinessUrl: profile.googleBusinessUrl || '',
    },
    booking: {
      currency: 'INR',
      requireDeposit: profile.requireDeposit !== false,
      depositPercentage: Number(profile.depositPercentage || 25),
      payAtSalon: raw.payAtSalon !== false,
      upiHandle: raw.upiHandle || '',
      leadHours: Number(workspace.extras?.bookingLeadHours ?? profile.bookingRules?.leadHours ?? 2),
      cancellationWindow: Number(workspace.extras?.cancellationWindow ?? profile.bookingRules?.cancellationWindow ?? 24),
      showGstNote: raw.showGstNote !== false,
      gstin: raw.gstin || '',
    },
    // The SEO tab opens pre-filled with what this website already generates, so
    // an owner who never touches it keeps the same search listing.
    seo: (() => {
      const generated = buildArchFlutterSeo(profile, resolved);
      return {
        metaTitle: (profile.seo?.metaTitle || generated.metaTitle || '').trim(),
        metaDescription: shortenSeoDescription(profile.seo?.metaDescription || generated.metaDescription || ''),
        shareImageUrl: (profile.seo?.ogImageUrl || generated.ogImageUrl || '').trim(),
        keywords: (profile.seo?.keywords || generated.keywords || '').trim(),
      };
    })(),
  };
}

/**
 * Writes the config back into the existing workspace schema. Nothing is
 * stored outside `SalonProfile` / `services` / `stylists` / `extras`, so the
 * published website and the GlowSlot customer app read the same records.
 */
export function applyCustomizerConfig(
  config: ArchFlutterCustomizerConfig,
  workspace: CustomizerWorkspace,
): CustomizerWorkspace {
  const { profile } = workspace;
  const raw = configOf(profile);
  const sections = normalizeArchFlutterSections(config.sections);
  const headings: Record<string, string> = {};
  for (const entry of sections) {
    const spec = archFlutterSectionSpec(entry.id);
    if (!spec?.headingKey) continue;
    const label = sanitizeText(entry.label, 60);
    if (label) headings[spec.headingKey] = label;
  }

  const nextProfile: SalonProfile = {
    ...profile,
    businessType: ARCH_FLUTTER_BUSINESS_TYPE,
    businessName: sanitizeText(config.brand.businessName, 120) || ARCH_FLUTTER_BRAND_NAME,
    tagline: sanitizeText(config.brand.tagline, 160),
    about: sanitizeMultiline(config.brand.shortBio, 2000),
    logoUrl: config.brand.logoUrl,
    coverImageUrl: config.brand.coverImageUrl,
    currency: 'INR',
    phone: sanitizeText(config.contact.phone, 32),
    whatsapp: sanitizeText(config.contact.whatsapp, 32),
    email: sanitizeText(config.contact.email, 120),
    address: sanitizeText(config.contact.address, 200),
    city: sanitizeText(config.contact.city, 120),
    postalCode: sanitizeText(config.contact.postalCode, 12),
    landmark: sanitizeText(config.contact.landmark, 120),
    instagramHandle: sanitizeText(config.contact.instagramHandle, 80),
    facebookPage: sanitizeText(config.contact.facebookPage, 120),
    youtubeChannel: sanitizeText(config.contact.youtubeChannel, 160),
    googleBusinessUrl: sanitizeText(config.contact.googleBusinessUrl, 300),
    requireDeposit: config.booking.requireDeposit,
    depositPercentage: Math.min(100, Math.max(0, Math.round(Number(config.booking.depositPercentage) || 0))),
    bookingRules: {
      ...(profile.bookingRules || {}),
      leadHours: Math.min(720, Math.max(0, Math.round(Number(config.booking.leadHours) || 0))),
      cancellationWindow: Math.min(720, Math.max(0, Math.round(Number(config.booking.cancellationWindow) || 0))),
    },
    promoOffers: normalizeSalonOffers(config.offers),
    seo: {
      ...(profile.seo || {}),
      metaTitle: sanitizeText(config.seo.metaTitle, 120),
      metaDescription: sanitizeText(config.seo.metaDescription, 320),
      ogImageUrl: config.seo.shareImageUrl,
      keywords: sanitizeText(config.seo.keywords, 320),
    },
    archFlutter: {
      ...raw,
      customizerVersion: CUSTOMIZER_SCHEMA_VERSION,
      sections,
      fonts: { heading: config.theme.fonts.heading, body: config.theme.fonts.body },
      cornerRadius: clampRadius(config.theme.cornerRadius),
      glassBlur: clampBlur(config.theme.glassBlur),
      colors: { ...config.theme.colors },
      heroKicker: sanitizeText(config.hero.kicker, 120),
      heroHeading: sanitizeText(config.hero.heading, 160),
      heroSubtext: sanitizeMultiline(config.hero.subtext, 600),
      heroImageUrl: config.hero.imageUrl,
      heroPrimaryLabel: sanitizeText(config.hero.primaryLabel, 60),
      heroPrimaryAction: config.hero.primaryAction,
      heroPrimaryUrl: config.hero.primaryUrl,
      heroSecondaryLabel: sanitizeText(config.hero.secondaryLabel, 60),
      heroSecondaryAction: config.hero.secondaryAction,
      heroSecondaryUrl: config.hero.secondaryUrl,
      heroMockupImageUrl: config.hero.mockupImageUrl,
      categories: config.categories.map((category) => ({
        ...category,
        name: sanitizeText(category.name, 80),
        blurb: sanitizeText(category.blurb, 240),
      })),
      packages: config.packages.map((item) => ({ ...item, tier: sanitizeText(item.tier, 80), name: sanitizeText(item.name, 120) })),
      stats: config.stats.map((item) => ({ ...item, value: sanitizeText(item.value, 24), label: sanitizeText(item.label, 60) })),
      reels: config.reels.map((reel) => ({ ...reel, title: sanitizeText(reel.title, 120), caption: sanitizeText(reel.caption, 240) })),
      featuredVideo: {
        ...config.featuredVideo,
        title: sanitizeText(config.featuredVideo.title, 120),
        caption: sanitizeText(config.featuredVideo.caption, 240),
      },
      beforeAfter: config.beforeAfter.map((item) => ({
        ...item,
        title: sanitizeText(item.title, 120),
        alt: sanitizeText(item.alt, 200),
      })),
      reviews: config.reviews.map((review) => ({
        ...review,
        name: sanitizeText(review.name, 80),
        area: sanitizeText(review.area, 80),
        service: sanitizeText(review.service, 80),
        quote: sanitizeMultiline(review.quote, 600),
        rating: Math.min(5, Math.max(1, Math.round(Number(review.rating) || 5))),
      })),
      faqs: config.faqs.map((faq) => ({
        ...faq,
        question: sanitizeText(faq.question, 160),
        answer: sanitizeMultiline(faq.answer, 800),
      })),
      posts: config.posts.map((post) => ({ ...post, title: sanitizeText(post.title, 140) })),
      publicEmail: sanitizeText(config.contact.email, 120),
      mapEmbedUrl: config.contact.mapLink,
      openTime: config.contact.openTime,
      closeTime: config.contact.closeTime,
      workingHoursDisplay: sanitizeText(config.contact.workingHoursDisplay, 120),
      showGstNote: config.booking.showGstNote,
      payAtSalon: config.booking.payAtSalon,
      upiHandle: sanitizeText(config.booking.upiHandle, 80),
      gstin: sanitizeText(config.booking.gstin, 32).toUpperCase(),
      // A renamed section heading wins over the stored heading text.
      ...Object.fromEntries(Object.entries(raw).filter(([key]) => (headings as Record<string, string>)[key] === undefined && key.endsWith('Heading'))),
      ...headings,
    },
  };

  // Renaming a category has to carry its services along, otherwise every
  // service in it silently disappears from the website menu.
  const previousCategories = raw.categories?.length ? raw.categories : ARCH_FLUTTER_CATEGORIES;
  const categoryRenames = new Map<string, string>();
  for (const nextCategory of config.categories) {
    const previous = previousCategories.find((entry) => entry.id === nextCategory.id);
    const from = sanitizeText(previous?.name, 80).trim();
    const to = sanitizeText(nextCategory.name, 80).trim();
    if (from && to && from !== to) categoryRenames.set(from, to);
  }

  const galleryProfile = withPhotoGallery(nextProfile, config.gallery);
  return {
    profile: galleryProfile,
    services: config.services.map((service) => ({
      ...service,
      category: categoryRenames.get(String(service.category || '').trim()) || service.category,
    })),
    stylists: config.team.map((member) => ({ ...member })),
    extras: {
      ...workspace.extras,
      whiteLabel: {
        ...whiteLabel(workspace),
        faviconUrl: config.brand.faviconUrl,
      },
      gallery: config.gallery.map((photo) => photo.url).filter(Boolean),
      bookingLeadHours: Math.min(720, Math.max(0, Math.round(Number(config.booking.leadHours) || 0))),
      cancellationWindow: Math.min(720, Math.max(0, Math.round(Number(config.booking.cancellationWindow) || 0))),
    },
  };
}

/** Exactly what a brand-new Arch & Flutter site ships with. */
export function defaultCustomizerConfig(siteId = ''): ArchFlutterCustomizerConfig {
  const template = CATEGORY_TEMPLATES[ARCH_FLUTTER_BUSINESS_TYPE];
  const profile = {
    businessType: ARCH_FLUTTER_BUSINESS_TYPE,
    businessName: template.title,
    tagline: template.tagline,
    about: template.about,
    coverImageUrl: template.coverImageUrl,
    phone: template.phone,
    whatsapp: template.whatsapp,
    city: template.defaultCity,
    address: template.defaultAddress,
    postalCode: template.defaultPostalCode,
    instagramHandle: template.instagramHandle,
    ownerName: template.ownerName,
    ownerRole: template.ownerRole,
    promoOffers: demoSalonOffers(ARCH_FLUTTER_BUSINESS_TYPE),
  } as unknown as SalonProfile;
  return buildCustomizerConfig(
    {
      profile,
      services: ARCH_FLUTTER_TEMPLATE_SERVICES.map((service) => ({ ...service })),
      stylists: ARCH_FLUTTER_DEFAULT_STYLISTS.map((member) => ({ ...member })),
      extras: { gallery: [], bookingLeadHours: 2, cancellationWindow: 24 },
    },
    siteId,
  );
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

export interface CustomizerIssue {
  tab: CustomizerTabId;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export type CustomizerTabId =
  | 'brand'
  | 'theme'
  | 'hero'
  | 'sections'
  | 'menu'
  | 'offers'
  | 'reels'
  | 'gallery'
  | 'team'
  | 'voices'
  | 'contact'
  | 'booking'
  | 'seo';

export const CUSTOMIZER_TABS: Array<{ id: CustomizerTabId; label: string; hint: string }> = [
  { id: 'brand', label: 'Brand', hint: 'Salon name, tagline, logo, favicon and a short bio.' },
  { id: 'theme', label: 'Colours & fonts', hint: 'Palette tokens, font pairing, corner radius and glass blur.' },
  { id: 'hero', label: 'Hero', hint: 'Headline, sub-headline, buttons, hero photo and phone mockup.' },
  { id: 'sections', label: 'Sections', hint: 'Show, hide, rename and reorder the home page blocks.' },
  { id: 'menu', label: 'Categories & services', hint: 'Categories, services, duration, description, photo, ₹ price.' },
  { id: 'offers', label: 'Promotions & offers', hint: 'Edit the sample offers or add your own.' },
  { id: 'reels', label: 'Videos & reels', hint: 'Upload or link YouTube / Instagram reels, posters and order.' },
  { id: 'gallery', label: 'Gallery & before/after', hint: 'Photos, alt text, order and before/after pairs.' },
  { id: 'team', label: 'Team', hint: 'Artists, roles, photos, specialities and bios.' },
  { id: 'voices', label: 'Testimonials & FAQ', hint: 'Client quotes and the questions clients ask most.' },
  { id: 'contact', label: 'Contact & timings', hint: 'Phone, WhatsApp, email, address, map link, hours, socials.' },
  { id: 'booking', label: 'Booking & payments', hint: 'Advance amount, pay at salon, UPI details and GST display.' },
  { id: 'seo', label: 'SEO', hint: 'Page title, meta description and the share image.' },
];

/** Simple Indian English messages; errors block Save, warnings do not. */
export function validateCustomizerConfig(config: ArchFlutterCustomizerConfig): CustomizerIssue[] {
  const issues: CustomizerIssue[] = [];
  const push = (tab: CustomizerTabId, field: string, message: string, severity: CustomizerIssue['severity'] = 'error') =>
    issues.push({ tab, field, message, severity });

  if (!config.brand.businessName.trim()) push('brand', 'businessName', 'Please enter your salon name.');
  if (config.brand.businessName.trim().length > 120) push('brand', 'businessName', 'Salon name should be under 120 characters.');
  if (!config.brand.tagline.trim()) push('brand', 'tagline', 'Please enter a short tagline.', 'warning');
  if (config.brand.logoUrl && !isImageLikeUrl(config.brand.logoUrl)) push('brand', 'logoUrl', 'Logo should be an image link (JPG, PNG, WebP or SVG).');

  for (const token of Object.keys(config.theme.colors) as Array<keyof ArchFlutterColors>) {
    if (!isHexColor(config.theme.colors[token])) push('theme', `colors.${token}`, 'Each colour needs a hex value like #C9A66B.');
  }
  for (const issue of contrastIssues(config.theme.colors)) {
    push('theme', 'colors', `${issue.label} is ${issue.ratio}:1 (needs ${issue.required}:1). ${issue.hint}`, issue.severity === 'error' ? 'error' : 'warning');
  }

  if (!config.hero.heading.trim()) push('hero', 'heading', 'Please enter a hero headline.');
  for (const [field, action, url] of [
    ['primary', config.hero.primaryAction, config.hero.primaryUrl],
    ['secondary', config.hero.secondaryAction, config.hero.secondaryUrl],
  ] as const) {
    if (action === 'url' && !isSafeHttpUrl(url)) push('hero', `${field}Url`, 'Button link should start with https:// or be a page link starting with /.');
    if (action !== 'none' && !String(field === 'primary' ? config.hero.primaryLabel : config.hero.secondaryLabel).trim()) {
      push('hero', `${field}Label`, 'Please enter the button text, or switch the button off.', 'warning');
    }
  }
  if (config.hero.imageUrl && !isImageLikeUrl(config.hero.imageUrl)) push('hero', 'imageUrl', 'Hero photo should be an image link.');

  const seenCategories = new Set<string>();
  for (const category of config.categories) {
    const name = category.name.trim();
    if (!name) push('menu', 'categories', 'A category needs a name.');
    else if (seenCategories.has(name.toLowerCase())) push('menu', 'categories', `Two categories are both called “${name}”. Please rename one.`);
    else seenCategories.add(name.toLowerCase());
  }
  const categoryNames = new Set(config.categories.map((category) => sanitizeText(category.name, 80).trim().toLowerCase()));
  const seenServiceIds = new Set<string>();
  for (const service of config.services) {
    if (!service.name.trim()) push('menu', 'services', 'Every service needs a name.');
    if (!Number.isFinite(service.price) || service.price < 0) push('menu', 'services', `“${service.name || 'Untitled service'}” needs a price of ₹0 or more.`);
    if (service.price > 10_000_000) push('menu', 'services', `“${service.name}” looks too expensive. Please check the ₹ price.`);
    if (!Number.isInteger(service.durationMinutes) || service.durationMinutes < 1 || service.durationMinutes > 720) {
      push('menu', 'services', `“${service.name || 'Untitled service'}” needs a duration between 1 and 720 minutes.`);
    }
    if (!service.category.trim()) push('menu', 'services', `“${service.name || 'Untitled service'}” needs a category.`);
    else if (!categoryNames.has(service.category.trim().toLowerCase())) {
      push('menu', 'services', `“${service.name || 'Untitled service'}” is filed under “${service.category}”, which is not one of your categories. It will not show on the website menu.`, 'warning');
    }
    if (seenServiceIds.has(service.id)) push('menu', 'services', 'Two services share the same id. Please delete one of them.');
    seenServiceIds.add(service.id);
  }

  for (const offer of config.offers) {
    if (!offer.title.trim()) push('offers', 'offers', 'Every offer needs a title.');
    if (offer.originalPriceINR < 0 || offer.offerPriceINR < 0) push('offers', 'offers', `“${offer.title}” has a negative ₹ price.`);
    if (offer.originalPriceINR > 0 && offer.offerPriceINR > offer.originalPriceINR) {
      push('offers', 'offers', `“${offer.title}” costs more than the original price. Please check the numbers.`, 'warning');
    }
    if (offer.offerType === 'percent' && (offer.discountValue < 1 || offer.discountValue > 100)) {
      push('offers', 'offers', `“${offer.title}” needs a discount between 1% and 100%.`);
    }
    if (offer.validFrom && !isValidIsoDate(offer.validFrom)) push('offers', 'offers', `“${offer.title}” has a start date we cannot read. Use the date picker.`);
    if (offer.validTo && !isValidIsoDate(offer.validTo)) push('offers', 'offers', `“${offer.title}” has an end date we cannot read. Use the date picker.`);
    if (offer.validFrom && offer.validTo && offer.validTo < offer.validFrom) {
      push('offers', 'offers', `“${offer.title}” ends before it starts. Please fix the dates.`);
    }
    if (offer.couponCode && !/^[A-Z0-9-]{3,32}$/.test(offer.couponCode)) {
      push('offers', 'offers', `Code “${offer.couponCode}” should be 3–32 capital letters, numbers or hyphens.`, 'warning');
    }
    if (offer.image && !isImageLikeUrl(offer.image)) push('offers', 'offers', `“${offer.title}” needs an image link, or leave it blank for template artwork.`);
  }

  for (const reel of [...config.reels, config.featuredVideo]) {
    if (!reel.title.trim()) push('reels', 'reels', 'Every video needs a title.');
    if (reel.sourceUrl && !isSafeHttpUrl(reel.sourceUrl)) push('reels', 'reels', `“${reel.title}” has a link we cannot open. Use a YouTube or Instagram link.`);
    if (reel.previewVideoUrl && !isSafeHttpUrl(reel.previewVideoUrl)) push('reels', 'reels', `“${reel.title}” has a video file link we cannot open.`);
  }

  for (const photo of config.gallery) {
    if (!photo.url) push('gallery', 'gallery', 'A gallery photo is missing its image. Please remove it or upload again.');
    if (photo.title && photo.title.length > 160) push('gallery', 'gallery', 'Photo description (alt text) should be under 160 characters.', 'warning');
  }
  for (const pair of config.beforeAfter) {
    if (!pair.before || !pair.after) push('gallery', 'beforeAfter', `“${pair.title || 'Before & after'}” needs both photos.`);
  }

  for (const member of config.team) {
    if (!member.name.trim()) push('team', 'team', 'Every artist needs a name.');
    if (!member.role.trim()) push('team', 'team', `Please add a role for ${member.name || 'this artist'}.`, 'warning');
    if (member.avatarUrl && !isImageLikeUrl(member.avatarUrl)) push('team', 'team', `“${member.name}” has a photo link we cannot open.`);
  }

  for (const review of config.reviews) {
    if (!review.name.trim()) push('voices', 'reviews', 'Every testimonial needs a client name.');
    if (!review.quote.trim()) push('voices', 'reviews', `Please add the quote for ${review.name || 'this client'}.`);
    if (review.rating < 1 || review.rating > 5) push('voices', 'reviews', 'Rating should be between 1 and 5 stars.');
  }
  for (const faq of config.faqs) {
    if (!faq.question.trim() || !faq.answer.trim()) push('voices', 'faqs', 'Every FAQ needs a question and an answer.');
  }

  if (config.contact.phone && !isIndianPhone(config.contact.phone)) {
    push('contact', 'phone', 'Please enter a valid Indian mobile number, for example +91 98290 55214.');
  }
  if (config.contact.whatsapp && !isIndianPhone(config.contact.whatsapp)) {
    push('contact', 'whatsapp', 'Please enter a valid Indian WhatsApp number, for example +91 98290 55214.');
  }
  if (config.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(config.contact.email)) {
    push('contact', 'email', 'Please enter a valid email address, for example hello@yoursalon.in.');
  }
  if (config.contact.mapLink && !isSafeHttpUrl(config.contact.mapLink)) push('contact', 'mapLink', 'Map link should start with https://.');
  if (!/^\d{2}:\d{2}$/.test(config.contact.openTime) || !/^\d{2}:\d{2}$/.test(config.contact.closeTime)) {
    push('contact', 'openTime', 'Opening hours should use the 24-hour format, for example 10:00 and 20:00.');
  }
  for (const [field, value] of [
    ['instagramHandle', config.contact.instagramHandle],
    ['facebookPage', config.contact.facebookPage],
    ['youtubeChannel', config.contact.youtubeChannel],
    ['googleBusinessUrl', config.contact.googleBusinessUrl],
  ] as const) {
    if (value && value.startsWith('http') && !isSafeHttpUrl(value)) push('contact', field, 'Social links should start with https://.');
  }

  if (config.booking.requireDeposit && (config.booking.depositPercentage < 1 || config.booking.depositPercentage > 100)) {
    push('booking', 'depositPercentage', 'Advance percentage should be between 1% and 100%.');
  }
  if (config.booking.currency !== 'INR') push('booking', 'currency', 'This template bills in Indian Rupees (₹) only.');
  if (config.booking.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]{2}$/.test(config.booking.gstin)) {
    push('booking', 'gstin', 'GSTIN should look like 08ABCDE1234F1Z5.', 'warning');
  }

  if (config.seo.metaTitle && config.seo.metaTitle.length > 70) {
    push('seo', 'metaTitle', 'Page title works best under 70 characters.', 'warning');
  }
  if (config.seo.metaDescription && config.seo.metaDescription.length > 200) {
    push('seo', 'metaDescription', 'Meta description works best under 200 characters.', 'warning');
  }
  if (config.seo.shareImageUrl && !isImageLikeUrl(config.seo.shareImageUrl)) push('seo', 'shareImageUrl', 'Share image should be an image link.');

  return issues;
}

export function blockingIssues(issues: CustomizerIssue[]): CustomizerIssue[] {
  return issues.filter((issue) => issue.severity === 'error');
}

/* ------------------------------------------------------------------ *
 * Versioned history (Undo / Redo)
 * ------------------------------------------------------------------ */

export interface ConfigHistory {
  past: ArchFlutterCustomizerConfig[];
  present: ArchFlutterCustomizerConfig;
  future: ArchFlutterCustomizerConfig[];
}

export const HISTORY_LIMIT = 40;

export function createHistory(config: ArchFlutterCustomizerConfig): ConfigHistory {
  return { past: [], present: config, future: [] };
}

/** Every history entry is a deep copy, so Undo always restores a real version. */
function clone(config: ArchFlutterCustomizerConfig): ArchFlutterCustomizerConfig {
  return JSON.parse(JSON.stringify(config)) as ArchFlutterCustomizerConfig;
}

export function pushHistory(history: ConfigHistory, next: ArchFlutterCustomizerConfig): ConfigHistory {
  if (JSON.stringify(history.present) === JSON.stringify(next)) return history;
  return {
    past: [...history.past, clone(history.present)].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
  };
}

export function undoHistory(history: ConfigHistory): ConfigHistory {
  if (!history.past.length) return history;
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [clone(history.present), ...history.future].slice(0, HISTORY_LIMIT),
  };
}

export function redoHistory(history: ConfigHistory): ConfigHistory {
  if (!history.future.length) return history;
  const [next, ...rest] = history.future;
  return { past: [...history.past, clone(history.present)].slice(-HISTORY_LIMIT), present: next, future: rest };
}

export function resetHistory(history: ConfigHistory, config: ArchFlutterCustomizerConfig): ConfigHistory {
  return { past: [...history.past, clone(history.present)].slice(-HISTORY_LIMIT), present: config, future: [] };
}

/* ------------------------------------------------------------------ *
 * Autosaved draft (site id + template id)
 * ------------------------------------------------------------------ */

export function customizerDraftKey(siteId: string, templateId = ARCH_FLUTTER_BUSINESS_TYPE): string {
  const site = sanitizeText(siteId, 80).replace(/\s+/g, '-') || 'unsaved-site';
  return `studioflow_arch_flutter_customizer_${site}_${templateId}_v${CUSTOMIZER_SCHEMA_VERSION}`;
}

export function saveCustomizerDraft(siteId: string, config: ArchFlutterCustomizerConfig): boolean {
  try {
    localStorage.setItem(customizerDraftKey(siteId), JSON.stringify({ savedAt: Date.now(), config }));
    return true;
  } catch {
    return false;
  }
}

export function loadCustomizerDraft(siteId: string): { savedAt: number; config: ArchFlutterCustomizerConfig } | null {
  try {
    const raw = localStorage.getItem(customizerDraftKey(siteId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.config || Number(parsed.config.version) !== CUSTOMIZER_SCHEMA_VERSION) return null;
    return { savedAt: Number(parsed.savedAt) || Date.now(), config: parsed.config as ArchFlutterCustomizerConfig };
  } catch {
    return null;
  }
}

export function clearCustomizerDraft(siteId: string): void {
  try {
    localStorage.removeItem(customizerDraftKey(siteId));
  } catch {
    /* storage disabled — the draft is simply not remembered */
  }
}

/* ------------------------------------------------------------------ *
 * Ownership (role check)
 * ------------------------------------------------------------------ */

export interface CustomizerAccess {
  allowed: boolean;
  reason: string;
}

/**
 * The customizer opens only for the signed-in owner of this site, and only on
 * the Arch & Flutter template. Everyone else gets a plain explanation.
 */
export function customizerAccess(input: {
  templateId?: string | null;
  sessionUserId?: string | null;
  siteOwnerId?: string | null;
}): CustomizerAccess {
  if (!isArchFlutterTemplate(input.templateId)) {
    return { allowed: false, reason: 'This customizer is only for the Arch & Flutter Lash & Brow Bar template.' };
  }
  if (!input.sessionUserId) {
    return { allowed: false, reason: 'Please sign in with the salon owner account to customise this website.' };
  }
  if (input.siteOwnerId && input.siteOwnerId !== input.sessionUserId) {
    return { allowed: false, reason: 'Only the owner of this salon website can change its design.' };
  }
  return { allowed: true, reason: '' };
}

/** Reads the owner of a published site so the drawer can double-check access. */
export async function fetchSiteOwner(slug: string): Promise<string | null> {
  const clean = sanitizeText(slug, 80);
  if (!clean) return null;
  try {
    const { data, error } = await supabase.from('studioflow_websites').select('owner_id').eq('slug', clean).maybeSingle();
    if (error) return null;
    return (data?.owner_id as string) || null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Images: crop presets, WebP compression, sample artwork
 * ------------------------------------------------------------------ */

export type ArchFlutterCropShape = 'arch' | 'square' | 'reel' | 'wide' | 'free';

export const CROP_PRESETS: Array<{ id: ArchFlutterCropShape; label: string; ratio: number | null; hint: string }> = [
  { id: 'arch', label: 'Arch', ratio: 3 / 4, hint: 'Portrait with an arch mask — hero, categories, team and offers.' },
  { id: 'square', label: 'Square', ratio: 1, hint: 'Square — gallery tiles and logos.' },
  { id: 'reel', label: 'Reel 9:16', ratio: 9 / 16, hint: 'Vertical — reel posters and the phone mockup.' },
  { id: 'wide', label: 'Wide 16:9', ratio: 16 / 9, hint: 'Landscape — banners and before/after pairs.' },
  { id: 'free', label: 'Free', ratio: null, hint: 'Keep the photo exactly as it is.' },
];

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImageFile(file?: File | null): string {
  if (!file) return 'Please choose an image file.';
  if (!ACCEPTED_UPLOAD_TYPES.includes(file.type)) return 'Please choose a JPG, PNG or WebP image.';
  if (file.size > MAX_UPLOAD_BYTES) return 'That image is larger than 8 MB. Please choose a smaller one.';
  if (!file.size) return 'That file looks empty. Please choose another image.';
  return '';
}

export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Centres a crop box of the given ratio inside the image. */
export function centerCrop(width: number, height: number, ratio: number | null): CropBox {
  if (!ratio || !width || !height) return { x: 0, y: 0, width, height };
  if (width / height > ratio) {
    const nextWidth = Math.round(height * ratio);
    return { x: Math.round((width - nextWidth) / 2), y: 0, width: nextWidth, height };
  }
  const nextHeight = Math.round(width / ratio);
  return { x: 0, y: Math.round((height - nextHeight) / 2), width, height: nextHeight };
}

export interface ProcessedImage {
  file: File;
  url: string;
  width: number;
  height: number;
  webp: boolean;
  sizeKb: number;
}

/**
 * Crops (when a ratio is given) and compresses to WebP with a JPEG/PNG
 * fallback for browsers that cannot encode WebP. Returns a real `File`, so the
 * existing `uploadSalonImage` storage path can be reused unchanged.
 */
export async function processImageFile(
  file: File,
  options: { ratio?: number | null; maxDimension?: number; quality?: number; crop?: CropBox | null } = {},
): Promise<ProcessedImage> {
  const { ratio = null, maxDimension = 1600, quality = 0.82, crop = null } = options;
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('That image could not be read. Please try another file.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('That image could not be opened. Please try another file.'));
    element.src = dataUrl;
  });

  const box = crop || centerCrop(image.naturalWidth, image.naturalHeight, ratio);
  let { width, height } = box;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not process that image.');
  context.drawImage(image, box.x, box.y, box.width, box.height, 0, 0, width, height);

  const toBlob = (type: string, qualityValue: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob((blob) => resolve(blob), type, qualityValue));

  let blob = await toBlob('image/webp', quality);
  let webp = Boolean(blob);
  if (!blob) {
    blob = await toBlob(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality);
    webp = false;
  }
  if (!blob) throw new Error('That image could not be compressed. Please try another file.');

  const extension = webp ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg';
  const name = `${(file.name || 'image').replace(/\.[^.]+$/, '')}-${width}x${height}.${extension}`;
  const processed = new File([blob], name, { type: blob.type, lastModified: Date.now() });
  return { file: processed, url: canvas.toDataURL(blob.type, quality), width, height, webp, sizeKb: Math.round((blob.size / 1024) * 10) / 10 };
}

/** Bundled artwork an owner can drop into any image slot ("Replace with sample image"). */
export const SAMPLE_IMAGES: Record<string, Array<{ label: string; url: string }>> = {
  hero: [
    { label: 'Lash close-up (arch)', url: ARCH_FLUTTER_IMAGES.hero.fallback },
    { label: 'Studio interior', url: ARCH_FLUTTER_IMAGES.about.fallback },
    { label: 'Brow lamination', url: ARCH_FLUTTER_ART.browLamination },
  ],
  categories: [
    { label: 'Classic lashes', url: ARCH_FLUTTER_ART.lash },
    { label: 'Volume lashes', url: ARCH_FLUTTER_ART.lashVolume },
    { label: 'Brow shaping', url: ARCH_FLUTTER_ART.brow },
    { label: 'Brow lamination', url: ARCH_FLUTTER_ART.browLamination },
    { label: 'Microblading', url: ARCH_FLUTTER_ART.microblading },
    { label: 'Lash lift & tint', url: ARCH_FLUTTER_ART.lashNatural },
    { label: 'PMU / eyeliner', url: ARCH_FLUTTER_ART.pmu },
    { label: 'Eye care', url: ARCH_FLUTTER_ART.eyeCare },
    { label: 'Bridal eye rituals', url: ARCH_FLUTTER_ART.bridal },
    { label: 'Packages', url: ARCH_FLUTTER_ART.package },
    { label: 'Sterilised tools', url: ARCH_FLUTTER_ART.tools },
    { label: 'Refill & removal', url: ARCH_FLUTTER_ART.refill },
  ],
  offers: [
    { label: 'Offer artwork', url: ARCH_FLUTTER_ART.offer },
    { label: 'Package artwork', url: ARCH_FLUTTER_ART.package },
    { label: 'Bridal artwork', url: ARCH_FLUTTER_ART.bridal },
    { label: 'Volume lashes', url: ARCH_FLUTTER_ART.lashVolume },
  ],
  gallery: [
    { label: 'Studio gallery', url: ARCH_FLUTTER_ART.gallery },
    { label: 'Before', url: ARCH_FLUTTER_ART.before },
    { label: 'After', url: ARCH_FLUTTER_ART.after },
    { label: 'Brow detail', url: ARCH_FLUTTER_ART.brow },
  ],
  team: [
    { label: 'Artist portrait', url: ARCH_FLUTTER_ART.team },
    { label: 'Studio interior', url: ARCH_FLUTTER_ART.studio },
  ],
  reels: [
    { label: 'Reel poster', url: ARCH_FLUTTER_ART.reel },
    { label: 'Lash application', url: ARCH_FLUTTER_ART.lash },
    { label: 'Aftercare', url: ARCH_FLUTTER_ART.eyeCare },
  ],
  logo: [
    { label: 'Arch & Flutter monogram', url: ARCH_FLUTTER_IMAGES.logoSvg },
    { label: 'Arch & Flutter favicon', url: ARCH_FLUTTER_IMAGES.faviconSvg },
  ],
  share: [
    { label: 'Template share card', url: ARCH_FLUTTER_IMAGES.ogImage },
    { label: 'Template preview', url: ARCH_FLUTTER_IMAGES.preview },
  ],
};

export function sampleImagesFor(slot: keyof typeof SAMPLE_IMAGES | string): Array<{ label: string; url: string }> {
  return SAMPLE_IMAGES[slot] || SAMPLE_IMAGES.gallery;
}

/* ------------------------------------------------------------------ *
 * Small helpers used by the drawer
 * ------------------------------------------------------------------ */

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Reorders sections and rewrites their `order` values to match. */
export function reorderSections(sections: ArchFlutterSectionState[], from: number, to: number): ArchFlutterSectionState[] {
  return moveItem(sections, from, to).map((section, index) => ({ ...section, order: index }));
}
