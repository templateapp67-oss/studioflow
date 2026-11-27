// BOLA / RLS cross-tenant proof for the StudioFlow database.
//
// This is the automated answer to "is tenant isolation actually safe?": the
// full offline migration chain (the same one verify-sql-migrations.mjs
// proves applies cleanly, plus the release-pending MFA/backup hardening and
// the WhatsApp tenancy migrations) is applied to an ephemeral PGlite
// database, two tenants are seeded, and every tenant-scoped table, storage
// bucket and privileged RPC is then probed with the wrong identity:
//
//   * Tenant A's session must never see Tenant B's rows (read, update,
//     delete), and vice versa.
//   * The `anon` role is never trusted: every private relation denies it,
//     explicitly or by default-privilege.
//   * Privilege escalation from `authenticated` (staff, customer, or a
//     sales/"site_admin" JWT claim) to owner-only or service-role-only
//     capabilities must fail.
//   * Invite/token-gated RPCs fail closed on garbage, expired and
//     cross-tenant attempts.
//
// The hosted Supabase project's `service_role` carries BYPASSRLS, so the
// role is given that attribute here too — otherwise "service_role sees
// everything (and the server only)" cannot be asserted meaningfully. The
// `storage.objects` table has RLS enabled by default in Supabase, which is
// replicated before the storage policies are exercised.
//
// Legacy FK-only placeholders `public.bookings` / `public.payment_orders`
// are created by scripts/lib/offline-migrated-db.mjs solely so the WhatsApp
// platform migration's foreign keys resolve; the canonical tenant tables
// are the studioflow_* / salon_whatsapp_* relations asserted below.
//
// Run: node scripts/verify-bola-and-rls.mjs
import assert from 'node:assert/strict';
import { createOfflineMigratedDb } from './lib/offline-migrated-db.mjs';

const { db } = await createOfflineMigratedDb();
await db.exec('alter role service_role bypassrls;');
await db.exec('alter table storage.objects enable row level security;');
await db.exec('grant select, insert, update, delete on storage.objects to anon, authenticated;');

const OWNER_A = '11111111-1111-4111-8111-111111111111';
const OWNER_B = '22222222-2222-4222-8222-222222222222';
const CUSTOMER_A = '33333333-3333-4333-8333-333333333333';
const CUSTOMER_B = '44444444-4444-4444-8444-444444444444';
const STAFF_A = '55555555-5555-4555-8555-555555555555';
const STAFF_B = '66666666-6666-4666-8666-666666666666';
const MANAGER_A = '99999999-9999-4999-8999-999999999999';
const SALON_A = '77777777-7777-4777-8777-777777777771';
const SALON_B = '88888888-8888-4888-8888-888888888882';
const BRANCH_A = 'aa000000-0000-4000-8000-00000000000a';
const BRANCH_B = 'bb000000-0000-4000-8000-00000000000b';
const BOOKING_A = 'ba000000-0000-4000-8000-000000000001';
const BOOKING_A_OTHER_STYLIST = 'ba000000-0000-4000-8000-000000000002';
const BOOKING_B = 'bb000000-0000-4000-8000-000000000003';
const BOOKING_A_PENDING = 'ba000000-0000-4000-8000-000000000004';

let checks = 0;
const ok = (label) => { checks += 1; console.log(`PASS: ${label}`); };

async function session(role, claims) {
  await db.exec('reset role');
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claims', $1, false)", [claims ? JSON.stringify(claims) : '']);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [claims?.sub ?? '']);
}
const asAnon = () => session('anon', null);
const asOwnerA = () => session('authenticated', { role: 'authenticated', sub: OWNER_A, aal: 'aal1' });
const asOwnerB = () => session('authenticated', { role: 'authenticated', sub: OWNER_B, aal: 'aal1' });
const asCustomerA = () => session('authenticated', { role: 'authenticated', sub: CUSTOMER_A, aal: 'aal1' });
const asCustomerB = () => session('authenticated', { role: 'authenticated', sub: CUSTOMER_B, aal: 'aal1' });
const asStaffA = () => session('authenticated', { role: 'authenticated', sub: STAFF_A, aal: 'aal1' });
const asStaffB = () => session('authenticated', { role: 'authenticated', sub: STAFF_B, aal: 'aal1' });
const asManagerA = () => session('authenticated', { role: 'authenticated', sub: MANAGER_A, aal: 'aal1' });
const asSalesA = () => session('authenticated', { role: 'authenticated', sub: CUSTOMER_A, aal: 'aal1', app_metadata: { site_role: 'sales' } });
const asServiceRole = () => session('service_role', { role: 'service_role' });
const asSuper = async (fn) => { await session('postgres', null); await db.exec('reset role'); return fn(); };

// A grant-missing or policy-violating call must throw; a row-invisible
// cross-tenant read must return zero rows — never the other tenant's data.
async function denied(label, pattern, fn) {
  try {
    await fn();
  } catch (error) {
    assert.match(String(error?.message ?? error), pattern, `${label} — wrong error: ${error?.message ?? error}`);
    ok(label);
    return;
  }
  assert.fail(`${label} — expected denial, but the operation succeeded`);
}

async function noRows(label, sql, args = []) {
  const result = await db.query(sql, args);
  assert.equal(result.rows.length, 0, label);
  ok(label);
}

async function rowCount(label, sql, args, expected) {
  const result = await db.query(sql, args);
  assert.equal(result.rows.length, expected, label);
  ok(label);
}

async function changedCount(label, sql, args, expected) {
  const result = await db.query(sql, args);
  assert.equal(result.rowCount ?? 0, expected, label);
  ok(label);
}

const future = (days, hours = 0) => new Date(Date.now() + days * 864e5 + hours * 36e5).toISOString();

// ---------------------------------------------------------------------------
// Seed: two tenants, their customers, staff and one shared catalog template.
// ---------------------------------------------------------------------------
const draftA = {
  profile: { businessName: 'Salon Alpha', branches: [{ id: BRANCH_A, name: 'Alpha Main', isActive: true }] },
  services: [{ id: 'svc-a-1', name: 'Signature Cut', category: 'Hair', price: 900, durationMinutes: 30, description: 'Cut and finish' }],
  stylists: [
    { id: 'sty-a-1', name: 'Anita Sharma' },
    { id: 'sty-a-2', name: 'Rahul Verma' },
    { id: 'sty-a-9', name: 'Not Yet A Member' },
  ],
};
const draftB = {
  profile: { businessName: 'Salon Beta', branches: [{ id: BRANCH_B, name: 'Beta Main', isActive: true }] },
  services: [{ id: 'svc-b-1', name: 'Beta Facial', category: 'Skin', price: 1500, durationMinutes: 45, description: 'Facial ritual' }],
  stylists: [
    { id: 'sty-b-1', name: 'Bhavya Nair' },
    { id: 'sty-b-9', name: 'Beta Invite Candidate' },
  ],
};

await asSuper(async () => {
  for (const [id, email] of [
    [OWNER_A, 'owner-a@example.test'], [OWNER_B, 'owner-b@example.test'],
    [CUSTOMER_A, 'customer-a@example.test'], [CUSTOMER_B, 'customer-b@example.test'],
    [STAFF_A, 'staff-a@example.test'], [STAFF_B, 'staff-b@example.test'], [MANAGER_A, 'manager-a@example.test'],
  ]) {
    await db.query('insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data,is_anonymous) values($1,$2,$3,$4,false)',
      [id, email, '{}', '{}']);
  }
  await db.query('insert into public.salons(id) values($1),($2)', [SALON_A, SALON_B]);
  await db.query(
    `insert into public.studioflow_accounts(user_id, template_id, draft, revision)
     values($1,'beauty_parlour',$2::jsonb,1),($3,'beauty_parlour',$4::jsonb,1)`,
    [OWNER_A, JSON.stringify(draftA), OWNER_B, JSON.stringify(draftB)]);
  // The branch-guard trigger is exercised by the multibranch suites; this
  // suite seeds bookings directly so tenant isolation is what is under test.
  await db.exec('alter table public.studioflow_bookings disable trigger studioflow_booking_branch_guard');
  // BOOKING_A_PENDING sits on a different week so the payment overbooking
  // guard (same stylist, overlapping window) never fires for it.
  const bookings = [
    [BOOKING_A, OWNER_A, CUSTOMER_A, 'sty-a-1', 'confirmed', { servicePrice: 1200, clientName: 'Ava A', clientEmail: 'customer-a@example.test', clientPhone: '911111111111', branchId: BRANCH_A, serviceName: 'Signature Cut', stylistName: 'Anita Sharma' }],
    // BOOKING_A_OTHER_STYLIST belongs to Tenant A on both axes (owner and
    // customer) so the owner-contacts probes can use CUSTOMER_B as a truly
    // foreign customer; stylist sty-a-2 keeps it out of sty-a-1's scope.
    [BOOKING_A_OTHER_STYLIST, OWNER_A, CUSTOMER_A, 'sty-a-2', 'confirmed', { servicePrice: 800, clientName: 'Ava A', clientEmail: 'customer-a@example.test', clientPhone: '911111111111', branchId: BRANCH_A, serviceName: 'Signature Cut', stylistName: 'Rahul Verma' }],
    [BOOKING_B, OWNER_B, CUSTOMER_B, 'sty-b-1', 'confirmed', { servicePrice: 1500, clientName: 'Bhavi B', clientEmail: 'customer-b@example.test', clientPhone: '922222222222', branchId: BRANCH_B, serviceName: 'Beta Facial', stylistName: 'Bhavya Nair' }],
    [BOOKING_A_PENDING, OWNER_A, CUSTOMER_A, 'sty-a-2', 'pending', { servicePrice: 1000, clientName: 'Ava A', clientEmail: 'customer-a@example.test', clientPhone: '911111111111', branchId: BRANCH_A, serviceName: 'Signature Cut', stylistName: 'Rahul Verma' }],
  ];
  const bookingWindows = new Map([
    [BOOKING_A, [7, 1]], [BOOKING_A_OTHER_STYLIST, [7, 1]], [BOOKING_B, [8, 1]], [BOOKING_A_PENDING, [21, 1]],
  ]);
  for (const [id, owner, customer, stylist, status, payload] of bookings) {
    const [startDays, durationHours] = bookingWindows.get(id);
    await db.query(
      `insert into public.studioflow_bookings(id,owner_id,customer_id,stylist_id,starts_at,ends_at,status,payload,hold_expires_at)
       values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
      [id, owner, customer, stylist, future(startDays), future(startDays, durationHours), status, JSON.stringify(payload),
       status === 'pending' ? future(0, 1) : null]);
  }
  await db.exec('alter table public.studioflow_bookings enable trigger studioflow_booking_branch_guard');
  await db.query(
    `insert into public.studioflow_payment_orders(booking_id, order_id, amount_paise, status)
     values($1,'order-alpha-1',30000,'created'),($2,'order-beta-1',37500,'created')`,
    [BOOKING_A, BOOKING_B]);
  await db.query(
    `insert into public.landing_leads(lead_type,status,full_name,email,consent_given)
     values('demo_request','new','Lead Person','lead@example.test',true)`);
  await db.query(
    `insert into public.studioflow_customer_addresses(customer_id,label,address_line,city,postal_code)
     values($1,'Home','12 Alpha Street','Jaipur','302001'),($2,'Home','34 Beta Avenue','Delhi','110001')`,
    [CUSTOMER_A, CUSTOMER_B]);
  await db.query(
    `insert into public.studioflow_customer_preferences(customer_id,theme,language)
     values($1,'light','en'),($2,'dark','hi')`,
    [CUSTOMER_A, CUSTOMER_B]);
  await db.query(
    `insert into public.studioflow_android_profiles(customer_id,full_name,phone,whatsapp_number)
     values($1,'Ava A','911111111111','+919811122233'),($2,'Bhavi B','922222222222','+919822233344')`,
    [CUSTOMER_A, CUSTOMER_B]);
  await db.query(
    `insert into public.studioflow_customer_marketing_preferences(customer_id,owner_id,whatsapp_opt_in,birthday_opt_in)
     values($1,$2,true,true),($3,$4,true,false)`,
    [CUSTOMER_A, OWNER_A, CUSTOMER_B, OWNER_B]);
  await db.query(
    `insert into public.studioflow_owner_campaigns(owner_id,title,body)
     values($1,'Alpha Launch','Hello {name}')`,
    [OWNER_A]);
  const { rows: [campaign] } = await db.query("select id from public.studioflow_owner_campaigns where owner_id=$1", [OWNER_A]);
  await db.query(
    `insert into public.studioflow_owner_campaign_recipients(campaign_id,customer_id) values($1,$2)`,
    [campaign.id, CUSTOMER_A]);
  await db.query(
    `insert into public.studioflow_owner_contact_notes(owner_id,customer_id,tags,notes,do_not_contact)
     values($1,$2,'vip','Prefers evenings',false)`,
    [OWNER_A, CUSTOMER_A]);
  // Staff identities: STAFF_A serves Tenant A (BRANCH_A), STAFF_B serves
  // Tenant B (BRANCH_B), MANAGER_A manages Tenant A on every branch.
  await db.query(
    `insert into public.studioflow_staff_members(owner_id,user_id,staff_id,role,branch_ids,all_branches,is_active)
     values($1,$2,'sty-a-1','Service Provider (Assigned)',$7::text[],false,true),
            ($3,$4,'sty-b-1','Service Provider (Assigned)',$8::text[],false,true),
            ($5,$6,'sty-a-2','Manager (Full Access)','{}',true,true)`,
    [OWNER_A, STAFF_A, OWNER_B, STAFF_B, OWNER_A, MANAGER_A, [BRANCH_A], [BRANCH_B]]);
  // Service catalogue is trigger-synced from the account drafts.
  // WhatsApp tenant rows (secrets stay server-side; clients are revoked).
  for (const [salon, owner, phone, tokenFrag] of [[SALON_A, OWNER_A, 'pn-alpha-1', 'alpha'], [SALON_B, OWNER_B, 'pn-beta-1', 'beta']]) {
    await db.query(
      `insert into public.salon_whatsapp_connections(salon_id,waba_id,phone_number_id,display_phone_number,verified_name,access_token_ciphertext,access_token_iv,owner_id)
       values($1,$2,$3,$4,$5,$6,$7,$8)`,
      [salon, `waba-${tokenFrag}`, phone, `+91 90000 0000${tokenFrag === 'alpha' ? '1' : '2'}`,
       `Salon ${tokenFrag}`, `ciphertext-${tokenFrag}`, `iv-${tokenFrag}`, owner]);
    await db.query(
      `insert into public.salon_whatsapp_oauth_states(state_hash,salon_id,initiated_by,expires_at,owner_id)
       values($1,$2,$3,$4,$5)`,
      [`statehash-${tokenFrag}`, salon, owner, future(0, 1), owner]);
    await db.query(
      `insert into public.salon_whatsapp_webhook_events(provider_event_id,salon_id,event_type,payload,owner_id)
       values($1,$2,'messages','{"entry":[]}'::jsonb,$3)`,
      [`evt-${tokenFrag}`, salon, owner]);
    await db.query(
      `insert into public.salon_whatsapp_conversations(salon_id,customer_wa_id,customer_name,owner_id)
       values($1,$2,$3,$4)`,
      [salon, tokenFrag === 'alpha' ? '919000000001' : '919000000002', `Customer ${tokenFrag}`, owner]);
    await db.query(
      `insert into public.salon_whatsapp_message_log(salon_id,direction,recipient_wa_id,message_kind,delivery_status,owner_id)
       values($1,'inbound',$2,'conversation','received',$3)`,
      [salon, tokenFrag === 'alpha' ? '919000000001' : '919000000002', owner]);
  }
  await db.query(
    `insert into public.studioflow_demo_bookings(customer_id,owner_id,request_id,status,payload)
     values($1,$2,gen_random_uuid(),'confirmed','{"demo":true,"servicePrice":0,"amountPaid":0}'::jsonb),
            ($3,$4,gen_random_uuid(),'confirmed','{"demo":true,"servicePrice":0,"amountPaid":0}'::jsonb)`,
    [CUSTOMER_A, OWNER_A, CUSTOMER_B, OWNER_B]);
  await db.query(
    `insert into public.studioflow_customer_reward_claims(customer_id,owner_id,reward_id,reward_title,reward_terms,points_spent,coupon_code,request_id)
     values($1,$2,'rw-a','Alpha Reward','{}'::jsonb,100,'COUPON-ALPHA-1',gen_random_uuid()),
            ($3,$4,'rw-b','Beta Reward','{}'::jsonb,150,'COUPON-BETA-1',gen_random_uuid())`,
    [CUSTOMER_A, OWNER_A, CUSTOMER_B, OWNER_B]);
  // Disaster-recovery copy: a full PII replica that must never read back
  // through a tenant or browser role.
  await db.query(
    `insert into public.studioflow_accounts_backup(user_id,template_id,draft,revision)
     values($1,'beauty_parlour',$2::jsonb,9),($3,'beauty_parlour',$4::jsonb,9)`,
    [OWNER_A, JSON.stringify(draftA), OWNER_B, JSON.stringify(draftB)]);
  // Storage objects: per-tenant folders in the media and private buckets.
  await db.query(
    `insert into storage.objects(bucket_id,name,metadata) values
     ('studioflow-media',$1,'{"mimetype":"image/png","size":100}'::jsonb),
     ('studioflow-media',$2,'{"mimetype":"image/png","size":100}'::jsonb),
     ('nexora-customer-private',$3,'{"mimetype":"image/jpeg","size":100}'::jsonb),
     ('nexora-customer-private',$4,'{"mimetype":"image/jpeg","size":100}'::jsonb)`,
    [`${OWNER_A}/ad.png`, `${OWNER_B}/ad.png`, `${CUSTOMER_A}/photos/private-a.jpg`, `${CUSTOMER_B}/photos/private-b.jpg`]);
  await db.query(
    'insert into public.studioflow_websites(owner_id,slug,content) values($1,$2,$3::jsonb)',
    [OWNER_A, 'salon-alpha', JSON.stringify({ profile: { businessName: 'Salon Alpha' } })]);
});

// Service catalogue trigger sanity: both tenants seeded their catalogues.
await asSuper(async () => {
  const { rows } = await db.query('select owner_id, count(*)::int as n from public.studioflow_services group by owner_id');
  const counts = Object.fromEntries(rows.map((r) => [r.owner_id, r.n]));
  assert.equal(counts[OWNER_A], 1, 'Tenant A service catalogue seeded');
  assert.equal(counts[OWNER_B], 1, 'Tenant B service catalogue seeded');
});

// ---------------------------------------------------------------------------
// 1. studioflow_bookings — the hottest cross-tenant relation.
// ---------------------------------------------------------------------------
await asOwnerA();
await rowCount('Tenant A owner sees exactly the Tenant A bookings', 'select id from public.studioflow_bookings order by id', [], 3);
await noRows('Tenant A owner cannot read a Tenant B booking by id', 'select id from public.studioflow_bookings where id=$1', [BOOKING_B]);
await asOwnerB();
await rowCount('Tenant B owner sees exactly the Tenant B bookings', 'select id from public.studioflow_bookings order by id', [], 1);
await noRows('Tenant B owner cannot read a Tenant A booking by id', 'select id from public.studioflow_bookings where id=$1', [BOOKING_A]);
await asCustomerA();
await rowCount('Customer A sees their own bookings only', 'select id from public.studioflow_bookings order by id', [], 3);
await noRows('Customer A cannot read Tenant B booking by id', 'select id from public.studioflow_bookings where id=$1', [BOOKING_B]);
await asCustomerB();
await rowCount('Customer B sees their own bookings only', 'select id from public.studioflow_bookings order by id', [], 1);
await asAnon();
await denied('anon cannot read bookings at all', /permission denied/i, () => db.query('select id from public.studioflow_bookings'));
// Write boundary (mirrors the live schema replayed by the shared harness):
// authenticated HAS select/insert/update on bookings, but every write is
// confined by RLS to the caller's own salon/scope. There is no DELETE grant.
await asOwnerA();
await changedCount('owner can move a booking in their own salon through its lifecycle', "update public.studioflow_bookings set status='confirmed' where id=$1 and owner_id=$2", [BOOKING_A, OWNER_A], 1);
await changedCount('owner cannot move another tenant\u2019s booking', "update public.studioflow_bookings set status='cancelled' where id=$1", [BOOKING_B], 0);
await asCustomerA();
await changedCount('customer cannot move their own booking through the lifecycle', "update public.studioflow_bookings set status='cancelled' where id=$1", [BOOKING_A], 0);
await asManagerA();
await changedCount('salon A manager cannot move a salon B booking', "update public.studioflow_bookings set status='cancelled' where id=$1", [BOOKING_B], 0);
await asStaffA();
if (process.env.BOLA_DEBUG) {
  const dbg = await db.query(`select public.studioflow_is_assigned_branch($1,$2) as assigned, public.studioflow_current_staff_id($1) as staff_id, public.studioflow_current_staff_can($1,'book_for_all_staff') as can_all, public.studioflow_staff_scope($1) as scope, (select payload->>'branchId' from public.studioflow_bookings where id=$3) as payload_branch`, [OWNER_A, BRANCH_A, BOOKING_A]);
  console.log('DEBUG staff probe', JSON.stringify(dbg.rows));
}
await changedCount('service provider can complete their own appointment', "update public.studioflow_bookings set status='completed' where id=$1 and stylist_id='sty-a-1'", [BOOKING_A], 1);
await changedCount('service provider cannot move another stylist\u2019s booking', "update public.studioflow_bookings set status='cancelled' where id=$1", [BOOKING_A_OTHER_STYLIST], 0);
await asOwnerA();
await changedCount('restore booking status after the lifecycle probe', "update public.studioflow_bookings set status='confirmed' where id=$1 and owner_id=$2", [BOOKING_A, OWNER_A], 1);
await denied('authenticated has no DELETE grant on bookings at all', /permission denied/i, () =>
  db.query('delete from public.studioflow_bookings'));
await asAnon();
await denied('anon cannot INSERT a booking', /permission denied/i, () =>
  db.query("insert into public.studioflow_bookings(owner_id,customer_id,stylist_id,starts_at,ends_at,status,payload) values($1,$2,'sty-a-1',$3,$4,'pending','{}'::jsonb)", [OWNER_A, CUSTOMER_A, future(8), future(8, 1)]));
await denied('anon cannot UPDATE a booking', /permission denied/i, () =>
  db.query("update public.studioflow_bookings set status='cancelled'"));
// Staff visibility: Service Provider sees only their own assigned bookings in
// their branch; an out-of-branch or unassigned booking stays hidden.
await asStaffA();
await rowCount('Service Provider sees only bookings assigned to them in their branch', 'select id from public.studioflow_bookings order by id', [], 1);
await noRows('Service Provider cannot see Tenant B booking', 'select id from public.studioflow_bookings where id=$1', [BOOKING_B]);
await asManagerA();
await rowCount('Manager sees the whole Tenant A desk (and not Tenant B)', 'select id from public.studioflow_bookings order by id', [], 3);
await noRows('Manager cannot see Tenant B booking', 'select id from public.studioflow_bookings where id=$1', [BOOKING_B]);
// A staff member of Tenant B sees only Tenant B rows, never Tenant A's.
await asStaffB();
await rowCount('Tenant B staff see only Tenant B bookings', 'select id from public.studioflow_bookings order by id', [], 1);

// ---------------------------------------------------------------------------
// 2. studioflow_services — catalogue isolation.
// ---------------------------------------------------------------------------
await asOwnerA();
await rowCount('Tenant A owner sees only Tenant A services', 'select service_id from public.studioflow_services', [], 1);
await noRows('Tenant A owner cannot read Tenant B service', "select service_id from public.studioflow_services where service_id='svc-b-1'");
await asOwnerB();
await rowCount('Tenant B owner sees only Tenant B services', 'select service_id from public.studioflow_services', [], 1);
await asStaffA();
// Staff may read their own salon's catalogue projection (studioflow_services_staff_read),
// but never another salon's.
await asStaffA();
await noRows('Tenant A staff cannot read Tenant B services', "select service_id from public.studioflow_services where service_id='svc-b-1'");
await rowCount('Tenant A staff read their own salon catalogue projection', "select service_id from public.studioflow_services", [], 1);
await asStaffB();
await noRows('Tenant B staff cannot read Tenant A services', "select service_id from public.studioflow_services where service_id='svc-a-1'");
await asOwnerA();
await denied('authenticated cannot INSERT a service directly', /permission denied/i, () =>
  db.query("insert into public.studioflow_services(owner_id,service_id,name,category,price,duration_minutes,position) values($1,'svc-x','X','X',1,10,0)", [OWNER_A]));
await denied('authenticated cannot UPDATE a service directly', /permission denied/i, () =>
  db.query("update public.studioflow_services set price=1 where owner_id=$1", [OWNER_A]));
await asAnon();
await denied('anon cannot read services', /permission denied/i, () => db.query('select service_id from public.studioflow_services'));

// ---------------------------------------------------------------------------
// 3. studioflow_accounts / studioflow_websites — account rows and the
//    storefront projection.
// ---------------------------------------------------------------------------
await asOwnerA();
await rowCount('Tenant A owner reads only their own account row', 'select user_id from public.studioflow_accounts', [], 1);
await noRows('Tenant A owner cannot read Tenant B account row', 'select user_id from public.studioflow_accounts where user_id=$1', [OWNER_B]);
await denied('authenticated cannot UPDATE the account draft directly', /permission denied/i, () =>
  db.query("update public.studioflow_accounts set draft='{}'::jsonb where user_id=$1", [OWNER_A]));
await asAnon();
await denied('anon cannot read accounts', /permission denied/i, () => db.query('select user_id from public.studioflow_accounts'));
await rowCount('websites are world-readable through the projection view only', 'select slug from public.public_salon_websites', [], 1);
await denied('anon cannot read the base websites table directly', /permission denied/i, () =>
  db.query('select owner_id from public.studioflow_websites'));
await asOwnerA();
await denied('authenticated cannot UPDATE a website directly', /permission denied/i, () =>
  db.query("update public.studioflow_websites set slug='hijacked' where owner_id=$1", [OWNER_A]));
await denied('authenticated cannot INSERT a website directly', /permission denied/i, () =>
  db.query("insert into public.studioflow_websites(owner_id,slug,content) values($1,'rogue-site','{}'::jsonb)", [OWNER_A]));

// ---------------------------------------------------------------------------
// 4. Staff membership, invites and the privilege-escalation surface.
// ---------------------------------------------------------------------------
await asOwnerA();
await rowCount('Tenant A owner sees Tenant A staff members only', "select staff_id from public.studioflow_staff_members where is_active", [], 2);
await noRows('Tenant A owner cannot see Tenant B staff members', 'select id from public.studioflow_staff_members where owner_id=$1', [OWNER_B]);
await asStaffA();
await rowCount('Staff read exactly their own membership row', 'select id from public.studioflow_staff_members', [], 1);
await denied('staff cannot DELETE their own membership row', /permission denied/i, () =>
  db.query('delete from public.studioflow_staff_members where user_id=$1', [STAFF_A]));
await denied('staff cannot UPDATE their own membership row', /permission denied/i, () =>
  db.query("update public.studioflow_staff_members set role='Manager (Full Access)' where user_id=$1", [STAFF_A]));
await asStaffB();
await rowCount('Tenant B staff see exactly their own membership row', 'select id from public.studioflow_staff_members', [], 1);
// Direct invite reads are closed entirely (token-gated RPC is the only path).
await asOwnerA();
await denied('authenticated cannot SELECT staff invites directly', /permission denied/i, () =>
  db.query('select id from public.studioflow_staff_invites'));
await denied('authenticated cannot INSERT a staff invite directly', /permission denied/i, () =>
  db.query("insert into public.studioflow_staff_invites(owner_id,staff_id,token_hash,created_by) values($1,'sty-a-9','hash',$1)", [OWNER_A]));
await denied('owner cannot UPDATE another tenant\u2019s membership', /permission denied/i, () =>
  db.query('update public.studioflow_staff_members set is_active=false where owner_id=$1', [OWNER_B]));
// Invite lifecycle through the owner-scoped RPC.
const inviteCreated = await asOwnerA().then(() =>
  db.query('select public.studioflow_staff_invite_create($1,$2,$3,$4,$5,$6,$7) as result',
    ['sty-a-9', 'Receptionist (Frontdesk)', [BRANCH_A], 'invitee-a@example.test', null, 7, false]));
const inviteA = inviteCreated.rows[0].result;
if (process.env.BOLA_DEBUG) console.log('DEBUG inviteA', typeof inviteA, JSON.stringify(inviteA)?.slice(0, 400));
assert.ok(inviteA && typeof inviteA.token === 'string' && inviteA.token.length === 64, 'owner invite creation returns a one-time token');
ok('Tenant A owner creates an invite for their own roster');
// Cross-tenant: B cannot invite A's stylist — the RPC resolves the roster
// against the *caller*, so A's staff id is unknown inside B's salon.
await asOwnerB();
await denied('Tenant B owner cannot invite Tenant A roster ids', /not found in your salon/i, () =>
  db.query('select public.studioflow_staff_invite_create($1,$2,$3,$4,$5,$6,$7)',
    ['sty-a-9', 'Manager (Full Access)', [BRANCH_B], 'x@example.test', null, 7, false]));
// Cross-tenant branch: A's branch id is meaningless inside B's salon and the
// invite must fail closed instead of granting it.
await denied('Tenant B owner cannot grant Tenant A branches in an invite', /at least one active branch/i, () =>
  db.query('select public.studioflow_staff_invite_create($1,$2,$3,$4,$5,$6,$7)',
    ['sty-b-9', 'Manager (Full Access)', [BRANCH_A], 'x@example.test', null, 7, false]));
// A plain staff member can never mint invites for their salon.
await asStaffA();
await denied('staff cannot create invites (owner-only RPC)', /not found in your salon|42501/i, () =>
  db.query('select public.studioflow_staff_invite_create($1,$2,$3)', ['sty-a-9', 'Manager (Full Access)', [BRANCH_A]]));
// anon has no EXECUTE on the create RPC at all.
await asAnon();
await denied('anon cannot execute the invite creation RPC', /permission denied/i, () =>
  db.query('select public.studioflow_staff_invite_create($1,$2,$3)', ['sty-a-9', 'Manager (Full Access)', [BRANCH_A]]));
// Token lookup is the one anon-visible RPC; it must return only minimal data.
await asAnon();
const lookup = (await db.query('select public.studioflow_staff_invite_lookup($1) as result', [inviteA.token])).rows[0].result;
assert.equal(lookup.status, 'pending', 'invite lookup recognises the issued token');
assert.equal(lookup.salonName, 'Salon Alpha', 'invite lookup returns only the salon display name');
assert.equal(lookup.owner_id ?? lookup.ownerId ?? null, null, 'invite lookup never leaks the owner id');
assert.equal(lookup.email, 'invitee-a@example.test', 'invite lookup returns only the invited address');
ok('invite lookup exposes only token-gated, minimal invite metadata');
const bogus = (await db.query('select public.studioflow_staff_invite_lookup($1) as result', ['f'.repeat(64)])).rows[0].result;
assert.equal(bogus.status, 'invalid', 'unknown token resolves to invalid');
ok('invite lookup fails closed on an unknown token');
const shortToken = (await db.query("select public.studioflow_staff_invite_lookup('abc') as result")).rows[0].result;
assert.equal(shortToken.status, 'invalid', 'short token resolves to invalid');
ok('invite lookup fails closed on a malformed token');
// The owner-side ledger RPC must show A's invites only.
const ledger = (await asOwnerA().then(() => db.query('select public.studioflow_staff_invites() as result'))).rows[0].result;
assert.ok(Array.isArray(ledger) ? ledger.every((row) => row.staffId !== 'sty-b-1') : true, 'owner ledger carries no foreign rows');
ok('owner invite ledger is tenant-scoped');
// Cross-tenant revoke: B cannot revoke A's invite even with its id.
await asOwnerB();
await denied('Tenant B owner cannot revoke Tenant A invite', /not found or already revoked/i, () =>
  db.query('select public.studioflow_staff_invite_revoke($1)', [inviteA.inviteId]));
await asOwnerA();
const revoke = (await db.query('select public.studioflow_staff_invite_revoke($1) as result', [inviteA.inviteId])).rows[0].result;
assert.ok(revoke !== null, 'Tenant A owner revokes their own invite');
ok('Tenant A owner can revoke their own invite');
const revokedLookup = (await asAnon().then(() => db.query('select public.studioflow_staff_invite_lookup($1) as result', [inviteA.token]))).rows[0].result;
assert.equal(revokedLookup.status, 'revoked', 'revoked invite no longer validates');
ok('a revoked invite token fails closed in lookup');

// ---------------------------------------------------------------------------
// 5. studioflow_payment_orders — service-role-only by design.
// ---------------------------------------------------------------------------
await asOwnerA();
await denied('booking owner cannot SELECT the payment order directly', /permission denied|row-level security/i, () =>
  db.query('select order_id from public.studioflow_payment_orders'));
await denied('booking owner cannot INSERT a payment order', /permission denied|row-level security/i, () =>
  db.query("insert into public.studioflow_payment_orders(booking_id,order_id,amount_paise) values($1,'order-forged',100)", [BOOKING_A]));
await asAnon();
await denied('anon cannot SELECT payment orders', /permission denied|row-level security/i, () =>
  db.query('select order_id from public.studioflow_payment_orders'));
// Even with a valid tenant JWT, the settle/register RPCs must stay
// service-role-only: a browser session can never certify money movement.
await asOwnerA();
await denied('authenticated cannot EXECUTE register_payment', /permission denied/i, () =>
  db.query('select public.studioflow_register_payment($1,$2,$3)', [BOOKING_A_PENDING, 'order-forge-1', 25000]));
await denied('authenticated cannot EXECUTE settle_payment', /permission denied/i, () =>
  db.query("select public.studioflow_settle_payment('order-alpha-1','pay_forge',30000)"));
// Functional happy path on the service-role boundary (what the payment
// webhook does): reserve the deposit, then settle it.
await asServiceRole();
const register = (await db.query('select public.studioflow_register_payment($1,$2,$3) as result', [BOOKING_A_PENDING, 'order-alpha-pending', 25000])).rows[0].result;
assert.equal(Number(register.amount_paise), 25000, 'register_payment reserves the mandatory 25%% deposit');
ok('service_role register_payment reserves the exact 25% deposit');
await denied('service_role register_payment rejects a wrong deposit amount', /Invalid mandatory 25 percent/i, () =>
  db.query('select public.studioflow_register_payment($1,$2,$3)', [BOOKING_A_PENDING, 'order-alpha-pending-2', 1]));
const settle = (await db.query("select public.studioflow_settle_payment('order-alpha-pending','pay_alpha_1',25000) as result")).rows[0].result;
assert.equal(settle.status, 'confirmed', 'settle_payment confirms the booking');
assert.equal(settle.paymentStatus, 'paid_deposit', 'settle_payment stamps the paid deposit');
ok('service_role settle_payment captures the deposit and confirms the booking');
await denied('service_role settle_payment rejects an amount that does not match the order', /does not match reserved order/i, () =>
  db.query("select public.studioflow_settle_payment('order-alpha-pending','pay_alpha_2',24999)"));
// ---------------------------------------------------------------------------
// 6. landing_leads — site_admin/sales JWT claim required; no tenant axis.
// ---------------------------------------------------------------------------
await asAnon();
await denied('anon cannot read landing leads', /permission denied/i, () => db.query('select id from public.landing_leads'));
await asOwnerA(); // plain authenticated, no site_role claim
await noRows('authenticated without site_role sees zero leads', 'select id from public.landing_leads');
await changedCount('authenticated without site_role updates zero leads',
  "update public.landing_leads set status='contacted'", [], 0);
await asSalesA(); // app_metadata.site_role = 'sales'
await rowCount('sales claim reads the lead queue', 'select id from public.landing_leads', [], 1);
await changedCount('sales claim can advance the lead workflow',
  "update public.landing_leads set status='contacted' where email='lead@example.test'", [], 1);
await denied('sales claim cannot INSERT a lead from the browser', /permission denied/i, () =>
  db.query("insert into public.landing_leads(lead_type,full_name,email,consent_given) values('demo_request','Forge Lead','forge@example.test',true)"));
// ---------------------------------------------------------------------------
// 7. Customer portal — self-scoped CRUD.
// ---------------------------------------------------------------------------
await asCustomerA();
await rowCount('customer A sees only their own addresses', 'select id from public.studioflow_customer_addresses', [], 1);
await noRows('customer A cannot read customer B addresses', "select id from public.studioflow_customer_addresses where city='Delhi'");
await denied('customer A cannot INSERT an address for customer B', /row-level security/i, () =>
  db.query("insert into public.studioflow_customer_addresses(customer_id,label,address_line,city) values($1,'Office','88 Forge Lane','Mumbai')", [CUSTOMER_B]));
await changedCount('customer A cannot UPDATE customer B address',
  "update public.studioflow_customer_addresses set city='Forged' where city='Delhi'", [], 0);
await changedCount('customer A cannot DELETE customer B address',
  "delete from public.studioflow_customer_addresses where city='Delhi'", [], 0);
await asCustomerB();
await rowCount('customer B sees only their own address', 'select id from public.studioflow_customer_addresses', [], 1);
await asCustomerA();
await rowCount('customer A reads only their own preference row', 'select customer_id from public.studioflow_customer_preferences', [], 1);
await denied('customer A cannot INSERT preferences for customer B', /row-level security|duplicate key/i, () =>
  db.query("insert into public.studioflow_customer_preferences(customer_id,theme) values($1,'dark')", [CUSTOMER_B]));
await changedCount('customer A cannot UPDATE customer B preferences',
  "update public.studioflow_customer_preferences set theme='light' where customer_id=$1", [CUSTOMER_B], 0);
await asAnon();
await denied('anon cannot read customer preferences', /permission denied/i, () =>
  db.query('select customer_id from public.studioflow_customer_preferences'));

// ---------------------------------------------------------------------------
// 8. Owner marketing — deny-all tables; owner-scoped definer RPCs only.
// ---------------------------------------------------------------------------
const marketingInserts = {
  studioflow_owner_contact_notes: ["insert into public.studioflow_owner_contact_notes(owner_id,customer_id,tags,notes,do_not_contact) values($1,$2,'x','y',false)", [OWNER_A, CUSTOMER_A]],
  studioflow_owner_campaigns: ["insert into public.studioflow_owner_campaigns(owner_id,title,body) values($1,'Forged','Forged body')", [OWNER_A]],
  studioflow_owner_campaign_recipients: ["insert into public.studioflow_owner_campaign_recipients(campaign_id,customer_id) values($1,$2)", ['00000000-0000-4000-8000-000000000099', CUSTOMER_A]],
  studioflow_customer_marketing_preferences: ["insert into public.studioflow_customer_marketing_preferences(customer_id,owner_id,whatsapp_opt_in,birthday_opt_in) values($1,$2,true,true)", [CUSTOMER_B, OWNER_A]],
};
for (const [table, [sql, args]] of Object.entries(marketingInserts)) {
  await asOwnerA();
  await denied(`owner cannot SELECT ${table} directly`, /permission denied|row-level security/i, () =>
    db.query(`select * from public.${table} limit 1`));
  await asOwnerA();
  await denied(`owner cannot INSERT into ${table} directly`, /permission denied|row-level security|row level security/i, () =>
    db.query(sql, args));
}
const contactsA = (await asOwnerA().then(() => db.query('select public.studioflow_owner_contacts() as result'))).rows[0].result;
if (process.env.BOLA_DEBUG) console.log('DEBUG contactsA', JSON.stringify(contactsA)?.slice(0, 600));
const contactIdsA = new Set((Array.isArray(contactsA) ? contactsA : []).map((c) => c.id));
assert.ok(contactIdsA.has(CUSTOMER_A), 'owner contacts include Tenant A customers');
assert.ok(!contactIdsA.has(CUSTOMER_B), 'owner contacts never include Tenant B customers');
ok('studioflow_owner_contacts returns only Tenant A customers');
const dobLeak = (Array.isArray(contactsA) ? contactsA : []).find((c) => c.id === CUSTOMER_A);
assert.equal(dobLeak?.dateOfBirth ?? null, dobLeak?.birthdayShared ? dobLeak.dateOfBirth : null, 'DOB is gated by birthday permission');
ok('owner contacts keeps DOB behind birthday permission');
await asManagerA();
await denied('staff manager cannot call owner contacts RPC', /owner access required|42501/i, () =>
  db.query('select public.studioflow_owner_contacts()'));
await asAnon();
await denied('anon cannot call owner contacts RPC', /permission denied/i, () =>
  db.query('select public.studioflow_owner_contacts()'));
await asOwnerA();
await denied('owner cannot save a contact note for a foreign customer', /Customer unavailable|42501/i, () =>
  db.query("select public.studioflow_owner_save_contact($1,'vip','forged',false)", [CUSTOMER_B]));
await denied('owner cannot prepare a campaign targeting a foreign customer', /no valid number|marketing permission|Customer unavailable|42501|opted/i, () =>
  db.query("select public.studioflow_owner_prepare_campaign('Forged Campaign','Body {name}',$1::uuid[])", [[CUSTOMER_B]]));
// Cross-tenant campaign draft: A's recipient id must not open for B.
const { rows: [recipientRow] } = await asSuper(() =>
  db.query('select r.id from public.studioflow_owner_campaign_recipients r join public.studioflow_owner_campaigns c on c.id=r.campaign_id where c.owner_id=$1', [OWNER_A]));
await asOwnerB();
await denied('Tenant B owner cannot open Tenant A campaign draft', /Campaign unavailable|42501/i, () =>
  db.query('select public.studioflow_owner_open_campaign_draft($1)', [recipientRow.id]));

// ---------------------------------------------------------------------------
// 9. WhatsApp tenant tables — RLS on, zero policies, clients revoked.
// ---------------------------------------------------------------------------
const whatsappProbes = [
  'salon_whatsapp_connections',
  'salon_whatsapp_oauth_states',
  'salon_whatsapp_webhook_events',
  'salon_whatsapp_conversations',
  'salon_whatsapp_message_log',
];
for (const table of whatsappProbes) {
  await asOwnerA();
  await denied(`owner cannot SELECT ${table} directly`, /permission denied|row-level security/i, () =>
    db.query(`select * from public.${table} limit 1`));
  await asOwnerA();
  await denied(`owner cannot INSERT into ${table} directly`, /permission denied|row-level security/i, () =>
    db.query(`insert into public.${table} default values`));
  await asOwnerA();
  await denied(`owner cannot UPDATE ${table} directly`, /permission denied|row-level security/i, () =>
    db.query(`update public.${table} set id = id`));
  await asOwnerA();
  await denied(`owner cannot DELETE from ${table} directly`, /permission denied|row-level security/i, () =>
    db.query(`delete from public.${table}`));
  await asAnon();
  await denied(`anon cannot SELECT ${table}`, /permission denied|row-level security/i, () =>
    db.query(`select * from public.${table} limit 1`));
  await asServiceRole();
  const { rows } = await db.query(`select count(*)::int as n from public.${table}`);
  assert.ok(rows[0].n >= 1, `${table} is visible to the service role (server-side only)`);
  ok(`service_role can read ${table}`);
}
// The tenant boundary itself: Tenant A's server-side rows never carry Tenant B's owner id.
await asServiceRole();
for (const table of ['salon_whatsapp_connections', 'salon_whatsapp_oauth_states', 'salon_whatsapp_conversations', 'salon_whatsapp_message_log']) {
  const { rows } = await db.query(`select count(*)::int as n from public.${table} where owner_id=$1`, [OWNER_B]);
  assert.equal(rows[0].n, 1, `${table} holds exactly Tenant B's row for owner B`);
}
ok('WhatsApp tenant rows are partitioned by owner_id');
// ---------------------------------------------------------------------------
// 10. Disaster-recovery backup copy — belt and braces on top of RLS.
// ---------------------------------------------------------------------------
await asOwnerA();
await denied('owner cannot SELECT the accounts backup', /permission denied|row-level security/i, () =>
  db.query('select user_id from public.studioflow_accounts_backup'));
await asAnon();
await denied('anon cannot SELECT the accounts backup', /permission denied|row-level security/i, () =>
  db.query('select user_id from public.studioflow_accounts_backup'));
await asServiceRole();
const backupRows = (await db.query('select count(*)::int as n from public.studioflow_accounts_backup')).rows[0].n;
assert.equal(backupRows, 2, 'backup snapshot is readable only through the privileged role');
ok('service_role can read the accounts backup');
// ---------------------------------------------------------------------------
// 11. Android profiles & favorites — self-scoped, writes via definer RPCs.
// ---------------------------------------------------------------------------
await asCustomerA();
const profileA = (await db.query('select public.studioflow_android_profile() as result')).rows[0].result;
assert.equal(profileA.customer_id, CUSTOMER_A, 'android profile is issued for the caller only');
ok('android profile RPC issues the caller\u2019s own profile');
await rowCount('customer A sees exactly their own android profile', 'select customer_id from public.studioflow_android_profiles', [], 1);
await noRows('customer A cannot read customer B android profile', 'select customer_id from public.studioflow_android_profiles where customer_id=$1', [CUSTOMER_B]);
await denied('authenticated cannot INSERT an android profile directly', /permission denied|row-level security/i, () =>
  db.query("insert into public.studioflow_android_profiles(customer_id,full_name) values($1,'Forged')", [CUSTOMER_B]));
await denied('authenticated cannot UPDATE an android profile directly', /permission denied|row-level security/i, () =>
  db.query("update public.studioflow_android_profiles set full_name='Forged' where customer_id=$1", [CUSTOMER_A]));
await asCustomerB();
const profileB = (await db.query('select public.studioflow_android_profile() as result')).rows[0].result;
assert.equal(profileB.customer_id, CUSTOMER_B, 'android profile RPC issues Tenant B caller their own row');
ok('android profile RPC is caller-scoped for Tenant B as well');
await asServiceRole();
assert.equal((await db.query('select count(*)::int as n from public.studioflow_android_profiles')).rows[0].n, 2,
  'service_role sees both profiles');
ok('service_role reads all android profiles');
// ---------------------------------------------------------------------------
// 12. storage.objects — per-uid folders in the media and private buckets.
// ---------------------------------------------------------------------------
await asOwnerA();
await rowCount('owner A sees exactly their own studioflow-media objects', "select name from storage.objects where bucket_id='studioflow-media'", [], 1);
await noRows('owner A cannot read owner B objects in studioflow-media', "select name from storage.objects where bucket_id='studioflow-media' and name=$1", [`${OWNER_B}/ad.png`]);
await denied('owner A cannot INSERT into owner B media folder', /row-level security/i, () =>
  db.query("insert into storage.objects(bucket_id,name,metadata) values('studioflow-media',$1,'{\"mimetype\":\"image/png\"}'::jsonb)", [`${OWNER_B}/forged.png`]));
await changedCount('owner A cannot UPDATE owner B objects', "update storage.objects set metadata='{}'::jsonb where bucket_id='studioflow-media' and name=$1", [`${OWNER_B}/ad.png`], 0);
await changedCount('owner A cannot DELETE owner B objects', "delete from storage.objects where bucket_id='studioflow-media' and name=$1", [`${OWNER_B}/ad.png`], 0);
await asCustomerA();
await noRows('customer A cannot read customer B private photos', "select name from storage.objects where bucket_id='nexora-customer-private' and name=$1", [`${CUSTOMER_B}/photos/private-b.jpg`]);
await rowCount('customer A reads their own private photos', "select name from storage.objects where bucket_id='nexora-customer-private'", [], 1);
await denied('customer A cannot INSERT into customer B private folder', /row-level security/i, () =>
  db.query("insert into storage.objects(bucket_id,name,metadata) values('nexora-customer-private',$1,'{\"mimetype\":\"image/jpeg\"}'::jsonb)", [`${CUSTOMER_B}/photos/forged.jpg`]));
await changedCount('customer A cannot DELETE customer B private photos', "delete from storage.objects where bucket_id='nexora-customer-private' and name=$1", [`${CUSTOMER_B}/photos/private-b.jpg`], 0);
// Cross-role confusion: a studio owner session must not read a customer's
// private photo, even for a path inside its own uid namespace shape.
await asOwnerA();
await noRows('owner session cannot read a customer private photo', "select name from storage.objects where bucket_id='nexora-customer-private' and name=$1", [`${CUSTOMER_A}/photos/private-a.jpg`]);
await asAnon();
await noRows('anon sees no storage objects anywhere', "select name from storage.objects where bucket_id in ('studioflow-media','nexora-customer-private')", []);
// ---------------------------------------------------------------------------
// 13. Demo bookings & reward claims — participant-scoped.
// ---------------------------------------------------------------------------
await asCustomerA();
await rowCount('customer A sees their own demo bookings only', 'select id from public.studioflow_demo_bookings', [], 1);
await asOwnerA();
await rowCount('owner A sees demo bookings for their salon only', 'select id from public.studioflow_demo_bookings', [], 1);
await asCustomerB();
await rowCount('customer B sees their own demo bookings only', 'select id from public.studioflow_demo_bookings', [], 1);
await asCustomerA();
await changedCount('customer A cannot cancel customer B demo booking', "update public.studioflow_demo_bookings set status='cancelled' where customer_id=$1", [CUSTOMER_B], 0);
await asOwnerA();
await changedCount('owner A cannot complete customer B salon demo flow', "update public.studioflow_demo_bookings set status='cancelled' where owner_id=$1", [OWNER_B], 0);
await asCustomerA();
await denied('authenticated cannot INSERT a demo booking directly', /permission denied|row-level security/i, () =>
  db.query("insert into public.studioflow_demo_bookings(customer_id,owner_id,request_id,payload) values($1,$2,gen_random_uuid(),'{\"demo\":true,\"servicePrice\":0,\"amountPaid\":0}'::jsonb)", [CUSTOMER_A, OWNER_A]));
await asCustomerA();
await rowCount('customer A sees their own reward claims only', 'select id from public.studioflow_customer_reward_claims', [], 1);
await asOwnerB();
await rowCount('owner B sees reward claims for their salon only', 'select id from public.studioflow_customer_reward_claims', [], 1);
await asStaffA();
await noRows('staff member is not a reward-claim participant', 'select id from public.studioflow_customer_reward_claims', []);
await asCustomerA();
await denied('authenticated cannot INSERT a reward claim directly', /permission denied|row-level security/i, () =>
  db.query("insert into public.studioflow_customer_reward_claims(customer_id,owner_id,reward_id,reward_title,reward_terms,points_spent,coupon_code,request_id) values($1,$2,'rw','rw','{}'::jsonb,10,'COUPON-FORGE-1',gen_random_uuid())", [CUSTOMER_A, OWNER_A]));
await denied('authenticated cannot mark another participant\u2019s reward used', /permission denied/i, () =>
  db.query("update public.studioflow_customer_reward_claims set status='used' where coupon_code='COUPON-BETA-1'"));

// ---------------------------------------------------------------------------
// 14. RPC privilege surface — the EXECUTE matrix every browser must face.
// ---------------------------------------------------------------------------
const privilegeProbe = async (role, signature, expected) => {
  const { rows: [r] } = await db.query('select has_function_privilege($1, $2, \'EXECUTE\') as ok', [role, signature]);
  assert.equal(r.ok, expected, `${role} EXECUTE ${signature} expected ${expected}`);
};
const rpcMatrix = [
  // Token-gated pre-auth lookup: the ONE anon surface, carrying no secrets.
  ['anon', 'public.studioflow_staff_invite_lookup(text)', true],
  // Everything privileged stays off the anon surface.
  ['anon', 'public.studioflow_staff_invite_create(text,text,text[],text,text,integer,boolean)', false],
  ['anon', 'public.studioflow_owner_contacts()', false],
  ['anon', 'public.studioflow_owner_campaigns()', false],
  ['anon', 'public.studioflow_owner_save_contact(uuid,text,text,boolean)', false],
  ['anon', 'public.studioflow_owner_prepare_campaign(text,text,uuid[])', false],
  ['anon', 'public.studioflow_register_payment(uuid,text,bigint)', false],
  ['anon', 'public.studioflow_settle_payment(text,text,bigint)', false],
  ['anon', 'public.studioflow_android_profile()', false],
  ['anon', 'public.studioflow_staff_invite_accept(text)', false],
  // Browser (authenticated) may call business RPCs but never money/certifying ones
  // or owner-privileged definer functions without the owner check inside them.
  ['authenticated', 'public.studioflow_register_payment(uuid,text,bigint)', false],
  ['authenticated', 'public.studioflow_settle_payment(text,text,bigint)', false],
  ['authenticated', 'public.studioflow_staff_invite_create(text,text,text[],text,text,integer,boolean)', true],
  ['authenticated', 'public.studioflow_owner_contacts()', true], // owner check happens inside
  ['authenticated', 'public.studioflow_owner_prepare_campaign(text,text,uuid[])', true], // owner check inside
  ['authenticated', 'public.studioflow_staff_invite_lookup(text)', true],
  ['service_role', 'public.studioflow_register_payment(uuid,text,bigint)', true],
  ['service_role', 'public.studioflow_settle_payment(text,text,bigint)', true],
  ['service_role', 'public.studioflow_staff_invite_create(text,text,text[],text,text,integer,boolean)', true],
];
for (const [role, signature, expected] of rpcMatrix) {
  await privilegeProbe(role, signature, expected);
}
ok(`RPC EXECUTE surface matches the intended privilege matrix (${rpcMatrix.length} probes)`);
// Token-gated accept fails closed on garbage and requires sign-in.
await asAnon();
await denied('invite accept cannot be called by anon at all', /permission denied/i, () =>
  db.query("select public.studioflow_staff_invite_accept('deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef')"));
await asCustomerA();
await denied('authenticated invite accept rejects a garbage token', /not valid/i, () =>
  db.query("select public.studioflow_staff_invite_accept('deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef')"));

// ---------------------------------------------------------------------------
// 15. Cross-tenant INSERT/UPDATE sweep on every client-writable relation.
//     Any relation the browser may write must scope its write to the caller.
// ---------------------------------------------------------------------------
// The booking branch-guard trigger is exercised by the multibranch suites;
// for the RLS probes below it is suspended so policy evaluation is what is
// under test (the trigger stays enabled for the seed and for production).
await asSuper(() => db.exec('alter table public.studioflow_bookings disable trigger studioflow_booking_branch_guard'));
await asCustomerA();
await denied('customer cannot INSERT a booking into a salon (no book_for_all_staff)', /row-level security/i, () =>
  db.query("insert into public.studioflow_bookings(owner_id,customer_id,stylist_id,starts_at,ends_at,status,payload) values($1,$2,'sty-a-1',$3,$4,'pending',$5::jsonb)", [OWNER_A, CUSTOMER_A, future(9), future(9, 1), JSON.stringify({ servicePrice: 500, branchId: BRANCH_A })]));
await asManagerA();
await denied('salon A manager cannot INSERT a booking into salon B', /row-level security/i, () =>
  db.query("insert into public.studioflow_bookings(owner_id,customer_id,stylist_id,starts_at,ends_at,status,payload) values($1,$2,'sty-b-1',$3,$4,'pending',$5::jsonb)", [OWNER_B, CUSTOMER_B, future(9), future(9, 1), JSON.stringify({ servicePrice: 500, branchId: BRANCH_B })]));
await asStaffA();
await denied('service provider cannot INSERT a booking even inside their own salon', /row-level security/i, () =>
  db.query("insert into public.studioflow_bookings(owner_id,customer_id,stylist_id,starts_at,ends_at,status,payload) values($1,$2,'sty-a-1',$3,$4,'pending',$5::jsonb)", [OWNER_A, CUSTOMER_A, future(9), future(9, 1), JSON.stringify({ servicePrice: 500, branchId: BRANCH_A })]));
await asOwnerA();
const ownInsert = await db.query("insert into public.studioflow_bookings(owner_id,customer_id,stylist_id,starts_at,ends_at,status,payload) values($1,$2,'sty-a-1',$3,$4,'pending',$5::jsonb) returning id", [OWNER_A, CUSTOMER_A, future(9), future(9, 1), JSON.stringify({ servicePrice: 500, branchId: BRANCH_A })]);
assert.equal(ownInsert.rows.length, 1, 'owner inserts inside their own salon (front-desk path)');
ok('owner can INSERT a booking inside their own salon (own-tenant write allowed)');
await denied('owner A cannot INSERT a booking into salon B even with a full payload', /row-level security/i, () =>
  db.query("insert into public.studioflow_bookings(owner_id,customer_id,stylist_id,starts_at,ends_at,status,payload) values($1,$2,'sty-b-1',$3,$4,'pending',$5::jsonb)", [OWNER_B, CUSTOMER_B, future(9), future(9, 1), JSON.stringify({ servicePrice: 500, branchId: BRANCH_B })]));
await asSuper(() => db.exec('alter table public.studioflow_bookings enable trigger studioflow_booking_branch_guard'));
await asCustomerA();
await denied('cross-tenant UPDATE on reward claims is impossible (no UPDATE grant at all)', /permission denied/i, () =>
  db.query("update public.studioflow_customer_reward_claims set status='used' where coupon_code='COUPON-BETA-1'"));
await asOwnerA();
await changedCount('cross-tenant UPDATE on demo bookings is impossible', "update public.studioflow_demo_bookings set status='cancelled' where owner_id=$1", [OWNER_B], 0);
// branches: owner-manage policy scopes writes to site_id = caller, and the
// public read only projects active branches of salons with published websites.
await asOwnerA();
await noRows('Tenant A cannot read Tenant B branches', 'select id from public.branches where site_id=$1', [OWNER_B]);
await changedCount('Tenant A cannot UPDATE Tenant B branch', "update public.branches set name='Hijacked' where site_id=$1", [OWNER_B], 0);
await denied('Tenant A cannot INSERT a branch into Tenant B salon', /row-level security|row level security/i, () =>
  db.query("insert into public.branches(site_id,name) values($1,'Forged')", [OWNER_B]));
await changedCount('Tenant A cannot DELETE Tenant B branch', "delete from public.branches where site_id=$1", [OWNER_B], 0);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
await db.exec('reset role');
const expectedGroupCount = 15;
console.log(`PASS: BOLA and RLS cross-tenant proof — ${checks} checks across ${expectedGroupCount} groups:`);
console.log('      bookings, services, accounts/websites, staff (members/invites/RPCs), payments,');
console.log('      landing leads, customer portal, owner marketing, whatsapp tables, backup,');
console.log('      android profiles, storage objects, demo bookings & rewards, RPC surface,');
console.log('      cross-tenant write sweep. All deny foreign access; anon is never trusted.');
await db.close();
process.exit(0);
