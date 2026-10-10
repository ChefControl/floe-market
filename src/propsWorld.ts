// The countryside's props on High graphics (graphics.ts), built with the kit (kit.ts) the way the people are: the pines'
// rounded, drooping tiers and the bushes, the roads' kerbs, her house and its yard, the presents at her door and the
// tutorial's gold arrow. Each builds a `Build` around its own middle (or base); the module that owns the prop puts it in
// place beside its Low version. Call these inside `quietly` (kit.ts), so building them never touches the game's luck.
import {
  BufferAttribute, type BufferGeometry, CylinderGeometry, Euler, ExtrudeGeometry, IcosahedronGeometry, LatheGeometry,
  Matrix4, Quaternion, RingGeometry, Shape, TorusGeometry, Vector2, Vector3,
} from 'three';
import { at, Build, K, quietly, rbox, shade, tube } from './kit';
import type { Part } from './render';

const SNOW = 0xFFFFFF;

// ---------- shapes ----------
/**
 * A shape turned on a lathe from `profile` ([radius, y] pairs, from the bottom up so it faces outward), its outer edge
 * rippled into `lumps` tufts that stick out and droop a little (`out`, `droop`), more the further out they are past
 * `from`. Its normals are smoothed across the seam, so it reads as one rounded thing.
 */
function turned(profile: [number, number][], seg: number, lumps = 0, out = 0, droop = 0, from = 0.45) {
  const g = new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), seg);
  const P = g.attributes.position;
  if (lumps) {
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i), r = Math.hypot(x, z);
      if (r < 1e-6) continue;
      const wave = Math.cos(lumps * Math.atan2(x, z)), k = Math.max(0, Math.min(1, (r - from) / (1 - from))) ** 1.5;
      const s = 1 + out * wave * k;
      P.setXYZ(i, x * s, P.getY(i) - droop * (1 + wave) / 2 * k, z * s);
    }
  }
  g.computeVertexNormals();
  // the lathe's first and last columns are the same points: share their normals so the seam doesn't show
  const N = g.attributes.normal, n = profile.length, v = new Vector3(), w = new Vector3();
  for (let j = 0; j < n; j++) {
    const a = j, b = seg * n + j;
    v.fromBufferAttribute(N, a).add(w.fromBufferAttribute(N, b)).normalize();
    N.setXYZ(a, v.x, v.y, v.z); N.setXYZ(b, v.x, v.y, v.z);
  }
  return g;
}

const q = new Quaternion(), e = new Euler(), p3 = new Vector3(), s3 = new Vector3();
/** Where a `bake` part (render.ts) puts its shape, as a matrix. */
export const partMatrix = (p: Part) => new Matrix4().compose(
  p3.set(...p.at), q.setFromEuler(e.set(...(p.rot ?? [0, 0, 0]))), s3.set(...(p.scale ?? [1, 1, 1])));

// ---------- the pines ----------
// Each shape is made the size of the Low tree's (render.ts G.cone and G.cyl, a unit tall and a unit across, about their
// middle), so the High tree is built from the very same parts, moved and sized the same.
const TUFTS = 6;
const PINE = quietly(() => ({
  /** A tier of branches: rounded, its edge in six drooping tufts, hollow underneath. */
  tier: turned([[0.2, -0.42], [0.86, -0.56], [1.0, -0.47], [0.62, -0.08], [0, 0.52]], TUFTS * 2, TUFTS, 0.1, 0.08),
  /** The snow on a tier (blossom, leaves or gold out of winter): a cushion over its top, in lumps over its tufts. */
  drift: turned([[0.6, -0.24], [0.8, -0.3], [0.7, -0.15], [0.32, 0.26], [0, 0.575]], TUFTS * 2, TUFTS, 0.1, 0.08),
  /** The trunk, flaring out where it meets the ground, and running up into the tiers. */
  trunk: turned([[1.5, -0.5], [1.05, -0.35], [0.9, 0.1], [0.8, 0.9]], 6),
  /** A softer ball than the kit's, for bushes. */
  lump: new IcosahedronGeometry(1, 1),
}));
/** The middle tier is turned half a tuft, so its tufts sit between the ones above and below it. */
const STAGGER = new Matrix4().makeRotationY(Math.PI / TUFTS);

/** A pine's tier (a part of the Low tree's needles), and the drift on it. `stagger`: the middle tier. */
export function pineTier(needles: Build, drift: Build, p: Part, stagger: boolean) {
  const m = partMatrix(p);
  if (stagger) m.multiply(STAGGER);
  needles.pieces.push({ geo: PINE.tier, c: 0xFFFFFF, m });
  drift.pieces.push({ geo: PINE.drift, c: 0xFFFFFF, m });
}
/** A pine's trunk (the Low tree's trunk part), flared at its foot, with roots showing. */
export function pineTrunk(b: Build, p: Part) {
  const t = new Build(), bark = 0x7A5236;
  t.add(PINE.trunk, bark, 0, 0, 0);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + 0.4;
    t.add(K.dot, shade(bark, 0.88), Math.sin(a) * 1.15, -0.48, Math.cos(a) * 1.15, [0, a, 0], [0.5, 0.09, 0.75]);
  }
  b.addAll(t, partMatrix(p));
}
const BUSH: [x: number, y: number, z: number, r: number][] = [
  [0, 0.05, 0, 0.85],
  ...[0, 1, 2].map(i => [Math.sin(i * 2.1) * 0.55, 0.02, Math.cos(i * 2.1) * 0.55, 0.55 - (i % 2) * 0.06] as [number, number, number, number]),
];
/**
 * A bush (the Low snow mound, a part sized like a ball half in the ground): a cluster of soft lumps. It's the mounds'
 * material, so it's a drift of snow in winter.
 */
export function bush(b: Build, p: Part) {
  const m = partMatrix(p), t = new Build();
  // turned by where it stands, so they don't all look alike
  const ry = (p.at[0] * 1.7 + p.at[2] * 2.3) % (Math.PI * 2);
  for (const [x, y, z, r] of BUSH) {
    const c = Math.cos(ry), s = Math.sin(ry);
    t.add(PINE.lump, 0xFFFFFF, x * c + z * s, y, z * c - x * s, null, r);
  }
  b.addAll(t, m);
}

// ---------- the roads ----------
/**
 * A road `len` long (along z) and `half` wide either side of its middle, on High: rounded asphalt, a kerb along each
 * edge, white edge lines and rounded centre dashes (where the Low ones are). The kerbs stop either side of `gaps`
 * (crossings, by z). Returns the road and the winter's snow, ploughed up against the kerbs.
 */
export function road(len: number, half: number, gaps: number[]) {
  const b = new Build(), snow = new Build(), tar = 0x6B7785, kerb = 0xB4BEC8;
  b.add(rbox(half * 2, 0.04, len, 0.015), tar, 0, -0.015, 0);
  for (let z = -64; z < 64; z += 2.2) b.add(rbox(0.12, 0.012, 0.9, 0.005), 0xE8EEF2, 0, 0.007, z);
  // stretches between the crossings
  const cuts = [-len / 2, ...gaps.flatMap(g => [g - 0.85, g + 0.85]), len / 2];
  for (let k = 0; k + 1 < cuts.length; k += 2) {
    const z0 = cuts[k], z1 = cuts[k + 1], l = z1 - z0, zm = (z0 + z1) / 2;
    for (const s of [-1, 1]) {
      b.add(rbox(0.14, 0.06, l, 0.025), kerb, s * (half - 0.07), 0.02, zm);
      b.add(rbox(0.05, 0.008, l, 0.003), 0xE8EEF2, s * (half - 0.26), 0.006, zm);
      snow.add(rbox(0.22, 0.05, l - 0.2, 0.025), SNOW, s * (half - 0.1), 0.05, zm);
    }
  }
  return { road: b, snow };
}

// ---------- her house ----------
const WALL = 0xE7B3AC, TRIM = 0xF6EEEA, FASCIA = 0x8E4B45, TILE = 0xB0574F, DOOR = 0x8E2B2B, SHUTTER = 0x9C5A50;
const IRON = 0x2C3A47;

/** What a High prop of the house is made of: the shapes that cast shadows, small trims that don't, the lit glass and winter's snow. */
export interface Lit { body: Build; trim: Build; glow: Build; snow: Build }
const lit = (): Lit => ({ body: new Build(), trim: new Build(), glow: new Build(), snow: new Build() });
/** Adds one Lit's builds to another's, moved by `m`. */
function place(to: Lit, from: Lit, m: Matrix4) {
  to.body.addAll(from.body, m); to.trim.addAll(from.trim, m); to.glow.addAll(from.glow, m); to.snow.addAll(from.snow, m);
}

/**
 * A window `w` wide and `h` tall in a wall that faces -x (its face at x = 0, its middle at 0, 0): a white frame and
 * glazing bars over the lit glass, a sill with snow on it in winter, and louvred shutters `sh` wide each side.
 */
function framed(w: number, h: number, sh: number) {
  const L = lit(), f = 0.08;
  L.glow.add(rbox(0.03, h - 0.1, w - 0.1, 0.01), 0, -0.02, 0, 0);
  for (const s of [-1, 1]) {
    L.trim.add(rbox(0.08, h, f, 0.02), TRIM, -0.04, 0, s * (w / 2 - f / 2));
    L.trim.add(rbox(0.08, f, w, 0.02), TRIM, -0.04, s * (h / 2 - f / 2), 0);
  }
  L.trim.add(rbox(0.04, h - 0.1, 0.045, 0.012), TRIM, -0.05, 0, 0);
  L.trim.add(rbox(0.04, 0.045, w - 0.1, 0.012), TRIM, -0.05, 0.03, 0);
  L.body.add(rbox(0.15, 0.06, w + 0.16, 0.02), TRIM, -0.075, -h / 2 - 0.03, 0);
  L.snow.add(rbox(0.13, 0.05, w + 0.1, 0.024), SNOW, -0.08, -h / 2 + 0.02, 0);
  if (sh > 0) {
    for (const s of [-1, 1]) {
      const z = s * (w / 2 + sh / 2 + 0.01);
      L.body.add(rbox(0.04, h, sh, 0.015), SHUTTER, -0.025, 0, z);
      for (let k = 0; k < 5; k++) L.trim.add(rbox(0.02, 0.03, sh - 0.08, 0.008), shade(SHUTTER, 0.8), -0.05, -h / 2 + 0.16 + k * (h - 0.32) / 4, z);
    }
  }
  return L;
}

/**
 * Her house on High, `w` wide (x, its front at -w/2 facing west), `d` deep and its walls `h` tall, about the middle of
 * its floor: lap siding over a plinth, white corner boards and window frames, louvred shutters, a panelled door with a
 * frame, knob and step, a lantern by the door, a tiled gable roof with eaves, a ridge and barge boards, the chimney
 * with a cap and a pot, and the round attic window. The lit glass is laid exactly where the Low windows' glow is.
 */
export function house(w: number, d: number, h: number, chimney: [x: number, z: number]) {
  const L = lit(), { body, trim, snow } = L, x0 = -w / 2;
  body.add(rbox(w, h, d, 0.05), WALL, 0, h / 2, 0);
  body.add(rbox(w + 0.08, 0.22, d + 0.08, 0.03), shade(WALL, 0.78), 0, 0.11, 0);
  // the openings in each wall (where they are along it, how wide, from and to what height), to run the siding round
  const front = [[0, 0.62, 0, 1.95], [-1.65, 0.62, 0.8, 1.9], [1.65, 0.62, 0.8, 1.9]];
  const side = [[-0.85, 0.62, 0.8, 1.9], [0.85, 0.62, 0.8, 1.9]];
  const lap = shade(WALL, 0.93);
  for (let y = 0.36; y < h - 0.1; y += 0.22) {
    for (const [wall, holes, len] of [[0, front, d], [1, [], d], [2, [], w], [3, side, w]] as [number, number[][], number][]) {
      const cuts: [number, number][] = [[-len / 2 + 0.06, len / 2 - 0.06]];
      for (const [c, hw, y0, y1] of holes) {
        if (y < y0 || y > y1) continue;
        const i = cuts.findIndex(([a, b]) => c > a && c < b);
        if (i < 0) continue;
        const [a, b] = cuts[i];
        cuts.splice(i, 1, [a, c - hw], [c + hw, b]);
      }
      for (const [a, b] of cuts) {
        if (b - a < 0.05) continue;
        const l = +(b - a).toFixed(3), m = (a + b) / 2;
        if (wall < 2) trim.add(rbox(0.025, 0.04, l, 0.012), lap, (wall ? 1 : -1) * (w / 2 + 0.005), y, m);
        else trim.add(rbox(l, 0.04, 0.025, 0.012), lap, m, y, (wall === 3 ? 1 : -1) * (d / 2 + 0.005));
      }
    }
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) body.add(rbox(0.1, h - 0.2, 0.1, 0.03), TRIM, sx * w / 2, h / 2 + 0.1, sz * d / 2);

  // the roof: a gable end in the walls' colour, tiled slopes with eaves, a ridge and barge boards; snow on it in winter
  const span = w / 2 + 0.35, rise = 1.6, slope = Math.hypot(span, rise), a = Math.atan2(rise, span), deep = d + 0.5;
  const gable = new Shape();
  gable.moveTo(-span + 0.05, 0); gable.lineTo(0, rise - 0.04); gable.lineTo(span - 0.05, 0); gable.closePath();
  const gableGeo = new ExtrudeGeometry(gable, { depth: deep - 0.04, bevelEnabled: false });
  gableGeo.translate(0, 0, -(deep - 0.04) / 2);
  body.add(gableGeo, WALL, 0, h, 0);
  body.add(rbox(w + 0.75, 0.12, d + 0.55, 0.03), FASCIA, 0, h + 0.02, 0);
  const t = 0.1, len = slope + 0.14, rows = 6;
  for (const s of [-1, 1]) {
    // along the slope (down it) and out of it
    const dx = s * Math.cos(a), dy = -Math.sin(a), nx = s * Math.sin(a), ny = Math.cos(a), rz = -s * a;
    const mx = s * span / 2 + dx * 0.07, my = h + rise / 2 + dy * 0.07;
    body.add(rbox(len, t, deep + 0.1, 0.03), FASCIA, mx + nx * t / 2, my + ny * t / 2, 0, [0, 0, rz]);
    // rows of tiles, each lapping over the one below it, its bottom edge standing proud, their joints staggered
    const tw = (deep + 0.06) / 11;
    for (let r = 0; r < rows; r++) {
      const along = -len / 2 + (r + 0.5) * len / rows, lift = t + 0.035, z0 = -(deep + 0.06) / 2;
      for (let k = 0; k < 12; k++) {
        const a0 = Math.max(z0, z0 + (k - (r % 2) * 0.5) * tw), a1 = Math.min(-z0, z0 + (k + 1 - (r % 2) * 0.5) * tw);
        if (a1 - a0 < 0.05) continue;
        body.add(rbox(len / rows + 0.06, 0.05, +(a1 - a0 - 0.025).toFixed(3), 0.022), r % 2 ? TILE : shade(TILE, 1.05),
          mx + dx * along + nx * lift, my + dy * along + ny * lift, (a0 + a1) / 2, [0, 0, rz + s * 0.06]);
      }
    }
    snow.add(rbox(len - 0.08, 0.09, deep, 0.04), SNOW, mx + nx * (t + 0.1), my + ny * (t + 0.1), 0, [0, 0, rz]);
    for (let z = -deep / 2 + 0.25; z < deep / 2 - 0.1; z += 0.42) {
      snow.add(K.ball, SNOW, mx + dx * (len / 2 - 0.05) + nx * (t + 0.08), my + dy * (len / 2 - 0.05) + ny * (t + 0.08), z,
        [0, 0, rz], [0.12, 0.07, 0.24]);
    }
    for (const sz of [-1, 1]) {
      trim.add(rbox(len, 0.15, 0.06, 0.025), FASCIA, mx + nx * 0.01, my + ny * 0.01, sz * (deep / 2 + 0.04), [0, 0, rz]);
    }
  }
  body.add(tube(0.09, 0.09, deep + 0.16, 8), shade(FASCIA, 0.9), 0, h + rise + 0.16, 0, [Math.PI / 2, 0, 0]);
  snow.add(tube(0.1, 0.1, deep + 0.06, 8), SNOW, 0, h + rise + 0.22, 0, [Math.PI / 2, 0, 0], [1, 1, 0.75]);

  // the chimney: brick courses, a cap and a pot
  const [cx, cz] = chimney, brick = 0x9C5A50;
  body.add(rbox(0.5, 1.1, 0.5, 0.03), brick, cx, h + 1.1, cz);
  for (let y = h + 1.22; y < h + 1.6; y += 0.13) trim.add(rbox(0.52, 0.022, 0.52, 0.008), shade(brick, 0.82), cx, y, cz);
  body.add(rbox(0.64, 0.08, 0.64, 0.025), shade(brick, 0.68), cx, h + 1.69, cz);
  body.add(tube(0.08, 0.1, 0.18, 8), 0x7E4A3E, cx + 0.08, h + 1.82, cz);
  trim.add(K.dome, 0x2A1E1A, cx + 0.08, h + 1.905, cz, null, [0.065, 0.01, 0.065]);
  snow.add(rbox(0.6, 0.06, 0.6, 0.025), SNOW, cx, h + 1.75, cz);

  // the door on the front: a frame with a little hood, raised panels, a brass knob and a stone step
  trim.add(rbox(0.06, 1.75, 0.95, 0.02), DOOR, x0 - 0.03, 0.88, 0);
  for (const y of [0.45, 1.25]) for (const z of [-0.2, 0.2]) trim.add(rbox(0.025, 0.6, 0.3, 0.012), shade(DOOR, 1.12), x0 - 0.065, y, z);
  for (const s of [-1, 1]) body.add(rbox(0.09, 1.86, 0.09, 0.025), TRIM, x0 - 0.04, 0.93, s * 0.52);
  body.add(rbox(0.14, 0.1, 1.24, 0.03), TRIM, x0 - 0.05, 1.86, 0);
  body.add(rbox(0.22, 0.05, 1.22, 0.02), FASCIA, x0 - 0.09, 1.94, 0);
  snow.add(rbox(0.2, 0.05, 1.16, 0.022), SNOW, x0 - 0.09, 1.98, 0);
  trim.add(rbox(0.015, 0.14, 0.06, 0.008), 0xC9A23E, x0 - 0.065, 0.85, -0.32);
  trim.add(K.ball, 0xF2C14E, x0 - 0.1, 0.85, -0.32, null, 0.045);
  body.add(rbox(0.34, 0.12, 1.2, 0.035), 0xB4ADA6, x0 - 0.17, 0.06, 0);

  // the windows: two on the front, her bedroom's two on the side toward the camera (+z), and the attic's round one
  for (const z of [-1.65, 1.65]) place(L, framed(1.05, 0.95, 0.34), at(x0, 1.35, z));
  for (const x of [-0.85, 0.85]) place(L, framed(1.05, 0.95, 0.27), at(x, 1.35, d / 2, Math.PI / 2));
  const az = deep / 2, ay = h + 0.55;
  L.glow.add(tube(0.3, 0.3, 0.04, 16), 0, 0, ay, az, [Math.PI / 2, 0, 0]);
  trim.add(new TorusGeometry(0.32, 0.05, 6, 18), TRIM, 0, ay, az + 0.02);
  trim.add(rbox(0.6, 0.04, 0.04, 0.012), TRIM, 0, ay, az + 0.03);
  trim.add(rbox(0.04, 0.6, 0.04, 0.012), TRIM, 0, ay, az + 0.03);

  // the lantern by the door
  const lx = x0 - 0.12, ly = 1.95, lz = 0.75;
  trim.add(rbox(0.14, 0.03, 0.03, 0.01), IRON, x0 - 0.06, ly + 0.1, lz);
  L.glow.add(tube(0.065, 0.065, 0.15, 6), 0, lx, ly, lz);
  trim.add(tube(0.02, 0.1, 0.07, 6), IRON, lx, ly + 0.11, lz);
  trim.add(tube(0.075, 0.05, 0.03, 6), IRON, lx, ly - 0.09, lz);
  for (let i = 0; i < 6; i++) {
    const r = i * Math.PI / 3 + Math.PI / 6;
    trim.add(rbox(0.012, 0.15, 0.012, 0.004), IRON, lx + Math.sin(r) * 0.066, ly, lz + Math.cos(r) * 0.066);
  }
  trim.add(K.dot, IRON, lx, ly + 0.16, lz, null, 0.02);
  snow.add(K.dome, SNOW, lx, ly + 0.13, lz, null, [0.085, 0.04, 0.085]);
  return L;
}

/** A picket's shape: a board with a rounded point, its edges softened, standing on its foot, facing ±z. */
const PICKET = quietly(() => {
  const s = new Shape(), hw = 0.035;
  s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, 0.5);
  s.quadraticCurveTo(hw, 0.55, 0, 0.6); s.quadraticCurveTo(-hw, 0.55, -hw, 0.5); s.closePath();
  const g = new ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1, curveSegments: 3 });
  g.translate(0, 0, -0.015);
  return g;
});
/**
 * Her picket fence on High: pointed, rounded pickets where the Low ones stand, two rails behind them, posts with ball
 * tops at the corners and either side of the gate, and snow along the rails in winter. `runs` are its straight
 * stretches, [x0, z0, x1, z1] in the order Low draws them, with the pickets along each; `posts` where the posts go;
 * `inward` which way the yard is from each run (the rails go on that side).
 */
export function picketFence(runs: { from: [number, number]; to: [number, number]; pickets: [number, number][]; inward: [number, number] }[], posts: [number, number][], y: number) {
  const b = new Build(), snow = new Build(), white = 0xFFFFFF;
  for (const r of runs) {
    const [x0, z0] = r.from, [x1, z1] = r.to, alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), l = Math.hypot(x1 - x0, z1 - z0);
    const ry = alongX ? 0 : Math.PI / 2, ix = r.inward[0] * 0.045, iz = r.inward[1] * 0.045;
    for (const [px, pz] of r.pickets) b.add(PICKET, white, px, y, pz, [0, ry, 0]);
    for (const ry2 of [0.22, 0.45]) {
      const g = alongX ? rbox(l, 0.06, 0.035, 0.012) : rbox(0.035, 0.06, l, 0.012);
      b.add(g, shade(white, 0.94), (x0 + x1) / 2 + ix, y + ry2, (z0 + z1) / 2 + iz);
    }
    const sg = alongX ? rbox(l - 0.04, 0.035, 0.06, 0.015) : rbox(0.06, 0.035, l - 0.04, 0.015);
    snow.add(sg, SNOW, (x0 + x1) / 2 + ix, y + 0.49, (z0 + z1) / 2 + iz);
  }
  for (const [px, pz] of posts) {
    b.add(rbox(0.1, 0.66, 0.1, 0.03), white, px, y + 0.33, pz);
    b.add(rbox(0.13, 0.04, 0.13, 0.015), shade(white, 0.92), px, y + 0.67, pz);
    b.add(K.ball, white, px, y + 0.73, pz, null, 0.055);
    snow.add(K.dome, SNOW, px, y + 0.765, pz, null, [0.06, 0.035, 0.06]);
  }
  return { fence: b, snow };
}

/** A quarter circle of iron, from straight down round to +z (about its middle, a unit across), to brace an arm. */
const SCROLL = quietly(() => new TorusGeometry(1, 0.11, 4, 8, Math.PI / 2));
const BRACE = new Euler().setFromRotationMatrix(new Matrix4().makeBasis(
  new Vector3(0, -1, 0), new Vector3(0, 0, 1), new Vector3(-1, 0, 0))).toArray().slice(0, 3) as [number, number, number];
/**
 * The street lamp on High, about the foot of its post: a stepped base, a fluted post with collars, a scrolled arm
 * reaching `reach` along +z, and a lantern hanging from it, its glass lit (where the Low bulb glows, `bulb` up).
 */
export function streetLamp(height: number, reach: number, bulb: number) {
  const L = lit(), { body, trim, snow } = L;
  body.add(rbox(0.3, 0.1, 0.3, 0.03), IRON, 0, 0.05, 0);
  body.add(tube(0.08, 0.13, 0.25, 8), IRON, 0, 0.22, 0);
  body.add(tube(0.05, 0.065, height - 0.3, 8), IRON, 0, 0.3 + (height - 0.3) / 2, 0);
  for (const y of [0.36, height - 0.55]) trim.add(K.ring, shade(IRON, 1.25), 0, y, 0, [Math.PI / 2, 0, 0], [0.075, 0.075, 0.3]);
  body.add(K.ball, IRON, 0, height + 0.04, 0, null, 0.07);
  trim.add(K.dot, IRON, 0, height + 0.13, 0, null, 0.03);
  // the arm, and a scroll under it bracing it to the post
  body.add(tube(0.03, 0.03, reach, 6), IRON, 0, height, reach / 2, [Math.PI / 2, 0, 0]);
  trim.add(SCROLL, IRON, 0, height, 0, BRACE, [0.16, 0.16, 0.18]);
  // the lantern hanging from the arm's end: a hood, its glass, the frame round it and a finial under it
  const ly = bulb - 0.1;
  body.add(tube(0.03, 0.17, 0.1, 8), IRON, 0, ly + 0.13, reach);
  L.glow.add(tube(0.12, 0.085, 0.17, 8), 0, 0, ly - 0.01, reach);
  for (let i = 0; i < 4; i++) {
    const r = i * Math.PI / 2 + Math.PI / 4;
    trim.add(rbox(0.014, 0.18, 0.014, 0.005), IRON, Math.sin(r) * 0.105, ly - 0.01, reach + Math.cos(r) * 0.105, [Math.cos(r) * 0.2, 0, -Math.sin(r) * 0.2]);
  }
  trim.add(tube(0.09, 0.05, 0.04, 8), IRON, 0, ly - 0.11, reach);
  trim.add(K.dot, IRON, 0, ly - 0.15, reach, null, 0.025);
  snow.add(K.dome, SNOW, 0, ly + 0.17, reach, null, [0.15, 0.06, 0.15]);
  snow.add(rbox(0.06, 0.03, reach - 0.1, 0.012), SNOW, 0, height + 0.035, reach / 2);
  return L;
}

/** Half a log along z, its flat side down: the mailbox's rounded top. */
const ARCH = quietly(() => new CylinderGeometry(1, 1, 1, 10, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2));
/**
 * Her mailbox on High, about the foot of its post: a rounded red box on a post with a bracket, its door toward -z
 * (the path) with a latch, and its flag up on the side.
 */
export function mailbox(top: number) {
  const L = lit(), { body, trim, snow } = L, red = 0xD8394B, wood = 0x7A5236, y = top - 0.19;
  body.add(rbox(0.09, y - 0.07, 0.09, 0.025), wood, 0, (y - 0.07) / 2, 0);
  body.add(rbox(0.2, 0.04, 0.34, 0.015), shade(wood, 0.9), 0, y - 0.1, 0);
  for (const s of [-1, 1]) trim.add(rbox(0.03, 0.12, 0.03, 0.01), shade(wood, 0.9), 0, y - 0.15, s * 0.07, [s * 0.6, 0, 0]);
  body.add(rbox(0.24, 0.14, 0.42, 0.02), red, 0, y, 0);
  body.add(ARCH, red, 0, y + 0.07, 0, null, [0.12, 0.12, 0.42]);
  trim.add(rbox(0.22, 0.12, 0.02, 0.008), shade(red, 0.85), 0, y + 0.02, -0.215);
  trim.add(ARCH, shade(red, 0.85), 0, y + 0.07, -0.215, null, [0.11, 0.11, 0.02]);
  trim.add(K.dot, 0xE8EEF2, 0, y + 0.1, -0.23, null, 0.02);
  trim.add(rbox(0.02, 0.2, 0.025, 0.008), 0xF2C14E, 0.13, y + 0.08, 0.08);
  trim.add(rbox(0.02, 0.07, 0.11, 0.01), 0xF2C14E, 0.13, y + 0.15, 0.13);
  trim.add(K.dot, shade(red, 0.7), 0.125, y, 0.08, null, 0.02);
  snow.add(ARCH, SNOW, 0, y + 0.075, 0, null, [0.128, 0.13, 0.4]);
  return L;
}

/** Stones edging a path either side, from `x0` to `x1` (its middle at z = 0), `y` high: blocks, butted end to end. */
export function pathEdging(x0: number, x1: number, half: number, y: number) {
  const b = new Build(), n = Math.max(1, Math.round((x1 - x0) / 0.55)), l = (x1 - x0) / n;
  for (const s of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      b.add(rbox(+(l - 0.04).toFixed(3), y + 0.03, 0.1, 0.03), (i + (s > 0 ? 1 : 0)) % 2 ? 0xB9B2A8 : 0xA9A298,
        x0 + (i + 0.5) * l, (y + 0.03) / 2 - 0.02, s * (half + 0.05));
    }
  }
  return b;
}

// ---------- the presents ----------
/** A present `w` by `h` by `d`, about the middle of its bottom: a box with rounded edges, ribbon each way round, a bow with two loops and tails. */
export function present(b: Build, w: number, h: number, d: number, wrap: number, ribbon: number, m: Matrix4) {
  const p = new Build(), rib = 0.045, rd = shade(ribbon, 0.86);
  p.add(rbox(w, h, d, 0.02), wrap, 0, h / 2, 0);
  p.add(rbox(w + 0.012, h + 0.012, rib, 0.01), ribbon, 0, h / 2, 0);
  p.add(rbox(rib, h + 0.012, d + 0.012, 0.01), ribbon, 0, h / 2, 0);
  for (const s of [-1, 1]) {
    p.add(K.ring, ribbon, s * 0.038, h + 0.03, 0, [0, 0, s * 0.55], [0.036, 0.03, 0.17]);
    p.add(rbox(0.02, 0.005, 0.07, 0.002), rd, s * 0.02, h + 0.008, s * 0.035, [0, s * 0.5, 0]);
  }
  p.add(K.ball, rd, 0, h + 0.016, 0, null, [0.02, 0.016, 0.024]);
  b.addAll(p, m);
}

// ---------- the tutorial's arrow ----------
/**
 * The arrow on High, about its tip: a cut-gold point (eight facets, so its spin catches the light, as the Low cone's
 * do) with a rounded tip and a bead round its rim, on a round shaft with a domed top.
 */
export function guideArrow(gold: number) {
  const head = turned([[0, 0], [0.05, 0.02], [0.12, 0.09], [0.3, 0.3], [0.41, 0.44], [0.4, 0.5], [0.3, 0.53], [0.15, 0.545]], 8)
    .toNonIndexed();
  head.computeVertexNormals();
  return new Build()
    .add(head, gold, 0, 0, 0)
    .add(turned([[0.15, 0.53], [0.15, 0.95], [0.11, 1.0], [0, 1.02]], 16), gold, 0, 0, 0)
    .add(K.ring, shade(gold, 0.88), 0, 0.475, 0, [Math.PI / 2, 0, 0], [0.4, 0.4, 0.3])
    .add(K.ring, shade(gold, 0.88), 0, 0.56, 0, [Math.PI / 2, 0, 0], [0.155, 0.155, 0.25]);
}
/** The ring under the arrow on High: a gold band with soft edges, fading out inside and out (in its colours' alpha). */
export function softRing() {
  const g = new RingGeometry(0.94, 1.24, 48, 10), P = g.attributes.position, c = new Float32Array(P.count * 4);
  for (let i = 0; i < P.count; i++) {
    const r = Math.hypot(P.getX(i), P.getY(i));
    // solid across the Low ring's band (1 to 1.14), fading to nothing either side
    const k = r < 1 ? (r - 0.94) / 0.06 : r > 1.14 ? 1 - (r - 1.14) / 0.1 : 1;
    c.set([1, 1, 1, Math.max(0, Math.min(1, k))], i * 4);
  }
  g.setAttribute('color', new BufferAttribute(c, 4));
  return g as BufferGeometry;
}
