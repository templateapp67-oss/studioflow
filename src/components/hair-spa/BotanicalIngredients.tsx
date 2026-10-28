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
            <p className="kp-eyebrow">ROOTED IN NATURE</p>
            <h2>
              Inspired by the
              <br />
              <em>quiet of botanicals.</em>
            </h2>
            <p>
              Our approach draws inspiration from nature&apos;s textures, familiar
              rituals and the calm of a thoughtfully prepared space. Ask the
              team about the ingredients and products used in your chosen
              treatment before your visit.
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
              {model.hasAnyContact ? "Ask us a question" : "Explore the treatment menu"}{" "}
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
            <span>Demo / sample · Nature, never rushed.</span>
          </Reveal>
        </div>
      </section>
    </>
  );
}
