import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const result = await build({
  entryPoints: ['scripts/verify-client-export.tsx'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  write: false,
  // Component-scoped stylesheets are irrelevant to this Node-only harness;
  // stub them the same way the other offline verification runners do.
  loader: { '.css': 'empty' },
  plugins: [
    {
      // The CRM workspace needs a Supabase session to return rows; the real
      // browser client has none in Node, which left the export button
      // permanently disabled and the click path untested.
      name: 'supabase-stub',
      setup(build) {
        build.onResolve({ filter: /(^|\/)lib\/supabase$/ }, (args) => ({
          path: resolve('scripts/client-export-supabase-stub.ts'),
        }));
      },
    },
    {
      name: 'test-image-stubs',
      setup(build) {
        build.onLoad({ filter: /\.(png|jpe?g|webp|svg)$/ }, () => ({
          contents: 'export default "https://example.com/test-image.jpg";',
          loader: 'js',
        }));
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
