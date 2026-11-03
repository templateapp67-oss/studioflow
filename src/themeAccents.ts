import { BusinessTypeId } from './types';

export type AccentPaletteKey = 
  | 'crimson'
  | 'mahogany'
  | 'emerald'
  | 'slate'
  | 'purple'
  | 'rose'
  | 'ocean'
  | 'obsidian';

export interface ThemeAccentConfig {
  key: AccentPaletteKey;
  name: string;
  categoryHint: string;
  primaryHex: string;
  secondaryHex: string;
  badgeBg: string;
  badgeText: string;
  buttonBg: string;
  buttonHoverBg: string;
  buttonText: string;
  textAccent: string;
  borderAccent: string;
  lightBg: string;
  ringColor: string;
}

export const ACCENT_PALETTES: Record<AccentPaletteKey, ThemeAccentConfig> = {
  crimson: {
    key: 'crimson',
    name: 'Royal Crimson',
    categoryHint: 'Bridal & Makeover',
    primaryHex: '#9f1239',
    secondaryHex: '#e11d48',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-900',
    buttonBg: 'bg-rose-800',
    buttonHoverBg: 'hover:bg-rose-900',
    buttonText: 'text-white',
    textAccent: 'text-rose-800',
    borderAccent: 'border-rose-300',
    lightBg: 'bg-rose-50',
    ringColor: 'focus:ring-rose-800'
  },
  mahogany: {
    key: 'mahogany',
    name: 'Vintage Mahogany',
    categoryHint: "Barber & Men's Grooming",
    primaryHex: '#78350f',
    secondaryHex: '#b45309',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-950',
    buttonBg: 'bg-amber-900',
    buttonHoverBg: 'hover:bg-amber-950',
    buttonText: 'text-amber-50',
    textAccent: 'text-amber-900',
    borderAccent: 'border-amber-300',
    lightBg: 'bg-amber-50',
    ringColor: 'focus:ring-amber-900'
  },
  emerald: {
    key: 'emerald',
    name: 'Botanical Emerald',
    categoryHint: 'Spa, Wellness & Ayurvedic',
    primaryHex: '#065f46',
    secondaryHex: '#059669',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-950',
    buttonBg: 'bg-emerald-800',
    buttonHoverBg: 'hover:bg-emerald-900',
    buttonText: 'text-white',
    textAccent: 'text-emerald-800',
    borderAccent: 'border-emerald-300',
    lightBg: 'bg-emerald-50',
    ringColor: 'focus:ring-emerald-800'
  },
  slate: {
    key: 'slate',
    name: 'Minimalist Slate',
    categoryHint: 'Hair Studio & Modern Unisex',
    primaryHex: '#0f172a',
    secondaryHex: '#334155',
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-900',
    buttonBg: 'bg-slate-900',
    buttonHoverBg: 'hover:bg-slate-800',
    buttonText: 'text-white',
    textAccent: 'text-slate-900',
    borderAccent: 'border-slate-300',
    lightBg: 'bg-slate-100',
    ringColor: 'focus:ring-slate-900'
  },
  purple: {
    key: 'purple',
    name: 'Glamour Orchid',
    categoryHint: 'Nail Studio & Lash Bar',
    primaryHex: '#7e22ce',
    secondaryHex: '#a855f7',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-950 font-bold',
    buttonBg: 'bg-purple-700',
    buttonHoverBg: 'hover:bg-purple-800',
    buttonText: 'text-white font-bold',
    textAccent: 'text-purple-900 font-extrabold',
    borderAccent: 'border-purple-300',
    lightBg: 'bg-purple-50',
    ringColor: 'focus:ring-purple-700'
  },
  rose: {
    key: 'rose',
    name: 'Rose Gold & Blush',
    categoryHint: 'Beauty Parlour & Glow',
    primaryHex: '#be185d',
    secondaryHex: '#f43f5e',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-950 font-bold',
    buttonBg: 'bg-rose-800',
    buttonHoverBg: 'hover:bg-rose-900',
    buttonText: 'text-white font-bold',
    textAccent: 'text-rose-900 font-extrabold',
    borderAccent: 'border-rose-300',
    lightBg: 'bg-rose-50',
    ringColor: 'focus:ring-rose-800'
  },
  ocean: {
    key: 'ocean',
    name: 'Clinical Ocean',
    categoryHint: 'Skincare & Dermatology',
    primaryHex: '#0369a1',
    secondaryHex: '#0284c7',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-950',
    buttonBg: 'bg-sky-700',
    buttonHoverBg: 'hover:bg-sky-800',
    buttonText: 'text-white',
    textAccent: 'text-sky-700',
    borderAccent: 'border-sky-300',
    lightBg: 'bg-sky-50',
    ringColor: 'focus:ring-sky-700'
  },
  obsidian: {
    key: 'obsidian',
    name: 'Obsidian & Gold',
    categoryHint: 'Tattoo Studio & Dark Luxury',
    primaryHex: '#18181b',
    secondaryHex: '#f59e0b',
    badgeBg: 'bg-amber-400/20',
    badgeText: 'text-amber-300',
    buttonBg: 'bg-amber-400',
    buttonHoverBg: 'hover:bg-amber-300',
    buttonText: 'text-zinc-950',
    textAccent: 'text-amber-400',
    borderAccent: 'border-amber-400/40',
    lightBg: 'bg-zinc-900',
    ringColor: 'focus:ring-amber-400'
  }
};

export const DEFAULT_CATEGORY_ACCENTS: Record<BusinessTypeId, AccentPaletteKey> = {
  hair_salon: 'slate',
  barber: 'mahogany',
  unisex_salon: 'slate',
  beauty_parlour: 'rose',
  nail_studio: 'rose',
  hair_spa: 'emerald',
  skincare_clinic: 'ocean',
  makeup_studio: 'crimson',
  massage_wellness: 'emerald',
  hair_coloring: 'purple',
  bridal_lounge: 'crimson',
  tattoo_studio: 'obsidian',
  lash_brow: 'rose',
  ayurvedic_spa: 'emerald',
  mens_hair_studio: 'emerald'
};

/**
 * Calculates relative luminance of a HEX color string (WCAG 2.x standard)
 */
export function getLuminance(hex: string): number {
  if (!hex) return 0;
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (cleanHex.length !== 6) return 0;

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const calR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const calG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const calB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * calR + 0.7152 * calG + 0.0722 * calB;
}

/**
 * Picks the label colour for a filled button whose background is `hex`.
 *
 * This previously switched on a fixed luminance threshold of 0.45, which is far
 * too high: the crossover where white and charcoal (#1e293b) score equally is
 * around L = 0.18. Any accent between the two — the barber template's tan
 * #c49a6c (L = 0.36), a mid gold like #c9a96e (L = 0.42) — was handed white
 * text at ~2.3–2.6:1 instead of charcoal at 5.7–8.8:1. Comparing the two real
 * contrast ratios removes the magic number and stays correct for every accent
 * an owner can pick.
 */
export function getContrastTextColor(hex: string): '#ffffff' | '#1e293b' {
  const rgb = hexToRgbTuple(hex);
  if (!rgb) return '#ffffff';
  const onWhite = contrastAgainst(rgb, [255, 255, 255]);
  const onCharcoal = contrastAgainst(rgb, [30, 41, 59]);
  return onCharcoal > onWhite ? '#1e293b' : '#ffffff';
}

/** Parses #rgb / #rrggbb / #rrggbbaa into an sRGB tuple. */
function hexToRgbTuple(hex: string): [number, number, number] | null {
  if (!hex) return null;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3 || clean.length === 4) clean = clean.split('').map((c) => c + c).join('');
  if (clean.length !== 6 && clean.length !== 8) return null;
  const value = parseInt(clean.slice(0, 6), 16);
  if (Number.isNaN(value)) return null;
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** WCAG 2.x contrast ratio between two sRGB tuples. */
function contrastAgainst(a: [number, number, number], b: [number, number, number]): number {
  const la = getLuminance(rgbToHex(a));
  const lb = getLuminance(rgbToHex(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

/**
 * Updates the primary accent CSS variable across the document root
 * and all templates using var(--primary-accent) or var(--theme-primary).
 * Automatically calculates relative luminance and updates dynamic text contrast variables.
 */
export function accentInkOnLight(hex:string){
  return (1.05/(getLuminance(hex)+0.05))>=4.5?hex:'#1e293b';
}

export function applyPrimaryAccentCssVar(primaryHex: string, secondaryHex?: string, targetDocument?: Document) {
  const root = targetDocument?.documentElement ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (root) {
    const luminance = getLuminance(primaryHex);
    const contrastColor = getContrastTextColor(primaryHex);

    root.style.setProperty('--primary-accent', primaryHex);
    root.style.setProperty('--theme-primary', primaryHex);
    root.style.setProperty('--color-primary', primaryHex);
    root.style.setProperty('--accent-ink-on-light', accentInkOnLight(primaryHex));

    // Dynamic contrast & luminance CSS variables
    root.style.setProperty('--accent-luminance', luminance.toFixed(4));
    root.style.setProperty('--accent-text-color', contrastColor);
    root.style.setProperty('--accent-contrast-text', contrastColor);
    root.style.setProperty('--color-on-primary', contrastColor);
    root.style.setProperty('--theme-on-accent', contrastColor);

    if (secondaryHex) {
      root.style.setProperty('--theme-secondary', secondaryHex);
      const secContrast = getContrastTextColor(secondaryHex);
      root.style.setProperty('--theme-on-secondary', secContrast);
    }
  }
}

