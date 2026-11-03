// A boat's course over the sea: a smooth curve from the first of four points to the last, the middle two pulling it
// round (a cubic Bézier), measured along its length, so a boat goes along it at the pace it's eased to, not faster
// where the curve's points are spread out. The voting boat sails in and out on these (votingBoat.ts), and the casino
// yacht sails in on one (casino.ts).
import type { Vector3 } from 'three';

/** Points measured along a curve. */
const STEPS = 64;

/** The point `k` of the way along the curve through `c`, and which way it's heading there. */
function curve(c: Vector3[], k: number) {
  const j = 1 - k, w = [j * j * j, 3 * k * j * j, 3 * k * k * j, k * k * k], d = [-j * j, j * j - 2 * k * j, 2 * k * j - k * k, k * k];
  let x = 0, z = 0, dx = 0, dz = 0;
  c.forEach((p, i) => { x += w[i] * p.x; z += w[i] * p.z; dx += d[i] * p.x; dz += d[i] * p.z; });
  return { x, z, dx, dz };
}

/** The course through `c`: where a boat is `f` of the way along it (by its length), and which way it's heading. */
export function course(c: Vector3[]) {
  const len = [0];
  let { x, z } = c[0];
  for (let i = 1; i <= STEPS; i++) {
    const n = curve(c, i / STEPS);
    len.push(len[i - 1] + Math.hypot(n.x - x, n.z - z));
    ({ x, z } = n);
  }
  return (f: number) => {
    const want = f * len[STEPS];
    let i = 1;
    while (i < STEPS && len[i] < want) i++;
    return curve(c, (i - 1 + (want - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1])) / STEPS);
  };
}
