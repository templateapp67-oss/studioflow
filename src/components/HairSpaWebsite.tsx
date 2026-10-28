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
import { HairSpaFooter } from "./hair-spa/HairSpaFooter";
import { GalleryLightbox } from "./hair-spa/GalleryLightbox";

const heroImage =
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=2200&q=85";
const galleryImages = [
  {
    src: "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=1100&q=80",
    alt: "Quiet spa treatment room with warm natural light",
  },
  {
    src: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=900&q=80",
    alt: "Relaxing hair and scalp care ritual",
  },
  {
    src: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=900&q=80",
    alt: "Calm, softly lit wellness interior",
  },
  {
    src: "https://images.unsplash.com/photo-1512290900672-1f55b9e07506?auto=format&fit=crop&w=900&q=80",
    alt: "Botanical-inspired wellness details",
  },
];

const navLinks = [
  ["Our Philosophy", "philosophy"],
  ["Treatments", "treatments"],
  ["Scalp Care", "journey"],
  ["The Sanctuary", "sanctuary"],
  ["Gallery", "gallery"],
  ["Contact", "contact"],
] as const;

const questions = [
  [
    "Which treatment should I choose?",
    "Explore the treatment descriptions and choose what feels relevant to your hair or scalp concerns. If you are unsure, contact the team before selecting a ritual.",
  ],
  [
    "How long does a session take?",
    "Session lengths vary by service. Where a duration is listed, you will find it with that treatment; the team can help with any questions.",
  ],
  [
    "Do I need to book in advance?",
    "Send a booking enquiry using the treatment button. The team will follow up to discuss your preferred visit time.",
  ],
  [
    "Can I discuss my scalp concerns first?",
    "Yes. You can contact the spa using the details below to ask a question before choosing a service.",
  ],
  [
    "How should I prepare for my visit?",
    "No special preparation information is currently listed. Please contact the team if you would like guidance before your visit.",
  ],
  [
    "How can I contact the spa?",
    "Use the phone, WhatsApp or directions links shown in the contact section, when those details are available.",
  ],
] as const;

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

  useEffect(() => {
    if (typeof document === "undefined" || !document.head) return;
    document.title =
      "Kesh Prakriti Hair Spa & Scalp Sanctuary | Hair & Scalp Wellness";
    let description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.append(description);
    }
    description.content =
      "Discover Kesh Prakriti Hair Spa & Scalp Sanctuary, with thoughtful hair spa experiences, personalised scalp care and relaxing wellness rituals.";
    let ogDescription = document.querySelector<HTMLMetaElement>(
      'meta[property="og:description"]',
    );
    if (!ogDescription) {
      ogDescription = document.createElement("meta");
      ogDescription.setAttribute("property", "og:description");
      document.head.append(ogDescription);
    }
    ogDescription.content = description.content;
    let ogTitle = document.querySelector<HTMLMetaElement>(
      'meta[property="og:title"]',
    );
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.append(ogTitle);
    }
    ogTitle.content = document.title;
  }, []);

  const phone = profile.phone?.trim();
  const wa = profile.whatsapp?.replace(/\D/g, "");
  const address = [profile.address, profile.city, profile.postalCode]
    .filter(Boolean)
    .join(", ");
  const mapHref =
    profile.latitude && profile.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${profile.latitude},${profile.longitude}`
      : address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
        : "";
  const reduced = Boolean(reduceMotion);
  const canObserve = typeof IntersectionObserver !== "undefined";
  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };
  const goToGalleryImage = (index: number) => {
    const track = galleryTrackRef.current;
    const item = track?.children.item(index) as HTMLElement | null;
    if (track && item) {
      track.scrollTo({
        left: item.offsetLeft - track.offsetLeft,
        behavior: reduced ? "auto" : "smooth",
      });
      setGalleryIndex(index);
    }
  };
  const selectGalleryCategory = (category: string) => {
    setGalleryCategory(category);
    setGalleryIndex(0);
    galleryTrackRef.current?.scrollTo({
      left: 0,
      behavior: reduced ? "auto" : "smooth",
    });
  };
  const firstService = services[0];
  const featuredService =
    services.find((service) => service.popular) || firstService;
  const serviceCategories = Array.from(
    new Set(
      services
        .map((service) => service.category?.trim())
        .filter((category): category is string => Boolean(category)),
    ),
  );
  const packages = services.filter((service) =>
    /package|combo|bundle/i.test(
      `${service.category || ""} ${service.name || ""}`,
    ),
  );
  const pageLinks = stylists.length
    ? [
        ...navLinks.slice(0, 1),
        ...navLinks.slice(1, 2),
        ["Our Team", "team"] as const,
        ...navLinks.slice(2),
      ]
    : navLinks;
  const dockLinks = [
    [
      "Offers",
      enabledSections.includes("promo") ? "salon-promo" : "offers",
      true,
    ],
    ["Services", "treatments", true],
    ...(showPackages ? [["Packages", "salon-packages", true] as const] : []),
    ...(stylists.length ? [["Our Team", "team", true] as const] : []),
    ["Lookbook", "gallery", true],
    ["Reviews & experience", "experiences", true],
    ["Location", "contact", true],
  ].filter(([, , enabled]) => enabled) as [string, string, boolean][];
  const realReviews = (profile.websiteTestimonials || []).filter(
    (review) => !review.isDemo && Boolean(review.comment?.trim()),
  );
  const displayImages = galleryPhotos.length
    ? galleryPhotos.map((photo) => ({
        src: photo.url,
        alt: photo.title,
        isDemo: photo.isDemo,
        caption: photo.title,
        category: photo.category,
      }))
    : galleryImages.map((image) => ({
        ...image,
        isDemo: true,
        caption: "Demo / sample imagery",
        category: "Spa",
      }));
  const shownGallery = displayImages.slice(0, 5);
  const galleryCategories = Array.from(
    new Set(displayImages.map((image) => image.category)),
  );
  const visibleGallery = shownGallery
    .map((image, index) => ({ image, index }))
    .filter(
      ({ image }) =>
        galleryCategory === "All" || image.category === galleryCategory,
    );

  useEffect(() => {
    if (activePhoto < 0) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActivePhoto(-1);
      if (event.key === "ArrowRight") {
        setActivePhoto((current) => (current + 1) % shownGallery.length);
      }
      if (event.key === "ArrowLeft") {
        setActivePhoto(
          (current) =>
            (current - 1 + shownGallery.length) % shownGallery.length,
        );
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activePhoto, shownGallery.length]);

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
    serviceCategory,
    setServiceCategory,
    galleryCategory,
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
    heroImage,
    phone,
    wa,
    address,
    mapHref,
    scrollTo,
    goToGalleryImage,
    selectGalleryCategory,
    firstService,
    featuredService,
    serviceCategories,
    packages,
    pageLinks,
    navLinks,
    questions,
    galleryImages,
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
        <HairSpaHeader />
        <main>
          <HeroSection />
          <QuickNavigation />
          <BrandPhilosophy />
          <ServicesSection />
          <FeaturedRituals />
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
