import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Clock3, Scissors } from 'lucide-react';
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
  const stageRef = useRef<HTMLDivElement | null>(null);

  /* One gentle auto-sweep the first time the card scrolls into view, so
     visitors notice the slider. Skipped for reduced-motion users. */
  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const node = stageRef.current;
    if (!node) return;
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / 1400);
          const wave = 55 - Math.sin(t * Math.PI) * 30;
          setPos(Math.round(wave));
          if (t < 1) frame = requestAnimationFrame(tick);
          else setPos(55);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <figure className="pc-ba pc-glass-strong">
      <div className="pc-ba-stage" ref={stageRef}>
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
      <figcaption className="pc-ba-caption">
        <span className="pc-ba-title">{item.title}</span>
        {(item.serviceLabel || item.sessionsNote || item.stylistName) && (
          <span className="pc-ba-meta">
            {item.serviceLabel && (
              <span><Scissors size={12} aria-hidden="true" /> {item.serviceLabel}</span>
            )}
            {item.sessionsNote && (
              <span><Clock3 size={12} aria-hidden="true" /> {item.sessionsNote}</span>
            )}
            {item.stylistName && (
              <span><BadgeCheck size={12} aria-hidden="true" /> by {item.stylistName}</span>
            )}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
