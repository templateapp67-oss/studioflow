# Prism & Chroma (Template 10) — Asset Notes

Assets for **Prism & Chroma Hair Color Atelier (`hair_coloring` / Template 10)**.

| File | Use | Source |
| --- | --- | --- |
| `hero.jpg` | Hero model photo, Shade Studio fallback, gallery/preview fallback, booking CTA default | AI-generated for StudioFlow (royalty-free; no real individuals) |
| `about.jpg` | About section — colourist mixing colour | AI-generated for StudioFlow (royalty-free; no real individuals) |
| `logo.svg` / `favicon.svg` | Original prism-triangle artwork for StudioFlow | StudioFlow original vector |

Picker preview image: `/templates/10/hero.jpg` (also `PRISM_CHROMA_IMAGES.preview`).

All other default photos are free-license Unsplash images listed in
`src/lib/prismChroma.ts` (`PRISM_CHROMA_IMAGES`). Every slot is
onboarding-replaceable: owner uploads (salon logo, cover, about, booking
photo, gallery, team portraits, service photos) always win, and broken image
URLs fall back to the bundled/Template-10 defaults via `SafeImage`.
Images below the fold lazy-load with fixed width/height (no layout shift)
and descriptive alt text.
