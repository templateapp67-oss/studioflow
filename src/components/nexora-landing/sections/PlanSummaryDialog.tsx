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
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!plan) return;

    const activeElement = document.activeElement;
    previousFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.getAttribute('aria-hidden') !== 'true');
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const focused = document.activeElement;
      if (!dialog.contains(focused)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && focused === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && focused === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const previousFocus = previousFocusRef.current;
      previousFocusRef.current = null;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [plan]);

  if (!plan) return null;

  return (
    <div className="sl-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        ref={dialogRef}
        className="sl-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sl-dialog-title"
        aria-describedby="sl-dialog-checkout-note"
        tabIndex={-1}
      >
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
          <p id="sl-dialog-checkout-note">
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
