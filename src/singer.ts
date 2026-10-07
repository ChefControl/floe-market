// The singer's look, worn over a Person: big curly black hair, thick sad eyebrows, a heavier build in a black
// short-sleeved shirt with studs along its open collar, two silver chains and a silver bracelet.
// Swapped in while the player stands in the rain outside her house.
import { BoxGeometry, Mesh, MeshPhongMaterial, SphereGeometry, type Object3D } from 'three';
import type { Person } from './characters';
import { G, mat, mesh } from './render';

const SKIN = 0xE0A97F, HAIR = 0x141110, SHIRT = 0x18181D;
const silver = new MeshPhongMaterial({ color: 0xC9CED4, specular: 0xFFFFFF, shininess: 90, emissive: 0x111214 });

/** Heavier build: the shirt is this much wider than the parka, and the arms sit this much further out. */
const BUILD = 1.15;
/** Head is a 0.2 sphere here; +z is the face. */
const HEAD = { y: 1.03, z: 0.05 };
const ball = new SphereGeometry(1, 8, 6);
const browGeo = new BoxGeometry(0.085, 0.028, 0.02);
const linkGeo = new BoxGeometry(0.014, 1, 0.014);

/**
 * Curls: balls over the top, sides and back of the head, leaving the face clear.
 * Rows go down from the top of the head (theta, as a fraction of PI); phi goes round it, PI/2 being the face.
 */
function curls() {
  const out: [x: number, y: number, z: number, r: number][] = [];
  const rows: [theta: number, n: number][] = [[0, 1], [0.2, 7], [0.38, 11], [0.55, 11], [0.7, 9]];
  rows.forEach(([t, n], row) => {
    for (let i = 0; i < n; i++) {
      const phi = (i + (row % 2) * 0.5) / n * Math.PI * 2;
      const fromFace = Math.abs(Math.atan2(Math.sin(phi - Math.PI / 2), Math.cos(phi - Math.PI / 2)));
      // Below the hairline the face stays open; the lowest row only covers the back of the neck.
      if (t >= 0.38 && fromFace < (t >= 0.7 ? 1.9 : 1.1)) continue;
      const th = t * Math.PI, r = 0.205;
      out.push([
        -r * Math.cos(phi) * Math.sin(th),
        HEAD.y + r * Math.cos(th) + (t === 0 ? 0.02 : 0),
        HEAD.z + r * Math.sin(phi) * Math.sin(th) - 0.02,
        0.075 + ((i * 7 + row * 3) % 4) * 0.008,
      ]);
    }
  });
  return out;
}

/** Builds the singer's look onto `p`, hidden; returns a switch between it and their own clothes. */
export function singerLook(p: Person) {
  const own: Object3D[] = [];
  const look: Object3D[] = [];
  const add = (o: Object3D, parent: Object3D = p) => { o.visible = false; parent.add(o); look.push(o); return o; };
  const silverBall = (x: number, y: number, z: number, r: number) => {
    const b = add(new Mesh(ball, silver)); b.position.set(x, y, z); b.scale.setScalar(r);
  };

  for (const c of p.children) {
    if (c instanceof Mesh && [G.body, G.hood, G.hoodBack, G.head].includes(c.geometry)) own.push(c);
  }
  add(mesh(G.head, SKIN, 0, HEAD.y, HEAD.z));
  add(mesh(G.body, SHIRT, 0, 0.6, 0, true)).scale.set(BUILD, 1, BUILD);
  // Short black sleeves, bare forearms, and a silver bracelet on each wrist.
  const armX = p.arms.map(a => a.position.x);
  for (const a of p.arms) {
    own.push(a.children[0]);
    add(mesh(new BoxGeometry(0.13, 0.15, 0.15), SHIRT, 0, -0.05, 0, true), a);
    add(mesh(new BoxGeometry(0.095, 0.25, 0.105), SKIN, 0, -0.22, 0, true), a);
    add(new Mesh(new BoxGeometry(0.11, 0.025, 0.12), silver), a).position.y = -0.28;
  }

  // Open collar: a V of skin at the throat with studs down both edges (the shirt's front is ~0.26 out from the
  // middle there), and two silver chains, the longer one with a pendant.
  const v = add(mesh(new BoxGeometry(0.13, 0.13, 0.02), SKIN, 0, 0.845, 0.258));
  v.rotation.z = Math.PI / 4;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) silverBall(s * (0.135 - i * 0.03), 0.9 - i * 0.03, 0.258 + i * 0.004, 0.012);
    for (const drop of [0.06, 0.11]) {
      const l = add(new Mesh(linkGeo, silver));
      l.scale.y = Math.hypot(0.09, drop);
      l.position.set(s * 0.045, 0.88 - drop / 2, 0.268);
      l.rotation.z = -s * Math.atan2(0.09, drop);
    }
  }
  silverBall(0, 0.765, 0.272, 0.022);

  // Big curly black hair, and thick eyebrows raised at the middle.
  for (const [x, y, z, r] of curls()) add(mesh(ball, HAIR, x, y, z)).scale.setScalar(r);
  for (const s of [-1, 1]) {
    const b = add(new Mesh(browGeo, mat(HAIR)));
    b.position.set(s * 0.075, 1.115, 0.232); b.rotation.z = s * -0.35;
  }

  /** Wears the singer's look (true) or the player's own clothes (false). */
  return (on: boolean) => {
    for (const o of own) o.visible = !on;
    for (const o of look) o.visible = on;
    p.arms.forEach((a, i) => { a.position.x = armX[i] * (on ? BUILD : 1); });
  };
}
