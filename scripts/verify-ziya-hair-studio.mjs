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
try {
  await db.exec(`create schema extensions; create extension pgcrypto with schema extensions;`);
} catch {
  await db.exec(`create schema if not exists extensions;
create or replace function extensions.gen_random_bytes(n integer) returns bytea language sql as $$select decode(md5(random()::text),'hex')$$;
create or replace function extensions.digest(data text,algo text) returns bytea language sql as $$select decode(md5(data),'hex')$$;`);
}

const splitSql = (sql) => {
  const out = [];
  let cur = '', i = 0, tag = null, quote = false, line = false;
  while (i < sql.length) {
    const two = sql.slice(i, i + 2);
    if (line) { cur += sql[i]; if (sql[i] === '\n') line = false; i++; continue; }
    if (two === '--' && !quote && !tag) { line = true; cur += two; i += 2; continue; }
    if (sql[i] === "'" && !tag) {
      if (sql[i + 1] === "'") { cur += "''"; i += 2; continue; }
      quote = !quote; cur += sql[i]; i++; continue;
    }
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

const applyFile = async (name) => {
  const stmts = splitSql(readFileSync('backend/' + name, 'utf8')).filter((s) => !/^\s*(begin|commit)\s*;?\s*$/i.test(s));
  await db.exec('BEGIN');
  try {
    for (const s of stmts) await db.exec(s);
    await db.exec('COMMIT');
  } catch (e) {
    try { await db.exec('ROLLBACK'); } catch {}
    throw e;
  }
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
    try {
      await applyFile(name);
      pending.delete(name);
      progress = true;
    } catch (e) {
      pending.set(name, String(e.message || e).split('\n')[0].slice(0, 320));
    }
  }
  if (!progress) break;
}
assert.equal(pending.size, 0, 'Backend migrations converged');

await db.exec(readFileSync('supabase/migrations/202610300003_template12_iron_ink.sql', 'utf8'));
await db.exec(readFileSync('supabase/migrations/202610300004_multibranch_support.sql', 'utf8'));
await db.exec(readFileSync('supabase/migrations/202611020001_ziya_promotions_and_loyalty.sql', 'utf8'));

// 1. Idempotency: re-applying the Ziya migration a second time must succeed cleanly
await db.exec(readFileSync('supabase/migrations/202611020001_ziya_promotions_and_loyalty.sql', 'utf8'));

// 2. Verify RLS is enabled on all 5 Ziya tables
const rlsRes = await db.query(`
  select c.relname, c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname in (
       'salon_promotions',
       'promotion_redemptions',
       'loyalty_program_settings',
       'loyalty_rewards',
       'loyalty_points_ledger'
     )
   order by c.relname
`);
assert.equal(rlsRes.rows.length, 5, 'All 5 Ziya tables exist in public schema');
for (const row of rlsRes.rows) {
  assert.equal(row.relrowsecurity, true, `RLS enabled on ${row.relname}`);
}

// Verify Template 01 catalog row renamed to Ziya Women’s Hair Studio while preserving services
const tplRes = await db.query(`select title, config from public.studioflow_templates where id = 'hair_salon'`);
assert.equal(tplRes.rows[0].title, 'Ziya Women’s Hair Studio');
assert.equal(tplRes.rows[0].config.shortName, 'Ziya Women’s Hair Studio');
assert.ok(Array.isArray(tplRes.rows[0].config.services) && tplRes.rows[0].config.services.length > 0, 'Existing template services preserved');

// Helper to run queries as a specific authenticated user or anon
async function asUser(userId, role, fn) {
  await db.exec(`
    set role ${role};
    select set_config('request.jwt.claim.role', '${role}', false);
    select set_config('request.jwt.claim.sub', '${userId || ''}', false);
    select set_config('request.jwt.claims', '${userId ? JSON.stringify({ sub: userId, role }) : '{}'}', false);
  `);
  try {
    return await fn();
  } finally {
    await db.exec(`
      reset role;
      select set_config('request.jwt.claim.role', '', false);
      select set_config('request.jwt.claim.sub', '', false);
      select set_config('request.jwt.claims', '', false);
    `);
  }
}

const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
const customerA = '33333333-3333-4333-8333-333333333333';
const customerB = '44444444-4444-4444-8444-444444444444';

await db.exec(`
  insert into auth.users(id, email, raw_user_meta_data) values
    ('${ownerA}', 'owner@ziyahairstudio.in', '{"full_name":"Ziya Khan"}'::jsonb),
    ('${ownerB}', 'other@othersalon.in', '{"full_name":"Other Owner"}'::jsonb),
    ('${customerA}', 'priya@example.com', '{"full_name":"Priya Sharma"}'::jsonb),
    ('${customerB}', 'neha@example.com', '{"full_name":"Neha Nair"}'::jsonb)
  on conflict (id) do nothing;
`);

// Create Salon A (Ziya Women’s Hair Studio) with canonical women's haircut services & published website
const ziyaServices = [
  { id: 'hs-1', name: 'Layer Haircut', description: 'Cascading face-framing women’s layers.', category: 'Signature Cuts', price: 950, durationMinutes: 50 },
  { id: 'hs-2', name: 'Butterfly Haircut', description: 'Feathered crown volume butterfly haircut.', category: 'Signature Cuts', price: 1250, durationMinutes: 60 },
  { id: 'hs-3', name: 'Bob Haircut', description: 'Precision jawline and collarbone women’s bob.', category: 'Short & Sculpted Cuts', price: 1100, durationMinutes: 50 },
  { id: 'hs-10', name: 'Curtain Bangs', description: 'Soft cheekbone-skimming curtain fringe.', category: 'Bangs & Framing', price: 550, durationMinutes: 25 },
  { id: 'hs-14', name: 'Hair Wash & Hair Styling with Haircut', description: 'Complete women’s haircut with wash and blowout.', category: 'Wash & Finish Packages', price: 1450, durationMinutes: 75 },
];
const ziyaStylists = [
  { id: 'st-ziya-1', name: 'Ziya Khan', role: 'Founder & Master Haircut Specialist', status: 'Available' },
];

await db.query(
  `insert into public.studioflow_accounts(user_id, draft, revision)
   values ($1, $2::jsonb, 1)
   on conflict (user_id) do update set draft = excluded.draft`,
  [
    ownerA,
    JSON.stringify({
      profile: {
        businessType: 'hair_salon',
        businessName: 'Ziya Women’s Hair Studio',
        subdomain: 'ziya-hair-studio',
        phone: '+91 98450 22110',
        whatsapp: '919845022110',
        city: 'Bengaluru, Karnataka',
      },
      services: ziyaServices,
      stylists: ziyaStylists,
    }),
  ],
);

await db.query(
  `insert into public.studioflow_websites(slug, owner_id, content)
   values ('ziya-hair-studio', $1, $2::jsonb)
   on conflict (slug) do update set content = excluded.content`,
  [
    ownerA,
    JSON.stringify({
      profile: {
        businessType: 'hair_salon',
        businessName: 'Ziya Women’s Hair Studio',
        subdomain: 'ziya-hair-studio',
      },
      services: ziyaServices,
      stylists: ziyaStylists,
    }),
  ],
);

// Trigger owner dashboard initialization as Owner A -> seeds 3 demo offers + Ziya Style Rewards
const adminInit = await asUser(ownerA, 'authenticated', async () => {
  const res = await db.query(`select public.studioflow_ziya_admin_dashboard($1) as dashboard`, [ownerA]);
  return res.rows[0].dashboard;
});

assert.equal(adminInit.promotions.length, 3, 'Seeds 3 Ziya demo offers automatically');
assert.deepEqual(
  adminInit.promotions.map((p) => p.couponCode),
  ['ZIYA15', 'NEWLOOK200', 'LAYER10'],
  'Exact demo coupon codes seeded',
);
assert.ok(adminInit.promotions.every((p) => p.isDemo === true), 'Demo offers clearly flagged isDemo=true');
assert.equal(adminInit.loyaltySettings.programName, 'Ziya Style Rewards');
assert.equal(adminInit.loyaltyRewards.length, 3, 'Seeds 100/200/300 pt Ziya Style Rewards');

// 3. Public storefront fetch (anon & signed-in customer)
const anonPublic = await asUser(null, 'anon', async () => {
  const res = await db.query(`select public.studioflow_ziya_public_offers_and_loyalty('ziya-hair-studio') as data`);
  return res.rows[0].data;
});
assert.equal(anonPublic.found, true);
assert.equal(anonPublic.promotions.length, 3);
assert.equal(anonPublic.loyalty.rewards.length, 3);
assert.equal(anonPublic.customer, null, 'Guest has null customer loyalty object');

// 4. Security & RLS checks: Customer A & Salon Owner B cannot mutate Ziya's tables or call admin RPCs
await assert.rejects(
  () =>
    asUser(customerA, 'authenticated', () =>
      db.query(`select public.studioflow_ziya_admin_save_promotion('{}'::jsonb, $1)`, [ownerA]),
    ),
  /authorization required/i,
  'Customer cannot call admin promotion save RPC',
);

await assert.rejects(
  () =>
    asUser(ownerB, 'authenticated', () =>
      db.query(`select public.studioflow_ziya_admin_dashboard($1)`, [ownerA]),
    ),
  /authorization required/i,
  'Another salon owner cannot read Salon A admin dashboard',
);

const unauthorizedUpdate = await asUser(customerA, 'authenticated', () =>
  db.query(`update public.salon_promotions set discount_value = 99 where salon_id = $1 returning id`, [ownerA]),
);
assert.equal(unauthorizedUpdate.rows.length, 0, 'RLS prevents customer from updating salon_promotions');

// 5. Coupon Validation & Booking Integration
// 5a. Service restriction check: LAYER10 rejected on Bob Haircut (hs-3)
await assert.rejects(
  () =>
    asUser(customerA, 'authenticated', () =>
      db.query(`select public.studioflow_coupon_quote('ziya-hair-studio', '["hs-3"]'::jsonb, 'LAYER10')`),
    ),
  /not applicable to the selected haircut service/i,
);

// 5b. Min booking amount check: NEWLOOK200 (min ₹950) rejected on Curtain Bangs (hs-10, ₹550)
await assert.rejects(
  () =>
    asUser(customerA, 'authenticated', () =>
      db.query(`select public.studioflow_coupon_quote('ziya-hair-studio', '["hs-10"]'::jsonb, 'NEWLOOK200')`),
    ),
  /950/i,
);

// 5c. Valid quote: ZIYA15 (15% off) on Layer Haircut (hs-1, ₹950) -> ₹142.50 off = ₹807.50
const quoteZiya15 = await asUser(customerA, 'authenticated', async () => {
  const res = await db.query(
    `select public.studioflow_coupon_quote('ziya-hair-studio', '["hs-1"]'::jsonb, 'ziya15') as quote`,
  );
  return res.rows[0].quote;
});
assert.equal(quoteZiya15.code, 'ZIYA15');
assert.equal(Number(quoteZiya15.originalPrice), 950);
assert.equal(Number(quoteZiya15.discountAmount), 142.5);
assert.equal(Number(quoteZiya15.finalPrice), 807.5);
assert.equal(Number(quoteZiya15.advanceAmount), 201.88);

// 5d. Confirm booking with ZIYA15 via studioflow_coupon_book
const futureDate = '2026-11-18';
const bookedZiya15Row = await asUser(customerA, 'authenticated', async () => {
  const res = await db.query(
    `select public.studioflow_coupon_book('ziya-hair-studio', $1::jsonb) as booking`,
    [
      JSON.stringify({
        requestId: '55555555-5555-4555-8555-555555555551',
        serviceId: 'hs-1',
        stylistId: 'st-ziya-1',
        stylistName: 'Ziya Khan',
        clientName: 'Priya Sharma',
        clientPhone: '9876543210',
        date: futureDate,
        time: '11:00',
        couponCode: 'ZIYA15',
      }),
    ],
  );
  return res.rows[0].booking;
});
const bookedZiya15 = bookedZiya15Row.payload || bookedZiya15Row;
assert.equal(Number(bookedZiya15.discountAmount), 142.5);
assert.equal(Number(bookedZiya15.servicePrice), 807.5);
const booking1Id = bookedZiya15Row.id || bookedZiya15.id;

// 5e. Duplicate per-customer redemption blocked (ZIYA15 maxUsesPerCustomer = 1)
await assert.rejects(
  () =>
    asUser(customerA, 'authenticated', () =>
      db.query(`select public.studioflow_coupon_quote('ziya-hair-studio', '["hs-1"]'::jsonb, 'ZIYA15')`),
    ),
  /limit|maximum|already used/i,
);

// 6. Loyalty Points Crediting, Idempotency, Redemption & Reversal
// Book a Butterfly Haircut (₹1,250) with NEWLOOK200 (−₹200 => ₹1,050 final paid) and mark it Completed!
const bookedButterflyRow = await asUser(customerA, 'authenticated', async () => {
  const res = await db.query(
    `select public.studioflow_coupon_book('ziya-hair-studio', $1::jsonb) as booking`,
    [
      JSON.stringify({
        requestId: '55555555-5555-4555-8555-555555555552',
        serviceId: 'hs-2',
        stylistId: 'st-ziya-1',
        stylistName: 'Ziya Khan',
        clientName: 'Priya Sharma',
        clientPhone: '9876543210',
        date: futureDate,
        time: '13:30',
        couponCode: 'NEWLOOK200',
      }),
    ],
  );
  return res.rows[0].booking;
});
const bookedButterfly = bookedButterflyRow.payload || bookedButterflyRow;
const butterflyBookingId = bookedButterflyRow.id || bookedButterfly.id;
assert.equal(Number(bookedButterfly.servicePrice), 1050);

// Complete booking -> should credit floor(1050 / 100) * 1 = 10 points & mark redemption 'applied'
await db.query(`update public.studioflow_bookings set status = 'completed' where id = $1`, [butterflyBookingId]);
// Re-update completed booking to verify idempotency (no double-credit!)
await db.query(`update public.studioflow_bookings set status = 'completed' where id = $1`, [butterflyBookingId]);

const custAfterComplete = await asUser(customerA, 'authenticated', async () => {
  const res = await db.query(`select public.studioflow_ziya_public_offers_and_loyalty('ziya-hair-studio') as data`);
  return res.rows[0].data.customer;
});
assert.equal(custAfterComplete.balance, 10, 'Earned exact 10 points (1 pt per ₹100 on ₹1,050)');
assert.equal(custAfterComplete.ledger.length, 1, 'Idempotent: single ledger row created');

// Admin manual adjustment (+100 pts) + idempotency check + negative balance rejection
await asUser(ownerA, 'authenticated', async () => {
  await db.query(
    `select public.studioflow_ziya_admin_adjust_points($1, 100, 'Welcome bonus from Ziya', '66666666-6666-4666-8666-666666666661'::uuid, $2)`,
    [customerA, ownerA],
  );
  // Duplicate request ID should NOT add another 100 pts
  await db.query(
    `select public.studioflow_ziya_admin_adjust_points($1, 100, 'Welcome bonus from Ziya', '66666666-6666-4666-8666-666666666661'::uuid, $2)`,
    [customerA, ownerA],
  );
});

await assert.rejects(
  () =>
    asUser(ownerA, 'authenticated', () =>
      db.query(
        `select public.studioflow_ziya_admin_adjust_points($1, -500, 'Too large deduction', '66666666-6666-4666-8666-666666666662'::uuid, $2)`,
        [customerA, ownerA],
      ),
    ),
  /negative|insufficient|exceeds/i,
  'Negative loyalty balance prevented',
);

// Customer A now has 110 pts -> cannot redeem 200-pt reward, CAN redeem 100-pt reward (₹50 Haircut Discount)!
const reward200 = adminInit.loyaltyRewards.find((r) => r.pointsCost === 200);
const reward100 = adminInit.loyaltyRewards.find((r) => r.pointsCost === 100);

await assert.rejects(
  () =>
    asUser(customerA, 'authenticated', () =>
      db.query(`select public.studioflow_ziya_redeem_loyalty_reward('ziya-hair-studio', $1, '77777777-7777-4777-8777-777777777771'::uuid)`, [
        reward200.id,
      ]),
    ),
  /200|insufficient/i,
);

const redeemed = await asUser(customerA, 'authenticated', async () => {
  const res = await db.query(
    `select public.studioflow_ziya_redeem_loyalty_reward('ziya-hair-studio', $1, '77777777-7777-4777-8777-777777777772'::uuid) as voucher`,
    [reward100.id],
  );
  // Idempotent retry returns exact same voucher without double-deducting
  const retry = await db.query(
    `select public.studioflow_ziya_redeem_loyalty_reward('ziya-hair-studio', $1, '77777777-7777-4777-8777-777777777772'::uuid) as voucher`,
    [reward100.id],
  );
  assert.equal(res.rows[0].voucher.couponCode, retry.rows[0].voucher.couponCode);
  return res.rows[0].voucher;
});
assert.match(redeemed.couponCode, /^ZIYA-[A-F0-9]{8}$/);
assert.equal(redeemed.balanceAfter, 10, '110 - 100 = 10 points remaining');

// Apply the issued loyalty voucher code on a Curtain Bangs booking (₹550 - ₹50 = ₹500)!
const voucherQuote = await asUser(customerA, 'authenticated', async () => {
  const res = await db.query(
    `select public.studioflow_coupon_quote('ziya-hair-studio', '["hs-10"]'::jsonb, $1) as quote`,
    [redeemed.couponCode],
  );
  return res.rows[0].quote;
});
assert.equal(Number(voucherQuote.discountAmount), 50);
assert.equal(Number(voucherQuote.finalPrice), 500);

// Cancel the completed Butterfly booking -> reverses the 10 earned points safely down to 0 (never negative)
await db.query(`update public.studioflow_bookings set status = 'cancelled' where id = $1`, [butterflyBookingId]);
// Also cancel booking1 -> releases ZIYA15 reservation so Customer A can use ZIYA15 again!
await db.query(`update public.studioflow_bookings set status = 'cancelled' where id = $1`, [booking1Id]);

const custAfterCancel = await asUser(customerA, 'authenticated', async () => {
  const res = await db.query(`select public.studioflow_ziya_public_offers_and_loyalty('ziya-hair-studio') as data`);
  return res.rows[0].data.customer;
});
assert.equal(custAfterCancel.balance, 0, 'Cancelled completed booking reversed earned 10 points cleanly to 0');

const retryZiya15AfterCancel = await asUser(customerA, 'authenticated', async () => {
  const res = await db.query(
    `select public.studioflow_coupon_quote('ziya-hair-studio', '["hs-1"]'::jsonb, 'ZIYA15') as quote`,
  );
  return res.rows[0].quote;
});
assert.equal(Number(retryZiya15AfterCancel.discountAmount), 142.5, 'Released coupon usable again after booking cancellation');

// Customer B isolation check: Customer B cannot see Customer A's ledger rows
const custBLedger = await asUser(customerB, 'authenticated', () =>
  db.query(`select * from public.loyalty_points_ledger where salon_id = $1`, [ownerA]),
);
assert.equal(custBLedger.rows.length, 0, 'RLS isolates loyalty_points_ledger per customer');

// 7. Customer Haircut Enquiry submission & Admin CRUD verification
const enqRes = await asUser(null, 'anon', async () => {
  const res = await db.query(
    `select public.studioflow_ziya_submit_enquiry(
      p_slug => 'ziya-hair-studio',
      p_name => 'Ananya Rao',
      p_phone => '+91 98801 11223',
      p_email => 'ananya@example.com',
      p_service_name => 'Butterfly Haircut',
      p_message => 'My hair is waist-length wavy — looking for face-framing butterfly layers.',
      p_preferred_date => '2026-11-20'::date
    ) as enquiry`,
  );
  return res.rows[0].enquiry;
});
assert.ok(enqRes && enqRes.id, 'Enquiry saved with generated UUID');

// Admin creates a new promotion, updates loyalty settings, and sees the enquiry
const finalAdmin = await asUser(ownerA, 'authenticated', async () => {
  await db.query(
    `select public.studioflow_ziya_admin_save_promotion($1::jsonb, $2)`,
    [
      JSON.stringify({
        title: 'Curtain Bangs Refresh',
        description: 'Flat ₹100 off Curtain Bangs & Face-Framing Cuts.',
        discountType: 'flat',
        discountValue: 100,
        couponCode: 'BANGS100',
        minBookingAmount: 500,
        applicableServiceIds: ['hs-10'],
        maxUsesPerCustomer: 2,
        isActive: true,
        demoApproved: true,
      }),
      ownerA,
    ],
  );
  const res = await db.query(`select public.studioflow_ziya_admin_dashboard($1) as dashboard`, [ownerA]);
  return res.rows[0].dashboard;
});

assert.equal(finalAdmin.promotions.length, 4, 'Admin created 4th haircut promotion');
assert.ok(finalAdmin.promotions.some((p) => p.couponCode === 'BANGS100' && p.isDemo === false));
assert.equal(finalAdmin.enquiries.length, 1, 'Admin inbox receives submitted haircut enquiry');
assert.equal(finalAdmin.enquiries[0].serviceName, 'Butterfly Haircut');

console.log(
  'PASS: Ziya Women’s Hair Studio SQL migrations (idempotent), RLS isolation on 5 tables, coupon validation & booking redemptions, Ziya Style Rewards earning/redemption/reversal, admin CRUD, and haircut enquiries.',
);
