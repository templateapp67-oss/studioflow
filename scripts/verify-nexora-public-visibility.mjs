// Isolated PGlite regression fixture. Not a substitute for staging tests against
// the deployed schema, all policies, grants, views and real application clients.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid$$;
grant usage on schema public, auth to anon, authenticated;
create table public.salons(id uuid primary key, is_active boolean, deleted_at timestamptz, owner_id uuid);
create table public.services(id uuid primary key, salon_id uuid references public.salons, is_active boolean, is_bookable_online boolean);
create table public.staff(id uuid primary key, salon_id uuid references public.salons, is_active boolean, is_public boolean, deleted_at timestamptz);
alter table public.salons enable row level security; alter table public.services enable row level security; alter table public.staff enable row level security;
grant select on public.salons, public.services, public.staff to anon, authenticated;
create policy public_live_site_salons_read on public.salons for select to anon, authenticated using (is_active);
create policy salons_public_read on public.salons for select to anon, authenticated using (true);
create policy public_live_site_services_read on public.services for select to anon, authenticated using (true);
create policy services_public_read on public.services for select to anon, authenticated using (is_active);
create policy public_live_site_staff_read on public.staff for select to anon, authenticated using (true);
create policy staff_public_read on public.staff for select to anon, authenticated using (is_active);
create policy salons_owner_test on public.salons for select to authenticated using (owner_id=auth.uid());
insert into public.salons values
 ('10000000-0000-0000-0000-000000000001',true,null,'90000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000002',false,null,'90000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000003',true,now(),null);
insert into public.services values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',true,true),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001',true,false),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002',true,true),
 ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000003',true,true),
 ('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001',false,true);
insert into public.staff values
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',true,true,null),
 ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001',true,false,null),
 ('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002',true,true,null),
 ('30000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000003',true,true,null),
 ('30000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001',true,true,now());
`);
const migration = readFileSync('supabase/migrations/202611070007_nexora_public_visibility_reconcile.sql','utf8');
await db.exec(migration); await db.exec(migration);
await db.exec('set role anon');
for (const table of ['salons','services','staff']) {
  const {rows} = await db.query(`select id from public.${table}`);
  assert.equal(rows.length,1,`${table}: anon only sees published active rows`);
  assert.ok(rows[0].id.endsWith('0001'));
}
await db.exec("reset role; select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',false); set role authenticated;");
assert.equal((await db.query('select id from public.salons')).rows.length,2,'existing owner policy still permits own inactive salon');
assert.equal((await db.query('select id from public.services')).rows.length,1,'owner salon visibility does not publish inactive-salon services');
await db.exec('reset role');
await db.close();
console.log('PASS: repeated migration, anonymous visibility and existing owner policy in an isolated RLS fixture.');
