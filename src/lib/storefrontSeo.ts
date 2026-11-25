export type StorefrontSeoProfile = {
  businessType?: string;
  businessName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  ownerName?: string;
  ownerRole?: string;
  ownerPhotoUrl?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  customDomain?: string;
  instagramHandle?: string;
  facebookPage?: string;
  youtubeChannel?: string;
  tiktokProfile?: string;
  googleBusinessUrl?: string;
  seo?: {
    canonicalUrl?: string;
  };
};

export type StorefrontCanonicalInput = {
  profile: StorefrontSeoProfile;
  origin: string;
  pathname: string;
  slug: string;
  viaQuery: boolean;
};

/**
 * Public salon canonicals must stay on the host that actually serves the
 * storefront. A salon can use its verified custom domain because that domain
 * becomes the request host; a profile-supplied arbitrary HTTPS URL is never
 * trusted as a canonical target.
 */
export function buildStorefrontCanonicalUrl(input: StorefrontCanonicalInput): string {
  const { profile, origin, pathname, slug, viaQuery } = input;
  let requestOrigin: URL;
  try {
    requestOrigin = new URL(origin);
  } catch {
    requestOrigin = new URL('https://nexorasalon.online');
  }

  const localHost = requestOrigin.hostname === 'localhost' || requestOrigin.hostname === '127.0.0.1';
  if (requestOrigin.protocol !== 'https:' && !localHost) {
    requestOrigin = new URL('https://nexorasalon.online');
  }

  const expectedPath = viaQuery ? '/' : (pathname.startsWith('/') ? pathname : '/' + pathname);
  const fallback = new URL(expectedPath, requestOrigin.origin);
  if (viaQuery && slug) fallback.searchParams.set('site', slug);

  const configured = typeof profile.seo?.canonicalUrl === 'string'
    ? profile.seo.canonicalUrl.trim()
    : '';
  if (!configured) return fallback.toString();

  try {
    const candidate = new URL(configured);
    if (
      candidate.protocol !== requestOrigin.protocol ||
      candidate.origin !== requestOrigin.origin ||
      candidate.username ||
      candidate.password ||
      candidate.hash
    ) return fallback.toString();

    const normalisePath = (path: string) => path.length > 1 ? path.replace(/\/+$/, '') : '/';
    if (normalisePath(candidate.pathname) !== normalisePath(expectedPath)) return fallback.toString();

    if (viaQuery) {
      const keys = [...candidate.searchParams.keys()];
      if (
        keys.length !== 1 ||
        keys[0] !== 'site' ||
        candidate.searchParams.get('site') !== slug
      ) return fallback.toString();
    } else if (candidate.search) {
      return fallback.toString();
    }

    return candidate.toString();
  } catch {
    return fallback.toString();
  }
}

function safeHttpsUrl(value: unknown, allowedHosts: string[]): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (url.protocol !== 'https:' || url.username || url.password || !allowedHosts.includes(host)) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

function socialProfileUrl(value: unknown, base: string, allowedHosts: string[]): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const raw = value.trim();
  if (/^https:\/\//i.test(raw)) return safeHttpsUrl(raw, allowedHosts);
  const handle = raw.replace(/^@/, '').replace(/^\/+|\/+$/g, '');
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(handle)) return undefined;
  return base + encodeURIComponent(handle) + '/';
}

/** Only known, public profile URLs are emitted as schema.org sameAs values. */
export function storefrontSameAs(profile: StorefrontSeoProfile): string[] {
  const values = [
    socialProfileUrl(profile.instagramHandle, 'https://www.instagram.com/', ['instagram.com']),
    safeHttpsUrl(profile.facebookPage, ['facebook.com', 'fb.com']),
    safeHttpsUrl(profile.youtubeChannel, ['youtube.com', 'youtu.be']),
    socialProfileUrl(profile.tiktokProfile, 'https://www.tiktok.com/@', ['tiktok.com']),
    safeHttpsUrl(profile.googleBusinessUrl, ['google.com', 'business.google.com', 'maps.app.goo.gl', 'g.page']),
  ].filter((value): value is string => Boolean(value));
  return [...new Set(values)];
}

function safePublicImage(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim(), 'https://nexorasalon.online');
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/** Shared LocalBusiness schema used by server-rendered HTML and SPA hydration. */
export function buildStorefrontBusinessSchema(
  profile: StorefrontSeoProfile,
  canonical: string,
  description: string,
  image?: string,
): Record<string, unknown> {
  const schemaTypeByBusiness: Record<string, string> = {
    hair_salon: 'HairSalon',
    barber: 'BarberShop',
    beauty_parlour: 'BeautySalon',
    aurelia_beauty_parlour: 'BeautySalon',
    nail_studio: 'NailSalon',
    tattoo_studio: 'TattooParlor',
  };

  const address: Record<string, string> = {};
  if (profile.address) address.streetAddress = String(profile.address);
  if (profile.city) address.addressLocality = String(profile.city);
  if (profile.state) address.addressRegion = String(profile.state);
  if (profile.postalCode) address.postalCode = String(profile.postalCode);
  if (Object.keys(address).length) address.addressCountry = 'IN';

  const latitude = Number(profile.latitude);
  const longitude = Number(profile.longitude);
  const hasGeo = Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 &&
    (latitude !== 0 || longitude !== 0);

  const safeImage = safePublicImage(image || profile.coverImageUrl || profile.logoUrl);
  const logo = safePublicImage(profile.logoUrl);
  const sameAs = storefrontSameAs(profile);
  const ownerName = typeof profile.ownerName === 'string' ? profile.ownerName.trim() : '';
  const ownerRole = typeof profile.ownerRole === 'string' ? profile.ownerRole.trim() : '';
  const ownerImage = safePublicImage(profile.ownerPhotoUrl);

  return {
    '@context': 'https://schema.org',
    '@type': schemaTypeByBusiness[String(profile.businessType || '')] || 'HealthAndBeautyBusiness',
    name: profile.businessName || 'Salon',
    description,
    url: canonical,
    ...(profile.phone ? { telephone: profile.phone } : {}),
    ...(safeImage ? { image: safeImage } : {}),
    ...(logo ? { logo } : {}),
    ...(Object.keys(address).length ? { address: { '@type': 'PostalAddress', ...address } } : {}),
    ...(hasGeo ? { geo: { '@type': 'GeoCoordinates', latitude, longitude } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(safeHttpsUrl(profile.googleBusinessUrl, ['google.com', 'business.google.com', 'maps.app.goo.gl', 'g.page'])
      ? { hasMap: safeHttpsUrl(profile.googleBusinessUrl, ['google.com', 'business.google.com', 'maps.app.goo.gl', 'g.page']) }
      : {}),
    ...(ownerName ? {
      employee: {
        '@type': 'Person',
        name: ownerName,
        ...(ownerRole ? { jobTitle: ownerRole } : {}),
        ...(ownerImage ? { image: ownerImage } : {}),
      },
    } : {}),
  };
}
