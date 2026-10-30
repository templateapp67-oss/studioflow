import React from 'react';

/**
 * Template 13 ornaments: the arch motif (the "Arch" of Arch & Flutter), feather
 * / flutter strokes and champagne-gold hairlines. Pure inline SVG so they
 * inherit brand colours from CSS custom properties and cost no requests.
 */

/** Three soft feather strokes — the "Flutter" mark. */
export function FlutterStrokes({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span className={className} style={style} aria-hidden="true">
      <svg viewBox="0 0 132 74" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M6 26 q24 -20 62 -12" />
        <path d="M6 40 q30 -16 72 -4" />
        <path d="M8 54 q26 -10 58 2" />
        <path d="M84 12 l4 -8 M104 18 l6 -7 M118 28 l8 -5" strokeWidth="1.2" opacity="0.7" />
      </svg>
    </span>
  );
}

/** Outline arch used to frame section corners and dividers. */
export function ArchOutline({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span className={className} style={style} aria-hidden="true">
      <svg viewBox="0 0 120 160" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M8 158 V68 a52 52 0 0 1 104 0 V158" />
        <path d="M18 158 V70 a42 42 0 0 1 84 0 V158" strokeWidth="0.9" opacity="0.7" />
      </svg>
    </span>
  );
}

/** Thin gold rule with a centre feather. */
export function GoldRule({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'var(--af-gold)' }}>
      <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, var(--af-gold-line))' }} />
      <svg width="26" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M1 10 q8 -8 12 -8 q4 0 12 8" />
        <path d="M9 5 l-1 -4 M13 3 l0 -3 M17 5 l1 -4" />
      </svg>
      <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--af-gold-line), transparent)' }} />
    </div>
  );
}

/** Monogram mark used when the owner has not uploaded a logo yet. */
export function ArchMonogram({ size = 44 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 14,
        background: 'linear-gradient(140deg, #fff8f2, var(--af-blush))',
        border: '1px solid var(--af-gold-line)',
        color: 'var(--af-espresso)',
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 40 40" fill="none" stroke="currentColor">
        <path d="M8 36 V20 a12 12 0 0 1 24 0 V36" strokeWidth="2.4" strokeLinecap="round" stroke="var(--af-gold)" />
        <path d="M13 25 Q20 17 27 25" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M15 21 l-3 -5 M20 18 l0 -6 M25 21 l3 -5" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** Section divider: gold hairline with three arches. */
export function ArchDivider() {
  return (
    <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', gap: 10, color: 'var(--af-gold)', padding: '6px 0' }}>
      {[0, 1, 2].map((index) => (
        <svg key={index} width="22" height="28" viewBox="0 0 22 28" fill="none" stroke="currentColor" strokeWidth="1.2" opacity={index === 1 ? 1 : 0.6}>
          <path d="M2 27 V12 a9 9 0 0 1 18 0 V27" />
        </svg>
      ))}
    </div>
  );
}
