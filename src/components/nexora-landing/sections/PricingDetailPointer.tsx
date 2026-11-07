import { ArrowRight, CircleHelp } from 'lucide-react';
import { SectionHeading } from '../ui';

/**
 * Pointer to the canonical pricing page.
 *
 * `/pricing` is the primary NEXORA SALONOS landing page and the only place
 * that publishes the complete feature-by-plan comparison. The companion route
 * keeps its own anchor (`#comparison`) so inbound links still land on a real
 * section, but it does not duplicate the matrix.
 */
export function PricingDetailPointer({ id = 'comparison' }: { id?: string }) {
  return (
    <section className="sl-section sl-section--soft" id={id} aria-labelledby="sl-pricing-detail-title">
      <div className="sl-container">
        <SectionHeading
          eyebrow="FULL PRICING DETAIL"
          id="sl-pricing-detail-title"
          title="The complete plan comparison lives on the pricing page."
          description="This page explains what Nexora SalonOS does. The feature-by-plan comparison, the add-on availability and the annual totals are published in one place so they can never disagree."
        />

        <p className="sl-table__intro">
          <CircleHelp size={16} aria-hidden="true" />
          <span>
            <b>One source for pricing.</b> The annual totals (Lite ₹7,500, Grow ₹14,988, Standard ₹23,988,
            Premium ₹59,988, all including GST) and the confirmed plan inclusions are shown on the pricing
            page. Monthly billing is not configured yet.
          </span>
        </p>

        <p>
          <a className="sl-btn sl-btn--primary" href="/pricing#comparison">
            Open the full comparison
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </p>
      </div>
    </section>
  );
}
