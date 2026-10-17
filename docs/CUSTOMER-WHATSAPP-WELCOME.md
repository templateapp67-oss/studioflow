# Automatic signup welcome on WhatsApp

Implemented: explicit welcome-message consent on both customer signup forms; private signup outbox; authenticated customer wakeup on all app/website sessions; protected Edge Function; disabled-until-activation one-minute cron dispatcher; email-confirmation gate; per-customer deduplication and per-number daily suppression. No password is copied into metadata, the queue, provider requests or logs. Messages contain the customer's UUID User ID, public login link and their own referral invitation URL. Password recovery remains the existing verified-email Forgot password flow.

**Current activation state: not configured/inactive. No real welcome messages sent.** Signup queues a welcome only when the customer checks the optional welcome request box. The queue does not claim to be delivery. Email must be confirmed before sending. Provider acceptance (`accepted`) is not a delivery receipt. Delivery webhooks are not configured in this change.

## Activate with Meta WhatsApp Cloud API

Project administrator: Supabase Dashboard → project `zilwgiuiygqqardzutxi` → Edge Functions → Secrets. Add these server-only values; never put access tokens in frontend code:

- `NEXORA_WA_ACCESS_TOKEN`: authorized WhatsApp Business system-user access token.
- `NEXORA_WA_PHONE_NUMBER_ID`: the approved sending phone number ID.
- `NEXORA_WA_WELCOME_TEMPLATE`: exact approved Meta template name.
- `NEXORA_WA_TEMPLATE_LANGUAGE`: exact approved template locale.
- `NEXORA_WA_GRAPH_VERSION`: a currently supported Graph API version from your Meta app settings (format `vNN.N`).

Submit this proposed template in WhatsApp Manager, with **four positional body parameters** (no additional headers/buttons unless the sender implementation is updated):

> Welcome {{1}} to Nexora! Your User ID is {{2}}. Login: {{3}}. Your referral link: {{4}}. Use the password you chose at signup. If you forget it, choose Forgot password on the login page to reset it through your verified email. Your password is never sent over WhatsApp.

Meta decides approval/category; the configured template and language must match its approved version exactly. Parameter order is name, user ID, login URL, referral URL. The sender is `studioflow-welcome-whatsapp`; its endpoint is an authenticated outbound worker, **not** a Meta delivery webhook.

After configuring the sender/template, enable background dispatch from the project's authorized SQL editor:

```sql
select public.studioflow_welcome_activate_worker();
```

The next dispatch runs within a minute. A consenting, confirmed customer's authenticated app session can also wake its own welcome job and activate configured dispatch. Internal cron credentials are generated in Vault; do not copy or expose them. Check the customer's own status API or private job status to verify acceptance. Test with an authorized recipient first. Recipient phone ownership is not OTP-verified by this feature; no password, OTP, magic-login token or password-reset token is sent to that number.

## Operational behavior

Only service-role code can claim/complete jobs. The Edge Function independently validates either a confirmed authenticated customer (restricted to their UID) or the Vault-backed worker token. Request bodies cannot override the phone, customer ID, name or referral link. Normal public clients cannot read or mutate the outbox.

Explicit provider throttling can retry, up to three attempts. Ambiguous timeout/missing acknowledgements and stale processing jobs become `unknown` and are not retried automatically, avoiding duplicate sends. Investigate unknown results before any manual reset. Provider HTTP errors store redacted status/error codes only; no provider response body, token, password or raw request is logged.

Disable scheduled dispatch if needed:

```sql
update nexora_welcome_private.worker_config set enabled=false;
```

The function still permits a configured, consenting customer's authenticated self-wakeup; remove sender secrets to disable all sending. This one-time account welcome is separate from per-salon promotional consent and marketing campaigns.

## Verification

`backend/customer-welcome-whatsapp-verification.sql` uses rolled-back fixtures to test consent, confirmation gating, private status, service-only claiming, duplicate prevention, no password data and per-number suppression. `scripts/verify-welcome.ts` tests provider request parameters, accepted/failure/throttled/unknown outcomes through a mock HTTP client. Unauthenticated live requests return 401. No real message or paid provider request is made by the verification suite.
