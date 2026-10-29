import React, { useState } from 'react';
import { act, create } from 'react-test-renderer';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

import { ALL_CATEGORY_OPTIONS, CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import { INITIAL_SALON_PROFILE } from '../src/mockData';
import { CustomerSalonWebsite } from '../src/components/CustomerSalonWebsite';
import { VogueNoirEditor } from '../src/components/vogue-noir/VogueNoirEditor';
import { AcademyEnquiriesPanel } from '../src/components/vogue-noir/AcademyEnquiriesPanel';
import { BookingModal } from '../src/components/BookingModal';
import { requestedTemplate } from '../src/lib/templateEntry';
import { resolveSiteSlug } from '../src/lib/resolveSite';
import { normalizeWorkspace } from '../src/lib/normalizeWorkspace';
import { workspaceSnapshot } from '../src/lib/workspaceSync';
import { supabase } from '../src/lib/supabase';
import {
  VOGUE_NOIR_BRAND_NAME,
  VOGUE_NOIR_DEFAULT_COLORS,
  upcomingAcademyBatchDates,
  parseAcademySchedules,
  resolveVogueNoirConfig,
} from '../src/lib/vogueNoir';
import type { SalonProfile } from '../src/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).window = {
  scrollY: 0,
  location: { href: 'https://voguenoir.example', origin: 'https://voguenoir.example' },
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};
(globalThis as any).document = {
  title: '',
  head: { appendChild() {}, querySelector: () => null },
  body: { style: {} },
  getElementById: () => ({ scrollIntoView() {} }),
  addEventListener() {},
  removeEventListener() {},
};

const nodeText = (node: any): string =>
  typeof node === 'string'
    ? node
    : Array.isArray(node)
      ? node.map(nodeText).join(' ')
      : (node?.children || []).map(nodeText).join(' ');

// 1. Verify local asset pack & manifest integrity + zero external stock URLs
const manifestPath = 'public/templates/vogue-noir/vogue-noir-assets.json';
const readmePath = 'public/templates/vogue-noir/README.md';
assert.ok(existsSync(manifestPath), 'vogue-noir-assets.json manifest must exist');
assert.ok(existsSync(readmePath), 'public/templates/vogue-noir/README.md must exist');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
assert.ok(Array.isArray(manifest.assets) && manifest.assets.length >= 45, 'Manifest lists all local assets');
for (const entry of manifest.assets) {
  const diskPath = join('public', entry.path.replace(/^\//, ''));
  assert.ok(existsSync(diskPath), `Missing local Vogue Noir asset: ${diskPath}`);
  assert.ok(statSync(diskPath).size > 0, `Empty Vogue Noir asset: ${diskPath}`);
}
for (const sourceFile of [
  'src/lib/vogueNoir.ts',
  'src/components/VogueNoirWebsite.tsx',
  'src/components/vogue-noir/AcademySection.tsx',
  'src/components/vogue-noir/PortfolioSection.tsx',
]) {
  const code = readFileSync(sourceFile, 'utf8');
  assert.ok(!code.includes('https://images.pexels.com'), `${sourceFile} must not hotlink Pexels`);
  assert.ok(!code.includes('https://images.unsplash.com/photo-'), `${sourceFile} must not hotlink Unsplash photos`);
}
console.log('PASS: all Vogue Noir local WebP/SVG/PNG/JPG assets exist on disk with README + manifest and zero hotlinked stock URLs.');

// 2. Verify Template 08 catalog entry, URL aliases & tenant slug routing
const template08 = CATEGORY_TEMPLATES.makeup_studio;
assert.equal(template08.shortName, 'Vogue Noir (08)');
assert.equal(template08.title, VOGUE_NOIR_BRAND_NAME);
assert.ok(ALL_CATEGORY_OPTIONS.some((o) => o.id === 'makeup_studio' && o.title === 'Vogue Noir (08)'));
for (const alias of ['?template=08', '?template=template-08', '?template=vogue-noir', '?template=makeup_studio', '?template=makeup']) {
  assert.equal(requestedTemplate(alias)?.id, 'makeup_studio', `Alias ${alias} must resolve to makeup_studio`);
}
assert.equal(resolveSiteSlug({ hostname: 'localhost', search: '?site=vogue-noir-studio' }), 'vogue-noir-studio');
assert.equal(resolveSiteSlug({ hostname: 'vogue-noir-studio.salon-platform.com', search: '' }), 'vogue-noir-studio');
console.log('PASS: Template 08 ("Vogue Noir (08)") catalog entry, URL aliases (?template=08/vogue-noir), and ?site= slug routing verified.');

// 3. Verify all 13 sections in exact order, CSS variables, prices, Academy, Portfolio, Artists, Reviews, FAQs & JSON-LD
const profile08: SalonProfile = {
  ...INITIAL_SALON_PROFILE,
  businessType: 'makeup_studio',
  businessName: VOGUE_NOIR_BRAND_NAME,
  subdomain: 'vogue-noir-studio',
  phone: '+91 90000 00000',
  whatsapp: '+91 90000 00000',
};
const html = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={profile08}
    services={template08.services}
    stylists={template08.stylists}
    readOnly
    onAddAppointment={async (a) => a}
  />,
);

const expectedSectionOrder = [
  'id="home"',
  'id="about"',
  'id="services"',
  'id="bridal-looks"',
  'id="bridal-packages"',
  'id="academy"',
  'id="portfolio"',
  'id="artists"',
  'id="reviews"',
  'id="faq"',
  'id="booking"',
  'id="contact"',
  'data-layout="footer"',
];
let prevIndex = -1;
for (const token of expectedSectionOrder) {
  const idx = html.indexOf(token);
  assert.ok(idx > prevIndex, `Section ${token} missing or out of STEP 2 order`);
  prevIndex = idx;
}

for (const colorHex of Object.values(VOGUE_NOIR_DEFAULT_COLORS)) {
  assert.ok(html.includes(colorHex), `Default theme color ${colorHex} must be applied via CSS custom properties`);
}
assert.ok(html.includes('Luxury Makeup, Made For Every Indian Bride'));
assert.ok(html.includes('Book Appointment') && html.includes('Join Academy'));
for (const stat of ['8+', '5,000+', '1,200+', '11']) assert.ok(html.includes(stat), `Missing stat ${stat}`);
for (const tier of ['Classic Dulhan', 'Signature Dulhan', 'Royal Dulhan', 'Most Popular', '₹35,000', '₹60,000', '₹1,25,000']) {
  assert.ok(html.includes(tier), `Missing Bridal Package tier content: ${tier}`);
}
for (const course of ['Beginner Makeup Artistry Course', 'Professional Makeup Artist Course', 'Bridal Makeup Masterclass', 'Self-Makeup Workshop', '₹25,000', '₹95,000', '₹55,000', '₹3,999']) {
  assert.ok(html.includes(course), `Missing Academy course content: ${course}`);
}
for (const artist of ['Riya Kapoor', 'Simran Sethi', 'Aarav Mehta', 'Neha Joshi']) {
  assert.ok(html.includes(artist), `Missing demo artist: ${artist}`);
}
for (const reviewer of ['Ananya S.', 'Pooja R.', 'Kriti M.', 'Sana K.']) {
  assert.ok(html.includes(reviewer), `Missing 5-star testimonial: ${reviewer}`);
}
assert.ok(html.includes('application/ld+json') && html.includes('BeautySalon') && html.includes('Course'), 'LocalBusiness + Course JSON-LD must be embedded');
assert.ok(html.includes('hello@voguenoir.example') && html.includes('wa.me/919000000000'));
console.log('PASS: storefront sections, regional inspiration, Indian prices, academy, portfolio, contact and JSON-LD render.');
assert.ok(html.includes('Punjabi') && html.includes('Kashmiri') && html.includes('Call Now'));
const changedPackages = template08.services.map(service => service.id === 'vn-pkg-royal' ? { ...service, price: 12345 } : service);
const changedHtml = renderToStaticMarkup(<CustomerSalonWebsite profile={profile08} services={changedPackages} stylists={template08.stylists} readOnly onAddAppointment={async (a) => a} />);
assert.ok(changedHtml.includes('₹12,345'), 'Package card reflects the actual linked booking service price');
assert.ok(!changedHtml.includes('₹1,25,000'), 'Package card must not advertise a different amount from the booking service');

// 4. Verify Academy auto batch dates, ON/OFF toggle, guest auth gate, authenticated RPC submit & BookingModal handoff
const batches = upcomingAcademyBatchDates(new Date('2026-10-29T10:00:00Z'), 4);
assert.deepEqual(batches, ['01/11/2026', '15/11/2026', '01/12/2026', '15/12/2026']);
assert.equal(upcomingAcademyBatchDates(new Date('2026-10-31T19:00:00Z'), 1)[0], '01/11/2026', 'Batch dates use the Indian calendar even across UTC midnight');
const schedules = parseAcademySchedules('Jaipur | 01/11/2026, 15/11/2026\nOnline | 01/12/2026');
assert.deepEqual(schedules.Jaipur, ['01/11/2026', '15/11/2026']);
assert.deepEqual(schedules.Online, ['01/12/2026']);
const savedTaxProfile = { ...profile08, vogueNoir: { gstin: '08ABCDE1234F1Z5', sacCode: '999723', gstPricing: 'inclusive' as const, academyScheduleText: 'Jaipur | 01/12/2026' } };
const resolvedSaved = resolveVogueNoirConfig(savedTaxProfile);
assert.equal(resolvedSaved.gstin, '08ABCDE1234F1Z5');
assert.equal(resolvedSaved.academyScheduleText, 'Jaipur | 01/12/2026');
const taxHtml = renderToStaticMarkup(<CustomerSalonWebsite profile={savedTaxProfile} services={template08.services} stylists={template08.stylists} readOnly onAddAppointment={async (a) => a} />);
assert.ok(taxHtml.includes('GSTIN:') && taxHtml.includes('08ABCDE1234F1Z5') && taxHtml.includes('Prices inclusive of GST'));
assert.ok(taxHtml.includes('Sample testimonial'));

const noAcademyHtml = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={{ ...profile08, vogueNoir: { academyEnabled: false } }}
    services={template08.services}
    stylists={template08.stylists}
    readOnly
    onAddAppointment={async (a) => a}
  />,
);
assert.ok(!noAcademyHtml.includes('id="academy"'), 'Academy section hides cleanly when toggled OFF');
assert.ok(!noAcademyHtml.includes('href="#academy"'), 'Header drops Academy link when Academy is OFF');
assert.ok(!noAcademyHtml.includes('Academy Work ('), 'Portfolio hides Academy Work filter when Academy is OFF');

const origRpc = supabase.rpc;
let capturedEnquiryArgs: any = null;
let authModes: string[] = [];
(supabase as any).rpc = async (fn: string, args: any) => {
  if (fn === 'studioflow_academy_enquire_with_city') {
    capturedEnquiryArgs = args;
    return { data: { id: 'enq-1', status: 'new' }, error: null };
  }
  return { data: [], error: null };
};

let renderer: any;
try {
  // Guest sees login gate on Academy form
  await act(async () => {
    renderer = create(
      <CustomerSalonWebsite
        profile={profile08}
        services={template08.services}
        stylists={template08.stylists}
        customerSignedIn={false}
        onCustomerAccount={(mode) => authModes.push(mode || 'signin')}
        onAddAppointment={async (a) => a}
      />,
    );
  });
  const signInBtn = renderer.root.findAll(
    (n: any) => n.type === 'button' && nodeText(n).includes('Sign In to Enquire'),
  )[0];
  assert.ok(signInBtn, 'Guest sees Sign In to Enquire CTA on Academy section');
  await act(async () => signInBtn.props.onClick());
  assert.equal(authModes[0], 'signin');
  assert.equal(capturedEnquiryArgs, null, 'Guest cannot invoke studioflow_academy_enquire RPC');

  // Signed-in customer submits Academy enquiry AND opens BookingModal
  await act(async () => {
    renderer.update(
      <CustomerSalonWebsite
        profile={{ ...profile08, vogueNoir: { academyScheduleText: 'Jaipur | 01/12/2026, 15/12/2026' } }}
        services={template08.services}
        stylists={template08.stylists}
        customerSignedIn
        customerName="Rhea Kapoor"
        onCustomerAccount={() => {}}
        onAddAppointment={async (a) => a}
      />,
    );
  });
  await act(async () => {
    renderer.root.findByProps({ id: 'vn-aca-city' }).props.onChange({ target: { value: 'Jaipur' } });
    renderer.root.findByProps({ id: 'vn-aca-phone' }).props.onChange({ target: { value: '9876543210' } });
    renderer.root.findByProps({ id: 'vn-aca-email' }).props.onChange({ target: { value: 'rhea@example.com' } });
    renderer.root.findByProps({ id: 'vn-aca-msg' }).props.onChange({ target: { value: 'Interested in weekend batch.' } });
  });
  const form = renderer.root.findAll((n: any) => n.type === 'form')[0];
  await act(async () => form.props.onSubmit({ preventDefault() {} }));
  assert.equal(capturedEnquiryArgs?.p_slug, 'vogue-noir-studio');
  assert.equal(capturedEnquiryArgs?.p_name, 'Rhea Kapoor');
  assert.equal(capturedEnquiryArgs?.p_phone, '9876543210');
  assert.equal(capturedEnquiryArgs?.p_city, 'Jaipur');
  assert.equal(capturedEnquiryArgs?.p_batch, '01/12/2026');
  assert.ok(nodeText(renderer.root).includes('Enquiry Received'), 'Confirmation message shown after RPC success');

  // Interactive lightbox & before/after slider + service booking handoff
  const slider = renderer.root.findAll((n: any) => n.type === 'input' && n.props.type === 'range')[0];
  await act(async () => slider.props.onChange({ target: { value: '72' } }));
  assert.equal(slider.props.value, 72);

  const bookBtn = renderer.root.findAll(
    (n: any) => n.type === 'button' && nodeText(n).trim() === 'Book Appointment',
  )[0];
  await act(async () => bookBtn.props.onClick());
  assert.equal(renderer.root.findByType(BookingModal).props.isOpen, true);
} finally {
  if (renderer) await act(async () => renderer.unmount());
  supabase.rpc = origRpc;
}
console.log('PASS: Academy ON/OFF toggle, guest login gate, authenticated studioflow_academy_enquire RPC submit, interactive before/after slider, and BookingModal handoff verified.');

// 5. Verify Onboarding/Admin VogueNoirEditor & AcademyEnquiriesPanel
let editedProfile = profile08;
function EditorHarness() {
  const [p, setP] = useState<SalonProfile>(profile08);
  editedProfile = p;
  return <VogueNoirEditor profile={p} setProfile={setP} showBrandIdentityFields />;
}
let editorRenderer: any;
await act(async () => {
  editorRenderer = create(<EditorHarness />);
});
const academyCheckbox = editorRenderer.root.findAll(
  (n: any) => n.type === 'input' && n.props.type === 'checkbox',
)[0];
await act(async () => academyCheckbox.props.onChange({ target: { checked: false } }));
assert.equal(editedProfile.vogueNoir?.academyEnabled, false);
const academyTab = editorRenderer.root.findAll((n: any) => n.type === 'button' && n.props.role === 'tab' && nodeText(n).includes('Academy ('))[0];
await act(async () => academyTab.props.onClick());
const scheduleInput = editorRenderer.root.findAll((n: any) => n.type === 'textarea' && n.props.placeholder?.includes('Delhi |'))[0];
await act(async () => scheduleInput.props.onChange({ target: { value: 'Jaipur | 01/12/2026, 15/12/2026\nOnline | 01/01/2027' } }));
const persisted = workspaceSnapshot({ profile: editedProfile });
assert.equal(normalizeWorkspace(persisted).profile.vogueNoir?.academyScheduleText, 'Jaipur | 01/12/2026, 15/12/2026\nOnline | 01/01/2027');
await act(async () => editorRenderer.unmount());

const origGetUser = supabase.auth.getUser;
const origFrom = supabase.from;
let updatedEnquiryStatus: any = null;
(supabase.auth as any).getUser = async () => ({ data: { user: { id: 'owner-1' } }, error: null });
(supabase as any).from = () => ({
  select: () => ({
    eq: () => ({
      order: () => ({
        limit: async () => ({
          data: [
            {
              id: 'enq-101',
              website_slug: 'vogue-noir-studio',
              owner_id: 'owner-1',
              customer_id: 'cust-1',
              name: 'Diya Sharma',
              phone: '9876500001',
              email: 'diya@example.com',
              course: 'Bridal Makeup Masterclass',
              city: 'Jaipur',
              batch: '15 Nov 2026',
              message: 'Please share syllabus PDF',
              status: 'new',
              created_at: '2026-10-29T08:00:00Z',
              updated_at: '2026-10-29T08:00:00Z',
            },
          ],
          error: null,
        }),
      }),
    }),
  }),
});
(supabase as any).rpc = async (fn: string, args: any) => {
  if (fn === 'studioflow_academy_enquiry_set_status') {
    updatedEnquiryStatus = args;
    return { data: { id: args.p_enquiry_id, status: args.p_status }, error: null };
  }
  return { data: null, error: null };
};
let panelRenderer: any;
try {
  await act(async () => {
    panelRenderer = create(<AcademyEnquiriesPanel />);
  });
  assert.ok(nodeText(panelRenderer.root).includes('Diya Sharma'));
  assert.ok(nodeText(panelRenderer.root).includes('Bridal Makeup Masterclass'));
  assert.ok(nodeText(panelRenderer.root).includes('Jaipur'));
  const statusSelect = panelRenderer.root.findByProps({ 'aria-label': 'Status for Diya Sharma' });
  await act(async () => statusSelect.props.onChange({ target: { value: 'enrolled' } }));
  assert.deepEqual(updatedEnquiryStatus, { p_enquiry_id: 'enq-101', p_status: 'enrolled' });
} finally {
  if (panelRenderer) await act(async () => panelRenderer.unmount());
  supabase.auth.getUser = origGetUser;
  supabase.from = origFrom;
  supabase.rpc = origRpc;
}
console.log('PASS: VogueNoirEditor and AcademyEnquiriesPanel owner status management (new -> contacted -> enrolled) verified.');

// 6. PGlite PostgreSQL RLS & tenant isolation test for backend/vogue-noir-template-08.sql
delete (globalThis as any).window;
delete (globalThis as any).document;
const db = new PGlite();
await db.exec(`
  create role anon;
  create role authenticated;
  create schema auth;
  create schema studioflow_private;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema studioflow_private, auth to authenticated;
  grant usage on schema auth to anon;
  create table public.studioflow_accounts(
    user_id uuid primary key,
    draft jsonb default '{}'::jsonb,
    template_id text,
    updated_at timestamptz default now()
  );
  create table public.studioflow_websites(
    owner_id uuid primary key references public.studioflow_accounts(user_id) on delete cascade,
    slug text unique not null,
    content jsonb default '{}'::jsonb,
    published_at timestamptz default now()
  );
  create table public.studioflow_templates(
    id text primary key,
    title text not null default '',
    sort_order int not null default 8,
    config jsonb not null default '{}'::jsonb,
    active boolean not null default true,
    updated_at timestamptz default now()
  );
  insert into public.studioflow_templates(id, title, sort_order, config)
  values ('makeup_studio', 'Makeup Studio', 8, '{"shortName":"Makeup Studio"}'::jsonb);
`);
const sqlMigration = readFileSync('backend/vogue-noir-template-08.sql', 'utf8');
await db.exec(sqlMigration);
await db.exec(sqlMigration); // idempotent rerun
const cityMigration = readFileSync('supabase/migrations/202610290001_vogue_noir_academy_city.sql', 'utf8');
await db.exec(cityMigration);
await db.exec(cityMigration);

const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
const customer1 = '33333333-3333-4333-8333-333333333333';
await db.query('insert into auth.users(id) values ($1), ($2), ($3)', [ownerA, ownerB, customer1]);
await db.query('insert into public.studioflow_accounts(user_id, template_id) values ($1, $2), ($3, $4)', [
  ownerA,
  'makeup_studio',
  ownerB,
  'hair_salon',
]);
await db.query(
  `insert into public.studioflow_websites(owner_id, slug, content) values
   ($1, 'vogue-noir-a', '{"profile":{"businessType":"makeup_studio","vogueNoir":{"academyEnabled":true}}}'::jsonb),
   ($2, 'salon-b', '{"profile":{"businessType":"hair_salon"}}'::jsonb)`,
  [ownerA, ownerB],
);
await db.exec('grant select on public.studioflow_templates to anon, authenticated;');

// Unauthenticated caller cannot submit Academy enquiry
await db.exec(`set local role anon; select set_config('request.jwt.claim.sub', '', false);`);
await assert.rejects(
  () =>
    db.query(
      `select public.studioflow_academy_enquire_with_city('vogue-noir-a', 'Guest', '9876543210', '', 'Bridal Makeup Masterclass', '1 Nov 2026', 'Hi', 'Delhi')`,
    ),
  /permission denied|Sign in/i,
);
await db.exec('reset role;');

// Authenticated customer submits enquiry
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${customer1}', false);`);
const inserted = await db.query<{ res: { id: string; status: string } }>(
  `select public.studioflow_academy_enquire_with_city('vogue-noir-a', 'Ananya Rao', '9876543210', 'ananya@example.com', 'Professional Makeup Artist Course', '15 Nov 2026', 'Looking for EMI details', 'Jaipur') as res`,
);
const enquiryId = inserted.rows[0].res.id;
assert.equal(inserted.rows[0].res.status, 'new');
const customerCity = await db.query<{city: string}>('select city from public.studioflow_academy_enquiries where id = $1::uuid', [enquiryId]);
assert.equal(customerCity.rows[0].city, 'Jaipur');
await assert.rejects(() => db.query(`select public.studioflow_academy_enquire_with_city('vogue-noir-a', 'Ananya Rao', '9876543210', '', 'Course', '01/11/2026', '', '')`), /valid preferred city/i);
await assert.rejects(() => db.query(`select public.studioflow_academy_enquire_with_city('salon-b', 'Ananya Rao', '9876543210', '', 'Course', '01/11/2026', '', 'Delhi')`), /not enabled/i);

// Tenant B cannot see or update Tenant A's enquiry
await db.exec(`select set_config('request.jwt.claim.sub', '${ownerB}', false);`);
const leakCheck = await db.query('select id from public.studioflow_academy_enquiries');
assert.equal(leakCheck.rows.length, 0, 'RLS must isolate academy enquiries across tenants');
await assert.rejects(
  () => db.query(`select public.studioflow_academy_enquiry_set_status($1::uuid, 'contacted')`, [enquiryId]),
  /not found|access denied/i,
);

// Tenant A reads and updates status to contacted -> enrolled
await db.exec(`select set_config('request.jwt.claim.sub', '${ownerA}', false);`);
const ownerRows = await db.query<{name: string; course: string; status: string; city: string}>('select name, course, status, city from public.studioflow_academy_enquiries');
assert.equal(ownerRows.rows.length, 1);
assert.equal(ownerRows.rows[0].city, 'Jaipur');
await db.query(`select public.studioflow_academy_enquiry_set_status($1::uuid, 'enrolled')`, [enquiryId]);
const updatedRow = await db.query<{ status: string }>('select status from public.studioflow_academy_enquiries where id = $1::uuid', [enquiryId]);
assert.equal(updatedRow.rows[0].status, 'enrolled');
// Existing clients continue to submit using the original RPC after this migration.
await db.exec(`select set_config('request.jwt.claim.sub', '${customer1}', false);`);
const legacy = await db.query<{res: {id: string}}>(`select public.studioflow_academy_enquire('vogue-noir-a', 'Ananya Rao', '9876543210', '', 'Course', '01/11/2026', '') as res`);
const legacyRow = await db.query<{city: string}>('select city from public.studioflow_academy_enquiries where id = $1::uuid', [legacy.rows[0].res.id]);
assert.equal(legacyRow.rows[0].city, '');
await db.exec('reset role;');

const tplSync = await db.query<{ title: string; short_name: string }>(
  `select title, config->>'shortName' as short_name from public.studioflow_templates where id = 'makeup_studio'`,
);
assert.equal(tplSync.rows[0].short_name, 'Vogue Noir (08)');
assert.equal(tplSync.rows[0].title, 'Vogue Noir Makeup Studio & Academy');
console.log('PASS: PGlite SQL migration, authenticated Academy enquiry insert, cross-tenant RLS isolation, status transitions, and studioflow_templates sync verified.');
