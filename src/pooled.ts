// Things that come and go by the hundred (the items carried and stacked, the Fugu Chips, the whole fish) drawn a call
// for each kind of piece rather than one each. A phone pays for every mesh it draws, twice if it casts a shadow, and
// these can't be merged as the scenery is (batch.ts): they keep moving, and most change their shape for the graphics
// as they're drawn (items.ts `looks`). So each stays an ordinary object to the game (the holders, the flights, the
// counters and the save move it, hide it and take it away as before), but isn't drawn itself: just before each frame
// is drawn, the world's matrices worked out, every piece of one that's showing is copied into an instanced mesh for
// its shape and material, one for all the pieces alike. The same shapes, in the same materials (a copy of each: three.js
// keys a material's shader on whether it's instanced), in the same places, casting and taking the same shadows.
//
// A piece that draws its own way (a cutting plane, see-through, a draw order, several materials, a shadow of its own,
// turned inside out) is drawn by itself while it does, and goes back into its pool after.
import {
  Box3, type BufferGeometry, type Camera, DynamicDrawUsage, Group, InstancedMesh, Material, Mesh, Object3D, type Scene,
  type ShaderMaterial, Sphere, type WebGLRenderer,
} from 'three';
import { dice, quietly } from './kit';

/** Instances a pool makes room for at first; it doubles when it fills. */
const ROOM = 16;
/** Frames something can be in a group that's out of the scene before it's let go: it draws itself from then on, if
 *  that group's ever put back (it's pooled again once it's put somewhere itself). */
const STRAY = 600;

/** A mesh in something drawn pooled, and the layers it's drawn on when it draws itself. */
interface Piece { m: Mesh; mask: number }
/** A pool: its mesh, how many it draws this frame, and the material its own is a copy of. */
interface Pool { mesh: InstancedMesh; n: number; src: Material }

const pieces = new WeakMap<Object3D, Piece[]>(), live = new Set<Object3D>(), strays = new Map<Object3D, number>();
/** The pools: by shape, then material, then whether they cast (2) and take (1) shadows. */
const pools = new Map<BufferGeometry, Map<Material, Pool[]>>(), used = new Set<Pool>();
/** Each material's copy for the pools. */
const copies = new Map<Material, Material>();
/** (pools are made as they're first needed, while playing: on dice of their own, so they take nothing from the luck) */
const own = dice(0x9001ED);
const plain = Mesh.prototype;
let root: Object3D | null = null, drawn: Group;

/**
 * Draws `o` (and everything in it now) pooled, from now on, and leaves it out of the merging (batch.ts: its pools draw
 * it, standing still or not). For things made over and over that move about; returns it.
 */
export function pooled<T extends Object3D>(o: T): T {
  const list: Piece[] = [];
  o.traverse(c => { if ((c as Mesh).isMesh) list.push({ m: c as Mesh, mask: c.layers.mask }); });
  pieces.set(o, list);
  o.userData.noBatch = true;
  o.addEventListener('added', () => live.add(o));
  o.addEventListener('removed', () => { live.delete(o); strays.delete(o); });
  if (o.parent) live.add(o);
  return o;
}

/** Starts drawing what's pooled in `scene`, each time it's drawn (after whatever it does before that already). */
export function drawPooled(scene: Scene) {
  root = scene;
  drawn = quietly(() => new Group(), own);
  drawn.name = 'pooled';
  drawn.matrixAutoUpdate = false;
  scene.add(drawn);
  const before = scene.onBeforeRender;
  scene.onBeforeRender = function (renderer, s, camera, ...rest) {
    before.call(this, renderer, s, camera, ...rest);
    fill(renderer, s, camera);
  };
}

/** Whether `o` and everything it's in are showing (1) or not (0), in the scene that's drawn; -1 in a group that's out
 *  of it. */
function inView(o: Object3D) {
  let p = o, seen = o.visible;
  for (; p.parent; p = p.parent) seen &&= p.parent.visible;
  return p !== root ? -1 : seen ? 1 : 0;
}
/** Whether piece `m` and everything it's in, up to the thing it's part of, `o`, are showing. */
function showing(m: Object3D, o: Object3D) {
  for (let p: Object3D | null = m; p && p !== o; p = p.parent) if (!p.visible) return false;
  return true;
}

/** The pool `m` is drawn in as it is now, or null if it has to draw itself. */
function poolOf(m: Mesh) {
  const mat = m.material as Material, g = m.geometry;
  if (Array.isArray(m.material) || m.constructor !== Mesh || m.renderOrder) return null;
  if (mat.transparent || !mat.visible || mat.clippingPlanes?.length || (mat as ShaderMaterial).isShaderMaterial
    || mat.onBeforeCompile !== Material.prototype.onBeforeCompile) return null;
  if (m.onBeforeShadow !== plain.onBeforeShadow || m.userData.shadowFrom !== undefined) return null;
  if (g.drawRange.start || g.drawRange.count !== Infinity || Object.keys(g.morphAttributes).length) return null;
  // turned inside out (scaled by a negative amount): three.js winds a mesh's triangles the other way, but not an instance's
  const e = m.matrixWorld.elements;
  if (e[0] * (e[5] * e[10] - e[6] * e[9]) - e[4] * (e[1] * e[10] - e[2] * e[9]) + e[8] * (e[1] * e[6] - e[2] * e[5]) < 0) return null;
  let byMat = pools.get(g);
  if (!byMat) pools.set(g, byMat = new Map());
  let four = byMat.get(mat);
  if (!four) byMat.set(mat, four = []);
  const k = (m.castShadow ? 2 : 0) + (m.receiveShadow ? 1 : 0);
  return four[k] ??= newPool(g, mat, m.castShadow, m.receiveShadow, ROOM);
}

function newPool(g: BufferGeometry, mat: Material, cast: boolean, recv: boolean, room: number): Pool {
  const mesh = quietly(() => {
    let copy = copies.get(mat);
    if (!copy) copies.set(mat, copy = mat.clone());
    return new InstancedMesh(g, copy, room);
  }, own);
  mesh.name = 'pooled';
  mesh.castShadow = cast; mesh.receiveShadow = recv;
  mesh.matrixAutoUpdate = false;
  // drawn wherever its instances are, so never culled; and no bounds (levelCull.ts never hides it for them, and
  // three.js never works them out over every instance: it sorts it by its middle)
  mesh.frustumCulled = false;
  mesh.boundingBox = new Box3(); mesh.boundingSphere = new Sphere();
  // (sent up afresh every frame it draws)
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.raycast = () => {};
  mesh.count = 0; mesh.visible = false;
  drawn.add(mesh);
  return { mesh, n: 0, src: mat };
}

/** Makes `p` twice the room, keeping what's in it. */
function grow(p: Pool) {
  const old = p.mesh, { mesh } = newPool(old.geometry, p.src, old.castShadow, old.receiveShadow, old.instanceMatrix.count * 2);
  mesh.instanceMatrix.array.set(old.instanceMatrix.array);
  drawn.remove(old);
  old.dispose();
  p.mesh = mesh;
}

/** Each frame, before it's drawn (the world's matrices are up to date): every showing piece into its pool. */
function fill(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
  for (const p of used) p.n = 0;
  for (const o of live) {
    const v = inView(o);
    if (v < 0) {
      // (in a group that's out of the scene: let go of after a while, so a group thrown away isn't kept for good)
      const n = (strays.get(o) ?? 0) + 1;
      if (n < STRAY) strays.set(o, n);
      else { strays.delete(o); live.delete(o); for (const p of pieces.get(o)!) p.m.layers.mask = p.mask; }
      continue;
    }
    if (strays.size) strays.delete(o);
    if (!v) continue;
    for (const piece of pieces.get(o)!) {
      const m = piece.m;
      if (!showing(m, o)) continue;
      // (what it does as it's drawn: its look for the graphics, items.ts, and anything put on top of that)
      if (m.onBeforeRender !== plain.onBeforeRender) m.onBeforeRender(renderer, scene, camera, m.geometry, m.material as Material, null!);
      const p = poolOf(m);
      if (!p) { m.layers.mask = piece.mask; continue; }
      m.layers.mask = 0;
      if (p.n === p.mesh.instanceMatrix.count) grow(p);
      p.mesh.instanceMatrix.array.set(m.matrixWorld.elements, p.n * 16);
      p.n++;
      used.add(p);
    }
  }
  for (const p of used) {
    const mesh = p.mesh, a = mesh.instanceMatrix;
    mesh.count = p.n; mesh.visible = p.n > 0;
    if (p.n) { a.clearUpdateRanges(); a.addUpdateRange(0, p.n * 16); a.needsUpdate = true; } else used.delete(p);
  }
}

/** Each pool: its shape, the material it copies, its shadows and how many it drew last time (for the tests). */
export function poolsNow() {
  const out: { geo: BufferGeometry; mat: Material; cast: boolean; recv: boolean; n: number; mesh: InstancedMesh }[] = [];
  for (const [geo, byMat] of pools) {
    for (const [mat, four] of byMat) {
      for (const p of four) if (p) out.push({ geo, mat, cast: p.mesh.castShadow, recv: p.mesh.receiveShadow, n: p.mesh.count, mesh: p.mesh });
    }
  }
  return out;
}
