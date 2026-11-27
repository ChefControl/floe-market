// Measures a reference track's feel, to take inspiration from it without copying its notes: tempo, key and mode,
// how much of each note it uses, brightness, how its loudness moves in 10 s steps (sections, builds, breakdowns) and
// the bass root bar by bar. Usage: node analyse-track.mjs <audio file>
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
const src = process.argv[2];
if (!src) { console.error('usage: node analyse-track.mjs <audio file>'); process.exit(1); }
execSync(`ffmpeg -loglevel error -y -i "${src}" -ac 1 -ar 22050 -c:a pcm_f32le /tmp/_track.wav`);
const buf = readFileSync('/tmp/_track.wav');
// find the data chunk
let off = 12, data = null, sr = 22050;
while (off < buf.length) { const id = buf.toString('ascii', off, off + 4), len = buf.readUInt32LE(off + 4); if (id === 'fmt ') sr = buf.readUInt32LE(off + 12); if (id === 'data') { data = new Float32Array(buf.buffer.slice(buf.byteOffset + off + 8, buf.byteOffset + off + 8 + len)); break; } off += 8 + len; }
const N = 4096, HOP = 512, frames = Math.floor((data.length - N) / HOP);
function fft(re, im) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } } for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let j = 0; j < len / 2; j++) { const ur = re[i + j], ui = im[i + j], vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr; re[i + j] = ur + vr; im[i + j] = ui + vi; re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } } }
const win = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
const binHz = sr / N, pc = new Int8Array(N / 2).fill(-1), midiOf = new Float32Array(N / 2);
for (let k = 1; k < N / 2; k++) { const f = k * binHz; if (f < 55 || f > 2000) continue; const m = 69 + 12 * Math.log2(f / 440); midiOf[k] = m; pc[k] = ((Math.round(m) % 12) + 12) % 12; }
let prev = new Float32Array(N / 2), flux = new Float32Array(frames), chroma = Array.from({ length: frames }, () => new Float32Array(12)), bassPc = Array.from({ length: frames }, () => new Float32Array(12));
let cent = 0, centN = 0, bands = [0, 0, 0], rms = new Float32Array(frames);
const re = new Float32Array(N), im = new Float32Array(N);
for (let f = 0; f < frames; f++) {
  let e = 0;
  for (let i = 0; i < N; i++) { const x = data[f * HOP + i]; re[i] = x * win[i]; im[i] = 0; e += x * x; }
  rms[f] = Math.sqrt(e / N);
  fft(re, im);
  let fl = 0, num = 0, den = 0;
  for (let k = 1; k < N / 2; k++) {
    const mag = Math.hypot(re[k], im[k]), lm = Math.log1p(mag * 10);
    fl += Math.max(0, lm - prev[k]); prev[k] = lm;
    const hz = k * binHz; num += hz * mag; den += mag;
    if (hz < 200) bands[0] += mag * mag; else if (hz < 2000) bands[1] += mag * mag; else bands[2] += mag * mag;
    if (pc[k] >= 0) { chroma[f][pc[k]] += mag; if (hz < 180) bassPc[f][pc[k]] += mag; }
  }
  flux[f] = fl; if (den > 0) { cent += num / den; centN++; }
}
const fps = sr / HOP;
// tempo: autocorrelation of the onset curve (mean-removed), 60–180 BPM
const m = flux.reduce((a, b) => a + b) / frames, o = flux.map(x => Math.max(0, x - m));
let best = [];
for (let bpm = 60; bpm <= 180; bpm += 0.5) { const lag = fps * 60 / bpm; let s = 0; for (let i = 0; i + lag + 1 < frames; i++) { const l0 = Math.floor(lag), fr = lag - l0; s += o[i] * (o[i + l0] * (1 - fr) + o[i + l0 + 1] * fr); } best.push([bpm, s]); }
best.sort((a, b) => b[1] - a[1]);
// key: Krumhansl-Schmuckler on the summed chroma
const tot = new Float32Array(12); chroma.forEach(c => c.forEach((v, i) => tot[i] += v));
const MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], MIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const corr = (a, b) => { const ma = a.reduce((x, y) => x + y) / 12, mb = b.reduce((x, y) => x + y) / 12; let n = 0, da = 0, db = 0; for (let i = 0; i < 12; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return n / Math.sqrt(da * db); };
const keys = [];
for (let k = 0; k < 12; k++) { const rot = p => Array.from({ length: 12 }, (_, i) => p[(i - k + 12) % 12]); keys.push([NAMES[k] + ' major', corr(tot, rot(MAJ))], [NAMES[k] + ' minor', corr(tot, rot(MIN))]); }
keys.sort((a, b) => b[1] - a[1]);
const totN = Array.from(tot).map(v => v / Math.max(...tot));
// energy by 10 s, onset density by 10 s
const secs = frames / fps, energy = [];
for (let s0 = 0; s0 < secs; s0 += 10) { const a = Math.floor(s0 * fps), z = Math.min(frames, Math.floor((s0 + 10) * fps)); let e = 0, on = 0; for (let i = a; i < z; i++) { e += rms[i]; if (i > 0 && o[i] > 3 * m && o[i] >= o[i - 1] && o[i] >= (o[i + 1] ?? 0)) on++; } energy.push([s0, +(20 * Math.log10(e / (z - a) + 1e-9)).toFixed(1), on]); }
// bass roots per bar at the found tempo: the strongest bass pitch class in each bar
const bpm = best[0][1] > 0 ? best[0][0] : 120, barF = fps * 60 / bpm * 4, roots = [];
for (let s0 = 0; s0 + barF < frames && roots.length < 40; s0 += barF) { const acc = new Float32Array(12); for (let i = Math.floor(s0); i < s0 + barF; i++) bassPc[i].forEach((v, j) => acc[j] += v); roots.push(NAMES[acc.indexOf(Math.max(...acc))]); }
console.log(JSON.stringify({
  seconds: +secs.toFixed(1), tempo: best.slice(0, 6), key: keys.slice(0, 4),
  chroma: Object.fromEntries(NAMES.map((n, i) => [n, +totN[i].toFixed(2)])),
  centroidHz: Math.round(cent / centN), bandShare: bands.map(b => +(b / (bands[0] + bands[1] + bands[2])).toFixed(3)),
  energyBy10s: energy, barRoots: roots.join(' '),
}, null, 1));
