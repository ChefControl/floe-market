// A rope that hangs like one: a thin tube laid along a curve between its two ends, and laid again whenever they move.
// It sags in the middle by as much as it's given, a wave can run along it (a line whipping out, or twanging as it takes
// the strain), and it never hangs lower than the floor under it. The fishing lines are drawn with it (fishing.ts, the
// auto harpoon's in machines.ts).
import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import { shade } from './kit';

/** How many lengths it's cut into, and how many sides it has. */
const SEGS = 14, SIDES = 5;
const RINGS = SEGS + 1;

const d = new Vector3(), side = new Vector3(), up = new Vector3(), t = new Vector3(), n1 = new Vector3(), n2 = new Vector3();
const UP = new Vector3(0, 1, 0), X = new Vector3(1, 0, 0);
const line = new Float32Array(RINGS * 3);

export interface Hang {
  /** How far its middle hangs under the straight line between its ends. */
  sag?: number;
  /** A wave along it: how far it swings off the line, how many times over its length (0: one bow, end to end), and
   *  where in its swing it is (radians). */
  wave?: number;
  waves?: number;
  phase?: number;
  /** The lowest it may hang at (x, z): the water, the dock's boards. */
  floor?: (x: number, z: number) => number;
}

/** How far a rope hangs in the middle with `slack` more of it than the `span` between its ends (a shallow curve's). */
export const sagOf = (span: number, slack: number) => Math.sqrt(Math.max(0, 0.375 * span * slack));

/**
 * A rope's shape, `r` thick: make it inside `quietly` (kit.ts). With `strands`, it's painted in two shades that wind
 * round it like a twisted rope's (for render.ts' `painted`); without, it's left plain for a material's own colour.
 */
export function ropeGeometry(r: number, strands?: number) {
  const g = new BufferGeometry(), index: number[] = [];
  g.setAttribute('position', new BufferAttribute(new Float32Array(RINGS * SIDES * 3), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(RINGS * SIDES * 3), 3));
  if (strands !== undefined) {
    const col = new Uint8Array(RINGS * SIDES * 3), dark = shade(strands, 0.78);
    for (let i = 0; i < RINGS; i++) for (let j = 0; j < SIDES; j++) {
      // (each ring's turned a little on from the last, lay(), so a side's stripe winds round)
      const c = j < 2 ? dark : strands, o = (i * SIDES + j) * 3;
      col[o] = c >> 16 & 255; col[o + 1] = c >> 8 & 255; col[o + 2] = c & 255;
    }
    g.setAttribute('color', new BufferAttribute(col, 3, true));
  }
  for (let i = 0; i < SEGS; i++) for (let j = 0; j < SIDES; j++) {
    const a = i * SIDES + j, b = i * SIDES + (j + 1) % SIDES, c = a + SIDES, e = b + SIDES;
    index.push(a, c, b, b, c, e);
  }
  g.setIndex(index);
  g.userData.r = r;
  return g;
}

/** Lays the rope `g` (a `ropeGeometry`) from `from` to `to`, hanging as `h` says. */
export function lay(g: BufferGeometry, from: Vector3, to: Vector3, h: Hang = {}) {
  const pos = g.attributes.position as BufferAttribute, nor = g.attributes.normal as BufferAttribute;
  const P = pos.array as Float32Array, N = nor.array as Float32Array, r: number = g.userData.r;
  d.subVectors(to, from);
  // the wave swings across the line and, half as far, up and down
  side.crossVectors(d, UP);
  if (side.lengthSq() < 1e-8) side.copy(X); else side.normalize();
  up.crossVectors(side, d).normalize();
  const sag = h.sag ?? 0, wave = h.wave ?? 0, waves = h.waves ?? 0, phase = h.phase ?? 0;
  for (let i = 0; i < RINGS; i++) {
    const u = i / SEGS, bow = Math.sin(u * Math.PI), w = wave ? wave * bow * Math.sin(u * waves * Math.PI * 2 - phase) : 0;
    const x = from.x + d.x * u + side.x * w + up.x * w * 0.5, z = from.z + d.z * u + side.z * w + up.z * w * 0.5;
    let y = from.y + d.y * u - sag * 4 * u * (1 - u) + side.y * w + up.y * w * 0.5;
    if (h.floor && i && i < SEGS) y = Math.max(y, h.floor(x, z));
    line[i * 3] = x; line[i * 3 + 1] = y; line[i * 3 + 2] = z;
  }
  for (let i = 0; i < RINGS; i++) {
    const a = Math.max(0, i - 1) * 3, b = Math.min(SEGS, i + 1) * 3, o = i * 3;
    t.set(line[b] - line[a], line[b + 1] - line[a + 1], line[b + 2] - line[a + 2]);
    n1.crossVectors(t, UP);
    if (n1.lengthSq() < 1e-10) n1.copy(X); else n1.normalize();
    n2.crossVectors(t, n1).normalize();
    for (let j = 0; j < SIDES; j++) {
      const th = (j / SIDES + i * 0.11) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th), v = (i * SIDES + j) * 3;
      const nx = n1.x * c + n2.x * s, ny = n1.y * c + n2.y * s, nz = n1.z * c + n2.z * s;
      P[v] = line[o] + nx * r; P[v + 1] = line[o + 1] + ny * r; P[v + 2] = line[o + 2] + nz * r;
      N[v] = nx; N[v + 1] = ny; N[v + 2] = nz;
    }
  }
  pos.needsUpdate = nor.needsUpdate = true;
}
