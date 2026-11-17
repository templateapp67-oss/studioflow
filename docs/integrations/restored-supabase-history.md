# StudioFlow WhatsApp migration reconciliation

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
