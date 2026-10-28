import { useState } from "react";
import { useHairSpa } from "./context";
import { ArrowUpRight, Leaf } from "lucide-react";
import { motion } from "motion/react";
import { Reveal } from "./Reveal";
import { keshTeamPortrait } from "../../lib/keshPrakriti";
import {
  revealViewport,
  staggerContainer,
  staggerItem,
} from "../../utils/motion";

/**
 * The portrait for one specialist.
 *
 * Resolution order: the salon's own saved photo, then the bundled demo
 * portrait for the three people the template ships with, then an honest
 * labelled placeholder. The image box always keeps its ratio, so a portrait
 * that fails to load can never collapse the card or push the grid around.
 */
function SpecialistPhoto({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string;
}) {
  const portrait = keshTeamPortrait({ name, avatarUrl });
  const [failedSrc, setFailedSrc] = useState<string>("");
  const usable = Boolean(portrait.src) && failedSrc !== portrait.src;
  return (
    <div className="kp-team-photo" data-portrait={portrait.isDemo ? "demo" : "saved"}>
      {usable ? (
        <img
          src={portrait.src}
          alt={`${name}, ${portrait.isDemo ? "demo / sample portrait" : "salon team member"}`}
          loading="lazy"
          decoding="async"
          width={1408}
          height={768}
          onError={() => setFailedSrc(portrait.src)}
        />
      ) : (
        <span
          role="img"
          aria-label={`Photo not added for ${name}`}
          title="The salon has not added a photo for this specialist yet"
        >
          <Leaf size={25} aria-hidden="true" />
        </span>
      )}
      {usable && portrait.isDemo && (
        <small className="kp-photo-note">Demo / sample portrait</small>
      )}
    </div>
  );
}

export function TeamSection() {
  const model = useHairSpa();
  if (!model.stylists.length) return null;
  return (
    <section
      className="kp-team kp-section"
      id="team"
      data-layout="team"
      aria-labelledby="kp-team-title"
    >
      <div className="kp-container">
        <div className="kp-section-heading">
          <Reveal>
            <p className="kp-eyebrow">OUR TEAM</p>
            <h2 id="kp-team-title">
              Meet your
              <br />
              <em>care companions.</em>
            </h2>
          </Reveal>
          <Reveal>
            <p>
              The hands behind every ritual. Choose the person you would like
              when you book, or tell us what you need and we will match you with
              the right specialist. Each of them will explain what they are
              using before they begin.
            </p>
          </Reveal>
        </div>
        <motion.ul
          className="kp-team-grid"
          variants={staggerContainer}
          initial={model.reduced || !model.canObserve ? "visible" : "hidden"}
          whileInView={model.canObserve ? "visible" : undefined}
          viewport={revealViewport}
        >
          {model.stylists.map((person, index) => (
            <motion.li className="kp-team-card" variants={staggerItem} key={person.id}>
              <SpecialistPhoto name={person.name} avatarUrl={person.avatarUrl} />
              <p className="kp-eyebrow">
                SALON TEAM · {String(index + 1).padStart(2, "0")}
              </p>
              <h3>{person.name}</h3>
              {person.role?.trim() && (
                <p className="kp-team-role">{person.role}</p>
              )}
              {Boolean(person.specialties?.length) && (
                <ul className="kp-team-specialties">
                  {person.specialties.slice(0, 3).map((specialty) => (
                    <li key={specialty}>{specialty}</li>
                  ))}
                </ul>
              )}
              {person.bio?.trim() && (
                <p className="kp-team-bio">{person.bio}</p>
              )}
              <div className="kp-team-actions">
                <button
                  type="button"
                  className="kp-team-profile-link"
                  onClick={() => model.onViewSpecialist(person.id)}
                >
                  View profile &amp; reviews
                </button>
                <button
                  type="button"
                  className="kp-card-link"
                  onClick={() => model.book(undefined, person)}
                >
                  Request{" "}
                  {person.name
                    .replace(/^(dr|mr|mrs|ms)\.?\s+/i, "")
                    .split(" ")[0]}{" "}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </button>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
