/**
 * Runtime verification for the unified wiring patch.
 *
 * Covers the four behaviours that have no other offline test:
 *  1. `/sign-in` + `/sign-up` alias helpers (paths, modes, OAuth return path).
 *  2. `ProfileCompletionGate` — the Google sign-up dead-end replacement.
 *  3. Canonical-host 308 redirect rules (www/plain-http → nexorasalon.online).
 *  4. The server-side 25% deposit guard, including parity with the edge
 *     function's `depositPaise` so the Node quote can never disagree with the
 *     amount `register_payment` will accept.
 *
 * Static wiring assertions live in `scripts/verify-unified-wiring.mjs`.
 */
import React from 'react';
import { act, create } from 'react-test-renderer';
import assert from 'node:assert/strict';

import {
  AUTH_DOCUMENT_PATH,
  AUTH_DOCUMENT_PATHS,
  authCallbackPath,
  authModeForPath,
  isAuthEntryPath,
  isPlainOwnerAuthLocation,
} from '../src/lib/authRoutes';
import {
  DepositGuardError,
  assertDepositSatisfied,
  depositPaiseFromRupees,
  depositPaiseFromTotal,
  quoteDeposit,
} from '../server/depositGuard';
import { bookingDepositHandler } from '../server/bookingDeposit';
import { canonicalRedirectTarget, normaliseHost } from '../server/canonicalHost';
import { depositPaise as edgeDepositPaise } from '../supabase/functions/studioflow-payments/payment-security';
import { cleanGoogleSignupValues, missingGoogleSignupFields } from '../src/lib/googleProfileCompletion';
import { ProfileCompletionGate } from '../src/components/ProfileCompletionGate';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// ---------------------------------------------------------------- auth routes
assert.equal(authModeForPath('/sign-in'), 'signin', '/sign-in opens the sign-in mode');
assert.equal(authModeForPath('/sign-up'), 'signup', '/sign-up opens the sign-up mode');
assert.equal(authModeForPath('/sign-up/'), 'signup', 'trailing slash keeps the alias mode');
assert.equal(authModeForPath('/login'), null, '/login keeps its ?auth= driven mode');
assert.equal(authModeForPath('/sign-in/extra'), null, 'nested paths are not auth aliases');
assert.equal(isAuthEntryPath('/login'), true);
assert.equal(isAuthEntryPath('/sign-in/'), true);
assert.equal(isAuthEntryPath('/sign-up'), true);
assert.equal(isAuthEntryPath('/pricing'), false, 'marketing routes stay outside the auth bundle');
assert.equal(isAuthEntryPath('/'), false);
assert.equal(authCallbackPath('/login', ''), '/login', 'a /login entry returns to /login unchanged');
assert.equal(authCallbackPath('/login', '?template=barber'), '/login?template=barber', 'existing /login query survives OAuth');
assert.equal(authCallbackPath('/sign-up', ''), '/login?auth=signup', 'alias sign-up returns to the canonical login document');
assert.equal(authCallbackPath('/sign-in', ''), '/login?auth=signin', 'alias sign-in returns to the canonical login document');
assert.equal(authCallbackPath('/sign-up', '?pricing_plan=grow'), '/login?pricing_plan=grow&auth=signup', 'pricing intent survives the alias');
assert.deepEqual([...AUTH_DOCUMENT_PATHS], ['/login', '/sign-in', '/sign-up'], 'server/Vercel rewrites cover exactly the auth paths');
assert.equal(AUTH_DOCUMENT_PATH, '/login');
assert.equal(isPlainOwnerAuthLocation('/login', ''), true);
assert.equal(isPlainOwnerAuthLocation('/sign-in/', '?auth=signin'), true);
assert.equal(isPlainOwnerAuthLocation('/sign-up', '?code=oauth123&state=abc'), true);
assert.equal(isPlainOwnerAuthLocation('/', ''), false, 'root is not an auth entry route');
for (const query of ['?owner=glow', '?panel=demo', '?module=4', '?create=1', '?customer=1', '?app=1', '?invite=1', '?recovery=1', '?site=glow']) {
  assert.equal(isPlainOwnerAuthLocation('/login', query), false, `${query} keeps its dedicated return target`);
}

// ------------------------------------------------------- profile completion
assert.deepEqual(
  missingGoogleSignupFields('customer', { fullName: '', salonName: '', dateOfBirth: '', whatsappNumber: '' }),
  ['fullName', 'dateOfBirth', 'whatsappNumber'],
  'a customer Google sign-up needs name, date of birth and WhatsApp number',
);
assert.deepEqual(
  missingGoogleSignupFields('owner', { fullName: 'Asha', salonName: '' }),
  ['salonName'],
  'an owner Google sign-up needs the salon name',
);
assert.deepEqual(
  missingGoogleSignupFields('customer', { fullName: 'Asha', dateOfBirth: '2999-01-01', whatsappNumber: '12345' }),
  ['dateOfBirth', 'whatsappNumber'],
  'invalid date of birth and WhatsApp number still block the profile write',
);
assert.deepEqual(
  missingGoogleSignupFields('customer', { fullName: ' Asha ', dateOfBirth: '1994-02-03', whatsappNumber: '+91 98765 43210' }),
  [],
  '+91-formatted numbers and padded names are accepted',
);
assert.deepEqual(cleanGoogleSignupValues({ fullName: '  Asha  ', whatsappNumber: '+91 98765 43210' }), {
  fullName: 'Asha', salonName: '', dateOfBirth: '', whatsappNumber: '9876543210',
});
assert.deepEqual(
  cleanGoogleSignupValues({ whatsappNumber: '0091 98765 43210' }).whatsappNumber,
  '9876543210',
  'the 0091 prefix is stripped like the sign-up form does',
);

const textOf = (node: any): string =>
  typeof node === 'string'
    ? node
    : Array.isArray(node)
      ? node.map(textOf).join('')
      : node && Array.isArray(node.children)
        ? node.children.map(textOf).join('')
        : '';
const formInput = (root: any, match: (props: any) => boolean) => root.findAllByType('input').find((n: any) => match(n.props));
const alertText = (root: any) => {
  const alert = root.findAll((n: any) => n.props?.role === 'alert')[0];
  return alert ? textOf(alert) : '';
};
const submitForm = async (root: any) => {
  const form = root.findByType('form');
  await act(async () => {
    await form.props.onSubmit({ preventDefault() {} });
  });
};

// Customer gate: blocks an empty submit, then saves normalised values.
{
  const submissions: any[] = [];
  let view: any;
  await act(async () => {
    view = create(
      <ProfileCompletionGate role="customer" initial={{ fullName: '' }} onSubmit={(values) => { submissions.push(values); }} />,
    );
  });
  assert.ok(view.root.findAll((n: any) => n.props?.role === 'alert').length === 0, 'no error before the first submit');
  await submitForm(view.root);
  assert.equal(submissions.length, 0, 'an empty profile is not submitted');
  assert.match(alertText(view.root), /full name/i, 'the gate names the first missing field');

  const name = formInput(view.root, (p) => p.autoComplete === 'name');
  const birth = formInput(view.root, (p) => p.type === 'date');
  const whatsapp = formInput(view.root, (p) => p['aria-label'] === 'WhatsApp number');
  assert.ok(name && birth && whatsapp, 'customer gate renders name, date of birth and WhatsApp fields');
  assert.equal(view.root.findAllByType('input').length, 3, 'customer gate asks only for the three mandatory details');
  assert.doesNotMatch(textOf(view.root), /Salon name/, 'customer gate has no salon field');

  await act(async () => {
    name.props.onChange({ target: { value: '  Asha Verma  ' } });
    birth.props.onChange({ target: { value: '1994-02-03' } });
    whatsapp.props.onChange({ target: { value: '+91 98765 43210' } });
  });
  await submitForm(view.root);
  assert.equal(submissions.length, 1, 'a complete profile is submitted once');
  assert.deepEqual(submissions[0], {
    fullName: 'Asha Verma', salonName: '', dateOfBirth: '1994-02-03', whatsappNumber: '9876543210',
  }, 'the gate normalises name, date and WhatsApp number before saving');
}

// Owner gate: salon name only, no customer fields.
{
  const submissions: any[] = [];
  let view: any;
  await act(async () => {
    view = create(<ProfileCompletionGate role="owner" initial={{ fullName: 'Asha' }} onSubmit={(values) => { submissions.push(values); }} />);
  });
  assert.equal(formInput(view.root, (p) => p.type === 'date'), undefined, 'owner gate has no date of birth');
  assert.equal(formInput(view.root, (p) => p['aria-label'] === 'WhatsApp number'), undefined, 'owner gate has no WhatsApp field');
  await submitForm(view.root);
  assert.equal(submissions.length, 0, 'an owner without a salon name is not submitted');
  assert.match(alertText(view.root), /salon name/i);
  const ownerInputs = view.root.findAllByType('input');
  assert.equal(ownerInputs.length, 2, 'owner gate asks only for name and salon name');
  const salon = ownerInputs[1];
  await act(async () => salon.props.onChange({ target: { value: 'Glow Salon' } }));
  await submitForm(view.root);
  assert.equal(submissions.length, 1, 'a complete owner profile is submitted once');
  assert.equal(submissions[0].salonName, 'Glow Salon');
}

// A rejected save keeps the gate open and shows the server message.
{
  let view: any;
  await act(async () => {
    view = create(
      <ProfileCompletionGate
        role="customer"
        initial={{ fullName: 'Asha', dateOfBirth: '1994-02-03', whatsappNumber: '9876543210' }}
        onSubmit={async () => { throw new Error('Your salon profile was not found.'); }}
      />,
    );
  });
  await submitForm(view.root);
  assert.match(alertText(view.root), /salon profile was not found/, 'a failed save surfaces its message in the gate');
}

// The signed-out escape hatch exists only when a handler is supplied.
{
  let view: any;
  const signOut = [];
  await act(async () => {
    view = create(<ProfileCompletionGate role="owner" onSubmit={() => {}} onSignOut={() => { signOut.push(1); }} />);
  });
  const button = view.root.findAllByType('button').find((n: any) => textOf(n).includes('Use a different account'));
  assert.ok(button, 'the gate offers a different-account escape hatch');
  await act(async () => button.props.onClick());
  assert.equal(signOut.length, 1, 'the escape hatch signs out once');
}

// ------------------------------------------------------------- deposit guard
assert.equal(depositPaiseFromTotal(99_900), 24_975, '₹999 requires ₹249.75 in paise');
assert.equal(depositPaiseFromTotal(0), 0);
assert.equal(depositPaiseFromTotal(3), 1);
assert.equal(depositPaiseFromTotal(99_999), 25_000, 'ceil keeps the deposit exact to the paisa');
assert.equal(depositPaiseFromRupees(999.99), 25_000);
assert.equal(depositPaiseFromRupees(100.01), 2_501, 'a fraction of a paisa rounds up, never down');
assert.equal(depositPaiseFromRupees(0), 0);

for (const price of [0, 0.01, 1, 99.99, 249.75, 999, 1000, 1999.5, 24999.99, 123456.78]) {
  assert.equal(
    depositPaiseFromRupees(price),
    edgeDepositPaise(price),
    `server deposit must equal the edge deposit for ₹${price}`,
  );
}
assert.throws(() => depositPaiseFromRupees(-1), DepositGuardError, 'negative prices are rejected');
assert.throws(() => quoteDeposit({}), DepositGuardError, 'a missing total is rejected');

const quote = quoteDeposit({ totalRupees: 999 });
assert.equal(quote.requiredDepositPaise, 24_975);
assert.equal(quote.requiredDepositRupees, 249.75);
assert.equal(quote.balanceRupees, 999);
assert.equal(quote.satisfied, false);
assert.equal(quote.chargeable, true);
assert.equal(quote.depositPercent, 25);

assert.throws(
  () => assertDepositSatisfied(quoteDeposit({ totalPaise: 99_900, paidPaise: 1_000 })),
  (error: any) => error instanceof DepositGuardError && error.code === 'deposit_required',
  'a part payment cannot stand in for the mandatory deposit',
);
assert.doesNotThrow(() => assertDepositSatisfied(quoteDeposit({ totalPaise: 99_900, paidPaise: 24_975 })));
assert.throws(
  () => assertDepositSatisfied(quoteDeposit({ totalPaise: 300, paidPaise: 100 })),
  (error: any) => error instanceof DepositGuardError && error.code === 'deposit_below_minimum',
  'a sub-₹1 deposit is refused like register_payment does',
);

// Handler: HTTP surface used by the Express server and the Vercel function.
const callDeposit = (request: any) => {
  let status = 200;
  let body: any = null;
  const headers: Record<string, string> = {};
  const res: any = {
    status(code: number) { status = code; return res; },
    json(payload: any) { body = payload; return res; },
    setHeader(name: string, value: string) { headers[name] = value; return res; },
  };
  bookingDepositHandler(request, res);
  return { status, body, headers };
};

const flatQuote = callDeposit({ method: 'GET', query: { total: '999' } });
assert.equal(flatQuote.status, 200);
assert.equal(flatQuote.body.chargePaise, 24_975, 'the only chargeable amount is the 25% deposit');
assert.equal(flatQuote.body.chargeRupees, 249.75);
assert.equal(flatQuote.headers['Cache-Control'], 'no-store');

assert.equal(callDeposit({ method: 'GET', query: { totalPaise: '99900' } }).body.requiredDepositPaise, 24_975);
assert.equal(callDeposit({ method: 'POST', body: { total: 999, paid: 250 } }).body.enforced, true);
assert.equal(callDeposit({ method: 'POST', body: { total: 999, paid: 250 } }).status, 200);

const underpaid = callDeposit({ method: 'POST', body: { totalPaise: 99_900, paidPaise: 10_000 } });
assert.equal(underpaid.status, 422, 'an under-paid deposit is rejected');
assert.equal(underpaid.body.code, 'deposit_required');
assert.equal(underpaid.body.requiredDepositPaise, 24_975);
assert.equal(underpaid.body.shortfallPaise, 14_975);

const preview = callDeposit({ method: 'POST', body: { totalPaise: 99_900, paidPaise: 1_000, enforce: false } });
assert.equal(preview.status, 200, 'read-only previews can quote without enforcement');
assert.equal(preview.body.satisfied, false);
assert.equal(preview.body.enforced, false);

assert.equal(callDeposit({ method: 'PUT' }).status, 405);
assert.equal(callDeposit({ method: 'GET', query: {} }).body.code, 'invalid_amount');
assert.equal(callDeposit({ method: 'GET', query: { total: 'abc' } }).body.code, 'invalid_amount');
assert.equal(callDeposit({ method: 'GET', query: { total: '999' } }).body.satisfied, false, 'a quote alone is not a payment');

// ----------------------------------------------------------- canonical host
assert.equal(normaliseHost('WWW.NexoraSalon.Online:443.'), 'www.nexorasalon.online');
assert.equal(normaliseHost('nexorasalon.online:8080'), 'nexorasalon.online');
assert.equal(normaliseHost(''), '');

assert.equal(
  canonicalRedirectTarget({ host: 'www.nexorasalon.online', method: 'GET', path: '/pricing', search: '?plan=grow' }),
  'https://nexorasalon.online/pricing?plan=grow',
  'www 308s to the apex origin and keeps the path and query',
);
assert.equal(
  canonicalRedirectTarget({ host: 'WWW.NexoraSalon.Online:443', method: 'HEAD', path: '/sign-up' }),
  'https://nexorasalon.online/sign-up',
  'host casing, ports and HEAD requests are handled',
);
assert.equal(
  canonicalRedirectTarget({ host: 'nexorasalon.online', forwardedProto: 'http', method: 'GET', path: '/login' }),
  'https://nexorasalon.online/login',
  'plain http upgrades to https',
);
assert.equal(
  canonicalRedirectTarget({ host: 'nexorasalon.online', forwardedProto: 'https', method: 'GET', path: '/' }),
  null,
  'the canonical origin serves normally',
);
for (const host of ['studioflow.vercel.app', 'abc123.e2b.app', 'localhost:3000', '127.0.0.1', '10.0.0.4']) {
  assert.equal(
    canonicalRedirectTarget({ host, method: 'GET', path: '/pricing' }),
    null,
    `preview host ${host} must never be redirected to production`,
  );
}
assert.equal(
  canonicalRedirectTarget({ host: 'www.nexorasalon.online', method: 'GET', path: '/api/health' }),
  null,
  'API calls are never redirected',
);
assert.equal(
  canonicalRedirectTarget({ host: 'www.nexorasalon.online', method: 'POST', path: '/api/booking-deposit' }),
  null,
  'writes are never redirected',
);
assert.equal(
  canonicalRedirectTarget({ host: 'www.nexorasalon.online', method: 'GET', path: '//pricing//grow' }),
  'https://nexorasalon.online/pricing/grow',
  'duplicate slashes are collapsed before redirecting',
);
assert.equal(
  canonicalRedirectTarget({ host: 'www.nexorasalon.online', method: 'GET', path: '/' }, { canonicalOrigin: 'https://staging.example.com' }),
  'https://staging.example.com/',
  'the canonical origin can be pointed at another deployment',
);

process.env.NEXORA_CANONICAL_REDIRECT_HOSTS = 'alias.nexorasalon.test';
assert.equal(
  canonicalRedirectTarget({ host: 'alias.nexorasalon.test', method: 'GET', path: '/salon-os' }),
  'https://nexorasalon.online/salon-os',
  'extra aliases can be declared through the environment',
);
delete process.env.NEXORA_CANONICAL_REDIRECT_HOSTS;
process.env.NEXORA_CANONICAL_REDIRECTS = 'off';
assert.equal(canonicalRedirectTarget({ host: 'www.nexorasalon.online', method: 'GET', path: '/' }), null, 'redirects can be disabled');
delete process.env.NEXORA_CANONICAL_REDIRECTS;

console.log('PASS: /sign-in and /sign-up aliases, Google profile completion gate, canonical 308 redirects and the server-side 25% deposit guard all behave as specified.');
