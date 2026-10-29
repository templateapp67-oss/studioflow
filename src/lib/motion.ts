import type { Variants } from 'framer-motion';

/**
 * Shared Framer Motion variants (Template 09+).
 *
 * Design rules:
 * - Animate only `transform` and `opacity` so motion stays on the compositor
 *   thread and never causes layout shift.
 * - Keep movement soft and premium — no bounce, no overshoot.
 * - Pair with `<MotionConfig reducedMotion="user">` (or `useReducedMotion()`)
 *   so visitors who prefer reduced motion only ever see simple fades:
 *   framer-motion then drops transform animations automatically.
 */

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Simple opacity fade. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

/** Fade while rising gently into place (default section/card reveal). */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
  exit: { opacity: 0, y: 12, transition: { duration: 0.3, ease: 'easeOut' } },
};

/** Hero headline: slides up from 40px while fading in. */
export const heroHeadline: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
};

/** Soft zoom-in reveal (used for the hero device mockup and feature media). */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: EASE_OUT },
  },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.3, ease: 'easeOut' } },
};

/** Device mockup entrance: scaleIn with a small delay after the headline. */
export const deviceMockupIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, delay: 0.25, ease: EASE_OUT },
  },
};

/** Parent that staggers any `staggerItem` children. */
export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

/** Child used inside a `stagger` parent. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

/** Page-level transition for use with AnimatePresence. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25, ease: 'easeOut' } },
};

/** Standard viewport settings: reveal once, when ~20% of the block is visible. */
export const revealViewport = { once: true, amount: 0.2 } as const;

/**
 * `whileInView` needs IntersectionObserver. When it is unavailable
 * (SSR, embeds, test renderers), guard reveals exactly like
 * hair-spa/Reveal.tsx: render content visible and skip the observer.
 *
 *   initial={canObserveViewport ? 'hidden' : 'visible'}
 *   whileInView={canObserveViewport ? 'visible' : undefined}
 */
export const canObserveViewport = typeof IntersectionObserver !== 'undefined';
