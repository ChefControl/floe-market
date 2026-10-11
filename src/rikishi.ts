// The wrestlers (stage 3), built on the same frame as everyone else, wider, with a coloured belt and a topknot: the
// player's champion, who fights every bout; his sparring partner, who slaps the teppo post in the corner; the nameless
// locals he takes on between boss nights; and the bosses, each in his own skin and belt.
import { Group, type Mesh } from 'three';
import { G, mat, mesh } from './render';

const SKIN = 0xF3C9A4, HAIR = 0x15130F;
/** The champion's name, and his belt: the player's colour. */
export const CHAMP = 'Chunkos', CHAMP_BELT = 0xE0552F;
/** The locals' belts, one a bout in turn. */
export const LOCAL_BELTS = [0x2C3A6B, 0x2F6B4F, 0x6B4A2C, 0x3A6B7A, 0x8A3A6B];

const add = <T extends import('three').Object3D>(p: import('three').Object3D, o: T) => { p.add(o); return o; };
const box = (p: import('three').Object3D, c: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
  const m = add(p, mesh(G.box, c, x, y, z, true)); m.scale.set(sx, sy, sz); return m;
};

/** A wrestler's body: legs, a big round middle and belly, the belt, arms, and a head with a topknot. */
export class RikishiModel extends Group {
  readonly legs: Group[] = [];
  readonly arms: Group[] = [];
  /** Everything above the legs, which bends forward at the hips. */
  readonly upper = new Group();
  private torso: Mesh; private belly: Mesh; private belt: Mesh; private flap: Mesh;
  private beltBits: Mesh[] = [];

  constructor(beltColor: number, skin = SKIN) {
    super();
    for (const s of [-1, 1]) {
      const p = add(this, new Group()); p.position.set(s * 0.17, 0.38, 0);
      box(p, skin, 0, -0.17, 0, 0.21, 0.38, 0.23);
      this.legs.push(p);
    }
    this.upper.position.y = 0.42; this.add(this.upper);
    const u = this.upper;
    this.torso = add(u, mesh(G.sphere, skin, 0, 0.3, 0, true));
    this.belly = add(u, mesh(G.sphere, skin, 0, 0.2, 0.08, true));
    this.belt = add(u, mesh(G.cyl, beltColor, 0, 0.04, 0, true));
    this.flap = box(u, beltColor, 0, 0, 0, 0.16, 0.18, 0.03);
    for (const x of [-0.5, -0.19, 0.19, 0.5]) this.beltBits.push(box(this.flap, beltColor, x, -0.9, 0, 0.12, 1.2, 0.6));
    add(u, mesh(G.head, skin, 0, 0.8, 0.06)).scale.setScalar(1.12);
    for (const s of [-1, 1]) add(u, mesh(G.eye, 0x1B2733, s * 0.075, 0.83, 0.28));
    // slicked-back hair and the topknot folded forward over the crown
    add(u, mesh(G.sphere, HAIR, 0, 0.84, 0.01)).scale.set(0.215, 0.2, 0.2);
    box(u, HAIR, 0, 1.04, 0.04, 0.07, 0.06, 0.22);
    add(u, mesh(G.sphere, HAIR, 0, 1.04, 0.15)).scale.setScalar(0.06);
    for (const s of [-1, 1]) {
      const a = add(u, new Group()); a.position.set(s * 0.4, 0.5, 0);
      box(a, skin, 0, -0.2, 0, 0.17, 0.44, 0.19);
      this.arms.push(a);
    }
    this.scale.setScalar(1.2);
    this.setWeight(150);
  }

  /** Fills him out for his weight: from a stocky 110 kg to a vast 200. */
  setWeight(kg: number) {
    const f = 0.9 + (kg - 110) / 140;
    this.torso.scale.set(0.42 * f, 0.33, 0.36 * f);
    this.belly.scale.set(0.36 * f, 0.28, 0.3 * f + 0.02);
    this.belly.position.z = 0.06 + 0.06 * f;
    this.belt.scale.set(0.43 * f, 0.17, 0.38 * f);
    this.flap.position.z = 0.37 * f + 0.01;
    this.arms.forEach((a, i) => { a.position.x = (i ? 1 : -1) * (0.3 + 0.12 * f); });
  }

  /** Dresses him in another skin and belt (a local, or a boss). */
  dress(beltColor: number, skin = SKIN) {
    for (const m of [this.belt, this.flap, ...this.beltBits]) m.material = mat(beltColor);
    const sk = mat(skin);
    this.legs.forEach(l => l.traverse(o => { if ((o as Mesh).isMesh) (o as Mesh).material = sk; }));
    this.arms.forEach(a => a.traverse(o => { if ((o as Mesh).isMesh) (o as Mesh).material = sk; }));
    for (const m of [this.torso, this.belly]) m.material = sk;
    (this.upper.children.find(c => (c as Mesh).geometry === G.head) as Mesh).material = sk;
  }
}
