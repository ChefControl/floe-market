// The hired runner (the 'runner' unlock): ferries fish slices from the pile to whichever stage 1 counter is
// lowest, and in stage 2 to the fish tray on the restaurant's kitchen line.
import { animPerson, moveEnt, Person, type Walker } from './characters';
import { C1, COUNTERS, SLED } from './counters';
import { boost } from './economy';
import { carrySlot, Holder } from './holder';
import { scene } from './render';
import { FISH_DROP, fishTray, sushi } from './restaurant';
import { PILE_STAND, pile } from './stations';
import { FY, V, type XZ } from './util';

/** Somewhere to unload: where to stand, what to fill, and which way to face. */
interface Target { pos: XZ; stock: Holder; h: number }

interface Runner extends Walker {
  g: Person;
  back: Holder;
  state: 'toPile' | 'load' | 'toTarget' | 'unload';
  /** Per-item transfer cooldown. */
  t: number;
  /** Time spent at the pile without picking anything up. */
  wait: number;
  target: Target | null;
}

/** Where the runner stands to unload at the kitchen line, just north of the fish drop-off. */
const TRAY = { pos: V(FISH_DROP.x, FY, FISH_DROP.z - 0.1), stock: fishTray, h: 0 };

/** The kitchen line once the restaurant is open; otherwise the open counter with the fewest steaks. */
function pickTarget(): Target {
  if (sushi.built) return TRAY;
  const C = COUNTERS.filter(c => c.enabled && c.dropPos).sort((a, b) => a.stock.n - b.stock.n)[0] ?? C1;
  return { pos: C.dropPos!, stock: C.stock, h: C === SLED ? Math.PI / 2 : 0 };
}

export let runner: Runner | null = null;

export function hireRunner(): Runner {
  const r: Runner = {
    g: new Person(0xFFC93C), h: 0, speed: 3.3, moving: false,
    state: 'toPile', t: 0, wait: 0, target: null,
    back: new Holder(i => carrySlot(r, i), 8),
  };
  r.g.position.set(PILE_STAND.x, FY, PILE_STAND.z);
  scene.add(r.g);
  runner = r;
  return r;
}

/** Once the restaurant's open, the runner is part of the kitchen crew, and its upgrade speeds them up (up to twice). */
const pace = () => (sushi.built ? Math.min(2, boost('crew')) : 1);

export function updRunner(dt: number) {
  const r = runner;
  if (!r) return;
  const k = pace();
  r.speed = 3.3 * k;
  // A counter closing under them (the stage-up) sends them on to the kitchen line.
  if (r.target && r.target !== TRAY && sushi.built) {
    r.target = TRAY;
    if (r.state === 'unload') r.state = 'toTarget';
  }
  if (r.state === 'toPile') {
    if (moveEnt(r, PILE_STAND, dt)) { r.state = 'load'; r.wait = 0; }
  } else if (r.state === 'load') {
    r.h = Math.PI; r.t -= dt; r.wait += dt;
    if (r.t <= 0 && r.back.hasRoom() && pile.items.length) {
      r.t = 0.08 / k; r.back.receive(pile.take()!, 0.25, 0.7); r.wait = 0;
    }
    if (!r.back.hasRoom() || (r.back.n > 0 && r.wait > 1.2 && !pile.items.length)) {
      r.target = pickTarget(); r.state = 'toTarget';
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
