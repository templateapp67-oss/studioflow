# Nexora database migration assessment

This is an assessment, **not a migration**. No database changes were made. The application defaults to the Supabase project `NEW FINAL TEMLETE APP` (`zilwgiuiygqqardzutxi`); the findings below reflect read-only catalog inspection on 2026-11-07 and must be rechecked before any deployment.

## Existing contracts that block a clean-slate migration

- All six requested `public` tables already exist. `profiles` has many application-specific columns; `clients` and `bookings` have required `owner_id` columns and existing owner-based policies. The requested `client_id` and other fields cannot simply be assumed to exist or to have equivalent semantics.
- `salons` uses an `organization_id` relationship; active `organization_members` participate in access. Mapping this model to a single `profiles.salon_id` and role can lose multi-organization membership or change permissions.
- The app also uses `studioflow_bookings` and established booking RPCs; creating another booking flow against `public.bookings` does not automatically integrate with all template modals, availability, payments, or owner dashboards. `backend/studioflow-schema.sql` contains an authenticated booking path with slot and rate checks.
- Existing signup triggers include `studioflow_profiles_insert` in `backend/studioflow-android-foundation.sql`, plus other auth triggers. Installing a second blind provisioning trigger can conflict with signup behavior. Supabase auth users may lack email, so imposing a new non-null email constraint needs a data and auth-provider review.

## Security findings to validate in staging

- At inspection time, `services_public_read` and `staff_public_read` each permitted rows based on `is_active` alone. Multiple permissive policies combine with OR, so stricter policies do not override these wider ones. The repository hardening migration `202611060001_studioflow_public_access_hardening.sql` replaces several policies, but the live catalog observed here did not match all of its definitions. Investigate migration drift before relying on that file.
- Anonymous `SELECT` was granted on the full `staff`, `services`, and `salons` tables. RLS filters rows, not columns; `staff` includes fields such as phone, email and commission. Check column grants and actual anonymous access, and use explicitly projected public views/RPCs or column grants after reviewing existing consumers.
- Allowing anonymous inserts into `clients` and `bookings` directly is not sufficient protection against spam, forged payment state, mismatched tenant references, or arbitrary prices. A controlled booking endpoint needs validated server-side tenant, service, staff, price and availability, request throttling and concurrency protection. It must integrate with existing payment and booking behavior.
- A self-writable role or tenant column must not be used as the source of authorization. Management privileges need an existing trusted membership/ownership source and explicit role semantics.

## Before a production migration

1. Provision a representative staging database or branch with the current schema, auth setup and representative non-sensitive data. Back up production and verify restoration.
2. Inventory effective grants, all permissive and restrictive policies, functions, triggers, constraints, indexes, and all consumers of these tables and booking RPCs. Reconcile repository migrations with the actual deployed catalog.
3. Agree on the authority model for owner/manager/staff/client/super-admin, including multi-salon membership and who may manage membership. Agree on guest booking and anti-abuse controls.
4. Design an additive, backfilled migration around existing relations; preserve legacy rows and client contracts. Add same-tenant foreign-key integrity only after checking existing data. Use trusted provisioning and avoid trusting mutable user metadata for role assignment.
5. Exercise actual app flows and adversarial RLS tests as anon, two tenants' users, staff, and privileged backend roles. Test signup providers, all 16 template booking flows, payment status, cross-tenant IDs, concurrency and public column exposure. Record rollback and rollout steps.
6. Produce and review the final SQL and rollback, test them on staging, and only then authorize production deployment.
