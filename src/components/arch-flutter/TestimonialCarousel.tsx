import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import type { ArchFlutterReview } from '../../types';
import { ARCH_FLUTTER_IMAGES } from '../../lib/archFlutter';
import { SafeImage } from './SafeImage';

/**
 * Client-review carousel: one arch-framed portrait beside an oversized serif
 * quote. Keyboard operable (previous/next buttons + dots) and auto-advances
 * only when the visitor has not asked for reduced motion.
 */
export function ArchFlutterTestimonials({ reviews, reducedMotion }: { reviews: ArchFlutterReview[]; reducedMotion: boolean }) {
  const [index, setIndex] = useState(0);
  const count = reviews.length;
  const active = reviews[index % Math.max(1, count)];

  useEffect(() => {
    if (reducedMotion || count < 2) return;
    // Global timers (not window.*) so the carousel also mounts inside the
    // server-rendered verification harnesses, which stub a minimal window.
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), 7000);
    return () => clearInterval(timer);
  }, [reducedMotion, count]);

  if (!active) return null;
  const fallbacks = [ARCH_FLUTTER_IMAGES.reviews.one.fallback, ARCH_FLUTTER_IMAGES.reviews.two.fallback, ARCH_FLUTTER_IMAGES.reviews.three.fallback, ARCH_FLUTTER_IMAGES.reviews.four.fallback];

  return (
    <div className="af-review-stage">
      <div className="af-glass af-review-card" aria-live="polite">
        <div className="af-review-photo">
          <SafeImage src={active.avatarUrl} fallback={fallbacks[index % fallbacks.length]} alt={`Portrait of ${active.name}`} width={440} height={492} loading="lazy" />
        </div>
        <div>
          <span className="af-stars" aria-label={`${active.rating} out of 5 stars`}>
            {Array.from({ length: 5 }).map((_, star) => (
              <Star key={star} size={15} fill={star < active.rating ? 'currentColor' : 'none'} aria-hidden="true" />
            ))}
          </span>
          <blockquote className="af-review-quote">“{active.quote}”</blockquote>
          <div className="af-review-who">
            <b>{active.name}</b>
            <span>{active.area}</span>
            <span>{active.service}</span>
          </div>
        </div>
      </div>
      <div className="af-review-nav">
        <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={() => setIndex((current) => (current - 1 + count) % count)} aria-label="Previous review">
          <ChevronLeft size={16} /> Prev
        </button>
        <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={() => setIndex((current) => (current + 1) % count)} aria-label="Next review">
          Next <ChevronRight size={16} />
        </button>
        <div className="af-review-dots" role="tablist" aria-label="Choose a review">
          {reviews.map((review, dotIndex) => (
            <button
              key={review.id}
              type="button"
              role="tab"
              aria-selected={dotIndex === index % count}
              aria-label={`Review ${dotIndex + 1}: ${review.name}`}
              className={dotIndex === index % count ? 'af-dot is-active' : 'af-dot'}
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
