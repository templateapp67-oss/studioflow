# Template 16 — Aurelia Luxury Beauty & Wellness Studio

**NEXORA display name:** NEXORA Aurelia Beauty Parlour  
**Salon demo name:** Aurelia Luxury Beauty & Wellness Studio  
**Template ID:** `aurelia_beauty_parlour`  
**NEXORA category:** Beauty Parlour (shared with Template 03 / Roop Mahal)  
**Priority rank:** 16

## Preview

- `/?template=16`
- `/?template=aurelia_beauty_parlour`

Template 16 is a new, separate template. It does not replace or rename `beauty_parlour` (Roop Mahal).

## What was ported

The visual language from `vijay-facebook/Aurelia-app` has been adapted into StudioFlow components:

- Ivory / coffee / sandstone editorial look
- Header and announcement bar
- Hero and salon story
- Services and full menu
- Team profiles
- Gallery with lightbox
- Video gallery
- Promotions & Offers
- Customer reviews
- Contact, WhatsApp and booking
- Responsive mobile navigation
- Owner editor for content, visibility, order, logo, images, theme colours, gallery, videos, offers, services and staff

The original Aurelia repository used a local JSON config file and server uploads. Those standalone storage/auth flows were not imported. StudioFlow's existing owner workspace and publishing model is authoritative.

## Existing StudioFlow wiring

- Owner content: `studioflow_accounts.draft` through the shared workspace save flow
- Published website: `studioflow_websites.content`
- Services and staff: existing `SalonService[]` and `Stylist[]` workspace records
- Booking: shared `BookingModal` and StudioFlow booking backend
- Media uploads: existing `uploadSalonImage` helper and owner-scoped Supabase Storage path
- Reviews: existing `CustomerReviewPanel` / `studioflow_list_reviews`
- Template registry: `public.studioflow_templates`

No separate Aurelia customer, booking, staff or auth tables were created.

## Media notes

The starter photography uses verified public image assets from Aurelia's source repository. Images uploaded by a salon owner are saved using StudioFlow's existing Supabase media helper.

The old Aurelia sample video URLs were generic Google sample clips rather than authentic Aurelia studio videos. They are deliberately not imported. The Video Gallery shows a truthful empty state until the owner adds a real YouTube / Instagram / MP4 link.

## Promotions note

Aurelia sample offers are persisted as part of the owner workspace profile and can be added, edited, activated, deactivated and deleted in the Template 16 editor. The current customer-facing CTA is an enquiry / service-booking handoff; it does **not** claim that a discount has been applied to checkout. The existing shared coupon RPC currently validates customer reward-claim codes, not arbitrary `profile.promoOffers` codes. Secure promotion-code redemption needs its own backend/RPC extension before those offer codes can discount a booking.

## Database migration

`supabase/migrations/202611030004_template15_16_catalogue_sync.sql`

This migration safely upserts the missing Template 15 registry entry and the new Template 16 entry into `public.studioflow_templates`. It does not create or drop tables, modify RLS, or alter existing salon/customer/booking records. Owner content continues to be stored in StudioFlow workspaces.

The migration was applied to the connected Supabase project. It was verified to leave 16 active template catalogue records, including:

- `mens_hair_studio` — 30 services, 3 male staff profiles
- `aurelia_beauty_parlour` — 10 services, 4 staff profiles

## Verification

Run:

```bash
npm run test:template16
npm test
```

The offline verification checks Template 16 ID, category mapping, priority metadata, route aliases, public-site/editor wiring, shared data setup, video fallback policy and catalogue migration. Build/TypeScript and full browser booking tests must still be run against the branch before production publication.
