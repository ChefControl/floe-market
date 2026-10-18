// The sparring partner's finishers (stage 3): the practice fight before the first boss, a plain man like the champion,
// so real sumo, and the most believable of all. Utchari, both ways: the man driven back to his own straw sinks, gets
// his belly under the other, lifts him onto it by the belt, both men gripping, arches back and pivots on his heels,
// swinging him round and out over the straw, and nearly goes out after him. Oshidashi: no belt, hands to the chest,
// thrust after thrust, the champion's feet scraping back over his straw till he goes off the mound. The belt throw
// (uwatenage): the champion's arm over, on the far side of the belt, a step back and a pivot, wheeling him over onto
// his back. And the epic: the same throw as a training montage's finale, a giant swing.
import {
  type At, clamp01, crossed, type Ctx, ease, easeIn, easeOut, type FinishMove, fly, type Frame, hipsAt, lerp,
  seg, type V3, warp,
} from '../finishRig';
import { BRACE, GRIP, LIE, SHIKO_LOW, shikoUp, STAND, steps, teeter } from '../poses';
import { ANKLE, mixPose, type Pose, pose, SHIN, THIGH } from '../rikishi';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';

/** A point `fwd` ahead of `p` the way `yaw` faces, `side` to his left, `up` over it. */
const ahead = (p: V3, yaw: number, fwd: number, up = 0, side = 0): V3 =>
  [p[0] + Math.sin(yaw) * fwd + Math.cos(yaw) * side, p[1] + up, p[2] + Math.cos(yaw) * fwd - Math.sin(yaw) * side];
/** The real time a move's clock (`tau`) reaches `T`. */
const realAt = (tau: (t: number) => number, T: number) => { let t = 0; while (tau(t) < T && t < 20) t += 1 / 240; return +t.toFixed(3); };
/** Where a point on his upper body is (in his spine's own space, as rikishi.ts builds him: the chest's middle is
 *  0.5 up it) when he's at `s`, worked out as the model's apply() sets the bones. */
const SCALE = 0.92;
const M = () => new Matrix4();
const Rm = (x: number, y: number, z: number) => M().makeRotationFromEuler(new Euler(x, y, z));
const Tm = (x: number, y: number, z: number) => M().makeTranslation(x, y, z);
function bodyPt(s: At, ring: { ground: (x: number, z?: number) => number }, local: V3): V3 {
  const p = s.p, tilt = Math.max(-0.3, Math.min(0.55, p.bend * 0.5)), lean = p.side * 0.4, turn = p.twist * 0.4;
  let drop = 0;
  for (const [x, z, k] of [[p.l0x, p.l0z, p.l0k], [p.l1x, p.l1z, p.l1k]]) drop = Math.max(drop, (THIGH * Math.cos(x) + SHIN * Math.cos(x - k)) * Math.cos(z) + ANKLE);
  const wide = 1 + (1 - p.sq) * 0.6;
  const m = Tm(s.x, ring.ground(s.x, s.z) + s.air, s.z).multiply(Rm(0, s.yaw, 0)).multiply(M().makeScale(SCALE, SCALE, SCALE))
    .multiply(Tm(0, p.up, 0)).multiply(Rm(p.pitch, 0, p.roll)).multiply(M().makeScale(wide, p.sq, wide))
    .multiply(Tm(0, drop + (0.21 - drop) * p.seat, 0)).multiply(Rm(tilt, turn, lean))
    .multiply(Tm(0, 0.07, 0)).multiply(Rm(p.bend - tilt, p.twist - turn, p.side - lean));
  const v = new Vector3(...local).applyMatrix4(m);
  return [v.x, v.y, v.z];
}
/** A body's turn as one rotation (its yaw, then its pitch and roll about his feet, as the model sets them), and back. */
const orient = (yaw: number, pitch: number, roll: number) => new Quaternion().setFromEuler(new Euler(pitch, yaw, roll, 'YXZ'));
const deorient = (q: Quaternion) => { const e = new Euler().setFromQuaternion(q, 'YXZ'); return { yaw: e.y, pitch: e.x, roll: e.z }; };
/** Turned `k` of the way from one way of lying (or standing) to another, the shortest way round. */
const turnBetween = (a: { yaw: number; pitch: number; roll: number }, b: { yaw: number; pitch: number; roll: number }, k: number) =>
  deorient(orient(a.yaw, a.pitch, a.roll).slerp(orient(b.yaw, b.pitch, b.roll), k));
const mk = (x: number, z: number, yaw: number, p: Pose, air = 0): At => ({ x, z, yaw, p, air });

// ---------- UTCHARI: the backward pivot throw at the straw ----------
/** The man at the straw, sunk under the other: knees deep, his belly forward under the other's. */
const U_SINK = { ...GRIP, l0x: 0.85, l1x: 0.85, l0k: 1.45, l1k: 1.45, l0z: 0.55, l1z: 0.55, bend: 0.25, head: -0.15, side: 0.3, twist: 0, pitch: 0 };
/** Up through his legs and arched back, the other on his belly, his heels on the straw. */
const U_ARCH = pose({ l0x: 0.3, l1x: 0.3, l0k: 0.4, l1k: 0.4, l0z: 0.5, l1z: 0.5, bend: -0.12, head: -0.45, pitch: -0.3, side: 0.3 });
/** The man lifted: leaning onto the other's belly, his legs hanging. */
const U_LIFTED = { ...BRACE, pitch: 0.12, bend: 0.5, head: -0.1, side: 0.15, twist: 0, l0x: -0.1, l0k: 0.75, l1x: 0.15, l1k: 0.5, l0z: 0.3, l1z: 0.3 };
/** Flung off: falling back, his arms thrown out. */
const U_FLUNG = { ...U_LIFTED, pitch: -0.6, bend: 0.1, head: 0.3, l0x: 0.7, l0k: 0.5, l1x: 0.4, l1k: 0.3, a0x: 2.4, a0z: 1.2, a1x: 2.2, a1z: 1.1, a0e: 0.2, a1e: 0.2 };

/** The utchari's clock: slowed for the pivot and the release. */
const uTau = (t: number) => warp(t, [[0.9, 0.45], [2.55, 1]]);
const U = { PRESS: 0.35, LIFT: 0.8, TURN: 1.9, REL: 1.38, FLY: 0.4, TH: 2.5 };
/** He's down (on the move's clock): let go, and his flight. */
const U_LANDS = U.REL + U.FLY;
/** How far apart their hips are, pressed at the straw and with him up on the other's belly (of c.D), and how high. */
const UPF = 0.8, UF = 0.76, UP = 0.32;

function utchari(c: Ctx): Frame {
  const T = uTau(c.t), s = -c.lSide;
  const zk = 1 - ease(seg(c.t, 0, 0.4));
  // he gives the last inch: his heels back on the straw (and as he turns his feet stay inside: he steps in off the straw as his stance comes round across it)
  const wxAt = (yaw: number) => lerp(c.W0.x, s * Math.min(c.ring.r - 0.18, c.ring.r + 0.06 - 0.44 * Math.abs(Math.cos(yaw))), ease(seg(T, 0, U.PRESS)));
  const wz = c.W0.z * zk;
  // the pivot: on his heels, swinging the other round to the south (towards the camera), on and past the release
  const th = U.TH * ease(seg(T, U.LIFT, U.TURN)), yaw0 = c.W0.yaw;
  const yawW = yaw0 + s * th, wx = wxAt(yawW);
  // his pose: sinks, then up through his legs, arching back; after the release, carried round, off balance
  const sink = ease(seg(T, 0.05, U.PRESS)), lift = ease(seg(T, U.PRESS, U.LIFT));
  let wp: Pose = mixPose(mixPose(c.W0.p, U_SINK, sink), U_ARCH, lift);
  if (T > U.LIFT && T < U.TURN) wp = steps(wp, 2 * Math.PI * seg(T, U.LIFT, U.TURN), 0.14);
  if (T > U.REL) {
    const k = seg(T, U.REL, U.REL + 0.6);
    wp = mixPose(wp, teeter(T), ease(k));
  }
  const W = mk(wx, wz, yawW, wp);
  const wh = hipsAt(W, c.ring);
  // the other man: pressed, then lifted on his belly, carried round on it
  const l0h = hipsAt(c.L0, c.ring), w0h = hipsAt(c.W0, c.ring);
  const d0 = Math.hypot(l0h[0] - w0h[0], l0h[2] - w0h[2]), h0 = l0h[1] - w0h[1];
  const fwd = lerp(lerp(d0, UPF * c.D, ease(seg(T, 0, 0.2))), UF * c.D, lift), up = lerp(h0, UP, lift);
  const lp = mixPose(mixPose(c.L0.p, { ...BRACE, bend: 0.5, pitch: 0.05, side: 0.15, twist: 0, head: -0.1 }, sink), U_LIFTED, lift);
  const f: Frame = { W, L: mk(c.L0.x, c.L0.z * zk, yawW + Math.PI, lp), grip: ease(seg(c.t, 0.04, 0.24)), hold: ease(seg(c.t, 0.04, 0.24)) };
  const held = (T2: number) => {
    const th2 = U.TH * ease(seg(T2, U.LIFT, U.TURN)), y2 = yaw0 + s * th2;
    const W2 = mk(wxAt(y2), wz, y2, mixPose(mixPose(c.W0.p, U_SINK, 1), U_ARCH, 1));
    return ahead(hipsAt(W2, c.ring), y2, UF * c.D, UP);
  };
  if (T < U.REL) {
    f.lHips = ahead(wh, yawW, fwd, up);
    // his legs swing out as he's carried round
    const sw = Math.sin(Math.PI * seg(T, U.LIFT, U.REL));
    f.L.p = { ...lp, l0x: lp.l0x - 0.3 * sw, l1x: lp.l1x - 0.15 * sw, roll: s * 0.15 * sw };
  } else {
    // let go: he's flung on round, falling back, and down on his back outside the straw
    const p0 = held(U.REL), v = [(held(U.REL + 0.01)[0] - p0[0]) / 0.01, 0, (held(U.REL + 0.01)[2] - p0[2]) / 0.01];
    const yr = yaw0 + s * U.TH * ease(seg(U.REL, U.LIFT, U.TURN)) + Math.PI;
    const landYaw = yr + s * 0.45;
    // where he comes down: on the way he was flung, kept on the ring's top
    let lx = p0[0] + v[0] * U.FLY, lz = p0[2] + v[2] * U.FLY;
    const lim = c.ring.half - 0.55;
    lx = Math.max(-lim, Math.min(lim, lx)); lz = Math.max(-lim, Math.min(lim, lz));
    // (his feet, the At's x and z, are behind his hips as he lies: put the hips there)
    const landAt = mk(0, 0, landYaw, LIE);
    const hz = hipsAt(landAt, c.ring);
    landAt.x = lx - hz[0]; landAt.z = lz - hz[2];
    const p1 = hipsAt(landAt, c.ring);
    if (T < U_LANDS) {
      const k = (T - U.REL) / U.FLY;
      f.lHips = fly(p0, p1, U.FLY, T - U.REL, 9.8);
      f.L = { ...landAt, yaw: lerp(yr, landYaw, k), p: LIE };
      f.L.p = k < 0.5 ? mixPose(U_LIFTED, U_FLUNG, ease(k * 2)) : mixPose(U_FLUNG, LIE, ease(k * 2 - 1));
      f.grip = 1 - ease(seg(k, 0, 0.35)); f.hold = 1 - ease(seg(k, 0, 0.25));
    } else {
      const b = T - U_LANDS;
      f.L = { ...landAt, p: b < 0.14 ? { ...LIE, sq: 1 - 0.16 * Math.sin((b / 0.14) * Math.PI) } : LIE, air: b < 0.22 ? 0.06 * Math.sin((b / 0.22) * Math.PI) : 0 };
      f.grip = 0; f.hold = 0;
    }
    // the winner, turned on past it, teeters on the straw and catches himself, and steps back in
    const tt = seg(T, U.REL, U.REL + 1.3);
    const out = Math.sin(Math.PI * Math.min(1, tt * 1.4));
    W.x = wx + s * 0.04 * out;
    if (tt > 0.55) W.p = mixPose(teeter(T), { ...STAND, bend: 0.25, l0z: 0.3, l1z: 0.3 }, ease(seg(tt, 0.55, 1)));
    // (leaning out over the straw, and back)
    W.p = { ...W.p, pitch: W.p.pitch + 0.16 * out };
  }
  return f;
}
const uBeats = (_c: Ctx, fx: import('../finishRig').Fx, t0: number, t1: number) => {
  const a = uTau(t0), b = uTau(t1);
  if (crossed(a, b, 0.2)) { fx.dust(fx.at('W', 'foot0'), 4, 0.6); fx.dust(fx.at('W', 'foot1'), 4, 0.6); fx.react('edge'); }
  if (crossed(a, b, U.PRESS + 0.05)) { fx.kick('W', 2.5); fx.kick('L', 2); }
  if (crossed(a, b, U.LIFT)) fx.hit(0, 0, 1.1);
  if (crossed(a, b, U.REL)) { fx.kick('L', 3); fx.react('upset'); }
  if (crossed(a, b, U.REL + 0.5)) fx.dust(fx.at('W', 'foot0'), 5, 0.7);
};
/** Both ways: the partner's tight win and the champion's. */
const utchariMove: FinishMove = { lands: realAt(uTau, U_LANDS), done: 3.9, frame: utchari, beats: uBeats };

// ---------- OSHIDASHI: the frontal push-out, no belt ----------
/** The pusher, low, his weight on the front foot; his hands are put on the other's chest by `reach`. */
const O_PUSH = pose({ l0x: 0.85, l0z: 0.4, l0k: 1.05, l1x: -0.35, l1z: 0.32, l1k: 0.2, bend: 0.62, head: -0.35, a0x: 1.3, a0z: -0.1, a0e: 0.5, a1x: 1.3, a1z: -0.1, a1e: 0.5 });
/** The man pushed, upright, his heels dug in, his hands up at the other's arms. */
const O_TAKE = pose({ l0x: 0.45, l0z: 0.5, l0k: 0.75, l1x: 0.3, l1z: 0.5, l1k: 0.6, bend: 0.25, head: 0.05, pitch: -0.08, a0x: 1.2, a0z: 0.25, a0e: 1.1, a1x: 1.1, a1z: 0.3, a1e: 1.2 });
/** The cocked arm, drawn back for the next thrust. */
const cock = (p: Pose, i: number, k: number): Pose => (i ? { ...p, a1x: lerp(p.a1x, 0.75, k), a1z: lerp(p.a1z, 0.25, k), a1e: lerp(p.a1e, 1.7, k) } : { ...p, a0x: lerp(p.a0x, 0.75, k), a0z: lerp(p.a0z, 0.25, k), a0e: lerp(p.a0e, 1.7, k) });
/** The thrusts (on the move's clock) and the hand each is with: left, right, left; then both, the last one. */
const O_HITS: [number, number][] = [[0.34, 1], [0.62, 0], [0.9, 1]];
const O_LAST = 1.22, O_SLIDE = 0.15, O_GO = 0.8, O_FALL = 0.36;
const oTau = (t: number) => warp(t, [[1.2, 0.5], [1.5, 1]]);
const O_LANDS = O_LAST + O_GO + O_FALL;

function oshidashi(c: Ctx): Frame {
  const T = oTau(c.t), dir = c.lSide, zk = 1 - ease(seg(c.t, 0, 0.4)), z = c.L0.z * zk;
  const fL = c.L.f;
  // the champion's heels scrape back an inch at every thrust, and he's shoved off at the last
  let lx = c.L0.x;
  for (const [h] of O_HITS) lx += dir * O_SLIDE * easeOut(seg(T, h, h + 0.2));
  lx += dir * O_SLIDE * 1.2 * easeOut(seg(T, O_LAST, O_LAST + 0.12));
  const lxPush = lx, u = Math.max(0, T - O_LAST - 0.12), go = Math.min(u, O_GO);
  // (staggering back, across the top and down the pallet's steps, slowing)
  lx += dir * (2.3 * go - 0.4 * go * go);
  const lyaw = c.L0.yaw;
  // his body jolts back at each hit, and recovers
  let jolt = 0;
  for (const [h] of O_HITS) jolt += Math.sin(Math.PI * seg(T, h, h + 0.22));
  let lp: Pose = mixPose(c.L0.p, O_TAKE, ease(seg(T, 0, 0.25)));
  lp = { ...lp, pitch: lp.pitch - 0.12 * jolt, head: lp.head + 0.25 * jolt };
  const scrape = (ph: number) => steps(lp, ph, 0.08);
  for (const [h] of O_HITS) if (T > h && T < h + 0.2) lp = scrape(Math.PI * 2 * seg(T, h, h + 0.2));
  const L = mk(lx, z, lyaw, lp);
  // the pusher: an arm's length off, following him in a step at every thrust
  const gap = c.D;
  const W = mk(lxPush - dir * gap, c.W0.z * zk, c.W0.yaw, mixPose(c.W0.p, O_PUSH, ease(seg(T, 0, 0.2))));
  W.x = lerp(c.W0.x, W.x, ease(seg(T, 0, 0.2)));
  const f: Frame = { W, L, grip: 0, hold: 0, reach: [] };
  const ks = [ease(seg(T, 0.04, 0.2)), ease(seg(T, 0.04, 0.2))];
  for (const [h, i] of O_HITS) {
    const back = ease(seg(T, h - 0.2, h - 0.08)) * (1 - ease(seg(T, h - 0.06, h)));
    ks[i] = Math.min(ks[i], 1 - back);
    W.p = cock(W.p, i, back);
    if (T > h - 0.1 && T < h + 0.2) W.p = steps(W.p, Math.PI * seg(T, h - 0.1, h + 0.2) * (i ? -1 : 1), 0.12);
  }
  if (T > O_LAST - 0.1) {
    // he follows it through, a step on towards his straw, his arms out after him; and stops there
    const k = seg(T, O_LAST - 0.1, O_LAST + 0.6);
    W.x = lerp(W.x, dir * (c.ring.r - 0.45), easeOut(k));
    W.p = mixPose(W.p, steps({ ...O_PUSH, a0x: 1.55, a1x: 1.55, a0e: 0.1, a1e: 0.1, a0z: -0.05, a1z: -0.05 }, Math.PI * 2 * k, 0.15), ease(seg(T, O_LAST - 0.1, O_LAST + 0.05)));
    W.p = mixPose(W.p, { ...STAND, bend: 0.3, head: -0.1, l0z: 0.3, l1z: 0.3, a0x: 0.4, a1x: 0.4 }, ease(seg(T, O_LAST + 0.7, O_LAST + 1.4)));
  }
  // the last: both hands drawn back, and in under his arms; then he's gone off them
  const back = ease(seg(T, O_LAST - 0.18, O_LAST - 0.08)) * (1 - ease(seg(T, O_LAST - 0.06, O_LAST)));
  W.p = cock(cock(W.p, 0, back * 0.7), 1, back * 0.7);
  const off = ease(seg(T, O_LAST + 0.12, O_LAST + 0.24));
  for (const i of [0, 1]) ks[i] = Math.min(ks[i], 1 - back * 0.7, 1 - off);
  // where on his chest: the pecs for the thrusts, under his arms for the last
  const tgt = (i: number): V3 => {
    const last = T > O_LAST - 0.08;
    const side = (i ? 1 : -1) * (last ? 0.38 : 0.2) * fL;
    return bodyPt(L, c.ring, [side, last ? 0.4 : 0.48, (last ? 0.22 : 0.33) * fL]);
  };
  // the stagger and the fall
  if (u > 0) {
    const sk = Math.min(1, go / O_GO);
    L.p = mixPose(lp, { ...pose(), bend: 0.05, head: 0.35, pitch: -0.2, ...arms(T) }, ease(seg(u, 0, 0.15)));
    const legs = mixPose(L.p, walkBack(go), ease(seg(u, 0, 0.1)) * (1 - ease(seg(sk, 0.85, 1))));
    L.p = { ...L.p, l0x: legs.l0x, l0k: legs.l0k, l1x: legs.l1x, l1k: legs.l1k, l0z: legs.l0z, l1z: legs.l1z };
    if (u > O_GO) {
      // over backwards, about his feet, as a tree falls; down on his back, a bounce
      const k = (u - O_GO) / O_FALL;
      L.x += dir * 0.35 * easeOut(Math.min(1, k));
      if (k < 1) L.p = mixPose(L.p, LIE, easeIn(k));
      else {
        const b = u - O_GO - O_FALL;
        L.p = b < 0.14 ? { ...LIE, sq: 1 - 0.16 * Math.sin((b / 0.14) * Math.PI) } : LIE;
        L.air = b < 0.22 ? 0.05 * Math.sin((b / 0.22) * Math.PI) : 0;
      }
    }
  }
  for (const i of [0, 1] as const) if (ks[i] > 0) f.reach!.push(['W', i, tgt(i), ks[i]]);
  return f;
}
/** Arms thrown up, flailing for balance. */
const arms = (T: number) => ({ a0x: 2.2 + Math.sin(T * 15) * 0.5, a0z: 1.0, a0e: 0.3, a1x: 2.0 + Math.cos(T * 15) * 0.5, a1z: 1.0, a1e: 0.3 });
/** Stepping backwards, `d` metres gone. */
const walkBack = (d: number) => {
  const ph = -Math.PI * d / 0.42, s = Math.sin(ph);
  return pose({ l0x: s * 0.4, l0k: Math.max(0, s) * 0.5 + 0.15, l1x: -s * 0.4, l1k: Math.max(0, -s) * 0.5 + 0.15, l0z: 0.3, l1z: 0.3, bend: 0.05, pitch: -0.2, head: 0.35 });
};
const oBeats = (_c: Ctx, fx: import('../finishRig').Fx, t0: number, t1: number) => {
  const a = oTau(t0), b = oTau(t1);
  for (const [h] of O_HITS) {
    if (crossed(a, b, h)) { fx.kick('L', 3); fx.react('edge'); fx.hit(0.08, 0, 0.3); }
    if (crossed(a, b, h + 0.08)) { fx.dust(fx.at('L', 'foot0'), 4, 0.7); fx.dust(fx.at('L', 'foot1'), 4, 0.7); }
  }
  if (crossed(a, b, O_LAST)) { fx.kick('L', 6); fx.kick('W', 2); fx.hit(0.2, 0, 1.0); fx.react('upset'); }
  for (let s = O_LAST + 0.3; s < O_LAST + O_GO; s += 0.2) if (crossed(a, b, s)) fx.dust(fx.at('L', 'foot0'), 3, 0.5);
};
const oshidashiMove: FinishMove = { lands: realAt(oTau, O_LANDS), done: 0, frame: oshidashi, beats: oBeats };
oshidashiMove.done = Math.min(4.1, oshidashiMove.lands + 0.8);


// ---------- BELT THROW (uwatenage): the overarm throw ----------
/** The thrower, sunk, his weight back. */
const T_SINK = pose({ l0x: 0.7, l0z: 0.55, l0k: 1.25, l1x: 0.7, l1z: 0.55, l1k: 1.25, bend: 0.35, head: -0.2, side: 0.12 });
/** Turning: his left leg stepped back, low, his shoulder driving down and round. */
const T_TURN = pose({ l0x: -0.25, l0z: 0.45, l0k: 0.55, l1x: 0.85, l1z: 0.5, l1k: 1.3, bend: 0.55, head: -0.3, side: 0.3, twist: 0.35 });
/** Down after him, on a knee nearly. */
const T_LOW = pose({ l0x: 0.2, l0z: 0.55, l0k: 1.5, l1x: 1.2, l1z: 0.5, l1k: 1.7, bend: 0.75, head: -0.4, side: 0.15 });
/** The man thrown: pulled forward off his feet. */
const T_PULLED = { ...BRACE, bend: 0.55, pitch: 0.1, head: -0.35, side: 0.15, twist: 0 };
/** Over in the air: legs coming over, arms out. */
const T_OVER = pose({ l0x: 1.1, l0k: 0.6, l1x: 0.7, l1k: 0.4, l0z: 0.35, l1z: 0.35, bend: 0.35, head: 0.2, a0x: 2.4, a0z: 1.1, a1x: 2.0, a1z: 1.3, a0e: 0.3, a1e: 0.3, seat: 0.5 });
const B = { SET: 0.3, WIND: 0.55, TURN: 1.2, FALL: 0.42, TH: 2.0 };
const bTau = (t: number) => warp(t, [[1.0, 0.45], [2.4, 1]]);
const B_LANDS = B.TURN + B.FALL;

function beltThrow(c: Ctx): Frame {
  const T = bTau(c.t), dir = c.lSide, zk = 1 - ease(seg(c.t, 0, 0.4));
  // the turn: a little the other way first (the wind-up), then round to his left, his left foot stepping back
  const th = -0.15 * Math.sin(Math.PI * seg(T, B.SET, B.WIND + 0.1)) + B.TH * ease(seg(T, B.WIND, B.TURN + 0.25));
  const yawW = c.W0.yaw + th;
  const back = 0.28 * ease(seg(T, B.WIND, B.TURN));
  // (back, away from him: his root goes the other way from the loser, and a little to the south as he turns)
  const W = mk(c.W0.x - dir * back, c.W0.z * zk + 0.12 * ease(seg(T, B.WIND, B.TURN)), yawW, STAND);
  let wp = mixPose(c.W0.p, T_SINK, ease(seg(T, 0, B.WIND)));
  wp = mixPose(wp, T_TURN, ease(seg(T, B.WIND, B.TURN - 0.15)));
  wp = mixPose(wp, T_LOW, ease(seg(T, B.TURN - 0.2, B.TURN + 0.2)));
  if (T > B.WIND && T < B.TURN) wp = steps(wp, Math.PI * seg(T, B.WIND, B.WIND + 0.4), 0.18);
  W.p = wp;
  // after: he comes up out of it, watching him
  if (T > B_LANDS) W.p = mixPose(T_LOW, { ...STAND, bend: 0.2, l0z: 0.35, l1z: 0.35, head: 0.1 }, ease(seg(T, B_LANDS + 0.1, B_LANDS + 0.8)));
  const wh = hipsAt(W, c.ring);
  // the thrown man: in close, then hauled round on the end of the arm, stumbling, and over
  const l0h = hipsAt(c.L0, c.ring), w0h = hipsAt(c.W0, c.ring);
  const d0 = Math.hypot(l0h[0] - w0h[0], l0h[2] - w0h[2]);
  const lag = 0.25 * Math.sin(Math.PI * seg(T, B.WIND, B.TURN));
  const ly = yawW + lag + Math.PI;
  const distAt = (T2: number) => lerp(lerp(d0, 0.84 * c.D, ease(seg(T2, 0, B.SET))), 0.78 * c.D, ease(seg(T2, B.WIND, B.TURN)));
  const dist = distAt(T);
  const pulled = ease(seg(T, B.WIND, B.TURN));
  const lift = 0.16 * ease(seg(T, B.TURN - 0.35, B.TURN));
  let lp = mixPose(c.L0.p, { ...BRACE, bend: 0.5, side: 0.15, twist: 0 }, ease(seg(T, 0, B.SET)));
  lp = mixPose(lp, T_PULLED, pulled);
  if (T > B.WIND && T < B.TURN) lp = steps(lp, 3 * Math.PI * seg(T, B.WIND, B.TURN), 0.22 * (1 - lift / 0.16));
  const f: Frame = {
    W, L: mk(c.L0.x, c.L0.z * zk, ly, lp),
    grip: ease(seg(c.t, 0.04, 0.24)), hold: ease(seg(c.t, 0.04, 0.24)) * (1 - ease(seg(T, B.TURN - 0.4, B.TURN - 0.15))),
  };
  const held = (T2: number) => {
    const th2 = -0.15 * Math.sin(Math.PI * seg(T2, B.SET, B.WIND + 0.1)) + B.TH * ease(seg(T2, B.WIND, B.TURN + 0.25)), y2 = c.W0.yaw + th2;
    const lag2 = 0.25 * Math.sin(Math.PI * seg(T2, B.WIND, B.TURN));
    const W2 = mk(c.W0.x - dir * 0.28 * ease(seg(T2, B.WIND, B.TURN)), c.W0.z * zk + 0.12 * ease(seg(T2, B.WIND, B.TURN)), y2, W.p);
    return ahead(hipsAt(W2, c.ring), y2 + lag2, distAt(T2), 0.16 * ease(seg(T2, B.TURN - 0.35, B.TURN)));
  };
  if (T < B.TURN) {
    f.lHips = ahead(wh, yawW + lag, dist, lift);
    f.L.p = { ...lp, pitch: lp.pitch + 0.45 * pulled, head: lp.head - 0.2 * pulled };
  } else {
    // wheeled over: thrown on round past him and down, turning over onto his back
    const p0 = held(B.TURN);
    const fromO = { yaw: ly, pitch: T_PULLED.pitch + 0.45, roll: 0 };
    // (where he lands: on round from where he was let go, lying along the way he was going, his head on ahead)
    const yr = yawW + lag;
    const headDir = yr + Math.PI / 2 * 1.1;
    const landYaw = headDir + Math.PI;
    const land = mk(0, 0, landYaw, LIE);
    const hz = hipsAt(land, c.ring);
    const spot = ahead(wh, yr + 0.5, 1.15, 0);
    land.x = spot[0] - hz[0]; land.z = spot[2] - hz[2];
    const p1 = hipsAt(land, c.ring);
    const toO = { yaw: landYaw, pitch: LIE.pitch, roll: 0 };
    if (T < B_LANDS) {
      const k = (T - B.TURN) / B.FALL, o = turnBetween(fromO, toO, ease(k));
      f.lHips = fly(p0, p1, B.FALL, T - B.TURN);
      const pp = k < 0.5 ? mixPose(T_PULLED, T_OVER, ease(k * 2)) : mixPose(T_OVER, LIE, ease(k * 2 - 1));
      f.L = { ...land, yaw: o.yaw, p: { ...pp, pitch: o.pitch, roll: o.roll } };
      f.grip = 1 - ease(seg(k, 0.55, 0.95)); f.hold = 0;
    } else {
      const b = T - B_LANDS;
      f.L = { ...land, p: b < 0.14 ? { ...LIE, sq: 1 - 0.16 * Math.sin((b / 0.14) * Math.PI) } : LIE, air: b < 0.22 ? 0.05 * Math.sin((b / 0.22) * Math.PI) : 0 };
      f.grip = 0; f.hold = 0;
    }
  }
  return f;
}
const bBeats = (_c: Ctx, fx: import('../finishRig').Fx, t0: number, t1: number) => {
  const a = bTau(t0), b = bTau(t1);
  if (crossed(a, b, B.WIND)) { fx.kick('W', 2); fx.react('edge'); }
  if (crossed(a, b, B.WIND + 0.3)) { fx.dust(fx.at('W', 'foot0'), 5, 0.8); fx.dust(fx.at('L', 'foot1'), 4, 0.6); }
  if (crossed(a, b, B.TURN - 0.1)) { fx.hit(0, 0, 1.1); fx.react('upset'); fx.kick('L', 3); }
};
const beltThrowMove: FinishMove = { lands: realAt(bTau, B_LANDS), done: 0, frame: beltThrow, beats: bBeats };
beltThrowMove.done = Math.min(4.1, beltThrowMove.lands + 1.0);


// ---------- the epic: the belt throw as a training montage's finale ----------
// He lifts him by the belt, presses him up over his head, flat, and spins with him up there, once, twice, the man
// wheeling round overhead like a propeller; dips, and hurls him straight up at the beams, turning over and over, hung
// at the top in slow motion; down he comes into the middle of the ring, and the champion stamps the clay as he hits.
/** The spinner: up tall under him, arms up, knees soft. */
const X_SPIN = pose({ l0x: 0.35, l0z: 0.5, l0k: 0.6, l1x: 0.35, l1z: 0.5, l1k: 0.6, bend: 0.0, head: -0.35, pitch: -0.05 });
/** The man overhead: stretched out flat on the air, arms and legs flung wide. */
const X_FLAG = pose({ l0x: -0.1, l0k: 0.15, l1x: 0.1, l1k: 0.25, l0z: 0.35, l1z: 0.3, bend: -0.15, head: -0.3, a0x: 1.5, a0z: 1.35, a0e: 0.2, a1x: 1.6, a1z: 1.3, a1e: 0.2 });
/** Tumbling in the air. */
const X_TUMBLE = pose({ l0x: 0.9, l0k: 1.2, l1x: 0.6, l1k: 1.4, l0z: 0.4, l1z: 0.4, bend: 0.6, head: 0.3, a0x: 2.2, a0z: 1.0, a0e: 0.9, a1x: 2.0, a1z: 1.1, a1e: 0.9 });
/** On the move's clock: the grip, the lift, the press overhead, the spin (with the dip at its end), the flight. */
const X = { SET: 0.3, LIFT: 0.7, PRESS: 1.2, SWING: 2.65, TURNS: 2, UP: 1.37, FWD: 0.05, UPV: 8.6, FLY: 1.92, FLAT: 1.45 };
const X_LAND = X.SWING + X.FLY;
/** Slowed to a crawl at the top of his flight, then faster than life down into the clay. */
const xTau = (t: number) => warp(t, [[X.SWING + 0.55, 0.3], [X.SWING + 0.55 + 1.6, 1.35]]);
const X_LANDS = realAt(xTau, X_LAND);
/** After he lands: the frozen beat (real seconds), then the clock runs on. */
const X_FREEZE = 0.4;
const xClock = (t: number) => (t < X_LANDS ? xTau(t) : t < X_LANDS + X_FREEZE ? X_LAND : X_LAND + (t - X_LANDS - X_FREEZE));
/** How far round he's spun by `T`: gathering speed, the last of it slower as he dips for the throw. */
const xSpun = (T: number) => {
  const k = seg(T, X.PRESS, X.SWING);
  return Math.PI * 2 * X.TURNS * (k < 0.7 ? easeIn(k / 0.7) * 0.75 : 0.75 + 0.25 * easeOut((k - 0.7) / 0.3));
};

function giantSwing(c: Ctx): Frame {
  const T = xClock(c.t), dir = c.lSide, zk = 1 - ease(seg(c.t, 0, 0.4));
  const yawW = c.W0.yaw + xSpun(T);
  // the champion: sinks, lifts, stands tall under him; spins on his feet (two steps a turn); dips, and throws
  const wpAt = (T2: number) => {
    let p = mixPose(c.W0.p, { ...U_SINK, side: 0.1, twist: 0 }, ease(seg(T2, 0, X.SET)));
    p = mixPose(p, X_SPIN, ease(seg(T2, X.SET + 0.1, X.PRESS)));
    // (bent in over him while the belt's below his shoulders, straightening as it comes up past them)
    p = { ...p, bend: p.bend + 0.55 * ease(seg(T2, X.SET, X.LIFT)) * (1 - ease(seg(T2, X.LIFT + 0.1, X.PRESS))) };
    const dip = Math.sin(Math.PI * seg(T2, X.SWING - 0.4, X.SWING + 0.05));
    if (T2 < X.SWING) p = { ...p, l0x: p.l0x + 0.45 * dip, l1x: p.l1x + 0.45 * dip, l0k: p.l0k + 0.9 * dip, l1k: p.l1k + 0.9 * dip };
    return p;
  };
  let wp = wpAt(T);
  if (T > X.PRESS && T < X.SWING) wp = steps(wp, xSpun(T) * 2, 0.15);
  // (after the throw: stretched up after him, up on his toes, his arms up)
  if (T > X.SWING) wp = mixPose(wp, { ...X_SPIN, l0k: 0.1, l1k: 0.1, l0x: 0.05, l1x: 0.05, pitch: -0.12, head: -0.6, a0x: 2.9, a1x: 2.9, a0z: 0.25, a1z: 0.25, a0e: 0.05, a1e: 0.05 }, ease(seg(T, X.SWING, X.SWING + 0.2)));
  const W = mk(c.W0.x, c.W0.z * zk, yawW, wp);
  const l0h = hipsAt(c.L0, c.ring), w0h = hipsAt(c.W0, c.ring);
  const d0 = Math.hypot(l0h[0] - w0h[0], l0h[2] - w0h[2]);
  // where he's held: in at the belt; lifted up his chest; pressed up and over onto his hands, flat, over his head
  const heldAt = (T2: number): V3 => {
    const y2 = c.W0.yaw + xSpun(T2), W2 = mk(c.W0.x, c.W0.z * zk, y2, wpAt(T2));
    const lift = ease(seg(T2, X.SET, X.LIFT)), ph = ease(seg(T2, X.LIFT, X.PRESS)) * Math.PI / 2;
    let fwd = lerp(lerp(d0, 0.84 * c.D, ease(seg(T2, 0, X.SET))), 0.72 * c.D, lift), up = 0.5 * lift;
    if (T2 > X.LIFT) { fwd = lerp(X.FWD, 0.72 * c.D, Math.cos(ph)); up = 0.5 + (X.UP - 0.5) * Math.sin(ph); }
    return ahead(hipsAt(W2, c.ring), y2, fwd, up);
  };
  const tip = ease(seg(T, X.LIFT - 0.1, X.PRESS));
  const lp = mixPose(mixPose(c.L0.p, { ...BRACE, bend: 0.4, side: 0.15, twist: 0 }, ease(seg(T, 0, X.SET))), X_FLAG, ease(seg(T, X.LIFT - 0.1, X.PRESS + 0.2)));
  const f: Frame = {
    W, L: mk(c.L0.x, c.L0.z * zk, yawW + Math.PI, lp),
    grip: ease(seg(c.t, 0.04, 0.24)), hold: ease(seg(c.t, 0.04, 0.24)) * (1 - ease(seg(T, X.SET, X.LIFT))),
  };
  const cam = { y: 1.0 * ease(seg(T, X.LIFT, X.PRESS)), wide: 0.3 * ease(seg(T, X.LIFT, X.PRESS)), take: true };
  f.cam = cam;
  if (T < X.SWING) {
    f.lHips = heldAt(T);
    // (tipped forward over onto the champion's hands, face down, flat; a little lift in the legs as he spins)
    f.L = { ...f.L, p: { ...lp, pitch: lerp(0, X.FLAT, tip) + 0.05 * Math.sin(xSpun(T) * 2) } };
  } else {
    // hurled: up towards the beams, turning over and over, hung at the top; then down into the clay, his back first
    const p0 = heldAt(X.SWING);
    const land = mk(0, 0, c.W0.yaw + Math.PI / 2, LIE);
    const hz = hipsAt(land, c.ring);
    // (the crater: in the ring's middle, a little to his side of it)
    const spot: V3 = [dir * 0.3, 0, 0.6];
    land.x = spot[0] - hz[0]; land.z = spot[2] - hz[2];
    const p1 = hipsAt(land, c.ring);
    const tau = T - X.SWING;
    const from = { yaw: c.W0.yaw + xSpun(X.SWING) + Math.PI, pitch: X.FLAT, roll: 0 };
    if (T < X_LAND) {
      const k = tau / X.FLY;
      // (a true parabola, its gravity what tops him out at the speed he's thrown up at)
      const g = (2 * (X.UPV * X.FLY - (p1[1] - p0[1]))) / (X.FLY * X.FLY);
      f.lHips = fly(p0, p1, X.FLY, tau, g);
      // spinning: whole turns about himself and over end on end, settling flat on his back for the impact
      const spin = { yaw: from.yaw + Math.PI * 2 * 2.5 * easeOut(k), pitch: from.pitch * (1 - ease(seg(k, 0, 0.25))) + Math.sin(Math.PI * 2 * 1.5 * k) * 1.1 * (1 - k), roll: 0 };
      const o = turnBetween(spin, { yaw: land.yaw, pitch: LIE.pitch, roll: 0 }, ease(seg(k, 0.72, 0.97)));
      const pp = mixPose(mixPose(X_FLAG, X_TUMBLE, ease(seg(k, 0, 0.2))), LIE, ease(seg(k, 0.75, 1)));
      f.L = { ...land, yaw: o.yaw, p: { ...pp, pitch: o.pitch, roll: o.roll } };
      f.grip = 1 - ease(seg(tau, 0, 0.1)); f.hold = 0;
      // (the camera looks up after him, and back)
      const up = Math.max(0, f.lHips[1] - c.ring.top - 1.5);
      cam.y = 1.0 + up * 0.8; cam.wide = 0.3 + 0.5 * clamp01(up / 4);
    } else {
      // in the crater: driven in, the clay giving under him, and he settles in it
      const b = T - X_LAND;
      const dent = b < 0.3 ? 0.1 * Math.sin((b / 0.3) * Math.PI) : 0;
      f.L = { ...land, p: { ...LIE, sq: 1 - 0.25 * Math.sin(Math.min(1, b / 0.3) * Math.PI) }, air: -dent };
      f.sink = true;
      f.grip = 0; f.hold = 0;
      cam.y = 0.5 * (1 - ease(seg(b, 0, 0.8))); cam.wide = 0.6 * (1 - ease(seg(b, 0.3, 1.2)));
    }
    // the champion: follows his throw up, watches him go, and as he comes down stamps the clay, as at the shiko
    if (T > X_LAND - 0.6) {
      const st = seg(T, X_LAND - 0.6, X_LAND);
      W.p = T < X_LAND ? (st < 0.7 ? mixPose(W.p, shikoUp(0), ease(st / 0.7)) : mixPose(shikoUp(0), SHIKO_LOW, easeIn(seg(st, 0.7, 1)))) : SHIKO_LOW;
    }
  }
  return f;
}
const xBeats = (_c: Ctx, fx: import('../finishRig').Fx, t0: number, t1: number) => {
  const a = xClock(t0), b = xClock(t1);
  if (crossed(a, b, X.SET + 0.15)) { fx.kick('W', 3); fx.kick('L', 3); fx.dust(fx.at('W', 'foot0'), 6, 0.8); fx.dust(fx.at('W', 'foot1'), 6, 0.8); fx.react('charge'); }
  if (crossed(a, b, X.PRESS)) { fx.hit(0.15, 0, 0.8); fx.react('edge'); }
  if (crossed(a, b, X.PRESS + 0.3)) fx.screen({ lines: 0.6, for: 0.8 });
  if (crossed(a, b, X.PRESS + 0.8)) fx.screen({ lines: 1, for: 0.8 });
  for (let s = X.PRESS + 0.2; s < X.SWING; s += 0.25) if (crossed(a, b, s)) fx.dust(fx.at('W', s % 0.5 < 0.25 ? 'foot0' : 'foot1'), 4, 0.6);
  if (crossed(a, b, X.SWING)) { fx.screen({ flash: 'white', lines: 1, for: 0.4 }); fx.hit(0.3, 0.4, 0.6); fx.kick('L', 5); fx.react('upset'); }
  if (crossed(a, b, X_LAND - 0.3)) fx.screen({ lines: 1, for: 0.35 });
  if (crossed(t0, t1, X_LANDS)) {
    const at = fx.at('L', 'hips');
    fx.screen({ impact: true, flash: 'black', for: X_FREEZE });
    fx.hit(1, 1, 1.6); fx.burst(at, 2.4); fx.dust(at, 40, 2.6); fx.kick('L', 12); fx.kick('W', 4); fx.react('win');
  }
  if (crossed(t0, t1, X_LANDS + X_FREEZE)) {
    const at = fx.at('L', 'hips');
    fx.dust(at, 30, 2.2); fx.dust(fx.at('W', 'foot0'), 10, 1.2);
    fx.screen({ text: 'THE TRAINING PAYS OFF', for: 1.4 });
  }
};
const epicMove: FinishMove = { lands: X_LANDS, done: 0, nameAt: realAt(xTau, X.SWING), frame: giantSwing, beats: xBeats };
epicMove.done = Math.min(6.6, X_LANDS + X_FREEZE + 1.0);

export const tight: FinishMove = utchariMove;
export const champTight: FinishMove = utchariMove;
export const heavy: FinishMove = oshidashiMove;
export const champGrand: FinishMove = beltThrowMove;
export const epic: FinishMove = epicMove;
