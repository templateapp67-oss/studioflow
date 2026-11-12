import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { build } from 'esbuild';
import postcss from 'postcss';
import { parse as parseSelector } from 'css-what';
import { parseDocument } from 'htmlparser2';

/**
 * NEXORA marketing routes are styled by the stylesheet they link (release gate).
 *
 * `src/index.css` imports Tailwind with `source(none)`, so the public stylesheet
 * holds utilities only for the files its `@source` list names. The marketing
 * pages were added without an entry there. Their documents were built, linked
 * and served, every suite that read their copy passed, and the pages shipped
 * with white hero text on a white page and no layout: `text-white` is generated
 * because a listed file uses it, the dark background behind it was not.
 *
 * `/salon-onboarding` and `/salon-growth` are styled through the `@source`
 * entry for `NexoraEcosystemPage.tsx`; `/growth-partner-rewards` through its
 * own stylesheet. This suite reads the emitted documents and the stylesheet
 * each one links, not the source, so it does not care which of the two a page
 * uses. It fails when a class in a routed document has no rule.
 */

/** Bundles a TypeScript module to a self-contained ESM data URL. */
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

const { NEXORA_ECOSYSTEM_ROUTES } = await loadModule("export * from './src/lib/nexoraEcosystemSeo.ts';");
assert.ok(NEXORA_ECOSYSTEM_ROUTES.length >= 3, 'The routed marketing pages are listed by the metadata source');

/**
 * Class names that a rule of the stylesheet selects.
 *
 * Selectors are parsed, not searched: `.px-2\.5` is a rule for `px-2.5` and
 * says nothing about `px-2`, which a text search for `.px-2` would accept.
 */
function styledClasses(css) {
  const names = new Set();
  const collect = (tokens) => {
    for (const token of tokens) {
      if (token.type === 'attribute' && token.name === 'class' && token.action === 'element') {
        names.add(token.value);
      } else if (token.type === 'pseudo' && Array.isArray(token.data) && token.name !== 'not') {
        /* `:where(.group):hover *` styles a `group` element; `:not(.x)` does not style `x`. */
        token.data.forEach(collect);
      }
    }
  };
  postcss.parse(css).walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && rule.parent.name.endsWith('keyframes')) return;
    /* Declarations may sit in a nested rule or at-rule (`.hover\:x { &:hover { ... } }`). */
    let declares = false;
    rule.walkDecls(() => {
      declares = true;
      return false;
    });
    if (!declares) return;
    try {
      parseSelector(rule.selector).forEach(collect);
    } catch {
      /* A selector the parser does not know (nesting, new syntax): read its class tokens as text. */
      for (const match of rule.selector.matchAll(/\.((?:\\[0-9a-fA-F]{1,6} ?|\\.|[\w-])+)/g)) {
        names.add(
          match[1]
            .replace(/\\([0-9a-fA-F]{1,6}) ?/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
            .replace(/\\(.)/g, '$1'),
        );
      }
    }
  });
  return names;
}

/** Class names used by the markup React rendered into `#root`. */
function documentClasses(html) {
  const names = new Set();
  let insideRoot = false;
  const visit = (node, inRoot) => {
    const here = inRoot || node.attribs?.id === 'root';
    if (here) {
      insideRoot = true;
      for (const name of (node.attribs?.class ?? '').split(/\s+/)) if (name) names.add(name);
    }
    for (const child of node.children ?? []) visit(child, here);
  };
  visit(parseDocument(html), false);
  assert.ok(insideRoot, 'The document renders into the root element');
  return names;
}

/* lucide-react labels its icons with classes of its own; no page styles them. */
const isLibraryMarker = (name) => name === 'lucide' || name.startsWith('lucide-');

const stylesheets = new Map();
const summary = [];
for (const path of NEXORA_ECOSYSTEM_ROUTES) {
  const file = `dist${path}/index.html`;
  assert.ok(existsSync(file), `${file} is missing: run \`npm run build\` before this suite`);
  const html = readFileSync(file, 'utf8');

  const hrefs = Array.from(html.matchAll(/<link rel="stylesheet"[^>]*href="(\/[^"]+)"/g)).map((match) => match[1]);
  assert.ok(hrefs.length > 0, `${path} links a built stylesheet`);
  const styled = new Set();
  for (const href of hrefs) {
    if (!stylesheets.has(href)) {
      assert.ok(existsSync(`dist${href}`), `${path} links ${href}, which is not in the build`);
      stylesheets.set(href, styledClasses(readFileSync(`dist${href}`, 'utf8')));
    }
    for (const name of stylesheets.get(href)) styled.add(name);
  }

  const used = [...documentClasses(html)].filter((name) => !isLibraryMarker(name));
  assert.ok(used.length > 20, `${path} renders its page, not an empty shell (${used.length} classes found)`);
  const unstyled = used.filter((name) => !styled.has(name)).sort();
  assert.deepEqual(
    unstyled,
    [],
    `${path}: ${unstyled.length} of ${used.length} classes in the document have no rule in ${hrefs.join(', ')}. ` +
      'Tailwind only generates utilities for the files named by `@source` in src/index.css: ' +
      'list the component that renders these classes there, or style it from a stylesheet the component imports.',
  );
  summary.push(`${path} ${used.length}`);
}

console.log(
  `PASS: every class in the ${NEXORA_ECOSYSTEM_ROUTES.length} NEXORA marketing documents has a rule in the stylesheet the document links (${summary.join(', ')}).`,
);
