import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflows = Object.fromEntries(['production', 'preview', 'ci'].map((name) => [
  name, readFileSync(`.github/workflows/${name}.yml`, 'utf8').replace(/\r\n?/g, '\n'),
]));
for (const [name, workflow] of Object.entries(workflows)) {
  const refs = [...workflow.matchAll(/^\s*(?:-\s*)?uses:\s*['"]?actions\/github-script@([^'"\s#]+)/gmi)].map((m) => m[1]);
  assert(refs.every((ref) => ref === 'v8'), `${name}: every github-script action must use v8`);
  if (name !== 'ci') assert(refs.length > 0, `${name} must retain its github-script reporting steps`);
}

const production = workflows.production;
const deploy = production.split('\n  deploy:\n')[1];
assert(deploy, 'production deploy job exists');
const seo = deploy.split('- name: Verify live production SEO headers, 308 redirect, sitemap and prerendered routes')[1]?.split('\n      - ')[0];
assert(seo, 'production live SEO check exists');
for (const setting of [
  'LIVE_SEO_URL: https://nexorasalon.online',
  'CHECK_WWW_REDIRECT_URL: https://www.nexorasalon.online',
  'CHECK_HTTP_REDIRECT: "1"',
  'REQUIRE_PUBLISHED_SITES: "1"',
  'run: node scripts/verify-live-seo-http.mjs',
]) assert(seo.includes(setting), `production SEO check must include ${setting}`);
assert(!seo.includes('continue-on-error: true'), 'production SEO failures must fail the job');
for (const name of ['Pull Vercel production environment', 'Refresh Vercel production environment after saved URL update',
  'Repair and verify the reviewed production Supabase URL', 'Build production deployment', 'Deploy production']) {
  const block = deploy.split(`- name: ${name}\n`)[1]?.split('\n      - ')[0];
  assert(block && !block.includes('continue-on-error: true'), `${name} must fail the production job on error`);
}

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const redirects = (vercel.redirects || []).filter((r) => r.source === '/(.*)' &&
  r.has?.some((h) => h.type === 'host' && h.value === 'www.nexorasalon.online'));
assert.equal(redirects.length, 1, 'Vercel has one www canonical redirect');
assert.equal(redirects[0].destination, 'https://nexorasalon.online/$1');
assert.equal(redirects[0].permanent, true, 'www redirect is permanent');
// TLS-level HTTP redirects are provided by the deployment platform, not by
// vercel.json; the blocking live check above is the release gate for them.
console.log('PASS: github-script v8 consistency, fatal production steps, live SEO/HTTP redirect gate, and Vercel www canonical redirect.');
