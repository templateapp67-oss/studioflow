import { EditorialImage } from "./EditorialImage";
import { useDermacure } from "./context";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight, Microscope, ScanFace, Stethoscope } from "lucide-react";
import { fade, stagger } from "./animation";

/**
 * The three ideas the clinic page is built on. They describe how the clinic
 * works — assessment, technology, follow-through. No outcome guarantees, no
 * percentages and no certifications beyond what the template's own copy states.
 */
const PILLARS = [
  {
    title: "Dermatologist-led assessment",
    text: "A consultation before anything is decided: your skin type, your history, what has worked and what has not. The plan is explained — including what a treatment cannot do — before you agree to it.",
    Icon: Stethoscope,
  },
  {
    title: "Medical-grade technology",
    text: "Hydra-dermabrasion, medical peels, Q-switched laser toning and LED phototherapy, each chosen for the concern in front of us rather than for a package on a poster.",
    Icon: Microscope,
  },
  {
    title: "Protocols you can repeat",
    text: "Every visit ends with aftercare you can actually follow at home and a realistic interval for the next session — so progress holds after you leave the clinic.",
    Icon: ScanFace,
  },
] as const;

export function BrandPhilosophy() {
  const { visible, reduced, profile, scrollTo } = useDermacure();
  const canReveal =
    typeof window !== "undefined" &&
    "IntersectionObserver" in window &&
    !reduced;
  return (
    <>
      {visible.about && (
        <section className="dc-philosophy dc-section" id="about" aria-labelledby="dc-about-title">
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
                <span /> OUR PHILOSOPHY · ABOUT THE CLINIC
              </p>
              <h2 id="dc-about-title">
                Skin Health.
                <br />
                <em>Science.</em>
                <br />
                Self-Confidence.
              </h2>
              <p>
                Good skin care is personal. We believe in taking the time to
                understand your concerns and explore the options that feel right
                for you — in a clinic that treats skin health as the foundation
                and the glow as the result, not the other way around.
              </p>
              <p>
                Every visit starts with a conversation and a proper look at your
                skin: its type, its history, the treatments it has already had
                and the ones it should avoid. Only then does the team recommend a
                protocol, explain what it involves, and tell you honestly how
                many sessions a concern usually needs.
              </p>
              <p>
                The clinic works with medical-grade technology and carefully
                selected actives — hydra-dermabrasion for congestion, medical
                peels for texture and pigment, laser toning for tone, LED for
                calm and recovery. Each is matched to Indian skin types and
                adjusted to your comfort on the day, not delivered from a fixed
                script.
              </p>
              <p>
                Thoughtful care, a considered approach, and a little more
                confidence in your own skin.
              </p>
              <div className="dc-philosophy-actions">
                <a
                  className="dc-text-link"
                  href="#journey"
                  onClick={(event) => {
                    event.preventDefault();
                    scrollTo("journey");
                  }}
                >
                  Learn Our Approach <ArrowRight size={16} />
                </a>
                <a
                  className="dc-text-link dc-text-link-muted"
                  href={visible.stylists ? "#salon-team" : "#treatments"}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollTo(visible.stylists ? "salon-team" : "treatments");
                  }}
                >
                  {visible.stylists ? "Meet the clinicians" : "See the treatments"}{" "}
                  <ArrowUpRight size={15} />
                </a>
              </div>
            </motion.div>
          </motion.div>
          <motion.div
            initial={canReveal ? "hidden" : false}
            whileInView={canReveal ? "show" : undefined}
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="dc-container dc-philosophy-pillars"
          >
            {PILLARS.map(({ title, text, Icon }) => (
              <motion.article key={title} variants={fade} className="dc-pillar">
                <span className="dc-pillar-icon" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.4} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </motion.article>
            ))}
          </motion.div>
        </section>
      )}
    </>
  );
}
