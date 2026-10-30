export type IronInkSocialPlatform = 'instagram' | 'youtube' | 'facebook' | 'tiktok';

export const ironInkSocialLinks = {
  instagram: 'https://instagram.com/ironandink.delhi',
  youtube: 'https://youtube.com/@ironandinkstudio',
  facebook: 'https://facebook.com/ironandink.delhi'
};

export function ironInkSocialLink(platform: IronInkSocialPlatform, handle?: string): string {
  if (handle && handle.startsWith('http')) return handle;
  if (platform === 'instagram') return `https://instagram.com/${handle || 'ironandink.delhi'}`;
  if (platform === 'youtube') return `https://youtube.com/${handle || '@ironandinkstudio'}`;
  if (platform === 'facebook') return `https://facebook.com/${handle || 'ironandink.delhi'}`;
  return 'https://instagram.com/ironandink.delhi';
}

export function ironInkHttpsUrl(url?: string): string {
  if (!url) return 'https://instagram.com/ironandink.delhi';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

export function ironInkPosterSrc(video?: any): string {
  return video?.thumbnailUrl || 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=800&q=80';
}

export function ironInkVideoLink(video?: any): string {
  return video?.url || 'https://instagram.com/ironandink.delhi';
}
