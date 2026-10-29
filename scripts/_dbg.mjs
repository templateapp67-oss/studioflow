import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
const entry = process.argv[2];
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', packages: 'external', outfile: 'scripts/_dbgout.mjs', sourcemap: 'inline', loader: { '.css': 'empty', '.jpg': 'dataurl', '.png': 'dataurl', '.svg': 'text' } });
const r = spawnSync(process.execPath, ['--enable-source-maps', 'scripts/_dbgout.mjs'], { encoding: 'utf8' });
console.log(r.stdout.slice(-3000));
console.log(r.stderr.slice(-3000));
process.exitCode = r.status ?? 1;
