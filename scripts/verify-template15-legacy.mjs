// Compare every original template's complete config (including services/staff)
// with the session's base commit, not just its name or template ID.
import {build} from 'esbuild';
import {execFileSync,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const original=execFileSync('git',['show','12db7865882041fa711d8d5581b8c1f98c5f112d:src/categoryTemplates.ts'],{encoding:'utf8'});
async function catalogue(baseline){
 const result=await build({stdin:{contents:"import {CATEGORY_TEMPLATES} from './src/categoryTemplates';console.log(JSON.stringify(Object.values(CATEGORY_TEMPLATES).filter(t=>t.id!=='mens_hair_studio')));",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',write:false,loader:{'.css':'empty','.jpg':'dataurl','.png':'dataurl','.webp':'dataurl'},plugins:baseline?[{name:'original-template-registry',setup(b){b.onLoad({filter:/[/\\]src[/\\]categoryTemplates\.ts$/},args=>({contents:original,loader:'ts',resolveDir:args.path.replace(/[/\\][^/\\]+$/,'')}));}}]:[]});
 const run=spawnSync(process.execPath,['--input-type=module'],{input:result.outputFiles[0].text,encoding:'utf8',maxBuffer:30*1024*1024});
 if(run.status!==0)throw new Error(run.stderr);return JSON.parse(run.stdout);
}
const before=await catalogue(true),after=await catalogue(false);
assert.equal(before.length,14);assert.equal(after.length,14);assert.deepEqual(after,before);
console.log('Template 15 regression: all fourteen original template configs, designs, services, prices, staff and asset references are byte-for-byte equivalent as parsed JSON to the base registry.');
