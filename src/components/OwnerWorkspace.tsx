import {ClinicEnquiries} from './dermacure/ClinicEnquiries';
import {AcademyEnquiriesPanel} from './vogue-noir/AcademyEnquiriesPanel';
import {VogueNoirEditor} from './vogue-noir/VogueNoirEditor';
import {BodhiTreeEditor} from './bodhi-tree/BodhiTreeEditor';
import {PrismChromaEditor} from './prism-chroma/PrismChromaEditor';
import {IronInkEditor} from './iron-ink/IronInkEditor';
import {upgradeLegacyMakeupStudioStylists} from '../lib/vogueNoir';
import {clinicPriceIsVerified,clinicPublicServices} from '../lib/dermacureContent';
import {SalonPolicyEditor} from './SalonPolicyEditor';
import {AddOnEditor,ComparisonEditor} from './ConversionEditors';
import {LoyaltyManagement} from './LoyaltyManagement';
import type {ClientRecord,LoyaltyConfig} from '../types';
import {WEBSITE_EDIT_STEPS,OWNER_BUSINESS_TOOLS,ownerModule,adjacentOwnerStep} from '../lib/ownerNavigation';
import {ContentReviewGuide} from './ContentReviewGuide';
import {AboutStudioEditor} from './AboutStudioEditor';
import {BrandIdentityPrompt} from './BrandIdentityPrompt';
import {brandIdentityContext} from '../lib/brandIdentityPrompt';
import type {CampaignAd} from '../lib/campaignBanner';
import {PhotoGalleryManager} from './PhotoGalleryManager';
import {OwnerCustomerContacts} from './OwnerCustomerContacts';
import { HeroBannerEditor } from './HeroBannerEditor';
import {BrandImageField} from './BrandImageField';
import { WebsiteContentManager } from './WebsiteContentManager';
import { EnvironmentDiagnostic } from './EnvironmentDiagnostic';
import { PromoStudio } from './PromoStudio';
import {servicesForTemplate} from '../lib/serviceCatalogue';
import { applyTemplateDesign } from '../lib/templateSelection';
import { upgradeLegacyBeautyParlourStylists } from '../lib/roopMahalReference';
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import { SocialConnectivityStep } from './SocialConnectivityStep';
import { SeoSettingsManager } from './SeoSettingsManager';
import { type Extras } from '../lib/workspaceDefaults';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Appointment, BusinessTypeId, SalonProfile, SalonService, Stylist } from '../types';
import { ServiceManagement } from './ServiceManagement';
import { TeamManagement } from './TeamManagement';
import { BranchManagementPanel } from './BranchManagementPanel';
import { BranchStaffScheduleEditor } from './BranchStaffScheduleEditor';
import { BranchLocationsEditor } from './BranchLocationsEditor';
import { InteractiveMapSetup } from './InteractiveMapSetup';
import { ReferralPanel } from './ReferralPanel';
import { WebsitePublishPanel } from './WebsitePublishPanel';
import { OwnerPosPanel } from './OwnerPosPanel';
import type { CategoryTemplateConfig } from '../types';
import { SyncIndicator } from './SyncIndicator';

type Props = {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
  services: SalonService[];
  setServices: React.Dispatch<React.SetStateAction<SalonService[]>>;
  stylists: Stylist[];
  setStylists: React.Dispatch<React.SetStateAction<Stylist[]>>;
  appointments: Appointment[];
  clients: ClientRecord[];
  setClients: React.Dispatch<React.SetStateAction<ClientRecord[]>>;
  loyaltyConfig: LoyaltyConfig;
  setLoyaltyConfig: React.Dispatch<React.SetStateAction<LoyaltyConfig>>;
  extras: Extras;
  setExtras: React.Dispatch<React.SetStateAction<Extras>>;
  published: { slug: string; published_at: string } | null;
  onPublish: () => Promise<void>;
  sessionEmail: string;
  templates: CategoryTemplateConfig[];
  onOpenPreview: () => void;
  onOpenDashboard: (section?:string) => void;
  onOpenWizard: () => void;
  onRefreshBookings?: () => Promise<void>|void;
  sync: string;
  syncError: string;
};

const Field = ({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (value: string) => void; type?: string }) => <label className="block"><span className="field-label">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="workspace-input" /></label>;
const Toggle = ({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (checked: boolean) => void; hint?: string }) => <label className="workspace-toggle"><span><strong>{label}</strong>{hint && <small>{hint}</small>}</span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /></label>;
const Metric = ({ icon, label, value }: { icon: string; label: string; value: string }) => <article className="metric-card"><span className="material-symbols-outlined">{icon}</span><small>{label}</small><strong>{value}</strong></article>;
const Nav = ({id,label,icon,active,onClick,number}:{key?:React.Key;id:number;label:string;icon:string;active:number;onClick:(id:number)=>void;number?:number}) => (
  <button 
    type="button" 
    onClick={()=>onClick(id)} 
    aria-current={active===id?'page':undefined} 
    title={`${number?`${number}. `:''}${label}`} 
    className={`w-full flex items-center gap-2.5 px-3 py-2 my-0.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
      active===id 
        ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md font-bold' 
        : 'text-slate-300 hover:text-white hover:bg-slate-800'
    }`}
  >
    {number && (
      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
        active===id ? 'bg-white text-rose-700' : 'bg-slate-800 text-slate-400 border border-slate-700'
      }`}>
        {number}
      </span>
    )}
    <span className="material-symbols-outlined text-base shrink-0" aria-hidden="true">{icon}</span>
    <span className="truncate font-semibold text-xs tracking-tight">{label}</span>
  </button>
);

const ActionPage = ({ eyebrow, title, text, icon, action, onAction, secondary, onSecondary }: { eyebrow: string; title: string; text: string; icon: string; action: string; onAction: () => void; secondary?: string; onSecondary?: () => void }) => <section className="workspace-card action-page"><div className="action-icon"><span className="material-symbols-outlined">{icon}</span></div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p className="muted">{text}</p><div className="action-buttons"><button className="primary-action" onClick={onAction}>{action}</button>{secondary && <button className="secondary-action" onClick={onSecondary}>{secondary}</button>}</div></section>;

export const OwnerWorkspace: React.FC<Props> = ({ profile, setProfile, services, setServices, stylists, setStylists, appointments, clients, setClients, loyaltyConfig, setLoyaltyConfig, extras, setExtras, published, onPublish, sessionEmail, templates, onOpenPreview, onOpenDashboard, onOpenWizard, onRefreshBookings, sync, syncError }) => {
  const [active, setActive] = useState(() => ownerModule(new URLSearchParams(location.search).get('module')));
  const headingRef=useRef<HTMLHeadingElement>(null);
  const navigate=(id:number)=>{const next=ownerModule(String(id));setActive(next);const url=new URL(location.href);url.searchParams.set('module',String(next));history.pushState(null,'',url);};
  useEffect(()=>{const back=()=>setActive(ownerModule(new URLSearchParams(location.search).get('module')));window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back);},[]);
  useEffect(()=>{headingRef.current?.focus({preventScroll:true});headingRef.current?.scrollIntoView({block:'start'});},[active]);
  const [notice, setNotice] = useState('');
  const [campaignAd,setCampaignAd]=useState<CampaignAd|null>(null);
  const accent = profile.customAccentColor || '#a21caf';
  const revenue = appointments.reduce((sum, item) => sum + (Number(item.amountPaid) || 0), 0);
  const completion = useMemo(() => Math.round(([profile.businessName, profile.phone, profile.email, profile.address, profile.coverImageUrl, services.length, stylists.length].filter(Boolean).length / 7) * 100), [profile, services.length, stylists.length]);
  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600); };
  const saveExtras = (next: Extras) => setExtras(next);
  const patchProfile = (key: keyof SalonProfile, value: unknown) => setProfile((prev) => ({ ...prev, [key]: value }));
  const chooseTemplate = (id: BusinessTypeId) => { const template = templates.find(t => t.id === id) || CATEGORY_TEMPLATES[id]; if (!template) return; setServices(servicesForTemplate(services,profile,template)); setProfile((prev) => ({...applyTemplateDesign(prev, template),serviceCatalogueInitialized:true})); if(!stylists.length)setStylists(template.stylists); else if(id==='beauty_parlour')setStylists(prev=>upgradeLegacyBeautyParlourStylists(prev,'beauty_parlour')); else if(id==='makeup_studio')setStylists(prev=>upgradeLegacyMakeupStudioStylists(prev,'makeup_studio')); flash(`${template.shortName} template applied`); };


  const renderContent = () => {
    if (active === 30) return <section className="workspace-card"><EnvironmentDiagnostic profile={profile}/></section>;
    if (active === 32) return <BranchManagementPanel profile={profile} setProfile={setProfile}/>;
    if (active === 27) return <section className="workspace-card"><AboutStudioEditor profile={profile} setProfile={setProfile}/></section>;
    if (active === 28) return <PromoStudio profile={profile} setProfile={setProfile} services={services} onAdReady={setCampaignAd}/>;
    if (active === 29) return <LoyaltyManagement clients={clients} setClients={setClients} loyaltyConfig={loyaltyConfig} setLoyaltyConfig={setLoyaltyConfig} profile={profile} primaryAccentColor={accent} onNavigateToPreview={onOpenPreview}/>;
    if (active === 16) return <WebsiteContentManager services={services} showAbout={false} showGallery={false} profile={profile} setProfile={setProfile} gallery={extras.gallery} setGallery={gallery=>setExtras(prev=>({...prev,gallery}))}/>;
    if (active === 31) return <SeoSettingsManager profile={profile} setProfile={setProfile}/>;
    if(active===26)return <OwnerCustomerContacts profile={profile} ad={campaignAd}/>;
    if (active === 22) return <div className="stack"><PromoStudio profile={profile} setProfile={setProfile} services={services} onAdReady={setCampaignAd}/><OwnerCustomerContacts profile={profile} ad={campaignAd}/></div>;
    if (active === 1) return <section className="workspace-card"><p className="eyebrow">Secure owner access</p><h2>Signed in</h2><p className="muted">{sessionEmail}</p><p>Your profile and dashboard are saved to your Supabase account.</p></section>;
    if (active === 2) return <section className="workspace-card"><p className="eyebrow">Website editor</p><h2>Business details</h2><div className="form-grid"><Field label="Website address (3–63 lowercase letters, numbers or hyphens)" value={profile.subdomain} onChange={(v) => patchProfile('subdomain', v.toLowerCase().replace(/[^a-z0-9-]/g, ''))} /><Field label="Business name" value={profile.businessName} onChange={(v) => patchProfile('businessName', v)} /><Field label="Owner name" value={profile.ownerName} onChange={(v) => patchProfile('ownerName', v)} /><Field label="Business email" value={profile.email} onChange={(v) => patchProfile('email', v)} /><Field label="Phone" value={profile.phone} onChange={(v) => patchProfile('phone', v)} /><Field label="Tagline" value={profile.tagline} onChange={(v) => patchProfile('tagline', v)} /></div><p className="muted mt-4">Salon ki story aur owner photo ke liye next steps mein About our studio kholein.</p></section>;
    if (active === 3) return <div className="stack"><AddOnEditor profile={profile} setProfile={setProfile} services={services}/><ServiceManagement services={services} setServices={setServices} primaryAccentColor={accent} profile={profile} onNavigateToPreview={onOpenPreview} /></div>;
    if (active === 4) return <div className="stack"><TeamManagement setServices={setServices} businessType={profile.businessType} stylists={stylists} setStylists={setStylists} services={services} primaryAccentColor={accent} onNavigateToPreview={onOpenPreview} /><BranchStaffScheduleEditor branches={profile.branches || []} stylists={stylists} setStylists={setStylists}/></div>;
    if (active === 5) return <section className="workspace-card"><PhotoGalleryManager profile={profile} setProfile={setProfile} gallery={extras.gallery} setGallery={gallery=>setExtras(prev=>({...prev,gallery}))}/><ComparisonEditor profile={profile} setProfile={setProfile}/></section>;
    if (active === 6) return <SocialConnectivityStep profile={profile} setProfile={setProfile} onContinue={onOpenPreview}/>;
    if (active === 7) return <div className="stack"><InteractiveMapSetup profile={profile} setProfile={setProfile} themePrimaryColor={accent} /><section className="workspace-card"><h2>Operating hours</h2><div className="form-grid three"><Field label="Mon–Fri (except Tuesday)" value={profile.workingHoursMonFri || '10:00 AM – 8:00 PM'} onChange={(v) => patchProfile('workingHoursMonFri', v)} /><Field label="Tuesday" value={profile.workingHoursTue || ''} onChange={(v) => patchProfile('workingHoursTue', v)} /><Field label="Sunday" value={profile.workingHoursSun || '11:00 AM – 6:00 PM'} onChange={(v) => patchProfile('workingHoursSun', v)} /></div></section><BranchLocationsEditor profile={profile} setProfile={setProfile}/></div>;
    if (active === 8) return <section className="workspace-card"><p className="eyebrow">Website editor</p><h2>Contact & booking rules</h2><div className="form-grid"><Field label="WhatsApp bookings" value={profile.whatsapp} onChange={(v) => patchProfile('whatsapp', v)} /><Field label="Minimum lead time (hours)" value={extras.bookingLeadHours} type="number" onChange={(v) => saveExtras({ ...extras, bookingLeadHours: Number(v) })} /><p className="p-4 rounded-xl bg-emerald-50 text-sm"><strong>Platform policy: mandatory 25% advance.</strong><br/>Razorpay payment verification confirms the appointment. Balance is due at the salon.</p></div></section>;
    if (active === 9) return <section className="workspace-card"><p className="eyebrow">Website editor</p><h2>Choose a template</h2><div className="template-grid">{templates.map((template) => ({ id: template.id, title: template.shortName, icon: template.icon, paletteName: template.paletteLabel })).map((item) => <button key={item.id} onClick={() => chooseTemplate(item.id)} className={profile.businessType === item.id ? 'template-card selected' : 'template-card'}><span className="material-symbols-outlined">{item.icon}</span><strong>{item.title}</strong><small>{item.paletteName}</small></button>)}</div></section>;
    if (active === 10) return <div className="stack"><HeroBannerEditor profile={profile} setProfile={setProfile}/><section className="workspace-card"><p className="eyebrow">Website editor</p><h2>Customize appearance</h2><BrandIdentityPrompt profile={profile}/><div className="form-grid"><BrandImageField label="Brand logo" logo value={profile.logoUrl || ''} onChange={(v) => patchProfile('logoUrl', v)} /><BrandImageField label="Website favicon" logo uploadName="Favicon" hint="Use a square PNG, ideally 256 × 256 px. Shown in your published website’s browser tab. If empty, your salon logo is used." value={extras.whiteLabel.faviconUrl || ''} onChange={faviconUrl => setExtras(prev => ({...prev, whiteLabel: {...prev.whiteLabel, faviconUrl}}))} /><label><span className="field-label">Brand accent</span><input className="color-input" type="color" value={brandIdentityContext(profile).primary} onChange={(e) => patchProfile('customAccentColor', e.target.value)} /></label></div></section>{profile.businessType==='makeup_studio'&&<VogueNoirEditor profile={profile} setProfile={setProfile}/>}{profile.businessType==='massage_wellness'&&<BodhiTreeEditor profile={profile} setProfile={setProfile}/>}{profile.businessType==='hair_coloring'&&<PrismChromaEditor profile={profile} setProfile={setProfile}/ >}{profile.businessType==='tattoo_studio'&&<IronInkEditor profile={profile} setProfile={setProfile} services={services} setServices={setServices} loyaltyConfig={loyaltyConfig} setLoyaltyConfig={setLoyaltyConfig}/>}</div>;
    if (active === 11) return <ContentReviewGuide profile={profile} services={services} stylists={stylists} onNavigate={navigate} onPreview={onOpenPreview} onAddAbout={() => { if (!profile.about?.trim()) patchProfile('about', `Welcome to ${profile.businessName || 'our salon'}, where thoughtful care and expert technique come together. Explore our signature services and book a time that works for you.`); }}/>;
    if (active === 12) return <ActionPage eyebrow="Website editor" title="Preview your website" text="Review the customer experience on desktop and mobile before publishing." icon="preview" action="Open interactive preview" onAction={onOpenPreview} />;
    if (active === 13) return <WebsitePublishPanel published={published} onPublish={onPublish} profile={profile} services={services} />;
    if (active === 18) return <section><div className="metric-grid"><Metric icon="payments" label="Revenue collected" value={`₹${revenue.toLocaleString('en-IN')}`} /><Metric icon="event_available" label="Bookings" value={String(appointments.length)} /><Metric icon="groups" label="Team members" value={String(stylists.length)} /><Metric icon="fact_check" label="Setup complete" value={`${completion}%`} /></div><div className="workspace-card intro-card"><div><p className="eyebrow">Business control centre</p><h2>Good to see you, {profile.ownerName.split(' ')[0]}</h2><p className="muted">Your website, bookings and brand are managed from one white-label workspace.</p></div><button className="primary-action" onClick={()=>onOpenDashboard()}>Open detailed dashboard</button></div><WebsitePublishPanel published={published} onPublish={onPublish} profile={profile} services={services} /></section>;

    if (active === 20) return <section className="stack space-y-4"><section className="workspace-card"><p className="eyebrow">Business tools</p><h2>Bookings & calendar</h2><button className="primary-action" onClick={()=>onOpenDashboard('demo')}>₹0 Demo Bookings — View customer tests</button></section>{profile.businessType==='skincare_clinic'&&<ClinicEnquiries/>}{profile.businessType==='makeup_studio'&&<AcademyEnquiriesPanel/>}<OwnerPosPanel slug={published?.slug||profile.subdomain} services={profile.businessType==='skincare_clinic'?clinicPublicServices(profile,services).filter(clinicPriceIsVerified):services} stylists={stylists} appointments={appointments} branches={profile.branches||[]} onChanged={async()=>{await onRefreshBookings?.();}}/><div className="workspace-card table-wrap"><table><thead><tr><th>Client</th><th>Service</th><th>Date & time</th><th>Team</th><th>Status</th><th>Paid</th></tr></thead><tbody>{appointments.map((item) => <tr key={item.id}><td><strong>{item.clientName}</strong><small>{item.clientPhone}</small></td><td>{item.serviceName}</td><td>{item.date}<small>{item.time}</small></td><td>{item.stylistName}</td><td><span className={`status ${item.status}`}>{item.status}</span></td><td>₹{Number(item.amountPaid||0).toLocaleString('en-IN')} / ₹{Number(item.servicePrice||0).toLocaleString('en-IN')}</td></tr>)}</tbody></table></div></section>;
    if (active === 21) return <section><div className="metric-grid"><Metric icon="account_balance_wallet" label="Collected" value={`₹${revenue.toLocaleString('en-IN')}`} /><Metric icon="receipt_long" label="Average ticket" value={`₹${appointments.length ? Math.round(revenue / appointments.length).toLocaleString('en-IN') : 0}`} /><Metric icon="pending_actions" label="Pending value" value={`₹${appointments.filter((a) => a.paymentStatus !== 'paid_full').reduce((s, a) => s + Math.max(0, (Number(a.servicePrice) || 0) - (Number(a.amountPaid) || 0)), 0).toLocaleString('en-IN')}`} /><Metric icon="trending_up" label="Paid bookings" value={`${appointments.filter((a) => (Number(a.amountPaid) || 0) > 0).length}`} /></div><section className="workspace-card revenue-panel"><h2>Revenue mix</h2>{['paid_full', 'paid_deposit', 'pay_at_salon'].map((status) => { const count = appointments.filter((a) => a.paymentStatus === status).length; return <div className="revenue-row" key={status}><span>{status.replaceAll('_', ' ')}</span><div><i style={{ width: `${appointments.length ? Math.max(8, count / appointments.length * 100) : 0}%` }} /></div><strong>{count}</strong></div>; })}</section><OwnerPosPanel slug={published?.slug||profile.subdomain} services={profile.businessType==='skincare_clinic'?clinicPublicServices(profile,services).filter(clinicPriceIsVerified):services} stylists={stylists} appointments={appointments} branches={profile.branches||[]} onChanged={async()=>{await onRefreshBookings?.();}}/></section>;

    if (active === 23) return <SalonPolicyEditor extras={extras} setExtras={setExtras}/>;
    if (active === 24) return <ReferralPanel />;
    return <section className="workspace-card"><span className="premium-pill">Platform branding</span><h2 className="premium-title">Branding & white-label settings</h2><p className="muted">Replace platform identity with your own brand across the owner portal and customer experience.</p><div className="form-grid"><Field label="Platform name" value={extras.whiteLabel.platformName} onChange={(v) => saveExtras({ ...extras, whiteLabel: { ...extras.whiteLabel, platformName: v } })} /><Field label="Support email" value={extras.whiteLabel.supportEmail} onChange={(v) => saveExtras({ ...extras, whiteLabel: { ...extras.whiteLabel, supportEmail: v } })} /><Field label="Custom domain" value={extras.whiteLabel.customDomain} onChange={(v) => saveExtras({ ...extras, whiteLabel: { ...extras.whiteLabel, customDomain: v } })} /><BrandImageField label="Website favicon" logo uploadName="Favicon" hint="Use a square PNG, ideally 256 × 256 px. Shown in your published website’s browser tab. If empty, your salon logo is used." value={extras.whiteLabel.faviconUrl || ''} onChange={faviconUrl => setExtras(prev => ({...prev, whiteLabel: {...prev.whiteLabel, faviconUrl}}))} /><Toggle label="Show “Powered by StudioFlow”" hint="Keep this off for a completely white-label customer experience." checked={extras.whiteLabel.poweredBy} onChange={(v) => saveExtras({ ...extras, whiteLabel: { ...extras.whiteLabel, poweredBy: v } })} /></div><button className="primary-action save-brand" onClick={() => flash('Branding changes queued for Supabase save')}>Save branding</button></section>;
  };

  const stepIndex=WEBSITE_EDIT_STEPS.findIndex(step=>step.id===active);
  const currentStep=WEBSITE_EDIT_STEPS[stepIndex];
  const currentLabel=currentStep?.label||OWNER_BUSINESS_TOOLS.find(tool=>tool.id===active)?.label||'Owner workspace';
  const previous=adjacentOwnerStep(active,-1),next=adjacentOwnerStep(active,1);
  const stepControls=<div className="flex items-center gap-3"><button type="button" className="px-4 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-40" disabled={previous===null} onClick={()=>previous!==null&&navigate(previous)}>← Previous step</button>{next!==null?<button type="button" className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-all cursor-pointer" onClick={()=>navigate(next)}>Next: {WEBSITE_EDIT_STEPS[stepIndex+1].label} →</button>:<button type="button" className="px-4 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl transition-all cursor-pointer" onClick={()=>navigate(2)}>Back to step 1</button>}</div>;

  return <>
  <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
    {/* Main Container */}
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Flex-Based Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3.5 p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <strong className="text-slate-900 font-extrabold text-sm sm:text-base flex items-center gap-1.5 mr-2">
            <span className="material-symbols-outlined text-base text-pink-600">tune</span>
            <span>{currentLabel}</span>
          </strong>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
            published ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}>
            {published ? 'Published' : 'Draft'}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200/60 font-mono text-[11px]">
            {sync}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
            onClick={onPublish}
          >
            Publish Website
          </button>
          <button
            type="button"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95"
            onClick={() => void onRefreshBookings?.()}
          >
            Refresh Bookings
          </button>
          <button
            type="button"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95"
            onClick={onOpenPreview}
          >
            Preview Site
          </button>
        </div>
      </div>

      {/* Grid Layout Container */}
      <div className="grid grid-cols-1 lg:grid-cols-[18.5rem_minmax(0,1fr)] gap-6 items-start">
        {/* Sidebar */}
        <aside className="sticky top-36 overflow-y-auto p-4 bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl hidden lg:block no-scrollbar shadow-sm">
          <div className="p-3 mb-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            <strong className="block text-slate-100 font-bold mb-1">Edit your website</strong>
            <p>1 se {WEBSITE_EDIT_STEPS.length} tak ek-ek step edit karein. Kisi bhi step par seedha ja sakte hain.</p>
          </div>

          <nav aria-label="Website editing steps" className="space-y-0.5">
            <ol>{WEBSITE_EDIT_STEPS.map((step,index)=><li key={step.id}><Nav {...step} number={index+1} active={active} onClick={navigate}/></li>)}</ol>
          </nav>

          <details className="mt-6 pt-4 border-t border-slate-800 group" open={stepIndex<0||undefined}>
            <summary className="cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-200 py-2 flex items-center justify-between">
              <span>Business tools · bookings & more</span>
              <span className="material-symbols-outlined text-sm group-open:rotate-180 transition-transform">expand_more</span>
            </summary>
            <nav aria-label="Business tools" className="mt-2 space-y-0.5">
              {OWNER_BUSINESS_TOOLS.map(tool=><Nav key={tool.id} {...tool} active={active} onClick={navigate}/>)}
            </nav>
          </details>
        </aside>

        {/* Mobile Section Dropdown Selector */}
        <div className="lg:hidden p-4 bg-slate-900 text-white rounded-2xl border border-slate-800">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Choose a section</label>
          <select 
            value={active} 
            onChange={e=>navigate(Number(e.target.value))}
            className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <optgroup label="Edit website — in order">{WEBSITE_EDIT_STEPS.map((step,index)=><option key={step.id} value={step.id}>{index+1}. {step.label}</option>)}</optgroup>
            <optgroup label="Business tools">{OWNER_BUSINESS_TOOLS.map(tool=><option key={tool.id} value={tool.id}>{tool.label}</option>)}</optgroup>
          </select>
        </div>

        {/* Main Content Area */}
        <div className="min-w-0 space-y-6">
          {notice && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2 shadow-xs" role="status">
              <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
              <span>{notice}</span>
            </div>
          )}

          <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs" aria-label="Current editing step">
            <span className="text-[11px] font-mono font-bold text-pink-600 uppercase tracking-wider block mb-1">
              {currentStep ? `Step ${stepIndex+1} / ${WEBSITE_EDIT_STEPS.length}` : 'Business tools'}
            </span>
            <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold text-slate-900 tracking-tight outline-none">
              {currentLabel}
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              {currentStep?.hint || 'Roz ke salon operations yahan manage karein. Website edit karne ke liye numbered steps use karein.'}
            </p>
            {currentStep ? (
              <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 font-medium">
                Next se sirf section badlega. Upar workspace ka save status check karein; Publish alag step hai.
              </p>
            ) : (
              <button 
                type="button" 
                className="mt-4 px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 transition-all cursor-pointer" 
                onClick={()=>navigate(2)}
              >
                Start website editing · Step 1
              </button>
            )}
          </section>

          <div key={active} className="min-w-0">{renderContent()}</div>

          {currentStep && (
            <footer className="pt-6 border-t border-slate-200 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs font-semibold text-slate-500">
                Step {stepIndex+1} / {WEBSITE_EDIT_STEPS.length} · {currentLabel}
              </p>
              {stepControls}
            </footer>
          )}
        </div>
      </div>
    </div>
  </main>
  <SyncIndicator sync={sync} syncError={syncError} />
  </>;
};

