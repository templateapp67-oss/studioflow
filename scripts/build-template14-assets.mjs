/**
 * Template 14 — Veda Sanjeevani asset pipeline.
 *
 * Turns the AI-generated source photographs in `design/templates/14-sources/`
 * (plus the earlier Ayurvedic art already committed under
 * `veda-sanjeevani/assets/source/`) into the responsive WebP set served from
 * `/public/templates/14/`.
 *
 * Rules:
 *  - one aspect ratio per section preset (hero 16:9, services 4:3,
 *    therapists 3:4, testimonials 1:1, gallery 4:3, banners 16:9);
 *  - crop, never stretch (`fit: 'cover'` with a focal-point `position`);
 *  - every slot ships 2–4 widths so the site can serve a real `srcset`;
 *  - WebP at quality 82 (visually lossless at these sizes) + a JPEG social card.
 *
 * Run: `node scripts/build-template14-assets.mjs` (needs `sharp`; install with
 * `npm i --no-save sharp`). The generated files are committed, so a normal
 * `npm install`/build never needs sharp.
 */
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public/templates/14');
const GENERATED = path.join(ROOT, 'design/templates/14-sources');
const REUSED = path.join(ROOT, 'veda-sanjeevani/assets/source');

/** slot → source, aspect ratio, widths, focal point, alt text */
const SLOTS = [
  { name: 'hero', source: 'hero.jpg', ratio: 16 / 9, widths: [800, 1200, 1600, 2000], position: 'centre', alt: 'Warm herbal oil being poured in a luxury Ayurvedic treatment room' },
  { name: 'sanctuary', source: 'sanctuary.jpg', ratio: 16 / 9, widths: [480, 960, 1600], alt: 'Ivory and forest-green Ayurvedic spa sanctuary interior' },
  { name: 'shirodhara', source: 'therapy-shirodhara.jpg', ratio: 4 / 3, widths: [480, 800, 1200], alt: 'Shirodhara warm oil stream therapy' },
  { name: 'abhyanga', source: 'therapy-abhyanga.jpg', ratio: 4 / 3, widths: [480, 800, 1200], alt: 'Abhyanga warm herbal oil massage on a carved teak table' },
  { name: 'potli', source: 'therapy-potli.jpg', ratio: 4 / 3, widths: [480, 800, 1200], alt: 'Warm herbal potli poultice therapy' },
  { name: 'reflexology', source: 'foot-reflexology.jpg', ratio: 4 / 3, widths: [480, 800, 1200], alt: 'Ayurvedic foot reflexology ritual' },
  { name: 'steam', source: 'herbal-steam.jpg', ratio: 4 / 3, widths: [480, 800, 1200], alt: 'Herbal steam therapy room with eucalyptus and brass vessels' },
  { name: 'herbs', source: 'herbs-still-life.jpg', ratio: 1, widths: [480, 800], alt: 'Turmeric, brahmi, rose and brass bowls of Ayurvedic ingredients' },
  { name: 'oil-ritual', source: 'warm-herbal-oil-ritual.webp', from: 'reused', ratio: 4 / 3, widths: [480, 800, 1200], alt: 'Warm herbal oil being prepared for a ritual' },
  { name: 'therapist-ananya', source: 'vaidya-ananya.jpg', ratio: 3 / 4, widths: [400, 800], alt: 'Vaidya Ananya Sharma, Ayurvedic physician' },
  { name: 'therapist-meera', source: 'vaidya-meera.webp', from: 'reused', ratio: 3 / 4, widths: [400, 800], alt: 'Meera Pillai, senior Ayurvedic therapist' },
  { name: 'therapist-rahul', source: 'vaidya-rahul.webp', from: 'reused', ratio: 3 / 4, widths: [400, 800], alt: 'Rahul Nair, Panchakarma specialist' },
  { name: 'ritual', source: 'herbal-ritual.webp', from: 'reused', ratio: 4 / 5, widths: [480, 900], alt: 'Herbal ritual preparation with flowers and oils' },
  { name: 'ritual-hero', source: 'ritual-hero.webp', from: 'reused', ratio: 4 / 5, widths: [480, 900], alt: 'Ayurvedic ritual detail with brass and marigold' },
  { name: 'ayurveda-wide', source: 'ayurvedic-spa-hero.webp', from: 'reused', ratio: 16 / 9, widths: [800, 1600], alt: 'Ayurvedic spa treatment in warm natural light' },
  { name: 'ingredients', source: 'ayurvedic-herbs-still-life.webp', from: 'reused', ratio: 1, widths: [480, 800], alt: 'Ayurvedic herbs and oils styled on ivory stone' },
  { name: 'sanctuary-alt', source: 'sanctuary.webp', from: 'reused', ratio: 3 / 2, widths: [640, 1264], alt: 'Quiet corner of the Veda Sanjeevani sanctuary' },
  /* Therapy-specific photography — one slot per catalogue ritual so every
     service card, package and gallery tile can show its own treatment. */
  { name: 'kizhi', source: 'therapy-kizhi.jpg', ratio: 4 / 3, widths: [480, 800, 1200], alt: 'Kizhi herbal leaf poultices warmed on a teak tray with a brass bowl of oil' },
  { name: 'udvartana', source: 'therapy-udvartana.jpg', ratio: 4 / 3, widths: [480, 800, 1200], alt: 'Udvartana herbal powder body scrub applied in upward strokes' },
  { name: 'pizhichil', source: 'therapy-pizhichil.jpg', ratio: 4 / 3, widths: [480, 800, 1200], alt: 'Pizhichil warm oil bath poured by two therapists on a carved teak droni' },
  { name: 'head-massage', source: 'head-massage.jpg', ratio: 4 / 3, widths: [480, 800, 1200], alt: 'Champi Ayurvedic head massage with warm brahmi oil' },
  { name: 'consultation', source: 'consultation-panchakarma.jpg', ratio: 4 / 3, widths: [480, 800, 1200], alt: 'Panchakarma consultation: an Ayurvedic physician reading the pulse at a teak table' },
  { name: 'couple-suite', source: 'couple-suite.jpg', ratio: 4 / 3, widths: [480, 800, 1200], alt: 'Private couple treatment suite with two carved teak tables and brass lamps' },
  { name: 'treatment-room', source: 'treatment-room.jpg', ratio: 4 / 3, widths: [480, 800, 1200], alt: 'Ayurvedic treatment room with a swaying brass dhara vessel and jaali light' },
  { name: 'gift-voucher', source: 'gift-voucher.jpg', ratio: 4 / 3, widths: [480, 800, 1200], alt: 'Ivory Ayurvedic gift voucher tied with forest-green ribbon and a brass seal' },
  { name: 'promo-banner', source: 'promo-banner.jpg', ratio: 16 / 9, widths: [640, 960, 1600], alt: 'Brass bowl of warm herbal oil and folded sage linen on an ivory stone table' },
];

const sourcePath = (slot) => path.join(slot.from === 'reused' ? REUSED : GENERATED, slot.source);

async function build() {
  await mkdir(OUT, { recursive: true });
  const manifest = [];
  for (const slot of SLOTS) {
    const input = sourcePath(slot);
    const meta = await sharp(input).metadata();
    const widths = slot.widths.filter((width) => width <= Math.round(meta.width || width));
    const usable = widths.length ? widths : [Math.min(Math.round(meta.width || 800), 800)];
    const files = [];
    for (const width of usable) {
      const height = Math.round(width / slot.ratio);
      const file = `${slot.name}-${width}.webp`;
      const target = path.join(OUT, file);
      await sharp(input)
        .resize({ width, height, fit: 'cover', position: slot.position || 'attention', withoutEnlargement: true })
        .webp({ quality: 82, effort: 6 })
        .toFile(target);
      files.push({ width, height, file, bytes: (await stat(target)).size });
    }
    const lqip = await sharp(input).resize({ width: 24 }).webp({ quality: 45 }).toBuffer();
    manifest.push({ slot: slot.name, ratio: slot.ratio, alt: slot.alt, files, lqip: `data:image/webp;base64,${lqip.toString('base64')}` });
    console.log(`${slot.name.padEnd(18)} ${files.map((f) => `${f.width}w ${Math.round(f.bytes / 1024)}KB`).join('  ')}`);
  }

  // Social card (16:9 ⇒ 1200×630) for Open Graph / WhatsApp previews.
  await sharp(sourcePath(SLOTS[0]))
    .resize({ width: 1200, height: 630, fit: 'cover', position: 'attention' })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(OUT, 'og-image.jpg'));

  await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), slots: manifest }, null, 2) + '\n');
  const files = await readdir(OUT);
  console.log(`\n${files.length} files in public/templates/14`);
}

await build();
