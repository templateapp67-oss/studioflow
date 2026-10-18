import {ContentReviewGuide} from './ContentReviewGuide';
import {AboutStudioEditor} from './AboutStudioEditor';
import {BrandIdentityPrompt} from './BrandIdentityPrompt';
import {brandIdentityContext} from '../lib/brandIdentityPrompt';
import type {CampaignAd} from '../lib/campaignBanner';
import {PhotoGalleryManager} from './PhotoGalleryManager';
import {OwnerCustomerContacts} from './OwnerCustomerContacts';
import {CustomerAppPromotion} from './CustomerAppPromotion';
import { HeroBannerEditor } from './HeroBannerEditor';
import {BrandImageField} from './BrandImageField';
import { WebsiteContentManager } from './WebsiteContentManager';
import { PromoStudio } from './PromoStudio';
import {servicesForTemplate} from '../lib/serviceCatalogue';
import { applyTemplateDesign } from '../lib/templateSelection';
import { SocialConnectivityStep } from './SocialConnectivityStep';
import { DEFAULT_EXTRAS, type Extras } from '../lib/workspaceDefaults';
import React, { useMemo, useState } from 'react';
import { Appointment, BusinessTypeId, SalonProfile, SalonService, Stylist } from '../types';
import { BUSINESS_TYPES } from '../mockData';
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import { ServiceManagement } from './ServiceManagement';
import { TeamManagement } from './TeamManagement';
import { InteractiveMapSetup } from './InteractiveMapSetup';
import { ReferralPanel } from './ReferralPanel';
import { WebsitePublishPanel } from './WebsitePublishPanel';
import type { CategoryTemplateConfig } from '../types';

type Props = {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
  services: SalonService[];
  setServices: React.Dispatch<React.SetStateAction<SalonService[]>>;
  stylists: Stylist[];
  setStylists: React.Dispatch<React.SetStateAction<Stylist[]>>;
  appointments: Appointment[];
  extras: Extras;
  setExtras: React.Dispatch<React.SetStateAction<Extras>>;
  published: { slug: string; published_at: string } | null;
  onPublish: () => Promise<void>;
  sessionEmail: string;
  templates: CategoryTemplateConfig[];
  onOpenPreview: () => void;
  onOpenDashboard: (section?:string) => void;
  onOpenWizard: () => void;
};

const setup = [
  [1, 'Login', 'login'], [2, 'Business Details', 'storefront'], [3, 'Business Services & Custom Service Offerings', 'spa'],
  [4, 'Team Setup & Management', 'groups'], [5, 'Photo Gallery', 'photo_library'], [6, 'Socials & Reels', 'share'],
  [7, 'Location & Hours', 'location_on'], [8, 'Contact & Booking Rules', 'event_available'],
  [9, 'Choose Template', 'dashboard_customize'], [10, 'Customize Appearance', 'palette'],
  [11, 'AI Content Review', 'auto_awesome'], [12, 'Preview Website', 'preview'],
  [13, 'Publish', 'publish'], [14, 'Published Website', 'language'],
  [15, 'Videos & Reels', 'video_library'], [16, 'Website Sections & Content', 'view_quilt'],
] as const;

const dashboard = [
  [18, 'Overview Dashboard', 'monitoring'], [19, 'Website & Design Manager', 'web'],
  [20, 'Bookings & Calendar', 'calendar_month'], [21, 'Payments & Revenue Analytics', 'payments'],
  [22, 'Marketing & Social Share Hub', 'campaign'], [23, 'Salon Settings & Policies', 'tune'],
  [26, 'Customers & WhatsApp Campaigns', 'contacts'],
  [24, 'Share & Referral Premium', 'redeem'], [25, 'Branding & White-label', 'verified'],
] as const;

const Field = ({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (value: string) => void; type?: string }) => <label className="block"><span className="field-label">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="workspace-input" /></label>;
const Toggle = ({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (checked: boolean) => void; hint?: string }) => <label className="workspace-toggle"><span><strong>{label}</strong>{hint && <small>{hint}</small>}</span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /></label>;
const Metric = ({ icon, label, value }: { icon: string; label: string; value: string }) => <article className="metric-card"><span className="material-symbols-outlined">{icon}</span><small>{label}</small><strong>{value}</strong></article>;
const Nav = ({ id, label, icon, active, onClick, premium }: { key?: React.Key; id: number; label: string; icon: string; active: number; onClick: (id: number) => void; premium?: boolean }) => <button onClick={() => onClick(id)} aria-current={active===id?'page':undefined} title={`${String(id).padStart(2,'0')} ${label}`} className={active === id ? 'owner-nav active' : 'owner-nav'}><span className="nav-no">{String(id).padStart(2, '0')}</span><span className="material-symbols-outlined">{icon}</span><strong>{label}</strong>{premium && <em>PRO</em>}</button>;
const ActionPage = ({ eyebrow, title, text, icon, action, onAction, secondary, onSecondary }: { eyebrow: string; title: string; text: string; icon: string; action: string; onAction: () => void; secondary?: string; onSecondary?: () => void }) => <section className="workspace-card action-page"><div className="action-icon"><span className="material-symbols-outlined">{icon}</span></div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p className="muted">{text}</p><div className="action-buttons"><button className="primary-action" onClick={onAction}>{action}</button>{secondary && <button className="secondary-action" onClick={onSecondary}>{secondary}</button>}</div></section>;

export const OwnerWorkspace: React.FC<Props> = ({ profile, setProfile, services, setServices, stylists, setStylists, appointments, extras, setExtras, published, onPublish, sessionEmail, templates, onOpenPreview, onOpenDashboard, onOpenWizard }) => {
  const [active, setActive] = useState(() => { const id=Number(new URLSearchParams(location.search).get('module')); return Number.isInteger(id)&&id>=1&&id<=26?id:18; });
  const [notice, setNotice] = useState('');
  const [campaignAd,setCampaignAd]=useState<CampaignAd|null>(null);
  const accent = profile.customAccentColor || '#a21caf';
  const revenue = appointments.reduce((sum, item) => sum + item.amountPaid, 0);
  const completion = useMemo(() => Math.round(([profile.businessName, profile.phone, profile.email, profile.address, profile.coverImageUrl, services.length, stylists.length].filter(Boolean).length / 7) * 100), [profile, services.length, stylists.length]);
  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600); };
  const saveExtras = (next: Extras) => setExtras(next);
  const patchProfile = (key: keyof SalonProfile, value: unknown) => setProfile((prev) => ({ ...prev, [key]: value }));
  const chooseTemplate = (id: BusinessTypeId) => { const template = templates.find(t => t.id === id); if (!template) return; setServices(servicesForTemplate(services,profile,template)); setProfile((prev) => ({...applyTemplateDesign(prev, template),serviceCatalogueInitialized:true})); if(!stylists.length)setStylists(template.stylists); flash(`${template.shortName} template applied`); };


  const renderContent = () => {
    if (active === 15) return <SocialConnectivityStep profile={profile} setProfile={setProfile} onContinue={onOpenPreview}/>;
    if (active === 16 || active === 19) return <WebsiteContentManager profile={profile} setProfile={setProfile} gallery={extras.gallery} setGallery={gallery=>setExtras(prev=>({...prev,gallery}))}/>;
    if(active===26)return <OwnerCustomerContacts profile={profile} ad={campaignAd}/>;
    if (active === 22) return <div className="stack"><PromoStudio profile={profile} setProfile={setProfile} services={services} onAdReady={setCampaignAd}/><OwnerCustomerContacts profile={profile} ad={campaignAd}/></div>;
    if (active === 1) return <section className="workspace-card"><p className="eyebrow">Secure owner access</p><h2>Signed in</h2><p className="muted">{sessionEmail}</p><p>Your profile and dashboard are saved to your Supabase account.</p></section>;
    if (active === 2) return <section className="workspace-card"><p className="eyebrow">Owner setup · 02</p><h2>Business details</h2><div className="form-grid"><Field label="Website address (3–63 lowercase letters, numbers or hyphens)" value={profile.subdomain} onChange={(v) => patchProfile('subdomain', v.toLowerCase().replace(/[^a-z0-9-]/g, ''))} /><Field label="Business name" value={profile.businessName} onChange={(v) => patchProfile('businessName', v)} /><Field label="Owner name" value={profile.ownerName} onChange={(v) => patchProfile('ownerName', v)} /><Field label="Business email" value={profile.email} onChange={(v) => patchProfile('email', v)} /><Field label="Phone" value={profile.phone} onChange={(v) => patchProfile('phone', v)} /><Field label="Tagline" value={profile.tagline} onChange={(v) => patchProfile('tagline', v)} /></div><AboutStudioEditor profile={profile} setProfile={setProfile}/></section>;
    if (active === 3) return <ServiceManagement services={services} setServices={setServices} primaryAccentColor={accent} profile={profile} onNavigateToPreview={onOpenPreview} />;
    if (active === 4 || active === 17) return <TeamManagement businessType={profile.businessType} stylists={stylists} setStylists={setStylists} services={services} primaryAccentColor={accent} onNavigateToPreview={onOpenPreview} />;
    if (active === 5) return <section className="workspace-card"><PhotoGalleryManager profile={profile} setProfile={setProfile} gallery={extras.gallery} setGallery={gallery=>setExtras(prev=>({...prev,gallery}))}/></section>;
    if (active === 6) return <SocialConnectivityStep profile={profile} setProfile={setProfile} onContinue={onOpenPreview}/>;
    if (active === 7) return <div className="stack"><InteractiveMapSetup profile={profile} setProfile={setProfile} themePrimaryColor={accent} /><section className="workspace-card"><h2>Operating hours</h2><div className="form-grid three"><Field label="Mon–Fri (except Tuesday)" value={profile.workingHoursMonFri || '10:00 AM – 8:00 PM'} onChange={(v) => patchProfile('workingHoursMonFri', v)} /><Field label="Tuesday" value={profile.workingHoursTue || ''} onChange={(v) => patchProfile('workingHoursTue', v)} /><Field label="Sunday" value={profile.workingHoursSun || '11:00 AM – 6:00 PM'} onChange={(v) => patchProfile('workingHoursSun', v)} /></div></section></div>;
    if (active === 8) return <section className="workspace-card"><p className="eyebrow">Owner setup · 08</p><h2>Contact & booking rules</h2><div className="form-grid"><Field label="WhatsApp bookings" value={profile.whatsapp} onChange={(v) => patchProfile('whatsapp', v)} /><Field label="Minimum lead time (hours)" value={extras.bookingLeadHours} type="number" onChange={(v) => saveExtras({ ...extras, bookingLeadHours: Number(v) })} /><p className="p-4 rounded-xl bg-emerald-50 text-sm"><strong>Platform policy: mandatory 25% advance.</strong><br/>Razorpay payment verification confirms the appointment. Balance is due at the salon.</p></div></section>;
    if (active === 9) return <section className="workspace-card"><p className="eyebrow">Owner setup · 09</p><h2>Choose a template</h2><div className="template-grid">{templates.map((template) => ({ id: template.id, title: template.shortName, icon: template.icon, paletteName: template.paletteLabel })).map((item) => <button key={item.id} onClick={() => chooseTemplate(item.id)} className={profile.businessType === item.id ? 'template-card selected' : 'template-card'}><span className="material-symbols-outlined">{item.icon}</span><strong>{item.title}</strong><small>{item.paletteName}</small></button>)}</div></section>;
    if (active === 10) return <div className="stack"><HeroBannerEditor profile={profile} setProfile={setProfile}/><section className="workspace-card"><p className="eyebrow">Owner setup · 10</p><h2>Customize appearance</h2><BrandIdentityPrompt profile={profile}/><div className="form-grid"><BrandImageField label="Brand logo" logo value={profile.logoUrl || ''} onChange={(v) => patchProfile('logoUrl', v)} /><BrandImageField label="Website favicon" logo uploadName="Favicon" hint="Use a square PNG, ideally 256 × 256 px. Shown in your published website’s browser tab. If empty, your salon logo is used." value={extras.whiteLabel.faviconUrl || ''} onChange={faviconUrl => setExtras(prev => ({...prev, whiteLabel: {...prev.whiteLabel, faviconUrl}}))} /><label><span className="field-label">Brand accent</span><input className="color-input" type="color" value={brandIdentityContext(profile).primary} onChange={(e) => patchProfile('customAccentColor', e.target.value)} /></label></div></section></div>;
    if (active === 11) return <ContentReviewGuide profile={profile} services={services} stylists={stylists} onNavigate={setActive} onPreview={onOpenPreview} onAddAbout={() => { if (!profile.about?.trim()) patchProfile('about', `Welcome to ${profile.businessName || 'our salon'}, where thoughtful care and expert technique come together. Explore our signature services and book a time that works for you.`); }}/>;
    if (active === 12) return <ActionPage eyebrow="Owner setup · 12" title="Preview your website" text="Review the customer experience on desktop and mobile before publishing." icon="preview" action="Open interactive preview" onAction={onOpenPreview} />;
    if (active === 13) return <WebsitePublishPanel published={published} onPublish={onPublish} onPublished={()=>setActive(14)} />;
    if (active === 14) return <WebsitePublishPanel published={published} onPublish={onPublish} />;
    if (active === 18) return <section><div className="metric-grid"><Metric icon="payments" label="Revenue collected" value={`₹${revenue.toLocaleString('en-IN')}`} /><Metric icon="event_available" label="Bookings" value={String(appointments.length)} /><Metric icon="groups" label="Team members" value={String(stylists.length)} /><Metric icon="fact_check" label="Setup complete" value={`${completion}%`} /></div><div className="workspace-card intro-card"><div><p className="eyebrow">Business control centre</p><h2>Good to see you, {profile.ownerName.split(' ')[0]}</h2><p className="muted">Your website, bookings and brand are managed from one white-label workspace.</p></div><button className="primary-action" onClick={()=>onOpenDashboard()}>Open detailed dashboard</button></div><WebsitePublishPanel published={published} onPublish={onPublish} onPublished={()=>setActive(14)} /></section>;
    if (active === 19) return <ActionPage eyebrow="Dashboard · 19" title="Website & design manager" text="Edit your template, content, media and theme, then check the result in the live preview." icon="design_services" action="Open setup editor" onAction={onOpenWizard} secondary="Preview website" onSecondary={onOpenPreview} />;
    if (active === 20) return <section className="workspace-card"><p className="eyebrow">Dashboard · 20</p><h2>Bookings & calendar</h2><button className="primary-action" onClick={()=>onOpenDashboard('demo')}>₹0 Demo Bookings — View customer tests</button><div className="table-wrap"><table><thead><tr><th>Client</th><th>Service</th><th>Date & time</th><th>Team</th><th>Status</th></tr></thead><tbody>{appointments.map((item) => <tr key={item.id}><td><strong>{item.clientName}</strong><small>{item.clientPhone}</small></td><td>{item.serviceName}</td><td>{item.date}<small>{item.time}</small></td><td>{item.stylistName}</td><td><span className={`status ${item.status}`}>{item.status}</span></td></tr>)}</tbody></table></div></section>;
    if (active === 21) return <section><div className="metric-grid"><Metric icon="account_balance_wallet" label="Collected" value={`₹${revenue.toLocaleString('en-IN')}`} /><Metric icon="receipt_long" label="Average ticket" value={`₹${appointments.length ? Math.round(revenue / appointments.length).toLocaleString('en-IN') : 0}`} /><Metric icon="pending_actions" label="Pending value" value={`₹${appointments.filter((a) => a.paymentStatus !== 'paid_full').reduce((s, a) => s + Math.max(0, a.servicePrice - a.amountPaid), 0).toLocaleString('en-IN')}`} /><Metric icon="trending_up" label="Paid bookings" value={`${appointments.filter((a) => a.amountPaid > 0).length}`} /></div><section className="workspace-card revenue-panel"><h2>Revenue mix</h2>{['paid_full', 'paid_deposit', 'pay_at_salon'].map((status) => { const count = appointments.filter((a) => a.paymentStatus === status).length; return <div className="revenue-row" key={status}><span>{status.replaceAll('_', ' ')}</span><div><i style={{ width: `${appointments.length ? Math.max(8, count / appointments.length * 100) : 0}%` }} /></div><strong>{count}</strong></div>; })}</section></section>;
    if (active === 22) return <><CustomerAppPromotion/><ActionPage eyebrow="Marketing" title="Promo Image & Social" text="Edit website promotions, photos and social campaigns in your dashboard." icon="campaign" action="Open Promo Studio" onAction={()=>onOpenDashboard('marketing')} secondary="Socials & Reels" onSecondary={()=>onOpenDashboard('social_connectivity')}/></>;
    if (active === 23) return <section className="workspace-card"><p className="eyebrow">Dashboard · 23</p><h2>Salon settings & policies</h2><div className="form-grid single"><Field label="Cancellation window (hours)" value={extras.cancellationWindow} type="number" onChange={(v) => saveExtras({ ...extras, cancellationWindow: Number(v) })} />{Object.entries(extras.policies).map(([key, value]) => <label key={key}><span className="field-label">{key.replace(/([A-Z])/g, ' $1')}</span><textarea value={value} onChange={(e) => saveExtras({ ...extras, policies: { ...extras.policies, [key]: e.target.value } })} className="workspace-textarea" /></label>)}</div></section>;
    if (active === 24) return <ReferralPanel />;
    return <section className="workspace-card"><span className="premium-pill">Premium · Dashboard 25</span><h2 className="premium-title">Branding & white-label settings</h2><p className="muted">Replace platform identity with your own brand across the owner portal and customer experience.</p><div className="form-grid"><Field label="Platform name" value={extras.whiteLabel.platformName} onChange={(v) => saveExtras({ ...extras, whiteLabel: { ...extras.whiteLabel, platformName: v } })} /><Field label="Support email" value={extras.whiteLabel.supportEmail} onChange={(v) => saveExtras({ ...extras, whiteLabel: { ...extras.whiteLabel, supportEmail: v } })} /><Field label="Custom domain" value={extras.whiteLabel.customDomain} onChange={(v) => saveExtras({ ...extras, whiteLabel: { ...extras.whiteLabel, customDomain: v } })} /><BrandImageField label="Website favicon" logo uploadName="Favicon" hint="Use a square PNG, ideally 256 × 256 px. Shown in your published website’s browser tab. If empty, your salon logo is used." value={extras.whiteLabel.faviconUrl || ''} onChange={faviconUrl => setExtras(prev => ({...prev, whiteLabel: {...prev.whiteLabel, faviconUrl}}))} /><Toggle label="Show “Powered by StudioFlow”" hint="Keep this off for a completely white-label customer experience." checked={extras.whiteLabel.poweredBy} onChange={(v) => saveExtras({ ...extras, whiteLabel: { ...extras.whiteLabel, poweredBy: v } })} /></div><button className="primary-action save-brand" onClick={() => flash('Branding changes queued for Supabase save')}>Save branding</button></section>;
  };

  const currentLabel = [...setup, [17, 'Staff Management Module', 'badge'] as const, ...dashboard].find(([id]) => id === active)?.[1];
  return <main className="owner-shell">
    <aside className="owner-sidebar">
      <div className="owner-brand"><div style={{ background: accent }}>{profile.logoUrl ? <img src={profile.logoUrl} alt="" /> : <span>{profile.businessName.slice(0, 1)}</span>}</div><p><strong>{extras.whiteLabel.platformName || profile.businessName}</strong><small>White-label salon OS</small></p></div>
      <nav aria-label="Owner workspace"><p>Owner setup</p>{setup.map(([id, label, icon]) => <Nav key={id} id={id} label={label} icon={icon} active={active} onClick={setActive} />)}<p>Staff module</p><Nav id={17} label="Staff Management" icon="badge" active={active} onClick={setActive} /><p>Dashboard</p>{dashboard.map(([id, label, icon]) => <Nav key={id} id={id} label={label} icon={icon} active={active} onClick={setActive} premium={id >= 24&&id<=25} />)}</nav>
    </aside>
    <div className="owner-main">
      <header className="workspace-topbar"><div><small>Owner Workspace / {String(active).padStart(2, '0')}</small><strong>{currentLabel}</strong></div><div className="topbar-actions"><button onClick={onOpenPreview}><span className="material-symbols-outlined">visibility</span>Preview</button><span className={published ? 'live-dot is-live' : 'live-dot'}>{published ? 'Published' : 'Draft'}</span><div className="avatar">{profile.ownerName.slice(0, 1)}</div></div></header>
      <div className="workspace-content">{notice && <div className="workspace-toast"><span className="material-symbols-outlined">check_circle</span>{notice}</div>}{renderContent()}</div>
    </div>
  </main>;
};
