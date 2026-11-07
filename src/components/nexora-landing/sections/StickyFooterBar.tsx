import { ArrowRight } from 'lucide-react';
import { PRICING_PLANS } from '../../../lib/nexoraPricing';
import { formatNexoraMoney } from '../../nexora-pricing/ui';
import { CtaButton } from '../../nexora-pricing/CtaButton';

export function StickyFooterBar() {
  const annualFrom = Math.min(...PRICING_PLANS.map(plan=>plan.annualTotal));
  return <aside className="nl-sticky-bar" aria-label="Pricing and demo actions"><div className="nl-wrap nl-sticky-inner">
    <p><b>Annual plans from ₹{formatNexoraMoney(annualFrom)} / year</b><span>GST included · monthly billing unavailable</span></p>
    <div><a href="/pricing" className="nl-sticky-plans">See plans <ArrowRight size={15}/></a><CtaButton className="nl-sticky-demo">Request a demo</CtaButton></div>
  </div></aside>;
}
