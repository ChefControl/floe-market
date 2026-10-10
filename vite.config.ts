import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * The loading screen (index.html) counts the game's scripts in as they download, so it needs their names and sizes
 * before they arrive: this writes them into the page as window.PRELOAD, and takes out the script tag that would start
 * the game at once. The page fetches every file itself, then adds that tag back to run the game from the cache.
 * Sizes are what the files hold, not what goes over the wire compressed, since that's what a fetch counts as it reads.
 */
function preloadManifest(): Plugin {
  return {
    name: 'floe-preload-manifest',
    apply: 'build',
    enforce: 'post',
    // last, after Vite's own touches to the chunks, so the sizes are the files' exactly
    generateBundle: { order: 'post', handler(_, bundle) {
      const html = bundle['index.html'];
      if (html?.type !== 'asset') return;
      const page = String(html.source), tag = /<script type="module" crossorigin src="([^"]+)"><\/script>\s*/;
      const entry = tag.exec(page)?.[1];
      if (!entry) this.error('index.html: no game script to preload');
      const base = entry.slice(0, entry.lastIndexOf('/') + 1).replace(/assets\/$/, '');
      const files = Object.values(bundle).filter(f => f.type === 'chunk')
        .map(c => [base + c.fileName, new TextEncoder().encode(c.code).length] as const);
      const manifest = `<script>window.PRELOAD=${JSON.stringify({ entry, files })}</script>\n`;
      html.source = page.replace(tag, '').replace('</head>', manifest + '</head>');
    } },
  };
}

export default defineConfig({
  // Relative base so the build works from any path (e.g. GitHub Pages' /floe-market/).
  base: './',
  // three.js and the game are ~930 kB minified together (the High graphics' models are built in code, not loaded);
  // Firebase (cloud saves) is its own chunk, started on demand.
  build: { chunkSizeWarningLimit: 1000 },
  plugins: [preloadManifest()],
  test: {
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    restoreMocks: true,
    // Loading the game builds both the Low and the High models (graphics.ts), and some tests load it several times.
    testTimeout: 15_000,
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
