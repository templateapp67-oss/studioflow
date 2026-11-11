import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { build } from 'esbuild';

/**
 * NEXORA Growth Partner Rewards page (release gate).
 *
 * This page once shipped unreadable. Its markup used utility classes that the
 * public stylesheet never generates — `src/index.css` only scans the files it
 * lists — so the hero printed white text on a white page, the layout collapsed
 * and no check noticed, because every existing suite read the copy and none
 * read the styling.
 *
 * The suite reads the emitted document and the stylesheet it links, not the
 * source, and fails when
 *   1. a class in the prerendered document has no rule in that stylesheet;
 *   2. the reward journey stops matching the programme content: every
 *      milestone, in order, with its target, reward and reward image;
 *   3. a reward image the document refers to is missing from the build, or a
 *      reward image has no text alternative;
 *   4. a text colour of the page palette drops below WCAG AA on a surface it
 *      is used on;
 *   5. a programme disclaimer is no longer rendered.
 */

const ROUTE = '/growth-partner-rewards';
const DOCUMENT = `dist${ROUTE}/index.html`;
const STYLESHEET_SOURCE = 'src/components/nexora-landing/growth-rewards/growthRewards.css';

/** Bundles TypeScript modules to a self-contained ESM data URL. */
async function loadModule(contents) {
  const result = await build({
    stdin: { contents, resolveDir: process.cwd(), loader: 'ts' },
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    write: false,
    logLevel: 'silent',
  });
  const source = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

const {
  REWARD_MILESTONES,
  REWARD_TARGET_UNIT,
  REWARD_IMAGE_BASE,
  REWARD_JOURNEY_NOTE,
  RECOGNITION_NOTE,
  VERIFICATION_NOTE,
  REWARDS_JOURNEY_ID,
  contrastRatio,
  WCAG_AA_NORMAL_TEXT,
} = await loadModule([
  "export * from './src/components/nexora-landing/growth-rewards/content.ts';",
  "export { contrastRatio, WCAG_AA_NORMAL_TEXT } from './src/lib/wcagContrast.ts';",
].join('\n'));

assert.ok(existsSync(DOCUMENT), `${DOCUMENT} is missing: run \`npm run build\` before this suite`);
const html = readFileSync(DOCUMENT, 'utf8');
const page = html.slice(html.indexOf('<div id="root">'));

/** Escapes text the way React writes it into the prerendered document. */
const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;',
  })[character]);

/* 1. Every class in the document is styled by the stylesheet the document links. */
const stylesheetHref = html.match(/<link rel="stylesheet"[^>]*href="([^"]+)"/)?.[1];
assert.ok(stylesheetHref, 'The rewards document links a stylesheet');
const css = readFileSync(`dist${stylesheetHref}`, 'utf8');
const escapeClass = (name) => name.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* The selector must end where the name ends: `.ngr-card__title` is not a rule for `ngr-card`. */
const hasRule = (name) => new RegExp(`\\.${escapeRegExp(escapeClass(name))}(?![\\w-])`).test(css);
const classes = new Set();
for (const match of page.matchAll(/\sclass="([^"]*)"/g)) {
  for (const name of match[1].split(/\s+/)) if (name) classes.add(name.replace(/&amp;/g, '&'));
}
assert.ok(classes.has('ngr-page'), 'The document is the Growth Partner Rewards page');
/* lucide-react labels its icons with classes of its own; the page never styles them. */
const unstyled = [...classes].filter((name) => !name.startsWith('lucide') && !hasRule(name));
assert.deepEqual(
  unstyled,
  [],
  `Every class on the rewards page has a rule in ${stylesheetHref}. A class without one is how the page lost its colours and layout.`,
);

/* 2. The journey lists every milestone in order, with its target, reward and image. */
const steps = page.split('<li class="ngr-step').slice(1);
assert.equal(steps.length, REWARD_MILESTONES.length, 'One journey step is rendered per programme milestone');
assert.equal(REWARD_MILESTONES.length, 7, 'The programme has seven milestones');
const imageUrl = (slug, width) => `${REWARD_IMAGE_BASE}/${slug}-${width}.webp`;
REWARD_MILESTONES.forEach((milestone, index) => {
  const step = steps[index];
  const label = `Milestone ${milestone.step} (${milestone.target})`;
  assert.ok(step.includes(`>${index + 1}</span>`), `${label} is numbered ${index + 1} on the journey line`);
  assert.ok(step.includes(`>${escapeHtml(milestone.target)}</span>`), `${label} shows its eligible-shop target`);
  assert.ok(step.includes(`>${escapeHtml(REWARD_TARGET_UNIT)}</span>`), `${label} names the unit of its target`);
  assert.ok(step.includes(`>${escapeHtml(milestone.reward)}</h3>`), `${label} is titled with its reward`);
  assert.ok(step.includes(escapeHtml(milestone.description)), `${label} keeps its description`);
  assert.ok(milestone.visuals.length >= 1, `${label} has a reward image`);
  for (const visual of milestone.visuals) {
    assert.ok(step.includes(`src="${imageUrl(visual.slug, 720)}"`), `${label} shows ${visual.slug}`);
    assert.ok(visual.alt.trim().length > 10, `${visual.slug} has a descriptive text alternative`);
    assert.ok(step.includes(`alt="${escapeHtml(visual.alt)}"`), `${visual.slug} carries its text alternative`);
  }
  assert.equal(
    (step.match(/<img /g) || []).length,
    milestone.visuals.length,
    `${label} shows exactly its own ${milestone.visuals.length === 1 ? 'image' : 'images'}`,
  );
});
/* The pairing of target, reward and image is stated here a second time on purpose:
   it is the programme, and a swapped image must not pass as a content edit. */
assert.deepEqual(
  REWARD_MILESTONES.map((milestone) => [milestone.target, milestone.reward, ...milestone.visuals.map((visual) => visual.slug)]),
  [
    ['25', 'NEXORA Branded T-shirt', 'reward-tshirt'],
    ['50', 'Samsung Tablet', 'reward-tablet'],
    ['100', 'Branded HP Laptop', 'reward-laptop'],
    ['250', 'Premium Electric Scooter', 'reward-scooter'],
    ['500', 'Latest iPhone', 'reward-iphone'],
    ['750', 'Royal Enfield 350cc Motorcycle', 'reward-motorcycle'],
    ['1000+', 'SUV Car + District Partner Recognition', 'reward-suv', 'reward-district-partner'],
  ],
  'Each milestone target carries its own reward and its own reward image',
);
assert.ok(page.includes(`id="${REWARDS_JOURNEY_ID}"`), 'The journey section is the target of the hero link');
assert.ok(page.includes(`href="#${REWARDS_JOURNEY_ID}"`), 'The hero links to the journey section');

/* 3. Every reward image the document refers to exists in the build. */
const imageFiles = new Set();
for (const match of page.matchAll(/(?:src|srcSet|srcset)="([^"]+)"/g)) {
  for (const candidate of match[1].split(',')) {
    const url = candidate.trim().split(/\s+/)[0];
    if (url.startsWith(`${REWARD_IMAGE_BASE}/`)) imageFiles.add(url);
  }
}
assert.ok(imageFiles.size >= 8 * 3, 'The document refers to the responsive variants of every reward image');
for (const url of imageFiles) assert.ok(existsSync(`dist${url}`), `${url} is part of the build`);
assert.ok(!/<img (?![^>]*\salt=)/.test(page), 'Every image declares a text alternative, empty only when decorative');

/* 4. The palette keeps WCAG AA contrast on every surface a text colour is used on. */
const source = readFileSync(STYLESHEET_SOURCE, 'utf8');
const token = (name) => {
  const value = source.match(new RegExp(`--ngr-${name}:\\s*(#[0-9a-fA-F]{6})\\b`))?.[1];
  assert.ok(value, `--ngr-${name} is a hex colour in ${STYLESHEET_SOURCE}`);
  return value;
};
const lightSurfaces = ['surface', 'white', 'cream', 'studio'];
const darkSurfaces = ['navy', 'charcoal'];
const pairs = [
  ...['ink', 'slate', 'gold-ink'].flatMap((text) => lightSurfaces.map((surface) => [text, surface])),
  ...['on-navy', 'on-navy-soft', 'gold-soft', 'gold-pale'].flatMap((text) => darkSurfaces.map((surface) => [text, surface])),
];
for (const [text, surface] of pairs) {
  const ratio = contrastRatio(token(text), token(surface));
  assert.ok(
    ratio > WCAG_AA_NORMAL_TEXT,
    `--ngr-${text} on --ngr-${surface} is ${ratio.toFixed(2)}:1 and must exceed ${WCAG_AA_NORMAL_TEXT}:1`,
  );
}
/* Gold buttons, badges and journey nodes carry navy text across the whole gold gradient. */
const goldFill = source.match(/--ngr-gold-fill:\s*linear-gradient\(([^;]+)\);/)?.[1];
const goldStops = goldFill?.match(/#[0-9a-fA-F]{6}/g) ?? [];
assert.ok(goldStops.length >= 2, '--ngr-gold-fill is a gradient of hex colours');
for (const stop of [...goldStops, token('gold')]) {
  const ratio = contrastRatio(token('navy'), stop);
  assert.ok(ratio > WCAG_AA_NORMAL_TEXT, `Navy text on gold ${stop} is ${ratio.toFixed(2)}:1 and must exceed ${WCAG_AA_NORMAL_TEXT}:1`);
}
/* Plain gold is decoration only: on white it is below the ratio text needs. */
assert.ok(
  contrastRatio(token('gold'), token('white')) < WCAG_AA_NORMAL_TEXT,
  'Brand gold is too light for text on white; gold-toned text uses --ngr-gold-ink',
);
assert.ok(
  !/(?<!-)color:\s*var\(--ngr-gold\)/.test(source.replace(/\.ngr-image--missing\s*\{[^}]*\}/, '')),
  'No text is coloured with plain brand gold; use --ngr-gold-ink on light surfaces and --ngr-gold-soft on navy',
);

/* 5. The programme disclaimers stay on the page. */
for (const [name, note] of Object.entries({ REWARD_JOURNEY_NOTE, RECOGNITION_NOTE, VERIFICATION_NOTE })) {
  assert.ok(note.length > 40, `${name} is defined`);
  assert.ok(page.includes(escapeHtml(note)), `${name} is rendered on the page`);
}
assert.equal((page.match(/<h1\b/g) || []).length, 1, 'The page has one top-level heading');

console.log(
  `PASS: Growth Partner Rewards page — ${classes.size} classes styled, ${REWARD_MILESTONES.length} milestones matched to `
  + `their targets and images, ${imageFiles.size} image files present, ${pairs.length + goldStops.length + 1} colour pairs at WCAG AA, `
  + 'disclaimers rendered.',
);
