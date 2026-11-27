# StudioFlow / NEXORA Security Center — Staging review package v2

Baseline StudioFlow repository commit: `6fac45f8bb2b75c68d86bce98dffe44a78fce634`. This updated package contains the original defensive code and additive migrations for the remaining requested staging features. No repository, deployment, production database, DNS configuration, live scan or external message was changed.

## Where to start

1. Read `BLOCKED/sign-off.md` and record the six approval decisions.
2. Run the read-only commands from `NOT-VERIFIED/live-checks.md` under your authorized accounts. Send only a redacted copy of `NOT-VERIFIED/redacted-results.md`.
3. Use `STAGING/integrate.md` for the isolated checkout, Supabase migration order, React mount points, DNS monitor service and staging acceptance. Do not apply these migrations to production during this review.

| Status | Delivered | Still requires evidence or approval |
|---|---|---|
| GAP | Original DNS TXT, scoped jobs, owner/admin controls and audit, plus platform case creation, queue, lifecycle, version checks, independent approver closure, and separate audit. PDF/JSON attachments use the same report authorization. DNS monitor supports TXT ownership rechecks, optional approved-zone NS drift, reminders, revocation and in-app inbox. React entry and route examples are included. | Confirm the tenant model and admin role assignments. Wire the staging routes and verify the actual app build. Approve pilot hosts, zone baselines and the scheduler. |
| RISK | Non-root offline worker Compose, read-only Docker isolation validator, digest/signature/attestation/SBOM procedure and written vendor/counsel sign-off record. No autonomous PentAGI integration included. | Verify real host settings and behavioral containment in disposable staging. Obtain written license clarification and counsel approval against the exact container artifact. |
| BLOCKED | Six-item staging approval form and recommended provisioning defaults. | Confirm canonical tenancy, admin roles, pilot scope, retention/legal hold, private infrastructure and budget, and commercial decision. |
| NOT VERIFIED | Read-only Vercel, Supabase and Docker instructions and a redacted results form. | Production state, network controls, current runtime images, monitoring and alerting. These were not accessed. |

## Code layout

- `GAP/api/` and `GAP/server/`: authenticated Node API, fixed DNS observations, platform and alert operations, and an attachment generator. PDF uses standard fonts and escapes unsupported characters to explicit Unicode code points. JSON preserves full Unicode. Report bodies contain no raw headers or credentials.
- `GAP/supabase/migrations/`: install in timestamp order. The core migration ties each domain claim and job to the authenticated owner, provisions the initial tenant from `studioflow_websites.owner_id`, and removes caller-supplied actor identity from the restricted result RPC. Additional migrations create admin-only platform records/audit, restrict DNS monitor execution to an independent role, and add controlled retention. Default table access is denied. Only the designated RPCs grant access. The staged defensive application intake remains stopped until approved.
- `GAP/src/components/security/`: owner and admin views, PDF/JSON buttons, DNS alerts and case workflow. The entry hook uses the existing authenticated session and fetches server capabilities before mounting.
- `GAP/ops/`: private DNS monitor entry point and optional systemd service/timer. Disabled by default. TXT and optional zone NS read-only DNS queries are made only for explicitly enrolled domains using configured resolvers. No HTTP, network discovery or external alert delivery.
- `RISK/`: existing offline normalizer and new host/provenance validation, SDK/license evidence and vendor/counsel templates.

## Configuration

| Server configuration | Staging setting |
|---|---|
| `SECURITY_CENTER_ENABLED` | Omit or use `false` until staging authorization. An independent DB flag controls DNS request intake. |
| `SECURITY_CENTER_SUPABASE_URL`, `SECURITY_CENTER_SUPABASE_PUBLIC_KEY` | Isolated Supabase project URL and publishable key. |
| `SECURITY_CENTER_WRITER_DATABASE_URL` | Private TLS connection for dedicated login assigned `nexora_security_writer`. The URL disallows query options. |
| `SECURITY_CENTER_DNS_WATCH_ENABLED` | Omit or use `false` until isolated scheduler and DNS scopes are approved. |
| `SECURITY_CENTER_DNS_MONITOR_DATABASE_URL` | Private TLS connection for dedicated login assigned `nexora_security_dns_monitor`. |
| `SECURITY_CENTER_DATABASE_CA` | Approved PEM CA when the system trust store does not trust the DB endpoint. |
| `SECURITY_CENTER_DNS_RESOLVERS` | One to three approved recursive DNS IPs, used with a provider-enforced network allowlist. |
| `EVIDENCE_IMAGE`, `PYTHON_IMAGE` | Separate digest-qualified registry references for the offline normalizer and its optional build. |

Use the restricted `nexora_security_maintenance` role for `nexora_sec_maintenance()` and, after retention approval, `nexora_sec_platform_retention()`. DBA must review inherited existing PostgreSQL PUBLIC grants for every restricted login. Preserve audit-safe case references and do not include private records or credentials in case summaries. Reviewed platform cases hold manual evidence summaries only.

## Reproducible local checks

```bash
npm ci
node --test tests/securityCenter.test.mjs tests/dnsWatch.test.mjs tests/reportPdf.test.mjs tests/database.test.mjs
printf '%s' '{"code":"dns_proof_present"}' | python3 -B RISK/normalizer.py
```

Disposable PostgreSQL tests simulate Supabase JWT claims and validate code and database behavior, including access denial, retention permissions, revocation and workflow concurrency guards. These do not establish deployed Supabase behavior. Run real PostgREST and browser acceptance only in staging. No Docker host or live endpoint is needed to rerun the local tests.


PentAGI execution is not implemented in this release. Keep `SECURITY_CENTER_PENTAGI_ENABLED=false`; no API action starts PentAGI, Docker containers, commands, or autonomous assessments.
