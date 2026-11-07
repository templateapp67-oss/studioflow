import { ArrowRight, MessageCircle } from 'lucide-react';
import { PRICING_PAGE_COPY } from '../../../lib/nexoraPricing';
import { CtaButton } from '../CtaButton';

export function FinalCTA({onSelect}:{onSelect:()=>void}) {
  return <section className="np-final"><div className="np-final-orb"/><div className="np-container np-final-inner"><span className="np-section-kicker">{PRICING_PAGE_COPY.closing.eyebrow}</span><h2>{PRICING_PAGE_COPY.closing.title}</h2><p>{PRICING_PAGE_COPY.closing.description}</p><div><button className="np-btn np-btn-gold" onClick={onSelect}>Choose Your Plan <ArrowRight size={17}/></button><CtaButton className="np-btn np-final-contact">Talk to Our Team <MessageCircle size={17}/></CtaButton></div></div></section>;
}
