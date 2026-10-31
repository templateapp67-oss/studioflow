export function trimSlashes(s: string): string {
  return s.replace(/^\/+|\/+$/g, '');
}
type SiteLocation = {search?: string; hostname?: string; href?: string; origin?: string};

/** Query links and salon subdomains; preview/apex hosts always open the app. */
export function resolveSiteSlug(location?: SiteLocation | string): string | null {
  if (typeof location === 'string') return trimSlashes(location).split('/')[0] || null;
  if (!location) return null;
  const query = new URLSearchParams(location.search || '').get('site')?.trim().toLowerCase();
  if (query && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(query)) return query;
  let host = location.hostname || '';
  if (!host) { try { host = new URL(location.href || location.origin || '').hostname; } catch { return null; } }
  host = host.toLowerCase();
  if (/localhost$|\.run\.app$|\.e2b\.app$|\.vercel\.app$|\.netlify\.app$|\.pages\.dev$|\.web\.app$|\.onrender\.com$|\.railway\.app$|^\d+(?:\.\d+){3}$/.test(host)) return null;
  const parts = host.split('.');
  const slug = parts[0];
  if (parts.length < 3 || ['www', 'app', 'api', 'admin', 'auth'].includes(slug)) return null;
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) ? slug : null;
}
