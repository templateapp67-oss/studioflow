import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
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
