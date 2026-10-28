import { useHairSpa } from "./context";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  fadeInVariants,
  fadeUpVariants,
  imageScaleVariants,
} from "../../utils/motion";

export function HeroSection() {
  const model = useHairSpa();
  return (
    <>
      <section
        className="kp-hero"
        id="home"
        ref={model.heroRef}
        data-layout="hero"
      >
        <motion.img
          className="kp-hero-image"
          src={model.heroImage}
          alt="A tranquil spa sanctuary with warm, natural textures"
          loading="eager"
          fetchPriority="high"
          decoding="async"
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
            KESH PRAKRITI <i /> HAIR SPA &amp; SCALP SANCTUARY <i /> Rich warm
            mood
          </motion.p>
          <motion.h1
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
              className="kp-button kp-button-ivory"
              onClick={() => model.scrollTo("treatments")}
            >
              Explore Treatments <ArrowRight size={16} />
            </button>
            <button
              className="kp-text-link kp-light"
              onClick={() => model.onBook(model.firstService)}
            >
              Book Your Ritual <ArrowUpRight size={16} />
            </button>
          </motion.div>
        </div>
        <button
          className="kp-scroll-cue"
          onClick={() => model.scrollTo("philosophy")}
        >
          <span>SCROLL TO FEEL THE DIFFERENCE</span>
          <ArrowDown size={15} />
        </button>
        <span className="kp-hero-index">01 — 06</span>
      </section>
    </>
  );
}
