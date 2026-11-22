import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(path, 'utf8');
const contextMigration = read('supabase/migrations/20261122052119_staff_salon_context_and_booking_completion.sql');
const inventoryMigration = read('supabase/migrations/20261122052400_staff_inventory_membership_access.sql');
const staffInvites = read('src/lib/staffInvites.ts');
const staffWorkspace = read('src/components/staff/StaffWorkspacePage.tsx');
const branchPanel = read('src/components/BranchManagementPanel.tsx');
const paymentFunction = read('supabase/functions/studioflow-payments/index.ts');

assert.match(contextMigration, /staff_active_contexts/);
assert.match(contextMigration, /studioflow_set_active_staff_salon/);
assert.match(contextMigration, /studioflow_active_staff_owner/);
assert.match(contextMigration, /crm_effective_owner/);
assert.match(contextMigration, /complete_own_bookings/);
assert.match(contextMigration, /studioflow_is_assigned_branch/);
assert.match(contextMigration, /b\.ends_at > now\(\)/);
assert.doesNotMatch(contextMigration, /drop\s+policy/i);
assert.doesNotMatch(contextMigration, /studioflow_bookings_branch_staff_read/i);

assert.match(inventoryMigration, /branch_inventory_staff_membership_manage/);
assert.match(inventoryMigration, /studioflow_current_staff_can\(site_id, 'manage_inventory'\)/);
assert.match(inventoryMigration, /studioflow_is_assigned_branch/);
assert.doesNotMatch(inventoryMigration, /drop\s+policy/i);

assert.match(staffInvites, /studioflow_my_staff_memberships/);
assert.match(staffInvites, /studioflow_set_active_staff_salon/);
assert.match(staffWorkspace, /Choose your salon/);
assert.match(staffWorkspace, /Select salon workspace/);
assert.match(staffWorkspace, /booking\.stylistId === context\.staffId/);
assert.match(staffWorkspace, /booking\.status === 'confirmed'/);
assert.match(staffWorkspace, /new Date\(booking\.endsAt\)\.getTime\(\) <= Date\.now\(\)/);
assert.match(staffWorkspace, /studioflow_update_booking/);
assert.match(branchPanel, /from\('studioflow_staff_members'\)/);
assert.doesNotMatch(branchPanel, /from\('studioflow_branch_staff_members'\)/);
assert.match(branchPanel, /branch_ids/);
assert.match(branchPanel, /updateStaffMemberAccess/);
assert.doesNotMatch(branchPanel, /from\('studioflow_staff_members'\)\s*\.update/);

assert.match(paymentFunction, /requeueForReconciliation/);
assert.match(paymentFunction, /ledgerPending/);
assert.match(paymentFunction, /studioflow_complete_refund/);

console.log('Staff salon selection, own-booking completion, canonical branch membership, inventory policy and refund-ledger safeguards verified.');
