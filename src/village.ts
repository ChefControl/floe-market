// The village east past her house (backdrop.ts), for the wide shots: a dozen houses like hers, as her house is drawn on
// Low (rain.ts) with a little more on it, along a lane that runs north and south past the end of her path, and a
// white chapel facing down her path at the junction. Each house has a plinth, corner boards, a gable roof with eaves,
// a ridge and a chimney, a door under a little hood, lit windows in white frames and a white picket fence like hers along
// its front; snow on the roofs in winter. Her house's own colours (propsWorld.ts) and the palette's.
// Four meshes: the houses and their fences, their lit windows, the snow and the lane. Fixed places, the same every visit.
import {
  BoxGeometry, BufferGeometry, Color, DoubleSide, Euler, Float32BufferAttribute, Group, Matrix4, Mesh, MeshBasicMaterial,
  MeshLambertMaterial, Quaternion, Vector3,
} from 'three';
import { seasonLayer, shade } from './kit';
import { HOUSE_PATH_Z } from './layout';
import { C } from './palette';
import { DOOR, FASCIA, SHUTTER, TILE, TRIM, WALL } from './propsWorld';
import { PAL, seasonal, type Swatch } from './season';

/** The lane's line (x along it, by z), how far it runs, and where her path meets it. */
const LANE = { x: 43, z0: -14, z1: 26, w: 2.4 };
const laneX = (z: number) => LANE.x + 1.2 * Math.sin(z / 9);
/** Where her path (rain.ts) carries on as a lane to the village's, from behind her yard. */
const LINK = { x0: 25.2, z: HOUSE_PATH_Z, w: 1.6 };
const SNOWY: Swatch = [1, 0, 0, 0];

/** Coloured triangles, gathered into one mesh: boxes and gable ends, placed by a house's own matrix. */
class Paint {
  pos: number[] = []; col: number[] = [];
  private unit = new BoxGeometry(1, 1, 1).toNonIndexed();
  private m = new Matrix4(); private q = new Quaternion(); private e = new Euler(); private v = new Vector3(); private c = new Color();
  constructor(public at = new Matrix4()) {}
  /** A box `w` × `h` × `d` with its middle at (x, y, z) in the house's space, turned `rz` about its length. */
  box(w: number, h: number, d: number, colour: number, x: number, y: number, z: number, rz = 0) {
    this.m.compose(this.v.set(x, y, z), this.q.setFromEuler(this.e.set(0, 0, rz)), new Vector3(w, h, d)).premultiply(this.at);
    const p = this.unit.attributes.position;
    this.c.setHex(colour);
    for (let i = 0; i < p.count; i++) {
      this.v.fromBufferAttribute(p, i).applyMatrix4(this.m);
      this.pos.push(this.v.x, this.v.y, this.v.z); this.col.push(this.c.r, this.c.g, this.c.b);
    }
  }
  /** One triangle, its corners in the house's space. */
  tri(colour: number, ...corners: [number, number, number][]) {
    this.c.setHex(colour);
    for (const [x, y, z] of corners) {
      this.v.set(x, y, z).applyMatrix4(this.at);
      this.pos.push(this.v.x, this.v.y, this.v.z); this.col.push(this.c.r, this.c.g, this.c.b);
    }
  }
  geometry() {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new Float32BufferAttribute(this.col, 3));
    g.computeVertexNormals();
    return g;
  }
}

interface Look { wall: number; roof: number; door: number }
const LOOKS: Look[] = [
  { wall: WALL, roof: TILE, door: DOOR }, { wall: C.paper, roof: C.slate, door: C.navy }, { wall: C.sand, roof: TILE, door: C.timber },
  { wall: C.enamel, roof: FASCIA, door: DOOR }, { wall: TRIM, roof: C.navy, door: C.timber }, { wall: C.paper, roof: TILE, door: C.slate },
];

/**
 * A house like hers, `w` across its front (which faces -x in its own space), `d` along it and its walls `h` tall, put
 * in place by `at`, into the houses, the lit windows, the snow and the fences.
 */
function house(at: Matrix4, w: number, d: number, h: number, look: Look, into: { body: Paint; glow: Paint; snow: Paint; fence: Paint }) {
  const { body, glow, snow, fence } = into;
  for (const p of [body, glow, snow, fence]) p.at = at;
  const x0 = -w / 2;
  body.box(w, h, d, look.wall, 0, h / 2, 0);
  body.box(w + 0.08, 0.22, d + 0.08, shade(look.wall, 0.78), 0, 0.11, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) body.box(0.1, h - 0.2, 0.1, TRIM, sx * w / 2, h / 2 + 0.1, sz * d / 2);
  // the roof: gable ends in the walls' colour, the eaves' fascia, two slopes overhanging, a ridge
  const span = w / 2 + 0.35, rise = 0.42 * w + 0.2, a = Math.atan2(rise, span), slope = Math.hypot(span, rise), deep = d + 0.5;
  const peak = rise * (w / 2) / span;
  for (const s of [-1, 1]) body.tri(look.wall, [-w / 2, h, s * d / 2], [s > 0 ? w / 2 : 0, s > 0 ? h : h + peak, s * d / 2], [s > 0 ? 0 : w / 2, s > 0 ? h + peak : h, s * d / 2]);
  body.box(w + 0.75, 0.12, d + 0.55, FASCIA, 0, h + 0.02, 0);
  for (const s of [-1, 1]) {
    const nx = s * Math.sin(a), ny = Math.cos(a), mx = s * span / 2, my = h + rise / 2;
    body.box(slope + 0.14, 0.12, deep + 0.1, look.roof, mx + nx * 0.06, my + ny * 0.06, 0, -s * a);
    // the tiles' rows, as lines across the slope
    for (let r = 1; r < 5; r++) {
      const along = -slope / 2 + r * slope / 5;
      body.box(0.05, 0.03, deep + 0.1, shade(look.roof, 0.82), mx + s * Math.cos(a) * along + nx * 0.13, my - Math.sin(a) * along + ny * 0.13, 0, -s * a);
    }
    snow.box(slope - 0.1, 0.08, deep - 0.05, C.snow, mx + nx * 0.17, my + ny * 0.17, 0, -s * a);
  }
  body.box(0.16, 0.16, deep + 0.16, shade(look.roof, 0.75), 0, h + rise + 0.1, 0);
  // the chimney: brick, its cap
  const cx = w * 0.18, cz = -d * 0.25;
  body.box(0.48, 1.5, 0.48, SHUTTER, cx, h + rise * (1 - cx / span) + 0.2, cz);
  body.box(0.62, 0.08, 0.62, shade(SHUTTER, 0.68), cx, h + rise * (1 - cx / span) + 0.98, cz);
  snow.box(0.58, 0.05, 0.58, C.snow, cx, h + rise * (1 - cx / span) + 1.04, cz);
  // the door, its frame and hood, and the step
  body.box(0.08, 1.75, 0.95, look.door, x0 - 0.03, 0.88, 0);
  for (const s of [-1, 1]) body.box(0.09, 1.86, 0.09, TRIM, x0 - 0.04, 0.93, s * 0.52);
  body.box(0.22, 0.06, 1.25, FASCIA, x0 - 0.09, 1.94, 0);
  body.box(0.34, 0.12, 1.2, 0xB4ADA6, x0 - 0.17, 0.06, 0);
  // the windows: either side of the door, and one in each gable end, lit, in white frames with a glazing bar
  const pane = (x: number, z: number, across: boolean) => {
    const [fx, fz] = across ? [1.05, 0.06] : [0.06, 1.05], [gx, gz] = across ? [0.9, 0.07] : [0.07, 0.9];
    body.box(fx, 0.95, fz, TRIM, x, 1.35, z);
    glow.box(gx, 0.8, gz, 0xFFD98A, across ? x : x - 0.01, 1.35, across ? z + Math.sign(z) * 0.01 : z);
    body.box(across ? 0.05 : 0.08, 0.82, across ? 0.08 : 0.05, TRIM, across ? x : x - 0.02, 1.35, across ? z + Math.sign(z) * 0.02 : z);
  };
  for (const s of [-1, 1]) if (d > 3.2) pane(x0 - 0.03, s * (d / 2 - 0.9), false);
  for (const s of [-1, 1]) pane(0, s * (d / 2 + 0.03), true);
  // a white picket fence along the front garden, like her yard's, open at the gate
  const fx = x0 - 1.7;
  for (const sgn of [-1, 1]) {
    const z0 = sgn * 0.55, z1 = sgn * (d / 2 + 0.3), len = Math.abs(z1 - z0), mid = (z0 + z1) / 2;
    fence.box(0.05, 0.06, len, TRIM, fx, 0.42, mid);
    fence.box(0.05, 0.06, len, TRIM, fx, 0.2, mid);
    for (let k = 0; k <= Math.round(len / 0.35); k++) fence.box(0.08, 0.6, 0.08, TRIM, fx, 0.3, z0 + sgn * k * len / Math.round(len / 0.35));
  }
}

/** The village, and the pines among its houses (added through `pine`: the hills' own, backdrop.ts). */
export function village(pine: (x: number, z: number, size: number) => void) {
  // (the fences are painted in with the houses: one mesh for both)
  const body = new Paint(), into = { body, glow: new Paint(), snow: new Paint(), fence: body };
  const turn = new Quaternion(), up = new Vector3(0, 1, 0), one = new Vector3(1, 1, 1);
  // [z along the lane, which side (-1 west, facing east; 1 east, facing west), w, d, h, look]
  const HOUSES: [number, -1 | 1, number, number, number, number][] = [
    [-11.5, -1, 3.4, 4.6, 2.5, 0], [-5.2, -1, 3.8, 4.2, 2.7, 1], [0.6, -1, 3.2, 4.8, 2.4, 2], [12.2, -1, 3.6, 4.4, 2.6, 3], [18.6, -1, 3.4, 4.0, 2.5, 4], [24.4, -1, 3.8, 4.6, 2.7, 5],
    [-12.8, 1, 3.6, 4.4, 2.6, 4], [-6.6, 1, 3.2, 4.0, 2.4, 3], [-0.6, 1, 3.8, 4.8, 2.7, 0], [13.6, 1, 3.4, 4.6, 2.5, 1], [20.2, 1, 3.6, 4.2, 2.6, 2], [26, 1, 3.2, 4.4, 2.4, 5],
  ];
  for (const [z, side, w, d, h, look] of HOUSES) {
    const x = laneX(z) + side * (LANE.w / 2 + 2.0 + w / 2);
    // its front (its own -x) to the lane
    house(new Matrix4().compose(new Vector3(x, 0, z), turn.setFromAxisAngle(up, side < 0 ? Math.PI : 0), one), w, d, h, LOOKS[look], into);
    // a pine or two behind it
    pine(x + side * (w / 2 + 1.6), z - d * 0.3, 0.9);
    if (look % 2) pine(x + side * (w / 2 + 2.4), z + d * 0.35, 1.1);
  }
  // the chapel, at the junction, facing down her path: white, a slate roof, its tower at the front with a spire
  {
    const at = new Matrix4().compose(new Vector3(laneX(LINK.z) + LANE.w / 2 + 5.6, 0, LINK.z), turn.setFromAxisAngle(up, 0), one);
    const { body, glow, snow } = into;
    for (const p of [body, glow, snow, into.fence]) p.at = at;
    const w = 6.2, d = 3.8, h = 3.4, rise = 2.4, span = d / 2 + 0.35, a = Math.atan2(rise, span), slope = Math.hypot(span, rise);
    // (the chapel's ridge runs east and west: along its own x)
    body.box(w, h, d, C.paper, 0, h / 2, 0);
    body.box(w + 0.08, 0.24, d + 0.08, shade(C.paper, 0.78), 0, 0.12, 0);
    for (const s of [-1, 1]) body.tri(C.paper, [s * w / 2, h, -d / 2], [s * w / 2, h, d / 2], [s * w / 2, h + rise * (d / 2) / span, 0]);
    for (const s of [-1, 1]) {
      const nz = s * Math.sin(a), ny = Math.cos(a);
      // (a slope turned about x: built as a box turned about z, then swapped round with a quarter turn)
      const m = new Matrix4().compose(new Vector3(0, h + rise / 2 + ny * 0.06, s * span / 2 + nz * 0.06), new Quaternion().setFromEuler(new Euler(s * a, 0, 0)), new Vector3(w + 0.5, 0.12, slope + 0.14));
      for (const [p, colour, lift] of [[body, C.slate, 0], [snow, C.snow, 0.11]] as const) {
        const save = p.at;
        p.at = new Matrix4().multiplyMatrices(at, m).multiply(new Matrix4().makeTranslation(0, lift / 0.12, 0));
        p.box(1, 1, 1, colour, 0, 0, 0);
        p.at = save;
      }
    }
    body.box(w + 0.4, 0.14, d + 0.4, FASCIA, 0, h + 0.03, 0);
    // tall windows down its sides, lit
    for (const s of [-1, 1]) for (const x of [-1.6, 0, 1.6]) {
      body.box(0.7, 1.7, 0.06, TRIM, x, 1.75, s * (d / 2 + 0.03));
      glow.box(0.56, 1.5, 0.07, 0xFFD98A, x, 1.75, s * (d / 2 + 0.035));
    }
    // the tower at its west end (towards her path), the door in its foot, a spire
    const tx = -w / 2 - 0.9, tw = 1.8, th = 6.6;
    body.box(tw, th, tw, C.paper, tx, th / 2, 0);
    body.box(tw + 0.3, 0.16, tw + 0.3, FASCIA, tx, th, 0);
    body.box(0.08, 2.0, 1.0, C.timber, tx - tw / 2 - 0.03, 1.0, 0);
    for (const s of [-1, 1]) body.box(0.09, 2.1, 0.09, TRIM, tx - tw / 2 - 0.04, 1.05, s * 0.55);
    body.box(0.06, 0.8, 0.5, TRIM, tx - tw / 2 - 0.03, 4.9, 0);
    glow.box(0.07, 0.65, 0.36, 0xFFD98A, tx - tw / 2 - 0.04, 4.9, 0);
    // the spire: four faces up to a point
    const sy = th + 0.08, sh = 3.2, r = tw / 2 + 0.12;
    const c4: [number, number][] = [[-r, -r], [r, -r], [r, r], [-r, r]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = c4[i], [bx, bz] = c4[(i + 1) % 4];
      body.tri(C.slate, [tx + ax, sy, az], [tx, sy + sh, 0], [tx + bx, sy, bz]);
    }
  }

  // the lane, and her path carried on to it: packed snow, then earth, like her path
  const lane: number[] = [];
  const strip = (pts: [number, number][], w: number) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], len = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / len * w / 2, nz = (x1 - x0) / len * w / 2;
      lane.push(x0 - nx, 0, z0 - nz, x0 + nx, 0, z0 + nz, x1 + nx, 0, z1 + nz, x0 - nx, 0, z0 - nz, x1 + nx, 0, z1 + nz, x1 - nx, 0, z1 - nz);
    }
  };
  const along: [number, number][] = [];
  for (let z = LANE.z0; z <= LANE.z1; z += 1) along.push([laneX(z), z]);
  strip(along, LANE.w);
  strip([[LINK.x0, LINK.z], [laneX(LINK.z), LINK.z]], LINK.w);
  // (wound either way: drawn from both sides, so it shows however a strip runs)
  const laneGeo = new BufferGeometry();
  laneGeo.setAttribute('position', new Float32BufferAttribute(lane, 3));
  laneGeo.setAttribute('normal', new Float32BufferAttribute(lane.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  const laneMat = seasonal(PAL.path);
  laneMat.side = DoubleSide;
  const laneMesh = new Mesh(laneGeo, laneMat);
  laneMesh.position.y = 0.004;

  const g = new Group();
  g.add(
    // (both sides: the gable ends and the spire are wound either way)
    new Mesh(into.body.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide })),
    new Mesh(into.glow.geometry(), new MeshBasicMaterial({ color: 0xFFD98A })),
    seasonLayer(new Mesh(into.snow.geometry(), new MeshLambertMaterial({ color: C.snow })), SNOWY),
    laneMesh,
  );
  return g;
}
