import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Facebook,
  Instagram,
  Leaf,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Quote,
  Scissors,
  Sparkles,
  Star,
  UserCheck,
  X,
  Youtube,
} from 'lucide-react';
import type { SalonProfile, SalonService, Stylist } from '../types';
import type { SalonGalleryPhoto } from '../lib/photoGallery';
import { clientExperiences } from '../lib/demoWebsiteContent';
import { socialUrl } from '../lib/websiteContent';
import { AppAnnouncementStrip, AppInstallSection } from './AppInstallSection';
import { CustomerReviewPanel } from './CustomerReviewPanel';
import { ExternalReviewFeed } from './ExternalReviewFeed';
import { WebsiteSections } from './WebsiteSections';
import {
  AURA_UNISEX_COLOURS,
  AURA_UNISEX_COPY,
  AURA_UNISEX_IMAGES,
  auraAccent,
  auraAddress,
  auraBrand,
  auraCity,
  auraCssVariables,
  auraGenderTab,
  auraHours,
  auraMapsUrl,
  auraPhoneDigits,
  auraServiceTabs,
  auraServicesForTab,
  auraServiceImage,
  auraWhatsApp,
  durationLabel,
  money,
  type AuraServiceTab,
} from '../lib/auraUnisex';
import './auraUnisex.css';

type SharedWebsiteProps = React.ComponentProps<typeof WebsiteSections>;

export interface AuraUnisexWebsiteProps {
  profile: SalonProfile;
  services: SalonService[];
  stylists: Stylist[];
  galleryPhotos: SalonGalleryPhoto[];
  shared: SharedWebsiteProps;
  enabledSections: string[];
  showPackages: boolean;
  customerSignedIn?: boolean;
  customerName?: string;
  customerPhotoUrl?: string;
  bookingAvailable?: boolean;
  branding?: { platformName: string; poweredBy: boolean; supportEmail: string } | null;
  onBook: (service?: SalonService, stylist?: Stylist) => void;
  onAccount: (mode?: 'signin' | 'signup') => void;
  onMyBookings: () => void;
  onViewSpecialist: (stylistId: string) => void;
}

const NAV_LINKS: Array<{ label: string; href: string }> = [
  { label: AURA_UNISEX_COPY.navHome, href: '#aura-home' },
  { label: AURA_UNISEX_COPY.navServices, href: '#aura-services' },
  { label: AURA_UNISEX_COPY.navAbout, href: '#aura-about' },
  { label: AURA_UNISEX_COPY.navTeam, href: '#aura-team' },
  { label: AURA_UNISEX_COPY.navGallery, href: '#aura-gallery' },
  { label: AURA_UNISEX_COPY.navContact, href: '#aura-contact' },
];

interface GalleryItem {
  id: string;
  src: string;
  srcSet: string;
  title: string;
  isDemo: boolean;
}

export const AuraUnisexWebsite: React.FC<AuraUnisexWebsiteProps> = ({
  profile,
  services,
  stylists,
  galleryPhotos,
  shared,
  enabledSections,
  customerSignedIn,
  customerName,
  customerPhotoUrl,
  bookingAvailable,
  branding,
  onBook,
  onAccount,
  onMyBookings,
  onViewSpecialist,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<AuraServiceTab>('All Services');
  const [lightbox, setLightbox] = useState<number | null>(null);

  const brandName = auraBrand(profile);
  const city = auraCity(profile);
  const address = auraAddress(profile);
  const mapsUrl = auraMapsUrl(profile);
  const whatsapp = auraWhatsApp(profile);
  const phoneDigits = auraPhoneDigits(profile);
  const hours = auraHours(profile);
  const accent = auraAccent(profile);
  const cssVars = auraCssVariables(profile) as React.CSSProperties;

  const tabs = useMemo(() => auraServiceTabs(services), [services]);
  const activeTab: AuraServiceTab = tabs.includes(tab) ? tab : 'All Services';
  const visibleServices = useMemo(() => auraServicesForTab(services, activeTab), [services, activeTab]);
  const wellnessServices = useMemo(() => auraServicesForTab(services, 'Wellness'), [services]);
  const popularServices = useMemo(
    () => services.filter((service) => service.popular).slice(0, 4),
    [services],
  );
  const footerServices = popularServices.length > 0 ? popularServices : services.slice(0, 4);
  const team = stylists.slice(0, 6);
  // The header only links to sections that actually have content.
  const navLinks = NAV_LINKS.filter((link) => link.href !== '#aura-team' || team.length > 0);
  const reviews = useMemo(() => clientExperiences(profile).slice(0, 3), [profile]);

  const gallery: GalleryItem[] = useMemo(() => {
    if (galleryPhotos.length > 0) {
      return galleryPhotos.map((photo) => ({
        id: photo.id,
        src: photo.url,
        srcSet: '',
        title: photo.title || photo.category,
        isDemo: photo.isDemo === true,
      }));
    }
    return AURA_UNISEX_IMAGES.gallery.map((image, index) => ({
      id: `aura-gallery-${index + 1}`,
      src: image.src,
      srcSet: image.srcSet,
      title: image.alt,
      isDemo: true,
    }));
  }, [galleryPhotos]);

  const featuredService = services.find((service) => service.popular) || services[0];

  useEffect(() => {
    if (lightbox === null || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightbox]);

  const goToServices = (next: AuraServiceTab) => {
    setTab(next);
    setMenuOpen(false);
    if (typeof document === 'undefined') return;
    document.getElementById('aura-services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const sectionOn = (id: string) => enabledSections.includes(id);

  const instagramHref = socialUrl(profile.instagramHandle, 'instagram');
  const facebookHref = socialUrl(profile.facebookPage, 'facebook');
  const youtubeHref = socialUrl(profile.youtubeChannel, 'youtube');

  const year = new Date().getFullYear();

  return (
    <div className="au-site" style={cssVars}>
      {/* ==================================================================
          HEADER — Aura Unisex Salon (sticky, warm white)
         ================================================================== */}
      <header className="au-header" aria-label="Customer account and salon navigation">
        <div className="au-header-inner">
          <a className="au-brand" href="#aura-home" aria-label={`${brandName} home`}>
            {profile.logoUrl ? (
              <img className="au-brand-logo" src={profile.logoUrl} alt={brandName} />
            ) : (
              <span className="au-brand-mark" aria-hidden="true">
                A
              </span>
            )}
            <span className="au-brand-text">
              <span className="au-brand-name">{brandName}</span>
              <span className="au-brand-sub">{AURA_UNISEX_COPY.brandSublabel}</span>
            </span>
          </a>

          <nav className="au-nav" aria-label="Salon sections">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="au-header-actions">
            {customerSignedIn ? (
              <button
                type="button"
                className="au-header-link"
                aria-label="Manage your customer account"
                onClick={() => onAccount('signin')}
              >
                {customerPhotoUrl ? (
                  <img className="au-account-avatar" src={customerPhotoUrl} alt="" />
                ) : (
                  <UserCheck size={15} aria-hidden="true" />
                )}
                <span>{customerName || 'Account'}</span>
              </button>
            ) : (
              <>
                <button type="button" className="au-header-link au-hide-mobile" onClick={() => onAccount('signin')}>
                  Customer Login
                </button>
                <button type="button" className="au-header-link au-hide-mobile" onClick={() => onAccount('signup')}>
                  Sign up
                </button>
              </>
            )}
            <button type="button" className="au-header-link au-hide-mobile" onClick={onMyBookings}>
              My Bookings
            </button>
            <button
              type="button"
              className="au-btn au-btn-primary"
              onClick={() => onBook(featuredService)}
            >
              {AURA_UNISEX_COPY.heroPrimary}
            </button>
            <button
              type="button"
              className="au-menu-toggle"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile slide-out menu */}
        <div className={`au-mobile-scrim${menuOpen ? ' is-open' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
        <div
          className={`au-mobile-menu${menuOpen ? ' is-open' : ''}`}
          role={menuOpen ? 'dialog' : undefined}
          aria-label="Salon menu"
          aria-hidden={!menuOpen}
        >
          <nav aria-label="Mobile salon sections">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="au-mobile-menu-actions">
            <button
              type="button"
              className="au-btn au-btn-primary au-btn-block"
              onClick={() => {
                setMenuOpen(false);
                onBook(featuredService);
              }}
            >
              <CalendarCheck size={17} aria-hidden="true" />
              {AURA_UNISEX_COPY.heroPrimary}
            </button>
            <button
              type="button"
              className="au-btn au-btn-outline au-btn-block"
              onClick={() => {
                setMenuOpen(false);
                onMyBookings();
              }}
            >
              My Bookings
            </button>
            {!customerSignedIn && (
              <>
                <button
                  type="button"
                  className="au-btn au-btn-ghost au-btn-block"
                  onClick={() => {
                    setMenuOpen(false);
                    onAccount('signin');
                  }}
                >
                  Customer Login
                </button>
                <button
                  type="button"
                  className="au-btn au-btn-ghost au-btn-block"
                  onClick={() => {
                    setMenuOpen(false);
                    onAccount('signup');
                  }}
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ==================================================================
            1. HERO — three-part unisex salon hero (35% / 40% / 25%)
           ================================================================== */}
        {sectionOn('hero') && (
        <section id="aura-home" data-layout="hero" className="au-hero" aria-label="Aura salon welcome">
          <div className="au-container au-hero-grid">
            <div className="au-hero-copy">
              <p className="au-eyebrow">{AURA_UNISEX_COPY.heroEyebrow}</p>
              <h1 className="au-hero-title">{AURA_UNISEX_COPY.heroTitle}</h1>
              <p className="au-hero-text">{AURA_UNISEX_COPY.heroText}</p>
              <div className="au-hero-actions">
                <button
                  type="button"
                  className="au-btn au-btn-primary au-btn-lg"
                  onClick={() => onBook(featuredService)}
                >
                  <CalendarCheck size={18} aria-hidden="true" />
                  {AURA_UNISEX_COPY.heroPrimary}
                </button>
                <a className="au-btn au-btn-outline au-btn-lg" href="#aura-services">
                  {AURA_UNISEX_COPY.heroSecondary}
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
              </div>
            </div>

            <figure className="au-hero-feature">
              <span className="au-hero-shape" aria-hidden="true" />
              <img
                className="au-hero-image"
                src={AURA_UNISEX_IMAGES.heroMain.src}
                srcSet={AURA_UNISEX_IMAGES.heroMain.srcSet}
                sizes="(max-width: 900px) 100vw, 40vw"
                width={AURA_UNISEX_IMAGES.heroMain.width}
                height={AURA_UNISEX_IMAGES.heroMain.height}
                alt={AURA_UNISEX_IMAGES.heroMain.alt}
              />
            </figure>

            <div className="au-hero-cards">
              <article className="au-hero-card">
                <img
                  src={AURA_UNISEX_IMAGES.heroMen.src}
                  srcSet={AURA_UNISEX_IMAGES.heroMen.srcSet}
                  sizes="(max-width: 900px) 50vw, 25vw"
                  width={AURA_UNISEX_IMAGES.heroMen.width}
                  height={AURA_UNISEX_IMAGES.heroMen.height}
                  alt={AURA_UNISEX_IMAGES.heroMen.alt}
                  loading="lazy"
                />
                <span className="au-hero-card-label">{AURA_UNISEX_COPY.heroCardMen}</span>
              </article>
              <article className="au-hero-card">
                <img
                  src={AURA_UNISEX_IMAGES.heroWomen.src}
                  srcSet={AURA_UNISEX_IMAGES.heroWomen.srcSet}
                  sizes="(max-width: 900px) 50vw, 25vw"
                  width={AURA_UNISEX_IMAGES.heroWomen.width}
                  height={AURA_UNISEX_IMAGES.heroWomen.height}
                  alt={AURA_UNISEX_IMAGES.heroWomen.alt}
                  loading="lazy"
                />
                <span className="au-hero-card-label">{AURA_UNISEX_COPY.heroCardWomen}</span>
              </article>
              <div className="au-care-box">
                <Leaf size={17} aria-hidden="true" />
                <div>
                  <strong>{AURA_UNISEX_COPY.heroCareBoxTitle}</strong>
                  <span>{AURA_UNISEX_COPY.heroCareBoxText}</span>
                </div>
              </div>
            </div>

            <ul className="au-hero-points" aria-label="Salon services for everyone">
              {AURA_UNISEX_COPY.heroPoints.map((point) => (
                <li key={point}>
                  <Check size={15} aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>
        )}

        {/* ==================================================================
            2. SERVICES — category tabs + image cards
           ================================================================== */}
        {sectionOn('services') && (
        <section id="aura-services" data-layout="services" className="au-section au-services">
          <div className="au-container">
            <div className="au-section-head">
              <p className="au-eyebrow">{AURA_UNISEX_COPY.servicesEyebrow}</p>
              <h2 className="au-section-title">{AURA_UNISEX_COPY.servicesTitle}</h2>
              <p className="au-section-text">{AURA_UNISEX_COPY.servicesText}</p>
            </div>

            {services.length === 0 ? (
              <p className="au-empty">Service details will appear here once the salon adds them.</p>
            ) : (
              <>
                <div className="au-tabs" role="tablist" aria-label="Service categories">
                  {tabs.map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === item}
                      className={`au-tab${activeTab === item ? ' is-active' : ''}`}
                      onClick={() => setTab(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className="au-service-grid">
                  {visibleServices.map((service) => {
                    const image = auraServiceImage(service);
                    return (
                      <article className="au-service-card" key={service.id}>
                        <div className="au-service-media">
                          <img
                            src={image.src}
                            srcSet={image.srcSet || undefined}
                            sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw"
                            alt={image.alt}
                            loading="lazy"
                          />
                        </div>
                        <div className="au-service-body">
                          <span className="au-service-category">{service.category}</span>
                          <h3 className="au-service-name">{service.name}</h3>
                          {service.description && <p className="au-service-text">{service.description}</p>}
                          <div className="au-service-meta">
                            <span className="au-service-price">{money(service.price)}</span>
                            {service.showDuration !== false && service.durationMinutes > 0 && (
                              <span className="au-service-time">
                                <Clock size={14} aria-hidden="true" />
                                {durationLabel(service.durationMinutes)}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="au-btn au-btn-primary au-btn-block"
                            onClick={() => onBook(service)}
                          >
                            {AURA_UNISEX_COPY.bookNow}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
        )}

        {/* ==================================================================
            3. ABOUT AURA — two images + story
           ================================================================== */}
        {sectionOn('about') && (
        <section id="aura-about" data-layout="about" className="au-section au-about">
          <div className="au-container au-about-grid">
            <div className="au-about-images">
              <img
                className="au-about-large"
                src={AURA_UNISEX_IMAGES.aboutInterior.src}
                srcSet={AURA_UNISEX_IMAGES.aboutInterior.srcSet}
                sizes="(max-width: 900px) 100vw, 45vw"
                width={AURA_UNISEX_IMAGES.aboutInterior.width}
                height={AURA_UNISEX_IMAGES.aboutInterior.height}
                alt={AURA_UNISEX_IMAGES.aboutInterior.alt}
                loading="lazy"
              />
              <img
                className="au-about-small"
                src={AURA_UNISEX_IMAGES.aboutWork.src}
                srcSet={AURA_UNISEX_IMAGES.aboutWork.srcSet}
                sizes="(max-width: 900px) 45vw, 22vw"
                width={AURA_UNISEX_IMAGES.aboutWork.width}
                height={AURA_UNISEX_IMAGES.aboutWork.height}
                alt={AURA_UNISEX_IMAGES.aboutWork.alt}
                loading="lazy"
              />
            </div>

            <div className="au-about-copy">
              <p className="au-eyebrow">{AURA_UNISEX_COPY.aboutEyebrow}</p>
              <h2 className="au-section-title">{AURA_UNISEX_COPY.aboutTitle}</h2>
              <p className="au-section-text">{profile.about ? profile.about : AURA_UNISEX_COPY.aboutDefault}</p>
              <ul className="au-highlights">
                {AURA_UNISEX_COPY.aboutHighlights.map((item) => (
                  <li key={item.title}>
                    <span className="au-highlight-dot" aria-hidden="true">
                      <Check size={14} aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <a className="au-btn au-btn-outline" href="#aura-team">
                {AURA_UNISEX_COPY.aboutButton}
                <ArrowRight size={17} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
        )}

        {/* ==================================================================
            4. MEN & WOMEN SERVICE HIGHLIGHTS — two large cards
           ================================================================== */}
        <section id="aura-for-everyone" data-layout="gender" className="au-section au-dual" aria-label="Services for men and women">
          <div className="au-container au-dual-grid">
            <article className="au-dual-card">
              <img
                src={AURA_UNISEX_IMAGES.featureMen.src}
                srcSet={AURA_UNISEX_IMAGES.featureMen.srcSet}
                sizes="(max-width: 900px) 100vw, 50vw"
                width={AURA_UNISEX_IMAGES.featureMen.width}
                height={AURA_UNISEX_IMAGES.featureMen.height}
                alt={AURA_UNISEX_IMAGES.featureMen.alt}
                loading="lazy"
              />
              <div className="au-dual-body">
                <h3>{AURA_UNISEX_COPY.menTitle}</h3>
                <p>{AURA_UNISEX_COPY.menText}</p>
                <button
                  type="button"
                  className="au-btn au-btn-primary"
                  onClick={() => goToServices(auraGenderTab(services, 'men'))}
                >
                  {AURA_UNISEX_COPY.menButton}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
            </article>

            <article className="au-dual-card">
              <img
                src={AURA_UNISEX_IMAGES.featureWomen.src}
                srcSet={AURA_UNISEX_IMAGES.featureWomen.srcSet}
                sizes="(max-width: 900px) 100vw, 50vw"
                width={AURA_UNISEX_IMAGES.featureWomen.width}
                height={AURA_UNISEX_IMAGES.featureWomen.height}
                alt={AURA_UNISEX_IMAGES.featureWomen.alt}
                loading="lazy"
              />
              <div className="au-dual-body">
                <h3>{AURA_UNISEX_COPY.womenTitle}</h3>
                <p>{AURA_UNISEX_COPY.womenText}</p>
                <button
                  type="button"
                  className="au-btn au-btn-primary"
                  onClick={() => goToServices(auraGenderTab(services, 'women'))}
                >
                  {AURA_UNISEX_COPY.womenButton}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
            </article>
          </div>
        </section>

        {/* ==================================================================
            5. WELLNESS — full-width soft green section
           ================================================================== */}
        <section id="aura-wellness" data-layout="wellness" className="au-wellness">
          <div className="au-container au-wellness-grid">
            <div className="au-wellness-copy">
              <p className="au-eyebrow">{AURA_UNISEX_COPY.wellnessEyebrow}</p>
              <h2 className="au-section-title">{AURA_UNISEX_COPY.wellnessTitle}</h2>
              <p className="au-section-text">{AURA_UNISEX_COPY.wellnessText}</p>
              {wellnessServices.length > 0 ? (
                <ul className="au-wellness-list">
                  {wellnessServices.slice(0, 3).map((service) => (
                    <li key={service.id}>
                      <div>
                        <strong>{service.name}</strong>
                        {service.showDuration !== false && service.durationMinutes > 0 && (
                          <span>{durationLabel(service.durationMinutes)}</span>
                        )}
                      </div>
                      <span className="au-wellness-price">{money(service.price)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="au-wellness-empty">{AURA_UNISEX_COPY.wellnessEmpty}</p>
              )}
              <button type="button" className="au-btn au-btn-primary" onClick={() => goToServices('Wellness')}>
                {AURA_UNISEX_COPY.wellnessButton}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
            <div className="au-wellness-media">
              <img
                src={AURA_UNISEX_IMAGES.wellness.src}
                srcSet={AURA_UNISEX_IMAGES.wellness.srcSet}
                sizes="(max-width: 900px) 100vw, 50vw"
                width={AURA_UNISEX_IMAGES.wellness.width}
                height={AURA_UNISEX_IMAGES.wellness.height}
                alt={AURA_UNISEX_IMAGES.wellness.alt}
                loading="lazy"
              />
            </div>
          </div>
        </section>

        {/* ==================================================================
            6. OUR TEAM — clean horizontal profile cards
           ================================================================== */}
        {sectionOn('stylists') && team.length > 0 && (
          <section id="aura-team" data-layout="team" className="au-section au-team">
            <div className="au-container">
              <div className="au-section-head">
                <p className="au-eyebrow">{AURA_UNISEX_COPY.teamEyebrow}</p>
                <h2 className="au-section-title">{AURA_UNISEX_COPY.teamTitle}</h2>
                <p className="au-section-text">{AURA_UNISEX_COPY.teamText}</p>
              </div>
              <div className="au-team-grid">
                {team.map((stylist) => (
                  <article className="au-team-card" key={stylist.id}>
                    <img
                      className="au-team-photo"
                      src={stylist.avatarUrl || AURA_UNISEX_IMAGES.aboutWork.src}
                      alt={`${stylist.name}, ${stylist.role}`}
                      loading="lazy"
                    />
                    <div className="au-team-body">
                      <h3>{stylist.name}</h3>
                      <p className="au-team-role">{stylist.role}</p>
                      {stylist.specialties.length > 0 && (
                        <ul className="au-team-skills">
                          {stylist.specialties.slice(0, 3).map((skill) => (
                            <li key={skill}>{skill}</li>
                          ))}
                        </ul>
                      )}
                      <div className="au-team-actions">
                        <button
                          type="button"
                          className="au-btn au-btn-primary au-btn-sm"
                          onClick={() => (bookingAvailable ? onBook(undefined, stylist) : undefined)}
                          disabled={!bookingAvailable}
                        >
                          {AURA_UNISEX_COPY.teamButton}
                        </button>
                        <button
                          type="button"
                          className="au-btn au-btn-ghost au-btn-sm"
                          onClick={() => onViewSpecialist(stylist.id)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================
            7. GALLERY — mixed image grid (one large, four small)
           ================================================================== */}
        {sectionOn('gallery') && gallery.length > 0 && (
          <section id="aura-gallery" data-layout="gallery" className="au-section au-gallery">
            <div className="au-container">
              <div className="au-section-head">
                <p className="au-eyebrow">{AURA_UNISEX_COPY.galleryEyebrow}</p>
                <h2 className="au-section-title">{AURA_UNISEX_COPY.galleryTitle}</h2>
                <p className="au-section-text">{AURA_UNISEX_COPY.galleryText}</p>
                {gallery.some((item) => item.isDemo) && galleryPhotos.length === 0 && (
                  <p className="au-note">Sample salon photography · real salon photos appear here once uploaded.</p>
                )}
              </div>
              <div className="au-gallery-grid">
                {gallery.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`au-gallery-tile${index === 0 ? ' is-featured' : ''}`}
                    onClick={() => setLightbox(index)}
                    aria-label={`View photo ${index + 1}: ${item.title}`}
                  >
                    <img
                      src={item.src}
                      srcSet={item.srcSet || undefined}
                      sizes={index === 0 ? '(max-width: 900px) 100vw, 45vw' : '(max-width: 900px) 50vw, 22vw'}
                      alt={item.title}
                      loading="lazy"
                    />
                    <span className="au-gallery-caption">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================
            8. CUSTOMER REVIEWS — three simple review cards
           ================================================================== */}
        {sectionOn('testimonials') && (
        <section id="aura-reviews" data-layout="experiences" className="au-section au-reviews">
          <div className="au-container">
            <div className="au-section-head">
              <p className="au-eyebrow">{AURA_UNISEX_COPY.reviewsEyebrow}</p>
              <h2 className="au-section-title">{AURA_UNISEX_COPY.reviewsTitle}</h2>
              <p className="au-section-text">{AURA_UNISEX_COPY.reviewsText}</p>
            </div>
            {reviews.length > 0 ? (
              <div className="au-review-grid">
                {reviews.map((review) => (
                  <article className="au-review-card" key={review.id}>
                    <span className="au-review-quote" aria-hidden="true">
                      <Quote size={18} />
                    </span>
                    <div className="au-review-stars" aria-label={`${review.rating || 5} out of 5 stars`}>
                      {Array.from({ length: Math.max(1, Math.min(5, Math.round(review.rating || 5))) }).map((_, i) => (
                        <Star key={i} size={15} fill="currentColor" aria-hidden="true" />
                      ))}
                    </div>
                    <blockquote>{review.comment}</blockquote>
                    <div className="au-review-author">
                      <span className="au-review-initial" aria-hidden="true">
                        {(review.name || 'G').charAt(0)}
                      </span>
                      <div>
                        <strong>{review.name}</strong>
                        {review.serviceName && <span>{review.serviceName}</span>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="au-empty">Be the first to share your Aura salon experience.</p>
            )}
            <ExternalReviewFeed profile={profile} />
            {profile.subdomain && (
              <div className="au-review-panel">
                <CustomerReviewPanel
                  authenticOnly
                  businessType={profile.businessType}
                  slug={profile.subdomain}
                  fallbackReviews={[]}
                  signedIn={Boolean(customerSignedIn)}
                  services={services.map((service) => service.name)}
                  onLogin={() => onAccount('signin')}
                />
              </div>
            )}
          </div>
        </section>
        )}

        {/* Owner-enabled marketing sections keep using the shared workspace components. */}
        {(sectionOn('promo') || sectionOn('videos') || sectionOn('loyalty')) && (
          <div className="au-section au-panels">
            <WebsiteSections
              {...shared}
              sections={['promo', 'videos', 'loyalty'].filter(sectionOn)}
            />
          </div>
        )}

        {/* ==================================================================
            9. BOOKING SECTION — dark banner
           ================================================================== */}
        <section id="aura-booking" data-layout="booking" className="au-booking">
          <div className="au-container au-booking-grid">
            <div className="au-booking-copy">
              <p className="au-booking-eyebrow">{AURA_UNISEX_COPY.bookingEyebrow}</p>
              <h2 className="au-booking-title">{AURA_UNISEX_COPY.bookingTitle}</h2>
              <p className="au-booking-text">{AURA_UNISEX_COPY.bookingText}</p>
              <div className="au-booking-actions">
                <button
                  type="button"
                  className="au-btn au-btn-primary au-btn-lg"
                  onClick={() => onBook(featuredService)}
                >
                  <CalendarCheck size={18} aria-hidden="true" />
                  {AURA_UNISEX_COPY.bookingButton}
                </button>
                {profile.whatsapp && (
                  <a className="au-btn au-btn-outline-light au-btn-lg" href={whatsapp} target="_blank" rel="noreferrer">
                    <MessageCircle size={18} aria-hidden="true" />
                    {AURA_UNISEX_COPY.whatsappNow}
                  </a>
                )}
              </div>
            </div>
            <div className="au-booking-media">
              <img
                src={AURA_UNISEX_IMAGES.booking.src}
                srcSet={AURA_UNISEX_IMAGES.booking.srcSet}
                sizes="(max-width: 900px) 100vw, 50vw"
                width={AURA_UNISEX_IMAGES.booking.width}
                height={AURA_UNISEX_IMAGES.booking.height}
                alt={AURA_UNISEX_IMAGES.booking.alt}
                loading="lazy"
              />
            </div>
          </div>
        </section>

        {/* ==================================================================
            10. CONTACT & SALON DETAILS
           ================================================================== */}
        {sectionOn('location') && (
        <section id="aura-contact" data-layout="location" className="au-section au-contact">
          <div className="au-container au-contact-grid">
            <div className="au-contact-copy">
              <p className="au-eyebrow">{AURA_UNISEX_COPY.contactEyebrow}</p>
              <h2 className="au-section-title">{AURA_UNISEX_COPY.contactTitle}</h2>
              <p className="au-section-text">{AURA_UNISEX_COPY.contactText}</p>
              <ul className="au-contact-list">
                <li>
                  <MapPin size={18} aria-hidden="true" />
                  <span>{address}</span>
                </li>
                {profile.phone && (
                  <li>
                    <Phone size={18} aria-hidden="true" />
                    <a href={`tel:${phoneDigits}`}>{profile.phone}</a>
                  </li>
                )}
                {profile.whatsapp && (
                  <li>
                    <MessageCircle size={18} aria-hidden="true" />
                    <a href={whatsapp} target="_blank" rel="noreferrer">
                      WhatsApp {profile.whatsapp}
                    </a>
                  </li>
                )}
                {profile.email && (
                  <li>
                    <Sparkles size={18} aria-hidden="true" />
                    <a href={`mailto:${profile.email}`}>{profile.email}</a>
                  </li>
                )}
              </ul>
              <div className="au-contact-actions">
                <a className="au-btn au-btn-primary" href={mapsUrl} target="_blank" rel="noreferrer">
                  <MapPin size={17} aria-hidden="true" />
                  {AURA_UNISEX_COPY.directions}
                </a>
                {profile.phone && (
                  <a className="au-btn au-btn-outline" href={`tel:${phoneDigits}`}>
                    <Phone size={17} aria-hidden="true" />
                    {AURA_UNISEX_COPY.callNow}
                  </a>
                )}
              </div>
            </div>

            <div className="au-hours-card">
              <h3>
                <Clock size={18} aria-hidden="true" />
                Opening Hours
              </h3>
              <dl>
                {hours.map((row) => (
                  <div key={row.days}>
                    <dt>{row.days}</dt>
                    <dd>{row.hours}</dd>
                  </div>
                ))}
              </dl>
              {profile.landmark && <p className="au-landmark">Near {profile.landmark}</p>}
              <a className="au-map-link" href={mapsUrl} target="_blank" rel="noreferrer">
                View on Google Maps
                <ArrowRight size={15} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
        )}

        {(sectionOn('policies') || sectionOn('share')) && (
          <div className="au-section au-panels" id="aura-policies">
            <WebsiteSections {...shared} sections={['policies', 'share'].filter(sectionOn)} />
          </div>
        )}

        <AppInstallSection />
        <AppAnnouncementStrip />
      </main>

      {/* ==================================================================
          11. FOOTER — four-column footer
         ================================================================== */}
      <footer data-layout="footer" className="au-footer">
        <div className="au-container au-footer-grid">
          <div className="au-footer-col">
            <span className="au-footer-brand">{brandName}</span>
            <p className="au-footer-about">
              {profile.about ? profile.about.slice(0, 220) : AURA_UNISEX_COPY.aboutDefault.slice(0, 220)}
            </p>
            <span className="au-footer-city">
              <MapPin size={14} aria-hidden="true" />
              {city}
            </span>
          </div>

          <div className="au-footer-col">
            <h4>{AURA_UNISEX_COPY.footerQuickLinks}</h4>
            <ul>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
              <li>
                <a href="#aura-wellness">Wellness</a>
              </li>
            </ul>
          </div>

          <div className="au-footer-col">
            <h4>{AURA_UNISEX_COPY.footerServices}</h4>
            <ul>
              {footerServices.map((service) => (
                <li key={service.id}>
                  <a href="#aura-services">{service.name}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="au-footer-col">
            <h4>{AURA_UNISEX_COPY.footerContact}</h4>
            <ul className="au-footer-contact">
              <li>{address}</li>
              {profile.phone && (
                <li>
                  <a href={`tel:${phoneDigits}`}>{profile.phone}</a>
                </li>
              )}
              {profile.whatsapp && (
                <li>
                  <a href={whatsapp} target="_blank" rel="noreferrer">
                    WhatsApp {profile.whatsapp}
                  </a>
                </li>
              )}
              {profile.email && (
                <li>
                  <a href={`mailto:${profile.email}`}>{profile.email}</a>
                </li>
              )}
            </ul>
            <h4 className="au-footer-follow">{profile.sectionHeadings?.socialTitle || AURA_UNISEX_COPY.footerFollow}</h4>
            {sectionOn('social') && (
            <div className="au-footer-social">
              {instagramHref && (
                <a href={instagramHref} target="_blank" rel="noreferrer" aria-label={`${brandName} on Instagram`}>
                  <Instagram size={17} aria-hidden="true" />
                </a>
              )}
              {facebookHref && (
                <a href={facebookHref} target="_blank" rel="noreferrer" aria-label={`${brandName} on Facebook`}>
                  <Facebook size={17} aria-hidden="true" />
                </a>
              )}
              {youtubeHref && (
                <a href={youtubeHref} target="_blank" rel="noreferrer" aria-label={`${brandName} on YouTube`}>
                  <Youtube size={17} aria-hidden="true" />
                </a>
              )}
            </div>
            )}
          </div>
        </div>

        <div className="au-container au-footer-bottom">
          <span>
            © {year} {brandName}. {AURA_UNISEX_COPY.footerRights}
          </span>
          <span className="au-footer-legal">
            {AURA_UNISEX_COPY.footerLegal.map((label) => (
              <a key={label} href="#aura-policies">
                {label}
              </a>
            ))}
          </span>
          {branding?.poweredBy && <span>Powered by {branding.platformName}</span>}
        </div>
      </footer>

      {/* Gallery lightbox */}
      {lightbox !== null && gallery[lightbox] && (
        <div
          className="au-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery photo viewer"
          onClick={() => setLightbox(null)}
        >
          <button type="button" className="au-lightbox-close" aria-label="Close photo viewer" onClick={() => setLightbox(null)}>
            <X size={22} aria-hidden="true" />
          </button>
          {gallery.length > 1 && (
            <button
              type="button"
              className="au-lightbox-prev"
              aria-label="Previous photo"
              onClick={(event) => {
                event.stopPropagation();
                setLightbox((index) => (index === null ? null : (index - 1 + gallery.length) % gallery.length));
              }}
            >
              <ChevronLeft size={26} aria-hidden="true" />
            </button>
          )}
          <figure className="au-lightbox-figure" onClick={(event) => event.stopPropagation()}>
            <img src={gallery[lightbox].src} alt={gallery[lightbox].title} />
            <figcaption>
              {gallery[lightbox].title}
              <span>
                {lightbox + 1} / {gallery.length}
              </span>
            </figcaption>
          </figure>
          {gallery.length > 1 && (
            <button
              type="button"
              className="au-lightbox-next"
              aria-label="Next photo"
              onClick={(event) => {
                event.stopPropagation();
                setLightbox((index) => (index === null ? null : (index + 1) % gallery.length));
              }}
            >
              <ChevronRight size={26} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AuraUnisexWebsite;
