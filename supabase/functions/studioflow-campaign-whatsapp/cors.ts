export const CAMPAIGN_ALLOWED_ORIGINS = [
  'https://nexorasalon.online',
  'https://studioflow-ashen-pi.vercel.app',
  // Retain the existing branded origin while its owners migrate.
  'https://nexora-one-white-label.templateapp67.chatgpt.site',
] as const;

const allowedOrigins = new Set<string>(CAMPAIGN_ALLOWED_ORIGINS);

/** A missing Origin is allowed for authenticated server-to-server callers. */
export function isCampaignOriginAllowed(origin: string | null): boolean {
  return origin === null || allowedOrigins.has(origin);
}

/** Echo only an explicitly approved origin; never emit a wildcard. */
export function campaignCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (origin !== null && allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

/** Handle CORS preflight before authentication or request-body parsing. */
export function campaignPreflight(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null;
  const origin = request.headers.get('origin');
  if (!isCampaignOriginAllowed(origin)) {
    return new Response('Origin not allowed', {
      status: 403,
      headers: { ...campaignCorsHeaders(null), 'Cache-Control': 'no-store' },
    });
  }
  return new Response(null, {
    status: 204,
    headers: { ...campaignCorsHeaders(origin), 'Cache-Control': 'no-store' },
  });
}
