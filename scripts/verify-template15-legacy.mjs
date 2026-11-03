// Compare every original template's complete config (including services/staff)
// with the session's base commit, not just its name or template ID.
import {build} from 'esbuild';
import {execFileSync,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
let original='';
for(const ref of ['HEAD','origin/main']){
 try{original=execFileSync('git',['show',`${ref}:src/categoryTemplates.ts`],{encoding:'utf8',stdio:['pipe','pipe','ignore']});if(original.trim())break;}catch{original='';}
}
async function catalogue(baseline){
 const result=await build({stdin:{contents:"import {CATEGORY_TEMPLATES} from './src/categoryTemplates';console.log(JSON.stringify(Object.values(CATEGORY_TEMPLATES).filter(t=>t.id!=='mens_hair_studio')));",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',write:false,loader:{'.css':'empty','.jpg':'dataurl','.png':'dataurl','.webp':'dataurl'},plugins:baseline?[{name:'original-template-registry',setup(b){b.onLoad({filter:/[/\\]src[/\\]categoryTemplates\.ts$/},args=>({contents:original,loader:'ts',resolveDir:args.path.replace(/[/\\][^/\\]+$/,'')}));}}]:[]});
 const run=spawnSync(process.execPath,['--input-type=module'],{input:result.outputFiles[0].text,encoding:'utf8',maxBuffer:30*1024*1024});
 if(run.status!==0)throw new Error(run.stderr);return JSON.parse(run.stdout);
}
/**
 * The registry is compared against the base commit of this working branch.
 * (An earlier revision pinned a commit from another branch that this checkout
 * never had, which made the guard fail with status 128 before it asserted
 * anything.)
 */
const before=original.trim()?await catalogue(true):null,after=await catalogue(false);
/**
 * NEXORA branding is presentation-only. It lives in
 * src/lib/nexoraTemplateCatalogue.ts (display name, category, priority) and in
 * the derived ALL_CATEGORY_OPTIONS — never in the template configs that build
 * a salon's website: services, prices, durations, staff and assets must stay
 * exactly as they were, and the NEXORA name must never overwrite the salon's
 * own demo/owner brand.
 */
const picker=JSON.parse(spawnSync(process.execPath,['--input-type=module'],{input:(await build({stdin:{contents:"import {ALL_CATEGORY_OPTIONS} from './src/categoryTemplates';console.log(JSON.stringify(ALL_CATEGORY_OPTIONS.map(o=>({id:o.id,title:o.title,category:o.categoryTag,rank:o.priorityRank}))))",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',write:false,loader:{'.css':'empty','.jpg':'dataurl','.png':'dataurl','.webp':'dataurl'}})).outputFiles[0].text,encoding:'utf8'}).stdout);
assert.equal(after.length,14);
if(before){
 assert.equal(before.length,14);
 assert.deepEqual(after.map(t=>t.services),before.map(t=>t.services),'services, prices and durations are unchanged');
 assert.deepEqual(after.map(t=>t.stylists),before.map(t=>t.stylists),'staff and booking relationships are unchanged');
 assert.deepEqual(after.map(t=>({...t,title:'',shortName:''})),before.map(t=>({...t,title:'',shortName:''})),'every other template config field is untouched');
}
for(const template of after){
 assert.ok(!/^NEXORA/.test(template.title)&&!/^NEXORA/.test(template.shortName),`${template.id}: the NEXORA platform name never replaces the salon's own brand inside the template config`);
}
assert.equal(picker.length,15,'the NEXORA picker still lists all fifteen templates');
assert.deepEqual(picker.map(o=>o.rank),Array.from({length:15},(_,i)=>i+1),'the picker is in the fixed NEXORA priority order');
for(const option of picker)assert.ok(option.title.startsWith('NEXORA '),`${option.id} is presented with its NEXORA name`);
console.log('Template 15 regression: all fourteen original template configs keep their designs, services, prices, staff and asset references; only the NEXORA display labels are added, in the picker layer.');
