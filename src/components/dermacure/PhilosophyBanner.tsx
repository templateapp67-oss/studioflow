import { useState } from "react";
import { useDermacure } from "./context";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { fade, stagger } from "./animation";
import { DERMACURE_IMAGES } from "../../lib/dermacureSite";

/**
 * The philosophy statement banner: a dark cinematic panel between the brand
 * pillars and the rest of the page.
 *
 * The photograph is decoration only (`alt=""`, `aria-hidden`), it is served
 * from this repository, and if it cannot be decoded the panel simply falls back
 * to its charcoal gradient — the text never depends on the image loading.
 *
 * The single call to action goes through `booking()`, which opens the existing
 * consultation flow when the clinic accepts bookings and otherwise scrolls to
 * the clinic's real contact details. It is never a dead button.
 */
export function PhilosophyBanner() {
  const { booking, bookingAvailable, reduced } = useDermacure();
  const canReveal =
    typeof window !== "undefined" &&
    "IntersectionObserver" in window &&
    !reduced;
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <section
      className="dc-philosophy-banner"
      id="philosophy-statement"
      aria-labelledby="dc-statement-title"
    >
      {!imageFailed && (
        <img
          className="dc-philosophy-banner-image"
          src={DERMACURE_IMAGES.clinic}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      )}
      <span className="dc-philosophy-banner-scrim" aria-hidden="true" />
      <motion.div
        className="dc-container dc-philosophy-banner-inner"
        variants={stagger}
        initial={canReveal ? "hidden" : false}
        whileInView={canReveal ? "show" : undefined}
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.span
          className="dc-philosophy-banner-rule"
          variants={fade}
          aria-hidden="true"
        />
        <motion.h2 id="dc-statement-title" variants={fade}>
          Every Skin Journey
          <br />
          Deserves <em>Thoughtful Care.</em>
        </motion.h2>
        <motion.p variants={fade}>
          Our focus is not on promises of perfection, but on understanding your
          concerns, discussing suitable treatment options and helping you
          approach skin care with greater clarity and confidence.
        </motion.p>
        <motion.button
          className="dc-btn dc-philosophy-banner-cta"
          variants={fade}
          onClick={booking}
        >
          {bookingAvailable ? "Book a Consultation" : "Contact the Clinic"}{" "}
          <ArrowUpRight size={16} aria-hidden="true" />
        </motion.button>
      </motion.div>
    </section>
  );
}
