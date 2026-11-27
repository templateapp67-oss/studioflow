// Guards the central safe logger: redaction engine behavior, the Node/Deno twin
// parity contract, and the invariant that server-side source never calls raw
// console.* directly.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const checks = [];
const ok = (name) => { checks.push(name); console.log('PASS: ' + name); };

// Node cannot import .ts directly; transpile and import as a data URL.
const ts = (await import('typescript')).default;
const safeLoggerSource = readFileSync('server/safeLogger.ts', 'utf8');
const safeLoggerJs = ts.transpileModule(safeLoggerSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const { redact, redactText, safeLogger } = await import('data:text/javascript;base64,' + Buffer.from(safeLoggerJs).toString('base64'));

// 1. Denylisted keys are redacted in objects, at any depth.
const sensitive = redact({
  authorization: 'Bearer super-secret-value',
  Cookie: 'session=abc123',
  'x-api-key': 'example-key',
  apikey: 'embedded-key',
  token: 'tok-123',
  access_token: 'access-abc',
  refreshToken: 'refresh-abc',
  password: 'hunter2',
  CLIENT_SECRET: 'cs-abc',
  webhookSecret: 'ws-abc',
  otp: '123456',
  phone: '+91 98765 43210',
  customer_email: 'owner@example.com',
  nested: { deep: [{ password: 'nested-secret' }, { note: 'ok' }] },
});
for (const [key, value] of Object.entries(sensitive)) {
  if (key === 'nested') continue;
  assert.equal(value, '[REDACTED]', `${key} must be redacted`);
}
assert.equal(sensitive.nested.deep[0].password, '[REDACTED]');
assert.equal(sensitive.nested.deep[1].note, 'ok');
const untouched = redact({ id: 'booking-1', status: 'confirmed', count: 3, ok: true, empty: null });
assert.deepEqual(untouched, { id: 'booking-1', status: 'confirmed', count: 3, ok: true, empty: null });
ok('denylisted keys are redacted at any depth; benign keys pass through untouched');

// 2. Free-text patterns.
const urlWithQuery = redactText('https://api.supabase.co/rest/v1/table?access_token=secret123&foo=bar');
assert.ok(!urlWithQuery.includes('secret123') && urlWithQuery.includes('foo=bar'), 'query credentials must be masked, other params kept');
const jwtHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
const jwtPayload = Buffer.from(JSON.stringify({ sub: 'safe-logger-test' })).toString('base64url');
const unsignedJwtFixture = [jwtHeader, jwtPayload, 'invalid-signature'].join('.');
assert.equal(redactText(`JWT fixture: ${unsignedJwtFixture}`), 'JWT fixture: [REDACTED]');
assert.equal(redactText('Bearer example-bearer-value'), 'Bearer [REDACTED]');
const rzp = redactText('paying via rzp_live_AbCdEfGhIjKlMnOpQr');
assert.ok(!rzp.includes('AbCdEfGhIjKlMnOpQr'));
const sbp = redactText('token sbp_t1s2t3a4c5r6t7d8a9b0c1d2e3f4a5b6c7d8a9b0c1 here');
assert.ok(!sbp.includes('t1s2t3a4c5r6t7d8a9b0c1d2e3f4a5b6c7d8a9b0c1'));
assert.ok(redactText('password=hunter2&next=true').includes('[REDACTED]'));
assert.ok(!redactText('otp: "482913" recorded').includes('482913'));
ok('free-text secrets (JWTs, provider prefixes, query strings, key=value) are masked');

// 3. Email and phone masking keeps shape without leaking the value.
const email = redactText('customer owner.name@example.com booked');
assert.ok(!email.includes('owner.name@example.com') && email.includes('***@example.com'));
const intlPhone = redactText('call +91 98765 43210 now');
assert.ok(!intlPhone.includes('98765 43210') && !intlPhone.includes('9876543210'));
const mobile = redactText('mobile 9876543210');
assert.ok(!mobile.includes('9876543210'));
assert.equal(redactText('order 9feff398-7c54-4da3-8e9d-6729a991f7f3 created'), 'order 9feff398-7c54-4da3-8e9d-6729a991f7f3 created', 'uuids must not be masked');
const stamp = redactText('migration 20261126143000 applied');
assert.equal(stamp, 'migration 20261126143000 applied', 'timestamps must not be masked');
ok('emails and phones are masked; uuids and timestamps are preserved');

// 4. Errors, circular structures, depth and size guards.
const errLine = redact(new Error('failed for owner@example.com'));
assert.equal(typeof errLine, 'string');
assert.ok(errLine.includes('***@example.com') && !errLine.includes('owner@example.com'));
const circular = {};
circular.self = circular;
assert.equal(redact(circular).self, '[Circular]');
let deep = {};
let cursor = deep;
for (let i = 0; i < 12; i += 1) { cursor.next = {}; cursor = cursor.next; }
const deepResult = redact(deep);
let depth = 0; let node = deepResult;
while (node && typeof node === 'object' && node.next) { depth += 1; node = node.next; }
assert.ok(depth > 0 && depth <= 7, `depth must be capped (got ${depth})`);
const longLine = redactText('x'.repeat(10_000));
assert.ok(longLine.startsWith('x'.repeat(100)) && longLine.includes('[truncated]'));
ok('Errors redact inline; circular/deep structures and oversize strings are bounded');

// 5. safeLogger writes redacted args through to the console sink.
const previous = { log: console.log, error: console.error, warn: console.warn };
const captured = [];
const preview = (value) => (value !== null && typeof value === 'object') ? JSON.stringify(value) : String(value);
console.log = (...values) => captured.push(values.map(preview).join(' '));
console.error = (...values) => captured.push(values.map(preview).join(' '));
console.warn = (...values) => captured.push(values.map(preview).join(' '));
try {
  safeLogger.error('sync failed for token', { token: 'leak-me-not', safe: 'visible' });
  safeLogger.log(`Bearer ${unsignedJwtFixture}`);
  safeLogger.warn('lead from owner@example.com stored');
} finally {
  console.log = previous.log; console.error = previous.error; console.warn = previous.warn;
}
const blob = captured.join('\n');
assert.ok(!blob.includes('leak-me-not') && !blob.includes('owner@example.com'), 'nothing sensitive may reach the sink');
assert.equal(captured[1], 'Bearer [REDACTED]');
assert.ok(blob.includes('visible'), 'non-sensitive values must survive');
ok('safeLogger routes every line through the redaction engine before printing');

// 6. Node and Deno copies are byte-identical (the Edge twin cannot import this file).
try {
  execFileSync('cmp', ['-s', 'server/safeLogger.ts', 'supabase/functions/_shared/safeLogger.ts']);
} catch {
  assert.fail('server/safeLogger.ts and supabase/functions/_shared/safeLogger.ts drifted — copy one over the other');
}
ok('server/safeLogger.ts and supabase/functions/_shared/safeLogger.ts are byte-identical');

// 7. No raw console.* in server-side target paths.
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else if (entry.name.endsWith('.ts')) out.push(path);
  }
  return out;
}
const TARGETS = ['server.ts', 'api/storefront.ts', ...walk('server'), ...walk('supabase/functions').filter((f) => f.endsWith('/index.ts'))];
const ALLOWED = new Set(['server/safeLogger.ts', 'supabase/functions/_shared/safeLogger.ts']);
const offenders = [];
for (const file of TARGETS) {
  if (ALLOWED.has(file)) continue;
  const stripped = readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const match = stripped.match(/\bconsole\.(log|info|warn|error|debug|trace|table)\s*\(/);
  if (match) offenders.push(`${file}: console.${match[1]}(`);
}
assert.deepEqual(offenders, [], `raw console.* left in ${offenders.join(', ')}`);
ok('no raw console.* calls remain in server.ts, server/**, api/storefront.ts, or supabase edge index.ts files');

console.log(`\nAll safe-logger checks passed (${checks.length} sections).`);
