export function trimSlashes(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.replace(/^\/+|\/+$/g, "");
}

export function resolveSiteSlug(
  input?: string | { hostname?: string; search?: string; pathname?: string; href?: string } | null
): string {
  if (!input) return '';

  let hostname = '';
  let search = '';
  let pathname = '';

  if (typeof input === 'string') {
    pathname = input;
    if (input.includes('?')) {
      const parts = input.split('?');
      pathname = parts[0];
      search = '?' + parts.slice(1).join('?');
    }
  } else if (typeof input === 'object' && input !== null) {
    hostname = input.hostname || '';
    search = input.search || '';
    pathname = input.pathname || '';
  }

  // 1. Check URL query params: ?site=slug or ?s=slug or ?subdomain=slug
  if (search) {
    try {
      const params = new URLSearchParams(search);
      const site = params.get('site') || params.get('s') || params.get('subdomain');
      if (site) return site.trim();
    } catch {
      // ignore
    }
  }

  // 2. Check hostname subdomains: e.g. vogue-noir-studio.salon-platform.com or vogue-noir-studio.localhost
  if (hostname) {
    const parts = hostname.toLowerCase().split('.');
    if (parts.length >= 2) {
      const sub = parts[0];
      if (sub && sub !== 'localhost' && sub !== 'www' && sub !== 'ais-dev' && sub !== 'ais-pre' && sub !== 'studioflow') {
        return sub.trim();
      }
    }
  }

  // 3. Check pathname: e.g. /vogue-noir-studio/about -> vogue-noir-studio
  if (pathname) {
    const clean = trimSlashes(pathname);
    if (clean) {
      const parts = clean.split('/');
      const first = parts[0];
      if (first && first !== 'app' && first !== 'invite' && first !== 'api') {
        return first.trim();
      }
    }
  }

  return '';
}
