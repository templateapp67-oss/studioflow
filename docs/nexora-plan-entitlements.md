# NEXORA SALONOS — approved plan entitlements

**Approval id:** `NEXORA-PLAN-ENTITLEMENTS-2026-11-07`
**Approved:** 2026-11-07 · Nexora SalonOS product owner (pricing-table redesign session)
**Source of truth in code:** `src/lib/nexoraPlanEntitlements.ts`
**Rendered by:** `src/components/nexora-pricing/table/FeatureComparisonTable.tsx`
**Release gate:** `node scripts/verify-nexora-comparison-table.mjs`

---

## 1. Why this document exists

The `/pricing` comparison table used to render **every** feature × plan cell from a
map that defaulted to `review`, so customers saw grey question marks. After the
redesign the table publishes an explicit binary entitlement instead: a green
circled check (included) or a red circled cross (not included).

A published check is a commercial promise. The matrix in
`src/lib/nexoraPlanEntitlements.ts` is therefore an **approved** artefact, not an
inference:

* nothing is derived from whether a feature exists in the application code;
* nothing is copied from another vendor's pricing page or from the visual
  reference screenshot;
* every row is one reviewable line, and any cell that is not explicitly approved
  would abort both the UI build gate and the database seed generator.

## 2. Pre-existing approvals (unchanged)

Approved in the original product brief and seeded in
`supabase/migrations/202611070002_nexora_salon_landing_seed.sql`:

| Feature | Plan | State |
|---|---|---|
| WhatsApp API | Standard | included |
| Attendance (manual attendance register) | Standard | included |
| Advanced Salon Management | Standard | included |

All three remain `included` for Standard, and the approved tiering policy grants
them to Premium as well (Premium is a superset). No pre-existing approval was
downgraded.

## 3. Tiering policy that was approved

| Plan | Position | What the matrix grants |
|---|---|---|
| **Lite** (₹625/mo eq., ₹7,500/yr) | Single-operator workspace | Mini website, business profile, services and pricing, gallery, location/contact, social links, sharing, online booking, availability, booking management, customer database/profiles/history/notes, POS billing, invoices, service billing, payment tracking, QR collection, transaction history, daily sales, dashboard analytics, booking reports — 24 features |
| **Grow** (₹1,249/mo eq., ₹14,988/yr) | Adds the team and growth layer | All Lite features plus staff profiles/access/scheduling/management/permissions, WhatsApp integration, notifications, reminders, follow-up, marketing notifications, inventory (catalogue, stock, alerts, product sales), CRM, segmentation, repeat-customer tools, expenses, revenue reporting, customer reports, revenue analytics, insights, multiple staff, performance dashboard — 49 features |
| **Standard** (₹1,999/mo eq., ₹23,988/yr) | Adds automation and control | All Grow features plus WhatsApp Business API, attendance, advanced salon management, campaigns, customer recall, retention, loyalty, advanced analytics, staff and inventory reporting, staff performance, advanced permissions — 62 features |
| **Premium** (₹4,999/mo eq., ₹59,988/yr) | Full workspace | All Standard features plus multi-branch management — 63 features |

The ladder is monotonic: no plan withdraws a feature that a cheaper plan grants.
`verify-nexora-comparison-table.mjs` asserts this, so a future edit that breaks the
ladder fails CI rather than shipping a confusing table.

## 4. Resolved-blocker note (read before re-approving)

Immediately before this change the repository contained **only** the three
Standard assignments above; every other cell was `review`. The full matrix was
therefore **not** present in any approved artefact, and the reference screenshot
could not be used as evidence (its rows — "Manual Attendance Register",
"Biometric Attendance Register", "Unlimited Devices" — do not exist in
`FEATURE_CATEGORIES` and describe a different product).

The tiering policy in §3 was drafted for this task and **approved by the product
owner** in the same session rather than inferred. If that approval is later
revised, edit the single matrix file; UI, database seed, plan cards and add-on
bundling all follow it.

## 5. Open commercial decisions (flagged, not hidden)

Published states below are what the table currently shows. Each needs an explicit
business answer before the next pricing review.

| # | Feature | Question | Published state |
|---|---|---|---|
| 1 | Priority Support | Which plans include it, and what response-time commitment does it carry? No support channel or SLA is configured. | Excluded in all four plans |
| 2 | Premium Support | Which plans include it, and is a dedicated channel approved? | Excluded in all four plans |
| 3 | Multi-Branch Management | Confirm Premium-only, and that Standard needs no branch add-on for a second location. | Premium only |
| 4 | WhatsApp Business API | Confirm Premium includes it at no extra charge (no duplicate add-on billing). | Standard + Premium included |

Related, still unconfigured (unchanged by this work):

* monthly subscription rates stay `null` — no monthly rate was invented;
* all add-on prices stay `null` and add-ons cannot be purchased;
* subscription checkout remains unavailable;
* support service levels are unpublished.

## 6. Add-on bundling

`PRICING_ADD_ONS` bundling is now **derived** from the matrix via
`ADD_ON_FEATURE_MAP`:

| Add-on | Bundled plans | Basis |
|---|---|---|
| WhatsApp Business API (`wa-api`) | Standard, Premium | Same capability as the `whatsapp-api` feature, which the matrix includes in both plans |

Every other add-on maps to no catalogued feature, so it is bundled with **no**
plan and the UI states that plainly. This guarantees the page never bills twice
for a capability a plan already includes.

## 7. How the rules are enforced

| Gate | What it prevents |
|---|---|
| `FEATURE_ENTITLEMENT_MATRIX` (boolean tuples) | a cell being "forgotten" — the type has no third value |
| `PUBLISHED_COMPARISON_FEATURE_IDS` | a partially approved row rendering an unstated cell |
| `FeatureStatus` (no third rendering path) | grey question marks, grey minuses, "Review" chips |
| `scripts/verify-nexora-comparison-table.mjs` | any cell that is not an approved binary icon; also checks icons, colours, labels, tooltips, legend, monotonic ladder and add-on bundling |
| `scripts/generate-nexora-landing-db-seed.mjs` | an unapproved cell reaching `public.plan_features` |
| `scripts/verify-nexora-pricing.mjs` | loss of the approved annual prices, plan selection, auth handoff, SEO contract |

## 8. Re-approval checklist

1. Edit only the tuples in `FEATURE_ENTITLEMENT_MATRIX` (or the policy block).
2. Update `APPROVED_ENTITLEMENT_POLICY.approvalId` / `approvedOn`.
3. Update this document's tables.
4. `node scripts/generate-nexora-landing-db-seed.mjs` → regenerate the seed.
5. `node scripts/verify-nexora-comparison-table.mjs` and `npm run build`.
6. Apply the regenerated migration to the published database.
