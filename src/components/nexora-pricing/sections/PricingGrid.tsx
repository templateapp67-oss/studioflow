import { ArrowDown, ArrowRight, Check, Crown, Scissors, ShieldCheck, Sparkles } from 'lucide-react';
import { FEATURE_CATEGORIES, FEATURE_PLAN_ENTITLEMENTS, PRICING_PLANS, type BillingInterval, type PricingPlan } from '../../../lib/nexoraPricing';
import { formatNexoraMoney as money } from '../ui';

export function BillingToggle({ value, onChange }: { value: BillingInterval; onChange: (value: BillingInterval) => void }) {
  return <div className="np-billing-row"><div><span className="np-section-kicker">CHOOSE YOUR BILLING</span><h2>Plans that fit your next chapter.</h2><p>Clear prices, with annual totals shown up front.</p></div><div className="np-billing-control" role="group" aria-label="Billing period"><button aria-pressed={value==='monthly'} onClick={()=>onChange('monthly')}>Monthly</button><button aria-pressed={value==='annual'} onClick={()=>onChange('annual')}>Yearly <span>Yearly rate</span></button></div></div>;
}

const CATALOGUE_ITEMS = FEATURE_CATEGORIES.flatMap(category=>category.items);
const highlightFeatures = Object.fromEntries(PRICING_PLANS.map(plan=>[plan.id, CATALOGUE_ITEMS.filter(feature=>FEATURE_PLAN_ENTITLEMENTS[feature.id][plan.id]==='included')])) as Record<PricingPlan['id'], typeof CATALOGUE_ITEMS>;
/** Features the approved entitlement matrix grants to this plan. */
export function planHighlights(planId: PricingPlan['id']) {
  return CATALOGUE_ITEMS.filter(feature=>FEATURE_PLAN_ENTITLEMENTS[feature.id][planId]==='included');
}

export function PricingCard({ plan, interval, onSelect, isSelecting }: { plan: PricingPlan; interval: BillingInterval; onSelect: (plan: PricingPlan) => void; isSelecting: boolean }) {
  const planHighlights = highlightFeatures[plan.id];
  return <article className={`np-plan-card ${plan.popular?'is-popular':''}`}>
    {plan.popular&&<div className="np-popular"><Sparkles size={13}/> MOST POPULAR</div>}
    <div className="np-plan-top"><span className="np-plan-icon">{plan.id==='premium'?<Crown size={20}/>:plan.id==='grow'?<Sparkles size={20}/>:<Scissors size={20}/>}</span><h3>{plan.name}</h3></div>
    <p className="np-plan-desc">{plan.description}</p><p className="np-plan-position">{plan.positioning}</p>
    <div className="np-price-block">{interval==='annual'?<><div className="np-price"><span>₹</span>{money(plan.annualTotal)}<small>/year</small></div><p>Billed annually</p><div className="np-annual-total">₹{money(plan.annualMonthlyEquivalent)}/mo <span>monthly equivalent · GST inclusive</span></div></>:<><div className="np-price"><span>₹</span>{money(plan.monthlyPrice)}<small>/mo</small></div><p>Billed monthly</p></>}</div>
    <div className="np-plan-features"><span className="np-plan-includes">Plan highlights</span>{planHighlights.slice(0,4).map(feature=><span key={feature.id}><Check size={16}/>{feature.label}</span>)}{planHighlights.length>4&&<span className="np-plan-more">+{planHighlights.length-4} more · see the full comparison</span>}</div>
    <button className={`np-plan-cta ${plan.popular?'gold':''}`} disabled={isSelecting} onClick={()=>onSelect(plan)}>{isSelecting?'Checking account…':plan.cta}<ArrowRight size={16}/></button><a href="#comparison" className="np-plan-details">View plan details <ArrowDown size={14}/></a>
  </article>;
}

export function PricingGrid({ interval, setInterval, onSelect, isSelecting, selectionMessage }: { interval: BillingInterval; setInterval: (value: BillingInterval)=>void; onSelect: (plan: PricingPlan)=>void; isSelecting: boolean; selectionMessage: string }) {
  return <section className="np-section np-plans-section" id="plans"><div className="np-container"><BillingToggle value={interval} onChange={setInterval}/>{selectionMessage&&<p className="np-matrix-note" role="status">{selectionMessage}</p>}<div className="np-plan-grid">{PRICING_PLANS.map(plan=><PricingCard key={plan.id} plan={plan} interval={interval} onSelect={onSelect} isSelecting={isSelecting}/>)}</div><p className="np-tax-note"><ShieldCheck size={15}/> Approved annual prices are GST-inclusive. Monthly billing is available at the rates shown above. Subscription checkout is not available yet.</p></div></section>;
}
