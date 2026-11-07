import { CalendarDays, IndianRupee, UsersRound, LayoutDashboard, Wallet, BarChart3, UserCog } from 'lucide-react';

/**
 * Original, hand-built illustration of the salon workspace.
 *
 * It is deliberately not a screenshot: every figure is a dash and each tile is
 * labelled "No live data", so the page never presents illustrative numbers as
 * real salon results.
 */
export function WorkspaceIllustration() {
  return (
    <div className="sl-workspace" role="img" aria-label="Illustrative Nexora SalonOS workspace preview showing an appointment calendar, revenue summary, customer panel and staff schedule. No live business data.">
      <div className="sl-workspace__bar">
        <span className="sl-workspace__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="sl-workspace__title">
          Salon workspace
          <small>Illustrative preview · no live salon data</small>
        </span>
        <span className="sl-workspace__avatar" aria-hidden="true">
          N
        </span>
      </div>
      <div className="sl-workspace__body">
        <div className="sl-workspace__rail" aria-hidden="true">
          <span className="sl-workspace__rail-mark">
            <LayoutDashboard size={15} />
          </span>
          <span className="is-active">
            <CalendarDays size={15} />
          </span>
          <span>
            <UserCog size={15} />
          </span>
          <span>
            <Wallet size={15} />
          </span>
          <span>
            <BarChart3 size={15} />
          </span>
        </div>
        <div className="sl-workspace__content">
          <div className="sl-workspace__heading">
            <div>
              <small>YOUR SALON WORKSPACE</small>
              <strong>Workspace overview</strong>
            </div>
            <span className="sl-workspace__badge">Preview</span>
          </div>

          <div className="sl-workspace__stats">
            <div>
              <small>Today&apos;s bookings</small>
              <b aria-hidden="true">—</b>
              <span>
                <CalendarDays size={12} aria-hidden="true" /> No live data
              </span>
            </div>
            <div>
              <small>Revenue summary</small>
              <b aria-hidden="true">—</b>
              <span>
                <IndianRupee size={12} aria-hidden="true" /> No live data
              </span>
            </div>
            <div>
              <small>Customers</small>
              <b aria-hidden="true">—</b>
              <span>
                <UsersRound size={12} aria-hidden="true" /> No live data
              </span>
            </div>
          </div>

          <div className="sl-workspace__lower">
            <div className="sl-workspace__panel">
              <div className="sl-workspace__panel-title">
                <b>Appointment calendar</b>
                <span>Illustrative</span>
              </div>
              <div className="sl-workspace__calendar">
                <div className="sl-workspace__times" aria-hidden="true">
                  <span>09</span>
                  <span>10</span>
                  <span>11</span>
                  <span>12</span>
                </div>
                <div className="sl-workspace__grid" aria-hidden="true">
                  {Array.from({ length: 16 }).map((_, index) => (
                    <i key={index} />
                  ))}
                  <span className="sl-workspace__slot sl-workspace__slot--a" />
                  <span className="sl-workspace__slot sl-workspace__slot--b" />
                </div>
              </div>
            </div>
            <div className="sl-workspace__panel">
              <div className="sl-workspace__panel-title">
                <b>Staff schedule</b>
                <UserCog size={14} aria-hidden="true" />
              </div>
              <ul className="sl-workspace__staff">
                <li>
                  <i aria-hidden="true" />
                  <span>Stylist 1</span>
                  <b>09:00 – 17:00</b>
                </li>
                <li>
                  <i aria-hidden="true" />
                  <span>Stylist 2</span>
                  <b>11:00 – 19:00</b>
                </li>
                <li>
                  <i aria-hidden="true" />
                  <span>Reception</span>
                  <b>10:00 – 18:00</b>
                </li>
              </ul>
              <p className="sl-workspace__note">Illustrative layout · no salon records</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface PreviewPanel {
  id: string;
  title: string;
  caption: string;
  kind: 'calendar' | 'customer' | 'report';
}

/** Three small illustrative panels used by the product experience section. */
export function PreviewPanels({ panels }: { panels: PreviewPanel[] }) {
  return (
    <div className="sl-preview-panels">
      {panels.map((panel) => (
        <article className="sl-preview-panel" key={panel.id}>
          <div className="sl-preview-panel__head">
            <b>{panel.title}</b>
            <span>Illustrative</span>
          </div>
          {panel.kind === 'calendar' ? (
            <div className="sl-preview-panel__calendar" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, index) => (
                <i key={index} className={index % 5 === 1 ? 'is-booked' : undefined} />
              ))}
            </div>
          ) : null}
          {panel.kind === 'customer' ? (
            <div className="sl-preview-panel__record" aria-hidden="true">
              <span className="sl-preview-panel__avatar" />
              <i />
              <i />
              <i />
            </div>
          ) : null}
          {panel.kind === 'report' ? (
            <div className="sl-preview-panel__bars" aria-hidden="true">
              {[42, 68, 54, 86, 61, 74].map((height, index) => (
                <i key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
          ) : null}
          <p className="sl-preview-panel__caption">{panel.caption}</p>
        </article>
      ))}
    </div>
  );
}
