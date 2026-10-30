import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The dev server runs in middleware mode behind server.ts and is also proxied
  // through a sandbox preview host (e.g. *.e2b.app), so Vite's dev host allowlist
  // must accept forwarded Host headers or every request fails with HTTP 403.
  server: {
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (
          warning.code === 'MODULE_LEVEL_DIRECTIVE' ||
          (warning.message && warning.message.includes('use client'))
        ) {
          return;
        }
        warn(warning);
      },
    },
  },
});
