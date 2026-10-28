import { EditorialImage } from "./EditorialImage";
import { useDermacure } from "./context";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight, Flower2 } from "lucide-react";
import { fade, stagger, images } from "./animation";

export function FeaturedTreatments() {
  const {
    visible,
    services,
    reduced,
    profile,
    bookingAvailable,
    onBook,
    booking,
  } = useDermacure();
  const canReveal =
    typeof window !== "undefined" &&
    "IntersectionObserver" in window &&
    !reduced;
  return (
    <>
      {visible.services && services.length > 0 && (
        <section className="dc-services dc-section" id="treatments">
          <div className="dc-container">
            <div className="dc-section-top">
              <div>
                <p className="dc-eyebrow">
                  <span /> FEATURED
                </p>
                <h2>
                  Our Signature <em>Treatments</em>
                </h2>
              </div>
              <a className="dc-text-link" href="#directory">
                View all treatments <ArrowRight size={16} />
              </a>
            </div>
            <p className="dc-section-sub">
              Explore selected treatments and consultation options suited to
              different skin concerns.
            </p>
            <motion.div
              className="dc-feature-grid"
              variants={stagger}
              initial={canReveal ? "hidden" : false}
              whileInView={canReveal ? "show" : undefined}
              viewport={{ once: true, amount: 0.2 }}
            >
              {services.slice(0, 4).map((s, i) => (
                <motion.article
                  variants={fade}
                  key={s.id}
                  className="dc-feature-card"
                >
                  <div className="dc-card-image">
                    <EditorialImage
                      fallback={images[i]}
                      className="sf-service-image"
                      src={s.imageUrl || images[i]}
                      alt={
                        s.imageUrl
                          ? s.name
                          : `${s.name} — illustrative treatment image`
                      }
                      width="600"
                      height="400"
                      loading="lazy"
                    />
                    <span className="dc-feature-icon">
                      <Flower2 size={22} strokeWidth={1} />
                    </span>
                  </div>
                  <div className="dc-card-body">
                    <p className="dc-card-category">{s.category}</p>
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                    <div className="dc-card-foot">
                      <span>
                        {s.price > 0
                          ? `${profile.currency || "₹"}${s.price.toLocaleString("en-IN")}`
                          : ""}
                        {s.showDuration !== false && s.durationMinutes > 0
                          ? `  ·  ${s.durationMinutes} min`
                          : ""}
                      </span>
                      <button
                        onClick={() =>
                          bookingAvailable ? onBook(s) : booking()
                        }
                        aria-label={`Explore ${s.name}`}
                      >
                        <ArrowUpRight size={19} />
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>
      )}
    </>
  );
}
