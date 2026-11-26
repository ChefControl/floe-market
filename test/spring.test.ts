// The hot spring over the terraces (farm.ts, propsSpring.ts): a hillside with banks that slope and wander instead of a
// box, a pool with an uneven shore in a ring of boulders of all sizes, a dry-stone wall over the top terrace, a bamboo
// pipe, and a stone lantern that glows at dusk. All of it stands where it stood on the last visit.
import { type Group, Mesh, type MeshLambertMaterial, Sprite, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { bought, loadGame } from './helpers';

/** The hillside and its spring, as farm.ts has them. */
const HILL = { x0: -37, x1: -24.95, z0: -6, z1: 12, y: 2.4 }, SPRING = { x: -29.6, z: 0.8 }, RX = 1.85, RZ = 1.5;
const where = (p: { m: { elements: number[] } }) => new Vector3(p.m.elements[12], p.m.elements[13], p.m.elements[14]);
const key = (p: { m: { elements: number[] } }) => p.m.elements.map(e => e.toFixed(5)).join();

describe('the terrace spring', () => {
  it('stands on a hillside whose banks slope down and wander, flat round the pool', async () => {
    await loadGame();
    const { hillHeight, hillside, wallSlab } = await import('../src/propsSpring');
    // as high as it was on top, and out to its east edge, where the wall holds it up over the top terrace
    expect(hillHeight(HILL, SPRING.x, SPRING.z)).toBeCloseTo(HILL.y, 6);
    expect(hillHeight(HILL, HILL.x1, SPRING.z)).toBeCloseTo(HILL.y, 6);
    // down to the ground past its feet: west, south and (a short way) north, at the shore
    expect(hillHeight(HILL, HILL.x0 - 2.5, 3)).toBe(0);
    expect(hillHeight(HILL, -30, HILL.z1 + 1.5)).toBe(0);
    expect(hillHeight(HILL, -30, HILL.z0 - 0.7)).toBe(0);
    // a bank only ever goes down, and it isn't a straight line along the hill: its middle is further out here than there
    let last = Infinity;
    for (let x = HILL.x0 + 1; x >= HILL.x0 - 2.5; x -= 0.1) {
      const h = hillHeight(HILL, x, 3);
      expect(h).toBeLessThanOrEqual(last + 1e-9);
      last = h;
    }
    const halfway = (z: number) => { let x = HILL.x0 + 1; while (hillHeight(HILL, x, z) > HILL.y / 2) x -= 0.02; return x; };
    expect(Math.abs(halfway(0) - halfway(4))).toBeGreaterThan(0.2);

    // the ground: level round the pool, never quite flat elsewhere, just under the ground at its feet, and in patches
    const g = hillside(HILL, 0, 0, { x: SPRING.x, z: SPRING.z, r: 2.6 }), p = g.attributes.position, c = g.attributes.color;
    expect(c.count).toBe(p.count);
    const shades = new Set<string>();
    let lowest = Infinity, bumps = 0;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (Math.hypot(p.getX(i) - SPRING.x, p.getZ(i) - SPRING.z) < 2.6) expect(y).toBeCloseTo(HILL.y, 6);
      else if (Math.abs(y - HILL.y) > 0.005 && y > HILL.y - 0.04) bumps++;
      expect(y).toBeLessThan(HILL.y + 0.04);
      lowest = Math.min(lowest, y);
      shades.add(c.getX(i).toFixed(2));
    }
    expect(lowest).toBeCloseTo(-0.06, 6);
    expect(bumps).toBeGreaterThan(40);
    expect(shades.size).toBeGreaterThan(5);

    // Low's wall: one plain piece as high as the hill, running down with its banks at both ends
    const slab = wallSlab(HILL.z0 - 0.4, HILL.z1 + 0.95, 0, 0.25, z => hillHeight(HILL, HILL.x1, z)), s = slab.attributes.position;
    expect(slab.index).toBeNull();
    let top = 0, north = 0, south = 0;
    for (let i = 0; i < s.count; i++) {
      top = Math.max(top, s.getY(i));
      if (s.getZ(i) < HILL.z0 - 0.3) north = Math.max(north, s.getY(i));
      if (s.getZ(i) > HILL.z1 + 0.9) south = Math.max(south, s.getY(i));
    }
    expect(top).toBeCloseTo(HILL.y, 6);
    expect(north).toBeLessThan(0.4);
    expect(south).toBeLessThan(0.4);
  });

  it('has a pool with an uneven shore, boulders of all sizes, a dry-stone wall and a lantern, the same every visit', async () => {
    await loadGame();
    const { dryWall, hillHeight, poolRocks, poolWater, rocks, shore, stoneLantern } = await import('../src/propsSpring');
    const { at, Build, dice } = await import('../src/kit');
    // the shore's never a clean oval
    const rs = Array.from({ length: 72 }, (_, i) => shore(i / 72 * Math.PI * 2));
    expect(Math.min(...rs)).toBeGreaterThan(0.8);
    expect(Math.max(...rs)).toBeLessThan(1.2);
    expect(Math.max(...rs) - Math.min(...rs)).toBeGreaterThan(0.15);
    // the water: deep in the middle, pale at its rim, which is the shore
    const w = poolWater(RX, RZ, 0x102030, 0x405060, 0xF0E0D0, dice(1)), wp = w.attributes.position, wc = w.attributes.color, end = wp.count - 1;
    expect([wc.getX(0), wc.getY(0), wc.getZ(0)].map(v => Math.round(v * 255))).toEqual([0x10, 0x20, 0x30]);
    expect([wc.getX(end), wc.getY(end), wc.getZ(end)].map(v => Math.round(v * 255))).toEqual([0xF0, 0xE0, 0xD0]);
    const x = wp.getX(end) / RX, z = -wp.getY(end) / RZ;
    expect(Math.hypot(x, z)).toBeCloseTo(shore(Math.atan2(z, x)), 5);

    // the boulders: the same ones on the same dice, big and small, and none where the pipe leaves the pool (east)
    const a = rocks(), b = rocks(), gap = { a: 0, w: 0.16 };
    poolRocks(a, RX, RZ, HILL.y, dice(0x5915), gap);
    poolRocks(b, RX, RZ, HILL.y, dice(0x5915), gap);
    expect(b.rock.pieces.map(key)).toEqual(a.rock.pieces.map(key));
    // (a boulder has one cap of snow, over its middle)
    expect(a.snow.pieces.length).toBeGreaterThan(20);
    expect(a.snow.pieces.length).toBeLessThan(60);
    const sizes = a.snow.pieces.map(p => Math.hypot(p.m.elements[0], p.m.elements[1], p.m.elements[2]));
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeGreaterThan(3);
    for (const p of a.snow.pieces) {
      const v = where(p);
      expect(Math.abs(Math.atan2(v.z / RZ, v.x / RX))).toBeGreaterThan(gap.w);
    }

    // the wall: no stone higher than the hill behind it; and the ones the top terrace stands in front of left out,
    // without moving the rest
    const h = (zz: number) => hillHeight(HILL, HILL.x1, zz), behind = (zz: number) => zz > -3.15 && zz < 4.75 ? 1.0 : 0;
    const all = new Build(), cut = new Build(), grass = new Build();
    dryWall(all, grass, HILL.z0 - 0.4, HILL.z1 + 0.95, h, dice(0x5916));
    dryWall(cut, new Build(), HILL.z0 - 0.4, HILL.z1 + 0.95, h, dice(0x5916), behind);
    expect(all.pieces.length).toBeGreaterThan(200);
    expect(grass.empty).toBe(false);
    for (const p of all.pieces) { const v = where(p); expect(v.y).toBeLessThanOrEqual(h(v.z) + 0.12); }
    expect(cut.pieces.length).toBeLessThan(all.pieces.length - 20);
    const whole = new Set(all.pieces.map(key)), kept = new Set(cut.pieces.map(key));
    for (const p of cut.pieces) expect(whole.has(key(p))).toBe(true);
    for (const p of all.pieces) {
      if (kept.has(key(p))) continue;
      const v = where(p);
      expect(v.y).toBeLessThan(0.95);
      expect(behind(v.z)).toBe(1.0);
    }

    // the lantern: stone, with a box of paper panes for its light and a cap of snow for winter
    const stone = new Build(), panes = new Build(), snow = new Build();
    stoneLantern(stone, panes, at(0, 0, 0), snow);
    expect(stone.pieces.length).toBeGreaterThan(6);
    expect(panes.pieces.length).toBe(1);
    expect(snow.pieces.length).toBe(1);
  });

  it('steams, and glows from its lantern at dusk; Low has it plainer', async () => {
    const g = await loadGame({ tiles: bought('pack', 'turret', 'net', 'sushi', 'paddy') });
    const { choose } = await import('../src/graphics');
    const hill = g.farm.farmPieces[4] as Group, lamp = g.farm.springLamp;
    expect(g.layout.stage.n).toBe(2);
    expect(hill.visible).toBe(true);
    // the glow comes from over the lantern beside the pool, not from over the water
    expect(lamp.parent).toBe(g.render.scene);
    const off = Math.hypot(lamp.position.x - SPRING.x, lamp.position.z - SPRING.z);
    expect(off).toBeGreaterThan(2.2);
    expect(off).toBeLessThan(3.6);
    // its panes light up with it
    const lit: Mesh[] = [], puffs: Sprite[] = [];
    hill.traverse(o => {
      if (o instanceof Sprite) puffs.push(o);
      else if (o instanceof Mesh && (o.material as MeshLambertMaterial).emissive?.getHex() === 0xFFB46A) lit.push(o);
    });
    expect(lit.length).toBe(1);
    const panes = lit[0].material as MeshLambertMaterial;
    lamp.intensity = 0; g.farm.updFarm(1 / 60);
    expect(panes.emissiveIntensity).toBeCloseTo(0.12, 6);
    lamp.intensity = 9; g.farm.updFarm(1 / 60);
    expect(panes.emissiveIntensity).toBeCloseTo(1, 6);

    // the steam: fourteen thin wisps that rise from the water and never stray far or turn thick
    expect(puffs.length).toBe(14);
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      g.farm.updFarm(1 / 30);
      for (const s of puffs) {
        expect(s.material.opacity).toBeLessThanOrEqual(0.34 * 1.5 + 1e-9);
        expect(s.position.y).toBeGreaterThan(HILL.y);
        expect(s.position.y).toBeLessThan(HILL.y + 3.7);
        expect(Math.hypot(s.position.x + hill.position.x - SPRING.x, s.position.z + hill.position.z - SPRING.z)).toBeLessThan(3);
      }
      if (!i) for (const s of puffs) seen.add(`${s.position.x.toFixed(2)},${s.position.z.toFixed(2)}`);
    }
    // (each from its own place on the water)
    expect(seen.size).toBe(14);

    // High and Low: one or the other shows; Low has the wall, the rocks, the pool, the pipe and the lantern, plain
    const low = hill.children[0], high = lit[0].parent!;
    choose('high');
    expect([low.visible, high.visible]).toEqual([false, true]);
    choose('low');
    expect([low.visible, high.visible]).toEqual([true, false]);
    expect(low.children.filter(o => o instanceof Mesh).length).toBe(5);
    choose('high');
  });
});
