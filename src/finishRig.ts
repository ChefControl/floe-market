// The finishers' rig (stage 3): what every finisher (finishers/*.ts) is made of, and how one is played on the two
// wrestlers (dohyo.ts, and the tests). A finisher says, for each moment of the fight's result, where each man stands
// (or where his hips are, for a man in the air), how he holds himself, and whose hands are on whose belt; the rig
// puts the models there, reaches their arms to the belt they grip (so a hand on a belt is on it), and once the move is
// done it plays the same aftermath for all of them: the loser gets up, the winner raises a fist, the bow, the corners.
//
// Positions are metres from the ring's middle: x east, z south (towards the camera), y up from the cellar's floor
// (the ring's top is `ring.top` up). The champion (0) starts east facing west; his opponent (1) west facing east.
import { type Object3D, Vector3 } from 'three';
import type { Kind } from './creatures';
import { BOW, FIST, GETUP, LIE, SIT, SQUAT, STAND, sideways, walk } from './poses';
import { ANKLE, mixPose, type Pose, type RikishiModel, SHIN, THIGH } from './rikishi';

export type V3 = [number, number, number];
/** Where a wrestler stands (x, z), which way he faces (yaw: atan2 of the way he faces, x over z), how he holds
 *  himself, and how far his feet are off the ground under him. */
export interface At { x: number; z: number; yaw: number; p: Pose; air: number }

// ---------- the numbers ----------
/** The wrestlers' size, against the game's people (every model's scale). */
export const SIZE = 0.92;
/** Their marks either side of the white lines; where they crouch. */
export const MARK = 1.5, CROUCH_AT = 1.15;
/** Gravity, m/s². (An anime moment may bend it; a believable one doesn't.) */
export const G = 9.8;
/** A result's length (fight.ts's payLen): a push-out's, a finisher's, an epic's (a perfect slam's). */
export const PAY = 7, FINISHER_PAY = 8.5, EPIC_PAY = 11;
/** The aftermath needs this long at least, after a move's `done`: so a push-out's done by 2.6 s, a finisher by 4.1 s,
 *  an epic by 6.6 s. */
export const AFTER_MIN = 4.4;

// ---------- small maths ----------
export const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const lerpV = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
/** Smooth in and out; in (accelerating); out (decelerating). */
export const ease = (k: number) => k * k * (3 - 2 * k);
export const easeIn = (k: number) => k * k;
export const easeOut = (k: number) => 1 - (1 - k) * (1 - k);
/** How far `t` is from `a` to `b`, 0 to 1. */
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
/** Whether a beat at `x` falls between the last frame's time and this one's. */
export const crossed = (t0: number, t1: number, x: number) => t0 < x && t1 >= x;
/** Facing the other man at the start: the champion (0) west, his opponent (1) east. */
export const face = (who: number) => (who ? Math.PI / 2 : -Math.PI / 2);
/** The yaw that faces from `a` towards `b`. */
export const yawTo = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.atan2(b.x - a.x, b.z - a.z);
/** A wrestler at `x`, facing the other man, standing as `p`. */
export const at = (who: number, x: number, p: Pose = STAND, o: Partial<At> = {}): At => ({ x, z: 0, yaw: face(who), p, air: 0, ...o });
/** A flight under gravity from `p0` that comes down on `p1` after `T` seconds: where it is `tau` seconds in. */
export function fly(p0: V3, p1: V3, T: number, tau: number, g = G): V3 {
  const k = tau / T;
  return [lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k) + 0.5 * g * tau * (T - tau), lerp(p0[2], p1[2], k)];
}
/** The same flight's velocity at `tau` (for following through, or a bounce). */
export function flyV(p0: V3, p1: V3, T: number, tau: number, g = G): V3 {
  return [(p1[0] - p0[0]) / T, (p1[1] - p0[1]) / T + 0.5 * g * (T - 2 * tau), (p1[2] - p0[2]) / T];
}
/** A thrown body's flight from `p0` with velocity `v`: where it is `tau` seconds in. */
export const toss = (p0: V3, v: V3, tau: number, g = G): V3 => [p0[0] + v[0] * tau, p0[1] + v[1] * tau - 0.5 * g * tau * tau, p0[2] + v[2] * tau];
/**
 * Time bent: slow motion and hit-stop. `keys` are [time, rate] from when the clock runs at that rate (1 normal, 0.3
 * slow, 0 frozen); before the first key it runs at 1. Returns the move's own clock at real time `t`.
 */
export function warp(t: number, keys: [number, number][]) {
  let out = 0, at0 = 0, rate = 1;
  for (const [k, r] of keys) {
    if (t <= k) break;
    out += (k - at0) * rate; at0 = k; rate = r;
  }
  return out + (t - at0) * rate;
}

// ---------- the ring ----------
/** The ring: its top's height, half its width (the square mound), the straw's radius, and the ground anywhere: the
 *  top, down the pallets east and west, or the floor. */
export interface Ring { top: number; half: number; r: number; corner: number; ground: (x: number, z?: number) => number }
export function makeRing(top: number, half: number, r: number, steps: { out: number; top: number }[]): Ring {
  const SLOPE = [[0.05, top], ...steps.map(s => [s.out, s.top]), [steps[steps.length - 1].out + 0.3, 0]];
  const ground = (x: number, z = 0) => {
    const out = Math.max(Math.abs(x), Math.abs(z)) - half;
    if (out <= SLOPE[0][0]) return top;
    for (let i = 1; i < SLOPE.length; i++) {
      const [o0, h0] = SLOPE[i - 1], [o1, h1] = SLOPE[i];
      if (out <= o1) return h0 + (h1 - h0) * ((out - o0) / (o1 - o0));
    }
    return 0;
  };
  return { top, half, r, corner: half + 1.15, ground };
}

// ---------- a finisher ----------
/** What a finisher knows: the time, who's who, where the fight left them, the ring, and the two models. */
export interface Ctx {
  /** Seconds since the result began (the fight's `pay` phase), real time: bend it with `warp` for slow motion. */
  t: number;
  /** Who won and who lost: 0 the champion, 1 his opponent. */
  w: 0 | 1; l: 0 | 1;
  /** The loser's own side of the ring (east +1, west -1): a push-out sends him out over his own straw. */
  lSide: number;
  /** Where the fight left the winner and the loser (in a tight fight the winner's back at his own straw, the loser
   *  driving him; otherwise the loser's at his own straw, the winner driving). */
  W0: At; L0: At;
  /** Their distance apart, chest to chest. */
  D: number;
  /** The opponent's creature (none: the sparring partner, or a local). */
  kind?: Kind;
  /** The champion's slam on a grand win: 2 perfect (the epic plays), 1 good, 0 none. */
  slam: number;
  ring: Ring;
  /** The winner's and the loser's models: read only (girth, the puffer's `puff`). */
  W: RikishiModel; L: RikishiModel;
  /** Something a move keeps from one frame to the next (cleared when the result starts). */
  keep: Map<string, unknown>;
}
/** One moment of a finisher. */
export interface Frame {
  W: At; L: At;
  /** The winner's hands on the loser's belt, 0 (free) to 1 (on it): a number for both, or one for each arm (0 his
   *  left, 1 his right). His arms reach for it, whatever his pose says. */
  grip?: number | [number, number];
  /** The loser's hands on the winner's belt, the same way. */
  hold?: number | [number, number];
  /** Either man's hand put on a point: [who, arm, where, how much]. */
  reach?: ['W' | 'L', 0 | 1, V3, number][];
  /** Put his hips (their middle) here instead of standing him at his At's x, z and air: for a man in the air,
   *  turning about his middle. */
  wHips?: V3; lHips?: V3;
  /** The puffer blown up (0 to 1) and how wild a creature's soft parts are (0 to 1), if he's in it. */
  puff?: number; agitate?: number;
  /** The camera, for an epic: how far up to look (metres over the ring's top), how far to pull back (0 to 1), and to
   *  take it even off the watch spot. */
  cam?: { y?: number; wide?: number; take?: boolean };
  /** A part of him may go into the ground (a head buried in the clay: the test lets it). */
  sink?: boolean;
}
/** The moments: crowd, dust, words, the camera's knocks. */
export interface Fx {
  word(text: string, at: V3, o?: { fill?: string; size?: number; life?: number }): void;
  dust(at: V3, n?: number, big?: number): void;
  burst(at: V3, size?: number): void;
  /** The camera's knock on the watch spot: shake, a white flash, a punch in. */
  hit(shake: number, flash?: number, punch?: number): void;
  ink(at: V3, n?: number): void;
  slime(at: V3): void;
  /** The crowd. */
  react(k: 'charge' | 'edge' | 'upset' | 'win' | 'stomp' | 'crouch' | 'bow' | 'billing'): void;
  /** A knock to his belly (it wobbles). */
  kick(who: 'W' | 'L', v: number): void;
  /** Where a part of him is now. */
  at(who: 'W' | 'L', part: 'hips' | 'belly' | 'chest' | 'head' | 'hand0' | 'hand1' | 'foot0' | 'foot1'): V3;
  /** The epic's screen: speed lines (0 to 1), a flash ('white' or 'black'), an impact frame (the picture inverted for
   *  a beat), and big words across it, for `for` seconds. */
  screen(o: { lines?: number; flash?: 'white' | 'black'; impact?: boolean; text?: string; for: number }): void;
}
export interface FinishMove {
  /** Seconds into the result the loser's down for good (the card and the strip wait for it). */
  lands: number;
  /** When his big impact is, for a win's slam (fight.ts's FINISH), if it isn't `lands`: the crash before the
   *  skips that bring him to a stop, say. */
  hits?: number;
  /** When the move's done and the aftermath takes over (from wherever the move left them): at least `lands`; at most
   *  its result's length less AFTER_MIN. */
  done: number;
  /** When its name goes up (default 0.6 s): over the ring, or for an epic, across the screen. */
  nameAt?: number;
  /** The loser ends it face down (the aftermath gets him up from there). */
  front?: boolean;
  /** The move, at `c.t` (from 0 to `done`). */
  frame(c: Ctx): Frame;
  /** Its moments, every frame, from the last frame's time `t0` to this one's `t1` (real time). Beside them dohyo.ts
   *  plays the same for every move: the referee's call, the name, and at `lands` the thud (dust, a knock, the camera's
   *  hit). */
  beats?(c: Ctx, fx: Fx, t0: number, t1: number): void;
}

// ---------- where his parts are ----------
/** Where his hips are when he's at `s` (worked out as rikishi.ts's apply sets them, without the model). */
export function hipsAt(s: At, ring: Ring): V3 {
  const p = s.p;
  let drop = 0;
  for (const [x, z, k] of [[p.l0x, p.l0z, p.l0k], [p.l1x, p.l1z, p.l1k]]) drop = Math.max(drop, (THIGH * Math.cos(x) + SHIN * Math.cos(x - k)) * Math.cos(z) + ANKLE);
  const h = (drop + (0.21 - drop) * p.seat) * p.sq;
  const lx = -h * Math.sin(p.roll), ly = h * Math.cos(p.roll) * Math.cos(p.pitch) + p.up, lz = h * Math.cos(p.roll) * Math.sin(p.pitch);
  const c = Math.cos(s.yaw), sn = Math.sin(s.yaw);
  return [s.x + SIZE * (lx * c + lz * sn), ring.ground(s.x, s.z) + s.air + SIZE * ly, s.z + SIZE * (-lx * sn + lz * c)];
}
/** Points round his belt, where a man may grip it (in the model's own space, on its hips): its front, sides and back
 *  (round a puffer's swelling, blown up). */
const BELT_N = 72;
const beltRound = (r: RikishiModel) => Array.from({ length: BELT_N }, (_, i) => {
  const a = (i / BELT_N) * Math.PI * 2;
  return new Vector3(Math.sin(a) * (0.42 * r.girth + 0.03), -0.02, Math.cos(a) * (0.34 * r.girth + 0.03));
});
// ---------- putting them there ----------
const v3 = (o: Vector3, p: V3) => new Vector3(o.x + p[0], o.y + p[1], o.z + p[2]);
/** Stands a wrestler where `s` says, on the ground there (or `air` over it). */
export function place(r: RikishiModel, s: At, origin: Vector3, ring: Ring, dt: number) {
  r.position.set(origin.x + s.x, origin.y + ring.ground(s.x, s.z) + s.air, origin.z + s.z);
  r.rotation.set(0, s.yaw, 0);
  r.apply(s.p, dt);
}
/** Moves him (as he is) so that `part` is at `to`. */
export function pin(r: RikishiModel, part: Object3D, to: Vector3) {
  r.updateMatrixWorld(true);
  r.position.add(to.clone().sub(part.getWorldPosition(new Vector3())));
  r.updateMatrixWorld(true);
}
/** How far a man leans in over the other to get hold of his belt, at most (his spine's bend, radians, past the pelvis's
 *  part of it): further, and his head would be in the other's chest. (His arm stretches for the rest.) */
const LEAN = 0.5;
/** How far an arm stretches, at most, to get a hand on a belt out of its reach (the arms are short beside the bellies). */
const STRETCH = 1.8;
/** The arm's two bones: shoulder to elbow, and elbow to the hand (rikishi.ts). */
const UPPER = 0.27, FORE = Math.hypot(0.25, 0.01), FORE_D = Math.atan2(0.01, 0.25);
/**
 * Reaches his arm `i` for `target` (a world point), `k` of the way from where his pose put it: the elbow bends to
 * the distance, the shoulder turns the arm to it (out of reach, the arm points at it, straight).
 */
export function reach(r: RikishiModel, i: number, target: Vector3, k: number) {
  if (k <= 0) return;
  const A = r.arms[i];
  r.updateMatrixWorld(true);
  const d = A.sh.parent!.worldToLocal(target.clone()).sub(A.sh.position);
  const want = Math.max(Math.abs(UPPER - FORE) + 0.03, d.length());
  let e: number, wy: number, wz: number, stretch = 1;
  if (want <= UPPER + FORE - 0.02) {
    // in reach: the elbow from the distance, |w|² = UPPER² + FORE² + 2·UPPER·FORE·cos(e + FORE_D)
    const ce = (want * want - UPPER * UPPER - FORE * FORE) / (2 * UPPER * FORE);
    e = Math.max(0, Math.min(Math.PI - 0.05, Math.acos(Math.max(-1, Math.min(1, ce))) - FORE_D));
    wy = -UPPER - 0.25 * Math.cos(e) + 0.01 * Math.sin(e); wz = 0.25 * Math.sin(e) + 0.01 * Math.cos(e);
  } else {
    // out of reach: the arm nearly straight, and longer (the shoulder's bone stretched along its length, and all of
    // the arm with it), as far as STRETCH: a cartoon arm reaching round a belly
    e = 0.12;
    const y0 = -UPPER - 0.25 * Math.cos(e) + 0.01 * Math.sin(e);
    wz = 0.25 * Math.sin(e) + 0.01 * Math.cos(e);
    stretch = Math.min(STRETCH, Math.sqrt(Math.max(0, want * want - wz * wz)) / -y0);
    wy = y0 * stretch;
  }
  d.setLength(Math.hypot(wy, wz));
  // the shoulder: out to the side (z), then forward (x)
  const z = Math.asin(Math.max(-1, Math.min(1, -d.x / wy)));
  const ax = Math.atan2(wz, wy * Math.cos(z)) - Math.atan2(d.z, d.y);
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  const x0 = A.sh.rotation.x, z0 = A.sh.rotation.z, e0 = A.el.rotation.x;
  A.sh.rotation.set(x0 + wrap(-ax - x0) * k, 0, z0 + wrap(z - z0) * k);
  A.el.rotation.x = e0 + (-e - e0) * k;
  A.sh.scale.set(1, 1 + (stretch - 1) * k, 1);
}
/** Where his belt's grip points are now (the test checks a gripping hand is on one). */
export const beltPoints = (r: RikishiModel) => { r.updateMatrixWorld(true); return beltRound(r).map(p => r.hips.localToWorld(p)); };
/**
 * `by`'s hands on `of`'s belt, `k` of the way (a number, or one for each arm): each hand takes the hold on it nearest
 * his shoulder, on his own side of the other's middle (round the side or the back, if the move has them close enough;
 * the front of it, if not).
 */
export function grip(by: RikishiModel, of: RikishiModel, k: number | [number, number]) {
  const ks = by.arms.map((_, i) => (typeof k === 'number' ? k : k[i]));
  if (Math.max(...ks) <= 0) return;
  of.updateMatrixWorld(true); by.updateMatrixWorld(true);
  const pts = beltPoints(of);
  /** Each hand's hold, and how far it is from his shoulder. */
  const holds = () => {
    by.updateMatrixWorld(true);
    const mid = by.worldToLocal(of.hips.getWorldPosition(new Vector3())).x;
    return by.arms.map(A => {
      const sh = A.sh.getWorldPosition(new Vector3());
      let best = pts[0], bd = Infinity;
      for (const p of pts) {
        // (his own side: the arm on his +x side holds on to the other's middle's +x side)
        if ((by.worldToLocal(p.clone()).x - mid) * A.s < -0.05) continue;
        const d = p.distanceTo(sh);
        if (d < bd) { bd = d; best = p; }
      }
      return { at: best, d: bd, sh };
    });
  };
  // he leans in over the other to get his hands on it (a hold below his reach, as he stands: he bends to it)
  let h = holds();
  const arm = (UPPER + FORE) * STRETCH * by.scale.x * 0.96, base = by.spine.rotation.x;
  const below = (o: { at: Vector3; sh: Vector3 }) => by.worldToLocal(o.at.clone()).y < by.worldToLocal(o.sh.clone()).y;
  for (let n = 0; n < 8; n++) {
    const short = Math.max(...h.map((o, i) => (ks[i] > 0 && below(o) ? o.d - arm : 0)));
    if (short <= 0) break;
    const was = by.spine.rotation.x;
    by.spine.rotation.x = Math.min(was + Math.min(0.15, short * 1.5) * Math.max(...ks), Math.max(was, LEAN));
    const h2 = holds();
    if (Math.max(...h2.map(o => o.d)) >= Math.max(...h.map(o => o.d))) { by.spine.rotation.x = was; break; }
    h = h2;
  }
  // (and he doesn't straighten in a blink when he needn't lean any more: he comes up over a few frames)
  const lean = by.spine.rotation.x - base, was = leanWas.get(by) ?? 0;
  if (lean < was - 0.06) { by.spine.rotation.x = base + was - 0.06; h = holds(); }
  leanWas.set(by, by.spine.rotation.x - base);
  by.arms.forEach((_, i) => reach(by, i, h[i].at, ks[i]));
}
/** How far each man was leaning in last frame (to come up from it smoothly). */
const leanWas = new WeakMap<RikishiModel, number>();
/** The two men as a frame has them: placed, pinned, their hands reaching. Returns where each actually stands. */
export function drive(f: Frame, W: RikishiModel, L: RikishiModel, origin: Vector3, ring: Ring, dt: number): [At, At] {
  place(W, f.W, origin, ring, dt);
  if (f.wHips) pin(W, W.hips, v3(origin, f.wHips));
  place(L, f.L, origin, ring, dt);
  if (f.lHips) pin(L, L.hips, v3(origin, f.lHips));
  if (f.grip) grip(W, L, f.grip); else leanWas.delete(W);
  if (f.hold) grip(L, W, f.hold); else leanWas.delete(L);
  for (const [who, i, p, k] of f.reach ?? []) reach(who === 'W' ? W : L, i, v3(origin, p), k);
  const actual = (r: RikishiModel, s: At): At => {
    const x = r.position.x - origin.x, z = r.position.z - origin.z;
    return { ...s, x, z, air: r.position.y - origin.y - ring.ground(x, z) };
  };
  return [actual(W, f.W), actual(L, f.L)];
}

// ---------- after the move ----------
/** Lying on his back (the game's), or face down. */
export const DOWN = LIE, DOWN_FRONT = { ...LIE, pitch: 1.35, seat: 0, l0x: -0.05, l0k: 0.1, l1x: 0.15, l1k: 0.25, a0x: -0.4, a1x: -0.6, head: -0.4 };
/** How long the aftermath's getting up takes (then the walk to the marks, the bow, the prize, the corners). */
export const UP = 1.5;
/** Walks him from where he is to (x, z), `k` of the way (the crab sideways). */
function walkTo(s: At, from: At, x: number, z: number, k: number, crab: boolean) {
  s.x = lerp(from.x, x, ease(k)); s.z = lerp(from.z, z, ease(k));
  s.p = k > 0 && k < 1 ? walk(k * 18) : STAND;
  if (k > 0 && k < 1) s.yaw = yawTo(from, { x, z });
  if (crab && k > 0 && k < 1) { s.p = sideways(k * 22); s.yaw = 0; }
}
/**
 * After a move, `u` seconds after its `done`, with `len` seconds left of the result: the loser, from how the move left
 * him (`Le`, down), lies a moment, sits up and gets to his feet; the winner (`We`) finds his feet and raises a fist;
 * then back to their marks, the bow, the winner squatting for his prize (three chops of the hand), and back to the
 * corners. Returns [winner, loser].
 */
export function aftermath(c: Ctx, u: number, len: number, We: At, Le: At, front = false): [At, At] {
  const W: At = { ...We }, L: At = { ...Le };
  // (down as the move left him: on his back, his front, or a crab on his shell, at his own height off the clay)
  const down = Le.p, crabW = c.kind === 'crab' && c.w === 1, crabL = c.kind === 'crab' && c.l === 1;
  // the loser: down a moment, then sits up, gets his feet under him and pushes himself up
  L.air = Le.air * (1 - ease(seg(u, 0.6, 1.0)));
  // (face down, he pushes himself up straight onto his feet; on his back, he sits up first)
  L.p = u < 0.6 ? down
    : front ? (u < 1.25 ? mixPose(down, GETUP, ease(seg(u, 0.6, 1.25))) : mixPose(GETUP, STAND, ease(seg(u, 1.25, UP))))
    : u < 1.0 ? mixPose(down, SIT, ease(seg(u, 0.6, 1.0))) : u < 1.25 ? mixPose(SIT, GETUP, ease(seg(u, 1.0, 1.25))) : mixPose(GETUP, STAND, ease(seg(u, 1.25, UP)));
  // the winner: finds his feet, and raises a fist
  W.air = We.air * (1 - ease(seg(u, 0, 0.3)));
  W.p = u < 0.4 ? mixPose(We.p, STAND, ease(seg(u, 0, 0.4))) : u < 1.2 ? mixPose(STAND, FIST, ease(seg(u, 0.45, 0.7))) : mixPose(FIST, STAND, ease(seg(u, 1.2, UP)));
  if (u <= UP) return [W, L];
  // then back to their marks, the bow, the prize, the corners
  const v = 1.7 + (u - UP) * (5.3 / Math.max(0.6, len - UP));
  const W1 = { ...W, p: STAND }, L1 = { ...L, p: STAND };
  const wm = (c.w ? -1 : 1) * MARK, lm = (c.l ? -1 : 1) * MARK, wc = (c.w ? -1 : 1) * c.ring.corner, lc = (c.l ? -1 : 1) * c.ring.corner;
  W.p = STAND; L.p = STAND;
  if (v < 3.2) {
    walkTo(W, W1, wm, 0, seg(v, 1.7, 2.9), crabW);
    walkTo(L, L1, lm, 0, seg(v, 2.0, 3.2), crabL);
    if (v > 2.9) W.yaw = face(c.w);
    if (v >= 3.2) L.yaw = face(c.l);
  } else if (v < 4.1) {
    W.x = wm; L.x = lm; W.z = L.z = 0; W.yaw = face(c.w); L.yaw = face(c.l);
    const b = Math.sin(((v - 3.2) / 0.9) * Math.PI); W.p = mixPose(STAND, BOW, b); L.p = mixPose(STAND, BOW, b);
  } else {
    W.x = wm; W.z = L.z = 0; W.yaw = face(c.w);
    const u2 = v - 4.1, n = Math.min(2, Math.max(0, Math.floor((u2 - 0.6) / 0.4))), chop = Math.max(0, Math.sin(((u2 - 0.6 - n * 0.4) / 0.35) * Math.PI));
    W.p = u2 < 1.9 ? { ...mixPose(STAND, SQUAT, ease(clamp01(u2 / 0.5))), ...(u2 > 0.6 && u2 < 1.8 ? { a0x: 1.25 + chop * 0.2, a0z: [0.45, 0, -0.45][n], a0e: 0.1 } : {}) } : mixPose(SQUAT, STAND, ease(clamp01((u2 - 1.9) / 0.4)));
    if (u2 > 2.3) walkTo(W, { ...W, x: wm, z: 0 }, wc, 0, clamp01((u2 - 2.3) / 0.6), crabW);
    walkTo(L, { ...L, x: lm, z: 0 }, lc, 0, clamp01(u2 / 1.4), crabL);
  }
  return [W, L];
}
