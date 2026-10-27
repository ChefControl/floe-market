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
// - Stage 3, down in the cellar under the dock: the gloop ring (docs/music-ideas.md), heavy and slow. C minor at 96
//   BPM in half time: a soft, gloopy bass that sags and slides like mud round C2, taiko, a wet slap, grit, the ring's
//   wooden clappers and a low shamisen, with mud bubbles on the chords' notes, in a damp room (a reverb and an echo).
//   It's played as it was made on the listening page, with one tune of its own and no rests; the bass and bubbles to
//   start, and the drums, the tune and a drone coming in as the bosses fall. Up on the dock in stage 3, the café band
//   plays on.
// - The casino yacht: its lounge band (lounge.ts), a piano trio in 5/4, in a key of its own. It comes in as you walk
//   up the quay to the yacht, the stage's music going out under it, and has the music to itself aboard.
// - The voting boat, on Israel's election day only: Hatikvah, the anthem (hatikvah.ts), in the game's own sound. It
//   comes in the same way as you walk out along the pier to the boat, moored, and has the music to itself aboard.
//
// - Korki's golden statue: his tune, "5,000 km" (korkiTune.ts), comes in as you linger on the statue's pad, the stage's
//   music going out under it.
//
// Each tune plays twice, and after every two tunes a verse leaves the tune out, for a rest (not the gloop ring's). The music fades away
// under the song at her house, the rain and the stage-up's fanfare. The game's own sounds are on the
// major pentatonic of the music's key (F for stage 1's D minor: the same notes), so they ring along with it.
import { ac, buses, duck, ear, hz, key, noise, onAudio, onBroken, onTick, prefs, rnd, tone, type Voice } from './audio';
import { eighth as anthemEighth, HATIKVAH, HATIKVAH_STEPS, hatikvahLevel, playHatikvah } from './hatikvah';
import { korkiK } from './korki';
import { eighth as korkiEighth, KORKI_STEPS, KORKI_TUNE, korkiLevel, playKorki } from './korkiTune';
import { aboard, casinoBoat, level, onVoteBoat, SHIP, stage, VOTE_BOAT, voteBoat } from './layout';
import { eighth as loungeEighth, LOUNGE, LOUNGE_STEPS, loungeLevel, loungeMix, playLounge } from './lounge';
import { club, eighth as noirEighth, NOIR, NOIR_STEPS, noirLevel, noirMix, playNoir } from './noir';
import { offerPlaying } from './offer';
import { potFading, potPlaying } from './potMusic';
import { rainK } from './rain';
import { current, type Season } from './season';
import { staging } from './stage';
import { stageProgress } from './unlocks';
import type { XZ } from './util';
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
/** The stage's music goes through a level of its own, so the lounge band can take over from it. */
let stageMix: GainNode | null = null;
onAudio(() => {
  stageMix = ac!.createGain(); stageMix.connect(buses.music);
  M.out = stageMix;
});
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

// ---------- stage 3: the gloop ring ----------
// As it was made and liked on the listening page (docs/music-ideas.md): its levels, its tune, and its damp room.
/** C minor, on its pentatonic; the game's sounds play in E-flat major, which has the same notes. Sixteenths. */
const GLOOP = { key: 60, sounds: 63, bpm: 96, swing: 0.54, steps: 16 };
/** A bar each, round twice a verse: Cm, Cm, A♭, B♭, as [root, intervals] up from C. */
const GLOOP_CHORDS: [number, number[]][] = [[0, [0, 3, 7]], [0, [0, 3, 7]], [8, [0, 4, 7]], [10, [0, 4, 7]]];
/**
 * The shamisen's tune, the same every verse: eight bars, low (B♭3 to E♭5), on the C minor pentatonic, on a note of
 * the chord on the beat and never a half step off one. As the listening page made it up, from its seed.
 */
export const GLOOP_TUNE: Note[][] = [
  [[0, 67], [6, 72], [10, 67]], [[0, 67], [6, 67], [10, 72]], [[0, 72], [6, 72], [10, 72]], [[0, 70], [8, 65], [10, 70], [12, 70]],
  [[0, 72], [3, 75], [6, 75], [12, 72]], [[4, 72], [7, 70], [10, 72], [12, 67]], [[0, 72], [3, 70], [6, 63], [12, 60]], [[4, 58], [7, 60], [10, 58], [12, 58]],
].map(bar => bar.map(([s, m]) => ({ s, m })));
/** Soft sawtooths: only the first few harmonics, so a note's peak doesn't click as a plain sawtooth's does. */
let saw24: PeriodicWave, saw6: PeriodicWave;
function softSaw(n: number) {
  const re = new Float32Array(n + 1), im = new Float32Array(n + 1);
  for (let k = 1; k <= n; k++) im[k] = 1 / k;
  return ac!.createPeriodicWave(re, im);
}
onAudio(() => { saw24 = softSaw(24); saw6 = softSaw(6); });
/**
 * The damp cellar the gloop ring plays in: a reverb (2.6 s of fading noise), and an echo a dotted eighth behind,
 * feeding back into itself and into the reverb. Built the first time it's heard, into the stage's music.
 */
let room: { rev: GainNode; dly: GainNode; outs: AudioNode[] } | null = null;
function cellarRoom() {
  if (room) return room;
  const c = ac!, to = stageMix ?? buses.music;
  const n = Math.floor(c.sampleRate * 2.6), ir = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * (1 - i / n) ** 2.4; }
  const verb = c.createConvolver(), rev = c.createGain(), dly = c.createGain(), echo = c.createDelay(2), back = c.createGain(), wet = c.createGain();
  verb.buffer = ir; rev.connect(verb); verb.connect(to);
  echo.delayTime.value = 60 / GLOOP.bpm * 0.75; back.gain.value = 0.35; wet.gain.value = 0.6;
  dly.connect(echo); echo.connect(back); back.connect(echo); echo.connect(wet); wet.connect(to); wet.connect(rev);
  return room = { rev, dly, outs: [verb, echo, wet] };
}
// (if something on the music's bus blows up, the room's echo would keep it going round: it's built again, empty)
onBroken(bus => { if (bus === 'music' && room) { room.outs.forEach(n => n.disconnect()); room = null; } });
/** Some of a sound into the cellar's room: `rev` of it into the reverb, `dly` into the echo. */
const wet = (rev: number, dly = 0): Partial<Voice> => {
  const r = cellarRoom(), sends: [AudioNode, number][] = [[r.rev, rev]];
  if (dly) sends.push([r.dly, dly]);
  return { sends };
};
/** The gloopy bass: a soft sawtooth through a resonant low-pass that snaps shut, over a sine; it sags as it dies, or slides. */
const gloop = (m: number, t: number, d: number, v = 0.18, slide = -0.7) => {
  const f = hz(m), f2 = f * 2 ** (slide / 12);
  tone({ ...M, f, f2, t, wave: saw24, a: 0.012, d, v: v * 0.45, lp: 1100, lp2: 170, q: 6 });
  tone({ ...M, f, f2, t, a: 0.012, d, v });
};
/** A mud bubble: a sine rising quickly as it fades. */
const blub = (m: number, t: number, v: number, x: Partial<Voice>) => tone({ ...M, ...x, f: hz(m), f2: hz(m) * 1.7, t, a: 0.01, d: 0.09, v });
/** A taiko: the game's soft kick, a little lower and longer, with a dull skin. */
const taiko = (t: number, v = 0.2) => { tone({ ...M, ...wet(0.15), f: 66, f2: 50, t, a: 0.015, d: 0.45, v }); noise({ ...M, ...wet(0.15), t, f: 320, kind: 'lowpass', a: 0.012, d: 0.08, v: v * 0.3 }); };
/** The half-time backbeat: a wet slap, noise falling in pitch over a dull thud, in a damp room. */
const splat = (t: number, v = 0.06) => { noise({ ...M, ...wet(0.3), t, f: 1500, f2: 450, q: 1.4, a: 0.016, d: 0.13, v }); tone({ ...M, f: 170, f2: 130, t, a: 0.012, d: 0.09, v: v * 0.8 }); };
/** The ring's wooden clappers (hyoshigi), calling the next round. */
const clapper = (t: number, v = 0.03) => { tone({ ...M, ...wet(0.4), f: 784, t, a: 0.008, d: 0.07, v }); tone({ ...M, ...wet(0.4), f: 784 * 2.6, t, a: 0.008, d: 0.035, v: v * 0.15 }); };
/** A low, twangy plucked string: a shamisen's bark, filtered dark. */
const shami = (m: number, t: number) => tone({ ...M, ...wet(0.2, 0.12), f: hz(m), t, wave: saw6, a: 0.01, d: 0.4, v: 0.06, lp: hz(m) * 4, lp2: hz(m) * 1.2, q: 3 });
const grit = (t: number, v = 0.016) => noise({ ...M, t, f: 2600, q: 1.2, a: 0.01, d: 0.04, v });

/** Plays sixteenth `i` of a gloop verse, at `at`; `layer` (1 to 4, as the bosses fall) adds to it. */
function playGloop(i: number, at: number, layer: number) {
  const bar = Math.floor(i / GLOOP.steps), b = bar % 4, s = i % GLOOP.steps, [root, iv] = GLOOP_CHORDS[b];
  // the bass, down round C2: C2, A♭1, B♭1
  const low = 36 + ((root + 4) % 12) - 4;
  if (s === 0) gloop(low, at, 0.55);
  if (s === 6) gloop(low, at, 0.22, 0.15);
  if (s === 10) gloop(low + 12, at, 0.18, 0.11);
  if (b === 1 && s === 13) gloop(low, at, 0.45, 0.15, -5); // C sliding down to G, into A♭
  if (b === 3 && s === 14) gloop(low, at, 0.3, 0.13, 2); // B♭ sliding up to C, home
  if (layer >= 3 && s === 3) gloop(low + 7, at, 0.12, 0.09);
  // bubbles rising out of the mud, on the chord's notes, here and there round the room
  if ((layer >= 3 || s % 2 === 0) && rnd() < [0, 0.12, 0.14, 0.16, 0.18][layer]) {
    blub(72 + root % 12 + iv[Math.floor(rnd() * 3)] - (root >= 8 ? 12 : 0), at, 0.03, { pan: rnd() * 1.2 - 0.6, ...wet(0, 0.3) });
  }
  if (layer >= 2) {
    if (s === 0 || s === 10) taiko(at, s ? 0.14 : 0.2);
    if (s === 8) splat(at);
    if (s % 4 === 2 || (layer >= 3 && s % 2 === 1)) grit(at, s % 4 === 2 ? 0.016 : 0.01);
    if (bar % 8 === 7 && (s === 12 || s === 14)) clapper(at);
  }
  if (layer >= 3 && (Math.floor(bar / 2) % 2 === 1 || layer >= 4)) for (const n of GLOOP_TUNE[bar % 8]) if (n.s === s) shami(n.m, at);
  if (layer >= 4) {
    if (s === 0 && bar % 2 === 0) for (const x of [0, 7]) tone({ ...M, ...wet(0.4), f: hz(43 + (root + x + 5) % 12), t: at, type: 'triangle', a: 0.5, hold: 0.8, d: 2.2, v: 0.03, lp: 700, vib: [0.3, 1.2] });
    if (bar % 8 >= 4) for (const n of GLOOP_TUNE[bar % 8]) if (n.s === s) blub(n.m + 12, at + 60 / GLOOP.bpm / 4, 0.025, wet(0, 0.2));
  }
}

// ---------- playing ----------
let band = BANDS.winter, tune: Note[][] = [];
/** Verses played, the eighth the music is on, and when the next one is due (on the audio clock). */
let verses = 0, step = 0, next = 0, on = false, playingStage = 0, resting = false;
/** Seconds the music has been made to make room. */
let hushed = 0;
const market = () => stage.n === 1;
/** Down in the cellar (stage 3), where the gloop ring plays. */
const cellar = () => stage.n === 3 && level.down;
/** Which music is on: the market's, the café band's, or the gloop ring's. */
const which = () => (market() ? 1 : cellar() ? 3 : 2);
/** A step of the music: an eighth (a sixteenth in the gloop ring), and how many there are in a verse. */
const stepLen = () => (cellar() ? 60 / GLOOP.bpm / 4 : 60 / (market() ? MARKET.bpm : band.bpm) / 2);
const verseLen = () => (cellar() ? GLOOP.steps * BARS : STEPS * BARS);

function newVerse() {
  band = BANDS[current()];
  // five verses round: a new tune, again, another new one, again, and a rest
  const pos = verses % 5;
  resting = pos === 4;
  // (the gloop ring has one tune of its own, and no rests)
  if (!cellar() && (pos === 0 || pos === 2)) tune = market() ? marketTune() : compose(band);
  verses++;
}

/** Plays step `i` of the verse, `t` seconds from now. */
function play(i: number, t: number) {
  const parts = 1 + Math.floor(stageProgress() * 3);
  // swing: the off-beats come late
  const swing = market() ? MARKET.swing : cellar() ? GLOOP.swing : band.swing;
  const at = i % 2 ? t + (swing - 0.5) * 2 * stepLen() : t;
  if (market()) playMarket(i, at, parts); else if (cellar()) playGloop(i, at, parts); else playCafe(i, at, parts);
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

// ---------- the casino yacht ----------
/** How far out from the yacht's sides the lounge band starts to be heard, in metres. */
const HARBOR_FADE = 8;
/**
 * How far the lounge band has taken over, 0 to 1: nothing away from the harbor, coming in as you walk up the quay to
 * the yacht, and all of it aboard.
 */
export function harborK(p: XZ = ear) {
  // (not a note of it down in the cellar)
  if (!casinoBoat.open || level.down) return 0;
  if (aboard(p)) return 1;
  const dx = Math.max(0, Math.abs(p.x - SHIP.x) - SHIP.half), dz = Math.max(0, Math.abs(p.z - SHIP.z) - SHIP.beam);
  const k = Math.max(0, 1 - Math.hypot(dx, dz) / HARBOR_FADE);
  return k * k * (3 - 2 * k);
}
/** The lounge band's place: the eighth it's on and when the next is due; it starts from the top each time it comes in. */
let lounge = { on: false, step: 0, next: 0 };
function updLounge(k: number, now: number) {
  loungeLevel(Math.sin(k * Math.PI / 2));
  if (k < 0.001) { lounge.on = false; return; }
  if (!lounge.on || lounge.next < now - 5) lounge = { on: true, step: 0, next: now + 0.1 };
  const parts = Math.max(3, 1 + Math.floor(stageProgress() * 3));
  while (lounge.next < now + 0.2) {
    if (lounge.next >= now && hushed < 2) playLounge(lounge.step, lounge.next - now, parts);
    lounge.next += loungeEighth();
    lounge.step = (lounge.step + 1) % LOUNGE_STEPS;
  }
}

// ---------- the voting boat ----------
/** How far out from the voting boat's hull Hatikvah starts to be heard, in metres: along the pier, from its foot at the
 *  dock's edge (the market keeps its own music). */
const BOAT_FADE = 8;
/**
 * How far Hatikvah has taken over, 0 to 1: nothing away from the boat (or on any day it isn't in, or while it's sailing
 * in or away), coming in as you walk out along the pier to it, and all of it on the gangway and aboard.
 */
export function voteK(p: XZ = ear) {
  if (!voteBoat.open || level.down) return 0;
  if (onVoteBoat(p)) return 1;
  const { hull } = VOTE_BOAT, dx = Math.max(0, hull.x0 - p.x, p.x - hull.x1), dz = Math.max(0, hull.z0 - p.z, p.z - hull.z1);
  const k = Math.max(0, 1 - Math.hypot(dx, dz) / BOAT_FADE);
  return k * k * (3 - 2 * k);
}
/** Hatikvah's place: the eighth it's on and when the next is due; it starts from the top each time it comes in. */
let anthem = { on: false, step: 0, next: 0 };
function updAnthem(k: number, now: number) {
  hatikvahLevel(Math.sin(k * Math.PI / 2));
  if (k < 0.001) { anthem.on = false; return; }
  if (!anthem.on || anthem.next < now - 5) anthem = { on: true, step: 0, next: now + 0.1 };
  while (anthem.next < now + 0.2) {
    if (anthem.next >= now && hushed < 2) playHatikvah(anthem.step, anthem.next - now);
    anthem.next += anthemEighth();
    anthem.step = (anthem.step + 1) % HATIKVAH_STEPS;
  }
}

// ---------- Korki's statue ----------
/** His tune's place: the eighth it's on and when the next is due; it starts from the top each time it comes in. */
let statue = { on: false, step: 0, next: 0 };
function updKorkiTune(k: number, now: number) {
  korkiLevel(Math.sin(k * Math.PI / 2));
  if (k < 0.001) { statue.on = false; return; }
  if (!statue.on || statue.next < now - 5) statue = { on: true, step: 0, next: now + 0.1 };
  while (statue.next < now + 0.2) {
    if (statue.next >= now && hushed < 2) playKorki(statue.step, statue.next - now);
    statue.next += korkiEighth();
    statue.step = (statue.step + 1) % KORKI_STEPS;
  }
}

// ---------- the Undertow ----------
/**
 * The club's band's place: the eighth it's on and when the next is due. It starts from the top the first time it's
 * heard, and from then on plays on behind the club's doors whether anyone hears it or not (its notes left out where
 * nobody does), so it's the same tune going on through the stall's back and in the club, and walking in or out never starts it
 * over. (After a long stall, the page held up, it picks up where it would be by now.)
 */
let noir = { on: false, step: 0, next: 0 };
function updNoir(k: number, muffle: number, vol: number, now: number) {
  noirLevel(Math.sin(k * Math.PI / 2) * vol, muffle);
  if (!noir.on) {
    if (k < 0.001) return;
    noir = { on: true, step: 0, next: now + 0.1 };
  }
  if (noir.next < now - 5) {
    const skip = Math.ceil((now - noir.next) / noirEighth());
    noir.next += skip * noirEighth();
    noir.step = (noir.step + skip) % NOIR_STEPS;
  }
  while (noir.next < now + 0.2) {
    if (noir.next >= now && hushed < 2 && k >= 0.001) playNoir(noir.step, noir.next - now);
    noir.next += noirEighth();
    noir.step = (noir.step + 1) % NOIR_STEPS;
  }
}

/** Where the club's band is in its sixteen bars as it's heard now, in eighths (fractional), or null while it isn't
 *  playing (band.ts has the band on the stand play along to it). */
export const noirHeard = () => {
  if (!ac || !noir.on) return null;
  // (what's coming out of the speakers now went in a little before: the output's own delay)
  const out = ac.currentTime - (ac.outputLatency || 0) - (ac.baseLatency || 0);
  return (((noir.step - (noir.next - out) / noirEighth()) % NOIR_STEPS) + NOIR_STEPS) % NOIR_STEPS;
};

/** The stage's music's level, the lounge band's and the Undertow's, for the tests. */
export const musicMix = () => ({ stage: stageMix?.gain.value ?? 1, lounge: loungeMix(), noir: noirMix() });

/** Keeps the music going: call every frame. It schedules a fraction of a second ahead, on the audio clock. */
export function updMusic(dt: number) {
  if (!ac) return;
  // (down in the cellar, nothing up in the world makes it give way: not her songs, not the rain)
  const hush = (!level.down && (songWanted() || rainK > 0.05)) || staging() || offerPlaying();
  duck(hush ? 0 : 1, hush ? 1.5 : 3);
  hushed = hush ? hushed + dt : 0;
  // the game's sounds in the key of whichever music is on top (schedule crossfades them)
  const harbor = harborK(), den = club.k, vote = voteK(), korki = korkiK();
  key.root = harbor > 0.5 ? LOUNGE.sounds : vote > 0.5 ? HATIKVAH.sounds : korki > 0.5 ? KORKI_TUNE.sounds : den > 0.5 ? NOIR.sounds : market() ? MARKET.sounds : cellar() ? GLOOP.sounds : band.key;
  schedule();
}
/** Queues the music's next steps on the audio clock: on every frame, and on the timer between them (onTick). */
function schedule() {
  if (!ac) return;
  if (prefs.mute.music || ac.state !== 'running') { on = false; lounge.on = false; noir.on = false; anthem.on = false; statue.on = false; return; }
  const now = ac.currentTime, harbor = harborK(), den = club.k, vote = voteK(), korki = korkiK(), pot = potPlaying();
  const away = Math.max(harbor, den, vote, korki);
  // the stage's music and the lounge band's crossfading up the quay, or Hatikvah's out along the pier to the voting boat,
  // or Korki's tune's on his statue's pad, or
  // down the Undertow's tunnel the stage's and the club's band's (doorway.ts); and the stage's all out under the cooking game's music at the pot (potMusic.ts),
  // coming back slowly as that fades away
  stageMix?.gain.setTargetAtTime(pot ? 0 : Math.cos(away * Math.PI / 2), now, potFading() ? 0.5 : 0.15);
  updLounge(harbor, now);
  updAnthem(vote, now);
  updKorkiTune(korki, now);
  updNoir(den, club.muffle, club.vol, now);
  // a fresh start: the first time, after the music was off or a long stall, and in a new stage (or down the ladder)
  if (!on || next < now - 5 || playingStage !== which()) {
    on = true; playingStage = which(); step = 0; next = now + 0.1; verses = 0;
    newVerse();
  }
  while (next < now + 0.2) {
    // faded right out (or crossfaded to the lounge band, Hatikvah, Korki's tune or the club's): no need to play notes nobody hears; and a step
    // whose time has gone by (the page was held up) is let go, so the music carries on on its beat rather than late
    if (next >= now && hushed < 2 && away < 0.999 && !pot) play(step, next - now);
    next += stepLen();
    if (++step === verseLen()) { step = 0; newVerse(); }
  }
}
onAudio(() => onTick(schedule));
