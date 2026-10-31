import { secureMediaUrl } from "./socialVideoSource";

/**
 * Template 07 — Dermacure Aesthetic Dermatology & Laser Clinic
 * (`skincare_clinic`).
 *
 * Everything the clinic page shows that is *not* the owner's own data lives
 * here: the bundled reference photographs, the sample clinic gallery and the
 * demo portraits for the three clinicians the template ships with.
 *
 * Nothing here reaches the network. Every path is served from this repository
 * (`public/templates/dermacure/`), and the UI labels each one "Demo / sample"
 * until the clinic saves a photograph of its own.
 */
export const DERMACURE_IMAGES = {
  hero: "/templates/dermacure/hero.webp",
  heroWide: "/templates/dermacure/hero-wide.webp",
  clinic: "/templates/dermacure/clinic.webp",
  treatment: "/templates/dermacure/treatment.webp",
  technology: "/templates/dermacure/technology.webp",
  personalised: "/templates/dermacure/personalised.webp",
  consultation: "/templates/dermacure/reference-consultation.webp",
  interior: "/templates/dermacure/reference-interior.webp",
  led: "/templates/dermacure/reference-led.webp",
  rejuvenation: "/templates/dermacure/reference-rejuvenation.webp",
  hydration: "/templates/dermacure/service-hydration.webp",
  laser: "/templates/dermacure/service-laser.webp",
  peel: "/templates/dermacure/service-peel.webp",
  brandMark: "/templates/dermacure/brand-mark.svg",
  neutral: "/templates/dermacure/care-neutral.svg",
} as const;

/** A path inside the bundled template folder. */
const BUNDLED = /^\/templates\/dermacure\/[\w-]+\.(webp|jpg|jpeg|png|svg)$/i;

/** A saved photo (absolute https) or a bundled reference photograph. */
export function safeClinicUrl(raw?: string): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (BUNDLED.test(value)) return value;
  return secureMediaUrl(value);
}

export function isBundledClinicPhoto(url: string): boolean {
  return BUNDLED.test(String(url || "").trim());
}

/** One portfolio-style gallery entry. */
export type ClinicGalleryEntry = {
  id: string;
  category: "Clinic" | "Treatments" | "Technology";
  url: string;
  title: string;
  /** True for bundled reference photography, never for the clinic's own. */
  isDemo: boolean;
};

/**
 * Bundled reference gallery. It is only used when the clinic has not saved any
 * photographs of its own, and every entry is rendered with a "Demo / sample"
 * label — the page never pretends these are the clinic's real rooms.
 */
export const DERMACURE_SAMPLE_GALLERY: ClinicGalleryEntry[] = [
  {
    id: "dc-sample-1",
    category: "Clinic",
    url: DERMACURE_IMAGES.clinic,
    title: "Reception and waiting lounge",
    isDemo: true,
  },
  {
    id: "dc-sample-2",
    category: "Treatments",
    url: DERMACURE_IMAGES.treatment,
    title: "Treatment room set for a facial",
    isDemo: true,
  },
  {
    id: "dc-sample-3",
    category: "Clinic",
    url: DERMACURE_IMAGES.interior,
    title: "Consultation room",
    isDemo: true,
  },
  {
    id: "dc-sample-4",
    category: "Treatments",
    url: DERMACURE_IMAGES.hydration,
    title: "Hydra-infusion in progress",
    isDemo: true,
  },
  {
    id: "dc-sample-5",
    category: "Technology",
    url: DERMACURE_IMAGES.laser,
    title: "Laser toning equipment",
    isDemo: true,
  },
  {
    id: "dc-sample-6",
    category: "Technology",
    url: DERMACURE_IMAGES.led,
    title: "LED phototherapy session",
    isDemo: true,
  },
  {
    id: "dc-sample-7",
    category: "Treatments",
    url: DERMACURE_IMAGES.peel,
    title: "Chemical peel preparation",
    isDemo: true,
  },
  {
    id: "dc-sample-8",
    category: "Technology",
    url: DERMACURE_IMAGES.rejuvenation,
    title: "Skin rejuvenation consult",
    isDemo: true,
  },
];

/**
 * Called only when the clinic has published no photographs of its own, so the
 * gallery is never an empty block on the bundled template.
 */
export function clinicGalleryEntries(
  photos: Array<{ id?: string; category?: string; url?: string; title?: string; isDemo?: boolean }> = [],
): ClinicGalleryEntry[] {
  const seen = new Set<string>();
  const saved = photos
    .filter((photo) => {
      if (!photo || photo.isDemo) return false;
      const url = safeClinicUrl(photo.url);
      if (!url || !photo.id || seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .map((photo) => ({
      id: String(photo.id),
      category: (photo.category || "Clinic") as ClinicGalleryEntry["category"],
      url: safeClinicUrl(photo.url),
      title: String(photo.title || photo.category || "Clinic photo"),
      isDemo: false,
    }));
  return saved.length ? saved : DERMACURE_SAMPLE_GALLERY;
}

/**
 * Bundled portraits for the template's clinicians. Used only when a staff
 * record has no photo of its own, so the team section never shows three empty
 * initial tiles on the demo site.
 */
export const DERMACURE_TEAM_PORTRAITS: Record<string, string> = {
  "tanvi deshmukh": "/templates/dermacure/team-tanvi.jpg",
  "sameer gill": "/templates/dermacure/team-sameer.jpg",
  "neha saxena": "/templates/dermacure/team-neha.jpg",
};

const nameKey = (name?: string) =>
  String(name || "")
    .toLowerCase()
    .replace(/^(dr|mr|mrs|ms)\.?\s+/, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Resolve one portrait: the clinic's saved photo, then a bundled demo portrait
 * for a known clinician, then nothing (the section draws a labelled initial).
 */
export function dermacureTeamPortrait(person: {
  name?: string;
  avatarUrl?: string;
}): { src: string; isDemo: boolean } {
  const url = safeClinicUrl(person?.avatarUrl);
  if (url) return { src: url, isDemo: isBundledClinicPhoto(url) };
  const bundled = DERMACURE_TEAM_PORTRAITS[nameKey(person?.name)];
  return bundled ? { src: bundled, isDemo: true } : { src: "", isDemo: false };
}
