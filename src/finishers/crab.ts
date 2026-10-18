// Yokobashiri's finishers (the crab): everything he does goes sideways, and his claws do the holding.
//  - tight (SIDE STEP): heels on his own straw, he lets go and scuttles sideways out of the way at the last instant;
//    the champion's charge has nothing to push, he stumbles on over the straw and dives off the mound face first, and
//    the crab nips his backside with the big claw as he goes by.
//  - heavy (CRAB SHUFFLE): he hoists the champion up across his raised claws, scuttles sideways along the straw with
//    him kicking up there, and heaves him off the mound.
//  - champTight (SHELL FLIP): the champion, at his own straw, gets under him and flips him over onto his shell, where
//    he rocks, legs and claws waving.
//  - champGrand (LIFT-OUT): the champion lifts him by the belt, his legs pedalling sideways in the air, swings him
//    round over the straw, sets him down outside it and bumps him over onto his shell.
//  - epic: the lift-out gone wild: lifted and spun like a top, flung up to the beams, he comes down flat on his shell
//    spinning like a coin, into a crater, and goes on spinning there.
import {
  at, clamp01, lerpV, crossed, DOWN_FRONT, ease, easeIn, easeOut, face, type FinishMove, fly, flyV, hipsAt, lerp, seg, type Ctx,
  type Frame, type V3, warp, yawTo, type At,
} from '../finishRig';
import { BRACE, DRIVE, FIST, GRIP, LIE, LIFT, SHOVE, sideways, STAND, steps, walk } from '../poses';
import { mixPose, type Pose, pose } from '../rikishi';

// ---------- his own poses and helpers ----------
/** Belly to belly, pressed close enough for the hands to be on the belt. */
const CLOSE = 0.85;
/** The crab's stance: feet wide apart sideways, low, braced. */
const CRAB_LOW = pose({ l0x: 0.35, l0z: 0.72, l0k: 0.85, l1x: 0.35, l1z: 0.72, l1k: 0.85, bend: 0.38, head: -0.1, a0x: 1.0, a0z: 0.2, a0e: 1.0, a1x: 1.0, a1z: 0.2, a1e: 1.0 });
/** His scuttle, low: `sideways` with his knees bent. */
const scuttle = (ph: number, low = 0.8) => {
  const p = sideways(ph);
  return { ...p, l0k: p.l0k + 0.5 * low, l1k: p.l1k + 0.5 * low, l0x: p.l0x + 0.2 * low, l1x: p.l1x + 0.2 * low, bend: p.bend + 0.15 * low };
};
/** Both claws up and snapping (`t` keeps them going): his win. */
const clawsUp = (t: number): Pose => pose({
  l0z: 0.45, l1z: 0.45, l0x: 0.15, l1x: 0.15, l0k: 0.25, l1k: 0.25, bend: -0.05, head: 0.15,
  a0x: 2.5 + 0.12 * Math.sin(t * 9), a0z: 0.55, a0e: 0.7 + 0.6 * Math.max(0, Math.sin(t * 11)),
  a1x: 2.35 + 0.12 * Math.sin(t * 9 + 2), a1z: 0.6, a1e: 0.7 + 0.6 * Math.max(0, Math.sin(t * 11 + 2.2)),
});
/** On his back on his shell, legs and claws waving in the air (`t` keeps them going, `k` how wildly). */
const onShell = (t: number, k = 1): Pose => pose({
  seat: 1, pitch: -1.4, up: 0.1, bend: 0.1, head: 0.45,
  l0x: 1.55 + 0.35 * k * Math.sin(t * 13), l0z: 0.6 + 0.2 * k * Math.sin(t * 9), l0k: 1.0 + 0.5 * k * Math.max(0, Math.sin(t * 13 + 1)),
  l1x: 1.55 + 0.35 * k * Math.sin(t * 13 + 3), l1z: 0.6 + 0.2 * k * Math.sin(t * 9 + 2), l1k: 1.0 + 0.5 * k * Math.max(0, Math.sin(t * 13 + 4)),
  a0x: 2.4 + 0.45 * k * Math.sin(t * 10), a0z: 0.7, a0e: 0.6 + 0.7 * Math.max(0, Math.sin(t * 15)),
  a1x: 2.3 + 0.45 * k * Math.sin(t * 10 + 2.5), a1z: 0.75, a1e: 0.6 + 0.7 * Math.max(0, Math.sin(t * 15 + 2)),
});
/** The champion tripping forward on nothing: running to catch himself, tipping on, his arms out in front. */
const stumble = (ph: number, k: number, t: number): Pose => ({
  ...walk(ph, 0.55), pitch: 0.45 * k, bend: 0.45 + 0.15 * k, head: -0.05,
  a0x: 1.7 + 0.5 * Math.sin(t * 17), a0z: 0.5, a0e: 0.3, a1x: 1.7 + 0.5 * Math.sin(t * 17 + 2.5), a1z: 0.5, a1e: 0.3,
});
/** Turns `v` (offsets from a man's hips, as he stands) as his body's turned: rolled, tipped, then faced. */
function turn(v: V3, yaw: number, pitch = 0, roll = 0): V3 {
  // (rikishi.ts: the body's rotation is Rx(pitch)·Rz(roll), under the root's Ry(yaw))
  let [x, y, z] = v;
  [x, y] = [x * Math.cos(roll) - y * Math.sin(roll), x * Math.sin(roll) + y * Math.cos(roll)];
  [y, z] = [y * Math.cos(pitch) - z * Math.sin(pitch), y * Math.sin(pitch) + z * Math.cos(pitch)];
  [x, z] = [x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)];
  return [x, y, z];
}
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
/** A cubic from p0 (velocity v0) to p1 (velocity v1) over `T` seconds: where it is at `u`. */
function hermite(p0: V3, v0: V3, p1: V3, v1: V3, T: number, u: number): V3 {
  const s = clamp01(u / T), s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  return [0, 1, 2].map(i => h00 * p0[i] + h10 * T * v0[i] + h01 * p1[i] + h11 * T * v1[i]) as V3;
}
/** The angle `a` brought within a half turn of 0. */
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Where the crab's belt is at the back of a man's middle, from his hips: half his belly's depth behind them. */
const beltBack = (girth: number) => (0.34 * girth + 0.03) * 0.92;

// ======================================================================================================
// SIDE STEP (tight: the crab wins, heels on his own straw)
// ======================================================================================================
/** Its clock: slowed while the champion's in the air, off the mound. */
const SS_EDGE = 1.4, SS_FLY = 0.55, SS_LAND = SS_EDGE + SS_FLY;
const ssTau = (t: number) => warp(t, [[SS_EDGE, 0.5], [SS_EDGE + SS_FLY / 0.5, 1]]);
/** When he lets go and steps aside; how far aside he goes (north, behind the champion's path from the camera). */
const SS_GO = 0.55, SS_ASIDE = -1.0;
/** The champion's lunge: how fast he's going as the crab vanishes from in front of him. */
const SS_V0 = 1.6;
/** The nip: the big claw on the champion's backside as he passes. */
const SS_NIP = 1.1, SS_NIP_LEN = 0.18;
/** Face down, his legs out straight behind him. */
const FACE_DOWN = DOWN_FRONT;
/** His belly skid. */
const SS_SKID = 0.3;

function sideStep(c: Ctx): Frame {
  const T = ssTau(c.t), s = -c.lSide, zk = 1 - ease(seg(c.t, 0, 0.5));
  // the crab (W) at his own straw (west of the champion when s is -1); the champion (L) driving him there
  const W = at(c.w, c.W0.x, CRAB_LOW, { z: c.W0.z * zk }), L = at(c.l, c.L0.x, DRIVE, { z: c.L0.z * zk });
  const f: Frame = { W, L, grip: 1, hold: 1 };
  const close = c.D * CLOSE, take = ease(seg(c.t, 0, 0.15));
  // the crab's heels give an inch to the straw, then hold
  const heel = s * (c.ring.r - 0.2);
  const wx = lerp(c.W0.x, heel, ease(seg(T, 0, SS_GO)));
  W.x = wx; W.p = mixPose(GRIP, { ...CRAB_LOW, l0k: 0.85 + 0.05 * Math.sin(T * 23), l1k: 0.85 + 0.05 * Math.cos(T * 23) }, ease(seg(T, 0, 0.25)));
  // the champion driving, and gathering himself for the last shove
  const xA = wx - s * close;
  const gather = Math.sin(Math.PI * seg(T, 0.32, SS_GO)) * (T < SS_GO ? 1 : 0);
  // the run: from the last shove to the mound's edge, faster and faster, tipping on
  const edge = s * (c.ring.half - 0.08), dE = Math.abs(edge - xA), RUN = SS_EDGE - SS_GO, acc = (2 * (dE - SS_V0 * RUN)) / (RUN * RUN);
  if (T < SS_GO) {
    L.x = xA; L.p = { ...steps(DRIVE, T * 16, 0.1), l0k: DRIVE.l0k + 0.4 * gather, l1k: DRIVE.l1k + 0.25 * gather, bend: DRIVE.bend + 0.1 * gather };
  } else if (T < SS_EDGE) {
    const u = T - SS_GO, d = SS_V0 * u + 0.5 * acc * u * u, k = u / RUN;
    L.x = xA + s * d; L.p = stumble(d * 4.2, ease(k), T);
    f.hold = 1 - ease(seg(T, SS_GO, SS_GO + 0.08));
  } else {
    // off the edge: face first through the air, arms out in front, and down on the clay with a skid
    const from: At = { ...L, x: edge, p: stumble(dE * 4.2, 1, SS_EDGE) };
    const to: At = { ...L, x: s * (c.ring.half + 1.45), p: { ...FACE_DOWN, a0x: 2.6, a1x: 2.6, a0z: 0.5, a1z: 0.5 } };
    const p0 = hipsAt(from, c.ring), p1 = hipsAt(to, c.ring);
    f.hold = 0;
    if (T < SS_LAND) {
      const u = T - SS_EDGE, k = u / SS_FLY;
      L.x = lerp(from.x, to.x, k);
      L.p = { ...mixPose(from.p, to.p, ease(k)), l0x: lerp(from.p.l0x, -0.2, k), l1x: lerp(from.p.l1x, 0.1, k) };
      f.lHips = fly(p0, p1, SS_FLY, u);
    } else {
      // down on his belly with a bounce, skidding on
      const b = T - SS_LAND;
      L.x = to.x + s * 0.12 * easeOut(seg(b, 0, SS_SKID));
      L.p = b < 0.14 ? { ...to.p, sq: 1 - 0.15 * Math.sin((b / 0.14) * Math.PI) } : mixPose(to.p, FACE_DOWN, ease(seg(b, 0.14, SS_SKID)));
      L.air = b < 0.22 ? 0.06 * Math.sin((b / 0.22) * Math.PI) : 0;
    }
  }
  // the crab: lets go and scuttles aside, two quick steps; turns to watch him go by, nips him; then claws up
  f.grip = take * (1 - ease(seg(T, SS_GO - 0.04, SS_GO + 0.04))); f.hold = (f.hold as number) * take;
  if (T >= SS_GO - 0.04) {
    const k = seg(T, SS_GO - 0.02, SS_GO + 0.3);
    W.z = c.W0.z * zk + SS_ASIDE * ease(k);
    if (k < 1) W.p = mixPose(W.p, scuttle(k * Math.PI * 2, 0.8), Math.min(1, k * 6));
    else W.p = mixPose(scuttle(0, 0.8), CRAB_LOW, ease(seg(T, SS_GO + 0.3, SS_GO + 0.4)));
    // (turning to his right, to the champion's path)
    W.yaw = face(c.w) + (s < 0 ? -1 : 1) * 0.55 * ease(seg(T, SS_GO + 0.2, SS_NIP));
    // the nip: the big claw (his right) on the champion's backside
    const nip = Math.sin(Math.PI * seg(T, SS_NIP - SS_NIP_LEN / 2, SS_NIP + SS_NIP_LEN / 2));
    if (nip > 0) {
      // (the back of his belt on the crab's side, and the big claw's pincers closing on it: the hand short of it)
      const hips = hipsAt(L, c.ring), back = add(hips, [-s * beltBack(c.L.girth) * 0.7, -0.02, -0.36]);
      const sh = add(hipsAt(W, c.ring), turn([-0.57, 0.5, 0], W.yaw));
      const to = sub(back, sh), n = Math.hypot(...to), hand = add(sh, mul(to, Math.max(0.3, n - 0.3) / n));
      W.p = { ...W.p, side: -0.3 * nip, a1e: 1.5 };
      f.reach = [['W', 1, hand, Math.min(1, nip * 1.6)]];
    }
    if (T > SS_NIP + 0.15) {
      // he watches him go, then his win: claws up and snapping
      const k2 = ease(seg(T, SS_LAND - 0.1, SS_LAND + 0.25));
      W.yaw = lerp(W.yaw, yawTo(W, L), ease(seg(T, SS_NIP + 0.15, SS_LAND)));
      W.p = mixPose(CRAB_LOW, clawsUp(T), k2);
    }
  }
  return f;
}

export const tight: FinishMove = {
  lands: SS_EDGE + SS_FLY / 0.5 + 0.01, done: 3.05, front: true, frame: sideStep,
  beats(c, fx, t0, t1) {
    const a = ssTau(t0), b = ssTau(t1);
    // his heels scraping at the straw; then gone, two quick scuttles, and the champion's feet running on
    for (const s of [0.12, 0.3, 0.45]) if (crossed(a, b, s)) { fx.dust(fx.at('W', 'foot0'), 3, 0.6); fx.kick('W', 0.8); }
    if (crossed(a, b, SS_GO)) { fx.react('upset'); fx.kick('L', 2); }
    for (const s of [SS_GO + 0.1, SS_GO + 0.25]) if (crossed(a, b, s)) fx.dust(fx.at('W', s < SS_GO + 0.2 ? 'foot0' : 'foot1'), 4, 0.7);
    if (crossed(a, b, SS_NIP)) { fx.word('SNIP!', fx.at('W', 'hand1'), { size: 1.1 }); fx.kick('L', 3); }
    for (const s of [0.95, 1.12, 1.27]) if (crossed(a, b, s)) fx.dust(fx.at('L', s === 1.12 ? 'foot1' : 'foot0'), 4, 0.8);
    if (crossed(a, b, SS_EDGE)) { fx.react('edge'); fx.hit(0, 0, 1.1); }
    // claws up
    if (crossed(a, b, SS_LAND + 0.3)) fx.word('SNIP!', fx.at('W', 'hand0'));
    if (crossed(a, b, SS_LAND + 0.5)) fx.word('CLACK!', fx.at('W', 'hand1'));
    void c;
  },
};

// ======================================================================================================
// CRAB SHUFFLE (heavy: the crab wins big, the champion driven to his own straw)
// ======================================================================================================
// The crab's arms are short and the champion's belly deep: what holds him up over the crab's head is the big claw,
// the fiddler's one, its pincers shut on the back of his belt and the arm straight up off the crab's right shoulder,
// the crab leaning the other way under the weight. The small claw does the clean with it and then snaps at his feet.
/** Its beats: the sink, the hoist to his chest (both claws on the belt), the dip, the press up onto the big claw, the
 *  scuttle along the straw, the wind-up, the heave, and he lets go. */
const CS_SINK = 0.2, CS_CLEAN = 0.42, CS_DIP = 0.72, CS_PRESS = 0.82, CS_UP = 1.05, CS_GO = 1.12, CS_WIND = 1.82, CS_HEAVE = 2.0, CS_LET = 2.18;
/** The flight off the mound (slowed at its start). */
const CS_FLY = 0.62, CS_LAND = CS_LET + CS_FLY;
const csTau = (t: number) => warp(t, [[CS_LET, 0.5], [CS_LET + 0.24 / 0.5, 1]]);
/** How far he scuttles along the straw, sideways to his right (south, towards us), and in towards it. */
const CS_ALONG = 0.85, CS_IN = 0.25;
/** The champion up there: on his back, kicking his legs and waving his arms. */
const hoisted = (t: number): Pose => pose({
  pitch: -1.45, bend: 0.2, head: 0.4,
  l0x: 0.8 + 0.45 * Math.sin(t * 13), l0z: 0.25, l0k: 0.4 + 0.7 * Math.max(0, Math.sin(t * 13 + 1)),
  l1x: 0.8 + 0.45 * Math.sin(t * 13 + 3), l1z: 0.25, l1k: 0.4 + 0.7 * Math.max(0, Math.sin(t * 13 + 4)),
  a0x: 2.3 + 0.5 * Math.sin(t * 11), a0z: 1.0, a0e: 0.4, a1x: 2.1 + 0.5 * Math.sin(t * 11 + 2), a1z: 1.0, a1e: 0.4,
});
/** The crab's right shoulder (the big claw's), from where he stands. */
const rightShoulder = (W: At, ring: Ctx['ring']) => add(hipsAt(W, ring), turn([-0.57, 0.55, 0.03], W.yaw));
/** The back of a man's belt (its bottom, as he lies on his back), from his hips as he's turned. */
const beltBottom = (c: Ctx, hips: V3, L: At) => add(hips, turn([0, -0.02, -beltBack(c.L.girth)], L.yaw, L.p.pitch, L.p.roll));
/** How far the big claw's pincers reach past its hand (the hand's held that far short of what it holds). */
const PINCER = 0.36;
/** The big claw's hand on its way to `to`: pincers on it, the hand short of it. */
function bigClaw(sh: V3, to: V3): V3 {
  const d = sub(to, sh), n = Math.hypot(...d);
  return add(sh, mul(d, Math.min(0.43, Math.max(0.2, n - PINCER)) / n));
}
/** The arm up off his right shoulder: tipped out to the side `out`, and forward `fwd` (radians). */
const armUp = (W: At, out: number, fwd: number): V3 => turn([-Math.sin(out), Math.cos(out) * Math.cos(fwd), Math.cos(out) * Math.sin(fwd)], W.yaw);

function crabShuffle(c: Ctx): Frame {
  const T = csTau(c.t), dir = c.lSide, zk = 1 - ease(seg(c.t, 0, 0.5)), take = ease(seg(c.t, 0, 0.15));
  // the champion (L) at his straw; the crab (W) driving him there, then under him
  const L = at(c.l, c.L0.x, BRACE, { z: c.L0.z * zk }), W = at(c.w, c.L0.x - dir * c.D * CLOSE, CRAB_LOW, { z: c.L0.z * zk });
  const f: Frame = { W, L, grip: take, hold: take * 0.8 };
  const x0 = W.x;
  // the crab's legs: in, down, up; then the scuttle
  const sink = ease(seg(T, CS_SINK, CS_CLEAN)) * (1 - ease(seg(T, CS_CLEAN, CS_CLEAN + 0.2)));
  const dip = Math.sin(Math.PI * seg(T, CS_DIP, CS_PRESS + 0.06));
  const stand = { ...CRAB_LOW, l0k: 0.45, l1k: 0.45, l0x: 0.2, l1x: 0.2, bend: 0.12, head: -0.1, side: 0.18 };
  W.p = mixPose(GRIP, CRAB_LOW, ease(seg(T, 0, 0.2)));
  W.p = mixPose(W.p, stand, ease(seg(T, CS_CLEAN + 0.05, CS_UP)));
  W.p = { ...W.p, l0k: W.p.l0k + 0.6 * sink + 0.35 * dip, l1k: W.p.l1k + 0.6 * sink + 0.35 * dip, l0x: W.p.l0x + 0.25 * sink + 0.15 * dip, l1x: W.p.l1x + 0.25 * sink + 0.15 * dip };
  // (the scuttle along the straw, towards us, a little in towards it)
  const go = seg(T, CS_GO, CS_WIND), gk = ease(go);
  W.z += CS_ALONG * gk; W.x = x0 + dir * CS_IN * gk;
  if (go > 0 && go < 1) { const sc = scuttle(go * Math.PI * 4, 0.5); W.p = { ...W.p, ...pick(sc, LEGS), up: sc.up }; }
  // the wind-up (down, leaning back, the claw cocked back) and the heave (up and forward, a lunge)
  const wind = ease(seg(T, CS_WIND, CS_HEAVE)) * (1 - ease(seg(T, CS_HEAVE, CS_HEAVE + 0.12)));
  const heave = ease(seg(T, CS_HEAVE, CS_LET));
  W.p = { ...W.p, l0k: W.p.l0k + 0.5 * wind, l1k: W.p.l1k + 0.5 * wind, l0x: W.p.l0x + 0.25 * wind, l1x: W.p.l1x + 0.25 * wind };
  W.x += dir * 0.3 * heave;
  if (heave > 0) W.p = { ...W.p, l1x: W.p.l1x + 0.45 * heave, l1k: W.p.l1k + 0.35 * heave, l0x: W.p.l0x - 0.2 * heave };
  // the champion: braced, then hoisted to the crab's chest by the belt, then up onto the big claw
  const H0 = hipsAt(L, c.ring), crab = hipsAt(W, c.ring), chest = add(crab, [dir * 0.62, 0.62, 0]);
  const kick = hoisted(T), flight = T >= CS_LET;
  const lifted = (W2: At, out: number, fwd: number, p: Pose): V3 => {
    // (his hips: the back of his belt the claw's length up the arm from the shoulder)
    const tip = add(rightShoulder(W2, c.ring), mul(armUp(W2, out, fwd), 0.42 + PINCER));
    return sub(tip, sub(beltBottom(c, [0, 0, 0], { ...L, p }), [0, 0, 0]));
  };
  // (the arm: up and out to the side; back for the wind-up, over forward for the heave)
  const out = 0.32, fwd = -0.35 * wind + 0.9 * heave;
  if (T < CS_CLEAN) {
    L.p = { ...BRACE, pitch: -0.1 - 0.05 * Math.sin(T * 13), bend: 0.45 };
  } else if (T < CS_PRESS) {
    // the clean: up to his chest, leaning back over the claws; his feet leave the clay
    const k = ease(seg(T, CS_CLEAN, CS_DIP)), d = 0.06 * dip;
    L.p = mixPose({ ...BRACE, pitch: -0.1, bend: 0.45 }, { ...kick, pitch: -0.55, l0x: 0.4, l1x: 0.2, l0k: 0.6 + 0.5 * Math.max(0, Math.sin(T * 13)), l1k: 0.9 }, k);
    f.lHips = add(lerpV(H0, chest, k), [0, -d, 0]);
    f.hold = take * 0.8 * (1 - k);
  } else if (!flight) {
    // the press: up onto the big claw over his right shoulder; then carried, and wound up, and heaved
    const k = ease(seg(T, CS_PRESS, CS_UP));
    L.p = mixPose({ ...kick, pitch: -0.55, l0x: 0.4, l1x: 0.2, l0k: 0.6, l1k: 0.9 }, kick, k);
    f.lHips = lerpV(add(chest, [0, -0.06 * dip, 0]), lifted(W, out, fwd, L.p), k);
    f.hold = 0;
    if (T > CS_HEAVE) {
      // the heave: from the bottom of the wind-up over and up, as fast as he'll fly when he's let go
      const Wf = { ...W, x: x0 + dir * CS_IN, z: c.L0.z * zk + CS_ALONG, p: { ...W.p } };
      const from = lifted(Wf, out, -0.35, L.p);
      f.lHips = hermite(from, [0, 0, 0], csRelease(c), csV0(c), CS_LET - CS_HEAVE, T - CS_HEAVE);
    }
  }
  // the claws: both on his belt for the clean; then the big one's pincers on the back of his belt till he's let go,
  // and the small one up, snapping at his feet
  if (T >= CS_PRESS && !flight) {
    const on = ease(seg(T, CS_PRESS, CS_PRESS + 0.15)), off = 1 - ease(seg(T, CS_LET - 0.03, CS_LET));
    const hand = bigClaw(rightShoulder(W, c.ring), beltBottom(c, f.lHips!, L));
    f.grip = (1 - on) * take;
    f.reach = [['W', 1, hand, on * off]];
    W.p = { ...W.p, a1e: 1.2, a0x: 2.4 + 0.25 * Math.sin(T * 7), a0z: 0.75, a0e: 0.5 + 0.8 * Math.max(0, Math.sin(T * 12)) };
  }
  if (flight) {
    // flung off the mound, on his back; down with a bounce and a slide
    const p0 = csRelease(c), land = csLand(c), p1 = hipsAt(land, c.ring), u = T - CS_LET;
    f.grip = 0; f.hold = 0;
    W.p = mixPose({ ...W.p, a1x: 1.9, a1z: 0.1, a1e: 0.2, a0x: 1.2, a0z: 0.5 }, clawsUp(T), ease(seg(T, CS_LAND - 0.1, CS_LAND + 0.3)));
    if (u < CS_FLY) {
      const k = u / CS_FLY;
      L.x = lerp(p0[0], land.x, k); L.z = lerp(p0[2], land.z, k);
      L.p = mixPose(kick, { ...LIE, a0x: 2.6, a1x: 2.4 }, ease(k));
      f.lHips = fly(p0, p1, CS_FLY, u);
    } else {
      const b = u - CS_FLY;
      L.x = land.x + dir * 0.18 * easeOut(seg(b, 0, 0.3)); L.z = land.z;
      L.p = b < 0.14 ? { ...LIE, a0x: 2.6, a1x: 2.4, sq: 1 - 0.16 * Math.sin((b / 0.14) * Math.PI) } : mixPose({ ...LIE, a0x: 2.6, a1x: 2.4 }, LIE, ease(seg(b, 0.14, 0.5)));
      L.air = b < 0.22 ? 0.07 * Math.sin((b / 0.22) * Math.PI) : 0;
    }
  }
  return f;
}
/** Where he lands: on his back off the mound, past the pallets (and a little back along the straw). */
const csLand = (c: Ctx): At => ({ x: c.lSide * (c.ring.half + 1.65), z: CS_ALONG + 0.3, yaw: face(c.l), p: LIE, air: 0 });
/** Where he's let go (the claw over forward, the crab lunged), and how fast he's going then. */
function csRelease(c: Ctx): V3 {
  const W: At = { ...at(c.w, c.L0.x - c.lSide * c.D * CLOSE + c.lSide * (CS_IN + 0.3), STAND, { z: CS_ALONG }), p: { ...STAND, l0k: 0.45, l1k: 0.45 } };
  const tip = add(rightShoulder(W, c.ring), mul(armUp(W, 0.32, 0.9), 0.42 + PINCER));
  return sub(tip, beltBottom(c, [0, 0, 0], { ...W, yaw: face(c.l), p: hoisted(CS_LET) }));
}
const csV0 = (c: Ctx) => flyV(csRelease(c), hipsAt(csLand(c), c.ring), CS_FLY, 0);
/** The legs' part of a pose. */
const LEGS = ['l0x', 'l0z', 'l0k', 'l1x', 'l1z', 'l1k'] as const;
const pick = (p: Pose, keys: readonly (keyof Pose)[]) => Object.fromEntries(keys.map(k => [k, p[k]])) as Partial<Pose>;

export const heavy: FinishMove = {
  lands: CS_LET + 0.24 / 0.5 + (CS_FLY - 0.24) + 0.01, done: 3.75, frame: crabShuffle,
  beats(c, fx, t0, t1) {
    const a = csTau(t0), b = csTau(t1);
    if (crossed(a, b, CS_CLEAN + 0.05)) { fx.kick('W', 2); fx.kick('L', 2.5); fx.react('charge'); }
    if (crossed(a, b, CS_UP)) { fx.hit(0.15, 0, 1.1); fx.word('SNIP!', fx.at('W', 'hand1'), { size: 1.1 }); }
    // the scuttle: a step each beat, dust off his feet
    for (let n = 0; n < 4; n++) if (crossed(a, b, CS_GO + ((n + 0.5) / 4) * (CS_WIND - CS_GO))) { fx.dust(fx.at('W', n % 2 ? 'foot1' : 'foot0'), 4, 0.7); fx.kick('W', 1); }
    if (crossed(a, b, CS_GO + 0.35)) fx.word('CLACK!', fx.at('W', 'hand0'));
    if (crossed(a, b, CS_LET)) { fx.react('upset'); fx.hit(0.2, 0, 1.15); fx.kick('W', 2); }
    if (crossed(a, b, CS_LAND + 0.35)) fx.word('SNIP!', fx.at('W', 'hand1'));
    void c;
  },
};

// ======================================================================================================
// SHELL FLIP (champTight: the champion wins, at his own straw)
// ======================================================================================================
/** Its beats: he drops under the crab, comes up under him and turns him over, lets go; the crab's flight, and
 *  down on his shell. */
const SF_DROP = 0.42, SF_UNDER = 0.7, SF_LET = 0.98, SF_FLY = 0.42, SF_LAND = SF_LET + SF_FLY;
const sfTau = (t: number) => warp(t, [[SF_LET, 0.5], [SF_LET + SF_FLY / 0.5, 1]]);
/** His shell: its middle from his hips (as he stands), and its round back's radius. On his back he rocks on it,
 *  rolling: its middle stays its radius over the clay and moves as it turns. */
const SHELL_AT: V3 = [0, 0.543, -0.157], SHELL_R = 0.31;
/** How he lies on it: tipped back, his head up off the clay (his hips low). */
const SHELL_P = -1.2;
/** His hips, rocking on his shell (its middle C when he's at pitch P0, roll R0) at pitch P and roll R. */
function onShellHips(C: V3, yaw: number, P: number, R: number, P0: number, R0: number): V3 {
  const ap = turn([1, 0, 0], yaw), ar = turn([0, 0, 1], yaw, P, 0);
  const cross = (a: V3): V3 => [-a[2], 0, a[0]]; // a × up
  const Cn = add(C, add(mul(cross(ap), SHELL_R * (P - P0)), mul(cross(ar), SHELL_R * (R - R0))));
  return sub(Cn, turn(SHELL_AT, yaw, P, R));
}
/** The champion low under him: knees deep, head down under the crab's chest. */
const UNDER = pose({ l0x: 1.15, l0z: 0.65, l0k: 1.85, l1x: 1.05, l1z: 0.6, l1k: 1.75, bend: 0.75, head: -0.45, a0x: 1.0, a1x: 1.0, a0e: 1.0, a1e: 1.0 });
/** Coming up under him, arms driving up: on his toes, chest out. */
const HEAVE_UP = pose({ l0x: 0.3, l0z: 0.35, l0k: 0.35, l1x: -0.35, l1z: 0.3, l1k: 0.15, bend: 0.1, head: 0.25, a0x: 2.5, a1x: 2.5, a0z: 0.1, a1z: 0.1, a0e: 0.3, a1e: 0.3 });

function shellFlip(c: Ctx): Frame {
  const T = sfTau(c.t), dir = c.lSide, zk = 1 - ease(seg(c.t, 0, 0.5)), take = ease(seg(c.t, 0, 0.15));
  // the champion (W) at his straw, heels on it; the crab (L) driving him there
  const heel = -dir * (c.ring.r - 0.2);
  const W = at(c.w, lerp(c.W0.x, heel, ease(seg(T, 0, SF_DROP))), BRACE, { z: c.W0.z * zk });
  const L = at(c.l, 0, CRAB_LOW, { z: c.L0.z * zk });
  const f: Frame = { W, L, grip: take, hold: ease(seg(c.t, 0.05, 0.3)) };
  const drop = ease(seg(T, SF_DROP, SF_UNDER)), rise = ease(seg(T, SF_UNDER, SF_LET));
  // the crab: drives; then, with nothing to push, lurches over him as he drops
  L.x = W.x + dir * c.D * CLOSE - dir * 0.12 * drop;
  L.p = mixPose(GRIP, { ...CRAB_LOW, bend: 0.5, l0x: 0.55, l1x: 0.1, l1z: 0.5 }, ease(seg(T, 0, 0.25)));
  L.p = { ...L.p, l0k: L.p.l0k + 0.06 * Math.sin(T * 19), pitch: 0.18 * drop };
  W.p = mixPose(GRIP, { ...BRACE, pitch: -0.04 - 0.04 * Math.sin(T * 13), bend: 0.6, head: -0.3 }, ease(seg(T, 0, 0.25)));
  if (T >= SF_DROP) W.p = mixPose(W.p, UNDER, drop);
  if (T >= SF_UNDER) W.p = mixPose(UNDER, HEAVE_UP, rise);
  W.x += dir * 0.2 * rise;
  // the lift and the turn: he comes up under the crab's belly, the crab's feet leave the clay and he tips over backwards
  // (his feet up past the champion's face), let go at the top
  const L1: At = { ...L, x: heel + dir * c.D * CLOSE - dir * 0.12 };
  const p1 = hipsAt(L1, c.ring);
  const top: V3 = add(p1, [dir * 0.3, 0.42, 0]);
  const land: At = { ...L1, x: L1.x + dir * 0.95, p: { ...onShell(0, 0), pitch: SHELL_P }, air: 0 };
  const C0: V3 = [land.x + dir * 0.56, c.ring.ground(land.x, land.z) + SHELL_R, land.z];
  const pl = onShellHips(C0, land.yaw, SHELL_P, 0, SHELL_P, 0);
  const vTop = flyV(top, pl, SF_FLY, 0);
  if (T >= SF_UNDER && T < SF_LET) {
    f.lHips = hermite(p1, [0, 0, 0], top, vTop, SF_LET - SF_UNDER, T - SF_UNDER);
    L.p = { ...mixPose(L.p, onShell(T, 0.6), rise * 0.5), pitch: lerp(0.18, -0.55, rise) };
    f.hold = (f.hold as number) * (1 - rise);
  }
  if (T >= SF_LET) {
    f.grip = 0; f.hold = 0;
    W.p = mixPose(HEAVE_UP, { ...STAND, a0x: 0.6, a1x: 0.6, bend: 0.2 }, ease(seg(T, SF_LET + 0.1, SF_LAND + 0.4)));
    W.x += -dir * 0.18 * ease(seg(T, SF_LET + 0.15, SF_LAND + 0.2));
    if (T < SF_LAND) {
      // over in the air, onto his back
      const u = T - SF_LET, k = u / SF_FLY;
      L.x = lerp(L1.x, land.x, k);
      L.p = { ...onShell(T, 0.6 + 0.4 * k), pitch: lerp(-0.55, SHELL_P, ease(k)) };
      f.lHips = fly(top, pl, SF_FLY, u);
    } else {
      // down on his shell: a bonk, a bounce, and rocking on it, his legs and claws going
      const b = T - SF_LAND, decay = Math.exp(-b * 2.2);
      L.x = land.x;
      const P = SHELL_P + 0.2 * Math.sin(b * 9) * decay, R = 0.2 * Math.sin(b * 6.5) * decay;
      L.p = { ...onShell(T, 0.6 + 0.4 * decay), pitch: P, roll: R, sq: b < 0.12 ? 1 - 0.14 * Math.sin((b / 0.12) * Math.PI) : 1 };
      f.lHips = add(onShellHips(C0, land.yaw, P, R, SHELL_P, 0), [0, b < 0.2 ? 0.05 * Math.sin((b / 0.2) * Math.PI) : 0, 0]);
    }
  }
  return f;
}

export const champTight: FinishMove = {
  lands: SF_LET + SF_FLY / 0.5 + 0.01, done: 3.1, frame: shellFlip,
  beats(c, fx, t0, t1) {
    const a = sfTau(t0), b = sfTau(t1);
    for (const s of [0.1, 0.25, 0.38]) if (crossed(a, b, s)) { fx.dust(fx.at('W', 'foot0'), 3, 0.6); fx.kick('W', 0.8); }
    if (crossed(a, b, SF_DROP + 0.1)) { fx.react('edge'); fx.kick('L', 2); }
    if (crossed(a, b, SF_UNDER + 0.05)) { fx.kick('W', 2.5); fx.hit(0, 0, 1.1); }
    if (crossed(a, b, SF_LET)) { fx.react('upset'); fx.word('SNIP!', fx.at('L', 'hand1')); }
    // (his claws snapping at the air on his back)
    for (const s of [0.35, 0.7, 1.05]) if (crossed(a, b, SF_LAND + s)) fx.word(s === 0.7 ? 'CLACK!' : 'SNIP!', fx.at('L', s === 0.7 ? 'hand0' : 'hand1'));
    void c;
  },
};

// ======================================================================================================
// LIFT-OUT (champGrand: the champion wins big, the crab driven to his own straw)
// ======================================================================================================
/** Its beats: the champion sinks, lifts him by the belt; carries him round over the straw towards the corner (three
 *  steps, the crab's legs pedalling sideways in the air), sets him down outside it, bumps him with his belly; the crab
 *  totters, and goes over backwards onto his shell. */
const LO_SINK = 0.22, LO_LIFT = 0.48, LO_UP = 0.82, LO_WALK = 0.86, LO_SET = 1.86, LO_BUMP = 2.1, LO_TIP = 2.3, LO_DOWN = 2.72;
/** How high the crab's lifted, and how close they hold each other then (his belly up on the champion's). */
const LO_HIGH = 0.38, LO_NEAR = 0.72;
/** Where he's carried: round to the south, out over the straw towards the corner (the ring's room is there). */
const LO_OUT = 2.95, LO_TURN = Math.PI / 4;
/** The crab's legs pedalling sideways in the air (`ph` their phase), his claws snapping at the champion. */
const pedal = (ph: number): Partial<Pose> => {
  const a = Math.sin(ph), b = Math.sin(ph + Math.PI);
  return { l0z: 0.35 + 0.45 * Math.max(0, a), l1z: 0.35 + 0.45 * Math.max(0, b), l0k: 0.3 + 0.4 * Math.max(0, b), l1k: 0.3 + 0.4 * Math.max(0, a), l0x: 0.25 + 0.1 * a, l1x: 0.25 + 0.1 * b };
};
/** The champion lifting: hips forward under the other's belly, leaning back a little, knees bent. */
const TSURI = { ...LIFT, bend: 0.4, pitch: -0.04, l0k: 0.75, l1k: 0.75, l0x: 0.55, l1x: 0.55 };

/** Where the lifted crab's hips go: from over his own straw round to outside it, towards the corner. */
function loPath(c: Ctx, k: number) {
  const dir = c.lSide, a = LO_TURN * k;
  // (round the ring's middle: the angle from his own side, turning to the south)
  const r = lerp(Math.abs(c.L0.x), LO_OUT, k);
  return { x: dir * r * Math.cos(a), z: r * Math.sin(a) };
}

function liftOut(c: Ctx): Frame {
  const T = c.t, dir = c.lSide, zk = 1 - ease(seg(c.t, 0, 0.5)), take = ease(seg(c.t, 0, 0.15));
  // the crab (L) at his straw, the champion (W) driving him there
  const L = at(c.l, c.L0.x, CRAB_LOW, { z: c.L0.z * zk }), W = at(c.w, c.L0.x - dir * c.D * CLOSE, DRIVE, { z: c.L0.z * zk });
  const f: Frame = { W, L, grip: take, hold: take * (1 - ease(seg(T, LO_LIFT, LO_LIFT + 0.15))) };
  const sink = Math.sin(Math.PI * seg(T, LO_SINK, LO_LIFT + 0.08));
  const lift = ease(seg(T, LO_LIFT, LO_UP));
  const near = c.D * lerp(CLOSE, LO_NEAR, ease(seg(T, LO_SINK, LO_UP)));
  W.p = mixPose(GRIP, DRIVE, ease(seg(T, 0, 0.2)));
  W.p = mixPose(W.p, TSURI, ease(seg(T, LO_SINK, LO_LIFT)));
  W.p = { ...W.p, l0k: W.p.l0k + 0.45 * sink, l1k: W.p.l1k + 0.45 * sink, l0x: W.p.l0x + 0.2 * sink, l1x: W.p.l1x + 0.2 * sink };
  L.p = { ...mixPose(GRIP, { ...CRAB_LOW, bend: 0.58, head: -0.3 }, ease(seg(T, 0, 0.25))), l0k: CRAB_LOW.l0k + 0.05 * Math.sin(T * 21) };
  const H0 = hipsAt(L, c.ring);
  // the walk: three steps carrying him round and out, turning
  const wk = ease(seg(T, LO_WALK, LO_SET)), P = loPath(c, wk);
  const yawW = Math.atan2(dir * Math.cos(LO_TURN * wk), Math.sin(LO_TURN * wk)), fw: V3 = [Math.sin(yawW), 0, Math.cos(yawW)];
  // (the crab's hips: up off the clay, and carried; set down; then the bump and over he goes)
  const setk = ease(seg(T, LO_SET, LO_BUMP));
  const hy = H0[1] + LO_HIGH * lift * (1 - setk);
  const crabYaw = yawW + Math.PI;
  const lifted: V3 = [P.x, hy, P.z + c.L0.z * zk];
  W.x = lifted[0] - fw[0] * near; W.z = lifted[2] - fw[2] * near; W.yaw = yawW;
  L.yaw = crabYaw;
  if (T >= LO_WALK && T < LO_SET) {
    const ph = seg(T, LO_WALK, LO_SET) * Math.PI * 3;
    W.p = { ...steps(TSURI, ph * 2, 0.22), l0k: TSURI.l0k + 0.15, l1k: TSURI.l1k + 0.15 };
  }
  if (T >= LO_LIFT && T < LO_TIP) {
    // up: his feet off the clay, pedalling sideways, his claws off the belt and snapping at the champion's shoulders
    f.lHips = lifted;
    const ped = pedal(T * 16) as Pose;
    L.p = { ...mixPose(L.p, { ...L.p, ...ped, pitch: 0.12, bend: 0.25, a0x: 1.9, a1x: 1.7, a0z: 0.5, a1z: 0.6, a0e: 0.4 + 0.9 * Math.max(0, Math.sin(T * 13)), a1e: 0.4 + 0.9 * Math.max(0, Math.sin(T * 13 + 2)) }, lift * (1 - setk)) };
    if (T >= LO_SET) {
      // set down outside the straw: his feet find the clay, scrabbling
      const dn = hipsAt({ ...L, x: P.x, z: P.z, p: { ...CRAB_LOW, l0k: 0.5, l1k: 0.5 } }, c.ring);
      f.lHips = lerpV(lifted, dn, setk);
      W.p = mixPose(W.p, { ...TSURI, l0k: 1.1, l1k: 1.1, l0x: 0.7, l1x: 0.7 }, setk);
    }
  }
  if (T >= LO_BUMP) {
    // the bump: the champion's belly into him, hands off the belt
    const bk = ease(seg(T, LO_BUMP, LO_TIP)) * (1 - ease(seg(T, LO_TIP + 0.15, LO_TIP + 0.6)));
    W.p = mixPose({ ...TSURI, l0k: 1.1, l1k: 1.1, l0x: 0.7, l1x: 0.7 }, { ...SHOVE, bend: 0.35, pitch: 0.12, a0x: 1.0, a1x: 1.0, a0e: 0.6, a1e: 0.6 }, bk);
    W.p = mixPose(W.p, STAND, ease(seg(T, LO_DOWN, LO_DOWN + 0.5)));
    const fwd = 0.2 * ease(seg(T, LO_BUMP, LO_TIP)) - 0.25 * ease(seg(T, LO_DOWN, LO_DOWN + 0.5));
    W.x += fw[0] * fwd; W.z += fw[2] * fwd;
    f.grip = take * (1 - ease(seg(T, LO_BUMP + 0.05, LO_TIP)));
  }
  // the crab: his feet down outside the straw; tottering back, legs scrabbling sideways; then over onto his shell
  const feet: At = { ...L, x: P.x, z: P.z, yaw: crabYaw, p: { ...CRAB_LOW, l0k: 0.5, l1k: 0.5 }, air: 0 };
  const stand = hipsAt(feet, c.ring), back: V3 = [fw[0], 0, fw[2]];
  const land: At = { ...feet, x: P.x + fw[0] * 0.35, z: P.z + fw[2] * 0.35, p: { ...onShell(0, 0), pitch: SHELL_P } };
  const C0: V3 = [land.x + back[0] * 0.56, c.ring.ground(land.x, land.z) + SHELL_R, land.z + back[2] * 0.56];
  const pl = onShellHips(C0, crabYaw, SHELL_P, 0, SHELL_P, 0);
  if (T >= LO_BUMP && T < LO_DOWN) {
    // (tipping over about his heels, faster and faster; the last of it brought onto where his shell lands)
    const k = easeIn(seg(T, LO_BUMP + 0.05, LO_DOWN)), pitch = lerp(0, SHELL_P, k);
    const off = sub(stand, [feet.x, c.ring.ground(feet.x, feet.z), feet.z]);
    const rot = turn(turn(off, -crabYaw), crabYaw, pitch, 0);
    const free = add([feet.x, c.ring.ground(feet.x, feet.z), feet.z], rot);
    const endFree = add([feet.x, c.ring.ground(feet.x, feet.z), feet.z], turn(turn(off, -crabYaw), crabYaw, SHELL_P, 0));
    f.lHips = add(free, mul(sub(pl, endFree), k * k));
    L.p = { ...CRAB_LOW, ...pedal(T * 20), pitch, a0x: 2.0 + 0.4 * Math.sin(T * 17), a1x: 2.0 + 0.4 * Math.sin(T * 17 + 2), a0z: 0.8, a1z: 0.8, a0e: 0.9, a1e: 0.9 };
    L.p = mixPose(L.p, { ...onShell(T, 1), pitch }, k);
  } else if (T >= LO_DOWN) {
    // on his shell: a bonk and a bounce, a rock or two, his legs still pedalling sideways
    const b = T - LO_DOWN, decay = Math.exp(-b * 3);
    const Pp = SHELL_P + 0.14 * Math.sin(b * 10) * decay;
    L.p = { ...onShell(T, 0.7 + 0.3 * decay), ...pedal(T * 14), l0x: 1.5, l1x: 1.5, pitch: Pp, sq: b < 0.12 ? 1 - 0.14 * Math.sin((b / 0.12) * Math.PI) : 1 };
    f.lHips = add(onShellHips(C0, crabYaw, Pp, 0, SHELL_P, 0), [0, b < 0.2 ? 0.05 * Math.sin((b / 0.2) * Math.PI) : 0, 0]);
  }
  return f;
}

export const champGrand: FinishMove = {
  lands: LO_DOWN + 0.01, done: 3.45, frame: liftOut,
  beats(c, fx, t0, t1) {
    const a = t0, b = t1;
    if (crossed(a, b, LO_LIFT + 0.05)) { fx.kick('W', 2.5); fx.kick('L', 2); fx.react('charge'); fx.hit(0, 0, 1.1); }
    if (crossed(a, b, LO_UP)) fx.word('SNIP!', fx.at('L', 'hand1'));
    for (let n = 0; n < 3; n++) if (crossed(a, b, LO_WALK + ((n + 0.6) / 3) * (LO_SET - LO_WALK))) { fx.dust(fx.at('W', n % 2 ? 'foot1' : 'foot0'), 4, 0.8); fx.kick('W', 1.2); fx.kick('L', 1); }
    if (crossed(a, b, LO_WALK + 0.55)) fx.word('CLACK!', fx.at('L', 'hand0'));
    if (crossed(a, b, LO_BUMP)) { fx.dust(fx.at('L', 'foot0'), 5, 0.8); fx.dust(fx.at('L', 'foot1'), 5, 0.8); }
    if (crossed(a, b, LO_TIP)) { fx.kick('L', 3); fx.react('edge'); }
    if (crossed(a, b, LO_DOWN + 0.35)) fx.word('SNIP!', fx.at('L', 'hand1'));
    void c;
  },
};

// ======================================================================================================
// LIFT-OUT, gone wild (epic: the champion's perfect slam)
// ======================================================================================================
// Lifted by the belt as in the lift-out; then the champion spins on the spot with him, faster and faster, the crab's
// legs flung out and pedalling, his claws snapping; brakes, dips, and leaps, throwing him straight up at the beams,
// tumbling over and over. At the top, slowed nearly to a stop, he's turned flat on his shell; and comes down spinning
// like a coin into the clay, a crater, and there he goes on spinning on his shell like a top, wobbling, till he stops.
// The champion, landed from his leap, turns his back on it before it hits.
/** Its beats, on its clock: the lift (as the lift-out's), the spin, the brake and dip, the throw, he's let go. */
const EP_SPIN = 0.82, EP_FULL = 1.55, EP_BRAKE = 2.0, EP_THROW = 2.3, EP_LET = 2.48;
/** The spin's top speed (rad/s), and how far he's held out then. */
const EP_W = 15, EP_NEAR = 0.74;
/** Gravity for the epic (heavier than ours, so it all happens faster and harder, the same all through). */
const EP_G = 16;
/** The flight: up to his apex, and down; slowed nearly to a stop round the top. */
const EP_FLY = 1.74, EP_APEX = 0.79, EP_LAND = EP_LET + EP_FLY;
const EP_SLOW: [number, number] = [3.0, 3.5];
const EP_LAND_REAL = EP_SLOW[0] + (EP_SLOW[1] - EP_SLOW[0]) / 0.3 + (EP_LAND - EP_SLOW[1]), EP_STOP = 0.14;
const epTau = (t: number) => warp(t, [[EP_SLOW[0], 0.3], [EP_SLOW[0] + (EP_SLOW[1] - EP_SLOW[0]) / 0.3, 1], [EP_LAND_REAL, 0], [EP_LAND_REAL + EP_STOP, 1]]);
/** How fast he's spinning flat as he comes down (rad/s), and how long his spin on the shell takes to die. */
const EP_COIN = 14, EP_TOP = 0.4;
/** The crab's middle, from his hips (half way to his shell's): what he turns about in the air. */
const EP_MID = mul(SHELL_AT, 0.5);
/** The spin's angle on the move's clock: speeding up, flat out, braking. */
function epAngle(T: number) {
  const a = Math.min(T, EP_FULL) - EP_SPIN, b = Math.min(Math.max(T, EP_FULL), EP_BRAKE) - EP_FULL, k = seg(T, EP_BRAKE, EP_THROW);
  const up = a > 0 ? (0.5 * EP_W * a * a) / (EP_FULL - EP_SPIN) : 0;
  // (braking: the speed falls to nothing, smoothly)
  const br = (EP_THROW - EP_BRAKE) * EP_W * (k - k * k * k + 0.5 * k * k * k * k) ;
  return up + EP_W * b + br;
}
const epSpeed = (T: number) => (T < EP_SPIN ? 0 : T < EP_FULL ? EP_W * seg(T, EP_SPIN, EP_FULL) : T < EP_BRAKE ? EP_W : EP_W * (1 - 3 * seg(T, EP_BRAKE, EP_THROW) ** 2 + 2 * seg(T, EP_BRAKE, EP_THROW) ** 3));

function epicFrame(c: Ctx): Frame {
  const T = epTau(c.t), dir = c.lSide, zk = 1 - ease(seg(c.t, 0, 0.5)), take = ease(seg(c.t, 0, 0.15));
  const L = at(c.l, c.L0.x, CRAB_LOW, { z: c.L0.z * zk }), W = at(c.w, c.L0.x - dir * c.D * CLOSE, DRIVE, { z: c.L0.z * zk });
  const f: Frame = { W, L, grip: take, hold: take * (1 - ease(seg(T, LO_LIFT, LO_LIFT + 0.15))) };
  // the lift, as the lift-out's: he sinks, pulls him in, drives up
  const sink = Math.sin(Math.PI * seg(T, LO_SINK, LO_LIFT + 0.08)), lift = ease(seg(T, LO_LIFT, LO_UP));
  W.p = mixPose(mixPose(GRIP, DRIVE, ease(seg(T, 0, 0.2))), TSURI, ease(seg(T, LO_SINK, LO_LIFT)));
  W.p = { ...W.p, l0k: W.p.l0k + 0.45 * sink, l1k: W.p.l1k + 0.45 * sink, l0x: W.p.l0x + 0.2 * sink, l1x: W.p.l1x + 0.2 * sink };
  L.p = { ...mixPose(GRIP, { ...CRAB_LOW, bend: 0.58, head: -0.3 }, ease(seg(T, 0, 0.25))), l0k: CRAB_LOW.l0k + 0.05 * Math.sin(T * 21) };
  const H0 = hipsAt(L, c.ring);
  // the spin: the champion turns on the spot (his feet stepping round), the crab held out at his belly, legs flung out
  const th = face(c.w) + epAngle(T), w = epSpeed(T) / EP_W;
  // (where he stands: pulled in to the crab as he lifted him, then he spins there)
  const cx = c.L0.x - dir * c.D * EP_NEAR, cz = c.L0.z * zk;
  W.x = lerp(c.L0.x - dir * c.D * CLOSE, cx, ease(seg(T, LO_SINK, LO_UP))); W.z = cz; W.yaw = th;
  const dip = Math.sin(Math.PI * seg(T, EP_BRAKE + 0.1, EP_THROW + 0.04));
  const hop = T < EP_THROW ? 0 : 0.38 * Math.sin(Math.PI * seg(T, EP_THROW, EP_LET + 0.3));
  W.air = hop;
  if (T >= EP_SPIN && T < EP_THROW) {
    W.p = { ...steps(TSURI, epAngle(T) * 1.6, 0.18), pitch: -0.12 * w, l0k: TSURI.l0k + 0.5 * dip, l1k: TSURI.l1k + 0.5 * dip, l0x: TSURI.l0x + 0.25 * dip, l1x: TSURI.l1x + 0.25 * dip };
  } else if (T >= EP_THROW) {
    // the throw: up out of the dip, leaping, arms up over his head; down from his leap, looking up after him; then he
    // turns his back on it, a fist up
    const k = ease(seg(T, EP_THROW, EP_LET));
    const UPX = pose({ l0x: 0.1, l1x: -0.1, l0k: 0.2, l1k: 0.3, l0z: 0.2, l1z: 0.2, bend: -0.1, head: -0.4, a0x: 2.9, a1x: 2.9, a0z: 0.25, a1z: 0.25, a0e: 0.2, a1e: 0.2 });
    W.p = mixPose({ ...TSURI, l0k: TSURI.l0k + 0.5, l1k: TSURI.l1k + 0.5 }, UPX, k);
    const land = Math.sin(Math.PI * seg(T, EP_LET + 0.28, EP_LET + 0.55));
    W.p = { ...W.p, l0k: W.p.l0k + 0.7 * land, l1k: W.p.l1k + 0.7 * land, l0x: W.p.l0x + 0.35 * land, l1x: W.p.l1x + 0.35 * land };
    const tb = ease(seg(T, EP_LET + 0.75, EP_LET + 1.05));
    if (tb > 0) {
      W.yaw = th + Math.PI * tb;
      const ph = seg(T, EP_LET + 0.75, EP_LET + 1.05) * Math.PI * 2;
      W.p = tb < 1 ? steps(mixPose(W.p, STAND, tb), ph, 0.15) : mixPose(STAND, { ...FIST, head: 0.1 }, ease(seg(T, EP_LET + 1.05, EP_LET + 1.3)));
    }
  }
  // the crab: lifted, then held out and swung round, then hurled
  const ped = pedal(T * (16 + 10 * w)) as Pose;
  const flung = { ...CRAB_LOW, ...ped, bend: 0.2, a0x: 2.2 + 0.4 * Math.sin(T * 17), a1x: 2.0 + 0.4 * Math.sin(T * 17 + 2), a0z: 0.9, a1z: 0.9, a0e: 0.3 + 1.1 * Math.max(0, Math.sin(T * 19)), a1e: 0.3 + 1.1 * Math.max(0, Math.sin(T * 19 + 2)) };
  const held = (T2: number): V3 => {
    const t2 = face(c.w) + epAngle(T2), f2: V3 = [Math.sin(t2), 0, Math.cos(t2)], ch = hipsAt({ ...W, yaw: t2, air: 0 }, c.ring);
    const n2 = c.D * lerp(CLOSE, EP_NEAR, ease(seg(T2, LO_SINK, LO_UP)));
    const d2 = Math.sin(Math.PI * seg(T2, EP_BRAKE + 0.1, EP_THROW + 0.04));
    return [ch[0] + f2[0] * n2, H0[1] + (LO_HIGH + 0.08) * ease(seg(T2, LO_LIFT, LO_UP)) + 0.12 * (epSpeed(T2) / EP_W) - 0.18 * d2, ch[2] + f2[2] * n2];
  };
  if (T >= LO_LIFT && T < EP_THROW) {
    f.lHips = held(T);
    L.yaw = th + Math.PI;
    L.p = mixPose(L.p, { ...flung, pitch: 0.1 + 0.32 * w * w }, lift);
  }
  // the throw, from the bottom of the dip, up over the champion's head as fast as he'll fly
  const rel = epRelease(c), vRel = flyV(add(rel, turn(EP_MID, epYawRel(c), 0.1)), epMidLand(c), EP_FLY, 0, EP_G);
  if (T >= EP_THROW && T < EP_LET) {
    f.lHips = hermite(held(EP_THROW), [0, 0, 0], rel, vRel, EP_LET - EP_THROW, T - EP_THROW);
    L.yaw = epYawRel(c); L.p = { ...flung, pitch: 0.1 };
    f.grip = take * (1 - ease(seg(T, EP_LET - 0.06, EP_LET)));
  }
  if (T >= EP_LET) {
    f.grip = 0; f.hold = 0;
    const u = Math.min(T, EP_LAND) - EP_LET, yr = epYawRel(c);
    // (tumbling over backwards on the way up, twice and onto his shell at the top; then flat, spinning)
    const pr = 0.1, pitch = u < EP_APEX ? pr + (SHELL_P - 4 * Math.PI - pr) * ease(u / EP_APEX) : SHELL_P;
    const ud = Math.max(0, u - EP_APEX), Td = EP_FLY - EP_APEX;
    let yaw = yr + (0.5 * EP_COIN * ud * ud) / Td;
    const air = { ...onShell(T, 1), pitch: wrap(pitch) };
    L.p = u < EP_APEX ? { ...flung, pitch: wrap(pitch), l0z: 0.9, l1z: 0.9 } : mixPose({ ...flung, pitch: SHELL_P }, air, ease(seg(ud, 0, 0.3)));
    if (T < EP_LAND) {
      L.yaw = yaw;
      const M = fly(add(rel, turn(EP_MID, yr, pr)), epMidLand(c), EP_FLY, u, EP_G);
      f.lHips = sub(M, turn(EP_MID, yaw, L.p.pitch));
    } else {
      // in the crater: spinning on his shell like a top, wobbling faster as it dies, till he stops
      const b = T - EP_LAND, yl = epYawLand(c);
      yaw = yl + EP_COIN * EP_TOP * (1 - Math.exp(-b / EP_TOP));
      const A = 0.24 * Math.exp(-b * 2.2), ph = 7 * b + 9 * b * b;
      const P = SHELL_P + 0.6 * A * Math.cos(ph), R = A * Math.sin(ph);
      L.yaw = yaw;
      L.p = { ...onShell(T, 0.5 + 0.5 * Math.exp(-b * 2)), pitch: P, roll: R, sq: b < 0.12 ? 1 - 0.2 * Math.sin((b / 0.12) * Math.PI) : 1 };
      f.lHips = add(onShellHips(epShellLand(c), yaw, P, R, SHELL_P, 0), [0, b < 0.22 ? 0.07 * Math.sin((b / 0.22) * Math.PI) : 0, 0]);
    }
  }
  // the camera: back and up with him, and down for the crash
  const crabY = (f.lHips ?? H0)[1] - c.ring.top;
  f.cam = { take: true, wide: 0.25 + 0.35 * ease(seg(T, EP_SPIN, EP_THROW)) + 0.15 * ease(seg(T, EP_LET, EP_LET + 0.5)) - 0.2 * ease(seg(T, EP_LAND - 0.4, EP_LAND + 0.4)), y: T < EP_LET ? 0.4 * ease(seg(T, LO_LIFT, EP_SPIN)) : Math.max(0.3, lerp(0.4, crabY * 0.75, ease(seg(T, EP_LET, EP_LET + 0.3)))) };
  return f;
}
/** The crab's yaw as he's let go, and as he lands. */
const epYawRel = (c: Ctx) => face(c.w) + epAngle(EP_THROW) + Math.PI;
const epYawLand = (c: Ctx) => epYawRel(c) + 0.5 * EP_COIN * (EP_FLY - EP_APEX);
/** Where he's let go: over the champion, in front of him, his hips as high as the champion's hands reach in his leap. */
function epRelease(c: Ctx): V3 {
  const th = face(c.w) + epAngle(EP_THROW), cx = c.L0.x - c.lSide * c.D * EP_NEAR;
  return [cx + Math.sin(th) * 0.35, c.ring.top + 2.4, Math.cos(th) * 0.35];
}
/** Where his shell comes down: out in the ring, towards its middle from where they were. */
const epShellLand = (c: Ctx): V3 => [c.L0.x - c.lSide * c.D * EP_NEAR - c.lSide * 1.5, c.ring.top + SHELL_R, 0.35];
const epMidLand = (c: Ctx): V3 => add(sub(epShellLand(c), turn(SHELL_AT, epYawLand(c), SHELL_P)), turn(EP_MID, epYawLand(c), SHELL_P));

export const epic: FinishMove = {
  lands: EP_LAND_REAL + 0.01, done: 6.4, nameAt: EP_LET, frame: epicFrame,
  beats(c, fx, t0, t1) {
    const a = epTau(t0), b = epTau(t1);
    if (crossed(a, b, LO_LIFT + 0.05)) { fx.kick('W', 2.5); fx.kick('L', 2); fx.react('charge'); }
    if (crossed(a, b, EP_SPIN + 0.2)) { fx.screen({ lines: 0.6, for: 1.4 }); fx.react('upset'); }
    // the claws snapping as he goes round, dust off the champion's feet
    const SN = ['SNIP!', 'SNAP!', 'CLACK!'];
    for (let n = 0; n < 6; n++) if (crossed(a, b, EP_SPIN + 0.15 + n * 0.22)) { fx.word(SN[n % 3], fx.at('L', n % 2 ? 'hand1' : 'hand0'), { size: 0.9 + 0.08 * n }); fx.dust(fx.at('W', n % 2 ? 'foot0' : 'foot1'), 4, 0.8); }
    if (crossed(a, b, EP_BRAKE + 0.05)) { fx.dust(fx.at('W', 'foot0'), 10, 1.2); fx.dust(fx.at('W', 'foot1'), 10, 1.2); fx.kick('L', 3); }
    if (crossed(a, b, EP_LET)) { fx.screen({ flash: 'white', lines: 1, for: 0.5 }); fx.hit(0.6, 0.5, 1.3); fx.dust(fx.at('W', 'foot0'), 16, 1.6); fx.kick('W', 3); }
    if (crossed(a, b, EP_LET + 0.5)) { fx.dust(fx.at('W', 'foot0'), 8, 1); fx.dust(fx.at('W', 'foot1'), 8, 1); }
    // at the top, slowed: his claws going
    for (const [s, w] of [[EP_LET + 0.62, 'SNIP!'], [EP_LET + 0.75, 'SNAP!'], [EP_LET + 0.88, 'SNIP!']] as const) if (crossed(a, b, s)) fx.word(w, fx.at('L', s > EP_LET + 0.7 && s < EP_LET + 0.8 ? 'hand0' : 'hand1'), { size: 1.3 });
    if (crossed(a, b, EP_LET + 1.0)) fx.screen({ lines: 0.8, for: 0.8 });
    // the crash: the impact frame, the crater, the shockwave
    if (t0 < EP_LAND_REAL && t1 >= EP_LAND_REAL) {
      const at = fx.at('L', 'belly');
      fx.screen({ impact: true, flash: 'white', text: 'SHELL SHOCK!', for: 1.0 });
      fx.hit(1.3, 1, 1.5); fx.burst(at, 2.6); fx.dust(at, 46, 3.2); fx.kick('L', 9); fx.react('win');
    }
    // the dust thrown up by his spin on the shell
    for (let n = 1; n <= 3; n++) if (crossed(a, b, EP_LAND + n * 0.18)) fx.dust(fx.at('L', 'chest'), 6, 1);
    void c;
  },
};
