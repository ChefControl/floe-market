// @ts-check
// Builds the desktop app: the game's Steam build into app/, then the program around it into out/.
//
//   node build.mjs                      the game, and the app for this computer
//   node build.mjs --platform=win32     for Windows (x64); --platform=linux for Linux and the Steam Deck (x64)
//   node build.mjs --game-only          just the game into app/ (then `npm start` plays it)
//
// The game is the Steam build (VITE_STEAM=on: no Firebase, no Ko-fi, src/flags.ts) with stage 3 on (VITE_STAGE3=on).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..');
const args = new Map(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? 'true'];
}));
const platform = /** @type {'win32' | 'linux' | 'darwin'} */ (args.get('platform') ?? process.platform);
const arch = args.get('arch') ?? (platform === 'darwin' ? process.arch : 'x64');
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const commit = process.env.GITHUB_SHA ?? git('rev-parse', 'HEAD');

/** @param {string[]} a */
function git(...a) {
  try { return execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim(); } catch { return 'dev'; }
}

// ---------- the game ----------
const APP = join(here, 'app');
console.log(`[build] the game into ${APP}`);
execFileSync('npx', ['vite', 'build', '--outDir', APP, '--emptyOutDir'], {
  cwd: root, stdio: 'inherit', shell: process.platform === 'win32',
  env: { ...process.env, VITE_STEAM: 'on', VITE_STAGE3: 'on', VITE_KOFI: 'off' },
});
mkdirSync(APP, { recursive: true });
// (the web's own files: the home-screen icons and their list, and the picture a shared link shows)
for (const f of ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'social-preview.jpg']) rmSync(join(APP, f), { force: true });
writeFileSync(join(APP, 'build.json'), JSON.stringify({ version, commit }, null, 2) + '\n');
if (args.has('game-only')) process.exit(0);

// ---------- the program ----------
const { packager } = await import('@electron/packager');
const NAME = 'Floe Market';
const [out] = await packager({
  dir: here,
  out: join(here, 'out'),
  platform, arch,
  name: NAME,
  executableName: platform === 'win32' ? 'FloeMarket' : 'floe-market',
  appVersion: version,
  buildVersion: commit.slice(0, 7),
  appCopyright: '© ChefControl. All rights reserved.',
  asar: true,
  prune: true,
  overwrite: true,
  ignore: [/^\/out($|\/)/, /^\/build\.mjs$/, /^\/README\.md$/],
  win32metadata: { CompanyName: 'ChefControl', ProductName: NAME, FileDescription: NAME, InternalName: 'FloeMarket' },
});
console.log(`[build] ${out}`);
