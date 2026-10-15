// The wrestlers (stage 3): the player's champion, who fights every bout; his sparring partner, who slaps the teppo post
// in the corner; the nameless locals he takes on between boss nights; and the bosses, each in his own skin and belt.
// Each is built on joints, so he can stamp, squat, crouch, grip, slap and fall: hips that tilt (the belt on them, so it
// follows the body), a spine that bends, a neck, and legs and arms that bend at the knee and the elbow. Every bone is
// one mesh, its shapes baked together (kit.ts), and rebaked when he's dressed as someone else. He's posed with a Pose
// (dohyo.ts): a set of joint angles, mixed one into another as he moves.
import { Group, type Mesh, type Object3D, SphereGeometry } from 'three';
import { Build, K, quietly, shade } from './kit';

const SKIN = 0xF3C9A4, HAIR = 0x15130F;
/** The champion's name, and his belt: the player's colour. */
export const CHAMP = 'Chunkos', CHAMP_BELT = 0xE0552F;
/** The locals' belts, one a bout in turn. */
export const LOCAL_BELTS = [0x2C3A6B, 0x2F6B4F, 0x6B4A2C, 0x3A6B7A, 0x8A3A6B];

// ---------- poses ----------
/**
 * How he stands: the spine's bend forward, twist and lean to his left (radians); the head tipped forward; each leg
 * (0 his left, 1 his right) raised forward at the hip (`x`), out to the side (`z`) and bent at the knee (`k`); each arm
 * raised forward (`x`), out (`z`) and bent at the elbow (`e`); how far he's lifted off his feet (`up`), squashed (`sq`,
 * 1 his own shape), tipped over backwards (`pitch`, negative) or sideways (`roll`), and sat down (`seat`, 0 to 1).
 */
export interface Pose {
  bend: number; twist: number; side: number; head: number;
  l0x: number; l0z: number; l0k: number; l1x: number; l1z: number; l1k: number;
  a0x: number; a0z: number; a0e: number; a1x: number; a1z: number; a1e: number;
  up: number; sq: number; pitch: number; roll: number; seat: number;
}
const P0: Pose = {
  bend: 0.06, twist: 0, side: 0, head: 0, l0x: 0, l0z: 0.14, l0k: 0, l1x: 0, l1z: 0.14, l1k: 0,
  a0x: 0, a0z: 0, a0e: 0.15, a1x: 0, a1z: 0, a1e: 0.15, up: 0, sq: 1, pitch: 0, roll: 0, seat: 0,
};
/** A pose: standing, but for what `o` says. */
export const pose = (o: Partial<Pose> = {}): Pose => ({ ...P0, ...o });
/** `a` turned `k` of the way into `b`. */
export function mixPose(a: Pose, b: Pose, k: number): Pose {
  const r = { ...a };
  for (const key in P0) { const n = key as keyof Pose; r[n] = a[n] + (b[n] - a[n]) * k; }
  return r;
}

/** The bones' lengths: thigh and shin, and the ankle's height off the ground. */
const THIGH = 0.26, SHIN = 0.24, ANKLE = 0.07;
const ROUND = quietly(() => new SphereGeometry(1, 16, 12));
const add = <T extends Object3D>(p: Object3D, o: T) => { p.add(o); return o; };
const bone = (p: Object3D, x: number, y: number, z: number) => { const g = add(p, new Group()); g.position.set(x, y, z); return g; };
type Recipe = (b: Build, skin: number, belt: number, f: number) => void;

/** A wrestler: legs, hips with the belt (its knot behind, its fringe hanging in front), a round body that bends over
 *  them, arms, and a head with the topknot folded over the crown. */
export class RikishiModel extends Group {
  /** Each leg: the hip, the knee and the ankle. */
  readonly legs: { s: number; hip: Group; knee: Group; foot: Group }[] = [];
  /** Each arm: the shoulder, the elbow, and the hand on its end. */
  readonly arms: { s: number; sh: Group; el: Group; hand: Group }[] = [];
  readonly hips: Group;
  readonly spine: Group;
  readonly neck: Group;
  /** Everything but where he stands: squashed, tipped and lifted as a whole. */
  private body: Group;
  /** The belt's fringe (sagari), hanging plumb from under its front, whatever the hips do. */
  private fringe: Group;
  /** The belly, which wobbles on a spring. */
  private bellyAt: Group;
  private parts: { at: Group; make: Recipe; m?: Mesh }[] = [];
  private skin: number;
  private belt: number;
  /** How stout he is, 1 for a middling 150 kg or so. */
  f = 1;
  private jig = 0;
  private jv = 0;

  constructor(belt: number, skin = SKIN) {
    super();
    this.skin = skin; this.belt = belt;
    this.body = bone(this, 0, 0, 0);
    this.hips = bone(this.body, 0, THIGH + SHIN + ANKLE, 0);
    for (const s of [1, -1]) {
      const hip = bone(this.hips, 0.19 * s, 0, 0), knee = bone(hip, 0, -THIGH, 0), foot = bone(knee, 0, -SHIN, 0);
      this.part(hip, (b, sk, _, f) => b.add(ROUND, sk, 0, -0.12, 0, null, [0.19 * f, 0.2, 0.2 * f]));
      this.part(knee, (b, sk) => b.add(ROUND, sk, 0, -0.11, 0, null, [0.14, 0.16, 0.15]));
      this.part(foot, (b, sk) => b.add(ROUND, sk, 0, -0.035, 0.05, null, [0.1, 0.045, 0.15]));
      this.legs.push({ s, hip, knee, foot });
    }
    // the belt: wound tight round the hips under the belly, the flap down the front, the knot behind
    this.part(this.hips, (b, _, bl, f) => {
      b.add(ROUND, bl, 0, -0.01, 0, null, [0.39 * f, 0.15, 0.35 * f]);
      b.add(K.post, bl, 0, -0.01, 0, null, [0.385 * f, 0.24, 0.345 * f]);
      b.add(K.post, shade(bl, 0.8), 0, 0.1, 0, null, [0.39 * f, 0.03, 0.35 * f]);
      b.add(K.post, bl, 0, -0.12, 0.3 * f - 0.04, null, [0.1, 0.2, 0.06]);
      b.add(K.post, bl, 0, 0.05, -0.34 * f, null, [0.12, 0.17, 0.05]);
      b.add(K.post, bl, 0, -0.12, -0.3 * f, null, [0.08, 0.2, 0.04]);
    });
    this.fringe = bone(this.hips, 0, -0.07, 0.36);
    this.part(this.fringe, (b, _, bl) => { for (let i = 0; i < 7; i++) b.add(K.post, shade(bl, 0.9), (i - 3) * 0.045, -0.135, 0, null, [0.012, 0.27, 0.012]); });
    this.spine = bone(this.hips, 0, 0.07, 0);
    this.bellyAt = bone(this.spine, 0, 0.23, 0.1);
    this.part(this.bellyAt, (b, sk, _, f) => b.add(ROUND, sk, 0, 0, 0, null, [0.42 * f, 0.31, 0.38 * f]));
    this.part(this.spine, (b, sk, _, f) => {
      b.add(ROUND, sk, 0, 0.5, 0, null, [0.44 * f, 0.3, 0.36 * f]);
      for (const s of [-1, 1]) b.add(ROUND, sk, s * 0.17, 0.5, 0.2, null, [0.16, 0.12, 0.12]);
    });
    this.neck = bone(this.spine, 0, 0.74, 0.03);
    this.part(this.neck, (b, sk) => {
      b.add(ROUND, sk, 0, 0.13, 0, null, [0.21, 0.205, 0.2]);
      b.add(ROUND, HAIR, 0, 0.18, -0.035, null, [0.212, 0.18, 0.19]);
      for (const s of [-1, 1]) {
        b.add(K.dot, 0x1B2733, s * 0.07, 0.14, 0.185, null, [0.026, 0.03, 0.02]);
        b.add(K.post, HAIR, s * 0.075, 0.195, 0.18, [0, 0, s * -0.25], [0.04, 0.022, 0.02]);
        b.add(K.dot, 0xF09A86, s * 0.13, 0.08, 0.14, null, [0.04, 0.028, 0.02]);
      }
      b.add(K.post, 0x7A2E26, 0, 0.055, 0.19, null, [0.03, 0.014, 0.01]);
      // the topknot: a ginkgo leaf folded forward over the crown, and its white tie
      b.add(K.post, HAIR, 0, 0.345, -0.02, null, [0.028, 0.05, 0.04]);
      b.add(ROUND, HAIR, 0, 0.36, 0.07, null, [0.11, 0.028, 0.075]);
      b.add(K.post, 0xF2EEE6, 0, 0.35, 0.015, null, [0.03, 0.03, 0.007]);
    });
    for (const s of [1, -1]) {
      const sh = bone(this.spine, 0.44 * s, 0.56, 0), el = bone(sh, 0, -0.27, 0), hand = bone(el, 0, -0.25, 0.01);
      this.part(sh, (b, sk) => b.add(ROUND, sk, 0, -0.12, 0, null, [0.125, 0.18, 0.125]));
      this.part(el, (b, sk) => {
        b.add(ROUND, sk, 0, -0.11, 0, null, [0.095, 0.14, 0.095]);
        b.add(ROUND, sk, 0, -0.25, 0.01, null, [0.08, 0.075, 0.07]);
      });
      this.arms.push({ s, sh, el, hand });
    }
    this.scale.setScalar(1.05);
    this.setWeight(150);
    this.apply(P0, 0);
  }
  private part(at: Group, make: Recipe) { this.parts.push({ at, make }); }
  /** Bakes every bone's meshes afresh, in his skin and belt, at his weight. */
  private bakeAll() {
    quietly(() => {
      for (const p of this.parts) {
        if (p.m) { p.at.remove(p.m); p.m.geometry.dispose(); }
        const b = new Build();
        p.make(b, this.skin, this.belt, this.f);
        p.m = add(p.at, b.mesh(true));
      }
    });
  }
  /** Fills him out for his weight, from a stocky 110 kg to a vast 200. */
  setWeight(kg: number) {
    const f = 0.9 + (kg - 110) / 140;
    if (Math.abs(f - this.f) < 1e-6 && this.parts[0].m) return;
    this.f = f;
    this.legs.forEach(L => { L.hip.position.x = L.s * 0.19 * f; });
    this.arms.forEach(A => { A.sh.position.x = A.s * (0.32 + 0.12 * f); });
    this.fringe.position.z = 0.35 * f + 0.01;
    this.bellyAt.position.z = 0.05 + 0.05 * f;
    this.bakeAll();
  }
  /** Dresses him in another skin and belt (a local, or a boss). */
  dress(belt: number, skin = SKIN) {
    if (belt === this.belt && skin === this.skin) return;
    this.belt = belt; this.skin = skin;
    this.bakeAll();
  }
  /** A knock: sets his belly wobbling, `v` hard. */
  kick(v: number) { this.jv += v; }
  /** Stands him in pose `p`, his feet on the ground (wherever his root is), and wobbles his belly on by `dt`. */
  apply(p: Pose, dt: number) {
    // the pelvis takes part of the bend, lean and turn, and the belt with it; the legs are set against it
    const tilt = Math.max(-0.3, Math.min(0.42, p.bend * 0.35)), lean = p.side * 0.4, turn = p.twist * 0.4;
    let drop = 0;
    this.legs.forEach((L, i) => {
      const x = i ? p.l1x : p.l0x, z = i ? p.l1z : p.l0z, k = i ? p.l1k : p.l0k;
      L.hip.rotation.set(-x - tilt, -turn, L.s * z - lean);
      L.knee.rotation.x = k;
      L.foot.rotation.set(x - k, 0, -L.s * z * 0.85);
      drop = Math.max(drop, (THIGH * Math.cos(x) + SHIN * Math.cos(x - k)) * Math.cos(z) + ANKLE);
    });
    this.hips.position.y = drop + (0.21 - drop) * p.seat;
    this.hips.rotation.set(tilt, turn, lean);
    this.spine.rotation.set(p.bend - tilt, p.twist - turn, p.side - lean);
    this.neck.rotation.x = p.head;
    this.arms.forEach((A, i) => {
      A.sh.rotation.set(-(i ? p.a1x : p.a0x), 0, A.s * (0.2 + (i ? p.a1z : p.a0z)));
      A.el.rotation.x = -(i ? p.a1e : p.a0e);
    });
    const wide = 1 + (1 - p.sq) * 0.6;
    this.body.scale.set(wide, p.sq, wide);
    this.body.rotation.set(p.pitch, 0, p.roll);
    this.body.position.y = p.up;
    // the belly: a spring, set off by every knock
    this.jv += (-this.jig * 260 - this.jv * 10) * dt; this.jig += this.jv * dt;
    this.bellyAt.scale.set(1 - this.jig * 0.45, 1 + this.jig, 1);
    // the fringe hangs plumb, swinging a little with the belly
    this.fringe.rotation.set(Math.max(-1.2, Math.min(1.2, -(tilt + p.pitch))) + this.jig * 1.5, 0, -lean - p.roll * 0.8);
  }
}
