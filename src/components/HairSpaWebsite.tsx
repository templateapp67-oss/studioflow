import { useEffect, useRef, useState } from "react";
import { useReducedMotion, useScroll, useTransform } from "motion/react";
import type { SalonProfile, SalonService, Stylist } from "../types";
import type { SalonGalleryPhoto } from "../lib/photoGallery";
import { WebsiteSections } from "./WebsiteSections";
import { CustomerAppPromotion } from "./CustomerAppPromotion";
import { HairSpaContext } from "./hair-spa/context";
import { HairSpaHeader } from "./hair-spa/HairSpaHeader";
import { HeroSection } from "./hair-spa/HeroSection";
import { QuickNavigation } from "./hair-spa/QuickNavigation";
import { BrandPhilosophy } from "./hair-spa/BrandPhilosophy";
import { ServicesSection } from "./hair-spa/ServicesSection";
import { FeaturedRituals } from "./hair-spa/FeaturedRituals";
import { ScalpCareJourney } from "./hair-spa/ScalpCareJourney";
import { TeamSection } from "./hair-spa/TeamSection";
import { BotanicalIngredients } from "./hair-spa/BotanicalIngredients";
import { SanctuarySection } from "./hair-spa/SanctuarySection";
import { ExperienceSection } from "./hair-spa/ExperienceSection";
import { SanctuaryGallery } from "./hair-spa/SanctuaryGallery";
import { BookingSection } from "./hair-spa/BookingSection";
import { FAQSection } from "./hair-spa/FAQSection";
import { ContactSection } from "./hair-spa/ContactSection";
import { OffersSection } from "./hair-spa/OffersSection";
import { HairSpaFooter } from "./hair-spa/HairSpaFooter";
import { GalleryLightbox } from "./hair-spa/GalleryLightbox";
import {
  KESH_PRAKRITI_FAQ,
  KESH_PRAKRITI_IMAGES,
  keshContactSummary,
  keshGallery,
  keshHeroImage,
  keshPackages,
  keshPublishedReviews,
  keshServiceCategories,
} from "../lib/keshPrakriti";

const navLinks = [
  ["Our Philosophy", "philosophy"],
  ["Treatments", "treatments"],
  ["Scalp Care", "journey"],
  ["The Sanctuary", "sanctuary"],
  ["Gallery", "gallery"],
  ["Contact", "contact"],
] as const;

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
        menuButtonRef.current?.focus();
      }
    };
  }, [menuOpen]);

  const businessName = profile.businessName?.trim() || "Hair Spa & Scalp Sanctuary";
  const metaDescription = `Explore ${businessName} — treatments, prices, opening hours and online booking for hair spa and scalp care.`;
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
  /**
   * Anchors always resolve: a link scrolls to its section only when that
   * section is actually rendered, otherwise the click is a no-op instead of a
   * dead `#hash`.
   */
  const scrollTo = (id: string) => {
    setMenuOpen(false);
    if (typeof document === "undefined") return;
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
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
    setGalleryIndex(0);
    galleryTrackRef.current?.scrollTo({
      left: 0,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  const hero = keshHeroImage(profile);
  const firstService = services[0];
  const featuredService =
    services.find((service) => service.popular) || firstService;
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

  const hasPromo = enabledSections.includes("promo");
  const hasTeam = stylists.length > 0;
  const hasGallery = visibleGallery.length > 0;
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
  const pageLinks = (
    [
      ["Our Philosophy", "philosophy", true],
      ["Treatments", "treatments", services.length > 0],
      ["Scalp Care", "journey", true],
      ["Our Team", "team", hasTeam],
      ["The Sanctuary", "sanctuary", true],
      ["Gallery", "gallery", hasGallery],
      ["Contact", "contact", hasContact],
    ] as Array<[string, string, boolean]>
  )
    .filter(([, , visible]) => visible)
    .map(([label, id]) => [label, id] as const);
  const dockLinks = (
    [
      // Offers always resolves: the promo block when a campaign is live, or the
      // "no promotion is running" strip that renders in its place.
      ["Offers", hasPromo ? "salon-promo" : "offers", true],
      ["Services", "treatments", services.length > 0],
      ["Packages", "salon-packages", showPackages && packages.length > 0],
      ["Our Team", "team", hasTeam],
      ["Lookbook", "gallery", hasGallery],
      // The experiences section always renders (real reviews or an honest empty
      // state), so this anchor is always valid.
      ["Reviews & experience", "experiences", true],
      ["Location", "contact", hasContact],
    ] as Array<[string, string, boolean]>
  )
    .filter(([, , visible]) => visible)
    .map(([label, id]) => [label, id, true] as [string, string, boolean]);

  const realReviews = keshPublishedReviews(profile);

  const pageModel = {
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
    bookingAvailable: bookable,
    book,
    onBook,
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
    setGalleryCategory,
    activePhoto,
    setActivePhoto,
    galleryTrackRef,
    galleryIndex,
    setGalleryIndex,
    reduceMotion,
    reduced,
    canObserve,
    parallaxY,
    heroImage: hero.src,
    heroIsOwnerPhoto: hero.isOwnerPhoto,
    heroFallbackImage: KESH_PRAKRITI_IMAGES.hero,
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
    featuredService,
    serviceCategories,
    packages,
    pageLinks,
    navLinks,
    questions,
    dockLinks,
    realReviews,
    displayImages,
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
          <HeroSection />
          <QuickNavigation />
          <BrandPhilosophy />
          <ServicesSection />
          <FeaturedRituals />
          <OffersSection />
          <ScalpCareJourney />
          <TeamSection />
          <BotanicalIngredients />
          <SanctuarySection />
          <ExperienceSection />
          <SanctuaryGallery />
          <BookingSection />
          <FAQSection />
          <ContactSection />
          {enabledSections.length > 0 && (
            <section className="kp-existing-sections">
              <WebsiteSections {...shared} sections={enabledSections} />
            </section>
          )}
          <CustomerAppPromotion />
        </main>
        <HairSpaFooter />
        <GalleryLightbox />
      </div>
    </HairSpaContext.Provider>
  );
}
