import assert from 'node:assert/strict';

// Runs against the repository's assembled backend schema in PGlite, not live
// Supabase. A real staging deployment and adversarial API testing are required.
export async function verifyAdminTenantIsolation(db) {
  const ownerA='c9a44111-1111-4111-8111-111111111111';
  const ownerB='d8a22222-2222-4222-8222-222222222222';
  const customer='c9a44222-2222-4222-8222-222222222222';
  const unrelated='d8a44444-4444-4444-8444-444444444444';
  const booking=(await db.query("select id from public.studioflow_bookings where owner_id=$1 and customer_id=$2 and status='pending' limit 1",[ownerA,customer])).rows[0].id;
  await db.query(`insert into auth.users(id,email) values ($1,'admin-b@example.invalid'),($2,'unrelated@example.invalid')`,[ownerB,unrelated]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ownerB]);
  await db.query('insert into public.studioflow_accounts(user_id,draft) values($1,$2)',[ownerB,{private:'tenant B'}]);
  const actor=async id=>{await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); await db.exec('set role authenticated');};
  const count=async (table,id)=>(await db.query(`select count(*)::int as n from public.${table} where ${table==='studioflow_accounts'?'user_id':'id'}=$1`,[id])).rows[0].n;
  await actor(ownerA);
  assert.equal(await count('studioflow_accounts',ownerA),1,'owner A reads only their own workspace');
  assert.equal(await count('studioflow_bookings',booking),1,'owner A sees their booking');
  await actor(ownerB);
  assert.equal(await count('studioflow_accounts',ownerB),1,'owner B reads their own workspace');
  assert.equal(await count('studioflow_accounts',ownerA),0,'owner B cannot read owner A workspace');
  assert.equal(await count('studioflow_bookings',booking),0,'owner B cannot read owner A booking');
  await assert.rejects(()=>db.query('select public.studioflow_update_booking($1,$2)',[booking,'cancelled']),/unavailable|permission|access/i,'another owner cannot change booking');
  await actor(unrelated);
  assert.equal(await count('studioflow_accounts',ownerA),0,'unrelated user cannot read workspaces');
  assert.equal(await count('studioflow_bookings',booking),0,'unrelated user cannot read bookings');
  await assert.rejects(()=>db.query('select public.studioflow_update_booking($1,$2)',[booking,'cancelled']),/unavailable|permission|access/i,'unrelated user cannot change booking');
  await actor(customer);
  assert.equal(await count('studioflow_bookings',booking),1,'booking customer can read their booking');
  await assert.rejects(()=>db.query('select public.studioflow_update_booking($1,$2)',[booking,'completed']),/owner|access|unavailable/i,'customer cannot complete booking');
  await db.exec('reset role');
  console.log('PASS: actual assembled admin workspace and booking RLS isolates two owners, a customer and an unrelated user.');
}
