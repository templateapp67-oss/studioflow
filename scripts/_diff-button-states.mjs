/**
 * Diffs two button-state audit reports and fails on any regression.
 *
 * A contrast fix that repairs one selector can unmask a latent failure behind
 * it — lowering an over-specific element reset lets the author's real colour
 * rule win, and that colour is not always readable. Comparing reports state by
 * state catches that, which a "failures went down" headline does not.
 *
 * Usage: node scripts/_diff-button-states.mjs <before.json> <after.json>
 */
import { readFileSync } from 'node:fs';

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error('Usage: node scripts/_diff-button-states.mjs <before.json> <after.json>');
  process.exit(2);
}

const THRESHOLD = 4.5;
/** Tolerate measurement noise; anything beyond this is a real change. */
const SLACK = 0.2;

const before = JSON.parse(readFileSync(beforePath, 'utf8'));
const after = JSON.parse(readFileSync(afterPath, 'utf8'));

const keyOf = (item) => `${item.template}|${item.cls}|${item.path}|${item.device}`;
const baseline = new Map();
for (const item of before.items) baseline.set(keyOf(item), item);

const regressions = new Map();
const appeared = new Map();
let fixed = 0;

function note(bucket, item, state, now, was) {
  const key = `${item.template} | ${item.cls} | ${state} | ${now.fg} on ${now.bg}`;
  if (!bucket.has(key)) {
    bucket.set(key, { count: 0, ratio: now.ratio, was: was ? was.ratio : null, example: (item.label || '').slice(0, 32) });
  }
  const entry = bucket.get(key);
  entry.count += 1;
}

for (const item of after.items) {
  const previous = baseline.get(keyOf(item));
  for (const [state, now] of Object.entries(item.states || {})) {
    if (!now) continue;
    const was = previous ? previous.states?.[state] : null;
    if (now.ratio >= THRESHOLD) {
      if (was && was.ratio < THRESHOLD) fixed += 1;
      continue;
    }
    if (!previous) { note(appeared, item, state, now, null); continue; }
    if (was && was.ratio >= THRESHOLD + SLACK) note(regressions, item, state, now, was);
    else if (!was) note(appeared, item, state, now, null);
  }
}

function report(title, bucket) {
  const rows = [...bucket.entries()].sort((a, b) => a[1].ratio - b[1].ratio);
  console.log(`\n${title}: ${rows.length} distinct (${[...bucket.values()].reduce((n, r) => n + r.count, 0)} states)`);
  for (const [key, info] of rows) {
    console.log(`  ${info.ratio.toFixed(2)}:1  ${key}  x${info.count}${info.was ? ` (was ${info.was.toFixed(2)})` : ''}  e.g. "${info.example}"`);
  }
}

const greenAfter = after.items.filter((i) => Object.values(i.states || {}).some((s) => s && s.green && s.ratio < THRESHOLD)).length;
const greenBefore = before.items.filter((i) => Object.values(i.states || {}).some((s) => s && s.green && s.ratio < THRESHOLD)).length;

console.log(`states: ${before.count} -> ${after.count}`);
console.log(`green-background failures: ${greenBefore} -> ${greenAfter}`);
console.log(`states repaired past ${THRESHOLD}:1: ${fixed}`);
report('REGRESSIONS (were readable, now below 4.5:1)', regressions);
report('NEW/UNMATCHED elements below 4.5:1', appeared);

if (regressions.size) {
  console.error('\nFAIL: the change made readable controls unreadable.');
  process.exitCode = 1;
} else {
  console.log('\nOK: no control regressed below 4.5:1.');
}
