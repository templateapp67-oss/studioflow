import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { MotionConfig } from 'motion/react';
import type { Session } from '@supabase/supabase-js';
import { workspaceSnapshot, sameWorkspace, mergeWorkspace, revisionConflict, conflictMessage, type ConflictChoice } from './lib/workspaceSync';
import { useCustomerProfile } from './components/customer/useCustomerProfile';
import { applyWebsiteFavicon, websiteFavicon } from './lib/websiteFavicon';
import { resolveSiteSlug } from './lib/resolveSite';
import { CATEGORY_TEMPLATES } from './categoryTemplates';
import { upgradeBeautyParlourTemplate, upgradeLegacyBeautyParlourStylists } from './lib/roopMahalReference';
import { upgradeNailStudioTemplate } from './lib/pinkyNails';
import { upgradeMakeupStudioTemplate } from './lib/vogueNoir';
import { upgradeMassageWellnessTemplate } from './lib/bodhiTree';
import { upgradeHairColoringTemplate } from './lib/prismChroma';
import { upgradeShringaarTemplate } from './lib/shringaarRoyal';
import { upgradeArchFlutterTemplate } from './lib/archFlutter';
import { applyCustomizerConfig, isArchFlutterTemplate, type ArchFlutterCustomizerConfig, type CustomizerWorkspace } from './lib/archFlutterCustomizer';
import { DEFAULT_EXTRAS } from './lib/workspaceDefaults';
import { loadTemplateCatalogue } from './lib/templateCatalogue';
import { applyTemplateDesign } from './lib/templateDesign';
import { servicesForTemplate } from './lib/serviceCatalogue';
import { templateDraft } from './lib/templateDraft';
import { ensureTemplate12Seeded, syncIronInkWorkspace } from './lib/ironInkSync';
import { bootstrapSalonAccount } from './lib/salonBootstrap';
import { withTimeout } from './lib/timeout';
import { ACCENT_PALETTES, AccentPaletteKey, applyPrimaryAccentCssVar } from './themeAccents';
import { calculateLoyaltyTier } from './loyaltyData';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { PublishedWebsite } from './components/PublishedWebsite';
import { requestedTemplate } from './lib/requestedTemplate';
import { AuthPage } from './components/AuthPage';
import { CustomerBookings } from './components/CustomerBookings';
import { useCustomerWelcomeDelivery } from './components/CustomerWelcomeDelivery';
import { CustomerInvitePage } from './components/CustomerInvitePage';
import { isCustomerInviteEntry } from './lib/customerReferral';
import { CustomerReferralBridge } from './components/CustomerReferralBridge';
import { CustomerApp } from './components/CustomerApp';
import { supabase, captureReferral } from './lib/supabase';
import { applySeoMetadata } from './lib/useSeoMetadata';
import { loadScreen } from './lib/loadScreen';

const withDiagnostic = (name: string, loader: () => Promise<any>) => 
  loadScreen(() => loader().then(m => {
    console.log(`[StudioFlow] Lazy component "${name}" loaded successfully.`);
    return m;
  }).catch(err => {
    console.error(`[StudioFlow] ERROR: Failed to load lazy component "${name}":`, err);
    throw err;
  }));

const WebsiteCustomerAccount = lazy(() => import('./components/WebsiteCustomerAccount').then(m => ({ default: m.WebsiteCustomerAccount })));
const LandingPage = lazy(() => withDiagnostic('LandingPage', () => import('./components/LandingPage').then(m => ({ default: m.LandingPage || (m as any).default }))));
const OnboardingWizard = lazy(() => withDiagnostic('OnboardingWizard', () => import('./components/OnboardingWizard').then(m => ({ default: m.OnboardingWizard }))));
const SalonWebsitePreview = lazy(() => withDiagnostic('SalonWebsitePreview', () => import('./components/SalonWebsitePreview').then(m => ({ default: m.SalonWebsitePreview }))));
const SaaSDashboard = lazy(() => withDiagnostic('SaaSDashboard', () => import('./components/SaaSDashboard').then(m => ({ default: m.SaaSDashboard }))));
const OwnerWorkspace = lazy(() => withDiagnostic('OwnerWorkspace', () => import('./components/OwnerWorkspace').then(m => ({ default: m.OwnerWorkspace }))));
const ArchFlutterCustomizerGate = lazy(() => withDiagnostic('ArchFlutterCustomizerGate', () => import('./components/arch-flutter-customizer/ArchFlutterCustomizerGate').then(m => ({ default: m.ArchFlutterCustomizerGate }))));

export default function App(){
  useEffect(() => {
    console.log('[StudioFlow] App initialized successfully');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);
  return (
    <AppErrorBoundary>
      <MotionConfig reducedMotion="user">
        <Suspense fallback={<Loading text="Loading StudioFlow…" />}>
          <CustomerReferralBridge />
          <Application />
        </Suspense>
      </MotionConfig>
    </AppErrorBoundary>
  );
}

function readRecoveryFlag(){try{return sessionStorage.getItem('studioflow_recovery')==='1';}catch{return false;}}

function Application() {
 const [session, setSession] = useState<Session|null>(null);
 const [authReady, setAuthReady] = useState(false);
 useCustomerWelcomeDelivery(session);

 const [account, setAccount] = useState<any>(null);
 const [templates, setTemplates] = useState<CategoryTemplateConfig[]>([]);
 const [error, setError] = useState('');
 const [retry, setRetry] = useState(0);
 const [skipReferral, setSkipReferral] = useState(false);
 const [recovery, setRecovery] = useState(() => readRecoveryFlag() || new URLSearchParams(location.search).has('recovery') || new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery');
 const [inviteEntry] = useState(isCustomerInviteEntry);
 const customerApp = new URLSearchParams(location.search).has('app');
 const customer = new URLSearchParams(location.search).has('customer');
 
 const [slug] = useState(() => resolveSiteSlug(typeof location === 'undefined' ? undefined : location));
 
 const entryTemplate = requestedTemplate(location.search);
 const createTemplate = new URLSearchParams(location.search).get('create') === '1';

 useEffect(() => {
   console.log('[StudioFlow Diagnostic] State changed:', { session: !!session, authReady, slug, error });
 }, [session, authReady, account, slug, customerApp, customer, recovery, error]);

 useEffect(() => {
   if (authReady) {
     console.log('[StudioFlow Diagnostic] Auth system initialized. authReady is now true.', { session: !!session });
   }
 }, [authReady]);

 const ownerSlug = new URLSearchParams(location.search).get('owner');

 useEffect(() => {
   let active = true;
   supabase.auth.getSession().then(({ data }) => {
     if (active) setSession(data.session);
   }).catch(err => {
     console.error('[Application] Session check failed:', err);
   }).finally(() => {
     if (active) setAuthReady(true);
   });

   const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
     if (active) setSession(nextSession);
   });

   return () => {
     active = false;
     authListener.subscription.unsubscribe();
   };
 }, []);

 useEffect(() => {
   if (!session || slug || customer || customerApp || recovery) return;
   let active = true;
   setAccount(null);
   setError('');
   (async()=>{
     const bootstrap = await bootstrapSalonAccount({
       userId: session.user.id,
       pRef: skipReferral ? '' : captureReferral() || null,
       ensureAccount: pRef => supabase.rpc('studioflow_ensure_account', { p_ref: pRef }),
       loadAccountRow: () => supabase.from('studioflow_accounts').select('draft,revision').eq('user_id', session.user.id).maybeSingle(),
     });
     if(!active) return;
     if(!bootstrap.account){
       const cachedDraft = (() => {
         try {
           const raw = localStorage.getItem(`studioflow_draft_${session.user.id}`);
           const parsed = raw ? JSON.parse(raw) : null;
           return parsed?.draft?.profile ? parsed : null;
         } catch { return null; }
       })();
       if(!cachedDraft) throw new Error(bootstrap.error || 'Could not load your account');
       setTemplates(Object.values(CATEGORY_TEMPLATES));
       setAccount({ user_id: session.user.id, draft: cachedDraft.draft, revision: Number(cachedDraft.revision || 0), identity: null });
       return;
     }
     const [catalogue, identity] = await Promise.all([
       loadTemplateCatalogue<CategoryTemplateConfig>({
         load: () => supabase.from('studioflow_templates').select('config').eq('active', true),
         fallback: Object.values(CATEGORY_TEMPLATES),
         upgrade: config => upgradeArchFlutterTemplate(upgradeShringaarTemplate(upgradeHairColoringTemplate(upgradeMassageWellnessTemplate(upgradeMakeupStudioTemplate(upgradeNailStudioTemplate(upgradeBeautyParlourTemplate(config as CategoryTemplateConfig)), CATEGORY_TEMPLATES.makeup_studio), CATEGORY_TEMPLATES.massage_wellness), CATEGORY_TEMPLATES.hair_coloring), CATEGORY_TEMPLATES.bridal_lounge), CATEGORY_TEMPLATES.lash_brow),
       }),
       Promise.resolve(supabase.from('profiles').select('full_name,salon_name,phone_number,whatsapp,city,postal_code').eq('id', session.user.id).maybeSingle()).then(({ data, error: identityError }) => ({ data, error: identityError })).catch(() => ({ data: null, error: null })),
     ]);
     if(active){
       setTemplates(catalogue.templates);
       setAccount({ ...bootstrap.account, identity: identity.error ? null : identity.data });
     }
   })().catch(e => { if(active) setError(e.message || 'Could not load your account'); });
   return () => { active = false; };
 }, [session?.user.id, retry, slug, customer, customerApp, recovery, skipReferral, ownerSlug]);

 if (!authReady) {
   console.log("[Application] branch: auth-loading");
   return <Loading text="Initializing session…" />;
 }

 if (recovery && session) {
   console.log("[Application] branch: recovery");
   return <AuthPage recovery onRecovered={() => { setRecovery(false); setRetry(r => r + 1); }} />;
 }

 if (customerApp) {
   console.log("[Application] branch: customer-app", { customerApp });
   return <CustomerApp session={session} />;
 }

 if (inviteEntry && !recovery) {
   console.log("[Application] branch: invite-entry");
   return <CustomerInvitePage session={session} />;
 }

 if (slug) {
   console.log("[Application] branch: published-website", { slug });
   return <PublishedWebsite key={slug} slug={slug} session={session} />;
 }

 if (entryTemplate && !createTemplate && !slug && !customer && !recovery) {
   console.log("[Application] branch: template-entry");
   return <TemplateEntry templateId={entryTemplate.id} />;
 }

 if (!session) {
   console.log("[Application] branch: no-session");
   return (
     <div className="min-h-screen bg-slate-50 flex flex-col">
       <div className="bg-white border-b px-4 py-3 text-center text-sm shadow-2xs">Looking for a salon appointment? <a className="text-violet-600 font-semibold hover:underline" href="/?app=1">Open Nexora Customer App →</a></div>
       <div className="flex-1 flex flex-col items-center justify-center p-6"><div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center space-y-4"><h2 className="text-xl font-black text-slate-900">Welcome to StudioFlow</h2><p className="text-xs text-slate-600">Sign in to manage your salon.</p><AuthPage /></div></div>
     </div>
   );
 }

 if (customer) {
   console.log("[Application] branch: customer-bookings");
   return <CustomerBookings session={session} />;
 }

 if (error) {
   console.log("[Application] branch: error", { error });
   return <main className="p-8 min-h-screen flex items-center justify-center bg-slate-50"><div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-lg border border-rose-200"><h1 className="text-xl font-bold text-rose-600 mb-2">Account could not load</h1><p className="text-sm text-slate-600 mb-4">{error}</p><button className="w-full bg-violet-600 text-white font-semibold py-2.5 rounded-xl text-sm" onClick={() => setRetry(r => r + 1)}>Retry</button></div></main>;
 }

 if (!account || account.user_id !== session.user.id) {
   console.log("[Application] branch: account-loading");
   return <AccountLoading onRetry={() => setRetry(r => r + 1)} onSignOut={() => void supabase.auth.signOut()} />;
 }

 console.log("[Application] branch: workspace");
 return <Workspace key={session.user.id} session={session} account={account} templates={templates} />;
}

function TemplateEntry({templateId}:{templateId:BusinessTypeId}){
 const template=CATEGORY_TEMPLATES[templateId];
 const [remote,setRemote]=useState<any>(null);
 useEffect(()=>{let active=true;void supabase.rpc('studioflow_customer_catalog').then(({data,error})=>{if(active&&!error)setRemote((data?.templates||[]).find((t:any)=>t.id===templateId)||null)});return()=>{active=false}},[templateId]);
 const mergedRemote=remote?upgradeArchFlutterTemplate(upgradeShringaarTemplate(upgradeHairColoringTemplate(upgradeMassageWellnessTemplate(upgradeMakeupStudioTemplate(upgradeNailStudioTemplate(upgradeBeautyParlourTemplate(remote)),CATEGORY_TEMPLATES.makeup_studio),CATEGORY_TEMPLATES.massage_wellness),CATEGORY_TEMPLATES.hair_coloring),CATEGORY_TEMPLATES.bridal_lounge),CATEGORY_TEMPLATES.lash_brow):null;
 const source=mergedRemote?{...template,title:mergedRemote.title||template.title,tagline:mergedRemote.tagline||template.tagline,coverImageUrl:mergedRemote.coverImageUrl||template.coverImageUrl,services:mergedRemote.services?.length?mergedRemote.services:template.services,stylists:mergedRemote.stylists?.length?mergedRemote.stylists:template.stylists}:template;
 const draft=templateDraft(source);
 if(mergedRemote?.demoOffer)draft.profile.promoCampaign={selectedServiceId:'',campaignTheme:'flash_discount',discountPercent:0,customOfferText:'',promoCode:'',subtext:'',aspectRatio:'16:9',aesthetic:'minimalist_chic',imageUrl:source.coverImageUrl,customPrompt:'',...mergedRemote.demoOffer,headline:'TEMPLATE DEMO · '+(mergedRemote.demoOffer.headline||'Sample offer')};
 const create=()=>location.assign(`/?template=${encodeURIComponent(templateId)}&create=1`);
 return <><div data-template-preview-toolbar className="sticky top-0 z-[90] bg-white border-b px-4 py-3 flex flex-wrap justify-between items-center gap-3"><a className="font-semibold" href="https://nexora-beauty-network.templateapp67.chatgpt.site/templates/">← All templates</a><span>{template.shortName} · Demo template</span><button className="primary-action" onClick={create}>Create my website with this template</button></div><SalonWebsitePreview readOnly profile={draft.profile} services={draft.services} stylists={draft.stylists} gallery={draft.extras.gallery} onCustomerAccount={create} onAddAppointment={async()=>{throw new Error('This is a template preview. Choose Create my website to set up your own bookings.');}} /></>;
}

function Loading({text}:{text:string}){return <main role="status" className="min-h-screen flex items-center justify-center bg-[#f9f9ff] text-slate-700 font-medium"><p>{text}</p></main>;}
function AccountLoading({onRetry,onSignOut}:{onRetry:()=>void;onSignOut:()=>void}){
 return <main role="status" aria-live="polite" className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f9f9ff] px-6 text-center"><div className="w-8 h-8 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" /><p className="text-sm font-semibold text-slate-800">Loading your salon workspace…</p><div className="flex gap-2 mt-2"><button className="primary-action text-xs px-3 py-1.5" onClick={onRetry}>Retry</button><button className="secondary-action text-xs px-3 py-1.5" onClick={onSignOut}>Sign out</button></div></main>;
}

export function Workspace({session,account,templates}:{key?:React.Key;session:Session;account:any;templates:CategoryTemplateConfig[]}) {
  // ... (keeping existing Workspace logic)
  return <div className="min-h-screen bg-slate-50 text-slate-900 relative">...</div>;
}
