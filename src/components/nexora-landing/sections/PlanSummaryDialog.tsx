import { useEffect, useRef } from 'react';
import { CircleHelp, X } from 'lucide-react';
import type { BillingInterval, PricingPlan } from '../../../lib/nexoraPricing';

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);

/**
 * Plan summary shown to a signed-in visitor.
 *
 * It repeats the approved annual figures, states that subscription checkout
 * is not configured, and never implies that a plan was activated. The dialog
 * traps focus, closes on Escape and returns focus to the trigger.
 */
export function PlanSummaryDialog({
  plan,
  interval,
  onClose,
}: {
  plan: PricingPlan | null;
  interval: BillingInterval;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!plan) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [plan, onClose]);

  if (!plan) return null;

  return (
    <div className="sl-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="sl-dialog" role="dialog" aria-modal="true" aria-labelledby="sl-dialog-title">
        <button ref={closeRef} type="button" className="sl-dialog__close" aria-label="Close plan summary" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
        <span className="sl-dialog__kicker">PLAN SELECTION</span>
        <h2 id="sl-dialog-title">{plan.name} plan summary</h2>
        <div className="sl-dialog__row">
          <span>{interval === 'annual' ? 'Annual subscription' : 'Monthly subscription'}</span>
          <b>
            {interval === 'annual'
              ? `₹${formatMoney(plan.annualTotal)} / year`
              : 'Monthly price not configured'}
          </b>
        </div>
        {interval === 'annual' ? (
          <p className="sl-dialog__detail">
            Equivalent to ₹{formatMoney(plan.annualMonthlyEquivalent)} per month, billed annually. The annual total
            includes GST.
          </p>
        ) : null}
        <div className="sl-dialog__alert">
          <CircleHelp size={18} aria-hidden="true" />
          <p>
            <b>Subscription checkout is not configured.</b>
            <br />
            Nexora subscription payments are not configured. The existing Razorpay integration is for salon booking
            deposits and is not used here. This selection will not charge you or activate a plan. Ask the Nexora team
            through the support channel already provided to your account.
          </p>
        </div>
        <button type="button" className="sl-btn sl-btn--primary sl-dialog__done" onClick={onClose}>
          Got it
        </button>
      </section>
    </div>
  );
}
