import { useHairSpa } from "./context";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function BotanicalIngredients() {
  const model = useHairSpa();
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
              Our approach draws inspiration from nature's textures, familiar
              rituals and the restorative feeling of a thoughtfully prepared
              space. Ask the team about the ingredients and products used in
              your chosen treatment.
            </p>
            <a
              className="kp-inline-link"
              href="#contact"
              onClick={(event) => {
                event.preventDefault();
                model.scrollTo("contact");
              }}
            >
              Ask us a question <ArrowRight size={16} />
            </a>
          </Reveal>
          <Reveal className="kp-botanical-image">
            <img
              src="https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1300&q=85"
              alt="Sunlit green leaves with gentle natural textures"
              loading="lazy"
            />
            <span>Nature, never rushed.</span>
          </Reveal>
        </div>
      </section>
    </>
  );
}
