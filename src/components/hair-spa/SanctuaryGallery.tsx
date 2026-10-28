import { useHairSpa } from "./context";
import { Reveal } from "./Reveal";

export function SanctuaryGallery() {
  const model = useHairSpa();
  const total = model.shownGallery.length;
  const filteredCount = model.visibleGallery.length;
  const showingDemo = model.shownGallery.some((image) => image.isDemo);
  return (
    <section className="kp-gallery kp-section" id="gallery">
      <div className="kp-container">
        <div className="kp-section-heading">
          <Reveal>
            <p className="kp-eyebrow">A GLIMPSE INSIDE</p>
            <h2>
              Find your moment
              <br />
              <em>of calm.</em>
            </h2>
          </Reveal>
          <Reveal>
            <p>
              {showingDemo
                ? "These are demo / sample photographs that ship with the template. The sanctuary's own saved photos appear here once they are added."
                : "Photographs saved by the sanctuary. Swipe through on mobile to explore."}
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
            No photographs in this category yet.
          </p>
        ) : (
          <>
            {/* Desktop / tablet mosaic */}
            <div className="kp-gallery-grid">
              {model.visibleGallery.map(({ image, index }, position) => (
                <button
                  key={`${image.src}-${index}`}
                  type="button"
                  className={`kp-gallery-image kp-gallery-${position + 1}`}
                  onClick={() => model.setActivePhoto(index)}
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
                </button>
              ))}
            </div>

            {/* Mobile swipe track */}
            <div
              ref={model.galleryTrackRef}
              className="kp-gallery-mobile"
              role="region"
              aria-label="Sanctuary gallery, swipe horizontally"
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
                  onClick={() => model.setActivePhoto(index)}
                  aria-label={`Enlarge sanctuary image ${position + 1}: ${image.alt}`}
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
