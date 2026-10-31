import type { SocialVideo } from '../types';
import { parseSocialVideo, type SocialVideoPlatform } from './socialVideoEmbeds';

export type SalonSocialVideo = {
  id: string;
  salon_id?: string;
  platform: SocialVideoPlatform;
  url: string;
  title: string;
  sort_order: number;
  is_active?: boolean;
  isActive?: boolean;
  thumbnail_url?: string;
  thumbnailUrl?: string;
  created_at?: string;
  updated_at?: string;
};

export const MAX_SALON_SOCIAL_VIDEOS = 12;

const LOCAL_STORAGE_KEY = 'studioflow_salon_social_videos';

export function hasSocialVideoOwnerSession(): boolean {
  return false;
}

export function readLocalSalonSocialVideos(salonId?: string): SalonSocialVideo[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${salonId || 'default'}`);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list)
      ? list.map((item) => ({
          ...item,
          is_active: item.is_active ?? item.isActive ?? true,
          isActive: item.isActive ?? item.is_active ?? true
        }))
      : [];
  } catch {
    return [];
  }
}

export function writeLocalSalonSocialVideos(videos: SalonSocialVideo[], salonId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${salonId || 'default'}`, JSON.stringify(videos));
  } catch {
    // Ignore storage errors
  }
}

export function normalizeSalonSocialVideoList(videos?: any[]): any[] {
  if (!Array.isArray(videos)) return [];

  const valid = videos
    .filter((v) => v && typeof v === "object" && v.is_active !== false && v.isActive !== false)
    .filter((v) => Boolean(parseSocialVideo(v.url)));

  valid.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));

  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const v of valid) {
    const parsed = parseSocialVideo(v.url);
    const key = parsed ? `${parsed.platform}:${parsed.videoId}` : v.url;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push({
        ...v,
        is_active: v.is_active ?? v.isActive ?? true,
        isActive: v.isActive ?? v.is_active ?? true
      });
    }
  }

  return deduped;
}

export async function fetchPublicSalonSocialVideos(slug?: string): Promise<SalonSocialVideo[]> {
  if (!slug) return [];
  try {
    return [];
  } catch {
    return [];
  }
}

export async function fetchOwnerSalonSocialVideos(salonId?: string): Promise<SalonSocialVideo[]> {
  return readLocalSalonSocialVideos(salonId);
}

export async function createSalonSocialVideo(video: Partial<SalonSocialVideo>, salonId?: string): Promise<SalonSocialVideo> {
  const current = readLocalSalonSocialVideos(salonId);
  const parsed = parseSocialVideo(video.url);
  const newVideo: SalonSocialVideo = {
    id: `sv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    salon_id: salonId,
    platform: parsed?.platform || (video.platform as SocialVideoPlatform) || 'youtube',
    url: video.url || '',
    title: video.title || '',
    sort_order: video.sort_order ?? current.length,
    is_active: video.is_active ?? video.isActive ?? true,
    isActive: video.isActive ?? video.is_active ?? true,
    thumbnail_url: video.thumbnail_url || video.thumbnailUrl,
    thumbnailUrl: video.thumbnailUrl || video.thumbnail_url
  };
  const updated = [...current, newVideo];
  writeLocalSalonSocialVideos(updated, salonId);
  return newVideo;
}

export async function updateSalonSocialVideo(id: string, updates: Partial<SalonSocialVideo>, salonId?: string): Promise<SalonSocialVideo> {
  const current = readLocalSalonSocialVideos(salonId);
  let updatedVideo: SalonSocialVideo | null = null;
  const next = current.map((v) => {
    if (v.id === id) {
      updatedVideo = {
        ...v,
        ...updates,
        is_active: updates.is_active ?? updates.isActive ?? v.is_active ?? v.isActive ?? true,
        isActive: updates.isActive ?? updates.is_active ?? v.isActive ?? v.is_active ?? true,
        thumbnail_url: updates.thumbnail_url ?? updates.thumbnailUrl ?? v.thumbnail_url ?? v.thumbnailUrl,
        thumbnailUrl: updates.thumbnailUrl ?? updates.thumbnail_url ?? v.thumbnailUrl ?? v.thumbnail_url
      };
      return updatedVideo;
    }
    return v;
  });
  if (updatedVideo) {
    writeLocalSalonSocialVideos(next, salonId);
    return updatedVideo;
  }
  return { id, ...updates } as SalonSocialVideo;
}

export async function deleteSalonSocialVideo(id: string, salonId?: string): Promise<void> {
  const current = readLocalSalonSocialVideos(salonId);
  const next = current.filter((v) => v.id !== id);
  writeLocalSalonSocialVideos(next, salonId);
}

export async function reorderSalonSocialVideos(videos: SalonSocialVideo[], salonId?: string): Promise<SalonSocialVideo[]> {
  const indexed = videos.map((v, i) => ({ ...v, sort_order: i }));
  writeLocalSalonSocialVideos(indexed, salonId);
  return indexed;
}

export function salonSocialVideoThumbnail(video: SalonSocialVideo): string {
  return video.thumbnail_url || video.thumbnailUrl || '/templates/12/media/studio-practice.jpg';
}
