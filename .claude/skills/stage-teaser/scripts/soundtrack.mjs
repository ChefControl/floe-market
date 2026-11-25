// Renders a teaser's soundtrack offline (OfflineAudioContext in a headless browser), sample-exact and the same every
// time, and writes a 16-bit WAV.
//
//   node soundtrack.mjs <sound script.js> <cue.json> <out.wav>
//
// The sound script (see ../examples/hello-chef-sound.js) defines window.soundtrack = async cue => ({ b64, peak }),
// where `cue` is what the cinematic left in cue.json (its timings: when lines type out, when it ends...).
// Keep the master well under 1.0: the peak is printed, and anything at 1.0 has clipped.
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { playwright } from './pw.mjs';

const [script, cue, out] = process.argv.slice(2);
if (!script || !out) { console.error('usage: node soundtrack.mjs <sound.js> <cue.json> <out.wav>'); process.exit(1); }
const { chromium } = await playwright();
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('about:blank');
await p.addScriptTag({ path: resolve(script) });
const r = await p.evaluate(c => window.soundtrack(c), cue ? JSON.parse(readFileSync(cue, 'utf8')) : null);
writeFileSync(out, Buffer.from(r.b64, 'base64'));
console.log('peak', r.peak, r.peak >= 0.999 ? '(CLIPPED: turn the master down)' : '');
await b.close();
