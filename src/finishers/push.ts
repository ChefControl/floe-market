// The push-out (yorikiri): how most fights end, a local's and a plain boss fight's. The loser's heels dig in at his
// straw and give an inch at a time; the winner sinks under him and lifts by the belt, both hands on it, the loser's
// heels leave the clay; slowed, he's tipped back over the straw, the winner's hands let go as he goes, and he falls off
// the mound under gravity, turning onto his back, and lands with a bounce; the winner, carried on by his own shove,
// teeters at the edge. (Also the pattern for every finisher: finishRig.ts.)
import { at, clamp01, crossed, ease, type FinishMove, fly, hipsAt, lerp, seg, type Ctx, type Frame, type V3, warp } from '../finishRig';
import { BRACE, DRIVE, LIE, LIFT, SHOVE, steps, TIPPED, teeter } from '../poses';
import { mixPose } from '../rikishi';

/** The move's clock: slowed to 0.39 from 1.0 s (the lift's top) to 1.9 s (as he goes over), then on at speed. */
const tau = (t: number) => warp(t, [[1.0, 0.39], [1.9, 1]]);
/** On its clock: the heave starts, the fall starts, he lands. */
const HEAVE = 1.0, FALL = 1.35, DOWN = 1.75;
/** Where the loser lands, and how long he's off the ground after he's let go. */
const OUT = 1.6;

function frame(c: Ctx): Frame {
  // (chest to chest, pressed: the bellies give, so the hands reach the belt)
  const T = tau(c.t), dir = c.lSide, D = c.D * 0.85, w = c.w, l = c.l;
  const straw = dir * (c.ring.r + 0.05), land = dir * (c.ring.half + OUT), over = straw + dir * 0.38;
  const zk = 1 - ease(seg(c.t, 0, 0.5));
  const W = at(w, c.W0.x, DRIVE, { z: c.W0.z * zk }), L = at(l, c.L0.x, BRACE, { z: c.L0.z * zk });
  // (a puffer, blown up and winning, can't get his arms round anyone: he pushes him out with his belly and his hands)
  const belly = c.kind === 'puffer' && w === 1;
  const f: Frame = { W, L, grip: belly ? 0 : ease(seg(c.t, 0, 0.15)), hold: belly ? 0 : 0.7 };
  if (T < 0.7) {
    // heels on the straw: he gives ground an inch at a time
    L.x = lerp(c.L0.x, straw, ease(T / 0.7)); W.x = L.x - dir * D;
    W.p = steps(DRIVE, T * 16, 0.12); L.p = { ...BRACE, pitch: -0.1 - 0.05 * Math.sin(T * 13), bend: 0.45 };
  } else if (T < HEAVE) {
    // the lift by the belt: he sinks under him first, then drives up through his legs, and the heels leave the straw
    const sink = Math.sin(Math.PI * seg(T, 0.7, 0.8)) * (T < 0.8 ? 1 : 0), k = ease(seg(T, 0.78, HEAVE));
    L.x = straw + dir * 0.08 * k; W.x = L.x - dir * D * (1 - 0.05 * k);
    W.p = { ...mixPose(DRIVE, LIFT, k), l0k: lerp(DRIVE.l0k, LIFT.l0k, k) + 0.35 * sink, l1k: lerp(DRIVE.l1k, LIFT.l1k, k) + 0.35 * sink };
    L.air = 0.14 * k; L.p = mixPose({ ...BRACE, pitch: -0.1, bend: 0.45 }, TIPPED, k);
    f.hold = lerp(0.7, 0.3, k);
  } else if (T < FALL) {
    // the heave: tipped back over the straw, his hands off the winner's belt and flailing; the winner's let go as he goes
    const k = (T - HEAVE) / (FALL - HEAVE);
    L.x = straw + dir * (0.08 + 0.3 * k * k); W.x = straw - dir * D * 0.95 + dir * (0.08 + 0.3 * ease(k));
    W.p = mixPose(LIFT, SHOVE, ease(k)); L.air = 0.14 * (1 - k * k);
    L.p = { ...TIPPED, pitch: lerp(-0.28, -0.7, k), bend: 0.2 * (1 - k), l0x: 0.35 + 0.4 * k, a0x: 2.0 + Math.sin(T * 18) * 0.5, a0z: 1.1, a1x: 2.2 + Math.cos(T * 18) * 0.5, a1z: 1.1 };
    f.grip = 1 - ease(seg(k, 0.4, 1)); f.hold = 0.3 * (1 - k);
  } else {
    // the fall: off the mound under gravity, his middle on a falling arc, turning onto his back as he goes; down with
    // a bounce
    const from = { ...L, x: over, air: 0, p: { ...TIPPED, pitch: -0.7, bend: 0, l0x: 0.75, a0x: 2.4, a0z: 1.2, a1x: 2.4, a1z: 1.2 } };
    const to = { ...L, x: land, p: LIE }, p0 = hipsAt(from, c.ring), p1 = hipsAt(to, c.ring);
    W.x = straw - dir * D * 0.95 + dir * 0.38; W.p = SHOVE; f.grip = 0; f.hold = 0;
    if (T < DOWN) {
      const k = (T - FALL) / (DOWN - FALL);
      L.x = lerp(over, land, k); L.p = mixPose(from.p, LIE, ease(k));
      f.lHips = fly(p0, p1, DOWN - FALL, T - FALL) as V3;
      W.x += dir * 0.12 * ease(k); W.p = mixPose(SHOVE, teeter(T), ease(clamp01(k * 2)));
    } else {
      const b = T - DOWN;
      L.x = land; L.p = b < 0.14 ? { ...LIE, sq: 1 - 0.16 * Math.sin((b / 0.14) * Math.PI) } : LIE;
      L.air = b < 0.22 ? 0.07 * Math.sin((b / 0.22) * Math.PI) : 0;
      W.x += dir * 0.12; W.p = teeter(T);
    }
  }
  if (belly) { f.grip = f.hold = 0; if (T < FALL) W.p = { ...W.p, a0x: 1.5, a1x: 1.5, a0z: -0.1, a1z: -0.1, a0e: 0.25 + 0.2 * Math.sin(T * 14), a1e: 0.25 - 0.2 * Math.sin(T * 14) }; }
  return f;
}

export const push: FinishMove = {
  lands: 2.3, done: 2.55, frame,
  beats(c, fx, t0, t1) {
    const a = tau(t0), b = tau(t1);
    // his heels scraping at the straw, the lift's grunt, and the camera in for the heave
    for (let s = 0.1; s < 0.7; s += 0.15) if (crossed(a, b, s)) { fx.dust(fx.at('L', 'foot0'), 3, 0.6); fx.kick('L', 0.8); }
    if (crossed(a, b, 0.85)) { fx.kick('L', 2); fx.kick('W', 1.5); }
    if (crossed(a, b, HEAVE)) fx.hit(0, 0, 1.1);
    void c;
  },
};
