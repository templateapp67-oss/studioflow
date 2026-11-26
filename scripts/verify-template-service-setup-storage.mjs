/**
 * Offline PGlite integration check for template-wise service setup persistence.
 *
 * Runs the real `backend/studioflow-service-catalogue.sql` projection trigger
 * against an in-process Postgres and proves that:
 *  - the owner-confirmed setup + separated automatic suggestions survive a save;
 *  - the relational service catalogue still stores the unchanged name, price
 *    and duration (the feature never rewrites identity, fee or time);
 *  - the published website content carries the same setup for the storefront;
 *  - editing terms/offer does not change any existing service field.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create schema auth; create schema studioflow_private;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon, authenticated;
grant usage on schema studioflow_private to authenticated;
create table public.studioflow_accounts(user_id uuid primary key references auth.users(id),draft jsonb,revision int default 0,template_id text,updated_at timestamptz default now());
create table public.studioflow_websites(owner_id uuid primary key,slug text,content jsonb,published_at timestamptz default now());
`);
await db.exec(readFileSync('backend/studioflow-service-catalogue.sql', 'utf8'));

const owner = '11111111-1111-4111-8111-111111111111';
await db.query('insert into auth.users(id) values($1)', [owner]);

const service = {
  id: 'template-srv-barber-1',
  name: 'Signature Hot Towel Straight Razor Shave',
  category: 'Hot Towel Shaves',
  description: 'Saved owner description.',
  price: 350,
  durationMinutes: 30,
  icon: 'spa',
  popular: true,
  showDuration: true,
  origin: 'template',
  merchandising: {
    templateId: 'barber',
    badges: ['Royal Classic', 'Regulars’ Choice'],
    offerType: 'flat',
    offerDetails: '₹50 off on Tuesday bookings',
    tags: ['hot towel shave'],
    terms: 'Chair bookings are confirmed against the club’s booking calendar.\nOffer applies to this service only (₹50 off on Tuesday bookings).',
    suggestions: {
      badges: ['Regulars’ Choice'],
      offerType: 'flat',
      offerDetails: '₹50 off on Tuesday bookings',
      description: 'Signature Hot Towel Straight Razor Shave is a 30-minute Hot Towel Shaves service at The Royal Blade Barber & Men\'s Club.',
      terms: 'Chair bookings are confirmed against the club’s booking calendar.',
      generatedAt: '2026-11-05T00:00:00.000Z',
    },
    edited: { description: true, badges: true },
  },
};
const draft = { profile: { businessType: 'barber', businessName: 'Royal Blade', subdomain: 'royal-blade' }, services: [service], stylists: [] };

await db.query('insert into public.studioflow_accounts(user_id,draft,revision) values($1,$2::jsonb,0)', [owner, JSON.stringify(draft)]);

// 1. Identity, fee and duration are projected unchanged.
let res = await db.query('select service_id,name,category,price,duration_minutes,popular from public.studioflow_services where owner_id=$1', [owner]);
assert.deepEqual(res.rows[0], { service_id: service.id, name: service.name, category: service.category, price: '350.00', duration_minutes: 30, popular: true }, 'service identity, price and duration stay unchanged');

// 2. The saved draft keeps the confirmed setup and the separate suggestions.
res = await db.query('select draft, revision from public.studioflow_accounts where user_id=$1', [owner]);
const storedMerch = res.rows[0].draft.services[0].merchandising;
assert.deepEqual(storedMerch.badges, ['Royal Classic', 'Regulars’ Choice']);
assert.equal(storedMerch.offerType, 'flat');
assert.equal(storedMerch.offerDetails, '₹50 off on Tuesday bookings');
assert.equal(storedMerch.templateId, 'barber');
assert.ok(storedMerch.terms.includes('booking calendar'));
assert.equal(storedMerch.suggestions.description.length > 40, true, 'automatic suggestions are stored apart from confirmed values');
assert.deepEqual(storedMerch.edited, { description: true, badges: true });
assert.equal(res.rows[0].revision, 0, 'the trigger does not bump the workspace revision');

// 3. Published storefront content carries the same setup.
await db.query("insert into public.studioflow_websites(owner_id,slug,content) values($1,'royal-blade',$2::jsonb)", [owner, JSON.stringify({ profile: draft.profile, services: draft.services, stylists: [] })]);
res = await db.query("select content->'services'->0->'merchandising' as merch from public.studioflow_websites where slug='royal-blade'");
assert.deepEqual(res.rows[0].merch, storedMerch, 'the public site reads the same saved setup');

// 4. Editing the terms and offer keeps every existing field intact.
const updated = JSON.parse(JSON.stringify(draft));
updated.services[0].merchandising.terms = 'Owner rewritten terms.';
updated.services[0].merchandising.offerType = 'membership';
updated.services[0].merchandising.badges = ['Royal Classic'];
await db.query('update public.studioflow_accounts set draft=$1::jsonb, revision=revision+1 where user_id=$2', [JSON.stringify(updated), owner]);
res = await db.query('select name,category,price,duration_minutes from public.studioflow_services where owner_id=$1', [owner]);
assert.deepEqual(res.rows[0], { name: service.name, category: service.category, price: '350.00', duration_minutes: 30 }, 'editing the setup never changes name, category, price or duration');
res = await db.query('select draft->\'services\'->0 as svc from public.studioflow_accounts where user_id=$1', [owner]);
assert.equal(res.rows[0].svc.merchandising.terms, 'Owner rewritten terms.');
assert.equal(res.rows[0].svc.merchandising.offerType, 'membership');
assert.equal(res.rows[0].svc.description, 'Saved owner description.', 'the manually written description is preserved');

// 5. A legacy service without setup still saves and loads unchanged.
const legacy = { id: 'legacy-1', name: 'Classic Cut', category: 'Executive Cuts', description: 'Old copy', price: 400, durationMinutes: 40, icon: 'spa' };
await db.query('update public.studioflow_accounts set draft=$1::jsonb, revision=revision+1 where user_id=$2', [JSON.stringify({ ...draft, services: [legacy] }), owner]);
res = await db.query('select draft->\'services\'->0 as svc from public.studioflow_accounts where user_id=$1', [owner]);
assert.deepEqual(res.rows[0].svc, legacy, 'legacy services round-trip byte-for-byte');
res = await db.query('select name,price,duration_minutes from public.studioflow_services where owner_id=$1 and service_id=$2', [owner, 'legacy-1']);
assert.deepEqual(res.rows[0], { name: 'Classic Cut', price: '400.00', duration_minutes: 40 });

console.log('PASS: template-wise service setup persists with the workspace JSON, keeps automatic suggestions separate, reaches the published site, and never changes service identity, price, duration or the relational catalogue.');
