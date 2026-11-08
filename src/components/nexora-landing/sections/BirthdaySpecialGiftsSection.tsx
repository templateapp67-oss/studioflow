import { ArrowRight, Cake, CalendarDays, Check, Gift, MessageCircle, ShieldCheck } from 'lucide-react';
import { SectionHeading } from '../ui';
import './birthdaySpecialGiftsSection.css';

const BIRTHDAY_EXAMPLES = [
  { id: 'birthday-priya', initials: 'PS', name: 'Priya Sharma', date: '12 Nov', consent: 'Birthday sharing on', draft: 'Template available' },
  { id: 'birthday-isha', initials: 'IM', name: 'Isha Mehta', date: '18 Nov', consent: 'Birthday sharing on', draft: 'Review before sending' },
  { id: 'birthday-rahul', initials: 'RK', name: 'Rahul Kapoor', date: '30 Nov', consent: 'Not shared', draft: 'No birthday data' },
];

const BIRTHDAY_STEPS = [
  { number: '01', title: 'Customer shares their date', detail: 'A customer profile can store a date of birth and a separate per-salon birthday-sharing choice.', icon: Cake, status: 'LIVE' },
  { number: '02', title: 'Owner reviews this month', detail: 'The owner contact list has a “Birthdays this month” filter for eligible contacts.', icon: CalendarDays, status: 'LIVE' },
  { number: '03', title: 'Prepare a personal greeting', detail: 'A birthday message template can be reviewed as a WhatsApp draft; sending is not scheduled.', icon: MessageCircle, status: 'PARTIAL' },
  { number: '04', title: 'Choose any special gift', detail: 'Birthday-specific offer rules, automatic fulfilment and timed delivery are not implemented.', icon: Gift, status: 'PLANNED' },
];

/** Shows the verified birthday-list and draft scope without implying automation. */
export function BirthdaySpecialGiftsSection() {
  return (
    <section
      className="sl-section sl-birthday-gifts"
      id="birthday-special-gifts"
      aria-labelledby="sl-birthday-gifts-title"
    >
      <div className="sl-container">
        <div className="sl-birthday-gifts__intro">
          <SectionHeading
            eyebrow="BIRTHDAY WISHES & SPECIAL GIFTS"
            id="sl-birthday-gifts-title"
            align="left"
            title="Celebrate birthdays with thoughtful, consent-aware outreach."
            description="Customer DOB and per-salon birthday-sharing preferences are supported, and owners can filter eligible contacts for birthdays this month and prepare a greeting. Scheduled birthday sends and birthday-gift fulfilment are not verified features."
          />
          <span className="sl-birthday-gifts__status"><span aria-hidden="true" /> PARTIAL · MANUAL REVIEW
          </span>
        </div>

        <div className="sl-birthday-gifts__capabilities" aria-label="Birthday capability status">
          <article className="sl-birthday-gifts__capability">
            <span className="sl-birthday-gifts__capability-icon sl-birthday-gifts__capability-icon--live" aria-hidden="true"><Check size={17} /></span>
            <div><span className="sl-birthday-gifts__capability-status">LIVE IN CURRENT FLOW</span><h3>DOB &amp; sharing choice</h3><p>Customers control birthday sharing separately for each salon.</p></div>
          </article>
          <article className="sl-birthday-gifts__capability">
            <span className="sl-birthday-gifts__capability-icon sl-birthday-gifts__capability-icon--live" aria-hidden="true"><CalendarDays size={17} /></span>
            <div><span className="sl-birthday-gifts__capability-status">LIVE IN CURRENT FLOW</span><h3>Month filter &amp; draft</h3><p>Owners can review this month’s eligible birthdays and a greeting template.</p></div>
          </article>
          <article className="sl-birthday-gifts__capability">
            <span className="sl-birthday-gifts__capability-icon sl-birthday-gifts__capability-icon--planned" aria-hidden="true"><Gift size={17} /></span>
            <div><span className="sl-birthday-gifts__capability-status">NOT VERIFIED</span><h3>Scheduled gift delivery</h3><p>No automatic birthday trigger, gift issue or scheduled message was found.</p></div>
          </article>
        </div>

        <div className="sl-birthday-gifts__workspace">
          <article className="sl-birthday-gifts__birthday-card" aria-label="Illustrative birthday contacts dashboard">
            <div className="sl-birthday-gifts__card-head">
              <div>
                <span className="sl-birthday-gifts__eyebrow">CUSTOMER CONTACTS</span>
                <h3>Birthday list</h3>
              </div>
              <span className="sl-birthday-gifts__sample-tag"><span aria-hidden="true" /> SAMPLE DATA</span>
            </div>
            <div className="sl-birthday-gifts__filters" role="group" aria-label="Birthday date filters; only the month view is currently verified">
              <span className="is-live"><Check size={14} aria-hidden="true" /> Birthdays this month <small>available</small></span>
              <span className="is-demo">Today <small>demo</small></span>
              <span className="is-demo">This week <small>demo</small></span>
              <span className="is-demo">Upcoming <small>demo</small></span>
            </div>
            <p className="sl-birthday-gifts__filter-note">Only the month filter is verified in the owner contacts flow. The other ranges are illustrative, non-interactive chips.</p>
            <ul className="sl-birthday-gifts__records" aria-label="Fictional birthday contact examples">
              {BIRTHDAY_EXAMPLES.map((customer) => (
                <li key={customer.id}>
                  <span className="sl-birthday-gifts__avatar" aria-hidden="true">{customer.initials}</span>
                  <span className="sl-birthday-gifts__customer"><strong>{customer.name}</strong><small>{customer.consent}</small></span>
                  <span className="sl-birthday-gifts__date">{customer.date}</span>
                  <span className="sl-birthday-gifts__draft-state">{customer.draft}</span>
                </li>
              ))}
            </ul>
            <p className="sl-birthday-gifts__disclosure">Names and dates are fictional sample content, not customer records.</p>
          </article>

          <article className="sl-birthday-gifts__gift-card" aria-label="Demonstration birthday gift setup">
            <div className="sl-birthday-gifts__card-head">
              <div>
                <span className="sl-birthday-gifts__eyebrow">GIFT &amp; OFFER SETUP</span>
                <h3>Make a birthday moment special</h3>
              </div>
              <span className="sl-birthday-gifts__demo-label">DEMO · DOES NOT SAVE</span>
            </div>
            <p className="sl-birthday-gifts__gift-intro">A future birthday rule could let a salon choose a benefit. No birthday gift is currently configured or issued by this illustration.</p>
            <dl className="sl-birthday-gifts__gift-fields">
              <div><dt>Example benefit</dt><dd>Complimentary add-on <span>sample idea only</span></dd></div>
              <div><dt>Eligibility</dt><dd>Shared birthday + marketing permission <span>consent must be respected</span></dd></div>
              <div><dt>Offer terms</dt><dd>Not configured <span>no value or expiry is implied</span></dd></div>
              <div><dt>Fulfilment</dt><dd>Manual review only <span>no automatic gift or voucher</span></dd></div>
            </dl>
            <div className="sl-birthday-gifts__schedule">
              <span className="sl-birthday-gifts__schedule-icon" aria-hidden="true"><CalendarDays size={17} /></span>
              <span><strong>Message scheduling</strong><small>Birthday-triggered scheduling is not available in the verified flow.</small></span>
              <span className="sl-birthday-gifts__planned-pill">PLANNED</span>
            </div>
          </article>
        </div>

        <div className="sl-birthday-gifts__message-row">
          <article className="sl-birthday-gifts__message-card">
            <div className="sl-birthday-gifts__message-heading">
              <span className="sl-birthday-gifts__message-icon" aria-hidden="true"><MessageCircle size={19} /></span>
              <div><span className="sl-birthday-gifts__eyebrow">CURRENT TEMPLATE · DRAFT ONLY</span><h3>A birthday wish that stays personal</h3></div>
            </div>
            <blockquote>Happy birthday, <code>{'{name}'}</code>! Wishing you a wonderful year from <code>{'{salon}'}</code>. Ask us about birthday treats and book your next visit: <code>{'{booking_link}'}</code></blockquote>
            <p className="sl-birthday-gifts__message-note">These are the current message tokens. Review the text and recipient permission before continuing in WhatsApp; this preview does not send a message.</p>
          </article>
          <div className="sl-birthday-gifts__consent-note">
            <ShieldCheck size={20} aria-hidden="true" />
            <p><strong>Respect the customer’s choice.</strong> Birthday details are shown to a salon only when shared. Marketing opt-in and Do Not Contact status still matter for outreach.</p>
          </div>
        </div>

        <div className="sl-birthday-gifts__journey">
          <div className="sl-birthday-gifts__journey-heading"><span className="sl-birthday-gifts__eyebrow">BIRTHDAY JOURNEY</span><h3>From shared date to a reviewed greeting</h3></div>
          <ol>
            {BIRTHDAY_STEPS.map(({ number, title, detail, icon: Icon, status }) => (
              <li key={number}>
                <span className="sl-birthday-gifts__step-icon" aria-hidden="true"><Icon size={17} /></span>
                <span className={`sl-birthday-gifts__step-status sl-birthday-gifts__step-status--${status.toLowerCase()}`}>{status}</span>
                <h4>{title}</h4>
                <p>{detail}</p>
              </li>
            ))}
          </ol>
          <span className="sl-birthday-gifts__journey-arrow" aria-hidden="true"><ArrowRight size={18} /></span>
        </div>
      </div>
    </section>
  );
}
