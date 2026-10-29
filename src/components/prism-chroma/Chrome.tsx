import { useEffect, useState } from 'react';
import { ArrowUp, CalendarCheck, MessageCircle, Phone, Sparkles, X } from 'lucide-react';
import { prismFormatInr } from '../../lib/prismChroma';

/** Thin offer bar above the navbar. Owner text comes from config; dismissible. */
export function AnnouncementBar({
  text,
  ctaLabel,
  onCta,
}: {
  text: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  const [open, setOpen] = useState(true);
  if (!text || !open) return null;
  return (
    <div className="pc-announce" role="region" aria-label="Studio offer">
      <p>
        <Sparkles size={13} aria-hidden="true" /> {text}
      </p>
      <button type="button" className="pc-announce-cta" onClick={onCta}>
        {ctaLabel}
      </button>
      <button type="button" className="pc-announce-close" onClick={() => setOpen(false)} aria-label="Dismiss offer">
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Gradient scroll-progress line pinned to the very top of the page. */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !document.documentElement) return;
    let frame = 0;
    const update = () => {
      const el = document.documentElement;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const onScroll = () => {
      if (typeof window.requestAnimationFrame === 'function') {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(update);
      } else update();
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div className="pc-progress" aria-hidden="true">
      <span style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}

/**
 * Mobile sticky booking bar — appears after scrolling past the hero so the
 * Book / Call / WhatsApp actions are always one tap away on phones.
 */
export function StickyBookBar({
  startingPrice,
  phoneHref,
  whatsappHref,
  onBook,
}: {
  startingPrice?: number;
  phoneHref: string;
  whatsappHref: string;
  onBook: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setVisible(window.scrollY > 520);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className={visible ? 'pc-stickybar is-visible' : 'pc-stickybar'} aria-hidden={!visible}>
      <div className="pc-stickybar-price">
        <span>Colour from</span>
        <strong>{startingPrice ? prismFormatInr(startingPrice) : '₹1,299'}</strong>
      </div>
      <a href={phoneHref} className="pc-stickybar-icon" aria-label="Call the studio" tabIndex={visible ? 0 : -1}>
        <Phone size={17} aria-hidden="true" />
      </a>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="pc-stickybar-icon"
        aria-label="Chat on WhatsApp"
        tabIndex={visible ? 0 : -1}
      >
        <MessageCircle size={17} aria-hidden="true" />
      </a>
      <button type="button" className="pc-btn pc-btn-gradient pc-stickybar-book" onClick={onBook} tabIndex={visible ? 0 : -1}>
        <CalendarCheck size={16} aria-hidden="true" /> Book Now
      </button>
    </div>
  );
}

/** Floating back-to-top button with the prism gradient ring. */
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setVisible(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      type="button"
      className="pc-totop"
      aria-label="Back to top"
      onClick={() => {
        if (typeof document !== 'undefined') document.getElementById('pc-top')?.scrollIntoView({ behavior: 'smooth' });
      }}
    >
      <ArrowUp size={17} aria-hidden="true" />
    </button>
  );
}
