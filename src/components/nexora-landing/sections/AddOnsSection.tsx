import { CircleCheck, CircleX, ShieldCheck } from 'lucide-react';
import { SectionHeading } from '../ui';
import { PRICING_ADD_ONS, PRICING_PLANS } from '../../../lib/nexoraPricing';

/**
 * Add-ons.
 *
 * Every add-on in the approved configuration has no price and no purchase
 * flow, so the section only says "ask about it" and states plainly that it
 * cannot be bought on this page. No invented prices, no fake checkout.
 */
export function AddOnsSection({ id = 'addons' }: { id?: string }) {
  return (
    <section className="sl-section sl-section--soft" id={id} aria-labelledby="sl-addons-title">
      <div className="sl-container">
        <SectionHeading
          eyebrow="EXTEND YOUR WORKSPACE"
          id="sl-addons-title"
          title="Add-ons worth asking about."
          description="These options exist in the product plan, but their pricing and purchase flow are not configured yet. Ask the Nexora team before you count on them."
        />

        <ul className="sl-addons">
          {PRICING_ADD_ONS.map((addon) => {
            const includedIn = addon.includedPlanIds
              .map((planId) => PRICING_PLANS.find((plan) => plan.id === planId)?.name)
              .filter(Boolean);
            return (
              <li className="sl-addon" key={addon.id}>
                <h3>{addon.name}</h3>
                <p>{addon.description}</p>
                <p className="sl-addon__price">
                  {includedIn.length
                    ? `Included in ${includedIn.join(', ')} — no separate add-on charge`
                    : 'Contact Nexora for add-on pricing'}
                </p>
                {includedIn.length ? (
                  <ul className="sl-addon__plans" aria-label={`${addon.name} plan entitlement`}>
                    {PRICING_PLANS.map((plan) => {
                      const included = addon.includedPlanIds.includes(plan.id);
                      const Icon = included ? CircleCheck : CircleX;
                      return (
                        <li
                          key={plan.id}
                          className={included ? 'is-included' : 'is-excluded'}
                          aria-label={`${plan.name}: ${included ? `Included in ${plan.name}` : `Not included in ${plan.name}`}`}
                        >
                          <Icon size={18} strokeWidth={1.9} aria-hidden="true" focusable="false" />
                          <span>{plan.name}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="sl-addon__state">
                    <CircleX size={14} aria-hidden="true" />
                    Not bundled with any plan — {addon.availability === 'available' ? 'available on request' : 'availability and pricing are not configured yet'}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <p className="sl-addons__note" id="sl-addons-note">
          <ShieldCheck size={15} aria-hidden="true" />
          Add-ons cannot be purchased on this page. No add-on price, checkout or entitlement is published here
          because none is configured.
        </p>
      </div>
    </section>
  );
}
