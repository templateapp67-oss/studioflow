# NEXORA SALONOS landing page — security report

**Scope:** the public marketing pages, the demo-request flow, the landing data layer and the deployment
configuration. **Project:** `zilwgiuiygqqardzutxi` (ap-northeast-1, PostgreSQL 17).

---

## 1. Threat model of the changed surface

| Asset | Exposure | Control |
|---|---|---|
| Visitor PII submitted through the demo form | public endpoint | Edge Function validation, honeypot, DB-backed rate limit, private table, consent timestamp, retention window |
| Supabase service-role credential | server only | never in `VITE_*`, never in the browser bundle, never logged, host-only diagnostics |
| CRM credential | server only | `NEXORA_CRM_LEAD_TOKEN` is sent from the server only and only to an HTTPS endpoint without embedded credentials |
| Lead register | privileged | `anon` has no grant; `authenticated` reads only through the manager policy; audit trail for every workflow change |
| Published marketing content | public read | every public query applies its own `is_published` / `is_active` filter in addition to the policy |

## 2. Findings and fixes

### SEC-01 — A rewritten HTML response could fake a successful lead (P0, fixed)

* **Component:** `src/components/nexora-pricing/DemoProvider.tsx`
* **Steps:** request `/api/nexora-demo-lead` through a rewrite that answers `200 text/html` → the old code parsed
  the body with `response.json().catch(() => ({}))`, saw `response.ok === true` and confirmed the request.
* **Root cause:** the client trusted the HTTP status instead of the confirmed `{ ok: true }` contract.
* **Fix:** `src/lib/nexoraLeadSubmission.ts` requires a JSON content type, a parsable body, `ok === true` and a
  successful transport, and aborts after 15 s.
* **Test:** `node scripts/verify-nexora-lead-submission-client.mjs` — HTML 200, empty body, malformed JSON,
  `ok:false`, 429, 5xx, transport failure, timeout and network error all report a failure.

### SEC-02 — Two runtimes, one validation path (P0, fixed)

`server/nexoraDemoLead.ts` is the only implementation. `api/nexora-demo-lead.ts` (Vercel) and the Express route
in `server.ts` both call it, so the validation, honeypot, rate-limit delegation, status mapping and redaction
cannot drift between deployments.

### SEC-03 — Duplicate submissions (P0, fixed)

`idempotency_key` (unique partial index) collapses a retry onto the stored row. Verified live: two identical
requests produced exactly one row.

### SEC-04 — Rate limiting that survives serverless instances (P0, fixed)

The counter lives in `public.landing_lead_rate_limits` and is shared by every function instance
(`register_landing_lead_attempt`, 5 attempts / 600 s). Only a salted SHA-256 hash of the client address is
stored, the salt lives in `LANDING_LEAD_RATE_LIMIT_SALT`, and expired rows are pruned. The raw address is never
written to the register. The first-party server route is a trusted caller and is governed by the server-side
limit instead of the shared per-address bucket.

### SEC-05 — A privileged key in a browser variable (P0, fixed)

`src/lib/nexoraEnv.ts` rejects `sb_secret_…` and service-role JWTs in `VITE_*` variables before the client is
created, and `scripts/verify-nexora-env.mjs` asserts that no browser source reads `SUPABASE_SERVICE_ROLE_KEY`.

### SEC-06 — Silent fallback to another project (P0, fixed)

A malformed `VITE_SUPABASE_URL` or `SUPABASE_URL` fails fast with a message that names the host only. A valid
override is reported by host (`project=… serviceKey=configured|missing crm=…`) and never prints a key.

### SEC-07 — Public read of the lead register (P1, fixed and live-verified)

```
select has_table_privilege('anon','public.landing_leads','select');   -- false
select has_table_privilege('anon','public.landing_leads','insert');   -- false
select has_table_privilege('anon','public.landing_lead_audit','select'); -- false
```

`anon` has no grant at all; `authenticated` may read a lead only through
`public.can_manage_landing_leads()`, which reads the server-controlled `app_metadata.site_role`. The browser never
performs a direct insert.

### SEC-08 — Authorisation from user-editable data (P1, fixed)

`scripts/verify-nexora-admin-leads.mjs` proves that a caller who sets `site_role` in `user_metadata` is refused
with 403, while the same claim in `app_metadata` is accepted.

### SEC-09 — Privileged helper functions (P1, fixed)

The audit trigger and the retention purge live in the private schema `nexora_private`
(`revoke all … from public, anon, authenticated`), pin `search_path = ''` and are executable by `service_role`
only. Nothing privileged was added to `public`.

### SEC-10 — Losing a lead through a CRM outage (P1, fixed)

The lead is stored first; the CRM forward happens afterwards and only updates `crm_delivery_state`,
`crm_attempts`, `crm_last_error_code` and `crm_last_attempt_at`. A failure never deletes the lead.

### SEC-11 — PII in the logs (P2, fixed)

The shared handler logs a request id and the outcome only. `scripts/verify-nexora-demo-lead.mjs` asserts that no
logged line contains the visitor name, the business name, the email address or the credential.

### SEC-12 — Retention and erasure (P1, fixed)

`retention_expires_at` is set 180 days after creation, the purge function is privileged, managers can erase a
request through the server route, and the published privacy notice states the window and the deletion route.

## 3. Verified configuration

| Check | Result |
|---|---|
| CSP and security headers | asserted by `scripts/verify-security-policy.mjs` (unchanged from the base commit) |
| CORS of the Edge Function | `https://nexorasalon.online`, `https://www.nexorasalon.online`, `http://localhost:5173`, `http://localhost:3000` |
| Body limits | 16 KiB on the Edge Function, JSON content type required, length limits on every field |
| Method handling | `POST` only on the Edge Function and on both server routes; `GET` answers 405 |
| Error leakage | generic messages; internal codes only in server logs |
| Dependency review | `npm audit` — see `NEXORA-LANDING-TEST-REPORT.md` |

## 4. Residual risks

* The manager role is granted through `app_metadata.site_role`; a deployment that grants this role to a
  compromised account exposes the register to that account. Role assignment is an operational task outside this
  change.
* The rate limit is per address hash: a shared office address can reach the limit for several visitors.
* Turnstile is supported by the Edge Function but is not configured in this environment, so only the honeypot and
  the rate limit protect the endpoint.
