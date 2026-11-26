import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { historicalEdgeReferences } from './lib/historicalEdgeReferences.mjs';

const path = 'supabase/migrations/20240101000000_recorded_worker.sql';
const source = "select '" + 'functions' + "/v1/recorded-worker';\n";
const history = {
  applied_versions: ['20240101000000'],
  restored: [{ version: '20240101000000', name: 'recorded_worker',
    file_sha256: createHash('sha256').update(source).digest('hex') }],
  historical_edge_references: [{ path, functions: ['recorded-worker'], reason: 'Recorded worker from a separate source tree.' }],
};
const allowed = historicalEdgeReferences(history, () => source);
assert(allowed(path, 'recorded-worker'));
assert(!allowed('src/current-handler.ts', 'recorded-worker'), 'active source must not inherit a historical exception');
assert(!allowed('supabase/migrations/20260101000000_new.sql', 'recorded-worker'), 'new migrations require real source');
assert(!allowed(path, 'new-missing-worker'), 'an unlisted endpoint must still fail');
assert.throws(() => historicalEdgeReferences(history, () => source + '-- modified'), /Historical migration changed/);
assert.throws(() => historicalEdgeReferences({ ...history, applied_versions: [] }, () => source), /not a recorded applied migration/);
assert.throws(() => historicalEdgeReferences({ ...history, restored: [] }, () => source), /not a recorded applied migration/);
const stale = structuredClone(history);
stale.historical_edge_references[0].functions = ['removed-worker'];
assert.throws(() => historicalEdgeReferences(stale, () => source), /Stale historical Edge dependency/);
assert.throws(() => historicalEdgeReferences({ ...history, historical_edge_references: [...history.historical_edge_references, ...history.historical_edge_references] }, () => source), /Duplicate historical Edge inventory/);

// Run the real scanner as well: the same historical endpoint is forbidden in
// active code and new migrations, even though its original recorded SQL passes.
const runSuffix = `${process.pid}-${Date.now()}`;
const createdFixtures = new Set();
const cleanupFixtures = () => {
  for (const fixture of [...createdFixtures]) {
    rmSync(fixture, { force: true });
    createdFixtures.delete(fixture);
  }
};
const handleSignal = (signal) => {
  cleanupFixtures();
  process.exit(signal === 'SIGINT' ? 130 : 143);
};
process.once('SIGINT', handleSignal);
process.once('SIGTERM', handleSignal);

try {
  for (const fixture of [
    `src/edge-history-negative-${runSuffix}.mjs`,
    `supabase/migrations/20990101000000_edge_history_negative_${runSuffix}.sql`,
  ]) {
    let created = false;
    try {
      writeFileSync(fixture, "'" + 'functions' + "/v1/nexora-job-push';\n", { flag: 'wx' });
      created = true;
      createdFixtures.add(fixture);
      const result = spawnSync(process.execPath, ['scripts/verify-edge-functions.mjs'], { encoding: 'utf8' });
      assert.notEqual(result.status, 0, `${fixture} must fail the real Edge guard`);
      assert(result.stderr.includes('but that function has no source folder'), result.stderr);
    } finally {
      if (created) {
        rmSync(fixture, { force: true });
        createdFixtures.delete(fixture);
      }
    }
  }
} finally {
  cleanupFixtures();
  process.off('SIGINT', handleSignal);
  process.off('SIGTERM', handleSignal);
}
console.log('PASS: exact applied SQL dependency accepted; active callers, new migrations, unlisted endpoints, edited SQL, unrecorded versions and stale inventories rejected.');
