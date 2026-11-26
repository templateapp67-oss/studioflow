import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

// Replace the shared Supabase client with an offline stub. A plugin is used
// because esbuild's `alias` only accepts bare specifiers, and these imports
// are relative (`../lib/supabase`).
const stubPlugin = {
  name: 'supabase-stub',
  setup(build) {
    build.onResolve({filter: /(^|\/)supabase$/}, (args) => ({
      path: path.resolve('scripts/staff-invite-ui-supabase-stub.ts'),
    }));
  },
};

const result = await build({
  entryPoints:['scripts/verify-staff-invite-ui.tsx'],
  bundle:true,platform:'node',format:'esm',packages:'external',write:false,
  loader:{'.css':'empty','.jpg':'dataurl','.png':'dataurl','.webp':'dataurl'},
  plugins:[stubPlugin],
});
// `react-test-renderer` is deprecated and prints a message through console.error
// on every root; the deprecation notice is not a test failure.
const checked=spawnSync(process.execPath,['--input-type=module'],{input:result.outputFiles[0].text,stdio:['pipe','inherit','inherit'],env:{...process.env,SUPPRESS_DEPRECATION:'1'}});
if(checked.error)throw checked.error;process.exitCode=checked.status??1;
