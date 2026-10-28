import { EditorialImage, NEUTRAL_CLINIC_IMAGE } from "./EditorialImage";
import { useState } from "react";
import type { SalonGalleryPhoto } from "../../lib/photoGallery";
import { secureMediaUrl } from "../../lib/socialVideoSource";
import { useDermacure } from "./context";
export function ClinicGallery({
  photos = [],
}: {
  photos?: SalonGalleryPhoto[];
}) {
  const { visible } = useDermacure();
  const [failed, setFailed] = useState<string[]>([]);
  const [category, setCategory] = useState("All");
  const approved = photos.filter((p) => !p.isDemo && secureMediaUrl(p.url));
  if (!visible.gallery || !approved.length) return null;
  const categories = ["All", ...new Set(approved.map((p) => p.category))];
  return (
    <section className="dc-section dc-clinic-gallery" id="clinic-gallery">
      <div className="dc-container">
        <p className="dc-eyebrow">INSIDE THE CLINIC</p>
        <h2>
          A closer look at <em>our space & care.</em>
        </h2>
        <div className="dc-filters" aria-label="Gallery categories">
          {categories.map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c} (
              {approved.filter((p) => c === "All" || p.category === c).length})
            </button>
          ))}
        </div>
        <div className="dc-gallery-grid">
          {approved
            .filter((p) => category === "All" || p.category === category)
            .map((p) => (
              <a
                href={failed.includes(p.url) ? undefined : p.url}
                key={p.id}
                target="_blank"
                rel="noreferrer"
                aria-label={
                  failed.includes(p.url)
                    ? `${p.category} clinic photo unavailable`
                    : `Open ${p.category} photo in a new tab`
                }
              >
                <EditorialImage
                  fallback={NEUTRAL_CLINIC_IMAGE}
                  fallbackAlt="Clinic photo unavailable — neutral skincare illustration"
                  onPrimaryError={() => setFailed((urls) => [...urls, p.url])}
                  src={p.url}
                  alt={`${p.category} — clinic-published photo`}
                  loading="lazy"
                />
                <span>
                  {p.category}{" "}
                  {failed.includes(p.url)
                    ? "· Photo unavailable (illustration)"
                    : "↗"}
                </span>
              </a>
            ))}
        </div>
      </div>
    </section>
  );
}
