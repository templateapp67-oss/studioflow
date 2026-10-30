/**
 * Template 13 ("Arch & Flutter") theme + section primitives.
 *
 * A leaf module: it imports types only, so both `archFlutter.ts` (the resolver
 * the storefront uses) and `archFlutterCustomizer.ts` (the owner's customizer
 * drawer) can share it without creating an import cycle.
 */
import type { ArchFlutterFonts, ArchFlutterSectionId, ArchFlutterSectionState } from '../types';

/** Strips markup from an owner-typed label. */
function cleanLabel(value: unknown, maxLength = 60): string {
  const raw = typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
  return raw
    .replace(/<\s*\/?\s*(script|style|iframe|object|embed|link|meta)[^>]*>/gi, ' ')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/* ------------------------------------------------------------------ *
 * Sections
 * ------------------------------------------------------------------ */

export interface ArchFlutterSectionSpec {
  id: ArchFlutterSectionId;
  /** Default on-page heading, used when the owner has not renamed the block. */
  defaultLabel: string;
  /** Name shown in the customizer's Sections tab. */
  panelLabel: string;
  /** Structural blocks always render; the owner can only move them. */
  locked: boolean;
  /** Heading config key so a rename writes back into the existing schema. */
  headingKey?:
    | 'categoriesHeading'
    | 'servicesHeading'
    | 'aboutHeading'
    | 'resultsHeading'
    | 'reelsHeading'
    | 'packagesHeading'
    | 'teamHeading'
    | 'reviewsHeading'
    | 'galleryHeading'
    | 'offersHeading'
    | 'journalHeading'
    | 'faqsHeading'
    | 'contactHeading'
    | 'bookingHeading';
}

export const ARCH_FLUTTER_SECTIONS: ArchFlutterSectionSpec[] = [
  { id: 'hero', defaultLabel: 'Hero', panelLabel: 'Hero banner', locked: true },
  { id: 'trust', defaultLabel: 'Trust ribbon', panelLabel: 'Trust ribbon', locked: true },
  { id: 'promo', defaultLabel: 'Owner promotion', panelLabel: 'Owner promotion strip', locked: true },
  { id: 'categories', defaultLabel: 'The menu', panelLabel: 'Categories', locked: false, headingKey: 'categoriesHeading' },
  { id: 'services', defaultLabel: 'Signature services', panelLabel: 'Services', locked: false, headingKey: 'servicesHeading' },
  { id: 'about', defaultLabel: 'Our story', panelLabel: 'About', locked: false, headingKey: 'aboutHeading' },
  { id: 'beforeAfter', defaultLabel: 'Before & after', panelLabel: 'Before & after', locked: true, headingKey: 'resultsHeading' },
  { id: 'reels', defaultLabel: 'Featured videos & reels', panelLabel: 'Featured videos & reels', locked: false, headingKey: 'reelsHeading' },
  { id: 'packages', defaultLabel: 'Packages', panelLabel: 'Packages & memberships', locked: true, headingKey: 'packagesHeading' },
  { id: 'team', defaultLabel: 'The artists', panelLabel: 'Team', locked: false, headingKey: 'teamHeading' },
  { id: 'testimonials', defaultLabel: 'Client love', panelLabel: 'Testimonials', locked: false, headingKey: 'reviewsHeading' },
  { id: 'gallery', defaultLabel: 'From the studio', panelLabel: 'Gallery', locked: false, headingKey: 'galleryHeading' },
  { id: 'offers', defaultLabel: 'This season at the bar', panelLabel: 'Offers teaser', locked: false, headingKey: 'offersHeading' },
  { id: 'journal', defaultLabel: 'Aftercare journal', panelLabel: 'Journal teaser', locked: false, headingKey: 'journalHeading' },
  { id: 'faq', defaultLabel: 'Good to know', panelLabel: 'FAQ', locked: false, headingKey: 'faqsHeading' },
  { id: 'contact', defaultLabel: 'Visit the bar', panelLabel: 'Contact & booking banner', locked: false, headingKey: 'bookingHeading' },
  { id: 'closing', defaultLabel: 'Closing sections', panelLabel: 'Customer app strip', locked: true },
];

const SECTION_BY_ID = new Map(ARCH_FLUTTER_SECTIONS.map((section) => [section.id, section]));

/** The template spec for one section id (labels, lock state, heading key). */
export function archFlutterSectionSpec(id: ArchFlutterSectionId): ArchFlutterSectionSpec | undefined {
  return SECTION_BY_ID.get(id);
}

export function fontPairById(id: string): ArchFlutterFontPair {
  return ARCH_FLUTTER_FONT_PAIRS.find((pair) => pair.id === id) || ARCH_FLUTTER_FONT_PAIRS[0];
}

/** The section list a brand-new Template 13 site ships with. */
export function defaultArchFlutterSections(): ArchFlutterSectionState[] {
  return ARCH_FLUTTER_SECTIONS.map((section, index) => ({
    id: section.id,
    label: '',
    visible: true,
    order: index,
    locked: section.locked,
  }));
}

/** Fills gaps, drops unknown ids and keeps locked blocks visible. */
export function normalizeArchFlutterSections(saved?: ArchFlutterSectionState[] | null): ArchFlutterSectionState[] {
  const base = defaultArchFlutterSections();
  if (!Array.isArray(saved) || !saved.length) return base;
  const known = new Map<string, ArchFlutterSectionState>();
  for (const entry of saved) {
    if (!entry || typeof entry !== 'object') continue;
    const spec = SECTION_BY_ID.get(entry.id as ArchFlutterSectionId);
    if (!spec) continue;
    known.set(spec.id, {
      id: spec.id,
      label: cleanLabel(entry.label, 60),
      visible: spec.locked ? true : entry.visible !== false,
      order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : base.findIndex((item) => item.id === spec.id),
      locked: spec.locked,
    });
  }
  // Anything the owner never saw keeps its template position.
  for (const entry of base) if (!known.has(entry.id)) known.set(entry.id, { ...entry, order: entry.order + saved.length });
  return [...known.values()].sort((a, b) => a.order - b.order || ARCH_FLUTTER_SECTIONS.findIndex((s) => s.id === a.id) - ARCH_FLUTTER_SECTIONS.findIndex((s) => s.id === b.id));
}

/** Owner rename wins; otherwise the resolved template heading is used. */
export function archFlutterSectionHeading(
  sections: ArchFlutterSectionState[],
  id: ArchFlutterSectionId,
  fallback: string,
): string {
  const entry = sections.find((section) => section.id === id);
  const label = (entry?.label || '').trim();
  return label || fallback;
}

export function visibleArchFlutterSections(sections: ArchFlutterSectionState[]): ArchFlutterSectionState[] {
  return sections.filter((section) => section.visible !== false).sort((a, b) => a.order - b.order);
}

/* ------------------------------------------------------------------ *
 * Fonts, radius and glass blur
 * ------------------------------------------------------------------ */

export interface ArchFlutterFontPair {
  id: string;
  label: string;
  note: string;
  heading: string;
  body: string;
}

/** Curated pairs built only from families the app already loads. */
export const ARCH_FLUTTER_FONT_PAIRS: ArchFlutterFontPair[] = [
  {
    id: 'editorial',
    label: 'Cormorant Garamond + Inter',
    note: 'The template default: tall serif headings, quiet sans body.',
    heading: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
    body: "'Inter', 'Hanken Grotesk', system-ui, sans-serif",
  },
  {
    id: 'playfair',
    label: 'Playfair Display + Hanken Grotesk',
    note: 'Sharper serif with a slightly warmer body face.',
    heading: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
    body: "'Hanken Grotesk', 'Inter', system-ui, sans-serif",
  },
  {
    id: 'modern',
    label: 'Syne + Manrope',
    note: 'Contemporary, fashion-magazine feel. Less traditional.',
    heading: "'Syne', 'Hanken Grotesk', system-ui, sans-serif",
    body: "'Manrope', 'Inter', system-ui, sans-serif",
  },
  {
    id: 'soft',
    label: 'Cormorant Garamond + Manrope',
    note: 'Serif headings with a rounder, softer body.',
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'Manrope', 'Inter', system-ui, sans-serif",
  },
  {
    id: 'grotesk',
    label: 'Hanken Grotesk + Inter',
    note: 'All-sans, gallery-label look. Very easy to read on mobile.',
    heading: "'Hanken Grotesk', 'Inter', system-ui, sans-serif",
    body: "'Inter', 'Hanken Grotesk', system-ui, sans-serif",
  },
];

export const DEFAULT_ARCH_FLUTTER_FONTS: ArchFlutterFonts = {
  heading: ARCH_FLUTTER_FONT_PAIRS[0].heading,
  body: ARCH_FLUTTER_FONT_PAIRS[0].body,
};

export const ARCH_FLUTTER_RADIUS_STEPS = [8, 14, 18, 22, 28, 36] as const;
export const ARCH_FLUTTER_BLUR_STEPS = [6, 10, 14, 18, 24] as const;
export const DEFAULT_CORNER_RADIUS = 22;
export const DEFAULT_GLASS_BLUR = 18;

export function clampRadius(value: unknown): number {
  const next = Number(value);
  if (!Number.isFinite(next)) return DEFAULT_CORNER_RADIUS;
  return Math.min(48, Math.max(0, Math.round(next)));
}

export function clampBlur(value: unknown): number {
  const next = Number(value);
  if (!Number.isFinite(next)) return DEFAULT_GLASS_BLUR;
  return Math.min(40, Math.max(0, Math.round(next)));
}

/** CSS custom properties the site root applies for fonts, radius and blur. */
export function archFlutterStyleVariables(config: {
  fonts?: ArchFlutterFonts;
  cornerRadius?: number;
  glassBlur?: number;
}): Record<string, string> {
  return {
    '--af-serif': config.fonts?.heading || DEFAULT_ARCH_FLUTTER_FONTS.heading,
    '--af-sans': config.fonts?.body || DEFAULT_ARCH_FLUTTER_FONTS.body,
    '--af-radius': `${clampRadius(config.cornerRadius ?? DEFAULT_CORNER_RADIUS)}px`,
    '--af-arch': `999px 999px ${Math.max(8, Math.round(clampRadius(config.cornerRadius ?? DEFAULT_CORNER_RADIUS) * 0.8))}px ${Math.max(8, Math.round(clampRadius(config.cornerRadius ?? DEFAULT_CORNER_RADIUS) * 0.8))}px`,
    '--af-blur': `${clampBlur(config.glassBlur ?? DEFAULT_GLASS_BLUR)}px`,
  };
}

