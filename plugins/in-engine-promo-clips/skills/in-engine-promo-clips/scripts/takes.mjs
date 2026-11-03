// Finds the takes in a voice recording so you can cut them without listening.
//
//   node takes.mjs <file.wav> [--gap 0.25] [--floor -42]
//
// Prints one line per take (start, end, length, loudest 10 ms in dB, clipped samples) and an envelope: one character
// per 50 ms, ' . : | #' from quiet to loud. Convert first: ffmpeg -i take.m4a -ac 1 -ar 48000 take.wav
// Takes closer together than --gap seconds are merged (a pause inside a sentence). Ask the speaker what each take says.
import { readWav } from './wav.mjs';

const [file, ...rest] = process.argv.slice(2);
if (!file) { console.error('usage: node takes.mjs <file.wav> [--gap 0.25] [--floor -42]'); process.exit(1); }
const opt = (k, v) => { const i = rest.indexOf('--' + k); return i >= 0 ? +rest[i + 1] : v; };
const { x, sr } = readWav(file), hop = sr / 100, gap = opt('gap', 0.25), floor = opt('floor', -42);
const db = [];
for (let i = 0; i + hop <= x.length; i += hop) { let q = 0; for (let j = i; j < i + hop; j++) q += x[j] * x[j]; db.push(10 * Math.log10(q / hop + 1e-12)); }
const takes = []; let cur = null;
db.forEach((d, k) => {
  if (d > floor) {
    if (cur && (k - cur.e) / 100 <= gap) { cur.e = k; cur.pk = Math.max(cur.pk, d); }
    else { cur = { s: k, e: k, pk: d }; takes.push(cur); }
  }
});
const clipped = (a, b) => { let n = 0; for (let i = Math.floor(a * sr); i < Math.min(x.length, b * sr); i++) if (Math.abs(x[i]) > 0.985) n++; return n; };
takes.filter(t => t.e - t.s >= 8).forEach((t, n) => {
  const a = t.s / 100, b = (t.e + 1) / 100, c = clipped(a, b);
  console.log(`take ${n + 1}: ${a.toFixed(2)}–${b.toFixed(2)} s (${(b - a).toFixed(2)} s), loudest ${t.pk.toFixed(1)} dB${c ? `, ${c} clipped samples: de-clip it` : ''}`);
});
let env = '';
for (let k = 0; k < db.length; k += 5) { const d = Math.max(...db.slice(k, k + 5)); env += d < -45 ? ' ' : d < -35 ? '.' : d < -28 ? ':' : d < -20 ? '|' : '#'; }
console.log(`envelope (50 ms per char): [${env}]`);
