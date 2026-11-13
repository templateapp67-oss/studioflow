/**
 * TEMPLATE 03 — Aura Unisex Salon & Wellness Lounge
 * Offline end-to-end verification of the Supabase Promotions & Offers feature.
 *
 * Runs the real migrations against an in-process Postgres (PGlite) with a
 * stubbed Supabase surface, then exercises the exact RPCs the UI calls:
 *   1. add new offer          2. edit offer              3. delete offer
 *   4. activate offer         5. deactivate offer        6. customer-side display
 *   7. copy coupon code (UI suite)  8. apply valid coupon
 *   9. apply invalid coupon  10. apply expired coupon   11. discount calculation
 *  12. usage limits          13. data saved after refresh
 * Plus RLS isolation, secure backend-only discounting, redemption saved only
 * after booking confirmation and duplicate-redemption prevention.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table public.app_admins(user_id uuid primary key);
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,raw_app_meta_data jsonb,banned_until timestamptz,deleted_at timestamptz,is_anonymous boolean);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.role() returns text language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),current_user)$$;
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
try { await db.exec(`create schema extensions; create extension pgcrypto with schema extensions;`); }
catch {
  await db.exec(`create schema if not exists extensions;
create or replace function extensions.gen_random_bytes(n integer) returns bytea language sql as $$select decode(md5(random()::text),'hex')$$;
create or replace function extensions.digest(data text,algo text) returns bytea language sql as $$select decode(md5(data),'hex')$$;`);
}

// Dollar-quote-aware splitter (naive ';' splitting breaks plpgsql bodies).
const splitSql = (sql) => {
  const out = []; let cur = '', i = 0, tag = null, quote = false, line = false;
  while (i < sql.length) {
    const two = sql.slice(i, i + 2);
    if (line) { cur += sql[i]; if (sql[i] === '\n') line = false; i++; continue; }
    if (two === '--' && !quote && !tag) { line = true; cur += two; i += 2; continue; }
    if (sql[i] === "'" && !tag) { if (sql[i + 1] === "'") { cur += "''"; i += 2; continue; } quote = !quote; cur += sql[i]; i++; continue; }
    if (sql[i] === '$' && !quote) {
      const m = sql.slice(i).match(/^\$[A-Za-z_0-9]*\$/);
      if (m) { if (!tag) tag = m[0]; else if (tag === m[0]) tag = null; cur += m[0]; i += m[0].length; continue; }
    }
    if (sql[i] === ';' && !quote && !tag) { if (cur.trim()) out.push(cur); cur = ''; i++; continue; }
    cur += sql[i]; i++;
  }
  if (cur.trim()) out.push(cur);
  return out;
};
const applyFile = async (text) => {
  const stmts = splitSql(text).filter((s) => !/^\s*(begin|commit)\s*;?\s*$/i.test(s));
  await db.exec('BEGIN');
  try { for (const s of stmts) await db.exec(s); await db.exec('COMMIT'); }
  catch (e) { try { await db.exec('ROLLBACK'); } catch {} throw e; }
};

const files = readdirSync('backend').filter((n) => n.endsWith('.sql') && !n.includes('verification')).sort();
const pending = new Map(files.map((n) => [n, '']));
const ANCHORED = ['studioflow-shared-tables.sql', 'studioflow-schema.sql', 'studioflow-android-foundation.sql', 'customer-portal.sql', 'starter-packages.sql'];
const LATE = ['customer-discovery-sections.sql', 'starter-packages-onboarding-guard.sql', 'studioflow-customer-wiring-gaps.sql', 'booking-coupons.sql', 'booking-add-ons.sql', 'customer-demo-bookings.sql', 'studioflow-pos-refunds.sql'];
const order = [...ANCHORED.filter((f) => pending.has(f)), ...[...pending.keys()].filter((f) => !ANCHORED.includes(f) && !LATE.includes(f)), ...LATE.filter((f) => pending.has(f))];
for (let round = 0; round < 12 && pending.size; round++) {
  let progress = false;
  for (const name of order) {
    if (!pending.has(name)) continue;
    try { await applyFile(readFileSync('backend/' + name, 'utf8')); pending.delete(name); progress = true; }
    catch (e) { pending.set(name, String(e.message || e).split('\n')[0].slice(0, 300)); }
  }
  if (!progress) break;
}
assert.equal(pending.size, 0, 'All base migrations converge: ' + [...pending].map(([n, e]) => `${n}: ${e}`).join('\n'));

const MIGRATIONS = [
  'supabase/migrations/202610300003_template12_iron_ink.sql',
  'supabase/migrations/202610300004_multibranch_support.sql',
  'supabase/migrations/202611020001_ziya_promotions_and_loyalty.sql',
  'supabase/migrations/202611030001_aura_template03_content.sql',
  'supabase/migrations/202611030002_aura_unisex_promotions.sql',
];
for (const file of MIGRATIONS) await db.exec(readFileSync(file, 'utf8'));
// Idempotent: re-applying the Template 03 promotion migration must not duplicate rows.
await db.exec(readFileSync(MIGRATIONS[4], 'utf8'));
await db.exec(readFileSync(MIGRATIONS[4], 'utf8'));

async function asUser(userId, role, fn) {
  await db.exec(`
    set role ${role};
    select set_config('request.jwt.claim.role', '${role}', false);
    select set_config('request.jwt.claim.sub', '${userId || ''}', false);
    select set_config('request.jwt.claims', '${userId ? JSON.stringify({ sub: userId, role }) : '{}'}', false);
  `);
  try { return await fn(); }
  finally {
    await db.exec(`reset role;
      select set_config('request.jwt.claim.role', '', false);
      select set_config('request.jwt.claim.sub', '', false);
      select set_config('request.jwt.claims', '', false);`);
  }
}
const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
const customerA = '33333333-3333-4333-8333-333333333333';
const customerB = '44444444-4444-4444-8444-444444444444';
const SLUG = 'aura-unisex-salon';
const services = [
  { id: 'us-1', name: 'Designer Unisex Haircut & Moroccan Conditioning', category: 'Unisex Haircuts', price: 650, description: 'Existing Aura salon service.', durationMinutes: 45 },
  { id: 'us-2', name: 'Express Glow Organic Cleanup & De-Tan', category: 'Skin Cleanups', price: 850, description: 'Existing Aura salon service.', durationMinutes: 40 },
  { id: 'us-3', name: 'Global Ammonia-Free Inoa Hair Color', category: 'Botanical Color', price: 2800, description: 'Existing Aura salon service.', durationMinutes: 90 },
  { id: 'us-4', name: 'Deluxe Paraffin Spa Pedicure', category: 'Hands & Feet Care', price: 850, description: 'Existing Aura salon service.', durationMinutes: 50 },
  { id: 'us-5', name: 'Olaplex Bond Repair', category: 'Botanical Color', price: 1650, description: 'Existing Aura salon service.', durationMinutes: 45 },
  { id: 'us-6', name: 'Men’s Haircut & Beard Styling', category: 'Men’s Grooming', price: 550, description: 'Existing Aura salon service.', durationMinutes: 45 },
  { id: 'us-7', name: 'Hair Spa & Deep Conditioning', category: 'Hair Care', price: 1200, description: 'Existing Aura salon service.', durationMinutes: 60 },
  { id: 'us-8', name: 'Relaxing Head, Neck & Shoulder Massage', category: 'Wellness', price: 700, description: 'Existing Aura salon service.', durationMinutes: 30 },
  { id: 'us-9', name: 'Aroma Foot Reflexology', category: 'Wellness', price: 650, description: 'Existing Aura salon service.', durationMinutes: 30 },
  { id: 'us-10', name: 'Women’s Hair Styling & Blow Dry', category: 'Hair Care', price: 1100, description: 'Existing Aura salon service.', durationMinutes: 45 },
  { id: 'us-11', name: 'Threading & Eyebrow Shaping', category: 'Beauty', price: 250, description: 'Existing Aura salon service.', durationMinutes: 20 },
];
const stylists = [{ id: 'us-st-1', name: 'Priya Nair', role: 'Salon Director', status: 'Available', schedule: [], assignedServices: [] }];

await db.exec(`
  insert into auth.users(id, email, raw_user_meta_data) values
    ('${ownerA}', 'owner@aura.example', '{"full_name":"Priya Nair"}'::jsonb),
    ('${ownerB}', 'other@other.example', '{"full_name":"Other Owner"}'::jsonb),
    ('${customerA}', 'guest1@example.com', '{"full_name":"Aditi Sharma"}'::jsonb),
    ('${customerB}', 'guest2@example.com', '{"full_name":"Rohan Mehta"}'::jsonb)
  on conflict (id) do nothing;
`);
const draft = {
  profile: { businessType: 'unisex_salon', businessName: 'Aura Unisex Salon & Wellness Lounge', subdomain: SLUG, phone: '+91 98455 33210', city: 'Bengaluru, Karnataka' },
  services, stylists,
};
await db.query(`insert into public.studioflow_accounts(user_id, draft, revision) values ($1, $2::jsonb, 1) on conflict (user_id) do update set draft = excluded.draft`, [ownerA, JSON.stringify(draft)]);
await db.query(`insert into public.studioflow_accounts(user_id, draft, revision) values ($1, $2::jsonb, 1) on conflict (user_id) do update set draft = excluded.draft`, [ownerB, JSON.stringify({ profile: { businessType: 'hair_salon', businessName: 'Other Studio' }, services: [], stylists: [] })]);
await db.query(`insert into public.studioflow_websites(slug, owner_id, content) values ($1, $2, $3::jsonb) on conflict (slug) do update set content = excluded.content`, [SLUG, ownerA, JSON.stringify({ profile: draft.profile, services, stylists })]);

/* ---------------------------------------------------------------- 0. Schema / security */
const rls = await db.query(`select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('salon_promotions','promotion_redemptions','aura_promotion_redemptions') order by c.relname`);
assert.equal(rls.rows.length, 3, 'All three promotions tables exist');
for (const row of rls.rows) assert.equal(row.relrowsecurity, true, `RLS enabled on ${row.relname}`);
const indexes = await db.query(`select indexname from pg_indexes where schemaname='public' and tablename='salon_promotions'`);
assert.ok(indexes.rows.some((r) => r.indexname.includes('salon_code_uidx')), 'Unique salon + coupon index present');
const constraints = await db.query(`select conname from pg_constraint where conrelid='public.aura_promotion_redemptions'::regclass`);
assert.ok(constraints.rows.some((r) => r.conname.includes('booking_id')), 'Unique booking_id prevents duplicate redemption');

/* ---------------------------------------------------------------- 1. Demo seed data */
const seeded = await db.query(`select coupon_code,title,description,discount_type,discount_value,is_demo,demo_approved,is_active,applicable_service_ids,starts_at,ends_at from public.salon_promotions where salon_id=$1 order by display_order`, [ownerA]);
const websiteIds = await db.query(`select distinct s->>'id' as id from public.studioflow_websites w cross join lateral jsonb_array_elements(w.content->'services') s where w.owner_id=$1`, [ownerA]);
const draftIds = await db.query(`select distinct s->>'id' as id from public.studioflow_accounts a cross join lateral jsonb_array_elements(a.draft->'services') s where a.user_id=$1`, [ownerA]);
const existingIds = new Set([...websiteIds.rows, ...draftIds.rows].map((r) => r.id));
assert.equal(seeded.rows.length, 3, 'Exactly 3 demo offers seeded on repeated migration runs');
assert.deepEqual(seeded.rows.map((r) => r.coupon_code), ['AURA10', 'STYLE200', 'AURAMID15'], 'Exact required coupon codes');
assert.equal(seeded.rows[0].title, 'Welcome to Aura');
assert.equal(seeded.rows[0].description, 'Special welcome discount for your first salon visit.');
assert.equal(Number(seeded.rows[0].discount_value), 10);
assert.equal(seeded.rows[1].title, 'Hair Style Special');
assert.equal(seeded.rows[1].description, 'Enjoy a special discount on selected existing hair services.');
assert.equal(Number(seeded.rows[1].discount_value), 200);
assert.equal(seeded.rows[2].title, 'Midweek Salon Offer');
assert.equal(seeded.rows[2].description, 'A special offer on eligible existing salon services.');
assert.equal(Number(seeded.rows[2].discount_value), 15);
for (const row of seeded.rows) {
  assert.equal(row.is_demo, true, 'Seeded offer flagged as demo');
  assert.equal(row.demo_approved, false, 'Demo offer label stays until admin approval');
  assert.equal(row.is_active, true, 'Demo offer is active');
  assert.ok(row.starts_at && row.ends_at, 'Demo offer has suitable validity dates');
  const ids = row.applicable_service_ids || [];
  assert.ok(ids.every((id) => existingIds.has(id)), 'Only existing service IDs are attached');
}
assert.ok((seeded.rows[1].applicable_service_ids || []).length > 0, 'Hair Style Special uses existing hair service relationships');

/* ---------------------------------------------------------------- 2. Customer-side display (anon) */
const anonPublic = await asUser(null, 'anon', async () => (await db.query(`select public.studioflow_aura_public_offers($1) as data`, [SLUG])).rows[0].data);
assert.equal(anonPublic.found, true);
assert.equal(anonPublic.templateId, 'unisex_salon');
assert.equal(anonPublic.offers.length, 3, 'Public RPC shows all 3 active demo offers');
assert.ok(anonPublic.offers.every((o) => o.isDemo === true), 'Customer sees a clear Demo Offer flag');
for (const field of ['title', 'description', 'discountType', 'discountValue', 'couponCode', 'startsAt', 'endsAt', 'termsConditions', 'bannerImageUrl', 'maxTotalUses', 'maxUsesPerCustomer']) {
  assert.ok(field in anonPublic.offers[0], `Public card has ${field}`);
}
const anonDirect = await asUser(null, 'anon', async () => (await db.query(`select count(*)::int as n from public.salon_promotions`)).rows[0].n);
assert.equal(anonDirect, 3, 'RLS lets anon read only this published salon’s active offers');

/* ---------------------------------------------------------------- 3. Authorisation */
await assert.rejects(
  () => asUser(customerA, 'authenticated', () => db.query(`select public.studioflow_aura_admin_offers($1)`, [ownerA])),
  /authorisation required/i, 'Customer cannot read the admin dashboard',
);
await assert.rejects(
  () => asUser(ownerB, 'authenticated', () => db.query(`select public.studioflow_aura_admin_offers($1)`, [ownerA])),
  /authorisation required/i, 'Another salon owner cannot read Aura offers',
);
const badUpdate = await asUser(customerA, 'authenticated', () => db.query(`update public.salon_promotions set discount_value=99 where salon_id=$1 returning id`, [ownerA]));
assert.equal(badUpdate.rows.length, 0, 'RLS blocks a customer from editing offers');
await assert.rejects(
  () => asUser(customerA, 'authenticated', () => db.query(`insert into public.aura_promotion_redemptions(salon_id,customer_id,booking_id,request_id,coupon_code,original_amount,discount_amount,final_amount) values ($1,$2,gen_random_uuid(),gen_random_uuid(),'HACK',1,1,0)`, [ownerA, customerA])),
  /permission|policy|rls/i, 'Customers cannot write redemption rows directly',
);

/* ---------------------------------------------------------------- 4. TEST 1 — Add new offer */
const newOffer = {
  title: 'Festive Glow Offer',
  description: 'Save on existing skin care services this festive week.',
  discountType: 'flat',
  discountValue: 250,
  couponCode: 'FESTIVE250',
  minBookingAmount: 800,
  applicableServiceIds: ['us-2', 'us-4'],
  startsAt: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
  endsAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  maxTotalUses: 10,
  maxUsesPerCustomer: 1,
  termsConditions: 'One use per customer. Valid on selected existing services only.',
  bannerImageUrl: '/templates/aura-unisex/service-facial-760.webp',
  displayOrder: 4,
  isActive: true,
};
const added = await asUser(ownerA, 'authenticated', async () => (await db.query(`select public.studioflow_aura_admin_save_offer($1::jsonb) as res`, [JSON.stringify(newOffer)])).rows[0].res);
assert.ok(added.id, 'Add New Offer returns a promotion id');
assert.equal(added.couponCode, 'FESTIVE250');
const addedRow = (await db.query(`select * from public.salon_promotions where id=$1`, [added.id])).rows[0];
assert.equal(addedRow.title, newOffer.title);
assert.equal(Number(addedRow.min_booking_amount), 800);
assert.deepEqual(addedRow.applicable_service_ids, ['us-2', 'us-4']);
assert.equal(addedRow.is_demo, false, 'Admin-created offers are not demo offers');
const afterAddPublic = await asUser(null, 'anon', async () => (await db.query(`select public.studioflow_aura_public_offers($1) as data`, [SLUG])).rows[0].data);
assert.equal(afterAddPublic.offers.length, 4, 'TEST 6: new offer appears on the customer website');
assert.ok(afterAddPublic.offers.some((o) => o.couponCode === 'FESTIVE250' && o.isDemo === false));

// Duplicate coupon codes are rejected (no duplicate records on repeated runs).
await assert.rejects(
  () => asUser(ownerA, 'authenticated', () => db.query(`select public.studioflow_aura_admin_save_offer($1::jsonb)`, [JSON.stringify({ ...newOffer, title: 'Duplicate code' })])),
  /already uses coupon code/i, 'Duplicate coupon code rejected',
);
// Unknown service IDs are rejected.
await assert.rejects(
  () => asUser(ownerA, 'authenticated', () => db.query(`select public.studioflow_aura_admin_save_offer($1::jsonb)`, [JSON.stringify({ ...newOffer, couponCode: 'BADSERVICE', applicableServiceIds: ['made-up-service'] })])),
  /only services that already exist/i, 'Offers cannot attach invented services',
);

/* ---------------------------------------------------------------- 5. TEST 2 — Edit offer */
const edited = { ...newOffer, id: added.id, title: 'Festive Skin Glow — Updated', discountValue: 300, termsConditions: 'Updated terms. One use per customer.', displayOrder: 9 };
await asUser(ownerA, 'authenticated', () => db.query(`select public.studioflow_aura_admin_save_offer($1::jsonb)`, [JSON.stringify(edited)]));
const editedRow = (await db.query(`select * from public.salon_promotions where id=$1`, [added.id])).rows[0];
assert.equal(editedRow.title, 'Festive Skin Glow — Updated');
assert.equal(Number(editedRow.discount_value), 300);
assert.equal(Number(editedRow.display_order), 9);
const afterEditPublic = await asUser(null, 'anon', async () => (await db.query(`select public.studioflow_aura_public_offers($1) as data`, [SLUG])).rows[0].data);
const editedCard = afterEditPublic.offers.find((o) => o.couponCode === 'FESTIVE250');
assert.equal(editedCard.title, 'Festive Skin Glow — Updated', 'TEST 6: customer website uses the latest Supabase data after edit');
assert.equal(Number(editedCard.discountValue), 300);
assert.equal(Number(editedCard.displayOrder), 9);

/* ---------------------------------------------------------------- 6. TEST 5 / 4 — Deactivate / Activate */
await asUser(ownerA, 'authenticated', () => db.query(`select public.studioflow_aura_admin_toggle_offer($1, false)`, [added.id]));
const deactivated = await asUser(null, 'anon', async () => (await db.query(`select public.studioflow_aura_public_offers($1) as data`, [SLUG])).rows[0].data);
assert.equal(deactivated.offers.length, 3, 'Deactivated offer disappears from the customer website');
assert.equal(deactivated.offers.some((o) => o.couponCode === 'FESTIVE250'), false);
const adminDeactivated = await asUser(ownerA, 'authenticated', async () => (await db.query(`select public.studioflow_aura_admin_offers() as data`)).rows[0].data);
assert.ok(adminDeactivated.offers.some((o) => o.couponCode === 'FESTIVE250' && o.isActive === false), 'Admin still sees the inactive offer');
const inactiveDirect = await asUser(customerA, 'authenticated', () => db.query(`select count(*)::int as n from public.salon_promotions where coupon_code='FESTIVE250'`));
assert.equal(inactiveDirect.rows[0].n, 0, 'RLS hides inactive offers from customers');
await asUser(ownerA, 'authenticated', () => db.query(`select public.studioflow_aura_admin_toggle_offer($1, true)`, [added.id]));
const reactivated = await asUser(null, 'anon', async () => (await db.query(`select public.studioflow_aura_public_offers($1) as data`, [SLUG])).rows[0].data);
assert.ok(reactivated.offers.some((o) => o.couponCode === 'FESTIVE250'), 'Activated offer returns to the customer website');

// Demo approval removes the Demo Offer label.
const aura10 = seeded.rows.find((r) => r.coupon_code === 'AURA10');
const aura10Id = (await db.query(`select id from public.salon_promotions where salon_id=$1 and coupon_code='AURA10'`, [ownerA])).rows[0].id;
await asUser(ownerA, 'authenticated', () => db.query(`select public.studioflow_aura_admin_approve_demo($1)`, [aura10Id]));
const approvedPublic = await asUser(null, 'anon', async () => (await db.query(`select public.studioflow_aura_public_offers($1) as data`, [SLUG])).rows[0].data);
assert.equal(approvedPublic.offers.find((o) => o.couponCode === 'AURA10').isDemo, false, 'Demo Offer label cleared after admin approval');
assert.equal(approvedPublic.offers.find((o) => o.couponCode === 'STYLE200').isDemo, true, 'Other demo offers keep their label');

/* ---------------------------------------------------------------- 7. TEST 8 / 11 — Valid coupon + discount calculation */
const quoteAura10 = await asUser(customerA, 'authenticated', async () => (await db.query(`select public.studioflow_aura_coupon_quote($1, '["us-1"]'::jsonb, 'aura10') as q`, [SLUG])).rows[0].q);
assert.equal(Number(quoteAura10.originalPrice), 650);
assert.equal(Number(quoteAura10.discountAmount), 65, '10% of ₹650 is ₹65 — server-side calculation');
assert.equal(Number(quoteAura10.finalPrice), 585, 'Final payable amount ₹585');
assert.equal(Number(quoteAura10.advanceAmount), 146.25);
assert.equal(quoteAura10.couponKind, 'aura_promotion');
const quoteStyle = await asUser(customerA, 'authenticated', async () => (await db.query(`select public.studioflow_aura_coupon_quote($1, '["us-10"]'::jsonb, 'STYLE200') as q`, [SLUG])).rows[0].q);
assert.equal(Number(quoteStyle.originalPrice), 1100);
assert.equal(Number(quoteStyle.discountAmount), 200, 'Flat ₹200 discount computed in the backend');
assert.equal(Number(quoteStyle.finalPrice), 900);

/* ---------------------------------------------------------------- 8. TEST 9 — Invalid coupon */
await assert.rejects(
  () => asUser(customerA, 'authenticated', () => db.query(`select public.studioflow_aura_coupon_quote($1, '["us-1"]'::jsonb, 'NOPE123')`, [SLUG])),
  /Coupon not found/i, 'Invalid coupon rejected',
);
// Inactive coupon, ineligible service and minimum booking amount.
await asUser(ownerA, 'authenticated', () => db.query(`select public.studioflow_aura_admin_toggle_offer($1, false)`, [added.id]));
await assert.rejects(
  () => asUser(customerA, 'authenticated', () => db.query(`select public.studioflow_aura_coupon_quote($1, '["us-2"]'::jsonb, 'FESTIVE250')`, [SLUG])),
  /currently inactive/i, 'Inactive coupon rejected',
);
await asUser(ownerA, 'authenticated', () => db.query(`select public.studioflow_aura_admin_toggle_offer($1, true)`, [added.id]));
await assert.rejects(
  () => asUser(customerA, 'authenticated', () => db.query(`select public.studioflow_aura_coupon_quote($1, '["us-7"]'::jsonb, 'FESTIVE250')`, [SLUG])),
  /not applicable to the selected services/i, 'Ineligible service rejected',
);
await assert.rejects(
  () => asUser(customerA, 'authenticated', () => db.query(`select public.studioflow_aura_coupon_quote($1, '["us-11"]'::jsonb, 'STYLE200')`, [SLUG])),
  /Minimum booking amount/i, 'Minimum booking amount enforced',
);

/* ---------------------------------------------------------------- 9. TEST 10 — Expired / not-yet-started coupon */
const yesterday = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
await asUser(ownerA, 'authenticated', () => db.query(`select public.studioflow_aura_admin_save_offer($1::jsonb)`, [JSON.stringify({ ...newOffer, id: undefined, title: 'Expired Test Offer', couponCode: 'EXPIRED10', startsAt: lastWeek, endsAt: yesterday })]));
await asUser(ownerA, 'authenticated', () => db.query(`select public.studioflow_aura_admin_save_offer($1::jsonb)`, [JSON.stringify({ ...newOffer, id: undefined, title: 'Future Test Offer', couponCode: 'FUTURE10', startsAt: nextWeek, endsAt: nextMonth })]));
await assert.rejects(
  () => asUser(customerA, 'authenticated', () => db.query(`select public.studioflow_aura_coupon_quote($1, '["us-2"]'::jsonb, 'EXPIRED10')`, [SLUG])),
  /Coupon has expired/i, 'Expired coupon rejected',
);
await assert.rejects(
  () => asUser(customerA, 'authenticated', () => db.query(`select public.studioflow_aura_coupon_quote($1, '["us-2"]'::jsonb, 'FUTURE10')`, [SLUG])),
  /has not started yet/i, 'Future coupon rejected',
);
const expiredPublic = await asUser(null, 'anon', async () => (await db.query(`select public.studioflow_aura_public_offers($1) as data`, [SLUG])).rows[0].data);
assert.equal(expiredPublic.offers.some((o) => o.couponCode === 'EXPIRED10' || o.couponCode === 'FUTURE10'), false, 'TEST 6: only active, in-date offers are displayed');

/* ---------------------------------------------------------------- 10. TEST 3 — Delete offer (with confirmation in UI) */
await asUser(ownerA, 'authenticated', () => db.query(`select public.studioflow_aura_admin_delete_offer($1)`, [added.id]));
assert.equal((await db.query(`select count(*)::int as n from public.salon_promotions where id=$1`, [added.id])).rows[0].n, 0, 'Offer deleted');
const afterDeletePublic = await asUser(null, 'anon', async () => (await db.query(`select public.studioflow_aura_public_offers($1) as data`, [SLUG])).rows[0].data);
assert.equal(afterDeletePublic.offers.some((o) => o.couponCode === 'FESTIVE250'), false, 'Deleted offer removed from customer website');
await assert.rejects(
  () => asUser(customerA, 'authenticated', () => db.query(`select public.studioflow_aura_admin_delete_offer($1)`, [aura10Id])),
  /authorisation required/i, 'Customer cannot delete offers',
);

/* ---------------------------------------------------------------- 11. TEST 12 — Usage limits + booking integration */
// A one-use offer, so limits can be tested deterministically.
const limited = { ...newOffer, id: undefined, title: 'One Use Test Offer', couponCode: 'ONCEONLY', discountType: 'percentage', discountValue: 10, minBookingAmount: 0, applicableServiceIds: ['us-1'], maxTotalUses: 1, maxUsesPerCustomer: 1, startsAt: lastWeek, endsAt: nextMonth };
const limitedRes = await asUser(ownerA, 'authenticated', async () => (await db.query(`select public.studioflow_aura_admin_save_offer($1::jsonb) as res`, [JSON.stringify(limited)])).rows[0].res);

// Choose dates from the actual branch hours and projected staff schedule. Do not
// assume that +7 days has the same weekday: the seeded branch is closed Sunday.
const openWindow = await db.query(`
  select b.id::text as branch_id,
         (current_date + days.step)::text as booking_date,
         trim(to_char(current_date + days.step, 'Day')) as day_name,
         studioflow_private.branch_is_open(
           b.id, (current_date + days.step)::date, time '11:00', time '11:45'
         ) as branch_open,
         exists (
           select 1
             from public.studioflow_staff_branch_schedules s
            where s.site_id = b.site_id
              and s.branch_id = b.id
              and s.staff_id = $2
              and s.day_of_week = trim(to_char(current_date + days.step, 'Day'))
              and s.is_active
              and s.starts_at <= time '11:00'
              and s.ends_at >= time '11:45'
         ) as stylist_scheduled
    from public.branches b
    cross join generate_series(1, 30) as days(step)
   where b.site_id = $1
     and b.is_active
     and studioflow_private.branch_is_open(
       b.id, (current_date + days.step)::date, time '11:00', time '11:45'
     )
     and exists (
       select 1
         from public.studioflow_staff_branch_schedules s
        where s.site_id = b.site_id
          and s.branch_id = b.id
          and s.staff_id = $2
          and s.day_of_week = trim(to_char(current_date + days.step, 'Day'))
          and s.is_active
          and s.starts_at <= time '11:00'
          and s.ends_at >= time '11:45'
     )
   order by current_date + days.step
   limit 1
`, [ownerA, 'us-st-1']);
assert.equal(openWindow.rows.length, 1, 'A future date exists when the seeded branch and stylist both cover 11:00–11:45');
const bookingWindow = openWindow.rows[0];
assert.equal(bookingWindow.branch_open, true, 'The selected date and time are inside the branch operating hours');
assert.equal(bookingWindow.stylist_scheduled, true, 'The assigned stylist is scheduled for the complete 11:00–11:45 appointment');

const closedWindow = await db.query(`
  select b.id::text as branch_id,
         (current_date + days.step)::text as booking_date,
         trim(to_char(current_date + days.step, 'Day')) as day_name
    from public.branches b
    cross join generate_series(1, 30) as days(step)
   where b.site_id = $1
     and b.is_active
     and not exists (
       select 1
         from jsonb_array_elements(b.operating_hours) h
        where h->>'day' = trim(to_char(current_date + days.step, 'Day'))
          and coalesce((h->>'enabled')::boolean, false)
     )
   order by current_date + days.step
   limit 1
`, [ownerA]);
assert.equal(closedWindow.rows.length, 1, 'A future closed day exists in the seeded branch operating hours');
const closedBookingWindow = closedWindow.rows[0];
const closedBranchState = await db.query(`
  select studioflow_private.branch_is_open($1, $2::date, time '11:00', time '11:45') as is_open
`, [closedBookingWindow.branch_id, closedBookingWindow.booking_date]);
assert.equal(closedBranchState.rows[0].is_open, false, 'The selected closed day is rejected by the actual seeded branch-hours function');
const closedStaffSchedule = await db.query(`
  select count(*)::int as n
    from public.studioflow_staff_branch_schedules
   where site_id = $1
     and branch_id = $2
     and staff_id = $3
     and day_of_week = $4
     and is_active
     and starts_at <= time '11:00'
     and ends_at >= time '11:45'
`, [ownerA, closedBookingWindow.branch_id, 'us-st-1', closedBookingWindow.day_name]);
assert.equal(closedStaffSchedule.rows[0].n, 0, 'The projected stylist schedule does not mark the branch-closed day available');

const closedRequestId = '55555555-5555-4555-8555-555555555552';
const closedRequest = {
  requestId: closedRequestId, serviceId: 'us-1', stylistId: 'us-st-1', clientName: 'Aditi Sharma', clientPhone: '9876543210',
  date: closedBookingWindow.booking_date, time: '11:00', couponCode: 'ONCEONLY', branchId: closedBookingWindow.branch_id,
};
await assert.rejects(
  () => asUser(customerA, 'authenticated', async () => db.query(`select public.studioflow_aura_coupon_book($1, $2::jsonb) as b`, [SLUG, JSON.stringify(closedRequest)])),
  /Slot unavailable|Specialist is not available at this location and time/i,
  'A coupon booking on a day when the actual branch is closed is rejected',
);
const rejectedRequest = await db.query(`
  select count(*)::int as n
    from public.studioflow_android_requests
   where customer_id = $1 and request_id = $2::uuid
`, [customerA, closedRequestId]);
assert.equal(rejectedRequest.rows[0].n, 0, 'A rejected closed-day booking leaves no request or reservation behind');
await assert.rejects(
  () => db.query(`
    insert into public.studioflow_bookings(owner_id, customer_id, stylist_id, starts_at, ends_at, status, payload, branch_id)
    values (
      $1, $2, $3,
      ($4::date + time '11:00') at time zone 'Asia/Kolkata',
      ($4::date + time '11:45') at time zone 'Asia/Kolkata',
      'pending', '{}'::jsonb, $5
    )
  `, [ownerA, customerA, 'us-st-1', closedBookingWindow.booking_date, closedBookingWindow.branch_id]),
  (error) => {
    assert.equal(error.code, 'P0001', 'The branch-availability trigger keeps its exception code');
    assert.match(error.message, /Specialist is not available at this location and time/);
    return true;
  },
  'The database booking guard independently rejects an explicitly selected branch-closed slot',
);

const requestId = '55555555-5555-4555-8555-555555555551';
// Browser-supplied discount values are stripped before the booking core runs.
const tamperedRequest = {
  requestId, serviceId: 'us-1', stylistId: 'us-st-1', clientName: 'Aditi Sharma', clientPhone: '9876543210',
  date: bookingWindow.booking_date, time: '11:00', couponCode: 'ONCEONLY', branchId: bookingWindow.branch_id,
  discountAmount: 9999, discountValue: 9999, finalPrice: 1, finalAmount: 1, originalPrice: 1, servicePrice: 1,
  coupon: { discountAmount: 9999, finalPrice: 1 },
};
const booked = await asUser(customerA, 'authenticated', async () => (await db.query(`select public.studioflow_aura_coupon_book($1, $2::jsonb) as b`, [SLUG, JSON.stringify(tamperedRequest)])).rows[0].b);
const payload = booked.payload || booked;
assert.equal(Number(payload.discountAmount), 65, 'Browser discount values ignored; backend computed ₹65');
assert.equal(Number(payload.servicePrice), 585, 'Final payable amount comes from the server');
const bookingId = booked.id || payload.id;
assert.ok(bookingId, 'Booking was created through the existing flow');
assert.equal(booked.branch_id, bookingWindow.branch_id, 'Booking remains attached to the branch whose hours and staff schedule were selected');
const beforeConfirm = await db.query(`select count(*)::int as n from public.aura_promotion_redemptions where booking_id=$1`, [bookingId]);
assert.equal(beforeConfirm.rows[0].n, 0, 'No redemption record is saved before booking confirmation');
await assert.rejects(
  () => asUser(customerB, 'authenticated', () => db.query(`select public.studioflow_aura_coupon_quote($1, '["us-1"]'::jsonb, 'ONCEONLY')`, [SLUG])),
  /maximum usage limit/i, 'Maximum redemptions limit enforced',
);
await assert.rejects(
  () => asUser(customerA, 'authenticated', () => db.query(`select public.studioflow_aura_coupon_quote($1, '["us-1"]'::jsonb, 'ONCEONLY')`, [SLUG])),
  /maximum number of times|maximum usage limit/i, 'Per-customer usage limit enforced',
);

// Confirm booking -> redemption saved exactly once, with recomputed amounts.
await db.query(`update public.studioflow_bookings set status='confirmed' where id=$1`, [bookingId]);
const redemption = await db.query(`select * from public.aura_promotion_redemptions where booking_id=$1`, [bookingId]);
assert.equal(redemption.rows.length, 1, 'Redemption saved only after successful booking confirmation');
assert.equal(Number(redemption.rows[0].original_amount), 650);
assert.equal(Number(redemption.rows[0].discount_amount), 65);
assert.equal(Number(redemption.rows[0].final_amount), 585);
assert.equal(redemption.rows[0].status, 'applied');
await db.query(`update public.studioflow_bookings set status='completed' where id=$1`, [bookingId]);
const dedup = await db.query(`select count(*)::int as n from public.aura_promotion_redemptions where booking_id=$1`, [bookingId]);
assert.equal(dedup.rows[0].n, 1, 'Duplicate redemption for the same booking prevented');
await assert.rejects(
  () => db.query(`insert into public.aura_promotion_redemptions(promotion_id,salon_id,customer_id,booking_id,request_id,coupon_code,original_amount,discount_amount,final_amount) values ($1,$2,$3,$4,gen_random_uuid(),'ONCEONLY',650,65,585)`, [limitedRes.id, ownerA, customerA, bookingId]),
  /duplicate key|unique/i, 'Unique booking_id blocks a second redemption row',
);
await db.query(`update public.studioflow_bookings set status='cancelled' where id=$1`, [bookingId]);
const released = await db.query(`select status from public.aura_promotion_redemptions where booking_id=$1`, [bookingId]);
assert.equal(released.rows[0].status, 'released', 'Cancelled booking releases its redemption');
const availableAfterCancellation = await asUser(customerA, 'authenticated', async () =>
  (await db.query(`select public.studioflow_aura_coupon_quote($1, '[\"us-1\"]'::jsonb, 'ONCEONLY') as q`, [SLUG])).rows[0].q,
);
assert.equal(Number(availableAfterCancellation.discountAmount), 65, 'A cancelled booking releases the total and per-customer use so the coupon can be used again');

/* ---------------------------------------------------------------- 12. TEST 13 — Saved after refresh */
const refreshedAdmin = await asUser(ownerA, 'authenticated', async () => (await db.query(`select public.studioflow_aura_admin_offers() as data`)).rows[0].data);
assert.ok(refreshedAdmin.offers.find((o) => o.couponCode === 'ONCEONLY'), 'Added offer still saved after a fresh dashboard load');
const refreshedPublic = await asUser(null, 'anon', async () => (await db.query(`select public.studioflow_aura_public_offers($1) as data`, [SLUG])).rows[0].data);
assert.ok(refreshedPublic.offers.find((o) => o.couponCode === 'AURA10'), 'Demo offers still saved after a fresh website load');
assert.equal(refreshedPublic.offers.some((o) => o.couponCode === 'FESTIVE250'), false, 'Deleted offer stays deleted after refresh');
const restored = await asUser(ownerA, 'authenticated', async () => (await db.query(`select public.studioflow_aura_admin_restore_demos() as data`)).rows[0].data);
assert.equal(restored.restored, 3, 'Restore demos is idempotent and never creates duplicates');
assert.equal((await db.query(`select count(*)::int as n from public.salon_promotions where salon_id=$1 and coupon_code in ('AURA10','STYLE200','AURAMID15')`, [ownerA])).rows[0].n, 3);

/* ---------------------------------------------------------------- 13. Other templates untouched */
assert.equal((await db.query(`select count(*)::int as n from public.salon_promotions where salon_id=$1 and coupon_code in ('AURA10','STYLE200','AURAMID15')`, [ownerB])).rows[0].n, 0, 'No Aura demo rows seeded for a non-Template-03 salon');

/* ---------------------------------------------------------------- 14. Static UI / wiring checks */
const lib = readFileSync('src/lib/auraPromotions.ts', 'utf8');
const cards = readFileSync('src/components/aura/AuraPromotionCards.tsx', 'utf8');
const admin = readFileSync('src/components/aura/AuraPromotionsAdmin.tsx', 'utf8');
const migration = readFileSync(MIGRATIONS[4], 'utf8');
for (const [label, text] of [['lib', lib], ['cards', cards], ['admin', admin], ['migration', migration]]) {
  assert.ok(!/service_role_key|SUPABASE_SERVICE_ROLE|disable row level security/i.test(text), `${label} contains no secret keys and does not disable RLS`);
}
for (const rpc of ['studioflow_aura_public_offers', 'studioflow_aura_admin_offers', 'studioflow_aura_admin_save_offer', 'studioflow_aura_admin_delete_offer', 'studioflow_aura_admin_toggle_offer', 'studioflow_aura_coupon_quote', 'studioflow_aura_coupon_book']) {
  assert.ok(lib.includes(rpc) || migration.includes(rpc), `RPC ${rpc} wired`);
}
for (const field of ['Offer title', 'Coupon code', 'Discount type', 'Discount value', 'Minimum booking amount', 'Start date', 'Expiry date', 'Usage limit', 'Per-customer usage limit', 'Terms and conditions', 'Display order', 'Applicable existing services', 'Offer image', 'Active status']) {
  assert.ok(admin.includes(field), `Admin form exposes ${field}`);
}
for (const action of ['add-new-offer', 'edit-offer', 'save-offer', 'cancel-edit', 'delete-offer', 'confirm-delete', 'activate-offer', 'deactivate-offer', 'preview-offer']) {
  assert.ok(admin.includes(action), `Admin action ${action} present`);
}
assert.ok(admin.includes('data-confirm-delete="true"'), 'Delete shows an in-app confirmation');
for (const field of ['offers', 'au-offer-voucher', 'Copy Coupon', 'Book Now', 'Demo Offer', 'Terms and conditions', 'Starts', 'Expires']) {
  assert.ok(cards.includes(field), `Customer card shows ${field}`);
}
assert.ok(readFileSync('src/components/AuraUnisexWebsite.tsx', 'utf8').includes('useAuraPublicOffers'), 'Customer website reads Supabase offers');
assert.ok(readFileSync('src/components/BookingModal.tsx', 'utf8').includes('studioflow_aura_coupon_quote'), 'Booking modal validates Aura coupons');
assert.ok(readFileSync('src/App.tsx', 'utf8').includes('studioflow_aura_coupon_book'), 'App books Aura coupons through the secure RPC');

console.log('PASS: Template 03 Promotions & Offers — 13 actions tested (add, edit, delete, activate, deactivate, customer display, copy-coupon wiring, valid/invalid/expired coupons, discount calculation, usage limits, refresh persistence), RLS isolation, secure back-end discounts, confirmed-only redemptions and duplicate prevention.');
