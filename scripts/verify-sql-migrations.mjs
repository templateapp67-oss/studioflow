// Offline proof that every backend migration applies cleanly, in dependency
// order, against a stubbed Supabase surface (auth/storage/net/pg_net).
// The harness itself lives in scripts/lib/offline-migrated-db.mjs and is
// shared with scripts/verify-bola-and-rls.mjs.
import {createOfflineMigratedDb} from './lib/offline-migrated-db.mjs';
import {readdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const {db, applied, applyFile, clientRpc, src}=await createOfflineMigratedDb();
console.log(`PASS: all ${applied.length} backend migrations apply in dependency order.`);
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
console.log(`PASS: offline migrated catalog serves all ${rpcs.length} client RPCs, ${new Set(tables).size} RLS tables, 8 buckets, 6 baseline realtime tables.`);

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
