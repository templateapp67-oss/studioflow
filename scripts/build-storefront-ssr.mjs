import { build } from 'esbuild';
import { mkdir, readFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
const builtIndexHtml = await readFile('dist/index.html', 'utf8');
await build({
  entryPoints: ['server/storefrontRenderer.tsx'],
  outfile: 'dist/storefront-renderer.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  // Bundle the React/template runtime into the included CJS file. The
  // storefront function loads this file dynamically at runtime, so leaving
  // npm packages external can make Vercel's file tracer omit those modules.
  treeShaking: true,
  legalComments: 'none',
  // Server bundle source maps are intentionally not emitted: dist/ is a
  // public artifact directory and the SSR bundle is loaded dynamically at
  // runtime by the storefront function.
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
    '__NEXORA_STOREFRONT_ASSET_HTML__': JSON.stringify(builtIndexHtml),
  },
});
console.log('Built the server-side published salon renderer.');
