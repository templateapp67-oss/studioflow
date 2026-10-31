import { supabase } from "./supabase";
import {
  parseSocialVideo,
  type ParsedSocialVideo,
  type SocialVideoPlatform,
} from "./socialVideoEmbeds";

/**
 * Template 12 · Iron & Ink — "Social videos" (Reels & Shorts) data layer.
 *
 * Owner writes go to `public.salon_social_videos` (migration
 * 202610300005_iron_ink_social_videos.sql). RLS scopes owner reads/writes to
 * `salon_id = auth.uid()`; the public reads active rows through the
 * `get_salon_social_videos(slug)` RPC, which also re-validates the URL and
 * only returns allow-listed platforms.
 *
 * Every function degrades gracefully: if Supabase is unreachable (offline
 * preview, no project configured) the caller receives a typed error/empty list
 * and the storefront falls back to the sample cards. Nothing breaks.
 */
export const MAX_SALON_SOCIAL_VIDEOS = 12;
export const SALON_SOCIAL_VIDEOS_TABLE = "salon_social_videos";
const LOCAL_STORAGE_KEY = "ironInkSocialVideos";

export type SalonSocialVideo = {
  id: string;
  platform: SocialVideoPlatform;
  url: string;
  title: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
};

type Row = Record<string, unknown>;

export function normalizeSalonSocialVideoRow(row: Row): SalonSocialVideo | null {
  const parsed = parseSocialVideo(String(row.url || ""));
  if (!parsed) return null;
  const platform = String(row.platform || parsed.platform) as SocialVideoPlatform;
  if (platform !== parsed.platform) return null;
  return {
    id: String(row.id || ""),
    platform: parsed.platform,
    url: parsed.canonicalUrl,
    title: String(row.title || "").trim().slice(0, 120),
    sortOrder: Number.isFinite(Number(row.sort_order ?? row.sortOrder))
      ? Number(row.sort_order ?? row.sortOrder)
      : 0,
    isActive: row.is_active === undefined ? row.isActive !== false : row.is_active !== false,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

/** Only active rows, stably ordered, deduplicated by canonical URL. */
export function normalizeSalonSocialVideoList(rows: unknown): SalonSocialVideo[] {
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  return (rows as Row[])
    .map(normalizeSalonSocialVideoRow)
    .filter((video): video is SalonSocialVideo => Boolean(video))
    .filter((video) => video.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((video) => {
      if (seen.has(video.url)) return false;
      seen.add(video.url);
      return true;
    })
    .slice(0, MAX_SALON_SOCIAL_VIDEOS);
}

/** Public read for the storefront. Never throws. */
export async function fetchPublicSalonSocialVideos(
  slug: string | undefined,
): Promise<SalonSocialVideo[]> {
  if (!slug || typeof slug !== "string") return [];
  try {
    const { data, error } = await supabase.rpc("get_salon_social_videos", {
      p_slug: slug,
    });
    if (error) return [];
    return normalizeSalonSocialVideoList(data);
  } catch {
    return [];
  }
}

/** Owner read (RLS scopes it to the signed-in salon). Never throws. */
export async function fetchOwnerSalonSocialVideos(): Promise<SalonSocialVideo[]> {
  try {
    const { data, error } = await supabase
      .from(SALON_SOCIAL_VIDEOS_TABLE)
      .select("id,platform,url,title,sort_order,is_active,created_at")
      .order("sort_order", { ascending: true });
    if (error || !Array.isArray(data)) return [];
    return data
      .map(normalizeSalonSocialVideoRow)
      .filter((video): video is SalonSocialVideo => Boolean(video))
      .slice(0, MAX_SALON_SOCIAL_VIDEOS);
  } catch {
    return [];
  }
}

type SupabaseLikeError = { message?: string; code?: string } | null;

/** Human-readable messages for the errors the owner can actually hit. */
function socialVideoError(error: SupabaseLikeError, fallback: string): Error {
  const code = error?.code || "";
  const message = error?.message || "";
  if (code === "42P01" || /relation .*does not exist/i.test(message)) {
    return new Error(
      "The social videos table is not available yet. Apply Supabase migration 202610300005_iron_ink_social_videos.sql.",
    );
  }
  if (code === "42501" || /row-level security|permission denied/i.test(message)) {
    return new Error("Only this salon's signed-in owner can change its videos.");
  }
  if (code === "23505") {
    return new Error("This video is already on the list.");
  }
  if (code === "23514" || /check constraint/i.test(message)) {
    return new Error("Only allow-listed YouTube, Instagram or Facebook links can be saved.");
  }
  return new Error(message || fallback);
}

async function ownerId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sign in to your owner workspace to publish videos.");
  }
  return data.user.id;
}

export async function createSalonSocialVideo(input: {
  url: string;
  title?: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<SalonSocialVideo> {
  const parsed = parseSocialVideo(input.url);
  if (!parsed) throw new Error("Paste a valid YouTube, Instagram or Facebook video link.");
  const salonId = await ownerId();
  const { data, error } = await supabase
    .from(SALON_SOCIAL_VIDEOS_TABLE)
    .insert({
      salon_id: salonId,
      platform: parsed.platform,
      url: parsed.canonicalUrl,
      title: String(input.title || "").trim().slice(0, 120),
      sort_order: Math.max(0, Math.min(999, input.sortOrder ?? 0)),
      is_active: input.isActive !== false,
    })
    .select("id,platform,url,title,sort_order,is_active,created_at")
    .single();
  if (error) throw socialVideoError(error, "Could not save this video.");
  const saved = normalizeSalonSocialVideoRow(data as Row);
  if (!saved) throw new Error("The saved video link could not be verified.");
  return saved;
}

export async function updateSalonSocialVideo(
  id: string,
  patch: Partial<Pick<SalonSocialVideo, "title" | "isActive" | "sortOrder">>,
): Promise<void> {
  const changes: Row = {};
  if (patch.title !== undefined) changes.title = String(patch.title).trim().slice(0, 120);
  if (patch.isActive !== undefined) changes.is_active = Boolean(patch.isActive);
  if (patch.sortOrder !== undefined) {
    changes.sort_order = Math.max(0, Math.min(999, Number(patch.sortOrder) || 0));
  }
  if (!Object.keys(changes).length) return;
  const { error } = await supabase
    .from(SALON_SOCIAL_VIDEOS_TABLE)
    .update(changes)
    .eq("id", id);
  if (error) throw socialVideoError(error, "Could not update this video.");
}

export async function deleteSalonSocialVideo(id: string): Promise<void> {
  const { error } = await supabase.from(SALON_SOCIAL_VIDEOS_TABLE).delete().eq("id", id);
  if (error) throw socialVideoError(error, "Could not delete this video.");
}

/** Persist a new order. Runs sequentially so a partial failure is reported. */
export async function reorderSalonSocialVideos(ids: string[]): Promise<void> {
  for (let index = 0; index < ids.length; index += 1) {
    const { error } = await supabase
      .from(SALON_SOCIAL_VIDEOS_TABLE)
      .update({ sort_order: index })
      .eq("id", ids[index]);
    if (error) throw socialVideoError(error, "Could not save the new order.");
  }
}

/* ------------------------------------------------------------------------- */
/* Local fallback                                                            */
/* ------------------------------------------------------------------------- */
/**
 * When the workspace is not signed in (design preview) the manager keeps the
 * owner's edits in this browser so the flow is still usable. The storefront
 * never reads localStorage.
 */
export function readLocalSalonSocialVideos(): SalonSocialVideo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row: Row) =>
        normalizeSalonSocialVideoRow({
          ...row,
          is_active: row.is_active !== false,
          id: String(row.id || `local-${Math.random().toString(36).slice(2)}`),
        }),
      )
      .filter((video): video is SalonSocialVideo => Boolean(video))
      .slice(0, MAX_SALON_SOCIAL_VIDEOS);
  } catch {
    return [];
  }
}

export function writeLocalSalonSocialVideos(videos: SalonSocialVideo[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(videos.slice(0, MAX_SALON_SOCIAL_VIDEOS)));
  } catch {
    // Storage may be full or blocked; the manager shows a local-only notice.
  }
}

/** Preview thumbnail for a saved row (YouTube only; others render a placeholder). */
export function salonSocialVideoThumbnail(video: SalonSocialVideo): string {
  const parsed: ParsedSocialVideo | null = parseSocialVideo(video.url);
  return parsed?.thumbnailUrl || "";
}

/** True when a StudioFlow owner/customer session exists in this browser. */
export async function hasSocialVideoOwnerSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getUser();
    return !error && Boolean(data.user);
  } catch {
    return false;
  }
}
