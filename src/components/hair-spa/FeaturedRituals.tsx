import { useHairSpa } from "./context";
import { ArrowRight, ArrowUpRight, Clock3, Leaf } from "lucide-react";
import { Reveal } from "./Reveal";
import { ServicePhoto } from "../ServicePhoto";

export function FeaturedRituals() {
  const model = useHairSpa();
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
                  Explore package and combination options when they are included
                  in the current service catalogue.
                </p>
              </Reveal>
            </div>
            {model.packages.length > 0 ? (
              <div className="kp-package-grid">
                {model.packages.map((item, index) => (
                  <article className="sf-service-card" key={item.id}>
                    <div className="kp-service-photo">
                      <ServicePhoto
                        service={item}
                        type={model.profile.businessType}
                        className="sf-service-image"
                      />
                    </div>
                    <div className="kp-service-content">
                      <p className="kp-service-category">{item.category}</p>
                      <h3>{item.name}</h3>
                      <p className="kp-service-description">
                        {item.description}
                      </p>
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
                        className="kp-card-link"
                        onClick={() => model.onBook(item)}
                      >
                        Enquire about this combination{" "}
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="kp-empty-services">
                Ask the sanctuary whether package options are currently
                available.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="kp-ritual-feature">
        <div className="kp-container kp-feature-grid">
          <Reveal className="kp-feature-image">
            <img
              src={model.galleryImages[0].src}
              alt="A quiet spa setting for a considered wellness ritual"
              loading="lazy"
            />
            <span className="kp-feature-seal">
              <Leaf size={18} />
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
            {model.featuredService && (
              <>
                <p className="kp-feature-treatment">
                  {model.featuredService.name}
                </p>
                <p>{model.featuredService.description}</p>
                <div className="kp-service-meta">
                  {model.featuredService.showDuration !== false &&
                    model.featuredService.durationMinutes > 0 && (
                      <span>
                        <Clock3 size={14} />
                        {model.featuredService.durationMinutes} min
                      </span>
                    )}
                  {model.featuredService.price > 0 && (
                    <strong>
                      {model.formatMoney(model.featuredService.price)}
                    </strong>
                  )}
                </div>
              </>
            )}
            {model.featuredService && (
              <button
                className="kp-button"
                onClick={() => model.onBook(model.featuredService)}
              >
                Explore this ritual <ArrowRight size={16} />
              </button>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
