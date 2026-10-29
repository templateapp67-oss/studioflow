import React, { useId, useState } from 'react';
import { ChevronsLeftRight } from 'lucide-react';
import type { ShringaarBeforeAfter } from '../../types';
import { SHRINGAAR_IMAGES } from '../../lib/shringaarRoyal';
import { SafeImage } from './SafeImage';

/**
 * Accessible before / after comparison slider.
 *
 * The two photographs are stacked and the "before" frame is clipped with
 * `clip-path: inset(...)` driven by a CSS variable, so dragging only ever
 * touches one custom property (compositor friendly, 60 fps, no layout work).
 * A visually hidden-but-focusable range input supplies the real control, which
 * makes the comparison fully keyboard operable and announced by screen readers.
 */
export function BeforeAfterSlider({ item }: { item: ShringaarBeforeAfter; key?: React.Key }) {
  const [position, setPosition] = useState(50);
  const id = useId();

  return (
    <figure className="sr-ba" style={{ ['--sr-pos' as string]: `${position}%` }}>
      <div className="sr-ba-frame">
        <SafeImage
          src={item.after}
          fallback={SHRINGAAR_IMAGES.beforeAfter.afterOne}
          alt={`After: ${item.alt}`}
          width={900}
          height={675}
          loading="lazy"
        />
        <SafeImage
          className="sr-ba-before"
          src={item.before}
          fallback={SHRINGAAR_IMAGES.beforeAfter.beforeOne}
          alt={`Before: ${item.alt}`}
          width={900}
          height={675}
          loading="lazy"
        />
        <span className="sr-ba-label sr-ba-label--before" aria-hidden="true">Before</span>
        <span className="sr-ba-label sr-ba-label--after" aria-hidden="true">After</span>
        <span className="sr-ba-divider" aria-hidden="true" />
        <span className="sr-ba-handle" aria-hidden="true">
          <ChevronsLeftRight size={18} />
        </span>
        <label className="sr-sr-only" htmlFor={id}>
          Reveal the before and after photos — use the arrow keys to move the gold line
        </label>
        <input
          id={id}
          className="sr-ba-range"
          type="range"
          min={0}
          max={100}
          step={1}
          value={position}
          aria-valuetext={`${position}% of the before photo visible`}
          onChange={(event) => setPosition(Number(event.target.value))}
        />
      </div>
      <figcaption className="sr-ba-caption">
        <b>{item.title}</b>
        <span>Drag the gold line</span>
      </figcaption>
    </figure>
  );
}
