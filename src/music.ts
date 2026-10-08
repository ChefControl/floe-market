// The music, made up as it plays. Each stage has its own, and the step up between them is part of the reward:
//
// - Stage 1, the market: a thumb piano (kalimba) and a hand drum, small and handmade, in D minor. The kalimba picks
//   out the same pattern bar after bar; a frame drum, a shaker, a tune and a bass line join as the market grows.
// - Stage 2, the restaurant: a little jazz café band. Electric piano chords with sevenths and ninths, a bass, drums
//   and a lead voice, and each season its own key, feel and band: a slow ballad with celesta and sleigh bells in
//   winter, a bossa nova with a flute in spring, a brighter swing on vibraphone in summer, and a warm minor-key swing
//   on a reed in autumn. Parts come in as the restaurant is built: chords, a bass and the tune to start, then the
//   drums and a walking bass, then busier piano and the tune answering itself, then a second voice.
//
// Each tune plays twice, and after every two tunes a verse leaves the tune out, for a rest. The music fades away
// under the songs (her house, Korki's statue), the rain and the stage-up's fanfare. The game's own sounds are on the
// major pentatonic of the music's key (F for stage 1's D minor: the same notes), so they ring along with it.
import { ac, duck, hz, key, noise, prefs, rnd, tone, type Voice } from './audio';
import { stage } from './layout';
import { rainK } from './rain';
import { current, type Season } from './season';
import { staging } from './stage';
import { stageProgress } from './unlocks';
import { songWanted } from './youtube';

// ---------- harmony ----------
/** Chord qualities, as intervals up from the chord's root. */
const Q = {
  maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14], m7: [0, 3, 7, 10], dom13: [0, 4, 10, 14, 21], dom9: [0, 4, 10, 14],
  dom7: [0, 4, 7, 10],
};
type Chord = [root: number, quality: keyof typeof Q];
interface Band {
  /** The key (a MIDI note), beats a minute, and how late the off-beats fall. */
  key: number;
  bpm: number;
  swing: number;
  /** A chord a bar, eight bars a verse, in semitones up from the key. */
  chords: Chord[];
  lead: (m: number, t: number, v: number) => void;
  drums: (step: number, t: number) => void;
}

/** The major scale, for the tunes. */
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

// ---------- the band's instruments ----------
// No instrument here has a quick, high strike overtone, and every note starts over at least 8 ms: on a tune that
// plays all the time, those come across as little high-pitched pops.
const M: Partial<Voice> = { bus: 'music' };
/** Electric piano: a sine with a shimmer, a soft overtone an octave up, and a second voice a hair out of tune. */
function ep(m: number, t: number, v: number, d: number) {
  const f = hz(m);
  tone({ ...M, t, f, a: 0.01, d, v, trem: [4.5, 0.4] });
  tone({ ...M, t, f: f * 2, a: 0.012, d: d * 0.25, v: v * 0.25 });
  tone({ ...M, t, f, type: 'triangle', a: 0.01, d, v: v * 0.5, detune: 8 });
}
const vibes = (m: number, t: number, v: number) => tone({ ...M, t, f: hz(m), a: 0.01, d: 1.0, v, trem: [5.5, 0.6] });
const flute = (m: number, t: number, v: number) => {
  tone({ ...M, t, f: hz(m), a: 0.06, hold: 0.12, d: 0.35, v, vib: [5, 4] });
  noise({ ...M, t, f: hz(m) * 2, q: 3, a: 0.04, d: 0.1, v: v * 0.25 });
};
const reed = (m: number, t: number, v: number) => tone({ ...M, t, f: hz(m), type: 'square', lp: 1700, a: 0.04, hold: 0.1, d: 0.35, v: v * 0.55, vib: [5, 3] });
/** A celesta, at the tune's own pitch: a struck bar with a soft octave overtone (a bell's would wear on the ear all winter). */
const celesta = (m: number, t: number, v: number) => {
  const f = hz(m);
  tone({ ...M, t, f, a: 0.008, d: 0.9, v: v * 0.9 });
  tone({ ...M, t, f: f * 2, a: 0.008, d: 0.25, v: v * 0.15 });
};
const brush = (t: number, v = 0.05) => noise({ ...M, t, f: 3200, q: 0.6, a: 0.03, d: 0.14, v });
const ride = (t: number, v = 0.03) => noise({ ...M, t, f: 6500, kind: 'highpass', q: 0.7, a: 0.01, d: 0.14, v });
const hat = (t: number, v = 0.02) => noise({ ...M, t, f: 6000, kind: 'highpass', q: 0.7, a: 0.008, d: 0.04, v });
/** A soft, round thump: low, barely bending, eased in. (A kick that starts high and drops fast is a pop.) */
const kick = (t: number, v = 0.12) => tone({ ...M, t, f: 72, f2: 52, a: 0.015, d: 0.28, v });
/** The bossa's cross-stick, as a gentle wooden tock rather than a click. */
const rim = (t: number) => tone({ ...M, t, f: 880, type: 'triangle', a: 0.01, d: 0.06, v: 0.035 });
/** Sleigh bells: a soft shimmer rather than a tick. */
const bells = (t: number) => noise({ ...M, t, f: 5200, q: 2, a: 0.02, d: 0.1, v: 0.02 });

// ---------- the bands, one a season ----------
export const BANDS: Record<Season, Band> = {
  // D major, a slow ballad: celesta over brushes and sleigh bells
  winter: {
    key: 62, bpm: 84, swing: 0.6, lead: celesta,
    chords: [[0, 'maj9'], [9, 'm9'], [2, 'm9'], [7, 'dom13'], [4, 'm7'], [9, 'm9'], [2, 'm9'], [7, 'dom13']],
    drums: (s, t) => { if (s % 4 === 2) brush(t); if (s % 2 === 0) bells(t); },
  },
  // F major, a bossa nova: flute over a rim-click clave and a shaker, the eighths straight
  spring: {
    key: 65, bpm: 92, swing: 0.5, lead: flute,
    chords: [[0, 'maj9'], [2, 'm9'], [4, 'm7'], [5, 'maj9'], [2, 'm9'], [7, 'dom9'], [0, 'maj9'], [0, 'maj9']],
    drums: (s, t) => { if ([0, 3, 6].includes(s % 8)) rim(t); hat(t, 0.02); if (s % 4 === 0) kick(t, 0.1); },
  },
  // G major, a brighter swing: vibraphone over the ride cymbal
  summer: {
    key: 67, bpm: 96, swing: 0.64, lead: vibes,
    chords: [[2, 'm7'], [7, 'dom9'], [0, 'maj9'], [4, 'dom7'], [2, 'm9'], [7, 'dom13'], [0, 'maj9'], [0, 'maj9']],
    drums: (s, t) => { if (s % 8 !== 1 && s % 8 !== 5) ride(t, s % 2 ? 0.02 : 0.03); if (s % 4 === 2) hat(t, 0.02); },
  },
  // C minor (on E-flat's notes), a warm, slow swing: a reed over brushes
  fall: {
    key: 63, bpm: 82, swing: 0.6, lead: reed,
    chords: [[9, 'm9'], [2, 'm9'], [7, 'dom13'], [0, 'maj9'], [9, 'm9'], [5, 'maj9'], [2, 'm9'], [7, 'dom13']],
    drums: (s, t) => { if (s % 4 === 2) brush(t, 0.06); if (s % 8 === 0) kick(t, 0.1); },
  },
};
const BARS = 8, STEPS = 8;

/** A chord's notes as pitch classes (0–11), for the tune to land on. */
export const classes = (key: number, [root, q]: Chord) => new Set(Q[q].map(i => (key + root + i) % 12));
/**
 * A chord laid out for the piano, without its root (the bass has that), from F#3 up. No two neighbouring notes are a
 * half step apart: down here that's a rough, muddy clash, so the lower of the two goes up an octave instead (a seventh
 * apart sounds open, not rough).
 */
export function voicing(key: number, [root, q]: Chord) {
  const v = Q[q].slice(1).map(i => { let m = key + root + i; while (m >= 66) m -= 12; while (m < 54) m += 12; return m; });
  for (let tries = 0; tries < 4; tries++) {
    v.sort((a, b) => a - b);
    const i = v.findIndex((m, j) => j > 0 && m - v[j - 1] === 1);
    if (i < 0) break;
    v[i - 1] += 12;
  }
  return v.sort((a, b) => a - b);
}

// ---------- the tune ----------
/** Rhythms for a bar of tune, in eighths: x is a note. */
const RHYTHMS = ['x.x.xx..', 'xx.x..x.', 'x..xx.x.', '.x.x.xx.', 'x.....x.', 'x.x.x.x.', '..xx.x..', 'x..x..x.'];
interface Note { s: number; m: number }
/** A bar of tune: a walk up and down the key's major scale, landing on the chord's notes on the beat. */
function bar(b: Band, c: Chord, start: number): { notes: Note[]; end: number } {
  const rh = RHYTHMS[Math.floor(rnd() * RHYTHMS.length)], pcs = classes(b.key, c), notes: Note[] = [];
  let n = start;
  const pitch = (k: number) => b.key + 12 + 12 * Math.floor(k / 7) + MAJOR[((k % 7) + 7) % 7];
  for (let s = 0; s < STEPS; s++) {
    if (rh[s] !== 'x') continue;
    if (notes.length) n = Math.max(0, Math.min(8, n + [-2, -1, -1, 1, 1, 2][Math.floor(rnd() * 6)]));
    // on the beat, to the nearest note of the chord
    if (s % 2 === 0) for (const d of [0, 1, -1, 2, -2]) if (pcs.has(pitch(n + d) % 12)) { n += d; break; }
    // A note a half step above one of the chord's (the fourth over a major chord) clashes with it: fine as a quick
    // passing note on the way to the next, but one that's held steps down onto the chord.
    const pc = pitch(n) % 12, passing = s % 2 === 1 && rh[s + 1] === 'x';
    if (!passing && !pcs.has(pc) && pcs.has((pc + 11) % 12)) n -= 1;
    notes.push({ s, m: pitch(n) });
  }
  return { notes, end: n };
}
/** Moves held notes that clash with the chord (a half step above one of its notes) down onto it. */
function settle(notes: Note[], b: Band, c: Chord) {
  const pcs = classes(b.key, c);
  return notes.map((n, j) => {
    const pc = n.m % 12, passing = n.s % 2 === 1 && notes[j + 1]?.s === n.s + 1;
    return !passing && !pcs.has(pc) && pcs.has((pc + 11) % 12) ? { s: n.s, m: n.m - 1 } : n;
  });
}
/** Eight bars of tune: a four-bar phrase, then its first two bars again (over their new chords) and a new ending. */
export function compose(b: Band): Note[][] {
  const out: Note[][] = [];
  let n = 7;
  for (let i = 0; i < BARS; i++) {
    if (i === 4 || i === 5) { out.push(settle(out[i - 4], b, b.chords[i])); continue; }
    const r = bar(b, b.chords[i], n);
    out.push(r.notes); n = r.end;
  }
  // the last note heads home: the key's root, or the chord's note nearest it (over the V chord, the leading tone,
  // which the verse resolves when it comes round)
  const last = out[BARS - 1], home = b.key + 12, pcs = classes(b.key, b.chords[BARS - 1]);
  const d = [0, -1, 1, -2, 2, -3, 3].find(x => pcs.has((home + x) % 12)) ?? 0;
  if (last.length) last[last.length - 1] = { s: last[last.length - 1].s, m: home + d };
  return out;
}

// ---------- stage 1: kalimba & hand drum ----------
/** D minor, on its pentatonic (D F G A C); the game's sounds play in F major, which has the same notes. */
const MARKET = { key: 62, sounds: 65, bpm: 92, swing: 0.54 };
/** A chord a bar, round twice a verse: Dm, C, B♭, C (i, ♭VII, ♭VI, ♭VII), as [root, intervals] up from D. */
export const MARKET_CHORDS: [number, number[]][] = [[0, [0, 3, 7]], [10, [0, 4, 7]], [8, [0, 4, 7]], [10, [0, 4, 7]]];
const MINOR_PENTA = [0, 3, 5, 7, 10];
const MARKET_RHYTHMS = ['x...x...', 'x.x...x.', '..x.x...', 'x.....x.'];
/**
 * A thumb piano: a round tine and a quick, soft overtone (a harmonic one, easier on the ear than a real tine's). On
 * the highest notes the overtone would ping above 3.5 kHz, so they go without.
 */
const kalimba = (m: number, t: number, v: number) => {
  const f = hz(m);
  tone({ ...M, t, f, a: 0.006, d: 1.1, v });
  if (f * 3 < 3500) tone({ ...M, t, f: f * 3, a: 0.006, d: 0.12, v: v * 0.12 });
};
const frameDrum = (t: number, v: number) => {
  tone({ ...M, t, f: 95, f2: 70, a: 0.012, d: 0.3, v });
  noise({ ...M, t, f: 400, kind: 'lowpass', a: 0.01, d: 0.06, v: v * 0.25 });
};
const slap = (t: number) => {
  tone({ ...M, t, f: 220, f2: 190, type: 'triangle', a: 0.008, d: 0.07, v: 0.05 });
  noise({ ...M, t, f: 1300, q: 1, a: 0.006, d: 0.035, v: 0.025 });
};
const shaker = (t: number) => noise({ ...M, t, f: 7000, kind: 'highpass', q: 0.7, a: 0.008, d: 0.03, v: 0.02 });

/**
 * Eight bars of tune for the market: a walk on the minor pentatonic from A4 up to C6, on the chord's notes on the
 * beat, and never holding a note a half step off one of them.
 */
export function marketTune(): Note[][] {
  const base = MARKET.key + 12, L = MINOR_PENTA.length;
  const pitch = (k: number) => base + 12 * Math.floor(k / L) + MINOR_PENTA[((k % L) + L) % L];
  let n = 0;
  return Array.from({ length: BARS }, (_, b) => {
    const [root, iv] = MARKET_CHORDS[b % 4], pcs = new Set(iv.map(x => (MARKET.key + root + x) % 12));
    const rh = MARKET_RHYTHMS[Math.floor(rnd() * MARKET_RHYTHMS.length)], notes: Note[] = [];
    for (let s = 0; s < STEPS; s++) {
      if (rh[s] !== 'x') continue;
      if (notes.length) n = Math.max(-2, Math.min(4, n + [-2, -1, -1, 1, 1, 2][Math.floor(rnd() * 6)]));
      if (s % 2 === 0) for (const d of [0, 1, -1, 2, -2]) if (pcs.has(pitch(n + d) % 12)) { n += d; break; }
      const pc = pitch(n) % 12, passing = s % 2 === 1 && rh[s + 1] === 'x';
      if (!passing && !pcs.has(pc)) { if (pcs.has((pc + 11) % 12)) n -= 1; else if (pcs.has((pc + 1) % 12)) n += 1; }
      notes.push({ s, m: pitch(n) });
    }
    return notes;
  });
}

/** Plays eighth `i` of a market verse, at `at`. */
function playMarket(i: number, at: number, parts: number) {
  const b = Math.floor(i / STEPS), s = i % STEPS, [root, iv] = MARKET_CHORDS[b % 4], k = MARKET.key + root;
  // root, fifth, tenth and octave, picked in the same pattern every bar: just the down-beats to start
  const pattern = [k, k + iv[2], k + 12 + iv[1], k + 12], PICK = [0, 1, 2, 1, 3, 1, 2, 1];
  if (parts >= 2 || s % 2 === 0) kalimba(pattern[PICK[s]], at, s === 0 ? 0.07 : 0.05);
  if (parts >= 2) {
    if (s === 0 || s === 5) frameDrum(at, s ? 0.1 : 0.16);
    if (s === 4) slap(at);
  }
  if (parts >= 3) {
    if (s % 2 === 1) shaker(at);
    // the tune: every other pair of bars, then every bar once the market's built
    if (!resting && (Math.floor(b / 2) % 2 === 1 || parts >= 4)) for (const n of tune[b]) if (n.s === s) kalimba(n.m, at, 0.05);
  }
  if (parts >= 4 && (s === 0 || s === 4)) kalimba(k - 12, at, 0.06);
}

// ---------- playing ----------
let band = BANDS.winter, tune: Note[][] = [];
/** Verses played, the eighth the music is on, and when the next one is due (on the audio clock). */
let verses = 0, step = 0, next = 0, on = false, playingStage = 0, resting = false;
/** Seconds the music has been made to make room. */
let hushed = 0;
const market = () => stage.n === 1;
const eighth = () => 60 / (market() ? MARKET.bpm : band.bpm) / 2;

function newVerse() {
  band = BANDS[current()];
  key.root = market() ? MARKET.sounds : band.key;
  // five verses round: a new tune, again, another new one, again, and a rest
  const pos = verses % 5;
  resting = pos === 4;
  if (pos === 0 || pos === 2) tune = market() ? marketTune() : compose(band);
  verses++;
}

/** Plays eighth `i` of the verse, `t` seconds from now. */
function play(i: number, t: number) {
  const parts = 1 + Math.floor(stageProgress() * 3), s = i % STEPS;
  // swing: the off-beats come late
  const at = s % 2 ? t + ((market() ? MARKET.swing : band.swing) - 0.5) * 2 * eighth() : t;
  if (market()) playMarket(i, at, parts); else playCafe(i, at, parts);
}

/** Plays eighth `i` of a café verse, at `at`. */
function playCafe(i: number, at: number, parts: number) {
  const b = Math.floor(i / STEPS), s = i % STEPS, c = band.chords[b], root = band.key + c[0];
  // the bass: half notes to start, walking once the drums are in, stepping into the next chord on the last beat
  const into = band.chords[(b + 1) % BARS][0];
  const bassAt = (n: number, d: number) => tone({ ...M, t: at, f: hz(36 + ((n % 12) + 12) % 12), type: 'triangle', lp: 700, a: 0.01, d, v: 0.24 });
  if (parts >= 2 && s % 2 === 0) bassAt([c[0], c[0] + Q[c[1]][1], c[0] + 7, into + (into > c[0] ? -1 : 1)][s / 2] + band.key, 0.3);
  else if (parts < 2 && s % 4 === 0) bassAt(root + (s ? 7 : 0), 0.6);
  // the piano: the chord on the one, then the Charleston as the restaurant grows
  const v = voicing(band.key, c);
  if (s === 0) v.forEach(m => ep(m, at, 0.04, parts >= 3 ? 0.7 : 1.6));
  if (parts >= 3 && s === 3) v.forEach(m => ep(m, at, 0.035, 0.4));
  // the tune: phrases in the first four bars to start, answered in the last four as the stage grows
  if (!resting && (b < 4 || parts >= 3)) for (const n of tune[b]) if (n.s === s) band.lead(n.m, at, 0.07);
  // a second voice in the answer, a third below the tune (major or minor, whichever is in the key)
  if (!resting && parts >= 4 && b >= 4) {
    for (const n of tune[b]) if (n.s === s && s % 2 === 0) band.lead(n.m - (MAJOR.includes((n.m - 4 - band.key + 120) % 12) ? 4 : 3), at, 0.035);
  }
  if (parts >= 2) band.drums(s, at);
}

/** Keeps the music going: call every frame. It schedules a fraction of a second ahead, on the audio clock. */
export function updMusic(dt: number) {
  if (!ac) return;
  const hush = songWanted() || staging() || rainK > 0.05;
  duck(hush ? 0 : 1, hush ? 1.5 : 3);
  hushed = hush ? hushed + dt : 0;
  if (prefs.mute.music || ac.state !== 'running') { on = false; return; }
  const now = ac.currentTime;
  // a fresh start: the first time, after the music was off or asleep, and in a new stage
  if (!on || next < now - 0.3 || playingStage !== stage.n) {
    on = true; playingStage = stage.n; step = 0; next = now + 0.1; verses = 0;
    newVerse();
  }
  while (next < now + 0.2) {
    // faded right out: no need to play notes nobody hears
    if (hushed < 2) play(step, next - now);
    next += eighth();
    if (++step === BARS * STEPS) { step = 0; newVerse(); }
  }
}
