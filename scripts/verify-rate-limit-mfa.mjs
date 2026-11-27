import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { build } from 'esbuild';

/**
 * Rate limiting (distributed, Postgres-backed) and MFA/AAL2 enforcement.
 *
 * Coverage, bottom-up:
 *  1. The middleware claims budget from the shared Postgres store
 *     (`studioflow_edge_rate_limit_claim`), hashes bucket identities and never
 *     trusts X-Forwarded-For for the budget key. 429 carries Retry-After and
 *     RateLimit-*; a configured-but-unreachable store fails closed (503);
 *     an unconfigured store falls back to the bounded per-process budget.
 *  2. Privileged handlers (staff invite, admin demo-leads register) reject
 *     an enrolled manager/owner presenting an AAL1 token — 403 mfa_required —
 *     before any privileged RPC or query runs, accept AAL2, and the onboarding
 *     AI gate rejects AAL1 too.
 *  3. verifyAccessToken honours a fresh recovery window (AAL1 allowed) and
 *     stays closed otherwise — the lost-authenticator escape hatch is exactly
 *     one code wide and time-boxed on the database side.
 *  4. The recovery migration: hashes only (SHA-256 + salt), single-use atomic
 *     consumption, AAL2 required to issue, service-role-only consume/probe,
 *     per-account throttle, and the pre-request hook honours the window.
 *  5. Recovery-code client helpers: format, normalization, hashing parity with
 *     the SQL digest, and entropy shape.
 */

// Bundles are written inside the workspace's node_modules/.cache so packages
// kept external (e.g. @google/genai) resolve through the normal lookup chain.
const bundleDir = join('node_modules', '.cache', 'verify-rate-limit-mfa');
mkdirSync(bundleDir, { recursive: true });
let bundleCount = 0;
const loadModule = async (entry) => {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    write: false,
    logLevel: 'silent',
  });
  const target = join(bundleDir, `${Date.now()}-${bundleCount += 1}.mjs`);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(target, result.outputFiles[0].text);
  return import(pathToFileURL(join(process.cwd(), target)).href);
};

const distributed = await loadModule('server/distributedRateLimit.ts');
const limiter = await loadModule('server/rateLimit.ts');
const auth = await loadModule('server/supabaseAuth.ts');

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

/* ------------------------------------------------- 1. distributed limiter */
{
  // Environment for the configured path; restored afterwards.
  const saved = { ...process.env };
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  delete process.env.STUDIOFLOW_DISABLE_DISTRIBUTED_RATE_LIMIT;

  const originalFetch = globalThis.fetch;
  const rpcCalls = [];
  let decisions = [];
  globalThis.fetch = async (url, init) => {
    const target = String(url);
    if (target.endsWith('/rest/v1/rpc/studioflow_edge_rate_limit_claim')) {
      rpcCalls.push({ url: target, init });
      const decision = decisions.length > 1 ? decisions.shift() : decisions[0];
      if (!decision) throw new Error('no decision queued');
      return new Response(JSON.stringify(decision), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`unexpected fetch: ${target}`);
  };

  const run = async (middleware, { ip = '203.0.113.9', headers = {}, user } = {}) => {
    const state = { status: 200, body: null, headers: {}, next: false };
    const req = { ip, method: 'POST', headers, socket: { remoteAddress: ip } };
    const res = {
      locals: user ? { authUser: user } : {},
      status(code) { state.status = code; return this; },
      json(payload) { state.body = payload; return this; },
      setHeader(name, value) { state.headers[name.toLowerCase()] = String(value); },
    };
    await middleware(req, res, () => { state.next = true; });
    return state;
  };

  try {
    // Claim shape: opaque digest bucket, correct limits forwarded.
    decisions = [{ allowed: true, remaining: 1, retryAfterSeconds: 240 }];
    const mw = limiter.rateLimit({ name: 'verify-route', windowMs: 60_000, max: 2 });
    const first = await run(mw, { headers: { 'x-forwarded-for': '198.51.100.77' } });
    assert.equal(first.next, true, 'an allowed claim reaches the handler');
    const sent = JSON.parse(rpcCalls[0].init.body);
    assert.match(sent.p_bucket_key, /^[0-9a-f]{64}$/, 'the bucket key is an opaque digest');
    assert.ok(!sent.p_bucket_key.includes('203.0.113.9'), 'no raw IP reaches the store');
    assert.equal(sent.p_max_attempts, 2);
    assert.equal(sent.p_window_seconds, 60);

    // X-Forwarded-For must not reset the budget when trust proxy is off:
    // same socket address + different spoofed header → identical bucket.
    decisions = [{ allowed: true, remaining: 1, retryAfterSeconds: 240 }];
    await run(mw, { headers: { 'x-forwarded-for': '192.0.2.1' } });
    decisions = [{ allowed: true, remaining: 1, retryAfterSeconds: 240 }];
    await run(mw, { headers: { 'x-forwarded-for': '192.0.2.99' } });
    const bucketA = JSON.parse(rpcCalls.at(-2).init.body).p_bucket_key;
    const bucketB = JSON.parse(rpcCalls.at(-1).init.body).p_bucket_key;
    assert.equal(bucketA, bucketB, 'X-Forwarded-For spoofing does not move the budget');

    // Authenticated callers get their own (higher) ceiling and bucket.
    const authed = limiter.rateLimit({ name: 'verify-route', windowMs: 60_000, max: 1, authenticatedMax: 5 });
    decisions = [{ allowed: true, remaining: 4, retryAfterSeconds: 600 }];
    await run(authed, { user: { id: 'user-42' } });
    const userClaim = JSON.parse(rpcCalls.at(-1).init.body);
    assert.equal(userClaim.p_max_attempts, 5, 'verified users get the higher ceiling');
    assert.ok(!userClaim.p_bucket_key.includes('user-42'), 'no raw user id reaches the store');

    // 429 contract: status, Retry-After, RateLimit-* and a stable code.
    decisions = [
      { allowed: true, remaining: 1, retryAfterSeconds: 240 },
      { allowed: true, remaining: 0, retryAfterSeconds: 240 },
      { allowed: false, remaining: 0, retryAfterSeconds: 137 },
    ];
    await run(mw); await run(mw);
    const limited = await run(mw);
    assert.equal(limited.status, 429);
    assert.equal(limited.headers['retry-after'], '137', '429 carries the window reset as Retry-After');
    assert.equal(limited.headers['ratelimit-remaining'], '0');
    assert.equal(limited.body.code, 'rate_limited');
    assert.equal(limited.body.retryAfterSeconds, 137);
    assert.equal(limited.next, false, 'the handler is not reached when limited');

    // Configured but unreachable: fail closed, never open.
    globalThis.fetch = async () => { throw new Error('ECONNREFUSED'); };
    const closed = await run(mw);
    assert.equal(closed.status, 503, 'an unreachable store fails closed');
    assert.equal(closed.body.code, 'rate_limit_unavailable');
    assert.equal(closed.headers['retry-after'], '30');
    assert.equal(closed.next, false);

    // Unconfigured: the bounded per-process fallback still enforces, with no
    // network call at all.
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    globalThis.fetch = async () => { throw new Error('unconfigured fallback must not touch the network'); };
    const fallback = limiter.rateLimit({ name: 'verify-fallback', windowMs: 60_000, max: 2, now: () => 0 });
    assert.equal((await run(fallback, { ip: '198.51.100.23' })).next, true);
    assert.equal((await run(fallback, { ip: '198.51.100.23' })).next, true);
    const fallbackLimited = await run(fallback, { ip: '198.51.100.23' });
    assert.equal(fallbackLimited.status, 429, 'the development fallback still caps the budget');
    assert.equal(fallbackLimited.body.code, 'rate_limited');
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
}

/* ------------------------------------------ 2. privileged handlers: AAL2 */
{
  const originalFetch = globalThis.fetch;
  const aal = (level) => `header.${b64url({ aal: level })}.sig`;
  const makeRes = () => {
    const state = { status: 200, body: null, headers: {} };
    const res = {
      status(code) { state.status = code; return this; },
      json(payload) { state.body = payload; return this; },
      setHeader(name, value) { state.headers[name.toLowerCase()] = String(value); },
    };
    return { res, state };
  };

  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  const savedResendKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  const fetchLog = [];
  const stub = (overrides = {}) => {
    globalThis.fetch = async (url, init) => {
      const target = String(url);
      fetchLog.push(target);
      if (target.includes('/auth/v1/user')) {
        return new Response(JSON.stringify(overrides.user ?? {
          id: 'owner-1',
          email: 'owner@example.com',
          role: 'authenticated',
          app_metadata: { site_role: 'site_admin' },
          factors: [{ status: 'verified' }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (target.endsWith('/rest/v1/rpc/studioflow_mfa_recovery_active')) {
        return new Response(JSON.stringify(overrides.recoveryActive === true), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (target.endsWith('/rest/v1/rpc/studioflow_staff_invite_delivery')) {
        return new Response(JSON.stringify({
          owner_id: 'owner-1', status: 'pending', email: 'new-staff@example.com',
          staff_name: 'Riya', role: 'Manager (Full Access)', salon_name: 'Glow Studio',
          owner_email: 'owner@example.com', expires_at: new Date(Date.now() + 3600_000).toISOString(),
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (target.endsWith('/rest/v1/rpc/studioflow_edge_rate_limit_claim')) {
        return new Response(JSON.stringify({ allowed: true, remaining: 19, retryAfterSeconds: 600 }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (target.includes('/rest/v1/landing_leads')) {
        return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      throw new Error(`unexpected fetch: ${target}`);
    };
  };

  try {
    // --- staff invite
    const { staffInviteEmailHandler } = await loadModule('server/staffInviteEmail.ts');
    const inviteBody = {
      inviteId: '11111111-1111-4111-8111-111111111111',
      token: 'a'.repeat(64),
      origin: 'https://nexorasalon.online',
    };

    fetchLog.length = 0; stub();
    {
      const { res, state } = makeRes();
      await staffInviteEmailHandler(
        { method: 'POST', body: inviteBody, headers: { authorization: `Bearer ${aal('aal1')}` } },
        res,
      );
      assert.equal(state.status, 403, 'an enrolled owner at AAL1 is rejected');
      assert.equal(state.body?.code, 'mfa_required');
      assert.ok(!fetchLog.some((url) => url.includes('studioflow_staff_invite_delivery')),
        'the privileged invite RPC must not run behind an AAL1 session');
    }

    fetchLog.length = 0; stub({ recoveryActive: true });
    {
      const { res, state } = makeRes();
      await staffInviteEmailHandler(
        { method: 'POST', body: inviteBody, headers: { authorization: `Bearer ${aal('aal1')}` } },
        res,
      );
      assert.notEqual(state.body?.code, 'mfa_required', 'an active recovery window opens the gate');
    }

    fetchLog.length = 0; stub();
    delete process.env.RESEND_API_KEY;
    {
      const { res, state } = makeRes();
      await staffInviteEmailHandler(
        { method: 'POST', body: inviteBody, headers: { authorization: `Bearer ${aal('aal2')}` } },
        res,
      );
      assert.notEqual(state.status, 403, 'AAL2 reaches the invite flow');
      assert.notEqual(state.body?.code, 'mfa_required');
      assert.ok(fetchLog.some((url) => url.includes('studioflow_staff_invite_delivery')),
        'AAL2 passes through to the invite delivery RPC');
    }

    // --- admin demo-leads register
    const { nexoraDemoLeadsAdminHandler } = await loadModule('server/nexoraDemoLeads.ts');
    fetchLog.length = 0; stub();
    {
      const { res, state } = makeRes();
      await nexoraDemoLeadsAdminHandler(
        { method: 'POST', body: { action: 'list' }, headers: { authorization: `Bearer ${aal('aal1')}` } },
        res,
      );
      assert.equal(state.status, 403, 'an enrolled manager at AAL1 is rejected');
      assert.equal(state.body?.code, 'mfa_required');
      assert.ok(!fetchLog.some((url) => url.includes('landing_leads')),
        'the register must not be read behind an AAL1 session');
    }
    fetchLog.length = 0; stub();
    {
      const { res, state } = makeRes();
      await nexoraDemoLeadsAdminHandler(
        { method: 'POST', body: { action: 'list' }, headers: { authorization: `Bearer ${aal('aal2')}` } },
        res,
      );
      assert.equal(state.status, 200, 'AAL2 reaches the register');
      assert.ok(fetchLog.some((url) => url.includes('landing_leads')));
    }

    // --- onboarding AI gate rejects AAL1 with an enrolled factor
    const { onboardingCopyHandler } = await loadModule('server/onboardingCopy.ts');
    {
      const { res, state } = makeRes();
      await onboardingCopyHandler(
        { method: 'POST', body: { kind: 'tagline', businessName: 'Glow Studio', theme: 'hair_salon' }, headers: { authorization: 'Bearer enrolled-aal1' } },
        res,
        {
          verify: async () => ({ id: 'user-1', mfaRequired: true }),
          apiKey: 'test-key',
          generate: () => { throw new Error('the provider must never run behind AAL1'); },
          limiter: { hit: () => ({ allowed: true, resetAfterSeconds: 300 }) },
          authorize: async () => true,
        },
      );
      assert.equal(state.status, 403, 'the onboarding AI route enforces the second factor');
    }

    // --- verifyAccessToken honours the recovery window either way
    auth.clearAuthCache();
    const cfg = { url: 'https://example.supabase.co', publishableKey: 'pub', configured: true };
    const token = `header.${b64url({ aal: 'aal1' })}.sig`;
    const mkFetch = (recoveryActive) => async (url) => {
      const target = String(url);
      if (target.includes('/auth/v1/user')) {
        return { status: 200, ok: true, json: async () => ({ id: 'user-rec', factors: [{ status: 'verified' }] }) };
      }
      if (target.endsWith('/rest/v1/rpc/studioflow_mfa_recovery_active')) {
        return { status: 200, ok: true, json: async () => recoveryActive };
      }
      throw new Error(`unexpected fetch: ${target}`);
    };
    const openWindow = await auth.verifyAccessToken(token, cfg, mkFetch(true));
    assert.equal(openWindow?.mfaRequired, false, 'a fresh recovery window honours AAL1');
    auth.clearAuthCache();
    const closedWindow = await auth.verifyAccessToken(token, cfg, mkFetch(false));
    assert.equal(closedWindow?.mfaRequired, true, 'no window → AAL1 stays locked out');
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (savedResendKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = savedResendKey;
  }
}

/* ------------------------------------------------- 3. recovery migration */
{
  const migration = readFileSync('supabase/migrations/20261126143000_studioflow_mfa_recovery_codes.sql', 'utf8');
  const priorMfa = readFileSync('supabase/migrations/20261125100000_studioflow_auth_access_hardening.sql', 'utf8');

  // Codes are stored hashed, never plaintext; the table is unreachable for clients.
  assert.match(migration, /create table if not exists public\.studioflow_mfa_recovery_codes/);
  assert.match(migration, /revoke all on table public\.studioflow_mfa_recovery_codes from public, anon, authenticated/);
  assert.match(migration, /enable row level security/);
  assert.ok(!migration.includes('default now(), plain'), 'no plaintext column exists');

  // Issue: AAL2 mandatory, batches of bounded size, re-issue replaces unused codes.
  assert.match(migration, /studioflow_mfa_recovery_codes_issue/);
  assert.match(migration, /aal', 'aal1'\) is distinct from 'aal2'/);
  assert.match(migration, /v_count < 1 or v_count > 8/);
  assert.match(migration, /delete from public\.studioflow_mfa_recovery_codes\s*\n\s*where user_id = v_user and consumed_at is null/);

  // Consume: per-account throttle BEFORE any hash comparison, atomic single-use spend.
  // The throttle bucket key must be an opaque digest of the user id — a raw id
  // never lands in the shared rate-limit store (same privacy contract as the Node side).
  const consumeFn = migration.slice(migration.indexOf('studioflow_mfa_recovery_codes_consume(p_user_id'));
  assert.match(consumeFn, /studioflow_edge_rate_limit_claim\(/);
  assert.match(consumeFn, /encode\(extensions\.digest\('studioflow-rate-limit:mfa-recovery-account:' \|\| p_user_id::text, 'sha256'\), 'hex'\)/);
  assert.ok(!/rate_limit_claim\('mfa-recovery:' \|\| p_user_id::text/.test(consumeFn), 'the raw user id must not be the bucket key');
  assert.match(consumeFn, /extensions\.digest\(salt \|\| ':' \|\| v_code, 'sha256'\)/);
  assert.match(consumeFn, /set consumed_at = now\(\)\s*\n\s*where id = v_match\s*\n\s*and consumed_at is null/, 'the spend is atomic — only one concurrent request wins');

  // Consume/probe are service-role only; issue/count are user-context.
  assert.match(migration, /grant execute on function public\.studioflow_mfa_recovery_codes_consume\(uuid, text\) to service_role/);
  assert.match(migration, /grant execute on function public\.studioflow_mfa_recovery_active\(uuid\) to service_role/);
  assert.ok(!/grant execute on function public\.studioflow_mfa_recovery_codes_consume\(uuid, text\) to authenticated/.test(migration),
    'AAL1 browsers must never reach the consume RPC directly');
  assert.match(migration, /grant execute on function public\.studioflow_mfa_recovery_codes_issue\(jsonb\) to authenticated/);
  assert.match(migration, /grant execute on function public\.studioflow_mfa_recovery_codes_count\(\) to authenticated/);

  // The pre-request hook now honours the 10-minute recovery window — otherwise
  // a consumed code could never unlock authenticated surfaces at AAL1.
  assert.match(migration, /create or replace function studioflow_private\.mfa_session_allowed\(\)/);
  assert.match(migration, /studioflow_mfa_recovery_codes/);
  assert.match(migration, /interval '10 minutes'/);
  // And the prior hardening is preserved (AAL2 or factor-less only).
  assert.match(priorMfa, /mfa_session_allowed/);

  // The AAL2 gate triggers on verified factors + non-AAL2 JWT in every layer.
  const staffInvite = readFileSync('server/staffInviteEmail.ts', 'utf8');
  assert.ok(staffInvite.includes('secondFactorSatisfied') && staffInvite.includes('mfa_required'),
    'staff invite enforces AAL2');
  const adminLeads = readFileSync('server/nexoraDemoLeads.ts', 'utf8');
  assert.ok(adminLeads.includes('secondFactorSatisfied') && adminLeads.includes('mfa_required'),
    'admin demo-leads enforces AAL2');
  const sessionProtection = readFileSync('supabase/functions/_shared/sessionProtection.ts', 'utf8');
  assert.ok(sessionProtection.includes("aal !== 'aal2'"), 'Edge functions enforce AAL2');
}

/* --------------------------------- 4. client helpers: format & hashing */
{
  const codes = await clientModule();
  const entries = await codes.generateRecoveryCodes(8);
  assert.equal(entries.length, 8);
  const seen = new Set(entries.map((entry) => entry.code));
  assert.equal(seen.size, 8, 'codes are unique');
  for (const entry of entries) {
    assert.match(entry.code, /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/, 'codes render as four groups of four');
    assert.match(entry.salt, /^[0-9a-f]{32}$/);
    assert.match(entry.hash, /^[0-9a-f]{64}$/);
    const normalized = codes.normalizeRecoveryCode(entry.code);
    const expected = createHash('sha256').update(`${entry.salt}:${normalized}`).digest('hex');
    assert.equal(entry.hash, expected, 'client hash matches SHA-256(salt || ":" || code) used by SQL');
  }
  assert.equal(codes.normalizeRecoveryCode('abcd-efgh 1234!@#$'), 'ABCDEFGH1234');
  assert.equal(codes.formatRecoveryCode('ABCD1234EFGH5678'), 'ABCD-1234-EFGH-5678');
}

async function clientModule() {
  if (!clientModule.cached) {
    clientModule.cached = await loadModule('src/lib/recoveryCodes.ts');
  }
  return clientModule.cached;
}

/* ------------------------------------------- 5. server wiring & headers */
{
  const server = readFileSync('server.ts', 'utf8');
  assert.ok(server.includes('/api/account/recovery-codes/consume'), 'server mounts the consume route');
  assert.ok(server.includes('/api/account/recovery-codes/active'), 'server mounts the recovery-window probe');
  assert.ok(server.includes('RECOVERY_CONSUME_SCHEMA'), 'the consume route validates bodies strictly');

  const bookingEmail = readFileSync('server/bookingEmail.ts', 'utf8');
  assert.ok(bookingEmail.includes('claimDistributedRateLimit'), 'booking email uses the shared store');
  assert.ok(bookingEmail.includes("res.setHeader?.('Retry-After'"), 'booking email 429/503 carry Retry-After');

  const onboardingCopy = readFileSync('server/onboardingCopy.ts', 'utf8');
  assert.ok(onboardingCopy.includes('claimDistributedRateLimit'), 'onboarding copy uses the shared store');
  assert.ok(onboardingCopy.includes("res.setHeader('Retry-After'"), 'onboarding copy 429 carries Retry-After');

  const rateLimitSrc = readFileSync('server/rateLimit.ts', 'utf8');
  assert.ok(rateLimitSrc.includes('claimDistributedRateLimit'), 'the shared middleware uses the Postgres store');

  const distributedSrc = readFileSync('server/distributedRateLimit.ts', 'utf8');
  assert.ok(distributedSrc.includes('studioflow_edge_rate_limit_claim'), 'the claim RPC is the production store');
  assert.ok(distributedSrc.includes("createHash('sha256')"), 'bucket identities are digested');
}

console.log('PASS: distributed Postgres rate limiting (opaque buckets, X-Forwarded-For immunity, 429 + Retry-After, fail-closed outage, bounded dev fallback); AAL2 enforced on admin/staff-invite/onboarding gates with a time-boxed recovery-window escape hatch; recovery codes hashed (SHA-256 + per-code salt), single-use and throttled; server and RPC grants pin the privilege levels.');
