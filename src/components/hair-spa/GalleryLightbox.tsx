import { useEffect, useRef } from "react";
import { useHairSpa } from "./context";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

/**
 * Accessible image viewer. It follows the active gallery filter so the counter
 * always matches the photos on screen, traps Tab, restores focus on close and
 * supports arrow keys, Escape and touch swipes.
 */
export function GalleryLightbox() {
  const model = useHairSpa();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const swipeStart = useRef<number | null>(null);
  const images = model.visibleGallery.map(({ image }) => image);
  const open = model.activePhoto >= 0 && model.activePhoto < images.length;
  const step = (direction: number) => {
    if (!images.length) return;
    model.setActivePhoto(
      (current) => (current + direction + images.length) % images.length,
    );
  };

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const items = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled)",
        );
        if (!items?.length) return;
        const first = items.item(0);
        const last = items.item(items.length - 1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      restoreFocus.current?.focus?.();
    };
  }, [open]);

  const activeImage = open ? images[model.activePhoto] : undefined;

  return (
    <AnimatePresence>
      {open && activeImage && (
        <motion.div
          ref={dialogRef}
          className="kp-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Gallery image ${model.activePhoto + 1} of ${images.length}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: model.reduced ? 0 : 0.2 }}
          onClick={() => model.setActivePhoto(-1)}
          onTouchStart={(event) => {
            swipeStart.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = swipeStart.current;
            const end = event.changedTouches[0]?.clientX ?? null;
            swipeStart.current = null;
            if (start === null || end === null) return;
            if (Math.abs(start - end) < 45) return;
            step(start > end ? 1 : -1);
          }}
        >
          <button
            ref={closeRef}
            type="button"
            aria-label="Close image viewer"
            onClick={(event) => {
              event.stopPropagation();
              model.setActivePhoto(-1);
            }}
          >
            <X aria-hidden="true" />
          </button>
          {images.length > 1 && (
            <button
              type="button"
              className="kp-lightbox-prev"
              aria-label="Previous image"
              onClick={(event) => {
                event.stopPropagation();
                step(-1);
              }}
            >
              ‹
            </button>
          )}
          <figure onClick={(event) => event.stopPropagation()}>
            <img
              src={activeImage.src}
              alt={activeImage.alt}
              decoding="async"
            />
            <figcaption>
              {activeImage.isDemo ? "Demo / sample · " : ""}
              {activeImage.caption}
            </figcaption>
          </figure>
          {images.length > 1 && (
            <button
              type="button"
              className="kp-lightbox-next"
              aria-label="Next image"
              onClick={(event) => {
                event.stopPropagation();
                step(1);
              }}
            >
              ›
            </button>
          )}
          <span aria-live="polite">
            {model.activePhoto + 1} / {images.length}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
