import { createContext, useContext } from "react";
import type { RefObject, Dispatch, SetStateAction } from "react";
import type { MotionValue } from "motion/react";
import type { SalonProfile, SalonService, Stylist } from "../../types";

type NavLink = readonly [string, string];
type GalleryImage = {
  src: string;
  alt: string;
  isDemo?: boolean;
  caption: string;
  category?: string;
};

export interface HairSpaPageModel {
  profile: SalonProfile;
  services: SalonService[];
  stylists: Stylist[];
  showPackages: boolean;
  customerSignedIn?: boolean;
  customerName?: string;
  customerPhotoUrl?: string;
  /** Booking is only offered when a published menu and booking flow exist. */
  bookingAvailable: boolean;
  /** Books when possible, otherwise scrolls to a real contact/menu section. */
  book: (service?: SalonService, specialist?: Stylist) => void;
  onAccount: (mode?: "signin" | "signup") => void;
  onMyBookings: () => void;
  onViewSpecialist: (id: string) => void;
  heroRef: RefObject<HTMLElement | null>;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  mobileNavRef: RefObject<HTMLElement | null>;
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  scrolled: boolean;
  faqOpen: number | null;
  setFaqOpen: Dispatch<SetStateAction<number | null>>;
  serviceCategory: string;
  setServiceCategory: Dispatch<SetStateAction<string>>;
  galleryCategory: string;
  activePhoto: number;
  setActivePhoto: Dispatch<SetStateAction<number>>;
  galleryTrackRef: RefObject<HTMLDivElement | null>;
  galleryIndex: number;
  setGalleryIndex: Dispatch<SetStateAction<number>>;
  reduced: boolean;
  canObserve: boolean;
  parallaxY: MotionValue<string>;
  heroImage: string;
  heroIsOwnerPhoto: boolean;
  phone: string;
  email: string;
  wa: string;
  address: string;
  landmark: string;
  openingHours: Array<[string, string]>;
  hasAnyContact: boolean;
  mapHref: string;
  scrollTo: (id: string) => void;
  goToGalleryImage: (index: number) => void;
  selectGalleryCategory: (category: string) => void;
  galleryCategoryCount: (category: string) => number;
  firstService: SalonService | undefined;
  packages: SalonService[];
  pageLinks: readonly NavLink[];
  questions: readonly (readonly [string, string])[];
  /** True when the salon's saved policies render on this page. */
  hasPoliciesSection: boolean;
  realReviews: NonNullable<SalonProfile["websiteTestimonials"]>;
  shownGallery: GalleryImage[];
  galleryCategories: string[];
  visibleGallery: { image: GalleryImage; index: number }[];
  formatMoney: (price: number) => string;
}

export const HairSpaContext = createContext<HairSpaPageModel | null>(null);

export function useHairSpa(): HairSpaPageModel {
  const value = useContext(HairSpaContext);
  if (!value)
    throw new Error("Hair-spa section must be rendered inside HairSpaContext");
  return value;
}
