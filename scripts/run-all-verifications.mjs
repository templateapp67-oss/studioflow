// Runs every offline verification suite. The live Supabase integration
// (verify-supabase.mjs) is excluded: it needs network access plus a configured
// test project with email autoconfirm, so run it explicitly where allowed.
import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const SKIP=new Set(['verify-supabase.mjs']);
const suites=readdirSync('scripts').filter(name=>name.startsWith('verify-')&&name.endsWith('.mjs')&&!SKIP.has(name)).sort();
let failed=[];
for(const suite of suites){
 const started=Date.now();
 const run=spawnSync(process.execPath,['scripts/'+suite],{stdio:'inherit'});
 const seconds=((Date.now()-started)/1000).toFixed(1);
 if(run.error||run.status!==0){failed.push(suite);console.error(`FAIL ${suite} (${seconds}s)`);}
 else console.log(`ok ${suite} (${seconds}s)`);
}
console.log(`\n${suites.length-failed.length}/${suites.length} verification suites passed.`);
if(failed.length){console.error('Failed: '+failed.join(', '));process.exitCode=1;}
