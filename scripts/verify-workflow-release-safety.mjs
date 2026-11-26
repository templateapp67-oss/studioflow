import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyPreviewDeployError } from './classify-preview-deploy-error.mjs';
import { countRuntimeLogRecords } from './summarize-preview-runtime-logs.mjs';

const workflows = Object.fromEntries(['production', 'preview', 'ci'].map((name) => [
  name, readFileSync(`.github/workflows/${name}.yml`, 'utf8').replace(/\r\n?/g, '\n'),
]));
for (const [name, workflow] of Object.entries(workflows)) {
  const refs = [...workflow.matchAll(/^\s*(?:-\s*)?uses:\s*['"]?actions\/github-script@([^'"\s#]+)/gmi)].map((m) => m[1]);
  assert(refs.every((ref) => ref === 'v8'), `${name}: every github-script action must use v8`);
  if (name !== 'ci') assert(refs.length > 0, `${name} must retain its github-script reporting steps`);
}

assert.equal(classifyPreviewDeployError('Error 429: private token'), 'quota-or-rate-limit');
assert.equal(classifyPreviewDeployError('The maximum number of functions exceeded'), 'function-limit-or-size');
assert.equal(classifyPreviewDeployError('Error 403: forbidden'), 'authorization');
assert.equal(classifyPreviewDeployError('opaque private token'), 'other-or-unknown');
assert.ok(workflows.preview.includes('node scripts/classify-preview-deploy-error.mjs "$deploy_log"'), 'failed Preview deploys publish only a static diagnostic category');

const previewDeploy = workflows.preview.split('- name: Deploy preview\n        id: deploy')[1]?.split('\n      - name:')[0];
assert(previewDeploy && !previewDeploy.includes('continue-on-error: true'), 'a failed Preview deployment must fail its job');
assert(workflows.preview.includes("if: always() && steps.vercel-config.outputs.available == 'true' && steps.deploy.outcome == 'failure'"), 'deployment failure diagnostics still run');
assert(workflows.preview.indexOf('- name: Capture Vercel runtime logs after failed Preview audits') > workflows.preview.indexOf('- name: Run NEXORA responsive marketing and owner-route browser audit'), 'capture runtime logs after responsive failures too');

for (const name of ['Pull Vercel environment (preview)', 'Build preview', 'Deploy preview']) {
  const block = workflows.preview.split(`- name: ${name}\n`)[1]?.split('\n      - name:')[0];
  for (const variable of ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID']) {
    assert(block?.includes(variable + ': ${{ secrets.' + variable + ' }}'),
      `${name} must receive ${variable} in its own environment`);
  }
}

assert(!previewDeploy.includes('cat "$deploy_log"'), 'raw deployment output must not reach workflow logs');
const runtimeCapture = workflows.preview.split('- name: Capture Vercel runtime logs after failed Preview audits')[1]?.split('\n      - name:')[0];
assert(runtimeCapture?.includes('>"$runtime_log" 2>"$runtime_error"') && runtimeCapture.includes('node scripts/summarize-preview-runtime-logs.mjs "$runtime_log"'), 'runtime diagnostics must suppress raw stdout and stderr');
assert.equal(countRuntimeLogRecords('[{"message":"private token","url":"https://private.test"}]'), 1);
assert.equal(countRuntimeLogRecords('{"logs":[{"message":"secret"},{}]}'), 2);
assert.equal(countRuntimeLogRecords('{"message":"secret"}\n{"message":"private"}'), 2);
assert.equal(countRuntimeLogRecords('arbitrary private error text'), null);
assert.equal(countRuntimeLogRecords(''), 0);

const production = workflows.production;
const deploy = production.split('\n  deploy:\n')[1];
assert(deploy, 'production deploy job exists');
// Production live SEO verification is performed inside the PowerShell deploy
// script (deploy-production.ps1), which invokes verify-live-seo-http.mjs with
// the production env and fails the deploy when the live check fails. The
// workflow's deploy step must run that script without skipping SEO verification.
const deployStep = deploy.split('- name: Run production deployment with native Windows PowerShell')[1]?.split('\n      - ')[0];
assert(deployStep, 'production PowerShell deploy step exists');
assert(deployStep.includes('deploy-production.ps1'), 'production deploy must run deploy-production.ps1');
assert(!deployStep.includes('SkipLiveSeoVerification'), 'production deploy must not skip live SEO verification');
assert(!deployStep.includes('continue-on-error: true'), 'production deploy must fail the job on error');
const deployScript = readFileSync('scripts/deploy-production.ps1', 'utf8').replace(/\r\n?/g, '\n');
assert(deployScript.includes('scripts/verify-live-seo-http.mjs'), 'deploy script must run the live SEO verifier');
for (const setting of [
  "LIVE_SEO_URL = 'https://nexorasalon.online'",
  "CHECK_WWW_REDIRECT_URL = 'https://www.nexorasalon.online'",
  "CHECK_HTTP_REDIRECT = '1'",
  "REQUIRE_PUBLISHED_SITES = '1'",
  'SEO_REPORT_PATH = $reportPath',
]) assert(deployScript.includes(setting), `production SEO env must include ${setting}`);
// The summary step only publishes the report; it is intentionally non-blocking.
const seoSummary = deploy.split('- name: Publish Production Live SEO Check Run summary')[1]?.split('\n      - ')[0];
assert(seoSummary, 'production SEO report summary step exists');
for (const name of ['Install locked dependencies', 'Install pinned Vercel CLI']) {
  const block = deploy.split(`- name: ${name}\n`)[1]?.split('\n      - ')[0];
  assert(block && !block.includes('continue-on-error: true'), `${name} must fail the production job on error`);
}

// The production apply must redeploy the reviewed Edge Functions, including
// submit-landing-lead, so the PR #163 lead rate-limit/salt changes ship with
// the release instead of lingering as stale production code.
const edgeDeploy = production.split('- name: Deploy reviewed Edge Functions (manual apply_and_deploy only)\n')[1]?.split('\n      - ')[0];
assert(edgeDeploy, 'production Edge Function deploy step exists');
assert(/if:\s*github\.event_name == 'workflow_dispatch' && inputs\.release_mode == 'apply_and_deploy'/.test(edgeDeploy), 'Edge Function deploy runs only in manual apply_and_deploy mode');
for (const fn of ['submit-landing-lead', 'nexora-whatsapp-connect', 'nexora-whatsapp-webhook', 'studioflow-payments']) {
  assert(edgeDeploy.includes(fn), `production Edge Function deploy must include ${fn}`);
}
assert(!edgeDeploy.includes('continue-on-error: true'), 'production Edge Function deploy must fail the job on error');

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const redirects = (vercel.redirects || []).filter((r) => r.source === '/(.*)' &&
  r.has?.some((h) => h.type === 'host' && h.value === 'www.nexorasalon.online'));
assert.equal(redirects.length, 1, 'Vercel has one www canonical redirect');
assert.equal(redirects[0].destination, 'https://nexorasalon.online/$1');
assert.equal(redirects[0].permanent, true, 'www redirect is permanent');
// TLS-level HTTP redirects are provided by the deployment platform, not by
// vercel.json; the blocking live check above is the release gate for them.
console.log('PASS: github-script v8 consistency, fatal production steps, Edge Function deploy gate, live SEO/HTTP redirect gate, and Vercel www canonical redirect.');
