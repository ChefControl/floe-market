// Checks a clip's sound without listening to it: clicks, peak, how bright it is, and loudness over time.
//
//   node check_audio.mjs <audio or video file> [--every 1] [--bpm 100 --bars 16]
//
// - clicks: sample-to-sample jumps far beyond the music (second difference > 6000 on 16-bit). Any at all needs a look:
//   people hear clicks and high ticks (an envelope starting above zero, a filter or LFO switched off abruptly).
// - peak: 1.0 (0 dB) means it clipped somewhere; keep it under about -1 dB.
// - brightness: the average spectral centroid and the share of energy above 2 kHz. A "too bright" note came from high
//   registers and sparkly timbres more than from hiss; compare before and after a change.
// - loudness: mean level per second (or per bar, with --bpm), to see builds, breakdowns and that an ending is silent.
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const [src, ...rest] = process.argv.slice(2);
if (!src) { console.error('usage: node check_audio.mjs <file> [--every 1] [--bpm 100 --bars 16]'); process.exit(1); }
const opt = (k, v) => { const i = rest.indexOf('--' + k); return i >= 0 ? +rest[i + 1] : v; };
const SR = 22050, T16 = join(tmpdir(), '_chk16.raw'), T32 = join(tmpdir(), '_chk32.raw');
execSync(`ffmpeg -loglevel error -y -i "${src}" -ac 1 -ar 48000 -f s16le "${T16}" && ffmpeg -loglevel error -y -i "${src}" -ac 1 -ar ${SR} -f f32le "${T32}"`);
const b16 = readFileSync(T16), s16 = new Int16Array(b16.buffer, b16.byteOffset, b16.length / 2);
let clicks = [], peak = 0;
for (let i = 2; i < s16.length; i++) {
  if (Math.abs(s16[i] - 2 * s16[i - 1] + s16[i - 2]) > 6000) clicks.push(+(i / 48000).toFixed(3));
  peak = Math.max(peak, Math.abs(s16[i]));
}
const b32 = readFileSync(T32), d = new Float32Array(b32.buffer, b32.byteOffset, b32.length / 4);
const N = 2048; let num = 0, den = 0, hi = 0, all = 0;
for (let o = 0; o + N < d.length; o += N * 4) {
  for (let k = 4; k < N / 2; k += 2) {
    let re = 0, im = 0; const w = 2 * Math.PI * k / N;
    for (let i = 0; i < N; i++) { const x = d[o + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)); re += x * Math.cos(w * i); im -= x * Math.sin(w * i); }
    const m = Math.hypot(re, im), hz = k * SR / N; num += hz * m; den += m; all += m * m; if (hz > 2000) hi += m * m;
  }
}
const step = opt('bpm', 0) ? 60 / opt('bpm') * 4 : opt('every', 1), levels = [];
for (let t = 0; t * SR < d.length; t += step) {
  let s = 0, c = 0; for (let i = Math.floor(t * SR); i < Math.min(d.length, (t + step) * SR); i++) { s += d[i] * d[i]; c++; }
  if (c) levels.push(`${t.toFixed(1)}s:${(10 * Math.log10(s / c + 1e-12)).toFixed(1)}`);
}
console.log(JSON.stringify({
  clicks: clicks.length, firstClicks: clicks.slice(0, 8), peakDb: +(20 * Math.log10(peak / 32768 + 1e-9)).toFixed(1),
  centroidHz: Math.round(num / den), above2kHzPct: +(100 * hi / all).toFixed(1),
}));
console.log((opt('bpm', 0) ? 'per bar ' : 'per step ') + levels.join('  '));
