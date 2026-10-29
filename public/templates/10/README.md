# Prism & Chroma (Template 10) — Local Image Manifest

All images for **Prism & Chroma Hair Color Atelier (`hair_coloring` / Template 10)** are
stored locally under `/public/templates/10/` — zero external stock hotlinks.
Owners can replace any slot via onboarding (logo, cover/hero, about, booking photo,
gallery, team portraits, service photos); when a custom upload is removed or broken,
the storefront falls back to these local files via `SafeImage`.

## Source & license

- All photographs are **AI-generated for StudioFlow** (synthetic; no real private
  individuals), royalty-free for commercial & SaaS template use.
- Shade variants (cyan/coral/rose-gold), before/after "before" frames, team and
  testimonial portraits, process steps and gallery crops are derived locally
  (ImageMagick/Pillow) from the generated set — hair-only tints, face crops and
  varied crops, created for StudioFlow.
- `logo.svg` / `favicon.svg`: original prism-triangle vector artwork for StudioFlow.

## Complete image list (44 JPG + 2 SVG)

| Folder | Files | Used in |
| --- | --- | --- |
| root | `hero.jpg`, `about.jpg`, `interior.jpg` | Hero + booking CTA, About, gallery fallback |
| `services/` | balayage, global-colour, pastel, highlights, correction, keratin, gloss, root-touchup | Services bento grid (8 cards) + packages |
| `shades/` | violet, magenta, coral, cyan, rose-gold, honey | Shade Studio (6 swatches) |
| `results/` | before-1..3, after-1..3 | Before/After sliders (3) |
| `process/` | consultation, mapping, application, finish | Process — 4 steps |
| `team/` | aarushi, kiara, priya, tara | Colour Experts (4 cards) |
| `testimonials/` | ananya, ishita, meera | Testimonial avatars |
| `gallery/` | gallery-1 .. gallery-10 | Masonry gallery (10) |

Images below the fold lazy-load with fixed width/height (no layout shift) and
descriptive alt text; images carry a dark gradient overlay wherever text sits on top.
