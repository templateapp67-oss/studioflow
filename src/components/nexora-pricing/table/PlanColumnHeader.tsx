import type { PricingPlan } from '../../../lib/nexoraPricing';

/**
 * A plan column header.
 *
 * The Standard (recommended) column heading uses Nexora red and its column keeps
 * the pale-red `#FFE9EA` highlight; the other headings stay black on white. There
 * is no dark header block: the brief's acceptance criteria ask for a light,
 * premium table, and a black band also made the red Standard heading unreadable.
 */
export function PlanColumnHeader({ plan, idPrefix }: { plan: PricingPlan; idPrefix: string }) {
  return (
    <th
      scope="col"
      className={`nx-planhead${plan.popular ? ' is-recommended' : ''}`}
      id={`${idPrefix}-${plan.id}`}
      aria-label={`${plan.name} plan`}
    >
      <span className="nx-planhead__name">{plan.name}</span>
      {plan.popular ? <span className="nx-planhead__flag">Popular</span> : null}
    </th>
  );
}
