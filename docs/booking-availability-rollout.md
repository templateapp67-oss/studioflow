# Booking availability repair: production rollout and review

## Status and release scope

PR #191 is **not merged**. The following migrations are **pending, not approved or applied to production**. Ship the database and matching client together; the directory's branch-aware practice-booking RPC does not exist until the first migration is applied.

1. `20261127143001_booking_slot_availability_repair.sql` repairs shared website/directory/Android/men's availability, records branch-shift provenance, repairs the optional normalized catalogue RPC and owner assignment writer, and adds an appointment conflict guard. Its original, unapplied filename was `20261127140001_booking_slot_availability_repair.sql`.
2. `20261127143100_iron_ink_availability_ist.sql` follows it and repairs the separate, unpaid Iron Ink request flow. Its original, unapplied filename was `20261127140100_iron_ink_availability_ist.sql`. It only replaces the optional branch RPC if already installed; it does not install that feature.

**Why the versions changed:** read-only production migration history confirmed the unrelated `20261127140000_studioflow_resend_transactional_email.sql` and newer `20261127143000_studioflow_web_checkout_receipts.sql` are applied, while the original two booking versions are absent. Leaving the original versions in the active directory would put them before the latest applied migration and block the normal protected push. The two booking files have therefore been retimestamped, in the same order, **without changing their SQL**. Their original copies are preserved under `supabase/reconciled-migrations/` and their matching SHA-256 hashes are checked by the release-plan verifier. Never run the archived copies or both versions. No booking migration was applied or recorded as applied during this reconciliation.

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

The normalized `public.bookings` ledger is separate from `studioflow_bookings`. This RPC is availability-only; this repository does not provide a normalized customer booking-write RPC joining those ledgers. Do **not** claim that a normalized read reserves a slot or that the PostgreSQL race tests prove conflicts across the two independent ledgers. Review any external normalized writers before relying on that integration.

### Other operational effects

- The new `studioflow_bookings` conflict trigger serializes direct inserts, moves and active-status/hold changes with the existing per-specialist RPC locks and checks overlapping active holds and confirmations, including across branches. Existing conflicts are not deleted. Resolve any pre-existing overlaps before release. Tattoo guest inserts and owner moves use their own per-artist/day lock and remain unpaid.
- The conflict checks require **READ COMMITTED** for active appointment writes: a transaction at another isolation level fails closed instead of reusing a stale snapshot after waiting. Production's default was `read committed` at review time; check all custom workers, bulk jobs, payment/settlement and integrations for isolation overrides. Existing payment settlement retains its `refund_required` handling for an expired/contended hold. Non-overlapping appointments and unrelated specialists remain possible.
- Existing practice receipts without request fingerprints remain stored but cannot be replayed with the old key. Practice booking requires authentication and creates an isolated zero-price demo record. Template previews use illustrative slots and cannot initiate payment. Iron Ink requests are separate and unpaid.
- Production had no optional Iron Ink branch RPC. If its historical feature is installed later, older definitions can overwrite this repair; review a new forward migration after enabling that feature.

## Safe release sequence

1. **Approval and freeze.** Keep PR #191 open until normal code review and an independently authorized future merge. Review the manifest with all 15 affected tenant owners, arrange coverage for unconfirmed rows, and agree a maintenance window. Quiesce booking/reschedule writes **and owner schedule edits** throughout backup, migration and reconfirmation. If the team cannot actually stop those writes or safely keep the new client inaccessible, stop; do not assume an undocumented maintenance flag exists.
2. **Backup and preflight.** Take and verify a restorable encrypted full/PITR backup; additionally export the shift rows, relevant function/trigger definitions, ACLs and RLS policies to protected storage. Record the target project, exact commit and review manifest. Run the inventory again and reconcile every changed/new/deleted row with its owner. Check current isolation and existing active overlap pairs; investigate any pair before proceeding:

   ```sql
   select version,name from supabase_migrations.schema_migrations
   where version in ('20261127140000','20261127140001','20261127140100',
                     '20261127143000','20261127143001','20261127143100') order by version;
   show default_transaction_isolation;
   select count(*) active_conflict_pairs from public.studioflow_bookings a
   join public.studioflow_bookings b on a.id<b.id and a.owner_id=b.owner_id and a.stylist_id=b.stylist_id
     and a.starts_at<b.ends_at and a.ends_at>b.starts_at
   where a.status in ('pending','confirmed') and (a.status='confirmed' or a.hold_expires_at is null or a.hold_expires_at>now())
     and b.status in ('pending','confirmed') and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now());
   ```

   Verify Resend and checkout receipts are already recorded and both original and retimestamped booking versions are absent; investigate any divergence, including newer applied history. Compare `nexora_customer_booking_options`, `nexora_save_owner_workspace`, `nexora_catalog_uuid`, table columns/FKs, booking/Ink/checkout triggers, role grants and optional Ink branch RPC to the reviewed target. The protected workflow's `dry_run` checks remote migration history and runs `supabase db push --dry-run`; inspect its entire pending list and stop if it includes anything other than the two approved retimestamped migrations in the order above. A dry-run lists pending migrations; it does not execute them. Never use `--include-all` to force the archived older versions or repair the ledger by hand.
3. **Staging gate.** On an isolated PostgreSQL/Supabase clone representative of the target, with synthetic tenant data only, ensure the checkout receipt migration is already present, then apply both actual retimestamped booking files in order and run the automated suites below. Include checkout settlement and pay-at-venue, the optional Ink branch variant if the target has it, role/RLS checks, normalized catalogue callers, owner schedule reconfirmation, Android/website/men's bundles and coupon retries, practice bookings, reschedules and unpaid tattoo requests. Rehearse backup restoration and the recovery steps. The available QA project was empty at review time and was not migrated.
4. **Authorized apply.** After separate production approval and a future approved merge, use the protected manual `apply_and_deploy` release workflow. Its database push applies all pending versions in timestamp order: first `20261127143001` (the original `20261127140001` repair), then `20261127143100` (the original `20261127140100` repair); it then deploys functions and client. Both SQL files are transactional, but **not a single shared transaction**. Keep the agreed traffic freeze in place through reconfirmation and validation. Do not execute either file manually in the SQL editor or modify migration history. If the second fails after the first commits, keep the freeze, inspect the ledger and logs, and agree a reviewed forward fix/retry; do not assume both rolled back.
5. **Reconfirm and validate.** Under the freeze, save only owner-confirmed shifts/day-offs as `workspace`/`direct` using the manifest. Leave all others `legacy`; check every row and investigate count/value drift, missing staff/branches, cross-tenant mismatches and errors. Run the inventory again and group by `site_id,schedule_source`; compare it to the approved manifest. Verify both migration versions, function/trigger definitions and grants; check guest/owner availability on approved synthetic or staging tenants, no private-row exposure, real slot/appointment conflicts and request retries. Confirm no unexpected booking or payment writes occurred. Do not create real customer bookings or payments as a smoke test without authorization. Then release traffic, notify affected owners and monitor booking errors, slot disappearance, conflicts and settlement/refund-required alerts.
6. **Recovery.** If validation fails, keep traffic quiesced. Database/application rollback is a separately reviewed **forward** recovery: use captured pre-release definitions and ACLs in a new migration, coordinate the client rollback, and account for any post-release bookings/payments. Retain the provenance column and reconciled rows; do not drop it, truncate/reload shifts, overwrite later edits, or change migration history blindly. A full backup/PITR restore is a last resort under the incident runbook and requires explicit authorization.

## Reproducible verification

`node scripts/verify-normalized-booking-ids.mjs`, `node scripts/verify-booking-slot-availability.mjs`, `node scripts/verify-ink-availability-ist.mjs` and `node scripts/verify-multibranch-migration.mjs` run sequential disposable PGlite tests; the optional Ink branch schema is exercised there. `npm test` runs the broader typechecks, build and offline verification suites. The Preview CI job also runs `scripts/verify-booking-preview-browser.mjs` against all 16 direct templates and the directory guest flow, and the interaction audit checks the homepage iframe. The browser matrix intercepts external traffic and uses synthetic catalogue, slot, recommendation and payment-capability fixtures, so it cannot verify a live salon, production availability, payment or delivery. The default clinic preview intentionally fails closed while its prices remain unverified.

The dedicated CI job and `scripts/verify-postgres-booking-concurrency.mjs` use **real PostgreSQL**, the actual deployed checkout-receipt migration, both retimestamped pending migrations and independent sessions. The harness creates/drops a random database and may temporarily create/drop the `anon`, `authenticated` and `service_role` cluster roles: use a wholly disposable local superuser server only. It requires both the connection host and the server's reported address to be loopback, and an explicit acknowledgement. On Linux, for example, use host networking so PostgreSQL itself sees a loopback connection (a normal Docker bridge has a non-loopback server address):

```sh
docker run --rm -d --name studioflow-booking-test-pg --network host \
  -e POSTGRES_PASSWORD=disposable-test-only postgres:17 \
  -c listen_addresses=127.0.0.1 -c port=55432
# Wait until: docker exec studioflow-booking-test-pg pg_isready -U postgres -h 127.0.0.1 -p 55432
STUDIOFLOW_TEST_POSTGRES_URL='postgresql://postgres:disposable-test-only@127.0.0.1:55432/postgres' \
  STUDIOFLOW_DISPOSABLE_POSTGRES=yes node scripts/verify-postgres-booking-concurrency.mjs
docker stop studioflow-booking-test-pg
```

On other platforms use a disposable PostgreSQL instance that reports a loopback server address, rather than a bridged container.

It exercises normalized owner sync and catalogue IDs on PostgreSQL, demonstrates the old direct-write race as a negative control, then checks blocked concurrent web/Android/direct bookings, rollback, identical real and practice request retries, adjacent slots, different staff, rescheduling, expired-hold reactivation, and overlapping unpaid tattoo requests/owner moves. After applying the already-deployed checkout migration in the fixture, it also checks venue confirmation, simulated full-payment settlement/receipts and an expired captured payment requiring a refund while another booking wins. It verifies READ COMMITTED behavior and rejects unsafe isolation. The test was run locally on PostgreSQL 17.6; the CI service uses PostgreSQL 17. The normalized/branch fixture and Supabase services are synthetic, not a full production clone. The harness does not perform a remote migration dry-run, production write, real payment, receipt delivery, or cross-ledger normalized booking test.
