import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import type { ShringaarReviewItem } from '../../types';
import { SHRINGAAR_IMAGES } from '../../lib/shringaarRoyal';
import { SafeImage } from './SafeImage';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="sr-review-stars" role="img" aria-label={`Rated ${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} aria-hidden="true" fill={i <= rating ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

/**
 * Bride photo + quote carousel.
 *
 * - One quote is shown at a time with a large editorial serif.
 * - Dots and previous/next buttons are real buttons with labels.
 * - Autoplay only runs when the visitor has not asked for reduced motion and
 *   pauses on hover/focus, so reading is never interrupted.
 */
export function TestimonialCarousel({ reviews, brandName }: { reviews: ShringaarReviewItem[]; brandName: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = reviews.length;
  const current = reviews[Math.min(index, Math.max(total - 1, 0))];

  useEffect(() => {
    setIndex(0);
  }, [total]);

  useEffect(() => {
    if (total < 2 || paused) return;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % total), 7000);
    return () => clearInterval(timer);
  }, [paused, total]);

  if (!current) return null;

  const go = (delta: number) => setIndex((value) => (value + delta + total) % total);

  return (
    <div className="sr-reviews">
      <figure className="sr-review-portrait" style={{ margin: 0 }}>
        <div className="sr-arch">
          <div className="sr-arch-inner">
            <SafeImage
              src={current.avatar}
              fallback={SHRINGAAR_IMAGES.testimonials.brideOne}
              alt={current.alt}
              width={560}
              height={700}
              loading="lazy"
            />
          </div>
        </div>
        <figcaption>
          {current.name} · {current.weddingPlace}
        </figcaption>
      </figure>

      <div
        className="sr-review-quote"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        aria-roledescription="carousel"
        aria-label={`Reviews from brides styled at ${brandName}`}
      >
        <span className="sr-review-mark" aria-hidden="true">
          &ldquo;
        </span>
        <p className="sr-review-text" aria-live="polite">
          {current.quote}
        </p>
        <div className="sr-review-meta">
          <SafeImage
            src={current.avatar}
            fallback={SHRINGAAR_IMAGES.testimonials.brideOne}
            alt=""
            width={46}
            height={46}
            loading="lazy"
            style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' }}
          />
          <span>
            <b style={{ fontFamily: 'var(--sr-serif)', fontSize: '1rem', color: 'var(--sr-maroon)', display: 'block', letterSpacing: 0 }}>
              {current.name}
            </b>
            {current.weddingPlace}
            {current.date ? ` · ${current.date}` : ''}
          </span>
          <Stars rating={current.rating} />
        </div>
        <div className="sr-review-nav">
          <button type="button" className="sr-round-btn" onClick={() => go(-1)} aria-label="Previous review">
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
          <span className="sr-review-dots">
            {reviews.map((review, dot) => (
              <button
                key={review.id}
                type="button"
                className={dot === index ? 'sr-review-dot is-active' : 'sr-review-dot'}
                onClick={() => setIndex(dot)}
                aria-label={`Show review ${dot + 1} of ${total}, ${review.name}`}
                aria-pressed={dot === index}
              />
            ))}
          </span>
          <button type="button" className="sr-round-btn" onClick={() => go(1)} aria-label="Next review">
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
