// The eye candy update: on High, the world is drawn the way the people are (kit.ts), with a rolling sea, cloud
// shadows and little effects; on Low, everything is drawn exactly as before, and the renderer is lighter. Neither
// touches the game's luck.
import { BoxGeometry, type BufferGeometry, InstancedMesh, Mesh, MeshLambertMaterial, type Object3D, SphereGeometry } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { loadGame } from './helpers';

/** Whether `o` and everything it's in are showing. */
const shown = (o: Object3D) => { for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false; return true; };
/** Baked the new way (kit.ts pack): a byte per normal. */
const packed = (g: BufferGeometry) => g.attributes.normal?.array instanceof Int8Array;

/** The same seeded luck as setup.ts. */
function seeded(seed: number) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Loads the game with the graphics already chosen on this device. */
async function loadWith(q: 'low' | 'high') {
  const get = Storage.prototype.getItem;
  const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, k: string) {
    return k === 'floe-market-graphics' ? q : get.call(this, k);
  });
  const g = await loadGame();
  spy.mockRestore();
  return g;
}

describe('eye candy', () => {
  it('draws the scenery and props on High, and on Low exactly as before: nothing of the new kind shows', async () => {
    const g = await loadGame();
    const { Person } = await import('../src/characters');
    const { choose } = await import('../src/graphics');
    const inPerson = (o: Object3D) => { for (let p: Object3D | null = o; p; p = p.parent) if (p instanceof Person) return true; return false; };
    const newKind = () => {
      const found: Object3D[] = [];
      g.render.scene.traverse(o => { if (o instanceof Mesh && !inPerson(o) && shown(o) && packed(o.geometry)) found.push(o); });
      return found;
    };
    expect(newKind().length).toBeGreaterThan(5); // the deck, the fences, the counter, the sign, the bench...
    choose('low');
    expect(newKind()).toEqual([]);
    choose('high');
    expect(newKind().length).toBeGreaterThan(5);
  });

  it("builds the scenery off the game's luck: the same luck is left whichever graphics the device has", async () => {
    await loadWith('high');
    const high = [Math.random(), Math.random()];
    // same seed again (setup.ts), then Low
    vi.spyOn(Math, 'random').mockImplementation(seeded(1));
    await loadWith('low');
    expect([Math.random(), Math.random()]).toEqual(high);
  });

  it('rolls the sea and rocks the floes on High, with the flat sea and its foam on Low', async () => {
    const g = await loadGame();
    const { choose } = await import('../src/graphics');
    const seas: Mesh[] = [];
    g.render.scene.traverse(o => { if (o instanceof Mesh && (o.material as { customProgramCacheKey?: () => string }).customProgramCacheKey?.() === 'sea') seas.push(o); });
    expect(seas).toHaveLength(1);
    expect(shown(seas[0])).toBe(true);
    // its edges stay straight, so it meets the shore where the flat sea did
    const { seaGeometry } = await import('../src/sea');
    const geo = seaGeometry(10, 6), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      expect(Math.abs(x) <= 5.0001 && Math.abs(y) <= 3.0001).toBe(true);
    }
    choose('low');
    expect(shown(seas[0])).toBe(false);
    g.run(1); // and the floes still bob
  });

  it('lightens the renderer on Low: a smaller shadow map with hard edges', async () => {
    const g = await loadGame();
    const { choose } = await import('../src/graphics');
    const { sun } = g.render;
    expect([sun.shadow.mapSize.x, sun.shadow.radius]).toEqual([1024, 3]);
    choose('low');
    expect([sun.shadow.mapSize.x, sun.shadow.radius]).toEqual([512, 1]);
    g.render.shadowSize.px = 2048; // stage 2's wider shadows
    g.render.fitRenderer();
    expect(sun.shadow.mapSize.x).toBe(1024);
    choose('high');
    expect(sun.shadow.mapSize.x).toBe(2048);
  });

  it('sets off effects on High only, each kind drawn at once, gone when they settle', async () => {
    const g = await loadGame();
    const { choose } = await import('../src/graphics');
    const fx = await import('../src/fx');
    const { V } = g.util;
    const bits = () => {
      let n = 0;
      g.render.scene.traverse(o => { if (o instanceof InstancedMesh && o.name === 'fx') n += o.count; });
      return n;
    };
    const before = g.render.scene.children.length;
    fx.splashFx({ x: -2, z: -9 });
    fx.chipsFx(V(0.5, 1, -5.6));
    fx.coinsFx(V(0, 1, 0));
    fx.glint(V(3, 0.6, 7));
    fx.unlockFx({ x: 0, z: 2 });
    fx.chimney(V(26, 3, 6));
    fx.steamer(V(0, 1, 0), () => true);
    g.run(0.1);
    expect(bits()).toBeGreaterThan(40);
    expect(g.render.scene.children.length).toBe(before); // nothing new made while playing
    fx.coinsFx(V(0, 1, 0)); // a moment later, more bills: no more coins yet
    g.run(4);
    // only the chimneys' and the pot's puffs now: a few seconds' worth each (smoke every ~0.2 s, steam every ~0.3 s)
    const steady = bits();
    expect(steady).toBeGreaterThan(0);
    expect(steady).toBeLessThan(60);
    choose('low');
    g.run(0.1);
    fx.splashFx({ x: -2, z: -9 });
    g.run(0.1);
    expect(bits()).toBe(0);
  });

  it('bakes shapes small, switches High and Low, and fades seasonal layers in and out', async () => {
    await loadGame();
    const kit = await import('../src/kit');
    const { choose } = await import('../src/graphics');
    const { setSeason, season } = await import('../src/season');
    const b = new kit.Build()
      .add(kit.rbox(1, 0.2, 0.5), 0xC3875D, 0, 0, 0)
      .add(new SphereGeometry(1, 4, 3).toNonIndexed(), 0xFFFFFF, 1, 0, 0, [0, 1, 0], 0.5)
      .add(kit.K.ball, 0xFFFFFF, 0, 0.2, 0, null, 0.01);
    const m = b.mesh();
    const geo = m.geometry;
    expect(packed(geo)).toBe(true);
    expect(geo.attributes.color.array).toBeInstanceOf(Uint8Array);
    expect(geo.attributes.uv).toBeUndefined();
    // the bevelled box: 6 faces, 12 edge strips and 8 corners, 44 triangles; the unindexed ball gets an index of its own
    expect(kit.rbox(1, 0.2, 0.5).index!.count).toBe(44 * 3);
    const ball = new SphereGeometry(1, 4, 3).toNonIndexed().attributes.position.count;
    const own = kit.rbox(1, 0.2, 0.5).index!.count + ball + kit.K.ball.index!.count;
    // its shadow comes after it, drawn only in the shadow pass: the box plain, the ball as it was, the speck left out
    expect([geo.drawRange.start, geo.drawRange.count, geo.index!.count]).toEqual([0, own, own + 36 + ball]);
    (m.onBeforeShadow as () => void)();
    expect(geo.drawRange.start).toBe(own);
    (m.onAfterShadow as () => void)();
    expect([geo.drawRange.start, geo.drawRange.count]).toEqual([0, own]);
    expect(b.mesh(false).geometry.index!.count).toBe(own);
    expect(kit.rbox(1, 0.2, 0.5)).toBe(kit.rbox(1, 0.2, 0.5)); // shared by size
    expect(kit.shade(0x808080, 0.5)).toBe(0x404040);
    expect(kit.mix(0x000000, 0xFFFFFF, 0.5)).toBe(0x808080);
    const luck = Math.random;
    expect(kit.quietly(() => Math.random === luck)).toBe(false);
    expect(Math.random).toBe(luck);
    const low = new Mesh(), high = new Mesh();
    kit.detail(low, high);
    expect([low.visible, high.visible]).toEqual([false, true]);
    choose('low');
    expect([low.visible, high.visible]).toEqual([true, false]);
    choose('high');
    const snow = kit.seasonLayer(new Mesh(new SphereGeometry(), new MeshLambertMaterial()), [1, 0, 0, 0]);
    setSeason(0, 0, true);
    expect(snow.visible).toBe(true);
    setSeason(1); // spring comes: the snow thaws over a few seconds
    expect([snow.visible, season.k]).toEqual([true, 0]);
    setSeason(1, 0, true);
    expect(snow.visible).toBe(false);
  });

  it('draws what stands still merged, a call for many, and lets anything that moves, hides or goes drop out at once', async () => {
    await loadGame();
    const { batchInfo, batchStill } = await import('../src/batch');
    const { mat, scene } = await import('../src/render');
    const { Person } = await import('../src/characters');
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const frame = (s = 0.05) => { now += s * 1000; scene.updateMatrixWorld(); scene.onBeforeRender(null!, null!, null!, null!, null!, null!); };
    batchStill(scene);
    const box = new BoxGeometry(1, 1, 1), lamp = new MeshLambertMaterial({ color: 0xFFEEAA, emissive: 0x332200 });
    // three plain colours and a lamp, side by side in one patch of the map, and someone standing there
    const parts = [mat(0xC3875D), mat(0x8A5A3B), mat(0xC3875D), lamp].map((m, i) => {
      const o = new Mesh(box, m); o.position.set(1000 + i * 2, 0, 1000); scene.add(o); return o;
    });
    const person = new Person(0x4A90D9); person.position.set(1000, 0, 1003); scene.add(person);
    /** The merged meshes out there (away from the game's own). */
    const merged = () => (scene.getObjectByName('batches')!.children as Mesh[]).filter(o => {
      o.geometry.computeBoundingBox();
      return o.geometry.boundingBox!.min.x > 990;
    });
    const paint = () => merged().filter(o => o.geometry.attributes.color);
    const before = batchInfo().rebuilds;
    frame();
    expect(merged()).toHaveLength(0); // not until they've stood still a moment
    for (let i = 0; i < 25; i++) frame();
    // the plain colours in one mesh, painted; the lamp (it glows) in its own; the person not at all
    expect(merged()).toHaveLength(2);
    expect(parts.map(p => p.layers.mask)).toEqual([0, 0, 0, 0]);
    expect(person.body.children.every(c => c.layers.mask === 1)).toBe(true);
    expect(paint()[0].geometry.attributes.position.count).toBe(3 * box.attributes.position.count);
    // one moves: it's drawn by itself at once, and the rest merged without it
    parts[1].position.y = 0.5;
    frame();
    expect(parts[1].layers.mask).toBe(1);
    expect(paint()[0].geometry.attributes.position.count).toBe(2 * box.attributes.position.count);
    // one hides, one's taken away
    parts[0].visible = false;
    scene.remove(parts[2]);
    frame();
    expect([parts[0].layers.mask, parts[2].layers.mask]).toEqual([1, 1]);
    expect(paint()).toHaveLength(0);
    expect(batchInfo().rebuilds).toBeGreaterThan(before);
    for (const o of [...parts, person]) scene.remove(o);
    frame();
  });
});
