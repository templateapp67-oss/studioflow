import type { SocialVideo } from '../types';

export type SalonSocialVideo = SocialVideo;

export const MAX_SALON_SOCIAL_VIDEOS = 10;

export function hasSocialVideoOwnerSession(): boolean {
  return true;
}

export function readLocalSalonSocialVideos(salonId?: string): SocialVideo[] {
  return [];
}

export function writeLocalSalonSocialVideos(videos: SocialVideo[], salonId?: string): void {
  // Save locally if needed
}

export async function fetchOwnerSalonSocialVideos(salonId?: string): Promise<SocialVideo[]> {
  return [];
}

export async function fetchPublicSalonSocialVideos(salonId?: string): Promise<SocialVideo[]> {
  return [];
}

export async function createSalonSocialVideo(video: Partial<SocialVideo>, salonId?: string): Promise<SocialVideo> {
  return {
    id: `sv-${Date.now()}`,
    title: video.title || 'Untitled Video',
    url: video.url || '',
    platform: video.platform || 'reels',
    thumbnailUrl: video.thumbnailUrl,
    topic: video.topic
  };
}

export async function updateSalonSocialVideo(id: string, updates: Partial<SocialVideo>): Promise<SocialVideo> {
  return {
    id,
    title: updates.title || 'Updated Video',
    url: updates.url || '',
    ...updates
  };
}

export async function deleteSalonSocialVideo(id: string): Promise<void> {
  return Promise.resolve();
}

export async function reorderSalonSocialVideos(videos: SocialVideo[]): Promise<SocialVideo[]> {
  return videos;
}

export function salonSocialVideoThumbnail(video: SocialVideo): string {
  return video.thumbnailUrl || 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=800&q=80';
}
