import { clinicPriceIsVerified, clinicPriceLabel } from "../../lib/dermacureContent";
import { dermacureFeatured } from "../../lib/dermacureContent";
import { EditorialImage } from "./EditorialImage";
import { useDermacure } from "./context";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight, Flower2 } from "lucide-react";
import { fade, stagger, treatmentImage } from "./animation";

export function FeaturedTreatments() {
  const {
    visible,
    services,
    reduced,
    profile,
    bookingAvailable,
    onBook,
    enquire,
  } = useDermacure();
  const featured = dermacureFeatured(profile, services);
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
                  <span /> {profile.sectionHeadings?.signatureEyebrow || "Popular Treatments"}
                </p>
                <h2>
                  {profile.sectionHeadings?.signatureTitle || "Our Most Popular Treatments"}
                </h2>
              </div>
              <a className="dc-text-link" href="#directory">
                See All Treatments <ArrowRight size={16} />
              </a>
            </div>
            <p className="dc-section-sub">
              {profile.sectionHeadings?.signatureSubtitle || "Explore popular treatments at our clinic."}
            </p>
            <motion.div
              className="dc-feature-grid"
              variants={stagger}
              initial={canReveal ? "hidden" : false}
              whileInView={canReveal ? "show" : undefined}
              viewport={{ once: true, amount: 0.2 }}
            >
              {featured.map((s) => (
                <motion.article
                  variants={fade}
                  key={s.id}
                  className="dc-feature-card"
                >
                  <div className="dc-card-image">
                    <EditorialImage
                      fallback={treatmentImage(s)}
                      className="sf-service-image"
                      src={s.imageUrl || treatmentImage(s)}
                      alt={
                        s.clinicDemoData
                          ? `${s.name} — illustrative demo image`
                          : s.imageUrl
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
                        {clinicPriceLabel(s, profile.currency || "₹")}
                        {s.showDuration !== false && s.durationMinutes > 0
                          ? `  ·  ${s.durationMinutes} min`
                          : ""}
                      </span>
                      <button
                        onClick={() =>
                          bookingAvailable && clinicPriceIsVerified(s) ? onBook(s) : enquire(s)
                        }
                        aria-label={`Explore ${s.name}`}
                      >
                        {bookingAvailable && clinicPriceIsVerified(s) ? "Book now" : "Get More Info"} <ArrowUpRight size={16} />
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
