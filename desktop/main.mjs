// @ts-check
// Floe Market's desktop app, for Steam (#159): the game's Steam build in Electron 45 (Chromium 156), which gives every
// player the same WebGL and Web Audio. It starts straight into the game, with no launcher window. build.mjs builds the
// game into app/ beside this file and packages both; `npm start` here runs whatever is in app/.
//
// The game is served from app://floe/ (links.mjs). Links the game opens go to the player's browser (web pages), to
// Steam (steam:// addresses) or to a window of the app's own (the licence notices); the game's window itself never
// leaves the game.
import { app, BrowserWindow, ipcMain, Menu, net, protocol, shell } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fileFor, linkKind, ORIGIN } from './links.mjs';
import { saveFiles } from './saves.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const GAME = join(here, 'app');
/** What build.mjs says about this build: the full game or the demo, and the commit it's from. */
const build = (() => {
  try { return JSON.parse(readFileSync(join(GAME, 'build.json'), 'utf8')); } catch { return {}; }
})();
// The demo is an app of its own on Steam, and keeps its settings and save apart from the full game's.
const NAME = build.demo ? 'Floe Market Demo' : 'Floe Market';
app.setName(NAME);
app.setPath('userData', join(app.getPath('appData'), NAME));
// a test run can keep its settings and save somewhere of its own (--profile=<folder>), apart from the owner's
const profile = !app.isPackaged || process.argv.includes('--devtools') ? process.argv.find(a => a.startsWith('--profile='))?.slice(10) : undefined;
if (profile) app.setPath('userData', profile);

/** The licence notices Electron ships next to the program (or in its package, running unpackaged). */
const NOTICES = !app.isPackaged ? join(here, 'node_modules', 'electron', 'dist')
  // (on a Mac, beside the .app: the owner's test builds)
  : process.platform === 'darwin' ? join(process.execPath, '..', '..', '..', '..') : dirname(process.execPath);
const DEV = !app.isPackaged || process.argv.includes('--devtools');

// Sound starts with the game, as a game's would, without waiting for a first click.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// One copy of the game at a time: a second start brings the first one forward, so two can't write one save.
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (!w) return;
    if (w.isMinimized()) w.restore();
    w.focus();
  });
  app.whenReady().then(start);
}

/** Minutes between rolls of the save into its backups, while playing (saves.mjs). */
const ROLL_EVERY = 10;

/**
 * The game's save, in files (saves.mjs) rather than the page's storage, so a crash mid-save can't spoil it and Steam
 * Cloud can sync it. The page reads it once as it starts, writes it in the background as it plays, and writes it
 * there and then (sync) on its way out, so closing the window never loses anything. Rolls into the backups as the
 * game starts and every ten minutes.
 */
function serveSaves() {
  const saves = saveFiles(join(app.getPath('userData'), 'saves'));
  const safely = (/** @type {() => unknown} */ f) => {
    try { return { ok: true, value: f() }; } catch (e) { console.error('[floe] save', e); return { ok: false, error: String(e) }; }
  };
  safely(() => saves.roll());
  setInterval(() => safely(() => saves.roll()), ROLL_EVERY * 60_000);
  ipcMain.on('save:read', (e, key) => { e.returnValue = safely(() => saves.read(key)); });
  ipcMain.handle('save:write', (_e, key, data) => safely(() => saves.write(key, String(data))));
  ipcMain.on('save:write-now', (e, key, data) => { e.returnValue = safely(() => saves.write(key, String(data))); });
  ipcMain.on('save:remove', (e, key) => { e.returnValue = safely(() => saves.remove(key)); });
}

// ---------- the window: fullscreen or not (#163) ----------
/** How the window was left, kept on this computer only (beside the saves, never in them: Steam Cloud syncs only those). */
const DISPLAY = () => join(app.getPath('userData'), 'display.json');
/** @returns {{ fullscreen?: boolean }} */
function readDisplay() {
  try { return JSON.parse(readFileSync(DISPLAY(), 'utf8')); } catch { return {}; }
}
/** @param {{ fullscreen: boolean }} d */
function writeDisplay(d) {
  try { writeFileSync(DISPLAY(), JSON.stringify(d) + '\n'); } catch (e) { console.error('[floe] display', e); }
}

/**
 * Fullscreen or a window: as the player left it, or fullscreen at the screen's own size the first time (a window in the
 * owner's test runs on the Mac). F11 and Alt+Enter switch, and so does the setting (src/display.ts); the page hears of
 * every change, whoever made it.
 * @param {BrowserWindow} win
 */
function serveDisplay(win) {
  const tell = () => win.webContents.send('display:changed', { fullscreen: win.isFullScreen() });
  win.on('enter-full-screen', () => { writeDisplay({ fullscreen: true }); tell(); });
  win.on('leave-full-screen', () => { writeDisplay({ fullscreen: false }); tell(); });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.key === 'Enter' && input.alt)) {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
  });
  ipcMain.on('display:get', e => { e.returnValue = { fullscreen: win.isFullScreen() }; });
  ipcMain.on('display:fullscreen', (_e, on) => win.setFullScreen(!!on));
  // Quit to desktop (src/pause.ts): the page has saved there and then before it asks
  ipcMain.on('app:quit', () => app.quit());
}

async function start() {
  serveSaves();
  protocol.handle('app', async req => {
    const file = fileFor(req.url, GAME, NOTICES);
    if (!file || !existsSync(file)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  // No menu bar on Windows and Linux; the Mac keeps its own (for Cmd+Q), which only the owner's test builds have.
  if (process.platform !== 'darwin') Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 960, minHeight: 600, useContentSize: true,
    // fullscreen at the screen's own size, as a game starts (except in the owner's test runs on the Mac), or as left
    fullscreen: readDisplay().fullscreen ?? (app.isPackaged && process.platform !== 'darwin'),
    backgroundColor: '#CFEAF5', title: 'Floe Market', show: false, icon: join(GAME, 'apple-touch-icon.png'),
    webPreferences: {
      preload: join(here, 'preload.cjs'),
      sandbox: true, contextIsolation: true, nodeIntegration: false, spellcheck: false,
      devTools: DEV,
    },
  });
  win.once('ready-to-show', () => win.show());
  guard(win);
  serveDisplay(win);
  if (DEV) {
    win.webContents.on('before-input-event', (e, input) => {
      if (input.type === 'keyDown' && input.key === 'F12') { win.webContents.toggleDevTools(); e.preventDefault(); }
    });
  }
  win.webContents.on('render-process-gone', (_e, d) => console.error('[floe] renderer gone', JSON.stringify(d)));
  // On Linux, the game has started with Chromium's sandbox: floe-market.sh need never try without it (build.mjs).
  if (process.platform === 'linux' && !app.commandLine.hasSwitch('no-sandbox')) {
    win.webContents.once('did-finish-load', () => {
      try { writeFileSync(join(app.getPath('userData'), 'sandbox-ok'), 'Chromium\'s sandbox works here.\n'); } catch { /* next time */ }
    });
  }
  // a test run can open the game with a query, as the web build's address would (--query=stage=1&sound=off)
  const query = DEV ? process.argv.find(a => a.startsWith('--query='))?.slice(8) : undefined;
  await win.loadURL(`${ORIGIN}/index.html${query ? '?' + query : ''}`);
}

/**
 * Keeps a window on the game: it can't be navigated away, and links it opens go where linkKind says. The game's own
 * text files (the licences) open in a plain window of their own.
 * @param {BrowserWindow} win
 */
function guard(win) {
  /** What goes out of the app, to the player's browser, Steam or mail program. */
  const OUT = new Set(['browser', 'steam', 'mail']);
  win.webContents.on('will-navigate', (e, url) => {
    // (a reload, the Restart button's, keeps to the game)
    if (!url.startsWith(`${ORIGIN}/index.html`)) e.preventDefault();
  });
  // (a link inside a frame, the privacy notice's: the web and email go out of the app, the frame stays on the game's)
  win.webContents.on('will-frame-navigate', e => {
    if (e.isMainFrame || e.url.startsWith(`${ORIGIN}/`)) return;
    e.preventDefault();
    if (OUT.has(linkKind(e.url))) void shell.openExternal(e.url);
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    const kind = linkKind(url);
    if (OUT.has(kind)) void shell.openExternal(url);
    if (kind !== 'game') return { action: 'deny' };
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 900, height: 700, autoHideMenuBar: true, backgroundColor: '#ffffff',
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, devTools: DEV },
      },
    };
  });
  win.webContents.on('did-create-window', child => {
    child.setMenu(null);
    child.webContents.on('will-navigate', (e, url) => {
      // a link inside a notice: to the browser, never in the app
      e.preventDefault();
      if (OUT.has(linkKind(url))) void shell.openExternal(url);
    });
    child.webContents.setWindowOpenHandler(({ url }) => {
      if (OUT.has(linkKind(url))) void shell.openExternal(url);
      return { action: 'deny' };
    });
  });
}

app.on('window-all-closed', () => app.quit());
