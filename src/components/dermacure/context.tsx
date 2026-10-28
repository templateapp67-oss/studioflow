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
  services,
  onBook,
  bookingAvailable,
  policies,
  onMyBookings,
  onAccount,
  customerSignedIn,
  shared,
}: {
  profile: SalonProfile;
  services: SalonService[];
  onBook: (service?: SalonService, details?: ConsultationDetails) => void;
  bookingAvailable: boolean;
  policies?: Record<string, string>;
  onMyBookings: () => void;
  onAccount: () => void;
  customerSignedIn?: boolean;
  shared: Parameters<typeof WebsiteSections>[0];
}) {
  const [hostOffset, setHostOffset] = useState(0);
  const [menu, setMenu] = useState(false),
    [scrolled, setScrolled] = useState(false),
    [small, setSmall] = useState(false),
    [selectedService, setSelectedService] = useState("");
  const hero = useRef<HTMLElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const mobileNav = useRef<HTMLElement>(null);
  const visible = websiteSections(profile);
  const comparisons = (profile.comparisonPhotos || []).filter(
    (item) =>
      item.consented &&
      secureMediaUrl(item.beforeUrl) &&
      secureMediaUrl(item.afterUrl),
  );
  const reviews = (profile.websiteTestimonials || []).filter(
    (item) => !item.isDemo && item.verified && item.comment?.trim(),
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
    ["Technology", "technology"],
    ...(visible.gallery ? [["Results", "results"]] : []),
    ...(visible.stylists ? [["Our Team", "salon-team"]] : []),
    ...(visible.gallery ? [["Gallery", "clinic-gallery"]] : []),
    ...(visible.location ? [["Contact", "contact"]] : []),
  ].filter(([, target]) => {
    const key = (
      {
        home: "home",
        about: "about",
        treatments: "services",
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
      menuTrigger.current?.focus();
    };
  }, [menu]);
  const [bookingNotice, setBookingNotice] = useState("");
  const booking = () => {
    if (bookingAvailable) {
      onBook();
      return;
    }
    const contact = document.getElementById("contact");
    if (contact) {
      contact.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      return;
    }
    setBookingNotice(
      "Online consultation booking is currently unavailable. Please try again later.",
    );
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
  const scrollTo = (target: string) => {
    if (typeof document === "undefined") return;
    if (menu) {
      pendingScroll.current = target;
      setMenu(false);
      return;
    }
    const find = () =>
      document.getElementById(target) ||
      document.querySelector<HTMLElement>(`[data-nav-target="${target}"]`);
    const followAnchor = () => {
      if (typeof location !== "undefined" && location.hash !== `#${target}`) {
        location.hash = `#${target}`;
      }
    };
    const reveal = (attempt: number): boolean => {
      const node = find();
      if (node) {
        node.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: "start",
        });
        return true;
      }
      if (attempt >= 2) {
        followAnchor();
        return false;
      }
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => reveal(attempt + 1));
        return true;
      }
      followAnchor();
      return false;
    };
    reveal(0);
  };
  useEffect(() => {
    if (menu || !pendingScroll.current) return;
    const target = pendingScroll.current;
    pendingScroll.current = null;
    const frame = requestAnimationFrame(() => {
      document.getElementById(target)?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [menu, reduced]);
  return {
    profile,
    services,
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
    booking,
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
