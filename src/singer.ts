// The singer's look (Ofer Levy), worn over a Person: a navy baseball cap over short grey hair, a short grey beard,
// an olive field jacket open over a white T-shirt, a gold chain, and a gold watch and a black leather bracelet.
// Swapped in while the player stands in the rain outside her house.
import { BoxGeometry, CylinderGeometry, Mesh, MeshPhongMaterial, SphereGeometry, TorusGeometry, type Object3D } from 'three';
import type { Person } from './characters';
import { isHigh, onQuality } from './graphics';
import { baked, Build, K, quietly, rbox, shade, tube } from './kit';
import { addTurned } from './propsMachines';
import { G, mat, mesh } from './render';

const SKIN = 0xE0A97F, GREY = 0x8E8B88, BEARD = 0xC9C4BC, CAP = 0x1F2A4D, JACKET = 0x5F7A3B, POCKET = 0x4E6630;
const gold = new MeshPhongMaterial({ color: 0xD9A933, specular: 0xFFF0B0, shininess: 80, emissive: 0x1A1200 });
const leather = new MeshPhongMaterial({ color: 0x1B1B1B, specular: 0x555555, shininess: 30 });

/** A little heavier than the parka: the jacket is this much wider, and the arms sit this much further out. */
const BUILD = 1.1;
/** Head is a 0.2 sphere here; +z is the face. Sphere angles: phi PI/2 points at +z, theta 0 is straight up. */
const HEAD = { y: 1.03, z: 0.05 };
/** The parka body's radius at height y (it tapers from 0.3 at y 0.3 to 0.22 at y 0.9), scaled to the jacket. */
const bodyR = (y: number) => (0.22 + (0.9 - y) / 0.6 * 0.08) * BUILD;
/** The jacket's front leans out going down by this much. */
const LEAN = Math.atan(0.08 * BUILD / 0.6);

const crownGeo = new SphereGeometry(0.205, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42);
/** Short grey hair round the sides and back, under the cap. */
const hairGeo = new SphereGeometry(0.21, 14, 6, Math.PI / 2 + 1, Math.PI * 2 - 2, Math.PI * 0.42, Math.PI * 0.18);
const beardGeo = new SphereGeometry(0.209, 14, 8, Math.PI / 2 - 1.3, 2.6, Math.PI * 0.52, Math.PI * 0.32);
const browGeo = new BoxGeometry(0.08, 0.024, 0.02);
/** Stand-up jacket collar, open at the front. */
const collarGeo = new TorusGeometry(0.2, 0.028, 6, 20, Math.PI * 2 - 1.4);
const linkGeo = new BoxGeometry(0.012, 1, 0.012);

/** Builds the singer's look onto `p`, hidden; returns a switch between it and their own clothes. */
export function singerLook(p: Person) {
  const own: Object3D[] = [];
  const look: Object3D[] = [];
  const add = <T extends Object3D>(o: T, parent: Object3D = p.body) => { o.visible = false; parent.add(o); look.push(o); return o; };
  /** A flat piece on the jacket's front, `x` across from the middle, tilted to lie on it. */
  const onFront = (w: number, h: number, c: number, x: number, y: number, out = 0.004) => {
    const r = bodyR(y), z = Math.sqrt(r * r - x * x) + out;
    const m = add(mesh(new BoxGeometry(w, h, 0.02), c, x, y, z));
    m.rotation.set(-LEAN, Math.asin(x / r), 0, 'YXZ');
    return m;
  };

  // (their body and head, the hood and the rest of the season's clothes come off with p.disguised)
  add(mesh(G.head, SKIN, 0, HEAD.y, HEAD.z));

  // The jacket: open over a white T-shirt, with a stand-up collar, a zip down each edge and two chest pockets.
  add(mesh(G.body, JACKET, 0, 0.6, 0, true)).scale.set(BUILD, 1, BUILD);
  onFront(0.13, 0.42, 0xF4F6F8, 0, 0.62, 0.002);
  for (const s of [-1, 1]) {
    onFront(0.03, 0.46, POCKET, s * 0.075, 0.6);
    onFront(0.11, 0.1, POCKET, s * 0.16, 0.66);
    onFront(0.11, 0.03, 0x3E5226, s * 0.16, 0.71, 0.008);
  }
  const collar = add(new Mesh(collarGeo, mat(JACKET)));
  collar.position.y = 0.91;
  collar.rotation.set(Math.PI / 2, 0, Math.PI / 2 + 0.7);
  // A gold chain down to a pendant on the T-shirt.
  for (const s of [-1, 1]) {
    const l = add(new Mesh(linkGeo, gold));
    l.scale.y = Math.hypot(0.06, 0.13);
    l.position.set(s * 0.03, 0.83, bodyR(0.83) + 0.008);
    l.rotation.set(-LEAN, 0, -s * Math.atan2(0.06, 0.13), 'YXZ');
  }
  add(new Mesh(new SphereGeometry(0.02, 8, 6), gold)).position.set(0, 0.765, bodyR(0.765) + 0.01);

  // Jacket sleeves down to the hands; a gold watch on one wrist, a black leather bracelet on the other.
  const side = p.arms.map(a => Math.sign(a.position.x));
  p.arms.forEach((a, i) => {
    own.push(a.children[0]);
    add(mesh(G.arm, JACKET, 0, -0.14, 0, true), a).scale.set(1.15, 0.94, 1.1);
    add(mesh(new BoxGeometry(0.09, 0.07, 0.1), SKIN, 0, -0.33, 0), a);
    add(new Mesh(new BoxGeometry(0.115, 0.035, 0.13), i ? leather : gold), a).position.y = -0.29;
  });

  // Navy cap (crown and brim), grey hair under it, a short grey beard and moustache, and eyebrows raised in the middle.
  // The cap sits high and its brim is short and tipped up a little, so the camera above can still see his face.
  add(mesh(crownGeo, CAP, 0, HEAD.y + 0.045, HEAD.z - 0.01, true));
  const brim = add(mesh(new BoxGeometry(0.2, 0.016, 0.075), CAP, 0, HEAD.y + 0.11, HEAD.z + 0.215, true));
  brim.rotation.x = -0.4;
  add(mesh(hairGeo, GREY, 0, HEAD.y, HEAD.z - 0.005));
  add(mesh(beardGeo, BEARD, 0, HEAD.y, HEAD.z));
  add(mesh(new BoxGeometry(0.12, 0.03, 0.03), BEARD, 0, HEAD.y - 0.045, HEAD.z + 0.195));
  for (const s of [-1, 1]) {
    const b = add(new Mesh(browGeo, mat(0x4A4542)));
    b.position.set(s * 0.072, HEAD.y + 0.058, HEAD.z + 0.19); b.rotation.z = s * -0.3;
  }

  // On High (graphics.ts), the same look in the people's detail instead, baked into a few meshes.
  const high = quietly(() => highLook(p, side));
  let wearing = false;
  const show = () => {
    const h = isHigh();
    for (const o of own) o.visible = !wearing;
    for (const o of look) o.visible = wearing && !h;
    for (const o of high) o.visible = wearing && h;
  };
  onQuality(show);

  /** Wears the singer's look (true) or the player's own clothes (false). */
  return (on: boolean) => {
    wearing = on;
    show();
    p.disguised = on;
    p.wear();
    p.arms.forEach((a, i) => { a.position.x = side[i] * p.armSpread * (on ? BUILD : 1); });
  };
}

/**
 * The hem round the bottom of the jacket (the body's ten sides, so it sits flat on them), and the cap's brim: the
 * front half of a disc, its straight edge against the cap.
 */
const [hemGeo, brimGeo] = quietly(() => [
  new CylinderGeometry(1, 1, 1, 10, 1, true),
  new CylinderGeometry(0.1, 0.1, 0.016, 12, 1, false, -Math.PI / 2, Math.PI),
]);
const BUTTON = 0x8C7A4A;

/**
 * The singer's look in High's detail, the way the people are drawn (characters.ts): rounded sleeves with hands, the
 * jacket's shoulders, hem, epaulettes and four flapped pockets with buttons, ears and a nose, a rounded moustache and a
 * curved cap brim with a button on top, a chain of little links, and a watch with a face. Hidden; returns its meshes.
 */
function highLook(p: Person, side: number[]) {
  const shell = new Build(), trim = new Build(), chain = new Build(), X = Math.PI / 2;
  /** A flat piece lying on the jacket's front, `x` across from the middle, as on Low. */
  const onFront = (b: Build, w: number, h: number, c: number, x: number, y: number, out = 0.004, d = 0.02, rz = 0) => {
    const r = bodyR(y), z = Math.sqrt(r * r - x * x) + out;
    addTurned(b, rbox(w, h, d, Math.min(0.008, d / 2)), c, [x, y, z], [-LEAN, Math.asin(x / r), rz], 'YXZ');
  };
  // the jacket, rounded over at the shoulders, with a darker hem and a stand-up collar
  shell.add(G.body, JACKET, 0, 0.6, 0, null, [BUILD, 1, BUILD]);
  shell.add(K.dome, JACKET, 0, 0.9, 0, null, [0.22 * BUILD, 0.092, 0.22 * BUILD]);
  const hem = 0.3 * BUILD + 0.006;
  shell.add(hemGeo, shade(JACKET, 0.8), 0, 0.325, 0, null, [hem, 0.05, hem]);
  shell.add(collarGeo, JACKET, 0, 0.91, 0, [Math.PI / 2, 0, Math.PI / 2 + 0.7]);
  // open over the T-shirt: zips down both edges, chest and hip pockets with buttoned flaps, epaulettes
  onFront(trim, 0.13, 0.42, 0xF4F6F8, 0, 0.62, 0.002);
  for (const s of [-1, 1]) {
    onFront(trim, 0.03, 0.46, POCKET, s * 0.075, 0.6);
    onFront(trim, 0.006, 0.44, 0xB8B0A0, s * 0.062, 0.6, 0.012, 0.008);
    for (const [x, y, w, h] of [[0.16, 0.66, 0.11, 0.1], [0.17, 0.43, 0.12, 0.1]]) {
      onFront(trim, w, h, POCKET, s * x, y);
      onFront(trim, w + 0.006, 0.035, 0x3E5226, s * x, y + h / 2, 0.01);
      onFront(trim, 0.018, 0.018, BUTTON, s * x, y + h / 2 - 0.005, 0.02, 0.008);
    }
    shell.add(rbox(0.055, 0.014, 0.14, 0.006), shade(JACKET, 0.9), s * 0.15, 0.962, 0, [0, 0, -s * 0.42]);
    trim.add(K.dot, BUTTON, s * 0.19, 0.95, 0.045, null, 0.012);
  }
  // the head: ears and a nose, grey hair, the beard and a moustache, eyebrows raised in the middle
  trim.add(G.head, SKIN, 0, HEAD.y, HEAD.z);
  for (const s of [-1, 1]) trim.add(K.dot, SKIN, s * 0.197, 1.02, 0.045, null, [0.032, 0.048, 0.038]);
  trim.add(K.dot, shade(SKIN, 0.93), 0, 1.008, 0.247, null, [0.03, 0.026, 0.026]);
  trim.add(hairGeo, GREY, 0, HEAD.y, HEAD.z - 0.005);
  trim.add(beardGeo, BEARD, 0, HEAD.y, HEAD.z);
  for (const s of [-1, 1]) {
    trim.add(K.ball, BEARD, s * 0.032, HEAD.y - 0.046, HEAD.z + 0.196, [0, 0, s * 0.22], [0.042, 0.018, 0.02]);
    trim.add(rbox(0.08, 0.024, 0.02, 0.009), 0x4A4542, s * 0.072, HEAD.y + 0.058, HEAD.z + 0.19, [0, 0, s * -0.3]);
  }
  // the navy cap: its crown with a button on top, and a curved brim tipped up a little, as on Low
  shell.add(crownGeo, CAP, 0, HEAD.y + 0.045, HEAD.z - 0.01);
  shell.add(K.dot, shade(CAP, 0.8), 0, HEAD.y + 0.25, HEAD.z - 0.01, null, [0.024, 0.012, 0.024]);
  shell.add(brimGeo, CAP, 0, HEAD.y + 0.095, HEAD.z + 0.18, [-0.4, 0, 0], [1, 1, 0.8]);
  // the gold chain, in little links, down to the pendant on the T-shirt
  for (const s of [-1, 1]) for (let i = 0; i < 11; i++) {
    const t = i / 11, y = 0.895 - t * 0.13;
    chain.add(K.dot, 0, s * 0.06 * (1 - t), y, bodyR(y) + 0.012, null, 0.0062);
  }
  chain.add(K.ball, 0, 0, 0.765, bodyR(0.765) + 0.014, null, [0.02, 0.022, 0.012]);

  const meshes: Object3D[] = [shell.mesh(), trim.mesh(false), jewel(chain, gold)];
  p.body.add(...meshes);
  // sleeves with darker cuffs, hands, and a gold watch with a face on one wrist, the leather bracelet on the other
  p.arms.forEach((a, i) => {
    const arm = new Build(), band = new Build(), out = side[i];
    arm.add(K.ball, JACKET, 0, -0.005, 0, null, [0.07, 0.066, 0.07]);
    arm.add(tube(0.066, 0.058, 0.3, 8, true), JACKET, 0, -0.14, 0);
    arm.add(tube(0.063, 0.063, 0.03, 8), shade(JACKET, 0.82), 0, -0.275, 0);
    arm.add(K.ball, SKIN, 0, -0.315, 0.004, null, [0.05, 0.056, 0.05]);
    band.add(K.ring, 0, 0, -0.293, 0.004, [X, 0, 0], [0.05, 0.05, 0.22]);
    if (!i) {
      band.add(tube(0.022, 0.022, 0.012, 10), 0, out * 0.054, -0.293, 0.004, [0, 0, X]);
      arm.add(tube(0.016, 0.016, 0.004, 10), 0xF4F1EA, out * 0.061, -0.293, 0.004, [0, 0, X]);
    }
    const ms = [arm.mesh(), jewel(band, i ? leather : gold)];
    a.add(...ms);
    meshes.push(...ms);
  });
  for (const m of meshes) m.visible = false;
  return meshes;
}
/** Gold or leather pieces in one mesh, in their own shiny material. */
function jewel(b: Build, material: MeshPhongMaterial) {
  return baked(b.pieces, true, material);
}
