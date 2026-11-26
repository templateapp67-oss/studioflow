/**
 * WCAG 2.x contrast primitives.
 *
 * Shared by the offline accessibility regression suite so the numbers it
 * asserts are produced by exactly the formula axe-core uses:
 *
 *   L = 0.2126·R + 0.7152·G + 0.0722·B   (linearised sRGB)
 *   ratio = (Llighter + 0.05) / (Ldarker + 0.05)
 *
 * axe-core passes a check only when `ratio > expected` (strictly greater), so
 * `meetsWcagAA` uses the same strict comparison — a pair that lands on exactly
 * 4.5 is reported as a failure by the scanner.
 *
 * This module is pure and dependency-free; it is safe to import anywhere.
 */

export const WCAG_AA_NORMAL_TEXT = 4.5;
export const WCAG_AA_LARGE_TEXT = 3;

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  /** 0–1 */
  a: number;
}

const NAMED: Record<string, string> = {
  transparent: '#00000000',
  white: '#ffffff',
  black: '#000000',
  currentcolor: '',
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Parses the colour notations that appear in NEXORA class names and inline styles. */
export function parseColor(input: string): RgbaColor | null {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return null;
  const value = raw in NAMED ? NAMED[raw] : raw;
  if (!value) return null;

  if (value.startsWith('#')) {
    const hex = value.slice(1);
    if (![3, 4, 6, 8].includes(hex.length) || /[^0-9a-f]/.test(hex)) return null;
    const full = hex.length <= 4 ? hex.split('').map((char) => char + char).join('') : hex;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1,
    };
  }

  const rgb = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[,/\s]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const channel = (part: string) => (part.endsWith('%') ? (parseFloat(part) / 100) * 255 : parseFloat(part));
    const [r, g, b] = parts.slice(0, 3).map(channel);
    if ([r, g, b].some((channelValue) => Number.isNaN(channelValue))) return null;
    const alpha = parts[3] === undefined ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    return {
      r: clamp(r, 0, 255),
      g: clamp(g, 0, 255),
      b: clamp(b, 0, 255),
      a: clamp(Number.isNaN(alpha) ? 1 : alpha, 0, 1),
    };
  }

  return null;
}

export function toHex(color: RgbaColor): string {
  const channel = (value: number) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0');
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

/** Source-over alpha compositing of a possibly translucent colour on a backdrop. */
export function compositeOver(foreground: RgbaColor, backdrop: RgbaColor): RgbaColor {
  const alpha = foreground.a + backdrop.a * (1 - foreground.a);
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (front: number, back: number) =>
    (front * foreground.a + back * backdrop.a * (1 - foreground.a)) / alpha;
  return {
    r: mix(foreground.r, backdrop.r),
    g: mix(foreground.g, backdrop.g),
    b: mix(foreground.b, backdrop.b),
    a: alpha,
  };
}

export function relativeLuminance(color: RgbaColor): number {
  const linear = (channel: number) => {
    const c = clamp(channel, 0, 255) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

/** Contrast ratio between two colours; translucent foregrounds are flattened first. */
export function contrastRatio(foreground: string | RgbaColor, background: string | RgbaColor): number {
  const fg = typeof foreground === 'string' ? parseColor(foreground) : foreground;
  const bg = typeof background === 'string' ? parseColor(background) : background;
  if (!fg || !bg) return 0;
  const flattened = fg.a < 1 ? compositeOver(fg, bg) : fg;
  const a = relativeLuminance(flattened);
  const b = relativeLuminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Mirrors axe-core: the ratio must be strictly greater than the threshold. */
export function meetsWcagAA(
  foreground: string | RgbaColor,
  background: string | RgbaColor,
  { large = false }: { large?: boolean } = {},
): boolean {
  return contrastRatio(foreground, background) > (large ? WCAG_AA_LARGE_TEXT : WCAG_AA_NORMAL_TEXT);
}
