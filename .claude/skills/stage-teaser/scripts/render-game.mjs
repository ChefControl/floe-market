// Renders a cinematic frame by frame with the game's own sound: the game's AudioContext is swapped for an
// OfflineAudioContext that renders exactly one frame's worth of sound per frame, so every splash, chop and coin lands
// on its frame. Use it for gameplay shots (the game's own splashes, chops and coins).
//   node render-game.mjs <cine.js> <out> [--landscape | --size WxH] [--url URL] [--save save.mjs] [--frames a,b] [--fps 30]
//                        [--keep id,id]
//
// --landscape renders 1920×1080 (a trailer, the store page); the default is portrait 720×1280. --url picks the game
// and its state: the demo build on 5177 with ?sound=on (the default), plus its own state switches (?stage=1,
// ?cellar&full&beaten=4, ...). --keep: page elements (ids) left showing besides the game, #teaser and #sub.
// The sound buffer is sized from the clip (window.cine.len), so a long act fits.
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { playwright } from './pw.mjs';
import { DEMO_URL, MOD, frameSize } from './game.mjs';

const [script, out, ...rest] = process.argv.slice(2);
const opt = k => { const i = rest.indexOf('--' + k); return i >= 0 ? rest[i + 1] : null; };
const fps = +(opt('fps') ?? 30), [W, H] = frameSize(rest), url = opt('url') ?? DEMO_URL;
const keep = ['game', 'teaser', 'sub', ...(opt('keep')?.split(',') ?? [])];
const save = opt('save') ? (await import(resolve(opt('save')))).default : null;
const { chromium } = await playwright();
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('pageerror', e.message));
page.on('console', m => { if (m.type() === 'error' || m.text().startsWith('[cine]')) console.log(m.text()); });
await page.addInitScript(() => {
  const SR = 48000, LEN = 200, B = OfflineAudioContext; // (seconds of room: the longest act)
  const realState = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'state').get;
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
  window.__realState = () => realState.call(window.__oac);
});
await page.goto(url);
await page.waitForTimeout(1500);
if (save) {
  await page.evaluate(`(async () => { ${MOD}
    const { tiles } = await window.__mod('unlocks.ts');
    const { replaceSave } = await window.__mod('save.ts');
    replaceSave(JSON.stringify((${save.toString()})(tiles)));
  })()`);
  await page.reload();
  await page.waitForTimeout(2500);
}
await page.evaluate(MOD);
await page.addStyleTag({ content: `body > *:not(${keep.map(k => '#' + k).join('):not(')}){display:none!important}` });
await page.addScriptTag({ path: resolve(script) });
await page.waitForFunction(() => window.cine, null, { timeout: 30000 });
const len = await page.evaluate(() => window.cine.len);
const only = opt('frames') ? opt('frames').split(',').map(Number) : null;
const frames = only ?? [...Array(Math.round(len * fps)).keys()];
const dir = only ? `${out}/test` : `${out}/frames`;
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const last = Math.max(...frames), want = new Set(frames);
const t0 = Date.now();
for (let i = 0; i <= last; i++) {
  await page.evaluate(([i, fps]) => window.cine.frame(i, fps), [i, fps]);
  if (!only) await page.evaluate(t => window.__astep(t), (i + 1) / fps);
  if (want.has(i)) await page.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
  if (i % 60 === 0) console.log('frame', i, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
writeFileSync(`${out}/cue.json`, JSON.stringify(await page.evaluate(() => window.cineType ?? null)));
if (!only) {
  const ch = await page.evaluate(() => window.__afinish());
  if (ch) {
    const pcm = Buffer.from(ch, 'base64'), n = pcm.length / 4, buf = Buffer.alloc(44);
    buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(48000, 24);
    buf.writeUInt32LE(192000, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
    writeFileSync(`${out}/game.wav`, Buffer.concat([buf, pcm]));
    console.log('sound', `${out}/game.wav`);
  }
}
console.log(`${frames.length} frames in ${dir}`);
await browser.close();
