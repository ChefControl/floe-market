// How people are drawn and move: rounded limbs with hands and shoes, faces with ears and a nose, clothes with their
// details, a walk that bounces with both feet on the ground, and breathing while they stand.
import { Mesh, Vector3 } from 'three';
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
    const random = vi.spyOn(Math, 'random');
    random.mockClear(); // (the tests' seeded luck is a spy already, with the game's loading on it)
    const p = new Person(0x5B8DEF, 'parka', crowd());
    new Person(0xF4F6F8, 'chef'); new Person(0x22303C, 'fancy', crowd());
    p.restyle(0xFF6B4A, crowd());
    p.headband(0xF7D038);
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
    expect(bakesKept()).toBeGreaterThan(start + 20);
    g.run(6);
    const worn = bakesKept();
    expect(worn).toBeGreaterThan(start + 20); // still worn
    g.render.scene.remove(...crowdOf); // they've all gone home
    g.run(6);
    expect(bakesKept()).toBeLessThan(worn - 20);
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
});
