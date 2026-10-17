// The Family's three in the Undertow (stage 3), built like Mr. Fugu (fugu.ts): his legs, a coat over the body, lapels and
// a collar, arms, and a sea creature for a head, from the same plain shapes in flat colours. Slick Eddie, a moray eel in
// a purple suit and a small pork-pie hat, fixes fights; Hammerhead Harry, a hammerhead in pinstripes and a fedora, lends
// chips; Three-Card Tommy, a catfish in tweed and a flat cap with the queen tucked in its band, runs the monte. As on
// their rap sheets (the Undertow Files). Each stands at his booth, breathes, turns his head to whoever's in front of
// him, and bobs his head to his words as he talks (chatter.ts).
import { CylinderGeometry, DoubleSide, Group, type Material, Matrix4, type Mesh, MeshBasicMaterial, MeshLambertMaterial, type Object3D, PlaneGeometry, RepeatWrapping, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { apart, dice } from './kit';
import { canvasTex, copyGeo, G, mesh, paint, painted } from './render';
import type { XZ } from './util';

export type Host = 'eddie' | 'harry' | 'tommy';

const GOLD = 0xF2C14E, SHADES = 0x15181D, TROUSERS = 0x24242C, SHOES = 0x15151A;
/** The top half of a ball, for eyelids. */
const lidGeo = new SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2);
const chainGeo = new TorusGeometry(0.11, 0.012, 4, 12, Math.PI);
const frownGeo = new TorusGeometry(0.07, 0.013, 5, 12, Math.PI);
const browGeo = new TorusGeometry(0.034, 0.0065, 5, 12, Math.PI * 0.7);
const brimGeo = new CylinderGeometry(0.37, 0.37, 0.025, 16);
const crownGeo = new CylinderGeometry(0.2, 0.23, 0.2, 14);
const bandGeo = new CylinderGeometry(0.233, 0.233, 0.05, 14);

/** Adds `m` to `parent` and hands back `m`. */
const put = <T extends Object3D>(parent: Object3D, m: T) => { parent.add(m); return m; };
/** A cloth: a canvas drawing repeated over the coat. */
function cloth(draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, rx: number, ry: number) {
  const t = canvasTex(64, 64, draw).tex;
  t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(rx, ry);
  return new MeshLambertMaterial({ map: t });
}
const PINSTRIPE = cloth((c, w, h) => { c.fillStyle = '#2C3446'; c.fillRect(0, 0, w, h); c.fillStyle = '#5E6880'; for (let x = 4; x < w; x += 16) c.fillRect(x, 0, 2, h); }, 5, 2);
const TWEED = cloth((c, w, h) => {
  c.fillStyle = '#6B5236'; c.fillRect(0, 0, w, h); c.fillStyle = '#7F6545';
  for (let i = 0; i < w; i += 16) { c.fillRect(i, 0, 3, h); c.fillRect(0, i, w, 3); }
  c.fillStyle = '#5A4430'; for (let i = 8; i < w; i += 16) { c.fillRect(i, 0, 1, h); c.fillRect(0, i, w, 1); }
}, 4, 2);
/** The queen of hearts, on Tommy's cap and among his three cards. */
export const QUEEN = canvasTex(64, 90, (c, w) => {
  c.fillStyle = '#F5F0E2'; c.fillRect(0, 0, w, 90);
  c.fillStyle = '#B23A2E'; c.font = 'bold 40px Georgia, serif'; c.textAlign = 'center'; c.fillText('Q', w / 2, 60);
  c.font = '18px serif'; c.fillText('♥', 12, 20);
}).tex;

interface Dress { coat: number | MeshLambertMaterial; lapel: number; shirt: number; hand: number }

/** One of the Family: his body and arms, and his head (`head`, built by each), which turns to look and bobs as he talks. */
export class Hood extends Group {
  readonly head = new Group();
  readonly arms: Group[] = [];
  readonly body = new Group();
  readonly legs: Group[] = [];
  talking = false;
  /** The spot he's looking at, if anyone's in front of him. */
  watch: XZ | null = null;
  private t = 0;
  private turn = 0;
  /** How much he's talking (easing in and out), and his head's lift on each syllable: the lift it's going to, and
   *  where it is (following, so it never jumps), and how many syllables so far. */
  private talk = 0;
  private lift = 0;
  private bob = 0;
  private said = 0;
  constructor(d: Dress) {
    super();
    for (const s of [-1, 1]) {
      const l = put(this, new Group()); l.position.set(s * 0.1, 0.3, 0);
      this.legs.push(l);
      l.add(mesh(G.leg, TROUSERS, 0, -0.15, 0, true));
      put(l, mesh(G.box, SHOES, 0, -0.28, 0.04, true)).scale.set(0.13, 0.06, 0.22);
    }
    this.add(this.body);
    const coat = put(this.body, mesh(G.body, d.coat, 0, 0.6, 0, true)); coat.scale.set(1.12, 1, 1.05);
    put(this.body, mesh(G.sphere, d.coat, 0, 0.895, 0, true)).scale.set(0.252, 0.085, 0.235);
    put(this.body, mesh(G.sphere, d.shirt, 0, 0.77, 0.205)).scale.set(0.07, 0.15, 0.035);
    for (const s of [-1, 1]) {
      const lapel = put(this.body, mesh(G.sphere, d.lapel, s * 0.085, 0.76, 0.232)); lapel.scale.set(0.045, 0.15, 0.014); lapel.rotation.set(-0.3, 0, -s * 0.38);
      const collar = put(this.body, mesh(G.sphere, d.lapel, s * 0.165, 0.95, 0)); collar.scale.set(0.04, 0.09, 0.115); collar.rotation.z = s * 0.25;
      // arms hanging, a little forward, the hands at the coat's hem
      const a = put(this.body, new Group()); a.position.set(s * 0.29, 0.86, 0.02); a.rotation.set(-0.12, 0, s * 0.1);
      put(a, mesh(G.sphere, d.coat, 0, 0, 0, true)).scale.setScalar(0.075);
      put(a, mesh(G.cyl, d.coat, 0, -0.16, 0, true)).scale.set(0.06, 0.32, 0.06);
      put(a, mesh(G.sphere, d.coat, 0, -0.32, 0)).scale.set(0.066, 0.03, 0.066);
      put(a, mesh(G.sphere, d.hand, 0, -0.36, 0.01, true)).scale.setScalar(0.05);
      this.arms.push(a);
    }
    this.head.position.set(0, 0.92, 0);
    this.body.add(this.head);
  }
  /** Sits him down on a seat `h` up (where he's put is where his seat is): his thighs out in front of him, a shin
   *  hanging from each knee, his shoes at their feet. */
  sit(h: number) {
    for (const l of this.legs) {
      l.rotation.x = -Math.PI / 2; l.position.y = h; l.position.z = 0.02;
      const shin = put(l, mesh(G.leg, TROUSERS, 0, -0.28, -0.15, true)); shin.rotation.x = Math.PI / 2;
      const shoe = l.children[1]; shoe.position.set(0, -0.33, -0.31); shoe.rotation.x = Math.PI / 2;
    }
    this.body.position.y = h - 0.3;
    return this;
  }
  /** A syllable said (chatter.ts): his chin comes up a little, by a bit more or less each time, and settles. */
  syllable() { this.lift = [0.8, 1, 0.6, 0.9][this.said++ % 4]; }
  update(dt: number) {
    this.t += dt;
    // breathing, and a slow shift of weight
    this.body.scale.y = 1 + Math.sin(this.t * 1.7) * 0.012;
    this.body.rotation.z = Math.sin(this.t * 0.55) * 0.02;
    // his head turned to whoever's in front of him (as far as it goes), or back to the room
    let want = 0;
    if (this.watch) {
      const p = this.getWorldPosition(tmp);
      want = Math.atan2(this.watch.x - p.x, this.watch.z - p.z) - this.rotation.y;
      want = Math.max(-0.9, Math.min(0.9, Math.atan2(Math.sin(want), Math.cos(want))));
    }
    this.turn += (want - this.turn) * Math.min(1, dt * 5);
    // talking: his chin lifting on each syllable, and a slow tilt of the head from side to side
    this.talk += ((this.talking ? 1 : 0) - this.talk) * Math.min(1, dt * 4);
    this.lift *= Math.exp(-dt * 9);
    this.bob += (this.lift - this.bob) * Math.min(1, dt * 16);
    this.head.rotation.y = this.turn;
    this.head.rotation.x = -this.bob * 0.1 + this.talk * Math.sin(this.t * 2.3) * 0.025;
    this.head.rotation.z = this.talk * Math.sin(this.t * 1.6) * 0.05;
  }
}
const tmp = new Vector3();

/** Slick Eddie: a moray eel, the fixer. Head cocked, chin up, a closed smirk with a sliver of gold tooth, awake eyes
 *  under lifted lids with one brow cocked, a small black pork-pie with a purple band; a purple suit, a gold chain, a red
 *  carnation. */
function eddie() {
  const g = new Hood({ coat: 0x5E3A7E, lapel: 0x3C2456, shirt: 0x1A1A20, hand: 0x6E7B2C });
  const EEL = 0x6E7B2C, THROAT = 0x8E9940, SPOT = 0xD8CF6A, HAT = 0x18161C, BROW = 0x3B4614;
  const chain = put(g.body, mesh(chainGeo, GOLD, 0, 0.78, 0.24)); chain.rotation.set(-0.3, 0, Math.PI); chain.scale.set(0.9, 1.1, 1);
  put(g.body, mesh(G.sphere, 0xC8323A, -0.11, 0.835, 0.255)).scale.setScalar(0.026);
  const h = put(g.head, new Group()); h.rotation.z = -0.07;
  put(h, mesh(G.cyl, EEL, 0, 0.17, 0, true)).scale.set(0.14, 0.36, 0.13);
  put(h, mesh(G.cyl, THROAT, 0, 0.15, 0.045)).scale.set(0.1, 0.3, 0.1);
  put(h, mesh(G.sphere, EEL, 0, 0.39, 0.08, true)).scale.set(0.15, 0.135, 0.3);
  const jaw = put(h, mesh(G.sphere, THROAT, 0, 0.315, 0.1)); jaw.scale.set(0.12, 0.046, 0.255); jaw.rotation.x = 0.04;
  for (const [a, y] of [[0.4, 0.05], [-0.6, 0.12], [1.2, 0.2], [-1.3, 0.02], [2.2, 0.1], [-2.1, 0.18]]) {
    const sp = put(h, mesh(G.sphere, SPOT, Math.sin(a) * 0.14, y, Math.cos(a) * 0.13)); sp.scale.set(0.02, 0.02, 0.006);
    // (facing straight out from his head: lookAt would take its aim in the world's coordinates, not his head's)
    sp.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(Math.sin(a) * 0.14, 0, Math.cos(a) * 0.13).normalize());
  }
  const smirk = put(h, mesh(G.sphere, 0x2A1414, 0, 0.337, 0.112)); smirk.scale.set(0.127, 0.009, 0.26); smirk.rotation.z = -0.1;
  put(h, mesh(G.sphere, new MeshLambertMaterial({ color: 0xE0AA30, emissive: 0x5A3A00 }), 0.045, 0.3305, 0.341)).scale.set(0.008, 0.0034, 0.004);
  const glint = new MeshBasicMaterial({ color: 0xFFFFFF });
  for (const s of [-1, 1]) {
    const x = s * 0.075;
    put(h, mesh(G.sphere, 0xF0DC6A, x, 0.455, 0.29)).scale.setScalar(0.033);
    put(h, mesh(G.sphere, 0x111111, x + 0.005, 0.452, 0.319)).scale.set(0.012, 0.015, 0.006);
    put(h, mesh(G.sphere, glint, x + 0.01, 0.449, 0.323)).scale.setScalar(0.004);
    const lid = put(h, mesh(lidGeo, EEL, x, 0.455, 0.29)); lid.scale.setScalar(0.041); lid.rotation.x = s < 0 ? -0.42 : -0.32;
    const brow = put(h, mesh(browGeo, BROW, x, s < 0 ? 0.478 : 0.47, 0.305)); brow.rotation.set(-0.35, 0, Math.PI * 0.15 + (s < 0 ? 0 : -0.22));
  }
  const hat = put(h, new Group()); hat.position.set(0, 0.513, 0.06); hat.rotation.set(-0.08, 0, 0.1);
  hat.add(mesh(new CylinderGeometry(0.155, 0.155, 0.012, 24), HAT, 0, 0, 0, true));
  const rim = put(hat, mesh(new TorusGeometry(0.152, 0.009, 6, 24), HAT, 0, 0.006, 0)); rim.rotation.x = Math.PI / 2;
  hat.add(mesh(new CylinderGeometry(0.096, 0.104, 0.085, 20), HAT, 0, 0.048, 0, true));
  hat.add(mesh(new CylinderGeometry(0.106, 0.106, 0.024, 20), 0x7A4AA0, 0, 0.02, 0));
  const pinch = put(hat, mesh(new TorusGeometry(0.068, 0.011, 6, 20), 0x2A2730, 0, 0.09, 0)); pinch.rotation.x = Math.PI / 2;
  return g;
}

/** Hammerhead Harry: a hammerhead in pinstripes, the loan shark (Samehada's uncle). Dark glasses at the hammer's tips
 *  (faintly rimmed, so they stand off the dark rooms he's in), a mild frown, a fedora worn at an angle like Mr. Fugu's, a red tie with a gold clip. */
function harry() {
  const g = new Hood({ coat: PINSTRIPE, lapel: 0x1F2533, shirt: 0xEDE7D6, hand: 0x8A97A2 });
  const SKIN = 0x8A97A2, BELLY = 0xD5DBDF, DARK = 0x5A6670;
  put(g.body, mesh(G.sphere, 0x9B2F2A, 0, 0.73, 0.238)).scale.set(0.03, 0.12, 0.01);
  put(g.body, mesh(G.box, GOLD, 0, 0.74, 0.245)).scale.set(0.06, 0.012, 0.01);
  const h = g.head;
  put(h, mesh(G.sphere, SKIN, 0, 0.17, 0, true)).scale.set(0.17, 0.27, 0.16);
  put(h, mesh(G.sphere, 0x939FA9, 0, 0.06, 0.06)).scale.set(0.13, 0.14, 0.1);
  put(h, mesh(G.sphere, SKIN, 0, 0.37, 0.02, true)).scale.set(0.4, 0.075, 0.15);
  put(h, mesh(G.sphere, BELLY, 0, 0.335, 0.05)).scale.set(0.34, 0.04, 0.12);
  for (const s of [-1, 1]) {
    const lens = put(h, mesh(G.box, SHADES, s * 0.355, 0.375, 0.1)); lens.scale.set(0.1, 0.07, 0.03); lens.rotation.y = s * 0.45;
    // (its frame, just proud of the lens all round, a shade lighter than it; on dice of its own, so the game's luck,
    // which three.js names what it makes from, is where it was)
    apart(() => {
      const rim = put(h, mesh(G.box, 0x4A535C, s * 0.355, 0.375, 0.096)); rim.scale.set(0.112, 0.082, 0.026); rim.rotation.y = s * 0.45;
    }, dice(0x4A55 + s));
    const brow = put(h, mesh(G.box, DARK, s * 0.33, 0.43, 0.1)); brow.scale.set(0.12, 0.026, 0.05); brow.rotation.z = s * 0.12;
    for (const y of [0.06, 0.12, 0.18]) { const gill = put(h, mesh(G.box, DARK, s * 0.158, y, 0.02)); gill.scale.set(0.012, 0.05, 0.05); gill.rotation.y = s * 0.3; }
  }
  put(h, mesh(G.box, SHADES, 0, 0.39, 0.165)).scale.set(0.58, 0.012, 0.012);
  const frown = put(h, mesh(frownGeo, 0x24282E, 0, 0.215, 0.168)); frown.scale.set(0.85, 0.32, 1); frown.rotation.x = -0.3;
  const hat = put(h, new Group()); hat.position.set(0.01, 0.45, -0.01); hat.rotation.set(-0.06, 0, 0.12); hat.scale.setScalar(0.62);
  hat.add(mesh(brimGeo, 0x2E2B33, 0, 0, 0, true), mesh(crownGeo, 0x2E2B33, 0, 0.11, 0, true), mesh(bandGeo, 0x6B6F76, 0, 0.04, 0));
  return g;
}

/** A whisker's tube through `pts`, tapering to its tip. */
function whisker(parent: Object3D, m: MeshLambertMaterial, pts: Vector3[], r: number) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], w = r * (1 - 0.65 * i / (pts.length - 1));
    const seg = put(parent, mesh(G.cyl, m, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2));
    seg.scale.set(w, a.distanceTo(b), w);
    seg.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
  }
}
const UP = new Vector3(0, 1, 0);
/** A catfish whisker's points: out from the corner of the mouth, a springy wave down, a flick up at the tip. */
const curl = (s: number, x0: number, y0: number, z0: number, len: number, drop: number, waves: number) =>
  Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return new Vector3(s * (x0 + len * t), y0 - drop * (1.4 * t - t * t) + 0.014 * Math.sin(t * Math.PI * waves) * t, z0 + 0.03 * Math.sin(t * Math.PI) - 0.04 * t);
  });

/** Three-Card Tommy: a catfish in tweed, the hustler. A broad flat head, a wide mouth, faint springy whiskers, small
 *  mean eyes under heavy lids, two plasters, and a flat cap pulled low with the queen of hearts in its band. */
function tommy() {
  const g = new Hood({ coat: TWEED, lapel: 0x57422B, shirt: 0xA8402F, hand: 0x6F6A52 });
  const SKIN = 0x6F6A52, BELLY = 0xC9BE98, LIP = 0x57523F, LID = 0x5C5744;
  const WHISKER = new MeshLambertMaterial({ color: 0xB3AC90, transparent: true, opacity: 0.75 });
  const scarf = put(g.body, mesh(new TorusGeometry(0.13, 0.04, 6, 14), 0xA8402F, 0, 0.9, 0.02)); scarf.rotation.x = Math.PI / 2;
  const h = g.head;
  put(h, mesh(G.cyl, SKIN, 0, 0.05, 0.02, true)).scale.set(0.15, 0.22, 0.14);
  put(h, mesh(G.sphere, SKIN, 0, 0.26, 0.03, true)).scale.set(0.27, 0.2, 0.25);
  put(h, mesh(G.sphere, BELLY, 0, 0.17, 0.07)).scale.set(0.21, 0.11, 0.2);
  put(h, mesh(G.sphere, 0x2A1E18, 0, 0.215, 0.235)).scale.set(0.16, 0.02, 0.05);
  put(h, mesh(G.sphere, LIP, 0, 0.233, 0.24)).scale.set(0.175, 0.026, 0.05);
  for (const s of [-1, 1]) {
    put(h, mesh(G.sphere, 0xD9C35A, s * 0.15, 0.35, 0.2)).scale.setScalar(0.04);
    put(h, mesh(G.sphere, 0x111111, s * 0.153, 0.348, 0.236)).scale.set(0.016, 0.022, 0.008);
    const lid = put(h, mesh(lidGeo, LID, s * 0.15, 0.35, 0.2)); lid.scale.setScalar(0.046); lid.rotation.set(0.35, 0, s * 0.55);
    whisker(h, WHISKER, curl(s, 0.15, 0.23, 0.245, 0.2, 0.17, 3), 0.008);
    whisker(h, WHISKER, curl(s, 0.05, 0.17, 0.235, 0.07, 0.1, 2), 0.006);
    const fin = put(h, mesh(G.cone, 0x5C5744, s * 0.29, 0.22, 0)); fin.scale.set(0.05, 0.12, 0.02); fin.rotation.z = -s * 1.25;
  }
  for (const r of [0.6, -0.4]) { const plaster = put(h, mesh(G.box, 0xE9D3A8, -0.15, 0.39, 0.19)); plaster.scale.set(0.08, 0.022, 0.01); plaster.rotation.set(-0.5, -0.6, r); }
  const cap = put(h, mesh(G.sphere, 0x4D533E, 0, 0.44, 0, true)); cap.scale.set(0.28, 0.1, 0.27); cap.rotation.x = -0.1;
  const peak = put(h, mesh(G.sphere, 0x3E4232, 0, 0.41, 0.2)); peak.scale.set(0.21, 0.02, 0.12); peak.rotation.x = 0.18;
  const band = put(h, mesh(new TorusGeometry(1, 0.06, 6, 24), 0x2E3226, 0, 0.47, 0)); band.rotation.x = Math.PI / 2; band.scale.set(0.272, 0.262, 0.2);
  const card = put(h, mesh(new PlaneGeometry(0.1, 0.14), new MeshLambertMaterial({ map: QUEEN, side: DoubleSide }), 0.15, 0.53, 0.19));
  card.rotation.set(-0.15, 0.45, -0.16);
  return g;
}

/** The Family, each built once. */
export const family: Record<Host, Hood> = { eddie: eddie(), harry: harry(), tommy: tommy() };

// ---------- merging a figure's still parts ----------
const plain = (m: Material | Material[]): m is MeshLambertMaterial => !Array.isArray(m) && m instanceof MeshLambertMaterial
  && !m.map && !m.transparent && !m.vertexColors && m.emissive.getHex() === 0;
/** Merges the plain meshes under `root` (but not into `keep`) into one, in `root`'s own space, its colours painted on. */
export function flatten(root: Object3D, keep: Set<Object3D> = new Set()) {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert(), m4 = new Matrix4();
  /** `m`'s geometry in `root`'s space, keeping only `attrs`. */
  const placed = (m: Mesh, attrs: string[]) => {
    const g = m.geometry.index ? m.geometry.toNonIndexed() : copyGeo(m.geometry);
    for (const k of Object.keys(g.attributes)) if (!attrs.includes(k)) g.deleteAttribute(k);
    m4.multiplyMatrices(toRoot, m.matrixWorld);
    g.applyMatrix4(m4);
    if (m4.determinant() < 0) {
      for (const a of [g.attributes.position, g.attributes.normal]) {
        for (let i = 0; i < a.count; i += 3) for (let j = 0; j < 3; j++) { const t = a.array[(i + 1) * 3 + j]; a.array[(i + 1) * 3 + j] = a.array[(i + 2) * 3 + j]; a.array[(i + 2) * 3 + j] = t; }
      }
    }
    return g;
  };
  // (the plain ones painted into one; the others, glowing or see-through, merged with any that share their material)
  const flat: Mesh[] = [], alike = new Map<Material, Mesh[]>();
  const walk = (o: Object3D) => {
    for (const c of o.children) {
      if (keep.has(c)) continue;
      const m = c as Mesh;
      if (!m.isMesh || c.children.length) { walk(c); continue; }
      if (plain(m.material)) flat.push(m);
      else if (!Array.isArray(m.material) && !(m.material as MeshLambertMaterial).vertexColors) (alike.get(m.material) ?? alike.set(m.material, []).get(m.material)!).push(m);
    }
  };
  walk(root);
  if (flat.length) {
    const geos = flat.map(m => paint(placed(m, ['position', 'normal']), (m.material as MeshLambertMaterial).color.getHex()));
    for (const m of flat) m.removeFromParent();
    put(root, mesh(mergeGeometries(geos)!, painted, 0, 0, 0, true));
    geos.forEach(g => g.dispose());
  }
  for (const [mat, ms] of alike) {
    if (ms.length < 2) continue;
    const uv = ms.every(m => m.geometry.attributes.uv), geos = ms.map(m => placed(m, uv ? ['position', 'normal', 'uv'] : ['position', 'normal']));
    const merged = mergeGeometries(geos);
    geos.forEach(g => g.dispose());
    if (!merged) continue;
    const o = mesh(merged, mat, 0, 0, 0, ms[0].castShadow);
    o.renderOrder = ms[0].renderOrder;
    for (const m of ms) m.removeFromParent();
    put(root, o);
  }
}
/** Merges each moving part of a figure on its own (so it's drawn in a few meshes, not dozens): its head, each arm, its
 *  body round them, and its legs (each on its own if it walks); never into anything in `keep` (what moves on its own:
 *  a horn, a bass). */
export function settle(g: Hood, walks = false, keep: Object3D[] = []) {
  const k = new Set(keep);
  flatten(g.head, k);
  for (const a of g.arms) flatten(a, k);
  flatten(g.body, new Set([g.head, ...g.arms, ...keep]));
  if (walks) for (const l of g.legs) flatten(l, k);
  else flatten(g, new Set([g.body, ...keep]));
}
