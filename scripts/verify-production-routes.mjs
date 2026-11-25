// End-to-end local production route smoke. Runs against the built Express
// bundle on an ephemeral loopback port; it does not deploy or call providers.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

assert.ok(existsSync('dist/server.cjs'), 'Run npm run build before verify-production-routes.mjs');
const probe = createServer();
await new Promise((resolve, reject) => probe.once('error', reject).listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const child = spawn(process.execPath, ['--import', './scripts/fixtures/storefront-offline-fetch.mjs', 'dist/server.cjs', '--port', String(port)], {
  env: { ...process.env, NODE_ENV: 'production', RESEND_API_KEY: '' },
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', chunk => { output += chunk; });
child.stderr.on('data', chunk => { output += chunk; });
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server did not start: ${output}`)), 15000);
    child.stdout.on('data', () => { if (output.includes('StudioFlow Salon OS running')) { clearTimeout(timeout); resolve(); } });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${output}`)); });
  });
  const base = `http://127.0.0.1:${port}`;
  const get = async path => { const response = await fetch(base + path); return { status: response.status, type: response.headers.get('content-type') || '', robots: response.headers.get('x-robots-tag'), body: await response.text() }; };
  const rawGet = (path, headers = {}) => new Promise((resolve, reject) => {
    const req = httpRequest({ hostname: '127.0.0.1', port, path, method: 'GET', headers }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.once('error', reject);
    req.end();
  });

  // Canonical host 308 redirects (www -> non-www apex, plain HTTP -> HTTPS).
  for (const redirectPath of ['/', '/partner-rewards', '/pricing', '/?site=glow-studio']) {
    const wwwRes = await rawGet(redirectPath, { Host: 'www.nexorasalon.online' });
    assert.equal(wwwRes.status, 308, `www.nexorasalon.online${redirectPath} returns HTTP 308`);
    assert.equal(wwwRes.headers.location, `https://nexorasalon.online${redirectPath}`, `www redirect preserves path & query for ${redirectPath}`);
  }
  const httpApexRes = await rawGet('/partner-rewards', { Host: 'nexorasalon.online', 'X-Forwarded-Proto': 'http' });
  assert.equal(httpApexRes.status, 308, 'plain HTTP apex request returns HTTP 308');
  assert.equal(httpApexRes.headers.location, 'https://nexorasalon.online/partner-rewards');

  // Verify live /robots.txt and /sitemap.xml responses.
  let route = await get('/robots.txt');
  assert.equal(route.status, 200, '/robots.txt serves HTTP 200');
  assert.equal(route.robots, null, '/robots.txt carries no X-Robots-Tag');
  assert.ok(route.body.includes('Allow: /') && route.body.includes('Disallow: /api/') && route.body.includes('Sitemap: https://nexorasalon.online/sitemap.xml'));
  assert.ok(!route.body.includes('Disallow: /login') && !route.body.includes('Disallow: /staff') && !route.body.includes('Disallow: /admin'));

  route = await get('/sitemap.xml');
  assert.equal(route.status, 200, '/sitemap.xml serves HTTP 200');
  assert.equal(route.robots, null, '/sitemap.xml carries no X-Robots-Tag');
  assert.ok(route.type.includes('application/xml'), '/sitemap.xml sends application/xml');
  assert.ok(route.body.includes('<loc>https://nexorasalon.online/</loc>'));
  assert.ok(route.body.includes('<loc>https://nexorasalon.online/partner-rewards</loc>'));
  assert.ok(!route.body.includes('www.nexorasalon.online'), '/sitemap.xml never emits www host');
  assert.ok(!/\/(?:login|sign-in|sign-up|admin|owner|staff|api)(?:[<\/?]|$)/i.test(route.body), '/sitemap.xml omits private/auth/api routes');

  route = await get('/');
  assert.equal(route.status, 200);
  assert.equal(route.robots, null, 'public homepage has no noindex header');
  assert.ok(route.body.includes('public-home-title') && route.body.includes('<div id="root">'));
  for (const authPath of ['/login', '/login/', '/sign-in', '/sign-up']) {
    route = await get(authPath);
    assert.equal(route.status, 200, `${authPath} serves login document`);
    assert.equal(route.robots, 'noindex, follow', `${authPath} carries noindex, follow header`);
    assert.ok(route.body.includes('Sign in to NEXORA'));
  }
  route = await get('/login?auth=signup&template=hair_salon&create=1');
  assert.equal(route.status, 200);
  assert.equal(route.robots, 'noindex, nofollow', 'login route with ?create=1 carries noindex, nofollow matching vercel.json');
  assert.ok(route.body.includes('Sign in to NEXORA'));
  route = await get('/template-pages/hair-salon.html');
  assert.equal(route.status, 200);
  assert.equal(route.robots, null, 'template landing page stays indexable');
  assert.ok(route.body.includes('data-template-id="hair_salon"'));
  // Each NEXORA marketing route must answer with its own prerendered document,
  // not the homepage shell that used to own every non-app path.
  for (const path of ['/salon-onboarding', '/salon-growth', '/growth-partner-rewards', '/partner-rewards']) {
    route = await get(path);
    assert.equal(route.status, 200);
    assert.equal(route.robots, null, `${path} stays indexable`);
    assert.ok(
      route.body.includes(`<link rel="canonical" href="https://nexorasalon.online${path}"`),
      `${path} serves its own prerendered document`,
    );
    assert.ok(route.body.includes('<div id="root">'), `${path} hydrates into the root element`);
  }
  // Confirm /partner-rewards and /partner-rewards/ serve prerendered HTML rather than the generic homepage shell.
  for (const path of ['/partner-rewards', '/partner-rewards/']) {
    route = await get(path);
    assert.equal(route.status, 200);
    assert.equal(route.robots, null, `${path} stays indexable`);
    assert.ok(route.body.includes('Partner Rewards &amp; Recognition'), `${path} renders its own prerendered title/content`);
    assert.ok(!route.body.includes('public-home-title'), `${path} does not fall back to the homepage shell`);
  }
  for (const path of ['/?site=demo-salon', '/?app=1', '/?category=hair_salon', '/?passwordUpdated=1', '/?error_code=otp_expired']) {
    route = await get(path);
    assert.equal(route.status, 200);
    assert.ok(route.body.includes('<div id="root">'));
    if (path === '/?site=demo-salon') assert.equal(route.robots, null, 'published ?site= storefront stays indexable');
    if (path === '/?app=1') assert.equal(route.robots, 'noindex, nofollow', '?app= flow returns X-Robots-Tag: noindex, nofollow');
  }
  // Offline mock DB: exercise the actual production Express-to-SSR path for
  // query aliases and vanity URLs, including crawler HEAD and outage handling.
  for (const path of ['/?site=not-published', '/?s=not-published', '/?subdomain=not-published', '/not-published', '/apiary-salon', '/ap']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 404, `${path}: unpublished SSR status`);
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/i, `${path}: noindex header`);
    assert.match(await response.text(), /<meta name="robots" content="noindex">/i, `${path}: noindex HTML`);
    const head = await fetch(base + path, { method: 'HEAD' });
    assert.equal(head.status, 404, `${path}: HEAD status`);
    assert.match(head.headers.get('x-robots-tag') || '', /noindex/i, `${path}: HEAD noindex header`);
    assert.equal(await head.text(), '', `${path}: HEAD has no body`);
  }
  route = await get('/fixture-db-error');
  assert.equal(route.status, 503, 'database failures remain unavailable rather than unpublished');
  assert.match(route.robots || '', /noindex/i, 'database errors carry noindex');
  route = await get('/demo-salon');
  assert.equal(route.status, 200, 'published vanity renders');
  assert.ok(route.body.includes('Fixture Salon'), 'published vanity SSR renders fixture content');
  assert.equal(route.robots, null, 'published vanity remains indexable');
  for (const combo of [
    '/?site=demo-salon&app=1',
    '/?site=demo-salon&APP=1',
    '/?site=demo-salon&customer=1',
    '/?site=demo-salon&owner=demo-salon',
    '/?site=demo-salon&panel=demo',
    '/?site=demo-salon&create=1',
    '/?site=demo-salon&module=4',
    '/?site=demo-salon&invite=1',
    '/?site=demo-salon&recovery=1',
  ]) {
    route = await get(combo);
    assert.equal(route.status, 200);
    assert.equal(route.robots, 'noindex, nofollow', `${combo} enforces X-Robots-Tag: noindex, nofollow`);
  }
  for (const privatePath of ['/admin/demo-leads', '/ADMIN/demo-leads/', '/owner', '/Owner/']) {
    route = await get(privatePath);
    assert.equal(route.status, 200);
    assert.equal(route.robots, 'noindex, nofollow', `${privatePath} returns X-Robots-Tag: noindex, nofollow`);
  }
  // Staff entry points must be served by the app shell, not 404 and not the
  // homepage document: the client router owns `/staff/accept?token=...`.
  for (const path of ['/staff', '/staff/login', '/staff/accept?token=' + 'a'.repeat(64)]) {
    route = await get(path);
    assert.equal(route.status, 200, `${path} is served`);
    assert.equal(route.robots, 'noindex, nofollow', `${path} returns X-Robots-Tag: noindex, nofollow`);
    assert.ok(route.body.includes('<div id="root">'), `${path} boots the application shell`);
  }
  route = await get('/api/staff-invite-status');
  assert.equal(route.status, 200);
  assert.equal(JSON.parse(route.body).configured, false);
  const staffInvite = await fetch(base + '/api/send-staff-invite', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ inviteId: '11111111-1111-4111-8111-111111111111', token: 'a'.repeat(64) }),
  });
  assert.equal(staffInvite.status, 401, 'invite email needs a signed-in owner');
  assert.equal((await staffInvite.json()).success, false);

  route = await get('/api/health');
  assert.equal(route.status, 200);
  assert.equal(route.robots, 'noindex, nofollow', '/api/health returns X-Robots-Tag: noindex, nofollow');
  assert.equal(JSON.parse(route.body).status, 'ok');
  route = await get('/api/does-not-exist');
  assert.equal(route.status, 404);
  assert.ok(route.type.includes('application/json'));
  assert.equal(JSON.parse(route.body).error, 'Unknown API endpoint');
  route = await get('/api/email-service-status');
  assert.equal(route.status, 200);
  assert.equal(JSON.parse(route.body).mode, 'unconfigured');
  const send = await fetch(base + '/api/send-booking-email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ bookingRef: '11111111-1111-4111-8111-111111111111', to: 'customer@example.com' }),
  });
  assert.equal(send.status, 401);
  assert.equal((await send.json()).success, false);
  const asset = readdirSync('dist/assets').find(file => /^main-.*\.js$/.test(file));
  assert.ok(asset);
  route = await get('/assets/' + asset);
  assert.equal(route.status, 200);
  assert.ok(route.type.includes('javascript'));

  // Vercel Node 22 ESM ("type": "module") requires explicit .js extensions on
  // relative value imports across api/*.ts and their shared server modules.
  const esmFiles = [
    ...readdirSync('api').filter(f => f.endsWith('.ts')).map(f => `api/${f}`),
    ...readdirSync('server').filter(f => f.endsWith('.ts')).map(f => `server/${f}`),
    'src/lib/nexoraEcosystemSeo.ts',
  ];
  for (const file of esmFiles) {
    const src = readFileSync(file, 'utf8');
    for (const match of src.matchAll(/(?:import|export)\s+(?!type\b)[\s\S]*?\bfrom\s+['"](\.[^'"]+)['"]/g)) {
      const specifier = match[1];
      assert.ok(
        specifier.endsWith('.js') || specifier.endsWith('.json'),
        `${file} uses extensionless relative ESM import "${specifier}" (breaks Vercel Node 22 runtime)`,
      );
    }
  }

  console.log('PASS: local production routes — prerendered root, login/template handoff, legacy query roots, health/email APIs, JSON API 404, hashed assets and Vercel Node ESM import extensions. No deployment or live provider calls.');
} finally {
  try {
    if (process.platform === 'win32') child.kill('SIGTERM');
    else process.kill(-child.pid, 'SIGTERM');
  } catch { /* already exited */ }
}
