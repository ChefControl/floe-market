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
import { AdditiveBlending, CanvasTexture, type Object3D, Sprite, SpriteMaterial, Vector3 } from 'three';
import { boss, CY, DRUMS, parts, PIT_STEPS, RING, RING_HALF, RING_R, RING_TOP } from './cellar';
import { TEPPO } from './cellarPlan';
import { belowGround, Person } from './characters';
import { gyojiModel } from './gyoji';
import { bossOf, BOUT, COUNTER, epic, F, finalOn, payLen, qte, tellOf } from './fight';
import { animOf, moveOf } from './finishers';
import { aftermath, UP, type Ctx, drive as driveRig, type FinishMove, type Frame, type Fx, makeRing, type V3 } from './finishRig';
import { epicOff, epicScreen, updEpic } from './epicFx';
import { LOOKS, SLAPS } from './creatures';
import { dustFx, inkFx, saltFx, slimeFx } from './fx';
import { isHigh } from './graphics';
import { apart, dice, quietly } from './kit';
import { FONT, rr, scene } from './render';
import { crowd, react } from './ringSound';
import { CHAMP, CHAMP_BELT, LOCAL_BELTS, mixPose, type Pose, pose, RikishiModel } from './rikishi';
import { BRACE, CHARGE, CROUCH, CROUCH1, DRIVE, GRIP, RISE, SHIKO_LOW, SQUAT, STAND, STANDOFF, shikoUp, sideways, slap, steps, walk } from './poses';

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

/** Whether `who` is the crab, who goes everywhere sideways. */
const crab = (who: number) => who === 1 && rival.kind === 'crab';

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
  const D = contact(), cx = -(F.bout.tug + shove) * PUSH;
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

// the result: the finisher (finishers.ts; a push-out most nights), played on the pair by the rig (finishRig.ts), then
// the same aftermath for all: up, the fist, the bow, the prize, the corners
const rig = makeRing(RING_TOP, RING_HALF, RING_R, PIT_STEPS);
/** Where the fight left them. */
let end: [At, At] | null = null;
/** The result on: its move, what the move knows, and where the move left the winner and the loser (once it's done). */
let res: { mv: FinishMove; name: string; epic: boolean; c: Ctx; left: [At, At] | null; last: [At, At] } | null = null;
function startResult() {
  const B = F.bout, mv = moveOf(F.rush, B.finish), w: 0 | 1 = B.win ? 0 : 1, l: 0 | 1 = B.win ? 1 : 0;
  const [c0, o0] = end ?? fightAt(BOUT.fight), W0 = w ? o0 : c0, L0 = w ? c0 : o0;
  const c: Ctx = {
    t: 0, w, l, lSide: l ? -1 : 1, W0, L0, D: contact(), kind: rival.kind, slam: Math.max(0, F.rush?.slam ?? 0),
    ring: rig, W: w ? rival : champ, L: w ? champ : rival, keep: new Map(),
  };
  res = { mv: animOf(F.rush, B.finish), name: mv?.name ?? '', epic: epic(), c, left: null, last: [W0, L0] };
}
/** The result at `t`: the pair placed (their hands on the belts), and where each stands, the champion first. */
function resultAt(t: number, dt: number): [At, At] {
  if (!res) startResult();
  const R = res!, { mv, c } = R;
  let f: Frame;
  if (t < mv.done) f = mv.frame({ ...c, t });
  else {
    R.left ??= R.last;
    const [W, L] = aftermath(c, t - mv.done, payLen() - mv.done, R.left[0], R.left[1], mv.front);
    f = { W, L };
  }
  // (a result that started from somewhere else, a bout cut short, blends on from where they were)
  if (from && since < blend) {
    const k = ease(since / blend), mix = (a: At, b: At): At => ({ x: lerp(a.x, b.x, k), z: lerp(a.z, b.z, k), yaw: lerp(a.yaw, b.yaw, k), p: mixPose(a.p, b.p, k), air: lerp(a.air, b.air, k) });
    f = { ...f, W: mix(from[c.w], f.W), L: mix(from[c.l], f.L) };
  }
  if (c.kind === 'puffer' && f.puff !== undefined) rival.puffTo = rival.puff = f.puff;
  if (f.agitate !== undefined) rival.agitate = f.agitate;
  const cam = f.cam ?? {}, ease2 = Math.min(1, dt * 3);
  ringCam.y += ((cam.y ?? 0) - ringCam.y) * ease2; ringCam.wide += ((cam.wide ?? 0) - ringCam.wide) * ease2; ringCam.take = !!cam.take;
  const got = driveRig(f, c.W, c.L, ORIGIN, rig, dt);
  if (t < mv.done) R.last = got;
  return c.w ? [got[1], got[0]] : [got[0], got[1]];
}
const ORIGIN = new Vector3(RING.x, CY, RING.z);

// ---------- the referee (gyoji) ----------
// Mr. Fugu's own, in indigo with the house's crest, his robe and hakama and his tall black eboshi, his war fan
// (gunbai) in his right hand (gyoji.ts).
// (built on dice of its own; the one he replaced took 40 of the scenery's, so those are still drawn, and what's built
// after him looks the same)
const gyoji = apart(() => {
  const g = { ...gyojiModel(), x: 0 };
  g.root.visible = false;
  scene.add(g.root);
  return g;
}, dice(0x6E0D1));
quietly(() => { for (let i = 0; i < 40; i++) Math.random(); });

// ---------- what you see on the watch spot: the hits ----------
/** The camera's beats, for the watch spot (gong.ts): a shake, a punch in on `at`, and a white flash; and for an epic
 *  (a perfect slam's finisher), how far up to look, how far to pull back, and to take the camera to the ring. */
export const ringCam = { shake: 0, punch: 0, flash: 0, at: { x: RING.x, z: RING.z }, boss: { x: RING.x, z: RING.z }, y: 0, wide: 0, take: false };
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
function word(text: string, p: Vector3, o: { fill?: string; size?: number; bubble?: boolean; life?: number; always?: boolean } = {}) {
  if (!o.bubble && !o.always && !isHigh()) return;
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


// ---------- a grand win's counters (fight.ts's COUNTER) ----------
// His wind-up: his slapping arm drawn back high over his head, gold sparks flickering above it and a glow on him, the
// warning (shown on any graphics: it's what the player answers). Countered, the champion swats the arm aside and
// shoves him back a step: a hit, a burst, the camera kicked. Not countered, his slap snaps the champion's head round
// and drives him back. The final blow: a gold mark swells on his belly, white as it's time to press; and the slam
// lands as ever (moments).
const spark = (c: CanvasRenderingContext2D, W: number) => {
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const [w, col] of [[16, '#2A0F16'], [8, '#FFE27A']] as const) {
    c.strokeStyle = col; c.lineWidth = w; c.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.42, r0 = W * 0.18, r1 = W * 0.44, m = (r0 + r1) / 2;
      c.moveTo(W / 2 + Math.cos(a) * r0, W / 2 + Math.sin(a) * r0);
      c.lineTo(W / 2 + Math.cos(a) * m + Math.cos(a + 1.6) * W * 0.04, W / 2 + Math.sin(a) * m + Math.sin(a + 1.6) * W * 0.04);
      c.lineTo(W / 2 + Math.cos(a) * r1, W / 2 + Math.sin(a) * r1);
    }
    c.stroke();
  }
};
const qfx = quietly(() => {
  const tex = (draw: (c: CanvasRenderingContext2D, W: number) => void) => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d');
    if (x) draw(x, 256);
    return new CanvasTexture(c);
  };
  const sprite = (map: CanvasTexture, add = false) => {
    const m = new Sprite(new SpriteMaterial({ map, depthTest: false, transparent: true, blending: add ? AdditiveBlending : undefined }));
    m.visible = false; m.renderOrder = 7; scene.add(m);
    return m;
  };
  return {
    sparks: sprite(tex(spark)),
    glow: sprite(tex((c, W) => {
      const g = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
      g.addColorStop(0, 'rgba(255,214,90,0.75)'); g.addColorStop(1, 'rgba(255,214,90,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, W);
    }), true),
    mark: sprite(tex((c, W) => {
      c.lineWidth = 34; c.strokeStyle = '#2A0F16'; c.beginPath(); c.arc(W / 2, W / 2, W * 0.36, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 20; c.strokeStyle = '#fff'; c.stroke();
    })),
  };
});
/** How far the champion's shoved the boss (+) or been shoved (−) by the counters, easing off; and the counters as last
 *  seen, the move each is playing, and how long it's been playing. */
let shove = 0, gotWas: number[] = [], move: 'counter' | 'hit' | null = null, moveT = 0, tellWas = -1;
/** Where his head is while he winds up (gong.ts pins the warning over it on the screen). */
export const tellAt = new Vector3();
const GOLD = 0xFFD34A;
function counters(dt: number) {
  const Q = qte() ?? (F.bout.phase === 'fight' ? F.rush?.qte ?? null : null);
  shove *= Math.exp(-dt * 1.2);
  moveT += dt;
  if (moveT > 0.5) move = null;
  const { sparks, glow, mark } = qfx;
  if (!Q) { sparks.visible = glow.visible = mark.visible = false; gotWas = []; return; }
  // how each slap went
  Q.got.forEach((g, i) => {
    if (g === gotWas[i] || g < 0) return;
    // (low, at their chests: the camera has them high on the screen, under the strip)
    const p = where(champ.chestAt).lerp(where(rival.chestAt), 0.6);
    if (g > 0) {
      move = 'counter'; moveT = 0; shove = Math.min(0.3, shove + (g > 1 ? 0.24 : 0.18));
      burst(p, g > 1 ? 1.5 : 1.1); rival.kick(g > 1 ? 10 : 7); champ.kick(3); sl[1].snap = 1;
      hit(g > 1 ? 0.35 : 0.25, g > 1 ? 0.35 : 0.15, g > 1 ? 0.9 : 0.6); react('edge');
      word(g > 1 ? 'PERFECT!' : 'COUNTER!', p.setY(p.y + 0.1), { size: g > 1 ? 1.3 : 1.1, fill: '#FFD34A', life: 0.9, always: true });
    } else {
      move = 'hit'; moveT = 0; shove = Math.max(-0.25, shove - 0.16);
      burst(p, 0.9); champ.kick(8); sl[0].snap = 1; hit(0.22, 0, 0.5);
      word(rival.kind ? SLAPS[rival.kind][0] : 'SLAP!', p.setY(p.y + 0.1), { size: 1.0, fill: '#FF8A7A', life: 0.8, always: true });
    }
  });
  gotWas = [...Q.got];
  // his wind-up: the sparks over his head (flickering), a glow on him that flares as it starts and throbs after, the
  // camera nudged in on him and the crowd's "ooh"
  const i = tellOf(Q), k = i >= 0 ? 1 - (Q.at[i] - F.bout.t) / COUNTER.tell : 0;
  if (i >= 0 && i !== tellWas) { hit(0.12, 0, 0.55); react('edge'); }
  tellWas = i;
  sparks.visible = glow.visible = i >= 0;
  if (i >= 0) {
    const head = where(rival.neck);
    tellAt.copy(head);
    sparks.position.set(head.x, head.y + 0.45, head.z);
    sparks.scale.setScalar((1.3 + 0.35 * k) * (0.92 + 0.16 * Math.random()));
    sparks.material.opacity = Math.random() < 0.15 ? 0.6 : 1;
    glow.position.copy(where(rival.chestAt));
    const flare = Math.max(0, 1 - k * 5), throb = 0.5 + 0.5 * Math.sin(F.t * 26);
    glow.scale.setScalar(2.6 + 1.6 * flare + 0.4 * throb);
    glow.material.opacity = Math.min(1, 0.75 + 0.25 * throb + flare);
  }
  // the final blow's mark on his belly
  mark.visible = finalOn(Q);
  if (mark.visible) {
    const g = Math.min(1, Q.final / COUNTER.grow), now = Math.abs(Q.final - COUNTER.grow) <= COUNTER.perfectSlam;
    mark.position.copy(where(rival.bellyAt));
    mark.scale.setScalar(0.5 + 1.3 * g);
    mark.material.color.setHex(now ? 0xFFFFFF : GOLD);
  }
}
/** The counters' poses on the pair: his arm drawn back as he winds up, his slap, the champion's swat. */
function counterPose(pair: [At, At], Q: NonNullable<ReturnType<typeof qte>>) {
  const i = tellOf(Q);
  if (i >= 0) {
    // (rearing back and up, his arm drawn high over his head, the other flung out: there's no missing it)
    const k = ease(clamp01((1 - (Q.at[i] - F.bout.t) / COUNTER.tell) * 2.5)), o = pair[1].p;
    pair[1].p = { ...o, a1x: lerp(o.a1x, 2.9, k), a1z: lerp(o.a1z, 0.6, k), a1e: lerp(o.a1e, 1.2, k), a0x: lerp(o.a0x, 0.9, k), a0z: lerp(o.a0z, 1.1, k), a0e: lerp(o.a0e, 0.3, k), twist: lerp(o.twist, -0.45, k), bend: lerp(o.bend, -0.3, k), head: lerp(o.head, 0.25, k) };
    pair[1].air += 0.12 * k;
    const away = pair[1].x < pair[0].x ? -1 : 1;
    pair[1].x += away * 0.18 * k;
  }
  if (!move) return;
  const k = Math.sin(clamp01(moveT / 0.4) * Math.PI);
  if (move === 'counter') pair[0].p = slap(0, k, pair[0].p);
  else pair[1].p = slap(1, k, pair[1].p);
}

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
  // (the three last bosses at full weight, the first two a little lighter)
  if (b?.kind) rival.dressAs(LOOKS[b.kind], F.rush!.boss >= 2 ? 200 : 160 + F.rush!.boss * 8);
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
    if (ph === 'pay') { react(F.rush ? (B.win ? 'upset' : 'win') : 'win'); startResult(); }
    else { res = null; epicOff(); }
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
    // the final blow's slam landed (fight.ts's COUNTER): a big hit, and the boss rocked back
    const s = F.rush?.qte?.hit ?? -1;
    if (s > 0 && slamWas <= 0) {
      const m = mid().setY(CY + 1.9);
      word('SLAM!', m, { size: s > 1 ? 1.6 : 1.2, fill: '#FFD34A', life: 1.0, always: true }); burst(m, s > 1 ? 1.9 : 1.3);
      rival.kick(s > 1 ? 10 : 6); champ.kick(3); hit(s > 1 ? 0.5 : 0.25, s > 1 ? 0.8 : 0.3, s > 1 ? 1.2 : 0.6); react('edge');
    }
    slamWas = s;
  }
  if (ph === 'pay') {
    if (!res) startResult();
    const R = res!, mv = R.mv, L = B.win ? rival : champ, W = B.win ? champ : rival, len = payLen();
    if (crossed(0.3)) call(B.win ? `${CHAMP}!` : `${bossOn()?.name ?? 'The local'}!`, 1.4);
    // the finisher's name: over the ring, or for the epic across the screen
    if (R.name && crossed(mv.nameAt ?? 0.6)) {
      if (R.epic) epicScreen({ text: R.name, for: 1.8 });
      else word(R.name, v3.set(RING.x, CY + RING_TOP + 3.2, RING.z).clone(), { size: 1.4, fill: '#FFD34A', life: 1.6 });
    }
    // its moments, and the thud as he lands
    if (ph === was.phase && was.t < mv.done) mv.beats?.({ ...R.c, t }, FX, was.t, Math.min(t, mv.done));
    if (crossed(mv.lands)) { dust(where(L), 24, 1.8); L.kick(9); W.kick(2); hit(0.55, 0.3, 1.2); if (L.kind === 'octopus') inkFx(where(L.bellyAt), 34); }
    // the puffer, pushed out, goes down like a balloon
    if (L.kind === 'puffer' && !R.name && crossed(1.4)) word('PFFFT', where(L.neck).setY(CY + 2.4), { size: 1.0, fill: '#F7EFD6', life: 1.0 });
    // (the bow, in the aftermath)
    if (crossed(mv.done + UP + 1.5 * ((len - mv.done - UP) / 5.3))) react('bow');
  }
}
/** What a finisher's moments (finishRig.ts's Fx) do here: its points are the ring's (x, z from its middle, y up from
 *  the cellar's floor). */
const toW = (p: V3) => new Vector3(RING.x + p[0], CY + p[1], RING.z + p[2]);
const PART = { hips: (r: RikishiModel) => r.hips, belly: (r: RikishiModel) => r.bellyAt, chest: (r: RikishiModel) => r.chestAt, head: (r: RikishiModel) => r.neck, hand0: (r: RikishiModel) => r.arms[0].hand, hand1: (r: RikishiModel) => r.arms[1].hand, foot0: (r: RikishiModel) => r.legs[0].foot, foot1: (r: RikishiModel) => r.legs[1].foot };
const who = (w: 'W' | 'L') => (res ? (w === 'W' ? res.c.W : res.c.L) : champ);
const FX: Fx = {
  word: (text, p, o) => word(text, toW(p), o),
  dust: (p, n = 8, big = 1) => dust(toW(p), n, big),
  burst: (p, size) => burst(toW(p), size),
  hit,
  ink: (p, n = 24) => inkFx(toW(p), n),
  slime: p => slimeFx(toW(p)),
  react,
  kick: (w, v) => who(w).kick(v),
  at: (w, part) => { const v = where(PART[part](who(w))); return [v.x - RING.x, v.y - CY, v.z - RING.z]; },
  screen: o => epicScreen(o),
};
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
  return !F.bout.win ? (t < 4 ? 1 : 0) : t < 1.6 ? 0.8 : 0;
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
  else if (B.phase === 'fight') {
    fightBeats(t, dt); pair = fightAt(t);
    const Q = F.rush?.qte;
    if (Q) counterPose(pair, Q);
    end = pair;
  }
  else pair = resultAt(t, dt);
  // a phase that started from somewhere else (a bout cut short, a rush rung mid-ritual) blends on from where they were
  if (B.phase !== 'pay' && from && since < blend) {
    const k = ease(since / blend);
    pair = pair.map((s, i) => ({ x: lerp(from![i].x, s.x, k), z: lerp(from![i].z, s.z, k), yaw: lerp(from![i].yaw, s.yaw, k), p: mixPose(from![i].p, s.p, k), air: lerp(from![i].air, s.air, k) })) as [At, At];
  }
  if (B.phase !== 'pay') { place(champ, pair[0], dt); place(rival, pair[1], dt); ringCam.y = ringCam.wide = 0; ringCam.take = false; }
  shown[0] = pair[0]; shown[1] = pair[1];
  ringCam.at.x = RING.x + (pair[0].x + pair[1].x) / 2; ringCam.at.z = RING.z + (pair[0].z + pair[1].z) / 2;
  ringCam.boss.x = RING.x + pair[1].x; ringCam.boss.z = RING.z + pair[1].z;

  // the referee follows the pair from behind, crouches with them, and points his fan at the winner
  const ph = B.phase, middle = (pair[0].x + pair[1].x) / 2;
  const want = ph === 'fight' ? middle * 0.7 : ph === 'pay' && t < 2 ? middle * 0.4 : 0;
  gyoji.x += (want - gyoji.x) * Math.min(1, dt * 3);
  gyoji.root.position.set(RING.x + gyoji.x, CY + ground(gyoji.x, -1.75), RING.z - 1.75);
  const crouching = (ph === 'sit' && t > 0.6) || (ph === 'fight' && t < 0.4) ? 1 : 0, pointing = ph === 'pay' && t > 0.25 && t < 3.5;
  gyoji.body.position.y = -0.18 * crouching; gyoji.body.rotation.x = 0.25 * crouching;
  gyoji.hakama.scale.set(1 + 0.12 * crouching, 1 - 0.3 * crouching, 1 + 0.12 * crouching);
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
  counters(dt);
  updEpic(dt);
  // Mr. Fugu puffs up when the house roars
  boss.puffTo = crowd.excite > 1 ? 1 : 0;
  boss.update(dt);
}
/** The champion and his opponent, the sparring partner and the referee, for tests. */
export const ring = { champ, rival, partner, gyoji: gyoji.root };
