/**
 * Exact-origin CORS for browser-callable StudioFlow Edge Functions.
 *
 * Why not a wildcard: these functions authenticate with a bearer token or a
 * project anon key, never with cookies, so a wildcard grants no ambient
 * authority. The wildcard still lets any website ride the visitor's
 * connection (and, for the geocoder proxy, spend our upstream quota for free).
 * Exact-origin matching closes that without breaking real callers:
 *
 *   * the StudioFlow apps served from the canonical and preview hosts;
 *   * local development on localhost:5173 / localhost:3000;
 *   * server-to-server callers (pg_cron, Meta and Razorpay webhooks, the
 *     Android app, Tawk), which send no Origin header at all — CORS is a
 *     browser control, never an access check. A missing Origin is allowed.
 *
 * Behaviour: an unapproved Origin gets no `Access-Control-Allow-Origin`
 * header (the browser blocks reading the response) and `isAllowedBrowserOrigin`
 * returns false so handlers can also refuse the request outright.
 */
const ALLOWED_ORIGINS = new Set([
  'https://nexorasalon.online',
  'https://www.nexorasalon.online',
  'https://studioflow-ashen-pi.vercel.app',
  // Retain the existing branded host while its owners migrate.
  'https://nexora-one-white-label.templateapp67.chatgpt.site',
  'http://localhost:5173',
  'http://localhost:3000',
]);

export const isAllowedBrowserOrigin = (origin: string | null): boolean =>
  origin === null || ALLOWED_ORIGINS.has(origin);

export function browserCorsHeaders(
  origin: string | null,
  allowHeaders: string,
  allowMethods: string = 'POST, OPTIONS',
): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': allowHeaders,
    'Access-Control-Allow-Methods': allowMethods,
    Vary: 'Origin',
  };
  // Echo only an approved origin; an unapproved or absent Origin gets no
  // header at all (a missing Origin is the server-to-server case).
  if (origin !== null && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}
