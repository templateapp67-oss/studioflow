import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const tsx=require.resolve('tsx/cli');
const run=spawnSync(process.execPath,[tsx,'scripts/verify-pos-refunds.tsx'],{stdio:'inherit'});
if(run.error||run.status)process.exit(run.status||1);
