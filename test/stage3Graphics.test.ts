// Stage 3's graphics (the cellar), Low and High: High is the cellar as it was drawn, with the Undertow's figures and
// the wrestlers finer; Low is the same place for less: four lamps standing in for fourteen, no shadows from the small
// things or the fans, the figures a notch plainer. Down there the sun's shadows are cast only over what's on screen.
// Neither touches the game's luck.
import { BoxGeometry, type InstancedMesh, Mesh, type Object3D, type PointLight } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { bought, FLOE_SUSHI, loadGame, MARKET, type SaveFixture } from './helpers';

const SUSHI = [...MARKET, 'sushi', ...FLOE_SUSHI];
/** Whether `o` and everything it's in are showing. */
const shown = (o: Object3D) => { for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false; return true; };
/** The same seeded luck as setup.ts. */
function seeded(seed: number) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
/** A game down in the cellar (the second boss beaten: the Undertow's open), the graphics already chosen on the device. */
async function cellar(q: 'potato' | 'low' | 'high', save: SaveFixture = {}) {
  const get = Storage.prototype.getItem;
  const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, k: string) {
    return k === 'floe-market-graphics' ? q : get.call(this, k);
  });
  const g = await loadGame({
    tiles: bought(...SUSHI, 'dohyo'), fugu: 2, level: 1, reviews: Array(20).fill(5),
    ring: { beaten: 2, lines: { mush: { n: 1 } }, den: { book: true, way: true, door: true } }, ...save,
  });
  spy.mockRestore();
  const [cellarMod, graphics, family, levelCull, render, plan] = await Promise.all([
    import('../src/cellar'), import('../src/graphics'), import('../src/family'), import('../src/levelCull'), import('../src/render'),
    import('../src/cellarPlan'),
  ]);
  /** Draws a frame as main.ts does: the camera and the sun over the player, what's up top hidden and the cellar's own
   *  work done (levelCull.ts), then shown again. */
  const draw = () => {
    const p = g.player.g.position, { camera, sun, OFF } = render;
    camera.position.copy(p).add(OFF); camera.lookAt(p); camera.updateMatrixWorld();
    sun.target.position.copy(p);
    render.scene.updateMatrixWorld();
    levelCull.hideAbove()();
  };
  return { g, cellar: cellarMod, graphics, family, levelCull, render, plan, draw };
}

describe('stage 3, Low and High', () => {
  // (four games loaded, a few seconds each under coverage on CI: more time than the usual 15 s, here and below)
  it("builds the cellar off the game's luck: the same luck is left whichever graphics the device has", async () => {
    // (loaded once first, so what's made the first time anything's loaded, three.js' own, is made before both)
    await cellar('low');
    const luck = vi.spyOn(Math, 'random').mockImplementation(seeded(1));
    await cellar('high');
    const high = [Math.random(), Math.random()];
    luck.mockImplementation(seeded(1));
    await cellar('low');
    expect([Math.random(), Math.random()]).toEqual(high);
  }, 60_000);

  it('lights the cellar with all fourteen lamps on High, four standing in for the nearest on Low, and two on Potato', async () => {
    const { cellar: C, graphics, draw, render } = await cellar('high');
    const shownLights = () => { let n = 0; C.cellar.parent!.traverseVisible(o => { if ((o as PointLight).isPointLight && o.parent && shown(o)) n++; }); return n; };
    expect(C.lights.every(l => l.visible)).toBe(true);
    expect(C.standIns.every(l => !l.visible)).toBe(true);
    const onHigh = shownLights();
    graphics.choose('low');
    draw();
    expect(C.lights.every(l => !l.visible)).toBe(true);
    expect(C.standIns.every(l => l.visible)).toBe(true);
    expect(shownLights()).toBe(onHigh - C.lights.length + 4);
    // each stands in for one of the lit lamps: its colour, reach and place, all the way faded in on the first frame
    for (const s of C.standIns) {
      const l = C.lights.find(x => x.position.equals(s.position))!;
      expect(l.intensity).toBeGreaterThan(0);
      expect([s.color.getHex(), s.distance, s.intensity]).toEqual([l.color.getHex(), l.distance, l.intensity]);
    }
    // Potato: two of them, for two of those four
    const four = C.standIns.map(s => s.position.toArray().join());
    graphics.choose('potato');
    draw();
    expect(C.standIns.map(s => s.visible)).toEqual([true, true, false, false]);
    expect(shownLights()).toBe(onHigh - C.lights.length + 2);
    for (const s of C.standIns.slice(0, 2)) {
      expect(s.intensity).toBeGreaterThan(0);
      expect(four).toContain(s.position.toArray().join());
    }
    // walking off to the far end and back: each time the two shown hand over to the lamps there, all the way faded in
    // (the two not shown take none of them, or the ones shown would be left waiting with nothing)
    const two = C.standIns.slice(0, 2).map(s => s.position.toArray().join()).sort();
    const at = render.sun.target.position.clone(), far = C.lights.filter(l => l.intensity > 0)
      .sort((a, b) => b.position.distanceTo(at) - a.position.distanceTo(at))[0].position;
    for (const to of [far, at]) {
      for (let i = 0; i < 30; i++) C.updLamps({ x: to.x, z: to.z }, 0.1);
      expect(C.standIns.slice(2).map(s => s.intensity)).toEqual([0, 0]);
      for (const s of C.standIns.slice(0, 2)) {
        const l = C.lights.find(x => x.position.equals(s.position))!;
        expect(s.intensity).toBe(l.intensity);
      }
    }
    expect(C.standIns.slice(0, 2).map(s => s.position.toArray().join()).sort()).toEqual(two);
    graphics.choose('high');
    expect(C.lights.every(l => l.visible)).toBe(true);
    expect(C.standIns.every(l => !l.visible)).toBe(true);
  }, 30_000);

  it("keeps the figures small: each corner once, normals and colours in bytes, and none of High's on Potato", async () => {
    /** The figures' merged meshes in the cellar (family.ts flatten), the bytes of their shapes, and what those would
     *  take with every corner of every triangle as floats (position, normal and colour), as they once were. */
    const figures = (C: typeof import('../src/cellar')) => {
      const out: Mesh[] = [], seen = new Set<unknown>();
      let bytes = 0, floats = 0;
      C.cellar.traverse(o => {
        const m = o as Mesh;
        if (!m.isMesh || !m.userData.baked || !m.userData.noBatch) return;
        out.push(m);
        if (seen.has(m.geometry)) return;
        seen.add(m.geometry);
        for (const a of Object.values(m.geometry.attributes)) bytes += (a.array as ArrayLike<number> & { byteLength: number }).byteLength;
        bytes += m.geometry.index?.array.byteLength ?? 0;
        floats += (m.geometry.index?.count ?? 0) * 36;
      });
      return { out, bytes, floats };
    };
    const { cellar: C } = await cellar('low');
    const { out, bytes, floats } = figures(C);
    expect(out.length).toBeGreaterThan(100);
    for (const m of out) {
      const g = m.geometry;
      expect(g.index).not.toBeNull();
      expect([g.attributes.normal.array.constructor, g.attributes.color.array.constructor]).toEqual([Int8Array, Uint8Array]);
      expect(g.attributes.position.count).toBeLessThan(g.index!.count); // corners shared
      // its shadow's copy after its own triangles: drawn only in the shadow pass
      if (m.castShadow) {
        const own = g.drawRange.count;
        expect(own).toBeLessThan(g.index!.count);
        m.onBeforeShadow(null!, null!, null!, null!, g, null!, null!);
        expect([g.drawRange.start, g.drawRange.count]).toEqual([own, Infinity]);
        m.onAfterShadow(null!, null!, null!, null!, g, null!, null!);
        expect([g.drawRange.start, g.drawRange.count]).toEqual([0, own]);
      }
    }
    expect(bytes).toBeLessThan(floats * 0.25);
    // Potato: High's copies hold no shapes
    const potato = figures((await cellar('potato')).cellar);
    expect(potato.bytes).toBeLessThan(bytes * 0.7);
    const emptied = potato.out.filter(m => !m.geometry.attributes.position.count);
    expect(emptied.length).toBeGreaterThan(out.length * 0.4);
    // (and no hook on their shadows: the hooks hold the merged shape, kit.ts letGo)
    const { onBeforeShadow, onAfterShadow } = Mesh.prototype;
    expect(emptied.filter(m => m.onBeforeShadow !== onBeforeShadow || m.onAfterShadow !== onAfterShadow)).toEqual([]);
  }, 60_000);

  it('casts no shadow from the small things or the fans on Low, and every one of them again on High', async () => {
    const { cellar: C, graphics, g, render } = await cellar('high');
    const casters = () => { let n = 0; C.cellar.traverse(o => { if ((o as Mesh).isMesh && (o as Mesh).castShadow) n++; }); return n; };
    const slight = () => { let n = 0; C.cellar.traverse(o => { if (o.userData.slight) n++; }); return n; };
    // someone down there drawn as one (characters.ts): their arms and legs, as slight as anything, cast with the body's
    const { Person } = await import('../src/characters');
    const hire = new Person(0x8E6BB5);
    C.cellar.add(hire);
    const onHigh = casters();
    expect(slight()).toBe(0);
    graphics.choose('low');
    expect(slight()).toBeGreaterThan(20);
    expect(casters()).toBe(onHigh - slight());
    expect(hire.limbShadows).toBe(false);
    graphics.choose('high');
    expect(slight()).toBe(0);
    expect(casters()).toBe(onHigh);
    expect(hire.limbShadows).toBe(true);
    hire.removeFromParent();
    // a boss's crowd: their shadows from a plainer copy on High (after their own shape), none on Low
    const { ringGong } = await import('../src/fight');
    ringGong();
    g.run(8);
    const fans = () => { const out: InstancedMesh[] = []; render.scene.traverse(o => { if ((o as InstancedMesh).isInstancedMesh && o.userData.casts !== undefined) out.push(o as InstancedMesh); }); return out; };
    expect(fans().length).toBeGreaterThan(0);
    const casting = fans().filter(f => f.userData.casts);
    expect(casting.every(f => f.castShadow && f.userData.shadowFrom === f.geometry.drawRange.count)).toBe(true);
    expect(casting.every(f => f.geometry.attributes.position.count > f.userData.shadowFrom)).toBe(true);
    // (the trim, the small things on them, never casts)
    expect(fans().filter(f => !f.userData.casts).every(f => !f.castShadow)).toBe(true);
    // their own materials, not the plain meshes' painted, one for shirts coloured each and one for the rest, so three.js
    // never switches a material's shader between them
    const mats = (shirts: boolean) => new Set(fans().filter(f => !!f.instanceColor === shirts).map(f => f.material));
    expect([mats(true).size, mats(false).size]).toEqual([1, 1]);
    expect([...mats(true), ...mats(false)]).not.toContain(render.painted);
    expect([...mats(true)][0]).not.toBe([...mats(false)][0]);
    graphics.choose('low');
    g.run(0.5);
    expect(fans().every(f => !f.castShadow)).toBe(true);
    // Potato looks the same to them as Low: nothing's made again between the two
    const onLow = fans();
    graphics.choose('potato');
    g.run(0.5);
    expect(fans().length === onLow.length && fans().every((f, i) => f === onLow[i])).toBe(true);
  }, 30_000);

  it("doesn't sweep the small things' shadows on Potato, which casts none, and catches up on the change to Low", async () => {
    const { cellar: C, graphics } = await cellar('potato');
    const crumb = new Mesh(new BoxGeometry(0.04, 0.04, 0.04));
    crumb.castShadow = true;
    crumb.position.set(C.RING.x, C.CY, C.RING.z);
    C.cellar.add(crumb);
    for (let t = 0; t < 5; t += 0.1) C.updLamps(C.RING, 0.1); // (each frame the player's down there)
    expect(crumb.castShadow).toBe(true);
    graphics.choose('low');
    expect([crumb.castShadow, crumb.userData.slight]).toEqual([false, true]);
  }, 30_000);

  it("draws the Undertow's figures finer on High and a notch plainer on Low, each in a few meshes, the same pose", async () => {
    const { family, graphics } = await cellar('high');
    const eddie = family.family.eddie;
    const meshes = (q: 'low' | 'high') => {
      graphics.choose(q);
      const out: Mesh[] = [];
      eddie.traverse(o => { if ((o as Mesh).isMesh && shown(o)) out.push(o as Mesh); });
      return out;
    };
    const tris = (ms: Mesh[]) => ms.reduce((n, m) => n + Math.min(m.geometry.drawRange.count, m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3, 0);
    const high = meshes('high'), low = meshes('low');
    // (each moving part merged: a handful of meshes, on either)
    expect(high.length).toBeLessThan(20);
    expect(low.length).toBe(high.length);
    // High's has the finer pieces Low's hasn't; both far fewer triangles than a ball of 252 for every piece
    expect(tris(high)).toBeGreaterThan(tris(low));
    expect(tris(high)).toBeLessThan(12000);
    // and each casts its shadow from a plainer copy after its own triangles
    for (const m of [...high, ...low].filter(x => x.castShadow && x.userData.noBatch)) expect(m.geometry.index!.count).toBeGreaterThan(m.geometry.drawRange.count);
  }, 30_000);

  it('dresses the wrestlers finer on High only: ears, a nose, toes, thumbs', async () => {
    const { graphics } = await cellar('high');
    const { RikishiModel } = await import('../src/rikishi');
    const r = new RikishiModel(0xE0552F);
    const visible = () => { let n = 0; r.traverse(o => { if ((o as Mesh).isMesh && shown(o)) n++; }); return n; };
    const onHigh = visible();
    graphics.choose('low');
    expect(visible()).toBeLessThan(onHigh);
    graphics.choose('high');
    expect(visible()).toBe(onHigh);
  }, 30_000);

  it("fits the sun's shadows to the floor on screen down here, and puts its box back up top", async () => {
    const { levelCull, draw, g, plan, cellar: C } = await cellar('high');
    const up = levelCull.shadowBox();
    g.player.g.position.set(plan.BAR_PAD.x, C.CY, plan.BAR_PAD.z);
    g.run(1);
    draw();
    const down = levelCull.shadowBox();
    expect(down).not.toEqual(up);
    // (narrower than the square across the world it was: as wide as the screen's strip of floor)
    expect(down.right - down.left).toBeLessThan(up.right - up.left);
    // the Undertow's figures, off screen from the bar, cast no shadow; in the club, the ones in sight do
    const casting = levelCull.figuresCasting();
    const { DEN } = await import('../src/layout');
    g.player.g.position.set((DEN.x0 + DEN.x1) / 2, C.CY, (DEN.z0 + DEN.z1) / 2 + 2);
    g.run(2);
    draw();
    expect(levelCull.figuresCasting()).toBeGreaterThan(casting);
  }, 30_000);
});
