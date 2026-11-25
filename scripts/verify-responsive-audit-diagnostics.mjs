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
assert.ok(!publish.includes('report.message') && !publish.includes('report.stack'), 'check-run reports no raw errors');
assert.ok(workflow.includes('This report covers the read-only storefront smoke only'), 'smoke status is not presented as responsive status');
const browser = readFileSync('scripts/verify-nexora-responsive-browser.mjs', 'utf8');
assert.ok((browser.match(/waitFor\(\{ state: 'attached', timeout: 10000 \}\)/g) || []).length >= 3, 'hover tests wait for the client-created portal after navigation');
assert.ok(browser.includes('openProbe.opened - openProbe.entered >= 300') && browser.includes('closeProbe.closed - closeProbe.left >= 200'), 'browser audit retains minimum hover timing checks');
assert.ok(!browser.includes('waitForTimeout(180)') && !browser.includes('waitForTimeout(100);\n  assert.equal(await hoverPanel.isVisible()'), 'hover assertions do not depend on Node-side sleeps beating browser timers');
console.log('PASS: responsive check reporting is sanitized and fail-closed; hover delay and grace assertions use browser event timing.');
