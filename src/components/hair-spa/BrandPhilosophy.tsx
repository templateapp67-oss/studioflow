import { useHairSpa } from "./context";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function BrandPhilosophy() {
  const model = useHairSpa();
  return (
    <>
      <section className="kp-philosophy kp-section" id="philosophy">
        <div className="kp-container kp-philosophy-grid">
          <Reveal className="kp-philosophy-image">
            <img
              src="https://images.unsplash.com/photo-1512290900672-1f55b9e07506?auto=format&fit=crop&w=1200&q=85"
              alt="Soft botanical details in a peaceful hair wellness space"
              loading="lazy"
            />
            <span className="kp-image-note">A quieter kind of care</span>
          </Reveal>
          <Reveal className="kp-philosophy-copy">
            <p className="kp-eyebrow">CARE, WITH INTENTION</p>
            <h2>
              A More Thoughtful Approach to Hair <em>&amp; Scalp Care.</em>
            </h2>
            <p>
              Every visit begins with listening. We make space for your
              individual hair and scalp concerns, then help you explore a
              treatment that feels right for you.
            </p>
            <p>
              From a calming spa ritual to botanical-inspired care, the
              experience is designed to feel personal, unhurried and welcoming.
            </p>
            <a
              className="kp-inline-link"
              href="#journey"
              onClick={(event) => {
                event.preventDefault();
                model.scrollTo("journey");
              }}
            >
              Discover our approach <ArrowRight size={16} />
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
