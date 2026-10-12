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
import { uploadSalonImage } from '../lib/supabase';
import { WebsitePublishPanel } from './WebsitePublishPanel';
import type { CategoryTemplateConfig } from '../types';
import { ReviewManagement } from './ReviewManagement';
import { MonthlyRevenueChart } from './MonthlyRevenueChart';
import { PromotionsManagement } from './PromotionsManagement';

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
  onOpenClientPreview?: () => void;
  hasUnsavedChanges?: boolean;
  onSaveNow?: () => Promise<void> | void;
};

const setup = [
  [1, 'Login', 'login'], [2, 'Business Details', 'storefront'], [3, 'Services & Packages', 'spa'],
  [4, 'Team Setup', 'groups'], [5, 'Photo Gallery', 'photo_library'], [6, 'Socials & Reels', 'share'],
  [7, 'Location & Hours', 'location_on'], [8, 'Contact & Booking Rules', 'event_available'],
  [9, 'Choose Template', 'dashboard_customize'], [10, 'Customize Appearance', 'palette'],
  [11, 'AI Content Review', 'auto_awesome'], [12, 'Preview Website', 'preview'],
  [13, 'Publish', 'publish'], [14, 'Published Website', 'language'],
] as const;

const dashboard = [
  [18, 'Overview Dashboard', 'monitoring'], [19, 'Website & Design Manager', 'web'],
  [20, 'Bookings & Calendar', 'calendar_month'], [21, 'Payments & Revenue Analytics', 'payments'],
  [22, 'Marketing & Social Share Hub', 'campaign'], [23, 'Salon Settings & Policies', 'tune'],
  [24, 'Share & Referral Premium', 'redeem'], [25, 'Branding & White-label', 'verified'],
  [26, 'Reviews & Testimonials', 'rate_review'],
  [27, 'Promotions & Flash Sales', 'local_offer'],
] as const;

const Field = ({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (value: string) => void; type?: string }) => <label className="block"><span className="field-label">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="workspace-input" /></label>;
const Toggle = ({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (checked: boolean) => void; hint?: string }) => <label className="workspace-toggle"><span><strong>{label}</strong>{hint && <small>{hint}</small>}</span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /></label>;
const Metric = ({ icon, label, value }: { icon: string; label: string; value: string }) => <article className="metric-card"><span className="material-symbols-outlined">{icon}</span><small>{label}</small><strong>{value}</strong></article>;
const Nav = ({ id, label, icon, active, onClick, premium }: { key?: React.Key; id: number; label: string; icon: string; active: number; onClick: (id: number) => void; premium?: boolean }) => <button onClick={() => onClick(id)} className={active === id ? 'owner-nav active' : 'owner-nav'}><span className="nav-no">{String(id).padStart(2, '0')}</span><span className="material-symbols-outlined">{icon}</span><strong>{label}</strong>{premium && <em>PRO</em>}</button>;
const ActionPage = ({ eyebrow, title, text, icon, action, onAction, secondary, onSecondary }: { eyebrow: string; title: string; text: string; icon: string; action: string; onAction: () => void; secondary?: string; onSecondary?: () => void }) => <section className="workspace-card action-page"><div className="action-icon"><span className="material-symbols-outlined">{icon}</span></div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p className="muted">{text}</p><div className="action-buttons"><button className="primary-action" onClick={onAction}>{action}</button>{secondary && <button className="secondary-action" onClick={onSecondary}>{secondary}</button>}</div></section>;

export const OwnerWorkspace: React.FC<Props> = ({ 
  profile, setProfile, 
  services, setServices, 
  stylists, setStylists, 
  appointments, extras, setExtras, 
  published, onPublish, sessionEmail, 
  templates, onOpenPreview, onOpenDashboard, onOpenWizard,
  onOpenClientPreview,
  hasUnsavedChanges = false,
  onSaveNow
}) => {
  const [active, setActive] = useState(18);
  const [notice, setNotice] = useState('');
  const [showUnsavedWarningModal, setShowUnsavedWarningModal] = useState(false);
  const [isSavingInProgress, setIsSavingInProgress] = useState(false);

  const handleAttemptOpenClientPreview = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarningModal(true);
    } else {
      onOpenClientPreview?.();
    }
  };

  const handleSaveAndOpenClientPreview = async () => {
    setIsSavingInProgress(true);
    try {
      if (onSaveNow) {
        await onSaveNow();
      }
      setShowUnsavedWarningModal(false);
      onOpenClientPreview?.();
    } catch {
      flash('Failed to save changes. Please try saving again.');
    } finally {
      setIsSavingInProgress(false);
    }
  };
  const accent = profile.customAccentColor || '#a21caf';
  const revenue = appointments.reduce((sum, item) => sum + item.amountPaid, 0);
  const completion = useMemo(() => Math.round(([profile.businessName, profile.phone, profile.email, profile.address, profile.coverImageUrl, services.length, stylists.length].filter(Boolean).length / 7) * 100), [profile, services.length, stylists.length]);
  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600); };
  const saveExtras = (next: Extras) => setExtras(next);
  const patchProfile = (key: keyof SalonProfile, value: unknown) => setProfile((prev) => ({ ...prev, [key]: value }));
  const chooseTemplate = (id: BusinessTypeId) => { const template = templates.find(t => t.id === id); if (!template) return; setProfile((prev) => applyTemplateDesign(prev, template)); if(!services.length)setServices(template.services); if(!stylists.length)setStylists(template.stylists); flash(`${template.shortName} template applied`); };
  const uploadGallery = async (files: FileList | null) => {
    if(!files?.length)return;
    const selected=Array.from(files).slice(0,6);
    if(selected.some(f=>f.size>2*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(f.type))){flash('Use JPG, PNG or WebP images smaller than 2 MB.');return;}
    const images=await Promise.all(selected.map(uploadSalonImage)).catch(()=>null);
    if(images)setExtras(prev=>({...prev,gallery:[...prev.gallery,...images].slice(-12)}));else flash('Photo upload failed.');
  };

  const renderContent = () => {
    if (active === 1) return <section className="workspace-card"><p className="eyebrow">Secure owner access</p><h2>Signed in</h2><p className="muted">{sessionEmail}</p><p>Your profile and dashboard are saved to your Supabase account.</p></section>;
    if (active === 2) return <section className="workspace-card"><p className="eyebrow">Owner setup · 02</p><h2>Business details</h2><div className="form-grid"><Field label="Website address (3–63 lowercase letters, numbers or hyphens)" value={profile.subdomain} onChange={(v) => patchProfile('subdomain', v.toLowerCase().replace(/[^a-z0-9-]/g, ''))} /><Field label="Business name" value={profile.businessName} onChange={(v) => patchProfile('businessName', v)} /><Field label="Owner name" value={profile.ownerName} onChange={(v) => patchProfile('ownerName', v)} /><Field label="Business email" value={profile.email} onChange={(v) => patchProfile('email', v)} /><Field label="Phone" value={profile.phone} onChange={(v) => patchProfile('phone', v)} /><Field label="Tagline" value={profile.tagline} onChange={(v) => patchProfile('tagline', v)} /></div></section>;
    if (active === 3) return <ServiceManagement services={services} setServices={setServices} primaryAccentColor={accent} profile={profile} onNavigateToPreview={onOpenPreview} />;
    if (active === 4 || active === 17) return <TeamManagement stylists={stylists} setStylists={setStylists} services={services} primaryAccentColor={accent} onNavigateToPreview={onOpenPreview} />;
    if (active === 5) return <section className="workspace-card"><p className="eyebrow">Owner setup · 05</p><h2>Photo gallery</h2><div className="gallery-grid">{[profile.coverImageUrl, ...extras.gallery].filter(Boolean).map((src, i) => <div className="gallery-item" key={`${src}-${i}`}><img src={src} alt={`Salon gallery ${i + 1}`} />{i > 0 && <button aria-label="Remove photo" onClick={() => saveExtras({ ...extras, gallery: extras.gallery.filter((_, x) => x !== i - 1) })}>×</button>}</div>)}<label className="gallery-upload"><span className="material-symbols-outlined">add_photo_alternate</span><strong>Add photos</strong><small>JPG, PNG or WebP</small><input className="sr-only" type="file" accept="image/*" multiple onChange={(e) => uploadGallery(e.target.files)} /></label></div></section>;
    if (active === 6) return <SocialConnectivityStep profile={profile} setProfile={setProfile} onContinue={onOpenPreview}/>;
    if (active === 7) return <div className="stack"><InteractiveMapSetup profile={profile} setProfile={setProfile} themePrimaryColor={accent} /><section className="workspace-card"><h2>Operating hours</h2><div className="form-grid three"><Field label="Mon–Fri" value={profile.workingHoursMonFri || '10:00 AM – 8:00 PM'} onChange={(v) => patchProfile('workingHoursMonFri', v)} /><Field label="Saturday" value={profile.workingHoursSat || '10:00 AM – 9:00 PM'} onChange={(v) => patchProfile('workingHoursSat', v)} /><Field label="Sunday" value={profile.workingHoursSun || '11:00 AM – 6:00 PM'} onChange={(v) => patchProfile('workingHoursSun', v)} /></div></section></div>;
    if (active === 8) return <section className="workspace-card"><p className="eyebrow">Owner setup · 08</p><h2>Contact & booking rules</h2><div className="form-grid"><Field label="WhatsApp bookings" value={profile.whatsapp} onChange={(v) => patchProfile('whatsapp', v)} /><Field label="Minimum lead time (hours)" value={extras.bookingLeadHours} type="number" onChange={(v) => saveExtras({ ...extras, bookingLeadHours: Number(v) })} /><p className="p-4 rounded-xl bg-emerald-50 text-sm"><strong>Platform policy: mandatory 25% advance.</strong><br/>Razorpay payment verification confirms the appointment. Balance is due at the salon.</p></div></section>;
    if (active === 9) return <section className="workspace-card"><p className="eyebrow">Owner setup · 09</p><h2>Choose a template</h2><div className="template-grid">{templates.map((template) => ({ id: template.id, title: template.shortName, icon: template.icon, paletteName: template.paletteLabel })).map((item) => <button key={item.id} onClick={() => chooseTemplate(item.id)} className={profile.businessType === item.id ? 'template-card selected' : 'template-card'}><span className="material-symbols-outlined">{item.icon}</span><strong>{item.title}</strong><small>{item.paletteName}</small></button>)}</div></section>;
    if (active === 10) return <section className="workspace-card"><p className="eyebrow">Owner setup · 10</p><h2>Customize appearance</h2><div className="form-grid"><Field label="Brand logo URL" value={profile.logoUrl || ''} onChange={(v) => patchProfile('logoUrl', v)} /><Field label="Hero image URL" value={profile.coverImageUrl} onChange={(v) => patchProfile('coverImageUrl', v)} /><label><span className="field-label">Brand accent</span><input className="color-input" type="color" value={accent} onChange={(e) => patchProfile('customAccentColor', e.target.value)} /></label></div></section>;
    if (active === 11) return <section className="workspace-card"><p className="eyebrow">Owner setup · 11</p><h2>AI content review</h2><p className="muted">A practical quality check for your public website copy.</p><div className="review-list">{[['Business identity', profile.businessName && profile.tagline], ['Contact details', profile.phone && profile.email], ['Service menu', services.length >= 3], ['Team credibility', stylists.length > 0], ['Visual story', profile.coverImageUrl]].map(([label, ok]) => <div key={String(label)}><span className="material-symbols-outlined">{ok ? 'check_circle' : 'error'}</span><strong>{label}</strong><small>{ok ? 'Ready to publish' : 'Needs attention'}</small></div>)}</div><button className="primary-action" onClick={() => { if (!profile.about) patchProfile('about', `Welcome to ${profile.businessName}, where thoughtful care and expert technique come together. Explore our signature services and book a time that works for you.`); flash('Suggested content applied'); }}>Apply smart suggestions</button></section>;
    if (active === 12) return <ActionPage eyebrow="Owner setup · 12" title="Preview your website" text="Review the customer experience on desktop and mobile before publishing. Save changes first so your latest setup displays in the client preview." icon="preview" action="Open Client Preview" onAction={handleAttemptOpenClientPreview} secondary="Interactive Studio Preview" onSecondary={onOpenPreview} />;
    if (active === 13) return <WebsitePublishPanel published={published} onPublish={onPublish} onPublished={()=>setActive(14)} />;
    if (active === 14) return <WebsitePublishPanel published={published} onPublish={onPublish} />;
    if (active === 18) return <section><div className="metric-grid"><Metric icon="payments" label="Revenue collected" value={`₹${revenue.toLocaleString('en-IN')}`} /><Metric icon="event_available" label="Bookings" value={String(appointments.length)} /><Metric icon="groups" label="Team members" value={String(stylists.length)} /><Metric icon="fact_check" label="Setup complete" value={`${completion}%`} /></div><div className="workspace-card intro-card"><div><p className="eyebrow">Business control centre</p><h2>Good to see you, {profile.ownerName.split(' ')[0]}</h2><p className="muted">Your website, bookings and brand are managed from one white-label workspace.</p></div><button className="primary-action" onClick={()=>onOpenDashboard()}>Open detailed dashboard</button></div><div className="workspace-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 mb-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200"><div><div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-900 uppercase"><span className="material-symbols-outlined text-sm">local_offer</span><span>Seasonal Promotions & Flash Sales</span></div><h3 className="font-bold text-sm text-slate-900 mt-0.5">{profile.promotions?.enabled ? `${profile.promotions.title} (${profile.promotions.discountText})` : 'No active seasonal promotional banner'}</h3><p className="text-xs text-slate-600">{profile.promotions?.enabled ? 'Active on published website. Click to update themes, discounts, or timers.' : 'Boost client bookings by activating festive banners or 24h flash sale alerts.'}</p></div><button className="secondary-action text-xs font-bold shrink-0 cursor-pointer" onClick={()=>setActive(27)}>Manage Promotions</button></div><WebsitePublishPanel published={published} onPublish={onPublish} onPublished={()=>setActive(14)} /></section>;
    if (active === 19) return <ActionPage eyebrow="Dashboard · 19" title="Website & design manager" text="Edit your template, content, media and theme, then check the result in the live preview." icon="design_services" action="Open setup editor" onAction={onOpenWizard} secondary="Client Preview" onSecondary={handleAttemptOpenClientPreview} />;
    if (active === 20) return <section className="workspace-card"><p className="eyebrow">Dashboard · 20</p><h2>Bookings & calendar</h2><div className="table-wrap"><table><thead><tr><th>Client</th><th>Service</th><th>Date & time</th><th>Team</th><th>Status</th></tr></thead><tbody>{appointments.map((item) => <tr key={item.id}><td><strong>{item.clientName}</strong><small>{item.clientPhone}</small></td><td>{item.serviceName}</td><td>{item.date}<small>{item.time}</small></td><td>{item.stylistName}</td><td><span className={`status ${item.status}`}>{item.status}</span></td></tr>)}</tbody></table></div></section>;
    if (active === 21) return <section className="space-y-6"><div className="metric-grid"><Metric icon="account_balance_wallet" label="Collected" value={`₹${revenue.toLocaleString('en-IN')}`} /><Metric icon="receipt_long" label="Average ticket" value={`₹${appointments.length ? Math.round(revenue / appointments.length).toLocaleString('en-IN') : 0}`} /><Metric icon="pending_actions" label="Pending value" value={`₹${appointments.filter((a) => a.paymentStatus !== 'paid_full').reduce((s, a) => s + Math.max(0, a.servicePrice - a.amountPaid), 0).toLocaleString('en-IN')}`} /><Metric icon="trending_up" label="Paid bookings" value={`${appointments.filter((a) => a.amountPaid > 0).length}`} /></div><MonthlyRevenueChart appointments={appointments} primaryColor={accent} /><section className="workspace-card revenue-panel"><h2>Revenue mix</h2>{['paid_full', 'paid_deposit', 'pay_at_salon'].map((status) => { const count = appointments.filter((a) => a.paymentStatus === status).length; return <div className="revenue-row" key={status}><span>{status.replaceAll('_', ' ')}</span><div><i style={{ width: `${appointments.length ? Math.max(8, count / appointments.length * 100) : 0}%` }} /></div><strong>{count}</strong></div>; })}</section></section>;
    if (active === 22) return <ActionPage eyebrow="Marketing" title="Promotions & Social Hub" text="Configure seasonal banners, flash sale alerts, and social campaigns for your salon website." icon="campaign" action="Configure Promotions" onAction={()=>setActive(27)} secondary="Open Promo Studio" onSecondary={()=>onOpenDashboard('marketing')}/>;
    if (active === 23) return <section className="workspace-card"><p className="eyebrow">Dashboard · 23</p><h2>Salon settings & policies</h2><div className="form-grid single"><Field label="Cancellation window (hours)" value={extras.cancellationWindow} type="number" onChange={(v) => saveExtras({ ...extras, cancellationWindow: Number(v) })} />{Object.entries(extras.policies).map(([key, value]) => <label key={key}><span className="field-label">{key.replace(/([A-Z])/g, ' $1')}</span><textarea value={value} onChange={(e) => saveExtras({ ...extras, policies: { ...extras.policies, [key]: e.target.value } })} className="workspace-textarea" /></label>)}</div></section>;
    if (active === 24) return <ReferralPanel />;
    if (active === 26) return <ReviewManagement profile={profile} setProfile={setProfile} services={services} appointments={appointments} onNavigateToPreview={handleAttemptOpenClientPreview} />;
    if (active === 27) return <PromotionsManagement profile={profile} setProfile={setProfile} services={services} onNavigateToPreview={handleAttemptOpenClientPreview} onSaveNow={onSaveNow} />;
    return <section className="workspace-card"><span className="premium-pill">Premium · Dashboard 25</span><h2 className="premium-title">Branding & white-label settings</h2><p className="muted">Replace platform identity with your own brand across the owner portal and customer experience.</p><div className="form-grid"><Field label="Platform name" value={extras.whiteLabel.platformName} onChange={(v) => saveExtras({ ...extras, whiteLabel: { ...extras.whiteLabel, platformName: v } })} /><Field label="Support email" value={extras.whiteLabel.supportEmail} onChange={(v) => saveExtras({ ...extras, whiteLabel: { ...extras.whiteLabel, supportEmail: v } })} /><Field label="Custom domain" value={extras.whiteLabel.customDomain} onChange={(v) => saveExtras({ ...extras, whiteLabel: { ...extras.whiteLabel, customDomain: v } })} /><Field label="Favicon URL" value={extras.whiteLabel.faviconUrl} onChange={(v) => saveExtras({ ...extras, whiteLabel: { ...extras.whiteLabel, faviconUrl: v } })} /><Toggle label="Show “Powered by StudioFlow”" hint="Keep this off for a completely white-label customer experience." checked={extras.whiteLabel.poweredBy} onChange={(v) => saveExtras({ ...extras, whiteLabel: { ...extras.whiteLabel, poweredBy: v } })} /></div><button className="primary-action save-brand" onClick={() => flash('Branding changes queued for Supabase save')}>Save branding</button></section>;
  };

  const currentLabel = [...setup, [17, 'Staff Management Module', 'badge'] as const, ...dashboard].find(([id]) => id === active)?.[1];
  return <main className="owner-shell">
    <aside className="owner-sidebar">
      <div className="owner-brand"><div style={{ background: accent }}>{profile.logoUrl ? <img src={profile.logoUrl} alt="" /> : <span>{profile.businessName.slice(0, 1)}</span>}</div><p><strong>{extras.whiteLabel.platformName || profile.businessName}</strong><small>White-label salon OS</small></p></div>
      <nav aria-label="Owner workspace"><p>Owner setup</p>{setup.map(([id, label, icon]) => <Nav key={id} id={id} label={label} icon={icon} active={active} onClick={setActive} />)}<p>Staff module</p><Nav id={17} label="Staff Management" icon="badge" active={active} onClick={setActive} /><p>Dashboard</p>{dashboard.map(([id, label, icon]) => <Nav key={id} id={id} label={label} icon={icon} active={active} onClick={setActive} premium={id >= 24} />)}</nav>
    </aside>
    <div className="owner-main">
      <header className="workspace-topbar">
        <div><small>Owner Workspace / {String(active).padStart(2, '0')}</small><strong>{currentLabel}</strong></div>
        <div className="topbar-actions">
          {hasUnsavedChanges && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold shadow-2xs" role="status" title="Unsaved changes pending save">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Unsaved Changes</span>
              {onSaveNow && (
                <button 
                  type="button" 
                  onClick={() => void onSaveNow()} 
                  className="underline font-extrabold ml-1 hover:text-amber-950 cursor-pointer text-xs"
                >
                  Save
                </button>
              )}
            </div>
          )}
          <button 
            type="button" 
            onClick={handleAttemptOpenClientPreview}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Open Client Preview Mode"
          >
            <span className="material-symbols-outlined text-sm">devices</span>
            <span>Client Preview</span>
          </button>
          <button type="button" onClick={onOpenPreview} className="cursor-pointer">
            <span className="material-symbols-outlined">visibility</span>Preview
          </button>
          <span className={published ? 'live-dot is-live' : 'live-dot'}>{published ? 'Published' : 'Draft'}</span>
          <div className="avatar">{profile.ownerName.slice(0, 1)}</div>
        </div>
      </header>
      <div className="workspace-content">
        {notice && <div className="workspace-toast"><span className="material-symbols-outlined">check_circle</span>{notice}</div>}
        {hasUnsavedChanges && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-xs" role="alert">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-amber-600 text-lg">warning</span>
              <span><strong>Unsaved modifications:</strong> You have unsaved changes in this session. Remember to save before opening client preview.</span>
            </div>
            {onSaveNow && (
              <button 
                type="button" 
                onClick={() => void onSaveNow()} 
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer transition-colors"
              >
                Save Now
              </button>
            )}
          </div>
        )}
        {renderContent()}
      </div>
    </div>

    {/* Visual Warning Modal: Unsaved Changes when opening Client Preview */}
    {showUnsavedWarningModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-amber-300 max-w-lg w-full p-6 text-slate-900 flex flex-col gap-4 animate-in zoom-in-95 duration-150" role="alertdialog" aria-labelledby="unsaved-warning-title" aria-describedby="unsaved-warning-desc">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold font-mono tracking-wider uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                  Unsaved Changes
                </span>
                <span className="text-xs text-amber-700 font-bold">Client Preview Reminder</span>
              </div>
              <h3 id="unsaved-warning-title" className="text-lg font-extrabold text-slate-900 mt-1">
                Save your changes before Client Preview!
              </h3>
              <p id="unsaved-warning-desc" className="text-xs text-slate-600 mt-1 leading-relaxed">
                You have unsaved edits in your salon workspace. If you proceed to <strong>Client Preview</strong> now without saving, the client preview device simulator may show outdated details rather than your latest updates.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5">
            <span className="material-symbols-outlined text-amber-600 shrink-0 text-lg">lightbulb</span>
            <span>
              Click <strong>Save & Open Client Preview</strong> to save your work to the database and view the latest version immediately.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-100 mt-1">
            <button
              type="button"
              onClick={() => setShowUnsavedWarningModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-center"
            >
              Cancel & Keep Editing
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUnsavedWarningModal(false);
                onOpenClientPreview?.();
              }}
              className="px-4 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-all cursor-pointer text-center"
            >
              Preview Without Saving
            </button>
            <button
              type="button"
              disabled={isSavingInProgress}
              onClick={() => void handleSaveAndOpenClientPreview()}
              className="px-4 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 text-center"
            >
              {isSavingInProgress ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">save</span>
                  <span>Save & Open Client Preview</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
  </main>;
};
