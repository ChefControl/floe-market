// The kit for drawing things the way the people are drawn (characters.ts): low poly but rounded, painted rather than
// textured, many little shapes baked into one mesh, and packed small for a phone's memory. Scenery, props and the
// stage's sets are built with it, each as a High version beside the plainer Low one it replaces (graphics.ts).
import {
  Box3, BoxGeometry, BufferAttribute, BufferGeometry, Color, CylinderGeometry, Euler, ExtrudeGeometry,
  type ExtrudeGeometryOptions, Float32BufferAttribute, IcosahedronGeometry, LatheGeometry, type Material, Matrix3, Matrix4,
  Mesh, MeshLambertMaterial, type Object3D, Quaternion, SphereGeometry, TorusGeometry, TubeGeometry, Vector3,
} from 'three';
import { highBuilt, isHigh, onQuality } from './graphics';
import { painted } from './render';
import { amount, onBlend, type Swatch } from './season';

// ---------- colours ----------
/** `c` darker (k under 1) or lighter, for seams, edges and shadows. */
export function shade(c: number, k: number) {
  const ch = (s: number) => Math.min(255, Math.round(((c >> s) & 255) * k));
  return ch(16) << 16 | ch(8) << 8 | ch(0);
}
/** `c` mixed `k` of the way toward `to`. */
export function mix(c: number, to: number, k: number) {
  const ch = (s: number) => Math.round(((c >> s) & 255) * (1 - k) + ((to >> s) & 255) * k);
  return ch(16) << 16 | ch(8) << 8 | ch(0);
}

// ---------- the game's luck ----------
// three.js names everything it makes with Math.random, which is the game's luck (the orders, the fish, the
// customers). Scenery is built with its own dice instead, so how the world looks never changes how the game plays.
/** A small seeded generator (mulberry32). */
export function dice(seed: number) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let scenery = dice(0x5CE4E);
/** Runs `f` with Math.random swapped for the scenery's own dice (or `d`), then puts the game's luck back. */
export function quietly<T>(f: () => T, d: () => number = scenery): T {
  const luck = Math.random;
  Math.random = d;
  try { return f(); } finally { Math.random = luck; }
}
/** A number between a and b from the scenery's dice (use inside `quietly`, or anywhere: it never touches the luck). */
export const jitter = (a: number, b: number) => a + scenery() * (b - a);
/** Runs `f` with dice of its own, `d`, for the scenery's as well as the luck: for something built later than the rest
 *  (the cellar, cellar.ts), which then moves neither on for what's built after it. */
export function apart<T>(f: () => T, d: () => number): T {
  const theirs = scenery;
  scenery = d;
  try { return quietly(f, d); } finally { scenery = theirs; }
}

// ---------- shapes ----------
const boxes = new Map<string, BufferGeometry>(), bevelled = new WeakMap<BufferGeometry, number[]>();
const corner = new Vector3(), e1 = new Vector3(), e2 = new Vector3();
/**
 * A box with its edges bevelled off, `r` in from each edge: a flat face each side, a flat strip along each edge and a
 * little triangle at each corner, 44 triangles in all. Shared by size. The six faces are BoxGeometry's own, shrunk in
 * (same order, texture coordinates and material groups, so a picture lies on it as on a plain box); the bevels go with
 * the first material, the sides'.
 */
export function rbox(w: number, h: number, d: number, r = 0.03) {
  const key = `${w},${h},${d},${r}`;
  let g = boxes.get(key);
  if (g) return g;
  const half = [w / 2, h / 2, d / 2], rr = Math.min(r, ...half) * 0.999;
  const box = new BoxGeometry(w, h, d);
  const P = box.attributes.position, N = box.attributes.normal, UV = box.attributes.uv;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], index: number[] = [];
  for (let i = 0; i < P.count; i++) {
    for (let a = 0; a < 3; a++) {
      const v = P.getComponent(i, a);
      pos.push(Math.abs(N.getComponent(i, a)) > 0.5 ? v : v * (half[a] - rr) / half[a]);
    }
    nor.push(N.getX(i), N.getY(i), N.getZ(i));
    uv.push(UV.getX(i), UV.getY(i));
  }
  for (let k = 0; k < box.index!.count; k++) index.push(box.index!.getX(k));
  /** Adds a flat polygon (3 or 4 corners) facing `n`, wound to face it. */
  const poly = (pts: number[][], n: number[]) => {
    const base = pos.length / 3;
    for (const p of pts) { pos.push(...p); nor.push(...n); uv.push(0.5, 0.5); }
    e1.fromArray(pts[1]).sub(corner.fromArray(pts[0])); e2.fromArray(pts[2]).sub(corner);
    const flip = e1.cross(e2).dot(corner.fromArray(n)) < 0;
    const tri = (a: number, b: number, c: number) => index.push(base + a, ...(flip ? [base + c, base + b] : [base + b, base + c]));
    tri(0, 1, 2);
    if (pts.length === 4) tri(0, 2, 3);
  };
  const inner = half.map(x => x - rr), s2 = Math.SQRT1_2, s3 = 1 / Math.sqrt(3);
  // the strips along the edges: between the faces on axes a and b, running along the third
  for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) {
    const c = 3 - a - b;
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
      const at = (va: number, vb: number, vc: number) => { const p = [0, 0, 0]; p[a] = va; p[b] = vb; p[c] = vc; return p; };
      const n = [0, 0, 0]; n[a] = sa * s2; n[b] = sb * s2;
      poly([at(sa * half[a], sb * inner[b], -inner[c]), at(sa * half[a], sb * inner[b], inner[c]),
        at(sa * inner[a], sb * half[b], inner[c]), at(sa * inner[a], sb * half[b], -inner[c])], n);
    }
  }
  // and the corners
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    poly([[sx * half[0], sy * inner[1], sz * inner[2]], [sx * inner[0], sy * half[1], sz * inner[2]], [sx * inner[0], sy * inner[1], sz * half[2]]],
      [sx * s3, sy * s3, sz * s3]);
  }
  g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  for (const grp of box.groups) g.addGroup(grp.start, grp.count, grp.materialIndex);
  g.addGroup(36, index.length - 36, 0);
  boxes.set(key, g);
  // its shadow is a plain box, a little in from the bevels so they never shade themselves
  bevelled.set(g, [w - rr * 1.2, h - rr * 1.2, d - rr * 1.2]);
  return g;
}
/** An eight-sided tapering post or log (`top` and `bottom` radii); `open` leaves its ends off where they're covered. */
export const tube = (top: number, bottom: number, h: number, sides = 8, open = false) =>
  new CylinderGeometry(top, bottom, h, sides, 1, open);
/** Unit shapes, sized by scale: a ball, a smaller-detail dot, a dome (the top half of a ball), a ring. */
export const K = quietly(() => ({
  ball: new SphereGeometry(1, 7, 5),
  dot: new SphereGeometry(1, 6, 4),
  dome: new SphereGeometry(1, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2),
  post: tube(1, 1, 1, 8),
  ring: new TorusGeometry(1, 0.12, 5, 14),
}));

// ---------- baking ----------
/** One shape in one colour, moved into place by `m`. */
export interface Piece { geo: BufferGeometry; c: number; m: Matrix4 }

const nm = new Matrix3(), tint = new Color();
/** An attribute's x, y and z for each vertex in one flat array: its own array when it's kept that way already (as
 *  three.js' shapes keep theirs), read out one by one when it isn't. */
function xyz(a: BufferGeometry['attributes'][string]): ArrayLike<number> {
  if ((a as BufferAttribute).isBufferAttribute && a.itemSize === 3 && !a.normalized) return a.array;
  const out = new Float64Array(a.count * 3);
  for (let i = 0; i < a.count; i++) { out[i * 3] = a.getX(i); out[i * 3 + 1] = a.getY(i); out[i * 3 + 2] = a.getZ(i); }
  return out;
}
/**
 * Merges pieces into one geometry, each moved into place and painted its colour, writing straight into the finished
 * arrays. Packed small: no texture coordinates (it's painted, never textured), and colours and normals a byte each
 * rather than a float, 18 bytes a vertex instead of 44. Drawn with render.ts' `painted`. (Every game load bakes
 * thousands of pieces, so the moving's done here in the arrays, the sums just as Vector3's applyMatrix4, applyMatrix3
 * and normalize do them, to the same numbers.)
 */
export function pack(pieces: Piece[]) {
  let verts = 0, idx = 0;
  for (const p of pieces) {
    const n = p.geo.attributes.position.count;
    verts += n; idx += p.geo.index?.count ?? n;
  }
  const pos = new Float32Array(verts * 3), nor = new Int8Array(verts * 3), col = new Uint8Array(verts * 3);
  const index = verts > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
  let at = 0, ia = 0;
  for (const p of pieces) {
    const P = p.geo.attributes.position, I = p.geo.index, ps = xyz(P), ns = xyz(p.geo.attributes.normal);
    const e = p.m.elements, n = nm.getNormalMatrix(p.m).elements;
    tint.setHex(p.c);
    const r = Math.round(tint.r * 255), gr = Math.round(tint.g * 255), b = Math.round(tint.b * 255);
    for (let i = 0; i < P.count; i++, at++) {
      const j = i * 3, o = at * 3;
      const x = ps[j], y = ps[j + 1], z = ps[j + 2], w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
      pos[o] = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
      pos[o + 1] = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
      pos[o + 2] = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
      const a = ns[j], c = ns[j + 1], d = ns[j + 2];
      const nx = n[0] * a + n[3] * c + n[6] * d, ny = n[1] * a + n[4] * c + n[7] * d, nz = n[2] * a + n[5] * c + n[8] * d;
      const k = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
      nor[o] = Math.round(nx * k * 127); nor[o + 1] = Math.round(ny * k * 127); nor[o + 2] = Math.round(nz * k * 127);
      col[o] = r; col[o + 1] = gr; col[o + 2] = b;
    }
    const base = at - P.count;
    if (I) for (let k = 0, ix = I.array; k < I.count; k++) index[ia++] = ix[k] + base;
    else for (let k = 0; k < P.count; k++) index[ia++] = base + k;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('normal', new BufferAttribute(nor, 3, true));
  g.setAttribute('color', new BufferAttribute(col, 3, true));
  g.setIndex(new BufferAttribute(index, 1));
  return g;
}
/** How many indices `pack(pieces)` draws. */
pack.count = (pieces: Piece[]) => pieces.reduce((n, p) => n + (p.geo.index?.count ?? p.geo.attributes.position.count), 0);

/**
 * Packs a merged geometry's normals and colours (floats, as three.js' mergeGeometries leaves them) into a byte a
 * channel, in place, as `pack` stores them: a third of the memory, and drawn the same with `painted`. It makes no new
 * geometry, so it never draws from the luck. Anything else is left as it is.
 */
export function compact(g: BufferGeometry) {
  const N = g.attributes.normal, C = g.attributes.color;
  if (!N || !C || C.itemSize !== 3 || !(N.array instanceof Float32Array) || !(C.array instanceof Float32Array)) return;
  const ns = N.array, cs = C.array, nor = new Int8Array(ns.length), col = new Uint8Array(cs.length);
  for (let i = 0; i < ns.length; i++) { nor[i] = Math.round(ns[i] * 127); col[i] = Math.round(cs[i] * 255); }
  g.setAttribute('normal', new BufferAttribute(nor, 3, true));
  g.setAttribute('color', new BufferAttribute(col, 3, true));
}

// ---------- shadows ----------
// The sun's shadow map is a couple of centimetres a pixel, blurred over a few, so a shadow never shows the bevels,
// the round of a ball or a stud on a lid. Each baked mesh carries a plainer copy of itself after its own triangles
// that only the shadow pass draws: every shape with fewer sides (always inside the real one, so nothing shades
// itself), and the smallest left out.
const SPECK = 0.07;
const plainer = new WeakMap<BufferGeometry, BufferGeometry | null>();
/** The plainer shape `geo` casts its shadow as (itself when it's plain already), made once. */
function plainShape(geo: BufferGeometry): BufferGeometry {
  let p = plainer.get(geo);
  if (p === undefined) plainer.set(geo, p = quietly(() => plainerShape(geo)));
  return p ?? geo;
}
/** Makes the shadow shapes of `geos` now, as building something with them would (what's built later than it once was,
 *  cellar.ts), so what's built in the meantime finds them made, as it did. */
export const shadowsOf = (...geos: BufferGeometry[]) => { geos.forEach(plainShape); };
function plainerShape(geo: BufferGeometry): BufferGeometry | null {
  const a = (geo as BufferGeometry & { parameters?: Record<string, never> }).parameters ?? {}, box = bevelled.get(geo);
  if (box) return new BoxGeometry(...box);
  if (geo instanceof SphereGeometry && a.widthSegments > 5) {
    return new SphereGeometry(a.radius, 5, Math.min(a.heightSegments, a.thetaLength < 2 ? 2 : 3), a.phiStart, a.phiLength, a.thetaStart, a.thetaLength);
  }
  if (geo instanceof CylinderGeometry && a.radialSegments > 6) {
    return new CylinderGeometry(a.radiusTop, a.radiusBottom, a.height, 6, 1, a.openEnded, a.thetaStart, a.thetaLength);
  }
  if (geo instanceof LatheGeometry && a.segments > 6) return new LatheGeometry(a.points, 6, a.phiStart, a.phiLength);
  if (geo instanceof TorusGeometry && (a.radialSegments > 3 || a.tubularSegments > 10)) {
    return new TorusGeometry(a.radius, a.tube, 3, Math.min(a.tubularSegments, 10), a.arc);
  }
  if (geo instanceof TubeGeometry && a.radialSegments > 4) {
    return new TubeGeometry(a.path, Math.max(2, Math.ceil(a.tubularSegments / 2)), a.radius, 4, a.closed);
  }
  if (geo instanceof IcosahedronGeometry && a.detail > 0) return new IcosahedronGeometry(a.radius, 0);
  const o = a.options as ExtrudeGeometryOptions | undefined;
  if (geo instanceof ExtrudeGeometry && o && !o.extrudePath && (o.bevelEnabled || (o.curveSegments ?? 12) > 6)) {
    // square-edged, through the middle of where its bevels were
    const bevel = o.bevelEnabled ? o.bevelThickness ?? 0.2 : 0;
    return new ExtrudeGeometry(a.shapes, { ...o, curveSegments: Math.min(o.curveSegments ?? 12, 6), bevelEnabled: false, depth: (o.depth ?? 1) + bevel })
      .translate(0, 0, -bevel / 2);
  }
  return null;
}
const sizes = new WeakMap<BufferGeometry, Vector3>(), span = new Vector3();
/** The pieces' shadow: each plainer, the specks left out. */
function shadowOf(pieces: Piece[]) {
  const out: Piece[] = [];
  for (const p of pieces) {
    let size = sizes.get(p.geo);
    if (!size) sizes.set(p.geo, size = new Box3().setFromBufferAttribute(p.geo.attributes.position as BufferAttribute).getSize(new Vector3()));
    const e = p.m.elements;
    span.set(size.x * Math.hypot(e[0], e[1], e[2]), size.y * Math.hypot(e[4], e[5], e[6]), size.z * Math.hypot(e[8], e[9], e[10]));
    if (Math.max(span.x, span.y, span.z) < SPECK) continue;
    out.push({ ...p, geo: plainShape(p.geo) });
  }
  return out;
}
/** One mesh of `pieces` (see `pack`), receiving shadows, and if `cast` casting them as its plainer copy. */
export function baked(pieces: Piece[], cast: boolean, material: Material = painted) {
  if (!cast) {
    const m = new Mesh(pack(pieces), material);
    m.receiveShadow = true;
    m.userData.baked = true;
    return m;
  }
  const g = pack([...pieces, ...shadowOf(pieces)]), own = pack.count(pieces);
  g.setDrawRange(0, own);
  const m = new Mesh(g, material);
  m.castShadow = m.receiveShadow = true;
  m.userData.baked = true;
  m.userData.shadowFrom = own; // where its shadow's copy starts (batch.ts keeps it when it merges this)
  m.onBeforeShadow = () => g.setDrawRange(own, Infinity);
  m.onAfterShadow = () => g.setDrawRange(0, own);
  return m;
}

type V3 = [x: number, y: number, z: number];
const q = new Quaternion(), e = new Euler(), p3 = new Vector3(), s3 = new Vector3();
/** Collects shapes to bake into one mesh: `add` as many as you like, then `mesh()`. */
export class Build {
  readonly pieces: Piece[] = [];
  /** `geo` painted `c`, at (x, y, z), turned by `rot` (Euler XYZ) and sized by `scale` (one number for all three). */
  add(geo: BufferGeometry, c: number, x: number, y: number, z: number, rot?: V3 | null, scale?: V3 | number) {
    const sc = typeof scale === 'number' ? [scale, scale, scale] as V3 : scale ?? [1, 1, 1];
    q.setFromEuler(e.set(...(rot ?? [0, 0, 0])));
    this.pieces.push({ geo, c, m: new Matrix4().compose(p3.set(x, y, z), q, s3.set(...sc)) });
    return this;
  }
  /** Adds another build's pieces, moved by `m` (a group of shapes placed as one). */
  addAll(b: Build, m: Matrix4) {
    for (const p of b.pieces) this.pieces.push({ ...p, m: m.clone().multiply(p.m) });
    return this;
  }
  get empty() { return !this.pieces.length; }
  /** One mesh of everything added, receiving shadows, and casting them if `cast`. */
  mesh(cast = true, material: MeshLambertMaterial = painted) {
    return baked(this.pieces, cast, material);
  }
}
/** A matrix placing things at (x, y, z), turned `ry` about the vertical. */
export const at = (x: number, y: number, z: number, ry = 0) =>
  new Matrix4().compose(p3.set(x, y, z), q.setFromEuler(e.set(0, ry, 0)), s3.set(1, 1, 1));

// ---------- High and Low ----------
/**
 * Shows `high` on High graphics and `low` on Low (either may be left out), now and whenever the setting changes. The
 * two are usually groups under something that shows and hides itself (a counter that's open), which this leaves alone.
 */
export function detail(low: Object3D | null, high: Object3D | null) {
  if (high) letGo(high);
  const show = () => {
    const h = isHigh();
    if (low) low.visible = !h;
    if (high) high.visible = h;
  };
  show();
  onQuality(show);
}

/** What a High mesh holds on Potato, which never draws High (graphics.ts `highBuilt`): nothing (no corners at all, but
 *  a list of them, which batch.ts looks at). Made the first time it's needed, on dice of its own, so it takes nothing
 *  from the luck or the scenery's dice. */
let nothing: BufferGeometry | undefined;
/**
 * On Potato, lets go of the shapes `high` was built with, so a phone short of memory doesn't keep a world it'll never
 * draw. Only baked meshes give theirs up (the kit's, and the figures' merged ones, family.ts), since they never change
 * once made; the meshes and groups stay where they are, so anything that asks where a High piece is still gets an
 * answer. Their shadow's hooks go too: they hold the shape they swap the drawing of (`baked`, family.ts `castAs`), and
 * would keep it.
 */
export function letGo(high: Object3D) {
  if (highBuilt) return;
  nothing ??= quietly(() => new BufferGeometry().setAttribute('position', new Float32BufferAttribute([], 3)), dice(0x5907A70));
  high.traverse(o => {
    if (!(o instanceof Mesh && o.userData.baked)) return;
    o.geometry = nothing!;
    o.onBeforeShadow = Mesh.prototype.onBeforeShadow;
    o.onAfterShadow = Mesh.prototype.onAfterShadow;
  });
}

// ---------- the seasons ----------
/** The see-through copy of each material for each season's layer: shared, so the layers merge (batch.ts). */
const layers = new Map<Material, Map<string, MeshLambertMaterial>>();
/**
 * Fades a mesh in and out with the seasons: `k` is how much of it shows in each (snow caps in winter, fallen leaves in
 * autumn). It's drawn see-through while it fades, and hidden when it's gone.
 */
export function seasonLayer(m: Mesh, k: Swatch) {
  const base = m.material as MeshLambertMaterial, kinds = layers.get(base) ?? new Map<string, MeshLambertMaterial>();
  layers.set(base, kinds);
  let material = kinds.get(`${k}`);
  if (material) for (let i = 0; i < 4; i++) Math.random(); // the dice its own copy once took, so what's built after looks the same
  else kinds.set(`${k}`, material = base.clone());
  m.material = material;
  const show = () => {
    const a = amount(k);
    m.visible = a > 0.01;
    material.transparent = a < 0.99;
    material.opacity = a;
  };
  show();
  onBlend(show);
  return m;
}
