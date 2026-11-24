import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await build({
  entryPoints: ['server/storefrontRenderer.tsx'],
  outfile: 'dist/storefront-renderer.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  packages: 'external',
  treeShaking: true,
  legalComments: 'none',
  sourcemap: true,
  assetNames: 'assets/[name]-[hash]',
  publicPath: '/',
  loader: {
    '.css': 'empty',
    '.svg': 'file',
    '.png': 'file',
    '.jpg': 'file',
    '.jpeg': 'file',
    '.webp': 'file',
    '.avif': 'file',
    '.gif': 'file',
    '.woff': 'file',
    '.woff2': 'file',
    '.mp4': 'file',
    '.webm': 'file',
  },
  define: {
    'import.meta.env': JSON.stringify({ DEV: false, PROD: true, MODE: 'production' }),
  },
});
console.log('Built the server-side published salon renderer.');
