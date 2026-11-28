// Real PostgreSQL concurrency integration. Requires an explicitly disposable,
// loopback-only superuser server. It creates and drops one random database and
// only uses synthetic tenants. Never point this at Supabase or customer data.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';

const input=process.env.STUDIOFLOW_TEST_POSTGRES_URL;
if (!input) throw new Error('Set STUDIOFLOW_TEST_POSTGRES_URL to a disposable local PostgreSQL server; see docs/booking-availability-rollout.md.');
const url=new URL(input);
assert.ok(['postgres:','postgresql:'].includes(url.protocol),'a PostgreSQL URL is required');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(url.hostname),'refusing a non-loopback PostgreSQL host');
assert.equal(url.pathname,'/postgres','connect to the postgres maintenance DB on a disposable server');
assert.equal(process.env.STUDIOFLOW_DISPOSABLE_POSTGRES,'yes','explicitly acknowledge the entire server is disposable');
const dbName='studioflow_race_'+crypto.randomUUID().replace(/-/g,'');
const dbUrl=new URL(url); dbUrl.pathname='/'+dbName;
const admin=new pg.Client({connectionString:url.toString()});
const clients=[]; const createdRoles=[]; let createdDb=false;
const sqlFile=(path)=>readFileSync(path,'utf8');
const connect=async()=>{const c=new pg.Client({connectionString:dbUrl.toString()}); await c.connect(); clients.push(c); await c.query("set statement_timeout='15s'; set lock_timeout='10s'"); return c;};
const matchDefinition=(source,regex,label)=>{const def=source.match(regex)?.[0]; assert.ok(def,`${label} checked-in definition exists`); return def;};
const auth=async(c,user)=>{await c.query('reset role');await c.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);await c.query(`set role ${user?'authenticated':'anon'}`);};
const queryResult=(promise)=>promise.then(value=>({value}),error=>({error}));
async function assertBlocked(observer,waiting,blocker,pending,label){
  const deadline=Date.now()+7000;
  while(Date.now()<deadline){
    const r=await observer.query('select $1::int=any(pg_blocking_pids($2::int)) blocked,wait_event_type,wait_event from pg_stat_activity where pid=$2',[blocker.processID,waiting.processID]);
    if(r.rows[0]?.blocked && r.rows[0]?.wait_event_type==='Lock') return;
    const settled=await Promise.race([pending,delay(30).then(()=>null)]);
    if(settled) throw new Error(`${label} finished before blocking: ${settled.error?.message||'unexpected success'}`);
  }
  throw new Error(`${label} never blocked on the competing PostgreSQL session`);
}
async function rejectsResult(pending,pattern,label){const r=await pending; assert.ok(r.error,`${label} must be rejected`); assert.match(r.error.message,pattern,label);}

try {
  await admin.connect();
  const meta=(await admin.query("select current_database() db, current_user role, (select rolsuper from pg_roles where rolname=current_user) super, current_setting('server_version_num')::int version, inet_server_addr()::text address")).rows[0];
  assert.equal(meta.db,'postgres'); assert.equal(meta.super,true,'temporary database creation requires a disposable superuser');
  assert.ok(meta.version>=150000,`PostgreSQL 15+ required, received ${meta.version}`);
  assert.ok(meta.address==='127.0.0.1/32'||meta.address==='127.0.0.1'||meta.address==='::1/128'||meta.address==='::1','server must itself be loopback');
  for(const role of ['anon','authenticated','service_role']){
    if(!(await admin.query('select 1 from pg_roles where rolname=$1',[role])).rowCount){await admin.query(`create role ${role} nologin`);createdRoles.push(role);}
  }
  await admin.query(`create database ${dbName}`); createdDb=true;
  const setup=await connect();
  await setup.query(sqlFile('scripts/fixtures/normalized-booking-prerequisites.sql'));
  await setup.query(sqlFile('scripts/fixtures/booking-concurrency-prerequisites.sql'));
  await setup.query(sqlFile('scripts/fixtures/normalized-owner-sync-prerequisites.sql'));
  const normalizedSync=sqlFile('supabase/migrations/20260928023439_normalized_template_catalogue_core_20260928.sql');
  await setup.query(matchDefinition(normalizedSync,/create or replace function public\.sync_owner_template_catalogue\(\)[\s\S]*?end \$\$;/i,'normalized owner sync'));
  await setup.query('create trigger trg_owner_editor_state_catalogue_sync after insert or update of state on public.owner_editor_state for each row execute function public.sync_owner_template_catalogue()');
  await setup.query(sqlFile('supabase/migrations/20261113120946_template12_iron_ink.sql'));
  // Production already has checkout receipts. Reproduce that order, including
  // its actual payment settlement and receipt triggers, before the repairs.
  await setup.query(sqlFile('backend/studioflow-payments-realtime.sql'));
  await setup.query(sqlFile('supabase/migrations/20261127143000_studioflow_web_checkout_receipts.sql'));
  const bookingRepair=sqlFile('supabase/migrations/20261127143001_booking_slot_availability_repair.sql');
  const inkRepair=sqlFile('supabase/migrations/20261127143100_iron_ink_availability_ist.sql');
  const crossLedgerRepair=sqlFile('supabase/migrations/20261127143200_cross_ledger_booking_conflicts.sql');
  // Exercise and replay the actual transactional files in release order. An
  // active pre-migration normalized row has no trustworthy instant snapshot:
  // the third migration must roll back, not silently guess or discard it.
  await setup.query(bookingRepair); await setup.query(inkRepair);
  await setup.query("insert into public.bookings(owner_id,status) values($1,'pending')",[crypto.randomUUID()]);
  await assert.rejects(setup.query(crossLedgerRepair),/Existing active normalized appointments require owner review/i);
  await setup.query('rollback');
  assert.equal(Number((await setup.query("select count(*) n from information_schema.columns where table_schema='public' and table_name='bookings' and column_name='studioflow_guard_starts_at'")).rows[0].n),0,'failed installation is transactional');
  await setup.query('delete from public.bookings');
  await setup.query('alter table public.bookings add column studioflow_guard_starts_at timestamptz');
  await assert.rejects(setup.query(crossLedgerRepair),/Unexpected pre-existing cross-ledger snapshot columns/i);
  await setup.query('rollback');await setup.query('alter table public.bookings drop column studioflow_guard_starts_at');
  const expectedSlots=(await setup.query("select pg_get_functiondef('studioflow_private.booking_slots(text,jsonb,date,text,uuid)'::regprocedure) body")).rows[0].body;
  const driftedSlots=expectedSlots.replace('rows:=rows||jsonb_build_array','rows := rows || jsonb_build_array');
  assert.notEqual(driftedSlots,expectedSlots,'availability drift probe must change the expected anchor');
  await setup.query('begin');await setup.query(driftedSlots);
  await assert.rejects(setup.query(crossLedgerRepair),/Unexpected booking_slots definition/i);await setup.query('rollback');
  assert.equal((await setup.query("select pg_get_functiondef('studioflow_private.booking_slots(text,jsonb,date,text,uuid)'::regprocedure) body")).rows[0].body,expectedSlots,'failed drift probe rolls back every change');
  const expectedSettlement=(await setup.query("select pg_get_functiondef('studioflow_private.settle_payment(text,text,bigint)'::regprocedure) body")).rows[0].body;
  const driftedSettlement=expectedSettlement.replace('b.hold_expires_at<=now()','b.hold_expires_at <= now()');
  assert.notEqual(driftedSettlement,expectedSettlement,'settlement drift probe must change its anchor');
  await setup.query('begin');await setup.query(driftedSettlement);
  await assert.rejects(setup.query(crossLedgerRepair),/Unexpected payment settlement conflict definition/i);await setup.query('rollback');
  assert.equal((await setup.query("select pg_get_functiondef('studioflow_private.settle_payment(text,text,bigint)'::regprocedure) body")).rows[0].body,expectedSettlement,'settlement drift also rolls back');
  await setup.query(crossLedgerRepair);
  // The third migration must restore its guards after the first is replayed.
  await setup.query(bookingRepair); await setup.query(inkRepair); await setup.query(crossLedgerRepair);
  console.log('PASS: installation refuses unreviewed active rows, snapshot collisions and function drift; failures roll back atomically.');
  const branch=sqlFile('supabase/migrations/20261114115141_studioflow_branch_android_slots.sql');
  for(const name of ['studioflow_branch_book','studioflow_branch_android_book','studioflow_android_reschedule','studioflow_branch_available_slots']){
    await setup.query(matchDefinition(branch,new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$;`,'i'),name));
  }
  const android=sqlFile('supabase/migrations/20261122065342_branch_scope_private_booking_guards.sql');
  await setup.query(matchDefinition(android,/create or replace function studioflow_android_private\.reschedule\([\s\S]*?\$function\$\s*;/i,'Android reschedule'));
  const addons=sqlFile('supabase/migrations/20261117130000_reconcile_template15_multiservice_booking.sql');
  await setup.query(matchDefinition(addons,/create or replace function studioflow_private\.book_with_addons\(p_slug text,p_request jsonb\)[\s\S]*?end \$\$;/i,'website add-ons'));
  await setup.query(`grant execute on function studioflow_private.book_with_addons(text,jsonb),
    studioflow_android_private.book(text,jsonb,date,text,text,text,text,text,uuid),
    studioflow_android_private.reschedule(uuid,date,text,text) to authenticated;
    grant execute on function public.studioflow_branch_book(text,jsonb),public.studioflow_branch_android_book(text,jsonb,date,text,text,text,text,text,uuid,uuid),public.studioflow_android_reschedule(uuid,date,text,text) to authenticated;
    grant execute on function studioflow_private.branch_slots(text,jsonb,date,text,uuid),public.studioflow_branch_available_slots(text,text,date,text,uuid) to anon,authenticated,service_role;`);

  const owner=crypto.randomUUID(), alice=crypto.randomUUID(), bob=crypto.randomUUID(), inkOwner=crypto.randomUUID(), branchId=crypto.randomUUID();
  const artist=crypto.randomUUID(), artist2=crypto.randomUUID(), category=crypto.randomUUID();
  const date=(await setup.query("select ((now() at time zone 'Asia/Kolkata')::date+14)::text d")).rows[0].d;
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=>({day,enabled:true,fromTime:'09:00',toTime:'17:00'}));
  const stylists=['one','two'].map(id=>({id,name:`Stylist ${id}`,status:'Available',schedule:days,assignedServices:['cut']}));
  const content={profile:{businessType:'barber',bookingRules:{leadHours:0}},services:[{id:'cut',name:'Cut',durationMinutes:60,price:450}],stylists};
  await setup.query('insert into auth.users(id,email) values($1,$5),($2,$6),($3,$7),($4,$8)',[owner,alice,bob,inkOwner,'owner@example.test','alice@example.test','bob@example.test','ink@example.test']);
  await setup.query('insert into public.studioflow_accounts values($1,$2),($3,$4)',[owner,JSON.stringify({stylists,extras:{bookingLeadHours:0,cancellationWindow:0}}),inkOwner,'{}']);
  await setup.query("insert into public.studioflow_websites values($1,'race-salon',$2,now()),($3,'race-ink',$4,now())",[owner,JSON.stringify(content),inkOwner,JSON.stringify({profile:{businessType:'tattoo_studio'}})]);
  await setup.query('insert into public.branches(id,site_id,name,is_active,operating_hours) values($1,$2,$3,true,$4)',[branchId,owner,'Main',JSON.stringify(days)]);
  await setup.query("insert into public.ink_categories(id,site_id,slug,name,\"group\",duration_min) values($1,$2,'one-hour','One hour','tattoo_style',60)",[category,inkOwner]);
  await setup.query("insert into public.ink_artists(id,site_id,name) values($1,$3,'Artist One'),($2,$3,'Artist Two')",[artist,artist2,inkOwner]);
  await setup.query("insert into public.ink_availability(site_id,artist_id,day_of_week,start_time,end_time) select $1,x,extract(dow from $3::date)::int,'09:00','17:00' from unnest($2::uuid[]) x",[inkOwner,[artist,artist2],date]);

  // Exercise the full optional migration section on PostgreSQL too, with the
  // actual historical after-save catalogue-sync trigger and distinct UUIDs.
  const normSalon=crypto.randomUUID(), normOther=crypto.randomUUID(), normOrg=crypto.randomUUID(), normOtherOrg=crypto.randomUUID();
  await setup.query("insert into public.salons(id,owner_id,organization_id,slug) values($1,$2,$3,'normalized-salon'),($4,$2,$5,'newer-normalized-salon')",[normSalon,owner,normOrg,normOther,normOtherOrg]);
  await setup.query("update public.salons set created_at=now()+interval '1 hour' where id=$1",[normOther]);
  await setup.query("insert into public.organization_members values($1,$2,'owner','active'),($3,$2,'owner','active')",[normOrg,owner,normOtherOrg]);
  await setup.query("insert into public.salon_hours values($1,extract(dow from $2::date)::int,'09:00','17:00',false)",[normSalon,date]);
  const fullDays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const normDow=Number((await setup.query('select extract(dow from $1::date)::int d',[date])).rows[0].d);
  const normState={salonId:normSalon,services:[{id:'editor-cut',name:'Normalized cut',price:125,durationMinutes:60}],stylists:[{id:'editor-worker',name:'Normalized worker',assignedServices:['editor-cut'],schedule:[{day:fullDays[normDow],enabled:true,fromTime:'09:00',toTime:'17:00'}]}]};
  await setup.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  await setup.query('select public.nexora_save_owner_workspace($1)',[JSON.stringify(normState)]);
  assert.equal(Number((await setup.query('select count(*) n from public.salon_services where salon_id=$1',[normOther])).rows[0].n),0,'the historical projection respects the selected salon');
  const normalized=(await setup.query("select ss.staff_id,ss.service_id,public.nexora_catalog_uuid($1,'service','editor-cut') legacy_id from public.staff_services ss join public.staff st on st.id=ss.staff_id where st.salon_id=$1",[normSalon])).rows[0];
  assert.ok(normalized);assert.notEqual(normalized.service_id,normalized.legacy_id);
  assert.deepEqual((await setup.query('select is_working,is_off from public.staff_schedules where staff_id=$1 and day_of_week=$2',[normalized.staff_id,normDow])).rows[0],{is_working:true,is_off:false});
  await setup.query('set role anon');
  const normalizedRead=async(id)=>(await setup.query('select public.nexora_customer_booking_options($1,$2::uuid[],$3,$4) result',[normSalon,[id],date,normalized.staff_id])).rows[0].result;
  const canonical=await normalizedRead(normalized.service_id), legacy=await normalizedRead(normalized.legacy_id);
  assert.deepEqual(canonical,legacy);assert.equal(canonical.total_paise,12500);assert.ok(canonical.available_slots.length>0);
  await setup.query('reset role');await setup.query("select set_config('request.jwt.claim.sub','',false)");
  console.log('PASS: real PostgreSQL normalized owner sync, distinct catalogue IDs and anonymous availability agree.');

  const a=await connect(), b=await connect(), direct=await connect(), observer=await connect();
  await auth(a,alice); await auth(b,bob);
  const web=(c,time,stylist='one')=>c.query('select public.studioflow_branch_book($1,$2) value',['race-salon',JSON.stringify({serviceId:'cut',stylistId:stylist,date,time,branchId,clientName:'Test Customer',clientPhone:'9876543210'})]);
  const androidBook=(c,time,stylist='one',request=crypto.randomUUID())=>c.query('select public.studioflow_branch_android_book($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) value',['race-salon','["cut"]',date,time,stylist,'Test Customer','9876543210','',request,branchId]);
  const clean=async()=>{await setup.query('delete from public.studioflow_android_requests');await setup.query('delete from public.studioflow_payment_orders');await setup.query('delete from public.studioflow_bookings');};
  const count=async()=>Number((await setup.query("select count(*) n from public.studioflow_bookings where status in ('pending','confirmed') and (status='confirmed' or hold_expires_at is null or hold_expires_at>now())")).rows[0].n);
  const insertDirect=(c,time,status='confirmed',hold=null,customer=bob)=>c.query(`insert into public.studioflow_bookings(owner_id,customer_id,stylist_id,starts_at,ends_at,status,hold_expires_at,payload,branch_id)
    values($1,$2,'one',($3::date+$4::time) at time zone 'Asia/Kolkata',($3::date+$4::time+interval '60 minutes') at time zone 'Asia/Kolkata',$5,$6,$7,$8) returning id`,[owner,customer,date,time,status,hold,JSON.stringify({serviceId:'cut',date,time,stylistId:'one'}),branchId]);

  const secondNormalizedStaff=crypto.randomUUID(), foreignSalon=crypto.randomUUID(), foreignOrg=crypto.randomUUID(), foreignStaff=crypto.randomUUID();
  await setup.query("insert into public.staff(id,salon_id,full_name) values($1,$2,'Second normalized specialist')",[secondNormalizedStaff,normSalon]);
  await setup.query("insert into public.salons(id,owner_id,organization_id,slug) values($1,$2,$3,'other-owner-salon')",[foreignSalon,inkOwner,foreignOrg]);
  await setup.query("insert into public.organization_members values($1,$2,'owner','active')",[foreignOrg,inkOwner]);
  await setup.query("insert into public.staff(id,salon_id,full_name) values($1,$2,'Other owner specialist')",[foreignStaff,foreignSalon]);
  const option=(opts,key,fallback)=>Object.hasOwn(opts,key)?opts[key]:fallback;
  const normalizedInsert=(c,start,end,opts={})=>c.query(`insert into public.bookings(owner_id,salon_id,staff_id,appointment_date,booking_date,start_time,end_time,status,booking_status)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id,studioflow_guard_starts_at,studioflow_guard_ends_at`,
  [option(opts,'ownerId',owner),option(opts,'salonId',normSalon),option(opts,'staffId',normalized.staff_id),
   option(opts,'day',date),option(opts,'bookingDate',null),start,end,option(opts,'status','confirmed'),option(opts,'bookingStatus','confirmed')]);
  const clearBoth=async()=>{await clean();await setup.query('delete from public.bookings');};
  const normalizedCount=async()=>Number((await setup.query('select count(*) n from public.bookings')).rows[0].n);
  const direct2=await connect(), ownerClient=await connect(), outsider=await connect(), service=await connect();
  await auth(ownerClient,owner);await auth(outsider,bob);await service.query('set role service_role');

  // Calibrate specifically against the previous cross-ledger gap: install the
  // actual earlier canonical guard and disable only the new normalized guard.
  // Independent direct writers then commit overlapping rows in both ledgers.
  const previousGuard=matchDefinition(bookingRepair,/create or replace function studioflow_private\.guard_booking_conflict\(\)[\s\S]*?end \$\$;/i,'previous canonical conflict guard');
  await setup.query(previousGuard);
  await setup.query('alter table public.bookings disable trigger zz_studioflow_normalized_cross_ledger_guard');
  try {
    await direct.query('begin');await insertDirect(direct,'09:00');
    await normalizedInsert(direct2,'09:30','10:30');await direct.query('commit');
    assert.equal(await count(),1);assert.equal(await normalizedCount(),1,'the old cross-ledger race really commits both reservations');
  } finally {
    await clearBoth();
    await setup.query(crossLedgerRepair);
  }
  console.log('PASS: negative control reproduces the previous cross-ledger double booking.');

  // Canonical first, normalized second; the second must actually block on the
  // first session before seeing its committed reservation and failing closed.
  await a.query('begin');await web(a,'09:00');
  let pending=queryResult(normalizedInsert(direct,'09:30','10:30'));
  await assertBlocked(observer,direct,a,pending,'website versus normalized write');await a.query('commit');
  await rejectsResult(pending,/occupies|booking|unavailable/i,'website versus normalized write');
  assert.equal(await count(),1);assert.equal(await normalizedCount(),0);

  // Reverse order: the website reads before the normalized transaction commits,
  // then its final write guard waits and rechecks the other ledger.
  await clearBoth();await direct.query('begin');await normalizedInsert(direct,'09:00','10:00');
  pending=queryResult(web(b,'09:30'));
  await assertBlocked(observer,b,direct,pending,'normalized write versus website');await direct.query('commit');
  await rejectsResult(pending,/occupies|booking|booked|unavailable/i,'normalized write versus website');
  assert.equal(await count(),0);assert.equal(await normalizedCount(),1);
  console.log('PASS: web and normalized writers serialize and reject overlapping commits in both directions.');

  // Exercise actual low-privilege owner writes and a fixture service_role RLS
  // bypass, not just superuser SQL. Trigger-function EXECUTE remains revoked.
  await clearBoth();await normalizedInsert(ownerClient,'09:00','10:00');
  assert.equal(Number((await ownerClient.query('select count(*) n from public.bookings')).rows[0].n),1);
  assert.equal(Number((await outsider.query('select count(*) n from public.bookings')).rows[0].n),0,'another authenticated user cannot read owner rows');
  await assert.rejects(normalizedInsert(outsider,'11:00','12:00'),/row.level security/i,'another user cannot write for this owner');
  await clearBoth();await ownerClient.query('begin');await normalizedInsert(ownerClient,'09:00','10:00');
  pending=queryResult(insertDirect(service,'09:30'));
  await assertBlocked(observer,service,ownerClient,pending,'owner normalized versus service-role canonical');await ownerClient.query('commit');
  await rejectsResult(pending,/booking|already has/i,'service-role writes still hit the conflict trigger');
  await clearBoth();await service.query('begin');await normalizedInsert(service,'09:00','10:00');
  pending=queryResult(web(b,'09:30'));
  await assertBlocked(observer,b,service,pending,'service-role normalized versus website');await service.query('commit');
  await rejectsResult(pending,/occupies|booking|booked|unavailable/i,'website sees the service-role normalized winner');
  console.log('PASS: owner RLS and service-role cross-ledger writes retain the guard and tenant isolation.');

  // Different normalized staff UUIDs cannot be mapped safely to StudioFlow's
  // string IDs, so conflicts deliberately use a conservative owner-wide scope.
  await clearBoth();await direct.query('begin');await normalizedInsert(direct,'09:00','10:00');
  pending=queryResult(normalizedInsert(direct2,'09:30','10:30',{staffId:secondNormalizedStaff}));
  await assertBlocked(observer,direct2,direct,pending,'two normalized writers for one owner');await direct.query('commit');
  await rejectsResult(pending,/occupies|booking/i,'normalized different-staff overlap is conservatively blocked');
  assert.equal(await normalizedCount(),1);
  await clearBoth();
  await assert.rejects(setup.query(`insert into public.bookings(owner_id,salon_id,staff_id,appointment_date,start_time,end_time,booking_status)
    values($1,$2,$3,$5,'09:00','10:00','confirmed'),($1,$2,$4,$5,'09:30','10:30','confirmed')`,
    [owner,normSalon,normalized.staff_id,secondNormalizedStaff,date]),/occupies|booking/i,'multi-row inserts cannot bypass the guard');
  assert.equal(await normalizedCount(),0,'a conflicting multi-row statement rolls back all its rows');
  const multi1=(await normalizedInsert(setup,'09:00','10:00')).rows[0].id;
  const multi2=(await normalizedInsert(setup,'11:00','12:00',{staffId:secondNormalizedStaff})).rows[0].id;
  await assert.rejects(setup.query("update public.bookings set start_time='12:00',end_time='13:00' where id=any($1::uuid[])",[[multi1,multi2]]),/occupies|booking/i,'multi-row moves cannot overlap each other');
  assert.deepEqual((await setup.query('select start_time::text value from public.bookings order by start_time')).rows.map(x=>x.value),['09:00:00','11:00:00']);
  console.log('PASS: conflicting multi-row normalized inserts and updates fail atomically.');

  await clearBoth();await a.query('begin');await web(a,'09:00');
  pending=queryResult(normalizedInsert(direct,'09:30','10:30'));
  await assertBlocked(observer,direct,a,pending,'rolled-back website versus normalized');await a.query('rollback');
  assert.ok((await pending).value,'normalized writer succeeds after the website transaction rolls back');
  await clearBoth();await direct.query('begin');await normalizedInsert(direct,'09:00','10:00');
  pending=queryResult(web(b,'09:30'));
  await assertBlocked(observer,b,direct,pending,'rolled-back normalized versus website');await direct.query('rollback');
  assert.ok((await pending).value,'website succeeds after the normalized transaction rolls back');
  console.log('PASS: normalized writers serialize with one another and both rollback directions release the slot.');

  await clearBoth();await direct.query('begin');await normalizedInsert(direct,'09:00','10:00');
  pending=queryResult(web(b,'10:00'));
  await assertBlocked(observer,b,direct,pending,'adjacent cross-ledger appointments');await direct.query('commit');
  assert.ok((await pending).value,'adjacent half-open windows may both commit');
  assert.equal(await count(),1);assert.equal(await normalizedCount(),1);
  await clearBoth();await a.query('begin');await web(a,'09:00');
  const unrelated=await Promise.race([normalizedInsert(direct2,'09:00','10:00',{ownerId:inkOwner,salonId:foreignSalon,staffId:foreignStaff}),delay(4000).then(()=>{throw new Error('different owners blocked each other');})]);
  assert.ok(unrelated.rows[0].id);await a.query('commit');
  console.log('PASS: adjacent cross-ledger times and different owners can both book.');

  // Both public read paths agree with the cross-ledger write rule, without
  // returning any private appointment row to a guest.
  await clearBoth();await normalizedInsert(setup,'09:00','10:00');
  await setup.query('set role anon');
  const webSlots=(await setup.query('select public.studioflow_branch_available_slots($1,$2,$3,$4,$5) result',['race-salon','cut',date,'one',branchId])).rows[0].result;
  assert.equal(webSlots.find(x=>x.time==='09:00')?.available,false);
  assert.equal(webSlots.find(x=>x.time==='09:30')?.available,false);
  assert.equal(webSlots.find(x=>x.time==='10:00')?.available,true);
  await setup.query('reset role');await clearBoth();await insertDirect(setup,'09:00');
  await setup.query('set role anon');
  const normalSlots=(await normalizedRead(normalized.service_id)).available_slots.map(x=>x.time);
  assert.ok(!normalSlots.includes('09:00') && !normalSlots.includes('09:30') && normalSlots.includes('10:00'));
  await setup.query('reset role');
  for(const role of ['anon','authenticated','service_role']){
    for(const signature of ['studioflow_private.normalized_owner_conflict(uuid,timestamptz,timestamptz,uuid)','studioflow_private.normalized_cross_ledger_slot_free(uuid,date,time,time)','studioflow_private.guard_normalized_cross_ledger()','studioflow_private.guard_normalized_owner_membership()','studioflow_private.guard_normalized_salon_identity()','studioflow_private.guard_normalized_staff_identity()','studioflow_private.guard_booking_conflict()'])
      assert.equal((await setup.query('select has_function_privilege($1,$2,$3) ok',[role,signature,'EXECUTE'])).rows[0].ok,false,`${role} cannot call private cross-ledger helper`);
  }
  await setup.query('set role anon');await assert.rejects(setup.query('select * from public.bookings'),/permission denied/i);await setup.query('reset role');
  console.log('PASS: both availability readers respect cross-ledger conflicts and private helpers remain inaccessible.');

  // Re-activation and rescheduling are writes too; a cancelled normalized row
  // cannot be reactivated or moved into an uncommitted canonical reservation.
  await clearBoth();const cancelled=(await normalizedInsert(setup,'09:00','10:00')).rows[0].id;
  await setup.query("update public.bookings set booking_status='cancelled' where id=$1",[cancelled]);
  await a.query('begin');await web(a,'09:00');
  pending=queryResult(direct.query("update public.bookings set booking_status='confirmed' where id=$1",[cancelled]));
  await assertBlocked(observer,direct,a,pending,'normalized reactivation');await a.query('commit');
  await rejectsResult(pending,/occupies|booking/i,'normalized reactivation');
  await clearBoth();const moving=(await normalizedInsert(setup,'12:00','13:00')).rows[0].id;
  await a.query('begin');await web(a,'09:00');
  pending=queryResult(direct.query("update public.bookings set start_time='09:30',end_time='10:30' where id=$1",[moving]));
  await assertBlocked(observer,direct,a,pending,'normalized move');await a.query('commit');
  await rejectsResult(pending,/occupies|booking/i,'normalized move');
  assert.equal((await setup.query('select start_time::text value from public.bookings where id=$1',[moving])).rows[0].value,'12:00:00');
  await clearBoth();const expiredCross=(await insertDirect(setup,'09:00','pending',new Date(Date.now()-60000),alice)).rows[0].id;
  await direct.query('begin');await normalizedInsert(direct,'09:00','10:00');
  pending=queryResult(direct2.query("update public.studioflow_bookings set status='confirmed',hold_expires_at=null where id=$1",[expiredCross]));
  await assertBlocked(observer,direct2,direct,pending,'canonical expired hold versus normalized');await direct.query('commit');
  await rejectsResult(pending,/booking|already has/i,'canonical expired hold versus normalized');
  console.log('PASS: cross-ledger reactivations, normalized moves and expired canonical holds recheck after locking.');

  await clearBoth();
  const terminal=(await normalizedInsert(setup,'09:00','10:00',{status:'confirmed',bookingStatus:'cancelled'})).rows[0].id;
  await setup.query("update public.bookings set studioflow_guard_starts_at=now(),studioflow_guard_ends_at=now()+interval '1 hour' where id=$1",[terminal]);
  assert.equal((await setup.query('select studioflow_guard_starts_at value from public.bookings where id=$1',[terminal])).rows[0].value,null,'terminal callers cannot forge internal snapshots');
  await insertDirect(setup,'09:00'); // booking_status takes precedence over status.
  await assert.rejects(setup.query("update public.bookings set booking_status='confirmed' where id=$1",[terminal]),/unverified.*rescheduled/i,'terminal rows without a verified instant cannot be reactivated unchanged');
  await assert.rejects(setup.query("update public.bookings set booking_status='confirmed',booking_date=$2 where id=$1",[terminal,date]),/unverified.*rescheduled/i,'filling an equivalent date field is not a reschedule');
  await setup.query("update public.bookings set booking_status='confirmed',start_time='11:00',end_time='12:00' where id=$1",[terminal]);
  assert.ok((await setup.query('select studioflow_guard_starts_at value from public.bookings where id=$1',[terminal])).rows[0].value,'an explicit new time derives a fresh snapshot');
  await clearBoth();
  const normalizedHold=(await normalizedInsert(setup,'09:00','10:00',{bookingStatus:'pending_payment'})).rows[0].id;
  await assert.rejects(insertDirect(setup,'09:00'),/booking|already has/i,'normalized pending payment blocks until explicitly released');
  await setup.query("update public.bookings set booking_status='expired' where id=$1",[normalizedHold]);
  await insertDirect(setup,'09:00');
  await clearBoth();
  const unknown=(await normalizedInsert(setup,'09:00','10:00',{status:'unrecognized',bookingStatus:null})).rows[0].id;
  await assert.rejects(insertDirect(setup,'09:00'),/booking|already has/i,'unknown normalized state is active, not free');
  await setup.query("update public.bookings set booking_status='completed' where id=$1",[unknown]);
  await insertDirect(setup,'09:00');
  console.log('PASS: normalized status precedence, terminal release, pending payment and unknown states are conservative.');

  // The database must not guess tenants, times or ambiguous owner identities.
  await clearBoth();
  await assert.rejects(normalizedInsert(setup,'09:00','10:00',{ownerId:bob}),/matching active owner/i);
  await assert.rejects(normalizedInsert(setup,'09:00','10:00',{staffId:foreignStaff}),/not in the selected salon/i);
  await assert.rejects(normalizedInsert(setup,'09:00','10:00',{staffId:null}),/requires an owner, salon and specialist/i);
  await assert.rejects(normalizedInsert(setup,'09:00','10:00',{ownerId:null}),/requires an owner, salon and specialist/i);
  await assert.rejects(normalizedInsert(setup,'09:00','10:00',{salonId:null}),/requires an owner, salon and specialist/i);
  await assert.rejects(normalizedInsert(setup,'10:00','09:00'),/valid date, time range and timezone/i);
  await assert.rejects(normalizedInsert(setup,'09:00','10:00',{bookingDate:'2099-01-01'}),/valid date, time range and timezone/i);
  await setup.query("insert into public.organization_members values($1,$2,'owner','active')",[normOrg,bob]);
  assert.deepEqual((await normalizedRead(normalized.service_id)).available_slots,[],'multiple owners fail closed on reads');
  await assert.rejects(normalizedInsert(setup,'09:00','10:00'),/one matching active owner/i);
  await setup.query('delete from public.organization_members where organization_id=$1 and user_id=$2',[normOrg,bob]);
  await direct.query('begin isolation level repeatable read');
  await assert.rejects(normalizedInsert(direct,'09:00','10:00'),/READ COMMITTED/i);await direct.query('rollback');
  const dst=(await setup.query("select studioflow_private.normalized_booking_window('2026-11-01','2026-11-01','01:00','02:00','America/New_York') is null invalid, studioflow_private.normalized_booking_window('2026-03-08','2026-03-08','02:00','03:00','America/New_York') is null gap")).rows[0];
  assert.equal(dst.invalid,true,'ambiguous fall-back windows fail closed');
  assert.equal(dst.gap,true,'nonexistent spring-forward windows fail closed');
  console.log('PASS: foreign staff, ambiguous owners, invalid dates, DST and unsafe isolation fail closed.');

  // Membership, salon and staff identity are part of the mapping. These tests
  // begin before the competing commit and prove the second session waited,
  // then saw that commit rather than a stale statement snapshot.
  await clearBoth();await direct.query('begin');await normalizedInsert(direct,'09:00','10:00');
  pending=queryResult(direct2.query("insert into public.organization_members values($1,$2,'owner','active')",[normOrg,bob]));
  await assertBlocked(observer,direct2,direct,pending,'owner addition after normalized write');await direct.query('commit');
  await rejectsResult(pending,/resolve active normalized appointments/i,'active booking prevents ambiguous owner addition');
  assert.equal(Number((await setup.query("select count(*) n from public.organization_members where organization_id=$1 and role='owner' and status='active'",[normOrg])).rows[0].n),1);
  await clearBoth();await direct2.query('begin');
  await direct2.query("insert into public.organization_members values($1,$2,'owner','active')",[normOrg,bob]);
  pending=queryResult(normalizedInsert(direct,'09:00','10:00'));
  await assertBlocked(observer,direct,direct2,pending,'normalized write after owner addition');await direct2.query('commit');
  await rejectsResult(pending,/one matching active owner/i,'writer sees newly ambiguous owner after wait');
  await setup.query('delete from public.organization_members where organization_id=$1 and user_id=$2',[normOrg,bob]);

  await direct.query('begin');await normalizedInsert(direct,'09:00','10:00');
  pending=queryResult(direct2.query('update public.salons set organization_id=$1 where id=$2',[foreignOrg,normSalon]));
  await assertBlocked(observer,direct2,direct,pending,'salon transfer after normalized write');await direct.query('commit');
  await rejectsResult(pending,/resolve active normalized appointments/i,'active booking prevents salon transfer');
  await assert.rejects(setup.query('update public.salons set deleted_at=now() where id=$1',[normSalon]),/resolve active normalized appointments/i);
  await assert.rejects(setup.query('delete from public.salons where id=$1',[normSalon]),/resolve active normalized appointments/i,'the guard does not depend on a fixture foreign key');
  await clearBoth();await direct2.query('begin');
  await direct2.query('update public.salons set organization_id=$1 where id=$2',[foreignOrg,normSalon]);
  pending=queryResult(normalizedInsert(direct,'09:00','10:00'));
  await assertBlocked(observer,direct,direct2,pending,'normalized write after salon transfer');await direct2.query('commit');
  await rejectsResult(pending,/one matching active owner/i,'writer sees the new salon owner after wait');
  await setup.query('update public.salons set organization_id=$1 where id=$2',[normOrg,normSalon]);

  await direct.query('begin');await normalizedInsert(direct,'09:00','10:00');
  pending=queryResult(direct2.query('update public.staff set salon_id=$1 where id=$2',[foreignSalon,normalized.staff_id]));
  await assertBlocked(observer,direct2,direct,pending,'staff transfer after normalized write');await direct.query('commit');
  await rejectsResult(pending,/resolve active normalized appointments/i,'active booking prevents staff transfer');
  await assert.rejects(setup.query('delete from public.staff where id=$1',[normalized.staff_id]),/resolve active normalized appointments/i);
  await clearBoth();await direct2.query('begin');
  await direct2.query('update public.staff set salon_id=$1 where id=$2',[foreignSalon,normalized.staff_id]);
  pending=queryResult(normalizedInsert(direct,'09:00','10:00'));
  await assertBlocked(observer,direct,direct2,pending,'normalized write after staff transfer');await direct2.query('commit');
  await rejectsResult(pending,/not in the selected salon/i,'writer sees staff transfer after wait');
  await setup.query('update public.staff set salon_id=$1 where id=$2',[normSalon,normalized.staff_id]);
  console.log('PASS: owner-membership, salon and specialist transfer races serialize in both directions.');

  // Moving an appointment between owners takes the destination owner's lock.
  await clearBoth();const foreignBooking=(await normalizedInsert(setup,'09:00','10:00',{ownerId:inkOwner,salonId:foreignSalon,staffId:foreignStaff})).rows[0].id;
  const moveToOwner=(c,id)=>c.query("update public.bookings set owner_id=$1,salon_id=$2,staff_id=$3,start_time='09:30',end_time='10:30' where id=$4",[owner,normSalon,normalized.staff_id,id]);
  await a.query('begin');await web(a,'09:00');pending=queryResult(moveToOwner(direct,foreignBooking));
  await assertBlocked(observer,direct,a,pending,'owner move versus canonical reservation');await a.query('commit');
  await rejectsResult(pending,/occupies|booking/i,'moving to a booked owner is rejected');
  assert.equal((await setup.query('select owner_id value from public.bookings where id=$1',[foreignBooking])).rows[0].value,inkOwner);
  await clearBoth();const foreignBooking2=(await normalizedInsert(setup,'09:00','10:00',{ownerId:inkOwner,salonId:foreignSalon,staffId:foreignStaff})).rows[0].id;
  await direct.query('begin');await moveToOwner(direct,foreignBooking2);pending=queryResult(web(b,'09:00'));
  await assertBlocked(observer,b,direct,pending,'canonical reservation versus owner move');await direct.query('commit');
  await rejectsResult(pending,/occupies|booking|booked|unavailable/i,'canonical writer sees the completed owner move');
  await clearBoth();
  console.log('PASS: moving a normalized appointment between owners rechecks both write orders.');

  // Compare real instants, not equal clock strings. Snapshot the original zone
  // so a later timezone edit or caller-supplied snapshot cannot move a booking.
  await setup.query("update public.salons set timezone='UTC' where id=$1",[normSalon]);
  const zoned=(await normalizedInsert(setup,'09:00','10:00')).rows[0];
  const expectedStart=(await setup.query("select ($1::date+'09:00'::time) at time zone 'UTC' value",[date])).rows[0].value;
  assert.equal(zoned.studioflow_guard_starts_at.toISOString(),expectedStart.toISOString());
  await setup.query("update public.salons set timezone='Asia/Kolkata' where id=$1",[normSalon]);
  await setup.query("update public.bookings set studioflow_guard_starts_at=now()-interval '1 year',studioflow_guard_ends_at=now()-interval '1 year'+interval '1 hour',staff_id=$2,booking_date=$3 where id=$1",[zoned.id,secondNormalizedStaff,date]);
  assert.equal((await setup.query('select studioflow_guard_starts_at value from public.bookings where id=$1',[zoned.id])).rows[0].value.toISOString(),expectedStart.toISOString(),'staff or equivalent date-field changes cannot move the saved instant');
  await assert.rejects(insertDirect(setup,'14:30'),/booking|already has/i,'UTC 09:00 overlaps IST 14:30 even after timezone changes');
  await setup.query("update public.bookings set booking_status='cancelled' where id=$1",[zoned.id]);
  await setup.query("update public.bookings set booking_status='confirmed' where id=$1",[zoned.id]);
  assert.equal((await setup.query('select studioflow_guard_starts_at value from public.bookings where id=$1',[zoned.id])).rows[0].value.toISOString(),expectedStart.toISOString(),'reactivation retains the original instant if wall-clock fields did not change');
  await assert.rejects(insertDirect(setup,'14:30'),/booking|already has/i);
  await setup.query("update public.bookings set booking_status='cancelled' where id=$1",[zoned.id]);
  await setup.query("update public.bookings set start_time='11:00',end_time='12:00' where id=$1",[zoned.id]);
  assert.equal((await setup.query('select studioflow_guard_starts_at value from public.bookings where id=$1',[zoned.id])).rows[0].value,null,'editing cancelled wall-clock inputs invalidates the old snapshot');
  await assert.rejects(setup.query("update public.bookings set booking_status='confirmed' where id=$1",[zoned.id]),/unverified.*rescheduled/i);
  await setup.query("update public.bookings set booking_status='confirmed',start_time='11:30',end_time='12:30' where id=$1",[zoned.id]);
  const changedStart=(await setup.query("select ($1::date+'11:30'::time) at time zone 'Asia/Kolkata' value",[date])).rows[0].value;
  assert.equal((await setup.query('select studioflow_guard_starts_at value from public.bookings where id=$1',[zoned.id])).rows[0].value.toISOString(),changedStart.toISOString(),'an explicit time move uses the current timezone');
  await setup.query(crossLedgerRepair);
  assert.equal((await setup.query('select studioflow_guard_starts_at value from public.bookings where id=$1',[zoned.id])).rows[0].value.toISOString(),changedStart.toISOString(),'replay retains an existing validated snapshot');
  await clearBoth();

  await direct.query('begin');const beforeZoneEdit=(await normalizedInsert(direct,'09:00','10:00')).rows[0];
  pending=queryResult(direct2.query("update public.salons set timezone='UTC' where id=$1",[normSalon]));
  await assertBlocked(observer,direct2,direct,pending,'timezone edit after normalized write');await direct.query('commit');
  assert.ok((await pending).value,'timezone edit succeeds after the booking commits');
  const istStart=(await setup.query("select ($1::date+'09:00'::time) at time zone 'Asia/Kolkata' value",[date])).rows[0].value;
  assert.equal(beforeZoneEdit.studioflow_guard_starts_at.toISOString(),istStart.toISOString());
  await assert.rejects(insertDirect(setup,'09:00'),/booking|already has/i,'the old instant remains occupied after a concurrent zone change');
  await clearBoth();await direct2.query('begin');
  await direct2.query("update public.salons set timezone='Asia/Kolkata' where id=$1",[normSalon]);
  pending=queryResult(normalizedInsert(direct,'09:00','10:00'));
  await assertBlocked(observer,direct,direct2,pending,'normalized write after timezone edit');await direct2.query('commit');
  assert.equal((await pending).value.rows[0].studioflow_guard_starts_at.toISOString(),istStart.toISOString(),'writer sees the committed timezone after waiting');
  await clearBoth();
  const oldValidZone=(await normalizedInsert(setup,'09:00','10:00')).rows[0].id;
  await setup.query("update public.salons set timezone='Not/A_Real_Zone' where id=$1",[normSalon]);
  await assert.rejects(setup.query("update public.bookings set booking_status='confirmed' where id=$1",[oldValidZone]),/valid date, time range and timezone/i,'an old snapshot does not permit active writes in an invalid current zone');
  await setup.query("update public.bookings set booking_status='cancelled' where id=$1",[oldValidZone]);
  await assert.rejects(setup.query("update public.bookings set booking_status='confirmed' where id=$1",[oldValidZone]),/valid date, time range and timezone/i,'reactivation also fails closed for an invalid current zone');
  await clearBoth();

  for(const invalidZone of ['Not/A_Real_Zone','',null]){
    await setup.query('update public.salons set timezone=$1 where id=$2',[invalidZone,normSalon]);
    await setup.query('set role anon');
    assert.deepEqual((await normalizedRead(normalized.service_id)).available_slots,[],'invalid or unknown zones return no public slots');
    await setup.query('reset role');
    await assert.rejects(normalizedInsert(setup,'09:00','10:00'),/valid date, time range and timezone/i);
  }
  await setup.query("update public.salons set timezone='Asia/Kolkata' where id=$1",[normSalon]);
  await setup.query('alter table public.bookings disable trigger zz_studioflow_normalized_cross_ledger_guard');
  try {await setup.query("insert into public.bookings(owner_id,salon_id,status) values($1,$2,'pending')",[owner,normSalon]);}
  finally {await setup.query('alter table public.bookings enable trigger zz_studioflow_normalized_cross_ledger_guard');}
  await assert.rejects(insertDirect(setup,'15:00'),/booking|already has/i,'unreviewed historical rows without snapshots block rather than disappear');
  await clearBoth();
  console.log('PASS: timezone snapshots, instant overlap and incomplete historical normalized rows fail closed.');

  // Calibrate the harness against the old gap: without the new trigger, two
  // direct writes really can commit overlapping appointments. This switch is
  // confined to the throwaway database and is always restored.
  await setup.query('alter table public.studioflow_bookings disable trigger studioflow_booking_conflict_guard');
  try {
    await direct.query('begin'); await insertDirect(direct,'09:00');
    await insertDirect(direct2,'09:30'); await direct.query('commit');
    assert.equal(await count(),2,'the negative control must demonstrate the previous direct-write race');
  } finally {
    await setup.query('alter table public.studioflow_bookings enable trigger studioflow_booking_conflict_guard');
    await clean();
  }
  console.log('PASS: negative control reproduces the old concurrent direct-write race.');

  // Same staff, different starts, overlapping duration: the Android request
  // must actually wait for the web transaction and recheck after it commits.
  await a.query('begin'); await web(a,'09:00');
  pending=queryResult(androidBook(b,'09:30'));
  await assertBlocked(observer,b,a,pending,'web versus Android overlap'); await a.query('commit');
  await rejectsResult(pending,/unavailable|booked|already has/i,'web versus Android overlap'); assert.equal(await count(),1);
  console.log('PASS: simultaneous web/Android overlapping bookings serialize and only one commits.');

  await clean(); await a.query('begin'); await androidBook(a,'09:00');
  pending=queryResult(insertDirect(direct,'09:30'));
  await assertBlocked(observer,direct,a,pending,'Android versus direct appointment'); await a.query('commit');
  await rejectsResult(pending,/already has|booked|unavailable/i,'Android versus direct appointment'); assert.equal(await count(),1);
  console.log('PASS: direct/service-role appointment writes share the RPC conflict lock.');
  await clean(); await direct.query('begin'); await insertDirect(direct,'09:00');
  pending=queryResult(insertDirect(direct2,'09:30'));
  await assertBlocked(observer,direct2,direct,pending,'two direct overlapping writes'); await direct.query('commit');
  await rejectsResult(pending,/already has|booked/i,'two direct overlapping writes'); assert.equal(await count(),1);
  await clean(); await direct.query('begin'); await insertDirect(direct,'09:00');
  pending=queryResult(web(b,'09:30'));
  await assertBlocked(observer,b,direct,pending,'direct appointment versus website'); await direct.query('commit');
  await rejectsResult(pending,/already has|booked|unavailable/i,'direct appointment versus website'); assert.equal(await count(),1);
  console.log('PASS: two direct writes and direct-first/website-second conflicts are rejected.');

  await clean(); await a.query('begin'); await web(a,'09:00');
  pending=queryResult(androidBook(b,'09:30'));
  await assertBlocked(observer,b,a,pending,'rolled-back booking'); await a.query('rollback');
  assert.ok((await pending).value,'waiting booking succeeds when the first transaction rolls back'); assert.equal(await count(),1);
  console.log('PASS: waiting booking succeeds after the competing transaction rolls back.');

  await clean(); await auth(b,alice); const request=crypto.randomUUID();
  await a.query('begin'); const first=(await androidBook(a,'09:00','one',request)).rows[0].value;
  pending=queryResult(androidBook(b,'09:00','one',request));
  await assertBlocked(observer,b,a,pending,'concurrent identical Android retries'); await a.query('commit');
  const retry=(await pending).value.rows[0].value;
  assert.equal(retry.id,first.id);assert.equal(await count(),1);
  console.log('PASS: concurrent identical request IDs return one reservation.');

  await clean(); const demoRequest=crypto.randomUUID();
  const demo=(c,time)=>c.query('select public.studioflow_branch_demo_book($1,$2,$3,$4,$5,$6,$7,$8,$9) value',['race-salon','["cut"]',date,time,'one','Test Customer','9876543210',demoRequest,branchId]);
  await a.query('begin'); const demoFirst=(await demo(a,'13:00')).rows[0].value;
  pending=queryResult(demo(b,'13:00'));
  await assertBlocked(observer,b,a,pending,'concurrent identical demo retries'); await a.query('commit');
  assert.equal((await pending).value.rows[0].value.id,demoFirst.id);
  assert.equal(Number((await setup.query('select count(*) n from public.studioflow_demo_bookings')).rows[0].n),1);
  assert.equal(await count(),0,'practice receipts never create a real reservation');
  await assert.rejects(demo(b,'13:30'),/request changed/i);
  console.log('PASS: concurrent practice retries create one isolated zero-price receipt.');

  await clean(); await auth(b,bob); await a.query('begin'); await web(a,'09:00');
  pending=queryResult(androidBook(b,'10:00'));
  await assertBlocked(observer,b,a,pending,'adjacent appointments'); await a.query('commit');
  assert.ok((await pending).value,'adjacent, non-overlapping times can both commit'); assert.equal(await count(),2);
  await clean(); await a.query('begin'); await web(a,'09:00','one');
  const independent=await Promise.race([web(b,'09:00','two'),delay(4000).then(()=>{throw new Error('different specialists blocked each other');})]);
  assert.ok(independent.rows[0].value);await a.query('commit');assert.equal(await count(),2);
  console.log('PASS: adjacent times and independent specialists are not falsely rejected.');

  // The deployed checkout migration predates these repairs. Exercise its
  // real venue and captured-payment triggers against the new conflict guard,
  // with a second session competing for the same staff and time.
  await clean();
  await a.query('begin');
  const venueBooking=(await web(a,'09:00')).rows[0].value;
  await a.query('reset role'); // The Edge checkout RPC is service-only.
  const venue=(await a.query('select public.studioflow_prepare_web_checkout($1,$2,$3,$4,$5) value',[venueBooking.id,alice,'alice@example.test','venue',true])).rows[0].value;
  assert.equal(venue.status,'confirmed'); assert.equal(venue.paymentStatus,'pay_at_salon'); assert.equal(Number(venue.amountPaid),0);
  pending=queryResult(web(b,'09:30'));
  await assertBlocked(observer,b,a,pending,'venue confirmation versus new reservation');await a.query('commit');await auth(a,alice);
  await rejectsResult(pending,/unavailable|booked|already has/i,'venue confirmation versus new reservation');
  assert.equal(Number((await setup.query('select count(*) n from public.studioflow_booking_receipts where booking_id=$1',[venueBooking.id])).rows[0].n),3);
  assert.equal(Number((await setup.query('select count(*) n from public.studioflow_payment_orders where booking_id=$1',[venueBooking.id])).rows[0].n),0);

  await clean();
  await a.query('begin');
  const onlineBooking=(await web(a,'09:00')).rows[0].value;
  await a.query('reset role');
  await a.query('select public.studioflow_prepare_web_checkout($1,$2,$3,$4,$5)',[onlineBooking.id,alice,'alice@example.test','online',true]);
  const pricePaise=Math.round(Number(onlineBooking.servicePrice)*100);
  await a.query('select public.studioflow_register_full_web_payment($1,$2,$3)',[onlineBooking.id,'order_checkoutfixture',pricePaise]);
  const settled=(await a.query('select public.studioflow_settle_payment($1,$2,$3) value',['order_checkoutfixture','pay_checkoutfixture',pricePaise])).rows[0].value;
  assert.equal(settled.status,'confirmed');assert.equal(settled.paymentStatus,'paid_full');assert.equal(Number(settled.amountPaid),pricePaise/100);
  pending=queryResult(web(b,'09:30'));
  await assertBlocked(observer,b,a,pending,'captured payment versus new reservation');await a.query('commit');await auth(a,alice);
  await rejectsResult(pending,/unavailable|booked|already has/i,'captured payment versus new reservation');
  assert.equal(Number((await setup.query('select count(*) n from public.studioflow_booking_receipts where booking_id=$1',[onlineBooking.id])).rows[0].n),3);

  // Realistic late capture: the first reservation was committed, then expired;
  // a competing booking holds the specialist lock while settlement waits.
  await clean();
  const lateBooking=(await web(a,'09:00')).rows[0].value;
  await setup.query('select public.studioflow_prepare_web_checkout($1,$2,$3,$4,$5)',[lateBooking.id,alice,'alice@example.test','online',true]);
  await setup.query('select public.studioflow_register_full_web_payment($1,$2,$3)',[lateBooking.id,'order_latefixture',pricePaise]);
  await setup.query("update public.studioflow_bookings set hold_expires_at=now()-interval '1 minute' where id=$1",[lateBooking.id]);
  await b.query('begin');await web(b,'09:00');
  pending=queryResult(direct.query('select public.studioflow_settle_payment($1,$2,$3) value',['order_latefixture','pay_latefixture',pricePaise]));
  await assertBlocked(observer,direct,b,pending,'late captured payment versus new reservation');await b.query('commit');
  const late=await pending;
  assert.ok(late.value,late.error?.message);assert.equal(late.value.rows[0].value.refund_required,true);
  assert.equal(Number((await setup.query('select count(*) n from public.studioflow_booking_receipts where booking_id=$1',[lateBooking.id])).rows[0].n),0);
  assert.equal(await count(),1);
  console.log('PASS: deployed checkout receipt triggers, venue confirmation and full-payment settlement coexist with the new concurrency guard; a late capture requires refund.');

  // Negative control for the previously deployed settlement definition: a
  // transaction that started before hold expiry can wait on the specialist
  // lock while a normalized appointment wins after expiry. With now() frozen
  // at transaction start, the old function tries to confirm and its trigger
  // exception rolls back the refund marker for the simulated captured payment.
  const patchedSettlement=(await setup.query("select pg_get_functiondef('studioflow_private.settle_payment(text,text,bigint)'::regprocedure) body")).rows[0].body;
  const oldSettlement=matchDefinition(sqlFile('backend/studioflow-payments-realtime.sql'),/create or replace function studioflow_private\.settle_payment\([\s\S]*?end \$\$;/i,'previous payment settlement');
  const crossSettlementRace=async(patched)=>{
    await clearBoth();
    const booking=(await web(a,'09:00')).rows[0].value;
    await setup.query('select public.studioflow_prepare_web_checkout($1,$2,$3,$4,$5)',[booking.id,alice,'alice@example.test','online',true]);
    const suffix=patched?'newcross':'oldcross';
    await setup.query('select public.studioflow_register_full_web_payment($1,$2,$3)',[booking.id,'order_'+suffix,pricePaise]);
    const expiry=(await setup.query("update public.studioflow_bookings set hold_expires_at=clock_timestamp()+interval '3 seconds' where id=$1 returning hold_expires_at",[booking.id])).rows[0].hold_expires_at;
    await direct2.query('begin');
    await direct2.query('select pg_advisory_xact_lock(hashtextextended($1::text||$2,0))',[owner,'one']);
    await direct.query('begin');
    const transactionStarted=(await direct.query('select now() value')).rows[0].value;
    assert.ok(transactionStarted<expiry,'settlement transaction starts before hold expiry');
    const settlement=queryResult(direct.query('select public.studioflow_settle_payment($1,$2,$3) value',['order_'+suffix,'pay_'+suffix,pricePaise]));
    await assertBlocked(observer,direct,direct2,settlement,'settlement waiting across hold expiry');
    await setup.query("select pg_sleep(greatest(0,extract(epoch from ($1::timestamptz-clock_timestamp()))+0.1))",[expiry]);
    await ownerClient.query('begin');await normalizedInsert(ownerClient,'09:00','10:00');
    await direct2.query('commit');
    await assertBlocked(observer,direct,ownerClient,settlement,'settlement waiting on the normalized winner');
    await ownerClient.query('commit');
    const result=await settlement;
    if(patched){
      assert.ok(result.value,result.error?.message);assert.equal(result.value.rows[0].value.refund_required,true);
      await direct.query('commit');
      assert.equal((await setup.query('select status from public.studioflow_payment_orders where booking_id=$1',[booking.id])).rows[0].status,'refund_required');
    }else{
      assert.ok(result.error,'the old settlement must hit the cross-ledger trigger');assert.match(result.error.message,/booking|already has/i);
      await direct.query('rollback');
      assert.equal((await setup.query('select status from public.studioflow_payment_orders where booking_id=$1',[booking.id])).rows[0].status,'created','the old function loses its refund marker');
    }
    assert.equal(Number((await setup.query('select count(*) n from public.studioflow_booking_receipts where booking_id=$1',[booking.id])).rows[0].n),0);
    assert.equal(await normalizedCount(),1);
  };
  await setup.query(oldSettlement);
  try {await crossSettlementRace(false);} finally {await setup.query(patchedSettlement);}
  await crossSettlementRace(true);
  await clearBoth();
  const onTime=(await web(a,'09:00')).rows[0].value;
  await setup.query('select public.studioflow_prepare_web_checkout($1,$2,$3,$4,$5)',[onTime.id,alice,'alice@example.test','online',true]);
  await setup.query('select public.studioflow_register_full_web_payment($1,$2,$3)',[onTime.id,'order_ontimecross',pricePaise]);
  await direct.query('begin isolation level repeatable read');
  await assert.rejects(direct.query('select public.studioflow_settle_payment($1,$2,$3)',['order_ontimecross','pay_ontimecross',pricePaise]),/READ COMMITTED/i,'settlement cannot decide with an unsafe snapshot');
  await direct.query('rollback');
  await direct.query('begin');
  assert.equal((await direct.query('select public.studioflow_settle_payment($1,$2,$3) value',['order_ontimecross','pay_ontimecross',pricePaise])).rows[0].value.status,'confirmed');
  pending=queryResult(normalizedInsert(ownerClient,'09:00','10:00'));
  await assertBlocked(observer,ownerClient,direct,pending,'on-time settlement versus normalized writer');await direct.query('commit');
  await rejectsResult(pending,/occupies|booking/i,'on-time settlement remains the winner');
  for(const role of ['anon','authenticated','service_role'])
    assert.equal((await setup.query("select has_function_privilege($1,'studioflow_private.settle_payment(text,text,bigint)','execute') ok",[role])).rows[0].ok,role==='service_role','settlement ACL is preserved');
  await clearBoth();
  console.log('PASS: late cross-ledger capture persists refund_required after a real lock wait; an on-time settlement still wins.');

  await clean(); const original=(await insertDirect(setup,'10:00','confirmed',null,alice)).rows[0].id;
  await a.query('begin'); await a.query('select public.studioflow_android_reschedule($1,$2,$3,$4)',[original,date,'12:00','one']);
  pending=queryResult(web(b,'12:30'));
  await assertBlocked(observer,b,a,pending,'reschedule versus new booking');await a.query('commit');
  await rejectsResult(pending,/unavailable|booked|already has/i,'reschedule versus new booking');
  assert.equal((await setup.query('select payload->>\'time\' time from public.studioflow_bookings where id=$1',[original])).rows[0].time,'12:00');
  console.log('PASS: a reschedule and a competing reservation cannot occupy overlapping intervals.');

  await clean(); const expired=(await insertDirect(setup,'12:00','pending',new Date(Date.now()-60000),alice)).rows[0].id;
  await a.query('begin');await web(a,'12:00');
  pending=queryResult(direct.query("update public.studioflow_bookings set status='confirmed',hold_expires_at=null where id=$1",[expired]));
  await assertBlocked(observer,direct,a,pending,'expired hold reactivation');await a.query('commit');
  await rejectsResult(pending,/already has|booked/i,'expired hold reactivation');assert.equal(await count(),1);
  await clean(); await a.query('begin isolation level repeatable read');
  await assert.rejects(web(a,'09:00'),/READ COMMITTED/i,'stale repeatable-read snapshots fail closed');await a.query('rollback');
  console.log('PASS: expired holds cannot be reactivated into conflicts; unsafe snapshot isolation fails closed.');

  const ink=async(c,time,artistId=artist)=>c.query('select * from public.create_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[inkOwner,'Test Guest','9876543210','',category,artistId,date,time,'1990-01-01',5,'Forearm','Synthetic request',[]]);
  const cleanInk=async()=>{await setup.query('delete from public.ink_notifications');await setup.query('delete from public.ink_bookings');};
  await auth(a,null);await auth(b,null);await a.query('begin');const inkFirst=await ink(a,'09:00');
  assert.equal(inkFirst.rows[0].status,'pending');assert.equal(inkFirst.rows[0].deposit_paid,false);
  pending=queryResult(ink(b,'09:30'));
  await assertBlocked(observer,b,a,pending,'overlapping tattoo requests');await a.query('commit');
  await rejectsResult(pending,/not available|already has|duplicate/i,'overlapping tattoo requests');
  assert.equal(Number((await setup.query('select count(*) n from public.ink_bookings')).rows[0].n),1);
  await cleanInk();await a.query('begin');await ink(a,'09:00');
  assert.ok((await ink(b,'09:00',artist2)).rows[0].id,'another tattoo artist remains independent');await a.query('commit');
  console.log('PASS: competing unpaid tattoo requests serialize; different artists remain independent.');

  await cleanInk(); const inkOriginal=(await ink(a,'09:00')).rows[0].id;
  await auth(a,inkOwner);await a.query('begin');
  await a.query("update public.ink_bookings set start_time='11:00' where id=$1",[inkOriginal]);
  pending=queryResult(ink(b,'11:30'));
  await assertBlocked(observer,b,a,pending,'owner tattoo move versus guest request');await a.query('commit');
  await rejectsResult(pending,/not available|already has|duplicate/i,'owner tattoo move versus guest request');
  await cleanInk(); await auth(a,null); await a.query('begin isolation level repeatable read');
  await assert.rejects(ink(a,'09:00'),/READ COMMITTED/i);await a.query('rollback');
  console.log('PASS: owner tattoo moves serialize with guest requests; unsafe snapshot isolation fails closed.');
  console.log(`PASS: real PostgreSQL ${Math.floor(meta.version/10000)} multi-session integration; all three actual booking migrations applied and replayed in a disposable database.`);
} finally {
  await Promise.allSettled(clients.reverse().map(c=>c.end()));
  if(createdDb) await admin.query(`drop database ${dbName} with (force)`);
  for(const role of createdRoles.reverse()) await admin.query(`drop role ${role}`);
  await admin.end();
}
