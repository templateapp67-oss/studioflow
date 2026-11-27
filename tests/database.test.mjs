import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const moduleUrl = process.env.NEXORA_PGLITE_MODULE ?? '@electric-sql/pglite';
const { PGlite } = await import(moduleUrl);
const { pgcrypto } = await import('@electric-sql/pglite/contrib/pgcrypto');
const { uuid_ossp } = await import('@electric-sql/pglite/contrib/uuid_ossp');
const db = new PGlite({ extensions: { pgcrypto, uuid_ossp } });
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const admin = '33333333-3333-4333-8333-333333333333';
const key1 = '44444444-4444-4444-8444-444444444441';
const key2 = '44444444-4444-4444-8444-444444444442';
const key3 = '44444444-4444-4444-8444-444444444443';
const key4 = '44444444-4444-4444-8444-444444444444';
const fqdn = 'fixture-salon.com';

try {
  await db.exec(`
    create role authenticated;
    create role anon;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text,
      phone text,
      raw_user_meta_data jsonb not null default '{}'::jsonb,
      raw_app_meta_data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      email_confirmed_at timestamptz,
      phone_confirmed_at timestamptz,
      last_sign_in_at timestamptz,
      confirmed_at timestamptz,
      encrypted_password text,
      aud text,
      role text,
      is_sso_user boolean not null default false,
      is_anonymous boolean not null default false,
      banned_until timestamptz,
      deleted_at timestamptz
    );
    create function auth.jwt() returns jsonb language sql stable
      as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;
    create function auth.uid() returns uuid language sql stable
      as $$ select (auth.jwt()->>'sub')::uuid $$;
    grant usage on schema auth to authenticated, service_role, anon;
    create table public.studioflow_websites(owner_id uuid primary key references auth.users, published_at timestamptz);
    insert into auth.users(id) values ('${owner}'),('${other}'),('${admin}');
    insert into public.studioflow_websites values ('${owner}',now()),('${other}',now());
  `);
  await db.exec([
    'create schema storage;',
    'create table storage.buckets (id text primary key, name text not null, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);',
    'alter table storage.buckets enable row level security;',
    'create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text not null references storage.buckets(id) on delete cascade, name text not null);',
    'alter table storage.objects enable row level security;',
    "create function storage.foldername(p_name text) returns text[] language sql immutable strict parallel safe as 'select case when strpos(p_name, chr(47)) > 0 then string_to_array(left(p_name, length(p_name) - strpos(reverse(p_name), chr(47))), chr(47)) else array[]::text[] end';",
    'grant usage on schema storage to authenticated, service_role, anon;',
  ].join(' '));
  const folder = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(folder)).sort()) {
    await db.exec(await readFile(new URL(file, folder), 'utf8'));
    if (file === '20260928010916_reset_empty_public_schema_20260928.sql') {
      await db.exec("create function public.nexora_save_owner_workspace(p_payload jsonb)\nreturns jsonb\nlanguage plpgsql\nsecurity definer\nset search_path = public, pg_temp\nas $fn$\ndeclare\n  v_staff jsonb;\nbegin\n  for v_staff in\n    select value\n    from jsonb_array_elements(coalesce(p_payload->'staff','[]'::jsonb))\n  loop\n    raise exception 'Staff name is required' using errcode = '22023';\n  end loop;\n  return coalesce(p_payload,'{}'::jsonb);\nend;\n$fn$;");
    }
  }
  await db.exec(`
    insert into studioflow_security.admin_grants(user_id,permission,expires_at)
    select '${admin}', item, now()+interval '1 day' from unnest(array['stop','approve','report','inventory']) item;
  `);

  async function role(user, aal = 'aal2', name = 'authenticated') {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: user, aal, role: name })]);
    await db.exec('set role ' + name);
  }
  async function call(action, data = {}) {
    return (await db.query('select public.nexora_sec_request($1,$2) ans', [action, JSON.stringify(data)])).rows[0].ans;
  }
  async function result(action, id, outcome) {
    return (await db.query('select public.nexora_sec_result($1,$2,$3) ans', [action, id, outcome])).rows[0].ans;
  }

  await role(owner, 'aal1');
  assert.equal((await call('list')).error, 'forbidden');
  await role(other);
  assert.equal((await call('inventory', { ticket: 'CASE-1' })).error, 'forbidden');
  await assert.rejects(db.query('select * from studioflow_security.domains'), /permission denied/);
  await assert.rejects(result('verify', owner, 'present'), /permission denied/);
  await role(owner);
  const domain = await call('claim', { hostname: fqdn });
  assert.match(domain.value, /^nexora-v1=[a-f0-9]{64}$/);
  assert.equal((await call('verify_input', { id: domain.id })).hostname, fqdn);
  await role(admin);
  assert.equal((await call('approve', { id: domain.id, ticket: 'CASE-2' })).error, 'not_found');
  await role(null, '', 'nexora_security_writer');
  assert.equal((await result('verify', domain.id, 'present')).state, 'verified');
  await assert.rejects(db.query('select public.nexora_sec_result($1,$2,$3,$4)', ['verify', domain.id, owner, 'present']));
  assert.equal((await db.query("select actor_id from studioflow_security.audit where action='domain_verified' and target_id=$1",[domain.id])).rows[0].actor_id,owner);

  await role(other);
  const duplicate = await call('claim', { hostname: fqdn });
  assert.ok(duplicate.id);
  await role(null, '', 'nexora_security_writer');
  assert.equal((await db.query('select public.nexora_sec_result($1,$2,$3) ans',
    ['verify', duplicate.id, 'present'])).rows[0].ans.error, 'hostname_unavailable');

  await role(admin);
  const { scope_id } = await call('approve', { id: domain.id, ticket: 'CASE-3' });
  assert.ok(scope_id);
  await role(owner);
  assert.equal((await call('request', { id: scope_id, request_key: key1 })).error, 'not_found');
  await role(admin);
  assert.equal((await call('stop', { stopped: false, ticket: 'CASE-4' })).stopped, false);
  await role(owner);
  const job = await call('request', { id: scope_id, request_key: key1 });
  assert.equal(job.state, 'running');
  assert.equal((await call('request', { id: scope_id, request_key: key1 })).id, job.id);
  assert.equal((await call('request', { id: scope_id, request_key: key2 })).error, 'rate_limited');
  await role(other);
  assert.equal((await call('cancel', { id: job.id })).error, 'not_found');
  assert.equal((await call('report', { id: job.id })).error, 'not_found');
  await role(owner);
  assert.equal((await call('cancel', { id: job.id })).state, 'cancelled');
  await role(null, '', 'nexora_security_writer');
  assert.equal((await result('complete', job.id, 'present')).state, 'cancelled');

  await role(owner);
  const completedJob = await call('request', { id: scope_id, request_key: key2 });
  await role(null, '', 'nexora_security_writer');
  assert.equal((await result('complete', completedJob.id, 'present')).state, 'completed');
  assert.equal((await db.query("select actor_id from studioflow_security.audit where action='completed' and target_id=$1",[completedJob.id])).rows[0].actor_id,owner);
  await role(owner);
  assert.equal((await call('report', { id: completedJob.id })).code, 'dns_proof_present');
  await role(admin);
  assert.equal((await call('admin_report', { id: completedJob.id, ticket: 'CASE-5' })).code, 'dns_proof_present');
  await role(other);
  assert.equal((await call('report', { id: completedJob.id })).error, 'not_found');

  await role(owner);
  const missing = await call('request', { id: scope_id, request_key: key3 });
  await role(null, '', 'nexora_security_writer');
  assert.equal((await result('complete', missing.id, 'missing')).state, 'completed');
  await role(owner);
  assert.equal((await call('request', { id: scope_id, request_key: key4 })).error, 'not_found');
  assert.equal((await call('list')).domains[0].state, 'revoked');
  await role(admin);
  assert.ok((await call('audit', { ticket: 'CASE-6' })).some(event => event.action === 'report_accessed'));
  await role(null, '', 'nexora_security_writer');
  await assert.rejects(db.query('select public.nexora_sec_maintenance()'), /permission denied/);
  await role(null, '', 'nexora_security_maintenance');
  const maintenance = await db.query('select public.nexora_sec_maintenance() ans');
  assert.equal(maintenance.rows[0].ans.timed_out, 0);
  const platform = async (action,data={}) => (await db.query(
    'select public.nexora_sec_platform($1,$2) answer',[action,JSON.stringify(data)])).rows[0].answer;
  const inbox = async (action,data={}) => (await db.query(
    'select public.nexora_sec_dns_inbox($1,$2) answer',[action,JSON.stringify(data)])).rows[0].answer;
  await db.exec('reset role');
  await db.exec(`
    insert into studioflow_security.admin_grants(user_id,permission,expires_at)
    values ('${admin}','platform_read',now()+interval '1 day'),
           ('${admin}','platform_write',now()+interval '1 day'),
           ('${admin}','platform_approve',now()+interval '1 day');
    insert into auth.users values ('55555555-5555-4555-8555-555555555555');
    insert into studioflow_security.admin_grants(user_id,permission,expires_at)
    values ('55555555-5555-4555-8555-555555555555','platform_approve',now()+interval '1 day');
  `);
  await role(owner);
  assert.equal((await platform('list',{ticket:'ACCESS-1'})).error,'forbidden');
  await role(admin,'aal1');
  assert.equal((await platform('list',{ticket:'ACCESS-1'})).error,'forbidden');
  await role(admin);
  const platformCase = await platform('create',{ ticket:'SEC-301',title:'Review platform API',
    summary:'Reviewed synthetic summary for staging.',category:'api',severity:'medium' });
  assert.equal(platformCase.state,'open');
  const change = (version,state) => platform('transition',{ ticket:'ACCESS-1',id:platformCase.id,version,state });
  assert.equal((await change(1,'triaged')).state,'triaged');
  assert.equal((await change(1,'remediating')).error,'case_changed');
  assert.equal((await change(2,'remediating')).state,'remediating');
  assert.equal((await change(3,'review')).state,'review');
  assert.equal((await change(4,'closed')).error,'invalid_transition');
  await role('55555555-5555-4555-8555-555555555555');
  assert.equal((await change(4,'closed')).state,'closed');
  assert.equal((await platform('report',{ticket:'ACCESS-1',id:platformCase.id})).error,'forbidden');
  await role(admin);
  const report = await platform('report',{ticket:'ACCESS-1',id:platformCase.id});
  assert.equal(report.events.length,5);
  assert.equal((await platform('list',{ticket:'ACCESS-1',before_id:platformCase.id})).length,0);
  assert.ok((await call('audit',{ticket:'ACCESS-1'})).every(event => !event.action.startsWith('platform_')));
  await role(owner);
  assert.equal((await platform('report',{ticket:'ACCESS-1',id:platformCase.id})).error,'forbidden');
  await assert.rejects(db.query('select * from public.nexora_sec_dns_due(5)'),/permission denied/);

  const watchClaim = await call('claim',{hostname:'monitor-fixture.com'});
  await role(null,'','nexora_security_writer');
  assert.equal((await result('verify',watchClaim.id,'present')).state,'verified');
  await db.exec('reset role');
  await db.query(`update studioflow_security.domains set verified_until=now()+interval '6 days'
    where id=$1`,[watchClaim.id]);
  await db.query(`insert into studioflow_security.dns_watch(tenant_id,domain_id,enabled)
    select tenant_id,id,true from studioflow_security.domains where id=$1`,[watchClaim.id]);

  async function lease() {
    await role(null,'','nexora_security_dns_monitor');
    return (await db.query('select * from public.nexora_sec_dns_due(5)')).rows;
  }
  async function monitorResult(id,leaseId,kind) {
    return (await db.query('select public.nexora_sec_dns_observe($1,$2,$3) ok',[id,leaseId,kind])).rows[0].ok;
  }
  async function markDue() {
    await db.exec('reset role');
    await db.query('update studioflow_security.dns_watch set next_at=now() where domain_id=$1',[watchClaim.id]);
  }
  const [first] = await lease();
  assert.equal(first.domain_id,watchClaim.id);
  assert.deepEqual(await lease(),[]);
  await role(other);
  assert.deepEqual(await inbox('list'),[]);
  await role(owner);
  assert.equal((await inbox('list'))[0].kind,'renew_soon');
  assert.equal((await inbox('ack',{id:watchClaim.id,kind:'renew_soon'})).acknowledged,true);

  await role(null,'','nexora_security_dns_monitor');
  assert.equal(await monitorResult(first.domain_id,key1,'proof_missing'),false);
  assert.equal(await monitorResult(first.domain_id,first.lease,'resolver_unavailable'),true);
  for (let x=0; x<2; x++) {
    await markDue();
    const [next] = await lease();
    assert.equal(await monitorResult(next.domain_id,next.lease,'resolver_unavailable'),true);
  }
  await role(owner);
  assert.ok((await inbox('list')).some(alert=>alert.kind==='resolver_unavailable'));
  assert.equal((await call('list')).domains.find(row=>row.id===watchClaim.id).state,'verified');
  for (let x=0; x<2; x++) {
    await markDue();
    const [next] = await lease();
    assert.equal(await monitorResult(next.domain_id,next.lease,'proof_missing'),true);
  }
  await role(owner);
  assert.equal((await call('list')).domains.find(row=>row.id===watchClaim.id).state,'revoked');
  assert.ok((await inbox('list')).some(alert=>alert.kind==='proof_missing'));
  assert.deepEqual(await lease(),[]);
  console.log('Passed: platform authorization, two-person closure, audit separation, DNS leases, expiry alerts, outage preservation, confirmation and inbox tenancy.');
  console.log('Passed: SQL migrations, MFA, roles, challenge, claim conflict, scope, quota, idempotency, tenancy, cancel, reporting, revocation and maintenance.');
} finally {
  await db.close();
}
