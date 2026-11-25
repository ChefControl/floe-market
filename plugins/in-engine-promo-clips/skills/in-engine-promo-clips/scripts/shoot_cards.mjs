// Screenshots each variant of an end-card mockup page as a still, so the person can pick one before you animate it.
//
//   node shoot_cards.mjs <cards.html> <out dir> A B C D [--size 720x1280]
//
// The page shows variant X for ?o=X (e.g. one <div class="card" id="A"> per option, and a line of script that shows
// the one named in the query). Mock the in-game option as a real frame from render_frames.mjs and put it on the page as
// an image; the others can be plain HTML (logo, key art, a call to action, the address).
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { playwright } from './pw.mjs';

const args = process.argv.slice(2), i = args.indexOf('--size');
const [w, h] = (i >= 0 ? args.splice(i, 2)[1] : '720x1280').split('x').map(Number);
const [page, out, ...opts] = args;
if (!opts.length) { console.error('usage: node shoot_cards.mjs <cards.html> <out dir> A B C …'); process.exit(1); }
mkdirSync(out, { recursive: true });
const { chromium } = await playwright(); const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: w, height: h } });
for (const o of opts) {
  await p.goto(pathToFileURL(resolve(page)).href + '?o=' + encodeURIComponent(o));
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  await p.screenshot({ path: resolve(out, `card-${o}.jpg`), type: 'jpeg', quality: 88 });
  console.log(resolve(out, `card-${o}.jpg`));
}
await b.close();
