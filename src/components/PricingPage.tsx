import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDown, ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Check, CircleHelp,
  Clock3, CreditCard, Crown, Gem, Globe2, HeartHandshake, IndianRupee, LayoutDashboard,
  MessageCircle, Minus, Package, Plus, Scissors, ShieldCheck, Sparkles, UsersRound, Wallet, X,
} from 'lucide-react';
import { NexoraBrandMark } from './nexora/NexoraBrand';
import { clearPendingPricingSelection, FEATURE_CATEGORIES, FEATURE_PLAN_ENTITLEMENTS, PRICING_FAQS, PRICING_PLANS, PRICING_ADD_ONS, pricingAuthPath, readPendingPricingSelection, savePendingPricingSelection, isBillingInterval, isPricingPlanId, type BillingInterval, type PricingPlan } from '../lib/nexoraPricing';
import { NEXORA_PUBLIC_ORIGIN } from '../lib/publicSeo';
import './pricingPage.css';

const money = (amount: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
const benefits = [
  ['Your salon business in one place', 'Keep supported salon workflows together in one owner workspace.', LayoutDashboard],
  ['Better appointment management', 'Review and manage appointments made through your published salon website.', CalendarDays],
  ['Organized customer records', 'Find customer and booking details in the tools your workspace supports.', UsersRound],
  ['Easier billing and payments', 'Use available owner-side POS tools for salon transactions.', CreditCard],
  ['Better staff coordination', 'Manage staff profiles and supported team workflows.', Scissors],
  ['Customer retention tools', 'Explore existing customer engagement and loyalty tools.', HeartHandshake],
  ['Business analytics', 'See operational information provided by your existing workspace.', BarChart3],
  ['A professional online presence', 'Build a salon website from Nexora’s existing templates.', Globe2],
] as const;
const addOnIcons = [MessageCircle, Sparkles, UsersRound, Globe2, Package, BarChart3, Gem, ShieldCheck];

function PriceHeader() {
  return <header className="np-header"><div className="np-container np-header-inner">
    <a href="/" className="np-brand" aria-label="Nexora SalonOS home"><NexoraBrandMark size="md"/><span><b>NEXORA</b><small>SALONOS</small></span></a>
    <nav className="np-top-nav" aria-label="Pricing page navigation"><a href="/#features">Features</a><a href="#plans">Pricing</a><a href="#comparison">Compare plans</a><a href="#faq">FAQs</a></nav>
    <a className="np-header-cta" href="/login?auth=signup">Get started <ArrowUpRight size={16}/></a>
  </div></header>;
}

function DashboardPreview() {
  const [activeView, setActiveView] = useState<'overview' | 'bookings' | 'team' | 'billing' | 'reports'>('overview');
  const viewLabels = { overview: 'Workspace overview', bookings: 'Bookings & calendar', team: 'Staff schedule', billing: 'Billing overview', reports: 'Business reports' };
  const viewIcons = [LayoutDashboard, CalendarDays, UsersRound, Wallet, BarChart3] as const;
  const viewIds = ['overview', 'bookings', 'team', 'billing', 'reports'] as const;
  return <div className="np-dashboard" aria-label="Interactive illustrative salon workspace preview">
    <div className="np-dash-top"><div className="np-window-dots"><i/><i/><i/></div><span>Salon workspace <small>ILLUSTRATIVE PREVIEW</small></span><div className="np-dash-profile" aria-hidden="true">N</div></div>
    <div className="np-dash-body">
      <nav className="np-dash-side" aria-label="Dashboard preview sections">
        <span className="np-dash-mark" aria-hidden="true"><Scissors size={16}/></span>
        {viewIds.map((view,index)=>{const Icon=viewIcons[index];return <button key={view} type="button" className={activeView===view?'active':''} aria-label={viewLabels[view]} aria-pressed={activeView===view} title={viewLabels[view]} onClick={()=>setActiveView(view)}><Icon size={16}/></button>;})}
      </nav>
      <div className="np-dash-content">
        <div className="np-dash-greeting"><div><small>YOUR SALON WORKSPACE</small><h3>{viewLabels[activeView]}</h3></div><span className="np-dash-readonly">Preview</span></div>
        <div className="np-dash-stats"><div><small>Today's bookings</small><b>—</b><span><CalendarDays size={13}/> No live data</span></div><div><small>Revenue summary</small><b>—</b><span><IndianRupee size={13}/> No live data</span></div><div><small>Customers</small><b>—</b><span><UsersRound size={13}/> No live data</span></div></div>
        <div className="np-dash-lower"><div className="np-dash-panel"><div className="np-panel-title"><b>Booking calendar</b><span>Illustrative</span></div><div className="np-calendar"><div className="np-time-col">09 AM<br/>10 AM<br/>11 AM<br/>12 PM</div><div className="np-calendar-grid"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div></div><div className="np-dash-panel np-staff-panel"><div className="np-panel-title"><b>Staff schedule</b><UsersRound size={15}/></div><div className="np-preview-empty">Schedule preview<br/><span>Sample layout · no salon records</span></div><div className="np-sales"><span><BarChart3 size={14}/> Sales overview</span><p>No live business data</p></div></div></div>
      </div>
    </div><div className="np-demo-label"><Sparkles size={13}/> Click the sidebar to explore · no live salon data</div>
  </div>;
}

function Hero({ onExplore }: { onExplore: () => void }) {
  const reduceMotion = useReducedMotion();
  return <section className="np-hero"><div className="np-orb np-orb-a"/><div className="np-orb np-orb-b"/><div className="np-container np-hero-grid">
    <motion.div className="np-hero-copy" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:reduceMotion?0:.55}}>
      <div className="np-eyebrow"><span/> NEXORA SALONOS PRICING</div><h1>The Right Tools to Grow Your <em>Salon Business.</em></h1>
      <p>Whether you run an independent beauty studio or manage a growing salon chain, Nexora SalonOS gives you tools to manage bookings, customers, staff, payments and business operations from one platform.</p>
      <div className="np-hero-note"><span>Simple pricing.</span> Powerful salon management. Built for Indian businesses.</div>
      <div className="np-hero-actions"><button className="np-btn np-btn-gold" onClick={onExplore}>Explore Plans <ArrowDown size={17}/></button><a className="np-btn np-btn-outline" href="#comparison">Compare All Features <ArrowRight size={16}/></a></div>
      <div className="np-trust-line"><span><ShieldCheck size={16}/> Clear annual pricing</span><span><Clock3 size={16}/> No fabricated monthly rates</span></div>
    </motion.div><motion.div className="np-hero-art" initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1}} transition={{duration:reduceMotion?0:.65,delay:reduceMotion?0:.12}}><div className="np-art-glow"/><DashboardPreview/><div className="np-float-tag np-float-calendar"><CalendarDays size={16}/><span><b>Booking calendar</b><small>Appointments at a glance</small></span></div><div className="np-float-tag np-float-secure"><ShieldCheck size={16}/><span><b>Salon workspace</b><small>Tools in one place</small></span></div></motion.div>
  </div></section>;
}

function BillingToggle({ value, onChange }: { value: BillingInterval; onChange: (value: BillingInterval) => void }) {
  return <div className="np-billing-row"><div><span className="np-section-kicker">CHOOSE YOUR BILLING</span><h2>Plans that fit your next chapter.</h2><p>Clear prices, with annual totals shown up front.</p></div><div className="np-billing-control" role="group" aria-label="Billing period"><button aria-pressed={value==='monthly'} onClick={()=>onChange('monthly')}>Monthly</button><button aria-pressed={value==='annual'} onClick={()=>onChange('annual')}>Annually <span>Annual rate</span></button></div></div>;
}

function PricingCard({ plan, interval, onSelect, isSelecting }: { plan: PricingPlan; interval: BillingInterval; onSelect: (plan: PricingPlan) => void; isSelecting: boolean }) {
  const knownMonthly = interval === 'monthly' && plan.monthlyPrice !== null;
  return <article className={`np-plan-card ${plan.popular?'is-popular':''}`}>
    {plan.popular&&<div className="np-popular"><Sparkles size={13}/> MOST POPULAR</div>}
    <div className="np-plan-top"><span className="np-plan-icon">{plan.id==='premium'?<Crown size={20}/>:plan.id==='grow'?<Sparkles size={20}/>:<Scissors size={20}/>}</span><h3>{plan.name}</h3></div>
    <p className="np-plan-desc">{plan.description}</p><p className="np-plan-position">{plan.positioning}</p>
    <div className="np-price-block">{interval==='annual'?<><div className="np-price"><span>₹</span>{money(plan.annualMonthlyEquivalent)}<small>/mo</small></div><p>Monthly equivalent · billed annually</p><div className="np-annual-total">₹{money(plan.annualTotal)} <span>/ year</span></div></>:knownMonthly?<><div className="np-price"><span>₹</span>{money(plan.monthlyPrice!)}<small>/mo</small></div><p>Billed monthly</p></>:<><div className="np-monthly-pending">Monthly price<br/><strong>Not configured</strong></div><p>We won’t make up a monthly rate.</p></>}
    </div>
    <div className="np-plan-features"><span className="np-plan-includes">Confirmed plan highlights</span>{FEATURE_CATEGORIES.flatMap(category=>category.items).filter(feature=>FEATURE_PLAN_ENTITLEMENTS[feature.id][plan.id]==='included').slice(0,4).map(feature=><span key={feature.id}><Check size={16}/>{feature.label}</span>)}{!FEATURE_CATEGORIES.flatMap(category=>category.items).some(feature=>FEATURE_PLAN_ENTITLEMENTS[feature.id][plan.id]==='included')&&<span className="np-pending-line"><CircleHelp size={16}/> Tier inclusions await confirmation</span>}</div>
    <button className={`np-plan-cta ${plan.popular?'gold':''}`} disabled={isSelecting} onClick={()=>onSelect(plan)}>{isSelecting?'Checking account…':plan.cta}<ArrowRight size={16}/></button><a href="#comparison" className="np-plan-details">View plan details <ArrowDown size={14}/></a>
  </article>;
}

function PricingGrid({ interval, setInterval, onSelect, isSelecting, selectionMessage }: { interval: BillingInterval; setInterval: (value: BillingInterval)=>void; onSelect: (plan: PricingPlan)=>void; isSelecting: boolean; selectionMessage: string }) {
  return <section className="np-section np-plans-section" id="plans"><div className="np-container"><BillingToggle value={interval} onChange={setInterval}/>{selectionMessage&&<p className="np-matrix-note" role="status">{selectionMessage}</p>}<div className="np-plan-grid">{PRICING_PLANS.map(plan=><PricingCard key={plan.id} plan={plan} interval={interval} onSelect={onSelect} isSelecting={isSelecting}/>)}</div><p className="np-tax-note"><ShieldCheck size={15}/> Approved annual prices are GST-inclusive. Monthly subscription rates remain unconfigured. Subscription checkout is not available yet.</p></div></section>;
}

function FeatureMatrix() {
  return <section className="np-section np-matrix-section" id="comparison"><div className="np-container"><div className="np-section-heading"><span className="np-section-kicker">SIDE-BY-SIDE DETAILS</span><h2>Compare all features.</h2><p>Only plan inclusions explicitly confirmed in the approved pricing inputs are checked. Other plan assignments remain under review rather than being inferred from application code.</p></div>
    <div className="np-matrix-note"><CircleHelp size={18}/><span><b>Most tier assignments still need confirmation.</b> Standard explicitly includes WhatsApp API, attendance and advanced salon management. Other feature-by-plan combinations have not been approved.</span></div>
    <div className="np-matrix-wrap" role="region" aria-label="Feature comparison by plan. Scroll horizontally on small screens." tabIndex={0}><table className="np-matrix"><thead><tr><th scope="col">Feature</th>{PRICING_PLANS.map(p=><th scope="col" key={p.id}>{p.name}{p.popular&&<small>POPULAR</small>}</th>)}</tr></thead><tbody>{FEATURE_CATEGORIES.map(category=><FragmentCategory key={category.id} category={category}/>)}</tbody></table></div>
    <div className="np-mobile-scroll-hint"><ArrowRight size={15}/> Swipe to compare plan columns</div>
    <div className="np-legend"><span><Check size={15}/> Confirmed included</span><span><Minus size={15}/> Not included</span><span><CircleHelp size={15}/> Pending plan configuration</span></div>
  </div></section>;
}
function FragmentCategory({category}:{category:typeof FEATURE_CATEGORIES[number]}) { return <>{<tr className="np-category-row"><th colSpan={5} scope="colgroup">{category.label}</th></tr>}{category.items.map(item=><tr key={item.id}><th scope="row"><span title={item.description}>{item.label}<span className="np-feature-help" title={item.description} tabIndex={0} aria-label={item.description}>i</span></span></th>{PRICING_PLANS.map(plan=>{const state=FEATURE_PLAN_ENTITLEMENTS[item.id][plan.id];return <td key={plan.id} aria-label={`${plan.name}: ${state==='review'?'pending plan confirmation':state}`} title={item.description}>{state==='included'?<Check className="matrix-yes" size={18}/>:state==='excluded'?<Minus className="matrix-no" size={17}/>:<span className="matrix-review"><CircleHelp size={15}/><small>Review</small></span>}</td>;})}</tr>)}</>; }

function AddOns() {
  return <section className="np-section np-addons-section" id="addons"><div className="np-container"><div className="np-section-heading"><span className="np-section-kicker">EXTEND YOUR WORKSPACE</span><h2>Grow Your Salon With Powerful Add-ons.</h2><p>Ask us about these options. Availability, plan overlap and prices must be confirmed before purchase.</p></div><div className="np-addon-grid">{PRICING_ADD_ONS.map((addon,index)=>{const Icon=addOnIcons[index];return <article className="np-addon-card" key={addon.id}><span className="np-addon-icon"><Icon size={19}/></span><div><h3>{addon.name}</h3><p>{addon.description}</p><span className="np-addon-price">{addon.includedPlanIds.length?`Included in ${addon.includedPlanIds.map(id=>PRICING_PLANS.find(plan=>plan.id===id)?.name).filter(Boolean).join(', ')} · no separate add-on charge`:addon.price===null?'Contact Nexora for Add-on Pricing':`₹${money(addon.price)}`}</span></div><button type="button" onClick={()=>document.getElementById('pricing-addon-note')?.scrollIntoView({behavior:'smooth',block:'center'})}>Learn More <ArrowUpRight size={14}/></button></article>;})}</div><p className="np-addon-note" id="pricing-addon-note"><ShieldCheck size={16}/> Add-ons cannot be purchased from this page. Pricing and duplicate-feature checks are not configured.</p></div></section>;
}

function Benefits() {
  return <section className="np-section np-benefits"><div className="np-container np-benefits-grid"><div className="np-benefit-intro"><span className="np-section-kicker">MADE FOR EVERYDAY SALON WORK</span><h2>Why Salons Choose Nexora SalonOS.</h2><p>Bring supported salon workflows into a connected workspace, with tools designed around the way salons work.</p><a href="/#features">Explore platform features <ArrowRight size={16}/></a></div><div className="np-benefit-list">{benefits.map(([title,description,Icon])=><article key={title}><span><Icon size={19}/></span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div></div></section>;
}

function FAQ() {
  const [open,setOpen]=useState<number|null>(0);
  const reduceMotion=useReducedMotion();
  return <section className="np-section np-faq" id="faq"><div className="np-container np-faq-grid"><div className="np-faq-intro"><span className="np-section-kicker">GOOD TO KNOW</span><h2>Frequently Asked Questions.</h2><p>Answers are limited to the product and commercial settings currently confirmed.</p><a href="#plans">Back to plans <ArrowUpRight size={15}/></a></div><div className="np-faq-list">{PRICING_FAQS.map(([question,answer],i)=><div className={`np-faq-item ${open===i?'open':''}`} key={question}><h3><button type="button" aria-expanded={open===i} aria-controls={`np-faq-${i}`} onClick={()=>setOpen(open===i?null:i)}>{question}<span>{open===i?<Minus size={17}/>:<Plus size={17}/>}</span></button></h3><AnimatePresence initial={false}>{open===i&&<motion.div id={`np-faq-${i}`} className="np-faq-answer" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:reduceMotion?0:.2}}><p>{answer}</p></motion.div>}</AnimatePresence></div>)}</div></div></section>;
}

function FinalCTA({onSelect}:{onSelect:()=>void}) {
  return <section className="np-final"><div className="np-final-orb"/><div className="np-container np-final-inner"><span className="np-section-kicker">YOUR NEXT STEP</span><h2>Ready to Take Your Salon Business Forward?</h2><p>Start managing your salon more professionally with Nexora SalonOS.</p><div><button className="np-btn np-btn-gold" onClick={onSelect}>Choose Your Plan <ArrowRight size={17}/></button><button className="np-btn np-final-contact" onClick={()=>document.getElementById('pricing-contact-note')?.scrollIntoView({behavior:'smooth',block:'center'})}>Talk to Our Team <MessageCircle size={17}/></button></div></div></section>;
}

function PricingFooter() {
  const groups = [
    ['PRODUCT',[['Features','/#features'],['Pricing','/pricing'],['Online Booking','/#features'],['Mini Website','/#features'],['Salon Management','/#features'],['POS & Billing','/#features']]],
    ['BUSINESS',[['Salon Owners','/login?auth=signup'],['Customer App','/?app=1'],['Growth Partners','/#how-it-works'],['Help & Support',null]]],
    ['COMPANY',[['About Nexora','/#how-it-works'],['Contact',null],['Privacy Policy',null],['Terms & Conditions',null]]],
  ] as const;
  return <footer className="np-footer"><div className="np-container"><div className="np-footer-main"><div className="np-footer-brand"><a href="/" className="np-brand"><NexoraBrandMark size="md"/><span><b>NEXORA</b><small>SALONOS</small></span></a><p>A connected digital platform built to simplify salon bookings, billing, customer management, staff operations and business workflows.</p><p className="np-contact-disclosure" id="pricing-contact-note">Nexora has not configured a verified sales contact destination for this pricing experience. Please use the support channel already provided to your account.</p><a href="/login?auth=signup" className="np-footer-action">Create your workspace <ArrowRight size={15}/></a></div>{groups.map(([title,links])=><nav key={title} aria-label={`${title} links`} className="np-footer-links"><h3>{title}</h3>{links.map(([label,href])=>href?<a key={label} href={href}>{label}</a>:<span key={label} aria-label={`${label} destination not configured`}>{label} <small>(not configured)</small></span>)}</nav>)}<div className="np-footer-links"><h3>SOCIAL</h3><p>Official social destinations are not configured.</p><span className="np-social-note">Follow links will appear here when verified.</span></div></div><div className="np-footer-bottom"><span>© {new Date().getFullYear()} Nexora SalonOS. All rights reserved.</span><span>Built for salon businesses in India</span></div></div></footer>;
}

function SelectionDialog({plan,interval,onClose}:{plan:PricingPlan|null;interval:BillingInterval;onClose:()=>void}) {
  const closeRef=useRef<HTMLButtonElement>(null);
  const reduceMotion=useReducedMotion();
  useEffect(()=>{if(!plan)return;closeRef.current?.focus();const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};window.addEventListener('keydown',onKeyDown);return()=>window.removeEventListener('keydown',onKeyDown);},[plan,onClose]);
  return <AnimatePresence>{plan&&<motion.div className="np-dialog-backdrop" role="presentation" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduceMotion?0:.18}} onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}><motion.section className="np-dialog" role="dialog" aria-modal="true" aria-labelledby="np-dialog-title" initial={{y:18,opacity:0}} animate={{y:0,opacity:1}} exit={{y:12,opacity:0}} transition={{duration:reduceMotion?0:.18}}><button ref={closeRef} className="np-dialog-close" aria-label="Close plan summary" onClick={onClose}><X size={20}/></button><span className="np-section-kicker">PLAN SELECTION</span><h2 id="np-dialog-title">{plan.name} plan summary</h2><div className="np-summary-row"><span>{interval==='annual'?'Annual subscription':'Monthly subscription'}</span><b>{interval==='annual'?`₹${money(plan.annualTotal)} / year`:'Monthly price not configured'}</b></div>{interval==='annual'&&<p className="np-summary-detail">Equivalent to ₹{money(plan.annualMonthlyEquivalent)} per month, billed annually. Annual total includes GST.</p>}<div className="np-setup-alert" id="pricing-setup-note"><CircleHelp size={19}/><p><b>Subscription checkout is not configured.</b><br/>Nexora subscription payments are not configured. The existing Razorpay integration is for salon booking deposits and is not used here. This selection will not charge you or activate a plan. Ask the Nexora team through the support channel already provided to your account.</p></div><button className="np-dialog-done" onClick={onClose}>Got it</button></motion.section></motion.div>}</AnimatePresence>;
}

export function PricingPage() {
  const [interval,setInterval]=useState<BillingInterval>('annual');
  const [selected,setSelected]=useState<PricingPlan|null>(null);
  const [isSelecting,setIsSelecting]=useState(false);
  const [selectionMessage,setSelectionMessage]=useState('');
  const shouldReduceMotion=useReducedMotion();
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const stored=readPendingPricingSelection();
    const planId=params.get('resume_plan');
    const resolvedPlanId=isPricingPlanId(planId)?planId:stored?.planId;
    if(!resolvedPlanId)return;
    const requestedInterval=params.get('billing_interval')||stored?.billingInterval;
    const resolvedInterval=isBillingInterval(requestedInterval)?requestedInterval:'annual';
    setInterval(resolvedInterval);
    setSelected(PRICING_PLANS.find(plan=>plan.id===resolvedPlanId)||null);
    clearPendingPricingSelection();
    if(params.has('resume_plan')){
      params.delete('resume_plan');params.delete('billing_interval');
      const clean=`${window.location.pathname}${params.size?`?${params}`:''}${window.location.hash}`;
      window.history.replaceState(window.history.state,'',clean);
    }
  },[]);
  const faqSchema=useMemo(()=>({
    '@context':'https://schema.org','@type':'FAQPage',mainEntity:PRICING_FAQS.map(([name,text])=>({'@type':'Question',name,acceptedAnswer:{'@type':'Answer',text}})),
  }),[]);
  // Keep the route's public metadata and visible FAQ structured data in sync.
  useEffect(()=>{
    if(typeof document==='undefined')return;
    document.title='Nexora SalonOS Pricing | Salon Management Software Plans in India';
    const setMeta=(name:string,content:string,property=false)=>{let node=document.head.querySelector<HTMLMetaElement>(`meta[${property?'property':'name'}="${name}"]`);if(!node){node=document.createElement('meta');node.setAttribute(property?'property':'name',name);document.head.appendChild(node);}node.content=content;};
    const description='Explore Nexora SalonOS pricing plans for salon bookings, POS billing, CRM, staff management, WhatsApp integration and salon business management.';
    setMeta('description',description);setMeta('og:type','website',true);setMeta('og:site_name','Nexora SalonOS',true);setMeta('og:title','Nexora SalonOS Pricing | Salon Management Software Plans in India',true);setMeta('og:description',description,true);setMeta('og:url',`${NEXORA_PUBLIC_ORIGIN}/pricing`,true);setMeta('og:image',`${NEXORA_PUBLIC_ORIGIN}/nexora-homepage-og.jpg`,true);setMeta('twitter:card','summary_large_image');setMeta('twitter:title','Nexora SalonOS Pricing | Salon Management Software Plans in India');setMeta('twitter:description',description);setMeta('twitter:image',`${NEXORA_PUBLIC_ORIGIN}/nexora-homepage-og.jpg`);
    let canonical=document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}canonical.href=`${NEXORA_PUBLIC_ORIGIN}/pricing`;
    let script=document.getElementById('nexora-pricing-faq-jsonld') as HTMLScriptElement|null;if(!script){script=document.createElement('script');script.id='nexora-pricing-faq-jsonld';script.type='application/ld+json';document.head.appendChild(script);}script.textContent=JSON.stringify(faqSchema);
  },[faqSchema]);
  const selectPlan=async(plan:PricingPlan)=>{
    setSelectionMessage('');setIsSelecting(true);
    const selection={planId:plan.id,billingInterval:interval,savedAt:Date.now()};
    try{
      const {data,error}=await supabase.auth.getSession();
      if(error)throw error;
      if(!data.session){
        savePendingPricingSelection(selection);
        window.location.assign(pricingAuthPath(selection));
        return;
      }
      setSelected(plan);
    }catch(error){setSelectionMessage(error instanceof Error?error.message:'Could not check your sign-in status. Retry before continuing.');}
    finally{setIsSelecting(false);}
  };
  return <main className={`nexora-pricing ${shouldReduceMotion?'reduce-motion':''}`}><a className="np-skip" href="#plans">Skip to pricing plans</a><PriceHeader/><Hero onExplore={()=>document.getElementById('plans')?.scrollIntoView({behavior:shouldReduceMotion?'auto':'smooth'})}/><PricingGrid interval={interval} setInterval={setInterval} onSelect={selectPlan} isSelecting={isSelecting} selectionMessage={selectionMessage}/><FeatureMatrix/><AddOns/><Benefits/><FAQ/><FinalCTA onSelect={()=>void selectPlan(PRICING_PLANS[1])}/><PricingFooter/><SelectionDialog plan={selected} interval={interval} onClose={()=>setSelected(null)}/></main>;
}
