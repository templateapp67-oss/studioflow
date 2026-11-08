import { ArrowRight, Award, Check, Coins, Gift, Percent, ShieldCheck, Ticket, Users } from 'lucide-react';
import { SectionHeading } from '../ui';
import './customerLoyaltySection.css';

const LOYALTY_CAPABILITIES = [
  {
    id: 'points-tiers',
    title: 'Points & tier progress',
    status: 'PARTIAL',
    detail: 'Owner settings include points per visit, spend-based earning and tier thresholds. Customer balances are calculated from eligible activity in supported program flows.',
    icon: Coins,
  },
  {
    id: 'reward-redemption',
    title: 'Reward redemption',
    status: 'PARTIAL',
    detail: 'The customer app can claim an active published reward; the checked-in backend validates the claim and issues a voucher for supported setups.',
    icon: Ticket,
  },
  {
    id: 'referrals',
    title: 'Referral points',
    status: 'PARTIAL',
    detail: 'The checked-in backend referral path awards points after a qualifying first completed paid visit when the program is enabled and both accounts have confirmed email; it is not a cash reward.',
    icon: Users,
  },
  {
    id: 'custom-vip',
    title: 'Custom VIP automation',
    status: 'DEMO',
    detail: 'Custom tier names, VIP perks and automated VIP journeys are not verified as universal features.',
    icon: Award,
  },
];

const REDEMPTION_STEPS = [
  { number: '01', title: 'Eligible activity', detail: 'Completed visits or qualifying referral activity, according to the salon’s published program.' },
  { number: '02', title: 'Points & tier are calculated', detail: 'The customer view uses the supported salon wallet—not a sample balance in this showcase.' },
  { number: '03', title: 'Claim an active reward', detail: 'Published reward terms and available points are checked before a voucher is issued.' },
  { number: '04', title: 'Use at the salon', detail: 'The issuing salon can review the voucher and mark its use through the supported flow.' },
];

/** Status-led loyalty showcase. It intentionally never renders balances or transactions. */
export function CustomerLoyaltySection() {
  return (
    <section
      className="sl-section sl-customer-loyalty"
      id="customer-loyalty"
      aria-labelledby="sl-customer-loyalty-title"
    >
      <div className="sl-container">
        <div className="sl-customer-loyalty__intro">
          <SectionHeading
            eyebrow="CUSTOMER LOYALTY & REWARDS"
            id="sl-customer-loyalty-title"
            align="left"
            title="Build a rewards journey around each salon’s real rules."
            description="Owner loyalty settings, completed-appointment point updates and customer rewards screens exist. Server-backed wallets, voucher claims and referrals are implemented for supported programs, but availability depends on workspace configuration and backend setup; no sample points or transactions are shown here."
          />
          <span className="sl-customer-loyalty__status"><span aria-hidden="true" /> PARTIAL · PROGRAM SETUP VARIES</span>
        </div>

        <div className="sl-customer-loyalty__top-grid">
          <article className="sl-customer-loyalty__wallet" aria-label="Illustrative customer rewards wallet with no balance data">
            <div className="sl-customer-loyalty__card-head">
              <div>
                <span className="sl-customer-loyalty__eyebrow">CUSTOMER REWARDS VIEW</span>
                <h3>A wallet that reflects a real program</h3>
              </div>
              <span className="sl-customer-loyalty__no-data">NO SAMPLE BALANCE</span>
            </div>
            <div className="sl-customer-loyalty__wallet-main">
              <span className="sl-customer-loyalty__coin-icon" aria-hidden="true"><Coins size={23} /></span>
              <span className="sl-customer-loyalty__wallet-label">Available points</span>
              <strong aria-label="No sample points displayed">—</strong>
              <small>Loaded from a signed-in customer wallet in a supported salon program.</small>
            </div>
            <div className="sl-customer-loyalty__wallet-details">
              <div><span>Current tier</span><strong>From saved program</strong></div>
              <div><span>Active rewards</span><strong>Published terms only</strong></div>
              <div><span>Points history</span><strong>Server-returned activity</strong></div>
            </div>
            <p className="sl-customer-loyalty__wallet-note"><ShieldCheck size={16} aria-hidden="true" /> No customer, points total, tier, voucher code or transaction is fabricated in this landing-page preview.</p>
          </article>

          <article className="sl-customer-loyalty__setup" aria-label="Illustrative owner loyalty configuration">
            <div className="sl-customer-loyalty__card-head">
              <div>
                <span className="sl-customer-loyalty__eyebrow">OWNER PROGRAM SETTINGS</span>
                <h3>Choose how rewards are earned</h3>
              </div>
              <span className="sl-customer-loyalty__demo-label">FIELD PREVIEW · NO VALUES SAVED</span>
            </div>
            <div className="sl-customer-loyalty__settings">
              <div className="sl-customer-loyalty__setting-row"><span className="sl-customer-loyalty__setting-icon" aria-hidden="true"><Check size={16} /></span><span><strong>Points per eligible visit</strong><small>Set in workspace loyalty settings</small></span><span className="sl-customer-loyalty__setting-status">CONFIGURABLE</span></div>
              <div className="sl-customer-loyalty__setting-row"><span className="sl-customer-loyalty__setting-icon" aria-hidden="true"><Percent size={16} /></span><span><strong>Points per ₹100 spent</strong><small>Spend-based earning is supported</small></span><span className="sl-customer-loyalty__setting-status">CONFIGURABLE</span></div>
              <div className="sl-customer-loyalty__setting-row"><span className="sl-customer-loyalty__setting-icon" aria-hidden="true"><Award size={16} /></span><span><strong>Tier thresholds &amp; multipliers</strong><small>Account settings determine the values</small></span><span className="sl-customer-loyalty__setting-status">PER SALON</span></div>
              <div className="sl-customer-loyalty__setting-row"><span className="sl-customer-loyalty__setting-icon" aria-hidden="true"><Gift size={16} /></span><span><strong>Reward types</strong><small>Percentage discount, flat discount or free service</small></span><span className="sl-customer-loyalty__setting-status">CONFIGURABLE</span></div>
            </div>
            <p className="sl-customer-loyalty__setup-note">The fields mirror supported settings. This showcase does not create a program or change saved account values.</p>
          </article>
        </div>

        <div className="sl-customer-loyalty__tiers">
          <div className="sl-customer-loyalty__tiers-heading">
            <div><span className="sl-customer-loyalty__eyebrow">SUPPORTED TIER MODEL</span><h3>Bronze · Silver · Gold · Platinum</h3></div>
            <span>Thresholds and multipliers come from the salon’s saved configuration.</span>
          </div>
          <ol aria-label="Tier names supported by the current loyalty model; not a live customer status">
            {[
              { id: 'bronze', name: 'Bronze', color: 'bronze' },
              { id: 'silver', name: 'Silver', color: 'silver' },
              { id: 'gold', name: 'Gold', color: 'gold' },
              { id: 'platinum', name: 'Platinum', color: 'platinum' },
            ].map((tier) => (
              <li className={`sl-customer-loyalty__tier sl-customer-loyalty__tier--${tier.color}`} key={tier.id}>
                <span className="sl-customer-loyalty__tier-mark" aria-hidden="true"><Award size={19} /></span>
                <span>{tier.name}</span>
                <small>Configured per salon</small>
              </li>
            ))}
          </ol>
          <p className="sl-customer-loyalty__tier-note">These are supported model labels, not an assertion that any tier or perk is active for every customer. Additional VIP labels and automatic perks are demo/planned.</p>
        </div>

        <div className="sl-customer-loyalty__capabilities" aria-label="Loyalty capability status">
          {LOYALTY_CAPABILITIES.map(({ id, title, status, detail, icon: Icon }) => (
            <article className="sl-customer-loyalty__capability" key={id}>
              <div className="sl-customer-loyalty__capability-head"><span className="sl-customer-loyalty__capability-icon" aria-hidden="true"><Icon size={18} /></span><span className={`sl-customer-loyalty__capability-status sl-customer-loyalty__capability-status--${status.toLowerCase()}`}>{status}</span></div>
              <h3>{title}</h3>
              <p>{detail}</p>
            </article>
          ))}
        </div>

        <div className="sl-customer-loyalty__redemption">
          <div className="sl-customer-loyalty__redemption-heading"><span className="sl-customer-loyalty__eyebrow">REWARD REDEMPTION · SUPPORTED FLOW</span><h3>From eligible points to a salon-issued voucher</h3></div>
          <ol>
            {REDEMPTION_STEPS.map(({ number, title, detail }) => (
              <li key={number}><span className="sl-customer-loyalty__redemption-number">{number}</span><h4>{title}</h4><p>{detail}</p></li>
            ))}
          </ol>
          <span className="sl-customer-loyalty__redemption-arrow" aria-hidden="true"><ArrowRight size={18} /></span>
          <p className="sl-customer-loyalty__referral-note"><Users size={16} aria-hidden="true" /> The checked-in backend rules include a points award after a qualifying first paid visit, with active-program and confirmed-email checks; conditions apply and no cash reward is promised.</p>
        </div>
      </div>
    </section>
  );
}
