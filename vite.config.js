import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return id.includes('/exceljs/') || id.includes('/jszip/') || id.includes('/pako/') ? 'excel' : 'vendor';
        },
      },
    },
    chunkSizeWarningLimit: 1100,
  },
});
