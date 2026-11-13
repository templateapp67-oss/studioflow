import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const migration = read('supabase/migrations/202611130001_top_salon_jaipur_competition.sql');
const page = read('src/components/nexora-landing/NexoraTopSalonJaipurPage.tsx');
const router = read('src/AppRouter.tsx');
const ecosystem = read('src/components/nexora-landing/NexoraEcosystemPage.tsx');
const homepage = read('src/components/PublicHomepage.tsx');
const seo = read('src/lib/nexoraEcosystemSeo.ts');
const vercel = JSON.parse(read('vercel.json'));
const payments = read('supabase/functions/studioflow-payments/index.ts');

const tables = [
  'top_salon_competition_cycles',
  'top_salon_competition_salon_numbers',
  'top_salon_competition_entries',
  'top_salon_competition_reports',
  'top_salon_competition_awards',
  'top_salon_competition_audit_logs',
];
for (const table of tables) {
  assert.match(migration, new RegExp('create table if not exists public\\.' + table));
  assert.match(migration, new RegExp('alter table public\\.' + table + ' enable row level security'));
  assert.match(migration, new RegExp('revoke all on public\\.' + table + ' from anon, authenticated'));
}

assert.match(migration, /check \(end_date = start_date \+ 89\)/, 'Every competition must last exactly 90 inclusive calendar days.');
assert.match(migration, /timezone text not null default 'Asia\/Kolkata'/);
assert.match(migration, /registration_open_date date not null/);
assert.match(migration, /registration_close_date date not null/);
assert.match(migration, /organization_members om/);
assert.match(migration, /om\.role='owner'/);
assert.match(migration, /om\.status='active'/);
assert.match(migration, /NEXORA-JPR-/);
assert.match(migration, /status='captured'/);
assert.match(migration, /o\.verified_at >= v_start/);
assert.match(migration, /o\.verified_at < v_end/);
assert.match(migration, /b\.status='completed'/);
assert.match(migration, /r\.booking_id is not null/);
assert.match(migration, /d\.status in \('open','lost'\)/);
assert.match(migration, /'verifiedReviews'/);
assert.match(migration, /'gatewayRevenuePaise'/);
assert.match(migration, /'competitionId'/);
assert.match(migration, /Only approved competitors can view competitor report cards/);
assert.match(migration, /NEXORA admin access required/);
assert.match(migration, /grant execute on function public\.top_salon_competition_cycles\(\) to anon,authenticated/);
assert.match(migration, /grant execute on function public\.top_salon_competition_competitors\(uuid\) to authenticated/);
assert.match(migration, /grant execute on function public\.top_salon_competition_public_directory\(uuid\) to anon,authenticated/);

assert.match(page, /top_salon_competition_register/);
assert.match(page, /top_salon_competition_competitors/);
assert.match(page, /top_salon_competition_public_directory/);
assert.match(page, /performanceConsent/);
assert.match(page, /rulesAccepted/);
assert.match(page, /publicDirectory/);
assert.match(page, /NEXORA Top Salon Jaipur Awards/);
assert.match(page, /90-Day Competition/);
assert.match(page, /currentCycle\.registrationOpen/);
assert.match(page, /NEXORA Competition ID/);
assert.doesNotMatch(page, /opacity-70\/>/, 'The fallback salon image JSX must remain syntactically closed.');

assert.match(payments, /payment\.dispute\.created/);
assert.match(payments, /payment\.dispute\.won/);
assert.match(payments, /payment\.dispute\.lost/);
assert.match(payments, /studioflow_payment_disputes/);

assert.match(router, /top-salon-jaipur-awards/);
assert.match(ecosystem, /NexoraTopSalonJaipurPage/);
assert.match(homepage, /top-salon-jaipur-awards/);
assert.match(homepage, /NEXORA OFFICIAL JAIPUR COMPETITION/);
assert.match(seo, /top-salon-jaipur-awards/);
assert.match(vercel.rewrites.map((r) => r.source).join('\n'), /\/top-salon-jaipur-awards/);
assert.ok(existsSync('public/nexora-top-salon/competition-hero.svg'));

for (const asset of [
  'competition-hero.svg',
  'co-branded-tshirts.svg',
  'led-sign-board.svg',
  'promotional-advertising.svg',
  'achievement-trophy.svg',
  'jaipur-gold-award.svg',
  'jaipur-silver-award.svg',
  'jaipur-bronze-award.svg',
]) {
  const svg = read('public/nexora-top-salon/' + asset);
  assert.match(svg, /NEXORA/, asset + ' must use NEXORA branding.');
}

console.log('PASS: Top Salon Jaipur route, fixed-cycle schema, RLS/RPC permissions, gateway capture dates, completed-booking reviews, dispute exclusions, homepage CTA and NEXORA artwork are wired.');
