import { useState } from 'react';
import { ArrowRight, Columns2, Droplets, Heart, Sparkles, Sun } from 'lucide-react';
import type { PrismChromaShade, SalonService } from '../../types';
import {
  PRISM_CHROMA_LENGTH_OPTIONS,
  estimateColourPrice,
  prismFormatInr,
  prismMaintenanceLabel,
} from '../../lib/prismChroma';
import { SafeImage } from './SafeImage';
import { FadeIn, FadeInGroup } from './MotionSection';

/**
 * Shade Studio (spec §6): a row of colour swatches. Tapping a swatch tints
 * the hair photo and shows the shade name, one simple line and its ₹ price.
 * Shades come from onboarding (config.shades) — never hard-coded.
 */
export function ShadeStudio({
  shades,
  fallbackImage,
  brandName,
  onBookShade,
}: {
  shades: PrismChromaShade[];
  fallbackImage: string;
  brandName: string;
  onBookShade: (shade: PrismChromaShade) => void;
}) {
  const [activeId, setActiveId] = useState(shades[0]?.id || '');
  const [compareId, setCompareId] = useState('');
  const [lengthId, setLengthId] = useState('medium');
  const compare = shades.find((s) => s.id === compareId && s.id !== activeId);
  const active = shades.find((s) => s.id === activeId) || shades[0];
  const estimatedPrice = active ? estimateColourPrice(active.price, lengthId) : 0;
  if (!active) return null;

  return (
    <div className="pc-shade-grid">
      <div className="pc-shade-photo pc-glass-strong">
        <SafeImage
          key={active.id}
          src={active.imageUrl}
          fallback={fallbackImage}
          alt={active.imageAlt || `${active.name} shade on model hair at ${brandName}`}
          width={900}
          height={1000}
          className="pc-shade-img"
          style={{ filter: active.tintFilter || undefined }}
        />
        <div className="pc-shade-photo-overlay" aria-hidden="true" />
        <div className="pc-shade-caption">
          <p className="pc-shade-name">{active.name}</p>
          <p className="pc-shade-price">
            {prismFormatInr(active.price)} <span>· full colour service</span>
          </p>
        </div>
      </div>

      <div>
        <div className="pc-swatch-row" role="listbox" aria-label="Pick a hair colour shade">
          {shades.map((shade) => (
            <button
              key={shade.id}
              type="button"
              role="option"
              aria-selected={shade.id === active.id}
              aria-label={`${shade.name}, ${prismFormatInr(shade.price)}`}
              title={shade.name}
              onClick={() => setActiveId(shade.id)}
              className={`pc-swatch${shade.id === active.id ? ' pc-swatch-active' : ''}`}
              style={{ background: shade.swatch }}
            />
          ))}
        </div>
        <h3 className="pc-shade-title">{active.name}</h3>
        <p className="pc-shade-blurb">{active.blurb}</p>

        <div className="pc-shade-facts" role="list" aria-label={`Facts about ${active.name}`}>
          {active.undertone && (
            <span role="listitem" className="pc-fact">
              <Sun size={13} aria-hidden="true" /> {active.undertone} undertone
            </span>
          )}
          {active.finish && (
            <span role="listitem" className="pc-fact">
              <Sparkles size={13} aria-hidden="true" /> {active.finish} finish
            </span>
          )}
          {active.longevityWeeks && (
            <span role="listitem" className="pc-fact">
              <Droplets size={13} aria-hidden="true" /> Fresh for {active.longevityWeeks}
            </span>
          )}
          <span role="listitem" className="pc-fact">
            <Heart size={13} aria-hidden="true" /> {prismMaintenanceLabel(active.maintenanceLevel)}
            <span className="pc-meter" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < (active.maintenanceLevel || 3) ? 'pc-meter-dot is-on' : 'pc-meter-dot'} />
              ))}
            </span>
          </span>
        </div>
        {active.bestFor && <p className="pc-shade-bestfor">Best for: {active.bestFor}</p>}

        <div>
          <p className="pc-quiz-length-label" id="pc-shade-length-label">Estimate by your hair length</p>
          <div className="pc-length-row" role="group" aria-labelledby="pc-shade-length-label">
            {PRISM_CHROMA_LENGTH_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={option.id === lengthId ? 'pc-length-chip is-active' : 'pc-length-chip'}
                aria-pressed={option.id === lengthId}
                onClick={() => setLengthId(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <p className="pc-shade-bigprice">
          {prismFormatInr(estimatedPrice)}
          <span className="pc-shade-bigprice-note"> estimated · confirmed free at consult</span>
        </p>
        {active.careTip && <p className="pc-shade-caretip">Care tip: {active.careTip}</p>}
        <button type="button" className="pc-btn pc-btn-gradient px-6 py-3 text-sm" onClick={() => onBookShade(active)}>
          Book this shade <ArrowRight size={16} aria-hidden="true" />
        </button>
        {shades.length > 1 && (
          <div className="pc-compare-box">
            <button
              type="button"
              className="pc-btn pc-btn-ghost px-4 py-2 text-xs"
              aria-expanded={Boolean(compareId)}
              onClick={() => setCompareId(compare ? '' : shades.find((s) => s.id !== active.id)?.id || '')}
            >
              <Columns2 size={14} aria-hidden="true" /> {compare ? 'Close compare' : 'Compare two shades'}
            </button>
            {compare && (
              <div className="mt-4">
                <div className="pc-length-row" role="group" aria-label="Pick the second shade to compare">
                  {shades.filter((s) => s.id !== active.id).map((shade) => (
                    <button
                      key={shade.id}
                      type="button"
                      className={shade.id === compare.id ? 'pc-length-chip is-active' : 'pc-length-chip'}
                      aria-pressed={shade.id === compare.id}
                      onClick={() => setCompareId(shade.id)}
                    >
                      {shade.name}
                    </button>
                  ))}
                </div>
                <div className="pc-compare-grid">
                  {[{ shade: active }, { shade: compare }].map(({ shade }) => (
                    <figure key={shade.id} className="pc-compare-card">
                      <SafeImage
                        src={shade.imageUrl}
                        fallback={fallbackImage}
                        alt={shade.imageAlt || `${shade.name} shade on model hair at ${brandName}`}
                        width={600}
                        height={700}
                        className="pc-compare-img"
                        style={{ filter: shade.id === active.id ? undefined : shade.tintFilter || undefined }}
                      />
                      <figcaption>
                        <strong>{shade.name}</strong>
                        <span>{prismFormatInr(shade.price)} · {prismMaintenanceLabel(shade.maintenanceLevel)}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
                <p className="pc-muted mt-3 text-sm">
                  Still confused? At your free consult we hold both swatches next to your skin and show you
                  which undertone suits you better — no pressure to book.
                </p>
              </div>
            )}
          </div>
        )}

        <FadeInGroup className="pc-shade-mini-grid">
          {shades.map((shade) => (
            <FadeIn key={shade.id}>
              <button
                type="button"
                onClick={() => setActiveId(shade.id)}
                aria-pressed={shade.id === active.id}
                className={`pc-shade-mini${shade.id === active.id ? ' pc-shade-mini-active' : ''}`}
              >
                <span className="pc-shade-mini-dot" style={{ background: shade.swatch }} aria-hidden="true" />
                <span>{shade.name}</span>
                <strong>{prismFormatInr(shade.price)}</strong>
              </button>
            </FadeIn>
          ))}
        </FadeInGroup>
      </div>
    </div>
  );
}

export type { SalonService };
