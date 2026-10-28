import { useDermacure } from "./context";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { fade, stagger } from "./animation";

export function PatientJourney() {
  const { reduced, booking, bookingAvailable } = useDermacure();
  const canReveal =
    typeof window !== "undefined" &&
    "IntersectionObserver" in window &&
    !reduced;
  return (
    <>
      <section className="dc-journey dc-section" id="journey">
        <div className="dc-container">
          <div className="dc-journey-heading">
            <p className="dc-eyebrow">
              <span /> HOW IT WORKS
            </p>
            <h2>
              Your Journey to
              <br />
              <em>Healthier Skin.</em>
            </h2>
            <p>A thoughtful path to care, starting with a conversation.</p>
          </div>
          <motion.div
            className="dc-steps"
            variants={stagger}
            initial={canReveal ? "hidden" : false}
            whileInView={canReveal ? "show" : undefined}
            viewport={{ once: true, amount: 0.2 }}
          >
            {[
              [
                "Consultation",
                "Tell us about your individual concerns and goals.",
              ],
              [
                "Skin Assessment",
                "Discuss your skin and concerns with the clinic team.",
              ],
              [
                "Personalised Plan",
                "Explore suitable options and expectations together.",
              ],
              [
                "Follow-up Care",
                "Discuss aftercare and follow-up guidance where available.",
              ],
            ].map(([title, copy], i) => (
              <motion.div variants={fade} key={title}>
                <span>0{i + 1}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </motion.div>
            ))}
          </motion.div>
          <button className="dc-btn" onClick={booking}>
            {bookingAvailable
              ? "Book a Personalised Consultation"
              : "Contact the Clinic"}{" "}
            <ArrowUpRight size={16} />
          </button>
        </div>
      </section>
    </>
  );
}
