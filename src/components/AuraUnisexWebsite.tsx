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
import { ServiceMerchTags, ServiceTerms } from './ServiceMerchandising';
import { loyaltyTheme } from '../lib/loyaltyTheme';
import { promotionActive, usePromotionClock } from '../lib/promotionStatus';
import { publicSalonOffers } from '../lib/salonOffers';
import {
  auraLiveOffers,
  auraPreviewDemoOffers,
  auraOfferService,
  useAuraPublicOffers,
  type AuraPromotion,
} from '../lib/auraPromotions';
import { AuraPromotionCards } from './aura/AuraPromotionCards';
import { AuraImage } from './aura/AuraImage';
import { AuraVideo } from './aura/AuraVideo';
import { AURA_DEFAULT_SECTION_CONTENT, AURA_SECTIONS_EVENT, auraContentEqual, createAuraSiteContent, loadPublicAuraSections, type AuraSectionKey, type AuraSiteContent } from '../lib/auraTemplateSections';
import { reelSource } from '../lib/socialVideoSource';
import { socialUrl } from '../lib/websiteContent';
import { AppAnnouncementStrip, AppInstallSection } from './AppInstallSection';
import { CustomerReviewPanel } from './CustomerReviewPanel';
import { ExternalReviewFeed } from './ExternalReviewFeed';
import { InlineEditable } from './InlineEditable';
import { WebsiteSections } from './WebsiteSections';
import {
  AURA_CATEGORY_PILLARS,
  AURA_DEMO_REELS,
  AURA_DEMO_REWARDS,
  AURA_UNISEX_IMAGES,
  AURA_VIDEO_FILTERS,
  auraAddress,
  auraBrand,
  auraCity,
  auraCssVariables,
  auraGenderTab,
  auraHours,
  auraMapsUrl,
  auraPhoneDigits,
  auraServiceImage,
  auraServiceSlot,
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


const SECTION_ORDER_IDS: Record<string, [AuraSectionKey, number]> = {
  'aura-home': ['hero', 0], 'aura-categories': ['categories', 0], 'aura-services': ['services', 0],
  'salon-packages': ['services', 0.1], 'aura-about': ['about', 0], 'aura-why-us': ['why_choose_us', 0],
  'aura-wellness': ['why_choose_us', 0.1], 'aura-team': ['staff', 0], 'aura-gallery': ['gallery', 0],
  'salon-videos': ['videos', 0], 'aura-reviews': ['reviews', 0], 'salon-promo': ['promotions', 0],
  'salon-loyalty': ['loyalty', 0], 'aura-booking': ['booking', 0], 'aura-contact': ['contact', 0],
};
function AuraOrderedSections({ children, site }: { children: React.ReactNode; site: AuraSiteContent }) {
  const ordered = React.Children.toArray(children).map((child, index) => {
    const id = React.isValidElement<{ id?: string }>(child) ? child.props.id || '' : '';
    const mapping = SECTION_ORDER_IDS[id];
    return { child, index, order: mapping ? site.orderOf(mapping[0]) + mapping[1] : 10000 };
  }).sort((a, b) => a.order - b.order || a.index - b.index);
  return <>{ordered.map(({ child }) => child)}</>;
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
  const [previewOffset, setPreviewOffset] = useState(0);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const toolbar = document.querySelector<HTMLElement>('[data-template-preview-toolbar]');
    if (!toolbar) return;
    const update = () => setPreviewOffset(toolbar.getBoundingClientRect().height);
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(toolbar);
    window.addEventListener('resize', update);
    return () => { observer?.disconnect(); window.removeEventListener('resize', update); };
  }, []);
  const [tab, setTab] = useState<AuraServiceTab>('All Services');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [videoFilter, setVideoFilter] = useState<AuraVideoFilter>('All Videos');
  const [activeReel, setActiveReel] = useState<(AuraReelItem & { videoSrc?: string; embedKind?: string; externalLabel?: string }) | null>(null);
  const [sectionData, setSectionData] = useState<Record<string, any>>({});

  useEffect(() => {
    let active = true;
    let request = 0;
    setSectionData({});
    const refresh = () => {
      if (!profile.subdomain) return;
      const current = ++request;
      loadPublicAuraSections(profile.subdomain, 'unisex_salon')
        .then((data) => { if (active && current === request) setSectionData(data); })
        .catch(() => { /* Keep the last successfully loaded content on transient failures. */ });
    };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener(AURA_SECTIONS_EVENT, refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); window.removeEventListener(AURA_SECTIONS_EVENT, refresh); };
  }, [profile.subdomain]);
  const site = useMemo(() => createAuraSiteContent(sectionData, { profile, enabledSections }), [sectionData, profile, enabledSections]);
  const media = site.media;
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [promoToast, setPromoToast] = useState('');

  // Quick-reserve planner state (purely UI convenience that forwards exact IDs into BookingModal)
  const bookableDays = useMemo(() => upcomingDays(5), []);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedStylistId, setSelectedStylistId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => bookableDays[0]?.iso || '');
  const [selectedTime, setSelectedTime] = useState<string>('12:00');

  const brandName = String(site.sections.branding.sectionContent.name || '').trim() || auraBrand(profile);
  const city = auraCity(profile);
  const address = site.contact.address || auraAddress(profile);
  const mapsUrl = site.contact.mapUrl || auraMapsUrl(profile);
  const whatsapp = site.contact.whatsappHref || auraWhatsApp(profile);
  const phoneDigits = auraPhoneDigits({ phone: site.contact.phone });
  const hours = auraHours(profile);
  const cssVars = { ...auraCssVariables(profile), '--au-preview-offset': `${previewOffset}px` } as React.CSSProperties;

  const sectionOn = (id: string) => {
    const mapped = { hero: 'hero', services: 'services', about: 'about', stylists: 'staff', gallery: 'gallery', videos: 'videos', testimonials: 'reviews', promo: 'promotions', loyalty: 'loyalty', location: 'contact', social: 'social' } as const;
    const key = mapped[id as keyof typeof mapped];
    return key ? site.visible(key, id) : enabledSections.includes(id);
  };

  const tabs = useMemo(() => auraServiceTabs(services), [services]);
  const activeTab: AuraServiceTab = tabs.includes(tab) ? tab : 'All Services';
  const visibleServices = useMemo(() => auraServicesForTab(services, activeTab).filter((service) => site.serviceOverrides[service.id]?.visible !== false), [services, activeTab, site]);
  const wellnessServices = useMemo(() => auraServicesForTab(services, 'Wellness'), [services]);
  const popularServices = useMemo(() => services.filter((service) => service.popular).slice(0, 4), [services]);
  const footerServices = popularServices.length > 0 ? popularServices : services.slice(0, 4);
  const staffOverrides = Array.isArray(site.sections.staff.sectionContent.profiles) ? site.sections.staff.sectionContent.profiles : [];
  const hiddenStaff = new Set(staffOverrides.filter((item: any) => item?.visible === false).map((item: any) => String(item.staffId || '')));
  const team = stylists.filter((stylist) => !hiddenStaff.has(stylist.id)).slice(0, 6);
  const displayOnlyStaff = site.staffProfiles.filter((item) => item.name && !stylists.some((stylist) => stylist.id === item.id));
  const packages = useMemo(() => services.filter((service) => isPackage(service) && site.serviceOverrides[service.id]?.visible !== false), [services, site]);
  const reviews = useMemo(() => site.hasSaved('reviews') && !auraContentEqual(site.sections.reviews.sectionContent.items, AURA_DEFAULT_SECTION_CONTENT.reviews.items) ? site.reviews : clientExperiences(profile).slice(0, 3), [profile, site]);

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
    if (sectionOn('hero')) links.push({ label: site.copy.navHome, href: '#aura-home' });
    if (sectionOn('services')) links.push({ label: site.copy.navServices, href: '#aura-services' });
    if (sectionOn('about')) links.push({ label: site.copy.navAbout, href: '#aura-about' });
    if (sectionOn('stylists') && (team.length > 0 || displayOnlyStaff.length > 0)) links.push({ label: site.copy.navTeam, href: '#aura-team' });
    if (sectionOn('gallery')) links.push({ label: site.copy.navGallery, href: '#aura-gallery' });
    if (sectionOn('videos')) links.push({ label: site.copy.navVideos, href: '#salon-videos' });
    if (sectionOn('location')) links.push({ label: site.copy.navContact, href: '#aura-contact' });
    return links;
  }, [enabledSections, team.length, displayOnlyStaff.length, site]);

  const gallery: GalleryItem[] = useMemo(() => {
    if (site.hasSaved('gallery') && !auraContentEqual(site.sections.gallery.sectionContent.items, AURA_DEFAULT_SECTION_CONTENT.gallery.items)) return site.gallery;
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
  }, [galleryPhotos, site]);

  // Unisex Video Gallery: owner's custom saved videos lead; demo reels stand in unless explicitly cleared.
  const reels: Array<AuraReelItem & { videoSrc?: string; embedKind?: string; externalLabel?: string }> = useMemo(() => {
    if (site.hasSaved('videos') && !auraContentEqual(site.sections.videos.sectionContent.items, AURA_DEFAULT_SECTION_CONTENT.videos.items)) return site.videos.map((video) => ({ ...video, category: video.category as AuraReelItem['category'], videoId: '' }));
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
          externalLabel: src.platform === 'Facebook' ? 'Open Reel on Facebook' : 'Open Reel on Instagram',
          isDemo: false,
        };
      });
    }
    if (profile.demoVideosInitialized && (!profile.socialVideos || profile.socialVideos.length === 0)) {
      return [];
    }
    return AURA_DEMO_REELS;
  }, [profile.socialVideos, profile.demoVideosInitialized, brandName, site]);

  const visibleReels = useMemo(() => {
    if (videoFilter === 'All Videos') return reels;
    return reels.filter((item) => item.category === videoFilter);
  }, [reels, videoFilter]);

  // Promotions & Offers: the published site reads active, in-date offers from
  // Supabase. Every admin edit refreshes this list (event + focus + poll), so
  // the customer website always shows the latest rows without a code change.
  // The offline template preview shows the three clearly labelled demo offers.
  const promotionNow = usePromotionClock();
  const campaign = profile.promoCampaign;
  const hasActiveCampaign = Boolean(campaign && promotionActive(campaign, promotionNow));
  const publishedOffers = useMemo(() => publicSalonOffers(profile, promotionNow), [profile, promotionNow]);
  const { offers: supabaseOffers, source: auraOffersSource } = useAuraPublicOffers(profile.subdomain);
  const displayOffers = useMemo<AuraPromotion[]>(() => {
    if (auraOffersSource === 'supabase') return auraLiveOffers(supabaseOffers, promotionNow);
    if (publishedOffers.length > 0) {
      return auraLiveOffers(
        publishedOffers.map((offer) => ({
          id: offer.id,
          title: offer.title,
          description: offer.description || 'Special seasonal privilege from our salon team.',
          discountType: (offer.offerType === 'flat' ? 'flat' : 'percentage') as 'flat' | 'percentage',
          discountValue: Number(offer.discountValue || 0),
          couponCode: offer.couponCode || '',
          minBookingAmount: 0,
          applicableServiceIds: offer.applicableServices || [],
          startsAt: offer.validFrom || '',
          endsAt: offer.validTo || '',
          maxTotalUses: null,
          maxUsesPerCustomer: 1,
          termsConditions: offer.terms || '',
          bannerImageUrl: offer.image || '',
          displayOrder: 0,
          isDemo: Boolean(offer.isDemo),
          isActive: true,
          demoApproved: !offer.isDemo,
        })) as AuraPromotion[],
        promotionNow,
      );
    }
    return auraLiveOffers(auraPreviewDemoOffers(promotionNow), promotionNow);
  }, [auraOffersSource, supabaseOffers, publishedOffers, promotionNow]);

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

  const buttonVisible = (id: string) => (!site.hasSaved('buttons') || site.sections.buttons.isVisible) && (!site.hasSaved('buttons') || site.buttons[id]?.visible !== false);
  const runButton = (id: string, defaultAction: () => void, bookingAction: () => void = () => onBook(featuredService)) => {
    const setting = site.buttons[id];
    const original = AURA_DEFAULT_SECTION_CONTENT.buttons.items.find((item: { id: string }) => item.id === id);
    if (!site.hasSaved('buttons') || !setting) return defaultAction();
    if (!setting.visible) return;
    if (original && setting.action === original.action && setting.href === original.href) return defaultAction();
    if (setting.action === 'book') return bookingAction();
    if (!setting.href) return;
    if (setting.href.startsWith('#')) {
      document.getElementById(setting.href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.assign(setting.href);
    }
  };

  const configuredHref = (id: string, fallback: string) => site.hasSaved('buttons') && site.buttons[id]?.href ? site.buttons[id].href : fallback;
  const handleLinkAction = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (site.hasSaved('buttons') && site.buttons[id]?.action === 'book') { event.preventDefault(); onBook(featuredService); }
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

  const instagramHref = site.hasSaved('social') ? site.socials.find((item) => item.platform === 'instagram')?.url : socialUrl(profile.instagramHandle, 'instagram');
  const facebookHref = site.hasSaved('social') ? site.socials.find((item) => item.platform === 'facebook')?.url : socialUrl(profile.facebookPage, 'facebook');
  const youtubeHref = site.hasSaved('social') ? site.socials.find((item) => item.platform === 'youtube')?.url : socialUrl(profile.youtubeChannel, 'youtube');
  const year = new Date().getFullYear();

  return (
    <div className="au-site" style={cssVars}>
      {/* ==================================================================
          HEADER — Architectural sticky bar (NO App Install in header!)
         ================================================================== */}
      {(!site.hasSaved('header') || site.sections.header.isVisible) && <><header className="au-header" aria-label="Customer account and salon navigation">
        <div className="au-header-inner">
          <a className="au-brand" href={sectionOn('hero') ? "#aura-home" : (navLinks[0]?.href || "#")} aria-label={`${brandName} home`}>
            {(site.sections.branding.sectionContent.logo?.url || profile.logoUrl) ? (
              <AuraImage className="au-brand-logo" src={site.sections.branding.sectionContent.logo?.url || profile.logoUrl} alt={brandName} fallbackSrc="/templates/aura-unisex/monogram.svg" fallbackAlt={`${brandName} monogram`} />
            ) : (
              <span className="au-brand-mark" aria-hidden="true">
                <span>A</span>
              </span>
            )}
            <span className="au-brand-text">
              <span className="au-brand-name">{brandName}</span>
              <span className="au-brand-sub">{site.copy.brandSublabel}</span>
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
                  <AuraImage className="au-account-avatar" src={customerPhotoUrl} alt="" fallbackSrc="/templates/aura-unisex/monogram.svg" fallbackAlt="" />
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
            {buttonVisible('headerCta') && <button type="button" className="au-btn au-btn-primary au-header-cta" onClick={() => runButton('headerCta', () => onBook(featuredService))}>
              {site.buttons.headerCta?.label || site.copy.heroPrimary}
            </button>}
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

      </header>
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
            {buttonVisible('headerCta') && <button
              type="button"
              className="au-btn au-btn-primary au-btn-block"
              onClick={() => { setMenuOpen(false); runButton('headerCta', () => onBook(featuredService)); }}
            >
              <CalendarCheck size={17} aria-hidden="true" />
              {site.buttons.headerCta?.label || site.copy.heroPrimary}
            </button>}
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
      </>}

      <main><AuraOrderedSections site={site}>
        {/* ==================================================================
            1. HERO BANNER — Asymmetric Editorial Split + Unisex Visual Stage
           ================================================================== */}
        {sectionOn('hero') && (
          <section id="aura-home" data-layout="hero" className="au-hero" aria-label="Aura unisex salon welcome">
            <div className="au-hero-ambient" aria-hidden="true" />
            <div className={`au-container au-hero-layout${site.hasSaved('hero_media') && !site.sections.hero_media.isVisible ? ' is-single' : ''}`}>
              <div className="au-hero-copy">
                <div className="au-hero-kicker">
                  <span className="au-gold-dot" aria-hidden="true" />
                  <span>{site.copy.heroEyebrow}</span>
                  <span className="au-kicker-sep" aria-hidden="true">·</span>
                  <span className="au-kicker-city">{city}</span>
                </div>

                <h1 className="au-hero-title">{site.copy.heroTitle}</h1>
                <p className="au-hero-text">{site.copy.heroText}</p>

                <div className="au-hero-actions">
                  {buttonVisible('heroPrimary') && <button
                    type="button"
                    className="au-btn au-btn-primary au-btn-lg"
                    onClick={() => runButton('heroPrimary', () => onBook(featuredService))}
                  >
                    <CalendarCheck size={18} aria-hidden="true" />
                    {site.copy.heroPrimary}
                  </button>}
                  {buttonVisible('heroSecondary') && (sectionOn('services') || (site.hasSaved('buttons') && site.buttons.heroSecondary?.href !== '#aura-services')) && <a className="au-btn au-btn-outline au-btn-lg" href={site.buttons.heroSecondary?.href || '#aura-services'} onClick={(event) => { if (site.hasSaved('buttons') && site.buttons.heroSecondary?.action === 'book') { event.preventDefault(); onBook(featuredService); } }}>
                    {site.copy.heroSecondary}
                    <ArrowRight size={18} aria-hidden="true" />
                  </a>}
                </div>

                <div className="au-hero-metrics" aria-label="Studio highlights">
                  <div className="au-metric-item">
                    <strong>{site.extra.heroRatingScore} ★</strong>
                    <span>{site.extra.heroRatingLabel}</span>
                  </div>
                  <div className="au-metric-divider" aria-hidden="true" />
                  <div className="au-metric-item">
                    <strong>{site.extra.heroHimHerLabel}</strong>
                    <span>{site.extra.heroHimHerText}</span>
                  </div>
                  <div className="au-metric-divider" aria-hidden="true" />
                  <div className="au-metric-item">
                    <strong>{site.extra.heroCleanLabel}</strong>
                    <span>{site.extra.heroCleanText}</span>
                  </div>
                </div>

                <ul className="au-hero-points" aria-label="Salon promises">
                  {site.copy.heroPoints.map((point: string) => (
                    <li key={point}>
                      <Check size={14} aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {(!site.hasSaved('hero_media') || site.sections.hero_media.isVisible) && <div className="au-hero-stage">
                <figure className="au-hero-arch-frame">
                  <AuraImage
                    className="au-hero-main-img"
                    fallbackSrc={AURA_UNISEX_IMAGES.heroMain.src}
                    src={media.heroMain.src}
                    srcSet={media.heroMain.srcSet}
                    sizes="(max-width: 920px) 100vw, 34vw"
                    width={media.heroMain.width}
                    height={media.heroMain.height}
                    alt={media.heroMain.alt}
                  />
                  <figcaption className="au-hero-arch-badge">
                    <Sparkles size={14} aria-hidden="true" />
                    <span>{site.extra.heroBadge}</span>
                  </figcaption>
                </figure>

                <div className="au-hero-side-stack">
                  <button
                    type="button"
                    className="au-hero-duo-card"
                    onClick={() => goToServices(auraGenderTab(services, 'men'))}
                    disabled={!sectionOn('services')}
                  >
                    <AuraImage
                      fallbackSrc={AURA_UNISEX_IMAGES.heroMen.src}
                      src={media.heroMen.src}
                      srcSet={media.heroMen.srcSet}
                      sizes="(max-width: 920px) 50vw, 20vw"
                      width={media.heroMen.width}
                      height={media.heroMen.height}
                      alt={media.heroMen.alt}
                      loading="lazy"
                    />
                    <div className="au-hero-duo-meta">
                      <span>{site.copy.heroCardMen}</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </div>
                  </button>

                  <button
                    type="button"
                    className="au-hero-duo-card"
                    onClick={() => goToServices(auraGenderTab(services, 'women'))}
                    disabled={!sectionOn('services')}
                  >
                    <AuraImage
                      fallbackSrc={AURA_UNISEX_IMAGES.heroWomen.src}
                      src={media.heroWomen.src}
                      srcSet={media.heroWomen.srcSet}
                      sizes="(max-width: 920px) 50vw, 20vw"
                      width={media.heroWomen.width}
                      height={media.heroWomen.height}
                      alt={media.heroWomen.alt}
                      loading="lazy"
                    />
                    <div className="au-hero-duo-meta">
                      <span>{site.copy.heroCardWomen}</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </div>
                  </button>

                  <div className="au-care-box">
                    <span className="au-care-icon" aria-hidden="true">
                      <Leaf size={17} />
                    </span>
                    <div>
                      <strong>{site.copy.heroCareBoxTitle}</strong>
                      <span>{site.copy.heroCareBoxText}</span>
                    </div>
                  </div>
                </div>
              </div>}
            </div>
          </section>
        )}

        {/* ==================================================================
            2. SALON CATEGORIES — 5-Zone Architectural Category Showcase
           ================================================================== */}
        {sectionOn('services') && (!site.hasSaved('categories') || site.sections.categories.isVisible) && services.length > 0 && (
          <section id="aura-categories" className="au-section au-categories">
            <div className="au-container">
              <div className="au-split-head">
                <div>
                  <p className="au-eyebrow">{site.copy.categoriesEyebrow}</p>
                  <h2 className="au-section-title">{site.copy.categoriesTitle}</h2>
                </div>
                <p className="au-section-text au-head-side-note">{site.copy.categoriesText}</p>
              </div>

              <div className="au-cat-grid">
                {(site.hasSaved('categories') ? site.categories : AURA_CATEGORY_PILLARS).map((pillar, pillarIndex) => {
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
                        <AuraImage
                          fallbackSrc={(AURA_CATEGORY_PILLARS.find((item) => item.id === pillar.id) || AURA_CATEGORY_PILLARS[pillarIndex % AURA_CATEGORY_PILLARS.length]).image.src}
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
                  <p className="au-eyebrow">{site.copy.servicesEyebrow}</p>
                  <h2 className="au-section-title">{site.copy.servicesTitle}</h2>
                  <p className="au-section-text">{site.copy.servicesText}</p>
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

                  {visibleServices.length === 0 ? <p className="au-empty">No services are available in this category.</p> : <div className="au-service-grid">
                    {visibleServices.map((service) => {
                      const original = auraServiceImage(service);
                      const override = site.serviceOverrides[service.id]?.image;
                      const image = override?.url ? { src: override.url, srcSet: override.srcSet || '', alt: override.alt || original.alt } : original;
                      return (
                        <article className="au-service-card" key={service.id}>
                          <div className="au-service-media">
                            <AuraImage
                              fallbackSrc={AURA_UNISEX_IMAGES.services[auraServiceSlot(service)].src}
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
                            <h3 className="au-service-name">{site.serviceOverrides[service.id]?.displayName || service.name}</h3>
                            <ServiceMerchTags service={service} className="sf-merch-inline" />
                            {(site.serviceOverrides[service.id]?.displayDescription || service.description) && <p className="au-service-text">{site.serviceOverrides[service.id]?.displayDescription || service.description}</p>}
                            <ServiceTerms service={service} className="sf-merch-inline" />
                            <div className="au-service-meta">
                              <div className="au-service-price-wrap">
                                <span className="au-price-caption">Menu Price</span>
                                <span className="au-service-price">{money(service.price)}</span>
                              </div>
                              {buttonVisible('bookNow') && <button
                                type="button"
                                className="au-btn au-btn-primary au-service-cta"
                                onClick={() => runButton('bookNow', () => onBook(service), () => onBook(service))}
                              >
                                {site.copy.bookNow}
                                <ArrowRight size={15} aria-hidden="true" />
                              </button>}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>}
                </>
              )}
            </div>
          </section>
        )}

        {/* ==================================================================
            3b. VALUE COMBO PACKAGES — Gold-Trimmed Salon Pass Cards
           ================================================================== */}
        {showPackages && sectionOn('services') && packages.length > 0 && (
          <section id="salon-packages" className="au-section au-packages">
            <div className="au-container">
              <div className="au-split-head">
                <div>
                  <p className="au-eyebrow">{site.copy.packagesEyebrow}</p>
                  <h2 className="au-section-title">{site.copy.packagesTitle}</h2>
                </div>
                <p className="au-section-text au-head-side-note">{site.copy.packagesText}</p>
              </div>

              <div className="au-package-grid">
                {packages.map((pkg, idx) => {
                  const original = pkg.imageUrl
                    ? { src: pkg.imageUrl, srcSet: '', alt: pkg.name }
                    : auraServiceImage(pkg);
                  const override = site.serviceOverrides[pkg.id]?.image;
                  const image = override?.url ? { src: override.url, srcSet: override.srcSet || '', alt: override.alt || original.alt } : original;
                  return (
                    <article className="au-package-card" key={pkg.id}>
                      <div className="au-package-media">
                        <AuraImage
                          fallbackSrc={AURA_UNISEX_IMAGES.services[auraServiceSlot(pkg)].src}
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
                          {buttonVisible('packagesButton') && <button
                            type="button"
                            className="au-btn au-btn-primary au-btn-sm"
                            onClick={() => runButton('packagesButton', () => onBook(pkg), () => onBook(pkg))}
                            disabled={!bookingAvailable}
                          >
                            {site.copy.packagesButton}
                          </button>}
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
                <p className="au-eyebrow">{site.copy.aboutEyebrow}</p>
                <h2 className="au-section-title">{site.copy.aboutTitle}</h2>
                <p className="au-about-lead">{site.hasSaved('about') && site.sections.about.sectionContent.description !== AURA_DEFAULT_SECTION_CONTENT.about.description ? site.copy.aboutDefault : profile.about || site.copy.aboutDefault}</p>

                <ul className="au-highlights">
                  {site.aboutHighlights.map((item) => (
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
                      {(site.extra.aboutOwnerName || profile.ownerName || 'P').charAt(0)}
                    </span>
                    <div>
                      <strong>{site.extra.aboutOwnerName || profile.ownerName || 'Priya Nair'}</strong>
                      <span>{site.extra.aboutOwnerRole || profile.ownerRole || 'Executive Salon Director'}</span>
                    </div>
                  </div>
                  {buttonVisible('aboutButton') && team.length > 0 && sectionOn('stylists') && (
                    <a className="au-btn au-btn-outline" href={site.buttons.aboutButton?.href || "#aura-team"} onClick={(event) => { if (site.hasSaved('buttons') && site.buttons.aboutButton?.action === 'book') { event.preventDefault(); onBook(featuredService); } }}>
                      {site.copy.aboutButton}
                      <ArrowRight size={16} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>

              <div className="au-about-mosaic">
                <figure className="au-about-primary-frame">
                  <AuraImage
                    fallbackSrc={AURA_UNISEX_IMAGES.aboutInterior.src}
                    src={media.aboutInterior.src}
                    srcSet={media.aboutInterior.srcSet}
                    sizes="(max-width: 920px) 100vw, 46vw"
                    width={media.aboutInterior.width}
                    height={media.aboutInterior.height}
                    alt={media.aboutInterior.alt}
                    loading="lazy"
                  />
                </figure>
                <div className="au-about-secondary-row">
                  <figure className="au-about-detail-frame">
                    <AuraImage
                      fallbackSrc={AURA_UNISEX_IMAGES.aboutWork.src}
                      src={media.aboutWork.src}
                      srcSet={media.aboutWork.srcSet}
                      sizes="(max-width: 920px) 55vw, 22vw"
                      width={media.aboutWork.width}
                      height={media.aboutWork.height}
                      alt={media.aboutWork.alt}
                      loading="lazy"
                    />
                  </figure>
                  <div className="au-about-plaque">
                    <span className="au-plaque-year">{site.extra.aboutPlaqueYear}</span>
                    <strong>{site.extra.aboutPlaqueTitle}</strong>
                    <p>{site.extra.aboutPlaqueText}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================
            5. WHY CHOOSE US + FOR HIM & HER + WELLNESS SANCTUARY
           ================================================================== */}
        {(!site.hasSaved('why_choose_us') || site.sections.why_choose_us.isVisible) && <section id="aura-why-us" className="au-section au-why">
          <div className="au-container">
            <div className="au-split-head">
              <div>
                <p className="au-eyebrow">{site.copy.whyEyebrow}</p>
                <h2 className="au-section-title">{site.copy.whyTitle}</h2>
              </div>
              <p className="au-section-text au-head-side-note">{site.copy.whyText}</p>
            </div>

            <div className="au-why-grid">
              {site.whyPillars.map((pillar, idx) => {
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
                  <AuraImage
                    fallbackSrc={AURA_UNISEX_IMAGES.featureMen.src}
                    src={media.featureMen.src}
                    srcSet={media.featureMen.srcSet}
                    sizes="(max-width: 920px) 100vw, 50vw"
                    width={media.featureMen.width}
                    height={media.featureMen.height}
                    alt={media.featureMen.alt}
                    loading="lazy"
                  />
                  <span className="au-dual-pill">{site.extra.menPill}</span>
                </div>
                <div className="au-dual-body">
                  <h3>{site.copy.menTitle}</h3>
                  <p>{site.copy.menText}</p>
                  {buttonVisible('menButton') && sectionOn('services') && <button
                    type="button"
                    className="au-btn au-btn-primary"
                    onClick={() => runButton('menButton', () => goToServices(auraGenderTab(services, 'men')))}
                  >
                    {site.copy.menButton}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>}
                </div>
              </article>

              <article className="au-dual-card">
                <div className="au-dual-media">
                  <AuraImage
                    fallbackSrc={AURA_UNISEX_IMAGES.featureWomen.src}
                    src={media.featureWomen.src}
                    srcSet={media.featureWomen.srcSet}
                    sizes="(max-width: 920px) 100vw, 50vw"
                    width={media.featureWomen.width}
                    height={media.featureWomen.height}
                    alt={media.featureWomen.alt}
                    loading="lazy"
                  />
                  <span className="au-dual-pill">{site.extra.womenPill}</span>
                </div>
                <div className="au-dual-body">
                  <h3>{site.copy.womenTitle}</h3>
                  <p>{site.copy.womenText}</p>
                  {buttonVisible('womenButton') && sectionOn('services') && <button
                    type="button"
                    className="au-btn au-btn-primary"
                    onClick={() => runButton('womenButton', () => goToServices(auraGenderTab(services, 'women')))}
                  >
                    {site.copy.womenButton}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>}
                </div>
              </article>
            </div>
          </div>
        </section>}

        {/* ==================================================================
            5b. WELLNESS LOUNGE — Calm Architectural Split Band
           ================================================================== */}
        {(!site.hasSaved('why_choose_us') || site.sections.why_choose_us.isVisible) && <section id="aura-wellness" className="au-wellness">
          <div className="au-container">
            <div className="au-wellness-shell">
              <div className="au-wellness-media">
                <AuraImage
                  fallbackSrc={AURA_UNISEX_IMAGES.wellness.src}
                  src={media.wellness.src}
                  srcSet={media.wellness.srcSet}
                  sizes="(max-width: 920px) 100vw, 48vw"
                  width={media.wellness.width}
                  height={media.wellness.height}
                  alt={media.wellness.alt}
                  loading="lazy"
                />
              </div>
              <div className="au-wellness-copy">
                <p className="au-eyebrow">{site.copy.wellnessEyebrow}</p>
                <h2 className="au-section-title">{site.copy.wellnessTitle}</h2>
                <p className="au-section-text">{site.copy.wellnessText}</p>

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
                  <p className="au-wellness-empty">{site.copy.wellnessEmpty}</p>
                )}

                {buttonVisible('wellnessButton') && sectionOn('services') && <button type="button" className="au-btn au-btn-primary" onClick={() => runButton('wellnessButton', () => goToServices('Wellness'))}>
                  {site.copy.wellnessButton}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>}
              </div>
            </div>
          </div>
        </section>}

        {/* ==================================================================
            6. OUR HAIR EXPERTS — Tall 4:5 Editorial Portrait Cards
           ================================================================== */}
        {sectionOn('stylists') && (team.length > 0 || displayOnlyStaff.length > 0) && (
          <section id="aura-team" data-layout="team" className="au-section au-team">
            <div className="au-container">
              <div className="au-split-head">
                <div>
                  <p className="au-eyebrow">{site.copy.teamEyebrow}</p>
                  <h2 className="au-section-title">{site.copy.teamTitle}</h2>
                </div>
                <p className="au-section-text au-head-side-note">{site.copy.teamText}</p>
              </div>

              <div className="au-team-grid">
                {team.map((stylist, index) => {
                  const original = auraTeamImage(stylist, index);
                  const displayProfile = site.staffProfiles.find((item) => item.id === stylist.id);
                  const override = displayProfile?.image;
                  const portrait = override?.url ? { src: override.url, srcSet: override.srcSet || '', alt: override.alt || original.alt } : original;
                  const skills = displayProfile?.specialties?.length ? displayProfile.specialties : stylist.specialties;
                  const fallbackSrc = AURA_UNISEX_IMAGES.team[index % AURA_UNISEX_IMAGES.team.length].src;
                  return (
                    <article className="au-team-card" key={stylist.id}>
                      <div className="au-team-portrait h-80 w-full aspect-[3/4] overflow-hidden">
                        <AuraImage
                          className="au-team-photo w-full h-full object-cover"
                        fallbackSrc={fallbackSrc}
                        src={portrait.src}
                        srcSet={portrait.srcSet || undefined}
                        sizes="(max-width: 640px) 100vw, (max-width: 1120px) 50vw, 33vw"
                        alt={portrait.alt}
                        loading="lazy"
                      />
                        {typeof stylist.rating === 'number' && stylist.rating > 0 && (
                          <span className="au-team-rating">
                            <Star size={13} fill="currentColor" aria-hidden="true" />
                            {stylist.rating.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="au-team-body">
                        <p className="au-team-role">{displayProfile?.role || stylist.role}</p>
                        <h3>{displayProfile?.name || stylist.name}</h3>
                        {displayProfile?.bio && <p>{displayProfile.bio}</p>}
                        {skills.length > 0 && (
                          <ul className="au-team-skills">
                            {skills.slice(0, 3).map((skill: string) => (
                              <li key={skill}>{skill}</li>
                            ))}
                          </ul>
                        )}
                        <div className="au-team-actions">
                          {buttonVisible('teamButton') && <button
                            type="button"
                            className="au-btn au-btn-primary au-btn-sm"
                            onClick={() => runButton('teamButton', () => onBook(undefined, stylist), () => onBook(undefined, stylist))}
                            disabled={!bookingAvailable}
                          >
                            {site.copy.teamButton}
                          </button>}
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
                {displayOnlyStaff.map((person, index) => (
                  <article className="au-team-card" key={person.id}>
                    <div className="au-team-portrait h-80 w-full aspect-[3/4] overflow-hidden">
                      <AuraImage className="au-team-photo w-full h-full object-cover" src={person.image?.url} fallbackSrc={AURA_UNISEX_IMAGES.team[index % AURA_UNISEX_IMAGES.team.length].src} alt={person.name} loading="lazy" />
                    </div>
                    <div className="au-team-body">
                      <p className="au-team-role">{person.role || 'Salon specialist'}</p>
                      <h3>{person.name}</h3>
                      {person.bio && <p>{person.bio}</p>}
                      {person.specialties.length > 0 && <ul className="au-team-skills">{person.specialties.slice(0, 3).map((skill: string) => <li key={skill}>{skill}</li>)}</ul>}
                      <small>Display profile · Contact the salon for availability</small>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================
            7. GALLERY — Fixed 5-Tile Architectural Bento Mosaic (Zero Collages)
           ================================================================== */}
        {sectionOn('gallery') && (
          <section id="aura-gallery" data-layout="gallery" className="au-section au-gallery">
            <div className="au-container">
              <div className="au-split-head">
                <div>
                  <p className="au-eyebrow">{site.copy.galleryEyebrow}</p>
                  <h2 className="au-section-title">{site.copy.galleryTitle}</h2>
                  <p className="au-section-text">{site.copy.galleryText}</p>
                </div>
                {gallery.some((item) => item.isDemo) && galleryPhotos.length === 0 && (
                  <span className="au-sample-pill">Sample salon photography · Replaced when owner uploads</span>
                )}
              </div>

              {gallery.length === 0 ? <p className="au-empty">Salon photos will appear here once added.</p> : <div className={`au-gallery-grid au-gallery-count-${Math.min(gallery.length, 6)}`}>
                {gallery.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`au-gallery-tile${index === 0 ? ' is-featured' : ''}`}
                    onClick={() => setLightbox(index)}
                    aria-label={`View photo ${index + 1}: ${item.title}`}
                  >
                    <AuraImage
                      fallbackSrc={AURA_UNISEX_IMAGES.gallery[index % AURA_UNISEX_IMAGES.gallery.length].src}
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
              </div>}
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
                  <p className="au-eyebrow au-eyebrow-gold">{site.copy.videosEyebrow}</p>
                  <InlineEditable
                    tag="h2"
                    className="au-section-title au-title-light"
                    value={site.copy.videosTitle}
                    isEditingActive={Boolean(shared.isEditingActive && !shared.readOnly && shared.setProfile)}
                    onSave={(value) =>
                      shared.setProfile?.((prev) => ({
                        ...prev,
                        sectionHeadings: { ...prev.sectionHeadings, videosTitle: String(value) },
                      }))
                    }
                  />
                  <p className="au-section-text au-text-light">
                    {site.copy.videosText}
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

                  {visibleReels.length === 0 ? <p className="au-empty">No videos are available in this category.</p> : <div className="au-video-grid">
                    {visibleReels.map((reel) => (
                      <article className="au-video-card" key={reel.id}>
                        <button
                          type="button"
                          className="sf-reel-media"
                          onClick={() => setActiveReel(reel)}
                          disabled={!reel.videoSrc && !reel.embedUrl && !reel.externalUrl}
                          aria-label={reel.videoSrc || reel.embedUrl || reel.externalUrl ? `Play video: ${reel.title}` : `Video unavailable: ${reel.title}`}
                        >
                          <AuraImage
                            fallbackSrc={AURA_DEMO_REELS.find((item) => item.category === reel.category)?.posterSrc || AURA_UNISEX_IMAGES.aboutInterior.src}
                            src={reel.posterSrc}
                            srcSet={reel.posterSrcSet || undefined}
                            sizes="(max-width: 640px) 100vw, (max-width: 1120px) 33vw, 20vw"
                            alt={reel.title}
                            loading="lazy"
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
                          {reel.externalUrl && <a href={reel.externalUrl} target="_blank" rel="noopener noreferrer">
                            Watch <ExternalLink size={12} aria-hidden="true" />
                          </a>}
                        </div>
                      </article>
                    ))}
                  </div>}
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
                  <p className="au-eyebrow">{site.copy.reviewsEyebrow}</p>
                  <h2 className="au-section-title">{site.copy.reviewsTitle}</h2>
                  <p className="au-section-text">{site.copy.reviewsText}</p>
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
                      {review.isDemo && <small>Sample review</small>}
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
                <div className="au-review-panel" onErrorCapture={(event) => {
                  const image = event.target;
                  if (!(image instanceof HTMLImageElement)) return;
                  // Customer review images must not be replaced with an unrelated photo.
                  image.hidden = true;
                  const mediaLink = image.closest('.sf-review-media');
                  if (mediaLink instanceof HTMLElement) mediaLink.hidden = true;
                }} onLoadCapture={(event) => {
                  const image = event.target;
                  if (!(image instanceof HTMLImageElement)) return;
                  image.hidden = false;
                  const mediaLink = image.closest('.sf-review-media');
                  if (mediaLink instanceof HTMLElement) mediaLink.hidden = false;
                }}>
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
          <section
            id="salon-promo"
            data-section="promo"
            data-aura-offers-source={auraOffersSource}
            data-aura-offers-count={displayOffers.length}
            className="au-section au-offers"
          >
            <div className="au-container">
              <div className="au-split-head">
                <div>
                  <p className="au-eyebrow">{site.copy.promoEyebrow}</p>
                  <h2 className="au-section-title">{site.copy.promoTitle}</h2>
                  <p className="au-section-text">{site.copy.promoText}</p>
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
                      <AuraImage fallbackSrc={AURA_UNISEX_IMAGES.services.styling.src} src={campaign.imageUrl} alt={campaign.headline || 'Salon offer'} loading="lazy" />
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
                <AuraPromotionCards
                  offers={displayOffers}
                  services={services}
                  copiedCode={copiedCode}
                  onCopy={(code) => void handleCopyPromo(code)}
                  onBook={(offer) =>
                    onBook(
                      auraOfferService(offer, services) || featuredService,
                      undefined,
                      undefined,
                      offer.couponCode || undefined,
                    )
                  }
                />
              ) : (
                !hasActiveCampaign && !(site.hasSaved('promotions') && !auraContentEqual(site.sections.promotions.sectionContent.items, AURA_DEFAULT_SECTION_CONTENT.promotions.items) && site.offers.length > 0) && (
                  <p className="au-empty">Current seasonal offers will appear here when announced by the salon.</p>
                )
              )}
              {site.hasSaved('promotions') && !auraContentEqual(site.sections.promotions.sectionContent.items, AURA_DEFAULT_SECTION_CONTENT.promotions.items) && site.offers.length > 0 && (
                <div className="aura-promo-grid" aria-label="Salon offer information">
                  {site.offers.map((offer) => <article className="au-offer-voucher" key={offer.id}>
                    <span className="au-offer-badge">{offer.badge || 'Salon offer'}</span>
                    <h3>{offer.title}</h3><p>{offer.description}</p>
                    {offer.code && <p>Displayed code: {offer.code}</p>}
                    {offer.validity && <p>{offer.validity}</p>}
                    <small>Information only · Confirm eligibility with the salon</small>
                  </article>)}
                </div>
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
                      <Gift size={14} aria-hidden="true" /> {site.copy.loyaltyEyebrow}
                    </p>
                    <InlineEditable
                      tag="h2"
                      className="au-section-title"
                      value={site.copy.loyaltyTitle}
                      isEditingActive={Boolean(shared.isEditingActive && !shared.readOnly && shared.setProfile)}
                      onSave={(value) =>
                        shared.setProfile?.((prev) => ({
                          ...prev,
                          sectionHeadings: { ...prev.sectionHeadings, loyaltyTitle: String(value) },
                        }))
                      }
                    />
                    <p className="au-section-text">{site.copy.loyaltyText}</p>
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
                  {site.loyaltyTiers.map((tier, idx) => (
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
                {site.hasSaved('loyalty') && !auraContentEqual(site.sections.loyalty.sectionContent.rewards, AURA_DEFAULT_SECTION_CONTENT.loyalty.rewards) && site.loyaltyRewards.length > 0 && (
                  <div className="au-loyalty-grid" aria-label="Reward information">
                    {site.loyaltyRewards.map((reward) => <article className="sf-loyalty-card au-loyalty-card" key={reward.id}>
                      <h3>{reward.title}</h3><p>{reward.description}</p>
                      <small>Information only · {reward.requiredPoints} points shown · Confirm with the salon</small>
                    </article>)}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================
            12. BOOKING SECTION — Salon Lounge Visual + Quick-Reserve Planner
           ================================================================== */}
        {(!site.hasSaved('booking') || site.sections.booking.isVisible) && <section id="aura-booking" className="au-booking">
          <div className="au-container au-booking-layout">
            <div className="au-booking-left">
              <p className="au-booking-eyebrow">{site.copy.bookingEyebrow}</p>
              <h2 className="au-booking-title">{site.copy.bookingTitle}</h2>
              <p className="au-booking-text">{site.copy.bookingText}</p>

              <figure className="au-booking-photo-frame">
                <AuraImage
                  fallbackSrc={AURA_UNISEX_IMAGES.booking.src}
                  src={media.booking.src}
                  srcSet={media.booking.srcSet}
                  sizes="(max-width: 920px) 100vw, 48vw"
                  width={media.booking.width}
                  height={media.booking.height}
                  alt={media.booking.alt}
                  loading="lazy"
                />
                <figcaption>{site.extra.bookingImageCaption} — {city}</figcaption>
              </figure>

              {site.contact.whatsapp && buttonVisible('whatsappNow') && (
                <div className="au-booking-wa-row">
                  <span>{site.extra.bookingWhatsappPrompt}</span>
                  <a className="au-btn au-btn-outline-light" href={configuredHref('whatsappNow', whatsapp)} onClick={(event) => handleLinkAction(event, 'whatsappNow')} target="_blank" rel="noreferrer">
                    <MessageCircle size={17} aria-hidden="true" />
                    {site.hasSaved('booking') && site.sections.booking.sectionContent.whatsappLabel !== AURA_DEFAULT_SECTION_CONTENT.booking.whatsappLabel && !site.hasSaved('buttons') ? site.sections.booking.sectionContent.whatsappLabel : site.copy.whatsappNow}
                  </a>
                </div>
              )}
            </div>

            <div className="au-booking-planner" aria-label="Quick appointment planner">
              <div className="au-planner-head">
                <span className="au-planner-kicker">
                  <Calendar size={14} aria-hidden="true" /> {site.extra.bookingPlannerKicker}
                </span>
                <h3>{site.extra.bookingPlannerTitle}</h3>
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
                <span className="au-planner-label">4. Preferred Time (availability checked at booking)</span>
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

              {buttonVisible('bookingButton') && <button
                type="button"
                className="au-btn au-btn-primary au-btn-lg au-btn-block"
                onClick={() => runButton('bookingButton', handlePlannerBook, handlePlannerBook)}
              >
                <CalendarCheck size={18} aria-hidden="true" />
                {site.hasSaved('booking') && site.sections.booking.sectionContent.buttonLabel !== AURA_DEFAULT_SECTION_CONTENT.booking.buttonLabel && !site.hasSaved('buttons') ? site.sections.booking.sectionContent.buttonLabel : site.copy.bookingButton}
              </button>}
            </div>
          </div>
        </section>}

        {/* ==================================================================
            13. CONTACT DETAILS — 3-Card Studio Concierge Directory
           ================================================================== */}
        {sectionOn('location') && (
          <section id="aura-contact" data-layout="location" className="au-section au-contact">
            <div className="au-container">
              <div className="au-split-head">
                <div>
                  <p className="au-eyebrow">{site.copy.contactEyebrow}</p>
                  <h2 className="au-section-title">{site.copy.contactTitle}</h2>
                </div>
                <p className="au-section-text au-head-side-note">{site.copy.contactText}</p>
              </div>

              <div className="au-contact-cards">
                {/* Card 1: Location & Directions */}
                <article className="au-contact-card">
                  <span className="au-contact-icon" aria-hidden="true">
                    <MapPin size={20} />
                  </span>
                  <h3>{site.contact.locationTitle}</h3>
                  <p className="au-contact-address">{address}</p>
                  {site.contact.landmark && <p className="au-landmark">Near {site.contact.landmark}</p>}
                  <div className="au-contact-card-actions">
                    {buttonVisible('directions') && <a className="au-btn au-btn-primary au-btn-sm" href={configuredHref('directions', mapsUrl)} onClick={(event) => handleLinkAction(event, 'directions')} target="_blank" rel="noreferrer">
                      <MapPin size={15} aria-hidden="true" />
                      {site.hasSaved('buttons') ? site.copy.directions : site.contact.directionsLabel}
                    </a>}
                    <a className="au-map-link" href={mapsUrl} target="_blank" rel="noreferrer">
                      {site.contact.viewMapLabel}
                      <ArrowRight size={14} aria-hidden="true" />
                    </a>
                  </div>
                </article>

                {/* Card 2: Direct Reception Desk */}
                <article className="au-contact-card">
                  <span className="au-contact-icon" aria-hidden="true">
                    <Phone size={20} />
                  </span>
                  <h3>{site.contact.receptionTitle}</h3>
                  {!site.contact.phone && !site.contact.whatsapp && !site.contact.email && <p>Contact details will appear here when added by the salon.</p>}
                  <ul className="au-contact-list">
                    {site.contact.phone && (
                      <li>
                        <Phone size={16} aria-hidden="true" />
                        <a href={`tel:${phoneDigits}`}>{site.contact.phone}</a>
                      </li>
                    )}
                    {site.contact.whatsapp && (
                      <li>
                        <MessageCircle size={16} aria-hidden="true" />
                        <a href={whatsapp} target="_blank" rel="noreferrer">
                          WhatsApp {site.contact.whatsapp}
                        </a>
                      </li>
                    )}
                    {site.contact.email && (
                      <li>
                        <Sparkles size={16} aria-hidden="true" />
                        <a href={site.contact.emailHref}>{site.contact.email}</a>
                      </li>
                    )}
                  </ul>
                  <div className="au-contact-card-actions">
                    {site.contact.phone && buttonVisible('callNow') && (
                      <a className="au-btn au-btn-outline au-btn-sm" href={configuredHref('callNow', `tel:${phoneDigits}`)} onClick={(event) => handleLinkAction(event, 'callNow')}>
                        <Phone size={15} aria-hidden="true" />
                        {site.hasSaved('buttons') ? site.copy.callNow : site.contact.callLabel}
                      </a>
                    )}
                    {site.contact.whatsapp && buttonVisible('whatsappNow') && (
                      <a
                        className="au-btn au-btn-ghost au-btn-sm"
                        href={configuredHref('whatsappNow', whatsapp)}
                        onClick={(event) => handleLinkAction(event, 'whatsappNow')}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle size={15} aria-hidden="true" />
                        {site.hasSaved('buttons') ? site.copy.whatsappNow : site.contact.whatsappLabel}
                      </a>
                    )}
                  </div>
                </article>

                {/* Card 3: Opening Hours */}
                <article className="au-hours-card">
                  <h3>
                    <Clock size={18} aria-hidden="true" />
                    {site.contact.hoursTitle}
                  </h3>
                  <dl>
                    {hours.map((row) => (
                      <div key={row.days}>
                        <dt>{row.days}</dt>
                        <dd>{row.hours}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="au-walkin-note">{site.contact.walkInNote}</p>
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
      </AuraOrderedSections></main>

      {/* ==================================================================
          14. FOOTER — App Install Strictly in Footer + 4-Column Salon Footer
         ================================================================== */}
      {(!site.hasSaved('footer') || site.sections.footer.isVisible) && <footer data-layout="footer" className="au-footer-wrap">
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
                  <span className="au-footer-sub">{site.copy.brandSublabel}</span>
                </div>
              </div>
              <p className="au-footer-about">
                {site.hasSaved('footer') && site.sections.footer.sectionContent.aboutText ? site.footer.aboutText : (profile.about || site.copy.aboutDefault).slice(0, 220)}
              </p>
              <span className="au-footer-city">
                <MapPin size={14} aria-hidden="true" />
                {city}
              </span>
            </div>

            <div className="au-footer-col">
              <h4>{site.copy.footerQuickLinks}</h4>
              <ul>
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
                {(!site.hasSaved('why_choose_us') || site.sections.why_choose_us.isVisible) && <li>
                  <a href="#aura-wellness">Wellness Lounge</a>
                </li>}
              </ul>
            </div>

            <div className="au-footer-col">
              <h4>{site.copy.footerServices}</h4>
              <ul>
                {sectionOn('services') && footerServices.map((service) => (
                  <li key={service.id}>
                    <a href="#aura-services">{service.name}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="au-footer-col">
              <h4>{site.copy.footerContact}</h4>
              <ul className="au-footer-contact">
                <li>{address}</li>
                {site.contact.phone && (
                  <li>
                    <a href={`tel:${phoneDigits}`}>{site.contact.phone}</a>
                  </li>
                )}
                {site.contact.whatsapp && (
                  <li>
                    <a href={whatsapp} target="_blank" rel="noreferrer">
                      WhatsApp {site.contact.whatsapp}
                    </a>
                  </li>
                )}
                {site.contact.email && (
                  <li>
                    <a href={site.contact.emailHref}>{site.contact.email}</a>
                  </li>
                )}
                <li>
                  <a href="/?app=1&install=1" className="au-footer-install-link">
                    {site.footer.installLabel}
                  </a>
                </li>
              </ul>

              {sectionOn('social') && (
                <div data-section="social" className="au-footer-social-wrap">
                  <h4 className="au-footer-follow">
                    {site.copy.footerFollow}
                  </h4>
                  {site.hasSaved('social') ? (
                    site.socials.length > 0 ? <div className="au-footer-social">{site.socials.map((item) => {
                      const Icon = item.platform === 'instagram' ? Instagram : item.platform === 'facebook' ? Facebook : item.platform === 'youtube' ? Youtube : ExternalLink;
                      return <a key={item.id} href={item.url} target="_blank" rel="noreferrer" aria-label={item.label || item.platform}><Icon size={17} aria-hidden="true" /></a>;
                    })}</div> : <p className="au-footer-social-note">Follow our salon updates in {city}.</p>
                  ) : instagramHref || facebookHref || youtubeHref ? (
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
              © {year} {brandName}. {site.copy.footerRights}
            </span>
            <span className="au-footer-legal">
              {sectionOn('policies') && site.copy.footerLegal.map((label: string) => (
                <a key={label} href="#aura-policies">
                  {label}
                </a>
              ))}
            </span>
            {branding?.poweredBy && <span>Powered by {branding.platformName}</span>}
          </div>
        </div>
      </footer>}

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
            <AuraImage fallbackSrc={AURA_UNISEX_IMAGES.gallery[lightbox % AURA_UNISEX_IMAGES.gallery.length].src} src={gallery[lightbox].src} alt={gallery[lightbox].title} />
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
              {activeReel.videoSrc ? (
                <AuraVideo src={activeReel.videoSrc} poster={activeReel.posterSrc} title={activeReel.title} />
              ) : activeReel.embedKind === 'iframe' || activeReel.embedUrl.includes('youtube-nocookie.com/embed/') ? (
                <iframe
                  src={activeReel.embedUrl}
                  title={activeReel.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="au-video-external-fallback">
                  <AuraImage fallbackSrc={AURA_UNISEX_IMAGES.aboutInterior.src} src={activeReel.posterSrc} alt={activeReel.title} />
                  <a
                    className="au-btn au-btn-primary"
                    href={activeReel.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {activeReel.externalLabel || 'Open Reel on Instagram'} <ExternalLink size={16} aria-hidden="true" />
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
                {site.copy.heroPrimary}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuraUnisexWebsite;
