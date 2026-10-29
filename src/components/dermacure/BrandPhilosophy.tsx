import { EditorialImage } from "./EditorialImage";
import { useDermacure } from "./context";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { fade, imageReveal, stagger } from "./animation";
import { PhilosophyPillars } from "./PhilosophyPillars";
import { PhilosophyBanner } from "./PhilosophyBanner";
import { DERMACURE_IMAGES } from "../../lib/dermacureSite";

const VIEWPORT = { once: true, amount: 0.2 } as const;

/**
 * About / Our Philosophy.
 *
 * Composition: an editorial two-column introduction, three philosophy pillars,
 * the dark statement banner and a restrained editorial quote. Booking, the
 * treatment directory, the technology showcase and the gallery stay in their
 * own sections — nothing here repeats them.
 *
 * Imagery is bundled with the template (`/templates/dermacure/…`). The clinic's
 * own saved photographs are preferred when they exist, every reference photo is
 * labelled "Demo / sample", and a photograph that cannot be decoded falls back
 * to the bundled neutral illustration instead of an empty frame.
 */
export function BrandPhilosophy() {
  const { visible, reduced, profile, scrollTo, hasTeam } = useDermacure();
  const canReveal =
    typeof window !== "undefined" &&
    "IntersectionObserver" in window &&
    !reduced;
  if (!visible.about) return null;
  return (
    <>
      <section
        className="dc-philosophy dc-section"
        id="about"
        aria-labelledby="dc-about-title"
      >
        <div className="dc-container dc-about-grid">
          <motion.div
            className="dc-about-copy"
            variants={stagger}
            initial={canReveal ? "hidden" : false}
            whileInView={canReveal ? "show" : undefined}
            viewport={VIEWPORT}
          >
            <motion.p className="dc-eyebrow" variants={fade}>
              <span aria-hidden="true" /> OUR PHILOSOPHY
            </motion.p>
            <motion.h2 id="dc-about-title" variants={fade}>
              Skin Health.
              <br />
              <em>Science.</em>
              <br />
              Self-Confidence.
            </motion.h2>
            <motion.p className="dc-about-lead" variants={fade}>
              At {profile.businessName?.trim() || "Dermacure"}, we believe that
              thoughtful skin care begins with understanding you.
              Every person&rsquo;s skin has its own needs and concerns. 
              Our approach brings together professional care,
              the right technology, and skin care plans that work for you.
            </motion.p>
            <motion.p variants={fade}>
              We aim to create a space where scientific care meets
              attentive support&mdash;so every consultation feels clear, 
              every recommendation has a purpose, and you feel heard.
            </motion.p>
            <motion.div className="dc-about-actions" variants={fade}>
              <button
                type="button"
                className="dc-btn"
                onClick={() => scrollTo("journey")}
              >
                How We Care for Your Skin <ArrowRight size={16} aria-hidden="true" />
              </button>
              {visible.stylists && hasTeam && (
                <button
                  type="button"
                  className="dc-text-link dc-text-link-muted"
                  onClick={() => scrollTo("salon-team")}
                >
                  Meet Our Care Team <ArrowUpRight size={15} aria-hidden="true" />
                </button>
              )}
            </motion.div>
          </motion.div>

          <motion.div
            className="dc-about-media"
            variants={imageReveal}
            initial={canReveal ? "hidden" : false}
            whileInView={canReveal ? "show" : undefined}
            viewport={VIEWPORT}
          >
            <figure className="dc-about-media-main">
              <EditorialImage
                src={
                  DERMACURE_IMAGES.consultation
                }
                fallback={DERMACURE_IMAGES.neutral}
                fallbackAlt="Illustration of a skin-care consultation"
                alt="Illustrative image of a skincare consultation"
                loading="lazy"
                decoding="async"
                width={1500}
                height={1000}
              />
            </figure>
            <figure className="dc-about-media-inset">
              <EditorialImage
                src={DERMACURE_IMAGES.treatment}
                fallback={DERMACURE_IMAGES.neutral}
                fallbackAlt="Illustration of a skin assessment"
                alt="Close-up of a professional skin assessment during a clinic visit"
                loading="lazy"
                decoding="async"
                width={1400}
                height={933}
              />
            </figure>
            <figcaption className="dc-about-media-note">
              Demo / sample photograph &middot; consultation &amp; assessment
            </figcaption>
          </motion.div>
        </div>

        <PhilosophyPillars
          canReveal={canReveal}
          variants={stagger}
          viewport={VIEWPORT}
        />
      </section>

      <PhilosophyBanner />

      <motion.section
        className="dc-philosophy-quote"
        aria-label="Brand philosophy"
        initial={canReveal ? "hidden" : false}
        whileInView={canReveal ? "show" : undefined}
        viewport={VIEWPORT}
        variants={fade}
      >
        <figure className="dc-philosophy-quote-panel">
          <blockquote>
            &ldquo;Good skin care begins with understanding&mdash;not
            assumptions.&rdquo;
          </blockquote>
          <figcaption>
            The philosophy behind every Dermacure consultation
          </figcaption>
        </figure>
      </motion.section>
    </>
  );
}
