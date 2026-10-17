# Customer referrals

Copy Invite Link copies an HTTPS URL only: `/?app=1&auth=signup&customer_ref=CODE`. WhatsApp shares readable text containing that URL. Customer codes use customer APIs and storage, separate from growth-partner codes.

Invitations persist locally for 30 days across the app and published salon websites. Signup metadata is validated into a private database attribution row, so confirmation on another device preserves the original inviter. Signed-in customers can also save an invitation before their first real booking. Attribution cannot be reassigned. Self-referrals, same-email referrals and anonymous accounts are excluded.

The network program awards the inviter **200 salon points once**, after the friend's first real, paid, owner-completed appointment at a published salon with loyalty enabled. Both emails must be confirmed, the inviter/customer cannot be the shop owner, and the booking must have a positive service price and recorded payment. No cash discount is promised. Demo, pending, cancelled, unpaid visits and repeat completions do not generate referral awards. There is no retroactive credit for visits before attribution.

The protected booking status transition runs the award trigger for both website and app bookings. Customers cannot mark visits completed or modify the referral table. Per-invitee advisory locks and the unique invitee row prevent duplicate attribution/credit. Optional invalid signup codes cannot block Auth signup. The private summary exposes counts and totals. A separate authenticated, paginated members API shows only the current inviter's referred members: name, join date, email-confirmation/visit qualification status and earned referral points. It omits email, phone, photos and customer IDs. Signup explains this visibility.

Referral credits feed the same salon wallet, lifetime tier, Android/header rewards RPC, redemption balance and history as visit points. Existing vouchers and owner claim consumption remain unchanged. Rewards refresh every 30 seconds while visible and on focus/manual refresh.

Database checks: `backend/customer-referrals-verification.sql`, `backend/customer-rewards-verification.sql`. Both use temporary fixtures inside transactions and roll back all data; no real customer balance or payment is altered. UI checks include URL-only copying and existing voucher retry/privacy tests.

Guests opening new or existing customer referral URLs see the signup form automatically with the sender code prefilled. Signed-in senders opening their own link now see the same dedicated signup page as other visitors. Switching accounts requires an explicit Use another account action; it signs out locally and reopens the signup invitation.

Invitation URLs now render a dedicated signup page for guests AND signed-in visitors. They do not show the directory header or referral banner. The existing session remains intact while viewing the form; explicit Create account validates the code, signs out locally if necessary, then submits signup with referral metadata. Confirmation redirects to rewards rather than reopening signup. Normal app use keeps self-referral protection without a self-invitation banner.

Customer signup now requires Date of Birth in both normal and invitation forms. ISO dates from 1900 through today in Asia/Kolkata are accepted. Auth signup metadata is validated into the private customer profile by a server trigger; invalid/future dates are rejected server-side. Referral member projections omit DOB. See `backend/customer-birth-date.sql` and its rollback verification file.

Both customer signup forms also require a WhatsApp number with a fixed +91 prefix. Pasted +91 numbers are normalized to ten national digits, validated in the browser and again by a signup trigger, and stored as +91 plus ten digits in the private profile. The signup phone is available to the existing customer profile/booking flow; referral projections omit it. This field does not send messages or mark a number verified. Verification lives in the combined customer-birth-date rollback suite and referral form tests.

Normal and referral customer signup now requires both DOB and WhatsApp: HTML required attributes, explicit pre-submit checks and a database BEFORE INSERT guard reject missing customer signup metadata fields. Existing accounts and other application/owner signup flows are preserved.
