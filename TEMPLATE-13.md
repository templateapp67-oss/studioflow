# Template 13 — Arch & Flutter Lash & Brow Bar

**Category id:** `lash_brow` · **Picker label:** "Arch & Flutter (13)" · **Layout:** `editorial_bento` · **Theme preset:** `blush_champagne`

Tagline: *"Frame your eyes. Flutter your confidence."* An editorial-luxury
eye-area atelier — lash extensions, brow shaping, lash lift & tint, PMU and
bridal eye rituals — built to look nothing like the other thirteen templates:
bento grids, oversized serif headings, thin champagne-gold rules, arch-masked
photography, gradient mesh and feather motifs on Blush Rose / Warm Ivory /
Deep Espresso.

## How to preview

| What | How |
| --- | --- |
| Template storefront (demo data) | `npm run dev` → `http://localhost:3000/?template=13` |
| Aliases that all open it | `?template=lash_brow`, `?template=lash-brow`, `?template=arch-flutter`, `?template=archflutter`, `?template=lash`, `?template=brow`, `?template=microblading` |
| Live tenant site | `/?site=<your-slug>` once a salon publishes on this template (same slug logic as every other template) |
| Template picker | Landing page card 13 → "Live Preview" → device canvas (desktop / tablet / mobile) |
| Onboarding | Pick "Arch & Flutter Lash & Brow Bar" (category tag *Eye-Area Atelier*) in the guided setup — all 15 categories, 64 services, 4 artists, gallery, reels and the six sample offers pre-fill |
| Customer app (GlowSlot) | Explore → the Template 13 demo salon → **Packages** tab shows the live offers |

Pages: Home, About, Services (category tabs), Packages, Gallery, Team, **Offers**,
Journal (aftercare), Contact (map, hours, WhatsApp), Booking, Account — 11
hash-routed views plus a mobile drawer, a floating WhatsApp button and the
shared customer header contract.

## Owner-editable content

Everything on the page comes from the onboarding workspace: business identity,
services and ₹ prices, artists, gallery photos, working hours, phone/WhatsApp,
address, socials, policies and offers. `ArchFlutterEditor` adds the
template-specific fields (hero/about copy, category imagery, packages, reels +
featured video, reviews, FAQs, journal, **promotions & offers**, brand colours).
Demo content in `src/lib/archFlutter.ts` is only the fallback for a brand-new
workspace; owner values always win.

## Promotions & offers

Offers are **ordinary editable records**, not UI hardcoding. They live on the
salon profile as `profile.promoOffers: SalonOffer[]` (`src/types.ts`), are
created/normalised by `src/lib/salonOffers.ts`, seeded for a fresh Template 13
workspace by `src/lib/normalizeWorkspace.ts`, and saved with the rest of the
workspace.

Record shape:

```ts
{ id, title, description, image, badge,
  offerType: 'percent' | 'flat' | 'combo' | 'free_addon',
  discountValue, originalPriceINR, offerPriceINR,
  applicableServices: string[],   // empty = valid on any service
  couponCode, validFrom, validTo, // ISO dates, rendered DD MMM YYYY
  terms, isActive, isDemo }
```

### The six bundled sample offers (`isDemo: true`)

| # | Title | Badge | Type | Prices | Code | Applies to |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Glow Up Welcome Offer | New Client | 20% off first lash set | ₹2,499 → ₹1,999 | `FLUTTER20` | Classic / Volume / Hybrid sets (60 days) |
| 2 | Lash + Brow Combo | Most Popular | combo | ₹5,298 → ₹4,499 (save ₹799) | — | Volume 2D–3D + Brow Lamination (90 days) |
| 3 | Bridal Eye Package | Bridal Special | combo | ₹9,499 → ₹7,999 | — | Bridal Eye Ritual, Hybrid, Brow Mapping, Trial (120 days) |
| 4 | Weekday Happy Hours | Limited Slots | 15% off | ₹2,499 → ₹2,124 | `HAPPY15` | Mon–Thu 11 AM–3 PM, four slots a day (90 days) |
| 5 | Refer a Friend | Referral | flat ₹500 off | — | `BESTIE500` | Any service, both clients (180 days) |
| 6 | Festive Season Offer | Festive | free add-on worth ₹1,999 | — | — | Free lash lift & tint with Volume/Hybrid, valid till Diwali week |

The festive end date is computed from real Deepavali dates
(`DEEPAVALI_DATES` → `nextFestiveWeekEnd()`), so a freshly seeded offer is never
already expired.

### Rules

- Editing, hiding, showing, deleting, re-ordering or replacing an offer persists
  with the workspace. **Any edit clears that offer's `isDemo` flag**; a newly
  added offer is never a demo record.
- *Reset to sample offers* restores exactly the six rows above (with `isDemo`).
- Expired, not-yet-started and hidden offers stay in the dashboard but never
  render publicly (`publicSalonOffers()` filters; `ownerSalonOffers()` does not).
- Deleting every offer leaves a genuinely empty list — the seeding only runs
  when the key is absent, never when it is `[]`, so deletions never resurrect.
- Cards show an arch-masked image, badge, `Save ₹X` tag, "Ends in N days"
  countdown, **Copy code** button, terms, and a gold **Book this offer** button.
- "Book this offer" prefills the booking flow with the offer's first applicable
  service at the **discounted price**, plus a note naming the offer, code,
  saving and validity (`offerBookingPrefill()`). The real menu row is never
  mutated — a copy is passed to `BookingModal`.
- Money is ₹ INR only with Indian digit grouping (`₹2,499`, `₹1,250.5`); dates
  are `DD MMM YYYY`; copy is simple Indian English.
- Home teases up to three live offers; the Offers page lists all of them; the
  GlowSlot **Packages** tab shows them as swipeable cards and a live offer
  advertises itself on the salon card.
- With zero live offers the site renders a friendly glass card with bundled
  artwork and a WhatsApp route — never a blank area.
- Other templates are untouched: `demoSalonOffers()` returns `[]` for anything
  that is not `lash_brow`, and the legacy `config.offers` demo copy
  (`ARCH_FLUTTER_DEFAULT_OFFERS`) is left intact for older saved workspaces.

### Seed / migration

`backend/arch-flutter-demo-offers.sql` (idempotent):

1. Writes the six records to `content->'profile'->'promoOffers'` for every
   published `lash_brow` website **that has no offer list yet** (an owner's
   `[]` is respected).
2. Mirrors the same six offers into the shared `public.studioflow_offers` table
   for the published demo salon (`select set_config('studioflow.demo_slug',
   'arch-flutter-demo', false);` first), matched by title so re-running never
   duplicates a row.

`backend/arch-flutter-template-13.sql` refreshes the catalogue card (15
categories, 64-service ₹ menu, 4 artists, theme tokens). It deliberately carries
no `demoOffer`/`promoCampaign` banner so a promotion is never advertised twice
on one page.

## Files

| Path | Purpose |
| --- | --- |
| `src/lib/archFlutter.ts` | Brand constants, image map, 15 categories, 64 services, artists, reels, reviews, FAQs, journal, resolver, ₹ + SEO helpers, legacy upgrade |
| `src/lib/salonOffers.ts` | Offer records: demo set, normalisation, live/expiry rules, ₹ + date + countdown formatting, booking prefill, owner edit helpers |
| `src/components/ArchFlutterWebsite.tsx` | The storefront (11 hash-routed pages, offers on Home + Offers page) |
| `src/components/archFlutter.css` | `.af-*` styles, glass spec, arch masks, bento → snap-carousel offers, reduced-motion rules |
| `src/components/arch-flutter/*` | Ornaments, motion primitives, SafeImage, DeviceMockup, BeforeAfterSlider, ReelsRail, TestimonialCarousel, **ArchFlutterEditor (offers manager)** |
| `src/components/CustomerSalonWebsite.tsx` | `lash_brow` dispatch + offer-note → `BookingModal.initialBookingNote` |
| `src/components/customer/Salon.tsx`, `customer/Parts.tsx`, `customer/templateDemos.ts` | GlowSlot offers panel, salon-card offer badge, demo-salon seeding |
| `src/components/customer-app.css` | `.cr-offer-*` styles for the customer app |
| `src/lib/normalizeWorkspace.ts` | Seeds `promoOffers` for a new Template 13 workspace |
| `src/categoryTemplates.ts`, `src/templateData.ts`, `src/themeAccents.ts`, `src/lib/templateEntry.ts`, `src/lib/templateSelection.ts` | Registry, picker option, aliases, theme preset, onboarding draft |
| `public/templates/13/` | 20 vector plates, logo/favicon, og-image, preview, 5 reel posters, manifest + rebuild script |
| `design/templates/13-sources/` | `build-assets.py` (never deployed) |
| `backend/arch-flutter-template-13.sql`, `backend/arch-flutter-demo-offers.sql` | Idempotent catalogue sync + offers seed |
| `scripts/verify-arch-flutter-template.{mjs,tsx}` | 10-part acceptance suite for this template, including every offers rule above |

## Verification

```bash
npm run lint        # tsc --noEmit → clean
npm run lint:edge   # Deno edge functions
npm run build       # vite build → clean
npm test            # 81/85 suites pass, including verify-arch-flutter-template
node scripts/verify-arch-flutter-template.mjs   # Template 13 only → PASS
```

The four suites that fail (`verify-booking-specialist`, `verify-conversion-features`,
`verify-explore`, `verify-owner-modules`) fail identically on the base commit
before any Template 13 work — they need a live Supabase backend and are
unrelated to this template.

Manual check of the offers work:

1. `npm run dev` → `http://localhost:3000/?template=13` → **Offers**: six glass
   cards with badges, images, `Save ₹X`, countdown, `Copy code` (button flips to
   "Code copied") and *Book this offer*.
2. Click *Book this offer* on "Lash + Brow Combo": the booking sheet opens on
   Volume 2D–3D at **₹4,499** with the offer note prefilled.
3. Home shows at most three live offers and an "All offers" link.
4. Owner Workspace → *Promotions & offers*: edit a title → the "Sample offer"
   ribbon disappears from that card on the site; hide an offer → it stays in the
   list but leaves the website; delete → gone after reload; *Reset to sample
   offers* → the six return; *Add offer* → a hidden draft you can fill in,
   upload a photo for and switch on.
5. Delete all six → the Offers page shows the friendly empty-state card with
   artwork and a WhatsApp button; Home shows no offers section at all.
6. GlowSlot (customer app) → Template 13 demo salon → **Packages** tab: the live
   offers render as cards and *Book this offer* pre-selects the offer services.
7. Set an offer's `validTo` in the past → it disappears from the website and the
   customer app but stays in the dashboard marked "Expired — hidden publicly".
8. Other templates (`?template=11`, `?template=12`, …) are visually and
   functionally unchanged, and `prefers-reduced-motion: reduce` disables the
   hover scale, carousel snap and reveal animations.
