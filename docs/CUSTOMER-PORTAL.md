# Customer portal and website booking connection

Customer entry: `/?app=1`. Direct sections: `/?app=1&tab=profile` and `/?app=1&tab=bookings`.

The existing shared Supabase salon, template, customer and booking records remain the source of truth. The new catalogue RPC returns all 14 active template categories and all non-test published salon websites. Two published customer salons are currently present. The existing QA sites remain in the database and are excluded from the customer directory. Template pages are labelled previews and cannot create appointments until an owner publishes an actual salon. Published websites appear through Realtime updates with focus/visibility refresh and a 30-second fallback.

Customer features:
- Reference-style profile sections: identity/photo, account & rewards, preferences, support/policies, sign-out.
- Profile name and phone are saved with the existing protected customer RPC and reused in booking contact fields.
- JPEG, PNG and WebP uploads up to 10 MB are center-cropped and resized to at most 640×640 JPEG. Storage upload uses a new UUID object path under the signed-in customer's private photos folder. Linking succeeds before the UI changes; failed linking cleans up the newly uploaded object and preserves the previous profile photo.
- Private photos use 1-hour signed URLs. URLs are refreshed every 25 minutes and on visibility/focus. They are reused for the Home header, Profile card and bottom Profile navigation. Account changes/sign-out clear the old account's image immediately. Signed URLs are not persisted in local storage.
- Saved addresses support owner-only create/edit/delete and city-based salon search.
- Theme and navigation language preferences are stored in Supabase for signed-in customers. Guest preferences stay on the device. Hindi applies to the greeting/navigation; salon content stays as published.
- Booking history, favorites, points/referrals and direct published salon support links. Points and referral copy do not fabricate cash balances or guaranteed rewards. Owner workspace access is shown only to owners of a published salon; it grants no new authority.

Database additions are in `backend/customer-portal.sql`. Both new tables have authenticated owner-only SELECT/INSERT/UPDATE/DELETE policies, explicit WITH CHECK predicates and ownership indexes. The public catalogue function uses SECURITY INVOKER, an empty search_path and only existing publicly readable template/website tables. No private customer data is returned by it.

Website/app booking connection:
- Published websites link to the same salon in the customer app and its My Bookings page. The owner entry page links to the customer app. Customer salon details link back to the public salon website.
- Both channels use the same authentication client and `studioflow_bookings` records. Existing trusted booking RPCs enforce staff locks, prices and slot availability. The app supports multiple services and contact prefill.
- Website bookings are visible to that customer in the app; app bookings are visible in the salon owner's workspace. The shared staff slot cannot be booked again from the other channel.

Verification:
- `backend/customer-portal-verification.sql`: live transactional profile/photo pointer, address CRUD, preferences, ownership and cross-account/storage isolation checks; all fixtures rolled back.
- `backend/customer-booking-wiring-verification.sql`: live bidirectional website/app/owner visibility, overlap prevention across both channels, exact price/duration snapshots, idempotency and payment-preserving reschedule; all fixtures rolled back.
- `scripts/verify-customer-profile.mjs`: frontend component/SDK-contract tests for 14 category cards, profile navigation, private photo processing/upload/signing and three image placements, failed-upload cleanup, profile saving, address city search, preferences, booking contact prefill and sign-out privacy. Storage and browser decoding are mocked in this suite.
- Existing template/booking tests, reference-screen tests, TypeScript checks, production build and PWA checks.
- Public HTTP catalogue returns 14 templates/2 customer salons; anonymous requests to private address/preferences tables return 401.
- Supabase advisors report no findings on the newly added customer tables/catalogue function. Existing unrelated project notices remain outside this change.
- Actual Android/Chrome visual comparison, a physical-device photo upload and live payment settlement are not verified in this environment because supported browser QA is unavailable. Payment/QR require the platform's payment provider configuration and server verification.
