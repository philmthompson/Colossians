import { defineConfig } from 'vite';

const buildDate = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'; // workflow test

export default defineConfig({
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 600, // three.js is ~480kB minified, expected
  },
});
