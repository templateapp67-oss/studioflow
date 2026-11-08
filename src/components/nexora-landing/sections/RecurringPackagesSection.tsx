import { CalendarDays, CheckCircle2, Clock3, PackageCheck, UserRound } from 'lucide-react';
import { SectionHeading } from '../ui';
import './recurringPackagesSection.css';

const PACKAGE_STEPS = [
  'Create package',
  'Assign customer',
  'Schedule sessions',
  'Complete session',
  'Update remaining sessions',
];

const PACKAGE_CAPABILITIES = [
  {
    icon: PackageCheck,
    title: '1. Create service packages',
    details: ['Package name, included services and price', 'Total sessions, duration and validity period'],
  },
  {
    icon: UserRound,
    title: '2. Assign packages to customers',
    details: ['Select a customer and record purchase details', 'Show package status and history'],
  },
  {
    icon: CalendarDays,
    title: '3. Schedule sessions',
    details: ['Choose appointment date and time', 'Assign staff where supported; manage future sessions'],
  },
  {
    icon: CheckCircle2,
    title: '4. Track session usage',
    details: ['Total, completed, upcoming and remaining sessions', 'Expiry date and package history'],
  },
];

/** A clearly labelled roadmap illustration; it does not create package records. */
export function RecurringPackagesSection() {
  return (
    <section
      className="sl-section sl-recurring-packages"
      id="recurring-packages"
      aria-labelledby="sl-recurring-packages-title"
    >
      <div className="sl-container">
        <div className="sl-recurring-packages__intro">
          <SectionHeading
            eyebrow="PACKAGE & SESSION MANAGEMENT"
            id="sl-recurring-packages-title"
            align="left"
            title="Sell Service Packages. Manage Every Session Without Confusion."
            description="Multi-visit salon packages can be difficult to track manually. Package listings are available in some salon storefront templates, but assigning a package to a customer, scheduling its sessions and tracking remaining visits are not live features yet. The examples below illustrate a planned workflow—not active product functionality."
          />
          <span className="sl-recurring-packages__status">
            <span aria-hidden="true" />
            PARTIAL · package listings in some templates
          </span>
        </div>

        <div className="sl-recurring-packages__capabilities">
          {PACKAGE_CAPABILITIES.map(({ icon: Icon, title, details }) => (
            <article className="sl-recurring-packages__capability" key={title}>
              <span className="sl-recurring-packages__capability-icon" aria-hidden="true">
                <Icon size={19} strokeWidth={1.8} />
              </span>
              <h3>{title}</h3>
              <ul>
                {details.map((detail) => <li key={detail}>{detail}</li>)}
              </ul>
              <span className="sl-recurring-packages__planned-label">Planned</span>
            </article>
          ))}
        </div>

        <div className="sl-recurring-packages__demos">
          <article className="sl-recurring-packages__demo-card sl-recurring-packages__package-demo">
            <div className="sl-recurring-packages__demo-heading">
              <div>
                <span className="sl-recurring-packages__eyebrow">PACKAGE OVERVIEW</span>
                <h3>Customer package</h3>
              </div>
              <span className="sl-recurring-packages__demo-tag">DEMONSTRATION DATA</span>
            </div>

            <div className="sl-recurring-packages__customer">
              <span className="sl-recurring-packages__avatar" aria-hidden="true">PS</span>
              <span>
                <strong>Priya Sharma</strong>
                <small>Illustrative customer · not a real record</small>
              </span>
              <span className="sl-recurring-packages__sample-status">Active · sample</span>
            </div>

            <div className="sl-recurring-packages__package-name">
              <div>
                <span>PACKAGE</span>
                <strong>Hair Treatment Package</strong>
              </div>
              <PackageCheck size={20} aria-hidden="true" />
            </div>

            <div className="sl-recurring-packages__session-stats">
              <div><strong>6</strong><span>Total sessions</span></div>
              <div><strong>2</strong><span>Completed</span></div>
              <div><strong>4</strong><span>Remaining</span></div>
            </div>

            <div className="sl-recurring-packages__progress-label">
              <span>Sample session usage</span>
              <strong>2 of 6</strong>
            </div>
            <div
              className="sl-recurring-packages__progress"
              role="img"
              aria-label="Illustrative sample: 2 of 6 package sessions completed"
            >
              <span />
            </div>
          </article>

          <article className="sl-recurring-packages__demo-card sl-recurring-packages__calendar-demo">
            <div className="sl-recurring-packages__demo-heading">
              <div>
                <span className="sl-recurring-packages__eyebrow">SESSION CALENDAR</span>
                <h3>Upcoming sessions</h3>
              </div>
              <CalendarDays size={21} aria-hidden="true" />
            </div>

            <div className="sl-recurring-packages__calendar-days" aria-hidden="true">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                <span className={index === 2 || index === 5 ? 'is-marked' : ''} key={`${day}-${index}`}>
                  {day}
                </span>
              ))}
            </div>

            <div className="sl-recurring-packages__session-row">
              <span className="sl-recurring-packages__session-icon" aria-hidden="true"><Clock3 size={16} /></span>
              <span><strong>Session 03</strong><small>Upcoming · illustrative date and time</small></span>
              <span className="sl-recurring-packages__upcoming">Sample</span>
            </div>
            <div className="sl-recurring-packages__session-row">
              <span className="sl-recurring-packages__session-icon" aria-hidden="true"><Clock3 size={16} /></span>
              <span><strong>Session 04</strong><small>Upcoming · illustrative date and time</small></span>
              <span className="sl-recurring-packages__upcoming">Sample</span>
            </div>

            <p className="sl-recurring-packages__visual-note">Illustrative interface · no live appointments or package records</p>
          </article>
        </div>

        <div className="sl-recurring-packages__journey-wrap">
          <div>
            <span className="sl-recurring-packages__eyebrow">PLANNED CUSTOMER JOURNEY</span>
            <h3>From package setup to session tracking</h3>
          </div>
          <ol className="sl-recurring-packages__journey">
            {PACKAGE_STEPS.map((step, index) => (
              <li key={step}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{step}</strong>
              </li>
            ))}
          </ol>
        </div>

        <p className="sl-recurring-packages__disclosure">
          Package renewal and automated recurring booking are not available. Customer assignment, session scheduling,
          remaining-session tracking and expiry history shown here are planned concepts only; nothing in this mockup
          creates or updates salon data.
        </p>
      </div>
    </section>
  );
}
