// Static scenery: ground, water, the dock, fences, roads, trees. Some of it belongs to one stage only: stage 2
// shrinks the dock to its north half, takes down the south fence and moves the road east of the restaurant.
import {
  BoxGeometry, Group, type Material, Mesh, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry, RepeatWrapping,
} from 'three';
import { HOUSE_PATH_Z, JETTY_Z, PIER_X } from './layout';
import { bake, canvasTex, G, mat, mesh, scene, type Part } from './render';
import { amount, onBlend, PAL, seasonal } from './season';
import { FY, rand } from './util';

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
const water = new Mesh(new PlaneGeometry(58.5, 34), new MeshLambertMaterial({ map: waterTex.tex }));
water.rotation.x = -Math.PI / 2; water.position.set(-21.8, 0.01, -23.5); water.receiveShadow = true; scene.add(water);
const foamMat = new MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: .75 });
const foam = new Mesh(new PlaneGeometry(58.5, 0.35), foamMat);
foam.rotation.x = -Math.PI / 2; foam.position.set(-21.8, 0.02, -6.62); scene.add(foam);
const sideFoam = new Mesh(new PlaneGeometry(0.35, 34), foamMat);
sideFoam.rotation.x = -Math.PI / 2; sideFoam.position.set(7.45, 0.02, -23.5); scene.add(sideFoam);

const floes: { m: Mesh; ph: number; sx: number; sz: number }[] = [];
for (let i = 0; i < 9; i++) {
  const m = mesh(G.cyl, 0xFFFFFF, rand(-20, 5), 0.03, rand(-30, -16));
  m.scale.set(rand(.5, 1.4), 0.12, rand(.4, 1.1));
  scene.add(m);
  floes.push({ m, ph: rand(0, 6), sx: m.scale.x, sz: m.scale.z });
}
/** How big the ice floes are through the year: they melt away by summer and start to form again in autumn. */
export const FLOE_SIZE: [number, number, number, number] = [1, 0.5, 0, 0.3];
onBlend(() => {
  const k = amount(FLOE_SIZE);
  for (const f of floes) { f.m.scale.x = f.sx * k; f.m.scale.z = f.sz * k; f.m.visible = k > 0.01; }
});
export function updFloes(time: number) {
  for (const f of floes) f.m.position.y = 0.03 + Math.sin(time * 1.3 + f.ph) * 0.03;
}

// ---------- dock ----------
const deckSide = mat(0x9C6644);
function deck(w: number, d: number, z: number, rx: number, ry: number) {
  const top = new MeshLambertMaterial({ map: planks('#C3875D', '#CF946A', rx, ry) });
  const m = new Mesh(new BoxGeometry(w, 0.3, d), [deckSide, deckSide, top, deckSide, deckSide, deckSide]);
  m.position.set(0, 0, z); m.receiveShadow = true; scene.add(m);
  return m;
}
/** The stage 1 dock, and the stage 2 dock (its north half; the restaurant takes the rest). Only one shows at a time. */
const deck1 = deck(16, 14.5, 0.75, 4, 4);
const deck2 = deck(16, 8, -2.5, 4, 2);
deck2.visible = false;
for (let x = -7.5; x <= 7.5; x += 2.5) {
  const p = mesh(G.cyl, 0x8A5A3B, x, -0.1, -6.65, true);
  p.scale.set(0.18, 0.6, 0.18); scene.add(p);
}

// ---------- fences ----------
/** Fence logs that get removed when the sled window opens. */
export const gapLogs: Mesh[] = [];
/** Fence logs in the west fence that make way for the casino boat's jetty. */
export const jettyLogs: Mesh[] = [];
/** Fence south of the restaurant's line: gone in stage 2. Logs stand on the deck, so the group shrinks into it. */
const fence1 = new Group();
scene.add(fence1);
// The logs that stay put are baked into one mesh for the whole fence and one for fence1 (two draw calls, not ~80).
const logs: Part[] = [], logs1: Part[] = [];
function log(x: number, z: number, into: Part[] | null) {
  const h = rand(.78, .98);
  const at: Part['at'] = [x, FY + h / 2 - 0.05, z];
  if (into) { into.push({ geo: G.log, at, scale: [1, h, 1] }); return null; }
  const l = mesh(G.log, 0xB0724A, ...at, true);
  l.scale.y = h; scene.add(l);
  return l;
}
for (let z = -6.2; z <= 8; z += 0.5) {
  if (Math.abs(z - JETTY_Z) < 0.5) jettyLogs.push(log(-7.85, z, null)!);
  else log(-7.85, z, z > 1.3 ? logs1 : logs);
}
for (let x = -7.35; x <= 7.9; x += 0.5) {
  if (x > 1.7 && x < 4.3) continue;
  log(x, 7.85, logs1);
}
for (let z = -6.2; z < 7.6; z += 0.5) {
  if (Math.abs(z - HOUSE_PATH_Z) < 0.5) continue; // the gap for the path to her house
  const gap = z > -2.3 && z < 0.3;
  const l = log(7.85, z, gap ? null : z > 1.3 ? logs1 : logs);
  if (l) gapLogs.push(l);
}
scene.add(mesh(bake(logs), 0xB0724A, 0, 0, 0, true));
fence1.add(mesh(bake(logs1), 0xB0724A, 0, 0, 0, true));

// ---------- roads ----------
const dashGeo = new PlaneGeometry(0.12, 0.9), dashMat = new MeshBasicMaterial({ color: 0xE8EEF2 });
/** A road running north-south at `x`, with its centre line. Grouped at its own x so it can pop in sideways. */
function road(x: number) {
  const g = new Group(); g.position.x = x; scene.add(g);
  const r = mesh(new PlaneGeometry(ROAD_HALF * 2, 130), 0x6B7785);
  r.rotation.x = -Math.PI / 2; g.add(r);
  const dashes: Part[] = [];
  for (let z = -64; z < 64; z += 2.2) dashes.push({ geo: dashGeo, at: [0, 0.01, z], rot: [-Math.PI / 2, 0, 0] });
  g.add(new Mesh(bake(dashes), dashMat));
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
function batchGroup(b: Batch) {
  const g = new Group();
  b.forEach((parts, i) => {
    if (!parts.length) return;
    const m = mesh(bake(parts), TREE_MATS[i], 0, 0, 0, i < 3);
    g.add(m);
  });
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
/** Neither stage has trees on the casino boat's jetty along the shore. */
const jetty = (x: number, z: number) => x > PIER_X - 1.8 && x < -7 && z < JETTY_Z + 1.2;
/** Stage 1 keeps trees off the deck, the road, the customers' path and the water. */
function treeOK1(x: number, z: number) {
  if (x > -8.8 && x < 8.8 && z > -7.2 && z < 8.8) return false;
  if (jetty(x, z)) return false;
  if (x > 8.2 && x < 11.4) return false;
  if (housePath(x, z)) return false;
  if (x > -5 && x < 8.6 && z > 8.4 && z < 20) return false;
  return z > -6.2;
}
/** Stage 2 also keeps them off the restaurant, its garden, the kiosk's road, the diners' path and the farm. */
function treeOK2(x: number, z: number) {
  if (x > -8.8 && x < 8.8 && z > -7.2 && z < 2) return false;
  if (jetty(x, z)) return false;
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

/** The casino boat's gap in the west fence, for its jetty. */
export const openJettyGap = () => jettyLogs.forEach(l => { l.visible = false; });

/** Back to a full fence on the east side: the sled window's gap closes in stage 2. */
export const closeGap = () => gapLogs.forEach(l => { l.visible = true; });
