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
          {model.profile.businessName} <i /> HAIR SPA &amp; SCALP SANCTUARY
        </motion.p>
        <motion.h1
          id="kp-hero-title"
          variants={fadeUpVariants}
          initial={model.reduced ? "visible" : "hidden"}
          animate="visible"
          transition={{ delay: 0.08 }}
        >
          Where Hair Wellness
          <br />
          <em>Meets the Wisdom</em>
          <br />
          of Nature.
        </motion.h1>
        <motion.p
          className="kp-hero-intro"
          variants={fadeUpVariants}
          initial={model.reduced ? "visible" : "hidden"}
          animate="visible"
          transition={{ delay: 0.16 }}
        >
          Discover a thoughtful approach to hair and scalp care through
          personalised rituals, botanical-inspired treatments and a tranquil
          sanctuary designed around your wellbeing.
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
              model.scrollTo(treatmentsAvailable ? "treatments" : "contact")
            }
          >
            {treatmentsAvailable
              ? "Explore Treatments"
              : "Ask about treatments"}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          {/* With an empty menu there is nothing to book, so the second action
              becomes an honest contact path instead of opening a fake basket. */}
          <button
            type="button"
            className="kp-text-link kp-light"
            onClick={() => model.book(model.firstService)}
          >
            {model.bookingAvailable ? "Book Your Ritual" : "Contact the sanctuary"}{" "}
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </motion.div>
      </div>
      <button
        type="button"
        className="kp-scroll-cue"
        onClick={() => model.scrollTo("philosophy")}
      >
        <span>SCROLL TO FEEL THE DIFFERENCE</span>
        <ArrowDown size={15} aria-hidden="true" />
      </button>
      {/* Demo/reference imagery is always labelled on the page it appears. */}
      {!model.heroIsOwnerPhoto && (
        <span className="kp-hero-credit">Demo / sample photograph</span>
      )}
    </section>
  );
}
