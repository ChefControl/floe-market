// The machines, the roulette table, the chopping block's bucket and cleaver, and the drive-up snowmobiles on High
// graphics (graphics.ts), built with the kit (kit.ts) the way the people are: rounded, with small details (rivets,
// lashings, a crank on the reel, headlights), painted and baked. Each one builds a `Build` around its own middle, in
// the same frame as the Low model it stands beside. Call these inside `quietly` (kit.ts), so building them never
// touches the game's luck.
import {
  BufferAttribute, BufferGeometry, CatmullRomCurve3, ConeGeometry, Euler, FrontSide, Group, type Material, Matrix4, Mesh,
  MeshLambertMaterial, type Object3D, Quaternion, TorusGeometry, TubeGeometry, Vector3,
} from 'three';
import { isHigh, onQuality } from './graphics';
import { baked, Build, dice, K, pack, quietly, rbox, shade, tube } from './kit';
import { painted, scene } from './render';

const ROPE = 0xE3C26B, SNOW = 0xFFFFFF, BRASS = 0xC9A04A;

type V3 = [x: number, y: number, z: number];
const qq = new Quaternion(), ee = new Euler(), pp = new Vector3(), ss = new Vector3();
/** Adds `geo` to `b` turned by `rot` in the given Euler order (Build.add turns in XYZ only). */
export function addTurned(b: Build, geo: BufferGeometry, c: number, pos: V3, rot: V3, order: 'XYZ' | 'YXZ', scale: V3 = [1, 1, 1]) {
  qq.setFromEuler(ee.set(rot[0], rot[1], rot[2], order));
  b.pieces.push({ geo, c, m: new Matrix4().compose(pp.set(...pos), qq, ss.set(...scale)) });
  return b;
}

const hoops = new Map<string, TorusGeometry>();
/** A thin flat ring `r` across with a tube `t` thick (K.ring thickens as it's scaled up), shared by size. */
function hoop(r: number, t: number) {
  const key = `${r},${t}`;
  let g = hoops.get(key);
  if (!g) { g = new TorusGeometry(r, t, 5, 28); hoops.set(key, g); }
  return g;
}

/** The same shape turned inside out: its faces wound the other way and its normals flipped, to see into a bucket. */
function inside(geo: BufferGeometry) {
  const g = geo.clone(), I = g.index!, N = g.attributes.normal as BufferAttribute;
  for (let i = 0; i < I.count; i += 3) { const a = I.getX(i + 1); I.setX(i + 1, I.getX(i + 2)); I.setX(i + 2, a); }
  for (let i = 0; i < N.count; i++) N.setXYZ(i, -N.getX(i), -N.getY(i), -N.getZ(i));
  return g;
}

// ---------- the auto harpoon ----------
const STEEL = 0x5B6B78, DARK = 0x3C4C58, CORAL = 0xFF6B4A, WOOD = 0x8A5A3B, TIP = 0xD9E2E8;
/** A flat ring of `n` dots (rivets, bolts) `r` out at height `y`. */
function rivets(b: Build, n: number, r: number, y: number, c: number, size = 0.016, from = 0) {
  for (let i = 0; i < n; i++) {
    const a = from + i / n * Math.PI * 2;
    b.add(K.dot, c, Math.cos(a) * r, y, Math.sin(a) * r, null, [size, size * 0.7, size]);
  }
}
/**
 * The harpoon's stand, around its foot (the Low model's group): a round platform of planks with an iron band, the
 * post on a bolted flange, and the coral swivel ring with rivets that the head turns on.
 */
export function turretBase() {
  const b = new Build();
  b.add(tube(0.5, 0.55, 0.12, 18), WOOD, 0, 0.06, 0);
  // planks across the top, and an iron band round the edge
  for (const z of [-0.3, -0.1, 0.1, 0.3]) {
    const len = 2 * Math.sqrt(0.5 * 0.5 - z * z) - 0.04;
    b.add(rbox(+len.toFixed(3), 0.006, 0.014, 0.003), shade(WOOD, 0.72), 0, 0.121, z);
  }
  b.add(hoop(0.54, 0.02), DARK, 0, 0.035, 0, [Math.PI / 2, 0, 0]);
  // the post, on a flange bolted to the planks, with a collar where the swivel sits
  b.add(tube(0.16, 0.22, 0.42, 12), DARK, 0, 0.33, 0);
  b.add(tube(0.27, 0.29, 0.04, 12), shade(DARK, 0.85), 0, 0.14, 0);
  rivets(b, 8, 0.25, 0.165, STEEL, 0.018, Math.PI / 8);
  b.add(tube(0.185, 0.185, 0.04, 12), STEEL, 0, 0.51, 0);
  b.add(tube(0.24, 0.24, 0.06, 16), CORAL, 0, 0.56, 0);
  for (const y of [0.535, 0.585]) b.add(K.ring, shade(CORAL, 0.8), 0, y, 0, [Math.PI / 2, 0, 0], [0.24, 0.24, 0.12]);
  rivets(b, 10, 0.243, 0.56, 0xF4E3D7, 0.012);
  return b;
}
/**
 * The harpoon's head, which turns to aim (its barrel along +z, about the head's pivot as on Low): the yoke with its
 * pivot bolts, the barrel with coral bands, a sight and a muzzle, the loaded harpoon, a reel of rope with a crank, and
 * rubber grips at the back.
 */
export function turretHead() {
  const b = new Build(), X = Math.PI / 2;
  // the yoke: two arms on a plate, the barrel pivoting between them on bolts
  for (const s of [-1, 1]) {
    b.add(rbox(0.05, 0.28, 0.22, 0.018), DARK, s * 0.13, -0.04, 0);
    b.add(tube(0.05, 0.05, 0.03, 10), STEEL, s * 0.165, 0.04, 0, [0, 0, X]);
    b.add(K.dot, TIP, s * 0.182, 0.04, 0, null, [0.012, 0.022, 0.022]);
  }
  b.add(rbox(0.31, 0.04, 0.24, 0.015), DARK, 0, -0.16, 0);
  // the barrel: banded in coral, a muzzle ring, a cap on the back and a sight on top
  b.add(tube(0.075, 0.085, 1.1, 14), STEEL, 0, 0.04, 0.25, [X, 0, 0]);
  for (const z of [0.78, -0.22]) {
    b.add(tube(0.095, 0.095, 0.07, 14), CORAL, 0, 0.04, z, [X, 0, 0]);
    for (const dz of [-0.035, 0.035]) b.add(K.ring, shade(CORAL, 0.78), 0, 0.04, z + dz, null, [0.095, 0.095, 0.15]);
  }
  b.add(K.ring, DARK, 0, 0.04, 0.81, null, [0.08, 0.08, 0.25]);
  b.add(tube(0.06, 0.06, 0.006, 12), 0x1E262E, 0, 0.04, 0.802, [X, 0, 0]);
  b.add(K.dome, DARK, 0, 0.04, -0.3, [-X, 0, 0], [0.085, 0.05, 0.085]);
  b.add(rbox(0.018, 0.05, 0.03, 0.006), DARK, 0, 0.135, 0.66);
  b.add(K.dot, 0xF2C14E, 0, 0.162, 0.66, null, 0.011);
  for (const s of [-1, 1]) b.add(rbox(0.016, 0.045, 0.025, 0.006), DARK, s * 0.022, 0.13, -0.12);
  // the harpoon, loaded: a wooden shaft out of the muzzle, a steel collar, the point and two barbs
  b.add(tube(0.022, 0.022, 0.42, 8), WOOD, 0, 0.04, 0.98, [X, 0, 0]);
  b.add(tube(0.03, 0.026, 0.05, 8), TIP, 0, 0.04, 1.19, [X, 0, 0]);
  b.add(new ConeGeometry(0.05, 0.18, 10), TIP, 0, 0.04, 1.27, [X, 0, 0]);
  for (const s of [-1, 1]) b.add(new ConeGeometry(0.02, 0.1, 6), TIP, s * 0.05, 0.04, 1.17, [-X, 0, s * 0.6]);
  // a reel of rope on the side: a drum between two flanges, the rope wound round it, and a crank
  for (const x of [0.17, 0.27]) b.add(tube(0.135, 0.135, 0.018, 16), DARK, x, 0.02, -0.05, [0, 0, X]);
  b.add(tube(0.1, 0.1, 0.085, 14), ROPE, 0.22, 0.02, -0.05, [0, 0, X]);
  for (let i = 0; i < 4; i++) {
    b.add(K.ring, i % 2 ? shade(ROPE, 0.9) : ROPE, 0.188 + i * 0.021, 0.02, -0.05, [0, X, 0], [0.104, 0.104, 0.16]);
  }
  b.add(tube(0.025, 0.025, 0.16, 8), STEEL, 0.23, 0.02, -0.05, [0, 0, X]);
  b.add(rbox(0.018, 0.12, 0.024, 0.008), STEEL, 0.305, -0.03, -0.05);
  b.add(tube(0.016, 0.016, 0.06, 8), 0x1E262E, 0.335, -0.08, -0.05, [0, 0, X]);
  // rubber grips on steel handles at the back
  for (const s of [-1, 1]) {
    const r: V3 = [0.5, 0, 0], up = [0, Math.cos(0.5), Math.sin(0.5)];
    b.add(tube(0.028, 0.028, 0.16, 8), 0x22292F, s * 0.09, 0.04, -0.38, r);
    for (const k of [-0.04, 0.04]) b.add(K.ring, 0x2E373F, s * 0.09, 0.04 + up[1] * k, -0.38 + up[2] * k, [0.5 - X, 0, 0], [0.028, 0.028, 0.1]);
    for (const k of [-1, 1]) b.add(K.dome, STEEL, s * 0.09, 0.04 + up[1] * k * 0.08, -0.38 + up[2] * k * 0.08, [0.5 + (k < 0 ? Math.PI : 0), 0, 0], [0.03, 0.015, 0.03]);
    b.add(rbox(0.02, 0.02, 0.1, 0.006), STEEL, s * 0.06, 0.04, -0.31, [0, -s * 0.5, 0]);
  }
  return b;
}

// ---------- the ice net ----------
const POLE = 0x7A5236, CAP = 0xE9D9C0, CORK = 0xD9A441;
/**
 * Everything round the ice net (its sheet stays as on Low): two poles with rope lashings and capped tops, the top rope
 * and its egg-shaped cork floats, a lead line along the bottom with weights, and a striped buoy tied off at each end.
 * `W` wide, the top rope at `top` and the bottom at `bottom`, sagging `sag` in the middle.
 */
export function netRig(W: number, top: number, bottom: number, sag: number) {
  const b = new Build();
  for (const s of [-1, 1]) {
    const x = s * (W / 2 + 0.05);
    b.add(tube(0.085, 0.1, 2.1, 8), POLE, x, 0.55, 0);
    b.add(tube(0.11, 0.09, 0.06, 10), CAP, x, 1.62, 0);
    b.add(K.dome, CAP, x, 1.65, 0, null, [0.11, 0.03, 0.11]);
    for (const y of [top - 0.06, top - 0.02, top + 0.02]) b.add(K.ring, ROPE, x, y, 0, [Math.PI / 2, 0, 0], [0.098, 0.098, 0.3]);
    for (const y of [bottom + 0.02, bottom + 0.06]) b.add(K.ring, ROPE, x, y, 0, [Math.PI / 2, 0, 0], [0.1, 0.1, 0.3]);
    // the buoy: red with a white band, an eye on top, tied back to the pole's foot
    const bx = s * (W / 2 + 0.45);
    b.add(K.ball, CORAL, bx, 0.06, 0.2, null, [0.16, 0.15, 0.16]);
    b.add(tube(0.163, 0.163, 0.06, 10, true), 0xFFFFFF, bx, 0.06, 0.2);
    b.add(K.ring, DARK, bx, 0.22, 0.2, null, [0.03, 0.03, 0.3]);
    const dx = x - bx, dz = -0.2, len = Math.hypot(dx, dz);
    addTurned(b, K.post, ROPE, [(x + bx) / 2, 0.1, 0.1], [Math.PI / 2, Math.atan2(dx, dz), 0], 'YXZ', [0.012, len, 0.012]);
  }
  // the top rope with its floats, and the bottom (lead) line with its weights, both following the net's shape
  const topRope = new CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => {
    const u = i / 8;
    return new Vector3((u - 0.5) * (W + 0.1), top - Math.sin(u * Math.PI) * sag, Math.sin(u * Math.PI) * 0.05);
  }));
  b.add(new TubeGeometry(topRope, 24, 0.025, 6), ROPE, 0, 0, 0);
  for (let i = 1; i < 7; i++) {
    const p = topRope.getPoint(i / 7);
    b.add(K.ball, CORK, p.x, p.y, p.z, null, [0.085, 0.068, 0.068]);
    b.add(tube(0.07, 0.07, 0.02, 8, true), shade(CORK, 0.8), p.x, p.y, p.z, [0, 0, Math.PI / 2]);
  }
  const lead = new CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => {
    const u = i / 8;
    return new Vector3((u - 0.5) * W, bottom, Math.sin(u * Math.PI) * 0.18);
  }));
  b.add(new TubeGeometry(lead, 24, 0.016, 5), shade(ROPE, 0.85), 0, 0, 0);
  for (let i = 1; i < 8; i++) {
    const p = lead.getPoint(i / 8);
    b.add(K.ball, 0x4A5560, p.x, p.y, p.z, null, [0.04, 0.03, 0.03]);
  }
  return b;
}
/** Snow on the net's pole tops, for winter. */
export function netSnow(W: number) {
  const b = new Build();
  for (const s of [-1, 1]) b.add(K.dome, SNOW, s * (W / 2 + 0.05), 1.66, 0, null, [0.12, 0.07, 0.12]);
  return b;
}

// ---------- the roulette table ----------
const FELT = 0x2E7D4F, BODY = 0x6B3E26, BOWL = 0x8A5A3B;
/**
 * The roulette table round its wheel (the spinning face stays its own textured mesh): a cabinet with panelled sides
 * on a dark plinth, a felt top with a padded rail, a row of betting squares and stacks of chips, and the wooden bowl
 * with a brass rim and the diamonds the ball bounces off.
 */
export function rouletteTable() {
  const b = new Build();
  b.add(rbox(1.32, 0.07, 1.02, 0.025), shade(BODY, 0.7), 0, 0.035, 0);
  b.add(rbox(1.4, 0.56, 1.1, 0.04), BODY, 0, 0.34, 0);
  for (const s of [-1, 1]) {
    b.add(rbox(1.2, 0.34, 0.014, 0.008), shade(BODY, 0.86), 0, 0.32, s * 0.553);
    b.add(rbox(0.014, 0.34, 0.9, 0.008), shade(BODY, 0.86), s * 0.703, 0.32, 0);
  }
  b.add(rbox(1.43, 0.035, 1.13, 0.012), BOWL, 0, 0.6, 0);
  // the felt and its padded rail
  b.add(rbox(1.55, 0.06, 1.25, 0.02), FELT, 0, 0.65, 0);
  const rail = 0x3B2416;
  for (const s of [-1, 1]) {
    b.add(rbox(1.55, 0.05, 0.08, 0.024), rail, 0, 0.7, s * 0.585);
    b.add(rbox(0.08, 0.05, 1.11, 0.024), rail, s * 0.735, 0.7, 0);
  }
  // betting squares down the player's side, and chips on the corners
  const cells = [0x2E9E49, 0xD8394B, 0x22303C, 0xD8394B, 0x22303C, 0xD8394B, 0x22303C];
  cells.forEach((c, i) => b.add(rbox(0.07, 0.006, 0.075, 0.003), c, 0.6, 0.681, -0.3 + i * 0.1));
  b.add(rbox(0.004, 0.004, 0.7, 0.002), 0xF4F1EA, 0.645, 0.682, 0);
  b.add(rbox(0.004, 0.004, 0.7, 0.002), 0xF4F1EA, 0.555, 0.682, 0);
  const chip = tube(0.035, 0.035, 0.012, 10);
  for (const [x, z, n, c] of [[0.58, 0.44, 5, 0xD8394B], [0.5, 0.47, 3, 0x355C9E], [-0.6, -0.42, 4, 0xF4F1EA]] as const) {
    for (let i = 0; i < n; i++) {
      b.add(chip, i % 2 ? c : shade(c, 0.85), x, 0.687 + i * 0.013, z);
    }
    b.add(K.ring, 0xFFFFFF, x, 0.687 + (n - 1) * 0.013 + 0.0065, z, [Math.PI / 2, 0, 0], [0.026, 0.026, 0.04]);
  }
  // the bowl, with a brass rim and eight diamonds round its slope
  b.add(tube(0.46, 0.4, 0.12, 28), BOWL, 0, 0.74, 0);
  b.add(hoop(0.405, 0.018), shade(BOWL, 0.8), 0, 0.69, 0, [Math.PI / 2, 0, 0]);
  b.add(new TorusGeometry(0.455, 0.014, 5, 32), BRASS, 0, 0.8, 0, [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + Math.PI / 8;
    b.add(K.dot, BRASS, Math.cos(a) * 0.433, 0.792, Math.sin(a) * 0.433, [0, -a, 0], [0.018, 0.008, 0.01]);
  }
  return b;
}
/** The wheel's turret in its middle, which spins with the face: a brass spindle with a cross of four handles. */
export function rouletteTurret() {
  const b = new Build();
  b.add(tube(0.03, 0.05, 0.05, 10), 0xF2C14E, 0, 0.04, 0);
  b.add(tube(0.016, 0.016, 0.08, 8), 0xF2C14E, 0, 0.09, 0);
  b.add(K.ball, 0xF2C14E, 0, 0.14, 0, null, 0.025);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    b.add(K.post, 0xE3B23C, Math.cos(a) * 0.035, 0.1, Math.sin(a) * 0.035, [0, -a, Math.PI / 2], [0.008, 0.07, 0.008]);
    b.add(K.ball, 0xF2C14E, Math.cos(a) * 0.072, 0.1, Math.sin(a) * 0.072, null, 0.014);
  }
  return b;
}

// ---------- the chopping block's bucket and cleaver ----------
const TIN = 0x7F98A8, TIN_DARK = 0x5B6B78;
/** A tin bucket for the fish heads (its foot at 0): ribbed, a rolled rim, a wire handle, and a head poking out of the water. */
export function headBucket() {
  const b = new Build(), r = (y: number) => 0.2 + 0.04 * y / 0.42, wall = tube(0.24, 0.2, 0.42, 14, true);
  b.add(wall, TIN, 0, 0.21, 0);
  b.add(inside(wall), shade(TIN, 0.78), 0, 0.21, 0, null, [0.97, 1, 0.97]);
  b.add(tube(0.2, 0.2, 0.02, 14), TIN_DARK, 0, 0.01, 0);
  for (const y of [0.1, 0.3]) b.add(hoop(+(r(y) + 0.002).toFixed(3), 0.012), shade(TIN, 0.9), 0, y, 0, [Math.PI / 2, 0, 0]);
  b.add(new TorusGeometry(0.24, 0.02, 6, 18), TIN_DARK, 0, 0.42, 0, [Math.PI / 2, 0, 0]);
  // the handle lies tipped back over one side, on two lugs
  for (const s of [-1, 1]) b.add(K.dot, TIN_DARK, s * 0.235, 0.36, 0, null, [0.02, 0.03, 0.03]);
  b.add(new TorusGeometry(0.235, 0.007, 4, 14, Math.PI), 0x9AA9B4, 0, 0.36, 0, [-1.1, 0, 0]);
  // water inside, and a fish head in it
  b.add(tube(0.22, 0.22, 0.01, 14), 0x4F7286, 0, 0.32, 0);
  b.add(K.ball, 0x355C9E, 0.04, 0.36, -0.03, [0.2, 0.5, -0.9], [0.09, 0.07, 0.065]);
  b.add(K.ball, 0xE3EAF0, 0.06, 0.34, 0.0, [0.2, 0.5, -0.9], [0.07, 0.04, 0.05]);
  b.add(K.dot, 0xFFFFFF, 0.075, 0.425, 0.03, null, 0.018);
  b.add(K.dot, 0x1B2733, 0.079, 0.428, 0.043, null, 0.009);
  return b;
}
/**
 * The cleaver, about the same middle as on Low (its edge along z, the handle out the back): a blade with a bright
 * honed edge and a hole to hang it by, a darker spine, a steel bolster and a wooden handle with brass rivets.
 */
export function cleaver() {
  const b = new Build(), X = Math.PI / 2;
  b.add(rbox(0.022, 0.24, 0.4, 0.009), 0xD9E2E8, 0, 0, 0);
  b.add(rbox(0.024, 0.035, 0.392, 0.008), 0xF4F8FA, 0, -0.1, 0);
  b.add(rbox(0.035, 0.03, 0.405, 0.01), 0x9AA9B4, 0, 0.12, 0);
  b.add(tube(0.024, 0.024, 0.026, 10), 0x3C4C58, 0, 0.07, -0.135, [0, 0, X]);
  b.add(tube(0.03, 0.03, 0.035, 8), 0x9AA9B4, 0, 0.07, 0.215, [X, 0, 0]);
  b.add(tube(0.034, 0.038, 0.24, 8), 0x5E3B24, 0, 0.07, 0.35, [X, 0, 0]);
  b.add(K.dome, 0x4A2E1C, 0, 0.07, 0.47, [X, 0, 0], [0.034, 0.02, 0.034]);
  for (const z of [0.27, 0.35, 0.43]) for (const s of [-1, 1]) b.add(K.dot, BRASS, s * 0.035, 0.07, z, null, [0.006, 0.012, 0.012]);
  return b;
}

// ---------- the drive-up snowmobiles ----------
/**
 * Sleds are made all through the game, so they're made off dice of their own: neither the game's luck nor the
 * scenery's (whose `jitter` shapes what's built later) depends on how many have driven by.
 */
const sledDice = dice(0x51ED);
export const sledQuietly = <T>(f: () => T) => quietly(f, sledDice);
const RUBBER = 0x1F262E, CHROME = 0xC9D1D8, SKI = 0x2C3A47, SEAT = 0x5B4636;
/**
 * A snowmobile's parts on High, shared by every sled (one set built for each stayed on the GPU after it drove off):
 * `paint` is the bodywork in shades of white, drawn in the sled's colour (sledPaint); `trim` the seat, bumpers,
 * lights and handlebars; `skis` for winter, `wheels` for the rest of the year; `screen` the rounded windscreen.
 */
export const sledParts = (() => {
  let parts: { paint: BufferGeometry; trim: BufferGeometry; skis: BufferGeometry; wheels: BufferGeometry; screen: BufferGeometry } | null = null;
  return () => parts ??= sledQuietly(() => {
    const paint = new Build(), trim = new Build(), skis = new Build(), wheels = new Build(), X = Math.PI / 2;
    // the bodywork: a rounded hull, the nose, a cowl sloping down to it, and a darker skirt along the bottom
    paint.add(rbox(0.9, 0.38, 1.5, 0.09), 0xFFFFFF, 0, 0.34, 0);
    paint.add(rbox(0.86, 0.24, 0.5, 0.08), 0xFFFFFF, 0, 0.28, 0.95);
    paint.add(rbox(0.8, 0.08, 0.42, 0.035), 0xEBEBEB, 0, 0.45, 0.86, [0.42, 0, 0]);
    paint.add(rbox(0.92, 0.07, 1.48, 0.03), 0xBDBDBD, 0, 0.19, 0);
    paint.add(rbox(0.88, 0.07, 0.48, 0.03), 0xBDBDBD, 0, 0.19, 0.95);
    // the seat behind the driver (its top 0.6 up, where what they've bought sits), with a grab rail round its back
    trim.add(rbox(0.82, 0.08, 0.62, 0.035), SEAT, 0, 0.56, -0.52);
    trim.add(rbox(0.84, 0.02, 0.64, 0.01), shade(SEAT, 0.75), 0, 0.525, -0.52);
    trim.add(K.post, CHROME, 0, 0.67, -0.79, [0, 0, X], [0.018, 0.78, 0.018]);
    for (const s of [-1, 1]) trim.add(K.post, CHROME, s * 0.39, 0.6, -0.79, null, [0.018, 0.14, 0.018]);
    // bumpers, headlights in chrome rings, a grille, and tail lights
    trim.add(rbox(0.9, 0.08, 0.08, 0.035), SKI, 0, 0.2, 1.22);
    trim.add(rbox(0.94, 0.08, 0.08, 0.035), SKI, 0, 0.2, -0.77);
    for (const s of [-1, 1]) {
      trim.add(K.ball, 0xFFF6D0, s * 0.28, 0.31, 1.2, null, [0.07, 0.06, 0.03]);
      trim.add(K.ring, CHROME, s * 0.28, 0.31, 1.205, null, [0.072, 0.064, 0.3]);
      trim.add(rbox(0.12, 0.06, 0.02, 0.01), 0xE0392B, s * 0.33, 0.42, -0.755);
    }
    trim.add(rbox(0.3, 0.09, 0.02, 0.01), SKI, 0, 0.29, 1.205);
    for (const y of [0.265, 0.29, 0.315]) trim.add(rbox(0.26, 0.008, 0.01, 0.003), CHROME, 0, y, 1.215);
    // the windscreen's frame, and handlebars for the driver's hands
    trim.add(rbox(0.8, 0.03, 0.06, 0.012), SKI, 0, 0.53, 0.7);
    trim.add(tube(0.025, 0.03, 0.32, 8), SKI, 0, 0.66, 0.45, [-0.35, 0, 0]);
    trim.add(K.post, SKI, 0, 0.8, 0.4, [0, 0, X], [0.018, 0.52, 0.018]);
    for (const s of [-1, 1]) trim.add(tube(0.028, 0.028, 0.1, 8), RUBBER, s * 0.24, 0.8, 0.4, [0, 0, X]);
    // skis, their tips turned up, on struts; wheels with chrome hubs and wheel nuts
    for (const s of [-1, 1]) {
      skis.add(rbox(0.1, 0.05, 1.9, 0.02), SKI, s * 0.38, 0.05, 0.05);
      skis.add(rbox(0.1, 0.05, 0.26, 0.02), SKI, s * 0.38, 0.1, 1.08, [-0.5, 0, 0]);
      for (const z of [-0.45, 0.6]) skis.add(rbox(0.04, 0.12, 0.07, 0.012), CHROME, s * 0.38, 0.13, z);
      for (const z of [-0.5, 0.85]) {
        wheels.add(tube(0.17, 0.17, 0.12, 14), RUBBER, s * 0.46, 0.17, z, [0, 0, X]);
        for (const dx of [-0.06, 0.06]) wheels.add(K.ring, 0x2A323B, s * 0.46 + dx, 0.17, z, [0, X, 0], [0.155, 0.155, 0.2]);
        wheels.add(tube(0.09, 0.09, 0.13, 10), CHROME, s * 0.46, 0.17, z, [0, 0, X]);
        wheels.add(K.dome, 0xE4E9ED, s * 0.525, 0.17, z, [0, 0, -s * X], [0.06, 0.025, 0.06]);
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * Math.PI * 2;
          wheels.add(K.dot, 0x8A96A0, s * 0.528, 0.17 + Math.cos(a) * 0.065, z + Math.sin(a) * 0.065, null, 0.012);
        }
      }
    }
    const pieces = (b: Build) => pack(b.pieces);
    return {
      paint: pieces(paint), trim: pieces(trim), skis: pieces(skis), wheels: pieces(wheels),
      screen: rbox(0.78, 0.36, 0.04, 0.02),
    };
  });
})();
const paints = new Map<number, MeshLambertMaterial>();
/** The sled's bodywork material: its colour, shaded by the white-to-grey paint baked into the shapes. */
export function sledPaint(c: number) {
  let m = paints.get(c);
  if (!m) { m = sledQuietly(() => new MeshLambertMaterial({ vertexColors: true, color: c })); paints.set(c, m); }
  return m;
}

// ---------- baking a model as it is ----------
/**
 * The meshes under `root` baked as they stand, for High: everything in one plain material (each colour of `mat`, or
 * one shared material like the statue's gold) into one mesh, each placed where it is under `root`. Meshes with more
 * than one material (a box with a picture on one face) are copied as they are. Returns a group to stand beside `root`.
 */
export function bakeByMaterial(root: Object3D) {
  const out = new Group(), groups = new Map<Material, { pieces: { geo: BufferGeometry; c: number; m: Matrix4 }[]; cast: boolean }>();
  root.updateMatrixWorld(true);
  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  root.traverse(o => {
    if (!(o instanceof Mesh)) return;
    const m = toRoot.clone().multiply(o.matrixWorld);
    if (Array.isArray(o.material)) {
      const copy = new Mesh(o.geometry, o.material);
      m.decompose(copy.position, copy.quaternion, copy.scale);
      copy.castShadow = o.castShadow; copy.receiveShadow = o.receiveShadow;
      out.add(copy);
      return;
    }
    const mat = o.material as Material;
    // plain colours share `painted`; anything else (the gold) keeps its own material
    const key = mat instanceof MeshLambertMaterial && !mat.map && mat.side === FrontSide ? painted : mat;
    const c = mat instanceof MeshLambertMaterial ? mat.color.getHex() : 0xFFFFFF;
    let g = groups.get(key);
    if (!g) groups.set(key, g = { pieces: [], cast: false });
    g.pieces.push({ geo: o.geometry, c, m });
    g.cast ||= o.castShadow;
  });
  for (const [material, { pieces, cast }] of groups) out.add(baked(pieces, cast, material));
  return out;
}

// ---------- Low and High for things that come and go ----------
/**
 * `detail` (kit.ts) for things made over and over (the drive-up sleds): rather than a listener each, which would keep
 * every sled that ever drove by, they're marked, and one listener finds the ones on the scene.
 */
export function detailMarked(low: Object3D, high: Object3D) {
  low.userData.gfx = 'low'; high.userData.gfx = 'high';
  low.visible = !isHigh(); high.visible = isHigh();
}
onQuality(() => scene.traverse(o => { if (o.userData.gfx) o.visible = (o.userData.gfx === 'high') === isHigh(); }));
