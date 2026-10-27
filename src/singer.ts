// The crooner's look, worn over a Person: a heartbroken sushi chef, run out of his kitchen in his whites. A white
// double-breasted jacket down to his knees, the chefs' red neckerchief knotted at the front, their puffy toque, black
// hair poking out under it, and a bunch of wilting flowers in a paper cone in his other hand.
// Swapped in while the player stands in the rain outside her house.
import { CylinderGeometry, Matrix4, Mesh, Quaternion, SphereGeometry, Vector3, type BufferGeometry, type Object3D } from 'three';
import type { Person } from './characters';
import { isHigh, onQuality } from './graphics';
import { Build, K, quietly, rbox, shade, tube } from './kit';
import { C } from './palette';
import { addTurned } from './propsMachines';
import { G, mat } from './render';

/** The chefs' own colours (characters.ts): their whites, cloth buttons, neckerchief and hair. */
const SKIN = 0xE0A97F, WHITES = 0xF4F6F8, BUTTON = 0xB8C0C8, SCARF = 0xE5484D, HAIR = 0x1E1B1A;
/** The flowers: their stems and leaves, and five heads. */
const STEM = 0x4E7A3A, PETALS = [C.red, C.gold, 0xB07CC6, C.gold, C.red];

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

/** The bunch, built along its own +y from the end in his fist (0) out to the heads, then set in the hand. */
const STEM_LEN = 0.17, WRAP = { r: 0.075, h: 0.22, tip: -0.05 };
const up = new Vector3(0, 1, 0), turn = new Quaternion();
/** A piece of `geo` at `at`, its +y turned to `dir`, sized by `scale`. */
function along(b: Build, geo: BufferGeometry, c: number, at: Vector3, dir: Vector3, scale: [number, number, number]) {
  b.pieces.push({ geo, c, m: new Matrix4().compose(at, turn.setFromUnitVectors(up, dir), new Vector3(...scale)) });
}

/**
 * The bunch of flowers in the hand at the end of an arm, hanging down and a little forward: a paper cone gripped by
 * its tip, greenery in its mouth, and five stems fanning out of it, each with its head on the end. High adds a red ribbon round the
 * cone and leaves round its mouth.
 */
function flowers(b: Build, hi: boolean) {
  const bunch = new Build();
  // the cone, its tip in his fist and its mouth open toward the heads
  bunch.add(G.cone, C.paper, 0, WRAP.tip + WRAP.h / 2, 0, [Math.PI, 0, 0], [WRAP.r, WRAP.h, WRAP.r]);
  const mouth = WRAP.tip + WRAP.h;
  // greenery filling its mouth, that the stems come up through
  bunch.add(K.dome, STEM, 0, mouth - 0.005, 0, null, [WRAP.r * 0.92, 0.03, WRAP.r * 0.92]);
  PETALS.forEach((c, i) => {
    // four round the edge and one in the middle, each stem from inside the cone out past its mouth
    const a = i * Math.PI / 2 + Math.PI / 4, k = i < 4 ? 0.32 : 0;
    const dir = new Vector3(Math.sin(a) * k, 1, Math.cos(a) * k).normalize();
    const from = new Vector3(dir.x * 0.02, mouth - 0.08, dir.z * 0.02), to = from.clone().addScaledVector(dir, STEM_LEN);
    along(bunch, K.post, STEM, from.clone().lerp(to, 0.5), dir, [0.009, STEM_LEN, 0.009]);
    along(bunch, K.ball, c, to.clone().addScaledVector(dir, 0.02), dir, [0.05, 0.034, 0.05]);
    along(bunch, K.dot, C.gold, to.clone().addScaledVector(dir, 0.05), dir, [0.018, 0.01, 0.018]);
    if (hi && i < 4) {
      const out = new Vector3(Math.sin(a + Math.PI / 4), 1.2, Math.cos(a + Math.PI / 4)).normalize();
      along(bunch, K.ball, STEM, new Vector3(out.x * 0.07, mouth + 0.01, out.z * 0.07), out, [0.018, 0.05, 0.008]);
    }
  });
  if (hi) bunch.add(K.post, C.red, 0, 0.09, 0, null, [0.044, 0.022, 0.044]);
  // in the fist (the hand's ball, below), hanging down and forward
  const hang = new Vector3(0, -0.72, 0.7).normalize();
  b.addAll(bunch, new Matrix4().compose(new Vector3(0, -0.32, 0.01), turn.setFromUnitVectors(up, hang), new Vector3(1, 1, 1)));
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
