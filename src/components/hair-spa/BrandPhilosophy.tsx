import { useState } from "react";
import { useHairSpa } from "./context";
import { ArrowRight, ArrowUpRight, Flower2, Leaf, Sprout } from "lucide-react";
import { Reveal } from "./Reveal";
import { KESH_PRAKRITI_IMAGES } from "../../lib/keshPrakriti";

/** Bundled reference photograph — always labelled as a sample. */
const PHILOSOPHY_IMAGE = KESH_PRAKRITI_IMAGES.philosophy;

/**
 * The three ideas the whole template is built on. They are brand copy, not
 * medical claims: nothing here promises a cure, a result or an ingredient the
 * salon has not told us about.
 */
const PILLARS = [
  {
    title: "Ayurvedic scalp wisdom",
    text: "Oil, warmth and time. Our rituals follow the Indian tradition of caring for the scalp before the hair — the slow head massage, the herbal pack left to rest, the warm oil worked in at the roots.",
    Icon: Leaf,
  },
  {
    title: "Botanical ingredients",
    text: "Herbs such as bhringraj, amla, brahmi and neem, cold-pressed oils and fresh pastes ground for the day. Ask the team what is in any treatment and they will tell you before it touches your hair.",
    Icon: Sprout,
  },
  {
    title: "Organic sanctuary care",
    text: "A quiet room, clean linen, soft light and an unhurried hour. The pace is yours, the music stays low, and nothing is added to your visit that you did not ask for.",
    Icon: Flower2,
  },
] as const;

export function BrandPhilosophy() {
  const model = useHairSpa();
  const [imageFailed, setImageFailed] = useState(false);
  const businessName =
    model.profile.businessName?.trim() || "Kesh Prakriti";
  return (
    <section
      className="kp-philosophy kp-section"
      id="philosophy"
      data-layout="philosophy"
      aria-labelledby="kp-philosophy-title"
    >
      <div className="kp-container kp-philosophy-grid">
        <Reveal className="kp-philosophy-image">
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
              src={PHILOSOPHY_IMAGE}
              alt="Sample photograph of herbs, warm oil and folded linen in a hair spa treatment room"
              loading="lazy"
              decoding="async"
              width={1200}
              height={655}
              onError={() => setImageFailed(true)}
            />
          )}
          <span className="kp-image-note">
            Demo / sample · Oils, herbs and warm linen
          </span>
        </Reveal>
        <Reveal className="kp-philosophy-copy">
          <p className="kp-eyebrow">OUR PHILOSOPHY · ABOUT THE SANCTUARY</p>
          <h2 id="kp-philosophy-title">
            Rooted in
            <br />
            <em>Ayurvedic care.</em>
          </h2>
          <p className="kp-philosophy-lead">
            {businessName} began with a small idea: that a salon should feel
            like a pause, not another appointment to get through. We keep the
            room quiet, the pace unhurried and the welcome warm, so an hour of
            scalp care can settle your whole day.
          </p>
          <p>
            Our rituals follow the Ayurvedic tradition of looking after the
            scalp first — warm oil worked slowly into the roots, a herbal lepam
            left to rest, steam to soften, then a gentle wash. It is an approach
            built on patience rather than a fixed script: we ask what your hair
            and skin have been through, then recommend only what suits you.
          </p>
          <p>
            The ingredients are botanical and the quantities small. Herbs are
            ground for the day, oils are cold-pressed, and every treatment is
            mixed for the person in the chair. Ask us what is in anything on the
            menu — including the oils, the packs and the products we finish
            with — and we will show you before we begin.
          </p>
          <p>
            And the sanctuary itself is part of the treatment: fresh linen,
            filtered light, plants from the courtyard and the low hum of the
            steam room. Nothing in the room asks you to hurry.
          </p>
          <p className="kp-philosophy-signature">— The {businessName} team</p>
          <div className="kp-philosophy-actions">
            <a
              className="kp-inline-link"
              href={model.stylists.length ? "#team" : "#treatments"}
              onClick={(event) => {
                event.preventDefault();
                model.scrollTo(model.stylists.length ? "team" : "treatments");
              }}
            >
              {model.stylists.length
                ? "Meet the people who care for you"
                : "See what we offer"}{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <button
              type="button"
              className="kp-inline-link kp-inline-link-muted"
              onClick={() => model.scrollTo("treatments")}
            >
              Explore the treatment menu{" "}
              <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </div>
        </Reveal>
      </div>
      <div className="kp-container kp-philosophy-pillars">
        {PILLARS.map(({ title, text, Icon }, index) => (
          <Reveal
            key={title}
            className="kp-philosophy-pillar"
            delay={index * 0.06}
          >
            <span className="kp-pillar-icon" aria-hidden="true">
              <Icon size={19} />
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
