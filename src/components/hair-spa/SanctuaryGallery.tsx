import { useHairSpa } from "./context";
import { Reveal } from "./Reveal";
import { AnimatePresence, motion } from "motion/react";

/**
 * The sanctuary, in photographs. This is the page's only visual gallery and it
 * never carries prices, service copy or a second booking call to action — the
 * service menu and booking section own those.
 */
export function SanctuaryGallery() {
  const model = useHairSpa();
  const total = model.shownGallery.length;
  const filteredCount = model.visibleGallery.length;
  const showingDemo = model.shownGallery.some((image) => image.isDemo);
  return (
    <section
      className="kp-gallery"
      id="gallery"
      data-layout="gallery"
      aria-labelledby="kp-gallery-title"
    >
      <div className="kp-gallery-intro">
        <div className="kp-container kp-gallery-intro-inner">
          <Reveal>
            <p className="kp-eyebrow kp-light">THE SANCTUARY</p>
            <h2 id="kp-gallery-title">
              A quiet room,
              <br />a <em>slower hour.</em>
            </h2>
          </Reveal>
          <Reveal className="kp-gallery-intro-copy">
            <p>
              The room, the light and the unhurried hour your treatment happens
              in. Look around before you arrive — this is what your visit feels
              like.
            </p>
            <p className="kp-gallery-demo">
              {showingDemo
                ? "Demo / sample photographs. The salon’s own photographs appear here once they are added."
                : "Photographs of the salon and its treatments. Swipe on your phone to see more."}
            </p>
          </Reveal>
        </div>
      </div>

      <div className="kp-gallery-body">
        <div className="kp-container">
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
              {/* Fade/scale enter-exit only: no layout projection work, so the
                  filter stays predictable on low-powered phones. */}
              <motion.div className="kp-gallery-grid">
                <AnimatePresence initial={false}>
                  {model.visibleGallery.map(({ image, index }, position) => (
                    <motion.button
                      key={`${image.src}-${index}`}
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
      </div>
    </section>
  );
}
