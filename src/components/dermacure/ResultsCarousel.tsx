import { EditorialImage, NEUTRAL_CLINIC_IMAGE } from "./EditorialImage";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BeforeAfter } from "../BeforeAfter";
import { useDermacure } from "./context";
export function ResultsCarousel() {
  const { comparisons, reduced } = useDermacure();
  const [failed, setFailed] = useState<string[]>([]);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const go = (next: number) => {
    const node = track.current;
    if (!node) return;
    const i = Math.max(0, Math.min(comparisons.length - 1, next));
    const item = node.children[i] as HTMLElement | undefined;
    if (item) {
      node.scrollTo({
        left: item.offsetLeft - node.offsetLeft,
        behavior: reduced ? "auto" : "smooth",
      });
      setIndex(i);
    }
  };
  if (!comparisons.length) return null;
  return (
    <div className="dc-results-carousel">
      <div
        className="dc-comparisons"
        ref={track}
        role="region"
        aria-label="Approved patient results. Swipe captions to browse; drag photos to compare."
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            go(index + (e.key === "ArrowRight" ? 1 : -1));
          }
        }}
        onScroll={() => {
          const node = track.current;
          if (!node) return;
          const first = node.children[0] as HTMLElement;
          const stride = first?.offsetWidth + 24;
          if (stride)
            setIndex(
              Math.min(
                comparisons.length - 1,
                Math.round(node.scrollLeft / stride),
              ),
            );
        }}
      >
        {comparisons.map((item) => (
          <div className="dc-comparison-slide" key={item.id}>
            {failed.includes(item.id) ? (
              <figure className="dc-unavailable-result">
                <EditorialImage
                  fallback={NEUTRAL_CLINIC_IMAGE}
                  alt="Comparison photos unavailable — no patient result shown"
                />
                <figcaption>
                  {item.title} · Comparison unavailable. No result is displayed.
                </figcaption>
              </figure>
            ) : (
              <BeforeAfter
                item={item}
                onImageError={() => setFailed((ids) => [...ids, item.id])}
              />
            )}
          </div>
        ))}
      </div>
      {comparisons.length > 1 && (
        <div className="dc-review-controls">
          <button
            type="button"
            aria-label="Previous result"
            disabled={index === 0}
            onClick={() => go(index - 1)}
          >
            <ChevronLeft size={20} />
          </button>
          <span aria-live="polite">
            {index + 1} / {comparisons.length}
          </span>
          <button
            type="button"
            aria-label="Next result"
            disabled={index === comparisons.length - 1}
            onClick={() => go(index + 1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
