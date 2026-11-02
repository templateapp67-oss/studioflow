/**
 * Template 01 — Luxury Editorial Salon asset pipeline.
 *
 * Source photographs live in `design/templates/01-sources/` (AI-generated for
 * this template only). This script crops — never stretches — each slot to its
 * section aspect ratio and emits the responsive WebP set served from
 * `public/templates/luxury-editorial/`.
 *
 * Run: `node scripts/build-template01-assets.mjs` (needs `sharp`; install with
 * `npm i --no-save sharp`). Generated files are committed, so a normal install
 * never needs sharp.
 */
import { mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, 'design/templates/01-sources');
const OUT = path.join(ROOT, 'public/templates/luxury-editorial');

/** slot → source, target ratio, widths, crop focus */
const SLOTS = [
  { name: 'hero', source: 'hero.jpg', ratio: 4 / 5, widths: [480, 680, 900], position: 'centre' },
  { name: 'hero-detail', source: 'hero-detail.jpg', ratio: 1, widths: [360, 560], position: 'centre' },
  { name: 'about', source: 'about.jpg', ratio: 3 / 4, widths: [480, 660, 800], position: 'centre' },
  { name: 'about-detail', source: 'about-detail.jpg', ratio: 1, widths: [360, 620], position: 'centre' },
  { name: 'booking', source: 'booking.jpg', ratio: 16 / 9, widths: [800, 1200, 1400], position: 'centre' },
  { name: 'service-cut', source: 'service-cut.jpg', ratio: 4 / 3, widths: [480, 760], position: 'centre' },
  { name: 'service-colour', source: 'service-colour.jpg', ratio: 4 / 3, widths: [480, 760], position: 'centre' },
  { name: 'service-keratin', source: 'service-keratin.jpg', ratio: 4 / 3, widths: [480, 760], position: 'centre' },
  { name: 'service-keratin-alt', source: 'service-keratin.jpg', ratio: 1, widths: [480, 760], position: 'centre' },
  { name: 'service-styling', source: 'service-styling.jpg', ratio: 4 / 3, widths: [480, 760], position: 'centre' },
  { name: 'service-scalp', source: 'service-scalp.jpg', ratio: 4 / 3, widths: [480, 760], position: 'centre' },
  { name: 'service-bridal', source: 'service-bridal.jpg', ratio: 4 / 3, widths: [480, 760], position: 'centre' },
  { name: 'team-1', source: 'team-1.jpg', ratio: 3 / 4, widths: [420, 680], position: 'attention' },
  { name: 'team-2', source: 'team-2.jpg', ratio: 3 / 4, widths: [420, 680], position: 'attention' },
  { name: 'team-3', source: 'team-3.jpg', ratio: 3 / 4, widths: [420, 680], position: 'attention' },
  { name: 'gallery-1', source: 'gallery-1.jpg', ratio: 3 / 4, widths: [480, 700], position: 'centre' },
  { name: 'gallery-2', source: 'gallery-2.jpg', ratio: 4 / 3, widths: [520, 900], position: 'centre' },
  { name: 'gallery-3', source: 'gallery-3.jpg', ratio: 1, widths: [480, 700], position: 'centre' },
  { name: 'gallery-4', source: 'gallery-4.jpg', ratio: 4 / 5, widths: [480, 700], position: 'centre' },
  { name: 'gallery-5', source: 'gallery-5.jpg', ratio: 3 / 2, widths: [520, 900], position: 'centre' },
  { name: 'gallery-6', source: 'gallery-6.jpg', ratio: 1, widths: [480, 700], position: 'centre' },
];

async function build() {
  await mkdir(OUT, { recursive: true });
  const missing = [];
  let total = 0;
  for (const slot of SLOTS) {
    const input = path.join(SOURCE, slot.source);
    if (!existsSync(input)) {
      missing.push(slot.source);
      continue;
    }
    const meta = await sharp(input).metadata();
    const sourceWidth = meta.width || 800;
    const sourceHeight = meta.height || 800;
    for (const width of slot.widths) {
      const height = Math.round(width / slot.ratio);
      // Never upscale beyond the source photograph; the slot simply reuses its
      // widest available rendering when a larger request is made.
      if (width > Math.round(sourceWidth * 1.35)) continue;
      const target = path.join(OUT, `${slot.name}-${width}.webp`);
      await sharp(input)
        .resize({ width, height, fit: 'cover', position: slot.position || 'centre', withoutEnlargement: false })
        .webp({ quality: 82, effort: 6 })
        .toFile(target);
      const size = (await stat(target)).size;
      total += size;
      console.log(`${path.basename(target)}  ${width}×${height}  ${(size / 1024).toFixed(0)} KB`);
    }
    if (slot.widths[slot.widths.length - 1] > Math.round(sourceWidth * 1.35)) {
      // The layout asks for a wider slot than the source holds; note it.
      console.warn(`! ${slot.name}: source ${sourceWidth}×${sourceHeight} is narrower than ${slot.widths[slot.widths.length - 1]}px.`);
    }
  }
  console.log(`\n${(total / 1024 / 1024).toFixed(2)} MB written to ${path.relative(ROOT, OUT)}`);
  if (missing.length) {
    console.warn(`Missing sources (${missing.length}): ${missing.join(', ')}`);
    process.exitCode = 2;
  }
}

await build();
