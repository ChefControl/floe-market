// Renders the game PLAYING ITSELF a frame at a time: its own main loop, cameras and cutscenes (Mr. Fugu's knock, the
// fight's shots, the finish slam), on a virtual clock (clock.js) that moves one frame per frame, with the game's own
// sound rendered in step (an OfflineAudioContext, as render-game.mjs). Use it when the game already stages the moment;
// the cine script then only nudges it (starts a scene, presses a button, overrides the camera for a shot, draws a
// caption) instead of re-building it.
//
//   node render-play.mjs <cine.js>[,more.js] <out> [--landscape | --size WxH] [--url URL] [--frames a,b] [--fps 30]
//                        [--keep id,id] [--wait ms] [--ui 1.5] [--gfx high] [--skip seconds]
//                        [--mute music | --mute sfx,amb] [--sound-only] [--init file.js]
//
// The cine script runs in the page after it has loaded (window.__mod is there) and defines
//   window.cine = { len: <seconds>, async setup?(), frame(i, fps) { ...nudge the game for frame i... } }
// setup() runs once on real time before the clock is taken (warm up shaders, set the scene). Each frame then: frame(i)
// → the clock steps 1/fps (timers, then the game's requestAnimationFrame: tick + camera + render) → the sound steps →
// a screenshot of the page (overlays included). A camera override goes in a wrapper round renderer.render (see
// examples/trailer-*.js). Only #game, #teaser, #sub and the --keep ids show; the HUD and the rest are hidden.
// --frames renders just those frames to <out>/test (every frame before the last is still stepped: the clock only goes
// forward) and no sound; otherwise <out>/frames and <out>/game.wav.
// --skip s plays the first s seconds without keeping them (frame() gets i < 0 through them; the sound of them is cut
// from game.wav): to get through a wait (a fight's prep) to the moment the shot starts, on the same clock.
// --mute silences the game's own buses for the take (its settings' mute, audio.ts setMute): `--mute music` for a shot
// whose music is laid in afterwards, `--mute sfx,amb --sound-only` for a music bed (no frames saved, only game.wav).
// --ui k draws the game's own UI (bubbles, toasts, the banner) k times bigger: the page is laid out at size/k and drawn
// at k pixels a point, so a 1920×1080 frame shows the UI as a 1280×720 screen would (1.5, the default in landscape;
// the 3D view is still drawn at the full size). --gfx pins the graphics setting (high by default): on Auto the game
// would time the virtual frames as slow and drop to Low part-way through.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { playwright } from './pw.mjs';
import { DEMO_URL, MOD, frameSize } from './game.mjs';

const [script, out, ...rest] = process.argv.slice(2);
if (!script || !out) { console.error('usage: node render-play.mjs <cine.js> <out> [--landscape] [--url URL] [--frames a,b] [--fps 30] [--keep ids]'); process.exit(1); }
const opt = k => { const i = rest.indexOf('--' + k); return i >= 0 ? rest[i + 1] : null; };
const fps = +(opt('fps') ?? 30), [W, H] = frameSize(rest), url = opt('url') ?? DEMO_URL;
const keep = ['game', 'teaser', 'sub', ...(opt('keep')?.split(',') ?? [])];
const ui = +(opt('ui') ?? (W > H ? 1.5 : 1)), gfx = opt('gfx') ?? 'high';
const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = await playwright();
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Math.round(W / ui), height: Math.round(H / ui) }, deviceScaleFactor: ui });
page.on('pageerror', e => console.log('pageerror', e.message));
page.on('console', m => { if (m.type() === 'error' || m.text().startsWith('[cine]')) console.log(m.text()); });
await page.addInitScript({ content: readFileSync(join(here, 'clock.js'), 'utf8') });
await page.addInitScript(q => { try { localStorage.setItem('floe-market-graphics', q); } catch {} }, gfx);
// (--init file.js: a script of the take's own, run before the game loads: to rewrite the state the demo build starts in)
if (opt('init')) await page.addInitScript({ content: readFileSync(resolve(opt('init')), 'utf8') });
await page.addInitScript(() => {
  const SR = 48000, LEN = 200, B = OfflineAudioContext; // (seconds of room: the longest act)
  class AC extends B {
    constructor() { super(2, SR * LEN, SR); window.__oac = this; }
    get state() { return 'running'; }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createMediaStreamDestination() { return this.createGain(); }
  }
  window.AudioContext = AC; window.webkitAudioContext = AC;
  window.__astep = async t => {
    const c = window.__oac; if (!c) return;
    const p = B.prototype.suspend.call(c, t);
    if (!c.__done) c.__done = c.startRendering(); else B.prototype.resume.call(c);
    await p;
  };
  window.__afinish = async len => {
    const c = window.__oac; if (!c) return null;
    if (!c.__done) c.__done = c.startRendering(); else B.prototype.resume.call(c);
    const buf = await c.__done, n = Math.round(len * 48000), L = buf.getChannelData(0), R = buf.getChannelData(1);
    const q = new Int16Array(n * 2);
    for (let i = 0; i < n; i++) { q[2 * i] = Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))); q[2 * i + 1] = Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))); }
    const u8 = new Uint8Array(q.buffer); let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
    return btoa(s);
  };
});
await page.goto(url);
await page.waitForTimeout(+(opt('wait') ?? 4000));
await page.evaluate(MOD);
await page.addStyleTag({ content: `body > *:not(${keep.map(k => '#' + k).join('):not(')}){display:none!important}` });
// (several scripts, comma-separated, are added in order: a kit of helpers, then the shot)
for (const s of script.split(',')) await page.addScriptTag({ path: resolve(s) });
await page.waitForFunction(() => window.cine, null, { timeout: 60000 });
await page.evaluate(async () => { if (window.cine.setup) await window.cine.setup(); });
const len = await page.evaluate(() => window.cine.len);
const mute = opt('mute')?.split(',') ?? [], soundOnly = rest.includes('--sound-only');
if (mute.length) await page.evaluate(async m => { const A = await window.__mod('audio.ts'); m.forEach(b => A.setMute(b, true)); }, mute);
// the clock is ours from here, and the game's sound starts now (it wakes on a key), so its clock is the clip's
await page.evaluate(() => { window.__vt.take(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' })); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' })); });
const only = opt('frames') ? opt('frames').split(',').map(Number) : null;
const frames = only ?? [...Array(Math.round(len * fps)).keys()];
const dir = only ? `${out}/test` : `${out}/frames`;
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const last = Math.max(...frames), want = new Set(frames), t0 = Date.now(), skip = Math.round(+(opt('skip') ?? 0) * fps);
for (let i = -skip; i <= last; i++) {
  await page.evaluate(async ([i, fps]) => { await window.cine.frame(i, fps); window.__vt.step(1 / fps); }, [i, fps]);
  if (!only) await page.evaluate(t => window.__astep(t), (i + 1 + skip) / fps);
  if (want.has(i) && !soundOnly) await page.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
  if (i % 90 === 0) console.log('frame', i, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
writeFileSync(`${out}/cue.json`, JSON.stringify(await page.evaluate(() => window.cineType ?? null)));
if (!only) {
  const ch = await page.evaluate(l => window.__afinish(l), len + skip / fps);
  if (ch) {
    // (less the skipped part)
    const pcm = Buffer.from(ch, 'base64').subarray(Math.round(skip / fps * 48000) * 4), n = pcm.length / 4, hd = Buffer.alloc(44);
    hd.write('RIFF', 0); hd.writeUInt32LE(36 + n * 4, 4); hd.write('WAVE', 8); hd.write('fmt ', 12);
    hd.writeUInt32LE(16, 16); hd.writeUInt16LE(1, 20); hd.writeUInt16LE(2, 22); hd.writeUInt32LE(48000, 24);
    hd.writeUInt32LE(192000, 28); hd.writeUInt16LE(4, 32); hd.writeUInt16LE(16, 34); hd.write('data', 36); hd.writeUInt32LE(n * 4, 40);
    writeFileSync(`${out}/game.wav`, Buffer.concat([hd, pcm]));
    console.log('sound', `${out}/game.wav`);
  }
}
console.log(`${frames.length} frames in ${dir}`);
await browser.close();
