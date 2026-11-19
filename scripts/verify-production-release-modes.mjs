import assert from 'node:assert/strict';
import {chmodSync,mkdtempSync,readdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const EXPECTED_REF='zilwgiuiygqqardzutxi';
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
assert(run('migrate','push',undefined,false,'success','failure'),
  'remote migration preflight must still run when application CI fails');
assert(run('migrate','workflow_dispatch','dry_run',false,'success','failure'),
  'manual read-only dry-run must still run when application CI fails');
assert(!run('migrate','push',undefined,false,'success','success','failure'),
  'migration preflight must stop when the independent change-detection job fails');
assert(!run('deploy','push',undefined,true,'success'));
assert(run('migrate','push',undefined,false));
assert(run('deploy','push',undefined,false,'success'));
assert(!run('deploy','push',undefined,false,'failure'));

for(const label of ['Apply production migrations','Deploy reviewed WhatsApp Edge Functions']){
  const step=workflow.split('- name: '+label)[1].split('\n      - ')[0].split('\n  deploy:')[0];
  assert(step.includes("if: github.event_name == 'workflow_dispatch' && inputs.release_mode == 'apply_and_deploy'"));
}
const ciGate=workflow.split('- name: Require CI success before production apply')[1]?.split('\n      - ')[0];
assert(ciGate && ciGate.includes("needs.ci.result != 'success'"),
  'manual production apply must be blocked when required CI has not passed');
assert(ciGate.indexOf('echo "::error::')>=0 && ciGate.includes('exit 1'),
  'blocked apply must report a clear error and stop the job');

const validation=workflow.split('- name: Validate manual release mode')[1].split('\n      - ')[0];
const shell=validation.split('        run: |\n')[1].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
for(const mode of [...options,'invalid','true','']){
  const result=spawnSync('bash',['-eu','-c',shell],{env:{...process.env,RELEASE_MODE:mode},encoding:'utf8'});
  assert.equal(result.status===0,options.includes(mode),`Release validation mismatch for ${JSON.stringify(mode)}`);
}

// --- Supabase project-reference validation, whitespace normalization, and propagation ---
const migrateJob=workflow.split('\n  migrate:\n')[1].split('\n  deploy:\n')[0];
assert(migrateJob.includes('environment:\n      name: production-db'),'migrate job must target production-db environment');
const reviewedEnvMatch=migrateJob.match(/^    env:\n      REVIEWED_SUPABASE_PROJECT_REF: (\S+)$/m);
assert(reviewedEnvMatch,`migrate job must declare REVIEWED_SUPABASE_PROJECT_REF`);
assert.equal(reviewedEnvMatch[1],EXPECTED_REF);

const getMigrateStep=(labelPrefix)=>{
  const after=migrateJob.split(`- name: ${labelPrefix}`)[1];
  assert(after,`Missing migrate step: ${labelPrefix}`);
  return after.split('\n      - ')[0];
};

const credStep=getMigrateStep('Validate Supabase migration credentials');
assert(credStep.includes('id: supabase_credentials'),'credential validation step must expose step id');
assert(credStep.includes('SUPABASE_PROJECT_REF_VAR: ${{ vars.SUPABASE_PROJECT_REF }}'));
assert(credStep.includes('SUPABASE_PROJECT_REF_SECRET: ${{ secrets.SUPABASE_PROJECT_REF }}'));

const credShell=credStep.split('        run: |\n')[1].split('\n').map(line=>line.replace(/^          /,'')).join('\n');

const hostedSteps=[
  'Link production Supabase project',
  'Verify local and remote Supabase migration history',
  'Migration dry-run (remote production database)',
  'Apply production migrations (manual apply_and_deploy only)',
  'Deploy reviewed WhatsApp Edge Functions (manual apply_and_deploy only)',
];
for(const stepName of hostedSteps){
  assert(migrateJob.indexOf('Validate Supabase migration credentials')<migrateJob.indexOf(stepName),
    `${stepName} must run only after Validate Supabase migration credentials`);
  const stepBlock=getMigrateStep(stepName);
  assert(stepBlock.includes('SUPABASE_PROJECT_REF: ${{ steps.supabase_credentials.outputs.project_ref }}'),
    `${stepName} must use validated steps.supabase_credentials.outputs.project_ref`);
  assert(!stepBlock.includes('secrets.SUPABASE_PROJECT_REF'),
    `${stepName} must not reuse raw secrets.SUPABASE_PROJECT_REF`);
  assert(!stepBlock.includes('vars.SUPABASE_PROJECT_REF'),
    `${stepName} must not bypass validation with raw vars.SUPABASE_PROJECT_REF`);
}

// Diagnostics must never hardcode the literal project ref in an echo, otherwise
// GitHub masks it inside a whitespace-padded secret and the log hides the cause.
const echoLines=credShell.split('\n').filter(line=>/^\s*echo\s/.test(line));
assert(echoLines.length>0);
for(const line of echoLines){
  assert(!line.includes(EXPECTED_REF),
    `validation log lines must not hardcode the reviewed ref (GitHub masks it when a secret is "${'\\t'}${EXPECTED_REF}"): ${line.trim()}`);
}
// The target-project guard itself must still compare against the literal ref.
assert(credShell.includes(`"$SUPABASE_PROJECT_REF" != "${EXPECTED_REF}"`),'target-project guard must stay literal');

const tempRoot=mkdtempSync(join(tmpdir(),'studioflow-prod-ref-'));
try {
  const TOKEN_SENTINEL='sbp_secret_access_token_sentinel_do_not_print';
  const PASS_SENTINEL='db_secret_password_sentinel_do_not_print';
  const WRONG_SECRET_SENTINEL='gsahfgwhhpjwtpmhozkm';

  const runCredValidation=(overrides={})=>{
    const outFile=join(tempRoot,`github-output-${Math.random().toString(36).slice(2)}.txt`);
    writeFileSync(outFile,'','utf8');
    const env={
      PATH:process.env.PATH,
      HOME:process.env.HOME,
      GITHUB_OUTPUT:outFile,
      REVIEWED_SUPABASE_PROJECT_REF:reviewedEnvMatch[1],
      SUPABASE_ACCESS_TOKEN:TOKEN_SENTINEL,
      SUPABASE_DB_PASSWORD:PASS_SENTINEL,
      SUPABASE_PROJECT_REF_VAR:'',
      SUPABASE_PROJECT_REF_SECRET:'',
      ...overrides,
    };
    const res=spawnSync('bash',['-c',credShell],{env,encoding:'utf8'});
    const combined=`${res.stdout??''}\n${res.stderr??''}`;
    assert(!combined.includes(TOKEN_SENTINEL),'must never print SUPABASE_ACCESS_TOKEN');
    assert(!combined.includes(PASS_SENTINEL),'must never print SUPABASE_DB_PASSWORD');
    if(env.SUPABASE_PROJECT_REF_SECRET && !env.SUPABASE_PROJECT_REF_SECRET.includes(EXPECTED_REF)){
      const trimmedSecret=env.SUPABASE_PROJECT_REF_SECRET.trim();
      if(trimmedSecret){
        assert(!combined.includes(trimmedSecret),'must never print wrong secret project ref value');
      }
    }
    const outputContent=readFileSync(outFile,'utf8');
    return {status:res.status,stdout:res.stdout,stderr:res.stderr,combined,outputContent};
  };

  // 1. Valid references succeed across reviewed config, GitHub variable, GitHub secret, and surrounding whitespace.
  for(const [label,overrides,expectWarning] of [
    ['reviewed workflow default (no secret required)',{},false],
    ['exact vars.SUPABASE_PROJECT_REF',{SUPABASE_PROJECT_REF_VAR:EXPECTED_REF},false],
    ['exact secrets.SUPABASE_PROJECT_REF',{SUPABASE_PROJECT_REF_SECRET:EXPECTED_REF},false],
    ['leading tab in secrets.SUPABASE_PROJECT_REF (Run #22 pattern)',{SUPABASE_PROJECT_REF_SECRET:`\t${EXPECTED_REF}`},'leading tab'],
    ['trailing CRLF in secrets.SUPABASE_PROJECT_REF',{SUPABASE_PROJECT_REF_SECRET:`${EXPECTED_REF}\r\n`},'trailing CR,LF'],
    ['surrounding spaces/tabs/CRLF in vars.SUPABASE_PROJECT_REF',{SUPABASE_PROJECT_REF_VAR:` \t\r\n${EXPECTED_REF}\r\n\t `},'leading tab,CR,LF,space and trailing tab,CR,LF,space'],
    ['consistent vars and whitespace-padded secret',{SUPABASE_PROJECT_REF_VAR:EXPECTED_REF,SUPABASE_PROJECT_REF_SECRET:`\t${EXPECTED_REF}\n`},'leading tab and trailing LF'],
  ]){
    const res=runCredValidation(overrides);
    assert.equal(res.status,0,`${label} should succeed: ${res.combined}`);
    assert.equal(res.outputContent,`project_ref=${EXPECTED_REF}\n`,`${label} must emit exact clean project_ref output`);
    if(expectWarning){
      assert(res.combined.includes('::warning::') && res.combined.includes(expectWarning),
        `${label} should warn about ${expectWarning}, got: ${res.combined}`);
    } else {
      assert(!res.combined.includes('::warning::'),`${label} should not warn when already clean: ${res.combined}`);
    }
  }

  // 2. Wrong references, internal whitespace, whitespace-only values, conflicts, and missing secrets fail before hosted operations.
  for(const [label,overrides,expectedSnippet] of [
    ['missing SUPABASE_ACCESS_TOKEN',{SUPABASE_ACCESS_TOKEN:''},'did not provide SUPABASE_ACCESS_TOKEN'],
    ['missing SUPABASE_DB_PASSWORD',{SUPABASE_DB_PASSWORD:''},'did not provide SUPABASE_DB_PASSWORD'],
    ['wrong secret ref without whitespace',{SUPABASE_PROJECT_REF_SECRET:WRONG_SECRET_SENTINEL},'no surrounding whitespace was found; the stored value is a different reference'],
    ['wrong secret ref WITH leading tab and CRLF',{SUPABASE_PROJECT_REF_SECRET:`\t${WRONG_SECRET_SENTINEL}\r\n`},'even after trimming leading tab and trailing CR,LF. Stored value is a different reference, not merely surrounding whitespace'],
    ['wrong vars ref without whitespace',{SUPABASE_PROJECT_REF_VAR:'otherprojectref12345'},'vars.SUPABASE_PROJECT_REF does not match'],
    ['full Supabase URL instead of project ref',{SUPABASE_PROJECT_REF_SECRET:`\thttps://${EXPECTED_REF}.supabase.co\r\n`},'Configure only the 20-character project reference ID, not a Supabase URL or hostname'],
    ['internal space in project ref',{SUPABASE_PROJECT_REF_SECRET:'zilwgiuiyg qqardzutxi'},'contains internal whitespace'],
    ['internal tab in project ref',{SUPABASE_PROJECT_REF_SECRET:'zilwgiuiyg\tqqardzutxi'},'contains internal whitespace'],
    ['internal newline / multiline in project ref',{SUPABASE_PROJECT_REF_SECRET:`${EXPECTED_REF}\n${WRONG_SECRET_SENTINEL}`},'contains internal whitespace'],
    ['surrounding + internal whitespace',{SUPABASE_PROJECT_REF_VAR:`\tzilwgiuiyg qqardzutxi\r\n`},'contains internal whitespace'],
    ['whitespace-only tab secret',{SUPABASE_PROJECT_REF_SECRET:'\t'},'contains only whitespace'],
    ['whitespace-only CRLF/spaces var',{SUPABASE_PROJECT_REF_VAR:'  \r\n\t '},'contains only whitespace'],
    ['conflicting valid var + wrong secret',{SUPABASE_PROJECT_REF_VAR:EXPECTED_REF,SUPABASE_PROJECT_REF_SECRET:WRONG_SECRET_SENTINEL},'vars.SUPABASE_PROJECT_REF is valid, but secrets.SUPABASE_PROJECT_REF conflicts'],
    ['conflicting wrong var + valid secret',{SUPABASE_PROJECT_REF_VAR:'wrongprojectref00000',SUPABASE_PROJECT_REF_SECRET:EXPECTED_REF},'SUPABASE_PROJECT_REF in vars.SUPABASE_PROJECT_REF does not match'],
    ['tampered REVIEWED_SUPABASE_PROJECT_REF with unset overrides',{REVIEWED_SUPABASE_PROJECT_REF:'arbitraryproject0000'},'does not match this repository\'s reviewed StudioFlow project'],
  ]){
    const res=runCredValidation(overrides);
    assert.notEqual(res.status,0,`${label} must fail`);
    assert.equal(res.outputContent,'',`${label} must not emit project_ref output on failure`);
    assert(res.combined.includes(expectedSnippet),`${label} expected "${expectedSnippet}", got: ${res.combined}`);
  }

  // 3. End-to-end propagation: normalize "\tzilwgiuiygqqardzutxi\r\n" once and execute every hosted step's shell command against a mock supabase CLI.
  const binDir=join(tempRoot,'bin');
  const callsFile=join(tempRoot,'supabase-calls.jsonl');
  spawnSync('mkdir',['-p',binDir]);
  const mockSupabase=join(binDir,'supabase');
  writeFileSync(mockSupabase,`#!/usr/bin/env node
const fs = require('node:fs');
const argv = process.argv.slice(2);
fs.appendFileSync(process.env.MOCK_SUPABASE_LOG, JSON.stringify({
  argv,
  envRef: process.env.SUPABASE_PROJECT_REF,
}) + '\\n');
if(argv[0] === 'migration' && argv[1] === 'list'){
  const versions = fs.readdirSync('supabase/migrations')
    .filter(name => /^\\d{14}_.+\\.sql$/.test(name))
    .map(name => name.slice(0,14))
    .sort();
  const pendingVersions = new Set(JSON.parse(fs.readFileSync('docs/integrations/restored-supabase-history.json','utf8'))
    .release_pending_migrations.map(record => record.file.split('_',1)[0]));
  const rows = [
    'LOCAL | REMOTE | TIME (UTC)',
    '------|--------|----------',
    ...versions.map(version => {
      const tick = String.fromCharCode(96);
      const remote = pendingVersions.has(version) ? '' : tick+version+tick;
      return tick+version+tick+' | '+remote+' | '+tick+'2026-11-19 00:00:00'+tick;
    })
  ];
  process.stdout.write(rows.join('\\n')+'\\n');
}
`,'utf8');
  chmodSync(mockSupabase,0o755);
  writeFileSync(callsFile,'','utf8');

  const validated=runCredValidation({SUPABASE_PROJECT_REF_SECRET:`\t${EXPECTED_REF}\r\n`});
  assert.equal(validated.status,0);
  const propagatedRef=validated.outputContent.trim().split('=')[1];
  assert.equal(propagatedRef,EXPECTED_REF);

  const extractStepCommand=(stepName)=>{
    const block=getMigrateStep(stepName);
    if(block.includes('        run: >-\n')){
      return block.split('        run: >-\n')[1].trim().split('\n').map(l=>l.trim()).join(' ');
    }
    if(block.includes('        run: |\n')){
      return block.split('        run: |\n')[1].split('\n').map(l=>l.replace(/^          /,'')).join('\n').trim();
    }
    return block.split('        run: ')[1].split('\n')[0].trim();
  };

  for(const stepName of hostedSteps){
    const cmd=extractStepCommand(stepName);
    const stepRes=spawnSync('bash',['-euo','pipefail','-c',cmd],{
      env:{
        ...process.env,
        PATH:`${binDir}:${process.env.PATH}`,
        MOCK_SUPABASE_LOG:callsFile,
        SUPABASE_ACCESS_TOKEN:TOKEN_SENTINEL,
        SUPABASE_DB_PASSWORD:PASS_SENTINEL,
        SUPABASE_PROJECT_REF:propagatedRef,
      },
      encoding:'utf8',
    });
    assert.equal(stepRes.status,0,`${stepName} command failed under mock CLI: ${stepRes.stderr}`);
  }

  const calls=readFileSync(callsFile,'utf8').trim().split('\n').map(line=>JSON.parse(line));
  assert.equal(calls.length,5);
  for(const call of calls){
    assert.equal(call.envRef,EXPECTED_REF,'propagated SUPABASE_PROJECT_REF env has zero whitespace');
  }

  // Exercise the production history parser against a remote-only timestamp row.
  const localVersions=readdirSync('supabase/migrations')
    .filter(name=>/^\d{14}_.+\.sql$/.test(name))
    .map(name=>name.slice(0,14)).sort();
  const pendingVersions = new Set(JSON.parse(readFileSync('docs/integrations/restored-supabase-history.json','utf8'))
    .release_pending_migrations.map(record => record.file.split('_',1)[0]));
  const baseMigrationList=[
    'LOCAL | REMOTE | TIME (UTC)',
    '------|--------|----------',
    ...localVersions.map(version => {
      const remote = pendingVersions.has(version) ? '' : '`'+version+'`';
      return '`'+version+'` | '+remote+' | `2026-11-19 00:00:00`';
    })
  ].join('\n');
  const remoteOnlyResult=spawnSync('node',['scripts/verify-supabase-migration-history.mjs'],{
    env:{
      ...process.env,
      SUPABASE_MIGRATION_LIST_OUTPUT:baseMigrationList+'\n              | `20990101000000` | `2099-01-01 00:00:00`',
    },
    encoding:'utf8',
  });
  assert.notEqual(remoteOnlyResult.status,0,'remote-only applied migration must fail closed');
  const remoteOnlyOutput=(remoteOnlyResult.stdout||'')+'\\n'+(remoteOnlyResult.stderr||'');
  assert(remoteOnlyOutput.includes('20990101000000'),
    'remote-only failure must identify the unmatched remote version: '+remoteOnlyOutput);

  const duplicateRemoteResult=spawnSync('node',['scripts/verify-supabase-migration-history.mjs'],{
    env:{
      ...process.env,
      SUPABASE_MIGRATION_LIST_OUTPUT:baseMigrationList+'\n              | `20261118203000` | `2026-11-18 20:30:00`',
    },
    encoding:'utf8',
  });
  assert.notEqual(duplicateRemoteResult.status,0,'duplicate remote migration history row must fail closed');
  const duplicateRemoteOutput=(duplicateRemoteResult.stdout||'')+'\\n'+(duplicateRemoteResult.stderr||'');
  assert(duplicateRemoteOutput.includes('duplicate remote migration history rows'),
    'duplicate remote failure must explain the duplicate history row: '+duplicateRemoteOutput);

  assert.deepEqual(calls[0].argv,['link','--project-ref',EXPECTED_REF]);
  assert.deepEqual(calls[1].argv,['migration','list',`--remote=${EXPECTED_REF}`,'--password',PASS_SENTINEL]);
  assert.deepEqual(calls[2].argv,['db','push','--dry-run',`--remote=${EXPECTED_REF}`,'--password',PASS_SENTINEL]);
  assert.deepEqual(calls[3].argv,['db','push',`--remote=${EXPECTED_REF}`,'--password',PASS_SENTINEL,'--yes']);
  assert.deepEqual(calls[4].argv,[
    'functions','deploy',
    'nexora-whatsapp-connect','nexora-whatsapp-webhook',
    'studioflow-payments','studioflow-whatsapp-booking','studioflow-booking-emails',
    `--remote=${EXPECTED_REF}`,'--use-api',
  ]);
} finally {
  rmSync(tempRoot,{recursive:true,force:true});
}

console.log('PASS: one release dropdown; all main pushes run remote migration-history validation and a read-only dry-run; only the approved apply_and_deploy mode applies migrations and deploys functions; deploy_only skips database changes; CI and migration failure block deployment; validated Supabase project references propagate to all hosted CLI steps.');

// --- Edge Function deployment contract -----------------------------------
// Every function the Production workflow deploys must have an explicit
// config.toml entry. Without one the Supabase CLI falls back to the gateway
// default (verify_jwt = true), which silently changes the function's auth
// contract -- exactly how studioflow-booking-emails would have shipped with a
// gateway JWT check that breaks its CORS preflight and GET status probe.
const { readFileSync: readCfg } = await import('node:fs');
const supabaseConfig = readCfg('supabase/config.toml', 'utf8');
const deployStepBlock = getMigrateStep('Deploy reviewed WhatsApp Edge Functions (manual apply_and_deploy only)');
const deployRun = deployStepBlock.split('        run: >-\n')[1];
assert(deployRun, 'Edge Function deploy step must use a folded run block');
const deployedFunctions = deployRun
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => /^[a-z0-9-]+(\s+[a-z0-9-]+)*$/.test(line) && !line.startsWith('supabase'))
  .flatMap((line) => line.split(/\s+/));
assert(deployedFunctions.length >= 5, `expected the reviewed function set, parsed ${deployedFunctions.length}`);
for (const name of deployedFunctions) {
  const block = supabaseConfig.split(`[functions.${name}]`)[1];
  assert(block, `Production deploys ${name} but supabase/config.toml has no [functions.${name}] entry; the CLI would deploy it with the gateway default verify_jwt = true`);
  const verifyJwt = block.split('\n').map((line) => line.trim()).find((line) => line.startsWith('verify_jwt'));
  assert(verifyJwt, `[functions.${name}] must state verify_jwt explicitly`);
}
// The container's last entry must not bleed into the next function.
assert(!/[^#]\n\[functions\./.test(supabaseConfig.slice(0, supabaseConfig.indexOf('[functions.') + 1)),
  'config.toml must start function blocks at column 0');

// These two are public by design and must never gain a gateway JWT check.
for (const name of ['nexora-whatsapp-webhook', 'studioflow-whatsapp-booking']) {
  const block = supabaseConfig.split(`[functions.${name}]`)[1].split('[')[0];
  assert(block.includes('verify_jwt = false'), `${name} must keep verify_jwt = false (provider signature / dedicated API key in handler)`);
}
// The owner connect endpoint must keep gateway JWT verification.
assert(supabaseConfig.split('[functions.nexora-whatsapp-connect]')[1].split('[')[0].includes('verify_jwt = true'),
  'nexora-whatsapp-connect must keep verify_jwt = true');
