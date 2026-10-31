import React from 'react';
import { act, create } from 'react-test-renderer';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { mock } from 'node:test';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const locationMock: any = { href: 'https://salon.example/', origin: 'https://salon.example', hash: '', search: '' };
(globalThis as any).location = locationMock;
(globalThis as any).window = { location: locationMock, scrollTo() {}, addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
(globalThis as any).document = { title: '', head: { appendChild() {}, querySelector: () => null }, body: { style: {} }, querySelector: () => null, createElement: () => ({ setAttribute() {}, textContent: '' }), addEventListener() {}, removeEventListener() {} };

const { CATEGORY_TEMPLATES } = await import('../src/categoryTemplates');
const { INITIAL_SALON_PROFILE } = await import('../src/mockData');
const { CustomerSalonWebsite } = await import('../src/components/CustomerSalonWebsite');
const { IronInkWebsite } = await import('../src/components/IronInkWebsite');
const { normalizeServices, clinicPublicServices, clinicPriceIsVerified } = await import('../src/lib/dermacureContent');
const { normalizeWorkspace } = await import('../src/lib/normalizeWorkspace');
const { AccountLoading } = await import('../src/components/AccountLoading');
const { supabase } = await import('../src/lib/supabase');

// ---------------------------------------------------------------- 1. services normalisation
const published = { id: 'a', name: 'Peel', category: 'Skin', price: 100, durationMinutes: 30, clinicServiceApproved: true, clinicPublicationStatus: 'published', clinicFeeStatus: 'verified', clinicPriceVerified: true };
const draft = { id: 'b', name: 'Laser', category: 'Skin', price: 200, durationMinutes: 30, clinicServiceApproved: false, clinicPublicationStatus: 'draft' };
const list = [published, draft];
assert.equal(normalizeServices(list), list, 'a valid array is returned untouched (same reference, nothing copied or dropped)');
assert.deepEqual(normalizeServices([]), []);
for (const bad of [null, undefined, {}, 42, 'oops', { data: null }, { services: 'x' }]) assert.deepEqual(normalizeServices(bad), [], `invalid value ${JSON.stringify(bad)} becomes []`);
assert.deepEqual(normalizeServices({ data: list }), list, 'a {data:[...]} response is unwrapped');
assert.deepEqual(normalizeServices({ services: list }), list, 'a {services:[...]} response is unwrapped');
assert.deepEqual(normalizeServices({ data: { services: list } }), list, 'nested wrappers are unwrapped');
assert.deepEqual(normalizeServices(JSON.stringify(list)), list, 'a JSON string is parsed');
console.log('PASS: services normalisation handles arrays, empty, null, undefined, wrapped responses and JSON.');

// clinicPublicServices(profile, services) - the call shape every caller uses
const livePublic = clinicPublicServices({ subdomain: 'derma' } as any, list);
assert.deepEqual(livePublic.map(s => s.id), ['a'], 'published site shows only published clinic services');
assert.deepEqual(clinicPublicServices({ subdomain: '' } as any, list).map(s => s.id), ['a', 'b'], 'template preview keeps the whole menu');
assert.deepEqual(clinicPublicServices({ subdomain: 'derma' } as any, { data: list }).map(s => s.id), ['a'], 'wrapped API response works');
for (const bad of [null, undefined, {}, 'x']) assert.deepEqual(clinicPublicServices({} as any, bad), []);
assert.deepEqual(clinicPublicServices(undefined, list).length, 2, 'a missing profile does not throw');
assert.deepEqual(clinicPublicServices({ subdomain: 'derma' } as any, list).filter(clinicPriceIsVerified).map(s => s.id), ['a']);
console.log('PASS: clinicPublicServices(profile, services) filters correctly and never throws "filter is not a function".');

// normalizeWorkspace keeps services that were stored in a wrapped shape instead of dropping them
const kept = normalizeWorkspace({ profile: { businessName: 'x' }, services: { data: [published] } } as any, {} as any);
assert.equal(kept.services.length, 1, 'wrapped saved services are preserved, not silently emptied');
assert.equal(normalizeWorkspace({ profile: {}, services: null } as any, {} as any).services.length, 0);
console.log('PASS: saved workspace services survive an unexpected storage shape.');

// ---------------------------------------------------------------- 2. website pages render with missing / odd data
const tattoo = CATEGORY_TEMPLATES.tattoo_studio, salon = CATEGORY_TEMPLATES.hair_salon;
const profileFor = (t: any, extra: any = {}) => ({ ...INITIAL_SALON_PROFILE, businessType: t.id, businessName: t.title, subdomain: '', ...extra });
const render = (el: React.ReactElement) => renderToStaticMarkup(el);
const shapes: [string, any][] = [['valid array', tattoo.services], ['empty array', []], ['null', null], ['undefined', undefined], ['object', {}], ['wrapped {data}', { data: tattoo.services }]];
for (const [label, services] of shapes) {
  assert.ok(render(<CustomerSalonWebsite profile={profileFor(salon) as any} services={services} stylists={salon.stylists} onAddAppointment={async (a: any) => a} />).length > 200, `hair salon site renders with services = ${label}`);
  assert.ok(render(<CustomerSalonWebsite profile={profileFor(tattoo) as any} services={services} stylists={tattoo.stylists} onAddAppointment={async (a: any) => a} />).length > 200, `tattoo site renders with services = ${label}`);
}
const missingProfile = render(<CustomerSalonWebsite profile={undefined as any} services={null as any} stylists={null as any} />);
assert.match(missingProfile, /Loading website/, 'a missing profile shows a loading message instead of a white screen');
console.log('PASS: salon websites render for every services shape and for a missing profile.');

// IronInkWebsite with null / undefined / wrong-typed profile + category fields
const ironProfile = profileFor(tattoo, { ironInk: { categories: [{ slug: 'odd', name: undefined, price: 1 }, { slug: 'num', name: 7 }] } });
const iron = (props: any) => render(<IronInkWebsite bookingAvailable={false} galleryPhotos={[]} stylists={tattoo.stylists} services={tattoo.services} onBook={() => {}} {...props} />);
assert.ok(iron({ profile: ironProfile }).length > 500, 'Iron & Ink renders with undefined / numeric category names');
assert.ok(iron({ profile: ironProfile, services: [{ id: 'x', name: 'N', category: undefined, price: 1, durationMinutes: 10 }, { id: 'y', name: 'N', category: 5, price: 1, durationMinutes: 10 }] }).length > 500, 'Iron & Ink renders with services whose category is missing or a number');
assert.ok(iron({ profile: ironProfile, services: null, stylists: null, galleryPhotos: null }).length > 500, 'Iron & Ink renders with null services, artists and gallery');
assert.ok(iron({ profile: undefined, services: undefined }).length > 500, 'Iron & Ink renders with no profile at all');
assert.ok(iron({ profile: { ...ironProfile, businessName: undefined, city: undefined } }).length > 500, 'Iron & Ink renders with missing business name and city');
console.log('PASS: Iron & Ink website never calls toLowerCase on undefined/number values.');

// ---------------------------------------------------------------- 3. AccountLoading 10 second diagnostic
mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : (node?.children || []).map(text).join(' ');
let retries = 0, signOuts = 0;
const clientAny: any = supabase;
const originalFrom = clientAny.from, originalSession = clientAny.auth.getSession;
clientAny.auth.getSession = async () => ({ data: { session: { user: { id: 'u1' } } }, error: null });
clientAny.from = () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.reject(new TypeError('Failed to fetch')) }) }) });
let tree: any;
await act(async () => { tree = create(<AccountLoading userId="u1" profileState="loading" onRetry={() => { retries++; }} onSignOut={() => { signOuts++; }} />); });
await act(async () => { mock.timers.tick(5000); });
assert.ok(!/Connection diagnostic/.test(text(tree.toJSON())), 'no diagnostic before 10 seconds');
await act(async () => { mock.timers.tick(5000); });
for (let i = 0; i < 5; i++) await act(async () => { await Promise.resolve(); });
let out = text(tree.toJSON());
assert.match(out, /Connection diagnostic/, 'diagnostic appears after 10 seconds');
assert.match(out, /Profile state:\s*loading/, 'current profile state is shown');
assert.match(out, /Supabase connection problem/, 'a failed Supabase request is reported as a connection problem');
assert.equal(signOuts, 0, 'the user is never signed out automatically');
assert.equal(retries, 0, 'no automatic retry loop');
const retryButton = () => tree.root.findAll((n: any) => n.type === 'button' && /Retry now|Checking/.test(text(n.children)))[0];
await act(async () => { retryButton().props.onClick(); });
for (let i = 0; i < 5; i++) await act(async () => { await Promise.resolve(); });
assert.equal(retries, 1, 'Retry calls the retry handler once');
await act(async () => { retryButton().props.onClick(); retryButton().props.onClick(); });
assert.equal(retries, 1, 'repeated clicks inside the cool-down do not fire more requests');
assert.match(text(tree.toJSON()), /Retry did not succeed/, 'a failed retry shows an error message');
await act(async () => { mock.timers.tick(6000); });
await act(async () => { retryButton().props.onClick(); });
assert.equal(retries, 2, 'Retry works again after the cool-down');
// missing profile row / auth problems
clientAny.from = () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) });
const { diagnoseAccountLoad } = await import('../src/components/AccountLoading');
assert.match((await diagnoseAccountLoad('u1')).summary, /Missing profile data/);
clientAny.auth.getSession = async () => ({ data: { session: null }, error: null });
assert.match((await diagnoseAccountLoad('u1')).summary, /Authentication problem/);
clientAny.from = originalFrom; clientAny.auth.getSession = originalSession;
await act(async () => { tree.unmount(); });
assert.equal(mock.timers ? true : true, true);
mock.timers.reset();
console.log('PASS: AccountLoading explains slow loads after 10s, retries safely, and never signs the user out.');
console.log('ALL RENDER-RESILIENCE CHECKS PASSED');
