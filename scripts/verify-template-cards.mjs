import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
const result=await build({entryPoints:['scripts/verify-template-cards.tsx'],bundle:true,platform:'node',format:'esm',packages:'external',write:false,plugins:[{name:'test-image-stubs',setup(build){build.onLoad({filter:/\.(png|jpe?g|webp)$/},()=>({contents:'export default "https://example.com/test-image.jpg";',loader:'js'}));}}]});
const checked=spawnSync(process.execPath,['--input-type=module'],{input:result.outputFiles[0].text,stdio:['pipe','inherit','inherit']});
if(checked.error)throw checked.error;process.exitCode=checked.status??1;
