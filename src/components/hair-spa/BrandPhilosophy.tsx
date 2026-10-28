import { useState } from "react";
import { useHairSpa } from "./context";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { KESH_PRAKRITI_IMAGES } from "../../lib/keshPrakriti";

/** Bundled reference photograph — always labelled as a sample. */
const PHILOSOPHY_IMAGE = KESH_PRAKRITI_IMAGES.philosophy;

export function BrandPhilosophy() {
  const model = useHairSpa();
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <>
      <section className="kp-philosophy kp-section" id="philosophy">
        <div className="kp-container kp-philosophy-grid">
          <Reveal className="kp-philosophy-image">
            {imageFailed ? (
              <div className="kp-image-placeholder" role="img" aria-label="Reference photograph unavailable">
                <span>Demo / sample photograph</span>
              </div>
            ) : (
              <img
                src={PHILOSOPHY_IMAGE}
                alt="Reference photograph of warm botanical details in a hair wellness space"
                loading="lazy"
                decoding="async"
                width={1200}
                height={655}
                onError={() => setImageFailed(true)}
              />
            )}
            <span className="kp-image-note">
              Demo / sample · A quieter kind of care
            </span>
          </Reveal>
          <Reveal className="kp-philosophy-copy">
            <p className="kp-eyebrow">CARE, WITH INTENTION</p>
            <h2>
              A More Thoughtful Approach to Hair <em>&amp; Scalp Care.</em>
            </h2>
            <p>
              Every visit begins with a conversation about what you would like
              to change or care for, so you can choose a treatment that feels
              right for you.
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
