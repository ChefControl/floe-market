// The land, sea and sky past the playable area, for the wide shots (the store's screenshots and trailer, the stage-up's
// overview): rolling hills all round the land side, pines on them in groves, a dip where each road runs off between
// them, two rows of far mountains behind, a village east past her house (village.ts), and out at sea icebergs (melting
// with the floes) and, in summer, a few far sailboats; overhead a sky that deepens from the horizon up, with flat-bottomed clouds low
// in it. All of it sits well past where anyone walks or the game's camera looks, and the fog turns the land to haze
// with the distance. It's built once on dice of its own (`apart`), at fixed places, so it looks the same every visit
// and never moves the game's luck or the rest of the scenery's dice. Few draw calls: each part is one merged mesh
// (vertex colours where it has several), with no shadows, and nothing moves but the sky and the clouds keeping round
// the camera, the clouds' fade at night and the icebergs' size with the seasons.
import {
  BackSide, BufferGeometry, Color, ConeGeometry, DoubleSide, Euler, Float32BufferAttribute, Group, IcosahedronGeometry,
  InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, Quaternion, RepeatWrapping, SphereGeometry, Vector3,
} from 'three';
import { highBuilt, isPotato, onQuality } from './graphics';
import { apart, dice, seasonLayer, shade } from './kit';
import { BAY } from './layout';
import { C } from './palette';
import { canvasTex, scene, sky } from './render';
import { amount, FLOE_SIZE, onBlend, PAL, seasonal, type Swatch } from './season';
import { village } from './village';

/** Where the hills ring is centred, and the angles (degrees, atan2(z, x) from it: 0 east, 90 south, 180 west) the land
 *  side spans, from the north-east coast round to the west shore, where the ring runs down into the sea. */
const MID = { x: 0, z: 8 }, FROM = -92, TO = 202;
/** The roads (world.ts ROAD1_X, ROAD2_X) run north and south between the hills: the land dips to nothing round them. */
const ROADS_X = 12, ROAD_GAP = 5;
/** Where each gull wheels: the middle of its circle, how wide it is and how high, how fast it goes round (a turn in
 *  so many seconds, the sign which way) and where in the turn it starts. */
const GULLS = [
  { x: -10, z: -25, r: 7, y: 9.5, turn: 19, at: 0 }, { x: -25, z: -35, r: 9, y: 11.5, turn: -24, at: 2.1 },
  { x: 1, z: -37, r: 6, y: 8.5, turn: 16, at: 4.0 }, { x: -41, z: -23, r: 8, y: 10.5, turn: -21, at: 5.2 },
];
/** The sailboats are out in summer only. */
const SUMMER: Swatch = [0, 0, 1, 0];
/** How high over the world the sky's dome and the clouds are kept (they're drawn round the camera). */
const PARKED = 400;

/** Each part in a group of its own, so each can be shown or hidden. (The road behind the hills is in the mountains'
 *  mesh.) */
export const backdrop = apart(() => ({
  sky: new Group(), hills: new Group(), pines: new Group(), peaks: new Group(), town: new Group(), bergs: new Group(), boats: new Group(),
  clouds: new Group(), gulls: new Group(),
}), dice(0xBAC4C));

const smooth = (a: number, b: number, x: number) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const rad = (deg: number) => deg * Math.PI / 180;
/** Some waves summed: a smooth line that rises and falls round the ring, the same every time. */
const waves = (a: number, list: [amp: number, freq: number, phase: number][]) =>
  list.reduce((s, [amp, f, ph]) => s + amp * Math.sin(rad(a) * f + ph), 0);
/** How much of the land's height is left along the angle `a`: none at the ring's ends, where it runs down into the sea. */
const ends = (a: number) => smooth(FROM, FROM + 14, a) * smooth(TO, TO - 14, a);
/** And at `x` along it: none where a road runs through the hills, north and south, nor out in the bay at the hills'
 *  north-east end (the coast there runs straight north, world.ts: the hills stop at it). */
const stands = (a: number, x: number) =>
  ends(a) * smooth(ROAD_GAP, ROAD_GAP + 9, Math.abs(x - ROADS_X)) * (a < -60 ? smooth(BAY.x1 - 0.5, BAY.x1 + 3.5, x) : 1);

/** Triangles with flat facets (the islands' low-poly look), from a list of corners and, optionally, a colour each. */
function facets(pos: number[], col?: number[]) {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  if (col) g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

// ---------- the hills ----------
/** Where the hills' foot is (how far out from MID), how deep they are from there to their far side, and how many
 *  steps round and across they're made of. */
const footR = (a: number) => 50 + waves(a, [[3.5, 3, 1.1], [2, 7, 0.4]]), HILL_DEPTH = 31, ROUND = 150, ACROSS = 7;
/** How high the main ridge is: gentle hills, rising higher in the west, behind the rice terraces climbing that way. */
const ridgeH = (a: number) => (6.2 + waves(a, [[2.2, 5, 0.3], [1.6, 11, 2.0], [1.0, 17, 4.1]])) * (1 + 0.7 * smooth(120, 180, a));
/** How far across (0 the foot, 1 the far side) the ridge's crest lies: it wanders. */
const crestAt = (a: number) => 0.5 + 0.09 * Math.sin(rad(a) * 5 + 0.8);
const bump = (x: number) => Math.exp(-x * x);
/**
 * The hills' height `t` of the way across them (0 to 1) along the angle `a`: foothills low in front, in lumps; the main
 * ridge behind them; a second, lower fold behind that; down to the ground at the foot and the far side.
 */
function hillY(a: number, t: number) {
  const front = Math.max(0, 1.5 + waves(a, [[1.5, 19, 0.6], [1.1, 31, 2.9]])) * bump((t - 0.17) / 0.1);
  const main = ridgeH(a) * bump((t - crestAt(a)) / 0.27);
  const back = 0.55 * ridgeH(a + 9) * bump((t - 0.86) / 0.1);
  return (front + main + back) * smooth(0, 0.07, t) * smooth(1, 0.93, t);
}
/** A place on the hills: where it is, and how high the ground is there. */
function onHills(a: number, t: number): [number, number, number] {
  const r = footR(a) + t * HILL_DEPTH, x = MID.x + Math.cos(rad(a)) * r;
  return [x, hillY(a, t) * stands(a, x) - 0.05, MID.z + Math.sin(rad(a)) * r];
}

/**
 * A ridge of far mountains round MID from FROM to TO, into `pos` and `col`: in cross-section a foot `depth` in front of
 * its crest, two shoulders, the crest at `r(a)` and `h(a)` high, and a back slope; `seg` steps along, each corner
 * pushed about a little so no two facets match. `tint` colours a facet by how high it is (its snow).
 */
function ridge(pos: number[], col: number[], seg: number, r: (a: number) => number, h: (a: number) => number, depth: number, tint: (k: number, n: number) => Color) {
  const rows = (a: number, i: number) => {
    const R = r(a), cos = Math.cos(rad(a)), sin = Math.sin(rad(a)), H = h(a) * ends(a);
    // (foot, lower and upper shoulder, crest, back), each [distance out, height], the shoulders in and out by turns
    const w = (n: number) => Math.sin(i * 1.7 + n * 2.3);
    return [[R - depth, -0.05], [R - depth * (0.62 + 0.08 * w(1)), H * (0.34 + 0.1 * w(2))], [R - depth * (0.28 + 0.07 * w(3)), H * (0.7 + 0.08 * w(4))], [R, H],
      [R + depth * 0.6, H * 0.35], [R + depth * 1.1, -0.05]].map(([d, y]) => [MID.x + cos * d, y, MID.z + sin * d] as const);
  };
  let prev = rows(FROM, 0);
  for (let i = 1; i <= seg; i++) {
    const a = FROM + (TO - FROM) * i / seg, cur = rows(a, i);
    for (let j = 0; j < prev.length - 1; j++) {
      const p0 = prev[j], p1 = prev[j + 1], c0 = cur[j], c1 = cur[j + 1], top = Math.max(prev[3][1], cur[3][1], 6);
      // (wound to face up and out towards MID; the diagonal the other way every other square)
      const tris = (i + j) % 2 ? [[p0, c0, p1], [p1, c0, c1]] : [[p0, c0, c1], [p0, c1, p1]];
      for (const t of tris) {
        const c = tint((t[0][1] + t[1][1] + t[2][1]) / 3 / top, pos.length);
        for (const v of t) { pos.push(...v); col.push(c.r, c.g, c.b); }
      }
    }
    prev = cur;
  }
}

// ---------- the roads, carried on ----------
// Both roads (world.ts) stop 65 m out, north and south, in the dips between the hills. From there each carries on,
// bends east and joins one road that runs behind the hills, in the valley between them and the mountains, from the
// north dip round to the south one: so the road out one way is the road back the other, and it ends nowhere. Flat, like
// the roads on Low: asphalt, a kerb's pale strip and a white line along each edge, dashes down the middle.
/** How far out from MID the road behind the hills runs: just past their far side, short of the mountains' foot. */
const ringR = (a: number) => footR(a) + HILL_DEPTH + 2.3;
const ringAt = (a: number): [number, number] => [MID.x + Math.cos(rad(a)) * ringR(a), MID.z + Math.sin(rad(a)) * ringR(a)];
/** Where a road's own end joins the road behind the hills (degrees either side of east), how far out the roads stop,
 *  how tight they bend, and how wide they are either side of the middle (world.ts ROAD_HALF). */
const JOIN = 62, ROAD_END = 65, BEND = 6, ROAD_HALF = 1.3;
/** How far round a road's end bends (degrees) before it's on the road behind the hills: a little past a quarter turn,
 *  as that road runs slightly back towards the market there. */
const SWEEP = 98;
/** A line through `pts`, its corners cut round `rounds` times (its two ends stay where they are). */
function rounded(pts: [number, number][], rounds: number) {
  for (let n = 0; n < rounds; n++) {
    const out: [number, number][] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      out.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}
/** `pts` again as points `step` apart along the same line (its two ends stay where they are). */
function evenly(pts: [number, number][], step: number) {
  const out: [number, number][] = [pts[0]];
  let need = step;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az);
    let at = need;
    for (; at <= len; at += step) out.push([ax + (bx - ax) * at / len, az + (bz - az) * at / len]);
    need = at - len;
  }
  const [lx, lz] = out[out.length - 1], [ex, ez] = pts[pts.length - 1];
  // (the last stretch may come out short: the end itself takes the place of a point that falls just before it)
  if (Math.hypot(ex - lx, ez - lz) < step * 0.4 && out.length > 1) out.pop();
  out.push([ex, ez]);
  return out;
}
/** A dash's length: a third of the 2.2 m from one of the roads' dashes to the next, so every third stretch is a dash. */
const DASH = 2.2 / 3;
/**
 * Paints a road along `line` (its points a dash apart, `evenly`) into `pos` and `col`, `dx` off in x (for a mesh that
 * hangs on a road's own group). `startDir` and `endDir`: which way the road runs at its two ends, where it meets
 * another piece, so the two pieces' ends are cut along the same line.
 */
function pave(pos: number[], col: number[], line: [number, number][], dx = 0, startDir?: [number, number], endDir?: [number, number]) {
  const tar = new Color(0x6B7785), kerb = new Color(0xB4BEC8), white = new Color(0xE8EEF2), last = line.length - 1;
  // each point's left-hand side, across the road
  const side = line.map((_, i) => {
    const [ax, az] = line[Math.max(0, i - 1)], [bx, bz] = line[Math.min(last, i + 1)];
    let tx = bx - ax, tz = bz - az;
    if (i === 0 && startDir) [tx, tz] = startDir;
    if (i === last && endDir) [tx, tz] = endDir;
    const l = Math.hypot(tx, tz) || 1;
    return [tz / l, -tx / l];
  });
  /** A strip from `a` to `b` across the road (metres from its middle), `y` up, between points `i` and `j`. */
  const strip = (i: number, j: number, a: number, b: number, y: number, c: Color) => {
    const at = (k: number, o: number) => [line[k][0] + side[k][0] * o - dx, y, line[k][1] + side[k][1] * o];
    const p0 = at(i, a), p1 = at(i, b), p2 = at(j, a), p3 = at(j, b);
    // (each triangle wound to face up, whichever way the line runs or bends)
    for (const [u, v, w] of [[p0, p2, p1], [p1, p2, p3]]) {
      const up = (v[2] - u[2]) * (w[0] - u[0]) - (v[0] - u[0]) * (w[2] - u[2]) > 0;
      for (const q of up ? [u, v, w] : [u, w, v]) { pos.push(...q); col.push(c.r, c.g, c.b); }
    }
  };
  for (let i = 0; i < last; i++) {
    strip(i, i + 1, -ROAD_HALF, ROAD_HALF, 0, tar);
    for (const sd of [-1, 1]) {
      strip(i, i + 1, sd * (ROAD_HALF - 0.14), sd * ROAD_HALF, 0.006, kerb);
      strip(i, i + 1, sd * (ROAD_HALF - 0.29), sd * (ROAD_HALF - 0.23), 0.006, white);
    }
    if (i % 3 === 1) strip(i, i + 1, -0.06, 0.06, 0.01, white);
  }
}
/** Which way the road behind the hills runs at the angle `a`, towards greater angles. */
function ringDir(a: number): [number, number] {
  const [ax, az] = ringAt(a - 0.2), [bx, bz] = ringAt(a + 0.2);
  return [bx - ax, bz - az];
}
/** The line a road at `x` carries on along from its end, north (`s` -1) or south (1): straight on to where the road
 *  behind the hills is, round a bend to the east onto it, and along it to where the two roads' ends join it. */
function roadOnLine(x: number, s: -1 | 1) {
  const end = (zc: number, t: number): [number, number] => [x + BEND * (1 - Math.cos(t)), s * (zc + BEND * Math.sin(t))];
  // how far straight on before the bend, so the bend comes out on the road behind the hills
  let zc = ROAD_END, best = Infinity;
  for (let z = ROAD_END; z < ROAD_END + 40; z += 0.1) {
    const [ex, ez] = end(z, rad(SWEEP)), off = Math.abs(Math.hypot(ex - MID.x, ez - MID.z) - ringR(Math.atan2(ez - MID.z, ex - MID.x) * 180 / Math.PI));
    if (off < best) { best = off; zc = z; }
  }
  const pts: [number, number][] = [];
  for (let z = ROAD_END; z < zc; z += 2) pts.push([x, s * z]);
  for (let n = 0; n <= 6; n++) pts.push(end(zc, rad(SWEEP * n / 6)));
  const [lx, lz] = pts[pts.length - 1], from = Math.abs(Math.atan2(lz - MID.z, lx - MID.x) * 180 / Math.PI) - 4;
  for (let a = from; a > JOIN; a -= 3) pts.push(ringAt(s * a));
  pts.push(ringAt(s * JOIN));
  return evenly(rounded(pts, 3), DASH);
}
/**
 * The wear on a road's own length (between its two ends, about its middle at x 0), into `pos` and `col`: patches where
 * it's been mended, darker or paler than the rest, and cracks across a lane, at fixed places, off the crossing to her
 * house (layout.ts HOUSE_PATH_Z), clear of the dashes down the middle and the lines along the edges.
 */
function wear(pos: number[], col: number[], roll: () => number) {
  const tar = 0x6B7785, y = 0.0075, c = new Color();
  const quad = (x0: number, z0: number, x1: number, z1: number, x2: number, z2: number, x3: number, z3: number, colour: number) => {
    c.setHex(colour);
    // (corners round the patch; wound to face up)
    for (const [px, pz] of [[x0, z0], [x3, z3], [x1, z1], [x1, z1], [x3, z3], [x2, z2]]) { pos.push(px, y, pz); col.push(c.r, c.g, c.b); }
  };
  for (let z = -ROAD_END + 6; z < ROAD_END - 6; z += 9 + roll() * 7) {
    const lane = roll() < 0.5 ? -1 : 1, kind = roll(), from = z + roll() * 3;
    if (from > 2.5 && from < 10.5) continue;
    if (kind < 0.55) {
      // a mended patch: a rectangle in one lane, not quite square to the road
      const x0 = lane * (0.2 + roll() * 0.15), x1 = lane * (0.78 + roll() * 0.17), len = 1.2 + roll() * 1.8, skew = (roll() - 0.5) * 0.25;
      quad(x0, from, x1, from + skew, x1, from + len + skew, x0, from + len, shade(tar, roll() < 0.6 ? 0.83 : 1.1));
    } else {
      // a crack: a thin dark line wandering across the lane
      let px = lane * 0.16, pz = from;
      for (let k = 0; k < 4; k++) {
        const nx = lane * (0.16 + (k + 1) * 0.2), nz = pz + (roll() - 0.5) * 0.7;
        quad(px, pz - 0.018, nx, nz - 0.018, nx, nz + 0.018, px, pz + 0.018, shade(tar, 0.6));
        px = nx; pz = nz;
      }
    }
  }
}
/**
 * What a road at `x` carries on as past its two ends, to hang on the road's own group (world.ts `road`: it's shown,
 * hidden and popped in with its road), with the wear on the road's own length: one mesh, on dice of its own.
 */
export function roadOn(x: number) {
  return apart(() => {
    const pos: number[] = [], col: number[] = [];
    for (const s of [-1, 1] as const) {
      // (it leaves its road heading straight on, and meets the road behind the hills running the way that does there:
      // the north one towards greater angles, the south one towards lesser)
      const [dx, dz] = ringDir(s * JOIN);
      pave(pos, col, roadOnLine(x, s), x, [0, s], [-s * dx, -s * dz]);
    }
    wear(pos, col, dice(0x3EA20 + Math.round(x * 100)));
    // (a hair nearer the eye than it lies, so the wear shows on the road's own surface, a few millimetres under it)
    const mesh = new Mesh(facets(pos, col), new MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    mesh.name = 'roadOn';
    mesh.raycast = () => {};
    return mesh;
  }, dice(0x40AD0 + Math.round(x * 100)));
}

apart(() => {
  const m = new Matrix4(), q = new Quaternion(), up = new Vector3(0, 1, 0), p = new Vector3(), s = new Vector3(), tmp = new Color();

  // ---------- the sky ----------
  // a dome round the camera, drawn first and behind everything: the game's own sky colour at the horizon (where the
  // fog meets it) and a deeper, bluer shade of it overhead, whatever the season, the hour or the weather
  {
    const R = 150, geo = new SphereGeometry(R, 24, 9, 0, Math.PI * 2, 0, Math.PI * 0.58), at = geo.attributes.position, col: number[] = [];
    const zenith = new Color(0.66, 0.83, 1), white = new Color(1, 1, 1);
    for (let i = 0; i < at.count; i++) {
      tmp.copy(white).lerp(zenith, smooth(0.03, 0.8, at.getY(i) / R));
      col.push(tmp.r, tmp.g, tmp.b);
    }
    geo.setAttribute('color', new Float32BufferAttribute(col, 3));
    const mat = new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthTest: false, depthWrite: false });
    const dome = new Mesh(geo, mat);
    dome.renderOrder = -1000;
    dome.frustumCulled = false;
    // (it's drawn round the camera, wherever that is; where it's kept is high over the world, so that down in the cellar
    // it's hidden with the rest of the world above, levelCull.ts)
    dome.position.y = PARKED;
    dome.onBeforeRender = (_r, sc, cam) => {
      if (sc.background instanceof Color) mat.color.copy(sc.background);
      dome.matrixWorld.makeTranslation(cam.position.x, cam.position.y, cam.position.z);
    };
    backdrop.sky.add(dome);
  }

  // ---------- the hills ----------
  // the ground's own colour (snow, grass), so their foot runs into it with no line, shaded lighter and darker in patches
  {
    const pos: number[] = [], col: number[] = [];
    const corner = (i: number, j: number) => {
      // (pushed about a little off the grid, but for the foot and the far side)
      const inner = j > 0 && j < ACROSS ? 1 : 0;
      const a = FROM + (TO - FROM) * i / ROUND + inner * 0.55 * Math.sin(j * 1.9 + i * 0.83), t = j / ACROSS + inner * 0.03 * Math.sin(i * 1.3 + j);
      const shade = j === 0 ? 0.94 : 0.86 + 0.07 * (1 + Math.sin(i * 0.9 + j * 2.3));
      return { at: onHills(a, t), shade };
    };
    for (let i = 0; i < ROUND; i++) {
      for (let j = 0; j < ACROSS; j++) {
        const a = corner(i, j), b = corner(i + 1, j), c = corner(i, j + 1), d = corner(i + 1, j + 1);
        for (const v of (i + j) % 2 ? [a, b, c, c, b, d] : [a, b, d, a, d, c]) { pos.push(...v.at); col.push(v.shade, v.shade, v.shade); }
      }
    }
    const mat = seasonal(PAL.ground);
    mat.vertexColors = true;
    backdrop.hills.add(new Mesh(facets(pos, col), mat));
  }

  // ---------- pines ----------
  // two tiers each, like the trees nearer in (world.ts), in their two shades, turning with them in autumn; on the hills
  // in groves, with open slopes between
  const roll = dice(0xB1C4D);
  const tiers = [0, 1].map(() => new ConeGeometry(1, 1, 5, 1, true).toNonIndexed());
  const parts: BufferGeometry[][] = [[], []];
  /** A pine at (x, y, z), `size` its scale; `turn` (0 to 1) which way it's turned, `shadeOf` which shade leads. */
  const pine = (x: number, y: number, z: number, size: number, turn: number, shadeOf: number) => {
    // (none on a load that starts on Potato, which leaves the far pines out: below)
    if (!highBuilt) return;
    for (let t = 0; t < 2; t++) {
      q.setFromAxisAngle(up, turn * 6 + t);
      m.compose(p.set(x, y + size * (0.75 + t * 0.8), z), q, s.set(size * (0.95 - t * 0.3), size * 1.5, size * (0.95 - t * 0.3)));
      parts[(shadeOf + t) % 2].push(tiers[t].clone().applyMatrix4(m));
    }
  };
  /** How thick the pines stand along the angle `a`: groves a few dozen metres across, thin between them. */
  const grove = (a: number) => 0.07 + 0.93 * smooth(0.4, 0.62, 0.5 + 0.35 * Math.sin(rad(a) * 9 + 0.7) + 0.2 * Math.sin(rad(a) * 23 + 2.1));
  for (let a = FROM + 8, n = 0; a < TO - 8; a += 0.16, n++) {
    if (roll() > grove(a) * 0.8) continue;
    // somewhere up the slopes, more of them low down; none where the land's flat (the roads' dips, the foot)
    const t = 0.1 + Math.pow(roll(), 1.3) * 0.82, aa = a + (roll() - 0.5) * 0.6, [x, y, z] = onHills(aa, t), size = 0.5 + roll() * roll() * 0.9;
    if (y < 0.5) continue;
    pine(x, y - 0.1, z, size, roll(), n);
    // (and often a smaller one beside it)
    if (n % 3 === 0) { const [x2, y2, z2] = onHills(aa + 0.5, t + 0.03); if (y2 > 0.5) pine(x2, y2 - 0.1, z2, size * 0.7, (n * 0.37) % 1, n + 1); }
  }

  // ---------- the village, east past her house (village.ts) ----------
  let nth = 0;
  backdrop.town.add(village((x, z, size) => pine(x, 0, z, size, (nth * 0.37) % 1, nth++)));
  // (the pines' own seasonal colours, as world.ts' trees: their needles turn red and orange in autumn)
  [PAL.pine, PAL.pine2].forEach((c, i) => { if (parts[i].length) backdrop.pines.add(new Mesh(merge(parts[i]), seasonal(c))); });

  // ---------- far mountains ----------
  // two rows, the far one taller and paler with the distance, snow on their tops down to a ragged line; the road
  // behind the hills is painted into the same mesh (one draw for both)
  {
    const pos: number[] = [], col: number[] = [];
    const snow = new Color(C.ice), near = new Color(C.steel), far = new Color(C.steel).lerp(snow, 0.45);
    const tintOf = (rock: Color) => (k: number, n: number) => tmp.copy(rock).lerp(snow, smooth(0.58, 0.74, k + 0.07 * Math.sin(n * 0.011)));
    ridge(pos, col, 150, a => 127 + waves(a, [[5, 3, 0.4]]), a => 30 + waves(a, [[8, 4, 2.6], [5, 9, 0.2], [3, 21, 4.0], [2, 37, 1.1]]), 24, tintOf(far));
    // (the near row stands back from the hills by the width of the valley the road runs in)
    ridge(pos, col, 170, a => footR(a) + HILL_DEPTH + 4.8 + 20, a => 18 + waves(a, [[6, 6, 0.9], [3.5, 13, 3.3], [2.5, 27, 1.7], [1.5, 43, 0.3]]), 20, tintOf(near));
    // the road behind the hills, from where the roads' north ends join it round to where their south ends do
    const ring: [number, number][] = [];
    for (let a = -JOIN; a < JOIN; a += 0.5) ring.push(ringAt(a));
    ring.push(ringAt(JOIN));
    pave(pos, col, evenly(ring, DASH), 0, ringDir(-JOIN), ringDir(JOIN));
    backdrop.peaks.add(new Mesh(facets(pos, col), new MeshLambertMaterial({ vertexColors: true })));
  }

  // ---------- far sailboats ----------
  // out on the bay in summer only (when the icebergs have melted): a mesh of their own, there for the season
  {
    const pos: number[] = [], col: number[] = [];
    const tri = (a: number[], b: number[], c: number[], cc: Color) => { pos.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) col.push(cc.r, cc.g, cc.b); };
    const paper = new Color(C.paper), wood = new Color(C.timber);
    /** A sailboat at (x, z), its bow turned `turn`, `k` its size, `hc` its hull's colour; `gaff` a second, smaller mast. */
    const boat = (x: number, z: number, turn: number, k: number, hc: Color, gaff = false) => {
      const cs = Math.cos(turn), sn = Math.sin(turn);
      const P = (u: number, y: number, w: number) => [x + (u * cs - w * sn) * k, y * k, z + (u * sn + w * cs) * k];
      // a hull drawn in to its bow (+u), a strake in white along it
      const L = 1.7, W = 0.55, hull = [[-L, -W], [0.5, -W], [L, 0], [0.5, W], [-L, W]];
      for (let i = 0; i < hull.length; i++) {
        const [u0, w0] = hull[i], [u1, w1] = hull[(i + 1) % hull.length];
        tri(P(u0, 0.45, w0), P(u0 * 0.9, 0, w0 * 0.6), P(u1, 0.45, w1), hc);
        tri(P(u1, 0.45, w1), P(u0 * 0.9, 0, w0 * 0.6), P(u1 * 0.9, 0, w1 * 0.6), hc);
        tri(P(0, 0.45, 0), P(u0, 0.45, w0), P(u1, 0.45, w1), wood);
      }
      // the mainsail and the jib, both sides
      const sails = (at: number, h: number, back: number, fore: number) => {
        for (const side of [1, -1]) {
          tri(P(at - 0.05, 0.6, 0), side > 0 ? P(at - back, 0.7, 0) : P(at - 0.05, h, 0), side > 0 ? P(at - 0.05, h, 0) : P(at - back, 0.7, 0), paper);
          tri(P(at + 0.08, 0.6, 0), side > 0 ? P(at + 0.08, h * 0.86, 0) : P(at + fore, 0.6, 0), side > 0 ? P(at + fore, 0.6, 0) : P(at + 0.08, h * 0.86, 0), paper);
        }
      };
      sails(0.1, 3.3, 1.35, 1.4);
      if (gaff) sails(-1.0, 2.3, 0.7, 0.01);
    };
    // (clear of the casino yacht's way in from the north-west, casino.ts, and of the islands and the icebergs)
    const hulls = [new Color(C.navy), new Color(C.red), new Color(C.paper), new Color(C.slate)];
    boat(-27, -44, 0.4, 1.0, hulls[0]); boat(-62, -24, 2.6, 1.15, hulls[1], true); boat(-6, -58, -0.3, 1.0, hulls[2]);
    boat(-46, -56, 3.4, 0.9, hulls[3]); boat(-80, -44, 0.9, 1.2, hulls[0], true); boat(-12, -34, 2.2, 0.7, hulls[1]);
    backdrop.boats.add(seasonLayer(new Mesh(facets(pos, col), new MeshLambertMaterial({ vertexColors: true })), SUMMER));
  }

  // ---------- icebergs ----------
  // out past the boats' way in, between the islands: one jagged berg, turned and sized differently at each place, a
  // few with smaller pieces broken off beside them, melting with the floes
  {
    const roll3 = dice(0x1CEB6);
    const g = new IcosahedronGeometry(1, 0);
    const pp = g.attributes.position;
    // (each corner is in several faces: pulled the same way in all of them, so the facets still meet)
    const pulls = new Map<string, number[]>();
    for (let i = 0; i < pp.count; i++) {
      const key = `${pp.getX(i).toFixed(3)},${pp.getY(i).toFixed(3)},${pp.getZ(i).toFixed(3)}`;
      let f = pulls.get(key);
      if (!f) pulls.set(key, f = [1 + roll3() * 0.35, 0.8 + roll3() * 0.5, 1 + roll3() * 0.35]);
      pp.setXYZ(i, pp.getX(i) * f[0], Math.max(-0.3, pp.getY(i)) * f[1], pp.getZ(i) * f[2]);
    }
    g.computeVertexNormals();
    const big = [[-21, -47, 2.6], [-17, -53, 1.6], [-49, -36, 2.2], [-55, -42, 3.0], [-8, -50, 1.4], [-38, -50, 1.9], [-70, -30, 2.4]];
    const spots = big.flatMap(([x, z, sz], i) => [
      { x, z, sz, turn: i * 2.3 + roll3() },
      ...(i % 2 ? [] : [{ x: x + sz * 2.4, z: z + sz * 0.9, sz: sz * 0.34, turn: i + 1.1 }, { x: x - sz * 1.6, z: z + sz * 1.9, sz: sz * 0.22, turn: i + 4.2 }]),
    ]);
    const bergs = new InstancedMesh(g, new MeshLambertMaterial({ color: C.ice, flatShading: true }), spots.length);
    bergs.userData.spots = spots;
    backdrop.bergs.add(bergs);
  }

  // ---------- clouds ----------
  // low in the sky all round, keeping round the camera like the sky itself (they're far off: they don't slide by as it
  // moves): flat underneath, heaped on top, big banks and small wisps at different heights; they keep their own white
  // (a little of the sky's in it), and fade out as night falls
  if (highBuilt) {
    const roll4 = dice(0xC10D5);
    const list: BufferGeometry[] = [];
    const puff = (x: number, y: number, z: number, w: number, h: number, d: number, yaw: number) => {
      const g = new IcosahedronGeometry(1, 1), at = g.attributes.position;
      // (flat underneath)
      for (let i = 0; i < at.count; i++) if (at.getY(i) < -0.3) at.setY(i, -0.3);
      list.push(g.applyMatrix4(m.compose(p.set(x, y, z), q.setFromAxisAngle(up, yaw), s.set(w, h, d))));
    };
    for (let i = 0; i < 11; i++) {
      const a = rad(i * 360 / 11 + roll4() * 16), R = 128 + roll4() * 24, cx = Math.cos(a) * R, cz = Math.sin(a) * R;
      // every third a big bank, lower; the rest small, some higher up
      const bank = i % 3 === 0, y = bank ? 11 + roll4() * 4 : 15 + roll4() * 16, size = bank ? 9 + roll4() * 3 : 4 + roll4() * 3, n = bank ? 4 : 2;
      for (let j = 0; j < n; j++) {
        const along = (j - (n - 1) / 2) * size * 1.25, k = 1 - Math.abs(j - (n - 1) / 2) / n * 0.9;
        // along the bank, across the line of sight
        puff(cx - Math.sin(a) * along, y + size * 0.3 * k, cz + Math.cos(a) * along, size * 1.5 * k, size * 0.62 * k, size * k, -a);
      }
    }
    const cloudMat = new MeshLambertMaterial({ color: 0xFFFFFF, emissive: 0xFFFFFF, emissiveIntensity: 0.5, fog: false, transparent: true, opacity: 0.9, depthWrite: false });
    const clouds = new Mesh(merge(list), cloudMat);
    clouds.frustumCulled = false;
    clouds.position.y = PARKED;
    clouds.onBeforeRender = (_r, _s, cam) => { clouds.matrixWorld.makeTranslation(cam.position.x, cam.position.y, cam.position.z); };
    backdrop.clouds.add(clouds);
  }

  // ---------- gulls ----------
  // four of them wheeling over the bay, high over anything that sails on it: one shape drawn four times, its wings
  // raised and lowered by how tall it's drawn (updBackdrop)
  {
    const span = 0.6, lift = 0.2;
    // two wings up from the body to their tips, swept back a little, and a stub of a tail
    const wings = [[0, 0, 0.18], [0, 0, -0.14], [span, lift, -0.02], [0, 0, 0.18], [-span, lift, -0.02], [0, 0, -0.14], [0, 0, -0.14], [0.06, 0, -0.34], [-0.06, 0, -0.34]];
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(wings.flat(), 3));
    geo.computeVertexNormals();
    const gulls = new InstancedMesh(geo, new MeshBasicMaterial({ color: C.paper, side: DoubleSide }), GULLS.length);
    gulls.frustumCulled = false;
    backdrop.gulls.add(gulls);
  }

  // ---------- Potato ----------
  // the far pines, the clouds (and the beach's grass, beachEdge.ts) are left out on Potato: most of the backdrop's
  // triangles. Never built on a load that starts there (`highBuilt`), hidden on one that goes there
  const lean = () => { backdrop.pines.visible = backdrop.clouds.visible = !isPotato(); };
  lean();
  onQuality(lean);

  const all = new Group();
  all.name = 'backdrop';
  all.add(...Object.values(backdrop));
  // (and never in a ray's way: the wardrobe's camera looks for what's between it and the player, customize.ts)
  all.traverse(o => { if (o instanceof Mesh) { o.castShadow = false; o.receiveShadow = false; o.raycast = () => {}; o.matrixAutoUpdate = false; o.updateMatrix(); } });
  scene.add(all);
}, dice(0xBAC4D));

/** One geometry from many, positions and normals only, its facets flat. */
function merge(list: BufferGeometry[]) {
  const pos: number[] = [], nrm: number[] = [];
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    g.computeVertexNormals();
    pos.push(...(g.attributes.position.array as Float32Array));
    nrm.push(...(g.attributes.normal.array as Float32Array));
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new Float32BufferAttribute(nrm, 3));
  return out;
}

/** How far the open sea's ripples run before they repeat (metres). */
export const RIPPLE_TILE = 18;
/** Ripples for the open sea past the bay (horizon.ts' flat sheets): long faint streaks, darker than the water, on white
 *  (the sea's own colour does the rest), the same every visit. */
export const seaRipples = apart(() => {
  const roll = dice(0x51AEA);
  const t = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      const x = roll() * w, y = roll() * h, len = 26 + roll() * 60, thick = 1.2 + roll() * 2.2;
      c.fillStyle = `rgba(8,44,74,${0.07 + roll() * 0.1})`;
      // (drawn again across the edges it runs over, so the tile meets itself)
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { c.beginPath(); c.ellipse(x + dx, y + dy, len, thick, 0, 0, Math.PI * 2); c.fill(); }
    }
  });
  t.tex.wrapS = t.tex.wrapT = RepeatWrapping;
  return t.tex;
}, dice(0x51AEB));

/** Sizes the icebergs for the season: they melt away with the floes in spring and come back in autumn. */
function placeBergs() {
  const k = amount(FLOE_SIZE), bergs = backdrop.bergs.children[0] as InstancedMesh;
  (bergs.userData.spots as { x: number; z: number; sz: number; turn: number }[]).forEach(({ x, z, sz, turn }, i) => {
    q2.setFromAxisAngle(UP, turn);
    bergs.setMatrixAt(i, m2.compose(p2.set(x, 0, z), q2, s2.set(sz * 1.6 * k, sz * k, sz * 1.3 * k)));
  });
  bergs.instanceMatrix.needsUpdate = true;
  bergs.computeBoundingSphere();
  backdrop.bergs.visible = k > 0.01;
}
const m2 = new Matrix4(), q2 = new Quaternion(), p2 = new Vector3(), s2 = new Vector3(), UP = new Vector3(0, 1, 0);
placeBergs();
onBlend(placeBergs);

/** The clouds take on a little of the sky's colour (stage 2's dusk, the rain's grey), and fade out as night falls
 *  (horizon.ts nightSky, whenever the light changes). */
export function backdropNight(k: number) {
  backdrop.gulls.visible = k < 0.5;
  const clouds = backdrop.clouds.children[0] as Mesh | undefined;
  if (!clouds) return;
  const mat = clouds.material as MeshLambertMaterial;
  mat.color.setHex(C.snow).lerp(sky.bg, 0.3);
  mat.emissive.copy(mat.color);
  mat.opacity = 0.9 * (1 - k);
  clouds.visible = k < 0.99;
}

const e2 = new Euler();
/** The gulls on their rounds, `time` seconds in (horizon.ts updHorizon, every frame the world above is live): each
 *  banks into its turn, flaps for a few beats and glides for a few. */
export function updBackdrop(time: number) {
  const gulls = backdrop.gulls.children[0] as InstancedMesh;
  GULLS.forEach((g, i) => {
    const a = g.at + time * Math.PI * 2 / g.turn, way = Math.sign(g.turn);
    // flapping while this slow wave's up, gliding (wings a little raised) while it's down
    const flapping = Math.max(0, Math.sin(time * 0.6 + g.at * 2)), beat = Math.sin(time * 9 + g.at * 5);
    // (its nose along the way it's going, the wing on the inside of the turn down)
    q2.setFromEuler(e2.set(0, way > 0 ? -a : Math.PI - a, way * 0.35, 'YXZ'));
    gulls.setMatrixAt(i, m2.compose(
      p2.set(g.x + Math.cos(a) * g.r, g.y + Math.sin(time * 0.4 + g.at) * 0.6, g.z + Math.sin(a) * g.r), q2, s2.set(1, 0.6 + flapping * beat * 1.6, 1)));
  });
  gulls.instanceMatrix.needsUpdate = true;
}
