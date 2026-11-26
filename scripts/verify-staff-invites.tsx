/**
 * Staff invite + separate staff login checks (pure logic; no network).
 * The SQL half lives in verify-sql-migrations.mjs, which replays the migration.
 */
import assert from 'node:assert/strict';
import {
  isValidInviteToken,
  safeStaffRedirect,
  staffAcceptUrl,
  staffInviteMessage,
  staffInviteWhatsAppUrl,
  STAFF_ACCEPT_PATH,
  STAFF_LOGIN_PATH,
  STAFF_WORKSPACE_PATH,
} from '../src/lib/staffInvites';
import { inviteTokenFrom, isStaffAcceptRoute, isStaffRoute, staffRouteFor } from '../src/lib/staffRoutes';
import { buildInviteUrl, safeInviteOrigin } from '../server/staffInviteEmail';

/* 1. Token handling ------------------------------------------------- */
console.log('\nStaff invite tokens');
const token = 'a'.repeat(32) + 'b'.repeat(32);
assert.equal(isValidInviteToken(token), true, '64 hex chars is a valid token');
assert.equal(isValidInviteToken('abc'), false, 'short tokens are rejected');
assert.equal(isValidInviteToken(42), false, 'non-strings are rejected');
assert.equal(isValidInviteToken(token.toUpperCase()), true, 'uppercase hex is accepted');
assert.equal(isValidInviteToken('z'.repeat(64)), false, 'non-hex is rejected');

const inviteUrl = staffAcceptUrl(token, 'https://nexorasalon.online');
assert.equal(inviteUrl, `https://nexorasalon.online/staff/accept?token=${token}`, 'accept URL shape is stable');
assert.equal(staffAcceptUrl(token, 'https://nexorasalon.online/'), inviteUrl, 'trailing slash does not double up');
assert.ok(!staffAcceptUrl(token, 'https://x.test').includes('//staff'), 'no protocol-relative path');

/* 2. Staff routes --------------------------------------------------- */
console.log('\nStaff routes');
assert.equal(staffRouteFor('/staff'), STAFF_WORKSPACE_PATH);
assert.equal(staffRouteFor('/staff/'), STAFF_WORKSPACE_PATH);
assert.equal(staffRouteFor('/staff/accept'), STAFF_ACCEPT_PATH);
assert.equal(staffRouteFor('/staff/login'), STAFF_LOGIN_PATH);
assert.equal(staffRouteFor('/staff/accept/'), STAFF_ACCEPT_PATH);
assert.equal(staffRouteFor('/staffing'), null, '/staffing is not a staff route');
assert.equal(staffRouteFor('/staff/anything'), null, 'unknown staff sub-paths fall through');
assert.equal(staffRouteFor('/'), null);
assert.equal(isStaffRoute('/staff/login'), true);
assert.equal(isStaffAcceptRoute('/staff/accept'), true);
assert.equal(isStaffAcceptRoute('/staff/login'), false);
assert.equal(inviteTokenFrom('?token=' + token), token);
assert.equal(inviteTokenFrom('?token=bad'), '', 'a malformed token never reaches the RPC');
assert.equal(inviteTokenFrom(''), '');
assert.equal(inviteTokenFrom('?token=' + token + '&ref=ABC'), token, 'other params are ignored');

/* 3. Redirect hardening -------------------------------------------- */
console.log('\nRedirect hardening');
assert.equal(safeStaffRedirect('/staff?welcome=1'), '/staff?welcome=1');
assert.equal(safeStaffRedirect('/staff'), '/staff');
assert.equal(safeStaffRedirect('https://evil.test'), '/staff', 'absolute URLs are refused');
assert.equal(safeStaffRedirect('//evil.test'), '/staff', 'protocol-relative URLs are refused');
assert.equal(safeStaffRedirect('/\\evil.test'), '/staff', 'backslash tricks are refused');
assert.equal(safeStaffRedirect('/login'), '/staff', 'non-staff destinations are refused');
assert.equal(safeStaffRedirect(undefined), '/staff');
assert.equal(safeStaffRedirect({}), '/staff');

/* 4. WhatsApp fallback message ------------------------------------- */
console.log('\nWhatsApp invite copy');
const message = staffInviteMessage({
  salonName: 'Luxury Salon',
  staffName: 'Sunita',
  role: 'Receptionist (Frontdesk)',
  inviteUrl,
  expiresOn: '25 Nov 2026, 6:30 pm',
});
assert.ok(message.includes('Hi Sunita,'), 'greets the staff member by name');
assert.ok(message.includes('Luxury Salon'), 'names the salon');
assert.ok(message.includes('Receptionist'), 'names the role');
assert.ok(message.includes(inviteUrl), 'carries the invite link');
assert.ok(message.includes('expires on'), 'states the expiry');
assert.ok(message.split('\n').length < 15, 'message stays short enough for WhatsApp');
assert.ok(!message.toLowerCase().includes('undefined'), 'no undefined leaks into the copy');
assert.ok(!message.toLowerCase().includes('null'), 'no null leaks into the copy');

// Unknown roles must degrade to the least-privileged wording, never Manager.
const unknownRoleMessage = staffInviteMessage({ salonName: 'S', role: 'superadmin', inviteUrl, expiresOn: 'soon' });
assert.ok(!unknownRoleMessage.includes('Manager'), 'unknown role never advertises manager access');
assert.ok(unknownRoleMessage.includes('Service Provider'), 'unknown role advertises the safe default');

const waUrl = staffInviteWhatsAppUrl({
  phone: '98765 43210',
  salonName: 'Luxury Salon',
  staffName: 'Sunita',
  role: 'Manager (Full Access)',
  inviteUrl,
  expiresOn: '25 Nov 2026',
});
assert.ok(waUrl.startsWith('https://wa.me/919876543210?text='), `wa.me link uses the Indian number: ${waUrl.slice(0, 46)}`);
assert.equal(
  staffInviteWhatsAppUrl({ phone: '', salonName: 'S', role: 'Manager (Full Access)', inviteUrl, expiresOn: 'soon' }),
  '',
  'no number means no WhatsApp link instead of a broken one',
);
// The link must be encoded, not pasted raw into the URL.
assert.ok(!waUrl.includes(token + '\n'), 'the token is URL-encoded inside the message');

/* 5. Server-side email handler URL/origin guarding ------------------ */
console.log('\nInvite email origin guarding');
assert.equal(safeInviteOrigin('https://nexorasalon.online'), 'https://nexorasalon.online');
assert.equal(safeInviteOrigin('https://nexorasalon.online/'), 'https://nexorasalon.online');
assert.equal(safeInviteOrigin('javascript:alert(1)'), null, 'non-http origins rejected');
assert.equal(safeInviteOrigin('https://zilwgiuiygqqardzutxi.supabase.co'), null, 'supabase origins rejected');
assert.equal(safeInviteOrigin(''), null, 'empty origin rejected');
assert.equal(safeInviteOrigin('not a url'), null, 'garbage origin rejected');
assert.equal(safeInviteOrigin('ftp://files.test'), null, 'ftp origins rejected');
assert.equal(buildInviteUrl('https://nexorasalon.online', token), inviteUrl);
assert.equal(buildInviteUrl('https://nexorasalon.online/', token), inviteUrl);

console.log('\nPASS: staff invite tokens, staff routes, redirect hardening, WhatsApp fallback copy and invite-email origin guarding.');
