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
  const bookingRepair=sqlFile('supabase/migrations/20261127140001_booking_slot_availability_repair.sql');
  const inkRepair=sqlFile('supabase/migrations/20261127140100_iron_ink_availability_ist.sql');
  // Exercise the real transactional migrations in release order, then replay
  // the complete ordered pair rather than repeating each file in isolation.
  await setup.query(bookingRepair); await setup.query(inkRepair);
  await setup.query(bookingRepair); await setup.query(inkRepair);
  const branch=sqlFile('supabase/migrations/20261114115141_studioflow_branch_android_slots.sql');
  for(const name of ['studioflow_branch_book','studioflow_branch_android_book','studioflow_android_reschedule']){
    await setup.query(matchDefinition(branch,new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$;`,'i'),name));
  }
  const android=sqlFile('supabase/migrations/20261122065342_branch_scope_private_booking_guards.sql');
  await setup.query(matchDefinition(android,/create or replace function studioflow_android_private\.reschedule\([\s\S]*?\$function\$\s*;/i,'Android reschedule'));
  const addons=sqlFile('supabase/migrations/20261117130000_reconcile_template15_multiservice_booking.sql');
  await setup.query(matchDefinition(addons,/create or replace function studioflow_private\.book_with_addons\(p_slug text,p_request jsonb\)[\s\S]*?end \$\$;/i,'website add-ons'));
  await setup.query(`grant execute on function studioflow_private.book_with_addons(text,jsonb),
    studioflow_android_private.book(text,jsonb,date,text,text,text,text,text,uuid),
    studioflow_android_private.reschedule(uuid,date,text,text) to authenticated;
    grant execute on function public.studioflow_branch_book(text,jsonb),public.studioflow_branch_android_book(text,jsonb,date,text,text,text,text,text,uuid,uuid),public.studioflow_android_reschedule(uuid,date,text,text) to authenticated;`);

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
  const clean=async()=>{await setup.query('delete from public.studioflow_android_requests');await setup.query('delete from public.studioflow_bookings');};
  const count=async()=>Number((await setup.query("select count(*) n from public.studioflow_bookings where status in ('pending','confirmed') and (status='confirmed' or hold_expires_at is null or hold_expires_at>now())")).rows[0].n);
  const insertDirect=(c,time,status='confirmed',hold=null,customer=bob)=>c.query(`insert into public.studioflow_bookings(owner_id,customer_id,stylist_id,starts_at,ends_at,status,hold_expires_at,payload,branch_id)
    values($1,$2,'one',($3::date+$4::time) at time zone 'Asia/Kolkata',($3::date+$4::time+interval '60 minutes') at time zone 'Asia/Kolkata',$5,$6,$7,$8) returning id`,[owner,customer,date,time,status,hold,JSON.stringify({serviceId:'cut',date,time,stylistId:'one'}),branchId]);

  // Calibrate the harness against the old gap: without the new trigger, two
  // direct writes really can commit overlapping appointments. This switch is
  // confined to the throwaway database and is always restored.
  const direct2=await connect();
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
  let pending=queryResult(androidBook(b,'09:30'));
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
  console.log(`PASS: real PostgreSQL ${Math.floor(meta.version/10000)} multi-session integration; both actual migrations applied and replayed in a disposable database.`);
} finally {
  await Promise.allSettled(clients.reverse().map(c=>c.end()));
  if(createdDb) await admin.query(`drop database ${dbName} with (force)`);
  for(const role of createdRoles.reverse()) await admin.query(`drop role ${role}`);
  await admin.end();
}
