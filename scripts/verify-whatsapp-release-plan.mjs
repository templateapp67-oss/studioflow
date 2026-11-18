import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,existsSync} from 'node:fs';

const history=JSON.parse(readFileSync('docs/integrations/restored-supabase-history.json','utf8'));
const active=readdirSync('supabase/migrations').filter(name=>/^\d+_.+\.sql$/.test(name));
const historicalApplied=new Set(history.applied_versions);
const postExportApplied=history.post_export_applied_versions||[];
const applied=new Set([...historicalApplied,...postExportApplied.map(record=>record.version)]);
assert.equal(history.applied_versions.length,history.applied_versions_in_export,
  'The exported migration baseline must remain an exact historical snapshot');
assert.equal(new Set(history.applied_versions).size,history.applied_versions.length,
  'The exported migration baseline must not contain duplicate versions');
for(const record of postExportApplied){
  assert(!historicalApplied.has(record.version),`Post-export migration already exists in export baseline: ${record.version}`);
  assert(active.includes(record.file),`Post-export applied migration source is missing: ${record.file}`);
  assert.equal(record.file.split('_',1)[0],record.version,`Post-export migration filename/version mismatch: ${record.file}`);
}
const pending=active.filter(name=>!applied.has(name.split('_',1)[0])).sort();
const reviewedPending=[...history.release_pending_migrations,...(history.reviewed_feature_migrations||[])].map(r=>r.file).sort();
assert.deepEqual(pending,reviewedPending,
  'Only explicitly reviewed runtime and feature-reconciliation migrations may be pending for protected release');
assert.equal(history.release_pending_migrations.length,2);
assert.equal((history.reviewed_feature_migrations||[]).length,4);
// Keep the ordering guard anchored to the captured export baseline. A later
// migration can be applied remotely while older reviewed migrations remain
// intentionally pending; post-export evidence must not move this baseline.
const latest=[...historicalApplied].sort().at(-1);
for(const file of pending){
  assert(file.split('_',1)[0]>latest,`Pending migration predates recorded live history: ${file}`);
  const sql=readFileSync('supabase/migrations/'+file,'utf8');
  assert(!/drop\s+(?:schema|database|table)\b/i.test(sql),`Destructive pending SQL: ${file}`);
}
for(const record of [...history.deferred_feature_migrations,...history.superseded_unapplied_migrations]){
  assert(!active.includes(record.original_file),`Unreviewed source returned to auto-deploy: ${record.original_file}`);
  assert(existsSync(record.path),`Deferred source lost: ${record.path}`);
  assert.equal(createHash('sha256').update(readFileSync(record.path)).digest('hex'),record.sha256,
    `Deferred source changed: ${record.path}`);
}
for(const record of history.retimestamped_unapplied_migrations){
  assert(!active.includes(record.old_file));
  assert.equal(createHash('sha256').update(readFileSync('supabase/migrations/'+record.new_file)).digest('hex'),record.sha256);
}
assert.equal(history.deferred_feature_migrations.length,15);
assert.equal(history.superseded_unapplied_migrations.length,1);
assert.equal(history.live_catalog_evidence.applied_versions,history.applied_versions_in_export,
  'The catalog evidence count must match its own captured export, not later migration observations');
assert(history.live_catalog_evidence.captured_at);
const workflow=readFileSync('.github/workflows/production.yml','utf8');
const edgeStep=workflow.split('- name: Deploy reviewed WhatsApp Edge Functions')[1]?.split('\n  deploy:')[0];
assert(edgeStep,'Missing Edge deployment step after approved migrations');
assert(edgeStep.includes("github.event_name == 'workflow_dispatch' && inputs.release_mode == 'apply_and_deploy'"));
assert(edgeStep.includes('--remote="$SUPABASE_PROJECT_REF" --use-api'));
assert(!edgeStep.includes('--no-verify-jwt') && !edgeStep.includes('--prune'));
assert(workflow.includes('$SUPABASE_PROJECT_REF" != "zilwgiuiygqqardzutxi"'));
const config=readFileSync('supabase/config.toml','utf8');
assert(/\[functions\.nexora-whatsapp-connect\]\s*verify_jwt\s*=\s*true/.test(config));
assert(/\[functions\.studioflow-whatsapp-booking\]\s*verify_jwt\s*=\s*false/.test(config));
console.log('PASS: 167 recorded applied migrations, two reviewed WhatsApp runtime migrations, and four reviewed feature migrations (Template 15/multi-service plus three Tawk migration records); 15 unrelated feature drafts and the superseded test draft remain preserved. Live apply is not tested.');
