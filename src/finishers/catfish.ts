// Dobu the catfish's finishers (stage 3): a namazu, slimy and heavy, whose stamps shake the earth. His own: the
// slippery escape (the champion's hands slide off him at his straw, he slithers round behind him and bumps him out
// from behind) and the earthquake (one huge stamp, and the ring shakes the champion off his feet and out). The
// champion's against him: the mud roll (both topple sideways at the champion's straw and roll over together, the
// catfish onto his back, the champion over on top) and the belly bomb (a run and a belly driven into his, which
// launches him off the clay on an arc to land out and slide on his slime); the epic's belly bomb sends him up to the
// beams spinning flat like a skimmed stone, down so hard the ring quakes, and skipping off the mound.
import {
  at, clamp01, crossed, DOWN_FRONT, ease, easeIn, easeOut, type At, type Ctx, face, type FinishMove, fly, flyV, type Frame,
  G, hipsAt, lerp, lerpV, seg, type V3, warp, yawTo,
} from '../finishRig';
import { BRACE, CHARGE, DRIVE, GETUP, GRIP, LIE, SHIKO_LOW, shikoUp, STAND, STANDOFF, steps, teeter, walk } from '../poses';
import { mixPose, type Pose, pose } from '../rikishi';

// ---------- small helpers ----------
/** A cubic from `p0` to `p1` over `dur` seconds, leaving at speed `v0` and arriving at `v1`, `k` of the way. */
function herm(p0: number, p1: number, v0: number, v1: number, dur: number, k: number) {
  const k2 = k * k, k3 = k2 * k;
  return (2 * k3 - 3 * k2 + 1) * p0 + (k3 - 2 * k2 + k) * v0 * dur + (-2 * k3 + 3 * k2) * p1 + (k3 - k2) * v1 * dur;
}
/** The real time a warped clock (`warp`'s keys) reaches `T` (its first moment there, if it's frozen on it). */
function realAt(keys: [number, number][], T: number) {
  let out = 0, at0 = 0, rate = 1;
  for (const [k, r] of keys) {
    if (out + (k - at0) * rate >= T) break;
    out += (k - at0) * rate; at0 = k; rate = r;
  }
  return at0 + (T - out) / rate;
}
/** A hop of `d` seconds under gravity: how high he is `u` seconds into it. */
const hop = (u: number, d: number) => (u > 0 && u < d ? 0.5 * G * u * (d - u) : 0);
/** A cubic Bézier through four points (x, z), `k` of the way. */
function bez(p: [number, number][], k: number): [number, number] {
  const a = (1 - k) ** 3, b = 3 * (1 - k) ** 2 * k, c = 3 * (1 - k) * k * k, d = k ** 3;
  return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
}
/** An angle brought to within half a turn of `ref` (so a turn goes on round, not back). */
const near = (a: number, ref: number) => a + 2 * Math.PI * Math.round((ref - a) / (2 * Math.PI));
/** The squash and the little bounce of a body landing, `b` seconds after. */
const squash = (b: number, d = 0.16, k = 0.16) => (b < d ? 1 - k * Math.sin((b / d) * Math.PI) : 1);
const rebound = (b: number, h = 0.07, d = 0.22) => (b < d ? h * Math.sin((b / d) * Math.PI) : 0);

// ---------- his poses ----------
/** Low and slippery, sliding round on his slime: knees deep, bent over, arms low in front. */
const SLITHER = pose({ l0x: 0.85, l0z: 0.5, l0k: 1.25, l1x: 0.85, l1z: 0.5, l1k: 1.25, bend: 0.8, head: -0.5, a0x: 0.95, a0z: 0.3, a0e: 0.7, a1x: 0.95, a1z: 0.3, a1e: 0.7 });
/** Belly first into a man's back: upright, tipped forward into it, the back leg pushing. */
const BUMP = pose({ l0x: 0.75, l0z: 0.35, l0k: 0.9, l1x: -0.4, l1z: 0.3, l1k: 0.2, bend: 0.25, head: -0.25, pitch: 0.12, a0x: 1.3, a1x: 1.3, a0z: -0.1, a1z: -0.1, a0e: 0.6, a1e: 0.6 });
/** The champion lurching into nothing: all his drive and no one there, his arms after the belt that went. */
const LURCH = { ...DRIVE, bend: 0.95, pitch: 0.14, head: -0.35, a0x: 1.75, a1x: 1.65, a0z: -0.15, a1z: -0.05, a0e: 0.15, a1e: 0.25 };
/** Teetering forward over a straw, windmilling. */
const teeterF = (a: number) => ({ ...teeter(a), pitch: 0.1 + 0.05 * Math.sin(a * 9), head: -0.1 });
/** Face down, his legs out straight behind him. */
const PRONE = { ...DOWN_FRONT, pitch: Math.PI / 2, l0x: -0.05, l1x: 0.15, l0k: 0.3, l1k: 0.5 }, PRONE_AIR = 0.26;
/** Diving face first: his arms out ahead to break the fall. */
const DIVE = { ...DOWN_FRONT, pitch: 0.8, seat: 0.4, a0x: 2.6, a1x: 2.5, a0z: 0.5, a1z: 0.5, a0e: 0.2, a1e: 0.2, head: 0.3, l0x: 0.2, l1x: -0.1, l0k: 0.3, l1k: 0.5 };
/** A leg up high for the earthquake stamp, higher than any shiko. */
const LEGUP = { ...shikoUp(1), l1z: 1.45, l1x: 0.65, a0x: 0.3, a1x: 0.3, a0z: 0.75, a1z: 0.75 };
/** Shaken off his feet: arms flung up and whirling, leaning back, off balance. */
const shaken = (a: number, k: number) => {
  const s = Math.sin(a * 13);
  return pose({ bend: 0.22, head: 0.2, pitch: -0.1 - 0.05 * Math.sin(a * 7), a0x: 2.3 + 0.6 * Math.sin(a * 16), a0z: 1.0, a0e: 0.3, a1x: 2.3 + 0.6 * Math.cos(a * 16), a1z: 1.0, a1e: 0.3,
    l0x: 0.25 + 0.35 * s * k, l0z: 0.3, l0k: 0.35 + 0.3 * Math.max(0, s), l1x: 0.25 - 0.35 * s * k, l1z: 0.3, l1k: 0.35 + 0.3 * Math.max(0, -s) });
};
/** Toppling backwards, his arms thrown up. */
const FALLB = { ...LIE, pitch: -0.75, seat: 0.4, a0x: 2.7, a1x: 2.5, a0z: 0.8, a1z: 0.8, l0x: 0.7, l1x: 0.4, l0k: 0.3, l1k: 0.5, head: 0.1 };
/** Heels on his straw, braced against the drive, his hands on the other's belt. */
const HELD = { ...GRIP, pitch: -0.1, l0x: 0.45, l1x: 0.45, l0k: 0.75, l1k: 0.75, bend: 0.62, side: 0, twist: 0 };
/** The champion sunk under the catfish's weight, his heels on the straw. */
const SUNK = { ...HELD, l0x: 0.75, l1x: 0.75, l0k: 1.25, l1k: 1.25, bend: 0.62, pitch: -0.06 };
/** Crouched beside a man down, a hand on his chest. */
/** Twisting him over: sunk low, the hips turned, the shoulders rolling him. */
const TWIST = { ...SUNK, twist: 0.55, side: -0.25, bend: 0.75, head: -0.4 };
/** Up over him, a fist raised: the winner. */
const STOOD = { ...STAND, l0z: 0.3, l1z: 0.3, a0x: 2.95, a0z: 0.12, a0e: 0.15, bend: -0.04, head: 0.15 };
const OVER = { ...GETUP, bend: 0.75, head: -0.35, pitch: 0.1, a0x: 1.2, a0z: 0.1, a0e: 0.3, a1x: 0.4, a1z: 0.3, a1e: 0.6 };
/** Reared back for the belly bomb: belly out, arms swung back, knees bent. */
const WINDUP = pose({ l0x: 0.5, l0z: 0.5, l0k: 1.0, l1x: 0.5, l1z: 0.5, l1k: 1.0, bend: -0.22, head: 0.1, pitch: -0.08, a0x: -0.55, a0z: 0.6, a0e: 0.3, a1x: -0.55, a1z: 0.6, a1e: 0.3 });
/** The belly bomb itself: belly thrust ahead, tipped into it, arms flung back, the back leg driving. */
const BOMB = pose({ l0x: 0.85, l0z: 0.35, l0k: 0.7, l1x: -0.5, l1z: 0.3, l1k: 0.1, bend: -0.3, head: -0.1, pitch: 0.2, a0x: -0.35, a0z: 1.0, a0e: 0.2, a1x: -0.35, a1z: 1.0, a1e: 0.2 });
/** Bombed: doubled over round his belly, arms and legs thrown forward. */
const BOMBED = { ...BRACE, bend: 0.85, head: -0.5, a0x: 1.5, a1x: 1.5, a0z: 0.2, a1z: 0.2, a0e: 0.3, a1e: 0.3, l0x: 0.5, l1x: 0.5 };
/** Flying folded, the way a belly blow folds a man: his legs and arms up ahead of him. */
const FOLDED = { ...LIE, pitch: -0.6, seat: 0.3, bend: 0.7, head: -0.3, l0x: 1.5, l1x: 1.3, l0k: 0.35, l1k: 0.5, a0x: 1.7, a1x: 1.5, a0z: 0.6, a1z: 0.6, a0e: 0.3, a1e: 0.3 };
/** Flat on his back, spread like a starfish (a skimmed stone). */
const FLAT = { ...LIE, pitch: -Math.PI / 2, bend: 0, head: 0.25, l0x: 0.45, l0z: 0.65, l0k: 0.2, l1x: 0.45, l1z: 0.65, l1k: 0.2, a0x: 1.6, a0z: 1.35, a0e: 0.2, a1x: 1.6, a1z: 1.35, a1e: 0.2 };
/** The champion's stance after the epic's bomb: low, wide, arms out. */
const POSED = pose({ l0x: 0.55, l0z: 0.65, l0k: 0.95, l1x: 0.55, l1z: 0.65, l1k: 0.95, bend: 0.35, head: -0.15, a0x: 0.95, a0z: 0.95, a0e: 0.35, a1x: 0.95, a1z: 0.95, a1e: 0.35 });
/** Backing off for the run-up: a step backwards on the spot's rhythm. */
const backstep = (ph: number) => ({ ...walk(-ph, 0.38), bend: 0.4, head: -0.2, l0k: 0.5 + 0.4 * Math.max(0, Math.sin(-ph)), l1k: 0.5 + 0.4 * Math.max(0, -Math.sin(-ph)) });
/** Running at him, low. */
const run = (ph: number) => {
  const s = Math.sin(ph);
  return { ...CHARGE, l0x: 0.35 + 0.55 * s, l0k: 0.5 + 0.6 * Math.max(0, s), l1x: 0.35 - 0.55 * s, l1k: 0.5 + 0.6 * Math.max(0, -s), a0x: 0.6 - 0.5 * s, a1x: 0.6 + 0.5 * s, a0z: 0.5, a1z: 0.5, a0e: 0.8, a1e: 0.8, bend: 0.55, head: -0.35 };
};

// ======================================================================================================
// SLIPPERY ESCAPE (the catfish's tight win): driven to his own straw, his heels on it, the champion's hands on his
// belt slide off his slime as he twists away; the champion lurches on into nothing and stumbles to the straw while the
// catfish slithers round behind him, and bumps him out, belly first, his hands on the back of his belt; the champion
// goes over the straw face first.
// ======================================================================================================
/** Slowed while his hands slide off (real 0.45 to 1.05), and as he's bumped (1.6 to 1.9). */
const EE: [number, number][] = [[0.45, 0.5], [1.05, 1], [1.78, 0.4], [2.08, 1]];
const tauE = (t: number) => warp(t, EE);
/** On its clock: the slip, the champion at the straw, the catfish behind him, the bump, the champion down. */
const SLIP0 = 0.45, SLIP1 = 0.75, AT_STRAW = 1.1, SET = 1.42, BUMPED = 1.54, DOWN_E = 1.92, ROLL_OVER = 0.3;

function escape(c: Ctx): Frame {
  const T = tauE(c.t), o = -c.lSide, D = c.D * 0.8, w = c.w, l = c.l;
  const zk = 1 - ease(seg(c.t, 0, 0.5));
  const W = at(w, c.W0.x, BRACE, { z: c.W0.z * zk }), L = at(l, c.L0.x, DRIVE, { z: c.L0.z * zk });
  const f: Frame = { W, L, grip: 1, hold: 1, agitate: 0.4 };
  // the champion's path: driving, the lurch into nothing (accelerating), the stumble to the straw
  const xA = c.W0.x + o * 0.04, xB = xA - o * D + o * 0.32, xS = o * (c.ring.r - 0.42);
  const lx = (T: number) => T < SLIP0 ? xA - o * D + o * 0.02 * ease(T / SLIP0)
    : T < SLIP1 ? xA - o * D + o * 0.02 + o * 0.3 * easeIn(seg(T, SLIP0, SLIP1))
    : T < AT_STRAW ? herm(xB, xS, o * 2.0, 0, AT_STRAW - SLIP1, seg(T, SLIP1, AT_STRAW)) : xS;
  // the catfish's: his heels to the straw, the slip aside, round behind the champion and in
  const xCon = xS - o * 1.0, xSet = xCon - o * 0.22;
  const path: [number, number][] = [[xA - o * 0.04, 0.95], [xA - o * 0.4, 1.25], [xSet - o * 0.1, 1.0], [xSet, 0.18]];
  if (T < SLIP0) {
    // heels on his straw, giving nothing; the champion's hands slipping on his belt already
    const k = T / SLIP0;
    W.x = c.W0.x + o * 0.04 * ease(k); L.x = lx(T);
    W.p = { ...HELD, pitch: -0.1 - 0.04 * Math.sin(T * 13) }; L.p = steps(DRIVE, T * 16, 0.12);
  } else if (T < SLIP1) {
    // the slip: he twists his hips away and slides aside on his slime; the champion's hands go round the belt with
    // him and off it, one then the other, and he lurches on into the space
    const k = seg(T, SLIP0, SLIP1);
    W.x = xA - o * 0.04 * ease(k); W.z = 0.95 * ease(k); W.yaw = face(w) - o * 0.75 * ease(k);
    W.p = mixPose(HELD, SLITHER, ease(k));
    L.x = lx(T); L.p = mixPose(steps(DRIVE, T * 16, 0.12), LURCH, ease(k));
    f.grip = 1 - ease(seg(k, 0, 0.45));
    f.hold = [1 - ease(seg(k, 0.2, 0.5)), 1 - ease(seg(k, 0.4, 0.75))];
  } else {
    f.grip = 0; f.hold = 0;
    L.x = lx(T);
    // the champion: the stumble to the straw, then windmilling over it
    if (T < AT_STRAW) {
      const k = seg(T, SLIP1, AT_STRAW);
      L.p = mixPose({ ...walk(T * 24, 0.5), pitch: 0.12, bend: 0.65, a0x: 1.9, a1x: 2.1, a0z: 0.6, a1z: 0.6 }, teeterF(T), ease(k));
      if (k < 0.15) L.p = mixPose(LURCH, L.p, k / 0.15);
    } else if (T < BUMPED) L.p = teeterF(T);
    // the catfish: round behind him, low and quick on his slime, facing him all the way; set, then the bump
    if (T < SET) {
      const k = seg(T, SLIP1, SET), [x, z] = bez(path, 0.5 * (k + ease(k)));
      W.x = x; W.z = z; W.p = steps(SLITHER, T * 30, 0.14);
    } else if (T < BUMPED) {
      const k = seg(T, SET, BUMPED), coil = Math.sin(Math.PI * seg(k, 0, 0.5)) * (k < 0.5 ? 1 : 0);
      W.x = lerp(xSet, xCon, easeIn(seg(k, 0.35, 1))); W.z = lerp(0.18, 0.04, ease(k));
      W.p = mixPose({ ...SLITHER, l0k: SLITHER.l0k + 0.3 * coil, l1k: SLITHER.l1k + 0.3 * coil }, BUMP, ease(seg(k, 0.35, 1)));
      f.grip = ease(seg(k, 0.5, 0.95));
    } else {
      // the bump's follow-through: on a step after him, catching his balance at the straw, then standing over him
      const k = seg(T, BUMPED, BUMPED + 0.5);
      W.x = xCon + o * 0.3 * easeOut(k); W.z = 0.04;
      W.p = mixPose(BUMP, k < 0.6 ? { ...teeter(T), bend: 0.4 } : STAND, ease(seg(k, 0.2, 1)));
      if (k >= 0.6) W.p = mixPose({ ...teeter(BUMPED + 0.3), bend: 0.4 }, STAND, ease(seg(T, BUMPED + 0.3, BUMPED + 0.9)));
      f.grip = 1 - ease(seg(T, BUMPED, BUMPED + 0.12));
    }
    if (T < BUMPED + 0.5) W.yaw = near(yawTo(W, L), face(w) - o * Math.PI * clamp01((T - SLIP0) / (SET - SLIP0)));
    else W.yaw = face(w) - o * Math.PI;
    // the champion bumped out: over the straw face first, his middle on a falling arc, and down
    if (T >= BUMPED) {
      const from: At = { ...L, x: xS, p: teeterF(BUMPED) }, to: At = { ...L, x: xS + o * 0.62, p: PRONE, air: PRONE_AIR };
      const p0 = hipsAt(from, c.ring), p1 = hipsAt(to, c.ring);
      if (T < DOWN_E) {
        const k = seg(T, BUMPED, DOWN_E);
        L.x = lerp(xS, to.x, k);
        L.p = k < 0.6 ? mixPose(from.p, DIVE, ease(k / 0.6)) : mixPose(DIVE, PRONE, ease((k - 0.6) / 0.4));
        f.lHips = fly(p0, p1, DOWN_E - BUMPED, T - BUMPED);
      } else {
        // down on his face; then, sliding on the slime, he rolls over onto his back (over his left side, towards the
        // camera), groaning. (Flat on his face his yaw and roll are one turn, so the roll goes on about his length.)
        const b = T - DOWN_E, k = ease(seg(b, ROLL_OVER, ROLL_OVER + 0.5)), y0 = L.yaw;
        L.x = to.x; L.p = { ...PRONE, sq: squash(b) }; L.air = PRONE_AIR + rebound(b, 0.05);
        f.lHips = p1;
        if (b >= ROLL_OVER) {
          const q = Math.PI / 2 - Math.PI * k, flat = mixPose(PRONE, { ...LIE, pitch: 0 }, k);
          f.lHips = [p1[0], p1[1] + 0.14 * Math.sin(Math.PI * k), p1[2] - 0.4 * k];
          L.p = { ...flat, roll: Math.PI / 2, pitch: q }; L.yaw = y0 + Math.PI / 2;
          if (k >= 1) { L.p = mixPose({ ...flat, roll: 0, pitch: -Math.PI / 2 }, LIE, ease(seg(b, ROLL_OVER + 0.5, ROLL_OVER + 0.8))); L.yaw = y0 + Math.PI; }
        }
      }
    }
  }
  return f;
}

export const tight: FinishMove = {
  lands: realAt(EE, DOWN_E), done: realAt(EE, DOWN_E) + ROLL_OVER + 0.85, frame: escape,
  beats(c, fx, t0, t1) {
    const a = tauE(t0), b = tauE(t1);
    // his slime on the champion's hands, slipping, and off them as they go
    for (const s of [0.12, 0.26, 0.4]) if (crossed(a, b, s)) { fx.slime(fx.at('L', s < 0.3 ? 'hand0' : 'hand1')); fx.kick('W', 0.6); }
    if (crossed(a, b, 0.52)) { fx.slime(fx.at('L', 'hand0')); fx.slime(fx.at('W', 'belly')); fx.word('SHLUP!', lerpV(fx.at('L', 'hand0'), fx.at('W', 'head'), 0.5), { fill: '#C9D28A', size: 0.8, life: 0.8 }); }
    if (crossed(a, b, 0.62)) { fx.slime(fx.at('L', 'hand1')); fx.slime(fx.at('W', 'hips')); fx.kick('L', 2); }
    // the slither round, a trail of slime; the champion's stumbling feet
    for (let s = 0.8; s < SET; s += 0.09) if (crossed(a, b, s)) fx.slime(fx.at('W', s % 0.18 < 0.09 ? 'foot0' : 'foot1'));
    for (const s of [0.86, 0.98, 1.08]) if (crossed(a, b, s)) fx.dust(fx.at('L', 'foot0'), 3, 0.6);
    if (crossed(a, b, AT_STRAW)) { fx.react('edge'); fx.dust(fx.at('L', 'foot1'), 4, 0.7); }
    // the bump
    if (crossed(a, b, BUMPED)) {
      const m = lerpV(fx.at('W', 'belly'), fx.at('L', 'hips'), 0.5);
      fx.kick('L', 5); fx.kick('W', 4); fx.slime(m); fx.slime(fx.at('W', 'belly')); fx.hit(0.2, 0, 0.9);
      fx.word('GLORP!', [m[0], m[1] + 0.9, m[2]], { fill: '#C9D28A', size: 0.9, life: 0.8 });
    }
    void c;
  },
};

// ======================================================================================================
// EARTHQUAKE (the catfish's heavy win): he lets go and steps back off the champion at the champion's straw, lifts a leg
// higher than any shiko, holds it (slowed), and stamps: a hit-stop, the camera shaken, ゴゴゴ, dust all round the ring;
// the ring shakes the champion off his feet, hop by hop, staggering backwards out over his straw and down the pallets,
// and he topples onto his back on the floor.
// ======================================================================================================
/** Slowed as the leg's held up (real 0.7 to 1.2), frozen a beat as it lands (1.28 to 1.35). */
const EQ: [number, number][] = [[0.7, 0.5], [1.2, 1], [1.28, 0], [1.35, 1]];
const tauQ = (t: number) => warp(t, EQ);
const OFF = 0.35, LEG_UP = 0.72, STAMP0 = 0.95, STAMP = 1.03, TOPPLE = 2.2, DOWN_Q = 2.6;
/** The champion's hops as the ring shakes (their lengths). */
const HOPS = [0.32, 0.27, 0.22, 0.19, 0.17];

function quake(c: Ctx): Frame {
  const T = tauQ(c.t), dir = c.lSide, D = c.D * 0.85, w = c.w, l = c.l;
  const zk = 1 - ease(seg(c.t, 0, 0.5));
  const L = at(l, c.L0.x, BRACE, { z: c.L0.z * zk }), W = at(w, c.L0.x - dir * D, DRIVE, { z: c.W0.z * zk });
  const f: Frame = { W, L, grip: 0, hold: 0, agitate: 0.3 };
  const xL1 = c.L0.x - dir * 0.22, xW1 = c.L0.x - dir * (D + 0.62), xL2 = dir * 4.6;
  // the catfish: lets go and steps back, the leg up, the stamp, low as it shakes, then up to watch
  if (T < OFF) {
    const k = seg(T, 0, OFF);
    W.x = herm(c.L0.x - dir * D, xW1, 0, 0, OFF, k); W.p = mixPose(DRIVE, { ...walk(-k * Math.PI * 2, 0.35), bend: 0.3 }, ease(seg(k, 0, 0.3)));
    if (k > 0.7) W.p = mixPose(W.p, STAND, ease(seg(k, 0.7, 1)));
    f.grip = 1 - ease(seg(k, 0, 0.3)); f.hold = 0.7 * (1 - ease(seg(k, 0, 0.3)));
  } else if (T < STAMP0) {
    W.x = xW1;
    const k = ease(seg(T, OFF, LEG_UP)), wob = T > LEG_UP ? 0.03 * Math.sin(T * 18) : 0;
    W.p = { ...mixPose(STAND, LEGUP, k), side: LEGUP.side * k + wob };
    f.agitate = 0.3 + 0.5 * k;
  } else if (T < STAMP) {
    W.x = xW1; W.p = mixPose(LEGUP, { ...SHIKO_LOW, sq: 0.86 }, easeIn(seg(T, STAMP0, STAMP))); f.agitate = 0.9;
  } else {
    const b = T - STAMP;
    W.x = xW1 + dir * 0.45 * ease(seg(T, 1.8, 2.5));
    const low = { ...SHIKO_LOW, sq: 0.86 + 0.14 * ease(clamp01(b / 0.18)), bend: SHIKO_LOW.bend + 0.04 * Math.sin(b * 30) * Math.max(0, 1 - b) };
    W.p = T < 1.8 ? low : mixPose(low, { ...walk(T * 14, 0.3), bend: 0.2 }, ease(seg(T, 1.8, 2.0)));
    if (T > 2.4) W.p = mixPose(W.p, STAND, ease(seg(T, 2.4, 2.7)));
    f.agitate = 1 - 0.7 * seg(T, 1.6, 2.6);
  }
  // the champion: let go, a stumble forward, crouched watching the leg; shaken off his feet, hop by hop, backwards
  // out and down the pallets; then over onto his back
  if (T < OFF) {
    const k = seg(T, 0, OFF);
    L.x = lerp(c.L0.x, xL1, ease(k)); L.p = mixPose({ ...BRACE, pitch: -0.1 }, { ...walk(k * 4, 0.3), bend: 0.4 }, ease(k));
  } else if (T < STAMP) {
    L.x = xL1; L.p = mixPose(L.p, { ...STANDOFF, head: -0.05 }, ease(seg(T, OFF, OFF + 0.3)));
  } else if (T < TOPPLE) {
    const k = seg(T, STAMP, TOPPLE);
    L.x = herm(xL1, xL2, 0, dir * 1.4, TOPPLE - STAMP, k);
    let u = T - STAMP, n = 0;
    while (n < HOPS.length - 1 && u > HOPS[n]) { u -= HOPS[n]; n++; }
    L.air = hop(u, HOPS[n]) * (n === 0 ? 1 : 0.85);
    L.p = mixPose(STANDOFF, shaken(T, 1 - k * 0.3), ease(clamp01(k * 6)));
  } else {
    const from: At = { ...L, x: xL2, p: shaken(TOPPLE, 0.7) }, to: At = { ...L, x: dir * 4.9, p: LIE };
    const p0 = hipsAt(from, c.ring), p1 = hipsAt(to, c.ring);
    if (T < DOWN_Q) {
      const k = seg(T, TOPPLE, DOWN_Q);
      L.x = lerp(from.x, to.x, k);
      L.p = k < 0.55 ? mixPose(from.p, FALLB, ease(k / 0.55)) : mixPose(FALLB, LIE, ease((k - 0.55) / 0.45));
      f.lHips = fly(p0, p1, DOWN_Q - TOPPLE, T - TOPPLE);
    } else {
      const b = T - DOWN_Q;
      L.x = to.x; L.p = { ...LIE, sq: squash(b) }; L.air = rebound(b);
    }
  }
  return f;
}

export const heavy: FinishMove = {
  lands: realAt(EQ, DOWN_Q), done: realAt(EQ, DOWN_Q) + 0.55, frame: quake,
  beats(c, fx, t0, t1) {
    const a = tauQ(t0), b = tauQ(t1);
    if (crossed(a, b, 0.05)) { fx.kick('W', 2); fx.kick('L', 2); }
    if (crossed(a, b, OFF + 0.1)) fx.react('charge');
    if (crossed(a, b, LEG_UP)) fx.slime(fx.at('W', 'foot1'));
    // the stamp: the whole ring shakes
    if (c.t >= 1.28 && t0 < 1.28) {
      const foot = fx.at('W', 'foot1');
      fx.hit(0.9, 0.2, 1.0); fx.react('stomp'); fx.kick('W', 5); fx.kick('L', 4);
      fx.dust(foot, 30, 2.2);
      fx.word('ゴゴゴ', [foot[0], foot[1] + 1.9, foot[2]], { size: 1.6, fill: '#C9D28A', life: 1.5 });
      for (let i = 0; i < 12; i++) { const q = (i / 12) * Math.PI * 2; fx.dust([Math.cos(q) * 2.5, c.ring.top + 0.02, Math.sin(q) * 2.5], 5, 1.3); }
    }
    // it rumbles on, and the champion lands each hop
    for (const [s, k] of [[1.2, 0.4], [1.38, 0.3], [1.56, 0.22], [1.74, 0.15], [1.92, 0.1]]) if (crossed(a, b, s)) {
      fx.hit(k); const q = s * 7; fx.dust([Math.cos(q) * 1.8, c.ring.top + 0.02, Math.sin(q) * 1.8], 6, 1.2);
    }
    let e = STAMP;
    for (const h of HOPS) { e += h; if (crossed(a, b, e) && e < TOPPLE) { fx.dust(fx.at('L', 'foot0'), 4, 0.8); fx.kick('L', 2); } }
    if (crossed(a, b, 1.6)) fx.react('edge');
    if (crossed(a, b, 1.0)) fx.word('ゴゴゴ', [0, c.ring.top + 2.6, 0], { size: 1.1, fill: '#C9D28A', life: 1.2 });
  },
};

// ======================================================================================================
// MUD ROLL (the champion's tight win): the catfish drives him to his own straw, his feet slithering on the clay; the
// champion sinks under the slippery weight, twists, and rolls him: still holding the belt he turns the catfish over
// sideways into the mud, lets go as he goes down, and the catfish rolls on over onto his back in his own slime; the
// champion, on his feet the whole time, straightens over him and throws a fist up. (On his feet: so there's no doubt
// who won.)
// ======================================================================================================
/** Slowed through the roll (real 0.95 to 1.75). */
const ER: [number, number][] = [[0.95, 0.6], [1.75, 1]];
const tauR = (t: number) => warp(t, ER);
const SINK = 0.4, TOPPLE_R = 0.62, SIDE = 1.0, ROLLED = 1.42, UP_R = 2.0;

function roll(c: Ctx): Frame {
  const T = tauR(c.t), e = -c.lSide, D = c.D * 0.8, w = c.w, l = c.l;
  const zk = 1 - ease(seg(c.t, 0, 0.5));
  const xW = c.W0.x + e * 0.05, xL = xW - e * D;
  const W = at(w, c.W0.x, BRACE, { z: c.W0.z * zk }), L = at(l, xL, DRIVE, { z: c.L0.z * zk });
  const f: Frame = { W, L, grip: 1, hold: 1, agitate: 0.5 };
  // (which way each topples: towards the camera, the catfish over his right side, the champion over his left)
  const sL = e, sW = -e;
  // the legs as they lie, and how each lies on his side
  const sideL = (k: number): Pose => ({ ...mixPose({ ...DRIVE, l0x: 0.4, l1x: 0.2, l0k: 0.4, l1k: 0.3 }, { ...DRIVE, l0x: 0.5, l1x: 0.3, l0k: 0.5, l1k: 0.6, bend: 0.4 }, k), roll: sL * (Math.PI / 2) * easeIn(k) });
  const AIR = 0.5;
  if (T < SINK) {
    // the drive: his heels to the straw, the catfish's feet sliding on his own slime
    const k = T / SINK;
    W.x = lerp(c.W0.x, xW, ease(k)); L.x = W.x - e * D;
    W.p = { ...HELD, pitch: -0.1 - 0.04 * Math.sin(T * 13) }; L.p = steps(DRIVE, T * 16, 0.12);
  } else if (T < TOPPLE_R) {
    // he sinks under the weight, and the two of them lean the other way a moment, gathering it
    const k = seg(T, SINK, TOPPLE_R), lean = -0.08 * Math.sin(Math.PI * k);
    W.x = xW; W.p = { ...mixPose(HELD, SUNK, ease(k)), roll: sW * lean };
    L.p = { ...mixPose(DRIVE, sideL(0), ease(k)), roll: sL * lean };
  } else if (T < SIDE) {
    // over they go, sideways together, like a felled tree, still locked on the belts
    const k = seg(T, TOPPLE_R, SIDE);
    // (the champion stays on his feet: he twists his hips and turns him over, low over him)
    W.x = xW; W.p = mixPose(SUNK, TWIST, ease(k));
    L.x = xW - e * D * (1 - 0.1 * ease(k)); L.p = sideL(k); L.air = AIR * easeIn(k);
    f.grip = 1; f.hold = 0.9 * (1 - ease(seg(k, 0, 0.3)));
  } else {
    // the roll: on their sides, then over, as one, the catfish onto his back (rolling the way his back is) and the
    // champion up and over on top of him; then up off him
    const L1: At = { ...L, x: xW - e * D * 0.9, p: sideL(1), air: AIR };
    const hL = hipsAt(L1, c.ring);
    const rollBy = 0.5, k = ease(seg(T, SIDE, ROLLED));
    // the catfish's middle rolls along the clay, a little lower as he comes onto his back
    const bL: V3 = [hL[0] - e * rollBy * k, lerp(hL[1], c.ring.top + 0.12, k), hL[2]];
    const yawL = face(l);
    // (on his back, rolled: his pitch takes him over; turned flat, the same lie is a turn of his yaw)
    const backL = { ...mixPose(sideL(1), LIE, k), roll: sL * Math.PI / 2, pitch: -(Math.PI / 2) * k };
    L.yaw = yawL; L.p = backL; L.x = L1.x;
    f.lHips = bL;
    // the champion lets go as he goes over, follows him a step, and straightens up over him
    f.hold = 0; f.grip = 1 - ease(seg(T, SIDE, SIDE + 0.12));
    const u = seg(T, SIDE, UP_R);
    W.x = xW - e * 0.35 * ease(seg(T, SIDE, ROLLED)); W.yaw = face(w);
    W.p = T < ROLLED ? mixPose(TWIST, OVER, ease(seg(T, SIDE, ROLLED))) : mixPose(OVER, STOOD, ease(seg(T, ROLLED, UP_R)));
    void u;
    if (T >= ROLLED) {
      // flat on his back: the same lie, turned (yaw for roll), then settling into it
      const b = T - ROLLED;
      L.p = { ...mixPose({ ...backL, roll: 0, pitch: -Math.PI / 2 }, LIE, ease(seg(b, 0, 0.4))), sq: squash(b, 0.16, 0.12) };
      L.yaw = yawL + (sL * Math.PI) / 2;
    }
  }
  return f;
}

export const champTight: FinishMove = {
  lands: realAt(ER, ROLLED), done: realAt(ER, UP_R) + 0.25, frame: roll,
  beats(c, fx, t0, t1) {
    const a = tauR(t0), b = tauR(t1);
    // his feet slithering as he drives
    for (let s = 0.08; s < SINK; s += 0.1) if (crossed(a, b, s)) fx.slime(fx.at('L', s % 0.2 < 0.1 ? 'foot0' : 'foot1'));
    if (crossed(a, b, SINK + 0.05)) { fx.kick('W', 2); fx.kick('L', 2); fx.react('edge'); }
    // down on their sides in the mud, and the roll
    if (crossed(a, b, SIDE)) {
      const m = lerpV(fx.at('L', 'hips'), fx.at('W', 'hips'), 0.5);
      fx.dust(m, 14, 1.4); fx.slime(fx.at('L', 'belly')); fx.slime(m); fx.kick('L', 6); fx.kick('W', 4); fx.hit(0.3, 0, 0.8);
      fx.word('SPLOP!', [m[0], m[1] + 1.1, m[2]], { fill: '#C9D28A', size: 1.0, life: 0.9 });
    }
    for (const s of [1.1, 1.2, 1.3]) if (crossed(a, b, s)) { fx.slime(fx.at('L', 'hips')); fx.dust(fx.at('L', 'hips'), 3, 0.7); }
    if (crossed(a, b, ROLLED + 0.3)) fx.slime(fx.at('L', 'chest'));
    void c;
  },
};

// ======================================================================================================
// BELLY BOMB (the champion's grand win): at the catfish's straw the champion lets go and backs off a step, rears back,
// and runs at him, belly first; the bellies meet (a hit-stop), and the catfish, folded round his, is launched off the
// clay on an arc, turning onto his back, over the pallets, to land on the floor and slide on his slime.
// ======================================================================================================
const EB: [number, number][] = [[0.84, 0], [0.92, 0.5], [1.36, 1]];
const tauB = (t: number) => warp(t, EB);
const BACK = 0.5, HIT_B = 0.84, DOWN_B = 1.66;

function bomb(c: Ctx): Frame {
  const T = tauB(c.t), dir = c.lSide, D = c.D * 0.85, w = c.w, l = c.l;
  const zk = 1 - ease(seg(c.t, 0, 0.5));
  const L = at(l, c.L0.x, BRACE, { z: c.L0.z * zk }), W = at(w, c.L0.x - dir * D, DRIVE, { z: c.W0.z * zk });
  const f: Frame = { W, L, grip: 0, hold: 0, agitate: 0.4 };
  const xL1 = c.L0.x - dir * 0.18, xHit = xL1 - dir * c.D * 0.92, xBack = xHit - dir * 0.62;
  // the catfish: let go at his straw, he sags a step forward off it; bombed, launched; down, sliding
  if (T < HIT_B) {
    const k = seg(T, 0, HIT_B);
    L.x = lerp(c.L0.x, xL1, ease(seg(k, 0.1, 0.8)));
    L.p = mixPose({ ...BRACE, pitch: -0.1 }, { ...walk(k * 5, 0.3), bend: 0.45, head: -0.2, a0x: 0.6, a1x: 0.6 }, ease(seg(k, 0, 0.4)));
    f.hold = 0.7 * (1 - ease(seg(T, 0, 0.12)));
  }
  // the champion: let go, a step back and rear back, the run and the bomb, then the follow-through
  if (T < BACK) {
    const k = seg(T, 0, BACK);
    W.x = herm(c.L0.x - dir * D, xBack, 0, 0, BACK, k);
    W.p = mixPose(mixPose(DRIVE, backstep(k * Math.PI * 2), ease(seg(k, 0, 0.25))), WINDUP, ease(seg(k, 0.7, 1)));
    f.grip = 1 - ease(seg(k, 0, 0.3));
  } else if (T < HIT_B) {
    const k = seg(T, BACK, HIT_B);
    W.x = herm(xBack, xHit, 0, -dir * 3.2, HIT_B - BACK, k);
    W.p = k < 0.7 ? mixPose(WINDUP, run(k * 9), ease(seg(k, 0, 0.3))) : mixPose(run(0.7 * 9), BOMB, ease(seg(k, 0.7, 1)));
    W.air = hop(T - (HIT_B - 0.14), 0.14) * 0.6;
  } else {
    const k = seg(T, HIT_B, HIT_B + 0.55);
    // (his belly rebounds off the other's: back a touch, then forward over his feet)
    W.x = xHit - dir * (0.12 * Math.sin(Math.PI * clamp01(k * 1.4)) - 0.18 * ease(k));
    W.p = mixPose(BOMB, k < 0.5 ? { ...STANDOFF, bend: 0.2, head: 0 } : STAND, ease(k));
    if (T > HIT_B + 0.55) W.p = mixPose({ ...STANDOFF, bend: 0.2 }, { ...STAND, bend: -0.1, head: 0.15 }, ease(seg(T, HIT_B + 0.55, HIT_B + 0.9)));
  }
  if (T >= HIT_B) {
    const from: At = { ...L, x: xL1, p: BOMBED }, to: At = { ...L, x: dir * 4.9, p: LIE };
    const p0 = hipsAt(from, c.ring), p1 = hipsAt(to, c.ring);
    if (T < DOWN_B) {
      const k = seg(T, HIT_B, DOWN_B);
      L.x = lerp(from.x, to.x, k);
      L.p = k < 0.12 ? mixPose(L.p, BOMBED, k / 0.12) : k < 0.55 ? mixPose(BOMBED, FOLDED, ease((k - 0.12) / 0.43)) : mixPose(FOLDED, LIE, ease((k - 0.55) / 0.45));
      L.p = { ...L.p, sq: k < 0.08 ? 1 - 0.1 * Math.sin((k / 0.08) * Math.PI) : 1 };
      f.lHips = fly(p0, p1, DOWN_B - HIT_B, T - HIT_B);
    } else {
      // sliding on his slime, slowing, a bounce as he comes down
      // (his speed off the flight, run down over 0.22 m of slime)
      const b = T - DOWN_B, v = flyV(p0, p1, DOWN_B - HIT_B, DOWN_B - HIT_B)[0], S = (2 * 0.22) / Math.abs(v), slide = Math.min(b, S);
      L.x = to.x + v * (slide - (slide * slide) / (2 * S));
      L.p = { ...LIE, sq: squash(b) }; L.air = rebound(b, 0.06);
    }
  }
  return f;
}

export const champGrand: FinishMove = {
  lands: realAt(EB, DOWN_B), done: realAt(EB, DOWN_B) + 0.65, nameAt: 0.86, frame: bomb,
  beats(c, fx, t0, t1) {
    const a = tauB(t0), b = tauB(t1);
    if (crossed(a, b, 0.1)) fx.kick('L', 2);
    // the run's steps, and the bomb
    for (const s of [0.62, 0.73]) if (crossed(a, b, s)) fx.dust(fx.at('W', s < 0.7 ? 'foot0' : 'foot1'), 4, 0.8);
    if (c.t >= HIT_B && t0 < HIT_B) {
      const m = lerpV(fx.at('W', 'belly'), fx.at('L', 'belly'), 0.5);
      fx.kick('L', 10); fx.kick('W', 6); fx.burst(m, 1.3); fx.hit(0.5, 0.25, 1.1); fx.slime(m); fx.slime(fx.at('L', 'belly'));
      fx.word('BOMP!', [m[0], m[1] + 1.0, m[2]], { fill: '#FF8A5A', size: 1.2, life: 0.9 }); fx.react('upset');
    }
    // his slime flying off him as he goes, and the slide
    for (const s of [1.0, 1.2, 1.4]) if (crossed(a, b, s)) fx.slime(fx.at('L', 'belly'));
    for (const s of [1.71, 1.81, 1.91, 2.01]) if (crossed(a, b, s)) { fx.slime(fx.at('L', 'hips')); fx.dust(fx.at('L', 'hips'), 3, 0.6); }
  },
};

// ======================================================================================================
// BELLY BOMB, the epic (a perfect slam): the champion backs off across the clay for a run-up, crouches, and charges;
// the bellies meet in a frozen impact frame, and the catfish goes up to the beams on his back, spinning flat like a
// skimmed stone, hanging there in slow motion while the camera looks up after him; then he comes down so hard the
// ring quakes (his own earthquake, on him: a freeze, the shockwave of dust running out across the clay, ゴゴゴ), and
// skips off it like a stone on water, once over the pallets and once on the floor, and slides to a stop, spinning
// down.
// ======================================================================================================
/** Its clock: frozen on the impact (real 1.42 to 1.64), slowed through the climb and the hang, at speed down, frozen
 *  as he hits the clay, slowed through the first skip. */
const EK: [number, number][] = [[1.42, 0], [1.64, 1], [1.94, 0.36], [3.6, 1], [4.23, 0], [4.37, 0.75], [5.15, 1]];
const tauX = (t: number) => warp(t, EK);
/** On its clock: backed off, the charge, the impact; skip 1 (the quake), skip 2, skip 3 (down for good). */
/** Real times of the impact and the quake (the freezes). */
const HIT_REAL = 1.42, QUAKE_REAL = 4.23;
const BACKED = 0.9, CHARGE_X = 1.1, HIT_X = tauX(HIT_REAL), QUAKE = tauX(QUAKE_REAL), SKIP2 = QUAKE + 0.65, SKIP3 = SKIP2 + 0.38;

function epicFrame(c: Ctx): Frame {
  const T = tauX(c.t), dir = c.lSide, D = c.D * 0.85, w = c.w, l = c.l;
  const zk = 1 - ease(seg(c.t, 0, 0.5));
  const L = at(l, c.L0.x, BRACE, { z: c.L0.z * zk }), W = at(w, c.L0.x - dir * D, DRIVE, { z: c.W0.z * zk });
  const f: Frame = { W, L, grip: 0, hold: 0, agitate: 0.5 };
  const xL1 = c.L0.x - dir * 0.3, xHit = xL1 - dir * c.D * 0.92, xBack = xHit - dir * 1.3;
  // where he comes down each time, flat on his back
  const at1: At = { ...L, x: dir * 3.0, p: FLAT, air: 0.14 }, at2: At = { ...L, x: dir * 4.95, p: FLAT, air: 0.14 }, at3: At = { ...L, x: dir * 5.55, p: FLAT, air: 0.14 };
  const from: At = { ...L, x: xL1, p: BOMBED };
  const h0 = hipsAt(from, c.ring), h1 = hipsAt(at1, c.ring), h2 = hipsAt(at2, c.ring), h3 = hipsAt(at3, c.ring);
  // the climb: high enough to hang under the beams (some 4 m up)
  const T1 = QUAKE - HIT_X;
  // ---- the champion ----
  if (T < BACKED) {
    const k = seg(T, 0, BACKED);
    W.x = herm(c.L0.x - dir * D, xBack, 0, 0, BACKED, k); W.p = mixPose(DRIVE, backstep(k * Math.PI * 3), ease(seg(k, 0, 0.2)));
    f.grip = 1 - ease(seg(k, 0, 0.2));
  } else if (T < CHARGE_X) {
    // set, low, glaring: a beat before he goes
    const k = seg(T, BACKED, CHARGE_X);
    W.x = xBack; W.p = mixPose(backstep(Math.PI * 3), { ...WINDUP, l0k: 1.3, l1k: 1.3, bend: -0.1 }, ease(clamp01(k * 2)));
  } else if (T < HIT_X) {
    const k = seg(T, CHARGE_X, HIT_X);
    W.x = herm(xBack, xHit, 0, -dir * 5.5, HIT_X - CHARGE_X, k);
    W.p = k < 0.72 ? mixPose(WINDUP, run(k * 13), ease(seg(k, 0, 0.2))) : mixPose(run(0.72 * 13), BOMB, ease(seg(k, 0.72, 1)));
    W.air = hop(T - (HIT_X - 0.16), 0.16) * 0.8;
  } else {
    // the follow-through: carried on a step, then into his stance, watching him go up; jolted off his feet by the quake
    const k = seg(T, HIT_X, HIT_X + 0.6);
    W.x = xHit + dir * 0.35 * easeOut(k);
    W.p = mixPose(BOMB, { ...POSED, head: -0.35 }, ease(k));
    if (T > HIT_X + 0.6) W.p = { ...POSED, head: lerp(-0.35, -0.05, ease(seg(T, QUAKE - 0.6, QUAKE - 0.05))) };
    W.air = hop(T - QUAKE, 0.3);
    if (T > QUAKE + 0.3) W.p = mixPose({ ...POSED, head: -0.05 }, { ...POSED, a0x: 1.5, a1x: 1.5, a0z: 1.2, a1z: 1.2, bend: 0.2, head: 0.1 }, ease(seg(T, QUAKE + 0.3, QUAKE + 0.8)));
  }
  // ---- the catfish ----
  if (T < HIT_X) {
    // let go, he steps forward off his straw after him, and braces for what's coming
    const k = seg(T, 0, HIT_X);
    L.x = lerp(c.L0.x, xL1, ease(seg(k, 0.05, 0.6)));
    L.p = mixPose({ ...BRACE, pitch: -0.1 }, { ...walk(k * 6, 0.3), bend: 0.4, head: -0.15 }, ease(seg(k, 0, 0.25)));
    if (k > 0.6) L.p = mixPose(L.p, { ...BRACE, bend: 0.5 }, ease(seg(k, 0.6, 0.9)));
    f.hold = 0.7 * (1 - ease(seg(T, 0, 0.1)));
  } else {
    // up he goes, spinning flat, and down; skips; slides
    let hp: V3, yaw: number, p: Pose;
    const spin = (u: number) => face(l) + u;
    if (T < QUAKE) {
      const u = T - HIT_X, k = u / T1;
      hp = fly(h0, h1, T1, u);
      // (folded by the bomb, then laid out flat on his back by the top, spinning faster as he opens out)
      p = k < 0.06 ? mixPose(L.p, BOMBED, k / 0.06) : k < 0.3 ? mixPose(BOMBED, FOLDED, ease((k - 0.06) / 0.24)) : mixPose(FOLDED, FLAT, ease(seg(k, 0.3, 0.6)));
      yaw = spin(9 * easeIn(seg(k, 0.15, 1)) * 1.0);
    } else if (T < SKIP2) {
      const u = T - QUAKE, k = u / (SKIP2 - QUAKE);
      hp = fly(h1, h2, SKIP2 - QUAKE, u);
      p = { ...FLAT, sq: squash(u, 0.12, 0.25) };
      yaw = spin(9 + 4 * k);
    } else if (T < SKIP3) {
      const u = T - SKIP2, k = u / (SKIP3 - SKIP2);
      hp = fly(h2, h3, SKIP3 - SKIP2, u);
      p = { ...FLAT, sq: squash(u, 0.1, 0.18) };
      yaw = spin(13 + 2 * k);
    } else {
      // sliding to a stop on his slime, the spin running down
      const u = T - SKIP3, v = flyV(h2, h3, SKIP3 - SKIP2, SKIP3 - SKIP2)[0], s = Math.min(u, 0.5);
      hp = [h3[0] + v * (s - (s * s) / (2 * 0.5)), h3[1], h3[2]];
      p = { ...mixPose(FLAT, { ...FLAT, l0x: 0.9, l1x: 1.1, l0k: 0.5, l1k: 0.7, a0x: 2.2, a1x: 1.9 }, ease(seg(u, 0.2, 0.7))), sq: squash(u, 0.12, 0.14) };
      yaw = spin(15 + 1.6 * (s - (s * s) / (2 * 0.5)) / 0.25);
    }
    L.yaw = yaw; L.p = p; L.x = hp[0]; L.z = hp[2]; L.air = at1.air;
    f.lHips = hp;
  }
  // the camera: back and up after him as he climbs, down with him
  const up = ease(seg(T, HIT_X + 0.05, HIT_X + 0.65)) * (1 - ease(seg(T, QUAKE - 0.4, QUAKE)));
  f.cam = { y: 3.4 * up + 0.5 * seg(T, HIT_X, QUAKE), wide: 0.25 + 0.5 * up + 0.2 * seg(T, CHARGE_X - 0.3, HIT_X), take: true };
  f.agitate = T > HIT_X ? 1 : 0.5;
  return f;
}

export const epic: FinishMove = {
  lands: realAt(EK, SKIP3), done: realAt(EK, SKIP3) + 0.65, nameAt: 1.12, frame: epicFrame,
  beats(c, fx, t0, t1) {
    const a = tauX(t0), b = tauX(t1);
    if (crossed(a, b, 0.1)) fx.kick('L', 2);
    // the run-up: set, then the charge, the screen streaking
    if (crossed(a, b, BACKED + 0.05)) { fx.dust(fx.at('W', 'foot0'), 5, 0.9); fx.react('charge'); }
    if (crossed(a, b, CHARGE_X)) fx.screen({ lines: 0.8, for: 0.4 });
    for (const s of [0.1, 0.19, 0.28]) if (crossed(a, b, CHARGE_X + s)) fx.dust(fx.at('W', s < 0.15 || s > 0.25 ? 'foot0' : 'foot1'), 5, 1.0);
    // the impact frame
    if (crossed(t0, t1, HIT_REAL)) {
      const m = lerpV(fx.at('W', 'belly'), fx.at('L', 'belly'), 0.5);
      fx.screen({ impact: true, flash: 'white', lines: 1, for: 0.3 });
      fx.hit(1.0, 0.6, 1.4); fx.burst(m, 2.0); fx.kick('L', 12); fx.kick('W', 6); fx.slime(m); fx.slime(fx.at('L', 'belly'));
      fx.dust(fx.at('W', 'foot1'), 12, 1.6); fx.react('upset');
    }
    // the climb and the hang: slime spun off him, speed lines
    for (const s of [0.2, 0.4, 0.6, 0.8, 1.0, 1.2]) if (crossed(a, b, HIT_X + s)) fx.slime(fx.at('L', s < 0.7 ? 'belly' : 'hand0'));
    if (crossed(a, b, HIT_X + 0.5)) fx.screen({ lines: 0.6, for: 1.4 });
    // the quake: a freeze on the impact, ゴゴゴ, and the shockwave running out over the clay
    if (crossed(t0, t1, QUAKE_REAL)) {
      const p = fx.at('L', 'hips');
      fx.screen({ impact: true, flash: 'black', lines: 1, for: 0.35 });
      fx.hit(1.0, 0.5, 1.5); fx.burst(p, 2.2); fx.dust(p, 34, 2.4); fx.kick('L', 12); fx.kick('W', 4); fx.react('stomp');
      fx.slime(p); fx.slime(p);
      fx.word('ゴゴゴ', [p[0] * 0.6, c.ring.top + 2.4, p[2]], { size: 1.8, fill: '#C9D28A', life: 1.6 });
    }
    for (const [s, r] of [[QUAKE + 0.03, 0.7], [QUAKE + 0.1, 1.4], [QUAKE + 0.18, 2.1], [QUAKE + 0.27, 2.8]] as const) if (crossed(a, b, s)) {
      const p = fx.at('L', 'hips');
      for (let i = 0; i < 10; i++) {
        const q = (i / 10) * Math.PI * 2, x = p[0] + Math.cos(q) * r, z = p[2] + Math.sin(q) * r;
        if (Math.max(Math.abs(x), Math.abs(z)) < c.ring.half) fx.dust([x, c.ring.top + 0.02, z], 4, 1.2);
      }
      fx.hit(0.35 - r * 0.08);
    }
    // the skips, a splash of slime each
    for (const s of [SKIP2, SKIP3]) if (crossed(a, b, s)) {
      const p = fx.at('L', 'hips');
      fx.slime(p); fx.slime(p); fx.dust(p, 14, 1.4); fx.kick('L', 6); fx.hit(0.3);
      fx.word(s === SKIP2 ? 'SPLOP!' : 'GLORP!', [p[0], p[1] + 1.0, p[2]], { fill: '#C9D28A', size: 1.0, life: 0.8 });
    }
    for (const s of [0.1, 0.22, 0.34]) if (crossed(a, b, SKIP3 + s)) fx.slime(fx.at('L', 'hips'));
  },
};
