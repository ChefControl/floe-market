// Korki's tune at his golden statue (korki.ts): "5,000 km", as picked on the audition page, our own, in the game's own
// sound. It's sad, then heroic, for the good times: a felt piano plays a falling tune in B minor, alone and a little
// muffled, over two notes rocking back and forth (his alarm, slowed right down and far away); then the timpani swell and
// it turns to D major and climbs, the strings in octaves over a horn, a piano driving the chords, soft timpani and a
// march snare. The second time it climbs higher, a horn under the tune, and comes home to D major before the sad tune
// comes round again. It took its tempo, key and muffled sound from the song the statue played before; the tune and
// chords are our own.
//
// Thirty-two bars at 72, about a minute and three quarters, then round again. While it plays the game's sounds are on D
// major pentatonic (the same notes as B minor pentatonic). It plays into a mix of its own, through a room's reverb and
// a gentle low-pass (nothing much over 3 kHz), and music.ts fades it in as the player lingers on the statue's pad. As
// with the rest of the music: every note starts over at least 8 ms, nothing is bright above about 4 kHz, and nothing
// drops fast.
import { ac, buses, hz, noise, rnd, tone, type ToneVoice } from './audio';
import { type Bar, bars } from './score';

export const KORKI_TUNE = { sounds: 62, bpm: 72 };

// ---------- the tune ----------
/** The sad tune, sixteen bars: falling, with room in it, ending each half on the leading note or home. */
const SAD = bars(`r:2 d5 c#5 b4:4 | r:2 d5 e5 f#5:3 e5 | d5:4 a4:4 | c#5:2 b4 a4 e5:4 |
  r:2 d5 c#5 b4:2 f#5:2 | g5:3 f#5 e5:2 d5:2 | e5:2 d5 c#5 b4:2 g4:2 | a#4:6 r:2 |
  r:2 b5:2 a5 g5 f#5:2 | f#5:4 e5:2 d5:2 | e5:3 d5 b4:2 e5:2 | d5:6 r:2 |
  r:2 b5:2 a5 g5 d6:2 | c#6:4 b5:2 a5:2 | a#5:2 b5 c#6 f#5:4 | d5:2 c#5 b4:5`);
/** The good times: in D, rising in fourths. */
const HERO = bars(`a4:3 d5 e5:2 f#5:2 | e5:3 a4 c#5:2 e5:2 | f#5:3 e5 d5:2 b4:2 | d5:4 r:2 a4 d5 |
  g5:3 f#5 e5:2 d5:2 | f#5:3 e5 d5:2 a5:2 | g5:3 f#5 e5:2 e5 f#5 | e5:6 r:2`);
/** ...and the second time, climbing higher and home. */
const HOME = [...HERO.slice(0, 6), ...bars('b5:3 a5 g5:2 f#5 e5 | d5:6 r:2')];
const TUNE: Bar[] = [...SAD, ...HERO, ...HOME];

interface Chord { root: number; tones: number[] }
const ch = (root: number, tones: number[]): Chord => ({ root, tones });
/** Each chord's bass, and three notes in the middle. */
const CHORDS: Record<string, Chord> = {
  Bm: ch(47, [59, 62, 66]), G: ch(43, [59, 62, 66]), D: ch(50, [57, 62, 66]), A: ch(45, [57, 61, 64]),
  Em: ch(40, [59, 62, 67]), 'F#7': ch(42, [58, 61, 64]), Dmaj: ch(50, [57, 62, 66]), Gmaj: ch(43, [59, 62, 67]),
};
/** A chord a bar. */
const HARMONY = [
  'Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'F#7', 'G', 'D', 'Em', 'Bm', 'G', 'A', 'F#7', 'Bm',
  'Dmaj', 'A', 'Bm', 'Gmaj', 'Gmaj', 'Dmaj', 'Em', 'A', 'Dmaj', 'A', 'Bm', 'Gmaj', 'Gmaj', 'Dmaj', 'Gmaj', 'Dmaj',
].map(n => CHORDS[n]);
/** The two rocking notes: the chord's top two, an octave up, in eighths. */
const rock = (c: Chord, s: number) => c.tones[s % 2 ? 2 : 1] + 12;
/** The horn's note under the tune: the bar's chord tone nearest a tenth below it, so it's always in the chord. */
function under(c: Chord, n: number) {
  const pcs = [c.root, ...c.tones].map(p => p % 12);
  let m = n - 14;
  while (!pcs.includes(((m % 12) + 12) % 12)) m--;
  return m;
}

// ---------- the mix ----------
/** `level` fades it in and out (through a gentle low-pass); `dry` plays straight in, `wet` through a room's reverb as well. */
let level: GainNode | null = null, dry: GainNode, wet: GainNode, saw: PeriodicWave, reed: PeriodicWave;
function mix() {
  const c = ac!;
  level = c.createGain(); level.gain.value = 0;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = 0.5;
  level.connect(lp); lp.connect(buses.music);
  dry = c.createGain(); dry.connect(level);
  wet = c.createGain(); wet.connect(dry);
  const room = c.createConvolver(), n = Math.floor(c.sampleRate * 3), ir = c.createBuffer(2, n, c.sampleRate);
  for (let k = 0; k < 2; k++) {
    const d = ir.getChannelData(k);
    for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * (1 - i / n) ** 2;
  }
  room.buffer = ir;
  const send = c.createGain(); send.gain.value = 0.4;
  wet.connect(send); send.connect(room); room.connect(level);
  // soft waveforms with only their first few harmonics: a plain sawtooth clicks at its peaks
  const wave = (h: number[]) => {
    const re = new Float32Array(h.length + 1), im = new Float32Array(h.length + 1);
    h.forEach((v, k) => { im[k + 1] = v; });
    return c.createPeriodicWave(re, im);
  };
  saw = wave([1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6, 1 / 7, 1 / 8]);
  reed = wave([1, 0.5, 0.33, 0.18, 0.2, 0.08, 0.1, 0.04]);
}
const into = (room = true): Partial<ToneVoice> => ({ bus: 'music', out: room ? wet : dry });

// ---------- the band ----------
/** A felt piano: the hammer muffled, round and soft. */
function felt(m: number, t: number, v: number, d: number) {
  const f = hz(m);
  tone({ ...into(), t, f, a: 0.012, d, v, lp: Math.min(1600, f * 3), lp2: f * 1.2 });
  tone({ ...into(), t, f, type: 'triangle', detune: 4, a: 0.012, d: d * 0.6, v: v * 0.35, lp: 1200 });
}
/** A soft pad, slow in. */
const pad = (m: number, t: number, hold: number, v: number) =>
  tone({ ...into(), t, f: hz(m), type: 'triangle', a: 0.5, hold, d: 1.2, v, lp: 1200, vib: [0.3, 1] });
/** Strings: two soft sawtooths a few cents apart. */
function strings(m: number, t: number, hold: number, v: number, a = 0.4) {
  const f = hz(m);
  for (const detune of [-7, 7]) tone({ ...into(), t, f, wave: saw, detune, a, hold, d: 0.9, v: v / 2, lp: Math.min(1800, f * 4), vib: [5, f * 0.003] });
}
/** A soft acoustic piano. */
function piano(m: number, t: number, v: number, d: number) {
  const f = hz(m);
  tone({ ...into(), t, f, a: 0.008, d, v });
  tone({ ...into(), t, f, type: 'triangle', detune: 5, a: 0.008, d: d * 0.6, v: v * 0.4, lp: 2200 });
  if (f < 1000) tone({ ...into(), t, f: f * 2, a: 0.008, d: d * 0.25, v: v * 0.15 });
}
/** A round bass. */
function bass(m: number, t: number, v: number, d: number) {
  const f = hz(m);
  tone({ ...into(false), t, f, a: 0.015, d, v });
  tone({ ...into(false), t, f, type: 'triangle', a: 0.015, d: d * 0.6, v: v * 0.4, lp: 500 });
}
/** A French horn: warm, slow in, round. */
function horn(m: number, t: number, hold: number, v: number) {
  const f = hz(m);
  tone({ ...into(), t, f, wave: reed, a: 0.12, hold, d: 0.5, v, lp: Math.min(1400, f * 3), vib: [4.5, f * 0.002] });
  tone({ ...into(), t, f, a: 0.12, hold, d: 0.5, v: v * 0.6 });
}
/** A soft timpani: a low tom barely bending, nothing much under 95 Hz. */
function timp(t: number, v: number) {
  tone({ ...into(), t, f: 120, f2: 98, a: 0.015, d: 0.6, v });
  noise({ ...into(), t, f: 400, kind: 'lowpass', a: 0.012, d: 0.08, v: v * 0.2 });
}
/** A march snare, soft. */
function snare(t: number, v: number) {
  noise({ ...into(), t, f: 1700, q: 0.7, a: 0.01, d: 0.16, v });
  tone({ ...into(), t, f: 190, f2: 170, type: 'triangle', a: 0.01, d: 0.08, v: v * 0.6 });
}

/** Plays eighth `i` of the 32 bars at `t` seconds from now. */
export function playKorki(i: number, t: number) {
  if (!level) mix();
  const bar = Math.floor(i / 8) % TUNE.length, s = i % 8, c = HARMONY[bar], e = eighth(), hero = bar >= 16;
  const k = bar >= 24 ? 1.15 : 1;
  if (!hero) {
    // the felt piano alone: the bass note, the two rocking notes, a soft pad from the second half
    if (s === 0) felt(c.root, t, 0.06, 2.4);
    felt(rock(c, s), t, s % 2 ? 0.016 : 0.022, 0.7);
    if (s === 0 && bar >= 8) for (const m of c.tones) pad(m, t, 8 * e - 0.5, 0.008);
    // into the good times: the timpani swelling through the last bar
    if (bar === 15 && s >= 4) timp(t, 0.03 + (s - 4) * 0.015);
  } else {
    if (s === 0) for (const m of c.tones) strings(m, t, 8 * e - 0.4, 0.012 * k);
    if (s % 2 === 0) for (const m of c.tones) piano(m, t, (s ? 0.014 : 0.02) * k, 0.8);
    if (s % 2 === 0) bass(c.root + (s === 4 ? 7 : 0), t, (s % 4 ? 0.07 : 0.11) * k, 0.6);
    if (s === 0) horn(c.tones[1] - 12, t, 8 * e - 0.6, 0.03 * k);
    if (s === 0 || s === 4) timp(t, (s ? 0.05 : 0.08) * k);
    if (s === 2 || s === 6) snare(t, 0.022 * k);
    // a little ruff into the next bar
    if (s === 7) { snare(t, 0.01 * k); snare(t + e / 2, 0.014 * k); }
  }
  for (const [on, m, len] of TUNE[bar]) {
    if (on !== s) continue;
    const hold = len * e - 0.08;
    if (!hero) felt(m, t, 0.07, Math.min(2.6, len * e + 0.8));
    else {
      // the strings take the tune in octaves; the second time a horn sings under it
      strings(m, t, hold, 0.028 * k, 0.06);
      strings(m - 12, t, hold, 0.022 * k, 0.06);
      if (bar >= 24) horn(under(c, m), t, hold, 0.018);
    }
  }
}
/** An eighth note, in seconds. */
export const eighth = () => 60 / KORKI_TUNE.bpm / 2;
/** The 32 bars of eight eighths. */
export const KORKI_STEPS = TUNE.length * 8;

/** At full: a little under the rest of the music (rendered offline through the game's audio: at 0.5 it came out level
 *  with Hatikvah at its full), as his song was kept low, background to his story. */
const FULL = 0.35;
/** Fades the mix to `k` (0 to 1). Nothing's made until it's first heard. */
export function korkiLevel(k: number) {
  if (!ac || (!level && k < 0.001)) return;
  if (!level) mix();
  level!.gain.setTargetAtTime(k * FULL, ac.currentTime, 0.15);
}
/** How far the mix is faded in, 0 to 1, for the tests. */
export const korkiMix = () => (level?.gain.value ?? 0) / FULL;
