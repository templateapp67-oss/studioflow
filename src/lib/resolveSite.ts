export function trimSlashes(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.replace(/^\/+|\/+$/g, "");
}

export function resolveSiteSlug(
  input?: string | { hostname?: string; search?: string; pathname?: string; href?: string; origin?: string } | null
): string | null {
  if (!input) return null;

  let hostname = '';
  let search = '';
  let pathname = '';
  let href = '';
  let origin = '';

  if (typeof input === 'string') {
    href = input;
    if (input.includes('?')) {
      const parts = input.split('?');
      pathname = parts[0];
      search = '?' + parts.slice(1).join('?');
    } else {
      pathname = input;
    }
  } else if (typeof input === 'object' && input !== null) {
    hostname = input.hostname || '';
    search = input.search || '';
    pathname = input.pathname || '';
    href = input.href || '';
    origin = input.origin || '';
  }

  if (!hostname && href) {
    try {
      const u = new URL(href);
      hostname = u.hostname;
      if (!search && u.search) search = u.search;
      if (!pathname && u.pathname) pathname = u.pathname;
    } catch {
      // ignore
    }
  }
  if (!hostname && origin) {
    try {
      const u = new URL(origin);
      hostname = u.hostname;
    } catch {
      // ignore
    }
  }

  // 1. Check URL query params: ?site=slug or ?s=slug or ?subdomain=slug
  if (search) {
    try {
      const params = new URLSearchParams(search);
      const site = params.get('site') || params.get('s') || params.get('subdomain');
      if (site) {
        const trimmed = site.trim();
        return trimmed ? trimmed.toLowerCase() : null;
      }
    } catch {
      // ignore
    }
  }

  // 2. Check hostname subdomains
  if (hostname) {
    const lowerHost = hostname.toLowerCase();

    if (
      lowerHost === 'nexora.app' ||
      lowerHost === 'www.nexora.app' ||
      lowerHost === 'nexorasalon.online' ||
      lowerHost === 'www.nexorasalon.online' ||
      lowerHost === 'localhost' ||
      lowerHost === '127.0.0.1' ||
      lowerHost.endsWith('.e2b.app') ||
      lowerHost.endsWith('.vercel.app') ||
      lowerHost.endsWith('.chatgpt.site')
    ) {
      return null;
    }

    const parts = lowerHost.split('.');
    // e.g. glow-studio.nexora.app -> length 4 ['glow-studio', 'nexora', 'app']
    // vijaysalojaipur.nexorasalon.online -> length 3 ['vijaysalojaipur', 'nexorasalon', 'online']
    if (parts.length >= 3) {
      const sub = parts[0];
      if (
        sub &&
        sub !== 'www' &&
        sub !== 'app' &&
        sub !== 'ais-dev' &&
        sub !== 'ais-pre' &&
        sub !== 'studioflow' &&
        sub.length > 1 &&
        /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(sub)
      ) {
        return sub;
      }
    }
  }

  // 3. Check pathname
  if (pathname) {
    const clean = trimSlashes(pathname);
    if (clean) {
      const parts = clean.split('/');
      const first = parts[0]?.toLowerCase();
      if (
        first &&
        first !== 'app' &&
        first !== 'invite' &&
        first !== 'api' &&
        first.length > 1 &&
        /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(first)
      ) {
        return first;
      }
    }
  }

  return null;
}
