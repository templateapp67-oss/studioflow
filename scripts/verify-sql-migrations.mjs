// Offline proof that every backend migration applies cleanly, in dependency
// order, against a stubbed Supabase surface (auth/storage/net/pg_net).
import {PGlite} from '@electric-sql/pglite';
import {readdirSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const db=new PGlite();
await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create table public.app_admins(user_id uuid primary key);
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,raw_app_meta_data jsonb,banned_until timestamptz,deleted_at timestamptz,is_anonymous boolean);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(bucket_id text,name text,owner uuid,metadata jsonb);
create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
create schema net;
create function net.http_post(url text,headers jsonb default null,body jsonb default null,timeout_milliseconds integer default null) returns bigint language sql as $$select 0::bigint$$;
create publication supabase_realtime;
create schema vault;
create table vault.secrets(id uuid primary key default gen_random_uuid(),secret text,name text,description text);
create view vault.decrypted_secrets as select id,secret as decrypted_secret from vault.secrets;
create function vault.create_secret(secret text,name text,description text) returns uuid language sql as $$insert into vault.secrets(secret,name,description) values(secret,name,description) returning id$$;
create schema cron;
create function cron.schedule(job text,schedule text,command text) returns bigint language sql as $$select 0::bigint$$;
create function cron.unschedule(job text) returns boolean language sql as $$select true$$;
`);
try{await db.exec(`create schema extensions; create extension pgcrypto with schema extensions;`);}
catch{await db.exec(`create schema if not exists extensions;
create or replace function extensions.gen_random_bytes(n integer) returns bytea language sql as $$select decode(md5(random()::text),'hex')$$;
create or replace function extensions.digest(data text,algo text) returns bytea language sql as $$select decode(md5(data),'hex')$$;`);}

// Dollar-quote-aware splitter: naive ';' splitting breaks plpgsql bodies.
const splitSql=(sql)=>{
  const out=[];let cur='',i=0,tag=null,quote=false,line=false,blockDepth=0;
  while(i<sql.length){
    const two=sql.slice(i,i+2);
    if(blockDepth>0){
      if(two==='/*'){blockDepth++;cur+='  ';i+=2;continue;}
      if(two==='*/'){blockDepth--;cur+='  ';i+=2;continue;}
      cur+=sql[i]==='\n'?'\n':' ';i++;continue;
    }
    if(line){cur+=sql[i];if(sql[i]==='\n')line=false;i++;continue;}
    if(two==='--'&&!quote&&!tag){line=true;cur+=two;i+=2;continue;}
    if(two==='/*'&&!quote&&!tag){blockDepth=1;cur+='  ';i+=2;continue;}
    if(sql[i]==="'"&&!tag){if(sql[i+1]==="'"){cur+="''";i+=2;continue;}quote=!quote;cur+=sql[i];i++;continue;}
    if(sql[i]==='$'&&!quote){
      const m=sql.slice(i).match(/^\$[A-Za-z_0-9]*\$/);
      if(m){if(!tag)tag=m[0];else if(tag===m[0])tag=null;cur+=m[0];i+=m[0].length;continue;}
    }
    if(sql[i]===';'&&!quote&&!tag){if(cur.trim())out.push(cur);cur='';i++;continue;}
    cur+=sql[i];i++;
  }
  if(cur.trim())out.push(cur);
  assert.equal(tag,null,'Unterminated dollar-quoted SQL body');
  assert.equal(blockDepth,0,'Unterminated block comment in SQL body');
  return out;
};
const applySqlText=async(sql,label='SQL file')=>{
  const stmts=splitSql(sql).filter(s=>!/^\s*(begin|commit)\s*;?\s*$/i.test(s));
  await db.exec('BEGIN');
  try{
    for(let i=0;i<stmts.length;i++){
      try{await db.exec(stmts[i]);}
      catch(e){throw new Error('statement '+(i+1)+'/'+stmts.length+': '+(e.message||e)+'\n'+stmts[i].slice(0,1200));}
    }
    await db.exec('COMMIT');
  }catch(e){try{await db.exec('ROLLBACK')}catch{}throw new Error(label+': '+(e.message||e));}
};
const applyFile=async(name)=>applySqlText(readFileSync('backend/'+name,'utf8'),'backend/'+name);
const files=readdirSync('backend').filter(n=>n.endsWith('.sql')&&!n.includes('verification')).sort();
const pending=new Map(files.map(n=>[n,'']));
const ANCHORED=['studioflow-shared-tables.sql','studioflow-schema.sql','studioflow-android-foundation.sql','customer-portal.sql','starter-packages.sql'];
// Refinements that must win last, plus multi-service binders that need the gap cores.
const LATE=['customer-discovery-sections.sql','starter-packages-onboarding-guard.sql','studioflow-customer-wiring-gaps.sql','booking-coupons.sql','booking-add-ons.sql','customer-demo-bookings.sql','studioflow-pos-refunds.sql'];
const order=[...ANCHORED.filter(f=>pending.has(f)),...[...pending.keys()].filter(f=>!ANCHORED.includes(f)&&!LATE.includes(f)),...LATE.filter(f=>pending.has(f))];
let applied=[];
for(let round=0;round<12&&pending.size;round++){
  let progress=false;
  for(const name of order){
    if(!pending.has(name))continue;
    try{
      await applyFile(name);
      pending.delete(name);applied.push(name);progress=true;
    }catch(e){pending.set(name,String(e.message||e).split('\n')[0].slice(0,320));}
  }
  if(!progress)break;
}
assert.equal(pending.size,0,'Migrations failed to converge:\n'+[...pending].map(([n,e])=>` - ${n}: ${e}`).join('\n'));
console.log(`PASS: all ${applied.length} backend migrations apply in dependency order.`);
// Apply the additive Template 12 migration against the same stubbed Supabase
// surface so client-table/RLS checks include the new data layer as well.
// Follow the timestamped migration order: shared multibranch schema first,
// then Template 12, then its dependent multibranch extension.
await db.exec(readFileSync('supabase/pending-features/202610300004_multibranch_support.sql','utf8'));
await db.exec(readFileSync('supabase/pending-features/202610300005_iron_ink_social_videos.sql','utf8'));
await db.exec(readFileSync('supabase/pending-features/202611020001_ziya_promotions_and_loyalty.sql','utf8'));

// Live-catalog assertions: every client-called RPC/table/bucket exists,
// RLS is on, realtime publication is complete.
const clientRpc=(src)=>{
  const names=new Set();
  for(const m of src.matchAll(/\.rpc\(\s*['"`]([A-Za-z0-9_]+)['"`]/g))names.add(m[1]);
  for(const n of ['studioflow_book','studioflow_validate_ref'])if(src.includes(`'${n}'`))names.add(n);
  return [...names].filter(n=>/^(studioflow_|get_my_|nexora_)/.test(n));
};
const walk=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):dir+'/'+e.name.endsWith('.tsx')||e.name.endsWith('.ts')?[dir+'/'+e.name]:[]);
// Client catalog assertions inspect browser application code only. Edge Functions
// use service_role for internal RPCs (including tenant-private WhatsApp operations),
// so their calls must be checked by the dedicated Edge Function security verifier
// and WhatsApp platform contract verifier, not treated as browser-callable RPCs.
const src=['src'].flatMap(d=>{try{return walk(d)}catch{return[]}}).map(f=>readFileSync(f,'utf8')).join('\n');
await db.exec(readFileSync('supabase/pending-features/202611030003_template15_keshkraft.sql','utf8'));
await db.exec(readFileSync('supabase/pending-features/202611050001_booking_multi_services.sql','utf8'));
await db.exec(readFileSync('supabase/pending-features/202611050001_booking_multi_services.sql','utf8'));
// NEXORA SALONOS landing data layer: schema, published seed content and the
// shared lead rate-limit counters. The landing page reads these tables with
// the publishable browser key, so their RLS state is verified here as well.
await db.exec(readFileSync('supabase/migrations/20261107070508_nexora_salon_landing_database.sql','utf8'));
await db.exec(readFileSync('supabase/pending-features/202611070002_nexora_salon_landing_seed.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20261107071230_nexora_salon_landing_rate_limits.sql','utf8'));
// Demo-request operations: idempotency, CRM delivery state, retention, the
// audit trail and the published privacy notice link.
await db.exec(readFileSync('supabase/migrations/20261107082654_nexora_demo_lead_operations.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20261107082952_nexora_demo_lead_retention_default.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20261107083327_nexora_landing_privacy_link.sql','utf8'));
// Finish the selected pre-Template-12 migrations before the reconciled
// Template 12 version and its branch-specific extension.
await db.exec(readFileSync('supabase/migrations/20261113120946_template12_iron_ink.sql','utf8'));
await db.exec(readFileSync('supabase/pending-features/20261113120947_multibranch_template12_support.sql','utf8'));
// Unified salon CRM + role-level permission matrix: the browser calls these
// RPCs (`src/components/SalonCRM.tsx`) and resolves staff roles through them,
// so their sources must be replayed before the live-catalog scan.
await applySqlText(readFileSync('supabase/migrations/20261119070000_unified_salon_crm.sql','utf8'),'supabase/migrations/20261119070000_unified_salon_crm.sql');
const staffRoleSql=readFileSync('supabase/migrations/20261119080000_staff_role_permissions.sql','utf8');
assert.match(staffRoleSql,/create or replace function public\.studioflow_normalize_staff_access_role\(p_role text\)/,
  'staff access-role normalizer is defined');
assert.match(staffRoleSql,/'Manager \(Full Access\)' then array\[/,
  'manager permission set is the largest set');
assert.doesNotMatch(staffRoleSql,/grant execute on function public\.studioflow_my_branch_role\(uuid\) to (anon|public)/,
  'the caller branch-role helper is never exposed to anonymous clients');
await applySqlText(staffRoleSql,'supabase/migrations/20261119080000_staff_role_permissions.sql');
const {rows:[roleMatrix]}=await db.query(`
  select
    public.studioflow_normalize_staff_access_role('superadmin') as unknown_role,
    public.studioflow_normalize_staff_access_role(null) as null_role,
    public.studioflow_normalize_staff_access_role('receptionist') as legacy_receptionist,
    array_length(public.studioflow_staff_role_permissions('Manager (Full Access)'),1) as manager_perms,
    array_length(public.studioflow_staff_role_permissions('Receptionist (Frontdesk)'),1) as receptionist_perms,
    array_length(public.studioflow_staff_role_permissions('Service Provider (Assigned)'),1) as provider_perms,
    public.studioflow_staff_has_permission('Receptionist (Frontdesk)','manage_team') as receptionist_manages_team,
    public.studioflow_staff_has_permission('Service Provider (Assigned)','process_pos_payments') as provider_pos
`);
assert.equal(roleMatrix.unknown_role,'Service Provider (Assigned)','unknown roles fail closed to least privilege');
assert.equal(roleMatrix.null_role,'Service Provider (Assigned)','missing roles fail closed to least privilege');
assert.equal(roleMatrix.legacy_receptionist,'Receptionist (Frontdesk)','legacy role aliases normalize');
assert.ok(roleMatrix.manager_perms>roleMatrix.receptionist_perms&&roleMatrix.receptionist_perms>roleMatrix.provider_perms,
  'roles are strictly nested in privilege order');
assert.equal(roleMatrix.receptionist_manages_team,false,'receptionists cannot manage the team');
assert.equal(roleMatrix.provider_pos,false,'service providers cannot run POS payments');

// Staff invites + separate staff login: tables, hashed-token lifecycle RPCs,
// role/branch-filtered staff workspace and the additive staff booking policy.
const staffInviteSql=readFileSync('supabase/migrations/20261119120000_staff_invites_and_staff_login.sql','utf8');
assert.match(staffInviteSql,/create table if not exists public\.studioflow_staff_invites/,'invite ledger exists');
assert.match(staffInviteSql,/token_hash text not null unique/,'invite tokens are stored hashed');
assert.doesNotMatch(staffInviteSql,/token text not null/,'no plaintext invite token column');
assert.match(staffInviteSql,/create policy studioflow_staff_invites_owner_manage[\s\S]*?owner_id = \(select auth\.uid\(\)\)/,'invite RLS is owner-scoped');
assert.match(staffInviteSql,/create policy studioflow_bookings_staff_read/,'staff booking policy is additive');
assert.doesNotMatch(staffInviteSql,/drop policy if exists studioflow_bookings_read/,'the owner booking policy is never dropped');
await applySqlText(staffInviteSql,'supabase/migrations/20261119120000_staff_invites_and_staff_login.sql');
const {rows:[staffSecurity]}=await db.query(`
  select
    has_function_privilege('anon','public.studioflow_staff_invite_lookup(text)','EXECUTE') as anon_lookup,
    has_function_privilege('anon','public.studioflow_staff_invite_accept(text)','EXECUTE') as anon_accept,
    has_function_privilege('anon','public.studioflow_staff_workspace()','EXECUTE') as anon_workspace,
    has_function_privilege('anon','public.studioflow_staff_invite_create(text,text,text[],text,text,integer)','EXECUTE') as anon_create,
    has_function_privilege('authenticated','public.studioflow_staff_invite_accept(text)','EXECUTE') as auth_accept,
    has_function_privilege('authenticated','public.studioflow_staff_workspace()','EXECUTE') as auth_workspace,
    has_table_privilege('anon','public.studioflow_staff_invites','SELECT') as anon_invite_select,
    has_table_privilege('anon','public.studioflow_staff_members','SELECT') as anon_member_select,
    (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='studioflow_staff_invites') as invite_rls,
    (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='studioflow_staff_members') as member_rls
`);
assert.equal(staffSecurity.anon_lookup,true,'signed-out visitors can look up an invite token');
assert.equal(staffSecurity.anon_accept,false,'anonymous clients cannot accept an invite');
assert.equal(staffSecurity.anon_workspace,false,'anonymous clients cannot read a staff workspace');
assert.equal(staffSecurity.anon_create,false,'anonymous clients cannot mint invites');
assert.equal(staffSecurity.auth_accept,true,'signed-in staff can accept an invite');
assert.equal(staffSecurity.auth_workspace,true,'signed-in staff can read their projection');
assert.equal(staffSecurity.anon_invite_select,false,'anon cannot read the invite ledger');
assert.equal(staffSecurity.anon_member_select,false,'anon cannot read staff memberships');
assert.equal(staffSecurity.invite_rls,true,'invite ledger has RLS enabled');
assert.equal(staffSecurity.member_rls,true,'staff memberships have RLS enabled');

// Malformed and unknown tokens resolve to 'invalid' and never throw.
const {rows:[lookupBad]}=await db.query(`select
  public.studioflow_staff_invite_lookup('') as empty,
  public.studioflow_staff_invite_lookup('short') as short,
  public.studioflow_staff_invite_lookup(repeat('a',64)) as unknown`);
assert.equal(lookupBad.empty.status,'invalid','empty token is invalid');
assert.equal(lookupBad.short.status,'invalid','short token is invalid');
assert.equal(lookupBad.unknown.status,'invalid','unknown token is invalid');

// Staff access hardening: empty branch scope fails closed, stale branches are
// filtered, acceptance is atomic, and no policy recurse into its own table.
const hardeningFile='supabase/migrations/20261119140000_staff_access_hardening.sql';
const hardeningSql=readFileSync(hardeningFile,'utf8');
assert.match(hardeningSql,/all_branches boolean not null default false/,'explicit all-branches flag exists');
assert.match(hardeningSql,/security definer/g,'authorization helpers are SECURITY DEFINER');
assert.match(hardeningSql,/studioflow_staff_member_update_access/,'owner can edit a live login\'s access');
// The old "empty array means every branch" behaviour must be gone.
assert.doesNotMatch(hardeningSql,/coalesce\(cardinality\(sm\.branch_ids\), 0\) = 0[\s\S]{0,80}then null/,
  'empty branch scope is never treated as all branches');
await applySqlText(hardeningSql,hardeningFile);

const {rows:[hardeningGrants]}=await db.query(`
  select
    has_function_privilege('anon','public.studioflow_is_salon_owner(uuid)','EXECUTE') as anon_is_owner,
    has_function_privilege('anon','public.studioflow_staff_scope(uuid)','EXECUTE') as anon_scope,
    has_function_privilege('anon','public.studioflow_current_staff_can(uuid,text)','EXECUTE') as anon_can,
    has_function_privilege('anon','public.studioflow_is_assigned_branch(uuid,text)','EXECUTE') as anon_branch,
    has_function_privilege('anon','public.studioflow_staff_invite_lookup(text)','EXECUTE') as anon_lookup,
    has_function_privilege('anon','public.studioflow_staff_member_update_access(uuid,text,text[],boolean)','EXECUTE') as anon_update_access,
    has_function_privilege('anon','public.studioflow_staff_invite_create(text,text,text[],text,text,integer,boolean)','EXECUTE') as anon_create_new,
    to_regprocedure('public.studioflow_staff_invite_create(text,text,text[],text,text,integer)') is null as old_create_dropped,
    has_function_privilege('authenticated','public.studioflow_staff_member_update_access(uuid,text,text[],boolean)','EXECUTE') as auth_update_access,
    has_function_privilege('authenticated','public.studioflow_staff_scope_view(uuid)','EXECUTE') as auth_scope_view,
    has_function_privilege('anon','public.studioflow_staff_scope_view(uuid)','EXECUTE') as anon_scope_view
`);
assert.equal(hardeningGrants.anon_is_owner,false,'anon cannot probe owner identity');
assert.equal(hardeningGrants.anon_scope,false,'anon cannot read a branch scope');
assert.equal(hardeningGrants.anon_can,false,'anon cannot evaluate permissions');
assert.equal(hardeningGrants.anon_branch,false,'anon cannot test branch assignment');
assert.equal(hardeningGrants.anon_lookup,true,'the invite lookup stays the only anonymous function');
assert.equal(hardeningGrants.anon_update_access,false,'anon cannot rewrite staff access');
assert.equal(hardeningGrants.auth_update_access,true,'the owner can rewrite staff access while signed in');
assert.equal(hardeningGrants.auth_scope_view,true,'signed-in staff can read their scope summary');
assert.equal(hardeningGrants.anon_scope_view,false,'the scope summary is not anonymous');
assert.equal(hardeningGrants.anon_create_new,false,'anon cannot mint invites with the new signature either');
assert.equal(hardeningGrants.old_create_dropped,true,'the superseded invite creator cannot be called by signed-out visitors');

// An empty scope (no grant, no branch) must never match a branch.
const {rows:[failClosed]}=await db.query(`
  select
    public.studioflow_is_assigned_branch(gen_random_uuid(),'any-branch') as unknown_owner_branch,
    public.studioflow_is_assigned_branch(null,'any-branch') as null_owner_branch,
    public.studioflow_staff_scope(gen_random_uuid()) is null as scope_reads_null,
    public.studioflow_current_staff_id(gen_random_uuid()) is null as stranger_has_no_membership
`);
assert.equal(failClosed.unknown_owner_branch,false,'an unknown owner never grants a branch');
assert.equal(failClosed.null_owner_branch,false,'a null owner never grants a branch');
// A stranger has no membership, so scope returns no row (null). That is the
// same value an explicit all-branches grant produces, which is why every
// branch check pairs it with a membership test.
assert.equal(failClosed.stranger_has_no_membership,true,'a stranger is not an active staff member');
assert.equal(failClosed.scope_reads_null,true,'a stranger scope is "no row", never a branch list');

// The rewritten staff booking policy must use the helpers, not inline joins.
const {rows:staffPolicyRows}=await db.query(
  "select qual from pg_policies where schemaname='public' and tablename='studioflow_bookings' and policyname='studioflow_bookings_staff_read'"
);
assert.equal(staffPolicyRows.length,1,'the staff booking policy exists');
assert.match(staffPolicyRows[0].qual,/studioflow_is_assigned_branch/,'the staff policy enforces branch scope');
assert.match(staffPolicyRows[0].qual,/studioflow_current_staff_can/,'the staff policy enforces the role permission');

// Domain-table RLS: branch scope for branches, the public catalogue replacement
// and the staff booking write policies. Behaviour is measured in
// verify-domain-rls.mjs; here the migration is replayed so it cannot rot.
const domainRlsFile = 'supabase/migrations/20261121120000_domain_tables_fail_closed_rls.sql';
const domainRlsSql = readFileSync(domainRlsFile, 'utf8');
// The proposal's placeholder helpers must never appear in executable SQL; only
// the real `studioflow_`-prefixed functions may be called by a policy. Comments
// are stripped first, because the header documents the proposal's names as prose.
const domainRlsCode = domainRlsSql
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/--[^\n]*/g, ' ');
assert.doesNotMatch(domainRlsCode, /(?<!studioflow_)\bhas_staff_role\(/,
  'the domain migration does not call a non-existent has_staff_role()');
assert.doesNotMatch(domainRlsCode, /(?<!studioflow_)\bcan_access_branch\(/,
  'the domain migration does not call a non-existent can_access_branch()');
assert.doesNotMatch(domainRlsCode, /(?<!studioflow_)\bis_salon_owner\(/,
  'the domain migration does not call a non-existent is_salon_owner()');
assert.match(domainRlsSql, /studioflow_is_assigned_branch\(branches\.site_id, branches\.id::text\)/,
  'staff branch reads are scoped through the fail-closed helper');
assert.match(domainRlsSql, /drop policy if exists services_public_read on public\.services/,
  'the wide public services policy is replaced, not stacked on');
assert.match(domainRlsSql, /coalesce\(is_bookable_online, true\) is true/,
  'the public catalogue keeps only services a storefront would show');
// The Nexora-era domain tables are not part of the converging chain replayed
// above, so their columns are declared here (matching the live schema) to prove
// the migration applies against them.
await db.exec(`
create table if not exists public.salons (id uuid primary key, is_active boolean not null default true, deleted_at timestamptz);
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(), owner_id uuid,
  name text not null default 'Service', category text not null default 'Hair',
  description text not null default '', icon text not null default 'spa',
  price numeric(12,2) not null default 0, duration_minutes integer not null default 30,
  popular boolean not null default false, show_duration boolean not null default true,
  sort_order integer, created_at timestamptz not null default now(), updated_at timestamptz,
  salon_id uuid, price_paise bigint, is_active boolean not null default true,
  is_bookable_online boolean, is_featured boolean, display_order integer, image_url text
);
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(), site_id uuid not null, name text not null default 'Branch', is_active boolean not null default true
);
-- The fixture tables are created after the shared role setup, so the read
-- grants the live project already has are declared here (matching acl:
-- anon=r on both, authenticated=arwd on services).
grant select on public.services, public.branches, public.salons to anon, authenticated;
grant select on public.services to authenticated;
`);
await applySqlText(domainRlsSql, domainRlsFile);

const {rows:domainPolicies}=await db.query(`
  select tablename, policyname, cmd, coalesce(qual,'') || ' ' || coalesce(with_check,'') as body
  from pg_policies
  where schemaname='public'
    and tablename in ('branches','services','studioflow_services','studioflow_bookings')
  order by tablename, policyname
`);
const policyNames = domainPolicies.map(row=>row.policyname);
assert.ok(policyNames.includes('branches_select_owner_or_assigned_staff'),'staff can read their branches');
assert.ok(policyNames.includes('studioflow_services_staff_read'),'staff can read their salon catalogue');
assert.ok(policyNames.includes('studioflow_bookings_staff_write'),'staff can move a booking through its lifecycle');
assert.ok(policyNames.includes('studioflow_bookings_staff_insert'),'front desk can create a booking in scope');
// The public catalogue policy must not have been left permissive.
const publicServices = domainPolicies.find(row=>row.policyname==='services_public_read');
assert.ok(publicServices,'the public services policy exists');
assert.match(publicServices.body,/is_bookable_online/,'public services are not the old blanket is_active rule');
assert.equal(domainPolicies.filter(row=>row.policyname==='services_public_read').length,1,
  'exactly one public services policy remains (policies are OR\'d, so a leftover would widen it)');

// Column privacy on the public catalogue: anonymous reads must not carry the
// salon owner's UUID. Row policies cannot express this, so the grant is narrowed
// to explicit columns and the row policy stays installed.
const columnPrivacyFile = 'supabase/migrations/20261121130000_hide_owner_id_on_public_services.sql';
const columnPrivacySql = readFileSync(columnPrivacyFile, 'utf8');
assert.match(columnPrivacySql, /revoke select on table public\.services from anon/,
  'the table-wide anonymous grant is withdrawn before column grants');
assert.doesNotMatch(columnPrivacySql, /grant select \([^)]*owner_id/i,
  'owner_id is never granted back to anon');
// Comments are stripped first: the header explains the rejected
// `security_invoker` approach as prose.
const columnPrivacyCode = columnPrivacySql
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/--[^\n]*/g, ' ');
assert.doesNotMatch(columnPrivacyCode, /security_invoker/i,
  'no security_invoker view is shipped: it would need the very grant the migration revokes');
await applySqlText(columnPrivacySql, columnPrivacyFile);

const {rows:[columnPrivacy]}=await db.query(`
  select
    has_column_privilege('anon','public.services','owner_id','SELECT') as anon_owner_id,
    has_column_privilege('anon','public.services','name','SELECT') as anon_name,
    has_column_privilege('anon','public.services','price','SELECT') as anon_price,
    has_column_privilege('authenticated','public.services','owner_id','SELECT') as auth_owner_id,
    (select count(*)::int from pg_policies where schemaname='public' and tablename='services' and policyname='services_public_read') as public_rows_policy
`);
assert.equal(columnPrivacy.anon_owner_id,false,'anon cannot read public.services.owner_id');
assert.equal(columnPrivacy.anon_name,true,'anon keeps the catalogue columns a storefront renders');
assert.equal(columnPrivacy.anon_price,true,'anon keeps service prices');
assert.equal(columnPrivacy.auth_owner_id,true,'signed-in sessions keep owner_id for the owner workspace');
assert.equal(columnPrivacy.public_rows_policy,1,'column grants do not replace the row filter');

// Storefront privacy: owner_id must not reach anonymous readers of the
// published-site catalogue. Measured behaviourally in
// verify-storefront-privacy.mjs; replayed here so the grants cannot rot.
const storefrontViewFile='supabase/migrations/20261121130001_public_storefront_view.sql';
const storefrontViewSql=readFileSync(storefrontViewFile,'utf8');
assert.match(storefrontViewSql,/create or replace view public\.public_salon_websites/i,
  'the public storefront view is created');
assert.match(storefrontViewSql,/revoke select on public\.studioflow_websites from anon/i,
  'anonymous direct reads of the base table are withdrawn');
assert.match(storefrontViewSql,/grant select on public\.public_salon_websites to anon, authenticated/i,
  'the projection view is granted to anon so the storefront still renders');
// The view must be SECURITY DEFINER: a security_invoker view would run with the
// caller's rights and every anonymous render would fail on the revoked grant.
assert.doesNotMatch(storefrontViewSql.split('revoke select on public.studioflow_websites')[0].replace(/--[^\n]*/g,''),
  /security_invoker\s*=\s*true/i,
  'the shipped view is not security_invoker (that combination denies every anon read)');
assert.doesNotMatch(storefrontViewSql,/\bowner_id\b[^\n]*from public\.public_salon_websites/i,
  'no read path selects owner_id out of the public projection');

// The fixture tables this migration touches are Nexora-era tables created
// outside the replayed chain, so declare them as the live schema has them.
await db.exec(`
create schema if not exists studioflow_private;
create table if not exists public.studioflow_websites (
  owner_id uuid primary key,
  slug text not null unique,
  content jsonb not null default '{}'::jsonb,
  published_at timestamptz
);
alter table public.studioflow_websites enable row level security;
-- The replayed chain may already have installed this policy.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='studioflow_websites' and policyname='studioflow_websites_read') then
    create policy studioflow_websites_read on public.studioflow_websites for select to anon, authenticated using(true);
  end if;
end $$;
grant select on public.studioflow_websites to anon, authenticated;
create table if not exists public.studioflow_demo_bookings (
  id uuid primary key default gen_random_uuid(), customer_id uuid, owner_id uuid,
  request_id uuid, status text not null default 'confirmed', payload jsonb,
  created_at timestamptz not null default now()
);
alter table public.studioflow_demo_bookings enable row level security;
grant select, insert, update on public.studioflow_bookings, public.studioflow_demo_bookings to authenticated;
`);
await applySqlText(storefrontViewSql,storefrontViewFile);

const {rows:[storefrontPrivacy]}=await db.query(`
  select
    has_table_privilege('anon','public.studioflow_websites','SELECT') as anon_base_read,
    has_table_privilege('authenticated','public.studioflow_websites','SELECT') as auth_base_read,
    (select count(*)::int from information_schema.columns
       where table_schema='public' and table_name='public_salon_websites' and column_name='owner_id') as view_owner_id_columns,
    (select count(*)::int from pg_trigger
       where tgrelid='public.studioflow_bookings'::regclass and tgname='studioflow_stamp_booking_salon_slug') as bookings_slug_trigger,
    (select count(*)::int from pg_trigger
       where tgrelid='public.studioflow_demo_bookings'::regclass and tgname='studioflow_stamp_demo_booking_salon_slug') as demo_slug_trigger
`);
assert.equal(storefrontPrivacy.anon_base_read,false,'anon can no longer read public.studioflow_websites directly');
assert.equal(storefrontPrivacy.auth_base_read,true,'authenticated keeps its direct table read for owner screens');
assert.equal(storefrontPrivacy.view_owner_id_columns,0,'the public projection has no owner_id column');
assert.equal(storefrontPrivacy.bookings_slug_trigger,1,'bookings stamp the public salon slug on write');
assert.equal(storefrontPrivacy.demo_slug_trigger,1,'demo bookings stamp the public salon slug on write');

// NEXORA WhatsApp test mode: apply its private QA ledger and the follow-up
// rename migration before the live-catalog scan. The limiter is intentionally
// server-only (service_role grant only) and is not a browser-facing RPC.
await db.exec(readFileSync('supabase/migrations/20261115131821_studioflow_whatsapp_test_booking_api.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20261115145202_private_whatsapp_test_rate_limit.sql','utf8'));
// Execute the production reconciliation migration in CI; this previously
// escaped validation because only backend/ migrations were replayed.
const reconcileSchemas=['studioflow_private','studioflow_android_private'];
const {rows:reconcileSchemaRows}=await db.query(
  "select nspname as schema_name from pg_namespace where nspname=any($1::text[]) order by nspname",
  [reconcileSchemas]
);
assert.deepEqual(reconcileSchemaRows.map(row=>row.schema_name),[...reconcileSchemas].sort(),
  'Template 15 reconciliation requires studioflow_private and studioflow_android_private schemas');
const reconcileSql=readFileSync('supabase/migrations/20261117130000_reconcile_template15_multiservice_booking.sql','utf8');
assert.equal((reconcileSql.match(/\$\$/g)||[]).length%2,0,
  'Template 15 reconciliation migration must have balanced dollar-quote delimiters');
assert.match(reconcileSql,/returns jsonb language plpgsql stable security definer set search_path='' as \$\$/,
  'Template 15 migration function body must start with a valid dollar-quote delimiter');
await applySqlText(reconcileSql,'supabase/migrations/20261117130000_reconcile_template15_multiservice_booking.sql');
// Replay every tracked Tawk migration chronologically against the clean offline database.
const tawkMigrationNames = readdirSync('supabase/migrations')
  .filter(name => name.toLowerCase().includes('tawk') && name.endsWith('.sql'))
  .sort();
assert.ok(tawkMigrationNames.includes('20261118203000_add_tawk_widget_connection.sql'),
  'the final Tawk schema migration is tracked');
const tawkMigrationSql = new Map();
for (const name of tawkMigrationNames) {
  const file = 'supabase/migrations/' + name;
  const sql = readFileSync(file, 'utf8');
  tawkMigrationSql.set(name, sql);
  await applySqlText(sql, file);
}

const tawkMigration = tawkMigrationSql.get('20261118203000_add_tawk_widget_connection.sql');
const tawkLower = tawkMigration.toLowerCase();
assert.match(tawkMigration, /create schema if not exists studioflow_tawk_private/i,
  'Tawk migration explicitly creates the private schema');
assert.match(tawkMigration, /create table if not exists studioflow_tawk_private\.property_mappings/i,
  'Tawk migration explicitly creates the property_mappings prerequisite');
assert.match(tawkMigration, /create table if not exists studioflow_tawk_private\.widget_connections/i,
  'Tawk migration explicitly creates the widget_connections table');
assert.match(tawkMigration, /check\s*\(\s*lower\(tawk_widget_id\)\s*=\s*'default'\s+or\s+tawk_widget_id\s*~/i,
  'database widget constraint accepts default plus standard IDs');
assert.match(tawkMigration, /not\s*\(\s*lower\(p_widget_id\)\s*=\s*'default'/i,
  'service-role owner RPC accepts default widget IDs as well as standard IDs');
const schemaAt = tawkLower.indexOf('create schema if not exists studioflow_tawk_private');
const propertyTableAt = tawkLower.indexOf('create table if not exists studioflow_tawk_private.property_mappings');
const widgetTableAt = tawkLower.indexOf('create table if not exists studioflow_tawk_private.widget_connections');
const firstAlterAt = tawkLower.indexOf('alter table');
const firstRpcAt = tawkLower.indexOf('create or replace function');
assert.ok(schemaAt >= 0 && propertyTableAt > schemaAt && widgetTableAt > schemaAt,
  'private schema is created before both private tables');
assert.ok(firstAlterAt > propertyTableAt && firstAlterAt > widgetTableAt,
  'both private tables are created before any ALTER TABLE statement');
assert.ok(firstRpcAt > firstAlterAt,
  'both private tables are ready before public Tawk RPC creation');

const { rows: [tawkSecurity] } = await db.query(`
  select
    has_function_privilege('anon', 'public.studioflow_tawk_public_config(text)', 'EXECUTE') as anon_public_lookup,
    has_function_privilege('authenticated', 'public.studioflow_tawk_public_config(text)', 'EXECUTE') as owner_public_lookup,
    has_function_privilege('anon', 'public.studioflow_tawk_owner_connection(text,uuid,text,text,text)', 'EXECUTE') as anon_owner_manage,
    has_function_privilege('authenticated', 'public.studioflow_tawk_owner_connection(text,uuid,text,text,text)', 'EXECUTE') as owner_role_manage,
    has_function_privilege('service_role', 'public.studioflow_tawk_owner_connection(text,uuid,text,text,text)', 'EXECUTE') as service_role_manage,
    (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='studioflow_tawk_private' and c.relname='property_mappings') as property_table_rls,
    (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='studioflow_tawk_private' and c.relname='widget_connections') as widget_table_rls,
    has_schema_privilege('anon', 'studioflow_tawk_private', 'USAGE') as anon_schema_usage,
    has_schema_privilege('authenticated', 'studioflow_tawk_private', 'USAGE') as authenticated_schema_usage,
    has_schema_privilege('service_role', 'studioflow_tawk_private', 'USAGE') as service_role_schema_usage,
    has_table_privilege('anon', 'studioflow_tawk_private.property_mappings', 'SELECT') as anon_property_select,
    has_table_privilege('anon', 'studioflow_tawk_private.property_mappings', 'INSERT') as anon_property_insert,
    has_table_privilege('authenticated', 'studioflow_tawk_private.property_mappings', 'SELECT') as authenticated_property_select,
    has_table_privilege('authenticated', 'studioflow_tawk_private.property_mappings', 'INSERT') as authenticated_property_insert,
    has_table_privilege('service_role', 'studioflow_tawk_private.property_mappings', 'SELECT') as service_role_property_select,
    has_table_privilege('service_role', 'studioflow_tawk_private.property_mappings', 'INSERT') as service_role_property_insert,
    has_table_privilege('anon', 'studioflow_tawk_private.widget_connections', 'SELECT') as anon_widget_select,
    has_table_privilege('anon', 'studioflow_tawk_private.widget_connections', 'INSERT') as anon_widget_insert,
    has_table_privilege('authenticated', 'studioflow_tawk_private.widget_connections', 'SELECT') as authenticated_widget_select,
    has_table_privilege('authenticated', 'studioflow_tawk_private.widget_connections', 'INSERT') as authenticated_widget_insert,
    has_table_privilege('service_role', 'studioflow_tawk_private.widget_connections', 'SELECT') as service_role_widget_select,
    has_table_privilege('service_role', 'studioflow_tawk_private.widget_connections', 'INSERT') as service_role_widget_insert,
    (select count(*)::int from pg_constraint where conrelid='studioflow_tawk_private.widget_connections'::regclass
      and conname='tawk_widget_connections_widget_format') as widget_id_constraint_count
`);
assert.equal(tawkSecurity.anon_public_lookup, true, 'published Tawk widget lookup is public');
assert.equal(tawkSecurity.owner_public_lookup, true, 'signed-in published Tawk widget lookup is public');
assert.equal(tawkSecurity.anon_owner_manage, false, 'anonymous clients cannot manage Tawk connections');
assert.equal(tawkSecurity.owner_role_manage, false, 'authenticated clients cannot call owner management RPC');
assert.equal(tawkSecurity.service_role_manage, true, 'service_role can call owner management RPC');
assert.equal(tawkSecurity.property_table_rls, true, 'private property_mappings table has RLS enabled');
assert.equal(tawkSecurity.widget_table_rls, true, 'private widget_connections table has RLS enabled');
assert.equal(tawkSecurity.anon_schema_usage, false, 'anon has no private Tawk schema usage');
assert.equal(tawkSecurity.authenticated_schema_usage, false, 'authenticated has no private Tawk schema usage');
assert.equal(tawkSecurity.service_role_schema_usage, true, 'service_role can use the private Tawk schema');
assert.equal(tawkSecurity.anon_property_select, false, 'anon cannot read private property mappings');
assert.equal(tawkSecurity.anon_property_insert, false, 'anon cannot insert private property mappings');
assert.equal(tawkSecurity.authenticated_property_select, false, 'authenticated cannot read private property mappings');
assert.equal(tawkSecurity.authenticated_property_insert, false, 'authenticated cannot insert private property mappings');
assert.equal(tawkSecurity.service_role_property_select, true, 'service_role can read private property mappings');
assert.equal(tawkSecurity.service_role_property_insert, true, 'service_role can insert private property mappings');
assert.equal(tawkSecurity.anon_widget_select, false, 'anon cannot read private widget rows');
assert.equal(tawkSecurity.anon_widget_insert, false, 'anon cannot insert private widget rows');
assert.equal(tawkSecurity.authenticated_widget_select, false, 'authenticated cannot read private widget rows');
assert.equal(tawkSecurity.authenticated_widget_insert, false, 'authenticated cannot insert private widget rows');
assert.equal(tawkSecurity.service_role_widget_select, true, 'service_role can read private widget rows');
assert.equal(tawkSecurity.service_role_widget_insert, true, 'service_role can insert private widget rows');
assert.equal(tawkSecurity.widget_id_constraint_count, 1, 'widget ID check constraint exists exactly once');
// Audit migrations added by PR #141 and its follow-up implementation.
// Replay them in the exact applied order before scanning browser-called RPCs,
// so every client call must resolve against the same final SQL catalogue.
// The restored live Supabase table includes a request fingerprint column
// that predates this PR but is absent from the compact backend foundation
// fixture. Add it to the offline schema so the branch-aware booking replay
// exercises the same four-column idempotency contract as production.
await db.exec('alter table public.studioflow_android_requests add column if not exists fingerprint text');

// The legacy backend replay exposes this wrapper as RETURNS jsonb. The
// timestamped Supabase migration supersedes it with the typed table return
// consumed by the Edge Function, so remove only the offline fixture version.
await db.exec('drop function if exists public.studioflow_claim_refunds(integer)');
// The older backend replay declares this public browser wrapper with DEFAULT
// parameters. The applied timestamped branch migration replaces it with the
// non-defaulted signature that exists in Supabase. Drop only the offline
// fixture before replaying that replacement; production is not affected.
await db.exec('drop function if exists public.studioflow_android_book(text,jsonb,date,text,text,text,text,text,uuid)');

for (const name of [
  '20261122043650_staff_crm_branch_scope.sql',
  '20261122045445_studioflow_refund_queue_rpc.sql',
  '20261122052119_staff_salon_context_and_booking_completion.sql',
  '20261122052400_staff_inventory_membership_access.sql',
  '20261122060000_branch_service_catalogue_scope.sql',
  '20261122060500_branch_scoped_manual_crm_contacts.sql',
  '20261122061000_branch_assignment_read_models.sql',
  '20261122064000_branch_crm_contact_update_duplicate_fix.sql',
  '20261122066000_branch_scope_private_booking_guards.sql',
  '20261122067000_branch_manual_crm_email_read_projection.sql',
  '20261122068000_branch_mapping_redundant_index_cleanup.sql',
  '20261122069000_public_branch_list_published_guard.sql',
  '20261122072341_harden_active_branch_ids_acl.sql',
  '20261122072714_android_request_insert_explicit_columns.sql',
  '20261122072823_correct_android_request_fingerprint_builder.sql',
  '20261122072900_branch_service_android_wrapper_grants.sql',
]) {
  const file = 'supabase/migrations/' + name;
  await applySqlText(readFileSync(file, 'utf8'), file);
}


const {rows: [activeBranchHelperAcl]} = await db.query(`
  select p.prosecdef as security_definer,
         has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
         has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
         has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_execute,
         has_function_privilege('postgres',p.oid,'EXECUTE') as postgres_execute
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='studioflow_active_branch_ids'
`);
assert.ok(activeBranchHelperAcl, 'active branch helper must exist after SQL migrations');
assert.equal(activeBranchHelperAcl.security_definer, false,
  'active branch helper must not execute with definer privileges');
assert.equal(activeBranchHelperAcl.anon_execute, false,
  'anon must not call the internal active branch helper');
assert.equal(activeBranchHelperAcl.authenticated_execute, false,
  'authenticated users must use validated owner/staff RPCs, not call the helper directly');
assert.equal(activeBranchHelperAcl.service_role_execute, true,
  'trusted service role retains server-only helper access');
assert.equal(activeBranchHelperAcl.postgres_execute, true,
  'postgres-owned SECURITY DEFINER entry points must retain helper access');

const {rows: activeBranchCallers} = await db.query(`
  select p.proname, p.prosecdef as security_definer,
         pg_get_userbyid(p.proowner) as owner
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname = any($1::text[])
`, [[
  'studioflow_staff_invite_accept',
  'studioflow_staff_invite_create',
  'studioflow_staff_invite_lookup',
  'studioflow_staff_member_update_access',
  'studioflow_staff_scope'
]]);
assert.equal(activeBranchCallers.length, 5,
  'all five validated invite/staff call paths must remain defined');
for (const caller of activeBranchCallers) {
  assert.equal(caller.security_definer, true, caller.proname + ' stays a validated SECURITY DEFINER entry point');
  assert.equal(caller.owner, 'postgres', caller.proname + ' runs as postgres when it invokes the helper');
}
console.log('PASS active branch helper privileges and all five validated caller paths');


const {rows: [androidBookContract]} = await db.query(`
  select p.prosecdef as security_definer, pg_get_functiondef(p.oid) as definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='studioflow_android_private' and p.proname='book'
  order by p.oid desc
  limit 1
`);
assert.ok(androidBookContract, 'Android booking RPC must exist after branch migrations');
assert.equal(androidBookContract.security_definer, true,
  'Android booking RPC must retain its established SECURITY DEFINER execution boundary');
assert.match(androidBookContract.definition,
  /insert into public\.studioflow_android_requests\s*\(\s*customer_id\s*,\s*request_id\s*,\s*fingerprint\s*,\s*booking_id\s*\)\s*values/i,
  'Android booking idempotency insert must name its columns and not depend on physical table order');
assert.match(androidBookContract.definition,
  /finger\s*:=\s*md5\(jsonb_build_array\(/i,
  'Android booking request fingerprint must use PostgreSQL jsonb_build_array');
console.log('PASS Android booking idempotency insert uses explicit columns and valid fingerprint expression');

const rpcs=clientRpc(src);
const froms=[...src.matchAll(/\.from\(\s*['"`]([A-Za-z0-9_-]+)['"`]/g)].map(m=>m[1]);
const tables=froms.filter(n=>!n.includes('-'));
const bucketsUsed=[...new Set(froms.filter(n=>n.includes('-')))];
const missingRpc=[];
for(const r of rpcs){
  const hit=await db.query(`select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=$1`,[r]);
  if(!hit.rows.length)missingRpc.push(r);
}
assert.deepEqual(missingRpc,[],'Client RPCs missing from live catalog');
// Every client-referenced relation must exist and be closed by default.
// A VIEW cannot carry RLS at all, so for views the equivalent guarantee is
// asserted instead: it is a view, it is explicitly granted to the intended
// role(s), and it is not a `select *` passthrough of a table that holds
// private columns. Anything that is not a table or a view fails outright.
const missingTables=[];
const clientViews=[];
for(const t of new Set(tables)){
  const hit=await db.query(`select c.relrowsecurity, c.relkind from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=$1`,[t]);
  if(!hit.rows.length){missingTables.push(t+' (absent)');continue;}
  const {relrowsecurity,relkind}=hit.rows[0];
  if(relkind==='v'){clientViews.push(t);continue;}
  if(!relrowsecurity)missingTables.push(t+' (RLS off)');
}
assert.deepEqual(missingTables,[],'Client tables missing or without RLS');
for(const v of clientViews){
  const {rows:[view]}=await db.query(
    `select has_table_privilege('anon',$1,'SELECT') as anon_read,
            has_table_privilege('authenticated',$1,'SELECT') as auth_read,
            (select count(*)::int from information_schema.columns
               where table_schema='public' and table_name=$1 and column_name in ('owner_id','organization_id')) as private_columns
     from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relname=$1`,[v]);
  assert.ok(view,'client-referenced view exists: '+v);
  assert.ok(view.anon_read||view.auth_read,'client view is granted to a browser role: '+v);
  assert.equal(view.private_columns,0,'client view projects no owner-identifying columns: '+v);
}
assert.deepEqual(clientViews,['public_salon_websites'],
  'the only RLS-exempt client relation is the audited storefront projection view');
const buckets=await db.query(`select id from storage.buckets where id in ('studioflow-media','nexora-customer-private','ink-logos','ink-gallery','ink-artists','ink-references','ink-blog','nexora-public-assets')`);
assert.equal(buckets.rows.length,8,'StudioFlow, Template 12 and the NEXORA landing asset bucket exist');
for(const b of bucketsUsed){assert.ok(['studioflow-media','nexora-customer-private','ink-logos','ink-gallery','ink-artists','ink-references','ink-blog','nexora-public-assets'].includes(b),'Unknown bucket reference: '+b);}
const pub=await db.query(`select count(*)::int c from pg_publication_tables where pubname='supabase_realtime' and tablename in ('studioflow_websites','studioflow_templates','studioflow_bookings','studioflow_accounts','studioflow_demo_bookings','studioflow_customer_reward_claims')`);
assert.equal(pub.rows[0].c,6,'Realtime publication complete');
console.log(`PASS: live catalog serves all ${rpcs.length} client RPCs, ${new Set(tables).size} RLS tables, 8 buckets, 6 baseline realtime tables.`);

// Exercise the targeted, repeatable live catalog repair against a deliberately
// stale Template 04 row. The service catalogue and every other template must
// remain byte-for-byte equivalent at the JSON value level.
const {rows: [beforeRepair]} = await db.query(`select id,title,config,active from public.studioflow_templates where id='beauty_parlour'`);
assert.ok(beforeRepair, 'Beauty parlour template seed row exists');
const serviceCatalogue = beforeRepair.config.services;
const otherTemplateRows = await db.query(`select id,title,config,active from public.studioflow_templates where id<>'beauty_parlour' order by id`);
await db.exec(`update public.studioflow_templates
  set title='Roop Mahal Beauty Parlour & Makeover Space', config=config || jsonb_build_object(
    'paletteLabel','Rose Gold & Ivory Theme',
    'coverImageUrl','https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1200&q=80',
    'ownerPhotoUrl','https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=500&q=80',
    'themeStyle','{"heroBackground":"bg-[#fffaf6]"}'::jsonb,
    'stylists','[{"id":"bp-st-1","avatarUrl":"https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e"}]'::jsonb
  ) where id='beauty_parlour'`);
await applyFile('roop-mahal-template-sync.sql');
const {rows: [repaired]} = await db.query(`select id,title,config,active from public.studioflow_templates where id='beauty_parlour'`);
assert.equal(repaired.title,'Roop Mahal Beauty Parlour & Makeover Space');
assert.equal(repaired.config.paletteLabel,'Warm Cream, Soft Rose, Deep Maroon & Champagne Gold');
assert.equal(repaired.config.coverImageUrl,'/templates/roop-mahal/hero-bridal.webp');
assert.equal(repaired.config.ownerPhotoUrl,'/templates/roop-mahal/staff-sunita.jpg');
assert.equal(repaired.config.themeStyle.heroBackground,'bg-[#FFF8F1]');
assert.equal(repaired.config.themeStyle.badgeBg,'bg-[#D9A6A1]/25');
assert.equal(repaired.config.themeStyle.accentBg,'bg-[#6D2638]');
assert.equal(repaired.config.themeStyle.cardBorder,'border-[#C5A16B]/40');
assert.equal(repaired.config.themeStyle.heroTextColor,'text-[#352622]');
assert.deepEqual(repaired.config.services,serviceCatalogue,'Catalog sync must preserve every existing service record');
assert.deepEqual(repaired.config.stylists.map(s=>s.avatarUrl),[
  '/templates/roop-mahal/staff-sunita.jpg',
  '/templates/roop-mahal/staff-meenakshi.jpg',
  '/templates/roop-mahal/staff-pooja.jpg',
]);
assert.deepEqual(await db.query(`select id,title,config,active from public.studioflow_templates where id<>'beauty_parlour' order by id`),otherTemplateRows,'Catalog sync may not modify other templates');
const stableConfig=JSON.stringify(repaired.config);
await applyFile('roop-mahal-template-sync.sql');
const {rows: [repairedAgain]} = await db.query(`select config from public.studioflow_templates where id='beauty_parlour'`);
assert.equal(JSON.stringify(repairedAgain.config),stableConfig,'Template 04 catalog sync must be idempotent');
console.log('PASS: Template 04 SQL sync repairs legacy stock/catalog design only; services and Templates 01–03 & 05–14 remain unchanged.');
const {verifyBookingBundles}=await import('./fixtures/booking-bundles.mjs');
await verifyBookingBundles(db);
const {verifyAdminTenantIsolation}=await import('./fixtures/admin-tenant-isolation.mjs');
await verifyAdminTenantIsolation(db);
// Referral + reschedule RPC contract: exact signature, pinned search_path and
// role-scoped EXECUTE (never PUBLIC). Names asked for in review (`apply_referral`,
// `reschedule_booking`) do not exist in this schema — the fixtures file records
// which functions actually implement those flows.
const {verifyRpcContract}=await import('./fixtures/rpc-contract.mjs');
await verifyRpcContract(db);
await db.close();
