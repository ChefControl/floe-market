// Mr. Fugu, the shady pufferfish who runs a sumo ring under the dock, and the hatch in the dock he climbs out of.
// He's built like everyone else (the same legs, body and arms) with a pufferfish for a head: spines that stand up
// when he puffs, a pout, shades, a toothpick and a fedora, over a trench coat with a gold chain.
import {
  BoxGeometry, ConeGeometry, CylinderGeometry, Group, type Mesh, MeshLambertMaterial, type Object3D, PointLight, Quaternion,
  SphereGeometry, TorusGeometry, Vector3,
} from 'three';
import { G, mesh } from './render';

const COAT = 0xC49A5A, COAT_DARK = 0x9C7840, TROUSERS = 0x2C3A47;
const FISH = 0xEBD38E, BELLY = 0xFFF6E0, SPOT = 0x8A6A3A, SPINE = 0xF6E7B4, FIN = 0xD9B866, LIPS = 0xF08A7E;
const HAT = 0x2E2B33, BAND = 0xA8322D, GOLD = 0xF2C14E, SHADES = 0x15181D;

const HEAD_R = 0.3;
/** How much bigger his head gets when he puffs up. */
const PUFF = 0.38;
const bellyGeo = new SphereGeometry(HEAD_R * 1.01, 14, 8, 0, Math.PI * 2, Math.PI * 0.56, Math.PI * 0.44);
const spineGeo = new ConeGeometry(0.028, 0.1, 4);
const skirtGeo = new CylinderGeometry(0.3, 0.37, 0.28, 10);
const beltGeo = new CylinderGeometry(0.285, 0.285, 0.05, 10);
const chainGeo = new TorusGeometry(0.11, 0.012, 4, 12, Math.PI);
const lipsGeo = new TorusGeometry(0.04, 0.022, 6, 12);
const pickGeo = new CylinderGeometry(0.008, 0.008, 0.22, 4);
const lensGeo = new BoxGeometry(0.13, 0.075, 0.03);
const brimGeo = new CylinderGeometry(0.37, 0.37, 0.025, 16);
const crownGeo = new CylinderGeometry(0.2, 0.23, 0.2, 14);
const bandGeo = new CylinderGeometry(0.233, 0.233, 0.05, 14);

const UP = new Vector3(0, 1, 0);
/** Adds `m` to `parent` and hands back `m` (Object3D.add returns the parent). */
const put = <T extends Object3D>(parent: Object3D, m: T) => { parent.add(m); return m; };

export class Fugu extends Group {
  readonly legs: Group[] = [];
  readonly arms: Group[] = [];
  /** The pufferfish: everything in it grows when he puffs up. */
  readonly head = new Group();
  readonly hat = new Group();
  private readonly spines: Mesh[] = [];
  private readonly fins: Mesh[] = [];
  /** His pout, the dark of his open mouth inside it, and the toothpick in the corner. */
  private readonly lips: Mesh;
  private readonly gape: Mesh;
  private readonly pick: Mesh;
  private readonly lens = new MeshLambertMaterial({ color: SHADES, emissive: 0xFFFFFF, emissiveIntensity: 0 });
  /** 0 to 1: how puffed up he is, and how puffed up he's getting. */
  puff = 0;
  puffTo = 0;
  talking = false;
  private t = 0;
  private shakeT = 0;
  private glintT = 0;
  /** How far his hand is out of his pocket. */
  private armT = 0;
  /** How much he's saying right now (it dies away in pauses), where his mouth is in its open-and-shut, how open it
   *  is, and how far his head's nodding (once a word). */
  private voice = 0;
  private jaw = 0;
  private open = 0;
  private nod = 0;

  constructor() {
    super();
    for (const s of [-1, 1]) {
      const l = new Group(); l.position.set(s * 0.1, 0.3, 0);
      l.add(mesh(G.leg, TROUSERS, 0, -0.15, 0, true)); this.add(l); this.legs.push(l);
      // hands in his coat pockets
      const a = new Group(); a.position.set(s * 0.3, 0.82, 0.02); a.rotation.set(0.25, 0, s * 0.12);
      a.add(mesh(G.arm, COAT, 0, -0.15, 0, true)); this.add(a); this.arms.push(a);
    }
    // the trench coat: down to the knees, belted, collar up, lapels and a gold chain
    this.add(mesh(G.body, COAT, 0, 0.6, 0, true));
    this.add(mesh(skirtGeo, COAT, 0, 0.32, 0, true));
    this.add(mesh(beltGeo, 0x5B4636, 0, 0.5, 0));
    put(this, mesh(G.box, GOLD, 0, 0.5, 0.285)).scale.set(0.07, 0.06, 0.02);
    for (const s of [-1, 1]) {
      const lapel = mesh(G.box, COAT_DARK, s * 0.07, 0.76, 0.235); lapel.scale.set(0.06, 0.24, 0.02); lapel.rotation.set(-0.3, 0, -s * 0.35);
      const collar = mesh(G.box, COAT, s * 0.17, 0.97, -0.02, true); collar.scale.set(0.05, 0.2, 0.22); collar.rotation.z = s * 0.25;
      this.add(lapel, collar);
    }
    const chain = mesh(chainGeo, GOLD, 0, 0.74, 0.255); chain.rotation.set(-0.3, 0, Math.PI); this.add(chain);

    // the pufferfish
    this.head.position.set(0, 1.13, 0);
    this.add(this.head);
    const ball = mesh(G.sphere, FISH, 0, 0, 0, true); ball.scale.setScalar(HEAD_R); this.head.add(ball);
    this.head.add(mesh(bellyGeo, BELLY));
    const onHead = (lat: number, lon: number, r = HEAD_R) =>
      new Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)).multiplyScalar(r);
    for (const [lat, lon] of [[0.5, 1.4], [0.3, 2.2], [0.6, 2.8], [0.2, -1.5], [0.55, -2.3], [0.15, 3.1], [0.4, -0.9], [0.45, 0.95]]) {
      const p = onHead(lat, lon);
      const spot = mesh(G.sphere, SPOT, p.x, p.y, p.z); spot.scale.set(0.035, 0.035, 0.012); spot.lookAt(p.clone().multiplyScalar(2));
      this.head.add(spot);
    }
    // spines all over, except his face and under the hat
    for (let i = 0; i < 26; i++) {
      const lat = -0.75 + (i % 6) * 0.25, lon = (i * 2.399) % (Math.PI * 2) - Math.PI;
      if (Math.abs(lon) < 0.75 && lat > -0.45) continue;
      const n = onHead(lat, lon, 1);
      const sp = mesh(spineGeo, SPINE, n.x * HEAD_R, n.y * HEAD_R, n.z * HEAD_R);
      sp.quaternion.copy(new Quaternion().setFromUnitVectors(UP, n));
      sp.userData.n = n;
      this.head.add(sp); this.spines.push(sp);
    }
    for (const s of [-1, 1]) {
      const fin = mesh(G.cone, FIN, s * (HEAD_R + 0.03), -0.06, 0.02); fin.scale.set(0.06, 0.12, 0.02); fin.rotation.z = -s * Math.PI / 2;
      this.head.add(fin); this.fins.push(fin);
      const lens = mesh(lensGeo, this.lens, s * 0.09, 0.05, HEAD_R - 0.02); lens.rotation.y = s * 0.28;
      this.head.add(lens);
      put(this.head, mesh(G.box, SHADES, s * 0.22, 0.06, 0.16)).scale.set(0.012, 0.012, 0.18);
    }
    put(this.head, mesh(G.box, SHADES, 0, 0.07, HEAD_R + 0.005)).scale.set(0.06, 0.014, 0.014);
    this.lips = mesh(lipsGeo, LIPS, 0, -0.1, HEAD_R - 0.01); this.head.add(this.lips);
    this.gape = mesh(G.sphere, 0x3A1518, 0, -0.1, HEAD_R - 0.02); this.gape.scale.set(0.035, 0.02, 0.01); this.head.add(this.gape);
    this.pick = mesh(pickGeo, 0xE3C26B, 0.1, -0.12, HEAD_R + 0.01); this.pick.rotation.set(0.3, 0, 1.25); this.head.add(this.pick);

    // the fedora, worn at an angle; it rides up when he puffs
    this.hat.add(mesh(brimGeo, HAT, 0, 0, 0, true), mesh(crownGeo, HAT, 0, 0.11, 0, true), mesh(bandGeo, BAND, 0, 0.04, 0));
    this.hat.rotation.set(-0.06, 0, 0.14);
    this.add(this.hat);
    this.update(0);
  }

  /** Shakes him for a moment (he's furious). */
  shake(s = 0.45) { this.shakeT = s; }
  /** The light catches his shades. */
  glint() { this.glintT = 0.35; }
  /** A letter said: keeps his mouth going. */
  syllable() { this.voice = 0.16; }
  /** A word said: his head bobs with it. */
  word() { this.nod = Math.min(1, this.nod + 0.5); }

  update(dt: number) {
    this.t += dt;
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.glintT = Math.max(0, this.glintT - dt);
    this.puff += (this.puffTo - this.puff) * Math.min(1, dt * 12);
    const k = this.puff, s = 1 + PUFF * k;
    this.head.scale.setScalar(s);
    for (const sp of this.spines) {
      sp.scale.set(1, 1 + 1.4 * k, 1);
      const n = sp.userData.n as Vector3;
      sp.position.copy(n).multiplyScalar(HEAD_R + 0.035 * (1 + 1.4 * k));
    }
    // talking: the mouth flaps with each syllable, the head nods along and tilts as he makes his point
    // the mouth opens and shuts about four or five times a second while he's talking, and eases shut in a pause
    this.voice = Math.max(0, this.voice - dt);
    if (this.voice > 0) this.jaw += dt * 4.5 * Math.PI * 2;
    else this.jaw = 0;
    const want = this.voice > 0 ? 0.5 - 0.5 * Math.cos(this.jaw) : 0;
    this.open += (want - this.open) * Math.min(1, dt * 16);
    this.nod = Math.max(0, this.nod - dt * 3);
    const o = this.open;
    this.lips.scale.set(1 + 0.15 * o, 1 + 0.75 * o, 1);
    this.gape.scale.set(0.035 * (0.3 + 0.9 * o), 0.02 + 0.045 * o, 0.012);
    this.gape.visible = o > 0.05;
    this.pick.position.y = -0.12 - 0.03 * o;
    this.pick.rotation.z = 1.25 + Math.sin(this.t * 3) * 0.12 - 0.15 * o;
    const tilt = this.talking ? Math.sin(this.t * 2.6) * 0.09 : 0;
    this.head.rotation.set(this.nod * 0.12 - 0.04 * k, Math.sin(this.t * 1.3) * 0.08, tilt);
    const jitter = this.shakeT > 0 ? Math.sin(this.t * 90) * 0.035 : 0;
    this.head.position.set(jitter, 1.13 + Math.sin(this.t * 2.4) * 0.012 + 0.1 * k - this.nod * 0.02, 0);
    // the hat stays on through all of it
    const top = HEAD_R * s * 0.82;
    this.hat.position.set(jitter - 0.02 - tilt * top, this.head.position.y + top, -0.02 + this.nod * 0.12 * top);
    this.hat.rotation.set(-0.06 + this.nod * 0.12, this.head.rotation.y, 0.14 + tilt);
    for (const [i, f] of this.fins.entries()) f.rotation.y = Math.sin(this.t * (this.talking ? 16 : 9) + i * Math.PI) * 0.5;
    // a hand comes out of his pocket to talk with; puffed up, he throws both out
    const [left, right] = this.arms;
    const talkArm = this.talking ? 1 : 0;
    this.armT += (talkArm - this.armT) * Math.min(1, dt * 8);
    right.rotation.set(0.25 - this.armT * (1.25 + Math.sin(this.t * 5) * 0.25), 0, 0.12 + 0.75 * k);
    left.rotation.set(0.25 - 0.6 * k, 0, -0.12 - 0.75 * k);
    this.lens.emissiveIntensity = this.glintT > 0 ? Math.sin(this.glintT / 0.35 * Math.PI) * 0.8 : 0;
  }
}

/** A trapdoor in the dock planks, with a ladder going down to a glow, a roar and a lot of steam. */
export class Hatch extends Group {
  /** Swings up on its south edge, away from whoever's in front of it. */
  readonly lid = new Group();
  readonly light = new PointLight(0xFF5A2A, 0, 7, 1.6);
  private readonly pit = new MeshLambertMaterial({ color: 0x1A0A08, emissive: 0xFF4A1C, emissiveIntensity: 0 });
  private readonly puffMat = new MeshLambertMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0, depthWrite: false });
  private readonly steam: { m: Mesh; t: number }[] = [];
  /** 0 shut to 1 wide open, and where it's going (fast). */
  open = 0;
  openTo = 0;
  /** A knock from underneath: the lid jumps. */
  private bumpT = 0;

  constructor() {
    super();
    const W = 1.15;
    this.add(mesh(new BoxGeometry(W, 0.012, W), this.pit, 0, 0.004, 0));
    for (const [x, z, sx, sz] of [[0, -W / 2, W + 0.16, 0.08], [0, W / 2, W + 0.16, 0.08], [-W / 2, 0, 0.08, W], [W / 2, 0, 0.08, W]])
      put(this, mesh(G.box, 0x4A3220, x, 0.02, z)).scale.set(sx, 0.05, sz);
    // the top of a ladder, sticking up out of the hole
    for (const s of [-1, 1]) put(this, mesh(G.box, 0x6E4B2E, s * 0.3, -0.05, -W / 2 + 0.12)).scale.set(0.045, 0.4, 0.045);
    put(this, mesh(G.box, 0x6E4B2E, 0, 0.0, -W / 2 + 0.12)).scale.set(0.6, 0.035, 0.035);
    this.lid.position.set(0, 0.03, W / 2);
    const plank = mesh(G.box, 0x8A5A36, 0, 0.03, -W / 2, true); plank.scale.set(W - 0.04, 0.06, W - 0.04);
    this.lid.add(plank);
    for (const x of [-0.18, 0.18]) put(this.lid, mesh(G.box, 0x6E4B2E, x, 0.062, -W / 2)).scale.set(0.025, 0.01, W - 0.1);
    const ring = mesh(new TorusGeometry(0.08, 0.016, 6, 14), 0x3A3F45, 0, 0.07, 0.2 - W); ring.rotation.x = Math.PI / 2;
    this.lid.add(ring);
    this.add(this.lid);
    this.light.position.set(0, 0.5, 0);
    this.add(this.light);
    for (let i = 0; i < 7; i++) {
      const m = mesh(G.sphere, this.puffMat.clone(), 0, 0, 0); m.visible = false;
      this.add(m); this.steam.push({ m, t: i / 7 * 1.6 });
    }
  }

  /** Someone knocks from underneath. */
  knock() { this.bumpT = 0.32; }

  update(dt: number) {
    this.open += (this.openTo - this.open) * Math.min(1, dt * (this.openTo > this.open ? 14 : 9));
    this.bumpT = Math.max(0, this.bumpT - dt);
    const k = this.open;
    // two quick knocks, 0.16s apart
    const bump = Math.abs(Math.sin((0.32 - this.bumpT) / 0.16 * Math.PI)) * (this.bumpT > 0 ? 0.12 : 0);
    this.lid.rotation.x = k * 1.95 + bump;
    this.pit.emissiveIntensity = k * 0.55;
    this.light.intensity = k * 8;
    for (const s of this.steam) {
      s.t = (s.t + dt) % 1.6;
      const u = s.t / 1.6;
      s.m.visible = k > 0.1;
      // wisps curling up round the edge of the hole, not over whoever's standing in it
      const ang = s.m.id * 2.1 + s.t * 0.6;
      s.m.position.set(Math.cos(ang) * 0.5, 0.05 + u * 0.7, Math.sin(ang) * 0.5);
      s.m.scale.setScalar(0.05 + u * 0.1);
      (s.m.material as MeshLambertMaterial).opacity = k * 0.22 * Math.sin(u * Math.PI);
    }
  }
}
