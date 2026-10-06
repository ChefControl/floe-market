import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from any path (e.g. GitHub Pages' /floe-market/).
  base: './',
  // three.js alone is ~500 kB minified.
  build: { chunkSizeWarningLimit: 700 },
});
