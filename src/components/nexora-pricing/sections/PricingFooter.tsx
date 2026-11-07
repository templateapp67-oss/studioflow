import { ArrowRight } from 'lucide-react';
import { NexoraBrandMark } from '../../nexora/NexoraBrand';
import { CtaButton } from '../CtaButton';

export function PricingFooter() {
  const groups = [
    ['PRODUCT',[['Features','/#features'],['Pricing','/pricing'],['Online Booking','/#features'],['Mini Website','/#features'],['Salon Management','/#features'],['POS & Billing','/#features']]],
    ['BUSINESS',[['Salon Owners','/login?auth=signup'],['Customer App','/?app=1'],['Growth Partners','/#how-it-works'],['Help & Support',null]]],
    ['COMPANY',[['About Nexora','/#how-it-works'],['Contact',null],['Privacy Policy',null],['Terms & Conditions',null]]],
  ] as const;
  return <footer className="np-footer"><div className="np-container"><div className="np-footer-main"><div className="np-footer-brand"><a href="/" className="np-brand"><NexoraBrandMark size="md"/><span><b>NEXORA</b><small>SALONOS</small></span></a><p>A connected digital platform built to simplify salon bookings, billing, customer management, staff operations and business workflows.</p><p className="np-contact-disclosure" id="pricing-contact-note">Nexora has not configured a verified sales contact destination for this pricing experience. Please use the support channel already provided to your account.</p><CtaButton className="np-footer-action">Request a product walkthrough <ArrowRight size={15}/></CtaButton></div>{groups.map(([title,links])=><nav key={title} aria-label={`${title} links`} className="np-footer-links"><h3>{title}</h3>{links.map(([label,href])=>href?<a key={label} href={href}>{label}</a>:<span key={label} aria-label={`${label} destination not configured`}>{label} <small>(not configured)</small></span>)}</nav>)}<div className="np-footer-links"><h3>SOCIAL</h3><p>Official social destinations are not configured.</p><span className="np-social-note">Follow links will appear here when verified.</span></div></div><div className="np-footer-bottom"><span>© {new Date().getFullYear()} Nexora SalonOS. All rights reserved.</span><span>Built for salon businesses in India</span></div></div></footer>;
}
