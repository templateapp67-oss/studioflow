# StudioFlow centralized Razorpay setup

The Supabase `studioflow-payments` function is deployed. Set these secrets in Supabase → Edge Functions → Secrets:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Use matching test credentials for a test payment first. Enable automatic capture in the Razorpay dashboard. Register the webhook URL `https://zilwgiuiygqqardzutxi.supabase.co/functions/v1/studioflow-payments` for `payment.captured`, using the same webhook secret. Enable live credentials only after real test checkout and webhook verification succeed. Never put the secret in frontend environment variables or source.

The checkout charges the mandatory 25% deposit, rounded up to the smallest INR unit. New Razorpay orders are created with `payment_capture: 1` so authorized payments are captured without a dashboard toggle. Booking price is taken from the published services by the backend; caller amounts/payment status are ignored. A 15-minute unpaid reservation prevents overlapping bookings. Captured payments must pass order/amount/currency verification; a browser success callback alone cannot confirm a booking. Webhooks and the customer “Recheck payment status” action recover interrupted callbacks. Repeated payment notifications are idempotent. Edge secrets are trimmed (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`); missing webhook secret does not block order creation.

If a payment arrives after a reservation expires or is cancelled, settlement flags `refund_required` and the edge function immediately calls the Razorpay refunds API for that captured payment. Cancelled bookings with a captured 25% advance are queued the same way. A one-minute worker retries leftover refund jobs. Refunds are never invented when Razorpay credentials are missing.

The function gateway JWT verification is disabled to support Supabase's current JWT keys and Razorpay webhooks. The function validates every customer token with Auth `getUser` and verifies signed webhooks. Only the service role can call database payment settlement; tenants cannot certify payment.

Owner dashboard and customer booking lists subscribe to RLS-protected realtime events, with manual refresh retained. Account edits share one profile/services/stylists state and persist through revision-checked autosave. Cross-tab edits never overwrite unsaved local changes silently.

Unpublished owners must publish their current salon before accepting real payments/bookings. Template gallery demonstrations do not create real customer bookings.

Verification completed: frontend and Edge TypeScript checks; frontend service/slot/details/checkout/confirmation flow with isolated API fixtures; 14-template content-preservation and inline-edit tests; real Supabase rollback tests for deposit certification, privilege denial, exact amounts, idempotency, expiration and privacy. Production Edge deployment succeeded. Browser automation is unavailable. An HTTP readiness probe timed out through the workspace proxy, so the actual configured Razorpay secrets and a real payment cannot be verified here.

Supabase advisors also report existing shared-project warnings on older functions, unrelated to these new service-only payment RPCs. Payment settlement privileges are explicitly denied to customers; payment-order RLS denies browser roles. See [Supabase advisor explanations](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable). These warnings were not concealed by revoking existing application APIs.
