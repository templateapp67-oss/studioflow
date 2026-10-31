/**
 * Template 12 · Iron & Ink — social video link parsing.
 *
 * Owner-supplied URLs are never trusted or injected as HTML. A URL is accepted
 * only when its hostname is in the allow-list below; the canonical link, embed
 * URL and thumbnail are then rebuilt from the parsed platform + id and
 * percent-encoded. Anything else returns `null` and the UI refuses the value.
 */
export type SocialVideoPlatform = "youtube" | "instagram" | "facebook";

export type ParsedSocialVideo = {
  platform: SocialVideoPlatform;
  videoId: string;
  /** Rebuilt https URL — safe to render as a href. */
  canonicalUrl: string;
  /** Rebuilt embed URL — safe to render in an iframe src. */
  embedUrl: string;
  /** Preview thumbnail (YouTube only); empty for Instagram/Facebook. */
  thumbnailUrl: string;
};

export const SOCIAL_VIDEO_PLATFORM_LABEL: Record<SocialVideoPlatform, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  facebook: "Facebook",
};

const YOUTUBE_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
];
const INSTAGRAM_HOSTS = ["instagram.com", "www.instagram.com", "m.instagram.com"];
const FACEBOOK_HOSTS = [
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "fb.watch",
  "www.fb.watch",
];

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const INSTAGRAM_ID = /^[A-Za-z0-9_-]{5,40}$/;
const FACEBOOK_NUMERIC_ID = /^[0-9]{6,30}$/;
const FACEBOOK_SHORT_CODE = /^[A-Za-z0-9_-]{3,40}$/;

export function isAllowedSocialVideoHost(
  hostname: string,
  platform: SocialVideoPlatform,
): boolean {
  const host = hostname.toLowerCase();
  const allowed =
    platform === "youtube"
      ? YOUTUBE_HOSTS
      : platform === "instagram"
        ? INSTAGRAM_HOSTS
        : FACEBOOK_HOSTS;
  return allowed.includes(host);
}

function youtubeEmbed(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1&playsinline=1&autoplay=1`;
}

function parseYouTube(url: URL): ParsedSocialVideo | null {
  const host = url.hostname.toLowerCase();
  let id = "";
  let isShort = false;
  if (host === "youtu.be") {
    id = url.pathname.split("/").filter(Boolean)[0] || "";
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v") || "";
  } else {
    const match = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/i);
    id = match?.[1] || "";
    isShort = /^\/shorts\//i.test(url.pathname);
  }
  if (!YOUTUBE_ID.test(id)) return null;
  return {
    platform: "youtube",
    videoId: id,
    canonicalUrl: isShort
      ? `https://www.youtube.com/shorts/${id}`
      : `https://www.youtube.com/watch?v=${id}`,
    embedUrl: youtubeEmbed(id),
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

function parseInstagram(url: URL): ParsedSocialVideo | null {
  const match = url.pathname.match(/^\/(reel|reels|p|tv)\/([^/?#]+)/i);
  if (!match) return null;
  const kind = match[1].toLowerCase() === "reels" ? "reel" : match[1].toLowerCase();
  const code = match[2];
  if (!INSTAGRAM_ID.test(code)) return null;
  const canonicalUrl = `https://www.instagram.com/${kind}/${code}/`;
  return {
    platform: "instagram",
    videoId: code,
    canonicalUrl,
    embedUrl: `https://www.instagram.com/${kind}/${encodeURIComponent(code)}/embed`,
    thumbnailUrl: "",
  };
}

function parseFacebook(url: URL): ParsedSocialVideo | null {
  const host = url.hostname.toLowerCase();
  let id = "";
  let canonicalUrl = "";
  if (host === "fb.watch" || host === "www.fb.watch") {
    id = url.pathname.split("/").filter(Boolean)[0] || "";
    if (!FACEBOOK_SHORT_CODE.test(id)) return null;
    canonicalUrl = `https://fb.watch/${id}/`;
  } else {
    const reel = url.pathname.match(/^\/reel\/([0-9]+)/i);
    const video = url.pathname.match(/\/videos\/(?:[^/]+\/)?([0-9]+)/i);
    const watchParam = url.pathname.startsWith("/watch")
      ? url.searchParams.get("v") || ""
      : "";
    const share = url.pathname.match(/^\/share\/[rv]\/([A-Za-z0-9_-]{3,40})/i);
    if (reel) {
      id = reel[1];
      canonicalUrl = `https://www.facebook.com/reel/${id}`;
    } else if (video) {
      id = video[1];
      canonicalUrl = `https://www.facebook.com/videos/${id}`;
    } else if (watchParam) {
      id = watchParam;
      canonicalUrl = `https://www.facebook.com/watch/?v=${id}`;
    } else if (share) {
      id = share[1];
      canonicalUrl = `https://www.facebook.com/share/v/${id}/`;
    }
    if (
      !id ||
      !(FACEBOOK_NUMERIC_ID.test(id) || FACEBOOK_SHORT_CODE.test(id))
    ) {
      return null;
    }
  }
  return {
    platform: "facebook",
    videoId: id,
    canonicalUrl,
    embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
      canonicalUrl,
    )}&show_text=false&width=560&height=996&t=0`,
    thumbnailUrl: "",
  };
}

/**
 * Detect + validate an owner-pasted video URL.
 * Returns null for empty input, non-https protocols, look-alike hosts
 * (`youtube.com.evil.test`), unsupported paths and malformed ids.
 */
export function parseSocialVideo(raw: string | undefined | null): ParsedSocialVideo | null {
  const value = String(raw || "").trim();
  if (!value || value.length > 500) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (isAllowedSocialVideoHost(host, "youtube")) return parseYouTube(url);
  if (isAllowedSocialVideoHost(host, "instagram")) return parseInstagram(url);
  if (isAllowedSocialVideoHost(host, "facebook")) return parseFacebook(url);
  return null;
}

export function socialVideoPlatformHint(): string {
  return "Paste a YouTube Shorts/video, Instagram Reel or Facebook Reel/video link.";
}

/**
 * Sample videos used only when a salon has published none yet.
 * They are clearly labelled as samples in the UI, use local poster images and
 * only load a YouTube embed after the visitor taps a card.
 */
export type SocialVideoSample = {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
};

export const socialVideoSamples: SocialVideoSample[] = [
  {
    id: "ii-sample-1",
    title: "Fine-line florals, start to finish",
    url: "https://www.youtube.com/shorts/jNQXAC9IVRw",
    thumbnailUrl: "/templates/12/media/artist-process.jpg",
  },
  {
    id: "ii-sample-2",
    title: "Healed blackwork, eight weeks later",
    url: "https://www.youtube.com/shorts/aqz-KE-bpKQ",
    thumbnailUrl: "/templates/12/media/healed-work.jpg",
  },
  {
    id: "ii-sample-3",
    title: "Inside the studio before doors open",
    url: "https://www.youtube.com/shorts/M7lc1UVf-VE",
    thumbnailUrl: "/templates/12/media/studio-practice.jpg",
  },
];
