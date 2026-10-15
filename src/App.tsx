import {BusinessNotificationLink} from './components/BusinessNotificationLink';
import {SalonBookingsDialog} from './components/SalonBookingsDialog';
import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { loadScreen } from './lib/loadScreen';
import { WebsitePublishPanel } from './components/WebsitePublishPanel';
import { WebsiteDeviceFrame } from './components/WebsiteDeviceFrame';
import {servicesForTemplate} from './lib/serviceCatalogue';
import { applyTemplateDesign } from './lib/templateSelection';
import { normalizeWorkspace } from './lib/normalizeWorkspace';
import type { Session } from '@supabase/supabase-js';
import { AppView, SalonProfile, SalonService, Stylist, Appointment, ClientRecord, BusinessTypeId, LoyaltyConfig, CategoryTemplateConfig } from './types';
import { INITIAL_SALON_PROFILE } from './mockData';
import { calculateLoyaltyTier, DEFAULT_LOYALTY_CONFIG } from './loyaltyData';
import { ACCENT_PALETTES, applyPrimaryAccentCssVar, AccentPaletteKey } from './themeAccents';
import { Header } from './components/Header';
const LandingPage=lazy(()=>loadScreen(()=>import('./components/LandingPage').then(m=>({default:m.LandingPage}))));
const OnboardingWizard=lazy(()=>loadScreen(()=>import('./components/OnboardingWizard').then(m=>({default:m.OnboardingWizard}))));
const SalonWebsitePreview=lazy(()=>loadScreen(()=>import('./components/SalonWebsitePreview').then(m=>({default:m.SalonWebsitePreview}))));
const SaaSDashboard=lazy(()=>loadScreen(()=>import('./components/SaaSDashboard').then(m=>({default:m.SaaSDashboard}))));
import { DEFAULT_EXTRAS } from './lib/workspaceDefaults';
const OwnerWorkspace=lazy(()=>loadScreen(()=>import('./components/OwnerWorkspace').then(m=>({default:m.OwnerWorkspace}))));
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AuthPage } from './components/AuthPage';
import { CustomerBookings } from './components/CustomerBookings';
import { supabase, captureReferral } from './lib/supabase';

export default function App(){return <AppErrorBoundary><Suspense fallback={<Loading text="Loading StudioFlow…" />}><Application /></Suspense></AppErrorBoundary>;}
function readRecoveryFlag(){try{return sessionStorage.getItem('studioflow_recovery')==='1';}catch{return false;}}
function Application() {
 const [session,setSession]=useState<Session|null>(null); const [authReady,setAuthReady]=useState(false);
 const [account,setAccount]=useState<any>(null); const [templates,setTemplates]=useState<CategoryTemplateConfig[]>([]);
 const [error,setError]=useState(''); const [retry,setRetry]=useState(0);
 const [skipReferral,setSkipReferral]=useState(false);
 const [recovery,setRecovery]=useState(()=>readRecoveryFlag()||new URLSearchParams(location.search).has('recovery')||new URLSearchParams(location.hash.slice(1)).get('type')==='recovery');
 const customer=new URLSearchParams(location.search).has('customer');
 const slug=new URLSearchParams(location.search).get('site');
 const ownerSlug=new URLSearchParams(location.search).get('owner');
 useEffect(()=>{captureReferral();let active=true;supabase.auth.getSession().then(({data,error})=>{if(active){setSession(data.session);setAuthReady(true);if(error)setError(error.message);}});const {data}=supabase.auth.onAuthStateChange((event,next)=>{if(event==='PASSWORD_RECOVERY'){try{sessionStorage.setItem('studioflow_recovery','1');}catch{}setRecovery(true);}setSession(next);setAuthReady(true);});return()=>{active=false;data.subscription.unsubscribe();};},[]);
 useEffect(()=>{if(!session||slug||customer||recovery)return;let active=true;setAccount(null);setError('');
 (async()=>{
  if(ownerSlug){const target=await supabase.from('studioflow_websites').select('slug').eq('slug',ownerSlug).eq('owner_id',session.user.id).maybeSingle();if(target.error)throw target.error;if(!target.data)throw new Error('Sign in with the owner account for this salon to manage its website.');}
  const {data,error}=await supabase.rpc('studioflow_ensure_account',{p_ref:skipReferral?'':captureReferral()||null});if(error)throw error;
  const [catalog,identity]=await Promise.all([supabase.from('studioflow_templates').select('config').eq('active',true),supabase.from('profiles').select('full_name,salon_name,phone_number,whatsapp,city,postal_code').eq('id',session.user.id).maybeSingle()]);
  if(catalog.error)throw catalog.error;if(identity.error)throw identity.error;
  if(active){setTemplates((catalog.data||[]).map(t=>t.config as CategoryTemplateConfig));setAccount({...data,identity:identity.data});localStorage.removeItem('studioflow_pending_ref');}
 })().catch(e=>{if(active)setError(e.message||'Could not load your account');});return()=>{active=false;};
 },[session?.user.id,retry,slug,customer,recovery,skipReferral,ownerSlug]);
 if(recovery&&session)return <AuthPage recovery onRecovered={()=>{setRecovery(false);setRetry(r=>r+1);}} />;
 if(slug)return <PublishedWebsite slug={slug} session={session} />;
 if(!authReady)return <Loading text="Checking your session…" />;
 if(!session)return <AuthPage />;
 if(customer)return <CustomerBookings session={session} />;
 if(error)return <main className="p-8"><h1 className="text-2xl font-bold">Account could not load</h1><p role="alert" className="my-4">{error}</p><button className="primary-action" onClick={()=>setRetry(r=>r+1)}>Retry</button><button className="secondary-action ml-3" onClick={()=>void supabase.auth.signOut()}>Sign out</button><button className="secondary-action ml-3" onClick={()=>{localStorage.removeItem('studioflow_pending_ref');const url=new URL(location.href);url.searchParams.delete('ref');history.replaceState(null,'',url);setSkipReferral(true);setRetry(r=>r+1);}}>Continue without pending referral</button></main>;
 if(!account||account.user_id!==session.user.id)return <Loading text="Loading your salon from Supabase…" />;
 return <Workspace key={session.user.id} session={session} account={account} templates={templates} />;
}
function Loading({text}:{text:string}){return <main role="status" className="min-h-screen flex items-center justify-center bg-[#f9f9ff]"><p>{text}</p></main>;}

function Workspace({session,account,templates}:{key?:React.Key;session:Session;account:any;templates:CategoryTemplateConfig[]}) {
 const cacheKey=`studioflow_draft_${session.user.id}`;
 const [cached]=useState(()=>{try{const draft=JSON.parse(localStorage.getItem(cacheKey)||'null');if(draft?.revision!==account.revision&&draft?.draft?.profile)localStorage.setItem(`${cacheKey}_conflict`,JSON.stringify(draft));return draft||JSON.parse(localStorage.getItem(`${cacheKey}_conflict`)||'null');}catch{return null;}});
 const [recoveryNotice,setRecoveryNotice]=useState(!!cached);
 const cloudDraft=account.draft||{};
 const initial=normalizeWorkspace(cached?.revision===account.revision&&cached?.draft?.profile ? cached.draft : cloudDraft,{...account.identity,email:session.user.email,full_name:account.identity?.full_name||session.user.user_metadata.full_name,salon_name:account.identity?.salon_name||session.user.user_metadata.salon_name});
 const [currentView,setCurrentView]=useState<AppView>('owner');
 const [clientPreview,setClientPreview]=useState(false);
 const [clientDevice,setClientDevice]=useState<'desktop'|'tablet'|'mobile'>('desktop');
 const [dashboardTab,setDashboardTab]=useState('overview');
 const openDashboard=(section='overview')=>{setDashboardTab(section);setCurrentView('dashboard');};
 const [profile,setProfile]=useState<SalonProfile>(initial.profile);
 const [services,setServiceState]=useState<SalonService[]>(initial.services||[]);
 const setServices:React.Dispatch<React.SetStateAction<SalonService[]>>=useCallback(next=>{setProfile(prev=>({...prev,serviceCatalogueInitialized:true}));setServiceState(next);},[]);
 const [stylists,setStylists]=useState<Stylist[]>(initial.stylists||[]);
 const [clients,setClients]=useState<ClientRecord[]>(initial.clients||[]);
 const [loyaltyConfig,setLoyaltyConfig]=useState<LoyaltyConfig>(initial.loyaltyConfig||DEFAULT_LOYALTY_CONFIG);
 const [extras,setExtras]=useState({...DEFAULT_EXTRAS,...initial.extras});
 const [onboardingComplete,setOnboardingComplete]=useState(!!initial.onboardingComplete);
 const [appointments,setAppointments]=useState<Appointment[]>([]);const [published,setPublished]=useState<any>(null);
 const [sync,setSync]=useState('Saved to Supabase');const [syncError,setSyncError]=useState('');
 const revision=useRef(account.revision);const queue=useRef(Promise.resolve());const lastSaved=useRef(JSON.stringify(cloudDraft));
 const snapshot={profile:{...profile,bookingRules:{leadHours:extras.bookingLeadHours,cancellationWindow:extras.cancellationWindow}},services,stylists,clients,loyaltyConfig,extras,onboardingComplete};const latest=useRef(snapshot);latest.current=snapshot;
 const flush=useCallback(async()=>{
  const pending=queue.current.catch(()=>{}).then(async()=>{const draft=latest.current;const json=JSON.stringify(draft);if(json===lastSaved.current)return;setSync('Saving…');setSyncError('');const {data,error}=await supabase.rpc('studioflow_save_workspace',{p_draft:draft,p_revision:revision.current});if(error){setSync('Not saved');setSyncError(error.message);throw error;}revision.current=data.revision;lastSaved.current=json;try{if(JSON.stringify(latest.current)===json)localStorage.removeItem(cacheKey);else localStorage.setItem(cacheKey,JSON.stringify({revision:data.revision,draft:latest.current}));}catch{}setSync('Saved to Supabase');});queue.current=pending;return pending;
 },[]);
 useEffect(()=>{if(JSON.stringify(latest.current)!==lastSaved.current){setSync('Unsaved changes');try{localStorage.setItem(cacheKey,JSON.stringify({revision:revision.current,draft:latest.current}));}catch{}}const timer=setTimeout(()=>{void flush().catch(()=>{});},800);return()=>clearTimeout(timer);},[profile,services,stylists,clients,loyaltyConfig,extras,onboardingComplete,flush]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(JSON.stringify(latest.current)!==lastSaved.current){e.preventDefault();e.returnValue='';}};const save=()=>{void flush().catch(()=>{});};window.addEventListener('beforeunload',warn);window.addEventListener('online',save);return()=>{window.removeEventListener('beforeunload',warn);window.removeEventListener('online',save);};},[flush]);
 const refreshBookings=useCallback(async()=>{const {data,error}=await supabase.from('studioflow_bookings').select('payload,status').eq('owner_id',session.user.id).order('created_at',{ascending:false});if(error){setSyncError(error.message);return;}setAppointments((data||[]).map(r=>({...r.payload,status:r.status})));},[session.user.id]);
 useEffect(()=>{void refreshBookings();supabase.from('studioflow_websites').select('slug,published_at').eq('owner_id',session.user.id).maybeSingle().then(({data,error})=>{if(error)setSyncError(error.message);else setPublished(data);});},[session.user.id,refreshBookings]);
 useEffect(()=>{
  const channel=supabase.channel(`studioflow-owner-${session.user.id}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'studioflow_bookings',filter:`owner_id=eq.${session.user.id}`},()=>void refreshBookings())
   .on('postgres_changes',{event:'UPDATE',schema:'public',table:'studioflow_accounts',filter:`user_id=eq.${session.user.id}`},event=>{
    const row=event.new as any;if(row.revision<=revision.current)return;
    const incoming=JSON.stringify(row.draft);
    if(incoming===JSON.stringify(latest.current)){revision.current=row.revision;lastSaved.current=incoming;return;}
    if(JSON.stringify(latest.current)!==lastSaved.current){setSyncError('Workspace changed in another tab. Your local edits are kept; reload to resolve the conflict.');return;}
    const next=normalizeWorkspace(row.draft);revision.current=row.revision;lastSaved.current=JSON.stringify(next);latest.current=next;
    setProfile(next.profile);setServiceState(next.services);setStylists(next.stylists);setClients(next.clients);setLoyaltyConfig(next.loyaltyConfig);setExtras(next.extras);setOnboardingComplete(next.onboardingComplete);setSync('Synced from Supabase');
   }).subscribe();
  return()=>{void supabase.removeChannel(channel);};
 },[session.user.id,refreshBookings]);
 useEffect(()=>{const onFocus=()=>void refreshBookings();window.addEventListener('focus',onFocus);return()=>window.removeEventListener('focus',onFocus);},[refreshBookings]);
 useEffect(()=>{const p=ACCENT_PALETTES[(profile.themeAccentKey as AccentPaletteKey)||'slate'];applyPrimaryAccentCssVar(profile.customAccentColor||p?.primaryHex||'#0f172a',p?.secondaryHex||'#334155');},[profile.customAccentColor,profile.themeAccentKey]);
 const applyTemplate=(id:BusinessTypeId)=>{const t=templates.find(t=>t.id===id);if(!t)return;setServices(servicesForTemplate(services,profile,t));setProfile(p=>({...applyTemplateDesign(p,t),serviceCatalogueInitialized:true}));if(!stylists.length)setStylists(t.stylists);};
 const chooseTemplate=(id:BusinessTypeId)=>{applyTemplate(id);setCurrentView('wizard');};
 const publish=async()=>{await flush();const {data,error}=await supabase.rpc('studioflow_publish');if(error)throw error;setPublished(data);};
 const book=async(apt:Appointment)=>{await flush();if(!published)throw new Error('Publish your salon website before accepting bookings.');const {data,error}=await supabase.rpc('studioflow_book',{p_slug:published.slug,p_request:apt});if(error)throw error;await refreshBookings();return data as Appointment;};
 const updateAppointments:React.Dispatch<React.SetStateAction<Appointment[]>>=next=>{
  const updated=typeof next==='function'?next(appointments):next;
  const changes=updated.filter(apt=>appointments.some(old=>old.id===apt.id&&old.status!==apt.status));
  if(!changes.length)return;
  void (async()=>{for(const apt of changes){const {error}=await supabase.rpc('studioflow_update_booking',{p_id:apt.id,p_status:apt.status});if(error)throw error;
    if(apt.status==='completed')setClients(prev=>prev.map(c=>{if(c.phone!==apt.clientPhone&&c.name.toLowerCase()!==apt.clientName.toLowerCase())return c;const earned=Math.round((loyaltyConfig.pointsPerVisit+Math.round(apt.servicePrice/100*loyaltyConfig.pointsPerHundredSpent))*(loyaltyConfig.tierMultipliers[c.loyaltyTier||'bronze']||1));const lifetime=(c.lifetimePoints||c.points||0)+earned;return {...c,points:(c.points||0)+earned,lifetimePoints:lifetime,loyaltyTier:calculateLoyaltyTier(lifetime,loyaltyConfig.tierThresholds),pointHistory:[{id:`booking-${apt.id}`,date:apt.date,description:`Completed Appointment: ${apt.serviceName}`,pointsChange:earned,type:'spend_earned' as const},...(c.pointHistory||[])]};}));
   }await refreshBookings();})().catch(error=>setSyncError(error.message));
 };

 return <div className="min-h-screen bg-surface text-on-surface">
  {recoveryNotice&&<div className="bg-amber-50 p-4 text-sm" role="status">{cached.revision===account.revision?'Recovered unsaved changes from this browser.':'A previous local draft differs from the latest cloud version.'} {cached.revision!==account.revision&&<button className="underline mx-3" onClick={()=>{const d=normalizeWorkspace(cached.draft);setProfile(d.profile);setServiceState(d.services||[]);setStylists(d.stylists||[]);setClients(d.clients||[]);setLoyaltyConfig(d.loyaltyConfig||DEFAULT_LOYALTY_CONFIG);setExtras({...DEFAULT_EXTRAS,...d.extras});setOnboardingComplete(!!d.onboardingComplete);localStorage.removeItem(`${cacheKey}_conflict`);setRecoveryNotice(false);}}>Restore local draft over cloud version</button>}<button className="underline ml-3" onClick={()=>{localStorage.removeItem(`${cacheKey}_conflict`);setRecoveryNotice(false);}}>Dismiss</button></div>}
  {!clientPreview&&<><div className="h-10 lg:hidden" /><Header brandName={extras.whiteLabel.platformName} currentView={currentView} setCurrentView={setCurrentView} salonName={profile.businessName} onBuildWebsiteClick={()=>setCurrentView(onboardingComplete?'preview':'wizard')} />
  <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:w-auto z-[80] rounded-xl bg-white shadow-lg border p-3 text-xs flex flex-wrap items-center gap-3"><span>{sync}</span><button className="font-bold underline" onClick={()=>void flush().catch(()=>{})}>Save now</button><button onClick={()=>void refreshBookings()}>Refresh bookings</button><BusinessNotificationLink/><a href="/?recovery=1">Change password</a><button onClick={async()=>{try{await flush();await supabase.auth.signOut();}catch{setSyncError('Save failed. Save your changes before signing out.');}}}>Sign out</button>{syncError&&<button className="underline" onClick={()=>void supabase.auth.signOut()}>Sign out keeping local draft</button>}{syncError&&<p role="alert" className="w-full max-w-lg text-red-700">{syncError}</p>}</div>
  </>}
  <AppErrorBoundary resetKey={currentView} onRecover={()=>setCurrentView('owner')}>
  {currentView==='owner'&&<OwnerWorkspace profile={profile} setProfile={setProfile} services={services} setServices={setServices} stylists={stylists} setStylists={setStylists} appointments={appointments} extras={extras} setExtras={setExtras} published={published} onPublish={publish} sessionEmail={session.user.email||''} templates={templates} onOpenPreview={()=>setCurrentView('preview')} onOpenDashboard={openDashboard} onOpenWizard={()=>setCurrentView('wizard')} />}
  {currentView==='landing'&&<LandingPage setCurrentView={setCurrentView} onSelectCategory={chooseTemplate} />}
  {currentView==='wizard'&&<OnboardingWizard profile={profile} setProfile={setProfile} services={services} setServices={setServices} stylists={stylists} setStylists={setStylists} templates={templates} onComplete={()=>{setOnboardingComplete(true);setCurrentView('preview');}} />}
  {currentView==='preview'&&!clientPreview&&<><div className="max-w-6xl mx-auto px-4 pt-4"><WebsitePublishPanel published={published} onPublish={publish}/></div><SalonWebsitePreview onEnterClientPreview={()=>{setClientPreview(true);}} profile={profile} setProfile={setProfile} services={services} setServices={setServices} stylists={stylists} setStylists={setStylists} gallery={extras.gallery} policies={extras.policies} branding={extras.whiteLabel} loyaltyConfig={loyaltyConfig} onManageDashboard={openDashboard} onAddAppointment={book} onSelectCategory={applyTemplate} /></>}
  {currentView==='preview'&&clientPreview&&<div className="h-dvh flex flex-col"><div className="bg-white border-b p-3 flex flex-wrap items-center gap-3"><button className="secondary-action" onClick={()=>setClientPreview(false)}>Back to Workspace Edit View</button><span className="text-xs">Client Preview Mode</span><div className="flex gap-2">{(['desktop','tablet','mobile'] as const).map(mode=><button key={mode} className="secondary-action capitalize" aria-pressed={mode===clientDevice} onClick={()=>setClientDevice(mode)}>{mode}</button>)}</div></div><div className="flex-1 min-h-0"><WebsiteDeviceFrame mode={clientDevice} title="Client-facing salon preview">{doc=><SalonWebsitePreview previewDocument={doc} readOnly profile={{...profile,subdomain:published?.slug||''}} services={services} stylists={stylists} gallery={extras.gallery} policies={extras.policies} branding={extras.whiteLabel} loyaltyConfig={loyaltyConfig} onAddAppointment={book}/>}</WebsiteDeviceFrame></div></div>}
  {currentView==='dashboard'&&<SaaSDashboard gallery={extras.gallery} setGallery={images=>setExtras(prev=>({...prev,gallery:images}))} initialTab={dashboardTab} profile={profile} setProfile={setProfile} services={services} setServices={setServices} stylists={stylists} setStylists={setStylists} appointments={appointments} setAppointments={updateAppointments} clients={clients} setClients={setClients} loyaltyConfig={loyaltyConfig} setLoyaltyConfig={setLoyaltyConfig} onNavigateToPreview={()=>setCurrentView('preview')} />}
  </AppErrorBoundary>
 </div>;
}
function PublishedWebsite({slug,session}:{slug:string;session:Session|null}){
 const [showBookings,setShowBookings]=useState(false);
 const [site,setSite]=useState<any>(null);const [error,setError]=useState('');
 const [authMode,setAuthMode]=useState<'signin'|'signup'|null>(null);
 useEffect(()=>{if(!authMode)return;const previous=document.activeElement as HTMLElement|null;const dialog=document.querySelector<HTMLElement>('[role=dialog][aria-label="Customer account"]');dialog?.querySelector<HTMLElement>('input,button')?.focus();const keyboard=(event:KeyboardEvent)=>{if(event.key==='Escape')setAuthMode(null);if(event.key==='Tab'&&dialog){const items=Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]'));const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}};document.addEventListener('keydown',keyboard);return()=>{document.removeEventListener('keydown',keyboard);previous?.focus();};},[authMode]);
 useEffect(()=>{if(session)setAuthMode(null);},[session?.user.id]);
 useEffect(()=>{let active=true,loaded=false;
  const refresh=async()=>{if(document.hidden)return;const {data,error}=await supabase.from('studioflow_websites').select('content').eq('slug',slug).maybeSingle();if(!active)return;if(error||!data){if(!loaded)setError(error?.message||'This salon website is not published.');return;}loaded=true;setError('');setSite((prev:any)=>JSON.stringify(prev)===JSON.stringify(data.content)?prev:data.content);};
  void refresh();const channel=supabase.channel(`public-site-${slug}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'studioflow_websites',filter:`slug=eq.${slug}`},()=>void refresh()).subscribe();const interval=setInterval(()=>void refresh(),15000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{active=false;void supabase.removeChannel(channel);clearInterval(interval);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[slug]);
 useEffect(()=>{if(!site)return;const previousTitle=document.title;document.title=site.profile?.businessName||'Salon website';const url=site.branding?.faviconUrl;let icon=document.querySelector<HTMLLinkElement>('link[rel="icon"]');const previousIcon=icon?.getAttribute('href');let created=false;if(url&&/^https?:\/\//i.test(url)){if(!icon){icon=document.createElement('link');icon.rel='icon';document.head.appendChild(icon);created=true;}icon.href=url;}return()=>{document.title=previousTitle;if(created)icon?.remove();else if(icon&&previousIcon!==undefined){if(previousIcon===null)icon.removeAttribute('href');else icon.setAttribute('href',previousIcon);}};},[site?.profile?.businessName,site?.branding?.faviconUrl]);
 if(error)return <main className="p-10"><h1 className="text-2xl font-bold">Website unavailable</h1><p>{error}</p><a href="/">Open StudioFlow</a></main>;
 if(!site)return <Loading text="Loading salon website…" />;
 const book=async(apt:Appointment)=>{if(!session){setAuthMode('signin');throw new Error('Please log in or create a customer account to continue your booking.');}const {data,error}=await supabase.rpc('studioflow_book',{p_slug:slug,p_request:apt});if(error)throw error;return data;};
 const content=normalizeWorkspace({...site,extras:{gallery:site.gallery,policies:site.policies,whiteLabel:site.branding}});
 return <>{showBookings&&<SalonBookingsDialog profile={{...content.profile,subdomain:slug}} onClose={()=>setShowBookings(false)}/>} {authMode&&<div className="fixed inset-0 z-[100] bg-black/50 p-4 flex items-center justify-center" onClick={()=>setAuthMode(null)}><section role="dialog" aria-modal="true" aria-label="Customer account" className="bg-white text-slate-900 rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto p-4" onClick={e=>e.stopPropagation()}><button className="secondary-action mb-3" onClick={()=>setAuthMode(null)}>Close</button>{session?<div className="p-4 space-y-4"><h2 className="text-xl font-bold">You are signed in</h2><p>{session.user.email}</p><button className="primary-action" onClick={()=>{setAuthMode(null);setShowBookings(true);}}>My bookings & calendar</button><button className="secondary-action" onClick={()=>void supabase.auth.signOut()}>Sign out to use another account</button></div>:<AuthPage key={authMode} compact customerMode initialMode={authMode} returnSlug={slug}/>}</section></div>}<SalonWebsitePreview key={slug} customerSignedIn={!!session} onCustomerAccount={mode=>setAuthMode(mode||'signin')} profile={{...content.profile,subdomain:slug}} services={content.services} stylists={content.stylists} gallery={content.extras.gallery} policies={site.policies} branding={site.branding} loyaltyConfig={site.loyaltyConfig} onAddAppointment={book} readOnly /></>;
}
