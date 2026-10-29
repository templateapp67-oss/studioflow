import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import type { PrismChromaReviewItem } from '../../types';
import { SafeImage } from './SafeImage';
import { PRISM_CHROMA_IMAGES } from '../../lib/prismChroma';

function Stars({ rating }: { rating: number }) {
  const full = Math.max(0, Math.min(5, Math.round(rating || 5)));
  return (
    <span className="pc-stars" role="img" aria-label={`Rated ${full} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          aria-hidden="true"
          fill={i < full ? 'currentColor' : 'none'}
          className={i < full ? 'pc-star-on' : 'pc-star-off'}
        />
      ))}
    </span>
  );
}

/** Average rating summary with a small 5-to-1 star distribution. */
export function RatingSummary({ reviews }: { reviews: PrismChromaReviewItem[] }) {
  if (!reviews.length) return null;
  const average = reviews.reduce((sum, r) => sum + (r.rating || 5), 0) / reviews.length;
  const buckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating || 5) === star).length,
  }));
  return (
    <div className="pc-rating-summary pc-glass" aria-label={`Average rating ${average.toFixed(1)} out of 5 from ${reviews.length} reviews`}>
      <p className="pc-rating-big">{average.toFixed(1)}</p>
      <div>
        <Stars rating={average} />
        <p className="pc-rating-count">{reviews.length} happy client reviews</p>
        <div className="pc-rating-bars" aria-hidden="true">
          {buckets.map((bucket) => (
            <span key={bucket.star} className="pc-rating-bar-row">
              <span>{bucket.star}★</span>
              <span className="pc-rating-bar">
                <span style={{ width: `${reviews.length ? (bucket.count / reviews.length) * 100 : 0}%` }} />
              </span>
              <span>{bucket.count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Client stories carousel. Every review stays in the DOM (slides move with a
 * transform), autoplay pauses on hover/focus and for reduced-motion users.
 */
export function TestimonialCarousel({
  reviews,
  brandName,
}: {
  reviews: PrismChromaReviewItem[];
  brandName: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = reviews.length;

  useEffect(() => {
    if (count <= 1 || paused) return;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex((v) => (v + 1) % count), 5500);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (!count) return null;
  const go = (dir: number) => setIndex((v) => (v + dir + count) % count);
  const current = reviews[Math.min(index, count - 1)];

  return (
    <div
      className="pc-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={`Client reviews for ${brandName}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
        if (Math.abs(dx) > 42) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="pc-carousel-viewport">
        <div className="pc-carousel-track" style={{ transform: `translateX(-${Math.min(index, count - 1) * 100}%)` }}>
          {reviews.map((review) => (
            <article
              key={review.id}
              className="pc-review-card pc-glass"
              aria-roledescription="slide"
              aria-label={`Review by ${review.name}`}
              aria-hidden={review.id !== current.id}
            >
              <div className="pc-review-top">
                <SafeImage
                  src={review.avatarUrl || PRISM_CHROMA_IMAGES.testimonials.ananya}
                  fallback={PRISM_CHROMA_IMAGES.testimonials.ishita}
                  alt={`Portrait of ${review.name}`}
                  width={96}
                  height={96}
                  className="pc-review-avatar"
                />
                <div>
                  <p className="pc-review-name">
                    {review.name}
                    {review.verified && (
                      <span className="pc-verified">
                        <BadgeCheck size={13} aria-hidden="true" /> Verified visit
                      </span>
                    )}
                  </p>
                  <p className="pc-review-tag">{review.tag}</p>
                  <Stars rating={review.rating} />
                </div>
              </div>
              <blockquote className="pc-review-quote">“{review.quote}”</blockquote>
              <div className="pc-review-meta">
                {review.serviceName && <span>{review.serviceName}</span>}
                {review.shadeName && <span>{review.shadeName}</span>}
                {review.visitLabel && <span>{review.visitLabel}</span>}
              </div>
            </article>
          ))}
        </div>
      </div>

      {count > 1 && (
        <div className="pc-carousel-controls">
          <button type="button" className="pc-carousel-btn" onClick={() => go(-1)} aria-label="Previous review">
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <div className="pc-carousel-dots" role="tablist" aria-label="Choose review">
            {reviews.map((review, i) => (
              <button
                key={review.id}
                type="button"
                role="tab"
                aria-selected={i === Math.min(index, count - 1)}
                aria-label={`Review ${i + 1} by ${review.name}`}
                className={i === Math.min(index, count - 1) ? 'pc-dot is-active' : 'pc-dot'}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button type="button" className="pc-carousel-btn" onClick={() => go(1)} aria-label="Next review">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      <p className="pc-sr-only" aria-live="polite">
        Showing review {Math.min(index, count - 1) + 1} of {count} by {current.name}
      </p>
    </div>
  );
}
