// Offline PostgreSQL integration: never connects to or changes a real project.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const db=new PGlite();
const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const customer='33333333-3333-4333-8333-333333333333';
const branch='44444444-4444-4444-8444-444444444444';
const branch2='55555555-5555-4555-8555-555555555555';
await db.exec(`
 create role anon nologin; create role authenticated nologin; create role service_role nologin;
 create schema auth; create schema studioflow_private; create schema studioflow_android_private;
 create table auth.users(id uuid primary key,email text,banned_until timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.studioflow_accounts(user_id uuid primary key,draft jsonb);
 create table public.studioflow_websites(owner_id uuid primary key,slug text unique,content jsonb,published_at timestamptz);
 create table public.branches(id uuid primary key default gen_random_uuid(),site_id uuid,name text,city text default '',address text default '',phone text default '',is_active boolean,operating_hours jsonb,created_at timestamptz default now(),updated_at timestamptz default now(),unique(site_id,name),unique(site_id,id));
 create table public.studioflow_staff_branch_schedules(site_id uuid,branch_id uuid,staff_id text,day_of_week text,starts_at time,ends_at time,is_active boolean,updated_at timestamptz default now(),unique(site_id,branch_id,staff_id,day_of_week));
 create table public.salons(id uuid primary key,organization_id uuid,slug text,is_active boolean,deleted_at timestamptz);
 create table public.organization_members(organization_id uuid,user_id uuid,role text,status text);
 create table public.salon_hours(salon_id uuid,day_of_week smallint,opens_at time,closes_at time,is_closed boolean);
 create table public.studioflow_services(owner_id uuid,service_id text,branch_ids uuid[]);
 create table public.studioflow_bookings(id uuid primary key default gen_random_uuid(),owner_id uuid,customer_id uuid,stylist_id text,starts_at timestamptz,ends_at timestamptz,status text,payload jsonb,created_at timestamptz default now(),hold_expires_at timestamptz,branch_id uuid);
 create table public.studioflow_android_requests(customer_id uuid,request_id uuid,fingerprint text,booking_id uuid,primary key(customer_id,request_id));
 create table public.studioflow_demo_bookings(id uuid primary key default gen_random_uuid(),customer_id uuid,owner_id uuid,request_id uuid,status text default 'confirmed',payload jsonb,created_at timestamptz default now(),unique(customer_id,request_id));
 alter table public.studioflow_demo_bookings enable row level security;
 grant select on public.studioflow_demo_bookings to authenticated;
 create policy demo_read_own on public.studioflow_demo_bookings for select to authenticated using(customer_id=auth.uid());
 alter table public.studioflow_bookings enable row level security;
 grant select on public.studioflow_bookings to anon,authenticated;
 create policy owner_or_customer on public.studioflow_bookings for select to authenticated using (owner_id=auth.uid() or customer_id=auth.uid());
 create function studioflow_private.service_catalogue_available_at_branch(p_owner uuid,p_services jsonb,p_branch uuid) returns boolean language sql stable security definer set search_path='' as $$
  select not exists(select 1 from public.studioflow_services s where s.owner_id=p_owner and p_services ? s.service_id and cardinality(s.branch_ids)>0 and (p_branch is null or not p_branch=any(s.branch_ids)))
 $$;
 create function studioflow_private.booking_staff_profiles(p_slug text,p_ids jsonb) returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(s),'[]'::jsonb) from public.studioflow_websites w cross join lateral jsonb_array_elements(w.content->'stylists') s where w.slug=p_slug and p_ids ? (s->>'id')
 $$;
 create function studioflow_private.mens_service(s jsonb) returns boolean language sql immutable as $$ select coalesce(s->>'mensTemplateId'='mens_hair_studio',false) $$;
 create function studioflow_private.availability(p_slug text,p_service_id text,p_date date,p_stylist_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare selected text:=nullif(current_setting('studioflow.branch_id',true),''); begin
 if selected is not null then return studioflow_private.branch_slots(p_slug,jsonb_build_array(p_service_id),p_date,p_stylist_id,selected::uuid); end if;
 return studioflow_private.availability_unbranched(p_slug,p_service_id,p_date,p_stylist_id); end $$;
 create function public.studioflow_available_slots(p_slug text,p_service_id text,p_date date,p_stylist_id text) returns jsonb language sql stable set search_path='' as $$select studioflow_private.availability(p_slug,p_service_id,p_date,p_stylist_id)$$;
 grant usage on schema public,auth,studioflow_private,studioflow_android_private to anon,authenticated;
 grant execute on function studioflow_private.availability(text,text,date,text) to anon,authenticated;
`);
// Pre-existing rows are indistinguishable from the old trigger's fabricated
// fallback, so the repair must preserve them without treating them as proof.
const legacyOwner='99999999-9999-4999-8999-999999999999',legacyBranch='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const legacyDays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=>({day,enabled:true,fromTime:'09:00',toTime:'12:00'}));
const legacyStaff=[{id:'unknown',name:'Unknown',status:'Available'}, {id:'personal',name:'Personal',status:'Available',schedule:legacyDays}];
const legacyContent={profile:{businessType:'barber'},services:[{id:'legacy-service',name:'Service',durationMinutes:30,price:100}],stylists:legacyStaff};
await db.query('insert into auth.users(id,email) values($1,$2)',[legacyOwner,'legacy@example.test']);
await db.query('insert into public.studioflow_accounts values($1,$2)',[legacyOwner,JSON.stringify({stylists:legacyStaff})]);
await db.query("insert into public.studioflow_websites values($1,'legacy-salon',$2,now())",[legacyOwner,JSON.stringify(legacyContent)]);
await db.query('insert into public.branches(id,site_id,name,is_active,operating_hours) values($1,$2,$3,true,$4)',[legacyBranch,legacyOwner,'Legacy',JSON.stringify(legacyDays)]);
await db.query("insert into public.studioflow_staff_branch_schedules(site_id,branch_id,staff_id,day_of_week,starts_at,ends_at,is_active) values($1,$2,'unknown','Saturday','11:00','12:00',true),($1,$2,'personal','Saturday','11:00','12:00',true)",[legacyOwner,legacyBranch]);
// Add a real booking trigger after installing the migration. The private
// functions and wrappers have the same security boundary as production.
const migration=readFileSync('supabase/migrations/20261127140001_booking_slot_availability_repair.sql','utf8');
await db.exec(migration);
await db.exec(migration); // re-applicable, no data changes
// Check ACLs immediately after the migration, before fixture-only grants.
for (const role of ['anon','authenticated']) {
 for (const signature of ['studioflow_private.booking_slots(text,jsonb,date,text,uuid)','studioflow_private.booking_bundle_window_allowed(text,jsonb,date,text,time)','studioflow_private.sync_branches_from_workspace()','studioflow_private.validate_studioflow_booking_branch()','studioflow_private.guard_booking_conflict()']) {
  assert.equal((await db.query('select has_function_privilege($1,$2,$3) allowed',[role,signature,'EXECUTE'])).rows[0].allowed,false,`${role} cannot execute ${signature}`);
 }
 for (const signature of ['public.studioflow_mens_slots(text,text,date,text,uuid)','public.studioflow_branch_specialists(text,text,uuid)']) {
  assert.equal((await db.query('select has_function_privilege($1,$2,$3) allowed',[role,signature,'EXECUTE'])).rows[0].allowed,true,`${role} can read ${signature}`);
 }
}
assert.equal((await db.query("select has_function_privilege('anon','public.studioflow_branch_demo_book(text,jsonb,date,text,text,text,text,uuid,uuid)','EXECUTE') allowed")).rows[0].allowed,false,'anonymous practice writes remain blocked');
assert.equal((await db.query("select has_function_privilege('authenticated','public.studioflow_branch_demo_book(text,jsonb,date,text,text,text,text,uuid,uuid)','EXECUTE') allowed")).rows[0].allowed,true,'authenticated practice writes use the guarded wrapper');
// Install the real pre-existing add-on wrapper, not a replacement test double.
const addonsSource=readFileSync('supabase/migrations/20261117130000_reconcile_template15_multiservice_booking.sql','utf8');
const addonsDefinition=addonsSource.match(/create or replace function studioflow_private\.book_with_addons\(p_slug text,p_request jsonb\)[\s\S]*?end \$\$;/)?.[0];
assert.ok(addonsDefinition,'existing add-on wrapper definition must be present');
await db.exec(addonsDefinition);
await db.exec(`
 create function public.studioflow_android_slots(p_slug text,p_services jsonb,p_date date,p_stylist text) returns jsonb language sql stable set search_path='' as $$select studioflow_android_private.slots(p_slug,p_services,p_date,p_stylist)$$;
 create function public.studioflow_branch_available_slots(p_slug text,p_service_id text,p_date date,p_stylist text,p_branch uuid) returns jsonb language sql stable set search_path='' as $$select studioflow_private.branch_slots(p_slug,jsonb_build_array(p_service_id),p_date,p_stylist,p_branch)$$;
 create function public.studioflow_branch_android_slots(p_slug text,p_services jsonb,p_date date,p_stylist text,p_branch uuid) returns jsonb language sql stable set search_path='' as $$select coalesce(jsonb_agg(x order by x->>'time'),'[]'::jsonb) from jsonb_array_elements(studioflow_private.branch_slots(p_slug,p_services,p_date,p_stylist,p_branch)) x where (x->>'available')::boolean$$;
 grant execute on function studioflow_private.branch_slots(text,jsonb,date,text,uuid),studioflow_android_private.slots(text,jsonb,date,text),public.studioflow_branch_specialists(text,text,uuid),public.studioflow_mens_slots(text,text,date,text,uuid) to anon,authenticated;
 create trigger booking_branch_guard before insert or update of branch_id,stylist_id,starts_at,ends_at on public.studioflow_bookings for each row execute function studioflow_private.validate_studioflow_booking_branch();
 create function public.test_branch_book(p_slug text,p_request jsonb) returns jsonb language plpgsql set search_path='' as $$ begin perform set_config('studioflow.branch_id',p_request->>'branchId',true); return studioflow_private.book(p_slug,p_request); end $$;
 create function public.test_android_book(p_slug text,p_services jsonb,p_date date,p_time text,p_stylist text,p_name text,p_phone text,p_instructions text,p_request uuid) returns jsonb language sql set search_path='' as $$select studioflow_android_private.book(p_slug,p_services,p_date,p_time,p_stylist,p_name,p_phone,p_instructions,p_request)$$;
 grant execute on function studioflow_private.book(text,jsonb),studioflow_android_private.book(text,jsonb,date,text,text,text,text,text,uuid) to authenticated;
`);
// Replace the fixture's thin slot wrappers with the actual checked-in public
// wrappers, and install the real branch/Android booking entry points. The
// synthetic private tables and auth/RLS setup above remain disposable.
const branchSource=readFileSync('supabase/migrations/20261114115141_studioflow_branch_android_slots.sql','utf8');
for(const name of ['studioflow_branch_available_slots','studioflow_branch_android_slots','studioflow_branch_book','studioflow_branch_android_book']){
 const definition=branchSource.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$;`,'i'))?.[0];
 assert.ok(definition,`${name} definition must exist`);await db.exec(definition);
}
const androidSource=readFileSync('supabase/migrations/20261122065342_branch_scope_private_booking_guards.sql','utf8');
for(const name of ['studioflow_android_slots','studioflow_android_book']){
 const definition=androidSource.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$function\\$\\s*;`,'i'))?.[0];
 assert.ok(definition,`${name} definition must exist`);await db.exec(definition);
}
const bookWrapper=addonsSource.match(/create or replace function public\.studioflow_book\(p_slug text,p_request jsonb\)[\s\S]*?\$\$;/)?.[0];
assert.ok(bookWrapper,'public website booking wrapper must exist');await db.exec(bookWrapper);
const mensQuote=[...addonsSource.matchAll(/create or replace function public\.studioflow_mens_coupon_quote\(p_slug text,p_services jsonb,p_code text\)[\s\S]*?end \$\$;/g)].at(-1)?.[0];
assert.ok(mensQuote,'men’s coupon quote must exist');await db.exec(mensQuote);
await db.query('insert into auth.users(id,email) values($1,$2),($3,$4),($5,$6)',[owner,'owner@example.test',other,'other@example.test',customer,'customer@example.test']);
const services=[{id:'thread',name:'Threading',durationMinutes:25,price:300},{id:'shave',name:'Shave',durationMinutes:30,price:200},{id:'old',name:'Archived',durationMinutes:30,price:100,status:'archived'},{id:'invalid',name:'Invalid duration',durationMinutes:'oops',price:50}];
const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=>({day,enabled:true,fromTime:'09:00',toTime:'12:00'}));
const staff=[{id:'stale',name:'Minakshi',status:'Available',schedule:days,assignedServices:['removed-template-1','old']},{id:'restricted',name:'Ram',status:'Available',schedule:days,assignedServices:['shave','removed-template-2']},{id:'qualified',name:'Qualified',status:'Available',schedule:days,assignedServices:['thread','shave']}];
const content={profile:{businessName:'Test Salon',businessType:'barber',bookingRules:{leadHours:0}},services,stylists:staff};
await db.query('insert into public.studioflow_accounts values($1,$2),($3,$4)',[owner,JSON.stringify({stylists:staff,extras:{bookingLeadHours:0}}),other,JSON.stringify({stylists:staff})]);
await db.query("insert into public.studioflow_websites values($1,'salon-one',$2,now()),($3,'other-salon',$4,now())",[owner,JSON.stringify(content),other,JSON.stringify(content)]);
await db.query('insert into public.branches(id,site_id,name,is_active,operating_hours) values($1,$2,$3,true,$4)',[branch,owner,'Main',JSON.stringify(days)]);
const date=(await db.query("select ((now() at time zone 'Asia/Kolkata')::date+7+((6-extract(dow from (now() at time zone 'Asia/Kolkata')::date+7)::int+7)%7))::text d")).rows[0].d;
const get=async(sql,args)=> (await db.query(sql,args)).rows[0].data;
const branchWeb=(stylist='any',svc='thread')=>get('select public.studioflow_branch_available_slots($1,$2,$3,$4,$5) data',['salon-one',svc,date,stylist,branch]);
const branchApp=(stylist='any',ids=['thread'])=>get('select public.studioflow_branch_android_slots($1,$2,$3,$4,$5) data',['salon-one',JSON.stringify(ids),date,stylist,branch]);
const available=rows=>rows.filter(s=>s.available);
// Equal slugs in the independent normalized catalogue must never borrow a
// different owner's business hours. Matching active organization membership is
// required before the hours can influence this website's availability.
const hoursSalonId=crypto.randomUUID(),hoursOrgId=crypto.randomUUID();
await db.query("insert into public.salons(id,organization_id,slug,is_active) values($1,$2,'salon-one',true)",[hoursSalonId,hoursOrgId]);
await db.query("insert into public.salon_hours values($1,6,'10:00','11:00',false)",[hoursSalonId]);
await db.query("insert into public.organization_members values($1,$2,'owner','active')",[hoursOrgId,other]);
let hoursWindow=(await db.query('select * from studioflow_private.booking_business_window($1,null,$2)',[owner,date])).rows[0];
assert.equal(hoursWindow.configured,false,'a foreign tenant with the same slug cannot set business hours');
await db.query("insert into public.organization_members values($1,$2,'owner','active')",[hoursOrgId,owner]);
hoursWindow=(await db.query('select * from studioflow_private.booking_business_window($1,null,$2)',[owner,date])).rows[0];
assert.equal(hoursWindow.configured,true,'same-owner normalized hours are recognized');
assert.equal(hoursWindow.opens_at,'10:00:00');
await db.query('delete from public.salon_hours where salon_id=$1',[hoursSalonId]);
await db.query('delete from public.organization_members where organization_id=$1',[hoursOrgId]);
await db.query('delete from public.salons where id=$1',[hoursSalonId]);
const legacySlots=(staffId)=>get('select public.studioflow_branch_android_slots($1,$2,$3,$4,$5) data',['legacy-salon','["legacy-service"]',date,staffId,legacyBranch]);
assert.equal(await get("select count(*)::int data from public.studioflow_staff_branch_schedules where site_id=$1 and schedule_source='legacy'",[legacyOwner]),2,'migration preserves and marks old rows');
assert.deepEqual(await legacySlots('unknown'),[],'unattributed legacy rows do not invent a shift');
assert.equal((await legacySlots('personal'))[0].time,'09:00','the saved personal schedule, not a fabricated legacy projection, is used');
await db.query("update public.studioflow_staff_branch_schedules set starts_at='10:00',ends_at='12:00' where site_id=$1 and staff_id='unknown'",[legacyOwner]);
assert.equal(await get("select schedule_source data from public.studioflow_staff_branch_schedules where site_id=$1 and staff_id='unknown'",[legacyOwner]),'direct','an explicit direct edit confirms a shift');
assert.equal((await legacySlots('unknown'))[0].time,'10:00');

// The full optional normalized RPC and its distinct UUID catalogue are tested
// against the production-shaped fixture in verify-normalized-booking-ids.mjs.

// Actual guest role, not a privileged test caller. No branch-shift rows: a
// single location uses the explicitly saved personal schedule, intersected
// with branch hours. Stale-only assignments recover, while valid restrictions remain.
await db.exec('set role anon');
let specialists=await get('select public.studioflow_branch_specialists($1,$2,$3) data',['salon-one','thread',branch]);
assert.deepEqual(specialists.specialistIds,['stale','qualified']);
let app=await branchApp(),web=available(await branchWeb());
assert.deepEqual(app,web,'directory and website return the same slots');
assert.ok(app.length>0,'guest receives live slots for an eligible specialist using branch hours');
assert.ok(app.every(s=>['qualified','stale'].includes(s.stylistId)&&s.branchId===branch));
assert.ok((await branchApp('qualified')).length>0,'specific professional also works');
assert.ok((await branchApp('stale')).length>0,'deleted/archived-only assignments no longer lock out active services');
assert.ok((await branchApp('stale',['thread','shave'])).length>0,'stale-only assignments recover for bundles');
assert.equal((await branchApp('restricted')).length,0,'a mixed valid/stale restriction is preserved');
assert.ok((await branchApp('restricted',['shave'])).length>0,'a valid assigned service remains eligible');
assert.deepEqual(await branchApp('stale',['old']),[],'archived services cannot be booked');
assert.deepEqual((await get('select public.studioflow_branch_specialists($1,$2,$3) data',['salon-one','old',branch])).specialistIds,[],'archived service has no specialists');
assert.equal((await get('select count(*)::int data from public.studioflow_bookings',[])),0,'anon cannot read any appointment rows through RLS');
await assert.rejects(db.query('select studioflow_private.booking_slots($1,$2,$3,$4,$5)',['salon-one','["thread"]',date,'any',branch]),/permission denied/i,'private engine not directly executable by anon');
await db.exec('reset role');

// A new, valid owner assignment may exist only in the draft until publication.
// Do not mistake it for a deleted ID and broaden access to the published menu.
const draftOnly={id:'new-draft-service',name:'Draft only',durationMinutes:30,price:100};
await db.query('update public.studioflow_accounts set draft=$2 where user_id=$1',[owner,JSON.stringify({services:[draftOnly],stylists:staff.map(s=>s.id==='stale'?{...s,assignedServices:[draftOnly.id]}:s),extras:{bookingLeadHours:0}})]);
assert.deepEqual(await branchApp('stale'),[],'an active draft-only assignment is still a restriction');
assert.ok(!(await get('select studioflow_private.booking_specialists($1,$2) data',['salon-one','thread'])).specialistIds.includes('stale'));
await db.query('update public.studioflow_accounts set draft=$2 where user_id=$1',[owner,JSON.stringify({stylists:staff,extras:{bookingLeadHours:0}})]);

// 25 minutes fits a 30-minute grid; total bundle duration is checked against
// actual window end, not rounded up or truncated to an interval.
await db.query('update public.branches set operating_hours=$2 where id=$1',[branch,JSON.stringify(days.map(d=>({...d,toTime:'10:00'})))]);
app=await branchApp();assert.deepEqual(app.map(s=>s.time),['09:00','09:30']);
assert.deepEqual((await branchApp('qualified',['thread','shave'])).map(s=>s.time),['09:00']);
assert.deepEqual(await branchApp('qualified',['invalid']),[],'invalid duration fails closed, not SQL error');
assert.deepEqual(await branchApp('any',['thread','thread']),[],'duplicate IDs fail closed');

// Numeric and abbreviated weekdays work for both salon hours and shifts.
await db.query('insert into public.studioflow_staff_branch_schedules(site_id,branch_id,staff_id,day_of_week,starts_at,ends_at,is_active) values($1,$2,$3,$4,$5,$6,true)',[owner,branch,'qualified','6','09:30','10:00']);
assert.deepEqual((await branchApp('qualified')).map(s=>s.time),['09:30']);
await db.query('update public.studioflow_staff_branch_schedules set is_active=false where site_id=$1',[owner]);
assert.deepEqual(await branchApp('qualified'),[],'explicit day off never falls back');
await db.query('delete from public.studioflow_staff_branch_schedules where site_id=$1',[owner]);
await db.query('update public.branches set operating_hours=$2 where id=$1',[branch,JSON.stringify(days.map(d=>d.day==='Sat'?{...d,enabled:false}:d))]);
assert.deepEqual(await branchApp(),[],'explicit salon closing day never falls back');

// Hours alone never assert an unknown individual's availability.
await db.query('update public.studioflow_accounts set draft=$2 where user_id=$1',[owner,JSON.stringify({stylists:staff.map(s=>s.id==='qualified'?{...s,schedule:[]}:s),extras:{bookingLeadHours:0}})]);
assert.deepEqual(await branchApp('qualified'),[],'missing staff schedule fails closed');
await db.query('update public.studioflow_accounts set draft=$2 where user_id=$1',[owner,JSON.stringify({stylists:staff.map(s=>s.id==='qualified'?{...s,branchSchedules:[]}:s),extras:{bookingLeadHours:0}})]);
assert.deepEqual(await branchApp('qualified'),[],'an explicitly empty branch assignment does not fall back to personal hours');
await db.query('update public.studioflow_accounts set draft=$2 where user_id=$1',[owner,JSON.stringify({stylists:staff,extras:{bookingLeadHours:0}})]);

// Staff explicitly assigned elsewhere cannot be invented at another branch.
await db.query('update public.branches set operating_hours=$2 where id=$1',[branch,JSON.stringify(days)]);
await db.query('insert into public.branches(id,site_id,name,is_active,operating_hours) values($1,$2,$3,true,$4)',[branch2,owner,'Second',JSON.stringify(days)]);
assert.deepEqual(await branchApp('qualified'),[],'personal hours do not assign staff to several branches');
await db.query('insert into public.studioflow_staff_branch_schedules(site_id,branch_id,staff_id,day_of_week,starts_at,ends_at,is_active) values($1,$2,$3,$4,$5,$6,true)',[owner,branch2,'qualified','Saturday','09:00','12:00']);
assert.deepEqual(await branchApp('qualified'),[],'staff scheduled at a different branch cannot use fallback');
assert.deepEqual((await get('select public.studioflow_branch_specialists($1,$2,$3) data',['salon-one','thread',branch])).specialistIds,[]);
assert.deepEqual(await get('select public.studioflow_android_slots($1,$2,$3,$4) data',['salon-one','["thread"]',date,'any']),[],'multiple locations require an explicit choice');
await db.query('delete from public.studioflow_staff_branch_schedules where site_id=$1',[owner]);
await db.query('delete from public.branches where id=$1',[branch2]);

// Overlap is evaluated in IST and across locations; expired pending holds no
// longer block availability, while active holds and confirmations do.
const insertBooking=async(time,status,hold)=>db.query(`insert into public.studioflow_bookings(owner_id,customer_id,stylist_id,starts_at,ends_at,status,hold_expires_at,payload,branch_id)
 values($1,$2,'qualified',($3::date+$4::time) at time zone 'Asia/Kolkata',($3::date+$4::time+interval '25 minutes') at time zone 'Asia/Kolkata',$5,$6,'{}',$7)`,[owner,customer,date,time,status,hold,branch]);
await insertBooking('09:00','confirmed',null);
await insertBooking('09:30','pending',new Date(Date.now()+600000).toISOString());
await insertBooking('10:00','pending',new Date(Date.now()-600000).toISOString());
app=await branchApp('qualified');
assert.ok(!app.some(s=>s.time==='09:00'||s.time==='09:30'));
assert.ok(app.some(s=>s.time==='10:00'),'expired pending hold does not block a slot');
await db.exec("set timezone='Pacific/Honolulu'");
assert.ok((await branchApp('qualified')).some(s=>s.time==='10:00'),'database session timezone does not alter IST slot dates');
await db.exec("set timezone='UTC'");

// Booking uses exactly the same rules and trigger; lock/recheck rejects a
// second reservation for the first slot and retains the server's price/duration.
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[customer]);
const request={serviceId:'thread',stylistId:'qualified',date,time:'10:00',branchId:branch,clientName:'Test Customer',clientPhone:'9876543210'};
const booked=await get('select public.test_branch_book($1,$2) data',['salon-one',JSON.stringify(request)]);
assert.equal(booked.branchId,branch);assert.equal(booked.serviceId,'thread');assert.equal(booked.servicePrice,300);
await assert.rejects(db.query('select public.test_branch_book($1,$2)',['salon-one',JSON.stringify(request)]),/unavailable|booked/i);
const androidKey=crypto.randomUUID();
const androidArgs=['salon-one','["thread"]',date,'10:30','qualified','Test Customer','9876543210','',androidKey];
const androidSql='select public.test_android_book($1,$2,$3,$4,$5,$6,$7,$8,$9) data';
const android=await get(androidSql,androidArgs);
assert.equal(android.payload.branchId,branch);assert.equal(android.payload.durationMinutes,25);assert.equal(android.payload.servicePrice,300);
assert.equal((await get(androidSql,androidArgs)).id,android.id,'a retry returns the same real booking');
await db.query('insert into public.branches(id,site_id,name,is_active,operating_hours) values($1,$2,$3,true,$4)',[branch2,owner,'Second',JSON.stringify(days)]);
await db.query("select set_config('studioflow.branch_id',$1,false)",[branch2]);
await assert.rejects(db.query(androidSql,androidArgs),/request changed/i,'a retry cannot change its branch');
await db.query("select set_config('studioflow.branch_id','',false)");
await assert.rejects(db.query(androidSql,androidArgs),/choose a location/i,'multi-branch retry needs an explicit location');
await db.query('delete from public.branches where id=$1',[branch2]);

// Practice bookings are authenticated, isolated, unpaid and idempotent for the
// exact selection. A request ID cannot silently return a different branch/slot.
const demoKey=crypto.randomUUID();
const demoArgs=['salon-one','["thread"]',date,'11:00','qualified','Test Customer','9876543210',demoKey,branch];
const demoSql='select public.studioflow_branch_demo_book($1,$2,$3,$4,$5,$6,$7,$8,$9) data';
await db.exec('set role anon');
await assert.rejects(db.query(demoSql,demoArgs),/permission denied/i,'anonymous callers cannot save practice bookings');
await db.exec('set role authenticated');
const demo=await get(demoSql,demoArgs),retry=await get(demoSql,demoArgs);
assert.equal(demo.id,retry.id);assert.equal(demo.customer_id,customer);assert.equal(demo.owner_id,owner);
assert.equal(demo.payload.branchId,branch);assert.equal(demo.payload.serviceId,'thread');assert.equal(demo.payload.durationMinutes,25);
assert.equal(demo.payload.listPrice,300);assert.equal(demo.payload.servicePrice,0);assert.equal(demo.payload.paymentStatus,'demo_no_payment');
await assert.rejects(db.query(demoSql,[...demoArgs.slice(0,3),'11:30',...demoArgs.slice(4)]),/request changed/i);
await assert.rejects(db.query(demoSql,[...demoArgs.slice(0,8),branch2]),/request changed/i);
await assert.rejects(db.query(demoSql,['other-salon',...demoArgs.slice(1,7),crypto.randomUUID(),branch]),/available/i,'a different salon cannot use this branch');
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
assert.equal(await get('select count(*)::int data from public.studioflow_demo_bookings',[]),0,'another customer cannot read demo receipts');
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[customer]);
assert.equal(await get('select count(*)::int data from public.studioflow_demo_bookings',[]),1);
await db.exec('reset role');
assert.equal(await get('select count(*)::int data from public.studioflow_bookings where owner_id=$1',[owner]),5,'demo does not create or block a real booking');

// Another tenant's reservations and private data must never influence/read the first.
assert.deepEqual(await get('select public.studioflow_branch_android_slots($1,$2,$3,$4,$5) data',['other-salon','["thread"]',date,'any',branch]),[]);

// The actual public website and Android wrappers must preserve branch and
// bundle identity, and recompute price/duration on the server.
const wrapperOwner=crypto.randomUUID(),wrapperBranch=crypto.randomUUID();
await db.query('insert into auth.users(id,email) values($1,$2)',[wrapperOwner,'wrapper@example.test']);
await db.query('insert into public.studioflow_accounts values($1,$2)',[wrapperOwner,JSON.stringify({services,stylists:[staff[2]],extras:{bookingLeadHours:0}})]);
await db.query("insert into public.studioflow_websites values($1,'wrapper-salon',$2,now())",[wrapperOwner,JSON.stringify({...content,stylists:[staff[2]]})]);
await db.query('insert into public.branches(id,site_id,name,is_active,operating_hours) values($1,$2,$3,true,$4)',[wrapperBranch,wrapperOwner,'Main',JSON.stringify(days)]);
await db.exec('set role anon');
const bundleSlots=await get('select public.studioflow_branch_android_slots($1,$2,$3,$4,$5) data',['wrapper-salon','["thread","shave"]',date,'qualified',wrapperBranch]);
assert.ok(bundleSlots.some(slot=>slot.time==='09:00'),'guest sees the real branch Android wrapper');
await db.exec('reset role; set role authenticated');
const bundleRequest={serviceId:'thread',serviceIds:['thread','shave'],addOnIds:['shave'],stylistId:'qualified',date,time:'09:00',branchId:wrapperBranch,clientName:'Test Customer',clientPhone:'9876543210',requestId:crypto.randomUUID(),servicePrice:1};
const websiteBundle=await get('select public.studioflow_branch_book($1,$2) data',['wrapper-salon',JSON.stringify(bundleRequest)]);
assert.equal(websiteBundle.branchId,wrapperBranch);assert.equal(websiteBundle.servicePrice,500);assert.equal(websiteBundle.durationMinutes,55);
assert.deepEqual(websiteBundle.serviceIds,['thread','shave']);
assert.equal((await get('select public.studioflow_branch_book($1,$2) data',['wrapper-salon',JSON.stringify(bundleRequest)])).id,websiteBundle.id,'real bundle wrapper retry returns the original receipt');
const realAndroid=await get('select public.studioflow_android_book($1,$2,$3,$4,$5,$6,$7,$8,$9) data',['wrapper-salon','["thread"]',date,'10:00','qualified','Test Customer','9876543210','',crypto.randomUUID()]);
assert.equal(realAndroid.payload.branchId,wrapperBranch);assert.equal(realAndroid.payload.servicePrice,300,'real Android wrapper resolves the single branch and server price');
await assert.rejects(db.query('select public.studioflow_branch_android_book($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',['wrapper-salon','["thread"]',date,'10:30','qualified','Test Customer','9876543210','',crypto.randomUUID(),branch]),/location is unavailable/i,'real branch wrapper cannot use another tenant location');
await db.exec('reset role');

// Exercise Template 15 single services, bundles and its real coupon quote with
// synthetic users only; retries must not change branch or specialist.
const mensOwner=crypto.randomUUID(),mensBranch=crypto.randomUUID(),mensBranch2=crypto.randomUUID();
const mensStaff=[{id:'barber-a',name:'Barber A',role:'Haircut Specialist',businessType:'mens_hair_studio',mensMaleOnly:true,status:'Available',schedule:days,assignedServices:['mens-cut','mens-colour']},{id:'barber-b',name:'Barber B',role:'Haircut Specialist',businessType:'mens_hair_studio',mensMaleOnly:true,status:'Available',schedule:days,assignedServices:['mens-cut','mens-colour']}];
const mensMenu=[{id:'mens-cut',name:'Haircut',durationMinutes:30,price:450,mensTemplateId:'mens_hair_studio'},{id:'mens-colour',name:'Hair colour',durationMinutes:30,price:550,mensTemplateId:'mens_hair_studio'}];
await db.query('insert into auth.users(id,email) values($1,$2)',[mensOwner,'mens@example.test']);
await db.query('insert into public.studioflow_accounts values($1,$2)',[mensOwner,JSON.stringify({profile:{mensStudio:{hours:days}},services:mensMenu,stylists:mensStaff,extras:{bookingLeadHours:0}})]);
const mensOffer={id:'offer-10',code:'CUT10',title:'Ten percent',active:true,approved:true,type:'percent',discount:10,serviceIds:['mens-cut','mens-colour']};
await db.query("insert into public.studioflow_websites values($1,'mens-salon',$2,now())",[mensOwner,JSON.stringify({profile:{businessType:'mens_hair_studio',mensStudio:{offers:[mensOffer]}},services:mensMenu,stylists:mensStaff})]);
await db.query('insert into public.branches(id,site_id,name,is_active,operating_hours) values($1,$2,$3,true,$4)',[mensBranch,mensOwner,'First',JSON.stringify(days)]);
const mensRequest={serviceId:'mens-cut',serviceIds:['mens-cut'],stylistId:'barber-a',date,time:'09:00',branchId:mensBranch,clientName:'Test Customer',clientPhone:'9876543210',requestId:crypto.randomUUID()};
const mensSql='select public.studioflow_mens_book($1,$2) data';
await db.exec('set role authenticated');
const mensBooked=await get(mensSql,['mens-salon',JSON.stringify(mensRequest)]);
assert.equal(mensBooked.branchId,mensBranch);assert.equal(mensBooked.servicePrice,450);
assert.equal((await get(mensSql,['mens-salon',JSON.stringify(mensRequest)])).id,mensBooked.id,'identical Template 15 retry returns its original reservation');
await assert.rejects(db.query(mensSql,['mens-salon',JSON.stringify({...mensRequest,stylistId:'barber-b'})]),/request changed/i,'Template 15 retry cannot change specialist');
const mensBundleIds=['mens-cut','mens-colour'];
const quote=await get('select public.studioflow_mens_coupon_quote($1,$2,$3) data',['mens-salon',JSON.stringify(mensBundleIds),'CUT10']);
assert.equal(quote.originalPrice,1000);assert.equal(quote.finalPrice,900);
const mensBundle={...mensRequest,serviceIds:mensBundleIds,addOnIds:['mens-colour'],stylistId:'barber-b',time:'10:00',requestId:crypto.randomUUID(),couponCode:'CUT10',couponExpectedTotal:900};
const mensDiscounted=await get(mensSql,['mens-salon',JSON.stringify(mensBundle)]);
assert.equal(mensDiscounted.branchId,mensBranch);assert.equal(mensDiscounted.durationMinutes,60);assert.equal(mensDiscounted.servicePrice,900);assert.equal(mensDiscounted.originalPrice,1000);
assert.equal((await get(mensSql,['mens-salon',JSON.stringify(mensBundle)])).id,mensDiscounted.id,'coupon bundle retry is idempotent');
await db.exec('reset role');
await db.query('insert into public.branches(id,site_id,name,is_active,operating_hours) values($1,$2,$3,true,$4)',[mensBranch2,mensOwner,'Second',JSON.stringify(days)]);
await db.exec('set role authenticated');
await assert.rejects(db.query(mensSql,['mens-salon',JSON.stringify({...mensRequest,branchId:mensBranch2})]),/request changed/i,'Template 15 retry cannot change branch');
await assert.rejects(db.query(mensSql,['mens-salon',JSON.stringify({...mensRequest,branchId:undefined})]),/choose a location/i,'Template 15 multi-branch retry needs a location');
await assert.rejects(db.query(mensSql,['mens-salon',JSON.stringify({...mensRequest,branchId:branch})]),/location is unavailable/i,'Template 15 cannot use another tenant location');
await db.exec('reset role');

// Exercise the real workspace projection trigger, including canonical IDs and
// abbreviated weekdays. Saving one branch must not manufacture shifts at
// every other location or copy operating hours into an empty personal schedule.
await db.exec('create trigger sync_workspace after insert or update of draft on public.studioflow_accounts for each row execute function studioflow_private.sync_branches_from_workspace()');
const syncOwner='66666666-6666-4666-8666-666666666666',syncA='77777777-7777-4777-8777-777777777777',syncB='88888888-8888-4888-8888-888888888888';
await db.query('insert into auth.users(id,email) values($1,$2)',[syncOwner,'sync@example.test']);
const syncDraft={profile:{businessName:'Two branches',branches:[{id:syncA,name:'First',isActive:true,operatingHours:days},{id:syncB,name:'Second',isActive:true,operatingHours:days}]},stylists:[{id:'worker',name:'Worker',schedule:days}]};
await db.query('insert into public.studioflow_accounts values($1,$2)',[syncOwner,JSON.stringify(syncDraft)]);
assert.equal(await get('select count(*)::int data from public.studioflow_staff_branch_schedules where site_id=$1',[syncOwner]),0,'personal hours do not create multi-branch shifts');
await db.query("insert into public.studioflow_staff_branch_schedules(site_id,branch_id,staff_id,day_of_week,starts_at,ends_at,is_active) values($1,$2,'worker','Saturday','10:00','12:00',true)",[syncOwner,syncA]);
await db.query('update public.branches set operating_hours=$2 where id=$1',[syncA,JSON.stringify([{day:'Sat',enabled:true,fromTime:'10:00',toTime:'15:00'}])]);
syncDraft.profile.tagline='An unrelated workspace change';
await db.query('update public.studioflow_accounts set draft=$2 where user_id=$1',[syncOwner,JSON.stringify(syncDraft)]);
assert.equal(await get("select count(*)::int data from public.studioflow_staff_branch_schedules where site_id=$1 and branch_id=$2 and schedule_source='direct'",[syncOwner,syncA]),1,'unrelated saves retain direct shifts');
assert.equal((await get('select operating_hours data from public.branches where id=$1',[syncA]))[0].fromTime,'10:00','unrelated saves retain directly managed branch hours');
syncDraft.stylists[0].branchSchedules=[{branchId:syncB,schedule:[{day:'Sat',enabled:true,fromTime:'09:30',toTime:'11:00'}]}];
await db.query('update public.studioflow_accounts set draft=$2 where user_id=$1',[syncOwner,JSON.stringify(syncDraft)]);
const projected=(await db.query('select branch_id,day_of_week,starts_at::text start,schedule_source from public.studioflow_staff_branch_schedules where site_id=$1 order by branch_id',[syncOwner])).rows;
assert.deepEqual(projected,[{branch_id:syncA,day_of_week:'Saturday',start:'10:00:00',schedule_source:'direct'},{branch_id:syncB,day_of_week:'Saturday',start:'09:30:00',schedule_source:'workspace'}]);
delete syncDraft.stylists[0].branchSchedules;syncDraft.stylists[0].schedule=[];syncDraft.profile.branches[1].isActive=false;
await db.query('update public.studioflow_accounts set draft=$2 where user_id=$1',[syncOwner,JSON.stringify(syncDraft)]);
assert.equal(await get('select count(*)::int data from public.studioflow_staff_branch_schedules where site_id=$1 and branch_id=$2',[syncOwner,syncB]),0,'removed explicit branch schedule is cleared');
assert.equal(await get("select count(*)::int data from public.studioflow_staff_branch_schedules where site_id=$1 and branch_id=$2 and schedule_source='direct'",[syncOwner,syncA]),1,'editing another branch does not erase a direct shift');
await db.query('update public.studioflow_accounts set draft=draft || $2::jsonb where user_id=$1',[legacyOwner,JSON.stringify({note:'unrelated'})]);
assert.equal(await get('select count(*)::int data from public.studioflow_staff_branch_schedules where site_id=$1',[legacyOwner]),2,'workspace saves preserve both direct and unconfirmed legacy rows');

// Legacy/stale branch IDs resolve by name, and a later rename retains the
// canonical database ID rather than creating a duplicate location.
const canonicalOwner='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',staleBranch='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
await db.query('insert into public.studioflow_accounts values($1,$2)',[canonicalOwner,JSON.stringify({profile:{businessName:'Original'},stylists:[]})]);
const canonical=await get('select id data from public.branches where site_id=$1',[canonicalOwner]);
assert.deepEqual(await get('select operating_hours data from public.branches where id=$1',[canonical]),[],'new implicit branch does not manufacture default hours');
const canonicalDraft={profile:{branches:[{id:staleBranch,name:'Original',isActive:true,operatingHours:days}]},stylists:[{id:'s',branchSchedules:[{branchId:staleBranch,schedule:days}]}]};
await db.query('update public.studioflow_accounts set draft=$2 where user_id=$1',[canonicalOwner,JSON.stringify(canonicalDraft)]);
assert.equal(await get('select count(*)::int data from public.studioflow_staff_branch_schedules where site_id=$1 and branch_id=$2',[canonicalOwner,canonical]),7,'stale schedule ID maps to canonical location');
canonicalDraft.profile.branches[0].name='Renamed';
await db.query('update public.studioflow_accounts set draft=$2 where user_id=$1',[canonicalOwner,JSON.stringify(canonicalDraft)]);
assert.equal(await get('select count(*)::int data from public.branches where site_id=$1',[canonicalOwner]),1,'renaming a stale ID does not create a duplicate');
assert.equal(await get('select name data from public.branches where id=$1',[canonical]),'Renamed');
assert.equal(await get('select count(*)::int data from public.studioflow_staff_branch_schedules where site_id=$1 and branch_id=$2',[canonicalOwner,canonical]),7,'rename preserves projected shifts');
console.log('PASS: guest RPC/RLS, stale assignments, schedule provenance, canonical branches, IST, conflicts and real website/Android/men’s wrappers (including a coupon bundle) in a disposable fixture.');
await db.close();
