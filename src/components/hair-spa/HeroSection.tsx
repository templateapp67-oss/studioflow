import { useHairSpa } from "./context";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import {
  fadeInVariants,
  fadeUpVariants,
  imageScaleVariants,
} from "../../utils/motion";

export function HeroSection() {
  const model = useHairSpa();
  const treatmentsAvailable = model.services.length > 0;
  return (
    <section
      className="kp-hero"
      id="home"
      ref={model.heroRef}
      data-layout="hero"
      aria-labelledby="kp-hero-title"
    >
      {/* The hero photograph is the page LCP element: eager + high priority. */}
      <motion.img
        className="kp-hero-image"
        src={model.heroImage}
        alt={
          model.heroIsOwnerPhoto
            ? `${model.profile.businessName} salon interior`
            : "Reference photograph of a calm spa treatment room"
        }
        loading="eager"
        fetchPriority="high"
        decoding="async"
        width={1584}
        height={672}
        style={{ y: model.parallaxY }}
        initial={model.reduced ? "visible" : "hidden"}
        animate="visible"
        variants={imageScaleVariants}
      />
      <div className="kp-hero-shade" />
      <div className="kp-hero-copy">
        <motion.p
          className="kp-eyebrow kp-light"
          variants={fadeInVariants}
          initial={model.reduced ? "visible" : "hidden"}
          animate="visible"
        >
          {model.profile.businessName} <i /> SALON &amp; HAIR SPA
        </motion.p>
        <motion.h1
          id="kp-hero-title"
          variants={fadeUpVariants}
          initial={model.reduced ? "visible" : "hidden"}
          animate="visible"
          transition={{ delay: 0.08 }}
        >
          Good care for
          <br />
          <em>your hair, skin</em>
          <br />
          and you.
        </motion.h1>
        <motion.p
          className="kp-hero-intro"
          variants={fadeUpVariants}
          initial={model.reduced ? "visible" : "hidden"}
          animate="visible"
          transition={{ delay: 0.16 }}
        >
          From a relaxing head massage to everyday grooming and wedding makeup,
          enjoy friendly care at your neighbourhood salon.
        </motion.p>
        <motion.div
          className="kp-hero-actions"
          variants={fadeUpVariants}
          initial={model.reduced ? "visible" : "hidden"}
          animate="visible"
          transition={{ delay: 0.24 }}
        >
          <button
            type="button"
            className="kp-button kp-button-ivory"
            onClick={() =>
              model.scrollTo("treatments")
            }
          >
            {treatmentsAvailable
              ? "View Services"
              : "Ask about services"}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          {/* With an empty menu there is nothing to book, so the second action
              becomes an honest contact path instead of opening a fake basket. */}
          <button
            type="button"
            className="kp-text-link kp-light"
            onClick={() => model.book(model.firstService)}
          >
            {model.bookingAvailable ? "Book an Appointment" : "Contact the salon"}{" "}
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </motion.div>
      </div>
      <button
        type="button"
        className="kp-scroll-cue"
        onClick={() => model.scrollTo("philosophy")}
      >
        <span>SCROLL TO EXPLORE</span>
        <ArrowDown size={15} aria-hidden="true" />
      </button>
      {/* Demo/reference imagery is always labelled on the page it appears. */}
      {!model.heroIsOwnerPhoto && (
        <span className="kp-hero-credit">Demo / sample photograph</span>
      )}
    </section>
  );
}
