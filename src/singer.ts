// The crooner's look, worn over a Person: a sand trench coat to the knees, belted, its collar turned up and buttoned
// double down the front, a red scarf, and a charcoal hat with a black band, tipped back; brown hair at the sides.
// Swapped in while the player stands in the rain outside her house.
import { CylinderGeometry, Matrix4, Mesh, SphereGeometry, TorusGeometry, type BufferGeometry, type Object3D } from 'three';
import type { Person } from './characters';
import { isHigh, onQuality } from './graphics';
import { Build, K, quietly, rbox, shade, tube } from './kit';
import { C } from './palette';
import { addTurned } from './propsMachines';
import { G, mat } from './render';

const SKIN = 0xE0A97F, COAT = 0xB8945E, HAT = 0x34373E, BAND = 0x18181C, HAIR = 0x4A3426, BUCKLE = 0x2A2A2A;

/** A little heavier than the parka: the coat is this much wider, and the arms sit this much further out. */
const BUILD = 1.1;
/** Head is a 0.2 sphere here; +z is the face. */
const HEAD = { y: 1.03, z: 0.05 };
/** The parka body's radius at height y (it tapers from 0.3 at y 0.3 to 0.22 at y 0.9), scaled to the coat. */
const bodyR = (y: number) => (0.22 + (0.9 - y) / 0.6 * 0.08) * BUILD;
/** The coat's front leans out going down by this much. */
const LEAN = Math.atan(0.08 * BUILD / 0.6);
/** How far the hat's tipped back, so the camera above still sees his face. */
const TIP = 0.28;

const [hairGeo, hemGeo, collarGeo, scarfGeo, brimGeo] = quietly(() => [
  /** Hair round the sides and back, under the hat. */
  new SphereGeometry(0.21, 14, 6, Math.PI / 2 + 1, Math.PI * 2 - 2, Math.PI * 0.42, Math.PI * 0.18),
  /** A band round the coat (its hems, the belt): the sides of a ten-sided drum, sized by its scale. */
  new CylinderGeometry(1, 1, 1, 10, 1, true),
  /** The collar, turned up round the back of the neck and open at the front. */
  new CylinderGeometry(0.215, 0.2, 0.12, 14, 1, true, 0.75, Math.PI * 2 - 1.5),
  new TorusGeometry(0.19, 0.06, 6, 14),
  new CylinderGeometry(1, 1, 1, 18),
]);

/** A flat piece on the coat's front, `x` across from the middle, tilted to lie on it. */
function onFront(b: Build, geo: BufferGeometry, c: number, x: number, y: number, out = 0.004, rz = 0, scale: [number, number, number] = [1, 1, 1]) {
  const r = bodyR(y), z = Math.sqrt(r * r - x * x) + out;
  addTurned(b, geo, c, [x, y, z], [-LEAN, Math.asin(x / r), rz], 'YXZ', scale);
}
const flat = (w: number, h: number, d = 0.02) => rbox(w, h, d, Math.min(0.008, d / 2));

/** Low's way of drawing him: each piece a mesh of its own, as it always has been, casting a shadow if `cast`. */
function apart(b: Build, cast: boolean) {
  return b.pieces.map(({ geo, c, m }) => {
    const o = new Mesh(geo, mat(c));
    m.decompose(o.position, o.quaternion, o.scale);
    o.castShadow = cast;
    o.receiveShadow = true;
    return o;
  });
}

/**
 * The look in one detail or the other: High adds ears and a nose, the coat's hems, epaulettes and buttons, the sleeves'
 * cuffs and the pinch in the hat's crown, all baked into a few meshes. Hidden; returns its meshes.
 */
function build(p: Person, hi: boolean) {
  const shell = new Build(), trim = new Build();
  // the head, with eyebrows raised in the middle
  trim.add(G.head, SKIN, 0, HEAD.y, HEAD.z);
  for (const s of [-1, 1]) trim.add(rbox(0.08, 0.024, 0.02, 0.009), HAIR, s * 0.072, HEAD.y + 0.058, HEAD.z + 0.19, [0, 0, s * -0.3]);
  trim.add(hairGeo, HAIR, 0, HEAD.y, HEAD.z - 0.005);
  if (hi) {
    for (const s of [-1, 1]) trim.add(K.dot, SKIN, s * 0.197, 1.02, 0.045, null, [0.032, 0.048, 0.038]);
    trim.add(K.dot, shade(SKIN, 0.93), 0, 1.008, 0.247, null, [0.03, 0.026, 0.026]);
  }

  // the coat, rounded over at the shoulders, its skirt down to the knees and its collar turned up
  shell.add(G.body, COAT, 0, 0.6, 0, null, [BUILD, 1, BUILD]);
  shell.add(K.dome, COAT, 0, 0.9, 0, null, [0.22 * BUILD, 0.092, 0.22 * BUILD]);
  shell.add(tube(0.33, 0.37, 0.2, 10, true), COAT, 0, 0.21, 0);
  shell.add(collarGeo, shade(COAT, 0.92), 0, 0.95, 0);
  // the red scarf round the neck and down the front, between the lapels
  trim.add(scarfGeo, C.red, 0, 0.9, 0.01, [Math.PI / 2, 0, 0], 1.1);
  onFront(trim, flat(0.08, 0.26), C.red, 0.03, 0.74, 0.008, 0.06);
  for (const s of [-1, 1]) onFront(trim, flat(0.07, 0.3), shade(COAT, 0.88), s * 0.1, 0.7, 0.006, -s * 0.22);
  // the belt and its buckle
  const belt = bodyR(0.47) + 0.008;
  trim.add(hemGeo, shade(COAT, 0.72), 0, 0.47, 0, null, [belt, 0.05, belt]);
  onFront(trim, flat(0.05, 0.05, 0.01), BUCKLE, 0, 0.47, 0.012);
  if (hi) {
    const hem = 0.3 * BUILD + 0.006;
    shell.add(hemGeo, shade(COAT, 0.8), 0, 0.325, 0, null, [hem, 0.05, hem]);
    shell.add(hemGeo, shade(COAT, 0.8), 0, 0.12, 0, null, [0.373, 0.03, 0.373]);
    for (const s of [-1, 1]) {
      for (const y of [0.62, 0.52, 0.4]) onFront(trim, K.dot, HAIR, s * 0.09, y, 0.012, 0, [0.015, 0.015, 0.008]);
      shell.add(rbox(0.06, 0.016, 0.14, 0.006), shade(COAT, 0.9), s * 0.15, 0.962, 0, [0, 0, -s * 0.42]);
    }
  }

  // the hat, tipped back: a wide brim, the crown and its band (and on High, the pinch at the front of the crown)
  const hat = new Build();
  hat.add(brimGeo, HAT, 0, 0.15, 0, null, [0.3, 0.016, 0.3]);
  hat.add(tube(0.15, 0.18, 0.15, 12), HAT, 0, 0.23, 0);
  hat.add(tube(0.182, 0.182, 0.036, 12), BAND, 0, 0.175, 0);
  if (hi) {
    hat.add(K.dome, HAT, 0, 0.3, 0, null, [0.15, 0.04, 0.15]);
    hat.add(rbox(0.07, 0.04, 0.02, 0.008), shade(HAT, 0.8), 0, 0.31, 0.11, [-0.5, 0, 0]);
  }
  shell.addAll(hat, new Matrix4().makeRotationX(-TIP).setPosition(0, HEAD.y, HEAD.z - 0.02));

  const meshes: Object3D[] = hi ? [shell.mesh(), trim.mesh(false)] : [...apart(shell, true), ...apart(trim, false)];
  p.body.add(...meshes);
  // the coat's sleeves down to the hands
  for (const a of p.arms) {
    const arm = new Build();
    arm.add(K.ball, COAT, 0, -0.005, 0, null, [0.07, 0.066, 0.07]);
    arm.add(tube(0.066, 0.058, 0.3, 8, true), COAT, 0, -0.14, 0);
    if (hi) arm.add(tube(0.063, 0.063, 0.03, 8), shade(COAT, 0.8), 0, -0.275, 0);
    arm.add(K.ball, SKIN, 0, -0.315, 0.004, null, [0.05, 0.056, 0.05]);
    const ms = hi ? [arm.mesh()] : apart(arm, true);
    a.add(...ms);
    meshes.push(...ms);
  }
  for (const m of meshes) m.visible = false;
  return meshes;
}

/** Builds the crooner's look onto `p`, hidden; returns a switch between it and their own clothes. */
export function singerLook(p: Person) {
  const own: Object3D[] = p.arms.map(a => a.children[0]);
  const side = p.arms.map(a => Math.sign(a.position.x));
  // (their body and head, the hood and the rest of the season's clothes come off with p.disguised)
  const low = quietly(() => build(p, false)), high = quietly(() => build(p, true));
  let wearing = false;
  const show = () => {
    const h = isHigh();
    for (const o of own) o.visible = !wearing;
    for (const o of low) o.visible = wearing && !h;
    for (const o of high) o.visible = wearing && h;
  };
  onQuality(show);

  /** Wears the crooner's look (true) or the player's own clothes (false). */
  return (on: boolean) => {
    wearing = on;
    show();
    p.disguised = on;
    p.wear();
    p.arms.forEach((a, i) => { a.position.x = side[i] * p.armSpread * (on ? BUILD : 1); });
  };
}
