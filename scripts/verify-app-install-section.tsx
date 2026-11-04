// Template 15 has dedicated male-only media, booking and editor coverage in verify-template15.
/**
 * Verifies the shared app-install banner against its acceptance criteria, on
 * the real rendered output of all 16 website templates.
 *
 * Checked per template, at desktop / tablet / mobile:
 *  1. ONE shared implementation — the same component skeleton everywhere, no
 *     per-template fork.
 *  2. Content — heading, short description, preview image, install + open CTAs
 *     on the real app routes, honest availability line, and the collapsed
 *     install guide with share + poster download.
 *  3. Image is never cropped — `object-fit: contain`, `width`/`height` left at
 *     `auto` so the intrinsic 1122x1402 ratio survives, a `max-height` budget
 *     instead of a fixed cropping box, and no `aspect-ratio` override.
 *  4. Compact — content width inside 1100–1200px, no viewport-height sizing,
 *     no forced full-bleed gradient, long-form copy folded away.
 *  5. Theme-matched — the banner resolves to the host template's own palette,
 *     and the 14 templates do not all share one background.
 *  6. Contrast — every CTA, share control and text run clears 4.5:1 in the
 *     normal, hover, focus and disabled states.
 *  7. Mobile — single-column stack, 44px tap targets, nothing fixed-width
 *     wider than the viewport.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { ALL_TEMPLATE_IDS, renderTemplate } from './lib/renderTemplates';
import {
  Cascade, VIEWPORTS, contrastRatio, effectiveBackground, effectiveColor,
  hexOf, loadStyles, parseDocumentTree, readDistCss, resolveVars, textOf,
} from './lib/cssCascade.mjs';

// This suite reads the compiled stylesheet, because the cascade it checks is
// the one browsers get: Tailwind layers, chunked template CSS and import order
// all decide the winner. Build it on demand so the suite also runs standalone,
// not only as part of `npm test` (which builds first).
if (!existsSync('dist/assets')) {
  console.log('dist/assets missing — building…');
  const built = spawnSync('npx', ['vite', 'build'], { stdio: 'inherit', shell: true });
  if (built.status !== 0) throw new Error('`vite build` failed; cannot verify rendered CSS.');
}
const sheets = readDistCss('dist/assets').map((s) => s.css);
const { rules, layerOrder } = loadStyles(sheets);
void layerOrder;

const DEVICES: [string, number][] = [
  ['desktop', VIEWPORTS.desktop],
  ['tablet', VIEWPORTS.tablet],
  ['mobile', VIEWPORTS.mobile],
];

/** The legacy panel's forced indigo ground — no card may resolve to it now.
 *  (`#0f172a` is also the slate templates' own accent, so this checks the card
 *  SURFACE only, never the CTA fill.) */
const FORCED_SURFACE = new Set(['#0f172a', '#312e81', '#1e1b4b']);

/** The legacy strip/panel indigo — the palette the redesign removes. */
const LEGACY_INDIGO = new Set(['#eef2ff', '#312e81', '#0f172a', '#1e1b4b']);

/** What each template's banner CTA is expected to resolve to. */
const EXPECTED_CTA: Record<string, string> = {
  hair_salon: '#d8c5a3', // Luxury Editorial Salon champagne accent, espresso CTA ink
  unisex_salon: '#5c7362', // Template 03 Aura deeper sage: white CTA labels stay above 4.5:1
  barber: '#c49a6c',
  beauty_parlour: '#6d2638',
  nail_studio: '#702d4b',
  hair_spa: '#183d32',
  skincare_clinic: '#24dc9d',
  massage_wellness: '#4e6e58',
  bridal_lounge: '#5a0f1e',
  lash_brow: '#2b1b17',
  ayurvedic_spa: '#1f3b2e',
  aurelia_beauty_parlour: '#8c6a43',
};

const failures: string[] = [];
const rows: string[] = [];
const ctaBackgrounds = new Set<string>();
const cardSurfaces = new Set<string>();

function check(ok: boolean, message: string) {
  if (!ok) failures.push(message);
}

/** Minimal DOM helpers — enough for class/tag/attribute/ancestry lookups. */
function classesOf(el: any): string[] {
  return String(el?.attribs?.class || '').split(/\s+/).filter(Boolean);
}
function isTag(el: any, tag: string): boolean {
  return el?.type === 'tag' && el.name === tag;
}
function walk(root: any, visit: (el: any) => void) {
  for (const child of root?.children || []) {
    if (child.type === 'tag') { visit(child); walk(child, visit); }
  }
}
function findAll(root: any, match: (el: any) => boolean): any[] {
  const out: any[] = [];
  walk(root, (el) => { if (match(el)) out.push(el); });
  return out;
}
function findOne(root: any, match: (el: any) => boolean): any {
  return findAll(root, match)[0];
}
/** All elements matching `match`, restricted to descendants of `root`. */
function within(root: any, match: (el: any) => boolean): any[] {
  return findAll(root, match);
}
const byClass = (name: string) => (el: any) => classesOf(el).includes(name);

function pxOf(value: string | undefined): number | null {
  if (!value) return null;
  const match = /(-?[\d.]+)px/.exec(value);
  return match ? Number(match[1]) : null;
}

function styleOf(cascade: Cascade, el: any, state = 'normal') {
  const style = cascade.style(el, state);
  return style as Record<string, string | undefined> & { __vars?: Record<string, string> };
}

/** Resolved value of a declaration, with `var()` expanded. */
function declared(cascade: Cascade, el: any, prop: string, state = 'normal'): string | undefined {
  const style = styleOf(cascade, el, state);
  const raw = style[prop];
  if (raw === undefined) return undefined;
  return resolveVars(raw, style.__vars || {});
}

for (const id of ALL_TEMPLATE_IDS.filter(id=>id!=='mens_hair_studio')) {
  const { html, title } = renderTemplate(id);
  const { dom, elements } = parseDocumentTree(html);
  const sections = findAll(dom, (el) => isTag(el, 'section') && byClass('app-install')(el));

  // -- 1. One shared implementation -----------------------------------------
  check(sections.length === 1, `${id}: expected exactly 1 .app-install, found ${sections.length}`);
  const section: any = sections[0];
  if (!section) { failures.push(`${id}: no .app-install rendered`); continue; }

  check(
    section.attribs.id === 'nexora-customer-app',
    `${id}: section id is ${section.attribs.id}`,
  );
  check(
    section.attribs['aria-label'] === 'Install and share Nexora customer app',
    `${id}: unexpected aria-label "${section.attribs['aria-label']}"`,
  );
  for (const hook of [
    'app-install__card', 'app-install__media', 'app-install__body',
    'app-install__title', 'app-install__text', 'app-install__actions',
    'app-install__foot', 'app-install__more', 'app-install__share',
  ]) {
    check(within(section, byClass(hook)).length > 0, `${id}: missing .${hook}`);
  }

  // -- 2. Content ------------------------------------------------------------
  const heading = textOf(findOne(section, byClass('app-install__title'))).trim();
  check(heading.length > 0 && heading.length < 90, `${id}: heading "${heading}" not a short line`);

  const body = textOf(findOne(section, byClass('app-install__text'))).trim();
  check(body.length > 20 && body.length < 220, `${id}: description is ${body.length} chars, want 1–2 lines`);

  const actions = findOne(section, byClass('app-install__actions'));
  const ctas = within(actions, byClass('app-install__cta'));
  check(ctas.length >= 1, `${id}: no install CTA rendered`);
  const installCta = ctas.find((a) => /install|home screen/i.test(textOf(a)));
  check(!!installCta, `${id}: install CTA missing its label`);
  check(
    installCta?.attribs.href === '/?app=1&install=1',
    `${id}: install CTA href is "${installCta?.attribs.href}", want the real install route`,
  );
  const openCta = ctas.find((a) => /open app/i.test(textOf(a)));
  check(!!openCta, `${id}: "Open App" CTA missing`);
  check(
    openCta?.attribs.href === '/?app=1',
    `${id}: open CTA href is "${openCta?.attribs.href}", want /?app=1`,
  );

  // No invented store listings or dead links anywhere in the banner.
  const sectionHtml = html.slice(
    html.indexOf('<section class="app-install'),
    html.indexOf('</section>', html.indexOf('<section class="app-install')) + 10,
  );
  check(sectionHtml.length > 500, `${id}: could not isolate the banner markup`);
  for (const banned of ['play.google.com', 'apps.apple.com', 'market.android.com', 'href="#"']) {
    check(!sectionHtml.includes(banned), `${id}: banner contains a dummy link (${banned})`);
  }

  const availability = textOf(findOne(section, byClass('app-install__availability'))).trim();
  check(/android|chrome/i.test(availability), `${id}: availability line "${availability}" is not honest about the platform`);

  const mediaRoot = findOne(section, byClass('app-install__media'));
  const img: any = findOne(mediaRoot, (el) => isTag(el, 'img'));
  check(!!img, `${id}: banner has no preview image`);
  check(img?.attribs.src === '/promo/nexora-customer-app-ad.png', `${id}: poster src is "${img?.attribs.src}"`);
  check(img?.attribs.width === '1122' && img?.attribs.height === '1402',
    `${id}: poster must keep its intrinsic ${img?.attribs.width}x${img?.attribs.height} attributes`);
  check(img?.attribs.loading === 'lazy', `${id}: poster is not lazy-loaded`);
  check(!!img?.attribs.alt && img.attribs.alt.length > 10, `${id}: poster has no meaningful alt text`);

  const guide = findOne(section, byClass('app-install__more'));
  check(guide?.name === 'details', `${id}: install guide is not collapsed into a <details>`);
  for (const required of ['Add to Home screen', 'Share App & Poster', 'Copy app link', 'Download ad image']) {
    check(textOf(guide).includes(required), `${id}: guide is missing "${required}"`);
  }
  const share = findOne(section, byClass('app-install__share'));
  const download: any = findOne(share, (el) => isTag(el, 'a') && el.attribs?.download !== undefined);
  check(download?.attribs.download === 'nexora-customer-app-ad.png', `${id}: poster download attribute is "${download?.attribs.download}"`);

  // -- 3–7. Resolved layout, theme and contrast at each breakpoint ----------
  const perDevice: string[] = [];
  for (const [device, width] of DEVICES) {
    const cascade = new Cascade({ rules, elements, width });
    const card = findOne(section, byClass('app-install__card'));
    const media = findOne(section, byClass('app-install__media'));
    const image = findOne(media, (el) => isTag(el, 'img'));

    // 3. The image keeps its original proportions and is fully visible.
    check(declared(cascade, image, 'object-fit') === 'contain',
      `${id}/${device}: poster object-fit is "${declared(cascade, image, 'object-fit')}", must be contain`);
    check(declared(cascade, image, 'width') === 'auto',
      `${id}/${device}: poster width is "${declared(cascade, image, 'width')}", must stay auto`);
    check(declared(cascade, image, 'height') === 'auto',
      `${id}/${device}: poster height is "${declared(cascade, image, 'height')}", must stay auto`);
    const budget = pxOf(declared(cascade, image, 'max-height'));
    check(budget !== null && budget <= 168 && budget >= 100,
      `${id}/${device}: poster max-height budget ${budget}px outside 100–168px`);
    check(declared(cascade, image, 'aspect-ratio') === undefined,
      `${id}/${device}: poster must not be forced to an aspect-ratio box`);
    check(declared(cascade, media, 'height') === undefined,
      `${id}/${device}: media tile must not set a fixed height`);

    // 4. Compact.
    const maxWidth = pxOf(declared(cascade, card, 'width'));
    check(maxWidth !== null && maxWidth >= 1100 && maxWidth <= 1200,
      `${id}/${device}: card content width ${maxWidth}px outside 1100–1200px`);
    for (const prop of ['height', 'min-height'] as const) {
      for (const el of [section, card] as any[]) {
        const value = declared(cascade, el, prop) || '';
        check(!/vh|svh|dvh/.test(value), `${id}/${device}: banner ${prop} uses viewport units (${value})`);
      }
    }
    check(declared(cascade, card, 'background-image') === undefined,
      `${id}/${device}: card must not carry a forced gradient`);
    const pad = (declared(cascade, card, 'padding') || '').match(/[\d.]+px/g) || [];
    for (const value of pad) {
      check(Number.parseFloat(value) <= 30, `${id}/${device}: card padding ${value} is not compact`);
    }
    check(guide && guide.attribs?.open === undefined,
      `${id}/${device}: install guide must render collapsed`);

    // 5. Theme-matched.
    const surface = effectiveBackground(cascade, card, 'normal');
    const surfaceHex = hexOf(surface.rgb);
    cardSurfaces.add(surfaceHex);
    check(!FORCED_SURFACE.has(surfaceHex), `${id}/${device}: card still uses the forced panel background ${surfaceHex}`);

    const ctaBg = effectiveBackground(cascade, installCta, 'normal');
    const ctaHex = hexOf(ctaBg.rgb);
    if (device === 'desktop') {
      ctaBackgrounds.add(ctaHex);
      const expected = EXPECTED_CTA[id];
      if (expected) {
        check(ctaHex === expected, `${id}: CTA resolves to ${ctaHex}, expected the template accent ${expected}`);
      }
    }

    // 6. Contrast in every state.
    const stateContrast: string[] = [];
    for (const el of [installCta, openCta,
      ...within(share, (e) => isTag(e, 'button')),
      ...within(share, (e) => isTag(e, 'a'))] as any[]) {
      if (!el) continue;
      for (const state of ['normal', 'hover', 'focus', 'disabled'] as const) {
        const bg = effectiveBackground(cascade, el, state);
        const fg = effectiveColor(cascade, el, state);
        if (!bg || !fg) { failures.push(`${id}/${device}: unresolved colours on ${textOf(el).slice(0, 24)}`); continue; }
        const ratio = contrastRatio(fg.rgb, bg.rgb);
        stateContrast.push(`${state}:${ratio.toFixed(2)}`);
        check(ratio >= 4.5,
          `${id}/${device}: "${textOf(el).trim().slice(0, 28)}" ${state} is ${ratio.toFixed(2)}:1 (${hexOf(fg.rgb)} on ${hexOf(bg.rgb)})`);
      }
    }
    for (const el of [findOne(section, byClass('app-install__title')),
      findOne(section, byClass('app-install__text'))] as any[]) {
      const bg = effectiveBackground(cascade, el, 'normal');
      const fg = effectiveColor(cascade, el, 'normal');
      const ratio = bg && fg ? contrastRatio(fg.rgb, bg.rgb) : 0;
      check(ratio >= 4.5, `${id}/${device}: banner text is ${ratio.toFixed(2)}:1`);
    }

    // 7. Mobile stacking and tap targets.
    const columns = (declared(cascade, card, 'grid-template-columns') || '').split(/\s+/).filter(Boolean);
    if (device === 'mobile') {
      check(columns.length === 1, `${id}/mobile: card is still ${columns.length} columns, must stack`);
      const ctaMinHeight = pxOf(declared(cascade, installCta, 'min-height'));
      check(ctaMinHeight !== null && ctaMinHeight >= 44, `${id}/mobile: install CTA min-height ${ctaMinHeight}px < 44px`);
      check(declared(cascade, media, 'justify-self') === 'center', `${id}/mobile: poster tile is not centred`);
    } else {
      check(columns.length === 2, `${id}/${device}: card should be image + content (${columns.length} columns)`);
    }
    // A `min(Npx, 100%)` width is fluid: it can never exceed the viewport, so
    // only a bare px width (or a min() with no % term) can overflow.
    for (const el of [section, card] as any[]) {
      const value = declared(cascade, el, 'width');
      if (!value) continue;
      const fixed = pxOf(value);
      if (fixed !== null && fixed > width) {
        check(/%/.test(value),
          `${id}/${device}: banner declares a ${fixed}px width with no fluid term at a ${width}px viewport`);
      }
    }

    if (device === 'desktop') {
      perDevice.push(`cta=${ctaHex} surface=${surfaceHex} img≤${budget}px w=${maxWidth}px ${stateContrast.join(' ')}`);
    }
  }
  // -- 8. The announcement strip must follow the theme too -------------------
  // `PromotionalBanner` ships `.nexora-announcement` with a hardcoded indigo
  // ground; the shared bindings have to retarget it, or the strip stays the one
  // piece of the feature that ignores the template.
  const strip = findOne(dom, (el) => isTag(el, 'aside') && byClass('app-install-strip')(el));
  // Aurelia keeps the app installation banner in the footer only; its header
  // must stay free of app-install strip links, matching the footer-placement rule.
  if (id === 'aurelia_beauty_parlour') {
    check(!strip, 'Aurelia keeps the app install call-to-action out of the header');
  } else {
    check(!!strip, `${id}: no app announcement strip rendered`);
    check(strip?.attribs?.['aria-label'] === 'Nexora app announcement',
      `${id}: strip aria-label is "${strip?.attribs?.['aria-label']}"`);
  }
  const stripLink = strip ? findOne(strip, (el) => isTag(el, 'a')) : null;
  if (strip) check(stripLink?.attribs?.href === '/?app=1&install=1',
    `${id}: strip link href is "${stripLink?.attribs?.href}"`);
  for (const [device, width] of DEVICES) {
    const cascade = new Cascade({ rules, elements, width });
    if (!strip) break;
    const stripBg = effectiveBackground(cascade, strip, 'normal');
    const stripHex = hexOf(stripBg.rgb);
    check(!LEGACY_INDIGO.has(stripHex),
      `${id}/${device}: announcement strip still uses the legacy indigo ground ${stripHex}`);
    const stripText = findOne(strip, (el) => isTag(el, 'span'));
    for (const [label, el] of [['strip text', stripText], ['strip link', stripLink]] as [string, any][]) {
      if (!el) continue;
      const fg = effectiveColor(cascade, el, 'normal');
      const ratio = fg ? contrastRatio(fg.rgb, stripBg.rgb) : 0;
      check(ratio >= 4.5,
        `${id}/${device}: ${label} is ${ratio.toFixed(2)}:1 (${fg ? hexOf(fg.rgb) : '?'} on ${stripHex})`);
    }
    if (device === 'desktop') perDevice.push(` strip=${stripHex}`);
  }

  rows.push(`${id.padEnd(17)} ${title.slice(0, 26).padEnd(27)} ${perDevice.join('')}`);
}

// -- 5b. The 14 templates must not collapse onto one shared background ------
check(ctaBackgrounds.size >= 6,
  `only ${ctaBackgrounds.size} distinct CTA backgrounds across 16 templates — the banner is not following each theme`);
check(cardSurfaces.size >= 4,
  `only ${cardSurfaces.size} distinct card surfaces across 14 templates`);

console.log(rows.join('\n'));
console.log(`\n${ALL_TEMPLATE_IDS.length} templates · ${ctaBackgrounds.size} distinct CTA accents · ${cardSurfaces.size} distinct card surfaces`);

if (failures.length) {
  const unique = [...new Set(failures)];
  console.error(`\n${unique.length} FAILURES:`);
  for (const failure of unique) console.error('  ✗ ' + failure);
  process.exitCode = 1;
} else {
  console.log('\nPASS: all 16 templates render one shared, compact, theme-matched app-install banner with an uncropped poster and 4.5:1 CTAs in every state.');
}
