import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Instagram,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Play,
  Scissors,
  Sparkles,
  Star,
  UserCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { SalonProfile, SalonService, Stylist } from '../types';
import { CATEGORY_STANDARDIZED_DATA, type Testimonial } from '../templateData';
import type { SalonGalleryPhoto } from '../lib/photoGallery';
import { PHOTO_CATEGORIES, type PhotoCategory } from '../lib/photoGallery';
import { clientExperiences } from '../lib/demoWebsiteContent';
import { socialUrl } from '../lib/websiteContent';
import { showcaseVideos } from '../lib/showcaseVideos';
import { reelSource } from '../lib/socialVideoSource';
import { supabase } from '../lib/supabase';
import {
  LUXURY_EDITORIAL_COPY,
  LUXURY_EDITORIAL_IMAGES,
  ZIYA_BEFORE_AFTER_PAIRS,
  ZIYA_VIDEO_GALLERY,
  isLegacyHairSalonAbout,
  isLegacyHairSalonTagline,
  isWomensHaircutService,
  luxuryEditorialAddress,
  luxuryEditorialBrand,
  luxuryEditorialCity,
  luxuryEditorialCssVariables,
  luxuryEditorialHours,
  luxuryEditorialMapsUrl,
  luxuryEditorialServiceImage,
  luxuryEditorialSrcSet,
  luxuryEditorialTeamImage,
  luxuryEditorialWhatsApp,
  matchGalleryStyleMeta,
  type ZiyaHaircutVideo,
} from '../lib/luxuryEditorial';
import { AppAnnouncementStrip, AppInstallSection } from './AppInstallSection';
import { CustomerReviewPanel } from './CustomerReviewPanel';
import { ExternalReviewFeed } from './ExternalReviewFeed';
import { InlineEditable } from './InlineEditable';
import { TestimonialModal } from './ClientTestimonials';
import { WebsiteSections } from './WebsiteSections';
import './luxuryEditorial.css';

type SharedWebsiteProps = React.ComponentProps<typeof WebsiteSections>;

export interface DirectSalonSlot {
  date: string;
  time: string;
  stylistId: string;
  branchId?: string;
}

export interface LuxuryEditorialWebsiteProps {
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
  onBook: (service?: SalonService, stylist?: Stylist, slot?: DirectSalonSlot) => void;
  onAccount: (mode?: 'signin' | 'signup') => void;
  onMyBookings: () => void;
  onViewSpecialist: (stylistId: string) => void;
}

function isPackageItem(service: SalonService): boolean {
  return /package|combo|bundle/i.test(`${service.category || ''} ${service.name || ''}`);
}

function cleanPackageName(name: string): string {
  return String(name || '')
    .replace(/^\s*Ziya Women[’']s Hair Studio\s*/i, '')
    .replace(/^\s*Miraki Atelier\s*/i, '')
    .replace(/^\s*Luxury Editorial Salon(?:\s*\(01\))?\s*/i, '')
    .replace(/\s*Package\s*$/i, '')
    .trim();
}

function formatInr(amount: number, currency = '₹'): string {
  const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  return `${currency}${safe.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(safe) ? 0 : 2,
  })}`;
}

function nextBookableDays(count = 14): Array<{ iso: string; weekday: string; dayNum: string; month: string }> {
  const out: Array<{ iso: string; weekday: string; dayNum: string; month: string }> = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({
      iso,
      weekday: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dayNum: String(d.getDate()).padStart(2, '0'),
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
    });
  }
  return out;
}

const DEFAULT_STUDIO_SLOTS = [
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:30', label: '1:30 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:30', label: '4:30 PM' },
  { value: '17:30', label: '5:30 PM' },
  { value: '18:30', label: '6:30 PM' },
];

function formatSlotLabel(hhmm: string): string {
  const match = String(hhmm || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return hhmm;
  const h = Number(match[1]);
  const m = match[2];
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}

const STYLE_FILTERS = [
  'All Styles',
  'Long Layers',
  'Butterfly & Step',
  'Bob & Blunt',
  'Short & Pixie',
  'Curtain Bangs & Framing',
  'Curly Cuts',
] as const;

const VIDEO_FILTERS = [
  'All Videos',
  'Layer & Butterfly',
  'Bob & Blunt',
  'Short & Pixie',
  'Bangs & Framing',
  'Before & After',
] as const;

export const LuxuryEditorialWebsite: React.FC<LuxuryEditorialWebsiteProps> = ({
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
}) => {
  const brandName = luxuryEditorialBrand(profile);
  const city = luxuryEditorialCity(profile);
  const address = luxuryEditorialAddress(profile);
  const mapsUrl = luxuryEditorialMapsUrl(profile);
  const whatsappUrl = luxuryEditorialWhatsApp(profile);
  const hours = luxuryEditorialHours(profile);
  const cssVars = useMemo(() => luxuryEditorialCssVariables(profile) as React.CSSProperties, [profile.customAccentColor]);

  const rawEmail = String(profile.email || '').trim();
  const studioEmail =
    !rawEmail || rawEmail === 'appointments@mirakihair.in' ? 'hello@ziyahairstudio.in' : rawEmail;

  const isEditorMode = Boolean(shared.isEditingActive && !shared.readOnly && shared.setProfile);

  // Mobile header drawer
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter out any accidental men's grooming items so only women's haircut services appear
  const womensServices = useMemo(
    () => services.filter((s) => Boolean(s?.name) && isWomensHaircutService(s)),
    [services],
  );
  const coreServices = useMemo(() => womensServices.filter((s) => !isPackageItem(s)), [womensServices]);
  const packageServices = useMemo(() => womensServices.filter(isPackageItem), [womensServices]);

  const serviceCategories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of coreServices) {
      const cat = String(s.category || 'Women’s Haircuts').trim();
      if (cat && !seen.has(cat)) {
        seen.add(cat);
        list.push(cat);
      }
    }
    return list;
  }, [coreServices]);

  const [activeServiceCat, setActiveServiceCat] = useState<string>('All');
  useEffect(() => {
    if (activeServiceCat !== 'All' && !serviceCategories.includes(activeServiceCat)) {
      setActiveServiceCat('All');
    }
  }, [activeServiceCat, serviceCategories]);

  const filteredServices = useMemo(
    () =>
      activeServiceCat === 'All'
        ? coreServices
        : coreServices.filter((s) => String(s.category || '').trim() === activeServiceCat),
    [coreServices, activeServiceCat],
  );

  const featuredService = filteredServices[0] || coreServices[0];
  const gridServices = useMemo(
    () => (featuredService ? filteredServices.filter((s) => s.id !== featuredService.id) : []),
    [filteredServices, featuredService],
  );

  // Female hairstylists only — exclude legacy male demo identity 'Rohan Kapoor'
  const femaleTeam = useMemo(
    () =>
      stylists.filter((st) => {
        if (!st || st.status === 'Inactive') return false;
        const nameLower = String(st.name || '').trim().toLowerCase();
        if (nameLower === 'rohan kapoor') return false;
        return true;
      }),
    [stylists],
  );

  // Dedicated Women's Haircut Video Gallery
  const videosEnabled = enabledSections.includes('videos');
  const ownerUploadedVideos = useMemo<ZiyaHaircutVideo[]>(() => {
    return showcaseVideos(profile)
      .filter((v) => !v.isDemo && Boolean(reelSource(v)))
      .map((v, idx) => {
        const src = reelSource(v);
        const ytId = src?.platform === 'YouTube' ? src.id : v.videoId;
        const poster =
          v.thumbnailUrl ||
          (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : LUXURY_EDITORIAL_IMAGES.services.layer.src);
        return {
          id: v.id || `owner-vid-${idx}`,
          videoId: ytId || '',
          youtubeUrl: src?.url || v.youtubeUrl,
          title: v.title || 'Studio Haircut Reel',
          subtitle: v.description || `${brandName} women’s haircut showcase`,
          styleCategory: 'Layer & Butterfly',
          durationLabel: 'Studio Reel',
          stylistCredit: brandName,
          posterUrl: poster,
          fallbackPosterUrl: LUXURY_EDITORIAL_IMAGES.services.layer.src,
          isOwnerVideo: true,
          previewVideoUrl: v.previewVideoUrl,
        };
      });
  }, [profile, brandName]);

  const allHaircutVideos = useMemo<ZiyaHaircutVideo[]>(() => {
    return [...ownerUploadedVideos, ...ZIYA_VIDEO_GALLERY];
  }, [ownerUploadedVideos]);

  const [videoFilter, setVideoFilter] = useState<(typeof VIDEO_FILTERS)[number]>('All Videos');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [videoMuted, setVideoMuted] = useState<boolean>(false);

  const visibleVideos = useMemo(
    () =>
      videoFilter === 'All Videos'
        ? allHaircutVideos
        : allHaircutVideos.filter((v) => v.styleCategory === videoFilter),
    [allHaircutVideos, videoFilter],
  );

  // Haircut Style Gallery & Lightbox
  const validGallery = useMemo(
    () => galleryPhotos.filter((item) => Boolean(item?.url?.trim())),
    [galleryPhotos],
  );
  const isSampleGallery = validGallery.length > 0 && validGallery.every((item) => item.isDemo);

  const ownerGalleryCategories = useMemo(
    () => PHOTO_CATEGORIES.filter((cat) => validGallery.some((p) => p.category === cat)),
    [validGallery],
  );
  const [styleFilter, setStyleFilter] = useState<string>('All Styles');
  const [ownerCatFilter, setOwnerCatFilter] = useState<PhotoCategory | 'All'>('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeBaIndex, setActiveBaIndex] = useState<number>(0);
  const [baSliderPos, setBaSliderPos] = useState<number>(52);

  const displayedGallery = useMemo(() => {
    if (isSampleGallery) {
      if (styleFilter === 'All Styles') return validGallery;
      return validGallery.filter((item, idx) => matchGalleryStyleMeta(item.title, idx).styleFilter === styleFilter);
    }
    if (ownerCatFilter === 'All') return validGallery;
    return validGallery.filter((item) => item.category === ownerCatFilter);
  }, [validGallery, isSampleGallery, styleFilter, ownerCatFilter]);

  useEffect(() => {
    if (lightboxIndex === null) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex((cur) => (cur === null ? null : (cur + 1) % displayedGallery.length));
      if (e.key === 'ArrowLeft')
        setLightboxIndex((cur) => (cur === null ? null : (cur - 1 + displayedGallery.length) % displayedGallery.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, displayedGallery.length]);

  // Customer Reviews (merges real reviews first; in demo/preview mode displays full 6 women's haircut reviews)
  const curatedReviews = useMemo(
    () =>
      clientExperiences(profile)
        .filter((r) => String(r.comment || '').trim().length > 0)
        .filter((r) => String(r.name || '').trim().toLowerCase() !== 'aditya sen')
        .filter((r) => !/keratin|botox/i.test(String(r.serviceName || ''))),
    [profile],
  );
  const realReviews = useMemo(() => curatedReviews.filter((r) => !r.isDemo), [curatedReviews]);

  const displayReviews = useMemo<Testimonial[]>(() => {
    if (realReviews.length > 0) return realReviews;
    if (profile.subdomain) return [];
    if (profile.demoTestimonialsInitialized && Array.isArray(profile.websiteTestimonials) && profile.websiteTestimonials.length === 0) {
      return [];
    }
    const base = [...curatedReviews];
    const seen = new Set(base.map((r) => r.comment.trim().toLowerCase()));
    for (const extra of CATEGORY_STANDARDIZED_DATA.hair_salon.reviews) {
      const key = extra.comment.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        base.push({ ...extra, isDemo: true, verified: false });
      }
    }
    return base;
  }, [realReviews, curatedReviews, profile.subdomain, profile.demoTestimonialsInitialized, profile.websiteTestimonials]);

  // Review editing modal state (active when owner is in website editor)
  const [testimonialModalOpen, setTestimonialModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Testimonial | null>(null);

  // Interactive Women's Haircut Booking Desk (#salon-bookings)
  const bookableDays = useMemo(() => nextBookableDays(14), []);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(() => coreServices[0]?.id || '');
  const [selectedStylistId, setSelectedStylistId] = useState<string>(() => femaleTeam[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(() => bookableDays[0]?.iso || '');
  const [selectedTime, setSelectedTime] = useState<string>('11:00');
  const [liveSlots, setLiveSlots] = useState<Array<{ value: string; label: string }>>(DEFAULT_STUDIO_SLOTS);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  useEffect(() => {
    if (coreServices.length > 0 && !coreServices.some((s) => s.id === selectedServiceId)) {
      setSelectedServiceId(coreServices[0].id);
    }
  }, [coreServices, selectedServiceId]);

  useEffect(() => {
    if (selectedStylistId && !femaleTeam.some((st) => st.id === selectedStylistId)) {
      setSelectedStylistId(femaleTeam[0]?.id || '');
    }
  }, [femaleTeam, selectedStylistId]);

  const activeBookingService = useMemo(
    () => coreServices.find((s) => s.id === selectedServiceId) || coreServices[0],
    [coreServices, selectedServiceId],
  );
  const activeBookingStylist = useMemo(
    () => femaleTeam.find((st) => st.id === selectedStylistId),
    [femaleTeam, selectedStylistId],
  );

  // Fetch live available slots when published subdomain is present; fall back cleanly to studio IST slots
  useEffect(() => {
    let active = true;
    const slug = String(profile.subdomain || '').trim();
    if (!slug || !selectedDate || !activeBookingService) {
      setLiveSlots(DEFAULT_STUDIO_SLOTS);
      return undefined;
    }
    setLoadingSlots(true);
    Promise.resolve(
      supabase.rpc('studioflow_available_slots', {
        salon_slug: slug,
        booking_date: selectedDate,
        duration_minutes: activeBookingService.durationMinutes || 45,
        stylist_id: activeBookingStylist?.id || null,
        branch_id: null,
      }),
    )
      .then((res) => {
        if (!active) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        if (rows.length > 0) {
          const parsed = rows
            .map((item: unknown) => (typeof item === 'string' ? item : String((item as Record<string, unknown>)?.slot_time || (item as Record<string, unknown>)?.time || '')))
            .filter(Boolean)
            .map((val) => ({ value: val, label: formatSlotLabel(val) }));
          if (parsed.length > 0) {
            setLiveSlots(parsed);
            if (!parsed.some((p) => p.value === selectedTime)) {
              setSelectedTime(parsed[0].value);
            }
            return;
          }
        }
        setLiveSlots(DEFAULT_STUDIO_SLOTS);
      })
      .catch(() => {
        if (active) setLiveSlots(DEFAULT_STUDIO_SLOTS);
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [profile.subdomain, selectedDate, activeBookingService, activeBookingStylist?.id]);

  const handleBookingDeskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slot: DirectSalonSlot | undefined =
      selectedDate && selectedTime
        ? {
            date: selectedDate,
            time: selectedTime,
            stylistId: activeBookingStylist?.id || femaleTeam[0]?.id || '',
          }
        : undefined;
    onBook(activeBookingService, activeBookingStylist, slot);
  };

  // Owner-customizable headings with Women's Haircut Studio defaults
  const heroTitle =
    String(profile.sectionHeadings?.heroTitle || '').trim() || LUXURY_EDITORIAL_COPY.heroHeadline;
  const heroSubtitle =
    profile.tagline && !isLegacyHairSalonTagline(profile.tagline)
      ? profile.tagline
      : LUXURY_EDITORIAL_COPY.heroSubheadline;
  const aboutBody =
    profile.about && !isLegacyHairSalonAbout(profile.about)
      ? profile.about
      : LUXURY_EDITORIAL_COPY.aboutBody;

  const servicesHeading =
    String(profile.sectionHeadings?.servicesTitle || '').trim() || LUXURY_EDITORIAL_COPY.servicesTitle;
  const servicesSubheading =
    String(profile.sectionHeadings?.servicesSubtitle || '').trim() || LUXURY_EDITORIAL_COPY.servicesIntro;
  const videosHeading =
    String(profile.sectionHeadings?.videosTitle || '').trim() || LUXURY_EDITORIAL_COPY.videosTitle;
  const videosSubheading =
    String(profile.sectionHeadings?.videosSubtitle || '').trim() || LUXURY_EDITORIAL_COPY.videosIntro;
  const teamHeading =
    String(profile.sectionHeadings?.stylistsTitle || '').trim() || LUXURY_EDITORIAL_COPY.teamTitle;
  const galleryHeading =
    String(profile.sectionHeadings?.galleryTitle || '').trim() || LUXURY_EDITORIAL_COPY.galleryTitle;
  const reviewsHeading =
    String(profile.sectionHeadings?.testimonialsTitle || '').trim() || LUXURY_EDITORIAL_COPY.testimonialsTitle;
  const locationHeading =
    String(profile.sectionHeadings?.locationTitle || '').trim() || LUXURY_EDITORIAL_COPY.locationTitle;

  const ownerExtras = useMemo(
    () =>
      enabledSections.filter((s): s is 'promo' | 'social' | 'loyalty' | 'policies' | 'share' =>
        ['promo', 'social', 'loyalty', 'policies', 'share'].includes(s),
      ),
    [enabledSections],
  );

  const instagramHref = socialUrl(profile.instagramHandle || '@ziya.hairstudio', 'instagram');
  const facebookHref = socialUrl(profile.facebookPage, 'facebook');
  const youtubeHref = socialUrl(profile.youtubeChannel, 'youtube');

  const currentBa = ZIYA_BEFORE_AFTER_PAIRS[activeBaIndex % ZIYA_BEFORE_AFTER_PAIRS.length];

  return (
    <div className="le-site" style={cssVars}>
      {/* ===================================================================
          STICKY HEADER — Ziya Women’s Hair Studio (Zero App Install in Header)
         =================================================================== */}
      <header className="le-header" aria-label="Customer account and salon navigation">
        <div className="le-container le-header-inner">
          <a href="#salon-home" className="le-brand" aria-label={`${brandName} home`}>
            {profile.logoUrl ? (
              <img src={profile.logoUrl} alt={brandName} className="le-brand-logo" />
            ) : (
              <span className="le-brand-monogram" aria-hidden="true">
                Z
              </span>
            )}
            <span className="le-brand-text">
              <span className="le-brand-name">{brandName}</span>
              <span className="le-brand-sub">{LUXURY_EDITORIAL_COPY.brandSublabel}</span>
            </span>
          </a>

          <nav className="le-nav" aria-label="Salon sections">
            <a href="#salon-home">Home</a>
            <a href="#salon-about">About</a>
            <a href="#services-section">Services</a>
            {videosEnabled && <a href="#salon-videos">Videos</a>}
            <a href="#salon-team">Stylists</a>
            <a href="#salon-lookbook">Gallery</a>
            <a href="#salon-location">Contact</a>
          </nav>

          <div className="le-header-actions">
            {customerSignedIn ? (
              <>
                <button
                  type="button"
                  className="le-header-link"
                  onClick={onMyBookings}
                >
                  My Bookings
                </button>
                <button
                  type="button"
                  className="le-account-pill"
                  aria-label="Manage your customer account"
                  onClick={() => onAccount('signin')}
                >
                  {customerPhotoUrl ? (
                    <img src={customerPhotoUrl} alt="" className="le-account-avatar" />
                  ) : (
                    <UserCheck size={15} aria-hidden="true" />
                  )}
                  <span>{customerName || 'Account'}</span>
                </button>
              </>
            ) : (
              <>
                <button type="button" className="le-header-link le-hide-tablet" onClick={onMyBookings}>
                  My Bookings
                </button>
                <button
                  type="button"
                  className="le-header-link le-hide-tablet"
                  onClick={() => onAccount('signin')}
                >
                  Customer Login
                </button>
                <button
                  type="button"
                  className="le-header-link le-hide-tablet"
                  onClick={() => onAccount('signup')}
                >
                  Sign up
                </button>
              </>
            )}

            {bookingAvailable && (
              <button
                type="button"
                className="le-btn le-btn-primary le-btn-sm"
                onClick={() => onBook(featuredService)}
              >
                Book Appointment
              </button>
            )}

            <button
              type="button"
              className="le-mobile-toggle"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="le-mobile-drawer" role="dialog" aria-label="Mobile salon menu">
            <nav className="le-mobile-nav" aria-label="Mobile salon sections">
              <a href="#salon-home" onClick={() => setMobileMenuOpen(false)}>
                Home
              </a>
              <a href="#salon-about" onClick={() => setMobileMenuOpen(false)}>
                About the Studio
              </a>
              <a href="#services-section" onClick={() => setMobileMenuOpen(false)}>
                Women’s Haircut Services
              </a>
              {videosEnabled && (
                <a href="#salon-videos" onClick={() => setMobileMenuOpen(false)}>
                  Haircut Video Gallery
                </a>
              )}
              <a href="#salon-team" onClick={() => setMobileMenuOpen(false)}>
                Female Hairstylists
              </a>
              <a href="#salon-lookbook" onClick={() => setMobileMenuOpen(false)}>
                Haircut Style Gallery
              </a>
              <a href="#salon-bookings" onClick={() => setMobileMenuOpen(false)}>
                Book Your Haircut
              </a>
              <a href="#salon-location" onClick={() => setMobileMenuOpen(false)}>
                Contact & Location
              </a>
            </nav>

            <div className="le-mobile-account">
              <button
                type="button"
                className="le-btn le-btn-outline le-btn-block"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onMyBookings();
                }}
              >
                My Bookings
              </button>
              {!customerSignedIn ? (
                <div className="le-mobile-auth-row">
                  <button
                    type="button"
                    className="le-btn le-btn-ghost"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onAccount('signin');
                    }}
                  >
                    Customer Login
                  </button>
                  <button
                    type="button"
                    className="le-btn le-btn-ghost"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onAccount('signup');
                    }}
                  >
                    Sign up
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="le-btn le-btn-ghost le-btn-block"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onAccount('signin');
                  }}
                >
                  Manage Account
                </button>
              )}
              {bookingAvailable && (
                <button
                  type="button"
                  className="le-btn le-btn-primary le-btn-block"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onBook(featuredService);
                  }}
                >
                  Book Your Haircut
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        {/* =================================================================
            1. HERO SECTION — Women’s Haircut Specialist Atelier
           ================================================================= */}
        <section id="salon-home" data-layout="hero" className="le-hero">
          <div className="le-container le-hero-grid">
            <div className="le-hero-copy">
              <div className="le-eyebrow-pill">
                <Scissors size={13} aria-hidden="true" />
                <span>{LUXURY_EDITORIAL_COPY.heroEyebrow}</span>
              </div>

              <h1 className="le-hero-title">
                {isEditorMode && shared.setProfile ? (
                  <InlineEditable
                    value={heroTitle}
                    onSave={(val) =>
                      shared.setProfile!((prev) => ({
                        ...prev,
                        sectionHeadings: { ...prev.sectionHeadings, heroTitle: String(val) },
                      }))
                    }
                  />
                ) : (
                  heroTitle
                )}
              </h1>

              <p className="le-hero-subtitle">
                {isEditorMode && shared.setProfile ? (
                  <InlineEditable
                    value={heroSubtitle}
                    type="textarea"
                    onSave={(val) => shared.setProfile!((prev) => ({ ...prev, tagline: String(val) }))}
                  />
                ) : (
                  heroSubtitle
                )}
              </p>

              <div className="le-hero-ctas">
                {bookingAvailable ? (
                  <button
                    type="button"
                    className="le-btn le-btn-primary le-btn-lg"
                    onClick={() => onBook(featuredService)}
                  >
                    <span>{LUXURY_EDITORIAL_COPY.heroPrimaryCta}</span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                ) : (
                  <a href="#salon-bookings" className="le-btn le-btn-primary le-btn-lg">
                    <span>{LUXURY_EDITORIAL_COPY.heroPrimaryCta}</span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </a>
                )}

                <a href="#salon-lookbook" className="le-btn le-btn-secondary le-btn-lg">
                  <span>{LUXURY_EDITORIAL_COPY.heroSecondaryCta}</span>
                </a>
              </div>

              <ul className="le-hero-highlights" aria-label="Studio highlights">
                {LUXURY_EDITORIAL_COPY.heroHighlights.map((item) => (
                  <li key={item}>
                    <span className="le-gold-dot" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="le-hero-metrics">
                <div className="le-metric">
                  <strong>4.98 ★</strong>
                  <span>Women’s Cut Rating</span>
                </div>
                <div className="le-metric-divider" aria-hidden="true" />
                <div className="le-metric">
                  <strong>14+</strong>
                  <span>Signature Cut Styles</span>
                </div>
                <div className="le-metric-divider" aria-hidden="true" />
                <div className="le-metric">
                  <strong>100%</strong>
                  <span>Female Stylist Team</span>
                </div>
              </div>
            </div>

            <div className="le-hero-visual">
              <div className="le-hero-arch-frame">
                <img
                  src={
                    profile.coverImageUrl &&
                    !profile.coverImageUrl.includes('hero-900.webp')
                      ? profile.coverImageUrl
                      : LUXURY_EDITORIAL_IMAGES.hero.src
                  }
                  srcSet={
                    !profile.coverImageUrl ||
                    profile.coverImageUrl === LUXURY_EDITORIAL_IMAGES.hero.src ||
                    profile.coverImageUrl.includes('hero-900.webp')
                      ? LUXURY_EDITORIAL_IMAGES.hero.srcSet
                      : luxuryEditorialSrcSet(profile.coverImageUrl)
                  }
                  sizes="(max-width: 900px) 92vw, 46vw"
                  width={LUXURY_EDITORIAL_IMAGES.hero.width}
                  height={LUXURY_EDITORIAL_IMAGES.hero.height}
                  alt={LUXURY_EDITORIAL_IMAGES.hero.alt}
                  className="le-hero-img"
                  fetchPriority="high"
                />
              </div>

              <div className="le-hero-floating-card le-hero-floating-top">
                <Sparkles size={15} className="le-gold-icon" aria-hidden="true" />
                <div>
                  <strong>Face-Shape Matched</strong>
                  <span>Oval · Round · Heart · Square</span>
                </div>
              </div>

              <div className="le-hero-detail-card">
                <img
                  src={LUXURY_EDITORIAL_IMAGES.heroDetail.src}
                  srcSet={LUXURY_EDITORIAL_IMAGES.heroDetail.srcSet}
                  sizes="140px"
                  width={96}
                  height={96}
                  alt={LUXURY_EDITORIAL_IMAGES.heroDetail.alt}
                  loading="lazy"
                />
                <div>
                  <span className="le-kicker-mini">Precision Craft</span>
                  <strong>Layer · Butterfly · Bob · Bangs</strong>
                  <p>Tailored exclusively for women’s hair textures</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            2. ABOUT THE SALON — Specialists in Women’s Haircuts
           ================================================================= */}
        <section id="salon-about" data-layout="about" className="le-section le-about-section">
          <div className="le-container">
            <div className="le-about-grid">
              <div className="le-about-media-col">
                <div className="le-about-main-photo">
                  <img
                    src={LUXURY_EDITORIAL_IMAGES.about.src}
                    srcSet={LUXURY_EDITORIAL_IMAGES.about.srcSet}
                    sizes="(max-width: 900px) 92vw, 48vw"
                    width={LUXURY_EDITORIAL_IMAGES.about.width}
                    height={LUXURY_EDITORIAL_IMAGES.about.height}
                    alt={LUXURY_EDITORIAL_IMAGES.about.alt}
                    loading="lazy"
                  />
                </div>
                <div className="le-about-founder-card">
                  <img
                    src={
                      profile.ownerPhotoUrl && !profile.ownerPhotoUrl.includes('about-detail')
                        ? profile.ownerPhotoUrl
                        : LUXURY_EDITORIAL_IMAGES.team[0].src
                    }
                    alt={profile.ownerName || 'Ziya Khan'}
                    loading="lazy"
                  />
                  <div>
                    <span className="le-kicker-mini">Founder’s Promise</span>
                    <strong>
                      {profile.ownerName && profile.ownerName !== 'Ananya Sharma'
                        ? profile.ownerName
                        : 'Ziya Khan'}
                    </strong>
                    <span>
                      {profile.ownerRole && !profile.ownerRole.includes('Vidal')
                        ? profile.ownerRole
                        : 'Founder & Master Women’s Haircut Specialist'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="le-about-text-col">
                <span className="le-eyebrow">{LUXURY_EDITORIAL_COPY.aboutEyebrow}</span>
                <h2 className="le-section-title">{LUXURY_EDITORIAL_COPY.aboutTitle}</h2>
                <blockquote className="le-about-quote">
                  “{LUXURY_EDITORIAL_COPY.aboutQuote}”
                </blockquote>
                <p className="le-body-copy">
                  {isEditorMode && shared.setProfile ? (
                    <InlineEditable
                      value={aboutBody}
                      type="textarea"
                      onSave={(val) => shared.setProfile!((prev) => ({ ...prev, about: String(val) }))}
                    />
                  ) : (
                    aboutBody
                  )}
                </p>
                <p className="le-body-copy">{LUXURY_EDITORIAL_COPY.aboutBodySecondary}</p>

                <div className="le-pillars-grid">
                  {LUXURY_EDITORIAL_COPY.pillars.map((pillar) => (
                    <article key={pillar.number} className="le-pillar-card">
                      <span className="le-pillar-num">{pillar.number}</span>
                      <h3>{pillar.title}</h3>
                      <p>{pillar.detail}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            3. WOMEN’S HAIRCUT SERVICES — 14 Specialist Cuts + Combos
           ================================================================= */}
        <section id="services-section" data-layout="services" className="le-section le-services-section">
          <div className="le-container">
            <div className="le-section-header le-center-header">
              <span className="le-eyebrow">{LUXURY_EDITORIAL_COPY.servicesEyebrow}</span>
              <h2 className="le-section-title">
                {isEditorMode && shared.setProfile ? (
                  <InlineEditable
                    value={servicesHeading}
                    onSave={(val) =>
                      shared.setProfile!((prev) => ({
                        ...prev,
                        sectionHeadings: { ...prev.sectionHeadings, servicesTitle: String(val) },
                      }))
                    }
                  />
                ) : (
                  servicesHeading
                )}
              </h2>
              <p className="le-section-lead">{servicesSubheading}</p>
            </div>

            {serviceCategories.length > 1 && (
              <div className="le-filter-bar" role="tablist" aria-label="Service categories">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeServiceCat === 'All'}
                  className={`le-filter-chip ${activeServiceCat === 'All' ? 'is-active' : ''}`}
                  onClick={() => setActiveServiceCat('All')}
                >
                  All Haircuts ({coreServices.length})
                </button>
                {serviceCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={activeServiceCat === cat}
                    className={`le-filter-chip ${activeServiceCat === cat ? 'is-active' : ''}`}
                    onClick={() => setActiveServiceCat(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {featuredService && (
              <article className="le-feature">
                <div className="le-feature-media">
                  <img
                    src={luxuryEditorialServiceImage(featuredService)}
                    srcSet={luxuryEditorialSrcSet(luxuryEditorialServiceImage(featuredService))}
                    sizes="(max-width: 900px) 92vw, 44vw"
                    alt={featuredService.name}
                    loading="lazy"
                  />
                  <span className="le-feature-badge">{LUXURY_EDITORIAL_COPY.featuredLabel}</span>
                </div>
                <div className="le-feature-body">
                  <span className="le-service-cat-tag">
                    {featuredService.category || 'Signature Women’s Cut'}
                  </span>
                  <h3 className="le-feature-title">{featuredService.name}</h3>
                  <p className="le-feature-desc">
                    {featuredService.description ||
                      'Personalised face-shape consultation, precision sectioning and salon styling tailored for women.'}
                  </p>
                  <div className="le-feature-meta">
                    <span className="le-price-lg">
                      {formatInr(featuredService.price, profile.currency || '₹')}
                    </span>
                    {featuredService.showDuration !== false && (
                      <span className="le-duration-pill">
                        <Clock size={14} aria-hidden="true" />
                        {featuredService.durationMinutes} min
                      </span>
                    )}
                  </div>
                  <div className="le-feature-actions">
                    {bookingAvailable && (
                      <button
                        type="button"
                        className="le-btn le-btn-primary"
                        onClick={() => {
                          setSelectedServiceId(featuredService.id);
                          onBook(featuredService);
                        }}
                      >
                        <span>Book Haircut</span>
                        <ArrowRight size={16} aria-hidden="true" />
                      </button>
                    )}
                    <a
                      href="#salon-bookings"
                      className="le-btn le-btn-ghost"
                      onClick={() => setSelectedServiceId(featuredService.id)}
                    >
                      Check Studio Slots
                    </a>
                  </div>
                </div>
              </article>
            )}

            {gridServices.length > 0 && (
              <div className="le-services-grid">
                {gridServices.map((service) => {
                  const photoUrl = luxuryEditorialServiceImage(service);
                  return (
                    <article key={service.id} className="le-service-card">
                      <div className="le-service-media">
                        <img
                          src={photoUrl}
                          srcSet={luxuryEditorialSrcSet(photoUrl)}
                          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                          alt={service.name}
                          loading="lazy"
                        />
                        {service.popular && <span className="le-popular-pill">Popular</span>}
                      </div>
                      <div className="le-service-content">
                        <div className="le-service-top">
                          <span className="le-service-cat-tag">
                            {service.category || 'Women’s Haircut'}
                          </span>
                          {service.showDuration !== false && (
                            <span className="le-service-duration">
                              <Clock size={13} aria-hidden="true" />
                              {service.durationMinutes} min
                            </span>
                          )}
                        </div>
                        <h3 className="le-service-name">{service.name}</h3>
                        <p className="le-service-desc">
                          {service.description ||
                            'Precision women’s haircut customized to your face shape and hair texture.'}
                        </p>
                        <div className="le-service-footer">
                          <strong className="le-service-price">
                            {formatInr(service.price, profile.currency || '₹')}
                          </strong>
                          {bookingAvailable && (
                            <button
                              type="button"
                              className="le-btn le-btn-outline le-btn-sm"
                              onClick={() => {
                                setSelectedServiceId(service.id);
                                onBook(service);
                              }}
                            >
                              Book Haircut
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {showPackages && packageServices.length > 0 && (
              <div id="salon-packages" className="le-packages-block">
                <div className="le-packages-head">
                  <div>
                    <span className="le-eyebrow">{LUXURY_EDITORIAL_COPY.packagesEyebrow}</span>
                    <h3 className="le-packages-title">
                      {String(profile.sectionHeadings?.packagesTitle || '').trim() ||
                        LUXURY_EDITORIAL_COPY.packagesTitle}
                    </h3>
                  </div>
                  <p className="le-packages-note">
                    Thoughtfully paired women’s haircut & blowout combinations for complete care.
                  </p>
                </div>

                <div className="le-packages-grid">
                  {packageServices.map((pkg) => {
                    const pkgPhoto = luxuryEditorialServiceImage(pkg);
                    return (
                      <article key={pkg.id} className="le-package-card">
                        <div className="le-package-media">
                          <img
                            src={pkgPhoto}
                            srcSet={luxuryEditorialSrcSet(pkgPhoto)}
                            sizes="(max-width: 768px) 92vw, 30vw"
                            alt={cleanPackageName(pkg.name)}
                            loading="lazy"
                          />
                        </div>
                        <div className="le-package-body">
                          <span className="le-kicker-mini">Studio Pairing</span>
                          <h4>{cleanPackageName(pkg.name)}</h4>
                          <p>{pkg.description}</p>
                          <div className="le-package-meta">
                            <strong>{formatInr(pkg.price, profile.currency || '₹')}</strong>
                            {pkg.showDuration !== false && <span>{pkg.durationMinutes} min</span>}
                          </div>
                          {bookingAvailable && (
                            <button
                              type="button"
                              className="le-btn le-btn-outline le-btn-sm le-btn-block"
                              onClick={() => onBook(pkg)}
                            >
                              Book package
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =================================================================
            4. WOMEN’S HAIRCUT VIDEO GALLERY — Strictly Women’s Haircuts Only
           ================================================================= */}
        {videosEnabled && (
          <section
            id="salon-videos"
            data-section="videos"
            className="le-section le-videos-section"
          >
            <div className="le-container">
              <div className="le-section-header le-center-header">
                <span className="le-eyebrow">{LUXURY_EDITORIAL_COPY.videosEyebrow}</span>
                <h2 className="le-section-title">
                  {isEditorMode && shared.setProfile ? (
                    <InlineEditable
                      value={videosHeading}
                      onSave={(val) =>
                        shared.setProfile!((prev) => ({
                          ...prev,
                          sectionHeadings: { ...prev.sectionHeadings, videosTitle: String(val) },
                        }))
                      }
                    />
                  ) : (
                    videosHeading
                  )}
                </h2>
                <p className="le-section-lead">
                  {isEditorMode && shared.setProfile ? (
                    <InlineEditable
                      value={videosSubheading}
                      type="textarea"
                      onSave={(val) =>
                        shared.setProfile!((prev) => ({
                          ...prev,
                          sectionHeadings: { ...prev.sectionHeadings, videosSubtitle: String(val) },
                        }))
                      }
                    />
                  ) : (
                    videosSubheading
                  )}
                </p>
              </div>

              <div className="le-filter-bar" role="tablist" aria-label="Filter haircut videos">
                {VIDEO_FILTERS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={videoFilter === tab}
                    className={`le-filter-chip ${videoFilter === tab ? 'is-active' : ''}`}
                    onClick={() => {
                      setVideoFilter(tab);
                      setPlayingVideoId(null);
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="le-video-grid">
                {visibleVideos.map((vid) => {
                  const isPlaying = playingVideoId === vid.id;
                  return (
                    <article
                      key={vid.id}
                      className={`le-video-card ${isPlaying ? 'is-playing' : ''}`}
                    >
                      <div className="le-video-frame">
                        {isPlaying ? (
                          <div className="le-video-player-wrap">
                            {vid.previewVideoUrl ? (
                              <video
                                src={vid.previewVideoUrl}
                                poster={vid.posterUrl}
                                controls
                                autoPlay
                                muted={videoMuted}
                                playsInline
                                className="le-video-embed"
                              />
                            ) : (
                              <iframe
                                src={`https://www.youtube-nocookie.com/embed/${vid.videoId}?autoplay=1&mute=${videoMuted ? 1 : 0}&controls=1&playsinline=1&rel=0&modestbranding=1`}
                                title={vid.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="le-video-embed"
                              />
                            )}
                            <div className="le-video-live-bar">
                              <button
                                type="button"
                                className="le-video-ctrl-btn"
                                onClick={() => setVideoMuted((m) => !m)}
                                aria-label={videoMuted ? 'Unmute video' : 'Mute video'}
                              >
                                {videoMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                <span>{videoMuted ? 'Unmute' : 'Sound On'}</span>
                              </button>
                              <button
                                type="button"
                                className="le-video-ctrl-btn"
                                onClick={() => setPlayingVideoId(null)}
                                aria-label="Stop video playback"
                              >
                                <X size={14} />
                                <span>Close</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="le-video-poster-btn"
                            onClick={() => setPlayingVideoId(vid.id)}
                            aria-label={`Play haircut video: ${vid.title}`}
                          >
                            <img
                              src={vid.posterUrl}
                              alt={`${vid.title} — women’s haircut video thumbnail`}
                              loading="lazy"
                              onError={(e) => {
                                const el = e.currentTarget;
                                if (el.src !== vid.fallbackPosterUrl) {
                                  el.src = vid.fallbackPosterUrl;
                                } else {
                                  el.src = LUXURY_EDITORIAL_IMAGES.services.layer.src;
                                }
                              }}
                            />
                            <span className="le-video-badge">{vid.styleCategory}</span>
                            <span className="le-video-duration">{vid.durationLabel}</span>
                            <span className="le-video-play-circle" aria-hidden="true">
                              <Play size={22} fill="currentColor" />
                            </span>
                          </button>
                        )}
                      </div>

                      <div className="le-video-info">
                        <h3>{vid.title}</h3>
                        <p>{vid.subtitle}</p>
                        <div className="le-video-meta-row">
                          <span className="le-video-credit">
                            {vid.isOwnerVideo ? 'Studio Reel' : `Cut Reference · ${vid.stylistCredit}`}
                          </span>
                          <a
                            href={vid.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="le-video-ext-link"
                            aria-label={`Watch ${vid.title} on source platform`}
                          >
                            <span>Watch</span>
                            <ExternalLink size={12} aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* =================================================================
            5. HAIR EXPERTS & TEAM — 100% Female Hairstylists
           ================================================================= */}
        <section id="salon-team" data-layout="team" className="le-section le-team-section">
          <div className="le-container">
            <div className="le-section-header le-center-header">
              <span className="le-eyebrow">{LUXURY_EDITORIAL_COPY.teamEyebrow}</span>
              <h2 className="le-section-title">{teamHeading}</h2>
              <p className="le-section-lead">{LUXURY_EDITORIAL_COPY.teamIntro}</p>
            </div>

            <div className="le-team-grid">
              {femaleTeam.map((stylist, index) => {
                const photo = luxuryEditorialTeamImage(stylist, index);
                const firstName = stylist.name.split(' ')[0] || 'Stylist';
                const expYears = stylist.experienceYears || [9, 7, 6, 6][index % 4];
                return (
                  <article key={stylist.id} className="le-stylist-card">
                    <div className="le-stylist-media">
                      <img
                        src={photo.src}
                        srcSet={photo.srcSet || undefined}
                        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 24vw"
                        width={photo.width}
                        height={photo.height}
                        alt={photo.alt}
                        loading="lazy"
                      />
                      <span className="le-exp-badge">{expYears}+ Yrs Experience</span>
                    </div>

                    <div className="le-stylist-body">
                      <div className="le-stylist-top">
                        <span className="le-stylist-role">
                          {stylist.role || 'Women’s Haircut Specialist'}
                        </span>
                        {stylist.rating && (
                          <span className="le-stylist-rating">
                            <Star size={13} fill="currentColor" aria-hidden="true" />
                            {Number(stylist.rating).toFixed(2)}
                          </span>
                        )}
                      </div>

                      <h3 className="le-stylist-name">{stylist.name}</h3>

                      {stylist.bio && <p className="le-stylist-bio">{stylist.bio}</p>}

                      {Array.isArray(stylist.specialties) && stylist.specialties.length > 0 && (
                        <ul className="le-specialty-tags" aria-label={`${stylist.name} haircut specialties`}>
                          {stylist.specialties.slice(0, 3).map((spec) => (
                            <li key={spec}>{spec}</li>
                          ))}
                        </ul>
                      )}

                      <div className="le-stylist-actions">
                        {bookingAvailable && (
                          <button
                            type="button"
                            className="le-btn le-btn-primary le-btn-sm le-btn-block"
                            onClick={() => {
                              setSelectedStylistId(stylist.id);
                              onBook(undefined, stylist);
                            }}
                          >
                            Book with {firstName}
                          </button>
                        )}
                        <button
                          type="button"
                          className="le-stylist-profile-link"
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

        {/* =================================================================
            6. HAIRCUT STYLE GALLERY & BEFORE/AFTER TRANSFORMATIONS
           ================================================================= */}
        <section id="salon-lookbook" data-layout="gallery" className="le-section le-gallery-section">
          <div className="le-container">
            <div className="le-section-header le-center-header">
              <span className="le-eyebrow">{LUXURY_EDITORIAL_COPY.galleryEyebrow}</span>
              <h2 className="le-section-title">{galleryHeading}</h2>
              <p className="le-section-lead">{LUXURY_EDITORIAL_COPY.galleryIntro}</p>
              {isSampleGallery && (
                <p className="le-sample-note">
                  Sample lookbook imagery · Women’s haircut inspiration curated for {brandName}
                </p>
              )}
            </div>

            {isSampleGallery ? (
              <div className="le-filter-bar" role="tablist" aria-label="Filter haircut styles">
                {STYLE_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    role="tab"
                    aria-selected={styleFilter === filter}
                    className={`le-filter-chip ${styleFilter === filter ? 'is-active' : ''}`}
                    onClick={() => setStyleFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            ) : (
              ownerGalleryCategories.length > 1 && (
                <div className="le-filter-bar" role="tablist" aria-label="Filter salon photos">
                  <button
                    type="button"
                    className={`le-filter-chip ${ownerCatFilter === 'All' ? 'is-active' : ''}`}
                    onClick={() => setOwnerCatFilter('All')}
                  >
                    All ({validGallery.length})
                  </button>
                  {ownerGalleryCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`le-filter-chip ${ownerCatFilter === cat ? 'is-active' : ''}`}
                      onClick={() => setOwnerCatFilter(cat)}
                    >
                      {cat} ({validGallery.filter((p) => p.category === cat).length})
                    </button>
                  ))}
                </div>
              )
            )}

            <div className="le-lookbook-grid">
              {displayedGallery.map((photo, index) => {
                const meta = matchGalleryStyleMeta(photo.title, index);
                return (
                  <figure key={photo.id} className={`le-tile le-tile-${(index % 3) + 1}`}>
                    <button
                      type="button"
                      className="le-tile-trigger"
                      onClick={() => setLightboxIndex(index)}
                      aria-label={`Inspect haircut style: ${photo.title}`}
                    >
                      <img
                        src={photo.url}
                        srcSet={luxuryEditorialSrcSet(photo.url)}
                        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
                        alt={photo.title}
                        loading="lazy"
                      />
                      <span className="le-tile-tag">{isSampleGallery ? meta.cutTag : photo.category}</span>
                    </button>
                    <figcaption className="le-tile-caption">
                      <div>
                        <strong>{photo.title}</strong>
                        {isSampleGallery && <span>Best for: {meta.faceShape}</span>}
                      </div>
                      {bookingAvailable && (
                        <button
                          type="button"
                          className="le-tile-book"
                          onClick={() => {
                            const matched = coreServices.find((s) =>
                              photo.title.toLowerCase().includes(s.name.split(' ')[0].toLowerCase()),
                            );
                            onBook(matched || featuredService);
                          }}
                        >
                          Try Style
                        </button>
                      )}
                    </figcaption>
                  </figure>
                );
              })}
            </div>

            {/* Standalone Before & After Haircut Comparison (2 separate single photos, never a collage) */}
            {currentBa && (
              <div className="le-ba-showcase">
                <div className="le-ba-copy">
                  <span className="le-eyebrow">Before & After Haircut Results</span>
                  <h3>{currentBa.title}</h3>
                  <p>{currentBa.faceShapeNote}</p>
                  <div className="le-ba-meta">
                    <span>
                      <strong>Cut:</strong> {currentBa.cutName}
                    </span>
                    <span>
                      <strong>Stylist:</strong> {currentBa.stylistName}
                    </span>
                  </div>
                  <div className="le-ba-switcher" role="group" aria-label="Choose transformation example">
                    {ZIYA_BEFORE_AFTER_PAIRS.map((pair, idx) => (
                      <button
                        key={pair.id}
                        type="button"
                        className={`le-filter-chip ${activeBaIndex === idx ? 'is-active' : ''}`}
                        onClick={() => {
                          setActiveBaIndex(idx);
                          setBaSliderPos(52);
                        }}
                      >
                        {pair.cutName}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="le-ba-stage">
                  <div className="le-ba-compare">
                    <img
                      src={currentBa.afterImage.src}
                      srcSet={currentBa.afterImage.srcSet}
                      sizes="(max-width: 900px) 92vw, 44vw"
                      alt={`After haircut: ${currentBa.cutName}`}
                      className="le-ba-img le-ba-after"
                      loading="lazy"
                    />
                    <div
                      className="le-ba-before-clip"
                      style={{ clipPath: `inset(0 ${100 - baSliderPos}% 0 0)` }}
                    >
                      <img
                        src={currentBa.beforeImage.src}
                        srcSet={currentBa.beforeImage.srcSet}
                        sizes="(max-width: 900px) 92vw, 44vw"
                        alt="Before haircut: unshaped grown-out hair"
                        className="le-ba-img le-ba-before"
                        loading="lazy"
                      />
                    </div>
                    <div className="le-ba-divider" style={{ left: `${baSliderPos}%` }} aria-hidden="true">
                      <span className="le-ba-knob">↔</span>
                    </div>
                    <span className="le-ba-pill le-ba-pill-before">Before Cut</span>
                    <span className="le-ba-pill le-ba-pill-after">After Ziya Cut</span>
                    <input
                      type="range"
                      min={12}
                      max={88}
                      value={baSliderPos}
                      onChange={(e) => setBaSliderPos(Number(e.target.value))}
                      aria-label="Slide to compare before and after women’s haircut"
                      className="le-ba-range"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =================================================================
            7. CUSTOMER REVIEWS — Realistic Women’s Haircut Stories
           ================================================================= */}
        <section id="salon-reviews" data-layout="experiences" className="le-section le-reviews-section">
          <div className="le-container">
            <div className="le-section-header le-center-header">
              <span className="le-eyebrow">{LUXURY_EDITORIAL_COPY.testimonialsEyebrow}</span>
              <h2 className="le-section-title">{reviewsHeading}</h2>
              {realReviews.length === 0 && displayReviews.length > 0 && (
                <p className="le-sample-note">
                  Sample client review · template preview for women’s haircut experiences
                </p>
              )}
              {isEditorMode && shared.setProfile && (
                <div className="le-review-editor-bar">
                  <button
                    type="button"
                    className="le-btn le-btn-outline le-btn-sm"
                    onClick={() => {
                      setEditingReview(null);
                      setTestimonialModalOpen(true);
                    }}
                  >
                    + Add Client Review
                  </button>
                </div>
              )}
            </div>

            {displayReviews.length > 0 ? (
              <div className="le-reviews-grid">
                {displayReviews.map((review) => (
                  <article key={review.id} className="le-review-card">
                    <div className="le-review-stars" aria-label={`${review.rating || 5} out of 5 stars`}>
                      {Array.from({ length: Math.max(1, Math.min(5, Math.round(review.rating || 5))) }).map((_, i) => (
                        <Star key={i} size={15} fill="currentColor" aria-hidden="true" />
                      ))}
                    </div>

                    {review.serviceName && (
                      <span className="le-review-service-pill">{review.serviceName}</span>
                    )}

                    <blockquote className="le-review-quote">“{review.comment}”</blockquote>

                    <div className="le-review-author">
                      {review.avatarUrl ? (
                        <img src={review.avatarUrl} alt={review.name} loading="lazy" />
                      ) : (
                        <span className="le-review-initial" aria-hidden="true">
                          {(review.name || 'G').charAt(0)}
                        </span>
                      )}
                      <div>
                        <strong>{review.name}</strong>
                        <span>{review.location || city}</span>
                      </div>
                    </div>

                    {isEditorMode && shared.setProfile && (
                      <div className="le-review-owner-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingReview(review);
                            setTestimonialModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            shared.setProfile!((prev) => ({
                              ...prev,
                              demoTestimonialsInitialized: true,
                              websiteTestimonials: displayReviews.filter((r) => r.id !== review.id),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="le-reviews-empty">
                <p>Be the first to share your haircut experience at {brandName}.</p>
              </div>
            )}

            <ExternalReviewFeed profile={profile} />
            {profile.subdomain && (
              <CustomerReviewPanel
                authenticOnly
                businessType={profile.businessType}
                slug={profile.subdomain}
                fallbackReviews={[]}
                signedIn={Boolean(customerSignedIn)}
                services={coreServices.map((s) => s.name)}
                onLogin={() => onAccount('signin')}
              />
            )}
          </div>
        </section>

        {/* =================================================================
            8. INTERACTIVE BOOKING SECTION — Women’s Cut, Female Stylist, Date & Slot
           ================================================================= */}
        <section id="salon-bookings" className="le-section le-booking-section">
          <div className="le-container">
            <div className="le-booking-shell">
              <div className="le-booking-intro">
                <span className="le-eyebrow">{LUXURY_EDITORIAL_COPY.bookingEyebrow}</span>
                <h2 className="le-section-title">{LUXURY_EDITORIAL_COPY.bookingTitle}</h2>
                <p className="le-body-copy">{LUXURY_EDITORIAL_COPY.bookingSubtitle}</p>

                <ul className="le-booking-perks">
                  <li>
                    <Check size={16} aria-hidden="true" />
                    <span>Complimentary face-shape & hair-type check with every appointment</span>
                  </li>
                  <li>
                    <Check size={16} aria-hidden="true" />
                    <span>100% female hairstylists in a calm, private studio environment</span>
                  </li>
                  <li>
                    <Check size={16} aria-hidden="true" />
                    <span>Instant confirmation & flexible salon or online advance payment</span>
                  </li>
                </ul>

                <div className="le-booking-photo-card">
                  <img
                    src={LUXURY_EDITORIAL_IMAGES.booking.src}
                    srcSet={LUXURY_EDITORIAL_IMAGES.booking.srcSet}
                    sizes="(max-width: 900px) 92vw, 36vw"
                    alt={LUXURY_EDITORIAL_IMAGES.booking.alt}
                    loading="lazy"
                  />
                </div>
              </div>

              <form className="le-booking-form-card" onSubmit={handleBookingDeskSubmit}>
                {/* Step 1: Select Women's Haircut Service */}
                <div className="le-field-group">
                  <label htmlFor="ziya-booking-service" className="le-field-label">
                    <span>1. Choose Women’s Haircut Service</span>
                    {activeBookingService && (
                      <strong>
                        {formatInr(activeBookingService.price, profile.currency || '₹')}
                        {activeBookingService.showDuration !== false && activeBookingService.durationMinutes
                          ? ` · ${activeBookingService.durationMinutes} min`
                          : ''}
                      </strong>
                    )}
                  </label>
                  <select
                    id="ziya-booking-service"
                    className="le-select"
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                  >
                    {coreServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {formatInr(s.price, profile.currency || '₹')}
                        {s.showDuration !== false && s.durationMinutes ? ` (${s.durationMinutes} min)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Choose Female Hairstylist */}
                <div className="le-field-group">
                  <span className="le-field-label">2. Select Female Hairstylist</span>
                  <div className="le-stylist-picker" role="radiogroup" aria-label="Choose female hairstylist">
                    {femaleTeam.map((st, idx) => {
                      const imgData = luxuryEditorialTeamImage(st, idx);
                      const chosen = selectedStylistId === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          role="radio"
                          aria-checked={chosen}
                          className={`le-stylist-chip ${chosen ? 'is-selected' : ''}`}
                          onClick={() => setSelectedStylistId(st.id)}
                        >
                          <img src={imgData.src} alt="" loading="lazy" />
                          <span>
                            <strong>{st.name}</strong>
                            <small>{st.specialties?.[0] || st.role}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3: Appointment Date */}
                <div className="le-field-group">
                  <label htmlFor="ziya-booking-date" className="le-field-label">
                    <span>3. Select Appointment Date</span>
                    <span className="le-field-hint">
                      <Calendar size={13} aria-hidden="true" /> IST Studio Calendar
                    </span>
                  </label>
                  <div className="le-date-strip" role="listbox" aria-label="Quick appointment dates">
                    {bookableDays.slice(0, 7).map((d) => (
                      <button
                        key={d.iso}
                        type="button"
                        role="option"
                        aria-selected={selectedDate === d.iso}
                        className={`le-date-pill ${selectedDate === d.iso ? 'is-selected' : ''}`}
                        onClick={() => setSelectedDate(d.iso)}
                      >
                        <small>{d.weekday}</small>
                        <strong>{d.dayNum}</strong>
                        <span>{d.month}</span>
                      </button>
                    ))}
                  </div>
                  <input
                    id="ziya-booking-date"
                    type="date"
                    min={bookableDays[0]?.iso}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="le-date-input"
                  />
                </div>

                {/* Step 4: Available Time Slot */}
                <div className="le-field-group">
                  <span className="le-field-label">
                    <span>4. Pick Available Time Slot</span>
                    {loadingSlots && <small>Checking live slots…</small>}
                  </span>
                  <div className="le-slot-grid" role="radiogroup" aria-label="Available time slots">
                    {liveSlots.map((slot) => (
                      <button
                        key={slot.value}
                        type="button"
                        role="radio"
                        aria-checked={selectedTime === slot.value}
                        className={`le-slot-pill ${selectedTime === slot.value ? 'is-selected' : ''}`}
                        onClick={() => setSelectedTime(slot.value)}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="le-booking-summary">
                  <div>
                    <span className="le-kicker-mini">Selected Appointment</span>
                    <strong>{activeBookingService?.name || 'Women’s Haircut'}</strong>
                    <span>
                      with {activeBookingStylist?.name || 'Senior Female Stylist'} · {selectedDate} ·{' '}
                      {formatSlotLabel(selectedTime)}
                    </span>
                  </div>
                  <strong className="le-summary-price">
                    {activeBookingService
                      ? formatInr(activeBookingService.price, profile.currency || '₹')
                      : ''}
                  </strong>
                </div>

                <div className="le-booking-submit-row">
                  {bookingAvailable ? (
                    <button type="submit" className="le-btn le-btn-primary le-btn-lg le-btn-block">
                      <span>Continue to Confirm Booking</span>
                      <ArrowRight size={17} aria-hidden="true" />
                    </button>
                  ) : (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="le-btn le-btn-primary le-btn-lg le-btn-block"
                    >
                      <MessageCircle size={17} aria-hidden="true" />
                      <span>Book via WhatsApp</span>
                    </a>
                  )}
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* =================================================================
            9. LOCATION & CONTACT
           ================================================================= */}
        <section id="salon-location" data-layout="location" className="le-section le-location-section">
          <div className="le-container">
            <div className="le-location-grid">
              <div className="le-location-card">
                <span className="le-eyebrow">{LUXURY_EDITORIAL_COPY.locationEyebrow}</span>
                <h2 className="le-section-title">{locationHeading}</h2>
                <p className="le-location-address">
                  <MapPin size={18} className="le-gold-icon" aria-hidden="true" />
                  <span>{address}</span>
                </p>

                <div className="le-contact-list">
                  {profile.phone && (
                    <a href={`tel:${profile.phone.replace(/\s+/g, '')}`} className="le-contact-item">
                      <Phone size={16} aria-hidden="true" />
                      <span>{profile.phone}</span>
                    </a>
                  )}
                  <a href={`mailto:${studioEmail}`} className="le-contact-item">
                    <span className="le-mail-dot" aria-hidden="true">✉</span>
                    <span>{studioEmail}</span>
                  </a>
                </div>

                <div className="le-location-actions">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="le-btn le-btn-outline"
                  >
                    <MapPin size={15} aria-hidden="true" />
                    <span>Open in Google Maps</span>
                  </a>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="le-btn le-btn-secondary"
                  >
                    <MessageCircle size={15} aria-hidden="true" />
                    <span>Chat on WhatsApp</span>
                  </a>
                </div>
              </div>

              <div className="le-hours-card">
                <span className="le-kicker-mini">Studio Hours</span>
                <h3>Visiting Schedule</h3>
                <dl className="le-hours-list">
                  {hours.map((row) => (
                    <div key={row.days} className="le-hours-row">
                      <dt>{row.days}</dt>
                      <dd>{row.hours}</dd>
                    </div>
                  ))}
                </dl>
                <p className="le-hours-note">
                  Walk-ins welcome subject to chair availability; advance online booking recommended for
                  weekend butterfly & curly cut sessions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Shared owner-managed platform sections (promo, social, loyalty, policies, share) */}
        {ownerExtras.length > 0 && (
          <div className="le-owner-extras">
            <div className="le-container">
              <WebsiteSections {...shared} sections={ownerExtras} />
            </div>
          </div>
        )}
      </main>

      {/* ===================================================================
          10. FOOTER AREA — Ziya Details + App Install (Footer Area Only!)
         =================================================================== */}
      <footer data-layout="footer" className="le-footer">
        <div className="le-footer-app-zone">
          <AppAnnouncementStrip />
          <div className="le-container le-footer-app-card-wrap">
            <AppInstallSection />
          </div>
        </div>

        <div className="le-container le-footer-main">
          <div className="le-footer-brand-col">
            <div className="le-brand le-footer-brand">
              <span className="le-brand-monogram" aria-hidden="true">
                Z
              </span>
              <span className="le-brand-text">
                <span className="le-brand-name">{brandName}</span>
                <span className="le-brand-sub">{LUXURY_EDITORIAL_COPY.brandSublabel}</span>
              </span>
            </div>
            <p className="le-footer-tagline">{LUXURY_EDITORIAL_COPY.footerTagline}</p>
            <div className="le-footer-socials">
              {instagramHref && (
                <a
                  href={instagramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${brandName} on Instagram`}
                >
                  <Instagram size={16} aria-hidden="true" />
                  <span>{profile.instagramHandle || '@ziya.hairstudio'}</span>
                </a>
              )}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Message ${brandName} on WhatsApp`}
              >
                <MessageCircle size={16} aria-hidden="true" />
                <span>WhatsApp Desk</span>
              </a>
              {facebookHref && (
                <a href={facebookHref} target="_blank" rel="noopener noreferrer">
                  Facebook
                </a>
              )}
              {youtubeHref && (
                <a href={youtubeHref} target="_blank" rel="noopener noreferrer">
                  YouTube
                </a>
              )}
            </div>
          </div>

          <div className="le-footer-links-col">
            <h4>Explore Studio</h4>
            <ul>
              <li>
                <a href="#salon-home">Home</a>
              </li>
              <li>
                <a href="#salon-about">Specialists in Women’s Haircuts</a>
              </li>
              <li>
                <a href="#services-section">Women’s Haircut Menu</a>
              </li>
              {videosEnabled && (
                <li>
                  <a href="#salon-videos">Haircut Video Gallery</a>
                </li>
              )}
              <li>
                <a href="#salon-lookbook">Haircut Style Gallery</a>
              </li>
              <li>
                <a href="#salon-team">Female Hairstylists</a>
              </li>
            </ul>
          </div>

          <div className="le-footer-contact-col">
            <h4>Studio & Booking</h4>
            <p>{address}</p>
            {profile.phone && (
              <p>
                <a href={`tel:${profile.phone.replace(/\s+/g, '')}`}>{profile.phone}</a>
              </p>
            )}
            <p>
              <a href={`mailto:${studioEmail}`}>{studioEmail}</a>
            </p>
            <div className="le-footer-cta-stack">
              {bookingAvailable ? (
                <button
                  type="button"
                  className="le-btn le-btn-gold le-btn-sm"
                  onClick={() => onBook(featuredService)}
                >
                  Book Your Haircut
                </button>
              ) : (
                <a href="#salon-bookings" className="le-btn le-btn-gold le-btn-sm">
                  Book Your Haircut
                </a>
              )}
              <a href="/?app=1&install=1" className="le-footer-install-link">
                Install Customer App
              </a>
            </div>
          </div>
        </div>

        <div className="le-container le-footer-bottom">
          <span>
            © {new Date().getFullYear()} {brandName}. Exclusively Women’s Haircuts & Styling.
          </span>
          {branding?.poweredBy && (
            <span>
              Powered by {branding.platformName}
            </span>
          )}
        </div>
      </footer>

      {/* Lightbox for Haircut Style Gallery */}
      {lightboxIndex !== null && displayedGallery[lightboxIndex] && (
        <div
          className="le-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Haircut style preview"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="le-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="le-lightbox-close"
              aria-label="Close style preview"
              onClick={() => setLightboxIndex(null)}
            >
              <X size={20} />
            </button>
            <button
              type="button"
              className="le-lightbox-nav le-lightbox-prev"
              aria-label="Previous haircut style"
              onClick={() =>
                setLightboxIndex((lightboxIndex - 1 + displayedGallery.length) % displayedGallery.length)
              }
            >
              <ChevronLeft size={22} />
            </button>
            <img
              src={displayedGallery[lightboxIndex].url}
              alt={displayedGallery[lightboxIndex].title}
              className="le-lightbox-img"
            />
            <button
              type="button"
              className="le-lightbox-nav le-lightbox-next"
              aria-label="Next haircut style"
              onClick={() => setLightboxIndex((lightboxIndex + 1) % displayedGallery.length)}
            >
              <ChevronRight size={22} />
            </button>
            <div className="le-lightbox-caption">
              <div>
                <strong>{displayedGallery[lightboxIndex].title}</strong>
                <span>
                  {lightboxIndex + 1} of {displayedGallery.length} · {brandName}
                </span>
              </div>
              {bookingAvailable && (
                <button
                  type="button"
                  className="le-btn le-btn-gold le-btn-sm"
                  onClick={() => {
                    setLightboxIndex(null);
                    onBook(featuredService);
                  }}
                >
                  Book This Haircut Style
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Owner Testimonial Editing Modal */}
      {isEditorMode && shared.setProfile && (
        <TestimonialModal
          isOpen={testimonialModalOpen}
          onClose={() => setTestimonialModalOpen(false)}
          editingTestimonial={editingReview}
          onSave={(saved) => {
            shared.setProfile!((prev) => ({
              ...prev,
              demoTestimonialsInitialized: true,
              websiteTestimonials: [
                { ...saved, isDemo: false, verified: false },
                ...displayReviews.filter((r) => r.id !== saved.id),
              ],
            }));
            setTestimonialModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default LuxuryEditorialWebsite;
