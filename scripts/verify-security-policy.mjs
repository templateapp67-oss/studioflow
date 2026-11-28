// Offline guard for the production CSP and the deployment contracts that must
// survive alongside it. This does not claim to replace browser smoke tests.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
const globalHeaders = config.headers.find((entry) => entry.source === '/:path(.+)');
assert.ok(globalHeaders, 'global security headers must cover every non-root path');
assert.equal(globalHeaders.source, '/:path(.+)', 'the static deny policy must not also match the root app routes');
const { default: routeStorefrontRequest } = await import('../middleware.js');
const header = (key) => globalHeaders.headers.find((entry) => entry.key.toLowerCase() === key.toLowerCase())?.value;
assert.equal(header('X-Content-Type-Options'), 'nosniff');
assert.equal(header('X-Frame-Options'), 'DENY');
assert.equal(header('Referrer-Policy'), 'strict-origin-when-cross-origin');
assert.equal(header('Strict-Transport-Security'), 'max-age=63072000; includeSubDomains; preload');
const permissionsPolicy = header('Permissions-Policy');
assert.ok(permissionsPolicy, 'Permissions-Policy must be enforced');
for (const required of [
  'camera=()', 'microphone=()', 'geolocation=()',
  'autoplay=(self "https://www.youtube.com" "https://player.vimeo.com")',
  'encrypted-media=(self "https://www.youtube.com" "https://player.vimeo.com")',
  'fullscreen=(self "https://www.youtube.com" "https://www.youtube-nocookie.com" "https://player.vimeo.com")',
  'payment=(self "https://api.razorpay.com" "https://checkout.razorpay.com")',
  'picture-in-picture=(self "https://www.youtube.com" "https://player.vimeo.com")',
]) {
  assert.ok(permissionsPolicy.includes(required), `Permissions-Policy must include ${required}`);
}

assert.doesNotMatch(permissionsPolicy, /(?:^|[,( ]+)https:\/\//, 'external origins must be double quoted');
assert.doesNotMatch(permissionsPolicy, /\bbrowsing-topics=/, 'omit the retired Chromium directive');

const csp = header('Content-Security-Policy');
assert.ok(csp, 'CSP must be enforcing, not report-only');
assert.equal(header('Content-Security-Policy-Report-Only'), undefined);
const directives = new Map(csp.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
  const [name, ...values] = part.split(/\s+/);
  return [name, new Set(values)];
}));
const requires = (name, values) => {
  const directive = directives.get(name);
  assert.ok(directive, `missing CSP directive ${name}`);
  for (const value of values) assert.ok(directive.has(value), `${name} must allow ${value}`);
};
const forbids = (name, values) => {
  const directive = directives.get(name);
  assert.ok(directive, `missing CSP directive ${name}`);
  for (const value of values) assert.ok(!directive.has(value), `${name} must not allow ${value}`);
};

requires('default-src', ["'self'"]);
requires('base-uri', ["'self'"]);
requires('object-src', ["'none'"]);
requires('frame-ancestors', ["'none'"]);
requires('form-action', ["'self'", 'https://*.supabase.co', 'https://*.razorpay.com']);
requires('script-src', ["'self'", 'https://checkout.razorpay.com', 'https://unpkg.com', 'https://embed.tawk.to', 'https://cdn.jsdelivr.net/emojione/2.2.7/lib/js/emojione.min.js']);
forbids('script-src', ["'unsafe-inline'", "'unsafe-eval'", '*', 'https:', 'https://cdn.jsdelivr.net']);
requires('script-src-attr', ["'none'"]);
requires('style-src', ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://unpkg.com', 'https://embed.tawk.to/_s/v4/app/']);
forbids('style-src', ['https:', '*', 'https://*.tawk.to', 'https://embed.tawk.to']);
requires('style-src-attr', ["'unsafe-inline'"]);
requires('font-src', ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://unpkg.com', 'https://embed.tawk.to/_s/v4/assets/fonts/']);
forbids('font-src', ['https:', '*', 'https://*.tawk.to', 'https://embed.tawk.to']);
requires('connect-src', [
  "'self'", 'https://*.supabase.co', 'wss://*.supabase.co', 'https://*.razorpay.com',
  'https://nominatim.openstreetmap.org', 'https://images.unsplash.com', 'https://*.tawk.to', 'wss://*.tawk.to',
  'https://raw.githubusercontent.com', 'https://*.pexels.com',
  'https://img.youtube.com', 'https://i.ytimg.com', 'https://*.fbcdn.net', 'https://*.cdninstagram.com',
]);
requires('img-src', [
  "'self'", 'data:', 'blob:', 'https://*.supabase.co', 'https://images.unsplash.com',
  'https://raw.githubusercontent.com', 'https://*.pexels.com', 'https://img.youtube.com',
  'https://i.ytimg.com', 'https://*.fbcdn.net', 'https://*.cdninstagram.com', 'https://*.instagram.com',
  'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org', 'https://unpkg.com',
  'https://www.google.com', 'https://maps.google.com', 'https://*.tawk.to', 'https://cdn.jsdelivr.net/emojione/assets/png/', 'https://tawk.link',
]);
forbids('img-src', ['https:', '*', 'https://cdn.jsdelivr.net', 'https://*.tawk.link', 'https://s3.amazonaws.com']);
forbids('script-src', ['https://tawk.link']);
requires('media-src', [
  "'self'", 'data:', 'blob:', 'https://*.supabase.co', 'https://*.fbcdn.net',
  'https://*.cdninstagram.com', 'https://*.googlevideo.com', 'https://www.youtube.com',
  'https://youtube.com', 'https://player.vimeo.com', 'https://*.vimeocdn.com',
]);
requires('frame-src', [
  "'self'", 'https://*.razorpay.com', 'https://www.youtube.com', 'https://www.youtube-nocookie.com',
  'https://www.facebook.com', 'https://web.facebook.com', 'https://staticxx.facebook.com', 'https://www.instagram.com', 'https://player.vimeo.com',
  'https://www.google.com', 'https://maps.google.com', 'https://www.openstreetmap.org', 'https://*.tawk.to',
]);
requires('worker-src', ["'self'", 'blob:']);
requires('manifest-src', ["'self'"]);
assert.ok(csp.includes('upgrade-insecure-requests'), 'CSP must upgrade insecure requests behind Vercel TLS');

// The policy must match the actual runtime loaders, not just a wishlist.
const whatsAppPanel = readFileSync('src/components/NexoraWhatsAppPanel.tsx', 'utf8');
const metaSdkUrl = whatsAppPanel.match(/script\.src = '(https:\/\/connect\.facebook\.net\/[^']*sdk\.js)'/)?.[1];
assert.ok(metaSdkUrl, 'owner signup uses the first-party Meta SDK');
requires('script-src', [new URL(metaSdkUrl).origin]);

const nexoraTawk = readFileSync('src/components/NexoraTawkWidget.tsx', 'utf8');
const nexoraTawkUrl = nexoraTawk.match(/NEXORA_TAWK_WIDGET_URL\s*=\s*['"]([^'"]+)['"]/)?.[1];
assert.ok(nexoraTawkUrl, 'NEXORA public Tawk widget loader URL exists');
assert.equal(new URL(nexoraTawkUrl).origin, 'https://embed.tawk.to');
requires('script-src', [new URL(nexoraTawkUrl).origin]);
requires('frame-src', ['https://*.tawk.to']);
requires('connect-src', ['https://*.tawk.to', 'wss://*.tawk.to']);
requires('img-src', ['https://*.tawk.to']);

const leaflet = readFileSync('src/lib/loadLeaflet.ts', 'utf8');
assert.ok(leaflet.includes('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'));
assert.ok(leaflet.includes('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'));
assert.match(leaflet, /integrity='sha256-[A-Za-z0-9+/=]+'/);
const payments = readFileSync('src/lib/platformPayments.ts', 'utf8');
assert.ok(payments.includes('https://checkout.razorpay.com/v1/checkout.js'));
const fonts = readFileSync('src/lib/loadApplicationFonts.ts', 'utf8');
assert.ok(fonts.includes('https://fonts.googleapis.com'));
assert.ok(fonts.includes('https://fonts.gstatic.com'));

// Prerendered SEO data blocks are allowed; executable inline scripts are not.
const prerender = readFileSync('scripts/prerender-public.tsx', 'utf8');
for (const match of prerender.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const attributes = match[1];
  // The source text includes a regular expression that matches the external
  // Vite module entry; it is not an inline script in the prerendered page.
  if (/\btype\s*=\s*["']module["']/i.test(attributes)) continue;
  // External scripts are controlled by script-src in the enforcing CSP.
  if (/\bsrc\s*=/i.test(attributes)) continue;
  const isJsonLd = /\btype\s*=\s*["']application\/ld\+json["']/i.test(attributes);
  assert.ok(isJsonLd, 'prerendered pages may only inline JSON-LD data blocks');
}

// Deployment must keep auth, sitemap, static assets and legacy Node APIs intact.
const requiredRewrites = [
  ['/login', '/login.html'],
  ['/sign-in', '/login.html'],
  ['/sign-up', '/login.html'],
  ['/staff', '/index.html'],
  ['/staff/login', '/index.html'],
  ['/staff/accept', '/index.html'],
  ['/sitemap.xml', '/api/sitemap'],
  ['/salon-os', '/salon-os/index.html'],
  ['/pricing', '/pricing/index.html'],
  ['/privacy', '/privacy/index.html'],
  ['/salon-onboarding', '/salon-onboarding/index.html'],
  ['/salon-growth', '/salon-growth/index.html'],
  ['/growth-partner-rewards', '/growth-partner-rewards/index.html'],
  ['/partner-rewards', '/partner-rewards/index.html'],
];
for (const [source, destination] of requiredRewrites) {
  assert.ok(
    config.rewrites.some((entry) => entry.source === source && entry.destination === destination),
    `required route rewrite must remain: ${source} -> ${destination}`,
  );
}

const assetPassthrough = config.rewrites.find((entry) => entry.destination === '/$1' && entry.source.includes('..'));
assert.ok(assetPassthrough, 'static file asset passthrough rewrite must remain');
assert.equal(assetPassthrough.source, '/(.*\\..*)', 'asset passthrough must match dotted file paths only');
const storefrontRootFallback = config.rewrites.find((entry) => entry.source === '/' && entry.destination === '/api/storefront?path=/');
assert.ok(storefrontRootFallback, 'the bare platform root must route to the storefront shell handler');
const storefrontFallback = config.rewrites.find((entry) => entry.source.startsWith('/:path(('));
assert.ok(storefrontFallback, 'non-file salon paths must be handled by the storefront SSR function');
assert.equal(storefrontFallback.destination, '/api/storefront?path=/:path*');
assert.ok(storefrontFallback.source.includes('(?:api|admin|owner|staff|login|sign-in|sign-up|assets|fonts|templates|template-pages)'), 'SSR fallback must exclude private, API, auth and static path prefixes');
assert.ok(storefrontFallback.source.includes('(?!.*\\.[^/]+$)'), 'SSR fallback must leave extension-bearing asset paths to static-file routing');
assert.equal(config.rewrites.at(-1), storefrontFallback, 'the storefront fallback must remain last');

for (const key of ['app', 'customer', 'customer_ref']) {
  assert.ok(
    config.rewrites.some((entry) => entry.source === '/' && entry.destination === '/index.html' &&
      (entry.has || []).some((condition) => condition.type === 'query' && condition.key === key)),
    `root ${key} entry must keep serving the normal application shell`,
  );
}
assert.ok(
  !config.rewrites.some((entry) => entry.source === '/' &&
    (entry.has || []).some((condition) => condition.type === 'query' && ['site', 's', 'subdomain'].includes(condition.key))),
  'published salon root query URLs must be intercepted before the root index.html filesystem match',
);

// Exercise the actual Vercel Routing Middleware contract without a network call.
const queryResponse = routeStorefrontRequest(new Request('https://preview.example/?site=Salon-Preview-01'));
const rewriteTarget = queryResponse.headers.get('x-middleware-rewrite');
assert.ok(rewriteTarget, 'a published salon root URL must rewrite to the SSR function');
const rewriteUrl = new URL(rewriteTarget);
assert.equal(rewriteUrl.pathname, '/api/storefront');
assert.equal(rewriteUrl.searchParams.get('path'), '/');
assert.equal(rewriteUrl.searchParams.get('site'), 'salon-preview-01');

for (const query of ['?app=1&site=salon-preview-01', '?customer=1&site=salon-preview-01', '?customer_ref=abc&site=salon-preview-01']) {
  const response = routeStorefrontRequest(new Request(`https://preview.example/${query}`));
  assert.equal(response.headers.get('x-middleware-next'), '1', `customer/app route must not be intercepted: ${query}`);
}
const invalidSlugResponse = routeStorefrontRequest(new Request('https://preview.example/?site=bad%2Fslug'));
assert.equal(invalidSlugResponse.headers.get('x-middleware-next'), '1', 'invalid selectors must not reach the SSR function');

// `www` must 308 to the canonical origin instead of serving a duplicate host.
const wwwRedirect = (config.redirects || []).find((entry) =>
  (entry.has || []).some((condition) => condition.type === 'host' && condition.value === 'www.nexorasalon.online'));
assert.ok(wwwRedirect, 'the www host must redirect to the canonical origin');
assert.equal(wwwRedirect.permanent, true, 'the canonical redirect must be permanent (308)');
assert.equal(wwwRedirect.destination, 'https://nexorasalon.online/$1', 'the canonical redirect must preserve the path');


// Only same-origin public salon storefront root documents can be framed.
for (const [sampleUrl, expectedFrame] of [
  ['/?app=1', 'DENY'],
  ['/?app=1&install=1', 'DENY'],
  ['/?site=salon-preview-01', 'SAMEORIGIN'],
  ['/?site=salon-preview-01&auth=signup', 'DENY'],
  ['/?site=salon-preview-01&admin=1', 'DENY'],
  ['/?site=salon-preview-01&staff=1', 'DENY'],
  ['/?site=salon-preview-01&owner=1', 'DENY'],
  ['/?site=salon-preview-01&passwordUpdated=1', 'DENY'],
  ['/?site=salon-preview-01&error_code=otp_expired', 'DENY'],
  ['/?site=salon-preview-01&ADMIN=1', 'DENY'],
  ['/?s=salon-preview-01', 'SAMEORIGIN'],
  ['/?subdomain=salon-preview-01', 'SAMEORIGIN'],
  ['/', 'DENY'],
  ['/?app=0', 'DENY'],
  ['/?customer=1', 'DENY'],
  ['/?customer_ref=abc', 'DENY'],
  ['/?app=1&customer_ref=abc', 'DENY'],
  ['/?site=salon-preview-01&app=1', 'DENY'],
  ['/?app=1&owner=1', 'DENY'],
  ['/?app=1&panel=security', 'DENY'],
  ['/?app=1&create=1', 'DENY'],
  ['/?app=1&module=1', 'DENY'],
  ['/?app=1&invite=1', 'DENY'],
  ['/?app=1&recovery=1', 'DENY'],
  ['/?app=1&auth=signup', 'DENY'],
  ['/?app=1&token=secret-like-value', 'DENY'],
  ['/?site=bad%2Fslug', 'DENY'],
]) {
  const response = routeStorefrontRequest(new Request(new URL(sampleUrl, 'https://nexorasalon.online')));
  assert.equal(response.headers.get('X-Frame-Options'), expectedFrame, `frame policy for ${sampleUrl}`);
  const frameAncestors = response.headers.get('Content-Security-Policy')
    .split(';').map((part) => part.trim()).find((part) => part.startsWith('frame-ancestors '));
  assert.equal(frameAncestors, expectedFrame === 'SAMEORIGIN' ? "frame-ancestors 'self'" : "frame-ancestors 'none'");
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(response.headers.get('Strict-Transport-Security'), 'max-age=63072000; includeSubDomains; preload');
}

const nonGetRoot = routeStorefrontRequest(new Request('https://nexorasalon.online/?site=salon-preview-01', { method: 'POST' }));
assert.equal(nonGetRoot.headers.get('X-Frame-Options'), 'DENY', 'non-GET/HEAD root requests must not be frameable');

// Private/app paths and query flows must send X-Robots-Tag headers on Vercel too,
// with rule precedence evaluated sequentially exactly as Vercel merges headers.
const evaluateVercelHeaders = (rawUrl) => {
  const url = new URL(rawUrl, 'https://nexorasalon.online');
  const resolved = new Map();
  for (const entry of config.headers) {
    const matches = entry.source === '/:path(.+)'
      ? url.pathname.length > 1
      : new RegExp('^' + entry.source + '$', 'i').test(url.pathname);
    if (!matches) continue;
    if (entry.has && !entry.has.every((cond) => cond.type === 'query' && url.searchParams.has(cond.key))) continue;
    for (const h of entry.headers) resolved.set(h.key.toLowerCase(), h.value);
  }

  if (url.pathname === '/') {
    // Root requests get their complete security header set from Vercel Routing Middleware.
    const response = routeStorefrontRequest(new Request(url.toString()));
    for (const key of [
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Content-Security-Policy',
    ]) {
      const value = response.headers.get(key);
      if (value) resolved.set(key.toLowerCase(), value);
    }
  }
  return resolved;
};

// Non-root application, account and API routes always retain the clickjacking deny policy.
for (const path of ['/login', '/owner', '/staff/login', '/admin/demo-leads', '/api/storefront', '/pricing']) {
  const headers = evaluateVercelHeaders(path);
  assert.equal(headers.get('x-frame-options'), 'DENY', `X-Frame-Options must deny framing for ${path}`);
  assert.ok(headers.get('content-security-policy')?.includes("frame-ancestors 'none'"), `CSP must deny framing for ${path}`);
}

assert.equal(globalHeaders.headers.find((entry) => entry.key.toLowerCase() === 'x-robots-tag'), undefined, 'catch-all /(.*) rule must not set or overwrite X-Robots-Tag');
for (const [sampleUrl, expectedRobots] of [
  ['/api', 'noindex, nofollow'],
  ['/api/health', 'noindex, nofollow'],
  ['/API/health', 'noindex, nofollow'],
  ['/admin', 'noindex, nofollow'],
  ['/admin/', 'noindex, nofollow'],
  ['/ADMIN/demo-leads', 'noindex, nofollow'],
  ['/owner', 'noindex, nofollow'],
  ['/owner/', 'noindex, nofollow'],
  ['/owner/settings', 'noindex, nofollow'],
  ['/staff', 'noindex, nofollow'],
  ['/staff/', 'noindex, nofollow'],
  ['/staff/login', 'noindex, nofollow'],
  ['/staff/accept?token=abc', 'noindex, nofollow'],
  ['/login', 'noindex, follow'],
  ['/login/', 'noindex, follow'],
  ['/login.html', 'noindex, follow'],
  ['/login?auth=signup', 'noindex, follow'],
  ['/sign-in', 'noindex, follow'],
  ['/sign-in/', 'noindex, follow'],
  ['/sign-up', 'noindex, follow'],
  ['/sign-up/', 'noindex, follow'],
  ['/login?app=1', 'noindex, nofollow'],
  ['/login?auth=signup&template=hair_salon&create=1', 'noindex, nofollow'],
  ['/?app=1', 'noindex, nofollow'],
  ['/?site=glow&app=1', 'noindex, nofollow'],
  ['/?site=glow&customer=1', 'noindex, nofollow'],
  ['/?customer_ref=abc', 'noindex, nofollow'],
  ['/?site=glow&customer_ref=abc', 'noindex, nofollow'],
  ['/?site=glow&owner=glow', 'noindex, nofollow'],
  ['/?site=glow&panel=demo', 'noindex, nofollow'],
  ['/?site=glow&create=1', 'noindex, nofollow'],
  ['/?site=glow&module=4', 'noindex, nofollow'],
  ['/?site=glow&invite=1', 'noindex, nofollow'],
  ['/?site=glow&recovery=1', 'noindex, nofollow'],
  ['/', undefined],
  ['/pricing', undefined],
  ['/salon-os', undefined],
  ['/privacy', undefined],
  ['/salon-onboarding', undefined],
  ['/salon-growth', undefined],
  ['/growth-partner-rewards', undefined],
  ['/partner-rewards', undefined],
  ['/template-pages/hair-salon.html', undefined],
  ['/sitemap.xml', undefined],
  ['/?site=glow', undefined],
]) {
  const merged = evaluateVercelHeaders(sampleUrl);
  assert.equal(merged.get('x-robots-tag'), expectedRobots, `vercel.json merged X-Robots-Tag for ${sampleUrl}`);
  assert.equal(merged.get('x-content-type-options'), 'nosniff', `global security headers survive on ${sampleUrl}`);
}

// Every prerendered marketing document must also be routed to by a rewrite,
// otherwise the SPA shell answers the URL and the per-route head is never sent.
for (const route of ['/salon-os', '/pricing', '/privacy', '/salon-onboarding', '/salon-growth', '/growth-partner-rewards', '/partner-rewards']) {
  assert.ok(
    config.rewrites.some((entry) => entry.source === route && entry.destination === `${route}/index.html`),
    `the ${route} document must be served by its own rewrite, not the SPA shell`,
  );
}
const server = readFileSync('server.ts', 'utf8');
for (const route of [
  '/api/health', '/api/generate-bio', '/api/generate-promo-image', '/api/generate-promo-copy',
  '/api/veda-website-content', '/api/ai-recommendations', '/api/email-service-status', '/api/send-booking-email',
  '/api/booking-deposit',
]) assert.ok(server.includes(`"${route}"`), `legacy API route must remain registered: ${route}`);
assert.ok(server.includes('app.get("/sitemap.xml", sitemapHandler)'));
assert.ok(server.includes('app.all("/api/*"'), 'unknown API paths must stay JSON 404s, not SPA HTML');

const sitemapFunction = readFileSync('api/sitemap.ts', 'utf8');
assert.ok(sitemapFunction.includes("sitemapHandler"), 'Vercel sitemap route must reuse the shared sitemap handler');
assert.ok(sitemapFunction.includes("export { sitemapHandler as default }"), 'Vercel sitemap route must expose the shared handler as its default function');

const storefrontSource = readFileSync('api/storefront.ts', 'utf8');
assert.ok(storefrontSource.includes('id="studioflow-seo-jsonld"'), 'SSR JSON-LD must reuse the client SEO updater node');
const seoUpdater = readFileSync('src/lib/useSeoMetadata.ts', 'utf8');
assert.ok(seoUpdater.includes('let existingSchema:'), 'client SEO updater must parse the existing server schema');
assert.ok(seoUpdater.includes('...existingSchema'), 'client SEO updater must preserve SSR business subtype and offers');

const appInstallSource = readFileSync('src/components/AppInstallSection.tsx', 'utf8');
assert.ok(appInstallSource.includes('noopener noreferrer'), 'external app/install overrides must open in a protected new tab');
assert.ok(appInstallSource.includes("target: '_blank'"), 'external app/install overrides must not navigate the preview iframe');
assert.ok(appInstallSource.includes("resolved.protocol !== 'https:' && resolved.protocol !== 'http:'"), 'app/install URLs must reject executable and non-web schemes');
assert.ok(appInstallSource.includes("if (resolved.protocol !== 'https:') return { href: '#' }"), 'external HTTP overrides must not be opened from a secure site');
assert.ok(appInstallSource.includes("resolved.searchParams.get('app') === '1'"), 'customer app routes must open outside the template preview frame');
const announcementSource = readFileSync('src/components/PromotionalBanner.tsx', 'utf8');
assert.ok(announcementSource.includes('customerAppRoute'), 'the app announcement action must not navigate the template preview iframe');
assert.ok(announcementSource.includes("rel: 'noopener noreferrer'"), 'new-tab promotional actions must use noopener noreferrer');
const customerWebsiteSource = readFileSync('src/components/CustomerSalonWebsite.tsx', 'utf8');
assert.ok(customerWebsiteSource.includes('navigateCustomerAccount(`/?customer=1&auth=${mode}'), 'customer sign-in/signup routes must leave the embedded preview');
const salonPreviewSource = readFileSync('src/components/SalonWebsitePreview.tsx', 'utf8');
assert.ok(salonPreviewSource.includes('navigateCustomerAccount(`/?customer=1&return='), 'read-only preview account buttons must leave the embedded frame');
const customerHeaderSource = readFileSync('src/components/CustomerWebsiteHeader.tsx', 'utf8');
assert.ok(customerHeaderSource.includes("window.self !== window.top"), 'embedded customer headers must detect preview frames');
assert.equal((customerHeaderSource.match(/\.\.\.appInstallLinkProps/g) || []).length, 4, 'all four template mobile app links must use the frame-safe target');
assert.ok(customerWebsiteSource.includes("window.open(url, '_blank', 'noopener,noreferrer')"), 'shared customer website auth links must open a new tab when framed');
assert.ok(salonPreviewSource.includes("window.open(url, '_blank', 'noopener,noreferrer')"), 'template editor preview auth links must open a new tab when framed');
console.log('PASS: enforcing CSP matches runtime integrations; same-origin public root app/storefront routes frame safely; private roots and every non-root route remain blocked.');