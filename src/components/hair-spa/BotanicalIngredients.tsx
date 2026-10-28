import { useState } from "react";
import { useHairSpa } from "./context";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { KESH_PRAKRITI_IMAGES } from "../../lib/keshPrakriti";

export function BotanicalIngredients() {
  const model = useHairSpa();
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <>
      <section className="kp-botanical kp-section" id="botanical">
        <div className="kp-container kp-botanical-grid">
          <Reveal className="kp-botanical-copy">
            <p className="kp-eyebrow">HAIR CARE WITH HERBS</p>
            <h2>
              Familiar care,
              <br />
              <em>made with care.</em>
            </h2>
            <p>
              From hair oils to herbal packs, ask our team about the products used in your service. Please tell us about any allergies or sensitive skin before your visit.
            </p>
            {/* Only link to the contact section when it actually renders. */}
            <a
              className="kp-inline-link"
              href={model.hasAnyContact ? "#contact" : "#treatments"}
              onClick={(event) => {
                event.preventDefault();
                model.scrollTo(model.hasAnyContact ? "contact" : "treatments");
              }}
            >
              {model.hasAnyContact ? "Ask us a question" : "See our services"}{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </Reveal>
          <Reveal className="kp-botanical-image">
            {imageFailed ? (
              <div
                className="kp-image-placeholder"
                role="img"
                aria-label="Reference photograph unavailable"
              >
                <span>Demo / sample photograph</span>
              </div>
            ) : (
              <img
                src={KESH_PRAKRITI_IMAGES.botanical}
                alt="Reference photograph of fresh botanical ingredients and herbal hair-care oils"
                loading="lazy"
                decoding="async"
                width={1200}
                height={655}
                onError={() => setImageFailed(true)}
              />
            )}
            <span>Demo / sample · Herbal hair care.</span>
          </Reveal>
        </div>
      </section>
    </>
  );
}
