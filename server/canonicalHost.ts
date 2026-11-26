/**
 * Canonical host redirects for the public NEXORA domain.
 *
 * `https://nexorasalon.online` is the only indexable origin: `index.html`,
 * `login.html`, `src/lib/publicSeo.ts` and `server/sitemap.ts` all canonicalise
 * to it, and `vercel.json` declares the same redirect for the `www` host. This
 * middleware applies the rule on the Express server too (local `npm start`,
 * self-hosted Node, and the Vercel Node runtime), always with a **308**: the
 * method and body survive the hop, so a redirected `POST` is never downgraded
 * to a `GET`.
 *
 * Preview and ephemeral hosts are deliberately untouched — `.vercel.app`,
 * `.e2b.app`, `localhost` and IP hosts must keep serving the deployment they
 * were opened on, or every preview would bounce to production.
 */

export const CANONICAL_HOST = 'nexorasalon.online';
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

/** Extra hosts that 308 to the canonical origin: `www` plus env additions. */
export const CANONICAL_ALIAS_HOSTS: readonly string[] = ['www.nexorasalon.online'];

const CANONICAL_STATUS = 308;

/** Paths that must never be redirected (API calls, ACME, health probes). */
const EXEMPT_PREFIXES = ['/api/', '/.well-known/', '/favicon.ico'];

export type CanonicalRequestInfo = {
  /** `Host` header, e.g. `www.nexorasalon.online:443`. */
  host?: string | null;
  /** `x-forwarded-proto` when the request terminates at a proxy. */
  forwardedProto?: string | null;
  /** Fallback protocol when no forwarded header is present. */
  protocol?: string | null;
  method?: string | null;
  /** Path only (`/pricing`). */
  path?: string | null;
  /** Query string including the leading `?`, or empty. */
  search?: string | null;
};

function originHost(origin: string): string {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return CANONICAL_HOST;
  }
}

function canonicalOriginFromEnv(): string {
  const configured = (process.env.NEXORA_CANONICAL_ORIGIN || '').trim();
  if (!configured) return CANONICAL_ORIGIN;
  try {
    const url = new URL(configured);
    return url.protocol === 'https:' ? url.origin : CANONICAL_ORIGIN;
  } catch {
    return CANONICAL_ORIGIN;
  }
}

function aliasHosts(): Set<string> {
  const hosts = new Set(CANONICAL_ALIAS_HOSTS.map((host) => host.toLowerCase()));
  hosts.add(`www.${originHost(canonicalOriginFromEnv())}`);
  const configured = (process.env.NEXORA_CANONICAL_REDIRECT_HOSTS || '').trim();
  if (configured) {
    for (const host of configured.split(',')) {
      const clean = host.trim().toLowerCase();
      if (clean) hosts.add(clean);
    }
  }
  return hosts;
}

/** Lowercase host without port, userinfo or trailing dot. */
export function normaliseHost(host: string | null | undefined): string {
  const raw = String(host || '').trim().toLowerCase();
  if (!raw) return '';
  const withoutUser = raw.includes('@') ? raw.slice(raw.lastIndexOf('@') + 1) : raw;
  // Trailing dot (root label) can appear before or after the port, so strip it
  // on both sides of the port removal.
  const withoutPort = withoutUser.replace(/\.+$/, '').replace(/:\d+$/, '');
  return withoutPort.replace(/\.+$/, '');
}

function normalisePath(path: string | null | undefined): string {
  const raw = String(path || '').trim();
  if (!raw.startsWith('/')) return '/';
  // Collapse duplicate slashes (`//sign-in`) but keep a single leading slash.
  const collapsed = raw.replace(/\/{2,}/g, '/');
  return collapsed || '/';
}

function isExemptPath(path: string): boolean {
  return EXEMPT_PREFIXES.some((prefix) => path === prefix.replace(/\/$/, '') || path.startsWith(prefix));
}

/**
 * Returns the absolute 308 target for a request that is not on the canonical
 * origin, or `null` when the request must be served unchanged.
 */
export function canonicalRedirectTarget(
  request: CanonicalRequestInfo,
  options: { canonicalOrigin?: string } = {},
): string | null {
  if ((process.env.NEXORA_CANONICAL_REDIRECTS || '').trim().toLowerCase() === 'off') return null;

  const method = String(request.method || 'GET').toUpperCase();
  // 308 keeps the method and body; still, only navigate document requests so a
  // misconfigured client cannot be looped through a redirect for writes.
  if (method !== 'GET' && method !== 'HEAD') return null;

  const host = normaliseHost(request.host);
  if (!host) return null;

  const origin = options.canonicalOrigin || canonicalOriginFromEnv();
  const canonicalHost = normaliseHost(originHost(origin));
  const path = normalisePath(request.path);
  if (isExemptPath(path)) return null;

  const search = String(request.search || '');
  const suffix = path + (search.startsWith('?') ? search : search ? `?${search}` : '');

  if (aliasHosts().has(host)) return `${origin.replace(/\/$/, '')}${suffix}`;

  const protocol = normaliseHost(request.forwardedProto || request.protocol || '').split(',')[0].trim();
  if (host === canonicalHost && protocol === 'http') {
    return `${origin.replace(/\/$/, '')}${suffix}`;
  }

  return null;
}

type ExpressRequest = {
  method?: string;
  hostname?: string;
  protocol?: string;
  originalUrl?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  get?: (name: string) => string | undefined;
};

type ExpressResponse = {
  setHeader?: (name: string, value: string) => unknown;
  redirect: (status: number, target: string) => unknown;
};

type Next = (error?: unknown) => void;

function header(req: ExpressRequest, name: string): string {
  const direct = req.get?.(name);
  if (direct) return direct;
  const value = req.headers?.[name.toLowerCase()] ?? req.headers?.[name];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

/** Express middleware wrapper around {@link canonicalRedirectTarget}. */
export function canonicalHostRedirect() {
  return (req: ExpressRequest, res: ExpressResponse, next: Next): unknown => {
    const originalUrl = String(req.originalUrl || req.url || '/');
    const queryIndex = originalUrl.indexOf('?');
    const target = canonicalRedirectTarget({
      host: header(req, 'host') || req.hostname || '',
      forwardedProto: header(req, 'x-forwarded-proto'),
      protocol: req.protocol,
      method: req.method,
      path: queryIndex >= 0 ? originalUrl.slice(0, queryIndex) : originalUrl,
      search: queryIndex >= 0 ? originalUrl.slice(queryIndex) : '',
    });
    if (!target) return next();
    try {
      res.setHeader?.('Cache-Control', 'public, max-age=3600');
      res.setHeader?.('Vary', 'Host');
    } catch {
      // Header writes are best-effort.
    }
    return res.redirect(CANONICAL_STATUS, target);
  };
}

export { CANONICAL_STATUS };
