import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,existsSync} from 'node:fs';

const history=JSON.parse(readFileSync('docs/integrations/restored-supabase-history.json','utf8'));
const readCanonicalText=(path)=>readFileSync(path,'utf8').replace(/\r\n/g,'\n');
const sha256Text=(path)=>createHash('sha256').update(readCanonicalText(path)).digest('hex');
const gitBlobSha=(path)=>{
  const body=Buffer.from(readCanonicalText(path),'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from('blob '+body.length),Buffer.from([0]),body])).digest('hex');
};

const active=readdirSync('supabase/migrations').filter(name=>/^\d+_.+\.sql$/.test(name));
const historicalApplied=new Set(history.applied_versions);
const postExportApplied=history.post_export_applied_versions||[];
const applied=new Set([...historicalApplied,...postExportApplied.map(record=>record.file.split('_',1)[0])]);
assert.equal(history.applied_versions.length,history.applied_versions_in_export,
  'The exported migration baseline must remain an exact historical snapshot');
assert.equal(new Set(history.applied_versions).size,history.applied_versions.length,
  'The exported migration baseline must not contain duplicate versions');
for(const record of history.restored){
  const file=record.version+'_'+record.name+'.sql';
  assert(active.includes(file),`Restored applied migration source is missing: ${file}`);
  assert.equal(
    sha256Text('supabase/migrations/'+file),
    record.file_sha256,
    `Restored migration source checksum changed: ${file}`
  );
}
for(const record of postExportApplied){
  assert(!historicalApplied.has(record.version),`Post-export migration already exists in export baseline: ${record.version}`);
  assert(active.includes(record.file),`Post-export applied migration source is missing: ${record.file}`);
  assert.equal(record.file.split('_',1)[0],record.version,`Post-export local filename/version mismatch: ${record.file}`);
  assert(/^\d{14}$/.test(record.remote_version||record.version),`Invalid remote migration version for ${record.file}`);
  const recordedBlobSha=gitBlobSha('supabase/migrations/'+record.file);
  assert.equal(recordedBlobSha,record.git_blob_sha,
    `Post-export migration source checksum changed: ${record.file}`);
}
const pending=active.filter(name=>!applied.has(name.split('_',1)[0])).sort();
const reviewedPending=history.release_pending_migrations.map(r=>r.file).sort();
assert.deepEqual(pending,reviewedPending,
  'Only explicitly listed release-pending migrations may be absent from the remote applied history');
// Reviewed feature migrations are the ones a human signed off before deploy.
// Assert the invariant (each is a distinct, still-present, applied source)
// rather than a fixed count, which only records how many existed at one time.
const reviewedFiles=new Set();
for(const record of history.reviewed_feature_migrations||[]){
  assert(active.includes(record.file),`Reviewed feature migration source is missing: ${record.file}`);
  assert(!reviewedFiles.has(record.file),`Reviewed feature migration listed twice: ${record.file}`);
  reviewedFiles.add(record.file);
  assert(applied.has(record.file.split('_',1)[0]),
    `Reviewed feature migration was never recorded as applied or pending: ${record.file}`);
}
// New pending migrations must be newer than every migration already recorded as applied.
const latest=[...applied].sort().at(-1);
for(const file of pending){
  assert(file.split('_',1)[0]>latest,`Pending migration predates recorded live history: ${file}`);
  const sql=readFileSync('supabase/migrations/'+file,'utf8');
  assert(!/drop\s+(?:schema|database|table)\b/i.test(sql),`Destructive pending SQL: ${file}`);
}
for(const record of [...history.deferred_feature_migrations,...history.superseded_unapplied_migrations]){
  assert(!active.includes(record.original_file),`Unreviewed source returned to auto-deploy: ${record.original_file}`);
  assert(existsSync(record.path),`Deferred source lost: ${record.path}`);
  assert.equal(sha256Text(record.path),record.sha256,
    `Deferred source changed: ${record.path}`);
}
for(const record of history.retimestamped_unapplied_migrations){
  assert(!active.includes(record.old_file));
  assert.equal(sha256Text('supabase/migrations/'+record.new_file),record.sha256);
}
assert.equal(history.deferred_feature_migrations.length,15);
assert.equal(history.superseded_unapplied_migrations.length,1);
assert.equal(history.live_catalog_evidence.applied_versions,history.applied_versions_in_export,
  'The catalog evidence count must remain tied to its original export date');
assert(history.live_catalog_evidence.captured_at);
const workflow=readCanonicalText('.github/workflows/production.yml');
const edgeStep=workflow.split('- name: Deploy reviewed WhatsApp Edge Functions')[1]?.split('\n  deploy:')[0];
assert(edgeStep,'Missing Edge deployment step after approved migrations');
assert(edgeStep.includes("github.event_name == 'workflow_dispatch' && inputs.release_mode == 'apply_and_deploy'"));
assert(edgeStep.includes('--remote="$SUPABASE_PROJECT_REF" --use-api'));
assert(!edgeStep.includes('--no-verify-jwt') && !edgeStep.includes('--prune'));
assert(workflow.includes('$SUPABASE_PROJECT_REF" != "zilwgiuiygqqardzutxi"'));
const config=readFileSync('supabase/config.toml','utf8');
assert(/\[functions\.nexora-whatsapp-connect\]\s*verify_jwt\s*=\s*true/.test(config));
assert(/\[functions\.studioflow-whatsapp-booking\]\s*verify_jwt\s*=\s*false/.test(config));
console.log(`PASS: ${applied.size} applied migration versions (captured export plus ${postExportApplied.length} post-export records), ${pending.length} explicitly approved pending migrations, ${reviewedFiles.size} reviewed feature records; 15 deferred feature drafts and the superseded test draft remain preserved. Live apply is not tested.`);
