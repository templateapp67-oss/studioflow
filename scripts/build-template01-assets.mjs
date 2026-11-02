/**
 * Template 01 — Ziya Women’s Hair Studio asset pipeline.
 *
 * Source photographs live in `design/templates/01-sources/` (women's haircuts
 * and female hairstylists only). This script center-crops — never stretches —
 * each slot to its section aspect ratio and emits responsive WebP variants
 * served from `public/templates/luxury-editorial/`.
 *
 * Run: `node scripts/build-template01-assets.mjs`
 * Uses `sharp` when installed, falling back to ImageMagick `convert` + `identify`.
 */
import { mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, 'design/templates/01-sources');
const OUT = path.join(ROOT, 'public/templates/luxury-editorial');

/** slot -> source, target ratio, widths, gravity */
const SLOTS = [
  { name: 'hero', source: 'hero.jpg', ratio: 4 / 5, widths: [480, 680, 960], gravity: 'North' },
  { name: 'hero-detail', source: 'hero-detail.jpg', ratio: 1, widths: [360, 560], gravity: 'Center' },
  { name: 'about', source: 'about.jpg', ratio: 4 / 3, widths: [480, 760, 1040], gravity: 'Center' },
  { name: 'about-detail', source: 'about-detail.jpg', ratio: 1, widths: [360, 620], gravity: 'Center' },
  { name: 'booking', source: 'booking.jpg', ratio: 16 / 9, widths: [800, 1200], gravity: 'Center' },

  // 14 specialist women's haircut service slots (4:5 vertical portrait preserves crown to ends)
  { name: 'service-layer', source: 'service-layer.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'service-butterfly', source: 'service-butterfly.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'service-bob', source: 'service-bob.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'service-uv-cut', source: 'service-uv-cut.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'Center' },
  { name: 'service-step', source: 'service-step.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'Center' },
  { name: 'service-pixie', source: 'service-pixie.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'service-blunt', source: 'service-blunt.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'Center' },
  { name: 'service-long', source: 'service-long.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'service-short', source: 'service-short.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'service-bangs', source: 'service-bangs.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'service-framing', source: 'service-framing.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'service-curly', source: 'service-curly.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'service-consult', source: 'service-consult.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'Center' },
  { name: 'service-styling', source: 'service-styling.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'Center' },
  { name: 'service-cut', source: 'service-cut.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },

  // 4 female hairstylists
  { name: 'team-1', source: 'team-1.jpg', ratio: 3 / 4, widths: [420, 680, 960], gravity: 'North' },
  { name: 'team-2', source: 'team-2.jpg', ratio: 3 / 4, widths: [420, 680], gravity: 'North' },
  { name: 'team-3', source: 'team-3.jpg', ratio: 3 / 4, widths: [420, 680], gravity: 'North' },
  { name: 'team-4', source: 'team-4.jpg', ratio: 3 / 4, widths: [420, 680], gravity: 'North' },

  // 9 distinct women's haircut style gallery plates (standalone single photos, zero collages)
  { name: 'gallery-1', source: 'gallery-1.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'gallery-2', source: 'gallery-2.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'gallery-3', source: 'gallery-3.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'gallery-4', source: 'gallery-4.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'gallery-5', source: 'gallery-5.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'gallery-6', source: 'gallery-6.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'Center' },
  { name: 'gallery-7', source: 'gallery-7.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'gallery-8', source: 'gallery-8.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'gallery-9', source: 'gallery-9.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'Center' },
];

function renderWithConvert(input, target, width, height, gravity) {
  execFileSync('convert', [
    input,
    '-auto-orient',
    '-strip',
    '-filter', 'Lanczos',
    '-resize', `${width}x${height}^`,
    '-gravity', gravity || 'Center',
    '-extent', `${width}x${height}`,
    '-quality', '82',
    '-define', 'webp:method=6',
    target,
  ]);
}

async function build() {
  await mkdir(OUT, { recursive: true });
  let sharpLib = null;
  try {
    const mod = await import('sharp');
    sharpLib = mod.default || mod;
  } catch {
    sharpLib = null;
  }

  let count = 0;
  let totalBytes = 0;
  for (const slot of SLOTS) {
    const input = path.join(SOURCE, slot.source);
    if (!existsSync(input)) {
      throw new Error(`Missing Template 01 source photograph: ${slot.source}`);
    }
    for (const width of slot.widths) {
      const height = Math.round(width / slot.ratio);
      const target = path.join(OUT, `${slot.name}-${width}.webp`);
      if (sharpLib) {
        await sharpLib(input)
          .resize({
            width,
            height,
            fit: 'cover',
            position: slot.gravity === 'North' ? 'top' : 'centre',
          })
          .webp({ quality: 82, effort: 6 })
          .toFile(target);
      } else {
        renderWithConvert(input, target, width, height, slot.gravity);
      }
      const size = (await stat(target)).size;
      totalBytes += size;
      count += 1;
    }
  }
  console.log(`Built ${count} WebP variants into public/templates/luxury-editorial (${Math.round(totalBytes / 1024)} KB total).`);
}

build().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
