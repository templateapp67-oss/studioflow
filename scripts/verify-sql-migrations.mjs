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
  const out=[];let cur='',i=0,tag=null,quote=false,line=false;
  while(i<sql.length){
    const two=sql.slice(i,i+2);
    if(line){cur+=sql[i];if(sql[i]==='\n')line=false;i++;continue;}
    if(two==='--'&&!quote&&!tag){line=true;cur+=two;i+=2;continue;}
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

// Replay the unified CRM migration too: its public owner RPCs and RLS
// tables are part of the live browser client contract, so omitting it makes
// this offline catalog validator report false "missing RPC" failures.
const crmMigrationPath = 'supabase/migrations/20261119070000_unified_salon_crm.sql';
const crmMigrationSql = readFileSync(crmMigrationPath, 'utf8');
await applySqlText(crmMigrationSql, crmMigrationPath);

// Replay the new staff attendance/biometric migration against the same clean
// PGlite database so all ten new tables, RLS policies and private RPC grants
// are validated before the browser catalog assertion runs.
const attendanceMigrationPath = 'supabase/migrations/20261119150000_staff_attendance_biometric.sql';
const attendanceMigrationSql = readFileSync(attendanceMigrationPath, 'utf8');
await applySqlText(attendanceMigrationSql, attendanceMigrationPath);

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
const missingTables=[];
for(const t of new Set(tables)){
  const hit=await db.query(`select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=$1`,[t]);
  if(!hit.rows.length)missingTables.push(t+' (absent)');
  else if(!hit.rows[0].relrowsecurity)missingTables.push(t+' (RLS off)');
}
assert.deepEqual(missingTables,[],'Client tables missing or without RLS');
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
