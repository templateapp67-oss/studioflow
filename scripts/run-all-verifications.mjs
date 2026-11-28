// Runs every offline verification suite. The live Supabase integration
// (verify-supabase.mjs) is excluded: it needs network access plus a configured
// test project with email autoconfirm. The headless public-site browser audit
// is included when its external browser tools and a running production preview
// are explicitly configured.
//
// Independent suites run with bounded parallelism so `npm test` completes well
// inside CI/sandbox timeouts instead of running 160+ suites strictly serially.
// Suites that touch workspace files run alone in a final serial phase to avoid
// filesystem races.
import { readdirSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { spawn } from 'node:child_process';

const SKIP = new Set(['verify-supabase.mjs']);
const OPTIONAL_ENV = new Map([
  ['verify-live-seo-http.mjs', ['LIVE_SEO_URL']],
  ['verify-nexora-responsive-browser.mjs', ['BROWSER_TOOLS_ROOT', 'PREVIEW_URL']],
  ['verify-preview-browser-e2e.mjs', ['PLAYWRIGHT_PACKAGE_ROOT', 'PREVIEW_URL']],
  ['verify-nexora-interaction-responsiveness.mjs', ['PLAYWRIGHT_PACKAGE_ROOT', 'PREVIEW_URL']],
  ['verify-booking-preview-browser.mjs', ['PLAYWRIGHT_PACKAGE_ROOT', 'PREVIEW_URL']],
  // Runs as a dedicated required CI job against a throwaway PostgreSQL service.
  ['verify-postgres-booking-concurrency.mjs', ['STUDIOFLOW_TEST_POSTGRES_URL', 'STUDIOFLOW_DISPOSABLE_POSTGRES']],
]);
// These suites create/update files inside the repo workspace while running, so
// they execute serially after the parallel pool to prevent any race.
const SERIAL_SUITES = new Set([
  'verify-edge-history-boundary.mjs',
  'verify-template15-media.mjs',
]);

const allSuites = readdirSync('scripts')
  .filter((name) => name.startsWith('verify-') && name.endsWith('.mjs') && !SKIP.has(name))
  .sort();

const runnable = [];
const skipped = [];
for (const suite of allSuites) {
  const missing = (OPTIONAL_ENV.get(suite) ?? []).filter((name) => !process.env[name]);
  if (missing.length) {
    skipped.push(suite);
    console.log(`skip ${suite} (set ${missing.join(' and ')} to run this optional audit)`);
    continue;
  }
  runnable.push(suite);
}

const parallelSuites = runnable.filter((suite) => !SERIAL_SUITES.has(suite));
const serialSuites = runnable.filter((suite) => SERIAL_SUITES.has(suite));

const parsedConcurrency = Number.parseInt(process.env.VERIFY_CONCURRENCY || '', 10);
const defaultConcurrency = Math.min(4, Math.max(2, availableParallelism()));
const concurrency = Number.isInteger(parsedConcurrency) && parsedConcurrency >= 1
  ? parsedConcurrency
  : defaultConcurrency;

function runSuite(suite) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, ['scripts/' + suite], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', (error) => {
      resolve({ suite, ok: false, seconds: ((Date.now() - started) / 1000).toFixed(1), stdout, stderr: `${stderr}\n${error.message}`.trim() });
    });
    child.once('close', (code, signal) => {
      resolve({
        suite,
        ok: code === 0 && !signal,
        seconds: ((Date.now() - started) / 1000).toFixed(1),
        stdout,
        stderr,
      });
    });
  });
}

const failed = [];
let ran = 0;

function report(result) {
  ran += 1;
  if (result.stdout) process.stdout.write(result.stdout.endsWith('\n') ? result.stdout : `${result.stdout}\n`);
  if (!result.ok && result.stderr) {
    process.stderr.write(result.stderr.endsWith('\n') ? result.stderr : `${result.stderr}\n`);
  }
  if (!result.ok) {
    failed.push(result.suite);
    console.error(`FAIL ${result.suite} (${result.seconds}s)`);
  } else {
    console.log(`ok ${result.suite} (${result.seconds}s)`);
  }
}

let cursor = 0;
async function worker() {
  while (cursor < parallelSuites.length) {
    const suite = parallelSuites[cursor++];
    const result = await runSuite(suite);
    report(result);
  }
}

const totalStarted = Date.now();
await Promise.all(
  Array.from({ length: Math.min(concurrency, parallelSuites.length) }, () => worker()),
);

for (const suite of serialSuites) {
  const result = await runSuite(suite);
  report(result);
}

const totalSeconds = ((Date.now() - totalStarted) / 1000).toFixed(1);
console.log(`\n${ran - failed.length}/${ran} verification suites passed in ${totalSeconds}s (concurrency=${concurrency}).${skipped.length ? ` ${skipped.length} optional suite(s) skipped.` : ''}`);
if (skipped.length) console.log('Skipped: ' + skipped.join(', '));
if (failed.length) {
  console.error('Failed: ' + failed.join(', '));
  process.exitCode = 1;
}
