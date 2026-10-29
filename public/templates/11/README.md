# Shringaar Royal (Template 11) — Local Image Manifest

Every photograph for **Shringaar Royal Indian Bridal Lounge (`bridal_lounge` /
Template 11)** is stored locally under `/public/templates/11/` — zero external
stock hotlinks, so the storefront renders fully offline and no section can ever
show an empty placeholder.

Owners can replace any slot through onboarding (logo, hero/cover, about, offer
banner, booking background, gallery, team portraits, service photos). When a
custom upload is removed or broken, `SafeImage` falls back to these local files.

## Source & licence

- All photographs are **AI-generated for StudioFlow** (synthetic scenes; no real
  private individuals) and are royalty-free for commercial and SaaS template use.
- `team/janki.jpg` and `team/farzana.jpg` are re-crops of the AI-generated
  portraits already shipped with StudioFlow (`/public/templates/roop-mahal/`),
  re-framed for the arch-shaped artist cards. `team/anuradha.jpg` is a new
  portrait generated for Template 11.
- Derived crops (collections, looks, packages, services, results, process,
  testimonials, gallery) are made locally with ImageMagick from the ten source
  photographs kept in `design/templates/11-sources/` (deliberately outside
  `public/` so the masters are never shipped to visitors).
- `logo.svg` / `favicon.svg`: original lotus / jharokha vector artwork for
  StudioFlow.

## File list (59 JPG + 2 SVG)

| Folder | Files | Used in |
| --- | --- | --- |
| root | `hero-bride.jpg`, `venue.jpg`, `og-image.jpg`, `artist-anuradha.jpg`, `logo.svg`, `favicon.svg` | Hero arch, OG/Twitter card, template thumbnail, owner portrait |
| `collections/` | `lehenga`, `poshak`, `jewellery`, `dupatta`, `veil`, `accessories` | Signature collections rail (6 arch cards) |
| `looks/` | `look-1` … `look-8` | Sabyasachi aesthetic masonry lookbook |
| `packages/` | `classic`, `royal`, `maharani` | Heirloom makeover package cards |
| `services/` | `makeup`, `hair`, `draping`, `mehendi`, `prebridal`, `glow` | Bridal menu bento tiles + service image templates |
| `results/` | `before-1`, `after-1`, `before-2`, `after-2` | Before / after comparison sliders |
| `team/` | `anuradha`, `janki`, `farzana` | Artist portraits (arch cards) |
| `process/` | `consultation`, `trial`, `ritual`, `wedding-day` | Your Bridal Journey (4-step timeline) |
| `testimonials/` | `bride-1` … `bride-3` | Bride quote carousel portraits |
| `gallery/` | `gallery-1` … `gallery-8` | Instagram-style strip, demo lookbook + gallery defaults |
| `../../design/templates/11-sources/` | the 10 original generated photographs (outside `public/`, never deployed) | Source material for the crops above |

## Design notes

- Colours: oxblood maroon `#5A0F1E`, royal gold `#C9A24B`, antique ivory
  `#FBF4E6`, marigold saffron `#E8962E`, peacock teal `#0F5C5A`, rose blush
  `#E9B8B0`, charcoal brown `#2A1A17`.
- Typography: Cormorant Garamond / Playfair Display (headings), Inter / Hanken
  Grotesk (body), Great Vibes (small script flourishes only).
- Every image is rendered through `SafeImage` (`loading="lazy"`,
  `decoding="async"`, fixed `width`/`height`, descriptive `alt`); the hero photo
  is the only `loading="eager"` image.

Regenerate the derived crops with `bash public/templates/11/rebuild-crops.sh`
(requires ImageMagick; the script is kept beside the images for future edits).
