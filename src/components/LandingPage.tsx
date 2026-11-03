import React, { useCallback, useState } from 'react';
import { TemplatePreviewModal } from './TemplatePreviewCards';
import { NexoraTemplateLibrary } from './nexora/NexoraTemplateLibrary';
import { NexoraLogo, NexoraBrandMark } from './nexora/NexoraBrand';
import { AppView, BusinessTypeId, SalonProfile, SalonService, Stylist } from '../types';
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import { nexoraDisplayName, nexoraTemplateMeta, sortTemplatesByPriority } from '../lib/nexoraTemplateCatalogue';
import type { ArchFlutterCustomizerConfig } from '../lib/archFlutterCustomizer';

interface LandingPageProps {
  setCurrentView: (view: AppView) => void;
  onSelectCategory?: (categoryId: BusinessTypeId) => void;
  /** Templates 13 & 14: the owner customized the demo before creating the website. */
  onCustomizeTemplate?: (categoryId: BusinessTypeId, config: ArchFlutterCustomizerConfig | undefined, workspace?: { profile: SalonProfile; services: SalonService[]; stylists: Stylist[] }) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setCurrentView, onSelectCategory, onCustomizeTemplate }) => {
  /** Always the fixed NEXORA priority order — never alphabetical, never random. */
  const templatesList = sortTemplatesByPriority(Object.values(CATEGORY_TEMPLATES));

  const [previewId, setPreviewId] = useState<BusinessTypeId | null>(null);
  const closePreview = useCallback(() => setPreviewId(null), []);
  const handleTemplateClick = (id: BusinessTypeId) => setPreviewId(id);
  /**
   * "Customize This Template" — opens the editor for exactly this template id.
   * A demo customizer result is handed to the workspace only when the template
   * itself produced one, so no template can ever open another template's editor.
   */
  const handleTemplateCustomize = (id: BusinessTypeId) => {
    if (onCustomizeTemplate) onCustomizeTemplate(id, undefined);
    else if (onSelectCategory) onSelectCategory(id);
    else setCurrentView('wizard');
  };

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex flex-col antialiased">
      {/* Main Hero Banner */}
      <main className="flex-grow pt-20 pb-16 px-4 md:px-8 max-w-7xl mx-auto w-full flex flex-col gap-12">

        {/* Top Hero Section */}
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-12 relative overflow-hidden">
          {/* Abstract Background Glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-fixed/20 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/4 pointer-events-none" />

          {/* Left Column: Copy & CTA */}
          <div className="w-full lg:w-1/2 flex flex-col gap-6 z-10">
            <div className="flex flex-col gap-3.5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F6F1E6] border border-[#E4DCCB] w-fit text-[#2A1E4A]">
                <NexoraBrandMark size="xs" />
                <span className="font-label-caps text-xs uppercase tracking-wider font-bold">
                  NEXORA · Salon &amp; Wellness Platform
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-on-surface tracking-tight leading-tight" style={{ textWrap: 'balance' }}>
                Launch Your Salon Website in 30 Minutes
              </h1>

              <p className="text-base text-on-surface-variant max-w-xl leading-relaxed">
                15 handcrafted NEXORA templates for Indian salons, spas, aesthetic clinics and parlours — each one in a clear category with INR (₹) rates, local sub-categories, stylist portfolios and instant WhatsApp booking.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3.5">
              <button
                onClick={() => setCurrentView('wizard')}
                className="bg-primary hover:bg-primary-container text-on-primary font-bold text-sm h-12 px-8 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 group cursor-pointer active:scale-95"
              >
                <span>Launch AI Salon Setup</span>
                <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>

              <a
                href="#nexora-template-library"
                className="bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-on-surface font-bold text-sm h-12 px-6 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-base">devices</span>
                <span>Explore 15 Live Templates</span>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-secondary font-medium">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">currency_rupee</span>
                <span>Strictly INR (₹) pricing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">location_on</span>
                <span>Authentic Indian locations</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">verified</span>
                <span>15 distinct NEXORA designs</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Preview Card — NEXORA Ziya Women's Haircut Studio */}
          <div className="w-full lg:w-1/2 relative flex items-center justify-center lg:justify-end z-10">
            <div
              onClick={() => handleTemplateClick('hair_salon')}
              className="relative w-full max-w-md bg-white border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col cursor-pointer group hover:scale-[1.01] transition-transform duration-300"
            >
              <div className="h-12 bg-slate-50 flex items-center justify-between px-4 border-b border-slate-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[11px] font-mono text-slate-500 font-semibold flex items-center gap-1">
                  <span>ziyahairstudio.nexora.in</span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  ₹ Live
                </span>
              </div>

              <div className="p-5 flex flex-col gap-4 bg-white relative">
                <div className="w-full h-48 rounded-xl relative overflow-hidden bg-slate-900">
                  <img
                    src={CATEGORY_TEMPLATES.hair_salon.coverImageUrl}
                    alt="NEXORA Ziya Women’s Haircut Studio preview"
                    className="w-full h-full object-cover opacity-95 filter brightness-105 contrast-105 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/92 px-2 py-1 shadow-sm">
                    <NexoraBrandMark size="xs" />
                    <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#2A1E4A]">NEXORA</span>
                    <span className="text-[9px] font-bold text-[#6B5E7A]">01</span>
                  </div>
                  <div className="absolute bottom-3.5 left-3.5 text-white">
                    <span className="text-[10px] font-mono font-bold uppercase bg-white/20 px-2 py-0.5 rounded backdrop-blur-xs">
                      Haircut Studio
                    </span>
                    <h3 className="font-bold text-base mt-1">{nexoraDisplayName('hair_salon')}</h3>
                    <p className="text-[11px] text-slate-200">100 Feet Rd, Indiranagar, Bengaluru</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-mono">Layer Haircut</div>
                    <div className="font-bold text-slate-900 font-mono text-base mt-0.5">₹950</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-mono">Butterfly Haircut</div>
                    <div className="font-bold text-slate-900 font-mono text-base mt-0.5">₹1,250</div>
                  </div>
                </div>

                <div className="w-full py-3 bg-[#b0004a] hover:bg-[#8e003b] text-white rounded-xl text-center text-xs font-bold shadow-md transition-colors">
                  Click to Test Booking &amp; Live Switcher →
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* NEXORA Template Library — category filters, search and all 15 templates */}
        <div className="pt-10 border-t border-outline-variant/30">
          <NexoraTemplateLibrary
            templates={templatesList}
            onPreview={handleTemplateClick}
            onCustomize={handleTemplateCustomize}
          />
        </div>

      </main>

      {previewId && <TemplatePreviewModal templateId={previewId} onSelectPreview={setPreviewId} onClose={closePreview} onChoose={(config, workspace) => { const id = previewId; setPreviewId(null); if ((config || workspace) && onCustomizeTemplate) onCustomizeTemplate(id, config, workspace); else if (onSelectCategory) onSelectCategory(id); else setCurrentView('wizard'); }}/>}
      {/* Footer */}
      <footer className="bg-surface-container-lowest w-full py-8 border-t border-outline-variant/20 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-4 md:px-8 max-w-7xl mx-auto gap-4 text-xs text-secondary">
          <div className="flex items-center gap-2.5">
            <NexoraLogo size="sm" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <span>15 NEXORA salon categories</span>
            <span>•</span>
            <span>INR (₹) Standard</span>
            <span>•</span>
            <span>Bengaluru • Mumbai • Delhi • Hyderabad • Jaipur • Kochi</span>
          </div>

          <div>
            © 2026 NEXORA. Your brand, your business.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
