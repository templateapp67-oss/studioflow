import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MoveHorizontal, X } from 'lucide-react';
import type { SalonGalleryPhoto } from '../../lib/photoGallery';
import {
  VOGUE_NOIR_IMAGES,
  type ResolvedVogueNoirConfig,
} from '../../lib/vogueNoir';
import type { VogueNoirBeforeAfterItem, VogueNoirPortfolioItem } from '../../types';
import { SafeImage } from './SafeImage';

const BeforeAfterCard: React.FC<{ item: VogueNoirBeforeAfterItem }> = ({ item }) => {
  const [position, setPosition] = useState<number>(50);

  return (
    <article className="vn-ba-card">
      <div className="vn-ba-stage">
        <SafeImage
          src={item.afterUrl}
          fallback={VOGUE_NOIR_IMAGES.gallery.after1}
          alt={item.afterAlt}
          width={900}
          height={1100}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: `inset(0 ${100 - position}% 0 0)`,
            zIndex: 2,
          }}
        >
          <SafeImage
            src={item.beforeUrl}
            fallback={VOGUE_NOIR_IMAGES.gallery.before1}
            alt={item.beforeAlt}
            width={900}
            height={1100}
          />
        </div>
        <span className="vn-ba-tag vn-ba-tag-before">Before</span>
        <span className="vn-ba-tag vn-ba-tag-after">After</span>
        <div className="vn-ba-divider" style={{ left: `${position}%` }}>
          <span className="vn-ba-knob" aria-hidden="true">
            <MoveHorizontal size={16} />
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
          className="vn-ba-range"
          aria-label={`Compare before and after for ${item.title}`}
        />
      </div>
      <div style={{ marginTop: '0.9rem' }}>
        <small
          style={{
            display: 'block',
            fontSize: '0.68rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--accent-gold)',
          }}
        >
          {item.category}
        </small>
        <h3
          style={{
            fontFamily: 'var(--vn-serif)',
            fontSize: '1.35rem',
            margin: '0.2rem 0 0',
            color: 'var(--text-primary)',
          }}
        >
          {item.title}
        </h3>
      </div>
    </article>
  );
}

export function PortfolioSection({
  config,
  ownerGalleryPhotos,
}: {
  config: ResolvedVogueNoirConfig;
  ownerGalleryPhotos: SalonGalleryPhoto[];
}) {
  const customOwnerPhotos: VogueNoirPortfolioItem[] = useMemo(
    () =>
      ownerGalleryPhotos
        .filter((p) => !p.isDemo && p.url)
        .map((p) => ({
          id: `owner-${p.id}`,
          category: 'Bridal' as const,
          imageUrl: p.url,
          title: p.title || 'Studio Look',
          alt: p.title || 'Published studio makeup look',
        })),
    [ownerGalleryPhotos],
  );

  const allItems = useMemo(
    () => [...customOwnerPhotos, ...config.portfolio],
    [customOwnerPhotos, config.portfolio],
  );

  const categories = useMemo(() => {
    const base: Array<'All' | 'Bridal' | 'Party' | 'Editorial' | 'Academy Work'> = [
      'All',
      'Bridal',
      'Party',
      'Editorial',
      ...(config.academyEnabled ? (['Academy Work'] as const) : []),
    ];
    return base;
  }, [config.academyEnabled]);

  const [activeCat, setActiveCat] = useState<string>('All');
  const [lightboxIdx, setLightboxIdx] = useState<number>(-1);

  const filteredItems = useMemo(() => {
    const pool = config.academyEnabled
      ? allItems
      : allItems.filter((item) => item.category !== 'Academy Work');
    if (activeCat === 'All') return pool;
    return pool.filter((item) => item.category === activeCat);
  }, [allItems, activeCat, config.academyEnabled]);

  const countFor = (cat: string) => {
    const pool = config.academyEnabled
      ? allItems
      : allItems.filter((item) => item.category !== 'Academy Work');
    if (cat === 'All') return pool.length;
    return pool.filter((item) => item.category === cat).length;
  };

  useEffect(() => {
    if (lightboxIdx < 0) return;
    const total = filteredItems.length;
    if (!total) {
      setLightboxIdx(-1);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(-1);
      if (e.key === 'ArrowRight') setLightboxIdx((i) => (i + 1) % total);
      if (e.key === 'ArrowLeft') setLightboxIdx((i) => (i - 1 + total) % total);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxIdx, filteredItems.length]);

  const activeItem =
    lightboxIdx >= 0 && lightboxIdx < filteredItems.length
      ? filteredItems[lightboxIdx]
      : null;

  return (
    <section
      id="portfolio"
      data-layout="gallery"
      className="vn-section vn-section-alt"
      aria-labelledby="vn-portfolio-heading"
    >
      <div className="vn-container">
        <div className="vn-section-header vn-section-header-split">
          <div>
            <p className="vn-eyebrow">Editorial Lookbook</p>
            <h2 id="vn-portfolio-heading" className="vn-heading">
              Signature <em>Portfolio</em> &amp; Transformations
            </h2>
          </div>
          <p className="vn-subtext">
            Filter real-skin bridal couture, red-carpet party looks, fashion editorials, and student showcase work.
          </p>
        </div>

        <div className="vn-filter-bar" role="tablist" aria-label="Portfolio categories">
          {categories.map((cat) => {
            const selected = activeCat === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`vn-filter-pill${selected ? ' is-active' : ''}`}
                onClick={() => {
                  setActiveCat(cat);
                  setLightboxIdx(-1);
                }}
              >
                {cat} ({countFor(cat)})
              </button>
            );
          })}
        </div>

        <div className="vn-portfolio-grid">
          {filteredItems.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              className="vn-portfolio-tile"
              aria-label={`View salon look ${item.title}`}
              onClick={() => setLightboxIdx(idx)}
            >
              <SafeImage
                src={item.imageUrl}
                fallback={VOGUE_NOIR_IMAGES.gallery.bridal1}
                alt={item.alt || item.title}
                width={900}
                height={1100}
              />
              <div className="vn-portfolio-caption">
                <small>{item.category}</small>
                <strong>{item.title}</strong>
              </div>
            </button>
          ))}
        </div>

        {config.beforeAfter.length > 0 && (
          <div className="vn-ba-grid" aria-label="Before and after makeup transformations">
            {config.beforeAfter.map((pair) => (
              <BeforeAfterCard key={pair.id} item={pair} />
            ))}
          </div>
        )}
      </div>

      {activeItem && (
        <div
          className="vn-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.title}
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxIdx(-1);
          }}
        >
          <div className="vn-lightbox-inner">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
              }}
            >
              <div>
                <small
                  style={{
                    color: 'var(--accent-gold)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    fontSize: '0.7rem',
                  }}
                >
                  {activeItem.category} · {lightboxIdx + 1} / {filteredItems.length}
                </small>
                <div
                  style={{
                    fontFamily: 'var(--vn-serif)',
                    fontSize: '1.3rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  {activeItem.title}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.45rem' }}>
                <button
                  type="button"
                  className="vn-menu-btn"
                  aria-label="Previous portfolio photo"
                  onClick={() =>
                    setLightboxIdx(
                      (i) => (i - 1 + filteredItems.length) % filteredItems.length,
                    )
                  }
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="vn-menu-btn"
                  aria-label="Next portfolio photo"
                  onClick={() =>
                    setLightboxIdx((i) => (i + 1) % filteredItems.length)
                  }
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  type="button"
                  className="vn-menu-btn"
                  aria-label="Close lightbox"
                  onClick={() => setLightboxIdx(-1)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <SafeImage
              src={activeItem.imageUrl}
              fallback={VOGUE_NOIR_IMAGES.gallery.bridal1}
              alt={activeItem.alt || activeItem.title}
              width={900}
              height={1100}
            />
          </div>
        </div>
      )}
    </section>
  );
}
