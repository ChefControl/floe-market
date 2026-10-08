// The hired runners (the 'runner', 'runner2' and 'runner3' unlocks): they ferry fish slices from the pile to
// whichever stage 1 counter is lowest, and in stage 2 to the fish tray on the restaurant's kitchen line. The
// restaurant only needs two of them: a third goes at the stage-up.
import { animPerson, moveEnt, Person, type Walker } from './characters';
import { C1, COUNTERS, SLED } from './counters';
import { boost } from './economy';
import { carrySlot, Holder } from './holder';
import { newSteak } from './items';
import { scene } from './render';
import { FISH_DROP, fishTray, sushi } from './restaurant';
import { PILE_STAND, pile } from './stations';
import { FY, V, type XZ } from './util';

/** Somewhere to unload: where to stand, what to fill, and which way to face. */
interface Target { pos: XZ; stock: Holder; h: number }

interface Runner extends Walker {
  g: Person;
  /** Which runner this is: they stand side by side, the first in the middle. */
  i: number;
  back: Holder;
  state: 'toPile' | 'load' | 'toTarget' | 'unload';
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

/** The kitchen line once the restaurant is open; otherwise the open counter with the fewest steaks. */
function pickTarget(r: Runner): Target {
  if (sushi.built) return tray(r);
  const C = COUNTERS.filter(c => c.enabled && c.dropPos).sort((a, b) => a.stock.n - b.stock.n)[0] ?? C1;
  return C === SLED ? { pos: besideSled(r, C.dropPos!), stock: C.stock, h: Math.PI / 2 } : { pos: beside(r, C.dropPos!), stock: C.stock, h: 0 };
}

export const runners: Runner[] = [];

export function hireRunner(): Runner {
  const r: Runner = {
    g: new Person(SHIRTS[runners.length]), i: runners.length, h: 0, speed: 3.3, moving: false,
    state: 'toPile', t: 0, wait: 0, target: null,
    back: new Holder(i => carrySlot(r, i), 8),
  };
  r.g.position.copy(beside(r, PILE_STAND));
  scene.add(r.g);
  runners.push(r);
  return r;
}

/** How many runners the restaurant keeps: two keep its kitchen line in fish. */
export const KITCHEN_RUNNERS = 2;
/**
 * The stage-up: runners past the restaurant's two hand their fish back to the pile and go. Returns them, to shrink
 * away with the market.
 */
export function retireRunners(): Person[] {
  const gone = runners.splice(KITCHEN_RUNNERS);
  for (const r of gone) {
    for (const m of r.back.all()) {
      scene.remove(m);
      if (pile.hasRoom()) pile.put(newSteak());
    }
    r.back.items.length = 0;
    r.back.inbound.length = 0;
  }
  return gone.map(r => r.g);
}

/** Fish slices the runners are carrying. */
export const runnersLoad = () => runners.reduce((n, r) => n + r.back.n, 0);

/** Once the restaurant's open, the runners are part of the kitchen crew, and its upgrade speeds them up (up to twice). */
const pace = () => (sushi.built ? Math.min(2, boost('crew')) : 1);

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
  } else if (r.state === 'load') {
    r.h = Math.PI; r.t -= dt; r.wait += dt;
    if (r.t <= 0 && r.back.hasRoom() && pile.items.length) {
      r.t = 0.08 / k; r.back.receive(pile.take()!, 0.25, 0.7); r.wait = 0;
    }
    if (!r.back.hasRoom() || (r.back.n > 0 && r.wait > 1.2 && !pile.items.length)) {
      r.target = pickTarget(r); r.state = 'toTarget';
    }
  } else if (r.state === 'toTarget') {
    if (moveEnt(r, r.target!.pos, dt)) r.state = 'unload';
  } else {
    const tg = r.target!;
    r.h = tg.h; r.t -= dt;
    if (r.t <= 0 && r.back.items.length && tg.stock.hasRoom()) {
      r.t = 0.08 / k; tg.stock.receive(r.back.take()!, 0.25, 0.8);
    }
    if (r.back.n === 0) r.state = 'toPile';
  }
  r.g.position.y = FY;
  r.g.rotation.y = r.h;
  animPerson(r.g, r.moving, dt, r.back.n > 0);
  r.back.layout(r.h);
}
