import { BoxGeometry, BufferGeometry, CylinderGeometry, Group, type Mesh, MeshLambertMaterial, Object3D, SphereGeometry, TorusGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { G, mat, mesh, paint, painted, scene } from './render';
import { current, onSeason, type Season } from './season';
import type { XZ } from './util';
import { KNITS, plain, type Style } from './wardrobe';

export const PARKAS = [0xF2B33D, 0x7A6FF0, 0x3FA37C, 0xE85D75, 0x5B8DEF, 0xF08A4B, 0x9B5DE5, 0x2EC4B6];
/** Suit colours for the sushi bar's well-dressed diners (the women wear DRESSES, wardrobe.ts). */
export const SUITS = [0x22303C, 0x3B3F6B, 0x5A2E3A, 0x2F4A44, 0x4A4F57];

/** Everyday clothes (a parka in winter), a diner's evening clothes, a sushi chef's whites, a farmer's straw hat, or a server's indigo. */
export type Look = 'parka' | 'fancy' | 'chef' | 'farmer' | 'waiter';

// ---------- seasonal clothes ----------
const ALL: Season[] = ['winter', 'spring', 'summer', 'fall'];
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

/** One piece of a person: a shape in one colour, posed by `o` (where it goes, its turn and size, whether it casts a shadow). */
export interface Piece {
  geo: BufferGeometry;
  c: number;
  o: Object3D;
  /** Clothes, hair and the like: worn in these seasons only, and not under a disguise. */
  seasons?: Season[];
}

// People are drawn baked: everything on the body in two meshes (what casts a shadow, and what doesn't: the head, eyes
// and hood never have), and each arm and leg in one, so a person costs 6 draw calls rather than 14 or more. Vertex
// colours shade exactly like the per-colour materials (render.ts painted). The bakes are shared by everyone wearing
// the same thing, and kept: the crowd's mixes are many, but each is small.
const bakes = new Map<string, BufferGeometry>();
const NOTHING = new BufferGeometry();
function baked(pieces: Piece[]) {
  if (!pieces.length) return NOTHING;
  for (const p of pieces) p.o.updateMatrix();
  const key = pieces.map(p => `${p.geo.id},${p.c},${p.o.matrix.elements.join()}`).join(';');
  let g = bakes.get(key);
  if (!g) {
    g = mergeGeometries(pieces.map(p => paint(p.geo.clone().applyMatrix4(p.o.matrix), p.c)))!;
    bakes.set(key, g);
  }
  return g;
}

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
  /** Wearing someone else's look (the singer's), over everything seasonal and in place of their own body and head. */
  disguised = false;
  /** Everything on the body, and on each limb (arms, then legs). */
  private pieces: Piece[] = [];
  private limbPieces: Piece[][] = [[], [], [], []];
  /** The body's two meshes, and the arms' and legs' (the first thing on each pivot). */
  private shell = mesh(NOTHING, painted, 0, 0, 0, true);
  private trim = mesh(NOTHING, painted);
  private limbs: Mesh[] = [];
  /** Who they are: a mix of a man's or a woman's wardrobe for the crowd, or the plain look everyone else has. */
  readonly style: Style;
  /**
   * Everything the constructor built under them, in order. Co-op (mirror.ts) builds the same person on the guest's
   * phone from their colour, look and style, and matches these up one for one.
   */
  readonly own: Object3D[] = [];

  /** `color` is the shirt, parka, suit or dress; `style` mixes a crowd member up (wardrobe.ts crowd()); without one they get the plain look. */
  constructor(readonly color: number, readonly look: Look = 'parka', style?: Style) {
    super();
    const n = dressed++;
    const st = this.style = style ?? plain(n);
    // women are a little slimmer, their arms a little closer in
    const slim = st.woman ? 0.9 : 1;
    for (const s of [-1, 1]) {
      const p = new Group(); p.position.set(s * 0.1, 0.3, 0);
      this.add(p); this.legs.push(p);
      const a = new Group(); a.position.set(s * (st.woman ? 0.28 : 0.3), 0.82, 0.02);
      this.add(a); this.arms.push(a);
    }
    for (const l of [...this.arms, ...this.legs]) { const m = mesh(NOTHING, painted, 0, 0, 0, true); l.add(m); this.limbs.push(m); }
    this.add(this.shell, this.trim);
    for (const a of this.arms) this.piece(G.arm, color, 0, -0.15, 0, true, a);
    for (const l of this.legs) this.piece(G.leg, st.legs, 0, -0.15, 0, true, l);
    const body = this.piece(G.body, color, 0, 0.6, 0, true); body.scale.set(slim, 1, slim);
    body.userData.own = true;
    this.piece(G.head, st.skin, 0, 1.03, 0.05).userData.own = true;
    for (const s of [-1, 1]) this.piece(G.eye, 0x1B2733, s * 0.07, 1.06, 0.24);
    if (look === 'fancy') this.dressUp(st, color, !!style);
    if (look === 'waiter') this.serverClothes();
    if (look === 'chef') this.chefWhites();
    if (look === 'farmer') this.piece(G.cone, 0xE3C26B, 0, 1.27, 0.03, true).scale.set(0.36, 0.17, 0.36);
    if (look === 'parka') this.everyday(st, color);
    if (style) this.features(st, look === 'parka' && st.summer === 'shades');
    // a scarf for the cold, over the suit or the farmer's shirt
    if (look === 'fancy' || look === 'farmer') this.scarf(['winter', 'fall'], look === 'fancy' ? 0xF4EBDD : KNITS[n % KNITS.length]);
    this.scale.setScalar(st.height);
    this.wear();
    for (const m of [this.shell, this.trim, ...this.limbs]) m.userData.baked = true;
    this.traverse(o => { if (o !== this) this.own.push(o); });
  }

  /**
   * Adds a piece on `on` (the body, an arm or a leg), worn all the time or in `seasons` only. Returns what poses it, to
   * turn and size it as a mesh would be; wear() bakes it in. `userData.own` on it marks the body and head.
   */
  private piece(geo: BufferGeometry, c: number, x: number, y: number, z: number, cast = false, on: Object3D = this, seasons?: Season[]) {
    const o = new Object3D(); o.position.set(x, y, z); o.castShadow = cast;
    const limb = [...this.arms, ...this.legs].indexOf(on as Group);
    (limb < 0 ? this.pieces : this.limbPieces[limb]).push({ geo, c, o, seasons });
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

  /** The crowd's year-round looks: a moustache, a beard or earrings, and glasses (sunglasses stand in when `shades`). */
  private features(st: Style, shades: boolean) {
    const c = st.hair;
    if (st.face === 'mustache' || st.face === 'beard' || st.face === 'goatee') {
      this.part(ALL, G.box, c, 0, 0.985, 0.243).scale.set(0.13, 0.032, 0.035);
    }
    if (st.face === 'beard') this.part(ALL, beardGeo, c, 0, 1.03, 0.05);
    if (st.face === 'goatee') this.part(ALL, G.box, c, 0, 0.895, 0.2).scale.set(0.07, 0.07, 0.04);
    if (st.face === 'earrings') for (const s of [-1, 1]) this.part(ALL, G.sphere, 0xE8C25A, s * 0.2, 0.96, 0.06).scale.setScalar(0.024);
    if (st.glasses !== null) {
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
    for (const a of this.arms) this.part(['summer'], forearmGeo, st.skin, 0, -0.245, 0, a);
    for (const l of this.legs) this.part(['summer'], shinGeo, st.skin, 0, -0.19, 0, l);
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

  /** A knitted scarf round the neck, one end hanging down the front. */
  private scarf(seasons: Season[], c: number) {
    const ring = this.part(seasons, scarfGeo, c, 0, 0.9, 0.01);
    ring.rotation.x = Math.PI / 2; ring.scale.setScalar(1.12);
    const end = this.part(seasons, G.box, c, 0.08, 0.72, 0.26);
    end.scale.set(0.08, 0.24, 0.03); end.rotation.set(-0.13, 0, 0.08);
  }

  /** Puts on the clothes for the season (none of them while disguised), and bakes what's worn. */
  wear() {
    const worn = this.worn();
    const body = worn.filter(p => this.pieces.includes(p));
    this.shell.geometry = baked(body.filter(p => p.o.castShadow));
    this.trim.geometry = baked(body.filter(p => !p.o.castShadow));
    this.shell.visible = this.shell.geometry !== NOTHING;
    this.trim.visible = this.trim.geometry !== NOTHING;
    this.limbs.forEach((m, i) => { m.geometry = baked(this.limbPieces[i].filter(p => worn.includes(p))); });
  }

  /** The pieces being worn now, on the body and the limbs. */
  worn() {
    const s = current();
    return [...this.pieces, ...this.limbPieces.flat()]
      .filter(p => !(this.disguised && (p.o.userData.own || p.seasons)) && (!p.seasons || p.seasons.includes(s)));
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
      return;
    }
    part(G.box, 0xFFFFFF, 0, 0.74, 0.24, 0.14, 0.26, 0.02);
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
    this.toqueBand = mesh(G.cyl, 0xFFFFFF, 0, 0, 0.03, true); this.toqueBand.scale.set(0.19, 1, 0.19); this.add(this.toqueBand);
    this.toquePuff = mesh(G.sphere, 0xFFFFFF, 0, 0, 0.03, true); this.toquePuff.scale.set(0.25, 0.16, 0.25); this.add(this.toquePuff);
    this.toque(0);
    const scarf = this.piece(G.hood, 0xE5484D, 0, 0.88, 0.02); scarf.rotation.x = Math.PI / 2; scarf.scale.setScalar(1.15);
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
// shared by every sled: one built per sled stayed on the GPU after it drove off
const HULL = new BoxGeometry(0.9, 0.38, 1.5), NOSE = new BoxGeometry(0.86, 0.24, 0.5);
const SCREEN = new BoxGeometry(0.78, 0.36, 0.05), SEAT = new BoxGeometry(0.82, 0.08, 0.62);
const OUT_OF_WINTER: Season[] = ['spring', 'summer', 'fall'];
/**
 * A snowmobile and its driver (dressed in `style`, or plainly). Out of winter it runs on four wheels instead of its skis: a little car, in effect,
 * still called a snowmobile in the code.
 */
export function makeSled(color: number, driverColor: number, style?: Style) {
  const g = new Group();
  g.add(mesh(HULL, color, 0, 0.34, 0, true));
  g.add(mesh(NOSE, color, 0, 0.28, 0.95, true));
  for (const s of [-1, 1]) g.add(onlyIn(mesh(SKI, 0x2C3A47, s * 0.38, 0.05, 0.15), ['winter']));
  for (const s of [-1, 1]) {
    for (const z of [-0.5, 0.85]) {
      const w = new Group(); w.position.set(s * 0.46, 0.17, z); w.rotation.z = Math.PI / 2;
      w.add(mesh(TYRE, 0x1F262E, 0, 0, 0, true), mesh(HUB, 0xC9D1D8));
      g.add(onlyIn(w, OUT_OF_WINTER));
    }
  }
  const ws = mesh(SCREEN, glass, 0, 0.68, 0.62); ws.rotation.x = -0.45; g.add(ws);
  g.add(mesh(SEAT, 0x5B4636, 0, 0.56, -0.52));
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
