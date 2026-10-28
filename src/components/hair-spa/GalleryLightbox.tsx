import { useHairSpa } from "./context";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export function GalleryLightbox() {
  const model = useHairSpa();
  return (
    <>
      <AnimatePresence>
        {model.activePhoto >= 0 && (
          <motion.div
            className="kp-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Sanctuary image"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => model.setActivePhoto(-1)}
          >
            <button
              aria-label="Close image"
              onClick={() => model.setActivePhoto(-1)}
            >
              <X />
            </button>
            <button
              className="kp-lightbox-prev"
              aria-label="Previous image"
              onClick={(event) => {
                event.stopPropagation();
                model.setActivePhoto(
                  (current) =>
                    (current - 1 + model.shownGallery.length) %
                    model.shownGallery.length,
                );
              }}
            >
              ‹
            </button>
            <img
              src={model.shownGallery[model.activePhoto]?.src}
              alt={model.shownGallery[model.activePhoto]?.alt}
              onClick={(event) => event.stopPropagation()}
            />
            <button
              className="kp-lightbox-next"
              aria-label="Next image"
              onClick={(event) => {
                event.stopPropagation();
                model.setActivePhoto(
                  (current) => (current + 1) % model.shownGallery.length,
                );
              }}
            >
              ›
            </button>
            <span>
              {model.activePhoto + 1} / {model.shownGallery.length}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
