import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  'supabase/migrations/20261122100000_staff_crm_branch_scope.sql',
  'utf8',
);
const lower = migration.toLowerCase();

for (const name of [
  'crm_effective_owner',
  'crm_customer_in_branch_scope',
  'owner_contacts',
  'crm_dashboard',
  'crm_add_activity',
  'crm_create_task',
  'crm_update_task',
  'save_contact_note',
]) {
  assert.match(
    migration,
    new RegExp('create or replace function studioflow_android_private\\.' + name + '\\s*\\(', 'i'),
    name + ' is replaced in the additive migration',
  );
}

// Function-only: do not change table structures, RLS policies, or booking data.
assert.doesNotMatch(lower, /\\bcreate\\s+table\\b/);
assert.doesNotMatch(lower, /\\balter\\s+table\\b/);
assert.doesNotMatch(lower, /\\b(drop|create)\\s+policy\\b/);
assert.doesNotMatch(lower, /\\b(insert|update|delete)\\s+into\\s+public\\.studioflow_bookings\\b/);
assert.doesNotMatch(lower, /\\bpublic\\.customers\\b/);
assert.doesNotMatch(lower, /studioflow_bookings_staff_read|studioflow_bookings_branch_staff_read/);

// Server-side role and branch checks.
assert.match(migration, /studioflow_current_staff_can\\(target_owner, 'view_client_contacts'\\)/i);
assert.match(migration, /studioflow_current_staff_can\\(target_owner, 'manage_crm'\\)/i);
assert.match(migration, /b\\.branch_id is null[\\s\\S]+not public\\.studioflow_is_assigned_branch/i);
assert.match(migration, /studioflow_android_private\\.crm_customer_in_branch_scope\\(target_owner,/i);
assert.match(migration, /revoke all on function studioflow_android_private\\.crm_effective_owner\\(text\\)[\\s\\S]+from public, anon, authenticated/i);

// Receptionists are contacts-read-only. Every CRM write RPC requires manage_crm.
assert.match(migration, /receptionist: contact directory only/i);
for (const name of ['crm_add_activity', 'crm_create_task', 'crm_update_task', 'save_contact_note']) {
  const start = lower.indexOf('create or replace function studioflow_android_private.' + name);
  assert.notEqual(start, -1);
  const body = lower.slice(start, start + 2200);
  assert.match(body, /crm_effective_owner\\('manage_crm'\\)/, name + ' is Manager-only');
}

console.log('PASS staff CRM branch-scope static contract');
console.log('PASS function-only migration: no tables, policies, booking data, or Android APIs changed');
