# NEXORA salon-owned WhatsApp booking and payments

## Product behavior

Every published salon tenant uses its own WhatsApp Business Platform sender. Template choice is only presentation; the tenant is resolved from the verified Meta `phone_number_id` on inbound webhooks, never from a customer-supplied slug alone. Customer replies, booking updates, payment links and payment receipts are sent from that salon's own connected sender. The owner workspace also includes a WhatsApp conversation inbox so salon staff can read messages and reply from the connected number.

The central NEXORA support number remains support/fallback only. It is never used as the sender for another salon's customer booking or payment messages.

## Tenant ownership and credentials

Each salon tenant is owned by `studioflow_accounts.user_id`; the WhatsApp connection and all messages, bookings and payments are scoped to that canonical StudioFlow owner ID.

## Owner onboarding and credentials

- Owner connection is initiated from Business tools → WhatsApp Booking & Payments.
- Meta Embedded Signup v5 is used (`extras.version = "v5"`). v5 can return `messaging_account_ids`, `primary_waac_ids`, `is_on_biz_app`, and the `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` event.
- The server maps the first messaging account ID to the existing WABA field, retains all returned messaging account IDs in provider metadata, and stores Business App coexistence state and primary WAAC IDs.
- Meta access tokens are encrypted with AES-256-GCM before storage. The encryption key is read from Supabase Vault by service-role-only RPC; it is never a browser variable or exposed to authenticated/anon roles.
- App Secret and webhook verify token are allow-listed Vault secrets read only by service-role Edge Functions.
- OAuth state is random, single-use, short-lived and stored as a SHA-256 hash. The callback is bound to the initiating StudioFlow owner.
- Browser roles cannot read/write connection tokens, OAuth state, webhook payloads, conversations or message logs. Trusted Edge Functions use service_role.
- Unique `phone_number_id` prevents one WhatsApp sender from being assigned to two salon owners.
- Inbound webhooks verify Meta's `X-Hub-Signature-256` over the exact raw request body before parsing or processing.
- Tenant routing uses the inbound verified `metadata.phone_number_id` and active connection. Unknown or disconnected senders are ignored.

## Booking conversation

1. Customer messages the salon's connected number.
2. The webhook resolves the message to one active salon connection.
3. The bot reads only that salon's published services, prices, staff and opening availability.
4. The customer selects a service, salon branch (when multiple exist), date, time/stylist and gives a booking name.
5. Before saving a reservation the bot shows the complete summary and asks for an explicit `YES` confirmation that also authorizes the customer's name/WhatsApp number to be saved as a StudioFlow customer record.
6. A phone-confirmed Supabase customer identity is created or reused only after that confirmation. It is linked to the message's WhatsApp number; no password or unverified email is invented.
7. The service-role-only guest booking adapter re-checks the published salon, branch, service, live slots, customer phone, hold overlaps and idempotency. It writes into the canonical `studioflow_bookings` table with `booking_source = 'whatsapp'`, tenant owner, branch and a WhatsApp idempotency key.
8. A successful request creates a 15-minute pending hold. An unavailable slot, tenant mismatch or booking failure is never described as confirmed.

## Payments and WhatsApp messages

- The existing StudioFlow payment engine creates a Razorpay Payment Link for the configured 25% advance on WhatsApp-originated bookings.
- The payment-link ID is stored in the canonical `studioflow_payment_orders` ledger and associated with the WhatsApp booking. The customer receives the hosted payment URL from the salon's own WhatsApp sender.
- A booking is confirmed only after the signed Razorpay `payment_link.paid` event is received, the live Payment Link and its captured payment are re-fetched and validated server-side, and the canonical StudioFlow settlement RPC succeeds.
- If a payment arrives after the booking hold expires or the slot has been taken, the existing settlement path flags a refund instead of confirming an invalid appointment.
- Customer messages/screenshots are never proof of payment.
- Customer `NO`/`CANCEL` releases an unpaid hold and attempts to cancel the unpaid Razorpay Payment Link. A captured payment cannot be cancelled as unpaid.
- Payment receipt messages are sent only after verified capture and are suppressed for customers who have opted out.
- Free-form WhatsApp replies are only sent inside the 24-hour customer service window. Outside that window an approved Meta message template is required; this code does not bypass the template rule.
- `STOP`/`UNSUBSCRIBE` opt-out is stored per conversation. A customer must send `START` before the bot or owner inbox can message them again.

## Owner dashboard

The WhatsApp Booking & Payments tool is added to every salon owner workspace, across all 16 templates. It provides:
- salon's own Meta-connected Business number, connection state, webhook state, Business App coexistence indicator and disconnect action;
- WhatsApp-originated booking/request/confirmation/cancellation metrics and advance collected;
- message counts, payment link count and pending/paid payment metrics;
- tenant-scoped customer conversation inbox, handoff-needed indicator, message history, opt-out indicator and owner replies through the salon's own sender.

Dashboard numbers are derived from StudioFlow booking/payment rows and message logs, not increment-only counters.

## Production setup still required

The code and database migrations do not create a Meta developer app or grant Meta approvals. Before actual owners can connect numbers:
1. Verify the ROGENTARA/NEXORA business with Meta and enrol/approve the required Tech Provider/partner role.
2. Create a Meta App and Embedded Signup v5 Login for Business configuration for WhatsApp Cloud API; request the required WhatsApp Business Management and Messaging permissions and complete App Review/Advanced Access as Meta requires.
3. Add `META_APP_ID` and `META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID` to Supabase Edge Function Secrets.
4. Store `nexora_whatsapp_meta_app_secret` and `nexora_whatsapp_webhook_verify_token` in Supabase Vault. The runtime migration provisions `nexora_whatsapp_token_encryption_key` only if it does not already exist.
5. Deploy the `nexora-whatsapp-connect` and `nexora-whatsapp-webhook` Edge Functions with JWT verification disabled at the gateway (their internal owner/service-role checks handle authorization).
6. Configure the Meta Webhooks callback URL as the deployed `nexora-whatsapp-webhook` endpoint, use the exact Vault verify token, subscribe the WhatsApp Business Account/app to the `messages` webhook field.
7. Configure the Razorpay webhook URL to the deployed `studioflow-payments` Edge Function with the existing webhook signing secret and subscribe to `payment_link.paid`, `payment_link.expired` and `payment_link.cancelled`.
8. Run a two-salon tenant-isolation test, one standard Cloud API number and one Business App coexistence number, plus duplicate webhook, opt-out, expired hold, payment capture, post-expiry refund, and owner-inbox reply checks.

Never paste Meta App Secret, webhook tokens, service-role keys or encryption keys into chat or commit them to GitHub.

## Current delivery status

The production Supabase database contains the owner/tenant WhatsApp tables and the support migrations for the encrypted token key, service-role-only booking adapter, customer phone lookup, payment-link ledger columns and unpaid cancellation. The database function permissions for the WhatsApp private functions are restricted to service_role.

The owner UI, Meta Embedded Signup v5 client/server flow, signed webhook handler, booking conversation, Razorpay Payment Link actions and owner inbox are in PR #122. The PR has not been merged or deployed as Edge Functions yet. No salon WhatsApp numbers are connected and no real customer messages or WhatsApp-originated bookings have been processed by this code. Meta app approval/configuration and Vault secrets remain external platform setup requirements; do not advertise the feature as live until those gates and end-to-end tests pass.
