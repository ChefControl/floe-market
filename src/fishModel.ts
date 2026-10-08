// The whole fish, as caught and as laid out in the kitchen: a tuna-ish body that's round in the middle and tapers to
// both ends, dark blue on the back fading to a silver belly, with a forked tail, fins and eyes. The geometry is built
// once and shared. The nose points along +x.
import {
  BufferAttribute, type BufferGeometry, Color, DoubleSide, Group, LatheGeometry, MathUtils, Mesh, MeshLambertMaterial,
  Shape, ShapeGeometry, SphereGeometry, Vector2,
} from 'three';
import { bake, bakePainted, painted } from './render';

const BACK = 0x2B4C86, BELLY = 0xDCE6EE, FIN = 0x23406F, GOLD = 0xF2C14E;

/** The body: a lathe round its length, a little flatter side to side, coloured by height (back to belly). */
const body = (() => {
  const profile = [
    [0, -0.62], [0.04, -0.58], [0.09, -0.48], [0.15, -0.32], [0.2, -0.12], [0.215, 0.04], [0.2, 0.2], [0.16, 0.36],
    [0.1, 0.5], [0.045, 0.59], [0, 0.63],
  ].map(([r, y]) => new Vector2(r, y));
  const g = new LatheGeometry(profile, 20);
  g.rotateZ(-Math.PI / 2); // along x, nose first
  g.scale(1, 1, 0.82);
  const pos = g.attributes.position, colors = new Float32Array(pos.count * 3);
  const back = new Color(BACK), belly = new Color(BELLY), c = new Color();
  for (let i = 0; i < pos.count; i++) {
    c.lerpColors(belly, back, MathUtils.smoothstep(pos.getY(i), -0.05, 0.08));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new BufferAttribute(colors, 3));
  return g;
})();

const flat = (pts: [number, number][]) => {
  const s = new Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  return new ShapeGeometry(s);
};
/** A forked tail, upright, from where the body ends. */
const tailGeo = flat([[0.02, 0], [-0.24, 0.24], [-0.17, 0.02], [-0.17, -0.02], [-0.24, -0.24]]);
const dorsalGeo = flat([[-0.16, 0], [0.12, 0], [-0.08, 0.17]]);
const finletGeo = flat([[-0.07, 0], [0.05, 0], [-0.05, 0.09]]);
const pectoralGeo = flat([[0, 0], [-0.2, 0.05], [-0.16, -0.03]]);
const eyeGeo = new SphereGeometry(0.035, 10, 8), pupilGeo = new SphereGeometry(0.02, 8, 6);

/** The body's material, shared by every fish; a fish being chopped gets its own copy (see fishing.ts). */
export const bodyMat = new MeshLambertMaterial({ vertexColors: true });
const finMat = new MeshLambertMaterial({ color: FIN, side: DoubleSide });
const goldMat = new MeshLambertMaterial({ color: GOLD, side: DoubleSide });

/** Length of a whole fish, nose to tail tip. */
export const FISH_LEN = 0.63 + 0.62 + 0.22;

/** `geo` mirrored top to bottom, its triangles turned round so they face the way they did (as a scale.y of -1 draws). */
function upsideDown<T extends BufferGeometry>(geo: T) {
  const g = geo.clone().scale(1, -1, 1), ix = g.index!;
  for (let i = 0; i < ix.count; i += 3) { const b = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, b); }
  return g;
}
const finletDown = upsideDown(finletGeo);
const finsMat = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });

// Everything but the body and tail is baked, a mesh for each stretch of the fish the cleaver cuts off in one go
// (fishing.ts hides what's behind each cut by its x): the back pair of finlets; the front pair and the dorsal fin;
// the pectoral fins; and the eyes. So a fish is 6 meshes rather than 13.
const BACK_FINLETS = bake([{ geo: finletGeo, at: [0, 0.11, 0] }, { geo: finletDown, at: [0, -0.11, 0] }]);
const FRONT_FINS = bakePainted([
  { geo: finletGeo, c: GOLD, at: [0, 0.11, 0] }, { geo: finletDown, c: GOLD, at: [0, -0.11, 0] },
  { geo: dorsalGeo, c: FIN, at: [0.32, 0.19, 0] },
]);
const PECTORALS = bake([-1, 1].map(s => ({ geo: pectoralGeo, at: [0, -0.02, s * 0.16], rot: [s * 0.5, 0, 0] })));
const EYES = bakePainted([-1, 1].flatMap(s => [
  { geo: eyeGeo, c: 0xF4F6F8, at: [0, 0.05, s * 0.1] }, { geo: pupilGeo, c: 0x111820, at: [0.015, 0.05, s * 0.125] },
]));

/** A new whole fish: the group, its body (for clipping when it's chopped) and its tail (to wiggle as it swims). */
export function newFish() {
  const g = new Group();
  const b = new Mesh(body, bodyMat); g.add(b);
  const tail = new Group(); tail.position.x = -0.6; g.add(tail);
  tail.add(new Mesh(tailGeo, finMat));
  const parts = [[BACK_FINLETS, goldMat, -0.4], [FRONT_FINS, finsMat, -0.3], [PECTORALS, finMat, 0.28], [EYES, painted, 0.47]] as const;
  for (const [geo, m, x] of parts) { const part = new Mesh(geo, m); part.position.x = x; g.add(part); }
  return { g, body: b, tail };
}
