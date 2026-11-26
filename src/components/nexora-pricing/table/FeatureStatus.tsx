import { CircleCheck, CircleX } from 'lucide-react';
import type { EntitlementState } from '../../../lib/nexoraPricing';

/**
 * One plan-status cell in the comparison table.
 *
 * Visual contract (see `docs/nexora-plan-entitlements.md`):
 *   included → green outlined circular check, transparent background;
 *   excluded → red outlined circular cross, transparent background.
 *
 * There is deliberately no third state. A grey question mark, a grey minus icon
 * or a "Review" chip must never appear in a plan cell: it neither answers the
 * customer's question nor is it an approved commercial statement. `review` is an
 * internal configuration value, so if one ever reaches this component the build
 * fails in `verify-nexora-pricing.mjs` rather than the cell silently degrading.
 */
export function FeatureStatus({
  state,
  planName,
  featureLabel,
}: {
  state: EntitlementState;
  planName: string;
  featureLabel: string;
}) {
  if (state !== 'included' && state !== 'excluded') {
    // Fail closed: an unapproved cell renders nothing visible but keeps its
    // accessible label, and the verification suite treats its presence as an error.
    return (
      <span className="nx-status" data-status="review" role="img" aria-label={`${featureLabel}: plan confirmation pending in ${planName}`}>
        <span aria-hidden="true" className="nx-status__pending">—</span>
      </span>
    );
  }

  const included = state === 'included';
  const Icon = included ? CircleCheck : CircleX;
  const label = included ? `Included in ${planName}` : `Not included in ${planName}`;

  return (
    <span className={`nx-status ${included ? 'nx-status--included' : 'nx-status--excluded'}`} data-status={state} role="img" aria-label={`${featureLabel}: ${label}`}>
      <Icon size={18} strokeWidth={1.9} aria-hidden="true" focusable="false" />
    </span>
  );
}
