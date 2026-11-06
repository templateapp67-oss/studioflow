import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck2,
  Check,
  Clock3,
  Eye,
  Images,
  IndianRupee,
  LayoutTemplate,
  Menu,
  MonitorSmartphone,
  MousePointer2,
  Rocket,
  Sparkles,
  Star,
  UsersRound,
  WandSparkles,
  X,
} from 'lucide-react';
import {
  NEXORA_CATEGORIES,
  nexoraCategoryFilters,
  nexoraDisplayName,
  nexoraTemplateMeta,
  sortTemplatesByPriority,
} from '../lib/nexoraTemplateCatalogue';
import { NEXORA_PUBLIC_TEMPLATES, NEXORA_PUBLIC_TEMPLATES_BY_ID, type NexoraTemplateCardData } from '../lib/nexoraPublicTemplates';
import { nexoraPreviewImage } from '../lib/nexoraPreviewImages';
import type { BusinessTypeId } from '../types';
import { NexoraTemplateLibrary } from './nexora/NexoraTemplateLibrary';
import { CategoryIconTile, NexoraBrandMark } from './nexora/NexoraBrand';
import './publicHomepage.css';

const TemplatePreviewModal = lazy(() => import('./TemplatePreviewModal').then((module) => ({ default: module.TemplatePreviewModal })));

export const PUBLIC_SIGNUP_PATH = '/login?auth=signup';

export function templateSignupPath(templateId?: BusinessTypeId) {
  return templateId
    ? `${PUBLIC_SIGNUP_PATH}&template=${encodeURIComponent(templateId)}&create=1`
    : PUBLIC_SIGNUP_PATH;
}

const navigation = [
  { label: 'Categories', href: '#salon-categories' },
  { label: '16 Templates', href: '#nexora-template-library' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
];

const steps = [
  {
    number: '01',
    title: 'Choose Your Template',
    description: 'Choose a suitable design from the 16 existing templates.',
    Icon: LayoutTemplate,
  },
  {
    number: '02',
    title: 'Customise Your Website',
    description: 'Add salon details, images, services, staff information and other business details.',
    Icon: WandSparkles,
  },
  {
    number: '03',
    title: 'Launch Your Website',
    description: 'Publish your salon website and share it with customers.',
    Icon: Rocket,
  },
];

const features = [
  {
    title: 'Ready-made salon websites',
    description: 'Start with one of 16 purpose-built salon, spa and beauty-business templates.',
    Icon: LayoutTemplate,
  },
  {
    title: 'Easy website customisation',
    description: 'Update your branding, content, images and business details without coding.',
    Icon: WandSparkles,
  },
  {
    title: 'Services & pricing',
    description: 'Manage your service menu, categories, durations and INR pricing in one place.',
    Icon: IndianRupee,
  },
  {
    title: 'Staff profiles',
    description: 'Introduce your team with roles, experience, specialties and profile photos.',
    Icon: UsersRound,
  },
  {
    title: 'Online appointment booking',
    description: 'Let customers choose services and request appointments through your website.',
    Icon: CalendarCheck2,
  },
  {
    title: 'Gallery & customer reviews',
    description: 'Show your salon work and publish customer feedback on your website.',
    Icon: Images,
  },
  {
    title: 'Mobile-friendly websites',
    description: 'Give customers a clear, responsive experience on phones, tablets and desktops.',
    Icon: MonitorSmartphone,
  },
  {
    title: 'Easy business management',
    description: 'Keep website content, staff, services and appointments together in your workspace.',
    Icon: BriefcaseBusiness,
  },
];

function PublicBrand() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <NexoraBrandMark size="md" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-black uppercase tracking-[0.2em] text-[#1B1630]">NEXORA</span>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#7A4E8F]">Salon OS</span>
      </span>
    </span>
  );
}

function PublicTemplateArtwork({ template }: { template: NexoraTemplateCardData }) {
  const meta = nexoraTemplateMeta(template.id);
  return (
    <div aria-hidden="true" className="bg-slate-100 p-4 pb-0">
      <div className="overflow-hidden rounded-t-xl border border-slate-300 bg-white shadow-sm">
        <div className="flex h-6 items-center gap-1 border-b border-slate-200 bg-white px-2">
          <i className="h-1.5 w-1.5 rounded-full bg-rose-300" />
          <i className="h-1.5 w-1.5 rounded-full bg-amber-300" />
          <i className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          <span className="ml-1.5 rounded-sm bg-[#2A1E4A] px-1 py-px text-[6px] font-black uppercase tracking-[0.12em] text-[#F5E9D6]">NEXORA</span>
          <span className="ml-auto truncate text-[7px] font-semibold tracking-wide text-[#6B5E7A]">{template.shortName}</span>
        </div>
        <div className="relative h-40 overflow-hidden bg-[#221B34]">
          <img
            src={nexoraPreviewImage(template)}
            alt=""
            width={1200}
            height={700}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="h-full w-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#14101F]/85 via-[#14101F]/25 to-transparent" />
          <div className="absolute inset-x-3 bottom-3 text-white">
            <span className="text-[7px] font-semibold uppercase tracking-[0.16em] text-white/80">{meta?.categoryName || 'Salon website'}</span>
            <p className="mt-1 text-sm font-extrabold leading-tight">{template.title}</p>
            <p className="mt-1 text-[8px] leading-relaxed text-white/80">{meta?.bestFor}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 bg-white p-2">
          {(meta?.services || []).slice(0, 3).map((service) => (
            <div key={service} className="truncate border border-slate-100 px-1.5 py-2 text-[7px] font-semibold text-slate-700">{service}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Public, signed-out marketing homepage. Cards use presentation metadata only. */
export function PublicHomepage() {
  const templates = sortTemplatesByPriority(NEXORA_PUBLIC_TEMPLATES);
  const categoryFilters = nexoraCategoryFilters(templates).slice(1);
  const [activeCategory, setActiveCategory] = useState('all');
  const [previewId, setPreviewId] = useState<BusinessTypeId | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closePreview = useCallback(() => setPreviewId(null), []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const scrollToLibrary = useCallback(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('nexora-template-library')?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  const chooseCategory = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    window.setTimeout(scrollToLibrary, 0);
  }, [scrollToLibrary]);

  const customizeTemplate = useCallback((templateId: BusinessTypeId) => {
    window.location.assign(templateSignupPath(templateId));
  }, []);

  const previewTemplate = useCallback((templateId: BusinessTypeId) => {
    setMenuOpen(false);
    setPreviewId(templateId);
  }, []);

  const heroTemplate = NEXORA_PUBLIC_TEMPLATES_BY_ID.hair_salon;

  return (
    <div className="public-homepage min-h-screen bg-surface font-body-md text-on-surface antialiased">
      <a className="public-skip-link" href="#public-main-content">Skip to main content</a>
      <header className="sticky top-0 z-50 border-b border-[#E4DCCB]/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <a href="/" aria-label="NEXORA Salon OS home" className="shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7A4E8F]">
            <PublicBrand />
          </a>

          <nav aria-label="Main navigation" className="ml-auto hidden items-center gap-1 lg:flex">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#4A4058] transition hover:bg-[#F6F1E6] hover:text-[#2A1E4A] focus-visible:outline-2 focus-visible:outline-[#7A4E8F]">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-3">
            <a href="/login" className="hidden min-h-[44px] items-center rounded-xl px-4 text-sm font-bold text-[#2A1E4A] transition hover:bg-[#F6F1E6] focus-visible:outline-2 focus-visible:outline-[#7A4E8F] sm:inline-flex">
              Sign In
            </a>
            <a href={PUBLIC_SIGNUP_PATH} className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-5">
              Get Started <ArrowRight size={15} aria-hidden="true" />
            </a>
            <button
              type="button"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="public-mobile-navigation"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E4DCCB] bg-white text-[#2A1E4A] transition hover:bg-[#FBF8F2] focus-visible:outline-2 focus-visible:outline-[#7A4E8F] lg:hidden"
            >
              {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="public-mobile-navigation" aria-label="Mobile navigation" className="border-t border-[#E4DCCB] bg-white px-4 py-4 shadow-xl lg:hidden">
            <div className="mx-auto grid max-w-[1440px] gap-1">
              {navigation.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="flex min-h-[46px] items-center justify-between rounded-xl px-3 text-sm font-bold text-[#3F3550] hover:bg-[#F6F1E6]">
                  {item.label} <ArrowRight size={15} aria-hidden="true" />
                </a>
              ))}
              <a href="/login" className="mt-2 inline-flex min-h-[46px] items-center justify-center rounded-xl border border-[#D9CFBC] px-4 text-sm font-bold text-[#2A1E4A] hover:bg-[#FBF8F2] sm:hidden">
                Sign In
              </a>
            </div>
          </nav>
        )}
      </header>

      <main id="public-main-content">
        {/* 1 · Hero and actual template experience */}
        <section aria-labelledby="public-home-title" className="relative overflow-hidden border-b border-[#E4DCCB]/70 bg-gradient-to-br from-[#FBF8F2] via-white to-[#F6F1E6]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-40 h-[480px] w-[480px] rounded-full bg-primary-fixed/25 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-40 h-[420px] w-[420px] rounded-full bg-[#7A4E8F]/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:gap-14 lg:px-10 lg:py-24 xl:gap-20">
            <div className="min-w-0">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E4DCCB] bg-white/85 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#2A1E4A] shadow-sm">
                <Sparkles size={14} aria-hidden="true" className="text-primary" />
                Your salon. Your website. Your brand.
              </div>
              <h1 id="public-home-title" className="max-w-[720px] font-display text-[2.55rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#1B1630] sm:text-5xl lg:text-[3.35rem] xl:text-[3.75rem]" style={{ textWrap: 'balance' }}>
                Launch Your NEXORA Salon Website in 30 Minutes
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[#5B5470] sm:text-lg sm:leading-8">
                Create a professional website for your salon without coding. Choose a design, add your services and business details, then share your website with customers.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#nexora-template-library" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-on-primary shadow-xl shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  Explore Templates <ArrowRight size={17} aria-hidden="true" />
                </a>
                <a href={PUBLIC_SIGNUP_PATH} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[#C9A66B] bg-white px-6 text-sm font-bold text-[#2A1E4A] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FBF8F2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A4E8F]">
                  Get Started <Rocket size={16} aria-hidden="true" />
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-[#5B5470]" aria-label="Product highlights">
                {['16 ready-made designs', 'No coding required', 'Preview before signup'].map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7A4E8F]"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mx-auto w-full min-w-0 max-w-[720px] lg:mx-0">
              <div className="group relative overflow-hidden rounded-[22px] border border-[#D9CFBC] bg-white shadow-[0_28px_80px_rgba(42,30,74,0.18)] ring-1 ring-[#2A1E4A]/5">
                <div className="flex h-12 items-center gap-3 border-b border-[#E4DCCB] bg-[#FBF8F2] px-4 sm:px-5">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#D9A6A1]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#C9A66B]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#738B78]" />
                  </div>
                  <div className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-[#E4DCCB] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#6B5E7A]">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
                    <span className="truncate">ziyahairstudio.nexora.in</span>
                  </div>
                  <span className="hidden rounded-full bg-[#EDE9FE] px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#7A4E8F] sm:inline-flex">Live demo</span>
                </div>
                <PublicTemplateArtwork template={heroTemplate} />
                <div className="flex flex-col gap-3 border-t border-[#E4DCCB] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-[#1B1630]">{nexoraDisplayName('hair_salon', heroTemplate.title)}</p>
                    <p className="mt-1 text-[11px] text-[#6B5E7A]">Template artwork and sample services</p>
                  </div>
                  <button type="button" onClick={() => previewTemplate('hair_salon')} className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2A1E4A] px-4 text-xs font-bold text-white transition hover:bg-[#3E2A63] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A4E8F]">
                    <Eye size={15} aria-hidden="true" /> Open interactive preview
                  </button>
                </div>
              </div>
              <div className="absolute -right-3 -top-4 hidden items-center gap-2 rounded-2xl border border-[#E4DCCB] bg-white px-3.5 py-3 shadow-xl sm:flex lg:-right-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-fixed/60 text-primary"><Clock3 size={17} aria-hidden="true" /></span>
                <span><strong className="block text-xs text-[#1B1630]">Ready in 30 minutes</strong><span className="text-[10px] text-[#6B5E7A]">Simple guided setup</span></span>
              </div>
              <div className="absolute left-0 top-full mt-4 hidden items-center gap-2 rounded-2xl border border-[#E4DCCB] bg-white px-3.5 py-3 shadow-xl sm:flex">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#F3EEE4] text-[#7A4E8F]"><MousePointer2 size={17} aria-hidden="true" /></span>
                <span><strong className="block text-xs text-[#1B1630]">Try before you sign up</strong><span className="text-[10px] text-[#6B5E7A]">Desktop, tablet & mobile</span></span>
              </div>
            </div>
          </div>
        </section>

        {/* 2 · Existing category system, connected to the library's own filter state */}
        <section id="salon-categories" aria-labelledby="salon-categories-title" className="scroll-mt-24 bg-white">
          <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Find your perfect starting point</p>
                <h2 id="salon-categories-title" className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#1B1630] sm:text-4xl">Popular salon categories</h2>
                <p className="mt-3 text-sm leading-6 text-[#5B5470] sm:text-base">Choose your business type to see its matching NEXORA template. Every shortcut uses the same library filters below.</p>
              </div>
              <a href="#nexora-template-library" onClick={() => setActiveCategory('all')} className="inline-flex min-h-[44px] shrink-0 items-center gap-2 self-start rounded-xl border border-[#D9CFBC] px-4 text-xs font-bold text-[#2A1E4A] hover:bg-[#FBF8F2] sm:self-auto">
                View All Templates <ArrowRight size={15} aria-hidden="true" />
              </a>
            </div>

            <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
              {NEXORA_CATEGORIES.map((category) => {
                const filter = categoryFilters.find((entry) => entry.id === category.categoryId);
                if (!filter) return null;
                const selected = activeCategory === category.categoryId;
                return (
                  <button
                    key={category.categoryId}
                    type="button"
                    data-category-shortcut={category.categoryId}
                    aria-pressed={selected}
                    onClick={() => chooseCategory(category.categoryId)}
                    className={`group flex min-w-0 flex-col items-start rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A4E8F] ${selected ? 'border-[#7A4E8F] bg-[#FBF8F2] ring-2 ring-[#7A4E8F]/15' : 'border-[#E4DCCB] bg-[#FBF8F2]/65 hover:border-[#C9A66B]'}`}
                  >
                    <span className="flex w-full items-start justify-between gap-2">
                      <CategoryIconTile icon={category.icon} color={category.color} tint={category.tint} size="md" />
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-extrabold text-[#6B5E7A] ring-1 ring-[#E4DCCB]">{filter.count} {filter.count === 1 ? 'design' : 'designs'}</span>
                    </span>
                    <span className="mt-4 text-sm font-extrabold leading-snug text-[#1B1630]">{category.categoryName}</span>
                    <span className="mt-1.5 hidden text-[11px] leading-5 text-[#6B5E7A] sm:block">{category.categoryDescription}</span>
                    <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#7A4E8F]">View template{filter.count > 1 ? 's' : ''} <ArrowRight size={12} aria-hidden="true" className="transition group-hover:translate-x-0.5" /></span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3 · The one existing 16-template library */}
        <div className="bg-surface py-16 sm:py-20">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
            <NexoraTemplateLibrary
              templates={templates}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              onPreview={previewTemplate}
              onCustomize={customizeTemplate}
            />
          </div>
        </div>

        {/* 4 · Three-step launch process */}
        <section id="how-it-works" aria-labelledby="how-it-works-title" className="scroll-mt-24 bg-[#2A1E4A] text-white">
          <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#C9A66B]">From idea to online</p>
              <h2 id="how-it-works-title" className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">How it works</h2>
              <p className="mt-3 text-sm leading-6 text-[#E4DCCB] sm:text-base">Three clear steps between your salon and a professional website.</p>
            </div>
            <ol className="mt-10 grid gap-5 lg:grid-cols-3 lg:gap-7">
              {steps.map(({ number, title, description, Icon }) => (
                <li key={number} className="relative rounded-2xl border border-white/15 bg-[#3E2A63]/70 p-6 shadow-xl sm:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F6F1E6] text-[#7A4E8F]"><Icon size={23} aria-hidden="true" /></span>
                    <span className="font-display text-3xl font-extrabold text-[#C9A66B]">{number}</span>
                  </div>
                  <h3 className="mt-6 font-display text-xl font-extrabold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#E4DCCB]">{description}</p>
                </li>
              ))}
            </ol>
            <div className="mt-9 text-center">
              <a href={PUBLIC_SIGNUP_PATH} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#F6F1E6] px-6 text-sm font-extrabold text-[#2A1E4A] shadow-lg transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A66B]">
                Start building your website <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        {/* 5 · Existing supported capabilities only */}
        <section id="features" aria-labelledby="features-title" className="scroll-mt-24 bg-white">
          <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">One connected salon workspace</p>
              <h2 id="features-title" className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#1B1630] sm:text-4xl">Everything your salon website needs</h2>
              <p className="mt-3 text-sm leading-6 text-[#5B5470] sm:text-base">Practical tools already built into NEXORA Salon OS, from your first design to daily appointments.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {features.map(({ title, description, Icon }) => (
                <article key={title} className="rounded-2xl border border-[#E4DCCB] bg-[#FBF8F2]/60 p-5 transition hover:-translate-y-0.5 hover:border-[#C9A66B] hover:bg-white hover:shadow-lg sm:p-6">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7A4E8F]"><Icon size={21} aria-hidden="true" /></span>
                  <h3 className="mt-5 font-display text-base font-extrabold leading-snug text-[#1B1630]">{title}</h3>
                  <p className="mt-2.5 text-sm leading-6 text-[#5B5470]">{description}</p>
                </article>
              ))}
            </div>
            <div className="mt-10 flex flex-col items-center justify-between gap-5 rounded-2xl border border-[#E4DCCB] bg-gradient-to-r from-[#F6F1E6] to-[#FBF8F2] p-6 sm:flex-row sm:p-7">
              <div className="flex items-start gap-3 text-center sm:text-left">
                <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm sm:inline-flex"><Star size={21} aria-hidden="true" /></span>
                <div><p className="font-display text-lg font-extrabold text-[#1B1630]">Your next salon website starts here.</p><p className="mt-1 text-sm text-[#5B5470]">Explore every template freely, then customise when you are ready.</p></div>
              </div>
              <a href="#nexora-template-library" className="inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-container">Explore Templates <ArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
      </main>

      {/* 6 · Professional footer with working destinations only */}
      <footer className="bg-[#1B1630] text-[#E4DCCB]">
        <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-10 lg:py-14">
          <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_0.8fr_1fr]">
            <div>
              <a href="/" aria-label="NEXORA Salon OS home" className="inline-flex rounded-lg focus-visible:outline-2 focus-visible:outline-[#C9A66B]">
                <span className="inline-flex items-center gap-2.5"><NexoraBrandMark size="md" /><span className="flex flex-col leading-none"><span className="font-display text-lg font-black uppercase tracking-[0.2em] text-white">NEXORA</span><span className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#C9A66B]">Salon OS</span></span></span>
              </a>
              <p className="mt-5 max-w-sm text-sm leading-6 text-[#C8C0D3]">Professional salon websites, easy customisation and connected business tools for Indian beauty and wellness businesses.</p>
              <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#C9A66B]"><Check size={14} aria-hidden="true" /> 16 templates · 15 salon categories</p>
            </div>
            <nav aria-label="Footer product navigation">
              <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-white">Product</p>
              <ul className="mt-4 grid gap-3 text-sm">
                {navigation.map((item) => <li key={item.href}><a href={item.href} className="inline-flex min-h-[28px] items-center text-[#C8C0D3] transition hover:text-white">{item.label}</a></li>)}
              </ul>
            </nav>
            <nav aria-label="Footer template navigation">
              <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-white">Popular templates</p>
              <ul className="mt-4 grid gap-3 text-sm">
                {NEXORA_CATEGORIES.slice(0, 4).map((category) => (
                  <li key={category.categoryId}><a href="#nexora-template-library" onClick={() => setActiveCategory(category.categoryId)} className="inline-flex min-h-[28px] items-center text-[#C8C0D3] transition hover:text-white">{category.categoryName}</a></li>
                ))}
                <li><a href="#nexora-template-library" onClick={() => setActiveCategory('all')} className="inline-flex min-h-[28px] items-center font-bold text-[#C9A66B] hover:text-white">View All Templates</a></li>
              </ul>
            </nav>
            <nav aria-label="Footer account navigation">
              <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-white">Your NEXORA account</p>
              <p className="mt-4 text-sm leading-6 text-[#C8C0D3]">Already have a salon workspace? Sign in to continue where you left off.</p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <a href="/login" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/25 px-4 text-xs font-bold text-white hover:bg-white/10">Sign In</a>
                <a href={PUBLIC_SIGNUP_PATH} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#F6F1E6] px-4 text-xs font-bold text-[#2A1E4A] hover:bg-white">Get Started <ArrowRight size={13} aria-hidden="true" /></a>
              </div>
            </nav>
          </div>
          <div className="flex flex-col gap-3 pt-7 text-xs text-[#AFA5BC] sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 NEXORA Salon OS. Your brand, your business.</p>
            <p>Made for salons, spas and beauty professionals.</p>
          </div>
        </div>
      </footer>

      {previewId && (
        <Suspense fallback={<div className="fixed inset-0 z-[100] grid place-items-center bg-[#1B1630]/75 p-4 text-sm font-semibold text-white" role="status">Loading template preview…</div>}>
          <TemplatePreviewModal
            templateId={previewId}
            onSelectPreview={setPreviewId}
            onClose={closePreview}
            onChoose={() => {
              const id = previewId;
              setPreviewId(null);
              customizeTemplate(id);
            }}
            requireAuthToCustomize
          />
        </Suspense>
      )}
    </div>
  );
}

export default PublicHomepage;
