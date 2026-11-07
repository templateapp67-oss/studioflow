import { ArrowRight } from 'lucide-react';
import type { AddOn, EntitlementState, FeatureItem, PricingPlan } from '../../../lib/nexoraPricing';
import { FeatureStatus } from './FeatureStatus';
import { FeatureInfoTooltip } from './FeatureInfoTooltip';
import { FeatureCategoryRow } from './FeatureCategoryRow';
import { PlanColumnHeader } from './PlanColumnHeader';

export interface ComparisonGroup {
  id: string;
  label: string;
  featureIds: string[];
}

type EntitlementLookup = Record<string, Partial<Record<string, EntitlementState>> | undefined>;

/**
 * The NEXORA SALONOS pricing comparison table.
 *
 * This is the single implementation behind both `/pricing`
 * (`nexora-landing/sections/ComparisonSection`) and the legacy
 * `nexora-pricing/sections/FeatureMatrix`, so the two can never drift apart.
 *
 * Publishing rules enforced here — not merely in the data:
 *   * a row is rendered only when its feature is in `publishedFeatureIds`, which
 *     is derived from the approved matrix. An unapproved feature is never shown,
 *     so a `review` cell can never reach a customer;
 *   * a cell is rendered only as a green check (included) or a red cross
 *     (excluded). The legend therefore has exactly two entries.
 */
export function FeatureComparisonTable({
  plans,
  addOns = [],
  groups,
  featureItems,
  entitlements,
  publishedFeatureIds,
  caption,
  idPrefix = 'nx-comparison',
  scrollLabel = 'Feature comparison by plan. Scroll horizontally on small screens.',
}: {
  plans: PricingPlan[];
  addOns?: AddOn[];
  groups: ComparisonGroup[];
  featureItems: Record<string, FeatureItem>;
  entitlements: EntitlementLookup;
  publishedFeatureIds: readonly string[];
  caption: string;
  idPrefix?: string;
  scrollLabel?: string;
}) {
  const published = new Set(publishedFeatureIds);
  const visibleGroups = groups
    .map((group) => ({ ...group, featureIds: group.featureIds.filter((id) => published.has(id) && featureItems[id]) }))
    .filter((group) => group.featureIds.length > 0);

  if (!visibleGroups.length) {
    return (
      <p className="nx-compare__empty" role="status">
        The full plan comparison is awaiting commercial approval. Ask the Nexora team for the current plan details.
      </p>
    );
  }

  return (
    <>
      <div className="nx-compare__wrap" role="region" aria-label={scrollLabel} tabIndex={0}>
        <table className="nx-compare">
          <caption className="nx-visually-hidden">{caption}</caption>
          <colgroup>
            <col className="nx-compare__col-feature" />
            {plans.map((plan) => (
              <col key={plan.id} className={`nx-compare__col-plan${plan.popular ? ' is-recommended' : ''}`} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="nx-compare__feature-head">
                Features
              </th>
              {plans.map((plan) => (
                <PlanColumnHeader key={plan.id} plan={plan} idPrefix={idPrefix} />
              ))}
            </tr>
          </thead>
          <tbody>
            {addOns.length > 0 && <>
              <FeatureCategoryRow category={{ id: 'addons', label: 'Add-ons' }} planCount={plans.length} featureCount={addOns.length} />
              {addOns.map((addOn) => (
                <tr key={addOn.id} className="nx-compare__row">
                  <th scope="row" className="nx-compare__feature">
                    <span className="nx-compare__addon-label">{addOn.name}</span>
                    <FeatureInfoTooltip label={addOn.name} description={addOn.description} />
                  </th>
                  {plans.map((plan) => (
                    <td key={plan.id} className={`nx-compare__cell${plan.popular ? ' is-recommended' : ''}`} data-plan={plan.id}>
                      <FeatureStatus state={addOn.includedPlanIds.includes(plan.id) ? 'included' : 'excluded'} planName={plan.name} featureLabel={addOn.name} />
                    </td>
                  ))}
                </tr>
              ))}
            </>}
            {visibleGroups.map((group) => (
              <FragmentGroup key={group.id} group={group} plans={plans} featureItems={featureItems} entitlements={entitlements} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="nx-compare__hint">
        <ArrowRight size={15} aria-hidden="true" /> Swipe to compare plans.
      </p>

      <ul className="nx-legend">
        <li>
          <FeatureStatus state="included" planName="any plan" featureLabel="Legend example" />
          <span>Included</span>
        </li>
        <li>
          <FeatureStatus state="excluded" planName="any plan" featureLabel="Legend example" />
          <span>Not included</span>
        </li>
      </ul>
    </>
  );
}

function FragmentGroup({
  group,
  plans,
  featureItems,
  entitlements,
}: {
  group: ComparisonGroup;
  plans: PricingPlan[];
  featureItems: Record<string, FeatureItem>;
  entitlements: EntitlementLookup;
}) {
  return (
    <>
      <FeatureCategoryRow category={group} planCount={plans.length} featureCount={group.featureIds.length} />
      {group.featureIds.map((featureId) => {
        const feature = featureItems[featureId];
        return (
          <tr key={feature.id} className="nx-compare__row">
            <th scope="row" className="nx-compare__feature">
              <span className="nx-compare__feature-label">{feature.label}</span>
              <FeatureInfoTooltip label={feature.label} description={feature.description} />
            </th>
            {plans.map((plan) => {
              const state = entitlements[feature.id]?.[plan.id] ?? 'review';
              return (
                <td key={plan.id} className={`nx-compare__cell${plan.popular ? ' is-recommended' : ''}`} data-plan={plan.id}>
                  <FeatureStatus state={state} planName={plan.name} featureLabel={feature.label} />
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
