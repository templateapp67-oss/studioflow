import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { canObserveViewport, fadeIn, fadeUp, pageTransition, revealViewport, scaleIn, stagger, staggerItem } from '../../lib/motion';

/**
 * Motion wrappers for Template 11.
 *
 * All variants come from the shared `src/lib/motion.ts` (fadeIn, fadeUp,
 * scaleIn, stagger, revealViewport) so every template animates consistently.
 * `MotionConfig reducedMotion="user"` is applied at the site root; these
 * wrappers add a second guard so that a visitor who prefers reduced motion
 * (or a browser without IntersectionObserver) gets content directly, with no
 * transform and no observer subscription.
 */

type RevealProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  className?: string;
  id?: string;
  delay?: number;
  as?: 'div' | 'section' | 'article' | 'figure' | 'li' | 'header' | 'footer';
  variant?: 'fadeUp' | 'fadeIn' | 'scaleIn';
  'data-layout'?: string;
};

const VARIANTS = { fadeUp, fadeIn, scaleIn };

/** Fade/slide a block in once, when ~20% of it is visible. */
export function Reveal({ children, className, id, delay = 0, as = 'div', variant = 'fadeUp', ...rest }: RevealProps) {
  const reduce = useReducedMotion();
  const motionTag = motion[as] as typeof motion.div;
  if (reduce || !canObserveViewport) {
    const Tag = as as React.ElementType;
    return (
      <Tag id={id} className={className} {...rest}>
        {children}
      </Tag>
    );
  }
  return (
    <motionTag
      {...rest}
      id={id}
      className={className}
      variants={VARIANTS[variant]}
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      transition={{ delay }}
    >
      {children}
    </motionTag>
  );
}

/** Parent that staggers <RevealItem> children. */
export function RevealGroup({
  children,
  className,
  id,
  as = 'div',
  ...rest
}: React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  className?: string;
  id?: string;
  as?: 'div' | 'ul' | 'section';
  'data-layout'?: string;
}) {
  const reduce = useReducedMotion();
  const motionTag = motion[as] as typeof motion.div;
  if (reduce || !canObserveViewport) {
    const Tag = as as React.ElementType;
    return (
      <Tag id={id} className={className} {...rest}>
        {children}
      </Tag>
    );
  }
  return (
    <motionTag {...rest} id={id} className={className} variants={stagger} initial="hidden" whileInView="visible" viewport={revealViewport}>
      {children}
    </motionTag>
  );
}

/** Child item for RevealGroup (fade-up, staggered by the parent). */
export function RevealItem({
  children,
  className,
  as = 'div',
  ...rest
}: React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'article' | 'figure';
}) {
  const reduce = useReducedMotion();
  const motionTag = motion[as] as typeof motion.div;
  if (reduce || !canObserveViewport) {
    const Tag = as as React.ElementType;
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    );
  }
  return (
    <motionTag {...rest} className={className} variants={staggerItem}>
      {children}
    </motionTag>
  );
}

/** Page-level fade/slide used with AnimatePresence on the storefront. */
export function PageShell({ children, pageKey }: { children: React.ReactNode; pageKey: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <main id="salon-home">{children}</main>;
  return (
    <motion.main key={pageKey} id="salon-home" variants={pageTransition} initial="hidden" animate="visible" exit="exit">
      {children}
    </motion.main>
  );
}
