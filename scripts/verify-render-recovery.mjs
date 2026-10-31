import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
const result=await build({entryPoints:['scripts/verify-render-recovery.tsx'],bundle:true,loader:{'.css':'empty'},platform:'node',format:'esm',packages:'external',write:false,plugins:[{name:'assets',setup(b){b.onLoad({filter:/\.(png|jpe?g|webp)$/},()=>({contents:'export default "https://example.com/image.jpg"',loader:'js'}));}}]});
const run=spawnSync(process.execPath,['--input-type=module'],{input:result.outputFiles[0].text,stdio:['pipe','inherit','inherit']});process.exitCode=run.status??1;
