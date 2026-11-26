import React from 'react';
import { act, create } from 'react-test-renderer';
import assert from 'node:assert/strict';
import {
  appendAuthErrorParams,
  cleanCustomerAppReturnPath,
  clearOAuthIntent,
  clearPendingBookingFlow,
  consumePendingBookingFlow,
  hasAuthErrorParams,
  readAuthUrlError,
  readOAuthIntent,
  saveOAuthIntent,
  savePendingBookingFlow,
} from '../src/lib/authEntry';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const localMap = new Map<string, string>();
const sessionMap = new Map<string, string>();
const listeners = new Map<string, Set<any>>();
(globalThis as any).localStorage = {
  getItem: (k: string) => localMap.get(k) ?? null,
  setItem: (k: string, v: string) => localMap.set(k, v),
  removeItem: (k: string) => localMap.delete(k),
};
(globalThis as any).sessionStorage = {
  getItem: (k: string) => sessionMap.get(k) ?? null,
  setItem: (k: string, v: string) => sessionMap.set(k, v),
  removeItem: (k: string) => sessionMap.delete(k),
};
(globalThis as any).window = {
  addEventListener: (k: string, fn: any) => {
    if (!listeners.has(k)) listeners.set(k, new Set());
    listeners.get(k)!.add(fn);
  },
  removeEventListener: (k: string, fn: any) => listeners.get(k)?.delete(fn),
  dispatchEvent: (e: any) => {
    listeners.get(e.type)?.forEach((fn) => fn(e));
  },
};
const go = (url: string) => {
  (globalThis as any).location = new URL(url);
};
(globalThis as any).history = {
  replaceState: (_a: any, _b: any, url: any) => go(new URL(url, location.href).href),
};

const { supabase, captureReferral } = await import('../src/lib/supabase');
const { captureCustomerReferral, clearCustomerReferral } = await import('../src/lib/customerReferral');
const { readGoogleOAuthIntent, clearGoogleOAuthIntent } = await import('../src/lib/googleOAuth');
const { AuthPage } = await import('../src/components/AuthPage');
const { useAuthSession } = await import('../src/lib/useAuthSession');

const oauthCalls: any[] = [];
const rpcCalls: any[] = [];
const events: string[] = [];
let mockSession: any = null;
let mockOAuthError: any = null;
let mockOAuthThrows = false;
let validRefResult = true;

(supabase.auth as any).getSession = async () => ({ data: { session: mockSession }, error: null });
(supabase.auth as any).signOut = async (opts: any) => {
  events.push(`signOut:${opts?.scope || 'default'}`);
  mockSession = null;
  return { error: null };
};
(supabase.auth as any).signInWithOAuth = async (args: any) => {
  events.push('signInWithOAuth');
  oauthCalls.push(args);
  if (mockOAuthThrows) throw new Error('Network unavailable');
  if (mockOAuthError) return { data: { provider: 'google', url: null }, error: mockOAuthError };
  return { data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2/v2/auth' }, error: null };
};
(supabase as any).rpc = async (name: string, args: any) => {
  rpcCalls.push([name, args]);
  return { data: validRefResult, error: null };
};

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

// 1. Visibility across modes
go('https://owner.test/login');
let view: any;
await act(async () => {
  view = create(<AuthPage />);
});
assert.ok(findButton(view.root, 'Continue with Google'), 'Sign in shows Google OAuth button');
await act(async () => findButton(view.root, 'Sign up').props.onClick());
assert.ok(findButton(view.root, 'Continue with Google'), 'Sign up shows Google OAuth button');
await act(async () => findButton(view.root, 'Sign in').props.onClick());
await act(async () => findButton(view.root, 'Forgot password?').props.onClick());
assert.equal(findButton(view.root, 'Continue with Google'), undefined, 'Forgot password hides Google OAuth');
await act(async () => view.unmount());

await act(async () => {
  view = create(<AuthPage recovery />);
});
assert.equal(findButton(view.root, 'Continue with Google'), undefined, 'Password recovery hides Google OAuth');
await act(async () => view.unmount());

// 2. Owner standard login returns to /login (never / which renders PublicHomepage)
go('https://owner.test/login');
oauthCalls.length = 0;
await act(async () => {
  view = create(<AuthPage />);
});
await act(async () => findButton(view.root, 'Continue with Google').props.onClick());
assert.equal(oauthCalls[0].provider, 'google');
assert.equal(oauthCalls[0].options.redirectTo, 'https://owner.test/login');
assert.deepEqual(oauthCalls[0].options.queryParams, { prompt: 'select_account' });
assert.deepEqual(readOAuthIntent()?.path, '/login');
assert.equal(readOAuthIntent()?.flow, 'owner');
await act(async () => view.unmount());
clearOAuthIntent();

const findInput = (root: any, pred: (props: any) => boolean) =>
  root.findAllByType('input').find((i: any) => pred(i.props));
const fillOwnerSignup = async (root: any, name = 'Priya Sharma', salon = 'Glow Salon') => {
  await act(async () => findInput(root, (p) => p.autoComplete === 'name').props.onChange({ target: { value: name } }));
  await act(async () => findInput(root, (p) => p.maxLength === 150 && p.autoComplete !== 'name').props.onChange({ target: { value: salon } }));
};
const fillCustomerSignup = async (root: any, name = 'Asha Verma', dob = '1996-05-14', wa = '9876543210') => {
  await act(async () => findInput(root, (p) => p.autoComplete === 'name').props.onChange({ target: { value: name } }));
  await act(async () => findInput(root, (p) => p.type === 'date').props.onChange({ target: { value: dob } }));
  await act(async () => findInput(root, (p) => p['aria-label'] === 'WhatsApp number').props.onChange({ target: { value: wa } }));
};

// 3. Owner signup requires name/salon, validates edited referral, and stores studioflow_pending_ref
go('https://owner.test/login?auth=signup&ref=OLDREF1');
oauthCalls.length = 0;
rpcCalls.length = 0;
await act(async () => {
  view = create(<AuthPage />);
});
await act(async () => findButton(view.root, 'Continue with Google').props.onClick());
assert.equal(oauthCalls.length, 0, 'Owner Google signup blocks missing name/salon');
assert.match(view.root.findByProps({ role: 'status' }).children.join(''), /Enter your full name/);
await fillOwnerSignup(view.root);
const ownerRefInput = view.root.findAllByType('input').find((i: any) => i.props.maxLength === 32);
await act(async () => ownerRefInput.props.onChange({ target: { value: 'partner99' } }));
await act(async () => findButton(view.root, 'Continue with Google').props.onClick());
assert.deepEqual(rpcCalls[0], ['studioflow_validate_ref', { p_code: 'PARTNER99' }]);
assert.equal(captureReferral(), 'PARTNER99');
assert.ok(!location.search.includes('ref='), 'URL ?ref is cleaned before redirect');
assert.equal(oauthCalls[0].options.redirectTo, 'https://owner.test/login');
assert.equal(readGoogleOAuthIntent()?.salonName, 'Glow Salon');
await act(async () => view.unmount());
localMap.delete('studioflow_pending_ref');
clearGoogleOAuthIntent();

// Invalid referral blocks Google OAuth and keeps button interactive
go('https://owner.test/login?auth=signup');
oauthCalls.length = 0;
validRefResult = false;
await act(async () => {
  view = create(<AuthPage />);
});
await fillOwnerSignup(view.root);
await act(async () =>
  view.root.findAllByType('input').find((i: any) => i.props.maxLength === 32).props.onChange({ target: { value: 'BADCODE1' } }),
);
await act(async () => findButton(view.root, 'Continue with Google').props.onClick());
assert.equal(oauthCalls.length, 0, 'Invalid referral blocks OAuth redirect');
assert.equal(findButton(view.root, 'Continue with Google').props.disabled, false);
assert.match(view.root.findByProps({ role: 'status' }).children.join(''), /Referral code is invalid/);
await act(async () => view.unmount());
validRefResult = true;

// 4. Template and pricing owner flows
go('https://owner.test/login?auth=signup&template=hair_salon&create=1');
oauthCalls.length = 0;
await act(async () => {
  view = create(<AuthPage />);
});
await fillOwnerSignup(view.root);
await act(async () => findButton(view.root, 'Continue with Google').props.onClick());
assert.equal(oauthCalls[0].options.redirectTo, 'https://owner.test/?template=hair_salon&create=1');
await act(async () => view.unmount());
clearGoogleOAuthIntent();

go('https://owner.test/login?auth=signup&pricing_plan=grow&billing_interval=annual');
oauthCalls.length = 0;
await act(async () => {
  view = create(<AuthPage />);
});
await fillOwnerSignup(view.root);
await act(async () => findButton(view.root, 'Continue with Google').props.onClick());
assert.equal(oauthCalls[0].options.redirectTo, 'https://owner.test/pricing?resume_plan=grow&billing_interval=annual');
await act(async () => view.unmount());
clearGoogleOAuthIntent();

// 5. Customer App context preservation + edited referral (kept in googleOAuth intent, cleared from early bridge)
go('https://salon.test/?app=1&site=royal-cuts&tab=explore&auth=signin');
oauthCalls.length = 0;
await act(async () => {
  view = create(<AuthPage compact customerMode />);
});
await act(async () => findButton(view.root, 'Continue with Google').props.onClick());
assert.equal(oauthCalls[0].options.redirectTo, 'https://salon.test/?app=1&site=royal-cuts&tab=explore');
assert.equal(readOAuthIntent()?.flow, 'app');
await act(async () => view.unmount());
clearGoogleOAuthIntent();

go('https://salon.test/?app=1&auth=signup&customer_ref=FRIEND11');
oauthCalls.length = 0;
rpcCalls.length = 0;
await act(async () => {
  view = create(<AuthPage compact customerMode />);
});
await fillCustomerSignup(view.root);
await act(async () =>
  view.root.findAllByType('input').find((i: any) => i.props.maxLength === 32).props.onChange({ target: { value: 'friend22' } }),
);
await act(async () => findButton(view.root, 'Continue with Google').props.onClick());
assert.deepEqual(rpcCalls[0], ['studioflow_customer_validate_ref', { p_code: 'FRIEND22' }]);
assert.equal(readGoogleOAuthIntent()?.referralCode, 'FRIEND22');
assert.equal(localMap.get('studioflow_customer_ref'), undefined, 'Early bridge referral stays clear until new Google account confirmed');
assert.equal(oauthCalls[0].options.redirectTo, 'https://salon.test/?app=1');
await act(async () => view.unmount());
clearCustomerReferral();
clearGoogleOAuthIntent();

// 6. Invitation mode signs out existing sender locally before starting Google OAuth
go('https://salon.test/?app=1&customer_ref=SENDER12');
mockSession = { user: { id: 'sender-uid' } };
events.length = 0;
oauthCalls.length = 0;
await act(async () => {
  view = create(<AuthPage compact customerMode initialMode="signup" invitationMode />);
});
await fillCustomerSignup(view.root);
await act(async () => findButton(view.root, 'Continue with Google').props.onClick());
assert.deepEqual(events, ['signOut:local', 'signInWithOAuth']);
assert.equal(oauthCalls[0].options.redirectTo, 'https://salon.test/?app=1&tab=rewards');
assert.equal(readGoogleOAuthIntent()?.referralCode, 'SENDER12');
await act(async () => view.unmount());
clearCustomerReferral();
clearGoogleOAuthIntent();

// 7. Published salon website redirect override (query, subdomain, SalonBookingsDialog)
go('https://my-salon.nexorasalon.online/');
oauthCalls.length = 0;
await act(async () => {
  view = create(<AuthPage compact customerMode returnSlug="my-salon" redirectPathOverride="/" />);
});
await act(async () => findButton(view.root, 'Continue with Google').props.onClick());
assert.equal(oauthCalls[0].options.redirectTo, 'https://my-salon.nexorasalon.online/');
await act(async () => view.unmount());

go('https://salon.test/?site=my-salon');
oauthCalls.length = 0;
await act(async () => {
  view = create(<AuthPage compact customerMode returnSlug="my-salon" redirectPathOverride="/?site=my-salon" />);
});
await act(async () => findButton(view.root, 'Continue with Google').props.onClick());
assert.equal(oauthCalls[0].options.redirectTo, 'https://salon.test/?site=my-salon');
await act(async () => view.unmount());

go('https://salon.test/?site=my-salon');
oauthCalls.length = 0;
await act(async () => {
  view = create(<AuthPage compact customerMode returnSlug="my-salon" />);
});
await act(async () => findButton(view.root, 'Continue with Google').props.onClick());
assert.equal(oauthCalls[0].options.redirectTo, 'https://salon.test/?customer=1&return=my-salon');
await act(async () => view.unmount());

// 8. Query & hash error surfacing + OAuth provider failure recovery
go('https://owner.test/login?error=access_denied');
await act(async () => {
  view = create(<AuthPage />);
});
assert.match(view.root.findByProps({ role: 'status' }).children.join(''), /Google sign-in was cancelled/);
await act(async () => view.unmount());

go('https://owner.test/login?error_description=Provider+disabled');
await act(async () => {
  view = create(<AuthPage />);
});
assert.equal(view.root.findByProps({ role: 'status' }).children.join(''), 'Provider disabled');
await act(async () => view.unmount());

go('https://owner.test/login#error_description=OAuth+hash+failure');
await act(async () => {
  view = create(<AuthPage />);
});
assert.equal(view.root.findByProps({ role: 'status' }).children.join(''), 'OAuth hash failure');
await act(async () => view.unmount());

go('https://owner.test/login');
mockOAuthError = { message: 'Unsupported provider' };
await act(async () => {
  view = create(<AuthPage />);
});
await act(async () => findButton(view.root, 'Continue with Google').props.onClick());
assert.equal(view.root.findByProps({ role: 'status' }).children.join(''), 'Unsupported provider');
assert.equal(findButton(view.root, 'Continue with Google').props.disabled, false);
assert.equal(readOAuthIntent(), null, 'Failed OAuth clears saved intent');
await act(async () => view.unmount());
mockOAuthError = null;

mockOAuthThrows = true;
await act(async () => {
  view = create(<AuthPage />);
});
await act(async () => findButton(view.root, 'Continue with Google').props.onClick());
assert.equal(view.root.findByProps({ role: 'status' }).children.join(''), 'Network unavailable');
assert.equal(findButton(view.root, 'Continue with Google').props.disabled, false);
await act(async () => view.unmount());
mockOAuthThrows = false;

// 9. useAuthSession does not let INITIAL_SESSION(null) mask a getSession OAuth error
const authListeners = new Set<Function>();
(supabase.auth as any).onAuthStateChange = (cb: Function) => {
  authListeners.add(cb);
  return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
};
let resolveGetSession!: (v: any) => void;
(supabase.auth as any).getSession = () => new Promise((r) => { resolveGetSession = r; });
let authState: any;
function SessionHarness() {
  authState = useAuthSession();
  return null;
}
await act(async () => {
  view = create(<SessionHarness />);
  for (const cb of authListeners) cb('INITIAL_SESSION', null);
  await new Promise((r) => setImmediate(r));
});
await act(async () => {
  resolveGetSession({ data: { session: null }, error: { message: 'Unable to exchange external code' } });
  await new Promise((r) => setImmediate(r));
});
assert.equal(authState.ready, true);
assert.equal(authState.error, 'Unable to exchange external code');
await act(async () => view.unmount());

// 10. Security & state helpers (open-redirect block, booking draft restore/clear, error forwarding)
saveOAuthIntent({ path: '//evil.example/phish', flow: 'owner' });
assert.equal(readOAuthIntent(), null, 'Protocol-relative redirect paths are rejected');
assert.equal(hasAuthErrorParams('?error=access_denied', ''), true);
assert.equal(readAuthUrlError('?error=server_error', '#error_description=From+hash'), 'From hash');
assert.equal(
  appendAuthErrorParams('/login', '?error=access_denied&error_description=Cancelled', ''),
  '/login?error=access_denied&error_description=Cancelled',
);
assert.equal(cleanCustomerAppReturnPath('?app=1&site=glow&auth=signup&code=123', 'NEWREF'), '/?app=1&site=glow&customer_ref=NEWREF');
assert.equal(cleanCustomerAppReturnPath('?app=1&site=glow&customer_ref=OLD', ''), '/?app=1&site=glow');

savePendingBookingFlow({
  salonSlug: 'glow-salon',
  ids: ['svc-1', 'svc-2'],
  stylist: 'sty-1',
  date: '2026-11-20',
  slot: { time: '11:00', stylistId: 'sty-1' },
  branchId: 'br-1',
  notes: 'Window seat',
  demo: false,
});
assert.equal(consumePendingBookingFlow(true), null, 'Demo mismatch rejects draft without restoring into demo mode');
savePendingBookingFlow({
  salonSlug: 'glow-salon',
  ids: ['svc-1'],
  stylist: 'any',
  date: '2026-11-20',
  slot: { time: '11:00', stylistId: 'sty-1' },
  demo: false,
});
const restored = consumePendingBookingFlow(false);
assert.equal(restored?.salonSlug, 'glow-salon');
assert.deepEqual(restored?.ids, ['svc-1']);
assert.equal(consumePendingBookingFlow(false), null, 'Draft is consumed once');
savePendingBookingFlow({ salonSlug: 'glow-salon', ids: ['svc-1'], stylist: 'any', date: '2026-11-20', slot: null, demo: false });
clearPendingBookingFlow();
assert.equal(consumePendingBookingFlow(false), null);

console.log('PASS: Google OAuth button visibility, owner /login redirect, template/pricing preservation, customer/invite/site flows, referral validation, error surfacing, session error preservation, and booking draft persistence.');
