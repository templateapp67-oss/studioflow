/**
 * Offline colour-contrast regression suite for the public marketing surface.
 *
 * Rebuilds the exact class of defect BrowserStack reported on
 * https://studioflow-ashen-pi.vercel.app/ (86 × `color-contrast`, WCAG SC 1.4.3):
 *
 *   1. Confirmed failures — a text/background pair below 4.5:1.
 *   2. Indeterminate results — axe-core cannot measure text sitting on a
 *      gradient, a photo, or a translucent chip over one, so it files the
 *      element under "Needs review" instead of passing it.
 *
 * Rather than trusting a hand-written list of pairs, this renders the real
 * components, walks every text-bearing element, resolves its background the
 * way axe-core does (walk up until the first opaque background; bail out on a
 * gradient or an image), and asserts the contrast of the flattened result.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseDocument } from 'htmlparser2';
import { findAll, getAttributeValue, getName, getParent } from 'domutils';
import type { AnyNode, Element } from 'domhandler';
import { PublicHomepage } from '../src/components/PublicHomepage';
import { NexoraTemplateLibrary } from '../src/components/nexora/NexoraTemplateLibrary';
import { NexoraTemplateGallery } from '../src/components/nexora/NexoraTemplateGallery';
import { NEXORA_PUBLIC_TEMPLATES } from '../src/lib/nexoraPublicTemplates';
import {
  NEXORA_CATEGORIES,
  nexoraCategoryFilters,
  sortTemplatesByPriority,
} from '../src/lib/nexoraTemplateCatalogue';
import {
  WCAG_AA_NORMAL_TEXT,
  compositeOver,
  contrastRatio,
  parseColor,
  toHex,
  type RgbaColor,
} from '../src/lib/wcagContrast';

/* ------------------------------------------------------------------ *
 * 1. Design tokens: every category identity colour must carry text.
 * ------------------------------------------------------------------ */

/** Headroom above the 4.5:1 cliff so a future tint tweak cannot silently fail. */
const TOKEN_MARGIN = 4.6;
const tokenFailures: string[] = [];
const checkToken = (label: string, foreground: string, background: string, minimum = TOKEN_MARGIN) => {
  const ratio = contrastRatio(foreground, background);
  if (!(ratio > minimum)) {
    tokenFailures.push(`${label}: ${foreground} on ${background} = ${ratio.toFixed(3)} (needs > ${minimum})`);
  }
  return ratio;
};

for (const category of NEXORA_CATEGORIES) {
  // Card category badge + CategoryIconTile: the identity colour on its own tint.
  checkToken(`${category.categoryId} badge`, category.color, category.tint);
  // Card overlay pill, template-number badge and the selected filter button.
  checkToken(`${category.categoryId} reversed`, category.onColor, category.color);
}

const templates = sortTemplatesByPriority(NEXORA_PUBLIC_TEMPLATES);
for (const filter of nexoraCategoryFilters(templates)) {
  checkToken(`filter ${filter.id} badge`, filter.color, filter.tint);
  checkToken(`filter ${filter.id} reversed`, filter.onColor, filter.color);
}

// The reported regression: #8A7F98 measured 3.77:1 on white.
checkToken('muted label on white', '#6B5E7A', '#FFFFFF');
assert.ok(contrastRatio('#8A7F98', '#FFFFFF') < WCAG_AA_NORMAL_TEXT, 'the original failing token really was below AA');
assert.ok(!readFileSync('src/components/nexora/NexoraTemplateLibrary.tsx', 'utf8').includes('#8A7F98'), 'the 3.77:1 label token must not come back');
assert.ok(!readFileSync('src/components/nexora/NexoraBrand.tsx', 'utf8').includes('bg-gradient'), 'the NEXORA mark must stay on a solid, measurable background');
checkToken('brand mark', '#F5E9D6', '#3E2A63');

assert.deepEqual(tokenFailures, [], `category/brand colour tokens below AA:\n${tokenFailures.join('\n')}`);

/* ------------------------------------------------------------------ *
 * 2. Rendered surface: resolve each text element's real background.
 * ------------------------------------------------------------------ */

/** Tailwind theme tokens used by the public surface (src/index.css @theme). */
const THEME: Record<string, string> = {
  surface: '#f9f9ff',
  'on-surface': '#151c27',
  primary: '#b0004a',
  'on-primary': '#ffffff',
  'primary-container': '#d81b60',
  'emerald-50': '#ecfdf5',
  'emerald-700': '#15803d',
};

const IMAGE_TAGS = new Set(['img', 'picture', 'video', 'canvas', 'object', 'iframe']);
const SKIP_TAGS = new Set(['script', 'style', 'head', 'title', 'svg', 'path']);
const WHITE: RgbaColor = { r: 255, g: 255, b: 255, a: 1 };

const classesOf = (element: Element): string[] =>
  (getAttributeValue(element, 'class') || '').split(/\s+/).filter(Boolean);

/** Only unprefixed utilities apply at rest — hover:/focus:/sm: are not the base paint. */
const baseClasses = (element: Element): string[] => classesOf(element).filter((name) => !name.includes(':'));

const inlineStyles = (element: Element): Record<string, string> => {
  const style = getAttributeValue(element, 'style') || '';
  const declarations: Record<string, string> = {};
  for (const part of style.split(';')) {
    const index = part.indexOf(':');
    if (index === -1) continue;
    declarations[part.slice(0, index).trim().toLowerCase()] = part.slice(index + 1).trim();
  }
  return declarations;
};

/** Resolves `bg-white`, `bg-white/92`, `bg-[#FBF8F2]/65`, `bg-surface`, … */
const utilityColor = (token: string): RgbaColor | null => {
  const match = token.match(/^(?:bg|text)-(.+?)(?:\/(\d{1,3}))?$/);
  if (!match) return null;
  let value = match[1];
  if (value.startsWith('[') && value.endsWith(']')) value = value.slice(1, -1);
  else if (value in THEME) value = THEME[value];
  const color = parseColor(value);
  if (!color) return null;
  if (match[2] !== undefined) color.a = Number(match[2]) / 100;
  return color;
};

const hasGradient = (element: Element): boolean => {
  const style = inlineStyles(element);
  if (/gradient/.test(style['background-image'] || '')) return true;
  return baseClasses(element).some((name) => name.startsWith('bg-gradient') || name.startsWith('bg-linear'));
};

const ownBackground = (element: Element): RgbaColor | null => {
  const inline = inlineStyles(element)['background-color'];
  if (inline) {
    const parsed = parseColor(inline);
    if (parsed) return parsed;
  }
  let resolved: RgbaColor | null = null;
  for (const name of baseClasses(element)) {
    if (!name.startsWith('bg-')) continue;
    const color = utilityColor(name);
    if (color) resolved = color;
  }
  return resolved;
};

const ownColor = (element: Element): RgbaColor | null => {
  const inline = inlineStyles(element).color;
  if (inline) {
    const parsed = parseColor(inline);
    if (parsed) return parsed;
  }
  let resolved: RgbaColor | null = null;
  for (const name of baseClasses(element)) {
    if (!name.startsWith('text-')) continue;
    const color = utilityColor(name);
    if (color) resolved = color;
  }
  return resolved;
};

const elementChildren = (element: Element): Element[] =>
  element.children.filter((child): child is Element => 'name' in child && getName(child as Element) !== undefined);

/**
 * A photo or a gradient overlay painted inside a container sits *above* that
 * container's own background, so reaching the container without an opaque
 * background already in hand means the text cannot be measured.
 */
const paintsMedia = (element: Element): boolean =>
  elementChildren(element).some((child) => IMAGE_TAGS.has(getName(child)) || hasGradient(child));

type Background = { color: RgbaColor } | { blocked: string };

const resolveBackground = (start: Element): Background => {
  const layers: RgbaColor[] = [];
  let current: Element | null = start;
  let base: RgbaColor | null = null;
  while (current) {
    const tag = getName(current);
    if (IMAGE_TAGS.has(tag)) return { blocked: `image node <${tag}>` };
    if (hasGradient(current)) return { blocked: 'background gradient' };
    if (paintsMedia(current)) return { blocked: 'photo/gradient painted inside the container' };
    const background = ownBackground(current);
    if (background && background.a > 0) {
      layers.push(background);
      if (background.a === 1) {
        base = background;
        break;
      }
    }
    const parent: AnyNode | null = getParent(current);
    current = parent && 'name' in parent ? (parent as Element) : null;
  }
  let flattened = base || WHITE;
  // layers are collected top → bottom; composite from the opaque base upwards.
  const translucent = base ? layers.slice(0, -1) : layers;
  for (let index = translucent.length - 1; index >= 0; index -= 1) {
    flattened = compositeOver(translucent[index], flattened);
  }
  return { color: flattened };
};

const resolveForeground = (start: Element): RgbaColor => {
  let current: Element | null = start;
  while (current) {
    const color = ownColor(current);
    if (color && color.a > 0) return color;
    const parent = getParent(current);
    current = parent && 'name' in parent ? (parent as Element) : null;
  }
  return { r: 0, g: 0, b: 0, a: 1 };
};

const isHidden = (element: Element): boolean => {
  let current: Element | null = element;
  while (current) {
    const classes = classesOf(current);
    if (classes.includes('sr-only') || classes.includes('hidden') || getAttributeValue(current, 'aria-hidden') === 'true' && classes.includes('sr-only')) return true;
    if (inlineStyles(current).display === 'none') return true;
    const parent = getParent(current);
    current = parent && 'name' in parent ? (parent as Element) : null;
  }
  return false;
};

const describe = (element: Element): string => {
  const id = getAttributeValue(element, 'id');
  const classes = classesOf(element).slice(0, 6).join('.');
  return `<${getName(element)}${id ? `#${id}` : ''}${classes ? `.${classes}` : ''}>`;
};

interface AuditResult {
  checked: number;
  failures: string[];
  blocked: string[];
}

const auditMarkup = (label: string, markup: string): AuditResult => {
  const document = parseDocument(markup);
  const result: AuditResult = { checked: 0, failures: [], blocked: [] };
  for (const element of findAll(() => true, document.children as AnyNode[]) as Element[]) {
    if (!('name' in element) || SKIP_TAGS.has(getName(element))) continue;
    const text = element.children
      .filter((child) => child.type === 'text')
      .map((child) => (child as unknown as { data: string }).data)
      .join('')
      .trim();
    if (!text || isHidden(element)) continue;
    result.checked += 1;
    const background = resolveBackground(element);
    const snippet = text.slice(0, 48);
    if ('blocked' in background) {
      result.blocked.push(`${label}: ${describe(element)} "${snippet}" — ${background.blocked}`);
      continue;
    }
    const foreground = resolveForeground(element);
    const ratio = contrastRatio(foreground, background.color);
    if (!(ratio > WCAG_AA_NORMAL_TEXT)) {
      result.failures.push(
        `${label}: ${describe(element)} "${snippet}" — ${toHex(foreground)} on ${toHex(background.color)} = ${ratio.toFixed(2)} (needs > 4.5)`,
      );
    }
  }
  return result;
};

const noop = () => undefined;
const renders: Array<[string, string]> = [
  ['homepage', renderToStaticMarkup(<PublicHomepage />)],
  ['homepage/authenticated', renderToStaticMarkup(<PublicHomepage authenticated />)],
  ['library/in-use', renderToStaticMarkup(
    <NexoraTemplateLibrary templates={templates} onPreview={noop} onCustomize={noop} activeTemplateId={templates[0].id} />,
  )],
  // The owner-dashboard gallery reuses the same artwork chips.
  ['gallery/in-use', renderToStaticMarkup(
    <NexoraTemplateGallery templates={templates} onPreview={noop} onCustomize={noop} activeTemplateId={templates[0].id} />,
  )],
];
// Every selected filter changes the chip colours, so each state is audited too.
for (const filter of nexoraCategoryFilters(templates)) {
  renders.push([
    `library/filter:${filter.id}`,
    renderToStaticMarkup(
      <NexoraTemplateLibrary templates={templates} onPreview={noop} onCustomize={noop} activeCategory={filter.id} />,
    ),
  ]);
}

const failures: string[] = [];
const blocked: string[] = [];
let checked = 0;
for (const [label, markup] of renders) {
  const audit = auditMarkup(label, markup);
  checked += audit.checked;
  failures.push(...audit.failures);
  blocked.push(...audit.blocked);
}

assert.ok(checked > 1000, `the audit must actually reach the rendered text (saw ${checked} elements)`);
assert.deepEqual(
  [...new Set(blocked)],
  [],
  `text with an unmeasurable background (axe-core "Needs review"):\n${[...new Set(blocked)].join('\n')}`,
);
assert.deepEqual(
  [...new Set(failures)],
  [],
  `text below WCAG AA 4.5:1:\n${[...new Set(failures)].join('\n')}`,
);

/* ------------------------------------------------------------------ *
 * 3. Structural guards for the two overlap findings.
 * ------------------------------------------------------------------ */

const homepageMarkup = renders[0][1];
const homepageDocument = parseDocument(homepageMarkup);
const elements = findAll(() => true, homepageDocument.children as AnyNode[]) as Element[];
const floatingBadge = elements.find((element) =>
  'name' in element && classesOf(element).includes('-top-3') && classesOf(element).includes('bg-white'),
);
assert.ok(floatingBadge, 'the hero floating badge is still rendered');
assert.ok(
  classesOf(floatingBadge!).includes('z-10'),
  'the floating badge needs its own layer above the isolated hero photo, otherwise axe reports bgOverlap',
);
// Chips painted on top of artwork must be opaque: a translucent chip lets the
// photo gradient show through and axe-core can only file it as "Needs review".
const artworkChips = elements.filter((element) => {
  if (!('name' in element)) return false;
  const classes = classesOf(element);
  return classes.includes('backdrop-blur') || (classes.includes('top-4') && classes.includes('left-4'));
});
assert.ok(artworkChips.length >= 17, `expected the 16 card brand strips plus the hero featured badge (saw ${artworkChips.length})`);
for (const chip of artworkChips) {
  const classes = classesOf(chip);
  assert.ok(
    classes.includes('bg-white') && !classes.some((name) => name.startsWith('bg-white/')),
    `artwork chip ${describe(chip)} must paint an opaque background`,
  );
}

console.log(
  `public contrast: ${NEXORA_CATEGORIES.length} category tokens + ${checked} rendered text elements across ${renders.length} states pass WCAG AA (>4.5:1) with measurable backgrounds`,
);
