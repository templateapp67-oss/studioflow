import { useLandingModel } from '../LandingContentProvider';
import { FeatureComparisonTable } from '../../nexora-pricing/table/FeatureComparisonTable';
import { PUBLISHED_COMPARISON_FEATURE_IDS, PRICING_ADD_ONS } from '../../../lib/nexoraPricing';
import '../../nexora-pricing/table/comparisonTable.css';

/**
 * Side-by-side comparison on `/pricing`.
 *
 * The table itself is shared with the legacy `nexora-pricing` FeatureMatrix
 * (`nexora-pricing/table/FeatureComparisonTable`), so the two surfaces cannot
 * drift apart. Every rendered cell is an approved binary entitlement: green
 * circled check for included, red circled cross for not included. No question
 * marks, no grey minus icons, no "pending" chips in plan cells.
 */
export function ComparisonSection({ id = 'comparison' }: { id?: string }) {
  const { plans, featureItems, comparisonGroups, entitlements } = useLandingModel();

  return (
    <section className="sl-section sl-section--soft" id={id} aria-label="Feature comparison">
      <div className="sl-container">
        <FeatureComparisonTable
          plans={plans}
          addOns={PRICING_ADD_ONS}
          groups={comparisonGroups}
          featureItems={featureItems}
          entitlements={entitlements}
          publishedFeatureIds={PUBLISHED_COMPARISON_FEATURE_IDS}
          caption="Feature comparison for the Lite, Grow, Standard and Premium Nexora SalonOS plans."
          idPrefix="sl-comparison"
        />

        <p className="sl-table__approval-note">
          Add-ons cannot be purchased on this page. No add-on price, checkout or entitlement is published here because none is configured.
        </p>
      </div>
    </section>
  );
}
