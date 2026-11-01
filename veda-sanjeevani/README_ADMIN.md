# Veda Sanjeevani Admin

## Owner’s 30-minute launch guide

1. **Connect Supabase.** Copy the Supabase project URL and public anon key into the frontend environment (`.env.frontend.example` is the browser-only reference). Never put a service-role key in frontend variables.
2. **Apply migrations.** Apply the repository migrations in order, including `007_admin_setup.sql`, to the Supabase project. Verify the `site-images` bucket and Auth email settings in the Supabase dashboard.
3. **Create the owner.** Visit `/admin/login` and use **Create the owner account** while first-owner setup is open. Confirm the email if required, then sign in. The first signup is intended to claim the owner role.
4. **Review the studio.** Use the admin tabs to check existing services, team, content, gallery, bookings, and reviews. Replace template content and images with accurate, consented studio material.
5. **Set up media and hours.** Add accurate booking hours and image alt text. Use the prompt library for image ideas; upload and register images only after the image pipeline and migration contracts have been validated in your Supabase environment.
6. **Test guest flow.** Open the public site on a phone-sized viewport, submit a test booking, and verify it appears in Bookings. Confirm, reschedule, cancel, and complete test records as appropriate, then remove test data according to your studio policy.
7. **Publish carefully.** Check business contact details, prices, hours, privacy/terms, and wellness wording. Only publish once the launch checklist is complete; keep an unpublish option available.

> Screenshot placeholders: [Owner sign-in] · [Bookings] · [Service editor] · [Publish checklist].

## Current implementation checklist

- [x] Supabase Auth session persistence, profile/role loading, first-owner signup availability, password reset, and role-aware admin access shell.
- [x] Admin login screen and noindex metadata for `/admin` routes.
- [x] Responsive admin navigation with owner tabs and a staff-only Bookings view.
- [x] Initial dashboard counts, bookings list/status actions, optimistic rollback, toast messages, offline banner, and booking Realtime invalidation.
- [x] Admin API schemas and validation helpers; image prompt and stock-photo search library.
- [ ] Seven-step resumable setup wizard, AI generation/review workflow, complete content/service/team/gallery/review/settings editors, and publish checklist.
- [ ] Browser image resize/upload/WebP variants, registration and row-linking UI; complete booking calendar/rescheduling and review actions.
- [ ] Supabase migration 007 application and integration validation against a configured project.

## Access and operations

Staff accounts should be created by the owner through the configured Supabase Auth/dashboard invitation workflow; if public signup is disabled, send an invite from Supabase. Role enforcement must remain in database RLS as well as the interface. The browser uses only the Supabase anon key. A service-role key must remain server-side.

The source-image upload contract permits at most 10 MB in the browser; the Supabase `site-images` bucket itself is limited to 5 MB per object. Upload implementations must resize/compress variants before storage. This upload pipeline has not yet been completed or live-tested here.

## Verification record

Latest completed repository checks: `npm run typecheck`, `npm run lint`, `npm run test` (15 tests passed), and `npm run build` all passed before the most recent Realtime and image-prompt additions. Re-run after changes before release. No configured Supabase project was available, so Auth, migration application, Edge Functions, Storage, Realtime, and end-to-end publishing have not been verified against a live backend. No browser/Axe/Lighthouse or Playwright smoke test has been run.
