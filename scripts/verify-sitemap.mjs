import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  canonicalOrigin,
  fetchPublishedSlugs,
  generateSitemap,
  sitemapXml,
} from './generate-sitemap.mjs';

assert.equal(canonicalOrigin('https://nexorasalon.online/'), 'https://nexorasalon.online');
assert.throws(() => canonicalOrigin('http://nexorasalon.online/'), /HTTPS origin/);
assert.throws(() => canonicalOrigin('https://nexorasalon.online/path'), /HTTPS origin/);

const testRows = [
  { slug: 'vijaysalojaipur' },
  { slug: 'BestSalon' },
  { slug: 'studioflow-qa-test-123' },
  { slug: '../not-a-slug' },
];
let calls = 0;
const fakeFetch = async (url, options) => {
  calls += 1;
  assert.equal(url.pathname, '/rest/v1/studioflow_websites');
  assert.equal(url.searchParams.get('select'), 'slug');
  assert.equal(url.searchParams.get('limit'), '1000');
  assert.equal(options.headers.apikey, 'test-publishable-key');
  return new Response(JSON.stringify(testRows), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

const slugs = await fetchPublishedSlugs({
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_ANON_KEY: 'test-publishable-key',
}, fakeFetch);
assert.deepEqual(slugs, ['bestsalon', 'vijaysalojaipur']);
assert.equal(calls, 1);

const xml = await generateSitemap({
  SITE_URL: 'https://nexorasalon.online/',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_ANON_KEY: 'test-publishable-key',
}, fakeFetch);
assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
assert.match(xml, /https:\/\/nexorasalon\.online\/\?app=1/);
assert.match(xml, /https:\/\/nexorasalon\.online\/\?site=bestsalon/);
assert.doesNotMatch(xml, /studioflow-qa|not-a-slug/i);
assert.match(sitemapXml('https://nexorasalon.online?a=1&b=2', ['bestsalon']), /nexorasalon\.online\?a=1&amp;b=2/);

const robots = await readFile('public/robots.txt', 'utf8');
assert.match(robots, /Sitemap:\s*https:\/\/nexorasalon\.online\/sitemap\.xml/i);
const committedSitemap = await readFile('public/sitemap.xml', 'utf8');
assert.match(committedSitemap, /<urlset/);
assert.match(committedSitemap, /https:\/\/nexorasalon\.online\/\?app=1/);

console.log('PASS: static sitemap generation, canonical URLs, QA exclusion and robots.txt verified.');
