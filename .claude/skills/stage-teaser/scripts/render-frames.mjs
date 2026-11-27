// Renders a cinematic a frame at a time, on its own clock, so nothing hitches or jumps however slow a frame is.
//
//   node render-frames.mjs <cine script.js> <out dir> [--landscape | --size WxH] [--url URL] [--save <save.mjs>]
//                          [--frames 30,60,90] [--fps 30]
//
// The cine script (see ../examples/hello-chef-cine.js) runs in the game page and defines
//   window.cine = { len: <seconds>, frame(i, fps) { ...set the scene for frame i, draw it, return true } }
// and may set window.cineType (any JSON) for the soundtrack to read (written to <out dir>/cue.json).
// It draws to its own canvas (#teaser) over the game; the page's own overlays (the speech bubble, a subtitle element)
// can sit on top. Each frame is a page screenshot, so all of it is in the frame.
//
// --save: a module whose default export is the save function for game.mjs's open() (tiles => SaveData).
// --frames: just these frames (it still steps through every frame before the last, since the clock only goes forward),
//   written to <out dir>/test/: for checking shots before a full render.
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { DEMO_URL, frameSize, open } from './game.mjs';

const [script, out, ...rest] = process.argv.slice(2);
if (!script || !out) { console.error('usage: node render-frames.mjs <cine.js> <out dir> [--save save.mjs] [--frames a,b,c] [--fps 30]'); process.exit(1); }
const opt = k => { const i = rest.indexOf('--' + k); return i >= 0 ? rest[i + 1] : null; };
const fps = +(opt('fps') ?? 30), [w, h] = frameSize(rest);
const save = opt('save') ? (await import(resolve(opt('save')))).default : null;
const { browser, page } = await open({ url: opt('url') ?? DEMO_URL, w, h, save, keep: ['game', 'teaser', 'offer', 'sub'] });
await page.addScriptTag({ path: resolve(script) });
await page.waitForFunction(() => window.cine, null, { timeout: 30000 });
const len = await page.evaluate(() => window.cine.len);
const only = opt('frames') ? opt('frames').split(',').map(Number) : null;
const frames = only ?? [...Array(Math.round(len * fps)).keys()];
const dir = only ? `${out}/test` : `${out}/frames`;
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const last = Math.max(...frames), want = new Set(frames);
for (let i = 0; i <= last; i++) {
  await page.evaluate(([i, fps]) => window.cine.frame(i, fps), [i, fps]);
  if (want.has(i)) await page.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
}
writeFileSync(`${out}/cue.json`, JSON.stringify(await page.evaluate(() => window.cineType ?? null)));
console.log(`${frames.length} frames in ${dir}` + (only ? '' : ` (ffmpeg -framerate ${fps} -i ${dir}/%04d.jpg ...)`));
await browser.close();
