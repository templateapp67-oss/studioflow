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
                alt="Sample photo of herbal hair care at a salon"
                loading="lazy"
                decoding="async"
                width={1200}
                height={655}
                onError={() => setImageFailed(true)}
              />
            )}
            <span className="kp-image-note">
              Demo / sample · Care for you
            </span>
          </Reveal>
          <Reveal className="kp-philosophy-copy">
            <p className="kp-eyebrow">OUR APPROACH</p>
            <h2>
              Good care, <em>made for you.</em>
            </h2>
            <p>
              Tell us what you need, and our team will help you choose the right service.
            </p>
            <p>
              Whether it is a hair spa, cleanup or a special occasion, we want you to feel comfortable and welcome.
            </p>
            <a
              className="kp-inline-link"
              href="#journey"
              onClick={(event) => {
                event.preventDefault();
                model.scrollTo("journey");
              }}
            >
              How your visit works <ArrowRight size={16} />
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
