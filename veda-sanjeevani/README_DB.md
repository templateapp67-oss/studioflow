# Veda Sanjeevani — Step 1 database

A standalone Supabase database for **Veda Sanjeevani Ayurvedic Wellness & Spa**. It is deliberately
isolated from the existing StudioFlow application: the parent repository already uses
`public.profiles`, `create_booking` and `get_available_slots` with incompatible contracts. **Use a
new, dedicated Supabase project; do not apply these migrations to the existing StudioFlow project.**

## Files and order

1. `supabase/migrations/001_extensions.sql`
2. `supabase/migrations/002_tables.sql`
3. `supabase/migrations/003_functions.sql`
4. `supabase/migrations/004_rls.sql`
5. `supabase/migrations/005_cron.sql`
6. `supabase/seed.sql`
7. `supabase/tests/db_tests.sql` — run separately, after seeding

`supabase/config.toml` selects PostgreSQL 17 for a new local Supabase stack and enables the seed
file. The SQL also uses PostgreSQL 16-compatible features. All migration and seed transactions are
repeatable. Seed conflicts do not overwrite admin edits; deleting a seeded row intentionally allows
a later seed run to restore it.

## Run locally

Install Docker and Supabase CLI 2.122 or newer. From **this directory**, not the parent StudioFlow
directory:

```bash
cd veda-sanjeevani
supabase start
supabase db reset
supabase status
```

`db reset` is destructive to the selected local database. It applies the migrations and seed. Never
point a reset at valuable data. Obtain the local PostgreSQL URL from `supabase status`, then run:

```bash
psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/db_tests.sql
```

Alternatively, with the local stack running:

```bash
supabase db lint --level warning
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -v ON_ERROR_STOP=1 -f supabase/tests/db_tests.sql
```

The test file creates temporary Auth/profile/booking fixtures inside a transaction and rolls
everything back. It expects the fresh seed and no existing profiles. It makes no HTTP requests and
needs no real credentials. Run it only on a disposable/reset database.

## Hosted SQL editor

Create a **new** Supabase project. Enable `pg_cron`, `pg_net` and Vault if not already enabled.
Supabase provides the required `auth` and `storage` schemas and the `anon`, `authenticated` and
`service_role` roles; these SQL files do not impersonate or recreate those platform schemas.

Paste each complete migration into the SQL editor **in the numbered order**, then `seed.sql`. Run
each as a separate query. Finally run `db_tests.sql` only in a disposable project. The SQL editor is
not a substitute for migration history in production; use the CLI migration workflow for deployed
projects.

The extension migration assumes Supabase's standard `extensions` schema. `pg_cron` must be available
in `shared_preload_libraries`, as it is on Supabase. A plain PostgreSQL server without Supabase
Auth/Storage and these extensions is not a supported target.

## Secrets and the review job

No secret or real project URL is included in these files. Create a random secret of at least 32
characters in a password manager. In the **SQL editor as database owner**, set these Vault entries,
replacing the placeholders locally:

```sql
SELECT vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
SELECT vault.create_secret('YOUR_RANDOM_32_PLUS_CHARACTER_SECRET', 'cron_secret');
```

To rotate an existing value without creating duplicate names:

```sql
SELECT vault.update_secret(id, 'YOUR_NEW_VALUE')
FROM vault.decrypted_secrets WHERE name = 'cron_secret';
```

Use the equivalent rotation for `project_url`. Set the **same cron secret** as `CRON_SECRET` on the
Step 2 `request-review` Edge Function. Never use a browser key, commit a secret, put it in a
migration, or expose `vault.decrypted_secrets` through the API. Restrict SQL editor/Vault access to
trusted administrators.

Jobs use UTC:

| Name              | Schedule          | Behaviour                                                                                              |
| ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| `review-requests` | Hourly, minute 0  | Reconcile previous HTTP responses, then queue up to 100 eligible completed visits older than 24 hours. |
| `keep-alive`      | Daily, 03:17      | `SELECT 1`.                                                                                            |
| `cleanup`         | Hourly, minute 30 | Remove rate-limit buckets older than one day.                                                          |

`pg_net` is asynchronous. `bookings.review_request_id` records the queued request.
`review_requested_at` is set **only after a non-timeout HTTP 2xx response**, normally on the next
hourly reconciliation. Failures retry; a missing response retries after 15 minutes if it is no
longer queued. The Step 2 endpoint must verify `x-cron-secret` using a constant-time comparison and
deduplicate by `booking_id` before sending messages. Delivery is at-least-once, not a claim of
exactly-once messaging. A 2xx acknowledges the endpoint, not eventual WhatsApp/SMS delivery. Missing
Vault configuration leaves the job safely idle with a warning. There is **no auto-complete job**.

Inspect safely:

```sql
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
SELECT jobid, status, return_message, start_time
FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
SELECT name FROM vault.decrypted_secrets ORDER BY name; -- no secret values
```

## RPC contract

| RPC                                                               | Execution access      |
| ----------------------------------------------------------------- | --------------------- |
| `get_public_site()`                                               | anon, authenticated   |
| `get_available_slots(uuid, uuid, date)`                           | anon, authenticated   |
| `create_booking(uuid, uuid, timestamptz, text, text, text, text)` | **service_role only** |
| `submit_review(text, int, text)`                                  | anon, authenticated   |
| `save_quiz_result(int, int, int, text)`                           | anon, authenticated   |
| `create_review_token(uuid)`                                       | **service_role only** |
| `check_rate_limit(text, int, int)`                                | **service_role only** |

The browser calls the booking Edge Function, which validates origin/rate limits and calls
`create_booking` using the server-only key. Never put a service-role key in frontend code.
`get_public_site` is the single website read call; an unpublished site returns empty content to
visitors while the owner can preview it. It excludes setup state, customer data and draft article
bodies. As explicitly required by the RLS contract, direct SELECT policies still expose active
catalogue rows independently of the site's published flag; the frontend must use `get_public_site`,
not assemble its own direct-table reads.

Slots use **Asia/Kolkata**, a 30-minute grid, actual treatment duration, a 15-minute buffer and a
two-hour minimum lead time. `slot_end` is the treatment end, not the buffer end. The last treatment
must finish by closing. The exclusion constraint prevents overlapping pending/confirmed appointments
even for direct owner writes; the RPC additionally enforces buffers, eligibility and the grid.
Owners retain full manual booking control.

`bookings.price` is a server-derived price snapshot, added so staff cannot alter a booking's price
and historical totals do not change when a service price changes. Junction tables have a unique UUID
`id` plus the requested composite primary key. Phone values are normalized to ten digits; optional
email uses case-insensitive `citext`.

## Auth, RLS and Storage

- The **first Auth user becomes owner**, later users become staff. Create the owner first through a
  controlled signup; disable public signup or use an invite-only process before launch. First-owner
  selection is serialized, but this bootstrap rule is not a substitute for secured signup.
- Only owners can change roles. Staff can read bookings/customers and change booking **status
  only**. They can read their own profile and change their own full name. Database triggers enforce
  restricted fields in addition to RLS.
- RLS is enabled on all 22 application tables. Private tables have no anon policy.
  Published/active/approved content is readable as specified. Owner policies cover all application
  rows.
- `site-images`: public read, 5 MiB, JPEG/PNG/WebP/AVIF; owner-only upload/update/delete.
- `documents`: private; owner-only access. No anon policy.
- Service-role keys bypass RLS and are server-only. Security-definer functions use a fixed search
  path with `pg_temp` last and explicit function grants.

## Before launch / scope

**Replace all seed text via admin panel** (the admin UI is a later step): practitioner names,
qualifications, biographies, prices, policies, contact details, SEO and fictional approved
testimonials. Obtain consent for real testimonials. Replace empty image URLs with owned, accessible
images. The seeded Netra Tarpana and Nasya offerings are explicitly non-clinical spa adaptations; do
not advertise clinical procedures without appropriately qualified staff. No seed copy promises to
cure disease.

Step 1 does not implement the backend, admin UI, public frontend, payment flow or `request-review`
Edge Function. It does not send messages or verify real provider delivery. Configure Auth email,
backups, custom domains, monitoring and provider credentials in their respective later steps.

## Verification checklist

The implementation includes assertions for all seven requested test groups, plus seed counts,
buffers, RPC grants, quiz validation, rate limits, Storage policies, public projections and cron
registration.

### Verified in this workspace — 2026-11-01

- Supabase CLI **2.122.0**, using `db reset --db-url … --yes` against an isolated **native
  PostgreSQL 16.2** database: all five migrations and seed applied successfully. This is the CLI's
  external-database reset path, **not** a Docker `supabase start` / local-stack reset.
- Real `btree_gist`, `pgcrypto`, `citext`, `pg_cron`, `pg_net` and `supabase_vault` extensions were
  installed. Supabase-compatible Auth/Storage tables and API roles were provided as test fixtures;
  the full Supabase service stack was not running.
- `psql -v ON_ERROR_STOP=1 -f supabase/tests/db_tests.sql`: **PASS**, transaction rolled back.
  Expected warnings explain that Vault is intentionally unconfigured.
- A separate two-connection test rejected a concurrent overlapping booking with SQLSTATE **23P01**.
- All five migrations were applied a second time successfully. Re-seeding preserved edited
  service/settings text and did not duplicate rows.
- All **22** application tables have RLS and an `updated_at` trigger.
- Final inventory: **22 tables, 14 functions, 41 application policies, 5 spa Storage policies, 3
  active cron jobs**.
- Seed inventory: **12 services, 12 sections, 4 staff, 3 packages, 6 FAQs, 4 fictional approved
  testimonials, 3 draft posts, 0 bookings**.
- No cure claims or real credentials were found in the SQL.

### Not verified

- Docker-backed `supabase db reset` on the configured PostgreSQL **17** image: Docker is unavailable
  in this workspace.
- A hosted Supabase project, real Auth signup, actual Storage HTTP uploads, PostgREST HTTP calls,
  deployed Vault secrets and scheduled wall-clock cron execution.
- `supabase db lint`: the native test server lacks the optional `plpgsql_check` extension; this is
  not reported as a passing lint run.
- The Step 2 `request-review` endpoint and real email/WhatsApp/SMS delivery. HTTP
  acknowledgement/retry bookkeeping was tested with inserted `pg_net` response fixtures, not an
  external provider.

### Final inventory

Tables: `site_settings`, `sections`, `services`, `packages`, `staff`, `staff_services`,
`staff_gallery`, `gallery`, `testimonials`, `faqs`, `blog_posts`, `customers`, `bookings`,
`review_tokens`, `reviews`, `dosha_quiz_results`, `ai_generations`, `media`, `profiles`,
`working_hours`, `blocked_dates`, `rate_limits`.

Functions: `set_updated_at`, `is_owner`, `is_staff_or_owner`, `handle_new_user`,
`prevent_role_escalation`, `protect_booking_update`, `get_available_slots`, `create_booking`,
`submit_review`, `save_quiz_result`, `create_review_token`, `check_rate_limit`, `get_public_site`,
`dispatch_review_requests`.

Policies: `owner_all` on each of the 22 application tables; `public_read` on `site_settings`,
`sections`, `services`, `packages`, `staff`, `staff_services`, `staff_gallery`, `gallery`,
`testimonials`, `faqs`, `blog_posts`, `working_hours`; `staff_read` on `bookings`, `customers`,
`services`, `staff`; `staff_update_status` on `bookings`; `own_profile` and `own_profile_name` on
`profiles`; Storage policies `veda_site_images_public_read`, `veda_site_images_owner_write`,
`veda_site_images_owner_update`, `veda_site_images_owner_delete`, `veda_documents_owner_all`.

Cron: `review-requests` (`0 * * * *`), `keep-alive` (`17 3 * * *`), `cleanup` (`30 * * * *`), all
active. No auto-complete job.

Success in the native test environment is not proof of hosted deployment. Do not mark hosted
deployment or external messaging verified until actually tested there.
