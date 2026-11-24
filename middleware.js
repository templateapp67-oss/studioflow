/**
 * Route legacy published-salon root URLs through the dynamic SSR function.
 *
 * The Vercel file system serves dist/index.html before vercel.json rewrites
 * are evaluated for "/", so a rewrite-only rule can silently return the SPA
 * shell (HTTP 200) instead of invoking api/storefront.ts.
 *
 * This lightweight Vercel Routing Middleware runs before the static file
 * lookup. It deliberately leaves platform/customer app query routes alone.
 */

function continueRequest() {
  return new Response(null, {
    headers: { 'x-middleware-next': '1' },
  });
}

function rewriteRequest(destination) {
  return new Response(null, {
    headers: { 'x-middleware-rewrite': destination.toString() },
  });
}

function validSlug(value) {
  const slug = String(value || '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(slug) ? slug : '';
}

export default function middleware(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return continueRequest();
  }

  const url = new URL(request.url);
  if (url.pathname !== '/') return continueRequest();

  // Owner, customer and OAuth entry points must continue to use the normal app.
  if (['app', 'customer', 'customer_ref'].some((key) => url.searchParams.has(key))) {
    return continueRequest();
  }

  const requestedSlug =
    url.searchParams.get('site') ||
    url.searchParams.get('s') ||
    url.searchParams.get('subdomain') ||
    '';
  const slug = validSlug(requestedSlug);
  if (!slug) return continueRequest();

  const destination = new URL('/api/storefront', url);
  destination.searchParams.set('path', '/');
  destination.searchParams.set('site', slug);
  destination.searchParams.delete('s');
  destination.searchParams.delete('subdomain');

  return rewriteRequest(destination);
}

export const config = {
  matcher: '/',
  runtime: 'nodejs',
};
