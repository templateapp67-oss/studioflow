import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const previewUrl = (process.env.PREVIEW_URL || '').trim().replace(/\/+$/, '');
const packageRoot = (process.env.PLAYWRIGHT_PACKAGE_ROOT || '').trim();
const reportDir = resolve(process.env.LIGHTHOUSE_REPORT_DIR || 'test-results/preview-lighthouse');
const bypass = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();
const previewHeaders = bypass ? { 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' } : {};

if (!previewUrl) throw new Error('PREVIEW_URL is required for Lighthouse preview auditing.');
if (!packageRoot) throw new Error('PLAYWRIGHT_PACKAGE_ROOT is required for pinned browser tooling.');

mkdirSync(reportDir, { recursive: true });
const require = createRequire(join(packageRoot, 'package.json'));
const { chromium } = require('playwright');
const lighthouseModule = await import(pathToFileURL(require.resolve('lighthouse')).href);
const lighthouse = lighthouseModule.default || lighthouseModule;
const chromeLauncher = require('chrome-launcher');

const browserExecutable = chromium.executablePath();
const routes = ['/', '/about', '/pricing', '/template-pages/hair-salon.html'];
const report = {
  overallStatus: 'FAIL',
  previewUrl,
  profile: 'Lighthouse mobile simulated throttling',
  budgets: { lcpMs: 2500, cls: 0.1, tbtMs: 300, performanceScore: 0.8, seoScore: 0.95 },
  pages: [],
  note: 'Lighthouse lab data is not field INP or real-device measurement.',
};

// Vercel Preview deployments are intentionally excluded from search indexing.
// Keep the staging-only noindex audit out of the Lighthouse SEO score, while
// explicitly proving that robots.txt itself is publicly retrievable and valid.
const robotsResponse = await fetch(new URL('/robots.txt', previewUrl), {
  headers: previewHeaders,
  signal: AbortSignal.timeout(15000),
});
const robotsBody = await robotsResponse.text();
assert.equal(robotsResponse.status, 200, 'Preview robots.txt must be retrievable (HTTP 200).');
assert.match(robotsResponse.headers.get('content-type') || '', /text\/plain/i, 'Preview robots.txt must be served as plain text.');
const robotsLines = robotsBody.split(/\r?\n/).map(line => line.trim());
assert.ok(robotsLines.includes('Allow: /'), 'robots.txt must allow public crawling.');
assert.ok(robotsLines.includes('Disallow: /api/'), 'robots.txt must disallow API routes.');
assert.ok(robotsLines.includes('Sitemap: https://nexorasalon.online/sitemap.xml'), 'robots.txt must point to the canonical sitemap.');
report.robotsTxt = {
  status: robotsResponse.status,
  contentType: robotsResponse.headers.get('content-type') || '',
  allowsPublicPages: robotsLines.includes('Allow: /'),
  disallowsApi: robotsLines.includes('Disallow: /api/'),
  canonicalSitemap: robotsLines.includes('Sitemap: https://nexorasalon.online/sitemap.xml'),
};
report.previewIndexingPolicy = 'Vercel Preview is intentionally noindex; is-crawlable is excluded from the preview score. Canonical production crawlability is covered by the live SEO gate after production rollout.';

const diagnosticBrowser = await chromium.launch({
  headless: true,
  executablePath: browserExecutable,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let failed = false;
for (const route of routes) {
  const chrome = await chromeLauncher.launch({
    chromePath: browserExecutable,
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
    logLevel: 'error',
  });
  try {
    const url = new URL(route, previewUrl).toString();
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'seo', 'accessibility'],
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
      throttlingMethod: 'simulate',
      extraHeaders: previewHeaders,
    }, {
      extends: 'lighthouse:default',
      settings: {
        skipAudits: ['is-crawlable', 'robots-txt'],
      },
    });
    const diagnosticContext = await diagnosticBrowser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      extraHTTPHeaders: previewHeaders,
    });
    const diagnosticPage = await diagnosticContext.newPage();
    await diagnosticPage.addInitScript(() => {
      const shifts = [];
      Object.defineProperty(window, '__nexoraLayoutShifts', { value: shifts, configurable: false });
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.hadRecentInput) continue;
              const sources = (entry.sources || []).map((source) => {
                const node = source.node;
                const selector = node
                  ? [node.tagName?.toLowerCase(), node.id ? '#' + node.id : '', typeof node.className === 'string' && node.className.trim() ? '.' + node.className.trim().split(/\s+/).slice(0, 3).join('.') : ''].join('')
                  : null;
                return {
                  selector,
                  snippet: node?.outerHTML?.slice(0, 320) || null,
                  previousRect: source.previousRect ? {
                    x: source.previousRect.x, y: source.previousRect.y,
                    width: source.previousRect.width, height: source.previousRect.height,
                  } : null,
                  currentRect: source.currentRect ? {
                    x: source.currentRect.x, y: source.currentRect.y,
                    width: source.currentRect.width, height: source.currentRect.height,
                  } : null,
                };
              });
              shifts.push({ value: entry.value, startTime: entry.startTime, sources });
            }
          });
          observer.observe({ type: 'layout-shift', buffered: true });
        } catch { /* Layout Shift attribution is not supported in every Chromium build. */ }
      }
    });
    let layoutShiftDiagnostics = [];
    let visualDiagnostics = null;
    try {
      await diagnosticPage.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await diagnosticPage.waitForTimeout(2000);
      layoutShiftDiagnostics = await diagnosticPage.evaluate(() => window.__nexoraLayoutShifts || []);
      visualDiagnostics = await diagnosticPage.evaluate(() => ({
        fontStatus: document.fonts?.status || 'unknown',
        fonts: document.fonts ? {
          hanken: document.fonts.check('16px "Hanken Grotesk"'),
          manrope: document.fonts.check('16px Manrope'),
          poppins: document.fonts.check('16px Poppins'),
        } : null,
        images: [...document.images].slice(0, 30).map((image) => ({
          src: image.currentSrc || image.src,
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          width: image.getBoundingClientRect().width,
          height: image.getBoundingClientRect().height,
        })),
      }));
    } catch (diagnosticError) {
      layoutShiftDiagnostics = [{ diagnosticError: diagnosticError instanceof Error ? diagnosticError.message : String(diagnosticError) }];
    } finally {
      await diagnosticContext.close();
    }
    const lhr = result.lhr;
    const page = {
      path: route,
      finalUrl: lhr.finalDisplayedUrl,
      performanceScore: lhr.categories.performance.score,
      seoScore: lhr.categories.seo.score,
      accessibilityScore: lhr.categories.accessibility.score,
      lcpMs: lhr.audits['largest-contentful-paint']?.numericValue ?? null,
      cls: lhr.audits['cumulative-layout-shift']?.numericValue ?? null,
      tbtMs: lhr.audits['total-blocking-time']?.numericValue ?? null,
      statusCode: lhr.audits['http-status-code']?.details?.items?.[0]?.httpStatusCode ?? null,
      layoutShiftDiagnostics,
      visualDiagnostics,
    };
    const seoAuditFailures = (lhr.categories.seo?.auditRefs ?? [])
      .filter((auditRef) => auditRef.weight > 0 && lhr.audits[auditRef.id]?.score !== 1)
      .map((auditRef) => {
        const audit = lhr.audits[auditRef.id] ?? {};
        return {
          id: auditRef.id,
          title: audit.title,
          score: audit.score,
          displayValue: audit.displayValue ?? null,
          explanation: audit.explanation ?? null,
          description: audit.description ?? null,
        };
      });
    const shiftElements = lhr.audits['layout-shift-elements']?.details?.items ?? [];
    const shiftCulprits = lhr.audits['layout-shift-culprits']?.details?.items ?? [];
    page.seoAuditFailures = seoAuditFailures;
    page.layoutShiftElements = shiftElements.slice(0, 8).map((item) => ({
      selector: item.node?.selector ?? null,
      snippet: item.node?.snippet ?? null,
      score: item.score ?? item.totalScore ?? null,
      cause: item.cause ?? null,
    }));
    page.layoutShiftCulprits = shiftCulprits.slice(0, 8).map((item) => ({
      selector: item.node?.selector ?? null,
      snippet: item.node?.snippet ?? null,
      score: item.score ?? null,
      subparts: item.subparts ?? null,
    }));
    const failures = [];
    if (page.performanceScore === null || page.performanceScore < report.budgets.performanceScore) failures.push('performance score below budget');
    if (page.seoScore === null || page.seoScore < report.budgets.seoScore) failures.push('SEO score below budget');
    if (page.lcpMs === null || page.lcpMs > report.budgets.lcpMs) failures.push('LCP above budget');
    if (page.cls === null || page.cls > report.budgets.cls) failures.push('CLS above budget');
    if (page.tbtMs === null || page.tbtMs > report.budgets.tbtMs) failures.push('TBT above budget');
    if (lhr.audits['http-status-code']?.score !== 1) failures.push('HTTP response is not a successful 2xx response');
    if (page.statusCode !== null && page.statusCode !== 200) failures.push('HTTP status is not 200');
    page.failures = failures;
    if (failures.length) failed = true;
    report.pages.push(page);
  } finally {
    await chrome.kill();
  }
}
await diagnosticBrowser.close();
report.overallStatus = failed ? 'FAIL' : 'PASS';
report.generatedAt = new Date().toISOString();
writeFileSync(join(reportDir, 'lighthouse-mobile-report.json'), JSON.stringify(report, null, 2) + '\n');
const summary = [
  '## Lighthouse mobile preview audit: ' + report.overallStatus,
  '',
  '| Route | Performance | SEO | Accessibility | LCP | CLS | TBT |',
  '|---|---:|---:|---:|---:|---:|---:|',
  ...report.pages.map(page => '| ' + page.path + ' | ' + Math.round((page.performanceScore || 0) * 100) + ' | ' + Math.round((page.seoScore || 0) * 100) + ' | ' + Math.round((page.accessibilityScore || 0) * 100) + ' | ' + Math.round(page.lcpMs || 0) + ' ms | ' + Number(page.cls || 0).toFixed(3) + ' | ' + Math.round(page.tbtMs || 0) + ' ms |'),
  '',
  'Budgets: LCP <= 2.5s, CLS <= 0.10, TBT <= 300ms, Performance >= 80, SEO >= 95.',
  'INP is not claimed by this lab run. It needs real-user interaction data.',
  '',
  ...report.pages.map(page => page.path + ': ' + (page.failures.length ? page.failures.join(', ') : 'PASS')),
  '',
  ...report.pages.flatMap(page => [
    '### Diagnostics: ' + page.path,
    'SEO failures: ' + (page.seoAuditFailures.length ? page.seoAuditFailures.map(item => item.id + ' (' + item.score + ')').join(', ') : 'none'),
    'SEO details: ' + (page.seoAuditFailures.length ? page.seoAuditFailures.map(item => item.id + ': ' + (item.explanation || item.displayValue || item.title)).join(' | ') : 'none'),
    'CLS elements: ' + (page.layoutShiftElements.length ? page.layoutShiftElements.map(item => (item.selector || item.snippet || 'unknown') + ' [' + item.score + ']').join('; ') : 'not reported'),
    'CLS culprits: ' + (page.layoutShiftCulprits.length ? page.layoutShiftCulprits.map(item => (item.selector || item.snippet || 'unknown') + ' [' + item.score + ']').join('; ') : 'not reported'),
  ]),
].join('\n') + '\n';
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}
console.log(summary);
assert.equal(report.overallStatus, 'PASS', 'All public preview pages must satisfy the mobile Lighthouse budgets.');
