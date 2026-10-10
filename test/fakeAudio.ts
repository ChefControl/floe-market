// A stand-in for the Web Audio API, which jsdom doesn't have. Every node takes whatever it's given and remembers what
// it's connected to; every sound started is logged with its pitch (or its filter's frequency, for noise), the bus it
// plays on and where it's panned, so a test can see what the game would have played. Time stands still unless the
// test moves `fake.now` on.
import { vi } from 'vitest';

export class FakeParam {
  value: number;
  /** The first value set: a sound's starting pitch, before any glide. */
  first?: number;
  /** What it was before anything was scheduled on it. */
  before?: number;
  constructor(v = 0) { this.value = v; }
  setValueAtTime(v: number) { this.before ??= this.value; this.first ??= v; this.value = v; return this; }
  linearRampToValueAtTime(v: number) { this.value = v; return this; }
  exponentialRampToValueAtTime(v: number) { this.value = v; return this; }
  setTargetAtTime(v: number) { this.value = v; return this; }
}

export class FakeNode {
  outs: FakeNode[] = [];
  connect<T>(n: T) {
    if (n instanceof FakeNode) this.outs.push(n);
    return n;
  }
  disconnect() { this.outs = []; }
}

export interface Played {
  kind: 'tone' | 'noise';
  /** The pitch, or the noise filter's frequency. */
  f: number;
  type: string;
  bus: string;
  pan: number;
  loop: boolean;
  /** The source itself: an endless one stays connected, so its level can be read (see level()). */
  src: FakeNode;
  /** The level its envelope started from, before the sound began (see startLevel()). */
  from?: number;
}

export const fake = {
  /** The audio clock. */
  now: 0,
  /** AudioContexts made. */
  made: 0,
  /** Keep sources from ever ending (to fill up the voices). */
  hold: false,
  played: [] as Played[],
  buses: new Map<FakeNode, string>(),
};

/** The level a sound's envelope starts from, before it begins: the first gain on its way out that's scheduled. */
function startOf(src: FakeNode) {
  let n: FakeNode | undefined = src;
  while (n) {
    const g = (n as FakeNode & { gain?: FakeParam }).gain;
    if (g?.before !== undefined) return g.before;
    n = n.outs[0];
  }
  return undefined;
}

/** Follows a node's connections out to the bus it plays on, noting any panner on the way. */
function trace(n: FakeNode, out = { bus: '', pan: 0 }): { bus: string; pan: number } {
  const named = fake.buses.get(n);
  if (named) { out.bus = named; return out; }
  if ('pan' in n) out.pan = (n.pan as FakeParam).value;
  for (const o of n.outs) { trace(o, out); if (out.bus) break; }
  return out;
}

class Source extends FakeNode {
  stopped = false;
  private end: (() => void) | null = null;
  set onended(f: (() => void) | null) {
    this.end = f;
    if (this.stopped && !fake.hold) f?.();
  }
  get onended() { return this.end; }
  stop() { this.stopped = true; }
}
class Osc extends Source {
  type = 'sine';
  frequency = new FakeParam(440);
  detune = new FakeParam();
  setPeriodicWave() { this.type = 'custom'; }
  start() {
    fake.played.push({ kind: 'tone', f: this.frequency.first ?? this.frequency.value, type: this.type, loop: false, src: this, from: startOf(this), ...trace(this) });
  }
}
class Buffered extends Source {
  buffer: unknown = null;
  loop = false;
  start() {
    const filter = this.outs[0] as FakeNode & { frequency?: FakeParam };
    const f = filter?.frequency, freq = f ? f.first ?? f.value : 0;
    fake.played.push({ kind: 'noise', f: freq, type: '', loop: this.loop, src: this, from: startOf(this), ...trace(this) });
  }
}

export class FakeAudioContext {
  state = 'suspended';
  sampleRate = 8000;
  destination = new FakeNode();
  constructor() { fake.made++; }
  get currentTime() { return fake.now; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  createGain() { return Object.assign(new FakeNode(), { gain: new FakeParam(1) }); }
  createOscillator() { return new Osc(); }
  createBufferSource() { return new Buffered(); }
  createBiquadFilter() { return Object.assign(new FakeNode(), { type: 'lowpass', frequency: new FakeParam(350), Q: new FakeParam(1) }); }
  createStereoPanner() { return Object.assign(new FakeNode(), { pan: new FakeParam() }); }
  createConvolver() { return Object.assign(new FakeNode(), { buffer: null as unknown }); }
  createPeriodicWave() { return {}; }
  /** Any recording "decodes" to a minute of silence. */
  decodeAudioData() { return Promise.resolve({ duration: 60 }); }
  createDynamicsCompressor() {
    return Object.assign(new FakeNode(), { threshold: new FakeParam(), knee: new FakeParam(), ratio: new FakeParam() });
  }
  createBuffer(_channels: number, length: number) {
    const d = new Float32Array(length);
    return { getChannelData: () => d };
  }
}

/** Puts the stand-in in place of the browser's Web Audio, fresh. */
export function installFakeAudio() {
  Object.assign(fake, { now: 0, made: 0, hold: false, played: [], buses: new Map() });
  vi.stubGlobal('AudioContext', FakeAudioContext);
}

/** The level of an endless sound: the gain of the last node before its bus. */
export function level(p: Played) {
  let n = p.src;
  while (n.outs.length && !fake.buses.has(n.outs[0])) n = n.outs[0];
  return (n as FakeNode & { gain: FakeParam }).gain.value;
}

/** Names the game's buses, once sound has started, so what's played can be told apart: effects, ambience, music. */
export function nameBuses(buses: Record<string, unknown>) {
  fake.buses = new Map(Object.entries(buses).map(([k, v]) => [v as FakeNode, k]));
}
