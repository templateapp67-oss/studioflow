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
  backendIntegration: 'read-only published-salon lookup through the hosted Supabase public view; no backend writes',
  previewUrl: previewUrl || null,
  blockedWriteRequests: [],
  allowedReadOnlyRpcRequests: [],
  failedRequests: [],
  consoleErrors: [],
  pageErrors: [],
  viewports: [],
  storefrontSsrProbe: null,
  storefrontDirectApiProbe: null,
  existingApiProbe: null,
  storefrontPublishedProbe: null,
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
    // A saved language preference must be applied after hydration, not while
    // React is producing the first client tree.
    await context.addInitScript(() => localStorage.setItem('nexora-website-language', 'hi'));
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();
    page.on('console', (msg) => { if (msg.type() === 'error') report.consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => report.pageErrors.push(err.message));
    page.on('requestfailed', (req) => {
      const host = (() => { try { return new URL(req.url()).hostname.toLowerCase(); } catch { return ''; } })();
      // Clarity analytics is intentionally blocked in this read-only browser
      // test; its client-aborted telemetry is not an application network error.
      if (host === 'clarity.ms' || host.endsWith('.clarity.ms') || host === 'c.bing.com') return;
      report.failedRequests.push({ endpoint: safeEndpoint(req.url()), error: req.failure()?.errorText || 'request failed' });
    });
    await page.route('**/*', async (route) => {
      const req = route.request();
      const method = req.method().toUpperCase();
      const requestUrl = new URL(req.url());
      const isClarityTelemetry = method === 'POST'
        && (requestUrl.hostname === 'clarity.ms' || requestUrl.hostname.endsWith('.clarity.ms'))
        && requestUrl.pathname === '/collect';
      if (isClarityTelemetry) {
        // The test is read-only: block external analytics beacons silently,
        // without treating them as backend data mutations.
        await route.abort('blockedbyclient');
        return;
      }
      const readOnlyPublicRpc = method === 'POST'
        && requestUrl.hostname === 'zilwgiuiygqqardzutxi.supabase.co'
        && [
          '/rest/v1/rpc/studioflow_list_reviews',
          '/rest/v1/rpc/studioflow_tawk_public_config',
        ].includes(requestUrl.pathname);
      if (readOnlyPublicRpc) {
        // Supabase RPC uses POST even for read-only STABLE functions. These
        // two public functions only fetch customer reviews/Tawk display config.
        report.allowedReadOnlyRpcRequests.push({ method, endpoint: safeEndpoint(req.url()) });
        const headers = { ...req.headers() };
        if (vercelBypassSecret && requestUrl.origin === previewOrigin) {
          headers['x-vercel-protection-bypass'] = vercelBypassSecret;
          headers['x-vercel-set-bypass-cookie'] = 'true';
        }
        await route.continue({ headers });
        return;
      }
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

    // Exercise the actual Vercel rewrite and SSR function, not only the SPA
    // shell. A deliberately unpublished slug must return the function's
    // noindex 404 document; a client-side fallback (200) or function crash
    // (500) means the published-salon SSR route is not wired correctly.
    if (viewport.width === 1440) {
      // Keep the legacy sitemap endpoint as a diagnostic only. It predates
      // this SSR function and must not prevent the storefront-specific probes
      // from running when another deployment route is unhealthy.
      const sitemapUrl = new URL('/api/sitemap', previewUrl).toString();
      const existingApiResponse = await context.request.get(sitemapUrl, {
        timeout: 60000,
        headers: vercelBypassSecret ? {
          'x-vercel-protection-bypass': vercelBypassSecret,
          'x-vercel-set-bypass-cookie': 'true',
        } : {},
      });
      const existingApiBody = await existingApiResponse.text();
      report.existingApiProbe = {
        status: existingApiResponse.status(),
        contentType: existingApiResponse.headers()['content-type'] || '',
        responseLooksLikeSitemap: /<\\?xml|<urlset/.test(existingApiBody),
      };

      // Call the serverless function directly before testing root middleware.
      // This separates API startup/registration from a middleware rewrite issue.
      // The probe is a read-only lookup for a deliberately unpublished slug.
      const directApiSlug = 'nexora-ssr-direct-api-probe-not-published';
      const directApiUrl = new URL('/api/storefront?path=%2F&site=' + encodeURIComponent(directApiSlug), previewUrl).toString();
      const directApiResponse = await page.goto(directApiUrl, { waitUntil: 'networkidle', timeout: 60000 });
      const directApiBody = directApiResponse ? await directApiResponse.text() : '';
      const directApiHeaders = directApiResponse ? {
        handler: directApiResponse.headers()['x-nexora-ssr-handler'] || '',
        stage: directApiResponse.headers()['x-nexora-ssr-stage'] || '',
        slug: directApiResponse.headers()['x-nexora-ssr-slug'] || '',
        requestId: directApiResponse.headers()['x-vercel-id'] || '',
      } : {};
      assert.equal(directApiResponse?.status(), 404, `Direct SSR API probe should return 404, got ${directApiResponse?.status() ?? 'no response'}; headers=${JSON.stringify(directApiHeaders)}; body=${directApiBody.slice(0, 1200)}`);
      assert.equal(directApiHeaders.handler, 'entered', 'Direct SSR API probe must enter the storefront function handler');
      assert.equal(directApiHeaders.stage, 'unpublished', 'Direct SSR API probe must complete the public database lookup');
      report.storefrontDirectApiProbe = { status: directApiResponse.status(), ...directApiHeaders };

      const probeUrl = new URL('/?site=nexora-ssr-preview-probe-not-published', previewUrl).toString();
      const probeResponse = await page.goto(probeUrl, { waitUntil: 'networkidle', timeout: 60000 });
      const probeBody = probeResponse ? await probeResponse.text() : '';
      const probeHeaders = probeResponse ? {
        contentType: probeResponse.headers()['content-type'] || '',
        requestId: probeResponse.headers()['x-vercel-id'] || '',
        middleware: probeResponse.headers()['x-nexora-ssr-middleware'] || '',
        handler: probeResponse.headers()['x-nexora-ssr-handler'] || '',
        stage: probeResponse.headers()['x-nexora-ssr-stage'] || '',
        slug: probeResponse.headers()['x-nexora-ssr-slug'] || '',
      } : {};
      assert.equal(probeResponse?.status(), 404, `SSR probe should return the not-published 404, got ${probeResponse?.status() ?? 'no response'}; headers=${JSON.stringify(probeHeaders)}; body=${probeBody.slice(0, 1200)}`);
      assert.match(await page.title(), /salon website not found/i, 'SSR route did not return its server-rendered not-found document');
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex', 'Unpublished salon response must not be indexed');
      assert.match(await page.locator('body').innerText(), /This salon website is not published/i);
      report.storefrontSsrProbe = { status: probeResponse.status(), title: await page.title(), robots: 'noindex' };

      // Prove the positive path too: read one already-published public salon
      // from the production App database. This is GET-only and does not edit
      // customer or salon data. The slug can be overridden by CI if the
      // designated smoke salon is ever intentionally unpublished.
      const publishedSlug = (process.env.SSR_TEST_PUBLISHED_SLUG || 'vijaysalojaipur').trim();
      assert.match(publishedSlug, /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/, 'SSR published test slug must be a valid public slug');
      const publishedUrl = new URL('/?site=' + encodeURIComponent(publishedSlug), previewUrl).toString();
      const publishedResponse = await page.goto(publishedUrl, { waitUntil: 'networkidle', timeout: 60000 });
      const publishedHtml = publishedResponse ? await publishedResponse.text() : '';
      const publishedHeaders = publishedResponse ? {
        handler: publishedResponse.headers()['x-nexora-ssr-handler'] || '',
        stage: publishedResponse.headers()['x-nexora-ssr-stage'] || '',
        slug: publishedResponse.headers()['x-nexora-ssr-slug'] || '',
        requestId: publishedResponse.headers()['x-vercel-id'] || '',
      } : {};
      report.storefrontPublishedProbe = {
        status: publishedResponse?.status() ?? 0,
        ...publishedHeaders,
        responseSample: publishedHtml.slice(0, 1200),
      };
      assert.equal(publishedResponse?.status(), 200, `Published salon SSR should return 200, got ${publishedResponse?.status() ?? 'no response'}; headers=${JSON.stringify(publishedHeaders)}; body=${publishedHtml.slice(0, 1200)}`);
      const payloadMatch = publishedHtml.match(/<script id="nexora-published-site-data" type="application\/json">([\s\S]*?)<\/script>/);
      assert.ok(payloadMatch, 'Published salon response must contain the server-rendered hydration payload');
      const publishedPayload = JSON.parse(payloadMatch[1]);
      assert.equal(publishedPayload.slug, publishedSlug, 'SSR hydration payload must belong to the requested published salon');
      const businessName = String(publishedPayload.site?.profile?.businessName || '').trim();
      assert.ok(businessName, 'Published salon SSR payload must include its own business name');
      assert.ok(publishedHtml.includes(businessName), 'Raw HTTP HTML must contain the published salon business name before client JavaScript');
      assert.match(publishedHtml, /<meta name="robots" content="index,follow">/, 'Published salon HTML must be indexable');
      assert.match(publishedHtml, /<link rel="canonical" href="/, 'Published salon HTML must contain a canonical URL');
      assert.match(publishedHtml, /application\/ld\+json/, 'Published salon HTML must contain structured data');
      report.storefrontPublishedProbe = {
        status: publishedResponse.status(),
        slug: publishedSlug,
        businessName,
        title: (publishedHtml.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '',
        robots: 'index,follow',
        serverRendered: true,
      };
    }

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
