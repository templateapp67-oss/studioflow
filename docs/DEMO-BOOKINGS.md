# ₹0 demo booking mode

Open `/?app=1&demo=1` or choose “Try ₹0 Demo Booking” on the customer app. The yellow banner stays visible; navigation inside the app retains the demo mode. Sign in, select a published service/professional/time, review the demo summary and confirm for ₹0. The app displays the saved record under My Bookings with an explicit demo label. The normal app at `/?app=1` keeps the mandatory verified 25% advance.

Demo records are stored separately in studioflow_demo_bookings, with no real booking, payment order, loyalty award, staff hold or real owner calendar entry. Catalogue prices are shown only for reference; payable amount and amount paid are both zero. Cancellation is available. Demo rescheduling and payment controls are hidden; create another demo to practice a different time.

Database access requires authentication and own-customer RLS. The server validates current published menu/staff/time and rate limits demo creation. An idempotency key prevents duplicate retries. Clients can only read their own records and update status to cancelled; payload, owner/customer and money fields cannot be edited. The protected payment functions only look up real bookings, so demo records cannot be used as payment orders.

Validation: UI component regression asserts isolated demo RPC, no payment calls, ₹0 summary and labelled history without payment controls. Database rollback regression validates persistence, idempotency, same real slots before/after, unchanged real booking count, no payment order, cross-account privacy/cancellation denial, immutable payload and own cancellation. Fixture rows rolled back. Production build, TypeScript and existing customer-profile/PWA regressions also run before publication.


## Shop owner delivery

Owners now have a separate ₹0 Demo Bookings dashboard tab, also reachable from Bookings & Calendar → View customer tests. The direct route `/?owner=<published-slug>&panel=demo` checks that the signed-in account actually owns the published salon. Demo records stay outside real booking metrics, revenue and loyalty. Correct owner RLS permits read and status-only completion/cancellation; other owners cannot read or modify records. The customer sees the same demo status. Owner/customer demo views refresh every 15 seconds while visible, plus on focus/manual refresh.

Validation on 16 October: live readonly query under the vijaysalojaipur owner's authenticated database role returned one existing saved customer demo. Its status was not changed. Separate transactional tests created a customer demo, verified delivery to the correct owner, denied another owner, completed it as owner and verified customer visibility, with fixtures rolled back. Owner panel component regression covers query filtering, customer details, demo label, completion and refresh. No signed-in browser/physical phone test is claimed.
