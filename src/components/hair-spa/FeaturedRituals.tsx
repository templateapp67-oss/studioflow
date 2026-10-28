import { useState } from "react";
import { useHairSpa } from "./context";
import { ArrowRight, ArrowUpRight, Clock3, Leaf } from "lucide-react";
import { Reveal } from "./Reveal";
import { ServicePhoto } from "../ServicePhoto";
import { KESH_PRAKRITI_IMAGES } from "../../lib/keshPrakriti";

export function FeaturedRituals() {
  const model = useHairSpa();
  const [imageFailed, setImageFailed] = useState(false);
  const packagesAvailable = model.packages.length > 0;
  return (
    <>
      {model.showPackages && (
        <section className="kp-packages kp-section" id="salon-packages">
          <div className="kp-container">
            <div className="kp-section-heading">
              <Reveal>
                <p className="kp-eyebrow">SIGNATURE COMBINATIONS</p>
                <h2>
                  More time for
                  <br />
                  <em>yourself.</em>
                </h2>
              </Reveal>
              <Reveal>
                <p>
                  Combination treatments are listed here only when they are part
                  of the current service catalogue, with the same saved prices
                  and durations shown elsewhere.
                </p>
              </Reveal>
            </div>
            {packagesAvailable ? (
              <div className="kp-package-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {model.packages.map((item) => (
                  <article className="sf-service-card kp-package-card flex flex-col h-full justify-between" key={item.id}>
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
                          {item.category || "Combination treatment"}
                        </p>
                        <h3>{item.name}</h3>
                        <p className="kp-service-description flex-1">
                          {item.description}
                        </p>
                      </div>
                      <div className="mt-4">
                        <div className="kp-service-meta mb-3">
                          {item.showDuration !== false &&
                            item.durationMinutes > 0 && (
                              <span>
                                <Clock3 size={14} aria-hidden="true" />
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
                        >
                          Choose this combination{" "}
                          <ArrowUpRight size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              /* No invented bundles: honest empty state with a working action. */
              <div className="kp-empty-services">
                <p>
                  No combination treatments are listed at the moment. The full
                  treatment menu above is up to date.
                </p>
                <button
                  type="button"
                  className="kp-card-link"
                  onClick={() => model.scrollTo("treatments")}
                >
                  View the treatment menu{" "}
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="kp-ritual-feature">
        <div className="kp-container kp-feature-grid">
          <Reveal className="kp-feature-image">
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
                src={KESH_PRAKRITI_IMAGES.headSpa}
                alt="Reference photograph of a head spa ritual with soft steam"
                loading="lazy"
                decoding="async"
                width={1200}
                height={655}
                onError={() => setImageFailed(true)}
              />
            )}
            <span className="kp-feature-seal">
              <Leaf size={18} aria-hidden="true" />
              TIME, JUST FOR YOU
            </span>
          </Reveal>
          <Reveal className="kp-feature-copy">
            <p className="kp-eyebrow">A MOMENT TO RETURN TO YOURSELF</p>
            <h2>
              Care that feels
              <br />
              <em>like a deep breath.</em>
            </h2>
            {model.featuredService ? (
              <>
                <p className="kp-feature-treatment">
                  {model.featuredService.name}
                </p>
                <p>{model.featuredService.description}</p>
                <div className="kp-service-meta">
                  {model.featuredService.showDuration !== false &&
                    model.featuredService.durationMinutes > 0 && (
                      <span>
                        <Clock3 size={14} aria-hidden="true" />
                        {model.featuredService.durationMinutes} min
                      </span>
                    )}
                  {model.featuredService.price > 0 && (
                    <strong>
                      {model.formatMoney(model.featuredService.price)}
                    </strong>
                  )}
                </div>
                <button
                  type="button"
                  className="kp-button"
                  onClick={() => model.book(model.featuredService)}
                >
                  Book this ritual <ArrowRight size={16} aria-hidden="true" />
                </button>
              </>
            ) : (
              <p>
                The treatment menu is being updated. Contact the sanctuary to
                ask what is currently available.
              </p>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
