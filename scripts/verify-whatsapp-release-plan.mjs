import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,existsSync} from 'node:fs';

const history=JSON.parse(readFileSync('docs/integrations/restored-supabase-history.json','utf8'));
const active=readdirSync('supabase/migrations').filter(name=>/^\d+_.+\.sql$/.test(name));
const applied=new Set(history.applied_versions);
const pending=active.filter(name=>!applied.has(name.split('_',1)[0])).sort();
assert.deepEqual(pending,history.release_pending_migrations.map(r=>r.file).sort(),
  'Only the explicitly reviewed additive runtime migrations may auto-deploy');
assert.equal(pending.length,2);
const latest=[...applied].sort().at(-1);
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
assert.equal(history.live_catalog_evidence.applied_versions,applied.size);
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
console.log('PASS: 167 recorded applied migrations plus two reviewed additive runtime migrations; 15 unrelated feature drafts and the superseded test draft remain preserved outside automatic deployment. Live apply is not tested.');
