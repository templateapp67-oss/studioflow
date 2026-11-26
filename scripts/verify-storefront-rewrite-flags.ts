import './fixtures/storefront-offline-fetch.mjs';
import assert from 'node:assert/strict';
import storefrontHandler from '../api/storefront';

// Invoke the actual handler with Vercel-style rewritten URLs. No network access
// or provider data is needed; public lookup is provided by the offline preload.
async function request(url: string, method = 'GET') {
  const headers = new Map<string, string>();
  let status = 200;
  let body = '';
  const res = {
    status(code: number) { status = code; return this; },
    setHeader(name: string, value: string) { headers.set(name.toLowerCase(), value); },
    send(value: string) { body = value; },
    end() {},
  };
  await storefrontHandler({ method, url, headers: { host: 'localhost' } }, res);
  return { status, headers, body };
}

await assert.rejects(() => fetch('https://unapproved.example.invalid/'), /Unexpected external fetch/);
for (const flag of ['app', 'customer', 'customer_ref']) {
  for (const value of ['', '1']) {
    for (const method of ['GET', 'HEAD']) {
      const result = await request(`/api/storefront?path=%2Fnot-published&site=not-published&${flag}=${value}`, method);
      assert.equal(result.status, 200, `${method}: ${flag}=${value} must use the platform shell`);
      assert.equal(result.headers.get('x-nexora-ssr-stage'), 'platform-shell');
      assert.equal(result.headers.get('x-nexora-ssr-slug'), 'none');
      if (method === 'GET') assert.match(result.body, /<div id="root">/);
      else assert.equal(result.body, '');
    }
  }
}
for (const method of ['GET', 'HEAD']) {
  const result = await request('/api/storefront?path=%2Fnot-published&site=not-published', method);
  assert.equal(result.status, 404);
  assert.equal(result.headers.get('x-robots-tag'), 'noindex');
  assert.equal(result.headers.get('x-nexora-ssr-stage'), 'unpublished');
  if (method === 'GET') assert.match(result.body, /<meta name="robots" content="noindex">/);
  else assert.equal(result.body, '');
}
console.log('PASS: rewritten app/customer flags (including empty values) retain the platform shell; public missing slugs return 404/noindex for GET and HEAD; offline fetch rejects other hosts.');
