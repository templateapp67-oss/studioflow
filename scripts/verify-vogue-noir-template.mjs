import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
const result=await build({entryPoints:['scripts/verify-vogue-noir-template.tsx'],bundle:true,platform:'node',format:'esm',packages:'external',write:false,loader:{'.css':'empty','.jpg':'dataurl','.png':'dataurl','.webp':'dataurl','.svg':'dataurl'}});
const checked=spawnSync(process.execPath,['--input-type=module'],{input:result.outputFiles[0].text,stdio:['pipe','inherit','inherit']});
if(checked.error)throw checked.error;process.exitCode=checked.status??1;
