// The crooner's look, worn over a Person: a heartbroken sushi chef, run out of his kitchen in his whites. A white
// double-breasted jacket down to his knees, the chefs' red neckerchief knotted at the front, their puffy toque, black
// hair poking out under it, and a bunch of wilting flowers in a paper cone in his other hand.
// Swapped in while the player stands in the rain outside her house.
import { CylinderGeometry, Mesh, SphereGeometry, type BufferGeometry, type Object3D } from 'three';
import type { Person } from './characters';
import { isHigh, onQuality } from './graphics';
import { Build, K, quietly, rbox, shade, tube } from './kit';
import { C } from './palette';
import { addTurned } from './propsMachines';
import { G, mat } from './render';

/** The chefs' own colours (characters.ts): their whites, cloth buttons, neckerchief and hair. */
const SKIN = 0xE0A97F, WHITES = 0xF4F6F8, BUTTON = 0xB8C0C8, SCARF = 0xE5484D, HAIR = 0x1E1B1A;
/** The flowers, drooping: their stems and leaves, and three heads. */
const STEM = 0x4E7A3A, PETALS = [C.red, C.gold, 0xB07CC6];

/** A little heavier than the parka: the jacket is this much wider, and the arms sit this much further out. */
const BUILD = 1.1;
/** Head is a 0.2 sphere here; +z is the face. */
const HEAD = { y: 1.03, z: 0.05 };
/** The parka body's radius at height y (it tapers from 0.3 at y 0.3 to 0.22 at y 0.9), scaled to the jacket. */
const bodyR = (y: number) => (0.22 + (0.9 - y) / 0.6 * 0.08) * BUILD;
/** The jacket's front leans out going down by this much. */
const LEAN = Math.atan(0.08 * BUILD / 0.6);
/** The toque, a head chef's height (characters.ts toque(1)): its band's height, and where it starts. */
const TOQUE = { h: 0.18, y: 1.16 };

const [hairGeo, hemGeo] = quietly(() => [
  /** His hair, as the chefs wear it (characters.ts): over the top and the back, under the toque. */
  new SphereGeometry(0.216, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.46),
  /** A band round the jacket (its hems): the sides of a ten-sided drum, sized by its scale. */
  new CylinderGeometry(1, 1, 1, 10, 1, true),
]);

/** A flat piece on the jacket's front, `x` across from the middle, tilted to lie on it. */
function onFront(b: Build, geo: BufferGeometry, c: number, x: number, y: number, out = 0.004, rz = 0, scale: [number, number, number] = [1, 1, 1]) {
  const r = bodyR(y), z = Math.sqrt(r * r - x * x) + out;
  addTurned(b, geo, c, [x, y, z], [-LEAN, Math.asin(x / r), rz], 'YXZ', scale);
}

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
 * The bunch of flowers, in the hand at the end of an arm: a paper cone held tip up, and out of its mouth the stems and
 * three heads flopping over, down toward the ground. High adds the leaves.
 */
function flowers(b: Build, hi: boolean) {
  b.add(G.cone, C.paper, 0, -0.38, 0.08, [-0.9, 0, 0], [0.08, 0.26, 0.08]);
  PETALS.forEach((c, i) => {
    const x = (i - 1) * 0.06, z = 0.2 + (i % 2) * 0.03;
    b.add(tube(0.01, 0.01, 0.12, 5), STEM, x, -0.47, z, [0.9, 0, (i - 1) * 0.5]);
    b.add(K.ball, c, x * 1.6, -0.53 - (i % 2) * 0.03, z + 0.04, null, [0.055, 0.04, 0.055]);
    b.add(K.dot, C.gold, x * 1.6, -0.565 - (i % 2) * 0.03, z + 0.045, null, 0.018);
    if (hi) b.add(K.ball, STEM, x * 1.3, -0.45, z - 0.02, [0, 0, (i - 1) * 0.8], [0.02, 0.05, 0.01]);
  });
}

/**
 * The look in one detail or the other: High adds ears and a nose, the cloth buttons, the jacket's hems, the sleeves'
 * cuffs and the flowers' leaves, all baked into a few meshes. Hidden; returns its meshes.
 */
function build(p: Person, hi: boolean) {
  const shell = new Build(), trim = new Build();
  // the head, with eyebrows raised in the middle, and black hair round the sides and poking out at the front
  trim.add(G.head, SKIN, 0, HEAD.y, HEAD.z);
  trim.add(hairGeo, HAIR, 0, HEAD.y, HEAD.z, [-0.35, 0, 0]);
  for (const s of [-1, 1]) trim.add(rbox(0.08, 0.024, 0.02, 0.009), HAIR, s * 0.072, HEAD.y + 0.058, HEAD.z + 0.19, [0, 0, s * -0.3]);
  for (const x of [-0.12, -0.06, 0, 0.06, 0.12]) {
    trim.add(G.cone, HAIR, x, 1.135, 0.2 - Math.abs(x) * 0.35, [Math.PI - 0.5, 0, -x * 2], [0.03, 0.08, 0.025]);
  }
  if (hi) {
    for (const s of [-1, 1]) trim.add(K.dot, SKIN, s * 0.197, 1.02, 0.045, null, [0.032, 0.048, 0.038]);
    trim.add(K.dot, shade(SKIN, 0.93), 0, 1.008, 0.247, null, [0.03, 0.026, 0.026]);
  }

  // the toque: its band and the puff on top
  shell.add(G.cyl, WHITES, 0, TOQUE.y + TOQUE.h / 2, 0.03, null, [0.19, TOQUE.h, 0.19]);
  shell.add(G.sphere, WHITES, 0, TOQUE.y + TOQUE.h + 0.08, 0.03, null, [0.25, 0.16, 0.25]);

  // the jacket, rounded over at the shoulders and down to his knees, its front crossed over and buttoned double
  shell.add(G.body, WHITES, 0, 0.6, 0, null, [BUILD, 1, BUILD]);
  shell.add(K.dome, WHITES, 0, 0.9, 0, null, [0.22 * BUILD, 0.092, 0.22 * BUILD]);
  shell.add(tube(0.33, 0.37, 0.2, 10, true), WHITES, 0, 0.21, 0);
  onFront(trim, rbox(0.012, 0.5, 0.012, 0.005), shade(WHITES, 0.88), 0.1, 0.6, 0.006);
  // the neckerchief round his neck, knotted at the front, its ends hanging down
  trim.add(G.hood, SCARF, 0, 0.88, 0.02, [Math.PI / 2, 0, 0], 1.15);
  onFront(trim, K.ball, SCARF, 0, 0.84, 0.03, 0, [0.04, 0.035, 0.03]);
  for (const s of [-1, 1]) onFront(trim, G.cone, SCARF, s * 0.03, 0.77, 0.02, Math.PI + s * 0.35, [0.04, 0.12, 0.012]);
  if (hi) {
    for (const x of [-0.06, 0.06]) for (const y of [0.7, 0.6, 0.5]) onFront(trim, K.dot, BUTTON, x, y, 0.008, 0, [0.017, 0.017, 0.01]);
    const hem = 0.3 * BUILD + 0.006;
    shell.add(hemGeo, shade(WHITES, 0.92), 0, 0.325, 0, null, [hem, 0.04, hem]);
    shell.add(hemGeo, shade(WHITES, 0.92), 0, 0.12, 0, null, [0.373, 0.03, 0.373]);
  }

  const meshes: Object3D[] = hi ? [shell.mesh(), trim.mesh(false)] : [...apart(shell, true), ...apart(trim, false)];
  p.body.add(...meshes);
  // white sleeves down to the hands; the flowers in the hand of the arm that isn't wiping his tears (rain.ts)
  p.arms.forEach((a, i) => {
    const arm = new Build();
    arm.add(K.ball, WHITES, 0, -0.005, 0, null, [0.07, 0.066, 0.07]);
    arm.add(tube(0.066, 0.058, 0.3, 8, true), WHITES, 0, -0.14, 0);
    if (hi) arm.add(tube(0.063, 0.063, 0.03, 8), shade(WHITES, 0.9), 0, -0.275, 0);
    arm.add(K.ball, SKIN, 0, -0.315, 0.004, null, [0.05, 0.056, 0.05]);
    if (i) flowers(arm, hi);
    const ms = hi ? [arm.mesh()] : apart(arm, true);
    a.add(...ms);
    meshes.push(...ms);
  });
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
