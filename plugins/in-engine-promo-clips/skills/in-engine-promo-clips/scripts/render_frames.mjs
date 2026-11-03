// Renders a browser game a frame at a time on the clip's own clock, with the game's own Web Audio rendered in step.
//
//   node render_frames.mjs <url> <script.js> [more.js ...] <out dir> [--frames 0,30,90] [--fps 30] [--size 720x1280]
//                          [--hide "#hud,.menu"] [--wait 2500]
//
// - The page's AudioContext is swapped for an OfflineAudioContext before the game loads; after each frame exactly
//   1/fps seconds of sound are rendered, so every sound the game plays lands on its frame. Written as <out>/game.wav.
// - Your scripts are injected in order after the game has loaded. The last one must define
//   window.cine = { len: seconds, frame(i, fps) { ... } } (it may do so asynchronously; this waits up to 60 s).
// - --frames renders only those frames, to <out>/test/ (no sound): for contact sheets. Otherwise <out>/frames/.
// - Everything but the game's canvas and your #cine overlay can be hidden with --hide (CSS selectors).
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { playwright } from './pw.mjs';

const argv = process.argv.slice(2), flags = {}, pos = [];
for (let i = 0; i < argv.length; i++) argv[i].startsWith('--') ? (flags[argv[i].slice(2)] = argv[++i]) : pos.push(argv[i]);
if (pos.length < 3) { console.error('usage: node render_frames.mjs <url> <script.js> [more.js ...] <out dir> [--frames a,b] [--fps 30] [--size 720x1280] [--hide sel]'); process.exit(1); }
const url = pos[0], scripts = pos.slice(1, -1), out = pos.at(-1);
const fps = +(flags.fps ?? 30), [w, h] = (flags.size ?? '720x1280').split('x').map(Number);

const { chromium } = await playwright();
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('pageerror', e.message));
page.on('console', m => { if (m.type() === 'error' || m.text().startsWith('[cine]')) console.log(m.text()); });
await page.addInitScript(() => {
  const SR = 48000, LEN = 120, B = OfflineAudioContext;
  class AC extends B {
    constructor() { super(2, SR * LEN, SR); window.__oac = this; }
    get state() { return 'running'; }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createMediaStreamDestination() { return this.createGain(); }
  }
  window.AudioContext = AC; window.webkitAudioContext = AC;
  // render the sound up to t seconds
  window.__astep = async t => {
    const c = window.__oac; if (!c) return;
    const p = B.prototype.suspend.call(c, t);
    if (!c.__done) c.__done = c.startRendering(); else B.prototype.resume.call(c);
    await p;
  };
  window.__afinish = async () => {
    const c = window.__oac; if (!c) return null;
    if (!c.__done) c.__done = c.startRendering(); else B.prototype.resume.call(c);
    const buf = await c.__done, n = Math.round(window.cine.len * 48000), L = buf.getChannelData(0), R = buf.getChannelData(1);
    const q = new Int16Array(n * 2);
    for (let i = 0; i < n; i++) { q[2 * i] = Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))); q[2 * i + 1] = Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))); }
    const u8 = new Uint8Array(q.buffer); let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
    return btoa(s);
  };
});
await page.goto(url);
await page.waitForTimeout(+(flags.wait ?? 2500));
if (flags.hide) await page.addStyleTag({ content: `${flags.hide}{display:none!important}` });
for (const s of scripts) await page.addScriptTag({ path: resolve(s) });
await page.waitForFunction(() => window.cine, null, { timeout: 60000 });
const len = await page.evaluate(() => window.cine.len);
const only = flags.frames ? flags.frames.split(',').map(Number) : null;
const frames = only ?? [...Array(Math.round(len * fps)).keys()];
const dir = only ? `${out}/test` : `${out}/frames`;
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const last = Math.max(...frames), want = new Set(frames), t0 = Date.now();
// every frame up to the last one asked for is stepped (the world has to get there), but only the wanted ones are saved
for (let i = 0; i <= last; i++) {
  await page.evaluate(([i, fps]) => window.cine.frame(i, fps), [i, fps]);
  if (!only) await page.evaluate(t => window.__astep(t), (i + 1) / fps);
  if (want.has(i)) await page.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
  if (i % 60 === 0) console.log('frame', i, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
if (!only) {
  const ch = await page.evaluate(() => window.__afinish());
  if (ch) {
    const pcm = Buffer.from(ch, 'base64'), n = pcm.length / 4, hd = Buffer.alloc(44);
    hd.write('RIFF', 0); hd.writeUInt32LE(36 + n * 4, 4); hd.write('WAVE', 8); hd.write('fmt ', 12);
    hd.writeUInt32LE(16, 16); hd.writeUInt16LE(1, 20); hd.writeUInt16LE(2, 22); hd.writeUInt32LE(48000, 24);
    hd.writeUInt32LE(192000, 28); hd.writeUInt16LE(4, 32); hd.writeUInt16LE(16, 34); hd.write('data', 36); hd.writeUInt32LE(n * 4, 40);
    writeFileSync(`${out}/game.wav`, Buffer.concat([hd, pcm]));
    console.log('sound', `${out}/game.wav`);
  }
}
console.log(`${frames.length} frames in ${dir}`);
await browser.close();
