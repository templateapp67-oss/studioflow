import { FEATURE_CATEGORIES, FEATURE_PLAN_ENTITLEMENTS, PRICING_PLANS, PUBLISHED_COMPARISON_FEATURE_IDS } from '../../../lib/nexoraPricing';
import { FeatureComparisonTable } from '../../nexora-pricing/table/FeatureComparisonTable';
import '../../nexora-pricing/table/comparisonTable.css';

/**
 * Legacy comparison section of the modular `nexora-pricing` page.
 *
 * It reuses the same shared `FeatureComparisonTable` as the live `/pricing`
 * route (`nexora-landing/sections/ComparisonSection`), so both surfaces render
 * identical approved entitlements: green circled checks for included features,
 * red circled crosses for excluded ones, and the pale-red Standard column.
 */
export function FeatureMatrix() {
  const groups = FEATURE_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    featureIds: category.items.map((item) => item.id),
  }));
  const featureItems = Object.fromEntries(
    FEATURE_CATEGORIES.flatMap((category) => category.items).map((item) => [item.id, item]),
  );

  return (
    <section className="np-section np-matrix-section" id="comparison">
      <div className="np-container">
        <div className="np-section-heading">
          <span className="np-section-kicker">SIDE-BY-SIDE DETAILS</span>
          <h2>Compare all features.</h2>
          <p>Every row is an approved plan entitlement. A green tick means the plan includes the feature; a red cross means it does not.</p>
        </div>

        <FeatureComparisonTable
          plans={PRICING_PLANS}
          groups={groups}
          featureItems={featureItems}
          entitlements={FEATURE_PLAN_ENTITLEMENTS}
          publishedFeatureIds={PUBLISHED_COMPARISON_FEATURE_IDS}
          caption="Feature comparison for the Lite, Grow, Standard and Premium Nexora SalonOS plans."
          idPrefix="np-comparison"
        />
      </div>
    </section>
  );
}
