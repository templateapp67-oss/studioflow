import type { ComponentType } from "react";
import type { Variants } from "motion/react";
import { FlaskConical, ShieldCheck, UserRound } from "lucide-react";
import { motion } from "motion/react";
import { fade } from "./animation";

type Pillar = {
  id: string;
  heading: string;
  copy: string;
  note: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
};

/**
 * The three ideas the clinic page is built on. They describe how the clinic
 * works — science-led assessment, individual attention, honest expectations.
 * No outcome guarantees, no percentages, no invented certifications.
 */
export const PHILOSOPHY_PILLARS: readonly Pillar[] = [
  {
    id: "science",
    heading: "Guided by Science",
    copy: "We value informed decisions, appropriate assessment and treatment options that are suited to each individual's needs.",
    note: "SCIENCE-LED CARE",
    Icon: FlaskConical,
  },
  {
    id: "attention",
    heading: "Care That Considers You",
    copy: "Every skin concern deserves to be understood individually. We encourage thoughtful consultations and clear discussions about available options.",
    note: "PERSONALISED ATTENTION",
    Icon: UserRound,
  },
  {
    id: "trust",
    heading: "Built Around Trust",
    copy: "We believe in clear communication, realistic expectations and helping patients understand the benefits, limitations and aftercare associated with their chosen treatment.",
    note: "TRUST & TRANSPARENCY",
    Icon: ShieldCheck,
  },
];

/** One pillar card. Each card shares the same anatomy, so the row stays calm. */
export function PhilosophyPillarCard({
  pillar,
}: {
  pillar: Pillar;
  /** Accepted so the animated list can pass a React key. */
  key?: string;
}) {
  const { heading, copy, note, Icon, id } = pillar;
  return (
    <motion.article
      className="dc-pillar-card"
      data-pillar={id}
      variants={fade}
      aria-labelledby={`dc-pillar-${id}`}
    >
      <span className="dc-pillar-icon" aria-hidden="true">
        <Icon size={22} strokeWidth={1.3} />
      </span>
      <p className="dc-pillar-note">{note}</p>
      <h3 id={`dc-pillar-${id}`}>{heading}</h3>
      <p className="dc-pillar-copy">{copy}</p>
    </motion.article>
  );
}

export function PhilosophyPillars({
  canReveal,
  variants,
  viewport,
}: {
  canReveal: boolean;
  variants: Variants;
  viewport: { once: boolean; amount: number };
}) {
  return (
    <motion.div
      className="dc-container dc-pillars"
      variants={variants}
      initial={canReveal ? "hidden" : false}
      whileInView={canReveal ? "show" : undefined}
      viewport={viewport}
    >
      {PHILOSOPHY_PILLARS.map((pillar) => (
        <PhilosophyPillarCard key={pillar.id} pillar={pillar} />
      ))}
    </motion.div>
  );
}
