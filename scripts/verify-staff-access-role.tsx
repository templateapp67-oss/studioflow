/**
 * Role-level permission matrix checks (pure logic, no DOM/network).
 * Run via `scripts/verify-staff-access-role.mjs`, which bundles this file.
 */
import {
  STAFF_ACCESS_ROLES,
  DEFAULT_ACCESS_ROLE,
  ROLE_PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_LEVEL,
  ROLE_DESCRIPTIONS,
  ROLE_SHORT_LABELS,
  MODULE_PERMISSIONS,
  normalizeAccessRole,
  roleLevel,
  hasRoleLevel,
  rolePermissions,
  can,
  canAccessModule,
  visibleModuleIds,
  normalizeBranchRole,
  branchRoleToAccessRole,
  accessRoleToBranchRole,
} from '../src/lib/staffPermissions';
import { WEBSITE_EDIT_STEPS, OWNER_BUSINESS_TOOLS } from '../src/lib/ownerNavigation';

let failures = 0;
function check(label: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}
function eq(label: string, actual: unknown, expected: unknown) {
  check(label, JSON.stringify(actual) === JSON.stringify(expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

console.log('\nRole-level permissions');

// 1. Canonical role list, least-to-most privileged, three roles only.
eq('three canonical roles exist', STAFF_ACCESS_ROLES.length, 3);
eq('role order is ascending privilege', STAFF_ACCESS_ROLES.map(r => ROLE_LEVEL[r]), [1, 2, 3]);
check('every role has a description', STAFF_ACCESS_ROLES.every(r => typeof ROLE_DESCRIPTIONS[r] === 'string' && ROLE_DESCRIPTIONS[r].length > 20));
check('every role has a short label', STAFF_ACCESS_ROLES.every(r => typeof ROLE_SHORT_LABELS[r] === 'string'));
eq('default role is least privileged', DEFAULT_ACCESS_ROLE, 'Service Provider (Assigned)');

// 2. Permission matrix.
check('every permission has a label', STAFF_ACCESS_ROLES.every(r => ROLE_PERMISSIONS[r].every(p => typeof PERMISSION_LABELS[p] === 'string')));
check('matrix has no duplicate permissions per role', STAFF_ACCESS_ROLES.every(r => new Set(ROLE_PERMISSIONS[r]).size === ROLE_PERMISSIONS[r].length));
check('service provider holds only own-calendar permissions', ROLE_PERMISSIONS['Service Provider (Assigned)'].every(p => ['view_own_bookings', 'complete_own_bookings', 'view_own_earnings'].includes(p)));
check('receptionist cannot manage team', !can('Receptionist (Frontdesk)', 'manage_team'));
check('receptionist cannot view revenue', !can('Receptionist (Frontdesk)', 'view_revenue'));
check('receptionist can process POS payments', can('Receptionist (Frontdesk)', 'process_pos_payments'));
check('receptionist can book for all staff', can('Receptionist (Frontdesk)', 'book_for_all_staff'));
check('service provider cannot process POS payments', !can('Service Provider (Assigned)', 'process_pos_payments'));
check('service provider cannot book for all staff', !can('Service Provider (Assigned)', 'book_for_all_staff'));
check('manager holds every manager permission', can('Manager (Full Access)', 'manage_team') && can('Manager (Full Access)', 'view_revenue') && can('Manager (Full Access)', 'publish_website'));
check('roles are strictly nested (each superset of the previous)', STAFF_ACCESS_ROLES.every((role, i) => i === 0 || ROLE_PERMISSIONS[STAFF_ACCESS_ROLES[i - 1]].every(p => ROLE_PERMISSIONS[role].includes(p))));
check('manager holds the union of all permissions', STAFF_ACCESS_ROLES.every(r => ROLE_PERMISSIONS[r].every(p => ROLE_PERMISSIONS['Manager (Full Access)'].includes(p))));

// 3. Normalization: legacy values never escalate, unknown values fail closed.
eq('canonical value passes through', normalizeAccessRole('Manager (Full Access)'), 'Manager (Full Access)');
eq('case-insensitive match', normalizeAccessRole('receptionist (frontdesk)'), 'Receptionist (Frontdesk)');
eq('legacy "Manager" alias', normalizeAccessRole('Manager'), 'Manager (Full Access)');
eq('legacy "staff" alias is least privileged', normalizeAccessRole('staff'), 'Service Provider (Assigned)');
eq('legacy "Asha stylist" garbage fails closed', normalizeAccessRole('Asha stylist'), 'Service Provider (Assigned)');
eq('null fails closed', normalizeAccessRole(null), 'Service Provider (Assigned)');
eq('undefined fails closed', normalizeAccessRole(undefined), 'Service Provider (Assigned)');
eq('empty string fails closed', normalizeAccessRole('   '), 'Service Provider (Assigned)');
eq('number fails closed', normalizeAccessRole(42), 'Service Provider (Assigned)');
eq('role level of unknown value', roleLevel('superadmin'), 1);
check('unknown role never has manager permissions', !can('superadmin', 'manage_team') && !can(undefined, 'view_revenue'));
check('hasRoleLevel: manager satisfies receptionist minimum', hasRoleLevel('Manager (Full Access)', 'Receptionist (Frontdesk)'));
check('hasRoleLevel: receptionist does not satisfy manager minimum', !hasRoleLevel('Receptionist (Frontdesk)', 'Manager (Full Access)'));
eq('rolePermissions normalizes first', rolePermissions('manager'), ROLE_PERMISSIONS['Manager (Full Access)']);

// 4. Module gating.
check('owner can access every module', Object.keys(MODULE_PERMISSIONS).map(Number).every(id => canAccessModule('owner', id)));
check('owner-only modules are closed to manager', !canAccessModule('Manager (Full Access)', 25) && !canAccessModule('Manager (Full Access)', 1) && !canAccessModule('Manager (Full Access)', 30));
check('manager can open team, revenue and CRM modules', [4, 21, 26, 32, 13].every(id => canAccessModule('Manager (Full Access)', id)));
check('receptionist can open bookings', canAccessModule('Receptionist (Frontdesk)', 20));
check('receptionist cannot open team management', !canAccessModule('Receptionist (Frontdesk)', 4));
check('service provider cannot open revenue or CRM', !canAccessModule('Service Provider (Assigned)', 21) && !canAccessModule('Service Provider (Assigned)', 26));
check('service provider cannot open website publishing', !canAccessModule('Service Provider (Assigned)', 13));
check('unknown module id fails closed for staff', !canAccessModule('Manager (Full Access)', 9999));
check('undefined actor falls back to least privilege', canAccessModule(undefined, 20) && !canAccessModule(undefined, 21) && !canAccessModule(undefined, 4));
check('receptionist can maintain client contacts', canAccessModule('Receptionist (Frontdesk)', 26));
check('service provider cannot open the CRM', !canAccessModule('Service Provider (Assigned)', 26));
check('service provider sees fewer modules than receptionist', visibleModuleIds('Service Provider (Assigned)').length < visibleModuleIds('Receptionist (Frontdesk)').length);
check('receptionist sees fewer modules than manager', visibleModuleIds('Receptionist (Frontdesk)').length < visibleModuleIds('Manager (Full Access)').length);
check('manager sees fewer modules than owner', visibleModuleIds('Manager (Full Access)').length < visibleModuleIds('owner').length);

// 5. Every real workspace module has an explicit gate (no accidental leaks).
const realIds = [...WEBSITE_EDIT_STEPS, ...OWNER_BUSINESS_TOOLS].map(s => s.id);
check('every workspace module is explicitly gated', realIds.every(id => MODULE_PERMISSIONS[id] !== undefined), `missing: ${realIds.filter(id => MODULE_PERMISSIONS[id] === undefined).join(',')}`);
check('module map has no stale ids', Object.keys(MODULE_PERMISSIONS).map(Number).every(id => realIds.includes(id)), `stale: ${Object.keys(MODULE_PERMISSIONS).map(Number).filter(id => !realIds.includes(id)).join(',')}`);
const nonOwnerGated = realIds.filter(id => {
  const required = MODULE_PERMISSIONS[id];
  return required !== undefined && required !== 'owner_only' && !canAccessModule('Service Provider (Assigned)', id);
});
check('service provider is blocked from most modules', nonOwnerGated.length > realIds.length / 2);

// 6. Branch role mapping (database model) stays consistent with app roles.
eq('branch manager maps to Manager access role', branchRoleToAccessRole(normalizeBranchRole('manager')), 'Manager (Full Access)');
eq('branch staff maps to Service Provider', branchRoleToAccessRole(normalizeBranchRole('staff')), 'Service Provider (Assigned)');
eq('unknown branch role fails closed to staff', normalizeBranchRole('superuser'), 'staff');
eq('Manager access role maps to branch manager', accessRoleToBranchRole('Manager (Full Access)'), 'manager');
eq('Receptionist maps to branch staff', accessRoleToBranchRole('Receptionist (Frontdesk)'), 'staff');
eq('unknown access role maps to branch staff', accessRoleToBranchRole('nonsense'), 'staff');

if (failures) {
  console.error(`\n${failures} role-permission check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\nAll role-level permission checks passed.');
}
