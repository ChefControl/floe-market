// Floe Sushi (stage 2): the conveyor-belt sushi bar. Fish slices and bags of rice are dropped off at the kitchen
// line facing the dock; the prep cooks there toss one of each to a chef standing inside the bar, who makes a
// plate and puts it on the belt circling them. Well-dressed diners come in through the front gate, sit at the
// bar, take plates as they pass, and pay at the register on the way out. Chefs also pack boxes for the takeout
// kiosk.
import {
  BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Mesh, MeshPhongMaterial, Shape, ShapeGeometry, Sprite,
  SpriteMaterial, type Object3D, type Path, type Vector3,
} from 'three';
import { drawBubble, patienceStep } from './bubble';
import { animPerson, moveEnt, Person, SUITS, type Walker } from './characters';
import { TAKEOUT } from './counters';
import { decal, drawDrop } from './decals';
import { boost, PREMIUM, priced, SUSHI_PRICE } from './economy';
import { fly, Holder } from './holder';
import { addBillValue, billValue, newBill, newBox, newPlate, newRice } from './items';
import { inHall, pushOutOfBox } from './layout';
import { addReview, demand, starsFor } from './rating';
import { canvasTex, G, mat, mesh, scene, type CanvasTex } from './render';
import { pile } from './stations';
import { popStars, popText } from './ui';
import { d2xz, FY, pick, rand, randi, V, type XZ } from './util';

// ---------- layout ----------
/** The bar is a stadium (two straights joined by half circles); R is the radius of the plate belt's centre line. */
const BAR = { x: 0, z: 9.0, L: 4.2, R: 1.25 };
/** The counter's inner edge (chefs stand inside it) and outer edge, its height and the belt's half-width. */
const BAR_IN = 0.7, BAR_OUT = 1.95, BAR_H = 0.85, BELT_HALF = 0.22;
/** Where diners sit, and where their empty plates stack, as distances from the bar's centre line. */
const SEAT_R = 2.45, LEDGE_R = 1.7;
/** The kitchen line along the north side, facing the dock: fish on its east half, rice on the west half. */
export const KITCHEN = { x: 0, z: 2.6, w: 12, d: 1.0, h: 0.8 };
export const FISH_DROP = V(2.6, FY, 1.05);
export const RICE_DROP = V(-2.6, FY, 1.05);
/** Where diners' bills land, by the gate; the register desk is behind it. */
export const REGISTER = V(6.0, 0, 13.7);
const DESK = { x: 7.6, z: 14.3, w: 1.2, d: 0.6 };
const STREET = V(0.5, 0, 34), GARDEN = V(0.4, 0, 18.6), GATE = V(0.2, 0, 15.6), ENTRANCE = V(0, 0, 14.0);
const HOME = [V(-0.4, 0, 18.6), V(-0.6, 0, 34)];
/** Plate slots around the belt, and seconds for the belt to move one slot along. */
export const SLOTS = 30;
const STEP = 1.0;
const PERIM = 4 * BAR.L + 2 * Math.PI * BAR.R;
const SP = PERIM / SLOTS;
const SLICE = 0.8, EAT = 1.5, SPAWN_EVERY = 3.5;
/** Seconds a seated diner waits for plates, in total, before giving up. */
export const PATIENCE = 40;
/** Rice delivered with the restaurant, so the first plates can be made before there's money for more. */
export const STARTER_RICE = 6;

/** Point on the belt's centre line, `s` metres along it (from the north-west corner, clockwise seen from above). */
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
  /** Fish and rice on their way to (or on) the board. */
  parts: Mesh[];
  landed: number;
  plate: Mesh | null;
}

/** A cook at the kitchen line, who tosses fish or rice to the chefs. */
interface Cook { g: Person; t: number }

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
  /** The restaurant is open (stage 2). */
  built: false,
  premium: false,
  /** Plates riding the belt, by slot. */
  slots: Array<Mesh | null>(SLOTS).fill(null),
  /** Slots moved so far (mod SLOTS), and time into the current move. */
  offset: 0,
  t: 0,
  seats: [] as Seat[],
  chefs: [] as Chef[],
  cooks: [] as Cook[],
  diners: [] as Diner[],
  spawnT: 3,
  /** Alternates plates and takeout boxes. */
  flip: false,
  /** Plates' worth of rice left in the bag the chefs have open: a bag makes two. */
  portions: 0,
};

/** Fish slices waiting on the kitchen line's east half. */
export const fishTray = new Holder(i => {
  const j = i % 12;
  return V(FISH_DROP.x + ((j % 4) - 1.5) * 0.42, FY + KITCHEN.h + 0.04 + Math.floor(i / 12) * 0.085, KITCHEN.z + (Math.floor(j / 4) - 1) * 0.28);
}, 48);
/** Rice bags on the west half. */
export const ricePot = new Holder(i => {
  const j = i % 8;
  return V(RICE_DROP.x + ((j % 4) - 1.5) * 0.34, FY + KITCHEN.h + 0.04 + Math.floor(i / 8) * 0.085, KITCHEN.z + (Math.floor(j / 4) - 0.5) * 0.3);
}, 48);
export const register = new Holder(i => {
  const j = i % 6;
  return V(REGISTER.x + ((j % 2) - 0.5) * 0.44, FY + 0.03 + Math.floor(i / 6) * 0.065, REGISTER.z + (Math.floor(j / 2) - 1) * 0.28);
}, 90);

const pads = [
  decal(1.3, (c, w, h) => drawDrop(c, w, h, '🐟')), decal(1.3, (c, w, h) => drawDrop(c, w, h, '🍚')),
];
pads.forEach((d, i) => {
  const at = i ? RICE_DROP : FISH_DROP;
  d.mesh.position.set(at.x, FY + 0.01, at.z); d.mesh.visible = false;
});

/** How much more sushi sells for: Chef's specials, and the premium menu. */
export const sushiBoost = () => boost('specials') * (sushi.premium ? PREMIUM : 1);
/** What a plate made now sells for. */
export const platePrice = () => priced(SUSHI_PRICE.plate, sushiBoost());
/** Updates the takeout boxes' price to match. */
export const repriceSushi = () => { TAKEOUT.price = priced(SUSHI_PRICE.box, sushiBoost()); };
const slotAt = (q: number) => (((q - sushi.offset) % SLOTS) + SLOTS) % SLOTS;
function slotPos(j: number) {
  const p = barPoint((j + sushi.offset + sushi.t / STEP) * SP);
  p.y = FY + BAR_H + 0.03;
  return p;
}

// ---------- furniture ----------
function stadium(p: Path, r: number) {
  const { L } = BAR;
  p.moveTo(-L, -r); p.lineTo(L, -r);
  p.absarc(L, 0, r, -Math.PI / 2, Math.PI / 2, false);
  p.lineTo(-L, r);
  p.absarc(-L, 0, r, Math.PI / 2, Math.PI * 1.5, false);
}
function ring(r0: number, r1: number) {
  const s = new Shape(); stadium(s, r1);
  const hole = new Shape(); stadium(hole, r0); s.holes.push(hole);
  return s;
}
function group(x: number, z: number) {
  const g = new Group(); g.position.set(x, 0, z); g.visible = false; scene.add(g);
  return g;
}

/** The bar with its belt. */
const bar = group(BAR.x, BAR.z);
{
  const counter = new Mesh(
    new ExtrudeGeometry(ring(BAR_IN, BAR_OUT), { depth: BAR_H, bevelEnabled: false, curveSegments: 18 }),
    [mat(0xE9D9C0), mat(0x7A3B2E)],
  );
  counter.rotation.x = -Math.PI / 2; counter.position.y = FY;
  counter.castShadow = counter.receiveShadow = true; bar.add(counter);
  const belt = new Mesh(new ShapeGeometry(ring(BAR.R - BELT_HALF, BAR.R + BELT_HALF), 18), mat(0x3C4C58));
  belt.rotation.x = -Math.PI / 2; belt.position.y = FY + BAR_H + 0.005; bar.add(belt);
}

/** The kitchen line: a long steel counter with a glass case of fish in the middle, rice cookers and a whole tuna. */
const kitchen = group(KITCHEN.x, KITCHEN.z);
{
  kitchen.add(mesh(new BoxGeometry(KITCHEN.w, KITCHEN.h, KITCHEN.d), 0xB8C4CC, 0, FY + KITCHEN.h / 2, 0, true));
  kitchen.add(mesh(new BoxGeometry(KITCHEN.w + 0.06, 0.05, KITCHEN.d + 0.06), 0xE9EEF2, 0, FY + KITCHEN.h + 0.01, 0, true));
  const glass = new MeshPhongMaterial({ color: 0xCFEFFA, transparent: true, opacity: .35, shininess: 100 });
  kitchen.add(mesh(new BoxGeometry(2.4, 0.42, 0.7), glass, 0, FY + KITCHEN.h + 0.25, 0));
  [0xFF8A5C, 0xD8394B, 0xFFD24A, 0xFF8A5C, 0xD8394B, 0xFFD24A].forEach((c, i) => {
    kitchen.add(mesh(new BoxGeometry(0.32, 0.06, 0.24), c, -0.95 + i * 0.38, FY + KITCHEN.h + 0.07, 0));
  });
  for (const x of [-5.3, -4.4]) {
    kitchen.add(mesh(new CylinderGeometry(0.38, 0.34, 0.5, 18), 0x9AA9B4, x, FY + KITCHEN.h + 0.27, 0, true));
    kitchen.add(mesh(new CylinderGeometry(0.4, 0.4, 0.06, 18), 0x5B6B78, x, FY + KITCHEN.h + 0.55, 0));
  }
  kitchen.add(mesh(new BoxGeometry(1.5, 0.05, 0.6), 0xE9D9C0, 4.9, FY + KITCHEN.h + 0.05, 0, true));
  const tuna = mesh(G.sphere, 0x355C9E, 4.9, FY + KITCHEN.h + 0.2, 0, true); tuna.scale.set(0.62, 0.18, 0.2); kitchen.add(tuna);
  const tail = mesh(G.tail, 0x2B4C86, 4.2, FY + KITCHEN.h + 0.2, 0); tail.rotation.z = Math.PI / 2; tail.scale.z = 0.3; kitchen.add(tail);
}

/** The register desk. */
const desk = group(DESK.x, DESK.z);
desk.add(mesh(new BoxGeometry(DESK.w, 0.8, DESK.d), 0x8E2B2B, 0, FY + 0.4, 0, true));
desk.add(mesh(new BoxGeometry(DESK.w + 0.04, 0.05, DESK.d + 0.04), 0xF2C14E, 0, FY + 0.82, 0, true));
desk.add(mesh(new BoxGeometry(0.4, 0.3, 0.3), 0x22303C, 0.2, FY + 1.0, 0, true));

function stool(x: number, z: number) {
  const g = new Group(); g.position.set(x, FY, z);
  const leg = mesh(G.cyl, 0x2C3A47, 0, 0.23, 0, true); leg.scale.set(0.06, 0.46, 0.06); g.add(leg);
  const top = mesh(G.cyl, 0xC0392B, 0, 0.49, 0, true); top.scale.set(0.22, 0.07, 0.22); g.add(top);
  scene.add(g);
  return g;
}

// ---------- seats ----------
/** Stools along both sides of the bar; the restaurant opens with the middle ten. */
const SEAT_X = [-4.2, -3.15, -2.1, -1.05, 0, 1.05, 2.1, 3.15, 4.2];
const AISLE = 7.4, NORTH_WALK = 5.3, SOUTH_WALK = 12.9;
type SeatSpec = [x: number, side: -1 | 1];
const rows = (xs: number[]): SeatSpec[] => xs.flatMap((x): SeatSpec[] => [[x, 1], [x, -1]]);
const FIRST_SEATS = rows(SEAT_X.slice(2, 7));
const MORE_SEATS = rows([...SEAT_X.slice(0, 2), ...SEAT_X.slice(7)]);

/** A seat facing the bar (side -1 is the north row), its stool, and the way there from the entrance. */
function addSeat([x, side]: SeatSpec) {
  const z = BAR.z + side * SEAT_R, aisle = x < 0 ? -AISLE : AISLE;
  const via = side > 0 ? [V(x, 0, SOUTH_WALK)] : [V(aisle, 0, SOUTH_WALK), V(aisle, 0, NORTH_WALK), V(x, 0, NORTH_WALK)];
  sushi.seats.push({
    pos: V(x, FY + 0.25, z), h: side > 0 ? Math.PI : 0,
    q: slotNear({ x: axisX(x), z: BAR.z + side * BAR.R }),
    ledge: V(x, FY + BAR_H + 0.02, BAR.z + side * LEDGE_R),
    via, diner: null,
  });
  return stool(x, z);
}

// ---------- kitchen staff ----------
/** Chefs stand inside the bar; the first faces the kitchen line, the others the front. */
const CHEF_SPOTS = [{ x: 0, side: -1 }, { x: -2.4, side: 1 }, { x: 2.4, side: 1 }];

function addChef() {
  const { x, side } = CHEF_SPOTS[sushi.chefs.length];
  const g = new Person(0xF4F6F8, 'chef');
  g.position.set(x, FY, BAR.z); g.rotation.y = side < 0 ? Math.PI : 0;
  for (const a of g.arms) a.rotation.x = -0.9;
  const board = mesh(new BoxGeometry(0.5, 0.04, 0.22), 0xE9D9C0, 0, BAR_H + 0.02, 0.86, true);
  g.add(board);
  scene.add(g);
  sushi.chefs.push({
    g, q: slotNear({ x, z: BAR.z + side * BAR.R }), board: V(x, FY + BAR_H + 0.07, BAR.z + side * 0.86),
    state: 'idle', t: 0, parts: [], landed: 0, plate: null,
  });
  return g;
}

/** The two cooks behind the kitchen line, one at the fish and one at the rice. */
function addCooks() {
  return [FISH_DROP, RICE_DROP].map(at => {
    const g = new Person(0xF4F6F8, 'chef');
    g.position.set(at.x, FY, KITCHEN.z + KITCHEN.d / 2 + 0.65); g.rotation.y = Math.PI;
    scene.add(g);
    sushi.cooks.push({ g, t: 0 });
    return g;
  });
}

function updCook(c: Cook, dt: number) {
  c.t = Math.max(0, c.t - dt);
  // a throwing swing while tossing, otherwise hands over the counter
  c.g.arms[1].rotation.x = c.t > 0 ? -0.9 - Math.sin((1 - c.t / 0.35) * Math.PI) * 1.6 : -0.9;
  c.g.arms[0].rotation.x = -0.9;
}

/**
 * Boxes the kiosk could use: what the snowmobiles queuing there still want, plus a few in stock for the next one,
 * less what's there. Chefs pack boxes (every other order) only while it's short, so plates keep coming for diners.
 */
function boxesWanted() {
  if (!TAKEOUT.enabled || !TAKEOUT.stock.hasRoom()) return 0;
  return TAKEOUT.queue.reduce((n, c) => n + c.want - c.got, 0) + 4 - TAKEOUT.stock.n;
}

/** Gets a fish slice and a bag of rice tossed over when both are there, and slices them into a plate (or a box). */
function updChef(c: Chef, dt: number) {
  if (c.state === 'idle' && fishTray.items.length && (sushi.portions || ricePot.items.length)) {
    // a bag of rice makes two plates: the cooks only toss a new one when the open bag is used up
    c.parts = [fishTray.take()!];
    if (!sushi.portions) { c.parts.push(ricePot.take()!); sushi.portions = 2; }
    sushi.portions--;
    c.landed = 0; c.state = 'fetch';
    sushi.cooks.forEach(k => { k.t = 0.35; });
    // the kitchen crew upgrade makes the toss and the slicing quicker
    const quick = boost('crew');
    c.parts.forEach((m, i) => fly(m, () => c.board, (0.75 + i * 0.08) / quick, 2.2, () => {
      if (++c.landed === c.parts.length) { c.state = 'slice'; c.t = SLICE / quick; }
    }));
  } else if (c.state === 'slice') {
    c.t -= dt;
    if (c.t <= 0) {
      c.parts.forEach(m => scene.remove(m)); c.parts = [];
      if (boxesWanted() > 0 && (sushi.flip = !sushi.flip)) {
        const b = newBox(TAKEOUT.price, sushi.premium);
        b.position.copy(c.board);
        TAKEOUT.stock.receive(b, 1.0, 2.6);
        c.state = 'idle';
      } else {
        const p = newPlate(platePrice(), sushi.premium);
        p.position.copy(c.board); scene.add(p);
        c.plate = p; c.state = 'ready';
      }
    }
  } else if (c.state === 'ready') {
    // Onto the belt as soon as the slot passing in front is free.
    const j = slotAt(c.q);
    if (!sushi.slots[j]) {
      const p = c.plate!;
      c.plate = null; c.state = 'idle';
      sushi.slots[j] = p; p.userData.flying = true;
      fly(p, () => slotPos(j), 0.3, 0.5, () => { p.userData.flying = false; });
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
  const want = randi(1, 3);
  const bt = canvasTex(128, 128, (c, w, h) => drawBubble(c, w, h, want, 1, 'sushi'));
  const sp = new Sprite(new SpriteMaterial({ map: bt.tex, depthTest: false }));
  sp.scale.set(0.8, 0.8, 1); sp.position.set(0, 1.95, 0); sp.renderOrder = 5; sp.visible = false;
  g.add(sp);
  const d: Diner = {
    g, h: Math.PI, speed: 2.4, moving: false, seat, state: 'walk', want, bill: [], wait: 0, t: 0,
    path: [GARDEN.clone(), GATE.clone(), ENTRANCE.clone(), ...seat.via.map(v => v.clone()), V(seat.pos.x, 0, seat.pos.z)],
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
    if (register.hasRoom()) register.receive(b, 0.6 + i * 0.05, 1.6);
    else {
      const top = register.items[register.items.length - 1];
      if (top) addBillValue(top, v); else register.receive(b, 0.6, 1.6);
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
  d.path = [...d.seat.via].reverse().map(v => v.clone()).concat([ENTRANCE.clone(), GATE.clone(), ...HOME.map(v => v.clone())]);
}

function updDiner(d: Diner, dt: number) {
  const g = d.g;
  if (d.state === 'walk' || d.state === 'leave') {
    if (moveEnt(d, d.path[0], dt)) d.path.shift();
    g.position.y = inHall(g.position) ? FY : 0;
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
/** Moves the belt one slot; diners take plates passing in front of them. */
function stepBelt() {
  sushi.offset = (sushi.offset + 1) % SLOTS;
  for (const d of sushi.diners) {
    if (d.state !== 'wait') continue;
    const j = slotAt(d.seat.q), p = sushi.slots[j];
    if (p && !p.userData.flying) { sushi.slots[j] = null; take(d, p); }
  }
}

export function updRestaurant(dt: number) {
  if (!sushi.built) return;
  sushi.spawnT -= dt;
  if (sushi.spawnT <= 0) {
    sushi.spawnT = SPAWN_EVERY * rand(.7, 1.3) / demand() / boost('promo');
    spawnDiner();
  }
  sushi.t += dt;
  while (sushi.t >= STEP) { sushi.t -= STEP; stepBelt(); }
  sushi.slots.forEach((p, j) => { if (p && !p.userData.flying) p.position.copy(slotPos(j)); });
  sushi.cooks.forEach(c => updCook(c, dt));
  sushi.chefs.forEach(c => updChef(c, dt));
  [...sushi.diners].forEach(d => updDiner(d, dt));
}

// ---------- opening, and upgrades ----------
/** The bar, kitchen line and register desk, for the stage-up to pop in. */
export const furniture = [kitchen, bar, desk];

/**
 * Opens the restaurant (stage 2): its furniture, ten seats, a chef and the two cooks at the kitchen line. A fresh
 * opening (not a reload) comes with a delivery of rice. Returns the staff and stools for the pop-in.
 */
export function openRestaurant(silent: boolean): Object3D[] {
  sushi.built = true;
  furniture.forEach(g => { g.visible = true; });
  pads.forEach(d => { d.mesh.visible = true; });
  const built = [...FIRST_SEATS.map(addSeat), addChef(), ...addCooks()];
  if (!silent) {
    for (let i = 0; i < STARTER_RICE; i++) {
      const r = newRice(); r.position.set(RICE_DROP.x, 6, KITCHEN.z);
      ricePot.receive(r, 1.2 + i * 0.1, 0.5);
    }
  }
  return built;
}

/** Takes over what the stage 1 counters had left: steaks go to the fish tray (or the pile), cash to the register. */
export function handOver(left: { steaks: Mesh[]; bills: Mesh[] }) {
  for (const m of left.steaks) (fishTray.hasRoom() ? fishTray : pile).receive(m, 0.6, 1.6);
  for (const b of left.bills) register.receive(b, 0.7, 1.6);
}

/** The 'seats' unlock: eight more seats at the ends of the bar. Returns the stools for the pop-in. */
export const addSeats = (): Object3D[] => MORE_SEATS.map(addSeat);

/** The 'chef' and 'chef3' unlocks: another chef inside the bar. */
export const hireChef = () => addChef();

/** The 'premium' unlock: new plates and boxes are the premium menu. */
export function setPremium() {
  sushi.premium = true;
  repriceSushi();
}

// ---------- player ----------
/** Keeps the player out of the bar, the kitchen line and the register desk. */
export function collide(p: Vector3) {
  if (!sushi.built) return;
  const ax = axisX(p.x), dx = p.x - ax, dz = p.z - BAR.z, d = Math.hypot(dx, dz), r = BAR_OUT + 0.3;
  if (d < r) {
    if (d < 1e-6) p.z = BAR.z + r;
    else { p.x = ax + dx / d * r; p.z = BAR.z + dz / d * r; }
  }
  pushOutOfBox(p, KITCHEN.x, KITCHEN.z, KITCHEN.w / 2 + 0.3, KITCHEN.d / 2 + 0.3);
  pushOutOfBox(p, DESK.x, DESK.z, DESK.w / 2 + 0.3, DESK.d / 2 + 0.3);
}

// ---------- saving ----------
/** For saving: fish and rice waiting for a chef, plates made, and cash owed (register plus diners' unpaid bills). */
export function sushiStock() {
  const parts = sushi.chefs.flatMap(c => c.parts);
  return {
    fish: fishTray.n + parts.filter(m => m.userData.kind === 'fish').length,
    rice: ricePot.n + parts.filter(m => m.userData.kind === 'rice').length,
    plates: sushi.slots.filter(Boolean).length + sushi.chefs.filter(c => c.plate).length + sushi.diners.filter(d => d.plate).length,
    cash: register.all().reduce((s, b) => s + billValue(b), 0) + sushi.diners.reduce((s, d) => s + d.bill.reduce((a, v) => a + v, 0), 0),
  };
}

/** Puts saved plates back on the belt, one per slot. Returns how many didn't fit. */
export function loadPlates(n: number) {
  const k = Math.min(n, SLOTS);
  for (let j = 0; j < k; j++) {
    const p = newPlate(platePrice(), sushi.premium);
    p.position.copy(slotPos(j)); scene.add(p);
    sushi.slots[j] = p;
  }
  return n - k;
}
