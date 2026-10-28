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
              <p className="kp-eyebrow">OUR SERVICES</p>
              <h2>
                Choose your
                <br />
                <em>salon service.</em>
              </h2>
            </Reveal>
            <Reveal>
              <p>
                Find the services, prices and timings available at {model.profile.businessName}. If you need help choosing, just ask our team.
                {!model.profile.subdomain && " These are sample services and prices; please confirm the menu with the salon."}
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
            className="kp-service-grid sf-service-row grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
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
                  className={`kp-service-card sf-service-card flex flex-col h-full justify-between${index === 0 ? " is-featured" : ""}`}
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
                  <div className="kp-service-content flex-1 flex flex-col justify-between p-6">
                    <div>
                      <p className="kp-service-category">
                        {item.category || "SALON SERVICES"}
                      </p>
                      <h3>{item.name}</h3>
                      <p className="kp-service-description flex-1">{item.description}</p>
                    </div>
                    <div className="mt-4">
                      <div className="kp-service-meta mb-3">
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
                        {model.bookingAvailable ? "Book this service" : "Ask about this service"}{" "}
                        <ArrowUpRight size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
          </motion.div>
          {model.services.length === 0 && (
            <div className="kp-empty-services">
              <p>
                The service menu is being updated. Please contact the salon to ask what is available.
              </p>
              <button
                type="button"
                className="kp-card-link"
                onClick={() => model.scrollTo(model.hasAnyContact || model.openingHours.length ? "contact" : "home")}
              >
                Contact the salon
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
