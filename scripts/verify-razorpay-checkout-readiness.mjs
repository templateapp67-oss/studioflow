import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');
const [edge, payments, options, modal, customerFlow, templates, aurelia, kesh] = await Promise.all([
  read('supabase/functions/studioflow-payments/index.ts'),
  read('src/lib/platformPayments.ts'),
  read('src/components/customer/BookingReceiptActions.tsx'),
  read('src/components/BookingModal.tsx'),
  read('src/components/customer/BookingFlow.tsx'),
  read('src/components/CustomerSalonWebsite.tsx'),
  read('src/components/aurelia/AureliaBeautyWebsite.tsx'),
  read('src/components/keshkraft/KeshKraftWebsite.tsx'),
]);

assert.ok(edge.includes("env('BOOKING_RAZORPAY_MODE')||creds.mode"), 'preserve key-derived live/test mode when no override exists');
for (const reason of ['credentials_missing', 'mode_mismatch', 'invalid_mode']) assert.ok(edge.includes(reason), 'safe server-side readiness reason exists');
assert.ok(edge.includes('onlineMessage'), 'server exposes a human-readable readiness message');
assert.ok(edge.includes('webCheckout:{online:webOnline,venue:webVenue,mode:expectedWebMode,onlineReason,onlineMessage}'), 'status GET reports the online capability');

assert.ok(payments.includes('export type WebCheckoutStatus'), 'frontend status response is typed');
assert.ok(payments.includes("functions.invoke('studioflow-payments', { method: 'GET' })'), 'checkout reads the server-side capability endpoint');

assert.ok(options.includes('onlineAvailable?: boolean'), 'payment radio supports server readiness');
assert.ok(options.includes('disabled={!onlineAvailable}'), 'unavailable Razorpay is visibly disabled');
assert.ok(options.includes('onlineMessage'), 'payment radio exposes the reason');

const submit = modal.indexOf('const handleFinalSubmitBooking');
const authGate = modal.indexOf('if (customerSignedIn === false)', submit);
const createBooking = modal.indexOf('onAddAppointment(newApt)', submit);
assert.ok(submit >= 0 && authGate > submit && createBooking > authGate, 'guest authentication is checked before creating a booking');
assert.ok(modal.includes("onCustomerAccount?.('signin')"), 'website payment step can open customer sign-in');
assert.ok(modal.includes('validCheckoutAmount=Number.isFinite(Number(totalPrice))&&Number(totalPrice)>0'), 'website checkout rejects non-positive or non-finite totals');
assert.ok(modal.includes('Payments are activated after this salon website is published.'), 'draft preview explains its payment gate');
assert.ok(modal.includes('gatewayChecking'), 'website checkout has a loading state');

assert.ok(customerFlow.includes('onlineAvailable={Boolean(checkout?.online)}'), 'customer app uses the same Razorpay readiness state');
assert.ok(customerFlow.includes('validCheckoutAmount=Number.isFinite(total)&&total>0'), 'customer app validates the payable amount');
assert.ok(customerFlow.includes('onlineMessage={checkout?.online ? undefined'), 'customer app explains unavailable Razorpay');
assert.ok(customerFlow.includes('if(!session){setAuth(true);return;}'), 'customer app keeps authentication ahead of reservation');

const sharedCalls = (templates.match(/<BookingModal\b/g) || []).length;
const authCalls = (templates.match(/customerSignedIn=\{customerSignedIn\} onCustomerAccount=\{onCustomerAccount\}/g) || []).length;
assert.equal(sharedCalls, 12, 'all shared template BookingModal call sites remain present');
assert.equal(authCalls, sharedCalls, 'all shared template booking modals receive auth state');
assert.ok(aurelia.includes('customerSignedIn={props.customerSignedIn} onCustomerAccount={props.onCustomerAccount}'), 'Aurelia receives customer auth state');
assert.ok(kesh.includes('customerSignedIn={props.customerSignedIn}') && kesh.includes('onCustomerAccount={props.onCustomerAccount}'), 'KeshKraft receives customer auth state');

console.log('PASS Razorpay checkout readiness, auth preflight, valid INR amount gates and template wiring.');
