import type {Variants} from 'motion/react';

/** Shared, restrained reveal presets. Content starts visible if motion is unavailable. */
export const fadeUpVariants: Variants = {
  hidden: {opacity: 0, y: 18},
  visible: {opacity: 1, y: 0, transition: {duration: 0.58, ease: [0.22, 1, 0.36, 1]}},
};
export const fadeInVariants: Variants = {
  hidden: {opacity: 0},
  visible: {opacity: 1, transition: {duration: 0.7, ease: 'easeOut'}},
};
export const staggerContainer: Variants = {
  hidden: {},
  visible: {transition: {staggerChildren: 0.11, delayChildren: 0.04}},
};
export const staggerItem: Variants = {
  hidden: {opacity: 0, y: 16},
  visible: {opacity: 1, y: 0, transition: {duration: 0.5, ease: [0.22, 1, 0.36, 1]}},
};
export const imageRevealVariants: Variants = {
  hidden: {opacity: 0, y: 12},
  visible: {opacity: 1, y: 0, transition: {duration: 0.68, ease: 'easeOut'}},
};
export const imageScaleVariants: Variants = {
  hidden: {opacity: 0, scale: 1.03},
  visible: {opacity: 1, scale: 1, transition: {duration: 0.85, ease: 'easeOut'}},
};

export const revealViewport = {once: true, amount: 0.2} as const;

