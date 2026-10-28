# Template 07 implementation and release checks

The existing Vite application and `skincare_clinic` route remain authoritative. All thirteen sections enumerated in the brief are composed in `DermacureWebsite.tsx`; gallery, staff and durable reviews preserve existing published content alongside those sections. No separate demo application or duplicate service catalogue was introduced.

## Consultation flow

The inline form validates name/Indian mobile, service, date and a server-returned slot. It calls `studioflow_android_slots`, carries the selected specialist and details into the existing BookingModal, then that modal rechecks slots, signs the customer in if needed, reserves through the existing booking API and completes payment through the existing gateway. A form handoff is not an appointment confirmation.

Optional messages are never put into localStorage. Before payment, a nonempty message is persisted on the reserved booking using `studioflow_save_booking_message`. **Apply `backend/dermacure-consultation-message.sql` after the existing booking migrations before enabling messages in production.** This migration has not been applied to the hosted database in this session. It restricts writes to the authenticated customer’s own pending booking and preserves all price/status fields. A missing RPC produces an actionable error and does not falsely report message success or initiate payment. Message retries reuse the existing held reservation. The owner appointment list displays the saved message.

## Authentic content

Use About editor → Clinic technology to enter equipment model/manufacturer/specifications and an actual photograph. The explicit approval checkbox is cleared on edits. Unapproved details are not published. Bundled equipment imagery is labelled illustrative; no certification, efficacy or hardware specification is invented. The gallery shows owner-published non-demo images. Before/after pairs require existing consent and secure URLs. Backend customer reviews use the existing CustomerReviewPanel; non-demo approved profile testimonials have their own rated carousel.

Fonts are self-hosted under `public/templates/dermacure/fonts` with their licenses. Generated editorial images are not patient-result photographs. Publish actual clinic assets and approved privacy/terms content through the existing owner settings.

## Verification

- `node scripts/verify-dermacure.mjs`: section rendering, filters, validation, mocked live-slot handoff, review controls/ratings, comparison range, gallery, hidden contact and approved-only specifications.
- `node scripts/verify-dermacure-message.mjs`: isolated PostgreSQL authentication, ownership, state and length validation; price preservation.
- `npm run lint`, `npm run lint:edge`, `npm run build`, `npm run test:wiring`, `npm test` for project regressions.

A browser is not available in this workspace. Real 320/375px overflow, keyboard/touch focus, observer/parallax behavior and real hosted checkout remain release checks, not claims of completed verification. Live SMTP, payment and database deployment depend on configured external services.

## Latest verification result

`npm test` completed successfully with **67/67 offline verification suites passing**, including app/edge type checks, production build and all 48 SQL migrations in an isolated PostgreSQL fixture. `git diff --check` passed. The build still reports the existing large-bundle warning; React test renderer reports deprecation/concurrent-renderer warnings. These results do not substitute for live deployment or browser testing.

The owner-navigation regression fixtures were updated to explicitly include the already implemented SEO step (18 guided steps rather than the obsolete expectation of 17). Gallery/package fixtures now assert Template 07’s genuine-photo and complete-directory behavior instead of generic-template markup. No verification suites were skipped.

Clinic privacy and terms text can be authored alongside technology details in the About editor. They render as accessible expandable footer documents only when populated; the page does not invent legal commitments or show dead legal links.
