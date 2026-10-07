// Stacks of steaks/bills, and the arcing flights that move items between them.
import { Mesh, Object3D, Vector3 } from 'three';
import { scene } from './render';
import { fwd, V } from './util';

// ---------- flights ----------
interface Flight {
  m: Object3D;
  from: Vector3;
  toFn: () => Vector3;
  t: number;
  dur: number;
  arc: number;
  done?: () => void;
}
const flights: Flight[] = [];

export function fly(m: Object3D, toFn: () => Vector3, dur: number, arc: number, done?: () => void) {
  flights.push({ m, from: m.position.clone(), toFn, t: 0, dur, arc, done });
}

export function updFlights(dt: number) {
  // Forward, so flights that finish on the same frame land in launch order (and in their reserved slots).
  for (let i = 0; i < flights.length; i++) {
    const f = flights[i]; f.t += dt;
    const k = Math.min(1, f.t / f.dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    f.m.position.lerpVectors(f.from, f.toFn(), e);
    f.m.position.y += f.arc * 4 * k * (1 - k);
    if (k >= 1) { flights.splice(i--, 1); if (f.done) f.done(); }
  }
}

// ---------- holders ----------
/** Position of the i-th item in a stack. */
export type Slot = (i: number) => Vector3;

export class Holder {
  items: Mesh[] = [];
  /** Items currently flying in; they already count toward capacity. */
  inbound: Mesh[] = [];
  slot: Slot;
  cap: number;

  constructor(slot: Slot, cap: number) {
    this.slot = slot;
    this.cap = cap;
  }

  get incoming() { return this.inbound.length; }
  get n() { return this.items.length + this.inbound.length; }
  hasRoom() { return this.n < this.cap; }
  /** Everything held, including items still flying in. */
  all() { return this.items.concat(this.inbound); }

  receive(m: Mesh, dur = 0.3, arc = 0.9, cb?: (m: Mesh) => void) {
    const idx = this.n; this.inbound.push(m);
    if (!m.parent) scene.add(m);
    fly(m, () => this.slot(idx), dur, arc, () => {
      this.inbound.splice(this.inbound.indexOf(m), 1); this.items.push(m);
      m.position.copy(this.slot(this.items.length - 1));
      if (cb) cb(m);
    });
  }

  put(m: Mesh) {
    this.items.push(m);
    m.position.copy(this.slot(this.items.length - 1));
    scene.add(m);
  }

  take() { return this.items.pop() || null; }

  layout(rotY?: number) {
    for (let i = 0; i < this.items.length; i++) {
      const m = this.items[i];
      m.position.copy(this.slot(i));
      if (rotY !== undefined) m.rotation.y = rotY;
    }
  }

  clear() {
    this.items.forEach(m => scene.remove(m));
    this.items.length = 0;
  }
}

/** Stack slot in front of a walking character's chest. */
export function carrySlot(ent: { g: Object3D; h: number }, i: number) {
  const f = fwd(ent.h);
  return V(ent.g.position.x + f.x * 0.42, ent.g.position.y + 0.5 + i * 0.085, ent.g.position.z + f.z * 0.42);
}
