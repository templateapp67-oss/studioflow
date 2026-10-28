import { useState } from "react";
import { useHairSpa } from "./context";
import { ArrowDown, ArrowUpRight, Clock3 } from "lucide-react";
import { motion } from "motion/react";
import { Reveal } from "./Reveal";
import { ServicePhoto } from "../ServicePhoto";
import type { SalonService } from "../../types";
import { keshSignatureServices } from "../../lib/keshPrakriti";
import {
  revealViewport,
  staggerContainer,
  staggerItem,
} from "../../utils/motion";

/** Stable, URL-safe anchor for one catalogue entry (used by the signature index). */
const serviceAnchor = (id: string) =>
  `kp-service-${String(id || "").replace(/[^\w-]/g, "")}`;

function ServiceMeta({ service }: { service: SalonService }) {
  const model = useHairSpa();
  return (
    <div className="kp-service-meta">
      {service.showDuration !== false && service.durationMinutes > 0 && (
        <span>
          <Clock3 size={14} aria-hidden="true" />
          {service.durationMinutes} min
        </span>
      )}
      {service.price > 0 && <strong>{model.formatMoney(service.price)}</strong>}
    </div>
  );
}

/**
 * One section owns the entire service catalogue: a curated signature index,
 * the filterable menu and the salon's packages. Every card is rendered from
 * `model.services` exactly once — the index links into the menu instead of
 * repeating a card, and packages are lifted out of the main grid only when
 * they are shown in the packages block below it.
 */
export function ServicesSection() {
  const model = useHairSpa();
  const [highlightId, setHighlightId] = useState("");

  const packagesShown = model.showPackages && model.packages.length > 0;
  const packageIds = new Set(model.packages.map((item) => item.id));
  const menuServices = packagesShown
    ? model.services.filter((item) => !packageIds.has(item.id))
    : model.services;
  const menuCategories = Array.from(
    new Set(
      menuServices
        .map((item) => String(item.category || "").trim())
        .filter(Boolean),
    ),
  );
  const activeCategory =
    model.serviceCategory === "All" ||
    menuCategories.includes(model.serviceCategory)
      ? model.serviceCategory
      : "All";
  const visibleServices = menuServices.filter(
    (item) => activeCategory === "All" || item.category === activeCategory,
  );
  /* A curated index only makes sense when it is a selection of the menu. */
  const signatureServices =
    menuServices.length > 3 ? keshSignatureServices(menuServices, 3) : [];

  const revealService = (service: SalonService) => {
    // Show the whole menu first so the chosen card is guaranteed to be present.
    model.setServiceCategory("All");
    setHighlightId(service.id);
    if (typeof document === "undefined") return;
    const focus = () =>
      document
        .getElementById(serviceAnchor(service.id))
        ?.scrollIntoView({
          behavior: model.reduced ? "auto" : "smooth",
          block: "center",
        });
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(focus);
    else focus();
  };

  const chooseCategory = (category: string) => {
    setHighlightId("");
    model.setServiceCategory(category);
  };

  return (
    <section
      className="kp-treatments kp-section"
      id="treatments"
      data-layout="services"
      aria-labelledby="kp-treatments-title"
    >
      <div className="kp-container">
        <div className="kp-section-heading">
          <Reveal>
            <p className="kp-eyebrow">THE SERVICE MENU</p>
            <h2 id="kp-treatments-title">
              The full menu,
              <br />
              <em>in one place.</em>
            </h2>
          </Reveal>
          <Reveal>
            <p>
              Every treatment {model.profile.businessName} offers, with its
              price and the time it takes. If you are unsure what to choose,
              ask our team.
              {!model.profile.subdomain &&
                " These are sample services and prices; please confirm the menu with the salon."}
            </p>
            {packagesShown && (
              <button
                type="button"
                className="kp-inline-link"
                onClick={() => {
                  if (typeof document === "undefined") return;
                  document
                    .getElementById("salon-packages")
                    ?.scrollIntoView({
                      behavior: model.reduced ? "auto" : "smooth",
                      block: "start",
                    });
                }}
              >
                Looking for a package? <ArrowDown size={14} aria-hidden="true" />
              </button>
            )}
          </Reveal>
        </div>

        {signatureServices.length >= 2 && (
          <Reveal className="kp-signature">
            <div className="kp-signature-head">
              <p className="kp-eyebrow">SIGNATURE TREATMENTS</p>
              <h3>Not sure where to begin?</h3>
              <p>
                Three treatments our guests come back for. Choose one to find
                it in the menu below.
              </p>
            </div>
            <ul className="kp-signature-list">
              {signatureServices.map((service, index) => (
                <li key={service.id}>
                  <button
                    type="button"
                    className={
                      highlightId === service.id ? "is-active" : undefined
                    }
                    aria-label={`Find ${service.name} in the service menu`}
                    onClick={() => revealService(service)}
                  >
                    <span className="kp-signature-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="kp-signature-name">{service.name}</span>
                    <span className="kp-signature-meta">
                      {service.category || "Salon service"}
                      {service.showDuration !== false &&
                        service.durationMinutes > 0 &&
                        ` · ${service.durationMinutes} min`}
                    </span>
                    <ArrowDown size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        {menuCategories.length > 1 && (
          <div
            className="kp-service-filters"
            role="group"
            aria-label="Service categories"
          >
            {["All", ...menuCategories].map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={activeCategory === category}
                onClick={() => chooseCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        <div id="kp-service-menu">
          <motion.div
            className="kp-service-grid sf-service-row grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
            variants={staggerContainer}
            initial={model.reduced || !model.canObserve ? "visible" : "hidden"}
            whileInView={model.canObserve ? "visible" : undefined}
            viewport={revealViewport}
          >
            {visibleServices.map((item, index) => (
              <motion.article
                id={serviceAnchor(item.id)}
                className={`kp-service-card sf-service-card flex flex-col h-full justify-between${
                  index === 0 ? " is-featured" : ""
                }${highlightId === item.id ? " is-highlighted" : ""}`}
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
                  <span className="kp-service-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="kp-service-content flex-1 flex flex-col justify-between p-6">
                  <div>
                    <p className="kp-service-category">
                      {item.category || "SALON SERVICES"}
                    </p>
                    <h3>{item.name}</h3>
                    <p className="kp-service-description flex-1">
                      {item.description}
                    </p>
                  </div>
                  <div className="mt-4">
                    <ServiceMeta service={item} />
                    <button
                      type="button"
                      className="kp-card-link"
                      onClick={() => model.book(item)}
                      aria-label={`Book ${item.name}`}
                    >
                      {model.bookingAvailable
                        ? "Book this service"
                        : "Ask about this service"}{" "}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
          {visibleServices.length === 0 && model.services.length > 0 && (
            <div className="kp-empty-services">
              <p>No treatments are listed in this category right now.</p>
              <button
                type="button"
                className="kp-card-link"
                onClick={() => chooseCategory("All")}
              >
                See the full menu
              </button>
            </div>
          )}
        </div>

        {model.services.length === 0 && (
          <div className="kp-empty-services">
            <p>
              The service menu is being updated. Please contact the salon to ask
              what is available.
            </p>
            <button
              type="button"
              className="kp-card-link"
              onClick={() =>
                model.scrollTo(
                  model.hasAnyContact || model.openingHours.length
                    ? "contact"
                    : "home",
                )
              }
            >
              Contact the salon
            </button>
          </div>
        )}

        {packagesShown && (
          /* Packages are services too: same saved data, shown once, inside the
             catalogue section instead of as a second services section. */
          <section
            className="kp-packages-block"
            id="salon-packages"
            aria-labelledby="kp-packages-title"
          >
            <div className="kp-packages-head">
              <div>
                <p className="kp-eyebrow">SALON PACKAGES</p>
                <h3 id="kp-packages-title">More time for yourself.</h3>
              </div>
              <p>
                Combine two treatments in one visit. The price and duration
                below are for the package as a whole.
              </p>
            </div>
            <div className="kp-package-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {model.packages.map((item) => (
                <article
                  className="sf-service-card kp-package-card flex flex-col h-full justify-between"
                  key={item.id}
                >
                  <div className="kp-service-photo">
                    <ServicePhoto
                      service={item}
                      type={model.profile.businessType}
                      className="sf-service-image"
                    />
                  </div>
                  <div className="kp-service-content flex-1 flex flex-col justify-between p-6">
                    <div>
                      <p className="kp-service-category">
                        {item.category || "Salon package"}
                      </p>
                      <h4>{item.name}</h4>
                      <p className="kp-service-description flex-1">
                        {item.description}
                      </p>
                    </div>
                    <div className="mt-4">
                      <ServiceMeta service={item} />
                      <button
                        type="button"
                        className="kp-card-link"
                        onClick={() => model.book(item)}
                      >
                        Book this package{" "}
                        <ArrowUpRight size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
