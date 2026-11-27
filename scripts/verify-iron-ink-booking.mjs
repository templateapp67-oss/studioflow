import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
// react-test-renderer has no DOM animation clock. Keep real motion components,
// but let page/step transitions settle immediately for this interaction test.
const testAssets={name:'test-assets',setup(build){
  build.onResolve({filter:/^framer-motion$/},args=>args.namespace==='test-motion'?{path:args.path,external:true}:{path:'motion',namespace:'test-motion'});
  build.onLoad({filter:/.*/,namespace:'test-motion'},()=>({contents:'export * from "framer-motion"; export const AnimatePresence = ({children}) => children;',loader:'js'}));
  build.onLoad({filter:/\.(png|jpe?g|webp)$/},()=>({contents:'export default "https://example.com/test-image.jpg";',loader:'js'}));
  build.onLoad({filter:/\.css$/},()=>({contents:'export default "";',loader:'js'}));
}};
const result=await build({entryPoints:['scripts/verify-iron-ink-booking.tsx'],bundle:true,platform:'node',format:'esm',packages:'external',write:false,plugins:[testAssets]});
const checked=spawnSync(process.execPath,['--input-type=module'],{input:result.outputFiles[0].text,stdio:['pipe','inherit','inherit']});
if(checked.error)throw checked.error;process.exitCode=checked.status??1;
