# Veda Sanjeevani — Step 2 backend

Supabase Edge Functions, Deno + strict TypeScript. Run every command below from this
`veda-sanjeevani/` directory, **not** the unrelated StudioFlow repository root.

## Built

| Function                    | Access                                | Purpose                                                                  |
| --------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `ai-generate-content`       | Owner JWT                             | Seven copy types, including `alt_text`; audit record; 30/user/hour       |
| `ai-generate-all`           | Owner JWT                             | Active services + About + six FAQs + SEO; four-item batches; 5/user/hour |
| `create-booking-public`     | Public                                | Validated booking RPC, honeypot, 5/IP/hour and 3/phone/hour              |
| `send-booking-notification` | Exact service-role key or cron secret | Owner/customer email and WhatsApp link                                   |
| `request-review`            | Cron secret only                      | Single booking or Step 1's batch; one-time review invitation             |
| `summarize-reviews`         | Owner JWT                             | Last 90 days, maximum 100 approved/pending reviews; optional save        |
| `register-media`            | Owner/staff JWT                       | Validate already-uploaded image URLs and register metadata               |
| `health`                    | Public GET                            | Database ping and UTC time; no configuration details                     |

All JSON responses use `{ok:true,data}` or `{ok:false,error:{code,message}}`. OPTIONS is handled by
every function. Unknown browser origins receive 403. Missing Origin is permitted for server/curl
callers; CORS is not authentication.

## 1. Install the additive migration

Step 1 remains unchanged. Migration `006_backend_fixes.sql` adds `bookings.backend_jobs` and two
service-role-only RPCs for atomic delivery claims. Apply it before deploying the notification/review
functions:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
# Alternatively, on a fresh local database:
supabase db reset
```

`backend_jobs` contains delivery state, lease tokens and controlled error codes, never provider
credentials. It inherits booking RLS and the Step 1 staff status-only update guard. Leases last ten
minutes; failed jobs have a fifteen-minute cooldown. Completed notification/review jobs are not sent
again. Resend idempotency keys provide additional provider-side protection during retries. As with
any email/database combination, delivery is at-least-once across provider expiry or a crash between
sending and recording completion; it is not a guarantee of exactly-once delivery.

## 2. Environment and secrets

Copy `.env.example` to `.env` for local development. For a hosted project:

```bash
supabase secrets set \
  SITE_URL='https://YOUR_WEBSITE_ORIGIN' \
  ENVIRONMENT='production' \
  GEMINI_API_KEY='YOUR_GEMINI_KEY' \
  GEMINI_MODEL='gemini-flash-latest' \
  RESEND_API_KEY='YOUR_RESEND_KEY' \
  EMAIL_FROM='Veda Sanjeevani <bookings@YOUR_VERIFIED_DOMAIN>' \
  OWNER_EMAIL='owner@YOUR_DOMAIN' \
  CRON_SECRET='YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS'
supabase secrets list
```

Generate a cron secret locally with `openssl rand -hex 32`. Do not put actual values in SQL, Git,
browser variables, screenshots or support messages. `SITE_URL` is an origin, not `/review` or
another path. Production requires HTTPS for both project and site URLs.

Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to hosted
functions. For local development, replace the example keys with the values from `supabase status`.
If your project uses newer API-key names, the anon/publishable key goes in `SUPABASE_ANON_KEY`, and
the service/secret key goes in `SUPABASE_SERVICE_ROLE_KEY`. Never use a secret key as an `apikey` in
browser code.

`GEMINI_MODEL` is configurable; the default is the rolling `gemini-flash-latest` alias. Pin a
currently available Flash model in production if you need predictable model changes. Optional
provider settings do not prevent health or booking validation from running. Missing AI credentials
produce `AI_UNAVAILABLE`. Missing email credentials skip delivery and log a warning; booking
creation still succeeds. Review invitations remain retryable when email is unavailable. Configure
and verify a Resend sender domain before accepting real customer emails.

Set the **same** cron secret in Vault, using the Supabase SQL editor or your secure deployment
process:

```sql
-- Replace the placeholder outside source control; do not commit the actual value.
SELECT vault.create_secret('YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS', 'cron_secret');
SELECT vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
```

If a secret already exists, use `vault.update_secret` with its actual secret ID rather than
inserting a duplicate name. Step 1's dispatcher reads these Vault entries; it does not read Edge
Function environment variables.

## 3. Local run and checks

Docker is required for the official Supabase local stack. Deno 2.x is required for the checks.

```bash
supabase start
supabase db reset
supabase functions serve --env-file .env
# Alternative: deno task serve

deno task check
deno task lint
deno task test
# Equivalent to the three tasks above:
deno task verify
```

The checked-in `deno.lock` pins npm dependencies. Tests use mocked Auth/PostgREST/Gemini/Resend
responses and require no paid API calls or real credentials. The test command is
`deno test --allow-env --allow-net`. A Node `punycode` deprecation warning may be emitted by a
Supabase dependency; it is not a failed assertion.

The local gateway URL is `http://127.0.0.1:54321/functions/v1`. Browser code should use the Supabase
client or relative application proxies, not a hardcoded sandbox/localhost URL.

## 4. Deploy each function

Run after the migration and secrets are ready. JWT-protected functions also enforce the database
profile role inside the handler; a valid staff JWT is not sufficient for owner actions.

```bash
supabase functions deploy ai-generate-content
supabase functions deploy ai-generate-all
supabase functions deploy create-booking-public --no-verify-jwt
supabase functions deploy send-booking-notification --no-verify-jwt
supabase functions deploy request-review --no-verify-jwt
supabase functions deploy summarize-reviews
supabase functions deploy register-media
supabase functions deploy health --no-verify-jwt
```

The four `--no-verify-jwt` deployments are intentional: two are public and two perform their own
internal-secret checks. Do not disable application authorization on the other functions.
`config.toml` records the same gateway policy for local serving.

## 5. Working curl examples

These examples use shell variables; export real values in your terminal, not in source control:

```bash
export PROJECT_URL='https://YOUR_PROJECT_REF.supabase.co'
export ANON_KEY='YOUR_PUBLIC_ANON_KEY'
export OWNER_JWT='SIGNED_IN_OWNER_ACCESS_TOKEN'
export STAFF_JWT='SIGNED_IN_STAFF_OR_OWNER_ACCESS_TOKEN'
export CRON_SECRET='YOUR_INTERNAL_CRON_SECRET'
export SERVICE_KEY='YOUR_SERVER_ONLY_SERVICE_KEY'
export BOOKING_ID='AN_EXISTING_BOOKING_UUID'
export SERVICE_ID='AN_ACTIVE_SERVICE_UUID'
```

### Health

```bash
curl -sS "$PROJECT_URL/functions/v1/health"
```

### Generate one content item

```bash
curl -sS -X POST "$PROJECT_URL/functions/v1/ai-generate-content" \
  -H "Authorization: Bearer $OWNER_JWT" -H "apikey: $ANON_KEY" \
  -H 'Content-Type: application/json' \
  --data '{"type":"service_description","context":{"name":"Abhyanga","description":"Warm oil massage","duration_min":60},"tone":"calm","language":"en"}'
```

Returns `{text,fields}`. For service descriptions, `fields.long_desc` is the saveable value. Other
field mappings are `about → body`, `blog → title/excerpt/body`, `faq → faqs`,
`seo → seo.title/seo.description`, `review_reply → reply`, `alt_text → alt_text`.

### Generate all / retry failed items

```bash
curl -sS -X POST "$PROJECT_URL/functions/v1/ai-generate-all" \
  -H "Authorization: Bearer $OWNER_JWT" -H "apikey: $ANON_KEY" \
  -H 'Content-Type: application/json' \
  --data '{"business_name":"Veda Sanjeevani","city":"Jaipur","keywords":["calm","wellness","traditional"],"tone":"premium","language":"en"}'

# Substitute an actually returned failed key; service keys use service:<uuid>.
curl -sS -X POST "$PROJECT_URL/functions/v1/ai-generate-all" \
  -H "Authorization: Bearer $OWNER_JWT" -H "apikey: $ANON_KEY" \
  -H 'Content-Type: application/json' \
  --data '{"business_name":"Veda Sanjeevani","city":"Jaipur","keywords":["calm","wellness","traditional"],"tone":"premium","language":"en","only":["about","seo"]}'
```

Keys are `service:<uuid>`, `about`, `faq`, and `seo`. Results contain per-item `status`, `value` or
`error`, plus `retry_keys`. Unknown/inactive retry keys return 400. Services are processed four at a
time. A 100-second whole-request budget returns unfinished items as failed rather than letting the
request run indefinitely. Each retry consumes another bulk-request allowance. **No generated
catalogue content is saved:** Step 3 must show an owner review/edit/approval step before writing it.
Rate-limit counters are the only database writes in this function.

### Public booking

Choose a real slot returned by Step 1's `get_available_slots` RPC; this timestamp is an example, not
an assertion that a slot is available.

```bash
curl -sS -X POST "$PROJECT_URL/functions/v1/create-booking-public" \
  -H 'Content-Type: application/json' \
  --data "{\"service_id\":\"$SERVICE_ID\",\"staff_id\":null,\"start_at\":\"2027-01-04T10:00:00+05:30\",\"name\":\"Asha Sharma\",\"phone\":\"9876543210\",\"email\":\"asha@example.com\",\"notes\":\"Please explain the session beforehand.\",\"website\":\"\"}"
```

`website` is a honeypot and must normally be empty. A non-empty value returns a fake success without
any database/provider call. The RPC derives price, staff eligibility and end time; the browser
cannot supply them. A missing/invalid configured WhatsApp number yields `whatsapp_url:null` without
failing the booking. Notification dispatch uses `EdgeRuntime.waitUntil`; its failure cannot change
the booking response.

### Booking notification (internal only)

```bash
curl -sS -X POST "$PROJECT_URL/functions/v1/send-booking-notification" \
  -H "Authorization: Bearer $SERVICE_KEY" -H 'Content-Type: application/json' \
  --data "{\"booking_id\":\"$BOOKING_ID\"}"
```

The exact configured service key is required; an ordinary JWT with a `service_role` claim is not
accepted. Alternatively use the same `x-cron-secret` header shown below. HTML is escaped, timestamps
use Asia/Kolkata, and the customer email explicitly says the booking is pending confirmation.
Provider failure is reported as `sent:false` with HTTP 200, not as a failed booking.
`notification_sent_at` is set only after all intended, valid recipients succeed. Duplicate claims do
not resend.

### Request review (internal only)

```bash
curl -sS -X POST "$PROJECT_URL/functions/v1/request-review" \
  -H "x-cron-secret: $CRON_SECRET" -H 'Content-Type: application/json' \
  --data "{\"booking_id\":\"$BOOKING_ID\"}"

# Compatible with the existing Step 1 dispatcher:
curl -sS -X POST "$PROJECT_URL/functions/v1/request-review" \
  -H "x-cron-secret: $CRON_SECRET" -H 'Content-Type: application/json' \
  --data "{\"booking_ids\":[\"$BOOKING_ID\"]}"
```

Only completed bookings qualify. No customer email returns HTTP 200 with `sent:false`. Used/expired
tokens are not reissued or emailed. Tokens are never returned in JSON or logs. A batch is processed
four at a time; any unsuccessful item produces non-2xx so Step 1 retries, while completed claims
suppress duplicates. Step 1's `review_requested_at` records invitation processing, including a
no-email skip; it is not a customer delivery/read receipt.

### Summarize reviews

```bash
curl -sS -X POST "$PROJECT_URL/functions/v1/summarize-reviews" \
  -H "Authorization: Bearer $OWNER_JWT" -H "apikey: $ANON_KEY" \
  -H 'Content-Type: application/json' --data '{"save":false,"language":"en"}'
```

Fewer than three reviews returns `NOT_ENOUGH_DATA` without calling Gemini. Output contains a
three-sentence summary, exactly three strengths, three improvements and one suggested reply per
input review. `save:true` writes only the summary to the selected `reviews.ai_summary` rows; it
never approves reviews or saves generated replies. This endpoint additionally limits owners to 10
summaries/hour.

### Register browser-prepared media

```bash
curl -sS -X POST "$PROJECT_URL/functions/v1/register-media" \
  -H "Authorization: Bearer $STAFF_JWT" -H "apikey: $ANON_KEY" \
  -H 'Content-Type: application/json' \
  --data "{\"original_url\":\"$PROJECT_URL/storage/v1/object/public/site-images/original.webp\",\"url_400\":\"$PROJECT_URL/storage/v1/object/public/site-images/400.webp\",\"url_800\":\"$PROJECT_URL/storage/v1/object/public/site-images/800.webp\",\"url_1600\":\"$PROJECT_URL/storage/v1/object/public/site-images/1600.webp\",\"alt_text\":\"A calm treatment room\",\"bytes\":123456}"
```

Upload real objects first and use the actual original byte count. The function checks
project/bucket/path, object existence, MIME and each object's size using HEAD requests. Originals
may be JPEG/PNG/WebP/AVIF; all three resized variants must be WebP. Every object must be at most 5
MiB. There is **no server-side image processing or sharp dependency**.

Important Step 1 permission boundary: Storage uploads remain owner-only. Staff may register
existing, owner-uploaded objects, but Step 2 does not silently broaden the Storage upload policy.
Step 3 should expose uploads according to that policy.

## Error and safety contract

- 400 `INVALID_INPUT`, `CLOSED`, `PAST_TIME`, `NOT_ENOUGH_DATA`
- 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 404 `NOT_FOUND`, `SERVICE_NOT_FOUND`
- 405 `METHOD_NOT_ALLOWED`; 409 `SLOT_TAKEN`, `CONFLICT`
- 429 `RATE_LIMITED` with `Retry-After`
- 500 `INTERNAL`; 502 `AI_UNAVAILABLE`, `UPSTREAM_ERROR`

AI transport uses a 20-second timeout per attempt, two retries for 429/5xx/network failures, and
500/1000 ms backoff. A prohibited-claim result gets one fresh generation; otherwise the endpoint
fails safely. HTML is stripped. Gemini output and provider responses are zod-validated. Audit
prompts/outputs redact common email, phone and credential patterns; avoid putting unnecessary
personal data into AI context.

IP/phone limiter identifiers are HMAC-hashed before storage. The deployment gateway must
overwrite/normalize `x-real-ip` / `x-forwarded-for`; arbitrary client-supplied proxy headers must
not be trusted by a custom reverse proxy. Limits use Step 1's fixed UTC epoch windows, so
`Retry-After` is the time to the next window, not a sliding-hour promise. Database limiter failure
fails closed.

## Verification performed here (2026-11-01)

- Deno 2.9.6 / TypeScript 6.0.3, strict mode, `deno check`: PASS.
- `deno lint`: PASS.
- `deno test --allow-env --allow-net`: **38 passed, 0 failed**.
- Tests cover environment/CORS/envelopes; invalid input for every function; JWT/profile roles;
  internal secrets; sixth-request limiting; honeypot zero calls; booking error mapping and
  background failure isolation; Gemini retries/timeouts/claim regeneration; four-item batching and
  selective retries; escaped email; duplicate claims; single/batch review requests and no-email
  skips; summary save behavior; media path/MIME/size checks.
- Migration 006 applied twice successfully to isolated native PostgreSQL 16.2. Step 1's full
  rollback suite still passes. `supabase/tests/backend_tests.sql` passes: atomic claims, duplicate
  suppression, cooldown/lease expiry, stale-token rejection, delivery timestamps and RPC grants.
  Fixtures roll back.
- Native Deno HTTP smoke gateway using the actual handlers and native database: health returned HTTP
  200 with `db:true`; invalid booking returned HTTP 400 `INVALID_INPUT`; unknown Origin returned
  HTTP 403. This is **not** a Supabase CLI/Edge Runtime deployment test.

### NOT verified

- Hosted Supabase deployment, Docker-backed PG17 local stack, or `supabase functions serve` (Docker
  unavailable here).
- Real Gemini generation/model availability, real Resend sender/domain/delivery, real Auth
  HTTP/JWTs, hosted Storage HEAD behavior, or real WhatsApp opening.
- Production gateway proxy-header behavior, hosted Vault secrets, wall-clock cron delivery, or
  exactly-once external email delivery.
- Actual runtime limits under a full 2,000-service catalogue or 100-review load. The implementation
  bounds work and returns retryable items; it cannot guarantee an upstream provider finishes within
  a fixed time.

Before launch, run the official local stack, deploy to a staging project, exercise
owner/staff/public/internal access with real credentials, send test emails, verify cron/Vault
wiring, and confirm the frontend saves AI content only after owner approval.

## Verification checklist

- [x] Eight exact function names and shared helpers implemented
- [x] Strict TypeScript/zod; no explicit `any`
- [x] Restricted CORS, role checks, internal secrets and uniform errors
- [x] Table-backed limits, honeypot, safe booking notification dispatch
- [x] Single/batch cron compatibility and durable duplicate suppression
- [x] Browser-only image resizing; metadata-only media registration
- [x] Deno checks/tests, additive SQL tests and native HTTP smoke checks
- [ ] Hosted/provider/Docker integration verification

STEP 2 COMPLETE. Ready for Step 3.
