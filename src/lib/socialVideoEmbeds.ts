export type SocialVideoPlatform = 'youtube' | 'instagram' | 'facebook';

export interface ParsedSocialVideo {
  platform: SocialVideoPlatform;
  videoId: string;
  canonicalUrl: string;
  embedUrl: string;
  url: string;
  title?: string;
  thumbnailUrl?: string;
}

export const SOCIAL_VIDEO_PLATFORM_LABEL: Record<SocialVideoPlatform, string> = {
  youtube: 'YouTube Shorts / Video',
  instagram: 'Instagram Reel',
  facebook: 'Facebook Video'
};

export const socialVideoSamples: Array<{
  id: string;
  platform: SocialVideoPlatform;
  title: string;
  thumbnailUrl: string;
  url: string;
}> = [
  {
    id: 'sample-video-1',
    platform: 'youtube',
    title: 'Custom Blackwork Sleeve Session',
    thumbnailUrl: '/templates/12/media/artist-process.jpg',
    url: 'https://www.youtube.com/shorts/jNQXAC9IVRw'
  },
  {
    id: 'sample-video-2',
    platform: 'youtube',
    title: 'Healed Dark Realism Contrast',
    thumbnailUrl: '/templates/12/media/healed-work.jpg',
    url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ'
  },
  {
    id: 'sample-video-3',
    platform: 'youtube',
    title: 'Surgical Titanium Piercing Procedure',
    thumbnailUrl: '/templates/12/media/piercing-hygiene.jpg',
    url: 'https://www.youtube.com/shorts/9bZkp7q19f0'
  }
];

export function socialVideoPlatformHint(platform?: SocialVideoPlatform): string {
  if (platform === 'youtube') return 'e.g. https://youtube.com/shorts/... or https://youtu.be/...';
  if (platform === 'instagram') return 'e.g. https://instagram.com/reel/...';
  if (platform === 'facebook') return 'e.g. https://facebook.com/reel/... or https://fb.watch/...';
  return 'Paste a YouTube Short/watch, Instagram Reel, or Facebook Reel URL.';
}

export function parseSocialVideo(raw?: string | null): ParsedSocialVideo | null {
  if (!raw || typeof raw !== 'string') return null;
  const input = raw.trim();
  if (!input.startsWith('https://')) return null;

  try {
    const parsed = new URL(input);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    if (parsed.port && parsed.port !== '443') return null;

    const host = parsed.hostname.toLowerCase();

    // YouTube
    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1);
      if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
      return {
        platform: 'youtube',
        videoId: id,
        canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&autoplay=1`,
        url: input
      };
    }

    if (host === 'youtube.com' || host === 'www.youtube.com') {
      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.slice('/shorts/'.length).replace(/\/.*$/, '');
        if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
        return {
          platform: 'youtube',
          videoId: id,
          canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
          embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&autoplay=1`,
          url: input
        };
      }
      if (parsed.pathname === '/watch') {
        const id = parsed.searchParams.get('v');
        if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
        return {
          platform: 'youtube',
          videoId: id,
          canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
          embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&autoplay=1`,
          url: input
        };
      }
      return null;
    }

    // Instagram
    if (host === 'instagram.com' || host === 'www.instagram.com') {
      const match = parsed.pathname.match(/^\/reel\/([a-zA-Z0-9_-]+)\/?/);
      if (!match) return null;
      const code = match[1];
      return {
        platform: 'instagram',
        videoId: code,
        canonicalUrl: `https://www.instagram.com/reel/${code}/`,
        embedUrl: `https://www.instagram.com/reel/${code}/embed`,
        url: input
      };
    }

    // Facebook
    if (host === 'fb.watch') {
      const id = parsed.pathname.replace(/^\/+|\/+$/g, '');
      if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return null;
      return {
        platform: 'facebook',
        videoId: id,
        canonicalUrl: `https://fb.watch/${id}/`,
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(`https://fb.watch/${id}/`)}&show_text=false&width=560&height=996&t=0`,
        url: input
      };
    }

    if (host === 'facebook.com' || host === 'www.facebook.com') {
      const match = parsed.pathname.match(/^\/(?:reel|watch)\/([0-9a-zA-Z_-]+)\/?/);
      if (!match) return null;
      const id = match[1];
      const canonical = `https://www.facebook.com/reel/${id}`;
      return {
        platform: 'facebook',
        videoId: id,
        canonicalUrl: canonical,
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(canonical)}&show_text=false&width=560&height=996&t=0`,
        url: input
      };
    }

    return null;
  } catch {
    return null;
  }
}
