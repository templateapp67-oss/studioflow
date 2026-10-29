import {resolveSiteSlug} from '../src/lib/resolveSite';
const cases: Array<[string, any, string | null]> = [
  ['query param wins', {search: '?site=glow-studio', hostname: 'other.example.com'}, 'glow-studio'],
  ['query slugs are case-insensitive', {search: '?site=Roop-Mahal', hostname: 'nexora.app'}, 'roop-mahal'],
  ['query on apex host', {search: '?site=a', hostname: 'nexora.app'}, 'a'],
  ['subdomain alias', {search: '', hostname: 'glow-studio.nexora.app'}, 'glow-studio'],
  ['hostname from href', {search: '', href: 'https://glow-studio.nexora.app/?app=1'}, 'glow-studio'],
  ['hostname from origin', {origin: 'https://glow-studio.nexora.app'}, 'glow-studio'],
  ['apex serves owner app', {search: '', hostname: 'nexora.app'}, null],
  ['www serves owner app', {search: '', hostname: 'www.nexora.app'}, null],
  ['reserved labels skipped', {search: '', hostname: 'app.nexora.app'}, null],
  ['sandbox preview host skipped', {search: '?template=skincare_clinic', hostname: '3000-example.e2b.app'}, null],
  ['sandbox explicit site query wins', {search: '?site=glow-studio', hostname: '3000-example.e2b.app'}, 'glow-studio'],
  ['vercel preview skipped', {search: '', hostname: 'studioflow-abc123-team.vercel.app'}, null],
  ['localhost skipped', {search: '', hostname: 'localhost'}, null],
  ['local ip skipped', {search: '', hostname: '127.0.0.1'}, null],
  ['single-char label skipped', {search: '', hostname: 'a.nexora.app'}, null],
  ['invalid label skipped', {search: '', hostname: '-bad-.nexora.app'}, null],
  ['missing location', undefined, null],
  ['empty stub', {}, null],
];
let failed = 0;
for (const [name, loc, want] of cases) {
  const got = resolveSiteSlug(loc);
  if (got !== want) { failed++; console.error(`FAIL ${name}: got ${got}, want ${want}`); }
}
if (failed) { console.error(`${failed} subdomain cases failed`); process.exit(1); }
console.log(`PASS: subdomain routing resolves all ${cases.length} cases.`);
