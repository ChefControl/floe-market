// Mr. Fugu, the shady pufferfish who runs a sumo ring under the dock, and the hatch in the dock he climbs out of.
// He's built like everyone else (the same legs, body and arms) with a pufferfish for a head: spines that stand up
// when he puffs, a pout, shades, a toothpick and a fedora, over a trench coat with a gold chain.
import {
  AlwaysDepth, AlwaysStencilFunc, BoxGeometry, ConeGeometry, CylinderGeometry, EqualStencilFunc, Group, Mesh,
  MeshLambertMaterial, type Object3D, PlaneGeometry, PointLight, Quaternion, ReplaceStencilOp, RepeatWrapping, ShaderMaterial,
  SphereGeometry, SpotLight, TorusGeometry, Vector3,
} from 'three';
import { canvasTex, G, mesh } from './render';

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


/** The light on his shades: a little all over, and a streak across the glass (it sweeps over them when they glint). */
const shine = canvasTex(64, 32, (c, w, h) => {
  c.fillStyle = '#3A3A3A'; c.fillRect(0, 0, w, h);
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0.3, 'rgba(255,255,255,0)'); g.addColorStop(0.45, 'rgba(255,255,255,1)'); g.addColorStop(0.52, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.58, 'rgba(255,255,255,0)'); g.addColorStop(0.66, 'rgba(255,255,255,0.7)'); g.addColorStop(0.72, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  // slanted, like light on glass
  c.setTransform(1, 0, -0.6, 1, h * 0.3, 0); c.fillRect(-w, 0, w * 3, h);
}).tex;
// (round and round: a glint carries the streak out one side of the glass and back in the other)
shine.wrapS = RepeatWrapping;

/** Where the streak on his shades rests: across the middle of the glass. */
const SHINE_REST = 0.05;
/** How long a glint takes to sweep across. */
const GLINT = 0.6;

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
  private readonly lens = new MeshLambertMaterial({ color: SHADES, emissive: 0xFFFFFF, emissiveMap: shine, emissiveIntensity: 0 });
  /** Only his shades showing, catching the light in the dark (see stare()). */
  private staring = false;
  /** 0 to 1: how puffed up he is, and how puffed up he's getting. */
  puff = 0;
  puffTo = 0;
  talking = false;
  /** Looking someone in the eye: how far his head tips down to them (radians), and his idle sway nearly stilled so
   *  his gaze stays on them. */
  gaze = 0;
  steady = false;
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

  /** His own colours, taken the first time he's shaded (mesh() hands everyone of a colour the same material). */
  private own: { m: MeshLambertMaterial; c: number }[] | null = null;
  /** How much of his colour shows, 0 (a black shape against the light: rising out of the smoke) to 1 (himself). */
  shade(k: number) {
    if (!this.own) {
      this.own = [];
      this.traverse(o => {
        const m = o as Mesh;
        if (!m.isMesh || m.material === this.lens) return;
        const mat = (m.material as MeshLambertMaterial).clone();
        m.material = mat;
        this.own!.push({ m: mat, c: mat.color.getHex() });
      });
    }
    for (const { m, c } of this.own) m.color.setHex(c).multiplyScalar(0.03 + 0.97 * k);
  }
  /** Just his shades, catching the light in the dark (peeking out from under the hatch): the rest of him isn't drawn. */
  stare(on: boolean) {
    this.shade(1);
    for (const { m } of this.own!) m.visible = !on;
    this.staring = on;
  }
  /** Shakes him for a moment (he's furious). */
  shake(s = 0.45) { this.shakeT = s; }
  /** The light catches his shades. */
  glint() {
    if (this.glintT > 0) return; // (one at a time: a second never cuts the first short)
    this.glintT = GLINT;
  }
  /** A letter said: keeps his mouth going. */
  syllable() { this.voice = 0.16; }
  /** A word said: his head bobs with it. */
  word() { this.nod = Math.min(1, this.nod + 0.5); }
  /** A full stop: his mouth shuts and his head dips firmly, to make the point. */
  point() { this.voice = 0; this.nod = 1.6; }

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
    // (peeking from under the lid, he keeps his head still: only the faintest of it)
    const m = this.staring ? 0.15 : 1, sway = this.steady ? 0.2 : 1;
    const tilt = this.talking ? Math.sin(this.t * 2.6) * 0.09 * m * (this.steady ? 0.5 : 1) : 0;
    this.head.rotation.set((this.nod * 0.12 - 0.04 * k) * m + this.gaze, Math.sin(this.t * 1.3) * 0.08 * m * sway, tilt);
    const jitter = this.shakeT > 0 ? Math.sin(this.t * 90) * 0.035 : 0;
    this.head.position.set(jitter, 1.13 + (Math.sin(this.t * 2.4) * 0.012 - this.nod * 0.02) * m + 0.1 * k, 0);
    // the hat stays on through all of it
    const top = HEAD_R * s * 0.82;
    this.hat.position.set(jitter - 0.02 - tilt * top, this.head.position.y + top, -0.02 + (this.nod * 0.12 + this.gaze) * top);
    this.hat.rotation.set(-0.06 + this.nod * 0.12 + this.gaze, this.head.rotation.y, 0.14 + tilt);
    for (const [i, f] of this.fins.entries()) f.rotation.y = Math.sin(this.t * (this.talking ? 16 : 9) + i * Math.PI) * 0.5;
    // a hand comes out of his pocket to talk with; puffed up, he throws both out
    const [left, right] = this.arms;
    const talkArm = this.talking ? 1 : 0;
    this.armT += (talkArm - this.armT) * Math.min(1, dt * 8);
    right.rotation.set(0.25 - this.armT * (1.25 + Math.sin(this.t * 5) * 0.25), 0, 0.12 + 0.75 * k);
    left.rotation.set(0.25 - 0.6 * k, 0, -0.12 - 0.75 * k);
    // a glint: the glass lights up, and the streak sweeps from the middle out across it, round, and back to rest in
    // the middle
    const g = this.glintT > 0 ? 1 - this.glintT / GLINT : -1;
    shine.offset.x = SHINE_REST - (g >= 0 ? g * g * (3 - 2 * g) : 0);
    // peeking, the shades shine faintly in the dark
    this.lens.emissiveIntensity = (this.staring ? 0.75 : 0) + (g >= 0 ? Math.sin(g * Math.PI) * 1.4 : 0);
  }
}

// The hole under the hatch is real: a shaft of rough planks going down to a furnace glow, with the ladder down one
// side. The deck is solid over it, so the hole is cut in the drawing: where the hatch's opening is the nearest thing
// on screen (nobody standing in front of it), a plane marks the stencil and pushes the depth back to the far plane,
// and the shaft (and whatever's in it) is drawn after that, through the gap.
const OPEN = 1.1, DEEP = 2.6;
const boards = canvasTex(128, 256, (c, w, h) => {
  c.fillStyle = '#5A3A24'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {
    c.fillStyle = ['#4E321F', '#5F3E27', '#553622'][i % 3]; c.fillRect(i * 21.3 + 1, 0, 19.3, h);
    c.fillStyle = '#1E120A'; c.fillRect(i * 21.3, 0, 1.5, h);
  }
  for (let j = 0; j < 40; j++) { c.fillStyle = 'rgba(20,10,4,0.25)'; c.fillRect((j * 37) % w, (j * 71) % h, 1, 8 + (j * 13) % 30); }
});
boards.tex.wrapS = boards.tex.wrapT = RepeatWrapping; boards.tex.repeat.set(1, 2);
/** Marks the opening in the stencil, where it's in sight (the deck's depth still in place: it's tested against it). */
const markMat = new ShaderMaterial({
  vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'void main(){ gl_FragColor = vec4(0.0); }',
  colorWrite: false, depthWrite: false,
  stencilWrite: true, stencilRef: 1, stencilFunc: AlwaysStencilFunc, stencilZPass: ReplaceStencilOp,
});
/** Then, only there, pushes the depth back to the far plane, so the shaft under the deck can be drawn through it. */
const clearMat = new ShaderMaterial({
  vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'void main(){ gl_FragColor = vec4(0.0); gl_FragDepth = 1.0; }',
  colorWrite: false, depthFunc: AlwaysDepth,
  stencilWrite: true, stencilRef: 1, stencilFunc: EqualStencilFunc,
});

/** A trapdoor in the dock planks, with a ladder going down to a glow, a roar and a lot of steam. */
export class Hatch extends Group {
  /** Swings up on its far edge (+z, before offer.ts turns the hatch round), away from whoever's in front of it. */
  readonly lid = new Group();
  /** The lift he rides up and down on: a plank platform on a timber frame, its top where his feet are (offer.ts moves it). */
  readonly lift = new Group();
  readonly light = new PointLight(0xFF5A2A, 0, 7, 1.6);
  /** A light from high in front, on his head and shoulders (his legs stay in the dark), for Mr. Fugu's reveal. Off,
   *  like `light`, till offer.ts switches them on behind a blink (see lit()). */
  readonly spot = new SpotLight(0xFFE6CC, 0, 9, 0.17, 0.7, 1.0);
  /** The furnace glow at the bottom of the shaft. */
  private readonly pit = new MeshLambertMaterial({ color: 0x2A1208, emissive: 0xFF5A1C, emissiveIntensity: 0 });
  /** The shaft's planks and its ladder (its own, to go dark in: see update()). */
  private readonly wall = new MeshLambertMaterial({ map: boards.tex });
  private readonly rail = new MeshLambertMaterial({ color: 0x6E4B2E });
  /** How far the lid's lifted a crack (0 to 1): someone peeking out from under it. */
  peek = 0;
  peekTo = 0;
  /** A shove from underneath (offer.ts): how far the lid's thrown up, on top of the rest. */
  jolt = 0;
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
    // the shaft, and the hole into it (drawn after the world: renderOrder 1 marks it, 2 draws through it)
    const mark = new Mesh(new PlaneGeometry(OPEN, OPEN), markMat), clear = new Mesh(new PlaneGeometry(OPEN, OPEN), clearMat);
    for (const [m, order] of [[mark, 1], [clear, 1.5]] as const) { m.rotation.x = -Math.PI / 2; m.position.y = 0.006; m.renderOrder = order; this.add(m); }
    const shaft = new Group();
    const wall = this.wall;
    for (const [x, z, ry] of [[0, -OPEN / 2, 0], [0, OPEN / 2, Math.PI], [-OPEN / 2, 0, Math.PI / 2], [OPEN / 2, 0, -Math.PI / 2]]) {
      const w = new Mesh(new PlaneGeometry(OPEN, DEEP), wall); w.position.set(x, -DEEP / 2, z); w.rotation.y = ry; shaft.add(w);
    }
    const floor = new Mesh(new PlaneGeometry(OPEN, OPEN), this.pit); floor.rotation.x = -Math.PI / 2; floor.position.y = -DEEP;
    shaft.add(floor);
    for (const sx of [-0.3, 0.3]) put(shaft, mesh(new BoxGeometry(0.045, DEEP, 0.045), this.rail, sx, -DEEP / 2, -OPEN / 2 + 0.07));
    for (let y = -0.35; y > -DEEP; y -= 0.3) put(shaft, mesh(new BoxGeometry(0.6, 0.035, 0.035), this.rail, 0, y, -OPEN / 2 + 0.07));
    this.add(shaft);
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
    // (its plank clear of the ladder's top, at the hole's far edge)
    const LW = W - 0.12, LD = W - 0.38, LZ = 0.12;
    put(this.lift, mesh(G.box, 0x8A5A36, 0, -0.03, LZ, true)).scale.set(LW, 0.06, LD);
    for (const x of [-0.25, 0, 0.25]) put(this.lift, mesh(G.box, 0x6E4B2E, x, 0.002, LZ)).scale.set(0.02, 0.005, LD - 0.06);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(this.lift, mesh(G.box, 0x4A3220, x * (LW / 2 - 0.05), -0.45, LZ + z * (LD / 2 - 0.05))).scale.set(0.06, 0.8, 0.06);
    for (const y of [-0.3, -0.75]) {
      put(this.lift, mesh(G.box, 0x4A3220, 0, y, LZ + LD / 2 - 0.05)).scale.set(LW - 0.06, 0.05, 0.04);
      put(this.lift, mesh(G.box, 0x4A3220, 0, y, LZ - LD / 2 + 0.05)).scale.set(LW - 0.06, 0.05, 0.04);
    }
    this.lift.visible = false;
    this.add(this.lift);
    this.light.position.set(0, 0.5, 0);
    // (off till the lid opens: a new light recompiles every material in the scene, so offer.ts switches it on
    // behind a blink)
    this.light.visible = false;
    this.add(this.light);
    this.spot.position.set(0.5, 4.4, -1.9);
    this.spot.target.position.set(0, 1.45, 0);
    this.spot.visible = false;
    this.add(this.spot, this.spot.target);
    for (let i = 0; i < 7; i++) {
      const m = mesh(G.sphere, this.puffMat.clone(), 0, 0, 0); m.visible = false;
      this.add(m); this.steam.push({ m, t: i / 7 * 1.6 });
    }
    this.through();
  }

  /** Someone knocks from underneath. */
  knock() { this.bumpT = 0.32; }
  /** Switches its lights on or off (do it out of sight: it recompiles every material in the scene). */
  lit(on: boolean) { this.light.visible = this.spot.visible = on; }
  /** Draws everything of the hatch's (and `also`'s: him, rising out of it) through the hole, after it's cut. */
  through(...also: Object3D[]) { for (const g of [this, ...also]) g.traverse(o => { if (o.renderOrder === 0) o.renderOrder = 2; }); }

  update(dt: number) {
    this.open += (this.openTo - this.open) * Math.min(1, dt * (this.openTo > this.open ? 14 : 9));
    this.bumpT = Math.max(0, this.bumpT - dt);
    const k = this.open;
    // two quick knocks, 0.16s apart
    const bump = Math.abs(Math.sin((0.32 - this.bumpT) / 0.16 * Math.PI)) * (this.bumpT > 0 ? 0.12 : 0);
    this.peek += (this.peekTo - this.peek) * Math.min(1, dt * 5);
    this.lid.rotation.x = Math.max(k * 1.95, this.peek * 0.17) + bump + this.jolt;
    // lifted a crack, it's black under there (only his shades show); opened, the furnace glow
    const dark = 1 - 0.95 * this.peek * (1 - k);
    this.pit.emissiveIntensity = (0.35 + 0.4 * k) * dark * dark;
    this.wall.color.setScalar(dark);
    this.rail.color.setHex(0x6E4B2E).multiplyScalar(dark);
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
