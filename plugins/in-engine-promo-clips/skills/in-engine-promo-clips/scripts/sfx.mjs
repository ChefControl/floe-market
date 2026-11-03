// Synthesised sound effects for clips, written straight into a mono buffer at given times. Every envelope starts and
// ends at zero and generated noise is softened, so nothing here trips a click check on its own.
//
//   import { track, sfx } from './sfx.mjs';
//   const tr = track(20);                 // 20 s at 48 kHz
//   sfx.ring(tr, 0.4);                    // an old phone's bell at 0.4 s
//   tr.put(readWav('hello.wav').x, 1.3, +6);
//   writeWav('fx.wav', tr.buf);
const TAU = Math.PI * 2;
export const dB = g => Math.pow(10, g / 20);
/** attack/release envelope for time t in a sound d long */
export const env = (t, d, a = 0.006, r = 0.03) => Math.max(0, Math.min(1, t / a, (d - t) / r));

/** A mono buffer `seconds` long, with helpers to place clips and synthesise into it. */
export function track(seconds, sr = 48000) {
  const buf = new Float32Array(Math.ceil(seconds * sr));
  let seed = 7;
  return {
    buf, sr,
    /** white noise, deterministic (the same mix every run) */
    rnd: () => (seed = (seed * 16807) % 2147483647) / 2147483647 * 2 - 1,
    /** adds f(t, k) (t: seconds into the sound, k: 0..1 of the way through) for `dur` seconds at `at`, at gain dB */
    synth(at, dur, f, gain = 0) {
      const o = Math.round(at * sr), n = Math.round(dur * sr), g = dB(gain);
      for (let i = 0; i < n && o + i < buf.length; i++) if (o + i >= 0) buf[o + i] += f(i / sr, i / n) * g;
    },
    /** adds a recorded clip at `at` seconds */
    put(x, at, gain = 0) {
      const o = Math.round(at * sr), g = dB(gain);
      for (let i = 0; i < x.length && o + i < buf.length; i++) if (o + i >= 0) buf[o + i] += x[i] * g;
      return x.length / sr;
    },
  };
}

/** noise high-passed by `hp` (0..1, higher is brighter) then softened by a low-pass `lp` (0..1, lower is softer) */
const noise = (tr, hp = 0.85, lp = 0.3) => { let y = 0, xp = 0, z = 0; return () => { const x = tr.rnd(); y = hp * (y + x - xp); xp = x; z += lp * (y - z); return z * 2; }; };
/** a sine whose frequency is f(t) */
const sweep = (tr, f) => { let p = 0; return t => { p += TAU * f(t) / tr.sr; return Math.sin(p); }; };

export const sfx = {
  /** an old phone's bell: bursts [[offset, length], …] */
  ring(tr, at, bursts = [[0, 0.38], [0.46, 0.32]], gain = -13) {
    const bell = t => (Math.sin(TAU * 1420 * t) + 0.6 * Math.sin(TAU * 1790 * t) + 0.25 * Math.sin(TAU * 2860 * t)) / 1.85 * (0.55 + 0.45 * Math.sin(TAU * 24 * t));
    for (const [o, d] of bursts) tr.synth(at + o, d, t => bell(t) * env(t, d), gain);
  },
  /** the line going dead */
  beep(tr, at, gain = -18) { tr.synth(at, 0.13, t => Math.sin(TAU * 880 * t) * env(t, 0.13, 0.004, 0.02), gain); },
  /** a phone (or anything) slammed down: a low thud */
  slam(tr, at, gain = -6) { const s = sweep(tr, t => 40 + 90 * Math.exp(-t * 30)); tr.synth(at, 0.22, t => s(t) * Math.exp(-t * 18) * env(t, 0.22, 0.002, 0.05), gain); },
  /** steam out of the ears */
  hiss(tr, at, dur = 0.4, gain = -20) { const n = noise(tr); tr.synth(at, dur, (t, k) => n() * Math.sin(Math.PI * Math.min(1, k * 1.6)) * Math.exp(-k * 2.5), gain); },
  /** a kettle whistle that climbs from `from` to `to` and stops dead at the end (the freeze) */
  kettle(tr, from, to, gain = -11) {
    const n = noise(tr, 0.9, 0.25), s = sweep(tr, t => 1600 + 650 * ((t / (to - from)) ** 2) + 25 * Math.sin(TAU * 6 * t));
    tr.synth(from, to - from, (t, k) => (s(t) * 0.8 + n() * 0.25) * Math.pow(k, 1.6) * env(t, to - from, 0.2, 0.012), gain);
  },
  /** a record scratch (on a freeze) */
  scratch(tr, at, gain = -12) {
    let p = 0, z = 0;
    tr.synth(at, 0.32, t => { p += TAU * (260 + 1300 * Math.abs(Math.sin(Math.PI * t / 0.16))) / tr.sr; const saw = 2 * (p / TAU % 1) - 1; z += 0.1 * (saw * 0.6 + tr.rnd() * 0.35 - z); return z * 2.6 * env(t, 0.32, 0.003, 0.06); }, gain);
  },
  /** a low drone swelling under a silence, cut off at `to` */
  drone(tr, from, to, gain = -14) { const d = to - from; tr.synth(from, d, (t, k) => (Math.sin(TAU * 55 * t) + 0.5 * Math.sin(TAU * 82.5 * t)) / 1.5 * (0.8 + 0.2 * Math.sin(TAU * 3 * t)) * Math.pow(k, 1.4) * env(t, d, 0.3, 0.01), gain); },
  /** lub-dub */
  heartbeat(tr, at, gain = -5) { for (const [o, g] of [[0, 0], [0.16, -4]]) { const s = sweep(tr, t => 50 + 40 * Math.exp(-t * 30)); tr.synth(at + o, 0.2, t => s(t) * Math.exp(-t * 16) * env(t, 0.2, 0.003, 0.05), gain + g); } },
  /** a kick: the body of a hit */
  kick(tr, at, gain = -4) { const s = sweep(tr, t => 45 + 95 * Math.exp(-t * 22)); tr.synth(at, 0.6, t => s(t) * Math.exp(-t * 6) * env(t, 0.6, 0.002, 0.1), gain); },
  /** a soft crash: the tail of a hit */
  crash(tr, at, dur = 0.9, gain = -15) { const n = noise(tr, 0.6, 0.14); tr.synth(at, dur, t => n() * 1.8 * Math.exp(-t * 5) * env(t, dur, 0.002, 0.2), gain); },
  /** a rush of noise opening up into a hit that lands at `at` */
  rush(tr, at, dur = 0.3, gain = -12) {
    let y = 0, xp = 0, z = 0;
    tr.synth(at - dur, dur, (t, k) => { const x = tr.rnd(); y = 0.8 * (y + x - xp); xp = x; z += (0.04 + 0.14 * k) * (y - z); return z * 1.8 * k * k * env(t, dur, 0.01, 0.006); }, gain);
  },
  /** a caption slamming in: rush, kick, crash */
  slamIn(tr, at, big = true) { sfx.rush(tr, at, 0.3, big ? -12 : -15); sfx.kick(tr, at, big ? -3 : -5); sfx.crash(tr, at, big ? 0.9 : 0.6, big ? -15 : -18); },
  /** a little pop (a bubble or icon appearing) */
  pop(tr, at, gain = -14) { const s = sweep(tr, t => 380 + 9000 * t); tr.synth(at, 0.09, t => s(t) * env(t, 0.09, 0.003, 0.04), gain); },
  /** something dropping into water */
  plop(tr, at, gain = -15) {
    const s = sweep(tr, t => 950 * Math.exp(-t * 18) + 240); tr.synth(at, 0.12, t => s(t) * env(t, 0.12, 0.003, 0.05), gain);
    const n = noise(tr, 0.7, 0.3); tr.synth(at + 0.02, 0.35, t => n() * Math.exp(-t * 9) * env(t, 0.35, 0.004, 0.1), gain - 5);
  },
};
