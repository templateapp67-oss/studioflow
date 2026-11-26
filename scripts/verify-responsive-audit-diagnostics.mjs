import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { responsiveDiagnostic, writeResponsiveReport } from './responsive-audit-diagnostics.mjs';

const secret = 'private-token-do-not-report-82537';
const error = { code: 'ERR_ASSERTION', message: secret, stack: `Error: ${secret}\n    at file:///workspace/scripts/verify-nexora-responsive-browser.mjs:352:7` };
const report = responsiveDiagnostic(error, `/ hover-card ${secret}`);
assert.deepEqual(report, { status: 'FAIL', phase: 'hover-card', kind: 'assertion', line: 352 });
assert.deepEqual(responsiveDiagnostic({ name: 'TimeoutError', stack: secret }, `SPA ${secret}`), { status: 'FAIL', phase: 'spa-seo', kind: 'timeout', line: null });
assert.deepEqual(responsiveDiagnostic(new Error(secret), secret), { status: 'FAIL', phase: 'startup-or-other', kind: 'other', line: null });

// The no-script horizontal-overflow assertion embeds bounded structural
// geometry; the diagnostic must surface it (top nodes, document vs viewport
// width) without leaking page text or URLs.
const overflowPayload = JSON.stringify({
  viewportWidth: 390,
  documentWidth: 581,
  overflowingElements: [
    { tag: 'table', className: 'nx-compare', id: '', left: 21, right: 581, width: 560, position: 'static', overflowX: 'visible' },
    { tag: 'span', className: 'nx-compare__numeric', id: '', left: 521, right: 585, width: 64, position: 'static', overflowX: 'visible' },
  ],
});
const overflowError = {
  code: 'ERR_ASSERTION',
  message: `/pricing/ no-script document has no horizontal overflow at 390px: ${overflowPayload}`,
  stack: `Error: assertion\n    at file:///workspace/scripts/verify-nexora-responsive-browser.mjs:654:7`,
};
const overflowReport = responsiveDiagnostic(overflowError, '/pricing/');
assert.equal(overflowReport.status, 'FAIL');
assert.equal(overflowReport.phase, 'public-route');
assert.equal(overflowReport.kind, 'assertion');
assert.equal(overflowReport.line, 654);
assert.ok(overflowReport.overflow, 'overflow geometry is surfaced in the report');
assert.equal(overflowReport.overflow.documentWidth, 581);
assert.equal(overflowReport.overflow.viewportWidth, 390);
assert.equal(overflowReport.overflow.elementCount, 2);
assert.equal(overflowReport.overflow.top[0].tag, 'table');
assert.equal(overflowReport.overflow.top[0].right, 581);
assert.ok(!JSON.stringify(overflowReport).includes('/pricing/'), 'overflow summary does not leak the route path');

// A malformed/absent overflow payload must not break the diagnostic.
const noOverflow = responsiveDiagnostic({ code: 'ERR_ASSERTION', message: 'plain assertion', stack: 'at verify-nexora-responsive-browser.mjs:10:1' }, '/');
assert.equal(noOverflow.overflow, undefined, 'non-overflow assertions carry no overflow field');

assert.ok(!JSON.stringify(report).includes(secret), 'diagnostic cannot expose exception data or route values');
const dir = mkdtempSync(join(tmpdir(), 'responsive-report-'));
try {
  const file = join(dir, 'nested', 'report.json');
  writeResponsiveReport(file, report);
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), report);
  writeResponsiveReport(undefined, report);
} finally { rmSync(dir, { recursive: true, force: true }); }
const workflow = readFileSync('.github/workflows/preview.yml', 'utf8');
const responsive = workflow.split('- name: Run NEXORA responsive marketing and owner-route browser audit')[1].split('\n      - name: Publish responsive audit status')[0];
assert.ok(responsive.includes('RESPONSIVE_REPORT_PATH:') && !responsive.includes('continue-on-error: true'), 'responsive audit remains blocking');
const publish = workflow.split('- name: Publish responsive audit status')[1].split('\n      - name: Upload Playwright')[0];
assert.ok(publish.includes("outcome === 'success' && report.status === 'PASS'"), 'independent report requires successful step and report');
assert.ok(publish.includes('report.overflow') && publish.includes('No-script overflow'), 'check-run summary names the overflowing nodes when present');
assert.ok(!publish.includes('report.message') && !publish.includes('report.stack'), 'check-run reports no raw errors');
assert.ok(workflow.includes('This report covers the read-only storefront smoke only'), 'smoke status is not presented as responsive status');
const browser = readFileSync('scripts/verify-nexora-responsive-browser.mjs', 'utf8');
assert.ok(browser.includes('await touchTrigger.scrollIntoViewIfNeeded();') && browser.includes('await page.mouse.move(1, 1);'), 'the scroll-dismiss test starts hover from a stable viewport');
assert.ok((browser.match(/waitFor\(\{ state: 'attached', timeout: 10000 \}\)/g) || []).length >= 3, 'hover tests wait for the client-created portal after navigation');
assert.ok(browser.includes('openProbe.opened - openProbe.entered >= 300') && browser.includes('closeProbe.closed - closeProbe.left >= 200'), 'browser audit retains minimum hover timing checks');
assert.ok(!browser.includes('waitForTimeout(180)') && !browser.includes('waitForTimeout(100);\n  assert.equal(await hoverPanel.isVisible()'), 'hover assertions do not depend on Node-side sleeps beating browser timers');
console.log('PASS: responsive check reporting is sanitized and fail-closed; hover delay and grace assertions use browser event timing.');
