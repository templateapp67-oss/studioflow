import './app.css';
import {KeshKraftEditor,type MensWorkspace} from './components/keshkraft/KeshKraftEditor';
import {MENS_LOYALTY,MENS_STAFF} from './lib/keshkraft';
import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useAuthSession } from './lib/useAuthSession';
import { hasAuthCallbackFragment, hasAuthCallbackQuery } from './lib/authEntry';
import { workspaceSnapshot, sameWorkspace, mergeWorkspace, revisionConflict, conflictMessage, type ConflictChoice } from './lib/workspaceSync';
import { useCustomerProfile } from './components/customer/useCustomerProfile';
import { applyWebsiteFavicon, websiteFavicon } from './lib/websiteFavicon';
import { resolveSiteSlug } from './lib/resolveSite';
import { CATEGORY_TEMPLATES } from './categoryTemplates';
import { nexoraName } from './components/nexora/NexoraBrand';
import { upgradeBeautyParlourTemplate, upgradeLegacyBeautyParlourStylists } from './lib/roopMahalReference';
import { upgradeNailStudioTemplate } from './lib/pinkyNails';
import { upgradeMakeupStudioTemplate } from './lib/vogueNoir';
import { upgradeMassageWellnessTemplate } from './lib/bodhiTree';
import { upgradeHairColoringTemplate } from './lib/prismChroma';
import { upgradeShringaarTemplate } from './lib/shringaarRoyal';
import { upgradeArchFlutterTemplate } from './lib/archFlutter';
import { upgradeUnisexSalonTemplate } from './lib/auraUnisex';
import { applyCustomizerConfig, isArchFlutterTemplate, type ArchFlutterCustomizerConfig, type CustomizerWorkspace } from './lib/archFlutterCustomizer';
import { isVedaTemplate } from './lib/vedaSanjeevaniCustomizer';
import { developmentTemplateForSiteSlug, requestedTemplate, templateDraft } from './lib/templateEntry';
import { BusinessNotificationLink } from './components/BusinessNotificationLink';
import { SalonBookingsDialog } from './components/SalonBookingsDialog';
import { loadScreen } from './lib/loadScreen';
import { ensureTemplate12Seeded, syncIronInkWorkspace } from './templates/iron-ink/api';
import { useTemplate12Sync } from './hooks/useTemplate12Sync';
import { SyncStatusBanner } from './components/SyncStatusBanner';
import { WebsitePublishPanel } from './components/WebsitePublishPanel';
import { WebsiteDeviceFrame } from './components/WebsiteDeviceFrame';
import { Rocket, Sliders } from 'lucide-react';
import { UnifiedTemplateActionButton, type TemplateAction } from './components/template-preview/TemplatePreviewChrome';
import { servicesForTemplate, withPairedServiceImages } from './lib/serviceCatalogue';
import { applyTemplateDesign } from './lib/templateSelection';
import { normalizeWorkspace, isRecord } from './lib/normalizeWorkspace';
import { bootstrapSalonAccount, loadTemplateCatalogue } from './lib/accountBootstrap';
import { messageOf, withTimeout } from './lib/asyncDeadline';
import { normalizeServices } from './lib/dermacureContent';
import { AccountLoading } from './components/AccountLoading';
import { AppView, SalonProfile, SalonService, Stylist, Appointment, ClientRecord, BusinessTypeId, LoyaltyConfig, CategoryTemplateConfig } from './types';
import { INITIAL_SALON_PROFILE } from './mockData';
import { calculateLoyaltyTier, DEFAULT_LOYALTY_CONFIG } from './loyaltyData';
import { ACCENT_PALETTES, applyPrimaryAccentCssVar, AccentPaletteKey } from './themeAccents';
import { Header } from './components/Header';
import { DEFAULT_EXTRAS } from './lib/workspaceDefaults';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AuthPage } from './components/AuthPage';
import { CustomerBookings } from './components/CustomerBookings';
import { useCustomerWelcomeDelivery } from './components/CustomerWelcomeDelivery';
import { CustomerInvitePage } from './components/CustomerInvitePage';
import { isCustomerInviteEntry, clearCustomerReferral } from './lib/customerReferral';
import { CustomerReferralBridge } from './components/CustomerReferralBridge';
import { readGoogleOAuthIntent, clearGoogleOAuthIntent, isNewGoogleAccount } from './lib/googleOAuth';
import { CustomerApp } from './components/CustomerApp';
import { supabase, captureReferral } from './lib/supabase';
import { applySeoMetadata } from './lib/useSeoMetadata';
import { applyPublicSeoMetadata, NEXORA_HOME_SEO, NEXORA_LOGIN_SEO } from './lib/publicSeo';
import { loadApplicationFonts } from './lib/loadApplicationFonts';

type Template12WorkspaceDraft = { profile: SalonProfile; services: SalonService[]; stylists: Stylist[]; galleryUrls: string[] };

const WebsiteCustomerAccount = lazy(() => import('./components/WebsiteCustomerAccount').then(m => ({ default: m.WebsiteCustomerAccount })));
const LandingPage = lazy(() => loadScreen(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage ?? (m as unknown as { default: typeof m.LandingPage }).default }))));
const PublicHomepage = lazy(() => loadScreen(() => import('./components/PublicHomepage').then(m => ({ default: m.PublicHomepage }))));
const OnboardingWizard = lazy(() => loadScreen(() => import('./components/OnboardingWizard').then(m => ({ default: m.OnboardingWizard }))));
const SalonWebsitePreview = lazy(() => loadScreen(() => import('./components/SalonWebsitePreview').then(m => ({ default: m.SalonWebsitePreview }))));
const SaaSDashboard = lazy(() => loadScreen(() => import('./components/SaaSDashboard').then(m => ({ default: m.SaaSDashboard }))));
const OwnerWorkspace = lazy(() => loadScreen(() => import('./components/OwnerWorkspace').then(m => ({ default: m.OwnerWorkspace }))));
/** Template 13 (Arch & Flutter) only: the dedicated customizer drawer. */
const ArchFlutterCustomizerGate = lazy(() => loadScreen(() => import('./components/arch-flutter-customizer/ArchFlutterCustomizerGate').then(m => ({ default: m.ArchFlutterCustomizerGate }))));
/** Template 14 (Veda Sanjeevani) only: the Ayurvedic customizer drawer. */
const VedaCustomizerGate = lazy(() => loadScreen(() => import('./components/veda-sanjeevani/VedaCustomizerGate').then(m => ({ default: m.VedaCustomizerGate }))));

export default function App(){
  useEffect(() => loadApplicationFonts(), []);
  return <AppErrorBoundary><Suspense fallback={<Loading text="Loading NEXORA…" />}><CustomerReferralBridge/><Application /></Suspense></AppErrorBoundary>;
}
function readRecoveryFlag(){try{return sessionStorage.getItem('studioflow_recovery')==='1';}catch{return false;}}
function Application() {
 const [account,setAccount]=useState<any>(null); const [templates,setTemplates]=useState<CategoryTemplateConfig[]>([]);
 const [error,setError]=useState(''); const [retry,setRetry]=useState(0);
 const [skipReferral,setSkipReferral]=useState(false);
 const [recovery,setRecovery]=useState(()=>readRecoveryFlag()||new URLSearchParams(location.search).has('recovery')||new URLSearchParams(location.hash.slice(1)).get('type')==='recovery');
 const [inviteEntry]=useState(isCustomerInviteEntry);
 const customerApp=new URLSearchParams(location.search).has('app');
 const customer=new URLSearchParams(location.search).has('customer');
 const slug=resolveSiteSlug(typeof location==='undefined'?undefined:location);
 const entryTemplate=requestedTemplate(location.search);
 const createTemplate=new URLSearchParams(location.search).get('create')==='1';
 const ownerSlug=new URLSearchParams(location.search).get('owner');
 const isLoginRoute=/^\/login\/?$/.test(location.pathname);
 // Legacy root auth/create/owner/panel links keep working; new public links use /login explicitly.
 const reservedRootEntry=customer||recovery||!!ownerSlug||!!entryTemplate||createTemplate||new URLSearchParams(location.search).has('panel');
 const authEntry=isLoginRoute||reservedRootEntry||hasAuthCallbackQuery(location.search)||hasAuthCallbackFragment(location.hash);
 const publicHomeRoute=location.pathname==='/'&&!slug&&!customer&&!customerApp&&!inviteEntry&&!recovery&&!ownerSlug&&!entryTemplate&&!createTemplate&&!authEntry;
 const onRecovery=useCallback(()=>{try{sessionStorage.setItem('studioflow_recovery','1');}catch{}setRecovery(true);},[]);
 const {session,ready:authReady,error:authError}=useAuthSession(onRecovery);
 const [googleOAuthStatus,setGoogleOAuthStatus]=useState<'idle'|'processing'|'error'>('idle');
 const [googleOAuthMessage,setGoogleOAuthMessage]=useState('');
 const [googleOAuthRetry,setGoogleOAuthRetry]=useState(0);
 useEffect(()=>{
  if(!authReady)return;
  if(!session){setGoogleOAuthStatus('idle');setGoogleOAuthMessage('');return;}
  const intent=readGoogleOAuthIntent();
  if(!intent){setGoogleOAuthStatus('idle');return;}
  let active=true;
  setGoogleOAuthStatus('processing');setGoogleOAuthMessage('');
  void (async()=>{
   if(intent.mode==='signup'){
    // OAuth may return an existing Google identity even from the Sign up tab.
    // Only populate profile fields when Supabase created the auth user after
    // this exact signup attempt began; otherwise this is an ordinary sign-in.
    if(!isNewGoogleAccount(intent,session.user.created_at)){
     // This Google identity already existed. Discard signup-only attribution too.
     if(intent.role==='customer')clearCustomerReferral();
     else {try{localStorage.removeItem('studioflow_pending_ref');}catch{}}
     clearGoogleOAuthIntent();
     if(active){setGoogleOAuthStatus('idle');setGoogleOAuthMessage('');}
     return;
    }
    const fullName=intent.fullName.trim()||String(session.user.user_metadata?.full_name||session.user.user_metadata?.name||'').trim();
    if(intent.role==='customer'){
     if(!fullName||!intent.dateOfBirth||!intent.whatsappNumber)throw new Error('Google sign-up is missing required customer details. Please sign out and use Sign up to enter your name, date of birth and WhatsApp number.');
     const metadata={
      full_name:fullName,
      date_of_birth:intent.dateOfBirth,
      whatsapp_number:intent.whatsappNumber,
      customer_referral_code:intent.referralCode,
      source:'studioflow',
     };
     const updated=await supabase.auth.updateUser({data:metadata});
     if(updated.error)throw updated.error;
     const profile=await supabase.rpc('studioflow_customer_update_details',{
      p_name:fullName,
      p_phone:intent.whatsappNumber,
      p_whatsapp:intent.whatsappNumber,
      p_birth_date:intent.dateOfBirth,
     });
     if(profile.error)throw profile.error;
     if(intent.referralCode){
      const referral=await supabase.rpc('studioflow_customer_claim_ref',{p_code:intent.referralCode});
      if(referral.error)throw referral.error;
     }
    }else{
     if(!fullName||!intent.salonName.trim())throw new Error('Google sign-up is missing your name or salon name. Please sign out and complete salon sign-up again.');
     const updated=await supabase.auth.updateUser({data:{full_name:fullName,salon_name:intent.salonName.trim(),source:'studioflow'}});
     if(updated.error)throw updated.error;
     const profile=await supabase.from('profiles').update({full_name:fullName,salon_name:intent.salonName.trim()}).eq('id',session.user.id).select('id').maybeSingle();
     if(profile.error)throw profile.error;
     if(!profile.data)throw new Error('Your salon profile was not found. Please retry Google sign-up.');
    }
   }
   clearGoogleOAuthIntent();
   if(active){setGoogleOAuthStatus('idle');setGoogleOAuthMessage('');}
  })().catch(error=>{
   if(active){setGoogleOAuthStatus('error');setGoogleOAuthMessage(error instanceof Error?error.message:'Google sign-in could not finish. Please retry.');}
  });
  return()=>{active=false;};
 },[session?.user?.id,authReady,googleOAuthRetry]);
 useCustomerWelcomeDelivery(session);
 useEffect(()=>{captureReferral();},[]);
 useEffect(()=>{
  if(slug||customer||customerApp||inviteEntry)return;
  applyPublicSeoMetadata(authEntry?NEXORA_LOGIN_SEO:NEXORA_HOME_SEO);
 },[slug,customer,customerApp,inviteEntry,authEntry]);
 useEffect(()=>{if(!session){setAccount(null);setError('');return;}if(slug||customer||customerApp||recovery||publicHomeRoute)return;let active=true;setAccount(null);setError('');
 (async()=>{
  if(ownerSlug){const target=await withTimeout(supabase.from('studioflow_websites').select('slug').eq('slug',ownerSlug).eq('owner_id',session.user.id).maybeSingle(),15000,'Checking this salon website');if(target.error)throw target.error;if(!target.data)throw new Error('Sign in with the owner account for this salon to manage its website.');}
  // Bounded, self-healing bootstrap: the RPC is tried first, the already-saved
  // workspace row is used when it fails or stalls, and only a total failure
  // reaches the error screen (never an endless "Loading your salon" spinner).
  const bootstrap=await bootstrapSalonAccount({
   userId:session.user.id,
   pRef:skipReferral?'':captureReferral()||null,
   ensureAccount:pRef=>supabase.rpc('studioflow_ensure_account',{p_ref:pRef}),
   loadAccountRow:()=>supabase.from('studioflow_accounts').select('draft,revision').eq('user_id',session.user.id).maybeSingle(),
  });
  if(!active)return;
  if(!bootstrap.account){
   // Last resort: a draft this browser already cached. The workspace opens on
   // it (the save path then reconciles with the cloud) instead of failing.
   const cachedDraft=(()=>{try{const raw=localStorage.getItem(`studioflow_draft_${session.user.id}`);const parsed=raw?JSON.parse(raw):null;return parsed?.draft?.profile?parsed:null;}catch{return null;}})();
   if(!cachedDraft)throw new Error(bootstrap.error||'Could not load your account');
   setTemplates(Object.values(CATEGORY_TEMPLATES));
   setAccount({user_id:session.user.id,draft:cachedDraft.draft,revision:Number(cachedDraft.revision||0),identity:null});
   return;
  }
  // Templates and profile details are conveniences: a slow or failing read
  // must not keep the salon closed, so both are best-effort and time-boxed.
  const [catalogue,identity]=await Promise.all([
   loadTemplateCatalogue<CategoryTemplateConfig>({
    load:()=>supabase.from('studioflow_templates').select('config').eq('active',true),
    fallback:Object.values(CATEGORY_TEMPLATES),
    upgrade:config=>upgradeUnisexSalonTemplate(upgradeArchFlutterTemplate(upgradeShringaarTemplate(upgradeHairColoringTemplate(upgradeMassageWellnessTemplate(upgradeMakeupStudioTemplate(upgradeNailStudioTemplate(upgradeBeautyParlourTemplate(config as CategoryTemplateConfig)),CATEGORY_TEMPLATES.makeup_studio),CATEGORY_TEMPLATES.massage_wellness),CATEGORY_TEMPLATES.hair_coloring),CATEGORY_TEMPLATES.bridal_lounge),CATEGORY_TEMPLATES.lash_brow),CATEGORY_TEMPLATES.unisex_salon),
   }),
   withTimeout(supabase.from('profiles').select('full_name,salon_name,phone_number,whatsapp,city,postal_code').eq('id',session.user.id).maybeSingle(),12000,'Loading your profile').then(({data,error:identityError})=>({data,error:identityError})).catch(()=>({data:null,error:null})),
  ]);
  if(active){setTemplates(catalogue.templates.some(t=>t.id==='mens_hair_studio')?catalogue.templates:[...catalogue.templates,CATEGORY_TEMPLATES.mens_hair_studio]);setAccount({...bootstrap.account,identity:identity.error?null:identity.data});try{localStorage.removeItem('studioflow_pending_ref');}catch{}}
 })().catch(e=>{if(active)setError(e.message||'Could not load your account');});return()=>{active=false;};
 },[session?.user?.id,retry,slug,customer,customerApp,recovery,skipReferral,ownerSlug,publicHomeRoute]);
 if(googleOAuthStatus==='processing')return <Loading text="Finishing your Google sign-in…" />;
 if(googleOAuthStatus==='error')return <main className="min-h-screen flex items-center justify-center bg-[#f9f9ff] px-4"><section className="workspace-card w-full max-w-lg"><h1 className="text-2xl font-bold mb-2">Finish Google sign-in</h1><p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-amber-900">{googleOAuthMessage}</p><div className="flex flex-wrap gap-3"><button className="primary-action" onClick={()=>setGoogleOAuthRetry(n=>n+1)}>Retry</button><button className="secondary-action" onClick={()=>void supabase.auth.signOut()}>Sign out</button></div></section></main>;
 if(recovery&&session)return <AuthPage recovery onRecovered={()=>{setRecovery(false);setRetry(r=>r+1);}} />;
 if(customerApp&&!authReady)return <Loading text="Opening Nexora…" />;
 if(inviteEntry&&!recovery)return <CustomerInvitePage session={session}/>;
 if(customerApp)return <CustomerApp session={session}/>;
 if(slug)return <AppErrorBoundary resetKey={slug}><PublishedWebsite key={slug} slug={slug} session={session} /></AppErrorBoundary>;
 if(entryTemplate&&!createTemplate&&!isLoginRoute&&!slug&&!customer&&!recovery)return <TemplateEntry templateId={entryTemplate.id} />;
 if(publicHomeRoute)return <PublicHomepage authenticated={Boolean(session)} />;
 if(!authReady)return <Loading text="Checking your session…" />;
 if(!session)return authEntry?<>{authError&&<p role="alert" className="p-4">{authError}</p>}<div className="bg-white border-b px-4 py-3 text-center text-sm">Looking for a salon appointment? <a className="text-violet-600 font-semibold" href="/?app=1">Open Nexora Customer App →</a></div><AuthPage /></>:<PublicHomepage />;
 if(customer)return <CustomerBookings session={session} />;
 if(error)return <main className="p-8"><h1 className="text-2xl font-bold">Account could not load</h1><p role="alert" className="my-4">{error.includes('database') || error.includes('connection') ? 'There was a database connection issue. Please check your internet or try again later.' : error}</p><button className="primary-action" onClick={()=>setRetry(r=>r+1)}>Retry</button><button className="secondary-action ml-3" onClick={()=>void supabase.auth.signOut()}>Sign out</button><button className="secondary-action ml-3" onClick={()=>{localStorage.removeItem('studioflow_pending_ref');const url=new URL(location.href);url.searchParams.delete('ref');history.replaceState(null,'',url);setSkipReferral(true);setRetry(r=>r+1);}}>Continue without pending referral</button></main>;
 if(!account||account.user_id!==session.user.id)return <AccountLoading profileState={account?'user-mismatch':'loading'} userId={session.user.id} onRetry={()=>setRetry(r=>r+1)} onSignOut={()=>void supabase.auth.signOut()} />;
 return <AppErrorBoundary resetKey={session.user.id}><Workspace key={session.user.id} session={session} account={account} templates={templates} /></AppErrorBoundary>;
}
function TemplateEntry({templateId}:{templateId:BusinessTypeId}){
 const template=CATEGORY_TEMPLATES[templateId];
 const [remote,setRemote]=useState<any>(null);
 const [mensEditing,setMensEditing]=useState(false);
 const [mensDraft,setMensDraft]=useState<MensWorkspace|null>(null);
 useEffect(()=>{let active=true;void supabase.rpc('studioflow_customer_catalog').then(({data,error})=>{if(active&&!error)setRemote((data?.templates||[]).find((t:any)=>t.id===templateId)||null)});return()=>{active=false}},[templateId]);
 const mergedRemote=remote?upgradeUnisexSalonTemplate(upgradeArchFlutterTemplate(upgradeShringaarTemplate(upgradeHairColoringTemplate(upgradeMassageWellnessTemplate(upgradeMakeupStudioTemplate(upgradeNailStudioTemplate(upgradeBeautyParlourTemplate(remote)),CATEGORY_TEMPLATES.makeup_studio),CATEGORY_TEMPLATES.massage_wellness),CATEGORY_TEMPLATES.hair_coloring),CATEGORY_TEMPLATES.bridal_lounge),CATEGORY_TEMPLATES.lash_brow),CATEGORY_TEMPLATES.unisex_salon):null;
 const source=templateId==='mens_hair_studio'?template:mergedRemote?{...template,title:mergedRemote.title||template.title,tagline:mergedRemote.tagline||template.tagline,coverImageUrl:mergedRemote.coverImageUrl||template.coverImageUrl,services:mergedRemote.services?.length?mergedRemote.services:template.services,stylists:mergedRemote.stylists?.length?mergedRemote.stylists:template.stylists}:template;
 const draft=templateDraft(source);
 if(mergedRemote?.demoOffer)draft.profile.promoCampaign={selectedServiceId:'',campaignTheme:'flash_discount',discountPercent:0,customOfferText:'',promoCode:'',subtext:'',aspectRatio:'16:9',aesthetic:'minimalist_chic',imageUrl:source.coverImageUrl,customPrompt:'',...mergedRemote.demoOffer,headline:'TEMPLATE DEMO · '+(mergedRemote.demoOffer.headline||'Sample offer')};
 const create=()=>{if(templateId==='mens_hair_studio'&&mensDraft)try{sessionStorage.setItem('studioflow_template15_draft',JSON.stringify(mensDraft));}catch{}location.assign(`/?template=${encodeURIComponent(templateId)}&create=1`);};
 /* Same merged action as every other template viewer: the “Customize” and
  * “Create my website with this template” triggers are one primary button with
  * the individual flows organised in its dropdown. */
 const canCustomize=templateId==='mens_hair_studio';
 const templateActions:TemplateAction[]=[...(canCustomize?[{id:'customize' as const,label:'Customize this template',description:'Open the Men’s Hair Studio editor before creating your website.',icon:Sliders,onSelect:()=>setMensEditing(true)}]:[]),{id:'build' as const,label:'Create my website with this template',description:'Take this demo into your dashboard as a starting point.',icon:Rocket,onSelect:create}];
 return <><div data-template-preview-toolbar className="sticky top-0 z-[90] bg-white border-b px-4 py-3 flex flex-wrap justify-between items-center gap-3"><a className="font-semibold" href="/#nexora-template-library">← All templates</a><span><strong>{nexoraName(templateId, template.shortName)}</strong> · Demo template</span><UnifiedTemplateActionButton actions={templateActions} label={canCustomize?'Customize & Build Website':'Create my website with this template'} defaultActionId={canCustomize?'customize':'build'} /></div>{mensEditing&&templateId==='mens_hair_studio'?<KeshKraftEditor workspace={mensDraft||draft} onSave={next=>setMensDraft(next)} onClose={()=>setMensEditing(false)}/>:<SalonWebsitePreview readOnly profile={mensDraft?.profile||draft.profile} services={mensDraft?.services||draft.services} stylists={mensDraft?.stylists||draft.stylists} loyaltyConfig={mensDraft?.loyaltyConfig} gallery={draft.extras.gallery} onCustomerAccount={create} onAddAppointment={async()=>{throw new Error('This is a template preview. Choose Create my website to set up your own bookings.');}} />}</>;
}
function Loading({text}:{text:string}){return <main role="status" className="min-h-screen flex items-center justify-center bg-[#f9f9ff]"><p>{text}</p></main>;}
/**
 * Account loader that never becomes a dead end. It is a plain waiting message
 * for the first few seconds, then explains the delay and offers a retry — the
 * bootstrap behind it is time-boxed, so this state always resolves.
 */
export function Workspace({session,account,templates}:{key?:React.Key;session:Session;account:any;templates:CategoryTemplateConfig[]}) {
 const cacheKey=`studioflow_draft_${session.user.id}`;
 const [cached]=useState(()=>{try{const draft=JSON.parse(localStorage.getItem(cacheKey)||'null');if(draft?.revision!==account.revision&&draft?.draft?.profile)localStorage.setItem(`${cacheKey}_conflict`,JSON.stringify(draft));return draft||JSON.parse(localStorage.getItem(`${cacheKey}_conflict`)||'null');}catch{return null;}});
 const [recoveryNotice,setRecoveryNotice]=useState(!!cached);
 const cloudDraft=account.draft||{};
 const baseInitial=normalizeWorkspace(cached?.revision===account.revision&&cached?.draft?.profile ? cached.draft : cloudDraft,{...account.identity,email:session.user.email,full_name:account.identity?.full_name||session.user.user_metadata?.full_name,salon_name:account.identity?.salon_name||session.user.user_metadata?.salon_name});
 const [entry]=useState(()=>{const query=new URLSearchParams(location.search);return query.get('create')==='1'?requestedTemplate(location.search):null;});
 const [mensEntryDraft]=useState<MensWorkspace|null>(()=>{if(entry?.id!=='mens_hair_studio')return null;try{const saved=JSON.parse(sessionStorage.getItem('studioflow_template15_draft')||'null');return saved?.profile?.businessType==='mens_hair_studio'?saved:null;}catch{return null;}});
 const seededInitial=entry?{...baseInitial,profile:{...applyTemplateDesign(baseInitial.profile,entry),serviceCatalogueInitialized:true},services:servicesForTemplate(baseInitial.services,baseInitial.profile,entry),stylists:entry.id==='mens_hair_studio'?[...baseInitial.stylists,...MENS_STAFF.filter(s=>!baseInitial.stylists.some(x=>x.id===s.id))]:baseInitial.stylists.length?baseInitial.stylists:entry.stylists,...(entry.id==='mens_hair_studio'?{loyaltyConfig:structuredClone(MENS_LOYALTY)}:{})}:baseInitial;
 const initial=mensEntryDraft?{...seededInitial,profile:{...mensEntryDraft.profile,subdomain:''},services:[...baseInitial.services.filter(s=>s.mensTemplateId!=='mens_hair_studio'),...mensEntryDraft.services],stylists:[...baseInitial.stylists.filter(s=>s.businessType!=='mens_hair_studio'),...mensEntryDraft.stylists],loyaltyConfig:mensEntryDraft.loyaltyConfig||structuredClone(MENS_LOYALTY)}:seededInitial;
 const [currentView,setCurrentView]=useState<AppView>(entry?'wizard':new URLSearchParams(location.search).get('panel')==='demo'?'dashboard':'owner');
 useEffect(()=>{if(!entry)return;const url=new URL(location.href);url.searchParams.delete('template');url.searchParams.delete('category');url.searchParams.delete('create');history.replaceState(null,'',url);},[entry]);
 const [clientPreview,setClientPreview]=useState(false);
 const [clientDevice,setClientDevice]=useState<'desktop'|'tablet'|'mobile'>('desktop');
 const [dashboardTab,setDashboardTab]=useState(new URLSearchParams(location.search).get('panel')==='demo'?'demo':'overview');
 const openDashboard=(section='overview')=>{setDashboardTab(section);setCurrentView('dashboard');};
 const [profile,setProfile]=useState<SalonProfile>(initial.profile);
 const [services,setServiceState]=useState<SalonService[]>(initial.services||[]);
 const setServices:React.Dispatch<React.SetStateAction<SalonService[]>>=useCallback(next=>{setProfile(prev=>({...prev,serviceCatalogueInitialized:true}));setServiceState(next);},[]);
 const [stylists,setStylists]=useState<Stylist[]>(initial.stylists||[]);
 const [clients,setClients]=useState<ClientRecord[]>(initial.clients||[]);
 const [loyaltyConfig,setLoyaltyConfig]=useState<LoyaltyConfig>(initial.loyaltyConfig||DEFAULT_LOYALTY_CONFIG);
 const [extras,setExtras]=useState({...DEFAULT_EXTRAS,...initial.extras});
 const [onboardingComplete,setOnboardingComplete]=useState(!!initial.onboardingComplete);
 const restoreTemplate12Draft=useCallback((draft:Template12WorkspaceDraft)=>{setProfile(draft.profile);setServiceState(draft.services||[]);setStylists(draft.stylists||[]);setExtras(prev=>({...prev,gallery:draft.galleryUrls||[]}));setOnboardingComplete(true);},[]);
 const template12Sync=useTemplate12Sync<Template12WorkspaceDraft>(session.user.id,{onRestore:restoreTemplate12Draft,enabled:profile.businessType==='tattoo_studio'});
 const [appointments,setAppointments]=useState<Appointment[]>([]);const [published,setPublished]=useState<any>(null);
 const [sync,setSync]=useState('Saved to Supabase');const [syncError,setSyncError]=useState('');const [saveConflicts,setSaveConflicts]=useState<string[]>([]);
 const workspaceActive=useRef(true);useEffect(()=>{workspaceActive.current=true;return()=>{workspaceActive.current=false}},[]);
 const revision=useRef(account.revision);const queue=useRef(Promise.resolve());const lastSaved=useRef(JSON.stringify(workspaceSnapshot(cloudDraft)));
 const snapshot={profile:{...profile,bookingRules:{leadHours:extras.bookingLeadHours,cancellationWindow:extras.cancellationWindow}},services,stylists,clients,loyaltyConfig,extras,onboardingComplete};const latest=useRef<ReturnType<typeof workspaceSnapshot>>(snapshot);latest.current=snapshot;
 const applySnapshot=useCallback((next:ReturnType<typeof workspaceSnapshot>)=>{if(!isRecord(next)||!isRecord(next.profile))throw new Error('The saved workspace is incomplete. Your local edits are kept; retry loading.');latest.current=next;setProfile(next.profile);setServiceState(next.services);setStylists(next.stylists);setClients(next.clients);setLoyaltyConfig(next.loyaltyConfig);setExtras(next.extras);setOnboardingComplete(next.onboardingComplete);},[]);
 const flush=useCallback(async(choice:ConflictChoice='error')=>{
  const pending=queue.current.catch(()=>{}).then(async()=>{
   try{
    for(let attempt=0;attempt<3;attempt++){
     if(!workspaceActive.current)return;
     const currentAuth=await supabase.auth.getSession();
     if(!workspaceActive.current)return;
     if(currentAuth.error||currentAuth.data?.session?.user?.id!==session.user.id)throw new Error('Your sign-in changed. Local edits are kept for the original account.');
     const draft=latest.current;
     if(sameWorkspace(draft,JSON.parse(lastSaved.current))){setSync('Saved to Supabase');setSyncError('');setSaveConflicts([]);return;}
     setSync('Saving…');setSyncError('');
     const {data,error}=await supabase.rpc('studioflow_save_workspace',{p_draft:withPairedServiceImages(draft),p_revision:revision.current});
     if(error){
      if(!revisionConflict(error))throw error;
      const fresh=await supabase.from('studioflow_accounts').select('draft,revision').eq('user_id',session.user.id).single();
      if(fresh.error)throw fresh.error;
      if(!workspaceActive.current)return;
      if(!isRecord(fresh.data?.draft)||!isRecord(fresh.data.draft.profile))throw new Error('Could not read the latest saved workspace profile. Your edits are kept; retry saving.');
      const remote=workspaceSnapshot(fresh.data.draft);
      const merged=mergeWorkspace(workspaceSnapshot(JSON.parse(lastSaved.current)),latest.current,remote,choice);
      if(merged.conflicts.length&&choice==='error'){setSaveConflicts(merged.conflicts);throw new Error(conflictMessage);}
      revision.current=fresh.data.revision;lastSaved.current=JSON.stringify(remote);applySnapshot(merged.draft);setSaveConflicts([]);
      continue;
     }
     if(!data||typeof data.revision!=='number')throw new Error('The save response was incomplete. Your edits are kept; retry saving.');
     revision.current=data.revision;
     // Clinic approval metadata is generated by the database, not the browser.
     // Merge it back without discarding edits made while this request was pending.
     if(data.draft&&(!isRecord(data.draft)||!isRecord(data.draft.profile)))throw new Error('The save returned an incomplete workspace profile. Your local edits are kept; retry saving.');
     const saved=draft.profile.businessType==='skincare_clinic'&&data?.draft?workspaceSnapshot(data.draft):workspaceSnapshot(draft);
     const merged=mergeWorkspace(workspaceSnapshot(draft),workspaceSnapshot(latest.current),saved,'local');
     lastSaved.current=JSON.stringify(saved);setSaveConflicts([]);setSyncError('');
     if(!sameWorkspace(latest.current,merged.draft))applySnapshot(merged.draft);
     try{if(sameWorkspace(merged.draft,saved))localStorage.removeItem(cacheKey);else localStorage.setItem(cacheKey,JSON.stringify({revision:data.revision,draft:merged.draft}));}catch{}
     setSync(sameWorkspace(merged.draft,saved)?'Saved to Supabase':'Unsaved changes');return;
    }
    throw new Error('Workspace is still updating in another tab. Your edits are kept. Click Save now to retry.');
   }catch(error){setSync('Not saved');setSyncError(error instanceof Error?error.message:(error as any)?.message||'Save failed. Your edits are kept; retry saving.');throw error;}
  });queue.current=pending;return pending;
 },[session.user.id,applySnapshot]);
 useEffect(()=>{if(!sameWorkspace(latest.current,JSON.parse(lastSaved.current))){setSync('Unsaved changes');try{localStorage.setItem(cacheKey,JSON.stringify({revision:revision.current,draft:latest.current}));}catch{}}const timer=setTimeout(()=>{void flush().catch(()=>{});},800);return()=>clearTimeout(timer);},[profile,services,stylists,clients,loyaltyConfig,extras,onboardingComplete,flush]);
  const refreshBookings=useCallback(async()=>{
    try {
      const {data,error}=await supabase.from('studioflow_bookings').select('payload,status').eq('owner_id',session.user.id).order('created_at',{ascending:false});
      if(error){
        setSyncError(error.message);
        return;
      }
      setAppointments((data||[]).map((r:any)=>({
        ...r.payload,
        branchId:r.payload?.branchId||r.payload?.branch_id,
        status:r.status
      })));
    } catch(err) {
      setSyncError(err instanceof Error ? err.message : 'Could not refresh bookings.');
    }
  },[session.user.id]);
 useEffect(()=>{
  const channel=supabase.channel(`studioflow-owner-${session.user.id}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'studioflow_bookings',filter:`owner_id=eq.${session.user.id}`},()=>void refreshBookings())
   .on('postgres_changes',{event:'UPDATE',schema:'public',table:'studioflow_accounts',filter:`user_id=eq.${session.user.id}`},event=>{
    const row=event.new as any;
    const pending=queue.current.catch(()=>{}).then(()=>{
     if(!workspaceActive.current||!row||!Number.isFinite(row.revision)||row.revision<=revision.current)return;
     if(!isRecord(row.draft)||!isRecord(row.draft.profile)){setSyncError('The updated workspace profile is incomplete. Your local edits are kept; retry loading.');return;}
     const remote=workspaceSnapshot(row.draft);
     const merged=mergeWorkspace(workspaceSnapshot(JSON.parse(lastSaved.current)),latest.current,remote);
     if(merged.conflicts.length){setSaveConflicts(merged.conflicts);setSync('Not saved');setSyncError(conflictMessage);return;}
     revision.current=row.revision;lastSaved.current=JSON.stringify(remote);applySnapshot(merged.draft);setSaveConflicts([]);setSyncError('');setSync(sameWorkspace(merged.draft,remote)?'Synced from Supabase':'Unsaved changes');
    });queue.current=pending;

   }).subscribe();
  return()=>{void supabase.removeChannel(channel);};
 },[session.user.id,refreshBookings,applySnapshot]);
 useEffect(()=>{const onFocus=()=>void refreshBookings();window.addEventListener('focus',onFocus);return()=>window.removeEventListener('focus',onFocus);},[refreshBookings]);
 useEffect(()=>{const p=ACCENT_PALETTES[(profile.themeAccentKey as AccentPaletteKey)||'slate'];applyPrimaryAccentCssVar(profile.customAccentColor||p?.primaryHex||'#0f172a',p?.secondaryHex||'#334155');},[profile.customAccentColor,profile.themeAccentKey]);
 const applyTemplate=(id:BusinessTypeId)=>{const t=templates.find(t=>t.id===id)||CATEGORY_TEMPLATES[id];if(!t)return;setServices(servicesForTemplate(services,profile,t));setProfile(p=>({...applyTemplateDesign(p,t),serviceCatalogueInitialized:true}));if(id==='mens_hair_studio'){setStylists(prev=>[...prev,...MENS_STAFF.filter(s=>!prev.some(p=>p.id===s.id))]);setLoyaltyConfig(structuredClone(MENS_LOYALTY));}else if(!stylists.length)setStylists(t.stylists);else if(id==='beauty_parlour')setStylists(prev=>upgradeLegacyBeautyParlourStylists(prev,'beauty_parlour'));};
 const ironInkSeeded=useRef('');
 useEffect(()=>{if(!onboardingComplete||profile.businessType!=='tattoo_studio')return;const payload:Template12WorkspaceDraft={profile,services,stylists,galleryUrls:extras.gallery||[]};const timer=setTimeout(()=>{void template12Sync.save(payload,async()=>{if(ironInkSeeded.current!==session.user.id){await ensureTemplate12Seeded();ironInkSeeded.current=session.user.id;}return syncIronInkWorkspace(session.user.id,payload.profile,payload.services,payload.stylists,payload.galleryUrls);});},900);return()=>clearTimeout(timer);},[onboardingComplete,profile,services,stylists,extras.gallery,session.user.id,template12Sync.save]);
 const chooseTemplate=(id:BusinessTypeId)=>{applyTemplate(id);setCurrentView('wizard');};
 // Template 13 customizer: opened from the template gallery demo or from this salon's website editor.
 const [archCustomizer,setArchCustomizer]=useState(false);
 const [vedaCustomizer,setVedaCustomizer]=useState(false);
 const pendingCustomizerConfig=useRef<ArchFlutterCustomizerConfig|null>(null);
 const applyCustomizerWorkspace=useCallback((next:CustomizerWorkspace)=>{setProfile(next.profile);setServiceState(next.services);setStylists(next.stylists);setExtras({...DEFAULT_EXTRAS,...next.extras});void flush().catch(()=>{});},[flush]);
 const pendingVedaWorkspace=useRef<MensWorkspace|null>(null);
 const customizeTemplate=(id:BusinessTypeId,config?:ArchFlutterCustomizerConfig,workspace?:MensWorkspace)=>{pendingCustomizerConfig.current=config??null;pendingVedaWorkspace.current=workspace??null;chooseTemplate(id);};
 useEffect(()=>{const workspace=pendingVedaWorkspace.current;if(!workspace||!isVedaTemplate(profile.businessType)&&profile.businessType!=='mens_hair_studio')return;pendingVedaWorkspace.current=null;setProfile(workspace.profile);setServiceState(workspace.services);setStylists(workspace.stylists);if(workspace.loyaltyConfig)setLoyaltyConfig(workspace.loyaltyConfig);void flush().catch(()=>{});},[profile,services,stylists,flush]);
 useEffect(()=>{const config=pendingCustomizerConfig.current;if(!config||!isArchFlutterTemplate(profile.businessType))return;pendingCustomizerConfig.current=null;applyCustomizerWorkspace(applyCustomizerConfig(config,{profile,services,stylists,extras}));},[profile,services,stylists,extras,applyCustomizerWorkspace]);
 const publish=async()=>{await flush();const {data,error}=await supabase.rpc('studioflow_publish');if(error)throw error;setPublished(data);};
 const book=async(apt:Appointment)=>{await flush();if(!published)throw new Error('Publish your salon website before accepting bookings.');const isAura=profile.businessType==='unisex_salon';const isMens=profile.businessType==='mens_hair_studio';const rpc=isMens?'studioflow_mens_book':apt.branchId?(apt.couponCode?'studioflow_branch_coupon_book':'studioflow_branch_book'):(apt.couponCode?(isAura?'studioflow_aura_coupon_book':'studioflow_coupon_book'):'studioflow_book');const {data,error}=await supabase.rpc(rpc,{p_slug:published.slug,p_request:apt});if(error)throw error;await refreshBookings();return (data?.payload||data) as Appointment;};
 const updateAppointments:React.Dispatch<React.SetStateAction<Appointment[]>>=next=>{
  const updated=typeof next==='function'?next(appointments):next;
  const changes=updated.filter(apt=>appointments.some(old=>old.id===apt.id&&old.status!==apt.status));
  if(!changes.length)return;
  void (async()=>{for(const apt of changes){const {error}=await supabase.rpc(apt.status==='completed'?'studioflow_complete_visit':'studioflow_update_booking',apt.status==='completed'?{p_id:apt.id,p_method:apt.posMethod||'cash',p_amount:Math.max(0,apt.servicePrice-(apt.amountPaid||0))}:{p_id:apt.id,p_status:apt.status});if(error)throw error;
    if(apt.status==='cancelled')await supabase.functions.invoke('studioflow-payments',{body:{action:'refundBooking',bookingId:apt.id}}).catch(()=>{});
    if(apt.status==='completed')setClients(prev=>prev.map(c=>{if(c.phone!==apt.clientPhone&&c.name.toLowerCase()!==apt.clientName.toLowerCase())return c;const earned=Math.round((loyaltyConfig.pointsPerVisit+Math.round(apt.servicePrice/100*loyaltyConfig.pointsPerHundredSpent))*(loyaltyConfig.tierMultipliers[c.loyaltyTier||'bronze']||1));const lifetime=(c.lifetimePoints||c.points||0)+earned;return {...c,points:(c.points||0)+earned,lifetimePoints:lifetime,loyaltyTier:calculateLoyaltyTier(lifetime,loyaltyConfig.tierThresholds),pointHistory:[{id:`booking-${apt.id}`,date:apt.date,description:`Completed Appointment: ${apt.serviceName}`,pointsChange:earned,type:'spend_earned' as const},...(c.pointHistory||[])]};}));
   }await refreshBookings();})().catch(error=>setSyncError(error.message));
 };

 return <div data-workspace-sync={!syncError&&!recoveryNotice&&sameWorkspace(latest.current,JSON.parse(lastSaved.current))?'saved':'pending'} className="min-h-screen bg-slate-50 text-slate-900">
  {recoveryNotice && (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-xs sm:text-sm text-amber-900 font-medium flex items-center justify-between gap-3 flex-wrap shadow-2xs" role="status">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
        <span>
          {cached.revision === account.revision
            ? 'Recovered unsaved changes from this browser session.'
            : 'A previous local draft differs from the latest cloud version.'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {cached.revision !== account.revision && (
          <button
            type="button"
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
            onClick={() => {
              const d = normalizeWorkspace(cached.draft);
              setProfile(d.profile);
              setServiceState(normalizeServices<SalonService>(d.services,'realtime services'));
              setStylists(d.stylists || []);
              setClients(d.clients || []);
              setLoyaltyConfig(d.loyaltyConfig || DEFAULT_LOYALTY_CONFIG);
              setExtras({ ...DEFAULT_EXTRAS, ...d.extras });
              setOnboardingComplete(!!d.onboardingComplete);
              localStorage.removeItem(`${cacheKey}_conflict`);
              setRecoveryNotice(false);
            }}
          >
            Restore local draft over cloud
          </button>
        )}
        <button
          type="button"
          className="px-3 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg font-semibold text-amber-900 text-xs transition-colors cursor-pointer"
          onClick={() => {
            localStorage.removeItem(`${cacheKey}_conflict`);
            setRecoveryNotice(false);
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )}
  {profile.businessType==='tattoo_studio'&&<SyncStatusBanner status={template12Sync.status} error={template12Sync.error} draftAt={template12Sync.draftAt} onRetry={()=>void template12Sync.retry()} />}
  {!clientPreview&&<><div className="h-10 lg:hidden" /><Header brandName={extras.whiteLabel.platformName} currentView={currentView} setCurrentView={setCurrentView} salonName={profile.businessName} onBuildWebsiteClick={()=>setCurrentView(onboardingComplete?'preview':'wizard')} />
  <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:w-auto z-[80] rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-slate-200/80 p-3.5 text-xs flex flex-wrap items-center gap-2.5">
    <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200/60 shrink-0">
      <span className={`w-2 h-2 rounded-full shrink-0 ${sync.includes('Saved') ? 'bg-emerald-500 animate-pulse' : sync.includes('Saving') ? 'bg-amber-500 animate-ping' : 'bg-slate-400'}`} />
      <span>{sync}</span>
    </div>
    <button
      type="button"
      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
      onClick={() => void flush().catch(() => {})}
    >
      Save now
    </button>
    <button
      type="button"
      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold transition-all cursor-pointer active:scale-95"
      onClick={() => void refreshBookings()}
    >
      Refresh bookings
    </button>
    <BusinessNotificationLink />
    <a
      href="/?recovery=1"
      className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-medium transition-colors"
    >
      Change password
    </a>
    <button
      type="button"
      className="px-2.5 py-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium transition-colors cursor-pointer"
      onClick={async () => {
        try {
          await flush();
          await supabase.auth.signOut();
        } catch {
          setSyncError('Save failed. Save your changes before signing out.');
        }
      }}
    >
      Sign out
    </button>

    {syncError && (
      <div role="alert" className="w-full max-w-lg mt-1 p-3 bg-red-50 border border-red-200/80 rounded-xl text-red-900 text-xs flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <span>{syncError}</span>
        </div>
        <button
          type="button"
          className="text-red-700 hover:text-red-950 font-bold underline text-xs cursor-pointer ml-auto"
          onClick={() => void supabase.auth.signOut()}
        >
          Sign out keeping local draft
        </button>
      </div>
    )}

    {saveConflicts.length > 0 && (
      <div className="w-full max-w-lg mt-1 p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex flex-wrap gap-2 shadow-2xs">
        <p className="w-full font-medium">Changed fields: {saveConflicts.slice(0, 5).join(', ')}</p>
        <button
          type="button"
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold cursor-pointer"
          onClick={() => void flush('local').catch(() => {})}
        >
          Keep my edits & merge
        </button>
        <button
          type="button"
          className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg font-semibold cursor-pointer"
          onClick={() => void flush('remote').catch(() => {})}
        >
          Use cloud edits & merge
        </button>
      </div>
    )}
  </div>
  </>}
  <AppErrorBoundary resetKey={currentView} onRecover={()=>setCurrentView('owner')}>
  {currentView==='owner'&&<OwnerWorkspace clients={clients} setClients={setClients} loyaltyConfig={loyaltyConfig} setLoyaltyConfig={setLoyaltyConfig} profile={profile} setProfile={setProfile} services={services} setServices={setServices} stylists={stylists} setStylists={setStylists} appointments={appointments} extras={extras} setExtras={setExtras} published={published} onPublish={publish} sessionEmail={session.user.email||''} templates={templates} onOpenPreview={()=>setCurrentView('preview')} onOpenDashboard={openDashboard} onOpenWizard={()=>setCurrentView('wizard')} onRefreshBookings={refreshBookings} sync={sync} syncError={syncError} />}

  {currentView==='landing'&&<LandingPage setCurrentView={setCurrentView} onSelectCategory={chooseTemplate} onCustomizeTemplate={customizeTemplate} />}
  {currentView==='wizard'&&<OnboardingWizard profile={profile} setProfile={setProfile} services={services} setServices={setServices} stylists={stylists} setStylists={setStylists} templates={templates} onComplete={()=>{setOnboardingComplete(true);setCurrentView('preview');}} />}
  {currentView==='preview'&&!clientPreview&&<><div className="max-w-6xl mx-auto px-4 pt-4"><WebsitePublishPanel published={published} onPublish={publish} profile={profile} services={services}/></div><SalonWebsitePreview onEnterClientPreview={()=>{setClientPreview(true);}} profile={profile} setProfile={setProfile} services={services} setServices={setServices} stylists={stylists} setStylists={setStylists} gallery={extras.gallery} policies={extras.policies} branding={extras.whiteLabel} loyaltyConfig={loyaltyConfig} onManageDashboard={openDashboard} onAddAppointment={book} onSelectCategory={applyTemplate} onMensLoyaltyChange={setLoyaltyConfig} onOpenCustomizer={isArchFlutterTemplate(profile.businessType)?()=>setArchCustomizer(true):isVedaTemplate(profile.businessType)?()=>setVedaCustomizer(true):undefined} /></>}
  {currentView==='preview'&&clientPreview&&<div className="h-dvh flex flex-col"><div className="bg-white border-b p-3 flex flex-wrap items-center gap-3"><button className="secondary-action" onClick={()=>setClientPreview(false)}>Back to Workspace Edit View</button><span className="text-xs">Client Preview Mode</span><div className="flex gap-2">{(['desktop','tablet','mobile'] as const).map(mode=><button key={mode} className="secondary-action capitalize" aria-pressed={mode===clientDevice} onClick={()=>setClientDevice(mode)}>{mode}</button>)}</div></div><div className="flex-1 min-h-0"><WebsiteDeviceFrame mode={clientDevice} title="Client-facing salon preview">{doc=><SalonWebsitePreview previewDocument={doc} readOnly profile={{...profile,subdomain:published?.slug||''}} services={services} stylists={stylists} gallery={extras.gallery} policies={extras.policies} branding={extras.whiteLabel} loyaltyConfig={loyaltyConfig} onAddAppointment={book}/>}</WebsiteDeviceFrame></div></div>}
  {archCustomizer&&isArchFlutterTemplate(profile.businessType)&&<Suspense fallback={<p role="status" className="p-8 text-center">Loading the Template 13 customizer…</p>}><ArchFlutterCustomizerGate siteId={published?.slug||''} profile={profile} services={services} stylists={stylists} extras={extras} loyaltyConfig={loyaltyConfig} publishedSlug={published?.slug||null} initialTab="brand" onApply={applyCustomizerWorkspace} onPublish={async()=>{await publish();}} onOpenPayments={()=>{setArchCustomizer(false);setCurrentView('owner');}} onClose={()=>setArchCustomizer(false)} /></Suspense>}
  {vedaCustomizer&&isVedaTemplate(profile.businessType)&&<Suspense fallback={<p role="status" className="p-8 text-center">Loading the Template 14 customizer…</p>}><VedaCustomizerGate siteId={published?.slug||''} profile={profile} services={services} stylists={stylists} publishedSlug={published?.slug||null} initialTab="launch" onApply={next=>{setProfile(next.profile);setServiceState(next.services);setStylists(next.stylists);void flush().catch(()=>{});}} onPublish={async()=>{await publish();}} onClose={()=>setVedaCustomizer(false)} /></Suspense>}
  {currentView==='dashboard'&&<SaaSDashboard templates={templates} onPreviewTemplate={id=>{location.assign(`/?template=${encodeURIComponent(id)}`);}} onCustomizeTemplate={id=>customizeTemplate(id)} ownerId={session.user.id} gallery={extras.gallery} setGallery={images=>setExtras(prev=>({...prev,gallery:images}))} initialTab={dashboardTab} profile={profile} setProfile={setProfile} services={services} setServices={setServices} stylists={stylists} setStylists={setStylists} appointments={appointments} setAppointments={updateAppointments} clients={clients} setClients={setClients} loyaltyConfig={loyaltyConfig} setLoyaltyConfig={setLoyaltyConfig} onNavigateToPreview={()=>setCurrentView('preview')} onRefreshBookings={refreshBookings} />}
  </AppErrorBoundary>
 </div>;
}
function PublishedWebsite({slug,session}:{key?:React.Key;slug:string;session:Session|null}){
 const customerAccount=useCustomerProfile(session,0);
 const [showBookings,setShowBookings]=useState(false);
 const [site,setSite]=useState<any>(null);const [error,setError]=useState('');const [retry,setRetry]=useState(0);const [countdown, setCountdown] = useState(0);
 const [devFallbackTemplate,setDevFallbackTemplate]=useState<BusinessTypeId|null>(null);
 const [authMode,setAuthMode]=useState<'signin'|'signup'|null>(null);

  useEffect(() => {
    if (!error) {
      setCountdown(0);
      return;
    }
    setCountdown(15);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setRetry(r => r + 1);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [error]);

 useEffect(()=>{if(!authMode)return;const previous=document.activeElement as HTMLElement|null;const dialog=document.querySelector<HTMLElement>('[role=dialog][aria-label="Customer account"]');dialog?.querySelector<HTMLElement>('input,button')?.focus();const keyboard=(event:KeyboardEvent)=>{if(event.key==='Escape')setAuthMode(null);if(event.key==='Tab'&&dialog){const items=Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]'));const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}};document.addEventListener('keydown',keyboard);return()=>{document.removeEventListener('keydown',keyboard);previous?.focus();};},[authMode]);
 useEffect(()=>{if(session)setAuthMode(null);},[session?.user?.id]);
 useEffect(()=>{let active=true,loaded=false,ticket=0;
   const refresh=async()=>{if(document.hidden)return;const request=++ticket;
   // A stalled read used to leave the published site on "Loading salon
   // website…" forever. Every read now has a deadline and surfaces the retry UI.
   let loadedRow:{data:any;error:any};
   try{loadedRow=await withTimeout(supabase.from('studioflow_websites').select('content').eq('slug',slug).maybeSingle(),15000,'Loading this salon website');}
   catch(deadline){loadedRow={data:null,error:{message:messageOf(deadline,'This salon website took too long to respond. Retrying will try again.')}};}
   const {data,error}=loadedRow;if(!active||request!==ticket)return;
   if(error){if(!loaded){setDevFallbackTemplate(null);setError(error.message||'Could not load this salon website.');}return;}
   if(!data){if(!loaded){const fallback=developmentTemplateForSiteSlug(slug,import.meta.env.DEV);if(fallback){setDevFallbackTemplate(fallback.id);setError('');}else{setDevFallbackTemplate(null);setError('This salon website is not published.');}}return;}
   setDevFallbackTemplate(null);
   let parsedContent = data.content;
   if (typeof data.content === 'string') {
     try {
       parsedContent = JSON.parse(data.content);
     } catch (e) {
       console.error('Failed to parse salon website content:', e);
       if(!loaded) setError('The website content is invalid.');
       return;
     }
   }
   if(!isRecord(parsedContent)||!isRecord(parsedContent.profile)){if(!loaded)setError('The salon profile is missing from this website. Please ask the owner to publish it again.');return;}
   loaded=true;setError('');setSite((prev:any)=>JSON.stringify(prev)===JSON.stringify(parsedContent)?prev:parsedContent);};
  void refresh();const channel=supabase.channel(`public-site-${slug}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'studioflow_websites',filter:`slug=eq.${slug}`},()=>void refresh()).subscribe();const interval=setInterval(()=>void refresh(),15000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{active=false;void supabase.removeChannel(channel);clearInterval(interval);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[slug,retry]);
  useEffect(()=>{
    if(!site?.profile)return;
    const cleanupSeo = applySeoMetadata(site.profile);
    const restoreIcon = applyWebsiteFavicon(document, websiteFavicon(site.branding, site.profile));
    return () => {
      cleanupSeo();
      restoreIcon();
    };
  },[site?.profile]);
 if(devFallbackTemplate)return <TemplateEntry templateId={devFallbackTemplate}/>;
 if(error)return <main className="p-10"><h1 className="text-2xl font-bold">Website unavailable</h1><p>{error.includes('not published') ? 'The salon owner has not published this website yet.' : error}</p><p className="text-sm text-slate-500 mt-2">Retrying automatically in {countdown} seconds...</p><div className="mt-4 flex flex-col gap-3"><div className="flex gap-3"><button className="primary-action" onClick={()=>{setError('');setSite(null);setRetry(r=>r+1);}}>Try again</button><a className="secondary-action" href="/">Open NEXORA</a></div><details className="mt-4 p-4 border rounded-xl"><summary className="font-semibold cursor-pointer">Need help publishing?</summary><p className="mt-2 text-sm text-slate-600">If you are the salon owner, please sign in to your Salon Workspace, complete the setup, and click the 'Publish' button in the dashboard to make your website live.</p></details></div></main>;
 if(!site)return <Loading text="Loading salon website…" />;
 const book=async(apt:Appointment)=>{if(!session){setAuthMode('signin');throw new Error('Please log in or create a customer account to continue your booking.');}const isAura=site?.profile?.businessType==='unisex_salon';const isMens=site?.profile?.businessType==='mens_hair_studio';const rpc=isMens?'studioflow_mens_book':apt.branchId?(apt.couponCode?'studioflow_branch_coupon_book':'studioflow_branch_book'):(apt.couponCode?(isAura?'studioflow_aura_coupon_book':'studioflow_coupon_book'):'studioflow_book');const {data,error}=await supabase.rpc(rpc,{p_slug:slug,p_request:apt});if(error)throw error;return data?.payload||data;};
 const content=normalizeWorkspace({...site,extras:{gallery:site.gallery,policies:site.policies,whiteLabel:site.branding}});
 return <><div className="bg-white border-b px-4 py-2 flex justify-between gap-3 text-xs"><a className="text-violet-600 font-semibold" href={'/?app=1&site='+encodeURIComponent(slug)}>Open this salon in Nexora App ↗</a><a className="text-violet-600" href="/?app=1&tab=bookings">My Bookings</a></div>{showBookings&&<SalonBookingsDialog profile={{...content.profile,subdomain:slug}} onClose={()=>setShowBookings(false)}/>} {authMode&&<div className="fixed inset-0 z-[100] bg-black/50 p-4 flex items-center justify-center" onClick={()=>setAuthMode(null)}><section role="dialog" aria-modal="true" aria-label="Customer account" className="bg-white text-slate-900 rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto p-4" onClick={e=>e.stopPropagation()}><button className="secondary-action mb-3" onClick={()=>setAuthMode(null)}>Close</button>{session?<Suspense fallback={<p role="status">Loading account settings…</p>}><WebsiteCustomerAccount session={session} account={customerAccount}/></Suspense>:<AuthPage key={authMode} compact customerMode initialMode={authMode} returnSlug={slug}/>}</section></div>}<SalonWebsitePreview key={slug} customerSignedIn={!!session} customerName={customerAccount.profile.full_name||session?.user.user_metadata?.full_name||'My account'} customerPhotoUrl={customerAccount.photoUrl} onCustomerAccount={mode=>setAuthMode(mode||'signin')} profile={{...content.profile,subdomain:slug}} services={normalizeServices<SalonService>(content.services,'published site services')} stylists={content.stylists} gallery={content.extras.gallery} policies={site.policies} branding={site.branding} loyaltyConfig={site.loyaltyConfig} onAddAppointment={book} readOnly live /></>;
}
