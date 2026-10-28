import { useState } from "react";
import { useHairSpa } from "./context";
import { ArrowUpRight, Leaf } from "lucide-react";
import { motion } from "motion/react";
import { Reveal } from "./Reveal";
import { validStaffUrl } from "../../lib/staffProfile";
import {
  revealViewport,
  staggerContainer,
  staggerItem,
} from "../../utils/motion";

/**
 * Specialist card that only renders a photo the salon actually saved. There is
 * no stock portrait fallback, so no invented person is ever shown.
 */
function SpecialistPhoto({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const [failed, setFailed] = useState(false);
  const usable = Boolean(avatarUrl && validStaffUrl(avatarUrl) && !failed);
  return (
    <div className="kp-team-photo">
      {usable ? (
        <img
          src={avatarUrl}
          alt={`${name}, specialist at the sanctuary`}
          loading="lazy"
          decoding="async"
          width={320}
          height={320}
          onError={() => setFailed(true)}
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
            <p className="kp-eyebrow">THE PEOPLE WHO CARE</p>
            <h2 id="kp-team-title">
              Meet your
              <br />
              <em>care companions.</em>
            </h2>
          </Reveal>
          <Reveal>
            <p>
              Get to know the team listed by the sanctuary. Choose someone when
              you send a booking request, or leave the selection open.
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
                SANCTUARY TEAM · {String(index + 1).padStart(2, "0")}
              </p>
              <h3>{person.name}</h3>
              {person.role?.trim() && (
                <p className="kp-team-role">{person.role}</p>
              )}
              {person.bio?.trim() && (
                <p className="kp-team-bio text-sm opacity-85 mt-2">{person.bio}</p>
              )}
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
                Request {person.name.split(" ")[0]}{" "}
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
