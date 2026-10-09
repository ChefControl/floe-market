// Tea tables in the restaurant's front garden (the 'tables' and 'tables2' unlocks): a row of four low tables under
// red parasols either side of the stepping-stone path, two seats each. Diners there don't reach the belt: the chefs
// put their plates on a serving counter against the front wall, and each row comes with a waiter who carries them
// over on a tray, a few at a time. The waiters are only for show: a diner stops waiting once their plate is made.
import { BoxGeometry, CylinderGeometry, Group, type Mesh, type Object3D, type Vector3 } from 'three';
import { animPerson, moveEnt, Person, type Walker } from './characters';
import { boost } from './economy';
import { fly, Holder } from './holder';
import { groundY, pushOutOfBox } from './layout';
import { G, mesh, scene } from './render';
import { owed, PASS, servingPass, sushi, take, type Diner } from './restaurant';
import { clink } from './sfx';
import { fwd, V } from './util';

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

// ---------- the serving counter ----------
const pass = new Group(); pass.visible = false; scene.add(pass);
{
  pass.add(mesh(new BoxGeometry(PASS.w, PASS.h - 0.05, PASS.d), 0x6B4A2E, PASS.x, GY + (PASS.h - 0.05) / 2, PASS.z, true));
  pass.add(mesh(new BoxGeometry(PASS.w + 0.1, 0.05, PASS.d + 0.08), 0x8A5A3B, PASS.x, GY + PASS.h - 0.025, PASS.z, true));
  // a red cloth along the front, and a bell to ring when an order's up
  pass.add(mesh(new BoxGeometry(PASS.w - 0.1, 0.3, 0.02), 0xC0392B, PASS.x, GY + PASS.h - 0.22, PASS.z + PASS.d / 2 + 0.011));
  const bell = mesh(G.sphere, 0xF2C14E, PASS.x + PASS.w / 2 - 0.12, GY + PASS.h, PASS.z - 0.12, true);
  bell.scale.set(0.07, 0.06, 0.07); pass.add(bell);
}

// ---------- waiters ----------
interface Waiter extends Walker {
  g: Person;
  /** Which row of tables is theirs, and where they wait by the serving counter. */
  row: number;
  home: Vector3;
  tray: Holder;
  /** The round tray: carried flat in front with plates on it, or tucked under an arm when empty. */
  board: Mesh;
  state: 'home' | 'out';
  /** Where to walk next; a stop with a diner is where they set that diner's plates down. */
  path: { at: Vector3; d?: Diner }[];
  /** Seconds since the first plate went on the tray. */
  waited: number;
}
export const waiters: Waiter[] = [];

/** A waiter's walking speed, before the kitchen crew upgrade. */
const SPEED = 4.5;
/** Plates a tray holds, how small they're set on it, and how long a waiter waits for more before setting off. */
const TRAY = 4, ON_TRAY = 0.6, LINGER = 0.8;
/** Where each plate sits on the tray, by how many there are, as (sideways, forward) from its centre. */
const TRAY_SPOTS: [number, number][][] = [
  [], [[0, 0]], [[-0.12, 0], [0.12, 0]], [[-0.12, -0.08], [0.12, -0.08], [0, 0.12]],
  [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]],
];
const trayGeo = new CylinderGeometry(0.32, 0.3, 0.03, 20);

/** Where plate `i` of `n` sits on a waiter's tray, held in front of them at chest height. */
function trayPos(w: Waiter, i: number, n: number) {
  const f = fwd(w.h), [sx, sz] = TRAY_SPOTS[Math.min(TRAY, Math.max(1, n))][Math.min(i, TRAY - 1)] ?? [0, 0];
  const cx = w.g.position.x + f.x * (0.55 + sz), cz = w.g.position.z + f.z * (0.55 + sz);
  return V(cx + f.z * sx, w.g.position.y + 0.84, cz - f.x * sx);
}

function hireWaiter(row: number) {
  const home = V(PASS.x + (row ? 0.5 : -0.5), 0, PASS.z + PASS.d / 2 + 0.55);
  const g = new Person(0x24476B, 'waiter');
  g.position.set(home.x, groundY(home), home.z); scene.add(g);
  const board = mesh(trayGeo, 0x8E2B2B, 0, 0, 0, true); g.add(board);
  const w: Waiter = {
    g, row, h: Math.PI, speed: SPEED, moving: false, home, board,
    tray: new Holder(i => trayPos(w, i, w.tray.n), TRAY), state: 'home', path: [], waited: 0,
  };
  waiters.push(w);
  return g;
}

/** Which row a garden diner sits in. */
const rowOf = (d: Diner) => (rows[0].xs.includes(d.seat.pos.x) ? 0 : 1);
const seated = (d: Diner) => d.state === 'wait' || d.state === 'eat';
/**
 * The way from the serving counter to each row, round the stone lanterns (the west row's crosses the path above the
 * menu board). The last point is where the row's lanes start.
 */
const ROW_WAY = [[V(4.2, 0, 18.45), V(TURN_X, 0, 18.75)], [V(2.4, 0, PASS.z + 1.0), V(-TURN_X, 0, 18.7)]];

/** Row by row (theirs first), lane by lane, table by table out from the path, setting each diner's plates down. */
function trip(w: Waiter, stops: Diner[]): Waiter['path'] {
  const key = (d: Diner) => (rowOf(d) === w.row ? 0 : 1) * 1e4 + d.seat.via[1].z * 10 + Math.abs(d.seat.via[1].x);
  const out: Waiter['path'] = [];
  let row = -1, lane: number | null = null;
  for (const d of [...stops].sort((a, b) => key(a) - key(b))) {
    const [turn, at] = d.seat.via, r = rowOf(d);
    if (r !== row) {
      // from the counter the whole way round; from the other row, out of its lane and straight across the path
      if (lane === null) out.push(...ROW_WAY[r].map(at => ({ at: at.clone() })));
      else out.push({ at: V(-turn.x, 0, lane) }, { at: ROW_WAY[r][ROW_WAY[r].length - 1].clone() });
      row = r; lane = null;
    }
    if (lane !== at.z) { if (lane !== null) out.push({ at: V(turn.x, 0, lane) }); out.push({ at: turn.clone() }); lane = at.z; }
    out.push({ at: at.clone(), d });
  }
  return out;
}
/** Back to the serving counter from the last table. */
function home(w: Waiter, from: Vector3): Waiter['path'] {
  const r = from.x > 0 ? 0 : 1, turn = V(Math.sign(from.x) * TURN_X, 0, from.z);
  return [turn, ...[...ROW_WAY[r]].reverse(), w.home].map(at => ({ at: at.clone() }));
}

/** Plates on the serving counter this waiter should take: their row's first, then any the other waiter isn't there for. */
function forMe(w: Waiter) {
  const other = waiters.find(o => o !== w);
  return servingPass.items.filter(p => {
    const d = p.userData.diner as Diner;
    return seated(d) && (rowOf(d) === w.row || !other || other.state !== 'home');
  });
}

function updWaiter(w: Waiter, dt: number) {
  w.speed = SPEED * Math.min(2, boost('crew')); // the kitchen crew upgrade covers the waiters too
  if (w.state === 'home') {
    moveEnt(w, w.home, dt);
    if (!w.moving) w.h = Math.PI; // facing the counter
    // picks up what's come out for them once they're standing at the counter
    for (const p of w.moving ? [] : forMe(w)) {
      if (!w.tray.hasRoom()) break;
      servingPass.items.splice(servingPass.items.indexOf(p), 1);
      p.scale.setScalar(ON_TRAY);
      w.tray.receive(p, 0.3, 0.4);
    }
    servingPass.layout();
    if (w.tray.n) w.waited += dt;
    // off as soon as the tray's full, or once nothing more for them has come out for a moment
    if (w.tray.items.length && !w.tray.incoming && (!w.tray.hasRoom() || w.waited > LINGER)) {
      const stops = [...new Set(w.tray.items.map(p => p.userData.diner as Diner))].filter(seated);
      w.state = 'out'; w.path = trip(w, stops); w.waited = 0;
    }
  } else {
    const stop = w.path[0];
    if (moveEnt(w, stop.at, dt)) {
      w.path.shift();
      const d = stop.d;
      if (d) {
        const mine = seated(d) ? w.tray.items.filter(p => p.userData.diner === d) : [];
        mine.forEach((p, i) => {
          w.tray.items.splice(w.tray.items.indexOf(p), 1);
          p.scale.setScalar(1); delete p.userData.diner;
          d.coming--;
          // straight to a diner who's waiting; next to one who's still eating
          if (d.state === 'wait' && !d.served.length) take(d, p);
          else { d.served.push(p); fly(p, () => d.seat.ledge, 0.3 + i * 0.08, 0.5, () => clink(d.seat.ledge)); }
        });
        if (!w.path.some(x => x.d)) w.path = home(w, stop.at); // last table: head back
      }
      if (!w.path.length) w.state = 'home';
    }
  }
  w.g.position.y = groundY(w.g.position);
  w.g.rotation.y = w.h;
  const carrying = w.tray.n > 0;
  animPerson(w.g, w.moving, dt, carrying);
  // the tray in both hands while it has plates on it, otherwise flat against their side
  if (carrying) { w.board.position.set(0, 0.82, 0.55); w.board.rotation.set(0, 0, 0); }
  else { w.board.position.set(-0.4, 0.55, 0); w.board.rotation.set(0, 0, Math.PI / 2); w.g.arms[0].rotation.x = 0; }
  w.tray.layout(w.h);
}

/** A plate whose diner has gone (it shouldn't happen: their wait stops once it's made) goes to the next one owed. */
function rehome(p: Mesh) {
  const d = p.userData.diner as Diner | undefined;
  if (d && seated(d)) return;
  const next = sushi.diners.find(x => x.seat.garden && seated(x) && owed(x) > 0);
  if (next) { next.coming++; p.userData.diner = next; }
}

export function updGarden(dt: number) {
  servingPass.items.forEach(rehome);
  for (const w of waiters) { w.tray.items.forEach(rehome); updWaiter(w, dt); }
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
  if (!i) pass.visible = true;
  return [r.g, ...(i ? [] : [pass]), hireWaiter(i)];
}

/** Which rows of tables are out (co-op sends them to the guest's phone, which walks round them itself). */
export const tableRows = () => rows.map(r => r.built);
/** On a co-op guest's phone: the rows of tables out in the host's game (whose phone sends what they look like). */
export function setTableRows(built: boolean[]) { rows.forEach((r, i) => { r.built = !!built[i]; }); }

/** Keeps the player out of the tables and the serving counter. */
export function collideGarden(p: Vector3) {
  if (pass.visible) pushOutOfBox(p, PASS.x, PASS.z, PASS.w / 2 + 0.3, PASS.d / 2 + 0.3);
  for (const r of rows) {
    if (!r.built) continue;
    for (const x of r.xs) pushOutOfBox(p, x, r.z, 0.45, SEAT_D + 0.3);
  }
}

/** For saving: plates on the waiters' trays. */
export const waiterPlates = () => waiters.reduce((n, w) => n + w.tray.n, 0);
