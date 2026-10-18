import {randomUUID} from 'node:crypto';
import {retainScreenAssets} from './scripts/retain-screen-assets.mjs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const screenBuild=randomUUID();
  return {
    plugins: [react(), tailwindcss(),retainScreenAssets(),{name:'nexora-app-version',generateBundle(){this.emitFile({type:'asset',fileName:'app-version.json',source:JSON.stringify({version:screenBuild})})}}],
    define:{'import.meta.env.VITE_SCREEN_BUILD':JSON.stringify(screenBuild)},
    build:{rollupOptions:{output:{inlineDynamicImports:true}}},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
