import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { PrismChromaShade, SalonService } from '../../types';
import { prismFormatInr } from '../../lib/prismChroma';
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
  const active = shades.find((s) => s.id === activeId) || shades[0];
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
        <p className="pc-shade-bigprice">{prismFormatInr(active.price)}</p>
        <button type="button" className="pc-btn pc-btn-gradient px-6 py-3 text-sm" onClick={() => onBookShade(active)}>
          Book this shade <ArrowRight size={16} aria-hidden="true" />
        </button>
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
