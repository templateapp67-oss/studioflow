import React, { useId, useState } from 'react';
import { ChevronsLeftRight } from 'lucide-react';
import type { ArchFlutterBeforeAfter } from '../../types';
import { ARCH_FLUTTER_IMAGES } from '../../lib/archFlutter';
import { SafeImage } from './SafeImage';

/**
 * Accessible before / after comparison in the Template 13 arch mask.
 *
 * The two photographs are stacked and the "before" frame is clipped with
 * `clip-path: inset(...)` driven by one CSS custom property, so dragging only
 * touches a compositor-friendly value. A visually hidden but focusable range
 * input supplies the real control: keyboard operable and announced by screen
 * readers.
 */
export function ArchFlutterBeforeAfter({ item }: { item: ArchFlutterBeforeAfter; key?: React.Key }) {
  const [position, setPosition] = useState(50);
  const id = useId();

  return (
    <figure className="af-ba" style={{ ['--af-pos' as string]: `${position}%` }}>
      <div className="af-ba-frame">
        <SafeImage src={item.after} fallback={ARCH_FLUTTER_IMAGES.beforeAfter.afterOne.fallback} alt={`After: ${item.alt}`} width={900} height={765} loading="lazy" />
        <SafeImage className="af-ba-before" src={item.before} fallback={ARCH_FLUTTER_IMAGES.beforeAfter.beforeOne.fallback} alt={`Before: ${item.alt}`} width={900} height={765} loading="lazy" />
        <span className="af-ba-label af-ba-label--before" aria-hidden="true">Before</span>
        <span className="af-ba-label af-ba-label--after" aria-hidden="true">After</span>
        <span className="af-ba-divider" aria-hidden="true" />
        <span className="af-ba-handle" aria-hidden="true">
          <ChevronsLeftRight size={18} />
        </span>
        <label className="af-sr-only" htmlFor={id}>
          Reveal the before and after photos — use the arrow keys to move the gold line
        </label>
        <input
          id={id}
          className="af-ba-range"
          type="range"
          min={0}
          max={100}
          step={1}
          value={position}
          aria-valuetext={`${position}% of the before photo visible`}
          onChange={(event) => setPosition(Number(event.target.value))}
        />
      </div>
      <figcaption className="af-ba-caption">
        <b>{item.title}</b>
        <span>Drag the gold line</span>
      </figcaption>
    </figure>
  );
}
