import { useState } from 'react';
import type { PrismChromaBeforeAfter } from '../../types';
import { SafeImage } from './SafeImage';

/**
 * Before/After transformation slider (spec §7). A native range input drives
 * the split, so it is fully keyboard accessible (arrow keys move the line)
 * and touch friendly. The "before" frame is shown dull/flat and the "after"
 * frame in full colour so the change reads clearly on any photo pair.
 */
export function BeforeAfterSlider({
  item,
  fallback,
}: {
  item: PrismChromaBeforeAfter;
  fallback: string;
}) {
  const [pos, setPos] = useState(55);
  return (
    <figure className="pc-ba pc-glass-strong">
      <div className="pc-ba-stage">
        <SafeImage
          src={item.afterUrl}
          fallback={fallback}
          alt={item.afterAlt}
          width={900}
          height={1000}
          className="pc-ba-img"
        />
        <div className="pc-ba-before" style={{ width: `${pos}%` }} aria-hidden="true">
          <SafeImage
            src={item.beforeUrl}
            fallback={fallback}
            alt=""
            width={900}
            height={1000}
            className="pc-ba-img pc-ba-img-before"
          />
        </div>
        <span className="pc-ba-tag pc-ba-tag-before" aria-hidden="true">Before</span>
        <span className="pc-ba-tag pc-ba-tag-after" aria-hidden="true">After</span>
        <span className="pc-ba-handle" style={{ left: `${pos}%` }} aria-hidden="true">
          <span className="pc-ba-handle-dot">↔</span>
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="pc-ba-range"
        aria-label={`Before and after slider for ${item.title}. Use arrow keys to move the line.`}
      />
      <figcaption className="pc-ba-caption">{item.title}</figcaption>
    </figure>
  );
}
