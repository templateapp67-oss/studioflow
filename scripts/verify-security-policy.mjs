// Offline guard for the production CSP and the deployment contracts that must
// survive alongside it. This does not claim to replace browser smoke tests.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
const globalHeaders = config.headers.find((entry) => entry.source === '/(.*)');
assert.ok(globalHeaders, 'global security headers must exist');
const header = (key) => globalHeaders.headers.find((entry) => entry.key.toLowerCase() === key.toLowerCase())?.value;
assert.equal(header('X-Content-Type-Options'), 'nosniff');
assert.equal(header('X-Frame-Options'), 'SAMEORIGIN');
assert.equal(header('Referrer-Policy'), 'strict-origin-when-cross-origin');

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
requires('frame-ancestors', ["'self'"]);
requires('form-action', ["'self'", 'https://*.supabase.co', 'https://*.razorpay.com']);
requires('script-src', ["'self'", 'https://checkout.razorpay.com', 'https://unpkg.com']);
forbids('script-src', ["'unsafe-inline'", "'unsafe-eval'", '*']);
requires('script-src-attr', ["'none'"]);
requires('style-src', ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://unpkg.com']);
requires('style-src-attr', ["'unsafe-inline'"]);
requires('font-src', ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://unpkg.com']);
requires('connect-src', [
  "'self'", 'https://*.supabase.co', 'wss://*.supabase.co', 'https://*.razorpay.com',
  'https://nominatim.openstreetmap.org', 'https://images.unsplash.com',
  'https://raw.githubusercontent.com', 'https://*.pexels.com',
  'https://img.youtube.com', 'https://i.ytimg.com', 'https://*.fbcdn.net', 'https://*.cdninstagram.com',
]);
requires('img-src', [
  "'self'", 'data:', 'blob:', 'https://*.supabase.co', 'https://images.unsplash.com',
  'https://raw.githubusercontent.com', 'https://*.pexels.com', 'https://img.youtube.com',
  'https://i.ytimg.com', 'https://*.fbcdn.net', 'https://*.cdninstagram.com', 'https://*.instagram.com',
  'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org', 'https://unpkg.com',
  'https://www.google.com', 'https://maps.google.com',
]);
requires('media-src', [
  "'self'", 'data:', 'blob:', 'https://*.supabase.co', 'https://*.fbcdn.net',
  'https://*.cdninstagram.com', 'https://*.googlevideo.com', 'https://www.youtube.com',
  'https://youtube.com', 'https://player.vimeo.com', 'https://*.vimeocdn.com',
]);
requires('frame-src', [
  "'self'", 'https://*.razorpay.com', 'https://www.youtube.com', 'https://www.youtube-nocookie.com',
  'https://www.facebook.com', 'https://www.instagram.com', 'https://player.vimeo.com',
  'https://www.google.com', 'https://maps.google.com', 'https://www.openstreetmap.org',
]);
requires('worker-src', ["'self'", 'blob:']);
requires('manifest-src', ["'self'"]);

// The policy must match the actual runtime loaders, not just a wishlist.
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
for (const match of prerender.matchAll(/<script([^>]*)>/g)) {
  // The entry-script matcher is source code, not an inline script.
  if (match[1].includes('type="module"')) continue;
  assert.ok(match[1].includes('type="application/ld+json"'), 'prerendered pages may only inline JSON-LD data blocks');
}

// Deployment must keep auth, sitemap, static assets and legacy Node APIs intact.
assert.deepEqual(config.rewrites.map((entry) => [entry.source, entry.destination]), [
  ['/login', '/login.html'],
  ['/sitemap.xml', '/api/sitemap'],
  ['/salon-os', '/salon-os/index.html'],
  ['/pricing', '/pricing/index.html'],
  ['/privacy', '/privacy/index.html'],
  ['/(.*\\..*)', '/$1'],
  ['/(.*)', '/index.html'],
]);
const server = readFileSync('server.ts', 'utf8');
for (const route of [
  '/api/health', '/api/generate-bio', '/api/generate-promo-image', '/api/generate-promo-copy',
  '/api/veda-website-content', '/api/ai-recommendations', '/api/email-service-status', '/api/send-booking-email',
]) assert.ok(server.includes(`"${route}"`), `legacy API route must remain registered: ${route}`);
assert.ok(server.includes('app.get("/sitemap.xml", sitemapHandler)'));
assert.ok(server.includes('app.all("/api/*"'), 'unknown API paths must stay JSON 404s, not SPA HTML');

console.log('PASS: enforcing CSP matches runtime integrations; login/sitemap/static/SPA rewrites and legacy API registrations are preserved. Browser/provider smoke tests remain required.');
