// Runs every offline verification suite. The live Supabase integration
// (verify-supabase.mjs) is excluded: it needs network access plus a configured
// test project with email autoconfirm. The headless public-site browser audit
// is included when its external browser tools and a running production preview
// are explicitly configured.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SKIP = new Set(['verify-supabase.mjs']);
const OPTIONAL_ENV = new Map([
  ['verify-nexora-responsive-browser.mjs', ['BROWSER_TOOLS_ROOT', 'PREVIEW_URL']],
  ['verify-preview-browser-e2e.mjs', ['PREVIEW_URL']],
]);
const suites = readdirSync('scripts')
  .filter((name) => name.startsWith('verify-') && name.endsWith('.mjs') && !SKIP.has(name))
  .sort();
const failed = [];
const skipped = [];
let ran = 0;

for (const suite of suites) {
  const missing = (OPTIONAL_ENV.get(suite) ?? []).filter((name) => !process.env[name]);
  if (missing.length) {
    skipped.push(suite);
    console.log(`skip ${suite} (set ${missing.join(' and ')} to run the browser audit)`);
    continue;
  }

  ran += 1;
  const started = Date.now();
  const run = spawnSync(process.execPath, ['scripts/' + suite], { stdio: 'inherit' });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (run.error || run.status !== 0) {
    failed.push(suite);
    console.error(`FAIL ${suite} (${seconds}s)`);
  } else {
    console.log(`ok ${suite} (${seconds}s)`);
  }
}

console.log(`\n${ran - failed.length}/${ran} verification suites passed.${skipped.length ? ` ${skipped.length} optional suite(s) skipped.` : ''}`);
if (skipped.length) console.log('Skipped: ' + skipped.join(', '));
if (failed.length) {
  console.error('Failed: ' + failed.join(', '));
  process.exitCode = 1;
}
