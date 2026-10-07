// The rice side of the chain (stage 2): the terraces, harvesting them, the farmer and the rice porter.
import { describe, expect, it } from 'vitest';
import { bought, loadGame } from './helpers';

const ripen = (g: Awaited<ReturnType<typeof loadGame>>) => g.run(16.1);

describe('terraces', () => {
  it('are bare until planted, one at a time', async () => {
    const g = await loadGame({ tiles: bought('sushi') });
    const { field } = g.rice;
    expect(field.cells).toHaveLength(0);
    g.unlocks.applyUnlock('paddy');
    expect(field.cells).toHaveLength(18);
    expect(field.cells.every(c => c.g.position.y === g.layout.TERRACES[0].top)).toBe(true);
    g.unlocks.applyUnlock('plot2');
    g.unlocks.applyUnlock('plot3');
    expect(field.cells).toHaveLength(54);
    expect(field.planted).toEqual([0, 1, 2]);
  });

  it('grow rice the player harvests by wading through it', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'paddy') });
    const { field } = g.rice;
    const c = field.cells[0];
    expect(c.heads.visible).toBe(false);
    ripen(g);
    expect(field.cells.every(x => x.grow >= 1 && x.heads.visible)).toBe(true);
    g.placePlayer(c.x, c.z);
    g.run(0.5);
    expect(g.player.back.count('rice')).toBeGreaterThan(0);
    expect(c.grow).toBeLessThan(1); // replanted
  });
});

describe('farmer', () => {
  it('harvests ripe rice onto the stack on the path', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'paddy', 'plot2', 'farmer') });
    ripen(g);
    g.runUntil(() => g.rice.fieldStack.items.length >= 3, 20);
    expect(g.rice.farmer!.g.parent).not.toBeNull();
  });

  it('works the upper terraces too, standing on them', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'paddy', 'plot2', 'farmer') });
    const f = g.rice.farmer!;
    g.rice.field.cells.slice(0, 18).forEach(c => { c.grow = 0; });
    ripen(g);
    g.runUntil(() => f.state === 'cut', 20);
    expect(f.g.position.y).toBeCloseTo(g.layout.TERRACES[1].top);
  });

  it('waits by the last plant when the stack is full, and goes home when nothing is ripe', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'paddy', 'farmer'), field: 40 });
    const f = g.rice.farmer!;
    ripen(g);
    g.runUntil(() => f.state === 'cut', 20);
    g.run(2);
    expect(f.state).toBe('cut');
    expect(g.rice.fieldStack.items).toHaveLength(40);
    g.rice.fieldStack.take();
    g.runUntil(() => f.state === 'seek');
    g.rice.field.cells.forEach(c => { c.grow = 0; });
    g.run(6);
    expect(f.g.position.distanceTo(g.util.V(g.rice.FARM_HOME.x, f.g.position.y, g.rice.FARM_HOME.z))).toBeLessThan(0.1);
  });
});

describe('rice porter', () => {
  it('carries harvested rice in through the farm door to the kitchen line', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'paddy', 'porter'), field: 3 });
    const { ricePot } = g.restaurant;
    g.restaurant.sushi.spawnT = Infinity;
    g.restaurant.sushi.chefs[0].state = 'fetch'; // keep the chef from using it
    const p = g.rice.porter!;
    let indoors = false;
    g.runUntil(() => { indoors ||= g.layout.inHall(p.g.position); return ricePot.items.length === 3; }, 40);
    expect(indoors).toBe(true);
    g.runUntil(() => p.state === 'load', 40); // and heads back for more
  });

  it('waits with its load while the pot is full', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'paddy', 'porter'), field: 8, rice: 48 });
    const p = g.rice.porter!;
    g.restaurant.sushi.chefs[0].state = 'fetch';
    g.runUntil(() => p.state === 'unload', 40);
    g.run(2);
    expect(p.back.n).toBe(8);
  });
});
