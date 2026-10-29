import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { EditorialImage, NEUTRAL_CLINIC_IMAGE } from "./EditorialImage";
import { fade, stagger } from "./animation";
import { useDermacure } from "./context";

export function TestimonialsSection() {
  const { visible, reviews, profile, reduced } = useDermacure();
  const rail = useRef<HTMLDivElement>(null);
  if (!visible.testimonials || reviews.length === 0) return null;
  const canReveal = typeof window !== "undefined" && "IntersectionObserver" in window && !reduced;
  return <section className="dc-section dc-reviews" aria-label="Client words">
    <div className="dc-container">
      <p className="dc-eyebrow"><span />{profile.sectionHeadings?.clientWordsEyebrow || "CLIENT WORDS"}</p>
      <h2>{profile.sectionHeadings?.clientWordsTitle || "In their"} <em>{profile.sectionHeadings?.clientWordsEmphasis || "own words."}</em></h2>
      <motion.div ref={rail} className="dc-review-grid" variants={stagger} initial={canReveal ? "hidden" : false} whileInView={canReveal ? "show" : undefined} viewport={{once:true, amount:0.1}} tabIndex={0} aria-label="Client testimonials, scroll to explore">
        {reviews.map(review => <motion.blockquote variants={fade} key={review.id}>
          {review.avatarUrl && !review.avatarUrl.includes('images.unsplash.com') && <EditorialImage src={review.avatarUrl} fallback={NEUTRAL_CLINIC_IMAGE} alt={`Profile image for ${review.name}`} loading="lazy" width="80" height="80" />}
          {review.verified && Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5 && <p className="dc-review-rating" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(Math.round(review.rating))} <small>{review.rating}/5</small></p>}
          <p>“{review.comment}”</p><cite>{review.name}</cite>{review.serviceName && <small>{review.serviceName}</small>}
          {!review.verified && <small>Owner-submitted review</small>}
        </motion.blockquote>)}

      </motion.div>
      <div className="dc-review-controls"><button type="button" aria-label="Previous testimonials" onClick={() => rail.current?.scrollBy({left:-320,behavior:reduced ? 'auto':'smooth'})}><ChevronLeft size={20}/></button><button type="button" aria-label="Next testimonials" onClick={() => rail.current?.scrollBy({left:320,behavior:reduced ? 'auto':'smooth'})}><ChevronRight size={20}/></button></div>
    </div>
  </section>;
}
