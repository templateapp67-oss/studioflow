# Nexora booking checkout staging

Use a staging Supabase project and a staging site pointed at it. Apply the checkout receipt migration before deploying the `studioflow-payments` Edge Function and refreshing the web build. The existing slot and payment ledgers remain the source of truth.

| Runtime | Setting | Staging value |
| --- | --- | --- |
| Web build | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Staging Supabase URL and publishable key |
| Web build | `VITE_RAZORPAY_KEY_ID` | Optional. The same publishable test key returned by the Edge Function |
| Supabase Edge | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Matching Razorpay test-mode pair |
| Supabase Edge | `RAZORPAY_WEBHOOK_SECRET` | Signing secret for the test-mode webhook |
| Supabase Edge | `BOOKING_RAZORPAY_MODE` | `test` |
| Supabase Edge | `BOOKING_PAY_AT_VENUE_ENABLED` | `true` to offer Pay at Venue |
| Supabase Edge | `EMAIL_API_KEY` or `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `BOOKING_ADMIN_EMAIL` | Resend API key, verified sender, and booking admin inbox |
| Supabase Edge | `WHATSAPP_API_TOKEN`, `BOOKING_WHATSAPP_PHONE_NUMBER_ID`, `BOOKING_WHATSAPP_GRAPH_VERSION` | Meta token, sender phone number ID and supported Graph version |
| Supabase Edge | `BOOKING_WHATSAPP_TEMPLATE`, `BOOKING_WHATSAPP_TEMPLATE_LANGUAGE` | Approved utility template name and exact language code |
| Supabase Edge | `BOOKING_TEST_EMAIL_RECIPIENTS`, `BOOKING_TEST_WHATSAPP_RECIPIENTS` | Comma-separated authorized test destinations. Include the customer and admin inboxes. WhatsApp uses digits with the 91 prefix |

Use a utility template with five positional body parameters, in this order. Booking ID, service, date and time, paid amount, and transaction ID or venue amount due. WhatsApp sends require the customer's receipt consent. Meta test senders also require the recipient to be added and verified in Meta's test setup.

In Razorpay Test Mode, enable automatic capture and configure the staging gateway webhook for `payment.captured`. Use the staging site's `/api/payments/razorpay/webhook` if its proxy forwards to the same staging Edge Function. Otherwise use that project's `/functions/v1/studioflow-payments` endpoint directly. Keep the existing live webhook and credentials in their production project. A public GET to the payment function reports checkout availability and its expected mode.

Receipt jobs are queued atomically with booking confirmation. The payment worker's existing authenticated `refunds` action also drains the receipt queue. Verify the worker is configured against the correct Edge URL, or schedule the same function with `{"action":"bookingReceipts"}` and the existing verified worker token in `x-worker-token`. Provider acceptance is recorded separately for customer email, admin email, and WhatsApp. A WhatsApp timeout, unknown result, or abandoned sending claim needs review before any manual resend because Meta may already have accepted it.

## Acceptance checks

1. Sign in to staging, choose a published service and an available slot, and enter your name, WhatsApp number and email. Confirm the final amount and open Razorpay. Dismiss or fail Checkout and retry the same reservation.
2. Complete a Razorpay test payment. Check that the Razorpay order and payment IDs match the Supabase payment ledger and the booking is confirmed with `paid_full`. Verify the webhook delivery even when closing the client after payment.
3. Verify both Resend messages arrive and the Meta message arrives at the consented test number. Check the receipt ledger for three provider IDs. Rechecking the payment should not send a second receipt.
4. Download the receipt and open its prefilled WhatsApp link. Opening the link leaves the final send to the customer.
5. With Pay at Venue enabled, confirm a separate slot. Check the booking is confirmed with `pay_at_salon`, zero paid, the total due at the venue, and no Razorpay order.

For production, use `BOOKING_RAZORPAY_MODE=live` with the matching live keys and webhook after staging acceptance. Razorpay and provider secrets belong only in the server environment.
