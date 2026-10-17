// Fukure's finishers (the puffer, stage 3's last and biggest boss): everything turns on his swelling. Blown up he's a
// spiky ball half as big again, too round to get his arms round anyone, so he bounces people with his belly; squeezed,
// the air comes out of him, all at once (POP!, and he shoots off like a let-go balloon) or slowly (PFFFT). His girth
// grows and shrinks with his `puff` (rikishi.ts), so wherever the two are chest to chest the distance between them is
// worked out from it, frame by frame (`gap`), from where the fight left them.
import {
  type At, at, type Ctx, crossed, ease, easeIn, easeOut, face, type FinishMove, fly, type Frame, G, hipsAt,
  lerp, type Ring, seg, SIZE, type V3, warp,
} from '../finishRig';
import { BRACE, DRIVE, GRIP, LIE, LIFT, SHIKO_LOW, SHOVE, shikoUp, steps, teeter, TIPPED } from '../poses';
import { mixPose, type Pose, pose } from '../rikishi';

// ---------- his size, and the two of them chest to chest ----------
/** Fukure's model, and the champion's. */
const fukure = (c: Ctx) => (c.w === 1 ? c.W : c.L);
const champ = (c: Ctx) => (c.w === 1 ? c.L : c.W);
/** Chest to chest with Fukure `p` blown up (dohyo.ts's contact()). */
const contact = (c: Ctx, p: number) => 0.5 * (champ(c).f + fukure(c).f * (1 + 0.32 * p)) * 1.08 * SIZE;
/** How blown up he was when the fight ended (kept from the first frame, before the move changes it). */
function puff0(c: Ctx) {
  let p = c.keep.get('puff0') as number | undefined;
  if (p === undefined) { p = fukure(c).puff; c.keep.set('puff0', p); }
  return p;
}
/** Their distance chest to chest with him `p` blown up: from where the fight left them, grown or shrunk with him. */
const gap = (c: Ctx, p: number) => c.D + contact(c, p) - contact(c, puff0(c));
/** Pressed in for a belt grip. */
const IN = 0.85;
/** Belly to his ball, blown up (the ball's rounder than his girth says). */
const BALL_IN = 0.74;
/** Their distance with the champion's arms round him `p` blown up, `k` of the way in from chest to chest. */
const hugD = (c: Ctx, p: number, k = 1) => gap(c, p) * lerp(1, lerp(IN, BALL_IN, p), k);
/** From the pose the fight left a man in, into `p`, over the first moments. */
const from0 = (c: Ctx, s: At, p: Pose) => mixPose(s.p, p, ease(seg(c.t, 0, 0.18)));
/** The real time a move's clock reaches `T` (for its `lands`). */
function realAt(keys: [number, number][], T: number) {
  let a = 0, b = 12;
  for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (warp(m, keys) < T) a = m; else b = m; }
  return b;
}
const bump = (x: number, len: number) => (x > 0 && x < len ? Math.sin((x / len) * Math.PI) : 0);
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
/** A smooth path from p0 going v0 to p1 going v1, `d` seconds long, `u` (0 to 1) of the way. */
function herm(p0: V3, v0: V3, p1: V3, v1: V3, d: number, u: number): V3 {
  const u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  return [0, 1, 2].map(i => p0[i] * h00 + v0[i] * d * h10 + p1[i] * h01 + v1[i] * d * h11) as V3;
}

// ---------- a let-go balloon ----------
// The air jetting out of him pushes him (`a`), the push fading to nothing as the air runs out at `te`; under gravity.
/** How far the fading push has taken him by `tau` (per unit of push). */
const jetS = (tau: number, te: number) => (tau < te ? tau * tau / 2 - tau ** 3 / (6 * te) : te * te / 3 + (te / 2) * (tau - te));
const jet = (p0: V3, v0: V3, a: V3, te: number, tau: number, g: number): V3 => {
  const J = jetS(tau, te);
  return [p0[0] + v0[0] * tau + a[0] * J, p0[1] + v0[1] * tau + a[1] * J - 0.5 * g * tau * tau, p0[2] + v0[2] * tau + a[2] * J];
};
/** The shot out of the arms (v0) that, with the push `a`, brings him down on p1 at T. */
function jetAim(p0: V3, p1: V3, a: V3, te: number, T: number, g: number): V3 {
  const J = jetS(T, te);
  return [(p1[0] - p0[0] - a[0] * J) / T, (p1[1] - p0[1] - a[1] * J + 0.5 * g * T * T) / T, (p1[2] - p0[2] - a[2] * J) / T];
}
/** The shot (v0) and the push (a) that bring him to p1, going v1, just as the air runs out at te. */
function jetFit(p0: V3, p1: V3, v1: V3, te: number, g: number) {
  const D: V3 = [p1[0] - p0[0], p1[1] - p0[1] + 0.5 * g * te * te, p1[2] - p0[2]], V: V3 = [v1[0], v1[1] + g * te, v1[2]];
  const a = [0, 1, 2].map(i => (6 * (V[i] * te - D[i])) / (te * te)) as V3;
  return { a, v0: [0, 1, 2].map(i => V[i] - (a[i] * te) / 2) as V3 };
}

// ---------- his ball ----------
/** A point on his ball (creatures.ts's trunk, blown up `p`), `side` across and `hy` over his hips, on the side he
 *  faces; his hips at `hips`, facing `yaw`, standing upright, squashed `sq`. */
function onBall(c: Ctx, hips: V3, yaw: number, p: number, side: number, hy: number, sq = 1): V3 {
  const f = fukure(c).f, wide = 1 + (1 - sq) * 0.6;
  const cy = (0.07 + lerp(0.38, 0.6, p)) * SIZE * sq, cz = lerp(0.03, 0.06, p) * SIZE * wide;
  const rx = lerp(0.465, 0.6, p) * f * SIZE * wide, ry = lerp(0.52, 0.74, p) * SIZE * sq, rz = lerp(0.425, 0.56, p) * f * SIZE * wide;
  const y = hy - cy, z = cz + rz * Math.sqrt(Math.max(0.05, 1 - (side / rx) ** 2 - (y / ry) ** 2));
  const cs = Math.cos(yaw), sn = Math.sin(yaw);
  return [hips[0] + side * cs + z * sn, hips[1] + hy, hips[2] - side * sn + z * cs];
}

// ---------- the poses ----------
/** Blown up: his short arms stuck out from the sides of the ball, his legs set wide under it. */
const BALL = pose({ bend: 0, head: -0.1, a0x: 0.45, a0z: 1.0, a0e: 0.45, a1x: 0.45, a1z: 1.0, a1e: 0.45, l0x: 0.25, l0z: 0.42, l0k: 0.45, l1x: 0.25, l1z: 0.42, l1k: 0.45 });
/** The ball sunk on its knees, for a hop. */
const BALL_LOW = { ...BALL, l0x: 0.65, l0k: 1.15, l1x: 0.65, l1k: 1.15, head: -0.2 };
/** In the air: knees up under the ball. */
const TUCK = { ...BALL, l0x: 1.1, l0k: 1.7, l1x: 1.1, l1k: 1.7, a0z: 1.25, a1z: 1.25, a0x: 0.8, a1x: 0.8 };
/** His arms beating at the air (he's a fish). */
const flap = (p: Pose, t: number, k = 1): Pose => ({ ...p, a0z: p.a0z + 0.28 * k * Math.sin(t * 15), a1z: p.a1z + 0.28 * k * Math.sin(t * 15 + 0.6), a0x: p.a0x + 0.2 * k * Math.cos(t * 15), a1x: p.a1x + 0.2 * k * Math.cos(t * 15 + 0.6) });
/** Locked on, turning on his heels. */
const PIVOT = { ...GRIP, pitch: -0.08, twist: 0.3, bend: 0.45, a0x: 0.8, a0z: 0.85, a0e: 0.5, a1x: 0.8, a1z: 0.85, a1e: 0.5 };
/** The big breath in: chest up, chin up, taller. */
const INHALE = { ...PIVOT, twist: 0, bend: 0.05, head: -0.45, sq: 1.05, pitch: -0.06, a0z: 1.1, a1z: 1.1, a0x: 0.6, a1x: 0.6 };
/** Squeezed out: limp, sagging, his arms hanging. */
const LIMP = pose({ bend: 0.35, head: 0.35, a0x: 0.15, a0z: 0.25, a0e: 0.35, a1x: 0.1, a1z: 0.3, a1e: 0.4, l0x: 0.2, l0z: 0.3, l0k: 0.35, l1x: 0.25, l1z: 0.3, l1k: 0.4 });
/** ...and hanging in the champion's arms, his feet dangling. */
const DANGLE = { ...LIMP, l0x: 0.35, l0k: 0.6, l1x: 0.15, l1k: 0.35, bend: 0.25 };
/** The champion's bear hug, sunk in his stance to squeeze. */
const HUG = { ...GRIP, l0x: 0.75, l1x: 0.75, l0k: 1.15, l1k: 1.15, l0z: 0.55, l1z: 0.55, bend: 0.5, side: 0, twist: 0 };
/** The champion's power stance (the epic): sunk deep, straining. */
const POWER = { ...HUG, l0k: 1.4, l1k: 1.4, l0x: 0.95, l1x: 0.95, l0z: 0.7, l1z: 0.7, bend: 0.42 };
/** Thrown back through the air, arms and legs flung up. */
const SPRAWL = { ...TIPPED, pitch: -1.0, bend: -0.05, head: 0.35, a0x: 2.6, a0z: 1.3, a0e: 0.2, a1x: 2.4, a1z: 1.2, a1e: 0.3, l0x: 1.0, l0k: 0.5, l1x: 0.7, l1k: 0.9, seat: 0.3 };
/** Knocked back on his heels, arms thrown wide. */
const ROCKED = { ...TIPPED, a0x: 2.1, a0z: 1.1, a0e: 0.3, a1x: 2.2, a1z: 1.1, a1e: 0.3 };
/** The champion's follow-through, thrown forward, his arms out after him. */
const THROW = { ...SHOVE, a0x: 1.9, a1x: 1.9, a0z: 0.1, a1z: 0.1, bend: 0.65 };
/** Down flat, a squeezed-out bag. */
const SPLAT = { ...LIE, a0z: 1.35, a1z: 1.35, a0x: 1.9, a1x: 1.9, l0z: 0.6, l1z: 0.6 };
/** Flying spent and limp, face down. */
const FLOP = { ...LIMP, a0x: 2.4, a1x: 2.6, a0z: 0.9, a1z: 1.0, l0x: 0.75, l1x: 0.5, l0k: 0.4, l1k: 0.6, bend: -0.1, head: 0.3 };
/** Lying from a man's landing, his bounce on the clay. */
const bounce = (p: Pose, b: number, sq = 0.16): Pose => (b < 0.14 ? { ...p, sq: 1 - sq * Math.sin((b / 0.14) * Math.PI) } : p);
const hop = (b: number, h = 0.07) => (b < 0.22 ? h * Math.sin((b / 0.22) * Math.PI) : 0);

// =====================================================================================================================
// LAST PUFF (his tight win): driven back to his own straw, spent and gone soft, the champion's hands on his belt, he
// twists on his heels, his little arms out, and turns the two of them round (the champion carried round on his own
// drive), so the champion's the one with the straw at his heels; takes a breath, and blows up to the full in a heartbeat: the swelling belly
// springs the champion off him and out over the straw, onto his back off the mound. The puffer, pushed back a step by
// it, rocks on his round bottom like a toy and bristles.
const LP_K: [number, number][] = [[1.36, 0.35], [1.8, 1]];
const lpT = (t: number) => warp(t, LP_K);
const LP = { drive: 0.5, turn: 1.15, breath: 1.38, puff: 1.58, fly: 0.55, recoil: 0.08 };
const LP_LAND = LP.puff + LP.fly;

function lastPuff(c: Ctx): Frame {
  const T = lpT(c.t), s = -c.lSide, w = c.w, l = c.l;
  const zk = 1 - ease(seg(c.t, 0, 0.5)), press = lerp(1, IN, ease(seg(c.t, 0, 0.25)));
  // (the straw under his heels; how far apart they are, locked on with him gone soft)
  const E = s * (c.ring.r + 0.02), dLow = gap(c, 0.2) * IN, d32 = gap(c, 0.32) * IN, B0 = E - s * dLow;
  const W = at(w, c.W0.x, GRIP, { z: c.W0.z * zk }), L = at(l, c.L0.x, DRIVE, { z: c.L0.z * zk });
  const puff = T < 0.45 ? lerp(puff0(c), 0.2, ease(seg(T, 0, 0.45))) : T < LP.breath - 0.16 ? 0.2
    : T < LP.breath ? lerp(0.2, 0.32, ease(seg(T, LP.breath - 0.16, LP.breath))) : lerp(0.32, 1, easeIn(seg(T, LP.breath, LP.puff)));
  const f: Frame = { W, L, grip: 0, hold: ease(seg(c.t, 0, 0.18)), puff, agitate: 1 };
  // (the champion launched: where from, and where he comes down)
  const Dc = gap(c, 1) - d32 + 0.04 - LP.recoil;
  const launchP: Pose = { ...ROCKED, pitch: -0.5, bend: 0.15 };
  const launch: At = { x: B0 + s * (d32 + Dc), z: 0, yaw: face(l) + s * Math.PI, p: launchP, air: 0.1 };
  const land: At = { ...launch, x: s * 4.95, p: LIE, air: 0 };
  if (T < LP.drive) {
    // heels on the straw, giving ground; the air going out of him with the effort
    W.x = lerp(c.W0.x, E, ease(T / LP.drive)); L.x = W.x - s * gap(c, puff) * press;
    W.p = from0(c, c.W0, { ...BRACE, pitch: -0.1 - 0.05 * Math.sin(T * 13), bend: 0.4 }); L.p = from0(c, c.L0, steps(DRIVE, T * 16, 0.12));
  } else if (T < LP.turn) {
    // the turn: on his heels, the two of them round each other, the champion carried round on his own drive
    const ph = Math.PI * ease(seg(T, LP.drive, LP.turn)), M = E - (s * dLow) / 2;
    const ox = -s * (dLow / 2) * Math.cos(ph), oz = (dLow / 2) * Math.sin(ph);
    L.x = M + ox; L.z = oz; W.x = M - ox; W.z = -oz;
    L.yaw = face(l) + s * ph; W.yaw = face(w) + s * ph;
    W.p = steps(mixPose(BRACE, PIVOT, ease(seg(T, LP.drive, LP.drive + 0.2))), T * 15, 0.1); L.p = steps(DRIVE, T * 15 + 1, 0.14);
  } else if (T < LP.breath) {
    // the champion's heels at the straw now; the puffer takes a breath
    const k = ease(seg(T, LP.turn, LP.breath));
    W.x = B0; L.x = B0 + s * gap(c, puff) * IN; L.yaw = face(l) + s * Math.PI; W.yaw = face(w) + s * Math.PI;
    W.p = mixPose(PIVOT, INHALE, k); L.p = { ...mixPose(DRIVE, { ...BRACE, bend: 0.6 }, 0.5 * k), pitch: -0.08 * k - 0.03 * Math.sin(T * 14) };
  } else {
    W.yaw = L.yaw = face(w) + s * Math.PI; L.yaw = face(l) + s * Math.PI;
    if (T < LP.puff) {
      // PUFF! he blows up to the full: the belly swells into the champion and springs him off, the boss rocked back
      const u = seg(T, LP.breath, LP.puff), u2 = u * u;
      W.x = B0 - s * LP.recoil * u2; L.x = B0 + s * d32 + s * Dc * u2; L.air = 0.1 * u2;
      L.p = mixPose({ ...mixPose(DRIVE, { ...BRACE, bend: 0.6 }, 0.5), pitch: -0.08 }, launchP, ease(u));
      W.p = mixPose(INHALE, BALL, ease(u));
      f.hold = 1 - ease(seg(u, 0, 0.3));
    } else {
      // off him, out over the straw, and down on his back off the mound
      const b = T - LP.puff;
      f.grip = f.hold = 0;
      W.x = B0 - s * (LP.recoil + 0.2 * easeOut(seg(T, LP.puff, LP.puff + 0.45)));
      const rock = Math.exp(-b * 2.5);
      W.p = flap({ ...steps(BALL, b * 16, 0.12 * (1 - seg(b, 0, 0.45))), pitch: -0.12 * Math.sin(b * 9) * rock, roll: 0.08 * Math.sin(b * 7) * rock }, T, rock);
      if (b < LP.fly) {
        const k = b / LP.fly;
        L.x = lerp(launch.x, land.x, k);
        L.p = k < 0.5 ? mixPose(launchP, SPRAWL, ease(k * 2)) : mixPose(SPRAWL, LIE, ease(k * 2 - 1));
        f.lHips = fly(hipsAt(launch, c.ring), hipsAt(land, c.ring), LP.fly, b);
      } else {
        const d = b - LP.fly;
        L.x = land.x; L.p = bounce(LIE, d); L.air = hop(d);
      }
    }
  }
  return f;
}
export const tight: FinishMove = {
  lands: realAt(LP_K, LP_LAND), done: realAt(LP_K, LP_LAND) + 0.6, nameAt: 1.45, frame: lastPuff,
  beats(c, fx, t0, t1) {
    const a = lpT(t0), b = lpT(t1);
    for (let x = 0.1; x < LP.drive; x += 0.15) if (crossed(a, b, x)) { fx.dust(fx.at('W', 'foot0'), 3, 0.6); fx.kick('W', 0.8); }
    if (crossed(a, b, LP.drive - 0.05)) fx.react('edge');
    if (crossed(a, b, LP.drive + 0.3)) fx.dust(fx.at('W', 'foot1'), 5, 0.8);
    if (crossed(a, b, LP.breath + 0.02)) { const h = fx.at('W', 'head'); fx.word('PUFF!', [h[0], h[1] + 0.9, h[2]], { size: 1.3, fill: '#FFE07A' }); fx.kick('W', 4); }
    if (crossed(a, b, LP.puff - 0.03)) { fx.burst(fx.at('L', 'chest'), 1.2); fx.kick('L', 4); fx.hit(0.25, 0, 1.0); }
    if (crossed(a, b, LP.puff + 0.1)) fx.kick('W', 3);
    void c;
  },
};

// =====================================================================================================================
// PUFF BOUNCE (his heavy win): blown up to the full, the champion at his own straw with his hands spread on the ball,
// Fukure sinks on his knees and bounces into him like a beach ball: once, rolling up his belly and knocking him back
// a step; again, harder, and he's teetering on the edge; then a big one, up high and down on him with the whole ball:
// the champion's sent flying off the mound onto his back, and the ball bounces back off him, and again, and settles.
const PB_K: [number, number][] = [[1.5, 0.3], [1.8, 1]];
const pbT = (t: number) => warp(t, PB_K);
/** His hops: off the clay at t0, into the champion at tc (rise: how high his middle's gone), down again at t1, `back`
 *  short of where he hit him; `close`: how near, against chest to chest, he hits. */
const HOPS = [
  { t0: 0.2, tc: 0.32, t1: 0.58, rise: 0.2, close: 1.0, back: 0.3 },
  { t0: 0.64, tc: 0.8, t1: 1.04, rise: 0.32, close: 0.97, back: 0.3 },
  { t0: 1.12, tc: 1.54, t1: 1.9, rise: 0.75, close: 0.86, back: 0.5 },
];
const PB = { fly: 0.6, knock: [0.13, 0.15], last: { t0: 1.96, t1: 2.2, fwd: 0.12 }, settle: 2.45 };
const PB_LAND = HOPS[2].tc + PB.fly;

function puffBounce(c: Ctx): Frame {
  const T = pbT(c.t), s = c.lSide, w = c.w, l = c.l, ring = c.ring;
  const zk = 1 - ease(seg(c.t, 0, 0.4));
  const puff = lerp(puff0(c), 1, ease(seg(T, 0, 0.2))), touch = lerp(1, BALL_IN, ease(seg(c.t, 0, 0.2))), G1 = gap(c, 1) * BALL_IN;
  const W = at(w, c.W0.x, BALL, { z: c.W0.z * zk }), L = at(l, c.L0.x, BRACE, { z: c.L0.z * zk });
  const f: Frame = { W, L, grip: 0, hold: 0, puff, agitate: 1 };
  // the champion: knocked back a step a bounce
  const cX = (t: number) => c.L0.x + s * (PB.knock[0] * easeOut(seg(t, HOPS[0].tc, HOPS[0].tc + 0.32)) + PB.knock[1] * easeOut(seg(t, HOPS[1].tc, HOPS[1].tc + 0.3)));
  const cP = (t: number): Pose => {
    const j = 0.3 * bump(t - HOPS[0].tc, 0.4) + 0.38 * bump(t - HOPS[1].tc, 0.45), wild = seg(t, HOPS[0].tc, HOPS[0].tc + 0.1);
    const p = steps({ ...BRACE, twist: 0, side: 0, bend: 0.5, head: -0.25, pitch: -0.1 - j - 0.05 * Math.sin(t * 13) }, (t - HOPS[0].tc) * 18, 0.12 * (bump(t - HOPS[0].tc, 0.32) + bump(t - HOPS[1].tc, 0.3)));
    const arms = { a0x: 2.2 + Math.sin(t * 17) * 0.6, a0z: 1.1, a0e: 0.25, a1x: 2.3 + Math.cos(t * 17) * 0.6, a1z: 1.1, a1e: 0.25 };
    return mixPose(p, { ...p, ...arms }, wild);
  };
  // the puffer: where he stands between hops, and his middle in the air
  const gx: number[] = [c.L0.x - s * G1];
  const hitAt: V3[] = [];
  const ground = (x: number, p: Pose) => hipsAt({ ...W, x, z: 0, p, air: 0 }, ring);
  HOPS.forEach((h, i) => {
    const x = cX(h.tc) - s * G1 * h.close, y = ground(gx[i], BALL_LOW)[1] + h.rise;
    hitAt.push([x, y, 0]); gx.push(x - s * h.back);
  });
  const lastX = gx[3] + s * PB.last.fwd;
  L.x = cX(T); L.p = cP(T);
  let hips: V3 | null = null;
  const i = HOPS.findIndex(h => T >= h.t0 && T < h.t1);
  if (T < HOPS[0].t0) {
    // (a quick waddle in, till his ball's on him)
    W.x = c.L0.x - s * gap(c, puff) * touch; W.p = from0(c, c.W0, steps(mixPose(BALL, BALL_LOW, ease(seg(T, 0.08, HOPS[0].t0))), T * 32, 0.16 * (1 - seg(T, 0.12, 0.2))));
  } else if (i >= 0) {
    // a hop: up into him, and back off him (a bounce: his speed turned round where he hits)
    const h = HOPS[i], g0 = ground(gx[i], BALL_LOW), g1 = ground(gx[i + 1], BALL_LOW);
    hips = T < h.tc ? fly(g0, hitAt[i], h.tc - h.t0, T - h.t0) : fly(hitAt[i], g1, h.t1 - h.tc, T - h.tc);
    const u = seg(T, h.t0, h.t1);
    W.x = hips[0]; W.p = flap({ ...mixPose(BALL_LOW, TUCK, Math.sin(u * Math.PI)), sq: 1 + 0.05 * Math.sin(u * Math.PI), pitch: i === 2 ? 0.35 * Math.sin(u * Math.PI) : 0 }, T, 0.6);
  } else if (T < PB.last.t0) {
    // down between hops: squashed on the clay, and up again
    const j = HOPS.findIndex((h, k) => T >= h.t1 && T < (HOPS[k + 1]?.t0 ?? PB.last.t0));
    W.x = gx[j + 1]; W.p = { ...BALL_LOW, sq: 1 - 0.15 * Math.sin(seg(T, HOPS[j].t1, HOPS[j + 1]?.t0 ?? PB.last.t0) * Math.PI) };
  } else if (T < PB.last.t1) {
    // and a last little bounce, on the spot
    const u = seg(T, PB.last.t0, PB.last.t1);
    hips = fly(ground(gx[3], BALL_LOW), ground(lastX, BALL_LOW), PB.last.t1 - PB.last.t0, T - PB.last.t0);
    W.x = hips[0]; W.p = { ...BALL_LOW, sq: 1 + 0.04 * Math.sin(u * Math.PI) };
  } else {
    W.x = lastX; W.p = flap(mixPose(BALL_LOW, BALL, ease(seg(T, PB.last.t1, PB.settle))), T, 0.5);
  }
  if (hips) f.wHips = hips;
  // the champion's hands spread on the ball, till the first bounce knocks them off it
  const k = ease(seg(c.t, 0, 0.2)) - ease(seg(T, HOPS[0].tc - 0.05, HOPS[0].tc + 0.05));
  if (k > 0) {
    const bh = hips ?? hipsAt(W, ring), ch = hipsAt(L, ring);
    f.reach = ([0, 1] as const).map(arm => ['L', arm, onBall(c, bh, W.yaw, puff, (arm ? 1 : -1) * 0.3, ch[1] + 0.45 - bh[1], W.p.sq), k] as ['L', 0 | 1, V3, number]);
  }
  // the last one, down on him: off the mound, onto his back
  const tc = HOPS[2].tc;
  if (T >= tc) {
    const launch: At = { ...L, x: cX(tc), p: cP(tc), z: 0 }, land: At = { ...launch, x: s * 4.95, p: LIE };
    const b = T - tc;
    if (b < PB.fly) {
      const q = b / PB.fly;
      L.x = lerp(launch.x, land.x, q);
      L.p = q < 0.45 ? mixPose(launch.p, SPRAWL, ease(q / 0.45)) : mixPose(SPRAWL, LIE, ease((q - 0.45) / 0.55));
      f.lHips = fly(hipsAt(launch, ring), hipsAt(land, ring), PB.fly, b);
    } else {
      const d = b - PB.fly;
      L.x = land.x; L.p = bounce(LIE, d); L.air = hop(d);
    }
  }
  return f;
}
export const heavy: FinishMove = {
  lands: realAt(PB_K, PB_LAND), done: realAt(PB_K, PB.settle) + 0.25, frame: puffBounce,
  beats(c, fx, t0, t1) {
    const a = pbT(t0), b = pbT(t1);
    if (puff0(c) < 0.85 && crossed(a, b, 0.05)) { const h = fx.at('W', 'head'); fx.word('PUFF!', [h[0], h[1] + 0.8, h[2]], { size: 1.1, fill: '#FFE07A' }); }
    HOPS.forEach((h, i) => {
      if (crossed(a, b, h.t0)) fx.dust(fx.at('W', 'foot0'), 4, 0.7);
      if (crossed(a, b, h.tc)) {
        const m = fx.at('L', 'chest');
        fx.word('POMF!', [m[0], m[1] + 0.6, m[2]], { size: 0.9 + 0.25 * i, fill: '#FFE07A' });
        fx.burst(m, 0.8 + 0.4 * i); fx.kick('L', 3 + 3 * i); fx.kick('W', 4); fx.hit(0.1 + 0.15 * i, 0, 0.5 + 0.3 * i);
        if (i === 1) fx.react('edge');
      }
      if (crossed(a, b, h.t1)) { fx.dust(fx.at('W', 'foot0'), 6, 0.9); fx.dust(fx.at('W', 'foot1'), 6, 0.9); fx.kick('W', 3); }
    });
    if (crossed(a, b, PB.last.t1)) { fx.dust(fx.at('W', 'foot1'), 4, 0.6); fx.kick('W', 2); }
  },
};

// =====================================================================================================================
// POP! (the champion's tight win): driven to his own straw by a swelling belly, heels in, the champion gets his arms
// round the ball, sinks, and squeezes, harder, till the air bursts out of him: POP! (and PFFFT, in the champion's
// face). Fukure shoots backwards out of his arms like a let-go balloon, spinning and wobbling across the ring with the
// air rushing out of him, runs out, and flops down flat on his back out past the straw in the far corner, skidding.
const PO_K: [number, number][] = [[0.9, 0], [0.97, 1]];
const poT = (t: number) => warp(t, PO_K);
const PO = { drive: 0.5, pop: 0.9, te: 0.7, fly: 1.1, skid: 0.35, spin: 19, push: [9, 15] as [number, number] };
const PO_LAND = PO.pop + PO.fly;
/** The squeezed ball: taller and narrower in the champion's arms. */
const SQUEEZED = { ...BRACE, bend: 0.35, head: -0.3, pitch: 0.05, a0x: 0.7, a0z: 1.1, a1x: 0.7, a1z: 1.1 };
const LURCH = { ...DRIVE, bend: 0.85, head: -0.4, a0x: 1.5, a1x: 1.5, a0z: 0.25, a1z: 0.25, a0e: 0.3, a1e: 0.3 };

function popFlight(c: Ctx, rel: At) {
  const s = -c.lSide, ring = c.ring;
  const p0 = hipsAt(rel, ring);
  // (the far corner behind him, past the straw, on the ring's top)
  const aim = { x: -s * 2.38, z: -2.28 };
  const dx = aim.x - p0[0], dz = aim.z - p0[2], dl = Math.hypot(dx, dz), h = [dx / dl, dz / dl];
  const yawAt = (tau: number) => rel.yaw + PO.spin * (tau < PO.te ? tau - (0.35 * tau * tau) / PO.te : 0.65 * PO.te + 0.3 * (tau - PO.te));
  const land: At = { x: aim.x, z: aim.z, yaw: yawAt(PO.fly), p: SPLAT, air: 0 };
  const p1 = hipsAt(land, ring), a: V3 = [h[0] * PO.push[0], PO.push[1], h[1] * PO.push[0]];
  return { p0, p1, a, v0: jetAim(p0, p1, a, PO.te, PO.fly, G), h, land, yawAt };
}
function pop(c: Ctx): Frame {
  const T = poT(c.t), s = -c.lSide, w = c.w, l = c.l;
  const zk = 1 - ease(seg(c.t, 0, 0.5)), press = ease(seg(c.t, 0, 0.25));
  const pk = Math.max(puff0(c), 0.85), E = s * (c.ring.r + 0.02);
  const W = at(w, c.W0.x, BRACE, { z: c.W0.z * zk }), L = at(l, c.L0.x, DRIVE, { z: c.L0.z * zk });
  const f: Frame = { W, L, grip: ease(seg(c.t, 0.05, 0.32)), hold: 0, agitate: 1 };
  // the drive, and the squeeze
  const sqz = ease(seg(T, PO.drive, PO.pop - 0.1)), shake = sqz * Math.sin(T * 47) * 0.025;
  const puff = T < PO.drive ? lerp(puff0(c), pk, ease(seg(T, 0, 0.45))) : T < PO.pop ? pk + shake : pk * (1 - easeOut(seg(T, PO.pop, PO.pop + 0.3)));
  f.puff = puff;
  const wx = (t: number) => lerp(c.W0.x, E, ease(seg(t, 0, PO.drive)));
  const relAt = (t: number): At => {
    const k = ease(seg(t, PO.drive, PO.pop - 0.1));
    return { x: wx(t) - s * hugD(c, t < PO.drive ? lerp(puff0(c), pk, ease(seg(t, 0, 0.45))) : pk, lerp(press * 1.1, 1.15, k)), z: c.L0.z * zk, yaw: face(l),
      p: { ...mixPose(flap(steps({ ...DRIVE, a0x: 0.6, a0z: 1.0, a1x: 0.6, a1z: 1.0 }, t * 15, 0.1), t, 0.5), SQUEEZED, k), sq: 1 + 0.1 * k }, air: 0 };
  };
  W.x = wx(T);
  if (T < PO.pop) {
    // heels at the straw, his arms round the swelling ball; then he sinks and squeezes, shaking with it
    const B = relAt(T); L.x = B.x; L.z = B.z; L.p = c.t < 0.18 ? mixPose(c.L0.p, B.p, ease(c.t / 0.18)) : B.p;
    W.p = from0(c, c.W0, { ...mixPose({ ...BRACE, twist: 0, side: 0, pitch: -0.05 - 0.03 * Math.sin(T * 13), bend: 0.55 }, HUG, sqz), bend: 0.5 + shake });
  } else {
    // POP! out of his arms, backwards, the air rushing out of him
    const tau = T - PO.pop, rel = relAt(PO.pop), F = popFlight(c, rel);
    f.grip = 1 - ease(seg(tau, 0, 0.05));
    const lurch = easeOut(seg(T, PO.pop, PO.pop + 0.45)), back = ease(seg(T, PO.pop + 0.4, PO.pop + 0.9));
    W.x = wx(PO.pop) - s * 0.3 * lurch;
    W.p = mixPose(mixPose(HUG, steps(LURCH, tau * 16, 0.15 * (1 - lurch)), ease(seg(tau, 0, 0.12))), { ...teeter(T), bend: 0.2, l0x: 0.2, l1x: 0.1 }, back);
    W.p = { ...W.p, head: W.p.head - 0.55 * bump(tau, 0.3) };
    W.yaw = lerp(face(w), Math.atan2(F.land.x - W.x, F.land.z - W.z), ease(seg(T, PO.pop + 0.5, PO.pop + 1.1)));
    if (tau < PO.fly) {
      const k = tau / PO.fly, e = Math.min(tau, PO.te) / PO.te;
      const zig = tau < PO.te ? 0.45 * Math.sin(tau * 21) * (1 - e) * (1 - e) : 0;
      const hp = jet(F.p0, F.v0, F.a, PO.te, tau, G);
      f.lHips = [hp[0] - F.h[1] * zig, hp[1], hp[2] + F.h[0] * zig];
      L.x = f.lHips[0]; L.z = f.lHips[2]; L.yaw = F.yawAt(tau);
      const body = mixPose(mixPose(rel.p, FLOP, ease(seg(k, 0, 0.45))), SPLAT, ease(seg(k, 0.55, 1)));
      L.p = { ...body, pitch: lerp(rel.p.pitch, SPLAT.pitch, ease(k)), roll: 0.45 * Math.sin(tau * 11) * (1 - k) };
    } else {
      // flat on his back, skidding on
      const d = tau - PO.fly, sk = 0.28 * easeOut(seg(d, 0, PO.skid));
      L.x = F.land.x + F.h[0] * sk; L.z = F.land.z + F.h[1] * sk; L.yaw = F.land.yaw;
      L.p = bounce(SPLAT, d, 0.25); L.air = hop(d, 0.05);
    }
  }
  return f;
}
export const champTight: FinishMove = {
  lands: realAt(PO_K, PO_LAND), done: realAt(PO_K, PO_LAND) + 0.55, nameAt: 0.95, frame: pop,
  beats(c, fx, t0, t1) {
    const a = poT(t0), b = poT(t1);
    if (puff0(c) < 0.75 && crossed(a, b, 0.12)) { const h = fx.at('L', 'head'); fx.word('PUFF!', [h[0], h[1] + 0.8, h[2]], { size: 1.0, fill: '#FFE07A' }); }
    for (let x = 0.1; x < PO.drive; x += 0.15) if (crossed(a, b, x)) { fx.dust(fx.at('W', 'foot0'), 3, 0.6); fx.kick('W', 0.8); }
    if (crossed(a, b, PO.drive)) fx.react('edge');
    if (c.t >= PO_K[0][0] && t0 < PO_K[0][0]) {
      const h = fx.at('L', 'head');
      fx.word('POP!', [h[0], h[1] + 0.7, h[2]], { size: 1.5, fill: '#FFFFFF', life: 1.0 });
      fx.burst(fx.at('L', 'chest'), 1.6); fx.hit(0.3, 0.4, 1.0); fx.kick('W', 4);
    }
    if (crossed(a, b, PO.pop + 0.04)) { const h = fx.at('W', 'head'); fx.word('PFFFT', [h[0], h[1] + 0.5, h[2]], { size: 0.9, fill: '#F7EFD6', life: 0.9 }); }
    if (crossed(a, b, PO.pop + 0.5)) { const h = fx.at('L', 'head'); fx.word('PFFFT', [h[0], h[1] + 0.4, h[2]], { size: 0.8, fill: '#F7EFD6', life: 0.8 }); }
    if (crossed(a, b, PO_LAND + 0.15)) fx.dust(fx.at('L', 'belly'), 10, 1.2);
  },
};

// =====================================================================================================================
// BIG SQUEEZE (the champion's grand win): Fukure backed to his straw, the champion wraps him up in a bear hug; the
// puffer blows himself up to burst out of it (PUFF!), the champion's hands kept on his belt round the swelling, his
// feet bracing; then he squeezes it all back out of him (PFFFT), stepping in as the ball goes down, till there's
// nothing left but a limp bag of a fish; sinks under him, lifts him off his feet, carries him a step to the straw and
// heaves him out over it: Fukure turns over in the air and lands flat on his back off the mound.
const BS_K: [number, number][] = [[2.15, 0.45], [2.5, 1]];
const bsT = (t: number) => warp(t, BS_K);
const BS = { close: 0.35, swell: 0.7, squeeze: 1.4, lift: 1.8, carry: 2.12, heave: 2.4, fly: 0.5, up: 0.38, step: 0.38 };
const BS_LAND = BS.heave + BS.fly;

function bigSqueeze(c: Ctx): Frame {
  const T = bsT(c.t), s = c.lSide, w = c.w, l = c.l, ring = c.ring;
  const zk = 1 - ease(seg(c.t, 0, 0.5)), press = ease(seg(c.t, 0, 0.3));
  const E = s * (c.ring.r + 0.02);
  const puff = T < BS.close ? puff0(c) : T < BS.swell ? lerp(puff0(c), 1, easeOut(seg(T, BS.close, BS.swell - 0.05))) : 1 - ease(seg(T, BS.swell + 0.05, BS.squeeze - 0.05));
  const W = at(w, c.W0.x, DRIVE, { z: c.W0.z * zk }), L = at(l, c.L0.x, BRACE, { z: c.L0.z * zk });
  const f: Frame = { W, L, grip: ease(seg(c.t, 0.04, 0.3)), hold: 0, puff, agitate: T < BS.squeeze ? 1 : 0 };
  const lx = lerp(c.L0.x, E, ease(seg(T, 0, BS.close)));
  const carry = s * BS.step * ease(seg(T, BS.lift, BS.carry));
  L.x = lx + carry; W.x = lx + carry - s * hugD(c, puff, press);
  const lift = ease(seg(T, BS.lift - 0.28, BS.lift)), sink = bump(T - (BS.lift - 0.4), 0.16);
  const heldP = (t: number): Pose => ({ ...steps({ ...LIFT, pitch: -0.1 }, (t - BS.lift) * 14, 0.13 * bump(t - BS.lift, BS.carry - BS.lift)) });
  const bossHeld = (t: number): At => ({ ...L, x: lx + s * BS.step * ease(seg(t, BS.lift, BS.carry)), z: 0, air: BS.up + 0.03 * Math.sin((t - BS.lift) * 14), p: DANGLE });
  if (T < BS.close) {
    W.p = from0(c, c.W0, mixPose(DRIVE, HUG, ease(seg(T, 0, BS.close)))); L.p = from0(c, c.L0, { ...BRACE, pitch: -0.1 - 0.04 * Math.sin(T * 13) });
  } else if (T < BS.swell) {
    // he blows up against it, and the champion braces, his feet working
    const k = seg(T, BS.close, BS.swell);
    W.p = steps({ ...HUG, bend: 0.5 + 0.1 * k }, T * 18, 0.1); L.p = flap(mixPose(BRACE, { ...BALL, a0x: 0.9, a1x: 0.9 }, ease(k)), T, k);
  } else if (T < BS.squeeze) {
    // the squeeze: the air comes out, the champion steps in as the ball goes down, and he goes limp
    const k = ease(seg(T, BS.swell, BS.squeeze)), shake = Math.sin(T * 41) * 0.03 * (1 - k);
    W.p = { ...steps(HUG, T * 12, 0.08 * (1 - k)), bend: 0.55 + shake, l0k: HUG.l0k + 0.15, l1k: HUG.l1k + 0.15 };
    L.p = { ...mixPose(flap({ ...BALL, a0x: 0.9, a1x: 0.9 }, T, 1 - k), LIMP, k), sq: 1 + 0.06 * Math.sin(Math.PI * k) };
  } else if (T < BS.lift) {
    // sinks under him, and lifts him off his feet
    W.p = { ...mixPose(HUG, { ...LIFT, pitch: -0.1 }, lift), l0k: lerp(HUG.l0k, LIFT.l0k, lift) + 0.4 * sink, l1k: lerp(HUG.l1k, LIFT.l1k, lift) + 0.4 * sink };
    L.p = mixPose(LIMP, DANGLE, lift); L.air = BS.up * lift;
  } else if (T < BS.carry) {
    // a step out to the straw with him
    W.p = heldP(T); const B = bossHeld(T); L.p = B.p; L.air = B.air;
  } else {
    // the heave: out over the straw, he's let go and turns over onto his back, flat off the mound
    const B = bossHeld(BS.carry), pa = hipsAt(B, ring), land: At = { ...B, x: s * 4.95, air: 0, p: LIE };
    const pr: V3 = [pa[0] + s * 0.4, pa[1] + 0.18, pa[2]], p1 = hipsAt(land, ring);
    const vr: V3 = [(p1[0] - pr[0]) / BS.fly, (p1[1] - pr[1]) / BS.fly + 0.5 * G * BS.fly, 0];
    const hk = seg(T, BS.carry, BS.heave);
    W.x = lx + s * BS.step - s * hugD(c, 0) + s * 0.15 * ease(hk);
    if (T < BS.heave) {
      f.lHips = herm(pa, [0, 0, 0], pr, vr, BS.heave - BS.carry, hk);
      L.x = f.lHips[0]; L.p = { ...DANGLE, pitch: -0.45 * ease(hk), l0x: 0.35 + 0.5 * hk };
      W.p = mixPose({ ...LIFT, pitch: -0.1, l0k: LIFT.l0k + 0.3, l1k: LIFT.l1k + 0.3 }, THROW, ease(seg(hk, 0.25, 1)));
      f.grip = 1 - ease(seg(hk, 0.3, 0.7));
    } else {
      const b = T - BS.heave;
      f.grip = 0;
      W.p = mixPose(THROW, teeter(T), ease(seg(b, 0, 0.3)));
      W.x -= s * 0.15 * ease(seg(b, 0.4, 0.9));
      if (b < BS.fly) {
        const q = b / BS.fly, from = { ...DANGLE, pitch: -0.45, l0x: 0.85 };
        L.x = lerp(pr[0], land.x, q);
        L.p = q < 0.5 ? mixPose(from, { ...SPRAWL, pitch: -0.9 }, ease(q * 2)) : mixPose({ ...SPRAWL, pitch: -0.9 }, LIE, ease(q * 2 - 1));
        f.lHips = fly(pr, p1, BS.fly, b);
      } else {
        const d = b - BS.fly;
        L.x = land.x; L.p = bounce(d < 0.14 ? LIE : mixPose(LIE, SPLAT, ease(seg(d, 0.14, 0.4))), d, 0.25); L.air = hop(d, 0.05);
      }
    }
  }
  return f;
}
export const champGrand: FinishMove = {
  lands: realAt(BS_K, BS_LAND), done: realAt(BS_K, BS_LAND) + 0.5, nameAt: 0.9, frame: bigSqueeze,
  beats(c, fx, t0, t1) {
    const a = bsT(t0), b = bsT(t1);
    if (crossed(a, b, BS.close + 0.02)) { const h = fx.at('L', 'head'); fx.word('PUFF!', [h[0], h[1] + 0.9, h[2]], { size: 1.2, fill: '#FFE07A' }); fx.kick('L', 4); }
    if (crossed(a, b, BS.swell + 0.12)) { const h = fx.at('L', 'head'); fx.word('PFFFT', [h[0], h[1] + 0.8, h[2]], { size: 1.2, fill: '#F7EFD6', life: 1.2 }); fx.react('edge'); }
    if (crossed(a, b, BS.lift - 0.1)) { fx.kick('W', 2); fx.dust(fx.at('W', 'foot0'), 4, 0.7); }
    for (const x of [BS.lift + 0.12, BS.lift + 0.26]) if (crossed(a, b, x)) fx.dust(fx.at('W', 'foot1'), 4, 0.7);
    if (crossed(a, b, BS.carry + 0.15)) { fx.hit(0, 0, 1.0); fx.kick('W', 3); }
    void c;
  },
};

// =====================================================================================================================
// BIG SQUEEZE, the perfect slam (the epic): the bear hug, and Fukure blows himself up as big as he's ever been; the
// champion sinks into his stance and squeezes, the ball straining and quivering in his arms, till it goes: POP! Frozen;
// then the puffer rockets straight up out of his arms like a let-go balloon, flipped head down with the air jetting out
// of his mouth, spinning and zigzagging up under the beams, the champion blown back a step and staring up after him.
// The air runs out: he hangs up there, a limp empty bag, in slow motion... and drops like a stone, flat on his back
// into the cellar's floor off the mound, a crater of dust and a shockwave; the champion's stamp lands with him.
/** The epic's gravity: an anime's, heavier than life (the same through the move). */
const GE = 16;
const EP = { close: 0.3, swell: 0.7, pop: 1.62, te: 1.0, top: 5.3, vTop: 0.9 };
/** Where his middle lies at the bottom, on the floor (lying on his back). */
const LIE_Y = hipsAt({ x: 0, z: 0, yaw: 0, p: LIE, air: 0 }, { ground: () => 0 } as unknown as Ring)[1];
const EP_DROP = (EP.vTop + Math.sqrt(EP.vTop ** 2 + 2 * GE * (EP.top - LIE_Y))) / GE;
const EP_LAND = EP.pop + EP.te + EP_DROP;
const EP_K0: [number, number][] = [[EP.pop, 0], [EP.pop + 0.18, 1], [EP.pop + 0.18 + EP.te - 0.05, 0.25], [EP.pop + 0.18 + EP.te - 0.05 + 0.6, 1]];
const EP_LANDR = realAt(EP_K0, EP_LAND);
const EP_K: [number, number][] = [...EP_K0, [EP_LANDR, 0], [EP_LANDR + 0.16, 1]];
const epT = (t: number) => warp(t, EP_K);
const SHIELD = pose({ bend: -0.1, head: -0.35, a0x: 2.3, a0z: 0.5, a0e: 1.3, a1x: 2.1, a1z: 0.6, a1e: 1.4, l0x: 0.5, l0z: 0.5, l0k: 0.8, l1x: -0.2, l1z: 0.35, l1k: 0.2 });
const LOOK_UP = pose({ bend: -0.22, head: -0.75, a0x: 0.3, a0z: 0.4, a0e: 0.4, a1x: 0.3, a1z: 0.4, a1e: 0.4, l0x: 0.3, l0z: 0.5, l0k: 0.5, l1x: 0.3, l1z: 0.5, l1k: 0.5 });

function epicFlight(c: Ctx, rel: At) {
  const s = c.lSide, ring = c.ring;
  const p0 = hipsAt(rel, ring), land: At = { x: s * 5.05, z: 0.25, yaw: face(c.l), p: SPLAT, air: 0 }, p1 = hipsAt(land, ring);
  const pe: V3 = [s * 4.55, EP.top, 0.15];
  const ve: V3 = [(p1[0] - pe[0]) / EP_DROP, EP.vTop, (p1[2] - pe[2]) / EP_DROP];
  return { p0, p1, pe, ve, land, ...jetFit(p0, pe, ve, EP.te, GE) };
}
function epicMove(c: Ctx): Frame {
  const T = epT(c.t), s = c.lSide, w = c.w, l = c.l;
  const zk = 1 - ease(seg(c.t, 0, 0.4)), press = ease(seg(c.t, 0, 0.25));
  const E = s * (c.ring.r + 0.02);
  const strain = ease(seg(T, EP.swell, EP.pop)), quiver = Math.sin(T * 53) * 0.03 * strain;
  const puff = T < EP.close ? puff0(c) : T < EP.pop ? lerp(puff0(c), 1, easeOut(seg(T, EP.close, EP.swell))) : 1 - easeOut(seg(T, EP.pop, EP.pop + EP.te * 0.8));
  const W = at(w, c.W0.x, DRIVE, { z: c.W0.z * zk }), L = at(l, c.L0.x, BRACE, { z: c.L0.z * zk });
  const f: Frame = { W, L, grip: ease(seg(c.t, 0.03, 0.26)), hold: 0, puff, agitate: 1, cam: { take: true, y: 0.3 * strain, wide: 0.1 * strain } };
  const lx = lerp(c.L0.x, E, ease(seg(T, 0, EP.close)));
  const relAt = (t: number): At => {
    const k = seg(t, EP.close, EP.swell), st = ease(seg(t, EP.swell, EP.pop));
    return { ...L, x: lx, z: 0, air: 0, p: { ...flap(mixPose(BRACE, { ...BALL, a0x: 0.9, a1x: 0.9 }, ease(k)), t, k), sq: 1 + 0.12 * st + Math.sin(t * 53) * 0.03 * st } };
  };
  const wAt = (t: number) => lx - s * hugD(c, t < EP.pop ? lerp(puff0(c), 1, easeOut(seg(t, EP.close, EP.swell))) : 1, press);
  if (T < EP.pop) {
    // the hug; he blows up as big as he's ever been; the squeeze, the ball quivering, the champion sunk deep
    const B = relAt(T); L.x = B.x; L.p = c.t < 0.18 ? mixPose(c.L0.p, B.p, ease(c.t / 0.18)) : B.p;
    W.x = wAt(T);
    W.p = T < EP.swell ? from0(c, c.W0, steps(mixPose(DRIVE, HUG, ease(seg(T, 0, EP.close))), T * 18, 0.1 * seg(T, EP.close, EP.swell))) : { ...mixPose(HUG, POWER, strain), bend: POWER.bend + quiver };
    return f;
  }
  // POP: up and away
  const tau = T - EP.pop, rel = relAt(EP.pop), F = epicFlight(c, rel);
  f.grip = 1 - ease(seg(tau, 0, 0.04));
  // the champion: blown back a step by the jet, staring up after him; then the stamp, landing with him
  const blown = easeOut(seg(tau, 0, 0.45)), up = ease(seg(tau, 0.3, 0.8));
  W.x = wAt(EP.pop) - s * 0.42 * blown;
  const legUp = ease(seg(T, EP_LAND - 0.62, EP_LAND - 0.2)), stamp = ease(seg(T, EP_LAND - 0.1, EP_LAND));
  let wp = mixPose(mixPose(POWER, steps(SHIELD, tau * 16, 0.14 * (1 - blown)), ease(seg(tau, 0, 0.1))), LOOK_UP, up);
  if (legUp > 0) wp = mixPose(wp, mixPose(shikoUp(0), SHIKO_LOW, stamp), legUp);
  W.p = wp;
  const climb = T < EP_LAND ? 1 : 1 - ease(seg(T, EP_LAND, EP_LAND + 0.5));
  if (tau < EP.te) {
    // the rocket: flipped head down, the air jetting out of his mouth, spinning, zigzagging up under the beams
    const e = tau / EP.te, env = (1 - e) * (1 - e), hp = jet(F.p0, F.v0, F.a, EP.te, tau, GE);
    f.lHips = [hp[0] + 0.55 * Math.sin(tau * 17) * env, hp[1], hp[2] + 0.75 * Math.sin(tau * 11 + 0.5) * env];
    L.x = f.lHips[0]; L.z = f.lHips[2];
    L.yaw = face(l) + 16 * (tau - (0.4 * tau * tau) / EP.te);
    const flip = ease(seg(tau, 0.04, 0.32));
    L.p = { ...mixPose(rel.p, flap(TUCK, T, 1 - e), ease(seg(tau, 0, 0.2))), sq: lerp(rel.p.sq, 1.06, e), pitch: 2.85 * flip + 0.25 * Math.sin(tau * 13) * env, roll: 0.3 * Math.sin(tau * 9) * env };
    f.cam = { take: true, y: lerp(0.3, 4.2, ease(seg(tau, 0, 0.7))), wide: lerp(0.1, 0.7, ease(seg(tau, 0, 0.6))) };
  } else if (T < EP_LAND) {
    // spent: he hangs up there, empty... and drops like a stone, turning over onto his back as he falls
    const d = tau - EP.te, k = d / EP_DROP;
    f.lHips = add(add(F.pe, F.ve, d), [0, -0.5 * GE * d * d, 0]);
    L.x = f.lHips[0]; L.z = f.lHips[2];
    L.yaw = face(l) + 16 * (EP.te - 0.4 * EP.te) + 1.5 * d;
    L.yaw = lerp(L.yaw, F.land.yaw + Math.PI * 2 * Math.round((L.yaw - F.land.yaw) / (Math.PI * 2)), ease(k));
    const flat = mixPose({ ...LIMP, a0x: 2.5, a1x: 2.4, a0z: 1.2, a1z: 1.2, l0x: 0.9, l1x: 1.1 }, SPLAT, ease(seg(k, 0.5, 1)));
    L.p = { ...flat, pitch: lerp(2.85, 2 * Math.PI + SPLAT.pitch, ease(seg(k, 0.0, 0.85))), seat: lerp(0.3, 1, ease(seg(k, 0.4, 1))) };
    const hy = f.lHips[1] - 0.6;
    f.cam = { take: true, y: Math.max(0.6, Math.min(4.4, hy * 0.85)), wide: lerp(0.7, 0.45, ease(k)) };
  } else {
    // into the floor: flat in a crater, squashed, a little bounce
    const d = T - EP_LAND;
    L.x = F.land.x; L.z = F.land.z; L.yaw = F.land.yaw;
    L.p = d < 0.2 ? { ...SPLAT, sq: 1 - 0.3 * Math.sin((d / 0.2) * Math.PI) } : SPLAT; L.air = d < 0.26 ? 0.06 * Math.sin((d / 0.26) * Math.PI) * (d > 0.2 ? 1 : 0.3) : 0;
    f.cam = { take: true, y: 0.6 * climb, wide: 0.45 * climb };
  }
  return f;
}
export const epic: FinishMove = {
  lands: EP_LANDR, done: EP_LANDR + 0.16 + 0.95, nameAt: EP.pop + 0.06, frame: epicMove,
  beats(c, fx, t0, t1) {
    const a = epT(t0), b = epT(t1);
    if (crossed(a, b, EP.close + 0.02)) { const h = fx.at('L', 'head'); fx.word('PUFF!', [h[0], h[1] + 1.0, h[2]], { size: 1.5, fill: '#FFE07A' }); fx.kick('L', 6); fx.hit(0.15, 0, 0.6); }
    if (crossed(a, b, EP.swell + 0.1)) { fx.screen({ lines: 0.45, for: 0.9 }); fx.burst(fx.at('W', 'chest'), 0.9); fx.react('edge'); }
    for (const x of [EP.swell + 0.35, EP.swell + 0.6, EP.swell + 0.8]) if (crossed(a, b, x)) { fx.kick('L', 3); fx.dust(fx.at('W', 'foot0'), 4, 0.8); }
    // the POP, frozen: an impact frame
    if (c.t >= EP.pop && t0 < EP.pop) {
      const h = fx.at('L', 'head');
      fx.screen({ impact: true, flash: 'white', lines: 1, for: 0.9 });
      fx.word('POP!', [h[0], h[1] + 0.8, h[2]], { size: 2.0, fill: '#FFFFFF', life: 1.2 });
      fx.burst(fx.at('L', 'chest'), 2.4); fx.hit(0.6, 0.8, 1.3); fx.dust(fx.at('W', 'foot0'), 14, 1.6);
    }
    if (crossed(a, b, EP.pop + 0.25)) { const h = fx.at('L', 'head'); fx.word('PFFFT', [h[0], h[1] - 0.4, h[2]], { size: 1.3, fill: '#F7EFD6', life: 1.0 }); fx.react('charge'); }
    if (crossed(a, b, EP.pop + EP.te - 0.02)) { const h = fx.at('L', 'head'); fx.word('pfft...', [h[0], h[1] + 0.3, h[2]], { size: 0.7, fill: '#F7EFD6', life: 1.2 }); }
    if (crossed(a, b, EP.pop + EP.te + EP_DROP * 0.55)) fx.screen({ lines: 1, for: 0.5 });
    if (c.t >= EP_LANDR && t0 < EP_LANDR) {
      const m = fx.at('L', 'belly'), g: V3 = [m[0], 0.05, m[2]];
      fx.screen({ impact: true, flash: 'white', lines: 1, for: 0.7 });
      fx.hit(1.2, 1, 1.6); fx.burst(g, 3); fx.dust(g, 60, 3.2); fx.kick('L', 12); fx.react('win');
      for (let i = 0; i < 10; i++) { const r = 1.3, q = (i / 10) * Math.PI * 2; fx.dust([g[0] + Math.cos(q) * r, 0.05, g[2] + Math.sin(q) * r], 6, 1.6); }
      fx.dust(fx.at('W', 'foot0'), 12, 1.4);
    }
  },
};
