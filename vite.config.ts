import type { Plugin } from 'vite';
import { configDefaults, defineConfig } from 'vitest/config';
import { ShardSequencer } from './test/shards.ts';

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

/** The page without the Ko-fi settings row (its link and its CSS), for a build without Ko-fi (flags.ts). */
export function withoutKofi(page: string) {
  const row = /[ \t]*<a id="kofi"[^>]*>[\s\S]*?<\/a>\n/, css = /\/\* the Ko-fi link[^*]*\*\/\n#kofi\{[^}]*\}\n#kofi i\{[^}]*\}\n/;
  if (!row.test(page) || !css.test(page)) throw new Error('index.html: no Ko-fi row to leave out');
  return page.replace(row, '').replace(css, '');
}

/** Leaves the Ko-fi row out of the page unless the game's built (or served) with VITE_KOFI=on: hiding it isn't enough,
 *  as the Steam build mustn't carry a link to a payment page outside Steam at all. */
function kofiToggle(): Plugin {
  let off = true;
  return {
    name: 'floe-kofi-toggle',
    configResolved(c) { off = c.env.VITE_KOFI !== 'on'; },
    transformIndexHtml: { order: 'pre', handler: page => off ? withoutKofi(page) : page },
  };
}

export default defineConfig({
  // Relative base so the build works from any path (e.g. GitHub Pages' /floe-market/).
  base: './',
  // three.js gets a chunk of its own: it changes far less often than the game, so a returning player's browser keeps it
  // cached across game updates. The game is the bigger part (the High graphics' models are built in code, not loaded);
  // Firebase (cloud saves) is its own chunk too, started on demand.
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }] } } },
  },
  plugins: [kofiToggle(), preloadManifest()],
  // the commit the game was built from (GitHub Actions sets it), which bug reports carry (report.ts)
  define: { __BUILD__: JSON.stringify(process.env.GITHUB_SHA ?? 'dev') },
  test: {
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    // firestore.rules' tests need the Firestore emulator: npm run test:rules
    exclude: [...configDefaults.exclude, 'test/rules/**', 'intake/**'],
    restoreMocks: true,
    // Loading the game builds both the Low and the High models (graphics.ts), and some tests load it several times.
    testTimeout: 15_000,
    unstubGlobals: true,
    // CI's shards split the files by how long they take (test/shards.ts)
    sequence: { sequencer: ShardSequencer },
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text', 'text-summary'],
      // CI fails below these. Set a little under current coverage so new code needs tests, without busywork. (CI runs
      // the tests in shards, each covering only part of the game: they're checked once the shards' reports are merged,
      // deploy.yml.)
      thresholds: process.env.VITEST_SHARD ? undefined : { lines: 95, statements: 95, functions: 95, branches: 85 },
    },
  },
});
