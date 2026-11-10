import assert from 'node:assert/strict';

/**
 * Referral and reschedule RPC contract, verified against the live catalog.
 *
 * A code review asked for migrations creating `apply_referral` and
 * `reschedule_booking`. Neither name is part of this schema: the referral flow
 * is `studioflow_customer_validate_ref` / `studioflow_customer_claim_ref`
 * (`backend/customer-referrals.sql`) and the customer reschedule is
 * `studioflow_android_reschedule`
 * (`supabase/migrations/202610300004_multibranch_support.sql`). Creating the
 * requested names would have added a second, competing implementation of the
 * same operation, so the correct fix is to prove the existing contract instead:
 *
 *   1. the exact signature exists (an argument rename breaks every call site);
 *   2. `search_path` is pinned (these run `security invoker`/`definer` under
 *      RLS, so an unset search_path is a privilege-escalation vector);
 *   3. `authenticated` may execute and `anon`/`PUBLIC` may not.
 *
 * The client side is covered by the RPC-name check that already runs in
 * `verify-sql-migrations.mjs` (every `.rpc('name')` in `src/` must exist).
 */
const CONTRACT = [
  {
    name: 'studioflow_customer_validate_ref',
    args: 'p_code text',
    // Anonymous visitors may validate a code before signing up.
    roles: ['anon', 'authenticated'],
  },
  {
    name: 'studioflow_customer_claim_ref',
    args: 'p_code text',
    roles: ['authenticated'],
  },
  {
    name: 'studioflow_android_referral',
    args: '',
    roles: ['authenticated'],
  },
  {
    name: 'studioflow_android_reschedule',
    args: 'p_booking uuid, p_date date, p_time text, p_stylist text',
    roles: ['authenticated'],
  },
];

export async function verifyRpcContract(db) {
  for (const entry of CONTRACT) {
    const { rows } = await db.query(
      `select p.oid, pg_get_function_identity_arguments(p.oid) as args, coalesce(p.proconfig, '{}') as proconfig
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = $1`,
      [entry.name],
    );
    assert.equal(rows.length, 1, `${entry.name} must exist exactly once in public`);
    assert.equal(rows[0].args, entry.args, `${entry.name} signature must not drift`);

    const pinnedSearchPath = Array.from(rows[0].proconfig ?? []).some((setting) =>
      /^search_path=/.test(setting),
    );
    assert.ok(pinnedSearchPath, `${entry.name} must pin search_path`);

    // Privileges are read from the catalog oid: `regprocedure` text input does
    // not accept named arguments, so the oid is the stable handle here.
    const { rows: [acl] } = await db.query(
      `select
         has_function_privilege('authenticated', $1::oid, 'EXECUTE') as authenticated_exec,
         has_function_privilege('anon', $1::oid, 'EXECUTE') as anon_exec,
         exists (
           select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
            where p.oid = $1::oid and a.grantee = 0
         ) as public_exec`,
      [rows[0].oid],
    );
    assert.equal(
      acl.public_exec,
      false,
      `${entry.name} must not be executable by PUBLIC (grant it to a named role)`,
    );
    assert.equal(
      acl.anon_exec,
      entry.roles.includes('anon'),
      `${entry.name} anon EXECUTE must match the documented policy`,
    );
    assert.equal(acl.authenticated_exec, true, `${entry.name} must be executable by authenticated`);
  }
}
