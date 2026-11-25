import { normalizeCanonicalUrl, normalizeSeoDescription, normalizeSeoTitle } from '../src/lib/seoText.js';

type RequestLike = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
};
type ResponseLike = {
  status(code: number): ResponseLike;
  setHeader(name: string, value: string): void;
  send(body: string): void;
  end(): void;
};

type Renderer = {
  renderPublishedSalonHtml(content: unknown, slug: string): {
    html: string;
    preloadTags: string[];
    profile: Record<string, any>;
    normalizedContent: Record<string, any>;
    site: Record<string, any>;
  };
  getStorefrontAssetTags(): string;
  getStorefrontShellHtml(): string;
};

// This is deliberately a public-key read. The database view exposes only
// published slug/content/timestamp columns and has its own anonymous RLS grant.
// Never use a service-role or Supabase secret key for storefront rendering.
const EXPECTED_SUPABASE_HOST = 'zilwgiuiygqqardzutxi.supabase.co';
// Published-site SSR intentionally reads the verified production App project.
// Do not inherit environment-specific Preview/QA overrides for public websites.
const SUPABASE_URL = 'https://zilwgiuiygqqardzutxi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Xck8H8PcTCCnEwkvBfiSLw_c973vJkH';

let supabaseClient: any = null;
let supabaseClientPromise: Promise<any> | null = null;

async function getSupabaseClient(): Promise<any> {
  if (supabaseClient) return supabaseClient;
  if (!supabaseClientPromise) {
    supabaseClientPromise = (async () => {
      const supabaseUrl = new URL(SUPABASE_URL);
      if (supabaseUrl.protocol !== 'https:' || supabaseUrl.hostname !== EXPECTED_SUPABASE_HOST) {
        throw new Error('Published salon SSR must use the reviewed NEXORA production Supabase project.');
      }
      if (!SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY.startsWith('sb_secret_')) {
        throw new Error('Published salon SSR requires a public Supabase publishable key.');
      }
      const { createClient } = await import('@supabase/supabase-js');
      return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
    })().then((client) => {
      supabaseClient = client;
      return client;
    }).catch((error) => {
      supabaseClientPromise = null;
      throw error;
    });
  }
  return supabaseClientPromise;
}

let renderer: Renderer | null = null;

async function getRenderer(): Promise<Renderer> {
  if (renderer) return renderer;
  // Keep Node-only imports lazy so the Vercel request handler can start and
  // report a controlled error if an optional SSR asset is unavailable.
  const [{ resolve }, { pathToFileURL }] = await Promise.all([
    import('node:path'),
    import('node:url'),
  ]);
  const rendererUrl = pathToFileURL(resolve(process.cwd(), 'dist/storefront-renderer.cjs')).href;
  const loaded = await import(rendererUrl);
  renderer = (loaded.default || loaded) as Renderer;
  return renderer;
}

const RESERVED_PATHS = new Set([
  'about', 'admin', 'api', 'app', 'assets', 'fonts', 'growth-partner-rewards', 'index.html',
  'invite', 'login', 'partner-rewards', 'pricing', 'privacy', 'salon-growth',
  'salon-onboarding', 'salon-os', 'sign-in', 'sign-up', 'staff', 'template-pages',
  'templates',
]);
const PLATFORM_HOSTS = new Set([
  'nexorasalon.online', 'www.nexorasalon.online', 'nexora.app', 'www.nexora.app',
  'localhost', '127.0.0.1',
]);

function firstHeader(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value || '').split(',')[0].trim();
}

function getRequestOrigin(req: RequestLike): { origin: string; hostname: string } {
  // Vercel supplies the Host header for the domain the request actually hit.
  // Do not let a caller-controlled forwarded-host value redirect the server's
  // asset fetch or influence canonical URLs.
  const rawHost = firstHeader(req.headers.host) || 'nexorasalon.online';
  const host = rawHost.toLowerCase().replace(/\.$/, '');
  if (!/^[a-z0-9.-]+(?::[0-9]{1,5})?$/.test(host)) {
    return { origin: 'https://nexorasalon.online', hostname: 'nexorasalon.online' };
  }
  const hostname = host.replace(/:[0-9]+$/, '');
  // Vercel custom domains are served over HTTPS; retain HTTP only for local dev.
  const protocol = hostname === 'localhost' || hostname === '127.0.0.1' ? 'http' : 'https';
  return { origin: protocol + '://' + host, hostname };
}

function validSlug(value: string): string | null {
  const slug = value.trim().toLowerCase();
  return slug.length > 1 && slug.length <= 63 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug) ? slug : null;
}

export function resolveStorefrontSlug(url: URL, hostname: string): string | null {
  // The app/customer query routes deliberately open the full customer app.
  // They must not be mistaken for a public salon storefront even when a
  // `site` selector is also present (for example /?app=1&site=my-salon).
  if (['app', 'customer', 'customer_ref'].some((key) => url.searchParams.has(key))) return null;
  const explicit = url.searchParams.get('site') || url.searchParams.get('s') || url.searchParams.get('subdomain');
  if (explicit) return validSlug(explicit);

  if (!PLATFORM_HOSTS.has(hostname) && !hostname.endsWith('.vercel.app') &&
      !hostname.endsWith('.e2b.app') && !hostname.endsWith('.chatgpt.site')) {
    const labels = hostname.split('.');
    const candidate = labels.length >= 3 ? labels[0] : '';
    if (candidate && !['www', 'app', 'studioflow', 'ais-dev', 'ais-pre'].includes(candidate)) {
      const slug = validSlug(candidate);
      if (slug) return slug;
    }
  }

  const cleanPath = (url.searchParams.get('path') || url.pathname || '/').replace(/^\/+|\/+$/g, '');
  const firstSegment = cleanPath.split('/')[0]?.toLowerCase() || '';
  if (!firstSegment || RESERVED_PATHS.has(firstSegment) || firstSegment.includes('.')) return null;
  return validSlug(firstSegment);
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

async function sendPlatformShell(res: ResponseLike, method: string): Promise<void> {
  const html = (await getRenderer()).getStorefrontShellHtml();
  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  if (method === 'HEAD') return res.end();
  res.send(html);
}

function canonicalForRequest(profile: Record<string, any>, origin: string, pathname: string, slug: string, viaQuery: boolean): string {
  const fallback = viaQuery
    ? origin + '/?site=' + encodeURIComponent(slug)
    : origin + (pathname.startsWith('/') ? pathname : '/' + pathname);
  const configured = typeof profile.seo?.canonicalUrl === 'string' ? profile.seo.canonicalUrl : undefined;
  return normalizeCanonicalUrl(configured, fallback, [String(profile.customDomain || '')]);
}

function generateStorefrontSeoDefaults(profile: Record<string, any>) {
  const rawName = String(profile.businessName || '').trim();
  const isZiyaTemplate = profile.businessType === 'hair_salon';
  const businessName = isZiyaTemplate && (!rawName || /miraki|luxury editorial salon/i.test(rawName))
    ? 'Ziya Women’s Hair Studio'
    : rawName || 'Salon & Wellness Studio';
  const city = profile.city || '';
  const typeLabel = isZiyaTemplate ? 'Women’s Haircut Specialist Salon' : String(profile.businessType || 'salon').replace(/_/g, ' ');
  const tagline = profile.tagline || profile.about || 'Book your appointment online for premium beauty, hair, and grooming services.';
  const citySuffix = city ? ` in ${city}` : '';
  return {
    metaTitle: normalizeSeoTitle(`${businessName} – ${isZiyaTemplate ? typeLabel : `Premium ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}`}${citySuffix}`),
    metaDescription: normalizeSeoDescription(`${tagline}. Explore services, prices and online booking at ${businessName}${citySuffix}.`),
    ogTitle: normalizeSeoTitle(`${businessName}${citySuffix} | Official Website`),
    ogDescription: normalizeSeoDescription(tagline),
    ogImageUrl: profile.coverImageUrl || profile.logoUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
    keywords: [
      businessName.toLowerCase(), `${typeLabel} near me`, `${typeLabel} ${city}`.trim(),
      'salon booking', 'beauty treatment', 'hair stylist', 'appointment booking',
    ].filter(Boolean).join(', '),
    twitterCard: 'summary_large_image',
  };
}

function storefrontFavicon(branding: any, profile: any): string {
  const validImage = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return;
    const url = value.trim();
    if (/^https:/i.test(url) || url.startsWith('/template-assets/') || url.startsWith('/templates/') || url.startsWith('/assets/')) return url;
  };
  return validImage(branding?.faviconUrl)
    || validImage(profile?.logoUrl)
    || (profile?.businessType === 'makeup_studio' ? '/templates/vogue-noir/favicon.svg'
      : profile?.businessType === 'massage_wellness' ? '/templates/bodhi-tree/favicon.svg'
      : profile?.businessType === 'hair_coloring' ? '/templates/10/favicon.svg'
      : profile?.businessType === 'lash_brow' ? '/templates/13/favicon.svg'
      : '/customer-icon-192.png');
}

function renderHead(
  profile: Record<string, any>,
  site: Record<string, any>,
  canonical: string,
  seoHelpers: { generateSeoDefaults(profile: Record<string, any>): any; websiteFavicon(branding: any, profile: any): string },
): string {
  const defaults = seoHelpers.generateSeoDefaults(profile);
  const seo = profile.seo || {};
  const title = normalizeSeoTitle(seo.metaTitle || defaults.metaTitle);
  const description = normalizeSeoDescription(seo.metaDescription || defaults.metaDescription);
  const ogTitle = normalizeSeoTitle(seo.ogTitle || seo.metaTitle || defaults.ogTitle);
  const ogDescription = normalizeSeoDescription(seo.ogDescription || seo.metaDescription || defaults.ogDescription);
  const image = seo.ogImageUrl || profile.coverImageUrl || profile.logoUrl || defaults.ogImageUrl;
  const keywords = seo.keywords || defaults.keywords;
  const twitterCard = seo.twitterCard || 'summary_large_image';
  const favicon = seoHelpers.websiteFavicon(site.branding, profile);
  const address: Record<string, string> = {};
  if (profile.address) address.streetAddress = profile.address;
  if (profile.city) address.addressLocality = profile.city;
  if (profile.postalCode) address.postalCode = profile.postalCode;
  if (Object.keys(address).length) address.addressCountry = 'IN';

  const services = Array.isArray(site.services) ? site.services : [];
  const offers = services.slice(0, 40).filter((service: any) => typeof service?.name === 'string' && service.name.trim()).map((service: any) => ({
    '@type': 'Offer',
    itemOffered: { '@type': 'Service', name: service.name.trim() },
    ...(Number.isFinite(Number(service.price)) && service.price !== null && Number(service.price) >= 0 ? { price: Number(service.price), priceCurrency: 'INR' } : {}),
  }));
  const schemaTypeByBusiness: Record<string, string> = {
    hair_salon: 'HairSalon',
    barber: 'BarberShop',
    beauty_parlour: 'BeautySalon',
    aurelia_beauty_parlour: 'BeautySalon',
    nail_studio: 'NailSalon',
    tattoo_studio: 'TattooParlor',
  };
  const schema = {
    '@context': 'https://schema.org',
    '@type': schemaTypeByBusiness[String(profile.businessType || '')] || 'HealthAndBeautyBusiness',
    name: profile.businessName || 'Salon',
    description,
    url: canonical,
    ...(profile.phone || profile.whatsapp ? { telephone: profile.phone || profile.whatsapp } : {}),
    ...(image ? { image } : {}),
    ...(Object.keys(address).length ? { address: { '@type': 'PostalAddress', ...address } } : {}),
    ...(offers.length ? { hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Salon services', itemListElement: offers } } : {}),
  };

  return [
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + escapeHtml(title) + '</title>',
    '<meta name="description" content="' + escapeHtml(description) + '">',
    '<meta name="keywords" content="' + escapeHtml(keywords) + '">',
    '<meta name="robots" content="index,follow">',
    '<link rel="canonical" href="' + escapeHtml(canonical) + '">',
    '<link rel="icon" href="' + escapeHtml(favicon) + '">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="' + escapeHtml(profile.businessName || 'NEXORA Salon') + '">',
    '<meta property="og:title" content="' + escapeHtml(ogTitle) + '">',
    '<meta property="og:description" content="' + escapeHtml(ogDescription) + '">',
    '<meta property="og:url" content="' + escapeHtml(canonical) + '">',
    '<meta property="og:image" content="' + escapeHtml(image) + '">',
    '<meta property="og:image:alt" content="' + escapeHtml((profile.businessName || 'Salon') + ' salon website and services') + '">',
    '<meta name="twitter:card" content="' + escapeHtml(twitterCard) + '">',
    '<meta name="twitter:title" content="' + escapeHtml(ogTitle) + '">',
    '<meta name="twitter:description" content="' + escapeHtml(ogDescription) + '">',
    '<meta name="twitter:image" content="' + escapeHtml(image) + '">',
    '<meta name="twitter:image:alt" content="' + escapeHtml((profile.businessName || 'Salon') + ' salon website and services') + '">',
    '<script id="studioflow-seo-jsonld" type="application/ld+json">' + safeJson(schema) + '</script>',
  ].join('\n');
}

export default async function storefrontHandler(req: RequestLike, res: ResponseLike): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    res.status(405);
    res.setHeader('Allow', 'GET, HEAD');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send('Method not allowed');
  }

  res.setHeader('X-NEXORA-SSR-Handler', 'entered');
  const { origin, hostname } = getRequestOrigin(req);
  const requestUrl = new URL(req.url || '/', origin);
  const originalPath = requestUrl.searchParams.get('path') || requestUrl.pathname || '/';
  const pageUrl = new URL(originalPath.startsWith('/') ? originalPath : '/' + originalPath, origin);
  // Preserve the original salon selector when a query-string route was rewritten.
  for (const key of ['site', 's', 'subdomain']) {
    const value = requestUrl.searchParams.get(key);
    if (value && !pageUrl.searchParams.has(key)) pageUrl.searchParams.set(key, value);
  }

  const slug = resolveStorefrontSlug(pageUrl, hostname);
  res.setHeader('X-NEXORA-SSR-Slug', slug || 'none');
  if (!slug) {
    res.setHeader('X-NEXORA-SSR-Stage', 'platform-shell');
    try {
      return await sendPlatformShell(res, method);
    } catch (error) {
      console.error('[storefront-ssr] platform shell render failed', error);
      res.status(503);
      res.setHeader('X-Robots-Tag', 'noindex');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return method === 'HEAD' ? res.end() : res.send('<!doctype html><html><head><meta name="robots" content="noindex"><title>NEXORA temporarily unavailable</title></head><body><h1>NEXORA is temporarily unavailable.</h1></body></html>');
    }
  }
  res.setHeader('X-NEXORA-SSR-Stage', 'public-database-lookup');

  let supabase: any;
  try {
    supabase = await getSupabaseClient();
  } catch (initializationError) {
    res.setHeader('X-NEXORA-SSR-Stage', 'database-initialization-error');
    console.error('[storefront-ssr] Supabase client initialization failed', initializationError);
    res.status(503);
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return method === 'HEAD' ? res.end() : res.send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Salon temporarily unavailable</title></head><body><main><h1>Salon temporarily unavailable</h1><p>Please refresh this page in a moment.</p></main></body></html>');
  }

  let lookup: { data: any; error: any };
  try {
    lookup = await supabase
      .from('public_salon_websites')
      .select('slug,content,published_at')
      .eq('slug', slug)
      .maybeSingle();
  } catch (lookupError) {
    res.setHeader('X-NEXORA-SSR-Stage', 'public-database-error');
    console.error('[storefront-ssr] public salon lookup threw', lookupError);
    res.status(503);
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return method === 'HEAD' ? res.end() : res.send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Salon temporarily unavailable</title></head><body><main><h1>Salon temporarily unavailable</h1><p>Please refresh this page in a moment.</p></main></body></html>');
  }
  const { data, error } = lookup;

  if (error) {
    res.setHeader('X-NEXORA-SSR-Stage', 'public-database-error');
    console.error('[storefront-ssr] public salon lookup failed', error);
    res.status(503);
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (method === 'HEAD') return res.end();
    return res.send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Salon temporarily unavailable</title></head><body><main><h1>Salon temporarily unavailable</h1><p>Please refresh this page in a moment.</p></main></body></html>');
  }
  if (!data || !data.content) {
    res.setHeader('X-NEXORA-SSR-Stage', 'unpublished');
    res.status(404);
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (method === 'HEAD') return res.end();
    return res.send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Salon website not found</title></head><body><main><h1>This salon website is not published.</h1><p>Check the website address or contact the salon.</p><a href="https://nexorasalon.online/">Open NEXORA</a></main></body></html>');
  }

  res.setHeader('X-NEXORA-SSR-Stage', 'published-render');
  let rendered: ReturnType<Renderer['renderPublishedSalonHtml']>;
  try {
    rendered = (await getRenderer()).renderPublishedSalonHtml(data.content, slug);
  } catch (error) {
    console.error('[storefront-ssr] published salon renderer failed', error);
    res.status(503);
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('X-NEXORA-SSR-Stage', 'renderer-error');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return method === 'HEAD' ? res.end() : res.send('<!doctype html><html><head><meta name="robots" content="noindex"><title>Salon temporarily unavailable</title></head><body><h1>Salon temporarily unavailable</h1><p>Please refresh this page in a moment.</p></body></html>');
  }
  const viaQuery = pageUrl.searchParams.has('site') || pageUrl.searchParams.has('s') || pageUrl.searchParams.has('subdomain');
  const canonical = canonicalForRequest(rendered.profile, origin, pageUrl.pathname, slug, viaQuery);
  let head: string;
  try {
    const activeRenderer = await getRenderer();
    const assetTags = activeRenderer.getStorefrontAssetTags();
    head = renderHead(rendered.profile, rendered.site, canonical, {
      generateSeoDefaults: generateStorefrontSeoDefaults,
      websiteFavicon: storefrontFavicon,
    }) + '\n' + assetTags + '\n' + rendered.preloadTags.join('\n');
  } catch (headError) {
    console.error('[storefront-ssr] SEO/asset module initialization failed', headError);
    res.status(503);
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('X-NEXORA-SSR-Stage', 'head-initialization-error');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return method === 'HEAD' ? res.end() : res.send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Salon temporarily unavailable</title></head><body><main><h1>Salon temporarily unavailable</h1><p>Please refresh this page in a moment.</p></main></body></html>');
  }
  const initialPayload = safeJson({ slug, site: rendered.site });

  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=60');
  res.setHeader('Vary', 'Host');
  if (method === 'HEAD') return res.end();
  res.send('<!doctype html><html lang="en"><head>' + head +
    '<script id="nexora-published-site-data" type="application/json">' + initialPayload + '</script>' +
    '</head><body><div id="root">' + rendered.html + '</div></body></html>');
}
