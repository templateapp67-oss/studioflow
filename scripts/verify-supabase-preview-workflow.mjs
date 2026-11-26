import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const workflow = readFileSync('.github/workflows/supabase-preview.yml', 'utf8');
const availability = workflow.match(/id: availability[\s\S]*?run: \|\n((?: {10}[^\n]*\n|\n)+)/)?.[1];
assert.ok(availability, 'preview configuration step has a shell body');
assert.doesNotMatch(workflow, /supabase db pull\b/);
assert.match(workflow, /supabase db push --dry-run --remote="\$SUPABASE_PREVIEW_PROJECT_REF"/);

const directory = mkdtempSync(join(tmpdir(), 'studioflow-preview-'));
const output = join(directory, 'output');
const summary = join(directory, 'summary');

function evaluateConfiguration(options) {
  writeFileSync(output, '');
  writeFileSync(summary, '');
  const result = spawnSync('bash', ['-c', availability.replace(/^ {10}/gm, '')], {
    env: { PATH: process.env.PATH, GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: summary, ...options },
    encoding: 'utf8',
  });
  assert.ifError(result.error);
  return { status: result.status, output: readFileSync(output, 'utf8'), summary: readFileSync(summary, 'utf8') };
}

const ready = {
  SUPABASE_PREVIEW_ENABLED: 'true',
  SUPABASE_PREVIEW_PROJECT_REF: 'a'.repeat(20),
  SUPABASE_PREVIEW_ACCESS_TOKEN: 'fixture-token',
  SUPABASE_PREVIEW_DB_PASSWORD: 'fixture-password',
};

try {
  const disabled = evaluateConfiguration({});
  assert.equal(disabled.status, 0);
  assert.match(disabled.output, /^enabled=false$/m);
  assert.match(disabled.summary, /skipped \(not enabled\)/);

  for (const field of Object.keys(ready).filter(key => key !== 'SUPABASE_PREVIEW_ENABLED')) {
    const missing = evaluateConfiguration({ ...ready, [field]: '' });
    assert.equal(missing.status, 1, field + ' must be required when hosted validation is enabled');
    assert.doesNotMatch(missing.output, /enabled=true/);
  }

  for (const ref of ['https://example.test', 'zilwgiuiygqqardzutxi', 'ckgrgnokgxgjxzfeoigg']) {
    const excluded = evaluateConfiguration({ ...ready, SUPABASE_PREVIEW_PROJECT_REF: ref });
    assert.equal(excluded.status, 1);
    assert.doesNotMatch(excluded.output, /enabled=true/);
  }

  const configured = evaluateConfiguration(ready);
  assert.equal(configured.status, 0);
  assert.match(configured.output, /^enabled=true$/m);
  console.log('PASS: disabled hosted previews report the skip; enabled previews require a separate valid project and a dry-run.');
} finally {
  rmSync(directory, { force: true, recursive: true });
}
