import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

// These are synthetic local responses, not evidence about the deployed site.
const origin = 'https://nexorasalon.online';
const urls = ['/', '/salon-onboarding', '/salon-growth', '/growth-partner-rewards', '/partner-rewards', '/?site=artbyuma'];
const dir = mkdtempSync(join(tmpdir(), 'studioflow-seo-contract-'));
const bypassSentinel = 'preview-bypass-sentinel';
let mode = 'pass';
let redirectPort;
let bypassLeaked = false;
let bypassReceived = false;
const redirectServer = createServer((req, res) => {
  if (req.headers['x-vercel-protection-bypass']) bypassLeaked = true;
  res.writeHead(mode === 'redirect' ? 301 : 308, { Location: `${origin}${req.url}` });
  res.end();
});
const server = createServer((req, res) => {
  if (req.headers['x-vercel-protection-bypass'] === bypassSentinel) bypassReceived = true;
  const request = new URL(req.url, origin);
  const path = request.pathname;
  if (mode === 'external-redirect' && path === '/pricing') {
    res.writeHead(302, { Location: `http://127.0.0.1:${redirectPort}/external` });
    return res.end();
  }
  // 2b probe: an unknown salon (query-string `?site=` and vanity-path) must reach
  // the storefront SSR 404, not a generic 200 fallback. Mirrors the real SSR
  // not-found document: HTTP 404, a noindex meta, and the NEXORA not-found copy.
  if (path === '/nexora-seo-404-probe-2026' || request.searchParams.get('site') === 'nexora-seo-404-probe-2026') {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    return res.end('<html><head><meta name="robots" content="noindex"><title>Salon website not found</title></head><body>Salon website not found</body></html>');
  }
  const params = ['app', 'customer', 'customer_ref', 'owner', 'panel', 'create', 'module', 'invite', 'recovery'];
  const isPrivate = /^\/(api|admin|owner|staff)(\/|$)/.test(path) || params.some((key) => request.searchParams.has(key));
  const isAuth = ['/login', '/sign-in', '/sign-up'].includes(path) && !isPrivate;
  if (isPrivate && mode !== 'private-header') res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (isAuth && mode !== 'auth-header') res.setHeader('X-Robots-Tag', 'noindex, follow');
  if (mode === 'public-header' && path === '/pricing') res.setHeader('X-Robots-Tag', 'noindex');
  if (path === '/robots.txt') {
    // A valid robots.txt groups search crawlers (allow public, block API),
    // training crawlers (block all), and a default group, then points at the
    // canonical apex sitemap. The `robots` / `robots-lowercase` regressions add
    // an extra disallow to the default group, which the checker must reject.
    const searchAgents = ['Googlebot', 'Googlebot-Image', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User'];
    const trainingAgents = ['GPTBot', 'ClaudeBot', 'Google-Extended'];
    const defaultGroup = ['Allow: /', 'Disallow: /api/'];
    const defect = mode === 'robots' ? 'Disallow: /login' : mode === 'robots-lowercase' ? 'disallow: /login' : null;
    const lines = ['User-agent: *', ...defaultGroup, ...(defect ? [defect] : []),
      ...searchAgents.flatMap((agent) => ['User-agent: ' + agent, 'Allow: /', 'Disallow: /api/']),
      ...trainingAgents.flatMap((agent) => ['User-agent: ' + agent, 'Disallow: /']),
      `Sitemap: ${origin}/sitemap.xml`];
    return res.end(lines.join('\n') + '\n');
  }
  if (path === '/llms.txt') return res.end(`${origin}/\n` + (mode === 'llms' ? 'https://bad.vercel.app/\n' : ''));
  if (path === '/sitemap.xml') {
    res.setHeader('Content-Type', 'application/xml');
    let locs = mode === 'missing-published' ? urls.slice(0, -1) : [...urls];
    if (mode === 'empty-site') locs[locs.length - 1] = '/?site=';
    if (mode === 'duplicate') locs.push(locs[0]);
    let body = locs.map((url) => `<url><loc>${origin}${url}</loc></url>`).join('');
    if (mode === 'credential') body += '<url><loc>https://private-sentinel@nexorasalon.online/?site=abc</loc></url>';
    return res.end(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}${mode === 'malformed' ? '' : '</urlset>'}`);
  }
  if (path.startsWith('/partner-rewards')) return res.end(mode === 'partner' ? 'public-home-title' :
    `Partner Rewards &amp; Recognition<link rel="canonical" href="${origin}/partner-rewards">`);
  res.end('OK');
});
try {
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  await new Promise((resolve, reject) => redirectServer.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  redirectPort = redirectServer.address().port;
  const scenarios = {
    pass: null,
    redirect: /must return HTTP 308/,
    'external-redirect': /refused a cross-origin redirect/,
    robots: /default crawlers can access public pages but not APIs/,
    'robots-lowercase': /default crawlers can access public pages but not APIs/,
    llms: /zero \*\.vercel\.app URLs/,
    malformed: /not a valid XML sitemap/,
    duplicate: /no duplicate <loc> entries/,
    'missing-published': /must include published Supabase/,
    'empty-site': /slug must be nonempty/,
    credential: /must not contain credentials or fragments/,
    partner: /serves prerendered Partner Rewards content/,
    'public-header': /must not send X-Robots-Tag/,
    'auth-header': /must return X-Robots-Tag: noindex, follow/,
    'private-header': /must return X-Robots-Tag: noindex, nofollow/,
  };
  for (const [scenario, expectedError] of Object.entries(scenarios)) {
    mode = scenario;
    const reportPath = join(dir, `${mode}.json`);
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/verify-live-seo-http.mjs'], {
        env: { ...process.env, LIVE_SEO_URL: `http://127.0.0.1:${port}`, CHECK_WWW_REDIRECT_URL: `http://127.0.0.1:${redirectPort}`, CHECK_HTTP_REDIRECT: '0',
          REQUIRE_PUBLISHED_SITES: '1', SEO_WAIT_RETRY_ATTEMPTS: '1', SEO_REPORT_PATH: reportPath, VERCEL_AUTOMATION_BYPASS_SECRET: bypassSentinel },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stderr = '';
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.stdout.resume();
      child.once('error', reject);
      child.once('close', (code) => resolve({ code, stderr }));
    });
    const rawReport = readFileSync(reportPath, 'utf8');
    const report = JSON.parse(rawReport);
    assert.equal(result.code === 0, mode === 'pass', `${mode}: ${result.stderr}`);
    assert.equal(report.overallStatus, mode === 'pass' ? 'PASS' : 'FAIL', `${mode} report status`);
    if (expectedError) assert.match(report.error, expectedError, `${mode} must fail for the intended reason`);
    if (mode === 'credential') assert(!`${rawReport}\n${result.stderr}`.includes('private-sentinel'), 'invalid sitemap credentials must not leak');
    if (mode === 'pass') {
      assert.equal(report.sitemapXml.totalUrls, urls.length);
      assert.equal(report.redirects.length, 4, 'four www redirect paths must be checked');
    }
  }
  assert.equal(bypassReceived, true, 'preview bypass must reach its intended target');
  assert.equal(bypassLeaked, false, 'preview bypass must never be sent to a different origin');
  console.log('PASS: live SEO checker accepts a valid fixture, rejects fourteen targeted regressions, and protects the preview bypass.');
} finally {
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => redirectServer.close(resolve));
  rmSync(dir, { recursive: true, force: true });
}
