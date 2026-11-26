// @ts-check
// What the desktop app ships on top of the game's bundle, for the open-source licences list (#149, scripts/licences.ts):
// Electron's own licence, Chromium's (whose notices for everything it includes are in LICENSES.chromium.html, beside
// the program, opened from the list), Blink's (Chromium's page engine, from WebKit, partly LGPL, built into the
// program, which a player can swap for another Electron 45 build), and FFmpeg's. Chromium plays the game's recordings through FFmpeg, which Electron
// ships as a library of its own (ffmpeg.dll, libffmpeg.so) that a player can swap, as its licence, the LGPL, asks.
// Steam needs Valve's agreement before a game ships LGPL code: until Blink and FFmpeg are in APPROVED, a test build
// only warns, and a release build stops (build.mjs, PENDING).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** What waits for the owner's approval (Valve's agreement), by name: a test build only warns about these. */
export const PENDING = ['Blink', 'FFmpeg'];

/** Chromium's notices, as the page reads them (desktop/links.mjs serves them from beside the program). */
export const CHROMIUM_NOTICES = 'LICENSES.chromium.html';

/** @param {string} s */
const unescape = s => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

/**
 * One project's licence text from Chromium's notices page, by its title there.
 * @param {string} page
 * @param {string} title
 */
export function noticeOf(page, title) {
  const at = page.indexOf(`<span class="title">${title}</span>`);
  if (at < 0) throw new Error(`${CHROMIUM_NOTICES}: no notice for ${title}`);
  const m = /<pre>([\s\S]*?)<\/pre>/.exec(page.slice(at));
  if (!m) throw new Error(`${CHROMIUM_NOTICES}: no licence text for ${title}`);
  return unescape(m[1]).trim();
}

/**
 * The notices, from the installed Electron (`dir`: desktop/node_modules/electron, with its binary downloaded).
 * @param {string} dir
 * @returns {import('../scripts/licences.ts').Notice[]}
 */
export function electronNotices(dir) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const dist = join(dir, 'dist'), page = readFileSync(join(dist, CHROMIUM_NOTICES), 'utf8');
  // (the Chromium in this Electron, asked of the Electron itself: path.txt names its program in dist/)
  const bin = join(dist, readFileSync(join(dir, 'path.txt'), 'utf8').trim());
  const chrome = execFileSync(bin, ['-p', 'process.versions.chrome'], { encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } }).trim();
  return [
    { name: 'Electron', version: pkg.version, licence: 'MIT', text: readFileSync(join(dir, 'LICENSE'), 'utf8').trim(), url: 'https://www.electronjs.org/' },
    {
      name: 'Chromium', version: chrome, licence: 'BSD-3-Clause',
      text: `${noticeOf(page, 'The Chromium Project')}\n\nChromium includes code from many other projects. Their notices are in ${CHROMIUM_NOTICES}, beside the program.`,
      url: CHROMIUM_NOTICES,
    },
    {
      name: 'Blink', version: `in Chromium ${chrome}`, licence: 'LGPL-2.1-or-later',
      text: `${noticeOf(page, 'WebKit')}\n\nBlink, Chromium's page engine, comes from WebKit; parts of it are under the LGPL. Floe Market uses it as Electron builds it, unchanged, inside the program (FloeMarket.exe on Windows, floe-market on Linux), which can be replaced with another build of Electron ${pkg.version}; the game itself is apart, in resources/app.asar. Its source: https://chromium.googlesource.com/chromium/src/+/refs/tags/${chrome}/third_party/blink`,
      url: 'https://www.chromium.org/blink/',
    },
    {
      name: 'FFmpeg', version: `in Chromium ${chrome}`, licence: 'LGPL-2.1-or-later',
      text: `${noticeOf(page, 'ffmpeg')}\n\nFloe Market uses FFmpeg as Chromium builds it, unchanged, as a separate library (ffmpeg.dll on Windows, libffmpeg.so on Linux) that can be replaced. Its source: https://chromium.googlesource.com/chromium/third_party/ffmpeg`,
      url: 'https://chromium.googlesource.com/chromium/third_party/ffmpeg',
    },
  ];
}
