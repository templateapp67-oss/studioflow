import { ArrowRight, CalendarDays, CircleDollarSign, Clock3, FileClock, Percent, ShieldCheck, UserRound } from 'lucide-react';
import { SectionHeading } from '../ui';
import './staffCommissionPerformanceSection.css';

const COMMISSION_WORKFLOW = [
  {
    number: '01',
    title: 'Record a completed service and sale',
    status: 'LIVE',
    detail: 'Appointment records include the assigned staff member, service, price, amount paid and booking status.',
    icon: CalendarDays,
  },
  {
    number: '02',
    title: 'Confirm eligibility and staff rate',
    status: 'PARTIAL',
    detail: 'The owner editor saves one percentage field on a staff profile. Per-service, category and product-sales rules are not verified; the rate is not applied by a calculation engine.',
    icon: Percent,
  },
  {
    number: '03',
    title: 'Calculate and review commission',
    status: 'PLANNED',
    detail: 'No commission calculation, eligibility rules, date-range staff roll-up or staff-wide performance report was found in the reviewed product path.',
    icon: CircleDollarSign,
  },
  {
    number: '04',
    title: 'Approve, pay and log status',
    status: 'PLANNED',
    detail: 'No commission ledger, approval queue, pending/paid state or payout history is currently verified.',
    icon: FileClock,
  },
] as const;

const SAMPLE_SERVICE_SALES = [
  { service: 'Sample hair service', amount: '₹12,000' },
  { service: 'Sample styling service', amount: '₹8,000' },
];

export function StaffCommissionPerformanceSection() {
  return (
    <section
      className="sl-section sl-section--soft sl-staff-commission"
      id="staff-commission-performance"
      aria-labelledby="sl-staff-commission-title"
    >
      <div className="sl-container">
        <div className="sl-staff-commission__intro">
          <div className="sl-staff-commission__copy">
            <SectionHeading
              eyebrow="STAFF COMMISSION & PERFORMANCE"
              id="sl-staff-commission-title"
              align="left"
              title="Your Team Works Better When Everyone Knows Their Performance."
              description="Staff profiles can store a commission percentage, and appointment records keep their assigned specialist and payment details. The reviewed app path does not yet turn those pieces into staff performance reports or commission settlements."
            />
            <div className="sl-staff-commission__status-row" role="group" aria-label="Verified capability status">
              <span className="sl-staff-commission__status sl-staff-commission__status--partial">
                <span aria-hidden="true" /> PARTIAL · profile-rate configuration
              </span>
              <span className="sl-staff-commission__status sl-staff-commission__status--live">
                <span aria-hidden="true" /> LIVE · staff-linked appointments
              </span>
            </div>
            <p className="sl-staff-commission__disclosure">
              This is a capability-status showcase, not a second staff-management module. Rate configuration is not proof of a
              commission calculation, payment, or employee ranking.
            </p>
          </div>

          <figure
            className="sl-staff-commission__dashboard"
            aria-labelledby="sl-staff-commission-dashboard-title"
            aria-describedby="sl-staff-commission-dashboard-note"
          >
            <div className="sl-staff-commission__dashboard-head">
              <div>
                <span className="sl-staff-commission__eyebrow">COMMISSION WORKSPACE · DEMO</span>
                <h3 id="sl-staff-commission-dashboard-title">Staff performance &amp; commission</h3>
              </div>
              <span className="sl-staff-commission__demo-badge">SAMPLE ONLY</span>
            </div>

            <div className="sl-staff-commission__profile">
              <span className="sl-staff-commission__avatar" aria-hidden="true"><UserRound size={19} /></span>
              <div className="sl-staff-commission__profile-name">
                <strong>Demo staff member</strong>
                <span>Illustrative profile · not a real employee record</span>
              </div>
              <div className="sl-staff-commission__rate" aria-label="Sample profile rate, not a saved account value">
                <span>Commission type · percentage</span>
                <strong>10%</strong>
                <small>Sample profile rate · not saved</small>
              </div>
            </div>

            <div className="sl-staff-commission__metrics" role="group" aria-label="Sample appointment and sales metrics">
              <div>
                <span>Assigned appointments · sample</span>
                <strong>06</strong>
              </div>
              <div>
                <span>Completed services · sample</span>
                <strong>04</strong>
              </div>
              <div>
                <span>Total recorded sales · sample</span>
                <strong>₹20,000</strong>
              </div>
            </div>

            <div className="sl-staff-commission__sales">
              <div className="sl-staff-commission__panel-heading">
                <h4>Service-wise sales</h4>
                <span>DEMO DATA</span>
              </div>
              {SAMPLE_SERVICE_SALES.map(({ service, amount }) => (
                <div className="sl-staff-commission__sale-row" key={service}>
                  <span>{service}</span>
                  <strong>{amount}</strong>
                </div>
              ))}
              <p><span>Sample sales total</span><strong>₹20,000</strong></p>
            </div>

            <div className="sl-staff-commission__math" aria-label="Illustrative sample arithmetic only">
              <div className="sl-staff-commission__panel-heading">
                <h4>Illustrative commission math</h4>
                <span><Clock3 size={12} aria-hidden="true" /> NOT AN APP CALCULATION</span>
              </div>
              <p className="sl-staff-commission__equation">
                <span>₹20,000</span><b aria-hidden="true">×</b><span>10%</span><b aria-hidden="true">=</b><strong>₹2,000</strong>
              </p>
              <p className="sl-staff-commission__math-note">
                Sample figures only. Nexora does not calculate or save this commission amount in the reviewed product path.
              </p>
            </div>

            <div className="sl-staff-commission__settlement" role="group" aria-label="Commission payment tracking status">
              <div><span>Pending commission</span><strong>Not tracked</strong></div>
              <div><span>Paid commission</span><strong>Not tracked</strong></div>
              <div><span>Payment status</span><strong>Not recorded</strong></div>
            </div>

            <div className="sl-staff-commission__history">
              <div className="sl-staff-commission__panel-heading">
                <div><h4>Commission history</h4><span>Date · service · eligible amount · rate · commission · payment status</span></div>
                <ShieldCheck size={17} aria-hidden="true" />
              </div>
              <div className="sl-staff-commission__history-scroll" role="region" aria-label="Illustrative commission history fields; no records are available" tabIndex={0}>
                <table>
                  <caption className="sl-visually-hidden">Commission history fields. The reviewed app does not store commission records.</caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Service</th>
                      <th scope="col">Eligible amount</th>
                      <th scope="col">Rate</th>
                      <th scope="col">Commission</th>
                      <th scope="col">Payment status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan={6}>No commission transactions are recorded by the reviewed app path.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <figcaption id="sl-staff-commission-dashboard-note" className="sl-staff-commission__caption">
              Static concept only. All sample inputs and arithmetic are illustrative; no commission record or payment is created.
            </figcaption>
          </figure>
        </div>

        <div className="sl-staff-commission__workflow" role="group" aria-label="Staff commission capability workflow">
          {COMMISSION_WORKFLOW.map(({ number, title, status, detail, icon: Icon }) => (
            <article className="sl-staff-commission__step" key={number}>
              <div className="sl-staff-commission__step-head">
                <span className="sl-staff-commission__step-icon" aria-hidden="true"><Icon size={17} /></span>
                <span className={`sl-staff-commission__step-status sl-staff-commission__step-status--${status.toLowerCase()}`}>{status}</span>
              </div>
              <p className="sl-staff-commission__step-number">{number}</p>
              <h3>{title}</h3>
              <p>{detail}</p>
            </article>
          ))}
        </div>

        <p className="sl-staff-commission__roadmap-note">
          “PLANNED” marks an unimplemented workflow concept, not a delivery date or product commitment. Status reflects the
          checked-in source; production deployment was not independently verified.
          <ArrowRight size={15} aria-hidden="true" />
        </p>
      </div>
    </section>
  );
}
