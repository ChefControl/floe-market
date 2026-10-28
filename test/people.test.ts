// How people are drawn and move: rounded limbs with hands and shoes, faces with ears and a nose, clothes with their
// details, a walk that bounces with both feet on the ground, and breathing while they stand.
import { Box3, BoxGeometry, Mesh, SkinnedMesh, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { Person } from '../src/characters';
import { loadGame } from './helpers';

const characters = () => import('../src/characters');
/** How many pieces in `geo` they have on, and in which colours. */
const pieces = (p: Person, geo: unknown) => p.worn().filter(w => w.geo === geo);

describe('people', () => {
  it('have hands and shoes on their arms and legs, and ears and a nose', async () => {
    const g = await loadGame({ season: 1 });
    const { Person, LIMBS } = await characters();
    for (const look of ['parka', 'fancy', 'chef', 'farmer', 'waiter'] as const) {
      const p = new Person(0x5B8DEF, look);
      expect(pieces(p, LIMBS.shoe)).toHaveLength(2);
      expect(pieces(p, LIMBS.hand).filter(h => h.c === p.style.skin)).toHaveLength(2);
      // two ears either side of the head, and a nose on the front of it
      const head = p.worn().filter(w => w.o.userData.own && w.geo !== g.render.G.head && w.o.position.y > 1);
      expect(head.map(w => Math.sign(Math.round(w.o.position.x * 100))).sort()).toEqual([-1, 0, 1]);
    }
    const farmer = new Person(0x7A9E3B, 'farmer');
    expect(pieces(farmer, LIMBS.boot)).toHaveLength(2); // wellies, all year
    expect(pieces(farmer, LIMBS.trouser).every(t => t.c === 0x3D5A80)).toBe(true); // denim
    g.run(0.1);
  });

  it('dresses the parka with a zip and pockets, and suits and chefs with buttons', async () => {
    await loadGame();
    const { Person, shade } = await characters();
    const parka = new Person(0x5B8DEF);
    expect(parka.worn().filter(w => w.c === shade(0x5B8DEF, 0.86))).toHaveLength(2); // pockets
    expect(parka.worn().some(w => w.c === shade(0x5B8DEF, 0.68))).toBe(true); // the zip
    const chef = new Person(0xF4F6F8, 'chef');
    expect(chef.worn().filter(w => w.c === 0xB8C0C8)).toHaveLength(6);
    const suit = new Person(0x22303C, 'fancy');
    expect(suit.worn().filter(w => w.c === shade(0x22303C, 0.72))).toHaveLength(2); // lapels
  });

  it('walks with both feet on the ground, the body dipping and leaning into the stride', async () => {
    const g = await loadGame();
    const { Person, animPerson } = await characters();
    const p = new Person(0x5B8DEF);
    g.render.scene.add(p);
    const foot = new Vector3();
    let lowest = Infinity, dipped = 0;
    for (let i = 0; i < 60; i++) {
      animPerson(p, true, 1 / 60, false);
      p.updateMatrixWorld(true);
      const ys = p.legs.map(l => l.localToWorld(foot.set(0, -0.3, 0)).y);
      lowest = Math.min(lowest, ...ys);
      expect(Math.abs(Math.min(...ys))).toBeLessThan(0.012); // one foot or the other is always down
      dipped = Math.min(dipped, p.body.position.y);
    }
    expect(lowest).toBeGreaterThan(-0.02);
    expect(dipped).toBeLessThan(-0.04);
    expect(p.body.rotation.x).toBeGreaterThan(0.04);
    animPerson(p, false, 1, false);
    expect(p.body.position.y).toBeCloseTo(0);
  });

  it('breathes standing still, out of step with the person next to them', async () => {
    await loadGame();
    const { Person, animPerson } = await characters();
    const a = new Person(0x5B8DEF), b = new Person(0x5B8DEF);
    const seen = new Set<string>();
    for (let i = 0; i < 90; i++) {
      animPerson(a, false, 1 / 60, false); animPerson(b, false, 1 / 60, false);
      seen.add(a.body.scale.y.toFixed(3));
      if (i === 45) expect(a.body.scale.y).not.toBeCloseTo(b.body.scale.y, 4);
    }
    expect(seen.size).toBeGreaterThan(10);
  });

  it("never touches the game's luck, however many people it dresses or the seasons change them", async () => {
    await loadGame();
    const { Person } = await characters();
    const { crowd } = await import('../src/wardrobe');
    const { setSeason } = await import('../src/season');
    const patch = new Mesh(new BoxGeometry(0.1, 0.1, 0.02));
    const { makeSled } = await characters();
    const sled = makeSled(0x7A6FF0, 0x5B8DEF);
    (await import('../src/render')).scene.add(sled);
    const random = vi.spyOn(Math, 'random');
    random.mockClear(); // (the tests' seeded luck is a spy already, with the game's loading on it)
    const p = new Person(0x5B8DEF, 'parka', crowd());
    new Person(0xF4F6F8, 'chef'); new Person(0x22303C, 'fancy', crowd());
    p.restyle(0xFF6B4A, crowd());
    p.headband(0xF7D038);
    const chef = new Person(0xF4F6F8, 'chef');
    chef.toque(3);
    chef.standStill(); chef.toque(1);
    p.sew(patch);
    p.baked();
    setSeason(2);
    expect(random).not.toHaveBeenCalled();
    expect(Math.random).toBe(random); // and puts the game's own back
  });

  it('lets go of the clothes nobody is wearing any more, so a long game does not fill a phone', async () => {
    const g = await loadGame();
    const { Person, bakesKept } = await characters();
    const { crowd } = await import('../src/wardrobe');
    g.run(6); // a sweep, to start from what's worn now
    const start = bakesKept();
    const crowdOf = Array.from({ length: 20 }, () => new Person(0x5B8DEF, 'parka', crowd()));
    g.render.scene.add(...crowdOf);
    // (one each: someone who moves is drawn as one)
    expect(bakesKept()).toBeGreaterThan(start + 15);
    g.run(6);
    const worn = bakesKept();
    expect(worn).toBeGreaterThan(start + 15); // still worn
    g.render.scene.remove(...crowdOf); // they've all gone home
    g.run(6);
    expect(bakesKept()).toBeLessThan(worn - 15);
    // and someone who comes back is drawn as before
    g.render.scene.add(crowdOf[0]);
    expect(crowdOf[0].worn().length).toBeGreaterThan(10);
  });

  it('packs each person small: no texture coordinates, and a byte for each colour and normal', async () => {
    await loadGame();
    const { Person } = await characters();
    const p = new Person(0x5B8DEF);
    const shell = p.body.children.find(c => c instanceof Mesh && c.castShadow && c.geometry.attributes.position) as Mesh;
    const a = shell.geometry.attributes;
    expect(a.uv).toBeUndefined();
    expect(a.color.array).toBeInstanceOf(Uint8Array);
    expect(a.normal.array).toBeInstanceOf(Int8Array);
    expect([a.color.normalized, a.normal.normalized]).toEqual([true, true]);
  });

  /** The one mesh someone who moves is drawn in. */
  const jointOf = (p: Person) => p.body.children.find((c): c is SkinnedMesh => c instanceof SkinnedMesh && c.visible)!;

  it('draws someone who moves in one mesh, each corner hung from the body, an arm or a leg, swung by its pivot', async () => {
    const g = await loadGame();
    const { Person, animPerson, LIMBS } = await characters();
    const p = new Person(0x5B8DEF);
    g.render.scene.add(p);
    const j = jointOf(p), geo = j.geometry, bone = geo.attributes.skinIndex, pos = geo.attributes.position;
    expect(geo.attributes.skinWeight.normalized).toBe(true);
    const used = new Set<number>();
    for (let i = 0; i < bone.count; i++) used.add(bone.getX(i));
    expect([...used].sort()).toEqual([0, 1, 2, 3, 4]);
    // the hands hang from the arms and the shoes from the legs, each kept in its own pivot's space
    expect(new Set(p.worn().filter(w => w.geo === LIMBS.hand).map(w => w.bone))).toEqual(new Set([1, 2]));
    expect(p.worn().filter(w => w.geo === LIMBS.shoe).map(w => w.bone).sort()).toEqual([3, 4]);
    // walking: a corner of the left arm is where its pivot puts it now
    animPerson(p, true, 0.1, false);
    g.render.scene.updateMatrixWorld();
    j.skeleton.update();
    const i = Array.from({ length: bone.count }, (_, k) => k).find(k => bone.getX(k) === 1)!;
    const want = new Vector3().fromBufferAttribute(pos, i).applyMatrix4(p.arms[0].matrix);
    const got = j.getVertexPosition(i, new Vector3());
    expect(got.distanceTo(want)).toBeLessThan(1e-5);
    expect(got.distanceTo(new Vector3().fromBufferAttribute(pos, i))).toBeGreaterThan(0.05);
    g.render.scene.remove(p);
  });

  it('sends where their arms and legs are to the graphics chip only when one has moved, and lets it go once they have', async () => {
    const g = await loadGame();
    const { Person, animPerson } = await characters();
    const p = new Person(0x5B8DEF);
    g.render.scene.add(p);
    const j = jointOf(p), tex = j.skeleton.boneTexture!, frame = (moving: boolean) => {
      animPerson(p, moving, 1 / 60, false);
      g.render.scene.updateMatrixWorld();
      j.skeleton.update();
    };
    frame(false);
    const v = tex.version;
    // standing and breathing: the body rises and falls, the arms and legs hang as they were
    for (let i = 0; i < 30; i++) frame(false);
    expect(tex.version).toBe(v);
    frame(true);
    expect(tex.version).toBeGreaterThan(v);
    // gone home: the sweep lets the graphics chip's copy go (sent again if they come back)
    const gone = vi.fn();
    tex.addEventListener('dispose', gone);
    g.render.scene.remove(p);
    g.run(6);
    expect(gone).toHaveBeenCalledOnce();
    expect(j.skeleton.boneTexture).toBe(tex);
  });

  it('casts their shadow from the same mesh: the pieces that cast one, and on Low in the cellar only the body\'s', async () => {
    await loadGame();
    const { Person } = await characters();
    const p = new Person(0x5B8DEF, 'hooligan');
    const j = jointOf(p), geo = j.geometry;
    const count = (f: (w: ReturnType<Person['worn']>[number]) => boolean) => p.worn().filter(f).reduce((n, w) => n + w.geo.index!.count, 0);
    const shadow = () => {
      j.onBeforeShadow(null!, null!, null!, null!, geo, null!, null!);
      const r = [geo.drawRange.start, geo.drawRange.count];
      j.onAfterShadow(null!, null!, null!, null!, geo, null!, null!);
      return r;
    };
    // (what casts none first: the face, the hood; an arm's or leg's all cast, as each did as a mesh of its own, the
    // stripes down a hooligan's sleeves too)
    const limb = (w: { bone: number }) => w.bone >= 1 && w.bone <= 4;
    const off = count(w => !w.o.castShadow && !limb(w)), limbs = count(limb);
    expect(p.worn().some(w => limb(w) && !w.o.castShadow)).toBe(true);
    expect(off).toBeGreaterThan(0);
    expect(shadow()).toEqual([off, Infinity]);
    expect([geo.drawRange.start, geo.drawRange.count]).toEqual([0, Infinity]);
    expect(geo.index!.count - off).toBe(count(w => w.o.castShadow || limb(w)));
    p.limbShadows = false;
    expect(shadow()).toEqual([off + limbs, Infinity]);
  });

  it('wears a toque and a headband in the same mesh: the toque grows and the headband pops in by what they hang from', async () => {
    const g = await loadGame();
    const { Person } = await characters();
    const chef = new Person(0xF4F6F8, 'chef');
    g.render.scene.add(chef);
    const j = jointOf(chef), was = j.geometry, top = () => new Box3().setFromObject(chef).max.y;
    expect(chef.body.children.filter(c => c instanceof Mesh && c.visible)).toEqual([j]);
    const low = top();
    chef.toque(2);
    expect(j.geometry).toBe(was); // nothing baked again
    chef.updateMatrixWorld(true);
    expect(top() - low).toBeCloseTo(2 * 0.06 * chef.style.height, 3);
    // (the puff squashed as a piece, so its normals turn as they should; only moved by what it hangs from)
    expect(chef.worn().find(w => w.bone === 6)!.o.scale.toArray()).toEqual([0.25, 0.16, 0.25]);
    expect(chef.body.children.filter(c => c.position.y > 1.2).map(c => c.scale.x)).toEqual([0.19, 1]);
    // on Low in the cellar, the toque's band casts no shadow, as the slight mesh of its own it was; the puff does
    const geo = j.geometry, band = chef.worn().filter(w => w.bone === 5).reduce((n, w) => n + w.geo.index!.count, 0);
    chef.limbShadows = false;
    j.onBeforeShadow(null!, null!, null!, null!, geo, null!, null!);
    const from = geo.drawRange.start;
    chef.limbShadows = true;
    j.onBeforeShadow(null!, null!, null!, null!, geo, null!, null!);
    j.onAfterShadow(null!, null!, null!, null!, geo, null!, null!);
    expect(from - geo.userData.casts).toBe(band + chef.worn().filter(w => w.bone >= 1 && w.bone <= 4).reduce((n, w) => n + w.geo.index!.count, 0));
    // and its shadow drawn with a depth material of its own (none shared with what isn't skinned)
    expect(j.customDepthMaterial).toBeDefined();
    chef.headband(0xC0392B);
    expect(chef.bandOn).toBe(0xC0392B);
    expect(chef.worn().filter(w => w.bone === 7 && w.c === 0xC0392B)).toHaveLength(3);
    chef.band!.scale.setScalar(0.01); // (popping in, pop.ts)
    expect(j.geometry.attributes.skinIndex.array).toContain(7);
    chef.headband(null);
    expect(chef.bandOn).toBeNull();
    expect(chef.band!.visible).toBe(false);
    expect(chef.worn().some(w => w.bone === 7)).toBe(false);
    // a patch sewn on (a hire's uniform, cellarLooks.ts) is in with the rest, and stays through a change of clothes
    const patch = new Mesh(new BoxGeometry(0.1, 0.09, 0.02), g.render.mat(0x5E4E3C));
    chef.sew(patch);
    expect(chef.worn().some(w => w.o === patch && w.c === 0x5E4E3C)).toBe(true);
    chef.redress();
    expect(chef.worn().some(w => w.o === patch)).toBe(true);
    expect(patch.parent).toBeNull();
    g.render.scene.remove(chef);
  });

  it('boxes someone drawn as one where they stand: an arm held out reaches further', async () => {
    const g = await loadGame();
    const { Person } = await characters();
    const p = new Person(0x5B8DEF);
    g.render.scene.add(p);
    g.render.scene.updateMatrixWorld();
    const box = () => new Box3().setFromObject(p);
    const down = box();
    expect(down.max.y).toBeGreaterThan(1.1);
    expect(down.min.y).toBeLessThan(0.05);
    p.arms[0].rotation.z = -1.5; // (the left arm, out to the side)
    p.updateMatrixWorld(true);
    expect(box().min.x).toBeLessThan(down.min.x - 0.15);
    g.render.scene.remove(p);
  });
});
