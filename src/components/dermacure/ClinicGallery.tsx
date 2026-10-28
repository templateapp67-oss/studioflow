import { EditorialImage, NEUTRAL_CLINIC_IMAGE } from "./EditorialImage";
import { useState } from "react";
import type { SalonGalleryPhoto } from "../../lib/photoGallery";
import { useDermacure } from "./context";
import { clinicGalleryEntries } from "../../lib/dermacureSite";

/**
 * The clinic, in photographs.
 *
 * The grid is data-driven: whatever the clinic has published, or — when nothing
 * is published yet — the bundled reference photography, labelled "Demo /
 * sample". The page never presents a reference photograph as the clinic's own
 * room, and a photograph that cannot be decoded keeps its tile, loses its link
 * (it must not point at a URL that 404s) and says so.
 */
export function ClinicGallery({ photos = [] }: { photos?: SalonGalleryPhoto[] }) {
  const { visible } = useDermacure();
  const [failed, setFailed] = useState<string[]>([]);
  const [category, setCategory] = useState("All");
  const entries = clinicGalleryEntries(photos);
  if (!visible.gallery) return null;
  const showingDemo = entries.some((entry) => entry.isDemo);
  const categories = ["All", ...new Set(entries.map((entry) => entry.category))];
  const visibleEntries = entries.filter(
    (entry) => category === "All" || entry.category === category,
  );
  return (
    <section
      className="dc-section dc-clinic-gallery"
      id="clinic-gallery"
      aria-labelledby="dc-gallery-title"
    >
      <div className="dc-container">
        <p className="dc-eyebrow">INSIDE THE CLINIC</p>
        <h2 id="dc-gallery-title">
          A closer look at <em>our space &amp; care.</em>
        </h2>
        <p className="dc-section-intro dc-gallery-note">
          {showingDemo
            ? "Demo / sample photographs of a clinic interior, its treatments and its technology. The clinic's own photographs replace these once they are published."
            : "Photographs published by the clinic: rooms, treatments and the technology used during your visit."}
        </p>
        <div className="dc-filters" aria-label="Gallery categories">
          {categories.map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c} (
              {entries.filter((entry) => c === "All" || entry.category === c).length}
              )
            </button>
          ))}
        </div>
        {visibleEntries.length === 0 ? (
          <p className="dc-empty" role="status">
            No clinic photographs in this category yet.
          </p>
        ) : (
          <div
            className="dc-gallery-grid"
            data-count={Math.min(visibleEntries.length, 8)}
          >
            {visibleEntries.map((p, index) => {
              const unusable = failed.includes(p.url);
              return (
                <a
                  href={unusable ? undefined : p.url}
                  key={p.id}
                  target="_blank"
                  rel="noreferrer"
                  className={`dc-gallery-tile dc-gallery-tile-${index + 1}`}
                  aria-label={
                    unusable
                      ? `${p.category} clinic photo unavailable`
                      : `Open ${p.category} photo in a new tab: ${p.title}`
                  }
                >
                  <EditorialImage
                    fallback={NEUTRAL_CLINIC_IMAGE}
                    fallbackAlt="Clinic photo unavailable — neutral skincare illustration"
                    onPrimaryError={() =>
                      setFailed((urls) => [...urls, p.url])
                    }
                    src={p.url}
                    alt={`${p.category} — ${p.isDemo ? "demo / sample photo" : "clinic-published photo"}`}
                    loading={index < 2 ? "eager" : "lazy"}
                  />
                  <span>
                    {p.isDemo ? "DEMO / SAMPLE · " : ""}
                    {p.title}{" "}
                    {unusable ? "· Photo unavailable (illustration)" : "↗"}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
