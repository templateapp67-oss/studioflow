// Offline PGlite integration check for shared branches, branch availability,
// branch booking guards, owner/staff RLS and Template 12 branch links.
// This deliberately does not connect to or mutate a live Supabase project.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const siteId='11111111-1111-4111-8111-111111111111';
const customerId='22222222-2222-4222-8222-222222222222';
const staffUserId='55555555-5555-4555-8555-555555555555';
const branchA='33333333-3333-4333-8333-333333333333';
const branchB='44444444-4444-4444-8444-444444444444';
const db=new PGlite();
await db.exec(`
 create role anon nologin; create role authenticated nologin; create role service_role nologin;
 create schema auth;
 create table auth.users(id uuid primary key,email text,banned_until timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;
 create schema storage;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(bucket_id text,name text,owner uuid,metadata jsonb);
 create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
 create publication supabase_realtime;
 create table public.studioflow_accounts(user_id uuid primary key references auth.users(id),draft jsonb not null default '{}'::jsonb,revision int not null default 0,created_at timestamptz default now(),updated_at timestamptz default now());
 create table public.studioflow_websites(owner_id uuid primary key references public.studioflow_accounts(user_id),slug text unique,content jsonb,published_at timestamptz default now());
 create table public.studioflow_templates(id text primary key,title text,config jsonb,active boolean,updated_at timestamptz);
 create table public.studioflow_bookings(
  id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.studioflow_accounts(user_id),customer_id uuid not null references auth.users(id),
  stylist_id text not null,starts_at timestamptz not null,ends_at timestamptz not null,status text not null,payload jsonb not null,created_at timestamptz default now(),hold_expires_at timestamptz,
  check(ends_at>starts_at));
 alter table public.studioflow_bookings enable row level security;
 grant select,insert,update,delete on public.studioflow_bookings to authenticated;
`);
await db.query('insert into auth.users(id,email) values($1,$2),($3,$4),($5,$6)',[siteId,'owner@example.test',customerId,'customer@example.test',staffUserId,'staff@example.test']);
await db.query('insert into public.studioflow_accounts(user_id,draft) values($1,$2)',[siteId,JSON.stringify({profile:{businessName:'Ink Studio',businessType:'tattoo_studio'}})]);
await db.query("insert into public.studioflow_websites(owner_id,slug,content) values($1,'iron-ink-multibranch-test',$2)",[siteId,JSON.stringify({profile:{businessType:'tattoo_studio'},services:[{id:'svc',name:'Consult',durationMinutes:60}],stylists:[{id:'staff-a',name:'Artist A',status:'Available'}]})]);
await db.exec(readFileSync('supabase/migrations/202610300003_template12_iron_ink.sql','utf8'));
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[siteId]);
await db.query('select public.seed_template12($1)',[siteId]);
await db.exec(`
 create schema if not exists studioflow_private;
 create schema if not exists studioflow_android_private;
 create function studioflow_private.availability(text,text,date,text) returns jsonb language sql stable as $$select '[]'::jsonb$$;
 create function studioflow_android_private.slots(text,jsonb,date,text) returns jsonb language sql stable as $$select '[]'::jsonb$$;
 create function studioflow_private.book_with_addons(text,jsonb) returns jsonb language sql as $$select jsonb_build_object('branchId',nullif(current_setting('studioflow.branch_id',true),''))$$;
 create function studioflow_private.coupon_book(text,jsonb) returns jsonb language sql as $$select jsonb_build_object('branchId',nullif(current_setting('studioflow.branch_id',true),''))$$;
 create function studioflow_private.owner_walk_in(jsonb) returns jsonb language sql as $$select jsonb_build_object('branchId',nullif(current_setting('studioflow.branch_id',true),''))$$;
 create function studioflow_android_private.reschedule(uuid,date,text,text) returns jsonb language sql as $$select jsonb_build_object('branchId',nullif(current_setting('studioflow.branch_id',true),''))$$;
 create function studioflow_android_private.book(text,jsonb,date,text,text,text,text,text,uuid) returns jsonb language sql as $$select jsonb_build_object('branchId',nullif(current_setting('studioflow.branch_id',true),''))$$;
`);
const migration=readFileSync('supabase/migrations/202610300004_multibranch_support.sql','utf8');
try { await db.exec(migration); } catch (error) { console.error('multibranch migration failure:', error.message, error.position, error.where, migration.slice(Number(error.position)-200,Number(error.position)+200)); throw error; }
try { await db.exec(migration); } catch (error) { console.error('multibranch rerun failure:', error.message); throw error; } // verify additive idempotence
const defaults=(await db.query('select id,name from public.branches where site_id=$1 and is_active',[siteId])).rows;
assert.equal(defaults.length,1,'existing account receives a primary branch');

const hours=(open,close)=>['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day=>({day,enabled:day!=='Sunday',fromTime:open,toTime:close}));
const accountDraft={profile:{businessName:'Ink Studio',businessType:'tattoo_studio',branches:[
 {id:branchA,name:'Central',city:'Jaipur',address:'1 Main Road',phone:'9111111111',isActive:true,operatingHours:hours('09:00','17:00')},
 {id:branchB,name:'North',city:'Jaipur',address:'2 North Road',phone:'9222222222',isActive:true,operatingHours:hours('12:00','16:00')}
]},stylists:[{id:'staff-a',name:'Artist A',status:'Available',assignedServices:['svc'],branchSchedules:[
 {branchId:branchA,schedule:hours('09:00','17:00')},{branchId:branchB,schedule:hours('12:00','16:00')}
]}]};
await db.query('update public.studioflow_accounts set draft=$2 where user_id=$1',[siteId,JSON.stringify(accountDraft)]);
await db.query('update public.studioflow_websites set content=$2 where owner_id=$1',[siteId,JSON.stringify({profile:{businessType:'tattoo_studio'},services:[{id:'svc',name:'Consult',durationMinutes:60}],stylists:[{id:'staff-a',name:'Artist A',status:'Available',assignedServices:['svc']}]})]);
const branches=(await db.query('select public.studioflow_public_branches($1) data',[ 'iron-ink-multibranch-test' ])).rows[0].data;
assert.equal(branches.length,2);
const schedule=(await db.query('select count(*)::int n from public.studioflow_staff_branch_schedules where site_id=$1 and branch_id=$2 and staff_id=$3 and is_active',[siteId,branchB,'staff-a'])).rows[0].n;
assert.equal(schedule,6,'branch-specific working days are projected from the workspace');
const monday=(await db.query(`select (current_date+7+((1-extract(dow from current_date+7)::int+7)%7))::date d`)).rows[0].d;
const sharedSlots=(await db.query('select public.studioflow_branch_available_slots($1,$2,$3,$4,$5) data',[ 'iron-ink-multibranch-test','svc',monday,'any',branchB ])).rows[0].data;
assert.ok(sharedSlots.length>0,'shared web branch slots use location and staff hours');
assert.ok(sharedSlots.every(slot=>slot.branchId===branchB&&slot.branchName==='North'));
assert.ok(sharedSlots.every(slot=>slot.time>='12:00'&&slot.time<'16:00'));
const branchASlots=(await db.query('select public.studioflow_branch_available_slots($1,$2,$3,$4,$5) data',[ 'iron-ink-multibranch-test','svc',monday,'any',branchA ])).rows[0].data;
assert.ok(branchASlots.length>0);
await db.query(`insert into public.studioflow_bookings(owner_id,customer_id,stylist_id,starts_at,ends_at,status,payload,branch_id)
 values($1,$2,'staff-a',($3::date+$4::time) at time zone 'Asia/Kolkata',($3::date+$4::time+interval '60 minutes') at time zone 'Asia/Kolkata','confirmed','{}',$5),
 ($1,$2,'staff-a',($3::date+$6::time) at time zone 'Asia/Kolkata',($3::date+$6::time+interval '60 minutes') at time zone 'Asia/Kolkata','confirmed','{}',$7)`,[siteId,customerId,monday,branchASlots[0].time,branchA,sharedSlots[0].time,branchB]);
const rescheduleId=(await db.query('select id from public.studioflow_bookings where owner_id=$1 and branch_id=$2 limit 1',[siteId,branchB])).rows[0].id;
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[customerId]);
const rescheduleRoute=(await db.query('select public.studioflow_android_reschedule($1,$2,$3,$4) data',[rescheduleId,monday,sharedSlots[0].time,'staff-a'])).rows[0].data;
assert.equal(rescheduleRoute.branchId,branchB,'rescheduling preserves the original booking branch');
const branchSpecialists=(await db.query('select public.studioflow_branch_specialists($1,$2,$3) data',['iron-ink-multibranch-test','svc',branchB])).rows[0].data;
assert.deepEqual(branchSpecialists.specialistIds,['staff-a']);
const commonRequest={branchId:branchB};
const sharedBookingRoute=(await db.query('select public.studioflow_branch_book($1,$2) data',['iron-ink-multibranch-test',JSON.stringify(commonRequest)])).rows[0].data;
assert.equal(sharedBookingRoute.branchId,branchB,'shared booking wrapper passes the selected branch into the transactional booking core');
const couponRoute=(await db.query('select public.studioflow_branch_coupon_book($1,$2) data',['iron-ink-multibranch-test',JSON.stringify(commonRequest)])).rows[0].data;
assert.equal(couponRoute.branchId,branchB,'coupon wrapper passes the selected branch into its booking core');
const androidRoute=(await db.query('select public.studioflow_branch_android_book($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) data',['iron-ink-multibranch-test','[]',monday,'12:00','staff-a','Customer','+919876543210','',null,branchB])).rows[0].data;
assert.equal(androidRoute.branchId,branchB,'customer app booking wrapper preserves branch context');
const walkInRoute=(await db.query('select public.studioflow_owner_walk_in($1) data',[JSON.stringify(commonRequest)])).rows[0].data;
assert.equal(walkInRoute.branchId,branchB,'front-desk bookings preserve branch context');

const policyNames=(await db.query("select policyname from pg_policies where schemaname='public' and tablename='branches'")).rows.map(row=>row.policyname);
assert.ok(policyNames.includes('branches_owner_manage'));assert.ok(policyNames.includes('branches_public_active_read'));
const inventoryPolicies=(await db.query("select policyname,qual,with_check from pg_policies where schemaname='public' and tablename='studioflow_branch_inventory'")).rows;
assert.ok(inventoryPolicies.some(policy=>policy.policyname==='branch_inventory_owner_manage'&&/auth.uid/.test(policy.qual)));
assert.ok(inventoryPolicies.some(policy=>policy.policyname==='branch_inventory_staff_manage'&&/branch_id/.test(policy.qual)&&/can_manage_inventory/.test(policy.qual)));
assert.ok(inventoryPolicies.every(policy=>!/(using|with_check)\s*\(\s*true\s*\)/i.test(`${policy.qual} ${policy.with_check}`)));
await db.query('insert into public.studioflow_branch_staff_members(site_id,branch_id,user_id,role,can_manage_inventory) values($1,$2,$3,$4,false)',[siteId,branchB,staffUserId,'staff']);
await db.query('insert into public.studioflow_branch_inventory(site_id,branch_id,name,sku,quantity) values($1,$2,$3,$4,5)',[siteId,branchB,'Ink caps','CAP-01']);
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[staffUserId]);
await db.exec('set role authenticated');
const deniedInventory=(await db.query("select count(*)::int n from public.studioflow_branch_inventory where sku='CAP-01'")).rows[0].n;
assert.equal(deniedInventory,0,'branch staff without inventory capability cannot read inventory');
const scopedSharedBookings=(await db.query('select count(*)::int n from public.studioflow_bookings')).rows[0].n;
assert.equal(scopedSharedBookings,1,'staff can read only shared bookings at assigned branch');
await db.exec('reset role');
await db.query('update public.studioflow_branch_staff_members set can_manage_inventory=true where site_id=$1 and branch_id=$2 and user_id=$3',[siteId,branchB,staffUserId]);
await db.exec('set role authenticated');
const allowedInventory=(await db.query("select count(*)::int n from public.studioflow_branch_inventory where sku='CAP-01'")).rows[0].n;
assert.equal(allowedInventory,1,'inventory-capable staff can see only their assigned branch inventory');
await db.exec('reset role');
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[siteId]);

const ink=(await db.query('select id from public.ink_artists where site_id=$1 and is_active order by sort_order limit 1',[siteId])).rows[0];
const inkCategory=(await db.query('select id,duration_min from public.ink_categories where site_id=$1 and is_active order by sort_order limit 1',[siteId])).rows[0];
const inkSlots=(await db.query('select * from public.get_branch_available_slots($1,$2,$3,$4,$5)',[siteId,ink.id,monday,inkCategory.duration_min,branchB])).rows;
assert.ok(inkSlots.length>0,'Template 12 branch availability falls back to existing shared schedule rows');
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[customerId]);
const branchBooking=(await db.query('select * from public.create_branch_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[siteId,branchB,'Ink Customer','+919876543210','ink@example.test',inkCategory.id,ink.id,monday,inkSlots[0].start_time,'1990-01-01'])).rows[0];
assert.equal(branchBooking.branch_id,branchB,'Template 12 booking stores the chosen branch');
const inkSlotsA=(await db.query('select * from public.get_branch_available_slots($1,$2,$3,$4,$5)',[siteId,ink.id,monday,inkCategory.duration_min,branchA])).rows;
assert.ok(inkSlotsA.length>0);
await db.query('select * from public.create_branch_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[siteId,branchA,'Other Customer','+919876543211','other@example.test',inkCategory.id,ink.id,monday,inkSlotsA[0].start_time,'1991-01-01']);
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[staffUserId]);
await db.exec('set role authenticated');
const scopedInkBookings=(await db.query('select count(*)::int n from public.ink_bookings')).rows[0].n;
assert.equal(scopedInkBookings,1,'Template 12 staff can read only bookings assigned to their branch');
await db.exec('reset role');
const payload=(await db.query('select public.get_template12_site($1) data',[siteId])).rows[0].data;
assert.equal(payload.branches.length,2,'Template 12 site payload exposes active branches');
assert.ok(payload.branches.every(branch=>branch.is_active));

const branchColumns=(await db.query("select column_name from information_schema.columns where table_schema='public' and table_name in ('studioflow_bookings','ink_bookings','ink_availability') and column_name='branch_id'")).rows;
assert.equal(branchColumns.length,3,'shared bookings, Template 12 bookings and schedules are branch-linked');
await db.exec(readFileSync('supabase/rollback/202610300004_multibranch_support_rollback.sql','utf8'));
const removed=(await db.query("select count(*)::int n from pg_tables where schemaname='public' and tablename in ('branches','studioflow_branch_inventory','studioflow_staff_branch_schedules','studioflow_branch_staff_members')")).rows[0].n;
assert.equal(removed,0,'rollback removes only new branch tables');
const restored=(await db.query("select to_regprocedure('studioflow_private.availability(text,text,date,text)') is not null and to_regprocedure('studioflow_android_private.slots(text,jsonb,date,text)') is not null as ok")).rows[0].ok;
assert.equal(restored,true,'rollback restores the original availability validators');
await db.close();
console.log('PASS: multibranch migration applies twice and rolls back; locations, weekly staff schedules, public branch slots and specialists are tenant-scoped; inventory policies enforce owner/branch permissions; Template 12 slots, booking branch and public payload retain branch identity.');
