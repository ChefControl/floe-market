// The song in the rain at her house (rain.ts): "Caesarea", as picked on the audition page, our own, in the game's own
// sound. It was built from an analysis of the Mizrahi rain ballad that played there before (its key, the chords it
// moves among, its live band in a wide open-air sound, its groove and its shape); the tune and the parts are our own.
// F minor with the ballad's flat second, at 75: a bar of held strings, then the band comes in on a theme the strings
// play in unison with an oud; a violin sings the verse over piano in broken chords; the chorus swells, the strings
// singing the tune an octave down; the theme again as a break, falling through G♭; the last chorus a half step up, in
// F♯ minor; the strings fading.
//
// The Mizrahi is in the maqam and the band, never in turns or slides on the tune (those came across badly on the
// synth): Hijaz over the C7s (the D♭–E step) and Kurd's G♭, the darbuka in maqsum over a deep kick on every beat, a
// riq in the choruses, an oud strumming the offbeats, the bass bouncing with the drum, a tambourine pushing into each
// bar, and a qanun running up into each chorus.
//
// Thirty-three bars, about a minute and three quarters, then round again. While it plays the game's sounds are on A♭
// major pentatonic (the same notes as F minor pentatonic). It plays into a mix of its own, through a wide room's
// reverb, and music.ts fades it in as the rain starts. As with the rest of the music: every note starts over at least
// 8 ms, nothing is bright above about 4 kHz, and nothing drops fast.
import { ac, buses, hz, noise, rnd, tone, type ToneVoice } from './audio';
import { type Bar, bars, type Note } from './score';

export const RAIN_TUNE = { sounds: 68, bpm: 75 };

// ---------- the tune ----------
/** The band's theme, in unison: F minor, then Hijaz on C. */
const THEME = bars(`f4:0.5 g4:0.5 ab4 c5:1.5 db5:0.5 c5 bb4:0.5 ab4:0.5 g4 f4 |
  e4 f4 g4 ab4 g4:0.5 f4:0.5 e4 db4:0.5 c4:1.5`);
const VERSE = bars(`r:2 c5 db5 c5:2 ab4:2 | f5:3 eb5 db5:2 c5:2 | db5:3 c5 bb4:2 f4:2 | g4 ab4 bb4 c5 db5:2 e5:2 |
  f5:3 g5 f5:2 c5:2 | ab5:3 g5 f5:2 db5:2 | f5:2 gb5 f5 eb5:2 db5:2 | e5:2 db5:2 c5:4`);
const CHORUS = bars(`ab5:4 c6:2 bb5 ab5 | g5:4 bb5:2 ab5 g5 | f5:3 g5 ab5:2 c6:2 | c6:4 db6:2 c6:2 |
  bb5:3 ab5 f5:2 d5:2 | db5:3 eb5 f5:2 ab5:2 | g5:2 f5 e5 db5:2 e5:2 | f5:6 r:2`);
/** The break: the theme again and on, falling through G♭ (Kurd), and up into the lifted last chorus. */
const BREAK = bars(`f4:0.5 g4:0.5 ab4 c5:1.5 db5:0.5 c5 bb4:0.5 ab4:0.5 g4 f4 |
  ab4:0.5 bb4:0.5 c5 db5:1.5 eb5:0.5 db5 c5:0.5 bb4:0.5 ab4 g4 | gb4 ab4 bb4 db5 c5:0.5 bb4:0.5 ab4 gb4 f4 |
  f4 gb4 ab4 b4 ab4:2 f4:2`);
const up = (b: Bar[]): Bar[] => b.map(n => n.map(([on, m, len, turn]): Note => [on, m + 1, len, turn]));
const none = (b: Bar[]): Bar[] => b.map(() => []);
const STRINGS_BAR: Bar[] = [[]], FADE: Bar[] = [[], []];
/** The violin's tune, and what the strings and the oud play in unison: the theme and the break. */
const LEAD: Bar[] = [...STRINGS_BAR, ...none(THEME), ...VERSE, ...CHORUS, ...none(BREAK), ...up(CHORUS), ...FADE];
const UNISON: Bar[] = [...STRINGS_BAR, ...THEME, ...none(VERSE), ...none(CHORUS), ...BREAK, ...none(CHORUS), ...FADE];

interface Chord { root: number; tones: number[] }
const ch = (root: number, tones: number[]): Chord => ({ root, tones });
/** Each chord's bass, and three notes in the middle. */
const CHORDS: Record<string, Chord> = {
  Fm: ch(41, [56, 60, 65]), Db: ch(49, [56, 60, 65]), Bbm: ch(46, [53, 58, 61]), Bb7: ch(46, [56, 62, 65]),
  C7: ch(48, [55, 58, 64]), Gb: ch(42, [58, 61, 65]), Eb: ch(51, [55, 58, 63]), Db7: ch(49, [56, 59, 65]),
};
const lift = (c: Chord): Chord => ch(c.root + 1, c.tones.map(n => n + 1));
const CHORUS_CHORDS = ['Db', 'Eb', 'Fm', 'Fm', 'Bb7', 'Bbm', 'C7', 'Fm'];
/** A chord a bar; the break ends on D♭7, the way up to F♯ minor. */
const HARMONY: Chord[] = [
  ...['Fm', 'Fm', 'C7', 'Fm', 'Db', 'Bbm', 'C7', 'Fm', 'Db', 'Gb', 'C7'].map(n => CHORDS[n]),
  ...CHORUS_CHORDS.map(n => CHORDS[n]), ...['Fm', 'Db', 'Gb', 'Db7'].map(n => CHORDS[n]),
  ...CHORUS_CHORDS.map(n => lift(CHORDS[n])), lift(CHORDS.Fm), lift(CHORDS.Fm),
];
/** Where each part starts: 0 the held strings, 1 the band's theme, 2 verse, 3 chorus, 4 break, 5 last chorus, 6 the
 *  strings fading. */
const PARTS = [0, 1, 3, 11, 19, 23, 31];
const partOf = (bar: number) => PARTS.filter(b => bar >= b).length - 1;
/** How full each part plays. */
const SWELL = [0.7, 1, 0.85, 1.05, 0.95, 1.15, 0.7];
/** The qanun's runs up into each chorus, in sixteenths over the last two eighths before it (Hijaz on C; the second
 *  time up into F♯ minor). */
const RUNS: Record<number, number[]> = { 10: [72, 73, 76, 77], 22: [73, 74, 76, 78] };

// ---------- the mix ----------
/** `level` fades it in and out; `dry` plays straight in, `wet` through a wide room's reverb as well. */
let level: GainNode | null = null, dry: GainNode, wet: GainNode, saw: PeriodicWave;
function mix() {
  const c = ac!;
  level = c.createGain(); level.gain.value = 0; level.connect(buses.music);
  dry = c.createGain(); dry.connect(level);
  wet = c.createGain(); wet.connect(dry);
  const room = c.createConvolver(), n = Math.floor(c.sampleRate * 3.2), ir = c.createBuffer(2, n, c.sampleRate);
  for (let k = 0; k < 2; k++) {
    const d = ir.getChannelData(k);
    for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * (1 - i / n) ** 1.8;
  }
  room.buffer = ir;
  const send = c.createGain(); send.gain.value = 0.45;
  wet.connect(send); send.connect(room); room.connect(level);
  // a soft sawtooth: only its first eight harmonics (a plain one clicks at its peaks)
  const h = [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6, 1 / 7, 1 / 8], re = new Float32Array(9), im = new Float32Array(9);
  h.forEach((v, k) => { im[k + 1] = v; });
  saw = c.createPeriodicWave(re, im);
}
const into = (room = true): Partial<ToneVoice> => ({ bus: 'music', out: room ? wet : dry });

// ---------- the band ----------
/** The violin: plain, no slide and no turn, a natural vibrato. */
function violin(m: number, t: number, hold: number, v: number) {
  const f = hz(m);
  for (const detune of [-3, 3]) tone({ ...into(), t, f, wave: saw, detune, a: 0.07, hold, d: 0.3, v: v / 2, lp: Math.min(2600, f * 3), vib: [5.2, f * 0.004] });
}
/** Strings: two soft sawtooths a few cents apart. */
function strings(m: number, t: number, hold: number, v: number, a = 0.4) {
  const f = hz(m);
  for (const detune of [-7, 7]) tone({ ...into(), t, f, wave: saw, detune, a, hold, d: 0.9, v: v / 2, lp: Math.min(1800, f * 4), vib: [5, f * 0.003] });
}
/** A plucked string, bright then mellow: the oud (round and low) and the qanun's runs. */
const pluck = (m: number, t: number, v: number, d: number, bright: number) =>
  tone({ ...into(), t, f: hz(m), wave: saw, a: 0.008, d, v, lp: Math.min(3500, hz(m) * bright), lp2: hz(m) * 1.4 });
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
/** The deep kick: round, barely bending. */
const kick = (t: number, v: number) => tone({ ...into(false), t, f: 72, f2: 55, a: 0.012, d: 0.32, v });
/** The darbuka: the low doum, and the rim's tek (soft, it's the ka between). */
function doum(t: number, v: number) {
  tone({ ...into(false), t, f: 120, f2: 96, a: 0.012, d: 0.28, v });
  noise({ ...into(false), t, f: 500, kind: 'lowpass', a: 0.01, d: 0.05, v: v * 0.25 });
}
function tek(t: number, v: number) {
  noise({ ...into(), t, f: 2600, q: 1.4, a: 0.008, d: 0.05, v });
  tone({ ...into(), t, f: 420, a: 0.008, d: 0.05, v: v * 0.4 });
}
function snare(t: number, v: number) {
  noise({ ...into(), t, f: 1700, q: 0.7, a: 0.01, d: 0.16, v });
  tone({ ...into(), t, f: 190, f2: 170, type: 'triangle', a: 0.01, d: 0.08, v: v * 0.6 });
}
/** A tambourine's jingles, and a riq's: short shimmers kept under 4 kHz. */
const tambourine = (t: number, v: number) => noise({ ...into(), t, f: 3300, q: 2, a: 0.008, d: 0.07, v });
const riq = (t: number, v: number) => noise({ ...into(), t, f: 3400, q: 2.2, a: 0.008, d: 0.09, v });

/** Broken chords, eighth by eighth: up through the chord and back. */
const BROKEN = [0, 1, 2, 3, 4, 3, 2, 1];

/** Plays eighth `i` of the 33 bars at `t` seconds from now. */
export function playRain(i: number, t: number) {
  if (!level) mix();
  const bar = Math.floor(i / 8) % HARMONY.length, s = i % 8, p = partOf(bar), k = SWELL[p], c = HARMONY[bar], e = eighth();
  const band = p >= 1 && p <= 5, big = p === 3 || p === 5, song = p === 2 || big;
  // the strings, held: alone at first, under the song, swelling in the choruses (in the theme and the break they're busy)
  if (s === 0 && p !== 1 && p !== 4) {
    for (const m of c.tones) strings(m, t, 8 * e - 0.4, (p === 0 || p === 6 ? 0.018 : big ? 0.016 : 0.011) * k, p === 0 ? 1.2 : 0.4);
  }
  if (s === 0 && big) for (const m of c.tones) strings(m + 12, t, 8 * e - 0.4, 0.007 * k);
  if (song) piano([c.root + 12, ...c.tones, c.tones[0] + 12][BROKEN[s]], t, (s === 0 ? 0.03 : 0.022) * k, 1.1);
  if (band) {
    // the bass bouncing with the drum: the root on one, the fifth before three, the root on three, the octave
    if (s === 0) bass(c.root, t, 0.12 * k, 0.5);
    if (s === 3) bass(c.root + 7, t, 0.07 * k, 0.3);
    if (s === 4) bass(c.root, t, 0.1 * k, 0.45);
    if (s === 6) bass(c.root + 12, t, 0.06 * k, 0.25);
    // the deep kick on the beats, under the darbuka in maqsum: doum on one and three, tek on the and of one, the and of
    // two and four, soft ka between; the snare's weight on four
    if (s % 2 === 0) kick(t, (s % 4 ? 0.05 : 0.08) * k);
    if (s === 0 || s === 4) doum(t, (s ? 0.07 : 0.09) * k);
    if (s === 1 || s === 3 || s === 6) tek(t, 0.026 * k);
    if (s === 2 || s === 5 || s === 7) tek(t, 0.009 * k);
    if (s === 6) snare(t, 0.03 * k);
    // the tambourine in sixteenths, pushing into the bar; the riq in the choruses
    for (let j = 0; j < 2; j++) tambourine(t + j * e / 2, (s === 7 ? (j ? 0.02 : 0.014) : j ? 0.005 : 0.008) * k);
    if (big && (s === 2 || s === 6)) riq(t, 0.016 * k);
    // the oud strumming the offbeats
    if (s % 2) { pluck(c.root + 12, t, 0.018 * k, 0.35, 3); pluck(c.root + 19, t + 0.012, 0.013 * k, 0.35, 3); }
  }
  const run = RUNS[bar];
  if (run && s >= 6) for (let j = 0; j < 2; j++) pluck(run[(s - 6) * 2 + j], t + j * e / 2, 0.022 * k, 0.35, 3.5);
  for (const [on, m, len] of UNISON[bar]) {
    if (Math.floor(on) !== s) continue;
    // the theme: the strings in unison and an octave down, the oud with them
    const at = t + (on - s) * e, hold = len * e - 0.04;
    strings(m + 12, at, hold, 0.022 * k, 0.03);
    strings(m, at, hold, 0.018 * k, 0.03);
    pluck(m, at, 0.03 * k, Math.max(0.2, len * e), 3);
  }
  for (const [on, m, len] of LEAD[bar]) {
    if (on !== s) continue;
    const hold = len * e - 0.08;
    violin(m, t, hold, 0.05 * k);
    if (big) strings(m - 12, t, hold, 0.02 * k, 0.08);
  }
}
/** An eighth note, in seconds. */
export const eighth = () => 60 / RAIN_TUNE.bpm / 2;
/** The 33 bars of eight eighths. */
export const RAIN_STEPS = HARMONY.length * 8;

/** At full: 3 dB over the rest of the music (rendered offline through the game's audio, against Hatikvah at its full),
 *  so the rain doesn't cover it. */
const FULL = 0.87;
/** Fades the mix to `k` (0 to 1). Nothing's made until it's first heard. */
export function rainLevel(k: number) {
  if (!ac || (!level && k < 0.001)) return;
  if (!level) mix();
  level!.gain.setTargetAtTime(k * FULL, ac.currentTime, 0.15);
}
/** How far the mix is faded in, 0 to 1, for the tests. */
export const rainMix = () => (level?.gain.value ?? 0) / FULL;
