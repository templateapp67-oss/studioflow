import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, ExternalLink, Eye, EyeOff, ShieldCheck, Store, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NexoraEcosystemSeoHead } from './NexoraEcosystemSeoHead';
import './nexoraPartnerRewards.css';

type Cycle = { id:string; cycleCode:string; name:string; city:string; timezone:string; registrationOpensAt:string; registrationClosesAt:string; startDate:string; endDate:string; durationDays:number; status:string; registrationOpen:boolean; phase:string };
type Entry = { id:string; competitionId:string; salonName:string; status:string; registeredAt:string; verificationNote?:string|null; publicProfileVisible?:boolean; profileVisibility?:Record<string,boolean> };
type Competitor = { entryId:string; awardRank?:number|null; salonName:string; competitionId:string; salonNumber:number; area:string; category:string; currentRank:number; score:number; successfulTransactions:number; gatewayCollectionsPaise:number; gatewayCollectionsRupees:number; uniquePayingCustomers:number; verifiedReviews:number; averageRating:number; rewardEligibility:Record<string,boolean> };
type PublicSalon = { salonName:string; competitionId:string; area?:string; category?:string; description?:string; logoUrl?:string; coverImageUrl?:string; websiteUrl?:string };
type RewardFulfilment = { rewardKey:string; status:string; partnerNote?:string|null; fulfilmentReference?:string|null; estimatedCompletionDate?:string|null; completedAt?:string|null };
type AdminRewardFulfilment = { id:string; entryId:string; salonName:string; competitionId:string; rewardKey:string; status:string; adminNote?:string|null; partnerNote?:string|null; fulfilmentReference?:string|null; estimatedCompletionDate?:string|null };
const REWARDS = [
 {key:'coBrandedTshirts',title:'Co-branded T-shirts',target:50,amount:'₹50,000',amountPaise:5000000,customers:30,reviews:10,rating:'4.3★',ratingTarget:4.3,image:'/nexora-jaipur-awards/co-branded-tshirts.svg'},
 {key:'ledSignBoard',title:'LED Sign Boards',target:150,amount:'₹2,00,000',amountPaise:20000000,customers:100,reviews:25,rating:'4.5★',ratingTarget:4.5,image:'/nexora-jaipur-awards/led-sign-board.svg'},
 {key:'promotionalAdvertising',title:'Promotional Advertising',target:300,amount:'₹5,00,000',amountPaise:50000000,customers:200,reviews:50,rating:'4.5★',ratingTarget:4.5,image:'/nexora-jaipur-awards/promotional-advertising.svg'},
 {key:'achievementTrophy',title:'Achievement Trophies',target:500,amount:'₹8,00,000',amountPaise:80000000,customers:300,reviews:75,rating:'4.6★',ratingTarget:4.6,image:'/nexora-jaipur-awards/achievement-trophy.svg'},
];
const DEFAULT_VISIBILITY = {showCategory:true,showArea:true,showDescription:true,showLogo:true,showCover:true,showWebsite:true};
function obj<T>(value:unknown,fallback:T):T { return value && typeof value==='object' ? value as T : fallback; }
function dateLabel(value?:string) { if(!value)return 'Not announced'; const date=new Date(value.length===10 ? value+'T00:00:00+05:30' : value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(date); }
function money(paise:number) { return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format((paise||0)/100); }
function plusDays(value:string,days:number) { if(!value)return ''; const date=new Date(value+'T00:00:00Z'); date.setUTCDate(date.getUTCDate()+days); return date.toISOString().slice(0,10); }
function cycleCode(value:string) { if(!value)return ''; const parts=value.split('-').map(Number); return String(parts[0])+'Q'+Math.ceil(parts[1]/3); }
function istDateTime(value:string) { return value ? (value.length===16?value+':00':value)+'+05:30' : ''; }
function dateTimeLocal(value:string) { const stamp=new Date(value).getTime(); return Number.isNaN(stamp)?'':new Date(stamp+330*60*1000).toISOString().slice(0,19); }

export function NexoraPartnerRewardsPage() {
 const [cycle,setCycle]=useState<Cycle|null>(null);
 const [user,setUser]=useState<any>(null);
 const [entry,setEntry]=useState<Entry|null>(null);
 const [directory,setDirectory]=useState<PublicSalon[]>([]);
 const [competitors,setCompetitors]=useState<Competitor[]>([]);
 const [myRewardFulfilments,setMyRewardFulfilments]=useState<RewardFulfilment[]>([]);
 const [adminRewardFulfilments,setAdminRewardFulfilments]=useState<AdminRewardFulfilment[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [now,setNow]=useState(Date.now());
 const [member,setMember]=useState(false);
 const [admin,setAdmin]=useState(false);
 const [adminCycles,setAdminCycles]=useState<Cycle[]>([]);
 const [applications,setApplications]=useState<any[]>([]);
 const [adminCycleCode,setAdminCycleCode]=useState('');
 const [adminOpen,setAdminOpen]=useState(false);
 const [form,setForm]=useState({salonName:'',area:'',fullAddress:'',category:'Unisex Salon',description:'',publicProfileVisible:false,visibility:{...DEFAULT_VISIBILITY},terms:false});
 const [cycleForm,setCycleForm]=useState({code:'2027Q1',name:'NEXORA Top Salon Jaipur Awards',opens:'2026-12-01T00:00:00',closes:'2026-12-31T23:59:59',start:'2027-01-01',status:'registration_open'});

 const refresh=useCallback(async()=>{
  setLoading(true); setError('');
  try {
   const sessionResult=await supabase.auth.getSession();
   const cycleResult=await supabase.rpc('nexora_competition_get_current_cycle');
   if(cycleResult.error)throw cycleResult.error;
   const activeUser=sessionResult.data.session?.user||null;
   setUser(activeUser);
   const next=cycleResult.data ? obj<Cycle>(cycleResult.data,null as any) : null;
   setCycle(next);
   if(!next?.cycleCode){setDirectory([]);setEntry(null);setCompetitors([]);setMember(false);}
   else {
    const directoryResult=await supabase.rpc('nexora_competition_public_directory',{p_cycle_code:next.cycleCode});
    if(directoryResult.error)throw directoryResult.error;
    setDirectory(Array.isArray(directoryResult.data)?directoryResult.data as PublicSalon[]:[]);
    let own:Entry|null=null;
    if(activeUser){
      const ownResult=await supabase.rpc('nexora_competition_get_my_entry',{p_cycle_code:next.cycleCode});
      own=ownResult.data ? obj<Entry>(ownResult.data,null as any) : null;
    }
    setEntry(own);
    if(own){setForm(old=>({...old,publicProfileVisible:Boolean(own?.publicProfileVisible),visibility:{...DEFAULT_VISIBILITY,...(own?.profileVisibility||{})}}));}
    if(activeUser && own?.status==='approved'){
      const reportResult=await supabase.rpc('nexora_competition_member_leaderboard',{p_cycle_code:next.cycleCode});
      if(!reportResult.error && reportResult.data){
       const report=obj<{competitors?:Competitor[];isMember?:boolean}>(reportResult.data,{});
       setCompetitors(Array.isArray(report.competitors)?report.competitors:[]);
       setMember(Boolean(report.isMember));
      }else{setCompetitors([]);setMember(false);}
      const rewardResult=await supabase.rpc('nexora_competition_member_reward_fulfilments',{p_cycle_code:next.cycleCode});
      if(!rewardResult.error && Array.isArray(rewardResult.data))setMyRewardFulfilments(rewardResult.data as RewardFulfilment[]);
      else setMyRewardFulfilments([]);
    }else{setCompetitors([]);setMember(false);setMyRewardFulfilments([]);}
   }
   if(activeUser){
    const adminResult=await supabase.rpc('nexora_competition_admin_list_cycles');
    if(Array.isArray(adminResult.data)){
     setAdmin(true); setAdminCycles(adminResult.data as Cycle[]);
     if(!adminCycleCode && adminResult.data[0]?.cycleCode)setAdminCycleCode(adminResult.data[0].cycleCode);
    }else{setAdmin(false);setAdminCycles([]);}
   }else{setAdmin(false);setAdminCycles([]);}
  }catch(cause:any){setError(cause?.message||'NEXORA competition data could not be loaded.');}
  finally{setLoading(false);}
 },[adminCycleCode]);

 const loadApplications=useCallback(async(code:string)=>{
  if(!admin||!code)return;
  const result=await supabase.rpc('nexora_competition_admin_list_entries',{p_cycle_code:code});
  if(result.error){setError(result.error.message);return;}
  const data=obj<{applications?:any[]}>(result.data,{});
  setApplications(Array.isArray(data.applications)?data.applications:[]);
  const rewardsResult=await supabase.rpc('nexora_competition_admin_list_reward_fulfilments',{p_cycle_code:code});
  if(rewardsResult.error){setError(rewardsResult.error.message);return;}
  setAdminRewardFulfilments(Array.isArray(rewardsResult.data)?rewardsResult.data as AdminRewardFulfilment[]:[]);
 },[admin]);

 useEffect(()=>{void refresh();},[refresh]);
 useEffect(()=>{const id=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(id);},[]);
 useEffect(()=>{if(admin&&adminCycleCode)void loadApplications(adminCycleCode);},[admin,adminCycleCode,loadApplications]);

 const countdown=useMemo(()=>{
  if(!cycle)return null;
  const opens=new Date(cycle.registrationOpensAt).getTime();
  const closes=new Date(cycle.registrationClosesAt).getTime();
  const start=new Date(cycle.startDate+'T00:00:00+05:30').getTime();
  const end=new Date(plusDays(cycle.endDate,1)+'T00:00:00+05:30').getTime();
  let target=end;
  let label='Competition ends in';
  if(now<opens){target=opens;label='Registration opens in';}
  else if(now<start){target=start;label='Competition starts in';}
  const ms=Math.max(0,target-now);
  return {days:Math.floor(ms/86400000),hours:Math.floor(ms%86400000/3600000),minutes:Math.floor(ms%3600000/60000),seconds:Math.floor(ms%60000/1000),label};
 },[cycle,now]);

 const register=async(event:FormEvent)=>{
  event.preventDefault(); setError('');setMessage('');
  if(!user){window.location.assign('/login?auth=signup');return;}
  if(!cycle?.registrationOpen){setError('NEXORA registration is currently closed.');return;}
  if(!form.terms){setError('Accept the competition rules and competitor report-card sharing conditions.');return;}
  setSaving(true);
  try{
   const result=await supabase.rpc('nexora_competition_register',{
    p_cycle_code:cycle.cycleCode,p_salon_name:form.salonName,p_city:'Jaipur',p_area:form.area,
    p_full_address:form.fullAddress,p_category:form.category,p_description:form.description,p_profile_visibility:form.visibility,
    p_public_profile_visible:form.publicProfileVisible,p_show_logo:form.visibility.showLogo,
    p_show_cover:form.visibility.showCover,p_show_website:form.visibility.showWebsite,
   });
   if(result.error)throw result.error;
   const data=obj<{competitionId?:string}>(result.data,{});
   setMessage('Application submitted. Competition ID: '+(data.competitionId||'assigned after submission')+'. NEXORA verification is pending.');
   await refresh();
  }catch(cause:any){setError(cause?.message||'Competition registration could not be submitted.');}
  finally{setSaving(false);}
 };

 const saveCycle=async(event:FormEvent)=>{
  event.preventDefault();setError('');setMessage('');
  const result=await supabase.rpc('nexora_competition_admin_save_cycle',{
   p_cycle_code:cycleForm.code,p_name:cycleForm.name,p_registration_opens_at:istDateTime(cycleForm.opens),
   p_registration_closes_at:istDateTime(cycleForm.closes),p_start_date:cycleForm.start,
   p_end_date:plusDays(cycleForm.start,89),p_status:cycleForm.status,
  });
  if(result.error)setError(result.error.message);
  else{setMessage('Official dates saved for '+cycleForm.code+'. The competition lasts exactly 90 calendar days.');await refresh();}
 };

 const review=async(id:string,status:'approved'|'rejected')=>{
  const note=window.prompt(status==='approved'?'Verification note (optional):':'Reason for rejection:')||'';
  const result=await supabase.rpc('nexora_competition_admin_review_entry',{p_entry_id:id,p_status:status,p_note:note});
  if(result.error)setError(result.error.message);
  else{setMessage('Application '+status+'.');await loadApplications(adminCycleCode);}
 };
 const updateRewardFulfilment=async(claim:AdminRewardFulfilment,status:string)=>{
  const adminNote=window.prompt('Internal NEXORA fulfilment note:',claim.adminNote||'')||'';
  const partnerNote=window.prompt('Message visible to the salon owner:',claim.partnerNote||'')||'';
  const reference=window.prompt('Dispatch / installation / campaign reference (optional):',claim.fulfilmentReference||'')||'';
  const eta=window.prompt('Estimated completion date (YYYY-MM-DD, optional):',claim.estimatedCompletionDate||'')||'';
  const result=await supabase.rpc('nexora_competition_admin_update_reward_fulfilment',{
   p_entry_id:claim.entryId,p_reward_key:claim.rewardKey,p_status:status,
   p_admin_note:adminNote,p_partner_note:partnerNote,p_fulfilment_reference:reference,
   p_estimated_completion_date:eta||null,
  });
  if(result.error)setError(result.error.message);
  else{setMessage(claim.rewardKey+' fulfilment updated to '+status+'.');await loadApplications(adminCycleCode);}
 };
 const finalize=async()=>{
  if(!window.confirm('Finalize '+adminCycleCode+' and lock the official Top 3?'))return;
  const result=await supabase.rpc('nexora_competition_admin_finalize_cycle',{p_cycle_code:adminCycleCode});
  if(result.error)setError(result.error.message);
  else{setMessage('Final Top 3 results locked for '+adminCycleCode+'.');await refresh();}
 };
 const saveVisibility=async()=>{
  if(!cycle)return;
  const result=await supabase.rpc('nexora_competition_update_visibility',{p_cycle_code:cycle.cycleCode,p_public_profile_visible:form.publicProfileVisible,p_profile_visibility:form.visibility});
  if(result.error)setError(result.error.message);
  else{setMessage('Salon profile visibility settings updated. Competitor name, ID, position, score and report remain visible to approved members.');await refresh();}
 };

 const ownCard=competitors.find(item=>item.competitionId===entry?.competitionId);
 const shownCycles=adminCycles.length?adminCycles:(cycle?[cycle]:[]);

 return <div className="npa-page">
  <NexoraEcosystemSeoHead path="/partner-rewards"/>
  <header className="npa-header"><a href="/" className="npa-brand"><span className="npa-brand-mark">N</span><span><strong>NEXORA</strong><small>PARTNER REWARDS & RECOGNITION</small></span></a><nav><a href="/">Home</a><a href="/growth-partner-rewards">Growth Partner Rewards</a><a href="/login">Owner Login</a></nav></header>
  <main>
   <section className="npa-hero"><div className="npa-hero-copy"><span className="npa-kicker">NEXORA SALON OS · PARTNER PROGRAMME</span><h1>Your Growth Deserves <em>Recognition.</em></h1><p>Earn co-branded rewards, put your salon in the spotlight and compete for the NEXORA Top Salon Jaipur Awards.</p><div className="npa-hero-actions"><a className="npa-button npa-button-gold" href="#npa-registration">Apply for Top Salon Jaipur Awards <ArrowRight size={17}/></a><a className="npa-button npa-button-outline" href="#npa-rewards">Explore rewards</a></div><div className="npa-hero-proof"><span><ShieldCheck size={16}/> Verified NEXORA participants</span><span><CalendarDays size={16}/> One fixed 90-day cycle</span></div></div><div className="npa-hero-art"><img src="/nexora-jaipur-awards/top-salon-jaipur-awards.svg" alt="NEXORA Top Salon Jaipur Awards poster"/></div></section>

   <section className="npa-section" aria-labelledby="npa-cycle-title"><div className="npa-section-heading"><span className="npa-kicker">ONE CITY · ONE SHARED START DATE</span><h2 id="npa-cycle-title">The NEXORA 90-Day Competition</h2><p>NEXORA sets one registration window and one fixed start and finish date. All approved salons compete over the same 90 calendar days.</p></div>
    {loading?<div className="npa-empty">Loading competition schedule…</div>:cycle?<div className="npa-cycle-card"><div className="npa-cycle-dates"><div><small>Registration closes</small><strong>{dateLabel(cycle.registrationClosesAt)}</strong></div><div><small>Competition starts</small><strong>{dateLabel(cycle.startDate)}</strong></div><div><small>Competition ends</small><strong>{dateLabel(cycle.endDate)}</strong></div></div>{cycle.phase==='completed'?<div className="npa-countdown"><div><CheckCircle2 size={19}/><span>Competition completed — final report cards are locked.</span></div><span className="npa-cycle-status">Final results</span></div>:<div className="npa-countdown"><div><Clock3 size={19}/><span>{countdown?.label}</span></div><div className="npa-countdown-units"><strong>{countdown?.days}<small>Days</small></strong><strong>{countdown?.hours}<small>Hours</small></strong><strong>{countdown?.minutes}<small>Minutes</small></strong><strong>{countdown?.seconds}<small>Seconds</small></strong></div><span className="npa-cycle-status">{cycle.phase.replace('_',' ')}</span></div>}<p className="npa-cycle-note">All dates use India Standard Time. Countdown follows NEXORA's configured dates, never the individual registration date.</p></div>:<div className="npa-empty"><CalendarDays size={30}/><strong>The next NEXORA competition dates will be announced here.</strong><p>NEXORA Admin will publish the registration deadline, shared start date and fixed 90-day end date before entries open.</p><span>No live dates have been configured yet.</span></div>}
   </section>

   <section id="npa-rewards" className="npa-section"><div className="npa-section-heading"><span className="npa-kicker">BEYOND THE MILESTONES</span><h2>Rewards for Real Salon Growth</h2><p>Every target in a reward's column must be achieved inside the same fixed 90-day cycle.</p></div><div className="npa-reward-grid">
    {REWARDS.map((reward,index)=><article className="npa-reward-card" key={reward.key}><div className="npa-reward-image"><img src={reward.image} alt={'NEXORA branded '+reward.title} loading="lazy"/></div><div className="npa-reward-copy"><span className="npa-step">REWARD 0{index+1}</span><h3>{reward.title}</h3><strong className="npa-target">{reward.target} successful payments</strong><ul><li><b>{reward.amount}</b> verified gateway collections</li><li><b>{reward.customers}</b> unique paying customers</li><li><b>{reward.reviews}</b> verified reviews</li><li><b>{reward.rating}</b> minimum average rating</li></ul><p>All conditions are mandatory. Failed, refunded or unverified activity does not count.</p></div></article>)}
   </div><p className="npa-note"><b>Payment value note:</b> Current NEXORA checkout records captured advance payments. The rupee value is verified NEXORA gateway collections, not full salon turnover or unpaid invoices. Product quantities, LED installation and advertising scope remain subject to final commercial approval.</p></section>

   <section className="npa-section npa-top-awards"><div className="npa-top-art"><img src="/nexora-jaipur-awards/top-salon-jaipur-awards.svg" alt="NEXORA Top Salon Jaipur Awards"/></div><div className="npa-top-copy"><span className="npa-kicker">QUARTERLY SPECIAL RECOGNITION</span><h2>NEXORA Top Salon Jaipur Awards</h2><p>Only salons that submit the official form and pass NEXORA verification become competitors. Every approved member receives a report card with salon name, unique Competition ID, score and position.</p><div className="npa-award-list"><div><img src="/nexora-jaipur-awards/top-gold-growth-champion-featured-advertising.svg" alt="NEXORA Gold Growth Champion trophy"/><span><b>#1 Growth Champion</b><small>Gold Trophy + Featured Advertising by NEXORA</small></span></div><div><img src="/nexora-jaipur-awards/top-silver-recognition-partner-spotlight.svg" alt="NEXORA Silver Partner Spotlight trophy"/><span><b>#2 Partner Spotlight</b><small>Silver Recognition Trophy + Partner Spotlight</small></span></div><div><img src="/nexora-jaipur-awards/top-bronze-recognition-trophy-digital-certificate.svg" alt="NEXORA Bronze Recognition certificate"/><span><b>#3 Bronze Recognition</b><small>Recognition Trophy + Digital Certificate</small></span></div></div></div></section>

   <section className="npa-section"><div className="npa-section-heading"><span className="npa-kicker">OPT-IN SALON DISCOVERY</span><h2>Meet Jaipur's Participating Salons</h2><p>Only approved competitors who opt into public salon-profile visibility appear here. All approved members still appear in the member-only report-card list.</p></div>{directory.length?<div className="npa-salon-grid">{directory.map(salon=><article className="npa-salon-card" key={salon.competitionId}>{salon.coverImageUrl?<img className="npa-salon-cover" src={salon.coverImageUrl} alt="" loading="lazy"/>:<div className="npa-salon-cover npa-salon-cover-placeholder">NEXORA VERIFIED SALON</div>}<div className="npa-salon-content"><div className="npa-salon-heading">{salon.logoUrl?<img className="npa-salon-logo" src={salon.logoUrl} alt="" loading="lazy"/>:<span className="npa-salon-logo npa-salon-logo-placeholder"><Store size={22}/></span>}<div><h3>{salon.salonName}</h3><small>{salon.area||'Jaipur'}{salon.category?' · '+salon.category:''}</small></div></div>{salon.description&&<p>{salon.description}</p>}<small className="npa-id">{salon.competitionId}</small>{salon.websiteUrl&&<a className="npa-text-link" href={salon.websiteUrl} target="_blank" rel="noreferrer">View salon website <ExternalLink size={14}/></a>}</div></article>)}</div>:<div className="npa-empty"><Store size={28}/><strong>No public salon profiles yet.</strong><p>Approved competitors can opt in to list their salon here. Each owner controls the public salon profile details.</p></div>}</section>

   <section className="npa-section npa-member-area"><div className="npa-section-heading"><span className="npa-kicker">COMPETITOR-ONLY REPORT CARDS</span><h2>Know Your Competition</h2><p>All approved competitors see each salon's name, Competition ID, current position, score and verified performance metrics. Non-participating salons are never included.</p></div>
    {!user?<div className="npa-empty"><Users size={28}/><strong>Sign in as an approved competitor to view report cards.</strong><a className="npa-text-link" href="/login">Sign in to NEXORA →</a></div>:!entry?<div className="npa-empty"><ShieldCheck size={28}/><strong>Register for this competition to access competitor reports.</strong><a className="npa-button npa-button-gold" href="#npa-registration">Apply for the competition</a></div>:entry.status==='pending'?<div className="npa-empty"><Clock3 size={28}/><strong>Your application is under NEXORA verification.</strong><p>Competition ID: {entry.competitionId}. Report cards unlock after approval.</p></div>:entry.status!=='approved'?<div className="npa-empty"><EyeOff size={28}/><strong>Your application needs attention.</strong><p>{entry.verificationNote||'Please contact NEXORA support.'}</p></div>:member?<div className="npa-competitor-list"><div className="npa-member-summary"><b>{competitors.length} approved competitors</b><span>Your ID: {entry.competitionId}</span></div>{ownCard&&<div className="npa-my-progress"><div className="npa-my-progress-heading"><div><span className="npa-kicker">YOUR VERIFIED PERFORMANCE</span><h3>My 90-Day Reward Progress</h3></div><span className="npa-my-rank">Current position: #{ownCard.currentRank}</span></div><p>Every target below is measured inside this shared competition cycle. A reward is earned only when all five conditions are complete.</p><div className="npa-progress-tiers">{REWARDS.map(reward=>{const metrics=[{label:'Successful payments',current:ownCard.successfulTransactions,target:reward.target,format:(v:number)=>String(v)},{label:'Gateway collections',current:ownCard.gatewayCollectionsPaise,target:reward.amountPaise,format:(v:number)=>money(v)},{label:'Unique customers',current:ownCard.uniquePayingCustomers,target:reward.customers,format:(v:number)=>String(v)},{label:'Verified reviews',current:ownCard.verifiedReviews,target:reward.reviews,format:(v:number)=>String(v)},{label:'Average rating',current:Number(ownCard.averageRating),target:reward.ratingTarget,format:(v:number)=>v.toFixed(1)+'★'}];const complete=Boolean(ownCard.rewardEligibility&&ownCard.rewardEligibility[reward.key]);return <article className="npa-progress-tier" key={reward.key}><div className="npa-progress-tier-title"><b>{reward.title}</b><span className={complete?'is-complete':'is-progress'}>{complete?'Target reached':'In progress'}</span></div>{(()=>{const fulfilment=myRewardFulfilments.find(item=>item.rewardKey===reward.key);return fulfilment?<div className="npa-fulfilment-status"><b>Reward fulfilment: {fulfilment.status.replaceAll('_',' ')}</b>{fulfilment.partnerNote&&<small>{fulfilment.partnerNote}</small>}{fulfilment.estimatedCompletionDate&&<small>Estimated completion: {dateLabel(fulfilment.estimatedCompletionDate)}</small>}{fulfilment.fulfilmentReference&&<small>Reference: {fulfilment.fulfilmentReference}</small>}</div>:null;})()}{metrics.map(metric=><div className="npa-progress-row" key={metric.label}><div><span>{metric.label}</span><b>{metric.format(metric.current)} / {metric.format(metric.target)}</b></div><div className="npa-progress-track"><i style={{width:Math.min(100,metric.current/metric.target*100)+'%'}}/></div><small>{metric.current>=metric.target?'Target completed':'Remaining: '+metric.format(Math.max(0,metric.target-metric.current))}</small></div>)}</article>;})}</div></div>}{competitors.map(item=><article className={'npa-competitor-card '+(item.competitionId===entry.competitionId?'is-own':'')} key={item.entryId}><div className="npa-rank">#{item.currentRank}</div><div className="npa-competitor-main"><div className="npa-competitor-top"><h3>{item.salonName}</h3><strong>{Number(item.score).toFixed(2)} / 100</strong></div>{item.awardRank&&<span className="npa-status-chip status-approved">NEXORA Award Winner · #{item.awardRank}</span>}<small>{item.competitionId} · {item.area}</small><div className="npa-competitor-metrics"><span><b>{item.successfulTransactions}</b> Payments</span><span><b>{money(item.gatewayCollectionsPaise)}</b> Gateway collections</span><span><b>{item.uniquePayingCustomers}</b> Customers</span><span><b>{item.verifiedReviews}</b> Reviews</span><span><b>{Number(item.averageRating).toFixed(1)}★</b> Rating</span></div></div></article>)}</div>:<div className="npa-empty">Member report cards are available to approved competitors only.</div>}
   </section>

   <section id="npa-registration" className="npa-section npa-registration-section"><div className="npa-section-heading"><span className="npa-kicker">OFFICIAL ENTRY FORM</span><h2>Apply for NEXORA Top Salon Jaipur Awards</h2><p>One official application gives your salon a Competition ID and enters it for the shared fixed 90-day competition, subject to verification.</p></div>
    {!user?<div className="npa-empty"><strong>Salon owners must sign in before submitting an official entry.</strong><a className="npa-button npa-button-gold" href="/login?auth=signup">Sign in / Create account</a></div>:entry?<div className="npa-entry-status"><span className="npa-kicker">YOUR COMPETITION REGISTRATION</span><strong>{entry.competitionId}</strong><span className={'npa-status-chip status-'+entry.status}>{entry.status}</span><p>Submitted {dateLabel(entry.registeredAt)}. Your 90-day countdown uses NEXORA's fixed competition dates, not your registration date.</p>{entry.verificationNote&&<p>{entry.verificationNote}</p>}{entry.status==='approved'&&<div className="npa-visibility-box"><div><b>Manage my public salon profile</b><label className="npa-checkbox"><input type="checkbox" checked={form.publicProfileVisible} onChange={e=>setForm({...form,publicProfileVisible:e.target.checked})}/> Show my salon profile in the public NEXORA directory</label></div><p>This does not hide your salon name, Competition ID, rank, score or performance report from approved competitors.</p><div className="npa-visibility-options">{Object.entries({showCategory:'Show category',showArea:'Show area',showDescription:'Show description',showLogo:'Show logo',showCover:'Show cover image',showWebsite:'Show published website link'}).map(([key,label])=><label className="npa-checkbox" key={key}><input type="checkbox" checked={Boolean(form.visibility[key as keyof typeof DEFAULT_VISIBILITY])} onChange={e=>setForm({...form,visibility:{...form.visibility,[key]:e.target.checked}})}/>{label}</label>)}</div><button type="button" className="npa-button npa-button-gold" onClick={()=>void saveVisibility()}>Save profile visibility settings</button></div>}</div>:<form className="npa-form" onSubmit={register}><div className="npa-form-grid"><label>Salon name<input required minLength={2} maxLength={120} value={form.salonName} onChange={e=>setForm({...form,salonName:e.target.value})} placeholder="Enter salon name"/></label><label>City<input value="Jaipur" readOnly/></label><label>Area / locality<input required minLength={2} maxLength={100} value={form.area} onChange={e=>setForm({...form,area:e.target.value})} placeholder="e.g. Vaishali Nagar"/></label><label className="npa-full">Complete salon address<input required minLength={5} maxLength={300} value={form.fullAddress} onChange={e=>setForm({...form,fullAddress:e.target.value})} placeholder="Shop number, street, landmark, Jaipur"/></label><label>Salon category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>Unisex Salon</option><option>Haircut Studio</option><option>Barber Shop</option><option>Beauty Parlour</option><option>Nail Studio</option><option>Makeup Studio</option><option>Hair Spa</option><option>Skin & Aesthetic Clinic</option><option>Other</option></select></label><label className="npa-full">Short salon introduction<textarea maxLength={1000} rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Tell customers about your salon"/></label></div>
     <div className="npa-visibility-box"><div><b>Public salon profile</b><label className="npa-checkbox"><input type="checkbox" checked={form.publicProfileVisible} onChange={e=>setForm({...form,publicProfileVisible:e.target.checked})}/> List my salon in the public NEXORA Jaipur directory</label></div><p>Other approved competitors always see each competitor's name, ID, rank, score and report metrics. These options control only the public salon profile.</p><div className="npa-visibility-options">{Object.entries({showCategory:'Show category',showArea:'Show area',showDescription:'Show description',showLogo:'Show logo',showCover:'Show cover image',showWebsite:'Show published salon website'}).map(([key,label])=><label className="npa-checkbox" key={key}><input type="checkbox" checked={Boolean(form.visibility[key as keyof typeof DEFAULT_VISIBILITY])} onChange={e=>setForm({...form,visibility:{...form.visibility,[key]:e.target.checked}})}/>{label}</label>)}</div></div>
     <label className="npa-checkbox npa-required"><input type="checkbox" required checked={form.terms} onChange={e=>setForm({...form,terms:e.target.checked})}/> I accept the competition rules and agree that all approved competitors can view my salon name, Competition ID, rank, score and verified performance report card.</label>
     <button className="npa-button npa-button-gold" type="submit" disabled={saving||!cycle?.registrationOpen}>{saving?'Submitting…':'Submit official competition application'} <ArrowRight size={17}/></button>{!cycle?.registrationOpen&&<small>Registration is closed or the NEXORA admin has not opened the current cycle.</small>}
    </form>}
    {message&&<p className="npa-success" role="status">{message}</p>}{error&&<p className="npa-error" role="alert">{error}</p>}
   </section>

   <section className="npa-section npa-rules"><div className="npa-section-heading"><span className="npa-kicker">FAIR COMPETITION</span><h2>What Counts in the Report Card?</h2></div><div className="npa-rules-grid"><article><CheckCircle2 size={22}/><h3>Counted</h3><p>Captured NEXORA gateway payments linked to completed appointments during the exact 90-day window, unique paying customers and genuine reviews from completed visits.</p></article><article><ShieldCheck size={22}/><h3>Not counted</h3><p>Failed, cancelled, refunded or chargeback payments; duplicate customer accounts; unverified reviews; and activity outside the competition dates.</p></article></div><p className="npa-note">Every approved member's report shows salon name, Competition ID, current position, score, transactions, gateway collections, customers, verified reviews and rating. Owner visibility controls apply only to the public salon profile.</p></section>

   {admin && (
    <section className="npa-section npa-admin" aria-labelledby="npa-admin-heading">
      <button
        type="button"
        className="npa-admin-toggle"
        aria-expanded={adminOpen}
        onClick={() => setAdminOpen((open) => !open)}
      >
        <span>NEXORA Admin — Competition Management</span>
        <span>{adminOpen ? 'Hide' : 'Open'}</span>
      </button>

      {adminOpen && (
        <div className="npa-admin-body">
          <h2 id="npa-admin-heading">Set the fixed 90-day schedule</h2>
          <form className="npa-form" onSubmit={saveCycle}>
            <div className="npa-form-grid">
              <label>
                Cycle code
                <input required value={cycleForm.code} onChange={(event) => setCycleForm((old) => ({ ...old, code: event.target.value.toUpperCase() }))} />
              </label>
              <label>
                Competition name
                <input required value={cycleForm.name} onChange={(event) => setCycleForm((old) => ({ ...old, name: event.target.value }))} />
              </label>
              <label>
                Registration opens (IST)
                <input type="datetime-local" step="1" required value={cycleForm.opens} onChange={(event) => setCycleForm((old) => ({ ...old, opens: event.target.value }))} />
              </label>
              <label>
                Registration closes (IST)
                <input type="datetime-local" step="1" required value={cycleForm.closes} onChange={(event) => setCycleForm((old) => ({ ...old, closes: event.target.value }))} />
              </label>
              <label>
                Competition start date
                <input type="date" required value={cycleForm.start} onChange={(event) => setCycleForm((old) => ({ ...old, start: event.target.value, code: cycleCode(event.target.value) }))} />
              </label>
              <label>
                End date (automatically +89 days)
                <input type="date" readOnly value={plusDays(cycleForm.start, 89)} />
              </label>
              <label>
                Initial status
                <select value={cycleForm.status} onChange={(event) => setCycleForm((old) => ({ ...old, status: event.target.value }))}>
                  <option value="draft">Draft</option>
                  <option value="registration_open">Open registration</option>
                </select>
              </label>
            </div>
            <button type="submit" className="npa-button npa-button-gold">Save official dates</button>
          </form>

          <div className="npa-admin-cycle-list">
            <h3>Configured cycles</h3>
            {shownCycles.map((item) => (
              <button
                key={item.cycleCode}
                type="button"
                className={adminCycleCode === item.cycleCode ? 'is-selected' : ''}
                onClick={() => {
                  setAdminCycleCode(item.cycleCode);
                  setCycleForm({
                    code: item.cycleCode,
                    name: item.name,
                    opens: dateTimeLocal(item.registrationOpensAt),
                    closes: dateTimeLocal(item.registrationClosesAt),
                    start: item.startDate,
                    status: item.status === 'registration_open' ? 'registration_open' : 'draft',
                  });
                }}
              >
                {item.cycleCode} · {dateLabel(item.startDate)} – {dateLabel(item.endDate)} · {item.status}
              </button>
            ))}
          </div>

          {adminCycleCode && (
            <>
              <div className="npa-admin-applications">
                <div className="npa-admin-app-heading">
                  <h3>Applications — {adminCycleCode}</h3>
                  <button type="button" onClick={() => void loadApplications(adminCycleCode)}>Refresh applications</button>
                  <button type="button" onClick={finalize}>Finalize Top 3 results</button>
                </div>
                {applications.length ? applications.map((application) => (
                  <div className="npa-application-row" key={application.entryId}>
                    <span>
                      <b>{application.salonName}</b>
                      <small>{application.competitionId} · {application.area}</small>
                      <small>Owner: {application.ownerName || '—'} · {application.ownerPhone || application.ownerEmail || 'Contact unavailable'}</small>
                      <small>Address: {application.businessAddress || 'Not supplied'}</small>
                    </span>
                    <span className={'npa-status-chip status-' + application.status}>{application.status}</span>
                    {application.status === 'pending' && (
                      <div>
                        <button type="button" onClick={() => void review(application.entryId, 'approved')}>Approve</button>
                        <button type="button" onClick={() => void review(application.entryId, 'rejected')}>Reject</button>
                      </div>
                    )}
                  </div>
                )) : <p>No applications in this cycle.</p>}
              </div>

              <div className="npa-admin-applications">
                <div className="npa-admin-app-heading">
                  <h3>Reward fulfilment and delivery</h3>
                  <button type="button" onClick={() => void loadApplications(adminCycleCode)}>Refresh eligible rewards</button>
                </div>
                {adminRewardFulfilments.length ? adminRewardFulfilments.map((claim) => (
                  <div className="npa-application-row npa-fulfilment-row" key={claim.id}>
                    <span>
                      <b>{claim.salonName} · {claim.rewardKey}</b>
                      <small>{claim.competitionId}</small>
                      <small>{claim.partnerNote || 'No partner update yet'}</small>
                      <small>{claim.fulfilmentReference || 'No delivery/campaign reference yet'}</small>
                    </span>
                    <span className={'npa-status-chip status-' + (claim.status === 'completed' ? 'approved' : claim.status === 'rejected' ? 'rejected' : 'pending')}>
                      {claim.status.replaceAll('_', ' ')}
                    </span>
                    <select
                      aria-label={'Update ' + claim.salonName + ' ' + claim.rewardKey + ' fulfilment'}
                      value={claim.status}
                      onChange={(event) => void updateRewardFulfilment(claim, event.target.value)}
                    >
                      {['eligible', 'under_verification', 'approved', 'preparing', 'scheduled', 'dispatched', 'completed', 'not_eligible', 'rejected'].map((status) => (
                        <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                )) : <p>No reward claims are eligible yet. Refreshing checks each approved competitor against current targets.</p>}
              </div>
            </>
          )}
        </div>
      )}
    </section>
   )}
  </main>
  <footer className="npa-footer"><div><strong>NEXORA</strong><span>PARTNER REWARDS & RECOGNITION</span></div><p>Real salon growth. Verified competition. Recognition by NEXORA.</p><nav><a href="/">Home</a><a href="/growth-partner-rewards">Growth Partner Rewards</a><a href="/login">Owner Workspace</a></nav></footer>
 </div>;
}
