// The casino yacht's lounge band: "Five o'clock", a piano trio in 5/4, as picked on the listening page. The bar falls
// 3 + 2 (a long group, then a short one): the piano plays the tune in octaves over its own vamp (Dm9 for three beats,
// Em7 for two), with an upright bass and brushes, and a bridge of B♭maj7, Gm9 and A7♭9 that leads home. Once the
// stage is built, a cool, dry alto sax joins the tune in the last four bars and vibes harmonise the bridge.
//
// It's in D Dorian, a key of its own that stays put through the seasons, and while it plays the game's sounds are on F
// major pentatonic (the same notes as D minor pentatonic). Sixteen bars, then round again. The tune, the chords and the
// groove are our own, in the spirit of the classic 5/4 cool-jazz record, not taken from it.
//
// It plays into a mix of its own (music.ts fades it in up the quay): the piano, the sax and the vibes through a small
// room's reverb, the bass and the brushes dry.
import { ac, buses, hz, noise, rnd, tone, type ToneVoice } from './audio';

export const LOUNGE = { key: 62, sounds: 65, bpm: 132, swing: 0.6 };

/** The lounge's mix: `level` fades it in and out; `room` sends what goes through it to the reverb as well. */
let level: GainNode | null = null, plain: GainNode, room: GainNode, reed: PeriodicWave;
function mix() {
  const c = ac!;
  level = c.createGain(); level.gain.value = 0; level.connect(buses.music);
  plain = c.createGain(); plain.connect(level);
  room = c.createGain(); room.connect(plain);
  const verb = c.createConvolver(), send = c.createGain();
  verb.buffer = impulse(2.6, 2.4); send.gain.value = 0.2;
  room.connect(send); send.connect(verb); verb.connect(level);
  // a reed: the first eight harmonics, the odd ones a little stronger
  const n = 9, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) im[k] = (k % 2 ? 1 : 0.7) / k ** 1.1;
  reed = c.createPeriodicWave(re, im);
}
/** A room's echo, `secs` long: noise dying away, a little differently in each ear. */
function impulse(secs: number, decay: number) {
  const c = ac!, n = Math.floor(c.sampleRate * secs), b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * (1 - i / n) ** decay;
  }
  return b;
}

// ---------- the band ----------
// Every note starts over at least 8 ms, and nothing is bright up high: under the games for hours, a quick, high strike
// comes across as a little pop.
const wet = (): Partial<ToneVoice> => ({ bus: 'music', out: room });
const dry = (): Partial<ToneVoice> => ({ bus: 'music', out: plain });
/** A soft acoustic piano: a round tone, a little body a few cents off, and a quick octave on the strike. */
function piano(m: number, t: number, v: number, d: number) {
  const f = hz(m), o = wet();
  tone({ ...o, t, f, a: 0.008, d, v });
  tone({ ...o, t, f, type: 'triangle', detune: 5, a: 0.008, d: d * 0.6, v: v * 0.4, lp: 2200 });
  tone({ ...o, t, f: f * 2, a: 0.008, d: d * 0.25, v: v * 0.15 });
}
/** The piano's left hand: a chord without its root, the notes rolled a hair apart (no strike octave, to spare voices). */
function keys(name: Chord, t: number, v: number, d: number) {
  VOICINGS[name].forEach((m, j) => {
    const f = hz(m), o = wet();
    tone({ ...o, t: t + j * 0.007, f, a: 0.008, d, v });
    tone({ ...o, t: t + j * 0.007, f, type: 'triangle', detune: 5, a: 0.008, d: d * 0.6, v: v * 0.4, lp: 2200 });
  });
}
/** An upright bass: round, with a little thump, plucked. */
function upright(m: number, t: number, d: number, v: number) {
  const f = hz(m), o = dry();
  tone({ ...o, t, f, a: 0.012, d, v });
  tone({ ...o, t, f, type: 'triangle', a: 0.012, d: d * 0.6, v: v * 0.45, lp: 520 });
}
/** A cool, dry alto sax: scooping up into the note, hardly any vibrato, plenty of breath, darkening as it dies. */
function sax(m: number, t: number, hold: number, v: number) {
  const f = hz(m), o = wet();
  tone({ ...o, t, f, wave: reed, scoop: 0.985, a: 0.045, hold, d: 0.16, v, vib: [5.2, f * 0.002], lp: Math.min(3000, f * 4.5), lp2: Math.min(1800, f * 2.5) });
  noise({ ...o, t, f: Math.min(2200, f * 2), q: 1.1, a: 0.04, hold: hold * 0.7, d: 0.12, v: v * 0.45 });
}
const vibes = (m: number, t: number, v: number, d: number) => tone({ ...wet(), t, f: hz(m), a: 0.01, d, v, trem: [5.5, 0.7] });
/** A brush swirled round the snare, a brush tap, and the hi-hat's foot: all kept under about 4 kHz. */
const swirl = (t: number, len: number, v = 0.016) => noise({ ...dry(), t, f: 2300, f2: 2900, q: 0.6, a: len * 0.45, d: len * 0.55, v });
const brush = (t: number, v: number) => noise({ ...dry(), t, f: 3200, q: 0.6, a: 0.03, d: 0.14, v });
const chick = (t: number, v: number) => noise({ ...dry(), t, f: 3600, q: 1.4, a: 0.008, d: 0.05, v });

// ---------- the tune ----------
type Chord = 'Dm9' | 'Em7' | 'Bbmaj7' | 'Gm9' | 'A7';
/** The piano's chords, without their roots and with no half steps low down. */
const VOICINGS: Record<Chord, number[]> = {
  Dm9: [65, 69, 72, 76], Em7: [62, 64, 67, 71], Bbmaj7: [62, 65, 69, 72], Gm9: [58, 62, 65, 69], A7: [61, 64, 67, 70],
};
/** A bar of tune is [the eighth it starts on (0–9), its note, how many eighths it lasts]. */
type Bar = [number, number, number][];
const A: Bar[] = [
  [[0, 81, 3], [3, 79, 1], [4, 77, 2], [6, 76, 1], [7, 74, 3]],
  [[0, 72, 2], [2, 74, 4], [6, 69, 4]],
  [[0, 81, 3], [3, 83, 1], [4, 84, 2], [6, 83, 1], [7, 81, 3]],
  [[0, 77, 3], [3, 76, 1], [4, 72, 2], [6, 74, 4]],
];
const TURN: Bar = [[0, 76, 2], [2, 77, 2], [4, 72, 2], [6, 74, 4]];
const B: Bar[] = [
  [[0, 77, 3], [3, 81, 1], [4, 77, 2], [6, 74, 4]],
  [[0, 72, 2], [2, 74, 2], [4, 77, 2], [6, 81, 4]],
  [[0, 82, 3], [3, 81, 1], [4, 79, 2], [6, 77, 4]],
  [[0, 76, 2], [2, 73, 2], [4, 76, 2], [6, 79, 2], [8, 76, 2]],
];
/** A A′ B A: sixteen bars. */
export const FORM: Bar[] = [...A, ...A.slice(0, 3), TURN, ...B, ...A];
const BRIDGE: Chord[] = ['Bbmaj7', 'Bbmaj7', 'Gm9', 'A7'];
/** The bass a beat at a time, 3 + 2: root, fifth and third over Dm9, then root and fifth over Em7; the bridge's chords
 *  a bar each. */
const bassLine = (bar: number, bridge: boolean) => !bridge ? [38, 45, 41, 40, 47]
  : bar < 10 ? [34, 41, 38, 34, 41] : bar === 10 ? [43, 50, 46, 43, 50] : [33, 40, 37, 33, 40];
/** D minor, for the vibes' third under the bridge's tune. */
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const thirdUnder = (m: number) => m - (MINOR.includes((m - 4 - LOUNGE.key + 120) % 12) ? 4 : 3);

/** Plays eighth `i` of the sixteen bars (ten eighths a bar), at `t` seconds from now, with `parts` of the band (3 or 4). */
export function playLounge(i: number, t: number, parts: number) {
  if (!level) mix();
  const bar = Math.floor(i / 10) % FORM.length, s = i % 10, st = eighth(), bridge = bar >= 8 && bar < 12;
  // swing: the off-beats come late
  const at = s % 2 ? t + (LOUNGE.swing - 0.5) * 2 * st : t;
  const beat = s % 2 ? -1 : s / 2;
  if (beat >= 0) upright(bassLine(bar, bridge)[beat], at, st * 1.7, 0.19);
  if (!bridge) {
    if (s === 0) keys('Dm9', at, 0.03, st * 2.6);
    if (s === 7) keys('Em7', at, 0.028, st * 2.6);
  } else {
    if (s === 0) keys(BRIDGE[bar - 8], at, 0.03, st * 5);
    if (s === 6) keys(BRIDGE[bar - 8], at, 0.024, st * 3);
  }
  if (s === 0) swirl(at, st * 5.5);
  if (s === 6) { swirl(at, st * 3.5, 0.013); brush(at, 0.026); }
  if (s === 2 || s === 6) chick(at, 0.012);
  for (const [on, m, len] of FORM[bar]) {
    if (on !== s) continue;
    const d = Math.max(0.5, len * st * 1.3);
    piano(m, at, 0.05, d); piano(m - 12, at + 0.004, 0.032, d);
    if (parts >= 4 && bar >= 12) sax(m, at + 0.01, len * st * 0.85, 0.034);
    if (parts >= 4 && bridge) vibes(thirdUnder(m), at, 0.03, Math.max(0.6, len * st));
  }
}
/** An eighth note, in seconds. */
export const eighth = () => 60 / LOUNGE.bpm / 2;
/** Sixteen bars of ten eighths. */
export const LOUNGE_STEPS = FORM.length * 10;

/** The band at full: with its reverb it would be about 4 dB louder than the café band, so it's turned down to match. */
const FULL = 0.7;
/** Fades the lounge's mix to `k` (0 to 1). */
export function loungeLevel(k: number) {
  if (!ac) return;
  if (!level) mix();
  level!.gain.setTargetAtTime(k * FULL, ac.currentTime, 0.15);
}
/** How far the lounge's mix is faded in, 0 to 1, for the tests. */
export const loungeMix = () => (level?.gain.value ?? 0) / FULL;
