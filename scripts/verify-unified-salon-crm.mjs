import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const migration = read('supabase/migrations/20261119070000_unified_salon_crm.sql');
const manualContactFix = read('supabase/migrations/20261119143000_fix_manual_crm_contact_actions.sql');
const crm = read('src/components/SalonCRM.tsx');
const owner = read('src/components/OwnerWorkspace.tsx');
const dashboard = read('src/components/SaaSDashboard.tsx');
const navigation = read('src/lib/ownerNavigation.ts');

for (const table of ['crm_contacts', 'crm_tasks', 'crm_activities']) {
  assert.ok(migration.includes('create table if not exists studioflow_android_private.' + table));
  assert.ok(migration.includes('alter table studioflow_android_private.' + table + ' enable row level security'));
}
for (const contract of [
  'owner_id = (select auth.uid())',
  'crm_dashboard()',
  'studioflow_owner_crm_dashboard',
  'studioflow_owner_crm_create_contact',
  'studioflow_owner_crm_update_contact',
  'studioflow_owner_crm_add_activity',
  'studioflow_owner_crm_create_task',
  'studioflow_owner_crm_update_task',
  "'optIn', false",
  'from public, anon',
  'revoke all on function public.studioflow_owner_crm_create_contact',
  'revoke all on function public.studioflow_owner_crm_update_contact',
  'grant execute on function public.studioflow_owner_crm_create_contact',
  'grant execute on function public.studioflow_owner_crm_update_contact',
  'crm_contacts_owner_access',
  'm.owner_id=actor',
]) assert.ok(migration.includes(contract), 'Missing migration contract: ' + contract);

// Manual contacts must be valid CRM customers for both activity logging and follow-up tasks.
assert.equal(manualContactFix.split('m.id = p_customer and m.owner_id = actor').length - 1, 2);
assert.equal(manualContactFix.split('jsonb_array_elements(studioflow_android_private.owner_contacts())').length - 1, 2);
assert.ok(manualContactFix.includes('revoke all on function studioflow_android_private.crm_add_activity'));
assert.ok(manualContactFix.includes('revoke all on function studioflow_android_private.crm_create_task'));

for (const contract of [
  'studioflow_owner_crm_dashboard',
  'studioflow_owner_crm_create_contact',
  'studioflow_owner_crm_update_contact',
  'studioflow_owner_crm_add_activity',
  'studioflow_owner_crm_create_task',
  'studioflow_owner_crm_update_task',
  'customer.blocked || !customer.optIn',
  'Marketing consent is off by default',
  'bookingHistory',
  'Follow-up tasks',
]) assert.ok(crm.includes(contract), 'Missing CRM UI contract: ' + contract);

assert.ok(owner.includes('<SalonCRM profile={profile}/>'));
assert.ok(dashboard.includes('<SalonCRM profile={profile} />'));
assert.ok(navigation.includes("label:'Customer CRM'"));
assert.ok(dashboard.includes("label: 'Customer CRM'"));
assert.doesNotMatch(crm, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);

console.log('PASS unified salon CRM static integration contract (shared owner/dashboard module and manual-contact actions).');
console.log('Note: this static contract does not replace Postgres migration, npm build, or live browser tests.');
