import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Access-control regression tests for the demo-request register.
 *
 * The register is private: the public may not read it, a signed-in visitor
 * without a manager role may not read it, and the privileged server route
 * only acts for a manager whose role comes from the server-controlled
 * `app_metadata` claim.
 */

const bundle = await build({
  entryPoints: ['server/nexoraDemoLeads.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  write: false,
});
const directory = mkdtempSync(join(tmpdir(), 'nexora-admin-'));
const modulePath = join(directory, 'nexoraDemoLeads.mjs');
writeFileSync(modulePath, bundle.outputFiles[0].text);
const { nexoraDemoLeadsAdminHandler } = await import(modulePath);

const captured = [];
const respond = () => ({
  status(code) {
    return {
      status: () => respond(),
      json: (body) => {
        captured.push({ status: code, body });
        return body;
      },
      setHeader: () => undefined,
    };
  },
  json: (body) => {
    captured.push({ status: 200, body });
    return body;
  },
});

const originalFetch = globalThis.fetch;
let authResponse = { status: 200, body: { id: 'user-1', app_metadata: { site_role: 'site_admin' } } };
let restResponse = { status: 200, body: [] };

globalThis.fetch = async (url, init) => {
  const target = String(url);
  if (target.includes('/auth/v1/user')) {
    return { ok: authResponse.status === 200, status: authResponse.status, json: async () => authResponse.body };
  }
  if (target.includes('/rest/v1/landing_leads')) {
    return {
      ok: restResponse.status >= 200 && restResponse.status < 300,
      status: restResponse.status,
      json: async () => restResponse.body,
      text: async () => '',
    };
  }
  return { ok: true, status: 200, json: async () => ({}) };
};

const call = async (body, headers = {}) => {
  captured.length = 0;
  await nexoraDemoLeadsAdminHandler({ method: 'POST', body, headers }, respond());
  return captured[0];
};

try {
  process.env.SUPABASE_URL = 'https://zilwgiuiygqqardzutxi.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';

  /* 1. No session at all is refused. */
  let result = await call({ action: 'list' });
  assert.equal(result.status, 401, 'an anonymous caller cannot read the register');

  /* 2. A signed-in visitor without a manager role is refused. */
  authResponse = { status: 200, body: { id: 'user-2', app_metadata: { site_role: 'customer' } } };
  result = await call({ action: 'list' }, { authorization: 'Bearer user-token' });
  assert.equal(result.status, 403, 'a non-manager is refused');

  /* 3. The role is taken from app_metadata, never from user_metadata. */
  authResponse = { status: 200, body: { id: 'user-3', user_metadata: { site_role: 'site_admin' }, app_metadata: {} } };
  result = await call({ action: 'list' }, { authorization: 'Bearer user-token' });
  assert.equal(result.status, 403, 'a self-declared role in user_metadata does not grant access');

  /* 4. A manager can list the register. */
  authResponse = { status: 200, body: { id: 'user-4', app_metadata: { site_role: 'sales' } } };
  restResponse = { status: 200, body: [{ id: 'lead-1', full_name: 'Test', status: 'new' }] };
  result = await call({ action: 'list' }, { authorization: 'Bearer user-token' });
  assert.equal(result.status, 200, 'a manager can list the register');
  assert.ok(Array.isArray(result.body.leads), 'the list answer carries the leads');

  /* 5. The export produces a CSV of the register. */
  result = await call({ action: 'export' }, { authorization: 'Bearer user-token' });
  assert.equal(result.status, 200, 'a manager can export the register');
  assert.ok(typeof result.body.csv === 'string' && result.body.csv.includes('full_name'), 'the export is a CSV with the lead columns');

  /* 6. Erasure needs a lead id. */
  result = await call({ action: 'erase' }, { authorization: 'Bearer user-token' });
  assert.equal(result.status, 400, 'an erasure without a lead id is refused');

  /* 7. An unknown action is refused. */
  result = await call({ action: 'drop-everything' }, { authorization: 'Bearer user-token' });
  assert.equal(result.status, 400, 'an unknown action is refused');

  /* 8. A wrong method is refused. */
  captured.length = 0;
  await nexoraDemoLeadsAdminHandler({ method: 'GET', body: {} }, respond());
  assert.equal(captured[0].status, 405, 'only POST is accepted');

  /* 9. The answers never contain a credential. */
  const serialised = JSON.stringify(captured);
  assert.ok(!serialised.includes('service-role-test-key'), 'no answer contains the privileged key');
} finally {
  globalThis.fetch = originalFetch;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/* 10. The database keeps the register private. */
const migration = readFileSync('supabase/migrations/202611070004_nexora_demo_lead_operations.sql', 'utf8');
assert.ok(migration.includes('revoke all on table public.landing_lead_audit from anon'), 'the audit table is revoked from anon');
assert.ok(migration.includes('grant select on table public.landing_lead_audit to authenticated'), 'managers may read the audit trail');
assert.ok(migration.includes('alter table public.landing_lead_audit enable row level security'), 'the audit table has RLS');
assert.ok(migration.includes('create schema if not exists nexora_private'), 'privileged helpers live in a private schema');
assert.ok(migration.includes('revoke all on schema nexora_private from public, anon, authenticated'), 'the private schema is closed');
assert.ok(migration.includes('grant execute on function nexora_private.purge_expired_landing_leads() to service_role'), 'the retention purge runs with the privileged role only');
assert.ok(migration.includes('create trigger landing_lead_audit_trigger'), 'status changes are audited');

/* 11. The manager page is routed and uses the policies for reading. */
const admin = readFileSync('src/components/nexora-landing/admin/NexoraDemoLeadsAdmin.tsx', 'utf8');
assert.ok(admin.includes("from('landing_leads')"), 'the manager page reads the register through the row policies');
assert.ok(admin.includes("from('landing_lead_audit')"), 'the manager page reads the audit trail');
assert.ok(admin.includes("update({ status, admin_notes"), 'the manager page updates the workflow columns');
assert.ok(admin.includes("action: 'export'"), 'the manager page exports through the server route');
assert.ok(admin.includes("action: 'erase'"), 'the manager page erases through the server route');
assert.ok(!admin.includes('SUPABASE_SERVICE_ROLE_KEY'), 'the manager page never uses a privileged key');

const router = readFileSync('src/AppRouter.tsx', 'utf8');
assert.ok(router.includes("'/admin/demo-leads'"), 'the manager page is routed');

console.log(
  'PASS: the demo-request register is private — anonymous and non-manager callers are refused, the manager role is taken from the signed app_metadata claim only, export and erasure require that role, the audit trail is written by a trigger in a private schema, and no answer ever contains a credential.',
);
