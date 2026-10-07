import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works from any path (e.g. GitHub Pages' /floe-market/).
  base: './',
  // three.js alone is ~550 kB minified, and the game ~700 kB; Firebase (cloud saves) is its own chunk, fetched on demand.
  build: { chunkSizeWarningLimit: 800 },
  test: {
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text', 'text-summary'],
      // CI fails below these. Set a little under current coverage so new code needs tests, without busywork.
      thresholds: { lines: 95, statements: 95, functions: 95, branches: 85 },
    },
  },
});
