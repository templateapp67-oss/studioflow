import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronDown,
  Clock3,
  Facebook,
  Instagram,
  Leaf,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Quote,
  Sparkles,
  Star,
  X,
  Youtube,
} from 'lucide-react';
import type { BodhiTreeReviewItem, SalonProfile, SalonService, Stylist } from '../types';
import type { SalonGalleryPhoto } from '../lib/photoGallery';
import { isPackage } from '../lib/packageCatalogue';
import { promotionActive, usePromotionClock } from '../lib/promotionStatus';
import { showcaseVideos } from '../lib/showcaseVideos';
import { reelSource } from '../lib/socialVideoSource';
import { socialUrl } from '../lib/websiteContent';
import {
  BODHI_TREE_BRAND_NAME,
  BODHI_TREE_DEFAULT_ADDRESS,
  BODHI_TREE_DEFAULT_CITY,
  BODHI_TREE_DEFAULT_PHONE,
  BODHI_TREE_DEFAULT_STYLISTS,
  BODHI_TREE_IMAGES,
  bodhiFormatInr,
  bodhiTreeCssVariables,
  bodhiTreeServiceImage,
  buildBodhiTreeSeo,
  resolveBodhiTreeConfig,
} from '../lib/bodhiTree';
import {
  canObserveViewport,
  deviceMockupIn,
  fadeUp,
  heroHeadline,
  pageTransition,
  revealViewport,
  scaleIn,
  stagger,
  staggerItem,
} from '../lib/motion';
import { WebsiteSections } from './WebsiteSections';
import { AppAnnouncementStrip, CustomerAppPromotion } from './CustomerAppPromotion';
import { SafeImage } from './bodhi-tree/SafeImage';
import { DeviceMockup } from './bodhi-tree/DeviceMockup';
import { PalaceCollectionGrid } from './bodhi-tree/PalaceCollectionSection';

type BodhiPage =
  | 'home'
  | 'about'
  | 'services'
  | 'palace'
  | 'packages'
  | 'gallery'
  | 'team'
  | 'reviews'
  | 'contact';

const DEFAULT_GALLERY: Array<{ src: string; title: string; tag: string }> = [
  { src: BODHI_TREE_IMAGES.gallery.spaRoom, title: 'Our calm treatment room', tag: 'Spa Room' },
  { src: BODHI_TREE_IMAGES.gallery.towelsHerbs, title: 'Fresh towels & herbal care', tag: 'Care' },
  { src: BODHI_TREE_IMAGES.gallery.marigoldDiyas, title: 'Marigold and diyas, Jaipur style', tag: 'Jaipur' },
  { src: BODHI_TREE_IMAGES.gallery.candles, title: 'Candle-lit evenings', tag: 'Calm' },
  { src: BODHI_TREE_IMAGES.gallery.oils, title: 'Pure oils we use', tag: 'Oils' },
  { src: BODHI_TREE_IMAGES.gallery.treatment, title: 'Oil massage in progress', tag: 'Treatment' },
  { src: BODHI_TREE_IMAGES.gallery.lounge, title: 'Relax corner', tag: 'Lounge' },
  { src: BODHI_TREE_IMAGES.gallery.herbalTea, title: 'Herbal tea after your massage', tag: 'Herbal Tea' },
  { src: BODHI_TREE_IMAGES.gallery.entrance, title: 'Welcome to Bodhi Tree', tag: 'Entrance' },
  { src: BODHI_TREE_IMAGES.gallery.stonesFlowers, title: 'Stones & fresh flowers', tag: 'Care' },
];

const WHY_CARDS = [
  { icon: Leaf, title: 'Pure Ayurvedic Oils', text: 'Cold-pressed oils and real herbs. No chemicals, no shortcuts.' },
  { icon: Sparkles, title: 'Trained Therapists', text: 'Our therapists are trained in Ayurvedic and classic massage.' },
  { icon: Check, title: 'Clean & Calm Rooms', text: 'Fresh towels for every guest. Quiet rooms, soft light, no hurry.' },
  { icon: Star, title: 'Honest ₹ Prices', text: 'Clear prices in rupees, shared before we start. No hidden charges.' },
];

export function BodhiTreeWebsite({
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
  const config = useMemo(() => resolveBodhiTreeConfig(profile), [profile]);
  const cssVars = useMemo(
    () => bodhiTreeCssVariables(config.colors) as React.CSSProperties,
    [config.colors],
  );

  // Deep links: a shared link like yoursite/#palace opens that page first.
  // In-app navigation stays state-based and never rewrites the owner's URL.
  const [page, setPage] = useState<BodhiPage>(() => {
    if (typeof window === 'undefined') return 'home';
    const hash = (window.location?.hash || '').replace('#', '').toLowerCase();
    const pages: BodhiPage[] = ['home', 'about', 'services', 'palace', 'packages', 'gallery', 'team', 'reviews', 'contact'];
    return (pages as string[]).includes(hash) ? (hash as BodhiPage) : 'home';
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [serviceCat, setServiceCat] = useState('All');
  const [galleryCat, setGalleryCat] = useState('All');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(config.faqs[0]?.id || null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const promotionNow = usePromotionClock();

  const brandName = (profile.businessName || '').trim() || BODHI_TREE_BRAND_NAME;
  const tagline = (profile.tagline || '').trim();
  const phoneDisplay = (profile.phone || profile.whatsapp || '').trim() || BODHI_TREE_DEFAULT_PHONE;
  const whatsappDigits = (profile.whatsapp || profile.phone || BODHI_TREE_DEFAULT_PHONE).replace(/[^0-9]/g, '');
  const normalizedWaDigits = whatsappDigits.length === 10 ? `91${whatsappDigits}` : whatsappDigits || '919829010009';
  const whatsappHref = `https://wa.me/${normalizedWaDigits}?text=${encodeURIComponent(
    `Hello ${brandName}, I would like to book a massage. Please share available slots.`,
  )}`;
  const logoUrl = (profile.logoUrl || '').trim() || BODHI_TREE_IMAGES.logoSvg;

  const addressDisplay = useMemo(() => {
    const addr = (profile.address || '').trim();
    const city = (profile.city || '').trim();
    if (addr && city && !addr.toLowerCase().includes(city.toLowerCase())) return `${addr}, ${city}`;
    if (addr) return addr;
    if (city) return `${BODHI_TREE_DEFAULT_ADDRESS}, ${city}`;
    return `${BODHI_TREE_DEFAULT_ADDRESS}, ${BODHI_TREE_DEFAULT_CITY}`;
  }, [profile.address, profile.city]);

  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${brandName} ${addressDisplay}`)}`;
  const mapEmbedUrl =
    config.mapEmbedUrl ||
    `https://www.google.com/maps?q=${encodeURIComponent(`${brandName} ${addressDisplay}`)}&output=embed`;

  const siteUrl =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.href
      : 'https://bodhitree.example';
  const seo = useMemo(() => buildBodhiTreeSeo(profile, config, siteUrl), [profile, config, siteUrl]);

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
      const setMeta = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
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
    if (!menuOpen && lightbox === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setLightbox(null);
        menuBtnRef.current?.focus();
      }
    };
    if (typeof document !== 'undefined') document.addEventListener?.('keydown', onKeyDown);
    return () => {
      if (typeof document !== 'undefined') document.removeEventListener?.('keydown', onKeyDown);
    };
  }, [menuOpen, lightbox]);

  const go = (next: BodhiPage) => {
    setMenuOpen(false);
    setPage(next);
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0 });
    }
    rootRef.current?.scrollIntoView?.({ block: 'start' });
  };

  /** Book Now always uses the existing booking system; when online booking is
   * not available for this site yet, it takes the guest to Contact instead. */
  const book = (service?: SalonService, specialist?: Stylist) => {
    if (bookingAvailable) {
      onBook(service, specialist);
    } else {
      go('contact');
    }
  };

  const team = stylists.length > 0 ? stylists : profile.subdomain ? [] : BODHI_TREE_DEFAULT_STYLISTS;
  const packageServices = useMemo(() => {
    const explicit = services.filter((s) => (s.category || '').trim() === 'Packages');
    return explicit.length > 0 ? explicit : services.filter(isPackage);
  }, [services]);
  const packagesShown = showPackages && packageServices.length > 0;
  const packageIdSet = useMemo(() => new Set(packageServices.map((p) => p.id)), [packageServices]);
  const palaceServices = useMemo(
    () => services.filter((s) => (s.category || '').trim() === 'Palace Collection'),
    [services],
  );
  const palaceIdSet = useMemo(() => new Set(palaceServices.map((p) => p.id)), [palaceServices]);
  const menuServices = useMemo(
    () =>
      services.filter(
        (s) => !(packagesShown && packageIdSet.has(s.id)) && !palaceIdSet.has(s.id),
      ),
    [services, packagesShown, packageIdSet, palaceIdSet],
  );
  const popularServices = useMemo(
    () => menuServices.filter((s) => s.popular).slice(0, 4),
    [menuServices],
  );
  const shownPopular = popularServices.length > 0 ? popularServices : menuServices.slice(0, 4);
  const serviceCategories = useMemo(
    () => ['All', ...Array.from(new Set(menuServices.map((s) => (s.category || '').trim()).filter(Boolean)))],
    [menuServices],
  );
  const activeServiceCat = serviceCategories.includes(serviceCat) ? serviceCat : 'All';
  const visibleServices =
    activeServiceCat === 'All'
      ? menuServices
      : menuServices.filter((s) => (s.category || '').trim() === activeServiceCat);

  const galleryItems = useMemo(() => {
    const ownerPhotos = galleryPhotos.filter((p) => !p.isDemo);
    if (ownerPhotos.length > 0) {
      return galleryPhotos.map((p) => ({
        src: p.url,
        title: p.title || 'Inside our centre',
        tag: String(p.category || 'Gallery'),
        isDemo: p.isDemo,
      }));
    }
    const seen = new Set<string>();
    const items: Array<{ src: string; title: string; tag: string; isDemo: boolean }> = [];
    for (const item of DEFAULT_GALLERY) {
      if (!seen.has(item.src)) {
        seen.add(item.src);
        items.push({ ...item, isDemo: true });
      }
    }
    for (const p of galleryPhotos) {
      if (p.url && !seen.has(p.url)) {
        seen.add(p.url);
        items.push({ src: p.url, title: p.title || 'Inside our centre', tag: String(p.category || 'Gallery'), isDemo: p.isDemo });
      }
    }
    return items;
  }, [galleryPhotos]);
  const galleryCategories = useMemo(
    () => ['All', ...Array.from(new Set(galleryItems.map((i) => i.tag)))],
    [galleryItems],
  );
  const visibleGallery = galleryItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => galleryCat === 'All' || item.tag === galleryCat);

  // Real guest reviews submitted through the platform review flow come
  // first; the owner-managed Bodhi Tree reviews fill in behind them
  // (same merge as Vogue Noir's displayReviews).
  const displayReviews = useMemo<BodhiTreeReviewItem[]>(() => {
    const real = (profile.websiteTestimonials || []).filter(
      (r) => !r.isDemo && (r.comment || '').trim(),
    );
    const mappedReal: BodhiTreeReviewItem[] = real.map((r) => ({
      id: r.id,
      name: r.name || 'Guest',
      tag: r.location || 'Jaipur',
      rating: r.rating || 5,
      quote: r.comment,
      serviceName: r.serviceName || '',
      avatarUrl: r.avatarUrl || '',
    }));
    const seen = new Set(mappedReal.map((r) => r.quote.trim().toLowerCase()));
    const combined = [...mappedReal];
    for (const sample of config.reviews) {
      if (!seen.has(sample.quote.trim().toLowerCase())) combined.push(sample);
    }
    return combined;
  }, [profile.websiteTestimonials, config.reviews]);

  const averageRating =
    displayReviews.length > 0
      ? displayReviews.reduce((sum, r) => sum + r.rating, 0) / displayReviews.length
      : 0;

  // Shared owner-managed website sections (promo / videos / loyalty / policies
  // / share) keep working exactly like every other template.
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
  const activeOwnerSections = enabledSections.filter((s) => ownerContentAvailable[s] !== false);
  const promoSections = activeOwnerSections.filter((s) => s === 'promo');
  const videoSections = activeOwnerSections.filter((s) => s === 'videos');
  const closingOwnerSections = activeOwnerSections.filter((s) => s !== 'promo' && s !== 'videos');

  const instaUrl = socialUrl(profile.instagramHandle || '@bodhitree.jaipur', 'instagram');
  const fbUrl = socialUrl(profile.facebookPage || '', 'facebook');
  const ytUrl = socialUrl(profile.youtubeChannel || '', 'youtube');

  const navItems: Array<[string, BodhiPage]> = [
    ['Home', 'home'],
    ['About', 'about'],
    ['Massages', 'services'],
    ['Palace Collection', 'palace'],
    ['Packages', 'packages'],
    ['Gallery', 'gallery'],
    ['Team', 'team'],
    ['Reviews', 'reviews'],
    ['Contact', 'contact'],
  ];

  const firstBranch = config.branches[0];

  const serviceCard = (service: SalonService) => (
    <motion.article
      key={service.id}
      variants={staggerItem}
      className="bt-glass-cream bt-lift flex flex-col overflow-hidden"
    >
      <div className="relative">
        <SafeImage
          src={bodhiTreeServiceImage(service)}
          fallback={BODHI_TREE_IMAGES.services.abhyanga}
          alt={`${service.name} at ${brandName}`}
          width={600}
          height={400}
          className="sf-service-image"
        />
        {service.popular && <span className="bt-badge absolute left-3 top-3 shadow">Popular</span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--bt-sage)]">{service.category}</p>
        <h3 className="bt-serif pt-1 text-[1.4rem] font-semibold leading-snug">{service.name}</h3>
        <p className="pt-1.5 text-sm leading-relaxed text-[color:var(--bt-muted)]">{service.description}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <span className="bt-price text-[1.55rem] leading-none">{bodhiFormatInr(service.price)}</span>
            {service.showDuration !== false && service.durationMinutes > 0 && (
              <span className="flex items-center gap-1 pt-1 text-xs font-semibold text-[color:var(--bt-muted)]">
                <Clock3 size={13} aria-hidden="true" /> {service.durationMinutes} min
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => book(service)}
            className="bt-btn bt-btn-primary px-4 py-2.5 text-sm"
            aria-label={`Book ${service.name} for ${bodhiFormatInr(service.price)}`}
          >
            Book Now
          </button>
        </div>
      </div>
    </motion.article>
  );

  const faqList = (items: typeof config.faqs) => (
    <div className="space-y-3">
      {items.map((faq) => {
        const open = openFaq === faq.id;
        return (
          <div key={faq.id} className="bt-glass-cream overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold"
              aria-expanded={open}
              onClick={() => setOpenFaq(open ? null : faq.id)}
            >
              <span>{faq.question}</span>
              <ChevronDown size={18} aria-hidden="true" className={`shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <p className="px-5 pb-5 text-sm leading-relaxed text-[color:var(--bt-muted)]">{faq.answer}</p>}
          </div>
        );
      })}
    </div>
  );

  const reviewCard = (review: (typeof config.reviews)[number], dark = false) => (
    <motion.figure
      key={review.id}
      variants={staggerItem}
      className={`${dark ? 'bt-glass text-[#FAF6EE]' : 'bt-glass-cream'} bt-lift flex flex-col p-6`}
    >
      <Quote size={22} aria-hidden="true" className="text-[color:var(--bt-gold)]" />
      <div className="flex gap-0.5 pt-3" aria-label={`${review.rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={15}
            aria-hidden="true"
            className={i < review.rating ? 'fill-[color:var(--bt-gold)] text-[color:var(--bt-gold)]' : 'opacity-30'}
          />
        ))}
      </div>
      <blockquote className={`pt-3 text-[15px] leading-relaxed ${dark ? '' : 'text-[color:var(--bt-forest)]'}`}>
        {review.quote}
      </blockquote>
      <figcaption className="mt-auto flex items-center gap-3 pt-5">
        {review.avatarUrl ? (
          <SafeImage
            src={review.avatarUrl}
            fallback={BODHI_TREE_IMAGES.testimonials.neha}
            alt={`Photo of ${review.name}`}
            width={96}
            height={96}
            className="h-11 w-11 rounded-full object-cover"
          />
        ) : (
          <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--bt-sage)] font-bold text-white">
            {review.name.charAt(0)}
          </span>
        )}
        <span>
          <span className="block text-sm font-bold">{review.name}</span>
          <span className={`block text-xs ${dark ? 'text-[#FAF6EE]/75' : 'text-[color:var(--bt-muted)]'}`}>
            {review.tag}
            {review.serviceName ? ` · ${review.serviceName}` : ''}
          </span>
        </span>
      </figcaption>
    </motion.figure>
  );

  const sectionHeading = (eyebrow: string, title: string, text?: string, dark = false) => (
    <motion.div
      variants={fadeUp}
      initial={canObserveViewport ? 'hidden' : 'visible'}
      whileInView={canObserveViewport ? 'visible' : undefined}
      viewport={revealViewport}
      className="mx-auto max-w-2xl text-center"
    >
      <p className="bt-eyebrow justify-center">{eyebrow}</p>
      <h2 className={`bt-serif pt-3 text-4xl font-semibold sm:text-5xl ${dark ? 'text-[#FAF6EE]' : ''}`}>{title}</h2>
      {text && (
        <p className={`pt-3 text-[15px] leading-relaxed ${dark ? 'text-[#FAF6EE]/85' : 'text-[color:var(--bt-muted)]'}`}>{text}</p>
      )}
    </motion.div>
  );

  const pageBand = (eyebrow: string, title: string, text?: string) => (
    <section className="bt-jali relative overflow-hidden bg-[color:var(--bt-sage-soft)]">
      <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-16 text-center sm:px-6">
        <motion.p variants={fadeUp} initial="hidden" animate="visible" className="bt-eyebrow justify-center">
          {eyebrow}
        </motion.p>
        <motion.h1
          variants={heroHeadline}
          initial="hidden"
          animate="visible"
          className="bt-serif pt-3 text-5xl font-semibold sm:text-6xl"
        >
          {title}
        </motion.h1>
        {text && (
          <motion.p variants={fadeUp} initial="hidden" animate="visible" className="mx-auto max-w-2xl pt-4 text-[15px] leading-relaxed text-[color:var(--bt-muted)]">
            {text}
          </motion.p>
        )}
      </div>
    </section>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="bt-site" data-template="massage_wellness" style={cssVars} ref={rootRef}>
        <a className="sr-only focus:not-sr-only focus:absolute focus:z-[120] focus:bg-white focus:px-4 focus:py-2" href="#bt-main-content">
          Skip to main content
        </a>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c') }}
        />

        <AppAnnouncementStrip />

        {/* ---------- Header ---------- */}
        <motion.header
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bt-header sticky top-0 z-[80]"
          aria-label={`${brandName} navigation and Customer account`}
        >
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
            <button
              type="button"
              onClick={() => go('home')}
              className="bt-logo-lift flex min-w-0 items-center gap-3 text-left"
              aria-label={`${brandName} — home`}
            >
              <img src={logoUrl} alt={`${brandName} logo`} width={46} height={46} className="h-11 w-11 shrink-0 rounded-full object-contain" />
              <span className="min-w-0">
                <span className="bt-serif block truncate text-[1.35rem] font-semibold leading-tight">{brandName}</span>
                <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--bt-muted)]">
                  {tagline || 'Massage & Wellness · Jaipur'}
                </span>
              </span>
            </button>

            <nav className="bt-desktop-nav" aria-label="Website navigation">
              {navItems.map(([label, target]) => (
                <button
                  key={target}
                  type="button"
                  className="bt-navlink"
                  aria-current={page === target ? 'page' : undefined}
                  onClick={() => go(target)}
                >
                  {label}
                </button>
              ))}
              <a
                className="bt-navlink"
                href={`/?customer=1&return=${encodeURIComponent(profile.subdomain || '')}`}
                onClick={(e) => {
                  e.preventDefault();
                  onMyBookings();
                }}
              >
                My Bookings
              </a>
            </nav>

            <div className="ml-auto flex items-center gap-2 lg:ml-4">
              <a href={`tel:${phoneDisplay.replace(/[^0-9+]/g, '')}`} className="hidden items-center gap-1.5 text-[13px] font-bold xl:flex">
                <Phone size={15} aria-hidden="true" className="text-[color:var(--bt-sage)]" /> {phoneDisplay}
              </a>
              {customerSignedIn ? (
                <>
                  <button type="button" aria-label="Manage your customer account" onClick={() => onAccount('signin')} className="flex items-center gap-2 rounded-full border bt-hairline bg-white/70 py-1.5 pl-1.5 pr-3 text-xs font-bold">
                    {customerPhotoUrl ? (
                      <img src={customerPhotoUrl} alt="" width={26} height={26} className="h-[26px] w-[26px] rounded-full object-cover" />
                    ) : (
                      <span aria-hidden="true" className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[color:var(--bt-sage)] text-[11px] text-white">
                        {(customerName || 'G').charAt(0)}
                      </span>
                    )}
                    <span className="max-w-[90px] truncate">{customerName || 'My account'}</span>
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => onAccount('signin')} className="hidden text-xs font-bold underline-offset-4 hover:underline sm:block">
                    Customer Login
                  </button>
                  <button type="button" onClick={() => onAccount('signup')} className="hidden text-xs font-bold underline-offset-4 hover:underline sm:block">
                    Sign up
                  </button>
                </>
              )}
              <button type="button" onClick={() => book()} className="bt-btn bt-btn-gold px-4 py-2.5 text-[13px]">
                <Calendar size={15} aria-hidden="true" /> Book Now
              </button>
              <button
                type="button"
                ref={menuBtnRef}
                className="flex h-10 w-10 items-center justify-center rounded-full border bt-hairline bg-white/70 lg:hidden"
                aria-expanded={menuOpen}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMenuOpen((v) => !v)}
              >
                {menuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <nav className="border-t bt-hairline bg-[color:var(--bt-cream)] px-4 pb-5 pt-2 lg:hidden" aria-label="Mobile">
              {navItems.map(([label, target]) => (
                <button
                  key={target}
                  type="button"
                  className="bt-serif flex w-full items-center justify-between border-b bt-hairline py-3 text-left text-xl"
                  aria-current={page === target ? 'page' : undefined}
                  onClick={() => go(target)}
                >
                  {label}
                  <ArrowUpRight size={17} aria-hidden="true" className="text-[color:var(--bt-gold)]" />
                </button>
              ))}
              <div className="flex flex-wrap gap-3 pt-4 text-sm font-semibold">
                <a className="bt-btn bt-btn-outline px-4 py-2.5" href={`tel:${phoneDisplay.replace(/[^0-9+]/g, '')}`}>
                  <Phone size={15} aria-hidden="true" /> {phoneDisplay}
                </a>
                <a className="bt-btn bt-btn-primary px-4 py-2.5" href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={15} aria-hidden="true" /> WhatsApp us
                </a>
                <a
                  className="bt-btn bt-btn-outline px-4 py-2.5"
                  href={`/?customer=1&return=${encodeURIComponent(profile.subdomain || '')}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuOpen(false);
                    onMyBookings();
                  }}
                >
                  My Bookings
                </a>
                {!customerSignedIn && (
                  <>
                    <button type="button" className="bt-btn bt-btn-outline px-4 py-2.5" onClick={() => onAccount('signin')}>
                      Customer Login
                    </button>
                    <button type="button" className="bt-btn bt-btn-outline px-4 py-2.5" onClick={() => onAccount('signup')}>
                      Sign up
                    </button>
                  </>
                )}
              </div>
            </nav>
          )}
        </motion.header>

        {/* ---------- Pages ---------- */}
        {/* NOTE: do NOT add initial={false} here — Framer Motion propagates
            it as blockInitialAnimation to EVERY descendant, which silently
            kills the hero entrance (headline slide-up, DeviceMockup
            scale-in) and all first-page reveals. */}
        <AnimatePresence mode="wait">
          <motion.main
            id="bt-main-content"
            key={page}
            variants={pageTransition}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {page === 'home' && (
              <>
                {/* Hero */}
                <section data-layout="hero" className="relative overflow-hidden" aria-labelledby="bt-hero-heading">
                  <picture>
                    <source media="(max-width: 640px)" srcSet={config.heroMobileUrl} />
                    <img
                      src={config.heroDesktopUrl}
                      alt="Calm spa room at our Jaipur centre with warm candles and soft light"
                      width={1600}
                      height={900}
                      fetchPriority="high"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </picture>
                  <div className="bt-hero-overlay absolute inset-0" aria-hidden="true" />
                  <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-[1.15fr_auto] lg:pb-24 lg:pt-24">
                    <div className="max-w-2xl text-[#FAF6EE]">
                      <motion.p variants={fadeUp} initial="hidden" animate="visible" className="text-xs font-bold uppercase tracking-[0.24em] text-[#E8D9B8]">
                        Padharo · Massage, Spa & Wellness · Jaipur
                      </motion.p>
                      <motion.h1
                        id="bt-hero-heading"
                        variants={heroHeadline}
                        initial="hidden"
                        animate="visible"
                        className="bt-serif pt-4 text-5xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl"
                      >
                        {config.heroHeading}
                      </motion.h1>
                      <motion.p variants={fadeUp} initial="hidden" animate="visible" className="max-w-xl pt-5 text-base leading-relaxed text-[#FAF6EE]/90 sm:text-lg">
                        {config.heroSubtext}
                      </motion.p>
                      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-wrap gap-3 pt-7">
                        <button type="button" onClick={() => book()} className="bt-btn bt-btn-gold px-6 py-3.5 text-sm">
                          <Calendar size={16} aria-hidden="true" /> Book Now
                        </button>
                        <button type="button" onClick={() => go('palace')} className="bt-btn bt-glass px-6 py-3.5 text-sm font-bold text-[#FAF6EE]">
                          See Palace Collection <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      </motion.div>
                      <motion.p variants={fadeUp} initial="hidden" animate="visible" className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-6 text-sm font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Star size={15} aria-hidden="true" className="fill-[color:var(--bt-gold)] text-[color:var(--bt-gold)]" />
                          {averageRating ? averageRating.toFixed(1) : '4.9'} guest rating
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock3 size={15} aria-hidden="true" /> {config.workingHoursDisplay}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin size={15} aria-hidden="true" /> {config.branches.length} Jaipur branches
                        </span>
                      </motion.p>
                    </div>

                    <motion.div variants={deviceMockupIn} initial="hidden" animate="visible" className="hidden justify-self-end md:block">
                      <DeviceMockup
                        brandName={brandName}
                        branchName={firstBranch?.name || 'C-Scheme'}
                        services={shownPopular}
                        onBook={(service) => book(service)}
                      />
                    </motion.div>
                  </div>

                  {/* Main central glass card — Framer Motion entrance on the
                      wrapper; glassmorphism + smooth CSS hover lift on the
                      card itself (a Motion inline transform would override
                      a CSS :hover transform on the same element). */}
                  <div className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6">
                    <motion.div
                      variants={scaleIn}
                      initial={canObserveViewport ? 'hidden' : 'visible'}
                      whileInView={canObserveViewport ? 'visible' : undefined}
                      viewport={revealViewport}
                    >
                      <div className="bt-glass bt-lift grid grid-cols-2 gap-4 px-6 py-5 text-center text-[#FAF6EE] lg:grid-cols-4">
                        {config.stats.map((stat) => (
                          <div key={stat.id}>
                            <span className="bt-serif block text-3xl font-semibold sm:text-4xl">{stat.value}</span>
                            <span className="block pt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#FAF6EE]/85">{stat.label}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </section>

                {promoSections.length > 0 && (
                  <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
                    <WebsiteSections {...shared} sections={promoSections} />
                  </div>
                )}

                {/* About preview */}
                <section className="bt-jali relative" aria-labelledby="bt-home-about">
                  <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
                    <motion.div variants={scaleIn} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="relative">
                      <div className="bt-arch-frame max-w-md">
                        <SafeImage
                          src={config.aboutImageUrl}
                          fallback={BODHI_TREE_IMAGES.aboutMassage}
                          alt="Therapist giving a relaxing oil massage"
                          width={800}
                          height={1000}
                          className="bt-arch aspect-[4/5] w-full object-cover"
                        />
                      </div>
                      <SafeImage
                        src={config.aboutImage2Url}
                        fallback={BODHI_TREE_IMAGES.aboutStones}
                        alt="Warm hot stones placed for a relaxing treatment"
                        width={800}
                        height={600}
                        className="absolute -bottom-8 right-0 hidden w-56 rounded-[20px] border-4 border-[color:var(--bt-cream)] object-cover shadow-xl sm:block"
                      />
                    </motion.div>
                    <motion.div variants={fadeUp} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport}>
                      <p className="bt-eyebrow">About Us</p>
                      <h2 id="bt-home-about" className="bt-serif pt-3 text-4xl font-semibold sm:text-5xl">{config.aboutHeading}</h2>
                      <p className="pt-4 text-[15px] leading-relaxed text-[color:var(--bt-muted)]">{config.aboutStory}</p>
                      <motion.ul variants={stagger} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="grid gap-3 pt-6 sm:grid-cols-2">
                        {WHY_CARDS.slice(0, 4).map((card) => (
                          <motion.li key={card.title} variants={staggerItem} className="bt-glass-cream bt-lift flex gap-3 p-4">
                            <card.icon size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-[color:var(--bt-sage)]" />
                            <span>
                              <span className="block text-sm font-bold">{card.title}</span>
                              <span className="block pt-0.5 text-[13px] leading-relaxed text-[color:var(--bt-muted)]">{card.text}</span>
                            </span>
                          </motion.li>
                        ))}
                      </motion.ul>
                      <button type="button" onClick={() => go('about')} className="bt-btn bt-btn-outline mt-7 px-6 py-3 text-sm">
                        Our Story <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    </motion.div>
                  </div>
                </section>

                {/* Popular massages */}
                <section data-layout="services" className="bg-[color:var(--bt-sage-soft)]" aria-labelledby="bt-home-services">
                  <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
                    {sectionHeading('Massage Menu', 'Our Most Loved Massages', 'Simple treatments, honest prices in ₹. Pick one and book in a minute.')}
                    {serviceCategories.length > 1 && (
                      <nav aria-label="Service categories" className="flex flex-wrap items-center justify-center gap-2 pt-8">
                        {serviceCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            className="bt-chip"
                            onClick={() => {
                              setServiceCat(cat);
                              go('services');
                            }}
                          >
                            {cat === 'All' ? 'Full Menu' : cat}
                          </button>
                        ))}
                        <button type="button" className="bt-chip" onClick={() => go('palace')}>
                          Palace Collection
                        </button>
                        <button type="button" className="bt-chip" onClick={() => go('packages')}>
                          Packages
                        </button>
                      </nav>
                    )}
                    {shownPopular.length > 0 ? (
                      <motion.div variants={stagger} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="sf-service-row grid gap-6 pt-10 sm:grid-cols-2 xl:grid-cols-4">
                        {shownPopular.map(serviceCard)}
                      </motion.div>
                    ) : (
                      <p className="pt-8 text-center text-sm text-[color:var(--bt-muted)]">Our massage menu is coming soon. Please call us to book.</p>
                    )}
                    <div className="pt-10 text-center">
                      <button type="button" onClick={() => go('services')} className="bt-btn bt-btn-primary px-6 py-3.5 text-sm">
                        See Full Massage Menu <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </section>

                {/* Palace Collection preview */}
                <section className="bt-sandstone-grad bt-jali relative" aria-labelledby="bt-home-palace">
                  <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
                    <motion.div variants={fadeUp} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="mx-auto max-w-2xl text-center">
                      <p className="bt-eyebrow justify-center">Jaipur Special</p>
                      <h2 id="bt-home-palace" className="bt-serif pt-3 text-4xl font-semibold sm:text-5xl">{config.palaceHeading}</h2>
                      <p className="pt-3 text-[15px] leading-relaxed text-[#4A3428]">{config.palaceSubtext}</p>
                    </motion.div>
                    <div className="pt-10">
                      <PalaceCollectionGrid items={config.palaceCollection.slice(0, 4)} services={services} onBook={(s) => book(s)} />
                    </div>
                    <div className="pt-10 text-center">
                      <button type="button" onClick={() => go('palace')} className="bt-btn bt-btn-primary px-6 py-3.5 text-sm">
                        View Full Palace Collection <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </section>

                {videoSections.length > 0 && (
                  <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
                    <WebsiteSections {...shared} sections={videoSections} />
                  </div>
                )}

                {/* Packages preview */}
                {packagesShown && (
                  <section id="salon-packages" aria-labelledby="bt-home-packages">
                    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
                      {sectionHeading('Packages', 'Special Packages for Special Days', 'More care, better value. All prices in ₹.')}
                      <motion.div variants={stagger} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="grid gap-6 pt-10 md:grid-cols-3">
                        {packageServices.map((service) => (
                          <motion.article key={service.id} variants={staggerItem} className="sf-service-card bt-glass-cream bt-lift flex flex-col overflow-hidden">
                            <SafeImage
                              src={bodhiTreeServiceImage(service)}
                              fallback={BODHI_TREE_IMAGES.packages.fullDayRelax}
                              alt={`${service.name} package at ${brandName}`}
                              width={1200}
                              height={800}
                              className="sf-service-image"
                            />
                            <div className="flex flex-1 flex-col p-5">
                              <h3 className="bt-serif text-[1.4rem] font-semibold leading-snug">{service.name}</h3>
                              <p className="pt-1.5 text-sm leading-relaxed text-[color:var(--bt-muted)]">{service.description}</p>
                              <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                                <span className="bt-price text-2xl">{bodhiFormatInr(service.price)}</span>
                                <button type="button" onClick={() => book(service)} className="bt-btn bt-btn-primary px-4 py-2.5 text-sm">
                                  Book Now
                                </button>
                              </div>
                            </div>
                          </motion.article>
                        ))}
                      </motion.div>
                      <div className="pt-10 text-center">
                        <button type="button" onClick={() => go('packages')} className="bt-btn bt-btn-outline px-6 py-3.5 text-sm">
                          See All Packages <ArrowRight size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {/* Reviews preview */}
                <section data-layout="experiences" className="bt-forest-grad bt-jali bt-jali-light relative" aria-labelledby="bt-home-reviews">
                  <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
                    {sectionHeading('Guest Love', 'What Jaipur Says About Us', 'Real words from our guests, in simple words — just like us.', true)}
                    <motion.div variants={stagger} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="grid gap-6 pt-10 md:grid-cols-3">
                      {displayReviews.slice(0, 3).map((review) => reviewCard(review, true))}
                    </motion.div>
                    <div className="pt-10 text-center">
                      <button type="button" onClick={() => go('reviews')} className="bt-btn bt-btn-gold px-6 py-3.5 text-sm">
                        Read All Reviews <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </section>

                {/* Gallery strip */}
                <section data-layout="gallery" aria-labelledby="bt-home-gallery">
                  <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
                    {sectionHeading('Gallery', 'Inside Bodhi Tree', 'A small look at our rooms, oils and calm corners.')}
                    <motion.div variants={stagger} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="grid grid-cols-2 gap-4 pt-10 md:grid-cols-5">
                      {galleryItems.slice(0, 5).map((item) => (
                        <motion.figure key={item.src} variants={staggerItem} className="bt-lift overflow-hidden rounded-[20px]">
                          <SafeImage
                            src={item.src}
                            fallback={BODHI_TREE_IMAGES.gallery.spaRoom}
                            alt={item.title}
                            width={800}
                            height={600}
                            className="aspect-[4/3] w-full object-cover"
                          />
                        </motion.figure>
                      ))}
                    </motion.div>
                    <div className="pt-8 text-center">
                      <button type="button" onClick={() => go('gallery')} className="bt-btn bt-btn-outline px-6 py-3 text-sm">
                        Open Gallery <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </section>

                {/* Branches + FAQ */}
                <section data-layout="location" className="bg-[color:var(--bt-sage-soft)]" aria-labelledby="bt-home-branches">
                  <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
                    <div>
                      {sectionHeading('Visit Us', 'Four Branches in Jaipur')}
                      <motion.div variants={stagger} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="grid gap-4 pt-8 sm:grid-cols-2">
                        {config.branches.map((branch) => (
                          <motion.article key={branch.id} variants={staggerItem} className="bt-glass-cream bt-lift p-5">
                            <h3 className="bt-serif flex items-center gap-2 text-xl font-semibold">
                              <MapPin size={17} aria-hidden="true" className="text-[color:var(--bt-sage)]" /> {branch.name}
                            </h3>
                            <p className="pt-1.5 text-[13px] leading-relaxed text-[color:var(--bt-muted)]">{branch.address}</p>
                            <p className="flex items-center gap-1.5 pt-2 text-xs font-bold">
                              <Clock3 size={13} aria-hidden="true" /> {branch.hours || '9:00 AM - 9:00 PM'}
                            </p>
                          </motion.article>
                        ))}
                      </motion.div>
                    </div>
                    <div>
                      {sectionHeading('Common Questions', 'Before You Come')}
                      <motion.div variants={fadeUp} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="pt-8">
                        {faqList(config.faqs.slice(0, 4))}
                      </motion.div>
                    </div>
                  </div>
                </section>

                {closingOwnerSections.length > 0 && (
                  <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
                    <WebsiteSections {...shared} sections={closingOwnerSections} />
                  </div>
                )}

                {/* Final CTA */}
                <section className="bt-jali relative overflow-hidden" aria-label="Book your visit">
                  <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-6 text-center sm:px-6">
                    <motion.div variants={scaleIn} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="bt-glass-cream px-6 py-12">
                      <Leaf size={30} aria-hidden="true" className="mx-auto text-[color:var(--bt-sage)]" />
                      <h2 className="bt-serif pt-4 text-4xl font-semibold sm:text-5xl">Ready to Feel Light?</h2>
                      <p className="mx-auto max-w-xl pt-3 text-[15px] leading-relaxed text-[color:var(--bt-muted)]">
                        Book online in a minute, or just say hello on WhatsApp. Padharo — we will keep the herbal tea ready.
                      </p>
                      <div className="flex flex-wrap justify-center gap-3 pt-7">
                        <button type="button" onClick={() => book()} className="bt-btn bt-btn-gold px-6 py-3.5 text-sm">
                          <Calendar size={16} aria-hidden="true" /> Book Now
                        </button>
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="bt-btn bt-btn-primary px-6 py-3.5 text-sm">
                          <MessageCircle size={16} aria-hidden="true" /> WhatsApp Us
                        </a>
                      </div>
                    </motion.div>
                  </div>
                </section>

                <CustomerAppPromotion />
              </>
            )}

            {page === 'about' && (
              <>
                {pageBand('About Us', config.aboutHeading, config.aboutStory)}
                <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
                  <motion.div variants={scaleIn} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="bt-arch-frame max-w-md">
                    <SafeImage src={config.aboutImageUrl} fallback={BODHI_TREE_IMAGES.aboutMassage} alt="Therapist giving a relaxing oil massage at our Jaipur centre" width={800} height={1000} className="bt-arch aspect-[4/5] w-full object-cover" />
                  </motion.div>
                  <motion.div variants={fadeUp} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport}>
                    <h2 className="bt-serif text-4xl font-semibold">Why the Name “Bodhi Tree”?</h2>
                    <p className="pt-4 text-[15px] leading-relaxed text-[color:var(--bt-muted)]">
                      The Bodhi tree is known as a tree of peace. People have rested under its shade for hundreds of years.
                      We want our centre to feel the same — cool, calm and safe. When you walk in, Jaipur’s noise stays outside.
                      When you walk out, you feel light, fresh and ready for the day.
                    </p>
                    <p className="pt-3 text-[15px] leading-relaxed text-[color:var(--bt-muted)]">
                      We keep things simple: pure oils, trained and polite therapists, clean rooms and clear prices in ₹.
                      No big talks. Just good care, every single visit.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-6">
                      <button type="button" onClick={() => go('services')} className="bt-btn bt-btn-primary px-6 py-3 text-sm">See Massage Menu</button>
                      <button type="button" onClick={() => go('team')} className="bt-btn bt-btn-outline px-6 py-3 text-sm">Meet Our Team</button>
                    </div>
                  </motion.div>
                </section>

                <section className="bg-[color:var(--bt-sage-soft)]" aria-labelledby="bt-about-care">
                  <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
                    {sectionHeading('How We Care', 'Small Things We Always Do')}
                    <motion.div variants={stagger} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="grid gap-5 pt-10 sm:grid-cols-2 lg:grid-cols-4">
                      {WHY_CARDS.map((card) => (
                        <motion.article key={card.title} variants={staggerItem} className="bt-glass-cream bt-lift p-6 text-center">
                          <card.icon size={26} aria-hidden="true" className="mx-auto text-[color:var(--bt-sage)]" />
                          <h3 className="bt-serif pt-3 text-xl font-semibold">{card.title}</h3>
                          <p className="pt-1.5 text-sm leading-relaxed text-[color:var(--bt-muted)]">{card.text}</p>
                        </motion.article>
                      ))}
                    </motion.div>
                    <motion.div variants={stagger} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="mt-10 grid grid-cols-2 gap-4 text-center lg:grid-cols-4">
                      {config.stats.map((stat) => (
                        <motion.div key={stat.id} variants={staggerItem} className="bt-glass-cream px-4 py-6">
                          <span className="bt-serif block text-4xl font-semibold">{stat.value}</span>
                          <span className="block pt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--bt-muted)]">{stat.label}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                </section>

                {(profile.ownerName || '').trim() && (
                  <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6" aria-labelledby="bt-about-owner">
                    <motion.div variants={fadeUp} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="bt-glass-cream flex flex-col items-center gap-6 p-8 text-center sm:flex-row sm:text-left">
                      {(profile.ownerPhotoUrl || '').trim() && (
                        <SafeImage src={profile.ownerPhotoUrl} fallback={BODHI_TREE_IMAGES.team.kavita} alt={`Photo of ${profile.ownerName}`} width={300} height={300} className="h-28 w-28 shrink-0 rounded-full object-cover" />
                      )}
                      <div>
                        <p className="bt-eyebrow">From Our Founder</p>
                        <h2 id="bt-about-owner" className="bt-serif pt-2 text-3xl font-semibold">{profile.ownerName}</h2>
                        <p className="text-sm font-semibold text-[color:var(--bt-sage)]">{profile.ownerRole}</p>
                        <p className="pt-3 text-[15px] leading-relaxed text-[color:var(--bt-muted)]">
                          “Jaipur is my home. I started {brandName} so our own people could get world-class massage care at
                          fair prices, right here in the Pink City. Padharo — you are family here.”
                        </p>
                      </div>
                    </motion.div>
                  </section>
                )}
              </>
            )}

            {page === 'services' && (
              <>
                {pageBand('Services', 'Our Massage Menu', 'Every treatment below can be booked online. All prices in ₹ — no hidden charges. Heat, pressure and oil can be changed as per your comfort.')}
                <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
                  <div className="bt-no-scrollbar flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Filter massages by category">
                    {serviceCategories.map((cat) => (
                      <button key={cat} type="button" className="bt-chip shrink-0" aria-pressed={activeServiceCat === cat} onClick={() => setServiceCat(cat)}>
                        {cat}
                      </button>
                    ))}
                  </div>
                  {visibleServices.length > 0 ? (
                    <motion.div key={activeServiceCat} variants={stagger} initial="hidden" animate="visible" className="sf-service-row grid gap-6 pt-8 sm:grid-cols-2 lg:grid-cols-3">
                      {visibleServices.map(serviceCard)}
                    </motion.div>
                  ) : (
                    <p className="pt-10 text-center text-sm text-[color:var(--bt-muted)]">No treatments in this category right now. Please call us — we will help you pick the right one.</p>
                  )}
                  <motion.p variants={fadeUp} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="bt-glass-cream mx-auto mt-12 max-w-3xl px-6 py-5 text-center text-sm leading-relaxed text-[color:var(--bt-muted)]">
                    Not sure which massage is right for you? <a className="font-bold text-[color:var(--bt-forest)] underline" href={whatsappHref} target="_blank" rel="noopener noreferrer">Ask us on WhatsApp</a> — we will guide you in simple words. Every massage ends with warm herbal tea.
                  </motion.p>
                </section>
              </>
            )}

            {page === 'palace' && (
              <>
                <section className="bt-sandstone-grad bt-jali relative overflow-hidden" aria-labelledby="bt-palace-heading">
                  <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-16 text-center sm:px-6">
                    <motion.p variants={fadeUp} initial="hidden" animate="visible" className="bt-eyebrow justify-center">Jaipur Special</motion.p>
                    <motion.h1 id="bt-palace-heading" variants={heroHeadline} initial="hidden" animate="visible" className="bt-serif pt-3 text-5xl font-semibold sm:text-6xl">
                      {config.palaceHeading}
                    </motion.h1>
                    <motion.p variants={fadeUp} initial="hidden" animate="visible" className="mx-auto max-w-2xl pt-4 text-[15px] leading-relaxed text-[#4A3428]">
                      {config.palaceSubtext}
                    </motion.p>
                  </div>
                </section>
                <section className="bt-sandstone-grad bt-jali relative">
                  <div className="relative mx-auto max-w-7xl px-4 pb-20 sm:px-6">
                    <PalaceCollectionGrid items={config.palaceCollection} services={services} onBook={(s) => book(s)} full />
                    <motion.p variants={fadeUp} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="bt-glass-cream mx-auto mt-12 max-w-3xl px-6 py-5 text-center text-sm leading-relaxed text-[color:var(--bt-muted)]">
                      Every Palace Collection treatment ends with a warm herbal tea. Going for the full-day
                      Rambagh Maharani? Please book one day before, so we can keep your room and lunch ready.
                    </motion.p>
                  </div>
                </section>
              </>
            )}

            {page === 'packages' && (
              <>
                {pageBand('Packages', 'Special Packages', 'More care in one visit, at a better price. Good for gifts, weddings and slow weekends.')}
                <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
                  {packageServices.length > 0 ? (
                    <motion.div variants={stagger} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {packageServices.map((service) => (
                        <motion.article key={service.id} variants={staggerItem} className="bt-glass-cream bt-lift flex flex-col overflow-hidden">
                          <div className="relative">
                            <SafeImage src={bodhiTreeServiceImage(service)} fallback={BODHI_TREE_IMAGES.packages.fullDayRelax} alt={`${service.name} at ${brandName}`} width={1200} height={800} className="aspect-[3/2] w-full object-cover" />
                            {service.popular && <span className="bt-badge absolute left-3 top-3 shadow">Popular</span>}
                          </div>
                          <div className="flex flex-1 flex-col p-6">
                            <h3 className="bt-serif text-2xl font-semibold leading-snug">{service.name}</h3>
                            <p className="pt-2 text-sm leading-relaxed text-[color:var(--bt-muted)]">{service.description}</p>
                            <ul className="space-y-1.5 pt-4 text-[13px]">
                              {service.showDuration !== false && service.durationMinutes > 0 && (<li className="flex items-center gap-2"><Clock3 size={14} aria-hidden="true" className="text-[color:var(--bt-sage)]" /> {service.durationMinutes} min session</li>)}
                              <li className="flex items-center gap-2"><Check size={14} aria-hidden="true" className="text-[color:var(--bt-sage)]" /> Herbal tea included</li>
                              <li className="flex items-center gap-2"><Check size={14} aria-hidden="true" className="text-[color:var(--bt-sage)]" /> Pay by UPI, card or cash (₹)</li>
                            </ul>
                            <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                              <span className="bt-price text-[1.7rem] leading-none">{bodhiFormatInr(service.price)}</span>
                              <button type="button" onClick={() => book(service)} className="bt-btn bt-btn-primary px-5 py-2.5 text-sm">Book Now</button>
                            </div>
                          </div>
                        </motion.article>
                      ))}
                    </motion.div>
                  ) : (
                    <p className="text-center text-sm text-[color:var(--bt-muted)]">Packages are coming soon. Till then, please see our massage menu.</p>
                  )}
                  <motion.div variants={fadeUp} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="bt-glass-cream mx-auto mt-12 max-w-3xl px-6 py-6 text-center">
                    <h3 className="bt-serif text-2xl font-semibold">Gift a Package</h3>
                    <p className="pt-2 text-sm leading-relaxed text-[color:var(--bt-muted)]">
                      A massage package is a sweet gift for birthdays, anniversaries and shaadi season.
                      Message us on WhatsApp and we will make a gift booking in your loved one’s name.
                    </p>
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="bt-btn bt-btn-gold mt-4 px-6 py-3 text-sm">
                      <MessageCircle size={15} aria-hidden="true" /> Gift on WhatsApp
                    </a>
                  </motion.div>
                </section>
              </>
            )}

            {page === 'gallery' && (
              <>
                {pageBand('Gallery', 'Inside Bodhi Tree', 'Our rooms, oils, flowers and calm corners — across Jaipur.')}
                <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
                  <div className="bt-no-scrollbar flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Filter gallery photos">
                    {galleryCategories.map((cat) => (
                      <button key={cat} type="button" className="bt-chip shrink-0" aria-pressed={galleryCat === cat} onClick={() => setGalleryCat(cat)}>
                        {cat}
                      </button>
                    ))}
                  </div>
                  {visibleGallery.length > 0 ? (
                    <motion.div variants={stagger} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="grid grid-cols-2 gap-4 pt-8 md:grid-cols-3 lg:grid-cols-4">
                      {visibleGallery.map(({ item, index }) => (
                        <motion.figure key={`${item.src}-${index}`} variants={staggerItem}>
                          <button type="button" onClick={() => setLightbox(index)} className="bt-lift block w-full overflow-hidden rounded-[20px]" aria-label={`View photo: ${item.title}`}>
                            <SafeImage src={item.src} fallback={BODHI_TREE_IMAGES.gallery.spaRoom} alt={item.title} width={800} height={600} className="aspect-[4/3] w-full object-cover" />
                          </button>
                          <figcaption className="px-1 pt-2 text-left text-xs font-semibold text-[color:var(--bt-muted)]">
                            {item.title} · {item.isDemo ? 'Demo photo' : 'Our centre'}
                          </figcaption>
                        </motion.figure>
                      ))}
                    </motion.div>
                  ) : (
                    <p className="pt-10 text-center text-sm text-[color:var(--bt-muted)]">No photos in this group yet.</p>
                  )}
                </section>

                {lightbox !== null && galleryItems[lightbox] && (
                  <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-[rgba(16,34,26,0.9)] p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label={galleryItems[lightbox].title}
                    onClick={() => setLightbox(null)}
                  >
                    <button type="button" autoFocus className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#FAF6EE] text-[#1E3A2F]" aria-label="Close photo" onClick={() => setLightbox(null)}>
                      <X size={20} aria-hidden="true" />
                    </button>
                    <figure className="max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
                      <SafeImage
                        src={galleryItems[lightbox].src}
                        fallback={BODHI_TREE_IMAGES.gallery.spaRoom}
                        alt={galleryItems[lightbox].title}
                        width={1200}
                        height={900}
                        loading="eager"
                        className="max-h-[82vh] w-full rounded-[20px] object-contain"
                      />
                      <figcaption className="pt-3 text-center text-sm font-semibold text-[#FAF6EE]">{galleryItems[lightbox].title}</figcaption>
                      <div className="flex justify-center gap-3 pt-4">
                        <button type="button" className="bt-btn bt-btn-gold px-5 py-2.5 text-sm" onClick={() => setLightbox((lightbox + galleryItems.length - 1) % galleryItems.length)}>Previous</button>
                        <button type="button" className="bt-btn bt-btn-gold px-5 py-2.5 text-sm" onClick={() => setLightbox((lightbox + 1) % galleryItems.length)}>Next</button>
                      </div>
                    </figure>
                  </div>
                )}
              </>
            )}

            {page === 'team' && (
              <>
                {pageBand('Our Team', 'Meet Your Therapists', 'Trained, polite and caring. You can ask for a male or female therapist while booking — your comfort comes first.')}
                <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
                  {team.length > 0 ? (
                    <motion.div variants={stagger} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                      {team.map((member) => (
                        <motion.article key={member.id} variants={staggerItem} className="bt-glass-cream bt-lift flex flex-col overflow-hidden">
                          <SafeImage
                            src={member.avatarUrl}
                            fallback={BODHI_TREE_IMAGES.team.kavita}
                            alt={`Photo of ${member.name}, ${member.role}`}
                            width={600}
                            height={600}
                            className="aspect-square w-full object-cover"
                          />
                          <div className="flex flex-1 flex-col p-5">
                            <h3 className="bt-serif text-[1.45rem] font-semibold leading-snug">{member.name}</h3>
                            <p className="text-[13px] font-bold text-[color:var(--bt-sage)]">{member.role}</p>
                            <p className="flex items-center gap-1.5 pt-1.5 text-xs font-semibold text-[color:var(--bt-muted)]">
                              <Star size={13} aria-hidden="true" className="fill-[color:var(--bt-gold)] text-[color:var(--bt-gold)]" />
                              {member.rating ? member.rating.toFixed(1) : 'New'}
                              {member.experienceYears ? ` · ${member.experienceYears} years experience` : ''}
                            </p>
                            {member.bio && <p className="pt-2.5 text-[13px] leading-relaxed text-[color:var(--bt-muted)]">{member.bio}</p>}
                            {member.specialties?.length > 0 && (
                              <ul className="flex flex-wrap gap-1.5 pt-3" aria-label={`Specialities of ${member.name}`}>
                                {member.specialties.slice(0, 3).map((skill) => (
                                  <li key={skill} className="rounded-full bg-[color:var(--bt-sage-soft)] px-2.5 py-1 text-[11px] font-bold text-[color:var(--bt-forest)]">{skill}</li>
                                ))}
                              </ul>
                            )}
                            <div className="mt-auto flex gap-2 pt-5">
                              <button type="button" onClick={() => book(undefined, member)} className="bt-btn bt-btn-primary flex-1 px-3 py-2.5 text-[13px]">
                                Book with {member.name.split(' ')[0]}
                              </button>
                              <button type="button" onClick={() => onViewSpecialist(member.id)} className="bt-btn bt-btn-outline px-3 py-2.5 text-[13px]">
                                Profile
                              </button>
                            </div>
                          </div>
                        </motion.article>
                      ))}
                    </motion.div>
                  ) : (
                    <p className="text-center text-sm text-[color:var(--bt-muted)]">Our team page is coming soon.</p>
                  )}
                </section>
              </>
            )}

            {page === 'reviews' && (
              <>
                {pageBand('Testimonials', 'Guest Words, Simple & Sweet', averageRating ? `Average rating ${averageRating.toFixed(1)} out of 5, from guests across Jaipur.` : 'Words from our guests across Jaipur.')}
                <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
                  {displayReviews.length > 0 ? (
                    <motion.div variants={stagger} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {displayReviews.map((review) => reviewCard(review))}
                    </motion.div>
                  ) : (
                    <p className="text-center text-sm text-[color:var(--bt-muted)]">Reviews are coming soon. Be our first guest to share your experience!</p>
                  )}
                  <motion.div variants={fadeUp} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="bt-glass-cream mx-auto mt-12 max-w-3xl px-6 py-6 text-center">
                    <h3 className="bt-serif text-2xl font-semibold">Come, Try It Yourself</h3>
                    <p className="pt-2 text-sm leading-relaxed text-[color:var(--bt-muted)]">Book a massage today and feel the Bodhi Tree calm. Open all days, 9:00 AM - 9:00 PM.</p>
                    <button type="button" onClick={() => book()} className="bt-btn bt-btn-gold mt-4 px-6 py-3 text-sm">
                      <Calendar size={15} aria-hidden="true" /> Book Now
                    </button>
                  </motion.div>
                </section>
              </>
            )}

            {page === 'contact' && (
              <>
                {pageBand('Contact', 'Visit Us in Jaipur', 'Call, WhatsApp or just walk in. We are open all 7 days, 9:00 AM - 9:00 PM.')}
                <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
                  <motion.div variants={scaleIn} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport}>
                    <SafeImage
                      src={config.contactImageUrl}
                      fallback={BODHI_TREE_IMAGES.contact}
                      alt={`Reception area at ${brandName}, Jaipur`}
                      width={1000}
                      height={750}
                      className="aspect-[4/3] w-full rounded-[20px] object-cover"
                    />
                    <div className="grid gap-4 pt-6 sm:grid-cols-2">
                      <a href={`tel:${phoneDisplay.replace(/[^0-9+]/g, '')}`} className="bt-glass-cream bt-lift block p-5">
                        <Phone size={20} aria-hidden="true" className="text-[color:var(--bt-sage)]" />
                        <span className="block pt-2 text-sm font-bold">Call Us</span>
                        <span className="block text-sm text-[color:var(--bt-muted)]">{phoneDisplay}</span>
                      </a>
                      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="bt-glass-cream bt-lift block p-5">
                        <MessageCircle size={20} aria-hidden="true" className="text-[color:var(--bt-sage)]" />
                        <span className="block pt-2 text-sm font-bold">WhatsApp</span>
                        <span className="block text-sm text-[color:var(--bt-muted)]">Chat & book in a minute</span>
                      </a>
                      <a href={`mailto:${config.publicEmail}`} className="bt-glass-cream bt-lift block p-5">
                        <Mail size={20} aria-hidden="true" className="text-[color:var(--bt-sage)]" />
                        <span className="block pt-2 text-sm font-bold">Email</span>
                        <span className="block break-all text-sm text-[color:var(--bt-muted)]">{config.publicEmail}</span>
                      </a>
                      <div className="bt-glass-cream p-5">
                        <Clock3 size={20} aria-hidden="true" className="text-[color:var(--bt-sage)]" />
                        <span className="block pt-2 text-sm font-bold">Timings</span>
                        <span className="block text-sm text-[color:var(--bt-muted)]">{config.workingHoursDisplay}</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={fadeUp} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport}>
                    <h2 className="bt-serif text-3xl font-semibold">Our Jaipur Branches</h2>
                    <div className="space-y-4 pt-5">
                      {config.branches.map((branch) => (
                        <article key={branch.id} className="bt-glass-cream bt-lift p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="bt-serif text-xl font-semibold">{branch.name}</h3>
                              <p className="pt-1 text-sm leading-relaxed text-[color:var(--bt-muted)]">{branch.address}</p>
                              <p className="flex items-center gap-1.5 pt-2 text-xs font-bold">
                                <Clock3 size={13} aria-hidden="true" /> {branch.hours || '9:00 AM - 9:00 PM'}
                                {branch.phone ? <span className="font-semibold text-[color:var(--bt-muted)]">· {branch.phone}</span> : null}
                              </p>
                            </div>
                            <a
                              className="bt-btn bt-btn-outline px-4 py-2 text-xs"
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${brandName} ${branch.address}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MapPin size={13} aria-hidden="true" /> Directions
                            </a>
                          </div>
                        </article>
                      ))}
                    </div>
                    <div className="overflow-hidden rounded-[20px] border bt-hairline pt-0 shadow-sm [margin-top:1.5rem]">
                      <iframe
                        title={`Map — ${brandName}, ${addressDisplay}`}
                        src={mapEmbedUrl}
                        width="100%"
                        height="320"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="block w-full border-0"
                      />
                    </div>
                    <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="bt-btn bt-btn-primary mt-4 px-5 py-3 text-sm">
                      <MapPin size={15} aria-hidden="true" /> Open in Google Maps
                    </a>
                  </motion.div>
                </section>

                <section className="bg-[color:var(--bt-sage-soft)]" aria-labelledby="bt-contact-faq">
                  <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
                    {sectionHeading('Common Questions', 'Good to Know')}
                    <motion.div variants={fadeUp} initial={canObserveViewport ? 'hidden' : 'visible'} whileInView={canObserveViewport ? 'visible' : undefined} viewport={revealViewport} className="pt-10">
                      {faqList(config.faqs)}
                    </motion.div>
                  </div>
                </section>
              </>
            )}
          </motion.main>
        </AnimatePresence>

        {/* ---------- Footer ---------- */}
        <motion.footer data-layout="footer"
          variants={fadeUp}
          initial={canObserveViewport ? 'hidden' : 'visible'}
          whileInView={canObserveViewport ? 'visible' : undefined}
          viewport={revealViewport}
          className="bt-forest-grad bt-jali bt-jali-light relative text-[#FAF6EE]"
        >
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
            <div>
              <div className="flex items-center gap-3">
                <img src={logoUrl} alt={`${brandName} logo`} width={48} height={48} className="bt-logo-lift h-12 w-12 rounded-full bg-[#FAF6EE] object-contain p-1" />
                <div>
                  <p className="bt-serif text-2xl font-semibold leading-tight">{brandName}</p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FAF6EE]/75">{tagline || 'Padharo, Jaipur'}</p>
                </div>
              </div>
              <p className="max-w-sm pt-4 text-sm leading-relaxed text-[#FAF6EE]/85">
                A calm massage and wellness sanctuary in the heart of Jaipur. Pure oils, trained therapists and
                honest prices in ₹ — so you can relax, sleep better and feel fresh.
              </p>
              <p className="flex items-center gap-2 pt-4 text-sm font-semibold">
                <Clock3 size={15} aria-hidden="true" className="text-[color:var(--bt-gold)]" /> {config.workingHoursDisplay}
              </p>
            </div>

            <nav aria-label="Footer">
              <h3 className="bt-serif text-lg font-semibold text-[color:var(--bt-gold)]">Explore</h3>
              <ul className="space-y-2 pt-4 text-sm">
                {navItems.map(([label, target]) => (
                  <li key={target}>
                    <button type="button" className="text-[#FAF6EE]/85 underline-offset-4 hover:text-[#FAF6EE] hover:underline" onClick={() => go(target)}>
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <h3 className="bt-serif text-lg font-semibold text-[color:var(--bt-gold)]">Our Branches</h3>
              <ul className="space-y-3 pt-4 text-sm text-[#FAF6EE]/85">
                {config.branches.map((branch) => (
                  <li key={branch.id}>
                    <span className="block font-bold text-[#FAF6EE]">{branch.name}</span>
                    <span className="block text-[13px]">{branch.address}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="bt-serif text-lg font-semibold text-[color:var(--bt-gold)]">Contact</h3>
              <ul className="space-y-2.5 pt-4 text-sm text-[#FAF6EE]/85">
                <li className="flex items-start gap-2">
                  <MapPin size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-[color:var(--bt-gold)]" />
                  <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">{addressDisplay}</a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={15} aria-hidden="true" className="shrink-0 text-[color:var(--bt-gold)]" />
                  <a href={`tel:${phoneDisplay.replace(/[^0-9+]/g, '')}`} className="underline-offset-4 hover:underline">{phoneDisplay}</a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={15} aria-hidden="true" className="shrink-0 text-[color:var(--bt-gold)]" />
                  <a href={`mailto:${config.publicEmail}`} className="break-all underline-offset-4 hover:underline">{config.publicEmail}</a>
                </li>
              </ul>
              <h4 className="bt-serif pt-6 text-lg font-semibold text-[color:var(--bt-gold)]">
                {profile.sectionHeadings?.socialTitle || 'Connect with us'}
              </h4>
              <div className="flex gap-2.5 pt-3">
                {instaUrl && (
                  <a href={instaUrl} target="_blank" rel="noopener noreferrer" aria-label={`${brandName} on Instagram`} className="bt-lift flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(197,164,109,0.6)]">
                    <Instagram size={17} aria-hidden="true" />
                  </a>
                )}
                {fbUrl && (
                  <a href={fbUrl} target="_blank" rel="noopener noreferrer" aria-label={`${brandName} on Facebook`} className="bt-lift flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(197,164,109,0.6)]">
                    <Facebook size={17} aria-hidden="true" />
                  </a>
                )}
                {ytUrl && (
                  <a href={ytUrl} target="_blank" rel="noopener noreferrer" aria-label={`${brandName} on YouTube`} className="bt-lift flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(197,164,109,0.6)]">
                    <Youtube size={17} aria-hidden="true" />
                  </a>
                )}
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label={`Chat with ${brandName} on WhatsApp`} className="bt-lift flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(197,164,109,0.6)]">
                  <MessageCircle size={17} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          <div className="relative border-t border-[rgba(197,164,109,0.35)]">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-[#FAF6EE]/75 sm:px-6">
              <span>© {new Date().getFullYear()} {brandName}. All rights reserved.</span>
              <span>All prices in INR (₹) · Padharo Mhare Desh</span>
            </div>
          </div>
        </motion.footer>

        {/* Floating WhatsApp */}
        {!menuOpen && (
          <motion.a
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="bt-lift fixed bottom-5 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-[#1FA855] text-white shadow-[0_12px_32px_rgba(0,0,0,0.3)]"
            aria-label={`Chat with ${brandName} on WhatsApp`}
          >
            <MessageCircle size={26} aria-hidden="true" />
          </motion.a>
        )}
      </div>
    </MotionConfig>
  );
}
