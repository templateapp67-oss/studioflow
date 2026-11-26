import React from 'react';
import {
  Scissors,
  Sparkles,
  Hand,
  Users,
  UserRound,
  Droplets,
  Stethoscope,
  Paintbrush,
  Gem,
  Palette,
  Flower2,
  PenTool,
  Eye,
  Leaf,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import { NEXORA_BRAND, NEXORA_BRAND_MARK, NEXORA_BRAND_TAGLINE, nexoraTemplateMeta } from '../../lib/nexoraTemplateCatalogue';

const ICONS: Record<string, LucideIcon> = {
  Scissors,
  Sparkles,
  Hand,
  Users,
  UserRound,
  Droplets,
  Stethoscope,
  Paintbrush,
  Gem,
  Palette,
  Flower2,
  PenTool,
  Eye,
  Leaf,
  LayoutGrid,
};

/** Resolves a category icon name to a Lucide component, defaulting to scissors. */
export function categoryIconComponent(name?: string): LucideIcon {
  return (name && ICONS[name]) || Scissors;
}

/**
 * Small square NEXORA mark — used on every template preview card.
 *
 * The mark uses a solid brand purple, not a gradient: axe-core cannot resolve a
 * background gradient behind text, so every mark was reported as an
 * indeterminate SC 1.4.3 finding. `#F5E9D6` on `#3E2A63` measures 10.2:1.
 */
export const NexoraBrandMark: React.FC<{ size?: 'xs' | 'sm' | 'md'; className?: string }> = ({ size = 'xs', className = '' }) => {
  const box = size === 'md' ? 'h-9 w-9 text-sm' : size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-5 w-5 text-[9px]';
  return (
    <span
      aria-hidden="true"
      data-nexora-brand-mark
      className={`inline-flex shrink-0 items-center justify-center rounded-[7px] bg-[#3E2A63] font-black tracking-tight text-[#F5E9D6] shadow-[0_1px_6px_rgba(42,30,74,0.35)] ring-1 ring-[#C9A66B]/50 ${box} ${className}`}
      style={{ fontFamily: 'Manrope, Inter, sans-serif' }}
    >
      {NEXORA_BRAND_MARK}
    </span>
  );
};

/**
 * The NEXORA lockup: monogram mark + wordmark.
 * One spelling, one logo, one placement rule — every template surface uses it.
 */
export const NexoraLogo: React.FC<{ tone?: 'light' | 'dark'; size?: 'sm' | 'md' | 'lg'; withTagline?: boolean; className?: string }> = ({
  tone = 'light',
  size = 'md',
  withTagline = false,
  className = '',
}) => {
  const title = size === 'lg' ? 'text-2xl sm:text-3xl' : size === 'sm' ? 'text-base' : 'text-xl';
  const markSize = size === 'lg' ? 'h-11 w-11 text-lg' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm';
  const word = tone === 'dark' ? 'text-white' : 'text-[#1B1630]';
  const sub = tone === 'dark' ? 'text-[#C9A66B]' : 'text-[#6B5E7A]';
  return (
    <div className={`flex items-center gap-3 ${className}`} data-nexora-logo>
      <span
        aria-hidden="true"
        className={`inline-flex items-center justify-center rounded-xl bg-[#3E2A63] font-black text-[#F5E9D6] shadow-lg shadow-[#2A1E4A]/25 ring-1 ring-[#C9A66B]/60 ${markSize}`}
        style={{ fontFamily: 'Manrope, Inter, sans-serif' }}
      >
        {NEXORA_BRAND_MARK}
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={`font-black uppercase tracking-[0.22em] ${title} ${word}`}
          style={{ fontFamily: 'Manrope, Inter, sans-serif' }}
        >
          {NEXORA_BRAND}
        </span>
        <span className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${sub}`}>
          {withTagline ? NEXORA_BRAND_TAGLINE : 'Template Library'}
        </span>
      </span>
    </div>
  );
};

/** Category icon tile with the category's own colour identity. */
export const CategoryIconTile: React.FC<{ icon: string; color: string; tint: string; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  icon,
  color,
  tint,
  size = 'md',
  className = '',
}) => {
  const Icon = categoryIconComponent(icon);
  const box = size === 'lg' ? 'h-12 w-12' : size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const glyph = size === 'lg' ? 22 : size === 'sm' ? 13 : 16;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-xl ${box} ${className}`}
      style={{ backgroundColor: tint, color, boxShadow: `inset 0 0 0 1px ${color}22` }}
    >
      <Icon size={glyph} strokeWidth={2.1} />
    </span>
  );
};

/**
 * NEXORA display name for a template id.
 * Safe to import from anywhere — it never drags the template registry in.
 */
export function nexoraName(templateId: string, fallback = ''): string {
  return nexoraTemplateMeta(templateId)?.displayName || fallback;
}

/** Category label for a template id ("Haircut Studio", "Barber Shop", …). */
export function nexoraCategoryLabel(templateId: string, fallback = ''): string {
  return nexoraTemplateMeta(templateId)?.categoryName || fallback;
}
