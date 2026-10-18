// The cooking game's music (stage 3): "Gloop rush", as picked on its audition page, plays while the show's on at the
// pot (chanko.ts). It's the cellar's gloop ring (music.ts) with the brakes off: the same muddy bass, now bouncing in
// eighths, with the cellar's slides into each chord; a taiko on the one and the three and the wet slap on every
// backbeat (not the ring's half time); grit between; the ring's clappers every fourth bar; and a quicker, higher
// shamisen tune of its own, in C minor at 132, with mud bubbles here and there and, in the second half, shadowing the
// tune an octave up. It loops every sixteen bars, comes in from the top on a quick fade as the show starts, and fades
// out when it's over; the cellar's music fades out under it, and the crowd and the rest of the world's sound step back.
//
// As with the rest of the music: every note starts over at least 8 ms, nothing is bright above about 4 kHz, the waves
// are soft (only their first few harmonics, so a note's peak doesn't click), and no kick starts high and drops fast.
import { ac, buses, dimWorld, hz, noise, type NoiseVoice, onAudio, onTick, prefs, tone, type ToneVoice } from './audio';

// ---------- where it plays ----------
type Part = Partial<ToneVoice & NoiseVoice>;
/** Where the band plays into: dry, and through the room (a small reverb). The mix below sets them (and the audition
 *  page its own, so it plays this same code). */
const outs: { dry: Part; wet: Part } = { dry: { bus: 'music' }, wet: { bus: 'music' } };
export function playInto(dry: AudioNode, wet: AudioNode) { outs.dry = { bus: 'music', out: dry }; outs.wet = { bus: 'music', out: wet }; }
const D = () => outs.dry, W = () => outs.wet;

/** Soft sawtooths, made once for each audio context: a sawtooth's first `n` harmonics. */
const waves = new WeakMap<BaseAudioContext, Map<number, PeriodicWave>>();
function saw(n: number) {
  const c = ac!;
  let m = waves.get(c);
  if (!m) waves.set(c, m = new Map());
  let w = m.get(n);
  if (!w) {
    const re = new Float32Array(n + 1), im = new Float32Array(n + 1);
    for (let k = 1; k <= n; k++) im[k] = 1 / k;
    m.set(n, w = c.createPeriodicWave(re, im));
  }
  return w;
}
/** A number from 0 to 1 for step `i`, the same every time round (the bubbles' places): the game's luck isn't used. */
const hash = (i: number) => { let x = Math.imul(i ^ 0x5BD1E995, 0x2C1B3C6D); x ^= x >>> 15; x = Math.imul(x, 0x297A2D39); return ((x ^ (x >>> 13)) >>> 0) / 4294967296; };

// ---------- the instruments ----------
/** A taiko: low, barely bending, eased in, with a dull skin. */
const taiko = (t: number, v = 0.2) => { tone({ ...W(), f: 66, f2: 50, t, a: 0.015, d: 0.45, v }); noise({ ...W(), t, f: 320, kind: 'lowpass', a: 0.012, d: 0.08, v: v * 0.3 }); };
/** A shamisen: a twangy pluck, filtered dark. */
const shami = (m: number, t: number, v = 0.05, d = 0.3) => tone({ ...W(), f: hz(m), t, wave: saw(6), a: 0.01, d, v, lp: hz(m) * 4, lp2: hz(m) * 1.2, q: 3 });
/** The gloop ring's bass: a soft sawtooth through a resonant low-pass that snaps shut, over a sine; sagging as it dies. */
function gloop(m: number, t: number, d: number, v = 0.16, slide = -0.7) {
  const f = hz(m), f2 = f * 2 ** (slide / 12);
  tone({ ...D(), f, f2, t, wave: saw(24), a: 0.012, d, v: v * 0.45, lp: 1100, lp2: 170, q: 6 });
  tone({ ...D(), f, f2, t, a: 0.012, d, v });
}
/** The ring's wooden clappers (hyoshigi). */
const clapper = (t: number, v = 0.03) => { tone({ ...W(), f: 784, t, a: 0.008, d: 0.07, v }); tone({ ...W(), f: 784 * 2.6, t, a: 0.008, d: 0.035, v: v * 0.15 }); };
/** The gloop ring's wet slap: noise falling over a dull thud. */
const splat = (t: number, v = 0.05) => { noise({ ...W(), t, f: 1500, f2: 450, q: 1.4, a: 0.016, d: 0.13, v }); tone({ ...D(), f: 170, f2: 130, t, a: 0.012, d: 0.09, v: v * 0.8 }); };
const grit = (t: number, v = 0.014) => noise({ ...D(), t, f: 2600, q: 1.2, a: 0.01, d: 0.04, v });
/** A mud bubble: a sine rising quickly as it fades. */
const blub = (m: number, t: number, v = 0.025) => tone({ ...W(), f: hz(m), f2: hz(m) * 1.7, t, a: 0.01, d: 0.09, v });
// ---------- the tune ----------
/** A note of a tune: on which step of its bar, which note, and how many steps long. */
type Note = [s: number, m: number, len: number];
export interface PotStyle {
  name: string;
  bpm: number;
  /** Steps a beat (2: eighths, 4: sixteenths), steps a bar, and how late the off-steps fall (0.5: straight). */
  spb: number;
  steps: number;
  swing: number;
  /** Plays step `i` of the sixteen bars at `t` seconds from now (swung by the caller). */
  play: (i: number, t: number) => void;
}
/** Each bar's notes that start on step `s`. */
const on = (bar: Note[], s: number) => bar.filter(n => n[0] === s);

// ---- Gloop rush: the gloop ring, in C minor, at twice the pace ----
/** Cm, Cm, A♭, B♭, as in the cellar. */
const GLOOP_ROOTS = [0, 0, 8, 10];
/** The shamisen's tune, in sixteenths: the cellar's tune's shape, quicker and higher. */
const RUSH: Note[][] = [
  [[0, 67, 2], [3, 72, 1], [6, 72, 2], [10, 67, 2], [12, 70, 2]], [[0, 72, 2], [6, 67, 2], [10, 72, 2], [14, 75, 2]],
  [[0, 72, 3], [6, 75, 2], [10, 72, 2], [12, 68, 2]], [[0, 70, 2], [4, 74, 2], [8, 77, 2], [10, 74, 2], [12, 70, 2]],
  [[0, 79, 2], [3, 75, 1], [6, 72, 2], [10, 75, 2], [12, 79, 2]], [[0, 77, 2], [4, 75, 2], [7, 72, 1], [10, 70, 2], [12, 67, 2]],
  [[0, 72, 2], [3, 75, 1], [6, 72, 2], [8, 68, 2], [12, 63, 2]], [[0, 65, 2], [4, 70, 2], [8, 74, 2], [12, 72, 4]],
];
const rush: PotStyle = {
  name: 'Gloop rush', bpm: 132, spb: 4, steps: 16, swing: 0.54,
  play(i, t) {
    const bar = Math.floor(i / 16) % 16, b = bar % 4, s = i % 16, root = GLOOP_ROOTS[b], low = 36 + ((root + 4) % 12) - 4;
    // the bass, bouncing: C2, A♭1, B♭1, with the cellar's slides into the next chord
    if (s === 0) gloop(low, t, 0.3);
    else if (s === 4) gloop(low + 12, t, 0.12, 0.1);
    else if (s === 6) gloop(low, t, 0.15, 0.13);
    else if (s === 8) gloop(low, t, 0.25, 0.15);
    else if (s === 11) gloop(low + 12, t, 0.1, 0.09);
    else if (s === 12) gloop(low + 7, t, 0.12, 0.11);
    else if (s === 14) gloop(low, t, 0.2, 0.13, b === 1 ? -5 : b === 3 ? 2 : -0.7);
    // the taiko on the one and the three, the wet slap on every backbeat, grit between
    if (s === 0) taiko(t, 0.2); else if (s === 8) taiko(t, 0.15); else if (s === 10 && bar % 2) taiko(t, 0.1);
    if (s === 4 || s === 12) splat(t);
    if (s % 2 === 1) grit(t, 0.009); else if (s % 4 === 2) grit(t, 0.015);
    if (b === 3 && (s === 12 || s === 14)) clapper(t);
    for (const [, m] of on(RUSH[bar % 8], s)) {
      shami(m, t, 0.055, 0.3);
      // the second half: a bubble shadowing it an octave up
      if (bar >= 8) blub(m + 12, t + 60 / 132 / 4, 0.022);
    }
    // bubbles here and there, on the chord's notes
    if (s % 2 === 0 && hash(i) < 0.12) blub(72 + root % 12 + [0, root ? 4 : 3, 7][Math.floor(hash(i + 999) * 3)] - (root >= 8 ? 12 : 0), t, 0.022);
  },
};

export const POT_STYLES = { rush };
/** Plays step `i` of `style` `t` seconds from now, the off-steps swung late. */
export function playPot(style: PotStyle, i: number, t: number) {
  const st = 60 / style.bpm / style.spb;
  style.play(i, i % 2 ? t + (style.swing - 0.5) * 2 * st : t);
}
/** A step of `style`, in seconds, and how many steps go round before it starts again (sixteen bars). */
export const potStep = (style: PotStyle) => 60 / style.bpm / style.spb;
export const potSteps = (style: PotStyle) => style.steps * 16;

// ---------- playing it at the pot ----------
/** The style that plays in the game. */
const style: PotStyle = rush;
/** The cue at full: a touch over the gloop ring (measured on the music's bus at the pot, three bosses down: 0.042 to its
 *  0.039 RMS), as the moment's the player's. */
const FULL = 0.9;
/** How far the crowd and the rest of the world's sound step back under it. */
const WORLD = 0.35;
/** The cue's mix: `level` fades it in and out; the band plays into `dry`, and into `room`, its reverb, as well. */
let level: GainNode | null = null;
function mix() {
  const c = ac!, dry = c.createGain(), room = c.createGain(), send = c.createGain(), verb = c.createConvolver();
  level = c.createGain(); level.gain.value = 0; level.connect(buses.music);
  const n = Math.floor(c.sampleRate * 1.6), ir = c.createBuffer(2, n, c.sampleRate);
  let seed = 7;
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < n; i++) { seed = (seed * 16807) % 2147483647; d[i] = (seed / 2147483647 * 2 - 1) * (1 - i / n) ** 2.6; }
  }
  verb.buffer = ir; send.gain.value = 0.2;
  dry.connect(level); room.connect(dry); room.connect(send); send.connect(verb); verb.connect(level);
  playInto(dry, room);
}
/** Where the cue is: playing (or fading out, till `until`), the step it's on and when the next is due. */
const cue = { on: false, step: 0, next: 0, until: Infinity };
/** Starts the cue from the top, fading in (the show's begun), or fades it out (it's over). */
export function potMusic(play: boolean) {
  if (!ac) return;
  if (!level) mix();
  const g = level!.gain, now = ac.currentTime;
  if (play) {
    Object.assign(cue, { on: true, step: 0, next: now + 0.05, until: Infinity });
    g.setTargetAtTime(FULL, now, 0.12);
    dimWorld(WORLD, 0.6);
  } else if (cue.on) {
    cue.until = now + 1.6;
    g.setTargetAtTime(0, now, 0.25);
    dimWorld(1, 1.2);
  }
  schedule();
}
/** Whether the cue has the music now (music.ts fades the stage's music out under it, and back as it fades out). */
export const potPlaying = () => cue.on && cue.until === Infinity;
export const potFading = () => cue.on && cue.until < Infinity;
/** Queues the cue's next steps on the audio clock (on the timer: the game holds still while the show's on). */
function schedule() {
  if (!ac || !cue.on) return;
  const now = ac.currentTime;
  if (now > cue.until || prefs.mute.music || ac.state !== 'running') { if (now > cue.until) cue.on = false; return; }
  // (a step whose time has gone by, the page held up, is let go: the cue carries on on its beat)
  while (cue.next < now + 0.2) {
    if (cue.next >= now) playPot(style, cue.step, cue.next - now);
    cue.next += potStep(style);
    cue.step = (cue.step + 1) % potSteps(style);
  }
}
onAudio(() => onTick(schedule));
/** For the tests: whether it's on, and how far it's faded in (0 to 1). */
export const potState = () => ({ on: cue.on, playing: potPlaying(), level: (level?.gain.value ?? 0) / FULL, style: style.name });
