import { ArrowRight, CalendarDays, Check, CircleAlert, Clock3, MessageCircle, RotateCcw, Scissors } from 'lucide-react';
import { SectionHeading } from '../ui';
import './customerRecallSection.css';

const RECALL_EXAMPLES = [
  {
    id: 'sample-aditi',
    initials: 'AR',
    name: 'Aditi Rao',
    phone: '+91 9••• 4812',
    lastVisit: '34 days ago',
    service: 'Hair colour',
    exampleWindow: '30-day example',
    status: 'Review due',
    nextAction: 'Owner review · demo',
  },
  {
    id: 'sample-kabir',
    initials: 'KS',
    name: 'Kabir Shah',
    phone: '+91 9••• 7826',
    lastVisit: '52 days ago',
    service: 'Classic haircut',
    exampleWindow: '45-day example',
    status: 'Draft ready',
    nextAction: 'Personal message · demo',
  },
  {
    id: 'sample-maya',
    initials: 'MJ',
    name: 'Maya Jain',
    phone: '+91 9••• 1935',
    lastVisit: '74 days ago',
    service: 'Facial',
    exampleWindow: '60-day example',
    status: 'Follow up later',
    nextAction: 'Owner-set reminder · demo',
  },
];

const RECALL_STEPS = [
  {
    number: '01',
    title: 'A visit is completed',
    detail: 'Customers can revisit completed appointments and start a rebooking journey in the customer app.',
    icon: Check,
    state: 'LIVE',
  },
  {
    number: '02',
    title: 'Choose a follow-up window',
    detail: '15, 30, 45 or 60 days are illustrative thresholds here—not live owner filters or saved rules.',
    icon: CalendarDays,
    state: 'DEMO',
  },
  {
    number: '03',
    title: 'Review a personal message',
    detail: 'An owner can prepare a rebooking message; automated recall scheduling was not verified.',
    icon: MessageCircle,
    state: 'PARTIAL',
  },
  {
    number: '04',
    title: 'The customer chooses to rebook',
    detail: 'A reminder is an invitation; the customer decides whether to return or rebook.',
    icon: RotateCcw,
    state: 'LIVE',
  },
];

/** Source-checked feature showcase with clearly separated sample recall data. */
export function CustomerRecallSection() {
  return (
    <section
      className="sl-section sl-customer-recall"
      id="customer-recall"
      aria-labelledby="sl-customer-recall-title"
    >
      <div className="sl-container">
        <div className="sl-customer-recall__layout">
          <div className="sl-customer-recall__story">
            <SectionHeading
              eyebrow="CUSTOMER RECALL & REBOOKING"
              id="sl-customer-recall-title"
              align="left"
              title="Make the next visit easier to remember—and easier to book."
              description="Customer-initiated rebooking is available from completed appointment history. Owner-selected inactivity thresholds and an automated recall schedule are not verified in the current workspace, so the dashboard and timing examples here are demonstrations only."
            />

            <div className="sl-customer-recall__status-row">
              <span className="sl-customer-recall__status sl-customer-recall__status--partial">PARTIAL</span>
              <span>Rebooking exists; recall filters and automated follow-up are not live.</span>
            </div>

            <ul className="sl-customer-recall__facts">
              <li>
                <span className="sl-customer-recall__fact-icon sl-customer-recall__fact-icon--live" aria-hidden="true">
                  <Check size={17} />
                </span>
                <span><strong>Customer rebooking</strong><small>Customers can start again from a completed appointment or a saved salon.</small></span>
              </li>
              <li>
                <span className="sl-customer-recall__fact-icon sl-customer-recall__fact-icon--partial" aria-hidden="true">
                  <CircleAlert size={17} />
                </span>
                <span><strong>Owner recall segmentation</strong><small>Last-visit data exists in contact records, but no owner-facing inactivity threshold filter was found.</small></span>
              </li>
              <li>
                <span className="sl-customer-recall__fact-icon sl-customer-recall__fact-icon--demo" aria-hidden="true">
                  <Clock3 size={17} />
                </span>
                <span><strong>Timing and statuses below</strong><small>Sample windows and follow-up states are not saved to customer records.</small></span>
              </li>
            </ul>

            <div className="sl-customer-recall__service-note">
              <Scissors size={18} aria-hidden="true" />
              <p><strong>Salon-led timing.</strong> Example intervals are illustrative, not medical or clinical advice. Choose any follow-up timing based on your own service policy.</p>
            </div>
          </div>

          <div className="sl-customer-recall__dashboard" role="region" aria-label="Illustrative customer recall dashboard">
            <div className="sl-customer-recall__dashboard-head">
              <div>
                <span className="sl-customer-recall__eyebrow">FOLLOW-UP WORKSPACE</span>
                <h3>Customers to review</h3>
              </div>
              <span className="sl-customer-recall__demo-tag"><span aria-hidden="true" /> SAMPLE DATA</span>
            </div>

            <div className="sl-customer-recall__filter-label">
              <span><CalendarDays size={15} aria-hidden="true" /> Example inactivity windows</span>
              <span>Illustrative only · not interactive</span>
            </div>
            <div className="sl-customer-recall__filters" role="group" aria-label="Illustrative recall windows; these are not active filters">
              {['15 days', '30 days', '45 days', '60 days', 'Custom'].map((window) => (
                <span className={window === '30 days' ? 'is-selected' : ''} key={window}>{window}</span>
              ))}
            </div>

            <div className="sl-customer-recall__columns" aria-hidden="true">
              <span>Customer &amp; mobile</span>
              <span>Last visit &amp; service</span>
              <span>Example window</span>
              <span>Sample follow-up</span>
            </div>
            <ul className="sl-customer-recall__records" aria-label="Sample customer records; not real salon data">
              {RECALL_EXAMPLES.map((record) => (
                <li key={record.id}>
                  <article className="sl-customer-recall__record">
                    <div className="sl-customer-recall__person">
                      <span className="sl-customer-recall__avatar" aria-hidden="true">{record.initials}</span>
                      <span><strong>{record.name}</strong><small>{record.phone}</small></span>
                    </div>
                    <div className="sl-customer-recall__record-field">
                      <span>Last visit · {record.lastVisit}</span>
                      <strong>{record.service}</strong>
                    </div>
                    <div className="sl-customer-recall__record-field">
                      <span>{record.exampleWindow}</span>
                      <strong className="sl-customer-recall__example-state">{record.status}</strong>
                    </div>
                    <div className="sl-customer-recall__record-action">
                      <span>{record.nextAction}</span>
                      <span className="sl-customer-recall__action-label">Illustrative state</span>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
            <p className="sl-customer-recall__disclosure">Every name, number, visit interval and status above is fictional. This mockup is not connected to a salon account.</p>
          </div>
        </div>

        <div className="sl-customer-recall__journey">
          <div className="sl-customer-recall__journey-heading">
            <div>
              <span className="sl-customer-recall__eyebrow">A CLEAR FOLLOW-UP JOURNEY</span>
              <h3>From the last visit to a customer-led rebooking</h3>
            </div>
            <span className="sl-customer-recall__journey-note">Only the rebooking path is live end to end today.</span>
          </div>
          <ol>
            {RECALL_STEPS.map(({ number, title, detail, icon: Icon, state }) => (
              <li className="sl-customer-recall__step" key={number}>
                <span className="sl-customer-recall__step-icon" aria-hidden="true"><Icon size={18} /></span>
                <span className="sl-customer-recall__step-number">{number} · {state}</span>
                <h4>{title}</h4>
                <p>{detail}</p>
              </li>
            ))}
          </ol>
          <div className="sl-customer-recall__journey-connector" aria-hidden="true"><ArrowRight size={18} /></div>
        </div>
      </div>
    </section>
  );
}
