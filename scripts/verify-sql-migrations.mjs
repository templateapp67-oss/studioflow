// Offline proof that every backend migration applies cleanly, in dependency
// order, against a stubbed Supabase surface (auth/storage/net/pg_net).
import {PGlite} from '@electric-sql/pglite';
import {readdirSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const db=new PGlite();
await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
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
  return out;
};
const applyFile=async(name)=>{
  const stmts=splitSql(readFileSync('backend/'+name,'utf8')).filter(s=>!/^\s*(begin|commit)\s*;?\s*$/i.test(s));
  await db.exec('BEGIN');
  try{for(const s of stmts)await db.exec(s);await db.exec('COMMIT');}
  catch(e){try{await db.exec('ROLLBACK')}catch{}throw e;}
};
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

// Live-catalog assertions: every client-called RPC/table/bucket exists,
// RLS is on, realtime publication is complete.
const clientRpc=(src)=>{
  const names=new Set();
  for(const m of src.matchAll(/\.rpc\(\s*['"\`]([A-Za-z0-9_]+)['"\`]/g))names.add(m[1]);
  for(const n of ['studioflow_book','studioflow_validate_ref'])if(src.includes(`'${n}'`))names.add(n);
  return [...names].filter(n=>/^(studioflow_|get_my_|nexora_)/.test(n));
};
const walk=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):dir+'/'+e.name.endsWith('.tsx')||e.name.endsWith('.ts')?[dir+'/'+e.name]:[]);
const src=['src','supabase/functions','backend/functions'].flatMap(d=>{try{return walk(d)}catch{return[]}}).map(f=>readFileSync(f,'utf8')).join('\n');
const rpcs=clientRpc(src);
const froms=[...src.matchAll(/\.from\(\s*['"\`]([A-Za-z0-9_-]+)['"\`]/g)].map(m=>m[1]);
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
const buckets=await db.query(`select id from storage.buckets where id in ('studioflow-media','nexora-customer-private')`);
assert.equal(buckets.rows.length,2,'Storage buckets exist');
for(const b of bucketsUsed){assert.ok(['studioflow-media','nexora-customer-private'].includes(b),'Unknown bucket reference: '+b);}
const pub=await db.query(`select count(*)::int c from pg_publication_tables where pubname='supabase_realtime' and tablename in ('studioflow_websites','studioflow_templates','studioflow_bookings','studioflow_accounts','studioflow_demo_bookings','studioflow_customer_reward_claims')`);
assert.equal(pub.rows[0].c,6,'Realtime publication complete');
console.log(`PASS: live catalog serves all ${rpcs.length} client RPCs, ${new Set(tables).size} RLS tables, 2 buckets, 6 realtime tables.`);
await db.close();
