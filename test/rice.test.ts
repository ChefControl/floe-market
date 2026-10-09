// The rice side of the chain (stage 2): the terraces, harvesting them, the farmer and the rice porter.
import { describe, expect, it } from 'vitest';
import { bought, loadGame } from './helpers';

const ripen = (g: Awaited<ReturnType<typeof loadGame>>) => g.run(30.1);

describe('terraces', () => {
  it('start as a small patch by the farm door, and are planted one at a time', async () => {
    const g = await loadGame({ tiles: bought('sushi') });
    const { field } = g.rice;
    expect(field.cells).toHaveLength(6);
    expect(field.cells.every(c => c.x > -15 && c.z > 1)).toBe(true); // the bottom terrace's corner nearest the door
    g.unlocks.applyUnlock('paddy'); // the rest of the bottom terrace, round the patch
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

describe('the starting patch', () => {
  it('grows just fast enough for the first customers, and terraces at a set pace, upgrades or not', async () => {
    const g = await loadGame({ tiles: bought('sushi'), mods: { crew: 8 } });
    const { field } = g.rice, { SPAWN_EVERY, PLATES_PER_BAG } = g.restaurant;
    // six bags of two plates each, ripening as fast as diners eat them at five stars: one every 3.5s / 1.4, two plates each
    const grow = field.cells.length * PLATES_PER_BAG / (2 * 1.4 / SPAWN_EVERY);
    expect(grow).toBeCloseTo(15);
    const c = field.cells[0];
    c.grow = 0;
    g.run(1);
    expect(c.grow).toBeCloseTo(1 / grow, 2); // even with the kitchen crew fully upgraded
    g.unlocks.applyUnlock('paddy');
    c.grow = 0;
    g.run(1);
    expect(c.grow).toBeCloseTo(1 / 30, 2); // planted with the rest of the terrace, it grows with it
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
    g.rice.field.cells.slice(0, 18).forEach(c => { c.grow = -2; }); // the bottom terrace won't be ripe for a while
    ripen(g);
    g.runUntil(() => f.state === 'cut', 20);
    expect(f.g.position.y).toBeCloseTo(g.layout.TERRACES[1].top);
  });

  it('sweeps the ripe clumps either side of the one they came for in the same cut', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'paddy', 'farmer') });
    const f = g.rice.farmer!;
    ripen(g);
    g.runUntil(() => f.state === 'cut', 20);
    g.runUntil(() => f.state === 'seek', 2);
    expect(g.rice.fieldStack.n).toBeGreaterThanOrEqual(2);
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

  it('carries up to 18 bags a trip', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'paddy', 'porter'), field: 30 });
    const p = g.rice.porter!;
    g.runUntil(() => p.state === 'toPot', 10);
    expect(p.back.n).toBe(18);
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
