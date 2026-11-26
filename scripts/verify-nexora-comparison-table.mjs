import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';

/**
 * Pricing comparison table verification (release gate).
 *
 * Bundles the real React table components server-side (CSS imports stubbed, as
 * in `verify-nexora-pricing-landing.mjs`) and runs the assertions in
 * `scripts/_verify-nexora-comparison-table-suite.mjs`, which inspects the
 * rendered DOM of every feature x plan cell.
 */
const result = await build({
  entryPoints: ['scripts/_verify-nexora-comparison-table-suite.mjs'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  write: false,
  plugins: [
    {
      name: 'test-asset-stubs',
      setup(build) {
        build.onLoad({ filter: /\.(png|jpe?g|webp|svg)$/ }, () => ({ contents: 'export default "/test-image.svg";', loader: 'js' }));
        build.onLoad({ filter: /\.css$/ }, () => ({ contents: 'export default "";', loader: 'js' }));
      },
    },
  ],
});
const checked = spawnSync(process.execPath, ['--input-type=module'], { input: result.outputFiles[0].text, stdio: ['pipe', 'inherit', 'inherit'] });
if (checked.error) throw checked.error;
process.exitCode = checked.status ?? 1;
