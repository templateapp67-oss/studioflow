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
