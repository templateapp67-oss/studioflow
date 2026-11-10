import { FeatureComparisonTable } from '../../nexora-pricing/table/FeatureComparisonTable';
import '../../nexora-pricing/table/comparisonTable.css';

/** Legacy pricing surface shares the exact same comparison specification. */
export function FeatureMatrix() {
  return <section className="np-section np-matrix-section" id="comparison">
    <div className="np-container">
      <div className="np-section-heading">
        <span className="np-section-kicker">SIDE-BY-SIDE DETAILS</span>
        <h2>Compare all features.</h2>
        <p>Every row follows the approved plan specification. A green check means included; a red cross means not included.</p>
      </div>
      <FeatureComparisonTable caption="Feature comparison for the Lite, Grow, Standard and Premium Nexora SalonOS plans." idPrefix="np-comparison" />
    </div>
  </section>;
}
