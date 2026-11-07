import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Environment validation and secret-hygiene checks.
 *
 * The browser and the server must both refuse a broken configuration, and no
 * privileged credential may ever reach a `VITE_*` variable or a browser file.
 */

const bundle = await build({
  entryPoints: ['src/lib/nexoraEnv.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const directory = mkdtempSync(join(tmpdir(), 'nexora-env-'));
const modulePath = join(directory, 'nexoraEnv.mjs');
writeFileSync(modulePath, bundle.outputFiles[0].text);
const env = await import(modulePath);

const FALLBACK_URL = 'https://zilwgiuiygqqardzutxi.supabase.co';
const FALLBACK_KEY = 'sb_publishable_test_key';

/* 1. The default configuration resolves to the intended project. */
let config = env.resolveSupabaseConfig({}, FALLBACK_URL, FALLBACK_KEY);
assert.equal(config.url, FALLBACK_URL, 'the bundled project URL is used when no override is set');
assert.equal(config.ref, 'zilwgiuiygqqardzutxi', 'the project reference is parsed from the URL');
assert.equal(config.usesProjectOverride, false, 'the default project is not an override');

/* 2. A malformed URL fails fast instead of silently using another project. */
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_URL: 'not-a-url' }, FALLBACK_URL, FALLBACK_KEY),
  /valid HTTPS project URL/,
  'a malformed project URL is rejected',
);
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_URL: 'http://insecure.example' }, FALLBACK_URL, FALLBACK_KEY),
  /valid HTTPS project URL/,
  'a plain-HTTP project URL is rejected',
);

/* 3. A privileged key in a browser variable is rejected. */
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc123' }, FALLBACK_URL, FALLBACK_KEY),
  /privileged Supabase key/,
  'a secret key in a browser variable is rejected',
);
assert.throws(
  () =>
    env.resolveSupabaseConfig(
      {
        VITE_SUPABASE_PUBLISHABLE_KEY: [
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
          'eyJyb2xlIjoic2VydmljZV9yb2xlIn0',
          'signature',
        ].join('.'),
      },
      FALLBACK_URL,
      FALLBACK_KEY,
    ),
  /privileged Supabase key/,
  'a service-role JWT in a browser variable is rejected',
);

/* 4. A publishable key is accepted. */
config = env.resolveSupabaseConfig({ VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc' }, FALLBACK_URL, FALLBACK_KEY);
assert.equal(config.publishableKey, 'sb_publishable_abc', 'a publishable key is accepted');

/* 5. A different project is reported by host, never by key. */
const warnings = [];
const originalWarn = console.warn;
console.warn = (message) => warnings.push(String(message));
try {
  config = env.resolveSupabaseConfig(
    { VITE_SUPABASE_URL: 'https://staging-project.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc' },
    FALLBACK_URL,
    FALLBACK_KEY,
  );
} finally {
  console.warn = originalWarn;
}
assert.equal(config.usesProjectOverride, true, 'a project override is detected');
assert.ok(warnings.some((message) => message.includes('staging-project')), 'the override is reported by host');
assert.ok(!warnings.some((message) => message.includes(FALLBACK_KEY)), 'no key is printed in a diagnostic');

/* 6. The browser bundle contains no privileged variable. */
const browserSources = [
  'src/lib/supabase.ts',
  'src/lib/nexoraEnv.ts',
  'src/lib/nexoraLandingData.ts',
  'src/lib/nexoraLeadSubmission.ts',
]
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');
assert.ok(!/SUPABASE_SERVICE_ROLE_KEY/.test(browserSources), 'the browser sources never read a service-role variable');
const envGuard = readFileSync('src/lib/nexoraEnv.ts', 'utf8');
const otherBrowserSources = [
  'src/lib/supabase.ts',
  'src/lib/nexoraLandingData.ts',
  'src/lib/nexoraLeadSubmission.ts',
]
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');
assert.ok(!/sb_secret_/.test(otherBrowserSources), 'no browser source contains a secret key');
assert.ok(!/service_role/.test(otherBrowserSources), 'no browser source contains a service-role claim');
assert.ok(envGuard.includes("value.startsWith('sb_secret_')"), 'the environment guard recognises a secret key');
assert.ok(envGuard.includes("role === 'service_role'"), 'the environment guard recognises a service-role token');

/* 7. The server reports its configuration without printing a credential. */
const serverBundle = await build({
  entryPoints: ['server/nexoraEnv.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const serverPath = join(directory, 'serverEnv.mjs');
writeFileSync(serverPath, serverBundle.outputFiles[0].text);
const serverEnv = await import(serverPath);

const report = serverEnv.readServerEnvironment(
  { SUPABASE_URL: 'https://zilwgiuiygqqardzutxi.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'secret-value' },
  false,
);
assert.equal(report.supabaseRef, 'zilwgiuiygqqardzutxi', 'the server reports the project reference');
assert.equal(report.hasServiceRoleKey, true, 'the server reports that a key is configured');
assert.equal(JSON.stringify(report).includes('secret-value'), false, 'the report never contains the key');

const lines = [];
const originalLog = console.log;
console.log = (message) => lines.push(String(message));
try {
  serverEnv.logServerEnvironment(report);
} finally {
  console.log = originalLog;
}
assert.ok(lines[0].includes('zilwgiuiygqqardzutxi'), 'the diagnostic names the project');
assert.ok(!lines[0].includes('secret-value'), 'the diagnostic never prints the credential');

/* 8. An invalid CRM endpoint is reported as unusable, not contacted. */
const crm = serverEnv.readServerEnvironment({ NEXORA_CRM_LEAD_ENDPOINT: 'http://crm.example' }, false);
assert.equal(crm.crmConfigured, false, 'an insecure CRM endpoint is not usable');
assert.equal(crm.crmEndpointInvalid, true, 'an invalid CRM endpoint is reported');

/* 9. The documented environment file names match the code. */
const envExample = readFileSync('.env.example', 'utf8');
for (const name of [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'NEXORA_CRM_LEAD_ENDPOINT',
  'NEXORA_CRM_LEAD_TOKEN',
  'LANDING_LEAD_RATE_LIMIT_SALT',
  'PRIVACY_NOTICE_VERSION',
  'SITE_URL',
]) {
  assert.ok(envExample.includes(`${name}=`), `.env.example documents ${name}`);
}

console.log(
  'PASS: environment validation rejects malformed URLs and privileged browser keys, reports project overrides by host only, keeps credentials out of the browser bundle and documents every environment variable name.',
);
