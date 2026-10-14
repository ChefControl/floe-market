// The ring's crowd, heard (stage 3), following a bout from start to end so the player can follow it by ear, all of a
// piece rather than in bursts. Synthesised, a crowd sounds like wind or like a choir of machines, so this one's a real
// stadium crowd, recorded (public/sounds). Its murmur (ambience.ts's), its chant and its roar loop all the time, and
// their levels glide with the bout: the chant builds as the wrestlers step up and stamp, everything falls away for the
// hush at the crouch, the roar surges at the charge, rumbles on through the push and swells at the edge, then drains
// back into the murmur after the result. Over that, a rising "ooh" at the edge, a cheer as the winner's known (bigger,
// with cushions thrown, for a boss beaten), and applause for the bow. The more fans are fed, the louder it all is. Until the recordings have loaded (or
// if they can't), it's synthesised: voices, each a buzz through a vowel's formants (audio.ts's vocal) at its own pitch,
// with vibrato, and a babble between. It's loudest at the ringside, softer across the arena, low out in the other
// rooms (very low in Mr. Fugu's office), and faint through the floor from the dock.
import {
  between, clip, clipBed, clipLength, ear, glide, hasClip, loadClips, noise, rnd, tone, vocal, type Clip, type ClipVoice, type NoiseVoice,
  type ToneVoice, type VocalVoice, type Vowel,
} from './audio';
import { RING, roomAt } from './cellar';

// ---------- how much of it reaches the player ----------
/** Through the floor from the dock, the crowd is this much quieter. */
const MUFFLED = 0.15;
/** Out of the arena, by the room: through one doorway on the landing and in the hearth room, two in the prep hall
 *  (and the clatter of its work) and the cookware shop, and hardly at all in the grow room or behind Mr. Fugu's office
 *  door. */
const ROOMS_HEAR = { landing: 0.3, kitchen: 0.24, craft: 0.12, prep: 0.13, grow: 0.07, office: 0.07 } as const;
/** In the arena, all of it at the ringside and in the front of the stands, half of it by the far walls. */
const RINGSIDE = 6.5, ARENA_FAR = 12.5, ARENA_LOW = 0.45;
/** How much of the crowd the player hears where they are now, before smoothing. */
export function hearsAt(p: { x: number; z: number }, down: boolean) {
  const d = Math.hypot(p.x - RING.x, p.z - RING.z);
  if (!down) return MUFFLED / (1 + (d / 7) ** 2);
  const room = roomAt(p);
  if (room !== 'arena') return ROOMS_HEAR[room];
  return 1 - (1 - ARENA_LOW) * Math.min(1, Math.max(0, (d - RINGSIDE) / (ARENA_FAR - RINGSIDE)));
}
/** That, eased as the player walks (through a doorway it fades rather than jumps): what everything below plays at. */
let hears = 1;
/** For ambience.ts's murmur. */
export const ringHears = () => hears;
const at = { x: RING.x, z: RING.z };
const near = <T extends { v?: number }>(o: T) => ({ ...o, at, through: true, flat: true, v: (o.v ?? 0.3) * hears });
const t = (o: ToneVoice) => tone(near(o));
const n = (o: NoiseVoice) => noise(near(o));
const say = (o: VocalVoice) => vocal(near(o));
/** The recordings are a whole stadium at full tilt: brought down to sit about 10 dB over the murmur (measured). */
const RECORDED = 0.3;
const rec = (o: ClipVoice) => clip(near({ ...o, v: (o.v ?? 0.3) * RECORDED }));
/** A stretch `len` seconds long of a recording, from somewhere different in it each time, faded in over `fade` and
 *  out over `release`. */
function slice(c: Clip, len: number, v: number, dt = 0, fade = 0.06, rate = between(0.95, 1.05), release = 0.3) {
  rec({ clip: c, t: dt, from: between(0, Math.max(0, clipLength(c) - len * rate)), a: fade, hold: Math.max(0, len - fade - release), d: release, v, rate });
}
/** A whole cheer, the crowd erupting and dying away (eased in, so it grows out of the roar under it). */
const cheer = (c: 'cheer1' | 'cheer2', v: number, dt = 0, rate = between(0.96, 1.04)) =>
  rec({ clip: c, t: dt, from: 0, a: 0.15, hold: clipLength(c) / rate - 0.6, d: 0.45, v, rate });
/** The recordings are in, to play instead of the synthesised crowd. */
const recorded = () => (['chant', 'roar', 'applause', 'cheer1', 'cheer2', 'swell'] as const).every(hasClip);

/**
 * How worked up the crowd is: about 0.3 chatting, 0 hushed, 1 roaring. It settles back by itself (updRingSound). And
 * how loud they're chanting (0 to 1), and what that relaxes back to: up as the wrestlers step up, a beat louder on each
 * stamp, gone for the hush and the rest of the bout.
 */
export const crowd = { excite: 0, settle: 0.3, chant: 0, chantRest: 0, size: 1 };
function excited(to: number, rest = 0.3) { crowd.excite = to; crowd.settle = rest; }

/** Someone in the crowd: a man (lower, and a bigger throat) or a woman, at a pitch of their own. */
function person() {
  const man = rnd() < 0.6;
  return man ? { f: between(95, 165), throat: between(0.95, 1.05) } : { f: between(185, 290), throat: between(1.12, 1.2) };
}
/**
 * `count` people shouting at once, one of `vowels` each, starting within a moment of `dt`, about `d` long, their
 * pitch going `rise` times up (or down, under 1) as they shout: "hey!", "ooh", "ohhh".
 */
function shout(vowels: Vowel[], count: number, d: number, v: number, rise = 1, dt = 0) {
  for (let i = 0; i < count; i++) {
    const p = person(), f2 = p.f * rise * between(0.92, 1.08);
    say({
      t: dt + between(0, 0.14), f: p.f, f2, vowel: vowels[Math.floor(rnd() * vowels.length)], throat: p.throat,
      a: between(0.03, 0.09), d: d * between(0.7, 1.3), v: (v / Math.sqrt(count)) * between(0.6, 1), vib: [between(4.5, 6.5), p.f * 0.03],
    });
  }
}
/** Chatter between the shouts: a syllable now and then, more often (and louder) as the crowd's worked up. */
let chatter = 0;
const SYLLABLES: Vowel[] = ['a', 'o', 'e', 'u', 'i'];
export function updRingSound(dt: number) {
  loadClips();
  // (a small crowd is quieter: `size` is how big it is tonight, 0 to 1, from the fans fed; a boss's crowd is all of it)
  hears += (hearsAt(ear, ear.down) * (0.45 + 0.55 * crowd.size) - hears) * Math.min(1, dt * 3);
  crowd.excite += (crowd.settle - crowd.excite) * Math.min(1, dt * 0.6);
  crowd.chant += (crowd.chantRest - crowd.chant) * Math.min(1, dt * 0.5);
  layers();
  // (the recorded murmur, when it's in, is ambience.ts's)
  if (hasClip('murmur')) return;
  const e = crowd.excite, rate = 12 * e + (e > 0.15 ? 2 : 0);
  chatter -= dt * rate;
  while (chatter <= 0 && rate > 0) {
    chatter += between(0.5, 1.5);
    const p = person();
    say({
      f: p.f, f2: p.f * between(0.85, 1.05), vowel: SYLLABLES[Math.floor(rnd() * SYLLABLES.length)], throat: p.throat,
      a: 0.03, d: between(0.1, 0.24), v: 0.03 * (0.5 + e), vib: [between(4, 6), p.f * 0.02],
    });
  }
}

// ---------- the recorded crowd's layers ----------
/** The chant and the roar, looping on the effects from the moment they're loaded, their levels following the bout. */
let chantBed: { g: GainNode } | null = null, roarBed: { g: GainNode } | null = null;
/** Their levels at full: a whole stadium, brought down to sit with the rest of the game (measured). */
const CHANT_V = 0.2, ROAR_V = 0.22;
/** Glides a layer to `v`: up quickly (a surge), down slowly (a crowd doesn't stop at once). */
function toward(p: AudioParam, v: number) { glide(p, v, v > p.value ? 0.12 : 0.6); }
/** How loud the roar is, from how worked up they are: nothing chatting, full at a roar. */
export const roarLevel = () => Math.min(1.3, Math.max(0, (crowd.excite - 0.45) / 0.6));
function layers() {
  if (!recorded()) return;
  chantBed ??= clipBed('chant', 'sfx');
  roarBed ??= clipBed('roar', 'sfx');
  if (!chantBed || !roarBed) return;
  const k = hears;
  toward(chantBed.g.gain, CHANT_V * crowd.chant * k);
  toward(roarBed.g.gain, ROAR_V * roarLevel() * k);
}

/** Clapping: `per` hands a second for `secs`, each a short crack of filtered noise, thinning out as it goes. */
function applause(secs: number, per: number, v: number, dt = 0) {
  const count = Math.round(secs * per);
  for (let i = 0; i < count; i++) {
    const when = dt + between(0, secs), fade = 1 - (when - dt) / secs * 0.7;
    n({ t: when, f: between(1100, 2300), q: 1.6, a: 0.003, d: between(0.025, 0.05), v: v * fade * between(0.5, 1) });
  }
}
/** A low thud: a foot coming down, two wrestlers meeting, a cushion landing. */
const thud = (v = 0.3, dt = 0, f = 70) => { t({ t: dt, f, f2: f * 0.7, a: 0.008, d: 0.22, v }); n({ t: dt, f: 260, kind: 'lowpass', a: 0.006, d: 0.08, v: v * 0.4 }); };

export type Moment = 'billing' | 'stomp' | 'crouch' | 'charge' | 'edge' | 'win' | 'upset' | 'bow';
/** The crowd reacts to `m`, a moment in the bout: recorded, once the recordings are in. */
export function react(m: Moment) {
  if (recorded()) { live(m); return; }
  switch (m) {
    case 'billing': excited(0.5); break;
    case 'stomp': // a foot comes down: "yoisho!" and a few claps
      thud(0.35, 0, 62);
      shout(['o', 'e'], 8, 0.28, 0.1, 1.2, 0.02);
      applause(0.35, 40, 0.05, 0.02);
      excited(Math.max(crowd.excite, 0.55)); break;
    case 'crouch': excited(0.06, 0.06); break; // hush
    case 'charge': // they hit, and the room erupts
      thud(0.5, 0, 82);
      shout(['a', 'o'], 12, 0.9, 0.16, 1.1);
      excited(1, 0.75); break;
    case 'edge': shout(['u', 'o'], 10, 0.8, 0.13, 1.35); excited(1, 0.8); break; // a heel on the straw: "ooh"
    case 'win':
      shout(['a', 'e'], 14, 1.1, 0.16, 0.9);
      applause(3, 70, 0.06, 0.1);
      excited(1.1, 0.35); break;
    case 'upset': // the lighter man won: louder, a long "ohhh", and cushions thrown into the ring
      shout(['o', 'a'], 14, 1.6, 0.18, 0.72);
      applause(3.6, 90, 0.07, 0.2);
      for (let i = 0; i < 6; i++) thud(0.08, between(0.4, 2.2), between(90, 140));
      excited(1.25, 0.4); break;
    case 'bow': applause(1.6, 45, 0.04); break;
  }
}

/** The recorded crowd's reaction to `m`: mostly a change in where its layers are heading, with the moments that stand
 *  out on top. */
function live(m: Moment) {
  switch (m) {
    case 'billing': // the wrestlers step up: the chant starts up
      crowd.chantRest = 0.5; crowd.chant = Math.max(crowd.chant, 0.5);
      excited(0.5); break;
    case 'stomp': // a foot comes down: the chant lifts with it, and a few claps
      thud(0.35, 0, 62);
      crowd.chant = 1;
      slice('applause', 0.6, 0.1, 0.05, 0.08);
      excited(Math.max(crowd.excite, 0.55)); break;
    case 'crouch': // the hush: the chant and the chatter fall away
      crowd.chant = crowd.chantRest = 0;
      excited(0.06, 0.06); break;
    case 'charge': // they hit: the roar surges, and rumbles on through the push
      thud(0.5, 0, 82);
      excited(1, 0.75); break;
    case 'edge': // a heel on the straw: the "ooh" rising over the roar
      rec({ clip: 'swell', from: between(2.2, 2.8), a: 0.25, hold: 0.9, d: 0.6, v: 0.45 });
      excited(1, 0.8); break;
    case 'win': // the winner's known: a cheer grows out of the roar, and applause after, as the roar drains away
      cheer(rnd() < 0.5 ? 'cheer1' : 'cheer2', 0.6);
      slice('applause', 3.2, 0.3, 0.8, 0.6, undefined, 1.0);
      excited(1.1, 0.3); break;
    case 'upset': // the lighter man won: the biggest cheer, held longer, and cushions thrown into the ring
      cheer('cheer2', 0.7);
      slice('applause', 3.8, 0.38, 0.9, 0.6, undefined, 1.2);
      for (let i = 0; i < 6; i++) thud(0.08, between(0.4, 2.2), between(90, 140));
      excited(1.25, 0.35); break;
    case 'bow': slice('applause', 2.4, 0.3, 0, 0.4, undefined, 0.9); break;
  }
}
