import type { SocialVideo } from "../types";
import { ironInkPosterSrc, ironInkVideoLink } from "./ironInkSocial";

/**
 * Template 12 editorial media.
 *
 * These starter entries are illustrative poster topics generated for
 * StudioFlow. They are explicitly labelled as demo posters and are never
 * described as real client work. The owner can replace every title, caption,
 * poster and optional link in the Template 12 editor; when an owner adds real
 * reels through the existing Social & Videos flow those are rendered instead.
 */
export type IronInkMediaTopic = {
  id: string;
  title: string;
  caption: string;
  posterUrl: string;
  href?: string;
  isDemo?: boolean;
};

export const IRON_INK_MEDIA_TOPICS: IronInkMediaTopic[] = [
  {
    id: "ii-media-artist-process",
    title: "Inside a fine-line session",
    caption:
      "Needle, stretch and stillness — how a fine-line piece comes together, one pass at a time.",
    posterUrl: "/templates/12/media/artist-process.jpg",
    href: "",
    isDemo: true,
  },
  {
    id: "ii-media-healed-work",
    title: "Healed, not just fresh",
    caption:
      "Why healed work looks different from day one, and what changes across the first eight weeks.",
    posterUrl: "/templates/12/media/healed-work.jpg",
    href: "",
    isDemo: true,
  },
  {
    id: "ii-media-studio-practice",
    title: "The studio, before the doors open",
    caption:
      "Autoclave logs, single-use cartridges and the daily reset behind every appointment.",
    posterUrl: "/templates/12/media/studio-practice.jpg",
    href: "",
    isDemo: true,
  },
  {
    id: "ii-media-piercing-hygiene",
    title: "Piercing hygiene, step by step",
    caption:
      "Gloves, sterile jewellery and the aftercare conversation that follows every piercing.",
    posterUrl: "/templates/12/media/piercing-hygiene.jpg",
    href: "",
    isDemo: true,
  },
  {
    id: "ii-media-aftercare",
    title: "Aftercare, without the guesswork",
    caption:
      "Wash, dry, moisturise — and what to leave alone while fresh ink settles.",
    posterUrl: "/templates/12/media/aftercare.jpg",
    href: "",
    isDemo: true,
  },
  {
    id: "ii-media-custom-design",
    title: "From reference to stencil",
    caption:
      "How a reference image becomes a placement-ready custom design with your artist.",
    posterUrl: "/templates/12/media/custom-design.jpg",
    href: "",
    isDemo: true,
  },
];

export const IRON_INK_MEDIA_FALLBACK_POSTER =
  "/templates/12/media/studio-practice.jpg";

/** Merge owner edits over the starter topics without adding defaults the owner deleted. */
export function ironInkMediaTopics(
  saved?: IronInkMediaTopic[] | null,
): IronInkMediaTopic[] {
  // `undefined` means "use the starter examples"; an explicit empty array
  // means the owner removed every guide and must stay empty.
  if (!Array.isArray(saved)) {
    return IRON_INK_MEDIA_TOPICS.map((topic) => ({ ...topic }));
  }
  return saved
    .filter((topic) => topic && typeof topic.id === "string")
    .map((topic) => ({
      id: topic.id,
      title: String(topic.title || "").slice(0, 120),
      caption: String(topic.caption || "").slice(0, 400),
      // Keep the raw value for the owner editor. The storefront poster
      // component validates it and shows a labelled fallback if invalid.
      posterUrl: String(topic.posterUrl || "").slice(0, 1000),
      // Keep the raw value for the owner editor; the storefront validates it.
      href: String(topic.href || "").slice(0, 1000),
      isDemo: topic.isDemo !== false,
    }));
}

/**
 * Owner-added reels use the existing `profile.socialVideos` configuration.
 * Demo references from the shared template list are excluded here so a tattoo
 * studio never opens with beard, nail or facial clips.
 */
export function ironInkOwnerVideos(profile: {
  socialVideos?: SocialVideo[];
}): SocialVideo[] {
  return (profile.socialVideos || [])
    .filter((video) => !video.isDemo)
    .filter((video) => Boolean(ironInkVideoLink(video.youtubeUrl)))
    .map((video) => ({
      ...video,
      title: String(video.title || "").trim().slice(0, 120),
      description: String(video.description || "").trim().slice(0, 400),
      thumbnailUrl: ironInkPosterSrc(video.thumbnailUrl),
    }))
    .filter((video) => video.title);
}
