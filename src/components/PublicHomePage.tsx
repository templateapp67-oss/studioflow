import React, { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, IndianRupee, MessageCircle, MonitorSmartphone, Sparkles } from 'lucide-react';
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import type { BusinessTypeId } from '../types';
import { nexoraCategoryFilters, sortTemplatesByPriority } from '../lib/nexoraTemplateCatalogue';
import { NexoraBrandMark, NexoraLogo } from './nexora/NexoraBrand';
import { NexoraTemplateLibrary } from './nexora/NexoraTemplateLibrary';
import { TemplatePreviewModal } from './TemplatePreviewCards';

const templates = sortTemplatesByPriority(Object.values(CATEGORY_TEMPLATES));
const authHref = (mode: 'signin' | 'signup', templateId?: BusinessTypeId) => {
  const params = new URLSearchParams({ auth: mode });
  if (templateId) { params.set('template', templateId); params.set('create', '1'); }
  return '/?' + params.toString();
};

const benefits = [
  { icon: IndianRupee, title: 'INR pricing', copy: 'Show your services and prices in rupees.' },
  { icon: MessageCircle, title: 'WhatsApp enquiries', copy: 'Make it easy for customers to contact you.' },
  { icon: MonitorSmartphone, title: 'Mobile ready', copy: 'A website that works on phones and computers.' },
];
const steps = [
  ['01', 'Choose your salon type', 'Pick one of the 16 ready-made NEXORA website designs.'],
  ['02', 'Add your business details', 'Add your salon name, services, prices, team and photos.'],
  ['03', 'Publish and share', 'Make your website live and share it with customers.'],
];

export function PublicHomePage() {
  const [previewId, setPreviewId] = useState<BusinessTypeId | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const categoryFilters = useMemo(() => nexoraCategoryFilters(templates), []);
  const chooseTemplate = (id: BusinessTypeId) => window.location.assign(authHref('signup', id));

  return <div className="min-h-screen bg-[#FAF8F5] text-[#211A2D] antialiased">
    <header className="sticky top-0 z-50 border-b border-[#E9E2D9] bg-[#FAF8F5]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
        <a href="/" aria-label="NEXORA homepage"><NexoraLogo size="md" /></a>
        <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm font-semibold text-[#655B6D] lg:flex">
          <a href="#categories" className="hover:text-[#8D174E]">Categories</a><a href="#templates" className="hover:text-[#8D174E]">16 Templates</a><a href="#how-it-works" className="hover:text-[#8D174E]">How it works</a><a href="#features" className="hover:text-[#8D174E]">Features</a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <a href={authHref('signin')} className="rounded-full px-3 py-2 text-sm font-bold text-[#51465F] hover:bg-[#F0EAE4] sm:px-4">Sign in</a>
          <a href={authHref('signup')} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#A9004D] px-4 py-2 text-sm font-extrabold text-white shadow-lg shadow-[#A9004D]/15 hover:bg-[#8D003F] sm:px-5">Get started <ArrowUpRight size={15}/></a>
        </div>
      </div>
    </header>

    <main>
      <section aria-labelledby="home-title" className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-24 -z-10 h-[520px] w-[520px] rounded-full bg-[#F1D9E5] opacity-70 blur-3xl"/>
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-44 -z-10 h-[420px] w-[420px] rounded-full bg-[#E8E1F1] opacity-60 blur-3xl"/>
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_.98fr] lg:gap-14 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E8D7C6] bg-white/80 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[.14em] text-[#6B3155] shadow-sm"><NexoraBrandMark size="xs"/> Salon & wellness website platform</div>
            <h1 id="home-title" className="mt-6 max-w-[660px] font-display text-[2.75rem] font-extrabold leading-[1.08] tracking-[-.045em] text-[#21172F] sm:text-5xl lg:text-[3.65rem]">Launch Your Salon Website in <span className="text-[#A9004D]">30 Minutes</span></h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#655B6D] sm:text-lg">Give your salon a professional online home with 16 ready-made NEXORA designs for Indian salons, beauty parlours, barbers, spas and wellness businesses. Add your services, INR prices, team and WhatsApp contact in one place.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={authHref('signup')} className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#A9004D] px-6 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#A9004D]/20 hover:bg-[#8D003F]">Launch AI Salon Setup <ArrowRight size={17}/></a>
              <a href="#templates" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#D8C9D5] bg-white/80 px-6 py-3 text-sm font-extrabold text-[#382B45] hover:bg-white"><MonitorSmartphone size={17}/> Explore all 16 templates</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-[#746A79]">
              <span className="inline-flex items-center gap-2"><Check size={15} className="text-[#A9004D]"/> INR (₹) pricing</span><span className="inline-flex items-center gap-2"><Check size={15} className="text-[#A9004D]"/> WhatsApp contact</span><span className="inline-flex items-center gap-2"><Check size={15} className="text-[#A9004D]"/> Mobile-friendly designs</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[560px] lg:ml-auto">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-[#EEDBE5] via-white to-[#E4DDED] blur-xl"/>
            <div className="relative overflow-hidden rounded-[1.65rem] border border-white bg-white p-3 shadow-[0_28px_90px_rgba(51,32,60,.18)]">
              <div className="flex items-center justify-between border-b border-[#EEE8EE] px-2 pb-3 pt-1"><div className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#FF6B69]"/><i className="h-2.5 w-2.5 rounded-full bg-[#FFC44F]"/><i className="h-2.5 w-2.5 rounded-full bg-[#36C995]"/></div><span className="text-[10px] font-semibold text-[#766B7C]">your-salon.nexora.in</span><span className="rounded-full bg-[#E7F7EF] px-2 py-1 text-[9px] font-extrabold text-[#167A4D]">● LIVE PREVIEW</span></div>
              <div className="p-2 sm:p-3">
                <button type="button" onClick={()=>setPreviewId('hair_salon')} className="group relative block h-[220px] w-full overflow-hidden rounded-2xl bg-[#21172F] text-left sm:h-[270px]" aria-label="Preview a NEXORA salon website template">
                  <img src={CATEGORY_TEMPLATES.hair_salon.coverImageUrl} alt="Example NEXORA salon website design" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"/>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#160F21]/90 via-[#160F21]/10 to-transparent"/>
                  <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/95 px-3 py-1.5 text-[10px] font-extrabold text-[#3B2B49]"><NexoraBrandMark size="xs"/> NEXORA · TEMPLATE 01</div>
                  <div className="absolute bottom-5 left-5 right-5 text-white"><span className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#FFD6E9]">Haircut studio</span><p className="mt-1 text-2xl font-extrabold sm:text-3xl">Your salon. Your style.</p><p className="mt-1 text-sm text-white/80">A beautiful website, ready to make your own.</p></div>
                </button>
                <div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-xl border border-[#E9E2E9] bg-[#FCFAFD] p-3"><p className="text-[10px] text-[#817686]">Add your services</p><p className="mt-1 text-sm font-extrabold">Your menu & prices</p></div><div className="rounded-xl border border-[#E9E2E9] bg-[#FCFAFD] p-3"><p className="text-[10px] text-[#817686]">Connect with customers</p><p className="mt-1 text-sm font-extrabold">WhatsApp ready</p></div></div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#A9004D] px-4 py-3 text-xs font-extrabold text-white"><span>Explore your salon website options</span><ArrowRight size={15}/></div>
            </div>
            <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-2xl border border-[#E9E0E8] bg-white px-4 py-3 shadow-xl sm:flex"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F8E7EF] text-[#A9004D]"><Sparkles size={18}/></span><span><strong className="block text-xs">16 ready-made designs</strong><small className="text-[10px] text-[#827787]">Pick the right look for your salon</small></span></div>
          </div>
        </div>
      </section>

      <section id="categories" aria-labelledby="categories-title" className="scroll-mt-24 border-y border-[#EAE2D9] bg-white/75">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#A9004D]">Find your category</p><h2 id="categories-title" className="mt-1 font-display text-2xl font-extrabold">A design for your kind of business</h2></div><p className="max-w-md text-sm leading-6 text-[#716777]">Choose a category to see matching NEXORA templates. All 16 existing designs stay as they are.</p></div>
          <div className="flex flex-wrap gap-2.5" role="group" aria-label="Choose a salon website category">{categoryFilters.map(filter=>{const selected=activeCategory===filter.id;return <button key={filter.id} type="button" aria-pressed={selected} onClick={()=>{setActiveCategory(filter.id);document.getElementById('templates')?.scrollIntoView({behavior:'smooth',block:'start'});}} className={\`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition \${selected?'border-[#A9004D] bg-[#A9004D] text-white shadow-md':'border-[#E7DFE7] bg-white text-[#4E4257] hover:border-[#C78CA8] hover:bg-[#FCF5F8]'}\`}><span>{filter.label}</span><span className={\`rounded-full px-1.5 py-0.5 text-[10px] \${selected?'bg-white/20':'bg-[#F4EDF2] text-[#76677A]'}\`}>{filter.count}</span></button>;})}</div>
        </div>
      </section>

      <section id="templates" aria-labelledby="templates-title" className="scroll-mt-20 bg-[#FAF8F5]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mb-8 max-w-2xl"><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#A9004D]">NEXORA template library</p><h2 id="templates-title" className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">Explore all 16 salon website templates</h2><p className="mt-3 text-sm leading-7 text-[#716777]">Browse the current NEXORA designs by category, preview a website and choose the one that fits your business. Existing template services and designs are unchanged.</p></div>
          <NexoraTemplateLibrary templates={templates} activeCategoryId={activeCategory} onActiveCategoryChange={setActiveCategory} showCategoryFilters={false} onPreview={setPreviewId} onCustomize={chooseTemplate}/>
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="how-title" className="border-y border-[#EAE2D9] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto mb-9 max-w-2xl text-center"><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#A9004D]">Simple setup</p><h2 id="how-title" className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">From idea to salon website in 30 minutes</h2><p className="mt-3 text-sm leading-7 text-[#716777]">Start with a ready-made design, add your business information and get your website ready to share.</p></div>
          <div className="grid gap-4 md:grid-cols-3">{steps.map(([number,title,copy])=><article key={number} className="rounded-2xl border border-[#E9E1E6] bg-[#FCFAFC] p-6"><span className="font-mono text-xs font-extrabold tracking-[.18em] text-[#A9004D]">{number}</span><h3 className="mt-4 text-lg font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#74697A]">{copy}</p></article>)}</div>
        </div>
      </section>

      <section id="features" aria-labelledby="features-title" className="bg-[#FAF8F5]"><div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl"><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#A9004D]">Made for Indian salons</p><h2 id="features-title" className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">Everything your salon website needs to get started</h2></div>
        <div className="grid gap-4 md:grid-cols-3">{benefits.map(({icon:Icon,title,copy})=><article key={title} className="flex gap-4 rounded-2xl border border-[#E9E1E6] bg-white p-5 shadow-sm"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F9EAF1] text-[#A9004D]"><Icon size={20}/></span><span><h3 className="font-extrabold">{title}</h3><p className="mt-1 text-sm leading-6 text-[#74697A]">{copy}</p></span></article>)}</div>
        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-3xl bg-[#261B34] p-7 text-white sm:flex-row sm:items-center sm:p-9"><div className="max-w-2xl"><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#F5B7D1]">Ready when you are</p><h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">Your salon deserves a website of its own.</h2><p className="mt-2 text-sm leading-6 text-white/70">Choose a design and start building with NEXORA today.</p></div><a href={authHref('signup')} className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-[#8D003F] hover:bg-[#FCEEF4]">Start my website <ArrowRight size={16}/></a></div>
      </div></section>
    </main>

    <footer className="border-t border-[#EAE2D9] bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8"><NexoraLogo size="sm"/><p className="text-xs text-[#766B7C]">16 NEXORA website templates · 15 salon categories · INR (₹) pricing</p><div className="flex items-center gap-4 text-xs font-bold text-[#5D5266]"><a href={authHref('signin')}>Sign in</a><a href={authHref('signup')}>Get started</a><a href="#home-title">Back to top</a></div></div><div className="border-t border-[#F0EAE4] py-4 text-center text-[11px] text-[#978D9B]">© 2026 NEXORA. Your brand, your business.</div></footer>
    {previewId&&<TemplatePreviewModal templateId={previewId} onSelectPreview={setPreviewId} onClose={()=>setPreviewId(null)} onChoose={()=>{const id=previewId;setPreviewId(null);chooseTemplate(id);}}/>}
  </div>;
}
