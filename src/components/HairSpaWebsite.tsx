import { useEffect, useRef, useState } from "react";
import { useReducedMotion, useScroll, useTransform } from "motion/react";
import type { SalonProfile, SalonService, Stylist } from "../types";
import type { SalonGalleryPhoto } from "../lib/photoGallery";
import { WebsiteSections } from "./WebsiteSections";
import {
  AppAnnouncementStrip,
  CustomerAppPromotion,
} from "./CustomerAppPromotion";
import { HairSpaContext } from "./hair-spa/context";
import { HairSpaHeader } from "./hair-spa/HairSpaHeader";
import { HeroSection } from "./hair-spa/HeroSection";
import { BrandPhilosophy } from "./hair-spa/BrandPhilosophy";
import { ServicesSection } from "./hair-spa/ServicesSection";
import { ScalpCareJourney } from "./hair-spa/ScalpCareJourney";
import { TeamSection } from "./hair-spa/TeamSection";
import { SanctuaryGallery } from "./hair-spa/SanctuaryGallery";
import { TestimonialsSection } from "./hair-spa/TestimonialsSection";
import { BookingSection } from "./hair-spa/BookingSection";
import { FAQSection } from "./hair-spa/FAQSection";
import { ContactSection } from "./hair-spa/ContactSection";
import { HairSpaFooter } from "./hair-spa/HairSpaFooter";
import { GalleryLightbox } from "./hair-spa/GalleryLightbox";
import {
  KESH_PRAKRITI_FAQ,
  keshContactSummary,
  keshGallery,
  keshHeroImage,
  keshPackages,
  keshPublishedReviews,
  keshServiceCategories,
} from "../lib/keshPrakriti";
import { promotionActive, usePromotionClock } from "../lib/promotionStatus";
import { showcaseVideos } from "../lib/showcaseVideos";
import { reelSource } from "../lib/socialVideoSource";

const questions = KESH_PRAKRITI_FAQ;

function formatMoney(price: number) {
  return `₹${Number(price).toLocaleString("en-IN")}`;
}

export function HairSpaWebsite({
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
  /** False for a template preview or when the service menu is empty. */
  bookingAvailable?: boolean;
  onBook: (service?: SalonService, specialist?: Stylist) => void;
  onAccount: (mode?: "signin" | "signup") => void;
  onMyBookings: () => void;
  onViewSpecialist: (id: string) => void;
}) {
  const heroRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const pendingScrollRef = useRef<string | null>(null);
  const galleryTrackRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [serviceCategory, setServiceCategory] = useState("All");
  const [galleryCategory, setGalleryCategory] = useState("All");
  const [activePhoto, setActivePhoto] = useState(-1);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [smallScreen, setSmallScreen] = useState(false);
  const reduceMotion = useReducedMotion();
  const promotionNow = usePromotionClock();
  const canUseHeroScroll =
    typeof window !== "undefined" &&
    typeof IntersectionObserver !== "undefined";
  const { scrollYProgress } = useScroll({
    target: canUseHeroScroll ? heroRef : undefined,
    offset: ["start start", "end start"],
  });
  const parallaxY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion || smallScreen || !canUseHeroScroll
      ? ["0%", "0%"]
      : ["0%", "12%"],
  );

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 28);
    const media = window.matchMedia?.("(max-width: 760px)");
    const updateScreen = () => setSmallScreen(Boolean(media?.matches));
    updateScroll();
    updateScreen();
    window.addEventListener("scroll", updateScroll, { passive: true });
    media?.addEventListener?.("change", updateScreen);
    return () => {
      window.removeEventListener("scroll", updateScroll);
      media?.removeEventListener?.("change", updateScreen);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !mobileNavRef.current) return;
      const focusable = mobileNavRef.current.querySelectorAll<HTMLElement>(
        "a,button:not([disabled])",
      );
      const first = focusable.item(0);
      const last = focusable.item(focusable.length - 1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    requestAnimationFrame(() =>
      mobileNavRef.current?.querySelector<HTMLElement>("a")?.focus(),
    );
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = priorOverflow;
      document.removeEventListener("keydown", onKeyDown);
      if (
        document.activeElement &&
        mobileNavRef.current?.contains(document.activeElement)
      ) {
        menuButtonRef.current?.focus({ preventScroll: true });
      }
    };
  }, [menuOpen]);

  const businessName = profile.businessName?.trim() || "Hair Spa & Scalp Sanctuary";
  const metaDescription = `Explore services, prices, opening hours and online booking at ${businessName}.`;
  useEffect(() => {
    if (typeof document === "undefined" || !document.head) return;
    const previousTitle = document.title;
    document.title = `${businessName} | Hair Spa & Scalp Wellness`;
    const setMeta = (
      selector: string,
      attribute: "name" | "property",
      key: string,
      content: string,
    ) => {
      let node = document.querySelector<HTMLMetaElement>(selector);
      if (!node) {
        node = document.createElement("meta");
        node.setAttribute(attribute, key);
        document.head.append(node);
      }
      node.content = content;
    };
    setMeta('meta[name="description"]', "name", "description", metaDescription);
    setMeta(
      'meta[property="og:description"]',
      "property",
      "og:description",
      metaDescription,
    );
    setMeta(
      'meta[property="og:title"]',
      "property",
      "og:title",
      `${businessName} | Hair Spa & Scalp Wellness`,
    );
    return () => {
      document.title = previousTitle;
    };
  }, [businessName, metaDescription]);

  const contact = keshContactSummary(profile);
  const reduced = Boolean(reduceMotion);
  const canObserve = typeof IntersectionObserver !== "undefined";
  // Wait until the mobile drawer has released its body scroll lock before
  // scrolling; otherwise navigation can be swallowed by the locked page.
  useEffect(() => {
    if (menuOpen || !pendingScrollRef.current) return;
    const id = pendingScrollRef.current;
    pendingScrollRef.current = null;
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [menuOpen, reduced]);

  const scrollTo = (id: string) => {
    if (typeof document === "undefined") return;
    const target = document.getElementById(id);
    if (!target) return;
    if (menuOpen) {
      pendingScrollRef.current = id;
      setMenuOpen(false);
    } else {
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }
  };
  const goToGalleryImage = (index: number) => {
    const track = galleryTrackRef.current;
    const item = track?.children.item(index) as HTMLElement | null;
    if (track && item) {
      track.scrollTo({
        left: item.offsetLeft - track.offsetLeft,
        behavior: reduced ? "auto" : "smooth",
      });
    }
    setGalleryIndex(index);
  };
  const selectGalleryCategory = (category: string) => {
    setGalleryCategory(category);
    setActivePhoto(-1);
    setGalleryIndex(0);
    galleryTrackRef.current?.scrollTo({
      left: 0,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  const hero = keshHeroImage(profile);
  const firstService = services[0];
  const serviceCategories = keshServiceCategories(services);
  /* A stale filter must never hide the whole menu after the catalogue changes. */
  const activeServiceCategory =
    serviceCategory === "All" || serviceCategories.includes(serviceCategory)
      ? serviceCategory
      : "All";
  const packages = keshPackages(services);

  const displayImages = keshGallery(galleryPhotos).map((photo) => ({
    src: photo.url,
    alt: photo.title || `${photo.category} photo`,
    isDemo: photo.isDemo,
    caption: photo.title || "Sanctuary photo",
    category: photo.category,
  }));
  const shownGallery = displayImages.slice(0, 8);
  const galleryCategories = Array.from(
    new Set(shownGallery.map((image) => image.category)),
  );
  const activeGalleryCategory =
    galleryCategory === "All" || galleryCategories.includes(galleryCategory)
      ? galleryCategory
      : "All";
  const visibleGallery = shownGallery
    .map((image, index) => ({ image, index }))
    .filter(
      ({ image }) =>
        activeGalleryCategory === "All" ||
        image.category === activeGalleryCategory,
    );
  const galleryCategoryCount = (category: string) =>
    shownGallery.filter((image) => image.category === category).length;

  useEffect(() => {
    setGalleryIndex((current) =>
      Math.min(current, Math.max(0, visibleGallery.length - 1)),
    );
  }, [visibleGallery.length]);

  useEffect(() => {
    if (activePhoto < 0) return;
    const total = visibleGallery.length;
    if (!total) {
      setActivePhoto(-1);
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActivePhoto(-1);
      if (event.key === "ArrowRight") {
        setActivePhoto((current) => (current + 1) % total);
      }
      if (event.key === "ArrowLeft") {
        setActivePhoto((current) => (current - 1 + total) % total);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activePhoto, visibleGallery.length]);

  const hasTeam = stylists.length > 0;
  const hasGallery = shownGallery.length > 0;
  const hasContact = contact.hasAnyContact || contact.hours.length > 0;
  const bookable = bookingAvailable && services.length > 0;
  /**
   * Every "book" affordance goes through here. When the booking flow is not
   * available (template preview, unpublished site, empty menu) the visitor is
   * taken to a real contact/menu section instead of opening a hypothetical
   * basket with invented availability.
   */
  const book = (service?: SalonService, specialist?: Stylist) => {
    if (bookable) {
      onBook(service, specialist);
      return;
    }
    scrollTo(hasContact ? "contact" : services.length ? "treatments" : "home");
  };
  const realReviews = keshPublishedReviews(profile);
  const hasReviews = realReviews.length > 0;
  /**
   * Owner sections only render when the owner actually saved content for them.
   * WebsiteSections would otherwise print a "coming soon" placeholder, and this
   * page is not allowed to ship empty sections.
   */
  const ownerContent: Record<string, boolean> = {
    promo: promotionActive(profile.promoCampaign, promotionNow),
    videos: showcaseVideos(profile).some((video) => Boolean(reelSource(video))),
    loyalty: Boolean(
      shared.loyaltyConfig?.programEnabled &&
        shared.loyaltyConfig.rewards?.some((reward) => reward.isActive),
    ),
    policies: Boolean(
      shared.policies &&
        Object.values(shared.policies).some((value) =>
          String(value || "").trim(),
        ),
    ),
    // Social profiles are part of the footer and the booking section owns
    // booking, so neither is repeated as a full-width section here.
    social: false,
    bookings: false,
    share: true,
  };
  const ownerSections = enabledSections.filter(
    (section) => ownerContent[section] !== false,
  );
  const promotionSections = ownerSections.filter(
    (section) => section === "promo",
  );
  const videoSections = ownerSections.filter((section) => section === "videos");
  const closingSections = ownerSections.filter(
    (section) => section !== "promo" && section !== "videos",
  );
  const hasPoliciesSection = ownerSections.includes("policies");
  /* One navigation, one destination per section: no duplicated page links. */
  const pageLinks = (
    [
      ["Our Philosophy", "philosophy", true],
      ["Services", "treatments", true],
      ["Your Visit", "journey", true],
      ["Our Team", "team", hasTeam],
      ["The Sanctuary", "gallery", hasGallery],
      ["Reviews", "testimonials", hasReviews],
      ["Contact", "contact", hasContact],
    ] as Array<[string, string, boolean]>
  )
    .filter(([, , visible]) => visible)
    .map(([label, id]) => [label, id] as const);

  const pageModel = {
    profile,
    services,
    stylists,
    showPackages,
    customerSignedIn,
    customerName,
    customerPhotoUrl,
    bookingAvailable: bookable,
    book,
    onAccount,
    onMyBookings,
    onViewSpecialist,
    heroRef,
    menuButtonRef,
    mobileNavRef,
    menuOpen,
    setMenuOpen,
    scrolled,
    faqOpen,
    setFaqOpen,
    serviceCategory: activeServiceCategory,
    setServiceCategory,
    galleryCategory: activeGalleryCategory,
    activePhoto,
    setActivePhoto,
    galleryTrackRef,
    galleryIndex,
    setGalleryIndex,
    reduced,
    canObserve,
    parallaxY,
    heroImage: hero.src,
    heroIsOwnerPhoto: hero.isOwnerPhoto,
    phone: contact.phone,
    email: contact.email,
    wa: contact.whatsappUrl,
    address: contact.address,
    landmark: contact.landmark,
    openingHours: contact.hours,
    hasAnyContact: contact.hasAnyContact,
    mapHref: contact.mapsUrl,
    scrollTo,
    goToGalleryImage,
    selectGalleryCategory,
    galleryCategoryCount,
    firstService,
    packages,
    pageLinks,
    questions,
    hasPoliciesSection,
    realReviews,
    shownGallery,
    galleryCategories,
    visibleGallery,
    formatMoney,
  };

  return (
    <HairSpaContext.Provider value={pageModel}>
      <div className="kp-site" data-template="hair_spa">
        <a className="kp-skip-link" href="#kp-main-content">
          Skip to main content
        </a>
        <HairSpaHeader />
        <main id="kp-main-content" tabIndex={-1}>
          {/* 1 · Brand introduction and the two primary actions. */}
          <HeroSection />
          {/* Platform-level app announcement (not a brand section). */}
          <AppAnnouncementStrip />
          {/* 2 · Values, approach and the brand's point of view. */}
          <BrandPhilosophy />
          {/* 3 · The one service catalogue: signature index, menu, packages. */}
          <ServicesSection />
          {promotionSections.length > 0 && (
            <div className="kp-existing-sections kp-existing-promotion">
              <WebsiteSections {...shared} sections={promotionSections} />
            </div>
          )}
          {/* 4 · The four-step visit, with no treatment catalogue here. */}
          <ScalpCareJourney />
          <TeamSection />
          {/* 5 · Sanctuary photography; the only other place services appear
              is the menu above, so the gallery stays purely visual. */}
          <SanctuaryGallery />
          {videoSections.length > 0 && (
            <div className="kp-existing-sections kp-existing-videos">
              <WebsiteSections {...shared} sections={videoSections} />
            </div>
          )}
          {/* 6 · Genuine reviews only — the section is absent without them. */}
          <TestimonialsSection />
          {/* 7 · The single booking workflow every CTA points at. */}
          <BookingSection />
          <FAQSection />
          <ContactSection />
          {closingSections.length > 0 && (
            <div className="kp-existing-sections kp-existing-closing">
              <WebsiteSections {...shared} sections={closingSections} />
            </div>
          )}
          <CustomerAppPromotion />
        </main>
        <HairSpaFooter />
        <GalleryLightbox />
      </div>
    </HairSpaContext.Provider>
  );
}
