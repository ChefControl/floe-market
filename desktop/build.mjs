// @ts-check
// Builds the desktop app: the game's Steam build into app/, then the program around it into out/.
//
//   node build.mjs                      the game, and the app for this computer
//   node build.mjs --platform=win32     for Windows (x64); --platform=linux for Linux and the Steam Deck (x64)
//   node build.mjs --game-only          just the game into app/ (then `npm start` plays it)
//   node build.mjs --demo               the Steam demo (#183), an app of its own: src/steamDemo.ts
//   node build.mjs --release            a build to upload: stops on any licence still waiting for approval (FFmpeg's,
//                                       until Valve agrees: desktop/notices.mjs), where a test build only warns
//
// The game is the Steam build (VITE_STEAM=on: no Firebase, no Ko-fi, src/flags.ts) with stage 3 on (VITE_STAGE3=on).
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { electronNotices } from './notices.mjs';
import { steamId } from './steam/upload.mjs';

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
const release = args.has('release'), demo = args.has('demo');
const NAME = demo ? 'Floe Market Demo' : 'Floe Market';
// The demo's Wishlist button opens the full game's store page (src/steamDemo.ts): its id comes from the environment
// (a GitHub Actions secret), never the repo. A release needs it; a test build without it says so on the button.
const storeId = demo && (release || process.env.STEAM_APP_ID) ? steamId(process.env, 'STEAM_APP_ID') : '';
// what the program adds to the open-source licences (scripts/licences.ts), handed to the game's build
const notices = join(mkdtempSync(join(tmpdir(), 'floe-notices-')), 'notices.json');
writeFileSync(notices, JSON.stringify(electronNotices(join(here, 'node_modules', 'electron'))));
console.log(`[build] the game into ${APP}${release ? ', for release' : ''}`);
execFileSync('npx', ['vite', 'build', '--outDir', APP, '--emptyOutDir'], {
  cwd: root, stdio: 'inherit', shell: process.platform === 'win32',
  env: {
    ...process.env, VITE_STEAM: 'on', VITE_STAGE3: 'on', VITE_KOFI: 'off',
    VITE_STEAM_DEMO: demo ? 'on' : 'off', VITE_STEAM_STORE_ID: storeId,
    FLOE_NOTICES: notices, FLOE_LICENCES_PENDING: release ? '' : 'FFmpeg',
  },
});
mkdirSync(APP, { recursive: true });
// (the web's own files: the home-screen icons and their list, and the picture a shared link shows)
for (const f of ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'social-preview.jpg']) rmSync(join(APP, f), { force: true });
writeFileSync(join(APP, 'build.json'), JSON.stringify({ version, commit, demo }, null, 2) + '\n');
if (args.has('game-only')) process.exit(0);

// ---------- the program ----------
const { packager } = await import('@electron/packager');
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
  ignore: [/^\/out($|\/)/, /^\/build\.mjs$/, /^\/notices\.mjs$/, /^\/steam\//, /^\/README\.md$/],
  win32metadata: { CompanyName: 'ChefControl', ProductName: NAME, FileDescription: NAME, InternalName: 'FloeMarket' },
});
if (platform === 'linux') linuxLauncher(out);
console.log(`[build] ${out}`);

/**
 * Linux and the Steam Deck start the game with a script (Steam's launch option, #202), for Chromium's sandbox. Chromium
 * keeps the game's page in a sandbox built on Linux's user namespaces; inside Steam's Linux runtime (a container of its
 * own) they may not be allowed, and then Chromium stops at once ("No usable sandbox"). Its other way, a helper owned by
 * root, can't be set up from Steam's folder at all. So the script starts the game with the sandbox; if the game ends
 * with an error before it has ever started with it (main.mjs writes sandbox-ok in the player's settings folder once it
 * has), the script notes it there (no-sandbox) and starts it without, from then on. The game's page only ever shows
 * the game's own files (main.mjs), never the web.
 * @param {string} dir
 */
function linuxLauncher(dir) {
  const file = join(dir, 'floe-market.sh');
  writeFileSync(file, `#!/bin/sh
# Starts ${NAME} on Linux and the Steam Deck: with Chromium's sandbox if this computer allows it, otherwise without
# (desktop/build.mjs says why). Arguments go on to the game.
here="$(dirname "$(readlink -f "$0")")"
conf="\${XDG_CONFIG_HOME:-$HOME/.config}/${NAME}"
if [ -e "$conf/no-sandbox" ]; then exec "$here/floe-market" --no-sandbox "$@"; fi
"$here/floe-market" "$@"
code=$?
if [ "$code" -ne 0 ] && [ ! -e "$conf/sandbox-ok" ]; then
  mkdir -p "$conf"
  echo "The sandbox didn't start here (exit $code), so ${NAME} runs without it." > "$conf/no-sandbox"
  exec "$here/floe-market" --no-sandbox "$@"
fi
exit "$code"
`);
  chmodSync(file, 0o755);
}
