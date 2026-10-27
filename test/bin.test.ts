// The bins, beside the places things are picked up, where E (or the Toss button on a touch screen) throws away
// everything the player's carrying.
import { describe, expect, it } from 'vitest';
import { bought, FLOE_SUSHI, loadGame, MARKET } from './helpers';

const $ = (id: string) => document.getElementById(id)!;

describe('the bins', () => {
  it("throw away what you're carrying with a press of E, at the market's bin", async () => {
    const g = await loadGame({ back: 6 });
    const { BINS } = await import('../src/bin');
    const market = BINS[0];
    g.run(0.1);
    expect(BINS.filter(b => b.g.visible).map(b => b.stage)).toEqual([1]); // the farm's and the cellar's not till later
    // away from the bin, E does nothing
    expect(g.player.back.n).toBe(6);
    g.press('e'); g.run(0.2); g.press('e', 'keyup');
    expect(g.player.back.n).toBe(6);
    // at it, the tip says how, and E empties their arms into it, lid open
    g.placePlayer(market.at.x, market.at.z + 0.95);
    g.run(0.1);
    expect($('tip').classList.contains('on')).toBe(true);
    expect($('tip').textContent).toContain('Bin');
    g.press('e'); g.run(0.1);
    expect(g.player.back.n).toBe(0);
    expect(market.open).toBeGreaterThan(0.5);
    g.press('e', 'keyup');
    g.run(1.5);
    expect(market.open).toBeLessThan(0.1);
    expect($('tip').classList.contains('on')).toBe(false); // nothing left to throw away
  });

  it('has more on the farm path from stage 2, and in the cellar for stage 3, each only on its own level', async () => {
    const g = await loadGame({ tiles: bought(...MARKET, 'sushi', ...FLOE_SUSHI), back: 4 });
    const { BINS } = await import('../src/bin');
    const farm = BINS.find(b => b.stage === 2)!;
    g.run(0.1);
    expect(farm.g.visible).toBe(true);
    g.player.g.position.set(farm.at.x, farm.at.y, farm.at.z + 0.95);
    g.run(0.1);
    g.press('e'); g.run(0.1); g.press('e', 'keyup');
    expect(g.player.back.n).toBe(0);

    const ring = await loadGame({ tiles: bought(...MARKET, 'sushi', ...FLOE_SUSHI, 'dohyo'), fugu: 2, level: 1, hands: { bowl: 3 } });
    const bins = await import('../src/bin');
    const below = bins.BINS[bins.BINS.length - 1];
    // the cellar's isn't there from up on the dock, right over it
    ring.layout.level.down = false;
    expect(bins.binAt(below.at)).toBe(null);
    ring.layout.level.down = true;
    expect(bins.binAt(below.at)).toBe(below);
    ring.player.g.position.set(below.at.x + 0.95, below.at.y, below.at.z);
    ring.run(0.1);
    expect(ring.player.back.n).toBe(3);
    ring.press('e'); ring.run(0.1); ring.press('e', 'keyup');
    expect(ring.player.back.n).toBe(0);
  }, 30_000); // 10.8 s of 15 on CI under coverage

  it('holding E down at a bin throws away once: what you pick up after stays', async () => {
    const g = await loadGame({ back: 3 });
    const { BINS } = await import('../src/bin');
    const items = await import('../src/items');
    const bin = BINS[0];
    g.placePlayer(bin.at.x, bin.at.z + 0.95);
    g.press('e'); g.run(0.1);
    expect(g.player.back.n).toBe(0);
    g.player.back.put(items.newFillet());
    g.run(0.5);
    expect(g.player.back.n).toBe(1);
    g.press('e', 'keyup');
  });

  it("what's thrown away by the fish pile doesn't come straight back: picking up waits till they step out and back in", async () => {
    const g = await loadGame({ back: 6 }); // (arms full: nothing's flying into them as they toss)
    const { BINS } = await import('../src/bin');
    const { PILE, pile } = await import('../src/stations');
    const items = await import('../src/items');
    for (let i = 0; i < 4; i++) pile.put(items.newFillet());
    const bin = BINS[0];
    // in reach of both the bin and the pile
    g.placePlayer(bin.at.x - 0.2, bin.at.z + 0.95);
    g.press('e'); g.run(0.1); g.press('e', 'keyup');
    expect(g.player.back.n).toBe(0);
    g.run(1);
    expect(g.player.back.n).toBe(0);
    expect(pile.items.length).toBe(4);
    // out of the pile's reach, and back
    g.placePlayer(PILE.x, PILE.z + 2.2); g.run(0.2);
    expect(g.player.back.n).toBe(0);
    g.placePlayer(bin.at.x - 0.2, bin.at.z + 0.95); g.run(0.5);
    expect(g.player.back.n).toBeGreaterThan(0);
  });

  it('all stand on their own floors, out of the way, and well away from the cellar hatch', async () => {
    const g = await loadGame({ tiles: bought(...MARKET, 'sushi', ...FLOE_SUSHI, 'dohyo'), fugu: 2 });
    const { BINS } = await import('../src/bin');
    const L = g.layout;
    for (const b of BINS) {
      L.level.down = b.down;
      const q = { x: b.at.x, z: b.at.z };
      L.keepOnFloor(q, L.walkable());
      expect([q.x, q.z]).toEqual([b.at.x, b.at.z]);
      expect(L.groundY(b.at, b.down)).toBeCloseTo(b.at.y, 1);
      if (!b.down) expect(Math.hypot(b.at.x - L.HATCH_AT.x, b.at.z - L.HATCH_AT.z)).toBeGreaterThanOrEqual(3);
    }
    // and none where a tile is bought (up top): standing on one never also offers a bin's E
    const { tiles } = await import('../src/unlocks');
    for (const b of BINS.filter(b => !b.down)) {
      for (const t of tiles.filter(t => t.stage <= 2 && t.stage >= b.stage && !t.menu)) {
        const dx = Math.max(0, Math.abs(b.at.x - t.x) - t.half), dz = Math.max(0, Math.abs(b.at.z - t.z) - t.half);
        expect(Math.hypot(dx, dz), t.id).toBeGreaterThan(1.1);
      }
    }
    L.level.down = false;
  });
});
