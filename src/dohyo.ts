// The bouts (stage 3), drawn from fight.ts's clock. Between boss nights, the champion takes on a nameless local about
// every 45 seconds, the free show that keeps the arena alive; ring the gong and the boss steps up instead.
//
// While the fans buy their soup, the pair go through the ritual: up the pallets to their marks, a handful of salt
// over the ring, then over and over until the stall shuts: stamping (shiko) facing the crowd, slapping their bellies
// and glaring, and the squat with the clap and the open arms. While the fans sit down they crouch behind the white
// lines, one fist down, then both. The fight is the mix the player picked: the charge (the big hit, the flash, the
// camera punching in on the watch spot), three seconds of slapping, then they lock on to each other's belts and circle
// as the push goes back and forth, a heave and a puff of dust each time it turns; halfway they break, slap again and
// bump bellies, and lock on again for the drive to the straw. The tug (fight.ts) says where they are all along: the
// side the crowd's with is the one driving. The finish has weight: the loser's heels dig in at the straw, he's lifted
// by the belt, tipped back over it (in slow motion), and falls off the mound with all of it, landing on his back with a
// bounce; the winner, carried on by his own shove, teeters at the edge, catches himself and raises a fist. The referee
// calls the bout and points his fan at the winner; they bow, the winner squats for his prize, and back to the corners.
// The fans watch from the stands (swarm.ts), and the crowd's sound follows the bout (ringSound.ts). The sparring
// partner slaps the teppo post in the corner all the while.
//
// The bosses are sea creatures (creatures.ts), and each brings something of his own to the bout: Hakkaku's tentacles
// thrash in the fight and he squirts ink at the straw and when he lands; Yokobashiri walks in and off sideways and
// snaps his claws; Dobu's stamps shake the ring; Samehada grins (CHOMP!); and Fukure blows up for the glare, the charge
// and whenever he's winning, and goes down like a balloon when he's beaten.
import { CanvasTexture, Group, type Object3D, Sprite, SpriteMaterial, Vector3 } from 'three';
import { boss, CY, DRUMS, parts, PIT_STEPS, RING, RING_HALF, RING_R, RING_TOP } from './cellar';
import { TEPPO } from './cellarPlan';
import { belowGround, Person } from './characters';
import { bossOf, BOUT, F } from './fight';
import { moveOf, type Move } from './finishers';
import { LOOKS, SLAPS } from './creatures';
import { dustFx, inkFx, saltFx, slimeFx } from './fx';
import { isHigh } from './graphics';
import { Build, K, quietly, shade } from './kit';
import { FONT, rr, scene } from './render';
import { crowd, react } from './ringSound';
import { CHAMP, CHAMP_BELT, LOCAL_BELTS, mixPose, type Pose, pose, RikishiModel } from './rikishi';

/** The wrestlers' size, against the game's people. */
const SIZE = 0.92;
/** Their marks either side of the white lines, along the ring's x axis (the champion east, facing west), and where
 *  they crouch. */
const MARK = 1.5, CROUCH_AT = 1.15;
/** How far the bout drives the pair from the middle (to the straw). */
const PUSH = RING_R - 0.6;
/** Where each waits off the ring: by the pallets up to it, the champion east, the opponent west. */
const CORNER = RING_HALF + 1.15;

const ease = (k: number) => k * k * (3 - 2 * k);
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** The sparring partner's belt (his, in the ring for his practice fight, too). */
const PARTNER_BELT = 0x6B4A2C;
const [champ, rival, partner] = quietly(() => [new RikishiModel(CHAMP_BELT), new RikishiModel(LOCAL_BELTS[0]), new RikishiModel(PARTNER_BELT)]);
champ.setWeight(170);
partner.setWeight(140);
for (const r of [champ, rival, partner]) { r.visible = false; r.scale.setScalar(SIZE); scene.add(r); }
// (the wrestlers and the referee these replaced were built with the game's luck: the dice they took, so the luck after
// them stays the same)
for (let i = 0; i < 324; i++) Math.random();

/** How high the ground is `x` east and `z` south of the ring's middle: its top, down the pallets east and west (where
 *  a man goes off it), or the floor. */
const SLOPE = [[0.05, RING_TOP], ...PIT_STEPS.map(s => [s.out, s.top]), [PIT_STEPS[PIT_STEPS.length - 1].out + 0.3, 0]];
function ground(x: number, z = 0) {
  const out = Math.max(Math.abs(x), Math.abs(z)) - RING_HALF;
  if (out <= SLOPE[0][0]) return RING_TOP;
  for (let i = 1; i < SLOPE.length; i++) {
    const [o0, h0] = SLOPE[i - 1], [o1, h1] = SLOPE[i];
    if (out <= o1) return h0 + (h1 - h0) * ((out - o0) / (o1 - o0));
  }
  return 0;
}

// ---------- the poses ----------
const STAND = pose();
const walk = (ph: number, amp = 0.42) => {
  const s = Math.sin(ph);
  return pose({ l0x: s * amp, l0k: Math.max(0, s) * 0.55, l1x: -s * amp, l1k: Math.max(0, -s) * 0.55, a0x: -s * 0.3, a1x: s * 0.3, a0z: 0.08, a1z: 0.08, up: Math.abs(Math.cos(ph)) * 0.025, bend: 0.1, side: s * 0.06 });
};
const SQUAT = pose({ l0x: 1.25, l0z: 0.75, l0k: 2.0, l1x: 1.25, l1z: 0.75, l1k: 2.0, bend: 0.12, head: -0.05, a0x: 0.55, a0z: 0.3, a0e: 0.55, a1x: 0.55, a1z: 0.3, a1e: 0.55 });
const SHIKO_LOW = pose({ l0x: 0.95, l0z: 0.72, l0k: 1.2, l1x: 0.95, l1z: 0.72, l1k: 1.2, bend: 0.45, head: -0.4, a0x: 0.55, a0z: 0.42, a0e: 0.55, a1x: 0.55, a1z: 0.42, a1e: 0.55 });
/** One leg up high to the side for the stamp, leaning over the other. */
const shikoUp = (leg: number) => leg
  ? pose({ bend: 0.3, head: -0.25, side: -0.38, a0x: 0.45, a1x: 0.45, a0z: 0.45, a1z: 0.45, a0e: 0.6, a1e: 0.6, l1x: 0.55, l1z: 1.3, l1k: 0.65, l0x: 0.12, l0z: 0.28, l0k: 0.2 })
  : pose({ bend: 0.3, head: -0.25, side: 0.38, a0x: 0.45, a1x: 0.45, a0z: 0.45, a1z: 0.45, a0e: 0.6, a1e: 0.6, l0x: 0.55, l0z: 1.3, l0k: 0.65, l1x: 0.12, l1z: 0.28, l1k: 0.2 });
const RISE = mixPose(SHIKO_LOW, STAND, 0.55);
const CROUCH = pose({ l0x: 1.15, l0z: 0.55, l0k: 1.65, l1x: 1.15, l1z: 0.55, l1k: 1.65, bend: 1.0, head: -0.8, a0x: 1.15, a0z: 0.06, a0e: 0.1, a1x: 1.15, a1z: 0.06, a1e: 0.1 });
const CROUCH1 = { ...CROUCH, a1x: 0.5, a1z: 0.35, a1e: 0.6 };
const CHARGE = pose({ l0x: 0.75, l0z: 0.35, l0k: 0.9, l1x: -0.35, l1z: 0.3, l1k: 0.2, bend: 0.85, head: -0.6, a0x: 1.4, a0z: -0.05, a0e: 0.3, a1x: 1.4, a1z: -0.05, a1e: 0.3 });
const GRIP = pose({ l0x: 0.55, l0z: 0.48, l0k: 0.85, l1x: 0.55, l1z: 0.48, l1k: 0.85, bend: 0.58, head: -0.35, side: 0.16, twist: 0.22, a0x: 1.1, a0z: -0.3, a0e: 0.85, a1x: 1.0, a1z: -0.2, a1e: 1.0 });
const DRIVE = pose({ l0x: 0.8, l0z: 0.35, l0k: 1.0, l1x: -0.3, l1z: 0.3, l1k: 0.25, bend: 0.78, head: -0.55, side: 0.1, twist: 0.15, a0x: 1.3, a0z: -0.3, a0e: 0.6, a1x: 1.25, a1z: -0.2, a1e: 0.7 });
const BRACE = pose({ l0x: 0.4, l0z: 0.58, l0k: 0.7, l1x: 0.4, l1z: 0.58, l1k: 0.7, bend: 0.3, head: -0.05, side: 0.16, twist: 0.22, a0x: 1.0, a0z: -0.25, a0e: 0.95, a1x: 0.95, a1z: -0.2, a1e: 1.0, pitch: -0.1 });
const STANDOFF = pose({ l0x: 0.5, l0z: 0.5, l0k: 0.8, l1x: 0.5, l1z: 0.5, l1k: 0.8, bend: 0.35, head: -0.25 });
const BOW = pose({ bend: 0.6, head: 0.15, a0x: 0.3, a1x: 0.3 });
const SIT = pose({ l0x: 1.35, l0z: 0.35, l0k: 0.35, l1x: 1.15, l1z: 0.45, l1k: 0.6, bend: -0.12, head: 0.15, a0x: -0.55, a0z: 0.35, a0e: 0.1, a1x: -0.55, a1z: 0.35, a1e: 0.1, seat: 1 });
const LIE = { ...SIT, pitch: -1.25, a0x: 2.2, a1x: 1.8, a0z: 0.9, a1z: 0.9, head: 0.3, l0x: 0.9, l1x: 1.3 };
const FIST = pose({ l0z: 0.25, l1z: 0.25, a0x: 2.95, a0z: 0.12, a0e: 0.15, bend: -0.06, head: 0.2 });
const SHOVE = pose({ l0x: 0.9, l0z: 0.35, l0k: 1.05, l1x: -0.45, l1z: 0.3, l1k: 0.1, bend: 0.8, head: -0.5, a0x: 1.6, a0z: -0.05, a0e: 0, a1x: 1.6, a1z: -0.05, a1e: 0 });
const LIFT = { ...GRIP, bend: 0.3, side: 0, twist: 0.1, a0x: 1.15, a1x: 1.15, a0z: -0.3, a1z: -0.3, a0e: 1.3, a1e: 1.3, l0z: 0.6, l1z: 0.6, l0x: 0.45, l1x: 0.45, l0k: 0.6, l1k: 0.6 };
const TIPPED = { ...BRACE, pitch: -0.28, bend: 0.2, l0x: 0.35, l1x: 0.15, l0k: 0.5, l1k: 0.3 };
const teeter = (a: number) => pose({ bend: 0.5 + 0.12 * Math.sin(a * 9), head: -0.2, a0x: 2.3 + Math.sin(a * 16) * 0.6, a0z: 1.0, a0e: 0.2, a1x: 2.3 + Math.cos(a * 16) * 0.6, a1z: 1.0, a1e: 0.2, l0x: 0.35, l0k: 0.45, l1x: -0.2, l1z: 0.3, l1k: 0.15 });
/** A slap: arm `i` shooting out `k` of the way, the other cocked. */
function slap(i: number, k: number, base: Pose): Pose {
  const o = { ...base, twist: (i ? 1 : -1) * 0.25 * k, side: 0, bend: 0.42, head: -0.3 };
  if (i) { o.a1x = lerp(0.9, 1.6, k); o.a1z = lerp(0.2, -0.12, k); o.a1e = lerp(1.5, 0, k); o.a0x = 0.85; o.a0z = 0.15; o.a0e = 1.6; }
  else { o.a0x = lerp(0.9, 1.6, k); o.a0z = lerp(0.2, -0.12, k); o.a0e = lerp(1.5, 0, k); o.a1x = 0.85; o.a1z = 0.15; o.a1e = 1.6; }
  return o;
}
/** Steps on the spot: each foot lifting in turn, `amp` high. */
/** The crab's walk: sideways, his feet stepping apart and together, his claws up. */
const sideways = (ph: number) => {
  const s = Math.sin(ph);
  return pose({ l0z: 0.2 + 0.38 * Math.max(0, s), l1z: 0.2 + 0.38 * Math.max(0, -s), l0k: 0.25 * Math.max(0, s), l1k: 0.25 * Math.max(0, -s), l0x: 0.12, l1x: 0.12, bend: 0.2, a0x: 0.7, a1x: 0.7, a0z: 0.45, a1z: 0.45, a0e: 1.3, a1e: 1.3, up: Math.abs(s) * 0.03, side: s * 0.05 });
};
/** Whether `who` is the crab, who goes everywhere sideways. */
const crab = (who: number) => who === 1 && rival.kind === 'crab';
const steps = (p: Pose, ph: number, amp: number) => {
  const s = Math.sin(ph);
  return { ...p, l0x: p.l0x + Math.max(0, s) * amp, l0k: p.l0k + Math.max(0, s) * amp * 1.3, l1x: p.l1x + Math.max(0, -s) * amp, l1k: p.l1k + Math.max(0, -s) * amp * 1.3 };
};

// ---------- where they are ----------
/** Where a wrestler stands (x east and z south of the ring's middle), which way he faces, how he stands, and how far
 *  off the ground he's lifted. */
interface At { x: number; z: number; yaw: number; p: Pose; air: number }
/** Facing the other man: the champion (0) west, his opponent (1) east. */
const face = (who: number) => (who ? Math.PI / 2 : -Math.PI / 2);
const at = (who: number, x: number, p: Pose = STAND, o: Partial<At> = {}): At => ({ x, z: 0, yaw: face(who), p, air: 0, ...o });
/** How far apart they stand locked chest to chest (a puffer blown up stands further off). */
const contact = () => 0.5 * (champ.girth + rival.girth) * 1.08 * SIZE;

// the ritual, over and over while the fans buy soup: stamping, sizing each other up, and the squat
const BLOCK = 13.5, SHIKO = 2.15;
function ritual(t: number, who: number): At {
  const s = who ? -1 : 1, mark = s * MARK, tt = t - who * 0.4;
  if (tt < 1) return at(who, s * CORNER);
  if (tt < 4) {
    const x = lerp(s * CORNER, mark, ease((tt - 1) / 3));
    return crab(who) ? at(who, x, sideways(tt * 9), { yaw: 0 }) : at(who, x, walk(tt * 7.5));
  }
  if (tt < 6.5) {
    // salt: reach back, throw it over the ring, and back
    const k = (tt - 4) / 2.5;
    const a = k < 0.3 ? lerp(0, -0.9, ease(k / 0.3)) : k < 0.42 ? lerp(-0.9, 2.1, ease((k - 0.3) / 0.12)) : lerp(2.1, 0, ease(clamp01((k - 0.42) / 0.4)));
    const tw = k < 0.3 ? 0.35 * ease(k / 0.3) : k < 0.42 ? -0.25 : -0.25 * (1 - ease(clamp01((k - 0.42) / 0.4)));
    return at(who, mark, pose({ a0x: a, a0e: 0.25, a0z: 0.15, bend: k < 0.3 ? 0.12 : 0, twist: tw }), crab(who) ? { yaw: lerp(0, face(who), ease(clamp01((tt - 4) / 0.5))) } : {});
  }
  const n = Math.floor((tt - 6.5) / BLOCK), b = (tt - 6.5) % BLOCK;
  if (b < 6.5) {
    // stamping, facing the crowd (and the camera), and turning back to each other after
    const c = b % SHIKO, leg = Math.floor(b / SHIKO) % 2, from = b < SHIKO ? (n ? SQUAT : STAND) : RISE;
    let p = c < 0.8 ? mixPose(from, shikoUp(leg), ease(c / 0.8)) : c < 1.08 ? shikoUp(leg) : c < 1.22 ? mixPose(shikoUp(leg), SHIKO_LOW, (c - 1.08) / 0.14) : mixPose(SHIKO_LOW, RISE, ease(clamp01((c - 1.5) / 0.65)));
    if (b > 6.0) p = mixPose(p, STAND, ease((b - 6.0) / 0.5));
    const turn = ease(clamp01(b / 0.5)) * (1 - ease(clamp01((b - 6.0) / 0.5)));
    return at(who, mark, p, { yaw: lerp(face(who), 0, turn) });
  }
  if (b < 9.5) {
    // slapping the belly, then glaring
    const u = b - 6.5, sl = u < 1.6 ? Math.max(0, Math.sin(u * 7)) : 0;
    let p = pose({ bend: 0.22, head: -0.25, a0x: 0.55, a0z: -0.4 + sl * 0.2, a0e: 1.15 - sl * 0.5, a1x: 0.55, a1z: -0.4 + sl * 0.2, a1e: 1.15 - sl * 0.5 });
    if (u > 1.6) p = mixPose(p, pose({ bend: 0.3, head: -0.4, a0z: 0.35, a1z: 0.35, a0e: 0.3, a1e: 0.3 }), ease(clamp01((u - 1.6) / 0.5)));
    return at(who, mark, p);
  }
  // squat on the toes, clap, arms out wide: the clean-hands greeting
  const u = b - 9.5;
  let p = mixPose(STAND, SQUAT, ease(clamp01(u / 0.8)));
  if (u > 1.1 && u < 1.6) p = mixPose(p, { ...SQUAT, a0x: 1.25, a1x: 1.25, a0z: -0.55, a1z: -0.55, a0e: 0.25, a1e: 0.25 }, Math.sin(((u - 1.1) / 0.5) * Math.PI));
  if (u > 1.7 && u < 3.0) p = mixPose(p, { ...SQUAT, a0x: 0.25, a1x: 0.25, a0z: 1.45, a1z: 1.45, a0e: 0.05, a1e: 0.05 }, Math.sin(((u - 1.7) / 1.3) * Math.PI));
  return at(who, mark, p);
}
/** The ritual's stamps: when each wrestler's foot comes down, from the start of the bout. */
function stamped(t0: number, t1: number, who: number) {
  const tt0 = t0 - who * 0.4 - 6.5, tt1 = t1 - who * 0.4 - 6.5;
  if (tt1 < 0) return false;
  for (let n = Math.max(0, Math.floor(tt0 / BLOCK)); n <= Math.floor(tt1 / BLOCK); n++) {
    for (let k = 0; k < 3; k++) { const s = n * BLOCK + k * SHIKO + 1.22; if (tt0 < s && tt1 >= s) return true; }
  }
  return false;
}
/** The crouch behind the white lines, while the fans sit down: one fist down, then both. */
function crouchAt(t: number, who: number): At {
  const s = who ? -1 : 1, k = ease(clamp01(t / 1.2));
  let p = mixPose(SQUAT, CROUCH1, k);
  if (t > 3.4) p = mixPose(CROUCH1, CROUCH, ease(clamp01((t - 3.4 - who * 0.25) / 0.35)));
  return at(who, lerp(s * MARK, s * CROUCH_AT, k), { ...p, up: Math.sin(t * 2.4) * 0.008 });
}

// the fight
/** How far into their belts they are (0 apart and slapping, 1 locked on), and the belly bump in the break. */
const gripped = (u: number) => u < 3.2 ? 0 : u < 3.8 ? ease((u - 3.2) / 0.6) : u < 8.6 ? 1 : u < 9.0 ? 1 - ease((u - 8.6) / 0.4) : u < 10.1 ? 0 : u < 10.6 ? ease((u - 10.1) / 0.5) : 1;
const bump = (u: number) => (u > 9.35 && u < 9.85 ? Math.sin(((u - 9.35) / 0.5) * Math.PI) : 0);
/** Each side's slapping: how far through a slap, how many so far, the knock back from the other's, his head snapping. */
const sl = [0, 1].map(() => ({ arm: 0, n: 0, recoil: 0, snap: 0 }));
let footPh = 0;
/** The tug last frame, and how fast it's moving (+ the champion driving). */
let lastTug = 0, drive = 0;
function locked(u: number, cx: number, D: number): [At, At] {
  // circling as they push: the pair turns about the middle between them
  const w = Math.sin(u * 0.75) * 0.32 + Math.sin(u * 1.9) * 0.08, tug = F.bout.tug;
  const c = at(0, cx + Math.cos(w) * D / 2, GRIP, { z: Math.sin(w) * D / 2, yaw: -Math.PI / 2 - w });
  const o = at(1, cx - Math.cos(w) * D / 2, GRIP, { z: -Math.sin(w) * D / 2, yaw: Math.PI / 2 - w });
  const hard = Math.min(1, Math.abs(drive) * 1.6), mine = drive > 0;
  const dr = mixPose(GRIP, DRIVE, hard * 0.7), bk = mixPose(GRIP, BRACE, hard * 0.8), settle = ease(clamp01((u - 0.36) / 0.5));
  c.p = steps(mixPose(CHARGE, mine ? dr : bk, settle), footPh, 0.2 * (0.3 + hard));
  o.p = steps(mixPose(CHARGE, mine ? bk : dr, settle), footPh + 1.5, 0.2 * (0.3 + hard));
  // the man at the straw teeters, his free arm flailing; a hard drive lifts the other off his feet
  const edge = clamp01((Math.abs(tug) - 0.78) / 0.15), def = tug > 0 ? o : c;
  if (edge > 0) def.p = { ...def.p, pitch: -0.12 * edge + Math.sin(u * 11) * 0.06 * edge, a1x: lerp(def.p.a1x, 2.2 + Math.sin(u * 14) * 0.6, edge), a1z: lerp(def.p.a1z, 1.0, edge), a1e: lerp(def.p.a1e, 0.2, edge) };
  if (hard > 0.7) (mine ? o : c).air = (hard - 0.7) * 0.25;
  return [c, o];
}
function standOff(u: number, cx: number, D: number): [At, At] {
  const b = bump(u), gap = lerp(D - 0.05, D + 0.45 * SIZE, ease(clamp01((u - 0.36) / 0.35))) - b * 0.55 * SIZE;
  const mine = drive > 0, tug = F.bout.tug, hard = Math.min(1, Math.abs(drive) * 1.6);
  const pair = [at(0, cx + gap / 2 + sl[0].recoil), at(1, cx - gap / 2 - sl[1].recoil)] as [At, At];
  pair.forEach((s, i) => {
    const ours = (i === 0) === mine, ext = Math.max(0, Math.sin(sl[i].arm * Math.PI));
    s.p = b > 0 ? { ...STANDOFF, bend: -0.2 * b, a0x: -0.4, a1x: -0.4, a0z: 0.6, a1z: 0.6, sq: 1 + 0.08 * b } : slap(sl[i].n % 2, ext, STANDOFF);
    s.p.head += sl[i].snap * -0.6;
    s.air = b * 0.18 + Math.abs(Math.sin(u * (ours ? 9 : 6))) * 0.02;
    // the one being driven covers up
    if (!ours && hard > 0.3 && b === 0) s.p = { ...s.p, a1x: 1.5, a1z: -0.4, a1e: 1.9, bend: 0.25 };
  });
  const edge = clamp01((Math.abs(tug) - 0.78) / 0.15), def = tug > 0 ? pair[1] : pair[0];
  if (edge > 0 && b === 0) def.p = { ...def.p, l1x: lerp(def.p.l1x, 0.9, edge), l1k: lerp(def.p.l1k, 1.2, edge), pitch: -0.15 * edge + Math.sin(u * 9) * 0.12 * edge, a0x: 2.4 + Math.sin(u * 18) * 0.8, a0z: 1.2, a1x: 2.4 + Math.cos(u * 18) * 0.8, a1z: 1.2 };
  return pair;
}
function fightAt(u: number): [At, At] {
  const D = contact(), cx = -F.bout.tug * PUSH;
  if (u < 0.36) {
    // the charge, out of the crouch and into each other
    const k = ease(u / 0.36), p = mixPose(CROUCH, CHARGE, Math.min(1, k * 1.6));
    return [at(0, lerp(CROUCH_AT, cx + D / 2, k), p), at(1, lerp(-CROUCH_AT, cx - D / 2, k), p)];
  }
  const g = gripped(u), A = standOff(u, cx, D), B = locked(u, cx, D);
  return [0, 1].map(i => ({
    x: lerp(A[i].x, B[i].x, g), z: lerp(A[i].z, B[i].z, g), yaw: lerp(A[i].yaw, B[i].yaw, g),
    p: mixPose(A[i].p, B[i].p, g), air: lerp(A[i].air, B[i].air, g),
  })) as [At, At];
}

// the result
/** The finish runs slowed to about a third as he's tipped over the straw, and catches up after he lands. */
const slow = (v: number) => v < 1 ? v : v < 1.9 ? 1 + (v - 1) * 0.39 : 1.351 + (v - 1.9) * ((BOUT.pay - 1.351) / (BOUT.pay - 1.9));
const unslow = (a: number) => a < 1 ? a : a < 1.351 ? 1 + (a - 1) / 0.39 : 1.9 + (a - 1.351) * ((BOUT.pay - 1.9) / (BOUT.pay - 1.351));
/** Seconds into the result that the loser lands off the mound, on his back (fight.ts's LANDS). */
export const landsAt = unslow(1.78);
/** Where the fight left them. */
let end: [At, At] | null = null;
/** The finisher the fight ends with (finishers.ts), if not a push-out. */
const finisher = () => moveOf(F.rush, F.bout.finish);
/** How high the loser goes: a push-out's 0.14, a finisher's own; a perfect slam (fight.ts's SLAM) half as high again. */
const liftOf = (mv: Move | null) => (mv ? mv.lift : 0.14) * (F.rush?.slam === 2 && F.bout.win ? 1.5 : 1);
function walkTo(s: At, from: number, to: number, k: number, who: number) {
  s.x = lerp(from, to, ease(k)); s.p = k > 0 && k < 1 ? walk(k * 18) : STAND; s.yaw = to > from ? Math.PI / 2 : -Math.PI / 2;
  if (crab(who) && k > 0 && k < 1) { s.p = sideways(k * 22); s.yaw = 0; }
}
/** After the fall: back to their marks, the bow, the winner squatting for his prize (three chops of the hand), and
 *  back to the corners. */
function afterBout(v: number, W: At, L: At, w: number, l: number, wFrom: number, lFrom: number) {
  const wm = (w ? -1 : 1) * MARK, lm = (l ? -1 : 1) * MARK, wc = (w ? -1 : 1) * CORNER, lc = (l ? -1 : 1) * CORNER;
  if (v < 3.2) {
    if (v > 1.7) walkTo(W, wFrom, wm, (v - 1.7) / 1.2, w);
    if (v > 2.0) walkTo(L, lFrom, lm, (v - 2.0) / 1.2, l);
    if (v > 2.9) { W.yaw = face(w); L.yaw = face(l); }
  } else if (v < 4.1) {
    W.x = wm; L.x = lm; W.yaw = face(w); L.yaw = face(l);
    const b = Math.sin(((v - 3.2) / 0.9) * Math.PI); W.p = mixPose(STAND, BOW, b); L.p = mixPose(STAND, BOW, b);
  } else {
    W.x = wm; W.yaw = face(w);
    const u = v - 4.1, n = Math.min(2, Math.max(0, Math.floor((u - 0.6) / 0.4))), chop = Math.max(0, Math.sin(((u - 0.6 - n * 0.4) / 0.35) * Math.PI));
    W.p = u < 1.9 ? { ...mixPose(STAND, SQUAT, ease(clamp01(u / 0.5))), ...(u > 0.6 && u < 1.8 ? { a0x: 1.25 + chop * 0.2, a0z: [0.45, 0, -0.45][n], a0e: 0.1 } : {}) } : mixPose(SQUAT, STAND, ease(clamp01((u - 1.9) / 0.4)));
    if (u > 2.3) walkTo(W, wm, wc, clamp01((u - 2.3) / 0.6), w);
    walkTo(L, lm, lc, clamp01(u / 1.4), l);
  }
}
/** The finish: the push to the straw, the lift by the belt, the heave and the fall off the mound, or a finisher
 *  (finishers.ts): carried out, sent flying by a belly blow, shaken off his feet by a stamp, or a reversal at the
 *  straw. Each lands him at the same moment (fight.ts's LANDS). */
function resultAt(a: number): [At, At] {
  const won = F.bout.win, dir = won ? -1 : 1, D = contact(), mv = finisher(), lift = liftOf(mv), shape = mv?.shape ?? 'throw';
  if (shape === 'reversal') return reversalAt(a, mv!, lift);
  const [c0, o0] = end ?? fightAt(BOUT.fight);
  const W0 = won ? c0 : o0, L0 = won ? o0 : c0, w = won ? 0 : 1, l = 1 - w;
  const zk = 1 - ease(clamp01(a / 0.5));
  const W = at(w, W0.x, DRIVE, { z: W0.z * zk }), L = at(l, L0.x, BRACE, { z: L0.z * zk });
  const straw = dir * (RING_R + 0.05), wBase = straw - dir * D * 0.95, land = dir * (RING_HALF + 1.05);
  /** Where he is when the fall starts, and how high. */
  const over = straw + dir * 0.38, air0 = shape === 'carry' ? lift : 0;
  if (a < 1.35 && (shape === 'bump' || shape === 'quake')) {
    // a belly blow, or a stamp, from where they are: then he flies, or staggers, out to the straw
    const hitAt = shape === 'bump' ? 0.6 : 0.7, k = clamp01((a - hitAt) / (1.35 - hitAt));
    L.x = lerp(L0.x, over, shape === 'bump' ? ease(k) : k * k);
    if (shape === 'bump') {
      const back = Math.sin(Math.PI * clamp01(a / hitAt));
      W.x = a < hitAt ? L0.x - dir * D - dir * 0.45 * back : lerp(L0.x - dir * D, wBase + dir * 0.38, ease(k));
      W.p = a < hitAt ? mixPose(STANDOFF, CHARGE, clamp01(a / hitAt)) : SHOVE;
      L.air = lift * Math.sin(Math.PI * k);
      L.p = a < hitAt ? STANDOFF : { ...TIPPED, pitch: -0.4 - 0.3 * k, a0x: 2.3, a0z: 1.1, a1x: 2.3, a1z: 1.1 };
    } else {
      const leg = 0, up = clamp01(a / 0.55);
      W.x = lerp(L0.x - dir * D * 1.2, wBase + dir * 0.38, ease(k));
      W.p = a < 0.55 ? mixPose(STAND, shikoUp(leg), ease(up)) : a < 0.7 ? mixPose(shikoUp(leg), SHIKO_LOW, (a - 0.55) / 0.15) : mixPose(SHIKO_LOW, STAND, ease(k));
      L.air = a < 0.7 ? 0 : lift * Math.abs(Math.sin(k * Math.PI * 3)) * (1 - k);
      L.p = a < 0.7 ? STANDOFF : { ...TIPPED, pitch: -0.15 - 0.4 * k + Math.sin(a * 20) * 0.12, a0x: 2.2 + Math.sin(a * 17) * 0.6, a0z: 1.1, a1x: 2.2 + Math.cos(a * 17) * 0.6, a1z: 1.1 };
    }
  } else if (a < 0.7) {
    // heels on the straw: he gives ground an inch at a time (or, carried, off his feet already)
    L.x = lerp(L0.x, straw, ease(a / 0.7)); W.x = L.x - dir * D;
    if (shape === 'carry') { W.p = mixPose(DRIVE, LIFT, ease(clamp01(a / 0.3))); L.air = lift * ease(clamp01(a / 0.3)); L.p = { ...TIPPED, pitch: -0.1, l0x: 0.2, l1x: 0.1, l0k: 0.2, l1k: 0.2 }; }
    else { W.p = steps(DRIVE, a * 16, 0.12); L.p = { ...BRACE, pitch: -0.1 - 0.05 * Math.sin(a * 13), bend: 0.45 }; }
  } else if (a < 1.0) {
    // the lift by the belt: his heels leave the straw
    const k = ease((a - 0.7) / 0.3);
    L.x = straw + dir * 0.08 * k; W.x = L.x - dir * D * (1 - 0.05 * k);
    W.p = shape === 'carry' ? LIFT : mixPose(DRIVE, LIFT, k); L.air = shape === 'carry' ? lift : lift * k;
    L.p = mixPose({ ...BRACE, pitch: -0.1, bend: 0.45 }, TIPPED, k);
  } else if (a < 1.35) {
    // the heave: tipped back over the straw
    const k = (a - 1.0) / 0.35;
    L.x = straw + dir * (0.08 + 0.3 * k * k); W.x = wBase + dir * (0.08 + 0.3 * ease(k));
    W.p = mixPose(LIFT, SHOVE, ease(k)); L.air = shape === 'carry' ? lift : lift * (1 - k * k);
    L.p = { ...TIPPED, pitch: lerp(-0.28, -0.7, k), bend: 0.2 * (1 - k), l0x: 0.35 + 0.4 * k, a0x: 2.0 + Math.sin(a * 18) * 0.5, a0z: 1.1, a1x: 2.2 + Math.cos(a * 18) * 0.5, a1z: 1.1 };
  } else if (a < 1.78) {
    // the fall: faster and faster, off the mound and down
    const k = (a - 1.35) / 0.43, g = k * k;
    L.x = lerp(over, land, g); L.air = air0 * (1 - g);
    L.p = mixPose({ ...TIPPED, pitch: -0.7, bend: 0, l0x: 0.75, a0x: 2.4, a0z: 1.2, a1x: 2.4, a1z: 1.2 }, LIE, g);
    W.x = wBase + dir * (0.38 + 0.12 * ease(k)); W.p = mixPose(SHOVE, teeter(a), ease(clamp01(k * 2)));
  } else {
    // down with a bounce, on his back; the winner catches himself, steps back and raises a fist; then up
    const b = a - 1.78, wx = wBase + dir * 0.5;
    L.x = land; L.air = b < 0.22 ? 0.07 * Math.sin((b / 0.22) * Math.PI) : 0;
    L.p = b < 0.14 ? { ...LIE, sq: 1 - 0.16 * Math.sin((b / 0.14) * Math.PI) } : a < 2.6 ? LIE : a < 3.0 ? mixPose(LIE, SIT, ease((a - 2.6) / 0.4)) : mixPose(SIT, STAND, ease(clamp01((a - 3.0) / 0.4)));
    W.x = a < 2.3 ? wx : lerp(wx, wBase, ease(clamp01((a - 2.3) / 0.4)));
    W.p = a < 2.15 ? mixPose(teeter(a), STAND, ease((a - 1.78) / 0.37)) : a < 2.3 ? STAND : a < 2.7 ? walk(a * 14, 0.3) : a < 3.5 ? mixPose(STAND, FIST, ease(clamp01((a - 2.7) / 0.25))) : STAND;
    if (a > 3.5) afterBout(1.7 + (a - 3.5) * (5.3 / (BOUT.pay - 3.5)), W, L, w, l, wBase, land);
  }
  // (swung round a full turn in the air)
  if (mv?.spin && a > 0.7 && a < 1.78) L.yaw += Math.PI * 2 * ease((a - 0.7) / 1.08);
  return won ? [W, L] : [L, W];
}
/** The reversal (utchari): the one about to go out, his heels on his own straw, lifts the other by the belt, twists,
 *  and swings him round and out over the straw behind him. */
function reversalAt(a: number, mv: Move, lift: number): [At, At] {
  const won = F.bout.win, s = won ? 1 : -1, D = contact();
  const [c0, o0] = end ?? fightAt(BOUT.fight);
  const W0 = won ? c0 : o0, L0 = won ? o0 : c0, w = won ? 0 : 1, l = 1 - w;
  const zk = 1 - ease(clamp01(a / 0.5));
  const W = at(w, W0.x, BRACE, { z: W0.z * zk }), L = at(l, L0.x, DRIVE, { z: L0.z * zk });
  const rope = s * (RING_R - 0.1), land = s * (RING_HALF + 1.05);
  const face2 = (A: At, B: At) => Math.atan2(B.x - A.x, B.z - A.z);
  if (a < 0.7) {
    // driven back to his own straw, heels on it
    W.x = lerp(W0.x, rope, ease(a / 0.7)); L.x = W.x - s * D;
    W.p = { ...BRACE, pitch: -0.15 - 0.05 * Math.sin(a * 13), bend: 0.4 }; L.p = steps(DRIVE, a * 16, 0.12);
  } else if (a < 1.0) {
    // he plants and lifts the other by the belt
    const k = ease((a - 0.7) / 0.3);
    W.x = rope; L.x = W.x - s * D;
    W.p = mixPose({ ...BRACE, pitch: -0.15, bend: 0.4 }, LIFT, k); L.air = lift * k;
    L.p = mixPose(DRIVE, TIPPED, k);
  } else if (a < 1.35) {
    // the twist: swung round him and out over the straw
    const k = (a - 1.0) / 0.35, th = Math.PI * ease(k);
    W.x = rope; W.z = 0; L.x = W.x - s * D * Math.cos(th); L.z = D * Math.sin(th) * 0.9;
    L.air = lift + 0.12 * Math.sin(th);
    W.p = mixPose(LIFT, SHOVE, ease(k)); L.p = { ...TIPPED, pitch: lerp(-0.28, -0.6, k), a0x: 2.2, a0z: 1.1, a1x: 2.2, a1z: 1.1 };
    W.yaw = face2(W, L); L.yaw = face2(L, W);
  } else if (a < 1.78) {
    // and down, off the mound behind him
    const k = (a - 1.35) / 0.43, g = k * k;
    W.x = rope; L.x = lerp(rope + s * D, land, g); L.air = lift * (1 - g);
    L.p = mixPose({ ...TIPPED, pitch: -0.7, bend: 0, l0x: 0.75, a0x: 2.4, a0z: 1.2, a1x: 2.4, a1z: 1.2 }, LIE, g);
    W.p = mixPose(SHOVE, teeter(a), ease(clamp01(k * 2)));
    W.yaw = face(w) + Math.PI; L.yaw = face(l) + Math.PI;
  } else {
    // he's down; the winner steps in off the straw and raises a fist; then up
    const b = a - 1.78, wx = rope - s * 0.5;
    L.x = land; L.air = b < 0.22 ? 0.07 * Math.sin((b / 0.22) * Math.PI) : 0; L.yaw = face(l) + Math.PI;
    L.p = b < 0.14 ? { ...LIE, sq: 1 - 0.16 * Math.sin((b / 0.14) * Math.PI) } : a < 2.6 ? LIE : a < 3.0 ? mixPose(LIE, SIT, ease((a - 2.6) / 0.4)) : mixPose(SIT, STAND, ease(clamp01((a - 3.0) / 0.4)));
    W.x = a < 2.3 ? rope : lerp(rope, wx, ease(clamp01((a - 2.3) / 0.4)));
    W.yaw = a < 2.3 ? face(w) + Math.PI * (1 - ease(clamp01((a - 1.78) / 0.5))) : face(w);
    W.p = a < 2.15 ? mixPose(teeter(a), STAND, ease((a - 1.78) / 0.37)) : a < 2.3 ? STAND : a < 2.7 ? walk(a * 14, 0.3) : a < 3.5 ? mixPose(STAND, FIST, ease(clamp01((a - 2.7) / 0.25))) : STAND;
    if (a > 3.5) afterBout(1.7 + (a - 3.5) * (5.3 / (BOUT.pay - 3.5)), W, L, w, l, wx, land);
  }
  if (mv.spin && a > 0.7 && a < 1.78) L.yaw += Math.PI * 2 * ease((a - 0.7) / 1.08);
  return won ? [W, L] : [L, W];
}

// ---------- the referee (gyoji) ----------
// In a purple robe with gold on it and a black lacquer cap, his war fan (gunbai) in his right hand.
const gyoji = quietly(() => {
  const root = new Group(), body = new Group(); root.add(body);
  const b = new Build();
  b.add(K.post, 0x6E3FA0, 0, 0.4, 0, null, [0.3, 0.8, 0.3]);
  b.add(K.post, shade(0x6E3FA0, 0.8), 0, 0.03, 0, null, [0.36, 0.06, 0.36]);
  b.add(K.post, 0xD9A63A, 0, 0.64, 0, null, [0.31, 0.06, 0.31]);
  for (let i = 0; i < 5; i++) b.add(K.dot, 0xD9A63A, Math.cos(i * 1.3) * 0.2, 0.25 + (i % 3) * 0.12, 0.27, null, [0.04, 0.04, 0.02]);
  b.add(K.ball, 0xF0C6A0, 0, 1.02, 0, null, [0.17, 0.17, 0.17]);
  for (const s of [-1, 1]) b.add(K.dot, 0x1B2733, s * 0.06, 1.03, 0.15, null, [0.022, 0.026, 0.02]);
  b.add(K.post, 0x111014, 0, 1.13, 0, null, [0.18, 0.04, 0.18]);
  b.add(K.post, 0x111014, 0, 1.25, -0.02, [-0.25, 0, 0], [0.09, 0.22, 0.14]);
  body.add(b.mesh(true));
  const arms = [1, -1].map(s => {
    const a = new Group(); a.position.set(s * 0.26, 0.82, 0); body.add(a);
    const ab = new Build();
    ab.add(K.post, 0x6E3FA0, 0, -0.15, 0, null, [0.11, 0.36, 0.11]);
    ab.add(K.ball, 0xF0C6A0, 0, -0.36, 0, null, [0.06, 0.06, 0.06]);
    if (s < 0) {
      ab.add(K.post, 0x3A2A20, 0, -0.48, 0.04, null, [0.02, 0.24, 0.02]);
      ab.add(K.post, 0xD9A63A, 0, -0.74, 0.04, [Math.PI / 2, 0, 0], [0.17, 0.025, 0.2]);
      ab.add(K.post, 0x111014, 0, -0.74, 0.055, [Math.PI / 2, 0, 0], [0.1, 0.02, 0.12]);
    }
    a.add(ab.mesh(true));
    return a;
  });
  root.visible = false;
  scene.add(root);
  return { root, body, arms, x: 0 };
});

// ---------- what you see on the watch spot: the hits ----------
/** The camera's beats, for the watch spot (gong.ts): a shake, a punch in on `at`, and a white flash. */
export const ringCam = { shake: 0, punch: 0, flash: 0, at: { x: RING.x, z: RING.z } };
const hit = (shake: number, flash = 0, punch = 0) => {
  ringCam.shake = Math.max(ringCam.shake, shake); ringCam.flash = Math.max(ringCam.flash, flash); ringCam.punch = Math.max(ringCam.punch, punch);
};
/** Words over a hit (PAF!, BOMP!), and the ring of lines round it; on High only, as the game's other effects. */
const words = quietly(() => Array.from({ length: 6 }, () => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const tex = new CanvasTexture(c), s = new Sprite(new SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.visible = false; s.renderOrder = 6; scene.add(s);
  return { s, c, tex, t: 0, life: 0, size: 1, bubble: false };
}));
let wordAt = 0;
function word(text: string, p: Vector3, o: { fill?: string; size?: number; bubble?: boolean; life?: number } = {}) {
  if (!o.bubble && !isHigh()) return;
  const w = words[wordAt++ % words.length], c = w.c.getContext('2d')!, W = w.c.width, H = w.c.height;
  c.clearRect(0, 0, W, H);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (o.bubble) {
    // the referee's call, in a speech bubble like the crowd's (swarm.ts)
    c.font = `800 38px ${FONT}`;
    const bw = Math.min(W - 8, c.measureText(text).width + 40), x = (W - bw) / 2;
    c.fillStyle = '#fff'; rr(c, x, 8, bw, 84, 30); c.fill();
    c.beginPath(); c.moveTo(W / 2 - 12, 90); c.lineTo(W / 2, 116); c.lineTo(W / 2 + 12, 90); c.fill();
    c.fillStyle = '#173042'; c.fillText(text, W / 2, 52, W - 30);
  } else {
    c.font = `800 ${text.length > 4 ? 60 : 72}px ${FONT}`; c.lineJoin = 'round'; c.lineWidth = 12;
    c.strokeStyle = '#1B1210'; c.strokeText(text, W / 2, H / 2 + 6, W - 16); c.fillStyle = o.fill ?? '#FFF0A0'; c.fillText(text, W / 2, H / 2 + 6, W - 16);
  }
  w.tex.needsUpdate = true;
  w.s.position.copy(p); w.s.visible = true; w.t = 0; w.life = o.life ?? 0.7; w.size = o.size ?? 1; w.bubble = !!o.bubble;
}
const bursts = quietly(() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!;
  x.strokeStyle = '#FFF6D0'; x.lineWidth = 9; x.beginPath(); x.arc(64, 64, 50, 0, Math.PI * 2); x.stroke();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; x.beginPath(); x.moveTo(64 + Math.cos(a) * 30, 64 + Math.sin(a) * 30); x.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62); x.stroke(); }
  const tex = new CanvasTexture(c);
  return Array.from({ length: 4 }, () => {
    const s = new Sprite(new SpriteMaterial({ map: tex, depthTest: false, transparent: true, opacity: 0.9 }));
    s.visible = false; s.renderOrder = 6; scene.add(s);
    return { s, t: 0, size: 1 };
  });
});
let burstAt = 0;
function burst(p: Vector3, size = 1) {
  if (!isHigh()) return;
  const b = bursts[burstAt++ % bursts.length];
  b.s.position.copy(p); b.s.visible = true; b.t = 0; b.size = size;
}
function updHits(dt: number) {
  for (const w of words) {
    if (!w.s.visible) continue;
    w.t += dt;
    if (w.t >= w.life) { w.s.visible = false; continue; }
    const k = w.t / w.life, grow = w.bubble ? Math.min(1, w.t * 8) : Math.min(1.25, 0.4 + w.t * 9);
    if (!w.bubble) w.s.position.y += 0.7 * dt;
    w.s.scale.set(w.size * grow * 1.9, w.size * grow * 0.95, 1);
    w.s.material.opacity = k > 0.75 ? (1 - k) * 4 : 1;
  }
  for (const b of bursts) {
    if (!b.s.visible) continue;
    b.t += dt;
    if (b.t > 0.3) { b.s.visible = false; continue; }
    const k = b.t / 0.3; b.s.scale.setScalar(b.size * (0.4 + k * 1.1)); b.s.material.opacity = 0.9 * (1 - k);
  }
  ringCam.shake = Math.max(0, ringCam.shake - dt * 1.6);
  ringCam.punch = Math.max(0, ringCam.punch - dt * 0.9);
  ringCam.flash = Math.max(0, ringCam.flash - dt * 3);
}
const v3 = new Vector3();
/** Where a wrestler's `o` is in the world. */
const where = (o: Object3D) => o.getWorldPosition(new Vector3());
const mid = () => where(champ).lerp(where(rival), 0.5);
const dust = (p: Vector3, n: number, big = 1) => dustFx(v3.set(p.x, p.y + 0.05, p.z), n, big);

// ---------- the drummers (the Underground Arena's) ----------
const drummers: Person[] = [];
function drums() {
  if (!parts.drums.visible) return;
  if (!drummers.length) {
    for (const d of DRUMS) {
      const p = belowGround(new Person(0xF4F1EA)); p.headband(0xC0392B);
      p.position.set(d.x + 0.8, CY, d.z); p.rotation.y = -Math.PI / 2;
      scene.add(p); drummers.push(p);
    }
  }
  const loud = crowd.excite > 0.5;
  drummers.forEach((d, i) => { d.arms.forEach((a, j) => { a.rotation.x = loud ? -1.4 + Math.sin(F.t * 11 + i + j * Math.PI) * 0.6 : -0.4; }); });
}

// ---------- the bout ----------
/** Who the champion's up against: the boss whose rush it is, or tonight's local. */
const bossOn = () => (F.rush ? bossOf(F.rush.boss) : null);
/** The sparring partner's in the ring for his practice fight (and so not at the teppo post). */
const sparring = () => !!F.rush && F.rush.boss < 0;
let dressedAs = '';
function dressRival() {
  const b = bossOn(), key = b ? b.name : 'local' + (F.bout.n % LOCAL_BELTS.length);
  if (key === dressedAs) return;
  dressedAs = key;
  if (b?.kind) rival.dressAs(LOOKS[b.kind], b.crowd >= 500 ? 200 : 160 + F.rush!.boss * 8);
  else if (b) { rival.dress(PARTNER_BELT); rival.setWeight(140); }
  else { rival.dress(LOCAL_BELTS[F.bout.n % LOCAL_BELTS.length]); rival.setWeight(130 + (F.bout.n * 13) % 30); }
}
/** What was happening last frame, to catch the moments as the clock passes them; and where each wrestler was shown
 *  as the phase changed (they go on from there, so a bout cut short never jumps). */
let was = { phase: '', t: 0 }, since = 0, edged = false, from: [At, At] | null = null, blend = 0.5;
/** How the slam went, as last seen (fight.ts's Rush.slam): a landed one hits as it lands. */
let slamWas = -1;
const shown: [At, At] = [at(0, CORNER), at(1, -CORNER)];
const BLEND = 0.5;
/** The referee's calls, over his head. */
const call = (text: string, life = 1.1) => word(text, v3.set(gyoji.root.position.x, CY + RING_TOP + 1.9, gyoji.root.position.z).clone(), { bubble: true, life, size: 1.05 });

function moments(ph: string, t: number) {
  const crossed = (a: number) => ph === was.phase && was.t < a && t >= a;
  const B = F.bout;
  if (ph !== was.phase) {
    if (ph === 'prep') dressRival();
    if (ph === 'sit') react('crouch');
    if (ph === 'fight') { react('charge'); edged = false; dressRival(); sl.forEach(s => { s.arm = 0; s.n = 0; s.recoil = 0; s.snap = 0; }); }
    if (ph === 'pay') react(F.rush ? (B.win ? 'upset' : 'win') : 'win');
  }
  if (ph === 'prep') {
    if (crossed(2)) react('billing');
    for (const who of [0, 1]) {
      const r = who ? rival : champ;
      if (crossed(4 + who * 0.4 + 1.0) && isHigh()) saltFx(where(r.arms[0].hand), v3.set(RING.x, CY + RING_TOP, RING.z));
      if (ph === was.phase && stamped(was.t, t, who)) {
        const foot = where(r.legs[0].foot).lerp(where(r.legs[1].foot), 0.5), quake = r.kind === 'catfish';
        dust(foot, quake ? 16 : 6, quake ? 1.5 : 0.8);
        r.kick(3); hit(quake ? 0.3 : 0.05); react('stomp');
        // the earthquake catfish: the ring shakes, and the champion with it
        if (quake) { champ.kick(2.5); word('ゴゴゴ', foot.setY(foot.y + 1.6), { size: 1.1, fill: '#C9D28A', life: 0.9 }); }
      }
    }
  }
  if (ph === 'sit' && crossed(4.85)) call('Hakkeyoi!');
  if (ph === 'fight') {
    if (crossed(0.34)) {
      const m = mid();
      dust(m, 14, 1.4); burst(m.setY(m.y + 1.0), 1.3); champ.kick(6); rival.kick(6);
      hit(0.3, 0.55, 1);
    }
    for (const a of [2.5, 5.5, 8.5, 11.5]) if (crossed(a)) call('Nokotta!', 1.0);
    if (!edged && Math.abs(B.tug) > 0.82) {
      edged = true; react('edge'); ringCam.punch = Math.max(ringCam.punch, 0.7);
      const def = B.tug > 0 ? rival : champ;
      word('!!', where(def.neck).setY(CY + 2.6), { size: 0.8, fill: '#FFFFFF' });
      // the octopus, driven to the straw, squirts a little ink
      if (def.kind === 'octopus') inkFx(where(def.bellyAt), 10);
    }
    if (Math.abs(B.tug) < 0.5) edged = false;
    if (crossed(9.6)) { const m = mid().setY(CY + 1.6); word('BOMP!', m, { size: 1.3, fill: '#FF8A5A' }); burst(m, 1.4); champ.kick(5); rival.kick(5); hit(0.12); }
    // a slam landed (gong.ts): a big hit, and the boss rocked back
    const s = F.rush?.slam ?? -1;
    if (s > 0 && slamWas <= 0) {
      const m = mid().setY(CY + 1.9);
      word('SLAM!', m, { size: s > 1 ? 1.6 : 1.2, fill: '#FFD34A', life: 1.0 }); burst(m, s > 1 ? 1.9 : 1.3);
      rival.kick(s > 1 ? 10 : 6); champ.kick(3); hit(s > 1 ? 0.5 : 0.25, s > 1 ? 0.8 : 0.3, s > 1 ? 1.2 : 0.6); react('edge');
    }
    slamWas = s;
  }
  if (ph === 'pay') {
    const L = B.win ? rival : champ, W = B.win ? champ : rival, passed = (a: number) => crossed(unslow(a));
    if (crossed(0.3)) call(B.win ? `${CHAMP}!` : `${bossOn()?.name ?? 'The local'}!`, 1.4);
    for (let a = 0.1; a < 0.7; a += 0.15) if (passed(a)) { dust(where(L.legs[0].foot), 3, 0.6); L.kick(0.8); }
    if (passed(0.85)) { L.kick(2); W.kick(1.5); }
    if (passed(1.0)) ringCam.punch = Math.max(ringCam.punch, 1.1);
    if (passed(1.78)) { dust(where(L), 24, 1.8); L.kick(9); W.kick(2); hit(0.55, 0.3, 1.2); if (L.kind === 'octopus') inkFx(where(L.bellyAt), 34); }
    // a finisher (finishers.ts): its name over the ring, and its moment
    const mv = finisher();
    if (mv) {
      if (passed(0.85)) word(mv.name, v3.set(RING.x, CY + RING_TOP + 2.5, RING.z).clone(), { size: 1.4, fill: '#FFD34A', life: 1.6 });
      if (passed(mv.shape === 'bump' ? 0.6 : 0.7)) {
        const p = mid().setY(CY + 1.7);
        react('edge');
        if (mv.shape === 'bump') { word('BOMP!', p, { size: 1.3, fill: '#FF8A5A' }); burst(p, 1.6); L.kick(8); W.kick(3); hit(0.4, 0.4, 1); }
        else if (mv.shape === 'quake') { const f = where(W.legs[0].foot); dust(f, 18, 1.6); word('ゴゴゴ', f.setY(f.y + 1.6), { size: 1.1, fill: '#C9D28A', life: 0.9 }); L.kick(5); W.kick(3); hit(0.5, 0, 0.6); }
        else { burst(p, 1.2); hit(0.2, 0, 0.5); }
        const fx = rival.kind ? where(rival.bellyAt) : null;
        if (fx && mv.fx === 'ink') inkFx(fx, 30);
        if (fx && mv.fx === 'slime') { slimeFx(fx); slimeFx(where(champ.bellyAt)); }
        if (mv.fx === 'claw') word('SNIP!', where(rival.neck).setY(CY + 2.3), { size: 0.9 });
        if (mv.fx === 'bite') word('CHOMP!', where(rival.neck).setY(CY + 2.3), { size: 0.9, fill: '#FFFFFF' });
        if (mv.fx === 'puff') word('PUFF!', where(rival.neck).setY(CY + 2.5), { size: 1.0, fill: '#FFE07A' });
      }
    }
    // the puffer, beaten, goes down like a balloon
    if (L.kind === 'puffer' && passed(1.4)) word('PFFFT', where(L.neck).setY(CY + 2.4), { size: 1.0, fill: '#F7EFD6', life: 1.0 });
    if (crossed(unslow(3.5 + 1.5 * ((BOUT.pay - 3.5) / 5.3)))) react('bow');
  }
}
/** The slapping and the heaves, as the fight goes. */
function fightBeats(u: number, dt: number) {
  const tug = F.bout.tug;
  // how fast the push is going, and which way (smoothed): a turn of it is a heave, while they're locked on
  const before = drive;
  drive += ((tug - lastTug) / Math.max(dt, 1e-3) - drive) * Math.min(1, dt * 8);
  lastTug = tug;
  footPh += dt * (2.5 + 10 * Math.min(1, Math.abs(drive) * 1.6));
  const g = gripped(u);
  if (u > 1.2 && g > 0.6 && Math.sign(before) !== Math.sign(drive) && Math.abs(drive) > 0.01) {
    dust(mid(), 8, 1.1); champ.kick(3); rival.kick(3); hit(0.14, 0, 0.45);
  }
  if (u < 0.36 || g > 0.25 || bump(u)) { sl.forEach(s => { s.snap = Math.max(0, s.snap - dt * 7); s.recoil *= Math.exp(-dt * 4); }); return; }
  sl.forEach((s, i) => {
    const ours = (i === 0) === (drive > 0), was = s.arm;
    s.arm = (s.arm + dt * (ours ? 5.2 : 2.4)) % 1;
    if (s.arm < was) s.n++;
    if (was < 0.5 && s.arm >= 0.5) {
      const me = i ? rival : champ, them = i ? champ : rival, p = where(them.neck).lerp(where(me.neck), 0.35);
      burst(p, 0.7); them.kick(ours ? 2.5 : 1.2); sl[1 - i].snap = 1; sl[1 - i].recoil += ours ? 0.05 : 0.02;
      const say = i && rival.kind ? SLAPS[rival.kind] : ['PAF!', 'SLAP!', 'WHAP!'];
      if (ours && s.n % 3 === 0) word(say[(s.n / 3) % 3], p.setY(p.y + 0.4), { size: 0.9 });
    }
    s.snap = Math.max(0, s.snap - dt * 7); s.recoil *= Math.exp(-dt * 4);
  });
}

/** Stands a wrestler where `s` says, on the ground there (the ring's top, the pallets or the floor). */
function place(r: RikishiModel, s: At, dt: number) {
  r.position.set(RING.x + s.x, CY + ground(s.x, s.z) + s.air, RING.z + s.z);
  r.rotation.set(0, s.yaw, 0);
  r.apply(s.p, dt);
}

/** Fukure's temper: blown up for the glare, the charge, while he's winning and for his win; down when he's beaten. */
function temper(ph: string, t: number) {
  if (ph === 'prep') { const b = (t - 0.4 - 6.5) % BLOCK; return t > 6.9 && b > 6.8 && b < 9.6 ? 1 : 0; }
  if (ph === 'sit') return t > 4.2 ? 0.7 : 0;
  if (ph === 'fight') return t < 1.2 || F.bout.tug < -0.25 ? 1 : 0.3;
  return !F.bout.win ? (t < 4 ? 1 : 0) : t < unslow(1.3) ? 0.8 : 0;
}
let puffed = false;
/** Where the champion trains while the doors are shut: by the teppo post, on the open floor just west of his sparring
 *  partner (clear of the fence south of the post), facing out. */
const WARM_UP = { x: TEPPO.x - 1.95 - RING.x, z: TEPPO.z + 0.25 - RING.z };
/** The champion's stamps, over and over, while he waits for the doors to open. */
function warmUp(t: number): At {
  const c = t % SHIKO, leg = Math.floor(t / SHIKO) % 2;
  const p = c < 0.8 ? mixPose(RISE, shikoUp(leg), ease(c / 0.8)) : c < 1.08 ? shikoUp(leg)
    : c < 1.22 ? mixPose(shikoUp(leg), SHIKO_LOW, (c - 1.08) / 0.14) : mixPose(SHIKO_LOW, RISE, ease(clamp01((c - 1.5) / 0.65)));
  return { ...WARM_UP, yaw: 0, p, air: 0 };
}
function pose2(dt: number) {
  const B = F.bout, t = B.t;
  // the doors still shut (a player who's just come down, before their first soup): no fight yet, nobody in the ring,
  // and the champion training by the teppo post
  rival.visible = !F.quiet || !!F.rush;
  if (!rival.visible) {
    const w = warmUp(F.t);
    place(champ, w, dt);
    shown[0] = w;
    return;
  }
  dressRival();
  rival.agitate = B.phase === 'fight' ? 1 : 0;
  if (rival.kind === 'puffer') {
    rival.puffTo = temper(B.phase, t);
    if (rival.puffTo > 0.9 && !puffed) word('PUFF!', where(rival.neck).setY(CY + 2.5), { size: 1.0, fill: '#FFE07A' });
    puffed = rival.puffTo > 0.5;
  }
  let pair: [At, At];
  if (B.phase === 'prep') pair = [ritual(t, 0), ritual(t, 1)];
  else if (B.phase === 'sit') pair = [crouchAt(t, 0), crouchAt(t, 1)];
  else if (B.phase === 'fight') { fightBeats(t, dt); pair = fightAt(t); end = pair; }
  else pair = resultAt(slow(t));
  // a phase that started from somewhere else (a bout cut short, a rush rung mid-ritual) blends on from where they were
  if (from && since < blend) {
    const k = ease(since / blend);
    pair = pair.map((s, i) => ({ x: lerp(from![i].x, s.x, k), z: lerp(from![i].z, s.z, k), yaw: lerp(from![i].yaw, s.yaw, k), p: mixPose(from![i].p, s.p, k), air: lerp(from![i].air, s.air, k) })) as [At, At];
  }
  place(champ, pair[0], dt); place(rival, pair[1], dt);
  shown[0] = pair[0]; shown[1] = pair[1];
  ringCam.at.x = RING.x + (pair[0].x + pair[1].x) / 2; ringCam.at.z = RING.z + (pair[0].z + pair[1].z) / 2;

  // the referee follows the pair from behind, crouches with them, and points his fan at the winner
  const ph = B.phase, middle = (pair[0].x + pair[1].x) / 2;
  const want = ph === 'fight' ? middle * 0.7 : ph === 'pay' && t < 2 ? middle * 0.4 : 0;
  gyoji.x += (want - gyoji.x) * Math.min(1, dt * 3);
  gyoji.root.position.set(RING.x + gyoji.x, CY + ground(gyoji.x, -1.75), RING.z - 1.75);
  const crouching = (ph === 'sit' && t > 0.6) || (ph === 'fight' && t < 0.4) ? 1 : 0, pointing = ph === 'pay' && t > 0.25 && t < 3.5;
  gyoji.body.position.y = -0.18 * crouching; gyoji.body.rotation.x = 0.25 * crouching;
  gyoji.root.rotation.y = pointing ? (B.win ? 0.9 : -0.9) : ph === 'fight' ? Math.sin(F.t * 0.8) * 0.2 : 0;
  gyoji.arms[1].rotation.set(pointing ? -1.4 : crouching ? -1.5 : ph === 'fight' ? -1.2 + Math.sin(F.t * 4) * 0.25 : -0.9, 0, pointing ? (B.win ? -0.6 : 0.6) : 0);
  gyoji.arms[0].rotation.x = crouching ? -0.6 : -0.15;
  if (ph === 'fight') gyoji.root.position.y += Math.abs(Math.sin(F.t * 6)) * 0.03;
}

/** The sparring partner, slapping the teppo post with one hand and the other. */
const TEPPO_SLAP = pose({ bend: 0.25, l0x: 0.3, l0z: 0.35, l0k: 0.45, l1x: -0.2, l1z: 0.3, l1k: 0.15, head: -0.2 });
function spar(dt: number) {
  // (off to the ring for his practice fight)
  partner.visible = !sparring();
  partner.position.set(TEPPO.x - 0.75, CY, TEPPO.z);
  partner.rotation.y = Math.PI / 2;
  const s = Math.sin(F.t * 5);
  partner.apply({ ...TEPPO_SLAP, a0x: 1.45 - Math.max(0, s) * 0.5, a0e: 0.2 + Math.max(0, s) * 0.9, a1x: 1.45 - Math.max(0, -s) * 0.5, a1e: 0.2 + Math.max(0, -s) * 0.9 }, dt);
}

// ---------- every frame ----------
/** The 'dohyo' stage-up, or a stage 3 save: the referee in the ring, and the wrestlers. */
export function openRing() {
  gyoji.root.visible = champ.visible = rival.visible = partner.visible = true;
  gyoji.root.position.set(RING.x, CY + RING_TOP, RING.z - 1.75);
}

/** Whether the doors were shut last frame: opening, the champion walks over from the teppo post to his corner. */
let shut = false;
export function updDohyo(dt: number) {
  if (!gyoji.root.visible) return;
  const ph = F.bout.phase, t = F.bout.t, quiet = F.quiet && !F.rush;
  if (ph !== was.phase || (shut && !quiet)) {
    from = was.phase ? [{ ...shown[0] }, { ...shown[1] }] : null; since = 0;
    blend = shut && !quiet ? 1.8 : BLEND;
  } else since += dt;
  shut = quiet;
  moments(ph, t);
  pose2(dt);
  was = { phase: ph, t };
  spar(dt);
  drums();
  updHits(dt);
  // Mr. Fugu puffs up when the house roars
  boss.puffTo = crowd.excite > 1 ? 1 : 0;
  boss.update(dt);
}
/** The champion and his opponent, the sparring partner and the referee, for tests. */
export const ring = { champ, rival, partner, gyoji: gyoji.root };
