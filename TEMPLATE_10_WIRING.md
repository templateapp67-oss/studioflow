# Template 10 — Prism & Chroma (hair_coloring) live wiring

Every section of the Prism & Chroma atelier now reads from the salon's own
database rows. Nothing on a published `?site=<slug>` page comes from bundled
demo content, a cached slug, `localStorage` or a fallback salon.

## What was already live (reused, not duplicated)

| Section | Source | Notes |
| --- | --- | --- |
| 1 Navbar / branding | `studioflow_websites.content.profile` | name, logo, phone, WhatsApp, CTA, customer auth |
| 2 Hero | `profile.prismChroma` + published profile | owner-edited headline, subtext, photo, CTA |
| 3 Services | `studioflow_websites.content.services` | `studioflow_services` stays a trigger-synced projection |
| 4 Gallery | published gallery + `studioflow-media` storage | `prismLiveGallery()` drops `isDemo` photos |
| 5 Packages | `profile.prismChroma.packages`, else package services | prices come from the saved catalogue |
| 6 Team | `studioflow_websites.content.stylists` | schedule-driven availability, no fabricated staff |
| 7 Before / after | `profile.prismChroma.beforeAfter`, else consented `comparisonPhotos` | unconsented pairs never publish |
| 10 Booking | `studioflow_available_slots` → `studioflow_book` | same booking rows as Templates 01–09, the owner dashboard and GlowSlot |
| 11 Business info | published profile | timings, address, map link, socials |
| 14 Auth | Supabase Auth via `onAccount` | customers sign in / sign up in place |

## What this change adds

| Section | New surface |
| --- | --- |
| 8 Testimonials | `studioflow_prism_site` → approved `studioflow_reviews` only; signed-in customers submit a review that stays **pending** until the owner approves it; the author keeps seeing their own pending copy |
| 9 Offers | `studioflow_offers` (dated, coded, activatable) with copy-code and book-the-linked-service CTAs |
| 11 Contact / enquiry | `studioflow_enquiries` via `studioflow_prism_enquire` (validated, 3 per phone per salon per 15 minutes) with a reference id on success |
| 13 Newsletter | `studioflow_newsletter_subscribers` via `studioflow_prism_newsletter` (re-subscribe safe) |
| Dashboard | new **Colour Studio Inbox** tab: enquiries with status + CSV export, review approvals with public replies, dated offer editor, newsletter subscribers |

Reviews keep backwards compatibility: rows created before this migration are
backfilled `status = 'approved'`, and Templates 01–09 still auto-approve new
reviews exactly as before. Only `hair_coloring` salons hold new reviews for
moderation.

## Files

Added:

* `backend/prism-chroma-template-10.sql` — the idempotent migration
* `backend/prism-chroma-template-10-seed.sql` — demo catalogue + optional demo salon rows
* `supabase/migrations/202610300002_prism_chroma_template_10.sql` — byte-identical copy for the Supabase CLI
* `supabase/seed/prism_chroma_demo.sql` — byte-identical seed copy
* `src/lib/prismSite.ts` — typed payload parser, `usePrismSite`, live adapters, validators, mutations, owner inbox reader
* `src/components/prism-chroma/LiveStates.tsx` — skeleton / error / empty / notice states
* `src/components/prism-chroma/ReviewsLive.tsx` — approved reviews, pending own review, composer
* `src/components/prism-chroma/OffersLive.tsx` — live offers
* `src/components/prism-chroma/ContactEnquiry.tsx` — business information + enquiry form
* `src/components/prism-chroma/NewsletterSignup.tsx` — footer signup
* `src/components/prism-chroma/PrismChromaOwnerPanel.tsx` — owner inbox / moderation / offers
* `scripts/verify-prism-chroma-live.tsx` + `.mjs` — offline verification

Changed:

* `src/components/PrismChromaWebsite.tsx` — live mode, section gating, contact + offers + newsletter sections, no demo data on a published site
* `src/components/CustomerSalonWebsite.tsx` — passes the published `live` flag through
* `src/components/SalonWebsitePreview.tsx` — `live` prop on the published-site path
* `src/App.tsx` — marks only the published site as live
* `src/components/SaaSDashboard.tsx` — Colour Studio Inbox tab (hair_coloring only)
* `src/components/prismChroma.css` — styles for the new states, forms, offers, reviews and modal
* `backend/README.md` — apply order and behaviour notes

## Manual steps

1. **Apply the migration** in the Supabase SQL editor for project
   `zilwgiuiygqqardzutxi`, after `studioflow-schema.sql`,
   `studioflow-storage-and-booking-status.sql`,
   `studioflow-customer-reviews.sql` and `studioflow-owner-review-update.sql`:

   ```sql
   -- paste backend/prism-chroma-template-10.sql
   ```

   Or `supabase db push` if you deploy the CLI migrations folder. The file is
   rerunnable and does not drop or rewrite any table used by Templates 01–09.

2. **Seed the demo catalogue** (safe to re-run):

   ```sql
   select set_config('studioflow.demo_slug', 'your-demo-slug', false);
   -- paste backend/prism-chroma-template-10-seed.sql
   ```

   With no published salon at that slug only the public `studioflow_templates`
   row (`hair_coloring`) is refreshed; no owner data is touched.

3. **Environment variables** — the browser keeps using the existing public
   Supabase client in `src/lib/supabase.ts`; no new keys were introduced and
   nothing is hardcoded in the new code. Server / edge credentials stay in the
   existing `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
   `SUPABASE_SERVICE_ROLE_KEY` variables. If you later move the browser config
   to Vite env vars, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in
   the deployment.

4. **Storage** — no new buckets. Gallery / team / before-after uploads keep
   using the public `studioflow-media` bucket with owner-folder write policies
   (`storage.foldername(name)[1] = auth.uid()`).

5. **Verify**

   ```bash
   npm run lint
   npm run build
   node scripts/verify-prism-chroma-live.mjs
   node scripts/verify-sql-migrations.mjs
   node scripts/verify-website-wiring.mjs
   npm run test
   ```

## RLS spot checks

```sql
-- anon reads only the public payload, never table rows
select studioflow_prism_site('your-slug');            -- allowed
select * from studioflow_offers;                      -- blocked for anon

-- a signed-in owner sees only their salon
select * from studioflow_enquiries where salon_id = auth.uid();
select * from studioflow_newsletter_subscribers where salon_id = auth.uid();

-- moderation
select studioflow_prism_moderate_review('<review-uuid>', 'approved', 'Thank you!');
```

## Booking parity with GlowSlot

Template 10 never writes bookings directly. The website calls
`studioflow_available_slots` / `studioflow_android_slots` to render real slots
(30-minute grid, working hours, service duration, stylist schedule and existing
bookings) and `studioflow_book` to insert a `pending` booking with the
customer's name, phone and email. That is the same table and the same RPCs the
owner dashboard and the GlowSlot/Nexora customer app use, so there is one
source of truth and no double-booking: the server takes an advisory lock per
salon/stylist and rejects overlaps. Customers view and cancel their own rows
through `SalonBookingsDialog` → `studioflow_update_booking`.
