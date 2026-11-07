import { ArrowRight, CircleHelp } from 'lucide-react';
import { NEXORA_LANDING_COPY } from '../../../lib/nexoraLandingContent';
import { CtaButton } from '../../nexora-pricing/CtaButton';

export function TrustAndDemo() {
  return <section className="nl-section nl-terms" id="terms"><div className="nl-wrap">
    <div className="nl-section-head"><span className="nl-kicker">BEFORE YOU CHOOSE</span><h2>{NEXORA_LANDING_COPY.termsTitle}</h2><p>We distinguish approved information from features and policies that still need confirmation.</p></div>
    <ul className="nl-terms-list">{NEXORA_LANDING_COPY.terms.map(term=><li key={term}><CircleHelp size={17}/><span>{term}</span></li>)}</ul>
    <div className="nl-terms-cta"><CtaButton className="nl-button nl-button-gold">Request a demo <ArrowRight size={16}/></CtaButton><a href="/pricing">Review pricing details</a></div>
  </div></section>;
}
