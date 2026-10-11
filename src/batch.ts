// Draw calls for things that stand still. The scenery is made of many small meshes (Low's especially: every post,
// plank and lantern is its own), and a phone pays for each one it draws, twice if it casts a shadow. So whatever has
// stood still for a moment is drawn merged with its neighbours: one mesh per material in each patch of the map, made
// of copies of them where they stand, while they're left out of the drawing. Anything that moves, hides, changes
// material or is taken away drops back out at once and is drawn by itself again; what keeps doing that stays out.
// Nothing is changed but how many calls it takes: the same shapes, in the same materials, in the same places, casting
// the same shadows (a baked mesh's plainer shadow copy, kit.ts, goes along with it).
import {
  BufferAttribute, BufferGeometry, Color, FrontSide, Group, Material, Mesh, MeshLambertMaterial, type Object3D,
  type ShaderMaterial, Vector3,
} from 'three';
import { quietly } from './kit';
import { painted } from './render';

/** Metres across a patch of the map: merged meshes are still left out where they're off screen, a patch at a time. */
const CELL = 12;
/** Seconds something has to stand still before it's merged; longer once it's been seen to move. */
const STILL = 1, SETTLED = 20;
/** Vertices merged a frame for things joining (things leaving are always taken out at once). */
const BUDGET = 40000;
/** Times out (fading over half a minute each) before something's left out (it keeps moving or blinking). */
const RESTLESS = 2;

type State = 'out' | 'joining' | 'in';
interface Member {
  o: Mesh; geo: BufferGeometry; mat: Material; cast: boolean; recv: boolean; ver: number; at: number[]; colour: number;
  still: number; moves: number; strikes: number; state: State; batch: Batch | null; mask: number;
}
interface Batch { key: string; mat: Material; cast: boolean; recv: boolean; members: Set<Member>; mesh: Mesh | null; now: boolean }

const members = new Set<Member>(), known = new WeakSet<Object3D>(), batches = new Map<string, Batch>(), dirty = new Set<Batch>();
const plain = Mesh.prototype, centre = new Vector3(), tint = new Color();
let root: Object3D, drawn: Group, last = 0, scan = 0, rebuilds = 0;

/** Starts merging what stands still in `scene`, before each time it's drawn. */
export function batchStill(scene: Object3D) {
  root = scene;
  drawn = quietly(() => new Group());
  drawn.name = 'batches';
  drawn.userData.noBatch = true;
  scene.add(drawn);
  scene.onBeforeRender = sync;
}

/** A plain mesh, drawn the ordinary way, that nothing has said must be left alone. */
function fits(o: Object3D): o is Mesh {
  if (o.constructor !== Mesh) return false; // not instanced, skinned or anything else that draws its own way
  const m = o as Mesh, g = m.geometry;
  if (Array.isArray(m.material) || !m.frustumCulled || m.renderOrder) return false;
  // a shader of its own may work from the mesh's own coordinates (the sea's swell), which merging would move
  const mat = m.material as Material;
  if ((mat as ShaderMaterial).isShaderMaterial || mat.onBeforeCompile !== Material.prototype.onBeforeCompile) return false;
  // the kit's baked meshes draw their own shape, and their shadow as a plainer copy after it (kit.ts baked)
  const copy: number | undefined = m.userData.shadowFrom;
  if (m.onBeforeRender !== plain.onBeforeRender || (copy === undefined && m.onBeforeShadow !== plain.onBeforeShadow)) return false;
  if (g.drawRange.start || g.drawRange.count !== (copy ?? Infinity) || Object.keys(g.morphAttributes).length) return false;
  for (let p: Object3D | null = o as Object3D; p; p = p.parent) if (p.userData.noBatch) return false;
  return true;
}
/**
 * A plain colour (render.ts' `mat`, one material a colour): merged with every other plain colour, each painted on as
 * vertex colours, which shade exactly like the material's colour (render.ts' `painted`).
 */
function plainColour(mat: Material) {
  if (!(mat instanceof MeshLambertMaterial) || mat.constructor !== MeshLambertMaterial || mat.vertexColors) return false;
  const l = mat as MeshLambertMaterial;
  return !l.map && !l.lightMap && !l.aoMap && !l.emissiveMap && !l.specularMap && !l.alphaMap && !l.envMap && !l.bumpMap
    && !l.normalMap && !l.displacementMap && l.emissive.getHex() === 0 && l.side === FrontSide && !l.flatShading
    && !l.wireframe && l.fog && l.depthTest && l.depthWrite && l.colorWrite && !l.polygonOffset && !l.alphaTest
    && l.onBeforeCompile === Material.prototype.onBeforeCompile;
}
const colourOf = (mat: Material) => (mat as MeshLambertMaterial).color?.getHex() ?? -1;
/** The attributes its material draws with, or null if one of them can't be merged. */
function attributes(m: Member) {
  const a = m.mat as Material & { map?: unknown; vertexColors?: boolean };
  const names = ['position', 'normal', ...(a.map ? ['uv'] : []), ...(a.vertexColors ? ['color'] : [])];
  for (const n of names) {
    const at = m.geo.attributes[n];
    if (!at || 'isInterleavedBufferAttribute' in at) return null;
  }
  return names;
}

function discover() {
  root.traverse(o => {
    if (known.has(o) || !(o as Mesh).isMesh) return;
    known.add(o);
    if (!fits(o)) return;
    const m: Member = {
      o, geo: o.geometry, mat: o.material as Material, cast: o.castShadow, recv: o.receiveShadow, ver: -1, at: [], colour: 0,
      still: 0, moves: 0, strikes: 0, state: 'out', batch: null, mask: o.layers.mask,
    };
    snap(m);
    members.add(m);
  });
}
const version = (g: BufferGeometry) =>
  (g.attributes.position as BufferAttribute).version + ((g.attributes.normal as BufferAttribute | undefined)?.version ?? 0) + (g.index?.version ?? 0);
function snap(m: Member) {
  const o = m.o;
  m.geo = o.geometry; m.mat = o.material as Material; m.cast = o.castShadow; m.recv = o.receiveShadow;
  m.ver = version(m.geo); m.at = [...o.matrixWorld.elements]; m.colour = colourOf(m.mat);
}
function moved(m: Member) {
  const o = m.o, e = o.matrixWorld.elements;
  if (o.geometry !== m.geo || o.material !== m.mat || o.castShadow !== m.cast || o.receiveShadow !== m.recv) return true;
  if (version(m.geo) !== m.ver || colourOf(m.mat) !== m.colour) return true;
  for (let i = 0; i < 16; i++) if (e[i] !== m.at[i]) return true;
  return false;
}
/** Whether it's in the scene and showing: null when it's been taken out of the scene. */
function shown(o: Object3D) {
  let seen = o.visible, p = o;
  for (; p.parent; p = p.parent) seen &&= p.parent.visible;
  return p === root ? seen : null;
}

function leave(m: Member) {
  const b = m.batch;
  if (b) {
    b.members.delete(m);
    dirty.add(b);
    if (m.state === 'in') { b.now = true; m.o.layers.mask = m.mask; }
  }
  if (m.state !== 'out') m.strikes++;
  m.state = 'out'; m.batch = null;
}
function join(m: Member) {
  const names = attributes(m);
  if (!names) { m.strikes = Infinity; return; }
  const s = m.geo.boundingSphere ?? (m.geo.computeBoundingSphere(), m.geo.boundingSphere!);
  centre.copy(s.center).applyMatrix4(m.o.matrixWorld);
  const sig = names.map(n => { const a = m.geo.attributes[n]; return `${n}${a.itemSize}${a.array.constructor.name}${a.normalized}`; });
  const paint = plainColour(m.mat), key = `${paint ? 'paint' : m.mat.uuid}|${m.cast}|${m.recv}|${sig}|${Math.floor(centre.x / CELL)},${Math.floor(centre.z / CELL)}`;
  let b = batches.get(key);
  if (!b) batches.set(key, b = { key, mat: paint ? painted : m.mat, cast: m.cast, recv: m.recv, members: new Set(), mesh: null, now: false });
  b.members.add(m);
  m.batch = b; m.state = 'joining'; m.mask = m.o.layers.mask;
  dirty.add(b);
}

/** A copy of its shape where it stands, in the attributes its material uses; `own` of its indices are its own shape. */
interface Placed { g: BufferGeometry; own: number; copy: boolean }
function placed(m: Member): Placed {
  const g = new BufferGeometry(), n = m.geo.attributes.position.count;
  for (const a of attributes(m)!) g.setAttribute(a, m.geo.attributes[a].clone());
  g.setIndex(m.geo.index ? m.geo.index.clone() : new BufferAttribute(Uint32Array.from({ length: n }, (_, i) => i), 1));
  if (m.batch!.mat === painted && m.mat !== painted) {
    // its colour, a byte a channel (a colour from hex is a whole number of 255ths, so nothing's lost)
    tint.set(colourOf(m.mat));
    const n = g.attributes.position.count, c = new Uint8Array(n * 3), r = Math.round(tint.r * 255), gr = Math.round(tint.g * 255), b = Math.round(tint.b * 255);
    for (let i = 0; i < n; i++) { c[i * 3] = r; c[i * 3 + 1] = gr; c[i * 3 + 2] = b; }
    g.setAttribute('color', new BufferAttribute(c, 3, true));
  }
  g.applyMatrix4(m.o.matrixWorld);
  // turned inside out (scaled by a negative amount): wind its triangles the other way, as three.js would to draw it
  if (m.o.matrixWorld.determinant() < 0) {
    const ix = g.index!;
    for (let i = 0; i + 2 < ix.count; i += 3) { const t = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, t); }
  }
  const copy: number | undefined = m.o.userData.shadowFrom;
  return { g, own: copy ?? g.index!.count, copy: copy !== undefined };
}
/**
 * The parts in one geometry: all their own shapes, then (if it casts) all their shadows, each part's plainer copy or,
 * without one, its shape again; drawn up to `own`, and only the shadows in the shadow pass (as kit.ts baked).
 */
function merge(parts: Placed[], cast: boolean) {
  let verts = 0, own = 0, shadow = 0;
  for (const p of parts) { verts += p.g.attributes.position.count; own += p.own; if (cast) shadow += p.copy ? p.g.index!.count - p.own : p.own; }
  const g = new BufferGeometry();
  for (const [n, a0] of Object.entries(parts[0].g.attributes) as [string, BufferAttribute][]) {
    const Typed = a0.array.constructor as new (n: number) => typeof a0.array, out = new Typed(verts * a0.itemSize);
    let at = 0;
    for (const p of parts) { const a = p.g.attributes[n].array; out.set(a, at); at += a.length; }
    g.setAttribute(n, new BufferAttribute(out, a0.itemSize, a0.normalized));
  }
  const index = verts > 65535 ? new Uint32Array(own + shadow) : new Uint16Array(own + shadow);
  let base = 0, i = 0, j = own;
  for (const p of parts) {
    const ix = p.g.index!.array;
    for (let k = 0; k < p.own; k++) index[i++] = ix[k] + base;
    if (cast) for (let k = p.copy ? p.own : 0, end = p.copy ? ix.length : p.own; k < end; k++) index[j++] = ix[k] + base;
    base += p.g.attributes.position.count;
  }
  g.setIndex(new BufferAttribute(index, 1));
  return { g, own, shadow };
}
/** Merges a batch's members afresh; returns how many vertices that took. */
function rebuild(b: Batch) {
  b.now = false;
  rebuilds++;
  if (b.mesh) { drawn.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh = null; }
  if (!b.members.size) { batches.delete(b.key); return 0; }
  const parts = [...b.members].map(placed);
  const { g: geo, own, shadow } = merge(parts, b.cast);
  parts.forEach(p => p.g.dispose());
  const mesh = b.mesh = new Mesh(geo, b.mat);
  mesh.castShadow = shadow > 0; mesh.receiveShadow = b.recv; mesh.matrixAutoUpdate = false;
  if (b.cast) {
    geo.setDrawRange(0, own);
    mesh.onBeforeShadow = () => geo.setDrawRange(own, Infinity);
    mesh.onAfterShadow = () => geo.setDrawRange(0, own);
  }
  drawn.add(b.mesh);
  for (const m of b.members) { m.state = 'in'; m.o.layers.mask = 0; }
  return geo.attributes.position.count;
}

/** Each frame, before it's drawn (the world's matrices are up to date): who's still, who's moved, and the merging. */
function sync() {
  const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if ((scan -= dt) <= 0) { scan = 0.5; discover(); }
  quietly(() => {
    for (const m of members) {
      m.strikes = Math.max(0, m.strikes - dt / 30);
      const seen = shown(m.o);
      if (seen === null) { leave(m); members.delete(m); known.delete(m.o); continue; }
      const move = moved(m);
      if (move || !seen || (m.mat as Material).transparent || !m.mat.visible) {
        if (m.state !== 'out') leave(m);
        if (move) { snap(m); m.moves++; }
        m.still = 0;
        continue;
      }
      if (m.state !== 'out' || (m.still += dt) < (m.moves ? SETTLED : STILL) || m.strikes >= RESTLESS) continue;
      join(m);
    }
    let budget = BUDGET;
    for (const b of dirty) {
      if (!b.now && budget <= 0) continue;
      budget -= rebuild(b);
      dirty.delete(b);
    }
  });
}

/** How much is merged, and how often it's been merged afresh (for the tests). */
export function batchInfo() {
  const n = { out: 0, joining: 0, in: 0, restless: 0, batches: batches.size, rebuilds };
  for (const m of members) { n[m.state]++; if (m.strikes >= RESTLESS) n.restless++; }
  return n;
}
