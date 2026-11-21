import type { StaffAccessRole } from '../types';

/**
 * Staff role-level permissions — single source of truth.
 *
 * Historically the app had three disconnected role systems:
 *  1. `Stylist.accessRole` (draft JSONB) — display-only, never enforced,
 *     uneditable after creation, and unvalidated (20 of 26 live staff
 *     records had no role at all).
 *  2. `studioflow_branch_staff_members.role` ('staff' | 'manager') — the
 *     only role with real database enforcement, but it required pasting a
 *     raw auth UUID and had no CHECK constraint.
 *  3. Legacy `stylists.access_role` column — unused by the app.
 *
 * This module unifies them: one canonical role list, one permission
 * matrix, normalization for legacy values, and module gating helpers so
 * the owner workspace can enforce the same rules the database enforces.
 *
 * The salon OWNER account always has full access (`'owner'`); staff roles
 * are strictly less privileged. Unknown or missing roles always fall back
 * to the least-privileged role — never to Manager.
 */

/** Canonical app access roles, in ascending privilege order. */
export const STAFF_ACCESS_ROLES: readonly StaffAccessRole[] = [
  'Service Provider (Assigned)',
  'Receptionist (Frontdesk)',
  'Manager (Full Access)',
] as const;

/** Least-privileged default used whenever a role is missing or invalid. */
export const DEFAULT_ACCESS_ROLE: StaffAccessRole = 'Service Provider (Assigned)';

/** Privilege level per role. Higher = more access. Owner sits above all. */
export const ROLE_LEVEL: Record<StaffAccessRole, number> = {
  'Service Provider (Assigned)': 1,
  'Receptionist (Frontdesk)': 2,
  'Manager (Full Access)': 3,
};

export const OWNER_ROLE_LEVEL = 4;

/** Short labels used on badges and in compact UI. */
export const ROLE_SHORT_LABELS: Record<StaffAccessRole, string> = {
  'Service Provider (Assigned)': 'Service Provider',
  'Receptionist (Frontdesk)': 'Receptionist',
  'Manager (Full Access)': 'Manager',
};

/** Plain-language description per role (shown in the permissions dialog). */
export const ROLE_DESCRIPTIONS: Record<StaffAccessRole, string> = {
  'Service Provider (Assigned)':
    'Can view their own appointment calendar, mark services as complete, and view their individual tips & commissions.',
  'Receptionist (Frontdesk)':
    'Can book appointments for all stylists, process POS payments, manage client check-ins, and view client contact details.',
  'Manager (Full Access)':
    'Full administrative access to reports, revenue analytics, staff commissions, service pricing, and salon configuration.',
};

/**
 * Loose/legacy values found in old drafts, seeds and the legacy
 * `stylists` table, mapped to canonical roles. Matching is
 * case-insensitive and ignores surrounding whitespace.
 */
const LEGACY_ROLE_ALIASES: Record<string, StaffAccessRole> = {
  'service provider': 'Service Provider (Assigned)',
  'service provider (assigned)': 'Service Provider (Assigned)',
  'stylist': 'Service Provider (Assigned)',
  'staff': 'Service Provider (Assigned)',
  'branch staff': 'Service Provider (Assigned)',
  'receptionist': 'Receptionist (Frontdesk)',
  'receptionist (frontdesk)': 'Receptionist (Frontdesk)',
  'frontdesk': 'Receptionist (Frontdesk)',
  'manager': 'Manager (Full Access)',
  'manager (full access)': 'Manager (Full Access)',
  'branch manager': 'Manager (Full Access)',
  'owner': 'Manager (Full Access)',
};

/** True only for an exact canonical role value. */
export function isValidAccessRole(value: unknown): value is StaffAccessRole {
  return typeof value === 'string' && (STAFF_ACCESS_ROLES as readonly string[]).includes(value);
}

/**
 * Normalize any stored value to a canonical role. Missing, empty or
 * unrecognized values safely fall back to the least-privileged role.
 */
export function normalizeAccessRole(value: unknown): StaffAccessRole {
  if (typeof value !== 'string') return DEFAULT_ACCESS_ROLE;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_ACCESS_ROLE;
  const exact = STAFF_ACCESS_ROLES.find((role) => role.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;
  return LEGACY_ROLE_ALIASES[trimmed.toLowerCase()] ?? DEFAULT_ACCESS_ROLE;
}

/** Privilege level of a (possibly legacy) role value. */
export function roleLevel(role: StaffAccessRole | string | null | undefined): number {
  return ROLE_LEVEL[normalizeAccessRole(role)];
}

/** True when `role` is at least as privileged as `minimum`. */
export function hasRoleLevel(
  role: StaffAccessRole | string | null | undefined,
  minimum: StaffAccessRole,
): boolean {
  return roleLevel(role) >= ROLE_LEVEL[minimum];
}

/** Every permission a staff role holds, in a stable order. */
export type StaffPermission =
  | 'view_own_bookings'
  | 'complete_own_bookings'
  | 'view_own_earnings'
  | 'book_for_all_staff'
  | 'process_pos_payments'
  | 'manage_checkins'
  | 'view_client_contacts'
  | 'manage_crm'
  | 'view_reports'
  | 'view_revenue'
  | 'manage_team'
  | 'manage_services_pricing'
  | 'manage_settings'
  | 'publish_website'
  | 'manage_marketing'
  | 'manage_loyalty'
  | 'manage_branches'
  | 'manage_inventory';

/** Human-readable label per permission (used in checklists and docs). */
export const PERMISSION_LABELS: Record<StaffPermission, string> = {
  view_own_bookings: 'View own appointment calendar',
  complete_own_bookings: 'Mark own services as complete',
  view_own_earnings: 'View own tips & commissions',
  book_for_all_staff: 'Book appointments for all staff',
  process_pos_payments: 'Process POS payments',
  manage_checkins: 'Manage client check-ins',
  view_client_contacts: 'View client contact details',
  manage_crm: 'Manage customer CRM & follow-ups',
  view_reports: 'View business reports',
  view_revenue: 'View revenue & payments',
  manage_team: 'Manage team profiles & roles',
  manage_services_pricing: 'Manage services & pricing',
  manage_settings: 'Manage salon settings & website content',
  publish_website: 'Publish the live website',
  manage_marketing: 'Manage promotions & campaigns',
  manage_loyalty: 'Manage loyalty & rewards',
  manage_branches: 'Manage branches & staff access',
  manage_inventory: 'Manage branch inventory',
};

/**
 * The permission matrix. Manager holds every permission; Receptionist
 * holds the front-desk set; Service Provider holds only their own
 * calendar/earnings. Keep this in sync with
 * `studioflow_staff_role_permissions()` in the database migration.
 */
export const ROLE_PERMISSIONS: Record<StaffAccessRole, readonly StaffPermission[]> = {
  'Service Provider (Assigned)': [
    'view_own_bookings',
    'complete_own_bookings',
    'view_own_earnings',
  ],
  'Receptionist (Frontdesk)': [
    'view_own_bookings',
    'complete_own_bookings',
    'view_own_earnings',
    'book_for_all_staff',
    'process_pos_payments',
    'manage_checkins',
    'view_client_contacts',
  ],
  'Manager (Full Access)': [
    'view_own_bookings',
    'complete_own_bookings',
    'view_own_earnings',
    'book_for_all_staff',
    'process_pos_payments',
    'manage_checkins',
    'view_client_contacts',
    'manage_crm',
    'view_reports',
    'view_revenue',
    'manage_team',
    'manage_services_pricing',
    'manage_settings',
    'publish_website',
    'manage_marketing',
    'manage_loyalty',
    'manage_branches',
    'manage_inventory',
  ],
};

/** Permissions for a role (legacy values are normalized first). */
export function rolePermissions(
  role: StaffAccessRole | string | null | undefined,
): readonly StaffPermission[] {
  return ROLE_PERMISSIONS[normalizeAccessRole(role)];
}

/** True when the role holds the given permission. */
export function can(
  role: StaffAccessRole | string | null | undefined,
  permission: StaffPermission,
): boolean {
  return rolePermissions(role).includes(permission);
}

/* ------------------------------------------------------------------ */
/* Branch staff roles (`studioflow_branch_staff_members.role`)         */
/* ------------------------------------------------------------------ */

/** Roles enforced by branch-scoped RLS policies. */
export const BRANCH_ROLES = ['staff', 'manager'] as const;
export type BranchRole = (typeof BRANCH_ROLES)[number];

/** Normalize any stored branch role; unknown values become 'staff'. */
export function normalizeBranchRole(value: unknown): BranchRole {
  return value === 'manager' ? 'manager' : 'staff';
}

/** Map a branch role onto the app access-role hierarchy. */
export function branchRoleToAccessRole(role: BranchRole): StaffAccessRole {
  return role === 'manager' ? 'Manager (Full Access)' : 'Service Provider (Assigned)';
}

/** Map an app access role onto the branch role stored in the database. */
export function accessRoleToBranchRole(role: StaffAccessRole | string | null | undefined): BranchRole {
  return hasRoleLevel(role, 'Manager (Full Access)') ? 'manager' : 'staff';
}

/* ------------------------------------------------------------------ */
/* Owner-workspace module gating                                       */
/* ------------------------------------------------------------------ */

/** localStorage key remembering the owner's "View as role" selection. */
export const ROLE_PREVIEW_KEY = 'studioflow_role_preview';

/**
 * Permission required to open each owner-workspace module
 * (see `src/lib/ownerNavigation.ts`). Modules not listed here, and
 * `'owner_only'` modules, are never visible to staff roles.
 */
export const MODULE_PERMISSIONS: Record<number, StaffPermission | 'owner_only'> = {
  2: 'manage_settings', // Business details
  9: 'manage_settings', // Choose template
  10: 'manage_settings', // Logo, colours & hero
  27: 'manage_settings', // About our studio
  3: 'manage_services_pricing', // Services & packages
  4: 'manage_team', // Team & specialists
  5: 'manage_settings', // Photo gallery
  6: 'manage_settings', // Socials, videos & reels
  7: 'manage_settings', // Location & hours
  8: 'manage_settings', // Booking rules
  16: 'manage_settings', // Sections, menu & reviews
  31: 'manage_settings', // SEO & Social Metadata
  28: 'manage_marketing', // Promotions & offers
  29: 'manage_loyalty', // Loyalty & rewards
  23: 'manage_settings', // Salon policies
  11: 'view_reports', // Content review
  12: 'view_reports', // Preview website
  13: 'publish_website', // Publish & live website
  18: 'view_reports', // Business overview
  20: 'view_own_bookings', // Bookings & calendar (own rows only for staff)
  21: 'view_revenue', // Payments & revenue
  26: 'view_client_contacts', // Customer CRM (front desk maintains client contacts)
  22: 'manage_marketing', // Marketing campaigns
  24: 'manage_marketing', // Share & referral
  25: 'owner_only', // Platform branding
  1: 'owner_only', // Account & login
  30: 'owner_only', // Environment Diagnostics
  32: 'manage_branches', // Branches & inventory
  33: 'manage_settings', // Template 03 Content Management
  34: 'manage_settings', // WhatsApp Booking & Payments
};

/**
 * True when the given actor may open the module. The salon owner
 * (`'owner'`) always may. Staff roles need the module's permission.
 * Unknown modules are owner-only by default (fail closed).
 */
export function canAccessModule(
  actor: StaffAccessRole | 'owner' | string | null | undefined,
  moduleId: number,
): boolean {
  if (actor === 'owner') return true;
  const required = MODULE_PERMISSIONS[moduleId];
  if (!required || required === 'owner_only') return false;
  return can(actor, required);
}

/**
 * The first module an actor should land on. Staff start on operational
 * screens (bookings first) and never on website-editor steps they may not
 * hold; the owner keeps the guided website editor (step 1 = module 2).
 */
const STAFF_HOME_ORDER = [20, 18, 26, 21, 34, 32, 4, 2];

export function defaultModuleFor(
  actor: StaffAccessRole | 'owner' | string | null | undefined,
): number {
  if (actor === 'owner') return 2;
  for (const id of STAFF_HOME_ORDER) if (canAccessModule(actor, id)) return id;
  return visibleModuleIds(actor)[0] ?? 2;
}

/** All module ids visible to the actor (owner sees every known module). */
export function visibleModuleIds(
  actor: StaffAccessRole | 'owner' | string | null | undefined,
): number[] {
  return Object.keys(MODULE_PERMISSIONS)
    .map(Number)
    .filter((id) => canAccessModule(actor, id));
}
