# NEXORA staff attendance and biometric register

This module is attached to the shared owner workspace, so the same owner tool is available across all 16 salon templates.

## Manual attendance

- Staff profiles sync from the current salon's Team & Specialists list.
- Each staff member can have a weekly shift, weekly off, shift start/end, and break allowance.
- The owner can record check-in, check-out, break start/end, and manual daily status.
- The database records timestamps, source, notes, optional location coordinates, worked minutes, overtime, and an audit event.
- Late status uses the salon's grace period; exact arrival-delay minutes are stored for reports. Half-day status is calculated when the completed work duration is below half of the scheduled duration. Open shifts show live worked time and subtract active breaks.
- Approved leave automatically creates an on-leave attendance entry. Actual punches are never overwritten.
- Monthly reports can be exported as CSV. The owner can inspect recent audit events and device-push receipts from the activity-history and biometric-device tabs.
- A new check-in is blocked while any of the previous 90 days contains an unfinished shift. Owners cannot mark a day with a recorded check-in as absent, leave or holiday.

## Biometric attendance

Biometric punches use WebAuthn platform credentials. Each staff member should enroll on their own phone/tablet (or a separate OS user profile) with its platform authenticator. The authenticator asks for local user verification (fingerprint, face, or device PIN fallback). The server verifies the signed assertion and only then records a biometric check-in/out. A shared kiosk using one common OS biometric/PIN profile cannot prove which employee is present, because WebAuthn does not disclose a fingerprint identity to the website.

NEXORA stores a WebAuthn credential ID and public key only. It does not collect fingerprint images, face scans, or biometric templates. A passkey may use a synced authenticator; the UI must not promise that every credential is physically bound to only one device.

Biometric enrolment requires a supported browser, HTTPS, and a platform authenticator. Do not enroll every staff member against the same common kiosk authenticator if individual identity is required. Browser/device compatibility must be verified on the actual staff devices before production use.

## External fingerprint / face attendance machines

The module also provides a generic HTTP push endpoint for machines or a vendor bridge that can send events to a URL. The owner registers a device, receives a one-time API key, and maps each machine employee code to the matching salon staff profile.

Endpoint: `POST https://<SUPABASE_PROJECT>.supabase.co/functions/v1/staff-attendance-biometric`

Headers: `Authorization: Bearer <DEVICE_API_KEY>`, `apikey: <SUPABASE_PUBLISHABLE_KEY>`, `Content-Type: application/json`

Example request:

```json
{
  "action": "devicePunch",
  "employeeCode": "EMP-001",
  "eventType": "check_in",
  "eventId": "unique-device-event-id",
  "occurredAt": "2026-11-19T09:00:00+05:30"
}
```

The endpoint authenticates the device key, maps the employee code to an active staff profile, rejects unknown event types, and calls one transactional database operation for the device receipt and punch. Duplicate provider event IDs with identical payloads are idempotently acknowledged; reusing an ID with different data is rejected. Each registered device is limited to 60 accepted/replayed requests per rolling minute; the endpoint rejects further requests until the window expires.

This generic push contract is not a universal driver for every attendance machine. The machine or a trusted vendor bridge must perform the fingerprint/face match locally and send only the verified employee code and check-in/out event; never send raw fingerprint templates or face images to NEXORA. The device API key must be kept on the trusted machine/bridge. Devices that only support a proprietary SDK, local desktop software, or a vendor-specific protocol need a small adapter/bridge for their exact make and model. Do not advertise any particular hardware brand as compatible until that adapter has been tested.

## Database and security

Operational rows are owner-scoped with RLS. Biometric credentials, WebAuthn challenges, device API-key hashes, and device-event receipts are service-role-only; the service role is used only inside the Edge Function. The two write RPCs for attendance are also service-role-only and must only be called after the Edge Function authenticates the owner or verifies the device key and (for biometric events) the WebAuthn assertion.

## Release gates

Before enabling this for live salons:
1. Apply the migration in the intended database after review.
2. Deploy the Edge Function with the service role key available only as a Supabase Function secret.
3. Verify manual check-in/out, breaks, shift-based late calculation, overtime, leave approval, owner isolation, and CSV export.
4. Register and test one platform biometric on both Android and iOS devices used by staff.
5. Test the exact external device model/bridge against the push endpoint.
6. Complete build, full test suite, and browser E2E on all shared owner-workspace entry points.
