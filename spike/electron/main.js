// Throwaway Electron spike (#158): the game's demo build in Electron 45, to measure High and Low and try Steamworks.
// Not the real wrapper (#159). Run from this folder:
//   npm start                                   play the game in a 1280x800 window (the Steam Deck's screen)
//   npm start -- --bench --scene=cellar-full    measure: 10 s to settle, then 30 s of frame rates each on Low and High
//   npm start -- --bench --scene=all            every scene in turn (about 6 minutes); results also go to the Desktop
//   npm start -- --steam                        also start Steamworks as Valve's test app (Spacewar, 480)
// Scenes are the demo build's own games (fuguDemo.ts): stage1, stage2, cellar (stage 3, nothing beaten),
// cellar-full (stage 3, all bosses beaten and everything bought).
const { app, BrowserWindow, dialog, protocol, net } = require('electron');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

const APP = join(__dirname, 'app');
const arg = (name, dflt) => {
  const a = process.argv.find(s => s.startsWith(`--${name}`));
  return a === undefined ? dflt : a.includes('=') ? a.split('=')[1] : true;
};
const SCENES = { stage1: '?stage=1', stage2: '', cellar: '?stage3=on&cellar&beaten=0', 'cellar-full': '?stage3=on&cellar&beaten=5&full' };
const scene = arg('scene', 'stage2');
const bench = arg('bench', false), wantSteam = arg('steam', false);
const W = Number(arg('w', 1280)), H = Number(arg('h', 800));

// Steamworks has to start before any window exists, or the overlay can't hook it.
let steam = null;
if (wantSteam) {
  try {
    const SteamworksSDK = require('steamworks-ffi-node').default;
    steam = SteamworksSDK.getInstance();
    // Valve's SDK (download from partner.steamgames.com, not in the repo): its steamworks_sdk folder goes next to
    // this file, or next to the .exe in a packaged build
    steam.setSdkPath(join(app.isPackaged ? require('node:path').dirname(process.execPath) : __dirname, 'steamworks_sdk'));
    const ok = steam.init({ appId: 480 });
    console.log(`[steam] init ${ok ? 'ok' : 'FAILED'}`);
    if (ok) {
      console.log('[steam] status', JSON.stringify(steam.getStatus?.() ?? {}));
      setInterval(() => steam.runCallbacks(), 100);
    } else steam = null;
  } catch (e) {
    console.log('[steam] not available:', e.message);
    steam = null;
  }
}

// The game is served from app://floe/, a secure origin of its own, so its module scripts, fetch() and localStorage
// behave as on the web (file:// would block the module scripts).
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

app.whenReady().then(async () => {
  protocol.handle('app', req => {
    const { pathname } = new URL(req.url);
    return net.fetch(pathToFileURL(join(APP, decodeURIComponent(pathname))).toString());
  });
  const win = new BrowserWindow({
    width: W, height: H, useContentSize: true, backgroundColor: '#CFEAF5', title: 'Floe Market (Electron spike)',
    webPreferences: { backgroundThrottling: false },
  });
  win.webContents.on('console-message', e => {
    if (e.level === 'error' || e.level === 'warning') console.log(`[page ${e.level}] ${e.message}`);
  });
  win.webContents.on('render-process-gone', (_e, d) => console.log('[page] renderer gone', JSON.stringify(d)));
  if (steam) {
    try {
      // the library's experimental overlay: copies Electron's frames into a window Steam can draw over
      steam.addElectronSteamOverlay?.(win);
      console.log('[steam] overlay helper attached');
    } catch (e) { console.log('[steam] overlay helper failed:', e.message); }
  }
  if (!bench) {
    await win.loadURL(`app://floe/index.html${SCENES[scene] ?? ''}`);
    return;
  }
  // --scene=all measures every scene in turn; the results also go to a file on the Desktop and a box at the end,
  // since a Windows app's console output isn't shown
  const lines = [`Floe Market Electron spike: Electron ${process.versions.electron}, Chromium ${process.versions.chrome}, ${W}x${H}, ${process.platform}`];
  for (const s of scene === 'all' ? Object.keys(SCENES) : [scene]) {
    await win.loadURL(`app://floe/index.html${SCENES[s] ?? ''}`);
    lines.push(...await runBench(win, s));
  }
  const out = join(app.getPath('desktop'), 'floe-electron-bench.txt');
  require('node:fs').writeFileSync(out, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  if (app.isPackaged) await dialog.showMessageBox(win, { message: 'Benchmark done', detail: `${lines.join('\n')}\n\nSaved to ${out}` });
  app.quit();
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const js = (win, code) => win.webContents.executeJavaScript(code, true);

/** The demo panel's stats line ("57 fps · 412 draw calls · 803k triangles · high"), sampled once a second. */
async function sample(win, seconds) {
  const fps = [];
  let last = '';
  for (let i = 0; i < seconds; i++) {
    await sleep(1000);
    last = await js(win, `document.getElementById('demoStats')?.textContent || ''`);
    const m = /^(\d+) fps/.exec(last);
    if (m) fps.push(+m[1]);
  }
  fps.sort((a, b) => a - b);
  const pick = q => fps[Math.min(fps.length - 1, Math.floor(q * fps.length))];
  return { median: pick(0.5), low: pick(0.05), min: fps[0], max: fps[fps.length - 1], last };
}

async function runBench(win, scene) {
  // wait for the first frame (the loading screen goes once the world is drawn)
  for (let i = 0; i < 120; i++) {
    if (await js(win, `!!document.getElementById('demoStats') && /fps/.test(document.getElementById('demoStats').textContent)`)) break;
    await sleep(500);
  }
  const gpu = await js(win, `(() => { const g = document.createElement('canvas').getContext('webgl2');
    const d = g && g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()`);
  const lines = [`GPU: ${gpu}`];
  for (const q of ['low', 'high']) {
    await js(win, `document.querySelector('#demoGfx button[data-q="${q}"]').click()`);
    await sleep(10_000);
    const r = await sample(win, 30);
    lines.push(`${scene} ${q}: median ${r.median} fps, 5th percentile ${r.low}, min ${r.min}, max ${r.max} | ${r.last}`);
    console.log('[bench] ' + lines.at(-1));
  }
  return lines;
}

app.on('window-all-closed', () => app.quit());
