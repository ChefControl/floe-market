// The singer's look (Ofer Levy), worn over a Person: a navy baseball cap over short grey hair, a short grey beard,
// an olive field jacket open over a white T-shirt, a gold chain, and a gold watch and a black leather bracelet.
// Swapped in while the player stands in the rain outside her house.
import { BoxGeometry, Mesh, MeshPhongMaterial, SphereGeometry, TorusGeometry, type Object3D } from 'three';
import type { Person } from './characters';
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
  const add = <T extends Object3D>(o: T, parent: Object3D = p) => { o.visible = false; parent.add(o); look.push(o); return o; };
  /** A flat piece on the jacket's front, `x` across from the middle, tilted to lie on it. */
  const onFront = (w: number, h: number, c: number, x: number, y: number, out = 0.004) => {
    const r = bodyR(y), z = Math.sqrt(r * r - x * x) + out;
    const m = add(mesh(new BoxGeometry(w, h, 0.02), c, x, y, z));
    m.rotation.set(-LEAN, Math.asin(x / r), 0, 'YXZ');
    return m;
  };

  // (the hood and the rest of the season's clothes come off with p.disguised)
  for (const c of p.children) {
    if (c instanceof Mesh && [G.body, G.head].includes(c.geometry)) own.push(c);
  }
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
  const armX = p.arms.map(a => a.position.x);
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

  /** Wears the singer's look (true) or the player's own clothes (false). */
  return (on: boolean) => {
    for (const o of own) o.visible = !on;
    for (const o of look) o.visible = on;
    p.disguised = on;
    p.wear();
    p.arms.forEach((a, i) => { a.position.x = armX[i] * (on ? BUILD : 1); });
  };
}
