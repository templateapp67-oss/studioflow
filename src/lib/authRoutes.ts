/**
 * Auth entry routes.
 *
 * `/login` remains the canonical document (it is prerendered from
 * `login.html`, carries `NEXORA_LOGIN_SEO` and is what every email, OAuth and
 * password-recovery link returns to). The friendly aliases `/sign-in` and
 * `/sign-up` are supported for campaigns and Google-ads landing pages, and
 * every alias maps onto the same `AuthPage` mode without duplicating the flow.
 *
 * Keeping this mapping in one module means the router, the application shell
 * and `AuthPage` cannot disagree about which paths are auth entries.
 */

export type AuthEntryMode = 'signin' | 'signup';

const AUTH_ALIAS_ROUTES: Readonly<Record<string, AuthEntryMode>> = {
  '/sign-in': 'signin',
  '/sign-up': 'signup',
};

/** The one auth document that owns metadata, canonical URL and prerendering. */
export const AUTH_DOCUMENT_PATH = '/login';

export function normaliseAuthPath(pathname: string): string {
  const trimmed = (pathname || '/').replace(/\/+$/, '');
  return trimmed || '/';
}

/** `signin`/`signup` for an alias path, otherwise `null`. */
export function authModeForPath(pathname: string): AuthEntryMode | null {
  return AUTH_ALIAS_ROUTES[normaliseAuthPath(pathname)] || null;
}

/** True for `/login`, `/sign-in` and `/sign-up` (with or without a trailing slash). */
export function isAuthEntryPath(pathname: string): boolean {
  const path = normaliseAuthPath(pathname);
  return path === AUTH_DOCUMENT_PATH || Object.prototype.hasOwnProperty.call(AUTH_ALIAS_ROUTES, path);
}

/**
 * Query keys on `/login`, `/sign-in` or `/sign-up` that target a specific
 * customer, salon site, invite, recovery or workspace deep link rather than a
 * plain owner sign-in.
 */
const TARGETED_AUTH_QUERY_KEYS = [
  'site',
  's',
  'subdomain',
  'app',
  'customer',
  'customer_ref',
  'invite',
  'owner',
  'panel',
  'module',
  'recovery',
] as const;

/**
 * True when `pathname` is `/login`, `/sign-in` or `/sign-up` and `search` has
 * no customer, invite, recovery, salon-site or workspace deep-link query
 * parameter. Callers also check resolved template/pricing/compact overrides.
 */
export function isPlainOwnerAuthLocation(pathname: string, search = ''): boolean {
  if (!isAuthEntryPath(pathname)) return false;
  const params = new URLSearchParams(search || '');
  if (params.get('create') === '1') return false;
  return !TARGETED_AUTH_QUERY_KEYS.some((key) => params.has(key));
}

/**
 * Path a provider should return to after Google OAuth or an email link.
 *
 * Alias visitors come back to the canonical `/login?auth=signin|signup` URL so
 * the prerendered login document (and its `noindex` metadata) is served, while
 * an existing `/login` entry keeps its exact path and query untouched.
 */
export function authCallbackPath(pathname: string, cleanSearch = ''): string {
  const search = cleanSearch || '';
  const mode = authModeForPath(pathname);
  if (!mode) return normaliseAuthPath(pathname) + search;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  params.set('auth', mode);
  return `${AUTH_DOCUMENT_PATH}?${params.toString()}`;
}

/** Paths the server and Vercel rewrites must serve from the login document. */
export const AUTH_DOCUMENT_PATHS: readonly string[] = [
  AUTH_DOCUMENT_PATH,
  ...Object.keys(AUTH_ALIAS_ROUTES),
];
