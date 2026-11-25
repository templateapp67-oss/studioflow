import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { build } from 'esbuild';

const PUBLIC_DOCUMENTS = [
  'dist/index.html',
  'dist/about/index.html',
  'dist/salon-os/index.html',
  'dist/pricing/index.html',
  'dist/privacy/index.html',
  'dist/salon-onboarding/index.html',
  'dist/salon-growth/index.html',
  'dist/growth-partner-rewards/index.html',
  'dist/partner-rewards/index.html',
];

const templateFiles = readdirSync('dist/template-pages')
  .filter((file) => file.endsWith('.html'))
  .sort()
  .map((file) => 'dist/template-pages/' + file);
assert.equal(templateFiles.length, 16, 'all 16 public template landing pages are built');
const allFiles = [...PUBLIC_DOCUMENTS, ...templateFiles];

function headTags(html, name) {
  const tags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);
  return tags.filter((tag) => {
    const value = tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1];
    return value?.toLowerCase() === name.toLowerCase();
  });
}

function getContent(tag) {
  return tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1] ?? '';
}

function decodeHtml(value) {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'");
}

for (const file of allFiles) {
  assert.ok(existsSync(file), file + ' exists after prerender');
  const html = readFileSync(file, 'utf8');
  const routeName = file.replace(/^dist/, '') || '/';
  const titles = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
  const descriptions = headTags(html, 'description');
  const canonicals = [...html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi)];
  const robots = headTags(html, 'robots');
  const h1Count = [...html.matchAll(/<h1\b/gi)].length;
  const jsonLd = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  assert.equal(titles.length, 1, routeName + ' has exactly one title');
  assert.ok(titles[0][1].trim().length > 0, routeName + ' has a non-empty title');
  assert.ok(decodeHtml(titles[0][1].trim()).length <= 60, routeName + ' decoded title is no longer than 60 characters (got ' + decodeHtml(titles[0][1].trim()).length + ')');
  assert.equal(descriptions.length, 1, routeName + ' has exactly one meta description');
  assert.ok(getContent(descriptions[0]).length > 0, routeName + ' has a non-empty meta description');
  assert.ok(decodeHtml(getContent(descriptions[0])).length <= 160, routeName + ' decoded meta description is no longer than 160 characters');
  assert.equal(canonicals.length, 1, routeName + ' has exactly one canonical URL');
  assert.ok(canonicals[0][0].includes('https://nexorasalon.online/'), routeName + ' canonical uses the verified HTTPS origin');
  assert.equal(robots.length, 1, routeName + ' has one robots meta directive');
  assert.match(getContent(robots[0]), /^index,\s*follow$/i, routeName + ' is intended to be indexable');
  assert.equal(h1Count, 1, routeName + ' has exactly one H1');
  if (routeName === '/privacy/index.html') {
    assert.equal(jsonLd.length, 0, 'privacy page retains its existing no-JSON-LD contract');
  } else {
    assert.ok(jsonLd.length >= 1, routeName + ' has structured data');
  }
  for (const [index, match] of jsonLd.entries()) {
    assert.doesNotThrow(() => JSON.parse(match[1]), routeName + ' JSON-LD block ' + (index + 1) + ' parses as JSON');
  }

  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  for (const image of images) {
    const altMatch = image.match(/\balt=["']([^"']*)["']/i);
    assert.ok(altMatch, routeName + ' image includes an alt attribute');
    const alt = decodeHtml(altMatch[1]).trim();
    const explicitlyDecorative = /\baria-hidden=["']true["']|\brole=["'](?:presentation|none)["']/i.test(image);
    assert.ok(alt.length > 0 || explicitlyDecorative, routeName + ' non-decorative image has meaningful alt text');
    assert.ok(!/^(?:image|photo|picture|graphic|untitled)(?:[ ._-]|$)/i.test(alt), routeName + ' alt text is descriptive, not a generic placeholder');
  }
}

const aboutHtml = readFileSync('dist/about/index.html', 'utf8');
assert.ok(aboutHtml.includes('NEXORA Editorial Team'), 'the public About page identifies the editorial organisation');
assert.ok(aboutHtml.includes('#editorial-team'), 'the About page has a stable editorial profile anchor');
const templateHtml = templateFiles.map((file) => readFileSync(file, 'utf8'));
assert.ok(templateHtml.every((html) => html.includes('/about#editorial-team')), 'all template pages reference the declared editorial publisher/author profile');
assert.ok(templateHtml.every((html) => /fetchpriority=["']high["']/i.test(html) && /decoding=["']async["']/i.test(html)), 'every template hero image is prioritised and decoded asynchronously');
const webpHeroCount = templateHtml.filter((html) => /<img\b[^>]*src=["'][^"']+\.webp(?:\?[^"']*)?["']/i.test(html)).length;
assert.ok(webpHeroCount >= 12, 'at least 12 of the 16 template hero images use WebP');

const directoryProfile = JSON.parse(readFileSync('public/nexora-directory-profile.json', 'utf8'));
assert.equal(directoryProfile['@type'], 'Organization', 'directory profile describes NEXORA as an organisation, not a walk-in salon');
assert.equal(directoryProfile.name, 'NEXORA Salon OS');
assert.equal(directoryProfile.url, 'https://nexorasalon.online/');
assert.equal(directoryProfile.physicalAddress, null, 'an unverified physical address is not fabricated');
assert.deepEqual(directoryProfile.socialProfiles, [], 'unverified social URLs are not fabricated');

const llms = readFileSync('public/llms.txt', 'utf8');
const llmsFull = readFileSync('public/llms-full.txt', 'utf8');
assert.ok(llms.includes('https://nexorasalon.online/about'), 'llms.txt includes the About page');
assert.ok(llmsFull.includes('https://nexorasalon.online/template-pages/aurelia-beauty-parlour.html'), 'full AI reference lists the sixteenth template');
assert.ok(llmsFull.includes('NEXORA Editorial Team'), 'full AI reference identifies the editorial organisation');

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
assert.ok(vercel.rewrites.some((entry) => entry.source === '/about' && entry.destination === '/about/index.html'), '/about rewrites to its prerendered document');

const headerCss = readFileSync('src/components/nexora-landing/sections/siteHeader.css', 'utf8');
assert.match(headerCss, /\.nexora-site-header:not\(\.has-measured-layout\) \.nexora-site-header__inner\s*\{[^}]*flex-direction:\s*row;[^}]*flex-wrap:\s*nowrap;/s, 'unmeasured mobile/tablet header uses a stable single-row layout');
assert.match(headerCss, /\.nexora-site-header:not\(\.has-measured-layout\) \.nexora-site-header__toggle\s*\{[^}]*display:\s*inline-flex;/s, 'the server-rendered compact navigation toggle is visible before measurement');
const perfReport = readFileSync('docs/qa/NEXORA-LANDING-PERFORMANCE-REPORT.md', 'utf8');
assert.match(perfReport, /LCP.*measured/i, 'performance report records LCP measurement status');
assert.match(perfReport, /CLS.*measured/i, 'performance report records CLS measurement status');
assert.match(perfReport, /INP.*not measured/i, 'the release report does not falsely claim INP has passed');

const helperBuild = await build({
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  logLevel: 'silent',
  stdin: {
    contents: "export { normalizeSeoTitle, normalizeSeoDescription, normalizeCanonicalUrl } from './src/lib/seoText.ts';",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
});
const helperCode = helperBuild.outputFiles[0]?.text;
assert.ok(helperCode, 'SEO text helpers bundle for the validation tests');
const { normalizeSeoTitle, normalizeSeoDescription, normalizeCanonicalUrl } = await import('data:text/javascript;base64,' + Buffer.from(helperCode).toString('base64'));
assert.ok(normalizeSeoTitle('A very long title that must be shortened before it reaches a search result').length <= 60);
assert.ok(normalizeSeoDescription('A very long description '.repeat(20)).length <= 160);
const fallbackCanonical = 'https://salon.example/about';
assert.equal(normalizeCanonicalUrl('https://evil.example/spam', fallbackCanonical), fallbackCanonical, 'third-party canonical host is rejected');
assert.equal(normalizeCanonicalUrl('http://salon.example/about', fallbackCanonical), fallbackCanonical, 'HTTP canonical is rejected');
assert.equal(normalizeCanonicalUrl('https://salon.example/?app=1', fallbackCanonical), fallbackCanonical, 'app/session canonical query is rejected');
assert.equal(normalizeCanonicalUrl('https://custom.example/home', fallbackCanonical, ['custom.example']), 'https://custom.example/home', 'the salon custom domain is allowed when explicitly configured');

console.log('PASS: ' + allFiles.length + ' public documents have unique metadata, one H1, valid schema and image alt text; 16 template pages are reachable candidates with WebP hero coverage; About, directory profile, AI reference and canonical guards are verified.');
