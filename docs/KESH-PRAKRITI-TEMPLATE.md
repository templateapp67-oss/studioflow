# Template 06 — Kesh Prakriti Hair Spa & Scalp Sanctuary

Template id: `hair_spa`. Routing, publishing, booking checkout, payments, staff availability,
reviews, gallery storage and every other template are unchanged by this work.

This document is the audit, the change plan that followed it, and the final report. It was
written after the refactor landed so that the reasoning and the evidence stay in the repo.

---

## 1. Audit

### 1.1 Where Template 06 lives

| Path | Role |
| --- | --- |
| `src/components/CustomerSalonWebsite.tsx` | Early-returns into `HairSpaWebsite` for `businessType === 'hair_spa'` (line ~308). Everything below that return belongs to the shared template path. |
| `src/components/HairSpaWebsite.tsx` | Composition root: page state, handlers, `HairSpaContext` provider, section order. |
| `src/components/hair-spa/` | The 14 page components plus `context.ts` and `hairSpaWebsite.css`. |
| `src/lib/keshPrakriti.ts` | All Template 06 data and copy helpers (images, gallery, reviews, packages, categories, FAQ, contact summary, signature selection, social links). |
| `src/keshPrakriti.css` | Legacy `.sf-kp-*` / `.sf-page[data-template="hair_spa"]` tokens and the small screen print rules. |
| `src/components/hairSpaWebsite.css` | All `.kp-*` page styles (tokens, sections, 1100/1280/1400/760/420/380 breakpoints, reduced motion). |
| `public/templates/kesh-prakriti/` | 17 bundled reference photographs. Every one is labelled "Demo / sample" in the UI. |
| `scripts/verify-kesh-prakriti-template.tsx` | Offline verification suite (8 sections, now including the responsibility audit). |
| `scripts/verify-kesh-navigation-gallery.tsx` | Offline navigation, anchor and gallery suite. |

### 1.2 Duplicated responsibilities found (baseline commit `44c535d`)

| Duplicate | Evidence | Resolution |
| --- | --- | --- |
| Two service catalogues — `ServicesSection` **and** `FeaturedRituals` | Both rendered `<article>` cards from the same `services` array, so each service and price appeared twice. | `FeaturedRituals` removed. `ServicesSection` keeps the whole catalogue and gained a curated "Signature treatments" index that scrolls to the real card instead of repeating it. |
| Packages rendered as a second card grid beside the menu | `keshPackages()` filtered the same `services` array into a second grid. | Packages are shown once, as a group *inside* `ServicesSection` (`#salon-packages`). |
| `OffersSection` sample offers vs. the owner's real promo | The section hard-coded `SAMPLE OFFERS` and a `HAIR10` code that no owner had created. | Section removed. Only a live owner campaign (`promotionActive`) renders, through the shared `WebsiteSections`. |
| `QuickNavigation` dock vs. the sticky header | Two navigations listing the same destinations. | Dock removed; one header, one drawer. |
| `SanctuarySection` (banner + CTA) and `GallerySection` (photo grid) | Two full-width sections describing the same room. | Merged into `SanctuaryGallery`, which reuses the existing `GalleryLightbox`. |
| `ExperienceSection` (steps) vs. `ScalpCareJourney` (steps) | Both were a numbered "what your visit looks like" list; `ExperienceSection` also claimed invented review counts. | `ExperienceSection` removed. `ScalpCareJourney` owns the four steps. |
| Testimonials built from demo copy | The page printed a review band with no saved reviews behind it. | `TestimonialsSection` renders only `keshPublishedReviews(profile)` and returns `null` otherwise. |
| `BotanicalIngredients` | No verified ingredient content exists anywhere in the project. | Section removed rather than filled with invented claims. |

Other audit findings:

- **Page model drift.** `HairSpaPageModel` exposed fields no section read (`featuredService`,
  `displayImages`, `heroFallbackImage`, `serviceCategories`, `onBook`, `setGalleryCategory`,
  `galleryPhotos`, `shared`, `enabledSections`, `reduceMotion`). Pruned; the context now only
  carries what a section actually consumes.
- **Dead CSS.** `.sf-kp-hero*`, `.sf-kp-service-card*`, `.sf-kp-logo-svg` and `.kp-hero-index`
  styled markup that no longer existed. Removed.
- **Unused export.** `KESH_PRAKRITI_IMAGE_URLS` had no importer. Removed.
- **Stale duplicate media block.** The `@media (max-width: 420px)` rule for `.kp-hours-list`
  was appended twice. Collapsed to one.
- **Header overflow risk.** The header carries seven page links, two account links and a CTA.
  Between 1281px and ~1300px the nowrap row was wider than the viewport, so the drawer
  threshold had a gap. Fixed with a `max-width: 1400px` step that tightens the row before the
  drawer takes over at 1280px.
- **Inactive shared code.** `CustomerWebsiteHeader.tsx` still contains an `isKeshPrakriti`
  branch (with `keshLinks` pointing at `#salon-botanicals`, `#salon-lookbook`,
  `#salon-location`). It is unreachable: `CustomerSalonWebsite` returns into `HairSpaWebsite`
  before that header is rendered, and a static render of every variant contains exactly one
  `<header>`. Left in place (see §6) and guarded by a new assertion.
- No broken in-page anchors, no duplicate element ids, no missing `alt` text and no unnamed
  buttons or links were found in the audited renders.

### 1.3 Component inventory

`Consumers` counts only this repository. `Keep` = unchanged, `Update` = edited in this work,
`Merge` = absorbed into another component, `Remove` = deleted.

| Component | Responsibility | Depends on | Consumers | Action |
| --- | --- | --- | --- | --- |
| `HairSpaWebsite.tsx` | Composition, page state, handlers, section order | all sections, `keshPrakriti`, `WebsiteSections`, `CustomerAppPromotion` | `CustomerSalonWebsite` | **Update** |
| `hair-spa/HairSpaHeader.tsx` | The only navigation (desktop row + drawer) | `context`, `lucide-react`, `motion` | `HairSpaWebsite` | Keep |
| `hair-spa/HeroSection.tsx` | Brand hero, parallax image, two primary actions | `context`, `utils/motion` | `HairSpaWebsite` | Keep |
| `hair-spa/BrandPhilosophy.tsx` | Brand point of view | `context`, `Reveal` | `HairSpaWebsite` | Update (copy) |
| `hair-spa/ServicesSection.tsx` | **Single catalogue**: signature index, filter, menu, packages | `context`, `ServicePhoto`, `keshSignatureServices`, `utils/motion` | `HairSpaWebsite` | Update (rewritten) |
| `hair-spa/ScalpCareJourney.tsx` | The four visit steps, nothing else | `context`, `Reveal`, `utils/motion` | `HairSpaWebsite` | Update (copy) |
| `hair-spa/TeamSection.tsx` | Saved stylists | `context`, `lib/staffProfile`, `safePhotoUrl` | `HairSpaWebsite` | Update (CSS class) |
| `hair-spa/SanctuaryGallery.tsx` | The only photo gallery + filters | `context`, `Reveal`, `motion` | `HairSpaWebsite` | **Merge** (Sanctuary + Gallery) |
| `hair-spa/GalleryLightbox.tsx` | Accessible image viewer | `context` | `HairSpaWebsite` | Keep |
| `hair-spa/TestimonialsSection.tsx` | Published reviews only, `null` without them | `context`, `Reveal`, `motion` | `HairSpaWebsite` | **Merge** (replaces demo band) |
| `hair-spa/BookingSection.tsx` | The one closing booking CTA | `context`, `Reveal` | `HairSpaWebsite` | Update (copy) |
| `hair-spa/FAQSection.tsx` | Questions and answers | `context`, `Reveal`, `motion` | `HairSpaWebsite` | Update (no phone CTA) |
| `hair-spa/ContactSection.tsx` | Saved contact details and hours | `context`, `Reveal` | `HairSpaWebsite` | Update (no booking form) |
| `hair-spa/HairSpaFooter.tsx` | Closing summary: brand, links, contact, social, legal | `context`, `keshSocialLinks`, `lib/websiteContent` | `HairSpaWebsite` | Update (rewritten) |
| `hair-spa/Reveal.tsx` | Shared scroll-reveal wrapper | `motion` | 9 sections | Keep |
| `hair-spa/context.ts` | `HairSpaPageModel` + `useHairSpa()` | section types | all sections | Update (pruned) |
| `hair-spa/FeaturedRituals.tsx` | second service grid | — | — | **Remove** |
| `hair-spa/OffersSection.tsx` | invented offers | — | — | **Remove** |
| `hair-spa/QuickNavigation.tsx` | second navigation | — | — | **Remove** |
| `hair-spa/BotanicalIngredients.tsx` | unverified ingredients | — | — | **Remove** |
| `hair-spa/SanctuarySection.tsx` | banner duplicating the gallery | — | — | **Merge** into `SanctuaryGallery` |
| `hair-spa/ExperienceSection.tsx` | steps duplicating the journey | — | — | **Remove** |
| `hair-spa/GallerySection.tsx` | second gallery | — | — | **Merge** into `SanctuaryGallery` |
| `src/lib/keshPrakriti.ts` | Template data, copy and honest fallbacks | `types`, `photoGallery`, `websiteContent` | 6 sections + 2 suites | Update |
| `src/components/WebsiteSections.tsx` | Shared owner sections | — | all 14 templates | Keep (never enabled for `'bookings'` or `'social'` on T06) |
| `src/components/CustomerAppPromotion.tsx` | Platform app strip + promo | — | all 14 templates | Keep |

### 1.4 Shared code this template depends on

`CustomerSalonWebsite.tsx` (one guarded prop list), `CustomerWebsiteHeader.tsx` (not rendered
for this template), `BookingModal`, `SalonBookingsDialog`, `StylistProfile`,
`CustomerReviewPanel`, `ServicePhoto`, `WebsiteSections`, `CustomerAppPromotion`,
`lib/{promotionStatus,showcaseVideos,socialVideoSource,websiteContent,serviceImages,photoGallery,staffProfile}`,
`utils/motion`, `categoryTemplates.ts`, `templateData.ts`, `themeAccents.ts`, `App.tsx`.

State, booking, reviews and publishing all stay in the existing shared modules: this work adds
no new store, no new API call and no new route.

### 1.5 Animations

`motion/react` (already a dependency) only.

- Hero parallax: `useScroll` + `useTransform` in `HairSpaWebsite`, applied to the hero image
  through `model.parallaxY` — preserved unchanged, and disabled for reduced motion, narrow
  screens and environments without `IntersectionObserver`.
- Staggered services reveal: `staggerContainer` / `staggerItem` / `revealViewport` from
  `utils/motion` — preserved unchanged.
- Journey tabs, FAQ accordion, drawer, scrim and lightbox use the same primitives.
- Gallery filtering no longer uses layout projection (`layout` / `popLayout`): enter-exit fades
  only, which removed a `motion-dom` projection crash surfaced by the wiring suite.

---

## 2. Change plan

**Goal.** One responsibility per section, one catalogue, one gallery, one booking flow, one
contact surface — without touching booking, payments, publishing, reviews or other templates.

**Order of work (all applied):**

1. Consolidate duplicate content: delete the seven redundant sections; fold packages into the
   catalogue; fold the sanctuary banner into the gallery; replace the demo review band with a
   published-reviews section.
2. Recompose the page: Header → Hero → Philosophy → Services (signature + menu + packages) →
   owner promo (only when live) → Your Visit → Our Team → Sanctuary Gallery → owner videos
   (only when saved) → Reviews (only when published) → Booking → FAQ → Contact → owner closing
   sections (loyalty, policies, share) → App promotion → Footer.
3. Preserve the hero parallax and the services scroll-reveal exactly as they were.
4. Remove only verified-redundant files, after checking every importer.
5. Refine responsive behaviour (header breakpoint step) and accessibility (landmarks, one `h1`,
   named controls, labelled sections).
6. Fix regressions: update the Template 06 assertions in five verification suites, fix the
   gallery animation crash, and re-run everything.

**Files that changed:** `src/components/HairSpaWebsite.tsx`, `src/components/hair-spa/*`
(14 kept, 7 deleted, 2 new), `src/lib/keshPrakriti.ts`, `src/components/hairSpaWebsite.css`,
`src/keshPrakriti.css`, `src/components/CustomerSalonWebsite.tsx` (one guarded prop list), and
the Template 06 assertions in `scripts/verify-{kesh-prakriti-template,kesh-navigation-gallery,
photo-gallery,service-photos,website-wiring}.tsx`.

**Must remain unchanged:** the booking checkout (`BookingModal` → `onAddAppointment` →
Supabase RPC), availability RPC, customer auth and My Bookings, review submission, gallery
storage, publishing, routing (`?template=`, `?create=1`, `?site=slug`, subdomain aliases), the
owner workspace, and every other template's markup and CSS.

**Regression risks and mitigations**

| Risk | Mitigation |
| --- | --- |
| Deleting a section that something still imports | Importers checked before each deletion (`git grep`); `tsc --noEmit` after. |
| Booking CTAs losing their handler | Every CTA calls `model.book()`, which forwards to the existing `onBook`; asserted in the interaction suite. |
| Prices/durations diverging between two grids | Only `ServicesSection` renders cards, each from `model.services`; suite counts cards against the service array. |
| Other templates affected by CSS | All new rules are `.kp-*` (page scoped) or `keshPrakriti.css` scoped to `.sf-page[data-template="hair_spa"]`. |
| Shared component edits leaking | The only shared edit is a `hair_spa`-gated prop list; `verify-website-wiring` covers the other 13 templates. |
| Animation regression | Parallax and stagger untouched; reduced-motion paths asserted. |
| Header overflow on small laptops | Explicit `max-width: 1400px` step added before the 1280px drawer. |

---

## 3. Section responsibilities (final)

| # | Section | `id` | Owns | Never does |
| --- | --- | --- | --- | --- |
| 1 | Header | — | Navigation, account entry, primary CTA | Card grids, service prices |
| 2 | Hero | `home` | Brand headline, parallax image, two actions | Service list, offers |
| 3 | Brand Philosophy | `philosophy` | Point of view, one wayfinding link | Prices, catalogue |
| 4 | Services | `treatments` | Signature index, filters, every service card, packages | Booking UI, contact details |
| 5 | Owner promo | `salon-promo` | A live campaign only | Stand-in offers |
| 6 | Your Visit | `journey` | Four steps of the visit | Treatments, claims |
| 7 | Our Team | `team` | Saved stylists | Invented credentials |
| 8 | The Sanctuary | `sanctuary` | The room's story (see §7.5) | Prices, photographs |
| 8b | Gallery | `gallery` | Photographs + filters | Prices, CTAs |
| 9 | Videos | `salon-videos` | Saved reels only | — |
| 10 | Reviews | `testimonials` | Published reviews; absent when none | Sample quotes, ratings |
| 11 | Booking | `booking` | The single booking CTA | A second form |
| 12 | FAQ | `faq` | Questions and answers | Service cards, phone CTA |
| 13 | Contact | `contact` | Saved phone, WhatsApp, email, maps, hours | Booking form |
| 14 | Owner closing | `salon-loyalty`, `salon-policies`, `salon-share` | Owner content when saved | Placeholders |
| 15 | Footer | — | Brand, page links, contact, social, legal | Hero copy, catalogue |
| 16 | App promotion | `nexora-customer-app` | Platform app install/share | Brand content |

---

## 4. What was implemented in the final pass

Only the smallest safe set, on top of the consolidation above:

1. `hairSpaWebsite.css`: removed dead `.kp-hero-index` rules; removed the duplicated 420px
   hours rule; added the `max-width: 1400px` header step and dropped the now-unreachable
   desktop-nav rules from the 1100px block.
2. `keshPrakriti.css`: removed rules for markup that no longer exists (hero, service card,
   logo mark, unused serif helper).
3. `src/lib/keshPrakriti.ts`: removed the unused `KESH_PRAKRITI_IMAGE_URLS` export and its
   stale doc comment.
4. `TeamSection.tsx`: `.kp-team-bio` is now a real CSS rule instead of inline utilities.
5. `FAQSection.tsx`: the intro no longer promises a phone number that may not exist.
6. `scripts/verify-kesh-prakriti-template.tsx`: new section **4b** asserts the composition —
   one catalogue with packages inside it, one gallery, one booking section, unique ids,
   resolving anchors, header/footer parity, one `<header>`, one `<main>`, one `h1`, no skipped
   heading levels, named controls, and no retired section ids or files.

---

## 5. Validation performed

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npm run lint` | pass |
| Edge TypeScript | `npm run lint:edge` | pass |
| Production build | `npm run build` | pass (Vite bundle + `dist/server.cjs`) |
| Full verification suite | `node scripts/run-all-verifications.mjs` | 63/65 suites |
| Template 06 suite | `node scripts/verify-kesh-prakriti-template.mjs` | 8/8 sections PASS |
| Navigation/gallery | `node scripts/verify-kesh-navigation-gallery.mjs` | PASS |
| Wiring (14 templates) | `node scripts/verify-website-wiring.mjs` | PASS |
| Service photos | `node scripts/verify-service-photos.mjs` | PASS |
| Photo gallery | `node scripts/verify-photo-gallery.mjs` | PASS |

The two failing suites are `verify-owner-modules.mjs` and `verify-owner-navigation.mjs`. Both
fail identically on an untouched worktree at the baseline commit (`hair_salon` assertions,
`18 !== 17`), before any Template 06 change — they are pre-existing and unrelated.

Rendered evidence (three static renders: demo, published with reviews and a promo, and an
empty salon):

- Top-level sections in order, no duplicates, no orphan ids.
- Zero cross-section repeated sentences.
- Zero dead in-page anchors; zero duplicate ids.
- Demo: 10 service cards + 5 package cards + 15 service photos (one photo per card).
- Published: 5 service cards, 5 `Book this service`, one `#salon-packages` group.
- Empty salon: no prices, no contact links, `Contact the salon` fallback, contact section and
  its anchor both absent.
- One `<h1>` per page, no heading-level jumps, no image without `alt`, no unnamed control.

---

## 6. Remaining issues and external dependencies

1. **Pre-existing failing suites.** `verify-owner-modules` and `verify-owner-navigation` fail on
   the baseline commit as well. They exercise owner workspace modules, not Template 06.
2. **Inactive `isKeshPrakriti` branch in `CustomerWebsiteHeader.tsx`.** Its anchors
   (`#salon-philosophy`, `#salon-botanicals`, `#salon-lookbook`) are the retired
   pre-§7 ones, which is one more reason it must stay unreachable; the Template 06
   header in `hair-spa/HairSpaHeader.tsx` owns the live links. Unreachable for this
   template (verified by render), but it still ships ~120 lines of unused header code and stale
   anchors. Removing it touches a shared component used by 13 other templates, so it is left for
   a dedicated change with its own review; the new assertion fails if it ever renders alongside
   the Template 06 header.
3. **Bundled photography.** All 17 Template 06 photographs are repository assets labelled
   "Demo / sample" until an owner uploads their own. Replacing them is an owner/content task,
   not a code task.
4. **Gallery and video content** come from saved owner data; the demo reels are the shared
   platform demo. Nothing is generated on the fly.
5. **No live browser was available in this environment,** so layout was validated by CSS review
   plus static renders rather than screenshots. The header breakpoint step is the one visual
   judgement not confirmed by a pixel-level check.

---

## 7. Follow-up pass — About page, portraits, gallery and loading halts

Added after the consolidation above, on the same template and without touching
booking, payments, publishing or any other template.

### 7.1 Freezing on "Loading your salon from Supabase…"

The workspace used to render that message until
`studioflow_ensure_account` settled. A stalled RPC, an unexpected response shape
or an unreadable `profiles`/`studioflow_templates` row left the screen spinning
forever — which also made every header link look dead, because the page they
belonged to never painted.

| Layer | Change |
| --- | --- |
| `src/lib/asyncDeadline.ts` | `withTimeout` (rejects instead of pending, always clears its timer), `messageOf`, `settleWithin`. Accepts Supabase's thenable query builders. |
| `src/lib/accountBootstrap.ts` | `bootstrapSalonAccount`: RPC (12s deadline) → saved `studioflow_accounts` row → honest error. `salonAccountFromRpc` / `salonAccountFromRow` normalise both shapes (including the older `{account: row}` envelope). `loadTemplateCatalogue` treats the template list as decorative and falls back to the bundled `CATEGORY_TEMPLATES`. |
| `src/App.tsx` | Uses the bootstrap; profile details and templates are best-effort; the browser's cached draft is the last resort; the spinner became `AccountLoading`, which explains a delay after 6s and offers **Retry now** / **Sign out**. The published-site read is wrapped in a 15s deadline so `Loading salon website…` also resolves into the retry UI. |

### 7.2 Header navigation

`pageLinks` now carries the seven destinations the salon asked for — Our
Philosophy, Treatments, Scalp Care, Our Team, The Sanctuary, Gallery, Contact —
each resolving to its own section. `scrollTo` scrolls immediately, retries on the
next animation frame while a lazily rendered section mounts, and finally follows
the native anchor so a link is never a silent no-op. The footer renders the same
list, so header and footer never diverge.

### 7.3 About / Our Philosophy

`BrandPhilosophy` is fully written: a lead paragraph, three body paragraphs on
Ayurvedic scalp tradition, botanical ingredients and organic sanctuary care, the
team signature, two wayfinding actions, and three pillars (Ayurvedic scalp
wisdom · Botanical ingredients · Organic sanctuary care) with icon, heading and
copy. No placeholder text, no invented certifications, no medical claims.

### 7.4 Team portraits

`keshTeamPortrait` resolves a portrait in this order: the salon's saved photo,
then the bundled demo portrait for the three template specialists (Dr. Gayatri
Raman, Karthik Sundaram, Deepa Pillai), then a labelled placeholder. The photo
box has a fixed 4:3 ratio so a failed load cannot collapse the card, demo
portraits carry a "Demo / sample portrait" note, and each card lists up to three
specialties from the saved team record.

### 7.5 Gallery

- `#sanctuary` and `#gallery` are now two sibling sections: the room's story
  (warm towels, courtyard plants, one guest per room) and the photographs.
- The bundled sample gallery grew to eight photographs across four categories —
  Interior, Treatments, Rituals, Botanicals — and the grid is driven by
  `data-count`, so one photo, four photos and eight photos all land in a
  deliberate mosaic instead of a ragged half-row.
- A tile whose image cannot decode keeps its footprint and shows a labelled
  "Photograph unavailable" placeholder; the first two tiles load eagerly, the
  rest lazily.

### 7.6 Validation

| Check | Result |
| --- | --- |
| `npm run lint` (tsc) | pass |
| `npm run build` | pass |
| `node scripts/run-all-verifications.mjs` | 69/69 suites pass |
| `scripts/verify-kesh-resilience` (new) | deadlines, RPC→row fallback, hung RPC, template fallback, App source guards, header fallback anchor |
| `scripts/verify-kesh-navigation-gallery` | labels, seven anchors, portraits, specialties, philosophy pillars, eight bundled photos, count-driven mosaic |
