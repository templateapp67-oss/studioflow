import type { SalonProfile } from '../types';

export type IronInkSocialPlatform = 'instagram' | 'facebook' | 'youtube';

export interface IronInkSocialLinkItem {
  platform: IronInkSocialPlatform;
  url: string;
  handle: string;
  label: string;
  description?: string;
}

const PLATFORM_LABELS: Record<IronInkSocialPlatform, { label: string; desc: string }> = {
  instagram: { label: 'Instagram', desc: 'Photos, reels & healed tattoos' },
  facebook: { label: 'Facebook', desc: 'Community updates & reviews' },
  youtube: { label: 'YouTube', desc: 'Full sessions, shorts & studio tours' }
};

export function ironInkSocialLink(
  platform: IronInkSocialPlatform,
  raw?: string | null
): IronInkSocialLinkItem | null {
  if (!raw || typeof raw !== 'string') return null;
  const input = raw.trim();
  if (!input || input.startsWith('javascript:')) return null;

  const meta = PLATFORM_LABELS[platform];
  if (!meta) return null;

  // Check if input is a URL
  if (input.startsWith('http://') || input.startsWith('https://')) {
    try {
      const parsed = new URL(input);
      if (parsed.username || parsed.password) return null;
      if (parsed.port && parsed.port !== '80' && parsed.port !== '443') return null;

      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname;

      if (platform === 'instagram') {
        if (host !== 'instagram.com' && host !== 'www.instagram.com') return null;
        const cleanPath = path.replace(/^\/+|\/+$/g, '');
        if (!cleanPath) return null;
        const segments = cleanPath.split('/');
        const username = segments[0].replace(/^@/, '');
        if (!username || !/^[a-zA-Z0-9._]+$/.test(username)) return null;
        return {
          platform: 'instagram',
          url: `https://instagram.com/${username}`,
          handle: `@${username}`,
          label: meta.label,
          description: meta.desc
        };
      }

      if (platform === 'facebook') {
        if (host !== 'facebook.com' && host !== 'www.facebook.com') return null;
        const cleanPath = path.replace(/^\/+|\/+$/g, '');
        if (!cleanPath) return null;
        const segments = cleanPath.split('/');
        const handle = segments[0].replace(/^@/, '');
        if (!handle || !/^[a-zA-Z0-9._-]+$/.test(handle)) return null;
        return {
          platform: 'facebook',
          url: `https://www.facebook.com/${handle}`,
          handle: `@${handle}`,
          label: meta.label,
          description: meta.desc
        };
      }

      if (platform === 'youtube') {
        if (host === 'youtu.be') return null;
        if (host !== 'youtube.com' && host !== 'www.youtube.com') return null;
        if (path.startsWith('/watch') || path.startsWith('/shorts')) return null;

        const cleanPath = path.replace(/^\/+|\/+$/g, '');
        if (!cleanPath) return null;

        if (cleanPath.startsWith('channel/')) {
          return {
            platform: 'youtube',
            url: `https://www.youtube.com/${cleanPath}`,
            handle: 'YouTube channel',
            label: meta.label,
            description: meta.desc
          };
        }

        if (cleanPath.startsWith('@')) {
          const handle = cleanPath.split('/')[0];
          return {
            platform: 'youtube',
            url: `https://www.youtube.com/${handle}`,
            handle: handle,
            label: meta.label,
            description: meta.desc
          };
        }

        const handle = cleanPath.split('/')[0];
        if (/^[a-zA-Z0-9._-]+$/.test(handle)) {
          return {
            platform: 'youtube',
            url: `https://www.youtube.com/@${handle}`,
            handle: `@${handle}`,
            label: meta.label,
            description: meta.desc
          };
        }

        return null;
      }
    } catch {
      return null;
    }
  }

  // Not a URL: must be a plain handle
  if (input.includes(' ') || input.includes('/') || input.includes('?') || input.includes('#')) {
    return null;
  }
  const clean = input.replace(/^@/, '');
  if (!clean || !/^[a-zA-Z0-9._-]+$/.test(clean)) return null;

  if (platform === 'instagram') {
    return {
      platform: 'instagram',
      url: `https://www.instagram.com/${clean}`,
      handle: `@${clean}`,
      label: meta.label,
      description: meta.desc
    };
  }

  if (platform === 'facebook') {
    return {
      platform: 'facebook',
      url: `https://www.facebook.com/${clean}`,
      handle: `@${clean}`,
      label: meta.label,
      description: meta.desc
    };
  }

  if (platform === 'youtube') {
    return {
      platform: 'youtube',
      url: `https://www.youtube.com/@${clean}`,
      handle: `@${clean}`,
      label: meta.label,
      description: meta.desc
    };
  }

  return null;
}

export function ironInkSocialLinks(profile?: Partial<SalonProfile> | null): IronInkSocialLinkItem[] {
  if (!profile) return [];
  const list: IronInkSocialLinkItem[] = [];

  const ig = ironInkSocialLink('instagram', profile.instagramHandle);
  if (ig) list.push(ig);

  const fb = ironInkSocialLink('facebook', profile.facebookPage);
  if (fb) list.push(fb);

  const yt = ironInkSocialLink('youtube', profile.youtubeChannel);
  if (yt) list.push(yt);

  return list;
}

export function ironInkHttpsUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('https://')) return url;
  if (url.startsWith('http://')) return url.replace(/^http:\/\//, 'https://');
  return `https://${url}`;
}

export function ironInkPosterSrc(src?: unknown): string {
  if (typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('javascript:') || trimmed.startsWith('//')) return '';
  if (trimmed.startsWith('/templates/12/media/')) return trimmed;
  if (trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      if (u.protocol === 'https:' && !u.username && !u.password) return trimmed;
    } catch {
      return '';
    }
  }
  return '';
}

export function ironInkVideoLink(url?: unknown): string {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || !trimmed.startsWith('https://')) return '';
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'https:' || u.username || u.password) return '';
    const host = u.hostname.toLowerCase();
    if (
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'youtu.be' ||
      host === 'instagram.com' ||
      host === 'www.instagram.com' ||
      host === 'facebook.com' ||
      host === 'www.facebook.com'
    ) {
      return trimmed;
    }
  } catch {
    return '';
  }
  return '';
}
