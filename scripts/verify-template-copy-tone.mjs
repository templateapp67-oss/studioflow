#!/usr/bin/env node
/**
 * Copy tone guard.
 *
 * The 16 salon templates should read in warm, plain Indian English. This script
 * fails if the heavy, over-formal wording we deliberately replaced creeps back
 * into the template copy libraries, so a later edit cannot silently undo the
 * tone pass.
 *
 * Run: node scripts/verify-template-copy-tone.mjs
 */
import { readFileSync } from 'node:fs';

const FILES = [
  'src/categoryTemplates.ts',
  'src/lib/aureliaBeauty.ts',
  'src/lib/archFlutter.ts',
  'src/lib/bodhiTree.ts',
  'src/lib/keshkraft.ts',
  'src/lib/luxuryEditorial.ts',
  'src/lib/prismChroma.ts',
  'src/lib/shringaarRoyal.ts',
  'src/lib/vogueNoir.ts',
];

/** [regex, why it is a problem] */
const BANNED = [
  [/Bespoke Fades/i, 'use plain wording for cuts ("neat fades")'],
  [/Handcrafted Beard Sculpting/i, 'say "beard styling" instead'],
  [/Vintage Heritage Shaves/i, 'say "classic hot-towel shaves" instead'],
  [/High-Contrast Monochrome/i, 'describe the tattoo work in client language'],
  [/Surgical Piercings/i, 'say "clean, sterile piercings" instead'],
  [/Sabyasachi Aesthetic/i, 'avoid brand-name aesthetic framing in the tagline'],
  [/Royal Rajputana Trousseaus/i, 'say "Rajputana bridal trousseaus" instead'],
  [/Where Every Bride Becomes Royalty/, 'sentence case, plainer line'],
  [/Luxury Makeup, Made For Every Indian Bride/, 'sentence case, plainer line'],
  [/Your Hair, Every Colour of Light/, 'sentence case, plainer line'],
  [/premium makeup studio and academy/i, 'drop "premium", be plain'],
  [/beauty secrets/i, 'say "beauty care" instead'],
  [/Victorian barbershops/i, 'describe the shop, not the era'],
  [/one-size-fits-all/i, 'avoid jargon in the brand story'],
  [/designed exclusively around precision scissor work/i, 'plain client language'],
];

let failures = 0;
for (const file of FILES) {
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    console.error(`  ✗ cannot read ${file}`);
    failures += 1;
    continue;
  }
  for (const [pattern, why] of BANNED) {
    if (pattern.test(source)) {
      console.error(`  ✗ ${file}: matched ${pattern} — ${why}`);
      failures += 1;
    }
  }
}

if (failures > 0) {
  console.error(`\nCopy tone check failed with ${failures} issue(s).`);
  process.exit(1);
}
console.log(`Copy tone check passed across ${FILES.length} template copy files.`);
