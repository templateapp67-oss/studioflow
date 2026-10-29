import { useState } from "react";
import type { Stylist } from "../../types";
import { useDermacure } from "./context";
import { dermacureTeamPortrait } from "../../lib/dermacureSite";

/**
 * The clinicians.
 *
 * A portrait resolves in this order: the clinic's saved photo → the bundled
 * demo portrait for a template clinician → a labelled initial. The frame keeps
 * a 3:4 ratio in every case, so a photograph that fails to decode can never
 * collapse the card or shift the grid.
 */
export function ClinicTeam({
  staff = [],
  onView,
  onBook,
}: {
  staff?: Stylist[];
  onView?: (id: string) => void;
  onBook?: (staff: Stylist) => void;
}) {
  const { visible, profile } = useDermacure();
  const [failed, setFailed] = useState<string[]>([]);
  if (!visible.stylists || !staff.length || !onView) return null;
  return (
    <section
      className="dc-section dc-clinic-team"
      id="salon-team"
      aria-labelledby="dc-team-title"
    >
      <div className="dc-container">
        <p className="dc-eyebrow">THE PEOPLE BEHIND YOUR CARE</p>
        <h2 id="dc-team-title">
          Meet your <em>care team.</em>
        </h2>
        <p className="dc-section-intro">
          Every consultation is run by a clinician who will explain the plan,
          the products and the aftercare in plain language. You can request a
          particular clinician when you book.
        </p>
        {!profile.subdomain && staff.some(s => ["sk-st-1", "sk-st-2", "sk-st-3"].includes(s.id)) && <p className="dc-empty">Template preview: sample team profiles are not verified clinic identities.</p>}
        <div className="dc-team-grid">
          {staff.map((s) => {
            const portrait = dermacureTeamPortrait(s);
            const usable = Boolean(portrait.src) && !failed.includes(portrait.src) && (!profile.subdomain || !portrait.isDemo);
            return (
              <article key={s.id}>
                <div
                  className="dc-staff-photo"
                  data-portrait={portrait.isDemo ? "demo" : "saved"}
                >
                  {usable ? (
                    <img
                      src={portrait.src}
                      alt={
                        portrait.isDemo
                          ? `${s.name} — demo / sample portrait`
                          : `${s.name}, ${s.role || "clinician"}`
                      }
                      loading="lazy"
                      decoding="async"
                      width={768}
                      height={1024}
                      onError={() =>
                        setFailed((urls) => [...urls, portrait.src])
                      }
                    />
                  ) : (
                    <span className="dc-staff-initial" aria-hidden="true">
                      {s.name.trim().slice(0, 1)}
                    </span>
                  )}
                  {usable && portrait.isDemo && (
                    <small className="dc-photo-note">Demo / sample portrait</small>
                  )}
                </div>
                <div>
                  <h3>{s.name}</h3>
                  <p>{s.role}</p>
                  {Boolean(s.specialties?.length) && (
                    <ul className="dc-staff-specialties">
                      {s.specialties.slice(0, 3).map((specialty) => (
                        <li key={specialty}>{specialty}</li>
                      ))}
                    </ul>
                  )}
                  {s.bio && <p>{s.bio}</p>}
                  <button className="dc-text-link" onClick={() => onView(s.id)}>
                    View profile &amp; reviews ↗
                  </button>
                  {onBook && (
                    <button
                      className="dc-btn"
                      disabled={s.status === "On Leave"}
                      onClick={() => onBook(s)}
                    >
                      Book with {s.name}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
