import { useHairSpa } from "./context";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { KESH_PRAKRITI_IMAGES } from "../../lib/keshPrakriti";

export function SanctuarySection() {
  const model = useHairSpa();
  return (
    <>
      <section className="kp-sanctuary" id="sanctuary">
        {/* Decorative background: the section text carries the meaning, so the
            image is exposed as a labelled sample instead of an empty div. */}
        <div
          className="kp-sanctuary-image"
          role="img"
          aria-label="Demo / sample photograph of a quiet spa treatment room"
          style={{
            backgroundImage: `linear-gradient(90deg,rgba(16,43,36,.82),rgba(16,43,36,.18)),url(${KESH_PRAKRITI_IMAGES.sanctuary})`,
          }}
        />
        <div className="kp-container kp-sanctuary-content">
          <Reveal>
            <p className="kp-eyebrow kp-light">OUR SALON</p>
            <h2>
              A welcoming place
              <br />
              to <em>relax.</em>
            </h2>
            <p>
              Take a break from your day and enjoy some time for yourself.
            </p>
            <button
              className="kp-button kp-button-ivory"
              onClick={() => model.book(model.firstService)}
            >
              Plan your visit <ArrowRight size={16} />
            </button>
          </Reveal>
        </div>
      </section>
    </>
  );
}
