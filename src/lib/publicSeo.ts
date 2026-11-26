/** Canonical public production origin already used by NEXORA account and customer links. */
import { nexoraOrganizationSchema } from './nexoraOrganization.js';

export const NEXORA_PUBLIC_ORIGIN = 'https://nexorasalon.online';
export const NEXORA_HOME_OG_IMAGE = `${NEXORA_PUBLIC_ORIGIN}/nexora-homepage-og.jpg`;

const NEXORA_HOME_TITLE = 'NEXORA SalonOS | Salon Website Builder';
const NEXORA_HOME_DESCRIPTION = 'Create a salon website with 16 NEXORA templates and manage appointments, customers, billing, staff, inventory and marketing.';

export const NEXORA_HOME_SEO = {
  title: NEXORA_HOME_TITLE,
  description: NEXORA_HOME_DESCRIPTION,
  ogTitle: NEXORA_HOME_TITLE,
  ogDescription: NEXORA_HOME_DESCRIPTION,
  twitterTitle: NEXORA_HOME_TITLE,
  twitterDescription: NEXORA_HOME_DESCRIPTION,
  canonicalUrl: `${NEXORA_PUBLIC_ORIGIN}/`,
  robots: 'index,follow',
} as const;

export const NEXORA_LOGIN_SEO = {
  title: 'NEXORA Salon OS — Sign in',
  description: 'Sign in to NEXORA to keep your website, team and business data with your account across devices.',
  ogTitle: 'NEXORA Salon OS — Sign in',
  ogDescription: 'Sign in to NEXORA to keep your website, team and business data with your account across devices.',
  twitterTitle: 'NEXORA Salon OS — Sign in',
  twitterDescription: 'Sign in to NEXORA to keep your website, team and business data with your account across devices.',
  canonicalUrl: `${NEXORA_PUBLIC_ORIGIN}/login`,
  robots: 'noindex,follow',
} as const;

export type PublicSeoPage = typeof NEXORA_HOME_SEO | typeof NEXORA_LOGIN_SEO;

export const NOINDEX_ROBOTS = 'noindex, nofollow';

/** Path prefixes that must never be indexed on either server or client. */
export const NOINDEX_PATH_PREFIXES = ['/api', '/admin', '/owner', '/staff'] as const;

/** Query parameters that switch a URL into a non-indexable app or session flow. */
export const NOINDEX_QUERY_KEYS = [
  'app',
  'customer',
  'customer_ref',
  'owner',
  'panel',
  'create',
  'module',
  'invite',
  'recovery',
] as const;

const NOINDEX_QUERY_KEY_SET = new Set<string>(NOINDEX_QUERY_KEYS);

const ROUTE_MANAGED_JSONLD_IDS = [
  'studioflow-seo-jsonld',
  'nexora-salonos-jsonld',
  'nexora-pricing-faq-jsonld',
  'nexora-ecosystem-jsonld',
  'nexora-home-jsonld',
] as const;

const ROUTE_MANAGED_JSONLD_SET = new Set<string>(ROUTE_MANAGED_JSONLD_IDS);

const NEXORA_HOME_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    nexoraOrganizationSchema(NEXORA_PUBLIC_ORIGIN),
    {
      '@type': 'SoftwareApplication',
      name: 'NEXORA Salon OS',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: `${NEXORA_PUBLIC_ORIGIN}/`,
      description: 'Create and manage a salon website with customisable salon, spa and beauty-business templates.',
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${NEXORA_PUBLIC_ORIGIN}/#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${NEXORA_PUBLIC_ORIGIN}/`,
        },
      ],
    },
  ],
} as const;

/** Case- and slash-normalised check for private/admin/owner/staff/API paths. */
export function hasNoIndexPathPrefix(pathname?: string | null): boolean {
  if (!pathname) return false;
  const trimmed = String(pathname).trim();
  if (!trimmed.startsWith('/')) return false;
  const collapsed = trimmed.replace(/\/{2,}/g, '/').toLowerCase();
  const normalised = collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
  return NOINDEX_PATH_PREFIXES.some(
    (prefix) => normalised === prefix || normalised.startsWith(`${prefix}/`),
  );
}

/** Case-insensitive check for app/session query keys that must never be indexed. */
export function hasNoIndexQueryParams(search?: string | null): boolean {
  if (!search) return false;
  try {
    const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    for (const key of query.keys()) {
      if (NOINDEX_QUERY_KEY_SET.has(key.toLowerCase())) return true;
    }
  } catch {
    // Malformed query strings fall through safely.
  }
  return false;
}

function hasDomHead(): boolean {
  return (
    typeof document !== 'undefined' &&
    Boolean(document.head) &&
    typeof document.createElement === 'function' &&
    typeof document.querySelector === 'function'
  );
}

/**
 * Writes a single `<meta name="robots">` tag and removes any duplicate robots
 * tags (including case variants) so crawlers never observe conflicting signals.
 */
export function setRobotsMeta(content: string) {
  if (!hasDomHead()) return;

  let matches: HTMLMetaElement[] = [];
  if (typeof document.querySelectorAll === 'function') {
    matches = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name]')).filter(
      (element) => element.getAttribute('name')?.toLowerCase() === 'robots',
    );
  }
  if (!matches.length) {
    const existing = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (existing) matches = [existing];
  }

  let primary = matches[0] ?? null;
  for (let i = 1; i < matches.length; i += 1) {
    matches[i]?.remove?.();
  }
  if (!primary) {
    primary = document.createElement('meta');
    primary.setAttribute('name', 'robots');
    document.head.appendChild(primary);
  }
  primary.setAttribute('content', content);
}

/**
 * Writes a single `<link rel="canonical">` tag and removes any duplicate
 * canonical links in `document.head`.
 */
export function setCanonicalLink(href: string) {
  if (!hasDomHead()) return;

  let matches: HTMLLinkElement[] = [];
  if (typeof document.querySelectorAll === 'function') {
    matches = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel]')).filter(
      (element) => element.getAttribute('rel')?.toLowerCase() === 'canonical',
    );
  }
  if (!matches.length) {
    const existing = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (existing) matches = [existing];
  }

  let primary = matches[0] ?? null;
  for (let i = 1; i < matches.length; i += 1) {
    matches[i]?.remove?.();
  }
  if (!primary) {
    primary = document.createElement('link');
    primary.setAttribute('rel', 'canonical');
    document.head.appendChild(primary);
  }
  primary.setAttribute('href', href);
}

/** Removes all `<link rel="canonical">` elements from the document. */
export function clearCanonicalLinks() {
  if (!hasDomHead()) return;
  if (typeof document.querySelectorAll === 'function') {
    for (const element of Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel]'))) {
      if (element.getAttribute('rel')?.toLowerCase() === 'canonical') {
        element.remove?.();
      }
    }
    return;
  }
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.remove?.();
}

/** Removes stale route-managed and prerendered head JSON-LD scripts except an optional owned id. */
export function clearRouteJsonLd(keepId?: string) {
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
  for (const id of ROUTE_MANAGED_JSONLD_IDS) {
    if (id === keepId) continue;
    document.getElementById(id)?.remove?.();
  }
  if (document.head && typeof document.head.querySelectorAll === 'function') {
    for (const script of Array.from(document.head.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'))) {
      if (!script.id || (script.id !== keepId && ROUTE_MANAGED_JSONLD_SET.has(script.id))) {
        script.remove?.();
      }
    }
  }
}

/**
 * Marks app/session flows, authenticated workspaces, and admin/staff screens as
 * non-indexable even when they boot from `index.html` (which carries
 * `index,follow` and the homepage canonical for `/`).
 */
export function applyNoIndexMetadata(title?: string) {
  if (!hasDomHead()) return;
  if (title) document.title = title;

  setRobotsMeta(NOINDEX_ROBOTS);
  // Never combine `noindex` with a canonical pointing at the public homepage.
  clearCanonicalLinks();
  clearRouteJsonLd();
}

/** Applies route-owned public metadata without deriving canonical URLs from preview hosts. */
export function applyPublicSeoMetadata(page: PublicSeoPage) {
  if (!hasDomHead()) return;
  document.title = page.title;

  const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
    let element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, key);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  setCanonicalLink(page.canonicalUrl);
  setMeta('name', 'description', page.description);
  setRobotsMeta(page.robots);
  setMeta('property', 'og:type', 'website');
  setMeta('property', 'og:site_name', 'NEXORA Salon OS');
  setMeta('property', 'og:title', page.ogTitle);
  setMeta('property', 'og:description', page.ogDescription);
  setMeta('property', 'og:url', page.canonicalUrl);
  setMeta('property', 'og:image', NEXORA_HOME_OG_IMAGE);
  setMeta('property', 'og:image:width', '1200');
  setMeta('property', 'og:image:height', '630');
  setMeta('property', 'og:image:alt', 'NEXORA Salon OS salon website template preview');
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', page.twitterTitle);
  setMeta('name', 'twitter:description', page.twitterDescription);
  setMeta('name', 'twitter:image', NEXORA_HOME_OG_IMAGE);
  setMeta('name', 'twitter:image:alt', 'NEXORA Salon OS salon website template preview');

  // Published salon & sub-route schemas must not leak back into root/login routes.
  if (page === NEXORA_HOME_SEO) {
    clearRouteJsonLd('nexora-home-jsonld');
    let homeSchema = typeof document.getElementById === 'function'
      ? (document.getElementById('nexora-home-jsonld') as HTMLScriptElement | null)
      : null;
    if (!homeSchema) {
      homeSchema = document.createElement('script');
      homeSchema.id = 'nexora-home-jsonld';
      homeSchema.type = 'application/ld+json';
      document.head.appendChild(homeSchema);
    }
    homeSchema.textContent = JSON.stringify(NEXORA_HOME_JSONLD);
  } else {
    clearRouteJsonLd();
  }
}
