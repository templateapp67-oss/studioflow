import { Scissors, Sparkles, Store, Crown } from 'lucide-react';
import { NEXORA_PRICING_INTRO } from '../../../lib/nexoraLandingContent';
import type { BillingInterval, PricingPlan } from '../../../lib/nexoraPricing';
import { useLandingModel } from '../LandingContentProvider';

const icons = { lite: Scissors, grow: Sparkles, standard: Store, premium: Crown };
const money = (value: number) => new Intl.NumberFormat('en-IN').format(value);

/** The compact pricing cards are specific to /pricing, not the salon landing page. */
export function PricingPlansSection({ interval, onIntervalChange, onSelect }: {
  interval: BillingInterval;
  onIntervalChange: (interval: BillingInterval) => void;
  onSelect: (plan: PricingPlan) => void;
}) {
  const { plans } = useLandingModel();
  return (
    <section className="sl-section sl-compact-pricing" id="pricing" aria-label="Pricing plans">
      <span id="plans" className="sl-anchor-target" aria-hidden="true" />
      <div className="sl-container">
        <p className="sl-compact-pricing__intro">{NEXORA_PRICING_INTRO}</p>
        <div className="sl-compact-pricing__toggle" role="group" aria-label="Choose billing frequency">
          <button type="button" aria-pressed={interval === 'monthly'} onClick={() => onIntervalChange('monthly')}>Monthly</button>
          <button type="button" aria-pressed={interval === 'annual'} onClick={() => onIntervalChange('annual')}>Yearly</button>
        </div>
        <div className="sl-compact-pricing__grid">
          {plans.map((plan) => {
            const Icon = icons[plan.id];
            const price = interval === 'annual' ? plan.annualMonthlyEquivalent : plan.monthlyPrice;
            return (
              <article className={`sl-compact-card${plan.popular ? ' is-recommended' : ''}`} key={plan.id}>
                {plan.popular && <span className="sl-compact-card__ribbon">Recommended</span>}
                <Icon className="sl-compact-card__icon" size={24} aria-hidden="true" />
                <h2>{plan.name}</h2>
                <p className="sl-compact-card__description">{plan.description}</p>
                <div className="sl-compact-card__pricing">
                  <p className="sl-compact-card__price">{price === null ? 'Not configured' : <>₹{money(price)} <small>/mo</small></>}</p>
                  <p className="sl-compact-card__cycle">{interval === 'annual' ? 'Monthly equivalent · billed annually' : 'Billed monthly'}</p>
                  {interval === 'annual' && <p className="sl-compact-card__total">₹{money(plan.annualTotal)} per year · GST inclusive</p>}
                </div>
                <button type="button" className="sl-btn sl-btn--primary sl-compact-card__cta" onClick={() => onSelect(plan)}>Get Started</button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
