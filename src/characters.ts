import {
  type Bone, Box3, BoxGeometry, BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DetachedBindMode, Group, Matrix3, Matrix4, Mesh,
  MeshDepthMaterial, MeshLambertMaterial, Object3D, Skeleton, SkinnedMesh, Sphere, SphereGeometry, TorusGeometry, Vector3, type Vector4,
} from 'three';
import { highBuilt, isHigh, onQuality } from './graphics';
import { pack, type Piece as KitPiece } from './kit';
import { detailMarked, sledParts, sledQuietly } from './propsMachines';
import { G, mat, mesh, painted, scene } from './render';
import { current, onSeason, type Season } from './season';
import type { XZ } from './util';
import { KNITS, plain, rng, type Style } from './wardrobe';

export const PARKAS = [0xF2B33D, 0x7A6FF0, 0x3FA37C, 0xE85D75, 0x5B8DEF, 0xF08A4B, 0x9B5DE5, 0x2EC4B6];
/** Suit colours for the sushi bar's well-dressed diners (the women wear DRESSES, wardrobe.ts). */
export const SUITS = [0x22303C, 0x3B3F6B, 0x5A2E3A, 0x2F4A44, 0x4A4F57];

/** Everyday clothes (a parka in winter), a diner's evening clothes, a sushi chef's whites, a farmer's straw hat, or a server's indigo. */
export type Look = 'parka' | 'fancy' | 'chef' | 'farmer' | 'waiter' | 'yakuza' | 'hooligan';

// ---------- seasonal clothes ----------
const ALL: Season[] = ['winter', 'spring', 'summer', 'fall'];
let dressed = 0;
const hairGeo = new SphereGeometry(0.216, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.46);
const capGeo = new SphereGeometry(0.217, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.4);
const beanieGeo = new SphereGeometry(0.222, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.44);
const cuffGeo = new TorusGeometry(0.205, 0.04, 6, 18);
const brimGeo = new BoxGeometry(0.2, 0.016, 0.11);
const lensGeo = new BoxGeometry(0.085, 0.05, 0.02);
const scarfGeo = new TorusGeometry(0.19, 0.065, 6, 14);
// Low graphics (graphics.ts): bare forearms and shins in summer, as blocks over the arm and leg.
const forearmBoxGeo = new BoxGeometry(0.106, 0.17, 0.126);
const shinBoxGeo = new BoxGeometry(0.136, 0.125, 0.156);
const headbandGeo = new TorusGeometry(0.195, 0.022, 6, 18);
// The crowd's hair, hats and the like (wardrobe.ts). The head is a 0.2 sphere at (0, 1.03, 0.05); +z is the face.
const curlsGeo = new SphereGeometry(0.245, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
const bobGeo = new SphereGeometry(0.226, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.62);
/** Bald on top: hair round the sides and back. */
const fringeGeo = new SphereGeometry(0.212, 14, 6, Math.PI / 2 + 1, Math.PI * 2 - 2, Math.PI * 0.42, Math.PI * 0.18);
const beardGeo = new SphereGeometry(0.209, 14, 8, Math.PI / 2 - 1.3, 2.6, Math.PI * 0.52, Math.PI * 0.32);
const rimGeo = new TorusGeometry(0.036, 0.008, 4, 12);
/** A hairband over the top of the head, ear to ear. */
const aliceGeo = new TorusGeometry(0.224, 0.018, 6, 16, Math.PI);
const domeGeo = new SphereGeometry(0.2, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
const skirtGeo = new CylinderGeometry(0.29, 0.37, 0.28, 14);
const pearlsGeo = new TorusGeometry(0.2, 0.02, 6, 20);
/** A trapper hat's turned-up fur. */
const furGeo = new TorusGeometry(0.212, 0.05, 6, 18);
// The face (wardrobe.ts Eyes and Mouth), sized by each piece's scale: an arch (∩, turned over for a smile), and the
// bottom half of a disc for an open mouth.
const INK = 0x1B2733, INSIDE = 0x5A1E24;
const archGeo = new TorusGeometry(1, 0.3, 4, 12, Math.PI);
const halfDiscGeo = new CylinderGeometry(1, 1, 1, 14, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2);

// ---------- the body ----------
// Low poly, but rounded: eight-sided arms and legs that taper, with hands and shoes at their ends, round shoulders,
// ears and a nose. An arm hangs 0.33 from the shoulder and a leg 0.3 from the hip, down to the ground.
// Their ends are always covered (by a hand, a shoe, the shoulder or the body), so the tubes are open: a person is
// about twice the vertices they were, not three times.
const tube = (top: number, bottom: number, h: number) => new CylinderGeometry(top, bottom, h, 8, 1, true);
const sleeveGeo = tube(0.06, 0.052, 0.3);
const shortSleeveGeo = tube(0.068, 0.064, 0.12);
const bareArmGeo = tube(0.043, 0.039, 0.27);
const trouserGeo = tube(0.066, 0.057, 0.27);
/** Bare shins in summer, over the trouser leg: shorts. */
const shinGeo = tube(0.062, 0.057, 0.13);
/** A ball for hands and the tops of the arms, sized by scale. */
const ballGeo = new SphereGeometry(1, 7, 5);
/** A smaller ball, in less detail, for the little things: ears, a nose, glints, freckles, buttons. */
const dotGeo = new SphereGeometry(1, 6, 4);
/** A shoe: half a ball, flat on the ground, longer than it's wide. */
const shoeGeo = new SphereGeometry(1, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2);
const bootGeo = tube(0.068, 0.064, 0.11);
const bootCuffGeo = new TorusGeometry(0.068, 0.02, 5, 10);
/** The top of the body, rounded over into the shoulders. */
const shoulderGeo = new SphereGeometry(0.22, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2);
/** Rings round the body (its hem, a sash): the same ten sides as the body, so they sit flat on it. */
const ringGeo = new CylinderGeometry(1, 1, 1, 10, 1, true);
/** The body tapers in from 0.3 across at the hem (0.3 up) to 0.22 at the shoulders (0.9 up); this leans its front back. */
const SLOPE = Math.atan2(0.08, 0.6);
const DENIM = 0x3D5A80;
/** How far forward the body's front is at height `y`, `x` across from the middle: on its ten flat sides, not a circle. */
function bodyZ(x: number, y: number, slim = 1) {
  const r = (0.3 - (y - 0.3) * 0.08 / 0.6) * slim, seg = Math.PI / 5;
  const a = Math.asin(Math.max(-1, Math.min(1, x / r)));
  const off = ((a % seg) + seg) % seg - seg / 2;
  return r * Math.cos(seg / 2) / Math.cos(off) * Math.cos(a);
}
/** `c` darker (k under 1) or lighter, for seams, hems and shadows in the cloth. */
export function shade(c: number, k: number) {
  const ch = (s: number) => Math.min(255, Math.round(((c >> s) & 255) * k));
  return ch(16) << 16 | ch(8) << 8 | ch(0);
}
/** `c` mixed `k` of the way toward `to`. */
function mix(c: number, to: number, k: number) {
  const ch = (s: number) => Math.round(((c >> s) & 255) * (1 - k) + ((to >> s) & 255) * k);
  return ch(16) << 16 | ch(8) << 8 | ch(0);
}
const NOT_SUMMER: Season[] = ['winter', 'spring', 'fall'];
/** The shapes of arms and legs, to tell what someone's wearing on them. */
export const LIMBS = {
  sleeve: sleeveGeo, shortSleeve: shortSleeveGeo, bareArm: bareArmGeo, trouser: trouserGeo, shin: shinGeo,
  hand: ballGeo, shoe: shoeGeo, boot: bootGeo,
};

/** One piece of a person: a shape in one colour, posed by `o` (where it goes, its turn and size, whether it casts a shadow). */
export interface Piece {
  geo: BufferGeometry;
  c: number;
  o: Object3D;
  /** Clothes, hair and the like: worn in these seasons only, and not under a disguise. */
  seasons?: Season[];
  /** What it hangs from (`o` places it there): the body, an arm or a leg, the toque's band or puff, or a headband. */
  bone: number;
}
/** What a person's pieces hang from (Piece.bone): the body, the arms (1 and 2) and legs (3 and 4), and a chef's toque
 *  (its band and its puff) and a headband, once they're worn. */
const BODY = 0, TOQUE = 5, PUFF = 6, TIED = 7, BONES = 8;
const isLimb = (b: number) => b >= 1 && b <= 4;
/** What of someone drawn as one is too slight to cast a shadow on Low in the cellar (cellar.ts sweepShadows): their
 *  arms, legs and toque's band, each once a mesh of its own, under half a metre. */
const slight = (b: number) => isLimb(b) || b === TOQUE;
/** Whether a piece casts a shadow: an arm's or leg's all do (each was one mesh, cast whole), the rest as they're made. */
const casts = (p: Piece) => isLimb(p.bone) || p.o.castShadow;

// three.js names everything it makes (a group, a mesh, a geometry) with Math.random, which is the game's luck: the
// orders, the fish, the customers. Dressing someone makes dozens of things, so it borrows the looks' own dice for
// that instead, and how people look never changes how the game plays out.
const dice = rng(0x5EED);
/** Puts the looks' dice in Math.random's place; returns the game's luck, to put back. */
function lend() { const luck = Math.random; Math.random = dice; return luck; }
function quietly<T>(f: () => T): T {
  const luck = lend();
  try { return f(); } finally { Math.random = luck; }
}

// People are drawn baked. Someone who moves is one mesh (Jointed, below): everything they wear, its arms, legs, toque
// and headband moved on the graphics chip as they swing, so a person costs a draw call and one for their shadow. Someone
// who stands still for good (standStill) is the body in two meshes (what casts a shadow, and what doesn't: the head,
// eyes and hood never have) and each arm and leg in one, which the batcher merges with the scenery round them. Vertex
// colours shade exactly like the per-colour materials (render.ts painted). The bakes are shared by everyone wearing
// the same thing, and kept: the crowd's mixes are many, but each is small.
const bakes = new Map<string, BufferGeometry>();
const NOTHING = new BufferGeometry();
/** `pieces` in one geometry; `skin`, each with what it hangs from (and kept in that one's own space); `lift` puts a
 *  piece on what it hangs from where that stands now (a toque baked into a still person's body). */
function baked(pieces: Piece[], skin = false, lift?: (p: Piece) => Object3D | undefined) {
  if (!pieces.length) return NOTHING;
  const at = pieces.map(p => {
    p.o.updateMatrix();
    const on = lift?.(p);
    if (!on) return p.o.matrix;
    on.updateMatrix();
    return new Matrix4().multiplyMatrices(on.matrix, p.o.matrix);
  });
  const key = (skin ? 'J' : '') + pieces.map((p, i) => `${skin ? `${p.bone},${+p.o.castShadow},` : ''}${p.geo.id},${p.c},${at[i].elements.join()}`).join(';');
  let g = bakes.get(key);
  if (!g) { g = merge(pieces, at, skin); bakes.set(key, g); }
  return g;
}

const v = new Vector3(), nm = new Matrix3(), tint = new Color();
/**
 * Merges pieces into one geometry, each moved into place by `at` and painted its colour, writing straight into the
 * finished arrays: no copies of each piece along the way, so a crowd changing clothes for the season doesn't stall the
 * frame. Packed small for a phone's memory: no texture coordinates (people are painted, never textured), and colours
 * and normals a byte each rather than a float, 18 bytes a vertex instead of 44. With `skin`, each corner also says
 * which bone it hangs from (8 bytes more), and the box round each bone's pieces is kept (`userData.boxes`).
 */
function merge(pieces: Piece[], ats: Matrix4[], skin: boolean) {
  let verts = 0, idx = 0;
  for (const p of pieces) { verts += p.geo.attributes.position.count; idx += p.geo.index!.count; }
  const pos = new Float32Array(verts * 3), nor = new Int8Array(verts * 3), col = new Uint8Array(verts * 3);
  const index = verts > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
  const bone = skin ? new Uint8Array(verts * 4) : null, weight = skin ? new Uint8Array(verts * 4) : null;
  const boxes: (Box3 | undefined)[] = [];
  let at = 0, ia = 0;
  for (const [j, p] of pieces.entries()) {
    const P = p.geo.attributes.position, N = p.geo.attributes.normal, I = p.geo.index!, m = ats[j];
    nm.getNormalMatrix(m);
    const box = skin ? (boxes[p.bone] ??= new Box3()) : null;
    tint.setHex(p.c);
    const r = Math.round(tint.r * 255), gr = Math.round(tint.g * 255), b = Math.round(tint.b * 255);
    for (let i = 0; i < P.count; i++, at++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m);
      pos[at * 3] = v.x; pos[at * 3 + 1] = v.y; pos[at * 3 + 2] = v.z;
      box?.expandByPoint(v);
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
      nor[at * 3] = Math.round(v.x * 127); nor[at * 3 + 1] = Math.round(v.y * 127); nor[at * 3 + 2] = Math.round(v.z * 127);
      col[at * 3] = r; col[at * 3 + 1] = gr; col[at * 3 + 2] = b;
      if (bone) { bone[at * 4] = p.bone; weight![at * 4] = 255; }
    }
    const base = at - P.count;
    for (let k = 0; k < I.count; k++) index[ia++] = I.getX(k) + base;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('normal', new BufferAttribute(nor, 3, true));
  g.setAttribute('color', new BufferAttribute(col, 3, true));
  if (bone) {
    g.setAttribute('skinIndex', new BufferAttribute(bone, 4));
    g.setAttribute('skinWeight', new BufferAttribute(weight!, 4, true));
    g.userData.boxes = boxes;
  }
  g.setIndex(new BufferAttribute(index, 1));
  return g;
}

/** Seconds between sweeps for bakes nobody's wearing. */
const SWEEP = 5;
let sweepT = SWEEP;
/**
 * Every few seconds, lets go of the baked geometry nobody in the scene is wearing any more: customers who've gone
 * home, last season's clothes. Kept, they would pile up for as long as the game is open (about 100 MB in ten busy
 * minutes, enough for a phone to close the page within the hour). Someone off the scene who comes back is fine: the
 * renderer sends their geometry to the GPU again.
 */
export function updBakes(dt: number) {
  if ((sweepT -= dt) > 0) return;
  sweepT = SWEEP;
  const worn = new Set<BufferGeometry>(), here = new Set<Skeleton>();
  scene.traverse(o => {
    if (!(o instanceof Mesh)) return;
    worn.add(o.geometry);
    if (o instanceof Jointed) here.add(o.skeleton);
  });
  for (const [k, g] of bakes) if (!worn.has(g)) { g.dispose(); bakes.delete(k); }
  // (and the graphics chip's copy of where the arms and legs of anyone gone are: sent again if they come back)
  for (const j of drawn) if (!here.has(j)) { j.boneTexture?.dispose(); drawn.delete(j); }
}
/** How many baked shapes are kept now. */
export const bakesKept = () => bakes.size;

/** Those drawn as one (Jointed) since the last sweep, whose bones the graphics chip holds. */
const drawn = new Set<Joints>();
/** The shadow pass's material for everyone drawn as one: their own (made on the looks' dice). */
const depthOfJointed = quietly(() => new MeshDepthMaterial());
const ONE = new Matrix4(), boneAt = new Matrix4();
/**
 * Where a moving person's pieces hang from, for the graphics chip: each bone's own matrix (where it stands on the
 * body, and so in the body's mesh), read as it is each frame they're drawn and sent up only when one's moved (an arm
 * swinging; not breathing, or walking off with them all still). three.js' skeletons work in the world instead, so
 * their bones change whenever anyone moves, and each takes inverting a matrix a frame.
 */
class Joints extends Skeleton {
  constructor(private readonly at: (Object3D | undefined)[]) {
    super(new Array<Bone>(BONES));
    this.computeBoneTexture();
    for (let i = 0; i < BONES; i++) ONE.toArray(this.boneMatrices!, i * 16);
  }
  override update() {
    const m = this.boneMatrices!;
    let moved = false;
    for (let i = 1; i < BONES; i++) {
      const b = this.at[i];
      if (!b) continue;
      const e = b.matrix.elements;
      for (let k = 0, o = i * 16; k < 16; k++, o++) {
        const x = Math.fround(e[k]);
        if (m[o] !== x) { m[o] = x; moved = true; }
      }
    }
    if (moved) this.boneTexture!.needsUpdate = true;
    drawn.add(this);
  }
}
/**
 * A moving person in one mesh (see `baked`): drawn with three.js' skinning, each corner moved by the bone it hangs
 * from. Its shadow is the same mesh, drawn from where the pieces that cast one start: pieces that cast none first, then
 * the arms' and legs', then the body's (and only the body's, `limbShadows` off: the cellar on Low, cellar.ts).
 */
class Jointed extends SkinnedMesh {
  limbShadows = true;
  private readonly box = new Box3();
  constructor(private readonly at: (Object3D | undefined)[]) {
    super(NOTHING, painted);
    this.bindMode = DetachedBindMode;
    this.skeleton = new Joints(at);
    this.castShadow = this.receiveShadow = true;
    // (three.js keys a depth material's shader on whether it draws a skinned mesh, and the shadow pass draws in no
    // order: sharing its own with everything else would have it look the shader up again at every switch)
    this.customDepthMaterial = depthOfJointed;
    // (round all they could reach: their arms up, the tallest toque)
    this.boundingSphere = new Sphere(new Vector3(0, 1, 0), 1.4);
    // placed as anything else is (render.ts place): its bind matrices never change, so it needn't invert one each frame
    this.updateMatrixWorld = Object3D.prototype.updateMatrixWorld;
    this.onBeforeShadow = (_r, _s, _c, _l, g) => { g.setDrawRange(this.limbShadows ? g.userData.casts : g.userData.bodyCasts, Infinity); };
    this.onAfterShadow = (_r, _s, _c, _l, g) => { g.setDrawRange(0, Infinity); };
  }
  /** Where corner `index` is, in the mesh's own space (for a ray, three.js Raycaster). */
  override applyBoneTransform(index: number, target: Vector3): Vector3;
  override applyBoneTransform(index: number, target: Vector4): Vector4;
  override applyBoneTransform(index: number, target: Vector3 | Vector4) {
    const b = this.geometry.attributes.skinIndex.getX(index);
    if (b) (target as Vector3).applyMatrix4(boneAt.fromArray(this.skeleton.boneMatrices!, b * 16));
    return target;
  }
  /** The box round them as they stand: each bone's pieces' box, where that bone is (as their meshes in pieces were). */
  boxWhereStands() {
    const boxes = this.geometry.userData.boxes as (Box3 | undefined)[] | undefined;
    this.box.makeEmpty();
    boxes?.forEach((b, i) => {
      if (!b) return;
      const on = i ? this.at[i] : undefined;
      part.copy(b);
      if (on) part.applyMatrix4(boneAt.compose(on.position, on.quaternion, on.scale));
      this.box.union(part);
    });
    return this.box;
  }
}
const part = new Box3();
// (its box is worked out from where its bones are each time it's asked for: three.js keeps the first it's worked out)
Object.defineProperty(Jointed.prototype, 'boundingBox', { get(this: Jointed) { return this.boxWhereStands(); }, set() {} });

/** A walker with swinging limbs. */
export class Person extends Group {
  /** Everything they're made of, which bobs, leans and breathes as they walk and stand (animPerson). */
  readonly body = new Group();
  readonly legs: Group[] = [];
  readonly arms: Group[] = [];
  phase = 0;
  /** Seconds of breathing, from somewhere different for each of them, so a queue doesn't breathe as one. */
  breath: number;
  /** Stays where they're put for good, and doesn't breathe (standStill). */
  still = false;
  /** How tall a chef's toque is (`toque`). */
  private toqueLevel = 0;
  /** A headband, once one's been tied on: what it hangs from (popped in, looks.ts), and its colour while it's on. */
  band?: Group;
  private bandColor: number | null = null;
  /** The toque's band and puff on High, when it's pleated (pleat()). */
  private pleats?: [BufferGeometry, BufferGeometry];
  /** Things sewn on over their clothes (`sew`). */
  private extras: Mesh[] = [];
  /** Wearing someone else's look (the singer's), over everything seasonal and in place of their own body and head. */
  disguised = false;
  /** Dressed for this season instead of the one it is: the player trying a look on (customize.ts), or all year round
   *  down in the cellar, where the seasons don't reach (belowGround). */
  season: Season | null = null;
  /** Everything on the body, and on each limb (arms, then legs). */
  private pieces: Piece[] = [];
  private limbPieces: Piece[][] = [[], [], [], []];
  /** What their pieces hang from (Piece.bone): the body, the arms, the legs, the toque's band and puff, the headband. */
  private readonly bones: (Object3D | undefined)[] = [];
  /** Everything they wear in one mesh, while they move; */
  private joint!: Jointed;
  /** and while they stand still for good, the body's two meshes and the arms' and legs' (the first thing on each pivot). */
  private shell = mesh(NOTHING, painted, 0, 0, 0, true);
  private trim = mesh(NOTHING, painted);
  private limbs: Mesh[] = [];
  /** Who they are: a mix of a man's or a woman's wardrobe for the crowd, or the plain look everyone else has. */
  style: Style;
  /** The shirt, parka, suit or dress. */
  color: number;
  /** Their place in the order people were dressed, which hands out the plain look's hair and knits. */
  private readonly n: number;
  /** Dressed from a wardrobe (the crowd's, or the player's own): with their hair under a diner's hat. */
  private mixed: boolean;
  /** Drawn in High graphics' detail (graphics.ts), or Low's. */
  private high = true;

  /** `color` is the shirt, parka, suit or dress; `style` mixes a crowd member up (wardrobe.ts crowd()); without one they get the plain look. */
  constructor(color: number, private readonly look: Look = 'parka', style?: Style) {
    // (the fields' meshes are made as super() returns, so the dice go in first)
    const luck = lend();
    super();
    try {
      this.n = dressed++;
      this.userData.noBatch = true; // always on the move (batch.ts)
      this.color = color;
      this.style = style ?? plain(this.n);
      this.mixed = !!style;
      this.breath = this.n * 1.37;
      this.add(this.body);
      for (const s of [-1, 1]) {
        const p = new Group(); p.position.set(s * 0.1, 0.3, 0);
        this.body.add(p); this.legs.push(p);
        const a = new Group(); a.position.set(s * this.armSpread, 0.82, 0.02);
        this.body.add(a); this.arms.push(a);
      }
      for (const l of [...this.arms, ...this.legs]) { const m = mesh(NOTHING, painted, 0, 0, 0, true); l.add(m); this.limbs.push(m); }
      this.bones.push(this.body, ...this.arms, ...this.legs);
      this.bones.length = BONES;
      this.joint = new Jointed(this.bones);
      this.body.add(this.shell, this.trim, this.joint);
      this.dress();
    } finally { Math.random = luck; }
  }

  /**
   * Stays where they're put for good (the casino yacht's staff and guests): without the breathing, which no one sees
   * from the game's camera, they hold still and are drawn merged with the scenery round them (batch.ts), a dozen people
   * in a few draw calls instead of six each and as many again for their shadows. An arm that moves (a lever pulled, a
   * glass raised) drops out of the merge while it does, and back in after.
   */
  standStill() {
    this.still = true;
    delete this.userData.noBatch;
    this.wear();
    return this;
  }

  /** Whether their arms and legs cast a shadow with their body (drawn as one: the cellar on Low has them cast none). */
  get limbShadows() { return this.joint.limbShadows; }
  set limbShadows(on: boolean) { this.joint.limbShadows = on; }

  /** How far out from the middle the arms hang: a woman's a little closer in. */
  get armSpread() { return this.style.woman ? 0.28 : 0.3; }

  /**
   * Dresses them again, in everyday clothes: `style`, with the parka (or shirt) in `color`. The player's own look
   * (customize.ts). Anything else on them (a headband, the singer's look) stays.
   */
  restyle(color: number, style: Style) {
    this.color = color;
    this.style = style;
    this.mixed = true;
    // the singer's look sets the arms itself, and puts them back from armSpread
    if (!this.disguised) this.arms.forEach(a => { a.position.x = Math.sign(a.position.x) * this.armSpread; });
    this.redress();
  }

  /** Dresses them again in what they have on: for the graphics changing, or after restyle(). */
  redress() {
    this.pieces = [];
    this.limbPieces = [[], [], [], []];
    quietly(() => this.dress());
  }

  /** Whether they're drawn in the graphics there are now. */
  get upToDate() { return this.high === isHigh(); }

  /** Puts together everything they wear, in their look and style, and bakes it. */
  private dress() {
    const { look, n, color } = this, st = this.style;
    // women are a little slimmer
    const slim = st.woman ? 0.9 : 1;
    const high = this.high = isHigh();
    const body = this.piece(G.body, color, 0, 0.6, 0, true); body.scale.set(slim, 1, slim);
    body.userData.own = true;
    this.piece(G.head, st.skin, 0, 1.03, 0.05).userData.own = true;
    if (high) {
      this.limbsFor(st, color);
      const shoulders = this.piece(shoulderGeo, color, 0, 0.9, 0, true); shoulders.scale.set(slim, 0.42, slim);
      shoulders.userData.own = true;
      // ears, and a nose a shade darker than the face
      for (const s of [-1, 1]) {
        const ear = this.piece(dotGeo, st.skin, s * 0.197, 1.02, 0.045); ear.scale.set(0.032, 0.048, 0.038);
        ear.userData.own = true;
      }
      const nose = this.piece(dotGeo, shade(st.skin, 0.93), 0, 1.008, 0.247); nose.scale.set(0.03, 0.026, 0.026);
      nose.userData.own = true;
    } else {
      // Low: blocks for arms and legs, in the shirt's colour and the trousers'
      for (const a of this.arms) this.piece(G.arm, color, 0, -0.15, 0, true, a);
      for (const l of this.legs) this.piece(G.leg, look === 'yakuza' ? SUIT_LEGS : st.legs, 0, -0.15, 0, true, l);
    }
    this.face(st);
    if (look === 'fancy') this.dressUp(st, color, this.mixed);
    if (look === 'waiter') this.serverClothes();
    if (look === 'chef') this.chefWhites();
    if (look === 'farmer') { this.piece(G.cone, 0xE3C26B, 0, 1.27, 0.03, true).scale.set(0.36, 0.17, 0.36); if (high) this.overalls(); }
    if (look === 'parka') this.everyday(st, color);
    if (look === 'yakuza') this.yakuza(st);
    if (look === 'hooligan') this.hooligan(st, color);
    if (this.mixed) this.features(st, look === 'parka' && st.summer === 'shades', look === 'yakuza' && st.summer !== 'sunhat');
    // a scarf for the cold, over the suit or the farmer's shirt
    if (look === 'fancy' || look === 'farmer') this.scarf(['winter', 'fall'], look === 'fancy' ? 0xF4EBDD : KNITS[n % KNITS.length]);
    if (this.bandColor !== null) this.tied(this.bandColor);
    for (const m of this.extras) {
      this.pieces.push({ geo: m.geometry, c: (m.material as MeshLambertMaterial).color.getHex(), o: m, bone: BODY });
    }
    this.scale.setScalar(st.height);
    this.wear();
  }

  /**
   * Adds a piece on `on` (the body, an arm or a leg, the toque's band or puff, a headband), worn all the time or in
   * `seasons` only. Returns what poses it, to turn and size it as a mesh would be; wear() bakes it in. `userData.own`
   * on it marks the body and head.
   */
  private piece(geo: BufferGeometry, c: number, x: number, y: number, z: number, cast = false, on: Object3D = this, seasons?: Season[]) {
    const o = new Object3D(); o.position.set(x, y, z); o.castShadow = cast;
    const bone = Math.max(BODY, this.bones.indexOf(on));
    (isLimb(bone) ? this.limbPieces[bone - 1] : this.pieces).push({ geo: coarsening ? coarse(geo) : geo, c, o, seasons, bone });
    return o;
  }

  /** A piece of clothing (which casts a shadow) worn in `seasons` only, on `parent` (the body, an arm or a leg). */
  private part(seasons: Season[], geo: BufferGeometry, c: number, x: number, y: number, z: number, parent: Object3D = this) {
    return this.piece(geo, c, x, y, z, true, parent, seasons);
  }

  /**
   * Hair in the style's cut: what covers the head in the `top` seasons (when no hat or hood hides it), and what hangs
   * down below a hat (long hair, a ponytail) in the `hang` ones.
   */
  private hairdo(st: Style, top: Season[], hang: Season[]) {
    const c = st.hair;
    if (st.cut === 'bald') { this.part(top, fringeGeo, c, 0, 1.03, 0.05); return; }
    if (st.cut === 'curly') { this.part(top, curlsGeo, c, 0, 1.04, 0.04).rotation.x = -0.3; return; }
    if (st.cut === 'bob') { this.part(top, bobGeo, c, 0, 1.03, 0.04).rotation.x = -0.6; return; }
    this.part(top, hairGeo, c, 0, 1.03, 0.05).rotation.x = -0.35;
    if (st.cut === 'quiff') {
      const q = this.part(top, G.sphere, c, 0.03, 1.215, 0.15); q.scale.set(0.12, 0.055, 0.09); q.rotation.z = -0.2;
    }
    if (st.cut === 'bun') this.part(top, G.sphere, c, 0, 1.2, -0.12).scale.setScalar(0.085);
    if (st.cut === 'long') {
      const l = this.part(hang, G.sphere, c, 0, 0.93, -0.09); l.scale.set(0.215, 0.21, 0.12); l.rotation.x = 0.15;
    }
    if (st.cut === 'ponytail') {
      const t = this.part(hang, G.sphere, c, 0, 0.94, -0.2); t.scale.set(0.06, 0.15, 0.06); t.rotation.x = 0.4;
      this.part(hang, G.sphere, c, 0, 1.07, -0.17).scale.setScalar(0.05);
    }
  }

  /**
   * Arms and legs. Sleeves with hands at their ends: in everyday clothes, short sleeves over bare arms in summer and
   * mittens in winter. Trousers with shoes: bare shins under shorts in summer, and snow boots with a fur cuff in winter
   * (farmers wear green wellies all year). What's always on a leg stays on under a disguise, which has its own arms.
   */
  private limbsFor(st: Style, color: number) {
    const everyday = this.look === 'parka', farmer = this.look === 'farmer';
    const shoes = farmer ? 0x3F6B3A : this.look === 'chef' ? 0x2E3338 : this.look === 'waiter' ? 0x1F1F1F : st.shoes;
    const hand = (a: Group, c: number, k: number, seasons?: Season[]) =>
      this.piece(ballGeo, c, 0, -0.315, 0.004, true, a, seasons).scale.set(0.05 * k, 0.056 * k, 0.05 * k);
    for (const a of this.arms) {
      // the top of the arm, rounded into the shoulder
      this.piece(ballGeo, color, 0, -0.005, 0, true, a).scale.set(0.064, 0.06, 0.064);
      if (everyday) {
        this.piece(sleeveGeo, color, 0, -0.14, 0, true, a, NOT_SUMMER);
        this.piece(shortSleeveGeo, color, 0, -0.045, 0, true, a, ['summer']);
        this.piece(bareArmGeo, st.skin, 0, -0.15, 0, true, a, ['summer']);
        hand(a, st.scarfC, 1.18, ['winter']);
        hand(a, st.skin, 1, ['spring', 'summer', 'fall']);
      } else {
        this.piece(sleeveGeo, color, 0, -0.14, 0, true, a);
        hand(a, st.skin, 1);
      }
    }
    for (const l of this.legs) {
      this.piece(trouserGeo, farmer ? DENIM : this.look === 'yakuza' ? SUIT_LEGS : st.legs, 0, -0.135, 0, true, l);
      this.piece(shoeGeo, shoes, 0, -0.3, 0.025, true, l).scale.set(0.068, 0.072, 0.1);
      if (everyday) this.piece(shinGeo, st.skin, 0, -0.19, 0, true, l, ['summer']);
      if (everyday || farmer) {
        const boots = farmer ? undefined : ['winter'] as Season[];
        this.piece(bootGeo, shoes, 0, -0.235, 0.004, true, l, boots);
        if (!farmer) this.piece(bootCuffGeo, st.fur, 0, -0.18, 0.004, true, l, boots).rotation.x = Math.PI / 2;
      }
    }
  }

  /** A farmer's denim overalls: a bib on the front of the shirt, and its straps up over the shoulders. */
  private overalls() {
    const flat = (w: number, h: number, x: number, y: number, c = DENIM) => {
      const o = this.piece(G.box, c, x, y, bodyZ(x, y) + 0.004, true); o.scale.set(w, h, 0.014); o.rotation.x = -SLOPE;
      return o;
    };
    flat(0.22, 0.2, 0, 0.53);
    for (const s of [-1, 1]) { flat(0.04, 0.3, s * 0.075, 0.76); flat(0.028, 0.028, s * 0.075, 0.64, 0xE8C25A); }
  }

  /**
   * Eyes and a mouth in the style's way, worn all year. A disguise has its own face, with the plain dot eyes: they're
   * kept for it (userData.disguise) when the style's eyes aren't dots.
   */
  private face(st: Style) {
    const feature = (geo: BufferGeometry, c: number, x: number, y: number, z: number) => this.piece(geo, c, x, y, z, false, this, ALL);
    const e = st.eyes;
    for (const s of [-1, 1]) {
      const x = s * 0.07, winking = e === 'wink' && s > 0;
      const dot = this.piece(G.eye, INK, x, 1.06, 0.24);
      // a glint of light in each dot (on High), which makes them look back at you
      const glint = this.high ? this.piece(dotGeo, 0xFFFFFF, x + 0.011, 1.071, 0.264) : undefined;
      glint?.scale.setScalar(0.009);
      if (!(e === 'dot' || e === 'lashes' || e === 'angry' || (e === 'wink' && !winking))) {
        dot.userData.disguise = true;
        if (glint) glint.userData.disguise = true;
      }
      if (e === 'round' || e === 'sparkle') {
        feature(G.sphere, 0xFFFFFF, x, 1.06, 0.232).scale.set(0.042, 0.048, 0.022);
        feature(G.sphere, INK, x, 1.055, 0.25).scale.set(0.024, 0.028, 0.012);
        if (e === 'sparkle') feature(G.sphere, 0xFFFFFF, x + 0.009, 1.067, 0.26).scale.setScalar(0.009);
      }
      if (e === 'happy' || winking) feature(archGeo, INK, x, 1.05, 0.243).scale.setScalar(0.026);
      if (e === 'sleepy') {
        feature(G.sphere, 0xFFFFFF, x, 1.052, 0.234).scale.set(0.04, 0.024, 0.02);
        feature(G.sphere, INK, x, 1.05, 0.25).scale.set(0.02, 0.016, 0.01);
        const lid = feature(G.box, INK, x, 1.065, 0.247); lid.scale.set(0.088, 0.013, 0.012); lid.rotation.z = s * -0.12;
      }
      if (e === 'lashes') for (const k of [0, 1]) {
        const l = feature(G.box, INK, x + s * (0.028 + k * 0.01), 1.086 - k * 0.012, 0.236);
        l.scale.set(0.008, 0.026, 0.008); l.rotation.z = s * -(0.5 + k * 0.4);
      }
      if (e === 'angry') {
        const b = feature(G.box, st.hair, x, 1.097, 0.236); b.scale.set(0.075, 0.017, 0.014); b.rotation.set(-0.35, 0, s * 0.4);
      }
    }
    // Rosy cheeks, turned to lie on the face, or a few freckles across each (on High).
    const onFace = (x: number, y: number) => 0.05 + Math.sqrt(0.04 - x * x - (y - 1.03) ** 2);
    for (const s of this.high ? [-1, 1] : []) {
      if (st.cheeks === 'rosy') {
        const c = feature(dotGeo, mix(st.skin, 0xF0707A, 0.45), s * 0.118, 0.99, onFace(0.118, 0.99));
        c.scale.set(0.036, 0.022, 0.012); c.rotation.y = s * 0.64;
      }
      if (st.cheeks === 'freckles') for (const [x, y] of [[0.1, 1.0], [0.125, 0.99], [0.106, 0.977], [0.133, 1.005]]) {
        feature(dotGeo, shade(st.skin, 0.68), s * x, y, onFace(x, y) + 0.002).scale.setScalar(0.0075);
      }
    }
    // The mouth sits low on the face, tipped to follow it; a beard's in front of it, so it comes out over one.
    const m = st.mouth, y = 0.965, z = st.face === 'beard' ? 0.247 : 0.24;
    const mouth = (geo: BufferGeometry, c: number, x: number, dy: number, dz = 0) => {
      const o = feature(geo, c, x, y + dy, z + dz); o.rotation.x = 0.33; return o;
    };
    if (m === 'smile' || m === 'tongue') { const o = mouth(archGeo, INK, 0, 0.02); o.rotation.z = Math.PI; o.scale.set(0.04, 0.03, 0.03); }
    if (m === 'tongue') mouth(G.sphere, 0xE8707A, 0.012, -0.017, -0.004).scale.set(0.017, 0.02, 0.01);
    if (m === 'grin') {
      mouth(halfDiscGeo, INSIDE, 0, 0.012).scale.set(0.048, 0.045, 0.012);
      mouth(G.box, 0xFFFFFF, 0, 0.005, 0.007).scale.set(0.07, 0.012, 0.004);
    }
    if (m === 'o') mouth(G.sphere, INSIDE, 0, 0).scale.set(0.02, 0.026, 0.012);
    if (m === 'flat') mouth(G.box, INK, 0, 0, 0.002).scale.set(0.06, 0.012, 0.01);
    if (m === 'smirk') { const o = mouth(archGeo, INK, 0.02, 0.012); o.rotation.z = Math.PI + 0.35; o.scale.set(0.03, 0.022, 0.03); }
    if (m === 'frown') mouth(archGeo, INK, 0, -0.022).scale.set(0.04, 0.028, 0.03);
  }

  /** The crowd's year-round looks: a moustache, a beard or earrings, and glasses (sunglasses stand in when `shades`,
   *  or are worn instead all year when `dark`). */
  private features(st: Style, shades: boolean, dark = false) {
    const c = st.hair;
    if (st.face === 'mustache' || st.face === 'beard' || st.face === 'goatee') {
      this.part(ALL, G.box, c, 0, 0.985, 0.243).scale.set(0.13, 0.032, 0.035);
    }
    if (st.face === 'beard') this.part(ALL, beardGeo, c, 0, 1.03, 0.05);
    if (st.face === 'goatee') this.part(ALL, G.box, c, 0, 0.895, 0.2).scale.set(0.07, 0.07, 0.04);
    if (st.face === 'earrings') for (const s of [-1, 1]) this.part(ALL, G.sphere, 0xE8C25A, s * 0.2, 0.96, 0.06).scale.setScalar(0.024);
    if (dark) {
      for (const s of [-1, 1]) this.piece(lensGeo, 0x15181D, s * 0.07, 1.075, 0.262).rotation.y = s * 0.3;
      this.piece(G.box, 0x15181D, 0, 1.085, 0.272).scale.set(0.05, 0.014, 0.014);
    } else if (st.glasses !== null) {
      const seasons = shades ? ALL.filter(s => s !== 'summer') : ALL;
      for (const s of [-1, 1]) this.part(seasons, rimGeo, st.glasses, s * 0.07, 1.06, 0.262);
      this.part(seasons, G.box, st.glasses, 0, 1.068, 0.268).scale.set(0.06, 0.012, 0.012);
    }
  }

  /** A straw hat for the summer, a wide-brimmed sun hat or a little one, with a band in `ribbon`; tipped back off the face. */
  private strawHat(wide: boolean, ribbon: number) {
    const r = wide ? 0.33 : 0.26;
    const brim = this.part(['summer'], G.cyl, 0xE8CF8A, 0, 1.17, 0.02); brim.scale.set(r, 0.02, r);
    const crown = this.part(['summer'], G.cyl, 0xE8CF8A, 0, 1.25, 0); crown.scale.set(0.18, 0.15, 0.18);
    const band = this.part(['summer'], G.cyl, ribbon, 0, 1.2, 0.006); band.scale.set(0.185, 0.045, 0.185);
    for (const o of [brim, crown, band]) o.rotation.x = -0.25;
  }

  /** A woolly hat with a turned-up cuff and a bobble. */
  private bobble(seasons: Season[], c: number) {
    this.part(seasons, beanieGeo, c, 0, 1.05, 0.04).rotation.x = -0.2;
    this.part(seasons, cuffGeo, c, 0, 1.1, 0.05).rotation.x = Math.PI / 2 - 0.2;
    this.part(seasons, G.sphere, 0xF4F1EA, 0, 1.28, 0.0).scale.setScalar(0.065);
  }

  /**
   * Everyday clothes. In winter a parka in `color` with its fur-trimmed hood up, or the hood down under a woolly hat,
   * earmuffs or a trapper hat, and a scarf; then hair showing, and in spring a baseball cap or a hairband, in summer
   * short sleeves, shorts (or a skirt) and sunglasses or a straw hat, in autumn a woolly hat with a bobble, a beret or
   * a flat cap, and a scarf. A skirt is worn in spring too.
   */
  private everyday(st: Style, color: number) {
    const w = st.winter;
    if (w === 'hood') {
      this.part(['winter'], G.hoodBack, color, 0, 1.03, -0.04);
      this.part(['winter'], G.hood, st.fur, 0, 1.03, 0.1).castShadow = false;
    }
    if (w === 'earmuffs') {
      this.part(['winter'], aliceGeo, 0x3A3A3A, 0, 1.03, 0.05).scale.setScalar(1.02);
      for (const s of [-1, 1]) this.part(['winter'], G.sphere, st.winterC, s * 0.215, 1.0, 0.05).scale.set(0.05, 0.085, 0.085);
    }
    if (w === 'trapper') {
      const t = this.part(['winter'], domeGeo, st.winterC, 0, 1.06, 0.03); t.scale.set(1.15, 0.85, 1.15); t.rotation.x = -0.15;
      const brim = this.part(['winter'], furGeo, st.fur, 0, 1.11, 0.04); brim.rotation.x = Math.PI / 2 - 0.2;
      for (const s of [-1, 1]) {
        const f = this.part(['winter'], G.box, st.fur, s * 0.215, 0.98, 0.04); f.scale.set(0.05, 0.17, 0.17); f.rotation.z = s * 0.1;
      }
    }
    const bareHead = w === 'earmuffs' ? ['winter'] as Season[] : [];
    const out = w === 'hood' ? [] : ['winter'] as Season[];
    this.hairdo(st, ['spring', 'summer', ...bareHead], ['spring', 'summer', 'fall', ...out]);
    if (st.spring === 'cap') {
      this.part(['spring'], capGeo, st.springC, 0, 1.045, 0.04).rotation.x = -0.15;
      this.part(['spring'], brimGeo, st.springC, 0, 1.14, 0.265).rotation.x = -0.4;
    }
    if (st.spring === 'band') this.part(['spring'], aliceGeo, st.springC, 0, 1.035, 0.07).rotation.x = -0.35;
    if (st.summer === 'shades') {
      for (const s of [-1, 1]) this.part(['summer'], lensGeo, 0x1B2430, s * 0.07, 1.075, 0.262).rotation.y = s * 0.3;
      this.part(['summer'], G.box, 0x1B2430, 0, 1.085, 0.272).scale.set(0.05, 0.014, 0.014);
    } else this.strawHat(st.summer === 'sunhat', st.summerC);
    // The parka and the spring and autumn jacket: a zip up the front and a darker hem, and pockets on the parka.
    // Summer's T-shirt is plain. On Low, bare forearms and shins in summer are all there is.
    if (!this.high) {
      for (const a of this.arms) this.part(['summer'], forearmBoxGeo, st.skin, 0, -0.245, 0, a);
      for (const l of this.legs) this.part(['summer'], shinBoxGeo, st.skin, 0, -0.19, 0, l);
    }
    const slim = st.woman ? 0.9 : 1;
    if (this.high) {
      this.part(NOT_SUMMER, ringGeo, shade(color, 0.8), 0, 0.325, 0).scale.set(0.3 * slim + 0.006, 0.05, 0.3 * slim + 0.006);
      const zip = this.part(NOT_SUMMER, G.box, shade(color, 0.68), 0, 0.6, bodyZ(0, 0.6, slim) + 0.003);
      zip.scale.set(0.016, 0.5, 0.01); zip.rotation.x = -SLOPE;
      for (const s of [-1, 1]) {
        const x = s * 0.13 * slim, p = this.part(['winter'], G.box, shade(color, 0.86), x, 0.45, bodyZ(x, 0.45, slim) + 0.004);
        p.scale.set(0.085, 0.07, 0.014); p.rotation.set(-SLOPE, s * Math.PI / 10, 0, 'YXZ');
      }
    }
    if (st.skirt !== null) this.part(['spring', 'summer'], skirtGeo, st.skirt, 0, 0.33, 0);
    const knit = st.fallC;
    if (w === 'bobble') this.bobble(['winter'], st.winterC);
    if (st.fall === 'bobble') this.bobble(['fall'], knit);
    if (st.fall === 'beret') {
      const b = this.part(['fall'], G.sphere, knit, 0.03, 1.19, 0.02); b.scale.set(0.245, 0.075, 0.245); b.rotation.z = 0.2;
      this.part(['fall'], G.sphere, knit, 0.06, 1.27, 0.02).scale.setScalar(0.025);
    }
    if (st.fall === 'flatcap') {
      const c = this.part(['fall'], domeGeo, knit, 0, 1.1, 0.04); c.scale.set(1.08, 0.55, 1.12); c.rotation.x = 0.12;
      this.part(['fall'], brimGeo, knit, 0, 1.13, 0.255).rotation.x = -0.15;
    }
    this.scarf(['fall', ...out], st.scarfC);
  }

  /**
   * The fight crowd's yakuza (stage 3): a sharp suit (in the person's colour) over a loud shirt open at the neck,
   * dark trousers, and a pompadour, a punch perm, slicked-back hair or a shaved head; dark glasses on most (features),
   * and a gold chain on some. The same all year: it's the cellar.
   */
  private yakuza(st: Style) {
    this.piece(G.box, st.neckC, 0, 0.76, 0.245, true).scale.set(0.15, 0.22, 0.02);
    for (const s of [-1, 1]) this.piece(G.cone, st.neckC, s * 0.07, 0.87, 0.24).scale.set(0.05, 0.08, 0.025);
    if (st.neck === 'tie') this.piece(pearlsGeo, 0xE8C25A, 0, 0.9, 0.04).rotation.x = Math.PI / 2 + 0.25;
    const c = st.cut === 'curly' ? 0x15130F : st.hair;
    if (st.woman) { this.hairdo(st, ALL, ALL); return; }
    if (st.cut === 'bald') return;
    if (st.cut === 'curly') {
      // the punch perm: tight black curls, close to the head
      const perm = this.piece(curlsGeo, c, 0, 1.05, 0.04, true); perm.scale.setScalar(0.92); perm.rotation.x = -0.25;
      return;
    }
    this.piece(hairGeo, c, 0, 1.03, 0.04, true).rotation.x = -0.5;
    if (st.cut === 'quiff') {
      const q = this.piece(G.sphere, c, 0, 1.21, 0.17, true); q.scale.set(0.15, 0.08, 0.12); q.rotation.x = -0.3;
    }
  }

  /**
   * The fight crowd's hooligans (stage 3): a tracksuit top in the person's colour with pale stripes down the sleeves
   * and a zip, the side's scarf in it too, and a hood up, a beanie, a baseball cap or a shaved head. All year.
   */
  private hooligan(st: Style, color: number) {
    // (down the outside of the sleeve: High's round one, or Low's block)
    const out = this.high ? 0.057 : 0.051, slim = st.woman ? 0.9 : 1;
    for (const [i, a] of this.arms.entries()) this.piece(G.box, STRIPE, (i ? 1 : -1) * out, -0.15, 0, false, a).scale.set(0.006, 0.3, 0.03);
    const zip = this.piece(G.box, STRIPE, 0, 0.6, bodyZ(0, 0.6, slim) + 0.004); zip.scale.set(0.012, 0.5, 0.01); zip.rotation.x = -SLOPE;
    const ring = this.piece(scarfGeo, color, 0, 0.9, 0.01, true); ring.rotation.x = Math.PI / 2; ring.scale.setScalar(1.12);
    const end = this.piece(G.box, color, 0.08, 0.72, 0.26, true); end.scale.set(0.08, 0.24, 0.03); end.rotation.set(-0.13, 0, 0.08);
    const w = st.winter;
    if (w === 'hood') {
      this.piece(G.hoodBack, color, 0, 1.03, -0.04, true);
      this.piece(G.hood, color, 0, 1.03, 0.1);
    } else if (w === 'bobble') {
      this.piece(beanieGeo, 0x23262B, 0, 1.05, 0.04, true).rotation.x = -0.2;
      this.piece(cuffGeo, 0x23262B, 0, 1.1, 0.05, true).rotation.x = Math.PI / 2 - 0.2;
    } else if (w === 'trapper') {
      this.piece(capGeo, 0x1E2A3A, 0, 1.045, 0.04, true).rotation.x = -0.15;
      this.piece(brimGeo, 0x1E2A3A, 0, 1.14, 0.265, true).rotation.x = -0.4;
    } else if (st.cut !== 'bald') this.hairdo(st, ALL, ALL);
  }

  /** A knitted scarf round the neck, one end hanging down the front. */
  private scarf(seasons: Season[], c: number) {
    const ring = this.part(seasons, scarfGeo, c, 0, 0.9, 0.01);
    ring.rotation.x = Math.PI / 2; ring.scale.setScalar(1.12);
    const end = this.part(seasons, G.box, c, 0.08, 0.72, 0.26);
    end.scale.set(0.08, 0.24, 0.03); end.rotation.set(-0.13, 0, 0.08);
  }

  /** What's drawn of them now: the body's meshes, and an arm and a leg as each hangs from its pivot (for drawing a crowd
   *  of them in batches: swarm.ts). */
  baked() {
    const { shell, trim, limbs } = quietly(() => this.inPieces(this.worn()));
    return {
      body: [shell, trim].filter(g => g !== NOTHING), arm: limbs[0], leg: limbs[2],
      // (what of the body casts a shadow: the trim, the small things on it, doesn't)
      casts: shell,
    };
  }

  /** Puts on the clothes for the season (none of them while disguised), and bakes what's worn. */
  wear() { quietly(() => this.bake()); }

  private bake() {
    const worn = this.worn(), still = this.still;
    const parts = still ? this.inPieces(worn) : { shell: NOTHING, trim: NOTHING, limbs: this.limbs.map(() => NOTHING) };
    const put = (m: Mesh, g: BufferGeometry) => { m.geometry = g; m.visible = g !== NOTHING; };
    put(this.shell, parts.shell); put(this.trim, parts.trim);
    this.limbs.forEach((m, i) => put(m, parts.limbs[i]));
    // Moving, in one: what casts no shadow first, then the slight things that do (arms, legs, the toque's band), then the
    // body's (Jointed)
    const j = this.joint, off = worn.filter(p => !casts(p)), limbs = worn.filter(p => casts(p) && slight(p.bone));
    const order = still ? [] : [...off, ...limbs, ...worn.filter(p => casts(p) && !slight(p.bone))];
    put(j, baked(order, true));
    if (j.visible) Object.assign(j.geometry.userData, { casts: indices(off), bodyCasts: indices(off) + indices(limbs) });
    j.castShadow = order.length > off.length;
  }

  /** What's worn in pieces, as someone standing still is drawn: the body's that cast a shadow, and that don't (its
   *  toque and headband on it where they stand), and each arm's and leg's. */
  private inPieces(worn: Piece[]) {
    const body = worn.filter(p => !isLimb(p.bone)), lift = (p: Piece) => (p.bone > BODY ? this.bones[p.bone] : undefined);
    return {
      shell: baked(body.filter(p => p.o.castShadow), false, lift),
      trim: baked(body.filter(p => !p.o.castShadow), false, lift),
      limbs: [1, 2, 3, 4].map(b => baked(worn.filter(p => p.bone === b))),
    };
  }

  /** The pieces being worn now, on the body and the limbs (a disguise has its own arms). */
  worn() {
    const s = this.season ?? current();
    return [...this.pieces, ...(this.disguised ? this.limbPieces.slice(2) : this.limbPieces).flat()].filter(p => p.o.userData.disguise
      ? this.disguised
      : !(this.disguised && (p.o.userData.own || p.seasons)) && (!p.seasons || p.seasons.includes(s)));
  }

  /**
   * Dressed for the evening. Men: a white shirt front and a bow tie or a tie, under a top hat, a bowler or none.
   * Women: a dress in `color` that flares into a skirt, pearls, and a wide-brimmed hat, a pillbox or none.
   * The crowd's diners (`hair`) have their hair done too.
   */
  private dressUp(st: Style, color: number, hair: boolean) {
    const part = (geo: BufferGeometry, c: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      const m = this.piece(geo, c, x, y, z, true); m.scale.set(sx, sy, sz); return m;
    };
    if (hair) this.hairdo(st, ALL, ALL);
    const h = st.hatC;
    if (st.hat === 'top') {
      part(G.cyl, h, 0, 1.2, 0.03, 0.26, 0.03, 0.26);
      part(G.cyl, h, 0, 1.36, 0.03, 0.16, 0.3, 0.16);
      part(G.cyl, 0xC0392B, 0, 1.25, 0.03, 0.165, 0.05, 0.165);
    }
    if (st.hat === 'bowler') {
      part(G.cyl, h, 0, 1.17, 0.04, 0.25, 0.02, 0.25);
      part(domeGeo, h, 0, 1.17, 0.04, 0.95, 0.85, 0.95);
    }
    if (st.hat === 'brim') {
      // tipped back, so the camera above still sees her face
      for (const p of [
        part(G.cyl, h, 0, 1.18, 0.02, 0.34, 0.02, 0.34),
        part(domeGeo, h, 0, 1.18, 0.02, 0.9, 0.7, 0.9),
        part(G.cyl, st.neckC, 0, 1.2, 0.02, 0.182, 0.04, 0.182),
      ]) p.rotation.x = -0.3;
      part(G.sphere, 0xF4F1EA, 0.15, 1.24, -0.04, 0.05, 0.05, 0.05);
    }
    if (st.hat === 'pillbox') {
      part(G.cyl, h, 0.07, 1.215, 0.06, 0.11, 0.08, 0.11).rotation.z = -0.3;
      part(G.cone, 0xF4F1EA, 0.13, 1.3, 0.02, 0.025, 0.14, 0.025).rotation.z = -0.6;
    }
    if (st.woman) {
      part(skirtGeo, color, 0, 0.33, 0, 1, 1, 1);
      part(pearlsGeo, 0xF8F4EC, 0, 0.91, 0.03, 1, 1, 1).rotation.x = Math.PI / 2;
      // a satin sash at the waist
      const r = 0.26 * 0.9 + 0.006;
      if (this.high) part(ringGeo, shade(color, 0.62), 0, 0.6, 0, r, 0.05, r);
      return;
    }
    part(G.box, 0xFFFFFF, 0, 0.74, 0.24, 0.14, 0.26, 0.02);
    // the jacket's lapels either side of the shirt, two buttons, and a white square in the breast pocket
    const onFront = (x: number, y: number, w: number, h: number, c: number) => {
      const o = part(G.box, c, x, y, bodyZ(x, y) + 0.005, w, h, 0.012); o.rotation.set(-SLOPE, Math.sign(x) * Math.PI / 10, 0, 'YXZ');
      return o;
    };
    if (this.high) {
      for (const s of [-1, 1]) onFront(s * 0.088, 0.76, 0.05, 0.24, shade(color, 0.72)).rotation.z = -s * 0.32;
      for (const y of [0.53, 0.45]) part(dotGeo, shade(color, 0.5), 0, y, bodyZ(0, y) + 0.004, 0.016, 0.016, 0.01);
      onFront(-0.145, 0.735, 0.05, 0.03, 0xFFFFFF);
    }
    if (st.neck === 'tie') {
      part(G.box, st.neckC, 0, 0.72, 0.255, 0.055, 0.22, 0.02).rotation.x = -0.12;
      part(G.box, st.neckC, 0, 0.855, 0.245, 0.06, 0.05, 0.03);
    } else for (const s of [-1, 1]) part(G.cone, st.neckC, s * 0.05, 0.86, 0.25, 0.05, 0.07, 0.03).rotation.z = s * Math.PI / 2;
  }

  /**
   * A tea-house server: an indigo jacket with a white crossed collar, a red sash, a white apron, and a white
   * headband over dark hair.
   */
  private serverClothes() {
    const part = (geo: BufferGeometry, c: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      const m = this.piece(geo, c, x, y, z, true); m.scale.set(sx, sy, sz); return m;
    };
    for (const s of [-1, 1]) part(G.box, 0xF4F1EA, s * 0.055, 0.8, 0.235, 0.05, 0.24, 0.02).rotation.set(-0.35, 0, s * 0.5);
    part(G.cyl, 0xC0392B, 0, 0.44, 0, 0.29, 0.1, 0.29);
    part(G.box, 0xF4F1EA, 0, 0.27, 0.3, 0.34, 0.34, 0.02).rotation.x = 0.12;
    this.piece(hairGeo, 0x1E1B1A, 0, 1.03, 0.05, true).rotation.x = -0.35;
    this.piece(headbandGeo, 0xFFFFFF, 0, 1.11, 0.03).rotation.x = Math.PI / 2 - 0.25;
    for (const s of [-1, 1]) part(G.box, 0xFFFFFF, s * 0.04, 1.02, -0.2, 0.04, 0.12, 0.015).rotation.z = s * 0.35;
  }

  /** Puffy chef's hat and a red neckerchief. */
  private chefWhites() {
    // (the toque's band, which grows taller, and its puff on top: each hangs from one of its own, which toque() moves)
    if (!this.bones[TOQUE]) {
      mat(0xFFFFFF); // (made when its meshes once were, so its name's drawn from the same dice)
      const band = new Object3D(), puff = new Object3D();
      band.position.z = puff.position.z = 0.03;
      band.scale.set(0.19, 1, 0.19);
      this.body.add(band, puff);
      this.bones[TOQUE] = band; this.bones[PUFF] = puff;
      this.toque(this.toqueLevel, true);
    }
    const [cyl, ball] = this.high && this.pleats || [G.cyl, G.sphere];
    this.piece(cyl, 0xFFFFFF, 0, 0, 0, true, this.bones[TOQUE]);
    // (the puff squashed as a piece, not by what it hangs from: the graphics chip turns a bone's corners' normals by its
    // matrix as it is, which would lean a squashed ball's sideways; the band's straight sides and flat ends don't mind)
    this.piece(ball, 0xFFFFFF, 0, 0, 0, true, this.bones[PUFF]).scale.set(0.25, 0.16, 0.25);
    const scarf = this.piece(G.hood, 0xE5484D, 0, 0.88, 0.02); scarf.rotation.x = Math.PI / 2; scarf.scale.setScalar(1.15);
    // double-breasted: two rows of cloth buttons (on High)
    if (this.high) for (const x of [-0.06, 0.06]) for (const y of [0.76, 0.66, 0.56]) {
      this.piece(dotGeo, 0xB8C0C8, x, y, bodyZ(x, y) + 0.004, true).scale.set(0.017, 0.017, 0.01);
    }
  }

  /** Pleats their toque on High, in `band` and `puff` (propsKitchen.ts pleatToque, the sushi chefs'); Low's stays plain. */
  pleat(band: BufferGeometry, puff: BufferGeometry) {
    this.pleats = [band, puff];
    if (this.high) this.redress(); // (on Low, the graphics going High dresses them again)
  }

  /** Makes a chef's toque taller, the way head chefs' are: `level` 0 is the everyday one. */
  toque(level: number, now = false) {
    if (level === this.toqueLevel && !now) return;
    this.toqueLevel = level;
    const band = this.bones[TOQUE], puff = this.bones[PUFF];
    if (!band || !puff) return;
    const h = 0.12 + level * 0.06;
    band.scale.y = h; band.position.y = 1.16 + h / 2;
    puff.position.y = 1.16 + h + 0.08;
    // (one standing still is baked as they stand, toque and all)
    if (this.still && !now) this.wear();
  }

  /** Ties a headband round the hood in `color`, with its two ends trailing behind; null takes it off. */
  headband(color: number | null) { quietly(() => this.tie(color)); }

  /** The headband's colour, while one's on. */
  get bandOn() { return this.bandColor; }

  private tie(color: number | null) {
    this.bandColor = color;
    this.pieces = this.pieces.filter(p => p.bone !== TIED);
    if (color === null) { if (this.band) this.band.visible = false; }
    else {
      if (!this.band) {
        this.band = new Group(); this.band.position.set(0, 1.1, 0.0);
        this.body.add(this.band);
        this.bones[TIED] = this.band;
      }
      this.band.visible = true;
      mat(color); // (made when its meshes' material once was, so its name's drawn from the same dice)
      this.tied(color);
    }
    this.bake();
  }

  /** The headband's pieces, on what it hangs from. */
  private tied(color: number) {
    this.piece(BAND, color, 0, 0, 0, false, this.band).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) {
      const end = this.piece(G.box, color, s * 0.06, -0.08, -0.27, false, this.band); end.scale.set(0.06, 0.16, 0.025); end.rotation.z = s * 0.35;
    }
  }

  /** Sews `m` onto them, over their clothes (a patch, a collar: a hire's uniform, cellarLooks.ts), baked in with the rest. */
  sew(m: Mesh) {
    this.extras.push(m);
    this.redress();
  }
}

const BAND = new TorusGeometry(0.24, 0.035, 6, 18);
/** How many corners `pieces` draw, by index. */
const indices = (pieces: Piece[]) => pieces.reduce((n, p) => n + p.geo.index!.count, 0);
/** The yakuza's dark suit trousers, and the hooligans' tracksuit stripes (not quite white: white's the shirt a crowd
 *  tints, swarm.ts). */
const SUIT_LEGS = 0x1E1F26, STRIPE = 0xEDEAE2;

/** Shows a vehicle part only in `seasons` (skis in winter, wheels the rest of the year). */
function onlyIn(o: Object3D, seasons: Season[]) {
  o.userData.seasons = seasons;
  o.visible = seasons.includes(current());
  return o;
}

// Everyone changes clothes when the season does, and the snowmobiles swap their skis for wheels and back.
onSeason(() => scene.traverse(o => {
  if (o instanceof Person) o.wear();
  else if (o.userData.bySeason) o.userData.bySeason();
  else if (o.userData.seasons) o.visible = (o.userData.seasons as Season[]).includes(current());
}));
// Everyone on the scene redrawn in the new graphics' detail; anyone off it is when they're next walked (animPerson).
onQuality(() => {
  const people: Person[] = [];
  scene.traverse(o => { if (o instanceof Person && !o.upToDate) people.push(o); });
  for (const p of people) p.redress();
});

/** Dresses someone for good where the seasons don't reach: down in the cellar, or aboard the casino yacht (indoors, or
 *  in its hot tub), where nobody wears a scarf. */
export function allYear<T extends Person>(p: T) {
  p.season = 'spring';
  p.wear();
  return p;
}
/** Dresses someone who works down in the cellar for good: the seasons don't reach it. */
export const belowGround = allYear;

/** The colour a crowd model's shirt is made in, to find it by (nothing anyone wears is this magenta). */
export const SHIRT = 0xFF00FF;
/** A crowd member dressed in `style` (as `look`) with their shirt in SHIRT (to be tinted), kept out of the count that
 *  hands out the plain looks, so making one changes nobody else's. Their round pieces have fewer sides (a crowd's seen
 *  from afar, and there can be hundreds: swarm.ts). */
export function crowdModel(style: Style, look: Look) {
  const n = dressed;
  coarsening = true;
  const p = new Person(SHIRT, look, style);
  coarsening = false;
  dressed = n;
  return p;
}
let coarsening = false;
const coarser = new Map<BufferGeometry, BufferGeometry>();
/** `geo` with about 60% of the sides and rings, if it's round: the same shape from a little way off. */
function coarse(geo: BufferGeometry) {
  let c = coarser.get(geo);
  if (c) return c;
  const less = (n: number, min: number) => Math.max(min, Math.round(n * 0.6));
  if (geo instanceof SphereGeometry) {
    const p = geo.parameters;
    c = new SphereGeometry(p.radius, less(p.widthSegments, 5), less(p.heightSegments, 3), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
  } else if (geo instanceof TorusGeometry) {
    const p = geo.parameters;
    c = new TorusGeometry(p.radius, p.tube, less(p.radialSegments, 3), less(p.tubularSegments, 6), p.arc);
  } else if (geo instanceof ConeGeometry) c = geo;
  else if (geo instanceof CylinderGeometry) {
    const p = geo.parameters;
    c = new CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, less(p.radialSegments, 6), p.heightSegments, p.openEnded);
  } else c = geo;
  coarser.set(geo, c);
  return c;
}

/** How far a walker leans into their stride, rocks from foot to foot, and how deep they breathe standing (radians, scale). */
const LEAN = 0.07, ROCK = 0.035, BREATH = 0.012;
/**
 * Walks and stands someone for `dt`: legs and arms swing as they walk, and their arms hang a little out from their
 * body. Walking, the body dips as the legs spread and rises as they pass, so both feet stay on the ground, and leans
 * into the stride, rocking from foot to foot; standing, it breathes.
 */
export function animPerson(p: Person, moving: boolean, dt: number, carrying: boolean) {
  if (!p.upToDate) p.redress(); // back on the scene after the graphics changed
  if (moving) p.phase += dt * 11; else p.phase = 0;
  p.breath += dt;
  const s = Math.sin(p.phase), swing = s * 0.7;
  p.legs[0].rotation.x = swing; p.legs[1].rotation.x = -swing;
  if (carrying) { p.arms[0].rotation.x = p.arms[1].rotation.x = -1.25; }
  else { p.arms[0].rotation.x = -s * 0.5; p.arms[1].rotation.x = s * 0.5; }
  p.arms[0].rotation.z = -0.08; p.arms[1].rotation.z = 0.08;
  const b = p.body;
  b.position.y = -0.3 * (1 - Math.cos(swing));
  b.rotation.x += ((moving ? LEAN : 0) - b.rotation.x) * Math.min(1, dt * 8);
  b.rotation.z = moving ? s * ROCK : 0;
  b.scale.y = moving || p.still ? 1 : 1 + Math.sin(p.breath * 2.4) * BREATH;
}

const glass = new MeshLambertMaterial({ color: 0xBDEBFA, transparent: true, opacity: .65 });
const SKI = new BoxGeometry(0.1, 0.06, 2.1);
const TYRE = new CylinderGeometry(0.17, 0.17, 0.12, 14), HUB = new CylinderGeometry(0.08, 0.08, 0.13, 10);
// shared by every sled: one built per sled stayed on the GPU after it drove off
const HULL = new BoxGeometry(0.9, 0.38, 1.5), NOSE = new BoxGeometry(0.86, 0.24, 0.5);
const SCREEN = new BoxGeometry(0.78, 0.36, 0.05), SEAT = new BoxGeometry(0.82, 0.08, 0.62);
const OUT_OF_WINTER: Season[] = ['spring', 'summer', 'fall'];
/** `c` (the paint's white or grey) in the sled's colour `k`, as a material of that colour would shade it. */
const tinted = (c: number, k: number) => {
  const ch = (s: number) => Math.round(((c >> s) & 255) * ((k >> s) & 255) / 255);
  return ch(16) << 16 | ch(8) << 8 | ch(0);
};
/** The solid parts under `low` (not its windscreen) for winter or the rest of the year, as pieces to bake: those that
 *  cast a shadow, and those that don't. */
function solidsOf(low: Object3D, winter: boolean) {
  low.updateMatrixWorld(true);
  const out: { cast: KitPiece[]; off: KitPiece[] } = { cast: [], off: [] };
  low.traverse(o => {
    if (!(o instanceof Mesh) || o.material === glass) return;
    for (let p: Object3D | null = o; p && p !== low; p = p.parent) {
      if ((p.userData.seasons as Season[] | undefined)?.includes(winter ? 'winter' : 'summer') === false) return;
    }
    (o.castShadow ? out.cast : out.off).push({ geo: o.geometry, c: (o.material as MeshLambertMaterial).color.getHex(), m: o.matrixWorld.clone() });
  });
  return out;
}
/** A sled's solid parts in one geometry (shared by every sled of the colour, swept as people's clothes are): `copy`,
 *  with those that cast a shadow again after the rest, to cast it (as kit.ts baked does; batch.ts keeps it when it
 *  merges a sled that's stopped); without, all of it casting. */
function sledBake(key: string, pieces: KitPiece[] | { cast: KitPiece[]; off: KitPiece[] }, copy: boolean) {
  let g = bakes.get(key);
  if (g) return g;
  if (Array.isArray(pieces)) g = pack(pieces);
  else {
    const all = [...pieces.cast, ...pieces.off], own = pack.count(all);
    g = pack(copy ? [...all, ...pieces.cast] : all);
    if (copy) { g.userData.own = own; g.setDrawRange(0, own); }
  }
  bakes.set(key, g);
  return g;
}
/** A sled's body in one mesh: `bake(winter)` on skis in winter, on wheels the rest of the year, swapped when the season
 *  changes (characters.ts onSeason). */
function sledBody(bake: (winter: boolean) => BufferGeometry) {
  const m = new Mesh(NOTHING, painted);
  m.castShadow = m.receiveShadow = true;
  m.userData.bySeason = () => {
    // (baked on the sleds' own dice: a season changing never draws on the luck)
    const g = m.geometry = sledQuietly(() => bake(current() === 'winter')), own: number | undefined = g.userData.own;
    if (own === undefined) return;
    m.userData.shadowFrom = own; // (where its shadow's copy starts, as kit.ts has it)
    m.onBeforeShadow = () => g.setDrawRange(own, Infinity);
    m.onAfterShadow = () => g.setDrawRange(0, own);
  };
  m.userData.bySeason();
  return m;
}
/**
 * A snowmobile and its driver (dressed in `style`, or plainly). Out of winter it runs on four wheels instead of its skis: a little car, in effect,
 * still called a snowmobile in the code. Low: boxes. High: rounded bodywork with bumpers, headlights, handlebars and
 * a grab rail, its skis' tips turned up and its wheels hubbed (propsMachines.ts). Each is drawn as one mesh (sledBody)
 * and its see-through windscreen, shared between sleds of a colour.
 */
export function makeSled(color: number, driverColor: number, style?: Style) {
  const g = new Group();
  const low = sledQuietly(() => new Group());
  g.add(low);
  low.add(mesh(HULL, color, 0, 0.34, 0, true));
  low.add(mesh(NOSE, color, 0, 0.28, 0.95, true));
  for (const s of [-1, 1]) low.add(onlyIn(mesh(SKI, 0x2C3A47, s * 0.38, 0.05, 0.15), ['winter']));
  for (const s of [-1, 1]) {
    for (const z of [-0.5, 0.85]) {
      const w = new Group(); w.position.set(s * 0.46, 0.17, z); w.rotation.z = Math.PI / 2;
      w.add(mesh(TYRE, 0x1F262E, 0, 0, 0, true), mesh(HUB, 0xC9D1D8));
      low.add(onlyIn(w, OUT_OF_WINTER));
    }
  }
  const ws = mesh(SCREEN, glass, 0, 0.68, 0.62); ws.rotation.x = -0.45; low.add(ws);
  low.add(mesh(SEAT, 0x5B4636, 0, 0.56, -0.52));
  sledQuietly(() => {
    // Low's parts, made as they always were (on the game's luck, which they draw from as they did), baked into one: what
    // casts a shadow cast as it did, by a copy after the rest (kit.ts baked)
    const [winter, rest] = [true, false].map(w => solidsOf(low, w));
    low.clear();
    low.add(ws, sledBody(w => sledBake(`sled low ${color} ${w}`, w ? winter : rest, true)));
    // High's: the bodywork painted the sled's colour, the trim, and the skis or the wheels (not made on Potato, kit.ts letGo)
    const parts = sledParts(), high = new Group();
    const screen = mesh(parts.screen, glass, 0, 0.68, 0.62); screen.rotation.x = -0.45;
    high.add(screen);
    const paint = parts.paint.map(p => ({ ...p, c: tinted(p.c, color) }));
    if (highBuilt) high.add(sledBody(w => sledBake(`sled high ${color} ${w}`, [...paint, ...parts.trim, ...(w ? parts.skis : parts.wheels)], false)));
    g.add(high);
    detailMarked(low, high);
  });
  const d = new Person(driverColor, 'parka', style); d.scale.setScalar(0.85 * d.style.height); d.position.set(0, 0.28, 0.1);
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
