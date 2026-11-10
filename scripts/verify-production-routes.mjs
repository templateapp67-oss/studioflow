// End-to-end local production route smoke. Runs against the built Express
// bundle on an ephemeral loopback port; it does not deploy or call providers.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, readdirSync } from 'node:fs';

assert.ok(existsSync('dist/server.cjs'), 'Run npm run build before verify-production-routes.mjs');
const probe = createServer();
await new Promise((resolve, reject) => probe.once('error', reject).listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const child = spawn(process.execPath, ['dist/server.cjs', '--port', String(port)], {
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
  const get = async path => { const response = await fetch(base + path); return { status: response.status, type: response.headers.get('content-type') || '', body: await response.text() }; };

  let route = await get('/');
  assert.equal(route.status, 200);
  assert.ok(route.body.includes('public-home-title') && route.body.includes('<div id="root">'));
  route = await get('/login?auth=signup&template=hair_salon&create=1');
  assert.equal(route.status, 200);
  assert.ok(route.body.includes('Sign in to NEXORA'));
  route = await get('/template-pages/hair-salon.html');
  assert.equal(route.status, 200);
  assert.ok(route.body.includes('data-template-id="hair_salon"'));
  // Each NEXORA marketing route must answer with its own prerendered document,
  // not the homepage shell that used to own every non-app path.
  for (const path of ['/salon-onboarding', '/salon-growth', '/growth-partner-rewards']) {
    route = await get(path);
    assert.equal(route.status, 200);
    assert.ok(
      route.body.includes(`<link rel="canonical" href="https://nexorasalon.online${path}"`),
      `${path} serves its own prerendered document`,
    );
    assert.ok(route.body.includes('<div id="root">'), `${path} hydrates into the root element`);
  }
  for (const path of ['/?site=demo-salon', '/?app=1', '/?category=hair_salon', '/?passwordUpdated=1', '/?error_code=otp_expired']) {
    route = await get(path);
    assert.equal(route.status, 200);
    assert.ok(route.body.includes('<div id="root">'));
  }
  route = await get('/api/health');
  assert.equal(route.status, 200);
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
  console.log('PASS: local production routes — prerendered root, login/template handoff, legacy query roots, health/email APIs, JSON API 404 and hashed assets. No deployment or live provider calls.');
} finally {
  try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already exited */ }
}
