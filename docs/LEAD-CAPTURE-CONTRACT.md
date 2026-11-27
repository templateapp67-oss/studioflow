# Lead-capture end-to-end contract

`POST /api/nexora-demo-lead` is one code path shared by the Express server
(`server.ts`) and the Vercel Node function (`api/nexora-demo-lead.ts`). Both
mount `nexoraDemoLeadHandler` (`server/nexoraDemoLead.ts`) behind the strict
`DEMO_LEAD_SCHEMA` (`strictBody` on Express; `validateBody` inside the handler).
The handler never writes to the private `public.landing_leads` table directly;
it calls the Supabase Edge Function `submit-landing-lead` with the service role,
and that function is the only writer.

```
browser ──▶ /api/nexora-demo-lead (Express / Vercel — same handler, same schema)
           ──▶ honeypot short-circuit · per-IP shared budget (5 / 600s, salt-hashed)
           ──▶ submit-landing-lead (Supabase Edge Function)
                 ──▶ honeypot again (indistinguishable 200, nothing stored)
                 ──▶ shared per-IP budget (claim_landing_lead_rate_limit, salt required)
                 ──▶ Turnstile siteverify — fail-closed:
                     missing secret, missing token, timeout, non-200, or
                     success !== true  ⇒  403, nothing stored
                 ──▶ schema allow-list validation (lead_type, phone, email, …)
                 ──▶ INSERT into public.landing_leads   ← 2xx only after the row exists
                 ──▶ optional CRM forward (failure never drops the stored lead)
```

## Non-negotiables

- **Turnstile is verified once, at the Edge.** The Node handler forwards
  `turnstile_token` verbatim; it never verifies, bypasses, or re-implements it.
  Any verification failure — missing token, invalid token, upstream timeout,
  non-200, or `success !== true` — is answered **403** with the generic
  `VERIFICATION_FAILED` body. No lead is ever stored on a failure.
- **Fail-closed, never fail-open.** A missing `TURNSTILE_SECRET_KEY` rejects
  with 403. A missing `LANDING_LEAD_RATE_LIMIT_SALT` throws at load / before
  hashing (no public fallback). If the shared limiter errors, the request is
  refused (503), never waved through.
- **Budgets are shared and opaque.** Both layers claim the same Postgres
  rate-limit budget keyed by an HMAC/SHA-256 of `salt:clientIp`. No raw IP is
  stored.
- **Honeypots are indistinguishable.** A trapped submission (`website`,
  `company_website`, `fax_number` — all three, on both layers) receives a
  byte-identical 200 to a stored-lead answer and stores/logs nothing.
- **2xx means stored.** The client may treat 2xx as durable. Anything else
  means the lead was not recorded and the UI must say so.
- **No PII in logs.** Request ids and outcomes only — never name, phone,
  email, body, or credentials.

## Tests that pin this contract

- `scripts/verify-landing-lead-edge-runtime.mjs` — Edge handler: limiter failure
  modes → 503, `limited` → 429 + Retry-After, Turnstile throw / HTTP error /
  `success:false` / unconfigured secret → **403** and no insert, honeypot HTTP
  200 twin of success.
- `scripts/verify-landing-lead-shared-flow.mjs` — real Node handler + real Edge
  handler over an isolated PGlite counter: end-to-end store, retry idempotency.
- `scripts/verify-nexora-lead-fail-closed.mjs` — no public salt fallback anywhere
  in shipped source; Edge module throws at load without the salt.
- `scripts/verify-nexora-demo-lead.mjs` / `scripts/verify-nexora-demo-lead.ts` —
  Node handler validation, normalization and response contract.
- `scripts/verify-route-parity.mjs` — both runtimes mount the same handler,
  identical honeypots, Edge-only Turnstile, fail-closed wiring.

## Configuration checklist (operator)

1. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) on the
   Node/Vercel runtime.
2. `LANDING_LEAD_RATE_LIMIT_SALT` — a long random secret, unique per project.
3. Edge Function secrets: `TURNSTILE_SECRET_KEY`, `LANDING_LEAD_RATE_LIMIT_SALT`,
   plus `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`.
4. `NEXORA_CRM_LEAD_ENDPOINT` (optional) — CRM sink; delivery failures are
   recorded on the stored lead and never drop it.

If any of 2–3 is missing the flow fails closed (403/503) — configure before
exposing the form publicly.
