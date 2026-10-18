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

Payments: no live payment provider is configured. Booking prices come from published services; amountPaid stays zero. Deposit-required requests remain pending and cannot be manually confirmed. Cash-at-salon requests can be confirmed without a deposit. Refunds, online charging and commission settlement require a verified payment provider integration.

Browser QA is unavailable in this managed environment. TypeScript, production build, database assertions and real HTTP integration checks are used instead.

See GAP-AUDIT.md for the current fixes, verification and remaining provider/configuration dependencies.

Dashboard wiring: promo campaigns, social videos, social URLs, section toggles/headings/testimonials are saved in the shared profile. Gallery, policies, branding and public loyalty rewards come from the same workspace. After the first manual publish, successful workspace saves update public content automatically without changing the published URL; URL changes still require Publish. Public pages check for saved updates on focus and every 15 seconds while visible. Run `npm run test:wiring` for all-template rendering and editor persistence; `studioflow-wiring-verification.sql` checks server projection and autosync in a rollback.

Customer reviews: `studioflow-customer-reviews.sql` creates durable reviews separate from owner/demo testimonials. `studioflow_list_reviews` returns public-safe fields without account IDs; `studioflow_submit_review` allows signed-in customers to create/update one review per salon and validates ownership of optional `studioflow-media` photos. Verified visit status is derived from completed bookings, never supplied by the client. Private functions hold privileged reads/writes; public wrappers use invoker privileges. Direct table mutations are blocked. Owner submissions are labelled Owner update and never receive a verified visit tag. `studioflow-customer-reviews-verification.sql` verifies these rules in a rolled-back transaction.


## Business Services & Custom Service Offerings

Apply `studioflow-service-catalogue.sql` after the existing StudioFlow migrations. `studioflow_accounts.draft.services` remains the authoritative catalogue; an account trigger validates each service and synchronizes `studioflow_services` in the same save transaction. Existing services are backfilled without modifying owner drafts or revisions. The relational table is owner-readable with RLS and has no client write grants. Existing `studioflow_save_workspace` saves the complete catalogue and atomically updates the published website through `website_content`; new/changed services retain stable IDs for booking.

Custom offerings carry `origin: "custom"`; unchanged starter offerings carry `origin: "template"`. Theme changes retain custom services and swap only unchanged template starters. `profile.serviceCatalogueInitialized` distinguishes deliberate removal of every service from a new workspace, so deleted menus are not reseeded.

Run `studioflow-service-catalogue-verification.sql` to verify add/edit/remove, all fields, template changes, public projection, empty menus, input constraints, revision conflicts and tenant isolation. This check rolls back its test changes. Frontend coverage is in `node scripts/verify-website-wiring.mjs`.


### Service images

Apply `studioflow-service-images.sql` after the catalogue migration. Service photos are optimized to a maximum 1200px edge / 2 MB and uploaded under the signed-in owner’s `studioflow-media/<owner>/services/` folder. The catalogue stores both `image_url` and `image_path`; its private synchronization trigger validates the pair, storage object existence, image MIME type and owner folder. Existing storage policies restrict upload/update/delete to the owner’s folder. Workspace saves atomically update the public snapshot; `studioflow_websites` and `studioflow_accounts` are already in the Realtime publication.

All customer themes use a 3:2 `object-fit: cover` frame; owner previews update directly from React state. Remove photo clears the saved service association. Saved media is retained when detached to avoid breaking reuse; newly uploaded images abandoned before saving are cleaned up through the Storage API. `studioflow-service-images-verification.sql` checks upload ownership, URL/path matching, save/replace/remove, theme persistence and public synchronization with rollback.

Advanced conversion features: apply `booking-add-ons.sql` after the mobile multi-service booking functions. It keeps `studioflow_book` compatible with old requests, accepts optional `addOnIds` + `requestId`, and validates offered extras, combined duration, staff eligibility, overlap locks and server prices through the existing multi-service contract. `booking-add-ons-verification.sql` runs a rollback-only synthetic booking/privacy/state test across all 14 templates. Payment continues to use the saved server price and 25% deposit.

Owner profile state now includes `bookingAddOnServiceIds` (step 5), `comparisonPhotos` (step 7), `reviewSource` and `defaultWebsiteLanguage` (step 11). These use the existing versioned workspace save and sanitized published projection. Comparison pairs require explicit permission confirmation. External review modes are profile link, labelled owner-curated excerpts, or labelled simulation; no Google/Instagram scraping or external review API is configured. Published salon feed settings refresh from Supabase every 60 seconds and on manual refresh. The language selector switches key website UI labels; custom salon copy is not automatically translated.
