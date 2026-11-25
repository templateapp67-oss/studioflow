import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const previewUrl = (process.env.PREVIEW_URL || '').trim().replace(/\/+$/, '');
const packageRoot = (process.env.PLAYWRIGHT_PACKAGE_ROOT || '').trim();
const reportDir = resolve(process.env.LIGHTHOUSE_REPORT_DIR || 'test-results/preview-lighthouse');
const bypass = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();

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
      extraHeaders: bypass ? { 'x-vercel-protection-bypass': bypass } : {},
    });
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
