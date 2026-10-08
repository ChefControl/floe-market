// The game's sound engine. Everything is synthesised in the browser with the Web Audio API, from a few oscillators and
// a few seconds of noise, so sound costs a few kilobytes of code and nothing to download. It's voiced to suit the
// low-poly look: simple, rounded waveforms and short soft envelopes, like a box of toy instruments. Every pitched
// effect is on the major pentatonic scale of the music's key, so effects ring along with the music (and with each
// other) instead of clashing.
//
// Browsers only let a page make sound after a tap or a key press, so nothing starts before one. The sound effects
// (sfx.ts), the ambient bed (ambience.ts) and the music (music.ts) each have their own bus, with its own volume and
// mute in the settings menu, per device.
import { CAM_YAW } from './render';
import type { XZ } from './util';

export type Bus = 'sfx' | 'amb' | 'music';

// ---------- settings ----------
const PREFS = 'floe-market-sound';
const BUSES: Bus[] = ['sfx', 'amb', 'music'];
/**
 * How loud each kind of sound is, on the settings' 1 to 10 sliders, and whether it's muted: a per-device choice,
 * outside the save (like the songs' mute buttons).
 */
export const prefs = {
  level: { sfx: 7, amb: 7, music: 7 } as Record<Bus, number>,
  mute: { sfx: false, amb: false, music: false } as Record<Bus, boolean>,
};
/** A slider's step as a volume: 7 is the mix as it was set, and each step is about 2 dB (10 twice as loud, 1 a quarter). */
export const gainOf = (step: number) => 2 ** ((step - 7) / 3);
const step = (n: number) => Math.max(1, Math.min(10, Math.round(n)));
try {
  const p = JSON.parse(localStorage.getItem(PREFS) ?? '{}') as Record<string, unknown>;
  const level = (p.level ?? {}) as Record<string, unknown>, mute = (p.mute ?? {}) as Record<string, unknown>;
  const vol = (p.vol ?? {}) as Record<string, unknown>;
  for (const b of BUSES) {
    // older settings: volumes as a share of the mix, and sound or music switched off
    const v = vol[b];
    if (typeof v === 'number' && v > 0 && v <= 2) prefs.level[b] = step(7 + 3 * Math.log2(v));
    if (p.sound === false || (b === 'music' && p.music === false)) prefs.mute[b] = true;
    const l = level[b], m = mute[b];
    if (typeof l === 'number' && l >= 1 && l <= 10) prefs.level[b] = step(l);
    if (typeof m === 'boolean') prefs.mute[b] = m;
  }
} catch { /* storage unavailable or unreadable: the defaults */ }

function keep() {
  try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch { /* storage unavailable */ }
  level();
}
/** Sets how loud a kind of sound is, 1 to 10. */
export function setLevel(b: Bus, n: number) {
  prefs.level[b] = step(n);
  keep();
}
export function setMute(b: Bus, on: boolean) {
  prefs.mute[b] = on;
  keep();
}
/** What a bus's gain is, for its level and mute. */
const busLevel = (b: Bus) => (prefs.mute[b] ? 0 : LEVEL[b] * gainOf(prefs.level[b]));

// ---------- randomness ----------
let seed = 0x2F6B4A1D;
/**
 * Sound's own random numbers, 0 to 1. Math.random belongs to the game: keeping out of it leaves the game's runs the
 * same with sound on or off (the tests replay them, see test/setup.ts).
 */
export function rnd() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}
export const between = (a: number, b: number) => a + (b - a) * rnd();

// ---------- the context ----------
export let ac: AudioContext | null = null;
/** Where each kind of sound goes: every voice connects to its bus. */
export const buses = {} as Record<Bus, GainNode>;
let master: GainNode, musicVol: GainNode;
/** Seconds of white noise, the raw material of every hiss, splash, swish and shaker. */
let noiseBuf: AudioBuffer;
/**
 * Seconds of brown noise: white noise added up as it goes, so its energy falls away towards the highs (6 dB an
 * octave). It's the low rumble of real surf and wind, without white noise's hiss.
 */
let softBuf: AudioBuffer;
const NOISE_SECS = 3;
/** Each bus's level, set by ear with the volume sliders: the effects, the world's own sound and the music. */
const LEVEL: Record<Bus, number> = { sfx: 0.24, amb: 0.063, music: 0.17 };

const ready: (() => void)[] = [];
/** Runs `f` once sound has started: straight away if it has. */
export function onAudio(f: () => void) {
  if (ac) f(); else ready.push(f);
}

/** Starts sound on the first tap or key press, and wakes it again on later ones if the browser put it to sleep. */
function wake() {
  if (ac) {
    if (ac.state !== 'running' && !document.hidden) void ac.resume();
    return;
  }
  if (typeof AudioContext === 'undefined') return;
  ac = new AudioContext();
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -12; comp.knee.value = 10; comp.ratio.value = 4;
  comp.connect(ac.destination);
  master = ac.createGain(); master.connect(comp);
  musicVol = ac.createGain(); musicVol.connect(master);
  for (const b of ['sfx', 'amb', 'music'] as Bus[]) {
    const g = buses[b] = ac.createGain();
    g.gain.value = b === 'music' ? 1 : busLevel(b);
    g.connect(b === 'music' ? musicVol : master);
  }
  noiseBuf = ac.createBuffer(1, ac.sampleRate * NOISE_SECS, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
  softBuf = ac.createBuffer(1, ac.sampleRate * NOISE_SECS, ac.sampleRate);
  const b = softBuf.getChannelData(0), n = b.length;
  let last = 0;
  for (let i = 0; i < n; i++) { last = (last + 0.02 * (rnd() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
  // it loops: lean it so its end meets its start, or the seam would click every few seconds
  const lean = b[n - 1] - b[0];
  for (let i = 0; i < n; i++) b[i] -= lean * i / (n - 1);
  musicVol.gain.value = busLevel('music');
  void ac.resume();
  ready.splice(0).forEach(f => f());
}
for (const ev of ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const) window.addEventListener(ev, wake, true);
// Asleep while the page is hidden.
document.addEventListener('visibilitychange', () => {
  if (!ac) return;
  if (document.hidden) void ac.suspend(); else void ac.resume();
});

/** Follows the settings: each kind of sound at its volume, or silent while it's muted. */
function level() {
  if (!ac) return;
  musicVol.gain.setTargetAtTime(busLevel('music'), ac.currentTime, 0.1);
  for (const b of ['sfx', 'amb'] as Bus[]) buses[b].gain.setTargetAtTime(busLevel(b), ac.currentTime, 0.05);
}

/** Fades the music down (0) or back up (1): under the songs, and for the stage-up's fanfare. */
export function duck(k: number, secs: number) {
  if (ac) buses.music.gain.setTargetAtTime(k, ac.currentTime, secs / 3);
}

// ---------- where sounds come from ----------
/** Where the ears are (the player), and the game's clock for sound; both kept by updAudio. */
export const ear = { x: 0, z: 0 };
export let clock = 0;
export function updAudio(dt: number, at: XZ) {
  clock += dt;
  ear.x = at.x; ear.z = at.z;
}

/** The screen's right, along the ground: things to the player's right on screen sound from the right. */
const RIGHT = { x: Math.cos(CAM_YAW), z: -Math.sin(CAM_YAW) };
/** At NEAR metres a sound is at half its volume; past FAR it isn't heard at all. */
const NEAR = 7, FAR = 26;
function place(at?: XZ) {
  if (!at) return { v: 1, pan: 0 };
  const dx = at.x - ear.x, dz = at.z - ear.z, d = Math.hypot(dx, dz);
  if (d > FAR) return null;
  return { v: 1 / (1 + (d / NEAR) ** 2), pan: Math.max(-0.8, Math.min(0.8, (dx * RIGHT.x + dz * RIGHT.z) / 10)) };
}

// ---------- voices ----------
export interface Voice {
  /** Seconds from now. */
  t?: number;
  /** Where in the world it comes from, heard from the player. Left out, it's right here: the player's own, the UI. */
  at?: XZ;
  /** Peak volume, 0 to 1. */
  v?: number;
  /** Seconds rising to the peak, held there, and dying away. */
  a?: number;
  hold?: number;
  d: number;
  bus?: Bus;
}
export interface ToneVoice extends Voice {
  f: number;
  /** Glides to this pitch over the sound. */
  f2?: number;
  type?: OscillatorType;
  /** A low-pass filter at this frequency, closing to `lp2` (a pluck's brightness fading). */
  lp?: number;
  lp2?: number;
  /** Vibrato: its rate and depth, in Hz. */
  vib?: [number, number];
  /** Tremolo: its rate in Hz, and how deep, 0 to 1 (an electric piano's or a vibraphone's shimmer). */
  trem?: [number, number];
  /** Detuned this many cents (a second voice a hair off the first, for warmth). */
  detune?: number;
}
export interface NoiseVoice extends Voice {
  /** The filter (band-pass unless `kind` says otherwise): its frequency, gliding to `f2`, and its Q. */
  f: number;
  f2?: number;
  q?: number;
  kind?: BiquadFilterType;
}

/**
 * How much to turn a sound down for the ear: it's most sensitive around 3 kHz (the equal-loudness contours of
 * ISO 226), where a tone sounds several decibels louder, and sharper, than the same tone lower down. Turned down by
 * up to half there, tunes that climb don't get louder and harsher as they go.
 */
export const forEar = (f: number) => 1 / (1 + Math.exp(-(Math.log2(f / 3200) ** 2) / 1.6));

/** Voices sounding now, capped so a busy moment on a phone can't pile up hundreds. */
let voices = 0;
const MAX_VOICES = 40;

/** A voice's envelope, into its bus and placed left or right, at frequency `f`; null when it can't or needn't be heard. */
function envelope(o: Voice, f: number) {
  const bus = o.bus ?? 'sfx';
  if (!ac || ac.state !== 'running' || voices >= MAX_VOICES || prefs.mute[bus]) return null;
  const p = place(o.at);
  if (!p) return null;
  const t0 = ac.currentTime + 0.01 + (o.t ?? 0), a = o.a ?? 0.004, top = t0 + a + (o.hold ?? 0), t1 = top + o.d;
  const g = ac.createGain(), v = (o.v ?? 0.3) * p.v * forEar(f);
  // Silent until the envelope starts. A gain starts at 1, and a sound that starts between two samples lets its first
  // sample through at that before the envelope takes over: for noise, which can start anywhere up to full scale, a
  // loud click.
  g.gain.value = 0;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(v, t0 + a);
  g.gain.setValueAtTime(v, top);
  g.gain.exponentialRampToValueAtTime(0.0001, t1);
  const nodes: AudioNode[] = [g];
  if (p.pan) {
    const s = ac.createStereoPanner();
    s.pan.value = p.pan; s.connect(buses[bus]); g.connect(s);
    nodes.push(s);
  } else g.connect(buses[bus]);
  voices++;
  return { g, t0, top, t1, nodes };
}
/** Lets go of a voice's nodes once its source has stopped. */
function release(src: AudioScheduledSourceNode, nodes: AudioNode[]) {
  src.onended = () => { voices--; nodes.forEach(n => n.disconnect()); };
}

/** A pitched sound: an oscillator through its envelope. */
export function tone(o: ToneVoice) {
  const e = envelope(o, o.f);
  if (!e) return;
  const c = ac!, osc = c.createOscillator();
  osc.type = o.type ?? 'sine';
  if (o.detune) osc.detune.value = o.detune;
  osc.frequency.setValueAtTime(o.f, e.t0);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, e.t1);
  let out: AudioNode = osc;
  if (o.lp) {
    const f = c.createBiquadFilter();
    f.frequency.setValueAtTime(o.lp, e.t0);
    if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, e.top + o.d * 0.5);
    osc.connect(f); out = f; e.nodes.push(f);
  }
  if (o.vib) {
    const lfo = c.createOscillator(), depth = c.createGain();
    lfo.frequency.value = o.vib[0]; depth.gain.value = o.vib[1];
    lfo.connect(depth); depth.connect(osc.frequency);
    lfo.start(e.t0); lfo.stop(e.t1);
    e.nodes.push(lfo, depth);
  }
  if (o.trem) {
    const lfo = c.createOscillator(), depth = c.createGain(), shimmer = c.createGain();
    lfo.frequency.value = o.trem[0]; depth.gain.value = o.trem[1] / 2; shimmer.gain.value = 1 - o.trem[1] / 2;
    lfo.connect(depth); depth.connect(shimmer.gain);
    out.connect(shimmer); out = shimmer;
    lfo.start(e.t0); lfo.stop(e.t1);
    e.nodes.push(lfo, depth, shimmer);
  }
  out.connect(e.g);
  osc.start(e.t0); osc.stop(e.t1 + 0.02);
  e.nodes.push(osc);
  release(osc, e.nodes);
}

/** A burst of filtered noise: a splash, a swish, a crunch, a shaker. */
export function noise(o: NoiseVoice) {
  const e = envelope(o, o.f);
  if (!e) return;
  const c = ac!, src = c.createBufferSource(), f = c.createBiquadFilter();
  src.buffer = noiseBuf; src.loop = true;
  f.type = o.kind ?? 'bandpass'; f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.f, e.t0);
  if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, e.t1);
  src.connect(f); f.connect(e.g);
  src.start(e.t0, rnd() * (NOISE_SECS - 1)); src.stop(e.t1 + 0.02);
  e.nodes.push(src, f);
  release(src, e.nodes);
}

export interface Bed {
  /** The filter (its type, frequency and Q), on brown noise if `soft`, white otherwise. */
  kind: BiquadFilterType;
  f: number;
  q: number;
  soft?: boolean;
  /** A second, low-pass filter at this frequency, to take off what hiss is left. */
  smooth?: number;
  /** Throbbing: its rate in Hz, and how much, 0 to 1 (the way cicadas do). */
  am?: [number, number];
}
/** A never-ending noise, filtered, starting silent: the ambient beds (ambience.ts) set its level as they go. */
export function bed(o: Bed) {
  const c = ac!, src = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  src.buffer = o.soft ? softBuf : noiseBuf; src.loop = true;
  fl.type = o.kind; fl.frequency.value = o.f; fl.Q.value = o.q;
  g.gain.value = 0;
  src.connect(fl);
  let out: AudioNode = fl;
  if (o.smooth) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = o.smooth;
    out.connect(lp); out = lp;
  }
  if (o.am) {
    const throb = c.createGain(), lfo = c.createOscillator(), depth = c.createGain();
    throb.gain.value = 1 - o.am[1] / 2;
    lfo.frequency.value = o.am[0]; depth.gain.value = o.am[1] / 2;
    lfo.connect(depth); depth.connect(throb.gain); lfo.start();
    out.connect(throb); out = throb;
  }
  out.connect(g);
  g.connect(buses.amb);
  src.start(0, rnd() * NOISE_SECS);
  return { f: fl, g };
}

/** Moves a level or a frequency smoothly towards `v`, over about `k` seconds. */
export function glide(p: AudioParam, v: number, k = 0.3) {
  p.setTargetAtTime(v, ac!.currentTime, k);
}

// ---------- pacing ----------
const lastAt: Record<string, number> = {};
/** True at most once every `gap` seconds of play for `key`, so a quick run (coins by the dozen) plays as a patter. */
export function every(key: string, gap: number) {
  if (clock - (lastAt[key] ?? -1e9) < gap) return false;
  lastAt[key] = clock;
  return true;
}
const runs: Record<string, { n: number; t: number }> = {};
/** How many `key`s in a row have come less than `gap` seconds apart: a run of pick-ups climbs the scale. */
export function streak(key: string, gap = 0.45) {
  const r = runs[key] ??= { n: -1, t: -1e9 };
  r.n = clock - r.t < gap ? r.n + 1 : 0;
  r.t = clock;
  return r.n;
}

// ---------- pitch ----------
/** The major pentatonic scale, in semitones up from its root: five notes that sound well together in any order. */
const PENTA = [0, 2, 4, 7, 9];
/** The key everything is in, as a MIDI note; the music moves it with the seasons. */
export const key = { root: 62 };
export const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
/** The n-th note of the scale from the key's root (n can go below 0 or past 4, into other octaves), `oct` up. */
export function deg(n: number, oct = 0) {
  const o = Math.floor(n / 5);
  return hz(key.root + 12 * (o + oct) + PENTA[n - o * 5]);
}

// ---------- instruments ----------
type Play = Partial<Voice>;
/** A wooden bar, struck softly (the market's marimba): a sine, and a quick overtone two octaves up. */
export function marimba(f: number, o: Play = {}) {
  tone({ d: 0.45, ...o, f, a: 0.003 });
  tone({ ...o, f: f * 4, a: 0.002, d: 0.07, v: (o.v ?? 0.3) * 0.3 });
}
/** A plucked string, bright then mellow (the restaurant's koto). */
export function pluck(f: number, o: Play = {}) {
  tone({ d: 0.9, ...o, f, type: 'sawtooth', a: 0.003, lp: f * 7, lp2: f * 1.3 });
}
/**
 * A little bell: a few partials out of tune with each other, ringing out. Out-of-tune partials are less easy on the
 * ear than a harmonic tone's, so it's for one-off news, not for tunes.
 */
export function bell(f: number, o: Play = {}) {
  tone({ d: 1.1, ...o, f, a: 0.002 });
  tone({ ...o, f: f * 2.76, a: 0.002, d: 0.45, v: (o.v ?? 0.3) * 0.35 });
  tone({ ...o, f: f * 5.4, a: 0.002, d: 0.2, v: (o.v ?? 0.3) * 0.15 });
}
