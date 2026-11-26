/**
 * Server-side `X-Robots-Tag` headers for private, admin, staff, API, auth and
 * query-string app/session routes.
 *
 * Precedence matches `vercel.json` exactly:
 *   1. Private prefixes (`/api`, `/admin`, `/owner`, `/staff` + subpaths)
 *      -> `noindex, nofollow`.
 *   2. Any URL carrying an app/session query key (`app`, `customer`, `customer_ref`, `owner`,
 *      `panel`, `create`, `module`, `invite`, `recovery`, case-insensitive)
 *      -> `noindex, nofollow` (takes precedence even when combined with
 *      `?site=<slug>` or `/login`).
 *   3. Auth documents (`/login`, `/login.html`, `/sign-in`, `/sign-up`,
 *      with or without trailing slash) -> `noindex, follow`.
 *   4. All other public routes (`/`, marketing pages, template pages,
 *      `/sitemap.xml`, `/?site=<slug>`) -> no header (indexable).
 */
import {
  hasNoIndexPathPrefix,
  hasNoIndexQueryParams,
  NOINDEX_PATH_PREFIXES,
  NOINDEX_QUERY_KEYS,
} from '../src/lib/publicSeo.js';

export const NOINDEX_NOFOLLOW = 'noindex, nofollow';
export const NOINDEX_FOLLOW = 'noindex, follow';
export { NOINDEX_PATH_PREFIXES, NOINDEX_QUERY_KEYS };

const AUTH_PATHS = new Set(['/login', '/login.html', '/sign-in', '/sign-up']);

function normalisePath(value: string | null | undefined): string {
  const raw = String(value || '').trim();
  if (!raw.startsWith('/')) return '/';
  const collapsed = raw.replace(/\/{2,}/g, '/').toLowerCase();
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
}

/**
 * Returns the `X-Robots-Tag` header value for a request path/query, or `null`
 * when the response should remain indexable.
 */
export function robotsTagForRequest(
  path: string | null | undefined,
  search?: string | null,
): string | null {
  const normalised = normalisePath(path);

  if (hasNoIndexPathPrefix(normalised)) {
    return NOINDEX_NOFOLLOW;
  }

  if (hasNoIndexQueryParams(search)) {
    return NOINDEX_NOFOLLOW;
  }

  if (AUTH_PATHS.has(normalised)) {
    return NOINDEX_FOLLOW;
  }

  return null;
}

type ExpressRequest = {
  originalUrl?: string;
  url?: string;
};

type ExpressResponse = {
  setHeader?: (name: string, value: string) => unknown;
};

type Next = (error?: unknown) => void;

/** Express middleware that attaches `X-Robots-Tag` to private/app responses. */
export function robotsHeaderMiddleware() {
  return (req: ExpressRequest, res: ExpressResponse, next: Next): void => {
    const rawUrl = String(req.originalUrl || req.url || '/');
    const queryIndex = rawUrl.indexOf('?');
    const path = queryIndex >= 0 ? rawUrl.slice(0, queryIndex) : rawUrl;
    const search = queryIndex >= 0 ? rawUrl.slice(queryIndex) : '';
    const tag = robotsTagForRequest(path, search);
    if (tag) {
      res.setHeader?.('X-Robots-Tag', tag);
    }
    next();
  };
}
