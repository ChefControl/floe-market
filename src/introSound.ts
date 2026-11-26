// The studio intro's sound (intro.ts), timed to its moves (index.html's #intro styles), in the game's key (D major
// pentatonic, audio.ts) and voiced like its effects: sines and soft rounded tones, under 4 kHz, every attack at least
// 8 ms and every gain starting from silence, so nothing clicks. It's its own little synth, apart from audio.ts, which
// comes with the game (and three.js) and would hold the intro up; `schedule` takes any context, so a test page can
// render it offline and scan it for pops.
import { testSilent } from './flags';
import { sfxVolume } from './soundPrefs';

/** The notes, as frequencies: D major pentatonic. */
const D3 = 146.83, D4 = 293.66, FS4 = 369.99, A4 = 440, D5 = 587.33, A5 = 880, D6 = 1174.66, FS6 = 1479.98, B6 = 1975.53;

interface Tone {
  /** When, in seconds from the start, and the frequency, gliding (exponentially) to `f2` over its decay. */
  t: number; f: number; f2?: number;
  /** Attack and decay, in seconds, and its peak. */
  a?: number; d: number; v: number;
  /** Its harmonics' levels after the first (a rounded tone; none: a sine). */
  harm?: number[];
}
interface Hiss {
  t: number; a: number; d: number; v: number;
  /** The filter: its frequency, gliding to `f2`, its Q and kind. */
  f: number; f2?: number; q?: number; kind?: BiquadFilterType;
  /** A flutter in its level: rate in Hz and depth, 0 to 1 (the band's ends in the wind). */
  flutter?: [number, number];
}

/** What plays, and when: in step with the moves. */
const TONES: Tone[] = [
  // the plate sets down: a soft ceramic ting
  { t: 0.36, f: FS6, a: 0.008, d: 0.35, v: 0.05 },
  { t: 0.36, f: FS6 * 2.4, a: 0.008, d: 0.12, v: 0.012 },
  // the rice ball falls (a whistle down) and lands: a soft plop
  { t: 0.56, f: D6, f2: A4, a: 0.03, d: 0.4, v: 0.022 },
  { t: 0.99, f: 200, f2: 120, a: 0.01, d: 0.2, v: 0.16, harm: [0.35, 0.12] },
  // the salmon lands on its head: a smaller plop, a step higher
  { t: 1.5, f: 300, f2: 190, a: 0.01, d: 0.16, v: 0.11, harm: [0.3, 0.1] },
  // the arms come up
  { t: 1.72, f: D5, f2: A5, a: 0.02, d: 0.26, v: 0.045, harm: [0.25] },
  // the lens glints: two glassy notes
  { t: 2.33, f: B6, a: 0.008, d: 0.5, v: 0.03 },
  { t: 2.41, f: D6 * 2, a: 0.008, d: 0.55, v: 0.025 },
  // the wink: a little blip
  { t: 2.62, f: FS6, f2: FS6 * 1.19, a: 0.008, d: 0.07, v: 0.028 },
  // ChefControl: a warm chord, strummed up, over a low D
  { t: 2.76, f: D3, a: 0.02, d: 1.6, v: 0.08 },
  { t: 2.76, f: D4, a: 0.012, d: 1.5, v: 0.06, harm: [0.3, 0.1] },
  { t: 2.79, f: FS4, a: 0.012, d: 1.45, v: 0.05, harm: [0.3, 0.1] },
  { t: 2.82, f: A4, a: 0.012, d: 1.4, v: 0.05, harm: [0.3, 0.1] },
  { t: 2.85, f: D5, a: 0.012, d: 1.35, v: 0.045, harm: [0.3, 0.1] },
];
const HISSES: Hiss[] = [
  // the rice ball landing: a soft squish under the plop
  { t: 0.99, a: 0.01, d: 0.08, v: 0.05, f: 600, kind: 'lowpass' },
  // the salmon's fall, its band's ends fluttering in the wind
  { t: 1.05, a: 0.14, d: 0.9, v: 0.06, f: 700, f2: 1100, q: 1.1, flutter: [8, 0.45] },
  { t: 1.5, a: 0.01, d: 0.06, v: 0.035, f: 1100, kind: 'lowpass' },
];
/** Seconds from the start until the last sound has died away. */
export const SOUND_LENGTH = Math.max(...TONES.map(o => o.t + (o.a ?? 0.01) + o.d), ...HISSES.map(o => o.t + o.a + o.d));

/** A gain that rises from silence over `a`, then dies away over `d`: nothing starts or stops with a jump. */
function envelope(c: BaseAudioContext, out: AudioNode, t: number, a: number, d: number, v: number) {
  const g = c.createGain();
  g.gain.value = 0;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  g.gain.linearRampToValueAtTime(0, t + a + d + 0.02);
  g.connect(out);
  return g;
}

/** Schedules the intro's sound into `out`, starting at `start` (the context's time). */
export function schedule(c: BaseAudioContext, out: AudioNode, start: number) {
  for (const o of TONES) {
    const t = start + o.t, a = o.a ?? 0.01, end = t + a + o.d + 0.05;
    const osc = c.createOscillator();
    if (o.harm) {
      const n = o.harm.length + 2, real = new Float32Array(n), imag = new Float32Array(n);
      imag[1] = 1;
      o.harm.forEach((h, i) => { imag[i + 2] = h; });
      osc.setPeriodicWave(c.createPeriodicWave(real, imag));
    }
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + a + o.d);
    osc.connect(envelope(c, out, t, a, o.d, o.v));
    osc.start(t); osc.stop(end);
  }
  const secs = 2, buf = c.createBuffer(1, Math.ceil(c.sampleRate * secs), c.sampleRate), data = buf.getChannelData(0);
  // (its own random numbers, so the game's luck is untouched)
  let seed = 0x5EED1E;
  for (let i = 0; i < data.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; data[i] = seed / 2 ** 31 - 1; }
  for (const o of HISSES) {
    const t = start + o.t, end = t + o.a + o.d + 0.05;
    const src = c.createBufferSource(), f = c.createBiquadFilter();
    src.buffer = buf;
    f.type = o.kind ?? 'bandpass';
    f.frequency.setValueAtTime(o.f, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.a + o.d);
    if (o.q) f.Q.value = o.q;
    src.connect(f);
    const g = envelope(c, out, t, o.a, o.d, o.v);
    if (o.flutter) {
      // the level wavers: a gain swinging between 1 − depth and 1
      const w = c.createGain(), lfo = c.createOscillator(), depth = c.createGain();
      w.gain.value = 1 - o.flutter[1] / 2;
      lfo.frequency.value = o.flutter[0];
      depth.gain.value = o.flutter[1] / 2;
      lfo.connect(depth); depth.connect(w.gain);
      f.connect(w); w.connect(g);
      lfo.start(t); lfo.stop(end);
    } else f.connect(g);
    src.start(t); src.stop(end);
  }
}

/** The sound playing: `fade` takes it away quickly (the intro skipped). */
export interface IntroSound { fade(): void }

/**
 * Plays the intro's sound at the effects' volume, through the game's own compressor: nothing when the effects are muted,
 * when the game's being tested (flags.ts: ?sound=on to hear it) or where there's no Web Audio.
 */
export function playIntroSound(): IntroSound | null {
  const v = sfxVolume();
  if (!v || testSilent() || typeof AudioContext === 'undefined') return null;
  const c = new AudioContext();
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -12; comp.knee.value = 10; comp.ratio.value = 4;
  comp.connect(c.destination);
  const master = c.createGain();
  master.gain.value = v;
  master.connect(comp);
  // (the desktop app lets sound start without a click: desktop/main.mjs)
  if (c.state !== 'running') void c.resume().catch(() => { /* no sound, then */ });
  schedule(c, master, c.currentTime + 0.03);
  const close = (s: number) => setTimeout(() => void c.close().catch(() => { /* gone already */ }), s * 1000);
  close(SOUND_LENGTH + 0.5);
  return {
    fade() {
      master.gain.setTargetAtTime(0, c.currentTime, 0.05);
      close(0.4);
    },
  };
}
