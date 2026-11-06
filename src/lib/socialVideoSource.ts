import type {SocialVideo} from '../types';

/**
 * Owner-supplied reel sources (Step 06 — Socials & Reels).
 *
 * A pasted link is only accepted when its host is one of the allow-listed
 * platforms and its path matches that platform's video/reel shape. The saved
 * URL is always rebuilt from the parsed id, so look-alike hosts
 * (`facebook.com.evil.test`), `http:` links, credentialed URLs and malformed
 * ids are rejected instead of being rendered on the storefront.
 *
 * Facebook support covers every form Meta itself generates for video posts:
 * `/reel/<id>`, `/watch/?v=<id>`, `/<page>/videos/<id>`, `/share/r|v/<code>`
 * and the `fb.watch/<code>` short link. These regexes mirror the allow-list in
 * `socialVideoEmbeds.ts` (Template 12 · Iron & Ink) — the verification suite
 * asserts both parsers agree on the same URL matrix.
 */
export type SocialVideoPlatformName = 'YouTube' | 'Instagram' | 'Facebook';

export const FACEBOOK_VIDEO_PATTERNS = {
  /** https://www.facebook.com/reel/1234567890 */
  reel: /^https:\/\/(?:www\.|m\.|web\.)?facebook\.com\/reel\/\d{6,30}\/?$/i,
  /** https://www.facebook.com/watch/?v=1234567890 (extra params allowed) */
  watch: /^https:\/\/(?:www\.|m\.|web\.)?facebook\.com\/watch\/?\?(?:[^#]*&)?v=\d{6,30}(?:&|#|$)/i,
  /** https://www.facebook.com/<page>/videos/1234567890/ */
  videos: /^https:\/\/(?:www\.|m\.|web\.)?facebook\.com\/(?:[^/?#]+\/)?videos\/(?:[^/?#]+\/)?\d{6,30}\/?$/i,
  /** https://www.facebook.com/share/r/AbCdEf123/ (r = reel, v = video) */
  share: /^https:\/\/(?:www\.|m\.|web\.)?facebook\.com\/share\/[rv]\/[A-Za-z0-9_-]{3,40}\/?$/i,
  /** https://fb.watch/AbCdEf123/ */
  shortLink: /^https:\/\/(?:www\.)?fb\.watch\/[A-Za-z0-9_-]{3,40}\/?$/i,
} as const;

export type FacebookVideoKind = 'reel' | 'watch' | 'videos' | 'share' | 'short';

export interface FacebookVideoSource {
  id: string;
  /** Rebuilt canonical https URL — safe to store and render as a href. */
  url: string;
  kind: FacebookVideoKind;
}

const FACEBOOK_HOSTS = ['facebook.com', 'fb.watch'];

function bareHost(hostname: string) {
  return hostname.toLowerCase().replace(/^(?:www|m|web)\./, '');
}

/** True only for real facebook.com / fb.watch hosts (never `facebook.com.evil.test`). */
export function isFacebookVideoHost(hostname: string) {
  return FACEBOOK_HOSTS.includes(bareHost(hostname.toLowerCase()));
}

/**
 * Parse a Facebook video/reel link. Returns `null` when the host is not
 * Facebook or the path is not one of the accepted video forms above.
 */
export function parseFacebookVideoUrl(raw: string): FacebookVideoSource | null {
  const value = String(raw || '').trim();
  if (!value || value.length > 500) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (!isFacebookVideoHost(host)) return null;
  const path = url.pathname;
  // Patterns always test against a normalised `www.` URL so `m.` / `web.`
  // mobile links are accepted and the stored canonical URL is stable.
  const absolute = `https://www.facebook.com${path}`;
  const normalised = `${absolute}${url.search}`;

  if (FACEBOOK_VIDEO_PATTERNS.shortLink.test(`https://${bareHost(host)}${path}`)) {
    const id = path.split('/').filter(Boolean)[0] || '';
    return { id, url: `https://fb.watch/${id}/`, kind: 'short' };
  }
  if (FACEBOOK_VIDEO_PATTERNS.reel.test(absolute)) {
    const id = path.match(/\/reel\/(\d{6,30})/i)?.[1] || '';
    return { id, url: `https://www.facebook.com/reel/${id}`, kind: 'reel' };
  }
  if (FACEBOOK_VIDEO_PATTERNS.videos.test(absolute)) {
    const id = path.match(/\/videos\/(?:[^/?#]+\/)?(\d{6,30})/i)?.[1] || '';
    return { id, url: `https://www.facebook.com/videos/${id}`, kind: 'videos' };
  }
  if (FACEBOOK_VIDEO_PATTERNS.watch.test(normalised)) {
    const id = url.searchParams.get('v') || '';
    return { id, url: `https://www.facebook.com/watch/?v=${id}`, kind: 'watch' };
  }
  if (FACEBOOK_VIDEO_PATTERNS.share.test(absolute)) {
    const match = path.match(/^\/share\/([rv])\/([A-Za-z0-9_-]{3,40})\/?$/i);
    const kind = (match?.[1] || 'v').toLowerCase();
    const id = match?.[2] || '';
    return { id, url: `https://www.facebook.com/share/${kind}/${id}/`, kind: 'share' };
  }
  return null;
}

export function socialVideoSource(raw: string): { platform: SocialVideoPlatformName; id: string; url: string } | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    if (isFacebookVideoHost(url.hostname)) {
      const facebook = parseFacebookVideoUrl(raw);
      return facebook ? { platform: 'Facebook', id: facebook.id, url: facebook.url } : null;
    }
    if (host === 'instagram.com') {
      const match = url.pathname.match(/^\/(?:reel|reels|p|tv)\/([\w-]+)\/?$/);
      return match ? { platform: 'Instagram', id: match[1], url: `https://www.instagram.com${url.pathname}` } : null;
    }
    if (!['youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) return null;
    const id = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed|v)\/([\w-]+)/)?.[1];
    return id && /^[\w-]{11}$/.test(id) ? { platform: 'YouTube', id, url: raw.trim() } : null;
  } catch {
    return null;
  }
}

export function videoSource(video: SocialVideo) {
  return socialVideoSource(video.youtubeUrl);
}

export function secureMediaUrl(raw?: string) {
  try {
    const url = new URL(raw || '');
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

// A long video does not become a Short by changing its card shape or category tag.
export function shortVideoSource(raw: string) {
  const source = socialVideoSource(raw);
  if (!source) return null;
  // Facebook reels, watch links, page videos and fb.watch links are all
  // portrait feed cards — Meta serves the player itself, so keep the canonical URL.
  if (source.platform === 'Facebook') return source;
  const path = new URL(raw.trim()).pathname;
  if (source.platform === 'YouTube' && !/^\/shorts\/[\w-]{11}\/?$/.test(path)) return null;
  if (source.platform === 'Instagram' && !/^\/reels?\/[\w-]+\/?$/.test(path)) return null;
  return { ...source, url: source.platform === 'YouTube' ? `https://www.youtube.com/shorts/${source.id}` : source.url };
}

export function reelSource(video: SocialVideo) {
  return video.categoryTag === 'LONG' ? null : shortVideoSource(video.youtubeUrl);
}

/**
 * Platform-correct player URL for a parsed source.
 *
 * YouTube uses the privacy-enhanced host, Facebook uses Meta's official video
 * plugin (a plain facebook.com link cannot be framed), Instagram uses its
 * `/embed/` route. Returns '' for an unparsed/unsupported source so callers can
 * fall back to the poster + "open post" link instead of an empty iframe.
 */
export function socialVideoEmbedUrl(
  source: { platform: SocialVideoPlatformName; id: string; url: string } | null | undefined,
  options: { autoplay?: boolean; muted?: boolean; loop?: boolean; controls?: boolean } = {},
) {
  if (!source) return '';
  const { autoplay = false, muted = false, loop = false, controls = false } = options;
  if (source.platform === 'YouTube') {
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      mute: muted ? '1' : '0',
      playsinline: '1',
      rel: '0',
      modestbranding: '1',
      controls: controls ? '1' : '0',
    });
    if (loop) {
      params.set('loop', '1');
      params.set('playlist', source.id);
    }
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(source.id)}?${params.toString()}`;
  }
  if (source.platform === 'Facebook') {
    const params = new URLSearchParams({
      href: source.url,
      show_text: 'false',
      width: '560',
      height: '996',
      t: '0',
      autoplay: autoplay ? '1' : '0',
    });
    return `https://www.facebook.com/plugins/video.php?${params.toString()}`;
  }
  return `${source.url.replace(/\/+$/, '')}/embed/`;
}

/** Customer-facing platform name used in reel cards and the preview modal. */
export function socialVideoSourceLabel(source: { platform: SocialVideoPlatformName } | null) {
  return source?.platform || 'social';
}
