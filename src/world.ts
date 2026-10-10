// Static scenery: ground, water, the dock, fences, roads, trees. Some of it belongs to one stage only: stage 2
// shrinks the dock to its north half, takes down the south fence and moves the road east of the restaurant.
import {
  BoxGeometry, Group, type Material, Mesh, MeshBasicMaterial, MeshLambertMaterial, type Object3D, PlaneGeometry,
  RepeatWrapping, type Vector3,
} from 'three';
import { at as atXZ, Build, detail, jitter, quietly, seasonLayer } from './kit';
import { HOUSE_PATH_Z, QUAY } from './layout';
import {
  bollard, deckBoards, fenceLog, FLOES, lifeRing, logSnow, piling, pilingSnow, ropeCoil, scatter,
} from './props';
import { bake, canvasTex, G, mat, mesh, scene, type Part } from './render';
import { bush, pineTier, pineTrunk, road as roadProp } from './propsWorld';
import { cloudShadows, foamRing, foamStrip, seaGeometry, seaMaterial, updSea } from './sea';
import { amount, onBlend, PAL, seasonal, type Swatch } from './season';
import { FY, rand } from './util';

/** Snow caps show in winter and melt away in spring; leaves lie in autumn, petals in spring. */
const SNOWY: Swatch = [1, 0, 0, 0], FALLEN: Swatch = [0, 0, 0, 1], PETALS: Swatch = [0, 1, 0, 0];
/** Adds what's drawn only on High (graphics.ts) to `to`, built off the game's luck, with its Low version (if any). */
function high(to: Object3D, build: () => Object3D, low?: Object3D | null) {
  const g = quietly(build);
  to.add(g);
  detail(low ?? null, g);
  return g;
}

// ---------- textures ----------
export function planks(a: string, b: string, rx: number, ry: number) {
  const t = canvasTex(256, 256, (c, w) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? a : b; c.fillRect(0, i * 32, w, 32);
      c.fillStyle = 'rgba(95,52,30,.35)'; c.fillRect(0, i * 32, w, 2);
      c.fillRect((i * 97 + 40) % 256, i * 32, 2, 32);
    }
  });
  t.tex.wrapS = t.tex.wrapT = RepeatWrapping;
  t.tex.repeat.set(rx, ry);
  return t.tex;
}

const waterTex = canvasTex(4, 256, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1E8FC0'); g.addColorStop(.75, '#36BEDB'); g.addColorStop(1, '#86E3F0');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});

// ---------- ground and water ----------
// Snow in winter, grass the rest of the year (season.ts).
const ground = mesh(new PlaneGeometry(220, 220), seasonal(PAL.ground));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; scene.add(ground);

// The bay runs from far west of the farm to just past the dock's east edge; the roads stay on land.
// Low: a flat sea with a strip of foam along the shore and down the dock's side.
const flatSea = quietly(() => new Group());
scene.add(flatSea);
const water = new Mesh(new PlaneGeometry(58.5, 34), new MeshLambertMaterial({ map: waterTex.tex }));
water.rotation.x = -Math.PI / 2; water.position.set(-21.8, 0.01, -23.5); water.receiveShadow = true; flatSea.add(water);
const foamMat = new MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: .75 });
const foam = new Mesh(new PlaneGeometry(58.5, 0.35), foamMat);
foam.rotation.x = -Math.PI / 2; foam.position.set(-21.8, 0.02, -6.62); flatSea.add(foam);
const sideFoam = new Mesh(new PlaneGeometry(0.35, 34), foamMat);
sideFoam.rotation.x = -Math.PI / 2; sideFoam.position.set(7.45, 0.02, -23.5); flatSea.add(sideFoam);
// High: the sea rolls, its facets glinting; foam laps the shore and the dock's side; clouds' shadows drift over it all.
/** The level the sea rolls about on High: high enough that its troughs stay over the ground under it. */
const SEA_Y = 0.045;
high(scene, () => {
  const g = new Group();
  const sea = new Mesh(seaGeometry(58.5, 34), seaMaterial(waterTex.tex));
  sea.rotation.x = -Math.PI / 2; sea.position.set(-21.8, SEA_Y, -23.5); sea.receiveShadow = true; g.add(sea);
  for (const lap of [0, 0.32]) {
    const shore = foamStrip(58.5, 0.3, lap); shore.position.set(-21.8, SEA_Y + 0.07 + lap * 0.02, -6.62);
    shore.rotation.z = Math.PI; // its wobbling edge out to sea
    const side = foamStrip(34, 0.3, lap); side.position.set(7.45, SEA_Y + 0.07 + lap * 0.02, -23.5);
    side.rotation.z = -Math.PI / 2;
    g.add(shore, side);
  }
  g.add(cloudShadows(FY + 0.013));
  return g;
}, flatSea);

// Low: flat white discs. High: slabs of ice with rounded edges and snow on top, rocking on the swell in a ring of foam.
const floes: { m: Mesh; hi: Group; ph: number; sx: number; sz: number }[] = [];
for (let i = 0; i < 9; i++) {
  const m = mesh(G.cyl, 0xFFFFFF, rand(-20, 5), 0.03, rand(-30, -16));
  m.scale.set(rand(.5, 1.4), 0.12, rand(.4, 1.1));
  scene.add(m);
  const f = { m, hi: quietly(() => new Group()), ph: rand(0, 6), sx: m.scale.x, sz: m.scale.z };
  high(scene, () => {
    // the outer group shows on High, the inner one melts away with the seasons
    const g = new Group();
    g.position.copy(m.position);
    g.rotation.y = jitter(0, 6);
    const ice = FLOES[i % FLOES.length].mesh(false);
    ice.scale.set(f.sx, 1, f.sz);
    const ring = foamRing(Math.max(f.sx, f.sz) * 1.05); ring.position.y = 0.03;
    f.hi.add(ice, ring);
    g.add(f.hi);
    return g;
  }, m);
  floes.push(f);
}
/** How big the ice floes are through the year: they melt away by summer and start to form again in autumn. */
export const FLOE_SIZE: [number, number, number, number] = [1, 0.5, 0, 0.3];
onBlend(() => {
  const k = amount(FLOE_SIZE);
  for (const f of floes) {
    f.m.scale.x = f.sx * k; f.m.scale.z = f.sz * k; f.m.visible = k > 0.01;
    f.hi.scale.set(k, 1, k); f.hi.visible = k > 0.01;
  }
});
/** Floes bob on the water (and on High rock with the swell, the foam round them breathing); `at` is where the camera looks. */
export function updFloes(time: number, at: Vector3) {
  for (const f of floes) {
    const bob = Math.sin(time * 1.3 + f.ph);
    f.m.position.y = 0.03 + bob * 0.03;
    f.hi.position.y = SEA_Y + 0.03 + bob * 0.03;
    f.hi.rotation.x = Math.sin(time * 0.9 + f.ph * 2) * 0.05;
    f.hi.rotation.z = Math.cos(time * 1.1 + f.ph) * 0.05;
  }
  updSea(time, at);
}

// ---------- dock ----------
// Low: a box with planks painted on top, on round posts. High: real boards with gaps between them, leaves on them in
// autumn and petals in spring; rounded pilings lashed with rope, snow-capped in winter, in rings of foam; iron
// bollards, a coil of rope and a life ring along the water's edge.
const deckSide = mat(0x9C6644);
function deck(w: number, d: number, z: number, rx: number, ry: number) {
  const g = quietly(() => new Group()); g.position.z = z; scene.add(g);
  const top = new MeshLambertMaterial({ map: planks('#C3875D', '#CF946A', rx, ry) });
  const m = new Mesh(new BoxGeometry(w, 0.3, d), [deckSide, deckSide, top, deckSide, deckSide, deckSide]);
  m.receiveShadow = true; g.add(m);
  high(g, () => {
    const hi = new Group();
    hi.add(deckBoards(w, d, FY, rx, ry).mesh(false));
    hi.add(seasonLayer(scatter(w - 0.5, d - 0.5, FY + 0.004, Math.round(w * d / 1.1), [0xE0812E, 0xC2562B, 0xF2B640, 0xB8642C]).mesh(false), FALLEN));
    hi.add(seasonLayer(scatter(w - 0.5, d - 0.5, FY + 0.004, Math.round(w * d / 1.6), [0xFF9EC4, 0xFFB7D3, 0xF78FB3]).mesh(false), PETALS));
    return hi;
  }, m);
  return g;
}
/** The stage 1 dock, and the stage 2 dock (its north half; the restaurant takes the rest). Only one shows at a time. */
const deck1 = deck(16, 14.5, 0.75, 4, 4);
const deck2 = deck(16, 8, -2.5, 4, 2);
deck2.visible = false;
const posts = quietly(() => new Group());
scene.add(posts);
for (let x = -7.5; x <= 7.5; x += 2.5) {
  const p = mesh(G.cyl, 0x8A5A3B, x, -0.1, -6.65, true);
  p.scale.set(0.18, 0.6, 0.18); posts.add(p);
}
high(scene, () => {
  const g = new Group(), wood = new Build(), snow = new Build(), PH = 0.52;
  for (let x = -7.5; x <= 7.5; x += 2.5) {
    wood.addAll(piling(PH), atXZ(x, -0.3, -6.65));
    snow.addAll(pilingSnow(PH), atXZ(x, -0.3, -6.65));
    const ring = foamRing(0.32); ring.position.set(x, SEA_Y + 0.05, -6.65); g.add(ring);
  }
  g.add(wood.mesh(), seasonLayer(snow.mesh(false), SNOWY));
  const deco = new Build();
  for (const x of [-2.6, 4.3, 6.9]) deco.addAll(bollard(), atXZ(x, FY, -6.38));
  deco.addAll(ropeCoil(), atXZ(4.85, FY, -6.0));
  deco.addAll(lifeRing(), atXZ(7.6, FY + 0.62, -4.6, Math.PI / 2));
  g.add(deco.mesh());
  return g;
}, posts);

// ---------- fences ----------
// Low: plain logs. High: rounded logs, their end grain on top (snow on it in winter), lashed together with rope.
/** Fence logs that get removed when the sled window opens. */
export const gapLogs: Object3D[] = [];
/** Fence logs at the north end of the west fence that make way for the casino harbor's quay. */
export const quayLogs: Object3D[] = [];
/** Fence south of the restaurant's line: gone in stage 2. Logs stand on the deck, so the group shrinks into it. */
const fence1 = new Group();
scene.add(fence1);
// The logs that stay put are baked into one mesh for the whole fence and one for fence1 (two draw calls, not ~80).
const logs: Part[] = [], logs1: Part[] = [];
/** Each log on High, in order along its stretch of fence, and which mesh it's baked into ('gap' ones stand alone). */
const hiLogs: { x: number; z: number; h: number; into: Part[] | Object3D; along: 'x' | 'z' }[] = [];
function log(x: number, z: number, into: Part[] | null, along: 'x' | 'z') {
  const h = rand(.78, .98);
  const at: Part['at'] = [x, FY + h / 2 - 0.05, z];
  if (into) { into.push({ geo: G.log, at, scale: [1, h, 1] }); hiLogs.push({ x, z, h, into, along }); return null; }
  const g = quietly(() => new Group()); scene.add(g);
  const l = mesh(G.log, 0xB0724A, ...at, true);
  l.scale.y = h; g.add(l);
  hiLogs.push({ x, z, h, into: g, along });
  return g;
}
for (let z = -6.2; z <= 8; z += 0.5) {
  if (z > QUAY.z0 && z < QUAY.z1 + 0.15) quayLogs.push(log(-7.85, z, null, 'z')!);
  else log(-7.85, z, z > 1.3 ? logs1 : logs, 'z');
}
for (let x = -7.35; x <= 7.9; x += 0.5) {
  if (x > 1.7 && x < 4.3) continue;
  log(x, 7.85, logs1, 'x');
}
for (let z = -6.2; z < 7.6; z += 0.5) {
  if (Math.abs(z - HOUSE_PATH_Z) < 0.5) continue; // the gap for the path to her house
  const gap = z > -2.3 && z < 0.3;
  const l = log(7.85, z, gap ? null : z > 1.3 ? logs1 : logs, 'z');
  if (l) gapLogs.push(l);
}
const lowFence = mesh(bake(logs), 0xB0724A, 0, 0, 0, true), lowFence1 = mesh(bake(logs1), 0xB0724A, 0, 0, 0, true);
scene.add(lowFence);
fence1.add(lowFence1);
{
  // lashed to the next log along, if it's in the same mesh and right beside it
  const wood = new Map<Part[] | Object3D, Build>(), snow = new Map<Part[] | Object3D, Build>();
  hiLogs.forEach((l, i) => {
    const n = hiLogs[i + 1], next = n && n.into === l.into && n.along === l.along && Math.hypot(n.x - l.x, n.z - l.z) < 0.6;
    const m = atXZ(l.x, FY - 0.05, l.z);
    if (!wood.has(l.into)) { wood.set(l.into, new Build()); snow.set(l.into, new Build()); }
    quietly(() => {
      wood.get(l.into)!.addAll(fenceLog(l.h, next ? 0.5 : 0, l.along), m);
      snow.get(l.into)!.addAll(logSnow(l.h), m);
    });
  });
  const lowOf = (into: Part[] | Object3D) => into === logs ? lowFence : into === logs1 ? lowFence1 : (into as Object3D).children[0];
  const parentOf = (into: Part[] | Object3D) => into === logs ? scene : into === logs1 ? fence1 : into as Object3D;
  for (const [into, b] of wood) {
    high(parentOf(into), () => {
      const g = new Group();
      g.add(b.mesh(), seasonLayer(snow.get(into)!.mesh(false), SNOWY));
      return g;
    }, lowOf(into));
  }
}

// ---------- roads ----------
const dashGeo = new PlaneGeometry(0.12, 0.9), dashMat = new MeshBasicMaterial({ color: 0xE8EEF2 });
/**
 * A road running north-south at `x`, with its centre line. Grouped at its own x so it can pop in sideways.
 * Low: a flat strip with dashes painted on. High: rounded asphalt with kerbs and edge lines, broken where the path to
 * her house crosses, and snow ploughed up against the kerbs in winter.
 */
function road(x: number) {
  const g = new Group(); g.position.x = x; scene.add(g);
  const r = mesh(new PlaneGeometry(ROAD_HALF * 2, 130), 0x6B7785);
  r.rotation.x = -Math.PI / 2; g.add(r);
  const dashes: Part[] = [];
  for (let z = -64; z < 64; z += 2.2) dashes.push({ geo: dashGeo, at: [0, 0.01, z], rot: [-Math.PI / 2, 0, 0] });
  const lines = new Mesh(bake(dashes), dashMat);
  g.add(lines);
  const low = quietly(() => new Group());
  low.add(r, lines); g.add(low);
  high(g, () => {
    const hi = new Group(), { road: tar, snow } = roadProp(130, ROAD_HALF, [HOUSE_PATH_Z]);
    hi.add(tar.mesh(false), seasonLayer(snow.mesh(false), SNOWY));
    return hi;
  }, low);
  return g;
}
/** The road past the sled window, and in stage 2 the one past the takeout kiosk, east of the restaurant. */
export const ROAD1_X = 9.75, ROAD2_X = 14.2;
/** How far a road runs either side of its centre line: a lane each way. */
export const ROAD_HALF = 1.3;
const road1 = road(ROAD1_X);
const road2 = road(ROAD2_X);
road2.visible = false;

// ---------- trees and snow ----------
// Trees are baked into a few big meshes per stage (one per material), which is far cheaper to draw than
// hundreds of little ones. Each group sits at ground level, so scaling it vertically grows or sinks its trees.
const TIERS: [r: number, h: number, y: number][] = [[0.75, 0.9, 0.75], [0.58, 0.8, 1.3], [0.4, 0.7, 1.8]];
/**
 * Trunks, the needles' two shades, the snow on them and the snow mounds. The needles turn in autumn, the snow turns
 * to blossom in spring, leaves in summer and gold in autumn, and the mounds are bushes out of winter.
 */
export const TREE_MATS: Material[] = [
  mat(0x7A5236), seasonal(PAL.pine), seasonal(PAL.pine2), seasonal(PAL.drift), seasonal(PAL.bush),
];
type Batch = Part[][];
const newBatch = (): Batch => TREE_MATS.map(() => []);

function addTree(b: Batch, x: number, z: number, s: number, r = rand(0, 6)) {
  b[0].push({ geo: G.cyl, at: [x, 0.25 * s, z], scale: [.12 * s, .5 * s, .12 * s] });
  TIERS.forEach(([rad, h, y], i) => {
    b[1 + i % 2].push({ geo: G.cone, at: [x, y * s, z], rot: [0, r, 0], scale: [rad * s, h * s, rad * s] });
    b[3].push({ geo: G.cone, at: [x, (y + h * .28) * s, z], rot: [0, r, 0], scale: [rad * .62 * s, h * .46 * s, rad * .62 * s] });
  });
}
function addMound(b: Batch, x: number, z: number) {
  b[4].push({ geo: G.sphere, at: [x, 0, z], scale: [rand(.6, 1.6), rand(.25, .5), rand(.6, 1.4)] });
}
/**
 * A batch's trees (and mounds) baked into one mesh per material. On High they're the same trees from the same parts,
 * rounder: tiers in drooping tufts with the snow lying on them, trunks that flare into roots, and the mounds as bushes.
 */
/** How big a patch of High trees is baked together (metres each way). */
const TREE_PATCH = 14;
function batchGroup(b: Batch) {
  const g = new Group();
  b.forEach((parts, i) => {
    if (!parts.length) return;
    const m = mesh(bake(parts), TREE_MATS[i], 0, 0, 0, i < 3);
    g.add(m);
  });
  const low = quietly(() => new Group());
  low.add(...g.children);
  g.add(low);
  high(g, () => {
    // baked in patches of ground, so the ones off screen (and outside the sun's shadow) aren't drawn at all
    const hi = new Group(), patches = new Map<string, { trunks: Build; needles: Build[]; drift: Build; bushes: Build }>();
    const patch = (p: Part) => {
      const k = `${Math.floor(p.at[0] / TREE_PATCH)},${Math.floor(p.at[2] / TREE_PATCH)}`;
      let t = patches.get(k);
      if (!t) patches.set(k, t = { trunks: new Build(), needles: [new Build(), new Build()], drift: new Build(), bushes: new Build() });
      return t;
    };
    for (const p of b[0]) pineTrunk(patch(p).trunks, p);
    for (const i of [1, 2]) for (const p of b[i]) { const t = patch(p); pineTier(t.needles[i - 1], t.drift, p, i === 2); }
    for (const p of b[4]) bush(patch(p).bushes, p);
    for (const { trunks, needles, drift, bushes } of patches.values()) {
      if (!trunks.empty) hi.add(trunks.mesh());
      needles.forEach((n, i) => { if (!n.empty) hi.add(n.mesh(true, TREE_MATS[1 + i] as MeshLambertMaterial)); });
      if (!drift.empty) hi.add(drift.mesh(false, TREE_MATS[3] as MeshLambertMaterial));
      if (!bushes.empty) hi.add(bushes.mesh(false, TREE_MATS[4] as MeshLambertMaterial));
    }
    return hi;
  }, low);
  return g;
}

/** Snowy pines at the given spots (x, z, size, and optionally which way they're turned), baked into one group. */
export function treeGroup(spots: [x: number, z: number, s: number, r?: number][]) {
  const b = newBatch();
  for (const [x, z, s, r] of spots) addTree(b, x, z, s, r);
  return batchGroup(b);
}

/** Neither stage has trees on the path to her house or round her yard. */
const housePath = (x: number, z: number) => x > 8.2 && z > HOUSE_PATH_Z - 4 && z < HOUSE_PATH_Z + 4.5;
/** Neither stage has trees on the casino harbor's quay along the shore. */
const quay = (x: number, z: number) => x > QUAY.x0 - 1.5 && x < -7 && z < QUAY.z1 + 1.2;
/** Stage 1 keeps trees off the deck, the road, the customers' path and the water. */
function treeOK1(x: number, z: number) {
  if (x > -8.8 && x < 8.8 && z > -7.2 && z < 8.8) return false;
  if (quay(x, z)) return false;
  if (x > 8.2 && x < 11.4) return false;
  if (housePath(x, z)) return false;
  if (x > -5 && x < 8.6 && z > 8.4 && z < 20) return false;
  return z > -6.2;
}
/** Stage 2 also keeps them off the restaurant, its garden, the kiosk's road, the diners' path and the farm. */
function treeOK2(x: number, z: number) {
  if (x > -8.8 && x < 8.8 && z > -7.2 && z < 2) return false;
  if (quay(x, z)) return false;
  if (housePath(x, z)) return false;
  if (x > -11.6 && x < 13.2 && z > 0.5 && z < 23.4) return false;
  if (x > 12.6 && x < 15.8) return false;
  if (x > -3 && x < 3 && z > 20 && z < 46) return false;
  if (x > -40 && x < -10.2 && z > -7 && z < 13.4) return false;
  return z > -6.2;
}

const both = newBatch(), only1 = newBatch(), only2 = newBatch();
for (let i = 0, placed = 0; i < 900 && placed < 96; i++) {
  const x = rand(-44, 34), z = rand(-8, 40);
  const a = treeOK1(x, z), b = treeOK2(x, z);
  if (!a && !b) continue;
  addTree(a && b ? both : a ? only1 : only2, x, z, rand(.8, 1.3));
  placed++;
}
for (let i = 0; i < 40; i++) {
  const x = rand(-36, 30), z = rand(-6, 34);
  const a = treeOK1(x, z), b = treeOK2(x, z);
  if (a || b) addMound(a && b ? both : a ? only1 : only2, x, z);
}
const trees1 = batchGroup(only1), trees2 = batchGroup(only2);
scene.add(batchGroup(both), trees1, trees2);
trees2.visible = false;

// ---------- stages ----------
/** What stage 2 removes (in the order they go) and adds, for the stage-up; the decks swap separately. */
export const stage1Only = { fence: fence1, road: road1, trees: trees1 };
export const stage2Only = { road: road2, trees: trees2 };

/** Swaps the stage 1 dock for the stage 2 one. */
export function swapDecks() {
  deck1.visible = false;
  deck2.visible = true;
}

/** The casino harbor's gap in the west fence, onto its quay. */
export const openQuayGap = () => quayLogs.forEach(l => { l.visible = false; });

/** Back to a full fence on the east side: the sled window's gap closes in stage 2. */
export const closeGap = () => gapLogs.forEach(l => { l.visible = true; });
