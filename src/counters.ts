// Counters and the customers who queue at them. Stage 1 has the walk-up fish counter and the sled window, where
// snowmobiles buy fish in bulk; both close at the stage-up. Stage 2 has the takeout kiosk by the restaurant,
// where snowmobiles buy boxes of sushi.
import { BoxGeometry, Group, Mesh, Sprite, SpriteMaterial, Vector3 } from 'three';
import { drawBubble, moodMat, newMoodSprite, patienceStep, type OrderIcon } from './bubble';
import { animPerson, makeSled, moveEnt, PARKAS, Person } from './characters';
import { decal, drawDrop } from './decals';
import { boost, FISH_PRICE, mods, priced, SUSHI_PRICE, type ModId } from './economy';
import { KIOSK } from './hall';
import { carrySlot, Holder, type Slot } from './holder';
import { addBillValue, newBill } from './items';
import { addReview, demand, starsFor } from './rating';
import { canvasTex, mesh, scene, type CanvasTex } from './render';
import { popStars, popText } from './ui';
import { FY, pick, rand, randi, V, type XZ } from './util';
import { gapLogs, ROAD1_X, ROAD2_X } from './world';

export interface Customer {
  g: Group;
  want: number;
  got: number;
  h: number;
  speed: number;
  isSled: boolean;
  moving: boolean;
  arrived: boolean;
  /** Has reached the queue; patience runs from then until served. */
  queued: boolean;
  /** Seconds spent waiting in the queue. */
  wait: number;
  payT: number;
  bubble: Sprite;
  bt: CanvasTex;
  /** What the bubble was last drawn with (items left and patience step), to skip needless redraws. */
  drawn: number;
  /** Face shown over customers further back once they're getting impatient. */
  mood: Sprite;
  /** Remaining exit waypoints once served. */
  path: Vector3[];
  hands: Holder;
}

interface CounterSpec {
  /** Price per item, for items that don't carry their own (fish; boxes carry theirs). */
  price: number;
  /** Where fish is dropped off for it (the stage 1 counters; the kiosk is stocked by the chefs). */
  dropPos?: Vector3;
  /** The marketing that brings it more customers, and how many more places in the queue each level adds. */
  crowd: ModId;
  qPer: number;
  maxQ: number;
  spawnEvery: number;
  /** Seconds a customer will wait in the queue before giving up. */
  patience: number;
  want: [min: number, max: number];
  enabled: boolean;
  isSled: boolean;
  icon: OrderIcon;
  cashPos: Vector3;
  /** Heading the front customer faces. */
  faceH: number;
  stockSlot: Slot;
  /** Queue position by index. */
  slot: Slot;
  spawn: () => Vector3;
  exit: () => Vector3[];
}

export interface Counter extends CounterSpec {
  queue: Customer[];
  spawnT: number;
  serveT: number;
  /** The counter itself, and its drop-off marking. */
  meshes: Mesh[];
  stock: Holder;
  cash: Holder;
}

function makeCounter(o: CounterSpec, stockCap: number): Counter {
  return {
    ...o, queue: [], spawnT: 1, serveT: 0, meshes: [],
    stock: new Holder(o.stockSlot, stockCap),
    cash: new Holder(i => {
      const j = i % 6;
      return V(o.cashPos.x + ((j % 2) - 0.5) * 0.44, FY + 0.03 + Math.floor(i / 6) * 0.065, o.cashPos.z + (Math.floor(j / 2) - 1) * 0.28);
    }, 90),
  };
}

/** Puts a counter's meshes in the scene, hidden unless it's open. */
function place(C: Counter, ...ms: Mesh[]) {
  for (const m of ms) { if (!m.parent) scene.add(m); m.visible = C.enabled; C.meshes.push(m); }
}
function dropPad(at: Vector3, icon: string) {
  const d = decal(1.9, (c, w, h) => drawDrop(c, w, h, icon));
  d.mesh.position.set(at.x, FY + 0.01, at.z);
  return d.mesh;
}

/** The walk-up fish counter in the gap of the south fence, where the game starts out. */
export const C1 = makeCounter({
  price: FISH_PRICE.walk, maxQ: 6, spawnEvery: 2.4, patience: 40, want: [1, 3], enabled: true, isSled: false, icon: 'fish',
  crowd: 'marketing', qPer: 1,
  dropPos: V(3, FY, 6.65), cashPos: V(5.3, 0, 6.55), faceH: Math.PI,
  stockSlot: i => {
    const j = i % 6;
    return V(3 + ((j % 3) - 1) * 0.45, FY + 0.94 + Math.floor(i / 6) * 0.085, 7.95 + (Math.floor(j / 3) - 0.5) * 0.42);
  },
  // along the fence, then round the corner and down the path, so a long queue stays clear of the road
  slot: i => (i <= 5 ? V(3 + i * 0.95, 0, 9.3) : V(7.75, 0, 9.3 + (i - 5) * 0.95)),
  spawn: () => V(6.5, 0, 18),
  exit: () => [V(2.2, 0, 10.8), V(-3, 0, 19)],
}, 48);
place(C1,
  mesh(new BoxGeometry(2.2, 0.9, 0.9), 0xE8F1F6, 3, FY + 0.45, 7.95, true),
  mesh(new BoxGeometry(2.3, 0.08, 1.0), 0x5FA8C8, 3, FY + 0.9, 7.95, true),
  dropPad(C1.dropPos!, '🐟'),
);

/** The sled window in the east fence (the 'sled' unlock): snowmobiles on the road buy fish in bulk. */
const WIN1 = { x: 7.95, z: -1 };
export const SLED = makeCounter({
  price: FISH_PRICE.sled, maxQ: 3, spawnEvery: 7, patience: 55, want: [4, 8], enabled: false, isSled: true, icon: 'fish',
  crowd: 'marketing', qPer: 0.5,
  dropPos: V(6.55, FY, -1), cashPos: V(6.55, 0, 1.25), faceH: Math.PI,
  stockSlot: i => {
    const j = i % 6;
    return V(WIN1.x + ((j % 2) - 0.5) * 0.4, FY + 0.94 + Math.floor(i / 6) * 0.085, WIN1.z + (Math.floor(j / 2) - 1) * 0.42);
  },
  slot: i => V(ROAD1_X, 0, -0.6 + i * 2.5),
  spawn: () => V(ROAD1_X, 0, 32),
  exit: () => [V(ROAD1_X, 0, -40)],
}, 48);
place(SLED,
  mesh(new BoxGeometry(0.9, 0.9, 2.2), 0xE8F1F6, WIN1.x, FY + 0.45, WIN1.z, true),
  mesh(new BoxGeometry(1.0, 0.08, 2.3), 0xF2B33D, WIN1.x, FY + 0.9, WIN1.z, true),
  dropPad(SLED.dropPos!, '🚗'),
);

/**
 * Stage 2's takeout kiosk, out by the road east of the restaurant; its cash lands just inside the east wall.
 * Snowmobiles come down the road from the north and queue back up it, clear of the crossing to her house.
 */
export const TAKEOUT = makeCounter({
  price: SUSHI_PRICE.box, maxQ: 3, spawnEvery: 7, patience: 55, want: [3, 6], enabled: false, isSled: true, icon: 'box',
  crowd: 'promo', qPer: 0.5,
  cashPos: V(8.9, 0, KIOSK.z), faceH: 0,
  stockSlot: i => {
    const j = i % 6;
    return V(KIOSK.x + ((j % 2) - 0.5) * 0.4, FY + 0.94 + Math.floor(i / 6) * 0.105, KIOSK.z + (Math.floor(j / 2) - 1) * 0.42);
  },
  slot: i => V(ROAD2_X, 0, KIOSK.z - 0.4 - i * 2.5),
  spawn: () => V(ROAD2_X, 0, -48),
  exit: () => [V(ROAD2_X, 0, 48)],
}, 24);
place(TAKEOUT,
  mesh(new BoxGeometry(0.8, 0.9, 3.6), 0xE8F1F6, KIOSK.x, FY + 0.45, KIOSK.z, true),
  mesh(new BoxGeometry(0.9, 0.08, 3.7), 0xF2B33D, KIOSK.x, FY + 0.9, KIOSK.z, true),
);

export const COUNTERS = [C1, SLED, TAKEOUT];

/** Opens a counter: it starts taking customers, and its meshes show. Returns them for the pop-in. */
function open(C: Counter) {
  C.enabled = true;
  C.meshes.forEach(m => { m.visible = true; });
  return C.meshes;
}

/** Fine fillets: fish sells for more at both stage 1 counters. */
export function repriceFish() {
  C1.price = priced(FISH_PRICE.walk, boost('fillets'));
  SLED.price = priced(FISH_PRICE.sled, boost('fillets'));
}

/** The 'sled' unlock: opens the sled window in the fence. */
export function openSled() {
  gapLogs.forEach(l => { l.visible = false; });
  return open(SLED);
}

/** The 'kiosk' unlock (stage 2) opens the takeout kiosk by the road. */
export const openTakeout = () => open(TAKEOUT);

// ---------- customers ----------
const leaving: Customer[] = [];

function spawnCustomer(C: Counter) {
  const isSled = C.isSled;
  const g = isSled ? makeSled(pick(PARKAS), pick(PARKAS)) : new Person(pick(PARKAS));
  g.position.copy(C.spawn()); scene.add(g);
  const want = randi(C.want[0], C.want[1]);
  const bt = canvasTex(128, 128, (c, w, h) => drawBubble(c, w, h, want, 1, C.icon));
  const sp = new Sprite(new SpriteMaterial({ map: bt.tex, depthTest: false }));
  sp.scale.set(0.8, 0.8, 1); sp.position.set(0, isSled ? 2.0 : 1.75, 0); sp.renderOrder = 5; sp.visible = false;
  g.add(sp);
  const mood = newMoodSprite(isSled ? 1.75 : 1.55);
  g.add(mood);
  const c: Customer = {
    g, want, got: 0, h: isSled ? C.faceH : -Math.PI / 2, speed: isSled ? 5 : 2.4, isSled,
    moving: false, arrived: false, queued: false, wait: 0, payT: 0, bubble: sp, bt, drawn: -1, mood, path: [],
    hands: new Holder(isSled
      // on the seat behind the driver, whichever way the sled is facing
      ? i => { const p = g.position, j = i % 2; return V(p.x + (j - 0.5) * 0.36, 0.66 + Math.floor(i / 2) * 0.105, p.z - Math.cos(c.h) * 0.52); }
      : i => carrySlot(c, i), 12),
  };
  C.queue.push(c);
}

/** Redraws the order bubble when the count or the patience ring has changed. */
function showOrder(C: Counter, c: Customer, left: number) {
  const key = (c.want - c.got) * 100 + patienceStep(left);
  if (key === c.drawn) return;
  c.drawn = key;
  drawBubble(c.bt.ctx, 128, 128, c.want - c.got, left, C.icon);
  c.bt.tex.needsUpdate = true;
}

/** Bills for what a customer is holding fly onto the counter's cash stack. */
function pay(C: Counter, c: Customer) {
  const from = c.g.position.clone(); from.y = 1;
  const values = c.hands.all().map(m => (m.userData.value as number | undefined) ?? C.price);
  values.forEach((v, i) => {
    const b = newBill(v); b.position.copy(from);
    if (C.cash.hasRoom()) C.cash.receive(b, 0.35 + i * 0.04, 1.0);
    else {
      // Cash stack is full: fold the value into the top bill instead.
      const top = C.cash.items[C.cash.items.length - 1];
      if (top) addBillValue(top, v); else C.cash.receive(b, 0.35, 1.0);
    }
  });
  if (values.length) popText('+$' + values.reduce((a, v) => a + v, 0), C.cashPos);
}

function depart(C: Counter, c: Customer, stars?: number) {
  if (stars !== undefined) { addReview(stars); popStars(stars, c.g.position); }
  c.bubble.visible = false; c.mood.visible = false;
  c.path = C.exit(); leaving.push(c);
}

/** The heading from one spot to another: queuers face the one ahead of them. */
const facing = (from: XZ, to: XZ) => Math.atan2(to.x - from.x, to.z - from.z);

export function updCounter(C: Counter, dt: number) {
  if (!C.enabled) return;
  C.spawnT -= dt;
  // marketing brings customers in faster and lets the queue grow longer
  if (C.spawnT <= 0 && C.queue.length < C.maxQ + Math.floor(mods[C.crowd] * C.qPer)) {
    C.spawnT = C.spawnEvery * rand(.7, 1.3) / demand() / boost(C.crowd);
    spawnCustomer(C);
  }
  C.queue.forEach((c, i) => {
    c.arrived = moveEnt(c, C.slot(i), dt);
    if (c.arrived) { c.h = i === 0 || C.isSled ? C.faceH : facing(C.slot(i), C.slot(i - 1)); c.queued = true; }
    if (c.queued) c.wait += dt;
    const left = 1 - c.wait / C.patience;
    c.bubble.visible = i === 0 && c.arrived && c.got < c.want;
    if (c.bubble.visible) showOrder(C, c, left);
    c.mood.visible = i > 0 && c.queued && left < 0.5;
    if (c.mood.visible) c.mood.material = moodMat(left < 0.25 ? 'angry' : 'meh');
  });
  // Out of patience: leave without the rest of the order, paying only for what they got.
  for (let i = C.queue.length - 1; i >= 0; i--) {
    const c = C.queue[i];
    if (c.wait >= C.patience && c.got < c.want && c.hands.incoming === 0) {
      C.queue.splice(i, 1);
      pay(C, c);
      depart(C, c, 1);
    }
  }
  const f = C.queue[0];
  if (f && f.arrived && f.got < f.want) {
    C.serveT -= dt;
    if (C.serveT <= 0 && C.stock.items.length) {
      C.serveT = 0.16;
      f.hands.receive(C.stock.take()!, 0.3, 0.6);
      f.got++;
    }
  }
  if (f && f.got >= f.want && f.hands.incoming === 0) {
    f.payT += dt;
    if (f.payT > 0.2) {
      pay(C, f);
      C.queue.shift();
      depart(C, f, starsFor(1 - f.wait / C.patience));
    }
  }
}

/**
 * Closes the stage 1 counters for good (the restaurant is replacing them). Whoever is queuing pays for what they're
 * holding and goes home without a review. Their meshes stay up, for the stage-up to take down.
 */
export function closeMarket() {
  for (const C of [C1, SLED]) {
    C.enabled = false;
    for (const c of C.queue.splice(0)) { pay(C, c); depart(C, c); }
  }
}

/** Takes what's left on the closed counters (landed fish and bills) to hand over to the restaurant. */
export function marketLeftovers() {
  return {
    steaks: [...C1.stock.items.splice(0), ...SLED.stock.items.splice(0)],
    bills: [...C1.cash.items.splice(0), ...SLED.cash.items.splice(0)],
  };
}

export function updLeaving(dt: number) {
  for (let i = leaving.length - 1; i >= 0; i--) {
    const c = leaving[i];
    if (moveEnt(c, c.path[0], dt)) c.path.shift();
    if (!c.path.length) {
      scene.remove(c.g); c.hands.clear(); c.bt.tex.dispose(); c.bubble.material.dispose();
      leaving.splice(i, 1);
    }
  }
}

/** Facing, walk animation and carried items for every customer. */
export function postCustomers(dt: number) {
  for (const c of leaving.concat(...COUNTERS.map(C => C.queue))) {
    c.g.rotation.y = c.h;
    if (c.g instanceof Person) { animPerson(c.g, c.moving, dt, c.hands.n > 0); c.hands.layout(c.h); }
    else c.hands.layout(0);
  }
}
