import { useHairSpa } from "./context";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Reveal } from "./Reveal";
import { ServicePhoto } from "../ServicePhoto";
import {
  revealViewport,
  staggerContainer,
  staggerItem,
} from "../../utils/motion";

export function ServicesSection() {
  const model = useHairSpa();
  return (
    <>
      <section
        className="kp-treatments kp-section"
        id="treatments"
        data-layout="services"
      >
        <div className="kp-container">
          <div className="kp-section-heading">
            <Reveal>
              <p className="kp-eyebrow">THE TREATMENT MENU</p>
              <h2>
                Discover Your
                <br />
                <em>Signature Ritual.</em>
              </h2>
            </Reveal>
            <Reveal>
              <p>
                Choose a little time for yourself. Explore the rituals available
                at {model.profile.businessName}, with the details, duration and
                pricing saved in the current service menu.
              </p>
            </Reveal>
          </div>
          {model.serviceCategories.length > 1 && (
            <div
              className="kp-service-filters"
              role="group"
              aria-label="Service categories"
            >
              {["All", ...model.serviceCategories].map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={model.serviceCategory === category}
                  onClick={() => model.setServiceCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
          <motion.div
            className="kp-service-grid sf-service-row"
            variants={staggerContainer}
            initial={model.reduced || !model.canObserve ? "visible" : "hidden"}
            whileInView={model.canObserve ? "visible" : undefined}
            viewport={revealViewport}
          >
            {model.services
              .filter(
                (item) =>
                  model.serviceCategory === "All" ||
                  item.category === model.serviceCategory,
              )
              .map((item, index) => (
                <motion.article
                  className={`kp-service-card sf-service-card${index === 0 ? " is-featured" : ""}`}
                  key={item.id}
                  variants={staggerItem}
                  whileHover={model.reduced ? undefined : { y: -5 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="kp-service-photo">
                    <ServicePhoto
                      service={item}
                      type={model.profile.businessType}
                      className="sf-service-image"
                    />
                    <span className="kp-service-number">0{index + 1}</span>
                  </div>
                  <div className="kp-service-content">
                    <p className="kp-service-category">
                      {item.category || "HAIR & SCALP CARE"}
                    </p>
                    <h3>{item.name}</h3>
                    <p className="kp-service-description">{item.description}</p>
                    <div className="kp-service-meta">
                      {item.showDuration !== false &&
                        item.durationMinutes > 0 && (
                          <span>
                            <Clock3 size={14} />
                            {item.durationMinutes} min
                          </span>
                        )}
                      {item.price > 0 && (
                        <strong>{model.formatMoney(item.price)}</strong>
                      )}
                    </div>
                    <button
                      type="button"
                      className="kp-card-link"
                      onClick={() => model.book(item)}
                      aria-label={`Book ${item.name}`}
                    >
                      Choose for online booking{" "}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                </motion.article>
              ))}
          </motion.div>
          {model.services.length === 0 && (
            <div className="kp-empty-services">
              <p>
                The treatment menu is being updated. Please contact the
                sanctuary to ask about current treatments.
              </p>
              <button
                type="button"
                className="kp-card-link"
                onClick={() => model.scrollTo("contact")}
              >
                Contact the sanctuary
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
