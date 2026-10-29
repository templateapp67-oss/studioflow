import { useState } from "react";
import { useHairSpa } from "./context";
import { ArrowRight, Leaf } from "lucide-react";
import { Reveal } from "./Reveal";
import { AnimatePresence, motion } from "motion/react";
import { GalleryImage } from "./GalleryImage";

type GalleryImage = ReturnType<typeof useHairSpa>["shownGallery"][number];

/**
 * One gallery tile. If the photograph cannot be decoded (offline build, a
 * deleted upload, a blocked CDN) the tile keeps its footprint and shows a
 * labelled placeholder instead of a broken-image icon or an empty hole in the
 * grid, so the mosaic never collapses.
 */
function GalleryThumb({
  image,
  position,
  total,
  onOpen,
}: {
  image: GalleryImage;
  position: number;
  total: number;
  onOpen: () => void;
  /** Accepted so the animated list can pass a React key. */
  key?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      type="button"
      className={`kp-gallery-image kp-gallery-${position + 1}`}
      onClick={onOpen}
      aria-label={`Enlarge image ${position + 1} of ${total}: ${image.alt}`}
    >
      {failed ? (
        <div
          className="kp-gallery-missing"
          role="img"
          aria-label={`Photograph unavailable: ${image.alt}`}
        >
          <Leaf size={22} aria-hidden="true" />
          <small>Photograph unavailable</small>
        </div>
      ) : (
        <GalleryImage
          src={image.src}
          alt={image.alt}
          className="kp-gallery-image-wrapper"
          onError={() => setFailed(true)}
        />
      )}
      <span>
        {image.isDemo ? "DEMO / SAMPLE · " : ""}
        {String(position + 1).padStart(2, "0")} /{" "}
        {String(total).padStart(2, "0")}
      </span>
    </motion.button>
  );
}

/**
 * The sanctuary, in words and photographs.
 *
 * Two responsibilities, two sections: `#sanctuary` describes the room (the
 * brand story), `#gallery` shows the photographs and owns the filters and the
 * lightbox. Neither carries prices, service copy or a second booking call to
 * action — the service menu and the booking section own those.
 */
export function SanctuaryGallery() {
  const model = useHairSpa();
  const total = model.shownGallery.length;
  const filteredCount = model.visibleGallery.length;
  const showingDemo = model.shownGallery.some((image) => image.isDemo);
  return (
    <>
      <section
        className="kp-gallery-intro"
        id="sanctuary"
        data-layout="sanctuary"
        aria-labelledby="kp-sanctuary-title"
      >
        <div className="kp-container kp-gallery-intro-inner">
          <Reveal>
            <p className="kp-eyebrow kp-light">THE SANCTUARY</p>
            <h2 id="kp-sanctuary-title">
              A quiet room,
              <br />a <em>slower hour.</em>
            </h2>
          </Reveal>
          <Reveal className="kp-gallery-intro-copy">
            <p>
              Step in and the city drops away. Warm lamplight instead of
              downlights, plants from the courtyard, folded cotton and the low
              hum of the steam room. There is no music you have to talk over and
              no clock in sight.
            </p>
            <p>
              Each treatment happens in its own curtained room with a basin, a
              warmed bed and a place for your things. Between rituals we air the
              room, change the linen and let the herbs settle again — which is
              why the appointments here are spaced, not stacked.
            </p>
            <ul className="kp-sanctuary-details">
              <li>Warm towels &amp; filtered water</li>
              <li>Courtyard plants, quiet light</li>
              <li>One guest at a time, per room</li>
            </ul>
            <button
              type="button"
              className="kp-inline-link kp-inline-link-light"
              onClick={() => model.scrollTo("gallery")}
            >
              Look around the sanctuary{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </Reveal>
        </div>
      </section>

      <section
        className="kp-gallery kp-gallery-body"
        id="gallery"
        data-layout="gallery"
        aria-labelledby="kp-gallery-title"
      >
        <div className="kp-container">
          <div className="kp-gallery-heading">
            <Reveal>
              <p className="kp-eyebrow">GALLERY</p>
              <h2 id="kp-gallery-title">
                The sanctuary,
                <br />
                <em>in photographs.</em>
              </h2>
            </Reveal>
            <Reveal>
              <p className="kp-gallery-demo">
                {showingDemo
                  ? "Demo / sample photographs. The salon’s own photographs appear here once they are added."
                  : "Photographs of the salon, its treatments and its rituals. Swipe on your phone to see more."}
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
              {/* Desktop / tablet mosaic. The tile count drives the layout, so
                  a two-photo gallery and an eight-photo gallery both sit
                  square in the grid. */}
              <motion.div
                className="kp-gallery-grid"
                data-count={Math.min(filteredCount, 8)}
              >
                <AnimatePresence initial={false}>
                  {model.visibleGallery.map(({ image, index }, position) => (
                    <GalleryThumb
                      key={`${image.src}-${index}`}
                      image={image}
                      position={position}
                      total={filteredCount}
                      onOpen={() => model.setActivePhoto(position)}
                    />
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
                    <GalleryImage
                      src={image.src}
                      alt={image.alt}
                      className="kp-gallery-image-wrapper"
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
    </>
  );
}
