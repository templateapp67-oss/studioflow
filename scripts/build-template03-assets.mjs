/**
 * Template 03 — Aura Unisex Salon & Wellness Lounge asset pipeline.
 *
 * Source photographs live in `design/templates/03-sources/` (Indian unisex
 * salon photography only). This script center-crops — never stretches — each
 * slot to its section aspect ratio and emits responsive WebP variants served
 * from `public/templates/aura-unisex/`.
 *
 * Run: `node scripts/build-template03-assets.mjs`
 * Uses `sharp` when installed, falling back to ImageMagick `convert`.
 *
 * Slots whose source photograph has not been generated yet are reported as
 * skipped rather than failing the build, so the pipeline can run while the
 * image set is still being produced.
 */
import { mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, 'design/templates/03-sources');
const OUT = path.join(ROOT, 'public/templates/aura-unisex');

/** slot -> source, target ratio, widths, gravity */
const SLOTS = [
  // Hero: one tall unisex salon photograph plus the two service cards.
  { name: 'hero-main', source: 'hero-main.jpg', ratio: 3 / 4, widths: [480, 720, 1024], gravity: 'Center' },
  { name: 'hero-men', source: 'hero-men.jpg', ratio: 16 / 10, widths: [480, 760], gravity: 'Center' },
  { name: 'hero-women', source: 'hero-women.jpg', ratio: 16 / 10, widths: [480, 760], gravity: 'Center' },

  // About: large interior + smaller professional-at-work plate.
  { name: 'about-interior', source: 'about-interior.jpg', ratio: 4 / 3, widths: [480, 760, 1080], gravity: 'Center' },
  { name: 'about-work', source: 'about-work.jpg', ratio: 1, widths: [360, 620], gravity: 'Center' },

  // Men & Women feature cards.
  { name: 'feature-men', source: 'feature-men.jpg', ratio: 16 / 10, widths: [640, 960], gravity: 'Center' },
  { name: 'feature-women', source: 'feature-women.jpg', ratio: 16 / 10, widths: [640, 960], gravity: 'Center' },

  // Wellness band + dark booking banner.
  { name: 'wellness', source: 'wellness.jpg', ratio: 4 / 3, widths: [640, 960, 1280], gravity: 'Center' },
  { name: 'booking', source: 'booking.jpg', ratio: 16 / 9, widths: [800, 1280], gravity: 'Center' },

  // Five distinct gallery plates (standalone single photos, zero collages).
  { name: 'gallery-1', source: 'gallery-1.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'Center' },
  { name: 'gallery-2', source: 'gallery-2.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'gallery-3', source: 'gallery-3.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'gallery-4', source: 'gallery-4.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'Center' },
  { name: 'gallery-5', source: 'gallery-5.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },

  // Service-specific plates (4:5 vertical keeps head-to-shoulder service detail).
  { name: 'service-haircut', source: 'service-haircut.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'service-colour', source: 'service-colour.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'service-beard', source: 'service-beard.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'service-facial', source: 'service-facial.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'service-styling', source: 'service-styling.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'North' },
  { name: 'service-pedicure', source: 'service-pedicure.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'Center' },
  { name: 'service-hairspa', source: 'service-hairspa.jpg', ratio: 4 / 5, widths: [480, 760], gravity: 'Center' },

  // Team action-portrait plates (4:5 editorial portraits).
  { name: 'team-1', source: 'team-1.jpg', ratio: 4 / 5, widths: [420, 640], gravity: 'North' },
  { name: 'team-2', source: 'team-2.jpg', ratio: 4 / 5, widths: [420, 640], gravity: 'North' },
  { name: 'team-3', source: 'team-3.jpg', ratio: 4 / 5, widths: [420, 640], gravity: 'North' },
];

function renderWithConvert(input, target, width, height, gravity) {
  execFileSync('convert', [
    input,
    '-auto-orient',
    '-strip',
    '-filter',
    'Lanczos',
    '-resize',
    `${width}x${height}^`,
    '-gravity',
    gravity || 'Center',
    '-extent',
    `${width}x${height}`,
    '-quality',
    '82',
    '-define',
    'webp:method=6',
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
  const skipped = [];

  for (const slot of SLOTS) {
    const input = path.join(SOURCE, slot.source);
    if (!existsSync(input)) {
      skipped.push(slot.source);
      continue;
    }
    for (const width of slot.widths) {
      const height = Math.round(width / slot.ratio);
      const target = path.join(OUT, `${slot.name}-${width}.webp`);
      if (sharpLib) {
        await sharpLib(input)
          .resize({ width, height, fit: 'cover', position: slot.gravity === 'North' ? 'top' : 'centre' })
          .webp({ quality: 82, effort: 6 })
          .toFile(target);
      } else {
        renderWithConvert(input, target, width, height, slot.gravity);
      }
      totalBytes += (await stat(target)).size;
      count += 1;
    }
  }

  console.log(
    `Built ${count} WebP variants into public/templates/aura-unisex (${Math.round(totalBytes / 1024)} KB total).`,
  );
  if (skipped.length) {
    console.warn(`Skipped ${skipped.length} missing source photograph(s): ${skipped.join(', ')}`);
    console.warn('Generate them into design/templates/03-sources/ and re-run `npm run assets:template03`.');
  }
}

build().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
