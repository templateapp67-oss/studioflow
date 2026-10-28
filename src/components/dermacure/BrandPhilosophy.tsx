import { EditorialImage } from "./EditorialImage";
import { useDermacure } from "./context";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { fade, stagger } from "./animation";

export function BrandPhilosophy() {
  const { visible, reduced, profile } = useDermacure();
  const canReveal =
    typeof window !== "undefined" &&
    "IntersectionObserver" in window &&
    !reduced;
  return (
    <>
      {visible.about && (
        <section className="dc-philosophy dc-section" id="about">
          <motion.div
            initial={canReveal ? "hidden" : false}
            whileInView={canReveal ? "show" : undefined}
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="dc-container dc-philosophy-grid"
          >
            <motion.div variants={fade} className="dc-philosophy-image">
              <EditorialImage
                fallback={"/templates/dermacure/reference-consultation.webp"}
                src={
                  profile.ownerPhotoUrl ||
                  "/templates/dermacure/reference-consultation.webp"
                }
                alt={
                  profile.ownerPhotoUrl
                    ? `${profile.businessName} — clinic team`
                    : "Illustrative image of a skin care consultation"
                }
                loading="lazy"
              />
              <span className="dc-image-caption">
                CARE THAT BEGINS WITH YOU <span>01 / 04</span>
              </span>
            </motion.div>
            <motion.div variants={fade} className="dc-philosophy-copy">
              <p className="dc-eyebrow">
                <span /> OUR PHILOSOPHY
              </p>
              <h2>
                Skin Health.
                <br />
                <em>Science.</em>
                <br />
                Self-Confidence.
              </h2>
              <p>
                Good skin care is personal. We believe in taking the time to
                understand your concerns and explore the options that feel right
                for you.
              </p>
              <p>
                Thoughtful care, a considered approach, and a little more
                confidence in your own skin.
              </p>
              <a className="dc-text-link" href="#journey">
                Learn Our Approach <ArrowRight size={16} />
              </a>
            </motion.div>
          </motion.div>
        </section>
      )}
    </>
  );
}
