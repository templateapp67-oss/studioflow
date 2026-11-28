/**
 * Route published salon root URLs through the dynamic SSR function and apply
 * request-scoped frame/security headers before Vercel serves the rewritten
 * response. Only public same-origin app/storefront root documents may frame.
 */
import {
  isFrameableRootRequest,
  securityHeaders,
} from './server/httpSecurityHeadersShared.js';

function withSecurityHeaders(response, requestUrl, method) {
  const headers = new Headers(response.headers);
  const policy = securityHeaders({
    upgradeInsecureRequests: true,
    allowSameOriginFraming: isFrameableRootRequest(requestUrl, method),
  });
  for (const [name, value] of Object.entries(policy)) headers.set(name, value);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function continueRequest(requestUrl = '/', method = 'GET') {
  return withSecurityHeaders(new Response(null, {
    headers: {
      'x-middleware-next': '1',
      'x-nexora-ssr-middleware': 'continue',
    },
  }), requestUrl, method);
}

function rewriteRequest(destination, requestUrl, method) {
  return withSecurityHeaders(new Response(null, {
    headers: {
      'x-middleware-rewrite': destination.toString(),
      'x-nexora-ssr-middleware': 'rewrite-root-site-query',
    },
  }), requestUrl, method);
}

function validSlug(value) {
  const slug = String(value || '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(slug) ? slug : '';
}

export default function middleware(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return continueRequest(url, request.method);
  }

  if (url.pathname !== '/') return continueRequest(url, request.method);

  // Owner, customer and OAuth entry points must continue to use the normal app.
  if (['app', 'customer', 'customer_ref'].some((key) => url.searchParams.has(key))) {
    return continueRequest(url, request.method);
  }

  const requestedSlug =
    url.searchParams.get('site') ||
    url.searchParams.get('s') ||
    url.searchParams.get('subdomain') ||
    '';
  const slug = validSlug(requestedSlug);
  if (!slug) return continueRequest(url, request.method);

  const destination = new URL('/api/storefront', url);
  destination.searchParams.set('path', '/');
  destination.searchParams.set('site', slug);
  destination.searchParams.delete('s');
  destination.searchParams.delete('subdomain');

  return rewriteRequest(destination, url, request.method);
}

export const config = {
  matcher: '/',
  runtime: 'nodejs',
};
