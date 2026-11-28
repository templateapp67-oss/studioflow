# Booking availability repair: production rollout and review

## Status and release scope

PR #191 is **not merged**. The following migrations are **pending, not approved or applied to production**. The database and matching client must be released together; the directory's branch-aware practice-booking RPC does not exist until the first migration is applied. Apply the exact files in this order:

1. `20261127143001_booking_slot_availability_repair.sql` repairs shared website/directory/Android/men's availability, records branch-shift provenance, repairs the optional normalized catalogue RPC and owner assignment writer, and adds an appointment conflict guard. Its original, unapplied filename was `20261127140001_booking_slot_availability_repair.sql`.
2. `20261127143100_iron_ink_availability_ist.sql` follows it and repairs the separate, unpaid Iron Ink request flow. Its original, unapplied filename was `20261127140100_iron_ink_availability_ist.sql`. It only replaces the optional branch RPC if already installed; it does not install that feature.
3. `20261127143200_cross_ledger_booking_conflicts.sql` follows both and adds a conservative cross-ledger write guard, owner-identity guards and corresponding availability checks where the normalized booking schema exists. It is a new pending migration requiring review, not a retimestamp of an already applied file.

**Why the versions changed:** read-only production migration history confirmed the unrelated `20261127140000_studioflow_resend_transactional_email.sql` and newer `20261127143000_studioflow_web_checkout_receipts.sql` are applied, while the original two booking versions are absent. Leaving the original versions in the active directory would put them before the latest applied migration and block the normal protected push. The two booking files have therefore been retimestamped, in the same order, **without changing their SQL**. Their original copies are preserved under `supabase/reconciled-migrations/` and their matching SHA-256 hashes are checked by the release-plan verifier; the new third file also has a checksum in the pending ledger. Never run the archived copies or both versions. No booking migration was applied or recorded as applied during this reconciliation.

Recheck the **target** immediately before rollout; counts and history can change. If another applied migration is newer than the proposed pending versions, stop and prepare reviewed, byte-identical forward versions again rather than force an older migration or alter history. A skipped Supabase Preview migration step is **not** a dry-run or approval.

## What must be reviewed

### The 252 existing shift rows

A read-only production snapshot on 27 November 2026 found **252 rows across 15 tenants, 15 affected branches and 36 distinct tenant/staff pairs**: 220 active shifts and 32 inactive/off rows. Every affected tenant then had one active branch; all 252 rows matched a staff ID in the owner's current draft. Six staff in four tenants had a non-empty personal schedule (42 rows); 30 staff in 11 tenants did not (210 rows). None of these 252 rows had a `branchSchedules` array in that draft. A non-empty schedule is not proof that its times or assignments are correct, and these totals may have changed.

The old projection could copy opening hours or personal schedules into every branch. There is no reliable provenance for those historical rows. The first migration **preserves every row but marks each previously unlabelled row `legacy`**; legacy rows alone no longer establish an individual's availability or allow a new/rescheduled appointment. A valid saved personal schedule may still apply at a single active branch; it never assigns a person to multiple branches. Explicit `workspace` or `direct` branch shifts take precedence, including explicit days off. Consequently some or all of the 30 staff with no personal schedule may stop offering slots until genuine shifts are confirmed. Do not automatically promote the 220 active rows, assume the 32 off rows are genuine, or use opening hours as proof of staff attendance.

Before the maintenance window, the release owner must obtain owner/manager review for **each** `(site_id, branch_id, staff_id, day_of_week)` row, including inactive days. Maintain a confidential, access-controlled manifest containing the original values, owner-confirmed outcome and reviewer/time:

- **Confirmed genuine branch shift/day off:** record the exact approved active flag and start/end times. After migration, explicitly save that branch shift using the authorized owner scheduling flow, or use the controlled per-row procedure below. A direct save marks it `direct`; an explicit saved `branchSchedules` projection marks it `workspace`.
- **Unknown, fabricated, obsolete, or awaiting owner confirmation:** leave it `legacy` and do not invent a replacement. The owner should explicitly configure the correct schedule/day off when known. Legacy preservation is an audit aid, not a booking fallback.
- **Staff/service qualification:** separately review assigned service IDs. Stale-only assignments fall back to active services, whereas any remaining active assignment restricts eligibility. This compatibility rule does not establish professional qualifications. Never match services by name.

Generate the current aggregate inventory read-only, then securely export the per-row evidence for the reviewers; never put tenant IDs, staff details or backups in this repository:

```sql
-- Read-only; run as an authorized operator against the reviewed target.
select count(*) rows, count(distinct site_id) tenants,
       count(distinct branch_id) branches,
       count(distinct (site_id, staff_id)) staff,
       count(*) filter (where is_active) active_rows,
       count(*) filter (where not is_active) inactive_rows
from public.studioflow_staff_branch_schedules;

select site_id, count(*) rows, count(distinct branch_id) branches,
       count(distinct staff_id) staff, count(*) filter (where is_active) active_rows
from public.studioflow_staff_branch_schedules
group by site_id order by site_id;

-- Review roster, saved personal/branch schedules and branch hours alongside
-- each row. Branch hours are context only, not evidence of a staff shift.
select r.site_id, r.branch_id, r.staff_id, r.day_of_week,
       r.starts_at, r.ends_at, r.is_active,
       b.name branch_name, b.is_active branch_active, b.operating_hours,
       s.staff->>'name' staff_name, s.staff->'schedule' personal_schedule,
       s.staff->'branchSchedules' explicit_branch_schedules
from public.studioflow_staff_branch_schedules r
left join public.branches b on b.site_id=r.site_id and b.id=r.branch_id
left join public.studioflow_accounts a on a.user_id=r.site_id
left join lateral (
  select item staff
  from jsonb_array_elements(case when jsonb_typeof(a.draft->'stylists')='array'
    then a.draft->'stylists' else '[]'::jsonb end) item
  where item->>'id'=r.staff_id limit 1
) s on true
order by r.site_id,r.branch_id,r.staff_id,r.day_of_week;
```

If an authorized operator must record a reviewed shift after the first migration, prefer the normal owner UI. Otherwise, use one transaction **per reviewed key**, with the values bound from the approved manifest and an optimistic comparison to the preflight snapshot. The trigger marks an edit of the schedule fields `direct`; do not update `schedule_source` itself or bulk-mark rows as trusted. In the following `psql` example, bind all variables privately first; use an empty string for a null time. The new values must come from the owner's confirmation, not the old row by assumption.

```sql
begin;
update public.studioflow_staff_branch_schedules
set starts_at=nullif(:'new_start','')::time,
    ends_at=nullif(:'new_end','')::time,
    is_active=:'new_active'::boolean
where site_id=:'site_id'::uuid and branch_id=:'branch_id'::uuid
  and staff_id=:'staff_id' and day_of_week=:'day_of_week'
  and schedule_source='legacy'
  and starts_at is not distinct from nullif(:'old_start','')::time
  and ends_at is not distinct from nullif(:'old_end','')::time
  and is_active=:'old_active'::boolean
returning site_id,branch_id,staff_id,day_of_week,starts_at,ends_at,is_active,schedule_source;
-- STOP: COMMIT only if exactly the one reviewed row was returned with
-- schedule_source='direct'; otherwise ROLLBACK, refresh the snapshot, and
-- obtain a new review. Do not continue on an error or an unexpected row count.
```

### Normalized catalogue compatibility

The optional `nexora_customer_booking_options` previously validated IDs in `public.services`, although `get_public_website_by_slug` returns `public.salon_services` IDs and the `staff_services` foreign key targets `salon_services`. The repair uses the latter for availability, price, duration and assignment validation. It accepts a legacy `services` ID **only** when an active same-salon `service:<editor-id>` provenance key resolves to exactly one active, online salon service; ambiguous, cross-tenant, duplicate, archived, offline or unmapped IDs fail closed. The owner writer also saves the canonical assignment FK, including a service first created in that save. The existing catalogue sync is adjusted to update `price_paise` together with `price` on future saves; the migration does not rewrite existing prices. No name-based matching or catalogue-wide UUID rewrite occurs.

At review time there were 30 rows in each catalogue, no same-ID/same-salon matches, and only 10 salon-service editor keys provably linked to a `services` ID (five linked legacy rows were active and online). All 30 salon-service rows were marked active/online, while only 10 legacy rows were; this is not proof the other catalogue entries are valid. Have owners review the normalized public menu, current prices and assignments, and explicitly retire obsolete entries before relying on it. Update external normalized clients to use IDs from the normalized website catalogue; investigate unmatched or ambiguous IDs with the owning tenant rather than guessing.

The historical owner-state sync ignored the target chosen by the owner writer and independently selected the newest salon. The repair makes that sync honor the authorized `salonId` in the saved state. A direct legacy state update without a target is allowed only when the owner has at most one eligible salon; ambiguous or foreign targets fail closed. In the review snapshot, all four owner/manager memberships had just one eligible normalized salon; recheck before rollout, and ensure any multi-salon direct state writer includes an authorized `salonId`.

The historical owner sync can also create separate deterministic and `staff:<editor-id>` staff rows for the same editor ID; one such pair was observed at review time, both inactive. This migration does not merge or delete staff IDs. The normalized RPC now requires a real working schedule, so an unscheduled duplicate cannot silently become an unrestricted bookable specialist. Review duplicate identities, assignments, existing bookings and schedules with the owner before enabling them; never merge them by name. The optional functions are guarded against unexpected reviewed body anchors and missing key booking columns; recheck the complete target schema before release. The reviewed RPC also referenced nonexistent appointment columns and `staff_time_off`; its replacement uses the target's normalized booking columns and approved `staff_leave_requests`. Unknown booking statuses, conflicting dates and incomplete active normalized booking times/staff fail closed.

### Cross-ledger policy and external writers

`public.bookings` and `studioflow_bookings` remain separate ledgers. The normalized RPC is **availability-only**; a read never reserves a slot, and this repository still has no normalized customer booking-write RPC. When the normalized schema is present, the third migration adds normalized and identity triggers and extends the canonical ledger's existing write trigger. The disposable PostgreSQL test now exercises real competing normalized and StudioFlow writes, including a negative control that double-books when the new guard is absent; it is not a live integration test.

- **Deliberately conservative scope:** independently generated normalized staff UUIDs and StudioFlow stylist strings cannot be safely matched by name, and the observed deterministic/editor-key candidates did not establish a mapping. Active normalized appointments block overlaps with *all* StudioFlow specialists for the same owner, and also with other normalized appointments for that owner, even across salons and distinct staff. Adjacent half-open intervals are allowed. StudioFlow-only bookings for different specialists remain independent if no normalized conflict exists. Owners must accept this potentially substantial loss of parallel availability before release; a more precise cross-ledger identity model requires a separate verified design. The guard does not protect a person booked under different owners or in other external ledgers.
- **Identity and states:** every new/active normalized write requires an existing salon with exactly one active organization owner matching `bookings.owner_id`, and an existing staff row belonging to that salon. Managers cannot be substituted as the owner. Nonblank `booking_status` takes precedence over `status`; if the effective state is unknown or blank it remains active. Only `cancelled`, `canceled`, `completed`, `no_show` and `expired` release it. In particular `pending_payment` remains blocking until explicitly transitioned; no normalized hold-expiry inference is made. Canonical `confirmed` and non-expired `pending` holds block. `READ COMMITTED` is required for active writes; callers should handle conflicts and retry transaction-level deadlocks rather than bypass locks.
- **Timezone:** normalized wall times are converted using the salon timezone and saved as absolute instants. Empty, missing or invalid timezones and ambiguous/nonexistent DST windows fail closed; the guard also rejects windows when offsets sampled at the start, end, 36 hours before the start or 36 hours after the end differ. A timezone edit does not move an existing instant, including an unchanged cancellation/reactivation; changing its salon or effective date/time clears or recomputes the snapshot; filling an equivalent date field does not shift it. The earlier local-wall-time check may also conservatively hide extra slots after a timezone edit. Review timezone changes and their customer-facing display. The read-only snapshot found three `Asia/Kolkata` salons and one `UTC`; recheck, never assume all are IST.
- **Owner/staff transfers:** adding/removing/changing active organization owners, moving/deleting or soft-deleting the salon, and moving/deleting a specialist are rejected while relevant normalized appointments are active. The guards serialize those changes with normalized writes and require `READ COMMITTED` for identity changes; a normal FK may restrict hard deletion further. Resolve appointments with their owners before identity changes, rather than disable triggers. Changing `salon.timezone` waits for an in-flight normalized write; the saved instant remains stable.
- **Existing rows:** on its first installation the third migration refuses *any* active normalized rows because their prior owner/timezone cannot be proven from the new snapshot columns. The review snapshot had zero normalized bookings, but that is not a release guarantee. Recount under the freeze; if any active rows exist, stop and obtain owner review and a separately reviewed forward plan. Do not fabricate snapshots, force terminal states, disable triggers or silently delete appointments. If the third migration fails after an earlier migration committed, the entire release is not rolled back. Historical terminal rows are preserved, but a row without a verified snapshot cannot be activated with an unchanged salon/effective date/time: an authorized writer must explicitly reschedule it in the activation write or create a separately reviewed new booking. Changing those values while terminal also clears the old snapshot. Unexpected snapshot columns, incomplete schema and drifted function anchors also stop the migration.
- **Integrations:** inventory website, Android, owner, payment, service-role, bulk/import and third-party writers. Confirm their exact tenant/owner and service identifiers, `READ COMMITTED` isolation, conflict handling and idempotent retries; verify they do not disable triggers or use replication-mode bypass. The overlap trigger is not an authorization, price, service eligibility, schedule, payment or notification validator for raw table writes. Validate those separately and confirm RLS/ACLs. If the normalized schema is entirely absent, installation is explicitly skipped; enabling it later requires a new forward migration and fresh tests, not an assumption that this guard appeared automatically.

### Other operational effects

- The new `studioflow_bookings` conflict trigger serializes direct inserts, moves and active-status/hold changes with the existing per-specialist RPC locks and checks overlapping active holds and confirmations, including across branches. Existing conflicts are not deleted. Resolve any pre-existing overlaps before release. Tattoo guest inserts and owner moves use their own per-artist/day lock and remain unpaid.
- The conflict checks require **READ COMMITTED** for active appointment writes: a transaction at another isolation level fails closed instead of reusing a stale snapshot after waiting. Production's default was `read committed` at review time; check all custom workers, bulk jobs, payment/settlement and integrations for isolation overrides. The third migration also anchor-checks and updates the deployed payment settlement function: it takes the owner lock before testing normalized conflicts and uses wall-clock hold expiry after lock waits, so a late simulated capture records `refund_required` instead of losing that marker to a trigger rollback. A changed or partially patched settlement definition aborts installation. Verify real payment/webhook reconciliation on staging; the synthetic fixture is not a payment or refund. Non-overlapping appointments remain possible; simultaneous different-specialist appointments are restricted by the conservative normalized-owner rule above.
- Existing practice receipts without request fingerprints remain stored but cannot be replayed with the old key. Practice booking requires authentication and creates an isolated zero-price demo record. Template previews use illustrative slots and cannot initiate payment. Iron Ink requests are separate and unpaid.
- Production had no optional Iron Ink branch RPC. If its historical feature is installed later, older definitions can overwrite this repair; review a new forward migration after enabling that feature.

## Safe release sequence

1. **Owner and integration review.** Refresh the 252-row/15-tenant inventory and obtain an explicit outcome for every current shift and day off; reconcile new, changed and deleted rows with the owners. Review normalized menu prices, service IDs/assignments, duplicate staff, owner/salon memberships, timezones and all external writers as described above. Have owners explicitly accept the owner-wide normalized concurrency restriction. Keep the confidential manifest and approvals outside this repository.
2. **Staging and protected dry-run, before production release approval.** On an isolated, target-representative PostgreSQL/Supabase clone with synthetic data, ensure the already-deployed checkout receipt migration is present, apply **all three** exact pending files in order, and run the tests below. Include multi-session normalized/direct/website races, owner and staff transfers, timezones/DST, ACL/RLS, payment-settlement fixtures, the optional Ink branch variant if applicable, external writers and backup recovery. The previously available QA project was empty and was not migrated. Independently run the protected remote migration-history check and `supabase db push --dry-run` against the authorized production target with the exact reviewed SQL sources; inspect the complete output and require exactly the three pending files above in that order. A dry-run lists pending migrations; it does **not** execute or validate their SQL. A skipped Supabase Preview step is not a dry-run.

   **Main-only limitation:** the current protected `Production` workflow runs only on `main`; it cannot dry-run this unmerged PR's pending files. Do not mistake a main dry-run that omits them for the required gate. The existing workflow can run against the exact reviewed release commit only after a separately authorized future merge, and must pass **before approval of the production apply**. If policy requires the dry-run before merge approval, first arrange a separately reviewed, protected, read-only exact-commit mechanism; none is supplied by this PR. Do not expose production credentials to untrusted PR code. This task did not run the protected dry-run and does not authorize a merge or apply.
3. **Separate authorization and freeze.** Only after the staging and exact-source protected dry-run evidence is reviewed, obtain independent production release approval and arrange a maintenance window. Quiesce canonical, normalized and Ink booking/reschedule/status writes, owner schedule/roster edits, organization membership/salon/staff/timezone changes, and external import writers. Coordinate payment captures, webhooks and settlement queues so they are safely paused or buffered without lost events. If writes cannot actually be stopped or the new client cannot be kept inaccessible, stop; no undocumented maintenance flag is assumed.
4. **Backup and frozen preflight.** Take and verify a restorable encrypted full/PITR backup; export shift rows, both appointment ledgers, relevant function/trigger definitions, grants and RLS policies to protected storage. Record the target, exact commit, file checksums, owner manifest and restore point. Re-run the shift inventory above, resolve drift with owners and check current isolation, owner mapping and active data. For example:

   ```sql
   -- Read-only. Run against the specifically reviewed target under the freeze.
   select version,name from supabase_migrations.schema_migrations
   where version in ('20261127140000','20261127140001','20261127140100',
                     '20261127143000','20261127143001','20261127143100','20261127143200') order by version;
   select max(version) latest_applied from supabase_migrations.schema_migrations;
   show default_transaction_isolation;

   -- All effective active/unknown normalized rows prevent first installation;
   -- there is no safe automatic snapshot backfill for historical rows.
   select count(*) active_normalized_rows,
     count(*) filter (where owner_id is null or salon_id is null or staff_id is null
       or (appointment_date is null and booking_date is null)
       or (appointment_date is not null and booking_date is not null and appointment_date<>booking_date)
       or start_time is null or end_time is null or end_time<=start_time) incomplete_rows
   from public.bookings
   where lower(coalesce(nullif(btrim(booking_status),''),nullif(btrim(status),''),'pending'))
     not in ('cancelled','canceled','completed','no_show','expired');

   with owner_counts as (
     select s.id,s.timezone,count(distinct m.user_id) owners
     from public.salons s left join public.organization_members m
       on m.organization_id=s.organization_id and m.status='active' and m.role='owner'
     where s.deleted_at is null group by s.id,s.timezone
   )
   select count(*) salons, count(*) filter(where owners<>1) ambiguous_owner_salons,
     count(*) filter(where timezone is null or nullif(btrim(timezone),'') is null
       or not exists(select 1 from pg_catalog.pg_timezone_names z where z.name=btrim(owner_counts.timezone))) unknown_timezones
   from owner_counts;

   select count(*) active_conflict_pairs from public.studioflow_bookings a
   join public.studioflow_bookings b on a.id<b.id and a.owner_id=b.owner_id and a.stylist_id=b.stylist_id
     and a.starts_at<b.ends_at and a.ends_at>b.starts_at
   where a.status in ('pending','confirmed') and (a.status='confirmed' or a.hold_expires_at is null or a.hold_expires_at>now())
     and b.status in ('pending','confirmed') and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now());
   ```

   Require zero active normalized rows for the first installation; if the count is nonzero, stop for owner review and a separately reviewed forward plan, not an improvised backfill. Investigate ambiguous owners, invalid zones, malformed or overlapping canonical bookings and mapping discrepancies. Confirm the already-applied Resend and checkout versions, all three proposed versions and both archived originals against the target's full history. If the target diverged or a newer migration exists, stop for reconciliation. Compare normalized RPCs, schemas/FKs, trigger ordering and ACLs to the reviewed target, including the checkout triggers and optional Ink branch RPC. Never force `--include-all`, execute archived SQL or alter remote history to make a dry-run pass.
5. **Authorized apply.** After a separately authorized future merge and production approval, use the protected manual `apply_and_deploy` workflow. Its push applies `20261127143001_booking_slot_availability_repair.sql` **before** `20261127143100_iron_ink_availability_ist.sql`, followed by `20261127143200_cross_ledger_booking_conflicts.sql`, then deploys functions and client. Each file is transactional, but the three files are **not one transaction**; index creation and table locks require the freeze. Do not run them manually in the SQL editor or edit migration history. If either later migration fails after an earlier one commits, retain the freeze, inspect the actual ledger and logs, and agree a reviewed forward fix/retry; do not assume earlier commits rolled back.
6. **Reconfirm and validate.** Under the freeze, save only owner-confirmed shifts/day-offs as `workspace`/`direct` using the manifest; leave all others `legacy`. Compare all rows and source totals with the manifest and investigate drift. Verify the three recorded versions, normalized/canonical and identity triggers, snapshot columns, index, function definitions, grants/RLS and optional-feature behavior. Exercise guest/owner availability, both race directions, reactivation, retry/rollback, owner transfer and payment/receipt simulations on authorized synthetic or staging tenants; check for private-row exposure. Do not create real customer bookings, send receipts or make real payments without explicit authorization. Release traffic only after validation; monitor slot loss, conflicts, deadlocks/retries, booking errors and settlement/refund-required alerts.
7. **Recovery.** Keep writes frozen if validation fails. Database/application rollback is a separately reviewed **forward** recovery: use captured pre-release definitions, triggers and ACLs in a new migration, coordinate the client rollback, and account for any bookings/payments made after release. A forward recovery must handle the cross-ledger guard and snapshots explicitly; do not blindly drop snapshot/provenance columns, delete rows, overwrite later edits, disable triggers or change migration history. A full backup/PITR restore is a last resort under the incident runbook and needs separate authorization.

## Reproducible verification

`npm test` runs typechecks, build, the offline verifiers and Node tests. `node scripts/verify-normalized-booking-ids.mjs`, `node scripts/verify-booking-slot-availability.mjs`, `node scripts/verify-ink-availability-ist.mjs` and `node scripts/verify-multibranch-migration.mjs` are sequential PGlite checks; they cannot establish concurrency. The backend-only offline replay also checks that a wholly absent normalized schema is skipped and a partially installed schema fails. It does not model the complete production catalog.

The dedicated CI job and `scripts/verify-postgres-booking-concurrency.mjs` use **real PostgreSQL**, the actual deployed checkout-receipt migration, all three pending migrations in order, and independent sessions. The harness creates/drops a random database and may temporarily create/drop the `anon`, `authenticated` and `service_role` cluster roles: use a wholly disposable local superuser server only. It requires both the connection host and the server's reported address to be loopback, and an explicit acknowledgement. On Linux, for example, use host networking so PostgreSQL itself sees a loopback connection (a normal Docker bridge has a non-loopback server address):

```sh
docker run --rm -d --name studioflow-booking-test-pg --network host \
  -e POSTGRES_PASSWORD=disposable-test-only postgres:17 \
  -c listen_addresses=127.0.0.1 -c port=55432
# Wait until: docker exec studioflow-booking-test-pg pg_isready -U postgres -h 127.0.0.1 -p 55432
STUDIOFLOW_TEST_POSTGRES_URL='postgresql://postgres:disposable-test-only@127.0.0.1:55432/postgres' \
  STUDIOFLOW_DISPOSABLE_POSTGRES=yes node scripts/verify-postgres-booking-concurrency.mjs
docker stop studioflow-booking-test-pg
```

On other platforms use a disposable PostgreSQL instance that reports a loopback server address, rather than a bridged container. The test was run on PostgreSQL 17.6; CI uses PostgreSQL 17. It demonstrates the old cross-ledger race and verifies actual lock waits and post-commit visibility in both winner directions, normalized-vs-normalized and multi-row writes, rollback, adjacency, different owners, direct owner/service-role writes, RLS/ACLs, cancellation/reactivation and holds, owner/salon/staff moves, timezone snapshots and DST, unsafe isolation, replay and schema-drift failures. It also exercises canonical web/Android/direct conflicts, reschedules, retries, practice receipts, unpaid Ink requests and checkout settlement fixtures, including a negative control and simulated capture that expires during a real cross-ledger lock wait and persists `refund_required`. The tenant data and Supabase surface are synthetic: no remote dry-run, live booking, real payment or receipt delivery is proven.

The Preview CI also runs `scripts/verify-booking-preview-browser.mjs` against all 16 direct templates and the directory guest flow. It intercepts external traffic and uses synthetic catalogue, slots, recommendation and payment-capability fixtures; the clinic preview intentionally fails closed while prices are unverified. No real booking or payment is submitted. The matrix supports an explicit loopback-only local mode for UI diagnostics:

```sh
STUDIOFLOW_BOOKING_BROWSER_LOCAL=1 PREVIEW_URL='http://127.0.0.1:PORT' \
  PLAYWRIGHT_PACKAGE_ROOT='/path/to/pinned-playwright-install' \
  node scripts/verify-booking-preview-browser.mjs
```

Start an isolated local build separately, replace `PORT`, and use synthetic fixtures only. For hosted runs omit the local flag, use the reviewed HTTPS Vercel Preview URL, and supply the automation bypass secret only through the protected environment when needed. The browser matrix is a flow/coverage check, not a latency benchmark.

## Performance evidence and release gate

The checked-in `scripts/verify-nexora-interaction-responsiveness.mjs` is a **hosted Vercel Preview** audit, with a synthetic Event Timing p75 target of **200 ms** when Chromium supplies entries. It checks the homepage, template iframe and signup interactions; it is not real-user INP or a database load test. For a repeatable hosted check use the Preview workflow's pinned Playwright environment, or run:

```sh
PREVIEW_URL='https://REVIEWED-PREVIEW.vercel.app' \
  PLAYWRIGHT_PACKAGE_ROOT='/path/to/pinned-playwright-install' \
  node scripts/verify-nexora-interaction-responsiveness.mjs
```

The hosted Preview job passed on the previous pushed head `b0211db`; a fresh release head must pass again. Record the numeric p75 and number of Event Timing entries from the job; if Chromium reports no supported samples, the p75 assertion is skipped and performance is **not** established merely by a green job.

The earlier sandbox **local adaptation** changed a scratch copy to permit loopback, used packaged Chromium and fulfilled external assets locally; it replaced the p75 assertion with diagnostic logging. Two runs reported p75 of **880 ms** and **1472 ms** with aborted assets, and a later diagnostic reported **1544 ms** with zero failed requests. All exceed the 200 ms target; the scratch diagnostic's printed `PASS` is not a threshold pass. The local fixture, CPU and network differ from hosted Preview, so these results are not directly comparable and neither proves field performance. Do not weaken the checked-in hosted gate to make a local result green; investigate repeatable regressions and document the release owner's decision.

Separately load-test the SQL and external writer paths on representative staging data and traffic before approval: size the normalized owner/index data, simulate multiple specialists and concurrent slots, measure availability-query and commit p50/p95/p99, owner-lock waits/deadlocks, database CPU and index-build/lock duration, and compare with agreed service budgets. The real-PG race fixture verifies correctness, not capacity. After an authorized rollout, monitor real-user and backend metrics independently; no production performance conclusion follows from these synthetic tests.
