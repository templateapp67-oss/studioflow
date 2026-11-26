import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
const result = await build({ entryPoints: ['scripts/verify-onboarding-copy.tsx'], bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false, plugins: [{ name: 'asset-stubs', setup(b) { b.onLoad({ filter: /\.(png|jpe?g|webp|css)$/ }, () => ({ contents: 'export default ""', loader: 'js' })); } }] });
const run = spawnSync(process.execPath, ['--input-type=module'], { input: result.outputFiles[0].text, stdio: ['pipe', 'inherit', 'inherit'] });
if (run.error) throw run.error;
process.exitCode = run.status ?? 1;
