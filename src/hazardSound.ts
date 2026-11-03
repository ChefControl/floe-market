// Cooking Hazard's guns, heard (hazardPlay.ts plays them as the rules say what happened; docs/cooking-hazard.md, "Gun
// feel"). Built from audio.ts's voices like the rest of the game's sounds, low and soft-edged so a fight full of them
// never clicks: every attack at least 8 ms, nothing much over 4 kHz.
//
// - The Spud Rifle: a potato cannon's puff of air and a soft thump. The Rock Salt Shotgun: a boom with the salt
//   rattling out. The Chili Sprayer, a flamethrower, held for as long as it fires (flameSound): the gas hiss, the
//   whoomp as it lights and blooms, the roar of the burn, fluttering and surging, then the hiss cut, the roar
//   guttering out and a puff as it's let go; burning zombies crackle. Built from how real ones sound: combustion roar
//   humps around 200–800 Hz and flickers 10–20 times a second, a jet's hiss sits a few kHz up (Farnell's Designing
//   Sound, fire; flame-noise and jet-noise studies), kept here under about 4 kHz.
// - A hit, in its taste: a plain potato's thud, chili sauce's wet sizzle, salt crystals cracking, a sticky sweet plop,
//   a sour splash, a dull bitter thunk, a mushroom's squish. A crit adds a crunch on top.
// - The salt shell clattering down, a dish's blast, and the rush's slow whoosh.
//
// Each has two styles to audition (a and b, on the audition page); `STYLE` is the one the game plays: the owner's
// picks (3 November 2026), the pop gun, the shotgun's rattle, the squelch, the crunch, the plastic ticks, the wetter
// blast and the rising whoosh (the flame's still to pick).
import { ac, between, buses, noise, tone } from './audio';
import type { GunId, Taste } from './hazard';

export type Style = 'a' | 'b';
/** The style each sound plays in. */
export const STYLE: Record<'spud' | 'salt' | 'flame' | 'hit' | 'crit' | 'shell' | 'blast' | 'rush', Style> = {
  spud: 'b', salt: 'a', flame: 'a', hit: 'a', crit: 'a', shell: 'a', blast: 'b', rush: 'a',
};

const last: Record<string, number> = {};
/** Whether `key` hasn't sounded in the last `gap` seconds (a spray's hits would pile up otherwise). */
function spaced(key: string, gap: number) {
  const now = ac?.currentTime ?? 0;
  if (now - (last[key] ?? -1e9) < gap) return false;
  last[key] = now;
  return true;
}

/** A shot from the Spud Rifle or the Rock Salt Shotgun (the Chili Sprayer's flame is flameSound). */
export function gunSound(gun: Exclude<GunId, 'chili'>, style: Style = STYLE[gun]) {
  if (gun === 'spud') {
    if (style === 'a') {
      // a puff of air out of the barrel, and the thump of it
      noise({ f: 900, f2: 320, kind: 'lowpass', q: 0.7, a: 0.008, d: 0.09, v: 0.12 });
      tone({ f: between(118, 128), f2: 72, type: 'triangle', a: 0.01, d: 0.13, v: 0.2 });
    } else {
      // a pop gun: a rounder pop, a little air
      tone({ f: between(200, 215), f2: 120, a: 0.01, d: 0.08, v: 0.16 });
      noise({ f: 1500, q: 1, a: 0.008, d: 0.045, v: 0.05 });
    }
  } else {
    if (style === 'a') {
      // the boom, and the salt rattling out after it
      tone({ f: 96, f2: 48, type: 'triangle', a: 0.012, d: 0.24, v: 0.3 });
      noise({ f: 1300, f2: 260, kind: 'lowpass', q: 0.7, a: 0.008, d: 0.2, v: 0.2 });
      noise({ t: 0.02, f: 2600, q: 2, a: 0.01, d: 0.08, v: 0.04 });
    } else {
      // a deeper, rounder boom
      tone({ f: 84, f2: 44, a: 0.012, d: 0.32, v: 0.32 });
      noise({ f: 900, f2: 200, kind: 'lowpass', q: 0.7, a: 0.01, d: 0.26, v: 0.22 });
    }
  }
}

// ---------- the flame ----------
/** Seconds of white noise for the flame's layers, each played from somewhere different in it. */
let buf: AudioBuffer | null = null;
function noiseFrom(c: BaseAudioContext, at: number) {
  if (!buf || buf.sampleRate !== c.sampleRate) {
    buf = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = between(-1, 1);
    // (it loops: its end eased into its start, or the seam would click)
    const n = 256;
    for (let i = 0; i < n; i++) d[d.length - n + i] *= 1 - i / n;
    for (let i = 0; i < n; i++) d[i] *= i / n;
  }
  const s = c.createBufferSource();
  s.buffer = buf; s.loop = true;
  s.start(at, between(0, 3.5));
  return s;
}
const filter = (c: BaseAudioContext, type: BiquadFilterType, f: number, q = 0.7) => {
  const n = c.createBiquadFilter();
  n.type = type; n.frequency.value = f; n.Q.value = q;
  return n;
};
const chain = (...nodes: AudioNode[]) => { for (let i = 1; i < nodes.length; i++) nodes[i - 1].connect(nodes[i]); return nodes[nodes.length - 1]; };
/** Holds a value where it is now, before ramping it somewhere else. */
function holdAt(p: AudioParam, t: number) {
  if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t);
  else { const v = p.value; p.cancelScheduledValues(t); p.setValueAtTime(v, t); }
}

/** Each style's flame: the hiss's level, the roar's middle, how bright it's let through, and its two flickers (Hz).
 *  a: the recipe as researched; b: a deeper, darker roar with less hiss and a slower flicker. */
const FLAMES: Record<Style, { hiss: number; mid: number; top: number; flick: [number, number]; whoomp: number }> = {
  a: { hiss: 0.15, mid: 450, top: 1400, flick: [11.3, 13.7], whoomp: 1800 },
  b: { hiss: 0.08, mid: 330, top: 1000, flick: [8.1, 10.4], whoomp: 1200 },
};
/** How loud the flame is, all told, against the game's other sounds. */
const FLAME_V = 0.32;

interface Held { c: BaseAudioContext; out: GainNode; hiss: GainNode; roar: GainNode; sub: GainNode; mid: BiquadFilterNode; flicks: OscillatorNode[]; depths: GainNode[]; sources: AudioScheduledSourceNode[]; nodes: AudioNode[]; style: Style }
let held: Held | null = null;

/**
 * The flame, held while the Chili Sprayer fires (`on`) and let go when it stops: started, it hisses, lights with a
 * whoomp and roars; let go, the hiss cuts, the roar gutters out and it puffs. Every level moves on a ramp, so it never
 * clicks, however often the trigger's pulled and let go.
 */
export function flameSound(on: boolean, style: Style = STYLE.flame) {
  if (on && !held) light(style);
  else if (!on && held) letGo();
}

function light(style: Style) {
  const c = ac;
  if (!c || c.state !== 'running') return;
  const f = FLAMES[style], t = c.currentTime + 0.01, wob = () => between(0.95, 1.05);
  const nodes: AudioNode[] = [], sources: AudioScheduledSourceNode[] = [];
  const out = c.createGain();
  out.gain.value = FLAME_V * between(0.9, 1.1);
  out.connect(buses.sfx);
  // the gas hiss: on first, settling as the pressure does
  const hiss = c.createGain(), hs = noiseFrom(c, t), hb = filter(c, 'bandpass', 3200 * wob(), 0.8);
  hb.frequency.setValueAtTime(3200, t); hb.frequency.linearRampToValueAtTime(2600 * wob(), t + 0.15);
  hiss.gain.setValueAtTime(0, t); hiss.gain.linearRampToValueAtTime(f.hiss, t + 0.012);
  chain(hs, filter(c, 'highpass', 1200), hb, filter(c, 'lowpass', 4000), hiss, out);
  // the whoomp as it lights and blooms: a thud, and a burst of brightness falling back
  const w = c.createGain(), ws = noiseFrom(c, t + 0.03), wl = filter(c, 'lowpass', 250, 1), thud = c.createOscillator(), tg = c.createGain();
  wl.frequency.setValueAtTime(250, t + 0.03);
  wl.frequency.exponentialRampToValueAtTime(f.whoomp, t + 0.09);
  wl.frequency.exponentialRampToValueAtTime(500, t + 0.38);
  w.gain.setValueAtTime(0, t + 0.03); w.gain.linearRampToValueAtTime(1, t + 0.042); w.gain.exponentialRampToValueAtTime(0.001, t + 0.43);
  chain(ws, wl, w, out);
  thud.frequency.setValueAtTime(110, t + 0.03); thud.frequency.exponentialRampToValueAtTime(50, t + 0.28);
  tg.gain.setValueAtTime(0, t + 0.03); tg.gain.linearRampToValueAtTime(0.5, t + 0.045); tg.gain.exponentialRampToValueAtTime(0.001, t + 0.33);
  chain(thud, tg, out);
  thud.start(t + 0.03); thud.stop(t + 0.36); ws.stop(t + 0.45);
  // the roar of the burn: a hump in the low middle, flickering (two rates, so it never buzzes) and surging slowly; it
  // eases off a little if it's held a long while
  const rs = noiseFrom(c, t + 0.03), mid = filter(c, 'bandpass', f.mid * wob(), 0.6), flick = c.createGain(), roar = c.createGain();
  flick.gain.value = 1;
  roar.gain.setValueAtTime(0, t + 0.03); roar.gain.linearRampToValueAtTime(0.6, t + 0.07);
  roar.gain.setValueAtTime(0.6, t + 1); roar.gain.linearRampToValueAtTime(0.48, t + 2);
  chain(rs, mid, filter(c, 'lowpass', f.top), flick, roar, out);
  const flicks: OscillatorNode[] = [], depths: GainNode[] = [];
  for (const [hz, depth, to] of [[f.flick[0], 0.12, flick.gain], [f.flick[1], 0.12, flick.gain], [0.7, 100, mid.frequency], [0.7, 0.08, flick.gain]] as const) {
    const o = c.createOscillator(), d = c.createGain();
    o.frequency.value = hz * between(0.9, 1.1); d.gain.value = depth;
    o.connect(d); d.connect(to); o.start(t);
    flicks.push(o); depths.push(d); sources.push(o); nodes.push(d);
  }
  // and the rumble under it
  const sub = c.createGain(), ss = noiseFrom(c, t + 0.03);
  sub.gain.setValueAtTime(0, t + 0.03); sub.gain.linearRampToValueAtTime(0.35, t + 0.08);
  chain(ss, filter(c, 'lowpass', 150), sub, out);
  sources.push(hs, rs, ss);
  nodes.push(out, hiss, hb, w, wl, tg, mid, flick, roar, sub);
  held = { c, out, hiss, roar, sub, mid, flicks, depths, sources, nodes, style };
}

function letGo() {
  const h = held!, c = h.c, t = c.currentTime + 0.005;
  held = null;
  for (const p of [h.hiss.gain, h.roar.gain, h.sub.gain, h.mid.frequency, ...h.depths.map(d => d.gain), ...h.flicks.slice(0, 2).map(o => o.frequency)]) holdAt(p, t);
  // the hiss cuts; the roar sinks and gutters, its flicker slower and deeper
  h.hiss.gain.setTargetAtTime(0, t, 0.02);
  h.roar.gain.setTargetAtTime(0, t, 0.08);
  h.sub.gain.setTargetAtTime(0, t, 0.08);
  h.mid.frequency.linearRampToValueAtTime(220, t + 0.3);
  for (let i = 0; i < 2; i++) { h.depths[i].gain.linearRampToValueAtTime(0.4, t + 0.2); h.flicks[i].frequency.linearRampToValueAtTime(7, t + 0.3); }
  // and a puff
  const pg = c.createGain(), ps = noiseFrom(c, t);
  pg.gain.setValueAtTime(0, t); pg.gain.linearRampToValueAtTime(0.35, t + 0.01); pg.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  chain(ps, filter(c, 'lowpass', 900), pg, h.out);
  ps.stop(t + 0.2);
  for (const s of h.sources) s.stop(t + 1.2);
  h.sources[0].onended = () => { for (const n of [...h.nodes, ...h.sources, pg, ps]) n.disconnect(); };
  // (a few crackles as it dies)
  for (let i = 0; i < 6; i++) crackle(between(0.05, 0.8));
}

/** Something burning: a soft crackle, `t` seconds from now (kept low: no sharp ticks). */
export function crackle(t = 0) {
  noise({ t, f: between(1500, 2500), q: 1.5, a: 0.008, d: between(0.02, 0.04), v: between(0.15, 0.25) });
}

/** A hit in `taste` (none: a plain potato). Style b leans on the thump, a on the squelch. */
export function hitSound(taste: Taste | null, gun: GunId, style: Style = STYLE.hit) {
  if (!spaced('hit', gun === 'chili' ? 0.07 : 0.035)) return;
  const k = gun === 'chili' ? 0.5 : 1, body = style === 'b' ? 1.6 : 1, wet = style === 'b' ? 0.5 : 1;
  switch (taste) {
    case null:
      tone({ f: between(170, 185), f2: 110, type: 'triangle', a: 0.008, d: 0.06, v: 0.1 * k * body });
      noise({ f: 700, kind: 'lowpass', q: 0.8, a: 0.008, d: 0.05, v: 0.07 * k * wet });
      break;
    case 'spicy':
      noise({ f: 2600, q: 0.7, a: 0.01, d: 0.1, v: 0.035 * k * wet });
      noise({ f: 520, kind: 'lowpass', q: 1, a: 0.008, d: 0.05, v: 0.06 * k });
      tone({ f: 160, f2: 120, a: 0.008, d: 0.04, v: 0.05 * k * body });
      break;
    case 'salty':
      noise({ f: 2000, q: 3, a: 0.008, d: 0.03, v: 0.06 * k * wet });
      noise({ t: 0.025, f: 1700, q: 3, a: 0.008, d: 0.03, v: 0.045 * k * wet });
      tone({ f: 200, f2: 150, type: 'triangle', a: 0.008, d: 0.04, v: 0.05 * k * body });
      break;
    case 'sweet':
      tone({ f: 300, f2: 200, a: 0.01, d: 0.07, v: 0.08 * k * body });
      noise({ f: 420, kind: 'lowpass', q: 1.2, a: 0.01, d: 0.06, v: 0.05 * k * wet });
      break;
    case 'sour':
      noise({ f: 1300, f2: 600, q: 0.9, a: 0.008, d: 0.08, v: 0.06 * k * wet });
      tone({ f: 190, f2: 140, a: 0.008, d: 0.04, v: 0.05 * k * body });
      break;
    case 'bitter':
      tone({ f: 140, f2: 92, type: 'triangle', a: 0.01, d: 0.07, v: 0.1 * k * body });
      noise({ f: 320, kind: 'lowpass', q: 0.8, a: 0.008, d: 0.05, v: 0.05 * k * wet });
      break;
    case 'umami':
      tone({ f: 220, f2: 150, a: 0.01, d: 0.06, v: 0.07 * k * body });
      noise({ f: 460, kind: 'lowpass', q: 2, a: 0.01, d: 0.07, v: 0.06 * k * wet });
      break;
  }
}

/** A crit, on top of the hit: a crunch (a), or a crunch and a little ring (b). */
export function critSound(style: Style = STYLE.crit) {
  if (!spaced('crit', 0.05)) return;
  noise({ f: 1600, q: 1.5, a: 0.008, d: 0.05, v: 0.09 });
  tone({ f: 400, f2: 230, type: 'triangle', a: 0.008, d: 0.07, v: 0.08 });
  if (style === 'b') tone({ t: 0.01, f: 880, a: 0.01, d: 0.16, v: 0.035 });
}

/** The shotgun's spent salt shell, landing a moment after the shot and bouncing once. */
export function shellSound(style: Style = STYLE.shell) {
  if (style === 'a') {
    tone({ t: 0.35, f: 1100, f2: 900, type: 'triangle', a: 0.008, d: 0.03, v: 0.035 });
    tone({ t: 0.47, f: 1050, f2: 880, type: 'triangle', a: 0.008, d: 0.025, v: 0.02 });
  } else {
    noise({ t: 0.35, f: 2400, q: 4, a: 0.008, d: 0.03, v: 0.12 });
    noise({ t: 0.47, f: 2300, q: 4, a: 0.008, d: 0.025, v: 0.07 });
  }
}

/** A dish's blast: a deep thump and the splash of it (b: wetter). */
export function blastSound(style: Style = STYLE.blast) {
  tone({ f: 78, f2: 38, a: 0.012, d: 0.42, v: 0.34 });
  noise({ f: 1100, f2: 160, kind: 'lowpass', q: 0.7, a: 0.01, d: 0.36, v: 0.24 });
  noise({ f: 620, q: 1, a: 0.008, d: 0.12, v: 0.08 });
  if (style === 'b') noise({ t: 0.04, f: 2400, f2: 500, kind: 'lowpass', q: 0.8, a: 0.02, d: 0.32, v: 0.14 });
}

/** The rush: a slow whoosh rising, and a low thump under it (b: a whoosh falling away). */
export function rushSound(style: Style = STYLE.rush) {
  if (style === 'a') {
    noise({ f: 380, f2: 1400, q: 1.2, a: 0.15, d: 0.5, v: 0.09 });
    tone({ f: 70, f2: 52, a: 0.03, d: 0.6, v: 0.12 });
  } else {
    noise({ f: 2000, f2: 300, kind: 'lowpass', q: 0.9, a: 0.06, d: 0.7, v: 0.3 });
  }
}
