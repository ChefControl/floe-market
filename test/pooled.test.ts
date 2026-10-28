// What comes and goes by the hundred (the items carried and stacked, the chips, the fish) is drawn a call for each
// kind of piece (pooled.ts): every piece that shows copied, where it is, into one instanced mesh for its shape and
// material, while the piece itself isn't drawn. Tests use a stub renderer, so these check what would be drawn, not pixels.
import { Box3, BoxGeometry, Group, type InstancedMesh, Matrix4, Mesh, MeshLambertMaterial, type Object3D, Plane, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { loadGame } from './helpers';

/** Out of the way of the game's own things: only instances past here are the test's. */
const FAR = 900;

/** A game loaded, with what's pooled drawn each frame (and before that, if `merging`, what stands still merged, as
 *  main.ts has it). */
async function setUp(merging = false) {
  const g = await loadGame();
  const { drawPooled, poolsNow } = await import('../src/pooled');
  const { scene, camera, renderer } = g.render;
  if (merging) (await import('../src/batch')).batchStill(scene);
  drawPooled(scene);
  /** A frame drawn: the world's matrices, then what's done just before drawing. */
  const frame = () => { scene.updateMatrixWorld(); scene.onBeforeRender(renderer, scene, camera, null!, null!, null!); };
  /** Where the test's instances of `m`'s pool are (m as it is now). */
  const placesOf = (m: Mesh) => {
    const p = poolsNow().find(p => p.geo === m.geometry && p.mat === m.material && p.cast === m.castShadow && p.recv === m.receiveShadow);
    return p ? instances(p.mesh).filter(v => v.x > FAR - 50) : [];
  };
  return { g, scene, frame, placesOf, poolsNow };
}
/** Where each of a pool's instances is. */
function instances(mesh: InstancedMesh) {
  const out: Vector3[] = [], m = new Matrix4();
  for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, m); out.push(new Vector3().setFromMatrixPosition(m)); }
  return out;
}
const at = (o: Object3D) => { o.updateWorldMatrix(true, false); return new Vector3().setFromMatrixPosition(o.matrixWorld); };
const meshesIn = (o: Object3D) => { const out: Mesh[] = []; o.traverse(c => { if ((c as Mesh).isMesh) out.push(c as Mesh); }); return out; };

describe('pooled drawing', () => {
  it('draws every item of a kind in one call, where each one is, and none of them by itself', async () => {
    const { g, scene, frame, placesOf, poolsNow } = await setUp();
    const { newPlate, newBox, newBowl, newFillet, newBill } = g.items;
    const things = [newPlate(10, false), newPlate(10, false), newPlate(20, true), newBox(30, false), newBowl(true), newFillet(), newBill(5)];
    things.forEach((o, i) => { o.position.set(FAR + i, 1, 0); o.rotation.y = i * 0.3; scene.add(o); });
    frame();
    for (const o of things) {
      for (const m of meshesIn(o)) {
        expect(m.layers.mask).toBe(0); // not drawn itself
        const mine = placesOf(m).filter(v => v.distanceTo(at(m)) < 1e-4);
        expect(mine).toHaveLength(1);
      }
    }
    // the two plain plates share their plate's call and their nigiri's
    const [a, b] = things;
    expect(placesOf(a as Mesh)).toHaveLength(2);
    expect(placesOf(a.children[0] as Mesh)).toHaveLength(2);
    // the pools draw the same shapes, in copies of the same materials (three.js keys a shader on instancing), with the
    // same shadows, the whole matrix (turned, too)
    const plate = poolsNow().find(p => p.geo === (b as Mesh).geometry && p.mat === (b as Mesh).material)!;
    expect(plate.mesh.material).not.toBe(plate.mat);
    expect(plate.mesh.material).toBeInstanceOf(MeshLambertMaterial);
    expect((plate.mesh.material as MeshLambertMaterial).color.getHex()).toBe((plate.mat as MeshLambertMaterial).color.getHex());
    expect([plate.mesh.castShadow, plate.mesh.receiveShadow]).toEqual([true, true]);
    const m = new Matrix4();
    const i = instances(plate.mesh).findIndex(v => v.distanceTo(at(b)) < 1e-4);
    plate.mesh.getMatrixAt(i, m);
    m.elements.forEach((e, k) => expect(e).toBeCloseTo(b.matrixWorld.elements[k], 5));
    // it's never culled as a whole, has no bounds to work out (levelCull.ts never hides it for them), and rays pass
    expect(plate.mesh.frustumCulled).toBe(false);
    expect(new Box3().setFromObject(scene.getObjectByName('pooled')!).isEmpty()).toBe(true);
    // and none of it takes part in the merging of what stands still (batch.ts)
    expect(things.every(o => o.userData.noBatch)).toBe(true);
  });

  it('follows them as they move, hide, fly and go, and as the graphics change', async () => {
    const { g, scene, frame, placesOf } = await setUp();
    const { Holder, updFlights } = await import('../src/holder');
    const { choose } = await import('../src/graphics');
    const plate = g.items.newPlate(10, false) as Mesh, nigiri = plate.children[0] as Mesh;
    plate.position.set(FAR, 1, 0);
    scene.add(plate);
    frame();
    expect(placesOf(plate)).toHaveLength(1);
    plate.position.x = FAR + 5;
    frame();
    expect(placesOf(plate)[0].x).toBeCloseTo(FAR + 5);
    // hidden, its nigiri hidden, the group it's in hidden, taken away and put back
    plate.visible = false; frame();
    expect([placesOf(plate), placesOf(nigiri)].map(p => p.length)).toEqual([0, 0]);
    plate.visible = true; nigiri.visible = false; frame();
    expect([placesOf(plate), placesOf(nigiri)].map(p => p.length)).toEqual([1, 0]);
    nigiri.visible = true;
    const box = new Group(); scene.add(box); box.add(plate); box.visible = false; frame();
    expect(placesOf(plate)).toHaveLength(0);
    box.visible = true; frame();
    expect(placesOf(plate)).toHaveLength(1);
    box.remove(plate); frame();
    expect(placesOf(plate)).toHaveLength(0);
    const loose = new Group(); loose.add(plate); frame(); // in a group that isn't in the scene
    expect(placesOf(plate)).toHaveLength(0);
    // flying into a stack: where it is in the air
    const stack = new Holder(i => new Vector3(FAR + 10, 1 + i * 0.05, 0), 5);
    loose.remove(plate);
    plate.position.set(FAR, 1, 0);
    stack.receive(plate, 1, 2);
    updFlights(0.5);
    frame();
    expect(placesOf(plate)[0].x).toBeCloseTo(at(plate).x);
    expect(placesOf(plate)[0].y).toBeGreaterThan(1.5);
    updFlights(1);
    frame();
    expect(placesOf(plate)[0].x).toBeCloseTo(FAR + 10);
    // High's shape and Low's (items.ts looks): drawn in whichever there is
    const high = plate.geometry;
    choose('low'); frame();
    expect(plate.geometry).not.toBe(high);
    expect(placesOf(plate)).toHaveLength(1);
    choose('high'); frame();
    expect(plate.geometry).toBe(high);
    expect(placesOf(plate)).toHaveLength(1);
  });

  it("draws a piece by itself while it draws its own way, and back in its pool after", async () => {
    const { g, scene, frame, placesOf } = await setUp();
    const { newFish } = await import('../src/fishModel');
    const fish = newFish();
    fish.g.position.set(FAR, 1, 0);
    scene.add(fish.g);
    frame();
    // body, tail and four baked parts: a pool each
    for (const m of meshesIn(fish.g)) expect([m.layers.mask, placesOf(m).length]).toEqual([0, 1]);
    // the tail wiggles: its pool has it turned
    fish.tail.rotation.y = 0.4; frame();
    const tail = fish.tail.children[0] as Mesh;
    expect(placesOf(tail)[0].distanceTo(at(tail))).toBeLessThan(1e-4);
    // on the chopping block, cut with a clipping plane (fishing.ts): drawn by itself
    const was = fish.body.material, cut = (was as MeshLambertMaterial).clone();
    cut.clippingPlanes = [new Plane(new Vector3(1, 0, 0), 0)];
    fish.body.material = cut; frame();
    expect([fish.body.layers.mask, placesOf(fish.body).length]).toEqual([1, 0]);
    fish.body.material = was; frame();
    expect(fish.body.layers.mask).toBe(0);
    // see-through, or turned inside out
    const bowl = g.items.newBowl(false) as Mesh;
    bowl.position.set(FAR + 2, 1, 0);
    scene.add(bowl);
    const clear = (bowl.material as MeshLambertMaterial).clone(); clear.transparent = true; clear.opacity = 0.5;
    const solid = bowl.material;
    bowl.material = clear; frame();
    expect(bowl.layers.mask).toBe(1);
    bowl.material = solid; bowl.scale.x = -1; frame();
    expect(bowl.layers.mask).toBe(1);
    bowl.scale.x = 1; frame();
    expect(bowl.layers.mask).toBe(0);
  });

  it('makes room as more come, all of them drawn', async () => {
    const { g, scene, frame, placesOf } = await setUp();
    const chips = Array.from({ length: 70 }, (_, i) => {
      const c = g.items.newChip(true); c.position.set(FAR + (i % 10) * 0.3, 1 + Math.floor(i / 10) * 0.03, 0); scene.add(c); return c;
    });
    frame();
    expect(placesOf(chips[0])).toHaveLength(70);
    chips.slice(0, 30).forEach(c => scene.remove(c));
    frame();
    // (the same pool: the 40 left, and none where those taken away were)
    const left = placesOf(chips[69]);
    expect(left).toHaveLength(40);
    expect(chips.slice(0, 30).some(c => left.some(v => v.distanceTo(c.position) < 1e-4))).toBe(false);
  });

  it('lets go of what was in a group thrown away, and it draws itself if that group comes back', async () => {
    const { g, scene, frame, placesOf } = await setUp();
    const carrier = new Group(); scene.add(carrier);
    const bowl = g.items.newBowl(false) as Mesh;
    bowl.position.set(FAR, 1, 0);
    carrier.add(bowl);
    frame();
    expect([bowl.layers.mask, placesOf(bowl).length]).toEqual([0, 1]);
    scene.remove(carrier); // (the bowl itself hears nothing)
    for (let i = 0; i < 600; i++) frame();
    expect(bowl.layers.mask).toBe(1);
    scene.add(carrier); frame();
    expect([bowl.layers.mask, placesOf(bowl).length]).toEqual([1, 0]);
    // put somewhere itself, it's pooled again
    scene.add(bowl); frame();
    expect([bowl.layers.mask, placesOf(bowl).length]).toEqual([0, 1]);
  });

  it("gives the cellar's rice balls one shape for their nori, taking the luck each one's own shape took", async () => {
    const { g } = await setUp();
    /** How many numbers `f` draws from the luck. */
    const draws = (f: () => unknown) => {
      const luck = Math.random;
      let n = 0;
      Math.random = () => { n++; return luck(); };
      try { f(); } finally { Math.random = luck; }
      return n;
    };
    g.items.newReadyRice(); // (its colours' materials made)
    const a = g.items.newReadyRice(), b = g.items.newReadyRice();
    expect((a.children[0] as Mesh).geometry).toBe((b.children[0] as Mesh).geometry);
    // (as it was: the ball, its strip's shape, the strip)
    const geo = new BoxGeometry(), mat = new MeshLambertMaterial();
    expect(draws(() => g.items.newReadyRice())).toBe(draws(() => { new Mesh(geo, mat); new BoxGeometry(0.06, 0.092, 0.02); new Mesh(geo, mat); }));
  });

  it("takes nothing from the game's luck, and nothing new goes into the scene while playing", async () => {
    const { g, scene, frame } = await setUp();
    const things = [g.items.newPlate(10, true), g.items.newBox(5, true), g.items.newRice(), g.items.newMushroom(), g.items.newReadyRice(), g.items.newCuredFish()];
    things.forEach((o, i) => { o.position.set(FAR + i, 1, 0); scene.add(o); });
    const kids = scene.children.length;
    let draws = 0;
    const luck = Math.random;
    vi.spyOn(Math, 'random').mockImplementation(() => { draws++; return luck(); });
    frame(); frame();
    vi.mocked(Math.random).mockRestore();
    expect(draws).toBe(0);
    expect(scene.children.length).toBe(kids); // (the pools are in one group, put in at the start)
  });

  it('leaves what it draws out of the merging, standing still or not', async () => {
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { g, scene, frame } = await setUp(true);
    const bowls = [g.items.newBowl(false), g.items.newBowl(true)];
    bowls.forEach((b, i) => { b.position.set(FAR + i, 1, 0); scene.add(b); });
    for (let i = 0; i < 60; i++) { now += 50; frame(); }
    const merged = (scene.getObjectByName('batches')!.children as Mesh[]).filter(o => {
      o.geometry.computeBoundingBox();
      return o.geometry.boundingBox!.max.x > FAR - 50;
    });
    expect(merged).toHaveLength(0);
    expect(bowls.flatMap(meshesIn).every(m => m.layers.mask === 0)).toBe(true);
  });
});
