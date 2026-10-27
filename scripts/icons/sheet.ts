// A contact sheet of the game's icon drawings, to look at while drawing them: each at 96, 40 and 20 pixels on a white
// pill, a navy pill and wood, next to the computer's own emoji for reference. Headless Chrome takes the picture.
//   node --import ./scripts/icons/resolve.mjs scripts/icons/sheet.ts out.png [emoji…]   (no emoji: every drawing)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { DRAWINGS } from '../../src/icons.ts';
import { svgOf } from './svg.ts';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [out, ...asked] = process.argv.slice(2);
const list = asked.length ? asked : Object.keys(DRAWINGS).filter(e => e !== 'mrFugu');
const missing = list.filter(e => !DRAWINGS[e]);
if (missing.length) console.error('no drawing yet:', missing.join(' '));

const img = (e: string, px: number) => `<img width="${px}" height="${px}" src="data:image/svg+xml,${encodeURIComponent(svgOf(e))}">`;
const rows = list.filter(e => DRAWINGS[e]).map(e => `<div class="row"><b>${e}</b>
  <span class="cell light">${img(e, 96)}${img(e, 40)}${img(e, 20)}<span class="pill">${img(e, 18)} 2,000</span></span>
  <span class="cell dark">${img(e, 40)}${img(e, 20)}<span class="pill">${img(e, 18)} 2,000</span></span>
  <span class="cell wood">${img(e, 40)}${img(e, 20)}</span></div>`).join('');
const page = `<!doctype html><meta charset="utf-8"><style>
body{ margin:0; padding:8px; background:#CFEAF5; font:800 15px "Trebuchet MS",sans-serif; color:#173042; width:${720 - 16}px; }
.row{ display:flex; align-items:center; gap:8px; margin:0 0 6px; }
.row b{ width:58px; font-size:44px; text-align:center; font-weight:400; }
.cell{ display:flex; align-items:center; gap:10px; padding:6px 10px; border-radius:14px; }
.light{ background:#fff; } .dark{ background:#102432; color:#EAF6FB; } .wood{ background:#8A5A3B; }
.pill{ display:inline-flex; align-items:center; gap:5px; padding:2px 10px 2px 6px; border-radius:999px; box-shadow:0 2px 0 rgba(23,48,66,.22); }
.light .pill{ background:#fff; } .dark .pill{ background:rgba(255,255,255,.12); }
</style>${rows}`;

const dir = mkdtempSync(tmpdir() + '/floe-sheet-');
writeFileSync(`${dir}/sheet.html`, page);
const h = 16 + list.length * 116;
execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${dir}/profile`,
  `--window-size=720,${h}`, `--screenshot=${out}`, `file://${dir}/sheet.html`], { stdio: 'ignore' });
rmSync(dir, { recursive: true, force: true });
console.log(`${out}: ${list.length - missing.length} drawings`);
