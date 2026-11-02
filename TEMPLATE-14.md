# Template 14 — Veda Sanjeevani Ayurvedic Wellness & Spa

**Category id:** `ayurvedic_spa` · **Picker label:** "Veda Sanjeevani Ayurvedic Wellness & Spa" · **Layout style:** `ayurvedic_terracotta` · **Theme preset:** `ayurvedic_terracotta`

Tagline: *"Ayurveda, unhurried. Warm-oil rituals, Shirodhara and physician-led care in Kota."*

A quiet, editorial Ayurvedic sanctuary built on deep forest green, warm ivory,
muted sage, earthy beige and antique gold — Cormorant Garamond headings over
Manrope body text, full-width photography, glass cards, botanical rules and
restrained scroll/hover motion. It deliberately does not use the salon/spa
clichés (no neon gradients, no lotus emoji, no stock-smiling models) and makes
no medical claims anywhere.

## How to preview

| What | How |
| --- | --- |
| Template demo | `npm run dev` → `http://localhost:3000/?template=14` |
| Aliases that all open it | `?template=ayurvedic_spa`, `ayurvedic-spa`, `ayurveda`, `veda`, `veda-sanjeevani`, `wellness-spa`, `panchakarma`, `template-14`, `template14` |
| Live tenant site | `/?site=<your-slug>` once a business publishes on this template |
| Template picker | Landing page card → "Customize this template" opens the drawer in demo mode; nothing is published until "Create my website with this template" |
| Owner workspace | A published Veda Sanjeevani site → website preview → **Open the template customizer** |

Pages: Home, About, Therapies (search + category tabs), Packages, Gallery,
Experts, Offers, Contact, **Booking** (4 steps) — hash routed, with a mobile
drawer, announcement bar, WhatsApp button and sticky booking bar on phones.

## Content model

Everything editable lives in `VedaConfig`, stored on **`profile.veda`**
(schema `schemaVersion: 1`) so it travels with the existing workspace save,
publish and ownership rules. Services and therapists stay ordinary
`SalonService[]` / `Stylist[]` records.

- `src/lib/vedaSanjeevani.ts` — brand, imagery manifest, 20 services (₹900–₹9,500),
  3 practitioners, 4 packages, 3 offers, 8 FAQs, 5 guest stories, 4 themes,
  4 font pairings, image prompts and the resolver that clamps any stored config.
- `src/lib/vedaSanjeevaniAi.ts` — AI contract, prompt builder, sanitiser and an
  offline draft for every section (server-safe: no DOM, no browser APIs).
- `src/lib/vedaSanjeevaniCustomizer.ts` — validation, undo/redo history, autosaved
  drafts, launch checklist, owner access check, image presets, AI request.
- `src/lib/vedaImageOptimizer.ts` — browser crop → resize → WebP/JPEG pipeline.

## Customizer tabs

`Launch · Business · Content & AI · Design · Therapies · Photos · Image studio · Booking · SEO`

Highlights: live scaled preview with page switcher, undo/redo, autosave with
"restore unsaved draft", plain-language validation before publishing, themed
palettes with readable contrast, section visibility + order, therapy CRUD with
₹ prices and durations, image upload per slot with focal-point cropping, and a
one-click "Generate my website content" plus per-section regeneration.

The nine tabs cover the twelve requested areas: Business details and Contact &
social live in **Business**; logo, colours, fonts, hero and layout in **Design**;
About, offers, packages, FAQs and reviews in **Content & AI**; therapists in
**Photos**; gallery order, visibility, category and alt text in **Photos**;
booking rules in **Booking**; SEO in **SEO**; preview and publish in **Launch**
and the persistent preview column.

Regeneration is guarded: if a section already differs from the template default,
pressing an AI button opens a "Keep your writing?" confirmation and nothing is
replaced until the owner chooses **Replace with new AI text**.

## AI content

`POST /api/veda-website-content` (`server.ts`) accepts `{ mode, details }` and
returns `{ source, mode, content, notice }`.

- Set **`GEMINI_API_KEY`** in the server environment to use Gemini. The key never
  reaches the browser — the client only ever calls the relative endpoint.
- With no key, no network or a bad response, the endpoint returns
  `source: "template"` with a locally drafted, editable version. That is a normal
  result, not an error, and the notice says so.
- Prompts forbid medical claims ("does not diagnose, cure or treat") and require
  Indian English, specific details, and no invented qualifications.

## Image pipeline

`npm run assets:template14` (`scripts/build-template14-assets.mjs`) builds
`public/templates/14/` from `design/templates/14-sources/` plus reused source
photography: 72 committed files, WebP at several widths with
`fit: 'cover', withoutEnlargement: true` (crops, never stretches), an
`og-image.jpg` and `manifest.json` with intrinsic dimensions for every slot.

### The 26 image slots

| Group | Slots |
| --- | --- |
| Hero & story | `hero` (16:9), `sanctuary` (16:9), `sanctuary-alt` (3:2), `ayurveda-wide` (16:9) |
| Therapies | `abhyanga`, `shirodhara`, `consultation`, `potli`, `kizhi`, `udvartana`, `pizhichil`, `head-massage`, `reflexology`, `steam` (all 4:3) |
| Luxury spa | `couple-suite`, `treatment-room` (4:3), `ritual`, `ritual-hero` (4:5), `oil-ritual`, `ingredients`, `herbs` |
| People | `therapist-ananya`, `therapist-meera`, `therapist-rahul` (3:4) |
| Offers & promos | `gift-voucher` (4:3), `promo-banner` (16:9) |

Every ritual in the 20-item catalogue points at its own photograph, each package
uses a different one, and the gallery shows the rooms, the couple suite, the
kizhi bench and the consultation room.

`VedaImage` (`VedaParts.tsx`) is the one reusable image asset used by the whole
site: real `srcset` for bundled slots, intrinsic `width`/`height` (no layout
shift), `loading="lazy"`/`decoding="async"` everywhere except the hero,
`priority` + `fetchPriority="high"` for above-the-fold art, a soft fade instead
of a pop-in, an `object-position` focal point for owner photos, and a fallback
to the bundled photo if an owner URL breaks.

Owner uploads run in the browser: validate (≤12 MB, JPG/PNG/WebP/AVIF), decode,
crop to the preset ratio around the chosen focal point, resize to the preset
width, compress under ~420 KB, then upload through the existing
`uploadSalonImage` storage helper. Presets: Hero 16:9 · Service 4:3 ·
Therapist 3:4 · Gallery 4:3 · Promo 16:9 · Testimonial 1:1 · Logo 1:1.

## AI Image Studio

`VedaImageStudio.tsx` is a real image editor, not a prompt gallery:

- **Destination picker** — every image on the site (~40 entries: hero, story,
  packages, offers, all gallery tiles, all 20 therapies) is listed; whatever is
  accepted is written straight into `VedaConfig` / the service catalogue.
- **Generate with AI** — calls the existing `/api/generate-promo-image` endpoint
  (server-side Gemini key), previews the result, then runs it through the same
  optimiser and storage upload before placing it. A missing key is reported as a
  plain sentence, never as a fake image.
- **Upload mine** — the owner's own photo for the selected slot.
- **Prompt library** — 24 brand-specific 4K cinematic prompts covering hero,
  about, every therapy, interiors, treatment rooms, therapists, packages,
  ingredients, gallery, promos, gift cards and testimonials, filterable by
  category. Each one can be copied, generated, or opened in ChatGPT
  (`https://chatgpt.com/`), with free vs paid tools labelled honestly.
- **Prompts for my therapies** — asks the AI (`mode: imagePrompts`) for prompts
  written from this owner's business name, city and menu; copy one, copy all, or
  generate from it.
- Uploads block **Save** while they run, so a half-finished image can never be
  published.

## Accessibility & motion

Skip link, labelled landmarks, 44 px touch targets, visible focus rings,
`aria-expanded` FAQ disclosures, keyboard-closable lightbox, honest form errors,
and `prefers-reduced-motion` honoured through `MotionConfig` + `useReducedMotion`
(`whileInView` reveals are skipped entirely when reduced motion is requested).
Images always carry intrinsic `width`/`height` (no layout shift) and below-the-fold
photos are `loading="lazy"`.

## Glass and premium motion system

The public site is built from a small, reusable set of motion primitives in
`src/lib/motion.ts` and `src/components/veda-sanjeevani/VedaParts.tsx`:

| Primitive | Behaviour |
| --- | --- |
| `VedaReveal` / `VedaRevealGroup` (`variant="glass"`) | single reveal or a staggered glass grid |
| `VedaRevealItem` | one card inside a staggered group |
| `VedaGlassCard` | frosted surface that animates itself in on scroll |
| `VedaPageHead` | breadcrumb → eyebrow → H1 → lead, staggered per line |

Glass surfaces reuse the same tokens so every panel matches: `--vd-glass-fill`
(80 % → 54 % white gradient), `--vd-glass-border` (68 % white), `--vd-glass-blur`
(`blur(20px) saturate(1.18)`) and `--vd-glass-shadow` / `--vd-glass-shadow-hover`.
Frosted panes currently cover the hero aside, therapy and package cards, expert
cards, reviews, offers, the contact card, the booking summary and the packages
"how it works" panel.

Hover motion is CSS-only so it never fights the Framer entrance transforms:
cards lift `translateY(-4px) scale(var(--vd-hover-scale))` (1.02–1.09 depending on
surface) with a deeper shadow and a soft gold border, gift vouchers lift further
on the forest ink, and the logo mark scales to 1.05 under a gold ring. Form
panels deliberately stay still. Entrances use `glassIn` (26 px / 0.97 → 1, 0.7 s),
`glassItem` (0.62 s) and `sectionIn` (0.75 s) on the shared
`cubic-bezier(0.22, 1, 0.36, 1)` easing, and every one of them is skipped when
`prefers-reduced-motion` is set (no transforms, no transitions).

## Public site wiring details

- Header navigation: Therapies, About, Experts, Gallery, Packages, Contact
  (Offers stays in the footer and the home band), plus the phone number,
  `Book Appointment` and the customer account. Signed-in guests get
  `Manage your customer account`, `My Bookings` and the private avatar.
- Expert cards book that exact therapist **and** open the shared
  `StylistProfile` (`View profile & reviews`), so experience, reviews and
  availability stay on the same record.
- `service.showDuration: false` hides the duration chip while keeping the ₹ price
  and the booking button.
- The contact map is click-to-load: a styled location card asks before any
  third-party iframe is requested (fast, privacy-friendly, no layout shift).
- `AppAnnouncementStrip` and `CustomerAppPromotion` render on the public site, so
  the Nexora app install route, poster download and share actions work here too.

## Verification

```
node scripts/verify-veda-sanjeevani.mjs   # or: npm test
```

Fourteen groups cover the registry/aliases, catalogue and honest-copy rules, every
bundled image width, config clamping, the AI contract and per-section
application, undo/redo and drafts, launch progress, validation, owner access,
image presets and focal crop maths, server-rendered markup (including hidden
sections), mounted website and customizer interactions, the
glassmorphism/hover/entrance rules (group 8b), the dedicated image asset system
(one photograph per ritual, prompt coverage, studio placement maths), the AI
Image Studio's generation/placement/honest-failure behaviour, AI gallery captions
and protected regeneration, and the wiring/security boundary.

All 94 harnesses in `scripts/verify-*.mjs` are run for every template; the only
expected exceptions are `verify-supabase` (needs a live Supabase project) and
`verify-render-resilience` (prints PASS then keeps its timers alive — run it under
`timeout`).
