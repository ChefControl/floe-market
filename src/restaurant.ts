// The sushi restaurant west of the market: a conveyor-belt sushi bar. Steaks reach its kitchen by conveyor (or by
// hand), chefs slice them into plates that circle the bar, and well-dressed diners take plates off it as they pass.
import {
  BoxGeometry, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, Path, PlaneGeometry,
  RepeatWrapping, Shape, ShapeGeometry, Sprite, SpriteMaterial, type Object3D, type Vector3,
} from 'three';
import { drawBubble, patienceStep } from './bubble';
import { animPerson, moveEnt, Person, SUITS, type Walker } from './characters';
import { decal, drawDrop } from './decals';
import { fly, Holder } from './holder';
import { addBillValue, billValue, newBill, newPlate } from './items';
import { addReview, demand, starsFor } from './rating';
import { canvasTex, FONT, G, mat, mesh, rr, scene, type CanvasTex } from './render';
import { popStars, popText } from './ui';
import { d2xz, FY, pick, rand, randi, V, type XZ } from './util';
import { WEST_GATE } from './world';

// ---------- layout ----------
/** The building's floor. */
const FLOOR = { x0: -23, x1: -10.5, z0: -5, z1: 5 };
const CX = (FLOOR.x0 + FLOOR.x1) / 2;
/** Where the player can walk once it's built: the walkway from the market's west gate, and the dining room. */
export const AREAS = [
  { x0: -11.2, x1: -7.3, z0: WEST_GATE.z0 + 0.4, z1: WEST_GATE.z1 - 0.4 },
  { x0: FLOOR.x0 + 0.4, x1: FLOOR.x1 - 0.4, z0: FLOOR.z0 + 0.4, z1: FLOOR.z1 - 0.4 },
];
/** The bar is a stadium (two straights joined by half circles); R is the radius of the plate belt's centre line. */
const BAR = { x: -17, z: 0.3, L: 2.2, R: 1.1 };
const BAR_IN = 0.6, BAR_OUT = 1.75, BAR_H = 0.85, BELT_HALF = 0.22;
/** The kitchen counter fills the room's north-east corner; the conveyor feeds it through the east wall. */
const KITCHEN = { x0: -13.3, z1: -2.9 };
export const KITCHEN_DROP = V(-12.2, FY, -1.9);
/** Where diners' bills land, by the walkway. */
export const REGISTER = V(-11.4, 0, 3.9);
const ENTRANCE = V(-17, 0, 4.4), STREET = V(-17, 0, 28);
export const PLATE_PRICE = { standard: 12, premium: 20 };
/** Plate slots around the belt, and seconds for the belt to move one slot along. */
export const SLOTS = 18;
const STEP = 1.0;
const PERIM = 4 * BAR.L + 2 * Math.PI * BAR.R;
const SP = PERIM / SLOTS;
const SLICE = 1.2, EAT = 1.5, SPAWN_EVERY = 4;
/** Seconds a seated diner waits for each plate, in total, before giving up. */
export const PATIENCE = 30;

/** Point on the belt's centre line, `s` metres along it (starting at the north-west corner, running clockwise from above). */
function barPoint(s: number) {
  const { x, z, L, R } = BAR;
  s = ((s % PERIM) + PERIM) % PERIM;
  if (s < 2 * L) return V(x - L + s, 0, z - R);
  s -= 2 * L;
  if (s < Math.PI * R) { const a = -Math.PI / 2 + s / R; return V(x + L + R * Math.cos(a), 0, z + R * Math.sin(a)); }
  s -= Math.PI * R;
  if (s < 2 * L) return V(x + L - s, 0, z + R);
  const a = Math.PI / 2 + (s - 2 * L) / R;
  return V(x - L + R * Math.cos(a), 0, z + R * Math.sin(a));
}

/** Index of the slot position nearest a point. */
function slotNear(p: XZ) {
  let best = 0, bd = Infinity;
  for (let q = 0; q < SLOTS; q++) {
    const d = d2xz(barPoint(q * SP), p);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}

const axisX = (x: number) => Math.min(BAR.x + BAR.L, Math.max(BAR.x - BAR.L, x));
const inside = (p: XZ) => p.x > FLOOR.x0 && p.x < FLOOR.x1 && p.z > FLOOR.z0 && p.z < FLOOR.z1;

// ---------- state ----------
interface Seat {
  /** Where the diner sits (y raised onto the stool). */
  pos: Vector3;
  h: number;
  /** Slot position in front of the seat. */
  q: number;
  /** Spot on the counter where the diner's plates stack up. */
  ledge: Vector3;
  /** Walking route from the entrance. */
  via: Vector3[];
  diner: Diner | null;
}

interface Chef {
  g: Person;
  q: number;
  board: Vector3;
  state: 'idle' | 'fetch' | 'slice' | 'ready';
  t: number;
  steak: Mesh | null;
  plate: Mesh | null;
}

export interface Diner extends Walker {
  g: Person;
  seat: Seat;
  state: 'walk' | 'wait' | 'eat' | 'leave';
  want: number;
  /** Prices of the plates eaten so far, paid on the way out. */
  bill: number[];
  /** Seconds spent waiting for plates. */
  wait: number;
  t: number;
  path: Vector3[];
  plate: Mesh | null;
  /** Empty plates stacked on the counter. */
  stack: Mesh[];
  bubble: Sprite;
  bt: CanvasTex;
  drawn: number;
}

export const sushi = {
  built: false,
  premium: false,
  /** Plates riding the belt, by slot. */
  slots: Array<Mesh | null>(SLOTS).fill(null),
  /** Slots moved so far (mod SLOTS), and time into the current move. */
  offset: 0,
  t: 0,
  seats: [] as Seat[],
  chefs: [] as Chef[],
  diners: [] as Diner[],
  spawnT: 3,
};

export const kitchen = new Holder(i => {
  const j = i % 9;
  return V(-12.2 + ((j % 3) - 1) * 0.42, FY + 0.93 + Math.floor(i / 9) * 0.085, -3.7 + (Math.floor(j / 3) - 1) * 0.4);
}, 36);

export const register = new Holder(i => {
  const j = i % 6;
  return V(REGISTER.x + ((j % 2) - 0.5) * 0.44, FY + 0.03 + Math.floor(i / 6) * 0.065, REGISTER.z + (Math.floor(j / 2) - 1) * 0.28);
}, 90);

const dropPad = decal(1.6, (c, w, h) => drawDrop(c, w, h, '🥩'));
dropPad.mesh.position.set(KITCHEN_DROP.x, FY + 0.01, KITCHEN_DROP.z);
dropPad.mesh.visible = false;

const price = () => sushi.premium ? PLATE_PRICE.premium : PLATE_PRICE.standard;
const slotAt = (q: number) => (((q - sushi.offset) % SLOTS) + SLOTS) % SLOTS;
function slotPos(j: number) {
  const p = barPoint((j + sushi.offset + sushi.t / STEP) * SP);
  p.y = FY + BAR_H + 0.03;
  return p;
}

// ---------- building ----------
function stadium(p: Path, r: number) {
  const { L } = BAR;
  p.moveTo(-L, -r); p.lineTo(L, -r);
  p.absarc(L, 0, r, -Math.PI / 2, Math.PI / 2, false);
  p.lineTo(-L, r);
  p.absarc(-L, 0, r, Math.PI / 2, Math.PI * 1.5, false);
}
function ring(r0: number, r1: number) {
  const s = new Shape(); stadium(s, r1);
  const hole = new Path(); stadium(hole, r0); s.holes.push(hole);
  return s;
}

const tatami = canvasTex(128, 128, (c, w, h) => {
  c.fillStyle = '#D9CF9A'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#8A7A40'; c.lineWidth = 4;
  c.strokeRect(2, 2, w - 4, h / 2 - 4); c.strokeRect(2, h / 2 + 2, w / 2 - 4, h / 2 - 4); c.strokeRect(w / 2 + 2, h / 2 + 2, w / 2 - 4, h / 2 - 4);
});
tatami.tex.wrapS = tatami.tex.wrapT = RepeatWrapping;
tatami.tex.repeat.set((FLOOR.x1 - FLOOR.x0) / 2.5, (FLOOR.z1 - FLOOR.z0) / 2.5);

const shoji = canvasTex(128, 128, (c, w, h) => {
  c.fillStyle = '#F7F1E3'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#6B3E26'; c.lineWidth = 4;
  for (let i = 1; i < 4; i++) {
    c.beginPath(); c.moveTo(i * w / 4, 0); c.lineTo(i * w / 4, h); c.stroke();
    c.beginPath(); c.moveTo(0, i * h / 4); c.lineTo(w, i * h / 4); c.stroke();
  }
  c.lineWidth = 12; c.strokeRect(0, 0, w, h);
});
shoji.tex.wrapS = RepeatWrapping;
function shojiMat(len: number) {
  const t = shoji.tex.clone(); t.repeat.set(len / 2, 1); t.needsUpdate = true;
  return new MeshLambertMaterial({ map: t });
}

const sign = canvasTex(512, 128, (c, w, h) => {
  c.fillStyle = '#8E2B2B'; rr(c, 4, 4, w - 8, h - 8, 26); c.fill();
  c.strokeStyle = '#F2C14E'; c.lineWidth = 6; rr(c, 12, 12, w - 24, h - 24, 20); c.stroke();
  c.fillStyle = '#FFF4E6'; c.font = '800 64px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('🍣 Floe Sushi', w / 2, h / 2 + 4);
});

const DARK = 0x5B3A26, RAIL = 0x7A3B2E;

/** Floor, walls, bar and kitchen, in a group centred on the building so it can pop in. */
function buildHall() {
  const outer = new Group(); outer.position.set(CX, 0, 0);
  const g = new Group(); g.position.set(-CX, 0, 0); outer.add(g);
  const box = (w: number, h: number, d: number, c: number, x: number, y: number, z: number) => {
    const m = mesh(new BoxGeometry(w, h, d), c, x, y, z, true); g.add(m); return m;
  };
  const W = FLOOR.x1 - FLOOR.x0, D = FLOOR.z1 - FLOOR.z0, WH = 2.2;

  const side = mat(DARK);
  const floor = new Mesh(new BoxGeometry(W, 0.3, D), [side, side, new MeshLambertMaterial({ map: tatami.tex }), side, side, side]);
  floor.position.set(CX, 0, 0); floor.receiveShadow = true; g.add(floor);
  // walkway from the deck's edge (x = -8) to the door
  box(-8 - FLOOR.x1, 0.3, WEST_GATE.z1 - WEST_GATE.z0 - 0.4, 0xC3875D, (FLOOR.x1 - 8) / 2, 0, (WEST_GATE.z0 + WEST_GATE.z1) / 2);

  // back walls (shoji screens), eaves, sign and lanterns
  const wood = mat(DARK);
  const north = new Mesh(new BoxGeometry(W, WH, 0.2), [wood, wood, wood, wood, shojiMat(W), wood]);
  north.position.set(CX, FY + WH / 2, FLOOR.z0 + 0.1); north.castShadow = north.receiveShadow = true; g.add(north);
  const west = new Mesh(new BoxGeometry(0.2, WH, D), [shojiMat(D), wood, wood, wood, wood, wood]);
  west.position.set(FLOOR.x0 + 0.1, FY + WH / 2, 0); west.castShadow = west.receiveShadow = true; g.add(west);
  box(W + 0.5, 0.18, 0.9, 0x3B2A20, CX, FY + WH + 0.09, FLOOR.z0 + 0.3);
  box(0.9, 0.18, D + 0.5, 0x3B2A20, FLOOR.x0 + 0.3, FY + WH + 0.09, 0);
  const s = new Mesh(new PlaneGeometry(3.6, 0.9), new MeshBasicMaterial({ map: sign.tex, transparent: true }));
  s.position.set(CX, FY + 1.6, FLOOR.z0 + 0.22); g.add(s);
  const glow = new MeshLambertMaterial({ color: 0xE0392B, emissive: 0x5A0E08 });
  for (const x of [-21.6, -19.6, -13.9, -11.9]) {
    const l = mesh(G.sphere, glow, x, FY + 1.5, FLOOR.z0 + 0.45, true); l.scale.set(0.22, 0.3, 0.22); g.add(l);
    const cap = mesh(G.cyl, 0x1B2430, x, FY + 1.82, FLOOR.z0 + 0.45); cap.scale.set(0.12, 0.06, 0.12); g.add(cap);
  }

  // low rails along the open sides, with gaps for the entrance and the walkway
  const rail = (x0: number, z0: number, x1: number, z1: number) =>
    box(Math.max(0.1, x1 - x0), 0.45, Math.max(0.1, z1 - z0), RAIL, (x0 + x1) / 2, FY + 0.22, (z0 + z1) / 2);
  rail(FLOOR.x0, FLOOR.z1 - 0.1, ENTRANCE.x - 0.9, FLOOR.z1);
  rail(ENTRANCE.x + 0.9, FLOOR.z1 - 0.1, FLOOR.x1, FLOOR.z1);
  rail(FLOOR.x1 - 0.1, KITCHEN.z1, FLOOR.x1, WEST_GATE.z0 + 0.2);
  rail(FLOOR.x1 - 0.1, WEST_GATE.z1 - 0.2, FLOOR.x1, FLOOR.z1);

  // the bar: a counter ring with the plate belt set into its top
  const counter = new Mesh(
    new ExtrudeGeometry(ring(BAR_IN, BAR_OUT), { depth: BAR_H, bevelEnabled: false, curveSegments: 16 }),
    [mat(0xE9D9C0), mat(RAIL)],
  );
  counter.rotation.x = -Math.PI / 2; counter.position.set(BAR.x, FY, BAR.z);
  counter.castShadow = counter.receiveShadow = true; g.add(counter);
  const belt = new Mesh(new ShapeGeometry(ring(BAR.R - BELT_HALF, BAR.R + BELT_HALF), 16), mat(0x3C4C58));
  belt.rotation.x = -Math.PI / 2; belt.position.set(BAR.x, FY + BAR_H + 0.005, BAR.z); g.add(belt);

  // kitchen counter, and the register desk by the walkway
  const kw = FLOOR.x1 - KITCHEN.x0, kd = KITCHEN.z1 - FLOOR.z0;
  box(kw, 0.9, kd, 0xB8C4CC, KITCHEN.x0 + kw / 2, FY + 0.45, FLOOR.z0 + kd / 2);
  box(kw + 0.06, 0.04, kd + 0.06, 0xE9EEF2, KITCHEN.x0 + kw / 2, FY + 0.91, FLOOR.z0 + kd / 2);
  box(0.9, 0.8, 0.5, 0x8E2B2B, REGISTER.x, FY + 0.4, REGISTER.z + 0.6);
  box(0.94, 0.05, 0.54, 0xF2C14E, REGISTER.x, FY + 0.82, REGISTER.z + 0.6);
  return { outer, g };
}

function stool(x: number, z: number) {
  const g = new Group(); g.position.set(x, FY, z);
  const leg = mesh(G.cyl, 0x2C3A47, 0, 0.23, 0, true); leg.scale.set(0.06, 0.46, 0.06); g.add(leg);
  const top = mesh(G.cyl, 0xC0392B, 0, 0.49, 0, true); top.scale.set(0.22, 0.07, 0.22); g.add(top);
  return g;
}

// ---------- seats ----------
const ROW = 2.05, AISLE_E = -12.1, AISLE_W = -21.9, FRONT = 3.4, BACK = -2.6;
const END_X = ROW * Math.cos(Math.PI / 6), END_Z = ROW * Math.sin(Math.PI / 6);
type SeatSpec = [x: number, z: number, via: XZ[]];
const FIRST_SEATS: SeatSpec[] = [
  ...[-18.5, -17, -15.5].map((x): SeatSpec => [x, BAR.z + ROW, [{ x, z: FRONT }]]),
  ...[-18.5, -17, -15.5].map((x): SeatSpec => [x, BAR.z - ROW, [{ x: AISLE_E, z: FRONT }, { x: AISLE_E, z: BACK }, { x, z: BACK }]]),
];
const MORE_SEATS: SeatSpec[] = [1, -1].flatMap(s => [
  [BAR.x + BAR.L + END_X, BAR.z + s * END_Z, [{ x: AISLE_E, z: FRONT }, { x: AISLE_E, z: BAR.z + s * END_Z }]] as SeatSpec,
  [BAR.x - BAR.L - END_X, BAR.z + s * END_Z, [{ x: AISLE_W, z: FRONT }, { x: AISLE_W, z: BAR.z + s * END_Z }]] as SeatSpec,
]);

/** A seat facing the bar, and its stool. */
function addSeat([x, z, via]: SeatSpec) {
  const ax = axisX(x), dx = x - ax, dz = z - BAR.z, d = Math.hypot(dx, dz);
  sushi.seats.push({
    pos: V(x, FY + 0.25, z), h: Math.atan2(-dx, -dz),
    q: slotNear({ x: ax + dx / d * BAR.R, z: BAR.z + dz / d * BAR.R }),
    ledge: V(ax + dx / d * 1.55, FY + BAR_H + 0.02, BAR.z + dz / d * 1.55),
    via: via.map(p => V(p.x, 0, p.z)), diner: null,
  });
  return stool(x, z);
}

// ---------- chefs ----------
const CHEF_X = [-16.25, -17.75];

function addChef() {
  const x = CHEF_X[sushi.chefs.length];
  const g = new Person(0xF4F6F8, 'chef');
  g.position.set(x, FY, BAR.z - 0.05);
  g.add(mesh(new BoxGeometry(0.5, 0.04, 0.26), 0xE9D9C0, 0, BAR_H + 0.02, 0.79, true));
  for (const a of g.arms) a.rotation.x = -0.9;
  scene.add(g);
  sushi.chefs.push({
    g, q: slotNear({ x, z: BAR.z + BAR.R }), board: V(x, FY + BAR_H + 0.07, BAR.z + 0.74),
    state: 'idle', t: 0, steak: null, plate: null,
  });
  return g;
}

function updChef(c: Chef, dt: number) {
  if (c.state === 'idle' && kitchen.items.length) {
    const m = kitchen.take()!;
    c.steak = m; c.state = 'fetch';
    fly(m, () => c.board, 0.45, 1.2, () => { c.state = 'slice'; c.t = SLICE; });
  } else if (c.state === 'slice') {
    c.t -= dt;
    if (c.t <= 0) {
      scene.remove(c.steak!); c.steak = null;
      const p = newPlate(price(), sushi.premium);
      p.position.copy(c.board); scene.add(p);
      c.plate = p; c.state = 'ready';
    }
  }
  c.g.arms[1].rotation.x = c.state === 'slice' ? -0.9 - Math.abs(Math.sin(c.t * 18)) * 0.7 : -0.9;
}

// ---------- diners ----------
function spawnDiner() {
  const free = sushi.seats.filter(s => !s.diner);
  if (!free.length) return;
  const seat = pick(free);
  const g = new Person(pick(SUITS), 'fancy');
  g.position.copy(STREET); scene.add(g);
  const want = randi(2, 4);
  const bt = canvasTex(128, 128, (c, w, h) => drawBubble(c, w, h, want, 1, 'sushi'));
  const sp = new Sprite(new SpriteMaterial({ map: bt.tex, depthTest: false }));
  sp.scale.set(0.8, 0.8, 1); sp.position.set(0, 1.95, 0); sp.renderOrder = 5; sp.visible = false;
  g.add(sp);
  const d: Diner = {
    g, h: Math.PI, speed: 2.2, moving: false, seat, state: 'walk', want, bill: [], wait: 0, t: 0,
    path: [ENTRANCE.clone(), ...seat.via.map(v => v.clone()), V(seat.pos.x, 0, seat.pos.z)],
    plate: null, stack: [], bubble: sp, bt, drawn: -1,
  };
  seat.diner = d;
  sushi.diners.push(d);
}

const ledgeAt = (d: Diner, i: number) => V(d.seat.ledge.x, d.seat.ledge.y + i * 0.04, d.seat.ledge.z);

function sit(d: Diner) {
  d.state = 'wait'; d.moving = false;
  d.g.position.copy(d.seat.pos); d.h = d.seat.h;
}

function take(d: Diner, p: Mesh) {
  d.plate = p; d.state = 'eat'; d.t = EAT;
  const i = d.stack.length;
  fly(p, () => ledgeAt(d, i), 0.35, 0.5);
}

/** Done with a plate: it joins the stack of empties. Returns true if that was the last one and they've left. */
function finishPlate(d: Diner) {
  const p = d.plate!;
  d.plate = null;
  p.clear();
  d.bill.push(p.userData.value);
  d.stack.push(p);
  if (d.bill.length < d.want) { d.state = 'wait'; return false; }
  leave(d, starsFor(1 - d.wait / PATIENCE));
  return true;
}

/** Bills for each plate fly from the diner to the register. */
function payBills(values: number[], from: Vector3) {
  const at = from.clone(); at.y = 1.3;
  values.forEach((v, i) => {
    const b = newBill(v); b.position.copy(at);
    if (register.hasRoom()) register.receive(b, 0.45 + i * 0.05, 1.2);
    else {
      const top = register.items[register.items.length - 1];
      if (top) addBillValue(top, v); else register.receive(b, 0.45, 1.2);
    }
  });
  popText('+$' + values.reduce((a, v) => a + v, 0), REGISTER);
}

/** Pays for what was eaten, reviews the place and heads home. */
function leave(d: Diner, stars: number) {
  d.state = 'leave'; d.seat.diner = null; d.bubble.visible = false;
  if (d.bill.length) payBills(d.bill, d.g.position);
  addReview(stars); popStars(stars, d.g.position);
  d.stack.forEach(p => scene.remove(p));
  d.stack = []; d.bill = [];
  d.path = [...d.seat.via].reverse().map(v => v.clone()).concat([ENTRANCE.clone(), STREET.clone()]);
}

function updDiner(d: Diner, dt: number) {
  const g = d.g;
  if (d.state === 'walk' || d.state === 'leave') {
    if (moveEnt(d, d.path[0], dt)) d.path.shift();
    g.position.y = inside(g.position) ? FY : 0;
    g.rotation.y = d.h;
    animPerson(g, d.moving, dt, false);
    if (!d.path.length) {
      if (d.state === 'walk') sit(d);
      else { scene.remove(g); d.bt.tex.dispose(); d.bubble.material.dispose(); sushi.diners.splice(sushi.diners.indexOf(d), 1); }
    }
    return;
  }
  if (d.state === 'wait') {
    d.wait += dt;
    if (d.wait >= PATIENCE) { leave(d, 1); return; }
    const left = 1 - d.wait / PATIENCE, key = (d.want - d.bill.length) * 100 + patienceStep(left);
    if (key !== d.drawn) {
      d.drawn = key;
      drawBubble(d.bt.ctx, 128, 128, d.want - d.bill.length, left, 'sushi');
      d.bt.tex.needsUpdate = true;
    }
  } else {
    d.t -= dt;
    if (d.t <= 0 && finishPlate(d)) return;
  }
  // seated: legs forward, hands on the counter, or fork-to-mouth while eating
  g.rotation.y = d.h;
  d.bubble.visible = d.state === 'wait';
  for (const l of g.legs) l.rotation.x = -1.45;
  g.arms[0].rotation.x = d.state === 'eat' ? -1.9 + Math.sin(d.t * 14) * 0.35 : -0.6;
  g.arms[1].rotation.x = -0.6;
}

// ---------- belt ----------
/** Moves the belt one slot: diners take plates passing in front of them, chefs put new ones on empty slots. */
function stepBelt() {
  sushi.offset = (sushi.offset + 1) % SLOTS;
  for (const d of sushi.diners) {
    if (d.state !== 'wait') continue;
    const j = slotAt(d.seat.q), p = sushi.slots[j];
    if (p && !p.userData.flying) { sushi.slots[j] = null; take(d, p); }
  }
  for (const c of sushi.chefs) {
    const j = slotAt(c.q);
    if (!c.plate || sushi.slots[j]) continue;
    const p = c.plate;
    c.plate = null; c.state = 'idle';
    sushi.slots[j] = p; p.userData.flying = true;
    fly(p, () => slotPos(j), 0.3, 0.5, () => { p.userData.flying = false; });
  }
}

export function updRestaurant(dt: number) {
  if (!sushi.built) return;
  sushi.spawnT -= dt;
  if (sushi.spawnT <= 0) {
    sushi.spawnT = SPAWN_EVERY * rand(.7, 1.3) / demand();
    spawnDiner();
  }
  sushi.t += dt;
  while (sushi.t >= STEP) { sushi.t -= STEP; stepBelt(); }
  sushi.slots.forEach((p, j) => { if (p && !p.userData.flying) p.position.copy(slotPos(j)); });
  sushi.chefs.forEach(c => updChef(c, dt));
  [...sushi.diners].forEach(d => updDiner(d, dt));
}

// ---------- unlocks ----------
/** The 'sushi' unlock: builds the restaurant with six seats and one chef. Returns what should pop in. */
export function openRestaurant(): Object3D[] {
  sushi.built = true;
  const hall = buildHall();
  FIRST_SEATS.forEach(s => hall.g.add(addSeat(s)));
  scene.add(hall.outer);
  dropPad.mesh.visible = true;
  return [hall.outer, addChef()];
}

/** The 'seats' unlock: four more seats round the ends of the bar. */
export function addSeats() {
  return MORE_SEATS.map(s => { const g = addSeat(s); scene.add(g); return g; });
}

/** The 'chef' unlock: a second chef. */
export const hireChef = () => addChef();

/** The 'premium' unlock: new plates are the premium menu. */
export function setPremium() { sushi.premium = true; }

// ---------- player ----------
/** Keeps the player out of the bar and the kitchen counter. */
export function collide(p: Vector3) {
  if (!sushi.built || p.x > FLOOR.x1) return;
  const ax = axisX(p.x), dx = p.x - ax, dz = p.z - BAR.z, d = Math.hypot(dx, dz), r = BAR_OUT + 0.3;
  if (d < r) {
    if (d < 1e-6) p.z = BAR.z + r;
    else { p.x = ax + dx / d * r; p.z = BAR.z + dz / d * r; }
  }
  const kx = KITCHEN.x0 - 0.3, kz = KITCHEN.z1 + 0.3;
  if (p.x > kx && p.z < kz) {
    if (p.x - kx < kz - p.z) p.x = kx; else p.z = kz;
  }
}

// ---------- saving ----------
/** For saving: steaks waiting to become sushi, plates made, and cash owed (register plus diners' unpaid bills). */
export function sushiStock() {
  return {
    steaks: kitchen.n + sushi.chefs.filter(c => c.steak).length,
    plates: sushi.slots.filter(Boolean).length + sushi.chefs.filter(c => c.plate).length + sushi.diners.filter(d => d.plate).length,
    cash: register.all().reduce((s, b) => s + billValue(b), 0) + sushi.diners.reduce((s, d) => s + d.bill.reduce((a, v) => a + v, 0), 0),
  };
}

/** Puts saved plates back on the belt, one per slot. Returns how many didn't fit. */
export function loadPlates(n: number) {
  const k = Math.min(n, SLOTS);
  for (let j = 0; j < k; j++) {
    const p = newPlate(price(), sushi.premium);
    p.position.copy(slotPos(j)); scene.add(p);
    sushi.slots[j] = p;
  }
  return n - k;
}
