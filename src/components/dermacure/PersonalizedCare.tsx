import { EditorialImage, NEUTRAL_CLINIC_IMAGE } from "./EditorialImage";
import { useDermacure } from "./context";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

export function PersonalizedCare() {
  const { booking, bookingAvailable, reduced } = useDermacure();
  const canReveal =
    typeof window !== "undefined" &&
    "IntersectionObserver" in window &&
    !reduced;
  return (
    <section
      className="dc-personalised"
      aria-labelledby="dc-personalised-title"
    >
      <div className="dc-personalised-image">
        <EditorialImage
          src="/templates/dermacure/personalised.webp"
          fallback={NEUTRAL_CLINIC_IMAGE}
          alt="Illustrative skin-care portrait"
          loading="lazy"
        />
      </div>
      <motion.div
        className="dc-personalised-copy"
        initial={canReveal ? { opacity: 0, y: 20 } : false}
        whileInView={canReveal ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true, amount: 0.2 }}
      >
        <p className="dc-eyebrow">
          <span /> CARE, MADE PERSONAL
        </p>
        <h2 id="dc-personalised-title">
          Personalised Treatment Plans,
          <br />
          <em>Just for You.</em>
        </h2>
        <p>
          Every skin journey is different. Together, we can discuss your
          concerns, explore suitable options and plan your next steps.
        </p>
        <button className="dc-btn" onClick={booking}>
          {bookingAvailable
            ? "Book a Personalised Consultation"
            : "Contact the Clinic"}{" "}
          <ArrowUpRight size={16} />
        </button>
        <ul
          className="dc-care-details"
          aria-label="Topics to discuss at consultation"
        >
          <li>Your concerns & goals</li>
          <li>Treatment suitability</li>
          <li>Preparation & recovery</li>
          <li>Follow-up guidance</li>
        </ul>
      </motion.div>
    </section>
  );
}
