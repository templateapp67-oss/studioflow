# Template 05 — Pinky Nails Studio (nail art & nail care)

Template id: `nail_studio` (unchanged). Route/entry mapping, booking, payments, staff
availability, reviews, gallery, editor and publishing flows are untouched.

## Files

| File | Purpose |
| --- | --- |
| `src/pinkyNails.css` | All Template 05 styles. Every selector is scoped to `.sf-page[data-template="nail_studio"]`. |
| `src/lib/pinkyNails.ts` | Palette, image map, copy, FAQ builder, service/staff/contact helpers, stale-catalog upgrade, legacy draft upgrade helpers. |
| `src/components/PinkyNailsSections.tsx` | Hero, trust highlights, service card, about, nail-art showcase, why choose us, gallery, team card, booking steps, FAQ, booking banner, contact, footer. |
| `src/components/PinkyNailsFaqEditor.tsx` | Owner editor for the FAQ (rendered only when `businessType === 'nail_studio'`). |
| `public/templates/pinky-nails/` | 20 separate AI-generated photographs. |
| `scripts/verify-pinky-nails-template.tsx` | Offline verification suite for this template. |

Shared files touched, each behind a `nail_studio` guard: `CustomerSalonWebsite.tsx`,
`CustomerWebsiteHeader.tsx`, `CustomerReviewPanel.tsx`, `SidePanelCustomizer.tsx` (extra
section toggles), `SalonWebsitePreview.tsx` (FAQ editor slot), `categoryTemplates.ts`,
`templateData.ts`, `themeAccents.ts`, `lib/loyaltyTheme.ts`, `lib/photoGallery.ts`,
`lib/normalizeWorkspace.ts`, `lib/serviceImages.ts`, `App.tsx`, `customer/templateDemos.ts`,
`customer/useCustomerCatalog.ts`.

## Palette (template defaults, owner branding still wins)

| Token | Value |
| --- | --- |
| Soft Pink | `#F4C8D5` |
| Blush Background | `#FFF5F7` |
| Deep Berry | `#702D4B` |
| Warm White | `#FFFCFA` |
| Rose Gold | `#C49A86` |
| Dark Text | `#30242A` |
| Light Border | `#EADDE2` |

Headings use Cormorant Garamond (already loaded in `index.html`); body text uses Hanken
Grotesk. Main cards are 18px radius, buttons 12px, and every section alternates Warm White
and Blush backgrounds.

## Section order

Header → Hero → Trust highlights → Services → Packages (existing owner section) → About →
Featured nail art → Why choose us → Gallery → Team → How booking works → Reviews →
Videos/loyalty (existing owner sections) → FAQ → Booking banner → Contact → Bookings/policies →
Footer.

## Images (20 separate assets, no collages)

`hero-nail-artist`, `nail-art-closeup`, `manicure-treatment`, `studio-interior`,
`nail-art-portfolio`, `nail-extension`, `nail-care-treatment`, `team-nail-artist`,
`booking-banner`, `about-nail-artist`, five `gallery-*` samples and five `service-*` photos.
No image is reused between content sections; the five starter packages reuse the matching core
service photo. Gallery samples are labelled “Demo lookbook / Sample inspiration” in the UI.

## Empty states and visibility

- `websiteSections` is respected for every existing section. The four new sections read extra
  optional flags (`trust`, `whyChooseUs`, `bookingSteps`, `faq`), defaulting to visible; the
  owner can toggle them in Customize → Sections (Template 05 only).
- No services → no cards, no Services links; no staff → empty state instead of invented
  people; no reviews → section hidden on the published site; no gallery photos → section
  hidden; no contact details → contact section hidden and its footer column removed.
- Booking CTAs and the booking banner only render when the existing booking flow is available.
- FAQ answers are generated only from real features (booking flow, service list, saved
  contact details). Owners can rewrite them in the FAQ editor or restore the defaults.

## Known limitations

- `verify-service-photos.mjs` and `verify-publish-link.mjs` fail on the untouched base commit
  as well; they are not caused by this template work.
- The FAQ editor uses a simple text list; there is no rich text or per-question reordering.
- Images are delivered as single JPEGs (no responsive `srcset`) because the project has no
  image-resizing pipeline for template assets. Below-the-fold images use `loading="lazy"`.
