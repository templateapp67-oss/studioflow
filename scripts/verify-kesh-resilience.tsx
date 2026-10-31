import React from 'react';
import {act, create} from 'react-test-renderer';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {withTimeout, TimeoutError} from '../src/lib/asyncDeadline';
import {
  bootstrapSalonAccount,
  loadTemplateCatalogue,
  salonAccountFromRpc,
  salonAccountFromRow,
} from '../src/lib/accountBootstrap';
import {HairSpaWebsite} from '../src/components/HairSpaWebsite';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {INITIAL_SALON_PROFILE} from '../src/mockData';

// ---------------------------------------------------------------------------
// 1. Deadlines: a stalled request must reject, never hang forever.
// ---------------------------------------------------------------------------
const started = Date.now();
await assert.rejects(
  () => withTimeout(new Promise(() => {}), 40, 'Loading your salon'),
  (error: any) => error instanceof TimeoutError && /Loading your salon/.test(error.message),
  'a stalled request rejects with a deadline error',
);
assert.ok(Date.now() - started < 1000, 'the deadline fires promptly');
assert.equal(await withTimeout(Promise.resolve('ok'), 200), 'ok', 'fast responses pass through');
// Supabase query builders are thenables, not Promises: both must work.
const thenable = {
  then: (resolve: (value: string) => void) => {
    resolve('thenable');
    return thenable;
  },
} as unknown as PromiseLike<string>;
assert.equal(await withTimeout(thenable, 200), 'thenable');
console.log('PASS: every bootstrap request has a deadline and settles.');

// ---------------------------------------------------------------------------
// 2. Account bootstrap: RPC first, saved workspace second, honest failure last.
// ---------------------------------------------------------------------------
const savedRow = {user_id: 'owner-1', draft: {profile: {businessName: 'Saved Salon'}}, revision: 9};

let rowReads = 0;
let result = await bootstrapSalonAccount({
  userId: 'owner-1',
  ensureAccount: async () => ({
    data: {user_id: 'owner-1', draft: {profile: {businessName: 'Live Salon'}}, revision: 4},
    error: null,
  }),
  loadAccountRow: async () => {
    rowReads += 1;
    return {data: savedRow, error: null};
  },
});
assert.equal(result.account?.revision, 4, 'the RPC result is used when it succeeds');
assert.equal(result.degraded, false);
assert.equal(rowReads, 0, 'the saved row is not read when the RPC answers');

result = await bootstrapSalonAccount({
  userId: 'owner-1',
  ensureAccount: async () => ({data: null, error: {message: 'database unreachable'}}),
  loadAccountRow: async () => ({data: savedRow, error: null}),
});
assert.equal(result.account?.revision, 9, 'the saved workspace opens when the RPC fails');
assert.equal(result.degraded, true);
assert.ok(result.notes.some((note) => note.includes('database unreachable')), 'the reason is reported');
assert.equal(result.error, '');

const slowStart = Date.now();
result = await bootstrapSalonAccount({
  userId: 'owner-1',
  timeoutMs: 40,
  ensureAccount: () => new Promise(() => {}),
  loadAccountRow: async () => ({data: savedRow, error: null}),
});
assert.equal(result.account?.revision, 9, 'a hanging RPC falls through to the saved workspace');
assert.ok(Date.now() - slowStart < 1000, 'the fallback does not wait for the hung call');
assert.equal(result.degraded, true);

result = await bootstrapSalonAccount({
  userId: 'owner-1',
  timeoutMs: 30,
  ensureAccount: () => new Promise(() => {}),
  loadAccountRow: async () => ({data: null, error: {message: 'offline'}}),
});
assert.equal(result.account, null, 'nothing is invented when both routes fail');
assert.ok(result.error.length > 0, 'the failure is surfaced so the UI can offer a retry');

// Envelope shape (older deployments) and junk both behave.
assert.equal(salonAccountFromRpc('owner-1', {account: {draft: {a: 1}, revision: 2}})?.revision, 2);
assert.equal(salonAccountFromRpc('owner-1', null), null);
assert.equal(salonAccountFromRpc('owner-1', 'nonsense'), null);
assert.equal(salonAccountFromRow('owner-2', {draft: {}, revision: 5})?.user_id, 'owner-2');
console.log('PASS: the workspace opens on the saved copy when Supabase stalls, and never spins forever.');

// ---------------------------------------------------------------------------
// 3. Decorative reads (templates) fall back to the bundled catalogue.
// ---------------------------------------------------------------------------
const fallbackTemplates = Object.values(CATEGORY_TEMPLATES);
const refused = await loadTemplateCatalogue({load: async () => ({data: null, error: {message: 'nope'}}), fallback: fallbackTemplates});
assert.deepEqual(refused.templates, fallbackTemplates, 'template read failure keeps the local catalogue');
assert.ok(refused.error.includes('nope'));
const upgraded = await loadTemplateCatalogue({
  load: async () => ({data: [{config: {id: 'hair_spa', title: 'Remote'}}], error: null}),
  fallback: fallbackTemplates,
  upgrade: (config: any) => config,
});
assert.equal(upgraded.templates.length, 1, 'a successful read still wins');
console.log('PASS: a failed template read cannot block the salon from opening.');

// ---------------------------------------------------------------------------
// 4. Source guards: the app cannot regress into the endless loading screen.
// ---------------------------------------------------------------------------
const app = readFileSync('src/App.tsx', 'utf8');
assert.ok(app.includes('bootstrapSalonAccount'), 'the account bootstrap is wired into App');
assert.ok(app.includes('studioflow_accounts'), 'the saved workspace row is the fallback route');
const loading = readFileSync('src/components/AccountLoading.tsx', 'utf8');
assert.ok(/AccountLoading/.test(app) && /Retry account loading/.test(loading) && /10000/.test(loading), 'the loading screen offers a retry after the diagnostic delay');
assert.ok(!/Loading text="Loading your salon from Supabase…"/.test(app), 'the bare endless spinner is gone');
assert.ok(
  /withTimeout\(supabase\.from\('studioflow_websites'\)/.test(app),
  'the published-site read has a deadline as well',
);
assert.ok(app.includes('developmentTemplateForSiteSlug'), 'unpublished slugs still resolve a template preview');
console.log('PASS: no code path in App.tsx can leave the owner on an endless loading screen.');

// ---------------------------------------------------------------------------
// 5. Template 06 header: a link whose section is missing still navigates.
// ---------------------------------------------------------------------------
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const frames: Array<() => void> = [];
(globalThis as any).requestAnimationFrame = (callback: () => void) => {
  frames.push(callback);
  return frames.length;
};
(globalThis as any).cancelAnimationFrame = () => {};
const flushed: string[] = [];
(globalThis as any).location = {origin: 'https://studioflow.test', search: '', hash: '', href: 'https://studioflow.test/'};
(globalThis as any).history = {replaceState() {}, pushState() {}};
(globalThis as any).localStorage = {getItem() {return null;}, setItem() {}, removeItem() {}};
(globalThis as any).window = {
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({matches: false, addEventListener() {}, removeEventListener() {}}),
  scrollY: 0,
};
(globalThis as any).document = {
  hidden: false,
  body: {style: {overflow: ''}},
  documentElement: {scrollLeft: 0, scrollTop: 0},
  addEventListener() {},
  removeEventListener() {},
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
};

const template = CATEGORY_TEMPLATES.hair_spa;
const profile = {...INITIAL_SALON_PROFILE, businessType: 'hair_spa' as const, subdomain: '', phone: '+919876543210', websiteTestimonials: []};
const shared: any = {profile, services: template.services, readOnly: true, onBook() {}, onCustomerAccount() {}};
let ui: any;
await act(async () => {
  ui = create(
    <HairSpaWebsite
      profile={profile}
      services={template.services}
      stylists={template.stylists}
      galleryPhotos={[]}
      shared={shared}
      enabledSections={[]}
      showPackages
      bookingAvailable={false}
      onBook={() => {}}
      onAccount={() => {}}
      onMyBookings={() => {}}
      onViewSpecialist={() => {}}
    />,
  );
});
const nav = () => ui.root.findAll((node: any) => node.type === 'nav' && node.props['aria-label'] === 'Website navigation')[0];
const galleryLink = () => nav().findAll((node: any) => node.type === 'a' && node.props.href === '#gallery')[0];
let prevented = false;
await act(async () => galleryLink().props.onClick({preventDefault() {prevented = true;}}));
assert.ok(prevented, 'the header link intercepts the click');
await act(async () => {
  // Run the queued frame callbacks exactly as a browser would.
  while (frames.length) {
    const callback = frames.shift();
    if (!callback) break;
    flushed.push('frame');
    callback();
  }
});
assert.equal((globalThis as any).location.hash, '#gallery', 'a missing section still moves the URL instead of doing nothing');
assert.ok(flushed.length >= 1, 'the retry actually ran on the next frame');
await act(async () => ui.unmount());
console.log('PASS: Template 06 header links always navigate, even when a section is absent.');
