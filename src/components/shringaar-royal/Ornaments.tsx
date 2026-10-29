import React from 'react';

/**
 * Template 11 ornaments — hand-drawn SVG flourishes for the Shringaar Royal
 * theme: Rajasthani jaali lattice, jharokha arch corners, floral corner
 * ornaments, paisley dividers and a lotus mandala logo mark.
 *
 * Everything is pure inline SVG (no image requests), aria-hidden by default,
 * and inherits `currentColor` so section colours stay themeable.
 */

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.1, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** Small paisley + diamond rule used under eyebrows and inside cards. */
export function GoldRule({ width = 120, className = '' }: { width?: number; className?: string }) {
  return (
    <svg className={className} width={width} height="14" viewBox="0 0 120 14" aria-hidden="true" focusable="false">
      <path d="M2 7h34" {...stroke} />
      <path d="M84 7h34" {...stroke} />
      <path d="M44 7c4-6 12-6 16 0-4 6-12 6-16 0Z" {...stroke} />
      <path d="M76 7c-4-6-12-6-16 0 4 6 12 6 16 0Z" {...stroke} />
      <circle cx="60" cy="7" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Full-width jaali (lattice) strip for footers and section breaks. */
export function JaaliStrip({ className = '', height = 26 }: { className?: string; height?: number }) {
  return (
    <svg
      className={className}
      width="100%"
      height={height}
      viewBox="0 0 240 26"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id="sr-jaali-pattern" width="30" height="26" patternUnits="userSpaceOnUse">
          <path d="M15 1 29 13 15 25 1 13Z" {...stroke} strokeWidth={0.9} />
          <path d="M15 6.5 23.5 13 15 19.5 6.5 13Z" {...stroke} strokeWidth={0.7} />
          <circle cx="15" cy="13" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="0" cy="13" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="30" cy="13" r="1.1" fill="currentColor" stroke="none" />
        </pattern>
      </defs>
      <rect width="240" height="26" fill="url(#sr-jaali-pattern)" />
    </svg>
  );
}

/** Floral corner ornament (rotated for each corner by the caller). */
export function CornerFloral({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 132 132" aria-hidden="true" focusable="false">
      <path d="M4 128c0-44 26-84 74-98" {...stroke} strokeWidth={1.2} />
      <path d="M4 100c14-2 26-10 34-22" {...stroke} />
      <path d="M10 74c16 2 30-4 42-16" {...stroke} />
      <path d="M32 96c-2-10-1-20 4-29 7 7 10 16 10 26-5 2-10 3-14 3Z" {...stroke} />
      <path d="M54 62c-8-2-15-7-20-14 10-1 19 2 26 9-2 2-4 4-6 5Z" {...stroke} />
      <path d="M78 40c-4-7-5-15-3-22 6 6 9 14 9 22-2 0-4 0-6 0Z" {...stroke} />
      <path d="M20 118c-6-4-10-10-12-17 8 2 14 7 18 14-2 1-4 2-6 3Z" {...stroke} />
      <circle cx="4" cy="128" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="86" cy="28" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Diamond-motif divider used between editorial blocks. */
export function DiamondDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`sr-rule ${className}`} aria-hidden="true">
      <GoldRule width={74} />
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M8 1 15 8 8 15 1 8Z" {...stroke} />
        <path d="M8 4.6 11.4 8 8 11.4 4.6 8Z" fill="currentColor" stroke="none" opacity="0.55" />
      </svg>
      <GoldRule width={74} />
    </div>
  );
}

/** Lotus mandala mark used when the owner has not uploaded a logo. */
export function LotusMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M16 3c3.6 3.2 5.4 7 5.4 11.2 0 3.4-1.8 6.4-5.4 9-3.6-2.6-5.4-5.6-5.4-9C10.6 10 12.4 6.2 16 3Z" fill="currentColor" opacity="0.9" />
      <path d="M4.6 12.4c4.4.4 7.8 2.2 10 5.4 1.8 2.6 2.4 5.6 1.8 9-4.6-.6-8-2.4-10.2-5.6-1.8-2.8-2.4-5.8-1.6-8.8Z" fill="currentColor" opacity="0.55" />
      <path d="M27.4 12.4c.8 3-.2 6-2 8.8-2.2 3.2-5.6 5-10.2 5.6-.6-3.4 0-6.4 1.8-9 2.2-3.2 5.6-5 10.4-5.4Z" fill="currentColor" opacity="0.55" />
      <circle cx="16" cy="14.6" r="2.4" fill="#5A0F1E" opacity="0.55" />
    </svg>
  );
}

/** Ornamental top border for the footer (full-bleed, tiles horizontally). */
export function FooterOrnament({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="100%" height="34" viewBox="0 0 240 34" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="sr-footer-ornament" width="40" height="34" patternUnits="userSpaceOnUse">
          <path d="M0 30h40" {...stroke} strokeWidth={0.8} opacity="0.6" />
          <path d="M20 27c-7 0-12-5-12-11 7 0 12 5 12 11Z" {...stroke} strokeWidth={0.9} />
          <path d="M20 27c7 0 12-5 12-11-7 0-12 5-12 11Z" {...stroke} strokeWidth={0.9} />
          <path d="M20 27V9" {...stroke} strokeWidth={0.8} />
          <circle cx="20" cy="6" r="2.2" fill="currentColor" stroke="none" />
          <circle cx="0" cy="27" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="40" cy="27" r="1.4" fill="currentColor" stroke="none" />
        </pattern>
      </defs>
      <rect width="240" height="34" fill="url(#sr-footer-ornament)" />
    </svg>
  );
}

/** Decorative arch outline behind hero copy (pure ornament). */
export function ArchOutline({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 400" aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
      <path d="M150 10c78 0 140 62 140 140v240H10V150C10 72 72 10 150 10Z" {...stroke} strokeWidth={0.9} opacity="0.5" />
      <path d="M150 30c66 0 120 54 120 120v220H30V150C30 84 84 30 150 30Z" {...stroke} strokeWidth={0.7} opacity="0.3" />
      <path d="M150 10v30M10 150h20M280 150h10" {...stroke} strokeWidth={0.7} opacity="0.4" />
    </svg>
  );
}

/** Small divider with a lotus + two paisleys — used in the hero and CTA areas. */
export function LotusDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`sr-rule ${className}`} aria-hidden="true">
      <GoldRule width={64} />
      <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true" focusable="false">
        <path d="M13 2c2.6 2.4 3.9 5 3.9 7.8 0 2.4-1.3 4.5-3.9 6.2-2.6-1.7-3.9-3.8-3.9-6.2C9.1 7 10.4 4.4 13 2Z" {...stroke} />
        <path d="M2 6.4c3.2.2 5.7 1.6 7.3 3.9" {...stroke} strokeWidth={0.8} />
        <path d="M24 6.4c-3.2.2-5.7 1.6-7.3 3.9" {...stroke} strokeWidth={0.8} />
        <circle cx="13" cy="10" r="1.5" fill="currentColor" stroke="none" />
      </svg>
      <GoldRule width={64} />
    </div>
  );
}

/** Top-left + bottom-right floral corners for hero/section frames. */
export function CornerOrnaments() {
  return (
    <>
      <CornerFloral className="sr-corner sr-corner--tl" />
      <CornerFloral className="sr-corner sr-corner--br" />
    </>
  );
}
