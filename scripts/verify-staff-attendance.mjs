import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const migration = read('supabase/migrations/20261119150000_staff_attendance_biometric.sql');
const panel = read('src/components/StaffAttendancePanel.tsx');
const edge = read('supabase/functions/staff-attendance-biometric/index.ts');
const owner = read('src/components/OwnerWorkspace.tsx');
const navigation = read('src/lib/ownerNavigation.ts');
const config = read('supabase/config.toml');

const tables = [
  'salon_staff_attendance_settings',
  'salon_staff_attendance_profiles',
  'salon_staff_attendance_shifts',
  'salon_staff_attendance_records',
  'salon_staff_attendance_events',
  'salon_staff_leave_requests',
  'salon_staff_attendance_biometrics',
  'salon_staff_attendance_webauthn_challenges',
  'salon_staff_attendance_devices',
  'salon_staff_attendance_device_events',
];
for (const table of tables) {
  assert.ok(migration.includes('create table if not exists public.' + table), 'Missing table: ' + table);
}
const rlsStart = migration.indexOf('-- Owner-facing operational tables are protected by strict salon ownership RLS.');
const rlsEnd = migration.indexOf('-- One audited punch engine', rlsStart);
const rlsBlock = migration.slice(rlsStart, rlsEnd);
assert.ok(rlsBlock.includes("execute format('alter table public.%I enable row level security', t)"));
for (const table of [
  'salon_staff_attendance_settings',
  'salon_staff_attendance_profiles',
  'salon_staff_attendance_shifts',
  'salon_staff_attendance_records',
  'salon_staff_attendance_events',
  'salon_staff_leave_requests',
  'salon_staff_attendance_biometrics',
  'salon_staff_attendance_webauthn_challenges',
  'salon_staff_attendance_devices',
  'salon_staff_attendance_device_events',
]) assert.ok(rlsBlock.includes("'" + table + "'"), 'Missing RLS table registration: ' + table);

const sensitiveStart = migration.indexOf('-- Sensitive service-managed tables are inaccessible to browser roles.');
const sensitiveEnd = migration.indexOf('grant select, insert, update, delete on public.salon_staff_attendance_settings', sensitiveStart);
const sensitiveBlock = migration.slice(sensitiveStart, sensitiveEnd);
assert.ok(sensitiveBlock.includes("execute format('revoke all on table public.%I from public, anon, authenticated', t)"));
assert.ok(sensitiveBlock.includes("execute format('grant all on table public.%I to service_role', t)"));
for (const table of [
  'salon_staff_attendance_biometrics',
  'salon_staff_attendance_webauthn_challenges',
  'salon_staff_attendance_devices',
  'salon_staff_attendance_device_events',
]) assert.ok(sensitiveBlock.includes("'" + table + "'"), 'Missing service-only table registration: ' + table);
assert.ok(migration.includes('salon_staff_attendance_sync_roster'));
assert.ok(migration.includes('jsonb_array_length(p_roster) > 200'));
assert.ok(migration.includes('salon_staff_attendance_service_punch'));
assert.ok(migration.includes('salon_staff_attendance_service_mark_status'));
assert.ok(migration.includes('grant execute on function public.salon_staff_attendance_service_punch'));
assert.ok(migration.includes('to service_role'));
assert.ok(migration.includes('salon_staff_attendance_apply_leave_trigger'));
assert.ok(migration.includes('other_leave.id <> new.id'), 'Overlapping approved leave must be preserved.');
assert.ok(migration.includes('salon_staff_attendance_events_device_fk'));
assert.ok(migration.includes('salon_staff_attendance_device_event_receipt_fk');
assert.ok(migration.includes("new.status = 'approved'"));
assert.ok(migration.includes("if v_shift_span <= interval '0' then"));

assert.ok(edge.includes('@simplewebauthn/server@14.1.0'));
assert.ok(edge.includes('generateRegistrationOptions'));
assert.ok(edge.includes('verifyRegistrationResponse'));
assert.ok(edge.includes('generateAuthenticationOptions'));
assert.ok(edge.includes('verifyAuthenticationResponse'));
assert.equal((edge.match(/requireUserVerification: true/g) || []).length, 2);
assert.ok(edge.includes("authenticatorAttachment: 'platform'"));
assert.ok(edge.includes('await admin.auth.getUser(token)'));
assert.ok(edge.includes('devicePunch'));
assert.ok(edge.includes('api_key_hash'));
assert.ok(edge.includes('salon_staff_attendance_service_punch'));

assert.ok(panel.includes("supabase.rpc('salon_staff_attendance_sync_roster'"));
assert.ok(panel.includes("supabase.functions.invoke('staff-attendance-biometric'"));
assert.ok(panel.includes('navigator.credentials.create'));
assert.ok(panel.includes('navigator.credentials.get'));
assert.ok(panel.includes('A shared kiosk with one common device PIN/biometric profile cannot prove which employee is present.'));
assert.ok(panel.includes('todayRecords'));
assert.ok(panel.includes('registerVerify'));
assert.ok(panel.includes('authenticationVerify'));
assert.ok(panel.includes('break_start'));
assert.ok(panel.includes('break_end'));
assert.ok(panel.includes('salon_staff_attendance_shifts'));
assert.ok(panel.includes('salon_staff_leave_requests'));
assert.ok(panel.includes('Export CSV'));
assert.doesNotMatch(panel, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);

assert.ok(owner.includes("import { StaffAttendancePanel } from './StaffAttendancePanel';"));
assert.ok(owner.includes('<StaffAttendancePanel profile={profile} stylists={stylists}/>'));
assert.ok(navigation.includes("{id:35,label:'Attendance & Biometric',icon:'fingerprint'}"));
assert.ok(config.includes('[functions.staff-attendance-biometric]'));
assert.ok(config.includes('verify_jwt = false'));

console.log('PASS staff attendance + biometric static contract (shared workspace, RLS, WebAuthn, device API and attendance actions).');
console.log('Note: static checks do not replace TypeScript, Postgres migration, WebAuthn device, or browser E2E verification.');
