// Sales counters and the customers who queue at them.
import { BoxGeometry, Group, Mesh, Sprite, SpriteMaterial, Vector3 } from 'three';
import { drawBubble, moodMat, newMoodSprite, patienceStep } from './bubble';
import { animPerson, makeSled, moveEnt, PARKAS, Person } from './characters';
import { decal, drawDrop } from './decals';
import { carrySlot, Holder, type Slot } from './holder';
import { addBillValue, newBill } from './items';
import { addReview, demand, starsFor } from './rating';
import { canvasTex, mesh, scene, type CanvasTex } from './render';
import { popStars, popText } from './ui';
import { FY, pick, rand, randi, V } from './util';

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
  name: string;
  /** Price per steak. */
  price: number;
  maxQ: number;
  spawnEvery: number;
  /** Seconds a customer will wait in the queue before giving up. */
  patience: number;
  want: [min: number, max: number];
  enabled?: boolean;
  isSled?: boolean;
  /** Where staff stand to stock the counter. */
  dropPos: Vector3;
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
  enabled: boolean;
  isSled: boolean;
  queue: Customer[];
  spawnT: number;
  serveT: number;
  meshes: Mesh[];
  stock: Holder;
  cash: Holder;
}

function makeCounter(o: CounterSpec): Counter {
  return {
    enabled: true, isSled: false, ...o,
    queue: [], spawnT: 1, serveT: 0, meshes: [],
    stock: new Holder(o.stockSlot, 48),
    cash: new Holder(i => {
      const j = i % 6;
      return V(o.cashPos.x + ((j % 2) - 0.5) * 0.44, FY + 0.03 + Math.floor(i / 6) * 0.065, o.cashPos.z + (Math.floor(j / 2) - 1) * 0.28);
    }, 90),
  };
}

export const C1 = makeCounter({
  name: 'walk', price: 4, maxQ: 6, spawnEvery: 2.4, patience: 40, want: [1, 3],
  dropPos: V(3, FY, 6.65), cashPos: V(5.3, 0, 6.55), faceH: Math.PI,
  stockSlot: i => {
    const j = i % 6;
    return V(3 + ((j % 3) - 1) * 0.45, FY + 0.94 + Math.floor(i / 6) * 0.085, 7.95 + (Math.floor(j / 3) - 0.5) * 0.42);
  },
  slot: i => V(3 + i * 0.95, 0, 9.3),
  spawn: () => V(6.5, 0, 18),
  exit: () => [V(2.2, 0, 10.8), V(-3, 0, 19)],
});
C1.meshes.push(
  mesh(new BoxGeometry(2.2, 0.9, 0.9), 0xE8F1F6, 3, FY + 0.45, 7.95, true),
  mesh(new BoxGeometry(2.3, 0.08, 1.0), 0x5FA8C8, 3, FY + 0.9, 7.95, true),
);
C1.meshes.forEach(m => scene.add(m));
decal(1.9, (c, w, h) => drawDrop(c, w, h, '🥩')).mesh.position.set(C1.dropPos.x, FY + 0.01, C1.dropPos.z);

export const C2 = makeCounter({
  name: 'sled', price: 6, maxQ: 3, spawnEvery: 7, patience: 55, want: [4, 8], enabled: false, isSled: true,
  dropPos: V(6.55, FY, -1), cashPos: V(6.55, 0, 1.25), faceH: Math.PI,
  stockSlot: i => {
    const j = i % 6;
    return V(7.95 + ((j % 2) - 0.5) * 0.4, FY + 0.94 + Math.floor(i / 6) * 0.085, -1 + (Math.floor(j / 2) - 1) * 0.42);
  },
  slot: i => V(9.6, 0, -0.6 + i * 2.5),
  spawn: () => V(9.6, 0, 32),
  exit: () => [V(9.6, 0, -40)],
});
C2.meshes.push(
  mesh(new BoxGeometry(0.9, 0.9, 2.2), 0xE8F1F6, 7.95, FY + 0.45, -1, true),
  mesh(new BoxGeometry(1.0, 0.08, 2.3), 0xF2B33D, 7.95, FY + 0.9, -1, true),
);
const c2Drop = decal(1.9, (c, w, h) => drawDrop(c, w, h, '🛷'));
c2Drop.mesh.position.set(C2.dropPos.x, FY + 0.01, C2.dropPos.z);
C2.meshes.push(c2Drop.mesh);
C2.meshes.forEach(m => { if (m !== c2Drop.mesh) scene.add(m); m.visible = false; });

export const COUNTERS = [C1, C2];

// ---------- customers ----------
const leaving: Customer[] = [];

function spawnCustomer(C: Counter) {
  const isSled = C.isSled;
  const g = isSled ? makeSled(pick(PARKAS), pick(PARKAS)) : new Person(pick(PARKAS));
  g.position.copy(C.spawn()); scene.add(g);
  const want = randi(C.want[0], C.want[1]);
  const bt = canvasTex(128, 128, (c, w, h) => drawBubble(c, w, h, want, 1, 'steak'));
  const sp = new Sprite(new SpriteMaterial({ map: bt.tex, depthTest: false }));
  sp.scale.set(0.8, 0.8, 1); sp.position.set(0, isSled ? 2.0 : 1.75, 0); sp.renderOrder = 5; sp.visible = false;
  g.add(sp);
  const mood = newMoodSprite(isSled ? 1.75 : 1.55);
  g.add(mood);
  const c: Customer = {
    g, want, got: 0, h: isSled ? Math.PI : -Math.PI / 2, speed: isSled ? 5 : 2.4, isSled,
    moving: false, arrived: false, queued: false, wait: 0, payT: 0, bubble: sp, bt, drawn: -1, mood, path: [],
    hands: new Holder(isSled
      ? i => { const p = g.position; const j = i % 2; return V(p.x + (j - 0.5) * 0.34, 0.66 + Math.floor(i / 2) * 0.085, p.z + 0.52); }
      : i => carrySlot(c, i), 12),
  };
  C.queue.push(c);
}

/** Redraws the order bubble when the count or the patience ring has changed. */
function showOrder(c: Customer, left: number) {
  const key = (c.want - c.got) * 100 + patienceStep(left);
  if (key === c.drawn) return;
  c.drawn = key;
  drawBubble(c.bt.ctx, 128, 128, c.want - c.got, left, 'steak');
  c.bt.tex.needsUpdate = true;
}

/** Bills for `n` steaks fly from the customer onto the counter's cash stack. */
function pay(C: Counter, c: Customer, n: number) {
  const from = c.g.position.clone(); from.y = 1;
  for (let i = 0; i < n; i++) {
    const b = newBill(C.price); b.position.copy(from);
    if (C.cash.hasRoom()) C.cash.receive(b, 0.35 + i * 0.04, 1.0);
    else {
      // Cash stack is full: fold the value into the top bill instead.
      const top = C.cash.items[C.cash.items.length - 1];
      if (top) addBillValue(top, C.price); else C.cash.receive(b, 0.35, 1.0);
    }
  }
  popText('+$' + (n * C.price), C.cashPos);
}

function depart(C: Counter, c: Customer, stars: number) {
  addReview(stars); popStars(stars, c.g.position);
  c.bubble.visible = false; c.mood.visible = false;
  c.path = C.exit(); leaving.push(c);
}

export function updCounter(C: Counter, dt: number) {
  if (!C.enabled) return;
  C.spawnT -= dt;
  if (C.spawnT <= 0 && C.queue.length < C.maxQ) {
    C.spawnT = C.spawnEvery * rand(.7, 1.3) / demand();
    spawnCustomer(C);
  }
  C.queue.forEach((c, i) => {
    c.arrived = moveEnt(c, C.slot(i), dt);
    if (c.arrived) { c.h = i === 0 ? C.faceH : (C.isSled ? Math.PI : -Math.PI / 2); c.queued = true; }
    if (c.queued) c.wait += dt;
    const left = 1 - c.wait / C.patience;
    c.bubble.visible = i === 0 && c.arrived && c.got < c.want;
    if (c.bubble.visible) showOrder(c, left);
    c.mood.visible = i > 0 && c.queued && left < 0.5;
    if (c.mood.visible) c.mood.material = moodMat(left < 0.25 ? 'angry' : 'meh');
  });
  // Out of patience: leave without the rest of the order, paying only for what they got.
  for (let i = C.queue.length - 1; i >= 0; i--) {
    const c = C.queue[i];
    if (c.wait >= C.patience && c.got < c.want && c.hands.incoming === 0) {
      C.queue.splice(i, 1);
      if (c.got) pay(C, c, c.got);
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
      pay(C, f, f.want);
      C.queue.shift();
      depart(C, f, starsFor(1 - f.wait / C.patience));
    }
  }
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

/** Facing, walk animation and carried-steak layout for every customer. */
export function postCustomers(dt: number) {
  const all = leaving.concat(C1.queue, C2.queue);
  for (const c of all) {
    c.g.rotation.y = c.h;
    if (c.g instanceof Person) { animPerson(c.g, c.moving, dt, c.hands.n > 0); c.hands.layout(c.h); }
    else c.hands.layout(0);
  }
}
