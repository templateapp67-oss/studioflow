import { ArrowDown, ArrowRight, ShieldCheck } from 'lucide-react';
import { PRICING_PLANS } from '../../../lib/nexoraPricing';
import { NEXORA_LANDING_COPY } from '../../../lib/nexoraLandingContent';
import { formatNexoraMoney } from '../../nexora-pricing/ui';
import { DashboardPreview } from '../../nexora-pricing/sections/Hero';
import { CtaButton } from '../../nexora-pricing/CtaButton';

export function LandingHero() {
  const entryAnnual = Math.min(...PRICING_PLANS.map(plan => plan.annualTotal));
  return <section className="nl-hero" id="top"><div className="nl-hero-glow" aria-hidden="true"/><div className="nl-wrap">
    <div className="nl-hero-copy"><span className="nl-kicker">{NEXORA_LANDING_COPY.heroEyebrow}</span><h1>{NEXORA_LANDING_COPY.heroTitle}</h1>
      <p>{NEXORA_LANDING_COPY.heroDescription}</p>
      <div className="nl-hero-price"><span>Annual plans from</span><strong>₹{formatNexoraMoney(entryAnnual)}<small> / year</small></strong><span>GST included · monthly billing unavailable</span></div>
      <div className="nl-hero-actions"><a className="nl-button nl-button-gold" href="/pricing">View approved plans <ArrowRight size={17}/></a><CtaButton className="nl-button nl-button-outline">Request a demo</CtaButton></div>
      <div className="nl-hero-trust"><ShieldCheck size={16}/> No sample ROI claims or unverified testimonials</div>
    </div>
    <div className="nl-product-preview"><DashboardPreview/></div>
    <a className="nl-scroll-link" href="#templates">Explore the platform <ArrowDown size={15}/></a>
  </div></section>;
}
