import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

// Exercise the real checker through its first private endpoint. A failed API
// response can contain sensitive data; it must fail the check without copying
// the body into the JSON report, stdout, or stderr.
const sentinel = 'private-response-sentinel-do-not-publish-81624';
const dir = mkdtempSync(join(tmpdir(), 'studioflow-seo-report-'));
const reportPath = join(dir, 'report.json');
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const request = new URL(req.url, 'http://localhost');
  if (path === '/api/email-service-status') {
    res.writeHead(403, { 'x-robots-tag': 'noindex, nofollow' });
    res.end(sentinel);
  } else if (path === '/nexora-seo-404-probe-2026' || request.searchParams.get('site') === 'nexora-seo-404-probe-2026') {
    // 2b probe: unknown salon must reach the storefront SSR 404, not a 200 fallback.
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<html><head><meta name="robots" content="noindex"><title>Salon website not found</title></head><body>Salon website not found</body></html>');
  } else if (['/login', '/sign-in', '/sign-up'].includes(path)) {
    res.writeHead(200, { 'x-robots-tag': 'noindex, follow' });
    res.end('auth');
  } else {
    res.writeHead(200);
    res.end(path.startsWith('/partner-rewards')
      ? 'Partner Rewards &amp; Recognition<link rel="canonical" href="https://nexorasalon.online/partner-rewards">'
      : 'public');
  }
});
try {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/verify-live-seo-http.mjs'], {
      env: { ...process.env, LIVE_SEO_URL: `http://127.0.0.1:${port}`, CHECK_WWW_REDIRECT_URL: '',
        CHECK_HTTP_REDIRECT: '0', SEO_WAIT_RETRY_ATTEMPTS: '1', SEO_REPORT_PATH: reportPath },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code) => resolve({ code, stdout, stderr }));
  });
  assert.notEqual(result.code, 0, 'private endpoint failure must fail the live checker');
  const raw = readFileSync(reportPath, 'utf8');
  const report = JSON.parse(raw);
  assert.equal(report.overallStatus, 'FAIL');
  assert.equal(report.privateHeaders[0].status, 403);
  assert(!(`${raw}\n${result.stdout}\n${result.stderr}`).includes(sentinel), 'private response body must not be published');
  console.log('PASS: failed private SEO probe fails closed without exposing its response body.');
} finally {
  await new Promise((resolve) => server.close(resolve));
  rmSync(dir, { recursive: true, force: true });
}
