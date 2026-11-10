import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';

/**
 * Clinic Journal XSS gate.
 *
 * Bundles the real renderer (`src/components/dermacure/JournalInlineText.tsx`)
 * with React server rendering and runs the assertions in
 * `scripts/_verify-journal-richtext-suite.tsx`, which feed known XSS payloads
 * through the component and require that every one of them is escaped.
 */
const result = await build({
  entryPoints: ['scripts/_verify-journal-richtext-suite.tsx'],
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
const checked = spawnSync(process.execPath, ['--input-type=module'], {
  input: result.outputFiles[0].text,
  stdio: ['pipe', 'inherit', 'inherit'],
});
if (checked.error) throw checked.error;
process.exitCode = checked.status ?? 1;
