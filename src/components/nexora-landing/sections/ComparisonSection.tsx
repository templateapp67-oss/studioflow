import { FeatureComparisonTable } from '../../nexora-pricing/table/FeatureComparisonTable';
import '../../nexora-pricing/table/comparisonTable.css';

/** The live pricing page renders the single approved matrix data source. */
export function ComparisonSection({ id = 'comparison' }: { id?: string }) {
  return <section className="sl-section sl-section--soft" id={id} aria-label="Feature comparison">
    <div className="sl-container">
      <FeatureComparisonTable
        caption="Feature comparison for the Lite, Grow, Standard and Premium Nexora SalonOS plans."
        idPrefix="sl-comparison"
      />
    </div>
  </section>;
}
