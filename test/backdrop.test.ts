// The land, sea and sky past the playable area (backdrop.ts, village.ts), the roads carried on past their ends, and
// the beach's blended edges (beachEdge.ts): there for the wide shots, never over where anyone walks, cheap, the same
// every visit, and in step with the seasons, the night and the graphics setting.
import { type InstancedMesh, Matrix4, Mesh, type MeshLambertMaterial, type Object3D, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { bought, FLOE_SUSHI, loadGame, MARKET } from './helpers';

type Game = Awaited<ReturnType<typeof loadGame>>;
const STAGE2 = bought(...MARKET, 'sushi', ...FLOE_SUSHI);
const WINTER = 0, SPRING = 1, SUMMER = 2, AUTUMN = 3;
const meshes = (o: Object3D) => { const all: Mesh[] = []; o.traverse(c => { if (c instanceof Mesh) all.push(c); }); return all; };
/** Every corner of a group's meshes, in the world (one drawn many times: each of its copies' corners). */
function corners(o: Object3D) {
  const out: Vector3[] = [], at = new Matrix4();
  o.updateWorldMatrix(true, true);
  for (const m of meshes(o)) {
    const p = m.geometry.attributes.position, copies = (m as InstancedMesh).isInstancedMesh ? (m as InstancedMesh).count : 1;
    for (let n = 0; n < copies; n++) {
      if ((m as InstancedMesh).isInstancedMesh) (m as InstancedMesh).getMatrixAt(n, at); else at.identity();
      at.premultiply(m.matrixWorld);
      for (let i = 0; i < p.count; i++) out.push(new Vector3().fromBufferAttribute(p, i).applyMatrix4(at));
    }
  }
  return out;
}
const named = (g: Game, name: string) => g.render.scene.getObjectByName(name)!;
/** Loads the game with the graphics already chosen on this device. */
async function loadWith(q: 'potato' | 'low' | 'high', save?: Parameters<typeof loadGame>[0]) {
  const get = Storage.prototype.getItem;
  const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, k: string) {
    return k === 'floe-market-graphics' ? q : get.call(this, k);
  });
  const g = await loadGame(save);
  spy.mockRestore();
  return g;
}

describe('the backdrop', () => {
  it('stands well past where anyone walks, casts no shadow and takes few draws', async () => {
    const g = await loadGame();
    const { backdrop } = await import('../src/backdrop');
    g.run(0.1); // (the gulls take their places)
    expect(named(g, 'backdrop').parent).toBe(g.render.scene);
    // the hills and the mountains: a ring round the land side, nowhere nearer than 40 m to the market
    for (const part of [backdrop.hills, backdrop.peaks, backdrop.pines]) {
      const near = Math.min(...corners(part).filter(v => v.y > 0.3).map(v => Math.hypot(v.x, v.z - 8)));
      expect(near).toBeGreaterThan(part === backdrop.pines ? 34 : 40);
    }
    // the village: east of her house and its trees
    expect(Math.min(...corners(backdrop.town).map(v => v.x))).toBeGreaterThan(24);
    // nothing of it over the dock, the restaurant's plot, the terraces or the beach
    const { walkable, keepOnFloor } = g.layout;
    for (const v of corners(named(g, 'backdrop')).filter(c => c.y < 300 && c.y > 0.05)) {
      const q = { x: v.x, z: v.z };
      keepOnFloor(q, walkable());
      expect(Math.hypot(q.x - v.x, q.z - v.z)).toBeGreaterThan(1);
    }
    const all = meshes(named(g, 'backdrop'));
    expect(all.length).toBeLessThanOrEqual(15);
    expect(all.every(m => !m.castShadow && !m.receiveShadow)).toBe(true);
    // and none of it is in a ray's way (the wardrobe's camera looks for what's between it and the player)
    for (const m of all) { const hits: never[] = []; m.raycast(null as never, hits); expect(hits).toEqual([]); }
  });

  it('is the same every visit', async () => {
    const sum = async () => {
      const g = await loadGame();
      return corners(named(g, 'backdrop')).reduce((s, v) => s + v.x * 3 + v.y * 5 + v.z * 7, 0);
    };
    expect(await sum()).toBe(await sum());
  });

  it('keeps its sky and clouds round the camera, in the sky\'s own colour', async () => {
    const g = await loadGame();
    const { backdrop } = await import('../src/backdrop');
    const cam = new PerspectiveCamera(); cam.position.set(30, 20, -10);
    const dome = backdrop.sky.children[0] as Mesh, clouds = backdrop.clouds.children[0] as Mesh;
    for (const m of [dome, clouds]) {
      m.onBeforeRender(null as never, g.render.scene, cam, m.geometry, m.material as MeshLambertMaterial, null as never);
      expect(new Vector3().setFromMatrixPosition(m.matrixWorld)).toEqual(cam.position);
    }
    expect((dome.material as MeshLambertMaterial).color.getHex()).toBe((g.render.scene.background as { getHex(): number }).getHex());
    // (where they're kept is high over the world, so that down in the cellar they're hidden with the rest of it)
    expect(Math.min(dome.position.y, clouds.position.y)).toBeGreaterThan(300);
  });

  it('has sailboats in summer only, and icebergs when the floes are out', async () => {
    const { FLOE_SIZE } = await import('../src/season');
    for (const season of [WINTER, SPRING, SUMMER, AUTUMN]) {
      await loadGame({ tiles: STAGE2, season });
      const { backdrop } = await import('../src/backdrop');
      expect(backdrop.boats.children[0].visible).toBe(season === SUMMER);
      expect(backdrop.bergs.visible).toBe(FLOE_SIZE[season] > 0);
      // snow on the village's roofs in winter
      const snow = meshes(backdrop.town).filter(m => !m.visible);
      expect(snow.length).toBe(season === WINTER ? 0 : 1);
    }
  });

  it('loses its clouds and gulls at night, and gets them back', async () => {
    const g = await loadGame();
    const { backdrop } = await import('../src/backdrop');
    const clouds = backdrop.clouds.children[0] as Mesh;
    expect([clouds.visible, backdrop.gulls.visible]).toEqual([true, true]);
    g.stage.setNight(1);
    expect([clouds.visible, backdrop.gulls.visible]).toEqual([false, false]);
    expect((clouds.material as MeshLambertMaterial).opacity).toBe(0);
    g.stage.setNight(0);
    expect([clouds.visible, backdrop.gulls.visible]).toEqual([true, true]);
  });

  it('has gulls wheeling over the bay, clear of the yacht', async () => {
    const g = await loadGame();
    const { backdrop } = await import('../src/backdrop');
    const gulls = backdrop.gulls.children[0] as InstancedMesh;
    const where = () => [...Array(gulls.count)].map((_, i) => { const m = new Matrix4(); gulls.getMatrixAt(i, m); return new Vector3().setFromMatrixPosition(m); });
    g.run(0.5);
    const before = where();
    g.run(2);
    const after = where();
    expect(gulls.count).toBe(4);
    after.forEach((v, i) => {
      expect(v.distanceTo(before[i])).toBeGreaterThan(0.5);
      // over the sea, north of the dock, high over the yacht's upper deck
      expect(v.z).toBeLessThan(-12);
      expect(v.y).toBeGreaterThan(7);
    });
  });

  it('leaves the far pines, the clouds and the beach grass out on Potato', async () => {
    // a load that starts on Potato never builds them
    const p = await loadWith('potato', { tiles: STAGE2, season: SUMMER });
    p.run(0.1);
    let { backdrop } = await import('../src/backdrop');
    expect([backdrop.pines.children.length, backdrop.clouds.children.length]).toEqual([0, 0]);
    expect((named(p, 'beachEdge').children[2] as Mesh).geometry.attributes.position.count).toBe(0);
    p.stage.setNight(1); // (nothing to fade)
    // one that goes there hides them, and Low and High show them
    const g = await loadWith('high', { tiles: STAGE2, season: SUMMER });
    g.run(0.1);
    ({ backdrop } = await import('../src/backdrop'));
    const { choose } = await import('../src/graphics');
    const grass = named(g, 'beachEdge').children[2];
    expect(backdrop.pines.children.length).toBe(2);
    for (const [q, shown] of [['high', true], ['potato', false], ['low', true]] as const) {
      choose(q);
      expect([backdrop.pines.visible, backdrop.clouds.visible, grass.visible]).toEqual([shown, shown, shown]);
    }
  });
});

describe('the roads', () => {
  it('carry on past their ends, round a bend and onto the road behind the hills', async () => {
    const g = await loadGame();
    const { world } = g, { roadOn } = await import('../src/backdrop');
    const ons: Mesh[] = [];
    g.render.scene.traverse(o => { if (o.name === 'roadOn') ons.push(o as Mesh); });
    expect(ons.length).toBe(2);
    // each hangs on its own road: stage 1's shows, stage 2's waits with its road
    expect(ons.map(o => o.parent!.visible)).toEqual([true, false]);
    expect(ons[0].parent).toBe(world.stage1Only.road);
    for (const [i, x] of [world.ROAD1_X, world.ROAD2_X].entries()) {
      const at = corners(ons[i]);
      // from the road's own ends, 65 m out north and south
      for (const s of [-1, 1]) expect(at.some(v => Math.abs(v.x - x) < 1.4 && Math.abs(v.z - s * 65) < 0.01)).toBe(true);
      // east, to behind the hills
      expect(Math.max(...at.map(v => v.x))).toBeGreaterThan(35);
      // and the wear on the road itself keeps off the crossing to her house
      const worn = at.filter(v => Math.abs(v.y - 0.0075) < 1e-4);
      expect(worn.length).toBeGreaterThan(20);
      expect(worn.every(v => Math.abs(v.x - x) < 1.0 && (v.z < 2.5 || v.z > 10.5))).toBe(true);
    }
    // the same every time it's built
    const again = roadOn(world.ROAD1_X);
    expect([...again.geometry.attributes.position.array]).toEqual([...ons[0].geometry.attributes.position.array]);
    const hits: never[] = [];
    again.raycast(null as never, hits);
    expect(hits).toEqual([]);
  });

  it('have the lighthouse and its island out in the sea, clear of them', async () => {
    const g = await loadGame();
    const horizon = named(g, 'horizon');
    const tower = horizon.children.find(o => o.type === 'Group')!;
    // (the coast runs north at BAY.x1, and stage 1's road a step inside it)
    expect(tower.position.x).toBeLessThan(g.layout.BAY.x1 - 5);
    const rocks = horizon.children.filter(o => o instanceof Mesh && o.geometry.type === 'ConeGeometry') as Mesh[];
    for (const r of rocks) expect(r.position.x + Math.max(r.scale.x, r.scale.z) * (r.geometry as unknown as { parameters: { radius: number } }).parameters.radius).toBeLessThan(g.layout.BAY.x1);
    // and the open sea round them has ripples on it
    const sheet = horizon.children.find(o => o instanceof Mesh && o.geometry.attributes.uv) as Mesh;
    expect((sheet.material as MeshLambertMaterial).map).toBeTruthy();
  });
});

describe('the beach\'s edges', () => {
  const load = async (season: number, q: 'low' | 'high' = 'high') => {
    const g = await loadWith(q, { tiles: STAGE2, season });
    const beach = await import('../src/beach');
    g.run(0.1);
    return { g, beach, edge: named(g, 'beachEdge') };
  };

  it('are cut to a wandering line, with soft sand, wet sand and grass over it', async () => {
    const { g, beach, edge } = await load(SUMMER);
    const { BEACH, BAY } = g.layout;
    expect(edge.parent).toBe(beach.sands!.g);
    const [soft, wet, grass] = edge.children as Mesh[];
    // the beach's own sand, both versions, is cut where there's less of it
    const sandy = meshes(beach.sands!.g).filter(m => (m.material as MeshLambertMaterial).alphaMap);
    expect(sandy.length).toBe(2);
    expect(sandy.every(m => (m.material as MeshLambertMaterial).alphaTest > 0.5)).toBe(true);
    // its straight strip of wet sand has given way to the lapping one
    const strips = meshes(beach.sands!.g).filter(m => (m.geometry as unknown as { parameters?: { width: number } }).parameters?.width === 0.6);
    expect(strips.map(m => m.visible)).toEqual([false]);
    expect(wet.visible).toBe(true);
    // the soft sand runs from the water to short of the road's kerb, and on up the coast past the beach's north end
    const at = corners(soft);
    expect(Math.min(...at.map(v => v.x))).toBeCloseTo(BAY.x1, 1);
    expect(Math.max(...at.map(v => v.x))).toBeLessThan(g.world.ROAD2_X - g.world.ROAD_HALF);
    expect(Math.min(...at.map(v => v.z))).toBeLessThan(BEACH.z0 - 30);
    expect(Math.max(...at.map(v => v.z))).toBeLessThanOrEqual(BEACH.z1);
    // flat, and out of any ray's way
    expect(at.every(v => Math.abs(v.y - 0.0035) < 1e-6)).toBe(true);
    expect(corners(grass).length).toBeGreaterThan(100);
    for (const m of [soft, wet, grass]) { const hits: never[] = []; m.raycast(null as never, hits); expect(hits).toEqual([]); }
    // drawn before anything else see-through, so a pad or a shadow on the sand is drawn over it
    expect(soft.renderOrder).toBeLessThan(wet.renderOrder);
    expect(wet.renderOrder).toBeLessThan(0);
  });

  it('take the beach\'s look on each setting, and go under the snow in winter', async () => {
    const summer = await load(SUMMER);
    const { choose } = await import('../src/graphics');
    const soft = summer.edge.children[0] as Mesh, mat = soft.material as MeshLambertMaterial;
    expect(mat.map).toBeTruthy();
    choose('low');
    expect([mat.map, mat.color.getHex()]).toEqual([null, (await import('../src/palette')).C.sand]);
    choose('high');
    expect(mat.map).toBeTruthy();
    expect([soft.visible, mat.opacity]).toEqual([true, 1]);

    const winter = await load(WINTER);
    const [snowed, wet] = winter.edge.children as Mesh[];
    expect([snowed.visible, wet.visible]).toEqual([false, false]);
  });
});
