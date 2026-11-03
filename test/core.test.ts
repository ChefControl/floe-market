// Building blocks: math helpers, item stacks/flights, walking characters.
import { Mesh, type Object3D, SkinnedMesh } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { animPerson, makeSled, moveEnt, Person } from '../src/characters';
import { carrySlot, fly, Holder, updFlights } from '../src/holder';
import { painted, scene } from '../src/render';
import { amount, d2xz, fwd, money, pick, price, rand, randi, V } from '../src/util';

const settle = () => { for (let i = 0; i < 120; i++) updFlights(1 / 60); };

describe('util', () => {
  it('keeps random helpers in range', () => {
    for (let i = 0; i < 100; i++) {
      const r = rand(2, 5);
      expect(r).toBeGreaterThanOrEqual(2);
      expect(r).toBeLessThan(5);
      expect([1, 2, 3]).toContain(randi(1, 3));
    }
    expect(['a', 'b']).toContain(pick(['a', 'b']));
  });

  it('measures and points on the ground plane', () => {
    expect(d2xz({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(25);
    const f = fwd(Math.PI / 2);
    expect(f.x).toBeCloseTo(1);
    expect(f.z).toBeCloseTo(0);
  });

  it('shortens big amounts of money to k, M and B, rounding down', () => {
    const shown = [0, 950, 9_999, 10_000, 12_345, 19_990, 99_999, 100_000, 456_789, 999_999, 1e6, 1_550_000, 999_999_999,
      2_340_000_000, 1_234_000_000_000].map(money);
    expect(shown).toEqual(['$0', '$950', '$9,999', '$10k', '$12.3k', '$19.9k', '$99.9k', '$100k', '$456k', '$999k', '$1M',
      '$1.5M', '$999M', '$2.3B', '$1,234B']);
    expect(amount(25_000_000)).toBe('25M');
    // prices round up, so one never looks affordable when it isn't
    expect([9_999, 12_350, 19_990, 99_950, 100_001, 999_950, 1e6, 1_234_567].map(price)).toEqual(
      ['$9,999', '$12.4k', '$20k', '$100k', '$101k', '$1M', '$1M', '$1.3M']);
    expect([money(12_320), price(12_350)]).toEqual(['$12.3k', '$12.4k']);
  });
});

describe('Holder', () => {
  it('counts in-flight items toward capacity and lands them in order', () => {
    const h = new Holder(i => V(i, 0, 0), 2);
    const a = new Mesh(), b = new Mesh(), landed = vi.fn();
    h.receive(a, 0.3, 0.9, landed);
    h.receive(b);
    expect(h.n).toBe(2);
    expect(h.hasRoom()).toBe(false);
    expect(h.items).toHaveLength(0);
    settle();
    expect(h.items).toEqual([a, b]);
    expect(h.incoming).toBe(0);
    expect(b.position.x).toBe(1);
    expect(landed).toHaveBeenCalledWith(a);
    expect(a.parent).toBe(scene);
  });

  it('puts, takes, lays out and clears items', () => {
    const h = new Holder(i => V(0, i, 0), 5);
    const a = new Mesh(), b = new Mesh();
    h.put(a); h.put(b);
    b.position.set(9, 9, 9);
    h.layout(1.5);
    expect(b.position.y).toBe(1);
    expect(b.rotation.y).toBe(1.5);
    expect(h.take()).toBe(b);
    h.clear();
    expect(h.items).toHaveLength(0);
    expect(a.parent).toBeNull();
    expect(h.take()).toBeNull();
  });
});

describe('mixed stacks', () => {
  it('takes and counts items of one kind out of a mixed stack', () => {
    const h = new Holder(i => V(0, i, 0), 5);
    const kinds = ['fish', 'rice', 'fish'].map(kind => { const m = new Mesh(); m.userData.kind = kind; h.put(m); return m; });
    expect(h.count('fish')).toBe(2);
    expect(h.takeKind('rice')).toBe(kinds[1]);
    expect(h.takeKind('rice')).toBeNull();
    expect(h.takeKind('fish')).toBe(kinds[2]);
    expect(h.count('fish')).toBe(1);
  });
});

describe('fly', () => {
  it('arcs above the straight line, then lands on the target', () => {
    const m = new Mesh(), done = vi.fn();
    fly(m, () => V(10, 0, 0), 1, 2, done);
    updFlights(0.5);
    expect(m.position.x).toBeCloseTo(5);
    expect(m.position.y).toBeCloseTo(2);
    updFlights(0.5);
    expect(m.position.toArray()).toEqual([10, 0, 0]);
    expect(done).toHaveBeenCalledOnce();
  });
});

describe('characters', () => {
  it('walks toward a target at its speed and reports arrival', () => {
    const e = { g: new Person(0xff0000), h: 0, speed: 1, moving: false };
    expect(moveEnt(e, { x: 3, z: 4 }, 1)).toBe(false);
    expect(e.g.position.length()).toBeCloseTo(1);
    expect(e.h).toBeCloseTo(Math.atan2(3, 4));
    expect(e.moving).toBe(true);
    expect(moveEnt(e, { x: 3, z: 4 }, 10)).toBe(false);
    expect(moveEnt(e, { x: 3, z: 4 }, 1)).toBe(true);
    expect(e.moving).toBe(false);
  });

  it('swings limbs while walking and holds arms out while carrying', () => {
    const p = new Person(0xff0000);
    animPerson(p, true, 0.1, false);
    expect(p.legs[0].rotation.x).toBeCloseTo(-p.legs[1].rotation.x);
    expect(p.legs[0].rotation.x).not.toBe(0);
    animPerson(p, false, 0.1, true);
    expect(p.phase).toBe(0);
    expect(p.arms[0].rotation.x).toBe(-1.25);
  });

  /** The meshes drawn of `o` (what shows, and everything it's in, within it). */
  const drawn = (o: Object3D, skip: (o: Object3D) => boolean = () => false) => {
    const out: Mesh[] = [];
    o.traverseVisible(c => { if (c instanceof Mesh && !skip(c)) out.push(c); });
    return out;
  };

  it('draws someone who moves in one mesh, shared with anyone dressed the same, and redresses them with the season', async () => {
    const { setSeason } = await import('../src/season');
    const a = new Person(0x123456), b = new Person(0x123456, 'fancy');
    scene.add(a, b);
    expect(drawn(a)).toHaveLength(1);
    const [one] = drawn(a);
    expect(one).toBeInstanceOf(SkinnedMesh);
    expect(one.parent).toBe(a.body);
    expect([one.material, one.castShadow]).toEqual([painted, true]);
    const twin = () => drawn(new Person(0x123456, 'parka', a.style))[0].geometry;
    expect(twin()).toBe(twin());
    const winter = one.geometry;
    setSeason(2);
    expect(one.geometry).not.toBe(winter);
    expect(a.worn().some(w => w.seasons?.includes('summer'))).toBe(true);
    expect(drawn(b)).toHaveLength(1); // a suit has nothing seasonal in summer, but still a body
    setSeason(0);
    expect(one.geometry).toBe(winter);
    scene.remove(a, b);
  });

  it('draws someone who stands still for good in six meshes, for the batcher to merge with the scenery round them', () => {
    const p = new Person(0x123456, 'fancy').standStill();
    expect(drawn(p)).toHaveLength(6);
    expect(drawn(p).every(m => !(m instanceof SkinnedMesh) && m.material === painted)).toBe(true);
    // the body casts a shadow; the head and eyes never have
    const [shell, trim] = drawn(p).filter(m => m.parent === p.body);
    expect([shell.castShadow, trim.castShadow]).toEqual([true, false]);
    expect([...p.arms, ...p.legs].every(l => drawn(l).length === 1)).toBe(true);
  });

  it('draws each stacked item in one call', async () => {
    const { newBill, newRice, newFillet } = await import('../src/items');
    for (const m of [newBill(1), newRice(), newFillet()]) {
      expect(Array.isArray(m.material)).toBe(false);
      expect(m.geometry.groups).toHaveLength(0);
    }
  });

  /** A sled's own meshes (not its driver's, shared by whoever dresses alike). */
  const ofSled = (g: Object3D) => drawn(g, o => { for (let p: Object3D | null = o; p; p = p.parent) if (p instanceof Person) return true; return false; });

  it('draws a sled in one mesh and its windscreen, shared with every sled of its colour, on either setting', async () => {
    const { choose } = await import('../src/graphics');
    for (const q of ['high', 'low'] as const) {
      choose(q);
      const one = makeSled(1, 2), two = makeSled(1, 4), other = makeSled(3, 4);
      expect(ofSled(one)).toHaveLength(2);
      expect(ofSled(two).map(m => m.geometry)).toEqual(ofSled(one).map(m => m.geometry));
      // (another colour's body is its own; the windscreen's shared by all)
      expect(ofSled(other).map(m => m.geometry).filter(g => ofSled(one).some(m => m.geometry === g))).toHaveLength(1);
    }
    choose('high');
  });

  it('casts a sled\'s shadow as it did: on Low its hull, nose and tyres, after the rest; on High all of it', async () => {
    const { choose } = await import('../src/graphics');
    const { setSeason } = await import('../src/season');
    const body = (g: Object3D) => ofSled(g).find(m => m.material === painted)!;
    choose('low');
    let low = body(makeSled(0xff0000, 0x00ff00));
    // winter: the hull and the nose cast, the skis and the seat don't
    const own = low.geometry.drawRange.count;
    expect(low.userData.shadowFrom).toBe(own);
    expect(low.geometry.index!.count).toBe(own + 2 * 36);
    low.onBeforeShadow(null!, null!, null!, null!, low.geometry, null!, null!);
    expect([low.geometry.drawRange.start, low.geometry.drawRange.count]).toEqual([own, Infinity]);
    low.onAfterShadow(null!, null!, null!, null!, low.geometry, null!, null!);
    expect([low.geometry.drawRange.start, low.geometry.drawRange.count]).toEqual([0, own]);
    setSeason(2);
    low = body(makeSled(0xff0000, 0x00ff00));
    // the rest of the year: the four tyres cast too
    expect(low.geometry.index!.count - low.userData.shadowFrom).toBeGreaterThan(2 * 36 + 4 * 100);
    setSeason(0);
    choose('high');
    const high = body(makeSled(0xff0000, 0x00ff00));
    expect([high.castShadow, high.userData.shadowFrom, high.geometry.drawRange.count]).toEqual([true, undefined, Infinity]);
    // its bodywork painted the sled's colour (white paint, in red)
    const col = high.geometry.attributes.color.array;
    let red = 0;
    for (let i = 0; i < col.length; i += 3) if (col[i] === 255 && col[i + 1] === 0 && col[i + 2] === 0) red++;
    expect(red).toBeGreaterThan(50);
  });

  it('builds a sled with a driver', () => {
    const sled = makeSled(0xff0000, 0x00ff00);
    const driver = sled.children.find(c => c instanceof Person) as Person;
    expect(driver.arms[0].rotation.x).toBe(-1.1);
  });

  it('runs a sled on skis in winter and on wheels the rest of the year', async () => {
    const { scene } = await import('../src/render');
    const { setSeason } = await import('../src/season');
    const sled = makeSled(0xff0000, 0x00ff00);
    scene.add(sled);
    /** Low's body and High's. */
    const bodies = () => { const r: Mesh[] = []; sled.traverse(c => { if (c instanceof Mesh && c.userData.bySeason) r.push(c); }); return r; };
    expect(bodies()).toHaveLength(2);
    const winter = bodies().map(m => m.geometry), sizes = () => bodies().map(m => m.geometry.attributes.position.count);
    const onSkis = sizes();
    setSeason(2);
    expect(bodies().map(m => m.geometry).some(g => winter.includes(g))).toBe(false);
    // four wheels with their hubs are more than two skis
    expect(sizes().every((n, i) => n > onSkis[i])).toBe(true);
    setSeason(0);
    expect(bodies().map(m => m.geometry)).toEqual(winter);
    scene.remove(sled);
  });

  it('stacks carried items in front of the carrier', () => {
    const e = { g: new Person(0), h: 0 };
    const s0 = carrySlot(e, 0), s1 = carrySlot(e, 1);
    expect(s0.z).toBeCloseTo(0.42);
    expect(s1.y).toBeGreaterThan(s0.y);
  });
});
