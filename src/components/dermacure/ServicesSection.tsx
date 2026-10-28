import { EditorialImage } from "./EditorialImage";
import { useDermacure } from "./context";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { fade, stagger, images } from "./animation";

export function ServicesSection() {
  const {
    visible,
    services,
    reduced,
    profile,
    bookingAvailable,
    onBook,
    booking,
  } = useDermacure();
  const [category, setCategory] = useState("All");
  const categories = Array.from(
    new Set(
      services.map((service) => service.category?.trim()).filter(Boolean),
    ),
  );
  const activeCategory =
    category === "All" || categories.includes(category) ? category : "All";
  const filtered = services.filter(
    (service) =>
      activeCategory === "All" || service.category?.trim() === activeCategory,
  );
  const canReveal =
    typeof window !== "undefined" &&
    "IntersectionObserver" in window &&
    !reduced;
  return (
    <>
      {visible.services && services.length > 0 && (
        <section className="dc-directory dc-section" id="directory">
          <div className="dc-container">
            <div className="dc-section-top">
              <div>
                <p className="dc-eyebrow">
                  <span /> OUR TREATMENTS
                </p>
                <h2>
                  Comprehensive Care for
                  <br />
                  <em>Every Skin Concern.</em>
                </h2>
              </div>
              <p>
                Explore our treatment menu and find a starting point for your
                skin journey.
              </p>
            </div>
            {categories.length > 1 && (
              <div
                className="dc-filters"
                aria-label="Filter treatments by category"
              >
                {["All", ...categories].map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={activeCategory === item}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
            <motion.div
              className="dc-directory-grid"
              variants={stagger}
              initial={canReveal ? "hidden" : false}
              whileInView={canReveal ? "show" : undefined}
              viewport={{ once: true, amount: 0.2 }}
            >
              {filtered.map((s, i) => (
                <motion.article
                  variants={fade}
                  className="dc-directory-item"
                  key={s.id}
                >
                  <div className="dc-directory-image">
                    <EditorialImage
                      fallback={images[services.indexOf(s) % images.length]}
                      src={
                        s.imageUrl ||
                        images[services.indexOf(s) % images.length]
                      }
                      alt={
                        s.imageUrl
                          ? s.name
                          : `${s.name} — illustrative treatment image`
                      }
                      loading="lazy"
                      width="600"
                      height="400"
                    />
                    <span className="dc-directory-num">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div>
                    <p className="dc-card-category">{s.category}</p>
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                    <small>
                      {s.price > 0
                        ? `${profile.currency || "₹"}${s.price.toLocaleString("en-IN")}`
                        : ""}
                      {s.showDuration !== false && s.durationMinutes > 0
                        ? ` · ${s.durationMinutes} min`
                        : ""}
                    </small>
                  </div>
                  <button
                    onClick={() => (bookingAvailable ? onBook(s) : booking())}
                    aria-label={`Explore ${s.name}`}
                  >
                    <ArrowUpRight size={20} />
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
