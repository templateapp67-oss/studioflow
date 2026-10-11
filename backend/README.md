# StudioFlow Supabase backend

Project: zilwgiuiygqqardzutxi. Uses the existing Auth, profiles, growth_partners, growth_onboarding and partner_referrals tables. StudioFlow drafts and published content have separate tables so the other Nexora editor is not overwritten. Business identity is mirrored into profiles.

Applied SQL, in order:
1. studioflow-schema.sql
2. studioflow-template-catalog.sql (14 templates present in this Site)
3. studioflow-backend-validation.sql
4. studioflow-storage-and-booking-status.sql
5. studioflow-availability.sql
6. studioflow-book-available-slot.sql
7. studioflow-save-conflict.sql
8. studioflow-audit-fixes.sql
9. studioflow-dashboard-wiring.sql

Drafts and customer details are private. Only sanitized published content and the template catalog are publicly readable. Owner writes and public bookings use RPC wrappers with private, restricted database implementations. Workspace saves use revision checks to prevent lost updates across tabs. Images use owner paths in the public studioflow-media bucket.

Referral codes come from growth_partners. Signup metadata and the incoming ref parameter are validated and linked once, and start/publish progress updates the shared referral dashboard. No reward amounts are fabricated.

Run `node scripts/verify-supabase.mjs` only against this configured test target with email autoconfirm enabled. It uses disposable test accounts and verifies real signup/login, persistence, RLS, publish, referral, bookings and storage. It signs out and removes test media; delete its exact test users and booking rows afterward. `studioflow-verification.sql` verifies database behavior inside a rolled-back transaction without persistent QA rows.

Payments: the centralized studioflow-payments Edge Function implements server-created Razorpay orders and captured-payment verification. A mandatory 25% deposit is enforced by the current booking RPCs. Pending reservations hold slots for 15 minutes. Client code cannot mark a booking paid. Provider secrets and an actual successful payment still require verification; cash without the required deposit is not supported by the current flow. See ../docs/platform-payment-setup.md. Commission settlement and automatic refunds remain separate integrations.

Browser QA is unavailable in this managed environment. TypeScript, production build, database assertions and real HTTP integration checks are used instead.

See GAP-AUDIT.md for the current fixes, verification and remaining provider/configuration dependencies.

Dashboard wiring: promo campaigns, social videos, social URLs, section toggles/headings/testimonials are saved in the shared profile. Gallery, policies, branding and public loyalty rewards come from the same workspace. After the first manual publish, successful workspace saves update public content automatically without changing the published URL; URL changes still require Publish. Public pages check for saved updates on focus and every 15 seconds while visible. Run `npm run test:wiring` for all-template rendering and editor persistence; `studioflow-wiring-verification.sql` checks server projection and autosync in a rollback.
