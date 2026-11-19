import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const migration = read('supabase/migrations/20261119070000_unified_salon_crm.sql');
const crm = read('src/components/SalonCRM.tsx');
const owner = read('src/components/OwnerWorkspace.tsx');
const dashboard = read('src/components/SaaSDashboard.tsx');
const navigation = read('src/lib/ownerNavigation.ts');

for (const table of ['crm_contacts', 'crm_tasks', 'crm_activities']) {
  assert.match(migration, new RegExp('create table if not exists studioflow_android_private\\.' + table));
  assert.match(migration, new RegExp('alter table studioflow_android_private\\.' + table + ' enable row level security'));
}
assert.match(migration, /owner_id = \(select auth\.uid\(\)\)/);
assert.match(migration, /crm_dashboard\(\)/);
assert.match(migration, /studioflow_owner_crm_dashboard/);
assert.match(migration, /studioflow_owner_crm_create_contact/);
assert.match(migration, /studioflow_owner_crm_update_contact/);
assert.match(migration, /studioflow_owner_crm_add_activity/);
assert.match(migration, /studioflow_owner_crm_create_task/);
assert.match(migration, /studioflow_owner_crm_update_task/);
assert.match(migration, /'optIn',\s*false/);
assert.match(migration, /from public, anon/);
assert.match(migration, /revoke all on function public\.studioflow_owner_crm_create_contact/);
assert.match(migration, /revoke all on function public\.studioflow_owner_crm_update_contact/);
assert.match(migration, /grant execute on function public\.studioflow_owner_crm_create_contact/);
assert.match(migration, /grant execute on function public\.studioflow_owner_crm_update_contact/);
assert.match(migration, /crm_contacts_owner_access/);
assert.match(migration, /m\.owner_id\s*=\s*actor/);

assert.match(crm, /studioflow_owner_crm_dashboard/);
assert.match(crm, /studioflow_owner_crm_create_contact/);
assert.match(crm, /studioflow_owner_crm_update_contact/);
assert.match(crm, /studioflow_owner_crm_add_activity/);
assert.match(crm, /studioflow_owner_crm_create_task/);
assert.match(crm, /studioflow_owner_crm_update_task/);
assert.match(crm, /customer\.blocked \|\| !customer\.optIn/);
assert.match(crm, /Marketing consent is off by default/);
assert.match(crm, /bookingHistory/);
assert.match(crm, /Follow-up tasks/);

assert.match(owner, /<SalonCRM profile=\{profile\}\/\s*>/);
assert.match(dashboard, /<SalonCRM profile=\{profile\} \/>/);
assert.match(navigation, /label:'Customer CRM'/);
assert.match(dashboard, /label: 'Customer CRM'/);
assert.doesNotMatch(crm, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);

console.log('PASS unified salon CRM static integration contract (all salon templates use the shared owner/dashboard module).');
console.log('Note: this static contract does not replace Postgres migration, npm build, or live browser tests.');
