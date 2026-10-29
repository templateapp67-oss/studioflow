import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronDown,
  Clock3,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Sparkles,
  Star,
  X,
  Youtube,
} from 'lucide-react';
import type { PrismChromaShade, SalonProfile, SalonService, Stylist } from '../types';
import type { SalonGalleryPhoto } from '../lib/photoGallery';
import { isPackage } from '../lib/packageCatalogue';
import { socialUrl } from '../lib/websiteContent';
import {
  PRISM_CHROMA_BRAND_NAME,
  PRISM_CHROMA_DEFAULT_CITY,
  PRISM_CHROMA_DEFAULT_PHONE,
  PRISM_CHROMA_DEFAULT_STYLISTS,
  PRISM_CHROMA_IMAGES,
  buildPrismChromaSeo,
  prismChromaCssVariables,
  prismChromaServiceImage,
  prismFormatInr,
  prismOpenStatus,
  prismServiceIncludes,
  resolvePrismChromaConfig,
} from '../lib/prismChroma';
import {
  canObserveViewport,
  deviceMockupIn,
  fadeUp,
  heroHeadline,
  pageTransition,
  revealViewport,
  scaleIn,
  stagger,
} from '../lib/motion';
import { WebsiteSections } from './WebsiteSections';
import { AppAnnouncementStrip, CustomerAppPromotion } from './CustomerAppPromotion';
import { SafeImage } from './prism-chroma/SafeImage';
import { DeviceMockup } from './prism-chroma/DeviceMockup';
import { ShadeStudio } from './prism-chroma/ShadeStudio';
import { BeforeAfterSlider } from './prism-chroma/BeforeAfterSlider';
import { FadeIn, FadeInGroup, MotionSection } from './prism-chroma/MotionSection';
import { ShadeFinder } from './prism-chroma/ShadeFinder';
import { RatingSummary, TestimonialCarousel } from './prism-chroma/TestimonialCarousel';
import { GalleryGrid } from './prism-chroma/GalleryGrid';
import { SeoContentSection } from './prism-chroma/SeoContentSection';
import { PriceList } from './prism-chroma/PriceList';
import { AnnouncementBar, BackToTop, ScrollProgress, StickyBookBar } from './prism-chroma/Chrome';

const MARQUEE_WORDS = ['Balayage', 'Highlights', 'Fashion Colours', 'Gloss', 'Keratin', 'Colour Correction', 'Global Colour', 'Pastel Shades'];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`Rated ${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} aria-hidden="true" fill={i <= rating ? 'var(--coral)' : 'none'} color="var(--coral)" />
      ))}
    </span>
  );
}

export function PrismChromaWebsite({
  profile,
  services,
  stylists,
  galleryPhotos,
  shared,
  enabledSections,
  showPackages,
  customerSignedIn,
  customerName,
  customerPhotoUrl,
  bookingAvailable = true,
  onBook,
  onAccount,
  onMyBookings,
  onViewSpecialist,
}: {
  profile: SalonProfile;
  services: SalonService[];
  stylists: Stylist[];
  galleryPhotos: SalonGalleryPhoto[];
  shared: Parameters<typeof WebsiteSections>[0];
  enabledSections: string[];
  showPackages: boolean;
  customerSignedIn?: boolean;
  customerName?: string;
  customerPhotoUrl?: string;
  bookingAvailable?: boolean;
  readOnly?: boolean;
  onBook: (service?: SalonService, specialist?: Stylist) => void;
  onAccount: (mode?: 'signin' | 'signup') => void;
  onMyBookings: () => void;
  onViewSpecialist: (id: string) => void;
}) {
  const config = useMemo(() => resolvePrismChromaConfig(profile), [profile]);
  const cssVars = useMemo(() => prismChromaCssVariables(config.colors) as React.CSSProperties, [config.colors]);
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(
    () => !(typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaqId, setOpenFaqId] = useState('');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [faqFilter, setFaqFilter] = useState('All');
  const [faqQuery, setFaqQuery] = useState('');
  const [carePlan, setCarePlan] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterDone, setNewsletterDone] = useState(false);
  const glowRef = useRef<HTMLDivElement>(null);

  const brandName = (profile.businessName || '').trim() || PRISM_CHROMA_BRAND_NAME;
  const cityLabel = (profile.city || '').trim() || PRISM_CHROMA_DEFAULT_CITY;
  const phone = (profile.phone || profile.whatsapp || '').trim() || PRISM_CHROMA_DEFAULT_PHONE;
  const phoneHref = `tel:${phone.replace(/[^+\d]/g, '')}`;
  const whatsappDigits = (profile.whatsapp || profile.phone || '').replace(/[^0-9]/g, '');
  const waUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Hello ${brandName}, I would like to book a hair colour appointment.`)}`
    : '';
  const addressLine = [(profile.address || '').trim(), cityLabel, (profile.postalCode || '').trim()].filter(Boolean).join(', ');
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine || brandName)}`;
  const instagramUrl = socialUrl(profile.instagramHandle, 'instagram');
  const facebookUrl = socialUrl(profile.facebookPage, 'facebook');
  const youtubeUrl = socialUrl(profile.youtubeChannel, 'youtube');

  const coreServices = services.filter((s) => !isPackage(s));
  const team = stylists && stylists.length ? stylists : PRISM_CHROMA_DEFAULT_STYLISTS;
  const gallery =
    galleryPhotos && galleryPhotos.length
      ? galleryPhotos.slice(0, 12).map((p) => ({ src: p.url, title: p.title || 'Hair colour work', tag: p.category || 'Gallery' }))
      : PRISM_CHROMA_IMAGES.gallery.map((g) => ({ src: g.src, title: g.title, tag: g.tag }));
  const firstService = coreServices[0] || services[0];
  const serviceCategories = ['All', ...Array.from(new Set((coreServices.length ? coreServices : services).map((s) => s.category).filter(Boolean)))];
  const displayedServices = (coreServices.length ? coreServices : services).filter(
    (s) => serviceFilter === 'All' || s.category === serviceFilter,
  );
  const faqCategories = ['All', ...Array.from(new Set(config.faqs.map((f) => (f.category || '').trim()).filter(Boolean)))];
  const displayedFaqs = config.faqs.filter((f) => {
    if (faqFilter !== 'All' && (f.category || '') !== faqFilter) return false;
    const q = faqQuery.trim().toLowerCase();
    return !q || `${f.question} ${f.answer}`.toLowerCase().includes(q);
  });
  const averageRating = config.reviews.length
    ? config.reviews.reduce((sum, r) => sum + (r.rating || 5), 0) / config.reviews.length
    : 5;
  const startingPrice = (coreServices.length ? coreServices : services).reduce<number | undefined>(
    (min, s) => (s.price != null && (min === undefined || s.price < min) ? s.price : min),
    undefined,
  );
  const openStatus = prismOpenStatus(config.openTime, config.closeTime);
  const scrollToId = (id: string) => {
    if (typeof document !== 'undefined') document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  /* Colour-ring loader: brief brand moment, skipped for reduced motion. */
  useEffect(() => {
    if (reduceMotion) {
      setLoading(false);
      return;
    }
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  /* SEO title + LocalBusiness JSON-LD (same data the resolver builds). */
  useEffect(() => {
    if (typeof document === 'undefined' || !document.head?.appendChild || typeof document.createElement !== 'function') return;
    const seo = buildPrismChromaSeo(profile, config, typeof location !== 'undefined' ? location.href : undefined);
    const previousTitle = document.title;
    document.title = seo.title;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(seo.jsonLd);
    document.head.appendChild(script);
    return () => {
      document.title = previousTitle;
      script.remove?.();
    };
  }, [profile, config]);

  /* Gradient cursor glow — desktop (fine pointer) only, reduced-motion safe. */
  useEffect(() => {
    if (reduceMotion || typeof window === 'undefined') return;
    if (typeof window.matchMedia === 'function' && !window.matchMedia('(pointer: fine)').matches) return;
    if (typeof requestAnimationFrame !== 'function' || typeof cancelAnimationFrame !== 'function') return;
    let raf = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (glowRef.current) {
          glowRef.current.style.left = `${event.clientX}px`;
          glowRef.current.style.top = `${event.clientY}px`;
        }
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduceMotion]);

  const bookServiceById = (id?: string) => {
    const found = id ? services.find((s) => s.id === id) : undefined;
    onBook(found || firstService);
  };
  const bookShade = (shade: PrismChromaShade) => bookServiceById(shade.linkedServiceId);

  const navLinks: Array<[string, string]> = [
    ['Services', '#pc-services'],
    ['Shades', '#pc-shades'],
    ['Results', '#pc-results'],
    ['Packages', '#pc-packages'],
    ['Experts', '#pc-team'],
    ['Gallery', '#pc-gallery'],
    ['Reviews', '#pc-reviews'],
    ['FAQ', '#pc-faq'],
  ];

  const headingWords = config.heroHeading.split(' ');
  const headingLines = [headingWords.slice(0, Math.ceil(headingWords.length / 2)).join(' '), headingWords.slice(Math.ceil(headingWords.length / 2)).join(' ')].filter(Boolean);

  return (
    <MotionConfig reducedMotion="user">
      <div className="pc-site" style={cssVars}>
        <div ref={glowRef} className="pc-cursor-glow" aria-hidden="true" />
        <AnimatePresence>{loading && <motion.div className="pc-loader" exit={{ opacity: 0 }} aria-hidden="true"><span className="pc-loader-ring" /></motion.div>}</AnimatePresence>
        <AppAnnouncementStrip />
        <ScrollProgress />
        <AnnouncementBar
          text={config.announcementText || ''}
          ctaLabel={config.announcementCtaLabel}
          onCta={() => scrollToId('#pc-packages')}
        />

        {/* 1 — Navbar */}
        <header className="pc-nav">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
            <a href="#pc-top" className="pc-logo" aria-label={`${brandName} — home`}>
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt={`${brandName} logo`} width={38} height={38} className="h-9 w-9 rounded-xl object-cover" loading="lazy" decoding="async" />
              ) : (
                <span className="pc-logo-mark flex h-9 w-9 items-center justify-center rounded-xl text-white"><Sparkles size={18} aria-hidden="true" /></span>
              )}
              <span className="pc-display text-base font-extrabold leading-tight sm:text-lg">{brandName}</span>
            </a>
            <nav className="ml-auto hidden items-center gap-5 lg:flex" aria-label="Website navigation">
              {navLinks.map(([label, href]) => (
                <a key={href} href={href} className="pc-nav-link">{label}</a>
              ))}
              <a
                className="pc-nav-link"
                href={`/?customer=1&return=${encodeURIComponent(profile.subdomain || '')}`}
                onClick={(e) => { e.preventDefault(); onMyBookings(); }}
              >
                My Bookings
              </a>
            </nav>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <a href={phoneHref} className="pc-btn pc-btn-ghost hidden px-4 py-2.5 text-sm sm:inline-flex"><Phone size={15} aria-hidden="true" /> {phone}</a>
              {bookingAvailable && (
                <button type="button" onClick={() => onBook(firstService)} className="pc-btn pc-btn-gradient px-5 py-2.5 text-sm">Book Now</button>
              )}
              {customerSignedIn ? (
                <>
                  <span className="sr-only">Customer account</span>
                  <button type="button" aria-label="Manage your customer account" onClick={onMyBookings} className="pc-btn pc-btn-ghost px-3 py-2 text-sm">
                    {customerPhotoUrl ? <img src={customerPhotoUrl} alt="" width={22} height={22} className="h-[22px] w-[22px] rounded-full object-cover" /> : null}
                    {customerName || 'My account'}
                  </button>
                  <button type="button" onClick={onMyBookings} className="pc-btn pc-btn-ghost hidden px-4 py-2.5 text-sm md:inline-flex">My Bookings</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => onAccount('signin')} className="pc-btn pc-btn-ghost hidden px-4 py-2.5 text-sm sm:inline-flex">Customer Login</button>
                  <button type="button" onClick={() => onAccount('signup')} className="pc-btn pc-btn-ghost hidden px-4 py-2.5 text-sm md:inline-flex">Sign up</button>
                </>
              )}
              <button type="button" className="pc-btn pc-btn-ghost px-3 py-2.5 lg:hidden" aria-expanded={menuOpen} aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((v) => !v)}>
                {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
          {menuOpen && (
            <nav className="border-t border-white/10 px-4 py-3 lg:hidden" aria-label="Mobile sections">
              <div className="grid grid-cols-2 gap-2">
                {navLinks.map(([label, href]) => (
                  <a key={href} href={href} className="pc-nav-link rounded-xl bg-white/5 px-3 py-2.5" onClick={() => setMenuOpen(false)}>{label}</a>
                ))}
              </div>
              <p className="pc-muted mt-3 flex items-center gap-2 text-sm">
                <span aria-hidden="true">{customerPhotoUrl ? <img src={customerPhotoUrl} alt="" width={22} height={22} className="h-[22px] w-[22px] rounded-full object-cover" /> : null}</span>
                {customerSignedIn ? (
                  <>Hi{customerName ? `, ${customerName}` : ''} · <button type="button" className="underline" onClick={onMyBookings}>My bookings</button></>
                ) : (
                  <button type="button" className="underline" onClick={() => onAccount('signin')}>Sign in for faster booking</button>
                )}
              </p>
            </nav>
          )}
        </header>

        <AnimatePresence mode="wait">
          <motion.main key="prism-home" variants={pageTransition} initial="hidden" animate="visible" exit="exit">
            {/* 2 — Hero */}
            <section data-layout="hero" id="pc-top" className="relative overflow-hidden" aria-labelledby="pc-hero-heading">
              <span className="pc-blob pc-blob-violet" style={{ width: 420, height: 420, top: -140, left: -120 }} aria-hidden="true" />
              <span className="pc-blob pc-blob-magenta" style={{ width: 360, height: 360, top: 60, right: -120 }} aria-hidden="true" />
              <span className="pc-blob pc-blob-cyan" style={{ width: 260, height: 260, bottom: -120, left: '38%' }} aria-hidden="true" />
              <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-24 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-16">
                <motion.div variants={stagger} initial={canObserveViewport ? 'hidden' : 'visible'} animate="visible">
                  <motion.p variants={heroHeadline} className="pc-eyebrow">
                    Hair Colour Studio · {cityLabel}{' '}
                    <span className={openStatus.open ? 'pc-open-chip is-open' : 'pc-open-chip'}>
                      <span className="pc-open-dot" aria-hidden="true" /> {openStatus.label}
                    </span>
                  </motion.p>
                  <h1 id="pc-hero-heading" className="mt-4 text-[clamp(2.6rem,7vw,4.8rem)] font-extrabold">
                    {headingLines.map((line, i) => (
                      <motion.span key={line} variants={heroHeadline} className="block">
                        {i === headingLines.length - 1 ? <span className="pc-grad-text">{line}</span> : line}
                      </motion.span>
                    ))}
                  </h1>
                  <motion.p variants={fadeUp} className="pc-muted mt-5 max-w-xl text-base sm:text-lg">{config.heroSubtext}</motion.p>
                  <motion.div variants={fadeUp} className="mt-7 flex flex-wrap gap-3">
                    {bookingAvailable && (
                      <button type="button" onClick={() => onBook(firstService)} className="pc-btn pc-btn-gradient px-7 py-3.5">
                        <Calendar size={17} aria-hidden="true" /> Book Appointment
                      </button>
                    )}
                    <a href="#pc-shades" className="pc-btn pc-btn-ghost px-7 py-3.5">Try Shade Studio <ArrowRight size={16} aria-hidden="true" /></a>
                  </motion.div>
                  <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold">
                      <Stars rating={Math.round(averageRating)} /> {averageRating.toFixed(1)} rated
                    </span>
                    <span className="pc-chip">Free patch test</span>
                    <span className="pc-chip">Full ₹ price upfront</span>
                    <span className="pc-chip">Bond-care with every colour</span>
                  </motion.div>
                  <motion.dl variants={fadeUp} className="mt-9 grid max-w-lg grid-cols-3 gap-3">
                    {config.stats.slice(0, 3).map((stat) => (
                      <div key={stat.id} className="pc-glass pc-glass-hover px-4 py-3" style={{ borderRadius: 20 }}>
                        <dt className="sr-only">{stat.label}</dt>
                        <dd className="pc-display text-xl font-extrabold">{stat.value}</dd>
                        <dd className="pc-muted text-[11px] font-semibold">{stat.label}</dd>
                      </div>
                    ))}
                  </motion.dl>
                </motion.div>

                <div className="relative">
                  <motion.div variants={scaleIn} initial={canObserveViewport ? 'hidden' : 'visible'} animate="visible" className="pc-hero-img-wrap pc-grad-border">
                    <SafeImage src={config.heroImageUrl} fallback={PRISM_CHROMA_IMAGES.hero} alt={`Model with vivid balayage hair at ${brandName}`} width={1000} height={1100} className="h-[420px] w-full object-cover sm:h-[520px]" loading="eager" />
                  </motion.div>
                  <span className="pc-float-chip" style={{ top: 18, left: 14 }}><span style={{ width: 12, height: 12, borderRadius: 99, background: 'var(--violet)' }} aria-hidden="true" /> Violet Storm</span>
                  <span className="pc-float-chip" style={{ top: 74, right: 14 }}><span style={{ width: 12, height: 12, borderRadius: 99, background: 'var(--magenta)' }} aria-hidden="true" /> Magenta Muse</span>
                  <span className="pc-float-chip" style={{ bottom: 148, left: 16 }}><span style={{ width: 12, height: 12, borderRadius: 99, background: 'var(--cyan)' }} aria-hidden="true" /> Cyan Ice</span>
                  <motion.div variants={deviceMockupIn} initial={canObserveViewport ? 'hidden' : 'visible'} animate="visible" className="relative z-[4] mx-auto -mt-24 w-fit lg:absolute lg:-bottom-16 lg:-left-14 lg:mt-0">
                    <DeviceMockup brandName={brandName} cityLabel={cityLabel} services={coreServices} onBook={(s) => onBook(s)} />
                  </motion.div>
                </div>
              </div>
            </section>

            {/* 3 — Marquee */}
            <div className="pc-marquee" aria-label="Our special services">
              <div className="pc-marquee-track" aria-hidden="true">
                {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((word, i) => (
                  <span key={`${word}-${i}`} className="pc-display whitespace-nowrap text-sm font-bold uppercase tracking-[0.18em]">
                    {word} <span className="pc-grad-text" aria-hidden="true">✦</span>
                  </span>
                ))}
              </div>
            </div>

            {/* 4 — About */}
            <MotionSection id="pc-about" className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
              <span className="pc-blob pc-blob-coral" style={{ width: 240, height: 240, top: 20, right: -100 }} aria-hidden="true" />
              <div className="relative grid items-center gap-8 lg:grid-cols-2">
                <div className="pc-grad-border">
                  <div className="pc-glass-strong">
                    <SafeImage src={config.aboutImageUrl} fallback={PRISM_CHROMA_IMAGES.about} alt={`Colour expert mixing colour in a bowl at ${brandName}`} width={1000} height={800} className="pc-img-zoom h-[380px] w-full object-cover" />
                  </div>
                </div>
                <div>
                  <p className="pc-eyebrow">Our Story</p>
                  <h2 className="mt-3 text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold">{config.aboutHeading}</h2>
                  <p className="pc-muted mt-4 leading-relaxed">{config.aboutStory}</p>
                  <FadeInGroup className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {config.stats.map((stat) => (
                      <FadeIn key={stat.id}>
                        <div className="pc-glass pc-glass-hover px-4 py-4 text-center" style={{ borderRadius: 22 }}>
                          <p className="pc-display pc-grad-text text-2xl font-extrabold">{stat.value}</p>
                          <p className="pc-muted mt-1 text-[11px] font-bold uppercase tracking-wide">{stat.label}</p>
                        </div>
                      </FadeIn>
                    ))}
                  </FadeInGroup>
                </div>
              </div>
            </MotionSection>

            {/* 5 — Services (bento grid) */}
            <MotionSection data-layout="services" id="pc-services" className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
              <span className="pc-blob pc-blob-violet" style={{ width: 300, height: 300, top: -60, left: -120 }} aria-hidden="true" />
              <div className="relative">
                <p className="pc-eyebrow">Colour Menu</p>
                <h2 className="mt-3 text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold">Services &amp; Prices</h2>
                <p className="pc-muted mt-3 max-w-2xl">Clear prices in ₹. Final price is confirmed at your free consult, before any colour starts.</p>
                <nav aria-label="Service categories" className="pc-filter-row mt-5">
                  {serviceCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={cat === serviceFilter ? 'pc-filter-chip is-active' : 'pc-filter-chip'}
                      aria-pressed={cat === serviceFilter}
                      onClick={() => setServiceFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </nav>
                <FadeInGroup className="sf-service-row mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {displayedServices.map((service, idx) => (
                    <FadeIn key={service.id} className={idx === 0 || idx === 5 ? 'lg:col-span-2' : ''}>
                      <article className="pc-grad-border sf-service-card h-full">
                        <div className="pc-glass pc-glass-hover flex h-full flex-col overflow-hidden" style={{ borderRadius: 28 }}>
                          <div className="overflow-hidden">
                            <SafeImage src={prismChromaServiceImage(service)} fallback={PRISM_CHROMA_IMAGES.services.balayage} alt={`${service.name} at ${brandName}`} width={600} height={400} className="sf-service-image pc-service-img pc-img-zoom h-44 w-full" />
                          </div>
                          <div className="flex flex-1 flex-col p-5">
                            <p className="pc-eyebrow" style={{ fontSize: '0.62rem' }}>{service.category}</p>
                            <h3 className="mt-2 text-lg font-bold leading-snug">{service.name}</h3>
                            <p className="pc-muted mt-2 flex-1 text-sm leading-relaxed">{service.description}</p>
                            <details className="pc-includes">
                              <summary>What&apos;s included</summary>
                              <ul>
                                {prismServiceIncludes(service.category).map((line) => (
                                  <li key={line}><Check size={12} aria-hidden="true" /> {line}</li>
                                ))}
                              </ul>
                            </details>
                            <p className="mt-4 flex items-center justify-between">
                              <span className="pc-display text-xl font-extrabold">{service.price != null ? prismFormatInr(service.price) : 'Price on consult'}</span>
                              {service.showDuration !== false && service.durationMinutes > 0 && (
                                <span className="pc-muted inline-flex items-center gap-1 text-xs font-bold"><Clock3 size={13} aria-hidden="true" /> {service.durationMinutes} min</span>
                              )}
                            </p>
                            {bookingAvailable && (
                              <button type="button" onClick={() => onBook(service)} className="pc-btn pc-btn-gradient mt-4 w-full px-4 py-2.5 text-sm">Book this <ArrowUpRight size={15} aria-hidden="true" /></button>
                            )}
                          </div>
                        </div>
                      </article>
                    </FadeIn>
                  ))}
                </FadeInGroup>
                {!coreServices.length && <p className="pc-muted mt-6">Our colour menu is coming soon. Please call us — we will help you right away.</p>}
                {coreServices.length > 0 && displayedServices.length === 0 && (
                  <p className="pc-muted mt-6">No services in this group right now. Please call us — we will help you right away.</p>
                )}
              </div>
            </MotionSection>

            {/* 6 — Shade Studio */}
            <MotionSection id="pc-shades" className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
              <span className="pc-blob pc-blob-magenta" style={{ width: 280, height: 280, bottom: -80, right: -100 }} aria-hidden="true" />
              <div className="relative">
                <p className="pc-eyebrow">Interactive</p>
                <h2 className="mt-3 text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold">{config.shadesHeading}</h2>
                <p className="pc-muted mt-3 max-w-2xl">{config.shadesSubtext}</p>
                <div className="mt-8">
                  <ShadeStudio shades={config.shades} fallbackImage={config.heroImageUrl} brandName={brandName} onBookShade={bookShade} />
                </div>
                <div className="mt-10">
                  <h3 className="text-center text-[clamp(1.4rem,3vw,2rem)] font-extrabold">
                    Not sure which shade? <span className="pc-grad-text">Take the 30-second quiz</span>
                  </h3>
                  <p className="pc-muted mx-auto mt-2 max-w-xl text-center">
                    Answer 3 small questions. We match a shade to your hair, your dream look and your home-care time.
                  </p>
                  <div className="mx-auto mt-6 max-w-3xl">
                    <ShadeFinder shades={config.shades} brandName={brandName} fallbackImage={config.heroImageUrl} onBookShade={bookShade} />
                  </div>
                </div>
              </div>
            </MotionSection>

            {/* 7 — Before / After */}
            <MotionSection id="pc-results" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
              <p className="pc-eyebrow">Real Changes</p>
              <h2 className="mt-3 text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold">Before &amp; After Colour</h2>
              <p className="pc-muted mt-3 max-w-2xl">Move the line and see the change. Every result below started with a hair-health check.</p>
              <FadeInGroup className="mt-8 grid gap-5 md:grid-cols-3">
                {config.beforeAfter.map((item) => (
                  <FadeIn key={item.id}>
                    <BeforeAfterSlider item={item} fallback={PRISM_CHROMA_IMAGES.beforeAfter.oneAfter} />
                  </FadeIn>
                ))}
              </FadeInGroup>
            </MotionSection>

            {/* 8 — Process */}
            <MotionSection id="pc-process" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
              <p className="pc-eyebrow">How We Work</p>
              <h2 className="mt-3 text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold">Your Colour, Step by Step</h2>
              <div className="pc-timeline" aria-hidden="true" />
              <FadeInGroup className="sf-service-row mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {config.processSteps.map((step, idx) => (
                  <FadeIn key={step.id}>
                    <article className="pc-glass pc-glass-hover h-full overflow-hidden">
                      <SafeImage src={step.image} fallback={PRISM_CHROMA_IMAGES.interior} alt={step.alt} width={700} height={460} className="pc-img-zoom h-36 w-full object-cover" />
                      <div className="p-5">
                        <p className="pc-display pc-grad-text flex items-center justify-between text-sm font-extrabold">
                          <span>STEP {idx + 1}</span>
                          {step.durationLabel && <span className="pc-chip">{step.durationLabel}</span>}
                        </p>
                        <h3 className="mt-1.5 text-lg font-bold">{step.title}</h3>
                        <p className="pc-muted mt-2 text-sm leading-relaxed">{step.text}</p>
                        {step.points && step.points.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {step.points.map((point) => (
                              <li key={point} className="flex items-start gap-1.5 text-xs font-semibold">
                                <Check size={13} aria-hidden="true" style={{ color: 'var(--cyan)', marginTop: 1, flex: 'none' }} /> {point}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </article>
                  </FadeIn>
                ))}
              </FadeInGroup>

              {/* Colour Care Guide — aftercare timeline */}
              <div className="mt-12">
                <p className="pc-eyebrow">After Your Visit</p>
                <h3 className="mt-2 text-[clamp(1.5rem,3.5vw,2.2rem)] font-extrabold">Colour Care Guide</h3>
                <p className="pc-muted mt-2 max-w-2xl">Colour looks best when home care is simple. Follow these four stages and your shade stays fresh for weeks.</p>
                <FadeInGroup className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {config.careGuide.map((step, idx) => (
                    <FadeIn key={step.id}>
                      <article className="pc-glass pc-glass-hover h-full p-5">
                        <p className="pc-care-when">{step.when}</p>
                        <h4 className="mt-2 font-bold">{step.title}</h4>
                        <p className="pc-muted mt-2 text-sm leading-relaxed">{step.text}</p>
                        <p className="pc-care-step" aria-hidden="true">{String(idx + 1).padStart(2, '0')}</p>
                      </article>
                    </FadeIn>
                  ))}
                </FadeInGroup>
              </div>
            </MotionSection>

            {/* 9 — Pricing packages */}
            {showPackages && (
              <MotionSection id="pc-packages" className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
                <span className="pc-blob pc-blob-cyan" style={{ width: 260, height: 260, top: 0, right: -90 }} aria-hidden="true" />
                <div className="relative">
                  <p className="pc-eyebrow">Best Value</p>
                  <h2 className="mt-3 text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold">Colour Packages</h2>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={carePlan}
                      className={carePlan ? 'pc-switch is-on' : 'pc-switch'}
                      onClick={() => setCarePlan((v) => !v)}
                    >
                      <span className="pc-switch-dot" aria-hidden="true" />
                    </button>
                    <p className="text-sm font-bold">
                      Add Colour Care Plan <span className="pc-muted font-semibold">— gloss refresh + care mask on every visit</span>
                    </p>
                  </div>
                  <FadeInGroup className="mt-8 grid gap-5 lg:grid-cols-3">
                    {config.packages.map((pkg) => (
                      <FadeIn key={pkg.id}>
                        <article className={`pc-glass pc-glass-hover flex h-full flex-col overflow-hidden ${pkg.popular ? 'pc-grad-border' : ''}`} style={pkg.popular ? { border: 0, borderRadius: 29, padding: 1 } : undefined}>
                          <div className={pkg.popular ? 'pc-glass flex h-full flex-col overflow-hidden' : 'flex h-full flex-col'}>
                            <div className="relative overflow-hidden">
                              <SafeImage src={pkg.imageUrl} fallback={PRISM_CHROMA_IMAGES.services.balayage} alt={pkg.imageAlt || `${pkg.tier} colour package at ${brandName}`} width={800} height={500} className="pc-img-zoom h-44 w-full object-cover" />
                              {pkg.badgeLabel && <span className="pc-float-chip" style={{ top: 12, left: 12 }}>{pkg.badgeLabel}</span>}
                            </div>
                            <div className="flex flex-1 flex-col p-6">
                              <h3 className="pc-display text-xl font-extrabold">{pkg.tier}</h3>
                              <p className="pc-display pc-grad-text mt-2 text-3xl font-extrabold">
                                {prismFormatInr(pkg.price + (carePlan ? pkg.carePlanAddon || 0 : 0))}
                              </p>
                              {carePlan && (pkg.carePlanAddon || 0) > 0 && (
                                <p className="pc-muted text-xs font-semibold">Includes Care Plan (+{prismFormatInr(pkg.carePlanAddon || 0)})</p>
                              )}
                              {carePlan && (pkg.carePlanAddon || 0) === 0 && (
                                <p className="text-xs font-bold" style={{ color: 'var(--cyan)' }}>Care Plan included free</p>
                              )}
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {pkg.savingsNote && <span className="pc-chip">{pkg.savingsNote}</span>}
                                {pkg.sessionsCount && <span className="pc-chip">{pkg.sessionsCount} visit{pkg.sessionsCount > 1 ? 's' : ''}</span>}
                                {pkg.validityDays && <span className="pc-chip">Valid {pkg.validityDays} days</span>}
                              </div>
                              <ul className="mt-4 flex-1 space-y-2">
                                {pkg.includes.map((line) => (
                                  <li key={line} className="flex items-start gap-2 text-sm"><Check size={15} aria-hidden="true" style={{ color: 'var(--cyan)', marginTop: 2 }} /> {line}</li>
                                ))}
                              </ul>
                              {bookingAvailable && (
                                <button type="button" onClick={() => bookServiceById(pkg.linkedServiceId)} className="pc-btn pc-btn-gradient mt-6 w-full px-4 py-3 text-sm">Book {pkg.tier}</button>
                              )}
                            </div>
                          </div>
                        </article>
                      </FadeIn>
                    ))}
                  </FadeInGroup>
                  <div className="mt-8">
                    <PriceList services={coreServices.length ? coreServices : services} packages={config.packages} brandName={brandName} carePlan={carePlan} />
                  </div>
                </div>
              </MotionSection>
            )}

            {/* 10 — Colour Experts */}
            <MotionSection data-layout="team" id="pc-team" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
              <p className="pc-eyebrow">Meet the Team</p>
              <h2 className="mt-3 text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold">Our Colour Experts</h2>
              <FadeInGroup className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {team.map((member, idx) => (
                  <FadeIn key={member.id}>
                    <article className="pc-glass pc-glass-hover h-full overflow-hidden text-left">
                      <button type="button" className="block w-full cursor-pointer" onClick={() => onViewSpecialist(member.id)} aria-label={`View profile & reviews: ${member.name}`}>
                        <SafeImage src={member.avatarUrl} fallback={[PRISM_CHROMA_IMAGES.team.aarushi, PRISM_CHROMA_IMAGES.team.kiara, PRISM_CHROMA_IMAGES.team.priya, PRISM_CHROMA_IMAGES.team.tara][idx % 4]} alt={`Portrait of ${member.name}, ${member.role} at ${brandName}`} width={600} height={640} className="pc-team-img pc-img-zoom h-60 w-full" />
                      </button>
                      <div className="p-5">
                        <h3 className="text-lg font-bold">{member.name}</h3>
                        <p className="pc-muted text-sm font-semibold">{member.role}</p>
                        <p className="mt-2"><Stars rating={Math.round(member.rating || 5)} /></p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(member.specialties || []).slice(0, 3).map((skill) => (
                            <span key={skill} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold">{skill}</span>
                          ))}
                        </div>
                        {bookingAvailable && (
                          <button type="button" onClick={() => onBook(undefined, member)} className="pc-btn pc-btn-ghost mt-4 w-full px-4 py-2.5 text-sm">Book with {member.name.split(' ')[0]}</button>
                        )}
                      </div>
                    </article>
                  </FadeIn>
                ))}
              </FadeInGroup>
            </MotionSection>

            {/* 11 — Gallery */}
            <MotionSection data-layout="gallery" id="pc-gallery" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
              <p className="pc-eyebrow">Our Work</p>
              <h2 className="mt-3 text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold">Colour Gallery</h2>
              <p className="pc-muted mt-3 max-w-2xl">Fresh colours from our studio chairs. Your photo could be next.</p>
              <GalleryGrid photos={gallery} brandName={brandName} fallback={PRISM_CHROMA_IMAGES.interior} />
            </MotionSection>

            {/* 12 — Testimonials */}
            <MotionSection data-layout="experiences" id="pc-reviews" className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
              <span className="pc-blob pc-blob-violet" style={{ width: 260, height: 260, bottom: -80, left: -90 }} aria-hidden="true" />
              <div className="relative">
                <p className="pc-eyebrow">Client Love</p>
                <h2 className="mt-3 text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold">What Clients Say</h2>
                <div className="mt-8 grid items-start gap-5 lg:grid-cols-[320px_1fr]">
                  <RatingSummary reviews={config.reviews} />
                  <TestimonialCarousel reviews={config.reviews} brandName={brandName} />
                </div>
              </div>
            </MotionSection>

            {/* Platform sections (offers, videos, loyalty, policies, share) — same as other templates */}
            {enabledSections.length > 0 && (
              <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <WebsiteSections {...shared} sections={enabledSections} />
              </div>
            )}
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <CustomerAppPromotion />
            </div>

            {/* Local SEO guide */}
            <MotionSection id="pc-guide" className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
              <SeoContentSection
                brandName={brandName}
                cityLabel={cityLabel}
                services={coreServices.length ? coreServices : services}
                shades={config.shades}
                branches={config.branches}
              />
            </MotionSection>

            {/* 13 — FAQ */}
            <MotionSection id="pc-faq" className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
              <p className="pc-eyebrow text-center">Good to Know</p>
              <h2 className="mt-3 text-center text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold">Common Questions</h2>
              <div className="mx-auto mt-6 max-w-md">
                <label className="pc-sr-only" htmlFor="pc-faq-search">Search questions</label>
                <input
                  id="pc-faq-search"
                  type="search"
                  value={faqQuery}
                  onChange={(e) => setFaqQuery(e.target.value)}
                  placeholder="Search questions — try “patch test”"
                  className="pc-faq-search"
                />
              </div>
              {faqCategories.length > 2 && (
                <div className="pc-filter-row mt-6 justify-center" role="group" aria-label="Filter questions by topic">
                  {faqCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={cat === faqFilter ? 'pc-filter-chip is-active' : 'pc-filter-chip'}
                      aria-pressed={cat === faqFilter}
                      onClick={() => setFaqFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-8 space-y-3">
                {displayedFaqs.map((faq) => {
                  const open = openFaqId === faq.id || (openFaqId === '' && faq.id === displayedFaqs[0]?.id);
                  return (
                    <div key={faq.id} className="pc-faq-item pc-glass">
                      <button type="button" className="pc-faq-q" aria-expanded={open} aria-controls={`pc-faq-a-${faq.id}`} onClick={() => setOpenFaqId(open ? '__none__' : faq.id)}>
                        <span>
                          {faq.question}
                          {faq.category && <span className="pc-faq-cat">{faq.category}</span>}
                        </span>
                        <ChevronDown size={18} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .3s ease', flex: 'none' }} />
                      </button>
                      {open && <p id={`pc-faq-a-${faq.id}`} className="pc-faq-a">{faq.answer}</p>}
                    </div>
                  );
                })}
                {displayedFaqs.length === 0 && <p className="pc-muted text-center">No questions in this topic yet. Please call us — we are happy to help.</p>}
              </div>
            </MotionSection>

            {/* 14 — Booking CTA */}
            <MotionSection id="pc-book" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
              <div className="pc-grad-border">
                <div className="pc-glass-strong relative overflow-hidden">
                  <div className="grid lg:grid-cols-2">
                    <div className="relative z-[2] p-7 sm:p-10">
                      <p className="pc-eyebrow">Book Your Chair</p>
                      <h2 className="mt-3 text-[clamp(2rem,5vw,3.4rem)] font-extrabold">Ready for your <span className="pc-grad-text">new colour?</span></h2>
                      <p className="pc-muted mt-4 max-w-md">Book in one minute. Free patch test and full ₹ price shared before we start — no surprises.</p>
                      <div className="mt-7 flex flex-wrap gap-3">
                        {bookingAvailable && (
                          <button type="button" onClick={() => onBook(firstService)} className="pc-btn pc-btn-gradient px-7 py-3.5"><Calendar size={17} aria-hidden="true" /> Book Now</button>
                        )}
                        {waUrl && (
                          <a href={waUrl} target="_blank" rel="noreferrer" className="pc-btn pc-btn-ghost px-6 py-3.5"><MessageCircle size={16} aria-hidden="true" /> WhatsApp us</a>
                        )}
                        <a href={phoneHref} className="pc-btn pc-btn-ghost px-6 py-3.5"><Phone size={16} aria-hidden="true" /> {phone}</a>
                      </div>
                      {bookingAvailable && coreServices.length > 0 && (
                        <div className="mt-6">
                          <p className="pc-muted text-xs font-bold uppercase tracking-wide">Popular right now</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {coreServices.slice(0, 4).map((service) => (
                              <button key={service.id} type="button" className="pc-chip pc-chip-btn" onClick={() => onBook(service)}>
                                {service.name} · {service.price != null ? prismFormatInr(service.price) : 'Consult'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="pc-muted mt-5 flex items-center gap-2 text-sm"><Clock3 size={15} aria-hidden="true" /> {config.workingHoursDisplay}</p>
                    </div>
                    <div className="relative min-h-[280px]">
                      <SafeImage src={config.bookingImageUrl} fallback={PRISM_CHROMA_IMAGES.booking} alt={`Happy client with fresh vivid hair colour at ${brandName}`} width={1000} height={800} className="absolute inset-0 h-full w-full object-cover" />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(11,11,20,.88), transparent 65%)' }} aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </div>
            </MotionSection>

            {/* 15 — Branches + Footer */}
            <MotionSection data-layout="location" id="pc-branches" className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
              <p className="pc-eyebrow">Find Us</p>
              <h2 className="mt-3 text-[clamp(1.7rem,4vw,2.4rem)] font-extrabold">Our Studios</h2>
              <FadeInGroup className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {config.branches.map((branch) => (
                  <FadeIn key={branch.id}>
                    <article className="pc-glass pc-glass-hover h-full p-5">
                      <h3 className="pc-display text-lg font-extrabold">{branch.name}</h3>
                      <p className="pc-muted mt-1 text-sm font-bold">{branch.area}</p>
                      <p className="pc-muted mt-2 flex items-start gap-1.5 text-sm"><MapPin size={14} aria-hidden="true" style={{ marginTop: 3, flex: 'none' }} /> {branch.address}</p>
                      {branch.hours && <p className="pc-muted mt-2 flex items-center gap-1.5 text-sm"><Clock3 size={14} aria-hidden="true" /> {branch.hours}</p>}
                      {branch.landmark && <p className="pc-muted mt-1.5 text-xs font-semibold">Landmark: {branch.landmark}</p>}
                      {branch.metroNote && <p className="pc-muted mt-1 text-xs font-semibold">{branch.metroNote}</p>}
                      {branch.parkingNote && <p className="pc-muted mt-1 text-xs font-semibold">{branch.parkingNote}</p>}
                      <p className="mt-3 flex flex-wrap items-center gap-3">
                        {(branch.phone || phone) && (
                          <a href={`tel:${(branch.phone || phone).replace(/[^+\d]/g, '')}`} className="inline-flex items-center gap-1.5 text-sm font-bold"><Phone size={14} aria-hidden="true" /> {branch.phone || phone}</a>
                        )}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address || branch.name)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-bold"
                        >
                          Directions <ArrowUpRight size={13} aria-hidden="true" />
                        </a>
                      </p>
                    </article>
                  </FadeIn>
                ))}
              </FadeInGroup>
            </MotionSection>
          </motion.main>
        </AnimatePresence>

        <footer data-layout="footer" className="border-t border-white/10" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="pc-logo" style={{ padding: 0 }}>
                {profile.logoUrl ? (
                  <img src={profile.logoUrl} alt={`${brandName} logo`} width={38} height={38} className="h-9 w-9 rounded-xl object-cover" loading="lazy" decoding="async" />
                ) : (
                  <span className="pc-logo-mark flex h-9 w-9 items-center justify-center rounded-xl text-white"><Sparkles size={18} aria-hidden="true" /></span>
                )}
                <span className="pc-display text-lg font-extrabold">{brandName}</span>
              </p>
              <p className="pc-muted mt-3 text-sm leading-relaxed">{(profile.tagline || '').trim() || 'Colour that turns heads. Care that keeps hair strong.'}</p>
              <h3 className="pc-display mt-5 font-extrabold">{profile.sectionHeadings?.socialTitle || 'Connect with us'}</h3>
              <div className="mt-3 flex gap-2">
                {instagramUrl && <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label={`${brandName} on Instagram`} className="pc-btn pc-btn-ghost p-2.5"><Instagram size={17} aria-hidden="true" /></a>}
                {facebookUrl && <a href={facebookUrl} target="_blank" rel="noreferrer" aria-label={`${brandName} on Facebook`} className="pc-btn pc-btn-ghost p-2.5"><Facebook size={17} aria-hidden="true" /></a>}
                {youtubeUrl && <a href={youtubeUrl} target="_blank" rel="noreferrer" aria-label={`${brandName} on YouTube`} className="pc-btn pc-btn-ghost p-2.5"><Youtube size={17} aria-hidden="true" /></a>}
              </div>
            </div>
            <div>
              <h3 className="pc-display font-extrabold">Visit us</h3>
              <p className="pc-muted mt-3 flex items-start gap-1.5 text-sm"><MapPin size={14} aria-hidden="true" style={{ marginTop: 3, flex: 'none' }} /> {addressLine}</p>
              <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-bold">Open in Google Maps <ArrowUpRight size={14} aria-hidden="true" /></a>
              {config.mapEmbedUrl && (
                <iframe title={`Map — ${brandName}, ${cityLabel}`} src={config.mapEmbedUrl} loading="lazy" className="mt-4 h-40 w-full rounded-2xl border border-white/15" referrerPolicy="no-referrer-when-downgrade" />
              )}
            </div>
            <div>
              <h3 className="pc-display font-extrabold">Talk to us</h3>
              <p className="mt-3 space-y-2 text-sm">
                <a href={phoneHref} className="flex items-center gap-2 font-bold"><Phone size={14} aria-hidden="true" /> {phone}</a>
                <a href={`mailto:${config.publicEmail}`} className="pc-muted flex items-center gap-2"><Mail size={14} aria-hidden="true" /> {config.publicEmail}</a>
                {waUrl && <a href={waUrl} target="_blank" rel="noreferrer" className="pc-muted flex items-center gap-2"><MessageCircle size={14} aria-hidden="true" /> WhatsApp booking</a>}
              </p>
            </div>
            <div>
              <h3 className="pc-display font-extrabold">Timings</h3>
              <p className="pc-muted mt-3 flex items-start gap-1.5 text-sm"><Clock3 size={14} aria-hidden="true" style={{ marginTop: 3, flex: 'none' }} /> {config.workingHoursDisplay}</p>
              {bookingAvailable && (
                <button type="button" onClick={() => onBook(firstService)} className="pc-btn pc-btn-gradient mt-5 px-6 py-3 text-sm"><Calendar size={15} aria-hidden="true" /> Book Appointment</button>
              )}
              <h3 className="pc-display mt-7 font-extrabold">Colour offers on email</h3>
              {newsletterDone ? (
                <p className="mt-3 text-sm font-bold" style={{ color: 'var(--cyan)' }}>
                  You are on the list! Watch your inbox for colour offers.
                </p>
              ) : (
                <form
                  className="pc-newsletter"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newsletterEmail.includes('@')) setNewsletterDone(true);
                  }}
                >
                  <label className="pc-sr-only" htmlFor="pc-newsletter-email">Email for colour offers</label>
                  <input
                    id="pc-newsletter-email"
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pc-newsletter-input"
                  />
                  <button type="submit" className="pc-btn pc-btn-gradient px-4 py-2.5 text-sm">Join</button>
                </form>
              )}
              <p className="pc-muted mt-2 text-xs">One email a month. No spam, only offers and care tips.</p>
            </div>
          </div>
          <div className="border-t border-white/10 px-4 py-5 text-center">
            <p className="pc-muted text-xs">© {new Date().getFullYear()} {brandName} · {cityLabel} · All prices in ₹ (INR)</p>
          </div>
        </footer>
        {bookingAvailable && (
          <StickyBookBar
            startingPrice={startingPrice}
            phoneHref={phoneHref}
            whatsappHref={waUrl || phoneHref}
            onBook={() => onBook(firstService)}
          />
        )}
        <BackToTop />
      </div>
    </MotionConfig>
  );
}
