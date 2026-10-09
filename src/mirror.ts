// Co-op: the guest's phone shows the host's game by mirroring its 3D scene. The host runs the one real game; ten
// times a second its Encoder walks the scene and writes down what changed since the last time: where each thing is,
// whether it shows, what it's made of, and anything new or gone. The guest's Decoder applies that to its own copy
// of the scene, easing things from where they were to where they are now so they move smoothly in between.
//
// Both phones build the same scene while the game loads (boot.ts), so everything built then is named by its
// three.js id counted from the first, and only what changed after that, or was built later (customers, plates, the
// money flying about), needs describing. People are built from their colour, look and style (characters.ts), since
// their clothes are baked into one-off geometry, and everything else from the shapes, materials and pictures it's
// made of, each sent once.
//
// Some things each phone keeps for itself, marked in `userData.net`: 'local' leaves a thing (and all under it) to
// the phone (the weather round the player, the sun that follows the camera), and 'self' sends the thing but leaves
// what's under it to the phone (an ad that's up, while it animates itself). Materials and textures with
// `userData.local` are left to the phone too (the roof fading round the player, the upgrade tiles, which each phone
// draws from the tile's state).
import {
  BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, ConeGeometry, CylinderGeometry, Group,
  Line, LineBasicMaterial, LineSegments, type Material, Mesh, MeshBasicMaterial, MeshLambertMaterial, MeshPhongMaterial,
  Object3D, Plane, PlaneGeometry, PointLight, Points, PointsMaterial, RingGeometry, SphereGeometry, Sprite,
  SpriteMaterial, type Texture, TorusGeometry,
} from 'three';
import { BASE } from './boot';
import { Person } from './characters';

// ---------- names ----------
/** Every object, geometry, material and texture is named by its three.js id counted from the first built (boot.ts). */
export const nid = (o: Object3D) => o.id - BASE.o;
const gid = (g: BufferGeometry) => g.id - BASE.g;
const mid = (m: Material) => (m as unknown as { id: number }).id - BASE.m;
const tid = (t: Texture) => t.id - BASE.t;

// ---------- what's sent ----------
/** A thing new to the guest: id, parent (-1 for the scene), kind, transform, shown, and what it's made of. */
export interface Add {
  i: number;
  p: number;
  k: Kind;
  t: number[];
  v: 0 | 1;
  /** Geometry, material(s). */
  g?: number;
  m?: number | number[];
  /** renderOrder, shadows (1 casts, 2 receives), frustumCulled off. */
  ro?: number;
  sh?: number;
  fc?: 0;
  /** A person: colour, look, style; and the ids of what their constructor built, in order. */
  rc?: [number, string, unknown];
  o?: number[];
  dg?: 1;
  /** A light: colour, intensity, distance, decay. */
  l?: number[];
}
/** O(bject3D), G(roup), M(esh), S(prite), P(oints), L(ine segments), N (a line), PL (point light), H (a person). */
export type Kind = 'O' | 'G' | 'M' | 'S' | 'P' | 'L' | 'N' | 'PL' | 'H';

/** One message from the host: everything that changed since the last. */
export interface Delta {
  /** New things (parents first), things gone, and changes: [id, mask, ...values] (see Encoder.diff). */
  a: Add[];
  r: number[];
  u: number[][];
  /** Geometries, materials and textures the guest hasn't had yet, by id. */
  g: Record<number, GeoDef>;
  m: Record<number, MatDef>;
  x: Record<number, TexDef>;
  /** Materials that changed ([id, props]), and pictures redrawn ([id, image]). */
  mu: [number, MatDef][];
  xu: [number, string][];
  /** Resources the host is done with. */
  rel?: { g: number[]; m: number[]; x: number[] };
}

const empty = (d: Delta) => !d.a.length && !d.r.length && !d.u.length && !d.mu.length && !d.xu.length &&
  !Object.keys(d.g).length && !Object.keys(d.m).length && !Object.keys(d.x).length && !d.rel;

// ---------- transforms ----------
/**
 * Position and rotation in thousandths (millimetres, milliradians), and scale in hundredths: things growing (rice
 * ripening, a pop-in) would otherwise send a change every time.
 */
const Q = 1000, QS = 100;
function quant(o: Object3D, out: number[] = new Array<number>(9)) {
  const p = o.position, r = o.rotation, s = o.scale;
  out[0] = Math.round(p.x * Q); out[1] = Math.round(p.y * Q); out[2] = Math.round(p.z * Q);
  out[3] = Math.round(r.x * Q); out[4] = Math.round(r.y * Q); out[5] = Math.round(r.z * Q);
  out[6] = Math.round(s.x * QS); out[7] = Math.round(s.y * QS); out[8] = Math.round(s.z * QS);
  return out;
}
function setTransform(o: Object3D, t: ArrayLike<number>) {
  o.position.set(t[0] / Q, t[1] / Q, t[2] / Q);
  o.rotation.set(t[3] / Q, t[4] / Q, t[5] / Q);
  // never quite nothing: three.js can't invert a zero scale
  o.scale.set(t[6] / QS || 1e-3, t[7] / QS || 1e-3, t[8] / QS || 1e-3);
}

function kindOf(o: Object3D): Kind {
  if (o instanceof Person) return 'H';
  if (o instanceof Sprite) return 'S';
  if (o instanceof Points) return 'P';
  if (o instanceof LineSegments) return 'L';
  if (o instanceof Line) return 'N';
  if (o instanceof Mesh) return 'M';
  if (o instanceof PointLight) return 'PL';
  if (o instanceof Group) return 'G';
  return 'O';
}
const drawn = (o: Object3D): o is Mesh | Points | Line => o instanceof Mesh || o instanceof Points || o instanceof Line;

// ---------- geometries ----------
const SHAPES = {
  BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry, PlaneGeometry, TorusGeometry, CircleGeometry, RingGeometry,
} as const;
type ShapeName = keyof typeof SHAPES;
/** A geometry: a named shape and its parameters, or its raw attributes (base64), index and groups. */
export interface GeoDef {
  s?: [ShapeName, Record<string, number>];
  a?: Record<string, [itemSize: number, normalized: 0 | 1, type: string, data: string]>;
  i?: [type: string, data: string];
  gr?: [start: number, count: number, material: number][];
}
const ARRAYS = { f: Float32Array, u8: Uint8Array, u16: Uint16Array, u32: Uint32Array, i16: Int16Array, i32: Int32Array } as const;
type ArrayName = keyof typeof ARRAYS;
function arrayName(a: ArrayLike<number>): ArrayName {
  if (a instanceof Uint16Array) return 'u16';
  if (a instanceof Uint32Array) return 'u32';
  if (a instanceof Uint8Array) return 'u8';
  if (a instanceof Int16Array) return 'i16';
  if (a instanceof Int32Array) return 'i32';
  return 'f';
}
function b64(a: ArrayBufferView) {
  const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
function unb64(s: string, name: ArrayName) {
  const bin = atob(s), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new ARRAYS[name](u.buffer);
}

function geoDef(g: BufferGeometry): GeoDef {
  const params = (g as BufferGeometry & { parameters?: Record<string, number> }).parameters;
  if (g.type in SHAPES && params) return { s: [g.type as ShapeName, params] };
  const a: GeoDef['a'] = {};
  for (const [name, attr] of Object.entries(g.attributes)) {
    if (!(attr instanceof BufferAttribute)) continue;
    a[name] = [attr.itemSize, attr.normalized ? 1 : 0, arrayName(attr.array), b64(attr.array as ArrayBufferView)];
  }
  const def: GeoDef = { a };
  if (g.index) def.i = [arrayName(g.index.array), b64(g.index.array as ArrayBufferView)];
  if (g.groups.length) def.gr = g.groups.map(x => [x.start, x.count, x.materialIndex ?? 0]);
  return def;
}
function makeGeo(d: GeoDef): BufferGeometry {
  if (d.s) {
    const [name, p] = d.s;
    const C = SHAPES[name] as unknown as new (...a: number[]) => BufferGeometry;
    // the parameters come in the constructor's order (three.js keeps them that way)
    return new C(...Object.values(p));
  }
  const g = new BufferGeometry();
  for (const [name, [size, norm, type, data]] of Object.entries(d.a ?? {})) {
    g.setAttribute(name, new BufferAttribute(unb64(data, type as ArrayName), size, !!norm));
  }
  if (d.i) g.setIndex(new BufferAttribute(unb64(d.i[1], d.i[0] as ArrayName), 1));
  for (const [s, c, m] of d.gr ?? []) g.addGroup(s, c, m);
  return g;
}

// ---------- materials ----------
/** A material: its kind and the properties the game sets, colours as hex and pictures by texture id. */
export type MatDef = Record<string, unknown> & { k?: string };
const MATS = { MeshLambertMaterial, MeshBasicMaterial, MeshPhongMaterial, SpriteMaterial, PointsMaterial, LineBasicMaterial } as const;
const COLORS = ['color', 'emissive', 'specular'] as const;
const NUMBERS = ['opacity', 'emissiveIntensity', 'shininess', 'size', 'side', 'blending', 'alphaTest', 'rotation'] as const;
const FLAGS = ['transparent', 'depthWrite', 'depthTest', 'vertexColors', 'visible', 'sizeAttenuation', 'fog', 'toneMapped'] as const;
const MAPS = ['map', 'emissiveMap', 'alphaMap'] as const;
type Loose = Record<string, unknown>;

function matProps(m: Material, tex: (t: Texture) => number): MatDef {
  const o = m as unknown as Loose, d: MatDef = {};
  for (const k of COLORS) if (o[k]) d[k] = (o[k] as { getHex(): number }).getHex();
  for (const k of NUMBERS) if (typeof o[k] === 'number') d[k] = o[k];
  for (const k of FLAGS) if (typeof o[k] === 'boolean') d[k] = o[k] ? 1 : 0;
  for (const k of MAPS) d[k] = o[k] ? tex(o[k] as Texture) : -1;
  if (m.clippingPlanes?.length) d.clip = m.clippingPlanes.map(p => [p.normal.x, p.normal.y, p.normal.z, p.constant]);
  return d;
}
function applyProps(m: Material, d: MatDef, tex: (id: number) => Texture | null) {
  const o = m as unknown as Loose;
  for (const k of COLORS) if (typeof d[k] === 'number' && o[k]) (o[k] as { setHex(h: number): void }).setHex(d[k] as number);
  for (const k of NUMBERS) if (typeof d[k] === 'number') o[k] = d[k];
  for (const k of FLAGS) if (typeof d[k] === 'number') o[k] = d[k] === 1;
  let changed = false;
  for (const k of MAPS) {
    if (typeof d[k] !== 'number') continue;
    const t = (d[k] as number) < 0 ? null : tex(d[k] as number);
    if (o[k] !== t) { o[k] = t; changed = true; }
  }
  if (Array.isArray(d.clip)) {
    m.clippingPlanes = (d.clip as number[][]).map((c, i) => {
      const p = m.clippingPlanes?.[i] ?? new Plane();
      p.normal.set(c[0], c[1], c[2]); p.constant = c[3] ?? Infinity;
      return p;
    });
  }
  if (changed) m.needsUpdate = true;
}
function makeMat(d: MatDef, tex: (id: number) => Texture | null): Material {
  const C = MATS[(d.k ?? 'MeshLambertMaterial') as keyof typeof MATS] ?? MeshLambertMaterial;
  const m = new C();
  applyProps(m, d, tex);
  return m;
}

// ---------- textures ----------
/** A picture: its image (a data URL) and how it's laid on. */
export interface TexDef { img: string; w: number; h: number; p: number[] }
/** wrapS, wrapT, repeat, offset, anisotropy, flipY, magFilter, minFilter, mipmaps. */
const texParams = (t: Texture) => [t.wrapS, t.wrapT, t.repeat.x, t.repeat.y, t.offset.x, t.offset.y, t.anisotropy, t.flipY ? 1 : 0,
  t.magFilter, t.minFilter, t.generateMipmaps ? 1 : 0];
function picture(t: Texture): string {
  const img = t.image as HTMLCanvasElement | undefined;
  try { return img && typeof img.toDataURL === 'function' ? img.toDataURL() : ''; } catch { return ''; }
}
function texDef(t: Texture): TexDef {
  const img = t.image as { width?: number; height?: number } | undefined;
  return { img: picture(t), w: img?.width ?? 1, h: img?.height ?? 1, p: texParams(t) };
}
/** Draws a picture that came as a data URL onto a texture's canvas, once it's loaded. */
function paint(t: Texture, url: string) {
  const c = t.image as HTMLCanvasElement | undefined;
  if (!url || !c || typeof c.getContext !== 'function' || typeof Image === 'undefined') return;
  const img = new Image();
  img.onload = () => {
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    t.needsUpdate = true;
  };
  img.src = url;
}
function makeTex(d: TexDef): Texture {
  const c = document.createElement('canvas');
  c.width = d.w; c.height = d.h;
  const t = new CanvasTexture(c);
  const [ws, wt, rx, ry, ox, oy, an, fy, mag, min, mip] = d.p;
  Object.assign(t, { wrapS: ws, wrapT: wt, anisotropy: an, flipY: fy === 1, magFilter: mag, minFilter: min, generateMipmaps: mip === 1 });
  t.repeat.set(rx, ry); t.offset.set(ox, oy);
  paint(t, d.img);
  return t;
}

// ---------- the scene at boot ----------
/** What a thing looked like when the guest last heard (or at boot): parent, transform, shown, and what it's made of. */
interface State {
  p: number;
  t: number[];
  v: boolean;
  geo: BufferGeometry | null;
  mat: Material | Material[] | null;
  light: string;
  dg: boolean;
  ro: number;
}
const lightSig = (o: Object3D) => o instanceof PointLight ? `${o.color.getHex()},${o.intensity.toFixed(3)}` : '';
function stateOf(o: Object3D, p: number): State {
  return {
    p, t: quant(o), v: o.visible,
    geo: drawn(o) ? o.geometry : null,
    mat: drawn(o) || o instanceof Sprite ? o.material as Material | Material[] : null,
    light: lightSig(o), dg: o instanceof Person && o.disguised, ro: o.renderOrder,
  };
}
const matsOf = (o: Object3D): Material[] => {
  if (!(drawn(o) || o instanceof Sprite)) return [];
  const m = o.material as Material | Material[];
  return Array.isArray(m) ? m : [m];
};
/** A material's properties, compared one by one to spot changes. */
const defOf = (m: Material, tex: (t: Texture) => number): MatDef => ({ ...matProps(m, tex), k: m.type });
const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);
const mapsOf = (m: Material) => MAPS.map(k => (m as unknown as Loose)[k] as Texture | null).filter((t): t is Texture => !!t);

/**
 * The scene as every phone builds it while the game loads (before any save is loaded): each thing, and what it's made
 * of, by id. Leaves out `skip` (the player, who's someone else on each phone) and what each phone keeps for itself.
 */
export interface Boundary {
  nodes: Map<number, Object3D>;
  state: Map<Object3D, State>;
  geos: Map<number, BufferGeometry>;
  mats: Map<number, Material>;
  texs: Map<number, Texture>;
  /** Each material's properties, and each texture's version, as built. */
  sigs: Map<Material, MatDef>;
  vers: Map<Texture, number>;
  /** A fingerprint to check two phones built the same scene. */
  print: string;
}
export function captureBoundary(root: Object3D, skip: Object3D, counts: string): Boundary {
  const b: Boundary = {
    nodes: new Map(), state: new Map(), geos: new Map(), mats: new Map(), texs: new Map(), sigs: new Map(), vers: new Map(), print: '',
  };
  let h = 5381;
  const mix = (n: number) => { h = (h * 33 + n) | 0; };
  const visit = (o: Object3D, p: number) => {
    if (o === skip || o.userData.net === 'local') return;
    b.nodes.set(nid(o), o);
    b.state.set(o, stateOf(o, p));
    mix(nid(o)); mix(p); mix(kindOf(o).charCodeAt(0));
    if (drawn(o) && !o.userData.baked) b.geos.set(gid(o.geometry), o.geometry);
    for (const m of matsOf(o)) {
      b.mats.set(mid(m), m);
      b.sigs.set(m, defOf(m, tid));
      for (const t of mapsOf(m)) { b.texs.set(tid(t), t); b.vers.set(t, t.version); }
    }
    if (o.userData.net !== 'self') for (const c of o.children) visit(c, nid(o));
  };
  for (const c of root.children) visit(c, -1);
  b.print = `${counts}|${b.nodes.size}|${b.geos.size}|${b.mats.size}|${b.texs.size}|${(h >>> 0).toString(36)}`;
  return b;
}

// ---------- the host ----------
/** Bits of an update's mask: the nine transform values, then the rest (each followed by its value). */
const SHOWN = 1 << 9, PARENT = 1 << 10, GEO = 1 << 11, MAT = 1 << 12, LIGHT = 1 << 13, DISGUISE = 1 << 14, ORDER = 1 << 15;
/** Texture redraws are sent at most this often each (a tile filling up redraws every frame). */
const REDRAW_EVERY = 250;

export class Encoder {
  private known = new Map<Object3D, State>();
  private geos = new Set<BufferGeometry>();
  private mats = new Map<Material, MatDef>();
  private texs = new Map<Texture, { v: number; at: number }>();
  private passes = 0;

  constructor(private readonly root: Object3D, private readonly b: Boundary) { this.reset(); }

  /** Back to what a phone that's just loaded has: the next encode is everything since (a keyframe). */
  reset() {
    this.known = new Map([...this.b.state].map(([o, s]) => [o, { ...s, t: [...s.t] }]));
    this.geos = new Set(this.b.geos.values());
    // as built: anything changed since then gets sent
    this.mats = new Map(this.b.sigs);
    this.texs = new Map([...this.b.vers].map(([t, v]) => [t, { v, at: 0 }]));
  }

  /** What's changed since the last call. `now` in milliseconds. */
  encode(now: number): Delta | null {
    const d: Delta = { a: [], r: [], u: [], g: {}, m: {}, x: {}, mu: [], xu: [] };
    const seen = new Set<Object3D>();
    const visit = (o: Object3D, p: number) => {
      if (o.userData.net === 'local') return;
      seen.add(o);
      const s = this.known.get(o);
      if (s) this.diff(o, s, p, d, now); else this.add(o, p, d, now);
      if (o.userData.net !== 'self') for (const c of o.children) visit(c, nid(o));
    };
    for (const c of this.root.children) visit(c, -1);
    for (const o of this.known.keys()) if (!seen.has(o)) { d.r.push(nid(o)); this.known.delete(o); }
    this.materials(d, now);
    this.textures(d, now);
    if (++this.passes % 50 === 0) this.release(d);
    return empty(d) ? null : d;
  }

  private add(o: Object3D, p: number, d: Delta, now: number) {
    const a: Add = { i: nid(o), p, k: kindOf(o), t: quant(o), v: o.visible ? 1 : 0 };
    if (o.renderOrder) a.ro = o.renderOrder;
    const sh = (o.castShadow ? 1 : 0) | (o.receiveShadow ? 2 : 0);
    if (sh) a.sh = sh;
    if (!o.frustumCulled) a.fc = 0;
    if (o instanceof Person) {
      a.rc = [o.color, o.look, o.style];
      a.o = o.own.map(nid);
      if (o.disguised) a.dg = 1;
      // built by the recipe on the guest's phone, as they were made; what's happened to them since comes as changes
      for (const c of o.own) this.known.set(c, { p: NaN, t: new Array<number>(9).fill(NaN), v: !c.visible, geo: null, mat: null, light: '', dg: false, ro: NaN });
    } else {
      if (drawn(o) && !o.userData.baked) a.g = this.geo(o.geometry, d);
      if ((drawn(o) || o instanceof Sprite) && !o.userData.baked) a.m = this.mat(o.material as Material | Material[], d, now);
      if (o instanceof PointLight) a.l = [o.color.getHex(), o.intensity, o.distance, o.decay];
    }
    d.a.push(a);
    this.known.set(o, stateOf(o, p));
  }

  private diff(o: Object3D, s: State, p: number, d: Delta, now: number) {
    const t = quant(o), u: number[] = [nid(o), 0];
    let mask = 0;
    for (let k = 0; k < 9; k++) if (t[k] !== s.t[k]) { mask |= 1 << k; u.push(t[k]); s.t[k] = t[k]; }
    if (o.visible !== s.v) { mask |= SHOWN; u.push(o.visible ? 1 : 0); s.v = o.visible; }
    if (p !== s.p) { mask |= PARENT; u.push(p); s.p = p; }
    if (!o.userData.baked) {
      if (drawn(o) && o.geometry !== s.geo) { mask |= GEO; u.push(this.geo(o.geometry, d)); s.geo = o.geometry; }
      if ((drawn(o) || o instanceof Sprite) && o.material !== s.mat) {
        mask |= MAT;
        const m = this.mat(o.material as Material | Material[], d, now);
        u.push(...(Array.isArray(m) ? [-m.length - 1, ...m] : [m]));
        s.mat = o.material as Material | Material[];
      }
    }
    if (o instanceof PointLight) {
      const sig = lightSig(o);
      if (sig !== s.light) { mask |= LIGHT; u.push(o.color.getHex(), Math.round(o.intensity * Q)); s.light = sig; }
    }
    if (o instanceof Person && o.disguised !== s.dg) { mask |= DISGUISE; u.push(o.disguised ? 1 : 0); s.dg = o.disguised; }
    if (o.renderOrder !== s.ro) { mask |= ORDER; u.push(o.renderOrder); s.ro = o.renderOrder; }
    if (mask) { u[1] = mask; d.u.push(u); }
  }

  private geo(g: BufferGeometry, d: Delta) {
    if (!this.geos.has(g)) { d.g[gid(g)] = geoDef(g); this.geos.add(g); }
    return gid(g);
  }

  private mat(m: Material | Material[], d: Delta, now: number): number | number[] {
    if (Array.isArray(m)) return m.map(x => this.mat(x, d, now) as number);
    if (!this.mats.has(m)) {
      const def = defOf(m, t => this.tex(t, d, now));
      d.m[mid(m)] = def;
      this.mats.set(m, def);
    }
    return mid(m);
  }

  private tex(t: Texture, d: Delta, now: number) {
    if (!this.texs.has(t)) { d.x[tid(t)] = texDef(t); this.texs.set(t, { v: t.version, at: now }); }
    return tid(t);
  }

  /** Materials whose colours or other properties changed (a mood face, the cleaver's cut): just what changed. */
  private materials(d: Delta, now: number) {
    for (const [m, was] of this.mats) {
      if (m.userData.local) continue;
      const def = defOf(m, t => this.tex(t, d, now)), diff: MatDef = {};
      let changed = false;
      for (const k in def) if (!same(def[k], was[k])) { diff[k] = def[k]; changed = true; }
      if (changed) { this.mats.set(m, def); d.mu.push([mid(m), diff]); }
    }
  }

  /** Pictures redrawn since they were sent (an order bubble's patience ring, a price board). */
  private textures(d: Delta, now: number) {
    for (const [t, sent] of this.texs) {
      if (t.userData.local || t.version === sent.v || now - sent.at < REDRAW_EVERY) continue;
      d.xu.push([tid(t), picture(t)]);
      this.texs.set(t, { v: t.version, at: now });
    }
  }

  /** Lets go of materials and pictures nothing uses any more (customers who've gone home took theirs). */
  private release(d: Delta) {
    const used = new Set<Material>(), pics = new Set<Texture>(), shapes = new Set<BufferGeometry>();
    for (const o of this.known.keys()) {
      for (const m of matsOf(o)) { used.add(m); for (const t of mapsOf(m)) pics.add(t); }
      if (drawn(o)) shapes.add(o.geometry);
    }
    const rel = { g: [] as number[], m: [] as number[], x: [] as number[] };
    for (const m of this.mats.keys()) if (!used.has(m) && !this.b.mats.has(mid(m))) { this.mats.delete(m); rel.m.push(mid(m)); }
    for (const t of this.texs.keys()) if (!pics.has(t) && !this.b.texs.has(tid(t))) { this.texs.delete(t); rel.x.push(tid(t)); }
    for (const g of this.geos) if (!shapes.has(g) && !this.b.geos.has(gid(g))) { this.geos.delete(g); rel.g.push(gid(g)); }
    if (rel.g.length || rel.m.length || rel.x.length) d.rel = rel;
  }
}

// ---------- the guest ----------
interface Ease { from: number[]; to: number[]; t0: number }
/** How the guest's phone builds a person (characters.ts), and dresses one as the singer or takes it off. */
export interface People {
  make(color: number, look: string, style: unknown): Person;
  disguise(p: Person, on: boolean): void;
}

export class Decoder {
  readonly nodes = new Map<number, Object3D>();
  private geos = new Map<number, BufferGeometry>();
  private mats = new Map<number, Material>();
  private texs = new Map<number, Texture>();
  /** Where each thing is headed, and where it's easing from. */
  private ease = new Map<Object3D, Ease>();
  private target = new WeakMap<Object3D, number[]>();
  /** How long things take to ease to where they're told: about the time between messages. */
  dur = 100;
  /** The host's id for this phone's own player, which this phone moves itself. */
  me = -1;
  /** Things this phone moves itself: its player and what it's carrying. */
  held = new Set<Object3D>();
  /** What every phone built while loading: never forgotten, as the game's own code still uses it. */
  private boot: Set<number>;

  constructor(private readonly root: Object3D, private readonly b: Boundary, private readonly people: People, private readonly mine: Person) {
    for (const [i, o] of b.nodes) this.nodes.set(i, o);
    this.boot = new Set(b.nodes.keys());
    for (const [i, g] of b.geos) this.geos.set(i, g);
    for (const [i, m] of b.mats) this.mats.set(i, m);
    for (const [i, t] of b.texs) this.texs.set(i, t);
  }

  private tex = (i: number) => this.texs.get(i) ?? null;
  private geo(i: number | undefined) { return (i === undefined ? undefined : this.geos.get(i)) ?? new BufferGeometry(); }
  private mat(i: number | number[] | undefined): Material | Material[] {
    if (Array.isArray(i)) return i.map(x => this.mat(x) as Material);
    return (i === undefined ? undefined : this.mats.get(i)) ?? new MeshBasicMaterial({ visible: false });
  }

  apply(d: Delta, now: number) {
    for (const [i, def] of Object.entries(d.x)) this.texs.set(+i, makeTex(def));
    for (const [i, def] of Object.entries(d.g)) this.geos.set(+i, makeGeo(def));
    for (const [i, def] of Object.entries(d.m)) this.mats.set(+i, makeMat(def, this.tex));
    for (const a of d.a) this.add(a);
    for (const i of d.r) {
      const o = this.nodes.get(i);
      if (!o) continue;
      o.removeFromParent();
      this.ease.delete(o);
      if (o !== this.mine && !this.held.has(o) && !this.boot.has(i)) this.nodes.delete(i);
    }
    for (const u of d.u) this.update(u, now);
    for (const [i, def] of d.mu) { const m = this.mats.get(i); if (m) applyProps(m, def, this.tex); }
    for (const [i, url] of d.xu) { const t = this.texs.get(i); if (t) paint(t, url); }
    if (d.rel) {
      for (const i of d.rel.g) { this.geos.get(i)?.dispose(); this.geos.delete(i); }
      for (const i of d.rel.m) { this.mats.get(i)?.dispose(); this.mats.delete(i); }
      for (const i of d.rel.x) { this.texs.get(i)?.dispose(); this.texs.delete(i); }
    }
  }

  /**
   * A keyframe: everything as the host has it now, for a guest who's just joined or missed some messages. It only
   * says what's different from how every phone built the scene, so everything goes back to that first; and anything
   * built since that it doesn't mention is gone.
   */
  key(d: Delta, now: number) {
    for (const o of this.b.nodes.values()) {
      const s = this.b.state.get(o)!, parent = s.p < 0 ? this.root : this.nodes.get(s.p);
      if (parent && o.parent !== parent) parent.add(o);
      this.ease.delete(o);
      this.target.delete(o);
      setTransform(o, s.t);
      o.visible = s.v;
      o.renderOrder = s.ro;
      if (s.geo && drawn(o)) o.geometry = s.geo;
      if (s.mat) (o as Mesh).material = s.mat;
      if (o instanceof PointLight && s.light) { const [c, k] = s.light.split(',').map(Number); o.color.setHex(c); o.intensity = k; }
    }
    for (const [m, sig] of this.b.sigs) applyProps(m, sig, this.tex);
    const named = new Set<number>();
    for (const a of d.a) { named.add(a.i); a.o?.forEach(i => named.add(i)); }
    for (const [i, o] of this.nodes) {
      if (this.boot.has(i) || named.has(i) || o === this.mine || this.held.has(o)) continue;
      o.removeFromParent();
      this.ease.delete(o);
      this.nodes.delete(i);
    }
    this.apply(d, now);
  }

  private make(a: Add): Object3D {
    if (a.i === this.me) return this.mine;
    switch (a.k) {
      case 'H': { const [c, look, style] = a.rc!; return this.people.make(c, look, style); }
      case 'M': return new Mesh(this.geo(a.g), this.mat(a.m));
      case 'S': return new Sprite(this.mat(a.m) as SpriteMaterial);
      case 'P': return new Points(this.geo(a.g), this.mat(a.m));
      case 'L': return new LineSegments(this.geo(a.g), this.mat(a.m));
      case 'N': return new Line(this.geo(a.g), this.mat(a.m));
      case 'PL': { const [c, k, dist, decay] = a.l ?? [0xFFFFFF, 1, 0, 2]; return new PointLight(c, k, dist, decay); }
      case 'G': return new Group();
      default: return new Object3D();
    }
  }

  private add(a: Add) {
    let o = this.nodes.get(a.i);
    if (!o) { o = this.make(a); this.nodes.set(a.i, o); }
    if (a.k === 'H' && a.o && o instanceof Person) {
      // what the person's constructor built, one for one
      a.o.forEach((id, j) => {
        const c = (o as Person).own[j];
        if (!c) return;
        this.nodes.set(id, c);
        if (o === this.mine) this.held.add(c);
      });
      if (o !== this.mine && (a.dg === 1) !== o.disguised) this.people.disguise(o, a.dg === 1);
    }
    const parent = a.p < 0 ? this.root : this.nodes.get(a.p);
    if (parent && o.parent !== parent) parent.add(o);
    if (this.held.has(o) || o === this.mine) return;
    this.ease.delete(o);
    this.target.set(o, [...a.t]);
    setTransform(o, a.t);
    o.visible = a.v === 1;
    o.renderOrder = a.ro ?? 0;
    o.castShadow = !!((a.sh ?? 0) & 1); o.receiveShadow = !!((a.sh ?? 0) & 2);
    o.frustumCulled = a.fc !== 0;
    if (a.g !== undefined && drawn(o)) o.geometry = this.geo(a.g);
    if (a.m !== undefined && (drawn(o) || o instanceof Sprite)) (o as Mesh).material = this.mat(a.m);
  }

  private update(u: number[], now: number) {
    const o = this.nodes.get(u[0]);
    if (!o) return;
    const mask = u[1];
    let j = 2;
    const mine = o === this.mine || this.held.has(o);
    if (mask & 0x1FF) {
      const to = this.target.get(o) ?? quant(o);
      for (let k = 0; k < 9; k++) if (mask & (1 << k)) to[k] = u[j++];
      this.target.set(o, to);
      if (!mine) this.ease.set(o, { from: quant(o), to: [...to], t0: now });
    }
    if (mask & SHOWN) { const v = u[j++] === 1; if (!mine) o.visible = v; }
    if (mask & PARENT) {
      const p = u[j++], parent = p < 0 ? this.root : this.nodes.get(p);
      if (parent && o.parent !== parent && o !== this.mine) parent.add(o);
    }
    if (mask & GEO) { const g = u[j++]; if (drawn(o)) o.geometry = this.geo(g); }
    if (mask & MAT) {
      let m: number | number[] = u[j++];
      if (m < 0) { const n = -m - 1; m = u.slice(j, j + n); j += n; }
      if (drawn(o) || o instanceof Sprite) (o as Mesh).material = this.mat(m);
    }
    if (mask & LIGHT) {
      const c = u[j++], k = u[j++] / Q;
      if (o instanceof PointLight) { o.color.setHex(c); o.intensity = k; }
    }
    if (mask & DISGUISE) { const on = u[j++] === 1; if (o instanceof Person && o !== this.mine) this.people.disguise(o, on); }
    if (mask & ORDER) o.renderOrder = u[j++];
  }

  /** Eases everything on its way to where it was last told to be. Call every frame. */
  frame(now: number) {
    for (const [o, e] of this.ease) {
      const k = Math.min(1, (now - e.t0) / this.dur);
      const t = e.to.map((to, i) => {
        let from = e.from[i];
        // turn the short way round
        if (i >= 3 && i < 6) { const d = to - from, w = 2 * Math.PI * Q; from = to - (d - w * Math.round(d / w)); }
        return from + (to - from) * k;
      });
      // something that jumped (a fish back in the water, a plate onto the belt) goes straight there
      const jump = Math.hypot(e.to[0] - e.from[0], e.to[1] - e.from[1], e.to[2] - e.from[2]) > 3 * Q;
      setTransform(o, jump ? e.to : t);
      if (k >= 1 || jump) this.ease.delete(o);
    }
  }
}

