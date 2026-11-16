# NEXORA salon-owned WhatsApp booking and payments

## Product behavior

Every published NEXORA salon connects its own WhatsApp Business Platform sender. Template choice controls the website design only; sender ownership is resolved from the verified Meta `phone_number_id`, never from a customer-supplied salon slug. Replies and booking/payment messages use that salon's connected business number and verified business name.

The central NEXORA support number is not used as the sender for another salon's booking or payment messages.

## Implemented platform foundation

- The live Supabase project contains the five tenant-scoped WhatsApp connection, OAuth state, webhook inbox, conversation and message-log tables.
- `studioflow_accounts.user_id` is the canonical owner/tenant key. The active owner website is resolved through `studioflow_websites.owner_id`.
- WhatsApp bookings use `studioflow_bookings`, the same calendar table as website bookings. They are marked `booking_source='whatsapp'` and have a per-owner idempotency key.
- The trusted `studioflow_whatsapp_book` function re-checks the live slot and the salon's assigned service/specialist schedule before saving a booking. It requires a verified WhatsApp phone identity and explicit customer confirmation before the Edge Function calls it.
- A new WhatsApp booking starts pending with a 15-minute hold. The same canonical payment order table enforces the existing 25% INR advance rule.
- Razorpay hosted Payment Links are stored against `studioflow_payment_orders`. The existing `studioflow-payments` webhook now handles `payment_link.paid`: it fetches the link and captured payment from Razorpay, verifies the exact booking reference, INR currency and exact amount, and only then calls `studioflow_settle_payment_link`.
- A late payment for an expired or unavailable slot is marked `refund_required` and sent through the existing Razorpay refund path. The refund ledger records `refunded` or `refund_failed`.
- Connection tokens are AES-256-GCM encrypted. The random 32-byte key is stored in Supabase Vault. Only the Supabase `service_role` can call the key-reader RPC; browser roles cannot execute it.
- Browser roles have no privileges on the WhatsApp connection, OAuth, webhook, conversation or message-log tables. Trusted Edge Functions use the service role.

## Owner app

A new **WhatsApp Booking & Payments** business-tool section is wired into the owner workspace. It provides the Meta connect/disconnect flow, the salon's connected sender name/number, connection status, refresh control, WhatsApp booking/payment counters, WhatsApp revenue and message failure counts.

The owner panel reads live booking, payment and message records; it does not use increment-only counters.

## Edge Function endpoints

The new function source is `supabase/functions/nexora-whatsapp-platform`.

- Owner actions: authenticated `POST` with action `status`, `start_signup`, `complete_signup`, `disconnect` or `send_message`.
- Meta webhook callback: `GET` verifies `hub.verify_token`; `POST` verifies `X-Hub-Signature-256` against the raw request body before processing.
- Razorpay Payment Link events are handled by the existing `studioflow-payments` endpoint at `/functions/v1/studioflow-payments`.
- The WhatsApp function routes inbound customer messages by the active connection's verified `phone_number_id`, deduplicates provider messages, logs inbound/outbound delivery state, and tracks the booking conversation.

The expected Meta callback URL is:

`https://zilwgiuiygqqardzutxi.supabase.co/functions/v1/nexora-whatsapp-platform`

The existing Razorpay webhook URL remains:

`https://zilwgiuiygqqardzutxi.supabase.co/functions/v1/studioflow-payments`

Enable Razorpay webhook event `payment_link.paid` on that existing webhook configuration. Keep the existing `payment.captured`, `refund.processed` and `refund.failed` events enabled.

## Meta prerequisites before public use

The Meta app must be owned by a verified Business Manager and onboarded as a WhatsApp Tech Provider / solution provider for customer-owned WABAs. The app needs Advanced Access and App Review for `whatsapp_business_messaging` and `whatsapp_business_management`, plus a configured Embedded Signup v5 flow and webhook subscription. Coexistence is recorded when Meta reports that the phone remains on the WhatsApp Business app.

The server reads these Supabase Edge Function secrets; never put them in browser variables or Git:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_EMBEDDED_SIGNUP_CONFIG_ID`
- `META_WEBHOOK_VERIFY_TOKEN`
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (or the existing project aliases)
- `RAZORPAY_WEBHOOK_SECRET` (or the existing project alias)

The Meta token-encryption key is already stored in Supabase Vault; it is not a value to copy into an Edge Function secret. The Edge Function currently defaults to Graph API `v27.0`.

Meta Tech Provider / App Review approval and the App's production Embedded Signup configuration are external platform requirements. The code cannot grant these permissions itself.

Official Meta references:
- [WhatsApp Business Platform overview and Tech Provider onboarding](https://developers.facebook.com/documentation/business-messaging/whatsapp/overview)
- [WhatsApp Business Account Graph API v27.0](https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account)
- [Meta sample App Review submission for WhatsApp solution providers](https://developers.facebook.com/docs/whatsapp/solution-providers/app-review/sample-submission/)

## Messaging policy and customer consent

Free-form WhatsApp replies are sent only inside the 24-hour customer-service window opened by the customer's message. If the window is closed, the message is logged as queued instead of sending a non-compliant free-form message. Automated business-initiated follow-ups, reminders and payment confirmations outside that window still require an approved WhatsApp template on the salon's WABA; template onboarding/sending and a customer opt-in capture UI remain release gates. STOP/UNSUBSCRIBE suppresses further salon-initiated messages until the customer starts again.

Do not collect card details, UPI PINs or OTPs in WhatsApp. A customer text or payment screenshot is never proof of payment.

## Production rollout gates

1. Configure the Meta app ID, app secret, Embedded Signup v5 config ID and webhook verify token as Supabase Edge Function secrets.
2. Complete Meta Business verification, Tech Provider requirements, App Review and Advanced Access for the WhatsApp permissions.
3. Subscribe the Meta app to the required WABA webhook fields and test two separate salon senders. Verify each `phone_number_id` routes only to its own owner.
4. Configure Razorpay production keys and webhook secret on the existing `studioflow-payments` function, then add the `payment_link.paid` webhook event.
5. Create/approve the required WhatsApp message templates on each salon WABA for messages outside the 24-hour service window.
6. Test an end-to-end booking, payment, webhook replay, expired slot and refund against Razorpay test credentials before changing to live mode.
7. Test tenant isolation across two salons and all 16 template renderers, including duplicate messages, duplicate YES, reused phone number, disconnected number and wrong-owner events.

## Current rollout status

The database migrations through `20261116031000` have been applied to the NEXORA Supabase project, including profile-phone identity matching and the Vault-only AES-256 key accessor. The Vault key exists and its read function is executable by `service_role` only. The WhatsApp Edge Function, owner UI and Razorpay Payment Link webhook changes are on feature branch `feat/nexora-whatsapp-owned-channel-v5`; they must pass the repository CI and be merged/deployed before the owner panel can use them.

The code work does not by itself activate Meta senders. Until the Meta app secrets/permissions/webhook and Razorpay event are configured and end-to-end tests pass, no salon should be shown as connected and no production booking/payment message should be advertised as active.

## Historical migration recovery

The live project contains older migration versions that are absent from the repository. Do not mark those versions reverted or add empty placeholder migrations. Before enabling Supabase PR preview branches, generate and review a complete schema baseline with `supabase db pull`, verify a clean local reset against that baseline, and reconcile the old history deliberately.
