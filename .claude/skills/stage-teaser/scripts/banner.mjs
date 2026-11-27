// Renders the stage banner (banner.html) frame by frame to an MP4 of a given length.
//
//   node banner.mjs <seconds> <out.mp4> [query string] [--landscape | --size WxH]
//   node banner.mjs 7.2 out/banner.mp4 "icon=🐡&kicker=FLOE MARKET · STAGE 3&title=THE DOHYO|BELOW&sub=Coming soon"
//
// Make it as long as the music under it (the music decides the ending).
import { execSync } from 'child_process';
import { mkdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { playwright } from './pw.mjs';
import { frameSize } from './game.mjs';

const args = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !all[i - 1]?.startsWith('--size'));
const [secs, out, query = ''] = args, [w, h] = frameSize();
if (!out) { console.error('usage: node banner.mjs <seconds> <out.mp4> [query]'); process.exit(1); }
const here = dirname(fileURLToPath(import.meta.url)), tmp = '/tmp/_banner';
rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
const { chromium } = await playwright();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
await p.goto('file://' + join(here, 'banner.html') + (query ? '?' + encodeURI(query) : ''));
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);
const n = Math.ceil(+secs * 30);
// the card is still after two seconds: render those frames and hold the last one
const moving = Math.min(n, 60);
for (let i = 0; i < moving; i++) {
  await p.evaluate(t => window.at(t), i / 30);
  await p.screenshot({ path: `${tmp}/${String(i).padStart(4, '0')}.png` });
}
await b.close();
execSync(`ffmpeg -loglevel error -y -framerate 30 -i ${tmp}/%04d.png -vf "tpad=stop_mode=clone:stop_duration=${Math.max(0, n - moving) / 30 + 0.1},format=yuv420p" -t ${secs} -c:v libx264 -crf 16 -preset fast "${out}"`);
console.log('banner', out, secs + 's');
