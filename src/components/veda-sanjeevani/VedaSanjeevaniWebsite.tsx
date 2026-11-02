import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CalendarHeart, Clock3, Menu, MessageCircle, Phone, X } from 'lucide-react';
import type { SalonProfile, SalonService, Stylist } from '../../types';
import type { SalonGalleryPhoto } from '../../lib/photoGallery';
import { WebsiteSections } from '../WebsiteSections';
import {
  VEDA_DEFAULT_PHONE,
  VEDA_FULL_NAME,
  VEDA_SERVICES,
  VEDA_THERAPISTS,
  vedaFontTokens,
  vedaThemeTokens,
  vedaWhatsappLink,
  type VedaConfig,
  type VedaGalleryImage,
} from '../../lib/vedaSanjeevani';
import { vedaConfigFor } from '../../lib/vedaSanjeevaniCustomizer';
import { pageTransition } from '../../lib/motion';
import {
  VedaAnnouncement,
  VedaAboutPage,
  VedaContact,
  VedaContactPage,
  VedaExperts,
  VedaFaq,
  VedaFooter,
  VedaGallery,
  VedaGalleryPage,
  VedaHero,
  VedaMobileBar,
  VedaOffers,
  VedaOffersPage,
  VedaPackages,
  VedaPackagesPage,
  VedaPhilosophy,
  VedaSignature,
  VedaTestimonials,
  VedaTherapiesFeatured,
  VedaTherapyCatalogue,
  VedaWhatsappFab,
  VedaWhy,
  type VedaPage,
  type VedaSectionProps,
} from './VedaSections';
import { VedaBookingPage } from './VedaBooking';
import { VedaBtn, VedaMonogram, VedaPageHead, useVedaBodyLock, useVedaEscape, useVedaScrolled } from './VedaParts';
import '../vedaSanjeevani.css';
import { AppAnnouncementStrip, CustomerAppPromotion } from '../CustomerAppPromotion';

const PAGES: VedaPage[] = ['home', 'about', 'therapies', 'packages', 'gallery', 'experts', 'contact', 'booking', 'offers'];

const NAV: Array<{ page: VedaPage; label: string }> = [
  { page: 'therapies', label: 'Therapies' },
  { page: 'about', label: 'About' },
  { page: 'experts', label: 'Experts' },
  { page: 'gallery', label: 'Gallery' },
  { page: 'packages', label: 'Packages' },
  { page: 'contact', label: 'Contact' },
  { page: 'offers', label: 'Offers' },
];

export type VedaSanjeevaniWebsiteProps = {
  profile: SalonProfile;
  services: SalonService[];
  stylists: Stylist[];
  galleryPhotos?: SalonGalleryPhoto[];
  shared?: Parameters<typeof WebsiteSections>[0];
  enabledSections?: string[];
  showPackages?: boolean;
  customerSignedIn?: boolean;
  customerName?: string;
  customerPhotoUrl?: string;
  bookingAvailable?: boolean;
  readOnly?: boolean;
  live?: boolean;
  /** Start on a specific page — used by the customizer preview. */
  initialPage?: VedaPage;
  /** Controlled page — used by the customizer preview to switch pages. */
  page?: VedaPage;
  onPageChange?: (page: VedaPage) => void;
  onBook: (service?: SalonService, specialist?: Stylist, details?: { note?: string }) => void;
  onAccount?: (mode?: 'signin' | 'signup') => void;
  onMyBookings?: () => void;
  onViewSpecialist?: (id: string) => void;
};

/**
 * Template 14 — Veda Sanjeevani Ayurvedic Wellness & Spa.
 *
 * Renders the whole public website: announcement bar, sticky glass header,
 * cinematic hero, philosophy, therapies, signature experiences, why-us,
 * experts, gallery with lightbox, packages, offers and vouchers, guest stories,
 * FAQs, contact with map, a four-step booking flow and a premium footer.
 *
 * All content comes from the workspace (`profile.veda` + services + stylists)
 * resolved over template defaults, so an owner can edit or hide any part from
 * the Template 14 customizer without touching code. Bookings always go through
 * the platform's own booking system or a real WhatsApp handoff — this component
 * never invents a confirmed appointment.
 */
export function VedaSanjeevaniWebsite(props: VedaSanjeevaniWebsiteProps) {
  const { profile, stylists, galleryPhotos = [], shared, enabledSections = [], bookingAvailable = true, onBook, onPageChange } = props;
  const config = useMemo(() => vedaConfigFor(profile), [profile]);
  const theme = useMemo(() => vedaThemeTokens(config), [config]);
  const fonts = useMemo(() => vedaFontTokens(config), [config]);
  const reduce = useReducedMotion();

  const services = useMemo(() => {
    const list = (props.services || []).filter((service) => service && service.name);
    return list.length ? list : VEDA_SERVICES;
  }, [props.services]);
  const team = useMemo(() => {
    const list = (props.stylists || []).filter((person) => person && person.name && person.status !== 'Inactive');
    return list.length ? list : VEDA_THERAPISTS;
  }, [props.stylists]);

  const [internalPage, setInternalPage] = useState<VedaPage>(() => {
    if (props.initialPage && (PAGES as string[]).includes(props.initialPage)) return props.initialPage;
    if (typeof window === 'undefined') return 'home';
    const hash = (window.location?.hash || '').replace('#', '').toLowerCase();
    return (PAGES as string[]).includes(hash) ? (hash as VedaPage) : 'home';
  });
  const page = props.page && (PAGES as string[]).includes(props.page) ? props.page : internalPage;
  // Keep the controlled/uncontrolled switch harmless if a preview passes `page`.
  const setPage = setInternalPage;
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(config.faq.items[0]?.id || null);
  const [copiedCode, setCopiedCode] = useState('');
  const [bookingSeed, setBookingSeed] = useState<{ serviceId?: string; stylistId?: string }>({});
  const scrolled = useVedaScrolled(20);
  useVedaBodyLock(menuOpen);
  useVedaEscape(menuOpen, useCallback(() => setMenuOpen(false), []));

  const brandName = (profile.businessName || '').trim() || VEDA_FULL_NAME;
  const city = (profile.city || '').trim();
  const phone = (profile.phone || profile.whatsapp || VEDA_DEFAULT_PHONE).trim();
  const whatsappNumber = (profile.whatsapp || profile.phone || VEDA_DEFAULT_PHONE).replace(/[^\d]/g, '');
  const whatsappHref = vedaWhatsappLink(
    whatsappNumber,
    `Hello ${brandName}, I would like to book an Ayurvedic ritual. Please share available slots.`,
  );
  const telHref = `tel:${phone.replace(/[^\d+]/g, '')}`;

  const galleryImages = useMemo<VedaGalleryImage[]>(() => {
    const owned = galleryPhotos
      .filter((photo) => photo && photo.url && !photo.isDemo)
      .map((photo) => ({ id: `owner-${photo.id}`, url: photo.url, title: photo.title || 'The sanctuary', caption: '' }));
    const seen = new Set<string>();
    const bundled = config.gallery.images.filter((image) => {
      if (image.visible === false) return false; // hidden in the dashboard
      if (seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });
    const ownerUrls = new Set(owned.map((image) => image.url));
    return [...owned, ...bundled.filter((image) => !ownerUrls.has(image.url))];
  }, [galleryPhotos, config.gallery.images]);

  const navigate = useCallback((next: VedaPage) => {
    setPage(next);
    onPageChange?.(next);
    setMenuOpen(false);
    setLightbox(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
      try {
        history.replaceState(null, '', next === 'home' ? window.location.pathname + window.location.search : `#${next}`);
      } catch {
        /* history may be restricted in embeds — navigation still works */
      }
    }
  }, [onPageChange]);

  const startBooking = useCallback(
    (service?: SalonService, stylist?: Stylist) => {
      setBookingSeed({ serviceId: service?.id, stylistId: stylist?.id });
      navigate('booking');
    },
    [navigate],
  );

  const copyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(''), 2600);
    } catch {
      setCopiedCode('');
    }
  }, []);

  const sectionProps: VedaSectionProps = {
    config,
    profile,
    services,
    stylists: team,
    galleryImages,
    navigate,
    onBook: startBooking,
    whatsappHref,
    telHref,
    copyCode: (code) => void copyCode(code),
    copiedCode,
    openFaq,
    onToggleFaq: setOpenFaq,
    onOpenLightbox: setLightbox,
    lightbox,
    onCloseLightbox: () => setLightbox(null),
    onViewSpecialist: props.onViewSpecialist,
  };

  const styleVars = {
    '--vd-forest': theme.forest,
    '--vd-forest-deep': theme.forestDeep,
    '--vd-ivory': theme.ivory,
    '--vd-sand': theme.sand,
    '--vd-sage': theme.sage,
    '--vd-sage-soft': theme.sageSoft,
    '--vd-gold': theme.gold,
    '--vd-gold-soft': theme.goldSoft,
    '--vd-ink': theme.ink,
    '--vd-font-heading': fonts.headingStack,
    '--vd-font-body': fonts.bodyStack,
  } as React.CSSProperties;

  const renderShared = () =>
    shared && enabledSections.length ? (
      <div className="vd-shared">
        <div className="vd-container">
          <WebsiteSections {...(shared as any)} sections={enabledSections} />
        </div>
      </div>
    ) : null;

  const home = (
    <>
      <VedaHero {...sectionProps} />
      {config.sections.philosophy ? <VedaPhilosophy {...sectionProps} /> : null}
      {config.sections.therapies ? <VedaTherapiesFeatured {...sectionProps} /> : null}
      {config.sections.signature ? <VedaSignature {...sectionProps} /> : null}
      {config.sections.why ? <VedaWhy {...sectionProps} /> : null}
      {config.sections.experts ? <VedaExperts {...sectionProps} /> : null}
      {config.sections.gallery ? <VedaGallery {...sectionProps} /> : null}
      {config.sections.packages ? <VedaPackages {...sectionProps} /> : null}
      {config.sections.offers ? <VedaOffers {...sectionProps} /> : null}
      {config.sections.testimonials ? <VedaTestimonials {...sectionProps} /> : null}
      {config.sections.faq ? <VedaFaq {...sectionProps} /> : null}
      {config.sections.contact ? <VedaContact {...sectionProps} /> : null}
      {renderShared()}
    </>
  );

  const body =
    page === 'about' ? (
      <VedaAboutPage {...sectionProps} />
    ) : page === 'therapies' ? (
      <VedaTherapyCatalogue {...sectionProps} />
    ) : page === 'packages' ? (
      <VedaPackagesPage {...sectionProps} />
    ) : page === 'gallery' ? (
      <VedaGalleryPage {...sectionProps} />
    ) : page === 'experts' ? (
      <>
        <VedaPageHead crumb="Experts" title="The people who will look after you." body={config.experts.body}>
          <button type="button" onClick={() => navigate('home')}>Home</button> <span aria-hidden="true">/</span>
        </VedaPageHead>
        <VedaExperts {...sectionProps} />
        {renderShared()}
      </>
    ) : page === 'offers' ? (
      <VedaOffersPage {...sectionProps} />
    ) : page === 'contact' ? (
      <VedaContactPage {...sectionProps} />
    ) : page === 'booking' ? (
      <VedaBookingPage
        {...sectionProps}
        bookingAvailable={bookingAvailable}
        initialServiceId={bookingSeed.serviceId}
        initialStylistId={bookingSeed.stylistId}
        onBook={(service, stylist) => onBook(service, stylist)}
      />
    ) : (
      home
    );

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="vd-site"
        data-theme={config.theme}
        data-buttons={config.buttonStyle}
        data-layout={config.layout}
        style={styleVars}
      >
        <a className="vd-sr-only" href="#vd-main">Skip to content</a>
        <AppAnnouncementStrip />
        {config.sections.announcement ? <VedaAnnouncement config={config} navigate={navigate} /> : null}

        <header className="vd-header" data-scrolled={scrolled}>
          <div className="vd-container vd-header__inner">
            <a
              className="vd-brand"
              href="#home"
              onClick={(event) => {
                event.preventDefault();
                navigate('home');
              }}
              aria-label={`${brandName} — home`}
            >
              <span className="vd-brand__mark">
                {profile.logoUrl ? <img src={profile.logoUrl} alt="" /> : <VedaMonogram size={36} withRing={false} />}
              </span>
              <span className="vd-brand__text">
                <span className="vd-brand__name">{brandName}</span>
                <span className="vd-brand__sub">{city ? `Ayurveda · ${city.split(',')[0]}` : 'Ayurveda & wellness'}</span>
              </span>
            </a>

            <nav className="vd-nav" aria-label="Primary">
              {NAV.slice(0, 6).map((item) => (
                <button
                  key={item.page}
                  type="button"
                  className="vd-nav__link"
                  aria-current={page === item.page ? 'page' : undefined}
                  onClick={() => navigate(item.page)}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="vd-header__actions">
              <a className="vd-header__phone" href={telHref}>
                <Phone size={14} aria-hidden="true" /> {phone}
              </a>
              {props.customerSignedIn ? (
                <div className="vd-account" aria-label="Customer account">
                  <button type="button" className="vd-account__btn" aria-label="Manage your customer account" onClick={() => props.onAccount?.('signin')}>
                    {props.customerPhotoUrl ? (
                      <img className="vd-account__avatar" src={props.customerPhotoUrl} alt="" width={28} height={28} loading="lazy" />
                    ) : (
                      <span className="vd-account__avatar vd-account__avatar--initial" aria-hidden="true">{(props.customerName || 'G').slice(0, 1).toUpperCase()}</span>
                    )}
                    <span className="vd-account__name">{props.customerName || 'My account'}</span>
                  </button>
                </div>
              ) : (
                <div className="vd-account vd-account--guest" aria-label="Customer account">
                  <button type="button" className="vd-account__link" onClick={() => props.onAccount?.('signin')}>Customer Login</button>
                  <button type="button" className="vd-account__link" onClick={() => props.onAccount?.('signup')}>Sign up</button>
                </div>
              )}
              {props.onMyBookings ? (
                <button type="button" className="vd-account__link vd-account__bookings" onClick={props.onMyBookings}>My Bookings</button>
              ) : null}
              <VedaBtn size="sm" onClick={() => navigate('booking')}>
                Book Appointment
              </VedaBtn>
              <button type="button" className="vd-burger" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
                {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </header>

        {menuOpen ? (
          <div className="vd-drawer" role="dialog" aria-modal="true" aria-label="Menu" onClick={() => setMenuOpen(false)}>
            <div className="vd-drawer__panel" onClick={(event) => event.stopPropagation()}>
              <div className="vd-drawer__head">
                <span className="vd-brand__name">Menu</span>
                <button type="button" className="vd-burger" style={{ display: 'grid' }} onClick={() => setMenuOpen(false)} aria-label="Close menu">
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <nav className="vd-drawer__links" aria-label="Mobile">
                <button type="button" onClick={() => navigate('home')}>Home <ArrowRight size={15} aria-hidden="true" /></button>
                {NAV.map((item) => (
                  <button key={item.page} type="button" onClick={() => navigate(item.page)}>
                    {item.label} <ArrowRight size={15} aria-hidden="true" />
                  </button>
                ))}
              </nav>
              <div className="vd-drawer__foot">
                <VedaBtn block onClick={() => navigate('booking')}>
                  <CalendarHeart size={16} aria-hidden="true" /> Book appointment
                </VedaBtn>
                <VedaBtn block variant="ghost" href={whatsappHref} target="_blank">
                  <MessageCircle size={16} aria-hidden="true" /> WhatsApp us
                </VedaBtn>
                {props.customerSignedIn ? (
                  <div className="vd-account vd-account--drawer" aria-label="Customer account">
                    {props.customerPhotoUrl ? <img className="vd-account__avatar" src={props.customerPhotoUrl} alt="" width={30} height={30} loading="lazy" /> : null}
                    <button type="button" className="vd-account__link" aria-label="Manage your customer account" onClick={() => props.onAccount?.('signin')}>{props.customerName || 'My profile & settings'}</button>
                    {props.onMyBookings ? <button type="button" className="vd-account__link" onClick={props.onMyBookings}>My Bookings</button> : null}
                  </div>
                ) : (
                  <div className="vd-account vd-account--drawer" aria-label="Customer account">
                    <button type="button" className="vd-account__link" onClick={() => props.onAccount?.('signin')}>Customer Login</button>
                    <button type="button" className="vd-account__link" onClick={() => props.onAccount?.('signup')}>Sign up</button>
                  </div>
                )}
                <div className="vd-drawer__meta">
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <Phone size={13} aria-hidden="true" /> {phone}
                  </span>
                  {config.contact.hours[0] ? (
                    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <Clock3 size={13} aria-hidden="true" /> {config.contact.hours[0].label}: {config.contact.hours[0].value}
                    </span>
                  ) : null}
                  <span>{profile.address}{city ? `, ${city}` : ''}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <main id="vd-main" tabIndex={-1}>
          {reduce ? (
            <div key={page}>{body}</div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={page} variants={pageTransition} initial="hidden" animate="visible" exit="exit">
                {body}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        <CustomerAppPromotion />
        <VedaFooter config={config} profile={profile} navigate={navigate} telHref={telHref} whatsappHref={whatsappHref} />
        <VedaMobileBar config={config} navigate={navigate} whatsappHref={whatsappHref} />
        <VedaWhatsappFab whatsappHref={whatsappHref} />
        {profile.subdomain || props.live ? null : (
          <p className="vd-sr-only">
            Preview of the Veda Sanjeevani template. Publish this website to make the booking links live.
          </p>
        )}
      </div>
    </MotionConfig>
  );
}

export default VedaSanjeevaniWebsite;
