// The voting boat's music, for Israel's election day only (votingBoat.ts): Hatikvah, the anthem, instrumental, as
// "Pad and celesta: Sunny" was picked on the listening page. The melody is Samuel Cohen's of 1888 (after the old "La
// Mantovana" tune), in the public domain; the arrangement is our own, in the game's own sound, not taken from any
// recording. Hopeful and lively: a celesta plays the tune over a bass bouncing on the beats, a thumb piano picks out the
// chords in eighths (running in sixteenths through the refrain), and a soft pad sits low under it all. From the second
// verse a glockenspiel rings the tune two octaves up and a frame drum and a hand's tap keep time; from the refrain a hum
// doubles the tune.
//
// It's in D minor as written, with brighter chords where the tune allows (B♭–F and C–F in place of Gm–Dm) and a last
// chord of D major: two verses, the refrain, and its last four bars again, as it's sung, softer in the verses and
// fullest at the end; then a bar's breath, and round again. While it plays, the game's sounds are on F major
// pentatonic (the same notes as D minor pentatonic).
//
// It plays into a mix of its own (music.ts fades it in as you walk out along the pier to the boat, once it's moored),
// through a room's reverb. As with the rest of the music: every note starts over at least 8 ms, nothing is bright above
// about 4 kHz, and nothing drops fast.
import { ac, buses, hz, noise, rnd, tone, type ToneVoice } from './audio';

/** At 100 beats a minute: a round is just under 51 seconds. */
export const HATIKVAH = { key: 62, sounds: 65, bpm: 100 };

// ---------- the tune ----------
/** A bar of tune is [the eighth it starts on (0–7), its note, how many eighths it lasts]. */
type Bar = [number, number, number][];
const VERSE: Bar[] = [
  [[0, 62, 1], [1, 64, 1], [2, 65, 1], [3, 67, 1], [4, 69, 2], [6, 69, 2]],
  [[0, 70, 1], [1, 69, 1], [2, 70, 1], [3, 74, 1], [4, 69, 4]],
  [[0, 67, 2], [2, 67, 1], [3, 67, 1], [4, 65, 2], [6, 65, 2]],
];
const HOME: Bar = [[0, 64, 1], [1, 62, 1], [2, 64, 1], [3, 65, 1], [4, 62, 4]];
/** The first verse's last bar, leading into the second. */
const ON: Bar = [[0, 64, 1], [1, 62, 1], [2, 64, 1], [3, 65, 1], [4, 62, 3], [7, 57, 1]];
const REFRAIN: Bar[] = [[[0, 62, 2], [2, 74, 2], [4, 74, 2], [6, 74, 2]], [[0, 72, 1], [1, 74, 1], [2, 72, 1], [3, 70, 1], [4, 69, 4]]];
const LAST: Bar[] = [
  [[0, 72, 2], [2, 72, 1], [3, 72, 1], [4, 65, 2], [6, 65, 2]],
  [[0, 67, 1], [1, 69, 1], [2, 70, 1], [3, 72, 1], [4, 69, 2], [6, 67, 1], [7, 65, 1]],
  [[0, 67, 2], [2, 67, 2], [4, 65, 2], [6, 65, 1], [7, 65, 1]],
  HOME,
];
/** Two verses, the refrain, its last four bars again, and a bar's breath: 21 bars. */
export const FORM: Bar[] = [...VERSE, ON, ...VERSE, HOME, ...REFRAIN, ...REFRAIN, ...LAST, ...LAST, []];

type Chord = 'Dm' | 'A7' | 'Bb' | 'C' | 'C7' | 'F' | 'D';
/** Two chords a bar (none in the breath): the anthem's own, brightened where the tune allows. B♭–F and C–F in the
 *  verses (and C–F late in the refrain) where it has Gm–Dm, F under the verses' long A, and D major at the very end. */
const HARMONY: [Chord, Chord][] = [
  ['Dm', 'F'], ['Bb', 'F'], ['C', 'F'], ['A7', 'Dm'], ['Dm', 'F'], ['Bb', 'F'], ['C', 'F'], ['A7', 'Dm'],
  ['Dm', 'Bb'], ['C7', 'F'], ['Dm', 'Bb'], ['C7', 'F'], ['F', 'F'], ['C7', 'F'], ['C', 'F'], ['A7', 'Dm'],
  ['F', 'F'], ['C7', 'F'], ['C', 'F'], ['A7', 'D'],
];
/** Each chord's bass, and three notes in the middle with no half steps between them. */
const CHORDS: Record<Chord, { root: number; tones: number[] }> = {
  Dm: { root: 38, tones: [57, 62, 65] }, A7: { root: 45, tones: [55, 61, 64] }, Bb: { root: 46, tones: [53, 58, 62] },
  C: { root: 48, tones: [55, 60, 64] }, C7: { root: 48, tones: [55, 58, 64] }, F: { root: 41, tones: [57, 60, 65] },
  D: { root: 38, tones: [57, 62, 66] },
};
const HALVES: (Chord | undefined)[] = HARMONY.flat();
/** How many half bars the chord starting at each half bar lasts (0 where it carries on from the one before). */
const SPAN = FORM.flatMap((_, b) => [b * 2, b * 2 + 1]).map(h => {
  const n = HALVES[h];
  if (!n || HALVES[h - 1] === n) return 0;
  let k = h + 1;
  while (HALVES[k] === n) k++;
  return k - h;
});
/** Softer in the verses, fuller through the refrain, fullest in its last four bars. */
const swell = (bar: number) => 0.8 * (bar < 4 ? 0.8 : bar < 8 ? 0.9 : bar < 16 ? 1 : 1.12);

// ---------- the mix ----------
/** The mix: `level` fades it in and out; the band plays into `plain`, and sends some on to `verb`, a room's reverb. */
let level: GainNode | null = null, plain: GainNode, verb: GainNode;
function mix() {
  const c = ac!;
  level = c.createGain(); level.gain.value = 0; level.connect(buses.music);
  plain = c.createGain(); plain.connect(level);
  verb = c.createGain();
  const room = c.createConvolver(), n = Math.floor(c.sampleRate * 2.6), ir = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * (1 - i / n) ** 2.4;
  }
  room.buffer = ir;
  verb.connect(room); room.connect(level);
}
/** Into the mix, with `rev` of it sent on to the room as well. */
const into = (rev: number): Partial<ToneVoice> => ({ bus: 'music', out: plain, sends: rev ? [[verb, rev]] : [] });

// ---------- the band ----------
/** A celesta: a struck bar with a soft overtone an octave up. */
function celesta(m: number, t: number, v: number) {
  const f = hz(m), o = into(0.35);
  tone({ ...o, t, f, a: 0.008, d: 0.9, v: v * 0.9 });
  tone({ ...o, t, f: f * 2, a: 0.008, d: 0.25, v: v * 0.15 });
}
/** A thumb piano's tine: round, with a quiet overtone, 10 ms in. */
function tine(m: number, t: number, v: number) {
  const f = hz(m), o = into(0.2);
  tone({ ...o, t, f, a: 0.01, d: 1.0, v });
  tone({ ...o, t, f: f * 3, a: 0.01, d: 0.15, v: v * 0.1 });
}
/** A glockenspiel: a bright struck bar, with an octave overtone only while that stays under 3.5 kHz. */
function glock(m: number, t: number, v: number) {
  const f = hz(m), o = into(0.35);
  tone({ ...o, t, f, a: 0.008, d: 0.6, v });
  if (f * 2 < 3500) tone({ ...o, t, f: f * 2, a: 0.008, d: 0.15, v: v * 0.12 });
}
/** A frame drum: low, barely bending, eased in. */
function drum(t: number, v: number) {
  tone({ ...into(0.12), t, f: 90, f2: 72, a: 0.015, d: 0.35, v });
  noise({ ...into(0), t, f: 380, kind: 'lowpass', a: 0.012, d: 0.06, v: v * 0.2 });
}
/** A hand's soft tap on the drum's skin, 10 ms in. */
function tap(t: number, v: number) {
  tone({ ...into(0), t, f: 220, f2: 190, type: 'triangle', a: 0.01, d: 0.07, v });
  noise({ ...into(0), t, f: 1300, q: 1, a: 0.01, d: 0.035, v: v * 0.5 });
}

/** The thumb piano's patterns: a note an eighth through the chord, and in the refrain a run in sixteenths. */
const PICK = [0, 1, 2, 1, 3, 1, 2, 1], RUN = [0, 1, 2, 3, 2, 1, 2, 3];
/** Plays eighth `i` of the 21 bars at `t` seconds from now. */
export function playHatikvah(i: number, t: number) {
  if (!level) mix();
  const bar = Math.floor(i / 8) % FORM.length, s = i % 8, h = bar * 2 + (s < 4 ? 0 : 1), name = HALVES[h], st = eighth(), k = swell(bar);
  // the last chord, held into the breath
  const fin = bar === FORM.length - 2 && s >= 4;
  if (name) {
    const ch = CHORDS[name], span = s % 4 === 0 ? SPAN[h] : 0;
    // the pad, low and soft, held through the chord (the last one rings on into the breath, over a held bass)
    if (span) {
      const last = !HALVES[h + span], len = span * 4 * st + (last ? 8 * st : 0);
      for (const m of ch.tones) tone({ ...into(0.4), t, f: hz(m), type: 'triangle', a: 0.6, hold: Math.max(0, len - 0.6), d: last ? 2.4 : 1.0, v: 0.01 * k, lp: 1100, vib: [0.3, 1] });
      if (last) tone({ ...into(0), t, f: hz(ch.root + 12), a: 0.03, hold: Math.max(0, len - 0.3), d: 2, v: 0.11 * k });
    }
    // the bass bouncing on the beats: root, octave, fifth, octave
    if (!fin && s % 2 === 0) tone({ ...into(0), t, f: hz(ch.root + [12, 24, 19, 24][s / 2]), a: 0.02, d: s % 4 ? 0.25 : 0.4, v: (s % 4 ? 0.1 : 0.15) * k });
    // the thumb piano, an octave up: eighths through the chord, running in sixteenths through the refrain
    const tones = [...ch.tones, ch.tones[0] + 12].map(m => m + 12);
    if (bar >= 8 && bar < 20) {
      tine(tones[RUN[(s * 2) % 8]], t, 0.02 * k);
      tine(tones[RUN[(s * 2 + 1) % 8]], t + st / 2, 0.016 * k);
    } else tine(tones[PICK[s]], t, (s === 0 ? 0.028 : 0.022) * k * 0.85);
    // from the second verse, the drum on 1 and 3 and a tap on 2 and 4 (and on the bar's last eighth in the refrain)
    if (!fin && bar >= 4) {
      if (s % 4 === 0) drum(t, (s ? 0.06 : 0.09) * k);
      if (s === 2 || s === 6) tap(t, 0.035 * k);
      if (bar >= 8 && s === 7) tap(t, 0.02 * k);
    }
  } else if (s === 0) drum(t, 0.07 * k);
  for (const [on, m, len] of FORM[bar]) {
    if (on !== s) continue;
    celesta(m + 12, t, 0.07 * k);
    // from the second verse a glockenspiel two octaves up, and from the refrain a hum doubling it
    if (bar >= 4) glock(m + 24, t + 0.006, 0.026 * k);
    if (bar >= 8) tone({ ...into(0.35), t, f: hz(m), a: 0.09, hold: Math.max(0.02, len * st - 0.16), d: 0.2, v: 0.03 * k, vib: [4.6, hz(m) * 0.004] });
  }
}
/** An eighth note, in seconds. */
export const eighth = () => 60 / HATIKVAH.bpm / 2;
/** The 21 bars of eight eighths. */
export const HATIKVAH_STEPS = FORM.length * 8;

/** At full: the same loudness as the casino yacht's lounge band at its own (rendered offline through the game's audio,
 *  a round of each: at the lounge's 0.7 it came out 1.7 dB over it). */
const FULL = 0.58;
/** Fades the mix to `k` (0 to 1). Nothing's made until it's first heard. */
export function hatikvahLevel(k: number) {
  if (!ac || (!level && k < 0.001)) return;
  if (!level) mix();
  level!.gain.setTargetAtTime(k * FULL, ac.currentTime, 0.15);
}
/** How far the mix is faded in, 0 to 1, for the tests. */
export const hatikvahMix = () => (level?.gain.value ?? 0) / FULL;
