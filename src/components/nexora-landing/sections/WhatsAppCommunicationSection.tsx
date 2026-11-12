import { ArrowRight, Check, CircleAlert, MessageCircle, MousePointerClick, ShieldCheck, Smartphone } from 'lucide-react';
import { SectionHeading } from '../ui';
import './whatsappCommunicationSection.css';

const COMMUNICATION_MODES = [
  {
    id: 'click-to-chat',
    title: 'Click-to-Chat drafts',
    status: 'LIVE',
    detail: 'A reviewed, prefilled wa.me link opens WhatsApp. A person still chooses whether to send it.',
    icon: MousePointerClick,
  },
  {
    id: 'manual-preparation',
    title: 'Manual campaign preparation',
    status: 'LIVE',
    detail: 'Owners can select an eligible audience, choose a message template, edit the copy and review saved campaigns.',
    icon: MessageCircle,
  },
  {
    id: 'consent',
    title: 'Consent & opt-out controls',
    status: 'LIVE',
    detail: 'The owner contact flow filters for marketing opt-in and Do Not Contact status, and includes STOP / opt-out instructions.',
    icon: ShieldCheck,
  },
  {
    id: 'business-provider',
    title: 'Business Platform bulk send',
    status: 'CONDITIONAL',
    detail: 'The sender implementation is checked in under supabase/functions; deployment, allowed origins and live provider credentials remain unverified.',
    icon: MessageCircle,
  },
  {
    id: 'automation',
    title: 'Scheduled automation & receipts',
    status: 'NOT VERIFIED',
    detail: 'No scheduled send trigger or read-receipt behavior was verified. A manual review is still required.',
    icon: CircleAlert,
  },
];

const CURRENT_TOKENS = ['{name}', '{salon}', '{booking_link}'];
const ILLUSTRATIVE_TOKENS = ['{service}', '{appointment_date}', '{offer}'];

/** Distinguishes verified manual messaging from provider-dependent automation. */
export function WhatsAppCommunicationSection() {
  return (
    <section
      className="sl-section sl-whatsapp-communication"
      id="whatsapp-communication"
      aria-labelledby="sl-whatsapp-communication-title"
    >
      <div className="sl-container">
        <div className="sl-whatsapp-communication__intro">
          <SectionHeading
            eyebrow="WHATSAPP CUSTOMER COMMUNICATION"
            id="sl-whatsapp-communication-title"
            align="left"
            title="Prepare the right message. Keep consent and human review in control."
            description="The owner workspace supports customer consent controls, campaign preparation and individual WhatsApp drafts. Business Platform bulk sending is provider-dependent: sender source exists under supabase/functions, but deployment, allowed origins and live credentials cannot be verified from this checkout."
          />
          <span className="sl-whatsapp-communication__status"><span aria-hidden="true" /> PARTIAL · PROVIDER SETUP UNVERIFIED</span>
        </div>

        <div className="sl-whatsapp-communication__modes" aria-label="WhatsApp capability status">
          {COMMUNICATION_MODES.map(({ id, title, status, detail, icon: Icon }) => (
            <article className="sl-whatsapp-communication__mode" key={id}>
              <div className="sl-whatsapp-communication__mode-head"><span className="sl-whatsapp-communication__mode-icon" aria-hidden="true"><Icon size={18} /></span><span className={`sl-whatsapp-communication__mode-status sl-whatsapp-communication__mode-status--${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span></div>
              <h3>{title}</h3>
              <p>{detail}</p>
            </article>
          ))}
        </div>

        <div className="sl-whatsapp-communication__workspace">
          <article className="sl-whatsapp-communication__campaign" aria-label="Illustrative WhatsApp campaign workspace">
            <div className="sl-whatsapp-communication__card-head">
              <div><span className="sl-whatsapp-communication__eyebrow">OWNER CAMPAIGN WORKSPACE</span><h3>Review a rebooking message</h3></div>
              <span className="sl-whatsapp-communication__sample-tag"><span aria-hidden="true" /> UI PREVIEW</span>
            </div>
            <div className="sl-whatsapp-communication__campaign-meta">
              <div><span>Campaign type</span><strong>Rebook reminder</strong></div>
              <div><span>Audience</span><strong>Opted-in, eligible contacts</strong></div>
              <div><span>Send mode</span><strong>Review a private draft</strong></div>
            </div>
            <div className="sl-whatsapp-communication__template-row" role="group" aria-label="Current template categories">
              {['Salon offer', 'Festival', 'Birthday', 'Rebook reminder'].map((template) => <span key={template}>{template}</span>)}
            </div>
            <div className="sl-whatsapp-communication__tokens">
              <div><strong>Current message tokens</strong><span>Present in the owner composer</span></div>
              <ul aria-label="Current supported message tokens">{CURRENT_TOKENS.map((token) => <li key={token}><code>{token}</code></li>)}</ul>
              <div className="sl-whatsapp-communication__planned-tokens"><strong>More merge fields</strong><span>Illustrative only · not verified in the current composer</span></div>
              <ul aria-label="Illustrative message tokens not verified in the current composer">{ILLUSTRATIVE_TOKENS.map((token) => <li key={token}><code>{token}</code></li>)}</ul>
            </div>
            <div className="sl-whatsapp-communication__consent">
              <span className="sl-whatsapp-communication__consent-icon" aria-hidden="true"><Check size={17} /></span>
              <span><strong>Consent stays in the flow</strong><small>Marketing opt-in, valid number and Do Not Contact checks are applied before campaign preparation. Private drafts include opt-out / STOP instructions.</small></span>
            </div>
            <div className="sl-whatsapp-communication__outcomes" role="group" aria-label="Delivery outcome categories in the current campaign interface; no counts shown">
              <div className="sl-whatsapp-communication__outcomes-heading"><strong>Campaign outcome labels</strong><span>Current UI categories · no sample counts</span></div>
              <div className="sl-whatsapp-communication__outcome-list">
                <span><i className="is-accepted" aria-hidden="true" />Accepted <small>not delivery</small></span>
                <span><i className="is-failed" aria-hidden="true" />Failed</span>
                <span><i className="is-unknown" aria-hidden="true" />Unknown <small>not auto-retried</small></span>
                <span><i className="is-skipped" aria-hidden="true" />Skipped</span>
              </div>
            </div>
          </article>

          <article className="sl-whatsapp-communication__phone-preview" aria-label="Illustrative WhatsApp click-to-chat preview">
            <div className="sl-whatsapp-communication__phone-label"><Smartphone size={16} aria-hidden="true" /><span>CLICK-TO-CHAT PREVIEW</span><span className="sl-whatsapp-communication__phone-demo">DEMO</span></div>
            <div className="sl-whatsapp-communication__phone">
              <div className="sl-whatsapp-communication__phone-top"><span className="sl-whatsapp-communication__phone-camera" aria-hidden="true" /><strong>Salon conversation</strong><small>Private draft</small></div>
              <div className="sl-whatsapp-communication__phone-chat">
                <div className="sl-whatsapp-communication__bubble"><span>Hi <code>{'{name}'}</code>! Ready for your next salon visit? Explore services and reserve a convenient time at <code>{'{salon}'}</code>: <code>{'{booking_link}'}</code></span><small>Preview only</small></div>
              </div>
              <div className="sl-whatsapp-communication__phone-input"><span>Message not sent</span><span className="sl-whatsapp-communication__send-icon" aria-hidden="true"><ArrowRight size={15} /></span></div>
            </div>
            <p className="sl-whatsapp-communication__phone-note">Click-to-Chat opens WhatsApp with text prepared. The owner reviews it there; this landing-page preview sends nothing.</p>
          </article>
        </div>

        <div className="sl-whatsapp-communication__api-note">
          <div className="sl-whatsapp-communication__api-icon" aria-hidden="true"><MessageCircle size={19} /></div>
          <div className="sl-whatsapp-communication__api-copy"><span className="sl-whatsapp-communication__eyebrow">BUSINESS PLATFORM / API · CONFIGURATION-DEPENDENT</span><h3>Provider readiness must be verified before bulk sending.</h3><p>Sender source exists under supabase/functions, but deployment, allowed origins, credentials and approved templates are not verified in this checkout. The app labels “accepted” as not confirmed delivery, keeps unknown outcomes distinct, and does not automatically retry them. Read receipts are not claimed.</p></div>
          <span className="sl-whatsapp-communication__api-status">NOT VERIFIED</span>
        </div>

        <div className="sl-whatsapp-communication__journey">
          <span className="sl-whatsapp-communication__eyebrow">A CONSENT-AWARE MESSAGE JOURNEY</span>
          <ol>
            {[
              { number: '01', title: 'Check permission', detail: 'Opt-in and Do Not Contact status.' },
              { number: '02', title: 'Prepare & review', detail: 'Use the current supported message tokens.' },
              { number: '03', title: 'Choose a send path', detail: 'Individual WhatsApp draft is available; bulk send is conditional.' },
              { number: '04', title: 'Read the outcome carefully', detail: 'Accepted does not mean delivered or read.' },
            ].map((step) => (
              <li key={step.number}><span>{step.number}</span><h4>{step.title}</h4><p>{step.detail}</p></li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
