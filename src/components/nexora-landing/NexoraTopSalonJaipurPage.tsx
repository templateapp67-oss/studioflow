import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ExternalLink, LockKeyhole, RefreshCw, ShieldCheck, Store } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Cycle = { id:string; code:string; name:string; city:string; status:string; registrationOpenDate:string; registrationCloseDate:string; startDate:string; endDate:string; durationDays:number; registrationOpen:boolean; registeredCount:number };
type Salon = { id:string; name:string; city:string; area?:string|null; business_type?:string; logo_url?:string|null; cover_image_url?:string|null; description?:string|null; address?:string|null };
type Entry = { entryId:string; cycleId:string; salonId:string; competitionId:string; status:string; registeredAt:string; reviewNote?:string|null; report?:{transactions:number;gatewayRevenuePaise:number;uniqueCustomers:number;verifiedReviews:number;averageRating:number;score:number;awardEligible:boolean} };
type Competitor = { competitionId:string;salonName:string;position:number;score:number;transactions:number;gatewayRevenuePaise:number;uniqueCustomers:number;verifiedReviews:number;averageRating:number;awardEligible:boolean };
type DirectoryItem = { competitionId:string;salonName:string;businessType?:string|null;description?:string|null;logoUrl?:string|null;coverImageUrl?:string|null;area?:string|null;address?:string|null;contact?:string|null;websiteUrl?:string|null;services?:Array<{name:string;description?:string;price?:number;durationMinutes?:number}>;gallery?:Array<{url:string;title?:string;alt?:string}> };
type AdminCycle = Cycle & {approvedCount?:number};
type Application = {entryId:string;competitionId:string;status:string;registeredAt:string;salon:{name:string;city:string;area?:string;category?:string;logoUrl?:string};ownerId:string};

const rupees=(paise:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format((Number(paise)||0)/100);
const dateLabel=(value?:string)=>value?new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'}).format(new Date(value+'T00:00:00+05:30')):'NEXORA will announce';
const daysBetween=(from:string,to:string)=>Math.max(0,Math.ceil((new Date(to+'T00:00:00+05:30').getTime()-new Date(from+'T00:00:00+05:30').getTime())/86400000));

const rewards=[
 {image:'/nexora-top-salon/co-branded-tshirts.svg',title:'Co-branded T-shirts',tx:'50 payments',revenue:'₹50,000 gateway collection',customers:'30 customers',reviews:'10 verified reviews',rating:'4.3★',note:'Two NEXORA + salon branded staff T-shirts.'},
 {image:'/nexora-top-salon/led-sign-board.svg',title:'LED Sign Boards',tx:'150 payments',revenue:'₹2,00,000 gateway collection',customers:'100 customers',reviews:'25 verified reviews',rating:'4.5★',note:'Co-branded illuminated salon sign board.'},
 {image:'/nexora-top-salon/promotional-advertising.svg',title:'Promotional Advertising',tx:'300 payments',revenue:'₹5,00,000 gateway collection',customers:'200 customers',reviews:'50 verified reviews',rating:'4.5★',note:'NEXORA local awareness and promotional support.'},
 {image:'/nexora-top-salon/achievement-trophy.svg',title:'Achievement Trophy',tx:'500 payments',revenue:'₹8,00,000 gateway collection',customers:'300 customers',reviews:'75 verified reviews',rating:'4.6★',note:'Personalised NEXORA trophy and certificate.'}
];

function Badge({children,tone='slate'}:{children:React.ReactNode;tone?:'slate'|'green'|'gold'|'red'}) {
 const styles={slate:'bg-slate-100 text-slate-700',green:'bg-emerald-100 text-emerald-800',gold:'bg-amber-100 text-amber-900',red:'bg-rose-100 text-rose-800'};
 return <span className={'inline-flex rounded-full px-3 py-1 text-xs font-bold '+styles[tone]}>{children}</span>;
}
function Panel({title,intro,children}:{title:string;intro?:string;children:React.ReactNode}) {
 return <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="mb-6 max-w-3xl"><h2 className="text-2xl font-black tracking-tight text-[#23172E] sm:text-3xl">{title}</h2>{intro?<p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">{intro}</p>:null}</div>{children}</section>;
}
function Metric({label,value,hint}:{label:string;value:string;hint?:string}) {
 return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-black tabular-nums text-[#281C36]">{value}</p>{hint?<p className="mt-1 text-xs text-slate-500">{hint}</p>:null}</div>;
}

export function NexoraTopSalonJaipurPage() {
 const [sessionUser,setSessionUser]=useState<any>(null);
 const [cycles,setCycles]=useState<Cycle[]>([]);
 const [cycleId,setCycleId]=useState('');
 const [salons,setSalons]=useState<Salon[]>([]);
 const [entries,setEntries]=useState<Entry[]>([]);
 const [directory,setDirectory]=useState<DirectoryItem[]>([]);
 const [competitors,setCompetitors]=useState<Competitor[]>([]);
 const [adminMode,setAdminMode]=useState(false);
 const [adminCycles,setAdminCycles]=useState<AdminCycle[]>([]);
 const [applications,setApplications]=useState<Application[]>([]);
 const [selectedSalonId,setSelectedSalonId]=useState('');
 const [performanceConsent,setPerformanceConsent]=useState(false);
 const [rulesAccepted,setRulesAccepted]=useState(false);
 const [publicDirectory,setPublicDirectory]=useState(false);
 const [competitorProfile,setCompetitorProfile]=useState(false);
 const [visibility,setVisibility]=useState({showLogo:true,showCover:true,showDescription:true,showArea:true,showAddress:false,showServices:true,showGallery:true,showWebsite:true,showContact:false});
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const [adminCode,setAdminCode]=useState('2027Q1');
 const [adminRegOpen,setAdminRegOpen]=useState('2026-11-15');
 const [adminRegClose,setAdminRegClose]=useState('2026-12-31');
 const [adminStart,setAdminStart]=useState('2027-01-01');
 const [pendingCycleId,setPendingCycleId]=useState('');

 const currentCycle=useMemo(()=>cycles.find(c=>c.id===cycleId)||cycles[0]||null,[cycles,cycleId]);
 const myEntry=useMemo(()=>entries.find(e=>e.cycleId===currentCycle?.id)||null,[entries,currentCycle?.id]);
 const myCompetitor=useMemo(()=>competitors.find(c=>c.competitionId===myEntry?.competitionId)||null,[competitors,myEntry?.competitionId]);
 const endDate=useMemo(()=>{
  if(!adminStart)return '';
  const d=new Date(adminStart+'T00:00:00+05:30');d.setDate(d.getDate()+89);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 },[adminStart]);

 const loadPage=useCallback(async(quiet=false)=>{
  if(!quiet)setLoading(true);
  const cycleResult=await supabase.rpc('top_salon_competition_cycles');
  if(cycleResult.error){setError('Competition schedule could not load. Apply the competition database migration before launch.');setLoading(false);return;}
  const rows=Array.isArray(cycleResult.data)?cycleResult.data as Cycle[]:[];
  setCycles(rows);
  const chosen=rows.find(c=>c.id===cycleId)||rows.find(c=>c.status!=='completed'&&c.status!=='cancelled')||rows[0]||null;
  if(chosen){
   setCycleId(chosen.id);
   const dir=await supabase.rpc('top_salon_competition_public_directory',{p_cycle_id:chosen.id});
   setDirectory(!dir.error&&Array.isArray(dir.data)?dir.data as DirectoryItem[]:[]);
   if(sessionUser?.id){
    const mine=await supabase.rpc('top_salon_competition_my_entries');
    const mineRows=!mine.error&&Array.isArray(mine.data)?mine.data as Entry[]:[];
    setEntries(mineRows);
    const approved=mineRows.some(e=>e.cycleId===chosen.id&&e.status==='approved');
    if(approved){
     const report=await supabase.rpc('top_salon_competition_competitors',{p_cycle_id:chosen.id});
     setCompetitors(!report.error&&Array.isArray(report.data)?report.data as Competitor[]:[]);
    }else setCompetitors([]);
    const owned=await supabase.from('salons').select('id,name,city,area,business_type,logo_url,cover_image_url,description,address').eq('is_active',true).is('deleted_at',null).ilike('city','%jaipur%').order('name');
    setSalons(!owned.error&&Array.isArray(owned.data)?owned.data as Salon[]:[]);
    const admin=await supabase.rpc('top_salon_competition_admin',{p_action:'list_cycles',p_data:{}});
    setAdminMode(!admin.error);
    if(!admin.error&&Array.isArray(admin.data)){
     setAdminCycles(admin.data as AdminCycle[]);
     setPendingCycleId(chosen.id);
     const apps=await supabase.rpc('top_salon_competition_admin',{p_action:'applications',p_data:{cycleId:chosen.id}});
     setApplications(!apps.error&&Array.isArray(apps.data)?apps.data as Application[]:[]);
    }else{setAdminCycles([]);setApplications([]);}
   }else{setEntries([]);setCompetitors([]);setSalons([]);setAdminMode(false);}
  }else{setDirectory([]);setCompetitors([]);setEntries([]);}
  setLoading(false);
 },[cycleId,sessionUser?.id]);

 useEffect(()=>{
  let active=true;
  void supabase.auth.getSession().then(({data})=>{if(active)setSessionUser(data.session?.user||null);});
  const {data:authListener}=supabase.auth.onAuthStateChange((_event,session)=>{if(active)setSessionUser(session?.user||null);});
  return()=>{active=false;authListener.subscription.unsubscribe();};
 },[]);
 useEffect(()=>{void loadPage();},[loadPage]);
 useEffect(()=>{const timer=window.setInterval(()=>{if(!document.hidden)void loadPage(true);},60000);return()=>window.clearInterval(timer);},[loadPage]);

 const chosenSalon=salons.find(s=>s.id===selectedSalonId);
 const refreshButton=async()=>{setNotice('');setError('');await loadPage(true);};

 const register=async(event:React.FormEvent)=>{
  event.preventDefault();
  if(!currentCycle||!selectedSalonId){setError('Select your Jaipur salon first.');return;}
  if(!performanceConsent||!rulesAccepted){setError('Performance report sharing and competition rules are required.');return;}
  setBusy(true);setError('');setNotice('');
  const result=await supabase.rpc('top_salon_competition_register',{
   p_cycle_id:currentCycle.id,p_salon_id:selectedSalonId,
   p_performance_consent:performanceConsent,p_rules_accepted:rulesAccepted,
   p_public_directory:publicDirectory,p_competitor_profile:competitorProfile,p_profile_visibility:visibility
  });
  if(result.error)setError(result.error.message||'Competition application could not be submitted.');
  else setNotice('Application submitted. Your Competition ID is '+(result.data?.competitionId||'being assigned')+'. NEXORA verification is pending.');
  setBusy(false);await loadPage(true);
 };

 const runAdmin=async(action:string,data:Record<string,any>)=>{
  setBusy(true);setError('');setNotice('');
  const result=await supabase.rpc('top_salon_competition_admin',{p_action:action,p_data:data});
  if(result.error)setError(result.error.message||'NEXORA admin action failed.');
  else setNotice('NEXORA competition settings updated.');
  setBusy(false);await loadPage(true);
 };
 const approve=(entryId:string,approved:boolean)=>runAdmin(approved?'approve_entry':'reject_entry',{entryId,reason:''});

 return <div className="min-h-screen bg-[#FBF9FC] text-[#22172E]">
  <header className="border-b border-[#E8DEEA] bg-white/95"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8"><a href="/" className="font-black tracking-[.2em] text-[#2D1F40]">NEXORA <span className="text-xs tracking-normal text-[#8D4770]">SALON OS</span></a><div className="flex items-center gap-2"><a href="/growth-partner-rewards" className="hidden text-sm font-bold text-slate-600 hover:text-[#8A2059] sm:inline">Growth Partner Rewards</a><a href="/login" className="rounded-xl bg-[#2D1F40] px-4 py-2.5 text-sm font-bold text-white">Owner Login</a></div></div></header>

  <section className="relative overflow-hidden bg-[#1D1429] text-white"><div className="absolute inset-0 opacity-25"><img src="/nexora-top-salon/competition-hero.svg" alt="" className="h-full w-full object-cover"/></div><div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-8"><div><Badge tone="gold">NEXORA OFFICIAL JAIPUR COMPETITION</Badge><p className="mt-5 text-xs font-black uppercase tracking-[.28em] text-[#F4C978]">Grow · Compete · Get Recognised</p><h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.08] sm:text-5xl lg:text-6xl">NEXORA Top Salon Jaipur Awards</h1><p className="mt-5 max-w-2xl text-base leading-7 text-white/80">Jaipur salons grow together in one official 90-day competition. Register your salon, track verified performance and compete for NEXORA recognition.</p><div className="mt-7 flex flex-wrap gap-3"><a href="#register" className="rounded-xl bg-[#E4B85F] px-5 py-3 font-extrabold text-[#21172B]">Register Your Salon <ArrowRight className="ml-1 inline" size={16}/></a><a href="#participants" className="rounded-xl border border-white/35 px-5 py-3 font-bold text-white">View Participating Salons</a></div></div>
   <div className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur">{currentCycle?<><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-widest text-[#F4D491]">{currentCycle.code}</span><Badge tone={currentCycle.status==='active'?'green':'gold'}>{currentCycle.status.replaceAll('_',' ')}</Badge></div><h2 className="mt-3 text-2xl font-black">90-Day Competition</h2><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-black/15 p-3"><p className="text-xs text-white/65">Competition starts</p><p className="mt-1 font-bold">{dateLabel(currentCycle.startDate)}</p></div><div className="rounded-2xl bg-black/15 p-3"><p className="text-xs text-white/65">Competition ends</p><p className="mt-1 font-bold">{dateLabel(currentCycle.endDate)}</p></div><div className="rounded-2xl bg-black/15 p-3"><p className="text-xs text-white/65">Register before</p><p className="mt-1 font-bold">{dateLabel(currentCycle.registrationCloseDate)}</p></div><div className="rounded-2xl bg-black/15 p-3"><p className="text-xs text-white/65">Registered salons</p><p className="mt-1 text-2xl font-black">{currentCycle.registeredCount}</p></div></div><p className="mt-4 text-sm text-white/75">{currentCycle.status==='active'?daysBetween(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}),currentCycle.endDate)+' days remain in the competition.':currentCycle.registrationOpen?'Registration is open. All approved salons will start together on the fixed date.':'NEXORA will open registration during the admin-set registration window.'}</p></>:<><h2 className="text-2xl font-black">Next Competition Cycle</h2><p className="mt-2 text-sm text-white/70">NEXORA will publish the registration window and fixed 90-day dates here.</p></>}</div></div></section>

  <Panel title="Beyond the Milestones" intro="Earn NEXORA-branded rewards by completing every target in the same 90-day cycle. Only captured NEXORA gateway collections for completed salon visits count."><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{rewards.map(reward=><article key={reward.title} className="overflow-hidden rounded-3xl border border-[#E6DDEB] bg-white shadow-sm"><div className="h-44 bg-[#251832]"><img src={reward.image} alt={reward.title+' — NEXORA branded reward'} className="h-full w-full object-contain p-3"/></div><div className="p-5"><h3 className="text-lg font-extrabold">{reward.title}</h3><p className="mt-2 text-sm text-slate-600">{reward.note}</p><div className="mt-4 space-y-1.5 text-xs font-semibold text-slate-700"><p>{reward.tx}</p><p>{reward.revenue}</p><p>{reward.customers}</p><p>{reward.reviews}</p><p>Minimum rating: {reward.rating}</p></div></div></article>)}</div><p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">Gateway revenue means captured online advance payments recorded by NEXORA, not the full salon bill or cash/direct-UPI collection. A reward is eligible only when every target is complete. Promotional support is subject to NEXORA approval; no fixed cash value is promised.</p></Panel>

  <Panel title="Apply for NEXORA Top Salon Jaipur Awards" intro="Only the salon owner can register an active Jaipur salon. NEXORA creates your Competition ID. Performance report sharing is required to enter.">
   {!sessionUser?<div id="register" className="rounded-3xl border border-[#E8DEEA] bg-white p-6"><p className="font-bold">Sign in with the salon owner account to register.</p><p className="mt-2 text-sm text-slate-600">After login, return to this competition page to submit the official application.</p><a href="/login" className="mt-4 inline-flex rounded-xl bg-[#8B245B] px-5 py-3 text-sm font-bold text-white">Sign in to register <ArrowRight className="ml-2" size={16}/></a></div>:
    myEntry?<div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><Badge tone={myEntry.status==='approved'?'green':'gold'}>{myEntry.status}</Badge><h3 className="mt-3 text-xl font-black">{myEntry.competitionId}</h3><p className="mt-1 text-sm text-slate-600">Your NEXORA Competition ID for this cycle.</p></div><div className="rounded-2xl bg-[#F5F0F8] p-4 text-center"><p className="text-xs text-slate-500">Current position</p><p className="text-3xl font-black">{myCompetitor?'#'+myCompetitor.position:'—'}</p></div></div>{myEntry.status==='pending'?<p className="mt-4 text-sm text-amber-800">NEXORA is verifying your salon and owner details. Your competitor report card becomes visible after approval.</p>:myCompetitor?<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Payments" value={String(myCompetitor.transactions)}/><Metric label="Gateway collected" value={rupees(myCompetitor.gatewayRevenuePaise)}/><Metric label="Unique customers" value={String(myCompetitor.uniqueCustomers)}/><Metric label="Verified reviews" value={String(myCompetitor.verifiedReviews)}/><Metric label="Average rating" value={myCompetitor.averageRating.toFixed(2)+' ★'}/></div>:<p className="mt-4 text-sm text-slate-600">Your report card appears when the NEXORA competition begins.</p>}</div>:
    currentCycle?.registrationOpen?<form id="register" onSubmit={register} className="grid gap-5 rounded-3xl border border-[#E8DEEA] bg-white p-6 shadow-sm lg:grid-cols-[.9fr_1.1fr]">
      <div><label className="mb-2 block text-sm font-bold" htmlFor="competition-salon">Select your Jaipur salon</label><select id="competition-salon" value={selectedSalonId} onChange={event=>setSelectedSalonId(event.target.value)} required className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="">Select salon</option>{salons.map(salon=><option key={salon.id} value={salon.id}>{salon.name} · {salon.area||salon.city}</option>)}</select>{chosenSalon?<div className="mt-4 rounded-2xl bg-[#F8F5FA] p-4"><p className="font-bold">{chosenSalon.name}</p><p className="mt-1 text-xs text-slate-500">{chosenSalon.area||chosenSalon.city}, Jaipur</p></div>:null}<p className="mt-4 text-xs leading-5 text-slate-500">One salon per owner can enter each cycle because current payment records are linked to owner accounts, not separate branches.</p></div>
      <div className="space-y-4"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-amber-950"><input type="checkbox" checked={performanceConsent} onChange={event=>setPerformanceConsent(event.target.checked)} className="mt-1"/>I agree that my Competition ID, salon name, rank, score and full competition metrics will be visible to all approved competitors.</label></div>
       <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700"><input type="checkbox" checked={rulesAccepted} onChange={event=>setRulesAccepted(event.target.checked)} className="mt-1"/>I accept the 90-day competition rules, fixed dates, NEXORA verification and final award review.</label>
       <div className="rounded-2xl border border-slate-200 p-4"><p className="font-bold">Choose your salon profile visibility</p><label className="mt-3 flex items-start gap-3 text-sm"><input type="checkbox" checked={publicDirectory} onChange={event=>setPublicDirectory(event.target.checked)} className="mt-1"/>Show my salon profile in the public NEXORA Jaipur Salon Directory.</label><label className="mt-3 flex items-start gap-3 text-sm"><input type="checkbox" checked={competitorProfile} onChange={event=>setCompetitorProfile(event.target.checked)} className="mt-1"/>Show my salon profile details to other competition members.</label><div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(visibility).map(([key,value])=><label key={key} className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={value} onChange={event=>setVisibility(prev=>({...prev,[key]:event.target.checked}))}/>{key.replace(/^show/,'').replace(/([A-Z])/g,' $1').trim()}</label>)}</div><p className="mt-2 text-xs text-slate-500">These settings control extra profile information only. Mandatory competitor report cards still show name, Competition ID, rank, score and agreed performance metrics.</p></div>
       <button disabled={busy||!selectedSalonId||!performanceConsent||!rulesAccepted} className="w-full rounded-xl bg-[#8B245B] px-5 py-3.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy?'Submitting…':'Submit Competition Application'}</button>
      </div>
     </form>:<div id="register" className="rounded-3xl border border-slate-200 bg-white p-6"><Badge>Registration closed</Badge><p className="mt-3 text-sm text-slate-600">NEXORA will announce the next registration window. The 90-day countdown starts on the common competition date.</p></div>}
  </Panel>

  <Panel title="Registered participating salons" intro="Only NEXORA-approved registered competitors with public profile visibility enabled appear in this public directory.">
   <div id="participants" className="mb-5 flex items-center justify-between gap-3"><p className="text-sm font-bold">{directory.length} public salon profiles available</p><button onClick={()=>void refreshButton()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"><RefreshCw size={14}/> Refresh</button></div>
   {loading?<p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Loading NEXORA competitors…</p>:directory.length?<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{directory.map(item=><article key={item.competitionId} className="overflow-hidden rounded-3xl border border-[#E6DDEB] bg-white shadow-sm"><div className="relative h-48 bg-[#24172F]">{item.coverImageUrl?<img src={item.coverImageUrl} alt={item.salonName+' salon'} className="h-full w-full object-cover"/>:<img src="/nexora-top-salon/competition-hero.svg" alt="NEXORA Top Salon Jaipur Awards" className="h-full w-full object-cover opacity-70/>}<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white"><Badge tone="green">NEXORA APPROVED COMPETITOR</Badge><h3 className="mt-2 text-xl font-black">{item.salonName}</h3><p className="text-xs text-white/75">{item.area||'Jaipur'}</p></div></div><div className="p-5"><p className="text-xs font-bold text-[#8B245B]">{item.competitionId}</p>{item.description?<p className="mt-2 line-clamp-3 text-sm text-slate-600">{item.description}</p>:null}{item.services?.length?<div className="mt-3"><p className="text-xs font-bold uppercase text-slate-500">Featured services</p><div className="mt-2 flex flex-wrap gap-2">{item.services.slice(0,4).map(service=><span key={service.name} className="rounded-full bg-[#F4EEF7] px-2.5 py-1 text-xs font-semibold">{service.name}{service.price?' · ₹'+Number(service.price).toLocaleString('en-IN'):''}</span>)}</div></div>:null}{item.gallery?.length?<div className="mt-3 grid grid-cols-3 gap-2">{item.gallery.slice(0,3).map(photo=><img key={photo.url} src={photo.url} alt={photo.alt||photo.title||item.salonName} className="h-20 w-full rounded-lg object-cover"/>)}</div>:null}{item.websiteUrl?<a href={item.websiteUrl.startsWith('http')?item.websiteUrl:window.location.origin+item.websiteUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#8B245B]">View Salon Website <ExternalLink size={14}/></a>:null}</div></article>)}</div>:<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Store className="mx-auto text-slate-400" size={28}/><p className="mt-3 font-bold">No public salon profiles yet</p><p className="mt-1 text-sm text-slate-500">Approved competitors appear here after their owner enables public directory visibility.</p></div>}
  </Panel>

  <Panel title="Competition leaderboard & report cards" intro="Every approved competitor has a mandatory report card with salon name, Competition ID, rank and score. Full metrics are visible to approved competitors.">
   {!sessionUser?<div className="rounded-2xl bg-white p-6 text-sm text-slate-600"><LockKeyhole className="mb-2" size={20}/>Sign in as an approved competitor to view all report cards.</div>:!myEntry||myEntry.status!=='approved'?<div className="rounded-2xl bg-white p-6 text-sm text-slate-600">Only approved competition members can access all report cards. Your registration status is {myEntry?.status||'not registered'}.</div>:competitors.length?<div className="space-y-4">{competitors.map(item=><article key={item.competitionId} className={'rounded-3xl border bg-white p-5 shadow-sm '+(item.competitionId===myEntry.competitionId?'border-[#8B245B] ring-2 ring-[#8B245B]/10':'border-slate-200')}><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Badge tone={item.position===1?'gold':'slate'}>Rank #{item.position}</Badge>{item.awardEligible?<Badge tone="green">T-shirt tier eligible</Badge>:null}</div><h3 className="mt-3 text-xl font-black">{item.salonName}</h3><p className="mt-1 text-xs font-semibold tracking-wide text-[#8B245B]">{item.competitionId}</p></div><div className="rounded-2xl bg-[#F6F0F8] px-5 py-3 text-center"><p className="text-xs text-slate-500">Score</p><p className="text-3xl font-black tabular-nums">{Number(item.score||0).toFixed(2)}</p><p className="text-[10px] text-slate-500">out of 100</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Gateway payments" value={String(item.transactions)}/><Metric label="Gateway collected" value={rupees(item.gatewayRevenuePaise)} hint="Captured online advance only"/><Metric label="Unique customers" value={String(item.uniqueCustomers)}/><Metric label="Verified reviews" value={String(item.verifiedReviews)}/><Metric label="Average rating" value={Number(item.averageRating).toFixed(2)+' ★'}/></div></article>)}</div>:<p className="rounded-2xl bg-white p-6 text-sm text-slate-600">No approved competitors are listed for this cycle yet.</p>}
  </Panel>

  <Panel title="NEXORA Top Jaipur Award Winners" intro="Final award positions are locked by NEXORA after the 90-day cycle closes and all qualifying records are verified.">
   <div className="grid gap-4 md:grid-cols-3">{[{rank:'01',title:'NEXORA Growth Champion',desc:'Growth Champion Trophy + Featured Advertising By NEXORA',img:'/nexora-top-salon/jaipur-gold-award.svg'},{rank:'02',title:'NEXORA Partner Spotlight',desc:'Recognition Trophy + Partner Spotlight',img:'/nexora-top-salon/jaipur-silver-award.svg'},{rank:'03',title:'NEXORA Rising Salon',desc:'Recognition Trophy + Digital Certificate',img:'/nexora-top-salon/jaipur-bronze-award.svg'}].map(award=><article key={award.rank} className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><img src={award.img} alt={award.title+' by NEXORA'} className="h-52 w-full bg-[#24172F] object-contain p-4"/><div className="p-5"><p className="text-xs font-black tracking-widest text-[#9A6A22]">RANK {award.rank}</p><h3 className="mt-2 font-black">{award.title}</h3><p className="mt-2 text-sm text-slate-600">{award.desc}</p></div></article>)}</div>
  </Panel>

  {adminMode?<Panel title="NEXORA Admin — Competition Control" intro="Only verified NEXORA administrators can create cycles, approve salon applications, refresh reports and lock final awards."><div className="grid gap-5 lg:grid-cols-2">
   <form className="rounded-3xl border border-slate-200 bg-white p-5" onSubmit={event=>{event.preventDefault();void runAdmin('create_cycle',{code:adminCode,registrationOpenDate:adminRegOpen,registrationCloseDate:adminRegClose,startDate:adminStart,endDate});}}><h3 className="text-lg font-black">Create a fixed 90-day cycle</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Cycle code<input value={adminCode} onChange={e=>setAdminCode(e.target.value.toUpperCase())} required className="mt-1 w-full rounded-lg border p-2.5"/></label><label className="text-xs font-bold">Registration opens<input type="date" value={adminRegOpen} onChange={e=>setAdminRegOpen(e.target.value)} required className="mt-1 w-full rounded-lg border p-2.5"/></label><label className="text-xs font-bold">Registration closes<input type="date" value={adminRegClose} onChange={e=>setAdminRegClose(e.target.value)} required className="mt-1 w-full rounded-lg border p-2.5"/></label><label className="text-xs font-bold">Competition start<input type="date" value={adminStart} onChange={e=>setAdminStart(e.target.value)} required className="mt-1 w-full rounded-lg border p-2.5"/></label></div><p className="mt-3 text-xs text-slate-500">End date automatically fixed to 89 days after start: {endDate||'—'} (90 calendar days inclusive).</p><button disabled={busy} className="mt-4 rounded-xl bg-[#2D1F40] px-4 py-3 text-sm font-bold text-white">Create Competition Cycle</button></form>
   <div className="rounded-3xl border border-slate-200 bg-white p-5"><h3 className="text-lg font-black">Cycle actions</h3><select value={pendingCycleId} onChange={e=>setPendingCycleId(e.target.value)} className="mt-3 w-full rounded-lg border p-3"><option value="">Select cycle</option>{adminCycles.map(c=><option key={c.id} value={c.id}>{c.code} · {c.status}</option>)}</select><div className="mt-4 grid grid-cols-2 gap-2"><button disabled={!pendingCycleId||busy} onClick={()=>void runAdmin('open_registration',{cycleId:pendingCycleId})} className="rounded-xl border p-3 text-xs font-bold">Open registration</button><button disabled={!pendingCycleId||busy} onClick={()=>void runAdmin('close_registration',{cycleId:pendingCycleId})} className="rounded-xl border p-3 text-xs font-bold">Close registration</button><button disabled={!pendingCycleId||busy} onClick={()=>void runAdmin('refresh_reports',{cycleId:pendingCycleId})} className="rounded-xl border p-3 text-xs font-bold">Refresh reports</button><button disabled={!pendingCycleId||busy} onClick={()=>void runAdmin('finalize_cycle',{cycleId:pendingCycleId})} className="rounded-xl bg-amber-500 p-3 text-xs font-bold text-white">Finalize awards</button></div><h4 className="mt-5 font-bold">Applications</h4><div className="mt-2 max-h-72 space-y-2 overflow-y-auto">{applications.map(app=><div key={app.entryId} className="rounded-xl bg-slate-50 p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-bold">{app.salon.name}</p><p className="text-xs text-slate-500">{app.competitionId} · {app.salon.area||app.salon.city}</p></div><Badge tone={app.status==='approved'?'green':'gold'}>{app.status}</Badge></div>{app.status==='pending'?<div className="mt-3 flex gap-2"><button disabled={busy} onClick={()=>void approve(app.entryId,true)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Approve</button><button disabled={busy} onClick={()=>void approve(app.entryId,false)} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white">Reject</button></div>:null}</div>)}{!applications.length?<p className="text-xs text-slate-500">No application rows for this cycle.</p>:null}</div></div>
  </div></Panel>:null}

  <Panel title="Competition rules and verification" intro="Fair competition depends on clear, auditable records."><div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5"><ShieldCheck className="text-emerald-700" size={24}/><h3 className="mt-3 font-black">What counts</h3><p className="mt-2 text-sm leading-6 text-slate-600">Captured NEXORA gateway payments for completed appointments inside the fixed 90-day date window. Unique customers count once. Reviews count only when linked to a completed booking. Unresolved/lost payment disputes are excluded.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><LockKeyhole className="text-emerald-700" size={24}/><h3 className="mt-3 font-black">What stays private</h3><p className="mt-2 text-sm leading-6 text-slate-600">Customer names, phone numbers, emails, booking notes and raw payment records never appear on public profiles or competitor report cards.</p></div></div></Panel>

  {notice?<div role="status" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl bg-emerald-900 p-4 text-sm font-semibold text-white shadow-xl">{notice}</div>:null}
  {error?<div role="alert" className="fixed bottom-4 left-4 z-50 max-w-lg rounded-xl bg-rose-900 p-4 text-sm font-semibold text-white shadow-xl">{error}<button className="ml-3 underline" onClick={()=>setError('')}>Dismiss</button></div>:null}
  <footer className="border-t border-[#E8DEEA] bg-white px-4 py-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>© NEXORA Salon OS · Top Salon Jaipur Awards</span><span>All competition dates use India Standard Time (IST).</span><a href="/" className="font-bold text-[#8B245B]">Back to NEXORA Home →</a></div></footer>
 </div>;
}
