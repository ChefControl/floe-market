// Situations a player could get stuck in for good, and the ways out the game guarantees.
import { describe, expect, it } from 'vitest';
import { play } from './bot';
import { bought, loadGame } from './helpers';

describe('no way to get stuck', () => {
  it('broke, no rice anywhere, arms full of fish the tray has no room for: the stall takes fish for rice', async () => {
    const g = await loadGame({ tiles: bought('pack', 'sushi'), back: 14, fish: 48 });
    const { STALL } = g.rice, { RICE_DROP, ricePot } = g.restaurant;
    expect(g.wallet.money).toBe(0);
    g.placePlayer(STALL.x, STALL.z);
    g.run(2.5);
    expect(g.player.back.count('rice')).toBe(14);
    expect(g.player.back.count('fish')).toBe(0);
    g.placePlayer(RICE_DROP.x, RICE_DROP.z);
    g.run(1);
    expect(g.player.back.n).toBe(0);
    expect(ricePot.n + g.restaurant.sushiStock().plates).toBeGreaterThan(10); // and the chefs are already on it
    g.runUntil(() => g.cashAt({ cash: g.restaurant.register }) > 0, 90); // plates sold
  });

  it('arms full of fish the kitchen has no room for, with cash: the stall still swaps fish for rice', async () => {
    const g = await loadGame({ tiles: bought('pack', 'sushi'), back: 14, fish: 48, money: 100 });
    g.placePlayer(g.rice.STALL.x, g.rice.STALL.z);
    g.run(2.5);
    expect(g.player.back.count('rice')).toBe(14);
    expect(g.wallet.money).toBe(100); // a swap, not a sale
  });

  it("doesn't swap fish the kitchen could still take: you buy rice with room in your arms", async () => {
    const g = await loadGame({ tiles: bought('pack', 'sushi'), back: 14, money: 100 });
    g.placePlayer(g.rice.STALL.x, g.rice.STALL.z);
    g.run(1);
    expect(g.player.back.count('fish')).toBe(14); // go and drop them off first
  });

  it("pays while there's the cash for a bag, and trades fish after that", async () => {
    const g = await loadGame({ tiles: bought('sushi'), back: 3, money: 5 });
    g.placePlayer(g.rice.STALL.x, g.rice.STALL.z);
    g.run(1);
    expect(g.player.back.count('rice')).toBe(4); // one bought, three traded
    expect(g.player.back.count('fish')).toBe(0);
    expect(g.wallet.money).toBe(0);
  });

  it("can take bags off the farmer's stack before there's a rice porter", async () => {
    const g = await loadGame({ tiles: bought('sushi', 'paddy'), field: 5 });
    g.placePlayer(g.rice.STACK_AT.x, g.rice.STACK_AT.z);
    g.run(1);
    expect(g.player.back.count('rice')).toBe(5);
  });

  it('the chefs pack only a few boxes ahead for the kiosk, so plates keep coming for diners', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'kiosk', 'chef'), fish: 20, rice: 20 });
    const { TAKEOUT } = g.counters, { sushi } = g.restaurant;
    TAKEOUT.maxQ = 0;
    sushi.spawnT = Infinity;
    g.run(30);
    expect(TAKEOUT.stock.n).toBe(4);
    expect(sushi.slots.filter(Boolean).length).toBeGreaterThan(8);
  });

  it('a player who has lost everything in stage 2 earns their way back', async () => {
    // stage 2 always has the market's fishing machines and runner; no money, no rice, nothing in stock
    const g = await loadGame({ tiles: bought('pack', 'turret', 'runner', 'net', 'sushi') });
    const { earned } = play(g, 4 * 60);
    expect(earned).toBeGreaterThan(500);
  });

  it('a whole game never stalls: something new is bought at least every six minutes', async () => {
    const g = await loadGame();
    const { bought: got } = play(g, 45 * 60);
    expect(got.some(b => b.id === 'sushi')).toBe(true);
    const gaps = got.map((b, i) => b.t - (i ? got[i - 1].t : 0));
    expect(Math.max(...gaps)).toBeLessThan(6 * 60);
  }, 120_000);
});
