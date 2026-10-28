import { useHairSpa } from "./context";
import { Reveal } from "./Reveal";
import { motion } from "motion/react";
import { Quote } from "lucide-react";
import {
  revealViewport,
  staggerContainer,
  staggerItem,
} from "../../utils/motion";

/**
 * Genuine client reviews only. The section is omitted entirely when the salon
 * has no published reviews, so the page never shows an empty testimonial band
 * or invents a quote, a rating or a review count.
 */
export function TestimonialsSection() {
  const model = useHairSpa();
  if (!model.realReviews.length) return null;
  return (
    <section
      className="kp-testimonials kp-section"
      id="testimonials"
      data-layout="testimonials"
      aria-labelledby="kp-testimonials-title"
    >
      <div className="kp-container">
        <div className="kp-section-heading">
          <Reveal>
            <p className="kp-eyebrow">CLIENT WORDS</p>
            <h2 id="kp-testimonials-title">
              In their
              <br />
              <em>own words.</em>
            </h2>
          </Reveal>
          <Reveal>
            <p>
              Reviews shared by clients of {model.profile.businessName}. Only
              reviews published for this salon appear here.
            </p>
          </Reveal>
        </div>
        <motion.ul
          className="kp-review-grid"
          variants={staggerContainer}
          initial={model.reduced || !model.canObserve ? "visible" : "hidden"}
          whileInView={model.canObserve ? "visible" : undefined}
          viewport={revealViewport}
        >
          {model.realReviews.map((review) => (
            <motion.li
              className="kp-review-card"
              key={review.id || review.name}
              variants={staggerItem}
            >
              <Quote size={20} className="kp-review-mark" aria-hidden="true" />
              <blockquote>“{review.comment}”</blockquote>
              <div className="kp-review-author">
                <strong>{review.name}</strong>
                {review.serviceName && <small>{review.serviceName}</small>}
                {/* "Verified" is only ever printed from saved review data. */}
                {review.verified && <span>Verified visit</span>}
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
