# Template 07 implementation and verification report

## Status

Implementation is in the local working tree. **Migration: Not Applied** to hosted Supabase. The existing public snapshots and direct booking APIs remain unsafe until an authorized administrator reviews and applies the migration. Do not interpret this as production readiness.

## Database and manual deployment

- `backend/dermacure-editorial-privacy.sql` is the transactional migration. It is designed to run last, after the existing catalogue/image, dashboard, staff portfolio, add-on/coupon and POS migrations. Other later migrations that redefine the same functions need reconciliation.
- The sandbox had no authorized database credentials and could not establish TLS to the configured Supabase project (`SSL_ERROR_SYSCALL`). Its actual schema, policies, stored data, service-status/pricing counts and hosted auth, save, booking and enquiry flows were **not verified**. Real service counts are unavailable.
- An authorized DBA must directly confirm the project and deployed schema, back up the database, review the migration and its dependencies, then execute the full file as one transaction using the project's SQL editor or an authorized database connection. Verify public projection, owner/customer/third-party isolation, editor persistence and live test booking/enquiry flows afterward. Applying it refreshes published clinic snapshots; coordinate with clinic owners. Existing bookings and payments are not rewritten by the migration.

## Implemented locally

- Independent treatment verification, publication and fee states; null price is not a free service. Legacy flags are not automatically promoted to the new fee status. Published verified fixed-fee services are bookable; verified services without confirmed fees use enquiry only; draft, hidden or unverified services are excluded.
- The existing workspace editor saves through Supabase. The local migration adds server-stamped verification, owner-only audit, public projection filtering, a booking insert guard, and a persistent authenticated enquiry RPC with an owner inbox. Backend validation independently checks current authoritative service/fee, published snapshot, amount, service set and caller. Errors remain visible.
- No remote application or hosted functionality is implied by these source changes.

## Verification actually performed

- `npm test`: **73/73 suites passed**, including TypeScript lint, edge lint, production build, and offline migration checks. The build emitted the existing large-chunk warning; React test renderer emitted deprecation/multiple-renderer warnings.
- `node scripts/verify-dermacure-editorial-privacy.mjs`: migration applied twice in an isolated PGlite fixture. Tested private projections and IDs, nullable fee, audit stamping, sample-content filtering, selected single/multiple service and owner POS insert payloads, wrong caller/price, unavailable services, authenticated/anonymous enquiry grants, owner/customer/third-party RLS, input validation and rate limit. The fixture uses stubbed Supabase schema/auth and **does not prove real deployed RPC integration or RLS**; coupon updates and full hosted mobile/add-on/payment flows need integration testing.
- `node scripts/verify-dermacure-pricing.mjs`: local status/fee editing and nullable/legacy price checks; enquiry UI error and confirmed-ID success paths. No real enquiry was sent.
- Headless Chromium with synthetic, mocked Supabase data at **320, 375, 430, 768, 1024 and 1440 px**: priced booking modal, enquiry sign-in, private-service hiding, FAQ, mobile navigation, no horizontal overflow or uncaught JavaScript errors. External font requests were deliberately blocked. This was not a real booking, persistence, remote auth test or screenshot-reference parity check.
- `git diff --check` passed.
- Dermacure has bundled Cormorant Garamond and Manrope font files plus system fallbacks. Shared app Google Fonts requests and the configured Supabase endpoint could not establish TLS in this sandbox; this is not proof of a provider-wide outage.

## Follow-up gap audit (local)

- Fixed owner inline edits leaving incompatible verification/publication states: a fee or duration edit now invalidates fee verification, and a name or description edit returns the clinic service to draft and clears stale verification metadata. Non-clinic behavior is preserved.
- Published article and FAQ edits now return to draft, incomplete entries cannot be newly published in the editor, and the migration rejects bypass attempts to keep changed published content approved. It also rejects changed approved equipment until a separate unapproved save. Review and republish after the draft has saved.
- An enquiry now resumes with the selected service after sign-in, and a new enquiry starts with an empty message. The UI still reports errors instead of a false success.
- Clinic preview now opens the connected service, team and content editors instead of the legacy mock-data canvas, which could create a sample service with an invented fee or an invented staff member. Choosing a new clinic treatment no longer pre-fills a sample fee. Clinic staff creation starts with no preset portrait, title or generated bio. Unsplash stock avatars are omitted from clinic public projections without altering stored owner drafts; an initial is used instead. Template demo portraits remain labelled in template previews.
- Added an explicit optional public clinic contact email. The existing account email stays private; invalid public email addresses are not projected or linked. Malformed phone and WhatsApp details do not generate broken contact links.
- Local React tests cover these transitions, the owner-preview route, clinic staff defaults, public contact details and sign-in handoff. PGlite tests cover editorial/equipment bypass rejection and draft-save/reapproval. A headless browser used synthetic mocked authentication and an intentionally failing enquiry RPC to confirm handoff and visible error; no live account or enquiry was created.

## Files in this session's working tree

Paths below include the existing Template 07 redesign and preview-routing work as well as this verification/publication implementation. They are listed exactly; none is a remote deployment artifact.

- `backend/README.md`
- `backend/dermacure-editorial-privacy.sql`
- `docs/DERMACURE-DESIGN.md`
- `docs/DERMACURE-IMPLEMENTATION-REPORT.md`
- `docs/DERMACURE-REFERENCE-DESIGN.md`
- `scripts/verify-dermacure-editorial-privacy.mjs`
- `scripts/verify-dermacure-nav.tsx`
- `scripts/verify-dermacure-pricing.mjs`
- `scripts/verify-dermacure-pricing.tsx`
- `scripts/verify-dermacure.tsx`
- `scripts/verify-service-photos.tsx`
- `scripts/verify-service-selection.tsx`
- `scripts/verify-staff-portfolios.tsx`
- `scripts/verify-starter-packages.tsx`
- `scripts/verify-subdomain-routing.tsx`
- `scripts/verify-website-wiring.tsx`
- `server.ts`
- `src/App.tsx`
- `src/components/AddStaffModal.tsx`
- `src/components/ConversionEditors.tsx`
- `src/components/CustomerSalonWebsite.tsx`
- `src/components/DermacureWebsite.tsx`
- `src/components/OwnerWorkspace.tsx`
- `src/components/PromoStudio.tsx`
- `src/components/SaaSDashboard.tsx`
- `src/components/SalonWebsitePreview.tsx`
- `src/components/ServiceManagement.tsx`
- `src/components/TeamManagement.tsx`
- `src/components/WebsiteContentManager.tsx`
- `src/components/dermacure.css`
- `src/components/dermacure/BookingSection.tsx`
- `src/components/dermacure/BrandPhilosophy.tsx`
- `src/components/dermacure/ClinicContentEditor.tsx`
- `src/components/dermacure/ClinicEditorialEditor.tsx`
- `src/components/dermacure/ClinicEnquiries.tsx`
- `src/components/dermacure/ClinicEnquiryDialog.tsx`
- `src/components/dermacure/ClinicTeam.tsx`
- `src/components/dermacure/ContactSection.tsx`
- `src/components/dermacure/DiscoverySections.tsx`
- `src/components/dermacure/EditorialImage.tsx`
- `src/components/dermacure/FeaturedTreatments.tsx`
- `src/components/dermacure/Footer.tsx`
- `src/components/dermacure/Header.tsx`
- `src/components/dermacure/HeroSection.tsx`
- `src/components/dermacure/PatientJourney.tsx`
- `src/components/dermacure/PlatformSections.tsx`
- `src/components/dermacure/ResultsSection.tsx`
- `src/components/dermacure/ServicesSection.tsx`
- `src/components/dermacure/TestimonialsSection.tsx`
- `src/components/dermacure/animation.ts`
- `src/components/dermacure/context.tsx`
- `src/index.css`
- `src/lib/dermacureContent.ts`
- `src/lib/normalizeWorkspace.ts`
- `src/lib/resolveSite.ts`
- `src/lib/serviceCatalogue.ts`
- `src/types.ts`
