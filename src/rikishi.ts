// The wrestlers (stage 3): the player's champion, who fights every bout; his sparring partner, who slaps the teppo post
// in the corner; the nameless locals he takes on between boss nights; and the bosses, each a sea creature built on the
// same body (creatures.ts).
// Each is built on joints, so he can stamp, squat, crouch, grip, slap and fall: hips that tilt (the belt on them, so it
// follows the body), a spine that bends, a neck, and legs and arms that bend at the knee and the elbow. Every bone is
// one mesh, its shapes baked together (kit.ts), and rebaked when he's dressed as someone else. He's posed with a Pose
// (dohyo.ts): a set of joint angles, mixed one into another as he moves.
import { Group, type Mesh, type Object3D, SphereGeometry } from 'three';
import { type Beast, BEASTS, type Kit, type Look } from './creatures';
import { isHigh, onQuality } from './graphics';
import { Build, dice, K, quietly, shade } from './kit';

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
export const THIGH = 0.26, SHIN = 0.24, ANKLE = 0.07;
const ROUND = quietly(() => new SphereGeometry(1, 16, 12));
const add = <T extends Object3D>(p: Object3D, o: T) => { p.add(o); return o; };
/** The dice High's finer things are made on: their own, so the scenery's are drawn as they always were. */
const fineDice = dice(0xF1E5);
const bone = (p: Object3D, x: number, y: number, z: number) => { const g = add(p, new Group()); g.position.set(x, y, z); return g; };
/** A baked part: the bone it's on, how it's made, and the mesh made. */
interface Part { at: Object3D; make: (b: Build) => void; m?: Mesh }
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
  /** The belly, which wobbles on a spring (and a puffer swells), and the chest over it. */
  readonly bellyAt: Group;
  readonly chestAt: Group;
  private parts: { at: Group; make: Recipe; m?: Mesh }[] = [];
  /** High's finer things (graphics.ts), each bone's in a mesh of its own: shown on High only. */
  private fines: { at: Group; make: Recipe; m?: Mesh }[] = [];
  private skin: number;
  private belt: number;
  /** How he looks: his skin and belt, and the creature he is, if he's a boss. */
  private look: Look;
  /** The creature's own bones and parts (gone when he changes), and what moves them. */
  private bones: Group[] = [];
  private extra: Part[] = [];
  private beast: Beast | null = null;
  private clock = 0;
  /** A creature's temper, from 0 to 1 (dohyo.ts): how blown up the puffer is, and wants to be, and how wild he is (in
   *  the fight). */
  puff = 0;
  puffTo = 0;
  agitate = 0;
  /** How stout he is, 1 for a middling 150 kg or so. */
  f = 1;
  private jig = 0;
  private jv = 0;

  constructor(belt: number, skin = SKIN) {
    super();
    this.skin = skin; this.belt = belt; this.look = { skin, belt };
    this.body = bone(this, 0, 0, 0);
    this.hips = bone(this.body, 0, THIGH + SHIN + ANKLE, 0);
    for (const s of [1, -1]) {
      const hip = bone(this.hips, 0.19 * s, 0, 0), knee = bone(hip, 0, -THIGH, 0), foot = bone(knee, 0, -SHIN, 0);
      // the thigh, and the belt round the top of it, so the belt goes with the leg
      this.part(hip, (b, sk, bl, f) => {
        b.add(ROUND, sk, 0, -0.12, 0, null, [0.19 * f, 0.2, 0.2 * f]);
        b.add(ROUND, bl, 0, -0.05, 0, null, [0.205 * f, 0.12, 0.215 * f]);
      });
      this.part(knee, (b, sk) => b.add(ROUND, sk, 0, -0.11, 0, null, [0.14, 0.16, 0.15]));
      this.part(foot, (b, sk) => b.add(ROUND, sk, 0, -0.035, 0.05, null, [0.1, 0.045, 0.15]));
      this.legs.push({ s, hip, knee, foot });
    }
    // the belt: wound tight round the hips and his backside, under the belly; the flap down the front, the knot
    // and the strip flat behind
    this.part(this.hips, (b, sk, bl, f) => {
      const h = 0.19 + 0.06 * (f - 1);
      for (const s of [-1, 1]) b.add(ROUND, sk, s * 0.12 * f, -0.09, -0.13 * f, null, [0.2 * f, 0.2, 0.17 * f]);
      b.add(ROUND, bl, 0, -0.01, 0, null, [0.42 * f, h, 0.34 * f]);
      b.add(K.post, bl, 0, -0.01, 0, null, [0.4 * f, h + 0.01, 0.32 * f]);
      b.add(K.post, shade(bl, 0.8), 0, 0.1, 0, null, [0.405 * f, 0.03, 0.325 * f]);
      b.add(ROUND, bl, 0, -0.13, 0.33 * f - 0.02, null, [0.12, 0.16, 0.06]);
      b.add(ROUND, bl, 0, 0.05, -0.32 * f, null, [0.13, 0.1, 0.06]);
      b.add(ROUND, bl, 0, -0.13, -0.31 * f, null, [0.085, 0.2, 0.05]);
    });
    this.fringe = bone(this.hips, 0, -0.07, 0.36);
    this.part(this.fringe, (b, _, bl) => { for (let i = 0; i < 7; i++) b.add(K.post, shade(bl, 0.9), (i - 3) * 0.045, -0.135, 0, null, [0.012, 0.27, 0.012]); });
    this.spine = bone(this.hips, 0, 0.07, 0);
    this.bellyAt = bone(this.spine, 0, 0.23, 0.1);
    this.part(this.bellyAt, (b, sk, _, f) => b.add(ROUND, this.look.under ?? sk, 0, 0, 0, null, [0.42 * f, 0.31, 0.38 * f]));
    this.chestAt = bone(this.spine, 0, 0.5, 0);
    const chest = (sk: number) => (this.look.kind === 'crab' || this.look.kind === 'puffer' || this.look.kind === 'shark' ? this.look.under! : sk);
    this.part(this.chestAt, (b, sk, _, f) => b.add(ROUND, chest(sk), 0, 0, 0, null, [0.44 * f, 0.3, 0.36 * f]));
    this.part(this.spine, (b, sk) => { for (const s of [-1, 1]) b.add(ROUND, chest(sk), s * 0.17, 0.5, 0.2, null, [0.16, 0.12, 0.12]); });
    this.neck = bone(this.spine, 0, 0.74, 0.03);
    this.part(this.neck, (b, sk) => {
      if (this.look.kind) return; // a creature brings his own head
      // (the champion, in the player's colour, is his own man: strong, level brows and an easy smile, where a
      // local looks worried; and his topknot tied in orange)
      const champ = this.belt === CHAMP_BELT;
      b.add(ROUND, sk, 0, 0.13, 0, null, [0.21, 0.205, 0.2]);
      b.add(ROUND, HAIR, 0, 0.18, -0.035, null, [0.212, 0.18, 0.19]);
      for (const s of [-1, 1]) {
        b.add(K.dot, 0x1B2733, s * 0.07, 0.14, 0.185, null, [0.026, 0.03, 0.02]);
        if (champ) b.add(K.post, HAIR, s * 0.074, 0.193, 0.181, [0, 0, s * 0.1 + Math.PI / 2], [0.021, 0.055, 0.02]);
        else b.add(K.post, HAIR, s * 0.075, 0.195, 0.18, [0, 0, s * -0.25], [0.04, 0.022, 0.02]);
        b.add(K.dot, champ ? 0xEDAE98 : 0xF09A86, s * 0.13, 0.08, 0.14, null, champ ? [0.034, 0.022, 0.02] : [0.04, 0.028, 0.02]);
      }
      if (champ) {
        // (an easy smile: a wide, shallow curve, drawn in short strokes laid along it on the face)
        for (let i = -2; i <= 2; i++) {
          const a = i * 0.11, x = 0.17 * Math.sin(a), y = 0.23 - 0.17 * Math.cos(a);
          const z = 0.2 * Math.sqrt(Math.max(0, 1 - (x / 0.21) ** 2 - ((y - 0.13) / 0.205) ** 2)) + 0.001;
          b.add(K.post, 0x7A2E26, x, y, z, [0, -x * 2, a + Math.PI / 2], [0.0085, 0.021, 0.006]);
        }
      } else b.add(K.post, 0x7A2E26, 0, 0.055, 0.19, null, [0.03, 0.014, 0.01]);
      // the topknot: a ginkgo leaf folded forward over the crown, and its white tie
      b.add(K.post, HAIR, 0, 0.345, -0.02, null, [0.028, 0.05, 0.04]);
      b.add(ROUND, HAIR, 0, 0.36, 0.07, null, [0.11, 0.028, 0.075]);
      b.add(K.post, champ ? CHAMP_BELT : 0xF2EEE6, 0, 0.35, 0.015, null, [0.03, 0.03, 0.007]);
    });
    for (const s of [1, -1]) {
      const sh = bone(this.spine, 0.44 * s, 0.56, 0), el = bone(sh, 0, -0.27, 0), hand = bone(el, 0, -0.25, 0.01);
      this.part(sh, (b, sk) => b.add(ROUND, sk, 0, -0.12, 0, null, [0.125, 0.18, 0.125]));
      this.part(el, (b, sk) => {
        b.add(ROUND, sk, 0, -0.11, 0, null, [0.095, 0.14, 0.095]);
        if (this.hands) b.add(ROUND, sk, 0, -0.25, 0.01, null, [0.08, 0.075, 0.07]);
      });
      this.arms.push({ s, sh, el, hand });
    }
    this.finer();
    onQuality(() => { for (const p of this.fines) if (p.m) p.m.visible = isHigh(); });
    this.scale.setScalar(1.05);
    this.setWeight(150);
    this.apply(P0, 0);
  }
  private part(at: Group, make: Recipe) { this.parts.push({ at, make }); }
  private fine(at: Group, make: Recipe) { this.fines.push({ at, make }); }
  /** High's finer things on a man: ears, a nose and a glint in each eye, a navel, a thumb on each hand, toes, and a
   *  darker cord round his belt (a creature has his own head, hands and feet, and only the cord). */
  private finer() {
    const man = () => !this.look.kind;
    this.fine(this.neck, (b, sk) => {
      if (!man()) return;
      for (const s of [-1, 1]) {
        b.add(K.ball, sk, s * 0.205, 0.13, -0.005, null, [0.035, 0.05, 0.03]);
        b.add(K.dot, 0xFFFFFF, s * 0.07 + 0.009, 0.151, 0.2, null, 0.006);
      }
      b.add(K.ball, shade(sk, 0.94), 0, 0.105, 0.2, null, [0.032, 0.028, 0.03]);
    });
    this.fine(this.bellyAt, (b, sk, _, f) => { b.add(K.dot, shade(this.look.under ?? sk, 0.72), 0, -0.04, 0.375 * f, null, [0.018, 0.024, 0.01]); });
    this.fine(this.hips, (b, _, bl, f) => { b.add(K.post, shade(bl, 0.7), 0, -0.06, 0, null, [0.41 * f, 0.016, 0.33 * f]); });
    for (const L of this.legs) this.fine(L.foot, (b, sk) => {
      if (!man()) return;
      for (let i = 0; i < 4; i++) b.add(K.dot, shade(sk, 0.97), (i - 1.5) * 0.04 * L.s, -0.055, 0.185 - Math.abs(i - 1.5) * 0.01, null, [0.022, 0.02, 0.026]);
    });
    for (const A of this.arms) this.fine(A.el, (b, sk) => { if (this.hands) b.add(K.ball, sk, -A.s * 0.045, -0.23, 0.06, null, [0.03, 0.04, 0.03]); });
  }
  /** Whether he has hands (an octopus has tentacles, a crab claws). */
  private hands = true;
  /** Bakes every bone's meshes afresh, in his skin and belt, at his weight, and builds the creature he is on them. */
  private bakeAll() {
    quietly(() => {
      // the last creature's bones and parts go, and he stands as a man again
      for (const g of this.bones) g.removeFromParent();
      for (const p of this.extra) { p.at.remove(p.m!); p.m!.geometry.dispose(); }
      this.bones = []; this.extra = []; this.beast = null; this.hands = true;
      this.neck.position.set(0, 0.74, 0.03); this.chestAt.scale.set(1, 1, 1);
      this.arms.forEach(A => { A.sh.position.x = A.s * (0.32 + 0.12 * this.f); });
      const kind = this.look.kind;
      if (kind) {
        const kit: Kit = {
          r: this,
          bone: (p, x, y, z, rot, scale) => {
            const g = bone(p, x, y, z);
            if (rot) g.rotation.set(...rot);
            if (scale) g.scale.setScalar(scale);
            this.bones.push(g); return g;
          },
          part: (at, make) => { const b = new Build(); make(b); this.extra.push({ at, make, m: add(at, b.mesh(true)) }); },
        };
        this.beast = BEASTS[kind](kit, this.look);
        this.hands = this.beast.hands;
      }
      for (const p of this.parts) {
        if (p.m) { p.at.remove(p.m); p.m.geometry.dispose(); p.m = undefined; }
        const b = new Build();
        p.make(b, this.skin, this.belt, this.f);
        if (!b.empty) p.m = add(p.at, b.mesh(true));
      }
    });
    // (High's finer things: small, so they cast no shadow)
    quietly(() => {
      for (const p of this.fines) {
        if (p.m) { p.at.remove(p.m); p.m.geometry.dispose(); p.m = undefined; }
        const b = new Build();
        p.make(b, this.skin, this.belt, this.f);
        if (!b.empty) { p.m = add(p.at, b.mesh(false)); p.m.visible = isHigh(); }
      }
    }, fineDice);
  }
  /** The creature he is, if he's a boss. */
  get kind() { return this.look.kind; }
  /** How wide he is, against a middling wrestler: his weight, and a puffer blown up. */
  get girth() { return this.f * (1 + 0.32 * this.puff); }
  /** Fills him out for his weight, from a stocky 110 kg to a vast 200. */
  setWeight(kg: number) {
    const f = 0.9 + (kg - 110) / 140;
    if (Math.abs(f - this.f) < 1e-6 && this.parts[0].m) return;
    this.weigh(f);
    this.bakeAll();
  }
  private weigh(f: number) {
    this.f = f;
    this.legs.forEach(L => { L.hip.position.x = L.s * 0.19 * f; });
    this.fringe.position.z = 0.35 * f + 0.01;
    this.bellyAt.position.z = 0.05 + 0.05 * f;
  }
  /** Dresses him in another skin and belt (a local). */
  dress(belt: number, skin = SKIN) { this.dressAs({ skin, belt }); }
  /** Dresses him as `look`, a local or a boss's creature, at `kg` if it's given. */
  dressAs(look: Look, kg?: number) {
    const f = kg === undefined ? this.f : 0.9 + (kg - 110) / 140;
    if (look.kind === this.look.kind && look.skin === this.skin && look.belt === this.belt && Math.abs(f - this.f) < 1e-6) return;
    this.look = look; this.skin = look.skin; this.belt = look.belt; this.puff = this.puffTo = 0;
    if (kg !== undefined) this.weigh(f);
    this.bakeAll();
  }
  /** A knock: sets his belly wobbling, `v` hard. */
  kick(v: number) { this.jv += v; }
  /** Stands him in pose `p`, his feet on the ground (wherever his root is), and wobbles his belly on by `dt`. */
  apply(p: Pose, dt: number) {
    // the pelvis takes part of the bend, lean and turn, and the belt with it; the legs are set against it
    const tilt = Math.max(-0.3, Math.min(0.55, p.bend * 0.5)), lean = p.side * 0.4, turn = p.twist * 0.4;
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
      A.sh.scale.set(1, 1, 1);
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
    // and the creature's own parts: tentacles, whiskers, claws, tails, a puffer's swelling
    this.clock += dt;
    if (this.beast) this.beast.anim?.(this.clock, dt, p);
    else this.idle(this.clock);
  }
  /** A man's own life, as a creature's soft parts move: he breathes, chest and belly rising, his head turns slowly as
   *  he looks about, and his arms sway with his breath. */
  private idle(t: number) {
    const b = Math.sin(t * 1.7);
    this.chestAt.scale.set(1 + 0.012 * b, 1 + 0.035 * b, 1 + 0.025 * b);
    this.bellyAt.scale.z *= 1 + 0.025 * b;
    this.neck.position.y = 0.74 + 0.012 * b;
    this.neck.rotation.y = 0.28 * Math.sin(t * 0.45) * Math.sin(t * 0.13 + 1);
    this.arms.forEach(A => { A.sh.rotation.z += A.s * 0.035 * b; });
  }
}
