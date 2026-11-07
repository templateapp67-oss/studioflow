import { Fragment } from 'react';
import { ArrowRight, Check, CircleHelp, Minus } from 'lucide-react';
import { SectionHeading } from '../ui';
import { useLandingModel } from '../LandingContentProvider';
const ENTITLEMENT_LABEL = {
  included: 'Included',
  excluded: 'Not included',
  review: 'Pending plan confirmation',
} as const;

export function ComparisonSection({ id = 'comparison' }: { id?: string }) {
  const { plans, featureItems, comparisonGroups, entitlements } = useLandingModel();

  return (
    <section className="sl-section sl-section--soft" id={id} aria-labelledby="sl-comparison-title">
      <div className="sl-container">
        <SectionHeading
          eyebrow="SIDE-BY-SIDE DETAILS"
          id="sl-comparison-title"
          title="Compare every feature, plan by plan."
          description="Only plan inclusions that have been explicitly confirmed are checked. Everything still waiting on commercial approval is marked as pending instead of being inferred."
        />

        <p className="sl-table__intro">
          <CircleHelp size={16} aria-hidden="true" />
          <span>
            <b>Most tier assignments still need confirmation.</b> The Standard plan explicitly includes WhatsApp API,
            attendance and advanced salon management. Other feature-by-plan combinations have not been approved.
          </span>
        </p>

        <div
          className="sl-table-wrap"
          role="region"
          aria-label="Feature comparison by plan. Scroll horizontally on small screens."
          tabIndex={0}
        >
          <table className="sl-table">
            <caption className="sl-visually-hidden">
              Feature comparison for the Lite, Grow, Standard and Premium Nexora SalonOS plans.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="sl-table__feature-head">
                  Feature
                </th>
                {plans.map((plan) => (
                  <th
                    scope="col"
                    key={plan.id}
                    className={plan.popular ? 'is-recommended' : undefined}
                    aria-label={`${plan.name} plan${plan.popular ? ', recommended plan' : ''}`}
                  >
                    <span className="sl-table__plan">{plan.name}</span>
                    {plan.popular ? <span className="sl-table__plan-flag">Recommended</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonGroups.map((group) => (
                <Fragment key={group.id}>
                  <tr className="sl-table__group">
                    <th colSpan={5} scope="colgroup">
                      {group.label}
                    </th>
                  </tr>
                  {group.featureIds.map((featureId) => {
                    const feature = featureItems[featureId];
                    if (!feature) return null;
                    return (
                      <tr key={feature.id}>
                        <th scope="row" className="sl-table__feature">
                          <span className="sl-table__feature-label">{feature.label}</span>
                          <span className="sl-table__feature-info" title={feature.description} tabIndex={0} aria-label={feature.description}>
                            i
                          </span>
                        </th>
                        {plans.map((plan) => {
                          const state = entitlements[feature.id]?.[plan.id] ?? 'review';
                          return (
                            <td key={plan.id} className={plan.popular ? 'is-recommended' : undefined}>
                              {state === 'included' ? (
                                <span className="sl-table__state sl-table__state--yes">
                                  <Check size={17} aria-hidden="true" />
                                  <span className="sl-visually-hidden">{ENTITLEMENT_LABEL.included}</span>
                                </span>
                              ) : state === 'excluded' ? (
                                <span className="sl-table__state sl-table__state--no">
                                  <Minus size={16} aria-hidden="true" />
                                  <span className="sl-visually-hidden">{ENTITLEMENT_LABEL.excluded}</span>
                                </span>
                              ) : (
                                <span className="sl-table__state sl-table__state--review">
                                  <CircleHelp size={16} aria-hidden="true" />
                                  <span className="sl-visually-hidden">{ENTITLEMENT_LABEL.review}</span>
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <p className="sl-table__hint">
          <ArrowRight size={15} aria-hidden="true" /> Swipe the table sideways to compare every plan.
        </p>

        <ul className="sl-legend">
          <li>
            <Check size={15} aria-hidden="true" /> Confirmed included
          </li>
          <li>
            <Minus size={15} aria-hidden="true" /> Not included
          </li>
          <li>
            <CircleHelp size={15} aria-hidden="true" /> Pending plan configuration
          </li>
        </ul>
      </div>
    </section>
  );
}
