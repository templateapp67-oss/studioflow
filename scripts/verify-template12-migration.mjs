// Offline integration check for the Template 12 migration, seed, booking RPC,
// site payload, notification trigger and rollback. This is not a live Supabase test.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const siteId='11111111-1111-4111-8111-111111111111';
const db=new PGlite();
await db.exec(`
 create role anon nologin; create role authenticated nologin;
 create schema auth;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;
 create schema storage;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(bucket_id text,name text,owner uuid,metadata jsonb);
 create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
 create publication supabase_realtime;
 create table public.studioflow_accounts(user_id uuid primary key);
 create table public.studioflow_websites(owner_id uuid primary key references public.studioflow_accounts(user_id),slug text unique,content jsonb);
 create table public.studioflow_templates(id text primary key,title text,config jsonb,active boolean,updated_at timestamptz);
`);
await db.query('insert into auth.users(id,email) values($1,$2)',[siteId,'owner@example.test']);
await db.query('insert into public.studioflow_accounts(user_id) values($1)',[siteId]);
await db.query("insert into public.studioflow_websites(owner_id,slug,content) values($1,'iron-ink-test',jsonb_build_object('profile',jsonb_build_object('businessType','tattoo_studio')))",[siteId]);
const migration=readFileSync('supabase/migrations/202610300003_template12_iron_ink.sql','utf8');
await db.exec(migration);
await db.exec(migration); // idempotence
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[siteId]);
await db.query('select public.seed_template12($1)',[siteId]);
await db.query('select public.seed_template12($1)',[siteId]);
const counts=(await db.query(`select
 (select count(*)::int from public.ink_categories where site_id=$1) categories,
 (select count(*)::int from public.ink_artists where site_id=$1) artists,
 (select count(*)::int from public.ink_portfolio where site_id=$1) portfolio,
 (select count(*)::int from public.ink_faqs where site_id=$1) faqs,
 (select count(*)::int from public.ink_testimonials where site_id=$1) testimonials`,[siteId])).rows[0];
assert.deepEqual(counts,{categories:30,artists:4,portfolio:0,faqs:8,testimonials:0});
const catalog=(await db.query(`select count(*)::int total,
 count(*) filter(where is_active and starting_price>0 and duration_min>0 and length(duration_label)>0 and length(description)>=100)::int complete
 from public.ink_categories where site_id=$1`,[siteId])).rows[0];
assert.deepEqual(catalog,{total:30,complete:30},'all seeded categories need active prices, durations and detailed descriptions');
const securedTables=(await db.query(`select count(*)::int n from pg_class c join pg_namespace nsp on nsp.oid=c.relnamespace where nsp.nspname='public' and c.relname like 'ink_%' and c.relkind='r' and c.relrowsecurity`)).rows[0].n;
assert.equal(securedTables,15,'every Template 12 table must have RLS enabled');
const buckets=(await db.query(`select id,public,file_size_limit,allowed_mime_types from storage.buckets where id like 'ink-%' order by id`)).rows;
assert.deepEqual(buckets.map(bucket=>bucket.id),['ink-artists','ink-blog','ink-gallery','ink-logos','ink-references']);
assert.ok(buckets.filter(bucket=>bucket.id!=='ink-references').every(bucket=>bucket.public));
const referenceBucket=buckets.find(bucket=>bucket.id==='ink-references');
assert.equal(referenceBucket.public,false);assert.equal(Number(referenceBucket.file_size_limit),5242880);assert.deepEqual(referenceBucket.allowed_mime_types,['image/jpeg','image/png','image/webp']);
const referencePolicies=(await db.query(`select policyname,cmd,qual,with_check,roles from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'ink_references_%'`)).rows;
assert.ok(referencePolicies.some(policy=>policy.policyname==='ink_references_anon_upload'&&policy.cmd==='INSERT'&&/5242880/.test(policy.with_check)&&/image\/jpeg/.test(policy.with_check)));
const ownerReferenceRead=referencePolicies.find(policy=>policy.policyname==='ink_references_owner_read');assert.ok(ownerReferenceRead&&ownerReferenceRead.cmd==='SELECT'&&/auth.uid/.test(ownerReferenceRead.qual));assert.deepEqual(ownerReferenceRead.roles,['authenticated']);
assert.equal(referencePolicies.filter(policy=>policy.cmd==='SELECT').length,1,'private references must expose no anonymous/public read policy');
const payload=(await db.query("select public.get_template12_site_by_slug('iron-ink-test') as data")).rows[0].data;
assert.equal(payload.site_id,siteId);assert.equal(payload.categories.length,30);assert.equal(payload.categories.find(item=>item.slug==='realism-portrait').duration_label,'2–4 hr');assert.equal(payload.categories.find(item=>item.slug==='body-piercing').duration_min,38);assert.equal(payload.blog.length,3);
const artist=(await db.query('select id from public.ink_artists where site_id=$1 and is_active order by sort_order limit 1',[siteId])).rows[0];
const category=(await db.query('select id,duration_min from public.ink_categories where site_id=$1 and is_active order by sort_order limit 1',[siteId])).rows[0];
const date=(await db.query(`select (current_date+14+((1-extract(dow from current_date+14)::int+7)%7))::date as d`)).rows[0].d;
const slot=(await db.query('select * from public.get_available_slots($1,$2,$3,$4)',[siteId,artist.id,date,category.duration_min])).rows[0];
assert.ok(slot,'seeded artist should have future Monday slots');
const bookingArgs=[siteId,'Test Customer','+919876543210','test@example.test',category.id,artist.id,date,slot.start_time,'1990-01-01',5,'Forearm','Local integration check',[]];
await db.query('select * from public.create_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',bookingArgs);
const enquiryId=(await db.query('select public.submit_ink_enquiry($1,$2,$3,$4,$5) id',[siteId,'Another Customer','+919876543211','another@example.test','I would like a piercing consultation.'])).rows[0].id;assert.ok(enquiryId);
const unpaid=(await db.query('select status,deposit_paid from public.ink_bookings where site_id=$1',[siteId])).rows[0];assert.deepEqual(unpaid,{status:'pending',deposit_paid:false});
await assert.rejects(()=>db.query('select * from public.create_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',bookingArgs),/not available|already has a booking/i);
const notificationCount=(await db.query('select count(*)::int n from public.ink_notifications where site_id=$1',[siteId])).rows[0].n;
const enquiryCount=(await db.query('select count(*)::int n from public.ink_enquiries where site_id=$1',[siteId])).rows[0].n;assert.equal(enquiryCount,1);
assert.equal(notificationCount,1);
const bookingPolicy=(await db.query("select qual,with_check from pg_policies where schemaname='public' and tablename='ink_bookings' and policyname='ink_bookings_customer_read'")).rows[0];
assert.match(bookingPolicy.qual,/customer_id/);assert.doesNotMatch(bookingPolicy.qual,/phone|email/);
const publication=(await db.query("select count(*)::int n from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ink_bookings'")).rows[0].n;
assert.equal(publication,1);
await db.exec(readFileSync('supabase/rollback/202610300003_template12_iron_ink_rollback.sql','utf8'));
const remaining=(await db.query("select count(*)::int n from pg_tables where schemaname='public' and tablename like 'ink_%'")).rows[0].n;
assert.equal(remaining,0);
const registry=(await db.query("select count(*)::int n from public.studioflow_templates where id='tattoo_studio'")).rows[0].n;
assert.equal(registry,1,'rollback intentionally retains the shared template registry row');
await db.close();
console.log('PASS: Template 12 migration applies twice; seed and public bundle and 30 rich priced/duration-labelled categories are stable; booking availability, locking and notification work; customer read is customer_id-only; private storage and RLS policies are scoped; rollback removes only ink objects.');
