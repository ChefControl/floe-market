// The marketing campaigns' props on High graphics (graphics.ts), built with the kit (kit.ts) the way the people are:
// rounded cases and frames, knobs, grilles, bolts, hinges, cables and tripod joints, painted and baked. Each builds a
// `Build` in its ad's own space (ads.ts), around the Low parts it stands in for; the canvas faces (the screens, the
// posters, the covers) stay as they are and these frame them. Call them inside `quietly` (kit.ts).
// Also the little drawings that replace the emoji painted into the campaigns' canvases, on Low and High alike.
import {
  Euler, ExtrudeGeometry, type BufferGeometry, Matrix4, Quaternion, type Shape, TorusGeometry, TubeGeometry, Vector3,
  CatmullRomCurve3,
} from 'three';
import { drawIcon } from './icons';
import { Build, K, quietly, rbox, shade, tube } from './kit';

type V3 = [x: number, y: number, z: number];

const INK = 0x1B2430, NAVY = 0x23384A, SLATE = 0x2C3A47, CHROME = 0xC9D3DA, STEEL = 0x8A98A4, GOLD = 0xF2C14E;
const RUBBER = 0x161C24, GLASS = 0x2B4A6A, CREAM = 0xF4F1E8, SNOW = 0xFFFFFF;

// ---------- helpers ----------
/** Thin rings and half rings (a handle's arch), shared. */
const RIM = quietly(() => new TorusGeometry(1, 0.03, 4, 24));
const BAND = quietly(() => new TorusGeometry(1, 0.08, 5, 24));
const ARCH = quietly(() => new TorusGeometry(1, 0.1, 5, 12, Math.PI));
const HOUSING = quietly(() => new TorusGeometry(1, 0.1, 6, 28));

/** Adds `sub` to `b`, moved to (x, y, z) and turned by (rx, ry, rz). */
function put(b: Build, sub: Build, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
  return b.addAll(sub, new Matrix4().makeRotationFromEuler(new Euler(rx, ry, rz)).setPosition(x, y, z));
}
const UP = new Vector3(0, 1, 0);
/** A round rod `r` thick from `a` to `z`. */
function rod(b: Build, r: number, c: number, a: V3, z: V3, sides = 6) {
  const d = new Vector3(z[0] - a[0], z[1] - a[1], z[2] - a[2]), len = d.length();
  const e = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(UP, d.normalize()));
  return b.add(tube(r, r, len, sides), c, (a[0] + z[0]) / 2, (a[1] + z[1]) / 2, (a[2] + z[2]) / 2, [e.x, e.y, e.z]);
}
/** Where a point `p` of a part ends up once the part is at `at` and turned by Euler `rot`. */
const moved = (p: V3, at: V3, rot: V3): V3 => {
  const v = new Vector3(...p).applyEuler(new Euler(...rot));
  return [v.x + at[0], v.y + at[1], v.z + at[2]];
};
/** Four strips framing a `w` by `h` opening centred on (x, y), `t` wide and `d` deep, its middle `z` out. */
function frame(b: Build, c: number, x: number, y: number, z: number, w: number, h: number, t: number, d: number, r = 0.008) {
  b.add(rbox(w + t * 2, t, d, r), c, x, y + h / 2 + t / 2, z);
  b.add(rbox(w + t * 2, t, d, r), c, x, y - h / 2 - t / 2, z);
  b.add(rbox(t, h, d, r), c, x - w / 2 - t / 2, y, z);
  b.add(rbox(t, h, d, r), c, x + w / 2 + t / 2, y, z);
  return b;
}
/** A knob facing +z: a short ridged drum with a cap. */
function knob(b: Build, c: number, x: number, y: number, z: number, r: number) {
  b.add(tube(r, r * 1.08, r * 0.8, 12), c, x, y, z + r * 0.4, [Math.PI / 2, 0, 0]);
  b.add(K.dot, shade(c, 1.3), x, y + r * 0.45, z + r * 0.85, null, r * 0.18);
  return b;
}
/** A High prop as one mesh casting shadows, and its small details as another that doesn't. */
export function twoMeshes({ b, fine }: { b: Build; fine?: Build }) {
  const g = b.mesh(true);
  if (fine && !fine.empty) g.add(fine.mesh(false));
  return g;
}

// ======================= the market (stage 1) =======================

/** Tape over the posters' top corners and a tack in each bottom one; `at` is each poster's middle and tilt. */
export function posterTape(at: [x: number, y: number, rz: number][], w: number, h: number) {
  const b = new Build();
  for (const [x, y, rz] of at) {
    for (const s of [-1, 1]) {
      const [tx, ty] = moved([s * (w / 2 - 0.02), h / 2 - 0.02, 0], [x, y, 0], [0, 0, rz]);
      b.add(rbox(0.11, 0.035, 0.004, 0.002), 0xF1E7C8, tx, ty, 0.006, [0, 0, rz - s * 0.75]);
      const [kx, ky] = moved([s * (w / 2 - 0.035), -h / 2 + 0.035, 0], [x, y, 0], [0, 0, rz]);
      b.add(K.dot, 0xE0392B, kx, ky, 0.006, null, [0.016, 0.016, 0.01]);
    }
  }
  return b;
}

/** A flyer `w` by `d`, lying flat on its middle: white paper with the market's band and a fish printed on top. */
export function flyerSheet(w = 0.2, d = 0.28, t = 0.01, ink = 0x2EC4B6) {
  return new Build()
    .add(rbox(w, t, d, Math.min(0.004, t / 2)), 0xFFFFFF, 0, 0, 0)
    .add(rbox(w - 0.02, 0.003, 0.06, 0.0015), ink, 0, t / 2, -d / 2 + 0.05)
    .add(K.dot, 0x355C9E, 0, t / 2, 0.01, null, [0.05, 0.003, 0.028])
    .add(rbox(w - 0.06, 0.003, 0.012, 0.001), 0xB8C4CC, 0, t / 2, 0.08)
    .add(rbox(w - 0.09, 0.003, 0.012, 0.001), 0xB8C4CC, 0, t / 2, 0.105);
}
/** The stack of flyers in the promoter's hand. */
export function flyerStack() {
  const b = new Build();
  for (let i = 0; i < 5; i++) put(b, flyerSheet(0.2, 0.28, 0.014), (i % 2) * 0.006, -0.39 + i * 0.015, 0.05 - (i % 3) * 0.004, 0, (i % 2 - 0.5) * 0.04);
  return b;
}

/** The crate the radio stands on (0.55 by 0.4 by 0.45, its base at 0): slats, corner posts and a lid of boards. */
export function radioCrate() {
  const b = new Build(), wood = 0x9C6644, dark = shade(wood, 0.62), fine = new Build();
  b.add(rbox(0.5, 0.37, 0.4, 0.01), dark, 0, 0.19, 0);
  for (const y of [0.07, 0.2, 0.33]) {
    for (const s of [-1, 1]) {
      b.add(rbox(0.5, 0.1, 0.025, 0.008), wood, 0, y, s * 0.2125);
      b.add(rbox(0.025, 0.1, 0.4, 0.008), shade(wood, 0.94), s * 0.2625, y, 0);
      for (const e of [-1, 1]) fine.add(K.dot, 0x3A2A20, e * 0.2, y, s * 0.226, null, 0.008);
    }
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(rbox(0.05, 0.4, 0.05, 0.012), shade(wood, 0.85), sx * 0.25, 0.2, sz * 0.2);
  for (const [i, z] of [-0.15, 0, 0.15].entries()) b.add(rbox(0.55, 0.025, 0.14, 0.008), shade(wood, i % 2 ? 1.06 : 1), 0, 0.3875, z);
  return { b, fine };
}

/**
 * The retro radio (in the bouncing `set`, its base at 0): a rounded red case with a chrome trim round its front, a
 * chrome ring and bars over the speaker, knobs over the painted ones, an arched handle and a telescopic antenna.
 */
export function radioSet() {
  const b = new Build(), fine = new Build(), red = 0xC0392B, cy = 0.18, fz = 0.131;
  b.add(rbox(0.62, 0.36, 0.26, 0.06), red, 0, cy, 0);
  b.add(rbox(0.6, 0.03, 0.24, 0.012), shade(red, 0.72), 0, 0.015, 0);
  frame(fine, CHROME, 0, cy, 0.134, 0.55, 0.29, 0.025, 0.018, 0.006);
  // the speaker: a chrome ring and grille bars over the painted one
  const sx = -0.129, sr = 0.112;
  fine.add(BAND, CHROME, sx, cy, 0.134, null, [sr, sr, 0.12]);
  for (const dy of [-0.06, -0.03, 0, 0.03, 0.06]) {
    const half = Math.sqrt(sr * sr - dy * dy) - 0.006;
    fine.add(tube(0.0045, 0.0045, half * 2, 5), CHROME, sx, cy + dy, 0.136, [0, 0, Math.PI / 2]);
  }
  for (const x of [0.056, 0.179]) knob(fine, 0x5B3424, x, cy - 0.066, fz, 0.032);
  // the handle, arched over the top on two mounts
  b.add(ARCH, INK, 0, 0.36, 0, null, [0.16, 0.12, 0.2]);
  for (const s of [-1, 1]) b.add(rbox(0.05, 0.03, 0.06, 0.01), shade(INK, 1.4), s * 0.16, 0.365, 0);
  // the antenna, in three sections from a ball joint
  const at: V3 = [0.143, 0.37, 0], dir: V3 = [Math.sin(0.4), Math.cos(0.4), 0];
  const p = (t: number): V3 => [at[0] + dir[0] * t, at[1] + dir[1] * t, 0];
  fine.add(K.ball, CHROME, ...at, null, 0.022);
  for (const [t0, t1, r] of [[0, 0.2, 0.011], [0.19, 0.36, 0.008], [0.35, 0.5, 0.0055]]) rod(fine, r, 0xB8C4CC, p(t0), p(t1));
  fine.add(K.ball, 0xB8C4CC, ...p(0.5), null, 0.014);
  return { b, fine };
}

/**
 * The giant phone on its stand: a rounded base on rubber feet, a pole with a collar, a cradle the phone sits in, and
 * the phone itself, rounded, with its front camera, speaker, home bar, side buttons and a camera bump on the back.
 */
export function bigPhone() {
  const b = new Build(), fine = new Build(), body = INK, stand = NAVY;
  b.add(rbox(0.5, 0.05, 0.32, 0.02), stand, 0, 0.03, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) fine.add(K.dome, RUBBER, sx * 0.21, 0, sz * 0.12, [Math.PI, 0, 0], [0.03, 0.012, 0.03]);
  b.add(K.dome, stand, 0, 0.055, 0, null, [0.08, 0.04, 0.08]);
  b.add(tube(0.035, 0.04, 0.52, 10), stand, 0, 0.31, 0);
  b.add(tube(0.05, 0.05, 0.04, 10), shade(stand, 1.3), 0, 0.33, 0);
  // the cradle: a tray under the phone with a lip front and back
  b.add(rbox(0.42, 0.03, 0.1, 0.012), stand, 0, 0.56, 0);
  for (const s of [-1, 1]) b.add(rbox(0.36, 0.06, 0.016, 0.006), stand, 0, 0.585, s * 0.04);
  // the phone
  b.add(rbox(0.64, 1.12, 0.06, 0.05), body, 0, 1.12, 0);
  fine.add(K.dot, SLATE, -0.1, 1.65, 0.031, null, [0.014, 0.014, 0.004]);
  fine.add(rbox(0.12, 0.012, 0.004, 0.002), SLATE, 0, 1.65, 0.031);
  fine.add(rbox(0.16, 0.014, 0.004, 0.002), 0x56636F, 0, 0.59, 0.031);
  for (const [x, y, h] of [[0.322, 1.4, 0.12], [-0.322, 1.43, 0.08], [-0.322, 1.32, 0.08]]) fine.add(rbox(0.012, h, 0.026, 0.005), SLATE, x, y, 0);
  fine.add(rbox(0.17, 0.17, 0.02, 0.03), SLATE, -0.17, 1.5, -0.035);
  for (const [x, y] of [[-0.21, 1.54], [-0.21, 1.46], [-0.13, 1.54]]) fine.add(tube(0.025, 0.025, 0.012, 12), RUBBER, x, y, -0.047, [Math.PI / 2, 0, 0]);
  return { b, fine };
}
/** Snow along the phone's top, for winter. */
export const phoneSnow = () => new Build().add(rbox(0.58, 0.03, 0.06, 0.012), SNOW, 0, 1.69, 0);

/**
 * The billboard: its cream backing with a raised, bolted frame round the art, rails across its back, posts on concrete
 * footings braced with a cross of timbers, and lamps on arms over the top.
 */
export function billboardFrame() {
  const b = new Build(), fine = new Build(), wood = 0x6B4A35, cy = 2.05;
  b.add(rbox(2.85, 1.5, 0.06, 0.02), CREAM, 0, cy, 0);
  frame(b, shade(CREAM, 0.9), 0, cy, 0.05, 2.68, 1.34, 0.08, 0.04, 0.012);
  for (const x of [-1.38, 0, 1.38]) for (const y of [cy - 0.715, cy + 0.715]) fine.add(K.dot, STEEL, x, y, 0.072, null, [0.018, 0.018, 0.008]);
  for (const y of [cy - 0.4, cy, cy + 0.4]) for (const x of [-1.38, 1.38]) fine.add(K.dot, STEEL, x, y, 0.072, null, [0.018, 0.018, 0.008]);
  for (const y of [1.55, 2.55]) b.add(rbox(2.8, 0.08, 0.05, 0.015), shade(wood, 0.8), 0, y, -0.055);
  for (const s of [-1, 1]) {
    b.add(tube(0.055, 0.065, 2.6, 8), wood, s * 1.15, 1.3, -0.1);
    b.add(rbox(0.24, 0.12, 0.24, 0.03), 0x9AA5AE, s * 1.15, 0.06, -0.1);
    fine.add(rbox(0.16, 0.06, 0.16, 0.012), STEEL, s * 1.15, 0.15, -0.1);
    // a lamp on an arm over the top, its hood where the plain one was
    b.add(tube(0.018, 0.018, 0.12, 6), INK, s * 0.7, 2.86, -0.02);
    rod(b, 0.016, INK, [s * 0.7, 2.92, -0.02], [s * 0.7, 2.9, 0.19]);
    b.add(rbox(0.22, 0.07, 0.14, 0.025), NAVY, s * 0.7, 2.85, 0.22, [0.5, 0, 0]);
    fine.add(rbox(0.17, 0.01, 0.09, 0.004), 0xFFF4D0, ...moved([0, -0.036, 0], [s * 0.7, 2.85, 0.22], [0.5, 0, 0]), [0.5, 0, 0]);
  }
  // a cross of timbers between the posts
  rod(b, 0.03, shade(wood, 0.9), [-1.12, 0.25, -0.13], [1.12, 1.2, -0.13]);
  rod(b, 0.03, shade(wood, 0.9), [1.12, 0.25, -0.16], [-1.12, 1.2, -0.16]);
  b.add(rbox(2.3, 0.06, 0.05, 0.015), shade(wood, 0.9), 0, 1.24, -0.12);
  return { b, fine };
}
/** Snow along the billboard's top and on its lamps, for winter. */
export function billboardSnow() {
  const b = new Build().add(rbox(2.85, 0.05, 0.09, 0.02), SNOW, 0, 2.825, 0);
  for (const s of [-1, 1]) b.add(rbox(0.2, 0.03, 0.12, 0.012), SNOW, s * 0.7, 2.9, 0.2, [0.5, 0, 0]);
  return b;
}

/**
 * The newspaper box: a rounded blue body with a dark frame round its window, a hinge along the window's top and a pull
 * handle under it, the return slot, the coin box on top with its slot and price plate, on legs with foot pads.
 */
export function newsBox() {
  const b = new Build(), fine = new Build(), blue = 0x2F6FD0, rim = shade(blue, 0.62);
  b.add(rbox(0.56, 0.84, 0.46, 0.04), blue, 0, 0.58, 0);
  b.add(rbox(0.58, 0.04, 0.48, 0.015), rim, 0, 0.18, 0);
  frame(b, rim, 0, 0.66, 0.24, 0.41, 0.49, 0.035, 0.022, 0.008);
  fine.add(tube(0.012, 0.012, 0.44, 8), CHROME, 0, 0.945, 0.245, [0, 0, Math.PI / 2]);
  fine.add(tube(0.012, 0.012, 0.16, 8), CHROME, 0, 0.36, 0.268, [0, 0, Math.PI / 2]);
  for (const s of [-1, 1]) fine.add(rbox(0.02, 0.02, 0.04, 0.006), CHROME, s * 0.07, 0.36, 0.25);
  b.add(rbox(0.3, 0.05, 0.012, 0.006), NAVY, 0, 0.3, 0.232);
  fine.add(rbox(0.24, 0.012, 0.004, 0.002), RUBBER, 0, 0.3, 0.239);
  for (const x of [-0.2, 0.2]) for (const z of [-0.15, 0.15]) {
    b.add(tube(0.025, 0.03, 0.16, 8), SLATE, x, 0.08, z);
    b.add(rbox(0.08, 0.015, 0.08, 0.006), SLATE, x, 0.0075, z);
  }
  b.add(rbox(0.42, 0.06, 0.32, 0.02), CREAM, 0, 1.03, 0.02);
  fine.add(rbox(0.1, 0.012, 0.06, 0.004), CHROME, 0.1, 1.066, 0.05);
  fine.add(rbox(0.012, 0.006, 0.04, 0.002), RUBBER, 0.1, 1.072, 0.05);
  fine.add(rbox(0.14, 0.035, 0.004, 0.002), GOLD, -0.08, 1.03, 0.181);
  return { b, fine };
}
/** Snow on the newspaper box, for winter. */
export const newsSnow = () => new Build()
  .add(rbox(0.54, 0.03, 0.44, 0.015), SNOW, 0, 1.01, 0)
  .add(rbox(0.4, 0.03, 0.3, 0.015), SNOW, 0, 1.072, 0.02);

/**
 * The TV out in the snow: a rounded case with a lip round the screen, a badge and a power light, a bulge at the back,
 * on posts with collars and rubber-capped feet, and its power cable down to a box on the ground.
 */
export function bigTV() {
  const b = new Build(), fine = new Build(), cy = 1.6;
  b.add(rbox(2.0, 1.18, 0.1, 0.04), INK, 0, cy, 0);
  frame(fine, SLATE, 0, cy, 0.054, 1.85, 1.03, 0.02, 0.012, 0.004);
  fine.add(rbox(0.14, 0.024, 0.006, 0.003), STEEL, 0, 1.045, 0.052);
  fine.add(K.dot, 0x49C25B, 0.88, 1.045, 0.052, null, [0.011, 0.011, 0.005]);
  b.add(rbox(1.2, 0.7, 0.12, 0.05), shade(INK, 1.15), 0, cy, -0.1);
  for (const s of [-1, 1]) {
    b.add(rbox(0.08, 1.1, 0.08, 0.02), SLATE, s * 0.7, 0.55, 0);
    b.add(rbox(0.12, 0.12, 0.12, 0.02), shade(SLATE, 0.8), s * 0.7, 1.02, 0);
    for (const y of [0.99, 1.05]) fine.add(K.dot, STEEL, s * 0.7, y, 0.061, null, [0.012, 0.012, 0.006]);
    b.add(rbox(0.12, 0.06, 0.5, 0.025), SLATE, s * 0.7, 0.03, 0);
    for (const z of [-1, 1]) fine.add(K.dome, RUBBER, s * 0.7, 0, z * 0.24, null, [0.05, 0.03, 0.03]);
  }
  // the power cable, from the back of the set down to a box on the ground
  const cable = new CatmullRomCurve3([[0.45, 1.3, -0.16], [0.62, 1.05, -0.12], [0.76, 0.5, -0.08], [0.8, 0.04, -0.2], [1.15, 0.02, -0.35]]
    .map(p => new Vector3(...p)));
  fine.add(new TubeGeometry(cable, 16, 0.014, 5), RUBBER, 0, 0, 0);
  fine.add(rbox(0.12, 0.07, 0.09, 0.02), 0x56636F, 1.22, 0.035, -0.36);
  return { b, fine };
}
/** Snow along the TV's top, for winter. */
export const tvSnow = () => new Build().add(rbox(1.98, 0.035, 0.1, 0.015), SNOW, 0, 2.205, 0);

/**
 * The blogger's camera (in the person's own space, held up to their face): a rounded body with a grip, a prism hump,
 * a flash on the hot shoe, a mode dial and shutter, and a lens with a focus ring and glass.
 */
export function bloggerCamera() {
  const b = new Build(), fine = new Build();
  b.add(rbox(0.28, 0.18, 0.12, 0.03), INK, 0, 1.06, 0.36);
  b.add(rbox(0.07, 0.17, 0.15, 0.03), shade(INK, 0.75), 0.115, 1.055, 0.37);
  b.add(rbox(0.1, 0.06, 0.09, 0.02), INK, 0, 1.165, 0.35);
  b.add(rbox(0.08, 0.06, 0.06, 0.015), SLATE, -0.085, 1.185, 0.36);
  fine.add(rbox(0.064, 0.036, 0.006, 0.003), 0xEEF4F8, -0.085, 1.19, 0.392);
  fine.add(tube(0.025, 0.025, 0.016, 10), SLATE, 0.08, 1.158, 0.34);
  fine.add(tube(0.012, 0.012, 0.012, 8), CHROME, 0.115, 1.152, 0.4);
  b.add(tube(0.058, 0.062, 0.1, 14), SLATE, 0.04, 1.05, 0.45, [Math.PI / 2, 0, 0]);
  fine.add(tube(0.066, 0.066, 0.03, 14), INK, 0.04, 1.05, 0.43, [Math.PI / 2, 0, 0]);
  fine.add(tube(0.063, 0.063, 0.012, 14), CHROME, 0.04, 1.05, 0.497, [Math.PI / 2, 0, 0]);
  fine.add(tube(0.045, 0.045, 0.006, 14), GLASS, 0.04, 1.05, 0.502, [Math.PI / 2, 0, 0]);
  fine.add(K.dot, 0xBFD8EA, 0.025, 1.065, 0.505, null, [0.01, 0.01, 0.003]);
  return { b, fine };
}

// ======================= the restaurant (stage 2) =======================

/**
 * The chalk A-frame: each board (`s` 1 the front, -1 the back, turned as the plain ones) a wooden panel with a raised
 * frame round its chalkboard, a chalk tray with chalk on the front one, a hinge along the top and chains between.
 */
export function aFrame() {
  const b = new Build(), fine = new Build(), wood = 0x8A5A3B, chalk = 0x2D3B36;
  for (const s of [-1, 1]) {
    const board = new Build(), bits = new Build();
    board.add(rbox(0.72, 1.04, 0.04, 0.012), shade(wood, 0.9), 0, 0, 0);
    // the frame stands out on the board's outer face, round the painted chalkboard
    const z = s * 0.0375;
    board.add(rbox(0.72, 0.084, 0.035, 0.012), wood, 0, 0.478, z);
    board.add(rbox(0.72, 0.106, 0.035, 0.012), wood, 0, -0.467, z);
    for (const x of [-1, 1]) board.add(rbox(0.065, 0.86, 0.035, 0.012), wood, x * 0.3275, 0.011, z);
    if (s < 0) board.add(rbox(0.6, 0.86, 0.01, 0.003), chalk, 0, 0.011, -0.03);
    else {
      board.add(rbox(0.6, 0.022, 0.06, 0.008), shade(wood, 0.85), 0, -0.425, 0.08);
      bits.add(tube(0.008, 0.008, 0.07, 6), 0xF4F1E8, -0.12, -0.403, 0.085, [0, 0, Math.PI / 2]);
      bits.add(tube(0.008, 0.008, 0.05, 6), 0xF7B3C4, 0.05, -0.403, 0.08, [0, 0.4, Math.PI / 2]);
    }
    put(b, board, 0, 0.52, s * 0.14, -s * 0.2);
    put(fine, bits, 0, 0.52, s * 0.14, -s * 0.2);
  }
  b.add(tube(0.022, 0.022, 0.74, 8), shade(wood, 0.75), 0, 1.03, 0, [0, 0, Math.PI / 2]);
  for (const x of [-0.25, 0.25]) fine.add(rbox(0.06, 0.05, 0.09, 0.01), 0xC99A22, x, 1.025, 0);
  for (const x of [-0.33, 0.33]) rod(fine, 0.006, STEEL, [x, 0.3, -0.165], [x, 0.3, 0.165], 5);
  return { b, fine };
}
/** Snow along the A-frame's top, for winter. */
export const aFrameSnow = () => new Build().add(rbox(0.74, 0.05, 0.13, 0.022), SNOW, 0, 1.06, 0);

/**
 * A paper lantern's trimmings (in its own swaying space, the paper's middle at 0): ribs round the paper, rounded caps
 * with rims, a brass knob, a hook and the cord it hangs by, and a knot and tassel under it.
 */
export function lanternTrim() {
  const b = new Build(), dark = INK, rib = shade(0xD63A2A, 0.62);
  for (const y of [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3]) {
    const r = 0.3 * Math.sqrt(1 - (y / 0.42) ** 2) + 0.003;
    b.add(RIM, rib, 0, y, 0, [Math.PI / 2, 0, 0], r);
  }
  for (const s of [-1, 1]) {
    b.add(tube(s > 0 ? 0.15 : 0.18, s > 0 ? 0.18 : 0.15, 0.07, 14), dark, 0, s * 0.4, 0);
    b.add(BAND, shade(dark, 1.6), 0, s * 0.37, 0, [Math.PI / 2, 0, 0], [0.18, 0.18, 0.25]);
  }
  b.add(K.dome, GOLD, 0, 0.435, 0, null, [0.05, 0.03, 0.05]);
  b.add(BAND, GOLD, 0, 0.49, 0, null, [0.03, 0.03, 0.3]);
  b.add(tube(0.006, 0.006, 0.58, 5), dark, 0, 0.81, 0);
  b.add(tube(0.006, 0.006, 0.08, 5), dark, 0, -0.47, 0);
  b.add(K.ball, GOLD, 0, -0.51, 0, null, 0.022);
  b.add(tube(0.014, 0.04, 0.16, 8), 0xD63A2A, 0, -0.6, 0);
  return b;
}

/** The ring light's stand: tripod legs (`legs`: where each plain leg sits and its tilt) with feet and a hub, a two-part pole with a clamp, a housing behind the ring, and the phone in its holder. */
export function ringStand(legs: { at: V3; rot: V3 }[]) {
  const b = new Build(), fine = new Build(), metal = SLATE;
  for (const { at, rot } of legs) {
    b.add(tube(0.013, 0.016, 0.64, 6), metal, ...at, rot);
    fine.add(K.dome, RUBBER, ...moved([0, -0.32, 0], at, rot), null, [0.03, 0.02, 0.03]);
  }
  b.add(tube(0.035, 0.045, 0.1, 10), shade(metal, 1.2), 0, 0.58, 0);
  b.add(tube(0.02, 0.022, 0.56, 8), metal, 0, 0.73, 0);
  b.add(tube(0.032, 0.032, 0.05, 10), shade(metal, 1.3), 0, 1.0, 0);
  fine.add(K.dot, INK, 0.035, 1.0, 0, null, [0.02, 0.015, 0.015]);
  b.add(tube(0.015, 0.015, 0.25, 8), metal, 0, 1.13, 0);
  b.add(HOUSING, metal, 0, 1.5, -0.03, null, [0.26, 0.26, 0.12]);
  b.add(rbox(0.1, 0.04, 0.04, 0.012), shade(metal, 1.2), 0, 1.245, -0.01);
  // a little remote clipped on the pole
  fine.add(rbox(0.05, 0.08, 0.03, 0.01), INK, 0, 0.88, 0.03);
  fine.add(K.dot, 0xFF5C8A, 0, 0.9, 0.046, null, [0.01, 0.01, 0.004]);
  // the holder and the phone in it: its lens to the chefs, its screen to whoever's filming
  rod(b, 0.008, metal, [0, 1.27, -0.01], [0, 1.38, -0.01]);
  fine.add(rbox(0.02, 0.27, 0.012, 0.005), metal, 0, 1.5, -0.016);
  for (const y of [1.372, 1.628]) fine.add(rbox(0.15, 0.022, 0.03, 0.008), metal, 0, y, 0);
  fine.add(rbox(0.13, 0.24, 0.015, 0.008), INK, 0, 1.5, 0);
  fine.add(rbox(0.112, 0.21, 0.003, 0.0015), GLASS, 0, 1.5, -0.008);
  for (const y of [1.59, 1.555]) fine.add(tube(0.011, 0.011, 0.004, 10), RUBBER, -0.035, y, 0.008, [Math.PI / 2, 0, 0]);
  return { b, fine };
}

/** The critic's table: a round top with a rim on a pedestal, a plate of nigiri with chopsticks, the notebook and a pen. */
export function criticTable() {
  const b = new Build(), fine = new Build(), wood = 0x7A4A30, dark = 0x5B3424;
  b.add(tube(0.38, 0.38, 0.05, 18), wood, 0.15, 0.74, 0);
  b.add(RIM, shade(wood, 0.8), 0.15, 0.74, 0, [Math.PI / 2, 0, 0], [0.38, 0.38, 0.8]);
  b.add(tube(0.09, 0.05, 0.05, 10), dark, 0.15, 0.695, 0);
  b.add(tube(0.045, 0.05, 0.64, 10), dark, 0.15, 0.37, 0);
  b.add(tube(0.07, 0.2, 0.05, 12), dark, 0.15, 0.025, 0);
  // the plate of nigiri
  fine.add(tube(0.13, 0.1, 0.02, 16), 0xFFFFFF, 0.25, 0.775, 0.12);
  fine.add(RIM, 0xD5E2EA, 0.25, 0.785, 0.12, [Math.PI / 2, 0, 0], 0.118);
  for (const [x, z, c] of [[0.22, 0.12, 0xFF8A5C], [0.3, 0.13, 0xD8394B]] as const) {
    fine.add(rbox(0.06, 0.026, 0.04, 0.012), 0xFFFDF5, x, 0.798, z);
    fine.add(rbox(0.075, 0.014, 0.05, 0.006), c, x, 0.817, z);
  }
  for (const dz of [0, 0.018]) fine.add(tube(0.004, 0.006, 0.24, 5), 0xC9A66B, 0.27, 0.79, 0.235 + dz, [0, 0, Math.PI / 2]);
  // the notebook, its spiral and lines, and a pen
  fine.add(rbox(0.16, 0.02, 0.22, 0.004), CREAM, 0.12, 0.775, -0.16);
  for (let i = 0; i < 5; i++) fine.add(rbox(0.1, 0.002, 0.008, 0.001), 0xA8B2BA, 0.13, 0.786, -0.22 + i * 0.03);
  for (let i = 0; i < 7; i++) fine.add(RIM, SLATE, 0.045, 0.786, -0.25 + i * 0.03, [0, Math.PI / 2, 0], 0.012);
  fine.add(tube(0.007, 0.007, 0.15, 6), NAVY, 0.24, 0.775, -0.14, [Math.PI / 2, 0, 0.5]);
  return { b, fine };
}
/** The critic's chair (the seat's top 0.5 up, where they sit): a seat on four legs, its back with posts and slats. */
export function criticChair() {
  const b = new Build(), wood = 0x5B3424;
  b.add(rbox(0.38, 0.08, 0.38, 0.025), wood, -0.5, 0.46, 0);
  for (const x of [-0.65, -0.35]) for (const z of [-0.15, 0.15]) b.add(tube(0.025, 0.022, 0.42, 6), shade(wood, 0.85), x, 0.21, z);
  for (const z of [-0.155, 0.155]) b.add(rbox(0.05, 0.62, 0.05, 0.015), wood, -0.69, 0.76, z);
  b.add(rbox(0.06, 0.09, 0.38, 0.025), wood, -0.69, 1.03, 0);
  for (const z of [-0.08, 0, 0.08]) b.add(rbox(0.03, 0.42, 0.045, 0.01), shade(wood, 1.1), -0.69, 0.74, z);
  for (const z of [-0.15, 0.15]) b.add(rbox(0.3, 0.03, 0.03, 0.01), shade(wood, 0.85), -0.5, 0.12, z);
  return b;
}

/**
 * The magazine rack: rounded sides with knobs on top and feet, shelves with a lip along the front, rails at the back,
 * and pages behind each cover (`covers`: each cover's middle, tilted back as the plain ones).
 */
export function rack(covers: V3[]) {
  const b = new Build(), fine = new Build(), wood = 0x7A4A30;
  for (const s of [-1, 1]) {
    b.add(rbox(0.04, 1.24, 0.34, 0.015), wood, s * 0.46, 0.62, 0);
    b.add(rbox(0.08, 0.03, 0.4, 0.012), shade(wood, 0.8), s * 0.46, 0.015, 0);
    fine.add(K.ball, shade(wood, 1.15), s * 0.46, 1.255, 0, null, 0.03);
  }
  for (const y of [0.32, 0.8]) {
    const shelf = new Build()
      .add(rbox(0.9, 0.03, 0.3, 0.01), wood, 0, 0, 0)
      .add(rbox(0.9, 0.06, 0.02, 0.008), shade(wood, 1.1), 0, 0.03, 0.15);
    put(b, shelf, 0, y, 0.02, 0.25);
  }
  for (const y of [0.74, 1.22]) b.add(tube(0.012, 0.012, 0.88, 6), shade(wood, 0.8), 0, y, -0.035, [0, 0, Math.PI / 2]);
  for (const at of covers) fine.add(rbox(0.35, 0.45, 0.016, 0.004), 0xF4F1EA, ...moved([0, -0.01, -0.01], at, [-0.25, 0, 0]), [-0.25, 0, 0]);
  return { b, fine };
}

/**
 * The cooking show's tripod (the plain legs' places and tilts): legs with clamps and rubber feet, a spreader, and the
 * pan base the camera sits on.
 */
export function tripod(legs: { at: V3; rot: V3 }[], len: number, top: number) {
  const b = new Build(), fine = new Build(), metal = SLATE;
  for (const { at, rot } of legs) {
    b.add(tube(0.02, 0.016, len, 6), metal, ...at, rot);
    b.add(tube(0.03, 0.03, 0.06, 8), shade(metal, 1.4), ...moved([0, 0.05, 0], at, rot), rot);
    fine.add(K.dome, RUBBER, ...moved([0, -len / 2, 0], at, rot), null, [0.035, 0.02, 0.035]);
    rod(fine, 0.008, metal, moved([0, -len * 0.18, 0], at, rot), [0, at[1] - len * 0.18 + 0.02, 0], 5);
  }
  b.add(tube(0.08, 0.1, 0.06, 12), shade(metal, 1.2), 0, top - 0.06, 0);
  b.add(tube(0.07, 0.07, 0.04, 12), metal, 0, top - 0.015, 0);
  return { b, fine };
}
/**
 * The TV camera (in its panning head, its base at -0.03): a rounded body with a control panel, a lens with a focus
 * ring, a hood and glass, a viewfinder with an eyecup, a carry handle, a seat under the tally light, and the pan handle.
 */
export function tvCamera() {
  const b = new Build(), fine = new Build(), body = 0x3C4C58;
  b.add(rbox(0.3, 0.3, 0.55, 0.045), body, 0, 0.12, 0);
  fine.add(rbox(0.006, 0.16, 0.28, 0.003), shade(body, 0.75), 0.152, 0.12, -0.02);
  for (const [y, z, c] of [[0.17, -0.1, 0xFF5C5C], [0.17, -0.04, 0x49C25B], [0.08, -0.1, CHROME], [0.08, -0.04, CHROME]] as const) {
    fine.add(K.dot, c, 0.156, y, z, null, [0.006, 0.018, 0.018]);
  }
  b.add(tube(0.11, 0.11, 0.2, 16), INK, 0, 0.12, 0.36, [Math.PI / 2, 0, 0]);
  fine.add(tube(0.118, 0.118, 0.05, 16), SLATE, 0, 0.12, 0.33, [Math.PI / 2, 0, 0]);
  b.add(tube(0.135, 0.112, 0.09, 16, true), INK, 0, 0.12, 0.49, [Math.PI / 2, 0, 0]);
  fine.add(tube(0.095, 0.095, 0.005, 16), GLASS, 0, 0.12, 0.462, [Math.PI / 2, 0, 0]);
  fine.add(K.dot, 0xBFD8EA, -0.03, 0.15, 0.466, null, [0.018, 0.018, 0.004]);
  b.add(rbox(0.1, 0.14, 0.18, 0.03), INK, -0.2, 0.22, -0.1);
  fine.add(tube(0.04, 0.05, 0.05, 10), RUBBER, -0.2, 0.22, -0.215, [Math.PI / 2, 0, 0]);
  b.add(ARCH, INK, 0.02, 0.27, -0.02, [0, Math.PI / 2, 0], [0.17, 0.09, 0.2]);
  fine.add(tube(0.03, 0.03, 0.02, 10), INK, 0.1, 0.275, 0.2);
  // the pan handle, out the back and down, with a rubber grip
  rod(b, 0.013, SLATE, [-0.04, -0.01, -0.25], [-0.16, -0.12, -0.62]);
  rod(fine, 0.022, RUBBER, [-0.15, -0.11, -0.59], [-0.18, -0.135, -0.68]);
  return { b, fine };
}
/**
 * The studio light (around the plain one at `x`, `z`): a weighted base and pole, a housing behind the glowing panel
 * with barn doors, and the ON AIR sign's box (turned `signY`, at `signAt`) on a rod over it.
 */
export function studioLight(x: number, z: number, signAt: V3, signY: number) {
  const b = new Build(), fine = new Build(), dark = INK;
  b.add(tube(0.17, 0.2, 0.04, 14), SLATE, x, 0.02, z - 0.08);
  b.add(tube(0.02, 0.024, 1.56, 8), SLATE, x, 0.8, z - 0.08);
  b.add(tube(0.032, 0.032, 0.05, 10), shade(SLATE, 1.3), x, 0.9, z - 0.08);
  fine.add(K.dot, INK, x + 0.035, 0.9, z - 0.08, null, [0.02, 0.015, 0.015]);
  const fz = z + 0.03, cy = 1.65;
  b.add(rbox(0.54, 0.46, 0.1, 0.03), SLATE, x, cy, z - 0.08);
  for (const s of [-1, 1]) {
    b.add(rbox(0.48, 0.01, 0.08, 0.004), SLATE, x, cy + s * 0.225 + s * 0.015, fz + 0.035, [-s * 0.41, 0, 0]);
    b.add(rbox(0.01, 0.38, 0.07, 0.004), SLATE, x + s * 0.27 + s * 0.014, cy, fz + 0.03, [0, s * 0.41, 0]);
  }
  b.add(tube(0.01, 0.01, 0.12, 6), SLATE, x, 1.92, z - 0.05);
  put(b, new Build().add(rbox(0.56, 0.22, 0.05, 0.02), dark, 0, 0, -0.03), ...signAt, 0, signY, 0);
  return { b, fine };
}

/**
 * The gourmet guide's pedestal and book: a plinth, a fluted column with a gold band, a moulding under the gold cap, and
 * the red book (turned as the plain one) with its pages, spine, a gold star on the cover and a ribbon.
 */
export function guidePedestal(star: Shape) {
  const b = new Build(), fine = new Build(), stone = CREAM;
  b.add(rbox(0.54, 0.08, 0.54, 0.02), shade(stone, 0.9), 0, 0.04, 0);
  b.add(rbox(0.44, 0.8, 0.44, 0.03), stone, 0, 0.48, 0);
  b.add(rbox(0.46, 0.03, 0.46, 0.01), GOLD, 0, 0.15, 0);
  for (let f = 0; f < 4; f++) {
    for (const o of [-0.12, 0, 0.12]) {
      const [x, z] = f < 2 ? [o, (f ? 1 : -1) * 0.221] : [(f === 3 ? 1 : -1) * 0.221, o];
      fine.add(rbox(f < 2 ? 0.03 : 0.006, 0.62, f < 2 ? 0.006 : 0.03, 0.002), shade(stone, 0.86), x, 0.52, z);
    }
  }
  b.add(rbox(0.5, 0.05, 0.5, 0.02), shade(stone, 0.95), 0, 0.905, 0);
  b.add(rbox(0.5, 0.04, 0.5, 0.015), GOLD, 0, 0.96, 0);
  const red = 0xC0392B, book = new Build(), bits = new Build();
  for (const s of [-1, 1]) book.add(rbox(0.32, 0.014, 0.42, 0.005), red, 0, s * 0.028, 0);
  book.add(rbox(0.022, 0.07, 0.42, 0.01), shade(red, 0.8), -0.15, 0, 0);
  book.add(rbox(0.29, 0.044, 0.4, 0.004), 0xFFF8EC, 0.008, 0, 0);
  const emblem = new ExtrudeGeometry(star, { depth: 0.006, bevelEnabled: false });
  emblem.center();
  bits.add(emblem, GOLD, 0.01, 0.038, 0, [-Math.PI / 2, 0, 0], 0.55);
  bits.add(rbox(0.25, 0.004, 0.012, 0.002), GOLD, 0.01, 0.036, -0.17);
  bits.add(rbox(0.025, 0.12, 0.004, 0.002), GOLD, 0.06, -0.04, 0.213);
  put(b, book, 0, 1.03, 0, -0.2);
  put(fine, bits, 0, 1.03, 0, -0.2);
  return { b, fine };
}

/** The flags' pegs on the string (`at`: each flag's top middle), and a bracket on the wall at each end (`X`, at `y`). */
export function flagPegs(at: [x: number, y: number][], X: number, y: number, wall: number) {
  const b = new Build();
  for (const [x, top] of at) for (const s of [-1, 1]) b.add(rbox(0.022, 0.05, 0.022, 0.006), 0xC9A66B, x + s * 0.12, top + 0.005, 0);
  for (const s of [-1, 1]) {
    b.add(rbox(0.03, 0.14, 0.1, 0.01), shade(0x6B4A35, 1), s * (wall - 0.015), y, 0);
    b.add(tube(0.01, 0.01, wall - X, 6), STEEL, s * (X + wall) / 2, y, 0, [0, 0, Math.PI / 2]);
    b.add(BAND, STEEL, s * X, y, 0, [0, Math.PI / 2, 0], 0.025);
  }
  return b;
}

/** A flag's plane `w` by `h`, rippled as if it had a breeze through it (for the waving flags on High). */
export function rippled<T extends BufferGeometry>(p: T, w: number) {
  const pos = p.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), k = (x + w / 2) / w;
    pos.setZ(i, Math.sin(k * Math.PI * 1.6) * 0.022 * (0.4 + k) + y * 0.04);
  }
  p.computeVertexNormals();
  return p;
}

// ======================= drawings for the canvases =======================
// Drawn the way icons.ts draws its icons (bold flat shapes, an ink outline), in a box from -50 to 50 each way; icons.ts
// has most of the campaigns' emoji already, and these are the rest.
type Ctx = CanvasRenderingContext2D;
const OUTLINE = '#1B2733', TAU = Math.PI * 2;
function solid(c: Ctx, color: string, path: () => void) {
  c.beginPath(); path(); c.fillStyle = color; c.fill(); c.stroke();
}
function flat(c: Ctx, color: string, path: () => void) {
  c.beginPath(); path(); c.fillStyle = color; c.fill();
}
const dot = (c: Ctx, x: number, y: number, r: number) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); };

/** A five-pointed star of radius `r`. */
function starPath(c: Ctx, x: number, y: number, r: number) {
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r * 0.45 : r;
    if (i) c.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k); else c.moveTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  c.closePath();
}

const OWN: Record<string, (c: Ctx) => void> = {
  /** 🐠 A yellow reef fish with blue stripes and an orange tail. */
  '🐠': c => {
    solid(c, '#F08A24', () => { c.moveTo(-18, 0); c.lineTo(-46, -22); c.lineTo(-38, 0); c.lineTo(-46, 22); c.closePath(); });
    solid(c, '#F08A24', () => { c.moveTo(-14, -18); c.quadraticCurveTo(0, -46, 22, -20); c.closePath(); });
    const body = () => { c.moveTo(42, 0); c.ellipse(6, 0, 36, 26, 0, 0, TAU); };
    solid(c, '#F7D038', body);
    c.save(); c.beginPath(); body(); c.clip();
    flat(c, '#2F6FD0', () => { c.rect(-10, -30, 9, 60); c.rect(14, -30, 7, 60); });
    c.restore();
    c.beginPath(); body(); c.stroke();
    solid(c, '#FFFFFF', () => dot(c, 26, -6, 6.5));
    flat(c, OUTLINE, () => dot(c, 28, -6, 3.2));
  },
  /** 💗 A pink heart with a shine. */
  '💗': c => {
    solid(c, '#FF5C8A', () => {
      c.moveTo(0, 38);
      c.bezierCurveTo(-30, 18, -46, 2, -46, -16); c.bezierCurveTo(-46, -34, -30, -42, -21, -42);
      c.bezierCurveTo(-9, -42, -2, -34, 0, -26); c.bezierCurveTo(2, -34, 9, -42, 21, -42);
      c.bezierCurveTo(30, -42, 46, -34, 46, -16); c.bezierCurveTo(46, 2, 30, 18, 0, 38);
      c.closePath();
    });
    flat(c, 'rgba(255,255,255,.7)', () => c.ellipse(-24, -20, 8, 12, -0.6, 0, TAU));
  },
  /** 🎵 A quaver: a round head, its stem and flag, outlined in white so it reads over anything. */
  '🎵': c => {
    const note = () => {
      c.moveTo(-6, 26); c.ellipse(-18, 26, 16, 11, -0.4, 0, TAU);
      c.moveTo(-6, 24); c.lineTo(-6, -40);
      c.moveTo(-6, -40); c.bezierCurveTo(6, -30, 30, -22, 20, 6);
    };
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 16; c.beginPath(); note(); c.stroke();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(-18, 26, 16, 11, -0.4, 0, TAU); c.fill();
    c.strokeStyle = '#23384A'; c.lineWidth = 8; c.beginPath(); c.moveTo(-6, 24); c.lineTo(-6, -40); c.bezierCurveTo(6, -30, 30, -22, 20, 6); c.stroke();
    c.fillStyle = '#23384A'; c.beginPath(); c.ellipse(-18, 26, 14, 10, -0.4, 0, TAU); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 4;
  },
  /** 😋 A happy face licking its lips. */
  '😋': c => {
    solid(c, '#FFD24A', () => dot(c, 0, 0, 44));
    c.lineWidth = 6;
    c.beginPath(); c.arc(-16, -8, 8, Math.PI * 1.1, Math.PI * 1.9); c.moveTo(24, -11); c.arc(16, -8, 8, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    c.beginPath(); c.arc(0, 6, 22, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    c.lineWidth = 4;
    solid(c, '#E85D75', () => { c.moveTo(18, 24); c.ellipse(10, 24, 9, 8, 0.3, 0, TAU); });
    flat(c, 'rgba(242,120,90,.45)', () => { dot(c, -28, 10, 7); dot(c, 28, 8, 7); });
  },
  /** 🍣 A piece of nigiri: rice under a slice of salmon. */
  '🍣': c => {
    solid(c, '#FFFDF5', () => { c.moveTo(-34, 4); c.roundRect(-34, -2, 68, 30, 12); });
    solid(c, '#FF8A5C', () => { c.moveTo(-40, -20); c.roundRect(-40, -22, 80, 26, 13); });
    c.lineWidth = 5; c.strokeStyle = '#FFD2BC';
    c.beginPath(); c.moveTo(-16, -18); c.lineTo(-8, 0); c.moveTo(2, -18); c.lineTo(10, 0); c.moveTo(20, -18); c.lineTo(26, -4); c.stroke();
    c.lineWidth = 4; c.strokeStyle = OUTLINE;
  },
};

/** Draws the picture for `icon` (an emoji) centred on (x, y), `size` across, as icons.ts does for the rest. */
export function adIcon(c: Ctx, icon: string, x: number, y: number, size: number) {
  const own = OWN[icon];
  if (!own) { drawIcon(c, icon, x, y, size); return; }
  c.save();
  c.translate(x, y); c.scale(size / 100, size / 100);
  c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 4; c.strokeStyle = OUTLINE;
  own(c);
  c.restore();
}

/** A row of `n` gold stars, centred on (x, y), each `size` across: the five-star ratings. */
export function starRow(c: Ctx, x: number, y: number, size: number, n = 5, color = '#F2A81D') {
  c.save();
  c.fillStyle = color; c.strokeStyle = shadeCss(color); c.lineWidth = Math.max(1, size / 14); c.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    c.beginPath(); starPath(c, x + (i - (n - 1) / 2) * size * 0.95, y, size / 2); c.fill(); c.stroke();
  }
  c.restore();
}
/** A darker edge for the stars. */
const shadeCss = (hex: string) => '#' + shade(parseInt(hex.slice(1), 16), 0.72).toString(16).padStart(6, '0');
