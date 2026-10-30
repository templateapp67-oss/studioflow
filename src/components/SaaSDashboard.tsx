import {ClinicEnquiries} from './dermacure/ClinicEnquiries';
import {AcademyEnquiriesPanel} from './vogue-noir/AcademyEnquiriesPanel';
import {clinicPriceIsVerified,clinicPublicServices} from '../lib/dermacureContent';
import {OwnerCustomerContacts} from './OwnerCustomerContacts';
import {OwnerDemoBookings} from './OwnerDemoBookings';
import { WebsiteContentManager } from './WebsiteContentManager';
import { uploadSalonImage, websiteLink } from '../lib/supabase';
import React, { useState, useEffect } from 'react';
import { downloadClientsCsv } from '../lib/clientExports';
import { sendBookingConfirmationEmail, sendBookingReminderEmail } from '../lib/emailService';
import { SalonProfile, SalonService, Stylist, Appointment, ClientRecord, LoyaltyConfig } from '../types';
import { ACCENT_PALETTES, AccentPaletteKey, applyPrimaryAccentCssVar, getContrastTextColor, getLuminance } from '../themeAccents';
import { validateAndReadImageFile, compressAndResizeImage } from '../utils/imageUploadHelper';
import { ImageCompressorWidget } from './ImageCompressorWidget';
import { TeamManagement } from './TeamManagement';
import { ServiceManagement } from './ServiceManagement';
import { PromoStudio } from './PromoStudio';
import { LoyaltyManagement } from './LoyaltyManagement';
import { SocialConnectivityStep } from './SocialConnectivityStep';
import { DEFAULT_LOYALTY_CONFIG, TIER_METADATA, calculateLoyaltyTier, calculateRewardProgress } from '../loyaltyData';
import { OwnerPosPanel } from './OwnerPosPanel';
import { SeoSettingsManager } from './SeoSettingsManager';
import { PrismChromaOwnerPanel } from './prism-chroma/PrismChromaOwnerPanel';
import { IronInkAdminPanel } from '../templates/iron-ink/AdminPanel';

interface SaaSDashboardProps {
  ownerId?:string;
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
  services: SalonService[];
  setServices: React.Dispatch<React.SetStateAction<SalonService[]>>;
  stylists: Stylist[];
  setStylists: React.Dispatch<React.SetStateAction<Stylist[]>>;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  clients: ClientRecord[];
  setClients?: React.Dispatch<React.SetStateAction<ClientRecord[]>>;
  loyaltyConfig?: LoyaltyConfig;
  setLoyaltyConfig?: React.Dispatch<React.SetStateAction<LoyaltyConfig>>;
  onNavigateToPreview?: () => void;
  initialTab?:string;
  gallery?:string[];setGallery?:(images:string[])=>void;
  onRefreshBookings?:()=>Promise<void>|void;
}

type TabType = 'iron_ink' | 'contacts' | 'demo' | 'website_sections' | 'overview' | 'calendar' | 'services' | 'team' | 'clients' | 'loyalty' | 'marketing' | 'social_connectivity' | 'seo' | 'appearance' | 'website' | 'colour_studio';

export const SaaSDashboard: React.FC<SaaSDashboardProps> = ({
  profile,
  setProfile,
  services,
  setServices,
  stylists,
  setStylists,
  appointments,
  setAppointments,
  clients,
  setClients = (_clients: React.SetStateAction<ClientRecord[]>) => {},
  loyaltyConfig: externalLoyaltyConfig,
  setLoyaltyConfig: externalSetLoyaltyConfig,
  ownerId='',onNavigateToPreview,initialTab='overview',gallery,setGallery,onRefreshBookings,
}) => {
  const [internalLoyaltyConfig, setInternalLoyaltyConfig] = useState<LoyaltyConfig>(DEFAULT_LOYALTY_CONFIG);
  const loyaltyConfig = externalLoyaltyConfig || internalLoyaltyConfig;
  const setLoyaltyConfig = externalSetLoyaltyConfig || setInternalLoyaltyConfig;

  const [activeTab, setActiveTab] = useState<TabType>(initialTab as TabType);
  useEffect(()=>{setActiveTab(initialTab as TabType);},[initialTab]);
  const [marketingSms, setMarketingSms] = useState<string>('');
  const [marketingLoading, setMarketingLoading] = useState<boolean>(false);
  const [smsSentNotice, setSmsSentNotice] = useState<string>('');
  const [aptEmailFeedback, setAptEmailFeedback] = useState<Record<string, string>>({});
  const [sendingAptEmailId, setSendingAptEmailId] = useState<string>('');
  const [customAptEmail, setCustomAptEmail] = useState<Record<string, string>>({});
  const [showEmailInputForId, setShowEmailInputForId] = useState<string | null>(null);

  const handleSendAptEmail = async (apt: Appointment, type: 'confirmation' | 'reminder') => {
    const targetEmail = (customAptEmail[apt.id] || apt.clientEmail || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setShowEmailInputForId(apt.id);
      setAptEmailFeedback(prev => ({ ...prev, [apt.id]: 'Please enter a valid recipient email below.' }));
      return;
    }
    setSendingAptEmailId(apt.id);
    setAptEmailFeedback(prev => ({ ...prev, [apt.id]: `Sending ${type} email to ${targetEmail}…` }));
    try {
      const payload = {
        to: targetEmail,
        clientName: apt.clientName || 'Valued Guest',
        clientPhone: apt.clientPhone || '',
        bookingRef: apt.id.slice(0, 8).toUpperCase(),
        serviceName: apt.serviceName,
        servicePrice: apt.servicePrice,
        amountPaid: apt.amountPaid || 0,
        stylistName: apt.stylistName,
        date: apt.date,
        time: apt.time,
        salonName: profile.businessName || 'StudioFlow Salon',
        salonAddress: profile.address,
        salonCity: profile.city,
        salonPhone: profile.phone,
        salonWhatsapp: profile.whatsapp,
        salonSlug: profile.subdomain,
      };
      const res = type === 'confirmation'
        ? await sendBookingConfirmationEmail(payload)
        : await sendBookingReminderEmail(payload);
      if (res.success) {
        setAptEmailFeedback(prev => ({
          ...prev,
          [apt.id]: res.delivered ? `Email sent to ${targetEmail}` : `Email dispatched to ${targetEmail}`,
        }));
      } else {
        setAptEmailFeedback(prev => ({ ...prev, [apt.id]: res.error || 'Failed to dispatch email' }));
      }
    } catch (err: any) {
      setAptEmailFeedback(prev => ({ ...prev, [apt.id]: err?.message || 'Email delivery failed' }));
    } finally {
      setSendingAptEmailId('');
    }
  };

  const currentAccentKey: AccentPaletteKey = (profile.themeAccentKey as AccentPaletteKey) || 'slate';
  const currentPalette = ACCENT_PALETTES[currentAccentKey] || ACCENT_PALETTES.slate;
  const currentPrimaryColor = profile.customAccentColor || currentPalette.primaryHex;

  const [customHexInput, setCustomHexInput] = useState<string>(currentPrimaryColor);
  const [accentAppliedFeedback, setAccentAppliedFeedback] = useState<string>('');
  const [appearanceError, setAppearanceError] = useState<string | null>(null);
  const [appearanceSuccess, setAppearanceSuccess] = useState<string | null>(null);

  const uploadAppearance = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl'|'coverImageUrl') => {
    const file=e.target.files?.[0];if(!file)return;
    setAppearanceError(null);setAppearanceSuccess('Uploading image…');
    try{const url=await uploadSalonImage(file);setProfile(p=>({...p,[field]:url}));setAppearanceSuccess('Image uploaded. Your profile will autosave to Supabase.');}
    catch(e){setAppearanceError(e instanceof Error?e.message:'Upload failed');setAppearanceSuccess(null);}
    finally{e.target.value='';}
  };
  const handleLogoUpload=(e:React.ChangeEvent<HTMLInputElement>)=>uploadAppearance(e,'logoUrl');
  const handleHeroUpload=(e:React.ChangeEvent<HTMLInputElement>)=>uploadAppearance(e,'coverImageUrl');
  const totalRevenue = appointments.filter(a=>a.status!=='cancelled').reduce((sum,a)=>sum+(a.amountPaid||0),0);
  const totalBookings = appointments.length;
  const visits=new Map<string,number>();appointments.filter(a=>a.status==='completed').forEach(a=>visits.set(a.clientPhone,(visits.get(a.clientPhone)||0)+1));
  const repeatRate=visits.size?Math.round([...visits.values()].filter(n=>n>1).length/visits.size*100):0;

  const handleSelectAccent = (palKey: AccentPaletteKey) => {
    const pal = ACCENT_PALETTES[palKey];
    if (!pal) return;
    setProfile((prev) => ({
      ...prev,
      themeAccentKey: palKey,
      customAccentColor: undefined,
    }));
    // Updates the primary accent CSS variable across all 14 templates
    applyPrimaryAccentCssVar(pal.primaryHex, pal.secondaryHex);
    setCustomHexInput(pal.primaryHex);
    setAccentAppliedFeedback(`Applied "${pal.name}" (${pal.primaryHex}) to CSS variable --primary-accent!`);
    setTimeout(() => setAccentAppliedFeedback(''), 4000);
  };

  const handleApplyCustomHex = (hex: string) => {
    const formatted = hex.startsWith('#') ? hex : `#${hex}`;
    if (!/^#[0-9A-Fa-f]{6}$/.test(formatted)) {
      setAccentAppliedFeedback('Please enter a valid 6-digit hex code (e.g. #9f1239)');
      setTimeout(() => setAccentAppliedFeedback(''), 4000);
      return;
    }
    setProfile((prev) => ({
      ...prev,
      customAccentColor: formatted,
    }));
    // Updates the primary accent CSS variable across all 14 templates
    applyPrimaryAccentCssVar(formatted);
    setCustomHexInput(formatted);
    setAccentAppliedFeedback(`Applied custom accent ${formatted} to CSS variable --primary-accent!`);
    setTimeout(() => setAccentAppliedFeedback(''), 4000);
  };

  const handleGenerateSms = () => {
    setMarketingLoading(true);
    setTimeout(() => {
      setMarketingSms(
        `Namaste [Client Name]! We miss your glow at ${profile?.businessName || 'Our Salon'}. Book your favorite service this week and receive an exclusive complimentary botanical scalp or hand spa therapy. Claim your slot: ${websiteLink(profile?.subdomain || '')}`
      );
      setMarketingLoading(false);
    }, 1000);
  };

  const updateAppointmentStatus = (id: string, status: 'completed' | 'cancelled') => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const handleSendCampaign = async () => {
    try{await navigator.clipboard.writeText(marketingSms);setSmsSentNotice('Draft copied. Share it with your clients using your messaging app.');}
    catch{setSmsSentNotice('Select and copy the draft above to share it.');}
  };

  return (
    <div className="min-h-screen pt-24 pb-16 flex flex-col items-center bg-[#f9f9ff] text-[#151c27]">
      <div className="max-w-[1240px] w-full px-4 sm:px-6">
        
        {/* DASHBOARD HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-2xl text-white flex items-center justify-center font-bold text-2xl shadow-md transition-colors"
              style={{ backgroundColor: currentPrimaryColor }}
            >
              <span className="material-symbols-outlined text-3xl">storefront</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold">{profile?.businessName || 'Our Salon'}</h1>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-mono-caps font-bold px-2 py-0.5 rounded-full">
                  LIVE SALON SITE
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                {profile?.subdomain ? websiteLink(profile.subdomain) : 'Website not published'} • {profile?.city || 'India'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {onNavigateToPreview && (
              <button
                onClick={onNavigateToPreview}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-gray-300 hover:border-gray-400 bg-white text-gray-700 flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-sm">visibility</span>
                <span>View Salon Preview</span>
              </button>
            )}

            <div className="text-right hidden sm:block border-l border-gray-200 pl-4">
              <div className="text-xs font-bold text-gray-500 font-mono-caps">Monthly Earnings (₹ INR)</div>
              <div 
                className="font-display font-extrabold text-2xl"
                style={{ color: currentPrimaryColor }}
              >
                ₹{totalRevenue.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-gray-200 mb-6 gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: 'dashboard' },
            { id: 'calendar', label: 'Appointments', icon: 'calendar_month' },
            { id: 'demo', label: '₹0 Demo Bookings', icon: 'science' },
            { id: 'services', label: 'Business Services & Custom Offerings', icon: 'spa' },
            { id: 'team', label: 'Team Management', icon: 'badge' },
            { id: 'clients', label: 'Clients CRM', icon: 'group' },
            { id:'contacts',label:'Customers & WhatsApp',icon:'contacts' },
            { id: 'loyalty', label: 'Loyalty & Rewards', icon: 'military_tech' },
            { id: 'marketing', label: 'Promo Image & Social', icon: 'photo_camera_back' },
            { id: 'social_connectivity', label: 'Step 06 • Social Connectivity', icon: 'share' },
            { id: 'seo', label: 'SEO & Social Cards', icon: 'travel_explore' },
            { id: 'appearance', label: 'Appearance', icon: 'palette' },
            { id:'website_sections',label:'Website Sections',icon:'view_quilt' },
            ...(profile.businessType==='tattoo_studio'?[{id:'iron_ink',label:'Iron & Ink Studio',icon:'ink_pen'}]:[]),
            ...(profile.businessType==='hair_coloring'?[{ id:'colour_studio',label:'Colour Studio Inbox',icon:'palette' }]:[]),
            { id: 'website', label: 'Salon Info', icon: 'storefront' }
          ].map((tab) => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-3 text-xs font-bold font-mono-caps border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  isTabActive
                    ? 'font-extrabold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
                style={isTabActive ? { borderColor: currentPrimaryColor, color: currentPrimaryColor } : {}}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id === 'loyalty' && (
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                    {loyaltyConfig.rewards.filter((r) => r.isActive).length} Perks
                  </span>
                )}
                {tab.id === 'marketing' && (
                  <span className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                    Design
                  </span>
                )}
                {tab.id === 'team' && (
                  <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-gray-200">
                    {stylists.length}
                  </span>
                )}
                {tab.id === 'appearance' && (
                  <span 
                    className="w-2.5 h-2.5 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: currentPrimaryColor }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {activeTab === 'seo' && <SeoSettingsManager profile={profile} setProfile={setProfile} />}
        {activeTab==='website_sections'&&<WebsiteContentManager services={services} profile={profile} setProfile={setProfile} gallery={gallery} setGallery={setGallery}/>}
        {activeTab==='iron_ink'&&profile.businessType==='tattoo_studio'&&<IronInkAdminPanel siteId={ownerId}/>}
        {activeTab==='colour_studio'&&profile.businessType==='hair_coloring'&&<PrismChromaOwnerPanel slug={profile.subdomain||''}/>}
        {/* TAB CONTENT: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs">
                <div className="flex justify-between items-center text-gray-500 mb-2">
                  <span className="text-xs font-bold font-mono-caps">Total Revenue (₹)</span>
                  <span className="material-symbols-outlined text-[#b0004a]">payments</span>
                </div>
                <div className="font-display font-extrabold text-2xl">₹{totalRevenue.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-emerald-600 font-bold mt-1">Recorded payments</div>
              </div>

              <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs">
                <div className="flex justify-between items-center text-gray-500 mb-2">
                  <span className="text-xs font-bold font-mono-caps">Appointments</span>
                  <span className="material-symbols-outlined text-[#b0004a]">calendar_month</span>
                </div>
                <div className="font-display font-extrabold text-2xl">{totalBookings}</div>
                <div className="text-[11px] text-emerald-600 font-bold mt-1">All recorded appointments</div>
              </div>

              <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs">
                <div className="flex justify-between items-center text-gray-500 mb-2">
                  <span className="text-xs font-bold font-mono-caps">Active Clients</span>
                  <span className="material-symbols-outlined text-[#b0004a]">person_add</span>
                </div>
                <div className="font-display font-extrabold text-2xl">{clients.length}</div>
                <div className="text-[11px] text-emerald-600 font-bold mt-1">Saved client records</div>
              </div>

              <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs">
                <div className="flex justify-between items-center text-gray-500 mb-2">
                  <span className="text-xs font-bold font-mono-caps">Repeat Visit Rate</span>
                  <span className="material-symbols-outlined text-[#b0004a]">repeat</span>
                </div>
                <div className="font-display font-extrabold text-2xl">{repeatRate}%</div>
                <div className="text-[11px] text-emerald-600 font-bold mt-1">From completed appointments</div>
              </div>
            </div>

            {/* Upcoming Appointments Table */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-display font-bold text-lg">Client Appointments</h2>
                <span className="text-xs text-slate-500 font-mono">Currency: INR (₹)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 font-mono-caps">
                      <th className="py-3 px-2">Client</th>
                      <th className="py-3 px-2">Service</th>
                      <th className="py-3 px-2">Stylist</th>
                      <th className="py-3 px-2">Date & Time</th>
                      <th className="py-3 px-2">Payment (INR)</th>
                      <th className="py-3 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2 font-bold">{apt.clientName}</td>
                        <td className="py-3 px-2">{apt.serviceName} (₹{apt.servicePrice.toLocaleString('en-IN')})</td>
                        <td className="py-3 px-2">{apt.stylistName}</td>
                        <td className="py-3 px-2 font-mono">{apt.date} at {apt.time}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            apt.paymentStatus === 'paid_full' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : apt.paymentStatus === 'paid_deposit'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}>
                            {apt.paymentStatus.replace('_', ' ').toUpperCase()} (₹{apt.amountPaid})
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          {apt.status === 'confirmed' ? (
                            <button
                              onClick={() => setActiveTab('calendar')}
                              className="text-xs bg-emerald-600 text-white font-bold px-2.5 py-1 rounded hover:bg-emerald-700 cursor-pointer"
                            >
                              Collect / Complete
                            </button>
                          ) : (
                            <span className="text-slate-400 font-bold">{apt.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab==='demo'&&<OwnerDemoBookings ownerId={ownerId}/>}

        {/* TAB CONTENT: APPOINTMENTS */}
        {activeTab === 'calendar' && (
          <div className="flex flex-col gap-4">
            {profile.businessType==='skincare_clinic'&&<ClinicEnquiries/>}
            {profile.businessType==='makeup_studio'&&<AcademyEnquiriesPanel/>}
            <OwnerPosPanel slug={profile.subdomain} services={profile.businessType==='skincare_clinic'?clinicPublicServices(profile,services).filter(clinicPriceIsVerified):services} stylists={stylists} appointments={appointments} onChanged={async()=>{await onRefreshBookings?.();}}/>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
            <h2 className="font-display font-bold text-xl mb-4">Calendar & Appointment Schedule</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.length===0&&<p className="text-sm text-gray-500 col-span-full">No appointments yet. Use walk-in booking above for guests at the salon.</p>}
              {appointments.map((apt) => (
                <div key={apt.id} className="p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 shadow-xs flex flex-col justify-between gap-3 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-sm text-gray-900">{apt.clientName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{apt.serviceName} with {apt.stylistName}</div>
                      <div className="text-xs font-mono font-bold text-[#b0004a] mt-1">{apt.date} @ {apt.time} IST</div>
                      {apt.consultationMessage && <p className="text-sm mt-2 whitespace-pre-wrap">Consultation message: {apt.consultationMessage}</p>}
                      {apt.clientEmail && <div className="text-[11px] text-gray-500 font-mono mt-0.5">✉ {apt.clientEmail}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-base text-gray-900 font-mono">₹{apt.servicePrice.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                        {apt.paymentStatus === 'paid_full' ? 'Paid in full' : 'Collected'}: ₹{apt.amountPaid}
                      </div>
                      <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        apt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        apt.status === 'completed' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>

                  {/* Email Feedback Banner */}
                  {aptEmailFeedback[apt.id] && (
                    <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-900 text-[11px] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span className="font-medium">{aptEmailFeedback[apt.id]}</span>
                    </div>
                  )}

                  {/* Optional Custom Email Input */}
                  {(showEmailInputForId === apt.id || (!apt.clientEmail && !customAptEmail[apt.id])) && (
                    <div className="pt-2 border-t border-gray-100 flex gap-2">
                      <input
                        type="email"
                        placeholder="customer@email.com"
                        value={customAptEmail[apt.id] || apt.clientEmail || ''}
                        onChange={(e) => setCustomAptEmail(prev => ({ ...prev, [apt.id]: e.target.value }))}
                        className="flex-1 text-[11px] px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {/* Email Action Triggers */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      disabled={sendingAptEmailId === apt.id}
                      onClick={() => void handleSendAptEmail(apt, 'confirmation')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      title="Dispatch automated booking confirmation email via Resend"
                    >
                      <span>✉</span>
                      <span>{sendingAptEmailId === apt.id ? 'Sending…' : 'Send Confirmation'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={sendingAptEmailId === apt.id}
                      onClick={() => void handleSendAptEmail(apt, 'reminder')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      title="Dispatch 24-hour reminder email with location & appointment details"
                    >
                      <span>⏰</span>
                      <span>{sendingAptEmailId === apt.id ? 'Sending…' : 'Send 24h Reminder'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmailInputForId(showEmailInputForId === apt.id ? null : apt.id)}
                      className="text-[10px] text-gray-400 hover:text-gray-700 ml-auto transition-colors cursor-pointer underline"
                    >
                      {showEmailInputForId === apt.id ? 'Close' : 'Change Email'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: SERVICES */}
        {activeTab === 'services' && (
          <ServiceManagement
            services={services}
            setServices={setServices}
            primaryAccentColor={currentPrimaryColor}
            profile={profile}
            onNavigateToPreview={onNavigateToPreview}
          />
        )}

        {/* TAB CONTENT: TEAM MANAGEMENT */}
        {activeTab === 'team' && (
          <TeamManagement setServices={setServices}
            businessType={profile.businessType}
            stylists={stylists}
            setStylists={setStylists}
            primaryAccentColor={currentPrimaryColor}
            services={services}
            onNavigateToPreview={onNavigateToPreview}
          />
        )}

        {/* TAB CONTENT: CLIENTS */}
        {activeTab === 'clients' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="font-display font-bold text-xl text-gray-900">
                  Client CRM & Visit History
                </h2>
                <p className="text-xs text-gray-500">
                  Manage customer profiles, visit records, preferences, and automated loyalty reward progression.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => downloadClientsCsv(clients, `${profile.subdomain || 'salon'}-clients.csv`)}
                  className="text-xs font-bold px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 shadow-xs flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 active:scale-[0.98] transition-all"
                  aria-label="Export clients to CSV"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  <span>Export Clients CSV</span>
                </button>

                <button
                  onClick={() => setActiveTab('loyalty')}
                  className="text-xs font-bold px-4 py-2 rounded-xl text-white shadow-xs flex items-center gap-1.5 cursor-pointer hover:opacity-95"
                  style={{ backgroundColor: currentPrimaryColor }}
                >
                  <span className="material-symbols-outlined text-sm">military_tech</span>
                  <span>Open Loyalty & Rewards Hub</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <span className="material-symbols-outlined text-3xl text-gray-400 mb-1">group_off</span>
                  <p className="text-sm font-semibold text-gray-700">No client records found</p>
                  <p className="text-xs text-gray-400 mt-1">Bookings and completed salon appointments will automatically populate client CRM entries.</p>
                </div>
              )}
              {clients.map((cli) => {
                const tier = cli.loyaltyTier || calculateLoyaltyTier(cli.lifetimePoints || 0, loyaltyConfig.tierThresholds);
                const tierMeta = TIER_METADATA[tier];
                const { nextReward, pointsNeeded, progressPercentage, unlockedRewards } = calculateRewardProgress(
                  cli.points || 0,
                  loyaltyConfig.rewards
                );

                return (
                  <div 
                    key={cli.id} 
                    className="p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 shadow-xs flex flex-col justify-between gap-3 text-xs"
                  >
                    <div>
                      {/* Top identity & Tier */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-sm text-gray-900">{cli.name}</span>
                          <div className="text-gray-500 text-[11px] font-mono mt-0.5">{cli.phone}</div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono-caps font-bold border ${tierMeta.badgeBg} ${tierMeta.borderColor} flex items-center gap-1`}
                          >
                            <span className="material-symbols-outlined text-xs">{tierMeta.icon}</span>
                            <span>{tierMeta.name.split(' ')[0]}</span>
                          </span>
                          <span className="font-mono text-emerald-700 font-bold text-xs mt-1">
                            ₹{cli.totalSpent.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Notes */}
                      {cli.notes && (
                        <div className="text-gray-600 italic bg-gray-50 p-2 rounded-lg border border-gray-100 text-[11px] mt-2">
                          "{cli.notes}"
                        </div>
                      )}

                      {/* Loyalty Progress Card */}
                      <div className="mt-3 p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-amber-900 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-amber-600">stars</span>
                            <span>{cli.points || 0} pts balance</span>
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            {progressPercentage}% to next reward
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-purple-600 rounded-full"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-gray-600 truncate max-w-[180px]">
                            {nextReward ? `Next: ${nextReward.title}` : '⭐ Max Tier Achieved'}
                          </span>
                          {nextReward && (
                            <span className="font-bold text-amber-800 font-mono">
                              +{pointsNeeded} pts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer Info & Quick Link */}
                    <div className="flex justify-between items-center text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                      <span>Visits: {cli.totalVisits} | {cli.favoriteStylist}</span>
                      <button
                        onClick={() => setActiveTab('loyalty')}
                        className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Loyalty Hub</span>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(activeTab==='clients'||activeTab==='marketing')&&<section className="workspace-card mb-5"><h2>Customer exports & WhatsApp campaigns</h2><p className="muted">Manage real customer contacts, CSV/Excel/phone exports and permission-based campaign drafts.</p><button className="primary-action" onClick={()=>setActiveTab('contacts')}>Open Customers & WhatsApp</button></section>}
        {activeTab==='contacts'&&<OwnerCustomerContacts profile={profile}/>}
        {/* TAB CONTENT: LOYALTY & REWARDS PROGRAM */}
        {activeTab === 'loyalty' && (
          <LoyaltyManagement
            clients={clients}
            setClients={setClients}
            loyaltyConfig={loyaltyConfig}
            setLoyaltyConfig={setLoyaltyConfig}
            primaryAccentColor={currentPrimaryColor}
            profile={profile}
            onNavigateToPreview={onNavigateToPreview}
          />
        )}

        {/* TAB CONTENT: PROMO STUDIO & AI MARKETING */}
        {activeTab === 'marketing' && (
          <div className="flex flex-col gap-6">
            <PromoStudio
              profile={profile}
              setProfile={setProfile}
              services={services}
              primaryAccentColor={currentPrimaryColor}
              onNavigateToPreview={onNavigateToPreview}
            />

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <span className="material-symbols-outlined text-xl">sms</span>
                <h3 className="font-display font-bold text-lg text-gray-900">
                  Quick Client Retention SMS & Broadcast
                </h3>
              </div>
              <p className="text-xs text-gray-500">
                Compose targeted re-engagement reminders to clients who haven't visited in the last 30+ days.
              </p>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col gap-3">
                <button
                  onClick={handleGenerateSms}
                  disabled={marketingLoading}
                  className="text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs w-fit flex items-center gap-2 cursor-pointer transition-opacity"
                  style={{ backgroundColor: currentPrimaryColor }}
                >
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  <span>{marketingLoading ? 'Composing Campaign...' : 'Generate Retention SMS'}</span>
                </button>

                {marketingSms && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold font-mono-caps text-gray-700">
                      Drafted WhatsApp / SMS Campaign
                    </label>
                    <textarea
                      rows={3}
                      value={marketingSms}
                      onChange={(e) => setMarketingSms(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-xs font-mono"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSendCampaign}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg w-fit cursor-pointer flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">send</span>
                        <span>Copy campaign draft</span>
                      </button>
                      {smsSentNotice && (
                        <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                          ✓ {smsSentNotice}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: STEP 06 • SOCIAL CONNECTIVITY */}
        {activeTab === 'social_connectivity' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
            <SocialConnectivityStep
              profile={profile}
              setProfile={setProfile}
              onContinue={onNavigateToPreview}
            />
          </div>
        )}

        {/* TAB CONTENT: APPEARANCE (THEME ACCENT COLOR PICKER & CSS VARIABLE UPDATER) */}
        {activeTab === 'appearance' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span 
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: currentPrimaryColor }}
                  >
                    <span className="material-symbols-outlined text-lg">palette</span>
                  </span>
                  <h2 className="font-display font-bold text-xl text-gray-900">
                    Appearance & Brand Media
                  </h2>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Customize your salon's brand assets and accent palette. Upload custom logos and hero cover banners (uploaded to your account and saved to Supabase), or pick a Theme Accent color (<code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800 font-mono text-[11px]">--primary-accent</code>) used across all 14 templates.
                </p>
              </div>

              {onNavigateToPreview && (
                <button
                  onClick={onNavigateToPreview}
                  className="text-xs font-bold px-4 py-2.5 rounded-xl border border-gray-300 hover:border-gray-400 bg-white text-gray-800 flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  <span>Preview Across 14 Templates</span>
                </button>
              )}
            </div>

            {/* BRAND MEDIA ASSETS: CUSTOM LOGO & HERO IMAGE UPLOAD */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/70 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-600 text-xl">add_photo_alternate</span>
                    <h3 className="font-display font-bold text-base text-gray-900">
                      Brand Media Assets (Custom Logo & Hero Image)
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Upload your salon's custom Logo or Hero Cover Image (Max 5MB per file). Images are uploaded to Supabase Storage and saved in your salon profile.
                  </p>
                </div>
              </div>

              {/* Error and Success Feedback Alerts */}
              {appearanceError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-600 text-base">error</span>
                    <span>{appearanceError}</span>
                  </div>
                  <button onClick={() => setAppearanceError(null)} className="text-rose-500 hover:text-rose-800 text-xs font-bold cursor-pointer">
                    Dismiss
                  </button>
                </div>
              )}

              {appearanceSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-fade-in">
                  <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
                  <span>{appearanceSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Custom Logo Upload Card */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold font-mono-caps text-gray-700 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-purple-600">image</span>
                        <span>Salon Header Logo</span>
                      </span>
                      {profile.logoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setProfile((prev) => {
                              const updated = { ...prev, logoUrl: undefined };
                              return updated;
                            });
                            setAppearanceSuccess('Custom header logo cleared.');
                            setTimeout(() => setAppearanceSuccess(null), 3000);
                          }}
                          className="text-[11px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>

                    <div className="h-24 rounded-lg bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center p-2 relative overflow-hidden">
                      {profile.logoUrl ? (
                        <img
                          src={profile.logoUrl}
                          alt="Salon Logo Preview"
                          className="max-h-20 max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-center text-gray-400 text-xs">
                          <span className="material-symbols-outlined text-2xl block text-gray-300">storefront</span>
                          <span>No custom logo uploaded yet</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs">
                      <span className="material-symbols-outlined text-sm">upload_file</span>
                      <span>Upload Custom Logo (Max 5MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-gray-400 text-center mt-1">
                      Validated (&lt;5MB), uploaded to your account
                    </p>
                  </div>
                </div>

                {/* 2. Custom Hero Image Upload Card */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold font-mono-caps text-gray-700 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-purple-600">photo_library</span>
                        <span>Hero Cover Banner</span>
                      </span>
                    </div>

                    <div className="h-24 rounded-lg bg-gray-900 border border-gray-200 flex items-center justify-center relative overflow-hidden">
                      <img
                        src={profile.coverImageUrl}
                        alt="Hero Banner Preview"
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-2">
                        <span className="text-[10px] text-white font-mono font-bold truncate">Active Hero Cover Image</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="w-full py-2.5 px-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs">
                      <span className="material-symbols-outlined text-sm">upload_file</span>
                      <span>Upload Custom Hero Banner (Max 5MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleHeroUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-gray-400 text-center mt-1">
                      Validated (&lt;5MB), uploaded to your account
                    </p>
                  </div>
                </div>
              </div>

              {/* Real-time Browser-based Image Compression Hub */}
              <div className="mt-4">
                <ImageCompressorWidget
                  onApplyLogo={(url) => {
                    setProfile((prev) => ({ ...prev, logoUrl: url }));
                    setAppearanceSuccess('Optimized image applied as custom logo!');
                    setTimeout(() => setAppearanceSuccess(null), 4000);
                  }}
                  onApplyCover={(url) => {
                    setProfile((prev) => ({ ...prev, coverImageUrl: url }));
                    setAppearanceSuccess('Optimized image applied as custom cover banner!');
                    setTimeout(() => setAppearanceSuccess(null), 4000);
                  }}
                  themePrimaryColor={currentPrimaryColor}
                />
              </div>
            </div>

            {/* Active CSS Variable Status Indicator */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-xl border-2 border-white shadow-md shrink-0 flex items-center justify-center text-white"
                  style={{ backgroundColor: currentPrimaryColor }}
                >
                  <span className="material-symbols-outlined text-lg">check</span>
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">
                      {profile.customAccentColor ? 'Custom Accent Color' : currentPalette.name}
                    </span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-gray-200">
                      {currentPrimaryColor}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono mt-0.5">
                    <span>CSS Variable: <code className="text-gray-800 font-bold">--primary-accent: {currentPrimaryColor}</code></span>
                    <span>•</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live in DOM
                    </span>
                  </div>
                </div>
              </div>

              {accentAppliedFeedback && (
                <div className="text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fade-in">
                  ✓ {accentAppliedFeedback}
                </div>
              )}
            </div>

            {/* Curated Theme Accent Palettes Grid */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold font-mono-caps text-gray-700 block">
                  Curated Theme Accent Palettes
                </label>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Professionally balanced palettes calibrated for contrast, legibility, and high conversion in Indian salons.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.values(ACCENT_PALETTES).map((pal) => {
                  const isSelected = !profile.customAccentColor && currentAccentKey === pal.key;
                  return (
                    <button
                      key={pal.key}
                      onClick={() => handleSelectAccent(pal.key)}
                      className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-white shadow-md ring-2'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs'
                      }`}
                      style={isSelected ? { borderColor: pal.primaryHex, outlineColor: pal.primaryHex } : {}}
                    >
                      <div className="relative shrink-0 mt-0.5">
                        <span
                          className="w-8 h-8 rounded-xl border border-black/10 flex items-center justify-center shadow-xs text-white"
                          style={{ backgroundColor: pal.primaryHex }}
                        >
                          {isSelected && <span className="material-symbols-outlined text-sm">check</span>}
                        </span>
                        <span
                          className="w-3 h-3 rounded-full border border-white absolute -bottom-1 -right-1 shadow-xs"
                          style={{ backgroundColor: pal.secondaryHex }}
                          title={`Secondary: ${pal.secondaryHex}`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-gray-900 truncate flex items-center justify-between">
                          <span>{pal.name}</span>
                          {isSelected && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-800">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate mt-0.5">
                          {pal.categoryHint}
                        </div>
                        <div className="font-mono text-[10px] text-gray-400 mt-1">
                          {pal.primaryHex}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Hex Accent Color Picker */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <label className="text-xs font-bold font-mono-caps text-gray-700 block">
                  Custom Hex Accent Color
                </label>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Enter any custom brand hex code or use the color swatch to update <code className="font-mono text-[10px]">--primary-accent</code>.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="color"
                  value={customHexInput.startsWith('#') ? customHexInput : `#${customHexInput}`}
                  onChange={(e) => {
                    setCustomHexInput(e.target.value);
                    handleApplyCustomHex(e.target.value);
                  }}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300 p-0.5 bg-white shrink-0"
                  title="Choose custom color"
                />
                <input
                  type="text"
                  value={customHexInput}
                  onChange={(e) => setCustomHexInput(e.target.value)}
                  placeholder="#9f1239"
                  className="w-28 p-2 rounded-lg border border-gray-300 font-mono text-xs bg-white text-gray-800 uppercase focus:ring-2 focus:ring-gray-400 outline-none"
                />
                <button
                  onClick={() => handleApplyCustomHex(customHexInput)}
                  className="px-3.5 py-2 rounded-lg font-bold text-xs text-white cursor-pointer shadow-xs transition-opacity shrink-0"
                  style={{ backgroundColor: currentPrimaryColor }}
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Live Interactive CSS Variable Preview Widget */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-white flex flex-col gap-4">
              <div>
                <span className="text-[11px] font-bold font-mono-caps text-gray-400 uppercase tracking-wider">
                  Live UI Component Test Preview (Using var(--primary-accent))
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  See how all 14 salon category templates render this accent on buttons, badges, prices, and highlights:
                </p>
              </div>

              <div 
                className="p-6 rounded-xl border border-dashed border-gray-300 bg-slate-50 flex flex-wrap items-center justify-around gap-6"
                style={{
                  '--primary-accent': currentPrimaryColor,
                  '--theme-primary': currentPrimaryColor,
                  '--accent-luminance': getLuminance(currentPrimaryColor).toFixed(4),
                  '--accent-text-color': getContrastTextColor(currentPrimaryColor),
                  '--accent-contrast-text': getContrastTextColor(currentPrimaryColor),
                } as React.CSSProperties}
              >
                {/* 1. Primary Action Button */}
                <button
                  className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: 'var(--primary-accent)', color: 'var(--accent-text-color, #ffffff)' }}
                >
                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                  <span>Book Appointment</span>
                </button>

                {/* 2. Active Tab Pill */}
                <div 
                  className="px-4 py-1.5 rounded-full text-xs font-bold shadow-xs flex items-center gap-1"
                  style={{ backgroundColor: 'var(--primary-accent)', color: 'var(--accent-text-color, #ffffff)' }}
                >
                  <span>Signature Treatments</span>
                  <span className="text-[10px] font-mono">✓</span>
                </div>

                {/* 3. Transparent Tag Chip */}
                <div 
                  className="px-3 py-1 rounded-md text-xs font-mono font-bold"
                  style={{ 
                    backgroundColor: `${currentPrimaryColor}18`, 
                    color: 'var(--primary-accent)' 
                  }}
                >
                  Bridal & Makeover
                </div>

                {/* 4. Pricing Highlight */}
                <div className="text-center">
                  <div className="text-[10px] font-mono text-gray-400">Treatment Price</div>
                  <div 
                    className="font-mono text-xl font-extrabold"
                    style={{ color: 'var(--primary-accent)' }}
                  >
                    ₹3,800
                  </div>
                </div>

                {/* 5. Rating Badge */}
                <div 
                  className="px-3 py-1 rounded-lg text-white font-mono text-xs font-bold flex items-center gap-1 shadow-xs"
                  style={{ backgroundColor: 'var(--primary-accent)' }}
                >
                  <span>★ 4.95 / 5.0</span>
                </div>
              </div>

              <div className="text-[11px] text-gray-500 italic text-center">
                ✓ Changes to <code className="font-mono font-bold text-gray-700">--primary-accent</code> propagate immediately to all 14 category templates (Bridal, Barbershop, Ayurvedic Spa, Hair Studio, Nail Bar, Skincare, Tattoo, etc.)
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: SALON DETAILS (FORM) */}
        {activeTab === 'website' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 text-gray-900">
                <span className="material-symbols-outlined text-2xl" style={{ color: currentPrimaryColor }}>storefront</span>
                <h2 className="font-display font-bold text-xl text-gray-900">
                  Salon Profile & Business Details
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Essential business details displayed across your live salon website, click-to-call links, and WhatsApp bookings.
              </p>
            </div>

            {/* Core Salon Information Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold font-mono-caps text-gray-700 block mb-1">
                  Salon Brand Name
                </label>
                <input
                  type="text"
                  value={profile.businessName}
                  onChange={(e) => setProfile((prev) => ({ ...prev, businessName: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-gray-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold font-mono-caps text-gray-700 block mb-1">
                  Tagline / Catchphrase
                </label>
                <input
                  type="text"
                  value={profile.tagline}
                  onChange={(e) => setProfile((prev) => ({ ...prev, tagline: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-gray-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold font-mono-caps text-gray-700 block mb-1">
                  Phone (Direct Click-to-Call)
                </label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:ring-2 focus:ring-gray-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold font-mono-caps text-gray-700 block mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  value={profile.whatsapp}
                  onChange={(e) => setProfile((prev) => ({ ...prev, whatsapp: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:ring-2 focus:ring-gray-400 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold font-mono-caps text-gray-700 block mb-1">
                  Salon Address
                </label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-gray-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold font-mono-caps text-gray-700 block mb-1">
                  City & State
                </label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => setProfile((prev) => ({ ...prev, city: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-gray-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold font-mono-caps text-gray-700 block mb-1">
                  Postal PIN Code
                </label>
                <input
                  type="text"
                  value={profile.postalCode}
                  onChange={(e) => setProfile((prev) => ({ ...prev, postalCode: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:ring-2 focus:ring-gray-400 outline-none"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
              <span className="font-medium">
                ✓ Changes update automatically in live preview and across all 14 category templates.
              </span>
              <span className="font-mono text-[11px] font-bold bg-emerald-100 px-2 py-0.5 rounded">
                Live Synced
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
