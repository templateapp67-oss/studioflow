import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { parseDocument } from 'htmlparser2';

async function loadModule(options) {
  const result = await build({
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    write: false,
    logLevel: 'silent',
    ...options,
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}

const data = await loadModule({
  stdin: {
    contents: [
      "export { NEXORA_BREADCRUMB_TRAILS, nexoraTemplateBreadcrumbs } from './src/lib/nexoraBreadcrumbs.ts';",
      "export { NEXORA_PUBLIC_ORIGIN } from './src/lib/publicSeo.ts';",
      "export { NEXORA_ECOSYSTEM_ROUTES, NEXORA_ECOSYSTEM_SEO } from './src/lib/nexoraEcosystemSeo.ts';",
      "export { NEXORA_TEMPLATE_META, nexoraTemplatePagePath } from './src/lib/nexoraTemplateCatalogue.ts';",
    ].join('\n'),
    resolveDir: process.cwd(),
    loader: 'ts',
  },
});

const {
  NEXORA_BREADCRUMB_TRAILS,
  nexoraTemplateBreadcrumbs,
  NEXORA_PUBLIC_ORIGIN,
  NEXORA_ECOSYSTEM_ROUTES,
  NEXORA_ECOSYSTEM_SEO,
  NEXORA_TEMPLATE_META,
  nexoraTemplatePagePath,
} = data;

const decode = (value) => value?.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (_, entity) => ({
  amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'",
}[entity]));
const jsonLdOf = (html) =>
  Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g), (match) => JSON.parse(match[1]));
const sectioningContent = new Set(['article', 'aside', 'main', 'nav', 'section']);

function elementsUnder(root) {
  const elements = [];
  const visit = (node) => {
    if (node.type === 'tag') elements.push(node);
    for (const child of node.children ?? []) visit(child);
  };
  visit(root);
  return elements;
}

function elementsOf(html) {
  return elementsUnder(parseDocument(html, { decodeEntities: true }));
}

function hasClass(node, className) {
  return (node.attribs?.class ?? '').split(/\s+/).includes(className);
}

function textContent(node) {
  return (node.children ?? []).map((child) => child.type === 'text' ? child.data : textContent(child)).join('');
}

function assertHeaderCtaPolicy(html, path) {
  if (path.startsWith('/template-pages/')) return;
  const headers = elementsOf(html).filter((node) => hasClass(node, 'nexora-site-header'));
  assert.equal(headers.length, 1, `${path} renders one shared NEXORA site header`);
  const headerElements = elementsUnder(headers[0]);
  if (path === '/privacy' || path === '/partner-rewards') {
    for (const className of ['nexora-site-header__primary', 'nexora-site-header__secondary', 'nexora-site-header__login']) {
      assert.ok(
        !headerElements.some((node) => ['a', 'button'].includes(node.name) && hasClass(node, className)),
        `${path} excludes the interactive shared header ${className} CTA`,
      );
    }
  }
  if (path === '/growth-partner-rewards') {
    const partnerAction = headerElements.find((node) => node.name === 'a' && hasClass(node, 'nexora-site-header__primary'));
    assert.ok(partnerAction, `${path} keeps its approved Become a Partner header action`);
    assert.equal(partnerAction.attribs.href, '/login');
    assert.ok(textContent(partnerAction).includes('Become a Partner'));
  }
}

function assertPageLandmarks(html, path) {
  const document = parseDocument(html, { decodeEntities: true });
  const banners = [];
  const mains = [];
  const visit = (node, ancestors = []) => {
    if (node.type === 'tag') {
      const roles = (node.attribs?.role ?? '').split(/\s+/);
      if (roles.includes('banner') || (node.name === 'header' && !ancestors.some((ancestor) => sectioningContent.has(ancestor.name)))) {
        banners.push(node);
      }
      if (roles.includes('main') || node.name === 'main') mains.push(node);
    }
    for (const child of node.children ?? []) {
      visit(child, node.type === 'tag' ? [...ancestors, node] : ancestors);
    }
  };
  visit(document);
  assert.equal(banners.length, 1, `${path} exposes exactly one page banner landmark`);
  assert.equal(mains.length, 1, `${path} exposes exactly one main landmark`);
}

function assertBreadcrumbMarkup(html, path, trail) {
  assertPageLandmarks(html, path);
  assertHeaderCtaPolicy(html, path);
  const markup = html.match(/<nav class="nx-breadcrumbs" aria-label="Breadcrumb">[\s\S]*?<\/nav>/)?.[0];
  assert.ok(markup, `${path} renders <nav aria-label="Breadcrumb">`);
  assert.ok(markup.includes('<ol class="nx-breadcrumbs__list">'), `${path} uses an ordered breadcrumb list`);
  assert.ok(html.indexOf(markup) < html.indexOf('<h1'), `${path} displays breadcrumbs above the page title`);

  const items = Array.from(markup.matchAll(/<li class="nx-breadcrumbs__item[^\"]*">([\s\S]*?)<\/li>/g));
  assert.equal(items.length, trail.length, `${path} renders every authored breadcrumb`);
  const primaryTrailMarkup = markup.replace(/<details class="nx-breadcrumbs__collapsed">[\s\S]*?<\/details>/g, '');
  assert.equal((primaryTrailMarkup.match(/<a\b/g) ?? []).length, trail.length - 1, `${path} links visible ancestors only`);
  assert.deepEqual(
    Array.from(primaryTrailMarkup.matchAll(/<a class="nx-breadcrumbs__label" href="([^"]*)">/g), (match) => decode(match[1])),
    trail.slice(0, -1).map((crumb) => crumb.href),
    `${path} ancestor links follow the route hierarchy`,
  );
  if (trail.length > 3) {
    const disclosure = markup.match(/<details class="nx-breadcrumbs__collapsed">([\s\S]*?)<\/details>/)?.[0];
    assert.ok(disclosure, `${path} exposes a native disclosure for omitted ancestors`);
    assert.match(disclosure, /<summary aria-label="Show \d+ hidden breadcrumb pages?"/, `${path} labels the collapsed ancestors`);
    assert.deepEqual(
      Array.from(disclosure.matchAll(/<a href="([^"]*)">/g), (match) => decode(match[1])),
      trail.slice(1, -2).map((crumb) => crumb.href),
      `${path} makes collapsed ancestor links keyboard-accessible when expanded`,
    );
  }
  assert.match(items.at(-1)?.[1] ?? '', /aria-current="page"/, `${path} marks its current page`);
  assert.doesNotMatch(items.at(-1)?.[1] ?? '', /<a\b/, `${path} renders its current page as plain text`);
  assert.equal(decode(markup).includes(trail.at(-1)?.label), true, `${path} shows the current breadcrumb label`);
  if (trail.length > 1) {
    assert.match(markup, /aria-hidden="true">›<\/span>/, `${path} hides separators from assistive technology`);
  }
}

function assertBreadcrumbSchema(blocks, path, trail) {
  const graph = blocks.flatMap((block) => block['@graph'] ?? [block]);
  const list = graph.find((node) => node['@type'] === 'BreadcrumbList')
    ?? graph.find((node) => node['@type'] === 'WebPage')?.breadcrumb;
  assert.ok(list, `${path} adds BreadcrumbList within its existing structured data`);
  assert.deepEqual(
    list.itemListElement.map(({ position, name, item }) => ({ position, name, item })),
    trail.map((crumb, index) => ({
      position: index + 1,
      name: crumb.label,
      item: crumb.href
        ? new URL(crumb.href, `${NEXORA_PUBLIC_ORIGIN}/`).toString()
        : `${NEXORA_PUBLIC_ORIGIN}${path}`,
    })),
    `${path} structured breadcrumbs match the authored hierarchy`,
  );
}

const pages = [
  { path: '/', file: 'dist/index.html', trail: NEXORA_BREADCRUMB_TRAILS['/'], schema: true },
  { path: '/salon-os', file: 'dist/salon-os/index.html', trail: NEXORA_BREADCRUMB_TRAILS['/salon-os'], schema: true },
  { path: '/pricing', file: 'dist/pricing/index.html', trail: NEXORA_BREADCRUMB_TRAILS['/pricing'], schema: true },
  { path: '/privacy', file: 'dist/privacy/index.html', trail: NEXORA_BREADCRUMB_TRAILS['/privacy'], schema: false },
  ...NEXORA_ECOSYSTEM_ROUTES.map((path) => ({
    path,
    file: `dist${path}/index.html`,
    trail: NEXORA_BREADCRUMB_TRAILS[path],
    schema: true,
  })),
];

for (const page of pages) {
  assert.ok(existsSync(page.file), `${page.path} has its prerendered document`);
  const html = readFileSync(page.file, 'utf8');
  assertBreadcrumbMarkup(html, page.path, page.trail);
  const blocks = jsonLdOf(html);
  if (page.schema) {
    assert.equal(blocks.length, 1, `${page.path} retains one existing JSON-LD block`);
    assertBreadcrumbSchema(blocks, page.path, page.trail);
  } else {
    assert.equal(blocks.length, 0, `${page.path} does not gain structured data where none was published`);
  }
}

for (const meta of NEXORA_TEMPLATE_META) {
  const path = nexoraTemplatePagePath(meta.templateId);
  const file = `dist${path}`;
  const trail = nexoraTemplateBreadcrumbs(meta.categoryName, meta.displayName);
  assert.ok(existsSync(file), `${path} has its prerendered template document`);
  const html = readFileSync(file, 'utf8');
  assertBreadcrumbMarkup(html, path, trail);
  assertBreadcrumbSchema(jsonLdOf(html), path, trail);
}

const componentCss = readFileSync('src/components/nexora-landing/sections/nexoraBreadcrumbs.css', 'utf8');
const templateCss = readFileSync('public/template-pages.css', 'utf8');
for (const [name, css] of [['marketing', componentCss], ['template preview', templateCss]]) {
  assert.match(css, /max-width\s*:\s*639px|@media\(max-width:\s*639px\)/, `${name} breadcrumbs have a phone-width rule`);
  assert.match(css, /nx-breadcrumbs__item--middle/, `${name} breadcrumbs collapse middle ancestors on narrow screens`);
  assert.match(css, /nx-breadcrumbs__collapsed/, `${name} breadcrumbs keep an ellipsis before the immediate parent`);
  assert.match(css, /nx-breadcrumbs__collapsed:not\(\[open\]\)[\s\S]*?display\s*:\s*none/, `${name} collapsed links stay hidden until the disclosure is opened`);
}
assert.match(componentCss, /color:\s*inherit/, 'marketing breadcrumbs inherit the page palette for light and dark hero surfaces');
assert.doesNotMatch(componentCss, /transition|animation/, 'breadcrumbs add no motion that could conflict with reduced-motion preferences');

console.log('PASS: accessible NEXORA breadcrumbs, responsive middle truncation, authored route ancestry, and existing JSON-LD coverage.');
