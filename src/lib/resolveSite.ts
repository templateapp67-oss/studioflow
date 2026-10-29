// Tenant resolution for published salon websites.
//
// Canonical routing is the `?site=<slug>` query parameter (used by share
// links, QR codes, and the owner preview). On production hosting with
// wildcard DNS (e.g. Vercel `*.salon-platform.com`), the first hostname label
// is also accepted as a tenant alias: `<slug>.salon-platform.com`.
// Resolution is synchronous and crash-safe (SSR/test stubs may omit
// `hostname` or `location` entirely), so unknown hosts always fall through to
// the owner app instead of throwing.
export interface SiteLocation {
  search?: string;
  hostname?: string;
  href?: string;
  origin?: string;
}

const PLATFORM_SUFFIXES = [
  '.vercel.app', '.netlify.app', '.pages.dev', '.web.app',
  '.herokuapp.com', '.azurewebsites.net', '.onrender.com',
  '.railway.app', '.amplifyapp.com', '.cloudfront.net', '.e2b.app',
];
const RESERVED_LABELS = new Set([
  'www', 'app', 'api', 'admin', 'docs', 'status', 'support',
  'mail', 'cdn', 'assets', 'static', 'blog', 'help',
]);
const SLUG_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function hostnameFrom(loc: SiteLocation): string {
  if (loc.hostname && loc.hostname.trim()) return loc.hostname.trim().toLowerCase();
  const raw = loc.href || loc.origin || '';
  const match = raw.match(/^https?:\/\/([^/?#:]+)/i);
  return (match ? match[1] : '').toLowerCase();
}

export function resolveSiteSlug(loc?: SiteLocation | null): string | null {
  if (loc) {
    const query = new URLSearchParams(loc.search || '').get('site');
    if (query && query.trim()) return query.trim().toLowerCase();
  }
  const host = hostnameFrom(loc || {});
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.run.app')) return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) return null;
  if (PLATFORM_SUFFIXES.some((suffix) => host.endsWith(suffix))) return null;
  const parts = host.split('.');
  if (parts.length < 3) return null; // Apex/root domains serve the owner app.
  const label = parts[0];
  if (!label || RESERVED_LABELS.has(label) || label.length < 2) return null;
  return SLUG_LABEL.test(label) ? label : null;
}
