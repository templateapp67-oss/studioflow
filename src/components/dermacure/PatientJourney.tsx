import { useDermacure } from "./context";
import { EditorialImage, NEUTRAL_CLINIC_IMAGE } from "./EditorialImage";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { fade, stagger } from "./animation";

const STEPS = [
  { title: "Consultation", copy: "Share your skin concerns and what you hope to achieve.", image: "/templates/dermacure/reference-consultation.webp", alt: "Illustrative consultation in a clinic" },
  { title: "Skin Analysis", copy: "We look at your skin to understand exactly what it needs.", image: "/templates/dermacure/reference-rejuvenation.webp", alt: "Illustrative skin care assessment" },
  { title: "Personalised Plan", copy: "We plan the right treatments, explain the costs, and set your goals.", image: "/templates/dermacure/personalised.webp", alt: "Illustrative personalised skin care planning" },
  { title: "Your Treatment", copy: "Get your treatment and learn how to look after your skin at home.", image: "/templates/dermacure/treatment.webp", alt: "Illustrative clinic treatment environment" },
];
export function PatientJourney() {
  const { reduced, booking, bookingAvailable, profile } = useDermacure();
  const content = profile.sectionHeadings || {};
  const canReveal = typeof window !== "undefined" && "IntersectionObserver" in window && !reduced;
  return <section className="dc-journey dc-section" id="journey" aria-labelledby="dc-journey-title">
    <div className="dc-container">
      <div className="dc-journey-heading">
        <p className="dc-eyebrow"><span aria-hidden="true" />{content.visitEyebrow || "YOUR VISIT"}</p>
        <h2 id="dc-journey-title">{content.visitTitle || "Four gentle steps"}<br /><em>{content.visitTitleEmphasis || "to healthier skin."}</em></h2>
        <p>{content.visitSubtitle || "Your visit is simple, clear, and focused on your needs — four gentle steps from consultation to aftercare."}</p>
      </div>
      <motion.ol className="dc-steps" variants={stagger} initial={canReveal ? "hidden" : false} whileInView={canReveal ? "show" : undefined} viewport={{ once: true, amount: 0.2 }}>
        {STEPS.map((step, i) => <motion.li variants={fade} key={i}>
          <EditorialImage src={content[`visitStep${i+1}Image`] || step.image} fallback={NEUTRAL_CLINIC_IMAGE} alt={content[`visitStep${i+1}ImageAlt`] || step.alt} width="600" height="400" loading="lazy" />
          <span className="dc-step-number" aria-hidden="true">{String(i+1).padStart(2, "0")}</span>
          <h3>{content[`visitStep${i+1}Title`] || step.title}</h3><p>{content[`visitStep${i+1}Copy`] || step.copy}</p>
        </motion.li>)}
      </motion.ol>
      <button className="dc-btn" onClick={booking}>{bookingAvailable ? "Book a Consultation" : "Talk to Our Team"} <ArrowUpRight size={16} aria-hidden="true" /></button>
    </div>
  </section>;
}
