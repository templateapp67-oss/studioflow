import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
mkdirSync('.tmp-audit',{recursive:true});
await build({entryPoints:['scripts/_render-all-templates.tsx'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:'.tmp-audit/render-all.mjs',loader:{'.css':'empty','.jpg':'dataurl','.png':'dataurl','.webp':'dataurl','.svg':'text','.woff2':'dataurl'}});
const run=spawnSync(process.execPath,['.tmp-audit/render-all.mjs',...process.argv.slice(2)],{stdio:'inherit'});
if(run.error)throw run.error;process.exitCode=run.status??1;
