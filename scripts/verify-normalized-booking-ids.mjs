// The production-shaped normalized RPC is optional; exercise its real repair
// in a disposable PostgreSQL-compatible database, not against customer data.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const id = () => crypto.randomUUID();
const owner=id(), otherOwner=id(), salon=id(), secondSalon=id(), otherSalon=id(), org=id(), secondOrg=id(), otherOrg=id();
const canonicalA=id(), canonicalB=id(), archived=id(), foreignService=id(), neverOnline=id();
const restricted=id(), staleOnly=id(), foreignOnly=id(), qualified=id(), noSchedule=id();
try {
  await db.exec('create role anon nologin; create role authenticated nologin; create role service_role nologin; create schema studioflow_private;');
  await db.exec(readFileSync('scripts/fixtures/normalized-booking-prerequisites.sql','utf8'));
  await db.exec(readFileSync('scripts/fixtures/normalized-owner-sync-prerequisites.sql','utf8'));
  const syncSource=readFileSync('supabase/migrations/20260928023439_normalized_template_catalogue_core_20260928.sql','utf8');
  const sync=syncSource.match(/create or replace function public\.sync_owner_template_catalogue\(\)[\s\S]*?end \$\$;/i)?.[0];
  assert.ok(sync,'the actual historical owner catalogue sync function exists');
  await db.exec(sync);
  await db.exec('create trigger trg_owner_editor_state_catalogue_sync after insert or update of state on public.owner_editor_state for each row execute function public.sync_owner_template_catalogue();');
  await db.exec('grant usage on schema public,auth,studioflow_private to anon,authenticated;');
  const date=(await db.query("select ((now() at time zone 'Asia/Kolkata')::date+14)::text d")).rows[0].d;
  const dow=(await db.query('select extract(dow from $1::date)::int d',[date])).rows[0].d;
  const legacyA=(await db.query("select public.nexora_catalog_uuid($1,'service','raw-a') id",[salon])).rows[0].id;
  const legacyB=(await db.query("select public.nexora_catalog_uuid($1,'service','raw-b') id",[salon])).rows[0].id;
  const unmatched=id();
  await db.query('insert into public.salons(id,owner_id,slug,organization_id) values($1,$2,$3,$4),($5,$6,$7,$8)',[salon,owner,'first',org,otherSalon,otherOwner,'second',otherOrg]);
  await db.query("insert into public.organization_members values($1,$2,'owner','active'),($3,$4,'owner','active')",[org,owner,otherOrg,otherOwner]);
  await db.query("insert into public.salon_hours values($1,$2,'09:00','12:00',false)",[salon,dow]);
  await db.query("insert into public.services(id,salon_id,name,price_paise,duration_minutes) values($1,$4,'Same name',99999,30),($2,$4,'Same name',77777,30),($3,$4,'Same name',123,30)",[legacyA,legacyB,unmatched,salon]);
  await db.query(`insert into public.salon_services(id,salon_id,name,price,price_paise,duration_minutes,editor_key,is_active,is_bookable_online,status) values
    ($1,$6,'Same name',55,5500,30,'service:raw-a',true,true,'active'),
    ($2,$6,'Same name',70,7000,30,'service:raw-b',true,true,'active'),
    ($3,$6,'Old',10,1000,30,'service:old',true,true,'archived'),
    ($4,$7,'Other tenant',10,1000,30,'service:raw-a',true,true,'active'),
    ($5,$6,'Offline only',10,1000,30,'service:offline',true,false,'active')`,[canonicalA,canonicalB,archived,foreignService,neverOnline,salon,otherSalon]);
  await db.query("insert into public.staff(id,salon_id,full_name) values($1,$6,'A'),($2,$6,'B'),($3,$6,'C'),($4,$6,'D'),($5,$6,'No schedule')",[restricted,staleOnly,foreignOnly,qualified,noSchedule,salon]);
  await db.query("insert into public.staff_schedules(staff_id,day_of_week,start_time,end_time,is_off,is_working) select x,$1,'09:00','12:00',false,true from unnest($2::uuid[]) x",[dow,[restricted,staleOnly,foreignOnly,qualified]]);
  await db.query('insert into public.staff_services values($1,$5,true),($1,$7,true),($2,$7,true),($3,$8,true),($4,$5,true),($4,$6,true)',[restricted,staleOnly,foreignOnly,qualified,canonicalA,canonicalB,archived,foreignService]);
  const options=async(ids,staff=null,tenant=salon)=>(await db.query('select public.nexora_customer_booking_options($1,$2::uuid[],$3,$4) result',[tenant,ids,date,staff])).rows[0].result;
  assert.deepEqual((await options([canonicalA])).available_staff,[],'the old RPC cannot resolve the website catalogue ID');
  assert.deepEqual((await options([legacyA],restricted)).available_staff,[],'the old RPC compares a services ID with the different assignment ID');
  await assert.rejects(options([legacyA],noSchedule),/primary_staff_id|staff_time_off/i,'the old production-shaped conflict query references absent schema');

  const migration=readFileSync('supabase/migrations/20261127143001_booking_slot_availability_repair.sql','utf8');
  const start=migration.indexOf('-- The separately deployed normalized storefront');
  const end=migration.indexOf('-- New helpers are private.',start);
  assert.ok(start>=0 && end>start,'the actual optional migration section exists');
  const section=migration.slice(start,end);
  await db.exec(section); await db.exec(section);
  for (const role of ['anon','authenticated']) {
    for (const signature of ['studioflow_private.normalized_booking_service_ids(uuid,uuid[])','studioflow_private.normalized_editor_assignment_id(uuid,text,jsonb)'])
      assert.equal((await db.query('select has_function_privilege($1,$2,$3) ok',[role,signature,'EXECUTE'])).rows[0].ok,false,`${role} cannot call ${signature}`);
  }
  assert.equal((await db.query("select has_function_privilege('anon','public.nexora_customer_booking_options(uuid,uuid[],date,uuid)','EXECUTE') ok")).rows[0].ok,true,'existing public read access is preserved');
  assert.equal((await db.query("select has_function_privilege('anon','public.nexora_save_owner_workspace(jsonb)','EXECUTE') ok")).rows[0].ok,false,'owner writes remain authenticated');

  await db.exec('set role anon');
  let a=await options([canonicalA]), legacy=await options([legacyA]);
  assert.deepEqual(legacy,a,'a proven legacy editor ID resolves to the same canonical service');
  assert.equal(a.total_paise,5500,'price comes from the public/assignment catalogue, not the legacy table');
  assert.equal(a.duration_minutes,30);
  const names=(result)=>new Set(result.available_staff.map(s=>s.id));
  assert.ok(names(a).has(restricted));
  assert.ok(names(a).has(staleOnly),'archived-only mappings do not block');
  assert.ok(names(a).has(foreignOnly),'foreign mappings do not impose a same-tenant restriction');
  assert.ok(!names(a).has(noSchedule),'opening hours alone do not create a staff shift');
  const b=await options([canonicalB]);
  assert.ok(!names(b).has(restricted),'one remaining active assignment stays restrictive');
  assert.ok(names(b).has(staleOnly));
  const bundle=await options([canonicalA,legacyB]);
  assert.equal(bundle.total_paise,12500); assert.equal(bundle.duration_minutes,60);
  assert.ok(names(bundle).has(qualified)); assert.ok(!names(bundle).has(restricted));
  for (const ids of [[canonicalA,canonicalA],[canonicalA,legacyA],[unmatched],[foreignService],[neverOnline],[canonicalA,null],[id()]]) {
    const invalid=await options(ids);
    assert.deepEqual(invalid.available_slots,[],`invalid, duplicate, foreign or unmapped IDs fail closed: ${ids}`);
    assert.deepEqual(invalid.available_staff,[]);
  }
  await assert.rejects(db.query('select * from public.bookings'),/permission denied/i,'public RPC does not expose private appointment rows');
  await assert.rejects(db.query('select studioflow_private.normalized_booking_service_ids($1,$2::uuid[])',[salon,[canonicalA]]),/permission denied/i);
  await db.exec('reset role');

  // Same name is never a mapping; duplicate provenance for a legacy ID is also
  // ambiguous and rejected, rather than picking a row by order or UUID.
  const ambiguous=id();
  await db.query("insert into public.salon_services(id,salon_id,name,price,price_paise,duration_minutes,editor_key) values($1,$2,'Same name',55,5500,30,'service: raw-a ')",[ambiguous,salon]);
  assert.deepEqual((await options([legacyA])).available_slots,[],'ambiguous legacy links fail closed');
  assert.ok((await options([canonicalA])).available_slots.length>0,'a direct canonical ID remains unambiguous');
  await db.query('delete from public.salon_services where id=$1',[ambiguous]);
  await db.query("insert into public.staff_leave_requests values($1,$2,$2,'approved')",[restricted,date]);
  assert.deepEqual((await options([canonicalA],restricted)).available_staff,[],'approved leave blocks the normalized specialist');
  await db.query('delete from public.staff_leave_requests where staff_id=$1',[restricted]);
  await db.query("insert into public.bookings(salon_id,staff_id,appointment_date,start_time,end_time,booking_status) values($1,$2,$3,'09:00','10:00','confirmed')",[salon,restricted,date]);
  const times=(await options([canonicalA],restricted)).available_slots.map(s=>s.time);
  assert.ok(!times.includes('09:00') && !times.includes('09:30') && times.includes('10:00'),'real normalized appointment columns block overlapping slots');
  await db.query("update public.bookings set booking_status='cancelled' where salon_id=$1",[salon]);
  assert.ok((await options([canonicalA],restricted)).available_slots.some(s=>s.time==='09:00'),'a known terminal normalized status releases its slot');
  await db.query("update public.bookings set booking_status='awaiting_review',appointment_date=$2::date+1,booking_date=$2 where salon_id=$1",[salon,date]);
  assert.ok(!(await options([canonicalA],restricted)).available_slots.some(s=>s.time==='09:00'),'unknown statuses and inconsistent appointment dates fail closed');
  await db.query("insert into public.bookings(salon_id,booking_date,status) values($1,$2,'pending')",[salon,date]);
  assert.deepEqual((await options([canonicalA],restricted)).available_slots,[],'an incomplete active booking fails closed instead of guessing staff or duration');
  await db.query('delete from public.bookings');

  // The real post-save projection used to ignore the writer's selected salon
  // and pick the newest membership. Check a multi-salon owner and ensure that
  // no service/staff projection leaks into the other authorized salon.
  await db.query("insert into public.salons(id,owner_id,slug,organization_id,created_at) values($1,$2,'newer-salon',$3,now()+interval '1 hour')",[secondSalon,owner,secondOrg]);
  await db.query("insert into public.organization_members values($1,$2,'owner','active')",[secondOrg,owner]);
  await db.query("insert into public.salon_services(id,salon_id,name,price_paise,editor_key) values($1,$2,'Other salon menu',9900,'service:new-editor-id')",[id(),secondSalon]);
  const secondBefore=(await db.query('select * from public.salon_services where salon_id=$1',[secondSalon])).rows;
  // A first save used to validate a public.services ID then violate the FK to
  // salon_services. The repaired writer creates/uses the exact editor key in
  // the authorized salon, including a new service in the same transaction.
  const state={salonId:salon,services:[{id:'new-editor-id',name:'New service',price:125,durationMinutes:30},{id:'unassigned-id',name:'Unassigned service',price:50,durationMinutes:30}],stylists:[{id:'new-staff',name:'New stylist',assignedServices:['new-editor-id'],schedule:[{day:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dow],enabled:true,fromTime:'09:00',toTime:'12:00'}]}]};
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  await db.exec('set role authenticated');
  await db.query('select public.nexora_save_owner_workspace($1)',[JSON.stringify(state)]);
  await assert.rejects(db.query('select public.nexora_save_owner_workspace($1)',[JSON.stringify({...state,salonId:otherSalon})]),/cross-account/i);
  await db.exec('reset role');
  assert.deepEqual((await db.query('select * from public.salon_services where salon_id=$1',[secondSalon])).rows,secondBefore,'sync leaves the newer salon and its catalogue untouched');
  assert.equal(Number((await db.query('select count(*) n from public.staff where salon_id=$1',[secondSalon])).rows[0].n),0,'sync creates no specialists in the other salon');
  await assert.rejects(db.query('update public.owner_editor_state set state=state - $1 where owner_id=$2',['salonId',owner]),/select a salon/i,'multi-salon state without a target fails closed');
  await assert.rejects(db.query("update public.owner_editor_state set state=jsonb_set(state,'{salonId}',to_jsonb($1::text)) where owner_id=$2",[otherSalon,owner]),/selected salon is not available/i,'direct foreign salon state is rejected');
  const assignment=(await db.query("select ss.service_id,sv.salon_id,sv.price_paise,public.nexora_catalog_uuid($1,'service','new-editor-id') legacy_id,st.id staff_id from public.staff_services ss join public.salon_services sv on sv.id=ss.service_id join public.staff st on st.id=ss.staff_id where sv.salon_id=$1 and sv.editor_key='service:new-editor-id'",[salon])).rows[0];
  assert.ok(assignment); assert.equal(assignment.salon_id,salon); assert.equal(Number(assignment.price_paise),12500);
  assert.notEqual(assignment.service_id,assignment.legacy_id,'the two UUID domains remain distinct');
  const writtenSchedule=(await db.query('select is_working,is_off from public.staff_schedules where staff_id=$1 and day_of_week=$2',[assignment.staff_id,dow])).rows[0];
  assert.deepEqual(writtenSchedule,{is_working:true,is_off:false},'the deployed writer sets is_working for an enabled shift');
  assert.deepEqual(await options([assignment.service_id],assignment.staff_id),await options([assignment.legacy_id],assignment.staff_id));
  assert.ok((await options([assignment.service_id],assignment.staff_id)).available_slots.length>0);
  // The historical sync can create a second prefixed staff row; without its
  // own verified schedule it must not become an unrestricted phantom worker.
  const syncStaff=(await db.query("select id from public.staff where salon_id=$1 and editor_key='staff:new-staff'",[salon])).rows[0].id;
  assert.notEqual(syncStaff,assignment.staff_id);
  assert.deepEqual((await options([assignment.service_id],syncStaff)).available_staff,[],'a duplicate sync row without a schedule fails closed');
  state.services[0].price=130; state.services[1].price=80;
  await db.exec('set role authenticated'); await db.query('select public.nexora_save_owner_workspace($1)',[JSON.stringify(state)]); await db.exec('reset role');
  assert.equal(Number((await db.query('select price_paise from public.salon_services where id=$1',[assignment.service_id])).rows[0].price_paise),13000,'owner price update survives the real post-save sync and money trigger');
  assert.equal(Number((await db.query("select price_paise from public.salon_services where salon_id=$1 and editor_key='service:unassigned-id'",[salon])).rows[0].price_paise),8000,'an unassigned service also gets the new price through the existing sync trigger');
  state.stylists[0].schedule[0].enabled=false;
  await db.exec('set role authenticated'); await db.query('select public.nexora_save_owner_workspace($1)',[JSON.stringify(state)]); await db.exec('reset role');
  assert.deepEqual((await options([assignment.service_id],assignment.staff_id)).available_staff,[],'the writer marks a disabled shift as not working');
  state.stylists[0].schedule[0].enabled=true;
  await db.exec('set role authenticated'); await db.query('select public.nexora_save_owner_workspace($1)',[JSON.stringify(state)]); await db.exec('reset role');
  assert.ok((await options([assignment.service_id],assignment.staff_id)).available_slots.length>0,'re-enabling the same verified shift restores availability');
  await db.query("update public.salon_services set status='archived' where id=$1",[assignment.service_id]);
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select public.nexora_save_owner_workspace($1)',[JSON.stringify(state)]),/no active same-salon catalogue/i,'archived canonical records are never silently reactivated');
  await db.exec('reset role');

  // Unexpected live bodies or missing target-schema columns must abort the
  // transactional repair, rather than quietly deploying a broken function.
  await db.exec("begin; create or replace function public.nexora_save_owner_workspace(p_state jsonb) returns void language plpgsql security definer as $$begin return; end$$;");
  await assert.rejects(db.exec(section),/Unexpected nexora_save_owner_workspace definition/i);
  await db.exec('rollback');
  await db.exec("begin; create or replace function public.sync_owner_template_catalogue() returns trigger language plpgsql security definer as $$begin return new; end$$;");
  await assert.rejects(db.exec(section),/Unexpected sync_owner_template_catalogue definition/i);
  await db.exec('rollback');
  await db.exec('begin; alter table public.bookings drop column booking_status;');
  await assert.rejects(db.exec(section),/Normalized booking prerequisites missing: bookings.booking_status/i);
  await db.exec('rollback');
  console.log('PASS: normalized website IDs, proven legacy IDs, owner assignment FK, price/duration, schedules, conflicts, bundles, tenant isolation, ambiguity, ACLs and schema-drift guards.');
} finally { await db.close(); }
