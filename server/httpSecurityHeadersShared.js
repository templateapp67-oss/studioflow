const PRIVATE_ROOT_QUERY_KEYS = [
  'app',
  'customer',
  'customer_ref',
  'owner',
  'panel',
  'create',
  'module',
  'invite',
  'recovery',
  'auth',
  'token',
];

function validSlug(value) {
  const slug = String(value || '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(slug) ? slug : '';
}

/**
 * Only the same-origin public root app/storefront documents can be framed.
 * All authenticated, account, invite, recovery and administration variants
 * stay unframeable, even when a public selector is also present.
 */
export function isFrameableRootRequest(rawUrl, method = 'GET') {
  if (!['GET', 'HEAD'].includes(String(method).toUpperCase())) return false;

  let url;
  try {
    url = rawUrl instanceof URL
      ? new URL(rawUrl.toString())
      : new URL(String(rawUrl || '/'), 'https://nexorasalon.online');
  } catch {
    return false;
  }

  if (url.pathname !== '/') return false;
  if (PRIVATE_ROOT_QUERY_KEYS.some((key) => url.searchParams.has(key))) return false;

  const requestedSlug =
    url.searchParams.get('site') ||
    url.searchParams.get('s') ||
    url.searchParams.get('subdomain') ||
    '';
  return Boolean(validSlug(requestedSlug));
}

/** Permissions-Policy stays deny-by-default; delegation only to real embeds. */
export const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=(self "https://www.youtube.com" "https://player.vimeo.com")',
  'camera=()',
  'encrypted-media=(self "https://www.youtube.com" "https://player.vimeo.com")',
  'fullscreen=(self "https://www.youtube.com" "https://www.youtube-nocookie.com" "https://player.vimeo.com")',
  'geolocation=()',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=(self "https://api.razorpay.com" "https://checkout.razorpay.com")',
  'picture-in-picture=(self "https://www.youtube.com" "https://player.vimeo.com")',
  'usb=()',
  'xr-spatial-tracking=()',
].join(', ');

export const HSTS_VALUE = 'max-age=63072000; includeSubDomains; preload';

/** Build the single enforced CSP. Same-origin framing is opt-in per request. */
export function contentSecurityPolicy(options = {}) {
  const allowSameOriginFraming = options.allowSameOriginFraming === true;
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    allowSameOriginFraming ? "frame-ancestors 'self'" : "frame-ancestors 'none'",
    "form-action 'self' https://*.supabase.co https://*.razorpay.com",
    "script-src 'self' https://checkout.razorpay.com https://unpkg.com https://connect.facebook.net https://www.clarity.ms https://*.clarity.ms https://c.bing.com https://embed.tawk.to https://cdn.jsdelivr.net/emojione/2.2.7/lib/js/emojione.min.js",
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://embed.tawk.to/_s/v4/app/",
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' data: https://fonts.gstatic.com https://unpkg.com https://embed.tawk.to/_s/v4/assets/fonts/",
    "img-src 'self' data: blob: https://*.supabase.co https://*.clarity.ms https://c.bing.com https://images.unsplash.com https://raw.githubusercontent.com https://*.pexels.com https://img.youtube.com https://i.ytimg.com https://*.fbcdn.net https://*.cdninstagram.com https://*.instagram.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://unpkg.com https://www.google.com https://maps.google.com https://*.tawk.to https://cdn.jsdelivr.net/emojione/assets/png/ https://tawk.link",
    "media-src 'self' data: blob: https://*.supabase.co https://*.fbcdn.net https://*.cdninstagram.com https://*.googlevideo.com https://www.youtube.com https://youtube.com https://player.vimeo.com https://*.vimeocdn.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.razorpay.com https://*.clarity.ms https://c.bing.com https://nominatim.openstreetmap.org https://images.unsplash.com https://raw.githubusercontent.com https://*.pexels.com https://img.youtube.com https://i.ytimg.com https://*.fbcdn.net https://*.cdninstagram.com https://www.clarity.ms https://*.clarity.ms https://*.tawk.to wss://*.tawk.to",
    "frame-src 'self' https://*.razorpay.com https://www.youtube.com https://www.youtube-nocookie.com https://www.facebook.com https://web.facebook.com https://staticxx.facebook.com https://www.instagram.com https://player.vimeo.com https://www.google.com https://maps.google.com https://www.openstreetmap.org https://*.tawk.to",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];
  if (options.upgradeInsecureRequests) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}

/** Header values enforced by Express and the Vercel root middleware. */
export function securityHeaders(options = {}) {
  const allowSameOriginFraming = options.allowSameOriginFraming === true;
  return {
    'Strict-Transport-Security': HSTS_VALUE,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': allowSameOriginFraming ? 'SAMEORIGIN' : 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': PERMISSIONS_POLICY,
    'Content-Security-Policy': contentSecurityPolicy(options),
  };
}
