import { clinicPublicServices, clinicPriceIsVerified, clinicServiceIsPublished } from "../../lib/dermacureContent";
import { headerSettings } from "../../lib/headerNavigation";
import type { ConsultationDetails } from "./consultation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useReducedMotion, useScroll, useTransform } from "motion/react";
import type { SalonProfile, SalonService } from "../../types";
import { websiteSections } from "../../lib/websiteContent";
import { WebsiteSections } from "../WebsiteSections";
import { secureMediaUrl } from "../../lib/socialVideoSource";

export function useDermacureState({
  profile,
  services: allServices,
  onBook,
  bookingAvailable,
  policies,
  onMyBookings,
  onAccount,
  customerSignedIn,
  shared,
  hasTeam = false,
}: {
  profile: SalonProfile;
  services: SalonService[];
  onBook: (service?: SalonService, details?: ConsultationDetails) => void;
  bookingAvailable: boolean;
  policies?: Record<string, string>;
  onMyBookings: () => void;
  onAccount: () => void;
  customerSignedIn?: boolean;
  hasTeam?: boolean;
  shared: Parameters<typeof WebsiteSections>[0];
}) {
  const services = clinicPublicServices(profile, allServices);
  const [search, setSearch] = useState("");
  const [serviceCategory, setServiceCategory] = useState("All");
  const [hostOffset, setHostOffset] = useState(0);
  const [menu, setMenu] = useState(false),
    [scrolled, setScrolled] = useState(false),
    [small, setSmall] = useState(false),
    [selectedService, setSelectedService] = useState("");
  const hero = useRef<HTMLElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const mobileNav = useRef<HTMLElement>(null);
  /** Whether closing the drawer should hand focus back to the hamburger. */
  const restoreFocus = useRef(true);
  const [activeSection, setActiveSection] = useState("");
  const visible = websiteSections(profile);
  const comparisons = (profile.comparisonPhotos || []).filter(
    (item) =>
      item.consented &&
      secureMediaUrl(item.beforeUrl) &&
      secureMediaUrl(item.afterUrl),
  );
  const reviews = (profile.websiteTestimonials || []).filter(
    (item) => !item.isDemo && item.comment?.trim(),
  );
  const reduced = useReducedMotion();
  const canUseHeroScroll =
    typeof window !== "undefined" &&
    typeof IntersectionObserver !== "undefined";
  const { scrollYProgress } = useScroll({
    target: canUseHeroScroll ? hero : undefined,
    offset: ["start start", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    reduced || small || !canUseHeroScroll ? ["0%", "0%"] : ["0%", "12%"],
  );
  const address = [profile.address, profile.city, profile.postalCode]
    .filter(Boolean)
    .join(", ");
  const directions = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "";
  const menuSettings = headerSettings(profile);
  const canShowBookings =
    visible.bookings &&
    menuSettings.some((item) => item.id === "bookings" && item.enabled);
  const nav = [
    ["Home", "home"],
    ...(visible.about ? [["About", "about"]] : []),
    ...(visible.services && services.length
      ? [["Treatments", "treatments"]]
      : []),
    ...(visible.services ? [["Skin Treatments", "skin-treatments"], ["Hair Treatments", "hair-treatments"], ["Cosmetology Treatments", "cosmetology-treatments"]] : []),
    ["FAQ", "clinic-faq"],
    ["Blog", "clinic-blog"],
    ["Technology", "technology"],
    ...(visible.gallery ? [["Results", "results"]] : []),
    ...(visible.stylists && hasTeam ? [["Our Team", "salon-team"]] : []),
    ...(visible.gallery ? [["Gallery", "clinic-gallery"]] : []),
    ...(visible.location ? [["Contact", "contact"]] : []),
  ].filter(([, target]) => {
    const key = (
      {
        home: "home",
        about: "about",
        treatments: "services",
        "skin-treatments": "services",
        "hair-treatments": "services",
        "cosmetology-treatments": "services",
        results: "gallery",
        "clinic-gallery": "gallery",
        contact: "contact",
      } as Record<string, string>
    )[target];
    return !key || menuSettings.some((item) => item.id === key && item.enabled);
  });
  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 30);
      const toolbar = document.querySelector?.(
        "[data-template-preview-toolbar]",
      );
      setHostOffset(
        Math.max(0, toolbar?.getBoundingClientRect?.().bottom || 0),
      );
    };
    const media = window.matchMedia?.("(max-width: 760px)");
    const screen = () => setSmall(Boolean(media?.matches));
    update();
    screen();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    media?.addEventListener?.("change", screen);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      media?.removeEventListener?.("change", screen);
    };
  }, []);
  useEffect(() => {
    if (!document.head) return;
    const old = document.title;
    document.title =
      profile.seo?.metaTitle || `${profile.businessName} | Skin & Laser Care`;
    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const previous = meta?.content;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content =
      profile.seo?.metaDescription ||
      "Discover personalised dermatology, skin rejuvenation and laser care.";
    return () => {
      document.title = old;
      if (meta) {
        if (previous !== undefined) meta.content = previous;
        else meta.remove();
      }
    };
  }, [profile.businessName, profile.seo]);
  useEffect(() => {
    if (!document.head) return;
    const title =
      profile.seo?.ogTitle ||
      profile.seo?.metaTitle ||
      `${profile.businessName} | Skin & Laser Care`;
    const description =
      profile.seo?.ogDescription ||
      profile.seo?.metaDescription ||
      "Discover personalised dermatology, skin rejuvenation and laser care.";
    const values: Record<string, string> = {
      "og:title": title,
      "og:description": description,
      "og:type": "website",
    };
    if (profile.seo?.ogImageUrl) values["og:image"] = profile.seo.ogImageUrl;
    const changes = Object.entries(values).map(([property, content]) => {
      let el = document.querySelector<HTMLMetaElement>(
        `meta[property="${property}"]`,
      );
      const existed = !!el,
        old = el?.content;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.content = content;
      return { el, existed, old };
    });
    return () =>
      changes.forEach(({ el, existed, old }) => {
        if (existed) el.content = old || "";
        else el.remove();
      });
  }, [profile.businessName, profile.seo]);
  useEffect(() => {
    if (!menu) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileNav.current?.querySelector<HTMLElement>("a,button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        restoreFocus.current = true;
        setMenu(false);
        menuTrigger.current?.focus();
      }
      if (e.key === "Tab") {
        const nodes = Array.from(
          mobileNav.current?.querySelectorAll<HTMLElement>("a,button") || [],
        ) as HTMLElement[];
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault();
          nodes[nodes.length - 1]?.focus();
        } else if (
          !e.shiftKey &&
          document.activeElement === nodes[nodes.length - 1]
        ) {
          e.preventDefault();
          nodes[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = previousOverflow;
      /* Navigating to a section must not bounce focus back to the sticky
         header — only dialogs dismissal returns focus to the trigger. */
      if (restoreFocus.current) menuTrigger.current?.focus();
      restoreFocus.current = true;
    };
  }, [menu]);
  /* The drawer only exists below 1201px; a resize past that point must not
     leave an invisible panel (and a body scroll lock) behind. */
  useEffect(() => {
    if (!menu || typeof window === "undefined") return;
    const desktop = window.matchMedia?.("(min-width: 1201px)");
    if (!desktop?.matches) {
      const onChange = (event: MediaQueryListEvent) => {
        if (event.matches) {
          restoreFocus.current = false;
          setMenu(false);
        }
      };
      desktop?.addEventListener?.("change", onChange);
      return () => desktop?.removeEventListener?.("change", onChange);
    }
    restoreFocus.current = false;
    setMenu(false);
  }, [menu]);
  const [enquiryService, setEnquiryService] = useState<SalonService | null>(null);
  const [bookingNotice, setBookingNotice] = useState("");
  const enquire = (service?: SalonService) => {
    if (profile.subdomain && service && clinicServiceIsPublished(service) && !clinicPriceIsVerified(service)) { setEnquiryService(service); return; }
    const contact = document.getElementById("contact");
    if (contact) { contact.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }); return; }
    setBookingNotice("Contact the clinic for treatment and pricing details; contact information is not currently available here.");
  };
  const booking = () => {
    if (bookingAvailable) {
      onBook();
      return;
    }
    enquire();
  };
  const bookingLabel = bookingAvailable
    ? "Book Consultation"
    : "Contact the Clinic";
  /**
   * One navigation helper for every header, drawer and footer link.
   *
   * It scrolls immediately, retries on the next frame while a lazily mounted
   * section appears, and finally follows the native anchor — so a clinic
   * section that is hidden or absent never leaves a link that silently does
   * nothing. While the mobile drawer is open the scroll is queued until the
   * drawer has released its body scroll lock.
   */
  const pendingScroll = useRef<string | null>(null);
  /** Keep the address bar shareable without triggering the native jump. */
  const syncHash = (target: string) => {
    if (typeof history === "undefined" || typeof location === "undefined") return;
    if (location.hash === `#${target}`) return;
    try {
      const path = `${location.pathname || "/"}${location.search || ""}`;
      history.replaceState?.(null, "", `${path}#${target}`);
    } catch {
      /* A sandboxed frame may refuse history writes; scrolling still works. */
    }
  };
  const findTarget = (target: string) =>
    (typeof document.getElementById === "function"
      ? document.getElementById(target)
      : null) ||
    (typeof document.querySelector === "function"
      ? document.querySelector<HTMLElement>(`[data-nav-target="${target}"]`)
      : null);
  /** Move the caret/browse focus to the destination without re-scrolling. */
  const focusTarget = (node: HTMLElement | null) => {
    if (!node?.focus) return;
    if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "-1");
    try {
      node.focus({ preventScroll: true });
    } catch {
      /* Older engines ignore the options bag. */
    }
  };
  const scrollTo = (target: string) => {
    if (typeof document === "undefined") return;
    if (["skin-treatments", "hair-treatments", "cosmetology-treatments"].includes(target)) { setSearch(""); setServiceCategory("All"); }
    if (menu) {
      restoreFocus.current = false;
      pendingScroll.current = target;
      setMenu(false);
      return;
    }
    const reveal = (attempt: number): boolean => {
      const node = findTarget(target);
      if (node) {
        node.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: "start",
        });
        syncHash(target);
        focusTarget(node);
        return true;
      }
      if (attempt >= 2) {
        if (typeof location !== "undefined" && location.hash !== `#${target}`) {
          location.hash = `#${target}`;
        }
        return false;
      }
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => reveal(attempt + 1));
        return true;
      }
      return false;
    };
    reveal(0);
  };
  useEffect(() => {
    if (menu || !pendingScroll.current) return;
    const target = pendingScroll.current;
    pendingScroll.current = null;
    const frame = requestAnimationFrame(() => {
      const node = findTarget(target);
      node?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
      if (node) {
        syncHash(target);
        focusTarget(node);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [menu, reduced]);
  /* Deep links (`/#technology`) and browser back/forward must land on the
     same sections as the menu. The hash is read once after mount, because the
     React tree renders after the browser's first fragment jump. */
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const jump = (raw: string) => {
      const target = raw.replace(/^#/, "");
      if (!target) return;
      const node = findTarget(target);
      if (!node) return;
      node.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
      focusTarget(node);
    };
    if (typeof window.addEventListener !== "function") return;
    const initial = location.hash;
    const frame = initial
      ? requestAnimationFrame(() =>
          requestAnimationFrame(() => jump(initial)),
        )
      : 0;
    const onHashChange = () => jump(location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced]);
  /* Scroll spy: the header highlights the section the reader is inside. The
     measurement uses the live header height, so the sticky header and the
     preview toolbar offset are both accounted for. */
  const navSignature = nav.map(([, id]) => String(id)).join(",");
  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    if (typeof document.getElementById !== "function") return;
    if (typeof window.addEventListener !== "function") return;
    const ids = navSignature ? navSignature.split(",") : [];
    if (!ids.length) return;
    let frame = 0;
    const measure = () => {
      const header = document.querySelector<HTMLElement>(".dc-header");
      /* Sections land at their `scroll-margin-top` (host offset + 100px), so
         the active line sits just below that, but never under the header. */
      const headerBottom =
        hostOffset + (header?.getBoundingClientRect?.().height || 88);
      const line = Math.max(hostOffset + 112, headerBottom + 12);
      const doc = document.documentElement;
      let current = "";
      let best = -Infinity;
      for (const id of ids) {
        const rect = document
          .getElementById?.(id)
          ?.getBoundingClientRect?.();
        if (!rect) continue;
        if (rect.top <= line && rect.top > best) {
          best = rect.top;
          current = id;
        }
      }
      if ((window.scrollY || 0) <= 4) current = ids[0];
      const maxScroll =
        (doc?.scrollHeight || 0) - (window.innerHeight || 0);
      if (maxScroll > 0 && (window.scrollY || 0) >= maxScroll - 2) {
        current = ids[ids.length - 1];
      }
      setActiveSection((previous) => (previous === current ? previous : current));
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener?.("scroll", onScroll);
      window.removeEventListener?.("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [navSignature, hostOffset]);
  return {
    profile,
    services,
    hasTeam,
    search,
    setSearch,
    serviceCategory,
    setServiceCategory,
    onBook,
    bookingAvailable,
    policies,
    onMyBookings,
    onAccount,
    customerSignedIn,
    shared,
    menu,
    setMenu,
    scrolled,
    hostOffset,
    selectedService,
    setSelectedService,
    hero,
    menuTrigger,
    mobileNav,
    visible,
    comparisons,
    reviews,
    reduced,
    y,
    address,
    directions,
    nav,
    activeSection,
    booking,
    enquire,
    enquiryService,
    setEnquiryService,
    bookingLabel,
    scrollTo,
    bookingNotice,
    canShowBookings,
  };
}

type DermacureState = ReturnType<typeof useDermacureState>;
export const DermacureContext = createContext<DermacureState | null>(null);
export function useDermacure() {
  const context = useContext(DermacureContext);
  if (!context)
    throw new Error(
      "Dermacure sections must be rendered inside DermacureWebsite",
    );
  return context;
}
