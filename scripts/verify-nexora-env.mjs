import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

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
const env = await import(pathToFileURL(modulePath).href);

const FALLBACK_URL = 'https://zilwgiuiygqqardzutxi.supabase.co';
const FALLBACK_KEY = 'sb_publishable_test_key';

/* 1. The default configuration resolves to the intended project. */
let config = env.resolveSupabaseConfig({}, FALLBACK_URL, FALLBACK_KEY);
assert.equal(config.url, FALLBACK_URL, 'the bundled project URL is used when no override is set');
assert.equal(config.ref, 'zilwgiuiygqqardzutxi', 'the project reference is parsed from the URL');
assert.equal(config.usesProjectOverride, false, 'the default project is not an override');

/* 2. A malformed URL fails fast with non-secret structural diagnostics. */
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_URL: 'not-a-url' }, FALLBACK_URL, FALLBACK_KEY),
  (error) => {
    assert.match(error.message, /valid HTTPS project URL/);
    assert.match(error.message, /reason=invalid-url-syntax/);
    assert.match(error.message, /rawLength=9/);
    assert.match(error.message, /hasScheme=false/);
    assert.equal(error.message.includes('not-a-url'), false, 'raw invalid value must not be echoed in diagnostics');
    assert.equal(error.diagnostic?.reason, 'invalid-url-syntax');
    return true;
  },
  'a malformed project URL is rejected with non-secret diagnostics',
);
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_URL: 'http://insecure.example' }, FALLBACK_URL, FALLBACK_KEY),
  (error) => {
    assert.match(error.message, /valid HTTPS project URL/);
    assert.match(error.message, /reason=non-https-scheme/);
    assert.match(error.message, /scheme=http/);
    assert.equal(error.message.includes('insecure.example'), false, 'untrusted hostname must not be echoed');
    return true;
  },
  'a plain-HTTP project URL is rejected',
);
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_URL: 'http://zilwgiuiygqqardzutxi.supabase.co' }, FALLBACK_URL, FALLBACK_KEY),
  (error) => error.diagnostic?.reason === 'non-https-scheme' && error.diagnostic?.hostMatchesExpected === true,
  'plain-HTTP even on the canonical host is rejected',
);
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_URL: 'https://untrusted.example.com' }, FALLBACK_URL, FALLBACK_KEY),
  (error) => {
    assert.match(error.message, /reason=untrusted-host/);
    assert.equal(error.message.includes('untrusted.example.com'), false, 'untrusted host is never echoed');
    assert.equal(error.diagnostic?.hostLooksLikeSupabase, false);
    return true;
  },
  'an untrusted HTTPS host is rejected',
);
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_URL: 'https://supabase.co.attacker.example' }, FALLBACK_URL, FALLBACK_KEY),
  (error) => error.diagnostic?.reason === 'untrusted-host',
  'a lookalike suffix-spoofed host is rejected',
);
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_URL: 'staging-project.supabase.co' }, FALLBACK_URL, FALLBACK_KEY),
  (error) => error.diagnostic?.reason === 'invalid-url-syntax',
  'a bare non-canonical host without https:// is rejected',
);
assert.throws(
  () =>
    env.resolveSupabaseConfig(
      { VITE_SUPABASE_URL: 'https://user:super_secret_pw@zilwgiuiygqqardzutxi.supabase.co' },
      FALLBACK_URL,
      FALLBACK_KEY,
    ),
  (error) => {
    assert.equal(error.diagnostic?.reason, 'credentials-in-url');
    assert.equal(error.message.includes('super_secret_pw'), false, 'URL credentials must never appear in diagnostics');
    return true;
  },
  'URLs embedding credentials are rejected without leaking credentials',
);
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_URL: 'https://zilwgiuiygqqardzutxi.supabase.co/rest/v1' }, FALLBACK_URL, FALLBACK_KEY),
  (error) => error.diagnostic?.reason === 'unexpected-path-or-query',
  'URLs with unexpected paths are rejected',
);
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_URL: 'https://zilwgiuiygqqardzutxi.supabase.co:8443' }, FALLBACK_URL, FALLBACK_KEY),
  (error) => error.diagnostic?.reason === 'unexpected-port',
  'URLs with custom ports are rejected',
);
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_URL: 'https://zilwgiuiygqqardzutxi.supabase.co\\nextra' }, FALLBACK_URL, FALLBACK_KEY),
  (error) => error.diagnostic?.reason === 'contains-whitespace',
  'URLs with internal escaped newlines are rejected',
);
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_URL: 'sb_secret_accidentally_in_url_var' }, FALLBACK_URL, FALLBACK_KEY),
  (error) => {
    assert.equal(error.diagnostic?.reason, 'invalid-url-syntax');
    assert.equal(error.diagnostic?.rawLength, 'sb_secret_accidentally_in_url_var'.length);
    assert.equal(error.message.includes('sb_secret_accidentally_in_url_var'), false, 'secret pasted in URL var never leaks');
    return true;
  },
  'a secret mistakenly placed in VITE_SUPABASE_URL is rejected with non-secret diagnostics only',
);
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_URL: '[REDACTED]' }, FALLBACK_URL, FALLBACK_KEY),
  (error) => error.diagnostic?.reason === 'invalid-url-syntax' && error.diagnostic?.isBracketPlaceholder === true,
  'unknown bracket placeholders fail fast with isBracketPlaceholder diagnostic',
);

/* 3. A privileged key in a browser variable is rejected (even when quoted or in secondary key var). */
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc123' }, FALLBACK_URL, FALLBACK_KEY),
  (error) => {
    assert.match(error.message, /privileged Supabase key/);
    assert.match(error.message, /source=VITE_SUPABASE_PUBLISHABLE_KEY/);
    assert.match(error.message, /keyKind=secret-prefix/);
    assert.equal(error.message.includes('sb_secret_abc123'), false, 'secret key must never appear in diagnostic');
    return true;
  },
  'a secret key in a browser variable is rejected',
);
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_PUBLISHABLE_KEY: '  "sb_secret_quoted\\n"  ' }, FALLBACK_URL, FALLBACK_KEY),
  (error) => error.diagnostic?.reason === 'privileged-key' && error.diagnostic?.keyKind === 'secret-prefix',
  'a quoted/newline-padded secret key in a browser variable is still rejected',
);
assert.throws(
  () =>
    env.resolveSupabaseConfig(
      {
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_valid_primary',
        VITE_SUPABASE_ANON_KEY: 'sb_secret_hidden_in_anon_var',
      },
      FALLBACK_URL,
      FALLBACK_KEY,
    ),
  (error) =>
    error.diagnostic?.reason === 'privileged-key' &&
    error.diagnostic?.source === 'VITE_SUPABASE_ANON_KEY' &&
    !error.message.includes('sb_secret_hidden_in_anon_var'),
  'a privileged key in VITE_SUPABASE_ANON_KEY is rejected even when VITE_SUPABASE_PUBLISHABLE_KEY is set',
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

/* 4. A publishable key or legacy public Supabase anon JWT is accepted. */
config = env.resolveSupabaseConfig({ VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc' }, FALLBACK_URL, FALLBACK_KEY);
assert.equal(config.publishableKey, 'sb_publishable_abc', 'a publishable key is accepted');
const legacyAnonJwt = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  Buffer.from(JSON.stringify({ iss: 'supabase', ref: 'zilwgiuiygqqardzutxi', role: 'anon' })).toString('base64url'),
  'signature',
].join('.');
config = env.resolveSupabaseConfig({ VITE_SUPABASE_ANON_KEY: legacyAnonJwt }, FALLBACK_URL, FALLBACK_KEY);
assert.equal(config.publishableKey, legacyAnonJwt, 'a legacy public Supabase anon JWT is accepted');
const privilegedSupabaseJwt = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  Buffer.from(JSON.stringify({ iss: 'supabase', ref: 'zilwgiuiygqqardzutxi', role: 'service_role' })).toString('base64url'),
  'signature',
].join('.');
assert.throws(
  () => env.resolveSupabaseConfig({ VITE_SUPABASE_ANON_KEY: privilegedSupabaseJwt }, FALLBACK_URL, FALLBACK_KEY),
  /privileged Supabase key/,
  'a Supabase service_role JWT with iss=supabase is rejected',
);

/* 4b. Vercel CLI `vercel pull` "[SENSITIVE]" placeholders fall back safely (including quoted/escaped variants). */
config = env.resolveSupabaseConfig(
  {
    VITE_SUPABASE_URL: ' "[SENSITIVE]\\n" ',
    VITE_SUPABASE_PUBLISHABLE_KEY: '[SENSITIVE]',
    VITE_SUPABASE_ANON_KEY: '\'[SENSITIVE]\\r\\n\'',
  },
  FALLBACK_URL,
  FALLBACK_KEY,
);
assert.equal(config.url, FALLBACK_URL, 'Vercel [SENSITIVE] URL placeholder falls back to bundled public project URL');
assert.equal(config.publishableKey, FALLBACK_KEY, 'Vercel [SENSITIVE] key placeholder falls back to bundled publishable key');

/* 4c. Escaped newlines, whitespace, surrounding quotes, trailing slashes, and bare canonical host/ref normalize cleanly. */
config = env.resolveSupabaseConfig(
  {
    VITE_SUPABASE_URL: '  "https://zilwgiuiygqqardzutxi.supabase.co/\\n"  ',
    VITE_SUPABASE_PUBLISHABLE_KEY: '  \\"sb_publishable_clean_123\\r\\n\\"  ',
  },
  FALLBACK_URL,
  FALLBACK_KEY,
);
assert.equal(config.url, FALLBACK_URL, 'quoted URL with trailing slash and escaped newline normalizes cleanly');
assert.equal(config.publishableKey, 'sb_publishable_clean_123', 'escaped-quoted publishable key with escaped CRLF normalizes cleanly');
assert.equal(config.usesProjectOverride, false, 'normalized canonical URL is not treated as an override');

config = env.resolveSupabaseConfig(
  { VITE_SUPABASE_URL: '\\n\\"https://zilwgiuiygqqardzutxi.supabase.co\\"\\r\\n' },
  FALLBACK_URL,
  FALLBACK_KEY,
);
assert.equal(config.url, FALLBACK_URL, 'leading/trailing escaped newlines around escaped quotes normalize cleanly');

const bareWarnings = [];
const prevWarn = console.warn;
console.warn = (message) => bareWarnings.push(String(message));
try {
  config = env.resolveSupabaseConfig(
    { VITE_SUPABASE_URL: '  "zilwgiuiygqqardzutxi.supabase.co/\\n"  ' },
    FALLBACK_URL,
    FALLBACK_KEY,
  );
  assert.equal(config.url, FALLBACK_URL, 'bare canonical host normalizes to canonical HTTPS URL');
  assert.equal(config.usesProjectOverride, false, 'bare canonical host is not treated as a project override');

  config = env.resolveSupabaseConfig(
    { VITE_SUPABASE_URL: '  zilwgiuiygqqardzutxi\\r\\n ' },
    FALLBACK_URL,
    FALLBACK_KEY,
  );
  assert.equal(config.url, FALLBACK_URL, 'bare canonical project ref normalizes to canonical HTTPS URL');
  assert.equal(config.usesProjectOverride, false, 'bare canonical project ref is not treated as a project override');
} finally {
  console.warn = prevWarn;
}
assert.ok(
  bareWarnings.some((message) => message.includes('bare canonical host')),
  'normalizing bare canonical host logs a non-secret warning',
);
assert.ok(
  bareWarnings.some((message) => message.includes('bare project ref')),
  'normalizing bare canonical project ref logs a non-secret warning',
);

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
const serverEnv = await import(pathToFileURL(serverPath).href);

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
