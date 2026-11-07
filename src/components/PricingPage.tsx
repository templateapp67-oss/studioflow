import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { DemoProvider } from './nexora-pricing/DemoProvider';
import { PriceHeader } from './nexora-pricing/sections/PriceHeader';
import { Hero } from './nexora-pricing/sections/Hero';
import { PricingGrid } from './nexora-pricing/sections/PricingGrid';
import { FeatureMatrix } from './nexora-pricing/sections/FeatureMatrix';
import { AddOns } from './nexora-pricing/sections/AddOns';
import { Benefits } from './nexora-pricing/sections/Benefits';
import { DemoSection } from './nexora-pricing/sections/DemoSection';
import { FAQ } from './nexora-pricing/sections/FAQ';
import { FinalCTA } from './nexora-pricing/sections/FinalCTA';
import { PricingFooter } from './nexora-pricing/sections/PricingFooter';
import { SelectionDialog } from './nexora-pricing/sections/SelectionDialog';
import { clearPendingPricingSelection, PRICING_FAQS, PRICING_PLANS, pricingAuthPath, readPendingPricingSelection, savePendingPricingSelection, isBillingInterval, isPricingPlanId, type BillingInterval, type PricingPlan } from '../lib/nexoraPricing';
import { NEXORA_PUBLIC_ORIGIN } from '../lib/publicSeo';
import './pricingPage.css';


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
  return <DemoProvider><main className={`nexora-pricing ${shouldReduceMotion?'reduce-motion':''}`}><a className="np-skip" href="#plans">Skip to pricing plans</a><PriceHeader/><Hero onExplore={()=>document.getElementById('plans')?.scrollIntoView({behavior:shouldReduceMotion?'auto':'smooth'})}/><PricingGrid interval={interval} setInterval={setInterval} onSelect={selectPlan} isSelecting={isSelecting} selectionMessage={selectionMessage}/><FeatureMatrix/><AddOns/><Benefits/><DemoSection/><FAQ/><FinalCTA onSelect={()=>void selectPlan(PRICING_PLANS[1])}/><PricingFooter/><SelectionDialog plan={selected} interval={interval} onClose={()=>setSelected(null)}/></main></DemoProvider>;
}
