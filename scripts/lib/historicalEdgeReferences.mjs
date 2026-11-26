import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// An imported migration records what ran in a shared database; it is not an
// assertion that every historical worker is deployed from this repository.
// Only explicitly inventoried endpoints in byte-identical restored SQL qualify.
export function historicalEdgeReferences(history, readSource) {
  const restored = new Map(history.restored.map(record => [
    `supabase/migrations/${record.version}_${record.name}.sql`, record,
  ]));
  const allowed = new Map();
  for (const entry of history.historical_edge_references ?? []) {
    const record = restored.get(entry.path);
    assert(record && history.applied_versions.includes(record.version),
      `Historical Edge dependency is not a recorded applied migration: ${entry.path}`);
    assert(!allowed.has(entry.path), `Duplicate historical Edge inventory: ${entry.path}`);
    assert(entry.reason?.trim(), `Missing historical dependency explanation: ${entry.path}`);
    const source = readSource(entry.path);
    // Git stores normalized LF text; normalize Windows checkout line endings
    // before comparing the repository source to the recorded Git blob hash.
    assert.equal(createHash('sha256').update(source.replace(/\r\n?/g, '\n')).digest('hex'), record.file_sha256,
      `Historical migration changed: ${entry.path}; new calls require local source`);
    const actual = new Set([...source.matchAll(/functions\/v1\/([a-z0-9-]+)/g)].map(match => match[1]));
    assert(entry.functions.length > 0, `Empty historical Edge inventory: ${entry.path}`);
    for (const name of entry.functions) {
      assert(actual.has(name), `Stale historical Edge dependency: ${entry.path}: ${name}`);
    }
    allowed.set(entry.path, new Set(entry.functions));
  }
  return (file, name) => allowed.get(file)?.has(name) ?? false;
}
