import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const shim = fileURLToPath(new URL('./_reactDomPortalShim.tsx', import.meta.url));
const portalShimPlugin = {
  name: 'react-dom-portal-shim',
  setup(b) {
    b.onResolve({ filter: /^react-dom$/ }, () => ({ path: shim }));
  },
};

const result = await build({
  entryPoints: ['scripts/verify-ziya-ui-flows.tsx'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  write: false,
  plugins: [portalShimPlugin],
  loader: { '.css': 'empty', '.jpg': 'dataurl', '.png': 'dataurl', '.webp': 'dataurl' },
});

const checked = spawnSync(process.execPath, ['--input-type=module'], {
  input: result.outputFiles[0].text,
  stdio: ['pipe', 'inherit', 'inherit'],
});
if (checked.error) throw checked.error;
process.exitCode = checked.status ?? 1;
