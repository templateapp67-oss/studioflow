# StudioFlow WhatsApp migration reconciliation

> Historical 17 November reconciliation, not the current release plan. Counts,
> pending versions, account access and workflow details below describe that
> earlier review. For the current booking release, including the three ordered
> pending migrations and protected gates, use [the booking rollout runbook](../booking-availability-rollout.md)
> and `restored-supabase-history.json`. Do not apply the historical two-file plan.

The owner supplied both the applied migration history and a read-only live
catalog export for project `zilwgiuiygqqardzutxi`. The live catalog was captured
at 2026-11-17 06:05:08 UTC and still records the same 167 applied versions.
It contains 391 relevant function definitions and 273 relation definitions.
The full live export is not committed; the manifest records its digest and
review results. No customer rows or Vault secret values were requested.

## Resolved history

Restore 154 missing applied files, preserving their original SQL apart from
statement separators and whitespace-only blank-line formatting. The other 13
applied files are unchanged. All 167 applied versions now exist exactly once.
Their recorded hashes are enforced by `verify-supabase-applied-history.mjs`.

Eight proven duplicate local timestamp aliases were removed, with test and
document references changed to the canonical applied files. PostgreSQL parsing
and token comparison preserved quoted values and tokenized function bodies.
`reconciled_aliases` records each mapping and original source hash.

## All 26 previously unrecorded versions classified

| Count | Resolution |
| --- | --- |
| 8 | Proven applied aliases removed from the active directory. |
| 15 | Unapplied template, academy, promotion, catalogue, booking and legacy public-policy drafts preserved unchanged in `supabase/pending-features`. They have absent dependencies or would replace different live contracts. They are excluded from this WhatsApp release. |
| 1 | Alternate test-ledger draft preserved outside auto-deploy. The live canonical service-only helper already uses `studioflow_whatsapp_test_rate_limits`; creating a second private counter table would diverge from it. |
| 1 | Missing shared booking-email rate limiter moved unchanged to a new CLI-generated timestamp after the applied history. Its table/functions are confirmed absent in the live export. |
| 1 | The additive optional-profile and Vault-helper grant repair remains an explicitly pending WhatsApp runtime migration. |

The 15 deferred feature/security files have not been applied, marked applied, or represented as
working live features. Their source remains available for a separate feature
rollout. Tests exercising those standalone feature designs read the preserved
source explicitly; passing those tests is not evidence of live feature availability.

The active migration directory contains 169 versioned files: the 167 recorded
applied files plus exactly these two legitimate pending changes:

- `20261116100000_nexora_whatsapp_optional_profiles.sql`
- `20261117061129_studioflow_shared_edge_rate_limits.sql`

No pending version predates the recorded live history. No old function body is
replayed solely to satisfy a filename check. `verify-whatsapp-release-plan.mjs`
checks the active plan and ensures all deferred source is preserved by hash.

## Historical worker references

Four historical worker dependencies in three applied files do not have source
in this repository. Their exact paths, names and immutable applied-file hashes
are inventoried. The Edge guard still rejects unlisted endpoints, changed SQL,
new migrations and active application callers without source. Authentication
checks remain enabled. These historical worker deployments are unverified;
this inventory does not make food/recruitment/legacy customer workers live.

## Validation and release gates

Offline checks execute the canonical WhatsApp ledger plus helper rename, prove
service-only rate limiting, exercise optional/missing profile fields, verify
owner isolation, and validate the shared rate-limit counter. The full CI suite
also checks source/Edge types, production build and the preserved feature contracts.

A remote migration dry-run has not been executed from this session: the connected
Supabase account cannot access this project. The existing Production workflow
runs its migration dry-run after this migration-changing PR is merged; that
workflow does not automatically apply migrations or deploy on that push. An
independently configured Supabase GitHub integration may still apply migrations
according to its own project settings, which this session could not inspect. Actual apply and
production deployment require its explicit `release_mode=apply_and_deploy` release mode. That mode
now deploys the five reviewed WhatsApp/payment/email Edge Functions after the DB
apply succeeds, before Vercel deployment. It uses per-function JWT settings,
never prunes other functions and checks the target project reference. The QA
booking endpoint validates its dedicated API key in its handler; its gateway
JWT setting is disabled only for that endpoint. The owner connect endpoint
retains gateway JWT verification.

Do not reset the database, edit applied history, mark deferred drafts applied,
or use `--include-all` to force old source into production. After the dry-run
shows only the two pending migrations, apply through the normal release process,
deploy the required Edge Functions, and verify real Meta sender/booking/payment
behavior. CI passing and merging this PR do not establish a live WhatsApp connection.

## One release selection

Production now has a single `release_mode` dropdown instead of two booleans.
`dry_run` validates migrations without applying or deploying anything.
`apply_and_deploy` runs the dry-run, applies pending SQL, deploys the reviewed
Edge Functions, then deploys the website. `deploy_only` deploys only the website.
The default is `dry_run`; invalid modes fail validation before a release job.
The new selector appears on main only after this PR is merged.

## Supabase target project reference

Production Run #22 failed at `Validate Supabase migration credentials` with
`SUPABASE_PROJECT_REF does not match this repository's reviewed StudioFlow project.`
The `production-db` secret was verified (read-only, without printing its value) to
be 21 bytes: one leading tab plus the correct 20-character reference, while
`vars.SUPABASE_PROJECT_REF` was unset. The stored project was therefore never
wrong; only the surrounding tab was. The failure mode is now handled explicitly:

- The `migrate` job declares `REVIEWED_SUPABASE_PROJECT_REF: zilwgiuiygqqardzutxi`
  as reviewed workflow configuration, so the public project id no longer has to
  live in a GitHub secret.
- The validation step reads `vars.SUPABASE_PROJECT_REF` and
  `secrets.SUPABASE_PROJECT_REF` separately (in the `production-db` environment,
  environment-scoped values override repository ones), trims only surrounding
  ASCII whitespace, warns when it had to trim, and rejects whitespace-only
  values, internal whitespace, URLs/hostnames, conflicting variable/secret
  values, and any unexpected reference.
- The validated reference is emitted as `steps.supabase_credentials.outputs.project_ref`
  and that single value feeds `supabase link`, the migration dry-run, migration
  apply and the Edge Function deployment, so a raw malformed secret can never
  reach a hosted call.
- The literal project guard (`$SUPABASE_PROJECT_REF" != "zilwgiuiygqqardzutxi"`)
  remains in place, and tokens/passwords are never echoed.

Verified before merge: the corrected validation script was executed unchanged in
a temporary, read-only GitHub Actions job bound to the real `production-db`
environment (no Supabase CLI call, no hosted operation). It emitted
`project_ref` with length 20 equal to the reviewed reference and logged
`::warning::Trimmed leading tab from secrets.SUPABASE_PROJECT_REF ...`.
Diagnostic log lines deliberately avoid echoing the literal reference, because
GitHub masks that literal inside a tab-prefixed secret and the log would read
`***`.

Cleanup: optional. Re-save the value without surrounding whitespace
(Settings → Environments → `production-db` → Environment secrets →
`SUPABASE_PROJECT_REF`, expected value `zilwgiuiygqqardzutxi`) to silence the
warning. A wrong-reference error means the stored value is a different project;
do not work around it.

## Edge Function deployment gap found while verifying stages

Verifying the stages after Run #22 (read-only Supabase queries, no production
migration) showed the reviewed migration set was already complete: the remote
`schema_migrations` table records **169** versions and the repository contains
exactly the same 169, with no difference in either direction. Nothing was
pending, so no migration was applied.

One real gap existed in the function set. The Production workflow deploys five
functions, but `supabase/config.toml` only declared four of them. The Supabase
CLI falls back to the gateway default `verify_jwt = true` for any function
without a block, which would have silently broken `studioflow-booking-emails`:
its browser client sends a CORS preflight and its status probe uses `GET`, and
neither carries an `Authorization` header. The handler already performs its own
`Auth getUser()` check, an RLS-scoped booking read, and a stored-recipient
binding, so the gateway check must stay off.

- `supabase/config.toml` now declares `[functions.studioflow-booking-emails]`
  with `verify_jwt = false`.
- `scripts/verify-production-release-modes.mjs` now fails if the Production
  deploy list contains a function with no `config.toml` entry, or if any of the
  reviewed JWT settings change (the two provider endpoints and the QA booking
  endpoint stay `false`; `nexora-whatsapp-connect` stays `true`). The guard was
  confirmed to fail against the previous config and pass against the fix.

That function was then deployed to the reviewed project as version 2 with
`verify_jwt: false` and verified live: `GET` returns
`{"status":"ok","service":"studioflow-booking-emails","mode":"unconfigured"}`
without an authorization header, which is exactly the contract that the missing
config block would have broken. `configured` is `false` because
`RESEND_API_KEY` is not set in the project's Edge secrets, so the function
reports "email delivery is not configured" (503) rather than pretending to send;
no email has been delivered.

Residual, unchanged by this work: the Production workflow applies Edge secrets
nowhere. Adding `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to the Supabase project
secrets is a separate, deliberate step that must not be done with a value that
is not already stored in a reviewed secret store.
