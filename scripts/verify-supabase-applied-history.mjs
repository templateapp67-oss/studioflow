import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

// This inventory comes from the owner's production history export, not from
// a generated fixture catalog. Never mark remote migrations applied here.
const manifest = JSON.parse(readFileSync('docs/integrations/restored-supabase-history.json', 'utf8'));
const directory = 'supabase/migrations';
const files = readdirSync(directory).filter(name => /^\d+_.+\.sql$/.test(name));
const byVersion = new Map();
for (const file of files) {
  const version = file.split('_', 1)[0];
  assert(!byVersion.has(version), `Duplicate migration version: ${version}`);
  byVersion.set(version, file);
}
assert.equal(new Set(manifest.applied_versions).size, manifest.applied_versions_in_export);
for (const version of manifest.applied_versions) {
  assert(byVersion.has(version), `Missing recorded applied migration: ${version}`);
}
for (const alias of manifest.reconciled_aliases ?? []) {
  assert(!files.includes(alias.removed_file), `Duplicate historical alias reintroduced: ${alias.removed_file}`);
  assert(files.includes(alias.canonical_file), `Missing canonical alias target: ${alias.canonical_file}`);
  assert(manifest.applied_versions.includes(alias.canonical_file.split('_', 1)[0]),
    `Alias target is not recorded applied: ${alias.canonical_file}`);
}
for (const record of manifest.restored) {
  const expectedName = `${record.version}_${record.name}.sql`;
  assert.equal(byVersion.get(record.version), expectedName);
  // Git stores these tracked SQL sources with LF. Normalize Windows checkout
  // CRLFs before comparing against the owner's exported source hash.
  const content = readFileSync(`${directory}/${expectedName}`, 'utf8').replace(/\r\n?/g, '\n');
  assert.equal(createHash('sha256').update(content).digest('hex'), record.file_sha256,
    `Recorded applied SQL changed: ${expectedName}; use a new additive migration`);
}
console.log(`PASS: all ${manifest.applied_versions.length} recorded applied versions exist once; ${manifest.restored.length} restored SQL files match their recorded hashes. Live migration execution is not tested.`);
