import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const previewUrl = (process.env.PREVIEW_URL || '').trim().replace(/\/+$/, '');
const vercelBypassSecret = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();
const artifactsDir = resolve(process.env.E2E_ARTIFACTS_DIR || 'test-results/preview-browser-e2e');
const screenshotsDir = join(artifactsDir, 'screenshots');
const tracesDir = join(artifactsDir, 'traces');
mkdirSync(screenshotsDir, { recursive: true });
mkdirSync(tracesDir, { recursive: true });
const report = {
  overallStatus: 'FAIL',
  testMode: 'read-only-preview-smoke',
  backendIntegration: 'not tested against hosted Supabase; publishing contract is covered separately by isolated PGlite tests',
  previewUrl: previewUrl || null,
  blockedWriteRequests: [],
  failedRequests: [],
  consoleErrors: [],
  pageErrors: [],
  viewports: [],
};
const summaryPath = join(artifactsDir, 'summary.md');
const reportPath = join(artifactsDir, 'report.json');
function saveReport() {
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const summary = [
    `## Preview Browser E2E (${report.overallStatus})`,
    '',
    `- Test mode: ${report.testMode}`,
    `- Backend integration: ${report.backendIntegration}`,
    `- Preview URL: ${report.previewUrl || 'missing'}`,
    `- Blocked backend write requests: ${report.blockedWriteRequests.length}`,
    `- Failed requests: ${report.failedRequests.length}`,
    `- Console errors: ${report.consoleErrors.length}`,
    `- Page errors: ${report.pageErrors.length}`,
  ].join('\n') + '\n';
  writeFileSync(summaryPath, summary);
  if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
}
if (!previewUrl) {
  report.reason = 'PREVIEW_URL was empty; the deployed preview could not be tested.';
  saveReport();
  console.error(report.reason);
  process.exit(1);
}

const pwRoot = process.env.PLAYWRIGHT_PACKAGE_ROOT;
if (!pwRoot || !existsSync(join(pwRoot, 'node_modules/playwright/package.json'))) {
  report.reason = 'Pinned Playwright installation was not found.';
  saveReport();
  console.error(report.reason);
  process.exit(1);
}
const require = createRequire(join(pwRoot, 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
const safeEndpoint = (raw) => { try { const url = new URL(raw); return url.origin + url.pathname; } catch { return 'invalid-url'; } };
const previewOrigin = previewUrl ? new URL(previewUrl).origin : '';
try {
  for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
    // Keep service-worker fetches visible to the route interceptor so the
    // deployment-protection bypass header reaches every Preview request.
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();
    page.on('console', (msg) => { if (msg.type() === 'error') report.consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => report.pageErrors.push(err.message));
    page.on('requestfailed', (req) => report.failedRequests.push({ endpoint: safeEndpoint(req.url()), error: req.failure()?.errorText || 'request failed' }));
    await page.route('**/*', async (route) => {
      const req = route.request();
      const method = req.method().toUpperCase();
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        report.blockedWriteRequests.push({ method, endpoint: safeEndpoint(req.url()) });
        await route.abort('blockedbyclient');
        return;
      }
      const headers = { ...req.headers() };
      if (vercelBypassSecret && new URL(req.url()).origin === previewOrigin) {
        headers['x-vercel-protection-bypass'] = vercelBypassSecret;
        headers['x-vercel-set-bypass-cookie'] = 'true';
      }
      await route.continue({ headers });
    });
    const smokeUrl = new URL('/sign-in', previewUrl).toString();
    const response = await page.goto(smokeUrl, { waitUntil: 'networkidle', timeout: 60000 });
    assert.ok(response && response.ok(), `Preview returned ${response?.status() ?? 'no response'} at ${viewport.width}px`);
    assert.equal(new URL(page.url()).origin, new URL(previewUrl).origin, 'Preview redirected away from its deployment URL (possibly a protection/login page)');
    assert.doesNotMatch(await page.locator('body').innerText(), /vercel deployment protection|authentication required/i, 'Preview returned a deployment protection interstitial instead of the application');
    await page.screenshot({ path: join(screenshotsDir, `preview-${viewport.width}.png`), fullPage: true });
    report.viewports.push({ ...viewport, status: response.status(), title: await page.title() });
    await context.tracing.stop({ path: join(tracesDir, `preview-${viewport.width}.zip`) });
    await context.close();
  }
  assert.deepEqual(report.blockedWriteRequests, [], `Preview attempted ${report.blockedWriteRequests.length} backend write request(s)`);
  assert.deepEqual(report.failedRequests, [], `Browser network failures: ${JSON.stringify(report.failedRequests)}`);
  assert.deepEqual(report.pageErrors, [], `Browser page errors: ${report.pageErrors.join(' | ')}`);
  assert.deepEqual(report.consoleErrors, [], `Browser console errors: ${report.consoleErrors.join(' | ')}`);
  report.overallStatus = 'PASS';
} catch (error) {
  report.reason = error instanceof Error ? error.message : String(error);
  console.error('Preview browser smoke failed:', report.reason);
} finally {
  await browser.close();
  saveReport();
}
if (report.overallStatus !== 'PASS') process.exitCode = 1;
