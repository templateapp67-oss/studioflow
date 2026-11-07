import { SectionHeading } from '../ui';
import { useLandingModel } from '../LandingContentProvider';
import { FeatureComparisonTable } from '../../nexora-pricing/table/FeatureComparisonTable';
import { PUBLISHED_COMPARISON_FEATURE_IDS } from '../../../lib/nexoraPricing';
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
    <section className="sl-section sl-section--soft" id={id} aria-labelledby="sl-comparison-title">
      <div className="sl-container">
        <SectionHeading
          eyebrow="SIDE-BY-SIDE DETAILS"
          id="sl-comparison-title"
          title="Compare every feature, plan by plan."
          description="Every row below is an approved plan entitlement. A green tick means the plan includes the feature; a red cross means it does not. Hover, focus or tap the info icon for a plain-language description."
        />

        <FeatureComparisonTable
          plans={plans}
          groups={comparisonGroups}
          featureItems={featureItems}
          entitlements={entitlements}
          publishedFeatureIds={PUBLISHED_COMPARISON_FEATURE_IDS}
          caption="Feature comparison for the Lite, Grow, Standard and Premium Nexora SalonOS plans."
          idPrefix="sl-comparison"
        />

        <p className="sl-table__approval-note">
          Plan entitlements follow the approved Nexora SalonOS pricing policy. Support service levels and add-on
          pricing are not configured yet — ask the Nexora team before you rely on them.
        </p>
      </div>
    </section>
  );
}
