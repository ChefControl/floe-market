// The pop-in: something new grows in with a little overshoot, like a bought upgrade's machine or a new ad board.
import type { Object3D } from 'three';
import { pop } from './sfx';

const pops: { o: Object3D; t: number }[] = [];

export function popIn(o: Object3D) {
  pop();
  o.scale.setScalar(0.01);
  pops.push({ o, t: 0 });
}

export function updPops(dt: number) {
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i]; p.t += dt;
    const k = Math.min(1, p.t / 0.45);
    // easeOutBack
    const c1 = 1.70158, c3 = c1 + 1;
    const s = 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
    p.o.scale.setScalar(Math.max(0.01, s));
    if (k >= 1) { p.o.scale.setScalar(1); pops.splice(i, 1); }
  }
}
