/**
 * NEXORA Growth Partner Rewards — reward imagery pipeline.
 *
 * Source visuals live in `design/growth-partner-rewards/sources/`: one square
 * studio product shot per reward on a warm ivory backdrop. This script frames
 * each one around its subject — it never stretches or crops the product — and
 * emits the responsive WebP variants served from `public/nexora-growth-rewards/`:
 *
 *   <name>-{480,720,960}.webp     4:3 frame used by the reward cards
 *   <name>-thumb-{128,256}.webp   1:1 frame used by the medallions of the hero illustration
 *                                 (one per milestone, so not for the District Partner award)
 *
 * Every subject occupies the same share of its frame, so a phone and an SUV
 * read at a consistent visual weight in the grid. Where a frame is wider than
 * the square source, the studio backdrop is continued by repeating the edge
 * pixels and softening that band, which is seamless on a plain backdrop. Each
 * backdrop is also balanced to one shared ivory so the cards sit together as a
 * set; the same colour backs the image slots in the page stylesheet.
 *
 * Run: `npm run assets:growth-rewards`
 * Requires ImageMagick (`convert`), the same fallback the template pipelines use.
 */
import { mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, 'design/growth-partner-rewards/sources');
const OUT = path.join(ROOT, 'public/nexora-growth-rewards');
const SOURCE_SIZE = 1024;
/** Shared studio ivory (#F5F0E4). Keep in step with `--ngr-studio` in the page stylesheet. */
const BACKDROP = [245, 240, 228];

const CARD = { suffix: '', ratio: 4 / 3, widths: [480, 720, 960], fitWidth: 0.84, fitHeight: 0.76 };
const THUMB = { suffix: '-thumb', ratio: 1, widths: [128, 256], fitWidth: 0.8, fitHeight: 0.8 };

/**
 * name -> source file, the subject's bounding box [x, y, width, height] in
 * source pixels, and the variants the page uses (card and thumb unless stated).
 */
const SLOTS = [
  { name: 'reward-tshirt', source: 'reward-tshirt.jpg', subject: [182, 101, 660, 850] },
  { name: 'reward-tablet', source: 'reward-tablet.jpg', subject: [118, 301, 790, 516] },
  { name: 'reward-laptop', source: 'reward-laptop.jpg', subject: [88, 205, 873, 668] },
  { name: 'reward-scooter', source: 'reward-scooter.jpg', subject: [84, 191, 862, 663] },
  { name: 'reward-iphone', source: 'reward-iphone.jpg', subject: [231, 156, 564, 734] },
  { name: 'reward-motorcycle', source: 'reward-motorcycle.jpg', subject: [48, 221, 932, 603] },
  { name: 'reward-suv', source: 'reward-suv.jpg', subject: [95, 336, 855, 452] },
  { name: 'reward-district-partner', source: 'reward-district-partner.jpg', subject: [238, 133, 543, 768], variants: [CARD] },
];

/** The frame (in source pixels) that shows the whole subject at the variant's fit. It may extend past the source. */
function frameFor([x, y, width, height], variant) {
  const frameHeight = Math.max(height / variant.fitHeight, width / variant.fitWidth / variant.ratio);
  const frameWidth = frameHeight * variant.ratio;
  let top = y + height / 2 - frameHeight / 2;
  // Prefer real backdrop above and below the subject whenever the source has it.
  if (frameHeight <= SOURCE_SIZE) top = Math.min(Math.max(top, 0), SOURCE_SIZE - frameHeight);
  return {
    x: Math.round(x + width / 2 - frameWidth / 2),
    y: Math.round(top),
    width: Math.round(frameWidth),
    height: Math.round(frameHeight),
  };
}

const signed = (value) => (value < 0 ? `${value}` : `+${value}`);

/** Per-channel gain that brings the source's own backdrop (its top and side edges) to the shared ivory. */
function backdropGain(input) {
  const edge = 16;
  const strips = [`${SOURCE_SIZE}x${edge}+0+0`, `${edge}x${SOURCE_SIZE}+0+0`, `${edge}x${SOURCE_SIZE}+${SOURCE_SIZE - edge}+0`]
    .map((crop) => execFileSync('convert', [
      input, '-crop', crop, '+repage', '-format', '%[fx:mean.r] %[fx:mean.g] %[fx:mean.b]', 'info:',
    ]).toString().trim().split(/\s+/).map(Number));
  return BACKDROP.map((target, channel) => {
    const mean = (strips.reduce((sum, strip) => sum + strip[channel], 0) / strips.length) * 255;
    return Math.min(1.08, Math.max(0.94, target / mean)).toFixed(4);
  });
}

function render(input, target, frame, gain, outWidth, outHeight) {
  const viewport = `${frame.width}x${frame.height}${signed(frame.x)}${signed(frame.y)}`;
  const extended = frame.x < 0 || frame.y < 0
    || frame.x + frame.width > SOURCE_SIZE || frame.y + frame.height > SOURCE_SIZE;
  const args = [
    input, '-auto-orient', '-strip',
    '-color-matrix', `${gain[0]} 0 0 0 ${gain[1]} 0 0 0 ${gain[2]}`,
    '-virtual-pixel', 'Edge', '-filter', 'Point',
    '-set', 'option:distort:viewport', viewport,
    '-distort', 'SRT', '0', '+repage',
  ];
  if (extended) {
    // The part of the frame covered by real source pixels, pulled in slightly so
    // the softened band starts just inside the photograph and hides the seam.
    const inset = 10;
    const left = Math.max(0, -frame.x) + inset;
    const top = Math.max(0, -frame.y) + inset;
    const right = Math.min(frame.width, SOURCE_SIZE - frame.x) - 1 - inset;
    const bottom = Math.min(frame.height, SOURCE_SIZE - frame.y) - 1 - inset;
    args.push(
      '(', '+clone', '-blur', '0x14', ')',
      '(', '-size', `${frame.width}x${frame.height}`, 'xc:white', '-fill', 'black',
      '-draw', `rectangle ${left},${top} ${right},${bottom}`, '-blur', '0x6', ')',
      '-composite',
    );
  }
  args.push(
    '-filter', 'Lanczos', '-resize', `${outWidth}x${outHeight}!`,
    '-quality', '86', '-define', 'webp:method=6',
    target,
  );
  execFileSync('convert', args);
}

async function build() {
  await mkdir(OUT, { recursive: true });
  let count = 0;
  let totalBytes = 0;
  for (const slot of SLOTS) {
    const input = path.join(SOURCE, slot.source);
    if (!existsSync(input)) throw new Error(`Missing Growth Partner Rewards source visual: ${slot.source}`);
    const gain = backdropGain(input);
    for (const variant of slot.variants ?? [CARD, THUMB]) {
      const frame = frameFor(slot.subject, variant);
      for (const width of variant.widths) {
        const target = path.join(OUT, `${slot.name}${variant.suffix}-${width}.webp`);
        render(input, target, frame, gain, width, Math.round(width / variant.ratio));
        totalBytes += (await stat(target)).size;
        count += 1;
      }
    }
  }
  console.log(`Built ${count} WebP variants into public/nexora-growth-rewards (${Math.round(totalBytes / 1024)} KB total).`);
}

build().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
