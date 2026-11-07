import { BarChart3, Gem, Globe2, MessageCircle, Package, ShieldCheck, Sparkles, UsersRound, ArrowUpRight } from 'lucide-react';
import { PRICING_ADD_ONS, PRICING_PLANS } from '../../../lib/nexoraPricing';
import { formatNexoraMoney as money } from '../ui';

const addOnIcons = [MessageCircle, Sparkles, UsersRound, Globe2, Package, BarChart3, Gem, ShieldCheck];

export function AddOns() {
  return <section className="np-section np-addons-section" id="addons"><div className="np-container"><div className="np-section-heading"><span className="np-section-kicker">EXTEND YOUR WORKSPACE</span><h2>Grow Your Salon With Powerful Add-ons.</h2><p>Ask us about these options. Availability, plan overlap and prices must be confirmed before purchase.</p></div><div className="np-addon-grid">{PRICING_ADD_ONS.map((addon,index)=>{const Icon=addOnIcons[index];return <article className="np-addon-card" key={addon.id}><span className="np-addon-icon"><Icon size={19}/></span><div><h3>{addon.name}</h3><p>{addon.description}</p><span className="np-addon-price">{addon.includedPlanIds.length?`Included in ${addon.includedPlanIds.map(id=>PRICING_PLANS.find(plan=>plan.id===id)?.name).filter(Boolean).join(', ')} · no separate add-on charge`:addon.price===null?'Contact Nexora for Add-on Pricing':`₹${money(addon.price)}`}</span></div><button type="button" onClick={()=>document.getElementById('pricing-addon-note')?.scrollIntoView({behavior:'smooth',block:'center'})}>Learn More <ArrowUpRight size={14}/></button></article>;})}</div><p className="np-addon-note" id="pricing-addon-note"><ShieldCheck size={16}/> Add-ons cannot be purchased from this page. Pricing and duplicate-feature checks are not configured.</p></div></section>;
}
