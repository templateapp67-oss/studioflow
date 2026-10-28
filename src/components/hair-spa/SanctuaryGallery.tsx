import { useHairSpa } from "./context";
import { Reveal } from "./Reveal";

export function SanctuaryGallery() {
  const model = useHairSpa();
  return (
    <>
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
                Take a look around the world of Kesh Prakriti. Swipe through on
                mobile to explore.
              </p>
            </Reveal>
          </div>
          <div
            className="kp-gallery-categories"
            role="group"
            aria-label="Photo gallery categories"
          >
            <button
              aria-pressed={model.galleryCategory === "All"}
              onClick={() => model.selectGalleryCategory("All")}
            >
              All ({model.displayImages.length})
            </button>
            {model.galleryCategories.map((category) => (
              <button
                key={category}
                aria-pressed={model.galleryCategory === category}
                onClick={() => model.selectGalleryCategory(category)}
              >
                {category} (
                {
                  model.displayImages.filter(
                    (image) => image.category === category,
                  ).length
                }
                )
              </button>
            ))}
          </div>
          <div className="kp-gallery-grid">
            {model.visibleGallery.map(({ image, index }) => (
              <button
                key={image.src}
                className={`kp-gallery-image kp-gallery-${index + 1}`}
                onClick={() => model.setActivePhoto(index)}
                aria-label={`View salon look ${index + 1} · Enlarge image: ${image.alt}`}
              >
                <img src={image.src} alt={image.alt} loading="lazy" />
                <span>
                  {image.isDemo ? "DEMO / SAMPLE · " : ""}
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {String(model.shownGallery.length).padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
          <div
            ref={model.galleryTrackRef}
            className="kp-gallery-mobile"
            aria-label="Sanctuary gallery"
            onScroll={(event) => {
              const track = event.currentTarget;
              const children = Array.from(track.children) as HTMLElement[];
              const nearest = children.reduce(
                (best, item, index) =>
                  Math.abs(item.offsetLeft - track.scrollLeft) <
                  Math.abs(children[best]?.offsetLeft - track.scrollLeft || 0)
                    ? index
                    : best,
                0,
              );
              model.setGalleryIndex(nearest);
            }}
          >
            {model.visibleGallery.map(({ image, index }, visibleIndex) => (
              <button
                key={image.src}
                onClick={() => model.setActivePhoto(index)}
                aria-label={`Enlarge sanctuary image ${index + 1}: ${image.alt}`}
              >
                <img src={image.src} alt={image.alt} loading="lazy" />
                <span>
                  {image.isDemo ? "Demo / sample · " : ""}
                  {image.caption}
                </span>
              </button>
            ))}
          </div>
          <div
            className="kp-gallery-pagination"
            aria-label="Gallery pagination"
          >
            {model.visibleGallery.map(({ image, index }, visibleIndex) => (
              <button
                key={image.src}
                aria-label={`Show gallery image ${visibleIndex + 1}`}
                aria-current={
                  model.galleryIndex === visibleIndex ? "true" : undefined
                }
                onClick={() => model.goToGalleryImage(visibleIndex)}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
