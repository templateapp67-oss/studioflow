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
            <p className="kp-eyebrow">OUR PHILOSOPHY</p>
            <h2>
              Rooted in
              <br />
              <em>simple rituals.</em>
            </h2>
            <p>
              Kesh Prakriti began with a small idea: that a salon should feel
              like a pause, not another appointment to get through. We keep the
              room quiet, the pace unhurried and the welcome warm.
            </p>
            <p>
              Our approach is led by attention rather than a fixed script. We
              ask what your hair and skin have been through, recommend only
              what suits you, and never add pressure to your visit.
            </p>
            <p className="kp-philosophy-signature">
              — The {model.profile.businessName} team
            </p>
            <a
              className="kp-inline-link"
              href={model.stylists.length ? "#team" : "#treatments"}
              onClick={(event) => {
                event.preventDefault();
                model.scrollTo(model.stylists.length ? "team" : "treatments");
              }}
            >
              {model.stylists.length ? "Meet the people who care for you" : "See what we offer"}{" "}
              <ArrowRight size={16} />
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
