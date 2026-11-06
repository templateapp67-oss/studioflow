import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { build } from 'esbuild';

const origin = 'https://nexorasalon.online';
const legacyOrigin = 'https://nexora-one-white-label.templateapp67.chatgpt.site';
for (const path of ['index.html', 'login.html', 'src/lib/publicSeo.ts']) {
  const source = readFileSync(path, 'utf8');
  assert.ok(source.includes(origin), path + ': canonical NEXORA origin missing');
  assert.ok(!source.includes(legacyOrigin), path + ': legacy canonical origin remains');
  assert.ok(source.includes('/nexora-homepage-og.jpg'), path + ': verified social image path missing');
}
assert.ok(statSync('public/nexora-homepage-og.jpg').size > 10000, 'NEXORA social preview image must exist and be non-empty');
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
assert.ok(vercel.rewrites.some((rewrite) => rewrite.source === '/sitemap.xml' && rewrite.destination === '/api/sitemap'), 'Vercel must route the public sitemap path to the API handler');
const indexHtml = readFileSync('index.html', 'utf8');
const schemaMatch = indexHtml.match(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/);
assert.ok(schemaMatch, 'Homepage SoftwareApplication JSON-LD must exist');
const schema = JSON.parse(schemaMatch[1]);
assert.equal(schema['@type'], 'SoftwareApplication');
assert.equal(schema.url, 'https://nexorasalon.online/');
assert.equal(schema.image, 'https://nexorasalon.online/nexora-homepage-og.jpg');
const homepage = readFileSync('src/components/PublicHomepage.tsx', 'utf8');
assert.ok(homepage.includes('NEXORA Salon Website Builder & Management Software'), 'Homepage H1 must include the primary salon website builder keyword');
const robots = readFileSync('public/robots.txt', 'utf8');
assert.match(robots, /User-agent: \*/);
assert.ok(robots.includes(origin + '/sitemap.xml'));

const built = await build({
  entryPoints: ['server/sitemap.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  write: false,
});
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64');
const sitemap = await import(moduleUrl);
assert.equal(sitemap.canonicalOrigin(undefined), origin);
assert.equal(sitemap.canonicalOrigin(origin), origin);
assert.throws(() => sitemap.canonicalOrigin('http://nexorasalon.online'));
const xml = await sitemap.generateSitemap({ SITE_URL: origin }, async () => {
  throw new Error('simulated Supabase catalogue outage');
});
assert.ok(xml.startsWith('<?xml'));
assert.ok(xml.includes('<loc>' + origin + '/</loc>'));
assert.ok(xml.includes('<loc>' + origin + '/?app=1</loc>'));
assert.ok(!xml.includes('studioflow.test'));
console.log('PASS: canonical metadata, robots sitemap reference, default origin and outage-safe XML sitemap.');
