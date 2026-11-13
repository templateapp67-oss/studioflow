import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const read = (path) => {
  assert.ok(existsSync(path), 'Missing required file: ' + path);
  return readFileSync(path, 'utf8');
};

const migration = read('backend/nexora-jaipur-competition.sql');
const page = read('src/components/nexora-landing/NexoraPartnerRewardsPage.tsx');
const css = read('src/components/nexora-landing/nexoraPartnerRewards.css');
const router = read('src/AppRouter.tsx');
const homepage = read('src/components/PublicHomepage.tsx');
const seo = read('src/lib/nexoraEcosystemSeo.ts');
const prerender = read('scripts/prerender-public.tsx');
const vercel = JSON.parse(read('vercel.json'));
const routes = read('scripts/verify-nexora-ecosystem-routes.mjs');

const assetPaths = [
  'public/nexora-jaipur-awards/led-sign-board.svg',
  'public/nexora-jaipur-awards/co-branded-tshirts.svg',
  'public/nexora-jaipur-awards/promotional-advertising.svg',
  'public/nexora-jaipur-awards/achievement-trophy.svg',
  'public/nexora-jaipur-awards/top-salon-jaipur-awards.svg',
  'public/nexora-jaipur-awards/gold-growth-champion.svg',
  'public/nexora-jaipur-awards/silver-partner-spotlight.svg',
  'public/nexora-jaipur-awards/bronze-certificate.svg',
  'public/nexora-jaipur-awards/top-gold-growth-champion-featured-advertising.svg',
  'public/nexora-jaipur-awards/top-silver-recognition-partner-spotlight.svg',
  'public/nexora-jaipur-awards/top-bronze-recognition-trophy-digital-certificate.svg',
];
for (const path of assetPaths) {
  const svg = read(path);
  assert.match(svg, /NEXORA/, path + ' must use the NEXORA brand');
}

assert.match(migration, /end_date\s*=\s*start_date\s*\+\s*89/, 'The inclusive competition window must be exactly 90 days');
assert.match(migration, /Asia\/Kolkata/, 'Competition dates must use India Standard Time');
assert.ok(migration.includes("daterange(c.start_date,c.end_date + 1,'[)')"), 'Overlapping Jaipur competition cycles must be rejected');
assert.match(migration, /NEXORA-JPR-/);
assert.match(migration, /salon_number bigint not null unique/);
assert.match(migration, /unique \(cycle_id, owner_id\)/);
assert.match(migration, /unique \(cycle_id, salon_number\)/);
assert.match(migration, /final_report_card jsonb/, 'Final report cards must be snapshotted');
assert.match(migration, /status='completed'.*final_report_card/s);
assert.match(migration, /where baseline_eligible/, 'Top 3 winners must meet the minimum T-shirt-tier eligibility');
assert.match(migration, /create or replace function public\.nexora_competition_member_leaderboard/);
assert.equal((migration.match(/create or replace function public\.nexora_competition_member_leaderboard/g) || []).length, 1);
assert.match(migration, /Only approved competition members can view competitor report cards/);
assert.match(migration, /e\.status = 'approved' and e\.award_applied = true/);
assert.match(migration, /report_sharing_consent boolean not null default false/);
assert.match(migration, /check \(report_sharing_consent = true\)/);
assert.match(migration, /public_profile_visible boolean not null default false/);
assert.match(migration, /and e\.public_profile_visible = true/, 'Only opted-in salons should enter the public salon directory');
assert.match(migration, /'competitionId', competition_id/);
assert.match(migration, /'currentRank', current_rank/);
assert.match(migration, /'score', competition_score/);
assert.match(migration, /o\.status = 'captured'/);
assert.match(migration, /o\.currency = 'INR'/);
assert.match(migration, /o\.payment_id is not null/);
assert.match(migration, /o\.verified_at is not null/);
assert.match(migration, /b\.status = 'completed'/);
assert.match(migration, /count\(distinct b\.customer_id\)/);
assert.match(migration, /studioflow_payment_orders_deny_clients|revoke all on public\.nexora_competition_entries from public, anon, authenticated/i);
assert.match(migration, /revoke all on public\.nexora_competition_entries from public, anon, authenticated/);
assert.match(migration, /grant execute on function public\.nexora_competition_member_leaderboard\(text\) to authenticated/);
assert.match(migration, /grant execute on function public\.nexora_competition_public_directory\(text\) to anon, authenticated/);
assert.match(migration, /grant execute on function public\.nexora_competition_admin_save_cycle/);
assert.match(migration, /if not nexora_competition_private\.is_admin\(\) then raise exception 'NEXORA admin access required'/);
assert.match(migration, /'ownerEmail',e\.owner_email/);
assert.match(migration, /'businessAddress',e\.business_address/);
assert.match(migration, /create table if not exists public\.nexora_competition_reward_fulfilments/);
assert.match(migration, /nexora_competition_physical_reward_once_idx/);
assert.match(migration, /on public\.nexora_competition_reward_fulfilments\(owner_id,reward_key\)/);
assert.ok(!migration.includes('as $\\n') && !migration.includes('\\n$;'), 'Every SQL function must use balanced dollar quotes');
assert.match(migration, /where f\.cycle_id=v_cycle\.id or f\.reward_key in \('coBrandedTshirts','ledSignBoard','achievementTrophy'\)/);

assert.match(migration, /nexora_competition_member_reward_fulfilments/);
assert.match(migration, /nexora_competition_admin_list_reward_fulfilments/);
assert.match(migration, /nexora_competition_admin_update_reward_fulfilment/);
assert.match(migration, /final_report_card/);


for (const target of [
  'Co-branded T-shirts', 'LED Sign Boards', 'Promotional Advertising', 'Achievement Trophies',
  'NEXORA Top Salon Jaipur Awards', 'Featured Advertising by NEXORA', 'Partner Spotlight',
  '90-Day Competition', 'Submit official competition application', 'Meet Jaipur',
  'nexora_competition_register', 'nexora_competition_member_leaderboard',
  'nexora_competition_public_directory', 'nexora_competition_admin_save_cycle',
  'nexora_competition_admin_review_entry', 'nexora_competition_admin_finalize_cycle',
  'My 90-Day Reward Progress', 'Competition ID', 'Complete salon address',
  'Reward fulfilment and delivery', 'Refresh eligible rewards', 'nexora_competition_member_reward_fulfilments',
]) {
  assert.ok(page.includes(target) || page.includes(target.replace('90-Day Competition','90-Day Competition')), 'Page missing: ' + target);
}
for (const [target,amount] of [[50,'₹50,000'],[150,'₹2,00,000'],[300,'₹5,00,000'],[500,'₹8,00,000']]) {
  assert.ok(page.includes("target:" + target), 'Reward transaction target missing: ' + target);
  assert.ok(page.includes("amount:'" + amount + "'"), 'Reward collection target missing: ' + amount);
}
assert.match(page, /publicProfileVisible/);
assert.match(page, /reportSharingConsent|report card/i);
assert.match(page, /profileVisibility/);
assert.match(page, /registrationOpensAt/);
assert.match(page, /registrationClosesAt/);
assert.match(page, /Competition starts in/);
assert.match(page, /Competition completed/);
assert.match(page, /All dates use India Standard Time/);
assert.match(page, /gateway collections/);
assert.match(page, /not full salon turnover/);
assert.match(page, /status==='approved'/);
assert.match(page, /approved competitors/);
assert.match(page, /Owner: /);
assert.match(page, /businessAddress/);
assert.match(page, /npa-progress-tier/);
assert.match(css, /\.npa-my-progress/);
assert.match(css, /\.npa-progress-track/);
assert.match(router, /\/partner-rewards/);
assert.match(homepage, /NEXORA TOP SALON JAIPUR AWARDS/);
assert.match(homepage, /href="\/partner-rewards"/);
assert.match(homepage, /top-salon-jaipur-awards\.svg/);
assert.match(seo, /\/partner-rewards/);
assert.match(prerender, /NexoraPartnerRewardsPage/);
assert.ok(vercel.rewrites.some((entry) => entry.source === '/partner-rewards' && entry.destination === '/partner-rewards/index.html'));
assert.ok(routes.includes("'/partner-rewards'"), 'The existing marketing route suite must cover /partner-rewards');

const db = new PGlite();
try {
  await db.exec([
    'create role anon;',
    'create role authenticated;',
    'create role service_role;',
    'create schema auth;',
    'create table auth.users(id uuid primary key);',
    "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
    'create table public.app_admins(user_id uuid primary key);',
    'create table public.profiles(id uuid, user_id uuid, full_name text, email text, phone_number text, phone text, mobile text, logo_url text, cover_image_url text);',
    'create table public.studioflow_websites(owner_id uuid, slug text, published_at timestamptz);',
    'create table public.studioflow_bookings(id uuid primary key, owner_id uuid, customer_id uuid, starts_at timestamptz, ends_at timestamptz, status text);',
    'create table public.studioflow_payment_orders(booking_id uuid, order_id text, payment_id text, amount_paise bigint, currency text, status text, created_at timestamptz, verified_at timestamptz);',
    'create table public.studioflow_reviews(id uuid, owner_id uuid, customer_id uuid, rating integer, created_at timestamptz);',
  ].join('\n'));

  await db.exec(migration);

  const adminId = '10000000-0000-4000-8000-000000000001';
  const nonMemberId = '10000000-0000-4000-8000-000000000002';
  const customerId = '20000000-0000-4000-8000-000000000001';
  const bookingId = '30000000-0000-4000-8000-000000000001';

  await db.query('insert into auth.users(id) values ($1),($2)', [adminId, nonMemberId]);
  await db.query('insert into public.app_admins(user_id) values ($1)', [adminId]);
  await db.query(
    'insert into public.profiles(id,user_id,full_name,email,phone_number,logo_url,cover_image_url) values ($1,$1,$2,$3,$4,$5,$6)',
    [adminId,'Salon Owner','owner@example.test','9000000000','/logo.png','/cover.png'],
  );
  await db.query('insert into public.studioflow_websites(owner_id,slug,published_at) values ($1,$2,now())', [adminId,'sample-jaipur-salon']);

  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [adminId]);

  const istDate = (new Date(Date.now() + 330 * 60 * 1000)).toISOString().slice(0,10);
  const addDays = (value, days) => {
    const date = new Date(value + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0,10);
  };
  const startDate = addDays(istDate, 2);
  const endDate = addDays(startDate, 89);
  const parts = startDate.split('-').map(Number);
  const cycleCode = String(parts[0]) + 'Q' + Math.ceil(parts[1] / 3);
  const registrationOpensAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const registrationClosesAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const savedCycle = await db.query(
    'select public.nexora_competition_admin_save_cycle($1,$2,$3,$4,$5,$6,$7) as cycle',
    [cycleCode,'NEXORA Test Jaipur Awards',registrationOpensAt,registrationClosesAt,startDate,endDate,'registration_open'],
  );
  const cycle = savedCycle.rows[0].cycle;
  assert.equal(cycle.durationDays, 90);
  assert.equal(cycle.startDate, startDate);
  assert.equal(cycle.endDate, endDate);
  assert.equal(cycle.registrationOpen, true);

  const hiddenVisibility = {showCategory:false,showArea:false,showDescription:false,showLogo:true,showCover:true,showWebsite:true};
  const registration = await db.query(
    'select public.nexora_competition_register($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) as result',
    [cycleCode,'NEXORA Test Salon','Jaipur','Vaishali Nagar','Shop 12, Test Market, Jaipur','Unisex Salon','PGlite integration test',JSON.stringify(hiddenVisibility),false,true,true,true],
  );
  const registrationResult = registration.rows[0].result;
  assert.match(registrationResult.competitionId, /^NEXORA-JPR-\d{4,}-\d{4}Q[1-4]$/);
  assert.equal(registrationResult.status, 'pending');

  await db.query(
    'insert into public.studioflow_bookings(id,owner_id,customer_id,starts_at,ends_at,status) values ($1,$2,$3,$4,$5,$6)',
    [bookingId,adminId,customerId,startDate+'T12:00:00+05:30',startDate+'T13:00:00+05:30','completed'],
  );
  await db.query(
    'insert into public.studioflow_payment_orders(booking_id,order_id,payment_id,amount_paise,currency,status,created_at,verified_at) values ($1,$2,$3,$4,$5,$6,$7,$8)',
    [bookingId,'order-test-1','payment-test-1',5000000,'INR','captured',startDate+'T12:00:00+05:30',startDate+'T12:00:00+05:30'],
  );
  await db.query(
    'insert into public.studioflow_reviews(id,owner_id,customer_id,rating,created_at) values ($1,$2,$3,$4,$5)',
    ['40000000-0000-4000-8000-000000000001',adminId,customerId,5,startDate+'T14:00:00+05:30'],
  );
  for (let index = 2; index <= 50; index += 1) {
    const serial = String(index).padStart(12,'0');
    const booking = '30000000-0000-4000-8000-' + serial;
    const customerSerial = String(index <= 30 ? index : ((index - 31) % 30) + 1).padStart(12,'0');
    const customer = '20000000-0000-4000-8000-' + customerSerial;
    const timestamp = startDate + 'T12:00:00+05:30';
    await db.query(
      'insert into public.studioflow_bookings(id,owner_id,customer_id,starts_at,ends_at,status) values ($1,$2,$3,$4,$5,$6)',
      [booking,adminId,customer,timestamp,startDate+'T13:00:00+05:30','completed'],
    );
    await db.query(
      'insert into public.studioflow_payment_orders(booking_id,order_id,payment_id,amount_paise,currency,status,created_at,verified_at) values ($1,$2,$3,$4,$5,$6,$7,$8)',
      [booking,'order-test-'+index,'payment-test-'+index,10000,'INR','captured',timestamp,timestamp],
    );
    if (index <= 10) {
      await db.query(
        'insert into public.studioflow_reviews(id,owner_id,customer_id,rating,created_at) values ($1,$2,$3,$4,$5)',
        ['40000000-0000-4000-8000-'+serial,adminId,customer,5,startDate+'T14:00:00+05:30'],
      );
    }
  }

  await db.query('select public.nexora_competition_admin_review_entry($1,$2,$3)', [registrationResult.entryId,'approved','PGlite verified']);
  const memberReport = await db.query('select public.nexora_competition_member_leaderboard($1) as report', [cycleCode]);
  const report = memberReport.rows[0].report;
  assert.equal(report.isMember, true);
  assert.equal(report.competitors.length, 1);
  assert.equal(report.competitors[0].salonName, 'NEXORA Test Salon');
  assert.equal(report.competitors[0].competitionId, registrationResult.competitionId);
  assert.equal(report.competitors[0].successfulTransactions, 50);
  assert.equal(report.competitors[0].gatewayCollectionsPaise, 5490000);
  assert.equal(report.competitors[0].uniquePayingCustomers, 30);
  assert.equal(report.competitors[0].verifiedReviews, 10);
  assert.equal(report.competitors[0].averageRating, 5);
  assert.equal(report.competitors[0].area, null);
  assert.equal(report.competitors[0].category, null);

  assert.equal(report.competitors[0].rewardEligibility.coBrandedTshirts, true);
  const memberRewards = await db.query('select public.nexora_competition_member_reward_fulfilments($1) as rewards', [cycleCode]);
  assert.equal(memberRewards.rows[0].rewards.length, 1);
  assert.equal(memberRewards.rows[0].rewards[0].rewardKey, 'coBrandedTshirts');
  assert.equal(memberRewards.rows[0].rewards[0].status, 'eligible');
  const updatedFulfilment = await db.query(
    'select public.nexora_competition_admin_update_reward_fulfilment($1,$2,$3,$4,$5,$6,$7) as result',
    [registrationResult.entryId,'coBrandedTshirts','approved','verified by admin','T-shirts are being prepared','FULFILMENT-TEST-1',addDays(startDate,12)],
  );
  assert.equal(updatedFulfilment.rows[0].result.status, 'approved');
  const memberRewardsAfterApproval = await db.query('select public.nexora_competition_member_reward_fulfilments($1) as rewards', [cycleCode]);
  assert.equal(memberRewardsAfterApproval.rows[0].rewards[0].status, 'approved');
  assert.equal(memberRewardsAfterApproval.rows[0].rewards[0].partnerNote, 'T-shirts are being prepared');
  const adminRewardList = await db.query('select public.nexora_competition_admin_list_reward_fulfilments($1) as rewards', [cycleCode]);
  assert.equal(adminRewardList.rows[0].rewards.length, 1);

  const publicBeforeOptIn = await db.query('select public.nexora_competition_public_directory($1) as directory', [cycleCode]);
  assert.equal(publicBeforeOptIn.rows[0].directory.length, 0);
  await db.query(
    'select public.nexora_competition_update_visibility($1,$2,$3)',
    [cycleCode,true,JSON.stringify(hiddenVisibility)],
  );
  const publicAfterOptIn = await db.query('select public.nexora_competition_public_directory($1) as directory', [cycleCode]);
  assert.equal(publicAfterOptIn.rows[0].directory.length, 1);
  assert.equal(publicAfterOptIn.rows[0].directory[0].competitionId, registrationResult.competitionId);
  assert.equal(publicAfterOptIn.rows[0].directory[0].area, undefined);

  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [nonMemberId]);
  await assert.rejects(
    db.query('select public.nexora_competition_member_leaderboard($1)', [cycleCode]),
    /Only approved competition members can view competitor report cards/,
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [adminId]);
  const adminApplications = await db.query('select public.nexora_competition_admin_list_entries($1) as result', [cycleCode]);
  assert.equal(adminApplications.rows[0].result.applications[0].businessAddress, 'Shop 12, Test Market, Jaipur');
  assert.equal(adminApplications.rows[0].result.applications[0].ownerEmail, 'owner@example.test');
} finally {
  await db.close();
}

console.log('PASS: NEXORA Jaipur competition migration executes in PGlite; fixed 90-day schedules, registration IDs, member-only report cards, verified payment/review totals, owner-controlled salon directory visibility, reward eligibility and admin fulfilment tracking are exercised.');
