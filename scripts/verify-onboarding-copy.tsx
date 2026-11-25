import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { act, create } from 'react-test-renderer';
import { onboardingCopyHandler, parseCopyInput, validateCopy, copyPrompt, verifyWorkspaceOwner, createOnboardingInstanceLimiter } from '../server/onboardingCopy';
import { useOnboardingCopy, type CopyGenerator } from '../src/lib/useOnboardingCopy';
import { INITIAL_SALON_PROFILE } from '../src/mockData';
import { CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import type { SalonProfile } from '../src/types';
import { OnboardingWizard } from '../src/components/OnboardingWizard';
import { supabase } from '../src/lib/supabase';
import { applyTemplateDesign } from '../src/lib/templateSelection';
import { normalizeWorkspace } from '../src/lib/normalizeWorkspace';
import { patchOwnerCopy } from '../src/lib/copyProvenance';
import { hasOwnerCustomNailTagline, hasOwnerCustomNailAbout } from '../src/lib/pinkyNails';
import { hasOwnerCustomTagline, hasOwnerCustomAbout } from '../src/lib/roopMahalReference';
import { OwnerWorkspace } from '../src/components/OwnerWorkspace';
import { AboutStudioEditor } from '../src/components/AboutStudioEditor';
import { SaaSDashboard } from '../src/components/SaaSDashboard';
import { DEFAULT_LOYALTY_CONFIG } from '../src/loyaltyData';
import { DEFAULT_EXTRAS } from '../src/lib/workspaceDefaults';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let clock = 0;
const bounded = createOnboardingInstanceLimiter(1000, 2, 1, () => clock);
assert.equal(bounded.hit('owner-a').allowed, true);
assert.equal(bounded.hit('owner-b').allowed, false, 'capacity rejects new users without evicting a live budget');
assert.equal(bounded.hit('owner-a').allowed, true);
assert.equal(bounded.hit('owner-a').allowed, false);
clock = 1001;
assert.equal(bounded.hit('owner-b').allowed, true, 'expired windows make room');
const input = { kind: 'about', businessName: 'Test Studio', ownerName: 'Riya', theme: 'lash_brow', tagline: 'Your style, your way' };
assert.ok(copyPrompt(parseCopyInput(input)!).includes('lashes and brows'));
assert.equal(parseCopyInput({ ...input, theme: 'unknown' }), null);
assert.equal(parseCopyInput({ ...input, businessName: {} }), null);
assert.equal(parseCopyInput({ ...input, businessName: 'x'.repeat(121) }), null);
assert.ok(parseCopyInput({ kind: 'about' }), 'optional details are accepted');
assert.equal(parseCopyInput({ kind: 'tagline' }), null);
assert.equal(validateCopy('one two three four five six seven eight', 'tagline'), null);
assert.equal(validateCopy('Welcome to your style', 'tagline'), 'Welcome to your style');
assert.equal(validateCopy('Too short', 'about'), null);
const paragraph = 'Welcome to our studio, a place to explore your personal style and enjoy a thoughtful moment of care. We look forward to meeting you and helping you feel comfortable as you discover the possibilities that suit you.';
const about = `${paragraph}\n\n${paragraph}`;
assert.ok(validateCopy(about, 'about'));
assert.equal(validateCopy(about.replace('\n\n', ' '), 'about'), null);
let calls = 0;
const deps = { apiKey: 'key-secret', verify: async () => ({ id: 'test-user' }), authorize: async () => true, hit: () => ({ allowed: true, resetAfterSeconds: 10 }), generate: async (prompt: string) => { calls++; assert.ok(prompt.includes('lashes and brows')); return about; } };
async function request(body: unknown, overrides: any = {}, method = 'POST', headers: any = { authorization: 'Bearer valid' }) {
  let status = 200; let result: any; const responseHeaders: Record<string, string> = {};
  const res = { status(n: number) { status = n; return this; }, json(value: unknown) { result = value; }, setHeader(k: string, v: string) { responseHeaders[k] = v; } };
  await onboardingCopyHandler({ method, body, headers }, res, { ...deps, ...overrides });
  return { status, result, headers: responseHeaders };
}
assert.equal((await request(input, {}, 'GET')).status, 405);
assert.equal((await request(input, {}, 'POST', {})).status, 401);
assert.equal((await request(input, { verify: async () => null })).status, 401);
assert.equal((await request(input, { verify: async () => undefined })).status, 503);
assert.equal((await request({ ...input, theme: 'evil' })).status, 400);
assert.equal((await request(input, { apiKey: '' })).status, 503);
assert.equal((await request(input, { hit: () => ({ allowed: false, resetAfterSeconds: 30 }) })).status, 429);
assert.equal((await request(input, { authConfig: { url: '', publishableKey: '', configured: false } })).status, 503);
assert.equal((await request(input, { authorize: async () => false })).status, 403);
assert.equal((await request(input, { authorize: async () => undefined })).status, 503);
assert.equal((await request(input, { authorize: async () => { throw new Error('secret'); } })).status, 503);
assert.equal((await request(input, { limiter: { hit: async () => { throw new Error('secret'); } } })).status, 503);
assert.equal((await request(input, { limiter: { hit: async () => ({ allowed: true, resetAfterSeconds: NaN }) } })).status, 503);
assert.equal((await request({ ...input, ownerName: 'a\nb' })).status, 400);
assert.equal((await request(input, {}, 'POST', { authorization: 'Basic token' })).status, 401);
const authConfig = { url: 'https://example.test', publishableKey: 'public', configured: true };
const authUser = { id: 'owner-42' };
let observedAuthUrl = '';
const authFetch = async (url: any, init: any) => { observedAuthUrl = String(url); assert.equal(init.headers.Authorization, 'Bearer valid'); return new Response(JSON.stringify([{ user_id: 'owner-42' }]), { status: 200 }); };
assert.equal(await verifyWorkspaceOwner('valid', authUser, authConfig, authFetch as any), true);
assert.equal(new URL(observedAuthUrl).searchParams.get('user_id'), 'eq.owner-42');
assert.equal(await verifyWorkspaceOwner('valid', authUser, authConfig, async () => new Response('[]') as any), false);
assert.equal(await verifyWorkspaceOwner('valid', authUser, authConfig, async () => new Response('{}') as any), undefined);
assert.equal(await verifyWorkspaceOwner('valid', authUser, authConfig, async () => { throw new Error('secret'); }), undefined);
assert.equal(calls, 0, 'rejected requests do not call Gemini');
const success = await request(input); assert.equal(success.status, 200); assert.equal(success.result.text, about);
const bad = await request(input, { generate: async () => 'short' }); assert.equal(bad.status, 502);
const failure = await request(input, { generate: async () => { throw new Error('key-secret provider response'); } });
assert.equal(failure.status, 503); assert.ok(!JSON.stringify(failure).includes('key-secret'));

let state: SalonProfile, controls: ReturnType<typeof useOnboardingCopy>, setState: React.Dispatch<React.SetStateAction<SalonProfile>>;
const pending: { input: any; signal: AbortSignal; resolve: (value: string) => void; reject: (error: Error) => void }[] = [];
const generate: CopyGenerator = (payload, signal) => new Promise((resolve, reject) => pending.push({ input: payload, signal, resolve, reject }));
function Harness() {
  const [profile, setProfile] = useState({ ...INITIAL_SALON_PROFILE, businessName: 'First', businessType: 'hair_salon' as const, ownerName: '', tagline: CATEGORY_TEMPLATES.hair_salon.tagline, onboardingGeneratedTagline: CATEGORY_TEMPLATES.hair_salon.tagline, about: 'Original' });
  state = profile; setState = setProfile;
  controls = useOnboardingCopy(profile, setProfile, true, generate);
  return <div>{profile.tagline}{profile.about}{controls.taglineStatus}{controls.aboutStatus}</div>;
}
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let app: ReturnType<typeof create>;
await act(async () => { app = create(<Harness />); });
await act(async () => { await pause(750); });
assert.equal(pending.length, 1); assert.equal(controls!.taglineStatus, 'loading');
await act(async () => { setState!(p => ({ ...p, businessName: 'Second', businessType: 'nail_studio' })); });
assert.equal(pending[0].signal.aborted, true);
await act(async () => { await pause(750); });
assert.equal(pending.length, 2); assert.equal(pending[1].input.theme, 'nail_studio');
await act(async () => { pending[0].resolve('Old stale copy'); await Promise.resolve(); });
assert.notEqual(state!.tagline, 'Old stale copy');
await act(async () => { controls!.editTagline('My own tagline'); pending[1].resolve('New stale copy'); await Promise.resolve(); });
assert.equal(state!.tagline, 'My own tagline');
await act(async () => { setState!(p => ({ ...p, businessName: 'Third' })); await pause(750); });
assert.equal(pending.length, 2, 'manual tagline survives a name change');
await act(async () => { controls!.regenerateTagline(); });
await act(async () => { await pause(750); });
assert.equal(pending.length, 3);
await act(async () => { pending[2].reject(new Error('private secret')); await Promise.resolve(); });
assert.equal(controls!.taglineStatus, 'error'); assert.equal(state!.tagline, 'My own tagline');
await act(async () => { controls!.editTagline(''); });
await act(async () => { await pause(750); });
assert.equal(pending.length, 4);
await act(async () => { pending[3].resolve('Nails, styled your way'); await Promise.resolve(); });
assert.equal(state!.tagline, 'Nails, styled your way');
await act(async () => { void controls!.writeAbout(); });
assert.deepEqual(pending[4].input, { kind: 'about', businessName: 'Third', ownerName: '', theme: 'nail_studio', tagline: 'Nails, styled your way' });
assert.equal(controls!.aboutStatus, 'loading');
await act(async () => { controls!.editAbout('My edited story'); pending[4].resolve(about); await Promise.resolve(); });
assert.equal(state!.about, 'My edited story'); assert.equal(pending[4].signal.aborted, true);
await act(async () => { void controls!.writeAbout(); });
await act(async () => { pending[5].resolve(about); await Promise.resolve(); });
assert.equal(state!.about, about); assert.equal(controls!.aboutStatus, 'idle');
await act(async () => { void controls!.writeAbout(); });
await act(async () => { setState!(p => ({ ...p, ownerName: 'New owner' })); });
assert.equal(pending[6].signal.aborted, true);
await act(async () => { pending[6].resolve('stale'); await Promise.resolve(); }); assert.equal(state!.about, about);
await act(async () => { void controls!.writeAbout(); });
await act(async () => { pending[7].reject(new Error('sensitive')); await Promise.resolve(); });
assert.equal(controls!.aboutStatus, 'error'); assert.equal(state!.about, about);
await act(async () => { void controls!.writeAbout(); });
await act(async () => { app!.unmount(); }); assert.ok(pending[8].signal.aborted);
// External workspace sync can change the text without using hook handlers.
let synced: SalonProfile, updateSynced: React.Dispatch<React.SetStateAction<SalonProfile>>;
let syncControls: ReturnType<typeof useOnboardingCopy>;
const syncRequests: typeof pending = [];
const syncGenerate: CopyGenerator = (payload, signal) => new Promise((resolve, reject) => syncRequests.push({ input: payload, signal, resolve, reject }));
function SyncHarness() {
  const [p, setP] = useState({ ...INITIAL_SALON_PROFILE, businessName: 'Sync Salon', tagline: '', onboardingGeneratedTagline: undefined, about: 'Before' });
  synced = p; updateSynced = setP;
  syncControls = useOnboardingCopy(p, setP, true, syncGenerate);
  return <div>{syncControls.taglineStatus}{syncControls.aboutStatus}</div>;
}
let syncApp: ReturnType<typeof create>;
await act(async () => { syncApp = create(<SyncHarness />); });
await act(async () => { await pause(750); });
assert.equal(syncControls!.taglineStatus, 'loading');
await act(async () => { updateSynced!(p => ({ ...p, themePreset: 'rose_gold_ivory' })); });
assert.equal(syncRequests[0].signal.aborted, false, 'visual palette does not change the category or restart copy');
await act(async () => { updateSynced!(p => ({ ...p, tagline: 'Remote owner copy', taglineEditedByOwner: true })); });
assert.equal(syncRequests[0].signal.aborted, true);
assert.equal(syncControls!.taglineStatus, 'idle', 'external tagline change clears loading');
await act(async () => { syncRequests[0].resolve('Stale response'); await Promise.resolve(); });
assert.equal(synced!.tagline, 'Remote owner copy');
await act(async () => { updateSynced!(p => ({ ...p, businessName: 'Renamed' })); });
await act(async () => { await pause(750); });
assert.equal(syncRequests.length, 1, 'external owner copy is protected on subsequent changes');
await act(async () => { void syncControls!.writeAbout(); });
await act(async () => { updateSynced!(p => ({ ...p, about: 'Remote story', aboutEditedByOwner: true })); });
assert.equal(syncRequests[1].signal.aborted, true);
assert.equal(syncControls!.aboutStatus, 'idle');
await act(async () => { syncRequests[1].resolve('stale story'); await Promise.resolve(); });
assert.equal(synced!.about, 'Remote story');
await act(async () => { syncApp!.unmount(); });

// Unknown legacy provenance is protected, even when it happens to match a
// bundled template. New blank-profile seeds are explicitly marked instead.
const seeded = applyTemplateDesign({ ...INITIAL_SALON_PROFILE, tagline: '' }, CATEGORY_TEMPLATES.nail_studio);
assert.equal(seeded.onboardingGeneratedTagline, seeded.tagline);
const unknown = { ...seeded, tagline: CATEGORY_TEMPLATES.hair_salon.tagline, about: CATEGORY_TEMPLATES.hair_salon.about, onboardingGeneratedTagline: undefined, onboardingSeededAbout: undefined };
const preserved = applyTemplateDesign(unknown, CATEGORY_TEMPLATES.bridal_lounge);
assert.equal(preserved.tagline, unknown.tagline); assert.equal(preserved.about, unknown.about);
const ownerCopied = patchOwnerCopy(seeded, { tagline: CATEGORY_TEMPLATES.hair_salon.tagline, about: CATEGORY_TEMPLATES.hair_salon.about });
assert.equal(hasOwnerCustomNailTagline(ownerCopied), true); assert.equal(hasOwnerCustomNailAbout(ownerCopied), true);
assert.equal(hasOwnerCustomTagline(ownerCopied), true); assert.equal(hasOwnerCustomAbout(ownerCopied), true);
const switchedCopy = applyTemplateDesign(JSON.parse(JSON.stringify(ownerCopied)), CATEGORY_TEMPLATES.bridal_lounge);
assert.equal(switchedCopy.tagline, ownerCopied.tagline); assert.equal(switchedCopy.about, ownerCopied.about);
assert.equal(normalizeWorkspace({ profile: { ...ownerCopied, businessType: 'nail_studio', tagline: 'Glossy Chrome Gel Nails, Sculpted Extensions, Lash Lifts & Laminated Brows' } }).profile.tagline, 'Glossy Chrome Gel Nails, Sculpted Extensions, Lash Lifts & Laminated Brows', 'explicit manual copy survives legacy normalization');
assert.equal(normalizeWorkspace({ profile: { businessType: 'nail_studio', tagline: 'Glossy Chrome Gel Nails, Sculpted Extensions, Lash Lifts & Laminated Brows' } }).profile.tagline, 'Glossy Chrome Gel Nails, Sculpted Extensions, Lash Lifts & Laminated Brows', 'unknown legacy copy is not assumed to be replaceable');
assert.equal(applyTemplateDesign({ ...seeded, taglineEditedByOwner: true }, CATEGORY_TEMPLATES.hair_salon).tagline, seeded.tagline, 'explicitly edited taglines survive template switching');
assert.equal(normalizeWorkspace({ profile: { businessType: 'nail_studio', tagline: '' } }).profile.onboardingGeneratedTagline, CATEGORY_TEMPLATES.nail_studio.tagline);
let legacyControls: ReturnType<typeof useOnboardingCopy>;
let legacyCalls = 0;
function LegacyHarness() {
  const [p, setP] = useState({ ...INITIAL_SALON_PROFILE, businessName: 'Legacy', tagline: CATEGORY_TEMPLATES.hair_salon.tagline, onboardingGeneratedTagline: undefined, taglineEditedByOwner: undefined });
  legacyControls = useOnboardingCopy(p, setP, true, async () => { legacyCalls++; return 'Generated'; });
  return <div>{legacyControls.taglineStatus}</div>;
}
let legacy: ReturnType<typeof create>;
await act(async () => { legacy = create(<LegacyHarness />); });
await act(async () => { await pause(750); });
assert.equal(legacyCalls, 0, 'unknown legacy copy is not overwritten even if it matches a stock tagline');
await act(async () => { legacy!.unmount(); });

// Verify real owner and dashboard field handlers, not only provenance helpers.
const savedWindow = (globalThis as any).window, savedLocation = (globalThis as any).location;
(globalThis as any).location = { search: '?module=2', href: 'https://studioflow.test/?module=2', origin: 'https://studioflow.test', hash: '' };
(globalThis as any).window = { addEventListener() {}, removeEventListener() {}, setTimeout };
let editorProfile: SalonProfile;
const noop = () => {};
function EditorHarness({ dashboard = false }: { dashboard?: boolean }) {
  const [p, setP] = useState({ ...INITIAL_SALON_PROFILE, tagline: 'Existing owner copy' });
  editorProfile = p;
  if (dashboard) return <SaaSDashboard profile={p} setProfile={setP} services={[]} setServices={noop} stylists={[]} setStylists={noop} appointments={[]} setAppointments={noop} clients={[]} initialTab="website" templates={Object.values(CATEGORY_TEMPLATES)} />;
  return <OwnerWorkspace profile={p} setProfile={setP} services={[]} setServices={noop} stylists={[]} setStylists={noop} appointments={[]} clients={[]} setClients={noop} loyaltyConfig={DEFAULT_LOYALTY_CONFIG} setLoyaltyConfig={noop} extras={DEFAULT_EXTRAS} setExtras={noop} published={null} onPublish={async () => {}} sessionEmail="owner@example.com" templates={Object.values(CATEGORY_TEMPLATES)} onOpenPreview={noop} onOpenDashboard={noop} onOpenWizard={noop} sync="saved" syncError="" />;
}
try {
  for (const dashboard of [false, true]) {
    let editor: ReturnType<typeof create>;
    await act(async () => { editor = create(<EditorHarness dashboard={dashboard} />, { createNodeMock: () => ({ focus() {}, scrollIntoView() {} }) }); });
    const field = editor!.root.findAllByType('input').find((n: any) => n.props.value === 'Existing owner copy');
    assert.ok(field, `${dashboard ? 'dashboard' : 'owner'} tagline input`);
    await act(async () => { field!.props.onChange({ target: { value: CATEGORY_TEMPLATES.nail_studio.tagline } }); });
    assert.equal(editorProfile!.taglineEditedByOwner, true);
    assert.equal(applyTemplateDesign(editorProfile!, CATEGORY_TEMPLATES.hair_salon).tagline, CATEGORY_TEMPLATES.nail_studio.tagline);
    await act(async () => { editor!.unmount(); });
  }
} finally { (globalThis as any).window = savedWindow; (globalThis as any).location = savedLocation; }

let aboutProfile: SalonProfile;
function AboutEditorHarness() {
  const [p, setP] = useState({ ...INITIAL_SALON_PROFILE, about: 'A personal story' });
  aboutProfile = p;
  return <AboutStudioEditor profile={p} setProfile={setP} />;
}
let aboutEditor: ReturnType<typeof create>;
await act(async () => { aboutEditor = create(<AboutEditorHarness />); });
const aboutField = aboutEditor!.root.findAllByType('textarea').find((n: any) => n.props.value === 'A personal story');
assert.ok(aboutField);
await act(async () => { aboutField!.props.onChange({ target: { value: CATEGORY_TEMPLATES.hair_salon.about } }); });
assert.equal(aboutProfile!.aboutEditedByOwner, true);
assert.equal(applyTemplateDesign(aboutProfile!, CATEGORY_TEMPLATES.bridal_lounge).about, CATEGORY_TEMPLATES.hair_salon.about);
await act(async () => { aboutEditor!.unmount(); });

// Exercise the actual wizard field wiring and request payload with a mocked
// session/provider. No external request or real account is used.
const previousFetch = globalThis.fetch;
const previousSession = supabase.auth.getSession;
let posted: any = null;
(supabase.auth as any).getSession = async () => ({ data: { session: { access_token: 'test-token' } } });
globalThis.fetch = (async (_url: any, init: any) => {
  posted = JSON.parse(init.body);
  assert.equal(init.headers.Authorization, 'Bearer test-token');
  return new Response(JSON.stringify({ text: about }), { status: 200, headers: { 'content-type': 'application/json' } });
}) as typeof fetch;
let wizardProfile: SalonProfile;
function WizardHarness() {
  const [profile, setProfile] = useState({ ...INITIAL_SALON_PROFILE, businessName: 'Nail Place', ownerName: 'Riya', businessType: 'nail_studio' as const, tagline: 'My chosen tagline', about: '' });
  const [services, setServices] = useState<any[]>([]);
  const [stylists, setStylists] = useState<any[]>([]);
  wizardProfile = profile;
  return <OnboardingWizard profile={profile} setProfile={setProfile} services={services} setServices={setServices} stylists={stylists} setStylists={setStylists} templates={Object.values(CATEGORY_TEMPLATES)} onComplete={() => {}} />;
}
let wizard: ReturnType<typeof create>;
try {
  await act(async () => { wizard = create(<WizardHarness />); });
  await act(async () => { wizard!.root.findByProps({ 'data-testid': 'wizard-continue' }).props.onClick(); });
  assert.ok(wizard!.root.findByProps({ id: 'wizard-tagline' }));
  assert.ok(wizard!.root.findByProps({ id: 'wizard-about' }));
  const write = wizard!.root.findAllByType('button').find((b: any) => b.props.children === 'Write with AI');
  assert.ok(write, 'wizard exposes Write with AI');
  await act(async () => { write!.props.onClick(); await pause(20); });
  assert.deepEqual(posted, { kind: 'about', businessName: 'Nail Place', ownerName: 'Riya', theme: 'nail_studio', tagline: 'My chosen tagline' });
  assert.equal(wizardProfile!.about, about);
  assert.equal(wizardProfile!.tagline, 'My chosen tagline');
  await act(async () => { wizard!.root.findByProps({ id: 'wizard-tagline' }).props.onChange({ target: { value: CATEGORY_TEMPLATES.nail_studio.tagline } }); });
  assert.equal(wizardProfile!.taglineEditedByOwner, true, 'manual edits matching a default remain marked');
  await act(async () => { wizard!.unmount(); });
} finally { globalThis.fetch = previousFetch; (supabase.auth as any).getSession = previousSession; }
console.log('PASS: onboarding copy auth, per-instance quota, validation, safe provider failures and React debouncing, stale response, manual-edit, regeneration, error and unmount behavior.');
