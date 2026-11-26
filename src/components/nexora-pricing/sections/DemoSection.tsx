import { ArrowRight } from 'lucide-react';
import { PRICING_PAGE_COPY } from '../../../lib/nexoraPricing';
import { CtaButton } from '../CtaButton';

export function DemoSection() {
  return <section className="np-demo-section" id="demo"><div className="np-container np-demo-section-inner"><div><span className="np-section-kicker">{PRICING_PAGE_COPY.demo.eyebrow}</span><h2>{PRICING_PAGE_COPY.demo.title}</h2><p>{PRICING_PAGE_COPY.demo.description}</p></div><CtaButton className="np-btn np-btn-gold">Request a demo <ArrowRight size={17}/></CtaButton></div></section>;
}
