import { useHairSpa } from "./context";
import { ArrowUpRight, Leaf } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Reveal } from "./Reveal";
import {
  revealViewport,
  staggerContainer,
  staggerItem,
} from "../../utils/motion";

export function TeamSection() {
  const model = useHairSpa();
  return (
    <>
      {model.stylists.length > 0 && (
        <section className="kp-team kp-section" id="team" data-layout="team">
          <div className="kp-container">
            <div className="kp-section-heading">
              <Reveal>
                <p className="kp-eyebrow">THE PEOPLE WHO CARE</p>
                <h2>
                  Meet your
                  <br />
                  <em>care companions.</em>
                </h2>
              </Reveal>
              <Reveal>
                <p>
                  Get to know the team listed by the sanctuary. Choose someone
                  when you send a booking enquiry, or leave the selection open.
                </p>
              </Reveal>
            </div>
            <motion.div
              className="kp-team-grid"
              variants={staggerContainer}
              initial={
                model.reduced || !model.canObserve ? "visible" : "hidden"
              }
              whileInView={model.canObserve ? "visible" : undefined}
              viewport={revealViewport}
            >
              {model.stylists.map((person, index) => (
                <motion.article
                  className="kp-team-card"
                  variants={staggerItem}
                  key={person.id}
                >
                  <div className="kp-team-photo">
                    {person.avatarUrl ? (
                      <img
                        src={person.avatarUrl}
                        alt={person.name}
                        loading="lazy"
                      />
                    ) : (
                      <span>
                        <Leaf size={25} />
                      </span>
                    )}
                  </div>
                  <p className="kp-eyebrow">SANCTUARY TEAM · 0{index + 1}</p>
                  <h3>{person.name}</h3>
                  <p className="kp-team-role">{person.role}</p>
                  <button
                    className="kp-team-profile-link"
                    onClick={() => model.onViewSpecialist(person.id)}
                  >
                    View profile &amp; reviews
                  </button>
                  <button
                    className="kp-card-link"
                    onClick={() => model.onBook(undefined, person)}
                  >
                    Enquire with {person.name.split(" ")[0]}{" "}
                    <ArrowUpRight size={15} />
                  </button>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>
      )}
    </>
  );
}
