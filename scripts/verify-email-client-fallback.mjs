import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';

const result = await build({
  entryPoints: ['scripts/verify-email-client-fallback.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  write: false,
  plugins: [{
    name: 'stub-supabase-client',
    setup(build) {
      build.onLoad({ filter: /src\/lib\/supabase\.ts$/ }, () => ({
        contents: `export const supabase = {
          auth: { getSession: (...args) => globalThis.__emailGetSession(...args) },
          functions: { invoke: (...args) => globalThis.__emailInvoke(...args) },
        };`,
        loader: 'ts',
      }));
    },
  }],
});
const checked = spawnSync(process.execPath, ['--input-type=module'], {
  input: result.outputFiles[0].text,
  stdio: ['pipe', 'inherit', 'inherit'],
});
if (checked.error) throw checked.error;
process.exitCode = checked.status ?? 1;
