import { ArrowUpRight } from 'lucide-react';
import { NexoraBrandMark } from '../../nexora/NexoraBrand';
import { CtaButton } from '../CtaButton';

export function PriceHeader() {
  return <header className="np-header"><div className="np-container np-header-inner">
    <a href="/" className="np-brand" aria-label="Nexora SalonOS home"><NexoraBrandMark size="md"/><span><b>NEXORA</b><small>SALONOS</small></span></a>
    <nav className="np-top-nav" aria-label="Pricing page navigation"><a href="/salon-os#platform">Features</a><a href="#plans">Pricing</a><a href="#comparison">Compare plans</a><a href="#faq">FAQs</a></nav>
    <CtaButton className="np-header-cta">Book a demo <ArrowUpRight size={16}/></CtaButton>
  </div></header>;
}
