import { useHairSpa } from "./context";
import { Reveal } from "./Reveal";
import { AnimatePresence, motion } from "motion/react";

export function GallerySection() {
  const model = useHairSpa();
  const total = model.shownGallery.length;
  const filteredCount = model.visibleGallery.length;
  const showingDemo = model.shownGallery.some((image) => image.isDemo);
  return (
    <section className="kp-gallery kp-section" id="gallery">
      <div className="kp-container">
        <div className="kp-section-heading">
          <Reveal>
            <p className="kp-eyebrow">OUR GALLERY</p>
            <h2>
              A look inside
              <br />
              <em>our salon.</em>
            </h2>
          </Reveal>
          <Reveal>
            <p>
              {showingDemo
                ? "These are sample photos. The salon’s own photos will appear here when added."
                : "Take a look at our salon and services. Swipe on your phone to see more."}
            </p>
          </Reveal>
        </div>

        <div
          className="kp-gallery-categories"
          role="group"
          aria-label="Photo gallery categories"
        >
          <button
            type="button"
            aria-pressed={model.galleryCategory === "All"}
            onClick={() => model.selectGalleryCategory("All")}
          >
            All ({total})
          </button>
          {model.galleryCategories.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={model.galleryCategory === category}
              onClick={() => model.selectGalleryCategory(category)}
            >
              {category} ({model.galleryCategoryCount(category)})
            </button>
          ))}
        </div>

        {filteredCount === 0 ? (
          <p className="kp-empty-services" role="status">
            No photos in this category yet.
          </p>
        ) : (
          <>
            {/* Desktop / tablet mosaic */}
            <motion.div className="kp-gallery-grid" layout>
              <AnimatePresence mode="popLayout">
                {model.visibleGallery.map(({ image, index }, position) => (
                  <motion.button
                    key={`${image.src}-${index}`}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    type="button"
                    className={`kp-gallery-image kp-gallery-${position + 1}`}
                    onClick={() => model.setActivePhoto(position)}
                    aria-label={`Enlarge image ${position + 1} of ${filteredCount}: ${image.alt}`}
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      loading="lazy"
                      decoding="async"
                    />
                    <span>
                      {image.isDemo ? "DEMO / SAMPLE · " : ""}
                      {String(position + 1).padStart(2, "0")} /{" "}
                      {String(filteredCount).padStart(2, "0")}
                    </span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Mobile swipe track */}
            <div
              ref={model.galleryTrackRef}
              className="kp-gallery-mobile"
              role="region"
              aria-label="Salon gallery, swipe horizontally"
              aria-roledescription="carousel"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
                  return;
                }
                event.preventDefault();
                const step = event.key === "ArrowRight" ? 1 : -1;
                const next =
                  (model.galleryIndex + step + filteredCount) % filteredCount;
                model.setGalleryIndex(next);
                model.goToGalleryImage(next);
              }}
              onScroll={(event) => {
                const track = event.currentTarget;
                const children = Array.from(track.children) as HTMLElement[];
                if (!children.length) return;
                const nearest = children.reduce(
                  (best, item, index) =>
                    Math.abs(item.offsetLeft - track.scrollLeft) <
                    Math.abs(children[best].offsetLeft - track.scrollLeft)
                      ? index
                      : best,
                  0,
                );
                model.setGalleryIndex(nearest);
              }}
            >
              {model.visibleGallery.map(({ image, index }, position) => (
                <button
                  key={`mobile-${image.src}-${index}`}
                  type="button"
                  onClick={() => model.setActivePhoto(position)}
                  aria-label={`Enlarge salon image ${position + 1}: ${image.alt}`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    decoding="async"
                  />
                  <span>
                    {image.isDemo ? "Demo / sample · " : ""}
                    {image.caption}
                  </span>
                </button>
              ))}
            </div>

            {filteredCount > 1 && (
              <div
                className="kp-gallery-pagination"
                role="group"
                aria-label="Gallery pagination"
              >
                {model.visibleGallery.map(({ index }, position) => (
                  <button
                    key={`dot-${index}`}
                    type="button"
                    aria-label={`Show gallery image ${position + 1} of ${filteredCount}`}
                    aria-current={
                      model.galleryIndex === position ? "true" : undefined
                    }
                    onClick={() => model.goToGalleryImage(position)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
