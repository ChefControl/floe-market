// Reads and writes 16-bit PCM WAV files as Float32Arrays (mono; a stereo file is averaged to mono on read).
import { readFileSync, writeFileSync } from 'fs';

export function readWav(file) {
  const b = readFileSync(file); let o = 12, ch = 1, sr = 48000;
  while (b.toString('ascii', o, o + 4) !== 'data') {
    if (b.toString('ascii', o, o + 4) === 'fmt ') { ch = b.readUInt16LE(o + 10); sr = b.readUInt32LE(o + 12); }
    o += 8 + b.readUInt32LE(o + 4);
  }
  o += 8;
  const n = Math.floor((b.length - o) / 2 / ch), x = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < ch; c++) s += b.readInt16LE(o + 2 * (i * ch + c)); x[i] = s / ch / 32768; }
  return { x, sr };
}

export function writeWav(file, x, sr = 48000) {
  const n = x.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), 44 + 2 * i);
  writeFileSync(file, b);
}

/** Loudness of `x` per video frame (RMS × gain, capped at 1): drives a mouth or talk bars. */
export function levels(x, sr, fps, frames, gain = 7) {
  const per = sr / fps, out = [];
  for (let f = 0; f < frames; f++) {
    let q = 0; const a = Math.floor(f * per), b = Math.min(x.length, Math.floor((f + 1) * per));
    for (let i = a; i < b; i++) q += x[i] * x[i];
    out.push(+Math.min(1, Math.sqrt(q / Math.max(1, b - a)) * gain).toFixed(2));
  }
  return out;
}
