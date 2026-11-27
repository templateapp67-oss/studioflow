/**
 * HTTP security headers enforced by the Express server on every response
 * (API, HTML, static assets). vercel.json enforces the same values at the
 * edge; scripts/verify-security-policy.mjs and scripts/verify-webhook-security.mjs
 * fail the build if the two drift apart.
 *
 * Deliberate differences from vercel.json:
 *  - `upgrade-insecure-requests` is only emitted behind Vercel. The Express
 *    server must stay usable on plain-http localhost (an automatic http→https
 *    upgrade would break the dev loop). HSTS is always set: browsers ignore
 *    it over plain HTTP, so it is harmless there.
 *  - frame-ancestors is 'none' (and X-Frame-Options DENY): no first-party
 *    flow embeds these documents in a frame.
 */

/** The CSP shared with vercel.json; keep directive-for-directive parity. */
export function contentSecurityPolicy(options: { upgradeInsecureRequests?: boolean } = {}): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://*.supabase.co https://*.razorpay.com",
    "script-src 'self' https://checkout.razorpay.com https://unpkg.com https://connect.facebook.net https://www.clarity.ms https://*.clarity.ms https://c.bing.com https://embed.tawk.to https://cdn.jsdelivr.net/emojione/2.2.7/lib/js/emojione.min.js",
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://embed.tawk.to/_s/v4/app/",
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' data: https://fonts.gstatic.com https://unpkg.com https://embed.tawk.to/_s/v4/assets/fonts/",
    "img-src 'self' data: blob: https://*.supabase.co https://*.clarity.ms https://c.bing.com https://images.unsplash.com https://raw.githubusercontent.com https://*.pexels.com https://img.youtube.com https://i.ytimg.com https://*.fbcdn.net https://*.cdninstagram.com https://*.instagram.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://unpkg.com https://www.google.com https://maps.google.com https://*.tawk.to",
    "media-src 'self' data: blob: https://*.supabase.co https://*.fbcdn.net https://*.cdninstagram.com https://*.googlevideo.com https://www.youtube.com https://youtube.com https://player.vimeo.com https://*.vimeocdn.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.razorpay.com https://*.clarity.ms https://c.bing.com https://nominatim.openstreetmap.org https://images.unsplash.com https://raw.githubusercontent.com https://*.pexels.com https://img.youtube.com https://i.ytimg.com https://*.fbcdn.net https://*.cdninstagram.com https://www.clarity.ms https://*.clarity.ms https://*.tawk.to wss://*.tawk.to",
    "frame-src 'self' https://*.razorpay.com https://www.youtube.com https://www.youtube-nocookie.com https://www.facebook.com https://web.facebook.com https://staticxx.facebook.com https://www.instagram.com https://player.vimeo.com https://www.google.com https://maps.google.com https://www.openstreetmap.org https://*.tawk.to",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];
  if (options.upgradeInsecureRequests) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}

/** Permissions-Policy: nothing by default; delegation only to the embed origins the app actually uses. */
export const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=(self https://www.youtube.com https://player.vimeo.com)',
  'browsing-topics=()',
  'camera=()',
  'encrypted-media=(self https://www.youtube.com https://player.vimeo.com)',
  'fullscreen=(self https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com)',
  'geolocation=()',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=(self https://api.razorpay.com https://checkout.razorpay.com)',
  'picture-in-picture=(self https://www.youtube.com https://player.vimeo.com)',
  'usb=()',
  'xr-spatial-tracking=()',
].join(', ');

export const HSTS_VALUE = 'max-age=63072000; includeSubDomains; preload';

/** Header values the Express server enforces on every response. */
export function securityHeaders(options: { upgradeInsecureRequests?: boolean } = {}): Record<string, string> {
  return {
    'Strict-Transport-Security': HSTS_VALUE,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': PERMISSIONS_POLICY,
    'Content-Security-Policy': contentSecurityPolicy(options),
  };
}
