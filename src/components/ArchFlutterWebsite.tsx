import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Calendar,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Facebook,
  Instagram,
  Leaf,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Wallet,
  X,
  Youtube,
} from 'lucide-react';
import type { SalonOffer, SalonProfile, SalonService, Stylist } from '../types';
import type { SalonGalleryPhoto } from '../lib/photoGallery';
import { isPackage } from '../lib/packageCatalogue';
import { promotionActive, usePromotionClock } from '../lib/promotionStatus';
import { showcaseVideos } from '../lib/showcaseVideos';
import { reelSource } from '../lib/socialVideoSource';
import { socialUrl } from '../lib/websiteContent';
import {
  ARCH_FLUTTER_ART,
  ARCH_FLUTTER_BRAND_NAME,
  ARCH_FLUTTER_DEFAULT_ADDRESS,
  ARCH_FLUTTER_DEFAULT_CITY,
  ARCH_FLUTTER_DEFAULT_PHONE,
  ARCH_FLUTTER_DEFAULT_POSTAL_CODE,
  ARCH_FLUTTER_DEFAULT_STYLISTS,
  ARCH_FLUTTER_IMAGES,
  ARCH_FLUTTER_TAGLINE,
  ARCH_FLUTTER_TRUST,
  ARCH_FLUTTER_VISIT_STEPS,
  archFlutterCategoryFallback,
  archFlutterCssVariables,
  archFlutterFormatInr,
  archFlutterFormatTime,
  archFlutterOpenStatus,
  archFlutterServicePhoto,
  archFlutterServicesForCategory,
  buildArchFlutterSeo,
  resolveArchFlutterConfig,
} from '../lib/archFlutter';
import { canObserveViewport, deviceMockupIn, fadeUp, heroHeadline, revealViewport, scaleIn } from '../lib/motion';
import { visibleArchFlutterSections } from '../lib/archFlutterTheme';
import type { ArchFlutterSectionId } from '../types';
import {
  formatOfferWindow,
  offerApplicableServices,
  offerBookingPrefill,
  offerCountdownLabel,
  offerDiscountLabel,
  offerImage,
  offerIsLive,
  offerSavingINR,
  publicSalonOffers,
} from '../lib/salonOffers';
import { WebsiteSections } from './WebsiteSections';
import { AppAnnouncementStrip, CustomerAppPromotion } from './CustomerAppPromotion';
import { SafeImage } from './arch-flutter/SafeImage';
import { PageShell, Reveal, RevealGroup, RevealItem } from './arch-flutter/Motion';
import { ArchDivider, ArchMonogram, FlutterStrokes, GoldRule } from './arch-flutter/Ornaments';
import { ArchFlutterDeviceMockup } from './arch-flutter/DeviceMockup';
import { ArchFlutterBeforeAfter } from './arch-flutter/BeforeAfterSlider';
import { ArchFlutterReelsSection } from './arch-flutter/ReelsRail';
import { ArchFlutterTestimonials } from './arch-flutter/TestimonialCarousel';
import './archFlutter.css';

type ArchFlutterPage =
  | 'home'
  | 'about'
  | 'services'
  | 'packages'
  | 'gallery'
  | 'team'
  | 'offers'
  | 'journal'
  | 'contact'
  | 'booking'
  | 'account';

const PAGES: ArchFlutterPage[] = ['home', 'about', 'services', 'packages', 'gallery', 'team', 'offers', 'journal', 'contact', 'booking', 'account'];

const PAYMENT_METHODS = ['UPI (GPay · PhonePe · Paytm)', 'Credit / debit card', 'Net banking', 'Pay at the salon', 'Advance to hold a bridal or PMU slot'];

const TRUST_ICONS = [Leaf, ShieldCheck, BadgeCheck, Wallet];

/**
 * Template 13 — Arch & Flutter Lash & Brow Bar (`lash_brow`).
 *
 * A multi-page editorial-luxury storefront for an eye-area studio: bento
 * category grid, arch-masked photography, glass cards, oversized serif
 * headings, ₹ pricing with Indian digit grouping and a featured video +
 * vertical reel rail. Booking, customer accounts, My Bookings, owner sections
 * and the GlowSlot / Nexora customer-app wiring are the platform's own — this
 * component only presents them, exactly like Templates 09–12.
 */
export function ArchFlutterWebsite({
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
  onBook: (service?: SalonService, specialist?: Stylist, details?: { note?: string }) => void;
  onAccount: (mode?: 'signin' | 'signup') => void;
  onMyBookings: () => void;
  onViewSpecialist: (id: string) => void;
}) {
  const config = useMemo(() => resolveArchFlutterConfig(profile), [profile]);
  const cssVars = useMemo(
    () =>
      archFlutterCssVariables(config.colors, {
        fonts: config.fonts,
        cornerRadius: config.cornerRadius,
        glassBlur: config.glassBlur,
      }) as React.CSSProperties,
    [config.colors, config.fonts, config.cornerRadius, config.glassBlur],
  );
  /* What the home page renders, in the owner's order (Template Customizer). */
  const homeSections = useMemo(() => visibleArchFlutterSections(config.sections), [config.sections]);

  // Deep links: yoursite/#services opens that page first. In-app navigation is
  // state based and never rewrites the owner's URL.
  const [page, setPage] = useState<ArchFlutterPage>(() => {
    if (typeof window === 'undefined') return 'home';
    const hash = (window.location?.hash || '').replace('#', '').toLowerCase();
    return (PAGES as string[]).includes(hash) ? (hash as ArchFlutterPage) : 'home';
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [serviceCat, setServiceCat] = useState('All');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(config.faqs[0]?.id || null);
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');
  const [bookingServiceId, setBookingServiceId] = useState('');
  const [bookingStylistId, setBookingStylistId] = useState('');
  const [bookingDay, setBookingDay] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingPayment, setBookingPayment] = useState(PAYMENT_METHODS[0]);
  const [bookingNote, setBookingNote] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const promotionNow = usePromotionClock();

  const brandName = (profile.businessName || '').trim() || ARCH_FLUTTER_BRAND_NAME;
  const tagline = (profile.tagline || '').trim() || ARCH_FLUTTER_TAGLINE;
  const cityLabel = (profile.city || '').trim() || ARCH_FLUTTER_DEFAULT_CITY;
  const phoneDisplay = (profile.phone || profile.whatsapp || '').trim() || ARCH_FLUTTER_DEFAULT_PHONE;
  const whatsappDigits = (profile.whatsapp || profile.phone || ARCH_FLUTTER_DEFAULT_PHONE).replace(/[^0-9]/g, '');
  const normalizedWaDigits = whatsappDigits.length === 10 ? `91${whatsappDigits}` : whatsappDigits || '919829055214';
  const whatsappHref = `https://wa.me/${normalizedWaDigits}?text=${encodeURIComponent(
    `Hello ${brandName}, I would like to book a lash or brow appointment. Please share available slots.`,
  )}`;
  const logoUrl = (profile.logoUrl || '').trim() || ARCH_FLUTTER_IMAGES.logoSvg;
  const openStatus = archFlutterOpenStatus(config.openTime, config.closeTime);

  const addressDisplay = useMemo(() => {
    const addr = (profile.address || '').trim();
    const city = (profile.city || '').trim();
    if (addr && city && !addr.toLowerCase().includes(city.toLowerCase())) return `${addr}, ${city}`;
    if (addr) return addr;
    if (city) return `${ARCH_FLUTTER_DEFAULT_ADDRESS}, ${city}`;
    return `${ARCH_FLUTTER_DEFAULT_ADDRESS}, ${ARCH_FLUTTER_DEFAULT_CITY}`;
  }, [profile.address, profile.city]);

  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${brandName} ${addressDisplay}`)}`;
  const mapEmbedUrl =
    config.mapEmbedUrl ||
    `https://www.google.com/maps?q=${encodeURIComponent(`${brandName} ${addressDisplay}`)}&output=embed`;

  /* SEO: title, description, Open Graph image and LocalBusiness JSON-LD. */
  useEffect(() => {
    if (typeof document === 'undefined' || !document.head?.appendChild || typeof document.createElement !== 'function') return;
    const seo = buildArchFlutterSeo(profile, config, typeof window !== 'undefined' && window.location?.origin ? window.location.origin : undefined);
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
    script.textContent = JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c');
    document.head.appendChild(script);
    return () => {
      document.title = previousTitle;
      script.remove?.();
    };
  }, [profile, config]);

  /* Escape closes the drawer and the lightbox. */
  useEffect(() => {
    if (!menuOpen && lightbox === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      setLightbox(null);
      menuBtnRef.current?.focus?.();
    };
    if (typeof document !== 'undefined') document.addEventListener?.('keydown', onKeyDown);
    return () => {
      if (typeof document !== 'undefined') document.removeEventListener?.('keydown', onKeyDown);
    };
  }, [menuOpen, lightbox]);

  /* Sticky header shadow after the first scroll. */
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (next: ArchFlutterPage) => {
    setMenuOpen(false);
    setPage(next);
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo({ top: 0 });
    rootRef.current?.scrollIntoView?.({ block: 'start' });
  };

  /** Book always uses the existing booking system; if online booking is not
   * available for this site yet, the guest is taken to Contact instead. */
  const book = (service?: SalonService, specialist?: Stylist, details?: { note?: string }) => {
    if (bookingAvailable) onBook(service, specialist, details);
    else go('contact');
  };

  const team = stylists.length > 0 ? stylists : profile.subdomain ? [] : ARCH_FLUTTER_DEFAULT_STYLISTS;
  const packageServices = useMemo(() => {
    const explicit = services.filter((service) => (service.category || '').trim() === 'Packages');
    return explicit.length > 0 ? explicit : services.filter(isPackage);
  }, [services]);
  const packagesShown = showPackages && packageServices.length > 0;
  const packageIdSet = useMemo(() => new Set(packageServices.map((item) => item.id)), [packageServices]);
  const menuServices = useMemo(() => services.filter((service) => !(packagesShown && packageIdSet.has(service.id))), [services, packagesShown, packageIdSet]);
  const popularServices = useMemo(() => menuServices.filter((service) => service.popular).slice(0, 6), [menuServices]);
  const signatureServices = popularServices.length > 0 ? popularServices : menuServices.slice(0, 6);
  const serviceCategories = useMemo(
    () => ['All', ...Array.from(new Set(menuServices.map((service) => (service.category || '').trim()).filter(Boolean)))],
    [menuServices],
  );
  const activeServiceCat = serviceCategories.includes(serviceCat) ? serviceCat : 'All';
  const visibleServices = activeServiceCat === 'All' ? menuServices : menuServices.filter((service) => (service.category || '').trim() === activeServiceCat);

  /* Owner gallery photos win; the bundled lookbook keeps a new site full. */
  const galleryItems = useMemo(() => {
    const ownerPhotos = galleryPhotos.filter((photo) => !photo.isDemo);
    if (ownerPhotos.length > 0) {
      return galleryPhotos.map((photo) => ({
        src: photo.url,
        fallback: ARCH_FLUTTER_ART.gallery,
        title: photo.title || 'From the studio',
        tag: String(photo.category || 'Studio'),
        isDemo: Boolean(photo.isDemo),
      }));
    }
    const items = config.galleryUrls.map((entry, index) => ({
      src: entry.src,
      fallback: entry.fallback,
      title: `${brandName} — studio look ${index + 1}`,
      tag: index % 2 === 0 ? 'Lashes' : 'Brows',
      isDemo: true,
    }));
    for (const photo of galleryPhotos) {
      if (photo.url) items.push({ src: photo.url, fallback: ARCH_FLUTTER_ART.gallery, title: photo.title || 'From the studio', tag: String(photo.category || 'Studio'), isDemo: Boolean(photo.isDemo) });
    }
    return items;
  }, [galleryPhotos, config.galleryUrls, brandName]);
  const galleryIsDemo = galleryItems.length > 0 && galleryItems.every((item) => item.isDemo);

  /* Published guest reviews first, then the bundled sample reviews. */
  const realReviews = useMemo(
    () => (profile.websiteTestimonials || []).filter((review) => !review.isDemo && (review.comment || '').trim()),
    [profile.websiteTestimonials],
  );
  const displayReviews = useMemo(() => {
    const mapped = realReviews.map((review) => ({
      id: review.id,
      name: review.name || 'Client',
      area: review.location || cityLabel,
      rating: review.rating || 5,
      service: review.serviceName || 'Lash & brow service',
      quote: review.comment || '',
      avatarUrl: review.avatarUrl || review.reviewImageUrl || '',
    }));
    const seen = new Set(mapped.map((review) => review.quote.trim().toLowerCase()));
    const combined = [...mapped];
    for (const sample of config.reviews) {
      if (!seen.has(sample.quote.trim().toLowerCase())) combined.push({ ...sample, avatarUrl: sample.avatarUrl || '' });
    }
    return combined;
  }, [realReviews, config.reviews, cityLabel]);
  const averageRating = displayReviews.length > 0 ? displayReviews.reduce((sum, review) => sum + review.rating, 0) / displayReviews.length : 0;

  /* Owner-managed platform sections keep working exactly like every template.
     Videos are presented by Template 13's own featured film + reel rail, so the
     shared video grid is not rendered twice. */
  const ownerContentAvailable: Record<string, boolean> = {
    promo: promotionActive(profile.promoCampaign, promotionNow),
    videos: true,
    loyalty: Boolean(shared.loyaltyConfig?.programEnabled && shared.loyaltyConfig.rewards?.some((reward) => reward.isActive)),
    policies: Boolean(shared.policies && Object.values(shared.policies).some((value) => String(value || '').trim())),
    social: false,
    bookings: false,
    share: true,
  };
  const activeOwnerSections = enabledSections.filter((section) => ownerContentAvailable[section] !== false);
  const promoSections = activeOwnerSections.filter((section) => section === 'promo');
  const closingOwnerSections = activeOwnerSections.filter((section) => section !== 'promo' && section !== 'videos');
  const videosEnabled = enabledSections.includes('videos');
  const ownerVideos = videosEnabled ? showcaseVideos(profile).filter((video) => Boolean(reelSource(video))) : [];
  const reelsHeading = videosEnabled ? (profile.sectionHeadings?.videosTitle || config.reelsHeading) : config.reelsHeading;
  const reelsSubtext = videosEnabled ? (profile.sectionHeadings?.videosSubtitle || config.reelsSubtext) : config.reelsSubtext;

  const instaUrl = socialUrl(profile.instagramHandle || '@archandflutter', 'instagram');
  const fbUrl = socialUrl(profile.facebookPage || '', 'facebook');
  const ytUrl = socialUrl(profile.youtubeChannel || '', 'youtube');
  const accountHref = profile.subdomain ? `/?customer=1&return=${encodeURIComponent(profile.subdomain)}` : '/?customer=1';

  const navItems: Array<[string, ArchFlutterPage]> = [
    ['Home', 'home'],
    ['Services', 'services'],
    ['Packages', 'packages'],
    ['Gallery', 'gallery'],
    ['Team', 'team'],
    ['Offers', 'offers'],
    ['Journal', 'journal'],
    ['About', 'about'],
    ['Contact', 'contact'],
  ];

  /* The hero headline is set as: first sentence upright, second sentence in
     italic mauve, final word underlined in champagne gold. */
  const { heroLine1, heroLine2Head, heroLine2Tail } = useMemo(() => {
    const words = config.heroHeading.split(/\s+/).filter(Boolean);
    let stop = words.findIndex((word) => word.endsWith('.'));
    if (stop < 0 || stop === words.length - 1) stop = Math.max(Math.ceil(words.length / 2) - 1, 0);
    const rest = words.slice(stop + 1);
    return {
      heroLine1: words.slice(0, stop + 1).join(' '),
      heroLine2Head: rest.slice(0, Math.max(rest.length - 1, 0)).join(' '),
      heroLine2Tail: rest.length > 0 ? rest[rest.length - 1] : words.slice(stop + 1).join(' '),
    };
  }, [config.heroHeading]);

  const gstNote = config.showGstNote ? 'GST included' : 'All prices in ₹';

  /* ---------- Reusable pieces ---------- */

  const sectionHead = (kicker: string, title: string, lede?: string, action?: React.ReactNode) => (
    <div className="af-section-head">
      <div>
        <p className="af-kicker">{kicker}</p>
        <h2 className="af-h2">{title}</h2>
        {lede && <p className="af-lede" style={{ marginTop: 12 }}>{lede}</p>}
      </div>
      {action}
    </div>
  );

  const serviceCard = (service: SalonService) => {
    const photo = archFlutterServicePhoto(service);
    return (
      <RevealItem key={service.id} as="article" className="af-glass-solid af-menu-card">
        <div className="af-menu-media">
          <SafeImage
            src={photo.src}
            fallback={photo.fallback}
            alt={`${service.name} at ${brandName}`}
            width={600}
            height={400}
            loading="lazy"
            className="sf-service-image af-menu-image"
          />
        </div>
        <div className="af-menu-body">
          <div className="af-menu-top">
            <b>{service.name}</b>
            <span className="af-price">{archFlutterFormatInr(service.price)}</span>
          </div>
          <div className="af-menu-meta">
            {service.category && <span>{service.category}</span>}
            {service.showDuration !== false && service.durationMinutes > 0 && (
              <span>
                <Clock3 size={12} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> {service.durationMinutes} min
              </span>
            )}
            {service.popular && <span className="af-flag">Most booked</span>}
          </div>
          {service.description && <p className="af-menu-desc">{service.description}</p>}
          <div className="af-menu-foot">
            <span className="af-pkg-note">{gstNote}</span>
            <button type="button" className="af-btn af-btn-primary af-btn-sm" onClick={() => book(service)} aria-label={`Book ${service.name}, ${archFlutterFormatInr(service.price)}`}>
              Book <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </RevealItem>
    );
  };

  const packageCard = (item: { id: string; tier: string; name: string; price: number; durationMinutes: number; includes: string[]; imageUrl?: string; fallback: string; highlight?: boolean; note?: string }) => (
    <RevealItem key={item.id} as="article" className={`af-glass af-hover af-pkg${item.highlight ? ' is-highlight' : ''}`}>
      {item.tier && <span className="af-pkg-tier">{item.tier}</span>}
      <div className="af-pkg-media">
        <SafeImage src={item.imageUrl} fallback={item.fallback} alt={`${item.name} at ${brandName}`} width={600} height={375} loading="lazy" className="sf-service-image" />
      </div>
      <b className="af-pkg-name">{item.name}</b>
      <div className="af-pkg-price">
        <b>{archFlutterFormatInr(item.price)}</b>
        {item.durationMinutes > 0 && <span>{item.durationMinutes} min</span>}
      </div>
      <ul>
        {item.includes.map((line) => (
          <li key={line}>
            <Check size={14} aria-hidden="true" /> {line}
          </li>
        ))}
      </ul>
      {item.note && <span className="af-pkg-note">{item.note}</span>}
      <button type="button" className="af-btn af-btn-gold af-btn-sm" onClick={() => book(packageServices.find((service) => service.id === item.id))} aria-label={`Book ${item.name}`}>
        Book this package
      </button>
    </RevealItem>
  );

  const demoPackages = config.packages.map((pkg, index) => ({
    ...pkg,
    fallback: ARCH_FLUTTER_IMAGES.gallery[index % ARCH_FLUTTER_IMAGES.gallery.length].fallback,
  }));
  const cataloguePackages = packageServices.map((service) => ({
    id: service.id,
    tier: (service.category || 'Package').trim(),
    name: service.name,
    price: service.price ?? 0,
    durationMinutes: service.durationMinutes || 0,
    includes: (service.description || '').split(/[.;]/).map((part) => part.trim()).filter(Boolean).slice(0, 4),
    imageUrl: service.imageUrl || '',
    fallback: archFlutterServicePhoto(service).fallback,
    highlight: Boolean(service.popular),
    note: service.popular ? 'Most booked' : undefined,
  }));
  const shownPackages = packagesShown ? cataloguePackages : demoPackages;

  /* ------------------------------------------------------------------ */
  /* Promotions & offers — ordinary editable records on the profile.      */
  /* Expired or hidden offers never reach the public page.                */
  /* ------------------------------------------------------------------ */
  const offerNow = useMemo(() => Date.now(), []);
  const liveOffers = useMemo(() => publicSalonOffers(profile, offerNow), [profile, offerNow]);

  const copyCode = (code: string) => {
    const done = () => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((current) => (current === code ? '' : current)), 2600);
    };
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(code).then(done, done);
      return;
    }
    done();
  };

  /** "Book this offer" prefills the applicable service and its offer price. */
  const bookOffer = (offer: SalonOffer) => {
    const prefill = offerBookingPrefill(offer, services);
    book(prefill.service, undefined, { note: prefill.note });
  };

  const offerCard = (offer: SalonOffer, index: number) => {
    const photo = offerImage(offer, index);
    const applies = offerApplicableServices(offer, services);
    const saving = offerSavingINR(offer, applies[0]);
    const countdown = offerCountdownLabel(offer, offerNow);
    const appliesLabel = applies.length === 0
      ? 'Any service'
      : applies.length <= 2
        ? applies.map((service) => service.name).join(' + ')
        : `${applies.length} services in this offer`;
    return (
      <RevealItem key={offer.id} as="article" className={`af-glass af-hover af-offer-card${offer.isDemo ? ' is-demo' : ''}`}>
        <div className="af-offer-media">
          <SafeImage src={photo.src} fallback={photo.fallback} alt={offer.title} width={800} height={520} loading="lazy" />
          <span className="af-offer-badge">
            <Sparkles size={12} aria-hidden="true" /> {offer.badge}
          </span>
          {offer.isDemo && <span className="af-offer-demo">Sample offer · editable in your dashboard</span>}
        </div>
        <div className="af-offer-body">
          <b className="af-offer-title">{offer.title}</b>
          <p className="af-offer-desc">{offer.description}</p>
          <div className="af-offer-price">
            {offer.offerPriceINR > 0 && <span className="af-offer-now">{archFlutterFormatInr(offer.offerPriceINR)}</span>}
            {offer.originalPriceINR > 0 && offer.originalPriceINR !== offer.offerPriceINR && (
              <s className="af-offer-was">{archFlutterFormatInr(offer.originalPriceINR)}</s>
            )}
            <span className="af-offer-save">{offerDiscountLabel(offer)}</span>
            {saving > 0 && (
              <span className="af-offer-saving">
                <Tag size={12} aria-hidden="true" /> Save ₹{saving.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <dl className="af-offer-meta">
            <div>
              <dt>Valid</dt>
              <dd>{formatOfferWindow(offer)}</dd>
            </div>
            <div>
              <dt>{offerIsLive(offer, offerNow) ? 'Countdown' : 'Status'}</dt>
              <dd>{countdown}</dd>
            </div>
            <div>
              <dt>Applies to</dt>
              <dd>{appliesLabel}</dd>
            </div>
          </dl>
          {offer.couponCode && (
            <div className="af-offer-code-row">
              <code className="af-offer-code">{offer.couponCode}</code>
              <button
                type="button"
                className="af-btn af-btn-ghost af-btn-sm"
                onClick={() => copyCode(offer.couponCode)}
                aria-label={`Copy offer code ${offer.couponCode}`}
              >
                <Copy size={13} aria-hidden="true" /> {copiedCode === offer.couponCode ? 'Code copied' : 'Copy code'}
              </button>
            </div>
          )}
          {copiedCode === offer.couponCode && offer.couponCode && (
            <p className="af-offer-copied" role="status">Code {offer.couponCode} copied — paste it at checkout or on WhatsApp.</p>
          )}
          {offer.terms && <p className="af-offer-terms">{offer.terms}</p>}
          <button
            type="button"
            className="af-btn af-btn-gold af-btn-sm"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => bookOffer(offer)}
            aria-label={`Book ${offer.title}`}
          >
            Book this offer <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </RevealItem>
    );
  };

  const offersEmptyState = (
    <Reveal className="af-glass af-offers-empty">
      <div className="af-offers-empty-media">
        <SafeImage src="" fallback={ARCH_FLUTTER_ART.offer} alt="Arch & Flutter offer card artwork" width={640} height={420} loading="lazy" />
      </div>
      <div>
        <b className="af-h3">No offers running right now</b>
        <p className="af-menu-desc" style={{ marginTop: 10 }}>
          The studio has not announced a promotion this month. WhatsApp us and we will tell you what is coming up next — festive sets, bridal dates and the Flutter Club membership.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <a className="af-btn af-btn-primary af-btn-sm" href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={14} aria-hidden="true" /> WhatsApp us
          </a>
          <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={() => go('packages')}>See packages &amp; pricing</button>
        </div>
      </div>
    </Reveal>
  );

  const artistCard = (artist: Stylist) => (
    <RevealItem key={artist.id} as="article" className="af-glass-solid af-artist">
      <div className="af-artist-photo">
        <SafeImage src={artist.avatarUrl} fallback={ARCH_FLUTTER_ART.team} alt={`${artist.name}, ${artist.role} at ${brandName}`} width={440} height={506} loading="lazy" />
      </div>
      <b>{artist.name}</b>
      <span className="af-role">{artist.role}</span>
      {Number(artist.experienceYears) > 0 && (
        <span className="af-exp">{artist.experienceYears} years experience</span>
      )}
      {artist.bio && <p>{artist.bio}</p>}
      {artist.rating > 0 && (
        <span className="af-rating">
          <Star size={13} fill="currentColor" aria-hidden="true" /> {artist.rating.toFixed(2)}
        </span>
      )}
      {artist.specialties?.length > 0 && (
        <div className="af-tags">
          {artist.specialties.slice(0, 3).map((skill) => (
            <span key={skill} className="af-tag">{skill}</span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={() => onViewSpecialist(artist.id)} aria-label={`View profile and reviews of ${artist.name}`}>
          View profile &amp; reviews
        </button>
        <button type="button" className="af-btn af-btn-primary af-btn-sm" onClick={() => book(undefined, artist)} aria-label={`Book with ${artist.name}`}>
          Book
        </button>
      </div>
    </RevealItem>
  );

  const pageBand = (kicker: string, title: string, lede?: string) => (
    <section className="af-mesh-deep" data-layout="page-band">
      <div className="af-wrap" style={{ padding: 'clamp(48px, 7vw, 84px) 0 clamp(30px, 4vw, 46px)', textAlign: 'center' }}>
        <motion.p variants={fadeUp} initial="hidden" animate="visible" className="af-kicker" style={{ justifyContent: 'center' }}>
          {kicker}
        </motion.p>
        <motion.h1 variants={heroHeadline} initial="hidden" animate="visible" className="af-h1" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}>
          {title}
        </motion.h1>
        {lede && (
          <motion.p variants={fadeUp} initial="hidden" animate="visible" className="af-lede" style={{ margin: '16px auto 0' }}>
            {lede}
          </motion.p>
        )}
        <div style={{ maxWidth: 220, margin: '22px auto 0' }}>
          <GoldRule />
        </div>
      </div>
    </section>
  );

  const bookingService = services.find((service) => service.id === bookingServiceId) || services[0];
  const bookingStylist = team.find((artist) => artist.id === bookingStylistId);

  /**
   * Hero call-to-action buttons. The owner picks the label and where it goes
   * from the Template Customizer; the WhatsApp button always stays.
   */
  const heroButton = (kind: 'primary' | 'secondary') => {
    const label = (kind === 'primary' ? config.heroPrimaryLabel : config.heroSecondaryLabel).trim();
    const action = kind === 'primary' ? config.heroPrimaryAction : config.heroSecondaryAction;
    const url = (kind === 'primary' ? config.heroPrimaryUrl : config.heroSecondaryUrl).trim();
    if (!label || action === 'none') return null;
    const className = kind === 'primary' ? 'af-btn af-btn-primary' : 'af-btn af-btn-ghost';
    if (action === 'url') {
      if (!url) return null;
      const external = /^https?:/i.test(url);
      return (
        <a key={kind} className={className} href={url} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {label} <ArrowRight size={16} aria-hidden="true" />
        </a>
      );
    }
    if (action === 'booking') {
      return (
        <button key={kind} type="button" className={className} onClick={() => (bookingAvailable ? go('booking') : book())}>
          <Calendar size={16} aria-hidden="true" /> {label}
        </button>
      );
    }
    return (
      <button key={kind} type="button" className={className} onClick={() => go(action as ArchFlutterPage)}>
        {label} <ArrowRight size={16} aria-hidden="true" />
      </button>
    );
  };

  /* ---------- Home-page blocks ----------
   * The Template Customizer (Arch & Flutter only) can hide, rename and
   * drag-reorder these blocks. `config.sections` decides what renders and
   * in which order; locked blocks always stay on the page.
   */
  const homeSectionNodes: Record<ArchFlutterSectionId, React.ReactNode> = {
    hero: (
      <>
        {/* Hero */}
        <section className="af-hero af-mesh" data-layout="hero" aria-labelledby="af-hero-title">
          <FlutterStrokes className="af-feather" style={{ top: 40, right: '6%' }} />
          <div className="af-wrap af-hero-grid">
            <div className="af-hero-copy">
              <motion.p variants={fadeUp} initial="hidden" animate="visible" className="af-kicker">{config.heroKicker}</motion.p>
              <motion.h1 id="af-hero-title" variants={heroHeadline} initial="hidden" animate="visible" className="af-h1 af-hero-title">
                {heroLine1 && <>{heroLine1} </>}
                {heroLine2Head && <em>{heroLine2Head} </em>}
                <span className="af-gold-underline">{heroLine2Tail}</span>
              </motion.h1>
              <motion.p variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.1 }} className="af-lede" style={{ marginTop: 20 }}>
                {config.heroSubtext}
              </motion.p>
              <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.16 }} className="af-hero-meta">
                <span className="af-chip"><Star size={14} fill="currentColor" aria-hidden="true" /> {averageRating > 0 ? averageRating.toFixed(1) : '4.9'} ★ · {displayReviews.length}+ reviews</span>
                <span className="af-chip"><MapPin size={14} aria-hidden="true" /> {cityLabel}</span>
                <span className="af-chip"><Wallet size={14} aria-hidden="true" /> {gstNote} · UPI accepted</span>
                <span className="af-chip"><Clock3 size={14} aria-hidden="true" /> {config.workingHoursDisplay}</span>
              </motion.div>
              <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.22 }} className="af-hero-actions">
                {heroButton('primary')}
                <a className="af-btn af-btn-ghost" href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={16} aria-hidden="true" /> WhatsApp us
                </a>
                {heroButton('secondary')}
              </motion.div>
            </div>

            <div className="af-hero-visual">
              <motion.div variants={scaleIn} initial="hidden" animate="visible" style={{ position: 'relative' }}>
                <div className="af-hero-arch">
                  <SafeImage src={config.heroImageUrl} fallback={ARCH_FLUTTER_IMAGES.hero.fallback} alt={`Close-up of lash extensions at ${brandName}`} width={900} height={1125} loading="eager" />
                  <span className="af-hero-frame" aria-hidden="true" />
                  <span className="af-hero-tag">
                    <b>{config.established}</b>
                    <span>Lash · Brow · Eye care</span>
                  </span>
                </div>
                <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.3 }} className="af-hero-badge">
                  <b>{archFlutterFormatInr(99)}</b>
                  <span>Brow thread · onwards</span>
                </motion.div>
              </motion.div>
              <motion.div variants={deviceMockupIn} initial="hidden" animate="visible">
                <ArchFlutterDeviceMockup brandName={brandName} cityLabel={cityLabel} logoUrl={logoUrl} screenshotUrl={config.heroMockupImageUrl} services={menuServices} onBook={(service) => book(service)} />
              </motion.div>
            </div>
          </div>
        </section>
      </>
    ),
    trust: (
      <>
        {/* Trust ribbon */}
        <Reveal as="section" className="af-trust" aria-label="Why clients trust the bar">
          <div className="af-trust-grid">
            {ARCH_FLUTTER_TRUST.map((item, index) => {
              const Icon = TRUST_ICONS[index % TRUST_ICONS.length];
              return (
                <div key={item.id} className="af-trust-cell">
                  <Icon size={20} aria-hidden="true" />
                  <span>
                    <b>{item.title}</b>
                    <span>{item.detail}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </Reveal>
      </>
    ),
    promo: (
      <>
        {promoSections.length > 0 && (
          <div data-layout="promo">
            <WebsiteSections {...shared} sections={promoSections} />
          </div>
        )}
      </>
    ),
    categories: (
      <>
        {/* Categories bento */}
        <section className="af-section" id="af-categories" data-layout="services" aria-labelledby="af-categories-title">
          <div className="af-wrap">
            {sectionHead(
              'The menu',
              config.categoriesHeading,
              config.categoriesSubtext,
              <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={() => go('services')}>
                Open full menu <ArrowRight size={14} aria-hidden="true" />
              </button>,
            )}
            <h2 id="af-categories-title" className="af-sr-only">{config.categoriesHeading}</h2>
            <RevealGroup className="af-bento" as="div">
              {config.categories.map((category, index) => {
                const count = archFlutterServicesForCategory(services, category).length;
                const wide = Boolean(category.featured) || index % 7 === 3;
                const tall = Boolean(category.featured) && index % 5 === 0;
                return (
                  <RevealItem key={category.id} className={`af-bento-cell${wide ? ' is-wide' : ''}${tall ? ' is-tall' : ''}`}>
                    <button
                      type="button"
                      className="af-bento-tile"
                      onClick={() => {
                        setServiceCat(category.name);
                        go('services');
                      }}
                      aria-label={`${category.name} — ${count > 0 ? `${count} services, see the menu` : 'menu coming soon'}`}
                    >
                      <SafeImage src={category.imageUrl} fallback={archFlutterCategoryFallback(category, index)} alt="" width={700} height={520} loading="lazy" />
                      <span className="af-bento-count">{count > 0 ? `${count} services` : 'Menu soon'}</span>
                      <span className="af-bento-copy">
                        <b>{category.name}</b>
                        <span>{category.blurb}</span>
                      </span>
                    </button>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          </div>
        </section>
      </>
    ),
    services: (
      <>
        {/* Signature services */}
        <section className="af-section af-mesh-deep" id="af-signature" aria-labelledby="af-signature-title">
          <div className="af-wrap">
            {sectionHead(
              'Most booked',
              'Signature lash & brow services',
              'Every price below is GST-inclusive and payable by UPI, card, net banking or at the salon.',
              <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={() => go('services')}>
                All services <ArrowRight size={14} aria-hidden="true" />
              </button>,
            )}
            <h2 id="af-signature-title" className="af-sr-only">Signature lash & brow services</h2>
            {signatureServices.length > 0 ? (
              <RevealGroup className="af-menu" as="div">
                {signatureServices.map(serviceCard)}
              </RevealGroup>
            ) : (
              <p className="af-lede">The owner is finishing this menu. WhatsApp us and we will share today’s prices in ₹ right away.</p>
            )}
          </div>
        </section>
      </>
    ),
    about: (
      <>
        {/* About teaser + stats */}
        <section className="af-section" id="af-about-teaser" aria-labelledby="af-about-teaser-title">
          <div className="af-wrap af-about-grid">
            <Reveal className="af-about-media" variant="scaleIn">
              <div className="af-arch-img">
                <SafeImage src={config.aboutImageUrl} fallback={ARCH_FLUTTER_IMAGES.about.fallback} alt={`Inside ${brandName}, the lash and brow studio`} width={760} height={893} loading="lazy" />
              </div>
              <FlutterStrokes className="af-feather" style={{ bottom: -18, left: -10 }} />
            </Reveal>
            <div>
              <p className="af-kicker">About the bar</p>
              <h2 id="af-about-teaser-title" className="af-h2">{config.aboutHeading}</h2>
              <p className="af-lede" style={{ marginTop: 14 }}>{config.aboutStory}</p>
              <RevealGroup className="af-stats" as="div">
                {config.stats.map((stat) => (
                  <RevealItem key={stat.id} className="af-glass af-hover af-stat">
                    <b>{stat.value}</b>
                    <span>{stat.label}</span>
                  </RevealItem>
                ))}
              </RevealGroup>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 26 }}>
                <button type="button" className="af-btn af-btn-primary af-btn-sm" onClick={() => go('about')}>Our story</button>
                <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={() => go('team')}>Meet the artists</button>
              </div>
            </div>
          </div>
        </section>
      </>
    ),
    beforeAfter: (
      <>
        {/* Before & after */}
        <section className="af-section af-mesh" id="af-results" aria-labelledby="af-results-title">
          <div className="af-wrap">
            {sectionHead('Real results', config.resultsHeading, 'Unedited studio photographs, shared with each client’s permission. Drag the gold line to compare.')}
            <h2 id="af-results-title" className="af-sr-only">{config.resultsHeading}</h2>
            <RevealGroup className="af-ba-grid" as="div">
              {config.beforeAfter.map((item) => (
                <RevealItem key={item.id} as="figure">
                  <ArchFlutterBeforeAfter item={item} />
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      </>
    ),
    reels: (
      <>
        {/* Featured videos & reels */}
        <section className="af-section" id="af-reels" data-layout="experiences" aria-labelledby="af-reels-title">
          <div className="af-wrap">
            {sectionHead('Watch first', reelsHeading, reelsSubtext)}
            <h2 id="af-reels-title" className="af-sr-only">{reelsHeading}</h2>
            <Reveal variant="fadeIn">
              <ArchFlutterReelsSection
                reels={config.reels}
                featured={config.featuredVideo}
                ownerVideos={ownerVideos}
                salonName={brandName}
                reducedMotion={false}
              />
            </Reveal>
          </div>
        </section>
      </>
    ),
    packages: (
      <>
        {/* Packages */}
        <section className="af-section af-mesh-deep" id="af-packages" data-layout="packages" aria-labelledby="af-packages-title">
          <div className="af-wrap">
            {sectionHead(
              'Save more',
              config.packagesHeading,
              config.packagesSubtext,
              <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={() => go('packages')}>
                Pricing &amp; payments <ArrowRight size={14} aria-hidden="true" />
              </button>,
            )}
            <h2 id="af-packages-title" className="af-sr-only">{config.packagesHeading}</h2>
            <RevealGroup className="af-pkg-grid" as="div">
              {shownPackages.slice(0, 4).map(packageCard)}
            </RevealGroup>
            <Reveal className="af-glass" style={{ marginTop: 20, padding: '18px 22px' }}>
              <div className="af-pay-row" style={{ alignItems: 'center' }}>
                <Wallet size={18} aria-hidden="true" style={{ color: 'var(--af-gold-ink)' }} />
                {PAYMENT_METHODS.map((method) => (
                  <span key={method} className="af-pay-chip">{method}</span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      </>
    ),
    team: (
      <>
        {/* Team */}
        {team.length > 0 && (
          <section className="af-section" id="af-team" data-layout="team" aria-labelledby="af-team-title">
            <div className="af-wrap">
              {sectionHead('The artists', config.teamHeading, 'Certified lash, brow and PMU artists — pick one when you book.')}
              <h2 id="af-team-title" className="af-sr-only">{config.teamHeading}</h2>
              <RevealGroup className="af-team-grid" as="div">
                {team.slice(0, 4).map(artistCard)}
              </RevealGroup>
            </div>
          </section>
        )}
      </>
    ),
    testimonials: (
      <>
        {/* Reviews */}
        <section className="af-section af-mesh" id="af-reviews" aria-labelledby="af-reviews-title">
          <div className="af-wrap">
            {sectionHead('Client words', config.reviewsHeading, realReviews.length === 0 ? 'Demo / sample reviews below — real client reviews appear here once published.' : undefined)}
            <h2 id="af-reviews-title" className="af-sr-only">{config.reviewsHeading}</h2>
            <ArchFlutterTestimonials reviews={displayReviews} reducedMotion={false} />
            <p className="af-eyebrow-serif" style={{ marginTop: 18, textAlign: 'center' }}>
              Shared with each client’s permission · never labelled “verified” unless a real booking published it.
            </p>
          </div>
        </section>
      </>
    ),
    gallery: (
      <>
        {/* Gallery */}
        <section className="af-section" id="af-gallery" data-layout="gallery" aria-labelledby="af-gallery-title">
          <div className="af-wrap">
            {sectionHead('Lookbook', galleryIsDemo ? `${config.galleryHeading} · Demo lookbook` : config.galleryHeading, 'Tap any photograph to open it full size.')}
            <h2 id="af-gallery-title" className="af-sr-only">{config.galleryHeading}</h2>
            <RevealGroup className="af-gallery" as="div">
              {galleryItems.slice(0, 8).map((item, index) => (
                <RevealItem key={`${item.src}-${index}`} className="af-gallery-item">
                  <button type="button" onClick={() => setLightbox(index)} aria-label={`Open photograph: ${item.title}`}>
                    <SafeImage src={item.src} fallback={item.fallback} alt={item.title} width={640} height={640} loading="lazy" />
                  </button>
                </RevealItem>
              ))}
            </RevealGroup>
            <div style={{ marginTop: 22, textAlign: 'center' }}>
              <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={() => go('gallery')}>Open the full gallery</button>
            </div>
          </div>
        </section>
      </>
    ),
    offers: (
      <>
        {/* Offers + journal teasers */}
        {liveOffers.length > 0 && (
          <section className="af-section af-mesh-deep" id="af-offers-teaser" aria-labelledby="af-offers-title">
            <div className="af-wrap">
              {sectionHead(
                'This month',
                config.offersHeading,
                'Quote the code when you book or WhatsApp it to us. Every price is in ₹, GST included.',
                <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={() => go('offers')}>
                  All offers <ArrowRight size={14} aria-hidden="true" />
                </button>,
              )}
              <h2 id="af-offers-title" className="af-sr-only">{config.offersHeading}</h2>
              <RevealGroup className="af-offers af-offers-home" as="div">
                {liveOffers.slice(0, 3).map(offerCard)}
              </RevealGroup>
            </div>
          </section>
        )}
      </>
    ),
    journal: (
      <>
        <section className="af-section" id="af-journal-teaser" aria-labelledby="af-journal-title">
          <div className="af-wrap">
            {sectionHead(
              'Aftercare',
              config.journalHeading,
              'Short, honest guides so your set lasts and your brows stay feathered.',
              <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={() => go('journal')}>Read the journal <ArrowRight size={14} aria-hidden="true" /></button>,
            )}
            <h2 id="af-journal-title" className="af-sr-only">{config.journalHeading}</h2>
            <RevealGroup className="af-journal" as="div">
              {config.posts.slice(0, 2).map((post, index) => (
                <RevealItem key={post.id} as="article" className="af-glass-solid af-post">
                  <div className="af-post-media">
                    <SafeImage src={post.imageUrl} fallback={ARCH_FLUTTER_IMAGES.posts[index % 2 === 0 ? 'aftercare' : 'lift'].fallback} alt={post.title} width={420} height={420} loading="lazy" />
                  </div>
                  <div>
                    <div className="af-post-meta">
                      <span>{post.tag}</span>
                      <span>{post.minutes} min read</span>
                    </div>
                    <b>{post.title}</b>
                    <p>{post.excerpt}</p>
                    <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={() => { setOpenPost(post.id); go('journal'); }}>Read</button>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      </>
    ),
    faq: (
      <>
        {/* FAQ */}
        <section className="af-section af-mesh" id="af-faq" aria-labelledby="af-faq-title">
          <div className="af-wrap">
            {sectionHead('Good to know', config.faqsHeading)}
            <h2 id="af-faq-title" className="af-sr-only">Frequently asked questions</h2>
            <div className="af-faq">
              {config.faqs.map((faq) => (
                <Reveal key={faq.id} className={openFaq === faq.id ? 'af-glass-solid af-faq-item is-open' : 'af-glass-solid af-faq-item'}>
                  <button type="button" className="af-faq-q" aria-expanded={openFaq === faq.id} onClick={() => {
                      setOpenPost(null);
                      setOpenFaq(openFaq === faq.id ? null : faq.id);
                    }}>
                    {faq.question}
                    <Plus size={18} aria-hidden="true" />
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === faq.id && (
                      <motion.div className="af-faq-a" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.26 }}>
                        {faq.answer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </>
    ),
    contact: (
      <>
        {/* CTA banner */}
        <section className="af-section" data-layout="location" aria-labelledby="af-cta-title">
          <div className="af-wrap">
            <Reveal className="af-cta" variant="scaleIn">
              <SafeImage src={config.ctaBannerImageUrl} fallback={ARCH_FLUTTER_IMAGES.ctaBanner.fallback} alt={`Booking banner for ${brandName}`} width={1200} height={620} loading="lazy" />
              <p className="af-kicker" style={{ color: 'rgba(255,255,255,0.86)' }}>{config.established}</p>
              <h2 id="af-cta-title" className="af-h2">{config.bookingHeading}</h2>
              <p>{config.bookingSubtext}</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button type="button" className="af-btn af-btn-gold" onClick={() => (bookingAvailable ? go('booking') : book())}>
                  <Calendar size={16} aria-hidden="true" /> Choose a slot
                </button>
                <a className="af-btn af-btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }} href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={16} aria-hidden="true" /> WhatsApp us
                </a>
                <a className="af-btn af-btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }} href={directionsUrl} target="_blank" rel="noopener noreferrer">
                  <MapPin size={16} aria-hidden="true" /> Get directions
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </>
    ),
    closing: (
      <>
        <CustomerAppPromotion />

        {closingOwnerSections.length > 0 && <WebsiteSections {...shared} sections={closingOwnerSections} />}
      </>
    ),
  };


  return (
    <MotionConfig reducedMotion="user">
      <div className="af-site" data-template="lash_brow" style={cssVars} ref={rootRef}>
        <a className="af-sr-only" href="#af-main" style={{ position: 'absolute' }}>
          Skip to main content
        </a>

        <AppAnnouncementStrip />

        {/* ---------- Header ---------- */}
        <motion.header variants={fadeUp} initial="hidden" animate="visible" className={scrolled ? 'af-nav is-scrolled' : 'af-nav'} aria-label={`${brandName} navigation and Customer account`}>
          <div className="af-wrap af-nav-inner">
            <button type="button" className="af-logo" onClick={() => go('home')} aria-label={`${brandName} — home`}>
              {logoUrl ? (
                <SafeImage src={logoUrl} fallback={ARCH_FLUTTER_IMAGES.logoSvg} alt={`${brandName} logo`} width={44} height={44} loading="eager" />
              ) : (
                <ArchMonogram />
              )}
              <span className="af-logo-text">
                <b>{brandName}</b>
                <span>Lash &amp; Brow Bar</span>
              </span>
            </button>

            <nav className="af-nav-links" aria-label="Website navigation">
              {navItems.map(([label, target]) => (
                <button key={target} type="button" className={page === target ? 'af-nav-link is-active' : 'af-nav-link'} aria-current={page === target ? 'page' : undefined} onClick={() => go(target)}>
                  {label}
                </button>
              ))}
              <a
                className="af-nav-link"
                href={accountHref}
                onClick={(event) => {
                  event.preventDefault();
                  onMyBookings();
                }}
              >
                My Bookings
              </a>
            </nav>

            <div className="af-nav-cta">
              <span className={openStatus.open ? 'af-open-chip' : 'af-open-chip is-closed'}>
                <i aria-hidden="true" /> {openStatus.label}
              </span>
              {customerSignedIn ? (
                <button type="button" className="af-account-chip" aria-label="Manage your customer account" onClick={() => onAccount('signin')}>
                  {customerPhotoUrl ? (
                    <SafeImage src={customerPhotoUrl} fallback={ARCH_FLUTTER_ART.team} alt="" width={26} height={26} loading="lazy" />
                  ) : (
                    <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--af-espresso)', color: 'var(--af-ivory)', fontSize: 11 }}>
                      {(customerName || 'G').charAt(0)}
                    </span>
                  )}
                  <span style={{ maxWidth: 92, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customerName || 'My account'}</span>
                </button>
              ) : (
                <>
                  <button type="button" className="af-nav-link" onClick={() => onAccount('signin')}>Customer Login</button>
                  <button type="button" className="af-nav-link" onClick={() => onAccount('signup')}>Sign up</button>
                </>
              )}
              <button type="button" className="af-btn af-btn-gold af-btn-sm" onClick={() => book()}>
                <Calendar size={15} aria-hidden="true" /> Book Now
              </button>
              <button
                type="button"
                ref={menuBtnRef}
                className="af-burger"
                aria-expanded={menuOpen}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {menuOpen && (
              <motion.div className="af-drawer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)}>
                <motion.nav
                  className="af-drawer-panel"
                  aria-label="Mobile website navigation"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(event) => event.stopPropagation()}
                >
                  {navItems.map(([label, target]) => (
                    <button key={target} type="button" className={page === target ? 'af-nav-link is-active' : 'af-nav-link'} aria-current={page === target ? 'page' : undefined} onClick={() => go(target)}>
                      {label} <ArrowUpRight size={15} aria-hidden="true" />
                    </button>
                  ))}
                  <button type="button" className="af-nav-link" onClick={() => { setMenuOpen(false); go('booking'); }}>
                    Book an appointment
                  </button>
                  <a
                    className="af-nav-link"
                    href={accountHref}
                    onClick={(event) => {
                      event.preventDefault();
                      setMenuOpen(false);
                      onMyBookings();
                    }}
                  >
                    My Bookings
                  </a>
                  {!customerSignedIn && (
                    <>
                      <button type="button" className="af-nav-link" onClick={() => { setMenuOpen(false); onAccount('signin'); }}>Customer Login</button>
                      <button type="button" className="af-nav-link" onClick={() => { setMenuOpen(false); onAccount('signup'); }}>Sign up</button>
                    </>
                  )}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                    <a className="af-btn af-btn-ghost af-btn-sm" href={`tel:${phoneDisplay.replace(/[^0-9+]/g, '')}`}>
                      <Phone size={14} aria-hidden="true" /> {phoneDisplay}
                    </a>
                    <a className="af-btn af-btn-primary af-btn-sm" href={whatsappHref} target="_blank" rel="noopener noreferrer">
                      <MessageCircle size={14} aria-hidden="true" /> WhatsApp us
                    </a>
                  </div>
                </motion.nav>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.header>

        {/* ---------- Pages ---------- */}
        {/* NOTE: no initial={false} here — Framer Motion propagates it as
            blockInitialAnimation to every descendant and silently kills the
            hero entrance (headline slide-up, device mockup scale-in). */}
        <AnimatePresence mode="wait">
          <PageShell pageKey={page}>
            {page === 'home' && (
              <>
                {homeSections.map((entry) => (
                  <React.Fragment key={entry.id}>{homeSectionNodes[entry.id]}</React.Fragment>
                ))}
              </>
            )}

            {page === 'about' && (
              <>
                {pageBand('Our story', config.aboutHeading, config.established)}
                <section className="af-section">
                  <div className="af-wrap af-about-grid">
                    <Reveal className="af-about-media" variant="scaleIn">
                      <div className="af-arch-img">
                        <SafeImage src={config.aboutImageUrl} fallback={ARCH_FLUTTER_IMAGES.about.fallback} alt={`${brandName} studio interior`} width={760} height={893} loading="lazy" />
                      </div>
                    </Reveal>
                    <div>
                      <p className="af-lede" style={{ fontSize: '1.06rem' }}>{config.aboutStory}</p>
                      <ArchDivider />
                      <RevealGroup className="af-stats" as="div" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                        {config.stats.map((stat) => (
                          <RevealItem key={stat.id} className="af-glass af-hover af-stat">
                            <b>{stat.value}</b>
                            <span>{stat.label}</span>
                          </RevealItem>
                        ))}
                      </RevealGroup>
                    </div>
                  </div>
                </section>
                <section className="af-section af-mesh-deep" aria-labelledby="af-steps-title">
                  <div className="af-wrap">
                    {sectionHead('Your visit', 'Four steps, from consult to aftercare')}
                    <h2 id="af-steps-title" className="af-sr-only">What happens at your appointment</h2>
                    <RevealGroup className="af-steps" as="div">
                      {ARCH_FLUTTER_VISIT_STEPS.map((step) => (
                        <RevealItem key={step.id} className="af-glass af-hover af-step">
                          <b>{step.title}</b>
                          <span>{step.detail}</span>
                        </RevealItem>
                      ))}
                    </RevealGroup>
                  </div>
                </section>
                <section className="af-section" aria-labelledby="af-values-title">
                  <div className="af-wrap">
                    {sectionHead('House rules', 'What we promise every client')}
                    <h2 id="af-values-title" className="af-sr-only">Our promises</h2>
                    <RevealGroup className="af-trust-grid" as="div" style={{ border: '1px solid var(--af-gold-line)', borderRadius: 'var(--af-radius)', overflow: 'hidden' }}>
                      {ARCH_FLUTTER_TRUST.map((item, index) => {
                        const Icon = TRUST_ICONS[index % TRUST_ICONS.length];
                        return (
                          <RevealItem key={item.id} className="af-trust-cell">
                            <Icon size={20} aria-hidden="true" />
                            <span>
                              <b>{item.title}</b>
                              <span>{item.detail}</span>
                            </span>
                          </RevealItem>
                        );
                      })}
                    </RevealGroup>
                    <div style={{ marginTop: 26 }}>
                      <SafeImage src={config.footerImageUrl} fallback={ARCH_FLUTTER_IMAGES.footer.fallback} alt={`The ${brandName} studio`} width={1200} height={500} loading="lazy" style={{ borderRadius: 'var(--af-radius)', width: '100%', height: 260, objectFit: 'cover', border: '1px solid var(--af-gold-line)' }} />
                    </div>
                  </div>
                </section>
                {closingOwnerSections.length > 0 && <WebsiteSections {...shared} sections={closingOwnerSections} />}
              </>
            )}

            {page === 'services' && (
              <>
                {pageBand('The menu', config.servicesHeading, config.servicesSubtext)}
                <section className="af-section" data-layout="services">
                  <div className="af-wrap">
                    <div className="af-tabs" role="tablist" aria-label="Filter services by category">
                      {serviceCategories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          role="tab"
                          aria-selected={activeServiceCat === category}
                          className={activeServiceCat === category ? 'af-tab is-active' : 'af-tab'}
                          onClick={() => setServiceCat(category)}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                    {visibleServices.length > 0 ? (
                      <RevealGroup className="af-menu" as="div">
                        {visibleServices.map(serviceCard)}
                      </RevealGroup>
                    ) : (
                      <p className="af-lede">No services in this category yet. WhatsApp us and we will share the current menu and ₹ prices.</p>
                    )}
                    <Reveal className="af-glass" style={{ marginTop: 24, padding: '18px 22px' }}>
                      <div className="af-pay-row">
                        <Wallet size={18} aria-hidden="true" style={{ color: 'var(--af-gold-ink)' }} />
                        {PAYMENT_METHODS.map((method) => (
                          <span key={method} className="af-pay-chip">{method}</span>
                        ))}
                      </div>
                      <p className="af-pkg-note" style={{ marginTop: 12 }}>{gstNote} · prices shown in Indian Rupees only.</p>
                    </Reveal>
                  </div>
                </section>
                {packagesShown && (
                  <section className="af-section af-mesh-deep" id="salon-packages" data-layout="packages">
                    <div className="af-wrap">
                      {sectionHead('Bundles', config.packagesHeading, config.packagesSubtext)}
                      <RevealGroup className="af-pkg-grid" as="div">
                        {cataloguePackages.map(packageCard)}
                      </RevealGroup>
                    </div>
                  </section>
                )}
                {closingOwnerSections.length > 0 && <WebsiteSections {...shared} sections={closingOwnerSections} />}
              </>
            )}

            {page === 'packages' && (
              <>
                {pageBand('Pricing', config.packagesHeading, config.packagesSubtext)}
                <section className="af-section" id="salon-packages" data-layout="packages">
                  <div className="af-wrap">
                    <RevealGroup className="af-pkg-grid" as="div">
                      {shownPackages.map(packageCard)}
                    </RevealGroup>
                    <Reveal className="af-glass" style={{ marginTop: 26, padding: 24 }}>
                      <h2 className="af-h3">How you can pay</h2>
                      <div className="af-pay-row" style={{ marginTop: 14 }}>
                        {PAYMENT_METHODS.map((method) => (
                          <span key={method} className="af-pay-chip">{method}</span>
                        ))}
                      </div>
                      <p className="af-menu-desc" style={{ marginTop: 14 }}>
                        Every price is shown in Indian Rupees (₹) with Indian digit grouping — ₹1,499, ₹12,000. {config.showGstNote ? 'GST is included in every price shown.' : 'Ask us about GST on invoices.'} Razorpay handles UPI, cards and net banking; a small advance holds bridal and PMU slots, and the balance is due at the salon.
                      </p>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
                        <button type="button" className="af-btn af-btn-primary af-btn-sm" onClick={() => go('booking')}>Book a package</button>
                        <a className="af-btn af-btn-ghost af-btn-sm" href={whatsappHref} target="_blank" rel="noopener noreferrer">Ask about a custom bundle</a>
                      </div>
                    </Reveal>
                  </div>
                </section>
                {closingOwnerSections.length > 0 && <WebsiteSections {...shared} sections={closingOwnerSections} />}
              </>
            )}

            {page === 'gallery' && (
              <>
                {pageBand('Lookbook', galleryIsDemo ? `${config.galleryHeading} · Demo lookbook` : config.galleryHeading, 'Lash sets, brow architecture and studio moments.')}
                <section className="af-section" data-layout="gallery">
                  <div className="af-wrap">
                    <RevealGroup className="af-gallery" as="div">
                      {galleryItems.map((item, index) => (
                        <RevealItem key={`${item.src}-${index}`} className="af-gallery-item">
                          <button type="button" onClick={() => setLightbox(index)} aria-label={`Open photograph: ${item.title}`}>
                            <SafeImage src={item.src} fallback={item.fallback} alt={item.title} width={640} height={640} loading="lazy" />
                          </button>
                        </RevealItem>
                      ))}
                    </RevealGroup>
                    {galleryItems.length === 0 && <p className="af-lede">The studio lookbook is being uploaded. WhatsApp us for recent work photographs.</p>}
                  </div>
                </section>
                {closingOwnerSections.length > 0 && <WebsiteSections {...shared} sections={closingOwnerSections} />}
              </>
            )}

            {page === 'team' && (
              <>
                {pageBand('The artists', config.teamHeading, 'Choose an artist when you book — the same hands, every visit.')}
                <section className="af-section" data-layout="team">
                  <div className="af-wrap">
                    {team.length > 0 ? (
                      <RevealGroup className="af-team-grid" as="div">
                        {team.map(artistCard)}
                      </RevealGroup>
                    ) : (
                      <p className="af-lede">Artist profiles are being added. You can still book any service and we will assign the best-suited certified artist.</p>
                    )}
                    <Reveal className="af-glass" style={{ marginTop: 26, padding: 24 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 220px) minmax(0, 1fr)', gap: 22, alignItems: 'center' }}>
                        <div className="af-arch-img" style={{ aspectRatio: '1 / 1.1' }}>
                          <SafeImage src={ARCH_FLUTTER_IMAGES.owner.src} fallback={ARCH_FLUTTER_IMAGES.owner.fallback} alt={`Artist at work at ${brandName}`} width={440} height={484} loading="lazy" />
                        </div>
                        <div>
                          <h2 className="af-h3">Certified, insured and re-trained every year</h2>
                          <p className="af-menu-desc" style={{ marginTop: 10 }}>
                            Every artist at {brandName} holds an international lash or PMU certification, works with single-use cartridges and sterilised tweezers, and re-trains annually on new adhesive chemistry and mapping techniques.
                          </p>
                          <button type="button" className="af-btn af-btn-primary af-btn-sm" style={{ marginTop: 16 }} onClick={() => book()}>Book with an artist</button>
                        </div>
                      </div>
                    </Reveal>
                  </div>
                </section>
                {closingOwnerSections.length > 0 && <WebsiteSections {...shared} sections={closingOwnerSections} />}
              </>
            )}

            {page === 'offers' && (
              <>
                {pageBand('Offers', config.offersHeading, 'Season offers, codes and the Flutter Club membership.')}
                <section className="af-section" id="af-offers" data-layout="offers">
                  <div className="af-wrap">
                    {liveOffers.length > 0 ? (
                      <>
                        <p className="af-lede" style={{ marginBottom: 18 }}>
                          {liveOffers.length} offer{liveOffers.length === 1 ? '' : 's'} running now. Swipe the cards on a phone; tap “Book this offer” and the service and its offer price are filled into the booking form for you.
                        </p>
                        <RevealGroup className="af-offers" as="div">
                          {liveOffers.map(offerCard)}
                        </RevealGroup>
                      </>
                    ) : (
                      offersEmptyState
                    )}
                    <Reveal className="af-glass" style={{ marginTop: 26, padding: 24 }}>
                      <h2 className="af-h3">Flutter Club membership</h2>
                      <p className="af-menu-desc" style={{ marginTop: 10 }}>
                        One refill or lash lift every month, 10% off all brow services and members-only priority slots — {archFlutterFormatInr(1999)} a month, billed in ₹, paused or cancelled anytime.
                      </p>
                      <button type="button" className="af-btn af-btn-primary af-btn-sm" style={{ marginTop: 16 }} onClick={() => book(services.find((service) => /membership/i.test(`${service.category} ${service.name}`)))}>
                        Join the Flutter Club
                      </button>
                    </Reveal>
                  </div>
                </section>
                {promoSections.length > 0 && <WebsiteSections {...shared} sections={promoSections} />}
                {closingOwnerSections.length > 0 && <WebsiteSections {...shared} sections={closingOwnerSections} />}
              </>
            )}

            {page === 'journal' && (
              <>
                {pageBand('Aftercare journal', config.journalHeading, 'Guides written by the artists who do the work.')}
                <section className="af-section">
                  <div className="af-wrap">
                    <RevealGroup className="af-journal" as="div">
                      {config.posts.map((post, index) => (
                        <RevealItem key={post.id} as="article" className="af-glass-solid af-post">
                          <div className="af-post-media">
                            <SafeImage src={post.imageUrl} fallback={ARCH_FLUTTER_IMAGES.posts[index % 4 === 0 ? 'aftercare' : index % 4 === 1 ? 'lift' : index % 4 === 2 ? 'mapping' : 'pmu'].fallback} alt={post.title} width={420} height={420} loading="lazy" />
                          </div>
                          <div>
                            <div className="af-post-meta">
                              <span>{post.tag}</span>
                              <span>{post.minutes} min read</span>
                            </div>
                            <b>{post.title}</b>
                            <p>{post.excerpt}</p>
                            <button type="button" className="af-btn af-btn-ghost af-btn-sm" aria-expanded={openPost === post.id} onClick={() => setOpenPost(openPost === post.id ? null : post.id)}>
                              {openPost === post.id ? 'Close' : 'Read the guide'} <ChevronDown size={14} aria-hidden="true" style={{ transform: openPost === post.id ? 'rotate(180deg)' : 'none' }} />
                            </button>
                            <AnimatePresence initial={false}>
                              {openPost === post.id && (
                                <motion.div className="af-post-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }}>
                                  {post.body}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </RevealItem>
                      ))}
                    </RevealGroup>
                  </div>
                </section>
                {closingOwnerSections.length > 0 && <WebsiteSections {...shared} sections={closingOwnerSections} />}
              </>
            )}

            {page === 'contact' && (
              <>
                {pageBand('Contact', config.contactHeading, `${config.workingHoursDisplay} · ${openStatus.label}`)}
                <section className="af-section" data-layout="location">
                  <div className="af-wrap af-contact-grid">
                    <Reveal className="af-glass af-contact-card">
                      <div className="af-contact-row">
                        <MapPin size={18} aria-hidden="true" />
                        <span>
                          <b>Studio address</b>
                          <a href={directionsUrl} target="_blank" rel="noopener noreferrer">{addressDisplay}</a>
                        </span>
                      </div>
                      <div className="af-contact-row">
                        <Phone size={18} aria-hidden="true" />
                        <span>
                          <b>Call the bar</b>
                          <a href={`tel:${phoneDisplay.replace(/[^0-9+]/g, '')}`}>{phoneDisplay}</a>
                        </span>
                      </div>
                      <div className="af-contact-row">
                        <MessageCircle size={18} aria-hidden="true" />
                        <span>
                          <b>WhatsApp us</b>
                          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">Chat about slots, prices and aftercare</a>
                        </span>
                      </div>
                      <div className="af-contact-row">
                        <Mail size={18} aria-hidden="true" />
                        <span>
                          <b>Email</b>
                          <a href={`mailto:${config.publicEmail}`}>{config.publicEmail}</a>
                        </span>
                      </div>
                      <div className="af-contact-row">
                        <Clock3 size={18} aria-hidden="true" />
                        <span>
                          <b>Timings</b>
                          <span>{config.workingHoursDisplay}</span>
                          <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--af-mauve-ink)' }}>
                            {archFlutterFormatTime(config.openTime)} – {archFlutterFormatTime(config.closeTime)} · last appointment 90 minutes before closing
                          </span>
                        </span>
                      </div>
                      <div className="af-contact-row">
                        <Sparkles size={18} aria-hidden="true" />
                        <span>
                          <b>{profile.sectionHeadings?.socialTitle || 'Follow the studio'}</b>
                          <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                            {instaUrl && <a href={instaUrl} target="_blank" rel="noopener noreferrer" aria-label={`${brandName} on Instagram`}><Instagram size={17} aria-hidden="true" /> Instagram</a>}
                            {fbUrl && <a href={fbUrl} target="_blank" rel="noopener noreferrer" aria-label={`${brandName} on Facebook`}><Facebook size={17} aria-hidden="true" /> Facebook</a>}
                            {ytUrl && <a href={ytUrl} target="_blank" rel="noopener noreferrer" aria-label={`${brandName} on YouTube`}><Youtube size={17} aria-hidden="true" /> YouTube</a>}
                          </span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button type="button" className="af-btn af-btn-primary af-btn-sm" onClick={() => (bookingAvailable ? go('booking') : book())}>Book an appointment</button>
                        <a className="af-btn af-btn-ghost af-btn-sm" href={`tel:${phoneDisplay.replace(/[^0-9+]/g, '')}`}>Call now</a>
                      </div>
                    </Reveal>

                    <Reveal className="af-map" variant="fadeIn">
                      <iframe title={`Map to ${brandName}, ${addressDisplay}`} src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                      <div className="af-map-fallback" style={{ pointerEvents: 'none', opacity: 0 }}>
                        <a href={directionsUrl} target="_blank" rel="noopener noreferrer">Open {addressDisplay} in Google Maps</a>
                      </div>
                    </Reveal>
                  </div>
                </section>
                {closingOwnerSections.length > 0 && <WebsiteSections {...shared} sections={closingOwnerSections} />}
              </>
            )}

            {page === 'booking' && (
              <>
                {pageBand('Booking', config.bookingHeading, config.bookingSubtext)}
                <section className="af-section" data-layout="booking">
                  <div className="af-wrap af-booking-grid">
                    <Reveal className="af-glass" style={{ padding: 24 }}>
                      <h2 className="af-h3">Choose your appointment</h2>
                      <p className="af-menu-desc" style={{ margin: '10px 0 18px' }}>
                        Pick a service and an artist, tell us a day and time that suits you, then continue — the booking form confirms live slots and takes payment by UPI, card or at the salon.
                      </p>
                      <div className="af-field">
                        <label htmlFor="af-book-service">Service</label>
                        <select id="af-book-service" value={bookingService?.id || ''} onChange={(event) => setBookingServiceId(event.target.value)}>
                          {services.length === 0 && <option value="">Menu coming soon</option>}
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name} — {archFlutterFormatInr(service.price)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="af-field">
                        <label htmlFor="af-book-artist">Artist</label>
                        <select id="af-book-artist" value={bookingStylistId} onChange={(event) => setBookingStylistId(event.target.value)}>
                          <option value="">No preference</option>
                          {team.map((artist) => (
                            <option key={artist.id} value={artist.id}>{artist.name} — {artist.role}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                        <div className="af-field">
                          <label htmlFor="af-book-date">Preferred date</label>
                          <input id="af-book-date" type="date" value={bookingDay} onChange={(event) => setBookingDay(event.target.value)} />
                        </div>
                        <div className="af-field">
                          <label htmlFor="af-book-time">Preferred time</label>
                          <select id="af-book-time" value={bookingTime} onChange={(event) => setBookingTime(event.target.value)}>
                            <option value="">Any time</option>
                            {['10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00'].map((slot) => (
                              <option key={slot} value={slot}>{archFlutterFormatTime(slot)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="af-field">
                        <label htmlFor="af-book-note">Anything we should know? (allergies, previous sets, event date)</label>
                        <textarea id="af-book-note" rows={3} value={bookingNote} onChange={(event) => setBookingNote(event.target.value)} placeholder="e.g. Sensitive eyes, wedding on 12 December" />
                      </div>
                      <fieldset className="af-field" style={{ border: 0, padding: 0 }}>
                        <legend style={{ fontSize: '0.7rem', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 800, color: 'var(--af-mauve-ink)', marginBottom: 8 }}>How would you like to pay?</legend>
                        <div className="af-pay-row">
                          {PAYMENT_METHODS.map((method) => (
                            <label key={method} className="af-pay-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                              <input type="radio" name="af-payment" value={method} checked={bookingPayment === method} onChange={() => setBookingPayment(method)} />
                              {method}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                        <button type="button" className="af-btn af-btn-gold" onClick={() => book(bookingService, bookingStylist)} disabled={services.length === 0}>
                          <Calendar size={16} aria-hidden="true" /> Continue to booking
                        </button>
                        <a className="af-btn af-btn-ghost" href={whatsappHref} target="_blank" rel="noopener noreferrer">
                          <MessageCircle size={16} aria-hidden="true" /> WhatsApp us instead
                        </a>
                      </div>
                      {!bookingAvailable && <p className="af-pkg-note" style={{ marginTop: 12 }}>Online booking is not open for this site yet — WhatsApp or call us and we will hold a bed for you.</p>}
                    </Reveal>

                    <Reveal className="af-glass af-summary" variant="fadeIn">
                      <h2 className="af-h3">Your appointment</h2>
                      <div style={{ marginTop: 14 }}>
                        <div className="af-summary-row"><span>Service</span><b>{bookingService?.name || 'To be chosen'}</b></div>
                        <div className="af-summary-row"><span>Artist</span><b>{bookingStylist?.name || 'No preference'}</b></div>
                        <div className="af-summary-row"><span>Date</span><b>{bookingDay || 'Flexible'}</b></div>
                        <div className="af-summary-row"><span>Time</span><b>{bookingTime ? archFlutterFormatTime(bookingTime) : 'Any time'}</b></div>
                        <div className="af-summary-row"><span>Payment</span><b>{bookingPayment}</b></div>
                        <div className="af-summary-row af-summary-total"><span>Total</span><b>{archFlutterFormatInr(bookingService?.price)}</b></div>
                      </div>
                      <p className="af-pkg-note" style={{ marginTop: 12 }}>
                        {config.paymentNote} · pay via UPI (GPay, PhonePe, Paytm){config.upiHandle ? ` such as ${config.upiHandle}` : ''}, card or net banking
                        {config.payAtSalon ? ', or pay at the salon' : ''}.
                      </p>
                      {bookingNote && <p className="af-menu-desc" style={{ marginTop: 10 }}>Note: {bookingNote}</p>}
                      <div className="af-arch-img" style={{ marginTop: 18, aspectRatio: '16 / 10' }}>
                        <SafeImage src={config.ctaBannerImageUrl} fallback={ARCH_FLUTTER_IMAGES.ctaBanner.fallback} alt={`Treatment bed at ${brandName}`} width={600} height={375} loading="lazy" />
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                        <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={onMyBookings}>My Bookings</button>
                        <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={() => onAccount(customerSignedIn ? 'signin' : 'signup')}>{customerSignedIn ? 'My account' : 'Customer Login'}</button>
                      </div>
                    </Reveal>
                  </div>
                </section>
                {closingOwnerSections.length > 0 && <WebsiteSections {...shared} sections={closingOwnerSections} />}
              </>
            )}

            {page === 'account' && (
              <>
                {pageBand('Your account', customerSignedIn ? `Welcome back${customerName ? `, ${customerName}` : ''}` : 'Customer login & account', 'Save your lash map, track refills and rebook in two taps.')}
                <section className="af-section">
                  <div className="af-wrap af-contact-grid">
                    <Reveal className="af-glass af-contact-card">
                      {customerSignedIn ? (
                        <>
                          <div className="af-contact-row">
                            <BadgeCheck size={18} aria-hidden="true" />
                            <span>
                              <b>Signed in</b>
                              <span>{customerName || 'Your customer account'} · manage your profile, reviews and loyalty points.</span>
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button type="button" className="af-btn af-btn-primary af-btn-sm" onClick={onMyBookings}>My Bookings</button>
                            <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={() => onAccount('signin')}>Manage your customer account</button>
                            <button type="button" className="af-btn af-btn-gold af-btn-sm" onClick={() => book()}>Book again</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="af-contact-row">
                            <ShieldCheck size={18} aria-hidden="true" />
                            <span>
                              <b>Why create an account?</b>
                              <span>Your lash map, refill reminders, review history and loyalty points stay in one place — rebooking takes two taps.</span>
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button type="button" className="af-btn af-btn-primary af-btn-sm" onClick={() => onAccount('signin')}>Customer Login</button>
                            <button type="button" className="af-btn af-btn-gold af-btn-sm" onClick={() => onAccount('signup')}>Sign up</button>
                            <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={onMyBookings}>My Bookings</button>
                          </div>
                        </>
                      )}
                      <div className="af-contact-row">
                        <MessageCircle size={18} aria-hidden="true" />
                        <span>
                          <b>Prefer to chat?</b>
                          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
                        </span>
                      </div>
                    </Reveal>
                    <Reveal className="af-arch-img" variant="scaleIn" style={{ aspectRatio: '4 / 3.4' }}>
                      <SafeImage src={ARCH_FLUTTER_IMAGES.owner.src} fallback={ARCH_FLUTTER_IMAGES.owner.fallback} alt={`Client at ${brandName} checking her appointment`} width={760} height={646} loading="lazy" />
                    </Reveal>
                  </div>
                  <div className="af-wrap" style={{ marginTop: 26 }}>
                    <CustomerAppPromotion />
                  </div>
                </section>
              </>
            )}
          </PageShell>
        </AnimatePresence>

        {/* ---------- Footer ---------- */}
        <motion.footer
          data-layout="footer"
          className="af-footer"
          variants={fadeUp}
          initial={canObserveViewport ? 'hidden' : 'visible'}
          whileInView={canObserveViewport ? 'visible' : undefined}
          viewport={revealViewport}
        >
          <div className="af-wrap af-footer-grid">
            <div className="af-footer-brand">
              <SafeImage src={logoUrl} fallback={ARCH_FLUTTER_IMAGES.logoSvg} alt={`${brandName} logo`} width={168} height={64} loading="lazy" />
              <div>
                <p style={{ fontFamily: 'var(--af-serif)', fontSize: '1.5rem', margin: 0, color: '#fff' }}>{brandName}</p>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.22em', textTransform: 'uppercase', margin: '4px 0 0', color: 'var(--af-gold)' }}>{tagline}</p>
              </div>
              <p style={{ fontSize: '0.86rem', maxWidth: '38ch' }}>
                An eye-area bar in {cityLabel}: lash extensions, lifts, brow architecture, lamination, henna and permanent makeup — priced honestly in ₹.
              </p>
              <SafeImage src={config.footerImageUrl} fallback={ARCH_FLUTTER_IMAGES.footer.fallback} alt={`${brandName} studio`} width={420} height={240} loading="lazy" style={{ borderRadius: 18, width: '100%', maxWidth: 320, height: 130, objectFit: 'cover', border: '1px solid rgba(201,166,107,0.4)' }} />
            </div>

            <nav aria-label="Footer">
              <h4>Explore</h4>
              {navItems.map(([label, target]) => (
                <button key={target} type="button" onClick={() => go(target)}>{label}</button>
              ))}
              <button type="button" onClick={() => go('booking')}>Booking</button>
              <button type="button" onClick={onMyBookings}>My Bookings</button>
            </nav>

            <div>
              <h4>Categories</h4>
              {config.categories.slice(0, 7).map((category) => (
                <button key={category.id} type="button" onClick={() => { setServiceCat(category.name); go('services'); }}>{category.name}</button>
              ))}
              <button type="button" onClick={() => go('services')}>All fifteen categories</button>
            </div>

            <div>
              <h4>{profile.sectionHeadings?.socialTitle || 'Follow the studio'}</h4>
              <p style={{ fontSize: '0.86rem', margin: '0 0 10px' }}>{addressDisplay}</p>
              <p style={{ fontSize: '0.86rem', margin: '0 0 10px' }}>
                <a href={`tel:${phoneDisplay.replace(/[^0-9+]/g, '')}`}>{phoneDisplay}</a>
              </p>
              <p style={{ fontSize: '0.86rem', margin: '0 0 10px' }}>
                <a href={`mailto:${config.publicEmail}`}>{config.publicEmail}</a>
              </p>
              <p style={{ fontSize: '0.86rem', margin: '0 0 14px' }}>{config.workingHoursDisplay}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {instaUrl && <a href={instaUrl} target="_blank" rel="noopener noreferrer" aria-label={`${brandName} on Instagram`}>Instagram</a>}
                {fbUrl && <a href={fbUrl} target="_blank" rel="noopener noreferrer" aria-label={`${brandName} on Facebook`}>Facebook</a>}
                {ytUrl && <a href={ytUrl} target="_blank" rel="noopener noreferrer" aria-label={`${brandName} on YouTube`}>YouTube</a>}
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label={`Chat with ${brandName} on WhatsApp`}>WhatsApp</a>
              </div>
            </div>
          </div>

          <div className="af-wrap af-footer-bottom">
            <span>© {new Date().getFullYear()} {brandName}. All rights reserved.</span>
            <span>
              All prices in INR (₹) · {config.paymentNote}
              {config.upiHandle ? ` · UPI ${config.upiHandle}` : ''}
              {config.gstin ? ` · GSTIN ${config.gstin}` : ''}
            </span>
            <span>{config.established} · {ARCH_FLUTTER_DEFAULT_POSTAL_CODE ? `PIN ${ARCH_FLUTTER_DEFAULT_POSTAL_CODE}` : ''}</span>
          </div>
        </motion.footer>

        {/* Floating WhatsApp */}
        {!menuOpen && (
          <motion.a
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            className="af-wa-float"
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Chat with ${brandName} on WhatsApp`}
          >
            <MessageCircle size={18} aria-hidden="true" /> WhatsApp us
          </motion.a>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {lightbox !== null && galleryItems[lightbox] && (
            <motion.div className="af-lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(null)} role="dialog" aria-modal="true" aria-label="Photograph viewer">
              <button type="button" className="af-lightbox-close" onClick={() => setLightbox(null)} aria-label="Close photograph">
                <X size={20} aria-hidden="true" />
              </button>
              <figure onClick={(event) => event.stopPropagation()}>
                <SafeImage
                  src={galleryItems[lightbox].src}
                  fallback={galleryItems[lightbox].fallback}
                  alt={galleryItems[lightbox].title}
                  width={1200}
                  height={900}
                  loading="lazy"
                />
                <figcaption>
                  {galleryItems[lightbox].title} · {galleryItems[lightbox].tag}
                  <span style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12 }}>
                    <button type="button" className="af-btn af-btn-ghost af-btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }} onClick={() => setLightbox((current) => (current === null ? null : (current - 1 + galleryItems.length) % galleryItems.length))}>Previous</button>
                    <button type="button" className="af-btn af-btn-ghost af-btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }} onClick={() => setLightbox((current) => (current === null ? null : (current + 1) % galleryItems.length))}>Next</button>
                  </span>
                </figcaption>
              </figure>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
