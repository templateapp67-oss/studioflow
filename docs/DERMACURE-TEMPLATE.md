# Template 07 — Dermacure Aesthetic Dermatology & Laser Clinic

Template id: `skincare_clinic`. This document records the About / team / gallery
pass (the same treatment Template 06 received in
[`KESH-PRAKRITI-TEMPLATE.md`](./KESH-PRAKRITI-TEMPLATE.md) §7).

Nothing about booking, payments, publishing, reviews, the owner workspace or any
other template changed.

## 1. Where Template 07 lives

| Path | Role |
| --- | --- |
| `src/components/DermacureWebsite.tsx` | Composition root and section order. |
| `src/components/dermacure/` | 21 sections plus `context.tsx`, `animation.ts`, `consultation.ts`, `useRevealRecovery.ts`. |
| `src/components/dermacure.css` | All `.dc-*` styles. |
| `src/lib/dermacureSite.ts` | Bundled imagery, the sample clinic gallery and clinician portrait resolution. |
| `public/templates/dermacure/` | Bundled reference photography, fonts and the three clinician portraits. |
| `scripts/verify-dermacure.tsx` | Offline suite (rendering, interactions, and the guards added here). |

## 2. What changed

### 2.1 Header navigation

`context.tsx` gained one `scrollTo(target)` helper used by the desktop row, the
mobile drawer, the logo, the footer links and "Back to top". It scrolls
immediately, retries on the next animation frame while a lazily mounted section
appears, then follows the native anchor so a link is never a silent no-op. While
the drawer is open the scroll is queued until the drawer releases the body
scroll lock.

The clinic nav now also exposes the two sections that were rendered but
unreachable from the header: **Our Team** (`#salon-team`) and **Gallery**
(`#clinic-gallery`). Both respect the owner's `headerNavigation` toggles. A
`max-width: 1400px` step tightens the desktop row so eight links still fit
before the drawer takes over at 1200px.

### 2.2 About / Our Philosophy

`BrandPhilosophy.tsx` is now a full section: label, heading, four paragraphs of
clinic copy (assessment first, technology matched to the concern, honest session
counts, aftercare you can repeat) and two wayfinding actions. Below it, three
pillars — **Dermatologist-led assessment**, **Medical-grade technology**,
**Protocols you can repeat** — each with an icon, heading and copy.

No outcome guarantees, no percentages, no invented certifications: the copy
describes process, which is what the clinic can actually stand behind.

### 2.3 Clinician portraits

`dermacureTeamPortrait()` resolves in this order: the clinic's saved photo → a
bundled portrait for a template clinician → a labelled initial. The template's
three clinicians now ship with generated, locally served portraits
(`team-tanvi.jpg`, `team-sameer.jpg`, `team-neha.jpg`, 1086×1448) and the seed
data points at them instead of a remote stock host.

The frame keeps a 3:4 ratio in every branch, demo portraits carry a
"Demo / sample portrait" note, and each card lists up to three specialties.

### 2.4 Gallery

`ClinicGallery.tsx` previously returned `null` whenever the clinic had published
nothing — the bundled demo had no gallery at all. It now:

- renders `clinicGalleryEntries(photos)`: the clinic's own photographs when they
  exist, otherwise eight bundled reference photographs across **Clinic**,
  **Treatments** and **Technology**;
- labels every bundled tile `DEMO / SAMPLE` and explains the fallback in a
  section note, so a stock photo is never presented as the clinic's own room;
- sizes the mosaic from `data-count` (1, 2, 3+ and 8 photos all land in a
  deliberate grid, collapsing to 2 columns at 900px and 1 at 480px);
- keeps the footprint of a photograph that cannot be decoded, drops its `href`
  (never link to a URL that 404s) and says "Photo unavailable (illustration)";
- exposes category filters with live counts.

`safeClinicUrl()` accepts only absolute `https:` URLs and bundled
`/templates/dermacure/*` paths, so `javascript:` or relative junk is dropped.

## 3. Loading halts

Template 07 inherits the global fix from §7.1 of the Kesh doc: the owner
workspace bootstrap (`src/lib/accountBootstrap.ts`) is time-boxed and falls back
to the saved workspace row, and the published-site read has a 15 s deadline. No
template-specific code was needed.

## 4. Validation

| Check | Result |
| --- | --- |
| `npm run lint` (tsc) | pass |
| `npm run build` | pass |
| `node scripts/run-all-verifications.mjs` | 69/69 suites pass |
| `scripts/verify-dermacure` | 8 nav destinations resolve, three portrait files exist, eight labelled gallery photographs, count-driven mosaic, safe URL filtering |
| `scripts/verify-photo-gallery` | Template 07 now asserts labelled reference photographs instead of an absent gallery |

## 5. Remaining notes

1. The three clinician portraits are AI-generated reference imagery, labelled as
   samples in the UI. Replacing them is an owner/content task.
2. `scripts/check-dermacure-final.mjs` (opt-in Chromium acceptance run) is
   unchanged; it exercises an unpublished fixture whose own broken gallery URL
   still suppresses the gallery link, which is the behaviour §2.4 preserves.

# Round 2 — About / Philosophy rebuild

The About section was rewritten to the supplied "Complete About / Philosophy"
specification. Nothing outside it changed: header, hero, treatments, directory,
technology, results, gallery, team, booking, contact, footer, routing and every
other template are untouched.

## 1. Composition

`BrandPhilosophy` (`id="about"`) now renders, in order:

1. **Editorial hero** — ivory background, `OUR PHILOSOPHY` eyebrow, the
   three-line heading "Skin Health. / Science. / Self-Confidence.", the two
   specified paragraphs, and two working actions: **Discover Our Approach**
   (`scrollTo("journey")`) and **Meet the clinicians** (`scrollTo("salon-team")`,
   only when the team section is visible). The right column layers a large
   consultation photograph (`reference-consultation.webp`) with a circular skin
   assessment inset (`treatment.webp`), champagne borders, soft shadows and a
   `Demo / sample photograph` note.
2. **Three pillars** (`PhilosophyPillars`) — Guided by Science, Care That
   Considers You, Built Around Trust, each with its label
   (`SCIENCE-LED CARE`, `PERSONALISED ATTENTION`, `TRUST & TRANSPARENCY`), a line
   icon, a fine champagne border and a gentle hover lift. Three-up above 1024px,
   stacked below.
3. **Statement banner** (`PhilosophyBanner`, `id="philosophy-statement"`) — the
   charcoal/espresso panel with `clinic.webp` behind a scrim, decorative
   champagne rule, "Every Skin Journey Deserves Thoughtful Care." and one CTA
   that calls `booking()` (falls back to the clinic's contact details when the
   clinic does not accept online bookings), so it is never a dead button.
4. **Editorial quote** — "Good skin care begins with understanding—not
   assumptions." on an ivory/champagne panel, captioned as brand philosophy, not
   attributed to any clinician.

`PatientJourney` (`id="journey"`) is the four-step approach: 01 Listen, 02
Assess, 03 Personalise, 04 Guide, in an `<ol>` with fine connecting lines (a
horizontal timeline above 1024px, vertical below). Its CTA reads **Book a
Personalised Consultation** when the clinic accepts bookings and **Contact the
Clinic** otherwise. The copy talks about discussion and guidance only — nothing
on the page implies the website diagnoses anything.

## 2. Truth constraints

The trust strip was intentionally **omitted**: no verified degrees, awards,
certifications or approval badges were available. `templateData.ts`
`certifications` ("US-FDA Approved Technology", "Board-Certified
Cosmetologists") remain sample marketing copy and are still not surfaced by the
template. The only personnel information shown is the owner's own profile data.

## 3. Motion and resilience

`motion/react` only (no second animation library). Fades and staggered cards use
the shared `fade` / `stagger` / `imageReveal` variants with
`viewport={{ once: true, amount: 0.2 }}`; the existing `reduced` flag disables
all reveals, so nothing is ever permanently hidden. No parallax. Images are
repo-local (`/templates/dermacure/*`) and every frame falls back to a bundled
illustration with a described alt.

## 4. Validation

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | pass |
| `npm run build` | pass |
| `node scripts/run-all-verifications.mjs` | 70/70 suites pass |
| `scripts/verify-dermacure` | About copy, three pillars, banner, quote and four journey steps asserted |
| `scripts/verify-dermacure-philosophy` (new) | About/banner CTAs resolve to real ids, the banner books or falls back to contact, About imagery is local only, a hidden About leaves no `#about` nav link |
| responsive | 320 / 375 / 430 / 768 / 1024 / 1440 breakpoints covered in `dermacure.css`; overlapping imagery never covers body copy (the demo note moves into normal flow at 768px, the inset shrinks to 96px at 430px) |

A note on the environment: the sandbox image has no Chromium system libraries
(`libnspr4`/`libnss3` are absent and cannot be installed without network access
to an OS package mirror), so the opt-in `scripts/check-dermacure-browser.mjs`
run could not be executed here. Layout was verified through the breakpoint
audit above and the DOM-level suites; it should be re-run in a normal browser
environment before release.
