import { ArrowRight } from 'lucide-react';
import { CtaButton } from '../../nexora-pricing/CtaButton';

const links = [
  ['Platform', '#platform'],
  ['Templates', '#templates'],
  ['Compare plans', '/pricing#comparison'],
  ['FAQs', '#faq'],
] as const;

export function LandingHeader() {
  return <header className="nl-header"><div className="nl-wrap nl-header-row">
    <a href="/salon-os" className="nl-brand" aria-label="Nexora SalonOS home">NEXORA <span>SalonOS</span></a>
    <nav aria-label="Main navigation">{links.map(([label,href])=><a key={label} href={href}>{label}</a>)}</nav>
    <CtaButton className="nl-header-cta">Request a demo <ArrowRight size={15}/></CtaButton>
  </div></header>;
}
