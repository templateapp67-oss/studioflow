import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20261122043650_staff_crm_branch_scope.sql';
const migration = readFileSync(migrationPath, 'utf8');
const lower = migration.toLowerCase();

const requiredFunctions = [
  'crm_effective_owner',
  'crm_customer_in_branch_scope',
  'owner_contacts',
  'crm_dashboard',
  'crm_add_activity',
  'crm_create_task',
  'crm_update_task',
  'save_contact_note',
];

for (const name of requiredFunctions) {
  assert.match(
    migration,
    new RegExp('create or replace function studioflow_android_private\\.' + name + '\\s*\\(', 'i'),
    name + ' must be replaced by the additive CRM migration',
  );
}

// This patch is intentionally function-only. Existing RLS policy and booking
// behavior remain owned by the previously applied migrations.
assert.doesNotMatch(lower, /\bcreate\s+table\b/);
assert.doesNotMatch(lower, /\balter\s+table\b/);
assert.doesNotMatch(lower, /\b(drop|create)\s+policy\b/);
assert.doesNotMatch(lower, /\b(insert|update|delete)\s+into\s+public\.studioflow_bookings\b/);
assert.doesNotMatch(lower, /\bpublic\.customers\b/);
assert.doesNotMatch(migration, /studioflow_bookings_branch_staff_read|studioflow_bookings_staff_read/i);

// Staff context must come from auth.uid() and exactly one active membership.
assert.match(migration, /auth\.uid\(\)/i);
assert.match(migration, /membership_count <> 1/i);
assert.match(migration, /studioflow_current_staff_can\(target_owner, 'view_client_contacts'\)/i);
assert.match(migration, /studioflow_current_staff_can\(target_owner, 'manage_crm'\)/i);

// The strict customer rule requires an assigned branch and excludes any
// customer with a null or out-of-scope booking.
assert.match(migration, /b\.branch_id is not null[\s\S]*?studioflow_is_assigned_branch/i);
assert.match(migration, /b\.branch_id is null[\s\S]*?not public\.studioflow_is_assigned_branch/i);

// Receptionist is contacts-only; manager write RPCs re-check manage_crm.
assert.match(migration, /Receptionist: name\/contact details/i);
for (const name of ['crm_add_activity', 'crm_create_task', 'crm_update_task', 'save_contact_note']) {
  const start = lower.indexOf('create or replace function studioflow_android_private.' + name);
  assert.notEqual(start, -1, name + ' function exists');
  const end = lower.indexOf('create or replace function', start + 20);
  const body = lower.slice(start, end < 0 ? lower.length : end);
  assert.match(body, /crm_effective_owner\('manage_crm'\)/, name + ' must require Manager CRM permission');
}

// Legacy manual contacts have no branch relationship and must remain owner-only.
assert.match(migration, /Manual CRM contacts in crm_contacts have no branch mapping/i);
assert.match(migration, /Retain manual CRM contact creation\/update as salon-owner only/i);

console.log('PASS staff CRM branch-scope static contract');
console.log('PASS function-only migration: no tables, policies, bookings, or Android RPCs changed');

const helperAclPath = 'supabase/migrations/20261122072341_harden_active_branch_ids_acl.sql';
const helperAclMigration = readFileSync(helperAclPath, 'utf8').toLowerCase();
assert.ok(helperAclMigration.includes('alter function public.studioflow_active_branch_ids(uuid, text[]) security invoker'),
  'active branch helper must run as invoker, not as a privileged definer');
assert.ok(helperAclMigration.includes('revoke all on function public.studioflow_active_branch_ids(uuid, text[]) from public, anon, authenticated'),
  'browser roles must not execute the internal branch helper directly');
assert.ok(helperAclMigration.includes('grant execute on function public.studioflow_active_branch_ids(uuid, text[]) to postgres, service_role'),
  'only trusted server-side roles may execute the internal branch helper');
console.log('PASS internal active-branch helper is SECURITY INVOKER and not browser-callable');
