// Hired helper who ferries steaks from the pile to whichever counter is lowest.
import { animPerson, moveEnt, Person, type Walker } from './characters';
import { C1, COUNTERS, type Counter } from './counters';
import { carrySlot, Holder } from './holder';
import { scene } from './render';
import { PILE_STAND, pile } from './stations';
import { FY } from './util';

interface Runner extends Walker {
  g: Person;
  back: Holder;
  state: 'toPile' | 'load' | 'toCounter' | 'unload';
  /** Per-item transfer cooldown. */
  t: number;
  /** Time spent at the pile without picking anything up. */
  wait: number;
  target: Counter;
}

export let runner: Runner | null = null;

export function hireRunner(): Runner {
  const r: Runner = {
    g: new Person(0xFFC93C), h: 0, speed: 3.3, moving: false,
    state: 'toPile', t: 0, wait: 0, target: C1,
    back: new Holder(i => carrySlot(r, i), 8),
  };
  r.g.position.set(-4, FY, 3.6);
  scene.add(r.g);
  runner = r;
  return r;
}

export function updRunner(dt: number) {
  const r = runner;
  if (!r) return;
  if (r.state === 'toPile') {
    if (moveEnt(r, PILE_STAND, dt)) { r.state = 'load'; r.wait = 0; }
  } else if (r.state === 'load') {
    r.h = Math.PI; r.t -= dt; r.wait += dt;
    if (r.t <= 0 && r.back.hasRoom() && pile.items.length) {
      r.t = 0.08; r.back.receive(pile.take()!, 0.25, 0.7); r.wait = 0;
    }
    if (!r.back.hasRoom() || (r.back.n > 0 && r.wait > 1.2 && !pile.items.length)) {
      const opts = COUNTERS.filter(c => c.enabled).sort((a, b) => a.stock.n - b.stock.n);
      r.target = opts[0]; r.state = 'toCounter';
    }
  } else if (r.state === 'toCounter') {
    if (moveEnt(r, r.target.dropPos, dt)) r.state = 'unload';
  } else if (r.state === 'unload') {
    r.h = r.target === C1 ? 0 : Math.PI / 2; r.t -= dt;
    if (r.t <= 0 && r.back.items.length && r.target.stock.hasRoom()) {
      r.t = 0.08; r.target.stock.receive(r.back.take()!, 0.25, 0.8);
    }
    if (r.back.n === 0) r.state = 'toPile';
  }
  r.g.position.y = FY;
  r.g.rotation.y = r.h;
  animPerson(r.g, r.moving, dt, r.back.n > 0);
  r.back.layout(r.h);
}
