import { useState } from 'react';
import { ArrowRight, Check, CircleHelp, ShieldCheck } from 'lucide-react';
import { SectionHeading } from '../ui';
import { useDemoDialog } from '../../nexora-pricing/DemoProvider';
import {
  pricingAuthPath,
  type BillingInterval,
  type EntitlementState,
  type FeatureItem,
  type PricingPlan,
  type PricingPlanId,
} from '../../../lib/nexoraPricing';
import { useLandingModel } from '../LandingContentProvider';

const formatINR = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);

/** Every confirmed inclusion for a plan, in catalogue order. */
function confirmedFeatures(
  planId: PricingPlan['id'],
  catalogue: FeatureItem[],
  entitlements: Record<string, Record<PricingPlanId, EntitlementState>>,
) {
  return catalogue.filter((feature) => entitlements[feature.id]?.[planId] === 'included');
}

/**
 * Billing selector. A monthly option is only enabled when a configured
 * monthly price exists, so the control can never show a rate the business
 * has not approved.
 */
export function BillingToggle({ interval, onChange }: { interval: BillingInterval; onChange: (value: BillingInterval) => void }) {
  const { plans } = useLandingModel();
  const monthlyAvailable = plans.some((plan) => plan.monthlyPrice !== null);
  return (
    <div className="sl-billing">
      <div className="sl-billing__text">
        <h3>Billing period</h3>
        <p>Annual plans are billed once for the full year. Monthly billing rates are not configured yet.</p>
      </div>
      <div className="sl-billing__control" role="group" aria-label="Billing period">
        <button
          type="button"
          aria-pressed={interval === 'monthly'}
          disabled={!monthlyAvailable}
          aria-describedby={!monthlyAvailable ? 'sl-billing-note' : undefined}
          onClick={() => onChange('monthly')}
        >
          Monthly
          {!monthlyAvailable ? <span className="sl-billing__pending">Not configured</span> : null}
        </button>
        <button type="button" aria-pressed={interval === 'annual'} onClick={() => onChange('annual')}>
          Annually
        </button>
      </div>
    </div>
  );
}

export function PlanCard({
  plan,
  interval,
  onSelect,
}: {
  plan: PricingPlan;
  interval: BillingInterval;
  onSelect?: (plan: PricingPlan) => void;
}) {
  const { openDemo } = useDemoDialog();
  const { catalogue, entitlements } = useLandingModel();
  const inclusions = confirmedFeatures(plan.id, catalogue, entitlements);
  const isContactPlan = plan.id === 'premium';
  const signupPath = pricingAuthPath({ planId: plan.id, billingInterval: interval });

  return (
    <article className={`sl-plan${plan.popular ? ' is-recommended' : ''}`}>
      {plan.popular ? <p className="sl-plan__flag">Recommended</p> : null}
      <h3 className="sl-plan__name">{plan.name}</h3>
      <p className="sl-plan__tagline">{plan.description}</p>
      <p className="sl-plan__positioning">{plan.positioning}</p>

      <div className="sl-plan__price">
        {interval === 'annual' ? (
          <>
            <p className="sl-plan__amount">
              <span>₹</span>
              {formatINR(plan.annualMonthlyEquivalent)}
              <small>/mo</small>
            </p>
            <p className="sl-plan__cycle">Monthly equivalent · billed annually</p>
            <p className="sl-plan__total">
              ₹{formatINR(plan.annualTotal)} <span>per year, GST inclusive</span>
            </p>
          </>
        ) : plan.monthlyPrice !== null ? (
          <>
            <p className="sl-plan__amount">
              <span>₹</span>
              {formatINR(plan.monthlyPrice)}
              <small>/mo</small>
            </p>
            <p className="sl-plan__cycle">Billed monthly</p>
          </>
        ) : (
          <>
            <p className="sl-plan__amount sl-plan__amount--pending">Not configured</p>
            <p className="sl-plan__cycle">Monthly billing rates have not been set.</p>
          </>
        )}
      </div>

      <div className="sl-plan__includes">
        <p className="sl-plan__includes-title">Confirmed plan highlights</p>
        {inclusions.length ? (
          <ul>
            {inclusions.map((feature) => (
              <li key={feature.id}>
                <Check size={15} aria-hidden="true" />
                {feature.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="sl-plan__pending">
            <CircleHelp size={15} aria-hidden="true" />
            Tier inclusions for this plan are still being confirmed.
          </p>
        )}
      </div>

      {onSelect ? (
        <button type="button" className="sl-btn sl-btn--primary sl-plan__cta" onClick={() => onSelect(plan)}>
          {plan.cta} <ArrowRight size={16} aria-hidden="true" />
        </button>
      ) : isContactPlan ? (
        <button type="button" className="sl-btn sl-btn--primary sl-plan__cta" onClick={() => openDemo()}>
          {plan.cta} <ArrowRight size={16} aria-hidden="true" />
        </button>
      ) : (
        <a className="sl-btn sl-btn--primary sl-plan__cta" href={signupPath}>
          {plan.cta} <ArrowRight size={16} aria-hidden="true" />
        </a>
      )}
      <a className="sl-plan__details" href="#comparison">
        Compare every feature
      </a>
    </article>
  );
}

export function PricingSection({
  id = 'pricing',
  onSelect,
  aliasId,
}: {
  id?: string;
  /** Route-owned plan selection (sign-up hand-off / plan summary). */
  onSelect?: (plan: PricingPlan) => void;
  /** Extra anchor kept for links that already point at `#plans`. */
  aliasId?: string;
}) {
  const { copy, plans } = useLandingModel();
  const [interval, setInterval] = useState<BillingInterval>('annual');

  return (
    <section className="sl-section" id={id} aria-labelledby="sl-pricing-title">
      {aliasId ? <span id={aliasId} className="sl-anchor-target" aria-hidden="true" /> : null}
      <div className="sl-container">
        <SectionHeading
          eyebrow="PRICING"
          id="sl-pricing-title"
          title={copy.pricingTitle}
          description={copy.pricingDescription}
        />
        <BillingToggle interval={interval} onChange={setInterval} />
        <div className="sl-plan-grid">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} interval={interval} onSelect={onSelect} />
          ))}
        </div>
        <p className="sl-plan-note" id="sl-billing-note">
          <ShieldCheck size={15} aria-hidden="true" />
          Approved annual prices are GST-inclusive. Monthly rates, subscription checkout and any add-on charges are
          not configured yet — confirm the full amount with Nexora before you purchase.
        </p>
      </div>
    </section>
  );
}
