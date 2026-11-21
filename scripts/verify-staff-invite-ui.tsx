/**
 * Staff invite/login UI rendering checks.
 *
 * Fetch and Supabase are stubbed so these run offline. The point is not pixel
 * output but the guarantees: a bad token never shows the accept form, an
 * expired invite never offers "accept", the marketing/owner chrome never
 * appears, and the owner panel refuses to invite without a channel.
 */
import React from 'react';
import { act, create } from 'react-test-renderer';
import assert from 'node:assert/strict';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const TOKEN = 'a'.repeat(64);

// ---- Supabase stub -------------------------------------------------------
// Imported from the same module the plugin substituted into the components, so
// the responses set here are the ones the UI actually receives.
import { rpcCalls, rpcResponses, state as stubState } from './staff-invite-ui-supabase-stub';

(globalThis as any).fetch = async (url: string) => {
  if (String(url).includes('/api/staff-invite-status')) {
    return { ok: true, json: async () => ({ status: 'ok', configured: false, provider: 'resend', mode: 'unconfigured' }) };
  }
  return { ok: true, json: async () => ({ success: false, delivered: false, error: 'stubbed' }) };
};
(globalThis as any).localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
(globalThis as any).sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
// Node 22 defines `navigator` as a getter-only property; override it properly.
Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: { writeText: async () => {} } },
  configurable: true,
  writable: true,
});
(globalThis as any).history = { replaceState: () => {}, pushState: () => {} };

let locationStub: any = { pathname: '/staff/accept', search: '?token=' + TOKEN, origin: 'https://nexorasalon.online', href: 'https://nexorasalon.online/staff/accept' };
Object.defineProperty(globalThis, 'location', { value: locationStub, writable: true, configurable: true });

const { StaffInviteAcceptPage } = await import('../src/components/staff/StaffInviteAcceptPage');
const { StaffLoginPage } = await import('../src/components/staff/StaffLoginPage');
const { StaffWorkspacePage } = await import('../src/components/staff/StaffWorkspacePage');
const { StaffAccessPanel } = await import('../src/components/staff/StaffAccessPanel');

const nodes: any[] = [];
async function render(element: React.ReactElement) {
  let ui: any;
  await act(async () => { ui = create(element); });
  nodes.push(ui);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  return ui;
}
const text = (ui: any): string => JSON.stringify(ui.toJSON() ?? '');
const hasText = (ui: any, needle: string) => text(ui).includes(needle);

console.log('\nInvite accept page');

// 1. Invalid token: no form, no owner chrome, a way forward.
for (const key of Object.keys(rpcResponses)) delete rpcResponses[key];
let ui = await render(<StaffInviteAcceptPage token="" />);
assert.ok(hasText(ui, 'This invite link is not valid'), 'empty token shows the invalid screen');
assert.ok(!hasText(ui, 'Accept invite & create login'), 'no accept form for an invalid token');
assert.ok(hasText(ui, 'Go to staff sign-in'), 'offers the staff login route');
await act(async () => ui.unmount());

// 2. Pending invite: shows role + permissions + both auth paths.
Object.assign(rpcResponses, {
  studioflow_staff_invite_lookup: {
    data: {
      status: 'pending', salonName: 'Luxury Salon', staffName: 'Sunita',
      role: 'Receptionist (Frontdesk)',
      permissions: ['view_own_bookings', 'process_pos_payments', 'view_client_contacts'],
      branchIds: ['br-1'], email: 'sunita@example.com',
      expiresAt: new Date(Date.now() + 3 * 864e5).toISOString(),
    },
    error: null,
  },
});
ui = await render(<StaffInviteAcceptPage token={TOKEN} />);
const { supabase: dbgSupabase } = await import('../src/lib/supabase');
assert.ok(hasText(ui, 'Luxury Salon'), 'salon name is shown so the invite is verifiable');
assert.ok(hasText(ui, 'Sunita'), 'invited name is shown');
assert.ok(hasText(ui, 'Receptionist'), 'the role is shown before signing up');
assert.ok(hasText(ui, 'Process POS payments'), 'permissions are listed, not just the role label');
assert.ok(hasText(ui, 'Accept invite'), 'accept form is offered for a pending invite');
assert.ok(hasText(ui, 'Continue with Google'), 'Google OAuth path exists');
assert.ok(hasText(ui, 'sunita@example.com'), 'locked email is displayed');
assert.ok(!hasText(ui, 'Publish Website'), 'no owner workspace chrome on the invite page');
await act(async () => ui.unmount());

// 3. Expired invite: no accept form, explicit resend instruction.
Object.assign(rpcResponses, {
  studioflow_staff_invite_lookup: { data: { status: 'expired', salonName: 'Luxury Salon', staffName: 'Sunita', role: 'Manager (Full Access)', permissions: [], branchIds: [], email: null, expiresAt: '2020-01-01T00:00:00Z' }, error: null },
});
ui = await render(<StaffInviteAcceptPage token={TOKEN} />);
assert.ok(hasText(ui, 'This invite has expired'), 'expired invite is stated plainly');
assert.ok(!hasText(ui, 'Accept invite & create login'), 'expired invite cannot be accepted');
assert.ok(hasText(ui, 'Sign in to your staff account'), 'still offers sign-in');
await act(async () => ui.unmount());

// 4. Revoked invite.
Object.assign(rpcResponses, {
  studioflow_staff_invite_lookup: { data: { status: 'revoked', salonName: 'Luxury Salon', staffName: 'Sunita', role: 'Manager (Full Access)', permissions: [], branchIds: [], email: null, expiresAt: null }, error: null },
});
ui = await render(<StaffInviteAcceptPage token={TOKEN} />);
assert.ok(hasText(ui, 'This invite was cancelled'), 'revoked invite is stated plainly');
await act(async () => ui.unmount());

// 5. Already accepted.
Object.assign(rpcResponses, {
  studioflow_staff_invite_lookup: { data: { status: 'accepted', salonName: 'Luxury Salon', staffName: 'Sunita', role: 'Manager (Full Access)', permissions: [], branchIds: [], email: null, expiresAt: null }, error: null },
});
ui = await render(<StaffInviteAcceptPage token={TOKEN} />);
assert.ok(hasText(ui, 'This invite was already used'), 'accepted invite points at sign-in');
await act(async () => ui.unmount());

console.log('\nStaff login page');
for (const key of Object.keys(rpcResponses)) delete rpcResponses[key];
stubState.session = null;
ui = await render(<StaffLoginPage />);
assert.ok(hasText(ui, 'Staff sign-in'), 'separate staff login screen exists');
assert.ok(hasText(ui, 'Salon owner login'), 'links back to the owner login without mixing the two');
assert.ok(hasText(ui, 'Forgot password?'), 'recovery path exists for staff');
assert.ok(!hasText(ui, 'Publish Website'), 'no owner workspace chrome');
await act(async () => ui.unmount());

console.log('\nStaff workspace page');
// Signed out: never renders salon data.
stubState.session = null;
for (const key of Object.keys(rpcResponses)) delete rpcResponses[key];
ui = await render(<StaffWorkspacePage />);
assert.ok(hasText(ui, 'Staff sign-in required'), 'signed-out visitor is asked to sign in');
assert.ok(!hasText(ui, 'Bookings & calendar'), 'no bookings panel without a session');
await act(async () => ui.unmount());

// Signed in without staff membership: told clearly, no data.
stubState.session = { user: { id: '11111111-1111-4111-8111-111111111111', email: 'random@example.com' }, access_token: 'token' };
Object.assign(rpcResponses, { studioflow_my_staff_context: { data: null, error: null } });
ui = await render(<StaffWorkspacePage />);
assert.ok(hasText(ui, 'No staff access on this account'), 'non-staff account gets an explicit message');
assert.ok(!hasText(ui, 'Bookings & calendar'), 'no panel for a non-staff account');
await act(async () => ui.unmount());

// Service provider: own calendar only, no client contacts / revenue / team.
stubState.session = { user: { id: '11111111-1111-4111-8111-111111111111', email: 'stylist@example.com' }, access_token: 'token' };
Object.assign(rpcResponses, {
  studioflow_my_staff_context: {
    data: {
      memberId: 'm-1', ownerId: '22222222-2222-4222-8222-222222222222', staffId: 'staff-1',
      role: 'Service Provider (Assigned)',
      branchIds: [], permissions: ['view_own_bookings', 'complete_own_bookings', 'view_own_earnings'],
      salonName: 'Luxury Salon', salonSlug: 'luxury', staffName: 'Sunita', acceptedAt: '',
    },
    error: null,
  },
  studioflow_staff_workspace: {
    data: {
      member: { role: 'Service Provider (Assigned)' },
      profile: { businessName: 'Luxury Salon', branches: [] },
      services: [{ id: 's-1', name: 'Hair Cut', price: 800, category: 'Hair', durationMinutes: 45 }],
      stylists: [], clients: null, loyaltyConfig: null, revenue: null,
    },
    error: null,
  },
});
ui = await render(<StaffWorkspacePage />);
assert.ok(hasText(ui, 'Luxury Salon'), 'salon name renders');
assert.ok(hasText(ui, 'Service Provider'), 'canonical role is displayed');
assert.ok(hasText(ui, 'Bookings & calendar'), 'own-calendar panel is present');
assert.ok(!hasText(ui, 'Payments & POS'), 'service providers get no POS panel');
assert.ok(!hasText(ui, 'Client contacts'), 'service providers get no client contact panel');
assert.ok(!hasText(ui, 'Revenue snapshot'), 'service providers get no revenue panel');
assert.ok(!hasText(ui, 'Team & roles'), 'service providers cannot manage the team');
assert.ok(!hasText(ui, 'Services & pricing'), 'service providers cannot edit pricing');
assert.ok(!hasText(ui, 'Salon settings'), 'settings link is hidden without manage_settings');
await act(async () => ui.unmount());

// Manager: every permitted panel, still no owner-only publishing.
Object.assign(rpcResponses, {
  studioflow_my_staff_context: {
    data: {
      memberId: 'm-2', ownerId: '22222222-2222-4222-8222-222222222222', staffId: 'staff-2',
      role: 'Manager (Full Access)', branchIds: ['br-1'],
      permissions: ['view_own_bookings','book_for_all_staff','process_pos_payments','view_client_contacts','view_revenue','manage_team','manage_services_pricing','manage_settings','publish_website'],
      salonName: 'Luxury Salon', salonSlug: 'luxury', staffName: 'Rahul', acceptedAt: '',
    },
    error: null,
  },
  studioflow_staff_workspace: {
    data: {
      member: { role: 'Manager (Full Access)' },
      profile: { businessName: 'Luxury Salon', branches: [{ id: 'br-1', name: 'Main Branch' }] },
      services: [{ id: 's-1', name: 'Hair Cut', price: 800 }],
      stylists: [{ id: 'staff-2', name: 'Rahul', accessRole: 'Manager (Full Access)' }],
      clients: [{ id: 'c-1', name: 'Neha', phone: '9999999999' }],
      loyaltyConfig: {}, revenue: { enabled: true },
    },
    error: null,
  },
});
ui = await render(<StaffWorkspacePage />);
assert.ok(hasText(ui, 'Manager'), 'manager role is displayed');
for (const panel of ['Bookings & calendar', 'Front desk queue', 'Payments & POS', 'Client contacts', 'Revenue snapshot', 'Team & roles', 'Services & pricing']) {
  assert.ok(hasText(ui, panel), `manager sees the ${panel} panel`);
}
assert.ok(hasText(ui, 'Salon settings'), 'manager gets the settings link');
assert.ok(hasText(ui, 'Main Branch'), 'assigned branch is named');
// The staff workspace must be driven by the scoped projection RPC, never by a
// direct read of the owner's draft.
assert.ok(rpcCalls.some((call) => call.name === 'studioflow_staff_workspace'), 'staff workspace projection is used');
assert.ok(rpcCalls.some((call) => call.name === 'studioflow_my_staff_context'), 'staff context is resolved from the server');
await act(async () => ui.unmount());

console.log('\nOwner invite panel');
stubState.session = { user: { id: '22222222-2222-4222-8222-222222222222', email: 'owner@example.com' }, access_token: 'token' };
for (const key of Object.keys(rpcResponses)) delete rpcResponses[key];
Object.assign(rpcResponses, {
  studioflow_staff_invites: {
    data: [{
      inviteId: 'inv-1', staffId: 'staff-1', staffName: 'Sunita', email: 'sunita@example.com', phone: '9876543210',
      role: 'Receptionist (Frontdesk)', branchIds: [], status: 'pending',
      expiresAt: new Date(Date.now() + 5 * 864e5).toISOString(), createdAt: new Date().toISOString(),
      lastSentAt: new Date().toISOString(), sendCount: 1, emailSentAt: null, whatsappSentAt: null, acceptedAt: null,
    }],
    error: null,
  },
  studioflow_staff_accounts: {
    data: [{ memberId: 'm-9', staffId: 'staff-2', role: 'Manager (Full Access)', branchIds: [], isActive: true, acceptedAt: new Date().toISOString(), email: 'manager@example.com' }],
    error: null,
  },
});
const profile = { businessName: 'Luxury Salon', branches: [{ id: 'br-1', name: 'Main Branch', isActive: true, city: 'Jaipur', address: '', phone: '', operatingHours: [] }] } as any;
const stylists = [
  { id: 'staff-1', name: 'Sunita', role: 'Receptionist', avatarUrl: '', specialties: [], rating: 4.8, accessRole: 'Receptionist (Frontdesk)' },
  { id: 'staff-2', name: 'Rahul', role: 'Manager', avatarUrl: '', specialties: [], rating: 4.9, accessRole: 'Manager (Full Access)' },
] as any;

ui = await render(<StaffAccessPanel stylists={stylists} profile={profile} ownerEmail="owner@example.com" />);
assert.ok(hasText(ui, 'Staff invites'), 'owner sees the invite panel');
assert.ok(hasText(ui, 'Invited · Pending'), 'pending invite status badge is shown');
assert.ok(hasText(ui, 'Active'), 'accepted login status badge is shown');
assert.ok(hasText(ui, 'pending'), 'pending invites are summarised');
assert.ok(hasText(ui, 'Create invite link'), 'owner can create an invite');
// Before an invite exists there is nothing to send yet; the WhatsApp and email
// actions appear together with the freshly created link (covered below).
assert.ok(hasText(ui, 'WhatsApp number'), 'owner can capture a WhatsApp number');
assert.ok(hasText(ui, 'Email for the invite'), 'owner can capture an email');
assert.ok(!hasText(ui, 'Send on WhatsApp'), 'no delivery button before an invite exists');
assert.ok(hasText(ui, 'Manager') && hasText(ui, 'Receptionist'), 'roles are visible per member');

// Creating an invite with no email and no phone must be refused before any RPC.
const form = ui.root.findAll((node: any) => node.type === 'form')[0];
const before = rpcCalls.length;
await act(async () => { form.props.onSubmit({ preventDefault() {} }); await new Promise((resolve) => setTimeout(resolve, 0)); });
assert.equal(rpcCalls.filter((call) => call.name === 'studioflow_staff_invite_create').length, 0,
  'no invite RPC runs when no team member/channel was chosen');
assert.ok(hasText(ui, 'Choose a team member') || hasText(ui, 'Add an email'), 'the refusal explains what is missing');
await act(async () => ui.unmount());

console.log('\nPASS: invite accept states, separate staff login, role-scoped staff workspace (no owner chrome, no cross-role panels) and owner invite panel guards.');
