import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Quote,
  Scissors,
  Sparkles,
  Star,
  X,
  Youtube,
} from 'lucide-react';
import type { SalonProfile, SalonService, Stylist } from '../types';
import type { SalonGalleryPhoto } from '../lib/photoGallery';
import type { Testimonial } from '../templateData';
import { isPackage } from '../lib/packageCatalogue';
import { promotionActive, usePromotionClock } from '../lib/promotionStatus';
import { clientExperiences } from '../lib/demoWebsiteContent';
import { showcaseVideos } from '../lib/showcaseVideos';
import { reelSource } from '../lib/socialVideoSource';
import { socialUrl, websiteSections } from '../lib/websiteContent';
import {
  LUXURY_EDITORIAL_ABOUT,
  LUXURY_EDITORIAL_ABOUT_COPY,
  LUXURY_EDITORIAL_BOOKING_COPY,
  LUXURY_EDITORIAL_HERO,
  LUXURY_EDITORIAL_IMAGES,
  editorialReviewSummary,
  editorialSrcSet,
  formatEditorialPrice,
  isLuxuryEditorialAsset,
  luxuryEditorialAddress,
  luxuryEditorialBrand,
  luxuryEditorialCity,
  luxuryEditorialCssVariables,
  luxuryEditorialHours,
  luxuryEditorialMapsUrl,
  luxuryEditorialServiceImage,
  luxuryEditorialTeamImage,
  luxuryEditorialWhatsApp,
} from '../lib/luxuryEditorial';
import { WebsiteSections } from './WebsiteSections';
import { AppAnnouncementStrip, AppInstallSection } from './AppInstallSection';
import { CustomerReviewPanel } from './CustomerReviewPanel';
import { ExternalReviewFeed } from './ExternalReviewFeed';
import { FloatingPromoBanner } from './FloatingPromoBanner';
import { WebsiteLanguageSwitcher, useWebsiteLanguage } from './WebsiteLanguage';
import './luxuryEditorial.css';

type Branding = { platformName: string; poweredBy: boolean; supportEmail: string } | undefined;

export function LuxuryEditorialWebsite({
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
  branding,
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
  branding?: Branding;
  onBook: (service?: SalonService, specialist?: Stylist) => void;
  onAccount: (mode?: 'signin' | 'signup') => void;
  onMyBookings: () => void;
  onViewSpecialist: (id: string) => void;
}) {
  const { t } = useWebsiteLanguage();
  const IMAGES = LUXURY_EDITORIAL_IMAGES;
  const visible = websiteSections(profile);
  const promotionNow = usePromotionClock();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('salon-home');
  const [serviceCategory, setServiceCategory] = useState('All');
  const [galleryCategory, setGalleryCategory] = useState('All');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [brokenHero, setBrokenHero] = useState(false);
  const [brokenGallery, setBrokenGallery] = useState<string[]>([]);
  const [brokenTeam, setBrokenTeam] = useState<string[]>([]);
  const [brokenTeamArt, setBrokenTeamArt] = useState<string[]>([]);
  const [brokenServices, setBrokenServices] = useState<string[]>([]);
  const [brokenAbout, setBrokenAbout] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const brandName = luxuryEditorialBrand(profile);
  const city = luxuryEditorialCity(profile);
  const address = luxuryEditorialAddress(profile);
  const mapsUrl = luxuryEditorialMapsUrl(profile);
  const whatsappUrl = luxuryEditorialWhatsApp(profile);
  const phone = String(profile.phone || '').trim();
  const email = String(profile.email || '').trim();
  const hours = luxuryEditorialHours(profile);
  const monogram = (brandName.match(/[A-Za-z0-9]/)?.[0] || 'A').toUpperCase();
  const cssVars = useMemo(() => luxuryEditorialCssVariables(profile) as React.CSSProperties, [profile.customAccentColor]);

  const canBook = bookingAvailable !== false && services.length > 0;
  const bookingTarget = visible.bookings && canBook;

  const packages = useMemo(() => services.filter(isPackage), [services]);
  const packagesShown = Boolean(showPackages && packages.length > 0);
  const coreServices = useMemo(
    () => (packagesShown ? services.filter((service) => !isPackage(service)) : services),
    [services, packagesShown],
  );
  const serviceCategories = useMemo(
    () => Array.from(new Set(coreServices.map((service) => (service.category || '').trim()).filter(Boolean))),
    [coreServices],
  );
  const activeServiceCategory = serviceCategories.includes(serviceCategory) ? serviceCategory : 'All';
  const filteredServices = useMemo(
    () =>
      activeServiceCategory === 'All'
        ? coreServices
        : coreServices.filter((service) => (service.category || '').trim() === activeServiceCategory),
    [coreServices, activeServiceCategory],
  );
  const featuredService = filteredServices[0];
  const gridServices = filteredServices.slice(1);
  const team = stylists.filter((staff) => staff.status !== 'Inactive');

  const curatedReviews = useMemo(
    () =>
      clientExperiences(profile)
        .filter((review) => String(review.comment || '').trim().length > 0)
        .filter((review, index, all) => {
          const key = String(review.comment).trim().toLowerCase();
          return all.findIndex((item) => String(item.comment).trim().toLowerCase() === key) === index;
        }),
    [profile],
  );
  const realReviews = curatedReviews.filter((review) => !review.isDemo);
  // Demo stories are shown only inside the unbranded template preview — never on
  // a live/published salon site, where reviews must be genuine customer stories.
  const displayReviews = realReviews.length ? realReviews : profile.subdomain ? [] : curatedReviews;
  const review = displayReviews[Math.min(reviewIndex, Math.max(0, displayReviews.length - 1))];
  const reviewSummary = editorialReviewSummary(curatedReviews as Testimonial[]);

  const galleryEntries = useMemo(
    () => galleryPhotos.filter((photo) => Boolean(photo?.url?.trim()) && !brokenGallery.includes(photo.id)),
    [galleryPhotos, brokenGallery],
  );
  const galleryCategories = useMemo(
    () => Array.from(new Set(galleryEntries.map((photo) => photo.category))),
    [galleryEntries],
  );
  const activeGalleryCategory = galleryCategories.includes(galleryCategory as never) ? galleryCategory : 'All';
  const filteredGallery = galleryEntries.filter(
    (photo) => activeGalleryCategory === 'All' || photo.category === activeGalleryCategory,
  );

  const heroImage = useMemo(() => {
    const coverIsOwn = Boolean(profile.coverImageUrl && !isLuxuryEditorialAsset(profile.coverImageUrl));
    if (coverIsOwn && !brokenHero) {
      return { src: profile.coverImageUrl, srcSet: undefined, alt: `${brandName} signature studio portrait` };
    }
    return { src: IMAGES.hero.src, srcSet: IMAGES.hero.srcSet, alt: IMAGES.hero.alt };
  }, [profile.coverImageUrl, brokenHero, brandName]);

  const aboutOffset = useMemo(() => {
    const owner = String(profile.ownerPhotoUrl || '').trim();
    const customOwner = owner && !isLuxuryEditorialAsset(owner) && !brokenAbout;
    if (customOwner) return { src: owner, srcSet: undefined, alt: `${profile.ownerName || 'Salon founder'} at the atelier` };
    return { src: IMAGES.aboutDetail.src, srcSet: IMAGES.aboutDetail.srcSet, alt: IMAGES.aboutDetail.alt };
  }, [profile.ownerPhotoUrl, profile.ownerName, brokenAbout]);

  const scrollToSection = useCallback((id: string) => {
    setMenuOpen(false);
    if (typeof document === 'undefined') return;
    const target = rootRef.current?.ownerDocument?.getElementById(id) || document.getElementById(id);
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, []);

  const book = useCallback(
    (service?: SalonService, specialist?: Stylist) => {
      setMenuOpen(false);
      if (canBook) {
        onBook(service, specialist);
        return;
      }
      scrollToSection(visible.location ? 'salon-location' : 'salon-footer');
    },
    [canBook, onBook, scrollToSection, visible.location],
  );

  const navItems = useMemo(() => {
    const items: Array<{ id: string; label: string; target: string }> = [
      { id: 'home', label: 'Home', target: 'salon-home' },
    ];
    if (visible.about) items.push({ id: 'about', label: 'About', target: 'salon-about' });
    if (visible.services && coreServices.length > 0) items.push({ id: 'services', label: 'Services', target: 'services-section' });
    if (visible.stylists && team.length > 0) items.push({ id: 'team', label: 'Team', target: 'salon-team' });
    if (visible.gallery && galleryEntries.length > 0) items.push({ id: 'gallery', label: 'Gallery', target: 'salon-lookbook' });
    if (visible.location) items.push({ id: 'contact', label: 'Contact', target: 'salon-location' });
    else items.push({ id: 'contact', label: 'Contact', target: 'salon-footer' });
    return items;
  }, [visible, coreServices.length, team.length, galleryEntries.length]);

  const servicesTarget =
    visible.services && coreServices.length > 0 ? 'services-section' : visible.gallery ? 'salon-lookbook' : visible.about ? 'salon-about' : 'salon-home';

  const ownerExtras = useMemo(() => {
    const active: Record<string, boolean> = {
      promo: Boolean(visible.promo && promotionActive(profile.promoCampaign, promotionNow)),
      videos: Boolean(visible.videos && showcaseVideos(profile).some((video) => Boolean(reelSource(video)))),
      loyalty: Boolean(
        visible.loyalty &&
          shared.loyaltyConfig?.programEnabled &&
          shared.loyaltyConfig.rewards?.some((reward) => reward.isActive),
      ),
      policies: Boolean(visible.policies && shared.policies && Object.values(shared.policies).some((text) => String(text || '').trim())),
      social: Boolean(
        visible.social &&
          (socialUrl(profile.instagramHandle, 'instagram') ||
            socialUrl(profile.facebookPage, 'facebook') ||
            socialUrl(profile.youtubeChannel, 'youtube') ||
            socialUrl(profile.tiktokProfile, 'tiktok')),
      ),
      share: Boolean(visible.share),
    };
    return enabledSections.filter((section) => active[section]);
  }, [enabledSections, profile, promotionNow, shared, visible]);

  const socialLinks = useMemo(
    () =>
      [
        { label: 'Instagram', url: socialUrl(profile.instagramHandle, 'instagram'), Icon: Instagram },
        { label: 'Facebook', url: socialUrl(profile.facebookPage, 'facebook'), Icon: Facebook },
        { label: 'YouTube', url: socialUrl(profile.youtubeChannel, 'youtube'), Icon: Youtube },
      ].filter((item) => Boolean(item.url)),
    [profile.instagramHandle, profile.facebookPage, profile.youtubeChannel],
  );

  useEffect(() => {
    const onScroll = () => setScrolled((window.scrollY || 0) > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The direct template-preview route renders a sticky toolbar above the site.
  // Keep the fixed header below it so the two never paint over each other.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const doc = root.ownerDocument;
    const toolbar = doc.querySelector<HTMLElement>('[data-template-preview-toolbar]');
    if (!toolbar) return;
    root.classList.add('has-preview-toolbar');
    const syncOffset = () => {
      root.style.setProperty('--le-toolbar-offset', `${Math.round(toolbar.getBoundingClientRect().height)}px`);
    };
    syncOffset();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(syncOffset);
    observer?.observe(toolbar);
    window.addEventListener('resize', syncOffset);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', syncOffset);
      root.classList.remove('has-preview-toolbar');
      root.style.removeProperty('--le-toolbar-offset');
    };
  }, []);

  useEffect(() => {
    const doc = rootRef.current?.ownerDocument || (typeof document === 'undefined' ? null : document);
    if (!doc || !menuOpen) return;
    const previousOverflow = doc.body.style.overflow;
    doc.body.style.overflow = 'hidden';
    const first = drawerRef.current?.querySelector<HTMLElement>('button, a, select');
    first?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus({ preventScroll: true });
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select:not([disabled]), input:not([disabled])'),
      );
      const firstNode = focusable[0];
      const lastNode = focusable[focusable.length - 1];
      if (event.shiftKey && doc.activeElement === firstNode) {
        event.preventDefault();
        lastNode?.focus();
      } else if (!event.shiftKey && doc.activeElement === lastNode) {
        event.preventDefault();
        firstNode?.focus();
      }
    };
    doc.addEventListener('keydown', onKey);
    return () => {
      doc.body.style.overflow = previousOverflow;
      doc.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (lightbox === null) return;
    const doc = rootRef.current?.ownerDocument || (typeof document === 'undefined' ? null : document);
    if (!doc) return;
    const previousOverflow = doc.body.style.overflow;
    doc.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null);
      if (event.key === 'ArrowRight') setLightbox((index) => (index === null ? null : (index + 1) % Math.max(1, filteredGallery.length)));
      if (event.key === 'ArrowLeft') {
        setLightbox((index) => (index === null ? null : (index - 1 + Math.max(1, filteredGallery.length)) % Math.max(1, filteredGallery.length)));
      }
    };
    doc.addEventListener('keydown', onKey);
    return () => {
      doc.body.style.overflow = previousOverflow;
      doc.removeEventListener('keydown', onKey);
    };
  }, [lightbox, filteredGallery.length]);

  useEffect(() => {
    const doc = rootRef.current?.ownerDocument || (typeof document === 'undefined' ? null : document);
    const view = doc?.defaultView;
    const Observer = view?.IntersectionObserver;
    const nodes = rootRef.current?.querySelectorAll<HTMLElement>('[data-le-reveal]');
    if (!nodes?.length) return;
    rootRef.current?.classList.add('is-enhanced');
    if (!Observer || view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach((node) => node.classList.add('is-revealed'));
      return;
    }
    const observer = new Observer(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const doc = rootRef.current?.ownerDocument || (typeof document === 'undefined' ? null : document);
    const view = doc?.defaultView;
    const Observer = view?.IntersectionObserver;
    if (!Observer) return;
    const ids = ['salon-home', 'salon-about', 'services-section', 'salon-team', 'salon-lookbook', 'salon-testimonials', 'salon-bookings', 'salon-location'];
    const sections = ids.map((id) => doc?.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!sections.length) return;
    const observer = new Observer(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visibleEntry) setActiveSection(visibleEntry.target.id);
      },
      { rootMargin: '-18% 0px -55% 0px', threshold: [0, 0.15, 0.4] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [profile.businessType]);

  useEffect(() => {
    setReviewIndex(0);
  }, [profile.businessType]);

  useEffect(() => {
    setLightbox(null);
  }, [activeGalleryCategory]);

  const servicePhoto = (service: SalonService) => {
    const custom = String(service.imageUrl || '').trim();
    if (custom && !brokenServices.includes(service.id)) {
      return { src: custom, srcSet: editorialSrcSet(custom), alt: service.name };
    }
    const primary = luxuryEditorialServiceImage(service);
    return { src: primary, srcSet: editorialSrcSet(primary), alt: `${service.name} at ${brandName}` };
  };

  const galleryPhoto = (photo: SalonGalleryPhoto) => ({
    src: photo.url,
    srcSet: editorialSrcSet(photo.url),
    alt: `${photo.title || photo.category} — ${brandName}`,
  });

  const teamPhoto = (staff: Stylist, index: number) => {
    const custom = String(staff.avatarUrl || '').trim();
    if (custom && !brokenTeam.includes(staff.id)) {
      return { src: custom, srcSet: editorialSrcSet(custom), alt: `${staff.name}, ${staff.role || 'salon specialist'}` };
    }
    const fallback = luxuryEditorialTeamImage(staff, index);
    return { src: fallback.src, srcSet: fallback.srcSet, alt: fallback.alt };
  };

  const currentIndex = displayReviews.length ? Math.min(reviewIndex, displayReviews.length - 1) : 0;
  const policyLinks = visible.policies && shared.policies
    ? Object.keys(shared.policies).filter((key) => String(shared.policies?.[key] || '').trim())
    : [];
  const footerVisible = (profile.websiteSections as Record<string, boolean> | undefined)?.footer !== false;

  // Starter packages are seeded with a long internal template prefix and a
  // generic "starter package" sentence. Strip both for a quiet editorial menu;
  // owner-authored package names and descriptions pass through untouched.
  const cleanPackageName = (name: string) =>
    String(name || '')
      .replace(/^\s*Luxury Editorial Salon(?:\s*\(01\))?\s*/i, '')
      .replace(/\s+Package\s*$/i, '')
      .trim() || String(name || '');
  const cleanPackageDescription = (description?: string) =>
    String(description || '')
      .replace(/\s*A coordinated [^.]+ visit\.\s*Starter package:.*$/i, '')
      .trim();

  const heroStats = [
    profile.foundingYear ? { label: 'Est.', value: profile.foundingYear } : null,
    services.length ? { label: 'Treatments', value: String(services.length) } : null,
    team.length ? { label: 'Specialists', value: String(team.length) } : null,
    city ? { label: 'Atelier', value: city } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="le-site" data-template="hair_salon" data-design="luxury-editorial" ref={rootRef} style={cssVars}>
      <a className="le-skip" href="#le-main">Skip to main content</a>

      <header className={`le-header${scrolled ? ' is-scrolled' : ''}`} aria-label="Salon navigation">
        <div className="le-container le-header-row">
          <a
            className="le-brand"
            href="#salon-home"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection('salon-home');
            }}
            aria-label={`${brandName} — home`}
          >
            {profile.logoUrl ? (
              <img className="le-brand-logo" src={profile.logoUrl} alt={`${brandName} logo`} width={44} height={44} />
            ) : (
              <span className="le-monogram" aria-hidden="true">
                {monogram}
              </span>
            )}
            <span className="le-brand-copy">
              <strong>{brandName}</strong>
              <small>Hair Atelier · {city}</small>
            </span>
          </a>

          <nav className="le-nav" aria-label="Website navigation">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.target}`}
                aria-current={activeSection === item.target ? 'location' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection(item.target);
                }}
              >
                {t(item.label)}
              </a>
            ))}
          </nav>

          <div className="le-header-actions">
            <nav className="le-account-nav" aria-label="Customer account">
              {customerSignedIn ? (
                <button
                  type="button"
                  className="le-account"
                  onClick={() => onAccount('signin')}
                  aria-label="Manage your customer account"
                >
                  {customerPhotoUrl ? (
                    <img src={customerPhotoUrl} alt="" width={27} height={27} />
                  ) : (
                    <span aria-hidden="true">{String(customerName || 'A').slice(0, 1).toUpperCase()}</span>
                  )}
                  <em>{customerName || 'My account'}</em>
                </button>
              ) : (
                <>
                  <button type="button" className="le-text-action" onClick={() => onAccount('signin')}>
                    {t('Customer Login')}
                  </button>
                  <button type="button" className="le-text-action" onClick={() => onAccount('signup')}>
                    {t('Sign up')}
                  </button>
                </>
              )}
              <button type="button" className="le-text-action" onClick={onMyBookings}>
                My Bookings
              </button>
            </nav>
            <button
              type="button"
              className="le-btn le-btn-outline le-header-cta"
              onClick={() => book()}
              aria-label={t('Book Appointment')}
            >
              <CalendarCheck size={15} aria-hidden="true" />
              <span>{t('Book Appointment')}</span>
            </button>
            <button
              ref={menuButtonRef}
              type="button"
              className="le-menu-button"
              aria-label="Open website menu"
              aria-expanded={menuOpen}
              aria-controls="le-mobile-menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="le-menu-backdrop" onClick={(event) => event.currentTarget === event.target && setMenuOpen(false)}>
          <div className="le-menu-drawer" id="le-mobile-menu" role="dialog" aria-modal="true" aria-label="Website menu" ref={drawerRef}>
            <div className="le-menu-head">
              <div>
                <strong>{brandName}</strong>
                <small>Hair Atelier · {city}</small>
              </div>
              <button type="button" aria-label="Close website menu" onClick={() => setMenuOpen(false)}>
                <X size={22} />
              </button>
            </div>
            <nav className="le-menu-nav" aria-label="Mobile website navigation">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.target}`}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection(item.target);
                  }}
                >
                  <span>{t(item.label)}</span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              ))}
            </nav>
            <div className="le-menu-utility">
              <WebsiteLanguageSwitcher />
              {customerSignedIn ? (
                <button type="button" onClick={() => { setMenuOpen(false); onAccount('signin'); }}>
                  My profile &amp; settings
                </button>
              ) : (
                <div className="le-menu-account">
                  <button type="button" onClick={() => { setMenuOpen(false); onAccount('signin'); }}>{t('Customer Login')}</button>
                  <button type="button" onClick={() => { setMenuOpen(false); onAccount('signup'); }}>{t('Sign up')}</button>
                </div>
              )}
              <button type="button" onClick={() => { setMenuOpen(false); onMyBookings(); }}>My bookings</button>
            </div>
            <div className="le-menu-cta">
              <button type="button" className="le-btn le-btn-solid" onClick={() => book()}>
                {t('Book Appointment')}
                <ArrowUpRight size={16} aria-hidden="true" />
              </button>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  <MessageCircle size={15} aria-hidden="true" /> WhatsApp the atelier
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <main id="le-main">
        {/* 1 — Editorial hero */}
        {visible.hero && (
          <section className="le-hero" data-layout="hero" id="salon-home" aria-labelledby="le-hero-title">
            <div className="le-container le-hero-grid">
              <div className="le-hero-head" data-le-reveal>
                <p className="le-eyebrow">
                  <span aria-hidden="true" /> {LUXURY_EDITORIAL_HERO.eyebrow}
                </p>
                <h1 id="le-hero-title">
                  {LUXURY_EDITORIAL_HERO.headline.map((line, index) => (
                    <React.Fragment key={line}>
                      {index === 1 ? <em>{line}</em> : line}
                      {index < LUXURY_EDITORIAL_HERO.headline.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </h1>
              </div>

              <figure className="le-hero-media" data-le-reveal>
                <div className="le-hero-frame">
                  <img
                    src={heroImage.src}
                    srcSet={heroImage.srcSet}
                    sizes="(max-width: 900px) 100vw, 56vw"
                    alt={heroImage.alt}
                    width={IMAGES.hero.width}
                    height={IMAGES.hero.height}
                    fetchPriority="high"
                    decoding="async"
                    onError={() => setBrokenHero(true)}
                  />
                  <span className="le-hero-frame-line" aria-hidden="true" />
                </div>
                <span className="le-hero-vertical" aria-hidden="true">{LUXURY_EDITORIAL_HERO.verticalNote}</span>
                <figcaption className="le-hero-caption">
                  <span>01</span>
                  {LUXURY_EDITORIAL_HERO.imageCaption}
                </figcaption>
                <div className="le-hero-detail" aria-hidden="true">
                  <img src={IMAGES.heroDetail.src} srcSet={IMAGES.heroDetail.srcSet} sizes="240px" alt="" loading="lazy" decoding="async" />
                </div>
                <div className="le-hero-badge">
                  {reviewSummary.count > 0 ? (
                    <>
                      <span className="le-badge-stars" aria-hidden="true">
                        {Array.from({ length: 5 }).map((_, index) => <Star key={index} size={10} fill="currentColor" />)}
                      </span>
                      <strong>{reviewSummary.average.toFixed(1)}</strong>
                      <small>{reviewSummary.count} verified {reviewSummary.count === 1 ? 'review' : 'reviews'}</small>
                    </>
                  ) : (
                    <>
                      <span className="le-badge-kicker">By appointment</span>
                      <strong>{profile.foundingYear || String(services.length).padStart(2, '0')}</strong>
                      <small>{profile.foundingYear ? `${city} atelier` : 'Signature treatments'}</small>
                    </>
                  )}
                </div>
              </figure>

              <div className="le-hero-tail" data-le-reveal>
                <p className="le-hero-description">
                  {profile.tagline && !/^Precision Cuts/i.test(profile.tagline) ? profile.tagline : LUXURY_EDITORIAL_HERO.description}
                </p>
                <div className="le-hero-actions">
                  <button type="button" className="le-btn le-btn-solid" onClick={() => book()}>
                    {LUXURY_EDITORIAL_HERO.primaryCta}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </button>
                  <a
                    className="le-link"
                    href={`#${servicesTarget}`}
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToSection(servicesTarget);
                    }}
                  >
                    {LUXURY_EDITORIAL_HERO.secondaryCta}
                    <ArrowRight size={15} aria-hidden="true" />
                  </a>
                </div>
                {visible.metrics && heroStats.length > 0 && (
                  <dl className="le-hero-stats">
                    {heroStats.map((stat) => (
                      <div key={stat.label}>
                        <dt>{stat.label}</dt>
                        <dd>{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </div>
            <div className="le-hero-strip" aria-hidden="true">
              <div className="le-container le-hero-strip-inner">
                <span>Precision cutting</span>
                <i />
                <span>Quiet colour</span>
                <i />
                <span>Scalp rituals</span>
                <i />
                <span>Occasion hair</span>
                <i />
                <span>{city}</span>
              </div>
            </div>
          </section>
        )}

        <AppAnnouncementStrip />

        {/* 2 — Magazine About */}
        {visible.about && (
          <section className="le-about le-section" data-layout="about" id="salon-about" aria-labelledby="le-about-title">
            <div className="le-container le-about-grid">
              <div className="le-about-media" data-le-reveal>
                <figure className="le-about-main">
                  <img
                    src={IMAGES.about.src}
                    srcSet={IMAGES.about.srcSet}
                    sizes="(max-width: 900px) 92vw, 46vw"
                    alt={IMAGES.about.alt}
                    width={IMAGES.about.width}
                    height={IMAGES.about.height}
                    loading="lazy"
                    decoding="async"
                  />
                </figure>
                <figure className="le-about-offset">
                  <img
                    src={aboutOffset.src}
                    srcSet={aboutOffset.srcSet}
                    sizes="(max-width: 900px) 40vw, 18vw"
                    alt={aboutOffset.alt}
                    loading="lazy"
                    decoding="async"
                    onError={() => setBrokenAbout(true)}
                  />
                </figure>
                <span className="le-about-figure" aria-hidden="true">The Atelier</span>
              </div>
              <div className="le-about-copy" data-le-reveal>
                <p className="le-eyebrow"><span aria-hidden="true" /> {LUXURY_EDITORIAL_ABOUT_COPY.eyebrow}</p>
                <h2 id="le-about-title">
                  {LUXURY_EDITORIAL_ABOUT_COPY.heading.map((line) => (
                    <React.Fragment key={line}>{line}<br /></React.Fragment>
                  ))}
                </h2>
                <p className="le-about-story">
                  {String(profile.about || '').trim() && !/^Located in the vibrant heart of Indiranagar, Miraki is/i.test(String(profile.about))
                    ? profile.about
                    : LUXURY_EDITORIAL_ABOUT}
                </p>
                <div className="le-about-signature">
                  <span className="le-signature">{profile.ownerName || brandName}</span>
                  <span>{profile.ownerRole || LUXURY_EDITORIAL_ABOUT_COPY.signatureNote}</span>
                </div>
                <a
                  className="le-link"
                  href={`#${servicesTarget}`}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection(servicesTarget);
                  }}
                >
                  {LUXURY_EDITORIAL_ABOUT_COPY.cta}
                  <ArrowRight size={15} aria-hidden="true" />
                </a>
                <dl className="le-about-facts">
                  {profile.foundingYear && <div><dt>Founded</dt><dd>{profile.foundingYear}</dd></div>}
                  {services.length > 0 && <div><dt>Treatments</dt><dd>{services.length}</dd></div>}
                  {team.length > 0 && <div><dt>Specialists</dt><dd>{team.length}</dd></div>}
                  <div><dt>Location</dt><dd>{city}</dd></div>
                </dl>
              </div>
            </div>
          </section>
        )}

        {/* 3 — Services */}
        {visible.services && (
          <section className="le-services le-section" data-layout="services" id="services-section" aria-labelledby="le-services-title">
            <div className="le-container">
              <header className="le-section-head" data-le-reveal>
                <div>
                  <p className="le-eyebrow"><span aria-hidden="true" /> The Service Edit</p>
                  <h2 id="le-services-title">Signature treatments,<br /><em>quietly perfected.</em></h2>
                </div>
                <p className="le-section-note">
                  {coreServices.length ? `${coreServices.length} curated ${coreServices.length === 1 ? 'treatment' : 'treatments'} · considered pricing` : 'A considered menu, shaped around you.'}
                </p>
              </header>

              {coreServices.length > 0 ? (
                <>
                  {serviceCategories.length > 1 && (
                    <div className="le-filters" role="group" aria-label="Service categories">
                      {['All', ...serviceCategories].map((category) => (
                        <button
                          key={category}
                          type="button"
                          aria-pressed={activeServiceCategory === category}
                          onClick={() => setServiceCategory(category)}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  )}

                  {featuredService && (
                    <article className="le-feature" data-le-reveal>
                      <div className="le-feature-media">
                        <img
                          {...servicePhoto(featuredService)}
                          sizes="(max-width: 900px) 92vw, 56vw"
                          loading="lazy"
                          decoding="async"
                          onError={() => setBrokenServices((previous) => previous.includes(featuredService.id) ? previous : [...previous, featuredService.id])}
                        />
                        <span className="le-feature-tag">Featured ritual</span>
                      </div>
                      <div className="le-feature-copy">
                        <p className="le-feature-category">{featuredService.category || 'Signature service'}</p>
                        <h3>{featuredService.name}</h3>
                        {featuredService.description && <p>{featuredService.description}</p>}
                        <div className="le-feature-meta">
                          <strong>{formatEditorialPrice(featuredService.price)}</strong>
                          {featuredService.showDuration !== false && (
                            <span><Clock size={14} aria-hidden="true" />{featuredService.durationMinutes} minutes</span>
                          )}
                        </div>
                        <button type="button" className="le-btn le-btn-solid" onClick={() => book(featuredService)}>
                          Book this ritual
                          <ArrowUpRight size={16} aria-hidden="true" />
                        </button>
                        <p className="le-feature-note">Includes a personal consultation before we begin.</p>
                      </div>
                    </article>
                  )}

                  {gridServices.length > 0 && (
                    <div className="le-service-grid">
                      {gridServices.map((service, index) => (
                        <article className="le-service-card" key={service.id} data-le-reveal>
                          <button
                            type="button"
                            className="le-service-media"
                            onClick={() => book(service)}
                            aria-label={`Book ${service.name}`}
                          >
                            <img
                              {...servicePhoto(service)}
                              sizes="(max-width: 700px) 92vw, (max-width: 1000px) 46vw, 34vw"
                              loading="lazy"
                              decoding="async"
                              onError={() => setBrokenServices((previous) => previous.includes(service.id) ? previous : [...previous, service.id])}
                            />
                            <span className="le-service-number" aria-hidden="true">{String(index + 2).padStart(2, '0')}</span>
                          </button>
                          <div className="le-service-body">
                            <div className="le-service-top">
                              <span>{service.category || 'Signature service'}</span>
                              {service.popular && <em>Signature</em>}
                            </div>
                            <h3>{service.name}</h3>
                            {service.description && <p className="le-service-description">{service.description}</p>}
                            <div className="le-service-bottom">
                              <div>
                                <strong>{formatEditorialPrice(service.price)}</strong>
                                {service.showDuration !== false && (
                                  <span><Clock size={13} aria-hidden="true" />{service.durationMinutes} min</span>
                                )}
                              </div>
                              <button type="button" className="le-book-link" onClick={() => book(service)}>
                                Book <ArrowUpRight size={14} aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="le-empty">The studio is refining its service menu. Please contact us for treatment details.</p>
              )}

              {packagesShown && (
                <div className="le-packages" id="salon-packages" data-le-reveal>
                  <div className="le-packages-head">
                    <p className="le-eyebrow"><span aria-hidden="true" /> Curated Pairings</p>
                    <h3>More time, <em>considered together.</em></h3>
                  </div>
                  <div className="le-packages-grid">
                    {packages.map((item) => (
                      <article className="le-package-card" key={item.id}>
                        <span>{item.category || 'Package'}</span>
                        <h4>{cleanPackageName(item.name)}</h4>
                        {cleanPackageDescription(item.description) && <p>{cleanPackageDescription(item.description)}</p>}
                        <div>
                          <strong>{formatEditorialPrice(item.price)}</strong>
                          {item.showDuration !== false && <small>{item.durationMinutes} min</small>}
                        </div>
                        <button type="button" className="le-book-link" onClick={() => book(item)}>
                          Book package <ArrowUpRight size={14} aria-hidden="true" />
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 4 — Team */}
        {visible.stylists && team.length > 0 && (
          <section className="le-team le-section" data-layout="team" id="salon-team" aria-labelledby="le-team-title">
            <div className="le-container">
              <header className="le-section-head" data-le-reveal>
                <div>
                  <p className="le-eyebrow"><span aria-hidden="true" /> The Specialists</p>
                  <h2 id="le-team-title">Hands you can<br /><em>trust with the details.</em></h2>
                </div>
                <p className="le-section-note">{team.length} specialists · choose your artist when you book.</p>
              </header>
              <div className="le-team-grid">
                {team.map((staff, index) => {
                  const image = teamPhoto(staff, index);
                  const teamArtMissing = brokenTeamArt.includes(staff.id);
                  const teamMonogram = String(staff.name || '')
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase();
                  const unavailable = staff.status === 'On Leave';
                  return (
                    <article className="le-team-card" key={staff.id} data-le-reveal>
                      <div className={`le-team-portrait${teamArtMissing ? ' is-fallback' : ''}`}>
                        {teamArtMissing ? (
                          <div className="le-team-fallback">
                            <span aria-hidden="true">{teamMonogram}</span>
                            <small>{staff.role || 'Atelier specialist'}</small>
                          </div>
                        ) : (
                          <img
                            src={image.src}
                            srcSet={image.srcSet}
                            sizes="(max-width: 700px) 92vw, (max-width: 1100px) 44vw, 30vw"
                            alt={image.alt}
                            loading="lazy"
                            decoding="async"
                            onError={(event) => {
                              event.currentTarget.style.visibility = 'hidden';
                              if (String(staff.avatarUrl || '').trim() && !brokenTeam.includes(staff.id)) {
                                setBrokenTeam((previous) => previous.includes(staff.id) ? previous : [...previous, staff.id]);
                              } else {
                                setBrokenTeamArt((previous) => previous.includes(staff.id) ? previous : [...previous, staff.id]);
                              }
                            }}
                          />
                        )}
                        <span className="le-team-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                        <div className="le-team-hover">
                          <button type="button" onClick={() => onViewSpecialist(staff.id)}>
                            View portfolio <ArrowUpRight size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <div className="le-team-copy">
                        <div className="le-team-title-row">
                          <div>
                            <h3>{staff.name}</h3>
                            <p>
                              {staff.role || 'Salon specialist'}
                              {Number(staff.experienceYears) > 0 ? ` · ${staff.experienceYears} yrs` : ''}
                            </p>
                          </div>
                          {Number(staff.rating) > 0 && (
                            <span className="le-team-rating" title="Salon-listed rating">
                              <Star size={11} fill="currentColor" aria-hidden="true" /> {Number(staff.rating).toFixed(2)}
                            </span>
                          )}
                        </div>
                        {Array.isArray(staff.specialties) && staff.specialties.length > 0 && (
                          <p className="le-team-specialties">{staff.specialties.slice(0, 3).join(' · ')}</p>
                        )}
                        <div className="le-team-actions">
                          <button type="button" className="le-book-link" onClick={() => onViewSpecialist(staff.id)}>
                            View profile &amp; reviews <ArrowUpRight size={14} aria-hidden="true" />
                          </button>
                          <button type="button" className="le-btn le-btn-outline le-btn-small" disabled={unavailable} onClick={() => book(undefined, staff)}>
                            {unavailable ? 'Currently away' : `Book with ${staff.name.split(' ')[0]}`}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* 5 — Gallery */}
        {visible.gallery && galleryEntries.length > 0 && (
          <section className="le-gallery le-section" data-layout="gallery" id="salon-lookbook" aria-labelledby="le-gallery-title">
            <div className="le-container">
              <header className="le-section-head" data-le-reveal>
                <div>
                  <p className="le-eyebrow"><span aria-hidden="true" /> The Lookbook</p>
                  <h2 id="le-gallery-title">Real work,<br /><em>quietly expressive.</em></h2>
                </div>
                <p className="le-section-note">A portfolio of finishes, colour and occasion hair from the atelier.</p>
              </header>

              {galleryCategories.length > 1 && (
                <div className="le-filters" role="group" aria-label="Filter gallery by category">
                  {['All', ...galleryCategories].map((category) => (
                    <button
                      key={category}
                      type="button"
                      aria-pressed={activeGalleryCategory === category}
                      onClick={() => setGalleryCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}

              <div className="le-masonry">
                {filteredGallery.map((photo, index) => {
                  const image = galleryPhoto(photo);
                  const shape = ['le-tile-tall', 'le-tile-wide', 'le-tile-square', 'le-tile-portrait', 'le-tile-landscape', 'le-tile-square'][index % 6];
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      className={`le-tile ${shape}`}
                      onClick={() => setLightbox(index)}
                      aria-label={`Open ${photo.title || photo.category} in the lookbook`}
                      data-le-reveal
                    >
                      <img
                        src={image.src}
                        srcSet={image.srcSet}
                        sizes="(max-width: 600px) 92vw, (max-width: 1000px) 46vw, 31vw"
                        alt={image.alt}
                        loading="lazy"
                        decoding="async"
                        onError={() => setBrokenGallery((previous) => previous.includes(photo.id) ? previous : [...previous, photo.id])}
                      />
                      <span className="le-tile-caption">
                        <small>{photo.category}</small>
                        <strong>{photo.title || 'Studio work'}</strong>
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </span>
                    </button>
                  );
                })}
              </div>
              {galleryEntries.some((photo) => photo.isDemo) && (
                <p className="le-gallery-note">Sample lookbook imagery is shown in the template preview. Your salon’s own photos replace it when you publish.</p>
              )}
            </div>
          </section>
        )}

        {/* 6 — Typography-first testimonials */}
        {visible.testimonials && (
          <section className="le-testimonials le-section" data-layout="experiences" id="salon-testimonials" aria-labelledby="le-testimonials-title">
            <div className="le-container le-quote-wrap">
              <aside className="le-quote-aside" data-le-reveal>
                <p className="le-eyebrow"><span aria-hidden="true" /> Client Stories</p>
                <h2 id="le-testimonials-title">In their<br /><em>own words.</em></h2>
                {displayReviews.length > 0 && (
                  <span className="le-quote-count" aria-live="polite">
                    {String(currentIndex + 1).padStart(2, '0')} <i /> {String(displayReviews.length).padStart(2, '0')}
                  </span>
                )}
              </aside>

              <div className="le-quote-main" data-le-reveal>
                {review ? (
                  <>
                    <Quote className="le-quote-mark" size={42} aria-hidden="true" />
                    <blockquote key={review.id}>
                      <p>“{String(review.comment).trim()}”</p>
                    </blockquote>
                    <div className="le-quote-meta">
                      <div>
                        <strong>{review.name || 'Salon client'}</strong>
                        <span>
                          {[review.serviceName, review.location, review.date && review.date !== 'Demo' ? review.date : ''].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      {Number(review.rating) > 0 && (
                        <span className="le-quote-stars" aria-label={`${review.rating} out of 5 stars`}>
                          {Array.from({ length: Math.max(1, Math.min(5, Math.round(Number(review.rating)))) }).map((_, index) => (
                            <Star key={index} size={12} fill="currentColor" aria-hidden="true" />
                          ))}
                        </span>
                      )}
                      {review.isDemo && <small className="le-quote-demo">Sample story · template preview</small>}
                    </div>
                    {displayReviews.length > 1 && (
                      <div className="le-quote-nav">
                        <button
                          type="button"
                          aria-label="Previous client story"
                          onClick={() => setReviewIndex((currentIndex - 1 + displayReviews.length) % displayReviews.length)}
                        >
                          <ArrowLeft size={17} />
                        </button>
                        <button
                          type="button"
                          aria-label="Next client story"
                          onClick={() => setReviewIndex((currentIndex + 1) % displayReviews.length)}
                        >
                          <ArrowRight size={17} />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="le-quote-empty">
                    <Quote size={34} aria-hidden="true" />
                    <p>Client stories from real visits will appear here. If you have visited the atelier, we would love to hear about your experience.</p>
                  </div>
                )}

                <div className="le-review-tools">
                  <ExternalReviewFeed profile={profile} />
                  <details className="le-review-details">
                    <summary>Read every review &amp; share your experience</summary>
                    <div className="le-review-panel">
                      <CustomerReviewPanel
                        authenticOnly
                        businessType={profile.businessType}
                        slug={profile.subdomain}
                        fallbackReviews={[]}
                        signedIn={customerSignedIn}
                        services={services.map((service) => service.name)}
                        onLogin={() => onAccount('signin')}
                      />
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 7 — Booking CTA */}
        {bookingTarget && (
          <section className="le-booking" data-layout="booking" id="salon-bookings" aria-labelledby="le-booking-title">
            <img
              className="le-booking-bg"
              src={IMAGES.booking.src}
              srcSet={IMAGES.booking.srcSet}
              sizes="100vw"
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
            />
            <div className="le-booking-overlay" aria-hidden="true" />
            <div className="le-container le-booking-grid">
              <div className="le-booking-copy" data-le-reveal>
                <p className="le-eyebrow le-eyebrow-light"><span aria-hidden="true" /> {LUXURY_EDITORIAL_BOOKING_COPY.eyebrow}</p>
                <h2 id="le-booking-title">{LUXURY_EDITORIAL_BOOKING_COPY.headline}</h2>
                <p>{LUXURY_EDITORIAL_BOOKING_COPY.description}</p>
                <div className="le-booking-badges">
                  <span><CalendarCheck size={14} aria-hidden="true" /> Live availability</span>
                  <span><Sparkles size={14} aria-hidden="true" /> 25% advance secures your slot</span>
                </div>
              </div>
              <div className="le-booking-card" data-le-reveal>
                <p className="le-booking-card-kicker">Reserve your visit</p>
                <button type="button" className="le-btn le-btn-solid le-booking-cta" onClick={() => book()}>
                  {LUXURY_EDITORIAL_BOOKING_COPY.cta}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </button>
                <ul className="le-booking-info">
                  <li><MapPin size={15} aria-hidden="true" /><span>{address}</span></li>
                  <li><Clock size={15} aria-hidden="true" /><span>{hours[0].value} · Mon–Fri</span></li>
                  {phone && <li><Phone size={15} aria-hidden="true" /><a href={`tel:${phone.replace(/[^+0-9]/g, '')}`}>{phone}</a></li>}
                  {whatsappUrl && <li><MessageCircle size={15} aria-hidden="true" /><a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp the atelier</a></li>}
                </ul>
                <div className="le-booking-links">
                  {onMyBookings && <button type="button" onClick={onMyBookings}>{t('My Bookings')}</button>}
                  <button type="button" onClick={() => onAccount(customerSignedIn ? 'signin' : 'signup')}>
                    {customerSignedIn ? 'My profile & settings' : t('Sign up')}
                  </button>
                </div>
                <p className="le-booking-fineprint">
                  {profile.bookingRules
                    ? `Book at least ${profile.bookingRules.leadHours} hours ahead · ${profile.bookingRules.cancellationWindow}-hour cancellation window.`
                    : 'Choose your service, specialist and time. Availability is confirmed before payment.'}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* 8 — Contact & hours */}
        {visible.location && (
          <section className="le-contact le-section" data-layout="location" id="salon-location" aria-labelledby="le-contact-title">
            <div className="le-container le-contact-grid">
              <div className="le-contact-copy" data-le-reveal>
                <p className="le-eyebrow"><span aria-hidden="true" /> Visit the Atelier</p>
                <h2 id="le-contact-title">Come and<br /><em>make time for yourself.</em></h2>
                <address>
                  <span>{address}</span>
                  {profile.landmark && <span>Near {profile.landmark}</span>}
                </address>
                <div className="le-contact-actions">
                  <a className="le-btn le-btn-outline" href={mapsUrl} target="_blank" rel="noreferrer">
                    <MapPin size={15} aria-hidden="true" /> Get directions
                  </a>
                  {whatsappUrl && (
                    <a className="le-link" href={whatsappUrl} target="_blank" rel="noreferrer">
                      WhatsApp the atelier <ArrowUpRight size={14} aria-hidden="true" />
                    </a>
                  )}
                </div>
                <div className="le-contact-details">
                  {phone && <a href={`tel:${phone.replace(/[^+0-9]/g, '')}`}><Phone size={14} aria-hidden="true" />{phone}</a>}
                  {email && <a href={`mailto:${email}`}><Mail size={14} aria-hidden="true" />{email}</a>}
                  {profile.instagramHandle && socialUrl(profile.instagramHandle, 'instagram') && (
                    <a href={socialUrl(profile.instagramHandle, 'instagram')} target="_blank" rel="noreferrer">
                      <Instagram size={14} aria-hidden="true" />{profile.instagramHandle}
                    </a>
                  )}
                </div>
              </div>
              <div className="le-hours" data-le-reveal>
                <p className="le-hours-title">Atelier hours</p>
                <dl>
                  <div><dt>Monday – Friday <small>except Tuesday</small></dt><dd>{profile.workingHoursMonFri || 'By appointment'}</dd></div>
                  <div><dt>Tuesday</dt><dd>{profile.workingHoursTue || 'By appointment'}</dd></div>
                  <div><dt>Saturday</dt><dd>{profile.workingHoursSat || 'By appointment'}</dd></div>
                  <div><dt>Sunday</dt><dd>{profile.workingHoursSun || 'By appointment'}</dd></div>
                </dl>
                <p className="le-hours-note">All appointments are scheduled in India Standard Time (IST).</p>
                <button type="button" className="le-btn le-btn-solid" onClick={() => book()}>
                  {t('Book Appointment')} <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 9 — Owner extras (promotions, videos, loyalty, policies, social, share) */}
        {ownerExtras.length > 0 && (
          <section className="le-extras le-section" aria-label="Offers, videos, rewards and salon policies">
            <div className="le-container">
              <header className="le-section-head le-extras-head">
                <div>
                  <p className="le-eyebrow"><span aria-hidden="true" /> Atelier Notes</p>
                  <h2>More from<br /><em>the studio.</em></h2>
                </div>
                <p className="le-section-note">Offers, film, rewards and the practical details of your visit.</p>
              </header>
              <div className="le-owner-extras">
                <WebsiteSections {...shared} sections={ownerExtras} />
              </div>
            </div>
          </section>
        )}

        <AppInstallSection />
      </main>

      {footerVisible && (
        <footer className="le-footer" data-layout="footer" id="salon-footer">
          <div className="le-container">
            <div className="le-footer-top">
              <div className="le-footer-brand">
                <span className="le-monogram le-monogram-light" aria-hidden="true">{monogram}</span>
                <div>
                  <strong>{brandName}</strong>
                  <small>Hair Atelier · {city}</small>
                </div>
              </div>
              <p className="le-footer-wordmark" aria-hidden="true">{brandName}</p>
            </div>

            <div className="le-footer-grid">
              <nav aria-label="Footer navigation">
                <h3>Explore</h3>
                {navItems.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.target}`}
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToSection(item.target);
                    }}
                  >
                    {t(item.label)}
                  </a>
                ))}
              </nav>

              <div>
                <h3>Visit</h3>
                <address>{address}</address>
                {phone && <a href={`tel:${phone.replace(/[^+0-9]/g, '')}`}>{phone}</a>}
                {email && <a href={`mailto:${email}`}>{email}</a>}
                <a href={mapsUrl} target="_blank" rel="noreferrer">Directions <ArrowUpRight size={13} aria-hidden="true" /></a>
              </div>

              <div>
                <h3>Hours</h3>
                <dl className="le-footer-hours">
                  {hours.map((item) => (
                    <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
                  ))}
                </dl>
                <p className="le-footer-note">Appointments in IST.</p>
              </div>

              <div>
                <h3>Reserve</h3>
                <button type="button" className="le-btn le-btn-solid le-btn-small" onClick={() => book()}>
                  {t('Book Appointment')} <ArrowUpRight size={14} aria-hidden="true" />
                </button>
                {onMyBookings && <button type="button" className="le-footer-link" onClick={onMyBookings}>{t('My Bookings')}</button>}
                {customerSignedIn ? (
                  <button type="button" className="le-footer-account" onClick={() => onAccount('signin')} aria-label="Manage your customer account">
                    {customerPhotoUrl ? <img src={customerPhotoUrl} alt="" width={30} height={30} /> : <span aria-hidden="true">{String(customerName || 'A').slice(0, 1).toUpperCase()}</span>}
                    <span>{customerName || 'My profile & settings'}</span>
                  </button>
                ) : (
                  <button type="button" className="le-footer-link" onClick={() => onAccount('signin')}>
                    {t('Customer Login')}
                  </button>
                )}
                {socialLinks.length > 0 && (
                  <div className="le-footer-social">
                    {socialLinks.map(({ label, url, Icon }) => (
                      <a key={label} href={url} target="_blank" rel="noreferrer" aria-label={`${brandName} on ${label}`}>
                        <Icon size={17} aria-hidden="true" />
                      </a>
                    ))}
                    {whatsappUrl && (
                      <a href={whatsappUrl} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${brandName}`}>
                        <MessageCircle size={17} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="le-footer-bottom">
              <span>© {new Date().getFullYear()} {brandName}. All rights reserved.</span>
              <span className="le-footer-language">
                <WebsiteLanguageSwitcher />
              </span>
              <div className="le-footer-legal">
                {policyLinks.map((key) => (
                  <a key={key} href="#salon-policies">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}</a>
                ))}
                <a href="#salon-home">Back to top ↑</a>
              </div>
              {branding?.poweredBy && <span className="le-footer-powered">Powered by {branding.platformName || 'StudioFlow'}</span>}
            </div>
          </div>
        </footer>
      )}

      <FloatingPromoBanner profile={profile} />

      {lightbox !== null && filteredGallery[lightbox] && (
        <div className="le-lightbox" role="dialog" aria-modal="true" aria-label="Lookbook image viewer" onClick={() => setLightbox(null)}>
          <button type="button" className="le-lightbox-close" aria-label="Close lookbook" onClick={() => setLightbox(null)}>
            <X size={22} />
          </button>
          {filteredGallery.length > 1 && (
            <>
              <button
                type="button"
                className="le-lightbox-nav le-lightbox-prev"
                aria-label="Previous lookbook image"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightbox((lightbox - 1 + filteredGallery.length) % filteredGallery.length);
                }}
              >
                <ChevronLeft size={26} />
              </button>
              <button
                type="button"
                className="le-lightbox-nav le-lightbox-next"
                aria-label="Next lookbook image"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightbox((lightbox + 1) % filteredGallery.length);
                }}
              >
                <ChevronRight size={26} />
              </button>
            </>
          )}
          <figure onClick={(event) => event.stopPropagation()}>
            <img src={filteredGallery[lightbox].url} alt={filteredGallery[lightbox].title || 'Salon lookbook'} />
            <figcaption>
              <span>{filteredGallery[lightbox].category}</span>
              <strong>{filteredGallery[lightbox].title || 'Studio work'}</strong>
              <small>{lightbox + 1} / {filteredGallery.length}</small>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
