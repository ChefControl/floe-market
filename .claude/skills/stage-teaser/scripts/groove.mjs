// Measures a reference track's groove: where in the bar the low, mid and high hits fall (an onset profile over 16
// sixteenths), how late the off-beats come (swing), which notes the bass sits on, and how much it slides.
// Usage: node groove.mjs <audio file> <bpm>   (the bpm from analyse-track.mjs; check its half/double)
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
const src = process.argv[2], BPM = +process.argv[3];
if (!src || !BPM) { console.error('usage: node groove.mjs <audio file> <bpm>'); process.exit(1); }
execSync(`ffmpeg -loglevel error -y -i "${src}" -ac 1 -ar 22050 -c:a pcm_f32le /tmp/_groove.wav`);
const buf = readFileSync('/tmp/_groove.wav');
let off = 12, data = null, sr = 22050;
while (off < buf.length) { const id = buf.toString('ascii', off, off + 4), len = buf.readUInt32LE(off + 4); if (id === 'fmt ') sr = buf.readUInt32LE(off + 12); if (id === 'data') { data = new Float32Array(buf.buffer.slice(buf.byteOffset + off + 8, buf.byteOffset + off + 8 + len)); break; } off += 8 + len; }
function fft(re, im) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } } for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let j = 0; j < len / 2; j++) { const ur = re[i + j], ui = im[i + j], vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr; re[i + j] = ur + vr; im[i + j] = ui + vi; re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } } }
const N = 1024, HOP = 256, fps = sr / HOP, frames = Math.floor((data.length - N) / HOP);
const win = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
const bandsHz = [[20, 150], [150, 1500], [1500, 11000]], prev = bandsHz.map(() => 0), flux = bandsHz.map(() => new Float32Array(frames)), lvl = bandsHz.map(() => new Float32Array(frames));
const re = new Float32Array(N), im = new Float32Array(N);
for (let f = 0; f < frames; f++) {
  for (let i = 0; i < N; i++) { re[i] = data[f * HOP + i] * win[i]; im[i] = 0; }
  fft(re, im);
  bandsHz.forEach(([a, b], j) => { let e = 0; for (let k = Math.ceil(a * N / sr); k < b * N / sr; k++) e += re[k] ** 2 + im[k] ** 2; const l = Math.log1p(e * 100); flux[j][f] = Math.max(0, l - prev[j]); prev[j] = l; lvl[j][f] = l; });
}
// the beat grid: tempo from before, phase that best lines the low-band onsets up with sixteenths
const bpm = BPM, six = fps * 60 / bpm / 4;
let bestPh = 0, bestS = -1;
for (let ph = 0; ph < six * 16; ph += 0.5) { let s = 0; for (let k = 0; ph + k * six * 16 < frames; k++) { const i = Math.round(ph + k * six * 16); s += flux[0][i] + (flux[0][i + 1] || 0); } if (s > bestS) { bestS = s; bestPh = ph; } }
const prof = bandsHz.map(() => new Float32Array(16)), late = new Float32Array(16), lateN = new Float32Array(16);
for (let j = 0; j < 3; j++) for (let q = 0; bestPh + q * six < frames - 8; q++) {
  const c = bestPh + q * six, pos = q % 16;
  // the strongest onset near this sixteenth, and how late it falls
  let m = 0, at = 0; for (let d = -Math.floor(six / 2); d < six / 2; d++) { const i = Math.round(c + d); if (i >= 0 && flux[j][i] > m) { m = flux[j][i]; at = d; } }
  prof[j][pos] += m; if (j === 2 && m > 0.5) { late[pos] += at / six; lateN[pos]++; }
}
const norm = a => Array.from(a, v => +(v / Math.max(...a)).toFixed(2));
// the bass pitch: the strongest bin 30–200 Hz with a long window, frame by frame, and how much it moves within a note
const N2 = 8192, H2 = 1024, pitches = [];
const re2 = new Float32Array(N2), im2 = new Float32Array(N2), w2 = Float32Array.from({ length: N2 }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N2));
for (let o = 0; o + N2 < data.length; o += H2) {
  for (let i = 0; i < N2; i++) { re2[i] = data[o + i] * w2[i]; im2[i] = 0; }
  fft(re2, im2);
  let bk = 0, bm = 0; for (let k = Math.ceil(30 * N2 / sr); k < 200 * N2 / sr; k++) { const m = re2[k] ** 2 + im2[k] ** 2; if (m > bm) { bm = m; bk = k; } }
  // parabolic interpolation for a finer pitch
  const a = Math.sqrt(re2[bk - 1] ** 2 + im2[bk - 1] ** 2), b = Math.sqrt(bm), c = Math.sqrt(re2[bk + 1] ** 2 + im2[bk + 1] ** 2), p = 0.5 * (a - c) / (a - 2 * b + c);
  const hz = (bk + p) * sr / N2; pitches.push(+(69 + 12 * Math.log2(hz / 440)).toFixed(1));
}
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const hist = {}; pitches.forEach(m => { const n = NAMES[((Math.round(m) % 12) + 12) % 12] + (Math.floor(Math.round(m) / 12) - 1); hist[n] = (hist[n] || 0) + 1; });
// glides: how often the bass pitch moves more than half a semitone between frames ~46 ms apart
let glides = 0, big = 0; for (let i = 1; i < pitches.length; i++) { const d = Math.abs(pitches[i] - pitches[i - 1]); if (d > 0.3 && d < 3) glides++; if (d >= 3) big++; }
console.log(JSON.stringify({
  phaseSec: +(bestPh / fps).toFixed(3),
  lowOnsetsBy16th: norm(prof[0]), midOnsetsBy16th: norm(prof[1]), highOnsetsBy16th: norm(prof[2]),
  highLateness: Array.from(late, (v, i) => lateN[i] ? +(v / lateN[i]).toFixed(2) : null),
  bassNotes: Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 8),
  bassMoves: { smallSlides: glides, jumps: big, frames: pitches.length },
  bassPitchSample: pitches.slice(200, 260).join(' '),
}, null, 1));
