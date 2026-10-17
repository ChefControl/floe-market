// Samehada's finishers (the shark): fast, and everything he does turns. His own two are a crocodile's death roll and a
// charge, head down; the champion's against him go by the fin on his back and by the spin.
//  - tight (DEATH ROLL): driven to his own straw, he clamps on to the champion's belt, coils, and throws himself over
//    sideways: the two of them topple onto their sides together, still locked, and the roll carries on, the shark
//    rolling up over the top of him and the champion slammed onto his back; the shark rolls on over him and off the far
//    side, gets his knees under him and comes up in a crouch.
//  - heavy (SHARK RUSH): he lets go and backs off a step, sinks to his knuckles with his tail lashing, then explodes
//    into him head down: CHOMP! (a hit-stop), and the champion's bowled off his feet backwards, out over his straw and
//    off the mound onto his back on the floor; the shark's run carries him on to the straw, where he teeters, and grins.
//  - champTight (FIN GRAB): driven to his own straw, the champion lets go with his right hand, reaches over the
//    shark's bent back and takes him by the dorsal fin; he sets his feet and swings him round by it, the shark's feet
//    scrambling, a third of a turn, and lets go: the shark flies on out past him over the straw, tipping onto his back,
//    and lands on the floor; the champion's own turn carries him round after him.
//  - champGrand (SPIN THROW): both hands on the belt, he sinks, lifts the shark off his feet and turns on his heel,
//    faster and faster, the shark's legs and tail swinging out behind him; three quarters round he lets him fly, flat
//    out on a low arc off the mound, spinning, face down onto the floor; the champion, dizzy, turns on after him.
//  - epic (SHARKNADO): the spin throw gone mad: the spin won't stop, the shark streams out flat like a flag, the dust
//    goes up round them in a tornado; at the top of it a flash and a freeze, and the champion heaves him straight up
//    to the beams, spinning like a thrown star; slow motion at the top; he comes down face first into the middle of the
//    ring, a crater, a freeze on the impact, while the champion stamps down into his stance.
import { Euler, Quaternion, Vector3 } from 'three';
import {
  type At, at, clamp01, crossed, type Ctx, DOWN_FRONT, ease, easeOut, face, type FinishMove, type Frame, fly, hipsAt,
  lerp, lerpV, type Ring, seg, SIZE, type V3, warp, yawTo,
} from '../finishRig';
import { BRACE, CHARGE, CROUCH, DRIVE, GETUP, GRIP, LIE, LIFT, SHIKO_LOW, STANDOFF, steps, teeter, TIPPED } from '../poses';
import { mixPose, type Pose, pose } from '../rikishi';

const PI = Math.PI;
/** Hugging: bent right in over each other (a spine's lean as far as it goes), and how close that has them. */
const BENT = 1.45, HUG = 0.75;

// ---------- a body turning about his middle ----------
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const v3 = (v: Vector3): V3 => [v.x, v.y, v.z];
/** His whole turn: the yaw, then the pitch and the roll (as the rig sets them: the root's yaw, the body's x and z). */
const qYXZ = (yaw: number, pitch: number, roll = 0) => new Quaternion().setFromEuler(new Euler(pitch, yaw, roll, 'YXZ'));
const qAx = (x: number, y: number, z: number, a: number) => new Quaternion().setFromAxisAngle(new Vector3(x, y, z).normalize(), a);
const qOf = (s: At) => qYXZ(s.yaw, s.p.pitch, s.p.roll);
const rot = (q: Quaternion, v: V3): V3 => v3(new Vector3(v[0], v[1], v[2]).applyQuaternion(q));
/** `s` turned to `q` (his yaw, pitch and roll from it), stood (for the pin) under `hips`. */
function turned(s: At, q: Quaternion, hips?: V3): At {
  const e = new Euler().setFromQuaternion(q, 'YXZ');
  return { ...s, ...(hips ? { x: hips[0], z: hips[2] } : {}), yaw: e.y, p: { ...s.p, pitch: e.x, roll: e.z } };
}
/** `s` stood so that his hips are at `hips` (feet off the ground by what it takes). */
function standAt(s: At, hips: V3, ring: Ring): At {
  let o: At = { ...s, air: 0 };
  for (let i = 0; i < 3; i++) { const h = hipsAt(o, ring); o = { ...o, x: o.x + hips[0] - h[0], z: o.z + hips[2] - h[2] }; }
  return { ...o, air: hips[1] - hipsAt(o, ring)[1] };
}
/** `s` turned about a vertical line through `piv` by `th` (his root moves round it, his facing turns with it). */
function spun(s: At, piv: V3, th: number): At {
  const dx = s.x - piv[0], dz = s.z - piv[2], c = Math.cos(th), sn = Math.sin(th);
  return { ...s, x: piv[0] + dx * c + dz * sn, z: piv[2] - dx * sn + dz * c, yaw: s.yaw + th };
}
/** A point on his spine (its own space: x his left, y up it, z out of his front) where it is when he's at `s`, his
 *  hips at `hips` (rikishi.ts's apply, worked through without the model). */
function spinePt(s: At, hips: V3, local: V3): V3 {
  const p = s.p, tilt = Math.max(-0.3, Math.min(0.55, p.bend * 0.5)), lean = p.side * 0.4, turn = p.twist * 0.4;
  const qh = new Quaternion().setFromEuler(new Euler(tilt, turn, lean)), qs = new Quaternion().setFromEuler(new Euler(p.bend - tilt, p.twist - turn, p.side - lean));
  const wide = 1 + (1 - p.sq) * 0.6;
  const v = new Vector3(...local).applyQuaternion(qs).add(new Vector3(0, 0.07, 0)).applyQuaternion(qh)
    .multiply(new Vector3(wide, p.sq, wide)).multiplyScalar(SIZE).applyQuaternion(qOf(s));
  return add(hips, v3(v));
}
/** Where a hand takes his dorsal fin (on his spine, standing up off his back and swept back: creatures.ts), halfway up
 *  its leading edge. */
const FIN = (f: number): V3 => [0, 0.99, -0.12 - 0.21 * f];
/** The real time a move's clock reaches `T`. */
function realOf(tau: (t: number) => number, T: number) {
  let a = 0, b = 12;
  for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (tau(m) < T) a = m; else b = m; }
  return Math.round(b * 1000) / 1000;
}
/** A landing's squash and bounce, `b` seconds after he hits. */
const squash = (b: number, k = 0.16) => (b < 0.14 ? 1 - k * Math.sin((b / 0.14) * PI) : 1);
const hop = (b: number, h = 0.07) => (b < 0.24 ? h * Math.sin((b / 0.24) * PI) : 0);
/** The shortest turn from `a` to `b`. */
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// ---------- poses of his own ----------
/** Bowled over backwards in the air: flat out, legs kicked up, arms flung. */
const AIRBACK: Pose = { ...LIE, pitch: -1.45, l0x: 1.35, l0k: 0.5, l1x: 0.95, l1k: 0.9, a0x: 2.7, a0z: 1.2, a1x: 2.3, a1z: 1.0, head: 0.35 };
/** Swung off his feet by the belt: knees up a little, legs trailing, arms out flailing. */
const SWUNG: Pose = { ...TIPPED, pitch: 0, bend: 0.35, l0x: -0.25, l0k: 0.55, l1x: 0.1, l1k: 0.8, l0z: 0.3, l1z: 0.3, a0x: 1.6, a0z: 1.1, a0e: 0.4, a1x: 1.3, a1z: 1.3, a1e: 0.5, head: 0.15 };
/** Flat out in the air face first: arms and legs spread like a starfish. */
const STAR: Pose = { ...DOWN_FRONT, bend: 0.05, l0x: -0.15, l0z: 0.7, l0k: 0.25, l1x: -0.05, l1z: 0.7, l1k: 0.2, a0x: 1.5, a0z: 1.4, a1x: 1.5, a1z: 1.4, head: 0.25 };
/** The heave: both arms straight up over his head, up on his toes, looking up. */
const HEAVE: Pose = pose({ a0x: 2.95, a0z: 0.25, a0e: 0.05, a1x: 2.95, a1z: 0.25, a1e: 0.05, bend: -0.12, head: 0.5, l0z: 0.35, l1z: 0.35, up: 0.04 });
/** Watching him go up, one finger at the beams. */
const POINT: Pose = pose({ a1x: 2.85, a1z: 0.15, a1e: 0.05, a0x: 0.4, a0z: 0.35, bend: -0.08, head: 0.45, l0z: 0.4, l1z: 0.4 });

// ================= DEATH ROLL (tight: he wins at his own straw) =================
const drT = (t: number) => warp(t, [[1.12, 0.42], [1.82, 1]]);
/** On its clock: the clamp's done (the throw), they're down on their sides, the roll starts, the champion's back hits,
 *  the shark's over him, on his knees, up. */
const DR = { tip: 0.55, side: 0.97, roll: 0.88, down: 1.42, over: 2.1, knee: 2.42, up: 2.72, end: 2.78 };
/** How the tip and the roll come on: off with a shove, gathering. */
const tipK = (u: number) => 0.3 * u + 0.7 * u * u, rollK = (u: number) => 0.4 * u + 0.6 * u * u;

function deathRoll(c: Ctx): Frame {
  const T = drT(c.t), e = c.lSide, g = c.D * HUG, ring = c.ring, top = ring.top, w = c.w, l = c.l;
  const zk = (T: number) => 1 - ease(seg(T, 0, 0.4));
  // the clamp: heels on his straw, the champion driving; the shark's hands go on to the belt, he coils and sinks
  // (both bent in over each other, chest to chest, so the hands are on the belts: the lean is in their poses, so it
  // stays as they go over)
  const S = (T: number): At => {
    const k = ease(seg(T, 0.22, DR.tip)), b = ease(seg(T, 0, 0.22));
    return at(w, c.W0.x - e * 0.06 * ease(seg(T, 0, DR.tip)), {
      ...GRIP, pitch: -0.05, bend: lerp(GRIP.bend, BENT, b), twist: 0, side: 0, head: -0.1,
      l0x: GRIP.l0x + 0.25 * k, l1x: GRIP.l1x + 0.25 * k, l0k: GRIP.l0k + 0.5 * k, l1k: GRIP.l1k + 0.5 * k,
    }, { z: c.W0.z * zk(T) });
  };
  const C = (T: number): At => {
    const xs = c.W0.x - e * 0.06 * ease(seg(T, 0, DR.tip));
    return at(l, lerp(c.L0.x, xs + e * g, ease(seg(T, 0, 0.25))), steps({ ...DRIVE, twist: 0, side: 0, bend: lerp(DRIVE.bend, BENT, ease(seg(T, 0, 0.22))) }, T * 14, 0.1), { z: c.L0.z * zk(T) });
  };
  const f: Frame = { W: S(T), L: C(T), grip: ease(seg(T, 0, 0.2)), hold: ease(seg(T, 0.05, 0.25)), agitate: 0.4 * ease(seg(T, 0.3, DR.tip)) };
  if (T < DR.tip) return f;

  // the throw: he throws himself over sideways, the two of them locked, toppling onto their sides (about a line along
  // the ground at their feet), and the roll carries on about the champion's middle: the shark goes up over the top
  const S1 = S(DR.tip), C1 = C(DR.tip), hS = hipsAt(S1, ring), hC = hipsAt(C1, ring);
  const P: V3 = [0, top + 0.25, -0.2];
  const tipAt = (T: number) => -PI / 2 * tipK(seg(T, DR.tip, DR.side));
  const Q1 = (T: number) => qAx(1, 0, 0, tipAt(T));
  const tipped = (h: V3, T: number) => add(P, rot(Q1(T), sub(h, P)));
  const ub = seg(T, DR.roll, DR.down);
  const beta = -e * PI / 2 * rollK(ub);
  const drift: V3 = [e * 0.35 * ease(ub), -0.08 * ease(ub), 0];
  const piv = tipped(hC, T), pivDown = tipped(hC, DR.down), driftDown: V3 = [e * 0.35, -0.08, 0];
  // (the shark's roll goes on past the slam, as fast, then slows: over him and down on the far side)
  const wDown = (PI / 2) * 1.6 / (DR.down - DR.roll), more = PI / 2, dMore = (2 * more) / wDown;
  const sBeta = T < DR.down ? beta : -e * (PI / 2 + more * (1 - (1 - seg(T, DR.down, DR.down + dMore)) ** 2));
  const sPiv = T < DR.down ? piv : pivDown, sDrift = T < DR.down ? drift : driftDown;
  const qS = qAx(0, 0, 1, sBeta).multiply(Q1(T)).multiply(qOf(S1));
  const sHips = add(add(sPiv, rot(qAx(0, 0, 1, sBeta), sub(tipped(hS, T), sPiv))), sDrift);
  const qC = qAx(0, 0, 1, T < DR.down ? beta : -e * PI / 2).multiply(Q1(T)).multiply(qOf(C1));
  const cHips = add(T < DR.down ? piv : pivDown, T < DR.down ? drift : driftDown);
  // (as they go: his legs kick up and over, the champion's legs close up)
  const kick = ease(seg(T, DR.tip, DR.side + 0.2));
  const sP: Pose = { ...S1.p, l0x: lerp(S1.p.l0x, 1.0, kick), l1x: lerp(S1.p.l1x, 0.8, kick), l0z: lerp(S1.p.l0z, 0.2, kick), l1z: lerp(S1.p.l1z, 0.2, kick), twist: lerp(-0.3, 0.15, kick) };
  const cP: Pose = { ...C1.p, l0z: lerp(C1.p.l0z, 0.2, kick), l1z: lerp(C1.p.l1z, 0.2, kick), l1x: lerp(C1.p.l1x, 0.3, kick), l1k: lerp(C1.p.l1k, 0.6, kick) };

  // the champion: slammed onto his back, his hands torn off the belt, flat out; then he settles as he lies
  const cDown = qAx(0, 0, 1, -e * PI / 2).multiply(qAx(1, 0, 0, -PI / 2)).multiply(qOf(C1));
  const head = rot(cDown, [0, 1, 0]), yawEnd = Math.atan2(-head[0], -head[2]);
  const Lend = at(l, 0, LIE, { yaw: yawEnd });
  if (T < DR.down) {
    f.L = turned({ ...C1, p: cP }, qC, cHips); f.lHips = cHips;
  } else {
    const b = T - DR.down, k = ease(seg(T, DR.down + 0.08, DR.end)), limbs = ease(seg(b, 0, 0.18));
    const q = cDown.clone().slerp(qOf(Lend), k), hips = add(cHips, [0, -0.1 * k + (squash(b) - 1) * 0.6, 0]);
    f.L = turned({ ...C1, p: { ...mixPose(cP, LIE, limbs), sq: squash(b) } }, q, hips); f.lHips = hips;
  }
  f.hold = 1 - ease(seg(T, DR.down - 0.02, DR.down + 0.1));

  // the shark: over him and down on his side beyond; his knees under him, and up in a crouch
  const sOver = DR.down + dMore;
  if (T < sOver) {
    f.W = turned({ ...S1, p: sP }, qS, sHips); f.wHips = sHips;
    f.grip = 1 - ease(seg(T, DR.down, DR.down + 0.12));
  } else {
    const qO = qAx(0, 0, 1, -e * PI).multiply(Q1(DR.side)).multiply(qOf(S1));
    const hO = add(add(pivDown, rot(qAx(0, 0, 1, -e * PI), sub(tipped(hS, DR.side), pivDown))), driftDown);
    const Sk = at(w, hO[0] + e * 0.25, GETUP, { yaw: Math.atan2(-e, 0), z: hO[2] + 0.1 });
    f.grip = 0;
    if (T < DR.knee) {
      const k = ease(seg(T, sOver, DR.knee)), hips = add(lerpV(hO, hipsAt(Sk, ring), k), [0, 0.2 * Math.sin(PI * k), 0]);
      f.W = turned({ ...Sk, p: mixPose(sP, GETUP, k) }, qO.clone().slerp(qOf(Sk), k), hips); f.wHips = hips;
    } else {
      const k = ease(seg(T, DR.knee, DR.up));
      f.W = { ...Sk, p: mixPose(GETUP, { ...STANDOFF, head: 0.15 }, k) };
    }
  }
  f.agitate = 0.4 + 0.6 * (1 - ease(seg(T, DR.down, DR.end)));
  return f;
}

export const tight: FinishMove = {
  lands: realOf(drT, DR.down), done: realOf(drT, DR.end + 0.02), frame: deathRoll,
  beats(c, fx, t0, t1) {
    const a = drT(t0), b = drT(t1);
    if (crossed(a, b, 0.12)) { fx.kick('W', 2); fx.kick('L', 2); }
    if (crossed(a, b, 0.32)) fx.dust(fx.at('W', 'foot0'), 4, 0.6);
    if (crossed(a, b, DR.tip)) { fx.react('edge'); fx.dust(fx.at('W', 'foot1'), 6, 0.8); }
    if (crossed(a, b, DR.side)) { fx.dust(fx.at('W', 'hips'), 10, 1.2); fx.dust(fx.at('L', 'hips'), 10, 1.2); fx.kick('W', 4); fx.kick('L', 4); fx.hit(0.2, 0, 0.7); }
    if (crossed(a, b, DR.down + 0.62)) { fx.dust(fx.at('W', 'hips'), 8, 1.0); fx.kick('W', 4); }
    void c;
  },
};

// ================= SHARK RUSH (heavy: the champion at his own straw) =================
const RU = { back0: 0.1, back1: 0.5, low1: 0.8, hit: 1.02, fly: 0.7, end: 2.55 };
const ruT = (t: number) => warp(t, [[RU.hit, 0], [RU.hit + 0.07, 0.45], [RU.hit + 0.07 + 1.0, 1]]);

function sharkRush(c: Ctx): Frame {
  const T = ruT(c.t), e = c.lSide, D = c.D, ring = c.ring, w = c.w, l = c.l;
  const zk = 1 - ease(seg(T, 0, 0.4));
  const xs0 = c.W0.x, xc0 = c.L0.x, xb = xs0 - e * 0.7, xc1 = xc0 - e * 0.18, xi = xc1 - e * 0.86 * D;
  const f: Frame = { W: at(w, xs0, GRIP), L: at(l, xc0, GRIP), grip: 0, hold: 0 };
  // the champion: leaning on him, he stumbles a half step after him as he lets go, and finds his feet at the straw
  const guard: Pose = { ...STANDOFF, bend: 0.4, a0x: 0.95, a1x: 0.95, a0z: 0.1, a1z: 0.1, a0e: 1.25, a1e: 1.25 };
  const cPre = (T: number): At => {
    const k = ease(seg(T, 0.12, 0.45));
    const p = T < 0.5 ? steps(mixPose(GRIP, { ...STANDOFF, bend: 0.6, a0x: 1.2, a1x: 1.2 }, k), seg(T, 0.12, 0.45) * PI, 0.18) : mixPose({ ...STANDOFF, bend: 0.6, a0x: 1.2, a1x: 1.2 }, guard, ease(seg(T, 0.5, 0.85)));
    return at(l, lerp(xc0, xc1, k), p, { z: c.L0.z * zk });
  };
  // the shark: off a step, down to his knuckles, and the charge, head down
  if (T < RU.hit) {
    f.L = cPre(T);
    if (T < RU.back1) {
      const k = ease(seg(T, RU.back0, RU.back1)), shove = Math.sin(PI * seg(T, 0, 0.3));
      const p = steps(mixPose(GRIP, STANDOFF, k), -seg(T, RU.back0, RU.back1) * 2 * PI, 0.16);
      f.W = at(w, lerp(xs0, xb, k), { ...p, a0x: p.a0x + 0.5 * shove, a1x: p.a1x + 0.5 * shove, a0e: p.a0e * (1 - shove), a1e: p.a1e * (1 - shove) }, { z: c.W0.z * zk });
    } else if (T < RU.low1) {
      const k = ease(seg(T, RU.back1, RU.low1)), scrape = Math.max(0, Math.sin(seg(T, 0.6, 0.78) * PI * 2)) * 0.25;
      f.W = at(w, xb, { ...mixPose(STANDOFF, CROUCH, k), l1x: CROUCH.l1x * k + STANDOFF.l1x * (1 - k) - scrape }, { z: c.W0.z * zk });
    } else {
      const u = seg(T, RU.low1, RU.hit);
      f.W = at(w, lerp(xb, xi, 0.25 * u + 0.75 * u * u), steps(mixPose(CROUCH, CHARGE, ease(seg(T, RU.low1, RU.low1 + 0.1))), u * 4 * PI, 0.3), { z: 0 });
    }
    f.agitate = ease(seg(T, RU.back1, RU.low1));
    return f;
  }
  // bowled over: off his feet backwards, out over the straw and off the mound, turning onto his back as he goes
  const Chit = cPre(RU.hit), land = at(l, e * 4.95, LIE, { yaw: face(l) }), p0 = hipsAt(Chit, ring), p1 = hipsAt(land, ring);
  const s = T - RU.hit;
  if (s < RU.fly) {
    const k = s / RU.fly, hips = fly(p0, p1, RU.fly, s);
    f.L = { ...Chit, x: hips[0], p: mixPose(Chit.p, AIRBACK, ease(clamp01(k * 1.25))) }; f.lHips = hips;
  } else {
    const b = s - RU.fly, hips = add(p1, [0, hop(b), 0]);
    f.L = { ...land, p: { ...mixPose(AIRBACK, LIE, ease(seg(b, 0, 0.2))), sq: squash(b) } }; f.lHips = hips;
  }
  // and the shark's run carries him on to the straw: he teeters there, and grins
  const k = easeOut(seg(s, 0, 0.45)), x = xi + e * 0.5 * k;
  const p = s < 0.45 ? mixPose(CHARGE, teeter(T), ease(seg(s, 0.05, 0.4))) : mixPose(teeter(T), { ...STANDOFF, bend: 0.05, head: 0.3 }, ease(seg(s, 0.7, 1.15)));
  f.W = at(w, x, s < 0.45 ? steps(p, s * 14, 0.15) : p);
  f.agitate = 1 - 0.7 * ease(seg(s, 0.4, 1.2));
  return f;
}

export const heavy: FinishMove = {
  lands: realOf(ruT, RU.hit + RU.fly), done: realOf(ruT, RU.end), frame: sharkRush,
  beats(c, fx, t0, t1) {
    const a = ruT(t0), b = ruT(t1);
    if (crossed(a, b, 0.12)) fx.kick('L', 3);
    if (crossed(a, b, 0.65) || crossed(a, b, 0.75)) fx.dust(fx.at('W', 'foot1'), 4, 0.7);
    if (crossed(a, b, RU.low1)) fx.react('charge');
    if (crossed(a, b, RU.low1 + 0.12)) fx.dust(fx.at('W', 'foot0'), 6, 0.9);
    if (t0 < realOf(ruT, RU.hit) && t1 >= realOf(ruT, RU.hit)) {
      const h = fx.at('L', 'chest');
      fx.word('CHOMP!', [h[0], h[1] + 0.9, h[2]], { size: 1.5, fill: '#FF5A4A', life: 1.1 });
      fx.hit(0.6, 0.25, 1.3); fx.kick('L', 10); fx.kick('W', 4); fx.dust(h, 8, 1.0); fx.react('stomp');
    }
    void c;
  },
};

// ================= FIN GRAB (champTight: the champion at his own straw) =================
const FG = { reach0: 0.42, reach1: 0.78, set1: 0.98, rel: 1.85, fly: 0.53, end: 2.85 };
/** The swing: a third of a turn, gathering. */
const FG_TURN = 2.1, swingK = (u: number) => 0.3 * u + 0.7 * u * u;
const fgT = (t: number) => warp(t, [[FG.rel, 0.5], [FG.rel + FG.fly / 0.5, 1]]);

function finGrab(c: Ctx): Frame {
  const T = fgT(c.t), e = c.lSide, g = c.D * 0.7, ring = c.ring, w = c.w, l = c.l, sf = c.L.f;
  const zk = 1 - ease(seg(T, 0, 0.4));
  const xc = (T: number) => c.W0.x - e * 0.07 * ease(seg(T, 0, 0.5));
  // the shark drives low, head down into his chest, his right hand on the belt; the champion, heels on his straw, has
  // his hands flat on the shark's back; his right slides up it to the fin and takes it; he sets his feet
  const cP = (T: number): Pose => {
    const s = ease(seg(T, FG.reach1, FG.set1));
    return { ...BRACE, twist: 0, side: 0, pitch: -0.1 - 0.06 * s, bend: 0.6, head: -0.25, l0k: BRACE.l0k + 0.3 * s, l1k: BRACE.l1k + 0.3 * s };
  };
  const sP: Pose = { ...DRIVE, twist: 0, side: 0.3 * e, bend: 1.3, head: -0.7, a0x: 1.0, a0z: 0.1, a0e: 0.9 };
  const into = (T: number) => ease(seg(T, 0, 0.3));
  const Cst = (T: number) => at(w, xc(T), mixPose(GRIP, cP(T), into(T)), { z: c.W0.z * zk });
  const Sst = (T: number) => at(l, lerp(c.L0.x, xc(T) + e * g, into(T)), steps(mixPose(GRIP, sP, into(T)), T * 14, 0.1), { z: c.L0.z * zk });
  const reachK = ease(seg(T, FG.reach0, FG.reach1));
  /** The champion's hands: his left flat on the shark's back, his right on it and then on the fin. */
  const hands = (S: At, k: number): NonNullable<Frame['reach']> => {
    const h = hipsAt(S, ring), back = (x: number) => spinePt(S, h, [x, 0.48, -0.45]);
    return [['W', 0, back(-0.3), 1], ['W', 1, lerpV(back(0.3), spinePt(S, h, FIN(sf)), k), 1]];
  };
  const on = ease(seg(T, 0.1, 0.3));
  const f: Frame = { W: Cst(T), L: Sst(T), grip: 0, hold: [0, ease(seg(T, 0, 0.2)) * (1 - ease(seg(T, 0.36, FG.reach0)))] };
  if (T < FG.set1) {
    f.reach = hands(f.L, reachK).map(([m, i, p, k]) => [m, i, p, k * on] as const);
    return f;
  }
  // the swing, about the champion's middle: he turns on his heels, the shark's feet scrambling round him
  const Cset = Cst(FG.set1), Sset = Sst(FG.set1), piv = hipsAt(Cset, ring), dur = FG.rel - FG.set1;
  const th = (T: number) => e * FG_TURN * swingK(seg(T, FG.set1, FG.rel));
  const sAt = (T: number): At => { const S = spun(Sset, piv, th(T)); return { ...S, p: steps(sP, T * 20, 0.2) }; };
  f.hold = 0;
  if (T < FG.rel) {
    const u = seg(T, FG.set1, FG.rel), C = spun(Cset, piv, th(T));
    f.W = { ...C, p: steps(Cset.p, th(T) * 5, 0.12) };
    f.L = sAt(T); f.reach = hands(f.L, 1);
    f.agitate = u;
    return f;
  }
  // let go: the shark flies on out past him, turning on as he was, tipping onto his back, and down on the floor
  const s = T - FG.rel, Srel = sAt(FG.rel), p0 = hipsAt(Srel, ring), pb = hipsAt(sAt(FG.rel - 0.01), ring);
  const v = sub(p0, pb).map(x => x / 0.01) as V3, wRel = e * FG_TURN * 1.7 / dur;
  let dy = wrap(Math.atan2(e, 0) - Srel.yaw);
  if (Math.sign(dy) !== Math.sign(wRel)) dy += Math.sign(wRel) * 2 * PI;
  const land = at(l, -e * 4.93, LIE, { yaw: Srel.yaw + dy, z: Math.max(-1.2, Math.min(1.2, p0[2] + v[2] * FG.fly)) }), p1 = hipsAt(land, ring);
  if (s < FG.fly) {
    const k = s / FG.fly, hips = fly(p0, p1, FG.fly, s);
    f.L = { ...Srel, yaw: Srel.yaw + dy * (1.6 * k - 0.6 * k * k), p: { ...mixPose(Srel.p, AIRBACK, ease(clamp01(k * 1.2))), pitch: lerp(Srel.p.pitch, LIE.pitch, ease(k)) } };
    f.lHips = hips;
  } else {
    const b = s - FG.fly;
    f.L = { ...land, p: { ...mixPose({ ...AIRBACK, pitch: LIE.pitch }, LIE, ease(seg(b, 0, 0.2))), sq: squash(b) } }; f.lHips = add(p1, [0, hop(b), 0]);
  }
  // the champion: his turn carries him on round after him, his arm flung out, and he finds his balance
  const wc = wRel * 0.9, dec = 0.5, sc = Math.min(s, dec), C = spun(Cset, piv, th(FG.rel) + wc * (sc - sc * sc / (2 * dec)));
  const pEnd = { ...Cset.p, pitch: -0.2 };
  f.W = { ...C, p: s < 0.5 ? steps(mixPose(pEnd, { ...teeter(T), a1x: 2.6 }, ease(seg(s, 0, 0.3))), s * 12, 0.14) : mixPose({ ...teeter(T), a1x: 2.6 }, STANDOFF, ease(seg(s, 0.5, 0.95))) };
  const off = 0.94 * (1 - ease(seg(s, 0, 0.1)));
  f.reach = hands(Srel, 1).map(([m, i, p]) => [m, i, p, off] as const);
  f.agitate = 1 - ease(seg(s, 0.5, 1.2));
  return f;
}

export const champTight: FinishMove = {
  lands: realOf(fgT, FG.rel + FG.fly), done: realOf(fgT, FG.end), frame: finGrab,
  beats(c, fx, t0, t1) {
    const a = fgT(t0), b = fgT(t1);
    if (crossed(a, b, 0.2)) fx.dust(fx.at('W', 'foot0'), 4, 0.6);
    if (crossed(a, b, FG.reach1)) { fx.kick('L', 3); fx.react('edge'); }
    for (let s = FG.set1 + 0.15; s < FG.rel; s += 0.2) if (crossed(a, b, s)) fx.dust(fx.at('L', s % 0.4 < 0.2 ? 'foot0' : 'foot1'), 4, 0.8);
    if (crossed(a, b, FG.rel)) { fx.kick('L', 5); fx.hit(0, 0, 1.1); }
    void c;
  },
};

// ================= the spin (champGrand, and the epic gone mad) =================
interface Spin {
  /** On its clock: locked on, the lift's top, let go. */
  lock: number; lift: number; rel: number;
  /** How far round he turns (radians, past the wind-up), how it comes on (0 all gathering), how far the shark's swung
   *  out flat (his pitch at full speed), how high he's lifted, and how far the champion leans back against him. */
  turn: number; a: number; tilt: number; rise: number; lean: number;
}
const WIND = 0.3;
/** The spin at `T` (up to its `rel`): the champion, the shark (his hips pinned), how far round, how fast. */
function spinAt(c: Ctx, T: number, P: Spin) {
  const e = c.lSide, g = c.D * HUG, ring = c.ring, w = c.w, l = c.l;
  const zk = 1 - ease(seg(T, 0, 0.4));
  const cx = lerp(c.W0.x, c.L0.x - e * g, ease(seg(T, 0, 0.25)));
  const dur = P.rel - P.lift, span = -e * P.turn - e * WIND, wEnd = span * (P.a + 2 * (1 - P.a)) / dur;
  const u = seg(T, P.lift, P.rel);
  const th = T < P.lift ? e * WIND * ease(seg(T, P.lock + 0.05, P.lift)) : e * WIND + span * (P.a * u + (1 - P.a) * u * u);
  const om = T < P.lift ? 0 : span * (P.a + 2 * (1 - P.a) * u) / dur, sp = Math.abs(om / wEnd);
  // the champion: locks on, sinks under him, drives up, and turns on his heels, leaning back against him
  const sink = Math.sin(PI * seg(T, P.lock, P.lock + 0.16)) * (T < P.lock + 0.16 ? 1 : 0), up = ease(seg(T, P.lock + 0.12, P.lift));
  const base = mixPose(GRIP, LIFT, up);
  const cp: Pose = { ...base, l0k: base.l0k + 0.4 * sink, l1k: base.l1k + 0.4 * sink, pitch: -P.lean * sp, bend: base.bend + 0.1 * sp };
  const C0 = at(w, cx, T < P.lift ? cp : steps(cp, th * 4.5, 0.12), { z: c.W0.z * zk });
  const piv = hipsAt(C0, ring), C = spun(C0, piv, th);
  // the shark: braced at his straw, then off his feet, swung round with the champion, swinging out flatter the faster
  const S0 = (T: number) => at(l, c.L0.x, { ...BRACE, pitch: -0.12, bend: 0.25 }, { z: c.L0.z * (1 - ease(seg(T, 0, 0.4))) });
  if (T < P.lock) return { C, C0, piv, S: S0(T), sH: undefined as V3 | undefined, th, om, sp, wEnd };
  const Sl = S0(P.lock), C0l = at(w, lerp(c.W0.x, c.L0.x - e * g, 1), GRIP, { z: c.W0.z * (1 - ease(seg(P.lock, 0, 0.4))) });
  const rel0 = sub(hipsAt(Sl, ring), hipsAt(C0l, ring)), lift = P.rise * ease(seg(T, P.lock + 0.12, P.lift + 0.05));
  const flat = Math.sin(P.tilt * sp * sp), r = rot(qAx(0, 1, 0, th), rel0), hL = hipsAt(Sl, ring), inK = 1 - 0.17 * flat;
  // (never over the champion's shoulders: he holds him at his own chest's height, below his shoulders)
  const sH: V3 = [piv[0] + r[0] * inK, Math.min(hL[1] + lift + 0.33 * flat, piv[1] + 0.3), piv[2] + r[2] * inK];
  const hang = ease(seg(T, P.lock + 0.1, P.lift + 0.1));
  const sp0 = mixPose(Sl.p, SWUNG, hang);
  const S = turned({ ...Sl, p: { ...sp0, l0x: sp0.l0x + 0.25 * Math.sin(T * 17), l1x: sp0.l1x - 0.25 * Math.sin(T * 17) } }, qYXZ(Sl.yaw + th, lerp(Sl.p.pitch, 0, hang) + P.tilt * sp * sp, 0), sH);
  return { C, C0, piv, S, sH, th, om, sp, wEnd };
}

// ---------- SPIN THROW (champGrand) ----------
const SPIN: Spin = { lock: 0.28, lift: 0.58, rel: 1.95, turn: 1.5 * PI, a: 0.15, tilt: 0.95, rise: 0.22, lean: 0.05 };
const ST = { fly: 0.45, end: 2.95 };
const stT = (t: number) => warp(t, [[SPIN.rel, 0.45], [SPIN.rel + ST.fly / 0.45, 1]]);

function spinThrow(c: Ctx): Frame {
  const T = stT(c.t), e = c.lSide, ring = c.ring, l = c.l;
  if (T < SPIN.rel) {
    const s = spinAt(c, T, SPIN);
    return { W: s.C, L: s.S, lHips: s.sH, grip: ease(seg(T, 0, 0.2)), hold: 0.6 * (1 - ease(seg(T, SPIN.lock, SPIN.lift))), agitate: Math.max(0.3, s.sp) };
  }
  // let go: he flies flat out on a low arc off the mound, spinning on as he was, face down onto the floor
  const r = spinAt(c, SPIN.rel, SPIN), rb = spinAt(c, SPIN.rel - 0.01, SPIN), s = T - SPIN.rel;
  const p0 = r.sH!, v = sub(p0, rb.sH!).map(x => x / 0.01);
  const spin = Math.sign(r.om) * PI, yaw0 = r.S.yaw;
  const land = standAt(at(l, 0, DOWN_FRONT, { yaw: yaw0 + spin }), [e * 5.05, 0, p0[2] + v[2] * ST.fly], ring);
  const p1 = hipsAt({ ...land, air: 0 }, ring);
  const f: Frame = { W: r.C, L: r.S, grip: 1 - ease(seg(s, 0, 0.06)), hold: 0, agitate: 1 };
  const Srel = spinAt(c, SPIN.rel, SPIN).S;
  if (s < ST.fly) {
    const k = s / ST.fly, hips = fly(p0, p1, ST.fly, s);
    const q = qYXZ(yaw0 + spin * k, lerp(SPIN.tilt * r.sp * r.sp, DOWN_FRONT.pitch, ease(k)), 0);
    f.L = turned({ ...Srel, p: mixPose(Srel.p, STAR, ease(clamp01(k * 1.3))) }, q, hips); f.lHips = hips;
  } else {
    const b = s - ST.fly, a0 = { ...land, air: 0 };
    f.L = { ...a0, p: { ...mixPose(STAR, DOWN_FRONT, ease(seg(b, 0, 0.2))), sq: squash(b, 0.2) } }; f.lHips = add(p1, [0, hop(b, 0.06), 0]);
  }
  // the champion: dizzy, his turn carries him on round, and he staggers to a stop facing where the shark went
  const dec = 0.55, sc = Math.min(s, dec), th = r.th + r.om * (sc - sc * sc / (2 * dec));
  const C = spun(r.C0, r.piv, th);
  f.W = { ...C, p: s < 0.55 ? steps(mixPose(r.C.p, teeter(T), ease(seg(s, 0, 0.3))), th * 4.5, 0.14) : mixPose(teeter(T), STANDOFF, ease(seg(s, 0.55, 1.0))) };
  f.agitate = 1 - ease(seg(s, 0.5, 1.2));
  return f;
}

export const champGrand: FinishMove = {
  lands: realOf(stT, SPIN.rel + ST.fly), done: realOf(stT, ST.end), front: true, frame: spinThrow,
  beats(c, fx, t0, t1) {
    const a = stT(t0), b = stT(t1);
    if (crossed(a, b, SPIN.lock + 0.12)) { fx.kick('W', 3); fx.kick('L', 3); }
    if (crossed(a, b, SPIN.lift)) fx.react('edge');
    // (his heels grinding round in the clay)
    for (let s = SPIN.lift + 0.2; s < SPIN.rel; s += 0.16) if (crossed(a, b, s)) fx.dust(fx.at('W', 'foot0'), 3 + Math.round(4 * seg(s, SPIN.lift, SPIN.rel)), 0.8);
    if (crossed(a, b, SPIN.rel)) { fx.hit(0, 0, 1.1); fx.dust(fx.at('W', 'foot1'), 8, 1.0); }
    void c;
  },
};

// ---------- SHARKNADO (epic) ----------
const NADO: Spin = { lock: 0.28, lift: 0.55, rel: 2.35, turn: 3.5 * PI, a: 0.1, tilt: 1.2, rise: 0.15, lean: 0.03 };
/** The heave's flight: how long (on its clock), its gravity (heightened), and where he comes down (from the ring's
 *  middle, on the champion's side of it: the far side from his own straw). */
const EP = { stop: 0.12, fly: 1.9, g: 16, slow0: 0.45, slow1: 0.95, end: 2.75 };
const epT = (t: number) => {
  const r0 = NADO.rel + EP.stop, sl0 = r0 + EP.slow0, sl1 = sl0 + (EP.slow1 - EP.slow0) / 0.32;
  const hit = sl1 + (EP.fly - EP.slow1);
  return warp(t, [[NADO.rel, 0], [r0, 1], [sl0, 0.32], [sl1, 1], [hit, 0], [hit + 0.16, 1]]);
};
/** On its clock: the release (the freeze is in the clock), and he hits. */
const EP_HIT = NADO.rel + EP.fly;

function sharknado(c: Ctx): Frame {
  const T = epT(c.t), e = c.lSide, ring = c.ring, top = ring.top, l = c.l;
  if (T < NADO.rel) {
    const s = spinAt(c, T, NADO);
    return {
      W: s.C, L: s.S, lHips: s.sH, grip: ease(seg(T, 0, 0.2)), hold: 0.6 * (1 - ease(seg(T, NADO.lock, NADO.lift))), agitate: Math.max(0.3, s.sp),
      cam: { wide: 0.45 * ease(seg(T, NADO.lift, NADO.rel)), y: 0.4 * ease(seg(T, NADO.lift, NADO.rel)), take: true },
    };
  }
  // the heave: straight up to the beams, spinning like a thrown star; slow at the top; face first into the clay
  const r = spinAt(c, NADO.rel, NADO), s = T - NADO.rel, p0 = r.sH!;
  const spot: V3 = [-e * 0.55, 0, 0.35];
  const yaw0 = r.S.yaw, w0 = r.om, w1 = Math.sign(w0) * 1.2, dyaw = (tau: number) => w0 * tau - (w0 - w1) * tau * tau / (2 * EP.fly);
  const land = standAt(at(l, spot[0], DOWN_FRONT, { yaw: yaw0 + dyaw(EP.fly) }), [spot[0], top, spot[2]], ring);
  const p1 = hipsAt({ ...land, air: 0 }, ring);
  const f: Frame = { W: r.C, L: r.S, grip: 0, hold: 0, agitate: 1 };
  if (s < EP.fly) {
    const k = s / EP.fly, hips = fly(p0, p1, EP.fly, s, EP.g);
    const q = qYXZ(yaw0 + dyaw(s), lerp(NADO.tilt, DOWN_FRONT.pitch, ease(seg(k, 0.6, 1))), 0.25 * Math.sin(k * PI));
    f.L = turned({ ...r.S, p: mixPose(r.S.p, STAR, ease(clamp01(k * 3))) }, q, hips); f.lHips = hips;
    f.cam = { y: Math.max(0.4, (hips[1] - top) * 0.7), wide: 0.45 + 0.5 * Math.sin(Math.min(1, k * 1.4) * PI / 2), take: true };
  } else {
    const b = s - EP.fly, a0 = { ...land, air: 0 };
    f.L = { ...a0, p: { ...mixPose(STAR, DOWN_FRONT, ease(seg(b, 0, 0.12))), sq: squash(b, 0.3) } }; f.lHips = add(p1, [0, hop(b, 0.12), 0]);
    f.cam = { y: 0.4 * (1 - ease(seg(b, 0.2, 0.9))), wide: 0.95 - 0.6 * ease(seg(b, 0.1, 0.9)), take: true };
  }
  // the champion: stops dead on the heave, arms up; watches him go, a finger at the beams; turns to where he'll come
  // down, and stamps into his stance as he hits
  const C0 = r.C, look = yawTo(C0, { x: spot[0], z: spot[2] }), turnK = ease(seg(s, 0.35, 0.95));
  const yaw = C0.yaw + wrap(look - C0.yaw) * turnK;
  let p: Pose;
  if (s < 0.3) p = mixPose(C0.p, HEAVE, ease(seg(s, 0, 0.08)));
  else if (s < 0.95) p = steps(mixPose(HEAVE, POINT, ease(seg(s, 0.3, 0.6))), turnK * 3 * PI, 0.12);
  else if (s < EP.fly - 0.35) p = POINT;
  else if (s < EP.fly) p = mixPose(POINT, { ...SHIKO_LOW, l1x: 0.55, l1z: 1.2, l1k: 0.6, l0x: 0.3, l0k: 0.4, side: 0.3 }, ease(seg(s, EP.fly - 0.35, EP.fly - 0.12)));
  else p = mixPose({ ...SHIKO_LOW, l1x: 0.55, l1z: 1.2, l1k: 0.6, l0x: 0.3, l0k: 0.4, side: 0.3 }, SHIKO_LOW, ease(seg(s, EP.fly, EP.fly + 0.06)));
  f.W = { ...C0, yaw, p };
  return f;
}

const EP_REL_REAL = NADO.rel;
export const epic: FinishMove = {
  lands: realOf(epT, EP_HIT), done: realOf(epT, EP_HIT + EP.end - EP.fly), nameAt: EP_REL_REAL + 0.2, front: true, frame: sharknado,
  beats(c, fx, t0, t1) {
    const a = epT(t0), b = epT(t1), hitAt = realOf(epT, EP_HIT);
    if (crossed(a, b, NADO.lock + 0.12)) { fx.kick('W', 3); fx.kick('L', 3); }
    if (crossed(a, b, NADO.lift)) fx.react('edge');
    // the tornado: dust whirled up round them, thicker as he spins faster, and speed lines
    if (a >= NADO.lift && a < NADO.rel) {
      for (let s = Math.ceil(a / 0.06) * 0.06; s <= b && s < NADO.rel; s += 0.06) {
        const k = seg(s, NADO.lift, NADO.rel), hp = fx.at('W', 'hips'), ang = s * 23;
        const rr = 0.9 + 1.1 * k;
        fx.dust([hp[0] + Math.cos(ang) * rr, c.ring.top + 0.05, hp[2] + Math.sin(ang) * rr], 2 + Math.round(6 * k), 0.6 + 1.4 * k);
        if (k > 0.5) fx.screen({ lines: k, for: 0.12 });
      }
    }
    if (crossed(a, b, NADO.rel - 0.7)) { const h = fx.at('W', 'head'); fx.word('SHARKNADO!', [h[0], h[1] + 1.6, h[2]], { size: 1.6, fill: '#8FD3FF', life: 1.2 }); fx.react('charge'); }
    // the heave: a white flash and a freeze, and he's gone up
    if (t0 < NADO.rel && t1 >= NADO.rel) { fx.screen({ flash: 'white', impact: true, for: 0.12 }); fx.hit(0.5, 0.6, 1.3); fx.burst(fx.at('L', 'hips'), 1.6); fx.dust(fx.at('W', 'foot0'), 20, 2.2); fx.kick('L', 8); }
    if (crossed(a, b, NADO.rel + EP.slow0)) { fx.screen({ lines: 0.7, for: 1.4 }); fx.react('upset'); }
    // the impact: a freeze, the picture inverted, a crater, the shockwave
    if (t0 < hitAt && t1 >= hitAt) {
      const h = fx.at('L', 'hips'), y = c.ring.top + 0.05;
      fx.screen({ impact: true, flash: 'white', for: 0.16 }); fx.hit(1.0, 0.8, 1.5); fx.kick('L', 12); fx.kick('W', 4);
      fx.burst([h[0], y, h[2]], 2.6);
      for (let i = 0; i < 12; i++) { const ang = (i / 12) * PI * 2; fx.dust([h[0] + Math.cos(ang) * 1.2, y, h[2] + Math.sin(ang) * 1.2], 6, 2.0); }
      fx.word('KA-BOOM!', [h[0], h[1] + 1.4, h[2]], { size: 1.6, fill: '#FFD34A', life: 1.2 });
      fx.dust(fx.at('W', 'foot1'), 10, 1.4); fx.react('win');
    }
    if (t0 < hitAt + 0.25 && t1 >= hitAt + 0.25) fx.screen({ lines: 0.3, for: 0.5 });
  },
};
