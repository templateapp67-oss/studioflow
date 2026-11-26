# NEXORA salon-owned WhatsApp booking and payments

## Product behavior

Every published salon tenant uses its own WhatsApp Business Platform sender. Template choice is only presentation; the tenant is resolved from the verified Meta `phone_number_id` on inbound webhooks, never from a customer-supplied slug alone. Customer replies, booking updates, payment links and payment receipts are sent from that salon's own connected sender. The owner workspace also includes a WhatsApp conversation inbox so salon staff can read messages and reply from the connected number.

The central NEXORA support number remains support/fallback only. It is never used as the sender for another salon's customer booking or payment messages.

## Tenant ownership and credentials

Each salon tenant is owned by `studioflow_accounts.user_id`; the WhatsApp connection and all messages, bookings and payments are scoped to that canonical StudioFlow owner ID.

## Owner onboarding and credentials

- Owner connection is initiated from Business tools → WhatsApp Booking & Payments.
- Meta Embedded Signup v5 is used (`extras.version = "v5"`). v5 can return `messaging_account_ids`, `primary_waac_ids`, `is_on_biz_app`, and the `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` event.
- The server verifies the granted management and messaging permissions and matches the selected phone-number ID against the Messaging accounts (WABAs) shared during signup. It rejects an ambiguous match; `primary_waac_ids` are not WABA IDs.
- A newly verified standard number is not necessarily registered with Cloud API. The owner supplies a six-digit two-step PIN before opening Meta, not the SMS verification code. This lets SalonOS exchange the short-lived login code immediately. The server passes the PIN to Meta only for new, verified, unregistered numbers (`PENDING`, `VERIFIED`, `NOT_APPLICABLE`), never stores it, and skips registration for connected Cloud API and Business App coexistence numbers. The flow does not migrate or deregister numbers.
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
2. In the NEXORA Meta app, use a Facebook Login for Business configuration with the **WhatsApp Embedded Signup** login variation and **WhatsApp Cloud API** product. Request `whatsapp_business_management` and `whatsapp_business_messaging`; publish the app and confirm App Review/Advanced Access for external salons. In Client OAuth settings, enable Client OAuth Login, Web OAuth Login, Enforce HTTPS, Embedded Browser OAuth Login, strict redirect URIs and Login with the JavaScript SDK. Add the actual HTTPS launch origin to Allowed Domains and the exact launch URL to Valid OAuth Redirect URIs. This is the SalonOS owner page on `nexorasalon.online`, not the Supabase webhook URL. See [Meta’s setup guide](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation).
3. Verify `META_APP_ID` and `META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID` are set in Supabase Edge Function Secrets and refer to that app and configuration.
4. Verify the existing Vault entries `nexora_whatsapp_meta_app_secret` and `nexora_whatsapp_webhook_verify_token` match the app and callback. The encryption key `nexora_whatsapp_token_encryption_key` must decode to 32 bytes. Do not rotate or overwrite existing secrets as part of the messaging test.
5. Deploy `nexora-whatsapp-connect` with gateway JWT verification enabled. Deploy `nexora-whatsapp-webhook` and `studioflow-payments` with gateway JWT verification disabled as recorded in `supabase/config.toml`; provider raw-body signatures and internal service-role checks remain mandatory.
6. Configure the NEXORA app’s `whatsapp_business_account` webhook at `https://zilwgiuiygqqardzutxi.supabase.co/functions/v1/nexora-whatsapp-webhook` with the matching Vault verify token. Enable the app-level `messages` field (and `account_update` for Meta’s onboarding setup). The Edge Function additionally subscribes the selected WABA to the NEXORA app during signup; the app-level field subscription alone does not link an owner or a sender.
7. Configure the Razorpay webhook URL to the deployed `studioflow-payments` Edge Function with the existing webhook signing secret and subscribe to `payment_link.paid`, `payment_link.expired` and `payment_link.cancelled`.
8. Run a two-salon tenant-isolation test, one standard Cloud API number and one Business App coexistence number, plus duplicate webhook, opt-out, expired hold, payment capture, post-expiry refund, and owner-inbox reply checks.

Never paste Meta App Secret, webhook tokens, service-role keys or encryption keys into chat or commit them to GitHub.

## Connect and verify a real number

1. After the reviewed frontend and Edge Function changes are released, sign in at `https://nexorasalon.online/login` as the intended SalonOS owner. The signed-in user must have a `studioflow_accounts` row. Publish the salon site if the bot should display its booking menu.
2. Open **Business tools → WhatsApp Booking & Payments → Connect with Meta**. For a new standard Cloud API sender, enter the two-step PIN (choose one if it has none) before clicking **Continue in Meta**. Leave it blank if using a registered Cloud API number or eligible Business App coexistence. Do not enter the SMS code here.
3. Sign in to the popup as a Meta user who can grant access to the salon’s business assets. Pick or create the portfolio and Messaging account, verify the dedicated number in Meta (SMS/voice or Meta’s Business App flow), grant both WhatsApp permissions, and finish. Do not select the tawk.to number, reuse its Messaging account, or change its app or callback. Complete any billing or business review shown by Meta for the new account. SalonOS immediately exchanges the login code, confirms the number is a member of the granted Messaging account, registers only when needed, and subscribes the app before storing the encrypted connection.
4. **Verification pending** is not proof of delivery. Send `HI` from a separate consenting WhatsApp phone. Verify that the signed webhook records a conversation and inbound message for that owner, that the reply arrives on the handset, and that the owner can send a reply from the inbox during the 24-hour service window. SalonOS promotes the connection after Meta accepts the first reply, which is earlier than handset delivery.

The developer **API Setup** test sender is for direct Meta tests with authorized test recipients. It is not automatically linked to a SalonOS owner, and SalonOS has no manual import of a test token or phone ID. A developer-created account can appear in Embedded Signup, but that does not establish that its test number is eligible. Meta’s separate **Embedded Signup sandbox** can return OAuth and asset identifiers; Meta documents limited test sends to up to five recipients from the sandbox account card. Neither test is evidence that a real salon sender receives signed webhooks and delivers replies. Use a separate eligible business number and Messaging account for that test. See [Meta’s Embedded Signup overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview) and [Cloud API test guide](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started).

Local checks use in-memory fixtures for OAuth, registration, encryption and message routing. They do not verify the deployed browser/Edge Function versions, Meta approval, a live owner connection, or delivery.
