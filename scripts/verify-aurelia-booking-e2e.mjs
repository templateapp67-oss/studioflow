import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
const result=await build({entryPoints:['scripts/verify-aurelia-booking-e2e.tsx'],bundle:true,platform:'node',format:'esm',packages:'external',write:false,loader:{'.css':'empty','.jpg':'dataurl','.png':'dataurl','.webp':'dataurl'}});
if(result.errors.length){for(const error of result.errors)console.error(error.text);process.exit(1);}
const checked=spawnSync(process.execPath,['--input-type=module'],{input:result.outputFiles[0].text,stdio:['pipe','inherit','inherit']});
if(checked.error)throw checked.error;process.exitCode=checked.status??1;
