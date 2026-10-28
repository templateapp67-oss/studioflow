import { useState } from "react";
import type { Stylist } from "../../types";
import { useDermacure } from "./context";
export function ClinicTeam({
  staff = [],
  onView,
  onBook,
}: {
  staff?: Stylist[];
  onView?: (id: string) => void;
  onBook?: (staff: Stylist) => void;
}) {
  const { visible } = useDermacure();
  const [failed, setFailed] = useState<string[]>([]);
  if (!visible.stylists || !staff.length || !onView) return null;
  return (
    <section className="dc-section dc-clinic-team" id="salon-team">
      <div className="dc-container">
        <p className="dc-eyebrow">THE PEOPLE BEHIND YOUR CARE</p>
        <h2>
          Meet your <em>care team.</em>
        </h2>
        <div className="dc-team-grid">
          {staff.map((s) => (
            <article key={s.id}>
              {s.avatarUrl && !failed.includes(s.id) ? (
                <img
                  src={s.avatarUrl}
                  alt={s.name}
                  loading="lazy"
                  onError={() => setFailed((ids) => [...ids, s.id])}
                />
              ) : (
                <span className="dc-staff-initial" aria-hidden="true">
                  {s.name.trim().slice(0, 1)}
                </span>
              )}
              <div>
                <h3>{s.name}</h3>
                <p>{s.role}</p>
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
          ))}
        </div>
      </div>
    </section>
  );
}
