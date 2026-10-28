import { useHairSpa } from "./context";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function SanctuarySection() {
  const model = useHairSpa();
  return (
    <>
      <section className="kp-sanctuary" id="sanctuary">
        <div
          className="kp-sanctuary-image"
          style={{
            backgroundImage: `linear-gradient(90deg,rgba(16,43,36,.82),rgba(16,43,36,.18)),url(${model.galleryImages[2].src})`,
          }}
        />
        <div className="kp-container kp-sanctuary-content">
          <Reveal>
            <p className="kp-eyebrow kp-light">THE SANCTUARY</p>
            <h2>
              A little space
              <br />
              to <em>exhale.</em>
            </h2>
            <p>
              A calm, welcoming environment for thoughtful hair and scalp care.
              Your time here is yours.
            </p>
            <button
              className="kp-button kp-button-ivory"
              onClick={() => model.onBook(model.firstService)}
            >
              Plan your visit <ArrowRight size={16} />
            </button>
          </Reveal>
        </div>
      </section>
    </>
  );
}
