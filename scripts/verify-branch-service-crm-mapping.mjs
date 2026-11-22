import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(path,'utf8');
const gitBlob=(path)=>{
  // Recreate the Git blob bytes: Git stores these SQL files with LF even if
  // Windows core.autocrlf checks them out with CRLF line endings.
  const body=Buffer.from(readFileSync(path,'utf8').replace(/\r\n/g,'\n'),'utf8');
  return createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex');
};

const serviceSql=read('supabase/migrations/20261122060000_branch_service_catalogue_scope.sql');
const crmSql=read('supabase/migrations/20261122060500_branch_scoped_manual_crm_contacts.sql');
const readModelsSql=read('supabase/migrations/20261122061000_branch_assignment_read_models.sql');
const bookingGuardsSql=read('supabase/migrations/20261122066000_branch_scope_private_booking_guards.sql');
const crmEmailSql=read('supabase/migrations/20261122067000_branch_manual_crm_email_read_projection.sql');
const cleanupSql=read('supabase/migrations/20261122068000_branch_mapping_redundant_index_cleanup.sql');
const publishedGuardSql=read('supabase/migrations/20261122069000_public_branch_list_published_guard.sql');
const contactUpdateFixSql=read('supabase/migrations/20261122064000_branch_crm_contact_update_duplicate_fix.sql');
const androidGrantSql=read('supabase/migrations/20261122072900_branch_service_android_wrapper_grants.sql');
const serviceUi=read('src/components/ServiceManagement.tsx');
const bookingUi=read('src/components/customer/BookingFlow.tsx');
const crmUi=read('src/components/SalonCRM.tsx');
const typeSource=read('src/types.ts');
const protectedDomainMigration='supabase/migrations/20261121120000_domain_tables_fail_closed_rls.sql';

// This migration is a protected dependency of PR #141. Its Git blob hash is
// pinned so future branch-scope work cannot silently rewrite it.
assert.equal(gitBlob(protectedDomainMigration),'ca160b7cd8dca5a84228d1066b7d2f40c21eb382',
  '20261121120000 Domain RLS migration must remain byte-for-byte unchanged');

for (const [label,source,patterns] of [
  ['service catalogue',serviceSql,[
    /add column if not exists branch_ids uuid\[\]/i,
    /studioflow_services_branch_ids_valid/i,
    /studioflow_services_branch_ids_gin_idx/i,
    /studioflow_private\.validate_service_branch_ids/i,
    /branch_ids=coalesce\(excluded\.branch_ids,public\.studioflow_services\.branch_ids\)/i,
    /create policy studioflow_services_branch_scope_guard[\s\S]*?as restrictive/i,
    /studioflow_private\.service_catalogue_available_at_branch/i,
    /studioflow_branch_android_book/i,
    /studioflow_branch_coupon_book/i,
    /studioflow_public_branches/i,
    /'serviceIds'/i,
  ]],
  ['manual CRM contacts',crmSql,[
    /add column if not exists branch_id uuid/i,
    /crm_contacts_owner_branch_fk/i,
    /references public\.branches\(site_id,id\)/i,
    /crm_contacts_owner_branch_created_idx/i,
    /crm_customer_in_branch_scope[\s\S]*?crm_contacts m[\s\S]*?m\.branch_id/i,
    /crm_create_contact\([\s\S]*?p_branch_id uuid/i,
    /crm_update_contact\([\s\S]*?p_branch_id uuid/i,
    /studioflow_owner_crm_create_contact\([\s\S]*?p_branch_id uuid/i,
    /studioflow_owner_crm_update_contact\([\s\S]*?p_branch_id uuid/i,
    /crm_contacts m[\s\S]*?public\.studioflow_is_assigned_branch/i,
  ]],
  ['branch read models',readModelsSql,[
    /studioflow_owner_service_branch_map/i,
    /studioflow_owner_crm_branch_options/i,
    /revoke all on function public\.studioflow_owner_crm_branch_options\(\) from public,anon/i,
    /grant execute on function public\.studioflow_owner_crm_branch_options\(\) to authenticated/i,
  ]],
]) for (const pattern of patterns) assert.match(source,pattern,`${label}: missing ${pattern}`);

assert.doesNotMatch(serviceSql,/alter table\s+public\.studioflow_bookings/i,
  'service migration must not change booking table schema');
assert.doesNotMatch(crmSql,/create\s+policy[\s\S]*?on\s+public\.studioflow_bookings/i,
  'CRM migration must not create booking policies');
assert.doesNotMatch(crmSql,/drop\s+policy[\s\S]*?on\s+public\.studioflow_bookings/i,
  'CRM migration must not drop booking policies');
assert.doesNotMatch(serviceSql+crmSql+readModelsSql,/public\.customers\b/i,
  'do not create or reference public.customers');

assert.match(typeSource,/branchIds\?:\s*string\[\]/,
  'SalonService must carry optional branch mappings');
assert.match(serviceUi,/studioflow_owner_crm_branch_options/,
  'Owner service editor must read active branches through an authenticated owner RPC');
assert.doesNotMatch(serviceUi,/studioflow_public_branches/,
  'Owner service editor must not depend on the public publication-gated branch listing');
assert.match(serviceUi,/studioflow_owner_service_branch_map/);
assert.match(serviceUi,/branchIds:form\.branchIds/);
assert.match(serviceUi,/Branch availability/);
assert.match(bookingUi,/serviceIds:Array\.isArray\(b\.serviceIds\)/);
assert.match(bookingUi,/allServices\.filter\(service=>offeredServiceIds\.has\(service\.id\)\)/);
assert.match(bookingUi,/studioflow_branch_android_slots/);
assert.match(crmUi,/studioflow_owner_crm_branch_options/);
assert.match(crmUi,/p_branch_id: draftBranchId \|\| null/);
assert.match(crmUi,/p_branch_id: newBranchId \|\| null/);
assert.match(crmUi,/Assigned branch/);
assert.match(contactUpdateFixSql,/coalesce\(c\.value->>'id',''\)<>p_customer::text/i,
  'CRM update must exclude the contact being edited from duplicate-phone checks');
assert.match(androidGrantSql,/revoke all on function public\.studioflow_android_book[\s\S]*?from public, anon, authenticated/i);
assert.match(androidGrantSql,/grant execute on function public\.studioflow_android_book[\s\S]*?to authenticated, service_role/i);
assert.match(bookingGuardsSql,/studioflow_private\.service_catalogue_available_at_branch\(target_owner,p_services,null\)/i,
  'Unbranched Android slots must reject services with branch-only assignment');
assert.match(bookingGuardsSql,/studioflow_private\.service_catalogue_available_at_branch\(\s*w\.owner_id,p_services,selected_branch::uuid\s*\)/i,
  'Android booking must check the selected branch in the private booking RPC');
assert.match(bookingGuardsSql,/set_config\('studioflow\.branch_id',b\.branch_id::text,true\)/i,
  'Reschedule must restore the original booking branch before checking slots');
assert.match(crmEmailSql,/nullif\(m\.email,''\)/i,
  'Manager contact list must include email on mapped manual CRM contacts');
assert.match(crmEmailSql,/nullif\(c\.value->>'email',''\)/i,
  'CRM dashboard must preserve email from the manual contact read model');
assert.match(cleanupSql,/drop index if exists public\.branches_site_id_id_scope_uk/i,
  'Redundant index cleanup must retain the original branches unique constraint');
assert.doesNotMatch(cleanupSql,/drop constraint|drop policy|studioflow_bookings/i);
assert.match(publishedGuardSql,/w\.published_at\s*<=\s*now\(\)/i,
  'Public branch list must match the published storefront time gate');
assert.match(publishedGuardSql,/grant execute on function public\.studioflow_public_branches\(text\) to anon, authenticated, service_role/i);

console.log('PASS: branch-level services and manual CRM contacts are mapped, scoped, backwards-compatible, and protected migrations/policies remain untouched.');
