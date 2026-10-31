export function trimSlashes(s: string): string {
  return s.replace(/^\/+|\/+$/g, '');
}

export type SiteLocation = {
  search?: string;
  hostname?: string;
  href?: string;
  origin?: string;
};

/** Query links and salon subdomains resolve to a published salon. Platform
 * hosts, preview URLs, apex domains, and reserved app labels stay on StudioFlow.
 */
export function resolveSiteSlug(location?: SiteLocation | string | null): string | null {
  if (typeof location === 'string') {
    const value = location.trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) {
      try {
        return resolveSiteSlug(new URL(value));
      } catch {
        return null;
      }
    }
    const path = value.split('?')[0];
    return trimSlashes(path).split('/')[0]?.toLowerCase() || null;
  }

  if (!location) return null;

  const query = new URLSearchParams(location.search || '').get('site')?.trim().toLowerCase();
  if (query && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(query)) return query;

  let host = location.hostname || '';
  if (!host) {
    try {
      host = new URL(location.href || location.origin || '').hostname;
    } catch {
      return null;
    }
  }

  host = host.toLowerCase().replace(/\.$/, '');
  if (
    /localhost$|\.run\.app$|\.e2b\.app$|\.vercel\.app$|\.netlify\.app$|\.pages\.dev$|\.web\.app$|\.onrender\.com$|\.railway\.app$|\.herokuapp\.com$|\.azurewebsites\.net$|\.amplifyapp\.com$|\.cloudfront\.net$|\.chatgpt\.site$|^\d+(?:\.\d+){3}$/.test(host)
  ) {
    return null;
  }

  const parts = host.split('.');
  const slug = parts[0];
  const reserved = ['www', 'app', 'api', 'admin', 'auth', 'docs', 'status', 'support', 'mail', 'cdn', 'assets', 'static', 'blog', 'help'];
  if (parts.length < 3 || reserved.includes(slug)) return null;

  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) ? slug : null;
}
