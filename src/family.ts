// The Family's three in the Undertow (stage 3), built like Mr. Fugu (fugu.ts): his legs, a coat over the body, lapels and
// a collar, arms, and a sea creature for a head, from the same plain shapes in flat colours. Slick Eddie, a moray eel in
// a purple suit and a small pork-pie hat, fixes fights; Hammerhead Harry, a hammerhead in pinstripes and a fedora, lends
// chips; Three-Card Tommy, a catfish in tweed and a flat cap with the queen tucked in its band, runs the monte. As on
// their rap sheets (the Undertow Files). Each stands at his booth, breathes, turns his head to whoever's in front of
// him, and bobs his head to his words as he talks (chatter.ts).
import { BufferGeometry, CylinderGeometry, DoubleSide, Group, type Material, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, type Object3D, PlaneGeometry, RepeatWrapping, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { apart, compact, detail, dice, quietly } from './kit';
import { castsWhenSeen } from './levelCull';
import { canvasTex, copyGeo, G, mesh, paint, painted } from './render';
import type { XZ } from './util';

export type Host = 'eddie' | 'harry' | 'tommy';

const GOLD = 0xF2C14E, SHADES = 0x15181D, TROUSERS = 0x24242C, SHOES = 0x15151A;
/** High's finer things' colours: a trouser's crease (a shade lighter) and cuff, a shoe's sole, a pocket square. */
const CREASE = 0x34343F, CUFF = 0x2C2C36, SOLE = 0x0A0A0C, POCKET = 0xF2EEE2;
/** The coat's front, `y` up: how far out of his middle (it's a cone, 0.3 round at the hem to 0.22 at the top, made a
 *  little deeper). */
const coatAt = (y: number) => (0.3 - (y - 0.3) / 0.6 * 0.08) * 1.05;
/** The dice High's finer pieces and each version's shapes are made on (flatten, below): their own, off the game's luck. */
const shapeDice = dice(0x5AD0F), fineDice = dice(0xF1AE);
/** High's finer pieces' materials, their own (render.ts' shared ones are made when they always were). */
const fineMats = new Map<number, MeshLambertMaterial>();
const [cuffGeo, hemGeo, trouserGeo, cuffRingGeo] = apart(() => [
  new TorusGeometry(0.058, 0.011, 5, 12), new TorusGeometry(0.3, 0.012, 4, 24),
  // (a trouser leg, round, as wide as Low's block at the hip and narrowing a little to the cuff, and the cuff's turn-up)
  new CylinderGeometry(0.072, 0.064, 0.3, 10), new TorusGeometry(0.064, 0.012, 4, 14),
], dice(0xC0FF));
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
    // (a few thousand triangles of shadow each: cast only while he could be seen, levelCull.ts)
    castsWhenSeen(this);
    for (const s of [-1, 1]) {
      const l = put(this, new Group()); l.position.set(s * 0.1, 0.3, 0);
      this.legs.push(l);
      const leg = put(l, mesh(G.leg, TROUSERS, 0, -0.15, 0, true));
      const shoe = put(l, mesh(G.box, SHOES, 0, -0.28, 0.04, true)); shoe.scale.set(0.13, 0.06, 0.22);
      // (Low's block of a trouser leg and shoe: High's are round, dressLeg)
      leg.userData.lowOnly = shoe.userData.lowOnly = true;
      this.dressLeg(l, leg, shoe, true);
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
      // High's: the shirt's cuff showing at the sleeve's end, and a thumb
      const af = fine(a);
      finePiece(af, cuffGeo, d.shirt, 0, -0.335, 0).rotation.x = Math.PI / 2;
      finePiece(af, G.sphere, d.hand, -s * 0.026, -0.352, 0.04).scale.set(0.02, 0.026, 0.02);
    }
    this.head.position.set(0, 0.92, 0);
    this.body.add(this.head);
    // High's: the coat's buttons, its front edge and hem, flaps over its pockets and a square in the breast pocket
    const bf = fine(this.body), trim = d.lapel;
    for (const y of [0.52, 0.62]) finePiece(bf, G.sphere, trim, 0, y, coatAt(y) + 0.004).scale.set(0.017, 0.017, 0.008);
    finePiece(bf, G.box, trim, 0, 0.47, coatAt(0.47) - 0.002).scale.set(0.007, 0.34, 0.006);
    const hem = finePiece(bf, hemGeo, trim, 0, 0.315, 0, true); hem.rotation.x = Math.PI / 2; hem.scale.set(1.12, 1.05, 1);
    for (const s of [-1, 1]) {
      const flap = finePiece(bf, G.box, trim, s * 0.17, 0.5, coatAt(0.5) * 0.84); flap.scale.set(0.1, 0.022, 0.012); flap.rotation.y = s * 0.6;
    }
    const sq = finePiece(bf, G.box, POCKET, 0.17, 0.81, coatAt(0.81) * 0.79); sq.scale.set(0.045, 0.022, 0.01); sq.rotation.set(-0.1, 0.62, 0.1);
  }
  /** High's leg (`l`, in place of Low's trouser `leg` and `shoe`, blocks): a trouser leg tapering to its cuff, with a
   *  crease down the front (`standing`), and a rounded shoe on a sole; each placed on Low's as they are, so they move
   *  with them when he sits. */
  private dressLeg(l: Group, leg: Mesh, shoe: Mesh, standing: boolean) {
    l.children.filter(c => c.userData.fine).forEach(c => c.removeFromParent());
    const lf = fine(l);
    leg.updateMatrix(); shoe.updateMatrix();
    const on = (o: Object3D, at: Object3D) => { o.updateMatrix(); o.applyMatrix4(at.matrix); };
    // (in the trouser's own size: a box 0.13 by 0.3 by 0.15)
    if (standing) { const crease = finePiece(lf, G.box, CREASE, 0, 0.02, 0.068); crease.scale.set(0.006, 0.22, 0.004); on(crease, leg); }
    on(finePiece(lf, trouserGeo, TROUSERS, 0, 0, 0, true), leg);
    const cuff = finePiece(lf, cuffRingGeo, CUFF, 0, -0.128, 0); cuff.rotation.x = Math.PI / 2; on(cuff, leg);
    // (in the shoe's: a box a unit each way)
    const toe = finePiece(lf, G.sphere, SHOES, 0, 0.05, 0.04, true); toe.scale.set(0.5, 0.62, 0.52); on(toe, shoe);
    const sole = finePiece(lf, G.box, SOLE, 0, -0.42, 0.02, true); sole.scale.set(1.0, 0.24, 1.04); on(sole, shoe);
  }
  /** Sits him down on a seat `h` up (where he's put is where his seat is): his thighs out in front of him, a shin
   *  hanging from each knee, his shoes at their feet. */
  sit(h: number) {
    for (const l of this.legs) {
      l.rotation.x = -Math.PI / 2; l.position.y = h; l.position.z = 0.02;
      const shin = put(l, mesh(G.leg, TROUSERS, 0, -0.28, -0.15, true)); shin.rotation.x = Math.PI / 2;
      shin.userData.lowOnly = true;
      const shoe = l.children[1] as Mesh; shoe.position.set(0, -0.33, -0.31); shoe.rotation.x = Math.PI / 2;
      this.dressLeg(l, shin, shoe, false);
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

/** Mama Moray, who runs the chanko restaurant out front (resto.ts): a round, motherly moray, Eddie's kind but softer,
 *  in a flowered headscarf knotted on top, a string of pearls, and a white apron over a purple dress; a wide smile,
 *  rosy cheeks and big lashed eyes. Built when it's wanted (made on the dice it's made on there, never at load). */
export function mama() {
  const EEL = 0x7E9A3A, THROAT = 0xB4C46A, SPOT = 0xDCD47A, CHEEK = 0xE88A8A, APRON = 0xF6F2EA;
  const g = new Hood({ coat: 0x7A3E8E, lapel: 0x5A2A6E, shirt: APRON, hand: EEL });
  // (a little rounder than the men: the coat's her dress, let out)
  g.body.children[0].scale.set(1.3, 1, 1.22);
  // the apron, its bib and its strings
  const apron = put(g.body, mesh(G.sphere, APRON, 0, 0.5, 0.215)); apron.scale.set(0.24, 0.3, 0.06);
  put(g.body, mesh(G.sphere, APRON, 0, 0.78, 0.235)).scale.set(0.13, 0.12, 0.03);
  for (const s of [-1, 1]) { const strap = put(g.body, mesh(G.box, APRON, s * 0.1, 0.87, 0.2)); strap.scale.set(0.03, 0.12, 0.1); strap.rotation.x = -0.5; }
  put(g.body, mesh(G.box, APRON, 0, 0.62, 0)).scale.set(0.6, 0.03, 0.5);
  // the pearls, round her neck
  const PEARL = new MeshLambertMaterial({ color: 0xF6EEE2, emissive: 0x2A2620 });
  for (let i = 0; i < 11; i++) {
    const a = -1.2 + (2.4 * i) / 10;
    put(g.body, mesh(G.sphere, PEARL, Math.sin(a) * 0.15, 0.9 - Math.cos(a) * 0.035, Math.cos(a) * 0.15 + 0.03)).scale.setScalar(0.022);
  }
  const h = put(g.head, new Group());
  put(h, mesh(G.cyl, EEL, 0, 0.15, 0, true)).scale.set(0.17, 0.32, 0.16);
  put(h, mesh(G.cyl, THROAT, 0, 0.13, 0.05)).scale.set(0.13, 0.27, 0.12);
  put(h, mesh(G.sphere, EEL, 0, 0.37, 0.07, true)).scale.set(0.19, 0.16, 0.28);
  const jaw = put(h, mesh(G.sphere, THROAT, 0, 0.3, 0.1)); jaw.scale.set(0.15, 0.06, 0.24);
  for (const [a, y] of [[0.5, 0.06], [-0.7, 0.13], [1.3, 0.21], [-1.4, 0.03]]) {
    const sp = put(h, mesh(G.sphere, SPOT, Math.sin(a) * 0.17, y, Math.cos(a) * 0.16)); sp.scale.set(0.022, 0.022, 0.006);
    sp.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(Math.sin(a), 0, Math.cos(a)).normalize());
  }
  // a wide smile (a frown's arc the other way up), and rosy cheeks
  const smile = put(h, mesh(frownGeo, 0x3A1A1A, 0, 0.33, 0.33)); smile.scale.set(1.15, 0.55, 1); smile.rotation.set(-0.25, 0, Math.PI);
  for (const s of [-1, 1]) put(h, mesh(G.sphere, CHEEK, s * 0.12, 0.35, 0.27)).scale.set(0.04, 0.025, 0.02);
  const glint = new MeshBasicMaterial({ color: 0xFFFFFF });
  for (const s of [-1, 1]) {
    const x = s * 0.085;
    put(h, mesh(G.sphere, 0xF4E27A, x, 0.44, 0.28)).scale.setScalar(0.04);
    put(h, mesh(G.sphere, 0x111111, x, 0.44, 0.316)).scale.set(0.016, 0.02, 0.006);
    put(h, mesh(G.sphere, glint, x + 0.008, 0.447, 0.321)).scale.setScalar(0.005);
    const lid = put(h, mesh(lidGeo, EEL, x, 0.44, 0.28)); lid.scale.setScalar(0.046); lid.rotation.x = -0.75;
    // (three lashes off each lid's edge)
    for (const k of [-1, 0, 1]) { const lash = put(h, mesh(G.box, 0x1A1A1A, x + s * 0.02 + k * 0.014, 0.478, 0.3)); lash.scale.set(0.004, 0.022, 0.004); lash.rotation.z = -s * 0.4 - k * 0.3; }
  }
  // the headscarf: a flowered cloth over the top of her head and down to her neck behind, knotted on top
  const FLOWERS = cloth((c, w, hh) => {
    c.fillStyle = '#D85A8A'; c.fillRect(0, 0, w, hh);
    for (const [fx, fy, col] of [[14, 14, '#F6E27A'], [46, 22, '#FFFFFF'], [26, 46, '#F6E27A'], [54, 54, '#FFFFFF'], [6, 38, '#FFFFFF']] as const) {
      c.fillStyle = col;
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; c.beginPath(); c.arc(fx + Math.cos(a) * 4, fy + Math.sin(a) * 4, 3, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#E8902A'; c.beginPath(); c.arc(fx, fy, 2, 0, Math.PI * 2); c.fill();
    }
  }, 3, 2);
  const scarf = put(h, mesh(lidGeo, FLOWERS, 0, 0.42, 0.02, true)); scarf.scale.set(0.205, 0.17, 0.27); scarf.rotation.x = -0.3;
  put(h, mesh(G.sphere, FLOWERS, 0, 0.3, -0.12)).scale.set(0.17, 0.16, 0.12);
  for (const s of [-1, 1]) { const knot = put(h, mesh(G.sphere, FLOWERS, s * 0.06, 0.6, -0.02)); knot.scale.set(0.08, 0.05, 0.05); knot.rotation.z = s * 0.6; }
  put(h, mesh(G.sphere, FLOWERS, 0, 0.6, -0.02)).scale.setScalar(0.04);
  return g;
}

/** The Family, each built once. */
export const family: Record<Host, Hood> = { eddie: eddie(), harry: harry(), tommy: tommy() };

// ---------- merging a figure's still parts ----------
// A figure is drawn as a few merged meshes (flatten), one for each part that moves, in two versions (graphics.ts):
// High, as it was built, with each round piece given as many sides as its size wants (a glint a few millimetres
// across was a ball of 252 triangles), and the finer pieces only High has (`fine`: the cuffs, the buttons, the shoes'
// soles...); and Low, the same pieces as it was built, a notch plainer. Its shadow is cast by a plainer copy still of
// the pieces made to cast one (fewer sides, as kit.ts' baked meshes cast theirs), after its own triangles in the same
// mesh; on Low only by the bigger of them, not the eyes, buttons, whiskers and chains. (Made on dice of their own, off
// the game's luck and the scenery's; Low's merged mesh is made just as the one mesh was, so the luck's drawn as it was.)
type Detail = 'high' | 'low' | 'shadow';
/** Sides round and rings down a ball, by its size across (metres), for each version: above 25 cm, 10 cm, 4 cm, under. */
const BALL: Record<Detail, [number, number][]> = {
  // (above 25 cm: on High as built, on Low half the sides, but no fewer than 10 by 7)
  high: [[Infinity, Infinity], [12, 8], [9, 6], [6, 4]],
  low: [[10, 7], [9, 6], [7, 5], [5, 3]],
  shadow: [[6, 4], [6, 4], [5, 3], [4, 3]],
};
const tier = (d: number) => (d >= 0.25 ? 0 : d >= 0.1 ? 1 : d >= 0.04 ? 2 : 3);
const shapes = new WeakMap<BufferGeometry, Map<string, BufferGeometry>>();
/** `geo` in `detail`, `across` metres at its widest where it's put: a round one with the sides its size wants, any other
 *  itself. */
function shapeFor(geo: BufferGeometry, detail: Detail, across: number) {
  if (!(geo instanceof SphereGeometry || geo instanceof TorusGeometry || geo instanceof CylinderGeometry)) return geo;
  const t = tier(across), key = `${detail}${t}`;
  let all = shapes.get(geo);
  if (!all) shapes.set(geo, all = new Map());
  let p = all.get(key);
  if (p) return p;
  p = quietly(() => {
    if (geo instanceof SphereGeometry) {
      const a = geo.parameters;
      let [w, h] = BALL[detail][t];
      if (detail === 'low' && t === 0) { w = Math.max(w, Math.round(a.widthSegments / 2)); h = Math.max(h, Math.round(a.heightSegments / 2)); }
      return w >= a.widthSegments && h >= a.heightSegments ? geo : new SphereGeometry(a.radius, Math.min(w, a.widthSegments), Math.min(h, a.heightSegments), a.phiStart, a.phiLength, a.thetaStart, a.thetaLength);
    }
    if (geo instanceof TorusGeometry) {
      const a = geo.parameters, most = { high: [6, 16], low: [4, 10], shadow: [3, 8] }[detail];
      return a.radialSegments <= most[0] && a.tubularSegments <= most[1] ? geo : new TorusGeometry(a.radius, a.tube, Math.min(a.radialSegments, most[0]), Math.min(a.tubularSegments, most[1]), a.arc);
    }
    const a = (geo as CylinderGeometry).parameters, most = { high: 12, low: 8, shadow: 6 }[detail];
    return a.radialSegments <= most ? geo : new CylinderGeometry(a.radiusTop, a.radiusBottom, a.height, most, 1, a.openEnded, a.thetaStart, a.thetaLength);
  }, shapeDice);
  all.set(key, p);
  return p;
}
/** Under this (in metres, its biggest side), or this thin in two directions (a whisker, a chain), a piece casts no
 *  shadow on Low. */
const SMALL = 0.12, ROD = 0.03;
const size = new Vector3();
const big = (g: BufferGeometry) => {
  g.computeBoundingBox();
  const d = g.boundingBox!.getSize(size).toArray().sort((a, b) => a - b);
  return d[2] >= SMALL && d[1] >= ROD;
};
/** Gives `o`, a figure's merged pieces, `shadow` (the plainer copies of those that cast), after its own triangles, drawn
 *  only in the shadow pass. */
function castAs(o: Mesh, shadow: BufferGeometry[]) {
  // (its drawing's its own: never merged with others, batch.ts)
  o.userData.noBatch = true;
  if (!shadow.length) { o.castShadow = false; return; }
  const own = o.geometry.index!.count;
  for (const g of shadow) paint(g, 0);
  const all = mergeGeometries([o.geometry, ...shadow])!;
  shadow.forEach(g => g.dispose());
  o.geometry.dispose();
  o.geometry = all;
  all.setDrawRange(0, own);
  o.onBeforeShadow = () => all.setDrawRange(own, Infinity);
  o.onAfterShadow = () => all.setDrawRange(0, own);
}
/** The finer pieces only High draws: a group of them, under `parent` (merged with it by flatten, into High's mesh). */
export function fine(parent: Object3D) {
  const g = quietly(() => new Group(), fineDice);
  g.userData.fine = true;
  parent.add(g);
  return g;
}
/** Adds a piece to High's finer ones: `geo` in colour `c` at (x, y, z), off the game's luck (made on dice of their own,
 *  in materials of their own, so render.ts' shared ones are made when they always were). */
export function finePiece(to: Object3D, geo: BufferGeometry, c: number, x: number, y: number, z: number, cast = false) {
  return quietly(() => {
    let m = fineMats.get(c);
    if (!m) fineMats.set(c, m = new MeshLambertMaterial({ color: c }));
    const o = new Mesh(geo, m);
    o.position.set(x, y, z); o.castShadow = cast;
    to.add(o);
    return o;
  }, fineDice);
}
const plain = (m: Material | Material[]): m is MeshLambertMaterial => !Array.isArray(m) && m instanceof MeshLambertMaterial
  && !m.map && !m.transparent && !m.vertexColors && m.emissive.getHex() === 0;
/** Merges the plain meshes under `root` (but not into `keep`) into one for each version (High and Low), in `root`'s own
 *  space, its colours painted on; the others (glowing, see-through, drawn on), each material's lot into one. */
export function flatten(root: Object3D, keep: Set<Object3D> = new Set()) {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert(), m4 = new Matrix4();
  /** `m`'s geometry (or its shape in `detail`) in `root`'s space, keeping only `attrs`. */
  const placed = (m: Mesh, attrs: string[], detail?: Detail) => {
    m4.multiplyMatrices(toRoot, m.matrixWorld);
    let geo = m.geometry;
    if (detail) {
      if (!geo.boundingSphere) geo.computeBoundingSphere();
      geo = shapeFor(geo, detail, 2 * geo.boundingSphere!.radius * m4.getMaxScaleOnAxis());
    }
    // (each corner kept once, by index: one new geometry, as a copy without one took; one that had none gets one)
    const g = geo.index ? new BufferGeometry().copy(geo) : copyGeo(geo);
    if (!g.index) g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i));
    for (const k of Object.keys(g.attributes)) if (!attrs.includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(m4);
    if (m4.determinant() < 0) {
      const ix = g.index!.array;
      for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
    }
    return g;
  };
  // (the plain ones painted into one; the others, glowing or see-through, merged with any that share their material;
  // the finer ones High's alone)
  const flat: Mesh[] = [], finer: Mesh[] = [], alike = new Map<Material, Mesh[]>();
  const walk = (o: Object3D, isFine: boolean) => {
    for (const c of o.children) {
      if (keep.has(c)) continue;
      const m = c as Mesh, f = isFine || !!c.userData.fine;
      if (!m.isMesh || c.children.length) { walk(c, f); continue; }
      if (f) { if (plain(m.material)) finer.push(m); }
      else if (plain(m.material)) flat.push(m);
      else if (!Array.isArray(m.material) && !(m.material as MeshLambertMaterial).vertexColors) (alike.get(m.material) ?? alike.set(m.material, []).get(m.material)!).push(m);
    }
  };
  walk(root, false);
  if (flat.length) {
    const colour = (m: Mesh) => (m.material as MeshLambertMaterial).color.getHex();
    // Low's: made just as the one mesh was, on the game's luck
    const geos = flat.map(m => paint(placed(m, ['position', 'normal'], 'low'), colour(m)));
    const low = put(root, mesh(mergeGeometries(geos)!, painted, 0, 0, 0, true));
    geos.forEach(g => g.dispose());
    quietly(() => {
      castAs(low, flat.filter(m => m.castShadow).map(m => placed(m, ['position', 'normal'], 'shadow')).filter(big));
      // High's, and its finer pieces
      const all = [...flat.filter(m => !m.userData.lowOnly), ...finer], hg = all.map(m => paint(placed(m, ['position', 'normal'], 'high'), colour(m)));
      const high = put(root, mesh(mergeGeometries(hg)!, painted, 0, 0, 0, true));
      hg.forEach(g => g.dispose());
      castAs(high, all.filter(m => m.castShadow).map(m => placed(m, ['position', 'normal'], 'shadow')));
      // (both with their normals and colours in bytes, as the kit's are; and High's let go of on Potato, kit.ts)
      low.userData.baked = high.userData.baked = true;
      detail(low, high);
      compact(low.geometry);
      compact(high.geometry);
    }, shapeDice);
    for (const m of [...flat, ...finer]) m.removeFromParent();
  } else for (const m of finer) m.removeFromParent();
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
