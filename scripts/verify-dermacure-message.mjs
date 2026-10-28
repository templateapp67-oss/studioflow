import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
try {
await db.exec(`create role anon;create role authenticated;create schema auth;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.studioflow_bookings(id uuid primary key,customer_id uuid,status text,payload jsonb);
insert into public.studioflow_bookings values('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','pending','{"servicePrice":1000}');`);
await db.exec(readFileSync('backend/dermacure-consultation-message.sql','utf8'));
const save=message=>db.query('select public.studioflow_save_booking_message($1,$2)',['11111111-1111-4111-8111-111111111111',message]);
await assert.rejects(()=>save('No session'));
await db.exec(`set request.jwt.claim.sub='33333333-3333-4333-8333-333333333333'`);
await assert.rejects(()=>save('Other customer'));
await db.exec(`set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222'`);
await assert.rejects(()=>save('a'.repeat(1001)));
await save('  Please discuss sensitivity  ');
const {rows}=await db.query('select payload from public.studioflow_bookings');
assert.deepEqual(rows[0].payload,{servicePrice:1000,consultationMessage:'Please discuss sensitivity'});
await db.exec("update public.studioflow_bookings set status='confirmed'");
await assert.rejects(()=>save('Cannot alter settled booking'));
console.log('PASS: consultation message requires authentication, booking ownership and pending state; length bound and existing price preserved. Offline PostgreSQL fixture only.');
}finally{await db.close();}
