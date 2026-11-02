# Template 01 — Luxury Editorial Salon (`hair_salon`)

## Status

Template 01 has been rebuilt as a new premium salon storefront while keeping the
existing catalogue key. Nothing about the template ID, routing, booking flow or
database changed.

- **Internal id:** `hair_salon` (unchanged)
- **Display name:** `Luxury Editorial Salon` (`LUXURY_EDITORIAL_SELECTOR_LABEL`)
- **Preview routes:** `?template=hair_salon`, `?template=01`, `?template=template-01`
- **Render chain:** `SalonWebsitePreview` → `CustomerSalonWebsite` →
  `businessType === 'hair_salon'` early return → `LuxuryEditorialWebsite`
- **Scope:** the redesign lives entirely in Template 01 files. Templates 02–14,
  the shared booking modal, the customer header used by other templates, the
  admin dashboard, APIs and Supabase schema were not modified.

The change has been built and verified in this workspace but **not published**.

## Design system

Palette (defaults; an owner's `customAccentColor` still overrides the accent):

| Token | Value | Use |
| --- | --- | --- |
| `--le-ivory` | `#F7F3EC` | page ground |
| `--le-champagne` | `#D8C5A3` | accent, hairlines, monogram |
| `--le-espresso` | `#31251F` | primary ink, dark panels |
| `--le-charcoal` | `#24211F` | footer ground |
| `--le-beige` | `#E9E0D4` | soft surfaces |

- Type: Cormorant Garamond (display serif) + Manrope (sans), self-hosted from
  `/templates/dermacure/fonts/` and declared with `@font-face` inside
  `luxuryEditorial.css` only.
- Every rule is scoped to `.le-site`; resets use `:where(.le-site)` so component
  classes always win.
- Accent work uses `color-mix()` into `--le-accent-soft` / `--le-accent-line`, so
  a warm brand colour keeps the same soft-on-ivory contrast.

## Page architecture

`src/components/LuxuryEditorialWebsite.tsx` (markup) + `src/components/luxuryEditorial.css` (styles).

1. **Header** — logo/monogram left, centered six-link rail
   (`Home / About / Services / Team / Gallery / Contact`), customer account and
   `My Bookings`, outlined `Book Appointment` CTA. Transparent over the hero,
   sticky + blurred after 24 px of scroll, drawer below 1240 px with the account
   actions, language switcher and WhatsApp.
2. **Hero** (`#salon-home`) — asymmetric two-column composition: 45 % copy /
   55–60 % portrait. Eyebrow `THE ART OF BEAUTY`, headline
   `Where Beauty Becomes an Experience`, description, `Book Your Experience`
   plus the `Explore Our Services` text link, floating rating/detail card,
   vertical decorative type and an editorial ticker strip. Mobile is recomposed
   (stacked copy → full-bleed portrait → detail card), not scaled down.
3. **About** (`#salon-about`) — magazine spread: tall portrait, offset square
   secondary photograph, overlapping platte card, owner story
   (`profile.aboutText` with the atelier fallback), facts list and CTA.
4. **Services** (`#services-section`) — one featured ritual card plus an
   asymmetric 4-card grid, optional category filter, per-card book buttons, real
   prices/durations from `services`. Packages are a separate text-led list under
   `#salon-packages` (`.le-package-card`, names stripped of the selector prefix).
5. **Team** (`#salon-team`) — tall portrait cards (`3/4`), monogram fallback when
   an owner avatar is missing, `role · N yrs`, `Book with this Specialist` and a
   `View profile & reviews` action that opens `StylistProfile`.
6. **Lookbook** (`#salon-lookbook`) — asymmetric masonry with mixed ratios,
   category filter, keyboard lightbox and bundled plates labelled
   `Sample lookbook imagery`. Owner photographs (`photoGallery()`) replace the
   samples and remove the label.
7. **Client stories** (`#salon-testimonials`) — typography-first quote with
   index counter and arrows. Demo stories only appear inside the unbranded
   template preview and are explicitly marked `Sample story · template preview`;
   a published site shows real reviews only, and the review panel is rendered
   with `authenticOnly`.
8. **Booking** (`#salon-bookings`) — `Your Next Beautiful Moment Awaits`, wired to
   the existing `BookingModal` (service, specialist, slot, 25 % deposit).
9. **Location + hours** (`#salon-location`) — address, map link, phone, email,
   socials, IST hours table and a booking CTA.
10. **Owner extras** — promotions, reels, loyalty, policies and social sections
    via the existing `WebsiteSections`, styled inside the editorial shell.
11. **App card** — the shared `AppInstallSection` (themed through `--ai-*`
    bindings) plus the shared `AppAnnouncementStrip` after the hero.
12. **Footer** (`#salon-footer`) — brand signature, wordmark, navigation, contact,
    hours, socials, legal line, language switcher and the signed-in account
    button (`Manage your customer account`).

Section order is exposed as `data-layout="hero|about|services|team|gallery|experiences|location|footer"`
so the cross-template wiring audits can assert it.

## Photography

- Sources: `design/templates/01-sources/` (20 JPEGs: hero, hero-detail, about,
  about-detail, booking, 7 service frames, 3 team portraits, 6 lookbook frames).
- Builder: `scripts/build-template01-assets.mjs` (`npm run assets:template01`).
  It crops each slot to its ratio, emits WebP at the declared widths (skipping
  any width more than 1.35× the source) and exits with code 2 if a source file is
  missing.
- Output: `public/templates/luxury-editorial/` — 45 WebP files, 1.74 MB.
- `src/lib/luxuryEditorial.ts` holds the slot table (`LUXURY_EDITORIAL_IMAGES`),
  matching `LUXURY_EDITORIAL_WIDTHS`, `editorialSrcSet()` and the
  name/category matcher that picks a distinct service photograph. Every one of
  the 45 referenced URLs is present.
- Owner uploads always win: service cards use `service.imageUrl`, team cards use
  `staff.avatarUrl`, the hero and about use the profile cover/about images, and
  every `<img>` has an `onError` fallback to the bundled art.

## Responsive and motion

- Breakpoints: 1240 / 1100 / 960 / 680 / 460 px.
- Header: six-link rail and account row above 1240 px; brand + account + CTA +
  menu control from 1240 to 1100 px; brand + icon CTA + menu below 1100 px.
- Hero, about, services, team, lookbook, stories, booking, contact and footer
  each have their own tablet/mobile compositions (stacked or two-column, cards
  re-flowed, masonry collapsed to a two-column grid, ratios re-set).
- Reveals are opacity/translate only and run once per element; the whole motion
  layer is disabled under `prefers-reduced-motion: reduce`.

## Functionality preserved

Owner branding (logo, accent, name, city, phone, address, socials), services and
packages, staff, gallery uploads, real reviews, promotions, reels, loyalty,
policies, WhatsApp, maps, customer sign-in/account, `My Bookings`, stylist
profiles, the booking modal and its 25 % deposit, the shared app card, and the
builder/editor + save/publish pipeline are all reused rather than reimplemented.

## Verification

Run on this branch:

- `npm run lint` (`tsc --noEmit`) — clean
- `npm run lint:edge` — clean
- `npm run build` — clean
- `node scripts/verify-*.mjs` — 93 of 95 suites pass, including
  `verify-website-wiring` (section order, header account, app card, package
  labels, editorial head update), `verify-service-photos`, `verify-photo-gallery`,
  `verify-starter-packages`, `verify-customer-account-settings`,
  `verify-staff-category-switch`, `verify-shringaar-royal-template` and
  `verify-app-install-section` (CSS cascade + contrast at desktop/tablet/mobile).
  `verify-supabase` cannot reach its remote project from this sandbox and
  `verify-render-resilience` prints success and then keeps its interval alive —
  both are pre-existing environment behaviours.

## Not included / follow-ups

- Final device screenshots could not be regenerated in this session: the bundled
  headless Chromium lost its shared libraries (`libnspr4.so`) and the sandbox has
  no package mirror. Layout was validated in the earlier QA rounds at
  320–1440 px with no page-level overflow; the only later layout changes are the
  header account rail (hidden below 1240 px) and the app strip/card, which the
  cascade audit covers.
- Owner-facing wizard copy for the new display name was not re-worded beyond the
  selector label; existing onboarding flows are unchanged.
- No production deployment, no migration and no data change was made.
