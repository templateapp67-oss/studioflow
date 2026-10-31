import type { SalonProfile } from "../types";

/**
 * Template 12 social profile helpers.
 *
 * The studio profile may hold either a bare handle (`@ironandink.delhi`) or a
 * full profile URL. These helpers normalise both into one safe, https-only
 * link. They never invent a handle: when a value cannot be validated the
 * platform is treated as unconfigured and the card is hidden.
 */
export type IronInkSocialPlatform = "instagram" | "facebook" | "youtube";

export type IronInkSocialLink = {
  platform: IronInkSocialPlatform;
  label: string;
  url: string;
  handle: string;
  description: string;
};

type PlatformConfig = {
  label: string;
  hosts: string[];
  base: string;
  description: string;
};

const PLATFORMS: Record<IronInkSocialPlatform, PlatformConfig> = {
  instagram: {
    label: "Instagram",
    hosts: ["instagram.com"],
    base: "https://www.instagram.com/",
    description: "Fresh work, healed pieces and studio stories.",
  },
  facebook: {
    label: "Facebook",
    hosts: ["facebook.com", "fb.com"],
    base: "https://www.facebook.com/",
    description: "Studio updates, events and open flash days.",
  },
  youtube: {
    label: "YouTube",
    hosts: ["youtube.com"],
    base: "https://www.youtube.com/",
    description: "Process films, aftercare walkthroughs and artist talks.",
  },
};

const HANDLE_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,58}[A-Za-z0-9_])?$/;

function normaliseHandle(value: string): string {
  const handle = value.trim().replace(/^@+/, "").replace(/\/+$/, "");
  return handle && HANDLE_PATTERN.test(handle) ? `@${handle}` : "";
}

function handleFromPath(
  platform: IronInkSocialPlatform,
  pathname: string,
): string {
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return "";
      }
    });

  if (platform === "instagram") {
    const first = segments[0] || "";
    if (!first || ["p", "reel", "reels", "tv", "stories", "explore"].includes(first)) {
      return "";
    }
    return normaliseHandle(first);
  }

  if (platform === "facebook") {
    const first = segments[0] || "";
    if (!first) return "";
    if (first === "pages") return normaliseHandle(segments[1] || "");
    if (["profile.php", "people", "groups", "watch", "events"].includes(first)) {
      return "";
    }
    return normaliseHandle(first);
  }

  const first = segments[0] || "";
  if (!first) return "";
  if (first.startsWith("@")) return normaliseHandle(first);
  if (["watch", "shorts", "embed", "playlist", "results", "feed"].includes(first)) {
    return "";
  }
  if (first === "channel") return "YouTube channel";
  if (first === "c" || first === "user") {
    const handle = normaliseHandle(segments[1] || "");
    return handle || "YouTube channel";
  }
  return normaliseHandle(first);
}

/**
 * Validate one platform value. Returns `null` when nothing safe can be built,
 * which lets both the storefront and the owner editor hide the link.
 */
export function ironInkSocialLink(
  platform: IronInkSocialPlatform,
  rawValue: string | undefined,
): IronInkSocialLink | null {
  const raw = (rawValue || "").trim();
  if (!raw || raw.length > 300) return null;
  const config = PLATFORMS[platform];

  if (/^https?:\/\//i.test(raw)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return null;
    }
    if (!["https:", "http:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    if (url.port) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
    if (!config.hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
      return null;
    }
    url.protocol = "https:";
    const handle = handleFromPath(platform, url.pathname);
    // A bare platform homepage (or a video/short URL) is not a studio profile.
    if (!handle) return null;
    return {
      platform,
      label: config.label,
      url: url.href,
      handle: handle || config.label,
      description: config.description,
    };
  }

  // A bare handle must not smuggle in a path, scheme, query or whitespace.
  if (/[\/\\:?#\s]/.test(raw)) return null;
  const handle = normaliseHandle(raw);
  if (!handle) return null;
  const path =
    platform === "youtube" ? `@${handle.slice(1)}` : handle.slice(1);
  return {
    platform,
    label: config.label,
    url: `${config.base}${path}`,
    handle,
    description: config.description,
  };
}

/** Configured social profiles in display order. Unconfigured platforms are omitted. */
export function ironInkSocialLinks(profile: SalonProfile): IronInkSocialLink[] {
  return [
    ironInkSocialLink("instagram", profile.instagramHandle),
    ironInkSocialLink("facebook", profile.facebookPage),
    ironInkSocialLink("youtube", profile.youtubeChannel),
  ].filter((link): link is IronInkSocialLink => Boolean(link));
}

/** Reject anything that is not a safe https URL (used for owner-supplied video links). */
export function ironInkHttpsUrl(rawValue: string | undefined): string {
  const raw = (rawValue || "").trim();
  if (!raw || raw.length > 500) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return "";
    if (url.username || url.password) return "";
    return url.href;
  } catch {
    return "";
  }
}

/**
 * Video/reel links accept the platforms StudioFlow already embeds (YouTube and
 * Instagram). Other https hosts are rejected so the storefront never forwards
 * visitors to an owner-typo or an unrelated third party.
 */
export function ironInkVideoLink(rawValue: string | undefined): string {
  const url = ironInkHttpsUrl(rawValue);
  if (!url) return "";
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  const allowed = ["youtube.com", "youtu.be", "instagram.com"];
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`))
    ? url
    : "";
}

/** Posters may be an owner-uploaded https image or a bundled local asset. */
export function ironInkPosterSrc(rawValue: string | undefined): string {
  const raw = (rawValue || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) {
    return raw;
  }
  return ironInkHttpsUrl(raw);
}
