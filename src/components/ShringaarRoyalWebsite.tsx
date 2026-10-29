import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Facebook,
  Gem,
  Instagram,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Plus,
  Send,
  Sparkles,
  Star,
  X,
  Youtube,
} from 'lucide-react';
import type { SalonProfile, SalonService, Stylist } from '../types';
import type { SalonGalleryPhoto } from '../lib/photoGallery';
import { isPackage } from '../lib/packageCatalogue';
import { socialUrl } from '../lib/websiteContent';
import {
  SHRINGAAR_BRAND_NAME,
  SHRINGAAR_DEFAULT_CITY,
  SHRINGAAR_DEFAULT_PHONE,
  SHRINGAAR_DEFAULT_STYLISTS,
  SHRINGAAR_IMAGES,
  SHRINGAAR_SERVICES,
  buildShringaarSeo,
  resolveShringaarPackages,
  resolveShringaarRoyalConfig,
  shringaarCssVariables,
  shringaarFormatInr,
  shringaarOpenStatus,
  shringaarServiceImage,
} from '../lib/shringaarRoyal';
import {
  canObserveViewport,
  deviceMockupIn,
  fadeUp,
  heroHeadline,
  scaleIn,
  stagger,
} from '../lib/motion';
import { WebsiteSections } from './WebsiteSections';
import { CustomerAppPromotion } from './CustomerAppPromotion';
import { SafeImage } from './shringaar-royal/SafeImage';
import { DeviceMockup } from './shringaar-royal/DeviceMockup';
import { BeforeAfterSlider } from './shringaar-royal/BeforeAfterSlider';
import { TestimonialCarousel } from './shringaar-royal/TestimonialCarousel';
import { PageShell, Reveal, RevealGroup, RevealItem } from './shringaar-royal/Motion';
import { AppAnnouncementStrip } from './CustomerAppPromotion';
import {
  ArchOutline,
  CornerOrnaments,
  DiamondDivider,
  FooterOrnament,
  GoldRule,
  JaaliStrip,
  LotusDivider,
  LotusMark,
} from './shringaar-royal/Ornaments';

/**
 * Template 11 — Shringaar Royal Indian Bridal Lounge.
 *
 * A bespoke editorial storefront: sticky glass navbar, jharokha-arch hero with
 * a booking-app device mockup, gold-hairline trust ribbon, horizontal
 * signature-collection rail, masonry lookbook, arch-framed heirloom packages
 * (centre card in glassmorphism), bento service tiles, a keyboard-operable
 * before/after slider, artist portraits, a 4-step bridal journey timeline,
 * a bride-quote carousel, an Instagram strip, a wedding-season offer banner,
 * a glass consultation form over a bridal photograph, and an ornamented footer.
 *
 * Data contract: everything is read from the onboarding workspace (profile,
 * services, stylists, gallery, policies, loyalty) through the same props as
 * Templates 06–10, so bookings, offers and the Nexora customer app keep
 * working. Missing content falls back to the bundled Shringaar demo defaults.
 */
export function ShringaarRoyalWebsite({
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
  const config = useMemo(() => resolveShringaarRoyalConfig(profile), [profile]);
  const cssVars = useMemo(() => shringaarCssVariables(config.colors) as React.CSSProperties, [config.colors]);
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(
    () =>
      !(
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string; caption: string } | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterDone, setNewsletterDone] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', date: '', service: '', message: '' });
  const [formStatus, setFormStatus] = useState('');

  const brandName = (profile.businessName || '').trim() || SHRINGAAR_BRAND_NAME;
  const cityLabel = (profile.city || '').trim() || SHRINGAAR_DEFAULT_CITY;
  const cityShort = cityLabel.split(',')[0].trim();
  const phone = (profile.phone || profile.whatsapp || '').trim() || SHRINGAAR_DEFAULT_PHONE;
  const phoneHref = `tel:${phone.replace(/[^+\d]/g, '')}`;
  const whatsappDigits = (profile.whatsapp || profile.phone || '').replace(/[^0-9]/g, '');
  const waUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
        `Namaste ${brandName}, I would like to book a bridal consultation.`,
      )}`
    : '';
  const addressLine = [(profile.address || '').trim(), cityLabel, (profile.postalCode || '').trim()].filter(Boolean).join(', ');
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine || brandName)}`;
  const instagramUrl = socialUrl(profile.instagramHandle, 'instagram');
  const facebookUrl = socialUrl(profile.facebookPage, 'facebook');
  const youtubeUrl = socialUrl(profile.youtubeChannel, 'youtube');

  const coreServices = useMemo(() => services.filter((service) => !isPackage(service)), [services]);
  const bridalMenu = coreServices.length ? coreServices : services;
  const packages = useMemo(() => resolveShringaarPackages(config.packages, services), [config.packages, services]);
  const team = stylists && stylists.length ? stylists : SHRINGAAR_DEFAULT_STYLISTS;
  const firstService = bridalMenu[0] || services[0] || SHRINGAAR_SERVICES[0];
  const openStatus = shringaarOpenStatus(config.openTime, config.closeTime);
  const startingPrice = bridalMenu.reduce<number | undefined>(
    (min, service) => (service.price != null && (min === undefined || service.price < min) ? service.price : min),
    undefined,
  );

  const ownerLookbook = useMemo(
    () =>
      (galleryPhotos || [])
        .filter((photo) => Boolean(photo?.url))
        .slice(0, 10)
        .map((photo) => ({ id: photo.id, image: photo.url, alt: photo.title || 'Bridal look', caption: photo.title || 'Bridal look', tag: photo.category || 'Bridal' })),
    [galleryPhotos],
  );
  // Owner photographs always win: once a bride's own pictures are saved the
  // lookbook never pads itself with demo brides.
  const looks = ownerLookbook.length ? ownerLookbook.slice(0, 10) : config.looks;
  const instaStrip = ownerLookbook.length
    ? ownerLookbook.slice(0, 8).map((photo) => photo.image)
    : config.galleryUrls.slice(0, 8);

  const scrollToId = (id: string) => {
    if (typeof document === 'undefined') return;
    document.querySelector(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  /* Brief gold loader — skipped for reduced motion so content appears instantly. */
  useEffect(() => {
    if (reduceMotion) {
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => setLoading(false), 620);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  /* Sticky navbar elevation + Escape handling for drawer and lightbox. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      setLightbox(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /* SEO title, description and LocalBusiness JSON-LD from the resolved config. */
  useEffect(() => {
    if (typeof document === 'undefined' || !document.head?.appendChild || typeof document.createElement !== 'function') return;
    const seo = buildShringaarSeo(profile, config, typeof location !== 'undefined' ? location.origin : undefined);
    const previousTitle = document.title;
    document.title = seo.title;
    const meta = (attr: 'name' | 'property', key: string, content: string) => {
      let element = document.querySelector(`meta[${attr}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };
    meta('name', 'description', seo.description);
    meta('property', 'og:title', seo.ogTitle);
    meta('property', 'og:description', seo.ogDescription);
    meta('property', 'og:image', seo.ogImage);
    meta('property', 'og:type', 'website');
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(seo.jsonLd);
    document.head.appendChild(script);
    return () => {
      document.title = previousTitle;
      script.remove?.();
    };
  }, [profile, config]);

  const accountHref = profile.subdomain ? `/?customer=1&return=${encodeURIComponent(profile.subdomain)}` : '/?customer=1';
  const navLinks: Array<[string, string]> = [
    ['Collections', '#sr-collections'],
    ['Lookbook', '#sr-looks'],
    ['Packages', '#sr-packages'],
    ['Services', '#sr-services'],
    ['Artists', '#sr-artists'],
    ['Journey', '#sr-journey'],
    ['Reviews', '#sr-reviews'],
    ['Contact', '#sr-booking'],
  ];

  const heroWordCount = config.heroHeading.split(' ').length;
  const heroWords = config.heroHeading.split(' ');
  const heroTailIndex = Math.max(heroWordCount - 2, 1);
  const heroHead = heroWords.slice(0, heroTailIndex).join(' ');
  const heroTail = heroWords.slice(heroTailIndex).join(' ');

  const submitEnquiry = (event: React.FormEvent) => {
    event.preventDefault();
    const chosen = services.find((service) => service.id === form.service) || firstService;
    const lines = [
      `Namaste ${brandName}, I would like a bridal consultation.`,
      form.name ? `Name: ${form.name}` : '',
      form.phone ? `Phone: ${form.phone}` : '',
      form.date ? `Wedding date: ${form.date}` : '',
      form.service ? `Interested in: ${chosen?.name || form.service}` : '',
      form.message ? `Note: ${form.message}` : '',
    ].filter(Boolean);
    if (whatsappDigits) {
      const href = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(lines.join('\n'))}`;
      if (typeof window !== 'undefined') window.open(href, '_blank', 'noopener,noreferrer');
      setFormStatus('Opening WhatsApp with your bridal enquiry…');
      return;
    }
    if (bookingAvailable) {
      setFormStatus('Opening the booking form so you can pick a date and time.');
      onBook(chosen);
      return;
    }
    setFormStatus(`Please call ${phone} — our bridal desk will confirm your date.`);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="sr-site sr-site--docked" style={cssVars}>
        <AnimatePresence>
          {loading && (
            <motion.div className="sr-loader" exit={{ opacity: 0 }} aria-hidden="true">
              <span className="sr-loader-ring" />
            </motion.div>
          )}
        </AnimatePresence>

        <AppAnnouncementStrip />

        {/* 1 — Wedding-season strip + sticky glass navbar */}
        <div className="sr-topstrip">
          <div className="sr-marquee-track" aria-hidden="true">
            {[0, 1].map((copy) => (
              <span key={copy} style={{ display: 'inline-flex', gap: 44 }}>
                <span>✦ {config.announcementText}</span>
                <span>✦ Royal Rajputana Trousseaus</span>
                <span>✦ Hand-draped in Jaipur</span>
                <span>✦ Complimentary trial look book</span>
              </span>
            ))}
          </div>
        </div>

        <header className={`sr-nav${scrolled ? ' is-scrolled' : ''}`} data-layout="header">
          <div className="sr-shell sr-nav-inner">
            <a href="#sr-hero" className="sr-logo" aria-label={`${brandName} — home`}>
              <span className="sr-logo-mark">
                {profile.logoUrl ? (
                  <img src={profile.logoUrl} alt={`${brandName} logo`} width={40} height={40} loading="lazy" decoding="async" />
                ) : (
                  <LotusMark size={24} />
                )}
              </span>
              <span className="sr-logo-text">
                <span className="sr-logo-name">{brandName}</span>
                <span className="sr-logo-sub">{cityShort} · Bridal Lounge</span>
              </span>
            </a>

            <nav className="sr-nav-links" aria-label="Website navigation">
              {navLinks.map(([label, href]) => (
                <a key={href} href={href} className="sr-nav-link">
                  {label}
                </a>
              ))}
              {/* Deep link into the Nexora customer app; signed-in brides get the
                  bookings sheet in place instead of leaving the page. */}
              <a
                className="sr-nav-link sr-nav-link--account"
                href={accountHref}
                onClick={(event) => {
                  if (typeof onMyBookings !== 'function') return;
                  event.preventDefault();
                  onMyBookings();
                }}
              >
                {customerSignedIn ? 'My Bookings' : 'Customer Login'}
              </a>
            </nav>

            <div className="sr-nav-actions">
              <span className="sr-nav-status">
                <span className={openStatus.open ? 'sr-dot' : 'sr-dot sr-dot--closed'} aria-hidden="true" />
                {openStatus.label}
              </span>
              {bookingAvailable && (
                <button type="button" className="sr-btn sr-btn--primary sr-btn--sm" onClick={() => onBook(firstService)}>
                  <CalendarCheck size={14} aria-hidden="true" /> Book Consultation
                </button>
              )}
              {customerSignedIn ? (
                <>
                  <span className="sr-sr-only">Customer account</span>
                  <button
                    type="button"
                    className="sr-btn sr-btn--ghost sr-btn--sm"
                    aria-label="Manage your customer account"
                    onClick={onMyBookings}
                  >
                    {customerPhotoUrl ? (
                      <img
                        src={customerPhotoUrl}
                        alt=""
                        width={22}
                        height={22}
                        loading="lazy"
                        style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : null}
                    {customerName || 'My account'}
                  </button>
                  <button type="button" className="sr-btn sr-btn--ghost sr-btn--sm" onClick={onMyBookings}>
                    My Bookings
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="sr-btn sr-btn--ghost sr-btn--sm" onClick={() => onAccount('signin')}>
                    Customer Login
                  </button>
                  <button type="button" className="sr-btn sr-btn--ghost sr-btn--sm" onClick={() => onAccount('signup')}>
                    Sign up
                  </button>
                </>
              )}
              <button
                type="button"
                className="sr-btn sr-btn--ghost sr-btn--sm"
                aria-expanded={menuOpen}
                aria-controls="sr-drawer"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMenuOpen((value) => !value)}
                style={{ display: 'inline-flex' }}
              >
                {menuOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>
          {menuOpen && (
            <div className="sr-drawer" id="sr-drawer">
              <nav aria-label="Bridal sections">
                {navLinks.map(([label, href]) => (
                  <a key={href} href={href} className="sr-nav-link" onClick={() => setMenuOpen(false)}>
                    {label}
                  </a>
                ))}
              </nav>
              <div className="sr-drawer-foot">
                {bookingAvailable && (
                  <button
                    type="button"
                    className="sr-btn sr-btn--primary sr-btn--sm"
                    onClick={() => {
                      setMenuOpen(false);
                      onBook(firstService);
                    }}
                  >
                    Book Consultation
                  </button>
                )}
                {waUrl && (
                  <a className="sr-btn sr-btn--ghost sr-btn--sm" href={waUrl} target="_blank" rel="noreferrer">
                    <MessageCircle size={14} aria-hidden="true" /> WhatsApp
                  </a>
                )}
                <a className="sr-btn sr-btn--ghost sr-btn--sm" href={phoneHref}>
                  <Phone size={14} aria-hidden="true" /> {phone}
                </a>
              </div>
            </div>
          )}
        </header>

        <PageShell pageKey="shringaar-home">
          {/* 2 — Hero */}
          <section id="sr-hero" data-layout="hero" className="sr-hero" aria-labelledby="sr-hero-heading">
            <div className="sr-jaali" aria-hidden="true" />
            <ArchOutline className="sr-hero-arch-outline" />
            <div className="sr-shell sr-hero-grid">
              <motion.div
                className="sr-hero-copy"
                variants={stagger}
                initial={canObserveViewport ? 'hidden' : 'visible'}
                animate="visible"
              >
                <motion.span variants={heroHeadline} className="sr-hero-script">
                  {config.heroScript}
                </motion.span>
                <motion.p variants={heroHeadline} className="sr-eyebrow" style={{ marginTop: 6 }}>
                  {cityShort} · Bridal Atelier
                </motion.p>
                <h1 id="sr-hero-heading" className="sr-hero-title" style={{ marginTop: 14 }}>
                  <motion.span variants={heroHeadline} style={{ display: 'block' }}>
                    {heroHead}
                  </motion.span>
                  <motion.span variants={heroHeadline} style={{ display: 'block' }}>
                    <em>{heroTail}</em>
                  </motion.span>
                </h1>
                <motion.p variants={fadeUp} className="sr-hero-lead">
                  {config.heroSubtext}
                </motion.p>
                <motion.div variants={fadeUp} className="sr-hero-actions">
                  {bookingAvailable && (
                    <button type="button" className="sr-btn sr-btn--primary" onClick={() => onBook(firstService)}>
                      <CalendarCheck size={16} aria-hidden="true" /> Book Consultation
                    </button>
                  )}
                  <a className="sr-btn sr-btn--ghost" href="#sr-packages">
                    Heirloom Packages <ArrowRight size={16} aria-hidden="true" />
                  </a>
                </motion.div>
                <motion.dl variants={fadeUp} className="sr-hero-facts">
                  <div className="sr-hero-fact">
                    <dt>Brides styled</dt>
                    <dd>1,200+</dd>
                  </div>
                  <div className="sr-hero-fact">
                    <dt>Wedding seasons</dt>
                    <dd>11</dd>
                  </div>
                  <div className="sr-hero-fact">
                    <dt>Bridal looks from</dt>
                    <dd>{startingPrice != null ? shringaarFormatInr(startingPrice) : 'On consult'}</dd>
                  </div>
                </motion.dl>
              </motion.div>

              <div className="sr-hero-media">
                <span className="sr-hero-glow" aria-hidden="true" />
                <CornerOrnaments />
                <motion.div
                  variants={scaleIn}
                  initial={canObserveViewport ? 'hidden' : 'visible'}
                  animate="visible"
                  className="sr-arch sr-hero-arch"
                >
                  <div className="sr-arch-inner">
                    <SafeImage
                      src={config.heroImageUrl}
                      fallback={SHRINGAAR_IMAGES.hero}
                      alt={`Bride in a maroon zardozi lehenga with kundan jewellery at ${brandName}`}
                      width={760}
                      height={1013}
                      loading="eager"
                      fetchPriority="high"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </motion.div>
                <div className="sr-hero-badge">
                  <span>Since</span>
                  <strong>2014</strong>
                  <span>Jaipur</span>
                </div>
                <span className="sr-hero-est" aria-hidden="true">
                  {config.established}
                </span>
                <motion.div
                  variants={deviceMockupIn}
                  initial={canObserveViewport ? 'hidden' : 'visible'}
                  animate="visible"
                  className="sr-hero-phone"
                >
                  <DeviceMockup
                    brandName={brandName}
                    cityLabel={cityShort}
                    logoUrl={profile.logoUrl}
                    services={bridalMenu}
                    onBook={(service) => onBook(service)}
                  />
                </motion.div>
              </div>
            </div>
          </section>

          {/* 3 — Trust strip */}
          <section className="sr-trust" aria-label="Studio highlights">
            <div className="sr-shell">
              <div className="sr-trust-grid">
                {config.stats.slice(0, 4).map((stat) => (
                  <div className="sr-trust-item" key={stat.id}>
                    <span className="sr-trust-badge">
                      <SafeImage src={stat.image} fallback={SHRINGAAR_IMAGES.looks.one} alt={stat.alt} width={46} height={46} loading="lazy" />
                    </span>
                    <span>
                      <span className="sr-trust-value">{stat.value}</span>
                      <span className="sr-trust-label">{stat.label}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

        {/* Sticky dock: quick links on phones, live price + booking on desktop. */}
        <nav data-layout="dock" className="sr-dock" aria-label="Quick bridal navigation">
          <div className="sr-dock-links">
            {[
              ['Offers', '#sr-offer'],
              ['Services', '#sr-services'],
              ['Our Team', '#sr-artists'],
              ['Lookbook', '#sr-looks'],
              ['Reviews', '#sr-reviews'],
              ['Location', '#sr-booking'],
            ].map(([label, href]) => (
              <a key={href} className="sr-dock-link" href={href}>
                {label}
              </a>
            ))}
          </div>
          <span className="sr-dock-info">
            <b>{startingPrice != null ? `Bridal looks from ${shringaarFormatInr(startingPrice)}` : 'Bridal consultations'}</b>
            <span>{openStatus.label}</span>
          </span>
          {waUrl && (
            <a className="sr-btn sr-btn--ghost sr-btn--sm" href={waUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={14} aria-hidden="true" /> WhatsApp Inquiry
            </a>
          )}
          {bookingAvailable && (
            <button type="button" className="sr-btn sr-btn--primary sr-btn--sm" onClick={() => onBook(firstService)}>
              Book
            </button>
          )}
        </nav>

          {/* 4 — About: editorial split */}
          <section className="sr-section sr-paper" data-layout="about" aria-labelledby="sr-about-heading">
            <div className="sr-shell sr-about-grid">
              <Reveal className="sr-about-media" variant="fadeIn">
                <div className="sr-arch">
                  <div className="sr-arch-inner">
                    <SafeImage
                      src={config.aboutImageUrl}
                      fallback={SHRINGAAR_IMAGES.about}
                      alt={`Palace mandap with carved jharokha arches at ${brandName}`}
                      width={800}
                      height={1000}
                      loading="lazy"
                    />
                  </div>
                </div>
                <div className="sr-about-overlap">
                  <SafeImage
                    src={SHRINGAAR_IMAGES.collections.jewellery}
                    fallback={SHRINGAAR_IMAGES.collections.jewellery}
                    alt="Antique kundan bridal jewellery laid on ivory silk"
                    width={220}
                    height={220}
                    loading="lazy"
                  />
                </div>
              </Reveal>
              <Reveal delay={0.05}>
                <p className="sr-eyebrow">The House of Shringaar</p>
                <h2 id="sr-about-heading" className="sr-h2" style={{ marginTop: 12 }}>
                  {config.aboutHeading}
                </h2>
                <LotusDivider />
                <p className="sr-lead">{config.aboutStory}</p>
                <ul className="sr-about-points">
                  {[
                    'Private bridal chamber for the bride and her party',
                    'Hand-draped zardozi, silk and poshak — pinned to last',
                    'Airbrush base sealed for tears, heat and fourteen hours',
                    'Heirloom jewellery setting by the founder herself',
                  ].map((point) => (
                    <li key={point}>
                      <Gem size={15} aria-hidden="true" /> {point}
                    </li>
                  ))}
                </ul>
                <div className="sr-about-sign">
                  <SafeImage
                    src={profile.ownerPhotoUrl || SHRINGAAR_IMAGES.owner}
                    fallback={SHRINGAAR_IMAGES.owner}
                    alt={`${profile.ownerName || 'Anuradha Rathore'}, founder of ${brandName}`}
                    width={54}
                    height={54}
                    loading="lazy"
                  />
                  <span>
                    <b>{profile.ownerName || 'Anuradha Rathore'}</b>
                    <span>{profile.ownerRole || 'Founder & Bridal Couture Director'}</span>
                  </span>
                </div>
              </Reveal>
            </div>
          </section>

          {/* 5 — Signature collections (horizontal rail) */}
          <section className="sr-section" id="sr-collections" data-layout="collections" aria-labelledby="sr-collections-heading">
            <div className="sr-shell">
              <Reveal className="sr-section-head">
                <div>
                  <p className="sr-eyebrow">Signature Collections</p>
                  <h2 id="sr-collections-heading" className="sr-h2" style={{ marginTop: 12 }}>
                    {config.collectionsHeading}
                  </h2>
                </div>
                <div>
                  <p className="sr-lead">{config.collectionsSubtext}</p>
                  <p className="sr-rail-hint" style={{ marginTop: 14 }}>
                    <ChevronLeft size={14} aria-hidden="true" /> Swipe the rail <ChevronRight size={14} aria-hidden="true" />
                  </p>
                </div>
              </Reveal>
            </div>
            <div className="sr-shell" style={{ paddingInline: 0 }}>
              <ul
                className="sr-rail"
                tabIndex={0}
                aria-label="Signature bridal collections — scroll horizontally"
              >
                {config.collections.map((collection, index) => (
                  <li className="sr-collection" key={collection.id}>
                    <span className="sr-collection-index">{String(index + 1).padStart(2, '0')}</span>
                    <div className="sr-arch">
                      <div className="sr-arch-inner">
                        <SafeImage src={collection.image} fallback={SHRINGAAR_IMAGES.collections.lehenga} alt={collection.alt} width={600} height={800} loading="lazy" />
                      </div>
                    </div>
                    <div className="sr-collection-body">
                      <div>
                        <h3>{collection.name}</h3>
                        <p>{collection.subtitle}</p>
                      </div>
                      <Gem size={16} aria-hidden="true" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 6 — Sabyasachi aesthetic lookbook (masonry) */}
          <section className="sr-section sr-blush-band" id="sr-looks" data-layout="looks" aria-labelledby="sr-looks-heading">
            <div className="sr-shell">
              <Reveal className="sr-section-head">
                <div>
                  <p className="sr-eyebrow">The Sabyasachi Aesthetic</p>
                  <h2 id="sr-looks-heading" className="sr-h2" style={{ marginTop: 12 }}>
                    {config.looksHeading}
                  </h2>
                </div>
                <p className="sr-lead">{config.looksSubtext}</p>
              </Reveal>
              <div className="sr-masonry">
                {looks.map((look) => (
                  <button
                    key={look.id}
                    type="button"
                    className="sr-look"
                    onClick={() => setLightbox({ src: look.image, alt: look.alt, caption: `${look.caption} · ${look.tag}` })}
                    aria-label={`View ${look.caption} in a larger photo`}
                  >
                    <SafeImage src={look.image} fallback={SHRINGAAR_IMAGES.looks.one} alt={look.alt} width={640} height={800} loading="lazy" />
                    <span className="sr-look-tag">{look.tag}</span>
                    <span className="sr-look-caption">
                      <b>{look.caption}</b>
                      <span>View look</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 7 — Heirloom makeover packages */}
          {showPackages && (
            <section className="sr-section sr-paper" id="sr-packages" data-layout="packages" aria-labelledby="sr-packages-heading">
              <div className="sr-shell">
                <Reveal className="sr-section-head">
                  <div>
                    <p className="sr-eyebrow">{config.packageEyebrow}</p>
                    <h2 id="sr-packages-heading" className="sr-h2" style={{ marginTop: 12 }}>
                      {config.packagesHeading}
                    </h2>
                  </div>
                  <p className="sr-lead">
                    Fixed ₹ packages with a written look book. Every price includes the trial plan, the wedding morning and the touch-up kit — no surprise additions on the day.
                  </p>
                </Reveal>
                <RevealGroup className="sr-packages">
                  {packages.map((pkg) => (
                    <RevealItem key={pkg.id} as="article" className={`sr-package${pkg.popular ? ' is-featured' : ''}`}>
                      {pkg.popular && <span className="sr-package-glass" aria-hidden="true" />}
                      <div className="sr-package-media">
                        <SafeImage src={pkg.image} fallback={SHRINGAAR_IMAGES.packages.royal} alt={pkg.alt} width={720} height={440} loading="lazy" />
                        {pkg.badge && <span className="sr-package-badge">{pkg.badge}</span>}
                      </div>
                      <div className="sr-package-body">
                        <h3 className="sr-package-tier">{pkg.tier}</h3>
                        <p className="sr-package-tagline">{pkg.tagline}</p>
                        <p className="sr-package-price">
                          <b>{shringaarFormatInr(pkg.livePrice)}</b>
                          <span>{pkg.sessions || 'Bridal journey'}</span>
                        </p>
                        <ul className="sr-package-list">
                          {pkg.includes.map((line) => (
                            <li key={line}>
                              <Check size={14} aria-hidden="true" /> {line}
                            </li>
                          ))}
                        </ul>
                        {pkg.durationMinutes ? (
                          <p className="sr-package-tagline" style={{ marginTop: 12, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            {services.find((service) => service.id === pkg.liveServiceId)?.name || pkg.tier} · {pkg.durationMinutes} min
                          </p>
                        ) : null}
                        {bookingAvailable && (
                          <button
                            type="button"
                            className={pkg.popular ? 'sr-btn sr-btn--gold' : 'sr-btn sr-btn--primary'}
                            onClick={() => onBook(services.find((service) => service.id === pkg.liveServiceId) || firstService)}
                          >
                            Book {pkg.tier.split(' ')[0]} <ArrowUpRight size={15} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </RevealItem>
                  ))}
                </RevealGroup>
              </div>
            </section>
          )}

          {/* 8 — Services bento */}
          <section className="sr-section" id="sr-services" data-layout="services" aria-labelledby="sr-services-heading">
            <div className="sr-shell">
              <Reveal className="sr-section-head">
                <div>
                  <p className="sr-eyebrow">Bridal Menu</p>
                  <h2 id="sr-services-heading" className="sr-h2" style={{ marginTop: 12 }}>
                    {config.servicesHeading}
                  </h2>
                </div>
                <p className="sr-lead">
                  Makeup, hair architecture, draping, mehendi, pre-bridal rituals and skin glow. Tap any tile to book that ritual — prices are in ₹ and include the consultation.
                </p>
              </Reveal>
              <RevealGroup className="sr-services" aria-label="Service categories">
                {bridalMenu.map((service, index) => {
                  const span = index === 0 ? 'sr-service--wide' : index === 1 ? 'sr-service--half' : 'sr-service--third';
                  return (
                    <RevealItem key={service.id} as="article" className={`sr-service ${span}`}>
                      <button
                        type="button"
                        onClick={() => onBook(service)}
                        aria-label={`Book ${service.name}, ${shringaarFormatInr(service.price)}`}
                        style={{ all: 'unset', cursor: 'pointer', position: 'absolute', inset: 0, zIndex: 3 }}
                      />
                      <SafeImage
                        className="sf-service-image"
                        src={shringaarServiceImage(service)}
                        fallback={SHRINGAAR_IMAGES.services.makeup}
                        alt={`${service.name} at ${brandName}`}
                        width={600}
                        height={400}
                        loading="lazy"
                      />
                      <span className="sr-service-body">
                        <span className="sr-service-cat">{service.category}</span>
                        <span className="sr-service-name">{service.name}</span>
                        <span className="sr-service-desc">{service.description}</span>
                        <span className="sr-service-meta">
                          <b>{shringaarFormatInr(service.price)}</b>
                          {service.showDuration !== false && service.durationMinutes > 0 ? (
                            <span>
                              <Clock3 size={12} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> {service.durationMinutes} min
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </RevealItem>
                  );
                })}
              </RevealGroup>
              {!bridalMenu.length && (
                <p className="sr-lead" style={{ marginTop: 18 }}>
                  Our bridal menu is being prepared. Please call {phone} and our bridal desk will guide you personally.
                </p>
              )}
            </div>
          </section>

          {/* 9 — Before / after */}
          <section className="sr-section sr-maroon-band sr-on-dark" id="sr-results" data-layout="results" aria-labelledby="sr-results-heading">
            <div className="sr-shell">
              <Reveal className="sr-section-head">
                <div>
                  <p className="sr-eyebrow sr-eyebrow--light">Transformations</p>
                  <h2 id="sr-results-heading" className="sr-h2" style={{ marginTop: 12, color: '#fdf7ea' }}>
                    Before &amp; After, <em style={{ color: '#f6e2ae' }}>unretouched</em>
                  </h2>
                </div>
                <p className="sr-lead">
                  Drag the gold line to see the change our own team makes — same light, same skin, same camera. These are demo comparisons; every real bride’s photos are shared with her written consent.
                </p>
              </Reveal>
              <div className="sr-ba-grid">
                {config.beforeAfter.slice(0, 2).map((item) => (
                  <BeforeAfterSlider key={item.id} item={item} />
                ))}
              </div>
            </div>
          </section>

          {/* 10 — Artists */}
          <section className="sr-section sr-paper" id="sr-artists" data-layout="team" aria-labelledby="sr-artists-heading">
            <div className="sr-shell">
              <Reveal className="sr-section-head">
                <div>
                  <p className="sr-eyebrow">Our Artists</p>
                  <h2 id="sr-artists-heading" className="sr-h2" style={{ marginTop: 12 }}>
                    The Hands Behind the Heirloom
                  </h2>
                </div>
                <p className="sr-lead">
                  A small team by choice. Every bride is styled by the artist she meets at her trial — never by a stranger on the wedding morning.
                </p>
              </Reveal>
              <RevealGroup className="sr-team">
                {team.slice(0, 3).map((artist, index) => (
                  <RevealItem as="article" className="sr-artist" key={artist.id}>
                    <div className="sr-artist-arch">
                      <div className="sr-arch">
                        <div className="sr-arch-inner">
                          <button
                            type="button"
                            onClick={() => onViewSpecialist(artist.id)}
                            aria-label={`View profile & reviews: ${artist.name}`}
                            style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', height: '100%' }}
                          >
                            <SafeImage
                              src={artist.avatarUrl}
                              fallback={[SHRINGAAR_IMAGES.team.anuradha, SHRINGAAR_IMAGES.team.janki, SHRINGAAR_IMAGES.team.farzana][index % 3]}
                              alt={`Portrait of ${artist.name}, ${artist.role} at ${brandName}`}
                              width={560}
                              height={700}
                              loading="lazy"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="sr-artist-role">{artist.role}</p>
                    <h3 className="sr-artist-name">{artist.name}</h3>
                    <p className="sr-artist-bio">{artist.bio || `Specialist in ${(artist.specialties || []).join(', ') || 'bridal styling'}.`}</p>
                    <div className="sr-artist-skills">
                      {(artist.specialties || []).slice(0, 3).map((skill) => (
                        <span key={skill}>{skill}</span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="sr-link sr-artist-profile"
                      onClick={() => onViewSpecialist(artist.id)}
                    >
                      View profile &amp; reviews
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </button>
                    {bookingAvailable && (
                      <button type="button" className="sr-btn sr-btn--ghost sr-btn--sm" onClick={() => onBook(undefined, artist)}>
                        Book with {artist.name.split(' ')[0]}
                      </button>
                    )}
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </section>

          {/* 11 — Process / bridal journey */}
          <section className="sr-section" id="sr-journey" data-layout="journey" aria-labelledby="sr-journey-heading">
            <div className="sr-shell">
              <Reveal style={{ textAlign: 'center', maxWidth: 720, marginInline: 'auto' }}>
                <p className="sr-eyebrow sr-eyebrow--plain">Four Chapters</p>
                <h2 id="sr-journey-heading" className="sr-h2" style={{ marginTop: 10 }}>
                  {config.processHeading}
                </h2>
                <p className="sr-lead" style={{ marginInline: 'auto' }}>
                  From the first cup of chai to the last pin on the wedding morning — a calm, written plan so nothing is left to the day itself.
                </p>
                <DiamondDivider />
              </Reveal>
              <RevealGroup className="sr-process">
                {config.processSteps.map((step, index) => (
                  <RevealItem as="article" className="sr-step" key={step.id}>
                    <span className="sr-step-marker" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="sr-step-media">
                      <SafeImage src={step.image} fallback={SHRINGAAR_IMAGES.process.consultation} alt={step.alt} width={600} height={450} loading="lazy" />
                    </div>
                    <p className="sr-step-when">{step.durationLabel || `Step ${index + 1}`}</p>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </section>

          {/* 12 — Testimonials */}
          <section className="sr-section sr-blush-band" id="sr-reviews" data-layout="experiences" aria-labelledby="sr-reviews-heading">
            <div className="sr-shell">
              <Reveal className="sr-section-head">
                <div>
                  <p className="sr-eyebrow">Bridal Diaries</p>
                  <h2 id="sr-reviews-heading" className="sr-h2" style={{ marginTop: 12 }}>
                    {config.reviewsHeading}
                  </h2>
                </div>
                <p className="sr-lead">
                  Real words from brides who married in Jaipur, Udaipur and destination palaces. Reviews shown here are shared with each bride’s permission.
                </p>
              </Reveal>
              <TestimonialCarousel reviews={config.reviews} brandName={brandName} />
            </div>
          </section>

          {/* 13 — Instagram-style strip */}
          <section className="sr-section sr-section--tight" id="sr-gallery" data-layout="gallery" aria-labelledby="sr-gallery-heading">
            <div className="sr-shell">
              <Reveal className="sr-section-head" style={{ marginBottom: 24 }}>
                <div>
                  <p className="sr-eyebrow">Instagram</p>
                  <h2 id="sr-gallery-heading" className="sr-h2" style={{ marginTop: 12, fontSize: 'clamp(1.7rem, 3.4vw, 2.4rem)' }}>
                    {config.galleryHeading}
                  </h2>
                </div>
                <p className="sr-lead">
                  {instagramUrl ? (
                    <a className="sr-link" href={instagramUrl} target="_blank" rel="noreferrer">
                      {profile.instagramHandle?.startsWith('http') ? 'Follow on Instagram' : profile.instagramHandle || 'Follow on Instagram'}
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </a>
                  ) : (
                    'Photographs from our bridal diary, shared with permission.'
                  )}
                </p>
              </Reveal>
              <RevealGroup className="sr-insta">
                {instaStrip.map((src, index) => (
                  <RevealItem key={`${src}-${index}`} as="figure" style={{ margin: 0 }}>
                    <button
                      type="button"
                      className="sr-insta-tile"
                      onClick={() =>
                        setLightbox({
                          src,
                          alt: `Bridal photograph ${index + 1} from ${brandName}`,
                          caption: `${brandName} · bridal diary`,
                        })
                      }
                      aria-label={`View bridal photograph ${index + 1}`}
                    >
                      <SafeImage src={src} fallback={SHRINGAAR_IMAGES.gallery[index % SHRINGAAR_IMAGES.gallery.length]} alt={`Bridal photograph ${index + 1} from ${brandName}`} width={520} height={520} loading="lazy" />
                      <span>View</span>
                    </button>
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </section>

          {/* 14 — Wedding season offer banner */}
          <section className="sr-section sr-section--tight" id="sr-offer" data-layout="offer" aria-labelledby="sr-offer-heading">
            <div className="sr-shell">
              <Reveal className="sr-offer">
                <SafeImage
                  className="sr-offer-bg"
                  src={config.offerImageUrl}
                  fallback={SHRINGAAR_IMAGES.offer}
                  alt="Rajasthani palace mandap lit by candles and marigolds"
                  width={1400}
                  height={560}
                  loading="lazy"
                />
                <div className="sr-offer-inner">
                  <div>
                    <p className="sr-eyebrow sr-eyebrow--light">Limited Season Dates</p>
                    <h2 id="sr-offer-heading" style={{ marginTop: 10 }}>
                      {config.offerHeading}
                    </h2>
                    <p>{config.offerText}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
                      {bookingAvailable && (
                        <button type="button" className="sr-btn sr-btn--gold" onClick={() => onBook(services.find((service) => service.id === 'sr-pkg-maharani') || firstService)}>
                          Reserve my date <ArrowRight size={15} aria-hidden="true" />
                        </button>
                      )}
                      {waUrl && (
                        <a className="sr-btn sr-btn--ghost-light" href={waUrl} target="_blank" rel="noreferrer">
                          <MessageCircle size={15} aria-hidden="true" /> WhatsApp the bridal desk
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="sr-offer-side">
                    <b>₹5,000</b>
                    <span>Off the Maharani Heirloom</span>
                    <span>+ complimentary trial look book</span>
                    <span>Valid on 2026 wedding dates</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* 15 — Booking & contact */}
          <section className="sr-booking" id="sr-booking" data-layout="location" aria-labelledby="sr-booking-heading">
            <SafeImage
              className="sr-booking-bg"
              src={config.bookingImageUrl}
              fallback={SHRINGAAR_IMAGES.booking}
              alt={`Bride styled by ${brandName}`}
              width={1400}
              height={900}
              loading="lazy"
            />
            <div className="sr-shell sr-booking-grid">
              <Reveal className="sr-glass sr-glass--card sr-form-card" variant="fadeUp">
                <p className="sr-eyebrow sr-eyebrow--light">Bridal Enquiry</p>
                <h2 id="sr-booking-heading" style={{ marginTop: 10 }}>
                  {config.bookingHeading}
                </h2>
                <p>Tell us your wedding date and we will hold a consultation slot with our bridal director.</p>
                <form className="sr-form" onSubmit={submitEnquiry}>
                  <div className="sr-field">
                    <label htmlFor="sr-name">Bride’s name</label>
                    <input id="sr-name" name="name" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
                  </div>
                  <div className="sr-field">
                    <label htmlFor="sr-phone">Phone / WhatsApp</label>
                    <input id="sr-phone" name="phone" type="tel" autoComplete="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91" />
                  </div>
                  <div className="sr-field">
                    <label htmlFor="sr-date">Wedding date</label>
                    <input id="sr-date" name="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="sr-field">
                    <label htmlFor="sr-service">Ritual of interest</label>
                    <select id="sr-service" name="service" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                      <option value="">Not sure yet — guide me</option>
                      {bridalMenu.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} · {shringaarFormatInr(service.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sr-field sr-field--full">
                    <label htmlFor="sr-message">Anything we should know?</label>
                    <textarea id="sr-message" name="message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Venue, number of events, family makeup…" />
                  </div>
                  <div className="sr-field--full" style={{ display: 'grid', gap: 10 }}>
                    <button type="submit" className="sr-btn sr-btn--gold" style={{ width: 'fit-content' }}>
                      <Send size={15} aria-hidden="true" /> Send bridal enquiry
                    </button>
                    <p className="sr-form-status" role="status" aria-live="polite">
                      {formStatus}
                    </p>
                    {bookingAvailable && (
                      <p className="sr-form-note" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Check size={13} aria-hidden="true" /> Verified checkout · secure booking on Nexora
                      </p>
                    )}
                    <p className="sr-form-note">
                      Your details are used only to plan your bridal appointment. Prefer to talk? Call{' '}
                      <a href={phoneHref} style={{ color: '#f6e2ae' }}>
                        {phone}
                      </a>
                      .
                    </p>
                  </div>
                </form>
              </Reveal>

              <Reveal delay={0.05} className="sr-glass sr-glass--ink sr-contact-card" variant="fadeUp">
                <h3>Visit the lounge</h3>
                <div className="sr-contact-list">
                  <p className="sr-contact-row">
                    <MapPin size={16} aria-hidden="true" />
                    <span>
                      <b>Address</b>
                      {addressLine || `${cityLabel}`}
                      <br />
                      <a href={mapUrl} target="_blank" rel="noreferrer">
                        Get directions
                      </a>
                    </span>
                  </p>
                  <p className="sr-contact-row">
                    <Phone size={16} aria-hidden="true" />
                    <span>
                      <b>Bridal desk</b>
                      <a href={phoneHref}>{phone}</a>
                    </span>
                  </p>
                  <p className="sr-contact-row">
                    <Mail size={16} aria-hidden="true" />
                    <span>
                      <b>Email</b>
                      <a href={`mailto:${config.publicEmail}`}>{config.publicEmail}</a>
                    </span>
                  </p>
                  <p className="sr-contact-row">
                    <Clock3 size={16} aria-hidden="true" />
                    <span>
                      <b>Timings</b>
                      {config.workingHoursDisplay}
                      <br />
                      {openStatus.label}
                    </span>
                  </p>
                </div>
                {config.mapEmbedUrl ? (
                  <div className="sr-map">
                    <iframe title={`Map to ${brandName}`} src={config.mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                  </div>
                ) : (
                  <a
                    className="sr-map"
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      gap: 6,
                      padding: '26px 18px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      color: '#fdf7ea',
                      background:
                        'repeating-linear-gradient(45deg, rgba(246,226,174,0.12) 0 12px, transparent 12px 24px), rgba(251,244,230,0.08)',
                    }}
                  >
                    <MapPin size={22} aria-hidden="true" />
                    <b style={{ fontFamily: 'var(--sr-serif)', fontSize: '1.05rem' }}>Open the map to the lounge</b>
                    <span style={{ fontSize: '0.74rem', color: 'rgba(253,247,234,0.76)' }}>{addressLine}</span>
                  </a>
                )}
                <div className="sr-contact-actions">
                  {waUrl && (
                    <a className="sr-btn sr-btn--gold sr-btn--sm" href={waUrl} target="_blank" rel="noreferrer">
                      <MessageCircle size={14} aria-hidden="true" /> WhatsApp
                    </a>
                  )}
                  <a className="sr-btn sr-btn--ghost-light sr-btn--sm" href={phoneHref}>
                    <Phone size={14} aria-hidden="true" /> Call
                  </a>
                  {bookingAvailable && (
                    <button type="button" className="sr-btn sr-btn--ghost-light sr-btn--sm" onClick={() => onBook(firstService)}>
                      Book online
                    </button>
                  )}
                </div>
              </Reveal>
            </div>
          </section>

          {/* 16 — FAQ */}
          <section className="sr-section sr-paper" id="sr-faq" data-layout="faq" aria-labelledby="sr-faq-heading">
            <div className="sr-shell">
              <Reveal className="sr-section-head">
                <div>
                  <p className="sr-eyebrow">Before You Book</p>
                  <h2 id="sr-faq-heading" className="sr-h2" style={{ marginTop: 12 }}>
                    Bridal Questions
                  </h2>
                </div>
                <p className="sr-lead">Everything a bride and her mother ask us before confirming a date.</p>
              </Reveal>
              <Reveal className="sr-faq">
                {config.faqs.map((faq, index) => (
                  <details key={faq.id} open={index === 0}>
                    <summary>
                      {faq.question}
                      <Plus size={16} aria-hidden="true" />
                    </summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
              </Reveal>
            </div>
          </section>

          {/* Platform sections — offers, videos, loyalty, policies, share */}
          {enabledSections.length > 0 && (
            <div className="sr-platform">
              <div className="sr-shell">
                <WebsiteSections {...shared} sections={enabledSections} />
              </div>
            </div>
          )}
          <div className="sr-shell">
            <CustomerAppPromotion />
          </div>
        </PageShell>

        {/* 17 — Footer */}
        <footer data-layout="footer" className="sr-footer">
          <FooterOrnament className="sr-footer-ornament" />
          <JaaliStrip className="sr-footer-ornament" height={18} />
          <div className="sr-shell sr-footer-grid">
            <div>
              <div className="sr-logo" style={{ color: '#f6e2ae' }}>
                <span className="sr-logo-mark">
                  {profile.logoUrl ? (
                    <img src={profile.logoUrl} alt={`${brandName} logo`} width={40} height={40} loading="lazy" decoding="async" />
                  ) : (
                    <LotusMark size={24} />
                  )}
                </span>
                <span className="sr-logo-text">
                  <span className="sr-logo-name" style={{ color: '#fdf7ea' }}>
                    {brandName}
                  </span>
                  <span className="sr-logo-sub" style={{ color: 'rgba(246,226,174,0.7)' }}>
                    {cityShort} · Bridal Lounge
                  </span>
                </span>
              </div>
              <p style={{ marginTop: 14 }}>
                {(profile.tagline || '').trim() || 'Royal Rajputana trousseaus, heirloom jewellery styling and bridal makeovers in Jaipur.'}
              </p>
              {profile.websiteSections?.social === false ? null : (
                <div data-section="social" className="sr-footer-social">
                  <h3 style={{ marginTop: 18 }}>{profile.sectionHeadings?.socialTitle || 'Follow the Atelier'}</h3>
                  <div className="sr-socials">
                {instagramUrl && (
                  <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label={`${brandName} on Instagram`}>
                    <Instagram size={16} aria-hidden="true" />
                  </a>
                )}
                {facebookUrl && (
                  <a href={facebookUrl} target="_blank" rel="noreferrer" aria-label={`${brandName} on Facebook`}>
                    <Facebook size={16} aria-hidden="true" />
                  </a>
                )}
                {youtubeUrl && (
                  <a href={youtubeUrl} target="_blank" rel="noreferrer" aria-label={`${brandName} on YouTube`}>
                    <Youtube size={16} aria-hidden="true" />
                  </a>
                )}
                {waUrl && (
                  <a href={waUrl} target="_blank" rel="noreferrer" aria-label={`Message ${brandName} on WhatsApp`}>
                    <MessageCircle size={16} aria-hidden="true" />
                  </a>
                )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <h3>The Lounge</h3>
              <div className="sr-footer-links">
                {navLinks.slice(0, 5).map(([label, href]) => (
                  <a key={href} href={href}>
                    {label}
                  </a>
                ))}
                <button type="button" onClick={onMyBookings}>
                  My bookings
                </button>
              </div>
            </div>
            <div>
              <h3>Visit</h3>
              <p>{addressLine}</p>
              <p style={{ marginTop: 10 }}>
                <a href={phoneHref} style={{ color: '#f6e2ae' }}>
                  {phone}
                </a>
              </p>
              <p style={{ marginTop: 4 }}>
                <a href={`mailto:${config.publicEmail}`} style={{ color: 'rgba(251,244,230,0.78)' }}>
                  {config.publicEmail}
                </a>
              </p>
              <p style={{ marginTop: 10 }}>{config.workingHoursDisplay}</p>
            </div>
            <div>
              <h3>Bridal Letter</h3>
              <p>New collections, wedding-season dates and pre-bridal rituals — once a month.</p>
              {newsletterDone ? (
                <p style={{ marginTop: 12, color: '#f6e2ae', fontWeight: 700 }}>You are on the list. Watch your inbox.</p>
              ) : (
                <form
                  className="sr-newsletter"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (newsletterEmail.includes('@')) setNewsletterDone(true);
                  }}
                >
                  <label htmlFor="sr-newsletter">Email address</label>
                  <div className="sr-newsletter-row">
                    <input
                      id="sr-newsletter"
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={(event) => setNewsletterEmail(event.target.value)}
                      placeholder="you@example.com"
                    />
                    <button type="submit">Join</button>
                  </div>
                </form>
              )}
              <LotusDivider />
            </div>
          </div>
          <div className="sr-shell sr-footer-bottom">
            <span>
              © {new Date().getFullYear()} {brandName} · {cityLabel} · All prices in ₹ (INR)
            </span>
            <span style={{ display: 'inline-flex', gap: 14 }}>
              <a href="#sr-faq" style={{ color: 'inherit' }}>
                Bridal FAQs
              </a>
              <a href={mapUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                Directions
              </a>
              <span>{config.established}</span>
            </span>
          </div>
        </footer>

        {/* Floating helpers */}
        {waUrl && (
          <a className="sr-whatsapp-float" href={waUrl} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${brandName}`}>
            <MessageCircle size={22} aria-hidden="true" />
          </a>
        )}
        <button
          type="button"
          className="sr-to-top"
          aria-label="Back to top"
          onClick={() => {
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
          }}
        >
          <Sparkles size={16} aria-hidden="true" />
        </button>
        <AnimatePresence>
          {lightbox && (
            <motion.div
              className="sr-lightbox"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightbox(null)}
              role="dialog"
              aria-modal="true"
              aria-label="Bridal photograph"
            >
              <button type="button" className="sr-lightbox-close" aria-label="Close photo" onClick={() => setLightbox(null)}>
                <X size={18} aria-hidden="true" />
              </button>
              <figure onClick={(event) => event.stopPropagation()}>
                <img src={lightbox.src} alt={lightbox.alt} />
                <figcaption>
                  <Star size={12} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px', color: '#f6e2ae' }} /> {lightbox.caption}
                </figcaption>
              </figure>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
