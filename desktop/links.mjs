// @ts-check
// What the desktop app does with the addresses the game asks for (main.mjs). Kept apart from Electron so the tests can
// load it (test/desktop.test.ts).
import { join, normalize, sep } from 'node:path';

/** The game's own origin: a secure origin of its own, so module scripts, fetch() and localStorage behave as on the web
 *  (file:// would block the module scripts). */
export const ORIGIN = 'app://floe';

/** Files served beside the game that aren't in its build: the licence notices Electron ships next to the program. */
export const NOTICES = ['LICENSE.electron.txt', 'LICENSES.chromium.html'];

/**
 * The file an app://floe/ address reads, under `game` (the game's build) or, for the notices, `notices` (the program's
 * own folder); null for anything outside them, another host, or a path that climbs out with "..".
 * @param {string} url
 * @param {string} game
 * @param {string} notices
 */
export function fileFor(url, game, notices) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'app:' || u.host !== 'floe') return null;
  let path;
  try { path = decodeURIComponent(u.pathname); } catch { return null; }
  if (path.includes('\0')) return null;
  const rel = path.replace(/^\/+/, '') || 'index.html';
  if (NOTICES.includes(rel)) return join(notices, rel);
  const file = normalize(join(game, rel));
  return file === game || file.startsWith(game.endsWith(sep) ? game : game + sep) ? file : null;
}

/**
 * Where a link the game opens (target="_blank", window.open) goes: `game` for the game's own text files (the licences
 * list, the notices), opened in a window of the app's own; `browser` for a web page, in the player's browser; `steam`
 * for a steam:// address (the store page), handed to Steam; `none` for anything else.
 * @param {string} url
 * @returns {'game' | 'browser' | 'steam' | 'none'}
 */
export function linkKind(url) {
  let u;
  try { u = new URL(url); } catch { return 'none'; }
  if (u.protocol === 'app:') return u.host === 'floe' ? 'game' : 'none';
  if (u.protocol === 'https:' || u.protocol === 'http:') return 'browser';
  if (u.protocol === 'steam:') return 'steam';
  return 'none';
}
