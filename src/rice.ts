// Rice for the sushi (stage 2). At first it's bought by the bag at the stall on the dock and carried to the
// kitchen line by hand. Later it grows on the terraces west of the restaurant: the player harvests it by wading
// through, then a farmer does, and a rice porter carries it in through the farm door.
import { BoxGeometry, Group, Mesh, MeshLambertMaterial, type Vector3 } from 'three';
import { animPerson, moveEnt, Person, type Walker } from './characters';
import { decal, drawPad } from './decals';
import { carrySlot, Holder } from './holder';
import { newRice } from './items';
import { FARM_DOOR, groundY, HALL_BOX, PATH_X, TERRACE_Z, TERRACES } from './layout';
import { boost } from './economy';
import { bake, canvasTex, G, mat, mesh, scene, type Part } from './render';
import { RICE_DROP, ricePot } from './restaurant';
import { d2xz, FY, rand, V, type XZ } from './util';

export { RICE_PRICE } from './economy';

// ---------- stall ----------
/** Where the player stands to buy rice. */
export const STALL = V(5.5, FY, -4.3);
/** The stall's table, for collisions. */
export const STALL_BOX = { x: 6.7, z: -5.4, hx: 0.8, hz: 0.5 };
/** Where bought bags fly from. */
export const STALL_TOP = V(STALL_BOX.x, FY + 0.95, STALL_BOX.z);

const stallPad = decal(1.6, (c, w, h) => drawPad(c, w, h, '🍚'));
stallPad.mesh.position.set(STALL.x, FY + 0.01, STALL.z);
stallPad.mesh.visible = false;
/** The stall opens with the restaurant. */
const stall = new Group();
stall.visible = false;
scene.add(stall);
export const stallOpen = () => stall.visible;
{
  const { x, z } = STALL_BOX;
  stall.add(mesh(new BoxGeometry(1.6, 0.8, 1.0), 0x9C6644, x, FY + 0.4, z, true));
  for (let i = 0; i < 6; i++) {
    const s = newRice(); s.position.set(x + (i % 3 - 1) * 0.36, FY + 0.84 + Math.floor(i / 3) * 0.085, z + 0.1); stall.add(s);
  }
  for (const [px, pz] of [[-0.75, -0.45], [0.75, -0.45], [-0.75, 0.45], [0.75, 0.45]]) {
    const post = mesh(G.cyl, 0x6B4A2E, x + px, FY + 0.95, z + pz, true); post.scale.set(0.05, 1.9, 0.05); stall.add(post);
  }
  const stripes = canvasTex(64, 64, (c, w, h) => {
    for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#FFFFFF' : '#D8394B'; c.fillRect(i * w / 4, 0, w / 4, h); }
  });
  const awning = mesh(new BoxGeometry(1.9, 0.06, 1.3), [mat(0xD8394B), mat(0xD8394B), new MeshLambertMaterial({ map: stripes.tex }), mat(0xD8394B), mat(0xD8394B), mat(0xD8394B)], x, FY + 1.92, z, true);
  awning.rotation.x = 0.12;
  stall.add(awning);
}

/** Opens the rice stall (with the restaurant). Returns it for the pop-in. */
export function openStall() {
  stall.visible = true;
  stallPad.mesh.visible = true;
  return stall;
}

// ---------- terraces ----------
/** Seconds from sprout to ripe. */
const GROW = 16;
const CELL = 1.3, COLS = 3, ROWS = 6;
/** Where harvested bags are stacked for the rice porter: on the path, north of the bridge. */
const PX = (PATH_X.x0 + PATH_X.x1) / 2;
const STACK = { x: PX, z: -0.6, y: 0.06 };
/** Where the player can pick bags up off that stack. */
export const STACK_AT = { x: STACK.x, z: STACK.z };

interface Cell {
  x: number;
  z: number;
  /** 0 = just planted, 1 = ripe. */
  grow: number;
  g: Group;
  stalks: Mesh;
  heads: Mesh;
  /** A farmer is on the way to harvest it. */
  taken: boolean;
}

/** Planted terraces (by index) and their rice. */
export const field = { built: false, planted: [] as number[], cells: [] as Cell[] };
/** Harvested bags waiting on the path for the rice porter. */
export const fieldStack = new Holder(i => {
  const j = i % 4;
  return V(STACK.x + ((j % 2) - 0.5) * 0.34, STACK.y + 0.06 + Math.floor(i / 4) * 0.085, STACK.z + (Math.floor(j / 2) - 0.5) * 0.28);
}, 40);
const pallet = mesh(new BoxGeometry(0.8, 0.06, 0.7), 0x8A5A3B, STACK.x, STACK.y + 0.03, STACK.z, true);
pallet.visible = false;
scene.add(pallet);

// One clump of rice: six stalks and their seed heads, each baked into a single geometry all clumps share.
const STALKS: Part[] = [], HEADS: Part[] = [];
for (let i = 0; i < 6; i++) {
  const a = i / 6 * Math.PI * 2, r = 0.17;
  STALKS.push({ geo: G.cone, at: [Math.cos(a) * r, 0.32, Math.sin(a) * r], rot: [-Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15], scale: [0.05, 0.64, 0.05] });
  HEADS.push({ geo: G.sphere, at: [Math.cos(a) * r * 1.3, 0.62, Math.sin(a) * r * 1.3], scale: [0.05, 0.09, 0.05] });
}
const stalksGeo = bake(STALKS), headsGeo = bake(HEADS);
const green = mat(0x5E9B3E), gold = mat(0xE0B84A), grain = mat(0xF2C14E);
const ripe = (c: Cell) => c.grow >= 1;

function setGrowth(c: Cell, grow: number) {
  c.grow = grow;
  c.g.scale.y = 0.25 + 0.75 * Math.min(1, grow);
  c.stalks.material = ripe(c) ? gold : green;
  c.heads.visible = ripe(c);
}

function plant(x: number, z: number, y: number, grow: number) {
  const g = new Group(); g.position.set(x, y, z); g.rotation.y = rand(0, 6);
  const stalks = mesh(stalksGeo, green, 0, 0, 0, true), heads = mesh(headsGeo, grain);
  g.add(stalks, heads);
  scene.add(g);
  const c: Cell = { x, z, grow: 0, g, stalks, heads, taken: false };
  setGrowth(c, grow);
  field.cells.push(c);
  return g;
}

/**
 * Plants a terrace (the 'paddy', 'plot2' and 'plot3' unlocks): a 3×6 patch of rice at staggered growth.
 * Returns the clumps for the pop-in.
 */
export function plantTerrace(i: number) {
  field.built = true;
  field.planted.push(i);
  pallet.visible = true;
  const t = TERRACES[i], cx = (t.x0 + t.x1) / 2, cz = (TERRACE_Z.z0 + TERRACE_Z.z1) / 2;
  const out: Group[] = [];
  for (let r = 0; r < ROWS; r++) for (let k = 0; k < COLS; k++) {
    out.push(plant(cx + (k - 1) * CELL, cz + (r - (ROWS - 1) / 2) * CELL, t.top, ((r * COLS + k) % 4) / 4));
  }
  return out;
}

let harvestT = 0;
/** The player harvests ripe rice within reach into their arms. */
export function harvestNear(p: XZ, arms: Holder, dt: number) {
  harvestT -= dt;
  for (const c of field.cells) {
    if (harvestT > 0 || !arms.hasRoom()) break;
    if (!ripe(c) || c.taken || d2xz(p, c) > 0.9 * 0.9) continue;
    harvest(c, arms);
    harvestT = 0.12;
  }
  if (harvestT < 0) harvestT = 0;
}

function harvest(c: Cell, to: Holder) {
  setGrowth(c, 0);
  const s = newRice(); s.position.set(c.x, c.g.position.y + 0.4, c.z);
  to.receive(s, 0.3, 0.8);
}

/** Stands a walker on the ground (or terrace) under them. */
function ground(w: Walker) { w.g.position.y = groundY(w.g.position); }

// ---------- farmer ----------
interface Farmer extends Walker {
  g: Person;
  state: 'seek' | 'go' | 'cut';
  t: number;
  cell: Cell | null;
}
export let farmer: Farmer | null = null;
/** Where the farmer waits when nothing's ripe: the south end of the path. */
export const FARM_HOME = V(PX, 0, TERRACE_Z.z1 + 0.8);

export function hireFarmer() {
  const g = new Person(0x7A9E3B, 'farmer');
  g.position.copy(FARM_HOME); scene.add(g);
  farmer = { g, h: 0, speed: 2.6, moving: false, state: 'seek', t: 0, cell: null };
  ground(farmer);
  return g;
}

/** The kitchen crew upgrade speeds up the farm's workers too (up to twice as fast on their feet). */
const pace = (base: number) => base * Math.min(2, boost('crew'));

function updFarmer(f: Farmer, dt: number) {
  f.speed = pace(2.6);
  if (f.state === 'seek') {
    let best: Cell | null = null, bd = Infinity;
    for (const c of field.cells) {
      if (!ripe(c) || c.taken) continue;
      const d = d2xz(f.g.position, c);
      if (d < bd) { bd = d; best = c; }
    }
    if (best) { best.taken = true; f.cell = best; f.state = 'go'; }
    else moveEnt(f, FARM_HOME, dt);
  } else if (f.state === 'go') {
    if (moveEnt(f, { x: f.cell!.x, z: f.cell!.z + 0.55 }, dt)) { f.state = 'cut'; f.t = 0.5 / boost('crew'); f.h = Math.PI; }
  } else {
    f.t -= dt;
    if (f.t <= 0 && fieldStack.hasRoom()) {
      f.cell!.taken = false;
      harvest(f.cell!, fieldStack);
      f.cell = null; f.state = 'seek';
    }
  }
  ground(f);
  f.g.rotation.y = f.h;
  animPerson(f.g, f.moving, dt, false);
  if (f.state === 'cut') f.g.arms[1].rotation.x = -0.6 - Math.abs(Math.sin(f.t * 16)) * 0.9;
}

// ---------- rice porter ----------
interface Porter extends Walker {
  g: Person;
  back: Holder;
  state: 'toStack' | 'load' | 'toPot' | 'unload';
  t: number;
  /** Time spent at the stack without picking anything up. */
  wait: number;
  path: Vector3[];
}
export let porter: Porter | null = null;
const STACK_STAND = V(STACK.x, 0, STACK.z - 0.85);
const DOOR_Z = (FARM_DOOR.z0 + FARM_DOOR.z1) / 2;
/** From the stack, over the bridge and in through the farm door, then round the kitchen line to the rice. */
const TO_POT = [V(PX, 0, DOOR_Z), V(HALL_BOX.x0 + 0.6, 0, DOOR_Z), V(-6.8, 0, 1.45), V(RICE_DROP.x, 0, RICE_DROP.z - 0.1)];

export function hireRicePorter() {
  const g = new Person(0x4E7FBF);
  g.position.copy(STACK_STAND); scene.add(g);
  const p: Porter = {
    g, h: 0, speed: 3.3, moving: false, state: 'load', t: 0, wait: 0, path: [],
    back: new Holder(i => carrySlot(p, i), 12),
  };
  porter = p;
  ground(p);
  return g;
}

function updPorter(p: Porter, dt: number) {
  p.speed = pace(3.3);
  if (p.state === 'toStack' || p.state === 'toPot') {
    if (moveEnt(p, p.path[0], dt)) p.path.shift();
    if (!p.path.length) { p.state = p.state === 'toStack' ? 'load' : 'unload'; p.wait = 0; }
  } else if (p.state === 'load') {
    p.h = 0; p.t -= dt; p.wait += dt;
    if (p.t <= 0 && p.back.hasRoom() && fieldStack.items.length) {
      p.t = 0.08; p.back.receive(fieldStack.take()!, 0.25, 0.7); p.wait = 0;
    }
    if (!p.back.hasRoom() || (p.back.n > 0 && p.wait > 1.2 && !fieldStack.items.length)) {
      p.state = 'toPot'; p.path = TO_POT.map(v => v.clone());
    }
  } else {
    p.h = 0; p.t -= dt;
    if (p.t <= 0 && p.back.items.length && ricePot.hasRoom()) {
      p.t = 0.08; ricePot.receive(p.back.take()!, 0.25, 0.8);
    }
    if (p.back.n === 0) { p.state = 'toStack'; p.path = [...TO_POT].reverse().slice(1).concat([STACK_STAND]).map(v => v.clone()); }
  }
  ground(p);
  p.g.rotation.y = p.h;
  animPerson(p.g, p.moving, dt, p.back.n > 0);
  p.back.layout(p.h);
}

export function updRice(dt: number) {
  const g = boost('crew'); // the kitchen crew tends the terraces too
  for (const c of field.cells) if (!ripe(c)) setGrowth(c, c.grow + dt * g / GROW);
  if (farmer) updFarmer(farmer, dt);
  if (porter) updPorter(porter, dt);
}

/** For saving: bags harvested and not yet in the rice pot (the stack, and the porter's load). */
export const riceInField = () => fieldStack.n + (porter ? porter.back.n : 0);
