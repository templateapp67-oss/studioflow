# Template 15 media update — 3 November 2026

Scope: Template 15 only (`mens_hair_studio`). This update adds twenty-six distinct, locally bundled generated photographs and connects them to the customer site:

- `public/templates/15/mens-hero-desktop.webp` — 1376×768 desktop hero; adult male customer receiving a fade from a male barber.
- `public/templates/15/mens-hero-mobile.webp` — 928×1152 mobile hero; a different adult male model and scene.
- `public/templates/15/mens-interior-wide.webp` — 1376×768 men's salon interior in a new About / studio-story section.
- `public/templates/15/barber-arjun.webp`, `barber-kabir.webp`, `barber-dev.webp` — three separate 896×1200 male portraits; connected respectively to Arjun, Kabir and Dev. The previous three barber illustration SVGs were removed.
- Twenty unique 1200×896 haircut photographs (`classic-mens-cut.webp` through `mens-hair-trim.webp`) connected one-to-one to all 20 matching haircut services.

Images are optimized WebP. The hero uses responsive `<picture>` art direction, descriptive alt text, explicit intrinsic dimensions, eager/high-priority loading for the desktop hero, and lazy loading for secondary images. `public/templates/15/media-manifest.json` records the filesystem/hash audit. Re-run it with `npm run media:template15`.

## NEXORA watermark update — 3 November 2026

A single reusable transparent `nexora-watermark.png` asset now renders the exact uppercase `NEXORA` wordmark. It is burned into all 30 present Template 15 photographic WebP files (26 generated photos plus four pre-existing local photo references), in a small bottom-right translucent dark/bronze panel. The same reusable mark is also embedded into all 18 existing Template 15 SVG images, and burned into the three present playable MP4 preview clips, so the logo remains visible during playback and native fullscreen. The three used video thumbnails are the corresponding already-watermarked photographs. `nexora-branding.json` records each file's post-branding SHA-256; `media-manifest.json` reports exact spelling and branded asset paths. Re-run with `pip install -r scripts/requirements-template15-media.txt && npm run brand:template15` when adding Template 15 media. The branding script is Template 15-scoped and idempotent.

A decoded frame from the branded fade preview was visually inspected: the wordmark reads NEXORA at bottom-right without covering the haircut. All three existing clips remain 5-second animated photo references, not actual salon-process videos. The other 30 requested images and all six real-process MP4s are still missing, so those future assets cannot yet be branded or verified.

## Verified

- Twenty-six generated photographs exist; prompts call for male-only subjects, with no text or watermark. All 20 haircut images are separate files assigned one-to-one to the haircut menu; six hero/interior/barber photos were visually inspected.
- SHA-256 scan: no exact duplicate hashes among the thirty present local photographic files (twenty-six new, four pre-existing references).
- HTTP checks against the running development server: all twenty-six new WebP images returned `200 image/webp`; `/?template=15` returned `200`.
- `npm run lint`, `npm run build`, `node scripts/verify-template15.mjs`, `node scripts/verify-template15-interactions.mjs`, `node scripts/verify-template15-migration.mjs`, and `git diff --check` passed.
- `node scripts/verify-template15-legacy.mjs` could not run: it references commit `12db7865882041fa711d8d5581b8c1f98c5f112d`, which is not available in this checkout's Git history. No other template files were edited.
- A real visual browser pass at desktop/tablet/mobile widths was not available in this workspace. HTTP and production-build checks are not represented as responsive-browser acceptance.

## Incomplete — do not treat as a completed image/video replacement

All **20 haircut service images** are now separate generated files connected one-to-one to their matching haircut cards. Still missing are all 10 colour-service photos, 3 other about/interior/detail photos, 8 unique gallery photos, 3 promotion images and 6 unique video thumbnails. The manifest identifies **30 requested image files still missing**. Colour service cards still reuse the existing `colour.webp` reference; the gallery still includes reused photos and SVG illustrations.

There are **0 of the 6 requested actual process videos**. Three existing local clips (`fade-preview.mp4`, `colour-preview.mp4`, `long-preview.mp4`) remain playable animated AI-photo references, not real haircut or colour process footage; the UI labels them honestly. No fake process-video paths were added. The manifest/hash check is not a perceptual similarity scan, and full broken-media/render scans plus desktop/tablet/mobile browser testing have not been completed.

This update improves the responsive hero, adds a studio-story visual and replaces all three barber profile illustrations with distinct male portraits, but **does not satisfy the complete-media brief or make Template 15 ready for final image/video acceptance**. The remaining files need distinct, reviewed male-only photography and actual male-only MP4 footage supplied/generated and connected to their matching sections. No live data, booking logic, other template, or publishing state was changed.
