import { EditorialImage } from "./EditorialImage";
import { useDermacure } from "./context";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function TechnologyShowcase() {
  const { reduced, visible, services, profile } = useDermacure();
  const canReveal =
    typeof window !== "undefined" &&
    "IntersectionObserver" in window &&
    !reduced;
  const equipment =
    profile.clinicTechnology?.approved && profile.clinicTechnology.name.trim()
      ? profile.clinicTechnology
      : null;
  return (
    <>
      <section className="dc-tech" id="technology">
        <div className="dc-tech-image">
          <EditorialImage
            fallback={"/templates/dermacure/technology.webp"}
            src={equipment?.imageUrl || "/templates/dermacure/technology.webp"}
            alt={
              equipment?.imageUrl
                ? equipment.name
                : "Illustrative dermatology equipment, not a photograph of the clinic’s equipment"
            }
            loading="lazy"
          />
        </div>
        <motion.div
          className="dc-tech-copy"
          initial={canReveal ? { opacity: 0, y: 20 } : false}
          whileInView={canReveal ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, amount: 0.2 }}
        >
          <p className="dc-eyebrow">
            <span /> OUR TECHNOLOGY
          </p>
          <h2>
            Advanced Technology.
            <br />
            <em>Thoughtful Care.</em>
          </h2>
          <p>
            Treatment selection starts with an individual assessment. Ask your
            clinician about suitability, preparation, recovery and the equipment
            used for your care.
          </p>
          {equipment && (
            <dl className="dc-tech-specs">
              <div>
                <dt>Equipment</dt>
                <dd>{equipment.name}</dd>
              </div>
              {equipment.manufacturer && (
                <div>
                  <dt>Manufacturer</dt>
                  <dd>{equipment.manufacturer}</dd>
                </div>
              )}
              {equipment.specifications && (
                <div>
                  <dt>Clinic-approved specifications</dt>
                  <dd>{equipment.specifications}</dd>
                </div>
              )}
            </dl>
          )}
          {!equipment?.imageUrl && (
            <p className="dc-technology-note">
              Illustrative equipment image. Your clinician can explain the
              equipment and settings appropriate to your treatment.
            </p>
          )}
          <a
            href={
              visible.services && services.length ? "#directory" : "#journey"
            }
            className="dc-light-link"
          >
            Explore Treatment Options <ArrowRight size={16} />
          </a>
          <div className="dc-tech-index">
            02 <span>/</span> THE EXPERIENCE
          </div>
        </motion.div>
      </section>
    </>
  );
}
