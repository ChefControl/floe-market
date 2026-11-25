// The land past the playable area, for the wide shots (the store's screenshots and trailer, the stage-up's overview):
// low hills all round the land side with pines on them, a dip where each road runs off between them, far mountains
// behind, a village east past her house, and out at sea icebergs (melting with the floes) and a few far sailboats,
// with cloud banks low over the horizon. All of it sits well past where anyone walks or the game's camera looks, and
// the fog turns it to haze with the distance. It's built once on dice of its own (`apart`), at fixed places, so it
// looks the same every visit and never moves the game's luck or the rest of the scenery's dice. Few draw calls: each
// part is one merged mesh (vertex colours where it has several), with no shadows, and nothing moves but the clouds'
// fade at night and the icebergs' size with the seasons.
import {
  BufferGeometry, Color, ConeGeometry, Float32BufferAttribute, Group, IcosahedronGeometry, InstancedMesh, Matrix4, Mesh,
  MeshLambertMaterial, Quaternion, Vector3,
} from 'three';
import { apart, dice } from './kit';
import { C } from './palette';
import { scene, sky } from './render';
import { amount, FLOE_SIZE, onBlend, PAL, seasonal } from './season';

/** Where the hills ring is centred, and the angles (degrees, atan2(z, x) from it: 0 east, 90 south, 180 west) the land
 *  side spans, from the north-east coast round to the west shore, where the ring runs down into the sea. */
const MID = { x: 0, z: 8 }, FROM = -92, TO = 202;
/** The roads (world.ts ROAD1_X, ROAD2_X) run north and south between the hills: the ridge dips to nothing round them. */
const ROADS_X = 12, ROAD_GAP = 5;

/** Each part in a group of its own, so each can be shown or hidden. */
export const backdrop = apart(() => ({
  hills: new Group(), pines: new Group(), peaks: new Group(), town: new Group(), bergs: new Group(), boats: new Group(), clouds: new Group(),
}), dice(0xBAC4C));

const smooth = (a: number, b: number, x: number) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const rad = (deg: number) => deg * Math.PI / 180;

/** Triangles with flat facets (the islands' low-poly look), from a list of corners and, optionally, a colour each. */
function facets(pos: number[], col?: number[]) {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  if (col) g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * A ridge round MID from FROM to TO: in cross-section a foot `depth` in front of its crest, a shoulder, the crest at
 * `r(a)` and `h(a)` high, and a back slope; `seg` steps along. Its height falls to nothing at the ends and where a road
 * runs through. `tint` colours a corner by how high it is (for the peaks' snow), or leaves it to the material.
 */
function ridge(seg: number, r: (a: number) => number, h: (a: number) => number, depth: number, tint?: (y: number, top: number) => Color) {
  const pos: number[] = [], col: number[] = [];
  const rows = (a: number) => {
    const R = r(a), cos = Math.cos(rad(a)), sin = Math.sin(rad(a));
    const crestX = MID.x + cos * R;
    const gap = smooth(ROAD_GAP, ROAD_GAP + 9, Math.abs(crestX - ROADS_X));
    const H = h(a) * smooth(FROM, FROM + 14, a) * smooth(TO, TO - 14, a) * gap;
    // (foot, shoulder, crest, back), each [distance out, height]
    return [[R - depth, -0.05], [R - depth * 0.45, H * 0.72], [R, H], [R + depth * 0.6, H * 0.35], [R + depth * 1.1, -0.05]]
      .map(([d, y]) => [MID.x + cos * d, y, MID.z + sin * d] as const);
  };
  let prev = rows(FROM);
  for (let i = 1; i <= seg; i++) {
    const a = FROM + (TO - FROM) * i / seg, cur = rows(a);
    for (let j = 0; j < prev.length - 1; j++) {
      const p0 = prev[j], p1 = prev[j + 1], c0 = cur[j], c1 = cur[j + 1];
      // (wound to face up and out towards MID)
      pos.push(...p0, ...c0, ...p1, ...p1, ...c0, ...c1);
      if (tint) {
        const top = Math.max(p0[1], p1[1], c0[1], c1[1], 0.01);
        for (const v of [p0, c0, p1]) { const c = tint((p0[1] + c0[1] + p1[1]) / 3, top); col.push(c.r, c.g, c.b); void v; }
        for (const v of [p1, c0, c1]) { const c = tint((p1[1] + c0[1] + c1[1]) / 3, top); col.push(c.r, c.g, c.b); void v; }
      }
    }
    prev = cur;
  }
  return facets(pos, tint ? col : undefined);
}

/** Some waves summed: a smooth line that rises and falls round the ring, the same every time. */
const waves = (a: number, list: [amp: number, freq: number, phase: number][]) =>
  list.reduce((s, [amp, f, ph]) => s + amp * Math.sin(rad(a) * f + ph), 0);

const nearR = (a: number) => 64 + waves(a, [[4, 3, 1.1], [2.5, 7, 0.4]]);
/** Gentle hills, rising higher in the west, behind the rice terraces climbing that way. */
const nearH = (a: number) => (6.5 + waves(a, [[2.2, 5, 0.3], [1.6, 11, 2.0], [1.0, 17, 4.1]])) * (1 + 0.7 * smooth(120, 180, a));
const NEAR_DEPTH = 13;

apart(() => {
  // ---------- the hills ----------
  const hills = new Mesh(ridge(150, nearR, nearH, NEAR_DEPTH), seasonal(PAL.lawn));
  backdrop.hills.add(hills);

  // ---------- pines on them ----------
  // two tiers each, like the trees nearer in (world.ts), and turning with them in autumn: the same materials
  const roll = dice(0xB1C4D);
  const tiers = [new ConeGeometry(1, 1, 6, 1), new ConeGeometry(1, 1, 6, 1)];
  const parts: BufferGeometry[][] = [[], []];
  const m = new Matrix4(), q = new Quaternion(), up = new Vector3(0, 1, 0), p = new Vector3(), s = new Vector3();
  for (let a = FROM + 10; a < TO - 10; a += 0.7) {
    const H = nearH(a), R = nearR(a), crestX = MID.x + Math.cos(rad(a)) * R;
    if (Math.abs(crestX - ROADS_X) < ROAD_GAP + 8) continue;
    for (let n = 0; n < 3; n++) {
      if (roll() < 0.4) continue;
      // somewhere on the front slope, from part way up to the crest
      const k = 0.25 + roll() * 0.7, d = R - NEAR_DEPTH * (1 - k) * 0.9, y = H * (k < 0.55 ? k / 0.55 * 0.72 : 0.72 + (k - 0.55) / 0.45 * 0.28);
      const aa = a + (roll() - 0.5) * 0.9, x = MID.x + Math.cos(rad(aa)) * d, z = MID.z + Math.sin(rad(aa)) * d;
      const size = 0.75 + roll() * 0.5;
      for (let t = 0; t < 2; t++) {
        const g = tiers[t].clone();
        q.setFromAxisAngle(up, roll() * 6);
        m.compose(p.set(x, y + size * (0.75 + t * 0.8), z), q, s.set(size * (0.95 - t * 0.3), size * 1.5, size * (0.95 - t * 0.3)));
        parts[(n + t) % 2].push(g.applyMatrix4(m));
      }
    }
  }
  // (the pines' own seasonal colours, as world.ts' trees: their needles turn red and orange in autumn)
  [PAL.pine, PAL.pine2].forEach((c, i) => backdrop.pines.add(new Mesh(merge(parts[i]), seasonal(c))));

  // ---------- far mountains ----------
  const rock = new Color(C.steel), snow = new Color(C.ice), tmp = new Color();
  const peaks = ridge(110, a => 104 + waves(a, [[5, 4, 2.2]]), a => 19 + waves(a, [[6, 6, 0.9], [3.5, 13, 3.3], [2, 23, 1.7]]), 22,
    (y, top) => tmp.copy(rock).lerp(snow, smooth(0.62, 0.8, y / Math.max(top, 18))));
  backdrop.peaks.add(new Mesh(peaks, new MeshLambertMaterial({ vertexColors: true })));

  // ---------- the village, east past her house ----------
  {
    const pos: number[] = [], col: number[] = [];
    const roll2 = dice(0x7A1E5);
    const wall = [new Color(C.paper), new Color(C.enamel), new Color(C.endGrain)], roofs = [new Color(C.red), new Color(C.navy), new Color(C.log), new Color(C.slate)];
    const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, c: Color) => {
      const v = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
      for (const [a, b, cc, d] of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [3, 7, 6, 2]]) {
        pos.push(...v[a], ...v[b], ...v[cc], ...v[a], ...v[cc], ...v[d]);
        for (let i = 0; i < 6; i++) col.push(c.r, c.g, c.b);
      }
    };
    const roof = (x0: number, x1: number, y: number, h: number, z0: number, z1: number, c: Color) => {
      // a gable roof, its ridge north to south, overhanging the walls a little
      const o = 0.25, xm = (x0 + x1) / 2;
      const A = [x0 - o, y, z0 - o], B = [x1 + o, y, z0 - o], Cc = [x1 + o, y, z1 + o], D = [x0 - o, y, z1 + o], E = [xm, y + h, z0 - o], F = [xm, y + h, z1 + o];
      for (const t of [[A, D, F], [A, F, E], [B, E, F], [B, F, Cc], [A, E, B], [D, Cc, F]]) {
        pos.push(...t.flat());
        for (let i = 0; i < 3; i++) col.push(c.r, c.g, c.b);
      }
    };
    // in rows along a lane, between the pines (they stop at x 34) and the hills' foot
    const spots: [number, number][] = [];
    for (let z = -16; z <= 30; z += 4.6) for (const x of [40, 45.5]) if (Math.abs(z - 6) > 2.5 || x > 42) spots.push([x + (roll2() - 0.5) * 1.6, z + (roll2() - 0.5) * 1.2]);
    for (const [x, z] of spots) {
      if (roll2() < 0.18) continue;
      const w = 2.4 + roll2() * 1.2, d = 2.6 + roll2() * 1.4, h = 1.8 + roll2() * 0.9;
      box(x - w / 2, x + w / 2, 0, h, z - d / 2, z + d / 2, wall[Math.floor(roll2() * wall.length)]);
      roof(x - w / 2, x + w / 2, h, 1.1 + roll2() * 0.5, z - d / 2, z + d / 2, roofs[Math.floor(roll2() * roofs.length)]);
    }
    // and a white chapel with its little tower, at the end of the lane
    box(48.5, 51.5, 0, 3.2, 8, 13, wall[0]); roof(48.5, 51.5, 3.2, 1.6, 8, 13, roofs[0]);
    box(49.2, 50.8, 0, 6.2, 13, 14.6, wall[0]); roof(49.2, 50.8, 6.2, 1.8, 13, 14.6, roofs[0]);
    backdrop.town.add(new Mesh(facets(pos, col), new MeshLambertMaterial({ vertexColors: true })));
  }

  // ---------- icebergs ----------
  // out past the boats' way in (the casino yacht's from the north-west, casino.ts; the voting boat's from due north),
  // between the islands: one jagged berg, turned and sized differently at each place, melting with the floes
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
    const spots = [[-21, -47, 2.6], [-17, -53, 1.6], [-49, -36, 2.2], [-55, -42, 3.0], [-8, -50, 1.4], [-38, -50, 1.9], [-70, -30, 2.4]] as const;
    const bergs = new InstancedMesh(g, new MeshLambertMaterial({ color: C.ice, flatShading: true }), spots.length);
    bergs.userData.spots = spots.map(([x, z, sz], i) => ({ x, z, sz, turn: i * 2.3 + roll3() }));
    backdrop.bergs.add(bergs);
  }

  // ---------- far sailboats ----------
  {
    const pos: number[] = [], col: number[] = [];
    const hull = [new Color(C.navy), new Color(C.red), new Color(C.paper)], sail = new Color(C.paper);
    const tri = (a: number[], b: number[], c: number[], cc: Color) => { pos.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) col.push(cc.r, cc.g, cc.b); };
    const boat = (x: number, z: number, turn: number, k: number, hc: Color) => {
      const cs = Math.cos(turn), sn = Math.sin(turn);
      const P = (u: number, y: number, w: number) => [x + (u * cs - w * sn) * k, y * k, z + (u * sn + w * cs) * k];
      // a wedge of a hull, bow at +u
      const L = 1.6, W = 0.5;
      tri(P(-L, 0.35, -W), P(L, 0.35, 0), P(-L, 0.35, W), hc);
      tri(P(-L, 0.35, -W), P(-L, 0, 0), P(L, 0.35, 0), hc);
      tri(P(-L, 0.35, W), P(L, 0.35, 0), P(-L, 0, 0), hc);
      tri(P(-L, 0.35, -W), P(-L, 0.35, W), P(-L, 0, 0), hc);
      // the mainsail and the jib, both sides
      for (const side of [1, -1]) {
        tri(P(-0.1, 0.4, 0), side > 0 ? P(-1.2, 0.5, 0) : P(-0.1, 3.0, 0), side > 0 ? P(-0.1, 3.0, 0) : P(-1.2, 0.5, 0), sail);
        tri(P(0.05, 0.45, 0), side > 0 ? P(0.05, 2.6, 0) : P(1.3, 0.45, 0), side > 0 ? P(1.3, 0.45, 0) : P(0.05, 2.6, 0), sail);
      }
    };
    boat(-30, -42, 0.4, 1.0, hull[0]); boat(-62, -24, 2.6, 1.1, hull[1]); boat(-6, -58, -0.3, 1.0, hull[2]); boat(-46, -56, 3.4, 0.9, hull[0]);
    backdrop.boats.add(new Mesh(facets(pos, col), new MeshLambertMaterial({ vertexColors: true })));
  }

  // ---------- cloud banks ----------
  // low over the horizon all round, past the fog (they keep their own white, and fade out as night falls)
  {
    const roll4 = dice(0xC10D5);
    const list: BufferGeometry[] = [];
    for (let i = 0; i < 14; i++) {
      const a = rad(i * 360 / 14 + roll4() * 12), R = 150 + roll4() * 25, cx = Math.cos(a) * R, cz = MID.z + Math.sin(a) * R, y = 11 + roll4() * 9;
      const puffs = 4 + Math.floor(roll4() * 4);
      for (let j = 0; j < puffs; j++) {
        const g = new IcosahedronGeometry(1, 1).toNonIndexed(), sz = 5 + roll4() * 6;
        // along the bank, across the line of sight
        const along = (j - puffs / 2) * 6;
        g.applyMatrix4(m.compose(p.set(cx - Math.sin(a) * along, y + roll4() * 2.5, cz + Math.cos(a) * along), q.identity(), s.set(sz * 1.7, sz * 0.55, sz)));
        list.push(g);
      }
    }
    const cloudMat = new MeshLambertMaterial({ color: 0xFFFFFF, emissive: 0xFFFFFF, emissiveIntensity: 0.5, fog: false, transparent: true, opacity: 0.85, depthWrite: false });
    backdrop.clouds.add(new Mesh(merge(list), cloudMat));
  }

  const all = new Group();
  all.name = 'backdrop';
  all.add(...Object.values(backdrop));
  all.traverse(o => { if (o instanceof Mesh) { o.castShadow = false; o.receiveShadow = false; o.matrixAutoUpdate = false; o.updateMatrix(); } });
  scene.add(all);
}, dice(0xBAC4D));

/** One geometry from many, positions and normals (and colours) only. */
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
/** The clouds fade out as night falls (horizon.ts nightSky). */
/** The clouds take on a little of the sky's colour (stage 2's dusk, the rain's grey), and fade out as night falls
 *  (horizon.ts nightSky, whenever the light changes). */
export function backdropNight(k: number) {
  const mat = (backdrop.clouds.children[0] as Mesh | undefined)?.material as MeshLambertMaterial | undefined;
  if (!mat) return;
  mat.color.setHex(C.snow).lerp(sky.bg, 0.3);
  mat.emissive.copy(mat.color);
  mat.opacity = 0.85 * (1 - k);
  backdrop.clouds.visible = k < 0.99;
}
