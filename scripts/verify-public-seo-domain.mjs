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
