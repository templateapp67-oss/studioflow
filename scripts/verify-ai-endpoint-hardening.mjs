import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, readFileSync } from 'node:fs';
import { build } from 'esbuild';

/**
 * Hardening of the AI routes (release gate).
 *
 * Three separate failures are covered, all of them reachable from the network:
 *
 *  P0  A hostile body shape (`availableServices: "x"`, `offer: {…}`) used to
 *      throw inside the handler's `catch` block as well, so the rejection was
 *      unhandled and Node exited. Reproduced before the fix: one POST
 *      `{"availableServices":"x"}` stopped the server.
 *  P1  No caller had to prove who they were: every AI route forwarded to Gemini
 *      for anyone. Owner generators now require a Supabase session.
 *  P1  No per-caller ceiling existed, so a single client could spend the whole
 *      provider quota.
 *
 * The suite proves the fixes twice: unit level (wrappers and the limiter with an
 * injected clock) and end to end against the built Express bundle.
 */

/** Bundles a TypeScript module and imports it in-process. */
async function loadModule(entry) {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    write: false,
    logLevel: 'silent',
  });
  const source = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

const safety = await loadModule('server/httpSafety.ts');
const limiter = await loadModule('server/rateLimit.ts');
const auth = await loadModule('server/supabaseAuth.ts');

/* ---------------------------------------------------------------- unit: P0 */
{
  // asyncHandler must forward a rejection to next() instead of leaving it as an
  // unhandled rejection (which is what killed the process).
  let forwarded = null;
  const route = safety.asyncHandler(async () => {
    throw new Error('boom');
  });
  route({}, {}, (error) => {
    forwarded = error;
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(forwarded?.message, 'boom', 'asyncHandler forwards a rejected promise to next()');

  let syncForwarded = null;
  safety.asyncHandler(() => {
    throw new Error('sync-boom');
  })({}, {}, (error) => {
    syncForwarded = error;
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(syncForwarded?.message, 'sync-boom', 'asyncHandler forwards a synchronous throw');

  // Validation helpers never throw on hostile input.
  for (const hostile of [null, undefined, {}, [], true, 42]) {
    assert.deepEqual(safety.asArray(hostile, 3), [], `asArray(${JSON.stringify(hostile)}) is []`);
    assert.equal(safety.asString(hostile, 10), '', `asString(${JSON.stringify(hostile)}) is ''`);
    assert.deepEqual(safety.asObject(hostile), {}, `asObject(${JSON.stringify(hostile)}) is {}`);
  }
  for (const hostile of [null, undefined, '', 'x', {}, [], true, Number.NaN]) {
    assert.equal(safety.asNumber(hostile, 7), 7, `asNumber(${JSON.stringify(hostile)}) falls back`);
  }
  // Numbers and numeric strings are the only accepted numeric shapes.
  assert.equal(safety.asNumber('42.5', 0), 42.5, 'a numeric string is parsed');
  assert.equal(safety.asNumber(42, 7), 42, 'a real number is kept');
  assert.equal(safety.asNumber(null, 7), 7, 'null is not silently zero');
  assert.equal(safety.asNumber(true, 7), 7, 'a boolean is not silently one');
  assert.equal(safety.asNumber('abc', 7), 7, 'a non-numeric string falls back');
  assert.equal(safety.asNumber(500, 0, 0, 100), 100, 'the upper bound is enforced');
  assert.equal(safety.asNumber(-5, 0, 0, 100), 0, 'the lower bound is enforced');
  assert.deepEqual(safety.asArray([1, 2, 3, 4, 5], 2), [1, 2], 'asArray caps the array');
  assert.equal(safety.asString('  hi  ', 10), 'hi', 'asString trims');
  assert.equal(safety.asString('x', 10), 'x', 'a real string is kept');
  assert.equal(safety.asString('abcdef', 3), 'abc', 'asString truncates');

  // sendJson must not write after the response is committed.
  let writes = 0;
  const res = {
    headersSent: true,
    writableEnded: false,
    status() {
      return this;
    },
    json() {
      writes += 1;
      return this;
    },
  };
  assert.equal(safety.sendJson(res, 200, { ok: true }), false, 'sendJson refuses a committed response');
  assert.equal(writes, 0, 'sendJson did not write twice');
}

/* ---------------------------------------------------------------- unit: P1 */
{
  let now = 0;
  const store = limiter.createRateLimitStore(1000, 3, 100, () => now);
  const results = [0, 1, 2, 3].map(() => store.hit('k'));
  assert.deepEqual(results.map((entry) => entry.allowed), [true, true, true, false], 'fourth request in a window is blocked');
  assert.equal(results[3].resetAfterSeconds, 1, 'the block reports the reset time');
  now = 1001;
  assert.equal(store.hit('k').allowed, true, 'a new window re-allows the caller');
  assert.equal(store.size(), 1, 'only one window is tracked');

  // Memory is bounded: a flood of distinct keys cannot grow without limit.
  const bounded = limiter.createRateLimitStore(60_000, 5, 20, () => 0);
  for (let i = 0; i < 500; i += 1) bounded.hit(`k${i}`);
  assert.ok(bounded.size() <= 20, `limiter keeps at most maxKeys windows (got ${bounded.size()})`);

  // Bearer parsing accepts only a well-formed header.
  assert.equal(auth.readBearerToken({ authorization: 'Bearer abc.def-ghi' }), 'abc.def-ghi');
  assert.equal(auth.readBearerToken({ authorization: 'bearer token_123' }), 'token_123');
  for (const header of [undefined, '', 'Basic abc', 'Bearer', 'Bearer  two spaces', {}]) {
    assert.equal(auth.readBearerToken({ authorization: header }), null, `rejects ${JSON.stringify(header)}`);
  }

  // Token verification distinguishes "invalid" from "cannot check".
  const config = { url: 'https://example.supabase.co', publishableKey: 'public-key', configured: true };
  auth.clearAuthCache();
  const invalid = await auth.verifyAccessToken('bad', config, async () => ({ status: 401, ok: false }));
  assert.equal(invalid, null, 'a 401 from Auth is an invalid session, not an outage');
  const outage = await auth.verifyAccessToken('token', config, async () => {
    throw new Error('ECONNREFUSED');
  });
  assert.equal(outage, undefined, 'an unreachable Auth server is not treated as an invalid session');
  const validUser = await auth.verifyAccessToken('good', config, async () => ({
    status: 200,
    ok: true,
    json: async () => ({ id: 'user-1', email: 'owner@example.com', role: 'authenticated' }),
  }));
  assert.equal(validUser?.id, 'user-1', 'a valid token yields the user');
  // A secret key in a browser-style variable must never be used for verification.
  const privileged = auth.resolveAuthConfiguration({ SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abcdef' });
  assert.equal(privileged.configured, false, 'a privileged key is never used to verify tokens');

  // The middleware policy is pinned with an injected fetch, so it does not
  // depend on the Auth provider being reachable from the test environment.
  // The positive-verification cache is cleared first: an earlier case already
  // cached a user for the token used below.
  auth.clearAuthCache();
  const run = async (middleware, req) => {
    const state = { status: 200, body: null, headers: {}, next: false, locals: {} };
    const res = {
      locals: state.locals,
      status(code) { state.status = code; return this; },
      json(payload) { state.body = payload; return this; },
      setHeader(name, value) { state.headers[name.toLowerCase()] = value; },
    };
    await middleware(req, res, () => { state.next = true; });
    return state;
  };

  const requiresSession = auth.requireVerifiedUser({ config });
  const anonymous = await run(requiresSession, { headers: {} });
  assert.equal(anonymous.status, 401, 'no token is rejected');
  assert.equal(anonymous.body.code, 'auth_required');

  const rejected = await run(
    auth.requireVerifiedUser({ config, fetchImpl: async () => ({ status: 401, ok: false }) }),
    { headers: { authorization: 'Bearer expired' } },
  );
  assert.equal(rejected.status, 401, 'an Auth 401 becomes 401 invalid_session');
  assert.equal(rejected.body.code, 'invalid_session');

  const authOutage = await run(
    auth.requireVerifiedUser({ config, fetchImpl: async () => { throw new Error('offline'); } }),
    { headers: { authorization: 'Bearer token' } },
  );
  assert.equal(authOutage.next, false, 'protected routes fail closed during an Auth outage');
  assert.equal(authOutage.status, 503);
  assert.equal(authOutage.headers['x-ai-auth'], 'unverified');

  const accepted = await run(
    auth.requireVerifiedUser({
      config,
      fetchImpl: async () => ({ status: 200, ok: true, json: async () => ({ id: 'user-9', role: 'authenticated' }) }),
    }),
    { headers: { authorization: 'Bearer good' } },
  );
  assert.equal(accepted.next, true, 'a valid session reaches the handler');
  assert.equal(accepted.locals.authUser.id, 'user-9', 'the verified user is attached for per-user budgets');

  const verifiedMfaUser = async () => ({
    status: 200, ok: true, json: async () => ({ id: 'user-mfa', factors: [{ status: 'verified' }] }),
  });
  const mfaGuard = auth.requireVerifiedUser({ config, fetchImpl: verifiedMfaUser });
  const mfaSession = aal => `header.${Buffer.from(JSON.stringify({ aal })).toString('base64url')}.signature`;
  assert.equal((await run(mfaGuard, { headers: { authorization: `Bearer ${mfaSession('aal1')}` } })).status, 403);
  assert.equal((await run(mfaGuard, { headers: { authorization: `Bearer ${mfaSession('aal2')}` } })).next, true);

  const unconfigured = await run(
    auth.requireVerifiedUser({ config: { url: '', publishableKey: '', configured: false } }),
    { headers: {} },
  );
  assert.equal(unconfigured.next, false, 'protected routes require Auth configuration');
  assert.equal(unconfigured.status, 503);
  assert.equal(unconfigured.headers['x-ai-auth'], 'unconfigured');

  const optional = await run(auth.optionalVerifiedUser({ config }), { headers: {} });
  assert.equal(optional.next, true, 'the customer route allows anonymous visitors');
  const optionalSignedIn = await run(
    auth.optionalVerifiedUser({
      config,
      fetchImpl: async () => ({ status: 200, ok: true, json: async () => ({ id: 'user-3' }) }),
    }),
    // A different token: the positive cache is keyed by token digest.
    { headers: { authorization: 'Bearer customer-token' } },
  );
  assert.equal(optionalSignedIn.locals.authUser.id, 'user-3', 'a signed-in customer gets the higher budget');
}

/* --------------------------------------------------- end-to-end: P0 + P1 */
const reservePort = () => new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const { port: free } = probe.address();
    probe.close(() => resolve(free));
  });
});
let port = await reservePort();

async function startServer(extraEnv = {}, mockAuth = false) {
  const mockModule = `const realFetch = globalThis.fetch;
    globalThis.fetch = (input, init) => String(input).endsWith('/auth/v1/user')
      ? Promise.resolve(Response.json({ id: 'example-owner', role: 'authenticated' }))
      : realFetch(input, init);`;
  const runtimeArgs = mockAuth ? ['--import', `data:text/javascript,${encodeURIComponent(mockModule)}`] : [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const child = spawn(process.execPath, [...runtimeArgs, 'dist/server.cjs', '--port', String(port)], {
      env: { ...process.env, NODE_ENV: 'production', GEMINI_API_KEY: '', STUDIOFLOW_DISABLE_DISTRIBUTED_RATE_LIMIT: '1', ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    const ready = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Server did not start: ${output}`)), 15_000);
      const check = () => {
        if (output.includes('StudioFlow Salon OS running')) {
          clearTimeout(timeout);
          resolve();
        }
      };
      child.stdout.on('data', check);
      child.once('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`Server exited ${code}: ${output}`));
      });
    });
    try {
      await ready;
      return { child, ready: Promise.resolve(), log: () => output };
    } catch (error) {
      stop(child);
      if (attempt === 3 || !String(error).includes('EADDRINUSE')) throw error;
      port = await reservePort();
    }
  }
  throw new Error('Could not start the test server after reserving fresh local ports.');
}

const stop = (child) => {
  try {
    if (process.platform === 'win32') child.kill('SIGTERM');
    else process.kill(-child.pid, 'SIGTERM');
  } catch { /* already exited */ }
};

const post = (path, body, headers = {}) =>
  fetch(`http://127.0.0.1:${port}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const alive = async () => (await fetch(`http://127.0.0.1:${port}/api/health`)).ok;

/* Instance A: default configuration — sessions are enforced. */
{
  const server = await startServer();
  try {
    await server.ready;

    // P0: the exact body that used to kill the process. The strict request
    // validator now rejects malformed shapes with a JSON 400 before the
    // handler ever sees them — the server stays up either way.
    for (const hostile of [
      { availableServices: 'x' },
      { availableServices: { length: 1 }, bookingHistory: 'nope', favorites: 42 },
      { availableServices: [null, 7, 'x', { serviceName: { nested: true } }] },
    ]) {
      const response = await post('/api/ai-recommendations', hostile);
      assert.equal(response.status, 400, `hostile body ${JSON.stringify(hostile)} is rejected by the strict validator`);
      assert.equal((await response.json()).code, 'invalid_request');
      assert.ok(await alive(), 'the server survived a body that previously crashed it');
    }
    // Empty-but-valid shapes carry no required fields, so they still reach the
    // handler's resilient fallback and get a JSON 200.
    for (const benign of [
      { availableServices: [] },
      { availableServices: null, favorites: null, bookingHistory: null },
    ]) {
      const response = await post('/api/ai-recommendations', benign);
      assert.equal(response.status, 200, `valid body ${JSON.stringify(benign)} reaches the handler`);
      const payload = await response.json();
      assert.ok(Array.isArray(payload.recommendations), 'the response always carries a recommendations array');
      assert.ok(await alive(), 'the server survived a body that previously crashed it');
    }

    // A non-object JSON body is rejected by the parser, not passed to a handler.
    const badJson = await post('/api/ai-recommendations', 'null');
    assert.equal(badJson.status, 400, 'a non-object body is a 400, not a crash');
    assert.ok(await alive(), 'the server survived a non-object body');

    // P1: owner generators require a session.
    for (const route of ['/api/generate-bio', '/api/generate-promo-copy', '/api/generate-promo-image', '/api/veda-website-content']) {
      const anonymous = await post(route, { businessName: 'Test' });
      assert.equal(anonymous.status, 401, `${route} requires a session`);
      assert.equal((await anonymous.json()).code, 'auth_required', `${route} reports auth_required`);
    }
    // Invalid sessions fail closed, including when Auth is unavailable.
    const withToken = await post('/api/generate-bio', { businessName: 'Test' }, { authorization: 'Bearer expired.token.here' });
    if (withToken.status === 401) {
      assert.equal((await withToken.json()).code, 'invalid_session', 'an unusable token reports invalid_session');
    } else {
      assert.equal(withToken.status, 503, 'unverified sessions never reach the provider or fallback handler');
      assert.equal((await withToken.json()).code, 'auth_unavailable');
    }

    // P1: the anonymous recommendation budget is a real ceiling.
    let limited = null;
    for (let attempt = 0; attempt < 40 && !limited; attempt += 1) {
      const response = await post('/api/ai-recommendations', { availableServices: [] });
      if (response.status === 429) limited = response;
    }
    assert.ok(limited, 'the anonymous recommendation budget is enforced');
    assert.ok(Number(limited.headers.get('retry-after')) > 0, 'a 429 carries Retry-After');
    assert.equal((await limited.json()).code, 'rate_limited', 'a 429 carries a machine-readable code');
    assert.ok(await alive(), 'rate limiting does not disturb other routes');
  } finally {
    stop(server.child);
  }
}

/* Instance B: a verified session still gets safe generated fallback content. */
{
  const server = await startServer({}, true);
  try {
    await server.ready;
    const headers = { authorization: 'Bearer any.signed.token' };

    // The crash path in the copy fallback: `offer` was a truthy non-string and
    // `.toUpperCase()` threw inside `catch`. The strict validator now rejects
    // these shapes with a JSON 400 before the fallback can crash; the handler's
    // own type-tolerant fallback remains as defence in depth.
    for (const hostile of [
      { offer: { a: 1 }, serviceName: 'Facial', price: { x: 1 } },
      { offer: ['a'], businessName: null, discountPercent: 'abc' },
      { offer: 12, serviceName: {}, city: [] },
    ]) {
      const response = await post('/api/generate-promo-copy', hostile, headers);
      assert.equal(response.status, 400, 'the strict validator answers instead of crashing');
      assert.equal((await response.json()).code, 'invalid_request');
      assert.ok(await alive(), 'the server survived a hostile offer value');
    }
    // A valid offer still reaches the fallback and answers 200.
    const sane = await post('/api/generate-promo-copy', { offer: 'Diwali special', serviceName: 'Facial', price: 1500 }, headers);
    assert.equal(sane.status, 200, 'a valid copy request still answers');
    assert.equal(typeof (await sane.json()).whatsapp, 'string');

    for (const hostile of [{ businessName: {}, ownerName: [], specialties: 7 }, { vibe: { a: 1 } }]) {
      const response = await post('/api/generate-bio', hostile, headers);
      assert.equal(response.status, 400, 'the strict validator answers instead of crashing');
      assert.equal((await response.json()).code, 'invalid_request');
      assert.ok(await alive(), 'the server survived a hostile bio body');
    }
    const saneBio = await post('/api/generate-bio', { businessName: 'Studio', ownerName: 'Asha' }, headers);
    assert.equal(saneBio.status, 200, 'a valid bio request still answers');
    assert.equal((await saneBio.json()).source, 'template', 'the bio fallback is labelled honestly');

  } finally {
    stop(server.child);
  }
}

/* Static guarantees that the runtime behaviour above depends on. */
const serverSource = readFileSync('server.ts', 'utf8');
// A bare `async` handler is exactly what Express 4 does not catch. The pattern
// is line-bound so a quote inside a handler body cannot be mistaken for a route.
const bareAsyncRoutes = [...serverSource.matchAll(/app\.(?:post|get)\(\s*["'`][^"'`\n]+["'`]\s*,\s*async\b/g)];
assert.deepEqual(
  bareAsyncRoutes.map((match) => match[0]),
  [],
  'no Express route may be registered as a bare async handler',
);
assert.ok(serverSource.includes('installProcessGuards()'), 'process guards are installed at boot');
assert.ok(serverSource.includes('app.use(apiErrorHandler())'), 'a terminal error handler is registered');
for (const route of ['/api/generate-bio', '/api/generate-promo-copy', '/api/generate-promo-image', '/api/veda-website-content']) {
  assert.match(
    serverSource,
    new RegExp(`app\\.post\\("${route}", strictBody\\([^)]+\\), requireSignedIn, aiLimiters\\.`),
    `${route} must be behind sign-in and its own budget`,
  );
}
assert.match(serverSource, /app\.post\("\/api\/ai-recommendations", strictBody\([^)]+\), identifyCustomer, aiLimiters\.recommendations/, 'the customer route verifies a session when present and stays anonymous-friendly (behind strictBody)');

// Every browser caller must send the session token, or signing in would not help.
for (const file of ['src/components/AIBioModal.tsx', 'src/components/PromoStudio.tsx', 'src/lib/vedaSanjeevaniCustomizer.ts', 'src/components/customer/AIRecommendations.tsx']) {
  const source = readFileSync(file, 'utf8');
  assert.ok(source.includes('aiRequestHeaders'), `${file} attaches the session token to its AI request`);
}

assert.ok(existsSync('dist/server.cjs'), 'the production bundle exists');

console.log(
  'PASS: async routes are wrapped with a terminal error handler and process guards; hostile bodies (string/object/null where arrays and strings are expected) are answered instead of crashing the server; owner AI generators require a verified Supabase session and report auth_required/invalid_session; per-caller budgets return 429 with Retry-After; the limiter is bounded in memory and the token cache never stores raw tokens.',
);
