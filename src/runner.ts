// The hired runners (the 'runner' and 'runner2' unlocks, and stage 2's 'runner3'): they ferry fish slices from the pile
// to whichever stage 1 counter is lowest, and in stage 2 to the fish tray on the restaurant's kitchen line; there, once
// there's a farmer, they also carry the rice in from the farmer's stack, whichever the kitchen line is shorter of.
import { animPerson, moveEnt, Person, type Walker } from './characters';
import { C1, COUNTERS, SLED } from './counters';
import { boost } from './economy';
import { carrySlot, Holder } from './holder';
import { scene } from './render';
import { groundY } from './layout';
import { FISH_DROP, fishTray, ricePot, sushi } from './restaurant';
import { farmer, fieldStack, stackStand, TO_POT } from './rice';
import { PILE_STAND, pile } from './stations';
import { FY, V, type XZ } from './util';

/** Somewhere to unload: where to stand, what to fill, and which way to face. */
interface Target { pos: XZ; stock: Holder; h: number }

interface Runner extends Walker {
  g: Person;
  /** Which runner this is: they stand side by side, the first in the middle. */
  i: number;
  back: Holder;
  state: 'toPile' | 'load' | 'toTarget' | 'unload' | 'toStack' | 'loadRice' | 'toRice' | 'unloadRice';
  /** Waypoints left on a rice trip (stage 2), and the bags it's gone for (-1: taking them back). */
  path: XZ[];
  bags: number;
  /** Per-item transfer cooldown. */
  t: number;
  /** Time spent at the pile without picking anything up. */
  wait: number;
  target: Target | null;
}

/** How far each runner stands from the first one, sideways along the pile, a counter or the kitchen line. */
const SIDE = [0, -0.7, 0.7];
/** Each runner's shirt. */
const SHIRTS = [0xFFC93C, 0x4FB3BF, 0xE86A92];
const beside = (r: Runner, at: XZ) => V(at.x + SIDE[r.i], FY, at.z);
const besideSled = (r: Runner, at: XZ) => V(at.x, FY, at.z + SIDE[r.i]);

/** Where a runner stands to unload at the kitchen line, just north of the fish drop-off. */
const tray = (r: Runner): Target => ({ pos: beside(r, V(FISH_DROP.x, FY, FISH_DROP.z - 0.1)), stock: fishTray, h: 0 });

/** The kitchen line once the restaurant is open; otherwise the open counter with the fewest fillets. */
function pickTarget(r: Runner): Target {
  if (sushi.built) return tray(r);
  const C = COUNTERS.filter(c => c.enabled && c.dropPos).sort((a, b) => a.stock.n - b.stock.n)[0] ?? C1;
  return C === SLED ? { pos: besideSled(r, C.dropPos!), stock: C.stock, h: Math.PI / 2 } : { pos: beside(r, C.dropPos!), stock: C.stock, h: 0 };
}

export const runners: Runner[] = [];

export function hireRunner(): Runner {
  const r: Runner = {
    g: new Person(SHIRTS[runners.length]), i: runners.length, h: 0, speed: 3.3, moving: false,
    state: 'toPile', t: 0, wait: 0, target: null, path: [], bags: 0,
    back: new Holder(i => carrySlot(r, i), 8),
  };
  r.g.position.copy(beside(r, PILE_STAND));
  scene.add(r.g);
  runners.push(r);
  return r;
}

/** Fish slices the runners are carrying, and bags of rice (for saving). */
export const runnersLoad = () => runners.reduce((n, r) => n + r.back.count('fish'), 0);
export const runnersRice = () => runners.reduce((n, r) => n + r.back.count('rice'), 0);

/**
 * The crew upgrade speeds the runners up (up to twice): crew training at the market, then the kitchen crew once the
 * restaurant's open, when they're part of it.
 */
const pace = () => Math.min(2, boost(sushi.built ? 'crew' : 'training'));

/** Room left in the rice pot, less the bags runners are already bringing it. */
const riceRoom = () => ricePot.cap - ricePot.n - runners.reduce((n, r) => n + (r.bags <= 0 ? 0 : r.state === 'toRice' || r.state === 'unloadRice' ? r.back.n : r.bags), 0);
/** Room on the kitchen line's fish tray, less the fish the other runners are bringing it. */
const fishRoom = (me: Runner) => fishTray.cap - fishTray.n - runners.reduce((n, r) => n + (r !== me && (r.state === 'toTarget' || r.state === 'unload') ? r.back.n : 0), 0);
/**
 * Stage 2, with a farmer: whether `r` goes for rice rather than fish, when there's a load of it on the farmer's stack
 * and room in the rice pot for it. It does when the rice pot's emptier than the fish tray (counting what's on the way to
 * each), or the tray has no room for a load of fish.
 */
const riceWanted = (r: Runner) => {
  if (!sushi.built || !farmer || fieldStack.items.length < 4 || riceRoom() < 4) return false;
  const fish = fishRoom(r);
  return fish < r.back.cap || riceRoom() / ricePot.cap > fish / fishTray.cap;
};
/** From the kitchen line out through the farm door to the stack, where each runner stands a step north of the porter. */
const toStack = (r: Runner) => [...TO_POT].reverse().slice(1).map(v => ({ x: v.x, z: v.z })).concat([stackStand(1 + r.i)]);

export function updRunners(dt: number) {
  for (const r of runners) updRunner(r, dt);
}

function updRunner(r: Runner, dt: number) {
  const k = pace();
  r.speed = 3.3 * k;
  // A counter closing under them (the stage-up) sends them on to the kitchen line.
  if (r.target && r.target.stock !== fishTray && sushi.built) {
    r.target = tray(r);
    if (r.state === 'unload') r.state = 'toTarget';
  }
  if (r.state === 'toPile') {
    if (moveEnt(r, beside(r, PILE_STAND), dt)) { r.state = 'load'; r.wait = 0; }
  } else if (r.state === 'load' && r.bags < 0) {
    // (fish the kitchen line had no room for, back on the pile; with the pile full, into the bin behind it)
    r.h = Math.PI; r.t -= dt;
    if (r.t <= 0 && r.back.items.length) {
      r.t = 0.08 / k;
      if (pile.hasRoom()) pile.receive(r.back.take()!, 0.25, 0.7);
      else scene.remove(r.back.take()!);
    }
    if (!r.back.n) r.bags = 0;
  } else if (r.state === 'load' && !r.back.n && riceWanted(r)) {
    r.bags = Math.min(r.back.cap, riceRoom());
    r.state = 'toStack'; r.path = toStack(r);
  } else if (r.state === 'toStack' || r.state === 'toRice') {
    if (moveEnt(r, r.path[0], dt)) r.path.shift();
    if (!r.path.length) { r.state = r.state === 'toStack' ? 'loadRice' : 'unloadRice'; r.wait = 0; }
  } else if (r.state === 'loadRice') {
    r.h = 0; r.t -= dt; r.wait += dt;
    // (bags it couldn't get into the rice pot go back on the stack first; with the stack full, into the bin by it)
    if (r.t <= 0 && r.bags < 0 && r.back.items.length) {
      r.t = 0.08 / k;
      if (fieldStack.hasRoom()) fieldStack.receive(r.back.take()!, 0.25, 0.7);
      else scene.remove(r.back.take()!);
    } else if (r.t <= 0 && r.bags > r.back.n && fieldStack.items.length) { r.t = 0.08 / k; r.back.receive(fieldStack.take()!, 0.25, 0.7); r.wait = 0; }
    if (r.bags < 0 ? !r.back.n : r.back.n >= r.bags || (r.wait > 1.2 && !fieldStack.items.length)) {
      if (r.back.n && r.bags > 0) { r.state = 'toRice'; r.path = TO_POT.map(v => ({ x: v.x + SIDE[r.i] * 0.5, z: v.z })); }
      else { r.bags = 0; r.state = 'toPile'; }
    }
  } else if (r.state === 'unloadRice') {
    r.h = 0; r.t -= dt; r.wait += dt;
    if (r.t <= 0 && r.back.items.length && ricePot.hasRoom()) { r.t = 0.08 / k; ricePot.receive(r.back.take()!, 0.25, 0.8); r.wait = 0; }
    if (r.back.n === 0) { r.bags = 0; r.state = 'toPile'; }
    // (someone else filled the pot meanwhile: the rest goes back on the stack, so the fish isn't held up)
    else if (r.wait > 3) { r.bags = -1; r.state = 'toStack'; r.path = toStack(r); }
  } else if (r.state === 'load') {
    r.h = Math.PI; r.t -= dt; r.wait += dt;
    // (in stage 2, only what the kitchen line has room for: fish held at a full tray holds up the rice)
    // (and not for a slice or two: a trip's worth)
    const want = !sushi.built || (fishRoom(r) > r.back.n && (r.back.n > 0 || fishRoom(r) >= 4));
    if (r.t <= 0 && r.back.hasRoom() && pile.items.length && want) {
      r.t = 0.08 / k; r.back.receive(pile.take()!, 0.25, 0.7); r.wait = 0;
    }
    if (!r.back.hasRoom() || (r.back.n > 0 && r.wait > 1.2 && (!pile.items.length || !want))) {
      r.target = pickTarget(r); r.state = 'toTarget';
    }
  } else if (r.state === 'toTarget') {
    if (moveEnt(r, r.target!.pos, dt)) { r.state = 'unload'; r.wait = 0; }
  } else {
    const tg = r.target!;
    r.h = tg.h; r.t -= dt;
    r.wait += dt;
    if (r.t <= 0 && r.back.items.length && tg.stock.hasRoom()) {
      r.t = 0.08 / k; tg.stock.receive(r.back.take()!, 0.25, 0.8); r.wait = 0;
    }
    if (r.back.n === 0) r.state = 'toPile';
    // (stage 2: with the tray full and rice waiting on the stack, the rest of the fish goes back on the pile)
    else if (sushi.built && r.wait > 2 && !tg.stock.hasRoom() && riceWanted(r)) { r.bags = -1; r.state = 'toPile'; }
  }
  r.g.position.y = sushi.built ? groundY(r.g.position) : FY;
  r.g.rotation.y = r.h;
  animPerson(r.g, r.moving, dt, r.back.n > 0);
  r.back.layout(r.h);
}
