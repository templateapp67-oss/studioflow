# Arch & Flutter (Template 13) — Local Artwork Manifest

Every image slot for **Arch & Flutter Lash & Brow Bar (`lash_brow` / Template 13)**
carries a local fallback under `/public/templates/13/`, so no section can ever
render an empty box — not even offline, not even when a remote photograph 404s.

The template prefers themed photography (`images.unsplash.com`, mapped slot by
slot in `ARCH_FLUTTER_IMAGES` in `src/lib/archFlutter.ts`) and falls back to the
vector plates below through `SafeImage`. Owners can replace any slot from
onboarding or the Owner Workspace (logo, hero/cover, about, category tiles,
service photos, gallery, team portraits, offer photos, reel posters); a removed
or broken upload lands back on these files.

## Source & licence

- `art/*.svg`: original vector plates drawn for StudioFlow (arch masks, gradient
  mesh, feather/flutter motifs in the Template 13 palette). No third-party art.
- `logo.svg` / `favicon.svg`: original Arch & Flutter monogram — a lash arch with
  a champagne-gold feather stroke.
- `og-image.jpg`, `preview.jpg` and `reels/poster-*.jpg`: rendered locally with
  ImageMagick from gradients, type and the SVG plates by
  `public/templates/13/rebuild-art.sh` (no stock photography, no watermarks).
- Generated with `design/templates/13-sources/build-assets.py`, which is kept
  outside `public/` so the build script is never deployed to visitors.
- Remote photographs referenced by `ARCH_FLUTTER_IMAGES` are Unsplash-licensed
  lash/brow/salon imagery, hotlinked with `auto=format&fit=crop` and always
  paired with a local `fallback`.

## File list (20 SVG + 7 JPG)

| Folder | Files | Used in |
| --- | --- | --- |
| `art/` | `lash`, `lash-volume`, `lash-natural`, `refill`, `brow`, `brow-lamination`, `microblading`, `pmu`, `eye-care`, `tools` | Category bento tiles + service photo fallbacks (menu, services page) |
| `art/` | `bridal`, `package`, `offer` | Bridal Eye Package, combo/membership packages, **offer cards + the offers empty state** |
| `art/` | `studio`, `team`, `gallery`, `reel`, `before`, `after`, `blog` | About/visit steps, artist cards, lookbook, reels rail, before/after slider, journal |
| `reels/` | `poster-lash-application`, `poster-brow-lamination`, `poster-lash-lift`, `poster-aftercare`, `poster-studio-tour` | The five vertical demo reels (portrait posters, muted autoplay preview) |
| root | `og-image.jpg`, `preview.jpg` | Social share card + template picker thumbnail |
| root | `logo.svg`, `favicon.svg` | Header logo, `?site=` favicon |
| `../../design/templates/13-sources/` | `build-assets.py` (outside `public/`, never deployed) | Generator for the 20 plates, logo and favicon |

## Design notes

- Palette tokens (AA-checked): Blush Rose `#F4D7D3`, Warm Ivory `#FBF6F1`, Deep
  Espresso `#2B1B17`, Champagne Gold `#C9A66B`, Dusty Mauve `#9A6B73`. Body copy
  uses `#7A4F57` (≈6.2:1 on ivory) because raw mauve only reaches ≈4.0:1.
- Typography: oversized serif display headings, sans body, thin gold rules and
  generous whitespace (editorial-luxury, deliberately unlike every other
  template in the catalogue).
- Arch masks: `--af-arch` (`999px 999px 18px 18px`) shapes hero, category,
  team, gallery and offer imagery.
- Every image renders through `SafeImage` (`loading="lazy"`, `decoding="async"`,
  fixed `width`/`height`, descriptive `alt`). The hero photo is the only
  `loading="eager"` image on the site.

Regenerate the artwork with:

```bash
python3 design/templates/13-sources/build-assets.py   # 20 SVG plates + logo + favicon
bash public/templates/13/rebuild-art.sh               # og-image, preview, 5 reel posters
```

`rebuild-art.sh` needs ImageMagick and takes about 90 seconds.
