import { ArrowRight } from 'lucide-react';
import { NEXORA_COMPARISON_MATRIX, NEXORA_COMPARISON_PLANS, type ComparisonFeature } from '../../../lib/nexoraComparisonMatrix';
import { PRICING_PLANS } from '../../../lib/nexoraPricing';
import { FeatureStatus } from './FeatureStatus';
import { FeatureCategoryRow } from './FeatureCategoryRow';
import { PlanColumnHeader } from './PlanColumnHeader';

/** Shared, data-driven renderer for the approved Nexora comparison matrix. */
export function FeatureComparisonTable({
  caption = 'Feature comparison for the Lite, Grow, Standard and Premium Nexora SalonOS plans.',
  idPrefix = 'nx-comparison',
  scrollLabel = 'Feature comparison by plan. Scroll horizontally on small screens.',
}: {
  caption?: string;
  idPrefix?: string;
  scrollLabel?: string;
}) {
  const plans = NEXORA_COMPARISON_PLANS.map((planId) => {
    const plan = PRICING_PLANS.find((candidate) => candidate.id === planId);
    if (!plan) throw new Error(`Missing approved Nexora pricing plan: ${planId}`);
    return plan;
  });

  return (
    <>
      <div className="nx-compare__wrap" role="region" aria-label={scrollLabel} tabIndex={0}>
        <table className="nx-compare" data-feature-count="87" data-category-count="9">
          <caption className="nx-visually-hidden">{caption}</caption>
          <colgroup>
            <col className="nx-compare__col-feature" />
            {plans.map((plan) => <col key={plan.id} className={`nx-compare__col-plan${plan.popular ? ' is-recommended' : ''}`} />)}
          </colgroup>
          <thead><tr>
            <th scope="col" className="nx-compare__feature-head">Features</th>
            {plans.map((plan) => <PlanColumnHeader key={plan.id} plan={plan} idPrefix={idPrefix} />)}
          </tr></thead>
          <tbody>
            {NEXORA_COMPARISON_MATRIX.map((category) => <CategoryRows key={category.id} categoryId={category.id} categoryName={category.name} features={category.features} plans={plans} />)}
          </tbody>
        </table>
      </div>
      <p className="nx-compare__hint"><ArrowRight size={15} aria-hidden="true" /> Swipe to compare plans.</p>
      <ul className="nx-legend">
        <li><FeatureStatus state="included" planName="any plan" featureLabel="Legend example" /><span>Included</span></li>
        <li><FeatureStatus state="excluded" planName="any plan" featureLabel="Legend example" /><span>Not included</span></li>
      </ul>
    </>
  );
}

function CategoryRows({
  categoryId,
  categoryName,
  features,
  plans,
}: {
  categoryId: string;
  categoryName: string;
  features: ComparisonFeature[];
  plans: typeof PRICING_PLANS;
}) {
  return <>
    <FeatureCategoryRow category={{ id: categoryId, label: categoryName }} planCount={plans.length} featureCount={features.length} />
    {features.map((feature) => <FeatureRow key={feature.id} feature={feature} plans={plans} />)}
  </>;
}

function FeatureRow({ feature, plans }: { feature: ComparisonFeature; plans: typeof PRICING_PLANS }) {
  return <tr className="nx-compare__row" data-feature-id={feature.id} data-feature-type={feature.type}>
    <th scope="row" className="nx-compare__feature"><span className="nx-compare__feature-label">{feature.label}</span></th>
    {plans.map((plan) => {
      const value = feature.values[plan.id];
      return <td key={plan.id} className={`nx-compare__cell${plan.id === 'standard' ? ' is-recommended' : ''}`} data-plan={plan.id}>
        {typeof value === 'boolean'
          ? <FeatureStatus state={value ? 'included' : 'excluded'} planName={plan.name} featureLabel={feature.label} />
          : <span className="nx-compare__numeric" aria-label={`${feature.label}: ${value} in ${plan.name}`}>{value}</span>}
      </td>;
    })}
  </tr>;
}
