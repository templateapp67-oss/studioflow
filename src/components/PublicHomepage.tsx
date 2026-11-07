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
  Rocket,
  Sparkles,
  Star,
  UsersRound,
  WandSparkles,
  X,
} from 'lucide-react';
import { NEXORA_PUBLIC_TEMPLATES, NEXORA_PUBLIC_TEMPLATES_BY_ID } from '../lib/nexoraPublicTemplates';
import {
  NEXORA_CATEGORIES,
  nexoraCategoryFilters,
  nexoraDisplayName,
  sortTemplatesByPriority,
} from '../lib/nexoraTemplateCatalogue';
import type { BusinessTypeId } from '../types';
import { NexoraTemplateLibrary } from './nexora/NexoraTemplateLibrary';
import { CategoryIconTile, NexoraBrandMark } from './nexora/NexoraBrand';
import { LUXURY_EDITORIAL_IMAGES } from '../lib/luxuryEditorial';
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
  { label: 'Pricing', href: '/pricing' },
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

/** Public marketing homepage, also shown to authenticated owners at the site root. All template content comes from the existing registry. */
export function PublicHomepage({ authenticated = false }: { authenticated?: boolean } = {}) {
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
              {authenticated ? 'Owner Workspace' : 'Sign In'}
            </a>
            <a href={authenticated ? '/login' : PUBLIC_SIGNUP_PATH} className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-5">
              {authenticated ? 'Open Workspace' : 'Get Started'} <ArrowRight size={15} aria-hidden="true" />
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
                {authenticated ? 'Owner Workspace' : 'Sign In'}
              </a>
            </div>
          </nav>
        )}
      </header>

      <main id="public-main-content">
        {/* 1 · Premium hero — keeps the real NEXORA template and signup flows */}
        <section aria-labelledby="public-home-title" className="relative isolate overflow-hidden border-b border-[#E9DED5] bg-[#FBF7F3]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-36 h-[460px] w-[460px] rounded-full bg-[#EBCFC9]/35 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-52 -left-40 h-[420px] w-[420px] rounded-full bg-[#E9DCCB]/45 blur-3xl" />
          <div className="relative mx-auto grid max-w-[1440px] items-center gap-9 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 lg:px-10 lg:py-20 xl:gap-20">
            <div className="relative z-10 min-w-0">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E5D5CD] bg-white/90 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#39263A] shadow-sm">
                <Sparkles size={14} aria-hidden="true" className="text-[#9C566F]" />
                Your salon. Your website. Your brand.
              </div>
              <h1 id="public-home-title" className="max-w-[680px] font-display text-[2.35rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#251A24] sm:text-5xl lg:text-[3.3rem] xl:text-[3.7rem]" style={{ textWrap: 'balance' }}>
                A beautiful salon website, made for your brand
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#51434D] sm:text-lg sm:leading-8">
                Choose a ready-made NEXORA design, add your services and business details, and give customers a simple way to explore your salon and book appointments.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a href="#nexora-template-library" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#302033] px-6 text-sm font-bold text-white shadow-lg shadow-[#302033]/15 transition hover:-translate-y-0.5 hover:bg-[#48304A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C4D67]">
                  Explore 16 Templates <ArrowRight size={17} aria-hidden="true" />
                </a>
                <a href={authenticated ? '/login' : PUBLIC_SIGNUP_PATH} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[#A96A7E] bg-white px-6 text-sm font-bold text-[#39263A] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFF9F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C4D67]">
                  {authenticated ? 'Open Workspace' : 'Get Started'} <Rocket size={16} aria-hidden="true" />
                </a>
              </div>
              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-[#51434D]" aria-label="NEXORA product features">
                <li className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#F1E1E4] text-[#743D55]"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
                  {templates.length} ready-made designs
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#F1E1E4] text-[#743D55]"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
                  No coding required
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#F1E1E4] text-[#743D55]"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
                  Preview before signup
                </li>
              </ul>
              <p className="mt-5 text-xs font-medium text-[#62515B]">
                Built for salons, spas, beauty parlours and wellness businesses.
              </p>
            </div>

            <div className="relative mx-auto w-full min-w-0 max-w-[680px] lg:mx-0">
              <div className="public-hero-photo relative isolate overflow-hidden rounded-[26px] border border-[#E5D5CD] bg-[#EADBD4] shadow-[0_24px_70px_rgba(59,36,49,0.18)]">
                <picture className="block h-full w-full">
                  <source
                    type="image/webp"
                    srcSet={LUXURY_EDITORIAL_IMAGES.hero.srcSet}
                    sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1439px) 48vw, 620px"
                  />
                  <img
                    src="/templates/luxury-editorial/hero-fallback.jpg"
                    alt={LUXURY_EDITORIAL_IMAGES.hero.alt}
                    width={LUXURY_EDITORIAL_IMAGES.hero.width}
                    height={LUXURY_EDITORIAL_IMAGES.hero.height}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    className="h-full w-full object-cover object-center"
                  />
                </picture>
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#241820]/75 via-[#241820]/5 to-transparent" />
                <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-[#E5D5CD] bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#39263A] shadow-md sm:left-5 sm:top-5">
                  <span className="h-2 w-2 rounded-full bg-[#9C566F]" aria-hidden="true" />
                  NEXORA · Featured design
                </div>
                {/* Opaque caption panel: text over a photo scrim can never be measured
                    by axe-core, and the scrim alone cannot guarantee 4.5:1 on every
                    image. A solid panel makes the contrast fixed and verifiable. */}
                <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-[#241820] px-4 py-3 text-white shadow-lg sm:inset-x-4 sm:bottom-4 sm:px-5 sm:py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5DDE4]">Haircut Studio · Template 01</p>
                  <h2 className="mt-1 max-w-[520px] font-display text-2xl font-bold leading-tight sm:text-3xl">
                    {nexoraDisplayName('hair_salon', heroTemplate.title)}
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[#F0E7EB]">
                    A real website design to preview, personalise and make your own.
                  </p>
                </div>
              </div>

              <div className="relative mt-4 flex flex-col gap-3 rounded-2xl border border-[#E5D5CD] bg-white p-4 shadow-[0_12px_34px_rgba(59,36,49,0.08)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-[#251A24]">{nexoraDisplayName('hair_salon', heroTemplate.title)}</p>
                  <p className="mt-1 text-xs text-[#62515B]">Open the actual template preview before creating your website.</p>
                </div>
                <button type="button" onClick={() => previewTemplate('hair_salon')} className="inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#302033] px-4 text-xs font-bold text-white transition hover:bg-[#48304A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C4D67]">
                  <Eye size={15} aria-hidden="true" /> Open interactive preview
                </button>
              </div>
              {/* z-10 keeps this badge in its own layer above the isolated hero photo —
                  without it axe-core treats the photo as painting over the badge text
                  and reports the background as overlapped. */}
              <div className="pointer-events-none absolute -right-2 -top-3 z-10 hidden items-center gap-2 rounded-2xl border border-[#E5D5CD] bg-white px-3.5 py-3 shadow-xl sm:flex lg:-right-4">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#F7E9EB] text-[#743D55]"><Clock3 size={17} aria-hidden="true" /></span>
                <span><strong className="block text-xs text-[#251A24]">Simple guided setup</strong><span className="text-[10px] text-[#62515B]">No code needed</span></span>
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
              <a href={authenticated ? '/login' : PUBLIC_SIGNUP_PATH} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#F6F1E6] px-6 text-sm font-extrabold text-[#2A1E4A] shadow-lg transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A66B]">
                {authenticated ? 'Open Owner Workspace' : 'Start building your website'} <ArrowRight size={16} aria-hidden="true" />
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
            <div className="mt-10 flex flex-col items-center justify-between gap-5 rounded-2xl border border-[#E4DCCB] bg-[#F6F1E6] p-6 sm:flex-row sm:p-7">
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
              <p className="mt-4 text-sm leading-6 text-[#C8C0D3]">Already have a salon workspace? {authenticated ? 'Open it to continue where you left off.' : 'Sign in to continue where you left off.'}</p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <a href="/login" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/25 px-4 text-xs font-bold text-white hover:bg-white/10">{authenticated ? 'Owner Workspace' : 'Sign In'}</a>
                <a href={authenticated ? '/login' : PUBLIC_SIGNUP_PATH} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#F6F1E6] px-4 text-xs font-bold text-[#2A1E4A] hover:bg-white">{authenticated ? 'Open Workspace' : 'Get Started'} <ArrowRight size={13} aria-hidden="true" /></a>
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
        <Suspense fallback={<div role="status" aria-live="polite" className="sr-only">Loading interactive template preview…</div>}>
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
