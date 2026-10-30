import React, { useCallback, useState } from 'react';
import { TemplateThumbnail, TemplatePreviewModal } from './TemplatePreviewCards';
import { AppView, BusinessTypeId } from '../types';
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import type { ArchFlutterCustomizerConfig } from '../lib/archFlutterCustomizer';

interface LandingPageProps {
  setCurrentView: (view: AppView) => void;
  onSelectCategory?: (categoryId: BusinessTypeId) => void;
  /** Template 13 only: the owner customized the demo before creating the website. */
  onCustomizeTemplate?: (categoryId: BusinessTypeId, config: ArchFlutterCustomizerConfig) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setCurrentView, onSelectCategory, onCustomizeTemplate }) => {
  const templatesList = Object.values(CATEGORY_TEMPLATES);

  const [previewId, setPreviewId] = useState<BusinessTypeId | null>(null);
  const closePreview = useCallback(() => setPreviewId(null), []);
  const handleTemplateClick = (id: BusinessTypeId) => setPreviewId(id);

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex flex-col antialiased">
      {/* Main Hero Banner */}
      <main className="flex-grow pt-28 pb-12 px-4 md:px-8 max-w-7xl mx-auto w-full flex flex-col gap-12">
        
        {/* Top Hero Section */}
        <div className="flex flex-col lg:flex-row items-center gap-10 relative overflow-hidden">
          {/* Abstract Background Glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-fixed/20 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/4 pointer-events-none" />

          {/* Left Column: Copy & CTA */}
          <div className="w-full lg:w-1/2 flex flex-col gap-6 z-10">
            <div className="flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-highest border border-outline-variant/50 w-fit">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-label-caps text-xs text-on-surface uppercase tracking-wider font-bold">
                  India Salon & Wellness Platform
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-on-surface tracking-tight leading-tight">
                Launch Your Salon Website in 30 Minutes
              </h1>

              <p className="text-base text-on-surface-variant max-w-xl leading-relaxed">
                14 handcrafted category templates designed specifically for Indian salons, spas, aesthetic clinics, and parlours. Complete with INR (₹) rates, localized sub-categories, stylist portfolios, and instant WhatsApp booking.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setCurrentView('wizard')}
                className="bg-primary hover:bg-primary-container text-on-primary font-bold text-sm h-12 px-8 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Launch AI Salon Setup</span>
                <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>

              <button 
                onClick={() => handleTemplateClick('hair_salon')}
                className="bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-on-surface font-bold text-sm h-12 px-6 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">devices</span>
                <span>Explore 14 Live Templates</span>
              </button>
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
                <span>14 Distinct aesthetic themes</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Preview Card */}
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
                  <span>mirakistudio.nexora.in</span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  ₹ Live
                </span>
              </div>

              <div className="p-5 flex flex-col gap-4 bg-white relative">
                <div className="w-full h-44 rounded-xl relative overflow-hidden bg-slate-900">
                  <img 
                    src={CATEGORY_TEMPLATES.hair_salon.coverImageUrl}
                    alt="Salon Preview"
                    className="w-full h-full object-cover opacity-95 filter brightness-105 contrast-105 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white">
                    <span className="text-[10px] font-mono font-bold uppercase bg-white/20 px-2 py-0.5 rounded">
                      Hair Cut & Styling Studio
                    </span>
                    <h3 className="font-bold text-base mt-1">Miraki Hair Studio</h3>
                    <p className="text-[11px] text-slate-200">100 Feet Rd, Indiranagar, Bengaluru</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-mono">Master Cut & Blowdry</div>
                    <div className="font-bold text-slate-900 font-mono text-base mt-0.5">₹750</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-mono">Keratin Smoothing</div>
                    <div className="font-bold text-slate-900 font-mono text-base mt-0.5">₹4,200</div>
                  </div>
                </div>

                <div className="w-full py-2.5 bg-[#b0004a] text-white rounded-xl text-center text-xs font-bold shadow-sm">
                  Click to Test Booking & Live Switcher →
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 14 Category Templates Showcase Section */}
        <section className="pt-8 border-t border-outline-variant/30 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
                14 Dedicated Salon Verticals
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface mt-1">
                Explore Custom Templates Designed for Every Category
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Every template features its own distinct visual layout, curated Indian services, INR (₹) rates, and stylist team.
              </p>
            </div>

            <button
              onClick={() => handleTemplateClick('hair_salon')}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0"
            >
              <span>View in Live Device Canvas</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          {/* Grid of 14 Category Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {templatesList.map((tmpl) => (
              <article key={tmpl.id} className="group rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl">
                <button type="button" onClick={() => handleTemplateClick(tmpl.id)} aria-label={`Live Preview: ${tmpl.title}`} className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary">
                  <TemplateThumbnail template={tmpl}/>
                </button>
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <span className="w-fit text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">{tmpl.paletteLabel.split('(')[0].trim()}</span>
                  <h3 className="font-bold text-base text-slate-900">{tmpl.title}</h3>
                  <span className="w-fit text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2 py-1 flex items-center gap-1"><span aria-hidden="true" className="material-symbols-outlined text-xs">location_on</span>{tmpl.defaultCity}</span>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{tmpl.tagline}</p>
                  <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">{tmpl.services.length ? `From ₹${Math.min(...tmpl.services.map(s => s.price)).toLocaleString('en-IN')}` : 'View service menu'}</span>
                    <button type="button" onClick={() => handleTemplateClick(tmpl.id)} aria-label={`Open live preview of ${tmpl.title}`} className="text-xs font-bold bg-slate-900 text-white rounded-lg px-3 py-2.5 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary flex items-center gap-1"><span aria-hidden="true" className="material-symbols-outlined text-sm">devices</span>Live Preview</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

      </main>

      {previewId && <TemplatePreviewModal templateId={previewId} onSelectPreview={setPreviewId} onClose={closePreview} onChoose={(config) => { const id = previewId; setPreviewId(null); if (config && onCustomizeTemplate) onCustomizeTemplate(id, config); else if (onSelectCategory) onSelectCategory(id); else setCurrentView('wizard'); }}/>}
      {/* Footer */}
      <footer className="bg-surface-container-lowest w-full py-8 border-t border-outline-variant/20 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-4 md:px-8 max-w-7xl mx-auto gap-4 text-xs text-secondary">
          <div className="flex items-center gap-2 font-bold text-on-surface text-base">
            <span className="material-symbols-outlined text-primary text-xl">spa</span>
            <span>StudioFlow White-label Platform</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <span>14 Salon Categories</span>
            <span>•</span>
            <span>INR (₹) Standard</span>
            <span>•</span>
            <span>Bengaluru • Mumbai • Delhi • Hyderabad • Jaipur • Kochi</span>
          </div>

          <div>
            © 2026 StudioFlow. Your brand, your business.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
