import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import type { SalonProfile, SalonService, Stylist } from '../types';
import type { SalonGalleryPhoto } from '../lib/photoGallery';
import { isPackage } from '../lib/packageCatalogue';
import { promotionActive, usePromotionClock } from '../lib/promotionStatus';
import { showcaseVideos } from '../lib/showcaseVideos';
import { reelSource } from '../lib/socialVideoSource';
import { socialUrl } from '../lib/websiteContent';
import {
  VOGUE_NOIR_BRAND_NAME,
  VOGUE_NOIR_DEFAULT_ADDRESS,
  VOGUE_NOIR_DEFAULT_CITY,
  VOGUE_NOIR_DEFAULT_PHONE,
  VOGUE_NOIR_DEFAULT_STYLISTS,
  VOGUE_NOIR_IMAGES,
  buildVogueNoirSeo,
  resolveVogueNoirConfig,
  vogueNoirCssVariables,
} from '../lib/vogueNoir';
import { ServicePhoto } from './ServicePhoto';
import { WebsiteSections } from './WebsiteSections';
import { AppAnnouncementStrip, CustomerAppPromotion } from './CustomerAppPromotion';
import { SafeImage } from './vogue-noir/SafeImage';
import { AcademySection } from './vogue-noir/AcademySection';
import { PortfolioSection } from './vogue-noir/PortfolioSection';

function formatInr(price: number | null | undefined): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(price || 0));
}

export function VogueNoirWebsite({
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
  readOnly,
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
  const config = useMemo(() => resolveVogueNoirConfig(profile), [profile]);
  const cssVars = useMemo(
    () => vogueNoirCssVariables(config.colors) as React.CSSProperties,
    [config.colors],
  );

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [serviceCat, setServiceCat] = useState('All');
  const [openFaqId, setOpenFaqId] = useState<string | null>(
    config.faqs[0]?.id || null,
  );
  const [conciergeServiceId, setConciergeServiceId] = useState<string>(
    services[0]?.id || '',
  );
  const [conciergeStylistId, setConciergeStylistId] = useState<string>('');

  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const promotionNow = usePromotionClock();

  const brandName = (profile.businessName || '').trim() || VOGUE_NOIR_BRAND_NAME;
  const phoneDisplay =
    (profile.phone || profile.whatsapp || '').trim() || VOGUE_NOIR_DEFAULT_PHONE;
  const whatsappDigits = (profile.whatsapp || profile.phone || VOGUE_NOIR_DEFAULT_PHONE).replace(
    /[^0-9]/g,
    '',
  );
  const normalizedWaDigits =
    whatsappDigits.length === 10 ? `91${whatsappDigits}` : whatsappDigits || '919000000000';
  const whatsappHref = `https://wa.me/${normalizedWaDigits}?text=${encodeURIComponent(
    `Hello ${brandName}, I would like to enquire about makeup booking / academy courses.`,
  )}`;

  const addressDisplay = useMemo(() => {
    const addr = (profile.address || '').trim();
    const city = (profile.city || '').trim();
    if (addr && city && !addr.toLowerCase().includes(city.toLowerCase())) {
      return `${addr}, ${city}`;
    }
    if (addr) return addr;
    if (city) return `${VOGUE_NOIR_DEFAULT_ADDRESS.replace(VOGUE_NOIR_DEFAULT_CITY, city)}`;
    return VOGUE_NOIR_DEFAULT_ADDRESS;
  }, [profile.address, profile.city]);

  const mapsQueryUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${brandName} ${addressDisplay}`,
  )}`;

  const siteUrl =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.href
      : 'https://voguenoir.example';
  const seo = useMemo(
    () => buildVogueNoirSeo(profile, config, siteUrl),
    [profile, config, siteUrl],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const onScroll = () => setScrolled((window.scrollY || 0) > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener?.('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previousTitle = document.title;
    document.title = seo.title;
    if (
      document.head &&
      typeof document.querySelector === 'function' &&
      typeof document.createElement === 'function' &&
      typeof document.head.appendChild === 'function'
    ) {
      const setMeta = (
        selector: string,
        attr: 'name' | 'property',
        key: string,
        content: string,
      ) => {
        let node = document.querySelector<HTMLMetaElement>(selector);
        if (!node) {
          node = document.createElement('meta');
          node.setAttribute(attr, key);
          document.head.appendChild(node);
        }
        node.content = content;
      };
      setMeta('meta[name="description"]', 'name', 'description', seo.description);
      setMeta('meta[property="og:title"]', 'property', 'og:title', seo.title);
      setMeta('meta[property="og:description"]', 'property', 'og:description', seo.description);
      setMeta('meta[property="og:image"]', 'property', 'og:image', seo.ogImage);
    }
    return () => {
      document.title = previousTitle;
    };
  }, [seo]);

  useEffect(() => {
    if (!menuOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body?.style ? document.body.style.overflow : '';
    if (document.body?.style) document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuBtnRef.current?.focus();
      }
    };
    document.addEventListener?.('keydown', onKeyDown);
    return () => {
      if (document.body?.style) document.body.style.overflow = prevOverflow;
      document.removeEventListener?.('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const scrollToSection = (id: string) => {
    setMenuOpen(false);
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const packages = useMemo(() => services.filter(isPackage), [services]);
  const packagesShown = showPackages && packages.length > 0;
  const packageIdSet = useMemo(
    () => new Set(packages.map((p) => p.id)),
    [packages],
  );
  const coreServices = useMemo(
    () =>
      packagesShown
        ? services.filter((s) => !packageIdSet.has(s.id))
        : services,
    [services, packagesShown, packageIdSet],
  );

  const serviceCategories = useMemo(() => {
    const unique = Array.from(
      new Set(
        coreServices
          .map((s) => (s.category || '').trim())
          .filter(Boolean),
      ),
    );
    return ['All', ...unique];
  }, [coreServices]);

  const activeServiceCategory = serviceCategories.includes(serviceCat)
    ? serviceCat
    : 'All';
  const filteredServices = useMemo(
    () =>
      activeServiceCategory === 'All'
        ? coreServices
        : coreServices.filter((s) => s.category === activeServiceCategory),
    [coreServices, activeServiceCategory],
  );

  const displayArtists = useMemo(() => {
    if (stylists.length > 0) return stylists;
    if (!profile.subdomain) return VOGUE_NOIR_DEFAULT_STYLISTS;
    return [];
  }, [stylists, profile.subdomain]);

  const displayReviews = useMemo(() => {
    const real = (profile.websiteTestimonials || []).filter(
      (r) => !r.isDemo && r.comment?.trim(),
    );
    const mappedReal = real.map((r) => ({
      id: r.id,
      name: r.name,
      tag: r.serviceName || 'Studio Guest',
      rating: r.rating || 5,
      quote: r.comment,
      avatarUrl: r.avatarUrl || VOGUE_NOIR_IMAGES.testimonials.ananya,
      isReal: true,
    }));
    const seen = new Set(mappedReal.map((r) => r.quote.trim().toLowerCase()));
    const combined: Array<{
      id: string;
      name: string;
      tag: string;
      rating: number;
      quote: string;
      avatarUrl: string;
      isReal?: boolean;
    }> = [...mappedReal];
    for (const sample of config.reviews) {
      if (!seen.has(sample.quote.trim().toLowerCase())) {
        combined.push({ ...sample, isReal: false });
      }
    }
    return combined;
  }, [profile.websiteTestimonials, config.reviews]);

  const canBookOnline = bookingAvailable && services.length > 0;
  const triggerBook = (service?: SalonService, artist?: Stylist) => {
    if (canBookOnline) {
      onBook(service, artist);
      return;
    }
    scrollToSection('contact');
  };

  const resolveTierPackageService = (linkedId?: string, tierName?: string): SalonService | undefined => {
    if (linkedId) {
      const exact = services.find((s) => s.id === linkedId);
      if (exact) return exact;
    }
    if (tierName) {
      const lower = tierName.toLowerCase();
      const byName = services.find((s) => s.name.toLowerCase().includes(lower));
      if (byName) return byName;
    }
    return undefined;
  };

  const navItems = useMemo(() => {
    const items: Array<[string, string]> = [
      ['Home', 'home'],
      ['Services', 'services'],
    ];
    if (config.academyEnabled) {
      items.push(['Academy', 'academy']);
    }
    items.push(['Portfolio', 'portfolio']);
    if (displayArtists.length > 0) {
      items.push(['Artists', 'artists']);
    }
    items.push(['Reviews', 'reviews']);
    items.push(['Contact', 'contact']);
    return items;
  }, [config.academyEnabled, displayArtists.length]);

  const ownerContentAvailable: Record<string, boolean> = {
    promo: promotionActive(profile.promoCampaign, promotionNow),
    videos: showcaseVideos(profile).some((video) => Boolean(reelSource(video))),
    loyalty: Boolean(
      shared.loyaltyConfig?.programEnabled &&
        shared.loyaltyConfig.rewards?.some((reward) => reward.isActive),
    ),
    policies: Boolean(
      shared.policies &&
        Object.values(shared.policies).some((val) => String(val || '').trim()),
    ),
    social: false,
    bookings: false,
    share: true,
  };
  const activeOwnerSections = enabledSections.filter(
    (s) => ownerContentAvailable[s] !== false,
  );
  const promoSections = activeOwnerSections.filter((s) => s === 'promo');
  const videoSections = activeOwnerSections.filter((s) => s === 'videos');
  const closingOwnerSections = activeOwnerSections.filter(
    (s) => s !== 'promo' && s !== 'videos',
  );

  const instaUrl = socialUrl('instagram', profile.instagramHandle || '@voguenoir.studio');
  const fbUrl = socialUrl('facebook', profile.facebookPage || '');
  const ytUrl = socialUrl('youtube', profile.youtubeChannel || '');

  return (
    <div className="vn-site" data-template="makeup_studio" style={cssVars}>
      <a className="vn-skip-link" href="#vn-main-content">
        Skip to main content
      </a>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* 1. Sticky Header */}
      <header
        aria-label="Studio navigation and Customer account"
        className={`vn-header${scrolled ? ' is-scrolled' : ''}`}
      >
        <div className="vn-container vn-header-inner">
          <a
            href="#home"
            className="vn-brand"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('home');
            }}
            aria-label={`${brandName} Home`}
          >
            <SafeImage
              src={profile.logoUrl}
              fallback={VOGUE_NOIR_IMAGES.logoSvg}
              alt={`${brandName} logo`}
              width={150}
              height={45}
              loading="eager"
              className="vn-brand-logo"
            />
            {profile.businessName &&
              profile.businessName.trim() !== VOGUE_NOIR_BRAND_NAME && (
                <span className="vn-brand-text">
                  <strong>{brandName}</strong>
                  <small>Makeup Studio &amp; Academy</small>
                </span>
              )}
          </a>

          <nav className="vn-desktop-nav" aria-label="Website navigation">
            {navItems.map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(id);
                }}
              >
                {label}
              </a>
            ))}
            <a
              href={`/?customer=1&return=${encodeURIComponent(profile.subdomain || '')}`}
              onClick={(e) => {
                e.preventDefault();
                onMyBookings();
              }}
            >
              My Bookings
            </a>
          </nav>

          <div className="vn-header-actions">
            <div className="vn-account-group">
              {customerSignedIn ? (
                <button
                  type="button"
                  className="vn-account-link"
                  aria-label="Manage your customer account"
                  onClick={() => onAccount('signin')}
                >
                  {customerPhotoUrl && <img src={customerPhotoUrl} alt="" />}
                  <span>{customerName || 'My profile & settings'}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="vn-account-link"
                    onClick={() => onAccount('signin')}
                  >
                    Customer Login
                  </button>
                  <button
                    type="button"
                    className="vn-account-link"
                    onClick={() => onAccount('signup')}
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              className="vn-btn-gold vn-btn-sm vn-header-cta"
              onClick={() => triggerBook(services[0])}
            >
              Book Now
            </button>

            <button
              ref={menuBtnRef}
              type="button"
              className="vn-menu-btn"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="vn-mobile-drawer"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            className="vn-drawer-backdrop"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            ref={drawerRef}
            id="vn-mobile-drawer"
            className="vn-mobile-drawer"
            aria-label="Mobile navigation"
          >
            <div className="vn-mobile-drawer-head">
              <strong
                style={{
                  fontFamily: 'var(--vn-serif)',
                  fontSize: '1.25rem',
                  color: 'var(--accent-gold)',
                }}
              >
                {brandName}
              </strong>
              <button
                type="button"
                className="vn-menu-btn"
                aria-label="Close navigation menu"
                onClick={() => setMenuOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            {navItems.map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(id);
                }}
              >
                {label}
              </a>
            ))}
            <a
              href={`/?customer=1&return=${encodeURIComponent(profile.subdomain || '')}`}
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                onMyBookings();
              }}
            >
              My Bookings
            </a>
            {customerSignedIn ? (
              <button
                type="button"
                className="vn-mobile-drawer-link"
                onClick={() => {
                  setMenuOpen(false);
                  onAccount('signin');
                }}
              >
                {customerName || 'My Profile & Settings'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="vn-mobile-drawer-link"
                  onClick={() => {
                    setMenuOpen(false);
                    onAccount('signin');
                  }}
                >
                  Customer Login
                </button>
                <button
                  type="button"
                  className="vn-mobile-drawer-link"
                  onClick={() => {
                    setMenuOpen(false);
                    onAccount('signup');
                  }}
                >
                  Sign up
                </button>
              </>
            )}
            <button
              type="button"
              className="vn-btn-gold"
              style={{ marginTop: '0.5rem' }}
              onClick={() => {
                setMenuOpen(false);
                triggerBook(services[0]);
              }}
            >
              Book Now
            </button>
          </nav>
        </>
      )}

      <main id="vn-main-content" tabIndex={-1}>
        {/* 2. Hero Section */}
        <section
          id="home"
          data-layout="hero"
          className="vn-hero"
          aria-labelledby="vn-hero-heading"
        >
          <div className="vn-hero-media">
            <picture>
              <source media="(max-width: 767px)" srcSet={config.heroMobileUrl} />
              <SafeImage
                src={config.heroDesktopUrl}
                fallback={VOGUE_NOIR_IMAGES.heroDesktop}
                alt={`${brandName} luxury bridal makeup editorial portrait`}
                width={1920}
                height={1080}
                loading="eager"
              />
            </picture>
            <div className="vn-hero-overlay" />
          </div>

          <div className="vn-container">
            <div className="vn-hero-content">
              <p className="vn-eyebrow">{brandName}</p>
              <h1 id="vn-hero-heading" className="vn-hero-title">
                {config.heroHeading}
              </h1>
              <p className="vn-hero-sub">{config.heroSubtext}</p>

              <div className="vn-hero-ctas">
                <button
                  type="button"
                  className="vn-btn-gold"
                  onClick={() => triggerBook(services[0])}
                >
                  Book Appointment
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
                {config.academyEnabled ? (
                  <a
                    href="#academy"
                    className="vn-btn-outline"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection('academy');
                    }}
                  >
                    Join Academy
                  </a>
                ) : (
                  <a
                    href="#portfolio"
                    className="vn-btn-outline"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection('portfolio');
                    }}
                  >
                    View Portfolio
                  </a>
                )}
              </div>

              <div className="vn-hero-trust">
                <span>HD &amp; Silicone Airbrush</span>
                <span>·</span>
                <span>100% International Luxury Vanity</span>
                {config.academyEnabled && (
                  <>
                    <span>·</span>
                    <span>Certified Pro Academy</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <AppAnnouncementStrip />

        {/* 3. About Studio + Stats Strip */}
        <section id="about" className="vn-section" aria-labelledby="vn-about-heading">
          <div className="vn-container">
            <div className="vn-about-grid">
              <div className="vn-about-frame">
                <SafeImage
                  src={config.aboutImageUrl}
                  fallback={VOGUE_NOIR_IMAGES.about}
                  alt={`Lead artist applying luxury bridal highlight inside ${brandName}`}
                  width={1000}
                  height={1200}
                />
              </div>

              <div>
                <p className="vn-eyebrow">About The Atelier</p>
                <h2 id="vn-about-heading" className="vn-heading">
                  {config.aboutHeading}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.02rem', margin: '0 0 1.25rem' }}>
                  {config.aboutStory}
                </p>

                <div className="vn-about-pillars">
                  <div className="vn-pillar-card">
                    <strong>Global Luxury Kit</strong>
                    <span>Charlotte Tilbury, Dior, NARS, Huda Beauty &amp; Temptu Pro</span>
                  </div>
                  <div className="vn-pillar-card">
                    <strong>5500K Studio Lighting</strong>
                    <span>Camera-calibrated CRI 98+ vanity mirrors for true skin match</span>
                  </div>
                  <div className="vn-pillar-card">
                    <strong>Strict Brush Sanitation</strong>
                    <span>Single-client disposables &amp; antibacterial brush sterilization</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="vn-stats-strip" aria-label="Studio milestones">
              {config.stats.map((stat) => (
                <div key={stat.id} className="vn-stat-cell">
                  <span className="vn-stat-value">{stat.value}</span>
                  <span className="vn-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {promoSections.length > 0 && (
          <div className="vn-owner-promo">
            <WebsiteSections {...shared} sections={promoSections} />
          </div>
        )}

        {/* 4. Services Grid */}
        <section
          id="services"
          data-layout="services"
          className="vn-section vn-section-alt"
          aria-labelledby="vn-services-heading"
        >
          <div className="vn-container">
            <div className="vn-section-header vn-section-header-split">
              <div>
                <p className="vn-eyebrow">Studio Menu</p>
                <h2 id="vn-services-heading" className="vn-heading">
                  Signature <em>Makeup &amp; Styling</em> Services
                </h2>
              </div>
              <p className="vn-subtext">
                Transparent starting rates in INR with dedicated skin preparation and luxury lashes included.
              </p>
            </div>

            {serviceCategories.length > 1 && (
              <div className="vn-filter-bar" role="tablist" aria-label="Service categories">
                {serviceCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={activeServiceCategory === cat}
                    className={`vn-filter-pill${activeServiceCategory === cat ? ' is-active' : ''}`}
                    onClick={() => setServiceCat(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {filteredServices.length > 0 ? (
              <div className="vn-services-grid">
                {filteredServices.map((service) => (
                  <article key={service.id} className="vn-service-card sf-service-row">
                    <div className="vn-service-media">
                      <ServicePhoto
                        service={service}
                        type={profile.businessType}
                        className="sf-service-image"
                      />
                    </div>
                    <div className="vn-service-body">
                      <div>
                        <p className="vn-service-cat">
                          {service.category || 'Makeup Artistry'}
                        </p>
                        <h3 className="vn-service-title">{service.name}</h3>
                        <p className="vn-service-desc">{service.description}</p>
                        {service.showDuration !== false && service.durationMinutes > 0 && (
                          <span className="vn-duration-chip">
                            <Clock3 size={13} aria-hidden="true" />
                            {service.durationMinutes} min
                          </span>
                        )}
                      </div>
                      <div className="vn-service-footer">
                        <div className="vn-price-stack">
                          <small>Starting from</small>
                          <strong>{formatInr(service.price)}</strong>
                        </div>
                        <button
                          type="button"
                          className="vn-btn-gold vn-btn-sm"
                          onClick={() => triggerBook(service)}
                        >
                          Book
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '2rem',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)',
                  textAlign: 'center',
                }}
              >
                <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)' }}>
                  Custom bridal and editorial service packages are available on consultation.
                </p>
                <button
                  type="button"
                  className="vn-btn-outline vn-btn-sm"
                  onClick={() => scrollToSection('contact')}
                >
                  Contact Studio
                </button>
              </div>
            )}
          </div>
        </section>

        <section id="bridal-looks" className="vn-section" aria-labelledby="vn-regional-heading">
          <div className="vn-container">
            <div className="vn-section-header"><p className="vn-eyebrow">Aapki Shaadi, Aapka Glow</p>
              <h2 id="vn-regional-heading" className="vn-heading">Bridal looks, <em>your way</em></h2>
              <p className="vn-subtext">From the pheras to the reception, explore inspiration for your own traditions. Ask your artist about your look.</p>
            </div>
            <div className="vn-regional-grid">
              {['Punjabi', 'Marwari / Rajasthani', 'Bengali', 'South Indian', 'Gujarati', 'Maharashtrian', 'Muslim Nikah', 'Kashmiri'].map((look) => (
                <a key={look} href="#contact" className="vn-regional-card"><span>{look}</span><span aria-hidden="true">↗</span></a>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Bridal Packages */}
        <section
          id="bridal-packages"
          className="vn-section"
          aria-labelledby="vn-packages-heading"
        >
          <div className="vn-container">
            <div className="vn-section-header vn-section-header-split">
              <div>
                <p className="vn-eyebrow">Curated Bridal Suites</p>
                <h2 id="vn-packages-heading" className="vn-heading">
                  Bespoke <em>Bridal</em> Packages
                </h2>
              </div>
              <p className="vn-subtext">
                Three comprehensive bridal tiers designed around your ceremonies, lighting, and family styling needs.
              </p>
            </div>

            <div className="vn-packages-grid">
              {config.bridalPackages.map((tier) => (
                <article
                  key={tier.id}
                  className={`vn-tier-card${tier.popular ? ' is-popular' : ''}`}
                >
                  {(tier.popular || tier.badgeLabel) && (
                    <span className="vn-tier-badge">
                      {tier.popular ? tier.badgeLabel || 'Most Popular' : tier.badgeLabel}
                    </span>
                  )}
                  <div className="vn-tier-media">
                    <SafeImage
                      src={tier.imageUrl}
                      fallback={VOGUE_NOIR_IMAGES.packages.signature}
                      alt={tier.imageAlt || `${tier.tier} bridal package look`}
                      width={800}
                      height={600}
                    />
                  </div>
                  <div className="vn-tier-body">
                    <div>
                      <h3 className="vn-tier-name">{tier.tier}</h3>
                      <div className="vn-tier-price">{formatInr(resolveTierPackageService(tier.linkedServiceId, tier.tier)?.price ?? tier.price)}</div>
                      <ul className="vn-tier-list">
                        {tier.inclusions.map((inc, idx) => (
                          <li key={idx}>
                            <Check size={16} aria-hidden="true" />
                            <span>{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      className={tier.popular ? 'vn-btn-gold' : 'vn-btn-outline'}
                      onClick={() => {
                        const service = resolveTierPackageService(tier.linkedServiceId, tier.tier);
                        if (service) triggerBook(service);
                        else scrollToSection('contact');
                      }}
                    >
                      {resolveTierPackageService(tier.linkedServiceId, tier.tier) ? 'Book Package' : 'Enquire about this package'}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {packagesShown && (
              <div
                id="salon-packages"
                className="vn-catalogue-packages"
                aria-labelledby="vn-all-packages-heading"
              >
                <div style={{ marginBottom: '1.75rem' }}>
                  <p className="vn-eyebrow">Complete Package Catalogue</p>
                  <h3
                    id="vn-all-packages-heading"
                    style={{
                      fontFamily: 'var(--vn-serif)',
                      fontSize: 'clamp(1.55rem, 2.5vw, 2.1rem)',
                      margin: 0,
                      color: 'var(--text-primary)',
                    }}
                  >
                    Bridal Suites &amp; Multi-Look Studio Combos
                  </h3>
                </div>
                <div className="vn-services-grid">
                  {packages.map((pkg) => (
                    <article key={pkg.id} className="sf-service-card vn-service-card sf-service-row">
                      <div className="vn-service-media">
                        <ServicePhoto
                          service={pkg}
                          type={profile.businessType}
                          className="sf-service-image"
                        />
                      </div>
                      <div className="vn-service-body">
                        <div>
                          <p className="vn-service-cat">{pkg.category || 'Package'}</p>
                          <h4 className="vn-service-title">{pkg.name}</h4>
                          <p className="vn-service-desc">{pkg.description}</p>
                          {pkg.showDuration !== false && pkg.durationMinutes > 0 && (
                            <span className="vn-duration-chip">
                              <Clock3 size={13} aria-hidden="true" />
                              {pkg.durationMinutes} min
                            </span>
                          )}
                        </div>
                        <div className="vn-service-footer">
                          <div className="vn-price-stack">
                            <small>Package Rate</small>
                            <strong>{formatInr(pkg.price)}</strong>
                          </div>
                          <button
                            type="button"
                            className="vn-btn-gold vn-btn-sm"
                            onClick={() => triggerBook(pkg)}
                          >
                            Book Package
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 6. Makeup Academy Section (Optional ON/OFF Module) */}
        {config.academyEnabled && (
          <AcademySection
            config={config}
            slug={profile.subdomain || ''}
            customerSignedIn={customerSignedIn}
            customerName={customerName}
            onAccount={onAccount}
            readOnly={readOnly}
          />
        )}

        {/* 7. Portfolio / Lookbook Gallery + Before/After Sliders */}
        <PortfolioSection
          config={config}
          ownerGalleryPhotos={galleryPhotos}
        />

        {videoSections.length > 0 && (
          <div className="vn-owner-videos">
            <WebsiteSections {...shared} sections={videoSections} />
          </div>
        )}

        {/* 8. Artists / Team */}
        {displayArtists.length > 0 && (
          <section
            id="artists"
            data-layout="team"
            className="vn-section"
            aria-labelledby="vn-artists-heading"
          >
            <div className="vn-container">
              <div className="vn-section-header vn-section-header-split">
                <div>
                  <p className="vn-eyebrow">Creative Team</p>
                  <h2 id="vn-artists-heading" className="vn-heading">
                    Meet Our <em>Artists &amp; Educators</em>
                  </h2>
                </div>
                <p className="vn-subtext">
                  Experienced bridal makeup leads, hair architects, and certified academy mentors.
                </p>
              </div>

              <div className="vn-artists-grid">
                {displayArtists.map((artist) => (
                  <article key={artist.id} className="vn-artist-card">
                    <div className="vn-artist-photo">
                      <SafeImage
                        src={artist.avatarUrl}
                        fallback={VOGUE_NOIR_IMAGES.artists.riya}
                        alt={`${artist.name}, ${artist.role || 'Makeup Artist'}`}
                        width={600}
                        height={750}
                      />
                    </div>
                    <div className="vn-artist-body">
                      <div>
                        <small
                          style={{
                            display: 'block',
                            color: 'var(--accent-gold)',
                            fontSize: '0.7rem',
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            marginBottom: '0.25rem',
                          }}
                        >
                          {artist.role || 'Makeup Specialist'}
                          {Number(artist.experienceYears) > 0
                            ? ` · ${artist.experienceYears}+ yrs exp`
                            : ''}
                        </small>
                        <h3
                          style={{
                            fontFamily: 'var(--vn-serif)',
                            fontSize: '1.5rem',
                            margin: '0 0 0.35rem',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {artist.name}
                        </h3>
                        {artist.bio && (
                          <p
                            style={{
                              margin: 0,
                              fontSize: '0.84rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {artist.bio}
                          </p>
                        )}
                        {artist.specialties?.length > 0 && (
                          <div className="vn-specialty-chips">
                            {artist.specialties.slice(0, 4).map((sp) => (
                              <span key={sp} className="vn-specialty-chip">
                                {sp}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="vn-btn-outline vn-btn-sm"
                          onClick={() => onViewSpecialist(artist.id)}
                        >
                          View profile &amp; reviews
                        </button>
                        <button
                          type="button"
                          className="vn-btn-gold vn-btn-sm"
                          onClick={() => triggerBook(undefined, artist)}
                        >
                          Book {artist.name.split(' ')[0]}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 9. Testimonials */}
        <section
          id="reviews"
          data-layout="experiences"
          className="vn-section vn-section-alt"
          aria-labelledby="vn-reviews-heading"
        >
          <div className="vn-container">
            <div className="vn-section-header vn-section-header-split">
              <div>
                <p className="vn-eyebrow">Brides &amp; Graduates</p>
                <h2 id="vn-reviews-heading" className="vn-heading">
                  Client &amp; Student <em>Love</em>
                </h2>
              </div>
              <p className="vn-subtext">
                Words from brides who walked down the aisle and students who launched thriving makeup careers.
              </p>
            </div>

            <div className="vn-reviews-grid">
              {displayReviews.map((review) => (
                <article key={review.id} className="vn-review-card">
                  <div>
                    <div
                      className="vn-stars"
                      aria-label={`${review.rating} out of 5 stars`}
                    >
                      {Array.from({ length: review.rating }).map((_, idx) => (
                        <Star
                          key={idx}
                          size={15}
                          fill="currentColor"
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    {!review.isReal && !profile.vogueNoir?.reviews?.length && <small>Sample testimonial</small>}
                    <blockquote className="vn-review-quote" style={{ marginTop: '0.9rem' }}>
                      “{review.quote}”
                    </blockquote>
                  </div>

                  <div className="vn-review-author">
                    <SafeImage
                      src={review.avatarUrl}
                      fallback={VOGUE_NOIR_IMAGES.testimonials.ananya}
                      alt={review.name}
                      width={200}
                      height={200}
                    />
                    <div>
                      <strong style={{ display: 'block', color: 'var(--text-primary)' }}>
                        {review.name}
                      </strong>
                      <small
                        style={{
                          color: 'var(--accent-gold)',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontSize: '0.7rem',
                        }}
                      >
                        {review.tag}
                      </small>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 10. FAQ Accordion */}
        <section id="faq" className="vn-section" aria-labelledby="vn-faq-heading">
          <div className="vn-container">
            <div className="vn-section-header" style={{ textAlign: 'center', alignItems: 'center' }}>
              <p className="vn-eyebrow">Everything You Need To Know</p>
              <h2 id="vn-faq-heading" className="vn-heading">
                Frequently Asked <em>Questions</em>
              </h2>
            </div>

            <div className="vn-faq-list">
              {config.faqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                const answerId = `vn-faq-ans-${faq.id}`;
                return (
                  <div
                    key={faq.id}
                    className={`vn-faq-item${isOpen ? ' is-open' : ''}`}
                  >
                    <button
                      type="button"
                      className="vn-faq-trigger"
                      aria-expanded={isOpen}
                      aria-controls={answerId}
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp size={18} color="var(--accent-gold)" aria-hidden="true" />
                      ) : (
                        <ChevronDown size={18} color="var(--accent-gold)" aria-hidden="true" />
                      )}
                    </button>
                    {isOpen && (
                      <div id={answerId} className="vn-faq-answer">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 11. Booking CTA / Concierge Section */}
        <section
          id="booking"
          className="vn-section vn-section-alt"
          aria-labelledby="vn-booking-heading"
        >
          <div className="vn-container">
            <div className="vn-booking-panel">
              <div className="vn-section-header vn-section-header-split" style={{ marginBottom: '1.75rem' }}>
                <div>
                  <p className="vn-eyebrow">Online Reservation</p>
                  <h2 id="vn-booking-heading" className="vn-heading" style={{ marginBottom: '0.4rem' }}>
                    Reserve Your <em>Chair or Bridal Date</em>
                  </h2>
                  <p className="vn-subtext">
                    Select your preferred makeup service and artist below to open live slot availability.
                  </p>
                </div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--highlight-blush)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  <Sparkles size={14} style={{ display: 'inline', marginRight: 5 }} aria-hidden="true" />
                  Instant Confirmation · 25% Date Retainer
                </span>
              </div>

              <div className="vn-form-grid vn-form-grid-2" style={{ alignItems: 'end' }}>
                <div className="vn-field">
                  <label htmlFor="vn-book-service">Choose Service or Bridal Package</label>
                  <select
                    id="vn-book-service"
                    value={conciergeServiceId}
                    onChange={(e) => setConciergeServiceId(e.target.value)}
                  >
                    {services.length === 0 && (
                      <option value="">Studio Consultation</option>
                    )}
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {formatInr(s.price)}
                        {s.showDuration !== false && s.durationMinutes > 0
                          ? ` (${s.durationMinutes} min)`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="vn-field">
                  <label htmlFor="vn-book-artist">Preferred Artist (Optional)</label>
                  <select
                    id="vn-book-artist"
                    value={conciergeStylistId}
                    onChange={(e) => setConciergeStylistId(e.target.value)}
                  >
                    <option value="">Any Available Senior Artist</option>
                    {displayArtists.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                <button
                  type="button"
                  className="vn-btn-gold"
                  onClick={() => {
                    const chosenSvc =
                      services.find((s) => s.id === conciergeServiceId) || services[0];
                    const chosenArt = displayArtists.find(
                      (a) => a.id === conciergeStylistId,
                    );
                    triggerBook(chosenSvc, chosenArt);
                  }}
                >
                  <Calendar size={16} aria-hidden="true" />
                  Proceed to Date &amp; Time Slot
                </button>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vn-btn-outline"
                >
                  <MessageCircle size={16} aria-hidden="true" />
                  Bridal Consultation on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 12. Location & Contact */}
        <section
          id="contact"
          data-layout="location"
          className="vn-section"
          aria-labelledby="vn-contact-heading"
        >
          <div className="vn-container">
            <div className="vn-section-header vn-section-header-split">
              <div>
                <p className="vn-eyebrow">Visit The Studio</p>
                <h2 id="vn-contact-heading" className="vn-heading">
                  Location, Hours &amp; <em>Direct Contact</em>
                </h2>
              </div>
              <p className="vn-subtext">
                Private bridal trial consultations and academy campus tours welcome during studio hours.
              </p>
            </div>

            <div className="vn-contact-grid">
              <div className="vn-contact-card">
                <div className="vn-contact-item">
                  <MapPin size={20} aria-hidden="true" />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--accent-gold)', fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      Studio Address
                    </strong>
                    <span>{addressDisplay}</span>
                  </div>
                </div>

                <div className="vn-contact-item">
                  <Phone size={20} aria-hidden="true" />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--accent-gold)', fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      Phone &amp; WhatsApp
                    </strong>
                    <a href={`tel:${phoneDisplay.replace(/\s+/g, '')}`}>{phoneDisplay}</a>
                  </div>
                </div>

                <div className="vn-contact-item">
                  <Mail size={20} aria-hidden="true" />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--accent-gold)', fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      Email
                    </strong>
                    <a href={`mailto:${config.publicEmail}`}>{config.publicEmail}</a>
                  </div>
                </div>

                <div className="vn-contact-item">
                  <Clock3 size={20} aria-hidden="true" />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--accent-gold)', fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      Working Hours
                    </strong>
                    <span>{config.workingHoursDisplay}</span>
                  </div>
                </div>

                <div style={{ paddingTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <a
                    href={mapsQueryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vn-btn-outline vn-btn-sm"
                  >
                    Open in Google Maps <ExternalLink size={14} aria-hidden="true" />
                  </a>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vn-btn-gold vn-btn-sm"
                  >
                    WhatsApp Studio
                  </a>
                </div>
              </div>

              <div className="vn-map-frame">
                {config.mapEmbedUrl && /^https:\/\/(www\.)?google\.[a-z.]+\/maps/i.test(config.mapEmbedUrl) ? (
                  <iframe
                    src={config.mapEmbedUrl}
                    title={`${brandName} Studio Location Map`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      textAlign: 'center',
                      padding: '2.5rem',
                      background:
                        'radial-gradient(circle at center, rgba(201,169,110,0.14) 0%, rgba(11,11,12,0.96) 75%)',
                    }}
                  >
                    <MapPin size={36} color="var(--accent-gold)" aria-hidden="true" />
                    <h3
                      style={{
                        fontFamily: 'var(--vn-serif)',
                        fontSize: '1.65rem',
                        margin: '0.85rem 0 0.4rem',
                      }}
                    >
                      {brandName}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: 420, margin: '0 0 1.25rem' }}>
                      {addressDisplay}
                    </p>
                    <a
                      href={mapsQueryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vn-btn-outline vn-btn-sm"
                    >
                      Get Directions on Google Maps <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {closingOwnerSections.length > 0 && (
          <div className="vn-owner-closing">
            <WebsiteSections {...shared} sections={closingOwnerSections} />
          </div>
        )}

        <CustomerAppPromotion />
      </main>

      {/* Floating WhatsApp CTA */}
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="vn-whatsapp-float"
        aria-label={`Chat with ${brandName} on WhatsApp`}
      >
        <MessageCircle size={17} aria-hidden="true" />
        <span>WhatsApp</span>
      </a>

      <a href={`tel:${phoneDisplay.replace(/\s+/g, '')}`} className="vn-call-float" aria-label={`Call ${brandName}`}>
        <Phone size={17} aria-hidden="true" /> Call Now
      </a>

      {/* 13. Footer */}
      <footer data-layout="footer" className="vn-footer">
        <div className="vn-container">
          <div className="vn-footer-grid">
            <div>
              <SafeImage
                src={profile.logoUrl}
                fallback={VOGUE_NOIR_IMAGES.logoSvg}
                alt={`${brandName} logo`}
                width={170}
                height={51}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.9rem', maxWidth: 400 }}>
                {config.heroSubtext}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.5rem 0 0' }}>
                {config.workingHoursDisplay}
              </p>
            </div>

            <div>
              <strong
                style={{
                  display: 'block',
                  color: 'var(--accent-gold)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  marginBottom: '0.9rem',
                }}
              >
                Quick Links
              </strong>
              <ul className="vn-footer-links">
                {navItems.map(([label, id]) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(id);
                      }}
                    >
                      {label}
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href="#bridal-packages"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection('bridal-packages');
                    }}
                  >
                    Bridal Packages
                  </a>
                </li>
                <li>
                  <a
                    href="#faq"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection('faq');
                    }}
                  >
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {profile.websiteSections?.social !== false && (
              <div>
                <strong
                  style={{
                    display: 'block',
                    color: 'var(--accent-gold)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    marginBottom: '0.9rem',
                  }}
                >
                  {profile.sectionHeadings?.socialTitle || 'Connect'}
                </strong>
                <div className="vn-social-row">
                  {instaUrl && (
                    <a
                      href={instaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vn-social-pill"
                    >
                      Instagram
                    </a>
                  )}
                  {fbUrl && (
                    <a
                      href={fbUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vn-social-pill"
                    >
                      Facebook
                    </a>
                  )}
                  {ytUrl && (
                    <a
                      href={ytUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vn-social-pill"
                    >
                      YouTube
                    </a>
                  )}
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vn-social-pill"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            )}
          </div>

          {(config.gstPricing || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(config.gstin) || /^[0-9]{6}$/.test(config.sacCode)) && (
            <p style={{ paddingTop: '1rem', color: 'var(--text-muted)', fontSize: '.78rem' }}>
              {config.gstPricing && <span>Prices {config.gstPricing} of GST. </span>}
              {/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(config.gstin) && <span>GSTIN: {config.gstin}. </span>}
              {/^[0-9]{6}$/.test(config.sacCode) && <span>SAC: {config.sacCode}.</span>}
            </p>
          )}

          <div
            style={{
              paddingTop: '1.5rem',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: '0.75rem',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              © {new Date().getFullYear()} {brandName}. All rights reserved.
            </span>
            <span>Bridal Makeup Studio &amp; Certified Pro Makeup Academy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
