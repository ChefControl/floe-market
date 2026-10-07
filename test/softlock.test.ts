// Situations a player could get stuck in for good, and the ways out the game guarantees.
import { describe, expect, it } from 'vitest';
import { play } from './bot';
import { bought, loadGame } from './helpers';

/** Walks the player through the rice patch, clump by clump. */
function wade(g: Awaited<ReturnType<typeof loadGame>>) {
  for (const c of g.rice.field.cells) { g.placePlayer(c.x, c.z); g.run(0.3); }
}

describe('no way to get stuck', () => {
  it('no rice anywhere, arms full of fish the tray has no room for: wading into ripe rice sends fish back to the pile', async () => {
    const g = await loadGame({ tiles: bought('pack', 'sushi'), back: 14, fish: 48 });
    const { RICE_DROP, ricePot } = g.restaurant, { pile } = g.stations;
    expect(g.wallet.money).toBe(0);
    g.run(15.1); // the patch ripens
    wade(g);
    const bags = g.player.back.count('rice');
    expect(bags).toBe(6);
    expect(g.player.back.count('fish')).toBe(8); // a slice the kitchen couldn't take for each bag...
    g.run(1);
    expect(pile.n).toBe(6); // ...is back on the pile
    g.placePlayer(RICE_DROP.x, RICE_DROP.z);
    g.run(1);
    expect(g.player.back.count('rice')).toBe(0);
    expect(ricePot.n + g.restaurant.sushiStock().plates).toBeGreaterThan(bags - 2); // and the chefs are already on it
    g.runUntil(() => g.cashAt({ cash: g.restaurant.register }) > 0, 90); // plates sold
  });

  it('throws away fish the kitchen and the pile have no room for', async () => {
    const g = await loadGame({ tiles: bought('pack', 'sushi'), back: 14, fish: 48, pile: 60 });
    g.run(15.1);
    wade(g);
    expect(g.player.back.count('rice')).toBe(6);
    expect(g.stations.pile.n).toBe(g.stations.pile.cap);
  });

  it("keeps fish the kitchen could still take: harvesting fills the room in your arms", async () => {
    const g = await loadGame({ tiles: bought('pack', 'sushi'), back: 10 });
    g.run(15.1);
    wade(g);
    expect(g.player.back.count('fish')).toBe(10); // go and drop them off
    expect(g.player.back.count('rice')).toBe(4);
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
