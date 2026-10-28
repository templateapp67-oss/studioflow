import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { fadeUpVariants, revealViewport } from "../../utils/motion";

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const canObserve = typeof IntersectionObserver !== "undefined";

  return (
    <motion.div
      className={className}
      variants={fadeUpVariants}
      initial={reduced || !canObserve ? "visible" : "hidden"}
      whileInView={canObserve ? "visible" : undefined}
      viewport={revealViewport}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
