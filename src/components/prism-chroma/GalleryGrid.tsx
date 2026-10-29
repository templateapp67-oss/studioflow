import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { SafeImage } from './SafeImage';

export interface PrismGalleryPhoto {
  src: string;
  title: string;
  tag: string;
}

/**
 * Colour Gallery with tag filters and a full keyboard-friendly lightbox.
 * The default "All" view keeps every photo in the DOM; filters only hide
 * non-matching work. Esc closes, arrow keys move, focus starts on Close.
 */
export function GalleryGrid({
  photos,
  brandName,
  fallback,
}: {
  photos: PrismGalleryPhoto[];
  brandName: string;
  fallback: string;
}) {
  const filters = useMemo(() => {
    const tags: string[] = [];
    for (const photo of photos) {
      const tag = (photo.tag || '').trim();
      if (tag && !tags.includes(tag)) tags.push(tag);
    }
    return ['All', ...tags];
  }, [photos]);

  const [filter, setFilter] = useState('All');
  const [lightbox, setLightbox] = useState<number | null>(null);

  const visible = useMemo(
    () => (filter === 'All' ? photos : photos.filter((p) => (p.tag || '').trim() === filter)),
    [photos, filter],
  );

  useEffect(() => {
    if (lightbox === null || typeof document === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null);
      if (event.key === 'ArrowRight') setLightbox((v) => (v === null ? v : (v + 1) % Math.max(visible.length, 1)));
      if (event.key === 'ArrowLeft')
        setLightbox((v) => (v === null ? v : (v - 1 + Math.max(visible.length, 1)) % Math.max(visible.length, 1)));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox, visible.length]);

  if (!photos.length) return null;
  const active = lightbox !== null ? visible[lightbox] : null;

  return (
    <div>
      {filters.length > 2 && (
        <div className="pc-filter-row" role="group" aria-label="Filter gallery by colour work">
          {filters.map((tag) => (
            <button
              key={tag}
              type="button"
              className={tag === filter ? 'pc-filter-chip is-active' : 'pc-filter-chip'}
              aria-pressed={tag === filter}
              onClick={() => {
                setFilter(tag);
                setLightbox(null);
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      <p className="pc-sr-only" aria-live="polite">
        Showing {visible.length} of {photos.length} photos
      </p>

      <div className="pc-masonry mt-6">
        {visible.map((photo, idx) => (
          <figure key={`${photo.src}-${photo.title}-${idx}`}>
            <button
              type="button"
              onClick={() => setLightbox(idx)}
              aria-label={`View photo: ${photo.title}`}
              className="pc-gallery-open"
            >
              <SafeImage
                src={photo.src}
                fallback={fallback}
                alt={`${photo.title} — hair colour work at ${brandName}`}
                width={800}
                height={idx % 3 === 0 ? 1000 : 700}
                style={{ height: idx % 3 === 0 ? 300 : 210 }}
              />
              <span className="pc-gallery-zoom" aria-hidden="true">
                <Expand size={15} /> View
              </span>
            </button>
            <figcaption>
              {photo.title} · {photo.tag}
            </figcaption>
          </figure>
        ))}
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo: ${active.title}`}
          className="pc-lightbox"
          onClick={() => setLightbox(null)}
        >
          <SafeImage
            src={active.src}
            fallback={fallback}
            alt={`${active.title} — hair colour work at ${brandName}`}
            width={1200}
            height={900}
            className="pc-lightbox-img"
            loading="eager"
          />
          <button
            type="button"
            autoFocus
            aria-label="Close photo"
            onClick={() => setLightbox(null)}
            className="pc-btn pc-btn-gradient pc-lightbox-close"
          >
            <X size={16} aria-hidden="true" /> Close
          </button>
          {visible.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                className="pc-lightbox-nav pc-lightbox-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lightbox! - 1 + visible.length) % visible.length);
                }}
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                className="pc-lightbox-nav pc-lightbox-next"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lightbox! + 1) % visible.length);
                }}
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </>
          )}
          <p className="pc-lightbox-caption">
            {active.title} · {active.tag} · {(lightbox ?? 0) + 1} / {visible.length}
          </p>
        </div>
      )}
    </div>
  );
}
