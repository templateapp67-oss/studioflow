# Multi-branch support

The additive migration is `supabase/migrations/202610300004_multibranch_support.sql`. Apply it only after the shared StudioFlow account/booking/availability RPCs and `202610300003_template12_iron_ink.sql` are installed. Do not apply it to a live Supabase project without explicit authorization and a verified target.

## Data and workspace flow

- `public.branches` stores the branch directory (`id`, `site_id`, `name`, `city`, `address`, `phone`, `is_active`) plus weekly `operating_hours`.
- Branch configuration remains inside the existing owner workspace profile; an account trigger validates/projects it to `branches` and converts stylist `branchSchedules` to `studioflow_staff_branch_schedules`. Owners can set separate location hours in onboarding or Owner Workspace → Location & hours / Branches & inventory.
- `studioflow_bookings.branch_id`, `ink_bookings.branch_id`, `ink_availability.branch_id` and `ink_blocked_dates.branch_id` link reservations, Template 12 schedules, and blocked dates to locations. NULL Template 12 schedule rows preserve the legacy shared schedule; branch-specific schedule rows override it for that branch/day.
- `studioflow_branch_inventory` is tenant- and branch-linked. Owner inventory/branch access is owner-only; branch staff may manage inventory only with `can_manage_inventory=true`.

## Booking RPCs

- Website: `studioflow_public_branches`, `studioflow_branch_specialists`, `studioflow_branch_available_slots`, `studioflow_branch_book`.
- Customer app: `studioflow_branch_android_slots`, `studioflow_branch_android_book`, `studioflow_branch_coupon_book`.
- Existing single-location RPCs remain for compatibility. Multi-location bookings through legacy RPCs fail closed if no branch is supplied. Add-ons, coupon booking, POS walk-ins, and rescheduling preserve/validate branch context.
- Template 12 uses `get_branch_available_slots` and `create_branch_booking`; its site payload exposes active branches and the Iron & Ink owner panel can maintain branch-specific availability rows.

## Access and rollback

Owner policies scope writes by `auth.uid() = site_id`. Branch staff see schedules and bookings only for assigned branches; inventory writes additionally require the branch inventory capability. Public branch reads expose only active locations of published websites. Private policies do not use permissive `USING (true)` rules.

`supabase/rollback/202610300004_multibranch_support_rollback.sql` removes only this feature's tables, columns, wrappers, policies, and projections, and restores the prior booking validators. It refuses to drop distinct branch-specific Template 12 schedules/blocked dates until those rows are consolidated. Review/back up branch data before any rollback.

Offline integration verification (PGlite; no live project access):

```sh
npm run test:multibranch
node scripts/verify-sql-migrations.mjs
```
