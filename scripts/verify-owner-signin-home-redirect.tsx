/**
 * Verification suite for plain owner sign-in landing on the home page (`/`).
 *
 * Covers:
 *  1. Email/password owner sign-in on `/login`, `/sign-in` and `/sign-up`
 *     (switched to Sign in) replaces history with `/` on platform hosts and
 *     clears stale OAuth intents.
 *  2. Email/password owner sign-up (even with an immediate session) and every
 *     targeted flow (`?owner`, `?panel`, `?module`, `?template`, `?pricing_plan`,
 *     `?customer`, `?app`, `invitationMode`, `compact`, `redirectPathOverride`,
 *     legacy `/?auth=signin`) preserve their existing destinations.
 *  3. Google OAuth owner sign-in returning to `/login` (both synchronous and
 *     asynchronous session resolution, plus `/sign-in` and `/sign-up` alias
 *     returns) consumes `GoogleOAuthIntent`, skips unnecessary workspace
 *     bootstrap RPCs and calls `location.replace('/')`.
 *  4. A signed-in owner opening `/login` directly ("Open Workspace" from `/`)
 *     has no OAuth intent and reaches the workspace without redirecting to `/`.
 *  5. A cancelled Google OAuth attempt (`/login?error=access_denied`) clears
 *     the pending `GoogleOAuthIntent` so a subsequent sign-up opens the
 *     workspace rather than being redirected to `/`.
 *  6. `/sign-in` and `/sign-up` render `AuthPage` in `App` (never misread as
 *     published salon slugs).
 */
import React from 'react';
import { act, create } from 'react-test-renderer';
import assert from 'node:assert/strict';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const localMap = new Map<string, string>();
const sessionMap = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => localMap.get(k) ?? null,
  setItem: (k: string, v: string) => localMap.set(k, v),
  removeItem: (k: string) => localMap.delete(k),
  clear: () => localMap.clear(),
};
(globalThis as any).sessionStorage = {
  getItem: (k: string) => sessionMap.get(k) ?? null,
  setItem: (k: string, v: string) => sessionMap.set(k, v),
  removeItem: (k: string) => sessionMap.delete(k),
  clear: () => sessionMap.clear(),
};

const assignedUrls: string[] = [];
const replacedUrls: string[] = [];

function makeLocation(rawUrl: string) {
  const parsed = new URL(rawUrl);
  return {
    get href() { return parsed.href; },
    set href(next: string) { parsed.href = next; },
    get origin() { return parsed.origin; },
    get protocol() { return parsed.protocol; },
    get host() { return parsed.host; },
    get hostname() { return parsed.hostname; },
    get pathname() { return parsed.pathname; },
    get search() { return parsed.search; },
    get hash() { return parsed.hash; },
    assign(target: string) {
      assignedUrls.push(target);
      const next = new URL(target, parsed.href);
      parsed.href = next.href;
    },
    replace(target: string) {
      replacedUrls.push(target);
      const next = new URL(target, parsed.href);
      parsed.href = next.href;
    },
  };
}

let currentLocation = makeLocation('https://nexorasalon.online/login');
Object.defineProperty(globalThis, 'location', {
  configurable: true,
  get: () => currentLocation,
  set: (val: any) => {
    currentLocation = typeof val === 'string' ? makeLocation(val) : val;
  },
});

const historyState = {
  state: null as any,
  replaceState(_state: any, _title: string, url?: string | URL | null) {
    if (url !== undefined && url !== null) {
      currentLocation = makeLocation(new URL(String(url), currentLocation.href).href);
    }
  },
  pushState(_state: any, _title: string, url?: string | URL | null) {
    if (url !== undefined && url !== null) {
      currentLocation = makeLocation(new URL(String(url), currentLocation.href).href);
    }
  },
};
(globalThis as any).history = historyState;

const headNodes: any[] = [];
const makeElement = (tag: string) => {
  const attrs = new Map<string, string>();
  return {
    tagName: tag.toUpperCase(),
    textContent: '',
    rel: '',
    href: '',
    content: '',
    as: '',
    crossOrigin: '',
    dataset: {} as Record<string, string>,
    style: {} as Record<string, string>,
    setAttribute: (k: string, v: string) => attrs.set(k, v),
    getAttribute: (k: string) => attrs.get(k) ?? null,
    remove: () => {},
  };
};
(globalThis as any).document = {
  title: '',
  hidden: false,
  head: {
    appendChild: (node: any) => { headNodes.push(node); return node; },
  },
  body: { style: {} },
  documentElement: { lang: 'en', style: { setProperty() {} } },
  createElement: (tag: string) => makeElement(tag),
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as any).window = {
  get location() { return currentLocation; },
  history: historyState,
  localStorage: (globalThis as any).localStorage,
  sessionStorage: (globalThis as any).sessionStorage,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  setTimeout,
  clearTimeout,
};

const go = (url: string) => {
  currentLocation = makeLocation(url);
};

const { supabase } = await import('../src/lib/supabase');
const { saveOAuthIntent, readOAuthIntent, clearOAuthIntent, isSafeRelativePath } = await import('../src/lib/authEntry');
const { isPlatformRootHost, isStorefrontRootHost } = await import('../src/lib/resolveSite');
const { saveGoogleOAuthIntent, readGoogleOAuthIntent, clearGoogleOAuthIntent } = await import('../src/lib/googleOAuth');
const { AuthPage } = await import('../src/components/AuthPage');
const { default: App } = await import('../src/App');
const { INITIAL_SALON_PROFILE } = await import('../src/mockData');

let mockSession: any = null;
let pendingGetSession: ((res: any) => void) | null = null;
const authListeners = new Set<(event: string, session: any) => void>();
const rpcCalls: Array<[string, any]> = [];
const profileUpdates: any[] = [];

(supabase.auth as any).onAuthStateChange = (cb: (event: string, session: any) => void) => {
  authListeners.add(cb);
  return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
};
(supabase.auth as any).getSession = () => {
  if (pendingGetSession) {
    return new Promise((resolve) => {
      const prev = pendingGetSession!;
      pendingGetSession = (res) => { prev(res); resolve(res); };
    });
  }
  return Promise.resolve({ data: { session: mockSession }, error: null });
};
(supabase.auth.mfa as any).getAuthenticatorAssuranceLevel = async () => ({
  data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null,
});
(supabase.auth as any).signInWithPassword = async ({ email }: { email: string; password: string }) => {
  const session = { user: { id: 'owner-email-1', email, created_at: '2025-01-01T00:00:00Z', user_metadata: {} } };
  mockSession = session;
  for (const cb of authListeners) cb('SIGNED_IN', session);
  return { data: { session, user: session.user }, error: null };
};
(supabase.auth as any).signUp = async ({ email, options }: any) => {
  const session = { user: { id: 'owner-signup-1', email, created_at: new Date().toISOString(), user_metadata: options?.data || {} } };
  mockSession = session;
  for (const cb of authListeners) cb('SIGNED_IN', session);
  return { data: { session, user: session.user }, error: null };
};
(supabase.auth as any).signOut = async () => {
  mockSession = null;
  return { error: null };
};
(supabase.auth as any).updateUser = async ({ data }: any) => ({
  data: { user: { ...(mockSession?.user || {}), user_metadata: data || {} } },
  error: null,
});
(supabase as any).rpc = async (name: string, args: any) => {
  rpcCalls.push([name, args]);
  if (name === 'studioflow_ensure_account') {
    return { data: { draft: { profile: INITIAL_SALON_PROFILE, services: [], stylists: [] }, revision: 1 }, error: null };
  }
  return { data: true, error: null };
};
(supabase as any).from = (table: string) => {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    order: () => Promise.resolve({ data: [], error: null }),
    maybeSingle: () => Promise.resolve({
      data: table === 'studioflow_websites' ? { slug: 'my-salon' } : table === 'profiles' ? { full_name: 'Owner', salon_name: 'Glow Salon' } : { draft: { profile: INITIAL_SALON_PROFILE }, revision: 1 },
      error: null,
    }),
    single: () => Promise.resolve({ data: { draft: { profile: INITIAL_SALON_PROFILE }, revision: 1 }, error: null }),
    update: (payload: any) => {
      profileUpdates.push([table, payload]);
      const upd: any = {
        eq: () => upd,
        select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'u1' }, error: null }) }),
      };
      return upd;
    },
  };
  return chain;
};
(supabase as any).channel = () => {
  const ch: any = { on: () => ch, subscribe: () => ch };
  return ch;
};
(supabase as any).removeChannel = async () => 'ok';

const textOf = (node: any): string =>
  typeof node === 'string'
    ? node
    : Array.isArray(node)
      ? node.map(textOf).join('')
      : node && Array.isArray(node.children)
        ? node.children.map(textOf).join('')
        : '';

const findButton = (root: any, label: string) =>
  root.findAllByType('button').find((b: any) => textOf(b).trim() === label);

const fillSignIn = async (root: any, email = 'owner@nexora.test', password = 'Password123!') => {
  const emailInput = root.findAllByType('input').find((i: any) => i.props.type === 'email');
  const pwInput = root.findAllByType('input').find((i: any) => i.props.type === 'password');
  await act(async () => {
    emailInput.props.onChange({ target: { value: email } });
    pwInput.props.onChange({ target: { value: password } });
  });
};

const submitAuthForm = async (root: any) => {
  await act(async () => {
    await root.findByType('form').props.onSubmit({ preventDefault() {} });
  });
};

const flushEffects = async () => {
  await act(async () => {
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
  });
};

// ---------------------------------------------------------------------------
// 1. Plain owner email sign-in on /login, /sign-in and /sign-up -> '/'
// ---------------------------------------------------------------------------
for (const entryUrl of [
  'https://nexorasalon.online/login',
  'https://nexorasalon.online/sign-in',
  'https://nexorasalon.online/sign-up',
  'https://nexorasalon.online/login?auth=signup',
  'https://nexorasalon.online/login?passwordUpdated=1',
]) {
  assignedUrls.length = 0;
  replacedUrls.length = 0;
  mockSession = null;
  // Seed a stale Google intent to verify email sign-in cleans it up.
  saveGoogleOAuthIntent({
    role: 'owner',
    mode: 'signin',
    fullName: '',
    salonName: '',
    dateOfBirth: '',
    whatsappNumber: '',
    referralCode: '',
    welcomeWhatsApp: false,
  });
  go(entryUrl);
  let view: any;
  await act(async () => { view = create(<AuthPage />); });
  const signInTab = findButton(view.root, 'Sign in');
  if (signInTab && signInTab.props.className === 'secondary-action') {
    await act(async () => signInTab.props.onClick());
  }
  await fillSignIn(view.root);
  await submitAuthForm(view.root);
  assert.deepEqual(replacedUrls, ['/'], `Plain owner email sign-in from ${entryUrl} must replace history with /`);
  assert.deepEqual(assignedUrls, [], 'Plain owner sign-in does not add a login history entry');
  assert.equal(readGoogleOAuthIntent(), null, 'Email sign-in clears any stale Google OAuth intent');
  await act(async () => view.unmount());
}

// ---------------------------------------------------------------------------
// 2. Owner email sign-up and targeted sign-in flows keep their destinations
// ---------------------------------------------------------------------------
{
  // 2a. Brand-new owner email sign-up with immediate session stays in-place for Workspace
  assignedUrls.length = 0;
  replacedUrls.length = 0;
  mockSession = null;
  go('https://nexorasalon.online/sign-up');
  let view: any;
  await act(async () => { view = create(<AuthPage />); });
  const inputs = view.root.findAllByType('input');
  await act(async () => {
    inputs.find((i: any) => i.props.autoComplete === 'name').props.onChange({ target: { value: 'Asha' } });
    inputs.find((i: any) => i.props.maxLength === 150 && i.props.autoComplete !== 'name').props.onChange({ target: { value: 'Glow Salon' } });
  });
  await fillSignIn(view.root, 'newowner@nexora.test', 'Password123!');
  await submitAuthForm(view.root);
  assert.deepEqual(assignedUrls, [], 'Owner sign-up must not redirect away from Workspace onboarding');
  assert.deepEqual(replacedUrls, [], 'Plain auto-confirmed owner sign-up transitions in-place without a forced home redirect');
  await act(async () => view.unmount());

  // App-level SIGNED_IN handling takes an auto-confirmed plain owner sign-up into Workspace.
  rpcCalls.length = 0;
  replacedUrls.length = 0;
  mockSession = null;
  go('https://nexorasalon.online/sign-up');
  await act(async () => { view = create(<App />); });
  const appSignupInputs = view.root.findAllByType('input');
  await act(async () => {
    appSignupInputs.find((i: any) => i.props.autoComplete === 'name').props.onChange({ target: { value: 'Asha' } });
    appSignupInputs.find((i: any) => i.props.maxLength === 150 && i.props.autoComplete !== 'name').props.onChange({ target: { value: 'Glow Salon' } });
  });
  await fillSignIn(view.root, 'appsignup@nexora.test', 'Password123!');
  await submitAuthForm(view.root);
  await flushEffects();
  assert.equal(rpcCalls.some(([name]) => name === 'studioflow_ensure_account'), true, 'Auto-confirmed sign-up session boots Workspace in App');
  assert.equal(currentLocation.pathname, '/login', 'Workspace cleans the /sign-up alias after session activation');
  assert.deepEqual(replacedUrls, [], 'Plain owner sign-up is not sent to the public homepage');
  await act(async () => view.unmount());

  // Auto-confirmed template sign-up preserves the selected template and enters creation mode.
  assignedUrls.length = 0;
  replacedUrls.length = 0;
  mockSession = null;
  go('https://nexorasalon.online/sign-up?template=hair_salon');
  await act(async () => { view = create(<AuthPage />); });
  const templateInputs = view.root.findAllByType('input');
  await act(async () => {
    templateInputs.find((i: any) => i.props.autoComplete === 'name').props.onChange({ target: { value: 'Asha' } });
    templateInputs.find((i: any) => i.props.maxLength === 150 && i.props.autoComplete !== 'name').props.onChange({ target: { value: 'Glow Salon' } });
  });
  await fillSignIn(view.root, 'templateowner@nexora.test', 'Password123!');
  await submitAuthForm(view.root);
  assert.deepEqual(replacedUrls, ['/?template=hair_salon&create=1'], 'Auto-confirmed template sign-up must preserve template and enter onboarding');
  await act(async () => view.unmount());

  // 2b. Targeted owner/customer/template/pricing/deep-link sign-ins do not redirect to '/'
  const nonHomeCases: Array<{ url: string; props?: Record<string, any>; expectedAssign: string[] }> = [
    { url: 'https://nexorasalon.online/login?owner=my-salon', expectedAssign: [] },
    { url: 'https://nexorasalon.online/login?panel=demo', expectedAssign: [] },
    { url: 'https://nexorasalon.online/login?module=4', expectedAssign: [] },
    { url: 'https://nexorasalon.online/login?template=hair_salon&create=1', expectedAssign: [] },
    { url: 'https://nexorasalon.online/login?pricing_plan=grow&billing_interval=annual', expectedAssign: ['/pricing?resume_plan=grow&billing_interval=annual'] },
    { url: 'https://nexorasalon.online/login?customer=1&return=my-salon', expectedAssign: [] },
    { url: 'https://nexorasalon.online/?app=1', props: { compact: true, customerMode: true }, expectedAssign: [] },
    { url: 'https://nexorasalon.online/login', props: { compact: true }, expectedAssign: [] },
    { url: 'https://nexorasalon.online/login', props: { redirectPathOverride: '/custom-return' }, expectedAssign: [] },
    { url: 'https://nexorasalon.online/login', props: { customerMode: true, invitationMode: true }, expectedAssign: ['/?app=1&tab=rewards'] },
    { url: 'https://nexorasalon.online/?auth=signin', expectedAssign: [] },
  ];
  for (const testCase of nonHomeCases) {
    assignedUrls.length = 0;
    replacedUrls.length = 0;
    mockSession = null;
    go(testCase.url);
    await act(async () => { view = create(<AuthPage {...(testCase.props || {})} />); });
    await fillSignIn(view.root);
    await submitAuthForm(view.root);
    assert.deepEqual(
      assignedUrls,
      testCase.expectedAssign,
      `Targeted sign-in ${testCase.url} (${JSON.stringify(testCase.props || {})}) must preserve its return behaviour`,
    );
    await act(async () => view.unmount());
  }
}

// Host classification and redirect-target defenses: only recognized platform roots use `/`;
// salon/custom domains stay in the same-origin workspace and unsafe URL forms are rejected.
{
  assert.equal(isPlatformRootHost({ hostname: 'nexorasalon.online' }), true);
  assert.equal(isPlatformRootHost({ hostname: 'nexorasalon.online.' }), true, 'DNS root-dot host spelling is normalized');
  assert.equal(isStorefrontRootHost({ hostname: 'nexorasalon.online' }), false);
  assert.equal(isStorefrontRootHost({ hostname: 'vijaysalojaipur.nexorasalon.online' }), true);
  assert.equal(isPlatformRootHost({ hostname: 'vijaysalojaipur.nexorasalon.online' }), false);
  assert.equal(isPlatformRootHost({ hostname: 'glow.example' }), false, 'Unknown custom domains are not assumed to be platform homepages');
  assert.equal(isSafeRelativePath('/workspace?tab=preview'), true);
  assert.equal(isSafeRelativePath('//evil.com'), false);
  assert.equal(isSafeRelativePath('/\\evil.com'), false, 'Backslash URL authority forms are rejected');

  for (const host of ['vijaysalojaipur.nexorasalon.online', 'glow.example']) {
    assignedUrls.length = 0;
    replacedUrls.length = 0;
    mockSession = null;
    go(`https://${host}/login`);
    let hostView: any;
    await act(async () => { hostView = create(<AuthPage />); });
    await fillSignIn(hostView.root);
    await submitAuthForm(hostView.root);
    assert.deepEqual(replacedUrls, [], `Owner login on ${host} stays on that origin instead of landing on a storefront`);
    assert.deepEqual(assignedUrls, [], `Owner login on ${host} does not cross-origin navigate`);
    await act(async () => hostView.unmount());
  }
}

// ---------------------------------------------------------------------------
// 3. Google owner sign-in callback in <App /> redirects to '/' (sync & async)
// ---------------------------------------------------------------------------
for (const callbackUrl of [
  'https://nexorasalon.online/login?code=pkce123',
  'https://nexorasalon.online/login?auth=signin&code=pkce123',
  'https://nexorasalon.online/login?auth=signup&code=pkce123',
]) {
  // 3a. Session already available when getSession resolves immediately
  replacedUrls.length = 0;
  rpcCalls.length = 0;
  mockSession = { user: { id: 'google-owner-1', email: 'owner@nexora.test', created_at: '2025-01-01T00:00:00Z', user_metadata: {} } };
  saveGoogleOAuthIntent({
    role: 'owner',
    mode: 'signin',
    fullName: '',
    salonName: '',
    dateOfBirth: '',
    whatsappNumber: '',
    referralCode: '',
    welcomeWhatsApp: false,
  });
  saveOAuthIntent({ path: '/login', flow: 'owner' });
  go(callbackUrl);
  let appView: any;
  await act(async () => { appView = create(<App />); });
  await flushEffects();
  assert.deepEqual(replacedUrls, ['/'], `Google owner sign-in at ${callbackUrl} must replace location with /`);
  assert.equal(readGoogleOAuthIntent(), null, 'GoogleOAuthIntent is consumed before redirecting to /');
  assert.equal(readOAuthIntent(), null, 'OAuthIntent is cleared before redirecting to /');
  assert.equal(
    rpcCalls.some(([name]) => name === 'studioflow_ensure_account'),
    false,
    'Workspace bootstrap RPC must not run when Google owner sign-in is redirecting to /',
  );
  await act(async () => appView.unmount());
}

{
  // 3b. Session arrives asynchronously after mount (PKCE code exchange delay)
  replacedUrls.length = 0;
  rpcCalls.length = 0;
  mockSession = null;
  let resolveInitialSession!: (res: any) => void;
  pendingGetSession = (res) => { resolveInitialSession = res; };
  let triggerDeferred!: () => void;
  (supabase.auth as any).getSession = () =>
    new Promise((resolve) => {
      triggerDeferred = () =>
        resolve({
          data: {
            session: { user: { id: 'google-owner-async', email: 'async@nexora.test', created_at: '2025-01-01T00:00:00Z', user_metadata: {} } },
          },
          error: null,
        });
    });
  saveGoogleOAuthIntent({
    role: 'owner',
    mode: 'signin',
    fullName: '',
    salonName: '',
    dateOfBirth: '',
    whatsappNumber: '',
    referralCode: '',
    welcomeWhatsApp: false,
  });
  go('https://nexorasalon.online/login?code=delayed-pkce');
  let appView: any;
  await act(async () => { appView = create(<App />); });
  await flushEffects();
  assert.deepEqual(replacedUrls, [], 'No redirect before async PKCE session resolves');
  assert.ok(readGoogleOAuthIntent(), 'GoogleOAuthIntent stays intact while PKCE exchange is in flight');
  await act(async () => { triggerDeferred(); });
  await flushEffects();
  assert.deepEqual(replacedUrls, ['/'], 'Deferred PKCE Google owner sign-in redirects to / once session arrives');
  assert.equal(readGoogleOAuthIntent(), null, 'Deferred PKCE consumes GoogleOAuthIntent');
  await act(async () => appView.unmount());
  pendingGetSession = null;
  (supabase.auth as any).getSession = () => Promise.resolve({ data: { session: mockSession }, error: null });
  void resolveInitialSession;
}

// ---------------------------------------------------------------------------
// 3c. Google owner sign-up with a pricing deep link saves the profile first
// ---------------------------------------------------------------------------
{
  replacedUrls.length = 0;
  rpcCalls.length = 0;
  profileUpdates.length = 0;
  mockSession = {
    user: {
      id: 'google-owner-pricing-signup',
      email: 'pricing-owner@nexora.test',
      created_at: new Date(Date.now() + 1000).toISOString(),
      user_metadata: {},
    },
  };
  saveGoogleOAuthIntent({
    role: 'owner',
    mode: 'signup',
    fullName: 'Asha',
    salonName: 'Glow Salon',
    dateOfBirth: '',
    whatsappNumber: '',
    referralCode: '',
    welcomeWhatsApp: false,
  });
  saveOAuthIntent({ path: '/login?pricing_plan=grow&billing_interval=annual', flow: 'owner' });
  go('https://nexorasalon.online/login?pricing_plan=grow&billing_interval=annual&code=pkce-signup');
  let appView: any;
  await act(async () => { appView = create(<App />); });
  await flushEffects();
  assert.equal(
    profileUpdates.some(([table, payload]) => table === 'profiles' && payload.salon_name === 'Glow Salon'),
    true,
    'Google owner sign-up must persist the submitted salon name before pricing navigation',
  );
  assert.deepEqual(
    replacedUrls,
    ['/pricing?resume_plan=grow&billing_interval=annual'],
    'After the Google signup profile is saved, continue to the selected pricing plan',
  );
  assert.equal(readGoogleOAuthIntent(), null, 'Google signup intent is consumed after profile persistence');
  await act(async () => appView.unmount());
}

// ---------------------------------------------------------------------------
// 4. Signed-in owner clicking "Open Workspace" (/login, no OAuth intent) -> Workspace
// ---------------------------------------------------------------------------
{
  replacedUrls.length = 0;
  rpcCalls.length = 0;
  clearGoogleOAuthIntent();
  clearOAuthIntent();
  mockSession = { user: { id: 'workspace-owner-1', email: 'owner@nexora.test', created_at: '2025-01-01T00:00:00Z', user_metadata: {} } };
  go('https://nexorasalon.online/login');
  let appView: any;
  await act(async () => { appView = create(<App />); });
  await flushEffects();
  assert.deepEqual(replacedUrls, [], 'Signed-in owner opening /login directly must NOT be redirected back to /');
  assert.equal(
    rpcCalls.some(([name]) => name === 'studioflow_ensure_account'),
    true,
    'Signed-in owner opening /login directly boots their salon workspace',
  );
  await act(async () => appView.unmount());

  // Salon subdomains and unknown custom domains must remain same-origin and boot Workspace.
  for (const host of ['vijaysalojaipur.nexorasalon.online', 'glow.example']) {
    replacedUrls.length = 0;
    rpcCalls.length = 0;
    clearGoogleOAuthIntent();
    clearOAuthIntent();
    mockSession = { user: { id: `workspace-${host}`, email: 'owner@nexora.test', created_at: '2025-01-01T00:00:00Z', user_metadata: {} } };
    go(`https://${host}/login`);
    await act(async () => { appView = create(<App />); });
    await flushEffects();
    assert.deepEqual(replacedUrls, [], `Authenticated owner on ${host} must not be redirected to its storefront root`);
    assert.equal(rpcCalls.some(([name]) => name === 'studioflow_ensure_account'), true, `Authenticated owner on ${host} opens Workspace`);
    await act(async () => appView.unmount());
  }
}

// ---------------------------------------------------------------------------
// 5. Cancelled Google sign-in clears intent; Google owner sign-up & ?owner stay in Workspace
// ---------------------------------------------------------------------------
{
  // 5a. Cancelled Google sign-in (/login?error=access_denied) clears intent
  replacedUrls.length = 0;
  mockSession = null;
  saveGoogleOAuthIntent({
    role: 'owner',
    mode: 'signin',
    fullName: '',
    salonName: '',
    dateOfBirth: '',
    whatsappNumber: '',
    referralCode: '',
    welcomeWhatsApp: false,
  });
  go('https://nexorasalon.online/login?error=access_denied');
  let appView: any;
  await act(async () => { appView = create(<App />); });
  await flushEffects();
  assert.equal(readGoogleOAuthIntent(), null, 'Cancelled Google callback clears stale GoogleOAuthIntent');
  assert.deepEqual(replacedUrls, []);
  // If a new signup session arrives afterwards on the same mounted tree, it stays in Workspace.
  rpcCalls.length = 0;
  const newSignupSession = { user: { id: 'after-cancel-signup', email: 'new@nexora.test', created_at: new Date().toISOString(), user_metadata: {} } };
  mockSession = newSignupSession;
  await act(async () => {
    for (const cb of authListeners) cb('SIGNED_IN', newSignupSession);
  });
  await flushEffects();
  assert.deepEqual(replacedUrls, [], 'Subsequent sign-up after cancelled Google sign-in stays in Workspace');
  assert.equal(rpcCalls.some(([name]) => name === 'studioflow_ensure_account'), true);
  await act(async () => appView.unmount());

  // 5b. Google owner sign-in on /login?owner=my-salon stays in Workspace
  replacedUrls.length = 0;
  rpcCalls.length = 0;
  mockSession = { user: { id: 'owner-slug-user', email: 'owner@nexora.test', created_at: '2025-01-01T00:00:00Z', user_metadata: {} } };
  saveGoogleOAuthIntent({
    role: 'owner',
    mode: 'signin',
    fullName: '',
    salonName: '',
    dateOfBirth: '',
    whatsappNumber: '',
    referralCode: '',
    welcomeWhatsApp: false,
  });
  go('https://nexorasalon.online/login?owner=my-salon&code=pkce123');
  await act(async () => { appView = create(<App />); });
  await flushEffects();
  assert.deepEqual(replacedUrls, [], 'Google sign-in with ?owner=my-salon must open the salon workspace, not /');
  assert.equal(readGoogleOAuthIntent(), null);
  assert.equal(rpcCalls.some(([name]) => name === 'studioflow_ensure_account'), true);
  await act(async () => appView.unmount());

  // 5c. Brand-new Google owner sign-up (mode: 'signup') saves profile and opens Workspace
  replacedUrls.length = 0;
  rpcCalls.length = 0;
  profileUpdates.length = 0;
  saveGoogleOAuthIntent({
    role: 'owner',
    mode: 'signup',
    fullName: 'Priya Sharma',
    salonName: 'Glow Salon',
    dateOfBirth: '',
    whatsappNumber: '',
    referralCode: '',
    welcomeWhatsApp: false,
  });
  mockSession = { user: { id: 'new-google-owner', email: 'priya@nexora.test', created_at: new Date().toISOString(), user_metadata: {} } };
  go('https://nexorasalon.online/login?code=pkce-signup');
  await act(async () => { appView = create(<App />); });
  await flushEffects();
  assert.deepEqual(replacedUrls, [], 'Google owner sign-up opens Workspace instead of redirecting to /');
  assert.equal(profileUpdates.some(([table, payload]) => table === 'profiles' && payload.salon_name === 'Glow Salon'), true);
  assert.equal(rpcCalls.some(([name]) => name === 'studioflow_ensure_account'), true);
  await act(async () => appView.unmount());
}

// ---------------------------------------------------------------------------
// 6. Sibling login tab receiving SIGNED_IN must not consume a stale Google signup intent
// ---------------------------------------------------------------------------
{
  replacedUrls.length = 0;
  rpcCalls.length = 0;
  profileUpdates.length = 0;
  mockSession = null;
  clearOAuthIntent();
  saveGoogleOAuthIntent({
    role: 'owner', mode: 'signup', fullName: 'Stale Name', salonName: 'Stale Salon',
    dateOfBirth: '', whatsappNumber: '', referralCode: '', welcomeWhatsApp: false,
  });
  go('https://nexorasalon.online/login?auth=signin');
  let tabB: any;
  await act(async () => { tabB = create(<App />); });
  await flushEffects();
  assert.equal(readGoogleOAuthIntent(), null, 'Non-callback login tab clears stale Google intent while signed out');
  const tabASession = { user: { id: 'tab-a-owner', email: 'tab-a@nexora.test', created_at: '2025-01-01T00:00:00Z', user_metadata: {} } };
  mockSession = tabASession;
  await act(async () => {
    for (const cb of authListeners) cb('SIGNED_IN', tabASession);
  });
  await flushEffects();
  assert.deepEqual(replacedUrls, [], 'Cross-tab SIGNED_IN must not redirect Tab B to /');
  assert.equal(profileUpdates.some(([table, payload]) => table === 'profiles' && payload.salon_name === 'Stale Salon'), false, 'Cross-tab session must not write stale signup profile details');
  assert.equal(rpcCalls.some(([name]) => name === 'studioflow_ensure_account'), true, 'Tab B opens the authenticated owner workspace');
  await act(async () => tabB.unmount());
}

// ---------------------------------------------------------------------------
// 7. Signed-out /sign-in and /sign-up render AuthPage inside <App /> (not PublishedWebsite)
// ---------------------------------------------------------------------------
{
  mockSession = null;
  clearGoogleOAuthIntent();
  clearOAuthIntent();

  go('https://nexorasalon.online/sign-in');
  let appView: any;
  await act(async () => { appView = create(<App />); });
  await flushEffects();
  assert.match(textOf(appView.root), /Sign in to NEXORA Salon OS\./, '/sign-in renders AuthPage in sign-in mode');
  await act(async () => appView.unmount());

  go('https://nexorasalon.online/sign-up');
  await act(async () => { appView = create(<App />); });
  await flushEffects();
  assert.match(textOf(appView.root), /Create your salon account/, '/sign-up renders AuthPage in sign-up mode');
  await act(async () => appView.unmount());
}

console.log('PASS: plain owner email & Google sign-ins from /login, /sign-in and /sign-up redirect to /, while Open Workspace, sign-ups and targeted flows preserve their destinations.');
process.exit(0);
