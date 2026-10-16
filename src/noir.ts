// The Undertow's band: "Back booth", as picked on the listening page. The casino yacht's Five o'clock (lounge.ts) gone
// noir: the same tune and 3 + 2 groove, but in D minor (every B a B♭) and slower, at 104. The tune on a trumpet in a
// harmon mute over brushes, the upright bass and a sparse piano; a smoky tenor sax joins it for the last A, vibes
// harmonise the bridge, and each round of sixteen bars ends on the minor-major chord of every film noir.
//
// It plays into a mix of its own (music.ts fades it in down the tunnel and has it to itself in the club), through a
// small room's reverb, and through the club's doors: a low-pass that muffles it while they're shut, and opens with them.
import { ac, buses, hz, noise, rnd, tone, type ToneVoice } from './audio';
import { FORM } from './lounge';

export const NOIR = { key: 62, sounds: 65, bpm: 104, swing: 0.6 };
/** How far the band's heard where the player is, 0 to 1 (and so how far the stage's music is faded out under it), how
 *  muffled (1: through the shut doors), and how loud it is besides (a little quieter through a side room's doorway), as
 *  the way in works it out (doorway.ts) for the music (music.ts). */
export const club = { k: 0, muffle: 1, vol: 1 };

/** The band's mix: `level` fades it in and out, `door` muffles it; `room` sends what goes through it to the reverb too. */
let level: GainNode | null = null, door: BiquadFilterNode, plain: GainNode, room: GainNode, reed: PeriodicWave;
const harmon: Record<number, PeriodicWave> = {};
function mix() {
  const c = ac!;
  level = c.createGain(); level.gain.value = 0; level.connect(buses.music);
  door = c.createBiquadFilter(); door.type = 'lowpass'; door.frequency.value = 400; door.Q.value = 0.5; door.connect(level);
  plain = c.createGain(); plain.connect(door);
  room = c.createGain(); room.connect(plain);
  const verb = c.createConvolver(), send = c.createGain();
  verb.buffer = impulse(2.8, 2.2); send.gain.value = 0.24;
  room.connect(send); send.connect(verb); verb.connect(door);
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
// Every note starts over at least 8 ms, and nothing is bright up high: a quick, high strike comes across as a pop.
const wet = (): Partial<ToneVoice> => ({ bus: 'music', out: room });
const dry = (): Partial<ToneVoice> => ({ bus: 'music', out: plain });
/** A soft piano's chord without its root, a hair apart (or, `roll`, rolled slowly up from the bottom). */
function keys(name: Chord, t: number, v: number, d: number, roll = 0.007) {
  VOICINGS[name].forEach((m, j) => {
    const f = hz(m), o = wet();
    tone({ ...o, t: t + j * roll, f, a: 0.008, d, v });
    tone({ ...o, t: t + j * roll, f, type: 'triangle', detune: 5, a: 0.008, d: d * 0.6, v: v * 0.4, lp: 2200 });
  });
}
/** An upright bass: round, with a little thump, plucked. */
function upright(m: number, t: number, d: number, v: number) {
  const f = hz(m), o = dry();
  tone({ ...o, t, f, a: 0.012, d, v });
  tone({ ...o, t, f, type: 'triangle', a: 0.012, d: d * 0.6, v: v * 0.45, lp: 520 });
}
/**
 * A trumpet in a harmon mute, the noir sound: thin and nasal, scooping up into each note, a quick vibrato, a little
 * breath, darkening as it goes. Its wave stops below 3.5 kHz whatever the note, so nothing shrill gets through.
 */
function muted(m: number, t: number, hold: number, v: number) {
  const f = hz(m), n = Math.max(2, Math.min(12, Math.floor(3500 / f)));
  if (!harmon[n]) {
    const re = new Float32Array(n + 1), im = new Float32Array(n + 1);
    for (let k = 1; k <= n; k++) im[k] = 1 / k ** 0.6;
    harmon[n] = ac!.createPeriodicWave(re, im);
  }
  const o = wet();
  tone({ ...o, t, f, wave: harmon[n], scoop: 0.98, a: 0.03, hold, d: 0.12, v: v * 0.5, vib: [5.6, f * 0.005], lp: 3000, lp2: 1600, q: 1.4 });
  noise({ ...o, t, f: 1500, q: 2, a: 0.03, hold: hold * 0.5, d: 0.08, v: v * 0.12 });
}
/** A tenor sax: breathy and warm, an octave under the tune, more vibrato than the yacht's alto. */
function tenor(m: number, t: number, hold: number, v: number) {
  const f = hz(m - 24), o = wet();
  tone({ ...o, t, f, wave: reed, scoop: 0.985, a: 0.07, hold, d: 0.22, v, vib: [5, f * 0.004], lp: Math.min(2000, f * 5), lp2: Math.min(1200, f * 2.6) });
  noise({ ...o, t, f: Math.min(1500, f * 3), q: 1, a: 0.06, hold: hold * 0.7, d: 0.14, v: v * 0.45 });
}
const vibes = (m: number, t: number, v: number, d: number) => tone({ ...wet(), t, f: hz(m), a: 0.01, d, v, trem: [5.5, 0.7] });
/** A brush swirled round the snare, a brush tap, and the hi-hat's foot: all kept under about 4 kHz. */
const swirl = (t: number, len: number, v = 0.016) => noise({ ...dry(), t, f: 2300, f2: 2900, q: 0.6, a: len * 0.45, d: len * 0.55, v });
const brush = (t: number, v: number) => noise({ ...dry(), t, f: 3200, q: 0.6, a: 0.03, d: 0.14, v });
const chick = (t: number, v: number) => noise({ ...dry(), t, f: 3600, q: 1.4, a: 0.008, d: 0.05, v });

// ---------- the tune ----------
type Chord = 'Dmadd9' | 'Em7b5' | 'DmMaj9' | 'Bbmaj7' | 'Gm9' | 'A7';
/** The piano's chords, without their roots and with no half steps low down (Em7♭5 sits under the tune's A so they
 *  never rub a half step apart). */
const VOICINGS: Record<Chord, number[]> = {
  Dmadd9: [62, 65, 69, 76], Em7b5: [58, 62, 64, 67], DmMaj9: [61, 65, 69, 76],
  Bbmaj7: [62, 65, 69, 72], Gm9: [58, 62, 65, 69], A7: [61, 64, 67, 70],
};
/** Five o'clock's tune in D minor: every B a B♭. */
const TUNE = FORM.map(bar => bar.map(([at, m, len]) => [at, m % 12 === 11 ? m - 1 : m, len] as [number, number, number]));
const BRIDGE: Chord[] = ['Bbmaj7', 'Bbmaj7', 'Gm9', 'A7'];
/** The bass a beat at a time, 3 + 2: root, fifth, third over Dm, then E and B♭ under Em7♭5; the last bar walks D, C♯
 *  back to the top; the bridge's chords a bar each. */
const bassLine = (bar: number, bridge: boolean) => bridge
  ? (bar < 10 ? [34, 41, 38, 34, 41] : bar === 10 ? [43, 50, 46, 43, 50] : [33, 40, 37, 33, 40])
  : bar === 15 ? [38, 45, 41, 38, 37] : [38, 45, 41, 40, 46];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const thirdUnder = (m: number) => m - (MINOR.includes((m - 4 - NOIR.key + 120) % 12) ? 4 : 3);

/** Plays eighth `i` of the sixteen bars (ten eighths a bar), at `t` seconds from now. */
export function playNoir(i: number, t: number) {
  if (!level) mix();
  const bar = Math.floor(i / 10) % TUNE.length, s = i % 10, st = eighth(), bridge = bar >= 8 && bar < 12;
  const at = s % 2 ? t + (NOIR.swing - 0.5) * 2 * st : t;
  const beat = s % 2 ? -1 : s / 2;
  if (beat >= 0) upright(bassLine(bar, bridge)[beat], at, st * 1.7, 0.19);
  if (!bridge) {
    if (s === 0) keys('Dmadd9', at, 0.03, st * 2.6);
    if (s === 6 && bar === 15) keys('DmMaj9', at, 0.026, st * 4, 0.035);
    else if (s === 7) keys('Em7b5', at, 0.026, st * 2.6);
  } else {
    if (s === 0) keys(BRIDGE[bar - 8], at, 0.03, st * 5);
    if (s === 6) keys(BRIDGE[bar - 8], at, 0.022, st * 3);
  }
  if (s === 0) swirl(at, st * 5.5);
  if (s === 6) { swirl(at, st * 3.5, 0.013); brush(at, 0.024); }
  if (s === 2 || s === 6) chick(at, 0.011);
  for (const [on, m, len] of TUNE[bar]) {
    if (on !== s) continue;
    muted(m, at, len * st * 0.85, 0.05);
    if (bar >= 12) tenor(m, at + 0.012, len * st * 0.85, 0.034);
    if (bridge) vibes(thirdUnder(m), at, 0.026, Math.max(0.6, len * st));
  }
}
/** What the band plays on eighth `i`, as playNoir has it, for the band on the stand to play along (band.ts): which bar,
 *  which eighth of it, whether it's on a beat, a piano chord, a brush swirl or tap, the hi-hat; whether the trumpet's
 *  blowing (a note of the tune sounding), the sax is in (the last A) and blowing, and a vibes note (the bridge). */
export function noirScore(i: number) {
  const bar = Math.floor(i / 10) % TUNE.length, s = i % 10, bridge = bar >= 8 && bar < 12;
  const blowing = TUNE[bar].some(([on, , len]) => on <= s && s < on + len), note = TUNE[bar].some(([on]) => on === s);
  return {
    bar, s, beat: s % 2 === 0, bridge,
    chord: bridge ? s === 0 || s === 6 : s === 0 || s === 7 || (s === 6 && bar === 15),
    swirl: s === 0 || s === 6, chick: s === 2 || s === 6,
    trumpet: blowing, sax: bar >= 12, saxBlowing: bar >= 12 && blowing, vibes: bridge && note,
  };
}
/** An eighth note, in seconds. */
export const eighth = () => 60 / NOIR.bpm / 2;
/** Sixteen bars of ten eighths. */
export const NOIR_STEPS = TUNE.length * 10;

/** The band at full, matched to the café band's loudness (as the yacht's is). */
const FULL = 0.7;
/** Fades the band's mix to `k` (0 to 1), muffled by `muffle` (1: through the shut doors, 0: in the room with it). */
export function noirLevel(k: number, muffle: number) {
  if (!ac) return;
  if (!level) mix();
  level!.gain.setTargetAtTime(k * FULL, ac.currentTime, 0.2);
  door.frequency.setTargetAtTime(400 * Math.pow(18000 / 400, 1 - muffle), ac.currentTime, 0.12);
}
/** How far the band's mix is faded in, 0 to 1, for the tests. */
export const noirMix = () => (level?.gain.value ?? 0) / FULL;
