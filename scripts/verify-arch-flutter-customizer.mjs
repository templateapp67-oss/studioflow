import { build } from 'esbuild'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url'; import { writeFileSync, unlinkSync } from 'node:fs'; import { join } from 'node:path';
const shim = fileURLToPath(new URL('./_reactDomPortalShim.tsx', import.meta.url));
/** `react-test-renderer` cannot render portals, so only the exact `react-dom`
 *  specifier is swapped for a shim that renders portal children inline.
 *  `react-dom/server` keeps resolving normally. */
const portalShimPlugin = { name: 'react-dom-portal-shim', setup(b) { b.onResolve({ filter: /^react-dom$/ }, () => ({ path: shim })); } };
const result = await build({ entryPoints: ['scripts/verify-arch-flutter-customizer.tsx'], bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false, plugins: [portalShimPlugin], loader: { '.css': 'empty', '.jpg': 'dataurl', '.png': 'dataurl', '.webp': 'dataurl' } });
const bundlePath = join(process.cwd(), '.verify-arch-flutter-customizer.bundle.mjs');
writeFileSync(bundlePath, result.outputFiles[0].text, 'utf8');
try {
  const checked = spawnSync(process.execPath, [bundlePath], { cwd: process.cwd(), stdio: 'inherit' });
  if (checked.error) throw checked.error;
  process.exitCode = checked.status ?? 1;
} finally {
  unlinkSync(bundlePath);
}
