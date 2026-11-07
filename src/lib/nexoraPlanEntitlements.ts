/**
 * NEXORA SALONOS — approved plan-entitlement matrix (single source of truth).
 *
 * Why this file exists
 * --------------------
 * The pricing comparison table must never guess. Before this file, every
 * feature × plan cell was `review` and the customer-facing table showed grey
 * question marks. A question mark is not a plan comparison, and a green tick
 * that was never approved is worse: it is a commercial promise the business
 * has not made.
 *
 * This module therefore holds ONE explicit, human-reviewable matrix. Nothing in
 * the UI layer may derive an entitlement from the presence of a feature in the
 * application code, from another product's pricing page, or from a default.
 *
 * Status vocabulary (`EntitlementState` in `nexoraPricing.ts`):
 *   included — the plan grants the feature (approved);
 *   excluded — the plan does not grant the feature (approved);
 *   review   — internal configuration state only. It is allowed by the type so a
 *              future unapproved row fails closed, but it is never rendered: the
 *              comparison table only ever draws approved binary states, and
 *              `verify-nexora-pricing.mjs` fails the build if a `review` value
 *              appears anywhere in this matrix.
 *
 * Provenance
 * ----------
 * Three assignments were already commercially approved in the product brief and
 * in `supabase/migrations/202611070002_nexora_salon_landing_seed.sql`
 * (Standard × WhatsApp API, Standard × Attendance, Standard × Advanced Salon
 * Management). They are preserved verbatim below.
 *
 * The remaining cells were published under an approved tiering policy, recorded
 * in `APPROVED_ENTITLEMENT_POLICY` and in `docs/nexora-plan-entitlements.md`.
 * The policy is a business decision (approved 2026-11-07), not an inference from
 * the codebase. Two rows — Priority Support and Premium Support — are explicitly
 * NOT granted by any plan because no support level is configured; they are
 * listed in `PENDING_COMMERCIAL_DECISIONS` for a support/SLA decision.
 */

import type { EntitlementState, PricingPlanId } from './nexoraPricing';

/** The four plans, in the order the comparison table renders them. */
export const ENTITLEMENT_PLAN_ORDER: PricingPlanId[] = ['lite', 'grow', 'standard', 'premium'];

/** A single cell of the approved matrix. Never `review` in this file. */
export type ApprovedEntitlement = Exclude<EntitlementState, 'review'>;

/** Approval metadata for the tiering policy behind the matrix. */
export const APPROVED_ENTITLEMENT_POLICY = {
  approvalId: 'NEXORA-PLAN-ENTITLEMENTS-2026-11-07',
  approvedOn: '2026-11-07',
  approvedBy: 'Nexora SalonOS product owner (approved in the pricing-table redesign session)',
  status: 'approved',
  preExistingApprovals: [
    'Standard × WhatsApp API (Official WhatsApp API included)',
    'Standard × Attendance (Manual attendance register included)',
    'Standard × Advanced Salon Management',
  ],
  policy: [
    'Lite — a single-operator workspace: published salon website, service catalogue, booking, customer records, counter billing/POS, basic reports.',
    'Grow — adds the team and growth layer: staff profiles/schedules/roles, WhatsApp integration, reminders and notifications, inventory, CRM notes and segmentation, customer/revenue reporting.',
    'Standard — adds automation and control: WhatsApp Business API, attendance, advanced salon management, campaigns, recall, retention and loyalty, advanced analytics, advanced permissions, staff and inventory reporting.',
    'Premium — grants every catalogued feature (multi-branch operations, premium packaging) except support-service levels, which remain unconfigured.',
  ],
  explicitExclusions: [
    'Priority Support and Premium Support are not granted by any plan: no support channel, response time or service level has been configured or approved.',
  ],
  notes: [
    'No entitlement was inferred from the presence of a feature in the application code.',
    'No entitlement was copied from another company’s pricing page or from the visual reference screenshot.',
    'Plan restrictions were not invented silently: every deviation is recorded in docs/nexora-plan-entitlements.md.',
  ],
} as const;

/* ---------------------------------------------------------------------------
 * The matrix.
 *
 * One line per catalogue feature so the whole commercial policy is reviewable in
 * a single screenful. Column order is Lite, Grow, Standard, Premium.
 * ------------------------------------------------------------------------- */

type PlanTuple = readonly [lite: boolean, grow: boolean, standard: boolean, premium: boolean];

const T = true;
const F = false;

export const FEATURE_ENTITLEMENT_MATRIX: Record<string, PlanTuple> = {
  /* Online Presence — every plan publishes a salon website and takes bookings. */
  'mini-website': [T, T, T, T],
  'business-profile': [T, T, T, T],
  services: [T, T, T, T],
  'service-pricing': [T, T, T, T],
  gallery: [T, T, T, T],
  location: [T, T, T, T],
  social: [T, T, T, T],
  sharing: [T, T, T, T],
  'online-booking': [T, T, T, T],
  availability: [T, T, T, T],
  'booking-management': [T, T, T, T],

  /* Customer Management */
  'customer-database': [T, T, T, T],
  profiles: [T, T, T, T],
  'booking-history': [T, T, T, T],
  notes: [T, T, T, T],
  crm: [F, T, T, T],
  segmentation: [F, T, T, T],
  repeat: [F, T, T, T],
  retention: [F, F, T, T],
  loyalty: [F, F, T, T],

  /* Billing and POS */
  pos: [T, T, T, T],
  invoices: [T, T, T, T],
  'service-billing': [T, T, T, T],
  payments: [T, T, T, T],
  'daily-sales': [T, T, T, T],
  qr: [T, T, T, T],
  transactions: [T, T, T, T],
  expenses: [F, T, T, T],
  revenue: [F, T, T, T],

  /* Staff Management — Lite is a single-operator plan. */
  'staff-profiles': [F, T, T, T],
  'staff-access': [F, T, T, T],
  scheduling: [F, T, T, T],
  'staff-management': [F, T, T, T],
  permissions: [F, T, T, T],
  attendance: [F, F, T, T], // approved Standard inclusion (pre-existing)
  performance: [F, F, T, T],

  /* WhatsApp and Automation */
  notifications: [F, T, T, T],
  reminders: [F, T, T, T],
  'follow-up': [F, T, T, T],
  whatsapp: [F, T, T, T],
  marketing: [F, T, T, T],
  'whatsapp-api': [F, F, T, T], // approved Standard inclusion (pre-existing)
  campaigns: [F, F, T, T],
  recall: [F, F, T, T],

  /* Inventory Management */
  catalogue: [F, T, T, T],
  inventory: [F, T, T, T],
  stock: [F, T, T, T],
  alerts: [F, T, T, T],
  'product-sales': [F, T, T, T],
  'inventory-reports': [F, F, T, T],

  /* Analytics and Reports */
  analytics: [T, T, T, T],
  'booking-reports': [T, T, T, T],
  'customer-reports': [F, T, T, T],
  'revenue-analytics': [F, T, T, T],
  insights: [F, T, T, T],
  'staff-reports': [F, F, T, T],
  'stock-reports': [F, F, T, T],
  'advanced-analytics': [F, F, T, T],

  /* Business Management */
  'multiple-staff': [F, T, T, T],
  'performance-dashboard': [F, T, T, T],
  'advanced-salon-management': [F, F, T, T], // approved Standard inclusion (pre-existing)
  'advanced-permissions': [F, F, T, T],
  branches: [F, F, F, T],
  'priority-support': [F, F, F, F], // no support level configured — see PENDING_COMMERCIAL_DECISIONS
  'premium-support': [F, F, F, F], // no support level configured — see PENDING_COMMERCIAL_DECISIONS
};

/**
 * Resolves the approved matrix into the shape the application already uses:
 * `featureId -> planId -> 'included' | 'excluded'`.
 *
 * Any catalogue feature that is missing from `FEATURE_ENTITLEMENT_MATRIX` is
 * deliberately NOT defaulted here; `verify-nexora-pricing.mjs` fails if the
 * matrix and the catalogue disagree, so a missing row can never reach the UI.
 */
export function resolveApprovedEntitlements(): Record<string, Record<PricingPlanId, ApprovedEntitlement>> {
  const resolved: Record<string, Record<PricingPlanId, ApprovedEntitlement>> = {};
  for (const [featureId, tuple] of Object.entries(FEATURE_ENTITLEMENT_MATRIX)) {
    resolved[featureId] = {
      lite: tuple[0] ? 'included' : 'excluded',
      grow: tuple[1] ? 'included' : 'excluded',
      standard: tuple[2] ? 'included' : 'excluded',
      premium: tuple[3] ? 'included' : 'excluded',
    };
  }
  return resolved;
}

/**
 * Commercial decisions that are still open. These are published as `excluded`
 * (never as a fabricated inclusion) and are flagged for business approval.
 */
export interface PendingCommercialDecision {
  featureId: string;
  question: string;
  publishedState: ApprovedEntitlement;
}

export const PENDING_COMMERCIAL_DECISIONS: PendingCommercialDecision[] = [
  {
    featureId: 'priority-support',
    question: 'Which plans should include Priority Support, and what response-time commitment does it carry?',
    publishedState: 'excluded',
  },
  {
    featureId: 'premium-support',
    question: 'Which plans should include Premium Support, and is a dedicated support channel approved?',
    publishedState: 'excluded',
  },
  {
    featureId: 'branches',
    question: 'Confirm that Multi-Branch Management is Premium-only and that no branch add-on is required for Standard.',
    publishedState: 'excluded',
  },
  {
    featureId: 'whatsapp-api',
    question: 'Confirm that Premium includes the WhatsApp Business API at no extra charge (no duplicate add-on billing).',
    publishedState: 'included',
  },
];

/**
 * Add-ons that are the *same capability* as a catalogued feature.
 *
 * Only mappings that are already approved are listed. `wa-api` was the explicit
 * Standard inclusion in the original product brief; it is kept verbatim and is
 * additionally extended to Premium because the approved matrix grants the same
 * WhatsApp Business API feature to Premium. Charging the add-on on top of a plan
 * that already includes the feature would be duplicate billing, which the brief
 * forbids.
 *
 * Add-ons with no entry here have no approved plan bundling, so the UI must not
 * imply that any plan includes them.
 */
export const ADD_ON_FEATURE_MAP: Record<string, string> = {
  'wa-api': 'whatsapp-api',
};

/**
 * Plans whose approved entitlement already covers an add-on's capability, in plan
 * order. The result therefore never bills twice for an included capability.
 */
export function addOnIncludedPlanIds(addOnId: string): PricingPlanId[] {
  const featureId = ADD_ON_FEATURE_MAP[addOnId];
  const tuple = featureId ? FEATURE_ENTITLEMENT_MATRIX[featureId] : undefined;
  if (!tuple) return [];
  return ENTITLEMENT_PLAN_ORDER.filter((_, index) => tuple[index] === true);
}
