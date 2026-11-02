import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  Bath,
  BookOpen,
  CalendarHeart,
  ClipboardList,
  Coffee,
  Compass,
  Droplets,
  Feather,
  Flower,
  Flower2,
  Footprints,
  HandHeart,
  Heart,
  HeartPulse,
  Home,
  Leaf,
  Receipt,
  Sparkles,
  Sprout,
  Stethoscope,
  Sunset,
  TreePine,
  Wand2,
  Waves,
  Wheat,
  Wind,
} from 'lucide-react';
import { canObserveViewport, fadeUp, glassIn, glassItem, heroHeadline, revealViewport, scaleIn, sectionIn, stagger, staggerItem } from '../../lib/motion';
import { VEDA_IMAGE_SLOTS, isBundledVedaAsset, vedaImage, vedaIntrinsic, vedaSrcSet } from '../../lib/vedaSanjeevani';

/* ------------------------------------------------------------------ *
 * Images
 * ------------------------------------------------------------------ */

/** The bundled images ship several widths; owner uploads are used as they are. */
export function vedaImageProps(slot: string, ownerUrl?: string): { src: string; srcSet?: string; width?: number; height?: number } {
  const url = (ownerUrl || '').trim();
  const base = url || vedaImage(slot);
  if (!isBundledVedaAsset(base)) return { src: base };
  const match = base.match(/\/templates\/14\/([\w-]+)-\d+\.(webp|jpg)$/);
  const key = match && match[1] && VEDA_IMAGE_SLOTS[match[1]] ? match[1] : slot;
  const intrinsic = vedaIntrinsic(key);
  return { src: base, srcSet: vedaSrcSet(key), width: intrinsic.width, height: intrinsic.height };
}

/**
 * Template 14 image.
 *
 * `loading="lazy"` + explicit `width`/`height` (or an aspect-ratio box) means no
 * layout shift, and a soft fade covers the decode. Broken owner URLs fall back
 * to the bundled template photo instead of an empty box.
 */
export function VedaImage({
  slot,
  src,
  alt,
  ratio,
  className,
  sizes = '(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 620px',
  priority = false,
  style,
  focus,
}: {
  slot: string;
  src?: string;
  alt: string;
  ratio?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  style?: React.CSSProperties;
  /** Crop focus for owner photos: a CSS object-position value or {x,y} in 0–1. */
  focus?: string | { x: number; y: number };
}) {
  const fallback = vedaImage(slot);
  const [current, setCurrent] = useState(src || fallback);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setCurrent(src || fallback);
    setLoaded(false);
  }, [src, fallback]);
  const props = useMemo(() => vedaImageProps(slot, current), [slot, current]);
  return (
    <img
      {...props}
      alt={alt}
      sizes={props.srcSet ? sizes : undefined}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (current !== fallback) {
          setCurrent(fallback);
          return;
        }
        setLoaded(true);
      }}
      style={{
        ...style,
        ...(ratio ? { aspectRatio: ratio } : null),
        ...(focus
          ? {
              objectPosition:
                typeof focus === 'string' ? focus : `${Math.round(focus.x * 100)}% ${Math.round(focus.y * 100)}%`,
            }
          : null),
        opacity: loaded ? 1 : 0.001,
        transition: 'opacity 600ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      data-veda-image={slot}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Motion wrappers (respect reduced motion + missing IntersectionObserver)
 * ------------------------------------------------------------------ */

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  delay?: number;
  as?: 'div' | 'section' | 'article' | 'figure' | 'li' | 'header' | 'footer' | 'aside' | 'ul';
  variant?: 'fadeUp' | 'scaleIn' | 'section' | 'glass';
  labelledBy?: string;
  style?: React.CSSProperties;
};

export function VedaReveal({ children, className, id, delay = 0, as = 'div', variant = 'fadeUp', labelledBy, style }: RevealProps) {
  const reduce = useReducedMotion();
  const Tag = as as React.ElementType;
  if (reduce || !canObserveViewport) {
    return (
      <Tag id={id} className={className} aria-labelledby={labelledBy} style={style}>
        {children}
      </Tag>
    );
  }
  const MotionTag = motion[as] as React.ElementType;
  return (
    <MotionTag
      id={id}
      className={className}
      aria-labelledby={labelledBy}
      style={style}
      variants={variant === 'scaleIn' ? scaleIn : variant === 'section' ? sectionIn : variant === 'glass' ? glassIn : fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}

/** Parent that staggers a grid of cards. `glass` gives children the glass rise. */
export function VedaRevealGroup({ children, className, id, as = 'div', variant, style }: RevealProps) {
  const reduce = useReducedMotion();
  const Tag = as as React.ElementType;
  if (reduce || !canObserveViewport) {
    return (
      <Tag className={className} id={id} style={style}>
        {children}
      </Tag>
    );
  }
  const MotionTag = motion[as] as React.ElementType;
  return (
    <MotionTag
      className={className}
      id={id}
      style={style}
      variants={variant === 'glass' ? { hidden: {}, visible: { transition: { staggerChildren: 0.085, delayChildren: 0.04 } } } : stagger}
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
    >
      {children}
    </MotionTag>
  );
}

/** A single card inside a reveal group. `glass` adds a subtle settle-in scale. */
export function VedaRevealItem({
  children,
  className,
  as = 'div',
  variant,
  id,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'li' | 'figure';
  variant?: 'plain' | 'glass';
  id?: string;
  style?: React.CSSProperties;
}) {
  const reduce = useReducedMotion();
  const Tag = as as React.ElementType;
  if (reduce || !canObserveViewport) {
    return (
      <Tag className={className} id={id} style={style}>
        {children}
      </Tag>
    );
  }
  const MotionTag = motion[as] as React.ElementType;
  return (
    <MotionTag className={className} id={id} style={style} variants={variant === 'glass' ? glassItem : staggerItem}>
      {children}
    </MotionTag>
  );
}

/**
 * The header strip at the top of every inner page.
 *
 * Breadcrumb, eyebrow, heading and lead rise in one after another so each page
 * opens like a printed spread instead of snapping into place. Renders plain
 * markup for reduced motion or when no IntersectionObserver is available.
 */
export function VedaPageHead({
  crumb,
  eyebrow,
  title,
  body,
  head,
  children,
}: {
  crumb: string;
  eyebrow?: string;
  title?: string;
  body?: string;
  /** Pre-built heading block (when the page head uses a shared section head). */
  head?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const animate = !reduce && canObserveViewport;
  const parts = [
    <div className="vd-breadcrumb" key="crumb">
      {children}
      <span>{crumb}</span>
    </div>,
    head ? (
      <div key="head">{head}</div>
    ) : (
      <>
        {eyebrow ? (
          <p className="vd-eyebrow" key="eyebrow">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="vd-h2" key="title" style={{ maxWidth: '20ch' }}>
          {(title || '').split('\n').map((line, index) => (
            <React.Fragment key={index}>
              {index > 0 ? <br /> : null}
              {line}
            </React.Fragment>
          ))}
        </h1>
        {body ? (
          <p className="vd-lead" key="body" style={{ marginTop: 14, maxWidth: '64ch' }}>
            {body}
          </p>
        ) : null}
      </>
    ),
  ].filter(Boolean) as React.ReactNode[];

  if (!animate) {
    return (
      <header className="vd-page-head">
        <div className="vd-container">{parts}</div>
      </header>
    );
  }
  return (
    <header className="vd-page-head">
      <motion.div className="vd-container" variants={stagger} initial="hidden" animate="visible">
        {parts.map((part, index) => (
          <motion.div key={index} variants={staggerItem}>
            {part}
          </motion.div>
        ))}
      </motion.div>
    </header>
  );
}

/**
 * A frosted glass card that animates itself in on scroll.
 *
 * Used for the single "central" panels (the hero card, a booking summary, a
 * feature quote) that are not part of a stagger grid. With reduced motion the
 * card renders as a plain element and only the CSS hover stays, which is itself
 * disabled by the media query in `vedaSanjeevani.css`.
 */
export function VedaGlassCard({
  children,
  className = '',
  as = 'div',
  delay = 0,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'aside' | 'article' | 'section';
  delay?: number;
  ariaLabel?: string;
}) {
  const reduce = useReducedMotion();
  const classes = ['vd-glass', className].filter(Boolean).join(' ');
  if (reduce || !canObserveViewport) {
    const Tag = as as React.ElementType;
    return (
      <Tag className={classes} aria-label={ariaLabel}>
        {children}
      </Tag>
    );
  }
  const MotionTag = motion[as] as React.ElementType;
  return (
    <MotionTag
      className={classes}
      aria-label={ariaLabel}
      variants={glassIn}
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}

export { heroHeadline };

/* ------------------------------------------------------------------ *
 * Small UI
 * ------------------------------------------------------------------ */

export function VedaBtn({
  children,
  onClick,
  href,
  variant = 'solid',
  size,
  block,
  type = 'button',
  ariaLabel,
  target,
  disabled,
  external,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'solid' | 'gold' | 'ghost' | 'quiet';
  size?: 'sm';
  block?: boolean;
  type?: 'button' | 'submit';
  ariaLabel?: string;
  target?: string;
  disabled?: boolean;
  external?: boolean;
}) {
  const className = ['vd-btn', variant !== 'solid' ? `vd-btn--${variant}` : '', size === 'sm' ? 'vd-btn--sm' : '', block ? 'vd-btn--block' : ''].filter(Boolean).join(' ');
  if (href) {
    return (
      <a
        className={className}
        href={href}
        aria-label={ariaLabel}
        target={target || (external ? '_blank' : undefined)}
        rel={target === '_blank' || external ? 'noopener noreferrer' : undefined}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }
  return (
    <button className={className} type={type} onClick={onClick} aria-label={ariaLabel} disabled={disabled}>
      {children}
    </button>
  );
}

export function VedaTextLink({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  if (href) {
    return (
      <a className="vd-textlink" href={href} target="_blank" rel="noopener noreferrer">
        {children} <ArrowRight size={14} aria-hidden="true" />
      </a>
    );
  }
  return (
    <button type="button" className="vd-textlink" onClick={onClick} style={{ background: 'none', border: '0', cursor: 'pointer' }}>
      {children} <ArrowRight size={14} aria-hidden="true" />
    </button>
  );
}

export function VedaSectionHead({
  eyebrow,
  title,
  body,
  align = 'left',
  id,
  action,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: 'left' | 'center';
  id?: string;
  action?: React.ReactNode;
}) {
  const head = (
    <div className={`vd-head${align === 'center' ? ' vd-head--center' : ''}`}>
      <p className="vd-eyebrow">{eyebrow}</p>
      <h2 className="vd-h2" id={id}>{title}</h2>
      {body ? <p className="vd-lead">{body}</p> : null}
    </div>
  );
  if (!action) return head;
  return (
    <div className="vd-head__row">
      {head}
      <div>{action}</div>
    </div>
  );
}

/** Botanical divider — a leaf between two hairlines. */
export function VedaDivider() {
  return (
    <div className="vd-divider" aria-hidden="true">
      <Leaf size={16} strokeWidth={1.4} />
    </div>
  );
}

/** The monogram used in the header, footer and vouchers. */
export function VedaMonogram({ size = 34, withRing = true }: { size?: number; withRing?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {withRing ? <circle cx="24" cy="24" r="22.5" stroke="currentColor" strokeOpacity="0.42" strokeWidth="1" /> : null}
      <path d="M24 38c0-9 5.5-15 13-16-1 9.5-6.4 15.4-13 16Z" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
      <path d="M24 38c0-9-5.5-15-13-16 1 9.5 6.4 15.4 13 16Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
      <path d="M24 38V20" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
      <path d="M24 20c0-5.6 2.6-9.4 7.4-11-0.4 6-3.2 9.9-7.4 11Z" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <circle cx="24" cy="14.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** Background ornament: faint botanical line-work. */
export function VedaBotanical({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 320"
      style={{ position: 'absolute', width: 'clamp(150px, 24vw, 260px)', height: 'auto', opacity: 0.1, pointerEvents: 'none', transform: flip ? 'scaleX(-1)' : undefined }}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.1">
        <path d="M120 312C120 240 98 190 40 158" />
        <path d="M120 312c0-72 22-122 80-154" />
        <path d="M92 232c-26-6-44-22-50-48 26 2 44 16 50 48Z" />
        <path d="M148 232c26-6 44-22 50-48-26 2-44 16-50 48Z" />
        <path d="M110 176c-20-12-30-32-28-58 20 10 30 30 28 58Z" />
        <path d="M130 176c20-12 30-32 28-58-20 10-30 30-28 58Z" />
        <circle cx="120" cy="120" r="9" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Icons + hooks
 * ------------------------------------------------------------------ */

const ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  stethoscope: Stethoscope,
  award: Award,
  receipt: Receipt,
  leaf: Leaf,
  heart: Heart,
  home: Home,
  spa: Sparkles,
  water_drop: Droplets,
  eco: Sprout,
  self_improvement: HeartPulse,
  psychology: HandHeart,
  face: Flower2,
  grain: Wheat,
  local_florist: Flower,
  clinical_notes: ClipboardList,
  directions_walk: Footprints,
  air: Wind,
  favorite: Heart,
  auto_awesome: Wand2,
  healing: Feather,
  wb_twilight: Sunset,
  explore: Compass,
  water: Waves,
  pregnant_woman: HandHeart,
  calendar: CalendarHeart,
  book: BookOpen,
  coffee: Coffee,
  bath: Bath,
  tree: TreePine,
};

export function VedaIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = ICONS[name] || Leaf;
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" />;
}

export function useVedaScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

/** Opening-hours status from simple "HH:MM" strings, in the visitor's clock. */
export function vedaOpenStatus(open = '09:30', close = '20:00', now = new Date()): { open: boolean; label: string } {
  const [openH, openM] = open.split(':').map(Number);
  const [closeH, closeM] = close.split(':').map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = (openH || 9) * 60 + (openM || 0);
  const end = (closeH || 20) * 60 + (closeM || 0);
  const isOpen = minutes >= start && minutes < end;
  if (isOpen) {
    const remaining = end - minutes;
    if (remaining <= 60) return { open: true, label: `Open · closing in ${remaining} min` };
    return { open: true, label: 'Open today' };
  }
  return { open: false, label: minutes < start ? `Opens at ${open}` : 'Closed for today' };
}

/** Locking body scroll while a dialog is open (lightbox / drawer). */
export function useVedaBodyLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

/** Escape-to-close for dialogs. */
export function useVedaEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [active, onClose]);
}
