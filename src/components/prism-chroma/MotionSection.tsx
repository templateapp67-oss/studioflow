import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { canObserveViewport, fadeUp, revealViewport, stagger, staggerItem } from '../../lib/motion';

/**
 * Reusable entrance-motion wrappers for Template 10 (Prism & Chroma).
 * All motion respects prefers-reduced-motion: the site root wraps content in
 * <MotionConfig reducedMotion="user"> and, as a second guard, these wrappers
 * render content directly (no transform) when the visitor prefers reduced
 * motion or IntersectionObserver is unavailable.
 */
export function MotionSection({
  children,
  className,
  id,
  delay = 0,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  delay?: number;
  key?: React.Key;
  'data-layout'?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce || !canObserveViewport) {
    return (
      <section id={id} className={className} {...rest}>
        {children}
      </section>
    );
  }
  return (
    <motion.section
      {...rest}
      id={id}
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      transition={{ delay }}
    >
      {children}
    </motion.section>
  );
}

/** Fade-up child used inside a <FadeInGroup> stagger parent. */
export function FadeIn({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  key?: React.Key;
}) {
  const reduce = useReducedMotion();
  if (reduce || !canObserveViewport) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

/** Parent that staggers any <FadeIn> children (whileInView, once). */
export function FadeInGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  key?: React.Key;
}) {
  const reduce = useReducedMotion();
  if (reduce || !canObserveViewport) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
    >
      {children}
    </motion.div>
  );
}
