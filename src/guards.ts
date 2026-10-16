// Slick Eddie's two bodyguards in the Undertow (stage 3), standing either side of him in his private room: built like the
// Family (family.ts), and nobody asks their names. Two sharks, big in the shoulder, in black suits and narrow black ties,
// wraparound sunglasses, a dorsal fin standing up off the back of the head, gill slits down the neck, a wide flat mouth
// with a row of teeth showing; their hands clasped in front of them. One has an earpiece, its wire curling down into his collar; the other
// a scar across his snout.
import { CatmullRomCurve3, Group, MeshBasicMaterial, MeshLambertMaterial, TorusGeometry, TubeGeometry, Vector3 } from 'three';
import { Hood } from './family';
import { bake, G, mesh, type Part } from './render';

const SUIT = 0x24272D, LAPEL = 0x16181C, SHIRT = 0xF2F0EA, TIE = 0x111214, SHADES = 0x0F1114;
const put = <T extends Group | ReturnType<typeof mesh>>(parent: Group, m: T) => { parent.add(m); return m; };
/** Their sunglasses: a band of black glass wrapped round the front of the head, at the eyes. */
const wrapGeo = new TorusGeometry(0.205, 0.034, 6, 24, Math.PI * 0.62);
const GLASS = new MeshLambertMaterial({ color: SHADES, emissive: 0x0A0C10 });
const GLINT = new MeshBasicMaterial({ color: 0xBFD3E0 });

/** One of them: `n` 0 (the earpiece) or 1 (the scar). */
export function brute(n: 0 | 1) {
  const SKIN = [0x7D90A2, 0x8797A6][n], BELLY = 0xE4E9EC, DARK = 0x46535F;
  const g = new Hood({ coat: SUIT, lapel: LAPEL, shirt: SHIRT, hand: SKIN });
  // big in the shoulder: the body broadened (the head kept its own size), the feet set wider
  g.body.scale.set(1.16, 1.03, 1.1);
  g.head.scale.set(1 / 1.16, 1 / 1.03, 1 / 1.1);
  for (const [i, l] of g.legs.entries()) l.position.x = (i ? 1 : -1) * 0.12;
  // the narrow black tie, its knot up at the collar
  put(g.body, mesh(G.sphere, TIE, 0, 0.74, 0.236)).scale.set(0.026, 0.13, 0.01);
  put(g.body, mesh(G.sphere, TIE, 0, 0.865, 0.222)).scale.set(0.03, 0.025, 0.02);
  // hands clasped in front of him, as a doorman stands
  for (const [i, a] of g.arms.entries()) {
    const s = i ? 1 : -1;
    a.rotation.set(-0.9, 0, -s * 0.62);
  }

  const h = g.head;
  // the head: long, the snout forward over a wide flat mouth, pale underneath
  put(h, mesh(G.sphere, SKIN, 0, 0.2, -0.02, true)).scale.set(0.19, 0.21, 0.21);
  put(h, mesh(G.sphere, SKIN, 0, 0.245, 0.15, true)).scale.set(0.125, 0.1, 0.19);
  put(h, mesh(G.sphere, BELLY, 0, 0.125, 0.1)).scale.set(0.135, 0.06, 0.15);
  // the mouth: a wide dark line under the snout, its corners turned down a touch, a row of small teeth along its top
  const mouth = put(h, mesh(new TorusGeometry(0.15, 0.012, 5, 18, Math.PI * 0.7), 0x1A1418, 0, 0.165, 0.11));
  mouth.rotation.set(Math.PI / 2 - 0.25, 0, Math.PI * 0.15);
  mouth.scale.set(1, 0.95, 1);
  const teeth: Part[] = [];
  for (let k = 0; k < 9; k++) {
    const a = -0.95 + 1.9 * k / 8, x = Math.sin(a) * 0.148, z = 0.11 + Math.cos(a) * 0.142;
    teeth.push({ geo: G.cone, at: [x, 0.16, z], rot: [Math.PI, 0, 0], scale: [0.011, 0.026, 0.011] });
  }
  put(h, mesh(bake(teeth), 0xF4F1E6));
  // two nostrils on top of the snout
  for (const s of [-1, 1]) put(h, mesh(G.sphere, DARK, s * 0.04, 0.28, 0.32)).scale.set(0.013, 0.008, 0.012);
  // the sunglasses, wrapped round from cheek to cheek, a glint along each side
  const wrap = put(h, mesh(wrapGeo, GLASS, 0, 0.285, 0.02));
  wrap.rotation.set(Math.PI / 2, 0, Math.PI * 0.19);
  wrap.scale.set(1, 1.07, 1.5);
  for (const s of [-1, 1]) {
    const glint = put(h, mesh(G.box, GLINT, s * 0.1, 0.3, 0.205));
    glint.scale.set(0.05, 0.007, 0.004); glint.rotation.set(0, s * 0.5, s * 0.2);
  }
  // gill slits down each side of the neck
  for (const s of [-1, 1]) for (const z of [-0.07, -0.02, 0.03]) {
    const gill = put(h, mesh(G.box, DARK, s * 0.19, 0.1, z)); gill.scale.set(0.01, 0.075, 0.016); gill.rotation.z = s * 0.15;
  }
  // the dorsal fin, up off the back of the head and swept back
  const fin = put(h, mesh(G.cone, SKIN, 0, 0.44, -0.1, true)); fin.scale.set(0.022, 0.2, 0.14); fin.rotation.x = -0.55;
  if (n === 1) {
    // a scar across the snout
    const scar = put(h, mesh(G.box, 0xE8D8D2, 0.035, 0.335, 0.2)); scar.scale.set(0.014, 0.13, 0.01); scar.rotation.set(-0.95, 0, 0.75);
  } else {
    // the earpiece, its wire curling down behind his jaw into his collar
    put(h, mesh(G.sphere, 0x1B1D21, 0.198, 0.24, 0.02)).scale.set(0.022, 0.03, 0.022);
    const wire = new CatmullRomCurve3([new Vector3(0.205, 0.22, 0.01), new Vector3(0.22, 0.13, -0.03), new Vector3(0.2, 0.05, -0.06), new Vector3(0.17, -0.02, -0.08)]);
    put(h, mesh(new TubeGeometry(wire, 12, 0.005, 5, false), 0xD8DCE0, 0, 0, 0));
  }
  return g;
}

/** Eddie's two, one each side of him. */
export const guards = [brute(0), brute(1)];
