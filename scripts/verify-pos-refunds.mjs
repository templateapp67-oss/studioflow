import {spawnSync} from 'node:child_process';
const run=spawnSync(process.execPath,['--import','tsx','scripts/verify-pos-refunds.tsx'],{stdio:'inherit'});
if(run.error||run.status)process.exit(run.status||1);
