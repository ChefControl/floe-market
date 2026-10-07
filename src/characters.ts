import { BoxGeometry, BufferGeometry, CylinderGeometry, Group, type Mesh, MeshLambertMaterial, Object3D, SphereGeometry, TorusGeometry } from 'three';
import { G, mat, mesh, scene } from './render';
import { current, onSeason, type Season } from './season';
import type { XZ } from './util';

export const PARKAS = [0xF2B33D, 0x7A6FF0, 0x3FA37C, 0xE85D75, 0x5B8DEF, 0xF08A4B, 0x9B5DE5, 0x2EC4B6];
/** Suit colours for the sushi bar's well-dressed diners. */
export const SUITS = [0x22303C, 0x3B3F6B, 0x5A2E3A, 0x2F4A44, 0x4A4F57];

/** Everyday clothes (a parka in winter), a diner's suit and top hat, a sushi chef's whites, or a farmer's straw hat. */
export type Look = 'parka' | 'fancy' | 'chef' | 'farmer';

// ---------- seasonal clothes ----------
const SKIN = 0xF3C9A4;
/** Hair, spring caps and autumn knits, handed out in turn so a crowd looks mixed (no Math.random: see rain.ts). */
const HAIR = [0x3B2A20, 0x6B4A2E, 0x1E1B1A, 0xC99A5B, 0x8A4B2A];
const CAPS = [0xF4A6B8, 0x9AD3E8, 0xF6E27A, 0xB7E4A8, 0xFFFFFF, 0xC9B6F2];
const KNITS = [0xC0392B, 0xE8A33D, 0x2E7D6B, 0x6A4C93, 0x3A6EA5, 0xD9775B];
let dressed = 0;
const hairGeo = new SphereGeometry(0.216, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.46);
const capGeo = new SphereGeometry(0.217, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.4);
const beanieGeo = new SphereGeometry(0.222, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.44);
const cuffGeo = new TorusGeometry(0.205, 0.04, 6, 18);
const brimGeo = new BoxGeometry(0.2, 0.016, 0.11);
const lensGeo = new BoxGeometry(0.085, 0.05, 0.02);
const forearmGeo = new BoxGeometry(0.106, 0.17, 0.126);
const shinGeo = new BoxGeometry(0.136, 0.125, 0.156);
const scarfGeo = new TorusGeometry(0.19, 0.065, 6, 14);

/** A walker with swinging limbs. */
export class Person extends Group {
  readonly legs: Group[] = [];
  readonly arms: Group[] = [];
  phase = 0;
  /** A chef's toque: its band, which grows taller, and the puff on top. */
  private toqueBand?: Mesh;
  private toquePuff?: Mesh;
  /** A headband, once one's been tied on. */
  band?: Group;
  /** Clothes for the seasons, and which seasons each is worn in. */
  private outfit: { o: Object3D; in: Season[] }[] = [];
  /** Wearing someone else's look (the singer's), over everything seasonal. */
  disguised = false;

  constructor(color: number, look: Look = 'parka') {
    super();
    for (const s of [-1, 1]) {
      const p = new Group(); p.position.set(s * 0.1, 0.3, 0);
      p.add(mesh(G.leg, 0x2C3A47, 0, -0.15, 0, true)); this.add(p); this.legs.push(p);
      const a = new Group(); a.position.set(s * 0.3, 0.82, 0.02);
      a.add(mesh(G.arm, color, 0, -0.15, 0, true)); this.add(a); this.arms.push(a);
    }
    this.add(mesh(G.body, color, 0, 0.6, 0, true));
    this.add(mesh(G.head, SKIN, 0, 1.03, 0.05));
    for (const s of [-1, 1]) this.add(mesh(G.eye, 0x1B2733, s * 0.07, 1.06, 0.24));
    if (look === 'fancy') this.dressUp();
    if (look === 'chef') this.chefWhites();
    if (look === 'farmer') {
      const hat = mesh(G.cone, 0xE3C26B, 0, 1.27, 0.03, true); hat.scale.set(0.36, 0.17, 0.36); this.add(hat);
    }
    const n = dressed++;
    if (look === 'parka') {
      this.part(['winter'], G.hoodBack, color, 0, 1.03, -0.04);
      this.part(['winter'], G.hood, 0xF8FAFC, 0, 1.03, 0.1).castShadow = false;
      this.everyday(n);
    }
    // a scarf for the cold, over the suit or the farmer's shirt
    if (look === 'fancy' || look === 'farmer') this.scarf(['winter', 'fall'], look === 'fancy' ? 0xF4EBDD : KNITS[n % KNITS.length]);
    this.wear();
  }

  /** A piece of clothing worn in `seasons` only, on `parent` (the body, an arm or a leg). */
  private part(seasons: Season[], geo: BufferGeometry, c: number, x: number, y: number, z: number, parent: Object3D = this) {
    const m = mesh(geo, c, x, y, z, true);
    m.userData.outfit = true;
    parent.add(m);
    this.outfit.push({ o: m, in: seasons });
    return m;
  }

  /**
   * Everyday clothes out of winter: hair showing, and in spring a baseball cap, in summer short sleeves, shorts and
   * sunglasses, in autumn a woolly hat with a bobble and a scarf. (Winter's parka hood is built with the body.)
   */
  private everyday(n: number) {
    this.part(['spring', 'summer'], hairGeo, HAIR[n % HAIR.length], 0, 1.03, 0.05).rotation.x = -0.35;
    const cap = CAPS[n % CAPS.length];
    this.part(['spring'], capGeo, cap, 0, 1.045, 0.04).rotation.x = -0.15;
    this.part(['spring'], brimGeo, cap, 0, 1.14, 0.265).rotation.x = -0.4;
    for (const s of [-1, 1]) this.part(['summer'], lensGeo, 0x1B2430, s * 0.07, 1.075, 0.262).rotation.y = s * 0.3;
    this.part(['summer'], G.box, 0x1B2430, 0, 1.085, 0.272).scale.set(0.05, 0.014, 0.014);
    for (const a of this.arms) this.part(['summer'], forearmGeo, SKIN, 0, -0.245, 0, a);
    for (const l of this.legs) this.part(['summer'], shinGeo, SKIN, 0, -0.19, 0, l);
    const knit = KNITS[(n + 2) % KNITS.length];
    this.part(['fall'], beanieGeo, knit, 0, 1.05, 0.04).rotation.x = -0.2;
    this.part(['fall'], cuffGeo, knit, 0, 1.1, 0.05).rotation.x = Math.PI / 2 - 0.2;
    this.part(['fall'], G.sphere, 0xF4F1EA, 0, 1.28, 0.0).scale.setScalar(0.065);
    this.scarf(['fall'], KNITS[(n + 4) % KNITS.length]);
  }

  /** A knitted scarf round the neck, one end hanging down the front. */
  private scarf(seasons: Season[], c: number) {
    const ring = this.part(seasons, scarfGeo, c, 0, 0.9, 0.01);
    ring.rotation.x = Math.PI / 2; ring.scale.setScalar(1.12);
    const end = this.part(seasons, G.box, c, 0.08, 0.72, 0.26);
    end.scale.set(0.08, 0.24, 0.03); end.rotation.set(-0.13, 0, 0.08);
  }

  /** Puts on the clothes for the season (none of them while disguised). */
  wear() {
    const s = current();
    for (const w of this.outfit) w.o.visible = !this.disguised && w.in.includes(s);
  }

  /** Top hat, white shirt front and a red bow tie. */
  private dressUp() {
    const part = (geo: BufferGeometry, c: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      const m = mesh(geo, c, x, y, z, true); m.scale.set(sx, sy, sz); this.add(m); return m;
    };
    part(G.cyl, 0x1B2430, 0, 1.2, 0.03, 0.26, 0.03, 0.26);
    part(G.cyl, 0x1B2430, 0, 1.36, 0.03, 0.16, 0.3, 0.16);
    part(G.cyl, 0xC0392B, 0, 1.25, 0.03, 0.165, 0.05, 0.165);
    part(G.box, 0xFFFFFF, 0, 0.74, 0.24, 0.14, 0.26, 0.02);
    for (const s of [-1, 1]) part(G.cone, 0xC0392B, s * 0.05, 0.86, 0.25, 0.05, 0.07, 0.03).rotation.z = s * Math.PI / 2;
  }

  /** Puffy chef's hat and a red neckerchief. */
  private chefWhites() {
    this.toqueBand = mesh(G.cyl, 0xFFFFFF, 0, 0, 0.03, true); this.toqueBand.scale.set(0.19, 1, 0.19); this.add(this.toqueBand);
    this.toquePuff = mesh(G.sphere, 0xFFFFFF, 0, 0, 0.03, true); this.toquePuff.scale.set(0.25, 0.16, 0.25); this.add(this.toquePuff);
    this.toque(0);
    const scarf = mesh(G.hood, 0xE5484D, 0, 0.88, 0.02); scarf.rotation.x = Math.PI / 2; scarf.scale.setScalar(1.15); this.add(scarf);
  }

  /** Makes a chef's toque taller, the way head chefs' are: `level` 0 is the everyday one. */
  toque(level: number) {
    if (!this.toqueBand || !this.toquePuff) return;
    const h = 0.12 + level * 0.06;
    this.toqueBand.scale.y = h; this.toqueBand.position.y = 1.16 + h / 2;
    this.toquePuff.position.y = 1.16 + h + 0.08;
  }

  /** Ties a headband round the hood in `color`, with its two ends trailing behind; null takes it off. */
  headband(color: number | null) {
    if (color === null) { if (this.band) this.band.visible = false; return; }
    if (!this.band) {
      this.band = new Group(); this.band.position.set(0, 1.1, 0.0);
      const ring = mesh(BAND, color); ring.rotation.x = Math.PI / 2; this.band.add(ring);
      for (const s of [-1, 1]) {
        const end = mesh(G.box, color, s * 0.06, -0.08, -0.27); end.scale.set(0.06, 0.16, 0.025); end.rotation.z = s * 0.35;
        this.band.add(end);
      }
      this.add(this.band);
    }
    this.band.visible = true;
    this.band.traverse(o => { if ('material' in o) (o as Mesh).material = mat(color); });
  }
}

const BAND = new TorusGeometry(0.24, 0.035, 6, 18);

/** Shows a vehicle part only in `seasons` (skis in winter, wheels the rest of the year). */
function onlyIn(o: Object3D, seasons: Season[]) {
  o.userData.seasons = seasons;
  o.visible = seasons.includes(current());
  return o;
}

// Everyone changes clothes when the season does, and the snowmobiles swap their skis for wheels and back.
onSeason(() => scene.traverse(o => {
  if (o instanceof Person) o.wear();
  else if (o.userData.seasons) o.visible = (o.userData.seasons as Season[]).includes(current());
}));

export function animPerson(p: Person, moving: boolean, dt: number, carrying: boolean) {
  if (moving) p.phase += dt * 11; else p.phase = 0;
  const s = Math.sin(p.phase);
  p.legs[0].rotation.x = s * 0.7; p.legs[1].rotation.x = -s * 0.7;
  if (carrying) { p.arms[0].rotation.x = p.arms[1].rotation.x = -1.25; }
  else { p.arms[0].rotation.x = -s * 0.5; p.arms[1].rotation.x = s * 0.5; }
}

const glass = new MeshLambertMaterial({ color: 0xBDEBFA, transparent: true, opacity: .65 });
const SKI = new BoxGeometry(0.1, 0.06, 2.1);
const TYRE = new CylinderGeometry(0.17, 0.17, 0.12, 14), HUB = new CylinderGeometry(0.08, 0.08, 0.13, 10);
const OUT_OF_WINTER: Season[] = ['spring', 'summer', 'fall'];
/**
 * A snowmobile and its driver. Out of winter it runs on four wheels instead of its skis: a little car, in effect,
 * still called a snowmobile in the code.
 */
export function makeSled(color: number, driverColor: number) {
  const g = new Group();
  g.add(mesh(new BoxGeometry(0.9, 0.38, 1.5), color, 0, 0.34, 0, true));
  g.add(mesh(new BoxGeometry(0.86, 0.24, 0.5), color, 0, 0.28, 0.95, true));
  for (const s of [-1, 1]) g.add(onlyIn(mesh(SKI, 0x2C3A47, s * 0.38, 0.05, 0.15), ['winter']));
  for (const s of [-1, 1]) {
    for (const z of [-0.5, 0.85]) {
      const w = new Group(); w.position.set(s * 0.46, 0.17, z); w.rotation.z = Math.PI / 2;
      w.add(mesh(TYRE, 0x1F262E, 0, 0, 0, true), mesh(HUB, 0xC9D1D8));
      g.add(onlyIn(w, OUT_OF_WINTER));
    }
  }
  const ws = mesh(new BoxGeometry(0.78, 0.36, 0.05), glass, 0, 0.68, 0.62); ws.rotation.x = -0.45; g.add(ws);
  g.add(mesh(new BoxGeometry(0.82, 0.08, 0.62), 0x5B4636, 0, 0.56, -0.52));
  const d = new Person(driverColor); d.scale.setScalar(0.85); d.position.set(0, 0.28, 0.1);
  d.arms.forEach(a => a.rotation.x = -1.1);
  g.add(d);
  return g;
}

/** Anything that walks around on the ground plane. */
export interface Walker {
  g: Object3D;
  h: number;
  speed: number;
  moving: boolean;
}

/** Steps toward `tgt`; returns true once arrived. */
export function moveEnt(e: Walker, tgt: XZ, dt: number) {
  const p = e.g.position;
  const dx = tgt.x - p.x, dz = tgt.z - p.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.06) { e.moving = false; return true; }
  const st = Math.min(d, e.speed * dt);
  p.x += dx / d * st; p.z += dz / d * st;
  e.h = Math.atan2(dx, dz); e.moving = true;
  return false;
}
