import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDermacure } from "./context";

export function TestimonialsSection() {
  const { visible, reviews } = useDermacure();
  const touchStart = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  if (!visible.testimonials || reviews.length === 0) return null;
  const current = index % reviews.length;
  const review = reviews[current];
  return (
    <section className="dc-section dc-reviews" aria-label="Patient experiences">
      <div className="dc-container">
        <p className="dc-eyebrow">
          <span /> TESTIMONIALS
        </p>
        <h2>
          What Our <em>Patients Say</em>
        </h2>
        <div
          className="dc-review-carousel"
          onTouchStart={(e) => {
            touchStart.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStart.current === null) return;
            const distance = touchStart.current - e.changedTouches[0].clientX;
            touchStart.current = null;
            if (Math.abs(distance) > 60)
              setIndex(
                (current + (distance > 0 ? 1 : reviews.length - 1)) %
                  reviews.length,
              );
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          <blockquote>
            {Number.isFinite(review.rating) &&
              review.rating >= 1 &&
              review.rating <= 5 && (
                <p
                  className="dc-review-rating"
                  aria-label={`${review.rating} out of 5 stars`}
                >
                  {"★".repeat(Math.round(review.rating))}{" "}
                  <small>{review.rating}/5</small>
                </p>
              )}
            <p>“{review.comment}”</p>
            <cite>{review.name}</cite>
          </blockquote>
          {reviews.length > 1 && (
            <div className="dc-review-controls">
              <button
                type="button"
                aria-label="Previous review"
                onClick={() =>
                  setIndex((current + reviews.length - 1) % reviews.length)
                }
              >
                <ChevronLeft size={20} />
              </button>
              <span>
                {current + 1} / {reviews.length}
              </span>
              <button
                type="button"
                aria-label="Next review"
                onClick={() => setIndex((current + 1) % reviews.length)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
