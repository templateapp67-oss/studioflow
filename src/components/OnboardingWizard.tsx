import {ServiceManagement} from './ServiceManagement';
import {servicesForTemplate} from '../lib/serviceCatalogue';
import { applyTemplateDesign } from '../lib/templateSelection';
import { websiteLink } from '../lib/supabase';
import React, { useState } from 'react';
import { SalonProfile, SalonService, Stylist, BusinessTypeId, CategoryTemplateConfig } from '../types';
import { BUSINESS_TYPES } from '../mockData';
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import { AIBioModal } from './AIBioModal';
import { SocialConnectivityStep } from './SocialConnectivityStep';
import { uploadSalonImage } from '../lib/supabase';
import { TeamManagement } from './TeamManagement';

interface OnboardingWizardProps {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
  services: SalonService[];
  setServices: React.Dispatch<React.SetStateAction<SalonService[]>>;
  stylists: Stylist[];
  setStylists: React.Dispatch<React.SetStateAction<Stylist[]>>;
  templates: CategoryTemplateConfig[];
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  profile,
  setProfile,
  services,
  setServices,
  stylists,
  setStylists,
  onComplete,
  templates,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(2); // Start at Step 2 (Business Type)
  const [photoError, setPhotoError] = useState('');
  const [isBioModalOpen, setIsBioModalOpen] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);

  const totalSteps = 12; // 12-step guided flow for maximum ease
  const progressPercent = Math.round((currentStep / totalSteps) * 100);

  const handleBusinessTypeSelect = (typeId: BusinessTypeId) => {
    const tmpl = templates.find(t => t.id === typeId);
    if (!tmpl) return;

    setServices(servicesForTemplate(services,profile,tmpl));
    setProfile(prev=>({...applyTemplateDesign(prev,tmpl),serviceCatalogueInitialized:true}));
    // Add your actual team in the next steps; sample identities are not imported.
  };

  const startAIGeneration = () => { onComplete(); };

  const nextStep = () => {
    if (currentStep === totalSteps - 1) {
      setCurrentStep(totalSteps);
      startAIGeneration();
    } else if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 flex flex-col items-center justify-start bg-[#f9f9ff] text-[#151c27]">
      {/* Bio Modal */}
      <AIBioModal
        isOpen={isBioModalOpen}
        onClose={() => setIsBioModalOpen(false)}
        businessName={profile?.businessName || 'Our Salon'}
        businessType={profile?.businessType || 'hair_salon'}
        ownerName={profile?.ownerName || 'Owner'}
        onApply={(bio, tagline) => {
          setProfile((prev) => ({ ...prev, about: bio, tagline }));
        }}
      />

      <div className={`${currentStep === 6 || currentStep === 7 ? 'max-w-7xl' : 'max-w-4xl'} w-full px-4 sm:px-6 transition-all duration-300`}>
        {/* Progress Header */}
        <div className="mb-8 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#b0004a] text-white text-xs font-bold flex items-center justify-center">
                {currentStep}
              </span>
              <span className="font-display font-bold text-sm text-gray-800">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
            <span className="font-mono-caps text-xs font-bold text-[#b0004a]">
              {progressPercent}% Completed
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-[#b0004a] h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* STEP CONTENT CONTAINER */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xl min-h-[460px] flex flex-col justify-between">
          
          {/* STEP 1: Welcome & Goal */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div>
                <span className="font-mono-caps text-xs font-bold text-[#b0004a] tracking-widest">
                  GET STARTED
                </span>
                <h2 className="font-display text-3xl font-bold mt-1">What is your primary goal today?</h2>
                <p className="text-gray-600 text-sm mt-1">
                  We'll customize your website template and booking options based on your target setup.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
                {[
                  { title: 'Launch New Salon Site', icon: 'web', desc: 'Create a full mobile-friendly website with online bookings.' },
                  { title: 'Enable Online Bookings', icon: 'calendar_month', desc: 'Accept client appointments and deposits 24/7.' },
                  { title: 'Replace Existing Site', icon: 'published_with_changes', desc: 'Upgrade to StudioFlow with automated retention tools.' }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={nextStep}
                    className="p-5 rounded-2xl border-2 border-gray-200 hover:border-[#b0004a] hover:bg-[#b0004a]/5 cursor-pointer transition-all flex flex-col gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#b0004a]/10 text-[#b0004a] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                    </div>
                    <h3 className="font-display font-bold text-base text-gray-900">{item.title}</h3>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Business Type Grid (Matches Screenshot 2) */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div>
                <span className="font-mono-caps text-xs font-bold text-[#b0004a] tracking-widest">
                  BUSINESS TYPE
                </span>
                <h2 className="font-display text-3xl font-bold mt-1">Select your salon category</h2>
                <p className="text-gray-600 text-sm mt-1">
                  This helps us auto-generate the perfect layout, service list, and aesthetic for your brand.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 my-2 max-h-[360px] overflow-y-auto pr-1">
                {templates.map(t => ({ id: t.id, title: t.shortName, icon: t.icon, paletteName: t.paletteLabel, aestheticDescription: t.tagline, description: t.about })).map((bt) => {
                  const isSelected = profile.businessType === bt.id;
                  return (
                    <div
                      key={bt.id}
                      onClick={() => handleBusinessTypeSelect(bt.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 relative ${
                        isSelected
                          ? 'border-[#b0004a] bg-[#b0004a]/5 text-[#b0004a] font-bold shadow-md'
                          : 'border-gray-200 hover:border-gray-300 text-gray-800'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-[#b0004a] text-white' : 'bg-gray-100 text-gray-700'
                      }`}>
                        <span className="material-symbols-outlined text-2xl">{bt.icon}</span>
                      </div>
                      <div className="flex flex-col pr-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-sm font-bold">{bt.title}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-normal">
                            {bt.paletteName}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
                          {bt.aestheticDescription || bt.description}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="material-symbols-outlined text-[#b0004a] text-lg absolute top-3 right-3 fill-1">
                          check_circle
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Business Details & Bio (Matches Screenshot 3) */}
          {currentStep === 3 && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div>
                <span className="font-mono-caps text-xs font-bold text-[#b0004a] tracking-widest">
                  SALON INFORMATION
                </span>
                <h2 className="font-display text-3xl font-bold mt-1">Tell us about your business</h2>
                <p className="text-gray-600 text-sm mt-1">
                  Add your contact details and founder story to build immediate trust with clients.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-2">
                {/* Left: Founder Photo Upload Card */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-[#b0004a] shadow-md relative group">
                    <img
                      src={profile.ownerPhotoUrl}
                      alt={profile.ownerName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="font-display text-sm font-bold">{profile.ownerName || 'Salon Owner'}</div>
                    <div className="text-xs text-gray-500">{profile.ownerRole || 'Founder'}</div>
                  </div>
                  <label className="text-xs font-bold text-[#b0004a] cursor-pointer">
                    Upload owner photo
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async(e)=>{const file=e.target.files?.[0];if(!file)return;try{const url=await uploadSalonImage(file);setProfile(p=>({...p,ownerPhotoUrl:url}));setPhotoError('');}catch(error){setPhotoError(error instanceof Error?error.message:'Photo upload failed');}}} />
                  </label>
                  {photoError&&<p role="alert" className="text-xs text-red-700">{photoError}</p>}
                </div>

                {/* Right: Input fields */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-gray-700">Salon Name</label>
                    <input
                      type="text"
                      value={profile?.businessName || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfile((prev) => ({ ...prev, businessName: val }));
                      }}
                      className="w-full mt-1 p-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700">Owner / Lead Stylist Name</label>
                    <input
                      type="text"
                      value={profile.ownerName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfile((prev) => ({ ...prev, ownerName: val }));
                      }}
                      className="w-full mt-1 p-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700">Phone Number</label>
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfile((prev) => ({ ...prev, phone: val }));
                      }}
                      className="w-full mt-1 p-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700">WhatsApp / Booking Line</label>
                    <input
                      type="text"
                      value={profile.whatsapp}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfile((prev) => ({ ...prev, whatsapp: val }));
                      }}
                      className="w-full mt-1 p-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-gray-700">Salon Story / Bio</label>
                      <button
                        type="button"
                        onClick={() => setIsBioModalOpen(true)}
                        className="text-[#b0004a] font-bold text-xs hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        <span>Compose salon story</span>
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={profile.about}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfile((prev) => ({ ...prev, about: val }));
                      }}
                      className="w-full p-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Aesthetics & Theme Presets */}
          {currentStep === 4 && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div>
                <span className="font-mono-caps text-xs font-bold text-[#b0004a] tracking-widest">
                  VISUAL STYLE
                </span>
                <h2 className="font-display text-3xl font-bold mt-1">Choose your website aesthetic</h2>
                <p className="text-gray-600 text-sm mt-1">
                  Select a color palette and visual atmosphere that matches your salon vibe.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
                {[
                  { id: 'luxe_light', name: 'Luxe Light', bg: 'bg-[#f9f9ff]', accent: 'bg-[#b0004a]', text: 'text-gray-900', desc: 'Clean, elegant, high-contrast rose accent.' },
                  { id: 'champagne_gold', name: 'Champagne Gold', bg: 'bg-[#fbf8f2]', accent: 'bg-[#c59b27]', text: 'text-gray-900', desc: 'Refined, golden warm luxury salon theme.' },
                  { id: 'velvet_rose', name: 'Velvet Rose', bg: 'bg-[#fff5f7]', accent: 'bg-[#d81b60]', text: 'text-gray-900', desc: 'Warm rose tones for high-end boutique salons.' },
                  { id: 'emerald_botanical', name: 'Emerald Botanical', bg: 'bg-[#f2f7f4]', accent: 'bg-[#1b5e20]', text: 'text-gray-900', desc: 'Calming organic green tones for spas & wellness.' }
                ].map((tp) => (
                  <div
                    key={tp.id}
                    onClick={() => setProfile((p) => ({ ...p, themePreset: tp.id as any }))}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-3 ${
                      profile.themePreset === tp.id
                        ? 'border-[#b0004a] ring-2 ring-[#b0004a]/30 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-display font-bold text-base">{tp.name}</span>
                      {profile.themePreset === tp.id && (
                        <span className="material-symbols-outlined text-[#b0004a] text-xl fill-1">
                          check_circle
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{tp.desc}</p>
                    <div className={`h-12 w-full rounded-lg ${tp.bg} border border-gray-300 p-2 flex items-center justify-between`}>
                      <span className={`text-xs font-bold ${tp.text}`}>Preview Text</span>
                      <div className={`w-6 h-6 rounded-full ${tp.accent}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Shared business service catalogue */}
          {currentStep === 5 && <ServiceManagement services={services} setServices={setServices} profile={profile} primaryAccentColor="#b0004a"/>}

          {/* STEP 06: SOCIAL CONNECTIVITY */}
          {currentStep === 6 && (
            <div className="animate-fade-in w-full">
              <SocialConnectivityStep
                profile={profile}
                setProfile={setProfile}
                onBack={prevStep}
                onContinue={nextStep}
              />
            </div>
          )}

          {/* STEP 7-10: Booking Rules, Payments, Domain */}
          {currentStep >= 7 && currentStep <= 10 && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div>
                <span className="font-mono-caps text-xs font-bold text-[#b0004a] tracking-widest">
                  CONFIGURATION
                </span>
                <h2 className="font-display text-3xl font-bold mt-1">
                  {currentStep === 7 && 'Team members & specialists'}
                  {currentStep === 8 && 'Booking & deposit rules'}
                  {currentStep === 9 && 'Payment gateways'}
                  {currentStep === 10 && 'Claim your free domain name'}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {currentStep === 7 ? 'Add, edit and assign your specialists before opening bookings.' : currentStep === 8 ? 'Set your booking deposit and business hours.' : currentStep === 9 ? 'Review the payment options supported by this workspace.' : 'Choose the website address you want to use.'}
                </p>
              </div>

              {currentStep === 8 && (
                <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col gap-4">
                  <h3 className="font-bold">Mandatory 25% booking advance</h3><p className="text-sm text-gray-600">The platform collects a 25% Razorpay deposit before confirming a booking. The remaining 75% is due at the salon.</p>
                </div>
              )}

              {currentStep === 10 && (
                <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col gap-3">
                  <label className="font-bold text-xs font-mono-caps text-gray-700">
                    Your Subdomain
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={profile.subdomain}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        setProfile((prev) => ({ ...prev, subdomain: val }));
                      }}
                      className="p-3 rounded-xl border border-gray-300 bg-white text-gray-900 font-mono font-bold text-sm flex-1"
                    />
                    <span className="font-mono text-sm text-gray-500">website slug</span>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>Website link: {websiteLink(profile.subdomain || 'your-salon')}. Available after you publish; each salon needs a unique slug.</span>
                  </div>
                </div>
              )}

              {currentStep === 7 && (
                <div className="space-y-4">
                  <TeamManagement stylists={stylists} setStylists={setStylists} services={services} primaryAccentColor="#b0004a" />
                  <p className="text-xs text-gray-500">Team changes are saved on this device and shared with your dashboard and website preview. Remove sample specialists and add your actual team.</p>
                </div>
              )}

              {currentStep === 8 && (
                <fieldset className="p-5 rounded-2xl border border-gray-200 space-y-4">
                  <legend className="px-2 font-bold text-sm">Salon opening hours</legend>
                  <p className="text-xs text-gray-500">These hours appear in your website’s location section. Use “Closed” for a day off; individual staff schedules are set in the team step.</p>
                  {([
                    ['workingHoursMonFri', 'Monday – Friday (except Tuesday)', '09:00 AM – 07:00 PM'],
                    ['workingHoursTue', 'Tuesday', '09:00 AM – 07:00 PM'],
                    ['workingHoursSun', 'Sunday', 'Closed'],
                  ] as const).map(([key, label, placeholder]) => (
                    <label key={key} className="block text-sm font-medium">
                      {label}
                      <input value={profile[key] || ''} placeholder={placeholder} onChange={(e) => setProfile(prev => ({ ...prev, [key]: e.target.value }))} className="block mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm" />
                    </label>
                  ))}
                </fieldset>
              )}

              {currentStep === 9 && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-gray-200 p-5 space-y-3">
                      <span className="material-symbols-outlined text-[#b0004a]">storefront</span>
                      <h3 className="font-bold">Pay at salon</h3>
                      <p className="text-sm text-gray-600">Customers can choose to pay at reception. Accept cash, UPI or card using your own payment facilities.</p>
                      <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 font-bold">Available in booking</span>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
                      <span className="material-symbols-outlined text-amber-700">payments</span>
                      <h3 className="font-bold">Online advance payment</h3>
                      <p className="text-sm text-gray-600">A mandatory 25% Razorpay advance confirms each appointment after server verification.</p>
                      <span className="inline-block rounded-full bg-white px-3 py-1 text-xs text-amber-800 font-bold">Gateway not connected</span>
                    </div>
                  </div>
                  <p className="rounded-xl border border-gray-200 p-4 text-sm text-gray-600">No live gateway is connected by this setup step. Connect and verify a payment provider before collecting real online payments.</p>
                  <button type="button" onClick={() => setCurrentStep(8)} className="text-sm font-bold text-[#b0004a] underline">Edit deposit rules</button>
                </div>
              )}
            </div>
          )}

          {/* STEP 11 & 12: Realtime Generation Progress */}
          {currentStep === 11 && !isGenerating && (
            <div className="space-y-5">
              <div><span className="text-xs font-bold text-[#b0004a]">FINAL REVIEW</span><h2 className="text-3xl font-bold mt-1">Your salon setup is ready to review</h2><p className="text-sm text-gray-500 mt-2">Confirm your details before creating the website preview.</p></div>
              <dl className="grid sm:grid-cols-2 gap-3">
                {[
                  ['Business', profile.businessName], ['Contact', profile.phone],
                  ['Services', `${services.length} services`], ['Team', `${stylists.length} specialists`],
                  ['Booking deposit', '25% · Platform policy'],
                  ['Payment gateway', 'Not connected — demonstration only'],
                ].map(([label, value]) => <div key={label} className="border border-gray-200 rounded-xl p-4"><dt className="text-xs text-gray-500">{label}</dt><dd className="font-bold mt-1">{value || 'Not entered'}</dd></div>)}
              </dl>
              <p className="text-xs text-gray-500">Your configuration is stored on this device. Creating a preview does not connect a payment gateway or register a domain.</p>
            </div>
          )}

          {(currentStep === 12 || isGenerating) && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-6 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-[#b0004a]/10 text-[#b0004a] flex items-center justify-center relative">
                <span className="material-symbols-outlined text-4xl animate-spin">auto_awesome</span>
              </div>

              <div>
                <h2 className="font-display text-3xl font-bold">Generating Your Salon Website...</h2>
                <p className="text-xs text-gray-500 mt-2 font-mono-caps">
                  Building layout, palette, and booking engine for {profile?.businessName || 'your salon'}
                </p>
              </div>

              <div className="w-full max-w-md bg-gray-100 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-[#b0004a] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>

              <div className="text-xs font-bold text-[#b0004a]">
                {generationProgress}% - {generationProgress < 40 ? 'Analyzing brand aesthetic' : generationProgress < 80 ? 'Setting up calendar & booking system' : 'Finalizing live preview...'}
              </div>
            </div>
          )}

          {/* BOTTOM CONTROLS (Hidden on step 6 since SocialConnectivityStep includes its own nav footer) */}
          {!isGenerating && currentStep !== 6 && (
            <div className="flex justify-between items-center border-t border-gray-100 pt-6 mt-6">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Back</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={nextStep}
                  className="bg-[#b0004a] hover:bg-[#d81b60] text-white text-xs font-bold px-7 py-3 rounded-lg shadow-md shadow-[#b0004a]/20 hover:shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>{currentStep === totalSteps - 1 ? 'Generate Website' : 'Continue'}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
