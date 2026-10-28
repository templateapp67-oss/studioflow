import { useDermacure } from "./context";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { fade, stagger } from "./animation";

/**
 * Our approach — the four steps a patient actually experiences at the clinic.
 *
 * The copy describes the clinic's own process. Nothing here claims that the
 * website assesses or diagnoses a condition: the assessment is the clinic's
 * professional consultation, described in words only.
 */
const STEPS = [
  {
    number: "01",
    title: "Listen",
    copy: "Understand the patient's concerns, priorities and expectations.",
  },
  {
    number: "02",
    title: "Assess",
    copy: "Discuss relevant skin concerns through an appropriate professional assessment.",
  },
  {
    number: "03",
    title: "Personalise",
    copy: "Explore suitable treatment options and explain relevant expectations and limitations.",
  },
  {
    number: "04",
    title: "Guide",
    copy: "Provide appropriate treatment guidance and aftercare information where available.",
  },
] as const;

export function PatientJourney() {
  const { reduced, booking, bookingAvailable } = useDermacure();
  const canReveal =
    typeof window !== "undefined" &&
    "IntersectionObserver" in window &&
    !reduced;
  return (
    <section
      className="dc-journey dc-section"
      id="journey"
      aria-labelledby="dc-journey-title"
    >
      <div className="dc-container">
        <div className="dc-journey-heading">
          <p className="dc-eyebrow">
            <span aria-hidden="true" /> OUR APPROACH
          </p>
          <h2 id="dc-journey-title">
            A More Considered
            <br />
            <em>Approach to Skin Care.</em>
          </h2>
          <p>
            Every visit follows the same four steps, so nothing is rushed and
            nothing is assumed.
          </p>
        </div>
        <motion.ol
          className="dc-steps"
          variants={stagger}
          initial={canReveal ? "hidden" : false}
          whileInView={canReveal ? "show" : undefined}
          viewport={{ once: true, amount: 0.2 }}
        >
          {STEPS.map((step) => (
            <motion.li variants={fade} key={step.number}>
              <span className="dc-step-number" aria-hidden="true">
                {step.number}
              </span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </motion.li>
          ))}
        </motion.ol>
        <button className="dc-btn" onClick={booking}>
          {bookingAvailable
            ? "Book a Personalised Consultation"
            : "Contact the Clinic"}{" "}
          <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
