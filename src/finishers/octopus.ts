// Hakkaku the octopus's finishers (stage 3), and the champion's against him. He's soft and has eight arms: he slips
// out of a grip boneless behind a cloud of ink, and wraps a man up and swings him; the champion, to beat him, has to
// get a hold through the tentacles and throw him, over his hip, or by the belt.
import { type Object3D, Euler, Quaternion, Vector3 } from 'three';
import {
  type At, clamp01, crossed, type Ctx, DOWN, ease, easeIn, easeOut, face, type FinishMove, fly, type Frame,
  hipsAt, lerp, seg, type V3, warp,
} from '../finishRig';
import { BRACE, DRIVE, GRIP, SHIKO_LOW, steps, walk } from '../poses';
import { mixPose, pose, type Pose, type RikishiModel } from '../rikishi';

// ---------- helpers ----------
const TAU = Math.PI * 2;
const _a = new Vector3(), _b = new Vector3();
/** A point on `r` (in his `bone`'s own space) as he is now: where it was against his middle last frame, put on his
 *  middle as this frame has it (so a hand laid on him stays on him, whatever the game's origin). */
function on(r: RikishiModel, bone: Object3D, local: V3, hips: V3, dyaw = 0): V3 {
  r.updateMatrixWorld(true);
  bone.localToWorld(_a.set(local[0], local[1], local[2])); r.hips.getWorldPosition(_b);
  // (turned on by as much as he's turned since: a man swung round fast)
  const dx = _a.x - _b.x, dz = _a.z - _b.z, c = Math.cos(dyaw), s = Math.sin(dyaw);
  return [hips[0] + dx * c + dz * s, hips[1] + _a.y - _b.y, hips[2] - dx * s + dz * c];
}
/** How far he's turned since the last frame (kept under `key`). */
function turned(c: Ctx, key: string, yaw: number) {
  const was = c.keep.get(key) as number | undefined;
  c.keep.set(key, yaw);
  return was === undefined ? 0 : yaw - was;
}
/** His shoulder's top (arm `i`), a little behind it: where a hand lies over it. */
const shoulderTop = (r: RikishiModel, i: number, hips: V3, dyaw = 0) => {
  const sh = r.arms[i].sh;
  return on(r, sh.parent!, [sh.position.x, sh.position.y + 0.1, sh.position.z - 0.08], hips, dyaw);
};
/** A whole man's turn (yaw, then his pitch and roll about his feet, as rikishi.ts sets them) as one rotation, and back. */
const _e = new Euler();
const toQ = (yaw: number, pitch: number, roll: number) => new Quaternion().setFromEuler(_e.set(pitch, yaw, roll, 'YXZ'));
function fromQ(q: Quaternion) { _e.setFromQuaternion(q, 'YXZ'); return { yaw: _e.y, pitch: _e.x, roll: _e.z }; }
/** A turn from `a` to `b`, `k` of the way, the short way round. */
const turn = (a: Quaternion, b: Quaternion, k: number) => a.clone().slerp(b, k);
/** Down on the clay: squashed on the knock, and a little bounce. */
function settle(p: Pose, b: number, big = 1): { p: Pose; air: number } {
  return { p: b < 0.14 ? { ...p, sq: 1 - 0.18 * big * Math.sin((b / 0.14) * Math.PI) } : p, air: b < 0.26 ? 0.08 * big * Math.sin((b / 0.26) * Math.PI) : 0 };
}
/** The real time a move's clock (bent by `warp` with `keys`) reaches `T`. */
function unwarp(T: number, keys: [number, number][]) {
  let out = 0, at0 = 0, rate = 1;
  for (const [k, r] of keys) {
    const next = out + (k - at0) * rate;
    if (T <= next) break;
    out = next; at0 = k; rate = r;
  }
  return at0 + (T - out) / rate;
}
/** Which of `of`'s arms each of `by`'s faces (the nearest shoulder to each of his), worked out once, as they stand
 *  when it's first wanted. */
function facing(c: Ctx, key: string, by: RikishiModel, of: RikishiModel): [number, number] {
  let m = c.keep.get(key) as [number, number] | undefined;
  if (!m) {
    by.updateMatrixWorld(true); of.updateMatrixWorld(true);
    const s0 = by.arms[0].sh.getWorldPosition(new Vector3()), o = of.arms.map(A => A.sh.getWorldPosition(new Vector3()));
    m = s0.distanceTo(o[0]) <= s0.distanceTo(o[1]) ? [0, 1] : [1, 0];
    if (c.t > 0.02) c.keep.set(key, m);
  }
  return m;
}
/** Feet stepping on the spot while a man turns (`turned` radians so far): a step every quarter turn or so. */
const pivot = (p: Pose, turned: number, amp = 0.16) => steps(p, Math.abs(turned) * 4, amp);

// ---------- the octopus's own poses ----------
/** Driven to his straw: heels dug in, leaning back into it. */
const HEELS: Pose = { ...BRACE, pitch: -0.05, bend: 0.62, head: -0.3 };
/** Boneless: everything gives, he sags into a squashed puddle of himself, low and sideways. */
const BONELESS = pose({ l0x: 0.95, l0z: 0.75, l0k: 1.7, l1x: 0.7, l1z: 0.85, l1k: 1.45, bend: 0.35, side: -0.32, head: -0.25, sq: 0.74, a0x: 0.7, a0z: 0.95, a0e: 0.4, a1x: 0.9, a1z: 0.75, a1e: 0.5 });
/** The champion tipping over backwards: his legs going, his arms up. */
const TOPPLE = pose({ l0x: 0.5, l0k: 0.6, l1x: -0.2, l1k: 0.3, bend: 0.1, head: 0.2, a0x: 2.4, a0z: 1.0, a0e: 0.2, a1x: 2.4, a1z: 1.0, a1e: 0.2 });
/** Watching, a little crouched, his arms out. */
const WATCH = pose({ l0x: 0.35, l0z: 0.45, l0k: 0.55, l1x: 0.3, l1z: 0.45, l1k: 0.5, bend: 0.25, head: -0.1, a0x: 0.5, a0z: 0.8, a0e: 0.5, a1x: 0.5, a1z: 0.8, a1e: 0.5 });

// ---------- INK ESCAPE (tight: he wins it at his own straw) ----------
// Driven back to his straw, heels on it, the champion's whole weight on him: he gathers himself, his mantle swells,
// and he squirts a cloud of ink in the champion's face. Slowed: the champion's head snaps back, a hand to his eyes;
// the octopus goes boneless, sags, and slips out sideways from the grip. The champion's drive, with nothing in front
// of it, carries him on, stumbling blind past him (a tentacle slaps him on as he goes); his toes catch the straw, he
// twists round windmilling, and goes over backwards off the mound onto the floor. The octopus gathers himself up and
// watches him go.
const inkKeys: [number, number][] = [[0.84, 0.32], [1.3, 1]];
const inkT = (t: number) => warp(t, inkKeys);
/** On its clock: the squirt, the let-go, the trip over the straw, and he lands; where he trips. */
const INK = { SQUIRT: 0.82, LET: 0.9, TRIP: 1.62, LAND: 2.2, AT: 2.75 };
/** The champion's run on, after the octopus lets go: how much of the way to the straw he's gone, `k` of the time
 *  (gathering speed, nothing in front of him). */
const lurch = (k: number) => Math.pow(k, 1.7);
function inkEscape(c: Ctx): Frame {
  const T = inkT(c.t), dir = -c.lSide, w = c.w, l = c.l;
  const edge = dir * (c.ring.r - 0.15), gap = lerp(c.D, c.D * 0.8, ease(seg(T, 0, 0.3)));
  const zk = 1 - ease(seg(T, 0, 0.4));
  const W: At = { x: lerp(c.W0.x, edge, ease(seg(T, 0, 0.55))), z: c.W0.z * zk, yaw: face(w), p: HEELS, air: 0 };
  const L: At = { x: W.x - dir * gap, z: c.L0.z * zk, yaw: face(l), p: DRIVE, air: 0 };
  const f: Frame = { W, L, grip: 1, hold: 1, agitate: lerp(0.5, 1, seg(T, 0, 0.8)) };
  const cx = edge - dir * c.D * 0.8, trip = dir * INK.AT, Ttrip = INK.TRIP, Tland = INK.LAND, FLY = Tland - Ttrip;
  if (T < INK.SQUIRT) {
    // heels on the straw, giving an inch at a time; then he gathers himself: draws in, his head down to the man's face
    const g = ease(seg(T, 0.55, INK.SQUIRT));
    W.p = { ...HEELS, pitch: -0.05 - 0.04 * Math.sin(T * 14) * (1 - g), head: lerp(-0.3, -0.65, g), bend: lerp(0.62, 0.5, g), sq: 1 - 0.07 * g, up: 0.03 * g };
    L.p = steps(DRIVE, T * 15, 0.1);
    f.grip = ease(seg(T, 0, 0.3)); f.hold = lerp(0.7, 1, ease(seg(T, 0, 0.3)));
  } else if (T < INK.LET) {
    // the squirt: he snaps out of his gathering, the champion's head snaps back, one hand to his eyes
    const k = seg(T, INK.SQUIRT, INK.LET);
    W.p = { ...HEELS, head: lerp(-0.65, -0.35, easeOut(k)), bend: 0.5, sq: lerp(0.93, 1.04, easeOut(k)) };
    L.p = { ...DRIVE, head: lerp(-0.55, -1.0, easeOut(k)), bend: lerp(0.78, 0.6, easeOut(k)), a0x: lerp(1.3, 2.55, easeOut(k)), a0z: lerp(-0.3, -0.45, k), a0e: lerp(0.6, 2.25, easeOut(k)) };
    f.hold = [1 - easeOut(k), 1];
  } else {
    // boneless: he sags and slides out sideways from under the champion's grip, round to watch him go by
    const k = ease(seg(T, INK.LET, 1.2)), up = ease(seg(T, 1.45, 2.0));
    W.x = edge - dir * 0.2 * k; W.z = -1.0 * k;
    W.yaw = lerp(face(w), face(w) + dir * 1.4, ease(seg(T, INK.LET, 1.5)));
    W.p = mixPose(mixPose(HEELS, BONELESS, k), WATCH, up);
    f.grip = 1 - ease(seg(T, INK.LET, 1.0)); f.hold = [0, 1 - ease(seg(T, INK.LET, 0.98))];
    f.agitate = lerp(1, 0.35, seg(T, 1.6, 2.6));
    // the champion: nothing in front of him, his drive carries him on, blind; his steps, stride by stride
    const u = T - INK.LET, run = Math.abs(trip - cx), s = run * lurch(clamp01(u / (Ttrip - INK.LET)));
    const blind = (x: number, ph: number, k2: number): At => ({
      x, z: 0.08 * ease(clamp01(u / 0.6)), yaw: face(l), air: 0,
      p: { ...walk(ph, 0.5), bend: lerp(0.65, 0.95, k2), head: -0.9 + 0.3 * k2, pitch: 0.06 + 0.3 * k2, a0x: 2.55 - 0.9 * k2, a0z: -0.4 + 0.9 * k2, a0e: 2.25 - 1.6 * k2, a1x: 1.7 + 0.5 * Math.sin(ph * 1.3), a1z: 0.6, a1e: 0.3 },
    });
    if (T < Ttrip) {
      Object.assign(L, blind(cx + dir * s, (s / 0.5) * Math.PI, s / run));
      // a tentacle slaps him on, on his back as he goes by
      const by = clamp01(0.5 + (dir * (L.x - W.x) - 0.1) / 0.9), slap = Math.sin(by * Math.PI) * (T < Ttrip - 0.05 ? 1 : 0);
      if (slap > 0) f.reach = [['W', 1, on(c.L, c.L.spine, [0.3 * dir, 0.3, -0.3], hipsAt(L, c.ring)), slap]];
    } else {
      // his toes catch the straw: he twists round, windmilling, trying to catch himself, and goes over backwards off
      // the mound, onto his back on the floor
      const from = blind(trip, (run / 0.5) * Math.PI, 1), to: At = { x: dir * (c.ring.half + 1.75), z: 0.3, yaw: face(l) - dir * Math.PI, p: DOWN, air: 0 };
      const p0 = hipsAt(from, c.ring), p1 = hipsAt(to, c.ring);
      if (T < Tland) {
        const k2 = (T - Ttrip) / FLY, ky = ease(seg(k2, 0, 0.7)), kp = easeIn(seg(k2, 0.15, 1));
        const flail = { ...mixPose(from.p, TOPPLE, ease(seg(k2, 0, 0.4))), a0x: 2.4 + 0.7 * Math.sin(k2 * 17), a1x: 2.4 + 0.7 * Math.cos(k2 * 17) };
        Object.assign(L, { x: lerp(from.x, to.x, k2), z: lerp(from.z, to.z, k2), yaw: lerp(from.yaw, to.yaw, ky), air: 0, p: { ...mixPose(flail, DOWN, kp), pitch: lerp(from.p.pitch, DOWN.pitch, kp) } });
        f.lHips = fly(p0, p1, FLY, T - Ttrip);
      } else {
        const s2 = settle(DOWN, T - Tland);
        Object.assign(L, { ...to, p: s2.p, air: s2.air });
      }
    }
    f.hold = T < 1.0 ? f.hold : 0;
  }
  return f;
}
export const tight: FinishMove = {
  lands: unwarp(INK.LAND, inkKeys), done: unwarp(INK.LAND, inkKeys) + 0.36, frame: inkEscape,
  beats(c, fx, t0, t1) {
    const a = inkT(t0), b = inkT(t1);
    for (let s = 0.1; s < 0.55; s += 0.15) if (crossed(a, b, s)) { fx.dust(fx.at('W', 'foot0'), 3, 0.6); fx.kick('W', 0.8); }
    if (crossed(a, b, INK.SQUIRT)) {
      const h = fx.at('L', 'head'), o = fx.at('W', 'head');
      fx.ink(lerpV3(o, h, 0.7), 46); fx.ink(h, 20); fx.kick('W', 3); fx.hit(0.25, 0, 1.15);
      fx.word('SPLURT!', [h[0], h[1] + 0.7, h[2]], { fill: '#2A1F3D', size: 0.9 });
      fx.react('upset');
    }
    // his blind steps, and the dust as he trips over the straw
    if (crossed(a, b, 1.0)) fx.ink(fx.at('L', 'head'), 10);
    if (crossed(a, b, 1.45)) { fx.kick('L', 2); fx.word('SLAP!', fx.at('L', 'chest'), { size: 0.6 }); }
    for (const s of [1.15, 1.35, 1.5]) if (crossed(a, b, s)) fx.dust(fx.at('L', 'foot1'), 3, 0.7);
    void c;
  },
};
const lerpV3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// ---------- EIGHT-ARM WRAP (heavy: he wins it big) ----------
// He has the champion at his own straw. He steps in tight and wraps him up: his two arms leave the belt and coil up
// over the champion's shoulders, the four under his belt thrash round his legs, the champion's arms pinned to him. He
// sinks, and heaves him up off the clay, chest to chest, the champion's legs kicking; then he turns with him, faster
// and faster, the champion's legs flung out by the swing, half a turn round, and lets him go: slowed a moment as he
// flies, rolling over, off the mound to the south, down on his back on the floor. The octopus, spun on by his own
// throw, catches his feet.
const WRAP = { IN: 0.5, SINK: 0.72, UP: 1.05, SWING: 1.05, GO: 2.15, FLY: 0.68 };
/** The swing: how far his legs fly out (his middle out from the octopus), how far he trails behind it, how far he tips
 *  over flat (all at full speed), and how far the octopus leans back against him. */
const FLING = 0.15, LAG = 0.1, PIT = 1.0, WP = 0.1;
const wrapKeys: [number, number][] = [[2.05, 0.42], [2.36, 1]];
const wrapT = (t: number) => warp(t, wrapKeys);
/** The octopus, wrapped round him: leaning in over him, his knees bent. */
const WRAPPED = pose({ l0x: 0.6, l0z: 0.5, l0k: 0.95, l1x: 0.35, l1z: 0.5, l1k: 0.7, bend: 0.85, head: -0.45, a0x: 1.6, a0z: 0.1, a0e: 0.6, a1x: 1.6, a1z: 0.1, a1e: 0.6 });
/** Heaving him up: arched back under him, his legs driving straight. */
const HEAVE = pose({ l0x: 0.3, l0z: 0.55, l0k: 0.35, l1x: 0.15, l1z: 0.55, l1k: 0.3, bend: 0.3, head: -0.5, pitch: -0.12, a0x: 1.9, a0z: 0.1, a0e: 0.8, a1x: 1.9, a1z: 0.1, a1e: 0.8 });
/** The champion lifted: draped over him, his legs hanging and kicking. */
const hung = (t: number, k: number) => pose({ l0x: 0.25 + 0.35 * Math.sin(t * 11) * k, l0k: 0.5 + 0.3 * Math.max(0, Math.sin(t * 11)) * k, l1x: 0.2 - 0.35 * Math.sin(t * 11) * k, l1k: 0.4 + 0.3 * Math.max(0, -Math.sin(t * 11)) * k, l0z: 0.25, l1z: 0.25, bend: 0.3, head: -0.3, pitch: 0.14 * k, a0x: 1.2, a0z: 0.2, a0e: 1.1, a1x: 1.2, a1z: 0.2, a1e: 1.1 });
function eightArm(c: Ctx): Frame {
  const T = wrapT(c.t), dir = c.lSide, w = c.w, l = c.l;
  const straw = dir * (c.ring.r - 0.05), zk = 1 - ease(seg(T, 0, 0.4));
  const Lx = lerp(c.L0.x, straw, ease(seg(T, 0, 0.4))), gap = lerp(c.D, c.D * 0.8, ease(seg(T, 0, WRAP.IN)));
  const W: At = { x: Lx - dir * gap, z: c.W0.z * zk, yaw: face(w), p: WRAPPED, air: 0 };
  const L: At = { x: Lx, z: c.L0.z * zk, yaw: face(l), p: BRACE, air: 0 };
  const f: Frame = { W, L, agitate: lerp(0.6, 1, seg(T, 0, 0.3)), hold: 0.85 };
  const arms = c.t > 0.02 ? facing(c, 'wrap', c.W, c.L) : [0, 1];
  const onShoulders = (k: number, hips: V3) => {
    const dy = turned(c, 'wrapYaw', L.yaw);
    f.reach = [0, 1].map(i => ['W', i, shoulderTop(c.L, arms[i], hips, dy), k] as ['W', 0 | 1, V3, number]);
  };
  // the lift's end, where the swing takes over
  const lifted = (x: number, Tn: number): At => ({ x: x - dir * 0.12, z: 0, yaw: face(l), p: hung(Tn, 1), air: 0.42 });
  if (T < WRAP.SINK) {
    // in tight, his arms up from the belt over the champion's shoulders; then he sinks under him
    const k = ease(seg(T, 0.08, 0.45)), sink = Math.sin(Math.PI * seg(T, WRAP.IN, WRAP.SINK + 0.1));
    W.p = { ...steps(mixPose(GRIP, WRAPPED, ease(seg(T, 0, 0.35))), T * 14, 0.1 * (1 - seg(T, 0.35, 0.5))), l0k: WRAPPED.l0k + 0.45 * sink, l1k: WRAPPED.l1k + 0.45 * sink };
    f.grip = 0.9 * (1 - k);
    L.p = { ...BRACE, twist: 0.22 + 0.18 * Math.sin(T * 9) * k, head: -0.05 - 0.2 * k, pitch: -0.1 + 0.06 * k };
    onShoulders(k, hipsAt(L, c.ring));
  } else if (T < WRAP.UP) {
    // the heave: up through his legs, arching back, and the champion's feet leave the clay
    const k = ease(seg(T, WRAP.SINK, WRAP.UP)), sink = Math.sin(Math.PI * seg(T, WRAP.IN, WRAP.SINK + 0.1)) * (T < WRAP.SINK + 0.1 ? 1 : 0);
    W.p = { ...mixPose(WRAPPED, HEAVE, k), l0k: lerp(WRAPPED.l0k, HEAVE.l0k, k) + 0.45 * sink, l1k: lerp(WRAPPED.l1k, HEAVE.l1k, k) + 0.45 * sink };
    Object.assign(L, { ...lifted(Lx, T), x: Lx - dir * 0.12 * k, air: 0.42 * k, p: mixPose({ ...BRACE, pitch: -0.04, head: -0.25 }, hung(T, k), k) });
    f.hold = lerp(0.85, 0.5, k);
    onShoulders(1, hipsAt(L, c.ring));
  } else {
    // the swing: he turns with him about his own feet, faster and faster, half a turn, and the champion's legs fly out
    const s = seg(T, WRAP.SWING, WRAP.GO), Ts = WRAP.GO - WRAP.SWING, wEnd = (2 * Math.PI) / Ts;
    const L1 = lifted(Lx, WRAP.SWING), p1 = hipsAt(L1, c.ring), ox = Lx - dir * c.D * 0.8;
    const a0 = Math.atan2(p1[0] - ox, p1[2]), R0 = Math.hypot(p1[0] - ox, p1[2]);
    const a = a0 + Math.PI * Math.min(1, s * s), om = wEnd * Math.min(1, s), fling = (om / wEnd) ** 2;
    const R = R0 + FLING * fling, h = p1[1] + 0.12 * fling;
    const ring = (an: number, r: number, y: number): V3 => [ox + r * Math.sin(an), y, r * Math.cos(an)];
    if (T < WRAP.GO) {
      f.lHips = ring(a, R, h);
      Object.assign(L, { x: f.lHips[0], z: f.lHips[2], yaw: a + Math.PI - LAG * fling, air: 0, p: { ...hung(T, 1 - fling), pitch: 0.14 + PIT * fling, l0x: 0.1, l1x: -0.15, l0z: 0.35 + 0.2 * fling, l1z: 0.35 + 0.2 * fling } });
      W.yaw = a; W.p = { ...pivot(HEAVE, a - a0, 0.14), pitch: -0.12 - WP * fling, bend: 0.3 - 0.1 * fling };
      onShoulders(1, f.lHips);
      f.hold = 0.5 * (1 - s);
    } else {
      // let go: he flies off the mound, rolling over onto his back; and comes down on the floor
      const aG = a0 + Math.PI, pG = ring(aG, R0 + FLING, p1[1] + 0.12), v = (R0 + FLING) * wEnd;
      const vz = Math.cos(aG + Math.PI / 2), vx = Math.sin(aG + Math.PI / 2);
      const land: At = { x: 0, z: 0, yaw: aG + Math.PI / 2 + Math.PI, p: DOWN, air: 0 };
      const zEnd = Math.min(5.0, Math.max(c.ring.half + 1.35, Math.abs(pG[2] + vz * v * WRAP.FLY)));
      land.x = pG[0] + vx * v * WRAP.FLY * 0.6; land.z = Math.sign(vz || 1) * zEnd;
      const pL = hipsAt(land, c.ring), u = T - WRAP.GO;
      const qFrom = toQ(aG + Math.PI - LAG, 0.14 + PIT, 0), qTo = toQ(land.yaw, DOWN.pitch, 0);
      if (u < WRAP.FLY) {
        const k = u / WRAP.FLY, o = fromQ(turn(qFrom, qTo, ease(k)));
        f.lHips = fly(pG, pL, WRAP.FLY, u);
        Object.assign(L, { x: f.lHips[0], z: f.lHips[2], yaw: o.yaw, air: 0, p: { ...mixPose(hung(T, 0), DOWN, ease(k)), l0x: lerp(0.1, DOWN.l0x, k), pitch: o.pitch, roll: o.roll, a0x: 2.4 + 0.6 * Math.sin(u * 20), a1x: 2.4 + 0.6 * Math.cos(u * 20), a0z: 1.0, a1z: 1.0 } });
      } else {
        const st = settle(DOWN, u - WRAP.FLY);
        Object.assign(L, { ...land, p: st.p, air: st.air });
      }
      // spun on by his own throw: he turns on a little, catching his feet, his arms out; and watches
      const k = easeOut(seg(u, 0, 0.6));
      W.yaw = aG + 0.7 * k; W.p = mixPose({ ...HEAVE, pitch: -0.24, bend: 0.2 }, WATCH, ease(seg(u, 0.1, 0.8)));
      W.p = pivot(W.p, 0.7 * k, 0.14);
      f.hold = 0; f.agitate = lerp(1, 0.35, seg(u, 0.4, 1.2));
    }
    W.x = ox; W.z = 0;
  }
  return f;
}
export const heavy: FinishMove = {
  lands: unwarp(WRAP.GO + WRAP.FLY, wrapKeys), done: unwarp(WRAP.GO + WRAP.FLY, wrapKeys) + 0.36, frame: eightArm,
  beats(c, fx, t0, t1) {
    const a = wrapT(t0), b = wrapT(t1);
    if (crossed(a, b, 0.3)) { fx.word('SHLUCK!', fx.at('L', 'chest'), { size: 0.7, fill: '#C9739F' }); fx.kick('L', 2); }
    if (crossed(a, b, WRAP.SINK + 0.05)) { fx.dust(fx.at('W', 'foot0'), 5, 0.8); fx.dust(fx.at('W', 'foot1'), 5, 0.8); fx.kick('W', 3); }
    if (crossed(a, b, WRAP.UP)) { fx.hit(0.15, 0, 1.12); fx.react('charge'); }
    for (const s of [1.5, 1.8, 2.0]) if (crossed(a, b, s)) fx.dust(fx.at('W', s === 1.8 ? 'foot1' : 'foot0'), 4, 0.8);
    if (crossed(a, b, WRAP.GO)) { fx.hit(0.3, 0, 1.15); fx.react('edge'); }
    void c;
  },
};
// ---------- TENTACLE TWIST (champTight: the champion turns it at his own straw) ----------
// The octopus drives him to his straw, all eight arms going. Heels on it, the champion works his hands in through the
// tentacles onto the belt, sinks, and turns his hip in under him; then twists, rising: the octopus's own drive carries
// him up onto the champion's hip, his feet leave the clay, slowed over the top, wheeled over it, his tentacles flailing,
// and thrown down out past the straw behind the champion, on his back. The champion follows through, bent over him.
const TWIST = { EDGE: 0.6, LOAD: 0.85, GO: 1.32, LAND: 1.66 };
const twistKeys: [number, number][] = [[1.0, 0.42], [1.4, 1]];
const twistT = (t: number) => warp(t, twistKeys);
/** The champion loaded: sunk low, his hip turned in under him. */
const LOADED = pose({ l0x: 0.85, l0z: 0.6, l0k: 1.45, l1x: 0.55, l1z: 0.6, l1k: 1.1, bend: 0.55, head: -0.35, twist: 0.35, side: 0.15, a0x: 1.1, a0z: -0.25, a0e: 0.9, a1x: 1.0, a1z: -0.2, a1e: 1.0 });
/** And the throw's follow-through: bent over, his legs driven straight. */
const OVER = pose({ l0x: 0.55, l0z: 0.5, l0k: 0.6, l1x: -0.1, l1z: 0.45, l1k: 0.2, bend: 1.05, head: -0.4, twist: 0.5, side: 0.25, a0x: 1.3, a0z: 0.1, a0e: 0.3, a1x: 1.0, a1z: 0.3, a1e: 0.6 });
/** The octopus going over: his legs gone from under him, kicking, his arms flung out. */
const flailing = (t: number) => pose({ l0x: 0.7 + 0.5 * Math.sin(t * 13), l0k: 0.6 + 0.4 * Math.sin(t * 9), l1x: 0.4 - 0.5 * Math.sin(t * 13), l1k: 0.8, l0z: 0.4, l1z: 0.5, bend: 0.25, head: 0.2, a0x: 2.3 + 0.6 * Math.sin(t * 17), a0z: 1.1, a0e: 0.3, a1x: 2.1 + 0.6 * Math.cos(t * 15), a1z: 1.2, a1e: 0.3 });
function tentacleTwist(c: Ctx): Frame {
  const T = twistT(c.t), e = -c.lSide, w = c.w, l = c.l, spin = -e;
  const edge = e * (c.ring.r - 0.15), gap = lerp(c.D, c.D * 0.8, ease(seg(T, 0, 0.4))), zk = 1 - ease(seg(T, 0, 0.4));
  const W: At = { x: lerp(c.W0.x, edge, ease(seg(T, 0, 0.5))), z: c.W0.z * zk, yaw: face(w), p: HEELS, air: 0 };
  const L: At = { x: W.x - e * gap, z: c.L0.z * zk, yaw: face(l), p: steps(DRIVE, T * 15, 0.1), air: 0 };
  const f: Frame = { W, L, grip: lerp(0.6, 1, ease(seg(T, 0.1, TWIST.EDGE))), hold: lerp(0.7, 1, ease(seg(T, 0, 0.3))), agitate: 1 };
  // where the load leaves them: the champion sunk, the octopus driving onto him
  const P0 = edge, Lload: At = { x: P0 - e * c.D * 0.8, z: 0, yaw: face(l), p: { ...DRIVE, bend: 0.95, pitch: 0.12 }, air: 0 };
  if (T < TWIST.EDGE) {
    // driven to the straw, heels on it, his hands working in through the tentacles to the belt
    W.p = { ...HEELS, pitch: -0.05 - 0.04 * Math.sin(T * 13), a0x: 1.2, a1x: 1.2 };
  } else if (T < TWIST.LOAD) {
    // he sinks, and turns his hip in under him; the octopus, driving still, comes on over it
    const k = ease(seg(T, TWIST.EDGE, TWIST.LOAD));
    W.x = P0; W.yaw = face(w) + spin * 0.45 * k; W.p = mixPose(HEELS, LOADED, k);
    Object.assign(L, { ...Lload, x: lerp(L.x, Lload.x, k), p: mixPose(L.p, Lload.p, k) });
  } else {
    // the twist: he rises and turns, and the octopus goes up over his hip, round him, and over
    const s = seg(T, TWIST.LOAD, TWIST.GO), pA = hipsAt(Lload, c.ring), P = P0 - e * 0.25 * ease(s);
    const a0 = Math.atan2(pA[0] - P0, pA[2]), r0 = Math.hypot(pA[0] - P0, pA[2]), turnBy = 1.6 * spin;
    const orbit = (k: number, piv: number): { at: V3; a: number } => {
      const a = a0 + turnBy * ease(k), r = lerp(r0, 0.72, Math.sin(Math.PI * Math.min(1, k * 1.25))) + 0.12 * easeIn(k), y = pA[1] + 0.55 * Math.sin(Math.PI * Math.min(1, k * 1.1));
      return { at: [piv + r * Math.sin(a), y, r * Math.cos(a)], a };
    };
    const qA = toQ(Math.PI, 0, 0), qB = toQ(e * Math.PI / 2, -1.25, 0);
    const orient = (a: number, k: number) => fromQ(new Quaternion().setFromEuler(_e.set(0, a, 0, 'YXZ')).multiply(turn(qA, qB, k)));
    const Wyaw = (k: number) => face(w) + spin * (0.45 + 1.6 * ease(k));
    W.x = P; W.yaw = Wyaw(s);
    const wp = s < 0.5 ? mixPose(LOADED, OVER, ease(s / 0.5)) : OVER;
    W.p = pivot(wp, 1.6 * ease(s), 0.15);
    if (T < TWIST.GO) {
      const o = orbit(s, P), q = orient(o.a, ease(seg(s, 0.15, 1)) * 0.8);
      f.lHips = o.at;
      Object.assign(L, { x: o.at[0], z: o.at[2], yaw: q.yaw, air: 0, p: { ...mixPose(Lload.p, flailing(T), ease(seg(s, 0, 0.35))), pitch: q.pitch, roll: q.roll } });
      f.hold = 1 - ease(seg(s, 0, 0.3)); f.grip = [1 - 0.4 * ease(seg(s, 0.5, 0.62)), 1 - 0.3 * ease(seg(s, 0.8, 1))];
    } else {
      // let go at the bottom of it: thrown down past the straw, on his back
      const o1 = orbit(1, P), u = T - TWIST.GO, FLY = TWIST.LAND - TWIST.GO;
      const aL = o1.a, rL = 1.45, land: At = { x: P + rL * Math.sin(aL), z: rL * Math.cos(aL), yaw: aL + e * Math.PI / 2, p: DOWN, air: 0 };
      const pL = hipsAt(land, c.ring), qEnd = orient(o1.a, 0.8), qLand = toQ(land.yaw, DOWN.pitch, 0);
      const qRel = toQ(qEnd.yaw, qEnd.pitch, qEnd.roll);
      f.grip = 0.7 * (1 - ease(seg(u, 0, 0.1)));
      if (u < FLY) {
        const k = u / FLY, q = fromQ(turn(qRel, qLand, ease(k)));
        f.lHips = fly(o1.at, pL, FLY, u);
        Object.assign(L, { x: f.lHips[0], z: f.lHips[2], yaw: q.yaw, air: 0, p: { ...mixPose(flailing(T), DOWN, ease(k)), pitch: q.pitch, roll: q.roll } });
      } else {
        const st = settle(DOWN, u - FLY);
        Object.assign(L, { ...land, p: st.p, air: st.air });
      }
      f.hold = 0;
      // he follows it through, bent over him, and comes up a little
      W.p = mixPose(OVER, { ...OVER, bend: 0.75, l0k: 0.8, l1k: 0.4 }, ease(seg(u, 0.2, 0.7)));
    }
  }
  return f;
}
export const champTight: FinishMove = {
  lands: unwarp(TWIST.LAND, twistKeys), done: unwarp(TWIST.LAND, twistKeys) + 0.4, frame: tentacleTwist,
  beats(c, fx, t0, t1) {
    const a = twistT(t0), b = twistT(t1);
    for (let s = 0.1; s < TWIST.EDGE; s += 0.16) if (crossed(a, b, s)) { fx.dust(fx.at('W', 'foot0'), 3, 0.6); fx.kick('W', 0.8); }
    if (crossed(a, b, TWIST.EDGE - 0.1)) fx.word('GOT IT!', fx.at('W', 'head'), { size: 0.6 });
    if (crossed(a, b, TWIST.LOAD)) { fx.kick('L', 3); fx.kick('W', 2); fx.dust(fx.at('W', 'foot1'), 6, 0.9); }
    if (crossed(a, b, TWIST.LOAD + 0.2)) { fx.hit(0.1, 0, 1.12); fx.react('edge'); }
    void c;
  },
};
// ---------- BELT THROW (champGrand: the champion's grand win) ----------
// An overarm belt throw (uwatenage). The octopus is at his own straw; the champion, pressed in, gets his hand over
// the tentacles onto the far side of the belt, sinks, steps back and pivots: he pulls the octopus off the straw and
// round him, the octopus's feet running to keep up, leaning further and further, his tentacles flailing; then his feet
// go, and the champion's arm wheels him over and down: he twists half round as he goes, and lands on his back. The
// champion follows it through, low, his arm out over him.
interface Uwate { GRIP: number; WIND: number; RUN: number; turnBy: number; r1: number }
const UWATE: Uwate = { GRIP: 0.4, WIND: 0.65, RUN: 1.5, turnBy: 2.2, r1: 1.18 };
/** The champion pivoting: low, leaning back against the pull, his hips turned. */
const PIVOT = pose({ l0x: 0.75, l0z: 0.55, l0k: 1.25, l1x: 0.35, l1z: 0.6, l1k: 0.8, bend: 0.45, head: -0.3, twist: 0.3, side: 0.1, pitch: -0.06, a0x: 1.2, a0z: -0.2, a0e: 0.7, a1x: 1.5, a1z: 0.05, a1e: 0.5 });
/** The octopus pulled round him: running, falling forward, his arms out. */
const pulled = (ph: number, k: number) => ({ ...walk(ph, 0.55), bend: lerp(0.45, 0.75, k), head: -0.45, pitch: 0.05 + 0.25 * k, side: -0.15 * k, a0x: 1.6 + 0.6 * Math.sin(ph * 0.7), a0z: 0.9, a0e: 0.3, a1x: 1.9 + 0.6 * Math.cos(ph * 0.8), a1z: 0.8, a1e: 0.3 });
/** The belt throw's first half, the same for the grand win and the epic: the grip, the pivot, and the octopus pulled
 *  round on his feet, up to U.RUN. Returns the frame, and the run as it is (for what comes after). */
function uwateRun(c: Ctx, T: number, U: Uwate) {
  const dir = c.lSide, w = c.w, l = c.l, spin = 1;
  const straw = dir * (c.ring.r - 0.05), zk = 1 - ease(seg(T, 0, 0.4));
  const Lx = lerp(c.L0.x, straw, ease(seg(T, 0, U.GRIP))), gap = lerp(c.D, c.D * 0.82, ease(seg(T, 0, U.GRIP)));
  const P0 = straw - dir * c.D * 0.82, P = P0 - dir * 0.18 * ease(seg(T, U.GRIP, U.WIND + 0.2));
  const W: At = { x: Lx - dir * gap, z: c.W0.z * zk, yaw: face(w), p: steps(DRIVE, T * 15, 0.1), air: 0 };
  const L: At = { x: Lx, z: c.L0.z * zk, yaw: face(l), p: BRACE, air: 0 };
  const f: Frame = { W, L, grip: ease(seg(T, 0, 0.3)), hold: 0.8, agitate: 1 };
  const a0 = Math.atan2(straw - P0, 0), r0 = c.D * 0.82, Ts = U.RUN - U.WIND;
  const s = seg(T, U.WIND, U.RUN), g = Math.pow(s, 1.5), a = a0 + spin * U.turnBy * g, om = (1.5 * U.turnBy * Math.sqrt(s)) / Ts;
  const r = lerp(r0, U.r1, ease(s)), dist = U.turnBy * g * lerp(r0, U.r1, 0.5);
  if (T < U.GRIP) {
    // pressed in, his hand over onto the far side of the belt
    W.p = { ...steps(DRIVE, T * 15, 0.1), a1x: 1.6, a1z: 0.1 };
    L.p = { ...BRACE, pitch: -0.1 - 0.04 * Math.sin(T * 13), bend: 0.45 };
  } else if (T < U.WIND) {
    // he sinks, steps back, and starts to turn
    const k = ease(seg(T, U.GRIP, U.WIND));
    W.x = lerp(W.x, P, k); W.p = mixPose(DRIVE, PIVOT, k); W.yaw = face(w) + spin * 0.2 * k;
    f.grip = [1 - 0.5 * k, 1];
    L.p = { ...BRACE, pitch: lerp(-0.1, 0.12, k), bend: lerp(0.45, 0.6, k) };
  } else {
    // round him: the octopus's feet running to keep up
    W.x = P; W.z = 0; W.yaw = a + spin * (0.2 + 0.3 * s); W.p = pivot(PIVOT, a - a0, 0.16);
    Object.assign(L, { x: P + r * Math.sin(a), z: r * Math.cos(a), yaw: a + Math.PI - spin * 1.3 * ease(s), air: 0, p: pulled((dist / 0.45) * Math.PI, s) });
    f.hold = 0.8 * (1 - ease(seg(s, 0, 0.25))); f.grip = [0.5 - 0.2 * s, 1];
  }
  return { f, W, L, P, a, r, om, s, spin };
}
const GRAND = { FLY: 0.42 };
const grandKeys: [number, number][] = [[1.45, 0.45], [1.75, 1]];
const grandT = (t: number) => warp(t, grandKeys);
/** The thrower's finish: low, his throwing arm out down over the man he threw. */
const THREW = pose({ l0x: 0.9, l0z: 0.6, l0k: 1.4, l1x: 0.1, l1z: 0.55, l1k: 0.3, bend: 0.9, head: -0.5, twist: 0.45, side: 0.2, a0x: 0.6, a0z: 0.5, a0e: 0.6, a1x: 1.1, a1z: 0.2, a1e: 0.1 });
function beltThrow(c: Ctx): Frame {
  const T = grandT(c.t), U = UWATE;
  const run = uwateRun(c, T, U), { f, W, L } = run;
  if (T < U.RUN) return f;
  // his feet go: wheeled over and down, twisting half round, on his back
  const end = uwateRun(c, U.RUN, U), from = end.L, p0 = hipsAt(from, c.ring), u = T - U.RUN;
  const head = end.a + end.spin * Math.PI / 2, v = end.r * end.om * 0.8;
  const land: At = { x: p0[0] + Math.sin(head) * v * GRAND.FLY, z: p0[2] + Math.cos(head) * v * GRAND.FLY, yaw: head + Math.PI, p: DOWN, air: 0 };
  const pL = hipsAt(land, c.ring), qA = toQ(from.yaw, from.p.pitch, 0), qB = toQ(land.yaw, DOWN.pitch, 0);
  if (u < GRAND.FLY) {
    const k = u / GRAND.FLY, q = fromQ(turn(qA, qB, ease(k)));
    f.lHips = fly(p0, pL, GRAND.FLY, u);
    Object.assign(L, { x: f.lHips[0], z: f.lHips[2], yaw: q.yaw, air: 0, p: { ...mixPose(flailing(T), DOWN, ease(k)), pitch: q.pitch, roll: q.roll } });
  } else {
    const st = settle(DOWN, u - GRAND.FLY);
    Object.assign(L, { ...land, p: st.p, air: st.air });
  }
  f.grip = [Math.max(0, 1 - u / 0.12) * 0.9, Math.max(0, 1 - u / 0.2) * 0.9];
  f.hold = 0; f.agitate = lerp(1, 0.4, seg(u, 0.5, 1.4));
  // the champion follows it through, turning on with him, and comes up a little
  const k = easeOut(seg(u, 0, 0.45));
  W.x = end.P; W.yaw = end.W.yaw + end.spin * 0.6 * k;
  W.p = pivot(mixPose(PIVOT, THREW, k), 0.6 * k, 0.16);
  return f;
}
export const champGrand: FinishMove = {
  lands: unwarp(UWATE.RUN + GRAND.FLY, grandKeys), done: unwarp(UWATE.RUN + GRAND.FLY, grandKeys) + 0.4, frame: beltThrow,
  beats(c, fx, t0, t1) {
    const a = grandT(t0), b = grandT(t1);
    if (crossed(a, b, UWATE.GRIP - 0.1)) fx.kick('L', 2);
    if (crossed(a, b, UWATE.WIND)) { fx.dust(fx.at('W', 'foot1'), 6, 0.9); fx.react('edge'); }
    for (let s = UWATE.WIND + 0.15; s < UWATE.RUN; s += 0.17) if (crossed(a, b, s)) fx.dust(fx.at('L', 'foot0'), 3, 0.7);
    if (crossed(a, b, UWATE.RUN)) { fx.hit(0.15, 0, 1.15); fx.dust(fx.at('L', 'foot1'), 6, 1); }
    void c;
  },
};
// ---------- the epic: BELT THROW gone wild (a perfect slam) ----------
// It starts as the belt throw: the hand over onto the far side of the belt, the pivot, the octopus pulled round on his
// feet. But the champion doesn't let him fall: he keeps turning, faster, and the octopus's feet leave the clay; he's
// whirled round flat at the end of the champion's arms like a hammer, ink spraying off him, faster and faster; then
// the champion dips and heaves him up, his arms over his head, and lets go. The octopus goes up into the dark,
// tumbling, trailing ink, slowed at the top under the beams; the champion, below, sets his feet, raises his leg, and as
// the octopus comes down, stamps: a frozen frame of the impact, and he hits the clay in a crater of ink and dust.
const EP = { GRIP: 0.35, WIND: 0.55, RUN: 1.0, WHIRL: 2.0, REL: 2.3, FLY: 1.98, OM: 10, SLOW: 0.4, FREEZE: 0.25 };
const UE: Uwate = { GRIP: EP.GRIP, WIND: EP.WIND, RUN: EP.RUN, turnBy: 1.3, r1: 0.9 };
const EP_LAND = EP.REL + EP.FLY;
/** Slowed round the top of his flight, and frozen a moment just before he hits. */
const epicKeys: [number, number][] = (() => {
  const s0 = EP.REL + 0.6, s1 = EP.REL + 1.25, fz = EP_LAND - 0.03;
  const r0 = s0, r1 = r0 + (s1 - s0) / EP.SLOW, r2 = r1 + (fz - s1);
  return [[r0, EP.SLOW], [r1, 1], [r2, 0], [r2 + EP.FREEZE, 1]];
})();
const epicT = (t: number) => warp(t, epicKeys);
/** Cubic from (p0, v0) to (p1, v1) over `T` seconds, at `u` of the way: a hand-off that keeps the speed. */
function hermite(p0: V3, v0: V3, p1: V3, v1: V3, T: number, u: number): V3 {
  const u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  return [0, 1, 2].map(i => h00 * p0[i] + h10 * T * v0[i] + h01 * p1[i] + h11 * T * v1[i]) as V3;
}
/** The champion's stamp: his leg up high to the side, leaning over the other, or down. */
const STAMP_UP = pose({ bend: 0.35, head: -0.35, side: -0.4, a0x: 0.5, a1x: 0.5, a0z: 0.5, a1z: 0.5, a0e: 0.5, a1e: 0.5, l1x: 0.6, l1z: 1.35, l1k: 0.6, l0x: 0.2, l0z: 0.3, l0k: 0.35 });
const HAMMER = pose({ l0x: 0.6, l0z: 0.55, l0k: 1.0, l1x: 0.3, l1z: 0.55, l1k: 0.6, bend: 0.5, head: -0.3, pitch: 0, a0x: 1.4, a0z: 0, a0e: 0.2, a1x: 1.4, a1z: 0, a1e: 0.2 });
const OVERHEAD = pose({ l0x: 0.2, l0z: 0.45, l0k: 0.3, l1x: 0.1, l1z: 0.45, l1k: 0.2, bend: -0.15, head: -0.6, pitch: -0.05, a0x: 2.8, a0z: 0.1, a0e: 0.1, a1x: 2.8, a1z: 0.1, a1e: 0.1 });
function epicState(c: Ctx) {
  const end = uwateRun(c, UE.RUN, UE), P = end.P, om0 = end.om, Tw = EP.WHIRL - EP.RUN;
  const aW = (tau: number) => end.a + om0 * tau + (0.5 * (EP.OM - om0) * tau * tau) / Tw;
  const aEnd = aW(Tw), hW = 1.62 + c.ring.top - 0.6;
  // where he's let go: up beside the champion, a little round on; and where he comes down
  const aRel = aEnd + 1.25, pRel: V3 = [P + 0.8 * Math.sin(aRel), c.ring.top + 1.75, 0.8 * Math.cos(aRel)];
  const land: At = { x: P - c.lSide * 2.35, z: 0.35, yaw: face(c.w), p: DOWN, air: 0 };
  return { end, P, om0, Tw, aW, aEnd, hW, aRel, pRel, land, pLand: hipsAt(land, c.ring) };
}
function epicFrame(c: Ctx): Frame {
  const T = epicT(c.t), run = uwateRun(c, T, UE), { f, W, L } = run;
  if (T < UE.RUN) { f.cam = { wide: 0.2 * seg(T, 0.5, 1), take: true }; return f; }
  const S = epicState(c), { P, end } = S, spin = end.spin;
  W.x = P; W.z = 0; f.hold = 0; f.agitate = 1;
  const ring = (a: number, r: number, y: number): V3 => [P + r * Math.sin(a), y, r * Math.cos(a)];
  const qRun = toQ(end.L.yaw, end.L.p.pitch, 0), flat = (a: number) => toQ(a + Math.PI, 0.1, 1.35 * spin);
  const p0 = hipsAt(end.L, c.ring);
  if (T < EP.WHIRL) {
    // whirled round: his feet off the clay, flung out flat, faster and faster
    const tau = T - UE.RUN, a = S.aW(tau), om = S.om0 + ((EP.OM - S.om0) * tau) / S.Tw, k = ease(seg(tau, 0, 0.4));
    const r = lerp(end.r, UE.r1, k), y = lerp(p0[1], S.hW, k) + 0.18 * Math.sin(a) * seg(tau, 0.3, 1);
    f.lHips = ring(a, r, y);
    const q = fromQ(turn(qRun, flat(a), k));
    Object.assign(L, { x: f.lHips[0], z: f.lHips[2], yaw: q.yaw, air: 0, p: { ...mixPose(end.L.p, flailing(T), k), pitch: q.pitch, roll: q.roll } });
    W.yaw = a + spin * 0.5 * (1 - k); W.p = pivot(mixPose(PIVOT, HAMMER, k), a - end.a, 0.18);
    f.grip = [lerp(0.3, 0.7, ease(seg(tau, 0, 0.3))), 1];
    f.cam = { wide: 0.2 + 0.3 * (om / EP.OM), take: true };
    return f;
  }
  // the whirl's end: where he is and how fast he's going
  const aE = S.aEnd, pW = ring(aE, UE.r1, S.hW + 0.18 * Math.sin(aE)), vW: V3 = [UE.r1 * EP.OM * Math.cos(aE), 0.18 * EP.OM * Math.cos(aE), -UE.r1 * EP.OM * Math.sin(aE)];
  const vRel: V3 = [(S.pLand[0] - S.pRel[0]) / EP.FLY, (S.pLand[1] - S.pRel[1]) / EP.FLY + 0.5 * 9.8 * EP.FLY, (S.pLand[2] - S.pRel[2]) / EP.FLY];
  const qFlat = flat(aE);
  if (T < EP.REL) {
    // the heave: he dips, and heaves him up over his head, round and up
    const u = seg(T, EP.WHIRL, EP.REL), dip = Math.sin(Math.PI * Math.min(1, u * 1.6));
    f.lHips = hermite(pW, vW, S.pRel, vRel, EP.REL - EP.WHIRL, u);
    const a = Math.atan2(f.lHips[0] - P, f.lHips[2]);
    const q = fromQ(turn(qFlat, toQ(a + Math.PI, -0.3, 0.6 * spin), ease(u)));
    Object.assign(L, { x: f.lHips[0], z: f.lHips[2], yaw: q.yaw, air: 0, p: { ...flailing(T), pitch: q.pitch, roll: q.roll } });
    W.yaw = a; W.p = { ...mixPose(HAMMER, OVERHEAD, ease(u)), l0k: lerp(HAMMER.l0k, OVERHEAD.l0k, ease(u)) + 0.5 * dip * (1 - u), l1k: lerp(HAMMER.l1k, OVERHEAD.l1k, ease(u)) + 0.5 * dip * (1 - u) };
    // (his hands opening as he heaves, and he lets go at the top)
    f.grip = u < 0.1 ? 1 : lerp(0.92, 0.6, seg(u, 0.1, 1));
    f.cam = { wide: 0.5, y: 1.0 * u, take: true };
    return f;
  }
  // up into the dark, tumbling, and down: a gravity arc, slowed at the top (the move's clock), frozen just before he hits
  const u = T - EP.REL, aR = Math.atan2(S.pRel[0] - P, S.pRel[2]);
  const qRel = toQ(aR + Math.PI, -0.3, 0.6 * spin), qLand = toQ(S.land.yaw, DOWN.pitch, 0);
  const axis = new Vector3(Math.cos(aR), 0, -Math.sin(aR)), TURNS = 2 * TAU;
  f.grip = Math.max(0, 1 - u / 0.08) * 0.6;
  if (u < EP.FLY) {
    const k = u / EP.FLY, qa = new Quaternion().setFromAxisAngle(axis, TURNS * (1 - k));
    const base = turn(new Quaternion().setFromAxisAngle(axis, -TURNS).multiply(qRel), qLand, ease(k));
    const q = fromQ(qa.multiply(base));
    f.lHips = fly(S.pRel, S.pLand, EP.FLY, u);
    Object.assign(L, { x: f.lHips[0], z: f.lHips[2], yaw: q.yaw, air: 0, p: { ...mixPose(flailing(T), DOWN, ease(seg(k, 0.6, 1))), pitch: q.pitch, roll: q.roll } });
    const up = clamp01((f.lHips[1] - c.ring.top - 1) / 5);
    f.cam = { y: 4.2 * up, wide: 0.5 + 0.35 * up, take: true };
  } else {
    // the crater: squashed into the clay, a bounce, and still
    const b = u - EP.FLY;
    L.x = S.land.x; L.z = S.land.z; L.yaw = S.land.yaw;
    L.p = b < 0.16 ? { ...DOWN, sq: 1 - 0.38 * Math.sin((b / 0.16) * Math.PI) } : DOWN;
    L.air = b < 0.16 ? -0.05 * Math.sin((b / 0.16) * Math.PI) : b < 0.5 ? 0.2 * Math.sin(((b - 0.16) / 0.34) * Math.PI) : 0;
    f.sink = b < 0.16;
    f.agitate = lerp(1, 0.2, seg(b, 0.3, 0.8));
    f.cam = { wide: 0.45 * (1 - seg(b, 0.3, 0.9)), take: true };
  }
  // the champion: follows the heave through, turns to face where he'll come down, sets his feet, raises his leg, and
  // stamps as he hits
  const face2 = Math.atan2(S.land.x - P, S.land.z), aR2 = aR, kT = ease(seg(u, 0, 0.5));
  const onBy = ((face2 - aR2) * spin + 4 * TAU) % TAU;
  W.yaw = aR2 + spin * onBy * kT;
  const up = ease(seg(u, 0.7, EP.FLY - 0.35)), down = easeIn(seg(u, EP.FLY - 0.12, EP.FLY));
  W.p = u < 0.5 ? mixPose(OVERHEAD, SHIKO_LOW, ease(seg(u, 0.05, 0.5))) : mixPose(mixPose(SHIKO_LOW, STAMP_UP, up), SHIKO_LOW, down);
  if (u < 0.5) W.p = pivot(W.p, onBy * kT, 0.15);
  return f;
}
export const epic: FinishMove = {
  lands: unwarp(EP_LAND, epicKeys), done: unwarp(EP_LAND, epicKeys) + 0.85, nameAt: EP.REL, frame: epicFrame,
  beats(c, fx, t0, t1) {
    const a = epicT(t0), b = epicT(t1);
    if (crossed(a, b, UE.WIND)) { fx.dust(fx.at('W', 'foot1'), 6, 0.9); fx.react('charge'); }
    for (let s = UE.WIND + 0.15; s < UE.RUN; s += 0.15) if (crossed(a, b, s)) fx.dust(fx.at('L', 'foot0'), 3, 0.7);
    // the whirl: off his feet, speed lines, ink flying off him, dust round the champion's feet
    if (crossed(a, b, UE.RUN)) { fx.screen({ lines: 0.6, for: EP.WHIRL - UE.RUN }); fx.word('WHIRL!', fx.at('W', 'head'), { size: 0.8 }); }
    for (let s = UE.RUN + 0.1; s < EP.REL; s += 0.09) if (crossed(a, b, s)) { fx.ink(fx.at('L', 'hips'), 3); if (Math.round(s * 100) % 3 === 0) fx.dust(fx.at('W', 'foot0'), 4, 1.1); }
    // the launch: a flash, a knock, and the lines as he goes up
    if (crossed(a, b, EP.REL)) { fx.screen({ lines: 1, flash: 'white', for: 1.2 }); fx.hit(0.6, 0.6, 1.2); fx.react('upset'); fx.burst(fx.at('L', 'hips'), 1.5); }
    for (let s = EP.REL + 0.05; s < EP_LAND; s += 0.07) if (crossed(a, b, s)) fx.ink(fx.at('L', 'hips'), 4);
    // the stamp and the impact frame, frozen; then the crater
    if (crossed(a, b, EP_LAND - 0.04)) { fx.screen({ impact: true, flash: 'black', lines: 1, text: 'SPLAT!', for: EP.FREEZE + 0.2 }); fx.hit(0.4, 0, 1.3); }
    if (crossed(t0, t1, unwarp(EP_LAND, epicKeys) - 0.01)) {
      const at = fx.at('L', 'hips'), g: V3 = [at[0], c.ring.top, at[2]];
      fx.ink(g, 90); fx.dust(g, 60, 3); fx.burst(g, 3.2); fx.hit(1.2, 1, 1.6); fx.kick('L', 12); fx.react('win');
      for (let i = 0; i < 10; i++) { const an = (i / 10) * TAU; fx.dust([g[0] + 1.1 * Math.sin(an), g[1], g[2] + 1.1 * Math.cos(an)], 6, 2); }
      fx.dust(fx.at('W', 'foot1'), 10, 1.4);
    }
  },
};
