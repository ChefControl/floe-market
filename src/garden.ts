// Tea tables in the restaurant's front garden (the 'tables' and 'tables2' unlocks): a row of four low tables under
// red parasols either side of the stepping-stone path, two seats each. Diners there don't reach the belt, so each
// row comes with a waiter who picks plates off the end of the bar and carries them out through the gate.
import { BoxGeometry, Group, type Object3D, type Vector3 } from 'three';
import { animPerson, moveEnt, Person, type Walker } from './characters';
import { boost } from './economy';
import { carrySlot, fly, Holder } from './holder';
import { groundY, pushOutOfBox } from './layout';
import { G, mesh, scene } from './render';
import { barEnd, ENTRANCE, GATE, slotAt, slotPos, SOUTH_WALK, sushi, take, type Diner } from './restaurant';
import { clink } from './sfx';
import { V } from './util';

/** The garden's ground height. */
const GY = 0.02;
/**
 * The rows: east of the path first, then west of it, south of Korki's statue. `side` is which end of the bar the
 * row's waiter works from.
 */
const ROWS = [
  { side: 1 as const, z: 19.9, xs: [4.5, 5.8, 7.1, 8.4] },
  { side: -1 as const, z: 21.0, xs: [-4.5, -5.8, -7.1, -8.4] },
];
/** How far each table's two seats are from it (one north, one south), and where diners walk past them. */
const SEAT_D = 0.58, LANE_D = 1.15;
/** Where diners and waiters turn off the garden path towards a row. */
const TURN_X = 3.6;
const TABLE_H = 0.72;

const rows = ROWS.map(r => {
  const g = new Group(); g.visible = false; scene.add(g);
  for (const x of r.xs) {
    g.add(mesh(new BoxGeometry(0.8, 0.06, 0.62), 0x6B4A2E, x, GY + TABLE_H, r.z, true));
    const leg = mesh(G.cyl, 0x4A3220, x, GY + TABLE_H / 2, r.z, true); leg.scale.set(0.08, TABLE_H, 0.08); g.add(leg);
    for (const s of [-1, 1]) {
      const stool = mesh(G.cyl, 0xC0392B, x, GY + 0.24, r.z + s * SEAT_D, true); stool.scale.set(0.22, 0.48, 0.22); g.add(stool);
    }
    // a red parasol over each table, as at a tea house
    const pole = mesh(G.cyl, 0x6B4A2E, x + 0.3, GY + 1.05, r.z, true); pole.scale.set(0.035, 2.1, 0.035); g.add(pole);
    const shade = mesh(G.cone, 0xC0392B, x + 0.3, GY + 2.15, r.z, true); shade.scale.set(0.8, 0.32, 0.8); g.add(shade);
  }
  return { ...r, g, built: false };
});

// ---------- waiters ----------
interface Waiter extends Walker {
  g: Person;
  /** Which row of tables is theirs, where they wait at the end of the bar, and the belt slot they take plates from. */
  row: number;
  home: Vector3;
  q: number;
  tray: Holder;
  state: 'home' | 'out';
  /** The diners this trip's plates are for, and how many each. */
  jobs: Map<Diner, number>;
  /** Where to walk next; a stop with a diner is where they hand that diner's plates over. */
  path: { at: Vector3; d?: Diner }[];
  /** Seconds since the first plate went on the tray. */
  waited: number;
}
export const waiters: Waiter[] = [];

function hireWaiter(row: number) {
  const { at, q } = barEnd(ROWS[row].side);
  const g = new Person(0x22303C, 'waiter');
  g.position.set(at.x, groundY(at), at.z); scene.add(g);
  const w: Waiter = {
    g, row, h: -ROWS[row].side * Math.PI / 2, speed: SPEED, moving: false, home: at, q,
    tray: new Holder(i => carrySlot(w, i), 6), state: 'home', jobs: new Map(), path: [], waited: 0,
  };
  waiters.push(w);
  return g;
}

/** A waiter's walking speed, before the kitchen crew upgrade. */
const SPEED = 4.5;
/** The belt slots a waiter can reach from their spot: the one in front and three either side. */
const REACH = [-3, -2, -1, 0, 1, 2, 3];

/** Plates a diner at a garden table still needs brought out. */
const owed = (d: Diner) => d.want - d.bill.length - (d.plate ? 1 : 0) - d.served.length - d.coming;
const seated = (d: Diner) => d.state === 'wait' || d.state === 'eat';
/** Garden diners still owed plates: this waiter's row first, then the other's, longest waiting first. */
function owedDiners(w: Waiter) {
  const mine = (d: Diner) => (rows[w.row].xs.includes(d.seat.pos.x) ? 0 : 1);
  return sushi.diners.filter(d => d.seat.garden && seated(d) && owed(d) > 0).sort((a, b) => mine(a) - mine(b) || b.wait - a.wait);
}

/** Out of the gate, then table by table along the row (nearest the path first), handing each diner their plates. */
function trip(w: Waiter): Waiter['path'] {
  const stops = [...w.jobs.keys()].sort((a, b) => Math.abs(a.seat.via[1].x) - Math.abs(b.seat.via[1].x) || a.seat.via[1].z - b.seat.via[1].z);
  const out: Waiter['path'] = [V(w.home.x, 0, SOUTH_WALK), ENTRANCE, GATE].map(at => ({ at: at.clone() }));
  let lane: number | null = null;
  for (const d of stops) {
    const [turn, at] = d.seat.via;
    if (lane !== at.z) { out.push({ at: turn.clone() }); lane = at.z; }
    out.push({ at: at.clone(), d });
  }
  return out;
}
/** Back the way they came. */
function home(w: Waiter, from: Vector3): Waiter['path'] {
  const turn = V(Math.sign(from.x) * TURN_X, 0, from.z);
  return [turn, GATE, ENTRANCE, V(w.home.x, 0, SOUTH_WALK), w.home].map(at => ({ at: at.clone() }));
}

function updWaiter(w: Waiter, dt: number) {
  w.speed = SPEED * Math.min(2, boost('crew')); // the kitchen crew upgrade covers the waiters too
  if (w.state === 'home') {
    moveEnt(w, w.home, dt);
    w.h = w.home.x > 0 ? -Math.PI / 2 : Math.PI / 2;
    // take plates off the belt within reach as they come round, each for whoever has waited longest
    for (const k of REACH) {
      const j = slotAt(w.q + k), p = sushi.slots[j], next = owedDiners(w)[0];
      if (!p || p.userData.flying || !next || !w.tray.hasRoom()) continue;
      sushi.slots[j] = null;
      w.tray.receive(p, 0.25, 0.5);
      next.coming++;
      w.jobs.set(next, (w.jobs.get(next) ?? 0) + 1);
    }
    const j = slotAt(w.q), p = sushi.slots[j];
    for (const [d] of w.jobs) if (!seated(d)) { d.coming = 0; w.jobs.delete(d); } // they gave up and left
    if (w.tray.n) w.waited += dt;
    if (w.jobs.size && (!w.tray.hasRoom() || !owedDiners(w).length || w.waited > 3)) {
      w.state = 'out'; w.path = trip(w); w.waited = 0;
    } else if (!w.jobs.size && w.tray.n && !p) {
      // nobody to take them to any more: back on the belt
      const q = w.tray.take()!;
      sushi.slots[j] = q; q.userData.flying = true;
      fly(q, () => slotPos(j), 0.3, 0.5, () => { q.userData.flying = false; });
    }
  } else {
    const stop = w.path[0];
    if (moveEnt(w, stop.at, dt)) {
      w.path.shift();
      const d = stop.d;
      if (d) {
        const n = w.jobs.get(d) ?? 0;
        w.jobs.delete(d);
        for (let i = 0; i < n && w.tray.n && seated(d); i++) {
          const p = w.tray.take()!;
          d.coming--;
          // straight to a diner who's waiting; next to one who's still eating
          if (d.state === 'wait' && !d.served.length) take(d, p);
          else { d.served.push(p); fly(p, () => d.seat.ledge, 0.3 + i * 0.08, 0.5, () => clink(d.seat.ledge)); }
        }
        if (!seated(d)) d.coming = 0;
        if (!w.path.some(x => x.d)) w.path = home(w, stop.at); // last table: head back
      }
      if (!w.path.length) w.state = 'home';
    }
  }
  w.g.position.y = groundY(w.g.position);
  w.g.rotation.y = w.h;
  animPerson(w.g, w.moving, dt, w.tray.n > 0);
  w.tray.layout(w.h);
}

export function updGarden(dt: number) {
  for (const w of waiters) updWaiter(w, dt);
}

// ---------- the unlocks ----------
/** Sets out row `i` of tables (the 'tables' and 'tables2' unlocks) and hires its waiter. Returns them for the pop-in. */
export function addTables(i: number): Object3D[] {
  const r = rows[i];
  r.built = true; r.g.visible = true;
  const turn = r.side * TURN_X;
  for (const x of r.xs) {
    for (const s of [-1, 1] as const) {
      const lane = r.z + s * LANE_D;
      sushi.seats.push({
        pos: V(x, GY + 0.25, r.z + s * SEAT_D), h: s < 0 ? 0 : Math.PI, q: -1,
        ledge: V(x, GY + TABLE_H + 0.05, r.z + s * 0.14),
        via: [V(turn, 0, lane), V(x, 0, lane)], diner: null, garden: true,
      });
    }
  }
  return [r.g, hireWaiter(i)];
}

/** Keeps the player out of the tables. */
export function collideGarden(p: Vector3) {
  for (const r of rows) {
    if (!r.built) continue;
    for (const x of r.xs) pushOutOfBox(p, x, r.z, 0.45, SEAT_D + 0.3);
  }
}

/** For saving: plates on the waiters' trays. */
export const waiterPlates = () => waiters.reduce((n, w) => n + w.tray.n, 0);
