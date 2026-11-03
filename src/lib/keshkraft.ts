import type {
  SalonProfile,
  SalonService,
  Stylist,
  LoyaltyConfig,
} from "../types";
export const MENS_TEMPLATE_ID = "mens_hair_studio";
export const MENS_CATEGORIES = ["Men's Haircuts", "Men's Hair Colour"] as const;
export const MENS_HERO = "/templates/15/mens-hero-desktop.webp";
export const MENS_HERO_MOBILE = "/templates/15/mens-hero-mobile.webp";
export const MENS_INTERIOR = "/templates/15/mens-interior-wide.webp";
export const MENS_DESCRIPTION =
  "Expert men's haircuts and professional hair colour services. Choose your style and book your appointment online.";
export interface MensMedia {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  stylistId?: string;
  isAnimatedReference?: boolean;
  visible: boolean;
  maleOnlyReviewed: boolean;
  reviewedUrl?: string;
}
export interface MensReview {
  id: string;
  name: string;
  service: string;
  text: string;
  visible: boolean;
  isDemo: boolean;
}
export interface MensOffer {
  id: string;
  title: string;
  code: string;
  type: "percent" | "flat";
  discount: number;
  serviceIds: string[];
  active: boolean;
  approved: boolean;
  isDemo: boolean;
  from: string;
  to: string;
}
export interface MensConfig {
  heroHeading: string;
  heroDescription: string;
  haircutButton: string;
  stylesButton: string;
  colourButton: string;
  bronze: string;
  olive: string;
  background: string;
  font: string;
  logo: string;
  footer: string;
  gallery: MensMedia[];
  videos: MensMedia[];
  reviews: MensReview[];
  offers: MensOffer[];
  approvedImageUrls: string[];
  approvedStaffIds: string[];
  loyaltyName: string;
  hiddenSections: string[];
  holidays: string[];
  hours: { day: string; enabled: boolean; fromTime: string; toTime: string }[];
  breaks: { staffId: string; fromTime: string; toTime: string }[];
  leave: { staffId: string; from: string; to: string }[];
}
const cuts = [
  "Classic Men's Haircut",
  "Modern Men's Haircut",
  "Low Fade Haircut",
  "Mid Fade Haircut",
  "High Fade Haircut",
  "Skin Fade Haircut",
  "Taper Fade Haircut",
  "Crew Cut",
  "Buzz Cut",
  "Textured Crop",
  "French Crop",
  "Undercut",
  "Side Part Haircut",
  "Slick Back Haircut",
  "Pompadour Haircut",
  "Quiff Haircut",
  "Long Men's Haircut",
  "Medium Men's Haircut",
  "Scissor Cut",
  "Men's Hair Trim",
];
const colours = [
  "Men's Global Hair Colour",
  "Men's Grey Hair Coverage",
  "Men's Root Touch-Up",
  "Men's Hair Highlights",
  "Men's Fashion Hair Colour",
  "Men's Natural Black Colour",
  "Men's Brown Hair Colour",
  "Men's Ash Brown Colour",
  "Men's Burgundy Hair Colour",
  "Men's Hair Colour Consultation",
];
export const MENS_CUT_IMAGES = [
  "classic-mens-cut.webp", "modern-mens-cut.webp", "low-fade.webp", "mid-fade.webp", "high-fade.webp",
  "skin-fade.webp", "taper-fade.webp", "crew-cut.webp", "buzz-cut.webp", "textured-crop.webp",
  "french-crop.webp", "undercut.webp", "side-part.webp", "slick-back.webp", "pompadour.webp",
  "quiff.webp", "long-mens-cut.webp", "medium-mens-cut.webp", "scissor-cut.webp", "mens-hair-trim.webp",
].map(file => `/templates/15/${file}`);
export const MENS_SERVICES: SalonService[] = [...cuts, ...colours].map(
  (name, i) => ({
    id: `mens-${i + 1}`,
    name,
    category: MENS_CATEGORIES[i < 20 ? 0 : 1],
    price:
      i < 20
        ? [
            450, 650, 600, 600, 650, 750, 650, 400, 300, 650, 650, 700, 500,
            600, 850, 750, 900, 700, 650, 300,
          ][i]
        : [1800, 1100, 850, 2200, 2800, 1000, 1500, 1900, 2000, 300][i - 20],
    durationMinutes:
      i < 20
        ? i === 16
          ? 60
          : i === 8
            ? 20
            : 40
        : [90, 60, 45, 120, 150, 60, 90, 90, 90, 20][i - 20],
    description:
      i < 20
        ? `A personalised ${name.toLowerCase()} with careful shape, precision detailing and a finish suited to your hair texture.`
        : `Professional ${name.toLowerCase()} with shade advice and a natural-looking finish. Colour suitability and sensitivity checks before application.`,
    icon: "content_cut",
    origin: "template",
    imageUrl:
      i < 20
        ? MENS_CUT_IMAGES[i]
        : "/templates/15/colour.webp",
    mensTemplateId: MENS_TEMPLATE_ID,
  }),
);
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export const MENS_STAFF: Stylist[] = [
  "Arjun Rathore",
  "Kabir Mehta",
  "Dev Sharma",
].map((name, i) => ({
  id: `mens-barber-${i + 1}`,
  name,
  role: i === 1 ? "Men's Colour Expert" : "Men's Haircut Specialist",
  avatarUrl: [
    "/templates/15/barber-arjun.webp",
    "/templates/15/barber-kabir.webp",
    "/templates/15/barber-dev.webp",
  ][i],
  specialties:
    i === 1
      ? ["Men's Hair Colour", "Highlights", "Grey coverage"]
      : ["Precision fades", "Scissor cuts", "Men's Hair Colour"],
  rating: 0,
  experienceYears: [8, 10, 6][i],
  businessType: MENS_TEMPLATE_ID,
  status: "Available",
  assignedServices: MENS_SERVICES.map((s) => s.id),
  schedule: days.map((day) => ({
    day: day as NonNullable<Stylist["schedule"]>[number]["day"],
    enabled: day !== "Tuesday",
    fromTime: "10:00",
    toTime: "20:00",
  })),
  mensMaleOnly: true,
}));
export const MENS_LOYALTY: LoyaltyConfig = {
  programEnabled: true,
  pointsPerVisit: 0,
  pointsPerHundredSpent: 1,
  tierThresholds: { bronze: 0, silver: 100, gold: 200, platinum: 500 },
  tierMultipliers: { bronze: 1, silver: 1, gold: 1, platinum: 1 },
  rewards: [100, 200].map((points, i) => ({
    id: `mens-reward-${points}`,
    title: `₹${i ? 120 : 50} style reward`,
    requiredPoints: points,
    rewardType: "flat_discount",
    discountValue: i ? 120 : 50,
    applicableCategory: "All Services",
    description:
      "Eligible completed and paid men’s haircut or colour bookings only.",
    isActive: true,
    couponCodePrefix: `KESH${points}`,
  })),
};
export const MENS_DEFAULTS: MensConfig = {
  heroHeading: "Own Your Look. Own Your Style.",
  heroDescription: MENS_DESCRIPTION,
  haircutButton: "Book Your Haircut",
  stylesButton: "Explore Men's Styles",
  colourButton: "View Hair Colour",
  bronze: "#b08a61",
  olive: "#353d2c",
  background: "#161817",
  font: "Arial, sans-serif",
  logo: "",
  footer:
    "Crafted for the modern Indian man. Men’s haircuts & hair colour. Nothing else.",
  gallery: [
    ...cuts.filter((_, i) => ![0, 1, 11, 13, 17, 18, 19].includes(i)),
    ...colours.slice(1, 2),
    ...colours.slice(3, 5),
    ...colours.slice(6, 7),
  ].map((title, i) => ({
    id: `mens-gallery-${i + 1}`,
    stylistId: `mens-barber-${(i % 3) + 1}`,
    title,
    url:
      i === 0
        ? "/templates/15/fade.webp"
        : i === 12
          ? "/templates/15/long.webp"
          : i === 16
            ? "/templates/15/colour.webp"
            : `/templates/15/style-${i + 1}.svg`,
    visible: true,
    maleOnlyReviewed: true,
    reviewedUrl:
      i === 0
        ? "/templates/15/fade.webp"
        : i === 12
          ? "/templates/15/long.webp"
          : i === 16
            ? "/templates/15/colour.webp"
            : `/templates/15/style-${i + 1}.svg`,
  })),
  videos: [
    ...[
      ["fade", "Men's fade style preview"],
      ["colour", "Men's brown colour & highlights preview"],
      ["long", "Men's long hairstyle preview"],
    ].map(([asset, title]) => ({
      id: `mens-preview-${asset}`,
      title,
      url: `/templates/15/${asset}-preview.mp4`,
      thumbnail: `/templates/15/${asset}.webp`,
      visible: true,
      maleOnlyReviewed: true,
      reviewedUrl: `/templates/15/${asset}-preview.mp4`,
      isAnimatedReference: true,
    })),
    ...[
      "Men's haircut process",
      "Fade haircut process",
      "Taper haircut process",
      "Skin fade transformation",
      "Men's long hair cutting",
      "Men's short haircut",
      "Men's modern hairstyle",
      "Men's hair colour process",
      "Men's grey coverage",
      "Men's highlights",
      "Men's hair colour transformation",
      "Before-and-after men's hairstyle changes",
    ].map((title, i) => ({
      id: `mens-video-${i + 1}`,
      title,
      url: "",
      visible: false,
      maleOnlyReviewed: false,
    })),
  ],
  reviews: [
    [
      "Rohit S.",
      "Low Fade Haircut",
      "The fade was sharp and the shape stayed clean as it grew out.",
    ],
    [
      "Aman K.",
      "Modern Men's Haircut",
      "A modern cut that actually suits my hair texture.",
    ],
    [
      "Vikram P.",
      "Men's Grey Hair Coverage",
      "Natural-looking grey coverage, just the finish I wanted.",
    ],
    [
      "Nikhil R.",
      "Men's Hair Highlights",
      "Subtle highlights with great advice on choosing the shade.",
    ],
  ].map(([name, service, text], i) => ({
    id: `mens-review-${i}`,
    name,
    service,
    text,
    visible: true,
    isDemo: true,
  })),
  offers: [
    {
      id: "mens-offer-1",
      title: "Fresh Fade Offer",
      code: "FADE10",
      type: "percent",
      discount: 10,
      serviceIds: MENS_SERVICES.slice(2, 7).map((s) => s.id),
      active: true,
      approved: false,
      isDemo: true,
      from: "",
      to: "",
    },
    {
      id: "mens-offer-2",
      title: "Men's Hair Colour Special",
      code: "MENCOLOUR200",
      type: "flat",
      discount: 200,
      serviceIds: MENS_SERVICES.slice(20, 29).map((s) => s.id),
      active: true,
      approved: false,
      isDemo: true,
      from: "",
      to: "",
    },
    {
      id: "mens-offer-3",
      title: "New Look Offer",
      code: "NEWLOOK15",
      type: "percent",
      discount: 15,
      serviceIds: MENS_SERVICES.slice(0, 2).map((s) => s.id),
      active: true,
      approved: false,
      isDemo: true,
      from: "",
      to: "",
    },
  ],
  approvedImageUrls: [],
  approvedStaffIds: [],
  loyaltyName: "KeshKraft Men's Style Rewards",
  hiddenSections: [],
  holidays: [],
  hours: days.map((day) => ({
    day,
    enabled: day !== "Tuesday",
    fromTime: "10:00",
    toTime: "20:00",
  })),
  breaks: [],
  leave: [],
};
export function mensConfig(
  profile: Pick<SalonProfile, "mensStudio">,
): MensConfig {
  const raw = profile.mensStudio;
  return {
    ...MENS_DEFAULTS,
    ...raw,
    ...Object.fromEntries(
      [
        "gallery",
        "videos",
        "reviews",
        "offers",
        "approvedImageUrls",
        "approvedStaffIds",
        "hiddenSections",
        "holidays",
        "hours",
        "breaks",
        "leave",
      ].map((k) => [k, Array.isArray(raw?.[k]) ? raw[k] : MENS_DEFAULTS[k]]),
    ),
  };
}
const forbidden =
  /women|woman|female|unisex|kids?|child|beard|shav|facial|spa\b|treatment|scalp massage|makeup|bridal|nail|wax|skin care/i;
export function mensServices(services: SalonService[]): SalonService[] {
  return services.filter(
    (s) =>
      !s.mensHidden &&
      (MENS_CATEGORIES as readonly string[]).includes(s.category) &&
      s.mensTemplateId === MENS_TEMPLATE_ID &&
      !forbidden.test(`${s.name} ${s.description}`) &&
      s.price !== null &&
      s.price >= 0 &&
      s.durationMinutes > 0,
  );
}
export function mensStaff(staff: Stylist[], config: MensConfig): Stylist[] {
  return staff.filter(
    (s) =>
      s.businessType === MENS_TEMPLATE_ID &&
      (s.mensMaleOnly === true || config.approvedStaffIds.includes(s.id)) &&
      s.status !== "Inactive" &&
      !forbidden.test(`${s.role} ${s.specialties.join(" ")}`),
  );
}
const bundled = new Set([
  MENS_HERO,
  MENS_HERO_MOBILE,
  MENS_INTERIOR,
  ...MENS_CUT_IMAGES,
  "/templates/15/hero.webp",
  "/templates/15/fade.webp",
  "/templates/15/colour.webp",
  "/templates/15/long.webp",
  ...MENS_STAFF.map((s) => s.avatarUrl),
  ...MENS_DEFAULTS.gallery.map((s) => s.url),
  "/templates/15/placeholder.svg",
]);
export function mensImage(
  url: string | undefined,
  config: MensConfig,
  fallback = "/templates/15/placeholder.svg",
): string {
  if (!url) return fallback;
  return bundled.has(url) ||
    (config.approvedImageUrls.includes(url) && /^https:\/\//.test(url))
    ? url
    : fallback;
}
export function mensMediaVisible(item: MensMedia): boolean {
  return (
    item.visible &&
    item.maleOnlyReviewed &&
    item.reviewedUrl === item.url &&
    !!item.url
  );
}
export function mensPublicOffers(
  config: MensConfig,
  live: boolean,
  now = new Date().toISOString().slice(0, 10),
) {
  return config.offers.filter(
    (o) =>
      o.active &&
      (!live || o.approved) &&
      (!o.from || o.from <= now) &&
      (!o.to || o.to >= now),
  );
}
