import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Calendar,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Facebook,
  Gift,
  Instagram,
  Leaf,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Play,
  Quote,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Ticket,
  UserCheck,
  Users,
  X,
  Youtube,
} from 'lucide-react';
import type { SalonProfile, SalonService, Stylist } from '../types';
import type { SalonGalleryPhoto } from '../lib/photoGallery';
import { clientExperiences } from '../lib/demoWebsiteContent';
import { isPackage } from '../lib/packageCatalogue';
import { loyaltyTheme } from '../lib/loyaltyTheme';
import { promotionActive, usePromotionClock } from '../lib/promotionStatus';
import { publicSalonOffers, offerDiscountLabel } from '../lib/salonOffers';
import { reelSource } from '../lib/socialVideoSource';
import { socialUrl } from '../lib/websiteContent';
import { AppAnnouncementStrip, AppInstallSection } from './AppInstallSection';
import { CustomerReviewPanel } from './CustomerReviewPanel';
import { ExternalReviewFeed } from './ExternalReviewFeed';
import { InlineEditable } from './InlineEditable';
import { WebsiteSections } from './WebsiteSections';
import {
  AURA_CATEGORY_PILLARS,
  AURA_DEMO_OFFERS,
  AURA_DEMO_REELS,
  AURA_DEMO_REWARDS,
  AURA_LOYALTY_TIERS,
  AURA_UNISEX_COPY,
  AURA_UNISEX_IMAGES,
  AURA_VIDEO_FILTERS,
  AURA_WHY_CHOOSE_US,
  auraAddress,
  auraBrand,
  auraCity,
  auraCssVariables,
  auraGenderTab,
  auraHours,
  auraMapsUrl,
  auraPhoneDigits,
  auraServiceImage,
  auraServiceTabs,
  auraServicesForTab,
  auraTeamImage,
  auraWhatsApp,
  durationLabel,
  money,
  type AuraReelItem,
  type AuraServiceTab,
  type AuraVideoFilter,
} from '../lib/auraUnisex';
import './auraUnisex.css';

type SharedWebsiteProps = React.ComponentProps<typeof WebsiteSections>;

export interface AuraDirectSlot {
  date: string;
  time: string;
  stylistId: string;
  branchId?: string;
}

export interface AuraUnisexWebsiteProps {
  profile: SalonProfile;
  services: SalonService[];
  stylists: SalonStylistList;
  galleryPhotos: SalonGalleryPhoto[];
  shared: SharedWebsiteProps;
  enabledSections: string[];
  showPackages: boolean;
  customerSignedIn?: boolean;
  customerName?: string;
  customerPhotoUrl?: string;
  bookingAvailable?: boolean;
  branding?: { platformName: string; poweredBy: boolean; supportEmail: string } | null;
  onBook: (
    service?: SalonService,
    stylist?: Stylist,
    slot?: AuraDirectSlot,
    couponCode?: string,
  ) => void;
  onAccount: (mode?: 'signin' | 'signup') => void;
  onMyBookings: () => void;
  onViewSpecialist: (stylistId: string) => void;
}

type SalonStylistList = Stylist[];

interface GalleryItem {
  id: string;
  src: string;
  srcSet: string;
  title: string;
  tag: string;
  isDemo: boolean;
}

const BOOKING_TIME_SLOTS = [
  { value: '10:30', label: '10:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '14:30', label: '2:30 PM' },
  { value: '16:30', label: '4:30 PM' },
  { value: '18:30', label: '6:30 PM' },
];

function upcomingDays(count = 5): Array<{ iso: string; dayLabel: string; dateNum: string; month: string }> {
  const out: Array<{ iso: string; dayLabel: string; dateNum: string; month: string }> = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({
      iso,
      dayLabel: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dateNum: String(d.getDate()).padStart(2, '0'),
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
    });
  }
  return out;
}

export const AuraUnisexWebsite: React.FC<AuraUnisexWebsiteProps> = ({
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
  const [videoFilter, setVideoFilter] = useState<AuraVideoFilter>('All Videos');
  const [activeReel, setActiveReel] = useState<AuraReelItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [promoToast, setPromoToast] = useState('');

  // Quick-reserve planner state (purely UI convenience that forwards exact IDs into BookingModal)
  const bookableDays = useMemo(() => upcomingDays(5), []);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedStylistId, setSelectedStylistId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => bookableDays[0]?.iso || '');
  const [selectedTime, setSelectedTime] = useState<string>('12:00');

  const brandName = auraBrand(profile);
  const city = auraCity(profile);
  const address = auraAddress(profile);
  const mapsUrl = auraMapsUrl(profile);
  const whatsapp = auraWhatsApp(profile);
  const phoneDigits = auraPhoneDigits(profile);
  const hours = auraHours(profile);
  const cssVars = auraCssVariables(profile) as React.CSSProperties;

  const sectionOn = (id: string) => enabledSections.includes(id);

  const tabs = useMemo(() => auraServiceTabs(services), [services]);
  const activeTab: AuraServiceTab = tabs.includes(tab) ? tab : 'All Services';
  const visibleServices = useMemo(() => auraServicesForTab(services, activeTab), [services, activeTab]);
  const wellnessServices = useMemo(() => auraServicesForTab(services, 'Wellness'), [services]);
  const popularServices = useMemo(() => services.filter((service) => service.popular).slice(0, 4), [services]);
  const footerServices = popularServices.length > 0 ? popularServices : services.slice(0, 4);
  const team = stylists.slice(0, 6);
  const packages = useMemo(() => services.filter((service) => isPackage(service)), [services]);
  const reviews = useMemo(() => clientExperiences(profile).slice(0, 3), [profile]);

  const featuredService = services.find((service) => service.popular) || services[0];
  const plannerService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || featuredService,
    [services, selectedServiceId, featuredService],
  );
  const plannerStylist = useMemo(
    () => team.find((st) => st.id === selectedStylistId),
    [team, selectedStylistId],
  );

  // Navigation links only point to sections that exist on the rendered page.
  const navLinks = useMemo(() => {
    const links: Array<{ label: string; href: string }> = [];
    if (sectionOn('hero')) links.push({ label: AURA_UNISEX_COPY.navHome, href: '#aura-home' });
    if (sectionOn('services')) links.push({ label: AURA_UNISEX_COPY.navServices, href: '#aura-services' });
    if (sectionOn('about')) links.push({ label: AURA_UNISEX_COPY.navAbout, href: '#aura-about' });
    if (sectionOn('stylists') && team.length > 0) links.push({ label: AURA_UNISEX_COPY.navTeam, href: '#aura-team' });
    if (sectionOn('gallery')) links.push({ label: AURA_UNISEX_COPY.navGallery, href: '#aura-gallery' });
    if (sectionOn('videos')) links.push({ label: AURA_UNISEX_COPY.navVideos, href: '#salon-videos' });
    if (sectionOn('location')) links.push({ label: AURA_UNISEX_COPY.navContact, href: '#aura-contact' });
    return links;
  }, [enabledSections, team.length]);

  const gallery: GalleryItem[] = useMemo(() => {
    const demoTags = ['Men’s Haircut', 'Women’s Styling', 'Botanical Colour', 'Salon Lounge', 'Beard Grooming'];
    if (galleryPhotos.length > 0) {
      return galleryPhotos.map((photo, index) => ({
        id: photo.id,
        src: photo.url,
        srcSet: '',
        title: photo.title || photo.category,
        tag: photo.isDemo ? demoTags[index % demoTags.length] : photo.category || 'Salon Work',
        isDemo: photo.isDemo === true,
      }));
    }
    return AURA_UNISEX_IMAGES.gallery.map((image, index) => ({
      id: `aura-gallery-${index + 1}`,
      src: image.src,
      srcSet: image.srcSet,
      title: image.alt,
      tag: demoTags[index % demoTags.length],
      isDemo: true,
    }));
  }, [galleryPhotos]);

  // Unisex Video Gallery: owner's custom saved videos lead; demo reels stand in unless explicitly cleared.
  const reels: AuraReelItem[] = useMemo(() => {
    const ownerVideos = (profile.socialVideos || []).filter((video) => !video.isDemo && Boolean(reelSource(video)));
    if (ownerVideos.length > 0) {
      return ownerVideos.map((video, idx) => {
        const src = reelSource(video)!;
        const fallbackPoster = AURA_DEMO_REELS[idx % AURA_DEMO_REELS.length].posterSrc;
        return {
          id: video.id,
          title: video.title || `${brandName} Studio Reel ${idx + 1}`,
          subtitle: video.description || 'Real salon styling and care from our team.',
          category: AURA_DEMO_REELS[idx % AURA_DEMO_REELS.length].category,
          audience: 'Salon Reel',
          duration: 'Short',
          videoId: src.id,
          embedUrl:
            src.platform === 'YouTube'
              ? `https://www.youtube-nocookie.com/embed/${src.id}?autoplay=1&rel=0`
              : src.url,
          externalUrl: src.url,
          posterSrc: video.thumbnailUrl || fallbackPoster,
          channelLabel: video.channelTitle || brandName,
          isDemo: false,
        };
      });
    }
    if (profile.demoVideosInitialized && (!profile.socialVideos || profile.socialVideos.length === 0)) {
      return [];
    }
    return AURA_DEMO_REELS;
  }, [profile.socialVideos, profile.demoVideosInitialized, brandName]);

  const visibleReels = useMemo(() => {
    if (videoFilter === 'All Videos') return reels;
    return reels.filter((item) => item.category === videoFilter);
  }, [reels, videoFilter]);

  // Promotions & Offers: active owner campaign + live offers, or Aura's 3 unisex vouchers in preview.
  const promotionNow = usePromotionClock();
  const campaign = profile.promoCampaign;
  const hasActiveCampaign = Boolean(campaign && promotionActive(campaign, promotionNow));
  const publishedOffers = useMemo(() => publicSalonOffers(profile, promotionNow), [profile, promotionNow]);
  const displayOffers = useMemo(() => {
    if (publishedOffers.length > 0) {
      return publishedOffers.map((offer) => ({
        id: offer.id,
        badge: offer.badge || offerDiscountLabel(offer),
        audience: 'Salon Offer',
        title: offer.title,
        description: offer.description || 'Special seasonal privilege from our salon team.',
        code: offer.couponCode || '',
        validity: offer.validTo ? `Ends ${new Date(offer.validTo).toLocaleDateString('en-IN')}` : 'Limited period',
        matchedService: services.find((s) => offer.applicableServices?.includes(s.id)) || featuredService,
        isDemo: Boolean(offer.isDemo),
      }));
    }
    if (profile.subdomain) return [];
    return AURA_DEMO_OFFERS.map((offer) => ({
      id: offer.id,
      badge: offer.badge,
      audience: offer.audience,
      title: offer.title,
      description: offer.description,
      code: offer.code,
      validity: offer.validity,
      matchedService: services.find((s) => offer.serviceMatchPattern.test(`${s.name} ${s.category}`)) || featuredService,
      isDemo: true,
    }));
  }, [publishedOffers, profile.subdomain, services, featuredService]);

  // Loyalty & Rewards: respects shared.loyaltyConfig when provided; uses Aura sample rewards in standalone template preview.
  const rewardTheme = useMemo(() => loyaltyTheme(profile), [profile]);
  const loyaltyConfig = shared.loyaltyConfig;
  const activeLoyaltyRewards = useMemo(() => {
    if (loyaltyConfig) {
      if (!loyaltyConfig.programEnabled) return [];
      return (loyaltyConfig.rewards || []).filter((r) => r.isActive);
    }
    if (!profile.subdomain) return AURA_DEMO_REWARDS;
    return [];
  }, [loyaltyConfig, profile.subdomain]);
  const isSampleLoyalty = !loyaltyConfig && !profile.subdomain;

  const canManage = !shared.readOnly && Boolean(shared.onManage);

  // Escape & body scroll lock for gallery lightbox or video modal
  useEffect(() => {
    if ((lightbox === null && !activeReel) || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightbox(null);
        setActiveReel(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightbox, activeReel]);

  const goToServices = (next: AuraServiceTab) => {
    const resolved = tabs.includes(next) ? next : 'All Services';
    setTab(resolved);
    setMenuOpen(false);
    if (typeof document === 'undefined') return;
    document.getElementById('aura-services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCopyPromo = async (code: string) => {
    if (!code) return;
    setPromoToast('');
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setPromoToast(`Offer code ${code} copied — apply it when confirming your booking.`);
      if (typeof window !== 'undefined') {
        window.setTimeout(() => setCopiedCode((prev) => (prev === code ? null : prev)), 2600);
      }
    } catch {
      setCopiedCode(code);
      setPromoToast(`Use code ${code} at booking checkout.`);
    }
  };

  const handlePlannerBook = () => {
    const slot: AuraDirectSlot | undefined =
      selectedDate && selectedTime
        ? {
            date: selectedDate,
            time: selectedTime,
            stylistId: plannerStylist?.id || '',
          }
        : undefined;
    onBook(plannerService, plannerStylist, slot);
  };

  const instagramHref = socialUrl(profile.instagramHandle, 'instagram');
  const facebookHref = socialUrl(profile.facebookPage, 'facebook');
  const youtubeHref = socialUrl(profile.youtubeChannel, 'youtube');
  const year = new Date().getFullYear();

  return (
    <div className="au-site" style={cssVars}>
      {/* ==================================================================
          HEADER — Architectural sticky bar (NO App Install in header!)
         ================================================================== */}
      <header className="au-header" aria-label="Customer account and salon navigation">
        <div className="au-header-inner">
          <a className="au-brand" href="#aura-home" aria-label={`${brandName} home`}>
            {profile.logoUrl ? (
              <img className="au-brand-logo" src={profile.logoUrl} alt={brandName} />
            ) : (
              <span className="au-brand-mark" aria-hidden="true">
                <span>A</span>
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
            <button type="button" className="au-btn au-btn-primary au-header-cta" onClick={() => onBook(featuredService)}>
              {AURA_UNISEX_COPY.heroPrimary}
            </button>
            <button
              type="button"
              className="au-menu-toggle"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile slide-out drawer (strictly navigation, booking & account — NO App Install here) */}
        <div
          className={`au-mobile-scrim${menuOpen ? ' is-open' : ''}`}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
        <div
          className={`au-mobile-menu${menuOpen ? ' is-open' : ''}`}
          role={menuOpen ? 'dialog' : undefined}
          aria-label="Salon menu"
          aria-hidden={!menuOpen}
        >
          <div className="au-mobile-menu-top">
            <span className="au-mobile-menu-brand">{brandName}</span>
            <button
              type="button"
              className="au-mobile-close"
              aria-label="Close mobile menu"
              onClick={() => setMenuOpen(false)}
            >
              <X size={19} aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Mobile salon sections">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                <span>{link.label}</span>
                <ArrowRight size={15} aria-hidden="true" />
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
              <div className="au-mobile-auth-row">
                <button
                  type="button"
                  className="au-btn au-btn-ghost"
                  onClick={() => {
                    setMenuOpen(false);
                    onAccount('signin');
                  }}
                >
                  Customer Login
                </button>
                <button
                  type="button"
                  className="au-btn au-btn-ghost"
                  onClick={() => {
                    setMenuOpen(false);
                    onAccount('signup');
                  }}
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ==================================================================
            1. HERO BANNER — Asymmetric Editorial Split + Unisex Visual Stage
           ================================================================== */}
        {sectionOn('hero') && (
          <section id="aura-home" data-layout="hero" className="au-hero" aria-label="Aura unisex salon welcome">
            <div className="au-hero-ambient" aria-hidden="true" />
            <div className="au-container au-hero-layout">
              <div className="au-hero-copy">
                <div className="au-hero-kicker">
                  <span className="au-gold-dot" aria-hidden="true" />
                  <span>{AURA_UNISEX_COPY.heroEyebrow}</span>
                  <span className="au-kicker-sep" aria-hidden="true">·</span>
                  <span className="au-kicker-city">{city}</span>
                </div>

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

                <div className="au-hero-metrics" aria-label="Studio highlights">
                  <div className="au-metric-item">
                    <strong>4.95 ★</strong>
                    <span>Rated by Men &amp; Women</span>
                  </div>
                  <div className="au-metric-divider" aria-hidden="true" />
                  <div className="au-metric-item">
                    <strong>Him &amp; Her</strong>
                    <span>Dedicated Styling Zones</span>
                  </div>
                  <div className="au-metric-divider" aria-hidden="true" />
                  <div className="au-metric-item">
                    <strong>100% Clean</strong>
                    <span>Ammonia-Free &amp; Organic</span>
                  </div>
                </div>

                <ul className="au-hero-points" aria-label="Salon promises">
                  {AURA_UNISEX_COPY.heroPoints.map((point) => (
                    <li key={point}>
                      <Check size={14} aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="au-hero-stage">
                <figure className="au-hero-arch-frame">
                  <img
                    className="au-hero-main-img"
                    src={AURA_UNISEX_IMAGES.heroMain.src}
                    srcSet={AURA_UNISEX_IMAGES.heroMain.srcSet}
                    sizes="(max-width: 920px) 100vw, 34vw"
                    width={AURA_UNISEX_IMAGES.heroMain.width}
                    height={AURA_UNISEX_IMAGES.heroMain.height}
                    alt={AURA_UNISEX_IMAGES.heroMain.alt}
                  />
                  <figcaption className="au-hero-arch-badge">
                    <Sparkles size={14} aria-hidden="true" />
                    <span>Male &amp; Female Salon Specialists</span>
                  </figcaption>
                </figure>

                <div className="au-hero-side-stack">
                  <button
                    type="button"
                    className="au-hero-duo-card"
                    onClick={() => goToServices(auraGenderTab(services, 'men'))}
                  >
                    <img
                      src={AURA_UNISEX_IMAGES.heroMen.src}
                      srcSet={AURA_UNISEX_IMAGES.heroMen.srcSet}
                      sizes="(max-width: 920px) 50vw, 20vw"
                      width={AURA_UNISEX_IMAGES.heroMen.width}
                      height={AURA_UNISEX_IMAGES.heroMen.height}
                      alt={AURA_UNISEX_IMAGES.heroMen.alt}
                      loading="lazy"
                    />
                    <div className="au-hero-duo-meta">
                      <span>{AURA_UNISEX_COPY.heroCardMen}</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </div>
                  </button>

                  <button
                    type="button"
                    className="au-hero-duo-card"
                    onClick={() => goToServices(auraGenderTab(services, 'women'))}
                  >
                    <img
                      src={AURA_UNISEX_IMAGES.heroWomen.src}
                      srcSet={AURA_UNISEX_IMAGES.heroWomen.srcSet}
                      sizes="(max-width: 920px) 50vw, 20vw"
                      width={AURA_UNISEX_IMAGES.heroWomen.width}
                      height={AURA_UNISEX_IMAGES.heroWomen.height}
                      alt={AURA_UNISEX_IMAGES.heroWomen.alt}
                      loading="lazy"
                    />
                    <div className="au-hero-duo-meta">
                      <span>{AURA_UNISEX_COPY.heroCardWomen}</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </div>
                  </button>

                  <div className="au-care-box">
                    <span className="au-care-icon" aria-hidden="true">
                      <Leaf size={17} />
                    </span>
                    <div>
                      <strong>{AURA_UNISEX_COPY.heroCareBoxTitle}</strong>
                      <span>{AURA_UNISEX_COPY.heroCareBoxText}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================
            2. SALON CATEGORIES — 5-Zone Architectural Category Showcase
           ================================================================== */}
        {sectionOn('services') && services.length > 0 && (
          <section id="aura-categories" className="au-section au-categories">
            <div className="au-container">
              <div className="au-split-head">
                <div>
                  <p className="au-eyebrow">{AURA_UNISEX_COPY.categoriesEyebrow}</p>
                  <h2 className="au-section-title">{AURA_UNISEX_COPY.categoriesTitle}</h2>
                </div>
                <p className="au-section-text au-head-side-note">{AURA_UNISEX_COPY.categoriesText}</p>
              </div>

              <div className="au-cat-grid">
                {AURA_CATEGORY_PILLARS.map((pillar) => {
                  const matching = auraServicesForTab(services, pillar.tab);
                  const count = matching.length;
                  const minPrice = count > 0 ? Math.min(...matching.map((s) => Number(s.price) || 0)) : null;
                  const isSelected = activeTab === pillar.tab;
                  return (
                    <button
                      type="button"
                      key={pillar.id}
                      className={`au-cat-card${isSelected ? ' is-selected' : ''}`}
                      onClick={() => goToServices(pillar.tab)}
                    >
                      <div className="au-cat-media">
                        <img
                          src={pillar.image.src}
                          srcSet={pillar.image.srcSet}
                          sizes="(max-width: 640px) 100vw, (max-width: 1120px) 50vw, 20vw"
                          alt={pillar.image.alt}
                          loading="lazy"
                        />
                        <span className="au-cat-audience">{pillar.audience}</span>
                      </div>
                      <div className="au-cat-body">
                        <h3>{pillar.title}</h3>
                        <p>{pillar.subtitle}</p>
                        <div className="au-cat-foot">
                          <span>
                            {count > 0 && minPrice !== null
                              ? `${count} ${count === 1 ? 'service' : 'services'} · From ${money(minPrice)}`
                              : 'Browse menu'}
                          </span>
                          <span className="au-cat-arrow" aria-hidden="true">
                            <ArrowRight size={15} />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================
            3. SERVICES — Category Filter Bar + Boutique Horizontal Menu Cards
               (All existing Template 03 service data & IDs kept 100% intact)
           ================================================================== */}
        {sectionOn('services') && (
          <section id="aura-services" data-layout="services" className="au-section au-services">
            <div className="au-container">
              <div className="au-split-head">
                <div>
                  <p className="au-eyebrow">{AURA_UNISEX_COPY.servicesEyebrow}</p>
                  <h2 className="au-section-title">{AURA_UNISEX_COPY.servicesTitle}</h2>
                  <p className="au-section-text">{AURA_UNISEX_COPY.servicesText}</p>
                </div>
                {services.length > 0 && (
                  <div className="au-menu-summary-pill">
                    <Scissors size={15} aria-hidden="true" />
                    <span>{visibleServices.length} Services Shown</span>
                  </div>
                )}
              </div>

              {services.length === 0 ? (
                <p className="au-empty">Service details will appear here once the salon adds them.</p>
              ) : (
                <>
                  <div className="au-tabs" role="tablist" aria-label="Service categories">
                    {tabs.map((item) => {
                      const itemCount =
                        item === 'All Services' ? services.length : auraServicesForTab(services, item).length;
                      return (
                        <button
                          key={item}
                          type="button"
                          role="tab"
                          aria-selected={activeTab === item}
                          className={`au-tab${activeTab === item ? ' is-active' : ''}`}
                          onClick={() => setTab(item)}
                        >
                          <span>{item}</span>
                          <small className="au-tab-count" aria-hidden="true">
                            {itemCount}
                          </small>
                        </button>
                      );
                    })}
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
                              sizes="(max-width: 640px) 100vw, (max-width: 1120px) 50vw, 260px"
                              alt={image.alt}
                              loading="lazy"
                            />
                            {service.popular && <span className="au-popular-tag">Popular</span>}
                          </div>
                          <div className="au-service-body">
                            <div className="au-service-top">
                              <span className="au-service-category">{service.category}</span>
                              {service.showDuration !== false && service.durationMinutes > 0 && (
                                <span className="au-service-time">
                                  <Clock size={13} aria-hidden="true" />
                                  {durationLabel(service.durationMinutes)}
                                </span>
                              )}
                            </div>
                            <h3 className="au-service-name">{service.name}</h3>
                            {service.description && <p className="au-service-text">{service.description}</p>}
                            <div className="au-service-meta">
                              <div className="au-service-price-wrap">
                                <span className="au-price-caption">Menu Price</span>
                                <span className="au-service-price">{money(service.price)}</span>
                              </div>
                              <button
                                type="button"
                                className="au-btn au-btn-primary au-service-cta"
                                onClick={() => onBook(service)}
                              >
                                {AURA_UNISEX_COPY.bookNow}
                                <ArrowRight size={15} aria-hidden="true" />
                              </button>
                            </div>
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
            3b. VALUE COMBO PACKAGES — Gold-Trimmed Salon Pass Cards
           ================================================================== */}
        {showPackages && packages.length > 0 && (
          <section id="salon-packages" className="au-section au-packages">
            <div className="au-container">
              <div className="au-split-head">
                <div>
                  <p className="au-eyebrow">{AURA_UNISEX_COPY.packagesEyebrow}</p>
                  <h2 className="au-section-title">{AURA_UNISEX_COPY.packagesTitle}</h2>
                </div>
                <p className="au-section-text au-head-side-note">{AURA_UNISEX_COPY.packagesText}</p>
              </div>

              <div className="au-package-grid">
                {packages.map((pkg, idx) => {
                  const image = pkg.imageUrl
                    ? { src: pkg.imageUrl, srcSet: '', alt: pkg.name }
                    : auraServiceImage(pkg);
                  return (
                    <article className="au-package-card" key={pkg.id}>
                      <div className="au-package-media">
                        <img
                          src={image.src}
                          srcSet={image.srcSet || undefined}
                          sizes="(max-width: 640px) 100vw, (max-width: 1120px) 50vw, 33vw"
                          alt={image.alt}
                          loading="lazy"
                        />
                        <span className="au-package-pass">Combo 0{idx + 1}</span>
                      </div>
                      <div className="au-package-body">
                        {pkg.category && <span className="au-service-category">{pkg.category}</span>}
                        <h3 className="au-service-name">{pkg.name}</h3>
                        {pkg.description && <p className="au-service-text">{pkg.description}</p>}
                        <div className="au-package-footer">
                          <div>
                            <span className="au-service-price">{money(pkg.price)}</span>
                            {pkg.showDuration !== false && pkg.durationMinutes > 0 && (
                              <span className="au-package-duration">
                                <Clock size={13} aria-hidden="true" />
                                {durationLabel(pkg.durationMinutes)}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="au-btn au-btn-primary au-btn-sm"
                            onClick={() => (bookingAvailable ? onBook(pkg) : undefined)}
                            disabled={!bookingAvailable}
                          >
                            {AURA_UNISEX_COPY.packagesButton}
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

        {/* ==================================================================
            4. ABOUT THE SALON — Magazine Triptych Spread
           ================================================================== */}
        {sectionOn('about') && (
          <section id="aura-about" data-layout="about" className="au-section au-about">
            <div className="au-container au-about-layout">
              <div className="au-about-copy">
                <p className="au-eyebrow">{AURA_UNISEX_COPY.aboutEyebrow}</p>
                <h2 className="au-section-title">{AURA_UNISEX_COPY.aboutTitle}</h2>
                <p className="au-about-lead">{profile.about ? profile.about : AURA_UNISEX_COPY.aboutDefault}</p>

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

                <div className="au-about-footer">
                  <div className="au-director-note">
                    <span className="au-director-badge" aria-hidden="true">
                      {(profile.ownerName || 'P').charAt(0)}
                    </span>
                    <div>
                      <strong>{profile.ownerName || 'Priya Nair'}</strong>
                      <span>{profile.ownerRole || 'Executive Salon Director'}</span>
                    </div>
                  </div>
                  {team.length > 0 && (
                    <a className="au-btn au-btn-outline" href="#aura-team">
                      {AURA_UNISEX_COPY.aboutButton}
                      <ArrowRight size={16} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>

              <div className="au-about-mosaic">
                <figure className="au-about-primary-frame">
                  <img
                    src={AURA_UNISEX_IMAGES.aboutInterior.src}
                    srcSet={AURA_UNISEX_IMAGES.aboutInterior.srcSet}
                    sizes="(max-width: 920px) 100vw, 46vw"
                    width={AURA_UNISEX_IMAGES.aboutInterior.width}
                    height={AURA_UNISEX_IMAGES.aboutInterior.height}
                    alt={AURA_UNISEX_IMAGES.aboutInterior.alt}
                    loading="lazy"
                  />
                </figure>
                <div className="au-about-secondary-row">
                  <figure className="au-about-detail-frame">
                    <img
                      src={AURA_UNISEX_IMAGES.aboutWork.src}
                      srcSet={AURA_UNISEX_IMAGES.aboutWork.srcSet}
                      sizes="(max-width: 920px) 55vw, 22vw"
                      width={AURA_UNISEX_IMAGES.aboutWork.width}
                      height={AURA_UNISEX_IMAGES.aboutWork.height}
                      alt={AURA_UNISEX_IMAGES.aboutWork.alt}
                      loading="lazy"
                    />
                  </figure>
                  <div className="au-about-plaque">
                    <span className="au-plaque-year">EST. 2020</span>
                    <strong>Inclusive Unisex Lounge</strong>
                    <p>Separate styling, grooming and quiet skin-wellness zones under one calm roof.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================
            5. WHY CHOOSE US + FOR HIM & HER + WELLNESS SANCTUARY
           ================================================================== */}
        <section id="aura-why-us" className="au-section au-why">
          <div className="au-container">
            <div className="au-split-head">
              <div>
                <p className="au-eyebrow">{AURA_UNISEX_COPY.whyEyebrow}</p>
                <h2 className="au-section-title">{AURA_UNISEX_COPY.whyTitle}</h2>
              </div>
              <p className="au-section-text au-head-side-note">{AURA_UNISEX_COPY.whyText}</p>
            </div>

            <div className="au-why-grid">
              {AURA_WHY_CHOOSE_US.map((pillar, idx) => {
                const Icon = idx === 0 ? Users : idx === 1 ? Leaf : idx === 2 ? ShieldCheck : Award;
                return (
                  <article className="au-why-card" key={pillar.number}>
                    <div className="au-why-top">
                      <span className="au-why-num">{pillar.number}</span>
                      <span className="au-why-icon" aria-hidden="true">
                        <Icon size={18} />
                      </span>
                    </div>
                    <span className="au-why-tag">{pillar.tag}</span>
                    <h3>{pillar.title}</h3>
                    <p>{pillar.description}</p>
                  </article>
                );
              })}
            </div>

            {/* Dual Men's & Women's Editorial Panels */}
            <div id="aura-for-everyone" className="au-dual-grid" aria-label="Services for men and women">
              <article className="au-dual-card">
                <div className="au-dual-media">
                  <img
                    src={AURA_UNISEX_IMAGES.featureMen.src}
                    srcSet={AURA_UNISEX_IMAGES.featureMen.srcSet}
                    sizes="(max-width: 920px) 100vw, 50vw"
                    width={AURA_UNISEX_IMAGES.featureMen.width}
                    height={AURA_UNISEX_IMAGES.featureMen.height}
                    alt={AURA_UNISEX_IMAGES.featureMen.alt}
                    loading="lazy"
                  />
                  <span className="au-dual-pill">FOR HIM</span>
                </div>
                <div className="au-dual-body">
                  <h3>{AURA_UNISEX_COPY.menTitle}</h3>
                  <p>{AURA_UNISEX_COPY.menText}</p>
                  <button
                    type="button"
                    className="au-btn au-btn-primary"
                    onClick={() => goToServices(auraGenderTab(services, 'men'))}
                  >
                    {AURA_UNISEX_COPY.menButton}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </article>

              <article className="au-dual-card">
                <div className="au-dual-media">
                  <img
                    src={AURA_UNISEX_IMAGES.featureWomen.src}
                    srcSet={AURA_UNISEX_IMAGES.featureWomen.srcSet}
                    sizes="(max-width: 920px) 100vw, 50vw"
                    width={AURA_UNISEX_IMAGES.featureWomen.width}
                    height={AURA_UNISEX_IMAGES.featureWomen.height}
                    alt={AURA_UNISEX_IMAGES.featureWomen.alt}
                    loading="lazy"
                  />
                  <span className="au-dual-pill">FOR HER</span>
                </div>
                <div className="au-dual-body">
                  <h3>{AURA_UNISEX_COPY.womenTitle}</h3>
                  <p>{AURA_UNISEX_COPY.womenText}</p>
                  <button
                    type="button"
                    className="au-btn au-btn-primary"
                    onClick={() => goToServices(auraGenderTab(services, 'women'))}
                  >
                    {AURA_UNISEX_COPY.womenButton}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ==================================================================
            5b. WELLNESS LOUNGE — Calm Architectural Split Band
           ================================================================== */}
        <section id="aura-wellness" className="au-wellness">
          <div className="au-container">
            <div className="au-wellness-shell">
              <div className="au-wellness-media">
                <img
                  src={AURA_UNISEX_IMAGES.wellness.src}
                  srcSet={AURA_UNISEX_IMAGES.wellness.srcSet}
                  sizes="(max-width: 920px) 100vw, 48vw"
                  width={AURA_UNISEX_IMAGES.wellness.width}
                  height={AURA_UNISEX_IMAGES.wellness.height}
                  alt={AURA_UNISEX_IMAGES.wellness.alt}
                  loading="lazy"
                />
              </div>
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
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================
            6. OUR HAIR EXPERTS — Tall 4:5 Editorial Portrait Cards
           ================================================================== */}
        {sectionOn('stylists') && team.length > 0 && (
          <section id="aura-team" data-layout="team" className="au-section au-team">
            <div className="au-container">
              <div className="au-split-head">
                <div>
                  <p className="au-eyebrow">{AURA_UNISEX_COPY.teamEyebrow}</p>
                  <h2 className="au-section-title">{AURA_UNISEX_COPY.teamTitle}</h2>
                </div>
                <p className="au-section-text au-head-side-note">{AURA_UNISEX_COPY.teamText}</p>
              </div>

              <div className="au-team-grid">
                {team.map((stylist, index) => {
                  const portrait = auraTeamImage(stylist, index);
                  const fallbackSrc = AURA_UNISEX_IMAGES.team[index % AURA_UNISEX_IMAGES.team.length].src;
                  return (
                    <article className="au-team-card" key={stylist.id}>
                      <div className="au-team-portrait">
                        <img
                          className="au-team-photo"
                          src={portrait.src}
                          srcSet={portrait.srcSet || undefined}
                          sizes="(max-width: 640px) 100vw, (max-width: 1120px) 50vw, 33vw"
                          alt={portrait.alt}
                          loading="lazy"
                          onError={(event) => {
                            if (event.currentTarget.dataset.fallback !== '1') {
                              event.currentTarget.dataset.fallback = '1';
                              event.currentTarget.srcset = '';
                              event.currentTarget.src = fallbackSrc;
                            }
                          }}
                        />
                        {typeof stylist.rating === 'number' && stylist.rating > 0 && (
                          <span className="au-team-rating">
                            <Star size={13} fill="currentColor" aria-hidden="true" />
                            {stylist.rating.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="au-team-body">
                        <p className="au-team-role">{stylist.role}</p>
                        <h3>{stylist.name}</h3>
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
                            className="au-btn au-btn-outline au-btn-sm"
                            onClick={() => onViewSpecialist(stylist.id)}
                          >
                            View profile &amp; reviews
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

        {/* ==================================================================
            7. GALLERY — Fixed 5-Tile Architectural Bento Mosaic (Zero Collages)
           ================================================================== */}
        {sectionOn('gallery') && gallery.length > 0 && (
          <section id="aura-gallery" data-layout="gallery" className="au-section au-gallery">
            <div className="au-container">
              <div className="au-split-head">
                <div>
                  <p className="au-eyebrow">{AURA_UNISEX_COPY.galleryEyebrow}</p>
                  <h2 className="au-section-title">{AURA_UNISEX_COPY.galleryTitle}</h2>
                  <p className="au-section-text">{AURA_UNISEX_COPY.galleryText}</p>
                </div>
                {gallery.some((item) => item.isDemo) && galleryPhotos.length === 0 && (
                  <span className="au-sample-pill">Sample salon photography · Replaced when owner uploads</span>
                )}
              </div>

              <div className={`au-gallery-grid au-gallery-count-${Math.min(gallery.length, 6)}`}>
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
                      sizes={index === 0 ? '(max-width: 920px) 100vw, 44vw' : '(max-width: 920px) 50vw, 27vw'}
                      alt={item.title}
                      loading="lazy"
                    />
                    <span className="au-gallery-tag">{item.tag}</span>
                    <span className="au-gallery-caption">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================
            8. VIDEO GALLERY — Unisex Styling & Grooming Reels (Men & Women)
           ================================================================== */}
        {sectionOn('videos') && (
          <section id="salon-videos" data-section="videos" className="au-section au-videos">
            <div className="au-container">
              <div className="au-split-head">
                <div>
                  <p className="au-eyebrow au-eyebrow-gold">{AURA_UNISEX_COPY.videosEyebrow}</p>
                  <InlineEditable
                    tag="h2"
                    className="au-section-title au-title-light"
                    value={profile.sectionHeadings?.videosTitle || AURA_UNISEX_COPY.videosTitle}
                    isEditingActive={Boolean(shared.isEditingActive && !shared.readOnly && shared.setProfile)}
                    onSave={(value) =>
                      shared.setProfile?.((prev) => ({
                        ...prev,
                        sectionHeadings: { ...prev.sectionHeadings, videosTitle: String(value) },
                      }))
                    }
                  />
                  <p className="au-section-text au-text-light">
                    {profile.sectionHeadings?.videosSubtitle || AURA_UNISEX_COPY.videosText}
                  </p>
                </div>
                <div className="au-video-head-actions">
                  {reels.some((r) => r.isDemo) && (
                    <span className="au-sample-pill au-sample-pill-dark">Reference Shorts · Unisex Care</span>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      className="au-btn au-btn-outline-light au-btn-sm"
                      onClick={() => shared.onManage?.('social_connectivity')}
                    >
                      Manage Videos
                    </button>
                  )}
                </div>
              </div>

              {reels.length > 0 ? (
                <>
                  <div className="au-video-filters" role="tablist" aria-label="Video categories">
                    {AURA_VIDEO_FILTERS.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        role="tab"
                        aria-selected={videoFilter === filter}
                        className={`au-video-chip${videoFilter === filter ? ' is-active' : ''}`}
                        onClick={() => setVideoFilter(filter)}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  <div className="au-video-grid">
                    {visibleReels.map((reel) => (
                      <article className="au-video-card" key={reel.id}>
                        <button
                          type="button"
                          className="sf-reel-media"
                          onClick={() => setActiveReel(reel)}
                          aria-label={`Play video: ${reel.title}`}
                        >
                          <img
                            src={reel.posterSrc}
                            srcSet={reel.posterSrcSet || undefined}
                            sizes="(max-width: 640px) 100vw, (max-width: 1120px) 33vw, 20vw"
                            alt={reel.title}
                            loading="lazy"
                            onError={(event) => {
                              if (event.currentTarget.dataset.fallback !== '1') {
                                event.currentTarget.dataset.fallback = '1';
                                event.currentTarget.srcset = '';
                                event.currentTarget.src = AURA_UNISEX_IMAGES.aboutInterior.src;
                              }
                            }}
                          />
                          <span className="au-video-shade" aria-hidden="true" />
                          <span className="au-video-top-row">
                            <span className="au-video-audience">{reel.audience}</span>
                            <span className="au-video-duration">{reel.duration}</span>
                          </span>
                          <span className="au-video-play" aria-hidden="true">
                            <Play size={20} fill="currentColor" />
                          </span>
                          <span className="au-video-bottom">
                            <strong>{reel.title}</strong>
                            <small>{reel.subtitle}</small>
                          </span>
                        </button>
                        <div className="au-video-meta-bar">
                          <span>{reel.channelLabel}</span>
                          <a href={reel.externalUrl} target="_blank" rel="noopener noreferrer">
                            Watch <ExternalLink size={12} aria-hidden="true" />
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <p className="au-empty">Short salon styling reels will appear here once added.</p>
              )}
            </div>
          </section>
        )}

        {/* ==================================================================
            9. CUSTOMER REVIEWS — Rating Summary Bar + Quote Cards
           ================================================================== */}
        {sectionOn('testimonials') && (
          <section id="aura-reviews" data-layout="experiences" className="au-section au-reviews">
            <div className="au-container">
              <div className="au-reviews-header-card">
                <div>
                  <p className="au-eyebrow">{AURA_UNISEX_COPY.reviewsEyebrow}</p>
                  <h2 className="au-section-title">{AURA_UNISEX_COPY.reviewsTitle}</h2>
                  <p className="au-section-text">{AURA_UNISEX_COPY.reviewsText}</p>
                </div>
                <div className="au-rating-badge-box" aria-label="Average salon rating 4.95 out of 5">
                  <span className="au-rating-score">4.95</span>
                  <div>
                    <div className="au-rating-stars" aria-hidden="true">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star key={idx} size={15} fill="currentColor" />
                      ))}
                    </div>
                    <span>Unisex Hair, Grooming &amp; Skin</span>
                  </div>
                </div>
              </div>

              {reviews.length > 0 ? (
                <div className="au-review-grid">
                  {reviews.map((review) => (
                    <article className="au-review-card" key={review.id}>
                      <div className="au-review-card-top">
                        <span className="au-review-quote" aria-hidden="true">
                          <Quote size={17} />
                        </span>
                        <div className="au-review-stars" aria-label={`${review.rating || 5} out of 5 stars`}>
                          {Array.from({ length: Math.max(1, Math.min(5, Math.round(review.rating || 5))) }).map(
                            (_, i) => (
                              <Star key={i} size={14} fill="currentColor" aria-hidden="true" />
                            ),
                          )}
                        </div>
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

        {/* ==================================================================
            10. PROMOTIONS & OFFERS — Perforated Boutique Offer Vouchers
           ================================================================== */}
        {sectionOn('promo') && (
          <section id="salon-promo" data-section="promo" className="au-section au-offers">
            <div className="au-container">
              <div className="au-split-head">
                <div>
                  <p className="au-eyebrow">{AURA_UNISEX_COPY.promoEyebrow}</p>
                  <h2 className="au-section-title">{AURA_UNISEX_COPY.promoTitle}</h2>
                  <p className="au-section-text">{AURA_UNISEX_COPY.promoText}</p>
                </div>
                <div className="au-offer-head-actions">
                  {displayOffers.some((o) => o.isDemo) && (
                    <span className="au-sample-pill">
                      <Tag size={13} aria-hidden="true" />
                      Sample Salon Offers
                    </span>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      className="au-btn au-btn-outline au-btn-sm"
                      onClick={() => shared.onManage?.('marketing')}
                    >
                      Manage Offers
                    </button>
                  )}
                </div>
              </div>

              {promoToast && (
                <div className="au-promo-toast" role="status" aria-live="polite">
                  <Check size={15} aria-hidden="true" />
                  <span>{promoToast}</span>
                </div>
              )}

              {/* Owner's featured promotional campaign banner when active */}
              {hasActiveCampaign && campaign && (
                <article className="au-campaign-banner">
                  {campaign.imageUrl && (
                    <div className="au-campaign-media">
                      <img src={campaign.imageUrl} alt={campaign.headline || 'Salon offer'} loading="lazy" />
                    </div>
                  )}
                  <div className="au-campaign-body">
                    <span className="au-offer-badge">FEATURED SALON PRIVILEGE</span>
                    <h3>{campaign.headline || 'Special Salon Offer'}</h3>
                    {campaign.customOfferText && <p className="au-campaign-highlight">{campaign.customOfferText}</p>}
                    {campaign.subtext && <p className="au-campaign-sub">{campaign.subtext}</p>}
                    <div className="au-campaign-actions">
                      {campaign.promoCode && (
                        <button
                          type="button"
                          className="au-code-chip"
                          onClick={() => void handleCopyPromo(campaign.promoCode)}
                        >
                          <Ticket size={14} aria-hidden="true" />
                          <span>{campaign.promoCode}</span>
                          <Copy size={13} aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="au-btn au-btn-primary"
                        onClick={() =>
                          onBook(
                            services.find((s) => s.id === campaign.selectedServiceId) || featuredService,
                            undefined,
                            undefined,
                            campaign.promoCode || undefined,
                          )
                        }
                      >
                        Claim &amp; Book
                      </button>
                    </div>
                  </div>
                </article>
              )}

              {displayOffers.length > 0 ? (
                <div className="au-offer-grid">
                  {displayOffers.map((offer) => (
                    <article className="au-offer-voucher" key={offer.id}>
                      <div className="au-offer-top">
                        <span className="au-offer-badge">{offer.badge}</span>
                        <span className="au-offer-audience">{offer.audience}</span>
                      </div>
                      <h3>{offer.title}</h3>
                      <p>{offer.description}</p>
                      <div className="au-offer-perforation" aria-hidden="true" />
                      <div className="au-offer-bottom">
                        <div className="au-offer-code-wrap">
                          {offer.code ? (
                            <button
                              type="button"
                              className="au-code-chip"
                              aria-label={`Copy offer code ${offer.code}`}
                              onClick={() => void handleCopyPromo(offer.code)}
                            >
                              <span>{copiedCode === offer.code ? `✓ ${offer.code}` : offer.code}</span>
                              <Copy size={13} aria-hidden="true" />
                            </button>
                          ) : (
                            <span className="au-offer-validity">{offer.validity}</span>
                          )}
                          {offer.code && <small className="au-offer-validity">{offer.validity}</small>}
                        </div>
                        <button
                          type="button"
                          className="au-btn au-btn-primary au-btn-sm"
                          onClick={() => onBook(offer.matchedService, undefined, undefined, offer.code || undefined)}
                        >
                          Apply &amp; Book
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                !hasActiveCampaign && (
                  <p className="au-empty">Current seasonal offers will appear here when announced by the salon.</p>
                )
              )}
            </div>
          </section>
        )}

        {/* ==================================================================
            11. LOYALTY & REWARDS — Aura Wellness Club Tier Strip & Reward Cards
           ================================================================== */}
        {sectionOn('loyalty') && (
          <section
            id="salon-loyalty"
            data-section="loyalty"
            data-loyalty-template={profile.businessType}
            data-loyalty-mode={rewardTheme.dark ? 'dark' : 'light'}
            className="au-section au-loyalty"
            style={rewardTheme.style as React.CSSProperties}
          >
            <div className="au-container">
              <div className="au-loyalty-shell">
                <div className="au-split-head">
                  <div>
                    <p className="au-eyebrow">
                      <Gift size={14} aria-hidden="true" /> {AURA_UNISEX_COPY.loyaltyEyebrow}
                    </p>
                    <InlineEditable
                      tag="h2"
                      className="au-section-title"
                      value={profile.sectionHeadings?.loyaltyTitle || AURA_UNISEX_COPY.loyaltyTitle}
                      isEditingActive={Boolean(shared.isEditingActive && !shared.readOnly && shared.setProfile)}
                      onSave={(value) =>
                        shared.setProfile?.((prev) => ({
                          ...prev,
                          sectionHeadings: { ...prev.sectionHeadings, loyaltyTitle: String(value) },
                        }))
                      }
                    />
                    <p className="au-section-text">{AURA_UNISEX_COPY.loyaltyText}</p>
                  </div>
                  <div className="au-loyalty-head-actions">
                    {isSampleLoyalty && <span className="au-sample-pill">Sample Loyalty Club</span>}
                    {canManage && (
                      <button
                        type="button"
                        className="au-btn au-btn-outline au-btn-sm"
                        onClick={() => shared.onManage?.('loyalty')}
                      >
                        Edit Rewards
                      </button>
                    )}
                  </div>
                </div>

                {/* Membership tier overview */}
                <div className="au-tier-strip" aria-label="Wellness Club membership tiers">
                  {AURA_LOYALTY_TIERS.map((tier, idx) => (
                    <div className={`au-tier-pill${idx === 2 ? ' is-gold' : ''}`} key={tier.name}>
                      <div className="au-tier-top">
                        <strong>{tier.name}</strong>
                        <span>{tier.threshold}</span>
                      </div>
                      <p>{tier.perk}</p>
                    </div>
                  ))}
                </div>

                {activeLoyaltyRewards.length > 0 ? (
                  <div className="au-loyalty-grid">
                    {activeLoyaltyRewards.map((reward) => (
                      <article className="sf-loyalty-card au-loyalty-card" key={reward.id}>
                        <div className="au-loyalty-card-head">
                          <span className="sf-loyalty-points au-points-badge">
                            <Star size={13} aria-hidden="true" />
                            {reward.requiredPoints} points required
                          </span>
                        </div>
                        <h3>{reward.title}</h3>
                        <p className="sf-loyalty-description">{reward.description}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="au-empty">
                    {canManage
                      ? 'Enable your loyalty programme and add active rewards to show customer benefits here.'
                      : 'Ask the salon about its current loyalty benefits.'}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================
            12. BOOKING SECTION — Salon Lounge Visual + Quick-Reserve Planner
           ================================================================== */}
        <section id="aura-booking" className="au-booking">
          <div className="au-container au-booking-layout">
            <div className="au-booking-left">
              <p className="au-booking-eyebrow">{AURA_UNISEX_COPY.bookingEyebrow}</p>
              <h2 className="au-booking-title">{AURA_UNISEX_COPY.bookingTitle}</h2>
              <p className="au-booking-text">{AURA_UNISEX_COPY.bookingText}</p>

              <figure className="au-booking-photo-frame">
                <img
                  src={AURA_UNISEX_IMAGES.booking.src}
                  srcSet={AURA_UNISEX_IMAGES.booking.srcSet}
                  sizes="(max-width: 920px) 100vw, 48vw"
                  width={AURA_UNISEX_IMAGES.booking.width}
                  height={AURA_UNISEX_IMAGES.booking.height}
                  alt={AURA_UNISEX_IMAGES.booking.alt}
                  loading="lazy"
                />
                <figcaption>Unisex Hair, Beard, Colour &amp; Wellness — {city}</figcaption>
              </figure>

              {profile.whatsapp && (
                <div className="au-booking-wa-row">
                  <span>Prefer booking by chat?</span>
                  <a className="au-btn au-btn-outline-light" href={whatsapp} target="_blank" rel="noreferrer">
                    <MessageCircle size={17} aria-hidden="true" />
                    {AURA_UNISEX_COPY.whatsappNow}
                  </a>
                </div>
              )}
            </div>

            <div className="au-booking-planner" aria-label="Quick appointment planner">
              <div className="au-planner-head">
                <span className="au-planner-kicker">
                  <Calendar size={14} aria-hidden="true" /> Instant Slot Request
                </span>
                <h3>Choose Your Service &amp; Preferred Time</h3>
              </div>

              {services.length > 0 && (
                <div className="au-planner-field">
                  <label htmlFor="aura-planner-service">1. Select Service</label>
                  <select
                    id="aura-planner-service"
                    value={plannerService?.id || ''}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                  >
                    {services.map((svc) => (
                      <option key={svc.id} value={svc.id}>
                        {svc.name} — {money(svc.price)}
                        {svc.showDuration !== false && svc.durationMinutes > 0 ? ` (${svc.durationMinutes} min)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {team.length > 0 && (
                <div className="au-planner-field">
                  <label htmlFor="aura-planner-stylist">2. Preferred Expert</label>
                  <select
                    id="aura-planner-stylist"
                    value={selectedStylistId}
                    onChange={(e) => setSelectedStylistId(e.target.value)}
                  >
                    <option value="">Any Available Salon Specialist</option>
                    {team.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} — {st.role}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="au-planner-field">
                <span className="au-planner-label">3. Preferred Day</span>
                <div className="au-day-chips" role="group" aria-label="Preferred appointment day">
                  {bookableDays.map((day) => (
                    <button
                      type="button"
                      key={day.iso}
                      className={`au-day-chip${selectedDate === day.iso ? ' is-active' : ''}`}
                      aria-pressed={selectedDate === day.iso}
                      onClick={() => setSelectedDate(day.iso)}
                    >
                      <small>{day.dayLabel}</small>
                      <strong>
                        {day.dateNum} {day.month}
                      </strong>
                    </button>
                  ))}
                </div>
              </div>

              <div className="au-planner-field">
                <span className="au-planner-label">4. Preferred Time Window</span>
                <div className="au-time-chips" role="group" aria-label="Preferred time window">
                  {BOOKING_TIME_SLOTS.map((slot) => (
                    <button
                      type="button"
                      key={slot.value}
                      className={`au-time-chip${selectedTime === slot.value ? ' is-active' : ''}`}
                      aria-pressed={selectedTime === slot.value}
                      onClick={() => setSelectedTime(slot.value)}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              {plannerService && (
                <div className="au-planner-summary">
                  <div>
                    <span>Selected Service</span>
                    <strong>{plannerService.name}</strong>
                  </div>
                  <span className="au-planner-price">{money(plannerService.price)}</span>
                </div>
              )}

              <button
                type="button"
                className="au-btn au-btn-primary au-btn-lg au-btn-block"
                onClick={handlePlannerBook}
              >
                <CalendarCheck size={18} aria-hidden="true" />
                {AURA_UNISEX_COPY.bookingButton}
              </button>
            </div>
          </div>
        </section>

        {/* ==================================================================
            13. CONTACT DETAILS — 3-Card Studio Concierge Directory
           ================================================================== */}
        {sectionOn('location') && (
          <section id="aura-contact" data-layout="location" className="au-section au-contact">
            <div className="au-container">
              <div className="au-split-head">
                <div>
                  <p className="au-eyebrow">{AURA_UNISEX_COPY.contactEyebrow}</p>
                  <h2 className="au-section-title">{AURA_UNISEX_COPY.contactTitle}</h2>
                </div>
                <p className="au-section-text au-head-side-note">{AURA_UNISEX_COPY.contactText}</p>
              </div>

              <div className="au-contact-cards">
                {/* Card 1: Location & Directions */}
                <article className="au-contact-card">
                  <span className="au-contact-icon" aria-hidden="true">
                    <MapPin size={20} />
                  </span>
                  <h3>Salon Location</h3>
                  <p className="au-contact-address">{address}</p>
                  {profile.landmark && <p className="au-landmark">Near {profile.landmark}</p>}
                  <div className="au-contact-card-actions">
                    <a className="au-btn au-btn-primary au-btn-sm" href={mapsUrl} target="_blank" rel="noreferrer">
                      <MapPin size={15} aria-hidden="true" />
                      {AURA_UNISEX_COPY.directions}
                    </a>
                    <a className="au-map-link" href={mapsUrl} target="_blank" rel="noreferrer">
                      View on Google Maps
                      <ArrowRight size={14} aria-hidden="true" />
                    </a>
                  </div>
                </article>

                {/* Card 2: Direct Reception Desk */}
                <article className="au-contact-card">
                  <span className="au-contact-icon" aria-hidden="true">
                    <Phone size={20} />
                  </span>
                  <h3>Direct Reception Desk</h3>
                  <ul className="au-contact-list">
                    {profile.phone && (
                      <li>
                        <Phone size={16} aria-hidden="true" />
                        <a href={`tel:${phoneDigits}`}>{profile.phone}</a>
                      </li>
                    )}
                    {profile.whatsapp && (
                      <li>
                        <MessageCircle size={16} aria-hidden="true" />
                        <a href={whatsapp} target="_blank" rel="noreferrer">
                          WhatsApp {profile.whatsapp}
                        </a>
                      </li>
                    )}
                    {profile.email && (
                      <li>
                        <Sparkles size={16} aria-hidden="true" />
                        <a href={`mailto:${profile.email}`}>{profile.email}</a>
                      </li>
                    )}
                  </ul>
                  <div className="au-contact-card-actions">
                    {profile.phone && (
                      <a className="au-btn au-btn-outline au-btn-sm" href={`tel:${phoneDigits}`}>
                        <Phone size={15} aria-hidden="true" />
                        {AURA_UNISEX_COPY.callNow}
                      </a>
                    )}
                    {profile.whatsapp && (
                      <a
                        className="au-btn au-btn-ghost au-btn-sm"
                        href={whatsapp}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle size={15} aria-hidden="true" />
                        {AURA_UNISEX_COPY.whatsappNow}
                      </a>
                    )}
                  </div>
                </article>

                {/* Card 3: Opening Hours */}
                <article className="au-hours-card">
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
                  <p className="au-walkin-note">Walk-ins welcome · Advance booking recommended on weekends.</p>
                </article>
              </div>
            </div>
          </section>
        )}

        {(sectionOn('policies') || sectionOn('share')) && (
          <div className="au-section au-panels" id="aura-policies">
            <WebsiteSections {...shared} sections={['policies', 'share'].filter(sectionOn)} />
          </div>
        )}
      </main>

      {/* ==================================================================
          14. FOOTER — App Install Strictly in Footer + 4-Column Salon Footer
         ================================================================== */}
      <footer data-layout="footer" className="au-footer-wrap">
        <div className="au-footer-app-zone">
          <AppAnnouncementStrip />
          <div className="au-container au-footer-app-inner">
            <AppInstallSection />
          </div>
        </div>

        <div className="au-footer">
          <div className="au-container au-footer-grid">
            <div className="au-footer-col">
              <div className="au-footer-brand-row">
                <span className="au-footer-crest" aria-hidden="true">
                  A
                </span>
                <div>
                  <span className="au-footer-brand">{brandName}</span>
                  <span className="au-footer-sub">{AURA_UNISEX_COPY.brandSublabel}</span>
                </div>
              </div>
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
                  <a href="#aura-wellness">Wellness Lounge</a>
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
                <li>
                  <a href="/?app=1&install=1" className="au-footer-install-link">
                    Install Customer App →
                  </a>
                </li>
              </ul>

              {sectionOn('social') && (
                <div data-section="social" className="au-footer-social-wrap">
                  <h4 className="au-footer-follow">
                    {profile.sectionHeadings?.socialTitle || AURA_UNISEX_COPY.footerFollow}
                  </h4>
                  {instagramHref || facebookHref || youtubeHref ? (
                    <div className="au-footer-social">
                      {instagramHref && (
                        <a
                          href={instagramHref}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`${brandName} on Instagram`}
                        >
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
                  ) : (
                    <p className="au-footer-social-note">Follow our salon updates in {city}.</p>
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
        </div>
      </footer>

      {/* Gallery Lightbox Modal */}
      {lightbox !== null && gallery[lightbox] && (
        <div
          className="au-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery photo viewer"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="au-lightbox-close"
            aria-label="Close photo viewer"
            onClick={() => setLightbox(null)}
          >
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
              <span>{gallery[lightbox].title}</span>
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

      {/* Video Player Modal */}
      {activeReel && (
        <div
          className="au-lightbox au-video-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Playing reel: ${activeReel.title}`}
          onClick={() => setActiveReel(null)}
        >
          <div className="au-video-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="au-video-modal-head">
              <div>
                <span className="au-video-modal-tag">{activeReel.audience}</span>
                <h3>{activeReel.title}</h3>
              </div>
              <button
                type="button"
                className="au-video-modal-close"
                aria-label="Close video player"
                onClick={() => setActiveReel(null)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="au-video-frame-wrap">
              {activeReel.embedUrl.includes('youtube-nocookie.com/embed/') ? (
                <iframe
                  src={activeReel.embedUrl}
                  title={activeReel.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="au-video-external-fallback">
                  <img src={activeReel.posterSrc} alt={activeReel.title} />
                  <a
                    className="au-btn au-btn-primary"
                    href={activeReel.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Reel on Instagram <ExternalLink size={16} aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>
            <div className="au-video-modal-foot">
              <span>{activeReel.channelLabel}</span>
              <button
                type="button"
                className="au-btn au-btn-primary au-btn-sm"
                onClick={() => {
                  setActiveReel(null);
                  onBook(featuredService);
                }}
              >
                {AURA_UNISEX_COPY.heroPrimary}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuraUnisexWebsite;
