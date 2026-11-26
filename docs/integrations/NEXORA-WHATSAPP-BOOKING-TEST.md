# NEXORA WhatsApp Booking — test integration

## What this test does

This connects Tawk AI Assist to the existing NEXORA salon catalogue and live availability RPCs.

- Catalogue, prices, staff and branch details are read from the published NEXORA salon.
- Available time slots are read from the same live-calendar functions already used by the customer booking app.
- After the customer explicitly confirms the summary, the API rechecks the slot and stores a test-only record in `studioflow_whatsapp_test_bookings`.
- Test records are private and separate from `studioflow_bookings`. They do **not** block the calendar, create payment orders, affect revenue, or award loyalty points.
- The endpoint never says that a real appointment was booked.

This is intentionally a test stage. Real WhatsApp booking creation needs a verified customer identity mapping because the existing production booking RPCs require a signed-in customer. Do not change test mode to live mode by changing a prompt; implement and audit the identity/authorization adapter separately.

## Deploy requirements

1. Apply migrations `20261115131821_studioflow_whatsapp_test_booking_api.sql` and `20261115145202_private_whatsapp_test_rate_limit.sql` in timestamp order. The second migration safely renames the already-deployed server-only rate-limit RPC.
2. Deploy Supabase Edge Function `studioflow-whatsapp-booking` with `verify_jwt = false`. The handler performs its own API-key authentication.
3. In Supabase Dashboard → Edge Functions → Secrets, create `NEXORA_TAWK_BOOKING_API_KEY` with a random value of at least 32 characters. Do not put the value in GitHub, this file, client-side code, or chat.
4. In Tawk AI Assist → Tools / Integrations → Add custom API, import the OpenAPI file at:
   `https://raw.githubusercontent.com/templateapp67-oss/studioflow/feat/whatsapp-booking-test-api/docs/integrations/nexora-whatsapp-booking.openapi.json`
5. Configure Tawk's HTTP Bearer authentication with the same value created in Supabase secrets. Tawk will send it as `Authorization: Bearer <key>`.
6. Enable the integration for the NEXORA AI agent and test in AI Assist preview before testing from a second WhatsApp phone.

## Tawk AI agent instructions for test mode

Paste these instructions into the NEXORA AI agent's instructions/scenario:

- Use the NEXORA integration to read the salon catalogue and prices. Never invent services, prices, staff names or available times.
- Ask which salon/location, service, date and specialist the customer prefers. Offer only returned services and times.
- Call availability after the service/date/specialist are clear. Read the exact slot time and stylist ID from the response.
- Before calling `saveNexoraWhatsAppTestBooking`, show the salon, selected service(s), total price, duration, date, time and specialist, then ask the customer for explicit confirmation. Send `customerConfirmed: true` only after the customer says yes.
- Generate one UUID requestId for the confirmation and reuse it if the tool call needs retrying.
- After the tool returns, clearly say: “Testing complete — this was only a test. Your appointment has NOT been booked and the time has NOT been reserved.”
- Never say “booking confirmed”, “appointment booked”, “slot reserved” or suggest the salon calendar has changed.
- If availability fails, ask the customer to choose a different returned slot. Never make up another time.

## API reference

OpenAPI schema: `docs/integrations/nexora-whatsapp-booking.openapi.json`

Base URL:
`https://zilwgiuiygqqardzutxi.supabase.co/functions/v1/studioflow-whatsapp-booking`

Health check:
`GET /health` — reports whether server-side secrets are configured; no secret value is returned.

Operations (all require `Authorization: Bearer <NEXORA_TAWK_BOOKING_API_KEY>`):
- `POST /catalogue` — published services, staff and branches.
- `POST /availability` — current live slots.
- `POST /test-booking` — rechecks a slot and saves an isolated test record only.

## Testing checklist

- Missing or incorrect API key is rejected.
- Catalogue contains only the selected published salon's data.
- Invalid/duplicate service IDs, date, branch and contact details are rejected.
- Availability comes from `studioflow_android_slots` or `studioflow_branch_android_slots`.
- A no-longer-available slot is rejected after the final recheck.
- Repeating the same requestId with the same details returns the same test record.
- Reusing a requestId with different details is rejected.
- Repeated test requests from one phone are rate-limited.
- Test writes are allowed only to `studioflow_whatsapp_test_bookings`; no live booking, payment, calendar hold or loyalty mutation is performed.
