export type SocialVideoPlatform = 'youtube' | 'instagram' | 'facebook';

export interface ParsedSocialVideo {
  platform: SocialVideoPlatform;
  title: string;
  thumbnailUrl?: string;
  url?: string;
  embedUrl?: string;
}

export const SOCIAL_VIDEO_PLATFORM_LABEL: Record<SocialVideoPlatform, string> = {
  youtube: 'YouTube Shorts / Video',
  instagram: 'Instagram Reel',
  facebook: 'Facebook Video'
};

export const socialVideoSamples: ParsedSocialVideo[] = [
  {
    platform: 'instagram',
    title: 'Custom Dark Realism Sleeve Stencil & Inking',
    thumbnailUrl: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=800&q=80',
    url: 'https://instagram.com/reel/sample1'
  },
  {
    platform: 'youtube',
    title: 'Surgical Titanium Piercing Procedure',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    url: 'https://youtube.com/shorts/sample2'
  }
];

export function socialVideoPlatformHint(platform: SocialVideoPlatform): string {
  if (platform === 'youtube') return 'e.g. https://youtube.com/shorts/... or https://youtu.be/...';
  if (platform === 'instagram') return 'e.g. https://instagram.com/reel/...';
  return 'e.g. https://facebook.com/watch/...';
}

export function parseSocialVideo(url: string): ParsedSocialVideo {
  if (url.includes('youtube') || url.includes('youtu.be')) {
    return { platform: 'youtube', title: 'YouTube Video', thumbnailUrl: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=800&q=80', url };
  }
  if (url.includes('facebook') || url.includes('fb.watch')) {
    return { platform: 'facebook', title: 'Facebook Video', thumbnailUrl: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=800&q=80', url };
  }
  return { platform: 'instagram', title: 'Instagram Reel', thumbnailUrl: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=800&q=80', url };
}
