import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const workflow=readFileSync('.github/workflows/production.yml','utf8');
const dispatch=workflow.split('  workflow_dispatch:\n')[1].split('\nconcurrency:')[0];
assert(dispatch.includes('type: choice') && dispatch.includes('default: dry_run'));
assert(!dispatch.includes('type: boolean'),'release operations must be mutually exclusive in the UI');
assert(!/inputs\.(apply|deploy_only)\b/.test(workflow),'remove legacy conflicting boolean inputs');
const options=[...dispatch.matchAll(/^          - (.+)$/gm)].map(m=>m[1]);
assert.deepEqual(options,['dry_run','apply_and_deploy','deploy_only']);

const expression=(job)=>{
  const section=workflow.split(`\n  ${job}:\n`)[1];
  assert(section,`Missing ${job} job`);
  return section.split('    if: >-\n')[1].split('    runs-on:')[0].trim();
};
// GitHub's expressions here deliberately use the JS-compatible comparison
// subset. Exercise the actual folded job conditions, not a separate model.
const run=(job,event,mode,changed,migrate='success',ci='success',changes='success')=>{
  const github={ref:'refs/heads/main',event_name:event};
  const inputs={release_mode:mode};
  const needs={ci:{result:ci},changes:{result:changes,outputs:{migrations_changed:String(changed)}},migrate:{result:migrate}};
  return new Function('github','inputs','needs','always',`return (${expression(job)});`)(github,inputs,needs,()=>true);
};
assert(run('migrate','workflow_dispatch','dry_run',false));
assert(!run('deploy','workflow_dispatch','dry_run',false));
assert(run('migrate','workflow_dispatch','apply_and_deploy',false));
assert(run('deploy','workflow_dispatch','apply_and_deploy',false));
assert(!run('deploy','workflow_dispatch','apply_and_deploy',false,'failure'));
assert(!run('deploy','workflow_dispatch','apply_and_deploy',false,'success','failure'));
assert(!run('migrate','workflow_dispatch','deploy_only',false));
assert(run('deploy','workflow_dispatch','deploy_only',false,'skipped'));
assert(!run('migrate','workflow_dispatch','invalid',false));
assert(!run('deploy','workflow_dispatch','invalid',false,'skipped'));
assert(run('migrate','push',undefined,true));
assert(!run('deploy','push',undefined,true));
assert(!run('migrate','push',undefined,false));
assert(run('deploy','push',undefined,false,'skipped'));

for(const label of ['Apply production migrations','Deploy reviewed WhatsApp Edge Functions']){
  const step=workflow.split('- name: '+label)[1].split('\n      - ')[0];
  assert(step.includes("if: github.event_name == 'workflow_dispatch' && inputs.release_mode == 'apply_and_deploy'"));
}
const validation=workflow.split('- name: Validate manual release mode')[1].split('\n      - ')[0];
const shell=validation.split('        run: |\n')[1].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
for(const mode of [...options,'invalid','true','']){
  const result=spawnSync('bash',['-eu','-c',shell],{env:{...process.env,RELEASE_MODE:mode},encoding:'utf8'});
  assert.equal(result.status===0,options.includes(mode),`Release validation mismatch for ${JSON.stringify(mode)}`);
}
console.log('PASS: one release dropdown; dry-run cannot apply/deploy, approved apply releases only after successful migration/CI, website-only skips DB, invalid modes fail, and push behavior is preserved.');
