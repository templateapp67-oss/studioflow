# Customer booking fix — 16 October 2026

The Add Staff form inserted two unrelated nail service names in every new staff record. The customer application requires service IDs, so real barber and Ayurveda menus had no eligible staff. New staff service chips now come from the current salon menu and store IDs. Owners can edit service restrictions in Team → Edit Stylist. Empty assignments mean all services, consistent with the existing server behavior.

Applied a narrow data repair for the exact two seeded names, only when neither is in the published menu; existing intentional assignments are preserved. Workspace revision increments prevent stale clients overwriting the repair. Both published salons now return slots for all 11 current services (12–14 each on the next day when checked). Website availability now also enforces explicit service restrictions and published staff membership, matching the app.

The app incorrectly sent payment action `health` while the trusted payment function accepts `status`. Corrected the client and regression mock to the actual contract. Payment and authentication protections remain enforced.

Validation: TypeScript, production build, customer reference suite, all-14-template wiring suite, staff creation/edit component regression, live cross-channel booking/isolation rollback suite, and real-menu pending-reservation/restriction rollback tests passed. No test bookings or fixture accounts retained.

Remaining production blocker: GET studioflow-payments returned configured:false and webhookConfigured:false on 16 October 2026. The account owner must configure RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET in Supabase Edge Function secrets, and enable the payment webhook. Never put secrets in browser code or chat. Mandatory 25% advance cannot settle until this setup is complete. No physical Android or real payment settlement claimed.
