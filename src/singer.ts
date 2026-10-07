// The singer's look, worn over a Person: short black hair, stubble and a moustache, sad eyebrows, a black shirt open
// at the collar and a gold chain. Swapped in while the player stands in the rain outside her house.
import { BoxGeometry, Mesh, MeshPhongMaterial, SphereGeometry, type Object3D } from 'three';
import type { Person } from './characters';
import { G, mat, mesh } from './render';

const SKIN = 0xF3C9A4, HAIR = 0x15110F, STUBBLE = 0x3A302A, SHIRT = 0x18181D;
const gold = new MeshPhongMaterial({ color: 0xD9A933, specular: 0xFFF0B0, shininess: 80, emissive: 0x1A1200 });

// Head is a 0.2 sphere at (0, 1.03, 0.05); +z is the face. Sphere angles: phi PI/2 points at +z, theta 0 is straight up.
const hairGeo = new SphereGeometry(0.216, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.44);
/** Round the back and sides, leaving the face open. */
const backHairGeo = new SphereGeometry(0.214, 14, 10, Math.PI / 2 + 1.1, Math.PI * 2 - 2.2, Math.PI * 0.4, Math.PI * 0.22);
const beardGeo = new SphereGeometry(0.208, 14, 8, Math.PI / 2 - 1.25, 2.5, Math.PI * 0.53, Math.PI * 0.3);
const browGeo = new BoxGeometry(0.075, 0.022, 0.02);
const linkGeo = new BoxGeometry(0.018, 0.15, 0.018);

/** Builds the singer's look onto `p`, hidden; returns a switch between it and their own clothes. */
export function singerLook(p: Person) {
  const own: Object3D[] = [];
  const look: Object3D[] = [];
  const add = (o: Object3D, parent: Object3D = p) => { o.visible = false; parent.add(o); look.push(o); return o; };

  for (const c of p.children) {
    if (c instanceof Mesh && (c.geometry === G.body || c.geometry === G.hood || c.geometry === G.hoodBack)) own.push(c);
  }
  add(mesh(G.body, SHIRT, 0, 0.6, 0, true));
  // Sleeves, with a hand at the end of each.
  for (const a of p.arms) {
    own.push(a.children[0]);
    add(mesh(G.arm, SHIRT, 0, -0.15, 0, true), a);
    add(mesh(new BoxGeometry(0.09, 0.07, 0.1), SKIN, 0, -0.33, 0), a);
  }
  // Open collar: a V of skin at the throat (the shirt's front is ~0.23 out from the middle there), and a gold chain
  // hanging down it to a pendant.
  const v = add(mesh(new BoxGeometry(0.12, 0.12, 0.02), SKIN, 0, 0.84, 0.228));
  v.rotation.z = Math.PI / 4;
  for (const s of [-1, 1]) {
    const l = add(new Mesh(linkGeo, gold));
    l.position.set(s * 0.05, 0.84, 0.236); l.rotation.z = -s * 0.7;
  }
  add(new Mesh(new SphereGeometry(0.026, 8, 6), gold)).position.set(0, 0.785, 0.24);
  // Hair, stubble, moustache, and eyebrows raised at the middle.
  add(mesh(hairGeo, HAIR, 0, 1.04, -0.01));
  add(mesh(backHairGeo, HAIR, 0, 1.03, -0.005));
  add(mesh(beardGeo, STUBBLE, 0, 1.03, 0.05));
  add(mesh(new BoxGeometry(0.12, 0.03, 0.03), HAIR, 0, 0.99, 0.245));
  for (const s of [-1, 1]) {
    const b = add(new Mesh(browGeo, mat(HAIR)));
    b.position.set(s * 0.075, 1.115, 0.232); b.rotation.z = s * -0.35;
  }

  /** Wears the singer's look (true) or the player's own clothes (false). */
  return (on: boolean) => {
    for (const o of own) o.visible = !on;
    for (const o of look) o.visible = on;
  };
}
