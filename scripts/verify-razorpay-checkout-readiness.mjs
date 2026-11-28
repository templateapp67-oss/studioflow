import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = async path => readFile(path, 'utf8');
const [edge, payments, options, bookingModal, customerFlow, sharedTemplates, aurelia, kesh] = await Promise.all([
  source('supabase/functions/studioflow-payments/index.ts'),
  source('src/lib/platformPayments.ts'),
  source('src/components/customer/BookingReceiptActions.tsx'),
  source('src/components/BookingModal.tsx'),
  source('src/components/customer/BookingFlow.tsx'),
  source('src/components/CustomerSalonWebsite.tsx'),
  source('src/components/aurelia/AureliaBeautyWebsite.tsx'),
  source('src/components/keshkraft/KeshKraftWebsite.tsx'),
]);

assert.ok(edge.includes("(env('BOOKING_RAZORPAY_MODE')||'test').toLowerCase()"), 'server normalizes configured Razorpay mode');
for (const reason of ['credentials_missing', 'mode_mismatch', 'invalid_mode']) {
  assert.ok(edge.includes(reason), `server identifies ${reason}`);
}
assert.ok(edge.includes('onlineMessage'), 'server returns a safe, human-readable checkout reason');
assert.ok(edge.includes('webCheckout:{online:webOnline,venue:webVenue,mode:expectedWebMode,onlineReason,onlineMessage}'), 'status endpoint exposes checkout capability');

assert.ok(payments.includes('export type WebCheckoutStatus'), 'frontend types the capability response');
assert.ok(payments.includes("functions.invoke('studioflow-payments', { method: 'GET' })"), 'frontend reads server-side checkout readiness');
assert.ok(payments.includes('Please retry'), 'status failures surface to the user');

assert.ok(options.includes('onlineAvailable?: boolean'), 'payment control accepts readiness');
assert.ok(options.includes('disabled={!onlineAvailable}'), 'Razorpay is disabled when the server says it is unavailable');
assert.ok(options.includes('onlineMessage'), 'unavailable Razorpay has a visible explanation');

const submit = bookingModal.indexOf('const handleFinalSubmitBooking');
const authGate = bookingModal.indexOf('if (customerSignedIn === false)', submit);
const orderCreation = bookingModal.indexOf('onAddAppointment(newApt)', submit);
assert.ok(submit >= 0 && authGate > submit && orderCreation > authGate, 'sign-in is checked before booking/order creation');
assert.ok(bookingModal.includes("onCustomerAccount?.('signin')"), 'public booking can open customer sign-in');
assert.ok(bookingModal.includes('validCheckoutAmount=Number.isFinite(Number(totalPrice))&&Number(totalPrice)>0'), 'website checkout rejects zero, NaN and infinite totals');
assert.ok(bookingModal.includes('Payments are activated after this salon website is published.'), 'draft preview explains the payment gate');
assert.ok(bookingModal.includes("gatewayChecking ? 'Checking Razorpay availability"), 'website checkout has a pending state');
assert.ok(bookingModal.includes('data-testid="booking-customer-signin"'), 'guest has a direct sign-in action');

assert.ok(customerFlow.includes('onlineAvailable={Boolean(checkout?.online)}'), 'the ?app=1 flow uses server checkout readiness');
assert.ok(customerFlow.includes('validCheckoutAmount=Number.isFinite(total)&&total>0'), 'customer app rejects invalid/zero totals');
assert.ok(customerFlow.includes('onlineMessage={checkout?.online ? undefined'), 'customer app displays unavailable reason');
assert.ok(customerFlow.includes("if(!session){setAuth(true);return;}"), 'customer app preserves auth-before-reservation');

const sharedModalCount = (sharedTemplates.match(/<BookingModal\b/g) || []).length;
const sharedAuthBindings = (sharedTemplates.match(/customerSignedIn=\{customerSignedIn\} onCustomerAccount=\{onCustomerAccount\}/g) || []).length;
assert.equal(sharedModalCount, 12, 'all shared template booking modals are present');
assert.equal(sharedAuthBindings, sharedModalCount, 'all shared templates receive customer auth state/action');
assert.ok(aurelia.includes('customerSignedIn={props.customerSignedIn} onCustomerAccount={props.onCustomerAccount}'), 'Aurelia passes customer auth state');
assert.ok(kesh.includes('customerSignedIn={props.customerSignedIn}') && kesh.includes('onCustomerAccount={props.onCustomerAccount}'), 'KeshKraft passes customer auth state');

console.log('PASS Razorpay checkout readiness: server config reasons, UI gating, sign-in preflight, valid amounts, draft previews and 14 booking templates.');
