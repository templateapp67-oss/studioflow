# Booking modal: multiple services and specialist preview

## Behaviour

- Shared website `BookingModal` supports 1–10 services via keyboard-accessible checkbox cards. The initial service remains preselected; users can deselect everything but cannot continue until a service is selected.
- One ID list drives summed price, duration, 25% advance (rounded up to a paisa), coupons, availability, reservation payload, review and confirmation messages. Add-on controls use the same list without double-counting.
- A service or location change invalidates the slot and specialist choice. Coupons are re-quoted for the exact bundle. The backend remains authoritative for prices and the complete appointment window.
- Specialist eligibility is the intersection across **all** services and the chosen branch. Published profile fields returned with the eligibility RPC resolve missing/stale parent staff data. Private schedules, phones and commissions are not returned.
- Selecting a specialist only selects them. **View Profile** explicitly expands a bio/portfolio panel inside the booking dialog. Back to booking (or Escape while inside the panel) closes only that panel, preserving booking choices. Only consented portfolio photos appear.
- Loading, empty, failure/retry and stale response cases block invalid progression. Missing experience/rating data is labelled honestly.

## Database deployment (required)

Apply `supabase/migrations/202611050001_booking_multi_services.sql` **before deploying the UI**. It depends on the existing backend booking-add-ons / booking-specialist-eligibility scripts, multibranch migration, and Template 15 migration. No production database was modified as part of this change.

The migration:

1. Extends existing specialist RPC responses with a public-only `specialists` array; keeps `specialistIds` compatible with older clients.
2. Evaluates branch eligibility against private staff assignments (published profiles intentionally omit those assignments).
3. Fixes branch and unbranched bundle slot engines to require **every** selected service, not merely one matching service. A branch appointment cannot wrap past closing or overlap the same specialist at another branch.
4. Allows explicit `serviceIds` from the published menu through `studioflow_book` / branch booking. Legacy add-on-only requests retain the configured add-on whitelist. Prices, durations, overlap locking, authentication and payment verification remain server-side.
5. Extends Template 15's men's booking/offer adapters to bundles while preserving male-only service/staff restrictions, holidays, leave, breaks and full-window opening hours. Offers discount only eligible items.

The reservation carries `serviceIds`, the legacy primary `serviceId`, remaining IDs in `addOnIds`, and total `durationMinutes`. Saved multi-service bookings also retain the authoritative `serviceItems` snapshot.

## Offline checks

```sh
npm run lint
npm run build
node scripts/verify-booking-multi-service.mjs
node scripts/verify-booking-specialist.mjs
node scripts/verify-booking-close.mjs
node scripts/verify-booking-coupons.mjs
node scripts/verify-sql-migrations.mjs
```

The SQL suite applies the migration twice in PGlite and exercises public profile privacy, branch/unbranched eligibility, combined duration, server-calculated totals/deposit, retries, overlap and anonymous rejection, plus men's bundle/coupon/break handling. UI tests mock RPC/payment configuration; no real booking or payment is sent to a live service.

### Verification outcome

TypeScript (app and edge), production build, and booking, coupon, conversion,
checkout, multibranch and Template 15 targeted suites pass. The full offline
runner exposed nine unrelated failures that also reproduce against the starting
commit: app-install-section, customer-account-settings, customer-reference,
loyalty-themes, photo-gallery, service-photos, starter-packages, stylist-profile,
and website-wiring (largely existing Aurelia template expectations). Those
unrelated template behaviours were not changed here.
