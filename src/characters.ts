import { BoxGeometry, BufferGeometry, Group, MeshLambertMaterial, Object3D } from 'three';
import { G, mesh } from './render';
import type { XZ } from './util';

export const PARKAS = [0xF2B33D, 0x7A6FF0, 0x3FA37C, 0xE85D75, 0x5B8DEF, 0xF08A4B, 0x9B5DE5, 0x2EC4B6];
/** Suit colours for the sushi bar's well-dressed diners. */
export const SUITS = [0x22303C, 0x3B3F6B, 0x5A2E3A, 0x2F4A44, 0x4A4F57];

/** Everyday parka, a diner's suit and top hat, a sushi chef's whites, or a farmer's straw hat. */
export type Look = 'parka' | 'fancy' | 'chef' | 'farmer';

/** A walker with swinging limbs. */
export class Person extends Group {
  readonly legs: Group[] = [];
  readonly arms: Group[] = [];
  phase = 0;

  constructor(color: number, look: Look = 'parka') {
    super();
    for (const s of [-1, 1]) {
      const p = new Group(); p.position.set(s * 0.1, 0.3, 0);
      p.add(mesh(G.leg, 0x2C3A47, 0, -0.15, 0, true)); this.add(p); this.legs.push(p);
      const a = new Group(); a.position.set(s * 0.3, 0.82, 0.02);
      a.add(mesh(G.arm, color, 0, -0.15, 0, true)); this.add(a); this.arms.push(a);
    }
    this.add(mesh(G.body, color, 0, 0.6, 0, true));
    if (look === 'parka') this.add(mesh(G.hoodBack, color, 0, 1.03, -0.04, true));
    this.add(mesh(G.head, 0xF3C9A4, 0, 1.03, 0.05));
    if (look === 'parka') this.add(mesh(G.hood, 0xF8FAFC, 0, 1.03, 0.1));
    for (const s of [-1, 1]) this.add(mesh(G.eye, 0x1B2733, s * 0.07, 1.06, 0.24));
    if (look === 'fancy') this.dressUp();
    if (look === 'chef') this.chefWhites();
    if (look === 'farmer') {
      const hat = mesh(G.cone, 0xE3C26B, 0, 1.27, 0.03, true); hat.scale.set(0.36, 0.17, 0.36); this.add(hat);
    }
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
    const band = mesh(G.cyl, 0xFFFFFF, 0, 1.22, 0.03, true); band.scale.set(0.19, 0.12, 0.19); this.add(band);
    const puff = mesh(G.sphere, 0xFFFFFF, 0, 1.36, 0.03, true); puff.scale.set(0.25, 0.16, 0.25); this.add(puff);
    const scarf = mesh(G.hood, 0xE5484D, 0, 0.88, 0.02); scarf.rotation.x = Math.PI / 2; scarf.scale.setScalar(1.15); this.add(scarf);
  }
}

export function animPerson(p: Person, moving: boolean, dt: number, carrying: boolean) {
  if (moving) p.phase += dt * 11; else p.phase = 0;
  const s = Math.sin(p.phase);
  p.legs[0].rotation.x = s * 0.7; p.legs[1].rotation.x = -s * 0.7;
  if (carrying) { p.arms[0].rotation.x = p.arms[1].rotation.x = -1.25; }
  else { p.arms[0].rotation.x = -s * 0.5; p.arms[1].rotation.x = s * 0.5; }
}

const glass = new MeshLambertMaterial({ color: 0xBDEBFA, transparent: true, opacity: .65 });
export function makeSled(color: number, driverColor: number) {
  const g = new Group();
  g.add(mesh(new BoxGeometry(0.9, 0.38, 1.5), color, 0, 0.34, 0, true));
  g.add(mesh(new BoxGeometry(0.86, 0.24, 0.5), color, 0, 0.28, 0.95, true));
  for (const s of [-1, 1]) g.add(mesh(new BoxGeometry(0.1, 0.06, 2.1), 0x2C3A47, s * 0.38, 0.05, 0.15));
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
